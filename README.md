# Gobble Dash: Turkey Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![Reward](https://make.fun/badge/turkey-run-game-01/onlybountyy-hub/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![Gobble Dash rank](https://make.fun/badge/turkey-run-game-01/onlybountyy-hub/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01)

An original endless-runner game for the **turkey-run-game-01** bounty: a turkey
flees the farm on Thanksgiving night, outrunning the farmer (and his dog) for
1500 m through the farmyard, the autumn woods and the farmhouse lane — past hot
ovens, spinning carving knives, fences and farm dogs — or it ends up on the
dinner table.

## How to play

- **Jump:** ↑ / W / click / tap. **Double jump (flap):** Space while airborne.
- **Duck:** ↓ / S (under low branches).
- **Pause:** P. **Mute:** M. **Restart:** R (or click the button / press Space).
- Collect **corn kernels** (+25 points each) — eating corn also pushes the
  farmer back a little. Grab a **feather shield** to survive one free hit, or
  a **cornucopia** for +250 points.
- You have **3 lives**. Every hit costs one life and lets the farmer close in;
  if he catches you — or your lives run out — it's **CAUGHT!** Reach 1500 m
  and it's **ESCAPED!** Speed rises with distance, and the best score is saved
  on your machine.

## How to run

No build step, no network. Serve `game/` with any static server and open it in
desktop Chrome:

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

or simply:

```sh
cd game && python3 -m http.server 8080
```

## Files

- `game/index.html` + `game/style.css` — page and canvas shell
- `game/src/config.js` — tuning constants, palette, stages, seeded RNG
- `game/src/audio.js` — WebAudio oscillator sound effects and music loop
- `game/src/input.js` — keyboard + pointer input
- `game/src/turkey.js` — the turkey: physics, poses, procedural drawing
- `game/src/farmer.js` — the chasing farmer and his dog
- `game/src/obstacles.js` — obstacles, corn and power-ups: spawn, draw, collide
- `game/src/world.js` — parallax farmyard / woods / farmhouse scenery
- `game/src/screens.js` — title screen, HUD, CAUGHT / ESCAPED end screens
- `game/src/main.js` — state machine, game loop, scoring, screenshot hooks
- `screenshots/` — 4 real renders of the game: title, gameplay, caught, escaped
- `main.ts` — the entry program: copies `game/` + `screenshots/` to the output
  directory and writes `dossier.json` with `vendor/makefun-game.ts`

All art is drawn procedurally on canvas and all sound is synthesised with
WebAudio oscillators — no external assets, no network requests. The
`screenshots/` images are real renders of this game in a browser; the gameplay
and end screens can be reproduced with `?shot=play|caught|escaped&seed=N`.

## License

MIT — see `LICENSE` (SPDX-License-Identifier: MIT).
