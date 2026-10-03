/* =========================================================================
   ANGRY EXPRESSION  –  Determined, focused, assertive expression
   Downward angled furrowed brows, sharp piercing gaze, assertive forward posture.
   ========================================================================= */

export const name = 'angry';
export const label = 'Angry';
export const icon = '😠';

/**
 * Returns target morphs, head posture, and blush opacity for angry.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 0.90, isSpeaking = false) {
  const scaled = Math.max(0.1, Math.min(1.0, intensity));

  return {
    morphs: {
      Fcl_BRW_Angry: 0.85 * scaled,
      Fcl_EYE_Angry: 0.75 * scaled,
      Fcl_MTH_Down: isSpeaking ? 0.0 : 0.14 * scaled,
    },
    head: {
      basePitch: 0.02 * scaled,
      baseRoll: -0.012 * scaled,
      nodStrength: 0.025,
      tiltStrength: 0.010,
    },
    blush: 0.0,
  };
}
