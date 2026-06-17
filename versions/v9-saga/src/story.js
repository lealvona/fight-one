// Arcade / Story mode: a per-fighter ladder with an opening title card, rival
// taunts between bouts, and an ending - drawn from each fighter's motivation.

import { ROSTER, charById } from "./data.js";

const STORY = {
  daichi: { title: "The Tide Returns", intro: "Eleven years on the road. Every village a lesson, every lesson a scar. The Crucible is the last door Daichi has not walked through.", ending: "He bows to the empty hall and shoulders his pack. The road taught him when not to fight. Tonight it let him remember why he can." },
  suyin: { title: "Eight Gales, One Warrant", intro: "Three syndicates folded before breakfast. The Crucible holds the fourth's enforcers. Suyin files the paperwork after.", ending: "She signs the last report in triplicate, kicks the door shut behind her, and is gone before the dust settles." },
  renzo: { title: "From Nothing", intro: "His father's board wanted him gone. Renzo intends to make them watch what he builds with empty hands.", ending: "No company. No name but his own. The Black Crane stands over the last of them and finally feels light." },
  lobo: { title: "For the House", intro: "Every purse becomes a roof, a meal, a bed for a child with nowhere else. The Silver Wolf does not lose cheaply.", ending: "The mask never comes off. The orphanage eats well this winter. Somewhere, a kid practices a lariat against the night." },
  akane: { title: "What Falls", intro: "The shrine that does not exist sends its sixth caretaker. She has never thrown the first strike. She will not start now.", ending: "Every attack returned to its sender. Akane rakes the gravel smooth and lets the silence keep its secret." },
  bastion: { title: "The List", intro: "A welded suit of salvage and a list of neighborhoods that forgot how to sleep. Bastion is here to make the list shorter.", ending: "One more name crossed out. The Iron Vigil walks back into the dark, already reading the next line." },
  decha: { title: "The Promoters' Champions", intro: "They sold his title behind his back. So Decha collects what they value most: the champions they paid for.", ending: "The War Elephant leaves the belt on the canvas. He never wanted gold - only the debt, paid in full." },
  marisol: { title: "The Roda Has No Walls", intro: "She learned the ginga before letters. No one has touched her twice. The Crucible would like to be the first.", ending: "The Moon Ginga dances out the way she danced in - untouched, smiling, already humming the next berimbau line." },
  custom: { title: "A Fighter of Your Own", intro: "Forged by your own hand, answerable to no roster. The Crucible does not care who made you - only whether you last.", ending: "Your fighter stands alone in the hall, unbeaten. Whatever you built, it was enough." }
};

const TAUNTS = [
  c => `${c.name} steps in. "${c.epithet}. Show me it's earned."`,
  c => `${c.name} rolls their shoulders. "${c.style}. Let's see yours."`,
  c => `Across the mat: ${c.name}, ${c.epithet}. No words. Just the bow.`,
  c => `${c.name} cracks their knuckles. "You've come far. It ends here."`
];

export function buildArcade(playerId) {
  const others = ROSTER.filter(c => c.id !== playerId).map(c => c.id);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const boss = others.find(id => ["renzo", "lobo", "bastion"].includes(id));
  if (boss) { others.splice(others.indexOf(boss), 1); others.push(boss); }
  const story = STORY[playerId] || STORY.custom;
  return {
    kind: "arcade",
    queue: others, index: 0, total: others.length, charId: playerId,
    title: story.title, intro: story.intro, ending: story.ending,
    taunt(i) { return TAUNTS[i % TAUNTS.length](charById(this.queue[i])); }
  };
}
