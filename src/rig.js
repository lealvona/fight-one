// Fighter rig: a procedurally built, procedurally animated 3D character.
// Characters are assembled from primitives (no external models) with costume
// pieces driven by data.js, and animated by blending between authored poses.

import * as THREE from "../vendor/three.module.min.js";

const JOINTS = ["spine", "chest", "neck", "head", "shL", "elL", "shR", "elR", "hipL", "kneeL", "hipR", "kneeR"];

// A pose maps joints to [rx, ry, rz] plus a root array [x, y, z, rx, ry, rz].
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
  }
};

// Chamber / extend pose pairs per limb tag.
const MOVE_POSES = {
  LH: {
    chamber: { shL: [-0.4, 0, -0.1], elL: [-2.2, 0, 0], chest: [0.04, 0.55, 0] },
    extend: { shL: [-1.35, 0.12, 0], elL: [-0.15, 0, 0], chest: [0, -0.2, 0], spine: [0.05, -0.12, 0], root: [0, -0.05, 0.07, 0.08, 0, 0] }
  },
  RH: {
    chamber: { shR: [-0.2, 0, 0.32], elR: [-2.4, 0, 0], chest: [0.06, 0.7, 0] },
    extend: { shR: [-1.45, -0.1, 0], elR: [-0.1, 0, 0], chest: [0.05, -0.5, 0], spine: [0.06, -0.2, 0], root: [0, -0.06, 0.1, 0.1, 0, 0] }
  },
  LL: {
    chamber: { hipL: [-0.55, 0, -0.05], kneeL: [1.6, 0, 0], root: [0, -0.04, 0, -0.04, 0, 0], kneeR: [0.4, 0, 0] },
    extend: { hipL: [-0.5, 0, -0.1], kneeL: [0.25, 0, 0], chest: [0.04, 0.2, 0], root: [0, -0.06, 0.02, -0.08, 0, 0], kneeR: [0.45, 0, 0] }
  },
  RL: {
    chamber: { hipR: [-1.5, 0, 0.08], kneeR: [2.2, 0, 0], chest: [0.04, 0.1, 0], kneeL: [0.15, 0, 0], root: [0, -0.05, 0, -0.06, 0, 0] },
    extend: { hipR: [-1.75, 0, 0.05], kneeR: [0.15, 0, 0], chest: [0.05, -0.4, 0], neck: [0, 0.1, 0], kneeL: [0.12, 0, 0], root: [0, -0.03, 0.02, -0.14, 0, 0] }
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
      chest: [0.16, 0.05, 0], root: [0, -0.1, 0.12, 0.14, 0, 0], kneeL: [0.45, 0, 0], kneeR: [0.45, 0, 0]
    }
  },
  BR: {
    chamber: { shL: [-0.7, 0.1, -0.1], elL: [-1.9, 0, 0], shR: [-0.7, -0.1, 0.1], elR: [-1.9, 0, 0], chest: [0.08, 0.2, 0] },
    extend: {
      shL: [-1.4, 0.15, 0], elL: [-0.2, 0, 0], shR: [-1.4, -0.15, 0], elR: [-0.2, 0, 0],
      chest: [0.06, 0, 0], root: [0, -0.05, 0.08, 0.1, 0, 0]
    }
  }
};

const LYING = {
  spine: [0, 0, 0], chest: [-0.1, 0, 0], neck: [0.25, 0, 0], head: [0, 0, 0],
  shL: [-0.4, 0, -0.9], elL: [-0.3, 0, 0], shR: [-0.4, 0, 0.9], elR: [-0.3, 0, 0],
  hipL: [-0.3, 0, -0.1], kneeL: [0.5, 0, 0], hipR: [0.15, 0, 0.1], kneeR: [0.3, 0, 0],
  root: [0, 0, -0.18, -1.4, 0, 0] // y filled at runtime from rig height
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

export function createRig(char, side) {
  const H = char.body.height;
  const bulk = char.body.bulk;
  const shoulders = char.body.shoulders;
  const c = char.colors;

  const dims = {
    thigh: H * 0.245, shin: H * 0.235,
    upper: H * 0.185, fore: H * 0.165,
    hipY: H * 0.245 + H * 0.235 + 0.06,
    shoulderX: H * 0.118 * shoulders,
    hipX: H * 0.062 * Math.max(1, bulk * 0.92),
    headR: H * 0.062
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

  function box(w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.castShadow = true;
    return mesh;
  }

  function joint(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  // Costume-aware material choices.
  const skinM = mat(c.skin);
  const torsoColor = char.costume.gi ? c.gi : char.costume.tunic ? c.top : char.costume.bodysuit ? c.suit : char.costume.armor ? c.under : c.skin;
  const pelvisColor = char.costume.gi ? c.gi : char.costume.tunic ? c.legs : char.costume.bodysuit ? c.suit : char.costume.armor ? c.under : (c.trousers || c.tights || c.suit || 0x222222);
  const legColor = c.trousers || c.tights || (char.costume.bodysuit ? c.suit : char.costume.armor ? c.under : char.costume.gi ? c.giShade : c.legs || 0x202020);
  const armColor = char.costume.gi ? c.gi : char.costume.bodysuit ? c.suit : char.costume.armor ? c.under : char.costume.tunic ? c.top : c.skin;
  const torsoM = mat(torsoColor);
  const pelvisM = mat(pelvisColor);
  const legM = mat(legColor);
  const armM = mat(armColor);
  const accentM = mat(c.accent, { emissive: c.accent, emissiveIntensity: 0.35, accent: true, metal: 0.1, rough: 0.4 });

  // --- skeleton -------------------------------------------------------------
  const group = new THREE.Group();           // world placement + facing
  const poseRoot = new THREE.Group();        // root pose offsets
  group.add(poseRoot);

  const joints = {};
  const hips = joint(poseRoot, 0, dims.hipY, 0);
  joints.hipsRef = hips;

  const pelvis = capsule(H * 0.075 * bulk, H * 0.1, pelvisM);
  pelvis.scale.x = 1.25;
  pelvis.position.y = 0.01;
  hips.add(pelvis);

  joints.spine = joint(hips, 0, H * 0.08, 0);
  const abdomen = capsule(H * 0.072 * bulk, H * 0.17, torsoM);
  abdomen.scale.x = 1.18;
  abdomen.position.y = H * 0.035;
  joints.spine.add(abdomen);

  joints.chest = joint(joints.spine, 0, H * 0.1, 0);
  const chestMesh = capsule(H * 0.082 * bulk, H * 0.22, torsoM);
  chestMesh.scale.x = 1.18 * shoulders;
  chestMesh.position.y = H * 0.105;
  joints.chest.add(chestMesh);

  joints.neck = joint(joints.chest, 0, H * 0.185, 0);
  const neckMesh = capsule(H * 0.034 * bulk, H * 0.085, char.costume.helm || char.costume.bodysuit ? torsoM : skinM);
  neckMesh.position.y = H * 0.02;
  joints.neck.add(neckMesh);
  joints.head = joint(joints.neck, 0, H * 0.045, 0);
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(dims.headR, 14, 12), char.costume.wolfMask ? mat(c.mask) : char.costume.helm ? mat(c.armor, { metal: 0.55, rough: 0.4 }) : skinM);
  headMesh.position.y = dims.headR * 0.9;
  headMesh.scale.set(0.92, 1.08, 0.98);
  headMesh.castShadow = true;
  joints.head.add(headMesh);

  function arm(prefix, dir) {
    const sh = joint(joints.chest, dir * dims.shoulderX, H * 0.165, 0);
    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(H * 0.052 * bulk, 10, 8), armM);
    deltoid.castShadow = true;
    sh.add(deltoid);
    const upper = capsule(H * 0.035 * bulk, dims.upper, armM);
    upper.position.y = -dims.upper / 2;
    sh.add(upper);
    const el = joint(sh, 0, -dims.upper, 0);
    const fore = capsule(H * 0.03 * bulk, dims.fore, char.costume.wraps || char.costume.guards ? mat(c.wraps || c.guards) : armM);
    fore.position.y = -dims.fore / 2;
    el.add(fore);
    const fist = box(H * 0.052, H * 0.05, H * 0.056, char.costume.wraps ? mat(c.wraps) : skinM);
    fist.position.y = -dims.fore - H * 0.02;
    el.add(fist);
    joints[`sh${prefix}`] = sh;
    joints[`el${prefix}`] = el;
    joints[`hand${prefix}`] = fist;
  }
  arm("L", 1);
  arm("R", -1);

  function leg(prefix, dir) {
    const hip = joint(hips, dir * dims.hipX, -H * 0.02, 0);
    const thigh = capsule(H * 0.05 * bulk, dims.thigh, legM);
    thigh.position.y = -dims.thigh / 2;
    hip.add(thigh);
    const knee = joint(hip, 0, -dims.thigh, 0);
    const shin = capsule(H * 0.038 * bulk, dims.shin, char.costume.boots ? mat(c.boots) : legM);
    shin.position.y = -dims.shin / 2;
    knee.add(shin);
    const foot = box(H * 0.058, H * 0.042, H * 0.14, char.costume.barefoot ? skinM : mat(c.boots || c.guards || 0x14171a));
    foot.position.set(0, -dims.shin - H * 0.012, H * 0.03);
    knee.add(foot);
    joints[`hip${prefix}`] = hip;
    joints[`knee${prefix}`] = knee;
    joints[`foot${prefix}`] = foot;
  }
  leg("L", 1);
  leg("R", -1);

  buildCostume();

  // Team ring for readability.
  const ringColor = side < 0 ? 0x47c7d9 : 0xe45745;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(H * 0.21, H * 0.26, 36),
    new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  group.add(ring);

  // Flow-state aura.
  const aura = new THREE.PointLight(c.accent, 0, 3.2);
  aura.position.y = dims.hipY + H * 0.2;
  group.add(aura);

  // --- costume pieces -------------------------------------------------------
  function buildCostume() {
    const co = char.costume;
    if (co.gi) {
      for (const [x, ry] of [[-0.5, 0.35], [0.5, -0.35], [0, Math.PI]]) {
        const flap = box(H * 0.085, H * 0.13, 0.012, mat(c.giShade));
        flap.position.set(x * H * 0.08, -H * 0.075, x === 0 ? -H * 0.05 : H * 0.05);
        flap.rotation.y = ry;
        flap.rotation.x = x === 0 ? -0.18 : 0.18;
        hips.add(flap);
      }
      const belt = box(H * 0.21 * bulk, H * 0.028, H * 0.155 * bulk, mat(c.belt));
      belt.position.y = H * 0.045;
      hips.add(belt);
      const knot = box(H * 0.035, H * 0.03, H * 0.02, mat(c.belt));
      knot.position.set(0, H * 0.035, H * 0.085);
      hips.add(knot);
    }
    if (co.headband) {
      const band = box(dims.headR * 2.25, H * 0.02, dims.headR * 2.25, mat(c.headband));
      band.position.y = dims.headR * 1.15;
      joints.head.add(band);
      const tails = new THREE.Group();
      for (const off of [-0.012, 0.012]) {
        const tail = box(H * 0.016, H * 0.1, 0.008, mat(c.headband));
        tail.position.set(off * H, -H * 0.04, -dims.headR * 1.05);
        tail.rotation.x = 0.35;
        tails.add(tail);
      }
      tails.position.y = dims.headR * 1.1;
      joints.head.add(tails);
      joints.clothSway = tails;
    }
    if (co.hair === "short" || co.hair === "swept") {
      const hair = box(dims.headR * 1.8, dims.headR * 0.85, dims.headR * 1.7, mat(c.hair));
      hair.position.set(0, dims.headR * 1.55, co.hair === "swept" ? -dims.headR * 0.35 : -dims.headR * 0.1);
      if (co.hair === "swept") hair.rotation.x = -0.3;
      joints.head.add(hair);
    }
    if (co.hair === "bun") {
      const fringe = box(dims.headR * 1.75, dims.headR * 0.6, dims.headR * 1.7, mat(c.hair));
      fringe.position.set(0, dims.headR * 1.6, 0);
      joints.head.add(fringe);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(dims.headR * 0.5, 8, 8), mat(c.hair));
      bun.position.set(0, dims.headR * 1.8, -dims.headR * 0.75);
      joints.head.add(bun);
    }
    if (co.ponytail) {
      const fringe = box(dims.headR * 1.8, dims.headR * 0.7, dims.headR * 1.75, mat(c.hair));
      fringe.position.set(0, dims.headR * 1.55, 0);
      joints.head.add(fringe);
      const tail = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const seg = capsule(dims.headR * (0.32 - i * 0.07), H * 0.085, mat(c.hair));
        seg.position.y = -H * 0.05 - i * H * 0.075;
        tail.add(seg);
      }
      tail.position.set(0, dims.headR * 1.35, -dims.headR * 1.0);
      tail.rotation.x = 0.5;
      joints.head.add(tail);
      joints.clothSway = tail;
    }
    if (co.mane) {
      const mane = box(dims.headR * 1.7, H * 0.13, dims.headR * 0.7, mat(c.hair));
      mane.position.set(0, dims.headR * 0.4, -dims.headR * 1.05);
      mane.rotation.x = 0.25;
      joints.head.add(mane);
    }
    if (co.wolfMask) {
      const snout = box(dims.headR * 0.85, dims.headR * 0.6, dims.headR * 0.8, mat(c.mask));
      snout.position.set(0, dims.headR * 0.65, dims.headR * 0.85);
      joints.head.add(snout);
      const nose = box(dims.headR * 0.4, dims.headR * 0.25, dims.headR * 0.2, mat(0x101114));
      nose.position.set(0, dims.headR * 0.72, dims.headR * 1.28);
      joints.head.add(nose);
      for (const dir of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(dims.headR * 0.34, dims.headR * 0.85, 6), mat(c.mask));
        ear.position.set(dir * dims.headR * 0.62, dims.headR * 1.95, -dims.headR * 0.15);
        ear.rotation.z = -dir * 0.25;
        joints.head.add(ear);
      }
      const eyeband = box(dims.headR * 1.95, dims.headR * 0.4, dims.headR * 1.6, mat(c.maskAccent, { metal: 0.2, rough: 0.5 }));
      eyeband.position.set(0, dims.headR * 1.05, dims.headR * 0.15);
      joints.head.add(eyeband);
    }
    if (co.helm) {
      const helm = box(dims.headR * 2.3, dims.headR * 2.2, dims.headR * 2.3, mat(c.armor, { metal: 0.6, rough: 0.35 }));
      helm.position.y = dims.headR * 0.95;
      joints.head.add(helm);
      const visor = box(dims.headR * 1.7, dims.headR * 0.32, 0.012, mat(c.visor, { emissive: c.visor, emissiveIntensity: 1.6, accent: true, flash: false }));
      visor.position.set(0, dims.headR * 1.05, dims.headR * 1.17);
      joints.head.add(visor);
    }
    if (co.armor) {
      const plate = box(H * 0.21 * shoulders, H * 0.17, H * 0.13, mat(c.armor, { metal: 0.6, rough: 0.38 }));
      plate.position.y = H * 0.095;
      joints.chest.add(plate);
      const sigil = box(H * 0.04, H * 0.05, 0.01, mat(c.visor, { emissive: c.visor, emissiveIntensity: 1.1, accent: true, flash: false }));
      sigil.position.set(0, H * 0.1, H * 0.068);
      joints.chest.add(sigil);
      for (const p of ["L", "R"]) {
        const dir = p === "L" ? 1 : -1;
        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(H * 0.055, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(c.armorShade, { metal: 0.6, rough: 0.4 }));
        pauldron.position.set(dir * dims.shoulderX, H * 0.175, 0);
        pauldron.castShadow = true;
        joints.chest.add(pauldron);
        const bracer = box(H * 0.075, dims.fore * 0.72, H * 0.075, mat(c.armorShade, { metal: 0.55, rough: 0.4 }));
        bracer.position.y = -dims.fore * 0.45;
        joints[`el${p}`].add(bracer);
        const greave = box(H * 0.085, dims.shin * 0.65, H * 0.085, mat(c.armorShade, { metal: 0.55, rough: 0.4 }));
        greave.position.y = -dims.shin * 0.42;
        joints[`knee${p}`].add(greave);
      }
    }
    if (co.sash) {
      const sash = box(H * 0.2 * bulk, H * 0.035, H * 0.15 * bulk, mat(c.trim, { metal: 0.15, rough: 0.45 }));
      sash.position.y = H * 0.05;
      hips.add(sash);
      const drape = box(H * 0.05, H * 0.12, 0.01, mat(c.trim));
      drape.position.set(H * 0.06, -H * 0.04, H * 0.07);
      hips.add(drape);
    }
    if (co.cords) {
      for (const dir of [-1, 1]) {
        const cord = box(H * 0.022, H * 0.2, 0.012, mat(c.cords));
        cord.position.set(0, H * 0.09, H * 0.075);
        cord.rotation.z = dir * 0.65;
        joints.chest.add(cord);
      }
    }
    if (co.scarf) {
      const wrap = box(dims.headR * 1.9, H * 0.035, dims.headR * 1.9, mat(c.scarf));
      wrap.position.y = H * 0.01;
      joints.neck.add(wrap);
      const tail = box(H * 0.045, H * 0.16, 0.01, mat(c.scarf));
      tail.position.set(0, -H * 0.06, -dims.headR * 0.95);
      tail.rotation.x = 0.4;
      joints.neck.add(tail);
      joints.clothSway = tail;
    }
    if (co.legWraps) {
      for (const p of ["L", "R"]) {
        const wrap = capsule(H * 0.042 * bulk, dims.shin * 0.5, mat(c.wraps, { rough: 0.6 }));
        wrap.position.y = -dims.shin * 0.62;
        joints[`knee${p}`].add(wrap);
      }
    }
    if (co.kneePads) {
      for (const p of ["L", "R"]) {
        const pad = new THREE.Mesh(new THREE.SphereGeometry(H * 0.052, 8, 8), mat(c.boots));
        pad.position.y = 0;
        pad.position.z = H * 0.02;
        joints[`knee${p}`].add(pad);
      }
    }
  }

  // --- animation state -------------------------------------------------------
  const pose = {};
  for (const j of JOINTS) pose[j] = [0, 0, 0];
  pose.root = [0, 0, 0, 0, 0, 0];
  applyPoseImmediate(composePose(stancePose()));

  const stanceBase = stancePose();
  const lying = { ...LYING, root: [...LYING.root] };
  lying.root[1] = -(dims.hipY - H * 0.1);

  let walkPhase = 0;
  let currentX = 0;
  let introTimer = 0;
  let reaction = null;     // { pose, time, dur }
  let celebrate = false;
  let defeated = false;

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
      const target = joints[j === "head" ? "head" : j];
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
    if (t < su * 0.55) return { goal: composePose(stanceBase, lib.chamber), rate: 13 };
    if (t < su + move.active) return { goal: composePose(stanceBase, lib.extend), rate: 24 };
    return { goal: null, rate: 7.5 }; // recovery eases back to stance
  }

  function artPose(p) {
    if (p < 0.26) {
      return {
        goal: composePose(stanceBase, {
          chest: [0.1, 0.8, 0], shL: [-0.3, 0, -0.2], elL: [-2.5, 0, 0], shR: [-0.3, 0, 0.3], elR: [-2.5, 0, 0],
          kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0], root: [0, -0.14, -0.04, 0.1, 0, 0]
        }), rate: 11
      };
    }
    if (p < 0.5) return { goal: composePose(stanceBase, MOVE_POSES.RH.extend), rate: 26 };
    if (p < 0.72) {
      return {
        goal: composePose(stanceBase, {
          shL: [-1.7, 0.1, 0], elL: [-0.6, 0, 0], chest: [0, 0.3, 0], root: [0, -0.02, 0.14, 0.05, 0, 0]
        }), rate: 26
      };
    }
    if (p < 0.88) {
      return {
        goal: composePose(stanceBase, {
          hipR: [-1.5, 0, 0.05], kneeR: [0.5, 0, 0], shL: [-0.6, 0, -0.2], elL: [-1.6, 0, 0],
          chest: [0.05, -0.2, 0], root: [0, 0.02, 0.1, -0.08, 0, 0]
        }), rate: 22
      };
    }
    return { goal: null, rate: 8 };
  }

  function react(type, payload = {}) {
    if (type === "hit") {
      const height = payload.height || "mid";
      const dur = 230 + (payload.damage || 6) * 6;
      if (height === "high") reaction = { dur, time: dur, pose: { neck: [-0.55, 0.2, 0], chest: [-0.18, 0.1, 0], rootZ: -0.07 } };
      else if (height === "low") reaction = { dur, time: dur, pose: { rootY: -0.09, chest: [0.2, 0, 0.1], rootZ: -0.03 } };
      else reaction = { dur, time: dur, pose: { chest: [0.4, 0.15, 0], neck: [0.3, 0, 0], rootZ: -0.06, rootY: -0.04 } };
    } else if (type === "block") {
      reaction = { dur: 160, time: 160, pose: { chest: [0.12, 0, 0], rootZ: -0.03 } };
    } else if (type === "intro") {
      introTimer = 850;
    } else if (type === "celebrate") {
      celebrate = true; defeated = false;
    } else if (type === "defeated") {
      defeated = true; celebrate = false;
    } else if (type === "reset") {
      celebrate = false; defeated = false; reaction = null;
    }
  }

  function update(dt, ctx) {
    const { actor, game, t, targetX, faceSign } = ctx;
    const dtSec = Math.min(0.05, dt / 1000);

    // World placement + locomotion.
    const dx = targetX - currentX;
    currentX += dx * Math.min(1, dtSec * 9);
    group.position.x = currentX;
    group.rotation.y = faceSign > 0 ? Math.PI / 2 : -Math.PI / 2;
    const speed = Math.abs(dx);
    walkPhase += speed * 30;

    // Choose the goal pose.
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
      // Idle life: breath, sway, subtle weight shifts.
      goal.chest[0] += Math.sin(t * 0.0013 + actor.sway) * 0.025;
      goal.root[1] += Math.sin(t * 0.0021 + actor.sway) * 0.009;
      goal.root[5] += Math.sin(t * 0.0009 + actor.sway) * 0.02;
      if (actor.posture < actor.postureMax * 0.3) {
        goal.shL[0] += 0.25; goal.shR[0] += 0.2;
        goal.chest[0] += 0.12; goal.neck[0] += 0.15;
      }
      rate = 6.5;
    }

    // Locomotion overlay while repositioning on foot.
    if (speed > 0.0004 && actor.downTime <= 0 && !actor.koed) {
      const stride = Math.min(0.32, speed * 110);
      goal.hipL[0] += Math.sin(walkPhase) * stride;
      goal.hipR[0] += Math.sin(walkPhase + Math.PI) * stride;
      goal.kneeL[0] += Math.max(0, Math.sin(walkPhase + 1.2)) * stride * 1.1;
      goal.kneeR[0] += Math.max(0, Math.sin(walkPhase + Math.PI + 1.2)) * stride * 1.1;
      goal.root[1] += Math.abs(Math.sin(walkPhase)) * 0.012;
    }

    // Reaction overlay (hit flinches), enveloped and additive.
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

    // Blend toward goal.
    const k = 1 - Math.exp(-rate * dtSec);
    for (const j of JOINTS) {
      pose[j][0] += (goal[j][0] - pose[j][0]) * k;
      pose[j][1] += (goal[j][1] - pose[j][1]) * k;
      pose[j][2] += (goal[j][2] - pose[j][2]) * k;
    }
    for (let i = 0; i < 6; i++) pose.root[i] += (goal.root[i] - pose.root[i]) * k;
    pushPose();

    // Cloth sway (headband tails / ponytail / scarf).
    if (joints.clothSway) {
      joints.clothSway.rotation.x = 0.35 + Math.sin(t * 0.004 + actor.sway) * 0.12 + speed * 6;
      joints.clothSway.rotation.z = Math.sin(t * 0.0031) * 0.08;
    }

    // Hit flash + flow aura.
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

  return { group, update, react, worldPoint, dispose, char };
}
