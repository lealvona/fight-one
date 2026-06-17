// Paired interaction sequences: when a big move connects, both rigs leave
// normal animation and play a synchronized two-body timeline - the executor
// track and the recipient track. Combat is frozen (hit-stop) while these play,
// so the move is *performed*, not implied.
//
// Three things make a throw read as a throw rather than two dolls miming:
//   1. GRIP   - the thrower's hands are IK-seated onto the victim's body
//               (couple.grip), so the hold actually lands instead of waving in
//               the air.
//   2. CARRY  - while the victim is lifted, their body is pinned to the
//               thrower's hands (couple.carry) instead of riding a private
//               track, so the two move as one mass.
//   3. PHYSICS - the rig's sequence player gives vertical motion gravity
//               (accelerate down, decelerate up, no bounce) and lets the body
//               articulate/tumble through the arc instead of planking.
//
// Builders take { ax, vx, dir } - attacker world x, victim world x, and the
// attacker's facing sign (+1 faces +x). They return:
//   { duration, attacker: keys[], victim: keys[], impacts: [...], couple? }
// Key: { t: 0..1, x: worldX, y: lift, pose: overlay | "lying" }
// couple: {
//   grip:  { from, to, vL, vR, w },  // thrower L/R hand -> victim joints vL/vR
//   carry: { from, to, anchor, lift } // victim `anchor` pinned to thrower hands
// }

const CONTACT = 0.52; // bodies touch at roughly this separation

// == thrower overlays =========================================================

const REACH = {
  shL: [-1.15, 0.25, -0.1], elL: [-0.8, 0, 0], shR: [-1.15, -0.25, 0.1], elR: [-0.8, 0, 0],
  chest: [0.16, 0.05, 0], root: [0, -0.12, 0.16, 0.16, 0, 0], kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0]
};

const CLINCH = {
  shL: [-1.4, 0.35, -0.05], elL: [-1.15, 0, 0], shR: [-1.4, -0.35, 0.05], elR: [-1.15, 0, 0],
  chest: [0.24, 0, 0], spine: [0.1, 0, 0], root: [0, -0.16, 0.2, 0.2, 0, 0],
  hipL: [-0.3, 0, -0.05], kneeL: [0.7, 0, 0], hipR: [-0.3, 0, 0.05], kneeR: [0.7, 0, 0]
};

// Level change: drop the hips, scoop the arms under the load.
const SCOOP = {
  shL: [-1.55, 0.3, -0.12], elL: [-1.2, 0, 0], shR: [-1.55, -0.3, 0.12], elR: [-1.2, 0, 0],
  chest: [0.28, 0, 0], spine: [0.12, 0, 0],
  hipL: [-0.55, 0, -0.06], kneeL: [1.0, 0, 0], hipR: [-0.55, 0, 0.06], kneeR: [1.0, 0, 0],
  root: [0, -0.34, 0.2, 0.24, 0, 0]
};

// Press overhead: legs drive tall, arms extend up under the body.
const LIFT_HIGH = {
  shL: [-2.95, 0.18, -0.2], elL: [-0.35, 0, 0], shR: [-2.95, -0.18, 0.2], elR: [-0.35, 0, 0],
  chest: [-0.28, 0, 0], neck: [-0.22, 0, 0], spine: [-0.1, 0, 0],
  root: [0, 0.06, 0.0, -0.14, 0, 0], kneeL: [0.12, 0, 0], kneeR: [0.12, 0, 0]
};

// Drive the load down: torso pitches hard over the slam, arms follow through.
const SLAM_FOLLOW = {
  shL: [-0.75, 0.3, -0.2], elL: [-0.5, 0, 0], shR: [-0.75, -0.3, 0.2], elR: [-0.5, 0, 0],
  chest: [0.6, 0, 0], neck: [0.32, 0, 0], spine: [0.24, 0, 0],
  root: [0, -0.26, 0.12, 0.34, 0, 0], kneeL: [0.95, 0, 0], kneeR: [0.95, 0, 0],
  hipL: [-0.75, 0, -0.06], hipR: [-0.55, 0, 0.06]
};

// == victim overlays ==========================================================

// Hands fight the clinch, weight braced back.
const GRABBED = {
  shL: [-1.05, 0.35, -0.35], elL: [-1.5, 0, 0], shR: [-1.05, -0.35, 0.35], elR: [-1.5, 0, 0],
  chest: [0.16, 0.1, 0], neck: [0.12, 0, 0],
  hipL: [-0.18, 0, -0.08], kneeL: [0.45, 0, 0], hipR: [-0.12, 0, 0.08], kneeR: [0.45, 0, 0],
  root: [0, -0.08, 0.02, 0.14, 0, 0]
};

// Feet leave the floor, body folds over the lift, limbs hang.
const HOISTED = {
  chest: [0.18, 0, 0], spine: [0.1, 0, 0], neck: [0.3, 0.1, 0],
  shL: [0.5, 0.25, -0.2], elL: [-0.55, 0, 0], shR: [0.5, -0.25, 0.2], elR: [-0.55, 0, 0],
  hipL: [0.18, 0, -0.12], kneeL: [0.35, 0, 0], hipR: [0.12, 0, 0.12], kneeR: [0.4, 0, 0],
  root: [0, 0, 0, 1.5, 0, 0.04] // horizontal, face down (carried)
};

// Carried at the apex - same shape, head lolling, arms dangling more.
const HOISTED_APEX = {
  chest: [0.1, 0, 0], spine: [0.05, 0, 0], neck: [0.42, 0.15, 0],
  shL: [0.7, 0.3, -0.25], elL: [-0.7, 0, 0], shR: [0.7, -0.3, 0.25], elR: [-0.7, 0, 0],
  hipL: [0.22, 0, -0.14], kneeL: [0.45, 0, 0], hipR: [0.16, 0, 0.14], kneeR: [0.5, 0, 0],
  root: [0, 0, 0, 1.55, 0, 0.05]
};

// Slammed flat: arms splay from the impact, prone. Blends straight into "lying".
const SLAMMED = {
  chest: [0.05, 0, 0.02], neck: [0.12, 0.45, 0], head: [0, 0.2, 0],
  shL: [-0.2, 0, -0.65], elL: [-0.5, 0, 0], shR: [-0.2, 0, 0.5], elR: [-0.55, 0, 0],
  hipL: [-0.05, 0, -0.2], kneeL: [0.4, 0, 0], hipR: [0.05, 0, 0.16], kneeR: [0.5, 0, 0],
  root: [0, 0, 0, 1.55, 0, 0.05]
};

// Committed forward off a redirect: posted out, falling onto the line.
const STUMBLE_FWD = {
  chest: [0.5, 0.2, 0], neck: [0.35, 0, 0], shL: [-1.0, 0.3, -0.4], elL: [-0.7, 0, 0],
  shR: [-1.0, -0.3, 0.4], elR: [-0.7, 0, 0],
  root: [0, -0.14, 0.18, 0.4, 0, 0], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0]
};

// Mid forward-roll over the wrist lock: tucked, rotating to prone.
const ROLL_MID = {
  chest: [0.45, 0, 0], spine: [0.25, 0, 0], neck: [0.4, 0, 0],
  shL: [-1.4, 0.2, -0.3], elL: [-1.2, 0, 0], shR: [-1.2, -0.2, 0.3], elR: [-1.0, 0, 0],
  hipL: [-1.1, 0, -0.1], kneeL: [1.3, 0, 0], hipR: [-0.9, 0, 0.1], kneeR: [1.2, 0, 0],
  root: [0, 0, 0.1, 1.15, 0, 0.05] // past vertical, tucked over
};

// Struck clean and lifted off the feet - whip back, limbs trail the blow.
const HEAD_SNAP = {
  neck: [-0.7, 0.25, 0], chest: [-0.25, 0.1, 0], shL: [-0.6, 0, -0.5], shR: [-0.6, 0, 0.5],
  root: [0, -0.04, -0.06, -0.1, 0, 0]
};

const FLY_BACK = {
  shL: [-1.7, 0, -0.7], elL: [-0.6, 0, 0], shR: [-1.7, 0, 0.7], elR: [-0.6, 0, 0],
  hipL: [-0.6, 0, -0.12], kneeL: [0.7, 0, 0], hipR: [-0.45, 0, 0.12], kneeR: [0.6, 0, 0],
  neck: [0.2, 0, 0], chest: [0.2, 0, 0],
  root: [0, 0, 0, 0.7, 0, 0] // pitched forward, starting the tumble
};

// Airborne tumble: body curls and rotates past prone, limbs flailing.
const TUMBLE = {
  shL: [-1.2, 0.2, -0.5], elL: [-1.1, 0, 0], shR: [-1.2, -0.2, 0.5], elR: [-1.1, 0, 0],
  hipL: [-1.0, 0, -0.12], kneeL: [1.0, 0, 0], hipR: [-0.85, 0, 0.12], kneeR: [0.9, 0, 0],
  chest: [0.3, 0, 0], spine: [0.18, 0, 0],
  root: [0, 0, 0, 1.9, 0, 0.05] // over the top, heading to prone
};

const STUMBLE_BACK = {
  chest: [-0.2, 0.1, 0], neck: [-0.3, 0, 0], shL: [-0.7, 0, -0.5], shR: [-0.7, 0, 0.5],
  root: [0, -0.06, -0.1, -0.12, 0, 0], kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0]
};

const STAGGER_DEEP = {
  chest: [0.35, 0.2, 0], neck: [0.45, 0.2, 0],
  shL: [-0.3, 0, -0.5], elL: [-0.9, 0, 0], shR: [-0.25, 0, 0.5], elR: [-0.8, 0, 0],
  hipL: [-0.2, 0, -0.14], kneeL: [0.7, 0, 0], hipR: [0.05, 0, 0.14], kneeR: [0.6, 0, 0],
  root: [0, -0.18, -0.05, 0.26, 0, 0.1]
};

// == thrower strike overlays (shared) =========================================

const COUNTER_PUNCH = {
  shR: [-1.5, -0.1, 0], elR: [-0.1, 0, 0], shL: [-1.1, 0, -0.35], elL: [-2.5, 0, 0],
  chest: [0.06, -0.45, 0], spine: [0.05, -0.18, 0], root: [0, -0.07, 0.2, 0.1, 0, 0]
};

const SHELL_HOLD = {
  shL: [-1.3, 0, -0.35], elL: [-2.7, 0, 0], shR: [-1.3, 0, 0.35], elR: [-2.7, 0, 0],
  chest: [0.14, 0, 0], neck: [0.3, 0, 0], root: [0, -0.1, 0, 0.08, 0, 0]
};

const PIVOT_THROW = {
  chest: [0.12, 1.1, 0], spine: [0.05, 0.4, 0],
  shL: [-1.5, 0.5, -0.2], elL: [-0.5, 0, 0], shR: [-1.1, -0.4, 0.3], elR: [-1.0, 0, 0],
  root: [0.1, -0.12, 0.05, 0.1, 0.7, 0.05], kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0]
};

const THROW_RELEASE = {
  chest: [0.3, -0.4, 0], shL: [-0.5, 0.2, -0.3], elL: [-0.4, 0, 0], shR: [-1.6, -0.3, 0.2], elR: [-0.3, 0, 0],
  root: [0.05, -0.16, 0.08, 0.22, -0.3, 0], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0]
};

const HOOK_ALT = {
  shL: [-1.4, 0.3, 0], elL: [-0.7, 0, 0], shR: [-0.6, 0, 0.3], elR: [-2.2, 0, 0],
  chest: [0.06, 0.5, 0], root: [0, -0.06, 0.16, 0.1, 0, 0]
};

const RISING_FINISH = {
  shR: [-2.6, -0.1, 0.1], elR: [-0.5, 0, 0], shL: [-0.7, 0, -0.3], elL: [-1.8, 0, 0],
  chest: [-0.2, -0.3, 0], root: [0, 0.05, 0.12, -0.14, 0, 0], kneeL: [0.2, 0, 0], kneeR: [0.3, 0, 0]
};

// ground reversal
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

// == builders =================================================================

// Body slam: shoot in, clinch, scoop the load overhead, drive it to the mat.
// The victim is gripped and carried the whole way up, then slammed prone.
export function buildTakedown({ ax, vx, dir }) {
  const grab = vx - dir * CONTACT;
  const slamX = grab + dir * 0.5;
  return {
    duration: 2200,
    attacker: [
      { t: 0,    x: ax,   pose: REACH },
      { t: 0.16, x: grab, pose: CLINCH },
      { t: 0.30, x: grab, pose: SCOOP },
      { t: 0.50, x: grab, pose: LIFT_HIGH },
      { t: 0.62, x: grab + dir * 0.06, pose: LIFT_HIGH },
      { t: 0.78, x: grab + dir * 0.22, pose: SLAM_FOLLOW },
      { t: 1,    x: grab - dir * 0.12, pose: {} }
    ],
    victim: [
      { t: 0,    x: vx,   pose: GRABBED },
      { t: 0.16, x: grab + dir * CONTACT, pose: GRABBED },
      { t: 0.30, x: grab + dir * CONTACT, y: 0.55, pose: HOISTED },
      { t: 0.50, x: grab, y: 1.45, pose: HOISTED },
      { t: 0.62, x: grab, y: 1.55, pose: HOISTED_APEX },
      { t: 0.78, x: slamX, y: 0,   pose: SLAMMED },
      { t: 0.9,  x: slamX, y: 0,   pose: "lying" },
      { t: 1,    x: slamX, y: 0,   pose: "lying" }
    ],
    couple: {
      grip:  { from: 0.16, to: 0.78, vL: "hipR", vR: "hipL", w: 0.8 },
      carry: { from: 0.30, to: 0.70, anchor: "chest", lift: 0.0 }
    },
    impacts: [
      { t: 0.16, x: grab + dir * 0.3, y: 1.0, power: 0.6, label: null },
      { t: 0.78, x: slamX, y: 0.3, power: 2.4, label: "SLAM" }
    ]
  };
}

// Aikido redirect: blend with the committed attack, take the wrist, pivot
// (tenkan), and feed them into a forward breakfall - they roll past you to
// the floor. The thrower keeps a hand on the wrist through the lead.
export function buildRedirect({ ax, vx, dir }) {
  // ax: thrower. dir here is the THROWER's facing.
  const catchX = ax + dir * 0.4;
  const landX = ax - dir * 0.7;
  return {
    duration: 1750,
    attacker: [
      { t: 0,    x: ax, pose: SHELL_HOLD },
      { t: 0.2,  x: ax + dir * 0.08, pose: PIVOT_THROW },
      { t: 0.5,  x: ax + dir * 0.04, pose: THROW_RELEASE },
      { t: 1,    x: ax, pose: {} }
    ],
    victim: [
      { t: 0,    x: vx,     pose: STUMBLE_FWD },
      { t: 0.2,  x: catchX, pose: STUMBLE_FWD },
      { t: 0.42, x: ax,     y: 0.62, pose: ROLL_MID },
      { t: 0.6,  x: landX,  y: 0, pose: SLAMMED },
      { t: 0.78, x: landX,  y: 0, pose: "lying" },
      { t: 1,    x: landX,  y: 0, pose: "lying" }
    ],
    couple: {
      grip: { from: 0.05, to: 0.42, vL: "wrR", vR: "wrR", w: 0.65 }
    },
    impacts: [
      { t: 0.6, x: landX, y: 0.3, power: 1.9, label: null }
    ]
  };
}

// Launcher: a cinema super connects and sends them off their feet, tumbling
// over and down to a prone landing.
export function buildLauncher({ ax, vx, dir }) {
  const strikeX = vx - dir * CONTACT;
  const landX = vx + dir * 1.05;
  return {
    duration: 1550,
    attacker: [
      { t: 0,    x: ax, pose: {} },
      { t: 0.16, x: strikeX, pose: COUNTER_PUNCH },
      { t: 0.4,  x: strikeX, pose: COUNTER_PUNCH },
      { t: 1,    x: strikeX - dir * 0.2, pose: {} }
    ],
    victim: [
      { t: 0,    x: vx, pose: HEAD_SNAP },
      { t: 0.16, x: vx, pose: HEAD_SNAP },
      { t: 0.4,  x: vx + dir * 0.5, y: 0.7, pose: FLY_BACK },
      { t: 0.6,  x: vx + dir * 0.85, y: 0.8, pose: TUMBLE },
      { t: 0.8,  x: landX, y: 0, pose: SLAMMED },
      { t: 1,    x: landX, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.16, x: vx, y: 1.3, power: 1.8, label: null },
      { t: 0.8,  x: landX, y: 0.3, power: 1.5, label: null }
    ]
  };
}

// Krav burst: the block and the answer in the same beat - short and brutal.
export function buildBurst({ ax, vx, dir }) {
  const strikeX = vx - dir * CONTACT;
  return {
    duration: 950,
    attacker: [
      { t: 0,    x: ax, pose: SHELL_HOLD },
      { t: 0.3,  x: strikeX, pose: COUNTER_PUNCH },
      { t: 0.62, x: strikeX, pose: COUNTER_PUNCH },
      { t: 1,    x: ax, pose: {} }
    ],
    victim: [
      { t: 0,    x: vx, pose: {} },
      { t: 0.3,  x: vx, pose: HEAD_SNAP },
      { t: 0.62, x: vx + dir * 0.22, pose: STUMBLE_BACK },
      { t: 1,    x: vx + dir * 0.18, pose: {} }
    ],
    impacts: [
      { t: 0.3, x: vx, y: 1.25, power: 1.2, label: null }
    ]
  };
}

// Ground reversal: the downed fighter scissors the standing fighter's legs and
// brings them down, then rises.
export function buildGroundReversal({ ax, vx, dir }) {
  // ax: the DOWNED fighter executing the reversal; dir is their facing.
  const tripX = ax + dir * 0.45;
  return {
    duration: 1750,
    attacker: [
      { t: 0,    x: ax, pose: "lying" },
      { t: 0.22, x: ax + dir * 0.15, pose: GROUND_SCISSOR },
      { t: 0.5,  x: ax + dir * 0.2, pose: GROUND_SCISSOR },
      { t: 0.75, x: ax + dir * 0.15, pose: RISE_CROUCH },
      { t: 1,    x: ax, pose: {} }
    ],
    victim: [
      { t: 0,    x: tripX + dir * 0.15, pose: {} },
      { t: 0.22, x: tripX, pose: STUMBLE_FWD },
      { t: 0.5,  x: tripX + dir * 0.2, y: 0.3, pose: TRIPPED },
      { t: 0.68, x: tripX + dir * 0.35, y: 0, pose: SLAMMED },
      { t: 0.82, x: tripX + dir * 0.35, y: 0, pose: "lying" },
      { t: 1,    x: tripX + dir * 0.35, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.22, x: tripX, y: 0.35, power: 1.0, label: "REVERSAL" },
      { t: 0.68, x: tripX + dir * 0.35, y: 0.3, power: 1.4, label: null }
    ]
  };
}

// Signature art: three advancing strikes, then the finisher sends them down.
export function buildSignature({ ax, vx, dir }) {
  const c1 = vx - dir * (CONTACT + 0.18);
  const c2 = vx - dir * CONTACT;
  const landX = vx + dir * 0.9;
  return {
    duration: 2300,
    attacker: [
      { t: 0,    x: ax, pose: REACH },
      { t: 0.18, x: c1, pose: COUNTER_PUNCH },
      { t: 0.36, x: c1, pose: HOOK_ALT },
      { t: 0.54, x: c2, pose: COUNTER_PUNCH },
      { t: 0.72, x: c2, pose: RISING_FINISH },
      { t: 1,    x: c2 - dir * 0.3, pose: {} }
    ],
    victim: [
      { t: 0,    x: vx, pose: {} },
      { t: 0.18, x: vx, pose: HEAD_SNAP },
      { t: 0.36, x: vx + dir * 0.08, pose: STUMBLE_BACK },
      { t: 0.54, x: vx + dir * 0.14, pose: HEAD_SNAP },
      { t: 0.72, x: vx + dir * 0.45, y: 0.7, pose: TUMBLE },
      { t: 0.9,  x: landX, y: 0, pose: SLAMMED },
      { t: 1,    x: landX, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.18, x: vx, y: 1.3, power: 1.0, label: null },
      { t: 0.36, x: vx, y: 1.1, power: 1.0, label: null },
      { t: 0.54, x: vx + dir * 0.1, y: 1.25, power: 1.2, label: null },
      { t: 0.72, x: vx + dir * 0.3, y: 1.4, power: 2.0, label: null }
    ]
  };
}

// KO on a normal hit: a clean collapse where they stand.
export function buildCollapse({ ax, vx, dir }) {
  const strikeX = vx - dir * CONTACT;
  return {
    duration: 1650,
    attacker: [
      { t: 0,    x: ax, pose: {} },
      { t: 0.15, x: strikeX, pose: COUNTER_PUNCH },
      { t: 0.5,  x: strikeX, pose: COUNTER_PUNCH },
      { t: 1,    x: strikeX - dir * 0.15, pose: {} }
    ],
    victim: [
      { t: 0,    x: vx, pose: HEAD_SNAP },
      { t: 0.3,  x: vx + dir * 0.1, pose: STAGGER_DEEP },
      { t: 0.6,  x: vx + dir * 0.22, y: 0, pose: SLAMMED },
      { t: 1,    x: vx + dir * 0.22, y: 0, pose: "lying" }
    ],
    impacts: [
      { t: 0.15, x: vx, y: 1.3, power: 1.8, label: null }
    ]
  };
}

export const BUILDERS = {
  takedown: buildTakedown,
  redirect: buildRedirect,
  launcher: buildLauncher,
  burst: buildBurst,
  groundReversal: buildGroundReversal,
  signature: buildSignature,
  collapse: buildCollapse
};
