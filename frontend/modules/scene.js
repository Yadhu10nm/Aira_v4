import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================================
   SCENE  –  renderer, camera, lights, orbit controls, resize handler
   ========================================================================= */

export const clock = new THREE.Clock();

// ── Renderer ──────────────────────────────────────────────────────────────
const canvasHost = document.getElementById('stage');
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
canvasHost.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = null;

// ── Camera ────────────────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
    20,
    innerWidth / innerHeight,
    0.1,
    20
);
// camera.position.set(0, 1.3, 2.7);
camera.position.set(0, 1.45, 1.1);


// ── Orbit controls ────────────────────────────────────────────────────────
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.08;
// controls.target.set(0, 1.1, 0);
controls.target.set(0, 1.45, 0);

controls.minDistance    = 1.2;
controls.maxDistance    = 4.5;
controls.maxPolarAngle  = Math.PI * 0.55;
controls.update();

// ── Lights ────────────────────────────────────────────────────────────────
const key = new THREE.DirectionalLight(0xfff3df, 2.2);
key.position.set(1.1, 1.6, 1.4);
scene.add(key);

const fill = new THREE.DirectionalLight(0xbfd6ff, 0.7);
fill.position.set(-1.3, 0.6, 1.0);
scene.add(fill);

const rim = new THREE.DirectionalLight(0x8fb8e8, 0.5);
rim.position.set(-0.4, 1.4, -1.6);
scene.add(rim);

const hemi = new THREE.HemisphereLight(0x9fb6cc, 0x0a0a0c, 0.55);
scene.add(hemi);

// ── Resize handler ────────────────────────────────────────────────────────
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
