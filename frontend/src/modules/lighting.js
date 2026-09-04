/* =========================================================================
   LIGHTING  –  Soft, balanced lighting system

   Provides smooth, low-contrast illumination for the avatar.
   No mouse interaction.
   ========================================================================= */

import * as THREE from 'three';

let dynamicLights = {
  key: null,
  fill: null,
  rim: null,
  rimLeft: null,
  rimRight: null,
  accent: null,
  top: null,
};

/**
 * Initialize soft, low-contrast lighting
 */
export function initDynamicLighting(scene) {
  // Key light (soft, warm white)
  const key = new THREE.DirectionalLight(0xfff8f0, 1.4);
  key.position.set(1.0, 1.5, 1.6);
  scene.add(key);
  dynamicLights.key = key;

  // Fill light (soft, balances out contrast and shadows)
  const fill = new THREE.DirectionalLight(0xf0f4ff, 1.2);
  fill.position.set(-1.2, 1.0, 1.4);
  scene.add(fill);
  dynamicLights.fill = fill;

  // Primary rim light (gentle soft blue/cyan back light)
  const rim = new THREE.DirectionalLight(0xb0d4ff, 0.7);
  rim.position.set(0, 1.5, -2.0);
  scene.add(rim);
  dynamicLights.rim = rim;

  // Left rim light (subtle edge softener)
  const rimLeft = new THREE.DirectionalLight(0xd0e4ff, 0.5);
  rimLeft.position.set(-1.8, 1.2, -1.2);
  scene.add(rimLeft);
  dynamicLights.rimLeft = rimLeft;

  // Right rim light (subtle edge softener)
  const rimRight = new THREE.DirectionalLight(0xd0e4ff, 0.5);
  rimRight.position.set(1.8, 1.2, -1.2);
  scene.add(rimRight);
  dynamicLights.rimRight = rimRight;

  // Top light (soft top fill)
  const top = new THREE.DirectionalLight(0xfff0f8, 0.8);
  top.position.set(0, 3.0, 0.5);
  scene.add(top);
  dynamicLights.top = top;

  // Ambient hemisphere light (high ambient for soft, harmonious shadows on soft pink)
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffe0f8, 1.1);
  scene.add(hemi);

  // Soft accent light
  const accent = new THREE.PointLight(0xa0c8ff, 0.6, 5);
  accent.position.set(0, 1.5, 1.0);
  scene.add(accent);
  dynamicLights.accent = accent;

  // NO mouse tracking
}

/**
 * Update lights each frame (no mouse interaction)
 */
export function updateDynamicLighting(time, delta, state = 'idle') {
  // Subtle soft breathing effect
  if (dynamicLights.accent) {
    const breath = Math.sin(time * 1.2) * 0.1 + 0.6;
    dynamicLights.accent.intensity = breath;
  }
}

/**
 * Clean up lighting
 */
export function disposeDynamicLighting(scene) {
  Object.values(dynamicLights).forEach((light) => {
    if (light) {
      scene.remove(light);
    }
  });

  dynamicLights = {
    key: null,
    fill: null,
    rim: null,
    rimLeft: null,
    rimRight: null,
    accent: null,
    top: null,
  };

  // No event listeners to remove
}
