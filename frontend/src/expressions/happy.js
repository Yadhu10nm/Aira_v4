/* =========================================================================
   JOY / HAPPY EXPRESSION  –  High-energy celebratory cheer
   High enthusiastic brows, laughing crescent closed eyes, lively head nods.
   ========================================================================= */

export const name = 'happy';
export const label = 'Joy / Happy';
export const icon = '😆';

/**
 * Returns target morphs, head posture, and blush opacity for happy.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 0.90, isSpeaking = false) {
  const scaled = Math.max(0.1, Math.min(1.0, intensity));

  return {
    morphs: {
      Fcl_BRW_Joy: 0.70 * scaled,
      Fcl_EYE_Joy: 0.65 * scaled,
      Fcl_MTH_Joy: isSpeaking ? 0.0 : 0.65 * scaled,
      Fcl_MTH_Up: isSpeaking ? 0.0 : 0.22 * scaled,
    },
    head: {
      basePitch: 0.02 * scaled,
      baseRoll: 0.018 * scaled,
      nodStrength: 0.035,
      tiltStrength: 0.018,
    },
    blush: 0.0,
  };
}
