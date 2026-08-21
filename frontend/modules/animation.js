/* =========================================================================
   ANIMATION  –  breathing/idle sway, randomised blink, look-around glance
   ========================================================================= */

// ── Breathing / idle sway ─────────────────────────────────────────────────
// Always running regardless of state – gives the avatar life at zero cost.
export function applyIdleSway(target, time) {
  target.hips  = [Math.sin(time * 0.33 + 1) * 0.8, 0, Math.sin(time * 0.45) * 1.6];
  target.chest = [Math.sin(time * 0.95) * 1.3, 0, 0];
}

// ── Blink ─────────────────────────────────────────────────────────────────
let nextBlinkAt  = 1.5 + Math.random() * 2.5;
let blinkStart   = null;
const BLINK_DURATION = 0.22;

export function updateBlink(time) {
  if (blinkStart === null && time >= nextBlinkAt) blinkStart = time;
  if (blinkStart === null) return 0;

  const bt = time - blinkStart;
  if (bt >= BLINK_DURATION) {
    blinkStart   = null;
    nextBlinkAt  = time + 2 + Math.random() * 3.5;
    return 0;
  }

  const phase = bt / BLINK_DURATION;
  return phase < 0.4 ? phase / 0.4 : 1 - (phase - 0.4) / 0.6;
}

// ── Look-around glance ────────────────────────────────────────────────────
// Calm drift at all times; livelier directional glances while listening.
let glanceTarget = { headY: 0, headX: 0, eyeY: 0, eyeX: 0 };
let nextGlanceAt = 0;

export function updateListenGlance(time) {
  if (time >= nextGlanceAt) {
    glanceTarget = {
      headY: (Math.random() - 0.5) * 16,
      headX: (Math.random() - 0.5) * 6,
      eyeY:  (Math.random() - 0.5) * 24,
      eyeX:  (Math.random() - 0.5) * 10,
    };
    nextGlanceAt = time + 1.6 + Math.random() * 2.2;
  }
  return glanceTarget;
}
