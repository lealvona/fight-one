// Ironflow Apex data: combat doctrine, real-discipline movesets with cinematic
// "super" versions, and the eight-fighter roster.
//
// Move philosophy (v3): every standard technique is a real move from a real
// system - karate, savate, muay thai, lucha/no-gi, aiki-ninjutsu, Keysi, krav
// maga, capoeira. In FLOW STATE each technique becomes its over-the-top
// martial-arts-cinema version: same bones, mythic execution.

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
export const BEATS = {
  strike: ["clinch", "setup"],
  guard: ["strike"],
  break: ["guard", "evade"],
  clinch: ["guard", "break"],
  evade: ["strike", "clinch", "art"],
  art: ["strike", "guard", "break", "clinch", "setup"]
};

// Base intent deck (boxing/kickboxing fundamentals as the neutral default).
export const MOVES = {
  j: { key: "J", name: "Jab", family: "strike", height: "high", limb: "LH", startup: 150, active: 110, recovery: 210, damage: 6, posture: 7, step: -0.08, push: -0.02, min: 0, max: 0.5, priority: 3, commitment: 1, canPreempt: true },
  k: { key: "K", name: "Cross", family: "strike", height: "mid", limb: "RH", startup: 200, active: 130, recovery: 270, damage: 9, posture: 11, step: -0.13, push: -0.04, min: 0, max: 0.55, priority: 4, commitment: 2, canPreempt: true },
  u: { key: "U", name: "Low Kick", family: "break", height: "low", limb: "LL", startup: 220, active: 140, recovery: 300, damage: 7, posture: 14, step: -0.02, push: 0.02, min: 0.06, max: 0.72, priority: 4, commitment: 2, canPreempt: false },
  i: { key: "I", name: "High Kick", family: "strike", height: "high", limb: "RL", startup: 280, active: 160, recovery: 390, damage: 13, posture: 17, step: 0, push: 0.05, min: 0.18, max: 0.82, priority: 5, commitment: 3, canPreempt: false },
  a: { key: "A", name: "Shell", family: "guard", height: "body", limb: "DEF", startup: 85, active: 260, recovery: 170, damage: 0, posture: -8, step: 0, push: 0, min: 0, max: 1, priority: 2, commitment: 1, canPreempt: true },
  s: { key: "S", name: "Slip", family: "evade", height: "angle", limb: "EV", startup: 95, active: 220, recovery: 190, damage: 0, posture: -4, step: 0.07, push: 0, min: 0, max: 1, priority: 3, commitment: 1, canPreempt: true },
  d: { key: "D", name: "Clinch", family: "clinch", height: "body", limb: "GR", startup: 180, active: 190, recovery: 280, damage: 4, posture: 12, step: -0.2, push: -0.06, min: 0, max: 0.42, priority: 5, commitment: 2, canPreempt: true },
  f: { key: "F", name: "Shove", family: "break", height: "body", limb: "BR", startup: 130, active: 150, recovery: 230, damage: 3, posture: 12, step: 0, push: 0.26, min: 0, max: 0.62, priority: 4, commitment: 1, canPreempt: true }
};

// Free counter granted by a close-range Shell success (Keysi: cover, then elbow).
export const FRAME_ELBOW = {
  key: "A+", name: "Keysi Frame Elbow", family: "strike", height: "mid", limb: "RH",
  startup: 90, active: 90, recovery: 160, damage: 5, posture: 8,
  step: -0.02, push: -0.01, min: 0, max: 0.36, priority: 4, commitment: 1,
  canPreempt: false, free: true
};

// When a fighter is slammed, queued intents that make no sense on the ground
// are lost - but a queued clinch survives as a ground reversal (the special
// rule: what would still work from the floor, still works).
export const GROUND_REVERSAL = {
  key: "D!", name: "Ground Reversal", family: "clinch", height: "low", limb: "GR",
  damage: 5, posture: 14, push: 0.05, priority: 6, commitment: 2, ground: true
};

export const OPEN_LINE = {
  name: "open line", family: "setup", height: "body",
  damage: 0, posture: 0, push: 0, priority: 1, commitment: 0, tempo: 0
};

// Global pacing: Impact plays slower and heavier than Apex - moves are
// deliberate, hits land with follow-through (Def Jam / weapon-fighter pacing).
export const PACE = 1.32;

// Generic standard -> cinema scaling. Per-move `sup` blocks override fields.
const SUPER_SCALE = {
  damage: 1.5, posture: 1.4, startup: 0.82, recovery: 0.9, push: 1.6
};

export function resolveMove(char, key, superMode = false) {
  const base = MOVES[key];
  if (!base) return null;
  const override = char.moves?.[key];
  const merged = override ? { ...base, ...override } : { ...base };
  if (!superMode || !merged.sup) {
    delete merged.sup;
    return paced(merged);
  }
  const sup = merged.sup;
  const out = {
    ...merged,
    name: sup.name,
    damage: sup.damage ?? Math.round(merged.damage * SUPER_SCALE.damage),
    posture: sup.posture ?? Math.round(merged.posture * SUPER_SCALE.posture),
    startup: sup.startup ?? Math.round(merged.startup * SUPER_SCALE.startup),
    recovery: sup.recovery ?? Math.round(merged.recovery * SUPER_SCALE.recovery),
    push: sup.push ?? +(merged.push * SUPER_SCALE.push).toFixed(3),
    redirectDamage: sup.redirectDamage ?? merged.redirectDamage,
    active: sup.active ?? merged.active,
    priority: merged.priority + 1,
    commitment: Math.min(4, merged.commitment + 1), // film moves overextend: redirects still answer them
    knockdownOnHit: sup.knockdown || false,
    super: true
  };
  delete out.sup;
  return paced(out);
}

// Stretch move phases to Impact pacing and weight damage up so rounds keep
// their length while each exchange means more.
function paced(move) {
  return {
    ...move,
    startup: Math.round(move.startup * PACE),
    active: Math.round(move.active * 1.15),
    recovery: Math.round(move.recovery * PACE),
    damage: move.damage ? Math.round(move.damage * 1.18) : move.damage
  };
}

export function signatureMove(char) {
  const sig = char.signature;
  return paced({
    key: "G", name: sig.name, family: "art", height: "mid", limb: "ART",
    startup: sig.startup, active: sig.active, recovery: sig.recovery,
    damage: sig.damage, posture: sig.posture,
    step: -0.22, push: 0.1, min: 0, max: 0.7,
    priority: 7, commitment: 4, canPreempt: false, art: true
  });
}

// ---------------------------------------------------------------------------
// Roster. Original characters; each carries an "homage" line naming only the
// archetype it salutes. Standard moves are real techniques from the named
// discipline; `sup` is the wire-fu cinema version unlocked in Flow State.
// ---------------------------------------------------------------------------

export const ROSTER = [
  {
    id: "daichi",
    name: "Daichi Mori",
    epithet: "The Wandering Tide",
    homage: "for fans of the world-wandering karateka",
    style: "Pilgrim karate distilled through Krav Maga directness",
    discipline: "Kyokushin karate / Krav Maga",
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
    moves: {
      j: { name: "Kizami-zuki", sup: { name: "Stonecutter Kizami", startup: 105 } },
      k: { name: "Gyaku-zuki", damage: 10, sup: { name: "Tidebreaker Gyaku-zuki", knockdown: true } },
      u: { name: "Gedan Mawashi", sup: { name: "Reed-Razing Gedan" } },
      i: { name: "Jodan Mawashi", damage: 14, sup: { name: "Crescent Moon Severance", damage: 21 } },
      a: { name: "Sanchin Shell", sup: { name: "Immovable Sanchin", active: 330 } },
      s: { name: "Tai Sabaki", sup: { name: "Tidewalk Sabaki", redirectDamage: 7 } },
      d: { name: "Kuzushi Grip", sup: { name: "Riptide Kuzushi" } },
      f: { name: "Teisho Palm", sup: { name: "Wavebreaker Teisho", push: 0.42 } }
    },
    ai: { aggression: 0.55, readSkill: 0.7, persona: "balanced" }
  },
  {
    id: "suyin",
    name: "Suyin Lan",
    epithet: "Eight Gales",
    homage: "for fans of the lightning-leg interpol legend",
    style: "Savate precision on a gale-force cadence",
    discipline: "Savate (boxe française)",
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
    moves: {
      j: { name: "Direct Bras Avant", startup: 135, sup: { name: "Needle Gale Direct", startup: 95 } },
      k: { name: "Direct Croisé", sup: { name: "Crosswind Croisé" } },
      u: { name: "Fouetté Bas", startup: 190, sup: { name: "Skimming Gale Fouetté" } },
      i: { name: "Fouetté Figure", startup: 240, damage: 12, sup: { name: "Hundred-Gale Fouetté", damage: 19 } },
      a: { name: "High Cover", sup: { name: "Eye of the Storm", active: 320 } },
      s: { name: "Décalage Step", sup: { name: "Galewalk Décalage", redirectDamage: 6 } },
      d: { name: "Saisie Tie-up", sup: { name: "Tempest Saisie" } },
      f: { name: "Chassé Frontal", sup: { name: "Gale Wall Chassé", push: 0.48, knockdown: true } }
    },
    ai: { aggression: 0.75, readSkill: 0.65, persona: "rush" }
  },
  {
    id: "renzo",
    name: "Renzo Kuroda",
    epithet: "The Black Crane",
    homage: "for fans of the ruthless zaibatsu heir",
    style: "Krav-forged karate with zero ceremony",
    discipline: "Krav Maga / full-contact karate",
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
    moves: {
      j: { name: "Uraken Backfist", sup: { name: "Maelstrom Uraken", startup: 100 } },
      k: { name: "Furi-uchi Hook", damage: 11, startup: 215, sup: { name: "Black Maelstrom Hook", damage: 18, knockdown: true } },
      u: { name: "Kansetsu Stomp", sup: { name: "Root-Severing Kansetsu" } },
      i: { name: "Ushiro Hook Kick", damage: 14, sup: { name: "Black Wing Descent", damage: 21 } },
      a: { name: "360 Defense", sup: { name: "Iron Perimeter", active: 320 } },
      s: { name: "Burst Angle", sup: { name: "Storm-Step Vanish" } },
      d: { name: "Collar Tie", sup: { name: "Crane's Talon Tie" } },
      f: { name: "Two-Hand Drive", sup: { name: "Boardroom Eviction", push: 0.45 } }
    },
    ai: { aggression: 0.85, readSkill: 0.6, persona: "pressure" }
  },
  {
    id: "lobo",
    name: "Lobo Plateado",
    epithet: "The Silver Wolf",
    homage: "for fans of the masked golden-heart grappler",
    style: "Lucha libre over no-gi grappling - catch, slam, release",
    discipline: "Lucha libre / no-gi grappling",
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
    moves: {
      j: { name: "Knife-Edge Chop", sup: { name: "Silver Fang Chop" } },
      k: { name: "Lariat", damage: 10, sup: { name: "Tornado Lariat", damage: 17, knockdown: true } },
      u: { name: "Calf Kick", sup: { name: "Timber Calf Cutter" } },
      i: { name: "Dropkick", sup: { name: "Lunar Dropkick", damage: 20, knockdown: true, push: 0.4 } },
      a: { name: "Sprawl Frame", sup: { name: "Wolf Den Wall", active: 320 } },
      s: { name: "Rope-Run Duck", sup: { name: "Phantom Rope-Run" } },
      d: { name: "Double Underhooks", damage: 6, max: 0.46, sup: { name: "Wolf Trap Suplex", damage: 10 } },
      f: { name: "Collar Shove", push: 0.3, sup: { name: "Stampede Shove", push: 0.5 } }
    },
    ai: { aggression: 0.6, readSkill: 0.6, persona: "grappler" }
  },
  {
    id: "akane",
    name: "Akane Roku",
    epithet: "The Falling Petal",
    homage: "for fans of the demon-hunting shrine ninja",
    style: "Aiki-ninjutsu - pure redirection, nothing wasted",
    discipline: "Aikido / koryu ninjutsu",
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
    moves: {
      j: { name: "Atemi Feint", sup: { name: "Petal-Veil Atemi", startup: 100 } },
      k: { name: "Shomen-ate Palm", sup: { name: "Heavensplit Shomen" } },
      u: { name: "Ashi-barai Sweep", sup: { name: "Heavenfall Ashi-barai", knockdown: true } },
      i: { name: "Crescent Kick", damage: 12, startup: 250, sup: { name: "Falling Heaven Crescent", damage: 18 } },
      a: { name: "Kamae Cover", sup: { name: "Empty Gate Kamae", active: 320 } },
      s: { name: "Irimi-Tenkan", redirectDamage: 8, sup: { name: "Petalfall Irimi", redirectDamage: 12 } },
      d: { name: "Kote-gaeshi", sup: { name: "Spiraling Kote-gaeshi" } },
      f: { name: "Tai-atari Check", sup: { name: "Hollow Mountain Check", push: 0.4 } }
    },
    ai: { aggression: 0.35, readSkill: 0.85, persona: "counter" }
  },
  {
    id: "bastion",
    name: "Bastion Vale",
    epithet: "The Iron Vigil",
    homage: "for fans of the armored nightmare knight - and a certain caped night shift",
    style: "Keysi covering frame in riot plate - the pensador wall",
    discipline: "Keysi Fighting Method",
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
    moves: {
      j: { name: "Llave Elbow", damage: 7, max: 0.42, sup: { name: "Guillotine Llave" } },
      k: { name: "Hammerfist", damage: 10, sup: { name: "Forge Hammerfist", knockdown: true } },
      u: { name: "Oblique Stomp", sup: { name: "Kneebreaker Eclipse", posture: 26 } },
      i: { name: "Crashing Headbutt", limb: "HB", damage: 13, startup: 300, min: 0, max: 0.42, sup: { name: "Meteor Headbutt", damage: 20, knockdown: true } },
      a: { name: "Pensador Wall", active: 330, sup: { name: "Pensador Fortress", active: 410 } },
      s: { name: "Pivot Cover", sup: { name: "Night Shift Pivot" } },
      d: { name: "Collar-and-Elbow", sup: { name: "Iron Curfew Clinch" } },
      f: { name: "Riot Frame", damage: 4, sup: { name: "Barricade Drive", push: 0.44 } }
    },
    ai: { aggression: 0.4, readSkill: 0.75, persona: "fortress" }
  },
  {
    id: "decha",
    name: "Decha Klahan",
    epithet: "The War Elephant",
    homage: "for fans of the scarred emperor of the eight limbs",
    style: "Siege Muay Thai - elbows, knees, and the long teep",
    discipline: "Muay Thai",
    blurb: "Undefeated across three border provinces until a promoter sold his title behind his back. He does not chase belts anymore. He collects promoters' champions.",
    ui: "#e8843d",
    colors: {
      skin: 0xb07a52, hair: 0x14100c,
      trunks: 0xa1262d, trim: 0xd9a441, wraps: 0xd9a441,
      bands: 0xa1262d, accent: 0xe8843d
    },
    body: { height: 1.93, bulk: 1.08, shoulders: 1.1 },
    costume: { shirtless: true, trunks: true, sash: true, wraps: true, armbands: true, legWraps: true, barefoot: true, hair: "short" },
    stats: { speed: 0.95, power: 1.15, postureMax: 112, weight: 1.12, wantRange: 0.3 },
    signature: { name: "Erawan Skybreaker", damage: 21, posture: 28, startup: 450, active: 250, recovery: 560, flavor: "the sky kneels first" },
    moves: {
      j: { name: "Long-Guard Jab", sup: { name: "War Drum Jab", startup: 105 } },
      k: { name: "Sok Tad Elbow", damage: 10, max: 0.5, sup: { name: "Sky-Splitting Sok Klap", damage: 17 } },
      u: { name: "Te Kha Low Kick", damage: 8, sup: { name: "Felled Banyan Te Kha" } },
      i: { name: "Te Tat Roundhouse", damage: 14, sup: { name: "War Elephant Tusk", damage: 21 } },
      a: { name: "Long Guard", sup: { name: "Temple Gate Guard", active: 320 } },
      s: { name: "Lean-Back Sway", sup: { name: "Reed in the Flood" } },
      d: { name: "Plum Clinch Knee", damage: 6, sup: { name: "Erawan Plum Crush", damage: 10 } },
      f: { name: "Teep", push: 0.32, sup: { name: "Erawan God Teep", push: 0.55, knockdown: true } }
    },
    ai: { aggression: 0.7, readSkill: 0.7, persona: "siege" }
  },
  {
    id: "marisol",
    name: "Marisol Veiga",
    epithet: "The Moon Ginga",
    homage: "for fans of the ever-dancing capoeira spirits",
    style: "Capoeira - the rhythm never stops, the target never lands",
    discipline: "Capoeira",
    blurb: "Learned the ginga before she could write. Her roda has no walls, no clock, and so far, no one who has touched her twice.",
    ui: "#7fe89a",
    colors: {
      skin: 0x8a5a3b, hair: 0x1c1410,
      top: 0x2e8b57, topShade: 0x226843, trim: 0xd9c441,
      legs: 0xe8e4da, accent: 0x7fe89a
    },
    body: { height: 1.7, bulk: 0.85, shoulders: 0.9 },
    costume: { tunic: true, sash: true, hair: "bun", barefoot: true },
    stats: { speed: 1.18, power: 0.84, postureMax: 88, weight: 0.82, wantRange: 0.55 },
    signature: { name: "Lua Cheia Eclipse", damage: 15, posture: 26, startup: 370, active: 260, recovery: 500, flavor: "the moon dances last" },
    moves: {
      j: { name: "Galopante Palm", sup: { name: "Carnival Galopante", startup: 100 } },
      k: { name: "Cotovelada Elbow", sup: { name: "Eclipse Cotovelada" } },
      u: { name: "Rasteira Sweep", damage: 6, posture: 16, sup: { name: "Compasso Undertow", knockdown: true } },
      i: { name: "Meia-Lua de Compasso", damage: 13, startup: 260, sup: { name: "Meia-Lua Eclipse", damage: 20 } },
      a: { name: "Cocorinha Drop", sup: { name: "Vanishing Cocorinha", active: 310 } },
      s: { name: "Esquiva Ginga", redirectDamage: 7, sup: { name: "Moonlit Esquiva", redirectDamage: 10 } },
      d: { name: "Vingativa Trip", sup: { name: "Roda's End Vingativa" } },
      f: { name: "Cabeçada", push: 0.28, sup: { name: "Charging Moon Cabeçada", push: 0.46 } }
    },
    ai: { aggression: 0.55, readSkill: 0.75, persona: "rhythm" }
  }
];

// One custom slot, persisted by the creator flow.
let CUSTOM = null;

export function setCustomFighter(char) {
  CUSTOM = char;
}

export function getCustomFighter() {
  return CUSTOM;
}

export function fullRoster() {
  return CUSTOM ? [...ROSTER, CUSTOM] : ROSTER;
}

export function charById(id) {
  if (CUSTOM && CUSTOM.id === id) return CUSTOM;
  return ROSTER.find(c => c.id === id) || ROSTER[0];
}
