// Combat: pistol raycast with muzzle flash and tracer, reload, melee punch.
import * as THREE from 'three';
import { G } from './state.js';
import { addWanted, commitCrime } from './police.js';
import { pedsFleeFrom } from './traffic.js';

let flash = null;
let tracer = null;
let tracerUntil = 0;

export function initCombat() {
  flash = new THREE.PointLight(0xffc860, 0, 14);
  G.scene.add(flash);
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3(),
  ]);
  tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true }));
  tracer.visible = false;
  G.scene.add(tracer);
}

export function shoot() {
  const p = G.player;
  if (p.weapon !== 'pistol' || p.ammo <= 0 || G.state !== 'playing') return;
  p.ammo--;
  if (G.audio) G.audio.gunshot();
  const cam = G.camera;
  const origin = new THREE.Vector3();
  cam.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const ray = new THREE.Raycaster(origin, dir, 0.1, 90);
  const targets = [];
  for (const cop of G.cops) if (!cop.dead) targets.push({ obj: cop.group, kind: 'cop', ref: cop });
  for (const ped of G.peds) targets.push({ obj: ped.group, kind: 'ped', ref: ped });
  for (const car of [...G.traffic, ...G.parked, ...G.policeCars]) targets.push({ obj: car.group, kind: 'car', ref: car });
  const hits = ray.intersectObjects(targets.map((t) => t.obj), true);
  let end = origin.clone().addScaledVector(dir, 60);
  if (hits.length > 0) {
    end = hits[0].point;
    let node = hits[0].object;
    while (node && node.parent && !targets.some((t) => t.obj === node)) node = node.parent;
    const hit = targets.find((t) => t.obj === node);
    if (hit) {
      if (hit.kind === 'cop') {
        hit.ref.hp -= 1;
        if (hit.ref.hp <= 0 && !hit.ref.dead) {
          hit.ref.dead = true; hit.ref.deadAt = G.time;
          hit.ref.group.rotation.x = Math.PI / 2;
          hit.ref.group.position.y = 0.4;
          addWanted(1);
          if (G.hud) G.hud.toast('Cop down — wanted up');
        }
      } else if (hit.kind === 'ped') {
        addWanted(1);
        if (G.hud) G.hud.toast('You shot a civilian — wanted up');
      } else {
        if (G.audio) G.audio.crash();
      }
    }
  }
  commitCrime();
  pedsFleeFrom(p.inCar ? p.car.pos : p.pos);
  // Muzzle flash at the gun, tracer to the hit point.
  const gunPos = p.inCar ? p.car.pos.clone().setY(1.4) : p.pos.clone().setY(1.5);
  flash.position.copy(gunPos);
  flash.intensity = 90;
  setTimeout(() => { flash.intensity = 0; }, 60);
  tracer.geometry.setFromPoints([gunPos, end]);
  tracer.visible = true;
  tracer.material.opacity = 1;
  tracerUntil = G.time + 0.09;
  if (G.effects) G.effects.sparks(end);
}

export function punch() {
  const p = G.player;
  if (p.weapon !== 'melee' || G.state !== 'playing') return;
  if (G.audio) G.audio.punch();
  const pPos = p.pos;
  for (const cop of G.cops) {
    if (cop.dead) continue;
    if (cop.pos.distanceTo(pPos) < 2.2) {
      cop.hp -= 1;
      if (cop.hp <= 0) {
        cop.dead = true; cop.deadAt = G.time;
        cop.group.rotation.x = Math.PI / 2;
        cop.group.position.y = 0.4;
        addWanted(1);
      }
    }
  }
  commitCrime();
}

export function updateCombat(dt) {
  if (tracer.visible && G.time > tracerUntil) tracer.visible = false;
  if (G.player.ammo === 0 && !G.player.reloading) {
    G.player.reloading = true;
    setTimeout(() => { G.player.ammo = 12; G.player.reloading = false; }, 1200);
  }
}

export function reloadNow() {
  if (G.player.ammo < 12 && !G.player.reloading) {
    G.player.reloading = true;
    setTimeout(() => { G.player.ammo = 12; G.player.reloading = false; }, 1200);
  }
}
