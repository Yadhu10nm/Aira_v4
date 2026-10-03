/* =========================================================================
   AVATAR ANIMATION  –  Skeletal AnimationMixer for Ayra (VRM 1.0)
   
   Implements:
   - "Hey 👋" Frontside Greeting Animation (Ayra_Hey, 52 frames)
   - Continuous Waving Loop (Ayra_Hey_Wave)
   - Resting Idle Breathing Loop (Idle)
   - Zero T-pose flash/pop: clampWhenFinished + anticipatory crossfade (1.45s)
   - Concurrency & user interruption safety
   ========================================================================= */

import * as THREE from 'three';

export const animationState = {
  mixer: null,
  idleAction: null,
  heyAction: null,
  heyFaceAction: null,
  heyWaveAction: null,
  tPoseAction: null,
  isHeyPlaying: false,
  isWaveLooping: false,
  heyDuration: 1.73,
};

let heyTimeoutId = null;
let onGreetingSmileCallback = null;
let onGreetingEndCallback = null;

export function setGreetingCallbacks({ onSmile, onEnd }) {
  onGreetingSmileCallback = onSmile;
  onGreetingEndCallback = onEnd;
}

/**
 * Initialize AnimationMixer and configure clips from loaded GLTF/VRM.
 */
export function initAvatarAnimations(gltf, vrm) {
  const root = vrm ? vrm.scene : gltf.scene;
  const mixer = new THREE.AnimationMixer(root);
  animationState.mixer = mixer;

  const clips = gltf.animations || [];
  console.log('[ANIMATION] Found clips:', clips.map(c => c.name));

  const idleClip = clips.find(c => c.name === 'Idle');
  const heyClip = clips.find(c => c.name === 'Ayra_Hey') || clips.find(c => c.name === 'Ayra_Hey_Wave');
  const heyWaveClip = clips.find(c => c.name === 'Ayra_Hey_Wave');
  const tPoseClip = clips.find(c => c.name === 'T-Pose');
  const heyFaceClip = clips.find(c => c.name === 'Ayra_Hey_Face');

  // Configure Idle Action
  if (idleClip) {
    const idleAction = mixer.clipAction(idleClip);
    idleAction.setLoop(THREE.LoopRepeat);
    idleAction.play();
    animationState.idleAction = idleAction;
    console.log('[ANIMATION] Idle loop initialized & playing.');
  }

  // Configure Hey Action (Skeletal waving)
  if (heyClip) {
    const heyAction = mixer.clipAction(heyClip);
    heyAction.setLoop(THREE.LoopOnce);
    heyAction.clampWhenFinished = true; // Hold resting buffer at frame 52
    animationState.heyAction = heyAction;
    animationState.heyDuration = heyClip.duration || 1.73;
    console.log(`[ANIMATION] Ayra_Hey greeting loaded (duration: ${animationState.heyDuration}s).`);
  }

  // Configure Hey Face Action (Native facial morphs from Blender)
  if (heyFaceClip) {
    const heyFaceAction = mixer.clipAction(heyFaceClip);
    heyFaceAction.setLoop(THREE.LoopOnce);
    heyFaceAction.clampWhenFinished = true;
    animationState.heyFaceAction = heyFaceAction;
    console.log('[ANIMATION] Ayra_Hey_Face morph action initialized.');
  }

  // Configure Hey Wave Action
  if (heyWaveClip) {
    const heyWaveAction = mixer.clipAction(heyWaveClip);
    heyWaveAction.setLoop(THREE.LoopRepeat);
    animationState.heyWaveAction = heyWaveAction;
  }

  if (tPoseClip) {
    animationState.tPoseAction = mixer.clipAction(tPoseClip);
  }

  mixer.addEventListener('finished', (e) => {
    if (e.action === animationState.heyAction && animationState.isHeyPlaying) {
      returnToIdle();
    }
  });

  return mixer;
}

/**
 * Triggers the frontside "Hey 👋" greeting.
 * Lifts right arm with +50° supinated palm facing user, waves, and
 * crossfades anticipatorily back to Idle over 0.25s at 1.45s (Frame 44).
 */
export function triggerHey() {
  const { heyAction, idleAction } = animationState;
  if (!heyAction) {
    console.warn('[ANIMATION] Hey action not available.');
    return;
  }

  // Clear previous timer if called rapidly
  if (heyTimeoutId) {
    clearTimeout(heyTimeoutId);
    heyTimeoutId = null;
  }

  animationState.isHeyPlaying = true;
  animationState.isWaveLooping = false;

  if (animationState.heyWaveAction && animationState.heyWaveAction.isRunning()) {
    animationState.heyWaveAction.fadeOut(0.15);
  }

  // 1. Crossfade Idle -> Hey over 0.15s
  if (idleAction) {
    idleAction.fadeOut(0.15);
  }

  // 2. Reset and play Hey skeletal animation
  heyAction.reset();
  heyAction.setLoop(THREE.LoopOnce);
  heyAction.clampWhenFinished = true;
  heyAction.fadeIn(0.15);
  heyAction.play();

  // 3. Reset and play Hey Face morph action (if present)
  if (animationState.heyFaceAction) {
    animationState.heyFaceAction.reset();
    animationState.heyFaceAction.setLoop(THREE.LoopOnce);
    animationState.heyFaceAction.clampWhenFinished = true;
    animationState.heyFaceAction.fadeIn(0.15);
    animationState.heyFaceAction.play();
  }

  // 4. Trigger warm greeting smile
  if (onGreetingSmileCallback) {
    onGreetingSmileCallback();
  }

  // 5. Anticipatory crossfade back to Idle at 1.45s (Frame 44)
  // Arm is descending, Idle blends over the clamped resting buffer -> ZERO T-pose flash!
  heyTimeoutId = setTimeout(() => {
    returnToIdle();
  }, 1450);
}

/**
 * Returns gracefully to resting Idle state over 0.25s.
 */
export function returnToIdle() {
  if (heyTimeoutId) {
    clearTimeout(heyTimeoutId);
    heyTimeoutId = null;
  }

  animationState.isHeyPlaying = false;
  animationState.isWaveLooping = false;

  const { idleAction, heyAction, heyWaveAction, heyFaceAction } = animationState;

  if (idleAction) {
    idleAction.enabled = true;
    idleAction.setEffectiveTimeScale(1.0);
    idleAction.setEffectiveWeight(1.0);

    const activeAction = (heyAction && heyAction.isRunning()) ? heyAction
      : (heyWaveAction && heyWaveAction.isRunning()) ? heyWaveAction
      : null;

    if (activeAction) {
      idleAction.crossFadeFrom(activeAction, 0.25, false);
    } else {
      idleAction.reset().fadeIn(0.25);
    }
    idleAction.play();
  }

  if (heyAction && heyAction.isRunning()) {
    heyAction.fadeOut(0.25);
  }
  if (heyFaceAction && heyFaceAction.isRunning()) {
    heyFaceAction.fadeOut(0.25);
  }
  if (heyWaveAction && heyWaveAction.isRunning()) {
    heyWaveAction.fadeOut(0.25);
  }

  if (onGreetingEndCallback) {
    onGreetingEndCallback();
  }
}

/**
 * Toggles or plays continuous wave loop.
 */
export function loopWave() {
  const { heyWaveAction, idleAction, heyAction, heyFaceAction } = animationState;
  if (!heyWaveAction) return;

  if (heyTimeoutId) {
    clearTimeout(heyTimeoutId);
    heyTimeoutId = null;
  }

  animationState.isHeyPlaying = false;

  if (animationState.isWaveLooping) {
    returnToIdle();
    return;
  }

  animationState.isWaveLooping = true;

  if (heyAction && heyAction.isRunning()) heyAction.fadeOut(0.2);
  if (heyFaceAction && heyFaceAction.isRunning()) heyFaceAction.fadeOut(0.2);
  if (idleAction) idleAction.fadeOut(0.2);

  heyWaveAction.reset();
  heyWaveAction.fadeIn(0.2);
  heyWaveAction.play();

  if (onGreetingSmileCallback) {
    onGreetingSmileCallback();
  }
}

/**
 * Freezes avatar in peak frontside greeting pose (0.50s / Frame 15) for inspection/photo.
 */
export function setStaticHeyPose() {
  const { heyAction, mixer } = animationState;
  if (!heyAction) return;

  if (heyTimeoutId) {
    clearTimeout(heyTimeoutId);
    heyTimeoutId = null;
  }

  animationState.isHeyPlaying = false;
  animationState.isWaveLooping = false;

  if (mixer) mixer.stopAllAction();

  heyAction.reset();
  heyAction.time = 0.50; // Frame 15 peak greeting pose
  heyAction.setLoop(THREE.LoopOnce);
  heyAction.clampWhenFinished = true;
  heyAction.paused = true;
  heyAction.play();

  if (mixer) mixer.update(0);

  if (onGreetingSmileCallback) {
    onGreetingSmileCallback();
  }
}

/**
 * Advances mixer per frame.
 */
export function updateAvatarAnimations(delta) {
  if (animationState.mixer) {
    animationState.mixer.update(delta);
  }
}

// Global browser console helpers (supports all conventions from README & test runner)
if (typeof window !== 'undefined') {
  window.ayraHey = triggerHey;
  window.triggerBackendHey = triggerHey;
  window.playHey = triggerHey;
  window.ayraLoopWave = loopWave;
  window.playHeyLoop = loopWave;
  window.ayraReturnToIdle = returnToIdle;
  window.transitionToIdle = returnToIdle;
  window.ayraStaticPose = setStaticHeyPose;
  window.applyStaticHeyPose = setStaticHeyPose;
}
