/* =========================================================================
   SMILE EXPRESSION  –  Warm, charming anime smile
   Crescent smiling eyes, gentle brow lift, subtle corner lift, mouth closed at rest.
   ========================================================================= */

export const name = 'smile';
export const label = 'Smile';
export const icon = '😊';

/**
 * Returns target morphs, head posture, and blush opacity for smile.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 0.85, isSpeaking = false) {
  const scaled = Math.max(0.1, Math.min(1.0, intensity));

  return {
    morphs: {
      Fcl_EYE_Joy: 0.38 * scaled,
      Fcl_BRW_Joy: 0.25 * scaled,
      Fcl_MTH_Joy: isSpeaking ? 0.0 : 0.65 * scaled,
      Fcl_MTH_Up: isSpeaking ? 0.0 : 0.16 * scaled,
    },
    head: {
      basePitch: 0.012 * scaled,
      baseRoll: 0.015 * scaled,
      nodStrength: 0.022,
      tiltStrength: 0.015,
    },
    blush: 0.0,
  };
}
