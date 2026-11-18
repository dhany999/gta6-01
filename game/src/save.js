// Save / load: position, money, mission, health in localStorage.
import { G } from './state.js';

const KEY = 'solmar-bay-save-v1';

export function saveGame() {
  const p = G.player;
  const data = {
    money: G.money,
    missionIndex: G.missionIndex,
    hp: p.hp,
    pos: { x: p.pos.x, z: p.pos.z },
    wanted: G.wanted,
  };
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ }
  G.save = saveGame;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.money = d.money || 0;
    G.missionIndex = d.missionIndex || 0;
    G.player.hp = d.hp || 100;
    G.player.pos.set(d.pos?.x || 0, 0, d.pos?.z || 24);
    G.wanted = d.wanted || 0;
    return true;
  } catch (e) { return false; }
}
