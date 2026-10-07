/* =========================================================================
   ANIMATION  –  Organic breathing, variable/double blinking, eye saccades,
                 and listening attention posture
   ========================================================================= */

// ── Organic Multi-Frequency Breathing & Posture Sway ──────────────────────
// Layered non-periodic sine waves (irrational frequencies) prevent mechanical repetition.
export function applyIdleSway(target, time) {
  // Pelvis / Hips weight shifting: primary sway + slow secondary breathing drift
  const hipRoll  = Math.sin(time * 0.37 + 0.4) * 0.7 + Math.sin(time * 0.19) * 0.3;
  const hipPitch = Math.sin(time * 0.43) * 0.4;
  const hipYaw   = Math.sin(time * 0.29 + 1.2) * 0.5;
  target.hips = [hipPitch, hipYaw, hipRoll];

  // Chest & Spine ribcage expansion with asymmetrical breath cycle (inhalation faster than exhalation)
  const breathCycle = (Math.sin(time * 0.85) + 0.3 * Math.sin(time * 1.70 + 0.5)) * 1.2;
  target.chest = [breathCycle, 0, Math.sin(time * 0.31) * 0.3];
}

// ── Organic Blinking (Natural intervals, double-blinking, variable speed) ──
let nextBlinkAt = 1.8 + Math.random() * 2.5;
let blinkStart = null;
let currentBlinkDuration = 0.20;
let isDoubleBlink = false;
let doubleBlinkSecondFired = false;

export function updateBlink(time) {
  if (blinkStart === null && time >= nextBlinkAt) {
    blinkStart = time;
    // 15% probability of a human micro double-blink
    isDoubleBlink = Math.random() < 0.15;
    doubleBlinkSecondFired = false;
    currentBlinkDuration = 0.18 + Math.random() * 0.08;
  }
  if (blinkStart === null) return 0;

  const bt = time - blinkStart;

  // Single blink or first phase of double blink
  if (bt < currentBlinkDuration) {
    const phase = bt / currentBlinkDuration;
    // Quick down (35%), gentle release (65%)
    return phase < 0.35 ? phase / 0.35 : 1 - (phase - 0.35) / 0.65;
  }

  // Handle double-blink second eyelid drop
  if (isDoubleBlink && !doubleBlinkSecondFired) {
    const pauseAfterFirst = 0.08;
    if (bt < currentBlinkDuration + pauseAfterFirst) {
      return 0; // Short eye-open pause
    }
    const secondBlinkDuration = 0.16;
    const bt2 = bt - (currentBlinkDuration + pauseAfterFirst);
    if (bt2 < secondBlinkDuration) {
      const phase = bt2 / secondBlinkDuration;
      return phase < 0.35 ? phase / 0.35 : 1 - (phase - 0.35) / 0.65;
    }
    doubleBlinkSecondFired = true;
  }

  // Blink cycle finished: schedule next organic interval (2.5 to 5.5s)
  blinkStart = null;
  nextBlinkAt = time + 2.2 + Math.random() * 3.3;
  return 0;
}

// ── Eye Saccades & Attention Tracking ─────────────────────────────────────
// Human eyes do not stay frozen; they perform tiny rapid micro-saccades and fixation drifts.
let currentEyeGaze = { x: 0, y: 0 };
let targetEyeGaze = { x: 0, y: 0 };
let nextSaccadeAt = 0;

export function updateEyeGaze(time, delta, isListening = false) {
  if (time >= nextSaccadeAt) {
    if (isListening) {
      // Attentive listening: focused near camera/user with slight micro-saccades
      targetEyeGaze.x = (Math.random() - 0.5) * 0.12;
      targetEyeGaze.y = (Math.random() - 0.5) * 0.08;
      nextSaccadeAt = time + 0.8 + Math.random() * 1.4;
    } else {
      // Natural resting drift / occasional glancing away
      const lookAway = Math.random() < 0.25;
      if (lookAway) {
        targetEyeGaze.x = (Math.random() - 0.5) * 0.45;
        targetEyeGaze.y = (Math.random() - 0.5) * 0.22;
        nextSaccadeAt = time + 0.5 + Math.random() * 0.9;
      } else {
        targetEyeGaze.x = (Math.random() - 0.5) * 0.16;
        targetEyeGaze.y = (Math.random() - 0.5) * 0.10;
        nextSaccadeAt = time + 1.2 + Math.random() * 2.2;
      }
    }
  }

  // Rapid snap for saccades (sharp fast eye motion)
  const gazeDamp = 1.0 - Math.exp(-28 * delta);
  currentEyeGaze.x += (targetEyeGaze.x - currentEyeGaze.x) * gazeDamp;
  currentEyeGaze.y += (targetEyeGaze.y - currentEyeGaze.y) * gazeDamp;

  return currentEyeGaze;
}

// ── Look-around glance for head/attention ─────────────────────────────────
let glanceTarget = { headY: 0, headX: 0, eyeY: 0, eyeX: 0 };
let nextGlanceAt = 0;

export function updateListenGlance(time) {
  if (time >= nextGlanceAt) {
    glanceTarget = {
      headY: (Math.random() - 0.5) * 12,
      headX: (Math.random() - 0.5) * 5,
      eyeY:  (Math.random() - 0.5) * 20,
      eyeX:  (Math.random() - 0.5) * 8,
    };
    nextGlanceAt = time + 1.8 + Math.random() * 2.4;
  }
  return glanceTarget;
}

