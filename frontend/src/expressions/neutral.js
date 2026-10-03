/* =========================================================================
   NEUTRAL EXPRESSION  –  Natural, relaxed baseline resting face
   Mouth completely closed, relaxed brows, natural gaze, organic breathing.
   ========================================================================= */

export const name = 'neutral';
export const label = 'Neutral';
export const icon = '😌';

/**
 * Returns target morphs, head posture, and blush opacity for neutral resting state.
 * @param {number} intensity - 0.0 to 1.0
 * @param {boolean} isSpeaking - whether avatar is currently talking
 */
export function getTargets(intensity = 1.0, isSpeaking = false) {
  return {
    morphs: {
      // All emotion morphs at 0 (completely relaxed)
      Fcl_BRW_Joy: 0.0,
      Fcl_BRW_Fun: 0.0,
      Fcl_BRW_Surprised: 0.0,
      Fcl_BRW_Sorrow: 0.0,
      Fcl_BRW_Angry: 0.0,
      Fcl_EYE_Joy: 0.0,
      Fcl_EYE_Fun: 0.0,
      Fcl_EYE_Surprised: 0.0,
      Fcl_EYE_Spread: 0.0,
      Fcl_EYE_Sorrow: 0.0,
      Fcl_EYE_Angry: 0.0,
      Fcl_MTH_Joy: 0.0,
      Fcl_MTH_Up: 0.0,
      Fcl_MTH_Down: 0.0,
      Fcl_MTH_Small: 0.0,
    },
    head: {
      basePitch: 0.0,
      baseRoll: 0.0,
      nodStrength: 0.008,
      tiltStrength: 0.005,
    },
    blush: 0.0,
  };
}
