// Impact fighter rig: a procedurally built humanoid (faces, hands, tapered
// limbs, articulated joints) with pose-blend animation and a paired-sequence
// override channel used when two fighters physically interact (slams, throws,
// reversals). No external model files; every mesh is authored here.

import * as THREE from "../../../vendor/three.module.min.js";

const JOINTS = ["spine", "chest", "neck", "head", "shL", "elL", "shR", "elR", "hipL", "kneeL", "hipR", "kneeR"];

const STANCE = {
  spine: [0.06, 0, 0], chest: [0.04, 0.45, 0], neck: [-0.06, -0.28, 0], head: [0, 0, 0],
  shL: [-0.55, 0, -0.12], elL: [-1.85, 0, 0],
  shR: [-0.35, 0, 0.18], elR: [-2.1, 0, 0],
  hipL: [-0.22, 0, -0.05], kneeL: [0.3, 0, 0],
  hipR: [0.14, 0, 0.05], kneeR: [0.28, 0, 0],
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
    shL: [-0.45, 0.2, -0.1], elL: [-1.3, 0, 0], shR: [-0.2, 0, 0.2], elR: [-1.6, 0, 0],
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
    shL: [-0.5, 0.25, -0.3], elL: [-1.1, 0, 0], shR: [-0.35, -0.2, 0.3], elR: [-1.2, 0, 0],
    hipL: [-0.3, 0, -0.1], kneeL: [0.5, 0, 0], hipR: [0.22, 0, 0.1], kneeR: [0.45, 0, 0]
  }
};

const MOVE_POSES = {
  LH: {
    chamber: { shL: [-0.4, 0, -0.1], elL: [-2.2, 0, 0], chest: [0.04, 0.55, 0] },
    extend: { shL: [-1.35, 0.12, 0], elL: [-0.15, 0, 0], chest: [0, -0.2, 0], spine: [0.05, -0.12, 0], root: [0, -0.05, 0.22, 0.08, 0, 0] }
  },
  RH: {
    chamber: { shR: [-0.2, 0, 0.32], elR: [-2.4, 0, 0], chest: [0.06, 0.7, 0] },
    extend: { shR: [-1.45, -0.1, 0], elR: [-0.1, 0, 0], chest: [0.05, -0.5, 0], spine: [0.06, -0.2, 0], root: [0, -0.06, 0.28, 0.1, 0, 0] }
  },
  LL: {
    chamber: { hipL: [-0.55, 0, -0.05], kneeL: [1.6, 0, 0], root: [0, -0.04, 0, -0.04, 0, 0], kneeR: [0.4, 0, 0] },
    extend: { hipL: [-0.5, 0, -0.1], kneeL: [0.25, 0, 0], chest: [0.04, 0.2, 0], root: [0, -0.06, 0.16, -0.08, 0, 0], kneeR: [0.45, 0, 0] }
  },
  RL: {
    chamber: { hipR: [-1.5, 0, 0.08], kneeR: [2.2, 0, 0], chest: [0.04, 0.1, 0], kneeL: [0.15, 0, 0], root: [0, -0.05, 0, -0.06, 0, 0] },
    extend: { hipR: [-1.75, 0, 0.05], kneeR: [0.15, 0, 0], chest: [0.05, -0.4, 0], neck: [0, 0.1, 0], kneeL: [0.12, 0, 0], root: [0, -0.03, 0.2, -0.14, 0, 0] }
  },
  DEF: {
    chamber: { shL: [-1.0, 0, -0.25], elL: [-2.4, 0, 0], shR: [-1.0, 0, 0.25], elR: [-2.4, 0, 0], chest: [0.1, 0.1, 0] },
    extend: {
      shL: [-1.3, 0, -0.35], elL: [-2.7, 0, 0], shR: [-1.3, 0, 0.35], elR: [-2.7, 0, 0],
      chest: [0.14, 0, 0], neck: [0.3, 0, 0], root: [0, -0.1, 0, 0.08, 0, 0], kneeL: [0.4, 0, 0], kneeR: [0.4, 0, 0]
    }
  },
  EV: {
    chamber: { chest: [0.04, 0.6, 0], root: [0.06, -0.04, 0, 0.04, 0.15, 0] },
    extend: {
      chest: [0.06, 0.9, 0], spine: [0.04, 0.3, 0], neck: [0, -0.5, 0],
      shL: [-0.9, 0.4, -0.3], elL: [-1.2, 0, 0], shR: [-1.1, -0.3, 0.4], elR: [-0.8, 0, 0],
      root: [0.22, -0.06, -0.02, 0.06, 0.6, 0.06]
    }
  },
  GR: {
    chamber: { shL: [-0.9, 0.2, -0.15], elL: [-1.6, 0, 0], shR: [-0.9, -0.2, 0.15], elR: [-1.6, 0, 0], root: [0, -0.08, 0, 0.1, 0, 0] },
    extend: {
      shL: [-1.25, 0.25, -0.1], elL: [-0.5, 0, 0], shR: [-1.25, -0.25, 0.1], elR: [-0.5, 0, 0],
      chest: [0.16, 0.05, 0], root: [0, -0.1, 0.26, 0.14, 0, 0], kneeL: [0.45, 0, 0], kneeR: [0.45, 0, 0]
    }
  },
  BR: {
    chamber: { shL: [-0.7, 0.1, -0.1], elL: [-1.9, 0, 0], shR: [-0.7, -0.1, 0.1], elR: [-1.9, 0, 0], chest: [0.08, 0.2, 0] },
    extend: {
      shL: [-1.4, 0.15, 0], elL: [-0.2, 0, 0], shR: [-1.4, -0.15, 0], elR: [-0.2, 0, 0],
      chest: [0.06, 0, 0], root: [0, -0.05, 0.22, 0.1, 0, 0]
    }
  },
  HB: {
    chamber: { neck: [-0.35, 0, 0], chest: [-0.12, 0.1, 0], shL: [-1.0, 0.2, -0.2], elL: [-1.4, 0, 0], shR: [-1.0, -0.2, 0.2], elR: [-1.4, 0, 0], root: [0, -0.04, -0.05, -0.06, 0, 0] },
    extend: {
      neck: [0.55, 0, 0], chest: [0.4, 0, 0], spine: [0.15, 0, 0],
      shL: [-0.9, 0.3, -0.3], elL: [-1.1, 0, 0], shR: [-0.9, -0.3, 0.3], elR: [-1.1, 0, 0],
      root: [0, -0.08, 0.24, 0.18, 0, 0], kneeL: [0.45, 0, 0], kneeR: [0.45, 0, 0]
    }
  }
};

export const LYING = {
  spine: [0, 0, 0], chest: [-0.1, 0, 0], neck: [0.25, 0, 0], head: [0, 0, 0],
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

export function createRig(char, side) {
  const H = char.body.height;
  const bulk = char.body.bulk;
  const shoulders = char.body.shoulders;
  const c = char.colors;

  const dims = {
    thigh: H * 0.25, shin: H * 0.24,
    upper: H * 0.185, fore: H * 0.165,
    hipY: H * 0.25 + H * 0.24 + 0.05,
    shoulderX: H * 0.122 * shoulders,
    hipX: H * 0.06 * Math.max(1, bulk * 0.92),
    headR: H * 0.054
  };

  const mats = [];
  const flashMats = [];
  const accentMats = [];

  function mat(color, opts = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.72, metalness: opts.metal ?? 0.04 });
    if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
    mats.push(m);
    if (opts.flash !== false) flashMats.push(m);
    if (opts.accent) accentMats.push(m);
    return m;
  }

  function capsule(r, len, material) {
    const cyl = Math.max(0.01, len - r * 2);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, cyl, 4, 10), material);
    mesh.castShadow = true;
    return mesh;
  }

  // Tapered limb segment hanging -Y from its joint, with a joint ball on top.
  function limb(rTop, rBottom, len, material, ballScale = 1.05) {
    const g = new THREE.Group();
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, len, 10), material);
    seg.position.y = -len / 2;
    seg.castShadow = true;
    g.add(seg);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(rTop * ballScale, 10, 8), material);
    ball.castShadow = true;
    g.add(ball);
    return g;
  }

  function box(w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.castShadow = true;
    return mesh;
  }

  function sphere(r, material, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    return mesh;
  }

  function joint(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  const co = char.costume;
  const skinM = mat(c.skin);
  const skinShadeM = mat(shade(c.skin, 0.82));
  const torsoColor = co.gi ? c.gi : co.tunic ? c.top : co.bodysuit ? c.suit : co.armor ? c.under : c.skin;
  const pelvisColor = co.trunks ? c.trunks : co.gi ? c.gi : co.tunic ? c.legs : co.bodysuit ? c.suit : co.armor ? c.under : (c.trousers || c.tights || c.suit || 0x222222);
  const legColor = co.trunks ? c.skin : c.trousers || c.tights || (co.bodysuit ? c.suit : co.armor ? c.under : co.gi ? c.giShade : c.legs || 0x202020);
  const armColor = co.gi ? c.gi : co.bodysuit ? c.suit : co.armor ? c.under : co.tunic ? c.top : c.skin;
  const torsoM = mat(torsoColor);
  const pelvisM = mat(pelvisColor);
  const legM = mat(legColor);
  const armM = mat(armColor);
  const hairM = c.hair !== undefined ? mat(c.hair) : skinShadeM;
  const accentM = mat(c.accent, { emissive: c.accent, emissiveIntensity: 0.35, accent: true, metal: 0.1, rough: 0.4 });

  // --- skeleton -------------------------------------------------------------
  const group = new THREE.Group();
  const poseRoot = new THREE.Group();
  group.add(poseRoot);

  const joints = {};
  const hips = joint(poseRoot, 0, dims.hipY, 0);
  joints.hipsRef = hips;

  const pelvis = sphere(H * 0.082 * bulk, pelvisM, 1.3, 0.85, 1.0);
  pelvis.position.y = 0.005;
  hips.add(pelvis);

  joints.spine = joint(hips, 0, H * 0.075, 0);
  const abdomen = sphere(H * 0.072 * bulk, torsoM, 1.12, 1.25, 0.92);
  abdomen.position.y = H * 0.035;
  joints.spine.add(abdomen);

  joints.chest = joint(joints.spine, 0, H * 0.1, 0);
  const chestMesh = capsule(H * 0.08 * bulk, H * 0.22, torsoM);
  chestMesh.scale.x = 1.25 * shoulders;
  chestMesh.position.y = H * 0.1;
  joints.chest.add(chestMesh);
  // Trapezius wedge between shoulders and neck.
  const traps = sphere(H * 0.06 * bulk, torsoM, 1.7 * shoulders, 0.55, 0.8);
  traps.position.y = H * 0.185;
  joints.chest.add(traps);

  joints.neck = joint(joints.chest, 0, H * 0.19, 0);
  const neckMesh = capsule(H * 0.026 * bulk, H * 0.09, co.helm || co.bodysuit ? torsoM : skinM);
  neckMesh.position.y = H * 0.025;
  joints.neck.add(neckMesh);

  joints.head = joint(joints.neck, 0, H * 0.062, 0);
  buildHead();

  function arm(prefix, dir) {
    const sh = joint(joints.chest, dir * dims.shoulderX, H * 0.165, 0);
    const deltoid = sphere(H * 0.048 * bulk, armM);
    sh.add(deltoid);
    const upper = limb(H * 0.034 * bulk, H * 0.027 * bulk, dims.upper, armM);
    sh.add(upper);
    if (co.armbands) {
      const band = capsule(H * 0.04 * bulk, H * 0.045, mat(c.bands, { rough: 0.55 }));
      band.position.y = -dims.upper * 0.3;
      sh.add(band);
    }
    const el = joint(sh, 0, -dims.upper, 0);
    const foreM = co.wraps || co.guards ? mat(c.wraps || c.guards) : armM;
    const fore = limb(H * 0.027 * bulk, H * 0.019 * bulk, dims.fore, foreM);
    el.add(fore);

    // Hand: palm + finger block + thumb reads human without finger bones.
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
    hand.position.y = -dims.fore - H * 0.012;
    hand.rotation.x = -0.25;
    el.add(hand);

    joints[`sh${prefix}`] = sh;
    joints[`el${prefix}`] = el;
    joints[`hand${prefix}`] = hand;
  }
  arm("L", 1);
  arm("R", -1);

  function leg(prefix, dir) {
    const hip = joint(hips, dir * dims.hipX, -H * 0.02, 0);
    const thigh = limb(H * 0.05 * bulk, H * 0.036 * bulk, dims.thigh, legM, 1.12);
    hip.add(thigh);
    const knee = joint(hip, 0, -dims.thigh, 0);
    const shinM = co.boots ? mat(c.boots) : legM;
    const shin = limb(H * 0.035 * bulk, H * 0.02 * bulk, dims.shin, shinM);
    knee.add(shin);
    // Calf bulge.
    const calf = sphere(H * 0.032 * bulk, shinM, 0.9, 1.3, 0.95);
    calf.position.set(0, -dims.shin * 0.28, -H * 0.012);
    knee.add(calf);

    // Foot: heel block + toe block.
    const footM = co.barefoot ? skinM : mat(c.boots || c.guards || 0x14171a);
    const foot = new THREE.Group();
    const heel = box(H * 0.05, H * 0.038, H * 0.07, footM);
    foot.add(heel);
    const toes = box(H * 0.048, H * 0.03, H * 0.075, footM);
    toes.position.set(0, -H * 0.004, H * 0.068);
    foot.add(toes);
    foot.position.set(0, -dims.shin - H * 0.012, H * 0.028);
    knee.add(foot);

    joints[`hip${prefix}`] = hip;
    joints[`knee${prefix}`] = knee;
    joints[`foot${prefix}`] = foot;
  }
  leg("L", 1);
  leg("R", -1);

  buildCostume();

  function buildHead() {
    const r = dims.headR;
    const headM = co.wolfMask ? mat(c.mask) : co.helm ? mat(c.armor, { metal: 0.55, rough: 0.4 }) : skinM;

    // Skull + jaw give an actual head shape instead of a ball.
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
      return; // no face under the helm
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
      // Mouth visible under a lucha mask.
      const mouth = box(r * 0.34, r * 0.05, 0.01, skinShadeM);
      mouth.position.set(0, r * 0.34, r * 0.94);
      joints.head.add(mouth);
      return;
    }

    // Face: eyes, irises, brows, nose, mouth, ears.
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

  // --- costume pieces -------------------------------------------------------
  function buildCostume() {
    const r = dims.headR;
    if (co.gi) {
      for (const [x, ry] of [[-0.5, 0.35], [0.5, -0.35], [0, Math.PI]]) {
        const flap = box(H * 0.085, H * 0.13, 0.012, mat(c.giShade));
        flap.position.set(x * H * 0.08, -H * 0.075, x === 0 ? -H * 0.05 : H * 0.05);
        flap.rotation.y = ry;
        flap.rotation.x = x === 0 ? -0.18 : 0.18;
        hips.add(flap);
      }
      const belt = box(H * 0.2 * bulk, H * 0.028, H * 0.15 * bulk, mat(c.belt));
      belt.position.y = H * 0.045;
      hips.add(belt);
      const knot = box(H * 0.035, H * 0.03, H * 0.02, mat(c.belt));
      knot.position.set(0, H * 0.035, H * 0.082);
      hips.add(knot);
      // Gi lapel V.
      const lapel = box(H * 0.022, H * 0.16, 0.012, mat(c.giShade));
      lapel.position.set(H * 0.03, H * 0.1, H * 0.075);
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
      const bun2 = sphere(r * 0.3, hairM);
      bun2.position.set(r * 0.25, r * 1.7, -r * 0.85);
      if (char.id === "marisol") joints.head.add(bun2); // curlier cluster
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
      sigil.position.set(0, H * 0.105, H * 0.066);
      joints.chest.add(sigil);
      for (const p of ["L", "R"]) {
        const dir = p === "L" ? 1 : -1;
        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(H * 0.052, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(c.armorShade, { metal: 0.6, rough: 0.4 }));
        pauldron.position.set(dir * dims.shoulderX, H * 0.175, 0);
        pauldron.castShadow = true;
        joints.chest.add(pauldron);
        const bracer = box(H * 0.07, dims.fore * 0.7, H * 0.07, mat(c.armorShade, { metal: 0.55, rough: 0.4 }));
        bracer.position.y = -dims.fore * 0.45;
        joints[`el${p}`].add(bracer);
        const greave = box(H * 0.08, dims.shin * 0.62, H * 0.08, mat(c.armorShade, { metal: 0.55, rough: 0.4 }));
        greave.position.y = -dims.shin * 0.42;
        joints[`knee${p}`].add(greave);
      }
    }
    if (co.trunks) {
      for (const dir of [1, -1]) {
        const hem = capsule(H * 0.052 * bulk, H * 0.065, mat(c.trunks));
        hem.position.set(dir * dims.hipX, -H * 0.055, 0);
        hips.add(hem);
      }
    }
    if (co.sash) {
      const sash = box(H * 0.19 * bulk, H * 0.035, H * 0.145 * bulk, mat(c.trim, { metal: 0.15, rough: 0.45 }));
      sash.position.y = H * 0.05;
      hips.add(sash);
      const drape = box(H * 0.05, H * 0.12, 0.01, mat(c.trim));
      drape.position.set(H * 0.06, -H * 0.04, H * 0.068);
      hips.add(drape);
    }
    if (co.cords) {
      for (const dir of [-1, 1]) {
        const cord = box(H * 0.022, H * 0.2, 0.012, mat(c.cords));
        cord.position.set(0, H * 0.09, H * 0.072);
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
    if (co.legWraps) {
      for (const p of ["L", "R"]) {
        const wrap = capsule(H * 0.032 * bulk, dims.shin * 0.45, mat(c.wraps, { rough: 0.6 }));
        wrap.position.y = -dims.shin * 0.68;
        joints[`knee${p}`].add(wrap);
      }
    }
    if (co.kneePads) {
      for (const p of ["L", "R"]) {
        const pad = sphere(H * 0.046, mat(c.boots));
        pad.position.z = H * 0.018;
        joints[`knee${p}`].add(pad);
      }
    }
  }

  // Team ring.
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

  // --- animation state -------------------------------------------------------
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
  let sequence = null; // paired-interaction override: { keys, time, duration }

  applyPoseImmediate(composePose(stanceBase));

  function stancePose() {
    return { ...STANCE, ...(STANCE_FLAVOR[char.id] || {}) };
  }

  function composePose(base, overlay) {
    const out = {};
    for (const j of JOINTS) out[j] = [...(base[j] || [0, 0, 0])];
    out.root = [...(base.root || [0, 0, 0, 0, 0, 0])];
    if (overlay) {
      for (const j of JOINTS) if (overlay[j]) out[j] = [...overlay[j]];
      if (overlay.root) out.root = [...overlay.root];
    }
    return out;
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

  function movePoseGoal(actor) {
    const move = actor.current;
    const lib = move.limb === "ART" ? null : MOVE_POSES[move.limb];
    const t = actor.phaseTime;
    const su = move.startup;
    const total = su + move.active + move.recovery;

    if (move.limb === "ART") return artPose(t / total);
    if (!lib) return { goal: null, rate: 8 };
    if (t < su * 0.55) return { goal: composePose(stanceBase, lib.chamber), rate: 12 };
    if (t < su + move.active) return { goal: composePose(stanceBase, lib.extend), rate: 22 };
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
    if (p < 0.5) return { goal: composePose(stanceBase, MOVE_POSES.RH.extend), rate: 24 };
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
      const height = payload.height || "mid";
      const power = Math.min(2, (payload.damage || 6) / 9);
      const dur = 260 + power * 160;
      if (height === "high") reaction = { dur, time: dur, pose: { neck: [-0.6, 0.2, 0], chest: [-0.22, 0.1, 0], rootZ: -0.1 - power * 0.08 } };
      else if (height === "low") reaction = { dur, time: dur, pose: { rootY: -0.1, chest: [0.22, 0, 0.1], rootZ: -0.05 - power * 0.04 } };
      else reaction = { dur, time: dur, pose: { chest: [0.45, 0.15, 0], neck: [0.32, 0, 0], rootZ: -0.09 - power * 0.07, rootY: -0.04 } };
    } else if (type === "block") {
      reaction = { dur: 180, time: 180, pose: { chest: [0.12, 0, 0], rootZ: -0.04 } };
    } else if (type === "intro") {
      introTimer = 850;
    } else if (type === "celebrate") {
      celebrate = true; defeated = false;
    } else if (type === "defeated") {
      defeated = true; celebrate = false;
    } else if (type === "reset") {
      celebrate = false; defeated = false; reaction = null; sequence = null;
    }
  }

  // Paired-sequence override. keys: [{ t: 0..1, pose, x: worldX, y: lift }],
  // pose entries are overlays on the fighter's stance.
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

    // Paired interaction owns everything while it plays.
    if (sequence) {
      updateSequence(dt, Math.max(dtSec, 0.012));
      updateGlow(actor, t);
      return;
    }

    const dx = targetX - currentX;
    currentX += dx * Math.min(1, dtSec * 11);
    group.position.x = currentX;
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
      m.emissive.setRGB(pulse * 0.45, pulse * 0.4, pulse * 0.38);
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
