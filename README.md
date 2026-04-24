# Cadence Fighter POC

An original browser fighting-game prototype focused on automated spacing, cadence-driven intent queues, and round-based match flow.

## Run

Requires Node.js.

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173/
```

## Controls

- `J` left hand
- `K` right hand
- `U` left leg
- `I` right leg
- `A` guard
- `S` slip
- `D` clinch
- `F` shove

The on-screen buttons are clickable/tappable.

## Match Rules

- Best of three rounds.
- Win two rounds to take the match.
- Each round starts with `Round N`, then `Fight`.
- KO ends a round.
- If time expires, the winner is decided by health plus posture.

## Files

- `index.html` - Canvas game, combat logic, HUD, match flow.
- `server.js` - Tiny local server and telemetry endpoint.
- `assets/training-room-stage.png` - Original generated arena background.

Telemetry is written to `game.log` when running through the local server.
