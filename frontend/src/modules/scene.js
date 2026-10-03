import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================================
   SCENE  –  renderer, camera, controls, presets & resize handler
   ========================================================================= */

export const clock = new THREE.Clock();

// ── Renderer ──────────────────────────────────────────────────────────────
const canvasHost = document.getElementById('stage') || document.body;
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 1.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
canvasHost.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// ── Camera ────────────────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  22,
  innerWidth / innerHeight,
  0.1,
  20
);
camera.position.set(0, 1.42, 1.15);

// ── Orbit controls ────────────────────────────────────────────────────────
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1.40, 0);
controls.minDistance = 0.4;
controls.maxDistance = 4.0;
controls.maxPolarAngle = Math.PI * 0.55;
controls.update();

// ── Camera Presets & Smooth Transition ────────────────────────────────────
export const CAMERA_PRESETS = {
  portrait: { target: new THREE.Vector3(0, 1.46, 0), pos: new THREE.Vector3(0, 1.46, 0.58) },
  upper:    { target: new THREE.Vector3(0, 1.40, 0), pos: new THREE.Vector3(0, 1.42, 1.15) },
  angle:    { target: new THREE.Vector3(0, 1.45, 0), pos: new THREE.Vector3(0.32, 1.45, 0.70) },
};

let activePresetKey = 'upper';
let targetCamPos = new THREE.Vector3().copy(CAMERA_PRESETS.upper.pos);
let targetLookAt = new THREE.Vector3().copy(CAMERA_PRESETS.upper.target);
let isTransitioning = false;

export function setCameraPreset(mode) {
  const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.upper;
  activePresetKey = mode;
  targetCamPos.copy(preset.pos);
  targetLookAt.copy(preset.target);
  isTransitioning = true;
}

export function getActiveCameraPreset() {
  return activePresetKey;
}

export function updateCameraTransition(delta) {
  if (!isTransitioning) return;

  const t = 1.0 - Math.exp(-12 * delta);
  camera.position.lerp(targetCamPos, t);
  controls.target.lerp(targetLookAt, t);

  if (camera.position.distanceTo(targetCamPos) < 0.002 && controls.target.distanceTo(targetLookAt) < 0.002) {
    camera.position.copy(targetCamPos);
    controls.target.copy(targetLookAt);
    isTransitioning = false;
  }
}

// ── Resize handler ────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Global console helper
if (typeof window !== 'undefined') {
  window.ayraSetCamera = setCameraPreset;
}
