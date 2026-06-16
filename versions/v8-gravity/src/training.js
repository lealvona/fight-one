// Training mode overlay: a move list with real frame data, a live combo
// counter, a range/whiff readout, and a startup/active/recovery phase
// visualizer for both fighters. Reads combat state; changes nothing.

import { resolveMove, signatureMove, FAMILY_LABEL } from "./data.js";

const KEYS = ["j", "k", "u", "i", "a", "s", "d", "f"];

export function createTraining() {
  const el = document.createElement("div");
  el.id = "trainingPanel";
  el.className = "trainingPanel hidden";
  document.body.appendChild(el);
  let bestString = 1;

  function show(char) { bestString = 1; el.classList.remove("hidden"); renderList(char); }
  function hide() { el.classList.add("hidden"); }

  function renderList(char) {
    let rows = `<div class="trTitle">Training &middot; ${char.name}</div>
      <div class="trGrid trHead"><span>key</span><span>technique</span><span>type</span><span>start</span><span>act</span><span>rec</span><span>dmg</span></div>`;
    for (const key of KEYS) {
      const m = resolveMove(char, key, false);
      rows += `<div class="trGrid"><span class="trKey">${m.key}</span><span>${m.name}</span><span>${FAMILY_LABEL[m.family]}</span><span>${m.startup}</span><span>${m.active}</span><span>${m.recovery}</span><span>${m.damage || "-"}</span></div>`;
    }
    const sig = signatureMove(char);
    rows += `<div class="trGrid trSig"><span class="trKey">G</span><span>${sig.name}</span><span>Art</span><span>${sig.startup}</span><span>${sig.active}</span><span>${sig.recovery}</span><span>${sig.damage}</span></div>`;
    rows += `<div class="trLive" id="trLive"></div>`;
    el.innerHTML = rows;
  }

  function phaseBar(actor) {
    const m = actor.current;
    if (!m) return `<span class="trBar"></span><b class="trIdle">idle</b>`;
    const total = m.startup + m.active + m.recovery;
    const p = Math.min(1, actor.phaseTime / total);
    const su = m.startup / total, ac = m.active / total;
    const phase = actor.phaseTime < m.startup ? "startup" : actor.phaseTime < m.startup + m.active ? "ACTIVE" : "recovery";
    return `<span class="trBar"><span class="trSeg trSu" style="width:${su * 100}%"></span><span class="trSeg trAc" style="width:${ac * 100}%"></span><span class="trSeg trRe" style="width:${(1 - su - ac) * 100}%"></span><span class="trHeadMark" style="left:${p * 100}%"></span></span><b class="trP_${phase}">${m.name} &middot; ${phase}</b>`;
  }

  function update(combat) {
    if (el.classList.contains("hidden")) return;
    const live = el.querySelector("#trLive");
    if (!live) return;
    const p = combat.actors.player, e = combat.actors.enemy;
    bestString = Math.max(bestString, p.stringCount || 0, p.stats?.maxString || 0);
    const queued = p.queue[0] || p.current;
    let whiff = "";
    if (queued && queued.min !== undefined) {
      const out = combat.game.range < queued.min || combat.game.range > queued.max;
      whiff = `<span class="${out ? "trWhiff" : "trReach"}">${queued.name}: ${out ? "OUT OF RANGE" : "in range"}</span>`;
    }
    live.innerHTML = `
      <div class="trRow"><span>combo</span><b>${p.stringCount || 0}</b><span>best</span><b>${bestString}</b><span>range</span><b>${combat.game.rangeName}</b></div>
      <div class="trRow trReadout">${whiff}</div>
      <div class="trPhaseRow"><span>you</span>${phaseBar(p)}</div>
      <div class="trPhaseRow"><span>rival</span>${phaseBar(e)}</div>`;
  }

  return { el, show, hide, update };
}
