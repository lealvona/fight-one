// Replays, ghosts, and share codes. A replay is the input timeline of a match
// (both corners) plus matchup metadata and the RNG seed. Played back, it re-runs
// the same fighters on the same stage with the same seeded AI and feeds the
// recorded inputs on schedule. Encoded as a base64 string to copy/share/keep.

const STORE = "anima.ghosts";

export function createReplay() {
  let rec = null;

  function start(meta) { rec = { meta, events: [], t0: performance.now() }; }
  function record(side, key) {
    if (!rec) return;
    rec.events.push({ t: Math.round(performance.now() - rec.t0), s: side === "player" ? 0 : 1, k: key });
  }
  function stop() {
    if (!rec) return null;
    const data = { meta: rec.meta, events: rec.events };
    rec = null;
    return data;
  }
  function recording() { return !!rec; }

  function encode(data) {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); } catch { return ""; }
  }
  function decode(code) {
    try { return JSON.parse(decodeURIComponent(escape(atob(code.trim())))); } catch { return null; }
  }

  function player(data) {
    let i = 0;
    const events = data.events.slice().sort((a, b) => a.t - b.t);
    return {
      meta: data.meta,
      due(elapsed) { const out = []; while (i < events.length && events[i].t <= elapsed) out.push(events[i++]); return out; },
      done() { return i >= events.length; },
      reset() { i = 0; }
    };
  }

  function ghostKey(meta) { return `${meta.p}_vs_${meta.e}`; }
  function loadGhosts() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
  function saveGhost(data) {
    const all = loadGhosts();
    all[ghostKey(data.meta)] = data;
    try { localStorage.setItem(STORE, JSON.stringify(all)); } catch { /* quota */ }
  }
  function getGhost(p, e) { return loadGhosts()[`${p}_vs_${e}`] || null; }

  return { start, record, stop, recording, encode, decode, player, saveGhost, getGhost };
}

// Deterministic RNG so seeded matches (and thus replays) play out alike.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
