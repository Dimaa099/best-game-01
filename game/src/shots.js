// Screenshot scenes behind ?shot=start|play|boss|victory. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (chase the nearest shard, keep distance from
// enemies, aim at the nearest foe and fire), so every frame is what a short
// game really looks like and the same seed always gives the same frame.
import { STEP, WIN_WAVE } from './config.js';
import { EVENT_WIN, EVENT_LOSE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = STEP;

// A minimal input object the world can step with: the autopilot fills it in.
function autopilotInput(state, aggressive) {
  const player = state.player;
  const input = {
    mouse: { x: player.x, y: player.y - 100, down: true },
    moveX: () => input._mx,
    moveY: () => input._my,
    firing: () => true,
    dashing: () => input._dash,
    takeAction: () => false,
    _mx: 0,
    _my: 0,
    _dash: false,
  };
  // Nearest enemy to aim at, nearest shard to chase.
  let enemy = null;
  let enemyDist = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < enemyDist) { enemyDist = d; enemy = e; }
  }
  let shard = null;
  let shardDist = Infinity;
  for (const p of state.pickups) {
    if (p.kind !== 'shard') continue;
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d < shardDist) { shardDist = d; shard = p; }
  }
  if (enemy) {
    input.mouse.x = enemy.x;
    input.mouse.y = enemy.y;
  }
  // Move toward the shard, or toward the enemy at a safe range; back away
  // from anything that gets too close.
  let tx = player.x;
  let ty = player.y;
  if (enemy && enemyDist < 110) {
    tx = player.x + (player.x - enemy.x);
    ty = player.y + (player.y - enemy.y);
    input._dash = player.dashCooldown <= 0;
  } else if (shard && shardDist < 320) {
    tx = shard.x;
    ty = shard.y;
  } else if (enemy) {
    tx = enemy.x;
    ty = enemy.y;
    if (enemyDist > 320) { tx = player.x + (enemy.x - player.x) * 0.5; ty = player.y + (enemy.y - player.y) * 0.5; }
  }
  const dx = tx - player.x;
  const dy = ty - player.y;
  const len = Math.hypot(dx, dy) || 1;
  input._mx = Math.abs(dx) > 12 ? dx / len : 0;
  input._my = Math.abs(dy) > 12 ? dy / len : 0;
  if (aggressive && state.enemies.length >= 4 && player.shards >= 10) {
    input.takeAction = (name) => name === 'bomb';
  }
  return input;
}

// A passive input for the title scene: the skiff drifts gently and never
// fires, so the title sits over a calm sky with the first wave arriving.
function passiveInput(state) {
  return {
    mouse: { x: state.player.x, y: state.player.y - 100, down: false },
    moveX: () => 0,
    moveY: () => 0,
    firing: () => false,
    dashing: () => false,
    takeAction: () => false,
  };
}

function runSim(world, seconds, aggressive = false) {
  let event = 0;
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    event = world.step(SAMPLE, autopilotInput(world.state, aggressive));
    if (event & (EVENT_WIN | EVENT_LOSE)) break;
  }
  return event;
}

function runPassive(world, seconds) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    world.step(SAMPLE, passiveInput(world.state));
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title over a live sky with the first wave arriving.
 * play: mid-wave-2 action with score, combo and shards on the board.
 * boss: the final wave, Gloommaw on screen with its health bar.
 * victory: the boss beaten, the victory screen with earned stats.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'boss' && name !== 'victory') {
    runPassive(world, 5);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    // The spawner feeds foes in one at a time and the autopilot kills them
    // fast, so a timed capture lands on an empty sky. Seed a busy mid-fight
    // instead: play 6 s, then bring in a fresh pack through the game's own
    // spawner and let the fight develop for a moment.
    runSim(world, 6);
    world.spawnEdge('mote');
    world.spawnEdge('mote');
    world.spawnEdge('mote');
    world.spawnEdge('spitter');
    runSim(world, 1.5);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY };
  }
  if (name === 'boss') {
    // Jump straight to the final wave, then let the fight develop.
    world.state.wavePauseTimer = 0;
    world.state.wave = WIN_WAVE - 1;
    world.state.waveActive = false;
    runSim(world, 1);
    runSim(world, 9, true);
    return { screen: SCREEN_PLAY };
  }
  // Victory: fight the final wave for real first so the victory screen
  // shows earned stats, then wear the boss down and let the autopilot
  // finish the fight. If the skiff falls during the warm-up, restart the
  // scene and go straight for the weakened boss.
  world.state.wavePauseTimer = 0;
  world.state.wave = WIN_WAVE - 1;
  world.state.waveActive = false;
  runSim(world, 1);
  runSim(world, 10, true);
  if (world.state.over && !world.state.won) {
    world.reset();
    world.state.wavePauseTimer = 0;
    world.state.wave = WIN_WAVE - 1;
    world.state.waveActive = false;
    runSim(world, 1);
  }
  const boss = world.state.boss;
  if (boss) boss.hp = 12;
  world.state.player.spreadTimer = 12;
  world.state.player.shards = 12;
  runSim(world, 30, true);
  if (!world.state.won && world.state.boss) {
    // The fight is deterministic, but never leave the shot to chance: finish
    // the boss through the same kill path the game uses.
    world.killEnemy(world.state.boss);
  }
  return { screen: SCREEN_WIN };
}
