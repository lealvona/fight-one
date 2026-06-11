// Ironflow bootstrap: renderer, select flow, the fight loop, and telemetry.

import * as THREE from "../vendor/three.module.min.js";
import { ROSTER, charById } from "./data.js";
import { createCombat } from "./combat.js";
import { aiUpdate } from "./ai.js";
import { createRig } from "./rig.js";
import { createStage } from "./stage.js";
import { createHud } from "./hud.js";
import { createAudio } from "./audio.js";

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);

const stage = createStage(renderer);
const hud = createHud();
const audio = createAudio();

const session = {
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  pendingLogs: [],
  combat: null,
  rigs: { player: null, enemy: null },
  timeScale: 1,
  last: performance.now(),
  flushClock: 0,
  mode: "select" // select | fight
};

// Fighter spacing: combat range 0..1 maps to world separation in meters.
const SEP_MIN = 1.05;
const SEP_MAX = 4.3;

// ---- telemetry ----------------------------------------------------------------

function logEvent(type, detail = {}) {
  const event = { sessionId: session.id, t: Math.round(performance.now()), type, detail };
  hud.pushEvent(event);
  session.pendingLogs.push(event);
  console.log("[ironflow]", event);
}

function flushLogs() {
  if (!session.pendingLogs.length || location.protocol === "file:") return;
  const batch = session.pendingLogs.splice(0, session.pendingLogs.length);
  fetch("/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch),
    keepalive: true
  }).catch(() => {
    session.pendingLogs.unshift(...batch.slice(-20));
  });
}

// ---- match setup ----------------------------------------------------------------

function startMatch(pId, eId) {
  const chars = { player: charById(pId), enemy: charById(eId) };
  const roundTime = Number(new URLSearchParams(location.search).get("t")) || 60;

  for (const sideKey of ["player", "enemy"]) {
    if (session.rigs[sideKey]) {
      stage.scene.remove(session.rigs[sideKey].group);
      session.rigs[sideKey].dispose();
    }
  }
  session.rigs.player = createRig(chars.player, -1);
  session.rigs.enemy = createRig(chars.enemy, 1);
  stage.scene.add(session.rigs.player.group);
  stage.scene.add(session.rigs.enemy.group);

  session.combat = createCombat({ chars, log: logEvent, effect: onEffect, roundTime });
  hud.bindFighters(chars.player, chars.enemy);
  hud.showSelect(false);
  session.mode = "fight";
  session.combat.startMatch();
  logEvent("session", { href: location.href, player: pId, enemy: eId });
}

function backToSelect() {
  session.mode = "select";
  if (session.combat) session.combat.game.banner.visible = false;
  hud.showSelect(true);
}

// ---- effect dispatch: combat events -> 3D reactions -------------------------------

function rigOf(id) { return session.rigs[id]; }

function impactPoint(loserId, height) {
  const rig = rigOf(loserId);
  const joint = height === "high" ? "head" : height === "low" ? "kneeL" : "chest";
  return rig.worldPoint(joint).clone();
}

function onEffect(type, payload) {
  const combat = session.combat;
  if (!combat) return;

  switch (type) {
    case "hit":
    case "takedown":
    case "signature": {
      const winner = combat.actors[payload.winner];
      const pos = impactPoint(payload.loser, payload.height);
      const color = winner.char.ui;
      rigOf(payload.loser).react("hit", { height: payload.height, damage: payload.damage });
      stage.spawnSparks(pos, color, payload.damage / 9);
      stage.spawnRing(pos, color, payload.damage / 12);
      stage.spawnFloater(pos, `-${payload.damage}`, "#f4efe4");
      stage.flashRim(combat.actors[payload.winner].side * -1, 22);
      if (type === "takedown") stage.spawnFloater(pos, "TAKEDOWN", color);
      if (type === "signature") stage.spawnFloater(pos, payload.move.name.toUpperCase(), color);
      if (payload.crushedGuard) stage.spawnFloater(pos, "CRUSHED", color);
      if (type === "hit") audio.thud(payload.damage / 10);
      else audio.heavy();
      break;
    }
    case "burst": {
      const pos = impactPoint(payload.target, "mid");
      stage.spawnSparks(pos, "#f1bd4b", 1.2);
      stage.spawnRing(pos, "#f1bd4b", 1.1);
      stage.spawnFloater(pos, "KRAV BURST", "#f1bd4b");
      rigOf(payload.target).react("hit", { height: "mid", damage: payload.damage });
      audio.clink();
      audio.thud(0.6);
      break;
    }
    case "redirect": {
      const pos = impactPoint(payload.target, "mid");
      stage.spawnRing(pos, "#75c267", 1.4);
      stage.spawnSparks(pos, "#75c267", 1);
      stage.spawnFloater(pos, payload.reversal ? "REVERSAL" : "REDIRECT", "#75c267");
      audio.swoosh();
      audio.thud(0.8);
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
      stage.spawnRing(pos, "#ffffff", 2);
      stage.flashRim(-1, 60);
      stage.flashRim(1, 60);
      audio.boom();
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
      break;
    }
  }
}

// ---- input ------------------------------------------------------------------------

const FIGHT_KEYS = new Set(["j", "k", "u", "i", "a", "s", "d", "f", "g"]);

addEventListener("keydown", event => {
  audio.resume();
  const key = event.key.toLowerCase();

  if (session.mode === "select") {
    if (/^[1-6]$/.test(key)) { hud.pickByIndex(Number(key) - 1); event.preventDefault(); }
    else if (key === "r") { hud.randomRival(); event.preventDefault(); }
    else if (key === "enter") { hud.confirmSelect(); event.preventDefault(); }
    return;
  }

  if (key === "escape") { backToSelect(); return; }
  if (!FIGHT_KEYS.has(key) || event.repeat || !session.combat) return;
  event.preventDefault();
  const now = performance.now();
  if (session.combat.intent("player", key, now)) {
    session.combat.game.lastPlayerIntent = now;
  }
});

addEventListener("pointerdown", () => audio.resume(), { capture: true });

document.querySelector(".keysGrid").addEventListener("pointerdown", event => {
  const key = event.target.closest("[data-key]")?.dataset.key;
  if (!key || !session.combat || session.mode !== "fight") return;
  event.preventDefault();
  const now = performance.now();
  if (session.combat.intent("player", key, now)) {
    session.combat.game.lastPlayerIntent = now;
  }
});

hud.el.selectConfirm.addEventListener("click", () => hud.confirmSelect());
hud.el.selectRandom.addEventListener("click", () => hud.randomRival());
hud.el.rematchButton.addEventListener("click", () => {
  if (session.combat) {
    startMatch(session.combat.actors.player.char.id, session.combat.actors.enemy.char.id);
  }
});
hud.el.changeButton.addEventListener("click", backToSelect);

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  stage.resize();
});

// ---- main loop ----------------------------------------------------------------------

function frame(now) {
  const dtRaw = Math.min(40, now - session.last);
  session.last = now;

  const combat = session.combat;
  if (combat && session.mode === "fight") {
    const targetScale = combat.game.slowMo > 0 ? combat.game.slowMoScale : 1;
    session.timeScale += (targetScale - session.timeScale) * Math.min(1, dtRaw / 90);
    const dt = dtRaw * session.timeScale;

    combat.update(now, dt);
    aiUpdate(combat, dt, now);

    const sep = SEP_MIN + combat.game.range * (SEP_MAX - SEP_MIN);
    const px = -sep / 2;
    const ex = sep / 2;
    session.rigs.player.update(dtRaw, { actor: combat.actors.player, game: combat.game, t: now, targetX: px, faceSign: 1 });
    session.rigs.enemy.update(dtRaw, { actor: combat.actors.enemy, game: combat.game, t: now, targetX: ex, faceSign: -1 });
    stage.updateCamera(dtRaw, combat.game, (px + ex) / 2, sep, now);
    hud.update(combat);
  } else {
    session.timeScale = 1;
    stage.updateCamera(dtRaw, { slowMo: 0, shake: 0 }, 0, 2.4, now);
  }

  stage.update(dtRaw, now);
  stage.render();

  session.flushClock += dtRaw;
  if (session.flushClock > 600) {
    session.flushClock = 0;
    flushLogs();
  }
  requestAnimationFrame(frame);
}

// ---- boot ----------------------------------------------------------------------------

hud.buildSelect((pId, eId) => startMatch(pId, eId));

// Debug/testing handle (used by headless verification, harmless in play).
window.__ironflow = session;

const params = new URLSearchParams(location.search);
if (params.get("autostart") === "1") {
  const p = params.get("p") || "daichi";
  const e = params.get("e") || "renzo";
  startMatch(p, e);
} else {
  hud.showSelect(true);
}

logEvent("boot", { roster: ROSTER.map(c => c.id).join(",") });
requestAnimationFrame(frame);
