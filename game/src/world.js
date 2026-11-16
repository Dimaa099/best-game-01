// The world: game state, wave spawning, movement, collisions, scoring,
// combos and the win/lose conditions. Pure rules — no drawing, no sound;
// the caller passes in hooks (onKill, onHurt, onPickup, onWave, onWin, onLose)
// so the same world drives the live game and the screenshot staging.
import { ARENA, ENEMIES, PLAYER, PICKUP, STEP, WAVES, WIN_WAVE, SHARD_BOMB_COST } from './config.js';
import { createPlayer, createEnemy, createBullet, createPickup, createParticle, createCloud, stepEnemy } from './entities.js';

export const EVENT_NONE = 0;
export const EVENT_WIN = 1;
export const EVENT_LOSE = 2;
export const EVENT_WAVE_CLEAR = 4;

const SPAWN_MARGIN = 40;

export function createWorld(random, hooks = {}) {
  const state = {
    player: createPlayer(),
    enemies: [],
    bullets: [],
    orbs: [],
    pickups: [],
    particles: [],
    clouds: [],
    wave: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    kills: 0,
    shardsCollected: 0,
    shotsFired: 0,
    time: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    wavePauseTimer: 0,
    banner: '',
    bannerTimer: 0,
    boss: null,
    over: false,
    won: false,
    shake: 0,
    sunbursts: 0,
  };
  for (let i = 0; i < 7; i += 1) state.clouds.push(createCloud(random));

  function spawnEdge(kind) {
    const side = random.int(0, 3);
    let x;
    let y;
    if (side === 0) { x = random.range(0, ARENA.width); y = -SPAWN_MARGIN; }
    else if (side === 1) { x = ARENA.width + SPAWN_MARGIN; y = random.range(0, ARENA.height); }
    else if (side === 2) { x = random.range(0, ARENA.width); y = ARENA.height + SPAWN_MARGIN; }
    else { x = -SPAWN_MARGIN; y = random.range(0, ARENA.height); }
    const enemy = createEnemy(kind, x, y, state.wave);
    state.enemies.push(enemy);
    if (kind === 'boss') state.boss = enemy;
    return enemy;
  }

  function startWave(n) {
    state.wave = n;
    const def = WAVES[n - 1];
    const queue = [];
    for (let i = 0; i < def.motes; i += 1) queue.push('mote');
    for (let i = 0; i < def.spitters; i += 1) queue.push('spitter');
    for (let i = 0; i < def.brutes; i += 1) queue.push('brute');
    // Shuffle so the kinds arrive mixed, not in blocks.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random.next() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    state.spawnQueue = queue;
    state.spawnTimer = 0.5;
    state.waveActive = true;
    state.banner = n === WIN_WAVE ? 'FINAL WAVE — GLOOMMAW!' : `WAVE ${n}`;
    state.bannerTimer = 2.2;
    if (def.boss) {
      spawnEdge('boss');
      hooks.onBoss?.();
    }
    hooks.onWave?.(n);
  }

  function dropPickup(x, y, kind) {
    state.pickups.push(createPickup(kind, x, y));
  }

  function killEnemy(enemy, awardScore = true) {
    state.enemies = state.enemies.filter((e) => e.id !== enemy.id);
    if (enemy.kind === 'boss') state.boss = null;
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = 3;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const gained = awardScore ? enemy.score * (1 + Math.min(state.combo - 1, 8) * 0.1) : 0;
    state.score += Math.round(gained);
    state.particles.push(...createParticle(enemy.x, enemy.y, ENEMIES[enemy.kind].color, 16, 220));
    state.particles.push(...createParticle(enemy.x, enemy.y, '#ffd23e', 8, 160));
    // Shards burst out of every kill; brutes and the boss also drop hearts.
    const shards = enemy.kind === 'boss' ? 8 : enemy.kind === 'brute' ? 3 : random.int(1, 2);
    for (let i = 0; i < shards; i += 1) {
      dropPickup(enemy.x + random.range(-24, 24), enemy.y + random.range(-24, 24), 'shard');
    }
    if (enemy.kind === 'brute' && random.next() < 0.5) dropPickup(enemy.x, enemy.y, 'heart');
    if (enemy.kind === 'boss' && random.next() < 0.8) dropPickup(enemy.x, enemy.y, 'spread');
    if (enemy.kind === 'spitter' && random.next() < 0.18) dropPickup(enemy.x, enemy.y, 'shield');
    if (enemy.kind === 'boss') {
      state.won = true;
      state.over = true;
      hooks.onWin?.();
    }
    hooks.onKill?.(enemy, Math.round(gained));
    return EVENT_NONE;
  }

  function hurtPlayer(damage) {
    const player = state.player;
    if (player.invulnTimer > 0 || player.shieldTimer > 0 || state.over) return;
    player.hull -= damage;
    player.invulnTimer = PLAYER.invulnTime;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 10;
    state.particles.push(...createParticle(player.x, player.y, '#ff5d8f', 14, 200));
    hooks.onHurt?.(damage);
    if (player.hull <= 0) {
      player.hull = 0;
      state.over = true;
      state.won = false;
      state.particles.push(...createParticle(player.x, player.y, '#ffd23e', 30, 300));
      hooks.onLose?.();
    }
  }

  function fireSunburst() {
    const player = state.player;
    if (player.shards < SHARD_BOMB_COST || state.over) return false;
    player.shards -= SHARD_BOMB_COST;
    state.sunbursts += 1;
    state.orbs = [];
    state.particles.push(...createParticle(player.x, player.y, '#ffd23e', 40, 420));
    for (const enemy of [...state.enemies]) {
      enemy.hp -= 6;
      enemy.flash = 0.25;
      if (enemy.hp <= 0) killEnemy(enemy);
    }
    state.shake = 14;
    hooks.onSunburst?.();
    return true;
  }

  function stepPlayer(dt, input) {
    const player = state.player;
    if (state.over) return;
    const mx = input.moveX();
    const my = input.moveY();
    const len = Math.hypot(mx, my) || 1;
    const dx = mx / len;
    const dy = my / len;

    player.dashCooldown -= dt;
    if (input.dashing() && player.dashCooldown <= 0 && (mx !== 0 || my !== 0)) {
      player.dashTimer = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown;
      player.invulnTimer = Math.max(player.invulnTimer, PLAYER.dashTime + 0.05);
      hooks.onDash?.();
    }
    const speed = player.dashTimer > 0 ? PLAYER.dashSpeed : PLAYER.speed;
    if (player.dashTimer > 0) player.dashTimer -= dt;
    player.x = Math.max(player.radius, Math.min(ARENA.width - player.radius, player.x + dx * speed * dt));
    player.y = Math.max(player.radius, Math.min(ARENA.height - player.radius, player.y + dy * speed * dt));
    player.angle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 14) player.trail.shift();

    if (player.invulnTimer > 0) player.invulnTimer -= dt;
    if (player.spreadTimer > 0) player.spreadTimer -= dt;
    if (player.shieldTimer > 0) player.shieldTimer -= dt;

    // Firing: one bolt straight ahead, or a three-way spread while powered up.
    player.fireTimer -= dt;
    if (input.firing() && player.fireTimer <= 0) {
      player.fireTimer = PLAYER.fireInterval;
      const spread = player.spreadTimer > 0;
      const angles = spread ? [-0.22, 0, 0.22] : [0];
      for (const off of angles) {
        const bx = player.x + Math.cos(player.angle) * (player.radius + 8);
        const by = player.y + Math.sin(player.angle) * (player.radius + 8);
        state.bullets.push(createBullet(bx, by, player.angle + off, PLAYER.bulletSpeed, PLAYER.bulletDamage, true));
      }
      state.shotsFired += 1;
      hooks.onShoot?.();
    }
    if (input.takeAction && input.takeAction('bomb')) fireSunburst();
  }

  function stepBullets(dt) {
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
    }
    state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < ARENA.width + 20 && b.y > -20 && b.y < ARENA.height + 20);
    for (const orb of state.orbs) {
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.life -= dt;
    }
    state.orbs = state.orbs.filter((o) => o.life > 0 && o.x > -30 && o.x < ARENA.width + 30 && o.y > -30 && o.y < ARENA.height + 30);
  }

  function stepPickups(dt) {
    const player = state.player;
    for (const pickup of state.pickups) {
      pickup.bob += dt * 4;
      pickup.life -= dt;
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        pickup.x += (dx / (dist || 1)) * 260 * dt;
        pickup.y += (dy / (dist || 1)) * 260 * dt;
      }
      if (dist < player.radius + pickup.radius + 6) {
        pickup.taken = true;
        if (pickup.kind === 'shard') {
          player.shards += 1;
          state.shardsCollected += 1;
          state.score += PICKUP.shard.score;
          hooks.onPickup?.('shard');
        } else if (pickup.kind === 'heart') {
          player.hull = Math.min(player.maxHull, player.hull + 1);
          hooks.onPickup?.('heart');
        } else if (pickup.kind === 'spread') {
          player.spreadTimer = PICKUP.spread.duration;
          hooks.onPickup?.('spread');
        } else if (pickup.kind === 'shield') {
          player.shieldTimer = PICKUP.shield.duration;
          hooks.onPickup?.('shield');
        }
      }
    }
    state.pickups = state.pickups.filter((p) => !p.taken && p.life > 0);
  }

  function stepCollisions() {
    // Player bolts vs enemies.
    for (const bullet of [...state.bullets]) {
      if (!bullet.friendly) continue;
      for (const enemy of [...state.enemies]) {
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        if (dx * dx + dy * dy < (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius)) {
          enemy.hp -= bullet.damage;
          enemy.flash = 0.12;
          bullet.life = 0;
          state.particles.push(...createParticle(bullet.x, bullet.y, '#ffcf3f', 4, 140));
          hooks.onHit?.();
          if (enemy.hp <= 0) killEnemy(enemy);
          break;
        }
      }
    }
    state.bullets = state.bullets.filter((b) => b.life > 0);
    // Enemy orbs vs player.
    for (const orb of [...state.orbs]) {
      const dx = orb.x - state.player.x;
      const dy = orb.y - state.player.y;
      if (dx * dx + dy * dy < (orb.radius + state.player.radius - 4) * (orb.radius + state.player.radius - 4)) {
        orb.life = 0;
        hurtPlayer(1);
      }
    }
    state.orbs = state.orbs.filter((o) => o.life > 0);
    // Enemies touching the player.
    for (const enemy of [...state.enemies]) {
      const dx = enemy.x - state.player.x;
      const dy = enemy.y - state.player.y;
      const rr = enemy.radius + state.player.radius - 4;
      if (dx * dx + dy * dy < rr * rr) {
        hurtPlayer(enemy.damage);
        // Knock the enemy back so one touch is not a chain of hits.
        const dist = Math.hypot(dx, dy) || 1;
        enemy.x += (dx / dist) * 30;
        enemy.y += (dy / dist) * 30;
      }
    }
  }

  function stepParticles(dt) {
    for (const part of state.particles) {
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vx *= 0.96;
      part.vy *= 0.96;
      part.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const cloud of state.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > ARENA.width + 140) {
        cloud.x = -140;
        cloud.y = random.range(20, ARENA.height - 60);
      }
    }
  }

  function step(dt, input) {
    if (state.over) {
      stepParticles(dt);
      return state.won ? EVENT_WIN : EVENT_LOSE;
    }
    state.time += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

    stepPlayer(dt, input);

    // Wave flow: start the first wave, feed the spawn queue, then wait for a
    // clear before the next wave (or the win, after wave 5).
    if (!state.waveActive) {
      state.wavePauseTimer -= dt;
      if (state.wavePauseTimer <= 0 && state.wave < WIN_WAVE) startWave(state.wave + 1);
    } else {
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = WAVES[state.wave - 1].interval;
          spawnEdge(state.spawnQueue.shift());
        }
      } else if (state.enemies.length === 0) {
        state.waveActive = false;
        if (state.wave >= WIN_WAVE) {
          state.won = true;
          state.over = true;
          hooks.onWin?.();
          return EVENT_WIN;
        }
        state.wavePauseTimer = 2.5;
        state.banner = 'WAVE CLEAR!';
        state.bannerTimer = 2.0;
        hooks.onWaveClear?.(state.wave);
      }
    }

    const fireOrb = (x, y, angle) => {
      state.orbs.push(createBullet(x, y, angle, 190, 1, false));
    };
    for (const enemy of [...state.enemies]) {
      const result = stepEnemy(enemy, state.player, dt, fireOrb);
      if (result === 'spawn-mote') {
        const mote = createEnemy('mote', enemy.x + random.range(-60, 60), enemy.y + random.range(-60, 60), state.wave);
        state.enemies.push(mote);
      }
    }

    stepBullets(dt);
    stepPickups(dt);
    stepCollisions();
    stepParticles(dt);
    return state.over ? (state.won ? EVENT_WIN : EVENT_LOSE) : EVENT_NONE;
  }

  function reset() {
    const fresh = createWorld(random, hooks);
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, fresh.state);
  }

  return {
    state,
    step,
    reset,
    startWave,
    fireSunburst,
    spawnEdge,
    killEnemy,
  };
}
