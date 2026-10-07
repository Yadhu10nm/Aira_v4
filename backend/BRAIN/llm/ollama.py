"""
AYRA Ollama Client (Optimized)
------------------------------
High-performance HTTP communication with local Ollama server.

Optimizations:
    - Persistent HTTP connection pooling via requests.Session()
    - HTTP keep-alive to eliminate per-turn TCP handshake latency
    - Model pin-in-memory via keep_alive="24h" (zero reload latency)
    - Automatic single retry for transient socket hiccups
    - Accurate timing and token generation metrics
"""

import time
import requests
from requests.adapters import HTTPAdapter


class OllamaClient:
    """
    High-performance client for communicating with a local Ollama server.
    """

    def __init__(self, settings):
        """
        Initialize the Ollama client with connection pooling.
        """
        self.url = settings.ollama_url.rstrip("/")
        self.model = settings.ollama_model

        self.context_size = getattr(settings, "context_size", 2048)
        self.max_tokens = getattr(settings, "max_tokens", 160)
        self.temperature = getattr(settings, "temperature", 0.6)

        self.request_timeout = getattr(settings, "request_timeout", 60)
        self.keep_alive = getattr(settings, "keep_alive", "24h") or "24h"

        # Persistent session for connection pooling & keep-alive
        self.session = requests.Session()
        adapter = HTTPAdapter(
            pool_connections=5,
            pool_maxsize=10,
            max_retries=1
        )
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def check_connection(self):
        """
        Check whether Ollama is running and the configured model is available.
        """
        try:
            response = self.session.get(
                f"{self.url}/api/tags",
                timeout=(3.0, 5.0)
            )
            response.raise_for_status()

            data = response.json()
            models = [
                m.get("name", "")
                for m in data.get("models", [])
            ]

            model_exists = any(
                m == self.model
                or m.startswith(f"{self.model}:")
                for m in models
            )

            if not model_exists:
                print(f"AYRA WARNING: Model '{self.model}' was not found in Ollama.")
                print(f"Run: ollama pull {self.model}")
                return False

            print(f"[OK] Ollama connected | Model: {self.model} (keep-alive: {self.keep_alive}, ctx: {self.context_size})")
            return True

        except requests.exceptions.ConnectionError:
            print("[-] Ollama server is not running on", self.url)
            print("Start it with: ollama serve")
            return False
        except Exception as exc:
            print(f"[-] Ollama check failed: {exc}")
            return False

    def chat(self, messages):
        """
        Send messages to Ollama and return the generated text.
        Includes a 1-shot retry on transient network errors.
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "keep_alive": self.keep_alive,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
                "num_ctx": self.context_size,
            }
        }

        # Try up to 2 attempts (initial + 1 retry on connection glitch)
        last_exc = None
        for attempt in range(2):
            start = time.perf_counter()
            try:
                response = self.session.post(
                    f"{self.url}/api/chat",
                    json=payload,
                    timeout=(4.0, self.request_timeout)
                )
                response.raise_for_status()

                data = response.json()
                message = data.get("message", {})
                content = message.get("content", "")

                if not content:
                    content = message.get("thinking", "")

                content = str(content).strip()
                elapsed = time.perf_counter() - start

                # Performance metrics
                eval_count = data.get("eval_count", 0)
                eval_duration = data.get("eval_duration", 0)
                load_duration = data.get("load_duration", 0)

                if eval_duration and eval_count:
                    eval_seconds = eval_duration / 1_000_000_000
                    tok_s = eval_count / eval_seconds if eval_seconds > 0 else 0
                    print(f"LLM: {elapsed:.2f}s | {eval_count} tokens | {tok_s:.1f} tok/s")
                else:
                    print(f"LLM: {elapsed:.2f}s")

                if load_duration:
                    load_seconds = load_duration / 1_000_000_000
                    if load_seconds > 0.05:
                        print(f"Model load: {load_seconds:.2f}s")

                if not content:
                    raise RuntimeError("Ollama returned an empty response.")

                return content

            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
                last_exc = exc
                if attempt == 0:
                    print(f"AYRA OLLAMA WARNING: Connection blip, retrying ({exc})...")
                    time.sleep(0.3)
                    continue
                print(f"AYRA OLLAMA ERROR: Failed after retry: {exc}")
                raise exc
            except Exception as exc:
                print(f"AYRA OLLAMA ERROR: {exc}")
                raise exc

        if last_exc:
            raise last_exc