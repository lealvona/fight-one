// DOM HUD: fighter plates, flow bars, intent queues, select screen, banners,
// the live test log. No game logic here.

import { ROSTER, resolveMove, FAMILY_LABEL } from "./data.js";

const $ = id => document.getElementById(id);

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
    matchTitle: $("matchTitle"), matchSub: $("matchSub"),
    rematchButton: $("rematchButton"), changeButton: $("changeButton"),
    selectOverlay: $("selectOverlay"), selectGrid: $("selectGrid"),
    selectHint: $("selectHint"), selectConfirm: $("selectConfirm"), selectRandom: $("selectRandom"),
    keysGrid: document.querySelector(".keysGrid"),
    eventLog: $("eventLog")
  };

  const events = [];

  // ---- character select -----------------------------------------------------

  const select = { pickP: null, pickE: null, cards: new Map(), onStart: null };

  function buildSelect(onStart) {
    select.onStart = onStart;
    el.selectGrid.innerHTML = "";
    select.cards.clear();
    ROSTER.forEach((char, idx) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "charCard";
      card.style.setProperty("--char", char.ui);
      card.innerHTML = `
        <span class="charIndex">${idx + 1}</span>
        <span class="charMonogram">${char.name.split(" ").map(w => w[0]).join("")}</span>
        <span class="charName">${char.name}</span>
        <span class="charEpithet">${char.epithet}</span>
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
      el.selectGrid.appendChild(card);
      select.cards.set(char.id, card);
    });
    refreshSelect();
  }

  function statPip(label, value) {
    const span = document.createElement("span");
    const filled = Math.max(1, Math.min(5, Math.round(value * 3.6)));
    span.className = "statPip";
    span.textContent = `${label} ${"■".repeat(filled)}${"□".repeat(5 - filled)}`;
    return span;
  }

  function pickCharacter(id) {
    if (!select.pickP) select.pickP = id;
    else if (!select.pickE) select.pickE = id;
    else { select.pickP = id; select.pickE = null; }
    refreshSelect();
  }

  function pickByIndex(index) {
    const char = ROSTER[index];
    if (char) pickCharacter(char.id);
  }

  function randomRival() {
    if (!select.pickP) select.pickP = ROSTER[Math.floor(Math.random() * ROSTER.length)].id;
    const others = ROSTER.filter(c => c.id !== select.pickP);
    select.pickE = others[Math.floor(Math.random() * others.length)].id;
    refreshSelect();
  }

  function refreshSelect() {
    for (const [id, card] of select.cards) {
      card.classList.toggle("pickedP", select.pickP === id);
      card.classList.toggle("pickedE", select.pickE === id);
      const tag = card.querySelector(".charPickTag");
      tag.textContent = select.pickP === id && select.pickE === id
        ? "YOU + RIVAL"
        : select.pickP === id ? "YOU" : select.pickE === id ? "RIVAL" : "";
    }
    el.selectHint.textContent = !select.pickP
      ? "Choose your fighter (1-6 or click)"
      : !select.pickE
        ? "Now choose the rival - or roll one"
        : "Locked in. Enter the crucible.";
    el.selectConfirm.disabled = !(select.pickP && select.pickE);
  }

  function confirmSelect() {
    if (select.pickP && select.pickE && select.onStart) {
      select.onStart(select.pickP, select.pickE);
    }
  }

  function showSelect(visible) {
    el.selectOverlay.classList.toggle("hidden", !visible);
  }

  // ---- fight HUD --------------------------------------------------------------

  function bindFighters(pChar, eChar) {
    el.pName.textContent = pChar.name;
    el.eName.textContent = eChar.name;
    el.pEpithet.textContent = pChar.epithet;
    el.eEpithet.textContent = eChar.epithet;
    el.pPortrait.textContent = pChar.name.split(" ").map(w => w[0]).join("");
    el.ePortrait.textContent = eChar.name.split(" ").map(w => w[0]).join("");
    el.pPortrait.style.setProperty("--char", pChar.ui);
    el.ePortrait.style.setProperty("--char", eChar.ui);

    // Deck shows the selected fighter's own move names.
    for (const keyEl of el.keysGrid.querySelectorAll("[data-key]")) {
      const key = keyEl.dataset.key;
      const label = keyEl.querySelector("i");
      if (!label) continue;
      if (key === "g") {
        label.textContent = pChar.signature.name;
      } else {
        const move = resolveMove(pChar, key);
        label.textContent = move ? move.name : "";
      }
    }
  }

  function update(combat) {
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
    el.roundInfo.textContent = game.round ? `${game.round} / ${Math.ceil(game.roundClock)}s` : "-";
    el.range.textContent = game.rangeName;
    el.callout.textContent = game.callout;

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
      div.className = "slot" + (i === 0 && actor.current ? " live" : "");
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
    el.matchEyebrow.textContent = game.banner.eyebrow || "ironflow";
    el.matchTitle.textContent = game.banner.title;
    el.matchSub.textContent = game.banner.sub;
    const over = game.mode === "matchOver";
    el.rematchButton.hidden = !over;
    el.changeButton.hidden = !over;
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
      case "roundResult": return `R${d.round} -> ${d.winner} (${d.playerRounds}-${d.enemyRounds})`;
      default: return JSON.stringify(d);
    }
  }

  return {
    el, buildSelect, showSelect, pickByIndex, randomRival, confirmSelect,
    bindFighters, update, pushEvent,
    matrixFamilies: FAMILY_LABEL
  };
}
