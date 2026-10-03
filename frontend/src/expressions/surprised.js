/* =========================================================================
   SURPRISED EXPRESSION  –  Wide expressive anime astonishment
   Wide open anime eyes, high arched brows, slight backward head reaction.
   ========================================================================= */

export const name = 'surprised';
export const label = 'Surprised';
export const icon = '😲';

/**
 * Returns target morphs, head posture, and blush opacity for surprised.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 0.90, isSpeaking = false) {
  const scaled = Math.max(0.1, Math.min(1.0, intensity));

  return {
    morphs: {
      Fcl_BRW_Surprised: 0.85 * scaled,
      Fcl_EYE_Spread: 0.75 * scaled,
      Fcl_EYE_Surprised: 0.60 * scaled,
    },
    head: {
      basePitch: -0.035 * scaled,
      baseRoll: 0.0,
      nodStrength: 0.035,
      tiltStrength: 0.010,
    },
    blush: 0.0,
  };
}
