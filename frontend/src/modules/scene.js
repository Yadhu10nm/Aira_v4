import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================================
   SCENE  –  renderer, camera, lights, orbit controls, resize handler

   NOTE: Static lights have been replaced by dynamic lighting system.
   See lighting.js for interactive lighting effects.
   ========================================================================= */

export const clock = new THREE.Clock();

// ── Renderer ──────────────────────────────────────────────────────────────
const canvasHost = document.getElementById('stage');
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
canvasHost.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = null; // Transparent to show background effects

// ── Camera ────────────────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
    20,
    innerWidth / innerHeight,
    0.1,
    20
);
camera.position.set(0, 1.45, 1.1);

// ── Orbit controls ────────────────────────────────────────────────────────
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.08;
controls.target.set(0, 1.45, 0);
controls.minDistance    = 1.2;
controls.maxDistance    = 4.5;
controls.maxPolarAngle  = Math.PI * 0.55;
controls.update();

// ── Resize handler ────────────────────────────────────────────────────────
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
