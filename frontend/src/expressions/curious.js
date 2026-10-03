/* =========================================================================
   CURIOUS EXPRESSION  –  Inquisitive, playful intrigue
   One raised playful brow, intrigued gaze, playful head cock.
   ========================================================================= */

export const name = 'curious';
export const label = 'Curious';
export const icon = '😏';

/**
 * Returns target morphs, head posture, and blush opacity for curious.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 0.85, isSpeaking = false) {
  const scaled = Math.max(0.1, Math.min(1.0, intensity));

  return {
    morphs: {
      Fcl_BRW_Fun: 0.55 * scaled,
      Fcl_EYE_Fun: 0.40 * scaled,
      Fcl_MTH_Up: isSpeaking ? 0.0 : 0.16 * scaled,
    },
    head: {
      basePitch: 0.012 * scaled,
      baseRoll: 0.035 * scaled,
      nodStrength: 0.015,
      tiltStrength: 0.025,
    },
    blush: 0.0,
  };
}
