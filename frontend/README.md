# Aira AI

Aira is a browser-based AI avatar frontend. It renders the Ayra VRM model with Three.js and connects push-to-talk voice input to the existing FastAPI voice and TTS endpoints.

## Features

- VRM avatar loading, camera controls, lighting, and responsive rendering
- Idle breathing, blinking, look-around glances, pose and hand shaping
- Spring-damper hair motion and VRM expressions
- Live microphone capture with automatic speech and silence detection
- Existing `/voice` and `/tts` backend integration
- Text-driven viseme animation and audio playback
- Console helpers: `ayraSpeak(text)` and `ayraStop()`

## Architecture

```text
React UI
   |
   v
React lifecycle and DOM shell
   |
   v
Three.js / VRM engine modules
   |
   v
FastAPI /voice and /tts endpoints
```

React owns the mounted UI and engine lifecycle. The existing animation, expression, pose, hair, microphone, TTS, viseme, state, scene, and model-loader modules remain JavaScript engine modules.

## Project Structure

```text
frontend/
├── public/
│   ├── models/Ayra.vrm
│   ├── videos/
│   └── assets/
├── src/
│   ├── modules/       # Existing avatar and voice engine modules
│   ├── styles/        # Existing visual styling
│   ├── App.jsx        # React DOM shell and lifecycle boundary
│   ├── engine.js      # Existing engine entrypoint with React-safe boot
│   └── main.jsx       # React entrypoint
├── index.html
├── package.json
└── vite.config.js
```

## Requirements

- Node.js 18 or newer
- A modern browser with WebGL, Web Audio, and MediaRecorder support
- The existing FastAPI backend at `http://localhost:8000` for voice interaction

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Production Build

```bash
npm run build
npm run preview
```

## Live Microphone

Click `MIC OFF` once to enable continuous monitoring. A lightweight analyser-based VAD starts a `MediaRecorder` when the input RMS volume exceeds `VAD_THRESHOLD` (`0.035`) and ends the utterance after `SILENCE_DURATION` (`800 ms`). Utterances shorter than `MIN_SPEECH_DURATION` (`250 ms`) are ignored. Click `MIC ON` to stop the stream, recorder, analyser loop, and audio context.

## Backend Configuration

The frontend preserves the existing hard-coded backend URLs:

- `POST http://localhost:8000/voice` receives a multipart `audio` field containing `recording.webm` and returns `{ "response": "..." }`.
- `POST http://localhost:8000/tts` receives `{ "text": "..." }` and returns audio data, normally WAV.

No environment variables or backend changes are required by this frontend.

## Assets

The VRM model is served from `public/models/Ayra.vrm`. Video and other public asset directories are retained under `public/videos` and `public/assets` for the existing application assets.

## Important Notes

Serve the app through Vite or another local HTTP server; opening the HTML file directly prevents module and model loading. The first page click requests microphone permission and warms the audio context. Browser microphone permission and an allowed audio output are required for voice interaction and TTS playback.