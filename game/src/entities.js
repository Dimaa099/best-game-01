// Entity factories and per-frame behaviour for everything that moves in the
// sky: the player skiff, sun bolts, void enemies, enemy orbs, pickups and
// particles. All positions live in arena coordinates (1280 x 720).
import { ARENA, ENEMIES, PLAYER, PICKUP } from './config.js';

let nextId = 1;
function id() {
  nextId += 1;
  return nextId;
}

export function createPlayer() {
  return {
    id: id(),
    x: ARENA.width / 2,
    y: ARENA.height / 2 + 120,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    hull: PLAYER.maxHull,
    maxHull: PLAYER.maxHull,
    shards: 0,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    invulnTimer: 0,
    spreadTimer: 0,
    shieldTimer: 0,
    trail: [],
  };
}

export function createEnemy(kind, x, y, wave) {
  const def = ENEMIES[kind];
  const hpBonus = kind === 'boss' ? 0 : Math.floor((wave - 1) * 0.5);
  return {
    id: id(),
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: def.radius,
    hp: def.hp + hpBonus,
    maxHp: def.hp + hpBonus,
    speed: def.speed * (1 + (wave - 1) * 0.06),
    score: def.score,
    damage: def.damage,
    fireTimer: 2 + Math.random() * 1.5,
    burstTimer: 3,
    spawnTimer: 4,
    wobble: Math.random() * Math.PI * 2,
    flash: 0,
  };
}

export function createBullet(x, y, angle, speed, damage, friendly) {
  return {
    id: id(),
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: friendly ? 6 : 9,
    damage,
    friendly,
    life: 1.6,
  };
}

export function createPickup(kind, x, y) {
  return {
    id: id(),
    kind,
    x,
    y,
    radius: PICKUP[kind].radius,
    bob: Math.random() * Math.PI * 2,
    life: 14,
    magnet: false,
  };
}

export function createParticle(x, y, color, count, speed) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      radius: 2 + Math.random() * 4,
      color,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
    });
  }
  return parts;
}

export function createCloud(random) {
  return {
    x: random.range(-100, ARENA.width + 100),
    y: random.range(20, ARENA.height - 60),
    scale: random.range(0.6, 1.6),
    speed: random.range(6, 18),
  };
}

// Move an enemy one step: motes chase, spitters hold range and shoot,
// brutes lumber forward, the boss drifts in and fires radial bursts.
export function stepEnemy(enemy, player, dt, fireOrb) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  enemy.wobble += dt * 3;
  if (enemy.flash > 0) enemy.flash -= dt;

  if (enemy.kind === 'mote') {
    const wob = Math.sin(enemy.wobble) * 0.35;
    enemy.vx = (nx - ny * wob) * enemy.speed;
    enemy.vy = (ny + nx * wob) * enemy.speed;
  } else if (enemy.kind === 'spitter') {
    const want = 260;
    const toward = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
    enemy.vx = nx * enemy.speed * toward + -ny * 40 * Math.sin(enemy.wobble * 0.5);
    enemy.vy = ny * enemy.speed * toward + nx * 40 * Math.sin(enemy.wobble * 0.5);
    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0 && dist < 560) {
      enemy.fireTimer = 2.2;
      fireOrb(enemy.x, enemy.y, Math.atan2(dy, dx));
    }
  } else if (enemy.kind === 'brute') {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
  } else if (enemy.kind === 'boss') {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
    enemy.burstTimer -= dt;
    if (enemy.burstTimer <= 0) {
      enemy.burstTimer = 3.0;
      for (let i = 0; i < 10; i += 1) {
        fireOrb(enemy.x, enemy.y, (i / 10) * Math.PI * 2 + enemy.wobble);
      }
    }
    enemy.spawnTimer -= dt;
    if (enemy.spawnTimer <= 0) {
      enemy.spawnTimer = 5;
      return 'spawn-mote';
    }
  }
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  enemy.x = Math.max(enemy.radius, Math.min(ARENA.width - enemy.radius, enemy.x));
  enemy.y = Math.max(enemy.radius, Math.min(ARENA.height - enemy.radius, enemy.y));
  return null;
}
