// The Chronicle: a live, prose play-by-play of the fight. It subscribes to the
// combat effect stream and turns each resolved beat into a sentence that reads
// like a recounting of the action. Phrasing is drawn from a private RNG seeded
// from the match seed, so a replay narrates identically and the draw never
// disturbs the simulation's own RNG.

import { mulberry32 } from "./replay.js";

const ATTACK_VERB = ["snaps", "fires", "throws", "rips off", "drives in", "lances out with", "lets go of"];
const KICK_VERB = ["whips", "swings", "arcs", "chops"];
const MISS_END = ["but finds only air", "but it sails wide", "and whiffs", "but there's nobody home"];
const LAND_BIG = ["and it lands flush", "and it cracks home", "and it slams in clean"];
const LAND_SMALL = ["and it gets through", "and it scores", "and it finds a gap"];

function nounOf(move) {
  if (!move) return "a strike";
  const n = (move.name || "").toLowerCase();
  if (move.limb === "ART") return `the ${move.name}`;
  if (n.includes("elbow")) return "an elbow";
  if (n) return /^[aeiou]/.test(n) ? `an ${n}` : `a ${n}`;
  return "a strike";
}

function isKick(move) { return move && (move.limb === "LL" || move.limb === "RL"); }

export function createChronicle({ seed = 1 } = {}) {
  let rng = mulberry32((seed || 1) + 991);
  const pick = arr => arr[Math.floor(rng() * arr.length) % arr.length];

  const el = document.createElement("div");
  el.className = "chronicle hidden";
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-label", "Fight chronicle");

  let visible = localStorage.getItem("saga.chronicle") !== "off";
  if (visible) el.classList.remove("hidden");

  const MAX = 30;
  let lastBigAt = -9999;
  let tally = freshTally();

  function freshTally() { return { player: { hits: 0, downs: 0, def: 0 }, enemy: { hits: 0, downs: 0, def: 0 } }; }

  function add(html, cls) {
    const line = document.createElement("div");
    line.className = "line" + (cls ? " " + cls : "");
    line.innerHTML = html;
    el.appendChild(line);
    while (el.childElementCount > MAX) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }

  function heightTag(move) {
    if (!move) return "";
    if (move.height === "high") return pick(["upstairs", "to the head", "high"]);
    if (move.height === "low") return pick(["low", "at the legs"]);
    if (move.height === "mid" || move.height === "body") return pick(["to the body", "downstairs", "to the ribs"]);
    return "";
  }
  function attackClause(id, move, A) {
    const v = isKick(move) ? pick(KICK_VERB) : pick(ATTACK_VERB);
    const tag = heightTag(move);
    return `${named(id, A)} ${v} ${nounOf(move)}${tag ? " " + tag : ""}`;
  }

  function named(id, A) {
    const c = A[id] && A[id].char;
    const col = (c && c.ui) || "#f4efe4";
    const nm = (c && c.name) || id;
    return `<b style="color:${col}">${nm}</b>`;
  }
  const foe = id => (id === "player" ? "enemy" : "player");

  // Translate one combat effect into a line of the chronicle.
  function note(type, p, combat) {
    if (!visible && el.childElementCount === 0) { /* still tally for recap */ }
    const A = combat.actors;
    const now = performance.now();
    switch (type) {
      case "hit": {
        tally[p.winner] && (tally[p.winner].hits += 1);
        if (p.launched) {
          lastBigAt = now;
          add(`${attackClause(p.winner, p.move, A)} and launches ${named(p.loser, A)} off their feet.`, "big");
        } else {
          let s = attackClause(p.winner, p.move, A) + " " + (p.damage >= 10 ? pick(LAND_BIG) : pick(LAND_SMALL));
          if (p.crushedGuard) s += ", straight through the guard";
          if (p.string >= 2) s += `, capping a ${p.string}-hit string`;
          add(s + ".");
        }
        break;
      }
      case "takedown": {
        lastBigAt = now; tally[p.winner] && (tally[p.winner].downs += 1);
        add(`${named(p.winner, A)} shoots in, hauls ${named(p.loser, A)} up and slams them to the mat.`, "big");
        break;
      }
      case "signature": {
        lastBigAt = now; tally[p.winner] && (tally[p.winner].downs += 1);
        add(`${named(p.winner, A)} unleashes ${nounOf(p.move)} — ${named(p.loser, A)} has no answer.`, "big");
        break;
      }
      case "whiff":
        add(`${attackClause(p.actor, p.move, A)}, ${pick(MISS_END)}.`);
        break;
      case "slip":
        tally[p.actor] && (tally[p.actor].def += 1);
        add(`${attackClause(foe(p.actor), p.against, A)}, but ${named(p.actor, A)} slips outside it.`);
        break;
      case "shellBlock":
        tally[p.actor] && (tally[p.actor].def += 1);
        add(`${attackClause(foe(p.actor), p.against, A)} — ${named(p.actor, A)} blocks behind the shell.`);
        break;
      case "frameElbow":
        add(`${named(p.actor, A)} frames an elbow into the gap.`);
        break;
      case "redirect":
        lastBigAt = now; tally[p.actor] && (tally[p.actor].downs += 1);
        add(p.reversal
          ? `${named(p.actor, A)} catches ${named(p.target, A)}'s attack and reverses it hard to the floor.`
          : `${named(p.actor, A)} redirects ${named(p.target, A)} past and down to the mat.`, "big");
        break;
      case "burst":
        add(`${named(p.target, A)} presses in; ${named(p.actor, A)} bursts straight back through with a counter.`);
        break;
      case "clash":
        add(`Both fighters commit at once — the strikes clash.`);
        break;
      case "postureBreak":
        add(`${named(p.actor, A)}'s guard structure folds open.`);
        break;
      case "flowState":
        add(`${named(p.actor, A)} drops into a flow state — the read comes easy now.`, "big");
        break;
      case "knockdown":
        if (now - lastBigAt > 700) { tally[p.actor] && (tally[foe(p.actor)].downs += 1); add(`${named(p.actor, A)} is put on the canvas.`); }
        break;
      case "ko":
        lastBigAt = now;
        add(`${named(p.winner, A)} drops ${named(p.loser, A)} for good. It's over.`, "big");
        break;
    }
  }

  // Past-tense round divider + a one-line recap of the round just fought.
  function roundDivider(round) {
    add(`Round ${round}`, "round");
  }
  function recap(winnerId, round, A) {
    const w = winnerId === "player" || winnerId === "enemy" ? winnerId : null;
    if (w) {
      const t = tally[w];
      const bits = [];
      if (t.downs) bits.push(`${t.downs} knockdown${t.downs > 1 ? "s" : ""}`);
      if (t.hits) bits.push(`${t.hits} clean hit${t.hits > 1 ? "s" : ""}`);
      const c = A[w] && A[w].char;
      const nm = (c && c.name) || w;
      add(`Round ${round} to ${nm}${bits.length ? " — " + bits.join(", ") : ""}.`, "recap");
    } else {
      add(`Round ${round} ends even.`, "recap");
    }
    tally = freshTally();
  }

  function setVisible(v) {
    visible = v;
    el.classList.toggle("hidden", !v);
    localStorage.setItem("saga.chronicle", v ? "on" : "off");
  }
  function toggle() { setVisible(!visible); return visible; }
  function reset() { el.innerHTML = ""; tally = freshTally(); lastBigAt = -9999; }

  return { el, note, roundDivider, recap, setVisible, toggle, reset, get visible() { return visible; } };
}
