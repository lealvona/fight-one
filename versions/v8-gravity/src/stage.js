// Apex stages: three arenas with one fight camera and one FX pool.
//   crucible - the after-hours training hall (the original)
//   helipad  - a corporate rooftop over a glittering skyline
//   shrine   - the vermilion court of a shrine that does not exist

import * as THREE from "../../../vendor/three.module.min.js";

export const STAGES = [
  { id: "crucible", name: "The Crucible", blurb: "after-hours training hall" },
  { id: "helipad", name: "Kuroda Helipad", blurb: "corporate rooftop, midnight" },
  { id: "shrine", name: "Vermilion Court", blurb: "the shrine that does not exist" }
];

const THEMES = {
  crucible: {
    sky: 0x06090b, fog: [9, 26], hemi: [0x4a5862, 0x16191c, 1.25],
    key: 0xfff0da, rims: [0x47c7d9, 0xe45745], floor: "mats",
    floorFinish: { roughness: 0.82, metalness: 0.05, envInt: 0.35 },
    dust: { color: 0x8a949c, count: 140, fall: 0 }
  },
  helipad: {
    sky: 0x040810, fog: [11, 34], hemi: [0x3c4c66, 0x0d1014, 1.15],
    key: 0xdfe9ff, rims: [0x6ab8ff, 0xff9a3d], floor: "helipad",
    floorFinish: { roughness: 0.45, metalness: 0.18, envInt: 0.85 }, // rain-slick concrete
    dust: { color: 0x6a7684, count: 90, fall: 0 }
  },
  shrine: {
    sky: 0x120709, fog: [8, 24], hemi: [0x6a4a44, 0x1a1210, 1.25],
    key: 0xffd9a8, rims: [0xffb347, 0xff5a5a], floor: "stone",
    floorFinish: { roughness: 0.58, metalness: 0.08, envInt: 0.5 }, // lacquered stone
    dust: { color: 0xe89bb0, count: 170, fall: 0.0004 }
  }
};

// Procedural image-based lighting: a tiny emissive "light room" baked through
// PMREM gives every PBR material real reflections - skin sheen, armor glints,
// wet-floor specular - with zero texture assets.
function makeEnvironment(renderer, theme) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(theme.sky);

  function panel(color, w, h, pos, lookAtOrigin = true) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    mesh.position.set(...pos);
    if (lookAtOrigin) mesh.lookAt(0, 0, 0);
    envScene.add(mesh);
  }

  // Ceiling light bars (the key), warm/cool split rims, dim floor bounce.
  panel(new THREE.Color(theme.key).multiplyScalar(4.2), 5, 1.4, [1.5, 6, 2]);
  panel(new THREE.Color(theme.key).multiplyScalar(2.2), 4, 1.2, [-2.5, 5.5, -1]);
  panel(new THREE.Color(theme.rims[0]).multiplyScalar(2.4), 2.4, 5, [-7, 2.4, -2]);
  panel(new THREE.Color(theme.rims[1]).multiplyScalar(2.4), 2.4, 5, [7, 2.4, -2]);
  panel(new THREE.Color(theme.hemi[0]).multiplyScalar(0.7), 10, 10, [0, -4, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(envScene, 0.05);
  pmrem.dispose();
  return rt.texture;
}

export function createStage(renderer, stageId = "crucible") {
  const theme = THEMES[stageId] || THEMES.crucible;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.sky, theme.fog[0], theme.fog[1]);
  scene.environment = makeEnvironment(renderer, theme);

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 80);
  camera.position.set(0, 1.7, 5);

  // --- lighting --------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], theme.hemi[2]));

  const key = new THREE.DirectionalLight(theme.key || 0xf4efe4, 2.1);
  key.position.set(3, 7.5, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbfd4dd, 0.55);
  fill.position.set(-1, 3, 9);
  scene.add(fill);

  const rimL = new THREE.PointLight(theme.rims[0], 30, 14);
  rimL.position.set(-4.5, 2.6, -1.5);
  scene.add(rimL);
  const rimR = new THREE.PointLight(theme.rims[1], 30, 14);
  rimR.position.set(4.5, 2.6, -1.5);
  scene.add(rimR);

  // --- arena ------------------------------------------------------------------
  const floorMat = new THREE.MeshStandardMaterial({
    map: makeFloorTexture(theme.floor),
    roughness: theme.floorFinish.roughness,
    metalness: theme.floorFinish.metalness
  });
  floorMat.envMapIntensity = theme.floorFinish.envInt;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7.2, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const apron = new THREE.Mesh(
    new THREE.RingGeometry(7.2, 16, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.95 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.012;
  scene.add(apron);

  const animated = []; // { obj, fn(t) }
  buildProps();

  function buildProps() {
    if (stageId === "crucible") {
      new THREE.TextureLoader().load("../../assets/training-room-stage.png", tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const back = new THREE.Mesh(
          new THREE.PlaneGeometry(34, 17),
          new THREE.MeshBasicMaterial({ map: tex, color: 0x9aa1a8, fog: true })
        );
        back.position.set(0, 5.4, -14.5);
        scene.add(back);
      });
      for (const [x, color] of [[-5.6, theme.rims[0]], [5.6, theme.rims[1]]]) {
        for (const z of [-3.4, 2.6]) {
          const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 5.4, 0.42),
            new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.8 })
          );
          pillar.position.set(x, 2.7, z);
          scene.add(pillar);
          const strip = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 4.6, 0.05),
            new THREE.MeshBasicMaterial({ color })
          );
          strip.position.set(x + (x < 0 ? 0.24 : -0.24), 2.5, z);
          scene.add(strip);
        }
      }
      for (const z of [-2.5, 0.5]) {
        for (const x of [-2.4, 0, 2.4]) {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.07, 0.18),
            new THREE.MeshBasicMaterial({ color: 0xf2eee2 })
          );
          bar.position.set(x, 5.1, z);
          scene.add(bar);
        }
      }
    }

    if (stageId === "helipad") {
      // Distant skyline: emissive-window towers ringing the pad.
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + 0.12;
        const r = 19 + Math.random() * 9;
        const w = 1.6 + Math.random() * 2.6;
        const h = 4 + Math.random() * 12;
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, w),
          new THREE.MeshStandardMaterial({
            color: 0x0c1016, roughness: 0.9,
            emissive: 0x39465c, emissiveIntensity: 0.22 + Math.random() * 0.25
          })
        );
        tower.position.set(Math.cos(a) * r, h / 2 - 1.6, Math.sin(a) * r - 4);
        scene.add(tower);
      }
      // Antenna masts with blinking beacons.
      for (const [x, z] of [[-5.4, -3.2], [5.4, -3.0]]) {
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.08, 4.6, 6),
          new THREE.MeshStandardMaterial({ color: 0x1a2026, roughness: 0.7, metalness: 0.4 })
        );
        mast.position.set(x, 2.3, z);
        scene.add(mast);
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff3b30 })
        );
        beacon.position.set(x, 4.7, z);
        scene.add(beacon);
        animated.push({ obj: beacon, fn: (t, o) => { o.material.color.setScalar(0); o.material.color.r = 0.55 + Math.sin(t * 0.004 + x) * 0.45; } });
      }
      // Pad edge lights.
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.05, 0.14),
          new THREE.MeshBasicMaterial({ color: 0x57e0a0 })
        );
        lamp.position.set(Math.cos(a) * 6.9, 0.03, Math.sin(a) * 6.9);
        scene.add(lamp);
      }
    }

    if (stageId === "shrine") {
      // Vermilion gate frames flanking the court.
      for (const z of [-4.6, -7.6]) {
        const gate = new THREE.Group();
        const postMat = new THREE.MeshStandardMaterial({ color: 0x9c2b22, roughness: 0.6 });
        for (const x of [-3.4, 3.4]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 5.4, 10), postMat);
          post.position.set(x, 2.7, 0);
          gate.add(post);
        }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.42, 0.5), postMat);
        beam.position.set(0, 5.25, 0);
        beam.rotation.z = 0.0;
        gate.add(beam);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.22, 0.66),
          new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.7 }));
        cap.position.set(0, 5.52, 0);
        gate.add(cap);
        gate.position.z = z;
        scene.add(gate);
      }
      // Hanging lanterns, warm and breathing.
      for (const [x, z] of [[-4.2, -2.2], [4.2, -2.2], [-2.4, -5.2], [2.4, -5.2]]) {
        const lantern = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.5, 0.34),
          new THREE.MeshBasicMaterial({ color: 0xffb35c })
        );
        lantern.position.set(x, 2.6 + Math.random() * 0.6, z);
        scene.add(lantern);
        animated.push({ obj: lantern, fn: (t, o) => { o.material.color.setHex(0xffb35c); const k = 0.8 + Math.sin(t * 0.0023 + x * 3) * 0.2; o.material.color.multiplyScalar(k); } });
        const cord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 2.4, 4),
          new THREE.MeshStandardMaterial({ color: 0x1a1210 })
        );
        cord.position.set(x, lantern.position.y + 1.45, z);
        scene.add(cord);
      }
      const moon = new THREE.Mesh(
        new THREE.CircleGeometry(1.9, 32),
        new THREE.MeshBasicMaterial({ color: 0xf2dfc4, fog: false })
      );
      moon.position.set(5.5, 8.2, -20);
      scene.add(moon);
    }
  }

  // Drifting particles (dust / petals).
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = theme.dust.count;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 1] = Math.random() * 5.5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: theme.dust.color, size: theme.dust.fall ? 0.035 : 0.02,
    transparent: true, opacity: 0.55, depthWrite: false
  }));
  scene.add(dust);

  // --- FX pools ----------------------------------------------------------------
  const sparkPool = [];
  const ringPool = [];
  const floaters = [];

  function spawnSparks(pos, color, power = 1) {
    const count = Math.round(10 + power * 10);
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 3.2,
        Math.random() * 2.6 + 0.6,
        (Math.random() - 0.5) * 3.2
      ).multiplyScalar(0.9 + power * 0.4));
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size: 0.045 + power * 0.02, transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    scene.add(points);
    sparkPool.push({ points, velocities, life: 460, maxLife: 460 });
  }

  function spawnRing(pos, color, power = 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.1, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    ring.position.copy(pos);
    scene.add(ring);
    ringPool.push({ ring, life: 340, maxLife: 340, power });
  }

  function spawnFloater(pos, text, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 96;
    const c2d = canvas.getContext("2d");
    c2d.font = "900 46px ui-sans-serif, system-ui";
    c2d.textAlign = "center";
    c2d.lineWidth = 9;
    c2d.strokeStyle = "rgba(4,6,8,0.9)";
    c2d.strokeText(text, 160, 60);
    c2d.fillStyle = color;
    c2d.fillText(text, 160, 60);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(1.2, 0.36, 1);
    sprite.position.copy(pos);
    sprite.position.y += 0.18;
    scene.add(sprite);
    floaters.push({ sprite, life: 760, maxLife: 760 });
  }

  const flashPool = [];

  // A small hot core right at the contact point - flesh-impact flash.
  function spawnFlash(pos, color, power = 1) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.07 + power * 0.03, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff6e8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    flash.position.copy(pos);
    scene.add(flash);
    flashPool.push({ mesh: flash, life: 130, maxLife: 130, power });
  }

  // Dust kicked up where a body meets the floor.
  function spawnDust(x, power = 1) {
    const count = Math.round(12 + power * 8);
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = 0.05 + Math.random() * 0.1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        Math.random() * 0.9 + 0.2,
        (Math.random() - 0.5) * 1.6
      ).multiplyScalar(0.6 + power * 0.3));
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      color: theme.dust.color, size: 0.06, transparent: true, opacity: 0.65, depthWrite: false
    }));
    scene.add(points);
    sparkPool.push({ points, velocities, life: 700, maxLife: 700 });
  }

  // Quick dolly kick on heavy contact; wantDist recovery pulls it back out.
  function punch(amount = 0.3) {
    camState.dist = Math.max(2.2, camState.dist - amount);
  }

  function flashRim(side, boost = 60) {
    if (side < 0) rimL.intensity = boost;
    else rimR.intensity = boost;
  }

  // --- camera ------------------------------------------------------------------
  // Two framings, smoothly blended: the classic horizontal side view, and an
  // over-the-shoulder chase view behind the player (the SF4-3DS special).
  const camState = { midX: 0, dist: 4.6, height: 1.6, focusY: 1.0, ots: 0 };

  function updateCamera(dt, game, midX, separation, t, view = null) {
    const dtSec = Math.min(0.05, dt / 1000);
    const down = !!(view && view.down);
    const targetDist = 2.55 + separation * 0.8 + (down ? 0.7 : 0);
    const targetHeight = 1.28 + separation * 0.14 + (down ? 0.5 : 0);
    const cinematic = game.slowMo > 0;
    // When a fighter is on the floor, drop the look-at so the fall/get-up frames.
    camState.focusY += ((down ? 0.5 : 1.0) - camState.focusY) * Math.min(1, dtSec * 3);

    camState.midX += (midX - camState.midX) * Math.min(1, dtSec * 5);
    const wantDist = cinematic ? Math.max(3.7, targetDist * 0.92) : targetDist;
    camState.dist += (wantDist - camState.dist) * Math.min(1, dtSec * (cinematic ? 6 : 3));
    camState.height += ((cinematic ? targetHeight * 0.92 + 0.22 : targetHeight) - camState.height) * Math.min(1, dtSec * 3);

    const wantOts = view && view.ots ? 1 : 0;
    camState.ots += (wantOts - camState.ots) * Math.min(1, dtSec * 3.2);
    const mix = camState.ots * camState.ots * (3 - 2 * camState.ots); // smoothstep

    const swayX = Math.sin(t * 0.00021) * 0.3;
    const swayY = Math.sin(t * 0.00017) * 0.08;
    const shakeX = (Math.random() - 0.5) * game.shake * 0.014;
    const shakeY = (Math.random() - 0.5) * game.shake * 0.014;

    // Side framing.
    const sideEye = [camState.midX + swayX, camState.height + swayY, camState.dist];
    const sideLook = [camState.midX, camState.focusY, 0];

    // Over-the-shoulder framing: behind and slightly beside the player rig.
    const px = view ? view.px : -1;
    const ex = view ? view.ex : 1;
    const back = 1.75 + (cinematic ? -0.2 : 0) + separation * 0.14;
    const otsEye = [px - back, 1.74 + separation * 0.05, 0.92];
    const otsLook = [ex + 0.5, 1.05, -0.12];

    camera.position.set(
      sideEye[0] + (otsEye[0] - sideEye[0]) * mix + shakeX,
      sideEye[1] + (otsEye[1] - sideEye[1]) * mix + shakeY,
      sideEye[2] + (otsEye[2] - sideEye[2]) * mix
    );
    camera.lookAt(
      sideLook[0] + (otsLook[0] - sideLook[0]) * mix + shakeX * 0.5,
      sideLook[1] + (otsLook[1] - sideLook[1]) * mix + shakeY * 0.5,
      sideLook[2] + (otsLook[2] - sideLook[2]) * mix
    );
  }

  // --- per-frame ------------------------------------------------------------------
  function update(dt, t) {
    if (theme.dust.fall) {
      const arr = dust.geometry.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        arr[i * 3 + 1] -= theme.dust.fall * dt;
        arr[i * 3] += Math.sin(t * 0.001 + i) * 0.0006 * dt;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 5.5;
      }
      dust.geometry.attributes.position.needsUpdate = true;
    } else {
      dust.rotation.y = t * 0.00002;
    }

    for (const a of animated) a.fn(t, a.obj);

    rimL.intensity += (30 - rimL.intensity) * Math.min(1, dt / 220);
    rimR.intensity += (30 - rimR.intensity) * Math.min(1, dt / 220);

    for (let i = sparkPool.length - 1; i >= 0; i--) {
      const s = sparkPool[i];
      s.life -= dt;
      if (s.life <= 0) {
        scene.remove(s.points);
        s.points.geometry.dispose();
        s.points.material.dispose();
        sparkPool.splice(i, 1);
        continue;
      }
      const arr = s.points.geometry.attributes.position.array;
      for (let p = 0; p < s.velocities.length; p++) {
        const v = s.velocities[p];
        v.y -= 0.0098 * dt;
        arr[p * 3] += v.x * dt * 0.001;
        arr[p * 3 + 1] += v.y * dt * 0.001;
        arr[p * 3 + 2] += v.z * dt * 0.001;
      }
      s.points.geometry.attributes.position.needsUpdate = true;
      s.points.material.opacity = s.life / s.maxLife;
    }

    for (let i = ringPool.length - 1; i >= 0; i--) {
      const r = ringPool[i];
      r.life -= dt;
      if (r.life <= 0) {
        scene.remove(r.ring);
        r.ring.geometry.dispose();
        r.ring.material.dispose();
        ringPool.splice(i, 1);
        continue;
      }
      const k = 1 - r.life / r.maxLife;
      r.ring.scale.setScalar(1 + k * (6 + r.power * 4));
      r.ring.material.opacity = (1 - k) * 0.9;
      r.ring.lookAt(camera.position);
    }

    for (let i = flashPool.length - 1; i >= 0; i--) {
      const f = flashPool[i];
      f.life -= dt;
      if (f.life <= 0) {
        scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        flashPool.splice(i, 1);
        continue;
      }
      const k = 1 - f.life / f.maxLife;
      f.mesh.scale.setScalar(1 + k * (2.2 + f.power));
      f.mesh.material.opacity = (1 - k) * 0.95;
    }

    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      if (f.life <= 0) {
        scene.remove(f.sprite);
        f.sprite.material.map.dispose();
        f.sprite.material.dispose();
        floaters.splice(i, 1);
        continue;
      }
      f.sprite.position.y += dt * 0.0006;
      f.sprite.material.opacity = Math.min(1, f.life / (f.maxLife * 0.55));
    }
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          if (m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
  }

  // --- training hitbox / reach visualizer ------------------------------------
  const debugGroup = new THREE.Group();
  debugGroup.visible = false;
  scene.add(debugGroup);
  const PHASE_COLOR = { startup: 0x6ab8ff, active: 0xe45745, recovery: 0x8a949c };
  const debugHits = {};
  for (const id of ["player", "enemy"]) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false })
    );
    m.visible = false;
    debugGroup.add(m);
    debugHits[id] = m;
  }
  function setDebug(on) { debugGroup.visible = on; if (!on) for (const id in debugHits) debugHits[id].visible = false; }
  function debugStrike(id, pos, phase, radius) {
    const m = debugHits[id];
    if (!m) return;
    m.visible = true;
    m.position.copy(pos);
    m.scale.setScalar(radius);
    m.material.color.setHex(PHASE_COLOR[phase] || 0xffffff);
    m.material.opacity = phase === "active" ? 0.42 : 0.22;
  }
  function debugClear(id) { if (debugHits[id]) debugHits[id].visible = false; }

  return {
    scene, camera, stageId,
    update, updateCamera, render, resize, dispose,
    spawnSparks, spawnRing, spawnFloater, spawnFlash, spawnDust, flashRim, punch,
    setDebug, debugStrike, debugClear
  };
}

// Procedural floor textures per theme.
function makeFloorTexture(style) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");

  if (style === "mats") {
    c.fillStyle = "#101417";
    c.fillRect(0, 0, size, size);
    const tile = size / 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const shade = 14 + ((x + y) % 2) * 5 + Math.random() * 6;
        c.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 6})`;
        c.fillRect(x * tile + 2, y * tile + 2, tile - 4, tile - 4);
      }
    }
    ringMarks(c, size, "rgba(71,199,217,0.5)", "rgba(228,87,69,0.5)");
  }

  if (style === "helipad") {
    c.fillStyle = "#15181d";
    c.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
      const v = 16 + Math.random() * 16;
      c.fillStyle = `rgba(${v},${v + 2},${v + 5},0.5)`;
      c.fillRect(Math.random() * size, Math.random() * size, 2.2, 2.2);
    }
    // Touchdown circle + hazard ticks.
    c.lineWidth = 16;
    c.strokeStyle = "rgba(214,209,196,0.6)";
    c.beginPath();
    c.arc(size / 2, size / 2, size * 0.31, 0, Math.PI * 2);
    c.stroke();
    c.save();
    c.translate(size / 2, size / 2);
    for (let i = 0; i < 24; i++) {
      c.rotate(Math.PI / 12);
      c.fillStyle = i % 2 ? "rgba(233,178,72,0.55)" : "rgba(20,22,26,0.6)";
      c.fillRect(size * 0.385, -14, size * 0.05, 28);
    }
    c.restore();
    c.lineWidth = 4;
    c.strokeStyle = "rgba(214,209,196,0.3)";
    c.beginPath();
    c.arc(size / 2, size / 2, size * 0.09, 0, Math.PI * 2);
    c.stroke();
  }

  if (style === "stone") {
    c.fillStyle = "#221a18";
    c.fillRect(0, 0, size, size);
    const tile = size / 6;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const r = 36 + Math.random() * 10;
        c.fillStyle = `rgb(${r}, ${r - 8}, ${r - 10})`;
        c.fillRect(x * tile + 3, y * tile + 3, tile - 6, tile - 6);
      }
    }
    const wear = c.createRadialGradient(size / 2, size / 2, 80, size / 2, size / 2, size / 2);
    wear.addColorStop(0, "rgba(255,220,180,0.07)");
    wear.addColorStop(1, "rgba(0,0,0,0.5)");
    c.fillStyle = wear;
    c.fillRect(0, 0, size, size);
    ringMarks(c, size, "rgba(233,178,72,0.55)", "rgba(255,90,90,0.45)");
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function ringMarks(c, size, colorA, colorB) {
  const wear = c.createRadialGradient(size / 2, size / 2, 60, size / 2, size / 2, size / 2);
  wear.addColorStop(0, "rgba(244,239,228,0.05)");
  wear.addColorStop(0.5, "rgba(0,0,0,0)");
  wear.addColorStop(1, "rgba(0,0,0,0.45)");
  c.fillStyle = wear;
  c.fillRect(0, 0, size, size);

  c.lineWidth = 7;
  c.strokeStyle = colorA;
  c.beginPath();
  c.arc(size / 2, size / 2, size * 0.3, Math.PI * 0.5, Math.PI * 1.5);
  c.stroke();
  c.strokeStyle = colorB;
  c.beginPath();
  c.arc(size / 2, size / 2, size * 0.3, Math.PI * 1.5, Math.PI * 0.5);
  c.stroke();
  c.lineWidth = 3;
  c.strokeStyle = "rgba(244,239,228,0.16)";
  c.beginPath();
  c.arc(size / 2, size / 2, size * 0.085, 0, Math.PI * 2);
  c.stroke();
}
