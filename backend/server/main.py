"""
FastAPI backend for AYRA voice assistant.

This module exposes REST endpoints for speech-to-text voice input and
text-to-speech output. It wires the listen, speak, and control modules
into a simple HTTP API consumed by the frontend.
"""

import sys
import os
import time as t

sys.path.append(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            ".."
        )
    )
)

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

from Voice.LISTEN import Listen
from Voice.SPEAK import Speak
from AiCONTROL.control import Control

listen = Listen()
speaker = Speak()
control = Control()
app = FastAPI(title="AYRA Voice Assistant API")

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


@app.post("/voice")
async def voice(audio: UploadFile = File(...)):
    """Receive recorded audio, transcribe it, and return AYRA's reply."""
    audio_bytes = await audio.read()
    print("Received audio file:", audio_bytes[:20], "...")
    text, language = listen.transcribe(audio_bytes)
    print("Detected Language:", language)

    start = t.time()
    if text:
        response = control.Ctrl(text)
        print("overall time taken:", t.time() - start)
        print("Response:", response)
        return {"response": response}

    return {"response": None}
    
class TTSRequest(BaseModel):
    """Payload for a text-to-speech request."""
    text: str

@app.post("/tts")
async def tts(req: TTSRequest):
    """Generate WAV audio for the provided reply text."""
    start = t.time()
    wav_buffer = speaker.speak(req.text)
    print("TTS time taken:", t.time() - start)
    if wav_buffer is None:
        raise HTTPException(status_code=500, detail="Unable to generate speech")
    return StreamingResponse(
        wav_buffer,
        media_type="audio/wav"
    )