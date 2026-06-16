// Procedural fight audio: every sound is synthesized, no asset files.
// The context resumes on first user gesture (autoplay policy safe).

export function createAudio() {
  let ctx = null;
  let master = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function envGain(peak, attack, decay) {
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(master);
    return g;
  }

  function tone(type, from, to, peak, attack, decay) {
    if (!ensure()) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + attack + decay);
    osc.connect(envGain(peak, attack, decay));
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  function noise(peak, attack, decay, filterType = "bandpass", from = 900, to = 300, q = 1) {
    if (!ensure()) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(attack + decay + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    const t = ctx.currentTime;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + attack + decay);
    src.connect(filter);
    filter.connect(envGain(peak, attack, decay));
    src.start(t);
    src.stop(t + attack + decay + 0.05);
  }

  return {
    resume: ensure,
    thud(power = 1) {
      tone("sine", 110 + power * 20, 38, 0.5 + power * 0.2, 0.008, 0.16 + power * 0.05);
      noise(0.25, 0.004, 0.07, "lowpass", 1400, 200);
    },
    heavy() {
      tone("sine", 130, 30, 0.85, 0.01, 0.3);
      noise(0.4, 0.006, 0.16, "lowpass", 1100, 120);
    },
    swoosh() {
      noise(0.16, 0.03, 0.13, "bandpass", 500, 2400, 1.6);
    },
    clink() {
      tone("square", 2200, 900, 0.1, 0.004, 0.07);
      noise(0.14, 0.004, 0.05, "highpass", 2800, 4200);
    },
    crack() {
      noise(0.45, 0.004, 0.2, "bandpass", 2600, 300, 0.8);
      tone("sine", 200, 50, 0.4, 0.008, 0.18);
    },
    chime() {
      tone("sine", 660, 660, 0.16, 0.01, 0.3);
      setTimeout(() => tone("sine", 990, 990, 0.14, 0.01, 0.4), 90);
    },
    boom() {
      tone("sine", 90, 24, 1.0, 0.012, 0.7);
      noise(0.5, 0.01, 0.5, "lowpass", 900, 60);
    }
  };
}
