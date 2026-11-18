// Traffic: AI cars cruising the road grid (turning at intersections, slowing
// for the car ahead) and pedestrians walking the sidewalks, fleeing gunfire.
import * as THREE from 'three';
import { G } from './state.js';
import { makeRng, range, pick } from './rng.js';
import { roadLines, HALF } from './world.js';
import { makeCar, driveCar } from './vehicles.js';

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // +x, +z, -x, -z

// Right-hand lane offset for a heading: facing +x -> z - 3, +z -> x - 3, etc.
function laneOffset(dir) {
  return dir === 0 ? { x: 0, z: -3 } : dir === 1 ? { x: -3, z: 0 }
    : dir === 2 ? { x: 0, z: 3 } : { x: 3, z: 0 };
}

export function initTraffic() {
  const rng = makeRng(4242);
  G.traffic = [];
  for (let i = 0; i < 14; i++) {
    const car = makeCar(pick(rng, [0xc0392b, 0x2e6fb0, 0xf0c419, 0x7f8c8d, 0x27ae60, 0x8e44ad]));
    const dir = Math.floor(rng() * 4);
    const line = pick(rng, roadLines.slice(1, 9));
    const along = range(rng, -180, 180);
    const off = laneOffset(dir);
    car.pos.set(dir % 2 === 0 ? along : line + off.x, 0, dir % 2 === 0 ? line + off.z : along);
    car.yaw = dir === 0 ? Math.PI / 2 : dir === 1 ? 0 : dir === 2 ? -Math.PI / 2 : Math.PI;
    car.speed = range(rng, 7, 11);
    car.road = line; car.dir = dir;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.yaw;
    G.traffic.push(car);
  }
  G.peds = [];
  const shirtCols = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1, 0x1abc9c];
  for (let i = 0; i < 22; i++) {
    const ped = makePed(pick(rng, shirtCols));
    ped.pos.set(range(rng, -200, 200), 0, range(rng, -200, 200));
    ped.target = randomSidewalk(rng);
    ped.speed = range(rng, 1.0, 1.6);
    ped.fleeUntil = 0;
    G.peds.push(ped);
  }
}

function makePed(shirtColor) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a2d34 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.3), shirt);
  body.position.y = 1.1; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.y = 1.72;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pants);
  legL.position.set(-0.15, 0.35, 0);
  const legR = legL.clone(); legR.position.x = 0.15;
  group.add(body, head, legL, legR);
  G.scene.add(group);
  return { group, legL, legR, pos: new THREE.Vector3(), target: new THREE.Vector3(), speed: 1.2, fleeUntil: 0, phase: Math.random() * 6 };
}

function randomSidewalk(rng) {
  // Sidewalks run alongside roads: pick a road line, offset 9, random along.
  const line = pick(rng, roadLines);
  const along = range(rng, -200, 200);
  if (rng() < 0.5) return new THREE.Vector3(along, 0, line + (rng() < 0.5 ? 9 : -9));
  return new THREE.Vector3(line + (rng() < 0.5 ? 9 : -9), 0, along);
}

export function updateTraffic(dt) {
  for (const car of G.traffic) {
    // Slow for the car ahead on the same road and direction.
    let target = 9;
    for (const other of G.traffic) {
      if (other === car || other.dir !== car.dir || other.road !== car.road) continue;
      const d = DIRS[car.dir];
      const ahead = (other.pos.x - car.pos.x) * d[0] + (other.pos.z - car.pos.z) * d[1];
      if (ahead > 0 && ahead < 16) { target = 3; break; }
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
    const d = DIRS[car.dir];
    car.pos.x += d[0] * car.speed * dt;
    car.pos.z += d[1] * car.speed * dt;
    // At an intersection, sometimes turn onto the crossing road.
    const along = car.dir % 2 === 0 ? car.pos.x : car.pos.z;
    const nearLine = roadLines.find((L) => Math.abs(along - L) < 1.2);
    if (nearLine !== undefined && Math.random() < 0.006) {
      const turnLeft = Math.random() < 0.5;
      const newDir = (car.dir + (turnLeft ? 3 : 1)) % 4;
      const off = laneOffset(newDir);
      const cross = car.dir % 2 === 0 ? car.pos.z : car.pos.x;
      car.dir = newDir; car.road = nearLine;
      car.pos.x = newDir % 2 === 0 ? car.pos.x : nearLine + off.x;
      car.pos.z = newDir % 2 === 0 ? nearLine + off.z : car.pos.z;
      car.yaw = newDir === 0 ? Math.PI / 2 : newDir === 1 ? 0 : newDir === 2 ? -Math.PI / 2 : Math.PI;
    }
    // At the city edge, turn around.
    if (car.pos.x > HALF - 4 || car.pos.x < -HALF + 4 || car.pos.z > HALF - 4 || car.pos.z < -HALF + 4) {
      car.dir = (car.dir + 2) % 4;
      car.yaw += Math.PI;
    }
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.yaw;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.2;
  }
  for (const ped of G.peds) {
    const fleeing = G.time < ped.fleeUntil;
    const speed = fleeing ? 4.2 : ped.speed;
    const to = new THREE.Vector3().subVectors(ped.target, ped.pos);
    to.y = 0;
    if (to.length() < 1.5) {
      ped.target = randomSidewalk(makeRng((Math.random() * 1e9) | 0));
      continue;
    }
    to.normalize();
    ped.pos.addScaledVector(to, speed * dt);
    ped.pos.x = Math.max(-210, Math.min(210, ped.pos.x));
    ped.pos.z = Math.max(-210, Math.min(210, ped.pos.z));
    ped.group.position.copy(ped.pos);
    ped.group.rotation.y = Math.atan2(to.x, to.z);
    ped.phase += dt * speed * 2.4;
    const swing = Math.sin(ped.phase) * 0.5;
    ped.legL.rotation.x = swing; ped.legR.rotation.x = -swing;
  }
}

export function pedsFleeFrom(pos) {
  for (const ped of G.peds) {
    if (ped.pos.distanceTo(pos) < 30) {
      ped.fleeUntil = G.time + 3;
      const away = new THREE.Vector3().subVectors(ped.pos, pos).setY(0).normalize();
      ped.target.copy(ped.pos).addScaledVector(away, 40);
    }
  }
}
