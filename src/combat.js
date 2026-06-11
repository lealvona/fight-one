// Ironflow combat engine. Pure state + rules; no DOM, no rendering.
// main.js drives update() and subscribes via the effect() callback.

import { BEATS, OPEN_LINE, FRAME_ELBOW, resolveMove, signatureMove } from "./data.js";

const QUEUE_CAP = 6;
const INTENT_TTL = 2200;
const BURST_WINDOW = 170;     // "just guard" window for a Krav burst counter (ms)
const ELBOW_RANGE = 0.42;     // shell answers with elbows inside this range
const TAKEDOWN_RANGE = 0.24;  // clinch wins convert to slams inside this range
const PUNISH_TIME = 700;      // open-line window after a whiff or redirect
const KNOCKDOWN_MS = 850;
const STAGGER_MS = 1100;
const FLOW_MAX = 100;

export function createCombat({ chars, log, effect, roundTime = 60 }) {
  const actors = {
    player: makeActor("player", -1, chars.player),
    enemy: makeActor("enemy", 1, chars.enemy)
  };

  const game = {
    mode: "intro",
    range: 0.52,
    rangeName: "entry range",
    lastRangeName: "entry range",
    round: 0,
    maxRounds: 3,
    winsNeeded: 2,
    roundTime,
    roundClock: roundTime,
    playerRounds: 0,
    enemyRounds: 0,
    roundLocked: true,
    started: false,
    aiClock: 900,
    lastPlayerIntent: 0,
    callout: "Flow is the weapon",
    shake: 0,
    slowMo: 0,
    slowMoScale: 1,
    banner: { title: "", sub: "", eyebrow: "", visible: false, button: false },
    modeClock: 0,
    bannerClock: 0
  };

  function makeActor(id, side, char) {
    return {
      id, side, char,
      label: char.name.split(" ")[0],
      hp: 100,
      posture: char.stats.postureMax,
      postureMax: char.stats.postureMax,
      flow: 0,
      flowState: false,
      queue: [],
      current: null,
      phaseTime: 0,
      prevPhaseTime: 0,
      state: "ready",
      tempo: 0,
      inputTimes: [],
      sway: Math.random() * 6,
      hitPulse: 0,
      downTime: 0,
      staggerTime: 0,
      punishTime: 0,
      lastFamily: null,
      koed: false
    };
  }

  function other(actor) {
    return actor === actors.player ? actors.enemy : actors.player;
  }

  function pretty(actor) {
    return actor.label;
  }

  function addFlow(actor, amount, reason) {
    if (actor.flowState && amount > 0) return;
    const before = actor.flow;
    actor.flow = clamp(actor.flow + amount, 0, FLOW_MAX);
    if (!actor.flowState && actor.flow >= FLOW_MAX) {
      actor.flowState = true;
      effect("flowState", { actor: actor.id });
      game.callout = `${pretty(actor)} enters flow state`;
      log("flow", { actor: actor.id, reason });
    } else if (amount > 0 && before < actor.flow && reason === "chain") {
      // silent accumulation; HUD bar shows it
    }
  }

  function spendFlow(actor) {
    actor.flow = 0;
    actor.flowState = false;
  }

  // ---- input ---------------------------------------------------------------

  function intent(actorId, key, now) {
    const actor = actors[actorId];
    if (game.mode !== "fight" || game.roundLocked) return false;
    if (actor.downTime > 0 || actor.staggerTime > 0) return false;

    let move;
    if (key === "g") {
      if (!actor.flowState) {
        if (actorId === "player") game.callout = "Signature needs full flow";
        return false;
      }
      move = signatureMove(actor.char);
    } else {
      move = resolveMove(actor.char, key);
      if (!move) return false;
    }
    enqueue(actor, move, now, actorId === "player");
    return true;
  }

  function enqueue(actor, move, now, human) {
    actor.inputTimes = actor.inputTimes.filter(t => now - t < 900);
    actor.inputTimes.push(now);
    actor.tempo = actor.inputTimes.length / 6;

    const speed = actor.char.stats.speed * (actor.flowState ? 1.12 : 1);
    const item = {
      ...move,
      id: `${now.toFixed(0)}-${Math.random().toString(36).slice(2, 7)}`,
      startup: Math.round(move.startup / speed),
      recovery: Math.round(move.recovery / speed),
      age: 0,
      tempo: actor.tempo,
      resolved: false
    };

    if (!move.free) {
      if (actor.lastFamily && actor.lastFamily !== move.family) addFlow(actor, 4, "chain");
      else if (actor.lastFamily === move.family) addFlow(actor, -5, "stagnation");
      actor.lastFamily = move.family;
    }

    const canSpike = actor.tempo > 0.55 && move.canPreempt;
    const target = actor.queue.findIndex(q => q.commitment <= move.commitment && q.canPreempt);

    if (canSpike && target >= 0) {
      const replaced = actor.queue[target];
      actor.queue[target] = item;
      actor.posture = clamp(actor.posture - 4 - move.commitment * 2, 0, actor.postureMax);
      actor.state = "preempt";
      if (human) {
        game.callout = `${move.name} overwrites ${replaced.name}`;
        log("preempt", { actor: actor.id, move: move.name, replaced: replaced.name, tempo: round2(actor.tempo) });
      }
    } else {
      actor.queue.push(item);
      if (human) log("input", { actor: actor.id, move: move.name, tempo: round2(actor.tempo), queue: actor.queue.map(q => q.key).join("") });
    }

    if (actor.queue.length > QUEUE_CAP) {
      actor.queue.splice(QUEUE_CAP);
      actor.posture = clamp(actor.posture - 5, 0, actor.postureMax);
      log("overflow", { actor: actor.id });
    }
  }

  // ---- per-frame -----------------------------------------------------------

  function update(now, dt) {
    repairState();
    updateMode(dt);

    if (game.mode === "fight" && !game.roundLocked) {
      game.roundClock = Math.max(0, game.roundClock - dt / 1000);
      if (game.roundClock <= 0) {
        game.callout = "Time";
        awardRound(decideRoundByVitals(), "time");
      }
    }

    tickActor(actors.player, dt);
    tickActor(actors.enemy, dt);
    resolveActive();
    updateRange(dt);
    regenerate(dt);

    game.shake *= Math.pow(0.86, dt / 16);
    if (game.slowMo > 0) game.slowMo -= dt;
  }

  function updateMode(dt) {
    if (game.bannerClock > 0) {
      game.bannerClock -= dt;
      if (game.bannerClock <= 0 && game.mode === "fight") game.banner.visible = false;
    }
    if (game.modeClock > 0) {
      game.modeClock -= dt;
      if (game.modeClock > 0) return;
      if (game.mode === "intro") beginFight();
      else if (game.mode === "roundOver") {
        if (game.playerRounds >= game.winsNeeded || game.enemyRounds >= game.winsNeeded || game.round >= game.maxRounds) finishMatch();
        else prepareNextRound();
      }
    }
  }

  function tickActor(actor, dt) {
    actor.hitPulse = Math.max(0, actor.hitPulse - dt);
    actor.punishTime = Math.max(0, actor.punishTime - dt);

    if (actor.downTime > 0) {
      actor.downTime -= dt;
      actor.state = actor.koed ? "down" : "rising";
      return;
    }
    if (actor.staggerTime > 0) {
      actor.staggerTime -= dt;
      actor.state = "staggered";
      if (actor.staggerTime <= 0) actor.posture = Math.round(actor.postureMax * 0.5);
      return;
    }
    if (game.roundLocked || game.mode !== "fight") {
      actor.state = actor.hp <= 0 ? "down" : "ready";
      return;
    }

    actor.sway += dt * 0.004;

    for (const item of actor.queue) item.age += dt;
    actor.queue = actor.queue.filter(item => item.age < INTENT_TTL);

    if (!actor.current && actor.queue.length) {
      actor.current = actor.queue.shift();
      actor.phaseTime = 0;
      actor.prevPhaseTime = 0;
      actor.state = actor.current.name;
      effect("moveStart", { actor: actor.id, move: actor.current });
      log("start", { actor: actor.id, move: actor.current.name, range: game.rangeName });
    }

    if (!actor.current) {
      actor.state = actor.posture < actor.postureMax * 0.28 ? "rattled" : "ready";
      return;
    }

    actor.prevPhaseTime = actor.phaseTime;
    actor.phaseTime += dt;

    const move = actor.current;
    // Crossing into active frames: apply the lunge, then check the range band.
    if (actor.prevPhaseTime < move.startup && actor.phaseTime >= move.startup) {
      if (move.step) {
        game.range = clamp(game.range + move.step, 0.08, 0.96);
      }
      checkWhiff(actor, move);
    }

    const total = move.startup + move.active + move.recovery;
    if (actor.phaseTime >= total) {
      if (move.art) spendFlow(actor);
      actor.current = null;
      actor.phaseTime = 0;
    }
  }

  function checkWhiff(actor, move) {
    if (move.family === "guard" || move.family === "evade") return;
    const foe = other(actor);

    if (foe.downTime > 0) {
      // No ground-and-pound: downed fighters roll out. The attack passes over.
      move.resolved = true;
      actor.posture = clamp(actor.posture - 4, 0, actor.postureMax);
      game.callout = `${pretty(foe)} rolls clear`;
      log("rollout", { actor: actor.id, move: move.name });
      return;
    }
    if (game.range < move.min || game.range > move.max) {
      move.resolved = true;
      actor.posture = clamp(actor.posture - 8, 0, actor.postureMax);
      addFlow(actor, -8, "whiff");
      foe.punishTime = PUNISH_TIME;
      if (move.art) spendFlow(actor);
      game.callout = `${move.name} cuts empty air`;
      effect("whiff", { actor: actor.id, move });
      log("whiff", { actor: actor.id, move: move.name, range: game.rangeName });
    }
  }

  // ---- resolution ----------------------------------------------------------

  function resolveActive() {
    if (game.roundLocked || game.mode !== "fight") return;

    const p = isLiveThreat(actors.player);
    const e = isLiveThreat(actors.enemy);
    if (!p && !e) return;

    if (p && e) {
      actors.player.current.resolved = true;
      actors.enemy.current.resolved = true;
      const outcome = compare(actors.player, actors.enemy);
      if (outcome > 0) resolveWinner(actors.player, actors.enemy);
      else if (outcome < 0) resolveWinner(actors.enemy, actors.player);
      else clash();
      return;
    }
    if (p) resolveSingle(actors.player, actors.enemy);
    if (e) resolveSingle(actors.enemy, actors.player);
  }

  function isLiveThreat(actor) {
    return actor.current && !actor.current.resolved && inActive(actor) && actor.downTime <= 0 && actor.staggerTime <= 0;
  }

  function inActive(actor) {
    const m = actor.current;
    return m && actor.phaseTime >= m.startup && actor.phaseTime <= m.startup + m.active;
  }

  function resolveSingle(attacker, defender) {
    const attack = attacker.current;
    if (attack.family === "guard" || attack.family === "evade") {
      attack.resolved = true;
      applyReady(attacker, attack);
      return;
    }

    attack.resolved = true;
    const defense = defender.current && inActive(defender) && defender.downTime <= 0 ? defender.current : null;
    if (!defense) {
      applyWin(attacker, defender, attack, OPEN_LINE);
      return;
    }
    const outcome = compareMoves(attacker, attack, defender, defense);
    if (outcome >= 0) resolveWinner(attacker, defender);
    else applyDefense(defender, attacker, defense, attack);
  }

  function compare(a, b) {
    return compareMoves(a, a.current, b, b.current);
  }

  function compareMoves(actorA, a, actorB, b) {
    if (BEATS[a.family]?.includes(b.family)) return 1;
    if (BEATS[b.family]?.includes(a.family)) return -1;

    if (a.height === "low" && b.height === "high") return 1;
    if (b.height === "low" && a.height === "high") return -1;

    const pa = a.priority + a.tempo * 1.4 + (actorA.punishTime > 0 ? 2 : 0);
    const pb = b.priority + b.tempo * 1.4 + (actorB.punishTime > 0 ? 2 : 0);
    if (Math.abs(pa - pb) < 0.65) return 0;
    return pa > pb ? 1 : -1;
  }

  function resolveWinner(winner, loser) {
    const winMove = winner.current;
    const loseMove = loser.current;
    winMove.resolved = true;
    if (loseMove) loseMove.resolved = true;
    if (winMove.family === "guard" || winMove.family === "evade") {
      applyDefense(winner, loser, winMove, loseMove || OPEN_LINE);
    } else {
      applyWin(winner, loser, winMove, loseMove || OPEN_LINE);
    }
  }

  function applyWin(winner, loser, winMove, loseMove) {
    if (game.roundLocked || winner.hp <= 0 || loser.hp <= 0) return;

    const power = winner.char.stats.power;
    const takedown = winMove.family === "clinch" && game.range < TAKEDOWN_RANGE;
    const art = winMove.family === "art";
    const crushedGuard = art && loseMove.family === "guard";

    let damage = (winMove.damage + winMove.commitment) * power;
    if (takedown) damage *= winner.char.id === "lobo" ? 1.8 : 1.6;
    if (winner.punishTime > 0) { damage *= 1.3; winner.punishTime = 0; }
    if (winner.flowState && !art) damage *= 1.15;
    if (crushedGuard) damage *= 0.75;
    const vulnerable = loser.staggerTime > 0 || loser.posture < loser.postureMax * 0.33;
    if (vulnerable) damage *= 1.45;
    damage = Math.max(1, Math.round(damage));

    const postureHit = Math.round((winMove.posture || 0) * power * (takedown ? 1.5 : 1));
    loser.hp = clamp(loser.hp - damage, 0, 100);
    loser.posture = clamp(loser.posture - postureHit, 0, loser.postureMax);
    winner.posture = clamp(winner.posture + 5, 0, winner.postureMax);
    winner.hitPulse = 140;
    loser.hitPulse = 240;

    const resist = 1.6 - loser.char.stats.weight * 0.6;
    game.range = clamp(game.range + (winMove.push || 0) * resist, 0.08, 0.96);
    game.shake = Math.min(16, game.shake + 5 + winMove.commitment);

    let kind = "hit";
    if (takedown) {
      kind = "takedown";
      knockdown(loser, 900);
      game.range = clamp(0.45, 0.08, 0.96);
      game.slowMo = 420; game.slowMoScale = 0.45;
      game.callout = `${pretty(winner)}: ${winMove.name} plants ${pretty(loser)}`;
      addFlow(winner, 12, "takedown");
    } else if (art) {
      kind = "signature";
      knockdown(loser, 1000);
      game.slowMo = 620; game.slowMoScale = 0.35;
      game.callout = `${winMove.name}!`;
      spendFlow(winner);
    } else {
      game.callout = `${pretty(winner)}: ${winMove.name} answers ${loseMove.name}`;
      addFlow(winner, 12, "exchange");
    }
    addFlow(loser, -6, "tagged");

    effect(kind, {
      winner: winner.id, loser: loser.id,
      move: winMove, against: loseMove,
      damage, height: winMove.height, crushedGuard
    });
    log("exchange", {
      winner: winner.id, loser: loser.id, winMove: winMove.name, loseMove: loseMove.name,
      damage, kind, playerHp: actors.player.hp, enemyHp: actors.enemy.hp, range: game.rangeName
    });

    if (loser.posture <= 0 && loser.hp > 0 && loser.downTime <= 0) postureBreak(loser);
    if (loser.hp <= 0) koFinish(winner, loser, winMove);
  }

  function applyDefense(defender, attacker, defenseMove, attackMove) {
    if (game.roundLocked || defender.hp <= 0 || attacker.hp <= 0) return;
    defenseMove.resolved = true;
    if (attackMove !== OPEN_LINE) attackMove.resolved = true;

    if (defenseMove.family === "evade") {
      const committed = attackMove.commitment >= 2 || attackMove.family === "art";
      if (committed && attackMove !== OPEN_LINE) {
        redirect(defender, attacker, defenseMove, attackMove);
        return;
      }
      // Light slip: angle off, bleed their posture.
      defender.posture = clamp(defender.posture + 8, 0, defender.postureMax);
      attacker.posture = clamp(attacker.posture - 9, 0, attacker.postureMax);
      addFlow(defender, 8, "slip");
      game.range = clamp(game.range + 0.05, 0.08, 0.96);
      game.callout = `${pretty(defender)} turns ${attackMove.name} aside`;
      effect("slip", { actor: defender.id, against: attackMove });
      log("defense", { defender: defender.id, move: defenseMove.name, denied: attackMove.name, kind: "slip" });
      return;
    }

    // Shell defense.
    const justGuard = (defender.phaseTime - defenseMove.startup) <= BURST_WINDOW;
    defender.posture = clamp(defender.posture + 8, 0, defender.postureMax);
    attacker.posture = clamp(attacker.posture - 9, 0, attacker.postureMax);
    game.shake = Math.min(8, game.shake + 3);

    if (justGuard && attackMove.family === "strike") {
      // Krav Maga burst: the block and the counter are the same beat.
      const burstDamage = Math.max(2, Math.round(4 * defender.char.stats.power));
      attacker.hp = clamp(attacker.hp - burstDamage, 0, 100);
      attacker.posture = clamp(attacker.posture - 10, 0, attacker.postureMax);
      attacker.hitPulse = 180;
      addFlow(defender, 14, "burst");
      game.callout = `${pretty(defender)} bursts through ${attackMove.name}`;
      effect("burst", { actor: defender.id, target: attacker.id, damage: burstDamage });
      log("defense", { defender: defender.id, move: defenseMove.name, denied: attackMove.name, kind: "burst", damage: burstDamage });
      if (attacker.hp <= 0) koFinish(defender, attacker, defenseMove);
      return;
    }

    addFlow(defender, 8, "guard");
    game.callout = `${pretty(defender)} walls off ${attackMove.name}`;
    effect("shellBlock", { actor: defender.id, against: attackMove });
    log("defense", { defender: defender.id, move: defenseMove.name, denied: attackMove.name, kind: "shell" });

    // Keysi: a close shell answers with a free frame elbow.
    if (game.range < ELBOW_RANGE && !defender.queue.some(q => q.free)) {
      defender.queue.unshift({
        ...FRAME_ELBOW,
        id: `elbow-${Math.random().toString(36).slice(2, 7)}`,
        age: 0, tempo: defender.tempo, resolved: false
      });
      effect("frameElbow", { actor: defender.id });
    }
  }

  function redirect(defender, attacker, defenseMove, attackMove) {
    const reversal = attackMove.family === "art";
    if (reversal) spendFlow(attacker); // a reversed art is spent, not refunded
    const baseDamage = defenseMove.redirectDamage || 4;
    const damage = Math.round(baseDamage * (reversal ? 1.6 : 1) * defender.char.stats.power);
    const posture = Math.round((reversal ? 30 : 22) * defender.char.stats.power);

    attacker.hp = clamp(attacker.hp - damage, 0, 100);
    attacker.posture = clamp(attacker.posture - posture, 0, attacker.postureMax);
    attacker.hitPulse = 240;
    defender.posture = clamp(defender.posture + 6, 0, defender.postureMax);
    knockdown(attacker, reversal ? 1000 : 750);
    defender.punishTime = 0;
    addFlow(defender, 16, "redirect");

    game.range = clamp(game.range + 0.12, 0.08, 0.96);
    game.shake = Math.min(12, game.shake + 6);
    game.slowMo = reversal ? 600 : 360;
    game.slowMoScale = reversal ? 0.35 : 0.5;
    game.callout = reversal
      ? `${pretty(defender)} reverses the art itself`
      : `${pretty(defender)} feeds ${attackMove.name} to the floor`;
    effect("redirect", { actor: defender.id, target: attacker.id, damage, reversal });
    log("redirect", { defender: defender.id, denied: attackMove.name, damage, reversal });

    if (attacker.posture <= 0 && attacker.hp > 0) attacker.posture = 1; // knockdown already paid the cost
    if (attacker.hp <= 0) koFinish(defender, attacker, defenseMove);
  }

  function applyReady(actor, move) {
    actor.posture = clamp(actor.posture + Math.abs(move.posture || 5), 0, actor.postureMax);
    game.callout = `${pretty(actor)} sets ${move.name}`;
    log("ready", { actor: actor.id, move: move.name, range: game.rangeName });
  }

  function clash() {
    actors.player.posture = clamp(actors.player.posture - 7, 0, actors.player.postureMax);
    actors.enemy.posture = clamp(actors.enemy.posture - 7, 0, actors.enemy.postureMax);
    game.shake = Math.min(10, game.shake + 5);
    game.callout = `${actors.player.current.name} and ${actors.enemy.current.name} clash`;
    effect("clash", {});
    log("clash", { playerMove: actors.player.current.name, enemyMove: actors.enemy.current.name });
  }

  function knockdown(actor, ms) {
    actor.downTime = Math.max(actor.downTime, ms);
    actor.staggerTime = 0;
    actor.queue = [];
    actor.current = null;
    actor.phaseTime = 0;
    actor.lastFamily = null;
    effect("knockdown", { actor: actor.id });
  }

  function postureBreak(actor) {
    if (actor.staggerTime > 0) return; // one break per stagger; no stunlock loops
    actor.staggerTime = STAGGER_MS;
    actor.queue = [];
    actor.current = null;
    actor.phaseTime = 0;
    game.callout = `${pretty(actor)}'s structure shatters`;
    game.slowMo = 300; game.slowMoScale = 0.55;
    effect("postureBreak", { actor: actor.id });
    log("postureBreak", { actor: actor.id });
  }

  function koFinish(winner, loser, move) {
    loser.koed = true;
    loser.downTime = 2400;
    game.slowMo = 900; game.slowMoScale = 0.3;
    effect("ko", { winner: winner.id, loser: loser.id, move: move.name });
    resetRound(`${pretty(winner)} ends it with ${move.name}`);
  }

  // ---- spacing & recovery ----------------------------------------------------

  function updateRange(dt) {
    const centerPull = (0.5 - game.range) * 0.00012 * dt;
    let drift = centerPull;
    for (const actor of Object.values(actors)) {
      const calm = !actor.current && actor.queue.length === 0 && actor.downTime <= 0 && actor.staggerTime <= 0;
      if (calm && game.mode === "fight" && !game.roundLocked) {
        drift += (actor.char.stats.wantRange - game.range) * 0.00018 * dt;
      }
    }
    game.range = clamp(game.range + drift, 0.08, 0.96);

    if (game.range < 0.22) game.rangeName = "clinch range";
    else if (game.range < 0.42) game.rangeName = "pocket range";
    else if (game.range < 0.66) game.rangeName = "entry range";
    else game.rangeName = "reset range";

    if (game.rangeName !== game.lastRangeName) {
      game.lastRangeName = game.rangeName;
      log("range", { range: game.rangeName, value: round2(game.range) });
    }
  }

  function regenerate(dt) {
    for (const actor of Object.values(actors)) {
      const calm = actor.queue.length === 0 && !actor.current && actor.downTime <= 0;
      actor.posture = clamp(actor.posture + (calm ? 0.015 : 0.006) * dt, 0, actor.postureMax);
      actor.tempo *= Math.pow(0.996, dt / 16);
      if (!actor.flowState && actor.flow > 0) actor.flow = Math.max(0, actor.flow - 0.0008 * dt);
    }
  }

  // ---- round / match flow ----------------------------------------------------

  function startMatch() {
    game.playerRounds = 0;
    game.enemyRounds = 0;
    game.round = 0;
    log("match", { state: "start", player: actors.player.char.id, enemy: actors.enemy.char.id });
    prepareNextRound();
  }

  function prepareNextRound() {
    game.round += 1;
    for (const actor of Object.values(actors)) {
      actor.hp = 100;
      actor.posture = actor.postureMax;
      actor.queue = [];
      actor.current = null;
      actor.phaseTime = 0;
      actor.state = "ready";
      actor.tempo = 0;
      actor.inputTimes = [];
      actor.hitPulse = 0;
      actor.downTime = 0;
      actor.staggerTime = 0;
      actor.punishTime = 0;
      actor.lastFamily = null;
      actor.koed = false;
      // Flow persists between rounds at half value: momentum carries, dominance doesn't.
      actor.flowState = false;
      actor.flow = Math.min(50, actor.flow * 0.5);
    }
    game.range = 0.52;
    game.rangeName = "entry range";
    game.lastRangeName = "entry range";
    game.mode = "intro";
    game.roundLocked = true;
    game.started = false;
    game.modeClock = 1300;
    game.callout = `Round ${game.round}`;
    setBanner(`Round ${game.round}`, `${actors.player.char.name} vs ${actors.enemy.char.name}`, false, "best of three");
    effect("roundIntro", { round: game.round });
    log("roundIntro", { round: game.round });
  }

  function beginFight() {
    game.mode = "fight";
    game.roundLocked = false;
    game.started = true;
    game.roundClock = game.roundTime;
    game.aiClock = 700;
    game.lastPlayerIntent = performance.now();
    game.callout = "Fight";
    setBanner("Fight", "Flow is the weapon", false, `round ${game.round}`);
    game.bannerClock = 650;
    effect("fightStart", { round: game.round });
    log("fight", { round: game.round });
  }

  function resetRound(message) {
    if (game.roundLocked) return;
    game.roundLocked = true;
    game.callout = message;
    log("round", { message });
    const playerWon = actors.enemy.hp <= 0 && actors.player.hp > 0;
    const enemyWon = actors.player.hp <= 0 && actors.enemy.hp > 0;
    awardRound(playerWon ? "player" : enemyWon ? "enemy" : decideRoundByVitals(), message);
  }

  function decideRoundByVitals() {
    const score = a => a.hp + (a.posture / a.postureMax) * 35 + a.flow * 0.05;
    const p = score(actors.player);
    const e = score(actors.enemy);
    if (Math.abs(p - e) < 4) return "draw";
    return p > e ? "player" : "enemy";
  }

  function awardRound(winner, reason) {
    if (game.mode === "roundOver" || game.mode === "matchOver") return;
    game.mode = "roundOver";
    game.roundLocked = true;
    game.started = false;
    game.modeClock = 1900;
    if (winner === "player") game.playerRounds += 1;
    else if (winner === "enemy") game.enemyRounds += 1;

    const title = winner === "draw" ? "Draw" : "KO";
    const sub = winner === "draw"
      ? "No clean control"
      : `${actors[winner].char.name} takes round ${game.round}`;
    setBanner(title, sub, false, reason);
    game.callout = sub;
    effect("roundResult", { winner, round: game.round });
    log("roundResult", { round: game.round, winner, playerRounds: game.playerRounds, enemyRounds: game.enemyRounds, reason });
  }

  function finishMatch() {
    game.mode = "matchOver";
    game.roundLocked = true;
    game.started = false;
    const winner = game.playerRounds === game.enemyRounds
      ? "draw"
      : game.playerRounds > game.enemyRounds ? "player" : "enemy";
    const title = winner === "draw" ? "No Contest" : `${actors[winner].char.name} Wins`;
    const sub = winner === "draw" ? "The crucible goes unresolved" : `${game.playerRounds} - ${game.enemyRounds}`;
    setBanner(title, sub, true, "match complete");
    game.callout = title;
    effect("matchOver", { winner });
    log("match", { state: "complete", winner, playerRounds: game.playerRounds, enemyRounds: game.enemyRounds });
  }

  function setBanner(title, sub, button, eyebrow = "") {
    game.banner = { title, sub, button, eyebrow, visible: true };
  }

  function repairState() {
    for (const actor of Object.values(actors)) {
      if (!Number.isFinite(actor.hp)) actor.hp = 100;
      if (!Number.isFinite(actor.posture)) actor.posture = actor.postureMax;
      if (!Number.isFinite(actor.tempo)) actor.tempo = 0;
      if (!Number.isFinite(actor.flow)) actor.flow = 0;
    }
    if (!Number.isFinite(game.range)) {
      game.range = 0.52;
      log("repair", { reason: "range became non-finite" });
    }
  }

  return { actors, game, intent, enqueueRaw: enqueue, update, startMatch };
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
