/* =========================================================================
   BLUSHING EXPRESSION  –  Bashful, shy anime blush
   Soft crescent eyes, joyful brow lift, soft shy head tilt & procedural pink cheeks.
   ========================================================================= */

export const name = 'blush';
export const label = 'Blushing';
export const icon = '😳';

/**
 * Returns target morphs, head posture, and blush opacity for blush.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 0.90, isSpeaking = false) {
  const scaled = Math.max(0.1, Math.min(1.0, intensity));

  return {
    morphs: {
      Fcl_EYE_Joy: 0.45 * scaled,
      Fcl_BRW_Joy: 0.35 * scaled,
      Fcl_MTH_Up: isSpeaking ? 0.0 : 0.14 * scaled,
    },
    head: {
      basePitch: 0.02 * scaled,
      baseRoll: 0.035 * scaled,
      nodStrength: 0.016,
      tiltStrength: 0.028,
    },
    blush: 0.88 * scaled,
  };
}
