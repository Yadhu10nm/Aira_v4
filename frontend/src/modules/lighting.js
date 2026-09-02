/* =========================================================================
   LIGHTING  –  Dynamic interactive lighting system

   Provides responsive lighting that:
   - Follows mouse movement subtly
   - Pulses with speaking state
   - Shifts color based on conversation mood
   - Creates depth with animated rim lights
   ========================================================================= */

import * as THREE from 'three';

let dynamicLights = {
  key: null,
  fill: null,
  rim: null,
  accent: null,
  mouseLight: null,
};

let mousePos = new THREE.Vector2(0, 0);
let targetMousePos = new THREE.Vector2(0, 0);

/**
 * Initialize dynamic lighting
 */
export function initDynamicLighting(scene) {
  // Key light (warm, strong)
  const key = new THREE.DirectionalLight(0xfff3df, 2.2);
  key.position.set(1.1, 1.6, 1.4);
  scene.add(key);
  dynamicLights.key = key;

  // Fill light (cool, soft)
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.7);
  fill.position.set(-1.3, 0.6, 1.0);
  scene.add(fill);
  dynamicLights.fill = fill;

  // Rim light (blue/cyan accent)
  const rim = new THREE.DirectionalLight(0x8fb8e8, 0.8);
  rim.position.set(-0.4, 1.4, -1.6);
  scene.add(rim);
  dynamicLights.rim = rim;

  // Ambient hemisphere light
  const hemi = new THREE.HemisphereLight(0x9fb6cc, 0x0a0a0c, 0.55);
  scene.add(hemi);

  // Dynamic accent point light (state-reactive)
  const accent = new THREE.PointLight(0x4da3ff, 1.0, 5);
  accent.position.set(0, 1.5, 0.8);
  scene.add(accent);
  dynamicLights.accent = accent;

  // Mouse-following light
  const mouseLight = new THREE.PointLight(0x6f93b3, 0.5, 3);
  mouseLight.position.set(0, 1.5, 1.5);
  scene.add(mouseLight);
  dynamicLights.mouseLight = mouseLight;

  // Mouse tracking
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
 * Update dynamic lights each frame
 */
export function updateDynamicLighting(time, delta, state = 'idle') {
  // Smooth mouse position
  mousePos.lerp(targetMousePos, 0.08);

  // Update mouse light position
  if (dynamicLights.mouseLight) {
    dynamicLights.mouseLight.position.x = mousePos.x * 2;
    dynamicLights.mouseLight.position.y = 1.5 + mousePos.y * 1.5;
    dynamicLights.mouseLight.position.z = 1.2;
  }

  // State-based light animations
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';

  // Accent light pulsation
  if (dynamicLights.accent) {
    if (isSpeaking) {
      // Warm amber pulse when speaking
      const pulse = Math.sin(time * 6) * 0.4 + 1.2;
      dynamicLights.accent.color.setHex(0xe8a23d);
      dynamicLights.accent.intensity = pulse * 1.5;
      dynamicLights.accent.position.y = 1.45 + Math.sin(time * 4) * 0.1;
    } else if (isListening) {
      // Steady bright cyan when listening
      dynamicLights.accent.color.setHex(0x4da3ff);
      dynamicLights.accent.intensity = 1.3;
    } else {
      // Gentle breathing in idle
      const breath = Math.sin(time * 1.5) * 0.2 + 0.8;
      dynamicLights.accent.color.setHex(0x6f93b3);
      dynamicLights.accent.intensity = breath;
    }
  }

  // Rim light color shift
  if (dynamicLights.rim) {
    if (isSpeaking) {
      dynamicLights.rim.color.setHex(0xffaa55);
      dynamicLights.rim.intensity = 1.0;
    } else {
      dynamicLights.rim.color.setHex(0x8fb8e8);
      dynamicLights.rim.intensity = 0.8;
    }
  }

  // Subtle key light breathing
  if (dynamicLights.key) {
    const keyBreath = Math.sin(time * 0.8) * 0.1 + 2.2;
    dynamicLights.key.intensity = keyBreath;
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
    accent: null,
    mouseLight: null,
  };

  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);
}
