# AYRA – Frontend JS Module Structure

```
frontend/
├── index.html              ← page shell
├── Ayra.vrm                ← 3D model asset
├── script.js               ← main entry, bootstraps app
└── modules/
    ├── scene.js            ← Three.js renderer, camera, lights, controls
    ├── pose.js             ← bone definitions, rest pose, hand shapes
    ├── state.js            ← UI state machine and status labels
    ├── animation.js        ← idle sway, blink, listening glance
    ├── expression.js       ← mouth morph targets and blink driver
    ├── tts.js              ← audio playback + viseme lip-sync state
    ├── mic.js              ← push-to-talk recording + backend round-trip
    ├── hair.js             ← hair animation helper
    └── modelLoader.js      ← VRM load, bone init, camera fit
```

## Frontend behavior

- `index.html` loads `script.js` as an ES module.
- `script.js` starts the render loop, loads `Ayra.vrm`, and wires the modules.
- `mic.js` records audio while the user holds the `A` key and sends it to `http://localhost:8000/voice`.
- The backend returns a text reply, then `mic.js` requests spoken audio from `http://localhost:8000/tts`.
- `script.js` passes the text and returned audio blob to `tts.js`.
- `tts.js` plays the audio and updates `lipSyncState`, which `script.js` uses to animate the mouth.

## index.html setup

```html
<script type="module" src="script.js"></script>
```

## Voice flow

1. User clicks the page once to warm audio and request microphone permission.
2. User holds `A` to record speech.
3. `mic.js` captures a `audio/webm` blob and sends it to `/voice`.
4. Backend returns JSON like:

```json
{
  "response": "Hello!"
}
```

5. `mic.js` then POSTs the response text to `/tts`.
6. The backend returns `audio/wav` directly.
7. `script.js` calls `playTTS(replyText, audioBlob, ...)`.
8. `tts.js` drives mouth visemes from the reply text while audio plays.

## Console helpers

```js
ayraSpeak("Hello!")   // text-only lip sync
ayraStop()              // stop current speech immediately
```

## Backend compatibility

- The current frontend expects a FastAPI backend running at `http://localhost:8000`.
- `/voice` receives `audio/webm` and returns JSON with `response`.
- `/tts` receives `{ text }` and returns a WAV audio body.

## Notes

- If the backend does not provide `/tts`, the frontend still supports text-only lip sync via `ayraSpeak()`.
- The frontend currently uses `tts.js` to build visemes from text, not from raw audio analysis.
