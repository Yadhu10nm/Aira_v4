/* =========================================================================
   SAD / EMPATHETIC EXPRESSION  –  Soft, compassionate empathy
   Inward angled sorrowful brows, soft empathetic eyes, subtle head drop.
   ========================================================================= */

export const name = 'sad';
export const label = 'Sad / Empathetic';
export const icon = '😢';

/**
 * Returns target morphs, head posture, and blush opacity for sad.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 0.85, isSpeaking = false) {
  const scaled = Math.max(0.1, Math.min(1.0, intensity));

  return {
    morphs: {
      Fcl_BRW_Sorrow: 0.80 * scaled,
      Fcl_EYE_Sorrow: 0.70 * scaled,
      Fcl_MTH_Down: isSpeaking ? 0.0 : 0.18 * scaled,
    },
    head: {
      basePitch: 0.032 * scaled,
      baseRoll: 0.010 * scaled,
      nodStrength: 0.012,
      tiltStrength: 0.012,
    },
    blush: 0.0,
  };
}
