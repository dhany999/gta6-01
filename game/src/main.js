// Solmar Bay — bootstrap, input, game loop, states.
import * as THREE from 'three';
import { G } from './state.js';
import { createRenderer } from './render.js';
import { buildWorld } from './world.js';
import { createPlayer, updatePlayer } from './player.js';
import { makeCar, driveCar, spawnParkedCars } from './vehicles.js';
import { initTraffic, updateTraffic } from './traffic.js';
import { initPolice, updatePolice, addWanted } from './police.js';
import { initMissions, updateMissions } from './missions.js';
import { initCombat, updateCombat, shoot, punch, reloadNow } from './combat.js';
import { initHud } from './hud.js';
import { initAudio } from './audio.js';
import { initEffects, updateEffects } from './effects.js';
import { saveGame, loadGame } from './save.js';
import { setupShot } from './shots.js';

G.save = saveGame;
const { renderer, scene, camera, sun } = createRenderer();
G.renderer = renderer; G.scene = scene; G.camera = camera;
buildWorld();
createPlayer();
spawnParkedCars();
initTraffic();
initPolice();
initMissions();
initCombat();
initHud();
initAudio();
initEffects();

window.__game = G;

// ---------- input ----------
const canvas = renderer.domElement;
let dragging = false;
window.addEventListener('keydown', (e) => {
  G.keys[e.code] = true;
  if (G.audio) G.audio.unlock();
  if (e.code === 'KeyE' && G.state === 'playing') toggleCar();
  if (e.code === 'Digit1' && G.state === 'playing') G.player.weapon = 'pistol';
  if (e.code === 'Digit2' && G.state === 'playing') G.player.weapon = 'melee';
  if (e.code === 'KeyR' && G.state === 'playing') reloadNow();
  if (e.code === 'KeyP' && (G.state === 'playing' || G.state === 'paused')) {
    G.state = G.state === 'playing' ? 'paused' : 'playing';
    document.getElementById('pause').classList.toggle('hidden', G.state !== 'paused');
  }
});
window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
canvas.addEventListener('mousedown', (e) => {
  dragging = true;
  if (G.audio) G.audio.unlock();
  if (G.state === 'playing') {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    if (G.player.weapon === 'pistol') shoot();
    else punch();
  }
});
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas || dragging) {
    G.camYaw -= (e.movementX || 0) * 0.0032;
    G.camPitch = Math.max(0.05, Math.min(1.1, G.camPitch + (e.movementY || 0) * 0.0024));
  }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function nearestStealable(maxD) {
  const pPos = G.player.pos;
  let best = null, bestD = maxD;
  for (const car of [...G.parked, ...G.traffic]) {
    const d = Math.hypot(car.pos.x - pPos.x, car.pos.z - pPos.z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function toggleCar() {
  const p = G.player;
  if (p.inCar) {
    // Step out beside the car; it becomes parked again.
    const car = p.car;
    p.pos.set(car.pos.x + Math.sin(car.yaw + Math.PI / 2) * 2.4, 0, car.pos.z + Math.cos(car.yaw + Math.PI / 2) * 2.4);
    p.inCar = false; p.car = null;
    p.group.position.copy(p.pos);
    p.group.visible = true;
    if (!G.parked.includes(car)) G.parked.push(car);
    return;
  }
  const car = nearestStealable(3.8);
  if (!car) return;
  G.parked = G.parked.filter((c) => c !== car);
  G.traffic = G.traffic.filter((c) => c !== car);
  p.inCar = true; p.car = car;
  p.group.visible = false;
  addWanted(1);
  if (G.audio) G.audio.alarm();
  if (G.hud) G.hud.toast('Car stolen — the cops are coming');
}

// ---------- menu / end screens ----------
const menuEl = document.getElementById('menu');
const endEl = document.getElementById('end-screen');
document.getElementById('btn-new').addEventListener('click', () => {
  G.audio?.unlock();
  G.money = 0; G.missionIndex = 0; G.missionDone = false;
  G.wanted = 0; G.player.hp = 100;
  G.player.pos.set(0, 0, 24);
  menuEl.classList.add('hidden');
  G.state = 'playing';
});
document.getElementById('btn-continue').addEventListener('click', () => {
  G.audio?.unlock();
  loadGame();
  menuEl.classList.add('hidden');
  G.state = 'playing';
});
document.getElementById('btn-end').addEventListener('click', () => {
  const p = G.player;
  if (G.state === 'busted' || G.state === 'wasted') {
    G.money = Math.max(0, G.money - 500);
    p.hp = 100; G.wanted = 0;
    p.pos.set(0, 0, 24);
    p.inCar = false; p.car = null; p.group.visible = true;
    p.group.position.copy(p.pos);
  }
  endEl.classList.add('hidden');
  G.state = 'playing';
});
// Show Continue only when a save exists.
try {
  if (!localStorage.getItem('solmar-bay-save-v1')) {
    document.getElementById('btn-continue').style.display = 'none';
  }
} catch (e) { /* ignore */ }

// ---------- camera ----------
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3(0, 8, 16);
function updateCamera(dt) {
  const p = G.player;
  if (p.inCar && p.car) {
    const fwd = new THREE.Vector3(Math.sin(p.car.yaw), 0, Math.cos(p.car.yaw));
    camTarget.copy(p.car.pos).addScaledVector(fwd, 7).add(new THREE.Vector3(0, 1.6, 0));
    camPos.copy(p.car.pos).addScaledVector(fwd, -10).add(new THREE.Vector3(0, 4.2, 0));
  } else {
    const cp = Math.cos(G.camPitch), sp = Math.sin(G.camPitch);
    const off = new THREE.Vector3(Math.sin(G.camYaw) * cp, sp, Math.cos(G.camYaw) * cp);
    camTarget.copy(p.pos).add(new THREE.Vector3(0, 1.7, 0));
    camPos.copy(p.pos).addScaledVector(off, 7.5).add(new THREE.Vector3(0, 0.6, 0));
  }
  camera.position.lerp(camPos, Math.min(1, dt * 7));
  camera.lookAt(camTarget);
  // Sun follows the player so shadows stay crisp.
  sun.position.set(p.pos.x + 120, 180, p.pos.z + 60);
  sun.target.position.set(p.pos.x, 0, p.pos.z);
  sun.target.updateMatrixWorld();
}

// ---------- loop ----------
const clock = new THREE.Clock();
let frames = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  G.time += dt;
  frames++;
  if (G.state === 'playing') {
    updatePlayer(dt);
    const p = G.player;
    if (p.inCar && p.car) {
      const k = G.keys;
      driveCar(p.car, dt, {
        up: !!k['KeyW'], down: !!k['KeyS'],
        left: !!k['KeyA'], right: !!k['KeyD'],
      });
      if (Math.abs(p.car.speed) > 12 && frames % 6 === 0) {
        G.effects.dust(new THREE.Vector3(p.car.pos.x, 0.2, p.car.pos.z));
      }
      if (G.audio) G.audio.engine(true, p.car.speed);
    } else if (G.audio) G.audio.engine(false, 0);
    updateTraffic(dt);
    updatePolice(dt);
    updateMissions(dt);
    updateCombat(dt);
    updateEffects(dt);
    if (G.audio) G.audio.siren(G.wanted > 0);
    if (p.hp <= 0 && G.state === 'playing') {
      G.state = 'wasted';
      G.hud.showWasted();
    }
    updateCamera(dt);
    G.hud.update();
  } else if (G.state === 'menu') {
    // Slow orbit behind the menu.
    const a = G.time * 0.05;
    camera.position.set(Math.sin(a) * 120, 55, Math.cos(a) * 120);
    camera.lookAt(0, 8, 0);
    updateTraffic(dt);
    updateEffects(dt);
  }
  renderer.render(scene, camera);
}

// ---------- shots mode ----------
const shotParam = new URLSearchParams(location.search).get('shot');
const shotNum = shotParam ? parseInt(shotParam, 10) : 0;
if (shotNum >= 1 && shotNum <= 4) {
  setupShot(shotNum);
  // A few frames so the HUD and minimap paint, then signal readiness.
  let n = 0;
  const tick = () => {
    renderer.render(scene, camera);
    if (++n < 4) requestAnimationFrame(tick);
    else document.title = 'READY';
  };
  requestAnimationFrame(tick);
} else {
  loop();
}
