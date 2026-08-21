/* =========================================================================
   POSE  –  bone name lists, rest pose, hand-shape helpers
   ========================================================================= */

export const D = Math.PI / 180;

// ── Finger enumeration ────────────────────────────────────────────────────
const FINGER_SEGMENTS_4 = ['Proximal', 'Intermediate', 'Distal'];
const FINGERS_4 = ['Index', 'Middle', 'Ring', 'Little'];

export function fingerBoneNames(side) {
  const names = [
    `${side}ThumbMetacarpal`,
    `${side}ThumbProximal`,
    `${side}ThumbDistal`,
  ];
  for (const f of FINGERS_4)
    for (const seg of FINGER_SEGMENTS_4)
      names.push(`${side}${f}${seg}`);
  return names;
}

export const TRACKED_BONES = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'leftEye', 'rightEye',
  'leftShoulder',  'leftUpperArm',  'leftLowerArm',  'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg',  'leftLowerLeg',  'leftFoot',  'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
  ...fingerBoneNames('left'),
  ...fingerBoneNames('right'),
];

// ── Hand shape helper ─────────────────────────────────────────────────────
const CURL_DEG = { Proximal: 55, Intermediate: 75, Distal: 55 };

export function applyHandShape(target, side, shape) {
  for (const f of FINGERS_4) {
    for (const seg of FINGER_SEGMENTS_4) {
      target[`${side}${f}${seg}`] = [CURL_DEG[seg] * shape.curl, 0, 0];
    }
  }
  const tc = shape.thumbCurl ?? 0.1;
  const to = shape.thumbOut  ?? 0.3;
  const outSign = side === 'left' ? -1 : 1;
  target[`${side}ThumbMetacarpal`] = [40 * tc, 0, outSign * 55 * to];
  target[`${side}ThumbProximal`]   = [35 * tc, 0, 0];
  target[`${side}ThumbDistal`]     = [30 * tc, 0, 0];
}

// ── Rest pose ─────────────────────────────────────────────────────────────
const RELAXED_HAND = { curl: 0.15, thumbCurl: 0.1, thumbOut: 0.2 };

export const REST = {
  hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], upperChest: [0, 0, 0],
  neck: [0, 0, 0], head: [0, 0, 0], leftEye: [0, 0, 0], rightEye: [0, 0, 0],

  leftShoulder:  [0, 0,   5], leftUpperArm:  [0, 0, -65], leftLowerArm:  [10, 0, 0], leftHand:  [0, 0, 0],
  rightShoulder: [0, 0,  -5], rightUpperArm: [0, 0,  65], rightLowerArm: [10, 0, 0], rightHand: [0, 0, 0],

  leftUpperLeg:  [0, 0, 0], leftLowerLeg:  [0, 0, 0], leftFoot:  [0, 0, 0], leftToes:  [0, 0, 0],
  rightUpperLeg: [0, 0, 0], rightLowerLeg: [0, 0, 0], rightFoot: [0, 0, 0], rightToes: [0, 0, 0],
};
applyHandShape(REST, 'left',  RELAXED_HAND);
applyHandShape(REST, 'right', RELAXED_HAND);
