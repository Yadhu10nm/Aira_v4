/* =========================================================================
   EXPRESSION MANAGER  –  Coordinates all facial expressions & head gestures
   
   Separation of Concerns:
   - Mouth visemes (lip-sync) and blink are handled purely by `modules/expression.js`
   - Facial expressions (brows, eyes, blush, head gestures) are handled here
   - Human-like dynamics:
     * If no emotion: avatar speaks with neutral expression (mouth moves, eyes blink, brows calm).
     * If emotion present: avatar reacts first (e.g. laughs / blushes for 1.5s), then softens
       into normal conversational face as speech continues, then returns to neutral.
   ========================================================================= */

import * as THREE from 'three';
import { animationState } from '../modules/avatarAnimation.js';

import * as neutral from './neutral.js';
import * as smile from './smile.js';
import * as happy from './happy.js';
import * as blush from './blush.js';
import * as thinking from './thinking.js';
import * as surprised from './surprised.js';
import * as sad from './sad.js';
import * as angry from './angry.js';
import * as curious from './curious.js';

export const EXPRESSION_CATALOG = {
  neutral,
  smile,
  happy,
  blush,
  thinking,
  surprised,
  sad,
  angry,
  curious,
};

// ── State ─────────────────────────────────────────────────────────────────
let _vrm = null;
let morphMeshes = [];
let masterMorphDict = {};
let headBone = null;
let initialHeadRot = { x: 0, y: 0, z: 0 };

let cheekBlushMat = null;
let cheekBlushGroup = null;

let currentEmotion = 'neutral';
let targetEmotion = 'neutral';
let currentIntensity = 0.0;
let displayIntensity = 0.0;

let autoResetTimer = null;
let softenTimer = null;

// Smoothed morph weights
const currentMorphWeights = {
  Fcl_BRW_Joy: 0,
  Fcl_BRW_Fun: 0,
  Fcl_BRW_Surprised: 0,
  Fcl_BRW_Sorrow: 0,
  Fcl_BRW_Angry: 0,
  Fcl_EYE_Joy: 0,
  Fcl_EYE_Fun: 0,
  Fcl_EYE_Surprised: 0,
  Fcl_EYE_Spread: 0,
  Fcl_EYE_Sorrow: 0,
  Fcl_EYE_Angry: 0,
  Fcl_MTH_Joy: 0,
  Fcl_MTH_Up: 0,
  Fcl_MTH_Down: 0,
  Fcl_MTH_Small: 0,
};

let currentHeadPitch = 0.0;
let currentHeadRoll = 0.0;

let onEmotionChangeCallback = null;
export function setEmotionChangeHandler(fn) {
  onEmotionChangeCallback = fn;
}

/**
 * Initialize expressions and sub-mesh registry from loaded VRM/GLTF.
 */
export function setVRM(vrm, gltf) {
  _vrm = vrm;
  morphMeshes = [];
  masterMorphDict = {};
  headBone = null;

  const root = gltf?.scene || vrm?.scene;
  if (!root) return;

  root.traverse((child) => {
    if (child.isMesh && child.morphTargetDictionary && Object.keys(child.morphTargetDictionary).length > 0) {
      morphMeshes.push(child);
      for (const k in child.morphTargetDictionary) {
        masterMorphDict[k] = true;
      }
    }
    if (child.isBone) {
      const lower = child.name.toLowerCase();
      if ((lower.includes('head') || lower.includes('j_bip_c_head')) && !headBone) {
        headBone = child;
      }
    }
  });

  if (!headBone && vrm?.humanoid) {
    headBone = vrm.humanoid.getNormalizedBoneNode('head') || vrm.humanoid.getRawBoneNode('head');
  }

  if (headBone) {
    initialHeadRot = { x: headBone.rotation.x, y: headBone.rotation.y, z: headBone.rotation.z };
    createCheekBlushSystem(headBone);
  }

  // Start in natural neutral state
  targetEmotion = 'neutral';
  currentEmotion = 'neutral';
  currentIntensity = 0.0;
  displayIntensity = 0.0;

  console.log(`[EXPRESSIONS] Initialized ${morphMeshes.length} morph sub-meshes with ${Object.keys(masterMorphDict).length} shape keys.`);
}

/**
 * Procedural Cheek Blush Decals attached to head bone
 */
function createCheekBlushSystem(targetHeadBone) {
  if (!targetHeadBone) return;

  if (cheekBlushGroup) {
    targetHeadBone.remove(cheekBlushGroup);
    cheekBlushGroup = null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(128, 64, 4, 128, 64, 58);
  grad.addColorStop(0, 'rgba(255, 110, 155, 0.88)');
  grad.addColorStop(0.35, 'rgba(255, 140, 178, 0.58)');
  grad.addColorStop(0.70, 'rgba(255, 180, 205, 0.22)');
  grad.addColorStop(1.0, 'rgba(255, 210, 225, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(128, 64, 90, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle anime blush hatch lines
  ctx.strokeStyle = 'rgba(255, 95, 145, 0.35)';
  ctx.lineWidth = 3.0;
  ctx.lineCap = 'round';
  for (let x = 84; x <= 168; x += 17) {
    ctx.beginPath();
    ctx.moveTo(x - 7, 47);
    ctx.lineTo(x + 7, 81);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  const blushGeo = new THREE.PlaneGeometry(0.052, 0.028);
  cheekBlushMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.0,
    depthTest: false,
    depthWrite: false,
  });

  const lBlush = new THREE.Mesh(blushGeo, cheekBlushMat);
  lBlush.renderOrder = 9999;
  lBlush.position.set(0.038, 0.016, 0.095);
  lBlush.rotation.set(-0.04, 0.28, -0.06);

  const rBlush = new THREE.Mesh(blushGeo, cheekBlushMat);
  rBlush.renderOrder = 9999;
  rBlush.position.set(-0.038, 0.016, 0.095);
  rBlush.rotation.set(-0.04, -0.28, 0.06);

  cheekBlushGroup = new THREE.Group();
  cheekBlushGroup.name = 'CheekBlushSystem';
  cheekBlushGroup.add(lBlush);
  cheekBlushGroup.add(rBlush);

  targetHeadBone.add(cheekBlushGroup);
}

/**
 * Human-like emotional reaction:
 * - If no emotion / 'neutral': remains in pure neutral (no forced expressions!).
 * - If active emotion (e.g. happy): laughs/reacts first at peak intensity for reactionDurationSec,
 *   then softens into a natural conversational face while speaking the rest.
 */
export function triggerHumanReaction(emoKey, peakIntensity = 0.88, reactionDurationSec = 1.5, softenIntensity = 0.25) {
  if (softenTimer) {
    clearTimeout(softenTimer);
    softenTimer = null;
  }
  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
    autoResetTimer = null;
  }

  if (!emoKey || emoKey === 'neutral' || !EXPRESSION_CATALOG[emoKey]) {
    // If no emotion, remain in neutral expression
    targetEmotion = 'neutral';
    currentIntensity = 0.0;
    onEmotionChangeCallback?.('neutral', 0.0);
    return;
  }

  // Phase 1: Initial Peak Reaction (humans laugh / react first)
  targetEmotion = emoKey;
  currentIntensity = Math.max(0.1, Math.min(1.0, peakIntensity));
  onEmotionChangeCallback?.(targetEmotion, currentIntensity);

  // User requirement:
  // "for angry , blush it should be active during talking.. remaining other things no need to active fully during the speech"
  const stayActiveDuringTalking = (emoKey === 'angry' || emoKey === 'blush');

  // Phase 2: For other emotions (happy, smile, etc.), soften to gentle face while continuing to speak
  if (!stayActiveDuringTalking && reactionDurationSec > 0) {
    softenTimer = setTimeout(() => {
      if (targetEmotion === emoKey) {
        currentIntensity = Math.max(0.05, Math.min(1.0, softenIntensity));
        onEmotionChangeCallback?.(targetEmotion, currentIntensity);
      }
    }, reactionDurationSec * 1000);
  }
}

/**
 * Trigger an expression with explicit duration (convenience wrapper).
 */
export function triggerEmotion(emoKey, intensity = 0.85, holdDurationMs = null) {
  triggerHumanReaction(
    emoKey,
    intensity,
    holdDurationMs ? holdDurationMs / 1000 : 1.5,
    0.25
  );

  if (holdDurationMs && emoKey !== 'neutral') {
    autoResetTimer = setTimeout(() => {
      resetToNeutral();
    }, holdDurationMs);
  }
}

/**
 * Smoothly return to the natural resting neutral face.
 */
export function resetToNeutral() {
  if (softenTimer) {
    clearTimeout(softenTimer);
    softenTimer = null;
  }
  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
    autoResetTimer = null;
  }
  targetEmotion = 'neutral';
  currentIntensity = 0.0;
  onEmotionChangeCallback?.('neutral', 0.0);
}

/**
 * Get currently active emotion.
 */
export function getCurrentEmotion() {
  return targetEmotion;
}

/**
 * Main per-frame update for facial expressions and head postures.
 * Called in render loop (animate).
 */
export function updateExpressions(delta, time, isSpeaking) {
  // Smoothly blend display intensity toward target intensity
  displayIntensity += (currentIntensity - displayIntensity) * Math.min(1.0, 10 * delta);

  const activeModule = EXPRESSION_CATALOG[targetEmotion] || EXPRESSION_CATALOG.neutral;
  const targetData = activeModule.getTargets(displayIntensity, isSpeaking);

  // ── Smooth exponential damping for morph targets ────────────────────────
  const morphDamp = 1.0 - Math.exp(-22 * delta);

  for (const k in currentMorphWeights) {
    const target = targetData.morphs?.[k] || 0.0;
    const current = currentMorphWeights[k];
    const diff = target - current;

    const rate = diff > 0 ? morphDamp : morphDamp * 0.55;
    let lerped = current + diff * rate;
    if (Math.abs(lerped - target) < 0.001) lerped = target;
    currentMorphWeights[k] = lerped;

    // Propagate only to registered meshes that contain this morph target
    for (let i = 0; i < morphMeshes.length; i++) {
      const mesh = morphMeshes[i];
      if (mesh.morphTargetDictionary && mesh.morphTargetDictionary[k] !== undefined) {
        const idx = mesh.morphTargetDictionary[k];
        mesh.morphTargetInfluences[idx] = lerped;
      }
    }
  }

  // ── Smooth Cheek Blush Decal Opacity ─────────────────────────────────────
  if (cheekBlushMat) {
    const targetOpacity = targetData.blush || 0.0;
    cheekBlushMat.opacity += (targetOpacity - cheekBlushMat.opacity) * Math.min(1.0, 14 * delta);
  }

  // ── Smooth Head Posture & Emotion Accent ──────────────────────────────────
  if (headBone && !animationState?.isHeyPlaying) {
    const headTarget = targetData.head || { basePitch: 0, baseRoll: 0 };

    const headDamp = 1.0 - Math.exp(-12 * delta);
    currentHeadPitch += (headTarget.basePitch - currentHeadPitch) * headDamp;
    currentHeadRoll  += (headTarget.baseRoll - currentHeadRoll) * headDamp;

    // Apply emotion posture on top of Idle skeletal animation without destroying mixer tracks
    if (Math.abs(currentHeadPitch) > 0.001) headBone.rotation.x += currentHeadPitch * 0.7;
    if (Math.abs(currentHeadRoll) > 0.001) headBone.rotation.z += currentHeadRoll * 0.7;

    if (isSpeaking) {
      headBone.rotation.x += Math.sin(time * 6.5) * 0.006;
    }
  }
}

// Global browser console helper for manual testing
if (typeof window !== 'undefined') {
  window.ayraTriggerEmotion = triggerHumanReaction;
  window.ayraResetEmotion = resetToNeutral;
}
