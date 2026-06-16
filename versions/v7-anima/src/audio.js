// Procedural fight audio: every sound synthesized, no asset files.
//   impact SFX, adaptive per-stage music bed, crowd ambience + cheers,
//   per-fighter kiai, and a spoken announcer via SpeechSynthesis.
// Master/music/sfx/crowd levels are live-adjustable from Options.

export function createAudio() {
  let ctx = null;
  let master = null, sfxBus = null, musicBus = null, crowdBus = null;
  const levels = loadLevels();
  let music = null, crowd = null;

  function loadLevels() { try { return JSON.parse(localStorage.getItem("anima.audio")) || {}; } catch { return {}; } }
  const vol = (k, d) => (levels[k] === undefined ? d : levels[k]);

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = vol("master", 0.8); master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = vol("sfx", 0.9); sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = vol("music", 0.5); musicBus.connect(master);
      crowdBus = ctx.createGain(); crowdBus.gain.value = vol("crowd", 0.4); crowdBus.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function setLevel(kind, value) {
    levels[kind] = value;
    localStorage.setItem("anima.audio", JSON.stringify(levels));
    if (!ctx) return;
    const bus = { master, sfx: sfxBus, music: musicBus, crowd: crowdBus }[kind];
    if (bus) bus.gain.setTargetAtTime(value, ctx.currentTime, 0.05);
  }
  function getLevel(kind, d) { return vol(kind, d); }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  function envGain(bus, peak, attack, decay) {
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(bus); return g;
  }
  function tone(type, from, to, peak, attack, decay, bus) {
    if (!ensure()) return;
    const osc = ctx.createOscillator(); osc.type = type;
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + attack + decay);
    osc.connect(envGain(bus || sfxBus, peak, attack, decay));
    osc.start(t); osc.stop(t + attack + decay + 0.05);
  }
  function noise(peak, attack, decay, filterType = "bandpass", from = 900, to = 300, q = 1, bus) {
    if (!ensure()) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(attack + decay + 0.05);
    const filter = ctx.createBiquadFilter(); filter.type = filterType; filter.Q.value = q;
    const t = ctx.currentTime;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + attack + decay);
    src.connect(filter); filter.connect(envGain(bus || sfxBus, peak, attack, decay));
    src.start(t); src.stop(t + attack + decay + 0.05);
  }

  // ---- announcer ----
  let voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const vs = window.speechSynthesis.getVoices();
    return vs.find(v => /en[-_]/i.test(v.lang) && /male|daniel|fred|alex|google uk/i.test(v.name)) || vs.find(v => /en/i.test(v.lang)) || vs[0] || null;
  }
  function announce(text) {
    if (!window.speechSynthesis) return;
    try {
      if (!voice) voice = pickVoice();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 0.86; u.pitch = 0.7; u.volume = vol("master", 0.8);
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch { /* announcer optional */ }
  }

  // ---- music bed ----
  const STAGE_MUSIC = {
    crucible: { root: 55, scale: [0, 3, 5, 7, 10], bpm: 96, wave: "sawtooth" },
    helipad: { root: 49, scale: [0, 2, 3, 7, 9], bpm: 112, wave: "square" },
    shrine: { root: 58, scale: [0, 2, 4, 7, 9], bpm: 84, wave: "triangle" }
  };
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function startMusic(stageId, intensity = 0.5) {
    if (!ensure()) return;
    stopMusic();
    const cfg = STAGE_MUSIC[stageId] || STAGE_MUSIC.crucible;
    const beat = 60 / cfg.bpm;
    const state = { cfg, beat, next: ctx.currentTime + 0.1, step: 0, intensity, timer: null };
    const drone = ctx.createOscillator(); drone.type = "sine"; drone.frequency.value = midi(cfg.root - 12);
    const droneG = ctx.createGain(); droneG.gain.value = 0.12; drone.connect(droneG); droneG.connect(musicBus); drone.start();
    state.drone = drone;
    function schedule() {
      if (!ctx) return;
      while (state.next < ctx.currentTime + 0.2) {
        const t = state.next, sx = state.step;
        if (sx % 2 === 0) {
          const o = ctx.createOscillator(); o.type = cfg.wave;
          o.frequency.value = midi(cfg.root - 12 + cfg.scale[(sx / 2) % cfg.scale.length]);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.16 * (0.6 + state.intensity), t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.9);
          o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + beat);
        }
        if (Math.random() < 0.25 + state.intensity * 0.4) {
          const o = ctx.createOscillator(); o.type = "triangle";
          o.frequency.value = midi(cfg.root + 12 + cfg.scale[Math.floor(Math.random() * cfg.scale.length)]);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.06 + state.intensity * 0.05, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.6);
          o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + beat);
        }
        noise(0.03 + state.intensity * 0.03, 0.002, 0.03, "highpass", 6000, 6000, 1, musicBus);
        state.next += beat / 2; state.step++;
      }
    }
    state.timer = setInterval(schedule, 60);
    schedule();
    music = state;
  }
  function setIntensity(v) { if (music) music.intensity = Math.max(0, Math.min(1, v)); }
  function stopMusic() { if (!music) return; clearInterval(music.timer); try { music.drone.stop(); } catch {} music = null; }

  // ---- crowd ----
  function startCrowd() {
    if (!ensure() || crowd) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(2); src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 600; filter.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0.08;
    src.connect(filter); filter.connect(g); g.connect(crowdBus); src.start();
    crowd = { src, g };
  }
  function cheer(power = 1) {
    if (!crowd) return;
    const t = ctx.currentTime;
    crowd.g.gain.cancelScheduledValues(t);
    crowd.g.gain.setValueAtTime(crowd.g.gain.value, t);
    crowd.g.gain.linearRampToValueAtTime(0.08 + 0.22 * power, t + 0.12);
    crowd.g.gain.linearRampToValueAtTime(0.08, t + 0.9 + power * 0.6);
  }
  function stopCrowd() { if (crowd) { try { crowd.src.stop(); } catch {} crowd = null; } }

  return {
    resume: ensure, setLevel, getLevel,
    thud(power = 1) { tone("sine", 110 + power * 20, 38, 0.5 + power * 0.2, 0.008, 0.16 + power * 0.05); noise(0.25, 0.004, 0.07, "lowpass", 1400, 200); },
    heavy() { tone("sine", 130, 30, 0.85, 0.01, 0.3); noise(0.4, 0.006, 0.16, "lowpass", 1100, 120); cheer(0.6); },
    swoosh() { noise(0.16, 0.03, 0.13, "bandpass", 500, 2400, 1.6); },
    clink() { tone("square", 2200, 900, 0.1, 0.004, 0.07); noise(0.14, 0.004, 0.05, "highpass", 2800, 4200); },
    crack() { noise(0.45, 0.004, 0.2, "bandpass", 2600, 300, 0.8); tone("sine", 200, 50, 0.4, 0.008, 0.18); },
    chime() { tone("sine", 660, 660, 0.16, 0.01, 0.3); setTimeout(() => tone("sine", 990, 990, 0.14, 0.01, 0.4), 90); },
    boom() { tone("sine", 90, 24, 1.0, 0.012, 0.7); noise(0.5, 0.01, 0.5, "lowpass", 900, 60); cheer(1); },
    kiai(pitch = 1) { tone("sawtooth", 300 * pitch, 180 * pitch, 0.18, 0.02, 0.18); noise(0.12, 0.02, 0.16, "bandpass", 900 * pitch, 500 * pitch, 1.2); },
    announce, startMusic, stopMusic, setIntensity, startCrowd, cheer, stopCrowd
  };
}
