/* =========================================================================
   MODEL LOADER  –  VRM loading, AnimationMixer init, expressions, camera fit
   ========================================================================= */

import * as THREE from 'three';
import { GLTFLoader }                      from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils }       from '@pixiv/three-vrm';
import { scene, camera, controls, setCameraPreset } from './scene.js';
import { setState }                        from './state.js';
import { setVRM as setMouthVRM }           from './expression.js';
import { setVRM as setExpressionsVRM, triggerEmotion, resetToNeutral } from '../expressions/index.js';
import { initAvatarAnimations, setGreetingCallbacks } from './avatarAnimation.js';
import { initHair }                        from './hair.js';

const overlay    = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-msg');
const overlayBar = document.getElementById('overlay-bar');

export const modelState = {
  vrm: null,
  gltf: null,
  loaded: false,
};

let onLoadedCallbacks = [];
export function onAvatarLoaded(cb) {
  if (modelState.loaded) cb(modelState.vrm);
  else onLoadedCallbacks.push(cb);
}

export function loadVRM(vrmPath = '/models/Aira.vrm') {
  const loader = new GLTFLoader();
  loader.crossOrigin = 'anonymous';
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const candidates = [
    vrmPath,
    '/models/Aira.vrm',
    '/models/Ayra.vrm',
    '/models/ayra_avatar.vrm',
  ].filter((v, i, a) => a.indexOf(v) === i);

  let attempt = 0;

  function tryLoadNext() {
    if (attempt >= candidates.length) {
      console.error('[MODEL] All VRM candidate paths failed to load.');
      if (overlayMsg) {
        overlayMsg.classList.add('err');
        overlayMsg.textContent =
          "Couldn't load avatar. Please check frontend/public/models/Aira.vrm";
      }
      return;
    }

    const currentUrl = candidates[attempt++];
    console.log(`[MODEL] Loading VRM avatar from: ${currentUrl}`);

    loader.load(
      currentUrl,
      (gltf) => {
        console.log(`[MODEL] Successfully loaded avatar from: ${currentUrl}`);
        onModelLoaded(gltf);
      },
      (progress) => {
        if (progress.total) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          if (overlayBar) overlayBar.style.width = pct + '%';
          if (overlayMsg) overlayMsg.textContent = `Reading avatar … ${pct}%`;
        }
      },
      (error) => {
        console.warn(`[MODEL] Failed loading ${currentUrl}:`, error);
        tryLoadNext();
      }
    );
  }

  tryLoadNext();
}

function onModelLoaded(gltf) {
  const vrm = gltf.userData.vrm;
  modelState.vrm = vrm;
  modelState.gltf = gltf;
  modelState.loaded = true;

  if (vrm) {
    VRMUtils.removeUnnecessaryVertices(gltf.scene);

    // ==============================================================
    // CRITICAL ENGINE SETTING (from hi.md):
    // Disable autoUpdateHumanBones so VRM 1.0 humanoid transforms
    // do not overwrite AnimationMixer skeletal tracks back to T-pose!
    // ==============================================================
    if (vrm.humanoid) {
      vrm.humanoid.autoUpdateHumanBones = false;
    }

    vrm.scene.traverse((obj) => {
      obj.frustumCulled = false;
      // Ensure avatar is strictly without spectacles/glasses
      if (obj.isMesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const isGlasses = mats.some(m => m?.name && (
          m.name.toLowerCase().includes('glass') ||
          m.name.toLowerCase().includes('spec') ||
          m.name.toLowerCase().includes('eyewear')
        ));
        if (isGlasses || obj.name.toLowerCase().includes('glass')) {
          obj.visible = false;
        }
      }
    });
    scene.add(vrm.scene);
    vrm.scene.position.set(0, 0, 0);

    initHair(vrm);
  } else {
    scene.add(gltf.scene);
  }

  // ── Initialize AnimationMixer with Ayra_Hey, Ayra_Hey_Wave, Idle ─────────
  initAvatarAnimations(gltf, vrm);

  // Sync greeting smiles with expression system
  setGreetingCallbacks({
    onSmile: () => {
      triggerEmotion('smile', 0.85);
    },
    onEnd: () => {
      // Natural linger after wave, then return to neutral resting face
      setTimeout(() => {
        resetToNeutral();
      }, 1200);
    },
  });

  // ── Initialize Lip Movement (mouth visemes) & Expressions (brows/eyes/blush) ──
  setMouthVRM(vrm, gltf);
  setExpressionsVRM(vrm, gltf);

  // ── Camera Framing ───────────────────────────────────────────────────────
  setCameraPreset('upper');

  overlay?.classList.add('hidden');
  setState('idle');

  // Friendly welcome greeting wave on startup
  setTimeout(() => {
    triggerHey();
  }, 1000);

  onLoadedCallbacks.forEach((cb) => {
    try { cb(vrm); } catch (e) { console.error(e); }
  });
  onLoadedCallbacks = [];
}
