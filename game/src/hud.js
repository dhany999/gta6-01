// HUD: health bar, money, wanted stars, objective, speed, mission list,
// toasts, damage flash, and a live canvas minimap.
import { G } from './state.js';
import { roadLines, HALF } from './world.js';
import { currentMission } from './missions.js';

let els = {};
let mapCtx = null;

export function initHud() {
  els = {
    health: document.getElementById('health-fill'),
    money: document.getElementById('money'),
    stars: document.getElementById('stars'),
    objective: document.getElementById('objective'),
    speed: document.getElementById('speed'),
    missions: document.getElementById('mission-list'),
    toasts: document.getElementById('toasts'),
    flash: document.getElementById('damage-flash'),
    ammo: document.getElementById('ammo'),
    menu: document.getElementById('menu'),
    end: document.getElementById('end-screen'),
    endTitle: document.getElementById('end-title'),
    endText: document.getElementById('end-text'),
  };
  const map = document.getElementById('minimap');
  mapCtx = map.getContext('2d');
  G.hud = {
    toast, damageFlash, showWin, showBusted, showWasted, update: updateHud,
  };
}

export function toast(msg) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  els.toasts.appendChild(div);
  setTimeout(() => div.remove(), 3600);
}

export function damageFlash() {
  els.flash.style.opacity = '0.45';
  setTimeout(() => { els.flash.style.opacity = '0'; }, 180);
}

export function showWin() {
  els.endTitle.textContent = 'DEBT PAID';
  els.endText.textContent = `Jax paid Sal Bianchi $5,000. Solmar Bay is yours — $${G.money} in the pocket.`;
  els.end.classList.remove('hidden');
}

export function showBusted() {
  els.endTitle.textContent = 'BUSTED';
  els.endText.textContent = `The Solmar Bay PD caught Jax. Bail cost $500.`;
  els.end.classList.remove('hidden');
}

export function showWasted() {
  els.endTitle.textContent = 'WASTED';
  els.endText.textContent = `Jax got taken down. The hospital bill was $500.`;
  els.end.classList.remove('hidden');
}

function updateHud() {
  const p = G.player;
  els.health.style.width = `${Math.max(0, p.hp)}%`;
  els.money.textContent = `$${G.money.toLocaleString('en-US')}`;
  els.stars.textContent = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
  els.stars.style.color = G.wanted > 0 ? '#ffcf3e' : '#cfd6dd';
  const m = currentMission();
  els.objective.textContent = G.missionDone ? 'Debt paid — Solmar Bay is yours' : m.text;
  const speed = p.inCar && p.car ? Math.abs(p.car.speed) * 3.6 : Math.abs(p.speed) * 3.6;
  els.speed.textContent = `${Math.round(speed)} km/h`;
  els.ammo.textContent = p.weapon === 'pistol'
    ? (p.reloading ? 'RELOADING…' : `AMMO ${p.ammo}/12`)
    : 'MELEE — FISTS';
  let list = '';
  G.missions.forEach((mi, i) => {
    const done = i < G.missionIndex;
    const cur = i === G.missionIndex && !G.missionDone;
    list += `<div class="mi${done ? ' done' : ''}${cur ? ' cur' : ''}">${done ? '✓ ' : ''}${mi.name} — $${mi.pay}</div>`;
  });
  els.missions.innerHTML = list;
  drawMinimap();
}

function drawMinimap() {
  const ctx = mapCtx;
  const S = 150, R = HALF + 16;
  const toMap = (v) => ((v + R) / (2 * R)) * S;
  ctx.fillStyle = '#14181d';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#4a4f55';
  ctx.lineWidth = 3;
  for (const L of roadLines) {
    ctx.beginPath(); ctx.moveTo(toMap(L), toMap(-R)); ctx.lineTo(toMap(L), toMap(R)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toMap(-R), toMap(L)); ctx.lineTo(toMap(R), toMap(L)); ctx.stroke();
  }
  // Sea
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(0, toMap(HALF + 24) - 8, S, S - toMap(HALF + 24) + 8);
  // Mission marker (pulsing)
  const m = currentMission();
  if (m.marker && !G.missionDone) {
    const r = 5 + Math.sin(G.time * 5) * 2;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(toMap(m.marker.x), toMap(m.marker.z), r, 0, Math.PI * 2); ctx.fill();
  }
  const dot = (x, z, color, r = 2.5) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(toMap(x), toMap(z), r, 0, Math.PI * 2); ctx.fill();
  };
  for (const car of G.traffic) dot(car.pos.x, car.pos.z, '#9aa3ab', 2);
  for (const ped of G.peds) dot(ped.pos.x, ped.pos.z, '#7ec850', 1.5);
  for (const car of G.policeCars) dot(car.pos.x, car.pos.z, '#3a86ff', 3);
  for (const cop of G.cops) if (!cop.dead) dot(cop.pos.x, cop.pos.z, '#3a86ff', 2);
  const p = G.player;
  const pp = p.inCar ? p.car.pos : p.pos;
  // Player arrow
  const yaw = p.inCar ? p.car.yaw : p.yaw;
  ctx.save();
  ctx.translate(toMap(pp.x), toMap(pp.z));
  ctx.rotate(Math.atan2(Math.sin(yaw), Math.cos(yaw)) * -1 + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
