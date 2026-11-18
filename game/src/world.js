// Solmar Bay: a 9x9-block procedural city on a road grid. Roads run on block
// boundaries, so buildings never overlap a road. Deterministic from seed 1337.
import * as THREE from 'three';
import { G } from './state.js';
import { makeRng, range, pick, chance } from './rng.js';
import { canvasTexture } from './render.js';

export const PITCH = 48, HALF = 216, ROAD_HALF = 6;
export const roadLines = [];
for (let k = 0; k <= 9; k++) roadLines.push(-HALF + k * PITCH);
export const blockCenters = [];
for (let i = 0; i < 9; i++) blockCenters.push(-HALF + PITCH / 2 + i * PITCH);

function windowTexture(base, lit) {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 16) {
      for (let x = 8; x < w - 8; x += 16) {
        ctx.fillStyle = Math.random() < 0.28 ? lit : '#1d2733';
        ctx.fillRect(x, y, 9, 11);
      }
    }
  });
}

export function buildWorld() {
  const rng = makeRng(1337);
  const scene = G.scene;
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  // Ground: one big canvas texture with asphalt, road bands, lane dashes,
  // sidewalk blocks, beach and sea painted in. World -280..280 maps to 0..1024.
  const groundTex = canvasTexture(1024, 1024, (ctx, w, h) => {
    const toPx = (v) => ((v + 280) / 560) * w;
    ctx.fillStyle = '#55585e'; ctx.fillRect(0, 0, w, h); // asphalt
    // sidewalk blocks
    for (const cx of blockCenters) for (const cz of blockCenters) {
      ctx.fillStyle = '#8d8f92';
      ctx.fillRect(toPx(cx - 24), toPx(cz - 24), toPx(48) - toPx(0), toPx(48) - toPx(0));
      ctx.fillStyle = '#83858a';
      ctx.fillRect(toPx(cx - 21), toPx(cz - 21), toPx(42) - toPx(0), toPx(42) - toPx(0));
    }
    // lane dashes on every road line
    ctx.fillStyle = '#e8e6da';
    for (const L of roadLines) {
      for (let v = -HALF; v < HALF; v += 16) {
        ctx.fillRect(toPx(L) - 1.5, toPx(v), 3, 8);
        ctx.fillRect(toPx(v), toPx(L) - 1.5, 8, 3);
      }
    }
    // beach + sea along the south edge
    ctx.fillStyle = '#d9c48f'; ctx.fillRect(0, toPx(HALF), w, toPx(24) - toPx(0));
    ctx.fillStyle = '#2f7fb8'; ctx.fillRect(0, toPx(HALF + 24), w, h - toPx(HALF + 24));
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ map: groundTex })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Building window textures (a few palettes, reused).
  const winTexes = [
    windowTexture('#7d8aa0', '#ffd98a'),
    windowTexture('#8a7d6b', '#ffe9b0'),
    windowTexture('#6b7d8a', '#cfe8ff'),
    windowTexture('#9a8a7d', '#ffd98a'),
  ];
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5d63 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function tower(x, z, w, d, hgt, tex) {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: tex }));
    m.scale.set(w, hgt, d);
    m.position.set(x, hgt / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    const roof = new THREE.Mesh(boxGeo, roofMat);
    roof.scale.set(w + 0.6, 0.8, d + 0.6);
    roof.position.set(x, hgt + 0.4, z);
    group.add(roof);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  const palmTrunk = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const palmLeaf = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  function palm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), palmTrunk);
    trunk.position.set(x, 2.5, z); trunk.castShadow = true;
    group.add(trunk);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 4), palmLeaf);
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 1.1, 5.4, z + Math.sin(a) * 1.1);
      leaf.rotation.z = Math.cos(a) * 0.9; leaf.rotation.x = -Math.sin(a) * 0.9;
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  function park(cx, cz) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(44, 0.4, 44),
      new THREE.MeshLambertMaterial({ color: 0x4d9e57 }));
    lawn.position.set(cx, 0.2, cz); lawn.receiveShadow = true;
    group.add(lawn);
    for (let i = 0; i < 6; i++) palm(cx + range(rng, -18, 18), cz + range(rng, -18, 18));
  }

  function shed(cx, cz, w, d, hgt, color) {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
    m.scale.set(w, hgt, d);
    m.position.set(cx, hgt / 2, cz);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    const roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x6e3f2a }));
    roof.scale.set(w + 1, 0.7, d + 1);
    roof.position.set(cx, hgt + 0.35, cz);
    group.add(roof);
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  // Lay out the blocks.
  for (const cx of blockCenters) for (const cz of blockCenters) {
    if (cx === 0 && cz === 0) continue; // plaza, built below
    if ((cx === -192 || cx === -144) && cz === -192) continue; // docks
    if (cx === 192 && cz === 144) continue; // warehouse
    if ((cx === 96 && cz === -96) || (cx === -96 && cz === 96) || (cx === 144 && cz === -144)) { park(cx, cz); continue; }
    const n = 1 + Math.floor(rng() * 2.4); // 1-3 towers per block
    for (let i = 0; i < n; i++) {
      const ox = range(rng, -11, 11), oz = range(rng, -11, 11);
      const w = range(rng, 13, 24), d = range(rng, 13, 24);
      const hgt = range(rng, 12, 62);
      tower(cx + ox, cz + oz, w, d, hgt, pick(rng, winTexes));
    }
  }

  // Plaza at the centre block: fountain + palms + benches.
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(44, 0.4, 44),
    new THREE.MeshLambertMaterial({ color: 0xb8a888 }));
  plaza.position.set(0, 0.2, 0); plaza.receiveShadow = true;
  group.add(plaza);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.6, 1.1, 20),
    new THREE.MeshLambertMaterial({ color: 0x9a938a }));
  basin.position.set(0, 0.55, 0); basin.castShadow = true;
  group.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.3, 20),
    new THREE.MeshLambertMaterial({ color: 0x4fa8d8, emissive: 0x0a2a44 }));
  water.position.set(0, 0.9, 0);
  group.add(water);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 3.4, 10),
    new THREE.MeshLambertMaterial({ color: 0xcfc8ba }));
  column.position.set(0, 2.2, 0); column.castShadow = true;
  group.add(column);
  for (const [px, pz] of [[-16, -16], [16, -16], [-16, 16], [16, 16], [0, -18], [0, 18]]) palm(px, pz);

  // Docks (south-west blocks): warehouse sheds + crates + a pier.
  shed(-192, -192, 30, 20, 9, 0x8a6f4d);
  shed(-144, -192, 26, 18, 8, 0x7d6a55);
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xa8824f });
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Mesh(boxGeo, crateMat);
    const s = range(rng, 1.6, 3);
    c.scale.set(s, s, s);
    c.position.set(range(rng, -205, -130), s / 2, range(rng, -208, -176));
    c.rotation.y = rng() * Math.PI;
    c.castShadow = true;
    group.add(c);
  }
  const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 40),
    new THREE.MeshLambertMaterial({ color: 0x6b4f2e }));
  pier.position.set(-168, 0.4, 232); pier.castShadow = true;
  group.add(pier);

  // Big warehouse (mission 4) at block (192, 144).
  shed(192, 144, 34, 24, 11, 0x7d8ea0);

  // Street lamps along the roads.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x3a3d42 });
  const lampHead = new THREE.MeshLambertMaterial({ color: 0xffe9a8 });
  for (const L of roadLines) {
    for (let v = -192; v <= 192; v += 96) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6, 6), lampMat);
      pole.position.set(L + 7, 3, v);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampHead);
      head.position.set(L + 7, 6.1, v);
      group.add(head);
    }
  }

  G.world = {
    colliders,
    plazaPos: { x: 0, z: 0 },
    docksPos: { x: -168, z: -180 },
    warehousePos: { x: 192, z: 144 },
    beachPos: { x: 96, z: 216 },
  };
  return G.world;
}

// Circle vs AABB colliders: push a circle of radius r out of buildings.
export function collideCircle(pos, r) {
  for (const c of G.world.colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * r;
        pos.z = nz + (dz / d) * r;
      } else {
        pos.x += r;
      }
    }
  }
  pos.x = Math.max(-232, Math.min(232, pos.x));
  pos.z = Math.max(-232, Math.min(232, pos.z));
}
