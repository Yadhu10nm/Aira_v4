/* =========================================================================
   AYRA  –  engine.js (main render loop & engine coordinator)

   Coordinates:
   - Three.js scene, camera, and smooth camera framing
   - AnimationMixer driving Ayra_Hey greeting, wave loops, and Idle
   - Original clean text-driven lip movement (AEIOU visemes) + organic blinking
   - LAYA (System 1) emotional decision engine + 2-phase human dynamics
   - Dynamic lighting, particles, and hair physics
   ========================================================================= */

import * as THREE from 'three';

import { clock, renderer, scene, camera, controls, updateCameraTransition, setCameraPreset } from './modules/scene.js';
import { appState, setState, setMicNote } from './modules/state.js';
import { updateBlink, updateEyeGaze } from './modules/animation.js';
import { applyMouth } from './modules/expression.js';
import { lipSyncState, playTTS, stopTTS } from './modules/tts.js';
import { setOnResult, setMicSuppressed, speakingGuard } from './modules/mic.js';
import { loadVRM, modelState } from './modules/modelLoader.js';
import { updateAvatarAnimations, triggerHey, returnToIdle, loopWave, setStaticHeyPose } from './modules/avatarAnimation.js';
import { updateExpressions, triggerEmotion, triggerHumanReaction, resetToNeutral } from './expressions/index.js';
import { updateHair } from './modules/hair.js';
import { initParticles, updateParticles } from './modules/particles.js';
import { initDynamicLighting, updateDynamicLighting } from './modules/lighting.js';
import { initHologram, updateHologram } from './modules/hologram.js';
import { analyzeEmotion } from './modules/emotionAnalyzer.js';
import { connectWebSocket } from './modules/ws.js';

let animationFrameId = null;
let engineStarted = false;

/* =========================================================================
   BACKEND RESULT HANDLER
   Called by mic.js with (replyText, ttsAudioBlob, userText, layaDecision).
   ========================================================================= */
setOnResult(async (replyText, ttsAudioBlob, userText = '', layaDecision = null) => {
  setMicSuppressed(true);
  speakingGuard.isSpeaking = true;
  setState('speaking');

  // Strip inline action tags for UI display and TTS speech
  const cleanDisplay = replyText
    .replace(/\[(?:emotion|gesture|mood|action):[a-z_]+\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  setMicNote(cleanDisplay || replyText);

  // ── LAYA (System 1) Decision or Fallback Analyzer ──────────────────────
  let finalEmotion = 'neutral';
  let finalGesture = null;
  let peakIntensity = 0.88;
  let reactionDuration = 1.5;
  let softenIntensity = 0.25;

  if (layaDecision && typeof layaDecision === 'object') {
    finalEmotion = layaDecision.emotion || 'neutral';
    finalGesture = layaDecision.gesture || null;
    peakIntensity = layaDecision.intensity ?? 0.88;
    reactionDuration = layaDecision.reaction_duration ?? 1.5;
    softenIntensity = layaDecision.soften_intensity ?? 0.25;
    console.log(`[ENGINE] LAYA (System 1) -> Emotion: ${finalEmotion} (has_emotion=${layaDecision.has_emotion}), Gesture: ${finalGesture}`);
  } else {
    const analysis = analyzeEmotion(replyText, userText);
    finalEmotion = analysis.emotion;
    finalGesture = analysis.gesture;
    peakIntensity = analysis.intensity;
    reactionDuration = 1.5;
    softenIntensity = 0.25;
    console.log(`[ENGINE] Client Fallback -> Emotion: ${finalEmotion}, Gesture: ${finalGesture}`);
  }

  // ── Human-like Behavior ────────────────────────────────────────────────
  // - If no emotion / 'neutral': avatar speaks with neutral expression (mouth moves, eyes blink, brows calm).
  // - If emotion triggered (e.g. happy/laugh): reacts first at peak for ~1.5s, then softens into normal talking face!
  triggerHumanReaction(finalEmotion, peakIntensity, reactionDuration, softenIntensity);

  if (finalGesture === 'hey') {
    triggerHey();
  }

  await playTTS(
    cleanDisplay || replyText,
    ttsAudioBlob,
    clock.elapsedTime,
    () => {
      speakingGuard.isSpeaking = false;
      setMicSuppressed(false);
      setState('idle');
      setMicNote('Listening for speech...');

      // Settle gently into resting neutral when speech completes
      setTimeout(() => {
        resetToNeutral();
      }, 800);
    }
  );
});

/* =========================================================================
   SPEAK  –  exposed globally for console and UI testing
   ========================================================================= */
window.ayraSpeak = async (text, userPrompt = '', explicitEmo = null) => {
  if (!text) return;

  const analysis = analyzeEmotion(text, userPrompt);
  const finalEmotion = explicitEmo || analysis.emotion;

  triggerHumanReaction(finalEmotion, analysis.intensity, 1.5, 0.25);
  if (analysis.gesture === 'hey') {
    triggerHey();
  }

  const cleanDisplay = text
    .replace(/\[(?:emotion|gesture|mood|action):[a-z_]+\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  speakingGuard.isSpeaking = true;
  setState('speaking');
  setMicNote(cleanDisplay || text);

  await playTTS(cleanDisplay || text, null, clock.elapsedTime, () => {
    speakingGuard.isSpeaking = false;
    setMicSuppressed(false);
    setState('idle');
    setMicNote('Listening for speech...');

    setTimeout(() => {
      resetToNeutral();
    }, 800);
  });
};

window.ayraStop = stopTTS;
window.playHey = triggerHey;
window.triggerBackendHey = triggerHey;
window.playHeyLoop = loopWave;
window.applyStaticHeyPose = setStaticHeyPose;
window.transitionToIdle = returnToIdle;

// Keyboard shortcuts for testing animations (H = Hey, S = Static Pose, I = Idle, W = Wave Loop)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
    if (e.key === 'h' || e.key === 'H') {
      console.log('[KEYBOARD] "H" pressed -> Triggering Ayra Hey greeting');
      triggerHey();
    } else if (e.key === 's' || e.key === 'S') {
      console.log('[KEYBOARD] "S" pressed -> Applying Static Hey pose');
      setStaticHeyPose();
    } else if (e.key === 'i' || e.key === 'I') {
      console.log('[KEYBOARD] "I" pressed -> Transitioning to Idle');
      returnToIdle();
    } else if (e.key === 'w' || e.key === 'W') {
      console.log('[KEYBOARD] "W" pressed -> Toggling Wave loop');
      loopWave();
    }
  });
}

/* =========================================================================
   RENDER LOOP
   ========================================================================= */
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.elapsedTime;
  const isSpeaking = speakingGuard.isSpeaking;

  // 1. Camera smooth framing
  updateCameraTransition(delta);

  // 2. Interactive Ambient Effects
  updateParticles(time, delta, appState);
  updateDynamicLighting(time, delta, appState);
  updateHologram(time, delta, appState, isSpeaking);

  // 3. Skeletal AnimationMixer (Idle, Ayra_Hey, Ayra_Hey_Wave)
  updateAvatarAnimations(delta);

  // 4. Lip Movement (original clean visemes + organic blink)
  // When not speaking, mouthTarget is all 0 -> mouth stays naturally closed!
  const mouthTarget = { A: 0, I: 0, U: 0, E: 0, O: 0, blink: updateBlink(time) };

  if (lipSyncState.active) {
    const { currentViseme, visemeWeight, nextViseme, nextWeight } = lipSyncState;

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

  const mouthDampF = 1 - Math.exp(-26 * delta);
  applyMouth(mouthTarget, mouthDampF);

  // 5. Facial Expressions & Head Posture (whenever required by LAYA)
  updateExpressions(delta, time, isSpeaking);

  // 6. Eye Gaze Tracking & Saccades
  if (modelState.vrm) {
    const isListening = (appState === 'listening');
    const gaze = updateEyeGaze(time, delta, isListening);
    if (modelState.vrm.lookAt) {
      modelState.vrm.lookAt.yaw = gaze.x * 25;   // degrees horizontal
      modelState.vrm.lookAt.pitch = gaze.y * 15; // degrees vertical
    }
  }

  // 7. Hair & Secondary Physics
  if (modelState.vrm) {
    updateHair(delta);
    modelState.vrm.update(delta);
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

  // Initialize 3D effects
  initParticles(scene);
  initDynamicLighting(scene);
  initHologram(scene);

  // Load VRM model with exact casing matching disk
  loadVRM('/models/Aira.vrm');

  // Connect WebSocket for real-time brain streaming & avatar events
  connectWebSocket();

  animate();
}

export function stopEngine() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  engineStarted = false;
}
