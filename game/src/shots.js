// Scripted screenshot scenes (?shot=1..4). Deterministic: AI frozen, fixed
// cameras, exact positions. Sets document.title='READY' when the frame is set.
import * as THREE from 'three';
import { G } from './state.js';
import { makeCar } from './vehicles.js';
import { currentMission, updateMissions } from './missions.js';

function hideMenu() {
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('end-screen').classList.add('hidden');
}

function placeCruiser(x, z, yaw, speed) {
  const car = makeCar(0, true);
  car.pos.set(x, 0, z);
  car.yaw = yaw;
  car.speed = speed || 0;
  car.group.position.copy(car.pos);
  car.group.rotation.y = yaw;
  G.policeCars.push(car);
  return car;
}

function placeCop(x, z) {
  // Reuse the police module's spawn by faking a wanted state is overkill;
  // build a cop directly here for the shot.
  const group = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1a3a6b });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.34), navy);
  body.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
  head.position.y = 1.8;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 10), navy);
  hat.position.y = 1.98;
  group.add(body, head, hat);
  group.position.set(x, 0, z);
  G.scene.add(group);
  const cop = { group, pos: new THREE.Vector3(x, 0, z), hp: 3, dead: false, deadAt: 0, legL: { rotation: {} }, legR: { rotation: {} }, phase: 0 };
  G.cops.push(cop);
  return cop;
}

function setCam(x, y, z, lx, ly, lz) {
  G.camera.position.set(x, y, z);
  G.camera.lookAt(lx, ly, lz);
}

export function setupShot(n) {
  G.shotMode = n;
  G.state = 'playing';
  hideMenu();
  const p = G.player;
  // Clear roaming police/cops so the scene is exact.
  for (const c of G.policeCars) G.scene.remove(c.group);
  G.policeCars = [];
  for (const c of G.cops) G.scene.remove(c.group);
  G.cops = [];

  if (n === 1) {
    // COVER: chase. Jax driving a red car down Marina Row, two cruisers
    // behind, 3 stars, mission 4 on the HUD.
    const car = makeCar(0xc0392b);
    car.pos.set(-40, 0, 24); car.yaw = Math.PI / 2; car.speed = 14;
    car.group.position.copy(car.pos); car.group.rotation.y = car.yaw;
    p.inCar = true; p.car = car;
    G.parked = G.parked.filter((c) => c !== car);
    placeCruiser(-49, 20.5, Math.PI / 2, 14);
    placeCruiser(-52, 27.5, Math.PI / 2, 13);
    G.wanted = 3; G.money = 2100; G.missionIndex = 3;
    updateMissions(0);
    setCam(-40 - 15, 4.6, 24 + 4.5, -40 + 14, 1.2, 24);
  } else if (n === 2) {
    // On-foot shootout by the plaza: pistol out, cruiser closing in, a foot
    // cop nearby, pedestrians fleeing, 2 stars.
    p.pos.set(24, 0, 40); p.yaw = Math.PI; p.weapon = 'pistol'; p.ammo = 11;
    p.group.position.copy(p.pos); p.group.rotation.y = p.yaw;
    placeCruiser(24, 22, Math.PI, 8);
    placeCop(28, 30);
    const fleeSpots = [[18, 28], [32, 34], [20, 36], [14, 44]];
    G.peds.slice(0, 4).forEach((ped, i) => {
      ped.pos.set(fleeSpots[i][0], 0, fleeSpots[i][1]);
      ped.group.position.copy(ped.pos);
      ped.fleeUntil = G.time + 10;
    });
    G.wanted = 2; G.money = 900; G.missionIndex = 1;
    updateMissions(0);
    setCam(24 + 4.5, 2.6, 40 + 7.5, 24, 1.4, 14);
  } else if (n === 3) {
    // Mission delivery: blue car at the warehouse beacon, 1 star.
    const car = makeCar(0x2e6fb0);
    car.pos.set(168, 0, 132); car.yaw = 0; car.speed = 0;
    car.group.position.copy(car.pos); car.group.rotation.y = car.yaw;
    p.inCar = true; p.car = car;
    G.wanted = 1; G.money = 1400; G.missionIndex = 3;
    updateMissions(0);
    setCam(150, 5, 120, 185, 3, 146);
  } else {
    // Wide city view from the plaza: towers, palms, fountain, HUD, 0 stars.
    p.pos.set(0, 0, 12); p.yaw = Math.PI;
    p.group.position.copy(p.pos); p.group.rotation.y = p.yaw;
    G.wanted = 0; G.money = 500; G.missionIndex = 0;
    updateMissions(0);
    setCam(-14, 26, 52, 10, 6, -40);
  }
  if (G.hud) G.hud.update();
  G.renderer.render(G.scene, G.camera);
  document.title = 'READY';
}
