// Create-a-fighter flow: name them, shape them, dress them, pick a discipline
// template (which carries the real moveset, supers, signature and AI persona),
// and spend stat points. Live 3D preview, persisted to localStorage.

import * as THREE from "../../../vendor/three.module.min.js";
import { ROSTER, charById, setCustomFighter } from "./data.js";
import { createRig } from "./rig.js";

const STORE_KEY = "impact.customFighter";

const SKIN_TONES = [0xf2d2b0, 0xe3b58c, 0xd4a27a, 0xb98a63, 0x8a5a3b, 0x5e3b24];
const PALETTE = [0xd8d2c4, 0x1f6f6d, 0xa1262d, 0x4a3f86, 0x232a4d, 0x2e8b57, 0x4b545e, 0xd9a441, 0x14181c, 0xe8e4da, 0x9c2b22, 0x223043];
const ACCENTS = ["#7fd4c1", "#69c7e8", "#e45745", "#b78cff", "#f1bd4b", "#7fe89a", "#e8843d", "#ff8ab0"];
const HAIR_COLORS = [0x14100e, 0x1d1712, 0x4a2f1d, 0x7a4a22, 0x9c8a6a, 0xd8d2c4, 0x8a2c2c, 0x2c4f7c];
const OUTFITS = [
  { id: "gi", name: "Gi" },
  { id: "tunic", name: "Tunic + sash" },
  { id: "trunks", name: "Trunks (bare chest)" },
  { id: "bodysuit", name: "Bodysuit" },
  { id: "armor", name: "Plate armor" }
];
const HAIR_STYLES = ["none", "short", "swept", "bun", "ponytail"];
const EXTRAS = ["headband", "scarf", "cords", "wraps", "legWraps", "armbands", "kneePads"];

const DEFAULT = {
  name: "Nova Kade",
  epithet: "The Unwritten",
  template: "daichi",
  skin: 2, hairStyle: "short", hairColor: 0,
  outfit: "gi", primary: 0, secondary: 11, accent: 0,
  height: 1.76, bulk: 1.0, shoulders: 1.0,
  pwr: 4, spd: 4, grd: 4,
  extras: { headband: false, scarf: false, cords: false, wraps: true, legWraps: false, armbands: false, kneePads: false },
  barefoot: false
};

const POINT_BUDGET = 13;

export function initCreator({ onSaved }) {
  const overlay = document.getElementById("creatorOverlay");
  const form = document.getElementById("creatorForm");
  const previewCanvas = document.getElementById("creatorPreview");
  const openButton = document.getElementById("openCreator");
  const saveButton = document.getElementById("creatorSave");
  const cancelButton = document.getElementById("creatorCancel");
  const deleteButton = document.getElementById("creatorDelete");
  const budgetLabel = document.getElementById("creatorBudget");

  let draft = load() || structuredClone(DEFAULT);
  let renderer = null;
  let scene = null;
  let camera = null;
  let rig = null;
  let pivot = null;
  let rafId = 0;

  // Restore a previously saved fighter into the roster on boot.
  const saved = load();
  if (saved) setCustomFighter(buildChar(saved));

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function pointsUsed(d) {
    return d.pwr + d.spd + d.grd;
  }

  // ---- form -----------------------------------------------------------------

  function field(label, input) {
    const wrap = document.createElement("label");
    wrap.className = "cField";
    const span = document.createElement("span");
    span.textContent = label;
    wrap.append(span, input);
    return wrap;
  }

  function textInput(value, onChange, maxLength = 22) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.maxLength = maxLength;
    input.addEventListener("input", () => onChange(input.value));
    return input;
  }

  function selectInput(options, value, onChange) {
    const select = document.createElement("select");
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    }
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  function slider(min, max, step, value, onChange) {
    const input = document.createElement("input");
    input.type = "range";
    input.min = min; input.max = max; input.step = step; input.value = value;
    input.addEventListener("input", () => onChange(Number(input.value)));
    return input;
  }

  function swatchRow(colors, selected, onChange, asCss = false) {
    const row = document.createElement("div");
    row.className = "swatchRow";
    colors.forEach((color, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch" + (idx === selected ? " on" : "");
      b.style.background = asCss ? color : `#${color.toString(16).padStart(6, "0")}`;
      b.addEventListener("click", () => {
        onChange(idx);
        for (const sib of row.children) sib.classList.remove("on");
        b.classList.add("on");
      });
      row.appendChild(b);
    });
    return row;
  }

  function rebuildForm() {
    form.innerHTML = "";

    form.appendChild(field("Name", textInput(draft.name, v => { draft.name = v; refresh(false); })));
    form.appendChild(field("Epithet", textInput(draft.epithet, v => { draft.epithet = v; refresh(false); })));
    form.appendChild(field("Discipline template", selectInput(
      ROSTER.map(c => ({ value: c.id, label: `${c.discipline} (${c.name.split(" ")[0]}'s school)` })),
      draft.template, v => { draft.template = v; refresh(false); }
    )));

    form.appendChild(field("Skin", swatchRow(SKIN_TONES, draft.skin, i => { draft.skin = i; refresh(); })));
    form.appendChild(field("Hair", selectInput(HAIR_STYLES.map(h => ({ value: h, label: h })), draft.hairStyle, v => { draft.hairStyle = v; refresh(); })));
    form.appendChild(field("Hair color", swatchRow(HAIR_COLORS, draft.hairColor, i => { draft.hairColor = i; refresh(); })));
    form.appendChild(field("Outfit", selectInput(OUTFITS.map(o => ({ value: o.id, label: o.name })), draft.outfit, v => { draft.outfit = v; refresh(); })));
    form.appendChild(field("Primary color", swatchRow(PALETTE, draft.primary, i => { draft.primary = i; refresh(); })));
    form.appendChild(field("Secondary color", swatchRow(PALETTE, draft.secondary, i => { draft.secondary = i; refresh(); })));
    form.appendChild(field("Aura accent", swatchRow(ACCENTS, draft.accent, i => { draft.accent = i; refresh(); }, true)));

    form.appendChild(field(`Height ${draft.height.toFixed(2)}m`, slider(1.55, 2.0, 0.01, draft.height, v => { draft.height = v; refresh(); })));
    form.appendChild(field(`Build ${draft.bulk.toFixed(2)}`, slider(0.72, 1.38, 0.02, draft.bulk, v => { draft.bulk = v; refresh(); })));
    form.appendChild(field(`Shoulders ${draft.shoulders.toFixed(2)}`, slider(0.8, 1.28, 0.02, draft.shoulders, v => { draft.shoulders = v; refresh(); })));

    for (const stat of [["pwr", "Power"], ["spd", "Speed"], ["grd", "Structure"]]) {
      form.appendChild(field(`${stat[1]} ${draft[stat[0]]}`, slider(1, 7, 1, draft[stat[0]], v => {
        const others = pointsUsed(draft) - draft[stat[0]];
        draft[stat[0]] = Math.min(v, POINT_BUDGET - others < 1 ? 1 : POINT_BUDGET - others);
        refresh();
      })));
    }

    const extrasWrap = document.createElement("div");
    extrasWrap.className = "cExtras";
    for (const extra of EXTRAS) {
      const lab = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!draft.extras[extra];
      cb.addEventListener("change", () => { draft.extras[extra] = cb.checked; refresh(); });
      lab.append(cb, document.createTextNode(extra));
      extrasWrap.appendChild(lab);
    }
    const bare = document.createElement("label");
    const bareCb = document.createElement("input");
    bareCb.type = "checkbox";
    bareCb.checked = !!draft.barefoot;
    bareCb.addEventListener("change", () => { draft.barefoot = bareCb.checked; refresh(); });
    bare.append(bareCb, document.createTextNode("barefoot"));
    extrasWrap.appendChild(bare);
    form.appendChild(field("Extras", extrasWrap));
  }

  // ---- character assembly ------------------------------------------------------

  function buildChar(d) {
    const template = charById(d.template);
    const primary = PALETTE[d.primary];
    const secondary = PALETTE[d.secondary];
    const skin = SKIN_TONES[d.skin];
    const hair = HAIR_COLORS[d.hairColor];
    const accent = ACCENTS[d.accent];
    const accentNum = parseInt(accent.slice(1), 16);

    const colors = { skin, hair, accent: accentNum };
    const costume = {};

    if (d.outfit === "gi") {
      Object.assign(colors, { gi: primary, giShade: shade(primary, 0.84), belt: secondary, headband: secondary });
      costume.gi = true;
    } else if (d.outfit === "tunic") {
      Object.assign(colors, { top: primary, topShade: shade(primary, 0.8), trim: secondary, legs: 0x14181c, wraps: secondary });
      costume.tunic = true;
      costume.sash = true;
    } else if (d.outfit === "trunks") {
      Object.assign(colors, { trunks: primary, trim: secondary, wraps: secondary, bands: secondary });
      costume.shirtless = true;
      costume.trunks = true;
      costume.sash = true;
    } else if (d.outfit === "bodysuit") {
      Object.assign(colors, { suit: primary, suitShade: shade(primary, 0.8), cords: secondary, scarf: secondary, guards: 0x14181c });
      costume.bodysuit = true;
    } else if (d.outfit === "armor") {
      Object.assign(colors, { armor: primary, armorShade: shade(primary, 0.78), under: 0x1d2126, visor: secondary, boots: shade(primary, 0.6) });
      costume.helm = true;
      costume.armor = true;
      costume.boots = true;
    }

    colors.wraps = colors.wraps ?? secondary;
    colors.bands = colors.bands ?? secondary;
    colors.headband = colors.headband ?? secondary;
    colors.scarf = colors.scarf ?? secondary;
    colors.cords = colors.cords ?? secondary;
    colors.boots = colors.boots ?? 0x202428;
    colors.trim = colors.trim ?? secondary;

    if (d.hairStyle !== "none" && !costume.helm) costume.hair = d.hairStyle === "ponytail" ? undefined : d.hairStyle;
    if (d.hairStyle === "ponytail" && !costume.helm) costume.ponytail = true;
    for (const extra of EXTRAS) if (d.extras[extra]) costume[extra] = true;
    if (costume.helm) { delete costume.headband; delete costume.scarf; }
    costume.barefoot = !!d.barefoot;
    if (!d.barefoot && d.outfit !== "armor") costume.shoes = true;

    const power = 0.78 + d.pwr * 0.07;
    const speed = 0.78 + d.spd * 0.07;
    const postureMax = 78 + d.grd * 8;

    return {
      id: "custom",
      name: d.name.trim() || "Nova Kade",
      epithet: d.epithet.trim() || "The Unwritten",
      homage: "a fighter of your own making",
      style: template.style,
      discipline: template.discipline,
      blurb: `Forged in the creator. Trained in ${template.discipline}, answerable to no roster.`,
      ui: accent,
      colors,
      body: { height: d.height, bulk: d.bulk, shoulders: d.shoulders },
      costume,
      stats: {
        speed, power, postureMax,
        weight: 0.7 + d.bulk * 0.42,
        wantRange: template.stats.wantRange
      },
      signature: { ...template.signature },
      moves: template.moves,
      ai: { ...template.ai },
      custom: true
    };
  }

  // ---- preview ------------------------------------------------------------------

  function ensurePreview() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true });
    renderer.setSize(previewCanvas.clientWidth, previewCanvas.clientHeight, false);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101418);
    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(2, 5, 6);
    scene.add(sun);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    camera = new THREE.PerspectiveCamera(32, previewCanvas.clientWidth / previewCanvas.clientHeight, 0.1, 20);
    camera.position.set(0, 1.35, 4.4);
    camera.lookAt(0, 0.98, 0);
    pivot = new THREE.Group();
    scene.add(pivot);
  }

  function rebuildPreviewRig() {
    ensurePreview();
    if (rig) {
      pivot.remove(rig.group);
      rig.dispose();
    }
    rig = createRig(buildChar(draft), -1);
    pivot.add(rig.group);
  }

  let last = performance.now();
  function loop(now) {
    if (overlay.classList.contains("hidden")) { rafId = 0; return; }
    const dt = Math.min(40, now - last);
    last = now;
    pivot.rotation.y = -Math.PI / 2 + Math.sin(now * 0.0006) * 0.85;
    if (rig) {
      rig.update(dt, {
        actor: {
          current: null, queue: [], phaseTime: 0, downTime: 0, staggerTime: 0,
          koed: false, hitPulse: 0, flowState: false, posture: 100, postureMax: 100, sway: 0
        },
        game: { mode: "fight" }, t: now, targetX: 0, faceSign: 1
      });
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(loop);
  }

  function refresh(rebuildRig = true) {
    budgetLabel.textContent = `${POINT_BUDGET - pointsUsed(draft)} stat points left`;
    if (rebuildRig) rebuildPreviewRig();
  }

  // ---- open/close/save -------------------------------------------------------------

  function open() {
    draft = load() || structuredClone(DEFAULT);
    rebuildForm();
    overlay.classList.remove("hidden");
    rebuildPreviewRig();
    refresh(false);
    deleteButton.hidden = !load();
    if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(loop); }
  }

  function close() {
    overlay.classList.add("hidden");
  }

  openButton.addEventListener("click", open);
  cancelButton.addEventListener("click", close);
  saveButton.addEventListener("click", () => {
    localStorage.setItem(STORE_KEY, JSON.stringify(draft));
    setCustomFighter(buildChar(draft));
    close();
    onSaved();
  });
  deleteButton.addEventListener("click", () => {
    localStorage.removeItem(STORE_KEY);
    setCustomFighter(null);
    close();
    onSaved();
  });

  return { open };
}

function shade(hex, factor) {
  const r = Math.round(((hex >> 16) & 255) * factor);
  const g = Math.round(((hex >> 8) & 255) * factor);
  const b = Math.round((hex & 255) * factor);
  return (r << 16) | (g << 8) | b;
}
