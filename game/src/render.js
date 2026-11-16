// Canvas rendering: a bright sky with a glowing sun, drifting clouds, the
// player's sun-skiff, violet void enemies, golden bolts and star shards.
// Nothing here reads the DOM except the canvas it was given.
import { ARENA, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, ARENA.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);

  function drawBackground(state) {
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    // The sun, top-left, with a soft halo.
    const sunX = 110;
    const sunY = 92;
    const halo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 150);
    halo.addColorStop(0, 'rgba(255,242,150,0.9)');
    halo.addColorStop(1, 'rgba(255,242,150,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
    ctx.fillStyle = PALETTE.sunCore;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.sun;
    ctx.lineWidth = 6;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + state.time * 0.1;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(a) * 52, sunY + Math.sin(a) * 52);
      ctx.lineTo(sunX + Math.cos(a) * 68, sunY + Math.sin(a) * 68);
      ctx.stroke();
    }
    // Drifting clouds.
    ctx.fillStyle = PALETTE.cloud;
    for (const cloud of state.clouds) {
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, 70 * cloud.scale, 22 * cloud.scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + 40 * cloud.scale, cloud.y + 8, 46 * cloud.scale, 16 * cloud.scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x - 42 * cloud.scale, cloud.y + 8, 42 * cloud.scale, 15 * cloud.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer(player, time) {
    // Engine trail.
    for (let i = 0; i < player.trail.length; i += 1) {
      const t = player.trail[i];
      const alpha = (i / player.trail.length) * 0.35;
      ctx.fillStyle = `rgba(255,210,62,${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 10 * (i / player.trail.length), 0, Math.PI * 2);
      ctx.fill();
    }
    const blink = player.invulnTimer > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    // Shield ring.
    if (player.shieldTimer > 0) {
      ctx.strokeStyle = 'rgba(126,240,255,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Skiff body: a golden dart with a bright core.
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
    glow.addColorStop(0, 'rgba(255,210,62,0.55)');
    glow.addColorStop(1, 'rgba(255,210,62,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-14, -16);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.sunCore;
    ctx.beginPath();
    ctx.arc(2, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(enemy, time) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const flash = enemy.flash > 0;
    const body = flash ? '#ffffff' : enemy.kind === 'mote' ? PALETTE.mote
      : enemy.kind === 'spitter' ? PALETTE.spitter
      : enemy.kind === 'brute' ? PALETTE.brute : PALETTE.boss;
    // Wobbly blob body.
    ctx.fillStyle = body;
    ctx.beginPath();
    const wob = enemy.kind === 'boss' ? 0 : Math.sin(enemy.wobble) * 2;
    ctx.ellipse(0, 0, enemy.radius + wob, enemy.radius - wob, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Eyes look toward the player: one big eye for motes, two for spitters,
    // angry slits for brutes, a huge ringed eye for the boss.
    ctx.fillStyle = PALETTE.moteEye;
    if (enemy.kind === 'boss') {
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a0a4a';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5d8f';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'spitter') {
      ctx.beginPath();
      ctx.arc(-7, -4, 5, 0, Math.PI * 2);
      ctx.arc(7, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a0a4a';
      ctx.beginPath();
      ctx.arc(-7, -4, 2, 0, Math.PI * 2);
      ctx.arc(7, -4, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'brute') {
      ctx.fillStyle = '#ff8fa3';
      ctx.fillRect(-14, -6, 10, 3);
      ctx.fillRect(4, -6, 10, 3);
    } else {
      ctx.beginPath();
      ctx.arc(0, -3, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a0a4a';
      ctx.beginPath();
      ctx.arc(0, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Health bar over hurt enemies and the boss.
    if (enemy.hp < enemy.maxHp) {
      const w = enemy.radius * 2;
      const frac = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(20,32,64,0.6)';
      ctx.fillRect(-w / 2, -enemy.radius - 14, w, 6);
      ctx.fillStyle = frac > 0.5 ? '#7ec850' : frac > 0.25 ? '#ffcf3f' : '#ff5d5d';
      ctx.fillRect(-w / 2, -enemy.radius - 14, w * frac, 6);
    }
    ctx.restore();
    void time;
  }

  function drawPickups(state) {
    for (const pickup of state.pickups) {
      const bob = Math.sin(pickup.bob) * 3;
      const y = pickup.y + bob;
      ctx.save();
      ctx.translate(pickup.x, y);
      if (pickup.kind === 'shard') {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = PALETTE.shardGlow;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.fillStyle = PALETTE.shard;
        ctx.fillRect(-4, -4, 8, 8);
      } else if (pickup.kind === 'heart') {
        ctx.fillStyle = PALETTE.heart;
        ctx.beginPath();
        ctx.arc(-4, -2, 6, 0, Math.PI * 2);
        ctx.arc(4, -2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(10, 0);
        ctx.closePath();
        ctx.fill();
      } else if (pickup.kind === 'spread') {
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×3', 0, 1);
      } else if (pickup.kind === 'shield') {
        ctx.strokeStyle = '#2ec5e6';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(126,240,255,0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawBullets(state) {
    for (const bullet of state.bullets) {
      ctx.fillStyle = PALETTE.bullet;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7ae';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const orb of state.orbs) {
      ctx.fillStyle = PALETTE.orb;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b4ff';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles(state) {
    for (const part of state.particles) {
      ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBanner(state) {
    if (state.bannerTimer <= 0 || !state.banner) return;
    const alpha = Math.min(1, state.bannerTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(20,32,64,0.85)';
    ctx.strokeText(state.banner, ARENA.width / 2, 150);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.banner, ARENA.width / 2, 150);
    ctx.restore();
  }

  function draw(state, screen) {
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    drawPickups(state);
    for (const enemy of state.enemies) drawEnemy(enemy, state.time);
    drawBullets(state);
    if (!state.over || screen === SCREEN_WIN) drawPlayer(state.player, state.time);
    if (state.over && screen === SCREEN_OVER) {
      // The skiff is gone: a fading burst marks where it fell.
      ctx.fillStyle = 'rgba(255,93,143,0.25)';
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    drawParticles(state);
    drawBanner(state);
    ctx.restore();
  }

  return { draw };
}
