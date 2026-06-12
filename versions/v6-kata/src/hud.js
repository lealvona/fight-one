// DOM HUD: fighter plates, flow bars, intent queues, mode/stage/character
// select, super-deck labels, stats, the live test log. No game logic here.

import { ROSTER, fullRoster, resolveMove, FAMILY_LABEL } from "./data.js";

const $ = id => document.getElementById(id);

const MODES = [
  { id: "vsai", name: "VS Rival", blurb: "you against the persona AI" },
  { id: "pvp", name: "VS Human", blurb: "two fighters, one keyboard" },
  { id: "spectate", name: "Spectate", blurb: "two AIs, you watch the doctrine" },
  { id: "gauntlet", name: "Gauntlet", blurb: "one-round ladder vs all seven" }
];

export function createHud() {
  const el = {
    pName: $("pName"), eName: $("eName"),
    pEpithet: $("pEpithet"), eEpithet: $("eEpithet"),
    pState: $("pState"), eState: $("eState"),
    pHealth: $("pHealth"), eHealth: $("eHealth"),
    pPosture: $("pPosture"), ePosture: $("ePosture"),
    pFlow: $("pFlow"), eFlow: $("eFlow"),
    pFlowWrap: $("pFlowWrap"), eFlowWrap: $("eFlowWrap"),
    pQueue: $("pQueue"), eQueue: $("eQueue"),
    pPortrait: $("pPortrait"), ePortrait: $("ePortrait"),
    range: $("range"), callout: $("callout"),
    pTempo: $("pTempo"), eTempo: $("eTempo"), roundInfo: $("roundInfo"),
    scoreRow: $("scoreRow"),
    matchOverlay: $("matchOverlay"), matchEyebrow: $("matchEyebrow"),
    matchTitle: $("matchTitle"), matchSub: $("matchSub"), matchStats: $("matchStats"),
    rematchButton: $("rematchButton"), changeButton: $("changeButton"),
    selectOverlay: $("selectOverlay"), selectGrid: $("selectGrid"),
    modeRow: $("modeRow"), stageRow: $("stageRow"),
    selectHint: $("selectHint"), selectConfirm: $("selectConfirm"), selectRandom: $("selectRandom"),
    deckTitle: $("deckTitle"),
    camButton: $("camButton"),
    openCreator: $("openCreator"),
    keysGrid: document.querySelector(".keysGrid"),
    flashLayer: $("flashLayer"),
    eventLog: $("eventLog")
  };

  const events = [];
  let deckSuper = null; // tracks which deck labels are shown (null/std/super)
  let boundPlayer = null;

  // ---- character / mode / stage select ---------------------------------------

  const select = { mode: "vsai", stage: "crucible", pickP: null, pickE: null, cards: new Map(), onStart: null, stages: [] };

  function buildSelect({ stages, onStart }) {
    select.onStart = onStart;
    select.stages = stages;

    el.modeRow.innerHTML = "";
    for (const mode of MODES) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.innerHTML = `<b>${mode.name}</b><i>${mode.blurb}</i>`;
      chip.addEventListener("click", () => { select.mode = mode.id; refreshSelect(); });
      chip.dataset.mode = mode.id;
      el.modeRow.appendChild(chip);
    }

    el.stageRow.innerHTML = "";
    for (const stage of stages) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.innerHTML = `<b>${stage.name}</b><i>${stage.blurb}</i>`;
      chip.addEventListener("click", () => { select.stage = stage.id; refreshSelect(); });
      chip.dataset.stage = stage.id;
      el.stageRow.appendChild(chip);
    }

    buildRosterGrid();
    refreshSelect();
  }

  function buildRosterGrid() {
    el.selectGrid.innerHTML = "";
    select.cards.clear();
    fullRoster().forEach((char, idx) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "charCard";
      card.style.setProperty("--char", char.ui);
      card.innerHTML = `
        <span class="charIndex">${idx + 1}</span>
        <span class="charMonogram">${char.name.split(" ").map(w => w[0]).join("")}</span>
        <span class="charName">${char.name}</span>
        <span class="charEpithet">${char.epithet}</span>
        <span class="charDiscipline">${char.discipline}</span>
        <span class="charStyle">${char.style}</span>
        <span class="charHomage">${char.homage}</span>
        <span class="charTags"></span>
        <span class="charPickTag"></span>`;
      const tags = card.querySelector(".charTags");
      const stats = char.stats;
      tags.append(
        statPip("PWR", stats.power),
        statPip("SPD", stats.speed),
        statPip("GRD", stats.postureMax / 105)
      );
      card.addEventListener("click", () => pickCharacter(char.id));
      if (char.custom) card.classList.add("customCard");
      el.selectGrid.appendChild(card);
      select.cards.set(char.id, card);
    });
  }

  function rebuildRoster() {
    if (select.pickP === "custom" || select.pickE === "custom") {
      select.pickP = select.pickP === "custom" ? null : select.pickP;
      select.pickE = select.pickE === "custom" ? null : select.pickE;
    }
    buildRosterGrid();
    refreshSelect();
  }

  function statPip(label, value) {
    const span = document.createElement("span");
    const filled = Math.max(1, Math.min(5, Math.round(value * 3.6)));
    span.className = "statPip";
    span.textContent = `${label} ${"■".repeat(filled)}${"□".repeat(5 - filled)}`;
    return span;
  }

  function needsRival() {
    return select.mode !== "gauntlet";
  }

  function pickCharacter(id) {
    if (!needsRival()) { select.pickP = id; refreshSelect(); return; }
    if (!select.pickP) select.pickP = id;
    else if (!select.pickE) select.pickE = id;
    else { select.pickP = id; select.pickE = null; }
    refreshSelect();
  }

  function pickByIndex(index) {
    const char = fullRoster()[index];
    if (char) pickCharacter(char.id);
  }

  function randomRival() {
    const roster = fullRoster();
    if (!select.pickP) select.pickP = roster[Math.floor(Math.random() * roster.length)].id;
    if (needsRival()) {
      const others = roster.filter(c => c.id !== select.pickP);
      select.pickE = others[Math.floor(Math.random() * others.length)].id;
    }
    refreshSelect();
  }

  function refreshSelect() {
    for (const chip of el.modeRow.children) chip.classList.toggle("on", chip.dataset.mode === select.mode);
    for (const chip of el.stageRow.children) chip.classList.toggle("on", chip.dataset.stage === select.stage);

    const labels = select.mode === "spectate" ? ["AI ONE", "AI TWO"]
      : select.mode === "pvp" ? ["P1", "P2"]
        : ["YOU", "RIVAL"];

    for (const [id, card] of select.cards) {
      card.classList.toggle("pickedP", select.pickP === id);
      card.classList.toggle("pickedE", select.pickE === id);
      const tag = card.querySelector(".charPickTag");
      tag.textContent = select.pickP === id && select.pickE === id
        ? `${labels[0]} + ${labels[1]}`
        : select.pickP === id ? labels[0] : select.pickE === id ? labels[1] : "";
    }

    const ready = select.pickP && (!needsRival() || select.pickE);
    el.selectHint.textContent = !select.pickP
      ? `Choose ${labels[0] === "YOU" ? "your fighter" : labels[0]} (1-9 or click)`
      : needsRival() && !select.pickE
        ? `Now choose ${labels[1]} - or roll one (R)`
        : select.mode === "gauntlet"
          ? "The ladder awaits: seven rivals, one round each."
          : "Locked in. Enter the crucible.";
    el.selectConfirm.disabled = !ready;
    el.selectRandom.hidden = !needsRival();
  }

  function confirmSelect() {
    const ready = select.pickP && (!needsRival() || select.pickE);
    if (ready && select.onStart) {
      select.onStart({ mode: select.mode, stage: select.stage }, select.pickP, select.pickE || select.pickP);
    }
  }

  function showSelect(visible) {
    el.selectOverlay.classList.toggle("hidden", !visible);
  }

  // ---- fight HUD --------------------------------------------------------------

  function bindFighters(pChar, eChar, config) {
    boundPlayer = pChar;
    el.pName.textContent = pChar.name;
    el.eName.textContent = eChar.name;
    el.pEpithet.textContent = pChar.epithet;
    el.eEpithet.textContent = eChar.epithet;
    el.pPortrait.textContent = pChar.name.split(" ").map(w => w[0]).join("");
    el.ePortrait.textContent = eChar.name.split(" ").map(w => w[0]).join("");
    el.pPortrait.style.setProperty("--char", pChar.ui);
    el.ePortrait.style.setProperty("--char", eChar.ui);

    el.deckTitle.textContent = config.mode === "pvp"
      ? "P1: J K U I / A S D F / G - P2: 1 2 3 4 / Z X C V / B"
      : config.mode === "spectate"
        ? "Spectator deck - both corners are AI-driven - C toggles camera"
        : "Nine-intent deck - flow builds the violet bar - C toggles camera";
    el.camButton.style.display = config.mode === "pvp" ? "none" : "";

    deckSuper = null;
    refreshDeck(false);
  }

  function refreshDeck(superMode) {
    if (!boundPlayer || deckSuper === superMode) return;
    deckSuper = superMode;
    el.keysGrid.classList.toggle("flowing", superMode);
    for (const keyEl of el.keysGrid.querySelectorAll("[data-key]")) {
      const key = keyEl.dataset.key;
      const label = keyEl.querySelector("i");
      if (!label) continue;
      if (key === "g") {
        label.textContent = boundPlayer.signature.name;
        continue;
      }
      const move = resolveMove(boundPlayer, key, superMode);
      if (move) {
        label.textContent = move.name;
        keyEl.title = `${FAMILY_LABEL[move.family]} - ${move.name}${move.super ? " (flow super)" : ""}`;
      }
    }
  }

  function setCameraMode(mode) {
    el.camButton.textContent = mode === "ots" ? "CAM: SHOULDER (C)" : "CAM: SIDE (C)";
    el.camButton.classList.toggle("on", mode === "ots");
  }

  function superFlash(color) {
    el.flashLayer.style.setProperty("--flash", color);
    el.flashLayer.classList.remove("active");
    void el.flashLayer.offsetWidth; // restart the animation
    el.flashLayer.classList.add("active");
  }

  function update(combat, config, gauntlet) {
    const { actors, game } = combat;
    const p = actors.player;
    const e = actors.enemy;

    el.pHealth.style.transform = `scaleX(${p.hp / 100})`;
    el.eHealth.style.transform = `scaleX(${e.hp / 100})`;
    el.pPosture.style.transform = `scaleX(${p.posture / p.postureMax})`;
    el.ePosture.style.transform = `scaleX(${e.posture / e.postureMax})`;
    el.pFlow.style.transform = `scaleX(${p.flow / 100})`;
    el.eFlow.style.transform = `scaleX(${e.flow / 100})`;
    el.pFlowWrap.classList.toggle("flowing", p.flowState);
    el.eFlowWrap.classList.toggle("flowing", e.flowState);
    el.pState.textContent = p.state;
    el.eState.textContent = e.state;
    el.pTempo.textContent = p.tempo.toFixed(2);
    el.eTempo.textContent = e.tempo.toFixed(2);
    el.pPortrait.style.boxShadow = p.tempo > 0.08 ? `0 0 ${Math.min(22, p.tempo * 26)}px ${p.char.ui}` : "none";
    el.ePortrait.style.boxShadow = e.tempo > 0.08 ? `0 0 ${Math.min(22, e.tempo * 26)}px ${e.char.ui}` : "none";
    el.roundInfo.textContent = gauntlet
      ? `bout ${gauntlet.index + 1}/${gauntlet.total} - ${Math.ceil(game.roundClock)}s`
      : game.round ? `${game.round} / ${Math.ceil(game.roundClock)}s` : "-";
    el.range.textContent = game.rangeName;
    el.callout.textContent = game.callout;

    refreshDeck(p.flowState);

    renderQueue(el.pQueue, p);
    renderQueue(el.eQueue, e);
    renderScore(game);
    renderBanner(game);
    renderEvents();
  }

  function renderQueue(node, actor) {
    node.innerHTML = "";
    const items = [actor.current, ...actor.queue].filter(Boolean).slice(0, 6);
    for (let i = 0; i < 6; i++) {
      const div = document.createElement("div");
      div.className = "slot" + (i === 0 && actor.current ? " live" : "") + (items[i]?.super ? " super" : "");
      div.textContent = items[i] ? items[i].key : "-";
      node.appendChild(div);
    }
  }

  function renderScore(game) {
    el.scoreRow.innerHTML = "";
    for (let i = 0; i < game.winsNeeded; i++) {
      const pip = document.createElement("span");
      pip.className = "pip player" + (i < game.playerRounds ? " on" : "");
      el.scoreRow.appendChild(pip);
    }
    for (let i = 0; i < game.winsNeeded; i++) {
      const pip = document.createElement("span");
      pip.className = "pip enemy" + (i < game.enemyRounds ? " on" : "");
      el.scoreRow.appendChild(pip);
    }
  }

  function renderBanner(game) {
    el.matchOverlay.classList.toggle("hidden", !game.banner.visible);
    el.matchEyebrow.textContent = game.banner.eyebrow || "ironflow apex";
    el.matchTitle.textContent = game.banner.title;
    el.matchSub.textContent = game.banner.sub;
    const showButtons = game.banner.button === true;
    el.rematchButton.hidden = !showButtons;
    el.changeButton.hidden = !showButtons;
    if (game.mode !== "matchOver") el.matchStats.innerHTML = "";
  }

  function showStats(combat) {
    const rows = [["", combat.actors.player.label, combat.actors.enemy.label]];
    const fields = [["exchanges", "exchanges won"], ["redirects", "redirects"], ["bursts", "krav bursts"], ["takedowns", "takedowns"], ["maxString", "best string"]];
    let html = `<div class="statRow statHead"><span></span><span>${combat.actors.player.label}</span><span>${combat.actors.enemy.label}</span></div>`;
    for (const [key, label] of fields) {
      html += `<div class="statRow"><span>${label}</span><span>${combat.actors.player.stats[key]}</span><span>${combat.actors.enemy.stats[key]}</span></div>`;
    }
    el.matchStats.innerHTML = html;
  }

  // ---- log ----------------------------------------------------------------------

  function pushEvent(event) {
    events.unshift(event);
    if (events.length > 8) events.pop();
  }

  function renderEvents() {
    el.eventLog.innerHTML = "";
    for (const event of events) {
      const div = document.createElement("div");
      div.className = "eventLine";
      div.innerHTML = `<b>${event.type}</b> ${summarize(event)}`;
      el.eventLog.appendChild(div);
    }
  }

  function summarize(event) {
    const d = event.detail;
    switch (event.type) {
      case "exchange": return `${d.winner} ${d.winMove} > ${d.loseMove} dmg ${d.damage}${d.kind !== "hit" ? ` [${d.kind}]` : ""}`;
      case "defense": return `${d.defender} ${d.move} ${d.kind === "burst" ? "BURSTS" : "denies"} ${d.denied}`;
      case "redirect": return `${d.defender} redirects ${d.denied}${d.reversal ? " [REVERSAL]" : ""}`;
      case "whiff": return `${d.actor} ${d.move} whiffs at ${d.range}`;
      case "input": return `${d.move} tempo ${d.tempo} queue ${d.queue}`;
      case "preempt": return `${d.move} over ${d.replaced}`;
      case "start": return `${d.actor} ${d.move} at ${d.range}`;
      case "range": return d.range;
      case "flow": return `${d.actor} flow state [${d.reason}]`;
      case "postureBreak": return `${d.actor} structure broken`;
      case "clash": return `${d.playerMove} x ${d.enemyMove}`;
      case "gauntlet": return d.state + (d.bout ? ` bout ${d.bout}` : "");
      case "roundResult": return `R${d.round} -> ${d.winner} (${d.playerRounds}-${d.enemyRounds})`;
      default: return JSON.stringify(d);
    }
  }

  return {
    el, buildSelect, showSelect, pickByIndex, randomRival, confirmSelect,
    bindFighters, update, pushEvent, superFlash, showStats,
    rebuildRoster, setCameraMode
  };
}
