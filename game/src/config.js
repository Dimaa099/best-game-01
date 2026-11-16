// Lumen Harvest — Starlight Salvage: shared constants, palette and wave table.
// The arena is a bright open sky; the player is a little sun-skiff harvesting
// star shards while void motes try to snuff its light out.
export const ARENA = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-harvest-best';
export const SHARD_BOMB_COST = 10;
export const WIN_WAVE = 5;

// Bright, sunlit palette: pale sky, warm golds for the player, deep violet for
// the void enemies so they read instantly against the sky at a glance.
export const PALETTE = {
  skyTop: '#8fd4ff',
  skyMid: '#c9ecff',
  skyBottom: '#fff3c4',
  sun: '#ffd23e',
  sunCore: '#fff7ae',
  player: '#ff9f1c',
  playerGlow: '#ffd23e',
  bullet: '#ffcf3f',
  shard: '#7ef0ff',
  shardGlow: '#b8f7ff',
  heart: '#ff5d8f',
  mote: '#5b2a86',
  moteEye: '#e8b4ff',
  spitter: '#7a1fa2',
  brute: '#3d1a5c',
  boss: '#2a0a4a',
  orb: '#c77dff',
  cloud: 'rgba(255,255,255,0.85)',
  grass: '#7ec850',
  hudPanel: 'rgba(20,32,64,0.82)',
  hudText: '#ffffff',
  banner: '#ff9f1c',
};

export const PLAYER = {
  radius: 18,
  speed: 300,
  dashSpeed: 640,
  dashTime: 0.16,
  dashCooldown: 1.1,
  fireInterval: 0.16,
  bulletSpeed: 620,
  bulletDamage: 1,
  maxHull: 5,
  invulnTime: 1.0,
  pickupRadius: 34,
};

// Enemy kinds: mote chases, spitter keeps its distance and fires orbs,
// brute is slow and heavy, boss is the wave-5 Gloommaw.
export const ENEMIES = {
  mote: { radius: 16, hp: 2, speed: 120, score: 100, damage: 1, color: PALETTE.mote },
  spitter: { radius: 18, hp: 3, speed: 85, score: 150, damage: 1, color: PALETTE.spitter },
  brute: { radius: 28, hp: 8, speed: 55, score: 300, damage: 2, color: PALETTE.brute },
  boss: { radius: 64, hp: 60, speed: 42, score: 2000, damage: 2, color: PALETTE.boss },
};

// Each wave: how many of each kind arrive, and how fast the spawner feeds them in.
export const WAVES = [
  { motes: 6, spitters: 0, brutes: 0, interval: 1.4 },
  { motes: 10, spitters: 3, brutes: 0, interval: 1.2 },
  { motes: 12, spitters: 5, brutes: 2, interval: 1.0 },
  { motes: 14, spitters: 7, brutes: 4, interval: 0.85 },
  { motes: 8, spitters: 4, brutes: 2, interval: 1.0, boss: true },
];

export const PICKUP = {
  shard: { radius: 10, score: 25 },
  heart: { radius: 12 },
  spread: { radius: 13, duration: 12 },
  shield: { radius: 13, duration: 6 },
};
