/* =========================================================================
   EXPRESSION  –  drives VRM morph targets for lip sync + blink

   Writes to the standard VRM preset names (aa/ih/ou/ee/oh) AND custom clips
   via Three-VRM's ExpressionManager, keeping mouth deformation clean and
   free of morph conflicts.

   Smoothing
   ─────────
   Uses asymmetric attack/release rates: mouth shapes snap open faster than
   they close, mimicking natural speech coarticulation. A dead-zone prevents
   micro-fluctuations at the silent floor.
   ========================================================================= */

const VISEME_PRESET = { A: 'aa', I: 'ih', U: 'ou', E: 'ee', O: 'oh' };
const VISEME_CUSTOM = {
  A: 'Fcl_MTH_A', I: 'Fcl_MTH_I', U: 'Fcl_MTH_U',
  E: 'Fcl_MTH_E', O: 'Fcl_MTH_O',
};

// Module-level VRM reference – set once the model is loaded.
let _vrm = null;

export function setVRM(vrm) {
  _vrm = vrm;
}

function trySetExpression(name, weight) {
  if (!_vrm?.expressionManager?.expressionMap) return;
  if (!(name in _vrm.expressionManager.expressionMap)) return;
  try {
    _vrm.expressionManager.setValue(name, weight);
  } catch {
    /* ignore */
  }
}

// Smoothed mouth state – persists between frames.
export const currentMouth = { A: 0, I: 0, U: 0, E: 0, O: 0, blink: 0 };

/**
 * Drive the avatar's mouth + blink toward `targetWeights` with asymmetric
 * exponential smoothing.
 *
 * Attack (opening) is faster than release (closing), which makes the mouth
 * read as articulate speech rather than sluggish morphing. A tiny floor
 * threshold prevents floating-point residue from accumulating.
 *
 * @param {Object} targetWeights – Desired weights for each viseme + blink
 * @param {number} dampF         – Base smoothing factor (0–1, higher = snappier)
 */
export function applyMouth(targetWeights, dampF) {
  for (const k of ['A', 'I', 'U', 'E', 'O', 'blink']) {
    const target  = targetWeights[k] || 0;
    const current = currentMouth[k];
    const diff    = target - current;

    // Asymmetric rate: opening (diff > 0) uses dampF, closing uses a
    // slower rate so the mouth lingers naturally between visemes.
    const rate = diff > 0 ? dampF : dampF * 0.50;

    currentMouth[k] += diff * rate;

    // Floor to avoid imperceptible micro-motion that wastes GPU cycles
    if (currentMouth[k] < 0.0005) currentMouth[k] = 0;
  }

  // ── Write to VRM expression manager ─────────────────────────────────────
  for (const k of ['A', 'I', 'U', 'E', 'O']) {
    trySetExpression(VISEME_PRESET[k], currentMouth[k]);
    trySetExpression(VISEME_CUSTOM[k], currentMouth[k]);
  }
  trySetExpression('blink', currentMouth.blink);
}
