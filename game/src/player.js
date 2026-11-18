// Jax Marlowe on foot: third-person WASD movement relative to the camera,
// mouse-orbit camera, simple walk animation, building collision.
import * as THREE from 'three';
import { G } from './state.js';
import { collideCircle } from './world.js';

export function createPlayer() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2e6fb0 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a2d34 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.34), shirt);
  body.position.y = 1.15; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
  head.position.y = 1.82; head.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.28, 0.12, 12),
    new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  cap.position.y = 2.0;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), pants);
  legL.position.set(-0.17, 0.38, 0);
  const legR = legL.clone(); legR.position.x = 0.17;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), shirt);
  armL.position.set(-0.44, 1.15, 0);
  const armR = armL.clone(); armR.position.x = 0.44;
  group.add(body, head, cap, legL, legR, armL, armR);
  G.scene.add(group);
  const player = {
    group, legL, legR, armL, armR,
    pos: new THREE.Vector3(0, 0, 24),
    yaw: 0, speed: 0, hp: 100, walkPhase: 0,
    inCar: false, car: null, ammo: 12, weapon: 'pistol',
  };
  G.player = player;
  return player;
}

export function updatePlayer(dt) {
  const p = G.player;
  if (p.inCar || G.state !== 'playing') return;
  const k = G.keys;
  let fx = 0, fz = 0;
  if (k['KeyW']) fz -= 1;
  if (k['KeyS']) fz += 1;
  if (k['KeyA']) fx -= 1;
  if (k['KeyD']) fx += 1;
  const len = Math.hypot(fx, fz);
  p.speed = 0;
  if (len > 0) {
    fx /= len; fz /= len;
    const cy = G.camYaw;
    const sin = Math.sin(cy), cos = Math.cos(cy);
    const wx = fx * cos - fz * sin;
    const wz = fx * sin + fz * cos;
    const sp = k['ShiftLeft'] ? 9 : 6;
    p.pos.x += wx * sp * dt;
    p.pos.z += wz * sp * dt;
    p.speed = sp;
    p.yaw = Math.atan2(wx, wz);
    p.walkPhase += dt * sp * 1.6;
  }
  collideCircle(p.pos, 0.6);
  p.group.position.copy(p.pos);
  p.group.rotation.y = p.yaw;
  const swing = Math.sin(p.walkPhase) * (p.speed > 0 ? 0.55 : 0);
  p.legL.rotation.x = swing; p.legR.rotation.x = -swing;
  p.armL.rotation.x = -swing * 0.8; p.armR.rotation.x = swing * 0.8;
}
