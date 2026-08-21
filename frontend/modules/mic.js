/* =========================================================================
   MIC  –  push-to-talk recording → backend round-trip

   Hold the configured key to record, release to send.
   No VAD / silence-threshold tuning needed and AYRA can't hear herself
   through speakers because recording only happens while the key is held.

   Backend contrac
    POST /voice
    Returns:
    {
        "response": "Hello!"
    }

    POST /tts
    Body:
    {
        "text": "Hello!"
    }

    Returns:
    audio/wav
   The audio field may be omitted if the backend hasn't enabled server TTS
   yet; the caller falls back to text-only lip sync in that case.
   ========================================================================= */

import { setState, setMicNote } from './state.js';

const PUSH_TO_TALK_KEY = 'a';
const BACKEND_URL      = 'http://localhost:8000/voice';

// ── Internal state ────────────────────────────────────────────────────────
let mediaRecorder  = null;
let audioChunks    = [];
let isRecording    = false;
let stream         = null;
let micReady       = false;
let keyIsDown      = false;   // guard against OS key-repeat while held

// Expose whether AYRA is currently speaking so mic ignores key-presses then.
let _isSpeaking = false;
export const speakingGuard = {
  set isSpeaking(v) { _isSpeaking = v; },
  get isSpeaking()  { return _isSpeaking; },
};

/** onResult(text, audioBlob) is set by script.js to hand data back up. */
export let onResult = null;
export function setOnResult(fn) { onResult = fn; }

// ── Mic stream ────────────────────────────────────────────────────────────
export async function ensureMicStream() {
  if (stream) return stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount:   { ideal: 1 },
        sampleRate:     { ideal: 16000 },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    micReady = true;
    setMicNote(`Hold "${PUSH_TO_TALK_KEY.toUpperCase()}" to talk`);
    return stream;
  } catch (err) {
    console.error('[MIC] getUserMedia failed:', err);
    setMicNote('Microphone access blocked – click the page to allow it.');
    return null;
  }
}

// ── Recording ─────────────────────────────────────────────────────────────
function startRecording() {
  if (!stream || isRecording || _isSpeaking) return;
  isRecording = true;
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = handleRecordingStop;
  mediaRecorder.start();
  document.body.classList.add('recording');
  setState('listening');
  setMicNote('Listening…');
}

function stopRecordingAndSend() {
  if (!isRecording || !mediaRecorder) return;
  isRecording = false;
  document.body.classList.remove('recording');
  mediaRecorder.stop();   // triggers handleRecordingStop via onstop
}

// ── Backend round-trip ────────────────────────────────────────────────────
async function handleRecordingStop() {
    setMicNote("Thinking...");
    setState("idle");

    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    audioChunks = [];

    if (audioBlob.size === 0) {
        setMicNote(`Hold "${PUSH_TO_TALK_KEY.toUpperCase()}" to talk`);
        return;
    }

    try {
        // ---------- Send voice ----------
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const response = await fetch(BACKEND_URL, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        const data = await response.json();
        const reply = data?.response ?? null;

        if (!reply) {
            setMicNote(`Didn't catch that – hold "${PUSH_TO_TALK_KEY.toUpperCase()}" to try again`);
            return;
        }

        // ---------- Request TTS ----------
        let ttsAudioBlob = null;

        try {
            const ttsResponse = await fetch("http://localhost:8000/tts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: reply
                })
            });

            if (!ttsResponse.ok) {
                throw new Error(`TTS backend responded with ${ttsResponse.status}`);
            }

            ttsAudioBlob = await ttsResponse.blob();

        } catch (err) {
            console.error("[MIC] Failed to get TTS audio:", err);
        }

        // ---------- Send back to script.js ----------
        if (onResult) {
            onResult(reply, ttsAudioBlob);
        } else {
            console.warn("[MIC] onResult handler not set.");
        }

    } catch (err) {
        console.error("[MIC] Backend request failed:", err);
        setMicNote("Backend error. Try again.");
    }
}


// ── Keyboard listeners ────────────────────────────────────────────────────
function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

addEventListener('keydown', async (e) => {
  if (e.key.toLowerCase() !== PUSH_TO_TALK_KEY) return;
  if (isTypingTarget(document.activeElement)) return;
  if (keyIsDown) return;   // ignore OS auto-repeat
  keyIsDown = true;

  if (!micReady) await ensureMicStream();
  startRecording();
});

addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() !== PUSH_TO_TALK_KEY) return;
  keyIsDown = false;
  stopRecordingAndSend();
});

// If the page loses focus while the key is held (alt-tab, devtools, etc.)
// the browser never sees keyup — stop cleanly so we don't get stuck open.
addEventListener('blur', () => {
  keyIsDown = false;
  if (isRecording) stopRecordingAndSend();
});

// ── Initial hint ──────────────────────────────────────────────────────────
setMicNote(`Press "${PUSH_TO_TALK_KEY.toUpperCase()}" to talk`);
