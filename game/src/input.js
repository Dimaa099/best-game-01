// Keyboard + mouse input. Movement is WASD or arrows, aim follows the mouse,
// hold the mouse button (or Space) to fire, Shift dashes, E fires a Sunburst
// when enough shards are banked, P pauses, R restarts, Enter starts.
export const ACTION_START = 'start';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_BOMB = 'bomb';
export const ACTION_MUTE = 'mute';

const KEY_ACTIONS = {
  Enter: ACTION_START,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyE: ACTION_BOMB,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 640, y: 360, down: false };
  const listeners = [];

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (KEY_ACTIONS[event.code]) pressed.add(KEY_ACTIONS[event.code]);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.code)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }
  function onMouseDown(event) {
    if (event.button === 0) mouse.down = true;
  }
  function onMouseUp(event) {
    if (event.button === 0) mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  listeners.push(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
  });

  return {
    mouse,
    moveX() {
      let x = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      return x;
    },
    moveY() {
      let y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return y;
    },
    firing() {
      return mouse.down || keys.has('Space');
    },
    dashing() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    takeAction(name) {
      if (pressed.has(name)) {
        pressed.delete(name);
        return true;
      }
      return false;
    },
    clearActions() {
      pressed.clear();
    },
    destroy() {
      listeners.forEach((fn) => fn());
    },
  };
}
