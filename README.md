# Solmar Heist

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/jekojek/solmar-heist/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/jekojek/solmar-heist/reward.svg)](https://make.fun/bounty/gta6-01)

**One-line pitch:** Raka owes fixer Mira Solano $50,000 — steal cars, outrun the Solmar Bay police, and finish three hot jobs across a sun-soaked open city to clear the debt.

An original open-world crime game for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01): explore Solmar Bay on foot and by car, steal cars, dodge traffic and pedestrians, earn wanted stars and escape police cruisers, fight with fists and a pistol, and play three story missions with a live minimap, HUD, save/load, synthesized sound and music. Everything — city, characters, vehicles, story, art and audio — is original; nothing is taken from any commercial game.

## How to run

Serve `game/` with any static file server and open `index.html` in desktop Chrome, for example:

```sh
cd game && python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no network: every script, the vendored three.js build and all textures are files under `game/` (textures are generated in code).

## Controls

| Key | Action |
| --- | ------ |
| WASD / arrows | Move on foot, drive |
| Mouse (click to lock) | Orbit camera |
| E | Enter / exit nearest car (stealing a parked car raises your wanted level) |
| F | Punch on foot, shoot when the pistol is drawn |
| Q | Draw / holster pistol |
| Space | Handbrake |
| N | Take the next job from Mira |
| P / Esc | Pause (save, restart job, quit to title) |
| M | Mute |

## The story

Raka, a courier-turned-wheelman, owes Mira Solano fifty thousand dollars. Three jobs stand between him and freedom: a pickup at the docks, a borrowed yellow Marlin GT, and one last hot delivery to the north marina with the police already on the route. Finish all three and the debt is gone.

## Structure

- `game/index.html` — page, HUD, menus
- `game/src/main.js` — boot, game loop, screens, shot staging
- `game/src/city.js` — procedural Solmar Bay (streets, towers, beach, docks, marina)
- `game/src/vehicles.js` — car factory, driving physics, traffic AI
- `game/src/player.js` — Raka on foot
- `game/src/pedestrians.js` — crowds that stroll, flee and scatter
- `game/src/police.js` — wanted stars, police chasers and busts
- `game/src/missions.js` — the three jobs, beacons and timers
- `game/src/combat.js` — punch and pistol
- `game/src/hud.js` — health/cash/stars/speed and the live minimap
- `game/src/audio.js` — synthesized WebAudio SFX and music loop
- `game/src/camera.js` — third-person chase camera
- `game/src/input.js` — keyboard + mouse
- `game/src/save.js` — localStorage save/load
- `game/src/config.js` — tuning and story data
- `game/vendor/three.min.js` — vendored three.js (MIT)
- `main.ts` — hands `game/` + `screenshots/` to `/output` with a dossier
