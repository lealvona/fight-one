// Ironflow Apex bootstrap: renderer, mode/stage select, the fight loop,
// gauntlet ladder, and telemetry.

import * as THREE from "../../../vendor/three.module.min.js";
import { ROSTER, charById } from "./data.js";
import { createCombat } from "./combat.js";
import { aiUpdate } from "./ai.js";
import { createRig } from "./rig.js";
import { createStage, STAGES } from "./stage.js";
import { createHud } from "./hud.js";
import { createAudio } from "./audio.js";
import { BUILDERS } from "./sequences.js";
import { initCreator } from "./creator.js";

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);

const hud = createHud();
const audio = createAudio();

const session = {
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  pendingLogs: [],
  combat: null,
  stage: null,
  rigs: { player: null, enemy: null },
  timeScale: 1,
  last: performance.now(),
  flushClock: 0,
  mode: "select",            // select | fight
  config: { mode: "vsai", stage: "crucible" },
  gauntlet: null,            // { queue: [charId], index, total, charId }
  cameraMode: localStorage.getItem("kata.camera") || localStorage.getItem("verite.camera") || "side",
  seqFx: []                  // scheduled choreography impacts
};

const SEP_MIN = 0.62;
const SEP_MAX = 3.2;

// ---- telemetry ----------------------------------------------------------------

function logEvent(type, detail = {}) {
  const event = { sessionId: session.id, v: "kata", t: Math.round(performance.now()), type, detail };
  hud.pushEvent(event);
  session.pendingLogs.push(event);
  console.log("[kata]", event);
}

function flushLogs() {
  if (!session.pendingLogs.length || location.protocol === "file:") return;
  const batch = session.pendingLogs.splice(0, session.pendingLogs.length);
  fetch("../../log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch),
    keepalive: true
  }).catch(() => {
    session.pendingLogs.unshift(...batch.slice(-20));
  });
}

// ---- match setup ----------------------------------------------------------------

function buildStage(stageId) {
  if (session.stage && session.stage.stageId === stageId) return;
  if (session.stage) {
    if (session.rigs.player) session.stage.scene.remove(session.rigs.player.group);
    if (session.rigs.enemy) session.stage.scene.remove(session.rigs.enemy.group);
    session.stage.dispose();
  }
  session.stage = createStage(renderer, stageId);
}

function startMatch(pId, eId, opts = {}) {
  const config = session.config;
  const chars = { player: charById(pId), enemy: charById(eId) };
  const params = new URLSearchParams(location.search);
  const roundTime = Number(params.get("t")) || 60;
  const gauntletBout = config.mode === "gauntlet";

  buildStage(config.stage);

  for (const sideKey of ["player", "enemy"]) {
    if (session.rigs[sideKey]) {
      session.rigs[sideKey].group.parent?.remove(session.rigs[sideKey].group);
      session.rigs[sideKey].dispose();
    }
  }
  session.rigs.player = createRig(chars.player, -1);
  session.rigs.enemy = createRig(chars.enemy, 1);
  session.stage.scene.add(session.rigs.player.group);
  session.stage.scene.add(session.rigs.enemy.group);

  session.combat = createCombat({
    chars,
    log: logEvent,
    effect: onEffect,
    roundTime: gauntletBout ? Math.min(roundTime, 45) : roundTime,
    winsNeeded: gauntletBout ? 1 : 2,
    maxRounds: gauntletBout ? 1 : 3
  });
  hud.bindFighters(chars.player, chars.enemy, config);
  hud.showSelect(false);
  session.mode = "fight";
  session.combat.startMatch();
  logEvent("session", { href: location.href, mode: config.mode, stage: config.stage, player: pId, enemy: eId, gauntlet: session.gauntlet ? `${session.gauntlet.index + 1}/${session.gauntlet.total}` : null });
}

function startGauntlet(pId) {
  const others = ROSTER.filter(c => c.id !== pId).map(c => c.id);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  session.gauntlet = { queue: others, index: 0, total: others.length, charId: pId };
  startMatch(pId, others[0]);
}

function gauntletMods() {
  if (!session.gauntlet) return null;
  const k = session.gauntlet.index / Math.max(1, session.gauntlet.total - 1);
  return { aggression: k * 0.25, readSkill: k * 0.2 };
}

function backToSelect() {
  session.mode = "select";
  session.gauntlet = null;
  if (session.combat) session.combat.game.banner.visible = false;
  hud.showSelect(true);
}

// ---- effect dispatch ---------------------------------------------------------------

function rigOf(id) { return session.rigs[id]; }

// Striking reach of each limb as a fraction of the attacker's height, plus
// the defender's body half-width. The lunge closes the gap so the technique's
// endpoint arrives exactly at the target surface - no air gap, no overlap.
const LIMB_REACH = { LH: 0.50, RH: 0.52, LL: 0.58, RL: 0.63, HB: 0.26, BR: 0.48, GR: 0.36, ART: 0.5 };

function solveLungeDistance(attackerId, defenderId, move) {
  const a = session.combat.actors[attackerId].char;
  const reach = (LIMB_REACH[move?.limb] ?? 0.5) * a.body.height;
  const targetHalf = 0.13 * session.combat.actors[defenderId].char.body.bulk;
  const gap = Math.abs(rigOf(attackerId).x - rigOf(defenderId).x);
  return Math.max(0, Math.min(1.35, gap - (reach * 0.96 + targetHalf)));
}

function anySequenceActive() {
  return (session.rigs.player && session.rigs.player.sequenceActive()) ||
    (session.rigs.enemy && session.rigs.enemy.sequenceActive());
}

// Run a two-body choreography: freeze the sim, hand both rigs their tracks,
// and schedule the contact FX along the timeline.
function runPaired(kind, attackerId, victimId, color) {
  const builder = BUILDERS[kind];
  const combat = session.combat;
  if (!builder || !combat) return false;
  const aRig = rigOf(attackerId);
  const vRig = rigOf(victimId);
  const dir = combat.actors[attackerId].side < 0 ? 1 : -1; // player faces +x
  const seq = builder({ ax: aRig.x, vx: vRig.x, dir });

  aRig.playSequence(seq.attacker, seq.duration);
  vRig.playSequence(seq.victim, seq.duration);
  combat.game.hitStop = Math.max(combat.game.hitStop, seq.duration + 80);

  const now = performance.now();
  for (const imp of seq.impacts) {
    session.seqFx.push({
      at: now + imp.t * seq.duration,
      x: imp.x, y: imp.y, power: imp.power, label: imp.label, color
    });
  }
  return true;
}

function processSeqFx(now) {
  const stage = session.stage;
  if (!stage || !session.seqFx.length) return;
  for (let i = session.seqFx.length - 1; i >= 0; i--) {
    const fx = session.seqFx[i];
    if (now < fx.at) continue;
    session.seqFx.splice(i, 1);
    const pos = { x: fx.x, y: Math.max(0.25, fx.y), z: 0 };
    stage.spawnFlash(pos, fx.color || "#f4efe8", fx.power);
    stage.spawnSparks(pos, fx.color || "#f4efe4", fx.power);
    stage.spawnRing(pos, fx.color || "#f4efe4", fx.power);
    if (fx.label) stage.spawnFloater(pos, fx.label, fx.color || "#f1bd4b");
    if (session.combat) session.combat.game.shake = Math.min(16, session.combat.game.shake + 3 + fx.power * 3);
    if (fx.power >= 1.4) {
      stage.spawnDust(fx.x, fx.power);
      stage.punch(0.18 + fx.power * 0.1);
      audio.heavy();
    } else {
      audio.thud(fx.power);
    }
  }
}

function impactPoint(loserId, height) {
  const rig = rigOf(loserId);
  const joint = height === "high" ? "head" : height === "low" ? "kneeL" : "chest";
  return rig.worldPoint(joint).clone();
}

function onEffect(type, payload) {
  const combat = session.combat;
  const stage = session.stage;
  if (!combat || !stage) return;

  switch (type) {
    case "hit":
    case "takedown":
    case "signature": {
      const winner = combat.actors[payload.winner];
      const pos = impactPoint(payload.loser, payload.height);
      const color = winner.char.ui;
      stage.spawnFloater(pos, `-${payload.damage}`, "#f4efe4");
      stage.flashRim(winner.side * -1, 40);
      if (payload.string >= 2) stage.spawnFloater(pos, `${payload.string}x STRING`, "#f1bd4b");
      if (payload.crushedGuard) stage.spawnFloater(pos, "CRUSHED", color);

      // Big interactions are performed, not implied: both bodies play the move out.
      if (type === "takedown") {
        stage.spawnFloater(pos, "TAKEDOWN", color);
        runPaired("takedown", payload.winner, payload.loser, color);
      } else if (type === "signature") {
        stage.spawnFloater(pos, payload.move.name.toUpperCase(), color);
        runPaired("signature", payload.winner, payload.loser, color);
      } else if (payload.launched) {
        stage.spawnFloater(pos, payload.move.name.toUpperCase(), color);
        runPaired("launcher", payload.winner, payload.loser, color);
      } else {
        // Ordinary contact: the reach solver closes the gap so the technique's
        // endpoint arrives exactly at the target surface, and the recipient
        // reacts in the form that this specific technique produces.
        rigOf(payload.winner).react("lunge", { dist: solveLungeDistance(payload.winner, payload.loser, payload.move) });
        rigOf(payload.loser).react("hit", { height: payload.height, damage: payload.damage, move: payload.move });
        stage.spawnFlash(pos, color, payload.damage / 9);
        stage.spawnSparks(pos, color, payload.damage / 9);
        stage.spawnRing(pos, color, payload.damage / 12);
        if (payload.damage >= 10) stage.punch(0.22 + payload.damage * 0.01);
        if (payload.move.super) {
          stage.spawnFloater(rigOf(payload.winner).worldPoint("head").clone(), payload.move.name.toUpperCase(), color);
          stage.spawnSparks(pos, color, 1.6);
        }
        audio.thud(payload.damage / 10);
      }
      break;
    }
    case "burst": {
      const pos = impactPoint(payload.target, "mid");
      stage.spawnFloater(pos, "KRAV BURST", "#f1bd4b");
      audio.clink();
      runPaired("burst", payload.actor, payload.target, "#f1bd4b");
      break;
    }
    case "redirect": {
      const pos = impactPoint(payload.target, "mid");
      stage.spawnFloater(pos, payload.reversal ? "REVERSAL" : "REDIRECT", "#75c267");
      audio.swoosh();
      runPaired("redirect", payload.actor, payload.target, "#75c267");
      break;
    }
    case "slip": {
      const pos = rigOf(payload.actor).worldPoint("chest").clone();
      stage.spawnFloater(pos, "SLIP", "#75c267");
      audio.swoosh();
      break;
    }
    case "shellBlock": {
      rigOf(payload.actor).react("block");
      const pos = rigOf(payload.actor).worldPoint("chest").clone();
      stage.spawnRing(pos, "#f1bd4b", 0.6);
      audio.clink();
      break;
    }
    case "frameElbow": {
      const pos = rigOf(payload.actor).worldPoint("chest").clone();
      stage.spawnFloater(pos, "FRAME ELBOW", "#f1bd4b");
      break;
    }
    case "whiff": {
      const pos = rigOf(payload.actor).worldPoint("chest").clone();
      stage.spawnFloater(pos, "WHIFF", "#aeb6bb");
      audio.swoosh();
      break;
    }
    case "postureBreak": {
      const pos = rigOf(payload.actor).worldPoint("chest").clone();
      stage.spawnRing(pos, "#e45745", 1.6);
      stage.spawnFloater(pos, "BREAK", "#e45745");
      audio.crack();
      break;
    }
    case "flowState": {
      const pos = rigOf(payload.actor).worldPoint("head").clone();
      stage.spawnFloater(pos, "FLOW STATE", "#b78cff");
      stage.spawnRing(pos, "#b78cff", 1.5);
      audio.chime();
      break;
    }
    case "flowEnd": {
      const pos = rigOf(payload.actor).worldPoint("chest").clone();
      stage.spawnFloater(pos, "FLOW FADES", "#8a7fb5");
      break;
    }
    case "artFlash": {
      hud.superFlash(combat.actors[payload.actor].char.ui);
      stage.flashRim(-1, 70);
      stage.flashRim(1, 70);
      audio.chime();
      break;
    }
    case "clash": {
      const mid = rigOf("player").worldPoint("chest").clone().add(rigOf("enemy").worldPoint("chest")).multiplyScalar(0.5);
      stage.spawnRing(mid, "#f1bd4b", 1.3);
      stage.spawnSparks(mid, "#f1bd4b", 1.4);
      stage.spawnFloater(mid, "CLASH", "#f1bd4b");
      audio.clink();
      audio.thud(0.7);
      break;
    }
    case "ko": {
      const pos = impactPoint(payload.loser, "high");
      stage.spawnFloater(pos, "KO", "#e45745");
      stage.flashRim(-1, 60);
      stage.flashRim(1, 60);
      audio.boom();
      // If the finishing blow wasn't already a choreographed slam/launcher,
      // play the clean collapse.
      if (!anySequenceActive()) {
        runPaired("collapse", payload.winner, payload.loser, "#e45745");
      }
      break;
    }
    case "groundArmed": {
      const pos = rigOf(payload.actor).worldPoint("chest").clone();
      stage.spawnFloater(pos, "GRIP KEPT", "#b78cff");
      break;
    }
    case "groundReversal": {
      const pos = rigOf(payload.target).worldPoint("chest").clone();
      stage.spawnFloater(pos, "GROUND REVERSAL", "#75c267");
      audio.swoosh();
      runPaired("groundReversal", payload.actor, payload.target, "#75c267");
      break;
    }
    case "roundIntro": {
      rigOf("player").react("reset");
      rigOf("enemy").react("reset");
      rigOf("player").react("intro");
      rigOf("enemy").react("intro");
      break;
    }
    case "roundResult": {
      if (payload.winner === "player" || payload.winner === "enemy") {
        rigOf(payload.winner).react("celebrate");
        const loser = payload.winner === "player" ? "enemy" : "player";
        if (!combat.actors[loser].koed) rigOf(loser).react("defeated");
      }
      break;
    }
    case "matchOver": {
      if (payload.winner === "player" || payload.winner === "enemy") {
        rigOf(payload.winner).react("celebrate");
      }
      hud.showStats(combat);
      handleGauntletResult(payload.winner);
      break;
    }
  }
}

function handleGauntletResult(winner) {
  if (session.config.mode !== "gauntlet" || !session.gauntlet) return;
  const g = session.gauntlet;
  const combat = session.combat;

  if (winner === "player") {
    if (g.index + 1 >= g.total) {
      combat.game.banner = {
        title: "Crucible Champion", sub: `All ${g.total} rivals answered`,
        eyebrow: "gauntlet complete", visible: true, button: true
      };
      logEvent("gauntlet", { state: "champion" });
      session.gauntlet = null;
    } else {
      g.index += 1;
      combat.game.banner = {
        title: `Bout ${g.index + 1} / ${g.total}`, sub: `${charById(g.queue[g.index]).name} steps in`,
        eyebrow: "the gauntlet continues", visible: true, button: false
      };
      setTimeout(() => {
        if (session.config.mode === "gauntlet" && session.gauntlet === g) {
          startMatch(g.charId, g.queue[g.index]);
        }
      }, 2400);
    }
  } else {
    combat.game.banner = {
      title: "Run Ends", sub: `Fell at bout ${g.index + 1} of ${g.total}`,
      eyebrow: "the gauntlet remembers", visible: true, button: true
    };
    logEvent("gauntlet", { state: "fell", bout: g.index + 1 });
    session.gauntlet = null;
  }
}

// ---- input ------------------------------------------------------------------------

const P1_KEYS = new Set(["j", "k", "u", "i", "a", "s", "d", "f", "g"]);
const P2_KEYS = { "1": "j", "2": "k", "3": "u", "4": "i", "z": "a", "x": "s", "c": "d", "v": "f", "b": "g" };

addEventListener("keydown", event => {
  audio.resume();
  const key = event.key.toLowerCase();

  if (session.mode === "select") {
    if (/^[1-8]$/.test(key)) { hud.pickByIndex(Number(key) - 1); event.preventDefault(); }
    else if (key === "r") { hud.randomRival(); event.preventDefault(); }
    else if (key === "enter") { hud.confirmSelect(); event.preventDefault(); }
    return;
  }

  if (key === "escape") { backToSelect(); return; }
  if (key === "c" && session.config.mode !== "pvp") {
    session.cameraMode = session.cameraMode === "side" ? "ots" : "side";
    localStorage.setItem("kata.camera", session.cameraMode);
    hud.setCameraMode(session.cameraMode);
    event.preventDefault();
    return;
  }
  if (event.repeat || !session.combat) return;

  const now = performance.now();
  const cfg = session.config.mode;

  if (P1_KEYS.has(key) && cfg !== "spectate") {
    event.preventDefault();
    if (session.combat.intent("player", key, now)) {
      session.combat.game.lastPlayerIntent = now;
    }
    return;
  }
  if (cfg === "pvp" && P2_KEYS[key]) {
    event.preventDefault();
    if (session.combat.intent("enemy", P2_KEYS[key], now)) {
      session.combat.game.lastPlayerIntent = now;
    }
  }
});

addEventListener("pointerdown", () => audio.resume(), { capture: true });

document.querySelector(".keysGrid").addEventListener("pointerdown", event => {
  const key = event.target.closest("[data-key]")?.dataset.key;
  if (!key || !session.combat || session.mode !== "fight" || session.config.mode === "spectate") return;
  event.preventDefault();
  const now = performance.now();
  if (session.combat.intent("player", key, now)) {
    session.combat.game.lastPlayerIntent = now;
  }
});

hud.el.selectConfirm.addEventListener("click", () => hud.confirmSelect());
hud.el.selectRandom.addEventListener("click", () => hud.randomRival());
hud.el.rematchButton.addEventListener("click", () => {
  if (session.config.mode === "gauntlet") {
    startGauntlet(session.combat.actors.player.char.id);
  } else if (session.combat) {
    startMatch(session.combat.actors.player.char.id, session.combat.actors.enemy.char.id);
  }
});
hud.el.changeButton.addEventListener("click", backToSelect);

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  if (session.stage) session.stage.resize();
});

// ---- main loop ----------------------------------------------------------------------

function frame(now) {
  const dtRaw = Math.min(40, now - session.last);
  session.last = now;

  const combat = session.combat;
  if (combat && session.mode === "fight") {
    // Hit-stop: the world holds its breath on contact.
    let dt;
    if (combat.game.hitStop > 0) {
      combat.game.hitStop -= dtRaw;
      dt = 0;
    } else {
      const targetScale = combat.game.slowMo > 0 ? combat.game.slowMoScale : 1;
      session.timeScale += (targetScale - session.timeScale) * Math.min(1, dtRaw / 90);
      dt = dtRaw * session.timeScale;
    }

    combat.update(now, dt);

    const cfg = session.config.mode;
    if (cfg === "vsai") {
      aiUpdate(combat, dt, now, "enemy", null, true);
    } else if (cfg === "gauntlet") {
      aiUpdate(combat, dt, now, "enemy", gauntletMods(), true);
    } else if (cfg === "spectate") {
      aiUpdate(combat, dt, now, "player", null, false);
      aiUpdate(combat, dt, now, "enemy", null, false);
    }

    const sep = SEP_MIN + combat.game.range * (SEP_MAX - SEP_MIN);
    const px = -sep / 2;
    const ex = sep / 2;
    const seqLive = anySequenceActive();
    const rigDt = combat.game.hitStop > 0 && !seqLive ? dtRaw * 0.16 : dtRaw;
    session.rigs.player.update(rigDt, { actor: combat.actors.player, game: combat.game, t: now, targetX: px, faceSign: 1 });
    session.rigs.enemy.update(rigDt, { actor: combat.actors.enemy, game: combat.game, t: now, targetX: ex, faceSign: -1 });
    processSeqFx(now);
    const camGame = seqLive ? { slowMo: 1, slowMoScale: 0.5, shake: combat.game.shake } : combat.game;
    const view = {
      ots: session.cameraMode === "ots" && session.config.mode !== "pvp",
      px: session.rigs.player.x, ex: session.rigs.enemy.x
    };
    session.stage.updateCamera(dtRaw, camGame, (session.rigs.player.x + session.rigs.enemy.x) / 2, sep, now, view);
    hud.update(combat, session.config, session.gauntlet);
  } else {
    session.timeScale = 1;
    if (session.stage) session.stage.updateCamera(dtRaw, { slowMo: 0, shake: 0 }, 0, 2.4, now, null);
  }

  if (session.stage) {
    session.stage.update(dtRaw, now);
    session.stage.render();
  }

  session.flushClock += dtRaw;
  if (session.flushClock > 600) {
    session.flushClock = 0;
    flushLogs();
  }
  requestAnimationFrame(frame);
}

// ---- boot ----------------------------------------------------------------------------

hud.buildSelect({
  stages: STAGES,
  onStart: (config, pId, eId) => {
    session.config = { mode: config.mode, stage: config.stage };
    if (config.mode === "gauntlet") startGauntlet(pId);
    else startMatch(pId, eId);
  }
});
initCreator({ onSaved: () => hud.rebuildRoster() });
hud.setCameraMode(session.cameraMode);
hud.el.camButton.addEventListener("click", () => {
  if (session.config.mode === "pvp") return;
  session.cameraMode = session.cameraMode === "side" ? "ots" : "side";
  localStorage.setItem("kata.camera", session.cameraMode);
  hud.setCameraMode(session.cameraMode);
});

// Cinema finish: a once-generated grain tile + vignette over everything.
(function filmLayer() {
  const layer = document.getElementById("filmLayer");
  if (!layer) return;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 128;
  const c2d = tile.getContext("2d");
  const img = c2d.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 60;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 14;
  }
  c2d.putImageData(img, 0, 0);
  layer.style.backgroundImage = `url(${tile.toDataURL()})`;
})();

// Debug/testing handle (used by headless verification, harmless in play).
window.__ironflow = session;

const params = new URLSearchParams(location.search);
buildStage(params.get("stage") || "crucible");
if (params.get("autostart") === "1") {
  session.config.mode = params.get("mode") || "vsai";
  session.config.stage = params.get("stage") || "crucible";
  const p = params.get("p") || "daichi";
  const e = params.get("e") || "renzo";
  if (session.config.mode === "gauntlet") startGauntlet(p);
  else startMatch(p, e);
} else {
  hud.showSelect(true);
}

logEvent("boot", { roster: ROSTER.map(c => c.id).join(",") });
requestAnimationFrame(frame);
