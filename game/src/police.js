// Wanted level and police: cruisers chase and ram, foot cops chase and arrest.
// Wanted rises on crimes and decays when the player lays low out of sight.
import * as THREE from 'three';
import { G } from './state.js';
import { makeCar, driveCar } from './vehicles.js';
import { makeRng } from './rng.js';
import { collideCircle } from './world.js';

export function addWanted(n) {
  G.wanted = Math.max(0, Math.min(5, G.wanted + n));
  G.crimeAt = G.time;
  G.decayAt = G.time + 25;
}

export function commitCrime() { G.crimeAt = G.time; G.decayAt = G.time + 25; }

export function initPolice() {
  G.policeCars = [];
  G.cops = [];
  G.arrestTimer = 0;
}

function spawnCruiser() {
  const car = makeCar(0, true);
  const a = Math.random() * Math.PI * 2;
  const p = G.player.inCar ? G.player.car.pos : G.player.pos;
  car.pos.set(p.x + Math.cos(a) * 70, 0, p.z + Math.sin(a) * 70);
  car.pos.x = Math.max(-210, Math.min(210, car.pos.x));
  car.pos.z = Math.max(-210, Math.min(210, car.pos.z));
  car.speed = 12;
  car.group.position.copy(car.pos);
  G.policeCars.push(car);
  return car;
}

function spawnCop() {
  const group = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1a3a6b });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.34), navy);
  body.position.y = 1.15; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
  head.position.y = 1.8;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 10), navy);
  hat.position.y = 1.98;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.24), navy);
  legL.position.set(-0.16, 0.38, 0);
  const legR = legL.clone(); legR.position.x = 0.16;
  group.add(body, head, hat, legL, legR);
  G.scene.add(group);
  const p = G.player.inCar ? G.player.car.pos : G.player.pos;
  const a = Math.random() * Math.PI * 2;
  const cop = {
    group, legL, legR,
    pos: new THREE.Vector3(p.x + Math.cos(a) * 22, 0, p.z + Math.sin(a) * 22),
    hp: 3, phase: 0, dead: false, deadAt: 0,
  };
  cop.group.position.copy(cop.pos);
  G.cops.push(cop);
  return cop;
}

export function updatePolice(dt) {
  const p = G.player;
  const pPos = p.inCar ? p.car.pos : p.pos;
  // Wanted decay: 25 s quiet, then -1 every 10 s while no cop is close.
  if (G.wanted > 0 && G.time > G.decayAt) {
    let near = false;
    for (const c of G.policeCars) if (c.pos.distanceTo(pPos) < 35) { near = true; break; }
    if (!near) { G.wanted--; G.decayAt = G.time + 10; }
  }
  if (G.wanted === 0) {
    // Stand down: cruisers drive off, cops walk away.
    for (const c of G.policeCars) { G.scene.remove(c.group); }
    G.policeCars = [];
    for (const c of G.cops) if (!c.dead) { G.scene.remove(c.group); }
    G.cops = G.cops.filter((c) => c.dead);
    G.arrestTimer = 0;
    return;
  }
  // Cruisers: one per wanted star, up to 3.
  const wantCruisers = Math.min(3, G.wanted);
  while (G.policeCars.length < wantCruisers) spawnCruiser();
  // Foot cops from 2 stars up.
  const wantCops = G.wanted >= 2 ? Math.min(2, G.wanted - 1) : 0;
  const aliveCops = G.cops.filter((c) => !c.dead).length;
  if (aliveCops < wantCops) spawnCop();

  for (const car of G.policeCars) {
    // Steer toward the player, ram on contact.
    const dx = pPos.x - car.pos.x, dz = pPos.z - car.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    const wantYaw = Math.atan2(dx, dz);
    let dy = wantYaw - car.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    car.yaw += Math.max(-1.6 * dt, Math.min(1.6 * dt, dy));
    car.speed += ((dist > 8 ? 24 : 14) - car.speed) * Math.min(1, dt * 1.2);
    car.pos.x += Math.sin(car.yaw) * car.speed * dt;
    car.pos.z += Math.cos(car.yaw) * car.speed * dt;
    collideCircle(car.pos, 1.6);
    if (dist < 3.4) {
      // Ram: shove the player car, damage the player on foot.
      if (p.inCar) {
        p.car.pos.x += (dx / dist) * 2.4;
        p.car.pos.z += (dz / dist) * 2.4;
        p.car.speed *= 0.6;
        if (G.audio) G.audio.crash();
      } else if (G.time - (car.lastHit || 0) > 1) {
        car.lastHit = G.time;
        p.hp = Math.max(0, p.hp - 12);
        if (G.hud) G.hud.damageFlash();
      }
      car.speed *= 0.5;
    }
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.yaw;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.2;
    if (car.barL) {
      const on = Math.floor(G.time * 6) % 2 === 0;
      car.barL.visible = on; car.barR.visible = !on;
    }
  }

  // Foot cops chase on foot; arrest on 1.6 s of contact.
  let touching = false;
  for (const cop of G.cops) {
    if (cop.dead) {
      if (G.time - cop.deadAt > 8) { G.scene.remove(cop.group); }
      continue;
    }
    const dx = pPos.x - cop.pos.x, dz = pPos.z - cop.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    cop.pos.x += (dx / dist) * 5.2 * dt;
    cop.pos.z += (dz / dist) * 5.2 * dt;
    collideCircle(cop.pos, 0.5);
    cop.group.position.copy(cop.pos);
    cop.group.rotation.y = Math.atan2(dx, dz);
    cop.phase += dt * 10;
    const swing = Math.sin(cop.phase) * 0.6;
    cop.legL.rotation.x = swing; cop.legR.rotation.x = -swing;
    if (dist < 1.6 && !p.inCar) touching = true;
  }
  G.cops = G.cops.filter((c) => !c.dead || G.time - c.deadAt <= 8);
  if (touching) {
    G.arrestTimer += dt;
    if (G.arrestTimer > 1.6) { G.state = 'busted'; }
  } else G.arrestTimer = Math.max(0, G.arrestTimer - dt * 2);
}
