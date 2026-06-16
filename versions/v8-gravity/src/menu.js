// Options + settings: volumes, quality tiers (drive the renderer),
// accessibility (reduced motion, high contrast, large UI), and rebindable
// P1 controls. Persists to localStorage and applies live.

const DEFAULTS = {
  quality: "high",
  reducedMotion: false,
  highContrast: false,
  largeUI: false,
  keys: { j: "j", k: "k", u: "u", i: "i", a: "a", s: "s", d: "d", f: "f", g: "g" }
};

const ACTION_LABELS = {
  j: "Lead hand", k: "Rear hand", u: "Low kick", i: "High kick",
  a: "Shell", s: "Slip / Redirect", d: "Clinch", f: "Shove", g: "Signature"
};

export function createMenu({ audio, renderer, onQuality }) {
  const settings = load();
  applyAccessibility();
  applyQuality();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem("anima.settings"));
      return { ...DEFAULTS, ...(raw || {}), keys: { ...DEFAULTS.keys, ...(raw?.keys || {}) } };
    } catch { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  function save() { localStorage.setItem("anima.settings", JSON.stringify(settings)); }

  function applyAccessibility() {
    document.body.classList.toggle("a11y-contrast", settings.highContrast);
    document.body.classList.toggle("a11y-large", settings.largeUI);
  }
  function applyQuality() {
    const q = settings.quality;
    const ratio = q === "low" ? 1 : q === "medium" ? Math.min(1.5, devicePixelRatio || 1) : Math.min(2, devicePixelRatio || 1);
    renderer.setPixelRatio(ratio);
    renderer.shadowMap.enabled = q !== "low";
    document.body.classList.toggle("no-grain", q === "low");
    if (onQuality) onQuality(q);
  }

  const overlay = document.createElement("div");
  overlay.className = "optionsOverlay hidden";
  document.body.appendChild(overlay);
  let rebinding = null;

  function row(label, control) {
    const r = document.createElement("div"); r.className = "optRow";
    const l = document.createElement("span"); l.textContent = label;
    r.append(l, control); return r;
  }
  function slider(kind, def) {
    const input = document.createElement("input");
    input.type = "range"; input.min = 0; input.max = 1; input.step = 0.05;
    input.value = audio.getLevel(kind, def);
    input.addEventListener("input", () => { audio.resume(); audio.setLevel(kind, Number(input.value)); });
    return input;
  }
  function select(options, value, onChange) {
    const s = document.createElement("select");
    for (const o of options) { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; s.appendChild(opt); }
    s.value = value; s.addEventListener("change", () => onChange(s.value)); return s;
  }
  function checkbox(value, onChange) {
    const c = document.createElement("input"); c.type = "checkbox"; c.checked = value;
    c.addEventListener("change", () => onChange(c.checked)); return c;
  }
  function sectionTitle(t) { const s = document.createElement("div"); s.className = "optSection"; s.textContent = t; return s; }

  function build() {
    overlay.innerHTML = `<div class="optionsCard"><div class="optTitle">Options</div><div class="optBody"></div><div class="optFoot"><button class="startButton" id="optClose">Done</button></div></div>`;
    const body = overlay.querySelector(".optBody");
    body.appendChild(sectionTitle("Audio"));
    body.appendChild(row("Master", slider("master", 0.8)));
    body.appendChild(row("Music", slider("music", 0.5)));
    body.appendChild(row("Effects", slider("sfx", 0.9)));
    body.appendChild(row("Crowd", slider("crowd", 0.4)));
    body.appendChild(sectionTitle("Display"));
    body.appendChild(row("Quality", select(["high", "medium", "low"], settings.quality, v => { settings.quality = v; save(); applyQuality(); })));
    body.appendChild(row("Reduced motion", checkbox(settings.reducedMotion, v => { settings.reducedMotion = v; save(); })));
    body.appendChild(row("High contrast UI", checkbox(settings.highContrast, v => { settings.highContrast = v; save(); applyAccessibility(); })));
    body.appendChild(row("Large UI", checkbox(settings.largeUI, v => { settings.largeUI = v; save(); applyAccessibility(); })));
    body.appendChild(sectionTitle("Controls (Player 1)"));
    const binds = document.createElement("div"); binds.className = "optBinds";
    for (const action of Object.keys(ACTION_LABELS)) {
      const b = document.createElement("button");
      b.className = "bindBtn"; b.dataset.action = action;
      b.innerHTML = `<i>${ACTION_LABELS[action]}</i><b>${settings.keys[action].toUpperCase()}</b>`;
      b.addEventListener("click", () => { rebinding = action; b.classList.add("listening"); b.querySelector("b").textContent = "..."; });
      binds.appendChild(b);
    }
    body.appendChild(binds);
    overlay.querySelector("#optClose").addEventListener("click", close);
  }

  function open() { build(); overlay.classList.remove("hidden"); }
  function close() { overlay.classList.add("hidden"); rebinding = null; }
  function isOpen() { return !overlay.classList.contains("hidden"); }

  addEventListener("keydown", e => {
    if (!rebinding) return;
    e.preventDefault(); e.stopPropagation();
    const key = e.key.toLowerCase();
    if (key.length === 1) {
      settings.keys[rebinding] = key; save();
      const btn = overlay.querySelector(`.bindBtn[data-action="${rebinding}"]`);
      if (btn) { btn.classList.remove("listening"); btn.querySelector("b").textContent = key.toUpperCase(); }
      rebinding = null;
    }
  }, true);

  function keymap() {
    const map = {};
    for (const action of Object.keys(settings.keys)) map[settings.keys[action]] = action;
    return map;
  }

  return { settings, open, close, isOpen, keymap, applyQuality };
}
