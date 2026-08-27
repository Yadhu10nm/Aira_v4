/* =========================================================================
   HAIR  –  Spring-damper secondary motion driven by head movement

   Each hair bone stores a spring-damper state instead of playing a
   time-based wave.  Hair reacts to the head's angular velocity and
   naturally settles when the head is still.
   ========================================================================= */

import * as THREE from "three";

// ── Tunables ──────────────────────────────────────────────────────────────
const STIFFNESS_BASE   = 55;   // Base spring stiffness (higher = snappier)
const DAMPING          = 11;   // Near-critical damping; no jitter
const HEAD_INFLUENCE   = 4.5;  // Frames of effective delay at the root
const INFLUENCE_GROWTH = 2.0;  // Extra delay per chain segment → tip lags more
const STIFFNESS_DECAY  = 0.3;  // Stiffness reduction per segment (tip is looser)

// ── Per-bone state ────────────────────────────────────────────────────────
let hairBones = [];
let hairMeta  = new Map();  // uuid → { restQ, vel, off, stiffness, influence }

let headBone  = null;
let prevHeadQ = new THREE.Quaternion();

// Reusable scratch objects (avoid GC pressure in the hot loop)
const _euler  = new THREE.Euler();
const _headD  = new THREE.Quaternion();
const _offQ   = new THREE.Quaternion();

/* =========================================================================
   INIT
   Called once after the VRM is loaded.
   ========================================================================= */
export function initHair(vrm) {
  hairBones = [];
  hairMeta.clear();

  // Reference bone to track head movement
  headBone = vrm.humanoid?.getNormalizedBoneNode("head");
  if (headBone) {
    prevHeadQ.copy(headBone.quaternion);
  }

  // ── Group bones by strand and sort by segment ───────────────────────────
  const strandMap = new Map();  // strandIndex → { bone, segment }[]

  vrm.scene.traverse((obj) => {
    if (!obj.isBone) return;
    const m = obj.name.match(/^J_Sec_Hair(\d+)_(\d+)$/);
    if (!m) return;

    const strand  = parseInt(m[1], 10);
    const segment = parseInt(m[2], 10);

    if (!strandMap.has(strand)) strandMap.set(strand, []);
    strandMap.get(strand).push({ bone: obj, segment });
  });

  // Build metadata with per-strand chain index
  for (const chain of strandMap.values()) {
    chain.sort((a, b) => a.segment - b.segment);

    chain.forEach(({ bone }, idx) => {
      const stiffness = STIFFNESS_BASE / (1 + idx * STIFFNESS_DECAY);
      const influence = HEAD_INFLUENCE * (1 + idx * INFLUENCE_GROWTH);

      hairBones.push(bone);

      hairMeta.set(bone.uuid, {
        restQ: bone.quaternion.clone(),
        vel:   { x: 0, y: 0, z: 0 },
        off:   { x: 0, y: 0, z: 0 },
        stiffness,
        influence,
      });
    });
  }

  console.log(`[Hair] ${hairBones.length} bones across ${strandMap.size} strands`);
}

/* =========================================================================
   UPDATE –  Call every frame with frame delta in seconds.

   The "target" for each bone is proportional to the head's angular
   velocity (per-frame delta).  When the head is still the target falls
   to zero and the spring-damper returns the hair to its rest pose.
   ========================================================================= */
export function updateHair(delta) {
  if (!hairBones.length || delta <= 0) return;

  const dt = Math.min(delta, 1 / 60);

  // ── Head angular velocity (per-frame quaternion delta) ─────────────────
  if (headBone) {
    _headD.copy(headBone.quaternion).multiply(prevHeadQ.clone().invert());
    prevHeadQ.copy(headBone.quaternion);
  } else {
    _headD.identity();
  }

  // Convert to Euler (safe because per-frame delta is always small)
  _euler.setFromQuaternion(_headD);
  const hx = _euler.x;
  const hy = _euler.y;
  const hz = _euler.z;

  // ── Update each bone's spring-damper ───────────────────────────────────
  for (const bone of hairBones) {
    const meta = hairMeta.get(bone.uuid);
    if (!meta) continue;

    const { restQ, vel, off, stiffness, influence } = meta;

    // Target: opposite of head movement (hair lags behind)
    const tx = -hx * influence;
    const ty = -hy * influence * 0.35;  // twist (Y) has less visible effect
    const tz = -hz * influence;

    // Spring–damper acceleration
    const ax = stiffness * (tx - off.x) - DAMPING * vel.x;
    const ay = stiffness * (ty - off.y) - DAMPING * vel.y;
    const az = stiffness * (tz - off.z) - DAMPING * vel.z;

    // Semi-implicit Euler integration
    vel.x += ax * dt;
    vel.y += ay * dt;
    vel.z += az * dt;

    off.x += vel.x * dt;
    off.y += vel.y * dt;
    off.z += vel.z * dt;

    // Compose: offset * rest → applied on top of the neutral pose
    _euler.set(off.x, off.y, off.z);
    _offQ.setFromEuler(_euler);
    bone.quaternion.copy(restQ).premultiply(_offQ);
  }
}
