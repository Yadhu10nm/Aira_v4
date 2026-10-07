"""
FastAPI backend for AIRA AI Assistant.
Integrates Ollama / Gemma 3 4B conversational brain, KittenTTS text-to-speech,
Faster-Whisper speech-to-text, AIRA Custom Affective Decision Engine,
Natural Multi-Tiered Memory System, and WebSocket real-time event streaming for Three.js VRM avatar.
"""

import sys
import os
import re
import time
import base64
import logging
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any

# Setup sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.config import (
    BACKEND_HOST,
    BACKEND_PORT,
    AIRA_BASE_MODEL,
    AIRA_ADAPTER_PATH,
)
from core.aira_model import get_aira_model
from core.conversation import default_conversation
from core.response_processor import AiraResponseProcessor
from core.memory_system import get_memory_system
from Voice.LISTEN import Listen
from Voice.SPEAK import Speak

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aira.server")

# Subsystems
aira_model = get_aira_model()
conversation_mgr = default_conversation
response_processor = AiraResponseProcessor()
memory_system = get_memory_system()
listen = Listen()
speaker = Speak()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model once at startup and manage application lifecycle."""
    logger.info("=" * 60)
    logger.info("Starting AIRA AI Backend (FastAPI)")
    logger.info("=" * 60)

    try:
        aira_model.load()
        if aira_model.use_ollama:
            logger.info(f"[+] Conversational Brain connected via Ollama ({aira_model.ollama_model}).")
        else:
            logger.info("[+] Aira Brain (Gemma 3 4B + LoRA) loaded successfully.")

        recent_chat_count = len(memory_system.get_recent_chats())
        logger.info(f"[+] Recent conversation context active ({recent_chat_count} chats loaded).")
        logger.info("[+] AIRA Custom Decision Engine active (Zero-latency avatar expressions & gestures).")
    except Exception as e:
        logger.error(f"[!] Failed to load Aira model: {e}", exc_info=True)

    yield

    logger.info("Shutting down AIRA AI Backend...")


app = FastAPI(
    title="AIRA AI Backend",
    description="Conversational brain, natural memory, TTS, STT, and avatar synchronization API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# HTTP REST Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    """Service health and assistant information."""
    return {
        "status": "online",
        "assistant": "Aira",
        "user": "Friend",
        "decision_engine": "Custom Affective Decision Engine",
        "memory_system": "Last 3 chats from history.json"
    }


@app.get("/health")
async def health():
    """Detailed health check including GPU, VRAM, and Memory metrics."""
    vram = aira_model.get_vram_info()
    return {
        "status": "healthy",
        "assistant": "Aira",
        "model_loaded": aira_model.is_loaded,
        "mode": "ollama" if aira_model.use_ollama else "transformers",
        "target_model": aira_model.ollama_model if aira_model.use_ollama else AIRA_BASE_MODEL,
        "decision_engine": "Custom Affective Engine (Zero Latency)",
        "memory": {"recent_chats_count": len(memory_system.get_recent_chats())},
        "gpu": vram.get("device", "None"),
        "vram": vram,
        "history_length": len(conversation_mgr.get_messages(include_system=False)),
        "endpoints": ["/", "/health", "/chat", "/clear", "/voice", "/tts", "/ws", "/memory"]
    }


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
async def chat(req: ChatRequest):
    """
    Text chat endpoint:
    1. Receive user message
    2. Add to conversation & trigger real-time memory learning
    3. Generate response using Ollama / Gemma with natural memory injection
    4. Add response to conversation memory
    5. Return processed response with emotion, animation, and dynamic intensity
    """
    user_text = (req.message or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if not aira_model.is_loaded:
        raise HTTPException(status_code=503, detail="Aira model is still loading or unavailable.")

    start_time = time.time()
    try:
        conversation_mgr.add_user_message(user_text)
        messages = conversation_mgr.get_messages(include_system=True)
        prompt = conversation_mgr.get_formatted_prompt(aira_model.tokenizer)

        raw_reply = await aira_model.generate(prompt, messages=messages)
        conversation_mgr.add_assistant_message(raw_reply)

        processed = response_processor.process(raw_reply, user_text)
        logger.info(
            f"Chat generated in {time.time() - start_time:.2f}s | "
            f"Emotion: {processed['emotion']} (intensity: {processed['intensity']}), "
            f"Animation: {processed['animation']}"
        )

        return {
            "response": processed["text"],
            "emotion": processed["emotion"],
            "animation": processed["animation"],
            "expression": processed["expression"],
            "intensity": processed["intensity"],
            "duration": processed["duration"],
            "soften_intensity": processed["soften_intensity"],
            "confidence": processed["confidence"],
            "tone": processed["tone"]
        }
    except Exception as e:
        logger.error(f"Chat generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Aira temporarily couldn't generate a response."
        )


@app.post("/clear")
async def clear_active_memory():
    """Reset active conversation window (preserves long-term learned memories)."""
    conversation_mgr.clear()
    return {
        "status": "cleared",
        "assistant": "Aira",
        "message": "Active conversation context reset."
    }


# ---------------------------------------------------------------------------
# Recent Conversation History Endpoint
# ---------------------------------------------------------------------------

@app.get("/memory")
async def get_memory_state():
    """Return the latest three valid saved chats used for conversation context."""
    chats = memory_system.get_recent_chats()
    return {
        "chats": chats,
        "limit": 3,
        "recent_chats_count": len(chats),
    }


# ---------------------------------------------------------------------------
# Voice & Audio Endpoints
# ---------------------------------------------------------------------------

@app.post("/voice")
async def voice(audio: UploadFile = File(...)):
    """
    Speech-to-text voice input endpoint:
    1. Transcribe audio using Faster-Whisper
    2. Add user text to conversation & memory
    3. Generate reply with natural context
    4. Determine emotion and gestures via Custom Decision Engine
    5. Return reply and avatar decisions
    """
    audio_bytes = await audio.read()
    text, language = listen.transcribe(audio_bytes)
    logger.info(f"Transcribed voice input: {repr(text)} (Language: {language})")

    if text:
        start_time = time.time()
        try:
            conversation_mgr.add_user_message(text)
            messages = conversation_mgr.get_messages(include_system=True)
            prompt = conversation_mgr.get_formatted_prompt(aira_model.tokenizer)

            raw_reply = await aira_model.generate(prompt, messages=messages)
            conversation_mgr.add_assistant_message(raw_reply)

            processed = response_processor.process(raw_reply, text)
            logger.info(
                f"Voice reply generated in {time.time() - start_time:.2f}s | "
                f"Emotion: {processed['emotion']} | Animation: {processed['animation']}"
            )

            return {
                "response": processed["text"],
                "user_text": text,
                "emotion": processed["emotion"],
                "animation": processed["animation"],
                "intensity": processed["intensity"],
                "duration": processed["duration"],
                "soften_intensity": processed["soften_intensity"]
            }
        except Exception as e:
            logger.error(f"Voice generation failed: {e}", exc_info=True)
            return {
                "response": "Bro, something went wrong while generating the reply.",
                "user_text": text
            }

    return {"response": None, "user_text": None}


class TTSRequest(BaseModel):
    text: str


@app.post("/tts")
async def tts(req: TTSRequest):
    """Generate WAV audio for reply text using KittenTTS."""
    clean_speech = response_processor.decision_engine.clean_text_for_speech(req.text)
    wav_buffer = speaker.speak(clean_speech or req.text)
    if wav_buffer is None:
        raise HTTPException(status_code=500, detail="Unable to generate speech")

    return StreamingResponse(
        wav_buffer,
        media_type="audio/wav"
    )


# ---------------------------------------------------------------------------
# WebSocket Endpoint for Real-Time Streaming & Avatar Synchronization
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Bi-directional WebSocket connection for:
    - User text input
    - Real-time token-by-token streaming
    - Emotion and animation event synchronization
    - Integrated TTS audio delivery
    """
    await websocket.accept()
    logger.info("WebSocket client connected.")

    await websocket.send_json({
        "type": "connected",
        "assistant": "Aira",
        "user": "Friend",
        "status": "online"
    })

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "user_message":
                user_text = (data.get("text") or "").strip()
                if not user_text:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Message cannot be empty."
                    })
                    continue

                if not aira_model.is_loaded:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Aira model is still loading or unavailable."
                    })
                    continue

                # 1. Signal generation start
                await websocket.send_json({"type": "generation_start"})

                # 2. Add message and build prompt with natural memory
                conversation_mgr.add_user_message(user_text)
                messages = conversation_mgr.get_messages(include_system=True)
                prompt = conversation_mgr.get_formatted_prompt(aira_model.tokenizer)

                # 3. Stream generated tokens
                token_chunks = []
                try:
                    async for chunk in aira_model.generate_stream(prompt, messages=messages):
                        token_chunks.append(chunk)
                        await websocket.send_json({
                            "type": "assistant_text",
                            "text": chunk,
                            "is_chunk": True
                        })
                except Exception as gen_err:
                    logger.error(f"Streaming failed: {gen_err}", exc_info=True)
                    await websocket.send_json({
                        "type": "error",
                        "message": "Aira temporarily couldn't generate a response."
                    })
                    continue

                full_reply = "".join(token_chunks).strip()
                conversation_mgr.add_assistant_message(full_reply)

                # 4. Process response for emotion, gestures, and clean dialogue
                processed = response_processor.process(full_reply, user_text)

                # 5. Send complete clean text message
                await websocket.send_json({
                    "type": "assistant_text",
                    "text": processed["text"],
                    "is_chunk": False
                })

                # 6. Send natural human emotion reaction event
                await websocket.send_json({
                    "type": "emotion",
                    "emotion": processed["emotion"],
                    "intensity": processed["intensity"],
                    "duration": processed["duration"],
                    "soften_intensity": processed["soften_intensity"]
                })

                # 7. Send animation event if present
                if processed["animation"] and processed["animation"] != "idle":
                    await websocket.send_json({
                        "type": "animation",
                        "animation": processed["animation"]
                    })

                # 8. Generate and send TTS audio
                await websocket.send_json({"type": "tts_start"})
                try:
                    wav_buf = speaker.speak(processed["text"])
                    if wav_buf:
                        b64_audio = base64.b64encode(wav_buf.getvalue()).decode("ascii")
                        await websocket.send_json({
                            "type": "tts_audio",
                            "audio": b64_audio,
                            "format": "audio/wav"
                        })
                except Exception as tts_err:
                    logger.error(f"WebSocket TTS generation failed: {tts_err}")
                finally:
                    await websocket.send_json({"type": "tts_end"})

                # 9. Signal generation end
                await websocket.send_json({
                    "type": "generation_end",
                    "response": processed["text"],
                    "emotion": processed["emotion"],
                    "animation": processed["animation"]
                })

            elif event_type == "clear":
                conversation_mgr.clear()
                await websocket.send_json({
                    "type": "cleared",
                    "message": "Conversation memory reset."
                })

            elif event_type == "ping":
                await websocket.send_json({"type": "pong"})

            else:
                logger.warning(f"Unrecognized WebSocket event type: {event_type}")

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as exc:
        logger.error(f"WebSocket connection error: {exc}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Aira temporarily couldn't generate a response."
            })
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Direct Launch
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)
