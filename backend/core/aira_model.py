"""
AIRA Model Loader & Inference Engine.
Supports both Ollama server (e.g. gemma3:4b-it-q4_K_M) and
Transformers + PEFT (Gemma 3 4B + LoRA adapter in 4-bit).
Optimized for 6GB VRAM environments.
"""

import os
import sys
import json
import logging
import asyncio
import threading
from typing import Optional, AsyncGenerator, List, Dict, Any

import torch
import httpx
import requests

from .config import (
    USE_OLLAMA,
    OLLAMA_URL,
    OLLAMA_MODEL,
    AIRA_BASE_MODEL,
    AIRA_ADAPTER_PATH,
    GENERATION_CONFIG,
    DEVICE,
)

logger = logging.getLogger("aira.model")


class AiraModel:
    """Singleton model wrapper for Ollama or Gemma 3 4B + LoRA."""

    _instance: Optional["AiraModel"] = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.use_ollama = USE_OLLAMA
        self.ollama_url = OLLAMA_URL
        self.ollama_model = OLLAMA_MODEL

        self.tokenizer = None
        self.base_model = None
        self.model = None
        self.device = DEVICE

        self.inference_lock = asyncio.Lock()
        self._load_lock = threading.Lock()
        self._is_ready = False
        self._initialized = True

    def load(self):
        """Load model or verify Ollama connectivity exactly once."""
        with self._load_lock:
            if self._is_ready:
                logger.info("[AiraModel] Model already initialized. Skipping reload.")
                return

            logger.info("=" * 60)
            logger.info("Initializing AIRA Conversational Brain")
            logger.info("=" * 60)

            if self.use_ollama:
                logger.info(f"[*] Backend Mode : Ollama HTTP API ({self.ollama_url})")
                logger.info(f"[*] Target Model : {self.ollama_model}")

                # Verify Ollama server
                try:
                    resp = requests.get(f"{self.ollama_url}/api/tags", timeout=5.0)
                    resp.raise_for_status()
                    models = [m.get("name", "") for m in resp.json().get("models", [])]
                    model_found = any(
                        self.ollama_model == m or m.startswith(f"{self.ollama_model}:")
                        for m in models
                    )
                    if model_found:
                        logger.info(f"[+] Connected to Ollama! Model '{self.ollama_model}' is available.")
                    else:
                        logger.warning(
                            f"[!] Ollama model '{self.ollama_model}' not found in installed tags: {models}. "
                            f"Ensure 'ollama pull {self.ollama_model}' has been run."
                        )
                    self._is_ready = True
                except Exception as ex:
                    logger.error(f"[!] Could not connect to Ollama at {self.ollama_url}: {ex}")
                    logger.warning("[!] Will attempt runtime queries or fallback.")
                    self._is_ready = True

                # Attempt to optionally load tokenizer from adapter directory for token formatting
                if os.path.exists(str(AIRA_ADAPTER_PATH)):
                    try:
                        from transformers import AutoTokenizer
                        self.tokenizer = AutoTokenizer.from_pretrained(str(AIRA_ADAPTER_PATH))
                        logger.info("[+] Loaded tokenizer from adapter path for chat templates.")
                    except Exception:
                        self.tokenizer = None
                return

            # Transformers + PEFT Mode
            logger.info(f"[*] Backend Mode : Transformers + PEFT")
            logger.info(f"[*] Base Model   : {AIRA_BASE_MODEL}")
            logger.info(f"[*] LoRA Adapter : {AIRA_ADAPTER_PATH}")

            from transformers import AutoModelForCausalLM, AutoTokenizer
            from peft import PeftModel

            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
                vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                logger.info(f"[*] GPU Detected : {gpu_name} ({vram_gb:.2f} GB VRAM)")
            else:
                logger.warning("[!] Warning: CUDA is not available. Running on CPU.")

            # 1. Load Tokenizer
            logger.info("[*] Loading tokenizer from adapter path...")
            self.tokenizer = AutoTokenizer.from_pretrained(str(AIRA_ADAPTER_PATH))
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token

            # 2. Load 4-bit Base Model
            logger.info("[*] Loading 4-bit base model...")
            self.base_model = AutoModelForCausalLM.from_pretrained(
                AIRA_BASE_MODEL,
                device_map="auto",
                dtype=torch.bfloat16
            )

            # 3. Attach LoRA Adapter
            logger.info(f"[*] Attaching LoRA adapter from {AIRA_ADAPTER_PATH}...")
            self.model = PeftModel.from_pretrained(self.base_model, str(AIRA_ADAPTER_PATH))
            self.model.eval()

            self._is_ready = True
            logger.info("[+] Aira Model (Transformers + LoRA) Ready!")

    @property
    def is_loaded(self) -> bool:
        if self.use_ollama:
            return self._is_ready
        return self.model is not None and self.tokenizer is not None

    def get_vram_info(self) -> dict:
        """Return current GPU memory usage."""
        if not torch.cuda.is_available():
            return {"cuda": False}
        return {
            "cuda": True,
            "device": torch.cuda.get_device_name(0),
            "allocated_mb": round(torch.cuda.memory_allocated(0) / (1024**2), 2),
            "reserved_mb": round(torch.cuda.memory_reserved(0) / (1024**2), 2),
            "total_mb": round(torch.cuda.get_device_properties(0).total_memory / (1024**2), 2)
        }

    async def generate(
        self,
        formatted_prompt: str,
        messages: Optional[List[Dict[str, str]]] = None,
        override_config: Optional[dict] = None
    ) -> str:
        """
        Generate full response text.
        """
        if not self.is_loaded:
            self.load()

        cfg = {**GENERATION_CONFIG, **(override_config or {})}

        if self.use_ollama:
            async with self.inference_lock:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    payload = {
                        "model": self.ollama_model,
                        "stream": False,
                        "options": {
                            "temperature": cfg.get("temperature", 0.7),
                            "top_p": cfg.get("top_p", 0.9),
                            "num_predict": cfg.get("max_new_tokens", 200),
                        }
                    }
                    if messages:
                        payload["messages"] = messages
                        endpoint = f"{self.ollama_url}/api/chat"
                    else:
                        payload["prompt"] = formatted_prompt
                        endpoint = f"{self.ollama_url}/api/generate"

                    resp = await client.post(endpoint, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    if "message" in data:
                        return data["message"].get("content", "").strip()
                    return data.get("response", "").strip()

        # Transformers mode
        from transformers import AutoModelForCausalLM
        async with self.inference_lock:
            loop = asyncio.get_running_loop()

            def _infer():
                inputs = self.tokenizer(formatted_prompt, return_tensors="pt").to(self.device)
                with torch.inference_mode():
                    outputs = self.model.generate(
                        **inputs,
                        max_new_tokens=cfg.get("max_new_tokens", 200),
                        temperature=cfg.get("temperature", 0.7),
                        top_p=cfg.get("top_p", 0.9),
                        repetition_penalty=cfg.get("repetition_penalty", 1.1),
                        do_sample=cfg.get("do_sample", True),
                        pad_token_id=self.tokenizer.pad_token_id or self.tokenizer.eos_token_id
                    )
                gen_tokens = outputs[0][inputs["input_ids"].shape[1]:]
                return self.tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()

            reply = await loop.run_in_executor(None, _infer)
            return reply

    async def generate_stream(
        self,
        formatted_prompt: str,
        messages: Optional[List[Dict[str, str]]] = None,
        override_config: Optional[dict] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream generation token-by-token.
        """
        if not self.is_loaded:
            self.load()

        cfg = {**GENERATION_CONFIG, **(override_config or {})}

        if self.use_ollama:
            payload = {
                "model": self.ollama_model,
                "stream": True,
                "options": {
                    "temperature": cfg.get("temperature", 0.7),
                    "top_p": cfg.get("top_p", 0.9),
                    "num_predict": cfg.get("max_new_tokens", 200),
                }
            }
            if messages:
                payload["messages"] = messages
                endpoint = f"{self.ollama_url}/api/chat"
            else:
                payload["prompt"] = formatted_prompt
                endpoint = f"{self.ollama_url}/api/generate"

            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", endpoint, json=payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk_data = json.loads(line)
                            if "message" in chunk_data:
                                chunk_text = chunk_data["message"].get("content", "")
                            else:
                                chunk_text = chunk_data.get("response", "")
                            if chunk_text:
                                yield chunk_text
                        except json.JSONDecodeError:
                            continue
            return

        # Transformers mode
        from transformers import TextIteratorStreamer
        async with self.inference_lock:
            loop = asyncio.get_running_loop()
            streamer = TextIteratorStreamer(
                self.tokenizer,
                skip_prompt=True,
                skip_special_tokens=True
            )

            inputs = self.tokenizer(formatted_prompt, return_tensors="pt").to(self.device)

            generation_kwargs = dict(
                **inputs,
                streamer=streamer,
                max_new_tokens=cfg.get("max_new_tokens", 200),
                temperature=cfg.get("temperature", 0.7),
                top_p=cfg.get("top_p", 0.9),
                repetition_penalty=cfg.get("repetition_penalty", 1.1),
                do_sample=cfg.get("do_sample", True),
                pad_token_id=self.tokenizer.pad_token_id or self.tokenizer.eos_token_id
            )

            def _thread_target():
                try:
                    with torch.inference_mode():
                        self.model.generate(**generation_kwargs)
                except Exception as ex:
                    logger.error(f"[AiraModel] Streaming error in worker thread: {ex}", exc_info=True)

            worker = threading.Thread(target=_thread_target, daemon=True)
            worker.start()

            def _get_next():
                try:
                    return next(streamer)
                except StopIteration:
                    return None

            while True:
                chunk = await loop.run_in_executor(None, _get_next)
                if chunk is None:
                    break
                if chunk:
                    yield chunk

            worker.join(timeout=1.0)


_model_instance = AiraModel()


def get_aira_model() -> AiraModel:
    """Access the singleton model instance."""
    return _model_instance
