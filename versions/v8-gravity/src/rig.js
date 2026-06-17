// Kata fighter rig: an organic, continuously-skinned body. The trunk and
// limbs are lofted profile surfaces (NURBS-like cross-section sweeps) merged
// into a single SkinnedMesh deformed by a real bone skeleton - no segment
// seams, no balloon joints. Skin and cloth are procedural texture maps.
// Wrists and ankles are articulated so techniques read exactly: the fist
// rotates over on a cross, toes point through a roundhouse, the teep pushes
// through the ball of the foot.

import * as THREE from "../../../vendor/three.module.min.js";

const JOINTS = [
  "spine", "chest", "neck", "head",
  "shL", "elL", "wrL", "shR", "elR", "wrR",
  "hipL", "kneeL", "ankL", "hipR", "kneeR", "ankR"
];

const Z3 = [0, 0, 0];

const STANCE = {
  spine: [0.06, 0, 0], chest: [0.04, 0.45, 0], neck: [-0.06, -0.28, 0], head: Z3,
  shL: [-0.55, 0, -0.12], elL: [-1.85, 0, 0], wrL: [-0.2, 0, 0.1],
  shR: [-0.35, 0, 0.18], elR: [-2.1, 0, 0], wrR: [-0.25, 0, -0.1],
  hipL: [-0.22, 0, -0.05], kneeL: [0.3, 0, 0], ankL: [-0.08, 0, 0],
  hipR: [0.14, 0, 0.05], kneeR: [0.28, 0, 0], ankR: [-0.04, 0, 0],
  root: [0, -0.06, 0, 0.04, 0, 0]
};

const STANCE_FLAVOR = {
  daichi: {},
  suyin: { shL: [-0.7, 0, -0.2], elL: [-2.0, 0, 0], root: [0, -0.04, 0, 0.02, 0, 0] },
  renzo: { chest: [0.06, 0.6, 0], shR: [-0.25, 0, 0.3], elR: [-2.3, 0, 0], neck: [0.08, -0.35, 0] },
  lobo: {
    root: [0, -0.12, 0, 0.1, 0, 0], chest: [0.1, 0.15, 0],
    shL: [-0.8, 0.3, -0.35], elL: [-1.2, 0, 0], shR: [-0.8, -0.3, 0.35], elR: [-1.2, 0, 0],
    hipL: [-0.3, 0, -0.14], kneeL: [0.45, 0, 0], hipR: [0.2, 0, 0.14], kneeR: [0.4, 0, 0]
  },
  akane: {
    chest: [0.02, 0.7, 0], root: [0, -0.02, 0, 0, 0, 0],
    shL: [-0.45, 0.2, -0.1], elL: [-1.3, 0, 0], wrL: [0.3, 0, 0], shR: [-0.2, 0, 0.2], elR: [-1.6, 0, 0], wrR: [0.3, 0, 0],
    hipR: [0.18, 0, 0.05], kneeR: [0.2, 0, 0]
  },
  bastion: {
    root: [0, -0.07, 0, 0.06, 0, 0], chest: [0.08, 0.2, 0], neck: [0.18, -0.15, 0],
    shL: [-1.0, 0, -0.3], elL: [-2.5, 0, 0], shR: [-0.9, 0, 0.3], elR: [-2.5, 0, 0]
  },
  decha: {
    root: [0, -0.04, 0, 0.06, 0, 0], chest: [0.06, 0.3, 0],
    shL: [-0.95, 0, -0.15], elL: [-2.2, 0, 0], shR: [-0.85, 0, 0.2], elR: [-2.25, 0, 0],
    hipL: [-0.26, 0, -0.05], kneeL: [0.34, 0, 0]
  },
  marisol: {
    root: [0, -0.1, 0, 0.06, 0, 0.04], chest: [0.08, 0.55, 0],
    shL: [-0.5, 0.25, -0.3], elL: [-1.1, 0, 0], wrL: [0.4, 0, 0], shR: [-0.35, -0.2, 0.3], elR: [-1.2, 0, 0], wrR: [0.4, 0, 0],
    hipL: [-0.3, 0, -0.1], kneeL: [0.5, 0, 0], hipR: [0.22, 0, 0.1], kneeR: [0.45, 0, 0]
  }
};

// Three-phase technique poses: chamber -> extend -> follow-through.
// Anatomy notes are deliberate: these are checked against how the techniques
// are actually taught.
const MOVE_POSES = {
  LH: { // lead straight: chin tucked, lead shoulder covers the jaw, fist turns over
    chamber: { shL: [-0.4, 0, -0.1], elL: [-2.2, 0, 0], chest: [0.04, 0.55, 0], neck: [0.1, -0.3, 0] },
    extend: { shL: [-1.38, 0.12, -0.18], elL: [-0.12, 0, 0], wrL: [0, 0, -0.95], chest: [0, -0.2, 0], spine: [0.05, -0.12, 0], neck: [0.12, -0.1, 0], root: [0, -0.05, 0.22, 0.08, 0, 0] },
    follow: { shL: [-1.1, 0.3, 0.05], elL: [-0.6, 0, 0], wrL: [-0.1, 0, -0.4], chest: [0.04, -0.05, 0], root: [0, -0.05, 0.1, 0.05, 0, 0] }
  },
  RH: { // rear straight: hips fire first, rear heel lifts and pivots, shoulder to chin
    chamber: { shR: [-0.2, 0, 0.32], elR: [-2.4, 0, 0], chest: [0.06, 0.7, 0], hipR: [0.18, -0.2, 0.05], neck: [0.12, -0.2, 0] },
    extend: { shR: [-1.48, -0.1, 0.15], elR: [-0.08, 0, 0], wrR: [0, 0, 0.95], chest: [0.05, -0.55, 0], spine: [0.06, -0.25, 0], neck: [0.05, 0.2, 0.06], hipR: [0.1, 0.35, 0.05], ankR: [0.5, 0, 0], root: [0, -0.06, 0.28, 0.1, -0.12, 0] },
    follow: { shR: [-1.2, -0.3, 0.2], elR: [-0.7, 0, 0], wrR: [-0.1, 0, 0.4], chest: [0.08, -0.7, 0], hipR: [0.08, 0.4, 0.05], ankR: [0.3, 0, 0], root: [0, -0.07, 0.16, 0.1, -0.16, 0] }
  },
  LL: { // low kick: shin chops down through the target, support foot turned out
    chamber: { hipL: [-0.55, 0, -0.05], kneeL: [1.6, 0, 0], ankL: [0.45, 0, 0], root: [0, -0.04, 0, -0.04, 0.08, 0], kneeR: [0.4, 0, 0] },
    extend: { hipL: [-0.5, 0.25, -0.15], kneeL: [0.25, 0, 0], ankL: [0.55, 0, 0], chest: [0.04, 0.3, 0], root: [0, -0.06, 0.16, -0.08, 0.22, 0.04], kneeR: [0.45, 0, 0], ankR: [0.15, 0, 0] },
    follow: { hipL: [-0.3, 0.45, -0.2], kneeL: [0.6, 0, 0], chest: [0.06, 0.45, 0], root: [0, -0.08, 0.08, -0.04, 0.3, 0.05] }
  },
  RL: { // roundhouse: chamber across, hip rolls over, toes point through the arc
    chamber: { hipR: [-1.5, 0, 0.08], kneeR: [2.2, 0, 0], ankR: [0.5, 0, 0], chest: [0.04, 0.1, 0], kneeL: [0.15, 0, 0], root: [0, -0.05, 0, -0.06, -0.1, 0] },
    extend: { hipR: [-1.75, -0.3, 0.18], kneeR: [0.15, 0, 0], ankR: [0.6, 0, 0], chest: [0.05, -0.5, 0], neck: [0, 0.2, 0], kneeL: [0.12, 0, 0], ankL: [-0.2, 0, 0], root: [0, -0.03, 0.2, -0.14, -0.35, -0.08] },
    follow: { hipR: [-1.2, -0.5, 0.2], kneeR: [0.9, 0, 0], chest: [0.08, -0.65, 0], kneeL: [0.3, 0, 0], root: [0, -0.06, 0.08, -0.08, -0.5, -0.05] }
  },
  DEF: { // covering shell: forearms vertical, elbows tight, chin buried
    chamber: { shL: [-1.0, 0, -0.25], elL: [-2.4, 0, 0], shR: [-1.0, 0, 0.25], elR: [-2.4, 0, 0], chest: [0.1, 0.1, 0] },
    extend: {
      shL: [-1.3, 0, -0.28], elL: [-2.75, 0, 0], wrL: [-0.3, 0, 0], shR: [-1.3, 0, 0.28], elR: [-2.75, 0, 0], wrR: [-0.3, 0, 0],
      chest: [0.14, 0, 0], neck: [0.34, 0, 0], root: [0, -0.1, 0, 0.08, 0, 0], kneeL: [0.4, 0, 0], kneeR: [0.4, 0, 0]
    },
    follow: {}
  },
  EV: { // tai sabaki: head off the line first, hips carry through
    chamber: { chest: [0.04, 0.6, 0], neck: [0, -0.2, 0.12], root: [0.06, -0.04, 0, 0.04, 0.15, 0] },
    extend: {
      chest: [0.06, 0.9, 0], spine: [0.04, 0.3, 0], neck: [0, -0.5, 0.1],
      shL: [-0.9, 0.4, -0.3], elL: [-1.2, 0, 0], wrL: [0.4, 0, 0], shR: [-1.1, -0.3, 0.4], elR: [-0.8, 0, 0], wrR: [0.4, 0, 0],
      root: [0.22, -0.06, -0.02, 0.06, 0.6, 0.06]
    },
    follow: {}
  },
  GR: { // clinch entry: posture tall, hands fight to the collar, elbows tight
    chamber: { shL: [-0.9, 0.2, -0.15], elL: [-1.6, 0, 0], shR: [-0.9, -0.2, 0.15], elR: [-1.6, 0, 0], root: [0, -0.08, 0, 0.1, 0, 0] },
    extend: {
      shL: [-1.3, 0.25, -0.05], elL: [-0.7, 0, 0], wrL: [-0.5, 0, 0], shR: [-1.3, -0.25, 0.05], elR: [-0.7, 0, 0], wrR: [-0.5, 0, 0],
      chest: [0.16, 0.05, 0], root: [0, -0.1, 0.26, 0.14, 0, 0], kneeL: [0.45, 0, 0], kneeR: [0.45, 0, 0]
    },
    follow: {}
  },
  BR: { // two-hand drive: structure stacked, hips behind the palms
    chamber: { shL: [-0.7, 0.1, -0.1], elL: [-1.9, 0, 0], shR: [-0.7, -0.1, 0.1], elR: [-1.9, 0, 0], chest: [0.08, 0.2, 0] },
    extend: {
      shL: [-1.42, 0.15, 0], elL: [-0.15, 0, 0], wrL: [0.65, 0, 0], shR: [-1.42, -0.15, 0], elR: [-0.15, 0, 0], wrR: [0.65, 0, 0],
      chest: [0.06, 0, 0], root: [0, -0.05, 0.22, 0.1, 0, 0]
    },
    follow: { shL: [-1.2, 0.2, 0], elL: [-0.5, 0, 0], shR: [-1.2, -0.2, 0], elR: [-0.5, 0, 0], root: [0, -0.06, 0.12, 0.08, 0, 0] }
  },
  HB: { // crashing headbutt: crown leads, never the face
    chamber: { neck: [-0.35, 0, 0], chest: [-0.12, 0.1, 0], shL: [-1.0, 0.2, -0.2], elL: [-1.4, 0, 0], shR: [-1.0, -0.2, 0.2], elR: [-1.4, 0, 0], root: [0, -0.04, -0.05, -0.06, 0, 0] },
    extend: {
      neck: [0.6, 0, 0], chest: [0.4, 0, 0], spine: [0.15, 0, 0],
      shL: [-0.9, 0.3, -0.3], elL: [-1.1, 0, 0], shR: [-0.9, -0.3, 0.3], elR: [-1.1, 0, 0],
      root: [0, -0.08, 0.24, 0.18, 0, 0], kneeL: [0.45, 0, 0], kneeR: [0.45, 0, 0]
    },
    follow: { neck: [0.35, 0, 0], chest: [0.28, 0, 0] }
  }
};

// Discipline-specific execution overrides (same intent slot, exact form).
const POSE_FLAVOR = {
  decha: {
    RL: {
      chamber: { hipR: [-1.2, 0, 0.1], kneeR: [1.2, 0, 0], ankR: [0.55, 0, 0] },
      extend: { hipR: [-1.6, -0.45, 0.3], kneeR: [0.35, 0, 0], ankR: [0.65, 0, 0], root: [0, -0.02, 0.2, -0.12, -0.5, -0.1] },
      follow: { hipR: [-1.0, -0.6, 0.3], kneeR: [0.8, 0, 0], root: [0, -0.05, 0.1, -0.06, -0.7, -0.06] }
    },
    BR: { // the teep: knee up the centerline, push through the ball of the foot
      chamber: { hipL: [-1.5, 0, -0.05], kneeL: [1.9, 0, 0], ankL: [-0.3, 0, 0], shL: [-0.8, 0, -0.2], elL: [-1.8, 0, 0], chest: [0.08, 0.3, 0], root: [0, -0.03, 0, -0.08, 0, 0] },
      extend: { hipL: [-1.45, 0, -0.05], kneeL: [0.12, 0, 0], ankL: [0.45, 0, 0], chest: [0.05, 0.2, 0], shL: [-0.7, 0, -0.3], elL: [-1.6, 0, 0], shR: [-0.5, 0, 0.3], elR: [-1.9, 0, 0], root: [0, -0.04, 0.18, -0.16, 0, 0] },
      follow: { hipL: [-0.8, 0, -0.05], kneeL: [1.0, 0, 0], root: [0, -0.06, 0.06, -0.06, 0, 0] }
    },
    GR: { // plum: hands clasp behind the head, elbows squeeze
      extend: { shL: [-1.7, 0.4, -0.1], elL: [-1.5, 0, 0], shR: [-1.7, -0.4, 0.1], elR: [-1.5, 0, 0], chest: [0.2, 0, 0], root: [0, -0.08, 0.26, 0.16, 0, 0] }
    }
  },
  marisol: {
    RL: { // meia-lua de compasso: hands to the floor line, body spins through
      chamber: { chest: [0.5, 0.6, 0], hipR: [-0.6, 0, 0.2], kneeR: [0.8, 0, 0], shL: [-1.2, 0.4, -0.3], elL: [-0.6, 0, 0], root: [0, -0.16, 0, 0.3, 0.7, 0] },
      extend: { hipR: [-1.7, -0.4, 0.15], kneeR: [0.1, 0, 0], ankR: [0.5, 0, 0], chest: [0.35, -0.5, 0], root: [0, -0.1, 0.12, 0.12, -1.6, -0.1] },
      follow: { hipR: [-0.9, -0.4, 0.15], kneeR: [0.7, 0, 0], chest: [0.2, -0.3, 0], root: [0, -0.12, 0.04, 0.1, -2.6, -0.05] }
    }
  },
  suyin: {
    RL: { // fouetté: tall chamber, whip from the knee, instant re-chamber
      chamber: { hipR: [-1.9, 0, 0.1], kneeR: [2.4, 0, 0], ankR: [0.6, 0, 0], root: [0, -0.04, 0, -0.04, -0.15, 0] },
      extend: { hipR: [-1.9, -0.15, 0.1], kneeR: [0.08, 0, 0], ankR: [0.7, 0, 0], chest: [0.04, -0.35, 0], root: [0, -0.02, 0.16, -0.1, -0.25, -0.04] },
      follow: { hipR: [-1.7, 0, 0.1], kneeR: [2.0, 0, 0], root: [0, -0.04, 0.04, -0.06, -0.15, 0] }
    }
  },
  daichi: {
    RH: { // gyaku-zuki: hikite hand racks hard to the hip, fist corkscrews
      extend: { shL: [0.35, 0, -0.25], elL: [-1.9, 0, 0], wrL: [0, 0, 0.9], shR: [-1.45, -0.1, 0], elR: [-0.08, 0, 0], wrR: [0, 0, 0.95], chest: [0.05, -0.6, 0], root: [0, -0.08, 0.26, 0.06, -0.14, 0] },
      follow: { shL: [0.25, 0, -0.2], elL: [-2.0, 0, 0] }
    }
  },
  bastion: {
    RH: { // hammerfist arcs down through the target
      chamber: { shR: [-2.5, 0, 0.4], elR: [-1.5, 0, 0], wrR: [-0.4, 0, 0], chest: [-0.1, 0.5, 0] },
      extend: { shR: [-1.05, -0.1, 0.1], elR: [-0.35, 0, 0], wrR: [0.5, 0, 0], chest: [0.35, -0.4, 0], neck: [0.25, 0, 0], root: [0, -0.1, 0.24, 0.2, 0, 0] },
      follow: { shR: [-0.6, 0, 0.15], elR: [-0.8, 0, 0], chest: [0.4, -0.3, 0] }
    }
  }
};

// What being hit by a specific technique does to a body. Selected by the
// incoming move's limb/height/family - the recipient's form is as authored
// as the executor's.
const HIT_REACTIONS = {
  snapHigh: { neck: [-0.75, 0.3, 0], chest: [-0.28, 0.12, 0], shL: [-0.4, 0, -0.4], shR: [-0.4, 0, 0.4], rootZ: -0.16 },
  whipHigh: { neck: [-0.5, 0.7, 0.25], chest: [-0.2, 0.4, 0.1], rootZ: -0.14 },
  foldMid: { chest: [0.62, 0.1, 0], spine: [0.3, 0, 0], neck: [0.45, 0, 0], shL: [-0.6, 0.2, -0.5], shR: [-0.6, -0.2, 0.5], rootZ: -0.12, rootY: -0.07 },
  buckleLow: { hipL: [-0.35, 0, -0.18], kneeL: [0.9, 0, 0], hipR: [0.1, 0, 0.1], kneeR: [0.6, 0, 0], chest: [0.25, 0.15, 0.12], rootY: -0.13, rootZ: -0.06 },
  shoveBack: { chest: [-0.25, 0, 0], spine: [-0.1, 0, 0], neck: [-0.2, 0, 0], shL: [-0.8, 0, -0.5], shR: [-0.8, 0, 0.5], kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0], rootZ: -0.2, rootY: -0.05 },
  cutFlinch: { neck: [0.3, -0.5, -0.2], chest: [0.2, -0.25, -0.08], rootZ: -0.1 }
};

function pickReaction(move) {
  if (!move) return HIT_REACTIONS.foldMid;
  if (move.family === "break" && move.height === "body") return HIT_REACTIONS.shoveBack;
  if (move.height === "low") return HIT_REACTIONS.buckleLow;
  if (move.limb === "HB" || (move.name || "").toLowerCase().includes("elbow")) return HIT_REACTIONS.cutFlinch;
  if (move.height === "high") return move.limb === "LH" ? HIT_REACTIONS.snapHigh : HIT_REACTIONS.whipHigh;
  return HIT_REACTIONS.foldMid;
}

// Face-down sprawl. The trunk is pitched a hair past horizontal so the body
// lies FLAT (not on a ramp); the dynamic ground-clamp in update() then rests
// the lowest contact on the floor, so root[1] here is only a nudge. Limbs are
// splayed out to the sides (kept near the spine plane) so nothing dangles far
// below the torso and props the body up.
export const LYING = {
  spine: [0.02, 0, 0], chest: [0.06, 0, 0.02], neck: [0.15, 0.55, 0], head: [0, 0.25, 0],
  shL: [-0.15, 0, -0.7], elL: [-0.4, 0, 0], shR: [-0.15, 0, 0.4], elR: [-0.45, 0, 0],
  hipL: [-0.05, 0, -0.18], kneeL: [0.35, 0, 0], hipR: [0.05, 0, 0.14], kneeR: [0.6, 0, 0],
  ankL: [0.2, 0, 0], ankR: [0.3, 0, 0],
  root: [0, 0.05, 0, 1.55, 0, 0.05]
};

const RISE = {
  chest: [0.4, 0.2, 0], neck: [0.2, 0, 0],
  shL: [-0.5, 0, -0.3], elL: [-1.4, 0, 0], shR: [-0.6, 0, 0.3], elR: [-1.5, 0, 0],
  hipL: [-0.9, 0, -0.05], kneeL: [1.4, 0, 0], hipR: [-0.2, 0, 0.05], kneeR: [0.9, 0, 0],
  root: [0, -0.3, -0.05, 0.25, 0, 0]
};

const STAGGER = {
  chest: [0.2, 0.1, 0], neck: [0.35, 0.2, 0],
  shL: [-0.2, 0, -0.4], elL: [-1.1, 0, 0], shR: [-0.15, 0, 0.4], elR: [-1.0, 0, 0],
  hipL: [-0.1, 0, -0.12], kneeL: [0.5, 0, 0], hipR: [0.05, 0, 0.12], kneeR: [0.45, 0, 0],
  root: [0, -0.12, -0.04, 0.18, 0, 0]
};

const VICTORY = {
  chest: [-0.08, 0, 0], neck: [-0.25, 0, 0],
  shL: [-2.8, 0, -0.35], elL: [-0.3, 0, 0], shR: [-2.8, 0, 0.35], elR: [-0.3, 0, 0],
  hipL: [-0.06, 0, -0.06], kneeL: [0.12, 0, 0], hipR: [0.06, 0, 0.06], kneeR: [0.12, 0, 0],
  root: [0, -0.02, 0, -0.06, 0, 0]
};

const BOW = {
  chest: [0.55, 0, 0], neck: [0.3, 0, 0],
  shL: [0.05, 0, -0.15], elL: [-0.25, 0, 0], shR: [0.05, 0, 0.15], elR: [-0.25, 0, 0],
  hipL: [-0.06, 0, -0.05], kneeL: [0.1, 0, 0], hipR: [0.02, 0, 0.05], kneeR: [0.1, 0, 0],
  root: [0, -0.03, 0, 0.1, 0, 0]
};

const BROW_FLAVOR = {
  renzo: 0.32, bastion: 0.3, decha: 0.22, lobo: 0.1,
  daichi: 0.08, suyin: 0.05, akane: 0.02, marisol: -0.12
};

// ---------------------------------------------------------------------------
// Procedural surface maps: skin with anatomy shading, cloth with weave.
// ---------------------------------------------------------------------------

function hexCss(hex) {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

function makeSkinTexture(tone, isTorso) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");
  c.fillStyle = hexCss(tone);
  c.fillRect(0, 0, size, size);

  // Mottle: living skin is never one color.
  for (let i = 0; i < 900; i++) {
    const v = Math.random();
    c.fillStyle = v > 0.5 ? "rgba(255,235,220,0.030)" : "rgba(60,30,20,0.035)";
    const r = 2 + Math.random() * 7;
    c.beginPath();
    c.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    c.fill();
  }

  if (isTorso) {
    // Anatomy shading: pectoral arcs, abdominal wall, clavicle, spinal groove.
    c.strokeStyle = "rgba(50,25,18,0.16)";
    c.lineWidth = 3;
    for (const u of [0.40, 0.60]) {
      c.beginPath();
      c.arc(u * size, size * 0.70, size * 0.075, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke();
    }
    c.lineWidth = 2;
    c.strokeStyle = "rgba(50,25,18,0.12)";
    c.beginPath();
    c.moveTo(size * 0.5, size * 0.34);
    c.lineTo(size * 0.5, size * 0.66);
    c.stroke();
    for (const v of [0.46, 0.55]) {
      c.beginPath();
      c.moveTo(size * 0.44, v * size);
      c.lineTo(size * 0.56, v * size);
      c.stroke();
    }
    // Spinal groove on the back (u near the seam).
    const spine = c.createLinearGradient(0, 0, size * 0.1, 0);
    spine.addColorStop(0, "rgba(40,20,14,0.18)");
    spine.addColorStop(1, "rgba(40,20,14,0)");
    c.fillStyle = spine;
    c.fillRect(0, size * 0.25, size * 0.1, size * 0.55);
    c.fillRect(size * 0.9, size * 0.25, size * 0.1, size * 0.55);
  } else {
    // Joint crease band (elbow/knee line sits mid-limb in UV space).
    const crease = c.createLinearGradient(0, size * 0.42, 0, size * 0.52);
    crease.addColorStop(0, "rgba(40,20,14,0)");
    crease.addColorStop(0.5, "rgba(40,20,14,0.14)");
    crease.addColorStop(1, "rgba(40,20,14,0)");
    c.fillStyle = crease;
    c.fillRect(0, size * 0.42, size, size * 0.1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeClothTexture(color, coarse) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");
  c.fillStyle = hexCss(color);
  c.fillRect(0, 0, size, size);

  // Weave: alternating warp/weft luminance.
  const step = coarse ? 4 : 2;
  for (let y = 0; y < size; y += step) {
    c.fillStyle = (y / step) % 2 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.05)";
    c.fillRect(0, y, size, step / 2);
  }
  for (let x = 0; x < size; x += step * 2) {
    c.fillStyle = "rgba(0,0,0,0.035)";
    c.fillRect(x, 0, step / 2, size);
  }
  if (coarse) {
    // Slubs and fold shadows for heavy cotton (gi cloth).
    for (let i = 0; i < 70; i++) {
      c.fillStyle = "rgba(0,0,0,0.05)";
      c.fillRect(Math.random() * size, Math.random() * size, 14 + Math.random() * 30, 1.6);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Normal map from a height field: relief without polycount.
function makeNormalTexture(paintHeight, strength = 1) {
  const size = 128;
  const h = document.createElement("canvas");
  h.width = h.height = size;
  const hc = h.getContext("2d");
  hc.fillStyle = "#808080"; hc.fillRect(0, 0, size, size);
  paintHeight(hc, size);
  const src = hc.getImageData(0, 0, size, size).data;
  const out = hc.createImageData(size, size);
  const at = (x, y) => src[(((y + size) % size) * size + ((x + size) % size)) * 4];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x - 1, y) - at(x + 1, y)) / 255 * strength;
    const dy = (at(x, y - 1) - at(x, y + 1)) / 255 * strength;
    const len = Math.hypot(dx, dy, 1);
    const i = (y * size + x) * 4;
    out.data[i] = Math.round((dx / len * 0.5 + 0.5) * 255);
    out.data[i + 1] = Math.round((dy / len * 0.5 + 0.5) * 255);
    out.data[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
    out.data[i + 3] = 255;
  }
  hc.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(h);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function skinNormalTexture(isTorso) {
  return makeNormalTexture((c, size) => {
    for (let i = 0; i < 2600; i++) { const v = Math.random() > 0.5 ? 150 : 110; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(Math.random() * size, Math.random() * size, 1.4, 1.4); }
    if (isTorso) {
      c.strokeStyle = "rgba(60,60,60,0.9)"; c.lineWidth = 2.5;
      for (const u of [0.40, 0.60]) { c.beginPath(); c.arc(u * size, size * 0.70, size * 0.08, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); }
      c.fillStyle = "rgba(180,180,180,0.5)";
      for (const v of [0.40, 0.48, 0.56]) c.fillRect(size * 0.42, v * size, size * 0.16, 2);
    }
  }, 1.1);
}
function clothNormalTexture(coarse) {
  return makeNormalTexture((c, size) => {
    const step = coarse ? 5 : 3;
    for (let y = 0; y < size; y += step) { c.fillStyle = (y / step) % 2 ? "#b0b0b0" : "#505050"; c.fillRect(0, y, size, step * 0.6); }
    for (let x = 0; x < size; x += step) { c.fillStyle = (x / step) % 2 ? "rgba(200,200,200,0.4)" : "rgba(40,40,40,0.4)"; c.fillRect(x, 0, step * 0.5, size); }
  }, coarse ? 1.4 : 0.8);
}

// ---------------------------------------------------------------------------
// Lofted body geometry: cross-section sweeps with per-ring bone weights.
// ---------------------------------------------------------------------------

const RADIAL = 14;

// rings: [{ x, y, z, r, sx, sz, b0, b1, w0 }] - position, radius, ellipse
// scales, two bone indices and the weight of the first.
function buildLoft(rings, materialIndex, out) {
  const base = out.positions.length / 3;
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    for (let j = 0; j <= RADIAL; j++) {
      const a = (j / RADIAL) * Math.PI * 2;
      // Seam at the back (-z): a=0 faces -z so the visible front is seam-free.
      const px = Math.sin(a) * ring.r * (ring.sx || 1);
      const pz = -Math.cos(a) * ring.r * (ring.sz || 1);
      out.positions.push(ring.x + px, ring.y, ring.z + pz);
      out.uvs.push(j / RADIAL, i / (rings.length - 1));
      out.skinIndices.push(ring.b0, ring.b1, 0, 0);
      out.skinWeights.push(ring.w0, 1 - ring.w0, 0, 0);
    }
  }
  const cols = RADIAL + 1;
  const idxStart = out.indices.length;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = base + i * cols + j;
      const b = a + cols;
      out.indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  out.groups.push({ start: idxStart, count: out.indices.length - idxStart, materialIndex });
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------

export function createRig(char, side) {
  const H = char.body.height;
  const bulk = char.body.bulk;
  const shoulders = char.body.shoulders;
  const c = char.colors;
  const co = char.costume;

  const dims = {
    thigh: H * 0.25, shin: H * 0.24,
    upper: H * 0.185, fore: H * 0.165,
    hipY: H * 0.25 + H * 0.24 + 0.05,
    shoulderX: H * 0.122 * shoulders,
    hipX: H * 0.06 * Math.max(1, bulk * 0.92),
    headR: H * 0.054
  };
  const shoulderY = dims.hipY + H * 0.175 + H * 0.165; // world Y of shoulder joints

  const mats = [];
  const flashMats = [];
  const accentMats = [];
  const skinMats = [];
  const textures = [];

  function mat(color, opts = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.72, metalness: opts.metal ?? 0.04 });
    m.envMapIntensity = opts.envInt ?? (opts.metal && opts.metal > 0.3 ? 1.0 : 0.2);
    if (opts.map) { m.map = opts.map; textures.push(opts.map); }
    if (opts.normal) { m.normalMap = opts.normal; m.normalScale = new THREE.Vector2(opts.normalScale ?? 0.6, opts.normalScale ?? 0.6); textures.push(opts.normal); }
    if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
    mats.push(m);
    if (opts.flash !== false) flashMats.push(m);
    if (opts.accent) accentMats.push(m);
    if (opts.skin) { m.userData.baseColor = new THREE.Color(color); m.userData.baseRough = m.roughness; skinMats.push(m); }
    return m;
  }

  function box(w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.castShadow = true;
    return mesh;
  }

  function sphere(r, material, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), material);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    return mesh;
  }

  function capsule(r, len, material) {
    const cyl = Math.max(0.01, len - r * 2);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, cyl, 4, 10), material);
    mesh.castShadow = true;
    return mesh;
  }

  // --- region materials (organic surfaces get textured + normal-mapped) ------
  const skinNT = skinNormalTexture(false);
  const skinNTtorso = skinNormalTexture(true);
  const clothNT = clothNormalTexture(false);
  const clothNTcoarse = clothNormalTexture(true);

  const skinTorso = co.gi || co.tunic || co.bodysuit || co.armor ? null : makeSkinTexture(c.skin, true);
  const torsoClothColor = co.gi ? c.gi : co.tunic ? c.top : co.bodysuit ? c.suit : co.armor ? c.under : null;
  const torsoM = torsoClothColor !== null
    ? mat(0xffffff, { map: makeClothTexture(torsoClothColor, !!co.gi), normal: co.gi ? clothNTcoarse : clothNT, normalScale: 0.7, rough: 0.85, envInt: 0.15 })
    : mat(0xffffff, { map: skinTorso, normal: skinNTtorso, normalScale: 0.5, rough: 0.5, envInt: 0.36, skin: true });

  const legClothColor = co.trunks ? null : (c.trousers || c.tights || (co.bodysuit ? c.suit : co.armor ? c.under : co.gi ? c.giShade : c.legs || null));
  const legM = legClothColor !== null
    ? mat(0xffffff, { map: makeClothTexture(legClothColor, !!co.gi), normal: co.gi ? clothNTcoarse : clothNT, normalScale: 0.7, rough: 0.85, envInt: 0.15 })
    : mat(0xffffff, { map: makeSkinTexture(c.skin, false), normal: skinNT, normalScale: 0.5, rough: 0.5, envInt: 0.36, skin: true });

  const armClothColor = co.gi ? c.gi : co.bodysuit ? c.suit : co.armor ? c.under : co.tunic ? c.top : null;
  const armM = armClothColor !== null
    ? mat(0xffffff, { map: makeClothTexture(armClothColor, !!co.gi), normal: co.gi ? clothNTcoarse : clothNT, normalScale: 0.7, rough: 0.85, envInt: 0.15 })
    : mat(0xffffff, { map: makeSkinTexture(c.skin, false), normal: skinNT, normalScale: 0.5, rough: 0.5, envInt: 0.36, skin: true });

  const skinM = mat(c.skin, { rough: 0.5, envInt: 0.36, normal: skinNT, normalScale: 0.4, skin: true });
  const skinShadeM = mat(shade(c.skin, 0.82));
  const hairM = c.hair !== undefined ? mat(c.hair) : skinShadeM;
  const accentM = mat(c.accent, { emissive: c.accent, emissiveIntensity: 0.35, accent: true, metal: 0.1, rough: 0.4 });

  // --- skeleton ----------------------------------------------------------------
  const group = new THREE.Group();
  const poseRoot = new THREE.Group();
  group.add(poseRoot);

  // Multi-strand verlet hair/cloth: segment meshes live under strandRoot (a
  // child of group with identity transform), driven by a world-space sim.
  const strands = [];
  const strandRoot = new THREE.Group();
  group.add(strandRoot);
  const _sA = new THREE.Vector3(), _sT = new THREE.Vector3(), _sMid = new THREE.Vector3();
  const _sDir = new THREE.Vector3(), _sLocalDir = new THREE.Vector3();
  const _sQ = new THREE.Quaternion(), _sQi = new THREE.Quaternion();
  const _S_UP = new THREE.Vector3(0, -1, 0);

  function addStrand(anchorBone, ox, oy, oz, n, segLen, rad, material) {
    const pts = [], prev = [], meshes = [];
    for (let i = 0; i <= n; i++) { pts.push(new THREE.Vector3()); prev.push(new THREE.Vector3()); }
    for (let i = 0; i < n; i++) { const m = capsule(rad * (1 - i * 0.12), segLen, material); strandRoot.add(m); meshes.push(m); }
    strands.push({ anchor: anchorBone, offset: new THREE.Vector3(ox, oy, oz), pts, prev, meshes, segLen, n, init: false });
  }

  function updateStrands(dt) {
    if (!strands.length) return;
    const dtSec = Math.min(0.04, dt / 1000);
    group.updateMatrixWorld(true);
    group.getWorldQuaternion(_sQ);
    _sQi.copy(_sQ).invert();
    const g = 9 * dtSec * dtSec;
    for (const st of strands) {
      st.anchor.updateWorldMatrix(true, false);
      _sA.copy(st.offset).applyMatrix4(st.anchor.matrixWorld);
      if (!st.init) { for (let i = 0; i <= st.n; i++) { st.pts[i].copy(_sA); st.pts[i].y -= i * st.segLen; st.prev[i].copy(st.pts[i]); } st.init = true; }
      st.pts[0].copy(_sA); st.prev[0].copy(_sA);
      for (let i = 1; i <= st.n; i++) {
        const p = st.pts[i], q = st.prev[i];
        _sT.copy(p);
        p.x += (p.x - q.x) * 0.9;
        p.y += (p.y - q.y) * 0.9 - g;
        p.z += (p.z - q.z) * 0.9;
        q.copy(_sT);
        if (!Number.isFinite(p.x)) { st.init = false; }
      }
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i <= st.n; i++) {
          const a = st.pts[i - 1], b = st.pts[i];
          _sT.subVectors(b, a);
          const d = _sT.length() || 1e-4;
          _sT.multiplyScalar((d - st.segLen) / d);
          if (i - 1 === 0) b.sub(_sT);
          else { a.addScaledVector(_sT, 0.5); b.addScaledVector(_sT, -0.5); }
        }
      }
      for (let i = 0; i < st.n; i++) {
        const a = st.pts[i], b = st.pts[i + 1];
        _sMid.addVectors(a, b).multiplyScalar(0.5);
        st.meshes[i].position.copy(group.worldToLocal(_sMid.clone()));
        _sDir.subVectors(b, a);
        if (_sDir.lengthSq() < 1e-8) continue;
        _sDir.normalize().applyQuaternion(_sQi);
        st.meshes[i].quaternion.setFromUnitVectors(_S_UP, _sDir);
      }
    }
  }

  const bones = [];
  const joints = {};

  function bone(name, parent, x, y, z) {
    const b = new THREE.Bone();
    b.position.set(x, y, z);
    if (parent) parent.add(b);
    bones.push(b);
    if (name) joints[name] = b;
    return b;
  }

  const rootB = bone(null, null, 0, 0, 0);
  poseRoot.add(rootB);
  const hipsB = bone("hipsRef", rootB, 0, dims.hipY, 0);
  const spineB = bone("spine", hipsB, 0, H * 0.075, 0);
  const chestB = bone("chest", spineB, 0, H * 0.1, 0);
  const neckB = bone("neck", chestB, 0, H * 0.19, 0);
  bone("head", neckB, 0, H * 0.062, 0);

  for (const [p, dir] of [["L", 1], ["R", -1]]) {
    const sh = bone(`sh${p}`, chestB, dir * dims.shoulderX, H * 0.165, 0);
    const el = bone(`el${p}`, sh, 0, -dims.upper, 0);
    bone(`wr${p}`, el, 0, -dims.fore, 0);
    const hip = bone(`hip${p}`, hipsB, dir * dims.hipX, -H * 0.02, 0);
    const knee = bone(`knee${p}`, hip, 0, -dims.thigh, 0);
    bone(`ank${p}`, knee, 0, -dims.shin, 0);
  }

  const boneIndex = new Map(bones.map((b, i) => [b, i]));
  const bi = name => boneIndex.get(joints[name]);
  const biHips = boneIndex.get(hipsB);
  const biSpine = bi("spine");
  const biChest = bi("chest");
  const biNeck = bi("neck");

  // --- the organic body: one continuous skinned surface --------------------------
  const out = { positions: [], uvs: [], indices: [], skinIndices: [], skinWeights: [], groups: [] };

  // Trunk: hips -> shoulders -> neck base, elliptical sections.
  const clothEase = co.gi || co.tunic ? 1.07 : 1.0;
  const trunkProfile = [
    { f: -0.045, r: 0.082, sx: 1.22 }, // below hips (glute mass)
    { f: 0.0, r: 0.090, sx: 1.30 },
    { f: 0.055, r: 0.080, sx: 1.22 },
    { f: 0.105, r: 0.072, sx: 1.13 }, // waist
    { f: 0.16, r: 0.080, sx: 1.2 },
    { f: 0.225, r: 0.090, sx: 1.28 * shoulders }, // chest
    { f: 0.285, r: 0.088, sx: 1.34 * shoulders }, // upper chest
    { f: 0.33, r: 0.062, sx: 1.18 * shoulders },  // trap slope
    { f: 0.365, r: 0.032, sx: 1.05 },             // neck base
    { f: 0.40, r: 0.027, sx: 1.0 }                // up the neck
  ];
  const trunkRings = trunkProfile.map(p => {
    const y = dims.hipY + H * p.f;
    // Weight bands: hips -> spine -> chest -> neck with smooth handoffs.
    let b0 = biHips, b1 = biSpine, w0 = 1;
    if (p.f < 0.05) { b0 = biHips; b1 = biSpine; w0 = 1 - smoothstep(0.0, 0.1, p.f) * 0.5; }
    else if (p.f < 0.14) { b0 = biHips; b1 = biSpine; w0 = 1 - smoothstep(0.0, 0.14, p.f); }
    else if (p.f < 0.24) { b0 = biSpine; b1 = biChest; w0 = 1 - smoothstep(0.14, 0.24, p.f); }
    else if (p.f < 0.35) { b0 = biChest; b1 = biNeck; w0 = 1 - smoothstep(0.3, 0.4, p.f); }
    else { b0 = biNeck; b1 = biChest; w0 = 0.9; }
    return { x: 0, y, z: 0, r: p.r * H * bulk * clothEase / 1.78 * 1.78, sx: p.sx, sz: 1, b0, b1, w0 };
  });
  buildLoft(trunkRings, 0, out);

  // Limbs: profile sweeps with muscle masses, weighted across two bones.
  function limbRings(x0, y0, len0, len1, prof, bA, bB, bC) {
    // prof: [{ v (0..1 over both segments), r }], joint at v where len0 ends
    const vJoint = len0 / (len0 + len1);
    return prof.map(p => {
      const y = y0 - (len0 + len1) * p.v;
      let b0, b1, w0;
      if (p.v < vJoint - 0.09) { b0 = bA; b1 = bB; w0 = 1; }
      else if (p.v < vJoint + 0.09) { b0 = bA; b1 = bB; w0 = 1 - smoothstep(vJoint - 0.09, vJoint + 0.09, p.v); }
      else if (p.v < 0.93) { b0 = bB; b1 = bC; w0 = 1; }
      else { b0 = bB; b1 = bC; w0 = 1 - smoothstep(0.93, 1.0, p.v) * 0.6; }
      return { x: x0, y, z: 0, r: p.r * H * bulk, sx: 1, sz: 1, b0, b1, w0 };
    });
  }

  const armProf = [
    { v: 0.0, r: 0.047 }, { v: 0.1, r: 0.042 }, { v: 0.24, r: 0.040 },
    { v: 0.40, r: 0.032 }, { v: 0.50, r: 0.029 }, { v: 0.62, r: 0.033 },
    { v: 0.78, r: 0.027 }, { v: 0.94, r: 0.021 }, { v: 1.0, r: 0.020 }
  ];
  const legProf = [
    { v: 0.0, r: 0.063 }, { v: 0.12, r: 0.058 }, { v: 0.3, r: 0.050 },
    { v: 0.47, r: 0.038 }, { v: 0.56, r: 0.043 }, { v: 0.68, r: 0.037 },
    { v: 0.88, r: 0.026 }, { v: 1.0, r: 0.023 }
  ];

  for (const [p, dir] of [["L", 1], ["R", -1]]) {
    buildLoft(limbRings(dir * dims.shoulderX, shoulderY, dims.upper, dims.fore, armProf, bi(`sh${p}`), bi(`el${p}`), bi(`wr${p}`)), 2, out);
    buildLoft(limbRings(dir * dims.hipX, dims.hipY - H * 0.02, dims.thigh, dims.shin, legProf, bi(`hip${p}`), bi(`knee${p}`), bi(`ank${p}`)), 1, out);
  }

  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute("position", new THREE.Float32BufferAttribute(out.positions, 3));
  bodyGeo.setAttribute("uv", new THREE.Float32BufferAttribute(out.uvs, 2));
  bodyGeo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(out.skinIndices, 4));
  bodyGeo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(out.skinWeights, 4));
  bodyGeo.setIndex(out.indices);
  for (const g of out.groups) bodyGeo.addGroup(g.start, g.count, g.materialIndex);
  bodyGeo.computeVertexNormals();

  const body = new THREE.SkinnedMesh(bodyGeo, [torsoM, legM, armM]);
  body.castShadow = true;
  body.frustumCulled = false; // bones swing limbs outside the bind-pose bounds
  poseRoot.add(body);
  body.add(rootB); // keep the bone root with the mesh
  group.updateMatrixWorld(true);
  // Inverses must come from the bones' rest world transforms - compute them
  // only after the whole hierarchy has valid matrices.
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  body.bind(skeleton, body.matrixWorld.clone());

  // --- rigid attachments: head, hands, feet, costume ------------------------------
  buildHead();

  for (const [p, dir] of [["L", 1], ["R", -1]]) {
    // Hand: palm + four articulated fingers (curl to a fist) + opposed thumb.
    const handM = co.wraps ? mat(c.wraps) : skinM;
    const hand = new THREE.Group();
    const palm = box(H * 0.044, H * 0.052, H * 0.03, handM);
    hand.add(palm);
    const fingerRoot = new THREE.Group();
    fingerRoot.position.set(0, -H * 0.026, H * 0.004);
    hand.add(fingerRoot);
    const fingerLen = H * 0.05;
    for (let f = 0; f < 4; f++) {
      const finger = box(H * 0.0095, fingerLen, H * 0.026, handM);
      finger.position.set((f - 1.5) * H * 0.011, -fingerLen / 2, H * 0.012);
      fingerRoot.add(finger);
    }
    const thumbPivot = new THREE.Group();
    thumbPivot.position.set(dir * H * 0.024, -H * 0.004, H * 0.008);
    hand.add(thumbPivot);
    const thumb = box(H * 0.015, H * 0.03, H * 0.018, handM);
    thumb.position.set(0, -H * 0.012, 0);
    thumb.rotation.z = dir * 0.5;
    thumbPivot.add(thumb);
    hand.position.y = -H * 0.024;
    hand.rotation.x = -0.25;
    joints[`wr${p}`].add(hand);
    joints[`hand${p}`] = hand;
    joints[`fingers${p}`] = fingerRoot;
    joints[`thumb${p}`] = thumbPivot;
    joints[`thumbDir${p}`] = dir;

    // Foot: heel + toes on the ankle bone.
    const footM = co.barefoot ? skinM : mat(c.boots || c.guards || 0x14171a);
    const foot = new THREE.Group();
    const heel = box(H * 0.05, H * 0.04, H * 0.075, footM);
    foot.add(heel);
    const toes = box(H * 0.048, H * 0.032, H * 0.075, footM);
    toes.position.set(0, -H * 0.005, H * 0.068);
    foot.add(toes);
    foot.position.set(0, -H * 0.018, H * 0.028);
    joints[`ank${p}`].add(foot);
    joints[`foot${p}`] = foot;

    if (co.wraps) {
      const wrap = capsule(H * 0.026 * bulk, dims.fore * 0.4, mat(c.wraps, { rough: 0.6 }));
      wrap.position.y = -dims.fore * 0.78;
      joints[`el${p}`].add(wrap);
    }
    if (co.armbands) {
      const band = capsule(H * 0.043 * bulk, H * 0.045, mat(c.bands, { rough: 0.55 }));
      band.position.y = -dims.upper * 0.3;
      joints[`sh${p}`].add(band);
    }
    if (co.legWraps) {
      const wrap = capsule(H * 0.03 * bulk, dims.shin * 0.42, mat(c.wraps, { rough: 0.6 }));
      wrap.position.y = -dims.shin * 0.7;
      joints[`knee${p}`].add(wrap);
    }
    if (co.kneePads) {
      const pad = sphere(H * 0.046, mat(c.boots));
      pad.position.z = H * 0.018;
      joints[`knee${p}`].add(pad);
    }
    if (co.boots) {
      const cuff = capsule(H * 0.034 * bulk, dims.shin * 0.5, mat(c.boots));
      cuff.position.y = -dims.shin * 0.66;
      joints[`knee${p}`].add(cuff);
    }
    if (co.armor) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(H * 0.052, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(c.armorShade, { metal: 0.6, rough: 0.4 }));
      pauldron.castShadow = true;
      joints[`sh${p}`].add(pauldron);
      const bracer = box(H * 0.07, dims.fore * 0.7, H * 0.07, mat(c.armorShade, { metal: 0.55, rough: 0.4 }));
      bracer.position.y = -dims.fore * 0.45;
      joints[`el${p}`].add(bracer);
      const greave = box(H * 0.08, dims.shin * 0.62, H * 0.08, mat(c.armorShade, { metal: 0.55, rough: 0.4 }));
      greave.position.y = -dims.shin * 0.42;
      joints[`knee${p}`].add(greave);
    }
  }

  buildCostume();

  function buildHead() {
    const r = dims.headR;
    const headM = co.wolfMask ? mat(c.mask) : co.helm ? mat(c.armor, { metal: 0.55, rough: 0.4 }) : skinM;

    const skull = sphere(r, headM, 0.94, 1.06, 1.0);
    skull.position.y = r * 1.04;
    joints.head.add(skull);
    const jaw = sphere(r * 0.78, headM, 0.86, 0.74, 0.92);
    jaw.position.set(0, r * 0.52, r * 0.12);
    joints.head.add(jaw);
    joints.faceJaw = jaw;
    joints.faceJawBaseY = r * 0.52;

    if (co.helm) {
      const helm = box(r * 2.35, r * 2.35, r * 2.4, mat(c.armor, { metal: 0.6, rough: 0.35 }));
      helm.position.y = r * 1.05;
      joints.head.add(helm);
      const visor = box(r * 1.75, r * 0.34, 0.012, mat(c.visor, { emissive: c.visor, emissiveIntensity: 1.6, accent: true, flash: false }));
      visor.position.set(0, r * 1.18, r * 1.24);
      joints.head.add(visor);
      return;
    }

    if (co.wolfMask) {
      const snout = box(r * 0.8, r * 0.56, r * 0.78, mat(c.mask));
      snout.position.set(0, r * 0.7, r * 0.95);
      joints.head.add(snout);
      const nose = box(r * 0.36, r * 0.24, r * 0.2, mat(0x101114));
      nose.position.set(0, r * 0.78, r * 1.38);
      joints.head.add(nose);
      for (const dir of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, r * 0.8, 6), mat(c.mask));
        ear.position.set(dir * r * 0.6, r * 2.0, -r * 0.1);
        ear.rotation.z = -dir * 0.25;
        ear.castShadow = true;
        joints.head.add(ear);
      }
      const eyeband = box(r * 1.92, r * 0.42, r * 1.7, mat(c.maskAccent, { metal: 0.2, rough: 0.5 }));
      eyeband.position.set(0, r * 1.18, r * 0.1);
      joints.head.add(eyeband);
      const mouth = box(r * 0.34, r * 0.05, 0.01, skinShadeM);
      mouth.position.set(0, r * 0.34, r * 0.94);
      joints.head.add(mouth);
      return;
    }

    const scleraM = mat(0xf2efe6, { flash: false, rough: 0.28, envInt: 0.5 });
    const irisM = mat(0x2a1f18, { flash: false, rough: 0.2, envInt: 0.7 });
    const lidM = mat(c.skin, { rough: 0.5, skin: true });
    const face = { irises: [], lids: [], brows: [], eyeY: r * 1.1, eyeZ: r * 0.93, browBaseY: r * 1.36, browTilt: BROW_FLAVOR[char.id] ?? 0.1 };
    for (const dir of [-1, 1]) {
      const eye = sphere(r * 0.17, scleraM, 1, 0.82, 0.5);
      eye.position.set(dir * r * 0.36, face.eyeY, r * 0.84);
      joints.head.add(eye);
      const iris = sphere(r * 0.08, irisM, 1, 1, 0.6);
      iris.position.set(dir * r * 0.36, face.eyeY, face.eyeZ);
      iris.userData.bx = dir * r * 0.36;
      joints.head.add(iris);
      face.irises.push(iris);
      const lid = sphere(r * 0.185, lidM, 1, 0.6, 0.62);
      lid.position.set(dir * r * 0.36, face.eyeY + r * 0.14, r * 0.82);
      lid.userData.openY = face.eyeY + r * 0.14;
      lid.userData.shutY = face.eyeY - r * 0.02;
      joints.head.add(lid);
      face.lids.push(lid);
      const brow = box(r * 0.4, r * 0.08, r * 0.09, hairM);
      brow.position.set(dir * r * 0.36, face.browBaseY, r * 0.86);
      brow.rotation.z = dir * face.browTilt;
      brow.userData.bx = dir * r * 0.36;
      brow.userData.dir = dir;
      joints.head.add(brow);
      face.brows.push(brow);
      const ear = sphere(r * 0.18, skinM, 0.5, 0.7, 0.7);
      ear.position.set(dir * r * 0.92, r * 1.02, 0);
      joints.head.add(ear);
    }
    const nose = box(r * 0.16, r * 0.3, r * 0.2, skinShadeM);
    nose.position.set(0, r * 0.92, r * 0.92);
    nose.rotation.x = 0.18;
    joints.head.add(nose);
    const mouth = sphere(r * 0.2, mat(shade(c.skin, 0.5), { flash: false, rough: 0.5 }), 1, 0.28, 0.5);
    mouth.position.set(0, r * 0.54, r * 0.9);
    mouth.userData.baseY = r * 0.54;
    joints.head.add(mouth);
    face.mouth = mouth;
    joints.face = face;
  }

  function buildCostume() {
    const r = dims.headR;
    if (co.gi) {
      for (const [x, ry] of [[-0.5, 0.35], [0.5, -0.35], [0, Math.PI]]) {
        const flap = box(H * 0.085, H * 0.13, 0.012, mat(0xffffff, { map: makeClothTexture(c.giShade, true), rough: 0.85 }));
        flap.position.set(x * H * 0.08, -H * 0.075, x === 0 ? -H * 0.05 : H * 0.05);
        flap.rotation.y = ry;
        flap.rotation.x = x === 0 ? -0.18 : 0.18;
        joints.hipsRef.add(flap);
      }
      const belt = box(H * 0.2 * bulk, H * 0.028, H * 0.15 * bulk, mat(c.belt));
      belt.position.y = H * 0.045;
      joints.hipsRef.add(belt);
      const knot = box(H * 0.035, H * 0.03, H * 0.02, mat(c.belt));
      knot.position.set(0, H * 0.035, H * 0.085);
      joints.hipsRef.add(knot);
      const lapel = box(H * 0.022, H * 0.16, 0.012, mat(c.giShade));
      lapel.position.set(H * 0.03, H * 0.1, H * 0.078);
      lapel.rotation.z = 0.32;
      joints.chest.add(lapel);
      const lapel2 = lapel.clone();
      lapel2.position.x = -H * 0.03;
      lapel2.rotation.z = -0.32;
      joints.chest.add(lapel2);
    }
    if (co.headband) {
      const band = box(r * 2.15, H * 0.018, r * 2.15, mat(c.headband));
      band.position.y = r * 1.42;
      joints.head.add(band);
      for (const off of [-0.012, 0.012]) {
        addStrand(joints.head, off * H, r * 1.32, -r * 1.0, 2, H * 0.052, H * 0.012, mat(c.headband));
      }
    }
    if (co.hair === "short" || co.hair === "swept") {
      const capHair = sphere(r * 1.02, hairM, 0.98, 0.72, 1.0);
      capHair.position.set(0, r * 1.45, co.hair === "swept" ? -r * 0.2 : -r * 0.06);
      joints.head.add(capHair);
      const fringe = box(r * 1.4, r * 0.3, r * 0.34, hairM);
      fringe.position.set(0, r * 1.62, r * 0.62);
      joints.head.add(fringe);
      if (co.hair === "swept") {
        for (const [x, rz] of [[-0.4, 0.5], [0.1, 0.2], [0.5, -0.4]]) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(r * 0.24, r * 0.7, 6), hairM);
          spike.position.set(x * r, r * 1.95, -r * 0.45);
          spike.rotation.x = -0.7;
          spike.rotation.z = rz;
          joints.head.add(spike);
        }
      }
    }
    if (co.hair === "bun") {
      const capHair = sphere(r * 1.02, hairM, 0.98, 0.66, 1.0);
      capHair.position.set(0, r * 1.5, -r * 0.05);
      joints.head.add(capHair);
      const bun = sphere(r * 0.42, hairM);
      bun.position.set(0, r * 1.85, -r * 0.7);
      joints.head.add(bun);
      if (char.id === "marisol") {
        const bun2 = sphere(r * 0.3, hairM);
        bun2.position.set(r * 0.25, r * 1.7, -r * 0.85);
        joints.head.add(bun2);
      }
    }
    if (co.ponytail) {
      const capHair = sphere(r * 1.02, hairM, 0.98, 0.7, 1.0);
      capHair.position.set(0, r * 1.48, -r * 0.05);
      joints.head.add(capHair);
      addStrand(joints.head, 0, r * 1.5, -r * 0.95, 4, H * 0.07, r * 0.32, hairM);
    }
    if (co.mane) {
      const mane = box(r * 1.6, H * 0.12, r * 0.6, hairM);
      mane.position.set(0, r * 0.5, -r * 1.05);
      mane.rotation.x = 0.25;
      joints.head.add(mane);
    }
    if (co.armor) {
      const plate = box(H * 0.2 * shoulders, H * 0.16, H * 0.125, mat(c.armor, { metal: 0.6, rough: 0.38 }));
      plate.position.y = H * 0.1;
      joints.chest.add(plate);
      const sigil = box(H * 0.04, H * 0.05, 0.01, mat(c.visor, { emissive: c.visor, emissiveIntensity: 1.1, accent: true, flash: false }));
      sigil.position.set(0, H * 0.105, H * 0.07);
      joints.chest.add(sigil);
    }
    if (co.trunks) {
      for (const dir of [1, -1]) {
        const hem = capsule(H * 0.054 * bulk, H * 0.065, mat(0xffffff, { map: makeClothTexture(c.trunks, false), rough: 0.8 }));
        hem.position.set(dir * dims.hipX, -H * 0.055, 0);
        joints.hipsRef.add(hem);
      }
      const waist = box(H * 0.19 * bulk, H * 0.05, H * 0.15 * bulk, mat(0xffffff, { map: makeClothTexture(c.trunks, false), rough: 0.8 }));
      waist.position.y = H * 0.02;
      joints.hipsRef.add(waist);
    }
    if (co.sash) {
      const sash = box(H * 0.19 * bulk, H * 0.035, H * 0.145 * bulk, mat(c.trim, { metal: 0.15, rough: 0.45 }));
      sash.position.y = H * 0.05;
      joints.hipsRef.add(sash);
      const drape = box(H * 0.05, H * 0.12, 0.01, mat(c.trim));
      drape.position.set(H * 0.06, -H * 0.04, H * 0.07);
      joints.hipsRef.add(drape);
    }
    if (co.cords) {
      for (const dir of [-1, 1]) {
        const cord = box(H * 0.022, H * 0.2, 0.012, mat(c.cords));
        cord.position.set(0, H * 0.09, H * 0.074);
        cord.rotation.z = dir * 0.65;
        joints.chest.add(cord);
      }
    }
    if (co.scarf) {
      const wrap = box(r * 1.9, H * 0.032, r * 1.9, mat(c.scarf));
      wrap.position.y = H * 0.012;
      joints.neck.add(wrap);
      addStrand(joints.neck, 0, -H * 0.02, -r * 0.9, 4, H * 0.055, H * 0.03, mat(c.scarf));
    }
  }

  // Team ring + flow aura.
  const ringColor = side < 0 ? 0x47c7d9 : 0xe45745;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(H * 0.21, H * 0.26, 36),
    new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  group.add(ring);

  const aura = new THREE.PointLight(c.accent, 0, 3.2);
  aura.position.y = dims.hipY + H * 0.2;
  group.add(aura);

  // --- animation state ------------------------------------------------------------
  const pose = {};
  for (const j of JOINTS) pose[j] = [0, 0, 0];
  pose.root = [0, 0, 0, 0, 0, 0];

  const stanceBase = stancePose();
  const lying = { ...LYING, root: [...LYING.root] };
  lying.root[1] = -(dims.hipY - H * 0.1);

  let walkPhase = 0;
  let currentX = 0;
  let introTimer = 0;
  let reaction = null;
  let celebrate = false;
  let defeated = false;
  let sequence = null;
  let seqLift = 0;        // current world-Y lift during a paired sequence (for coupling)
  let lunge = null;

  let blinkTimer = 700 + Math.random() * 2400;
  let blinking = 0;
  let clenchL = 0.6, clenchR = 0.6;
  let swayA = 0, swayV = 0, prevDrawX = 0;
  let damage = 0;
  let collapse = null;
  let feetWX = null;      // planted world-x of each foot (anti-skate)
  let stepping = null;    // active step: { side, from, to, t, dur }
  let stepCd = 0;
  let comShift = 0;       // weight-shift onto the support leg
  const _foot = new THREE.Vector3();
  let ragdoll = null;     // verlet particle skeleton, active on KO/knockdown
  let downActive = false;
  let downT = 0;
  let landX = 0;
  let getupKeys = null;
  const GETUP_DUR = 1600; // ms of the authored get-up (the tail of downTime)
  const FLOOR_Y = 0.07;   // lowest bone centerline rests here (flesh fills the gap)
  const ik = {
    root: new THREE.Vector3(), tgt: new THREE.Vector3(), ppos: new THREE.Vector3(),
    pq: new THREE.Quaternion(), pqi: new THREE.Quaternion(), scl: new THREE.Vector3(),
    f: new THREE.Vector3(), axis: new THREE.Vector3(), up: new THREE.Vector3(0, -1, 0),
    q: new THREE.Quaternion()
  };

  applyPoseImmediate(composePose(stanceBase));

  function stancePose() {
    return { ...STANCE, ...(STANCE_FLAVOR[char.id] || {}) };
  }

  function composePose(base, overlay) {
    const out2 = {};
    for (const j of JOINTS) out2[j] = [...(base[j] || Z3)];
    out2.root = [...(base.root || [0, 0, 0, 0, 0, 0])];
    if (overlay) {
      for (const j of JOINTS) if (overlay[j]) out2[j] = [...overlay[j]];
      if (overlay.root) out2.root = [...overlay.root];
    }
    return out2;
  }

  function applyPoseImmediate(goal) {
    for (const j of JOINTS) pose[j] = [...goal[j]];
    pose.root = [...goal.root];
    pushPose();
  }

  function pushPose() {
    for (const j of JOINTS) {
      const target = joints[j];
      if (target) target.rotation.set(pose[j][0], pose[j][1], pose[j][2]);
    }
    poseRoot.position.set(pose.root[0], pose.root[1], pose.root[2]);
    poseRoot.rotation.set(pose.root[3], pose.root[4], pose.root[5]);
  }

  function poseSet(limb) {
    const base = MOVE_POSES[limb];
    const flavor = POSE_FLAVOR[char.id]?.[limb];
    if (!flavor) return base;
    return {
      chamber: { ...base.chamber, ...(flavor.chamber || {}) },
      extend: { ...base.extend, ...(flavor.extend || {}) },
      follow: { ...(base.follow || {}), ...(flavor.follow || {}) }
    };
  }

  function movePoseGoal(actor) {
    const move = actor.current;
    const t = actor.phaseTime;
    const su = move.startup;

    if (move.limb === "ART") return artPose(t / (su + move.active + move.recovery));
    const lib = MOVE_POSES[move.limb] ? poseSet(move.limb) : null;
    if (!lib) return { goal: null, rate: 8 };
    if (t < su * 0.55) return { goal: composePose(stanceBase, lib.chamber), rate: 12 };
    if (t < su + move.active) return { goal: composePose(stanceBase, lib.extend), rate: 22 };
    if (lib.follow && Object.keys(lib.follow).length && t < su + move.active + move.recovery * 0.45) {
      return { goal: composePose(stanceBase, lib.follow), rate: 11 };
    }
    return { goal: null, rate: 7 };
  }

  function artPose(p) {
    if (p < 0.26) {
      return {
        goal: composePose(stanceBase, {
          chest: [0.1, 0.8, 0], shL: [-0.3, 0, -0.2], elL: [-2.5, 0, 0], shR: [-0.3, 0, 0.3], elR: [-2.5, 0, 0],
          kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0], root: [0, -0.14, -0.04, 0.1, 0, 0]
        }), rate: 10
      };
    }
    if (p < 0.5) return { goal: composePose(stanceBase, poseSet("RH").extend), rate: 24 };
    if (p < 0.72) {
      return {
        goal: composePose(stanceBase, {
          shL: [-1.7, 0.1, 0], elL: [-0.6, 0, 0], chest: [0, 0.3, 0], root: [0, -0.02, 0.18, 0.05, 0, 0]
        }), rate: 24
      };
    }
    if (p < 0.88) {
      return {
        goal: composePose(stanceBase, {
          hipR: [-1.5, 0, 0.05], kneeR: [0.5, 0, 0], shL: [-0.6, 0, -0.2], elL: [-1.6, 0, 0],
          chest: [0.05, -0.2, 0], root: [0, 0.02, 0.14, -0.08, 0, 0]
        }), rate: 20
      };
    }
    return { goal: null, rate: 8 };
  }

  // Authored get-up driven by body SHAPE; the ground-clamp sets height, so the
  // pelvis rises on its own as the silhouette changes: prone -> press up ->
  // hands & knees -> post a foot -> rise -> stance. root[1] is irrelevant here
  // (the clamp neutralizes it); only the pitch (root[3]) and forward shift
  // (root[2]) shape the arc. q in 0..1.
  function buildGetupKeys() {
    const K = (t, ov) => ({ t, pose: composePose(stanceBase, ov) });
    getupKeys = [
      // prone sprawl (matches LYING)
      K(0.00, { spine: [0.02, 0, 0], chest: [0.06, 0, 0.02], neck: [0.15, 0.55, 0], head: [0, 0.25, 0],
                shL: [-0.15, 0, -0.7], elL: [-0.4, 0, 0], shR: [-0.15, 0, 0.4], elR: [-0.45, 0, 0],
                hipL: [-0.05, 0, -0.18], kneeL: [0.35, 0, 0], hipR: [0.05, 0, 0.14], kneeR: [0.6, 0, 0],
                ankL: [0.2, 0, 0], ankR: [0.3, 0, 0], root: [0, 0, 0, 1.55, 0, 0.05] }),
      // press-up: hands plant under shoulders, chest arches up off the mat
      K(0.24, { spine: [0.16, 0, 0], chest: [0.46, 0, 0], neck: [0.18, 0.2, 0],
                shL: [-1.5, 0, -0.12], elL: [-0.4, 0, 0], shR: [-1.5, 0, 0.12], elR: [-0.4, 0, 0],
                hipL: [-0.25, 0, -0.12], kneeL: [0.3, 0, 0], hipR: [-0.15, 0, 0.1], kneeR: [0.4, 0, 0],
                root: [0, 0, 0.12, 1.22, 0, 0.04] }),
      // hands & knees: hips pike up, knees draw under the body, arms straight
      K(0.44, { spine: [0.2, 0, 0], chest: [0.3, 0, 0], neck: [0.28, 0, 0],
                shL: [-1.6, 0, -0.15], elL: [-0.22, 0, 0], shR: [-1.6, 0, 0.15], elR: [-0.22, 0, 0],
                hipL: [-1.45, 0, -0.06], kneeL: [1.5, 0, 0], hipR: [-1.35, 0, 0.06], kneeR: [1.5, 0, 0],
                ankL: [0.5, 0, 0], ankR: [0.5, 0, 0], root: [0, 0, 0.18, 0.82, 0, 0.03] }),
      // post a foot: lead (right) foot plants, hands lift, torso stacks over it
      K(0.64, { spine: [0.12, 0.05, 0], chest: [0.2, 0.12, 0], neck: [0.05, 0, 0],
                shL: [-0.6, 0, -0.25], elL: [-1.3, 0, 0], shR: [-0.75, 0, 0.32], elR: [-1.0, 0, 0],
                hipL: [-1.5, 0, -0.05], kneeL: [1.55, 0, 0], hipR: [-0.5, 0, 0.05], kneeR: [0.95, 0, 0], ankR: [0.35, 0, 0],
                root: [0, 0, 0.08, 0.46, 0, 0.02] }),
      // rise: drive up off the lead leg, both feet under, torso uprighting
      K(0.84, { chest: [0.1, 0.25, 0], neck: [0.02, 0, 0],
                shL: [-0.5, 0, -0.16], elL: [-1.7, 0, 0], shR: [-0.4, 0, 0.2], elR: [-1.9, 0, 0],
                hipL: [-0.42, 0, -0.05], kneeL: [0.72, 0, 0], hipR: [-0.26, 0, 0.05], kneeR: [0.5, 0, 0],
                root: [0, 0, 0.02, 0.18, 0, 0.01] }),
      K(1.00, {})
    ];
  }

  function sampleKeys(keys, q) {
    let a = keys[0], b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) { if (q >= keys[i].t && q <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; } }
    const span = Math.max(1e-4, b.t - a.t);
    const local = easeInOut(Math.min(1, Math.max(0, (q - a.t) / span)));
    const out = {};
    for (const j of JOINTS) out[j] = [
      a.pose[j][0] + (b.pose[j][0] - a.pose[j][0]) * local,
      a.pose[j][1] + (b.pose[j][1] - a.pose[j][1]) * local,
      a.pose[j][2] + (b.pose[j][2] - a.pose[j][2]) * local
    ];
    out.root = [];
    for (let i = 0; i < 6; i++) out.root[i] = a.pose.root[i] + (b.pose.root[i] - a.pose.root[i]) * local;
    return out;
  }

  function blendPose(goal, rate, dtSec) {
    const k = 1 - Math.exp(-rate * dtSec);
    for (const j of JOINTS) {
      pose[j][0] += (goal[j][0] - pose[j][0]) * k;
      pose[j][1] += (goal[j][1] - pose[j][1]) * k;
      pose[j][2] += (goal[j][2] - pose[j][2]) * k;
    }
    for (let i = 0; i < 6; i++) pose.root[i] += (goal.root[i] - pose.root[i]) * k;
    pushPose();
  }

  // Joints that can touch the mat when down. Used to rest the body on the floor
  // regardless of pose: hands/knees during a crawl-up, belly while prone, feet
  // once upright. Flesh extends ~0.08 below a bone centerline, so we float the
  // lowest centerline a touch above 0.
  const CONTACT = ["head", "neck", "chest", "spine", "shL", "shR", "elL", "elR",
    "wrL", "wrR", "hipL", "hipR", "kneeL", "kneeR", "ankL", "ankR"];
  const _gcV = new THREE.Vector3();
  // Sets group.y so the lowest contact rests at `target`. `strength` (0..1)
  // fades the correction out as the fighter returns to a normal stance.
  function groundClamp(target, strength) {
    group.updateWorldMatrix(true, true);
    let minY = Infinity;
    for (const n of CONTACT) {
      const j = joints[n];
      if (!j) continue;
      j.getWorldPosition(_gcV);
      if (_gcV.y < minY) minY = _gcV.y;
    }
    if (!Number.isFinite(minY)) return;
    const lift = (target - minY) * strength;
    group.position.y += lift;
    group.updateWorldMatrix(true, true);
  }

  function react(type, payload = {}) {
    if (type === "hit") {
      const power = Math.min(2, (payload.damage || 6) / 9);
      const dur = 300 + power * 200;
      const base = pickReaction(payload.move);
      const scaled = {};
      for (const key of Object.keys(base)) {
        if (key === "rootZ" || key === "rootY") scaled[key] = base[key] * (0.7 + power * 0.6);
        else scaled[key] = base[key].map(v => v * (0.7 + power * 0.5));
      }
      reaction = { dur, time: dur, pose: scaled };
      // The body deforms the instant the blow arrives: a third of the
      // reaction lands on the freeze frame itself.
      for (const j of JOINTS) {
        if (scaled[j]) {
          pose[j][0] += scaled[j][0] * 0.38;
          pose[j][1] += scaled[j][1] * 0.38;
          pose[j][2] += scaled[j][2] * 0.38;
        }
      }
      if (scaled.rootZ) pose.root[2] += scaled.rootZ * 0.38;
      if (scaled.rootY) pose.root[1] += scaled.rootY * 0.38;
      pushPose();
    } else if (type === "lunge") {
      lunge = { dur: 650, time: 650, dist: Math.min(1.35, Math.max(0, payload.dist || 0)) };
    } else if (type === "block") {
      reaction = { dur: 180, time: 180, pose: { chest: [0.12, 0, 0], rootZ: -0.04 } };
    } else if (type === "intro") {
      introTimer = 850;
    } else if (type === "celebrate") {
      celebrate = true; defeated = false;
    } else if (type === "defeated") {
      defeated = true; celebrate = false;
    } else if (type === "reset") {
      celebrate = false; defeated = false; reaction = null; sequence = null; lunge = null; collapse = null; ragdoll = null;
      group.position.y = 0; group.position.z = 0; feetWX = null; stepping = null; downActive = false;
    }
  }

  function playSequence(keys, duration) {
    sequence = {
      duration,
      time: 0,
      keys: keys.map(k => ({
        t: k.t,
        x: k.x,
        y: k.y || 0,
        goal: k.pose === "lying" ? composePose(lying) : composePose(stanceBase, k.pose || {})
      }))
    };
  }

  function sequenceActive() {
    return !!sequence;
  }

  function updateSequence(dt, dtSec) {
    sequence.time += dt;
    const p = Math.min(1, sequence.time / sequence.duration);
    const keys = sequence.keys;
    let k0 = keys[0];
    let k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (p >= keys[i].t && p <= keys[i + 1].t) { k0 = keys[i]; k1 = keys[i + 1]; break; }
    }
    const span = Math.max(0.0001, k1.t - k0.t);
    const s = Math.min(1, Math.max(0, (p - k0.t) / span)); // raw segment progress
    const local = easeInOut(s);                            // pose easing
    // Vertical motion obeys gravity: a body thrown up decelerates to its apex,
    // a body coming down accelerates into the mat, and once it lands it stays
    // (no symmetric ease that floats and bounces).
    const falling = k1.y < k0.y - 1e-4;
    const rising = k1.y > k0.y + 1e-4;
    const yE = falling ? s * s : rising ? 1 - (1 - s) * (1 - s) : local;
    // Horizontal travel coasts at a constant rate while airborne instead of
    // easing in and out, so a thrown body keeps its momentum across the arc.
    const xE = (falling || rising) ? s : local;

    const goal = {};
    for (const j of JOINTS) {
      goal[j] = [
        k0.goal[j][0] + (k1.goal[j][0] - k0.goal[j][0]) * local,
        k0.goal[j][1] + (k1.goal[j][1] - k0.goal[j][1]) * local,
        k0.goal[j][2] + (k1.goal[j][2] - k0.goal[j][2]) * local
      ];
    }
    goal.root = [];
    for (let i = 0; i < 6; i++) goal.root[i] = k0.goal.root[i] + (k1.goal.root[i] - k0.goal.root[i]) * local;
    seqLift = k0.y + (k1.y - k0.y) * yE;
    goal.root[1] += seqLift;

    const worldX = k0.x + (k1.x - k0.x) * xE;
    currentX = worldX;
    group.position.x = worldX;

    const k = 1 - Math.exp(-16 * dtSec);
    for (const j of JOINTS) {
      pose[j][0] += (goal[j][0] - pose[j][0]) * k;
      pose[j][1] += (goal[j][1] - pose[j][1]) * k;
      pose[j][2] += (goal[j][2] - pose[j][2]) * k;
    }
    for (let i = 0; i < 6; i++) pose.root[i] += (goal.root[i] - pose.root[i]) * k;
    pushPose();

    if (sequence.time >= sequence.duration) sequence = null;
  }

  function updateFace(actor, dt) {
    const face = joints.face;
    if (!face) return;
    const r = dims.headR;
    let lidClose = 0, browFurrow = 0, browRaise = 0, mouthOpen = 0;
    blinkTimer -= dt;
    if (blinking > 0) { blinking -= dt; lidClose = Math.max(lidClose, Math.sin(Math.max(0, blinking) / 120 * Math.PI)); }
    else if (blinkTimer <= 0) { blinking = 120; blinkTimer = 1600 + Math.random() * 3200; }
    if (actor.koed) { lidClose = 1; mouthOpen = 0.5; browFurrow = 0.2; }
    else if (defeated || actor.staggerTime > 0) { lidClose = Math.max(lidClose, 0.6); browFurrow = 0.7; mouthOpen = 0.4; }
    else if (actor.downTime > 0) { lidClose = Math.max(lidClose, 0.45); browFurrow = 0.5; }
    else {
      const pulse = actor.hitPulse / 240;
      if (pulse > 0.1) { lidClose = Math.max(lidClose, pulse * 0.9); browFurrow = Math.max(browFurrow, pulse); mouthOpen = Math.max(mouthOpen, pulse * 0.6); }
      if (actor.current && actor.current.family !== "guard" && actor.current.family !== "evade") {
        const su = actor.current.startup;
        if (actor.phaseTime > su && actor.phaseTime < su + actor.current.active) { browFurrow = Math.max(browFurrow, 0.6); mouthOpen = Math.max(mouthOpen, 0.5); }
      }
      if (actor.flowState) browRaise = 0.3;
      if (actor.posture < actor.postureMax * 0.3) { browFurrow = Math.max(browFurrow, 0.4); mouthOpen = Math.max(mouthOpen, 0.3); }
      browFurrow = Math.max(browFurrow, damage * 0.3);
    }
    for (const lid of face.lids) lid.position.y += (THREE.MathUtils.lerp(lid.userData.openY, lid.userData.shutY, lidClose) - lid.position.y) * Math.min(1, dt / 60);
    for (const brow of face.brows) {
      const ty = face.browBaseY + browRaise * r * 0.12 - browFurrow * r * 0.16;
      const tz = brow.userData.dir * face.browTilt - browFurrow * brow.userData.dir * 0.5;
      brow.position.y += (ty - brow.position.y) * Math.min(1, dt / 70);
      brow.rotation.z += (tz - brow.rotation.z) * Math.min(1, dt / 70);
    }
    const look = Math.sin(actor.sway + performance.now() * 0.0006) * r * 0.02;
    for (const iris of face.irises) iris.position.x += (iris.userData.bx + r * 0.04 + look - iris.position.x) * Math.min(1, dt / 90);
    if (face.mouth) {
      const sy = 0.28 + mouthOpen * 1.4;
      face.mouth.scale.y += (sy - face.mouth.scale.y) * Math.min(1, dt / 60);
      face.mouth.position.y += ((face.mouth.userData.baseY - mouthOpen * r * 0.06) - face.mouth.position.y) * Math.min(1, dt / 60);
    }
    if (joints.faceJaw) joints.faceJaw.position.y += ((joints.faceJawBaseY - mouthOpen * r * 0.07) - joints.faceJaw.position.y) * Math.min(1, dt / 60);
  }

  function updateHands(actor, dt) {
    let wantL = 0.6, wantR = 0.6;
    const cur = actor.current;
    if (cur) {
      if (cur.limb === "LH") wantL = 1;
      else if (cur.limb === "RH") wantR = 1;
      else if (cur.limb === "BR") { wantL = 0; wantR = 0; }
      else if (cur.limb === "GR") { wantL = 0.25; wantR = 0.25; }
      else if (cur.limb === "DEF") { wantL = 0.9; wantR = 0.9; }
    }
    if (actor.koed || actor.downTime > 0) { wantL = 0.2; wantR = 0.2; }
    const k = Math.min(1, dt / 70);
    clenchL += (wantL - clenchL) * k;
    clenchR += (wantR - clenchR) * k;
    for (const [pp, cl] of [["L", clenchL], ["R", clenchR]]) {
      const fr = joints[`fingers${pp}`], th = joints[`thumb${pp}`];
      if (fr) fr.rotation.x = -0.15 + cl * 1.7;
      if (th) { th.rotation.x = cl * 0.9; th.rotation.z = joints[`thumbDir${pp}`] * (0.2 + cl * 0.5); }
    }
  }

  function updateSecondary(dt, dtSec, drawX) {
    if (!joints.clothSway) return;
    const accel = (drawX - prevDrawX);
    prevDrawX = drawX;
    swayV += (-swayA * 0.02 - swayV * 0.16 - accel * 9 - 0.0008);
    swayA += swayV * Math.min(0.05, dtSec);
    swayA = Math.max(-0.9, Math.min(0.9, swayA));
    joints.clothSway.rotation.x = 0.35 + swayA;
    joints.clothSway.rotation.z = Math.sin(performance.now() * 0.003) * 0.06 + swayV * 0.4;
  }

  function applyLimbIK(prefix, isArm, target, weight) {
    const root = isArm ? joints[`sh${prefix}`] : joints[`hip${prefix}`];
    const mid = isArm ? joints[`el${prefix}`] : joints[`knee${prefix}`];
    const l1 = isArm ? dims.upper : dims.thigh;
    const l2 = isArm ? dims.fore : dims.shin;
    if (!root || !mid) return;
    root.updateWorldMatrix(true, false);
    root.matrixWorld.decompose(ik.root, ik.pq, ik.scl);
    if (root.parent) root.parent.matrixWorld.decompose(ik.ppos, ik.pq, ik.scl);
    ik.pqi.copy(ik.pq).invert();
    ik.tgt.copy(target).sub(ik.root);
    let d = ik.tgt.length();
    const maxd = (l1 + l2) * 0.995, mind = Math.abs(l1 - l2) + 0.002;
    if (!isFinite(d) || d < 1e-4) return;
    d = Math.max(mind, Math.min(maxd, d));
    ik.f.copy(ik.tgt).normalize();
    const upperAngle = Math.acos(clampN((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const elbowInterior = Math.acos(clampN((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2)));
    if (!isFinite(upperAngle) || !isFinite(elbowInterior)) return;
    ik.axis.crossVectors(ik.f, UP_Z);
    if (ik.axis.lengthSq() < 1e-5) ik.axis.set(1, 0, 0);
    ik.axis.normalize();
    const upWorld = ik.f.clone().applyAxisAngle(ik.axis, upperAngle);
    const upLocal = upWorld.applyQuaternion(ik.pqi).normalize();
    ik.q.setFromUnitVectors(ik.up, upLocal);
    root.quaternion.slerp(ik.q, weight);
    const bend = (isArm ? 1 : -1) * (Math.PI - elbowInterior);
    mid.rotation.x += (bend - mid.rotation.x) * weight;
  }

  // ---- Gravity: a real verlet-constraint ragdoll for the KO collapse --------
  const RD_LINKS = [
    ["hips", "chest"], ["chest", "head"],
    ["chest", "elL"], ["elL", "haL"], ["chest", "elR"], ["elR", "haR"],
    ["hips", "knL"], ["knL", "ftL"], ["hips", "knR"], ["knR", "ftR"]
  ];
  const RD_NODES = ["hips", "chest", "head", "elL", "haL", "elR", "haR", "knL", "ftL", "knR", "ftR"];
  const RD_SRC = { hips: "hipsRef", chest: "chest", head: "head", elL: "elL", haL: "wrL", elR: "elR", haR: "wrR", knL: "kneeL", ftL: "ankL", knR: "kneeR", ftR: "ankR" };

  function initRagdoll(faceSign) {
    group.updateMatrixWorld(true);
    const P = {}, prev = {}, rest = {};
    const tmp = new THREE.Vector3();
    for (const n of RD_NODES) {
      const src = joints[RD_SRC[n]] || joints.chest;
      src.getWorldPosition(tmp);
      P[n] = tmp.clone();
      prev[n] = tmp.clone();
    }
    for (const [a, b] of RD_LINKS) rest[a + b] = P[a].distanceTo(P[b]);
    const back = (faceSign > 0 ? -1 : 1);
    const kick = (n, vx, vy) => { prev[n].x -= vx; prev[n].y -= vy; };
    for (const n of RD_NODES) kick(n, back * 0.05, 0.02);
    kick("head", back * 0.04, 0.05); kick("chest", back * 0.03, 0.04);
    ragdoll = { P, prev, rest, baseY: group.position.y, failed: false };
  }

  function stepRagdoll(dt) {
    const rd = ragdoll;
    const dtSec = Math.min(0.04, dt / 1000);
    const g = 9.0 * dtSec * dtSec;
    const tmp = new THREE.Vector3();
    for (const n of RD_NODES) {
      const p = rd.P[n], q = rd.prev[n];
      tmp.copy(p);
      p.x += (p.x - q.x) * 0.96;
      p.y += (p.y - q.y) * 0.96 - g;
      p.z += (p.z - q.z) * 0.96;
      q.copy(tmp);
      const floor = rd.baseY + (n === "head" ? 0.12 : (n === "chest" || n === "hips") ? 0.14 : 0.05);
      if (p.y < floor) { p.y = floor; q.y = p.y + (q.y - p.y) * 0.3; q.x += (p.x - q.x) * 0.25; }
    }
    for (let it = 0; it < 6; it++) {
      for (const [a, b] of RD_LINKS) {
        const pa = rd.P[a], pb = rd.P[b];
        tmp.subVectors(pb, pa);
        const d = tmp.length() || 1e-4;
        const diff = (d - rd.rest[a + b]) / d * 0.5;
        tmp.multiplyScalar(diff);
        pa.add(tmp); pb.sub(tmp);
      }
    }
    for (const n of RD_NODES) if (!Number.isFinite(rd.P[n].x) || !Number.isFinite(rd.P[n].y)) rd.failed = true;
  }

  const _rdParent = new THREE.Quaternion(), _rdScale = new THREE.Vector3(), _rdPos = new THREE.Vector3(), _rdDir = new THREE.Vector3(), _rdLocal = new THREE.Vector3(), _rdQ = new THREE.Quaternion();
  const RD_DOWN = new THREE.Vector3(0, -1, 0);
  function aimBone(bone, fromW, toW) {
    if (!bone || !bone.parent) return;
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.matrixWorld.decompose(_rdPos, _rdParent, _rdScale);
    _rdDir.subVectors(toW, fromW);
    if (_rdDir.lengthSq() < 1e-6) return;
    _rdDir.normalize();
    _rdLocal.copy(_rdDir).applyQuaternion(_rdParent.invert());
    _rdQ.setFromUnitVectors(RD_DOWN, _rdLocal);
    bone.quaternion.copy(_rdQ);
  }

  function applyRagdoll() {
    const rd = ragdoll;
    if (rd.failed) { applyPoseImmediate(composePose(lying)); return; }
    group.position.x = rd.P.hips.x;
    group.position.z = rd.P.hips.z;
    group.position.y = rd.P.hips.y - dims.hipY;
    poseRoot.position.set(0, 0, 0);
    poseRoot.rotation.set(0, 0, 0);
    group.updateMatrixWorld(true);
    aimBone(joints.spine, rd.P.hips, rd.P.chest);
    aimBone(joints.neck, rd.P.chest, rd.P.head);
    aimBone(joints.shL, rd.P.chest, rd.P.elL); aimBone(joints.elL, rd.P.elL, rd.P.haL);
    aimBone(joints.shR, rd.P.chest, rd.P.elR); aimBone(joints.elR, rd.P.elR, rd.P.haR);
    aimBone(joints.hipL, rd.P.hips, rd.P.knL); aimBone(joints.kneeL, rd.P.knL, rd.P.ftL);
    aimBone(joints.hipR, rd.P.hips, rd.P.knR); aimBone(joints.kneeR, rd.P.knR, rd.P.ftR);
  }

  function update(dt, ctx) {
    const { actor, game, t, targetX, faceSign } = ctx;
    const dtSec = Math.min(0.05, dt / 1000);
    // Display mode (turntable / creator preview): the rig may sit under a parent
    // pivot, so world-space IK/physics would mis-target. Use pure FK there.
    const display = !!ctx.display;
    group.rotation.y = faceSign > 0 ? Math.PI / 2 : -Math.PI / 2;

    // Returned to standing: clear down state without snapping position.
    if (!actor.koed && actor.downTime <= 0 && downActive) {
      downActive = false; feetWX = null; stepping = null;
      currentX = group.position.x;
      group.position.y = 0; group.position.z = 0;
    }
    if (!actor.koed && actor.downTime <= 0 && group.position.y !== 0) group.position.y = 0;

    // The dramatic fall choreography (slam/throw) plays first, if any.
    if (sequence) {
      updateSequence(dt, Math.max(dtSec, 0.012));
      updateFace(actor, dt);
      updateHands(actor, dt);
      updateGlow(actor, t);
      return;
    }

    // Knockdown / KO: settle into a natural lying pose, then an authored get-up.
    // The dramatic fall itself is the paired slam/throw choreography (above).
    if (actor.koed || actor.downTime > 0) {
      if (!downActive) { downActive = true; downT = 0; landX = group.position.x; group.position.y = 0; if (!getupKeys) buildGetupKeys(); }
      downT += dt;
      group.position.x = landX; group.position.z = 0;
      currentX = landX;
      let clampStrength = 1;
      if (!actor.koed && actor.downTime <= GETUP_DUR) {
        const q = Math.max(0, Math.min(1, 1 - actor.downTime / GETUP_DUR));
        blendPose(sampleKeys(getupKeys, q), 12, dtSec);
        // Hand height back to the normal stance over the last beat so there is
        // no vertical pop when the down state releases.
        clampStrength = 1 - Math.max(0, Math.min(1, (q - 0.85) / 0.15));
      } else {
        const goalL = composePose(lying);
        if (downT < 360) {
          blendPose(goalL, 12, dtSec); // settle into the sprawl
        } else {
          goalL.chest[0] += Math.sin(t * 0.003) * 0.03; // breathing
          goalL.spine[0] += Math.sin(t * 0.003) * 0.012;
          blendPose(goalL, 5, dtSec);
        }
      }
      groundClamp(FLOOR_Y, clampStrength);
      updateFace(actor, dt);
      updateHands(actor, dt);
      updateGlow(actor, t);
      return;
    }

    const dx = targetX - currentX;
    currentX += dx * Math.min(1, dtSec * 11);
    let drawX = currentX;
    if (lunge) {
      lunge.time -= dt;
      if (lunge.time <= 0) lunge = null;
      else {
        // Fast in, hold through the impact freeze, ease back out.
        const p = 1 - lunge.time / lunge.dur;
        const env = p < 0.14 ? p / 0.14 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
        drawX += (faceSign > 0 ? 1 : -1) * lunge.dist * env;
      }
    }
    group.position.x = drawX;
    const speed = Math.abs(dx);
    walkPhase += speed * 30;

    let goal;
    let rate = 6.5;

    if (actor.staggerTime > 0) {
      goal = composePose(stanceBase, STAGGER);
      goal.root[5] += Math.sin(t * 0.009) * 0.1;
      goal.neck[2] += Math.sin(t * 0.011) * 0.12;
      rate = 7;
    } else if (defeated) {
      goal = composePose(stanceBase, STAGGER);
      rate = 4;
    } else if (celebrate) {
      goal = composePose(stanceBase, VICTORY);
      goal.root[1] += Math.abs(Math.sin(t * 0.006)) * 0.05;
      rate = 6;
    } else if (introTimer > 0) {
      introTimer -= dt;
      goal = composePose(stanceBase, BOW);
      rate = 5;
    } else if (actor.current) {
      const res = movePoseGoal(actor);
      goal = res.goal || composePose(stanceBase);
      rate = res.rate;
    } else {
      goal = composePose(stanceBase);
      goal.chest[0] += Math.sin(t * 0.0013 + actor.sway) * 0.025;
      goal.root[1] += Math.sin(t * 0.0021 + actor.sway) * 0.009;
      goal.root[5] += Math.sin(t * 0.0009 + actor.sway) * 0.02;
      if (actor.posture < actor.postureMax * 0.3) {
        goal.shL[0] += 0.25; goal.shR[0] += 0.2;
        goal.chest[0] += 0.12; goal.neck[0] += 0.15;
      }
      if (char.id === "marisol") {
        const g = t * 0.0035;
        goal.root[0] += Math.sin(g) * 0.08;
        goal.root[2] += Math.cos(g * 0.5) * 0.05;
        goal.hipL[0] += Math.sin(g) * 0.22;
        goal.hipR[0] += Math.sin(g + Math.PI) * 0.22;
        goal.kneeL[0] += Math.max(0, Math.sin(g + 1)) * 0.3;
        goal.kneeR[0] += Math.max(0, Math.sin(g + Math.PI + 1)) * 0.3;
        goal.chest[1] += Math.sin(g) * 0.18;
      }
      rate = 6.5;
    }

    // Real footwork: feet hold their world position; the body steps to them.
    // (Leg IK plants them after pushPose; here we decide steps + weight shift.)
    const groundOK = actor.downTime <= 0 && !actor.koed && actor.staggerTime <= 0 && !sequence && !display;
    if (groundOK) {
      if (!feetWX) feetWX = { L: drawX, R: drawX };
      stepCd -= dt;
      const kickSide = actor.current && (actor.current.limb === "RL" ? "R" : actor.current.limb === "LL" ? "L" : null);
      if (!stepping && stepCd <= 0) {
        const dL = drawX - feetWX.L, dR = drawX - feetWX.R;
        const far = Math.abs(dL) >= Math.abs(dR) ? "L" : "R";
        const drift = far === "L" ? dL : dR;
        if (Math.abs(drift) > 0.1 && far !== kickSide) {
          stepping = { side: far, from: feetWX[far], to: drawX, t: 0, dur: 180 };
        }
      }
      if (stepping) {
        stepping.t += dt;
        const sp = Math.min(1, stepping.t / stepping.dur);
        feetWX[stepping.side] = stepping.from + (stepping.to - stepping.from) * easeInOut(sp);
        if (sp >= 1) { stepping = null; stepCd = 70; }
      }
      // Weight shift onto whichever foot is grounded; small torso lean + dip.
      const support = stepping ? (stepping.side === "L" ? "R" : "L") : null;
      const want = support ? (feetWX[support] - drawX) : 0;
      comShift += (want - comShift) * Math.min(1, dtSec * 8);
      goal.chest[2] = (goal.chest[2] || 0) + comShift * 0.5;
      if (stepping) goal.root[1] -= 0.012;
    } else {
      feetWX = null; stepping = null;
    }

    if (reaction) {
      reaction.time -= dt;
      if (reaction.time <= 0) reaction = null;
      else {
        const k = Math.sin((reaction.time / reaction.dur) * Math.PI);
        const rp = reaction.pose;
        for (const j of JOINTS) {
          if (rp[j]) {
            goal[j][0] += rp[j][0] * k;
            goal[j][1] += rp[j][1] * k;
            goal[j][2] += rp[j][2] * k;
          }
        }
        if (rp.rootZ) goal.root[2] += rp.rootZ * k;
        if (rp.rootY) goal.root[1] += rp.rootY * k;
      }
    }

    const k = 1 - Math.exp(-rate * dtSec);
    for (const j of JOINTS) {
      pose[j][0] += (goal[j][0] - pose[j][0]) * k;
      pose[j][1] += (goal[j][1] - pose[j][1]) * k;
      pose[j][2] += (goal[j][2] - pose[j][2]) * k;
    }
    for (let i = 0; i < 6; i++) pose.root[i] += (goal.root[i] - pose.root[i]) * k;
    pushPose();

    // Two-bone IK seats the active strike on the target, blended over the FK form.
    if (!display && ctx.aim && actor.current && actor.downTime <= 0 && !actor.koed) {
      const cur = actor.current;
      const prog = (actor.phaseTime - cur.startup) / Math.max(1, cur.active);
      if (prog > 0 && prog < 1) {
        const w = 0.55 * Math.sin(prog * Math.PI);
        poseRoot.updateWorldMatrix(true, false);
        try {
          if (cur.limb === "LH") applyLimbIK("L", true, ctx.aim, w);
          else if (cur.limb === "RH" || cur.limb === "BR") applyLimbIK("R", true, ctx.aim, w);
          else if (cur.limb === "LL") applyLimbIK("L", false, ctx.aim, w);
          else if (cur.limb === "RL") applyLimbIK("R", false, ctx.aim, w);
        } catch (e) { /* IK never breaks the frame */ }
      }
    }

    // Plant feet in world space so they don't skate: leg IK holds each foot at
    // its planted world-x (lifting in an arc only while that foot is stepping).
    if (!display && feetWX && actor.downTime <= 0 && !actor.koed && actor.staggerTime <= 0 && !sequence) {
      const kickSide = actor.current && (actor.current.limb === "RL" ? "R" : actor.current.limb === "LL" ? "L" : null);
      poseRoot.updateWorldMatrix(true, false);
      for (const sp of ["L", "R"]) {
        if (sp === kickSide) continue;
        const ank = joints[`ank${sp}`];
        if (!ank) continue;
        const active = stepping && stepping.side === sp;
        const diff = drawX - feetWX[sp];
        // Idle: let the foot ride with the body so it never reads as "locked";
        // the FK stance poses it naturally. Only IK-pin once it actually drifts.
        if (!active && Math.abs(diff) < 0.05) { feetWX[sp] = drawX; continue; }
        ank.updateWorldMatrix(true, false);
        _foot.setFromMatrixPosition(ank.matrixWorld); // keep the FK foot height - never sink
        const lift = active ? Math.sin(Math.min(1, stepping.t / stepping.dur) * Math.PI) * 0.12 : 0;
        _foot.x = feetWX[sp];
        _foot.y += lift;
        try { applyLimbIK(sp, false, _foot, 0.45); } catch (e) { /* never break */ }
        const hipB = joints[`hip${sp}`], kneeB = joints[`knee${sp}`];
        if (hipB && kneeB) joints[`ank${sp}`].rotation.x = -(hipB.rotation.x + kneeB.rotation.x) * 0.5 + 0.04 + lift * 1.4;
      }
    }

    const hp = Number.isFinite(actor.hp) ? actor.hp : 100;
    const dmgTarget = Math.max(0, Math.min(1, 1 - hp / 100));
    damage += (dmgTarget - damage) * Math.min(1, dtSec * 2);
    if (!Number.isFinite(damage)) damage = 0;
    applyDamage(actor, t);

    updateFace(actor, dt);
    updateHands(actor, dt);
    updateSecondary(dt, dtSec, drawX);
    updateStrands(dt);
    updateGlow(actor, t);
  }

  const _bruise = new THREE.Color(0x6a2a3a);
  function applyDamage(actor, t) {
    const sweat = Math.min(1, damage * 0.8 + (actor.hitPulse / 240) * 0.4);
    for (const m of skinMats) {
      if (!m.userData.baseColor) continue;
      m.color.copy(m.userData.baseColor).lerp(_bruise, damage * 0.28);
      m.roughness = m.userData.baseRough * (1 - sweat * 0.5);
      m.envMapIntensity = 0.36 + sweat * 0.5;
    }
  }

  function updateGlow(actor, t) {
    const pulse = actor.hitPulse / 240;
    for (const m of flashMats) {
      m.emissive ??= new THREE.Color(0x000000);
      m.emissive.setRGB(pulse * 0.3, pulse * 0.27, pulse * 0.25);
    }
    const flowGlow = actor.flowState ? 0.9 + Math.sin(t * 0.012) * 0.25 : 0;
    aura.intensity = flowGlow * 2.2;
    for (const m of accentMats) {
      m.emissiveIntensity = 0.35 + flowGlow * 1.4;
    }
    ring.material.opacity = 0.22 + (actor.flowState ? 0.25 : 0) + pulse * 0.2;
  }

  const tmpV = new THREE.Vector3();
  function worldPoint(name) {
    const j = joints[name] || joints.chest;
    j.getWorldPosition(tmpV);
    return tmpV;
  }

  // ---- paired-throw coupling -------------------------------------------------
  // A fresh vector each call (worldPoint reuses one); the director reads several
  // anchors per frame, so it needs independent copies.
  function anchor(name) {
    const j = joints[name] || joints.chest;
    const v = new THREE.Vector3();
    j.getWorldPosition(v);
    return v;
  }
  function sequenceProgress() {
    return sequence ? Math.min(1, sequence.time / sequence.duration) : 1;
  }
  // Pin the rig in world space (used to carry a held victim at the thrower's
  // hands) without disturbing the authored FK pose.
  function placeWorld(x, y) {
    group.position.x = x;
    group.position.y = y || 0;
    currentX = x;
    group.updateWorldMatrix(true, true);
  }
  // Seat the thrower's hands onto live world targets (the victim's grip points),
  // over the authored arm pose, so the grip actually lands on the body.
  function gripReach(targetL, targetR, w) {
    if (targetL) { try { applyLimbIK("L", true, targetL, w); } catch (e) {} }
    if (targetR) { try { applyLimbIK("R", true, targetR, w); } catch (e) {} }
    group.updateWorldMatrix(true, true);
  }

  function dispose() {
    group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
    });
    for (const m of mats) m.dispose();
    for (const t of textures) t.dispose();
    ring.geometry.dispose();
    ring.material.dispose();
  }

  return {
    group, update, react, worldPoint, dispose, char,
    playSequence, sequenceActive,
    anchor, sequenceProgress, placeWorld, gripReach,
    get x() { return currentX; },
    get y() { return group.position.y; }
  };
}

const UP_Z = new THREE.Vector3(0, 0, 1);

function clampN(x) { return Math.max(-1, Math.min(1, x)); }

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function shade(hex, factor) {
  const r = Math.round(((hex >> 16) & 255) * factor);
  const g = Math.round(((hex >> 8) & 255) * factor);
  const b = Math.round((hex & 255) * factor);
  return (r << 16) | (g << 8) | b;
}
