// Opponent brain. Reads the player's visible intent queue (the same queue the
// HUD shows the player) and answers with the new beats matrix, flavored by the
// character's persona. No hidden information, no input reading.

const RESPONSES = {
  // what the AI throws when it reads a given family on the player's side
  strike: { a: 4, s: 3, u: 1 },
  guard: { u: 3, f: 3, d: 3 },
  break: { d: 4, j: 1, k: 1 },
  clinch: { j: 3, k: 2, s: 3 },
  evade: { u: 3, f: 3 },
  art: { s: 6, a: 1 },
  none: { j: 3, k: 2, a: 2, s: 1, d: 1, u: 1 }
};

const PERSONA_BIAS = {
  balanced: {},
  rush: { j: 1.5, k: 1.5, u: 1.4, i: 1.3 },
  pressure: { j: 1.6, k: 1.7, f: 1.4 },
  grappler: { d: 1.9, f: 1.5, a: 1.2 },
  counter: { s: 1.8, a: 1.4 },
  fortress: { a: 1.9, f: 1.5, j: 1.2 }
};

export function aiUpdate(combat, dt, now) {
  const { game, actors } = combat;
  if (game.mode !== "fight" || game.roundLocked) return;

  game.aiClock -= dt;
  if (game.aiClock > 0) return;

  const p = actors.player;
  const e = actors.enemy;
  const persona = e.char.ai;

  if (e.downTime > 0 || e.staggerTime > 0) {
    game.aiClock = 240;
    return;
  }

  // Respect the player's pace: if they are idle, probe gently instead of mauling.
  const playerIdleMs = now - game.lastPlayerIntent;
  if (playerIdleMs > 2600 && !p.queue.length && !p.current) {
    game.aiClock = 430;
    if (e.queue.length === 0 && !e.current && Math.random() < 0.2) {
      combat.intent("enemy", weightedPick({ a: 2, s: 1, j: 1 }), now);
    }
    return;
  }

  // Signature art when in flow state and the moment is right.
  if (e.flowState && game.range < 0.62 && p.downTime <= 0 && Math.random() < 0.35) {
    combat.intent("enemy", "g", now);
    game.aiClock = baseDelay(persona, p.tempo) + 200;
    return;
  }

  const seen = p.queue[0] || p.current;
  let table;
  if (!seen) {
    table = { ...RESPONSES.none };
  } else if (Math.random() < persona.readSkill) {
    table = { ...(RESPONSES[seen.family] || RESPONSES.none) };
  } else {
    table = { ...RESPONSES.none };
  }

  // Persona flavor.
  const bias = PERSONA_BIAS[persona.persona] || {};
  for (const key of Object.keys(table)) {
    if (bias[key]) table[key] *= bias[key];
  }

  // Spacing instinct: drift toward the range this fighter wants.
  const want = e.char.stats.wantRange;
  if (game.range > want + 0.18) {
    table.k = (table.k || 0) + 2.2; // lunging cross closes
    table.d = (table.d || 0) + (persona.persona === "grappler" ? 2.6 : 1.2);
    table.i = (table.i || 0) + 1.4; // kicks reach
    delete table.j; // jab would whiff long
  } else if (game.range < want - 0.18) {
    table.f = (table.f || 0) + 2.4; // shove out
    table.s = (table.s || 0) + 1.6; // angle off
  }

  // Don't queue range-gated moves that would clearly whiff.
  if (game.range > 0.5) delete table.d;
  if (game.range > 0.62) { delete table.j; delete table.k; }
  if (game.range < 0.1) delete table.i;

  const keys = Object.keys(table);
  if (!keys.length) {
    game.aiClock = 300;
    return;
  }

  const pick = weightedPick(table);
  combat.intent("enemy", pick, now);
  combat.game.aiClock = baseDelay(persona, p.tempo) + Math.random() * 260;
}

function baseDelay(persona, playerTempo) {
  const base = 780 - persona.aggression * 360;
  return base - Math.min(220, playerTempo * 180);
}

function weightedPick(table) {
  const entries = Object.entries(table);
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[0][0];
}
