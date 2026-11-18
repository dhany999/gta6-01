// Pooled particles: driving dust, damage smoke, muzzle sparks.
import * as THREE from 'three';
import { G } from './state.js';

const MAX = 240;
let points = null;
let posAttr = null;
let life = null;
let vel = null;
let cursor = 0;

export function initEffects() {
  const geo = new THREE.BufferGeometry();
  posAttr = new Float32Array(MAX * 3);
  life = new Float32Array(MAX);
  vel = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xd8cdb8, size: 0.7, transparent: true, opacity: 0.85, sizeAttenuation: true,
  });
  points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  G.scene.add(points);
  G.effects = {
    dust(pos) { spawn(pos, 3, 0.4, 1.2, 1.6); },
    smoke(pos) { spawn(pos, 2, 0.5, 0.8, 3); },
    sparks(pos) { spawn(pos, 6, 0.25, 3, 0.5); },
  };
}

function spawn(pos, n, spread, up, ttl) {
  for (let i = 0; i < n; i++) {
    const idx = cursor;
    cursor = (cursor + 1) % MAX;
    posAttr[idx * 3] = pos.x + (Math.random() - 0.5) * spread;
    posAttr[idx * 3 + 1] = pos.y + Math.random() * 0.5;
    posAttr[idx * 3 + 2] = pos.z + (Math.random() - 0.5) * spread;
    vel[idx * 3] = (Math.random() - 0.5) * 2;
    vel[idx * 3 + 1] = Math.random() * up;
    vel[idx * 3 + 2] = (Math.random() - 0.5) * 2;
    life[idx] = ttl * (0.6 + Math.random() * 0.6);
  }
}

export function updateEffects(dt) {
  if (!points) return;
  for (let i = 0; i < MAX; i++) {
    if (life[i] <= 0) { posAttr[i * 3 + 1] = -100; continue; }
    life[i] -= dt;
    posAttr[i * 3] += vel[i * 3] * dt;
    posAttr[i * 3 + 1] += vel[i * 3 + 1] * dt;
    posAttr[i * 3 + 2] += vel[i * 3 + 2] * dt;
  }
  points.geometry.attributes.position.needsUpdate = true;
}
