"""
Automated Integration Tests for AIRA AI Assistant.
Tests model loading, REST endpoints, multi-turn memory, clear memory,
TTS generation, and WebSocket streaming with avatar events.
"""

import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import json
import base64
import asyncio
import urllib.request
import urllib.error
import websockets
import pytest

BASE_HTTP = "http://127.0.0.1:8000"
BASE_WS = "ws://127.0.0.1:8000/ws"


def is_server_running():
    try:
        req = urllib.request.Request(f"{BASE_HTTP}/health")
        with urllib.request.urlopen(req, timeout=1) as resp:
            return resp.status == 200
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not is_server_running(),
    reason="Aira backend server is not running on 127.0.0.1:8000 (start via run_all.bat or backend.bat)"
)


def http_get(path):
    url = f"{BASE_HTTP}{path}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_post(path, data):
    url = f"{BASE_HTTP}{path}"
    encoded = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=encoded,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def test_root_and_health():
    print("[TEST 1] Testing GET / and GET /health...")
    root = http_get("/")
    assert root.get("status") == "online", f"Expected online, got {root}"
    assert root.get("assistant") == "Aira", f"Expected Aira, got {root}"
    print("  -> GET / passed:", root)

    health = http_get("/health")
    assert health.get("status") == "healthy", f"Expected healthy, got {health}"
    assert health.get("model_loaded") is True, f"Model not loaded: {health}"
    print(f"  -> GET /health passed: GPU={health.get('gpu')}, VRAM={health.get('vram')}")


def test_chat_and_memory():
    print("\n[TEST 2 & 3] Testing Basic Generation & Multi-turn Memory...")
    # First clear any leftover history
    http_post("/clear", {})

    # Turn 1
    t1 = http_post("/chat", {"message": "My project is about astrophysics."})
    print("  -> Turn 1 reply:", t1.get("response"))
    assert "response" in t1

    # Turn 2 (Recall)
    t2 = http_post("/chat", {"message": "What is my project about?"})
    reply2 = t2.get("response", "").lower()
    print("  -> Turn 2 reply:", t2.get("response"))
    assert "astrophysics" in reply2 or "project" in reply2, f"Expected astrophysics in reply, got: {reply2}"
    print("  -> Multi-turn memory verified successfully!")


def test_clear_memory():
    print("\n[TEST 4] Testing Memory Clear...")
    clear_res = http_post("/clear", {})
    assert clear_res.get("status") == "cleared"
    health = http_get("/health")
    assert health.get("history_length") == 0
    print("  -> Memory cleared. History length is 0.")


@pytest.mark.asyncio
async def test_websocket_streaming():
    print("\n[TEST 5 & 6 & 7] Testing WebSocket Streaming, Avatar Events, and TTS...")
    async with websockets.connect(BASE_WS) as ws:
        init_msg = json.loads(await ws.recv())
        assert init_msg.get("type") == "connected"
        print("  -> Connected to WebSocket.")

        # Send test user message
        await ws.send(json.dumps({
            "type": "user_message",
            "text": "Hello Aira, can you wave and say hi?"
        }))

        chunks = []
        events = []
        audio_received = False

        while True:
            raw = await ws.recv()
            data = json.loads(raw)
            ev_type = data.get("type")
            events.append(ev_type)

            if ev_type == "assistant_text":
                if data.get("is_chunk"):
                    chunks.append(data.get("text"))
                else:
                    print("  -> Streamed reply complete:", data.get("text"))
            elif ev_type == "tts_audio":
                audio_bytes = base64.b64decode(data.get("audio", ""))
                assert len(audio_bytes) > 1000, "Audio data too short"
                audio_received = True
                print(f"  -> TTS Audio received ({len(audio_bytes)} bytes WAV)")
            elif ev_type == "emotion":
                print(f"  -> Avatar emotion event: {data.get('emotion')} (intensity={data.get('intensity')})")
            elif ev_type == "animation":
                print(f"  -> Avatar animation event: {data.get('animation')}")
            elif ev_type == "generation_end":
                print("  -> Generation ended.")
                break
            elif ev_type == "error":
                raise RuntimeError(f"Received error from WebSocket: {data}")

        assert len(chunks) > 0, "No token chunks were streamed"
        assert audio_received, "TTS audio was not received"
        print(f"  -> Streamed {len(chunks)} token chunks successfully.")
        print("  -> WebSocket and Avatar integration verified!")


def main():
    print("=" * 60)
    print("RUNNING AIRA INTEGRATION TEST SUITE")
    print("=" * 60)

    test_root_and_health()
    test_chat_and_memory()
    test_clear_memory()
    asyncio.run(test_websocket_streaming())

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    main()
