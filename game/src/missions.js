// Story and missions. Jax Marlowe owes loan shark Sal Bianchi $5,000.
// Five missions pay it off; each has a street-side beacon marker and a payout.
import * as THREE from 'three';
import { G } from './state.js';
import { addWanted } from './police.js';

const MISSIONS = [
  {
    name: '1. The Pickup', pay: 400,
    text: 'Pick up the package at the docks',
    marker: { x: -168, z: -168 },
  },
  {
    name: '2. Hot Wheels', pay: 900,
    text: 'Steal a car and deliver it to the garage on Marina Row',
    marker: { x: 120, z: -144 },
    needsCar: true,
  },
  {
    name: '3. Lose the Tail', pay: 800,
    text: 'Get 2 stars, then lose the cops completely',
    tail: true,
  },
  {
    name: '4. The Drop', pay: 1400,
    text: 'Drop the crate at the big warehouse',
    marker: { x: 168, z: 144 },
  },
  {
    name: '5. The Payday', pay: 1500,
    text: 'Meet Sal at the plaza fountain and pay the debt',
    marker: { x: 24, z: 0 },
  },
];

let beacon = null;
let beaconLight = null;

export function initMissions() {
  G.missions = MISSIONS;
  G.missionIndex = 0;
  G.missionDone = false;
  G.hadTwoStars = false;
  beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.75 })
  );
  beacon.position.y = 0.5;
  G.scene.add(beacon);
  beaconLight = new THREE.PointLight(0xffd23e, 60, 40);
  beaconLight.position.y = 6;
  G.scene.add(beaconLight);
}

export function currentMission() {
  return G.missions[Math.min(G.missionIndex, G.missions.length - 1)];
}

export function updateMissions(dt) {
  if (G.missionDone || G.state !== 'playing') return;
  const m = currentMission();
  const pPos = G.player.inCar ? G.player.car.pos : G.player.pos;
  if (m.marker) {
    beacon.visible = true;
    beacon.position.x = m.marker.x;
    beacon.position.z = m.marker.z;
    beaconLight.position.x = m.marker.x;
    beaconLight.position.z = m.marker.z;
    beacon.material.opacity = 0.55 + Math.sin(G.time * 4) * 0.25;
    beacon.rotation.y += dt;
    const dx = pPos.x - m.marker.x, dz = pPos.z - m.marker.z;
    const ok = Math.hypot(dx, dz) < 7 && (!m.needsCar || G.player.inCar);
    if (ok) completeMission(m);
  } else if (m.tail) {
    beacon.visible = false;
    if (G.wanted >= 2) G.hadTwoStars = true;
    if (G.hadTwoStars && G.wanted === 0) completeMission(m);
  }
}

function completeMission(m) {
  G.money += m.pay;
  if (G.hud) G.hud.toast(`${m.name} complete — +$${m.pay}`);
  if (G.audio) G.audio.pickup();
  G.missionIndex++;
  G.hadTwoStars = false;
  if (G.missionIndex >= G.missions.length) {
    G.missionDone = true;
    G.state = 'win';
    if (G.hud) G.hud.showWin();
  }
  if (G.save) G.save();
}
