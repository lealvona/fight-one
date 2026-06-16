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

export const LYING = {
  spine: Z3, chest: [-0.1, 0, 0], neck: [0.25, 0, 0], head: Z3,
  shL: [-0.4, 0, -0.9], elL: [-0.3, 0, 0], shR: [-0.4, 0, 0.9], elR: [-0.3, 0, 0],
  hipL: [-0.3, 0, -0.1], kneeL: [0.5, 0, 0], hipR: [0.15, 0, 0.1], kneeR: [0.3, 0, 0],
  root: [0, 0, -0.18, -1.4, 0, 0]
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
  const textures = [];

  function mat(color, opts = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.72, metalness: opts.metal ?? 0.04 });
    m.envMapIntensity = opts.envInt ?? (opts.metal && opts.metal > 0.3 ? 1.0 : 0.2);
    if (opts.map) { m.map = opts.map; textures.push(opts.map); }
    if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
    mats.push(m);
    if (opts.flash !== false) flashMats.push(m);
    if (opts.accent) accentMats.push(m);
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

  // --- region materials (organic surfaces get textured maps) -----------------
  const skinTorso = co.gi || co.tunic || co.bodysuit || co.armor ? null : makeSkinTexture(c.skin, true);
  const torsoClothColor = co.gi ? c.gi : co.tunic ? c.top : co.bodysuit ? c.suit : co.armor ? c.under : null;
  const torsoM = torsoClothColor !== null
    ? mat(0xffffff, { map: makeClothTexture(torsoClothColor, !!co.gi), rough: 0.85, envInt: 0.15 })
    : mat(0xffffff, { map: skinTorso, rough: 0.55, envInt: 0.34 });

  const legClothColor = co.trunks ? null : (c.trousers || c.tights || (co.bodysuit ? c.suit : co.armor ? c.under : co.gi ? c.giShade : c.legs || null));
  const legM = legClothColor !== null
    ? mat(0xffffff, { map: makeClothTexture(legClothColor, !!co.gi), rough: 0.85, envInt: 0.15 })
    : mat(0xffffff, { map: makeSkinTexture(c.skin, false), rough: 0.55, envInt: 0.34 });

  const armClothColor = co.gi ? c.gi : co.bodysuit ? c.suit : co.armor ? c.under : co.tunic ? c.top : null;
  const armM = armClothColor !== null
    ? mat(0xffffff, { map: makeClothTexture(armClothColor, !!co.gi), rough: 0.85, envInt: 0.15 })
    : mat(0xffffff, { map: makeSkinTexture(c.skin, false), rough: 0.55, envInt: 0.34 });

  const skinM = mat(c.skin, { rough: 0.55, envInt: 0.34 });
  const skinShadeM = mat(shade(c.skin, 0.82));
  const hairM = c.hair !== undefined ? mat(c.hair) : skinShadeM;
  const accentM = mat(c.accent, { emissive: c.accent, emissiveIntensity: 0.35, accent: true, metal: 0.1, rough: 0.4 });

  // --- skeleton ----------------------------------------------------------------
  const group = new THREE.Group();
  const poseRoot = new THREE.Group();
  group.add(poseRoot);

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
    // Hand: palm + finger block + thumb on the wrist bone.
    const handM = co.wraps ? mat(c.wraps) : skinM;
    const hand = new THREE.Group();
    const palm = box(H * 0.042, H * 0.05, H * 0.026, handM);
    hand.add(palm);
    const fingers = box(H * 0.04, H * 0.042, H * 0.03, handM);
    fingers.position.set(0, -H * 0.012, H * 0.024);
    fingers.rotation.x = 0.5;
    hand.add(fingers);
    const thumb = box(H * 0.014, H * 0.026, H * 0.016, handM);
    thumb.position.set(dir * H * 0.026, H * 0.008, H * 0.012);
    thumb.rotation.z = dir * 0.4;
    hand.add(thumb);
    hand.position.y = -H * 0.022;
    hand.rotation.x = -0.25;
    joints[`wr${p}`].add(hand);
    joints[`hand${p}`] = hand;

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

    const scleraM = mat(0xf2efe6, { flash: false, rough: 0.35 });
    const irisM = mat(0x2a1f18, { flash: false, rough: 0.3 });
    for (const dir of [-1, 1]) {
      const eye = sphere(r * 0.17, scleraM, 1, 0.82, 0.5);
      eye.position.set(dir * r * 0.36, r * 1.1, r * 0.84);
      joints.head.add(eye);
      const iris = sphere(r * 0.075, irisM, 1, 1, 0.5);
      iris.position.set(dir * r * 0.36, r * 1.1, r * 0.93);
      joints.head.add(iris);
      const brow = box(r * 0.38, r * 0.07, r * 0.08, hairM);
      brow.position.set(dir * r * 0.36, r * 1.36, r * 0.86);
      brow.rotation.z = dir * (BROW_FLAVOR[char.id] ?? 0.1);
      joints.head.add(brow);
      const ear = sphere(r * 0.18, skinM, 0.5, 0.7, 0.7);
      ear.position.set(dir * r * 0.92, r * 1.02, 0);
      joints.head.add(ear);
    }
    const nose = box(r * 0.16, r * 0.3, r * 0.2, skinShadeM);
    nose.position.set(0, r * 0.92, r * 0.92);
    nose.rotation.x = 0.18;
    joints.head.add(nose);
    const mouth = box(r * 0.36, r * 0.05, 0.01, mat(shade(c.skin, 0.6), { flash: false }));
    mouth.position.set(0, r * 0.52, r * 0.88);
    joints.head.add(mouth);
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
      const tails = new THREE.Group();
      for (const off of [-0.012, 0.012]) {
        const tail = box(H * 0.016, H * 0.1, 0.008, mat(c.headband));
        tail.position.set(off * H, -H * 0.04, -r * 1.0);
        tail.rotation.x = 0.35;
        tails.add(tail);
      }
      tails.position.y = r * 1.35;
      joints.head.add(tails);
      joints.clothSway = tails;
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
      const tail = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const seg = capsule(r * (0.3 - i * 0.06), H * 0.08, hairM);
        seg.position.y = -H * 0.045 - i * H * 0.07;
        tail.add(seg);
      }
      tail.position.set(0, r * 1.5, -r * 0.95);
      tail.rotation.x = 0.5;
      joints.head.add(tail);
      joints.clothSway = tail;
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
      const tail = box(H * 0.045, H * 0.16, 0.01, mat(c.scarf));
      tail.position.set(0, -H * 0.06, -r * 0.9);
      tail.rotation.x = 0.4;
      joints.neck.add(tail);
      joints.clothSway = tail;
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
  let lunge = null;

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
      celebrate = false; defeated = false; reaction = null; sequence = null; lunge = null;
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
    const local = easeInOut(Math.min(1, Math.max(0, (p - k0.t) / span)));

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
    goal.root[1] += k0.y + (k1.y - k0.y) * local;

    const worldX = k0.x + (k1.x - k0.x) * local;
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

  function update(dt, ctx) {
    const { actor, game, t, targetX, faceSign } = ctx;
    const dtSec = Math.min(0.05, dt / 1000);
    group.rotation.y = faceSign > 0 ? Math.PI / 2 : -Math.PI / 2;

    if (sequence) {
      updateSequence(dt, Math.max(dtSec, 0.012));
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

    if (actor.koed || (actor.downTime > 0 && actor.downTime > 380)) {
      goal = composePose(lying);
      rate = actor.koed ? 5 : 9;
    } else if (actor.downTime > 0) {
      goal = composePose(stanceBase, RISE);
      rate = 8;
    } else if (actor.staggerTime > 0) {
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

    if (speed > 0.0004 && actor.downTime <= 0 && !actor.koed) {
      const stride = Math.min(0.32, speed * 110);
      goal.hipL[0] += Math.sin(walkPhase) * stride;
      goal.hipR[0] += Math.sin(walkPhase + Math.PI) * stride;
      goal.kneeL[0] += Math.max(0, Math.sin(walkPhase + 1.2)) * stride * 1.1;
      goal.kneeR[0] += Math.max(0, Math.sin(walkPhase + Math.PI + 1.2)) * stride * 1.1;
      goal.root[1] += Math.abs(Math.sin(walkPhase)) * 0.012;
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

    if (joints.clothSway) {
      joints.clothSway.rotation.x = 0.35 + Math.sin(t * 0.004 + actor.sway) * 0.12 + speed * 6;
      joints.clothSway.rotation.z = Math.sin(t * 0.0031) * 0.08;
    }

    updateGlow(actor, t);
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
    get x() { return currentX; }
  };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function shade(hex, factor) {
  const r = Math.round(((hex >> 16) & 255) * factor);
  const g = Math.round(((hex >> 8) & 255) * factor);
  const b = Math.round((hex & 255) * factor);
  return (r << 16) | (g << 8) | b;
}
