// The Crucible: an after-hours training hall rendered in full 3D, plus the
// dynamic fight camera and the impact FX pool.

import * as THREE from "../vendor/three.module.min.js";

export function createStage(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06090b);
  scene.fog = new THREE.Fog(0x06090b, 9, 26);

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 60);
  camera.position.set(0, 1.7, 5);

  // --- lighting --------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x4a5862, 0x16191c, 1.5));

  const key = new THREE.DirectionalLight(0xf4efe4, 2.4);
  key.position.set(3, 7.5, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbfd4dd, 0.7);
  fill.position.set(-1, 3, 9);
  scene.add(fill);

  const rimCyan = new THREE.PointLight(0x47c7d9, 30, 14);
  rimCyan.position.set(-4.5, 2.6, -1.5);
  scene.add(rimCyan);
  const rimRed = new THREE.PointLight(0xe45745, 30, 14);
  rimRed.position.set(4.5, 2.6, -1.5);
  scene.add(rimRed);

  // --- arena ------------------------------------------------------------------
  const floorTex = makeFloorTexture();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 48),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.88, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const apron = new THREE.Mesh(
    new THREE.RingGeometry(7.2, 13, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.95 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.012;
  scene.add(apron);

  // Backdrop: the original training-room plate as a far matte painting.
  new THREE.TextureLoader().load("assets/training-room-stage.png", tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 17),
      new THREE.MeshBasicMaterial({ map: tex, color: 0x9aa1a8, fog: true })
    );
    back.position.set(0, 5.4, -14.5);
    scene.add(back);
  });

  // Corner pillars with team-colored strips.
  for (const [x, color] of [[-5.6, 0x47c7d9], [5.6, 0xe45745]]) {
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

  // Overhead light bars, like the source plate.
  const bars = [];
  for (const z of [-2.5, 0.5]) {
    for (const x of [-2.4, 0, 2.4]) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.07, 0.18),
        new THREE.MeshBasicMaterial({ color: 0xf2eee2 })
      );
      bar.position.set(x, 5.1, z);
      scene.add(bar);
      bars.push(bar);
    }
  }

  // Drifting dust for depth.
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 140;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 1] = Math.random() * 5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0x8a949c, size: 0.02, transparent: true, opacity: 0.5, depthWrite: false
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
    canvas.width = 256; canvas.height = 96;
    const c2d = canvas.getContext("2d");
    c2d.font = "900 52px ui-sans-serif, system-ui";
    c2d.textAlign = "center";
    c2d.lineWidth = 9;
    c2d.strokeStyle = "rgba(4,6,8,0.9)";
    c2d.strokeText(text, 128, 62);
    c2d.fillStyle = color;
    c2d.fillText(text, 128, 62);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(0.95, 0.36, 1);
    sprite.position.copy(pos);
    sprite.position.y += 0.18;
    scene.add(sprite);
    floaters.push({ sprite, life: 760, maxLife: 760 });
  }

  function flashRim(side, boost = 60) {
    if (side < 0) rimCyan.intensity = boost;
    else rimRed.intensity = boost;
  }

  // --- camera ------------------------------------------------------------------
  const camState = { midX: 0, dist: 4.6, height: 1.6, focusY: 1.0 };

  function updateCamera(dt, game, midX, separation, t) {
    const dtSec = Math.min(0.05, dt / 1000);
    const targetDist = 2.55 + separation * 0.8;
    const targetHeight = 1.28 + separation * 0.14;
    const cinematic = game.slowMo > 0;

    camState.midX += (midX - camState.midX) * Math.min(1, dtSec * 5);
    const wantDist = cinematic ? Math.max(3.0, targetDist * 0.86) : targetDist;
    camState.dist += (wantDist - camState.dist) * Math.min(1, dtSec * (cinematic ? 6 : 3));
    camState.height += ((cinematic ? targetHeight * 0.92 : targetHeight) - camState.height) * Math.min(1, dtSec * 3);

    const swayX = Math.sin(t * 0.00021) * 0.3;
    const swayY = Math.sin(t * 0.00017) * 0.08;
    const shakeX = (Math.random() - 0.5) * game.shake * 0.014;
    const shakeY = (Math.random() - 0.5) * game.shake * 0.014;

    camera.position.set(
      camState.midX + swayX + shakeX,
      camState.height + swayY + shakeY,
      camState.dist
    );
    camera.lookAt(camState.midX + shakeX * 0.5, camState.focusY + shakeY * 0.5, 0);
  }

  // --- per-frame ------------------------------------------------------------------
  function update(dt, t) {
    dust.rotation.y = t * 0.00002;

    rimCyan.intensity += (30 - rimCyan.intensity) * Math.min(1, dt / 220);
    rimRed.intensity += (30 - rimRed.intensity) * Math.min(1, dt / 220);

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

  return { scene, camera, update, updateCamera, render, resize, spawnSparks, spawnRing, spawnFloater, flashRim };
}

// Procedural mat-floor texture: dark training mats with a center ring.
function makeFloorTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");

  c.fillStyle = "#101417";
  c.fillRect(0, 0, size, size);

  // Mat tiles.
  const tile = size / 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const shade = 14 + ((x + y) % 2) * 5 + Math.random() * 6;
      c.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 6})`;
      c.fillRect(x * tile + 2, y * tile + 2, tile - 4, tile - 4);
    }
  }

  // Wear in the center.
  const wear = c.createRadialGradient(size / 2, size / 2, 60, size / 2, size / 2, size / 2);
  wear.addColorStop(0, "rgba(244,239,228,0.05)");
  wear.addColorStop(0.5, "rgba(0,0,0,0)");
  wear.addColorStop(1, "rgba(0,0,0,0.45)");
  c.fillStyle = wear;
  c.fillRect(0, 0, size, size);

  // Center ring with split colors.
  c.lineWidth = 7;
  c.strokeStyle = "rgba(71,199,217,0.5)";
  c.beginPath();
  c.arc(size / 2, size / 2, size * 0.3, Math.PI * 0.5, Math.PI * 1.5);
  c.stroke();
  c.strokeStyle = "rgba(228,87,69,0.5)";
  c.beginPath();
  c.arc(size / 2, size / 2, size * 0.3, Math.PI * 1.5, Math.PI * 0.5);
  c.stroke();
  c.lineWidth = 3;
  c.strokeStyle = "rgba(244,239,228,0.16)";
  c.beginPath();
  c.arc(size / 2, size / 2, size * 0.085, 0, Math.PI * 2);
  c.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
