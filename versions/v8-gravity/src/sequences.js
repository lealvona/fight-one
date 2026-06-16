// Paired interaction sequences: when a big move connects, both rigs leave
// normal animation and play a synchronized two-body timeline - the executor
// track and the recipient track - with real contact, lift, arc and impact.
// Combat is frozen (hit-stop) while these play, so the move is *performed*,
// not implied.
//
// Builders take { ax, vx, dir } - attacker world x, victim world x, and the
// attacker's facing sign (+1 faces +x). They return:
//   { duration, attacker: keys[], victim: keys[], impacts: [{t, x, y, power, label}] }
// Key: { t: 0..1, x: worldX, y: lift, pose: overlay | "lying" }

const CONTACT = 0.52; // bodies touch at roughly this separation

// -- shared pose overlays (rig pose space: joint -> [rx,ry,rz], root[6]) ------

const REACH = {
  shL: [-1.2, 0.25, -0.1], elL: [-0.7, 0, 0], shR: [-1.2, -0.25, 0.1], elR: [-0.7, 0, 0],
  chest: [0.18, 0.05, 0], root: [0, -0.1, 0.1, 0.16, 0, 0], kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0]
};

const GRIP = {
  shL: [-1.35, 0.3, -0.1], elL: [-1.0, 0, 0], shR: [-1.35, -0.3, 0.1], elR: [-1.0, 0, 0],
  chest: [0.22, 0, 0], root: [0, -0.12, 0.16, 0.18, 0, 0], kneeL: [0.55, 0, 0], kneeR: [0.55, 0, 0]
};

const LIFT_HIGH = {
  shL: [-2.9, 0.2, -0.25], elL: [-0.4, 0, 0], shR: [-2.9, -0.2, 0.25], elR: [-0.4, 0, 0],
  chest: [-0.3, 0, 0], neck: [-0.25, 0, 0], spine: [-0.12, 0, 0],
  root: [0, 0.04, 0.02, -0.16, 0, 0], kneeL: [0.15, 0, 0], kneeR: [0.15, 0, 0]
};

const SLAM_FOLLOW = {
  shL: [-0.7, 0.3, -0.2], elL: [-0.5, 0, 0], shR: [-0.7, -0.3, 0.2], elR: [-0.5, 0, 0],
  chest: [0.55, 0, 0], neck: [0.3, 0, 0], spine: [0.2, 0, 0],
  root: [0, -0.22, 0.1, 0.3, 0, 0], kneeL: [0.9, 0, 0], kneeR: [0.9, 0, 0], hipL: [-0.7, 0, -0.06], hipR: [-0.5, 0, 0.06]
};

const GRABBED = {
  shL: [-1.4, 0.4, -0.5], elL: [-0.9, 0, 0], shR: [-1.4, -0.4, 0.5], elR: [-0.9, 0, 0],
  chest: [0.2, 0.1, 0], neck: [0.25, 0, 0], root: [0, -0.06, 0.05, 0.12, 0, 0]
};

const LIFTED = {
  shL: [-2.4, 0, -0.9], elL: [-0.4, 0, 0], shR: [-2.4, 0, 0.9], elR: [-0.4, 0, 0],
  hipL: [-0.5, 0, -0.15], kneeL: [0.4, 0, 0], hipR: [-0.3, 0, 0.15], kneeR: [0.5, 0, 0],
  chest: [-0.15, 0, 0], neck: [-0.3, 0, 0],
  root: [0, 0, 0, -1.45, 0, 0] // horizontal, face up
};

const FLIP_MID = {
  shL: [-2.0, 0, -0.7], elL: [-0.6, 0, 0], shR: [-2.0, 0, 0.7], elR: [-0.6, 0, 0],
  hipL: [-1.2, 0, -0.1], kneeL: [0.9, 0, 0], hipR: [-1.0, 0, 0.1], kneeR: [0.8, 0, 0],
  chest: [0.2, 0, 0], root: [0, 0, 0, -2.4, 0, 0] // past horizontal, mid-flip
};

const STUMBLE_FWD = {
  chest: [0.5, 0.2, 0], neck: [0.35, 0, 0], shL: [-0.9, 0.3, -0.4], elL: [-0.8, 0, 0],
  shR: [-0.9, -0.3, 0.4], elR: [-0.8, 0, 0],
  root: [0, -0.12, 0.14, 0.32, 0, 0], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0]
};

const PIVOT_THROW = {
  chest: [0.12, 1.1, 0], spine: [0.05, 0.4, 0],
  shL: [-1.5, 0.5, -0.2], elL: [-0.5, 0, 0], shR: [-1.1, -0.4, 0.3], elR: [-1.0, 0, 0],
  root: [0.1, -0.1, 0.05, 0.1, 0.7, 0.05], kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0]
};

const THROW_RELEASE = {
  chest: [0.3, -0.4, 0], shL: [-0.5, 0.2, -0.3], elL: [-0.4, 0, 0], shR: [-1.6, -0.3, 0.2], elR: [-0.3, 0, 0],
  root: [0.05, -0.14, 0.08, 0.22, -0.3, 0], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0]
};

const FLY_BACK = {
  shL: [-1.8, 0, -0.8], elL: [-0.5, 0, 0], shR: [-1.8, 0, 0.8], elR: [-0.5, 0, 0],
  hipL: [-0.7, 0, -0.12], kneeL: [0.6, 0, 0], hipR: [-0.5, 0, 0.12], kneeR: [0.5, 0, 0],
  neck: [0.3, 0, 0], chest: [0.25, 0, 0],
  root: [0, 0, 0, -0.9, 0, 0]
};

const COUNTER_PUNCH = {
  shR: [-1.5, -0.1, 0], elR: [-0.1, 0, 0], shL: [-1.1, 0, -0.35], elL: [-2.5, 0, 0],
  chest: [0.06, -0.45, 0], spine: [0.05, -0.18, 0], root: [0, -0.07, 0.2, 0.1, 0, 0]
};

const SHELL_HOLD = {
  shL: [-1.3, 0, -0.35], elL: [-2.7, 0, 0], shR: [-1.3, 0, 0.35], elR: [-2.7, 0, 0],
  chest: [0.14, 0, 0], neck: [0.3, 0, 0], root: [0, -0.1, 0, 0.08, 0, 0]
};

const HEAD_SNAP = {
  neck: [-0.7, 0.25, 0], chest: [-0.25, 0.1, 0], shL: [-0.6, 0, -0.5], shR: [-0.6, 0, 0.5],
  root: [0, -0.04, -0.06, -0.1, 0, 0]
};

const GROUND_SCISSOR = {
  hipL: [-1.5, 0, -0.3], kneeL: [0.2, 0, 0], hipR: [-0.6, 0, 0.4], kneeR: [0.9, 0, 0],
  chest: [0.45, 0.3, 0], shL: [-0.4, 0, -0.8], shR: [-0.5, 0, 0.7], elL: [-0.5, 0, 0], elR: [-0.6, 0, 0],
  root: [0, 0, -0.1, -1.0, 0, 0]
};

const RISE_CROUCH = {
  chest: [0.4, 0.2, 0], neck: [0.2, 0, 0],
  shL: [-0.5, 0, -0.3], elL: [-1.4, 0, 0], shR: [-0.6, 0, 0.3], elR: [-1.5, 0, 0],
  hipL: [-0.9, 0, -0.05], kneeL: [1.4, 0, 0], hipR: [-0.2, 0, 0.05], kneeR: [0.9, 0, 0],
  root: [0, -0.3, -0.05, 0.25, 0, 0]
};

const TRIPPED = {
  chest: [0.3, 0.2, 0], shL: [-1.3, 0.3, -0.4], elL: [-0.5, 0, 0], shR: [-1.3, -0.3, 0.4], elR: [-0.5, 0, 0],
  hipL: [-0.8, 0, -0.1], kneeL: [0.6, 0, 0], hipR: [-0.6, 0, 0.1], kneeR: [0.5, 0, 0],
  root: [0, -0.1, 0.05, 0.5, 0, 0]
};

// -- builders -----------------------------------------------------------------

// Body slam: walk in, hoist them overhead, bring them down. The recipient is
// carried through the full arc.
export function buildTakedown({ ax, vx, dir }) {
  const grab = vx - dir * CONTACT;
  const slamX = vx + dir * 0.45;
  return {
    duration: 2100,
    attacker: [
      { t: 0, x: ax, pose: REACH },
      { t: 0.18, x: grab, pose: GRIP },
      { t: 0.42, x: grab, pose: LIFT_HIGH },
      { t: 0.58, x: grab + dir * 0.12, pose: LIFT_HIGH },
      { t: 0.7, x: grab + dir * 0.18, pose: SLAM_FOLLOW },
      { t: 1, x: grab - dir * 0.25, pose: {} }
    ],
    victim: [
      { t: 0, x: vx, pose: GRABBED },
      { t: 0.18, x: vx, pose: GRABBED },
      { t: 0.42, x: vx - dir * 0.05, y: 0.85, pose: LIFTED },
      { t: 0.58, x: vx + dir * 0.1, y: 1.0, pose: LIFTED },
      { t: 0.7, x: slamX, y: 0, pose: "lying" },
      { t: 1, x: slamX, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.18, x: grab + dir * 0.3, y: 1.1, power: 0.8, label: null },
      { t: 0.7, x: slamX, y: 0.35, power: 2.2, label: "SLAM" }
    ]
  };
}

// Aikido redirect: catch the committed attack, pivot, and feed them past you
// to the floor. The recipient travels over and beyond the thrower.
export function buildRedirect({ ax, vx, dir }) {
  // ax: thrower. dir here is the THROWER's facing.
  const catchX = ax + dir * 0.35;
  const landX = ax - dir * 0.55;
  return {
    duration: 1700,
    attacker: [
      { t: 0, x: ax, pose: SHELL_HOLD },
      { t: 0.2, x: ax + dir * 0.08, pose: PIVOT_THROW },
      { t: 0.55, x: ax + dir * 0.05, pose: THROW_RELEASE },
      { t: 1, x: ax, pose: {} }
    ],
    victim: [
      { t: 0, x: vx, pose: STUMBLE_FWD },
      { t: 0.2, x: catchX, pose: STUMBLE_FWD },
      { t: 0.45, x: ax, y: 0.75, pose: FLIP_MID },
      { t: 0.62, x: landX, y: 0, pose: "lying" },
      { t: 1, x: landX, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.62, x: landX, y: 0.3, power: 1.8, label: null }
    ]
  };
}

// Launcher: a cinema-grade super connects and sends them flying off their feet.
export function buildLauncher({ ax, vx, dir }) {
  const strikeX = vx - dir * CONTACT;
  const landX = vx + dir * 1.0;
  return {
    duration: 1500,
    attacker: [
      { t: 0, x: ax, pose: {} },
      { t: 0.16, x: strikeX, pose: COUNTER_PUNCH },
      { t: 0.4, x: strikeX, pose: COUNTER_PUNCH },
      { t: 1, x: strikeX - dir * 0.2, pose: {} }
    ],
    victim: [
      { t: 0, x: vx, pose: HEAD_SNAP },
      { t: 0.16, x: vx, pose: HEAD_SNAP },
      { t: 0.45, x: vx + dir * 0.55, y: 0.5, pose: FLY_BACK },
      { t: 0.68, x: landX, y: 0, pose: "lying" },
      { t: 1, x: landX, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.16, x: vx, y: 1.3, power: 1.6, label: null },
      { t: 0.68, x: landX, y: 0.3, power: 1.4, label: null }
    ]
  };
}

// Krav burst: the block and the answer in the same beat - short and brutal.
export function buildBurst({ ax, vx, dir }) {
  const strikeX = vx - dir * CONTACT;
  return {
    duration: 950,
    attacker: [
      { t: 0, x: ax, pose: SHELL_HOLD },
      { t: 0.3, x: strikeX, pose: COUNTER_PUNCH },
      { t: 0.62, x: strikeX, pose: COUNTER_PUNCH },
      { t: 1, x: ax, pose: {} }
    ],
    victim: [
      { t: 0, x: vx, pose: {} },
      { t: 0.3, x: vx, pose: HEAD_SNAP },
      { t: 0.62, x: vx + dir * 0.22, pose: STUMBLE_BACK },
      { t: 1, x: vx + dir * 0.18, pose: {} }
    ],
    impacts: [
      { t: 0.3, x: vx, y: 1.25, power: 1.2, label: null }
    ]
  };
}

const STUMBLE_BACK = {
  chest: [-0.2, 0.1, 0], neck: [-0.3, 0, 0], shL: [-0.7, 0, -0.5], shR: [-0.7, 0, 0.5],
  root: [0, -0.06, -0.1, -0.12, 0, 0], kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0]
};

// Ground reversal: the downed fighter kept their grip intent - they scissor
// the standing fighter's legs and bring them down, then rise.
export function buildGroundReversal({ ax, vx, dir }) {
  // ax: the DOWNED fighter executing the reversal; dir is their facing.
  const tripX = ax + dir * 0.45;
  return {
    duration: 1700,
    attacker: [
      { t: 0, x: ax, pose: "lying" },
      { t: 0.22, x: ax + dir * 0.15, pose: GROUND_SCISSOR },
      { t: 0.5, x: ax + dir * 0.2, pose: GROUND_SCISSOR },
      { t: 0.75, x: ax + dir * 0.15, pose: RISE_CROUCH },
      { t: 1, x: ax, pose: {} }
    ],
    victim: [
      { t: 0, x: tripX + dir * 0.15, pose: {} },
      { t: 0.22, x: tripX, pose: STUMBLE_FWD },
      { t: 0.5, x: tripX + dir * 0.2, y: 0.25, pose: TRIPPED },
      { t: 0.68, x: tripX + dir * 0.35, y: 0, pose: "lying" },
      { t: 1, x: tripX + dir * 0.35, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.22, x: tripX, y: 0.35, power: 1.0, label: "REVERSAL" },
      { t: 0.68, x: tripX + dir * 0.35, y: 0.3, power: 1.3, label: null }
    ]
  };
}

// Signature art: three advancing strikes, then the finisher sends them down.
export function buildSignature({ ax, vx, dir }) {
  const c1 = vx - dir * (CONTACT + 0.18);
  const c2 = vx - dir * CONTACT;
  const landX = vx + dir * 0.85;
  return {
    duration: 2300,
    attacker: [
      { t: 0, x: ax, pose: REACH },
      { t: 0.18, x: c1, pose: COUNTER_PUNCH },
      { t: 0.36, x: c1, pose: HOOK_ALT },
      { t: 0.54, x: c2, pose: COUNTER_PUNCH },
      { t: 0.72, x: c2, pose: RISING_FINISH },
      { t: 1, x: c2 - dir * 0.3, pose: {} }
    ],
    victim: [
      { t: 0, x: vx, pose: {} },
      { t: 0.18, x: vx, pose: HEAD_SNAP },
      { t: 0.36, x: vx + dir * 0.08, pose: STUMBLE_BACK },
      { t: 0.54, x: vx + dir * 0.14, pose: HEAD_SNAP },
      { t: 0.72, x: vx + dir * 0.4, y: 0.55, pose: FLY_BACK },
      { t: 0.9, x: landX, y: 0, pose: "lying" },
      { t: 1, x: landX, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.18, x: vx, y: 1.3, power: 1.0, label: null },
      { t: 0.36, x: vx, y: 1.1, power: 1.0, label: null },
      { t: 0.54, x: vx + dir * 0.1, y: 1.25, power: 1.2, label: null },
      { t: 0.72, x: vx + dir * 0.3, y: 1.4, power: 2.0, label: null }
    ]
  };
}

const HOOK_ALT = {
  shL: [-1.4, 0.3, 0], elL: [-0.7, 0, 0], shR: [-0.6, 0, 0.3], elR: [-2.2, 0, 0],
  chest: [0.06, 0.5, 0], root: [0, -0.06, 0.16, 0.1, 0, 0]
};

const RISING_FINISH = {
  shR: [-2.6, -0.1, 0.1], elR: [-0.5, 0, 0], shL: [-0.7, 0, -0.3], elL: [-1.8, 0, 0],
  chest: [-0.2, -0.3, 0], root: [0, 0.05, 0.12, -0.14, 0, 0], kneeL: [0.2, 0, 0], kneeR: [0.3, 0, 0]
};

// KO on a normal hit: a clean collapse where they stand.
export function buildCollapse({ ax, vx, dir }) {
  const strikeX = vx - dir * CONTACT;
  return {
    duration: 1600,
    attacker: [
      { t: 0, x: ax, pose: {} },
      { t: 0.15, x: strikeX, pose: COUNTER_PUNCH },
      { t: 0.5, x: strikeX, pose: COUNTER_PUNCH },
      { t: 1, x: strikeX - dir * 0.15, pose: {} }
    ],
    victim: [
      { t: 0, x: vx, pose: HEAD_SNAP },
      { t: 0.3, x: vx + dir * 0.1, pose: STAGGER_DEEP },
      { t: 0.62, x: vx + dir * 0.22, y: 0, pose: "lying" },
      { t: 1, x: vx + dir * 0.22, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.15, x: vx, y: 1.3, power: 1.8, label: null }
    ]
  };
}

const STAGGER_DEEP = {
  chest: [0.35, 0.2, 0], neck: [0.45, 0.2, 0],
  shL: [-0.3, 0, -0.5], elL: [-0.9, 0, 0], shR: [-0.25, 0, 0.5], elR: [-0.8, 0, 0],
  hipL: [-0.2, 0, -0.14], kneeL: [0.7, 0, 0], hipR: [0.05, 0, 0.14], kneeR: [0.6, 0, 0],
  root: [0, -0.18, -0.05, 0.26, 0, 0.1]
};

export const BUILDERS = {
  takedown: buildTakedown,
  redirect: buildRedirect,
  launcher: buildLauncher,
  burst: buildBurst,
  groundReversal: buildGroundReversal,
  signature: buildSignature,
  collapse: buildCollapse
};
