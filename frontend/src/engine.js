/* =========================================================================
   AYRA  –  script.js  (main entry point)

   This file owns the render loop and wires every module together.
   Keep it free of business logic; delegate to the modules below.

   Module map
   ──────────
   scene.js        Three.js renderer / camera / lights / controls
   pose.js         Bone names, rest pose, hand shapes
   state.js        App-state machine (idle / listening / speaking) + UI labels
   animation.js    Breathing sway, blink, look-around glance
   expression.js   VRM morph-target driver (mouth shapes + blink)
   tts.js          Audio-blob playback + audio-driven lip-sync state exported to render loop
   mic.js          Push-to-talk recording → backend → hands result up here
   modelLoader.js  VRM loading, bone init, camera fit
   ========================================================================= */

import * as THREE from 'three';

import { clock, renderer, scene, camera, controls } from './modules/scene.js';
import { D, REST }                                  from './modules/pose.js';
import { appState, setState, setMicNote }           from './modules/state.js';
import { applyIdleSway, updateBlink, updateListenGlance } from './modules/animation.js';
import { applyMouth }                               from './modules/expression.js';
import { lipSyncState, playTTS, stopTTS } from './modules/tts.js';
import { setOnResult, setMicSuppressed, speakingGuard } from './modules/mic.js';
import { loadVRM, modelState }                      from './modules/modelLoader.js';
import { updateHair }                               from "./modules/hair.js";
/* =========================================================================
   RENDER CONSTANTS
   ========================================================================= */
const BODY_SMOOTHING  = 18;
const MOUTH_SMOOTHING = 26;  // faster than body so lips read as articulate

const scratchEuler = new THREE.Euler();
const scratchQuat  = new THREE.Quaternion();
let animationFrameId = null;
let engineStarted = false;



/* =========================================================================
   BACKEND RESULT HANDLER
   Called by mic.js with the text reply + optional audio Blob from FastAPI.
   ========================================================================= */
setOnResult(async (replyText, ttsAudioBlob) => {
  setMicSuppressed(true);
  speakingGuard.isSpeaking = true;
  setState('speaking');
  setMicNote(replyText);

  await playTTS(
    replyText,
    ttsAudioBlob,
    clock.elapsedTime,
    () => {
      // ── Audio finished ────────────────────────────────────────────────
      speakingGuard.isSpeaking = false;
      setMicSuppressed(false);
      setState('idle');
      setMicNote('Listening for speech...');
    }
  );
});

/* =========================================================================
   SPEAK  –  convenience helper exposed globally for console testing
   Usage in browser console: ayraSpeak("Hello world!")
   ========================================================================= */
window.ayraSpeak = async (text) => {
  speakingGuard.isSpeaking = true;
  setState('speaking');
  setMicNote(text);
  await playTTS(text, null, clock.elapsedTime, () => {
    speakingGuard.isSpeaking = false;
    setMicSuppressed(false);
    setState('idle');
    setMicNote('Listening for speech...');
  });
};

window.ayraStop = stopTTS;

/* =========================================================================
   RENDER LOOP
   ========================================================================= */
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const { vrm, bones, currentQuat } = modelState;

  if (vrm) {
    const time      = clock.elapsedTime;
    updateHair(delta);
    const listening = appState === 'listening';

    // ── Build bone target for this frame ───────────────────────────────────
    const target = {};
    for (const k in REST) target[k] = REST[k].slice();

    applyIdleSway(target, time);

    const glanceStrength = listening ? 1 : 0.25;
    const glance         = updateListenGlance(time);
    target.head = [
      Math.sin(time * 0.21 + 2) * 1.1 + glance.headX * glanceStrength,
      Math.sin(time * 0.27) * 2.4      + glance.headY * glanceStrength,
      0,
    ];
    target.leftEye  = [glance.eyeX * glanceStrength, glance.eyeY * glanceStrength, 0];
    target.rightEye = [glance.eyeX * glanceStrength, glance.eyeY * glanceStrength, 0];

    // ── Smooth bone rotations toward target ───────────────────────────────
    const bodyDampF = 1 - Math.exp(-BODY_SMOOTHING * delta);
    for (const name in bones) {
      const deg = target[name];
      if (!deg) continue;
      scratchEuler.set(deg[0] * D, deg[1] * D, deg[2] * D);
      scratchQuat.setFromEuler(scratchEuler);
      currentQuat[name].slerp(scratchQuat, bodyDampF);
      bones[name].quaternion.copy(currentQuat[name]);
    }

    // ── Mouth / blink ─────────────────────────────────────────────────────
    const mouthTarget = { A: 0, I: 0, U: 0, E: 0, O: 0, blink: updateBlink(time) };

    // Lip-sync driven SOLELY by the viseme timeline built from response text.
    // No audio amplitude, RMS, FFT, or analyser data is used for mouth movement.
    if (lipSyncState.active) {
      const { currentViseme, visemeWeight, nextViseme, nextWeight } = lipSyncState;

      // The viseme timeline already provides envelope-shaped weights with
      // attack-sustain-release.  getVisemeState() also handles coarticulation
      // overlap, returning nextViseme/nextWeight with an appropriate bleed.
      if (currentViseme) {
        mouthTarget[currentViseme] = visemeWeight;
      }

      if (nextViseme && nextWeight > 0) {
        mouthTarget[nextViseme] = Math.max(
          mouthTarget[nextViseme] || 0,
          nextWeight
        );
      }
    }

    const mouthDampF = 1 - Math.exp(-MOUTH_SMOOTHING * delta);
    applyMouth(mouthTarget, mouthDampF);

    // ── VRM update (spring bones, expressions) ────────────────────────────
    vrm.update(delta);
  }

  controls.update();
  renderer.render(scene, camera);
}

/* =========================================================================
   BOOT
   ========================================================================= */
export function startEngine() {
  if (engineStarted) return;
  engineStarted = true;
  loadVRM('/models/Ayra.vrm');
  animate();
}

export function stopEngine() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  engineStarted = false;
}
