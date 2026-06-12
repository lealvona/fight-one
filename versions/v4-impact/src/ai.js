// Opponent brain. Reads the rival's visible intent queue (the same queue the
// HUD shows) and answers with the beats matrix, flavored by persona. Can drive
// either corner, so it powers VS RIVAL, SPECTATE, and the GAUNTLET ladder.

const RESPONSES = {
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
  fortress: { a: 1.9, f: 1.5, j: 1.2 },
  siege: { d: 1.7, k: 1.5, i: 1.5, f: 1.3 },
  rhythm: { s: 1.7, u: 1.5, i: 1.5 }
};

// side: which actor this brain controls. mods: difficulty adjustments
// (gauntlet ladder ramps aggression/readSkill). respectIdle: ease off a
// human opponent who has stopped playing.
export function aiUpdate(combat, dt, now, side = "enemy", mods = null, respectIdle = true) {
  const { game, actors } = combat;
  if (game.mode !== "fight" || game.roundLocked) return;

  game.aiClocks ??= { player: 700, enemy: 700 };
  game.aiClocks[side] -= dt;
  if (game.aiClocks[side] > 0) return;

  const self = actors[side];
  const foe = actors[side === "enemy" ? "player" : "enemy"];
  const persona = {
    aggression: Math.min(1, self.char.ai.aggression + (mods?.aggression || 0)),
    readSkill: Math.min(0.95, self.char.ai.readSkill + (mods?.readSkill || 0)),
    persona: self.char.ai.persona
  };

  if (self.downTime > 0 || self.staggerTime > 0) {
    game.aiClocks[side] = 240;
    return;
  }

  if (respectIdle) {
    const idleMs = now - game.lastPlayerIntent;
    if (idleMs > 2600 && !foe.queue.length && !foe.current) {
      game.aiClocks[side] = 430;
      if (self.queue.length === 0 && !self.current && Math.random() < 0.2) {
        combat.intent(side, weightedPick({ a: 2, s: 1, j: 1 }), now);
      }
      return;
    }
  }

  // Signature art when flowing and the moment is right.
  if (self.flowState && game.range < 0.62 && foe.downTime <= 0 && Math.random() < 0.35) {
    combat.intent(side, "g", now);
    game.aiClocks[side] = baseDelay(persona, foe.tempo) + 200;
    return;
  }

  const seen = foe.queue[0] || foe.current;
  let table;
  if (!seen) table = { ...RESPONSES.none };
  else if (Math.random() < persona.readSkill) table = { ...(RESPONSES[seen.family] || RESPONSES.none) };
  else table = { ...RESPONSES.none };

  const bias = PERSONA_BIAS[persona.persona] || {};
  for (const key of Object.keys(table)) {
    if (bias[key]) table[key] *= bias[key];
  }

  // Spacing instinct: drift toward the range this fighter wants.
  const want = self.char.stats.wantRange;
  if (game.range > want + 0.18) {
    table.k = (table.k || 0) + 2.2;
    table.d = (table.d || 0) + (persona.persona === "grappler" || persona.persona === "siege" ? 2.6 : 1.2);
    table.i = (table.i || 0) + 1.4;
    delete table.j;
  } else if (game.range < want - 0.18) {
    table.f = (table.f || 0) + 2.4;
    table.s = (table.s || 0) + 1.6;
  }

  // Don't queue range-gated moves that would clearly whiff.
  if (game.range > 0.5) delete table.d;
  if (game.range > 0.62) { delete table.j; delete table.k; }
  if (game.range < 0.1) delete table.i;

  const keys = Object.keys(table);
  if (!keys.length) {
    game.aiClocks[side] = 300;
    return;
  }

  combat.intent(side, weightedPick(table), now);
  game.aiClocks[side] = baseDelay(persona, foe.tempo) + Math.random() * 260;
}

function baseDelay(persona, foeTempo) {
  const base = 980 - persona.aggression * 400;
  return base - Math.min(240, foeTempo * 180);
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
