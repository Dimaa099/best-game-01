# Lumen Harvest — Starlight Salvage

A bright, original top-down arcade game for make.fun best-game-01.

Pilot the last sun-skiff across the morning sky. Harvest star shards, blast
void motes back into the dark, and survive all 5 waves — then break
Gloommaw, the void that eats light.

## How to play

- **WASD / Arrows** — fly
- **Mouse** — aim · **Click / Space** — fire
- **Shift** — dash (brief invulnerability)
- **E** — Sunburst bomb (costs 10 ◆ shards, clears the sky)
- **P** — pause · **R** — restart · **M** — mute

## The game

- 5 waves of growing challenge: chasing motes, orb-spitting spitters,
  heavy brutes, and the wave-5 boss Gloommaw with radial bursts and mote spawns.
- Score with a combo multiplier that grows on kill streaks; shards score
  and charge the Sunburst; pickups grant hull, triple-shot spread and shields.
- Win by breaking Gloommaw; lose when the hull hits zero. Best score is
  saved in localStorage.
- Sound is synthesised live with WebAudio — no audio files, no network.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

Screenshots are staged deterministically: `?shot=start|play|boss|victory&seed=1`.
