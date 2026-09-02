/* =========================================================================
   HOLOGRAM  –  Interactive holographic rings & visualizer effects

   Creates futuristic 3D holographic elements:
   - Concentric rotating cyber rings at the avatar's base
   - Holographic audio visualizer circle
   - Interactive tilt responding to mouse movement
   - State-reactive speed, color, and pulse intensity
   ========================================================================= */

import * as THREE from 'three';

let hologramGroup = null;
let outerRing = null;
let midRing = null;
let innerRing = null;
let visualizerBars = [];
let mousePos = new THREE.Vector2(0, 0);
let targetMousePos = new THREE.Vector2(0, 0);

const BAR_COUNT = 32;

/**
 * Initialize 3D holographic pedestal and visualizer
 */
export function initHologram(scene) {
  hologramGroup = new THREE.Group();
  hologramGroup.position.set(0, 0.05, 0);
  scene.add(hologramGroup);

  // ── 1. Outer Tech Ring (Dashed/Segmented) ──────────────────────────────
  const outerGeom = new THREE.RingGeometry(0.85, 0.90, 64);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x4da3ff,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  outerRing = new THREE.Mesh(outerGeom, outerMat);
  outerRing.rotation.x = -Math.PI / 2;
  hologramGroup.add(outerRing);

  // ── 2. Middle Ring (Counter-rotating Rune Ring) ────────────────────────
  const midGeom = new THREE.RingGeometry(0.65, 0.68, 48);
  const midMat = new THREE.MeshBasicMaterial({
    color: 0x6f93b3,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  midRing = new THREE.Mesh(midGeom, midMat);
  midRing.rotation.x = -Math.PI / 2;
  hologramGroup.add(midRing);

  // ── 3. Inner Glowing Energy Core Ring ─────────────────────────────────
  const innerGeom = new THREE.RingGeometry(0.42, 0.45, 32);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xa2cdff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  innerRing = new THREE.Mesh(innerGeom, innerMat);
  innerRing.rotation.x = -Math.PI / 2;
  hologramGroup.add(innerRing);

  // ── 4. Circular Audio Visualizer Bars ──────────────────────────────────
  const barMat = new THREE.MeshBasicMaterial({
    color: 0x4da3ff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });

  const barGeom = new THREE.BoxGeometry(0.018, 0.15, 0.018);

  for (let i = 0; i < BAR_COUNT; i++) {
    const angle = (i / BAR_COUNT) * Math.PI * 2;
    const radius = 0.55;
    const bar = new THREE.Mesh(barGeom, barMat.clone());

    bar.position.set(
      Math.cos(angle) * radius,
      0.08,
      Math.sin(angle) * radius
    );
    bar.userData = {
      baseAngle: angle,
      radius: radius,
      offset: i * 0.2,
      baseScaleY: 0.2,
    };
    hologramGroup.add(bar);
    visualizerBars.push(bar);
  }

  // Mouse tracking for parallax tilt
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove);
}

function onMouseMove(event) {
  targetMousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
  targetMousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onTouchMove(event) {
  if (event.touches.length > 0) {
    targetMousePos.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    targetMousePos.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
}

/**
 * Update hologram animations per frame
 */
export function updateHologram(time, delta, state = 'idle', isSpeaking = false) {
  if (!hologramGroup) return;

  // Smooth mouse tilt
  mousePos.lerp(targetMousePos, 0.05);
  hologramGroup.rotation.z = mousePos.x * 0.08;
  hologramGroup.rotation.x = mousePos.y * 0.08;

  const speedMultiplier = isSpeaking ? 2.5 : state === 'listening' ? 1.8 : 1.0;

  // Rotate concentric rings
  if (outerRing) {
    outerRing.rotation.z += 0.25 * delta * speedMultiplier;
  }
  if (midRing) {
    midRing.rotation.z -= 0.4 * delta * speedMultiplier;
  }
  if (innerRing) {
    innerRing.rotation.z += 0.6 * delta * speedMultiplier;
    const innerPulse = Math.sin(time * (isSpeaking ? 8 : 2)) * 0.15 + 0.85;
    innerRing.scale.set(innerPulse, innerPulse, innerPulse);
  }

  // Dynamic colors based on state
  const targetColorHex = isSpeaking
    ? 0xe8a23d // Amber when speaking
    : state === 'listening'
    ? 0x4da3ff // Bright cyan when listening
    : 0x6f93b3; // Steel blue when idle

  if (outerRing?.material) {
    outerRing.material.color.lerp(new THREE.Color(targetColorHex), 0.08);
  }
  if (midRing?.material) {
    midRing.material.color.lerp(new THREE.Color(targetColorHex), 0.08);
  }
  if (innerRing?.material) {
    innerRing.material.color.lerp(new THREE.Color(isSpeaking ? 0xffdd88 : 0xa2cdff), 0.08);
  }

  // Animate audio visualizer bars
  visualizerBars.forEach((bar) => {
    let barHeight = 0.2;

    if (isSpeaking) {
      // Dynamic frequency wave when speaking
      barHeight = 0.3 + Math.abs(Math.sin(time * 10 + bar.userData.offset)) * 1.2;
    } else if (state === 'listening') {
      // Gentle listening wave
      barHeight = 0.2 + Math.abs(Math.sin(time * 3 + bar.userData.offset)) * 0.5;
    } else {
      // Idle breathing wave
      barHeight = 0.15 + Math.abs(Math.sin(time * 1.5 + bar.userData.offset)) * 0.25;
    }

    bar.scale.y = barHeight;
    bar.position.y = (barHeight * 0.15) / 2;
    bar.material.color.lerp(new THREE.Color(targetColorHex), 0.08);
  });
}

/**
 * Clean up hologram resources
 */
export function disposeHologram(scene) {
  if (hologramGroup) {
    scene.remove(hologramGroup);
    hologramGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    hologramGroup = null;
  }
  visualizerBars = [];
  outerRing = null;
  midRing = null;
  innerRing = null;

  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);
}
