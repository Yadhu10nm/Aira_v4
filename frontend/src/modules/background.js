/* =========================================================================
   BACKGROUND  –  Interactive animated background

   Creates a dynamic background with:
   - Animated gradient meshes
   - Mouse-reactive ripple effects
   - State-based color transitions
   - Depth and parallax layers
   ========================================================================= */

import * as THREE from 'three';

let backgroundMesh = null;
let backgroundRipples = [];
let mousePos = new THREE.Vector2(0, 0);
let targetMousePos = new THREE.Vector2(0, 0);

/**
 * Initialize interactive background
 */
export function initBackground(scene) {
  // Create gradient plane
  const geometry = new THREE.PlaneGeometry(20, 20, 32, 32);

  // Custom shader for animated gradient
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      mousePos: { value: new THREE.Vector2(0, 0) },
      color1: { value: new THREE.Color(0x0a0a1e) }, // Deep blue
      color2: { value: new THREE.Color(0x1a1a3e) }, // Mid blue
      color3: { value: new THREE.Color(0x2d1b4e) }, // Purple accent
      stateColor: { value: new THREE.Color(0x0a0a1e) },
      stateIntensity: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      uniform float time;
      uniform vec2 mousePos;

      void main() {
        vUv = uv;
        vPosition = position;

        // Subtle wave motion
        vec3 pos = position;
        pos.z += sin(pos.x * 0.5 + time * 0.3) * 0.1;
        pos.z += cos(pos.y * 0.4 + time * 0.25) * 0.1;

        // Mouse interaction displacement
        float dist = distance(uv, mousePos * 0.5 + 0.5);
        pos.z += smoothstep(0.5, 0.0, dist) * 0.3;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      uniform float time;
      uniform vec2 mousePos;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 color3;
      uniform vec3 stateColor;
      uniform float stateIntensity;

      // Noise function
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        // Radial gradient from center
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);

        // Time-based animation
        float wave1 = sin(vUv.x * 3.0 + time * 0.2) * 0.5 + 0.5;
        float wave2 = cos(vUv.y * 2.5 + time * 0.15) * 0.5 + 0.5;

        // Mix colors
        vec3 color = mix(color1, color2, dist * 1.2);
        color = mix(color, color3, wave1 * wave2 * 0.3);

        // Mouse interaction glow
        float mouseDist = distance(vUv, mousePos * 0.5 + 0.5);
        float mouseGlow = smoothstep(0.4, 0.0, mouseDist);
        color += vec3(0.1, 0.15, 0.3) * mouseGlow;

        // State-based color overlay
        color = mix(color, stateColor, stateIntensity * 0.3);

        // Subtle noise texture
        float n = noise(vUv * 100.0 + time * 0.1) * 0.03;
        color += n;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });

  backgroundMesh = new THREE.Mesh(geometry, material);
  backgroundMesh.position.z = -3;
  backgroundMesh.renderOrder = -1;
  scene.add(backgroundMesh);

  // Mouse tracking
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove);
  window.addEventListener('click', onMouseClick);
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

function onMouseClick(event) {
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = -(event.clientY / window.innerHeight) * 2 + 1;

  createRipple(x, y);
}

/**
 * Create a ripple effect at the given position
 */
function createRipple(x, y) {
  const ripple = {
    x,
    y,
    radius: 0,
    maxRadius: 2,
    speed: 2,
    life: 1,
  };
  backgroundRipples.push(ripple);
}

/**
 * Update background effects
 */
export function updateBackground(time, delta, state = 'idle') {
  if (!backgroundMesh) return;

  // Smooth mouse position
  mousePos.lerp(targetMousePos, 0.05);

  // Update shader uniforms
  backgroundMesh.material.uniforms.time.value = time;
  backgroundMesh.material.uniforms.mousePos.value.copy(mousePos);

  // State-based color transitions
  const stateColors = {
    idle: new THREE.Color(0x0a0a1e),
    listening: new THREE.Color(0x1a3a5e),
    speaking: new THREE.Color(0x4e2a1a),
  };

  const targetColor = stateColors[state] || stateColors.idle;
  const targetIntensity = state === 'idle' ? 0 : 0.5;

  backgroundMesh.material.uniforms.stateColor.value.lerp(targetColor, 0.05);
  backgroundMesh.material.uniforms.stateIntensity.value +=
    (targetIntensity - backgroundMesh.material.uniforms.stateIntensity.value) * 0.05;

  // Update ripples
  for (let i = backgroundRipples.length - 1; i >= 0; i--) {
    const ripple = backgroundRipples[i];
    ripple.radius += ripple.speed * delta;
    ripple.life -= delta * 0.5;

    if (ripple.life <= 0) {
      backgroundRipples.splice(i, 1);
    }
  }
}

/**
 * Clean up background
 */
export function disposeBackground(scene) {
  if (backgroundMesh) {
    scene.remove(backgroundMesh);
    backgroundMesh.geometry.dispose();
    backgroundMesh.material.dispose();
    backgroundMesh = null;
  }
  backgroundRipples = [];

  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('click', onMouseClick);
}
