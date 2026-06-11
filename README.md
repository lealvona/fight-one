# Ironflow

An original 3D browser fighting game. Evolution of the Cadence Fighter POC: same
intent-queue heart, now with a six-fighter roster, full 3D characters and stage,
and a combat doctrine built on real close-quarters systems.

**Flow is the weapon.** It's not about punches and kicks - it's about what each
exchange feeds into the next.

## Run

Requires Node.js. No install step - Three.js is vendored in `vendor/`.

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173/
```

Useful URLs:

- `/?autostart=1&p=daichi&e=lobo&t=30` - skip select, pick fighters, 30s rounds.
- `/gallery.html` - roster lineup viewer (dev tool).

## Combat Doctrine

Four real systems are baked into the rules, not just the flavor text:

| System | In-game mechanic |
| --- | --- |
| **Krav Maga** - defense and offense in the same beat | **Krav Burst**: a just-timed Shell against a strike blocks *and* counters simultaneously. Whiffed attacks open **punish windows**. |
| **Keysi** (the Dark Knight's close-cover method) | **Shell** squares to the threat; any close-range Shell success answers automatically with a free **Frame Elbow**. |
| **Aikido** - redirect committed force, never trade with it | **Redirect**: a live Slip against any committed attack (commitment 2+) throws the attacker to the floor. Redirecting a Signature Art is a full **Reversal**. |
| **BJJ, fewer holds** - take them down, let them up | **Takedown**: a Clinch win inside clinch range becomes a slam for x1.6 damage. No ground game - downed fighters roll clear and the exchange resets. |

### The beats graph

Every matchup has exactly one reading (no mutual-beat ambiguity):

- **Strike** stuffs Clinch (sprawl and brawl)
- **Shell** absorbs Strike
- **Break** opens Shell, catches Redirect (lows and shoves find angles)
- **Clinch** swallows Break, grabs Shell (throws beat block)
- **Redirect** turns Strike, escapes Clinch and Art
- **Art** crushes everything *except* a live Redirect

Ties fall through to height (low beats high), then priority + tempo.

### Flow

The violet bar. Chaining *different* families builds it; repeating yourself
drains it (stagnation). Wins, redirects, bursts and takedowns feed it. At 100
you enter **Flow State**: +12% speed, +15% damage, and your **Signature Art**
(`G`) unlocks - a cinematic crusher that loses only to a perfectly-timed
Redirect. Half your flow carries between rounds; dominance doesn't.

### Spacing

Range is automated (footwork follows intent), but it is real: every attack has
an effective band and a step. Lunging moves close distance when they go active;
attacks thrown outside their band **whiff** and hand your rival a punish
window. Idle fighters drift toward their preferred range - a grappler walks you
down, a counter-fighter floats out.

## Roster

Six original fighters. Each salutes an iconic fighting-game archetype - the
designs, names, costumes and movesets are our own.

| Fighter | Epithet | Style | Salutes |
| --- | --- | --- | --- |
| **Daichi Mori** | The Wandering Tide | Pilgrim karate through Krav directness | the world-wandering karateka |
| **Suyin Lan** | Eight Gales | Sport savate on a gale-force cadence | the lightning-leg interpol legend |
| **Renzo Kuroda** | The Black Crane | Krav-forged karate, zero ceremony | the ruthless zaibatsu heir |
| **Lobo Plateado** | The Silver Wolf | Lucha over no-gi grappling - catch, slam, release | the masked golden-heart grappler |
| **Akane Roku** | The Falling Petal | Aiki-ninjutsu, pure redirection | the demon-hunting shrine ninja |
| **Bastion Vale** | The Iron Vigil | Keysi covering frame in riot plate | the armored nightmare knight (and a certain caped night shift) |

Each fighter has their own stats (speed / power / structure / weight / preferred
range), renamed and retuned moves, a Signature Art, and an AI persona (rush,
pressure, grappler, counter, fortress, balanced) that reads your visible intent
queue - never your inputs.

## Controls

| Key | Intent | Family |
| --- | --- | --- |
| `J` | Jab | Strike |
| `K` | Cross | Strike |
| `U` | Low kick | Break |
| `I` | High kick | Strike |
| `A` | Shell | Guard |
| `S` | Slip / Redirect | Evade |
| `D` | Clinch / Takedown | Clinch |
| `F` | Shove | Break |
| `G` | Signature Art (needs full Flow) | Art |

On-screen deck is tappable. `Esc` returns to character select. Select screen:
`1-6` to pick, `R` rolls a rival, `Enter` confirms. High input tempo lets a new
intent overwrite a queued one (preempt) - at a posture cost.

## Match Rules

- Best of three rounds, 60 seconds each.
- KO ends a round; on time-out the round goes to health + structure + flow.
- Posture (gold) is structure: break it and you stagger, wide open at x1.45.

## Files

- `index.html` - shell, HUD, character select markup and styles.
- `src/data.js` - doctrine matrix, base moves, the roster.
- `src/combat.js` - the engine: queues, resolution, flow, redirect/burst/takedown, rounds.
- `src/ai.js` - persona-driven rival brain (reads the public queue only).
- `src/rig.js` - procedural 3D fighters: skeleton, per-character costumes, pose animation.
- `src/stage.js` - the Crucible arena, fight camera, impact FX, floaters.
- `src/audio.js` - fully synthesized hit/whoosh/KO audio (no asset files).
- `src/hud.js` - DOM HUD and select screen.
- `src/main.js` - bootstrap, input, effect dispatch, telemetry.
- `vendor/three.module.min.js` - Three.js r160 (MIT, license alongside).
- `assets/training-room-stage.png` - original arena plate, now the select-screen
  backdrop and the 3D stage's matte painting.
- `gallery.html` - roster viewer for costume/rig work.
- `server.js` - tiny local server and telemetry endpoint.

Telemetry is written to `game.log` when running through the local server
(`[ironflow]` events also mirror to the console and the in-game live test log).
