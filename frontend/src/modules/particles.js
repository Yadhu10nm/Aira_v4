/* =========================================================================
   PARTICLES  –  Static floating particle system

   Creates ambient particles that:
   - Float naturally with Perlin-like motion
   - Change color/intensity based on avatar state
   - Respond to speaking with pulse effects
   - NO mouse interaction
   ========================================================================= */

import * as THREE from 'three';

let particleSystem = null;
let particles = [];

const PARTICLE_COUNT = 150;
const PARTICLE_SIZE = 0.015;

/**
 * Initialize the particle system
 */
export function initParticles(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);

  // Initialize particle data
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particle = {
      // Position
      x: (Math.random() - 0.5) * 6,
      y: Math.random() * 4 - 0.5,
      z: (Math.random() - 0.5) * 4,

      // Velocity
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.01,
      vz: (Math.random() - 0.5) * 0.02,

      // Noise offset for organic motion
      noiseOffsetX: Math.random() * 100,
      noiseOffsetY: Math.random() * 100,
      noiseOffsetZ: Math.random() * 100,

      // Base color (cyan-blue palette)
      baseColor: new THREE.Color().setHSL(
        0.5 + Math.random() * 0.15, // Hue: cyan-blue
        0.6 + Math.random() * 0.3,   // Saturation
        0.5 + Math.random() * 0.3    // Lightness
      ),

      // Size variation
      baseSize: PARTICLE_SIZE * (0.5 + Math.random() * 1.5),
      pulseOffset: Math.random() * Math.PI * 2,
    };

    particles.push(particle);

    // Set initial positions
    positions[i * 3] = particle.x;
    positions[i * 3 + 1] = particle.y;
    positions[i * 3 + 2] = particle.z;

    // Set colors
    colors[i * 3] = particle.baseColor.r;
    colors[i * 3 + 1] = particle.baseColor.g;
    colors[i * 3 + 2] = particle.baseColor.b;

    // Set sizes
    sizes[i] = particle.baseSize;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Particle material with glow
  const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    map: createParticleTexture(),
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);

  // NO mouse tracking
}

/**
 * Create a circular glow texture for particles
 */
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Simple noise function for organic motion
 */
function noise(x) {
  return Math.sin(x) * 0.5 + Math.sin(x * 2.3) * 0.25 + Math.sin(x * 4.7) * 0.125;
}

/**
 * Update particles each frame
 * @param {number} time - Current time
 * @param {number} delta - Delta time
 * @param {string} state - Current app state ('idle', 'listening', 'speaking')
 */
export function updateParticles(time, delta, state = 'idle') {
  if (!particleSystem) return;

  // NO mouse position updates

  const positions = particleSystem.geometry.attributes.position.array;
  const colors = particleSystem.geometry.attributes.color.array;
  const sizes = particleSystem.geometry.attributes.size.array;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Organic noise-based motion
    const noiseSpeed = 0.3;
    const noiseX = noise((p.noiseOffsetX + time * noiseSpeed) * 0.5);
    const noiseY = noise((p.noiseOffsetY + time * noiseSpeed) * 0.4);
    const noiseZ = noise((p.noiseOffsetZ + time * noiseSpeed) * 0.45);

    // Apply noise to velocity
    p.vx += noiseX * 0.0003;
    p.vy += noiseY * 0.0002;
    p.vz += noiseZ * 0.0003;

    // NO mouse interaction

    // Apply velocity
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;

    // Damping
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.vz *= 0.98;

    // Boundary wrapping
    if (p.x > 3) p.x = -3;
    if (p.x < -3) p.x = 3;
    if (p.y > 2.5) p.y = -0.5;
    if (p.y < -0.5) p.y = 2.5;
    if (p.z > 2) p.z = -2;
    if (p.z < -2) p.z = 2;

    // Update positions
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;

    // Permanent cyan/blue color for all states
    let targetColor = new THREE.Color().setHSL(0.52, 0.7, 0.6); // Bright cyan

    colors[i * 3] = targetColor.r;
    colors[i * 3 + 1] = targetColor.g;
    colors[i * 3 + 2] = targetColor.b;

    // Consistent size (no state-based changes)
    let targetSize = p.baseSize * 1.2;

    sizes[i] = targetSize;
  }

  particleSystem.geometry.attributes.position.needsUpdate = true;
  particleSystem.geometry.attributes.color.needsUpdate = true;
  particleSystem.geometry.attributes.size.needsUpdate = true;
}

/**
 * Clean up particle system
 */
export function disposeParticles(scene) {
  if (particleSystem) {
    scene.remove(particleSystem);
    particleSystem.geometry.dispose();
    particleSystem.material.dispose();
    if (particleSystem.material.map) {
      particleSystem.material.map.dispose();
    }
    particleSystem = null;
  }
  particles = [];

  // No event listeners to remove
}
