/* =========================================================================
   THINKING EXPRESSION  –  Inquisitive, analytical contemplation
   Asymmetrical brow raise, thoughtful gaze, inquisitive side head tilt.
   ========================================================================= */

export const name = 'thinking';
export const label = 'Thinking';
export const icon = '🤔';

/**
 * Returns target morphs, head posture, and blush opacity for thinking.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 0.85, isSpeaking = false) {
  const scaled = Math.max(0.1, Math.min(1.0, intensity));

  return {
    morphs: {
      Fcl_BRW_Surprised: 0.55 * scaled,
      Fcl_BRW_Fun: 0.20 * scaled,
      Fcl_MTH_Small: isSpeaking ? 0.0 : 0.18 * scaled,
    },
    head: {
      basePitch: 0.012 * scaled,
      baseRoll: 0.042 * scaled,
      nodStrength: 0.010,
      tiltStrength: 0.035,
    },
    blush: 0.0,
  };
}
