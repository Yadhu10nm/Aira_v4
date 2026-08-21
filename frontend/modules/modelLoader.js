/* =========================================================================
   MODEL LOADER  –  VRM loading, bone init, camera fit
   ========================================================================= */

import * as THREE from 'three';
import { GLTFLoader }                      from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils }       from '@pixiv/three-vrm';
import { scene, camera, controls }         from './scene.js';
import { TRACKED_BONES, REST }             from './pose.js';
import { D }                               from './pose.js';
import { setState }                        from './state.js';
import { setVRM as setExpressionVRM }      from './expression.js';
import { initHair }                        from "./hair.js";

const overlay    = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-msg');
const overlayBar = document.getElementById('overlay-bar');

// Shared mutable state exported to the render loop.
export const modelState = {
  vrm:         null,
  bones:       {},
  currentQuat: {},
};

export function loadVRM(vrmPath = './Ayra.vrm') {
  const loader = new GLTFLoader();
  loader.crossOrigin = 'anonymous';
  loader.register((parser) => new VRMLoaderPlugin(parser));

  loader.load(
    vrmPath,
    (gltf) => onModelLoaded(gltf),
    (progress) => {
      if (progress.total) {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        if (overlayBar) overlayBar.style.width = pct + '%';
        if (overlayMsg) overlayMsg.textContent  = `Reading ${vrmPath} … ${pct}%`;
      }
    },
    (error) => {
      console.error('[MODEL] Load error:', error);
      if (overlayMsg) {
        overlayMsg.classList.add('err');
        overlayMsg.textContent =
          `Couldn't load ${vrmPath}. Make sure it sits next to index.html and ` +
          'that you\'re serving the page through a local server (Live Server or ' +
          '`python -m http.server`) — browsers block module + model loading from a ' +
          'plain file:// path.';
      }
    }
  );
}

function onModelLoaded(gltf) {
  const vrm = gltf.userData.vrm;
  modelState.vrm = vrm;

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.combineMorphs(vrm);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((obj) => { obj.frustumCulled = false; });
  scene.add(vrm.scene);
  vrm.scene.position.y = -0.25;

  initHair(vrm);

  // ── Let the expression module know about the VRM ─────────────────────────
  setExpressionVRM(vrm);

  // ── Init bone quaternions from rest pose ─────────────────────────────────
  for (const name of TRACKED_BONES) {
    const node = vrm.humanoid.getNormalizedBoneNode(name);
    if (node) {
      modelState.bones[name] = node;
      const deg  = REST[name] || [0, 0, 0];
      const q    = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(deg[0] * D, deg[1] * D, deg[2] * D)
      );
      modelState.currentQuat[name] = q;
      node.quaternion.copy(q);
    } else {
      console.warn(`[MODEL] bone "${name}" not found – skipping.`);
    }
  }

  // ── Log available expressions ────────────────────────────────────────────
  if (vrm.expressionManager?.expressionMap) {
    console.log(
      '[MODEL] expressions on this model:',
      Object.keys(vrm.expressionManager.expressionMap)
    );
  } else {
    console.warn('[MODEL] no expressionManager – lip sync and blink will not drive anything.');
  }

  // ── Fit camera to model ──────────────────────────────────────────────────
const box = new THREE.Box3().setFromObject(vrm.scene);
const height = box.max.y - box.min.y;

// Focus around the neck/chest
controls.target.set(0, height * 0.72, 0);

// Camera slightly above eye level and closer
camera.position.set(0, height * 0.78, height * 0.27);

controls.update();

  overlay?.classList.add('hidden');
  setState('idle');
}
