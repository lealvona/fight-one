# Fight One - The Fight Lab

An original browser fighting game, evolved in public. Every major version stays
playable from the archive hub. **Flow is the weapon.**

## Run

Requires Node.js. No install step - Three.js is vendored in `vendor/`.

```bash
npm start
```

Then open **http://127.0.0.1:4173/** - that's the archive hub with every version,
screenshots, and play links.

| Version | Play at | What it is |
| --- | --- | --- |
| **v4 - Ironflow Impact** (latest) | `/versions/v4-impact/` | Paired two-body move choreography, over-shoulder camera, humanoid rigs v2, create-a-fighter |
| **v3 - Ironflow Apex** | `/versions/v3-apex/` | Real-discipline movesets with cinema supers, 8 fighters, 3 stages, 4 modes |
| **v2 - Ironflow** | `/versions/v2-ironflow/` | The 3D leap: 6 fighters, flow meter, signature arts |
| **v1 - Cadence Fighter** | `/versions/v1-cadence/` | The original 2D intent-queue proof of concept |

Handy URLs (3D versions): `?autostart=1&p=decha&e=marisol&stage=shrine&mode=spectate&t=30`
skips the select screen (`p`/`e` fighter ids, `stage` crucible/helipad/shrine,
`mode` vsai/pvp/spectate/gauntlet, `t` round seconds). Each 3D version also has a
`gallery.html` roster viewer.

The whole thing is static files + one tiny server (telemetry only), so it can be
hosted anywhere static - e.g. enable GitHub Pages on this repo (Settings → Pages →
deploy from branch, root) and the hub works as-is; telemetry simply no-ops.

## v4 - Ironflow Impact

**The moves are performed, not implied.** When a big move connects, combat
holds its breath and both bodies play it out in contact - a paired timeline
with an executor track and a recipient track:

- **Body slam** (clinch takedown): walk-in, double underhooks, full lift, slam.
- **Redirect throw**: catch the committed attack, pivot, feed them past you to the floor.
- **Launchers** (flow-state supers): the hit carries them off their feet in an arc.
- **Krav burst, signature arts, clean KO collapses** - all choreographed two-body.

**Cadence retention** - the special rule: when you're slammed, queued intents
that make no sense on the floor are lost. But a queued **clinch survives as a
kept grip**: if the attacker stands over you, you scissor their legs and
reverse from the floor (they go down, you get up). A slip queued at slam time
is simply gone - you can't slip the ground.

**Camera**: the classic horizontal third-person view stays the default (and is
locked in for two-player). In solo modes, press **C** (or the HUD chip) to
toggle the **over-the-shoulder chase camera** - the SF4-3DS special - smoothly
blended, remembered between sessions.

**Humanoid rigs v2**: faces (eyes, brows, nose, mouth, per-character
expression), articulated hands with thumbs, heel-toe feet, tapered limbs with
joint balls, trapezius/deltoid/calf masses, real proportions. Still 100%
procedural - no model files, no exploded poly counts.

**The Forge** (create-a-fighter): name, epithet, body sliders, six skin tones,
hair, five outfit families with full color control, extras (headband, scarf,
wraps, armbands...), a 13-point stat budget, and a discipline template that
carries a real moveset, supers, signature and AI persona. Live 3D preview;
saved to localStorage; your fighter appears on the select grid and works in
every mode including the gauntlet.

**Pacing**: globally slower and heavier (PACE 1.32) with hit-stop on contact -
deliberate exchanges that land and follow through, not percussive flicking.

## v3 - Ironflow Apex

### Real techniques, mythic supers

Every standard move is a real technique from the fighter's actual discipline.
Build the violet bar to 100 and you enter **Flow State**: for a burning window,
every technique becomes its martial-arts-cinema version - the same move the way
a wuxia wire team would shoot it. Supers hit harder, start faster, and some
launch (knockdown on hit) - but they overextend: a live **Redirect still answers
them**. The G-key **Signature Art** remains the apex finisher and consumes the
whole bar.

| Fighter | Discipline | Standard (real) | Flow State super |
| --- | --- | --- | --- |
| Daichi Mori | Kyokushin / Krav Maga | Gyaku-zuki, Tai Sabaki | Tidebreaker Gyaku-zuki, Crescent Moon Severance |
| Suyin Lan | Savate | Fouetté Figure, Chassé Frontal | Hundred-Gale Fouetté, Gale Wall Chassé |
| Renzo Kuroda | Krav Maga / karate | Uraken, 360 Defense | Black Maelstrom Hook, Boardroom Eviction |
| Lobo Plateado | Lucha / no-gi | Lariat, Double Underhooks | Tornado Lariat, Lunar Dropkick |
| Akane Roku | Aikido / ninjutsu | Irimi-Tenkan, Kote-gaeshi | Petalfall Irimi, Heavenfall Ashi-barai |
| Bastion Vale | Keysi | Pensador Wall, Oblique Stomp | Meteor Headbutt, Pensador Fortress |
| Decha Klahan | Muay Thai | Teep, Sok Tad, Plum Clinch | **Erawan God Teep** (launches across the arena) |
| Marisol Veiga | Capoeira | Rasteira, Meia-Lua de Compasso | Compasso Undertow, Meia-Lua Eclipse |

### Modes

- **VS Rival** - you against the persona AI (it reads only your public intent queue).
- **VS Human** - local two-player. P1: `J K U I / A S D F / G`. P2: `1 2 3 4 / Z X C V / B`.
- **Spectate** - both corners AI-driven; watch the doctrine argue with itself.
- **Gauntlet** - one-round ladder against all seven rivals; difficulty ramps each bout.

### Stages

**The Crucible** (after-hours training hall), **Kuroda Helipad** (corporate
rooftop, blinking masts, skyline), **Vermilion Court** (gates, lanterns, falling
petals, a low moon).

### The doctrine (carried from v2, sharpened)

Four real systems are mechanics, not flavor: **Krav Maga** (burst counters,
punish windows), **Keysi** (covering shell, free frame elbows), **Aikido**
(redirect throws, art reversals), **BJJ-lite** (takedown slams, no held ground
game). The beats graph has no mutual pairs - every matchup reads one way -
plus: hit-stop on contact, super-flash on arts, combo **strings** (distinct
techniques in rhythm hit harder), launchers, posture breaks, and a post-match
stat sheet (exchanges, redirects, bursts, takedowns, best string).

## Controls (all 3D versions)

| Key | Intent | Family |
| --- | --- | --- |
| `J` `K` | lead hand / rear hand | Strike |
| `U` | low line kick/sweep | Break |
| `I` | high kick (Bastion: headbutt) | Strike |
| `A` | shell / cover | Guard |
| `S` | slip / redirect | Evade |
| `D` | clinch / takedown | Clinch |
| `F` | shove / push kick | Break |
| `G` | signature art (full flow) | Art |

Select screen: `1-8` pick, `R` rolls a rival, `Enter` confirms, `Esc` returns.
High input tempo lets a new intent overwrite a queued one (preempt) at a posture
cost. On-screen deck is tappable and always shows your fighter's real technique
names - and their super names while you're flowing.

## Repo map

- `index.html` - the archive hub (all versions, screenshots, play links).
- `versions/v1-cadence/` - frozen v1 (single-file 2D canvas game).
- `versions/v2-ironflow/` - frozen v2 (first 3D version).
- `versions/v3-apex/` - frozen v3 (real techniques + cinema supers).
- `versions/v4-impact/` - current: `src/{data,combat,ai,rig,stage,hud,audio,sequences,creator,main}.js`.
- `vendor/three.module.min.js` - Three.js r160 (MIT, license alongside), shared by all versions.
- `assets/training-room-stage.png` - original arena plate (v1 backdrop, select screens, Crucible matte).
- `assets/shots/` - archive screenshots used by the hub.
- `server.js` - tiny static server + `/log` telemetry endpoint (writes `game.log`).

Characters are original creations; each card names only the archetype it
salutes. Standard movesets use real, generic technique names from the named
disciplines; all "super" names are invented for this game.
