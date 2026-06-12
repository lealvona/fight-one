// Ironflow data: combat doctrine, base moves, and the six-fighter roster.
//
// Doctrine sources baked into the matrix and timing systems:
//   Krav Maga  - defense and offense in the same beat (Burst Counter, punish windows)
//   Keysi      - covering shell that squares to the threat and answers with elbows
//   Aikido     - committed force gets redirected, never traded with (Redirect throws)
//   BJJ (lite) - takedowns and sweeps that reset to the feet; no held ground game

export const FAMILY_LABEL = {
  strike: "Strike",
  break: "Break",
  guard: "Shell",
  clinch: "Clinch",
  evade: "Redirect",
  art: "Art",
  setup: "Open"
};

// Directed "beats" graph. No mutual pairs: every matchup has one reading.
//   Strike stuffs Clinch        (sprawl and brawl)
//   Shell absorbs Strike        (the Keysi pensador wall)
//   Break opens Shell, catches Redirect   (lows and shoves find angles)
//   Clinch swallows Break, grabs Shell    (tie up the shove, throw the turtle)
//   Redirect turns Strike, escapes Clinch and Art (aiki: feed force to the floor)
//   Art crushes everything except a live Redirect
export const BEATS = {
  strike: ["clinch", "setup"],
  guard: ["strike"],
  break: ["guard", "evade"],
  clinch: ["guard", "break"],
  evade: ["strike", "clinch", "art"],
  art: ["strike", "guard", "break", "clinch", "setup"]
};

// Base intent deck. Times in ms, range values in the 0..1 spacing scale.
// step  = self movement applied when the move goes active (lunge in / drift out)
// push  = spacing change applied to the exchange when the move wins
// min/max = effective band after step; outside it the move whiffs
export const MOVES = {
  j: { key: "J", name: "Jab", family: "strike", height: "high", limb: "LH", startup: 150, active: 110, recovery: 210, damage: 6, posture: 7, step: -0.05, push: -0.02, min: 0, max: 0.58, priority: 3, commitment: 1, canPreempt: true },
  k: { key: "K", name: "Cross", family: "strike", height: "mid", limb: "RH", startup: 200, active: 130, recovery: 270, damage: 9, posture: 11, step: -0.09, push: -0.04, min: 0, max: 0.62, priority: 4, commitment: 2, canPreempt: true },
  u: { key: "U", name: "Low Kick", family: "break", height: "low", limb: "LL", startup: 220, active: 140, recovery: 300, damage: 7, posture: 14, step: -0.02, push: 0.02, min: 0.06, max: 0.72, priority: 4, commitment: 2, canPreempt: false },
  i: { key: "I", name: "High Kick", family: "strike", height: "high", limb: "RL", startup: 280, active: 160, recovery: 390, damage: 13, posture: 17, step: 0, push: 0.05, min: 0.18, max: 0.82, priority: 5, commitment: 3, canPreempt: false },
  a: { key: "A", name: "Shell", family: "guard", height: "body", limb: "DEF", startup: 85, active: 260, recovery: 170, damage: 0, posture: -8, step: 0, push: 0, min: 0, max: 1, priority: 2, commitment: 1, canPreempt: true },
  s: { key: "S", name: "Slip", family: "evade", height: "angle", limb: "EV", startup: 95, active: 220, recovery: 190, damage: 0, posture: -4, step: 0.07, push: 0, min: 0, max: 1, priority: 3, commitment: 1, canPreempt: true },
  d: { key: "D", name: "Clinch", family: "clinch", height: "body", limb: "GR", startup: 180, active: 190, recovery: 280, damage: 4, posture: 12, step: -0.2, push: -0.06, min: 0, max: 0.42, priority: 5, commitment: 2, canPreempt: true },
  f: { key: "F", name: "Shove", family: "break", height: "body", limb: "BR", startup: 130, active: 150, recovery: 230, damage: 3, posture: 12, step: 0, push: 0.26, min: 0, max: 0.62, priority: 4, commitment: 1, canPreempt: true }
};

// Free counter granted by a close-range Shell success (Keysi: cover, then elbow).
export const FRAME_ELBOW = {
  key: "A+", name: "Frame Elbow", family: "strike", height: "mid", limb: "RH",
  startup: 90, active: 90, recovery: 160, damage: 5, posture: 8,
  step: -0.02, push: -0.01, min: 0, max: 0.36, priority: 4, commitment: 1,
  canPreempt: false, free: true
};

// Pseudo-move representing an undefended opening.
export const OPEN_LINE = {
  name: "open line", family: "setup", height: "body",
  damage: 0, posture: 0, push: 0, priority: 1, commitment: 0, tempo: 0
};

// ---------------------------------------------------------------------------
// Roster. Original characters; each carries an "homage" line naming only the
// archetype it salutes - silhouettes, names, costumes and moves are our own.
// ---------------------------------------------------------------------------

export const ROSTER = [
  {
    id: "daichi",
    name: "Daichi Mori",
    epithet: "The Wandering Tide",
    homage: "for fans of the world-wandering karateka",
    style: "Pilgrim karate distilled through Krav Maga directness",
    blurb: "Walked out of a mountain dojo eleven years ago and never stopped. Every village taught him one technique; the road taught him when not to use them.",
    ui: "#7fd4c1",
    colors: {
      skin: 0xd4a27a, hair: 0x1d1712,
      gi: 0xd8d2c4, giShade: 0xb9b2a2, belt: 0x223043,
      headband: 0x2c4f7c, accent: 0x7fd4c1
    },
    body: { height: 1.78, bulk: 1.0, shoulders: 1.0 },
    costume: { gi: true, headband: true, barefoot: true, hair: "short" },
    stats: { speed: 1.0, power: 1.0, postureMax: 105, weight: 1.0, wantRange: 0.45 },
    signature: { name: "Tidebreak Trinity", damage: 18, posture: 22, startup: 420, active: 240, recovery: 520, flavor: "three answers in one breath" },
    moveOverrides: {
      j: { name: "Stone Jab" },
      k: { name: "Tidebreak Cross", damage: 10 },
      u: { name: "Reed Cutter" },
      i: { name: "Crescent Gale", damage: 14 }
    },
    ai: { aggression: 0.55, readSkill: 0.7, persona: "balanced" }
  },
  {
    id: "suyin",
    name: "Suyin Lan",
    epithet: "Eight Gales",
    homage: "for fans of the lightning-leg interpol legend",
    style: "Sport savate on a gale-force cadence",
    blurb: "Customs investigator who kicked her way through three smuggling rings before breakfast. Files her reports in triplicate; throws her kicks in octuplicate.",
    ui: "#69c7e8",
    colors: {
      skin: 0xe3b58c, hair: 0x14100e,
      top: 0x1f6f6d, topShade: 0x16504f, trim: 0xd9a441,
      legs: 0x14181c, wraps: 0xd9a441, accent: 0x69c7e8
    },
    body: { height: 1.66, bulk: 0.82, shoulders: 0.86 },
    costume: { tunic: true, sash: true, ponytail: true, legWraps: true, shoes: true },
    stats: { speed: 1.16, power: 0.86, postureMax: 92, weight: 0.85, wantRange: 0.52 },
    signature: { name: "Hundred Gale Fan", damage: 16, posture: 20, startup: 360, active: 260, recovery: 480, flavor: "the storm files no warning" },
    moveOverrides: {
      j: { name: "Sparrow Jab", startup: 135 },
      k: { name: "Crosswind" },
      u: { name: "Skimming Gale", startup: 190 },
      i: { name: "Gale Fan", startup: 240, damage: 12 }
    },
    ai: { aggression: 0.75, readSkill: 0.65, persona: "rush" }
  },
  {
    id: "renzo",
    name: "Renzo Kuroda",
    epithet: "The Black Crane",
    homage: "for fans of the ruthless zaibatsu heir",
    style: "Krav-forged karate with zero ceremony",
    blurb: "Cast out of the Kuroda security conglomerate by his own father. He does not want the company back. He wants the board to watch what he builds from nothing.",
    ui: "#e45745",
    colors: {
      skin: 0xc99873, hair: 0x0c0a09,
      trousers: 0x23262d, trousersShade: 0x191b20, belt: 0x101114,
      wraps: 0xa1262d, accent: 0xe45745
    },
    body: { height: 1.82, bulk: 1.05, shoulders: 1.08 },
    costume: { shirtless: true, wraps: true, hair: "swept", shoes: true },
    stats: { speed: 0.95, power: 1.2, postureMax: 100, weight: 1.05, wantRange: 0.38 },
    signature: { name: "Black Crane Storm", damage: 22, posture: 26, startup: 460, active: 240, recovery: 560, flavor: "the storm answers to no one" },
    moveOverrides: {
      j: { name: "Crane Peck" },
      k: { name: "Storm Step Hook", damage: 11, startup: 215 },
      u: { name: "Root Cutter" },
      i: { name: "Black Wing", damage: 14 }
    },
    ai: { aggression: 0.85, readSkill: 0.6, persona: "pressure" }
  },
  {
    id: "lobo",
    name: "Lobo Plateado",
    epithet: "The Silver Wolf",
    homage: "for fans of the masked golden-heart grappler",
    style: "Lucha libre over no-gi grappling - catch, slam, release",
    blurb: "Funds an orphanage with every purse he wins. The silver wolf mask has never come off in public; the kids say there is nothing underneath but another mask.",
    ui: "#b78cff",
    colors: {
      skin: 0xb98a63, hair: 0x2e2622,
      mask: 0xc9ccd4, maskAccent: 0x4a3f86,
      tights: 0x4a3f86, tightsShade: 0x37306b, boots: 0xc9ccd4, accent: 0xb78cff
    },
    body: { height: 1.88, bulk: 1.3, shoulders: 1.22 },
    costume: { shirtless: true, wolfMask: true, mane: true, boots: true, kneePads: true },
    stats: { speed: 0.88, power: 1.12, postureMax: 118, weight: 1.25, wantRange: 0.2 },
    signature: { name: "Full Moon Driver", damage: 20, posture: 30, startup: 440, active: 240, recovery: 560, flavor: "the moon comes down with you" },
    moveOverrides: {
      d: { name: "Wolf Trap", damage: 6, max: 0.46 },
      f: { name: "Cage Shove", push: 0.3 },
      k: { name: "Lariat Cross", damage: 10 }
    },
    ai: { aggression: 0.6, readSkill: 0.6, persona: "grappler" }
  },
  {
    id: "akane",
    name: "Akane Roku",
    epithet: "The Falling Petal",
    homage: "for fans of the demon-hunting shrine ninja",
    style: "Aiki-ninjutsu - pure redirection, nothing wasted",
    blurb: "Sixth caretaker of a shrine that officially does not exist. She has never thrown the first strike in her life and has never needed to throw the last one twice.",
    ui: "#f1bd4b",
    colors: {
      skin: 0xe8c39a, hair: 0x101010,
      suit: 0x232a4d, suitShade: 0x1a1f3a, cords: 0xe8e4da,
      scarf: 0xa1262d, guards: 0x14181c, accent: 0xf1bd4b
    },
    body: { height: 1.64, bulk: 0.78, shoulders: 0.82 },
    costume: { bodysuit: true, cords: true, scarf: true, guards: true, hair: "bun", shoes: true },
    stats: { speed: 1.12, power: 0.88, postureMax: 90, weight: 0.8, wantRange: 0.6 },
    signature: { name: "Petalfall Spiral", damage: 16, posture: 24, startup: 380, active: 260, recovery: 500, flavor: "what falls was already falling" },
    moveOverrides: {
      s: { name: "Petal Turn", redirectDamage: 8 },
      j: { name: "Needle Hand" },
      i: { name: "Falling Petal", damage: 12, startup: 250 }
    },
    ai: { aggression: 0.35, readSkill: 0.85, persona: "counter" }
  },
  {
    id: "bastion",
    name: "Bastion Vale",
    epithet: "The Iron Vigil",
    homage: "for fans of the azure-armored nightmare knight - and a certain caped night shift",
    style: "Keysi covering frame in riot plate - the pensador wall",
    blurb: "Walked off an oil rig with a welded suit of salvage plate and a list of neighborhoods that stopped sleeping safe. The list is shorter now. He is not finished.",
    ui: "#e8a33d",
    colors: {
      skin: 0xc7a184, hair: 0x101010,
      armor: 0x4b545e, armorShade: 0x39414a, under: 0x1d2126,
      boots: 0x2a3138, visor: 0xe8a33d, accent: 0xe8a33d
    },
    body: { height: 1.92, bulk: 1.18, shoulders: 1.18 },
    costume: { helm: true, armor: true, boots: true },
    stats: { speed: 0.85, power: 1.06, postureMax: 132, weight: 1.3, wantRange: 0.34 },
    signature: { name: "Vigil Protocol", damage: 19, posture: 28, startup: 470, active: 260, recovery: 580, flavor: "the wall advances" },
    moveOverrides: {
      a: { name: "Pensador Wall", active: 330 },
      j: { name: "Cover Elbow", damage: 7, max: 0.42 },
      f: { name: "Riot Frame", damage: 4 },
      k: { name: "Hammer Cross", damage: 10 }
    },
    ai: { aggression: 0.4, readSkill: 0.75, persona: "fortress" }
  }
];

export function charById(id) {
  return ROSTER.find(c => c.id === id) || ROSTER[0];
}

// Resolve a character's version of a base move (names + stat nudges).
export function resolveMove(char, key) {
  const base = MOVES[key];
  if (!base) return null;
  const override = char.moveOverrides?.[key];
  return override ? { ...base, ...override } : { ...base };
}

// Build a character's signature art as a queueable move.
export function signatureMove(char) {
  const sig = char.signature;
  return {
    key: "G", name: sig.name, family: "art", height: "mid", limb: "ART",
    startup: sig.startup, active: sig.active, recovery: sig.recovery,
    damage: sig.damage, posture: sig.posture,
    step: -0.22, push: 0.1, min: 0, max: 0.7,
    priority: 7, commitment: 4, canPreempt: false, art: true
  };
}
