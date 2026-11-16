// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), the
// renderer paints what is there and the DOM HUD shows score, wave, hull,
// shards and combo. The game moves between title, play, paused, game over
// and victory screens; Enter starts, R restarts, P pauses, M mutes.
// ?seed=N fixes the spawn pattern. ?shot=start|play|boss|victory (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { ARENA, BEST_KEY, SHARD_BOMB_COST, STEP, WIN_WAVE } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_LOSE, EVENT_WIN } from './world.js';
import { ACTION_START, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const audio = createAudio();
const world = createWorld(createRandom(seed), {
  onShoot: () => audio.shoot(),
  onHit: () => audio.hit(),
  onKill: () => audio.explosion(),
  onHurt: () => audio.hurt(),
  onPickup: (kind) => { if (kind === 'heart') audio.heart(); else audio.pickup(); },
  onWave: () => audio.waveHorn(),
  onBoss: () => audio.bossRoar(),
  onDash: () => audio.dash(),
  onSunburst: () => audio.sunburst(),
  onWin: () => { audio.victory(); },
  onLose: () => { audio.defeat(); },
});
const renderer = createRenderer(canvas);

const el = (id) => document.getElementById(id);
const hud = {
  score: el('hud-score'),
  wave: el('hud-wave'),
  hull: el('hud-hull'),
  shards: el('hud-shards'),
  combo: el('hud-combo'),
  bomb: el('hud-bomb'),
  bossBar: el('bossbar'),
  bossFill: el('bossfill'),
};

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function hearts(hull, max) {
  let out = '';
  for (let i = 0; i < max; i += 1) out += i < hull ? '♥' : '♡';
  return out;
}

function updateHud(screen) {
  const state = world.state;
  hud.score.textContent = String(state.score);
  hud.wave.textContent = state.wave === 0 ? '—' : `${state.wave} / ${WIN_WAVE}`;
  hud.hull.textContent = hearts(state.player.hull, state.player.maxHull);
  hud.shards.textContent = `◆ ${state.player.shards}`;
  hud.combo.textContent = state.combo > 1 ? `COMBO ×${state.combo}` : '';
  hud.bomb.textContent = state.player.shards >= SHARD_BOMB_COST ? 'E — SUNBURST READY!' : `E — Sunburst ${state.player.shards}/${SHARD_BOMB_COST} ◆`;
  hud.bomb.classList.toggle('ready', state.player.shards >= SHARD_BOMB_COST);
  if (state.boss && screen === SCREEN_PLAY) {
    hud.bossBar.hidden = false;
    hud.bossFill.style.width = `${Math.max(0, (state.boss.hp / state.boss.maxHp) * 100)}%`;
  } else {
    hud.bossBar.hidden = true;
  }
}

function showScreen(screen) {
  el('screen-title').hidden = screen !== SCREEN_TITLE;
  el('screen-pause').hidden = screen !== SCREEN_PAUSED;
  el('screen-over').hidden = screen !== SCREEN_OVER;
  el('screen-win').hidden = screen !== SCREEN_WIN;
  el('hud').hidden = screen === SCREEN_TITLE;
  if (screen === SCREEN_OVER) {
    el('over-score').textContent = String(world.state.score);
    el('over-wave').textContent = String(Math.max(1, world.state.wave));
    el('over-kills').textContent = String(world.state.kills);
    el('over-best').textContent = String(readBest());
  }
  if (screen === SCREEN_WIN) {
    el('win-score').textContent = String(world.state.score);
    el('win-kills').textContent = String(world.state.kills);
    el('win-combo').textContent = `×${Math.max(1, world.state.bestCombo)}`;
    el('win-shards').textContent = String(world.state.shardsCollected);
    el('win-best').textContent = String(readBest());
  }
  if (screen === SCREEN_TITLE) {
    el('title-best').textContent = String(readBest());
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // A staged victory is a real win through the game's own rules, so the
  // best score on its screen is the score it earned.
  if (scene.screen === SCREEN_WIN && world.state.score > readBest()) {
    saveBest(world.state.score);
  }
  updateHud(scene.screen);
  showScreen(scene.screen);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  showScreen(screen);
  updateHud(screen);
  audio.startMusic();

  function startPlaying() {
    world.reset();
    screen = SCREEN_PLAY;
    audio.unlock();
    showScreen(screen);
    updateHud(screen);
  }

  function endGame(won) {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    showScreen(screen);
    updateHud(screen);
  }

  function frame(now) {
    const delta = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (input.takeAction(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      el('mute-note').textContent = muted ? 'Sound off (M to turn on)' : 'Sound on (M to mute)';
    }
    if (screen === SCREEN_TITLE) {
      world.step(STEP, {
        moveX: () => 0, moveY: () => 0, firing: () => false, dashing: () => false,
        mouse: { x: 640, y: 360, down: false }, takeAction: () => false,
      });
      if (input.takeAction(ACTION_START)) startPlaying();
    } else if (screen === SCREEN_PLAY) {
      if (input.takeAction(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        showScreen(screen);
      } else {
        accumulator += delta;
        while (accumulator >= STEP) {
          const event = world.step(STEP, input);
          accumulator -= STEP;
          if (event & EVENT_WIN) { endGame(true); break; }
          if (event & EVENT_LOSE) { endGame(false); break; }
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.takeAction(ACTION_PAUSE) || input.takeAction(ACTION_START)) {
        screen = SCREEN_PLAY;
        showScreen(screen);
      }
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (input.takeAction(ACTION_RESTART) || input.takeAction(ACTION_START)) startPlaying();
    }
    renderer.draw(world.state, screen);
    updateHud(screen);
    requestAnimationFrame(frame);
  }

  el('btn-start').addEventListener('click', () => { audio.unlock(); startPlaying(); });
  el('btn-again').addEventListener('click', () => startPlaying());
  el('btn-retry').addEventListener('click', () => startPlaying());
  el('btn-resume').addEventListener('click', () => { screen = SCREEN_PLAY; showScreen(screen); });
  el('btn-title').addEventListener('click', () => {
    world.reset();
    screen = SCREEN_TITLE;
    showScreen(screen);
    updateHud(screen);
  });
  el('btn-title-win').addEventListener('click', () => {
    world.reset();
    screen = SCREEN_TITLE;
    showScreen(screen);
    updateHud(screen);
  });
  canvas.addEventListener('click', () => audio.unlock());
  requestAnimationFrame(frame);
}

// Debug hook for the play-test driver: live state, never shown to players.
window.__lumen = () => {
  const s = world.state;
  return {
    screen: document.querySelector('.screen:not([hidden])')?.id ?? 'none',
    score: s.score,
    wave: s.wave,
    hull: s.player.hull,
    shards: s.player.shards,
    combo: s.combo,
    kills: s.kills,
    enemies: s.enemies.length,
    bullets: s.bullets.length,
    pickups: s.pickups.length,
    over: s.over,
    won: s.won,
    bossHp: s.boss ? s.boss.hp : null,
  };
};
window.__gameError = null;
window.addEventListener('error', (event) => { window.__gameError = String(event.message); });

if (shot) runShot(shot);
else runGame();
