// Solmar Heist — keyboard + mouse input. Tracks held keys, edge-triggered
// presses, and mouse orbit deltas (pointer lock when the player clicks).
export const ACTION_CONFIRM = 'confirm';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseDX = 0;
  let mouseDY = 0;
  let mouseDown = false;
  let locked = false;

  function code(e) { return e.code; }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(code(e));
    pressed.add(code(e));
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code(e))) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(code(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    if (e.button === 0 && canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch { /* pointer lock is a nicety */ }
    }
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });
  window.addEventListener('mousemove', (e) => {
    if (locked || mouseDown) {
      mouseDX += e.movementX || 0;
      mouseDY += e.movementY || 0;
    }
  });

  return {
    // Held-state queries (WASD + arrows).
    get forward() { return keys.has('KeyW') || keys.has('ArrowUp'); },
    get back() { return keys.has('KeyS') || keys.has('ArrowDown'); },
    get left() { return keys.has('KeyA') || keys.has('ArrowLeft'); },
    get right() { return keys.has('KeyD') || keys.has('ArrowRight'); },
    get run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get handbrake() { return keys.has('Space'); },
    has(codeName) { return keys.has(codeName); },
    // True once per physical press; consumed at end of each frame.
    wasPressed(codeName) { return pressed.has(codeName); },
    consumeMouse() {
      const dx = mouseDX;
      const dy = mouseDY;
      mouseDX = 0;
      mouseDY = 0;
      return { dx, dy };
    },
    endFrame() { pressed.clear(); },
  };
}
