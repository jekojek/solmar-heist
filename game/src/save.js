// Solmar Heist — save/load through localStorage: cash, health, ammo, story
// progress and where Raka stands. Nothing here ever touches the network.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      cash: state.cash,
      health: state.player.health,
      ammo: state.player.ammo,
      missionIndex: state.missions.index,
      completed: state.missions.completed,
      pos: [state.player.pos.x, state.player.pos.y, state.player.pos.z],
      heading: state.player.heading,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}
