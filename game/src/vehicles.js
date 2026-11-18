// Cars: a boxy car factory (paint, glass, wheels, lights, police light bar)
// plus arcade drive physics with building collision.
import * as THREE from 'three';
import { G } from './state.js';
import { collideCircle } from './world.js';
import { makeRng, pick } from './rng.js';

const PAINTS = [0xc0392b, 0x2e6fb0, 0xf0c419, 0x7f8c8d, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1];

export function makeCar(color, isPolice = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0xf2f3f4 : color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.2), paint);
  body.position.y = 0.62; body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 2.1), glass);
  cabin.position.set(0, 1.18, -0.25); cabin.castShadow = true;
  group.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    group.add(w); wheels.push(w);
  }
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff6c8 });
  for (const hx of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), lightMat);
    hl.position.set(hx, 0.68, 2.11);
    group.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xc0392b }));
    tl.position.set(hx, 0.68, -2.11);
    group.add(tl);
  }
  let barL = null, barR = null;
  if (isPolice) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.3, 1.4),
      new THREE.MeshLambertMaterial({ color: 0x1a3a6b }));
    door.position.set(0, 0.62, 0.2);
    group.add(door);
    barL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000 }));
    barL.position.set(-0.45, 1.55, -0.25);
    barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x0044ff, emissive: 0x0044ff }));
    barR.position.set(0.45, 1.55, -0.25);
    group.add(barL, barR);
  }
  G.scene.add(group);
  return {
    group, wheels, barL, barR, isPolice,
    pos: new THREE.Vector3(), yaw: 0, speed: 0, steer: 0,
    color, driver: null, hp: 3,
  };
}

// Arcade driving: W/S accelerate and brake/reverse, A/D steer.
export function driveCar(car, dt, input) {
  const maxF = 26, maxR = 10, accel = 16, brake = 26;
  if (input.up) car.speed += accel * dt;
  else if (input.down) car.speed -= (car.speed > 0.5 ? brake : accel * 0.6) * dt;
  else car.speed *= Math.max(0, 1 - 1.4 * dt);
  car.speed = Math.max(-maxR, Math.min(maxF, car.speed));
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  const turn = car.steer * 0.55 * dt * Math.min(1, Math.abs(car.speed) / 8) * Math.sign(car.speed);
  car.yaw += turn;
  const nx = car.pos.x + Math.sin(car.yaw) * car.speed * dt;
  const nz = car.pos.z + Math.cos(car.yaw) * car.speed * dt;
  const before = { x: car.pos.x, z: car.pos.z };
  car.pos.x = nx; car.pos.z = nz;
  collideCircle(car.pos, 1.6);
  if (Math.abs(car.pos.x - nx) > 0.01 || Math.abs(car.pos.z - nz) > 0.01) {
    // Hit a building: kill most of the speed, keep the slide.
    if (Math.abs(car.speed) > 6 && G.audio) G.audio.crash();
    car.speed *= 0.35;
  }
  car.group.position.copy(car.pos);
  car.group.rotation.y = car.yaw;
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.2;
  if (car.barL) {
    const on = Math.floor(G.time * 6) % 2 === 0;
    car.barL.visible = on; car.barR.visible = !on;
  }
}

// Parked stealable cars scattered near roads.
export function spawnParkedCars() {
  const rng = makeRng(77);
  G.parked = [];
  const spots = [
    [-168, -60], [-120, 30], [-24, -144], [24, 96], [72, -24], [120, 144],
    [168, -96], [-72, 168], [24, -168], [-144, 120], [96, 24], [216, 60],
  ];
  for (const [x, z] of spots) {
    const car = makeCar(pick(rng, PAINTS));
    car.pos.set(x + (rng() < 0.5 ? 3.4 : -3.4), 0, z);
    car.yaw = rng() < 0.5 ? 0 : Math.PI;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.yaw;
    G.parked.push(car);
  }
}
