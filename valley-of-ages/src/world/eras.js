import * as THREE from 'three';
import { createKit } from './kit.js';
import { buildBridge } from './bridge.js';
import { PAD, CRAG, FORD, ROAD, groundHeight } from './terrain.js';
import { createPlume, createGlow } from './effects.js';
import { createGrove } from './flora.js';
import { ribbonGeometry, windowTexture, smoothstep } from '../util.js';

const gy = (x, z) => groundHeight(x, z);

/* ---------- shared: the road, which only ever changes surface ---------- */

const ROAD_CURVE = new THREE.CatmullRomCurve3(
  ROAD.map((p) => new THREE.Vector3(p.x, 0, p.z))
);
const ROAD_PTS = ROAD_CURVE.getPoints(88).map((v) => ({ x: v.x, z: v.z }));

function roadY(x, z) {
  const g = groundHeight(x, z);
  const near = 1 - smoothstep(5.5, 10.5, Math.abs(x - FORD.x));
  if (near <= 0) return g;
  return g + (Math.max(g, FORD.deck + 0.02) - g) * near;
}

function buildRoad(kit, width, color) {
  const geo = ribbonGeometry(
    ROAD_PTS,
    (i) => width * (0.6 + 0.4 * Math.sin((i / ROAD_PTS.length) * Math.PI)),
    (i) => roadY(ROAD_PTS[i].x, ROAD_PTS[i].z) + 0.07
  );
  const m = new THREE.Mesh(geo, kit.matFaded(color));
  m.receiveShadow = true;
  m.renderOrder = 2;
  kit.add(m, false, true);
  return m;
}

/** A field patch that follows the terrace rather than floating over it. */
function field(kit, color, x, z, w, d, ry) {
  kit.plate(w, d, color, x, gy(x, z) + 0.06, z, ry);
}

/* ---------- era 1: the camp ---------- */

function mammoth(kit, group, x, z, ry, scale) {
  const g = new THREE.Group();
  g.position.set(x, gy(x, z) - 0.15, z);
  g.rotation.y = ry;
  g.scale.setScalar(scale);
  group.add(g);

  const k = createKit(g);
  const hide = '#6d6154';
  const dark = '#584d42';
  const tusk = '#ded4c1';

  for (const dx of [-1.25, 1.15]) {
    for (const dz of [-0.68, 0.68]) k.cyl(0.25, 0.31, 1.5, 6, dark, dx, 0, dz);
  }

  const body = k.sphere(1, hide, 0, 2.35, 0, { seg: 10, rings: 8 });
  body.scale.set(2.45, 1.5, 1.35);

  const head = k.sphere(1, hide, 2.45, 2.45, 0, { seg: 9, rings: 7 });
  head.scale.set(1.0, 1.12, 0.95);

  k.sphere(0.82, dark, 2.4, 3.55, 0, { seg: 8, rings: 6 });

  const trunk = k.cyl(0.1, 0.3, 1.6, 6, hide, 3.0, 0.95, 0);
  trunk.rotation.z = -0.3;

  for (const dz of [-0.38, 0.38]) {
    const t = k.cyl(0.05, 0.12, 1.3, 5, tusk, 2.95, 1.7, dz);
    t.rotation.z = -1.15;
    t.rotation.y = dz * 0.6;
  }
  return g;
}


function eraCamp(kit, group, updaters) {
  const cx = -32;
  const cz = 2;

  const tents = [
    [-41, -2, 2.4],
    [-35, 10, 2.1],
    [-24, 5, 2.0],
    [-31, -7, 2.3],
    [-43, 7, 1.9],
  ];
  for (const [x, z, r] of tents) {
    const y = gy(x, z);
    kit.cone(r, r * 1.32, 4, '#c6b99f', x, y, z, Math.PI / 4);
    // a dark mouth cut into the hide
    const door = kit.boxC(r * 0.62, r * 0.78, 0.12, '#2e271f', x, y + r * 0.36, z);
    door.rotation.y = Math.atan2(cx - x, cz - z);
  }

  // hearth
  const hx = cx + 1;
  const hz = cz - 1;
  const hy = gy(hx, hz);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    kit.sphere(0.3, '#6b6560', hx + Math.cos(a) * 1.35, hy + 0.16, hz + Math.sin(a) * 1.35, {
      seg: 6,
      rings: 4,
    });
  }
  kit.cone(0.62, 1.15, 5, '#ff8b3d', hx, hy + 0.05, hz, 0, {
    emissive: '#ff6a1e',
    emissiveIntensity: 2.6,
  });

  const fire = new THREE.PointLight('#ff9a4d', 34, 38, 2);
  fire.position.set(hx, hy + 1.2, hz);
  group.add(fire);
  updaters.push((dt, t) => {
    fire.intensity = 30 + Math.sin(t * 8.7) * 5 + Math.sin(t * 15.3) * 3.5;
  });

  const smoke = createPlume({
    origin: new THREE.Vector3(hx, hy + 1.1, hz),
    count: 18,
    spread: 0.7,
    rise: 9,
    drift: 3,
    size: 1.8,
    color: '#9a948a',
    opacity: 0.4,
    speed: 1.4,
  });
  group.add(smoke.object);
  updaters.push((dt, t) => smoke.update(t));

  // bones and a rack of spears
  const bones = [
    [-37.5, -3.4, 0.3],
    [-38.2, -2.6, 1.1],
    [-36.9, -2.1, 2.2],
    [-29.5, 1.4, 0.7],
  ];
  for (const [x, z, r] of bones) {
    const b = kit.cyl(0.09, 0.13, 1.5, 5, '#cfc6b2', x, gy(x, z) + 0.16, z);
    b.rotation.z = Math.PI / 2;
    b.rotation.y = r;
  }
  for (let i = 0; i < 4; i++) {
    const s = kit.cyl(0.05, 0.07, 2.3, 4, '#7a6242', -26.5 + i * 0.32, gy(-26.5, -3), -3.6);
    s.rotation.z = 0.22 + i * 0.03;
    s.rotation.x = -0.16;
  }

  for (const [x, z, s] of [
    [-27, 12, 1.1],
    [-38, 13, 0.9],
    [-20, -2, 0.8],
    [-45, -6, 1.0],
    [-34, 18, 0.85],
  ]) {
    const r = kit.sphere(1.1 * s, '#7f7b72', x, gy(x, z) + 0.4 * s, z, { seg: 5, rings: 3 });
    r.scale.set(1.2, 0.62, 1);
    r.rotation.set(0.3, x * 0.3, 0.2);
  }

  // megafauna on the far ridge
  const herd = [
    [-15, -30, 0.5, 0.95],
    [-23, -40, 0.9, 0.85],
    [-27, -52, 0.62, 1.05],
  ];
  const walkers = [];
  for (const [x, z, ry, s] of herd) walkers.push({ g: mammoth(kit, group, x, z, ry, s), x, s });
  updaters.push((dt, t) => {
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i];
      w.g.position.x = w.x + Math.sin(t * 0.07 + i * 2.1) * 4;
      w.g.position.y += Math.sin(t * 1.6 + i) * 0.0006;
      w.g.rotation.z = Math.sin(t * 1.6 + i) * 0.006;
    }
  });

  // drying hides laid out on the terrace
  kit.plate(3.2, 2.2, '#b3a68d', -28.5, PAD.y + 0.07, 8.5, 0.4);
  kit.plate(2.6, 1.8, '#a99b83', -30.2, PAD.y + 0.07, 11.2, -0.2);
}


/* ---------- era 2: the first village ---------- */

function eraIron(kit, group, updaters) {
  const cx = PAD.x;
  const cz = PAD.z;

  buildRoad(kit, 1.25, '#7a6c54');
  buildBridge('timber', kit);

  const huts = [
    [-21.5, -6],
    [-25, 9.5],
    [-39.5, 10.5],
    [-43, -5.5],
    [-33, 15],
    [-32, -13],
    [-18.5, 5],
  ];
  for (const [x, z] of huts) {
    const y = gy(x, z);
    kit.cyl(2.2, 2.45, 2.05, 10, '#8e8574', x, y, z);
    kit.cone(2.9, 2.45, 10, '#9d8750', x, y + 2.05, z, 0.2);
    kit.boxC(0.2, 1.25, 0.9, '#3c3327', x + 2.35, y + 0.62, z);
  }

  // palisade: a ring of driven posts with a gate facing the ford
  const y0 = gy(cx, cz);
  const R = 17;
  const gap = 0.6;
  const count = Math.floor((Math.PI * 2 * R) / 0.6);
  const postGeo = new THREE.CylinderGeometry(0.17, 0.21, 2.8, 5);
  postGeo.translate(0, 1.4, 0);
  const posts = new THREE.InstancedMesh(postGeo, kit.mat('#6c5335', { rough: 1 }), count);
  posts.castShadow = true;
  posts.receiveShadow = true;

  const m4 = new THREE.Matrix4();
  const pv = new THREE.Vector3();
  const qq = new THREE.Quaternion();
  const su = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let placed = 0;

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    if (a < gap || a > Math.PI * 2 - gap) continue;
    pv.set(cx + Math.cos(a) * R, y0 - 0.1, cz + Math.sin(a) * R);
    qq.setFromAxisAngle(up, -a);
    const k = 0.86 + ((i * 7) % 5) / 14;
    su.set(1, k, 1);
    m4.compose(pv, qq, su);
    posts.setMatrixAt(placed++, m4);
  }
  posts.count = placed;
  posts.instanceMatrix.needsUpdate = true;
  group.add(posts);

  for (const a of [-0.34, 0.34]) {
    kit.box(0.5, 3.3, 0.5, '#584329', cx + Math.cos(a) * R, y0, cz + Math.sin(a) * R);
  }

  // the trilithon circle on the crag
  const cragY = CRAG.y;
  const r = 4.6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.box(1.05, 3.7, 1.45, '#8c8a82', CRAG.x + Math.cos(a) * r, cragY, CRAG.z + Math.sin(a) * r, -a);
  }
  for (let i = 0; i < 8; i += 2) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2;
    const x0 = CRAG.x + Math.cos(a0) * r;
    const z0 = CRAG.z + Math.sin(a0) * r;
    const x1 = CRAG.x + Math.cos(a1) * r;
    const z1 = CRAG.z + Math.sin(a1) * r;
    kit.box(
      1.4,
      0.7,
      Math.hypot(x1 - x0, z1 - z0) + 0.9,
      '#96948b',
      (x0 + x1) / 2,
      cragY + 3.7,
      (z0 + z1) / 2,
      Math.atan2(x1 - x0, z1 - z0)
    );
  }

  // well
  const wx = -27.5;
  const wz = 3.5;
  const wy = gy(wx, wz);
  kit.cyl(1.15, 1.25, 0.95, 8, '#8a8276', wx, wy, wz);
  for (const dz of [-1.05, 1.05]) {
    kit.box(0.16, 2.1, 0.16, '#6b5335', wx, wy + 0.9, wz + dz);
  }
  kit.roof(2.9, 0.85, 2.5, '#7d6742', wx, wy + 2.95, wz);

  // watchtower by the gate
  const tx = -17.5;
  const tz = -11.5;
  const ty = gy(tx, tz);
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    kit.box(0.3, 4.2, 0.3, '#5f4a30', tx + dx * 1.4, ty, tz + dz * 1.4);
  }
  kit.box(3.6, 0.3, 3.6, '#6d5537', tx, ty + 4.2, tz);
  kit.cone(2.5, 1.5, 4, '#8a7346', tx, ty + 4.5, tz, Math.PI / 4);

  // fire-cleared fields on the terrace edge
  field(kit, '#6f7a3f', -44, 16, 9, 5, 0.3);
  field(kit, '#7d7a42', -36, 20, 10, 4.5, -0.15);
  field(kit, '#68743c', -47, 5, 7, 4, 0.9);
}

/* ---------- era 3: the walled town ---------- */

function eraMedieval(kit, group, updaters) {
  const cx = PAD.x;
  const cz = PAD.z;

  buildRoad(kit, 1.45, '#6d665a');
  buildBridge('stone', kit);

  /* keep on the crag — the same rock the trilithons stood on */
  const cy = CRAG.y;
  kit.box(8, 12, 8, '#8f8b80', CRAG.x, cy, CRAG.z);
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    kit.cyl(1.25, 1.4, 13, 8, '#868276', CRAG.x + dx * 4, cy, CRAG.z + dz * 4);
  }
  for (let i = 0; i < 5; i++) {
    kit.box(1.0, 0.8, 1.0, '#9b968b', CRAG.x - 3.2 + i * 1.6, cy + 12, CRAG.z + 4);
  }
  kit.cyl(0.08, 0.08, 4.4, 5, '#3f3a32', CRAG.x + 2.6, cy + 12, CRAG.z + 2.6);
  kit.boxC(1.7, 0.95, 0.08, '#9c4b32', CRAG.x + 3.5, cy + 15.5, CRAG.z + 2.6);

  /* church */
  const chx = -38.5;
  const chz = -3;
  const chy = gy(chx, chz);
  kit.box(5.6, 5.2, 9.2, '#a8a294', chx, chy, chz);
  kit.roof(6.1, 3.0, 9.7, '#5a4a42', chx, chy + 5.2, chz);
  kit.box(3.0, 8.6, 3.0, '#b0aa9c', chx, chy, chz + 5.6);
  kit.cone(1.95, 4.6, 4, '#55605e', chx, chy + 8.6, chz + 5.6, Math.PI / 4);

  /* timber-framed houses */
  const houses = [
    [-24, -8, 0.3],
    [-27, 6.5, -0.4],
    [-21.5, 10.5, 0.15],
    [-33, 13.5, 0.7],
    [-30, -11.5, -0.2],
    [-41, 7, 0.9],
    [-43.5, 0.5, 0.2],
    [-36, -7.5, 1.3],
  ];
  for (const [x, z, ry] of houses) {
    const y = gy(x, z);
    kit.box(3.4, 3.0, 4.2, '#c8bda4', x, y, z, ry);
    kit.roof(3.8, 1.9, 4.6, '#6a4a35', x, y + 3.0, z, ry);
    const b = kit.boxC(3.5, 0.11, 0.11, '#4a3524', x, y + 2.2, z, ry);
    b.rotation.z = 0.62;
  }

  /* town wall + gatehouse, in stone this time */
  const wy = gy(cx, cz);
  kit.ring(18, 3.2, 0.6, '#9a958a', cx, wy, cz, 0.66, Math.PI * 2 - 1.32);
  const merlons = 18;
  for (let i = 0; i < merlons; i++) {
    const a = 0.66 + (i / merlons) * (Math.PI * 2 - 1.32);
    kit.box(1.35, 0.6, 0.86, '#8f8a7f', cx + Math.cos(a) * 18, wy + 3.2, cz + Math.sin(a) * 18, -a);
  }
  const gx = cx + 18;
  const gz = cz;
  kit.box(4.2, 5.4, 4.2, '#948f84', gx, wy, gz);
  kit.roof(4.6, 1.6, 4.6, '#5f4b3d', gx, wy + 5.4, gz);

  /* windmill, still turning */
  const mx = -55;
  const mz = 23;
  const my = gy(mx, mz);
  kit.cyl(2.0, 2.9, 9.0, 8, '#b9ae95', mx, my, mz);
  kit.cone(2.35, 2.1, 8, '#6a4a35', mx, my + 9.0, mz);

  const hub = new THREE.Group();
  hub.position.set(mx, my + 8.4, mz + 2.4);
  group.add(hub);
  const sailMat = kit.mat('#ddd2bb');
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i / 4) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 5.0, 0.1), sailMat);
    blade.position.set(0, 2.7, 0);
    blade.castShadow = true;
    arm.add(blade);
    hub.add(arm);
  }
  updaters.push((dt) => {
    hub.rotation.z += dt * 0.55;
  });

  /* strip fields */
  const strips = [
    [-45, 15, '#8a7a3f'],
    [-40, 19, '#67743b'],
    [-50, 8, '#8a7a3f'],
    [-48, 20, '#67743b'],
    [-20, 18, '#67743b'],
    [-16, 13, '#8a7a3f'],
  ];
  for (const [x, z, c] of strips) field(kit, c, x, z, 10, 3.4, 0.4);

  /* market */
  for (const [x, z, ry] of [
    [-29, 0.5, 0.2],
    [-35, 4.5, -0.3],
  ]) {
    const y = gy(x, z);
    for (const [dx, dz] of [
      [-1.2, -1],
      [1.2, -1],
      [-1.2, 1],
      [1.2, 1],
    ]) {
      kit.box(0.12, 2.1, 0.12, '#6a5334', x + dx, y, z + dz);
    }
    const aw = kit.boxC(3.0, 0.1, 2.4, '#a89a7c', x, y + 2.2, z, ry);
    aw.rotation.z = 0.1;
  }
}

/* ---------- era 4: the valley industrialises ---------- */

function eraIndustrial(kit, group, updaters) {
  buildRoad(kit, 1.8, '#4d4a45');
  buildBridge('iron', kit);

  /* --- mill and its two stacks --- */
  const mx = -36;
  const mz = 16;
  const my = gy(mx, mz);
  kit.box(16, 10, 9, '#8a5240', mx, my, mz);
  kit.box(16.4, 0.5, 9.4, '#6e4436', mx, my + 10, mz);
  for (let i = 0; i < 4; i++) {
    kit.box(0.4, 1.1, 9.2, '#6e4436', mx - 6 + i * 4, my + 10.5, mz);
  }

  const stacks = [
    [-43, 21.5],
    [-29, 21.5],
  ];
  for (const [x, z] of stacks) {
    const y = gy(x, z);
    kit.cyl(1.05, 1.5, 24, 10, '#7d4f3f', x, y, z);
    kit.cyl(1.35, 1.05, 1.2, 10, '#6d4536', x, y + 24, z);
    const plume = createPlume({
      origin: new THREE.Vector3(x, y + 25, z),
      count: 32,
      spread: 1.2,
      rise: 28,
      drift: 10,
      size: 5.2,
      color: '#b3aca0',
      opacity: 0.5,
      speed: 0.85,
    });
    group.add(plume.object);
    updaters.push((dt, t) => plume.update(t));
  }

  /* --- railway viaduct crossing the valley behind the town --- */
  const vz = -70;
  const deckY = 26;
  const x0 = -112;
  const x1 = 32;
  kit.box(x1 - x0, 1.0, 5.4, '#8f7f6d', (x0 + x1) / 2, deckY, vz);
  for (const dz of [-2.6, 2.6]) {
    kit.box(x1 - x0, 0.55, 0.5, '#7d6f60', (x0 + x1) / 2, deckY + 1.0, vz + dz);
  }

  const piers = 11;
  for (let i = 0; i < piers; i++) {
    const x = x0 + ((x1 - x0) * i) / (piers - 1);
    const g = gy(x, vz);
    kit.box(3.4, deckY - 0.9 - g + 0.6, 6.0, '#86766a', x, g - 0.6, vz);
  }
  const spanR = 5.2;
  for (let i = 0; i < piers - 1; i++) {
    const xa = x0 + ((x1 - x0) * i) / (piers - 1);
    const xb = x0 + ((x1 - x0) * (i + 1)) / (piers - 1);
    const cxm = (xa + xb) / 2;
    for (let k = 0; k < 4; k++) {
      const th = Math.PI * (0.12 + (0.76 * k) / 3);
      const v = kit.boxC(
        (xb - xa) / 2 - 1.4,
        0.62,
        5.6,
        '#8d7d6f',
        cxm + Math.cos(th) * spanR * 0.92,
        deckY - 0.9 - spanR + Math.sin(th) * spanR,
        vz
      );
      v.rotation.z = th + Math.PI / 2;
    }
  }

  /* the train never stops */
  const train = new THREE.Group();
  train.position.set(-140, deckY + 1.0, vz);
  group.add(train);
  const tk = createKit(train);
  const livery = '#38403d';
  tk.box(5.0, 2.7, 2.6, livery, 0, 0, 0);
  tk.box(2.0, 2.2, 2.4, '#2e3532', 3.2, 0.2, 0);
  tk.cyl(0.34, 0.42, 1.1, 8, '#4a4f4c', 3.6, 2.2, 0);
  for (let i = 0; i < 2; i++) {
    tk.box(5.6, 2.45, 2.5, '#6a584c', -4.2 - i * 6.0, 0, 0);
    tk.roof(5.8, 0.5, 2.6, '#4b4440', -4.2 - i * 6.0, 2.45, 0);
  }
  updaters.push((dt) => {
    train.position.x += dt * 7.5;
    if (train.position.x > 46) train.position.x = -140;
  });

  /* --- gasometer on the flats --- */
  const gx = 14;
  const gz = -24;
  const gyy = gy(gx, gz);
  kit.cyl(4.6, 4.6, 7.0, 16, '#6d6a63', gx, gyy, gz);
  kit.cyl(4.1, 4.6, 1.3, 16, '#7b786f', gx, gyy + 7.0, gz);
  kit.sphere(4.1, '#6d6a63', gx, gyy + 8.3, gz, { seg: 16, rings: 8 }).scale.set(1, 0.42, 1);

  /* --- workers' terraces --- */
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const x = -45 + c * 5.2;
      const z = -21 + r * 6.4;
      const y = gy(x, z);
      kit.box(3.2, 3.7, 5.2, '#8a5a48', x, y, z);
      kit.roof(3.5, 1.2, 5.5, '#3f3d3a', x, y + 3.7, z);
    }
  }

  /* --- gas street lamps along the road --- */
  for (let i = 0; i < 5; i++) {
    const p = ROAD_PTS[Math.round(18 + i * 9)];
    const y = roadY(p.x, p.z);
    kit.cyl(0.08, 0.11, 3.0, 5, '#4a4741', p.x + 1.6, y, p.z + 1.6);
    kit.sphere(0.2, '#ffd9a0', p.x + 1.6, y + 3.05, p.z + 1.6, {
      emissive: '#ffb45e',
      emissiveIntensity: 2.6,
    });
  }

  /* a low soot-black wall around the old churchyard */
  kit.ring(11, 1.3, 0.4, '#5a554d', -38.5, gy(-38.5, -3), -3, 0.4, Math.PI * 1.6);
}

/* ---------- era 5: the valley now ---------- */
const WIN_TEX = windowTexture();

function turbine(group, kit, updaters, x, z, h) {
  const y = gy(x, z);
  kit.cyl(0.5, 1.0, h, 8, '#d9dbd7', x, y, z);
  kit.boxC(1.15, 1.0, 2.6, '#e4e6e2', x, y + h, z);

  const rotor = new THREE.Group();
  rotor.position.set(x, y + h, z + 1.5);
  group.add(rotor);

  const bladeMat = new THREE.MeshStandardMaterial({
    color: '#e8ebe6',
    roughness: 0.5,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i / 3) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8.6, 0.1), bladeMat);
    blade.position.set(0, 4.9, 0);
    arm.add(blade);
    rotor.add(arm);
  }
  updaters.push((dt) => {
    rotor.rotation.z += dt * 0.85;
  });
}

function eraModern(kit, group, updaters) {
  buildRoad(kit, 2.6, '#3f4243');
  buildBridge('modern', kit);

  /* --- the skyline, on the same terrace as the huts --- */
  const towers = [
    [-40, -6, 6.4, 21, 0.0],
    [-33, 6.5, 5.4, 16, 0.12],
    [-24, -2, 5.0, 27, -0.08],
    [-45.5, 4, 4.8, 11, 0.05],
    [-28, 13, 4.4, 13.5, 0.3],
    [-18.5, 7.5, 3.8, 9.5, 0.0],
  ];
  for (const [x, z, w, h, ry] of towers) {
    const y = gy(x, z);
    const tex = WIN_TEX.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, Math.max(1, Math.round(h / 13)));
    kit.box(w, h, w, '#c3ccce', x, y, z, ry, {
      map: tex,
      rough: 0.42,
      metal: 0.1,
      emissiveIntensity: 1.0,
    });
    kit.box(w * 0.58, 0.7, w * 0.58, '#39444a', x, y + h, z, ry);
    kit.box(w * 0.16, 0.5, w * 0.16, '#ff7a4a', x + w * 0.2, y + h + 0.7, z, ry, {
      emissive: '#ff5a2a',
      emissiveIntensity: 3,
    });
  }

  /* lower blocks holding the street edge */
  for (const [x, z, w, d, h] of [
    [-46, -14, 8, 5, 7],
    [-36, 20, 9, 5, 8],
    [-22, 20, 7, 5, 6.5],
    [-44, 14, 5, 6, 5.5],
    [-15, 14, 5, 5, 6],
  ]) {
    const y = gy(x, z);
    const tex = WIN_TEX.clone();
    tex.needsUpdate = true;
    tex.repeat.set(Math.max(1, Math.round(w / 10)), Math.max(1, Math.round(h / 14)));
    kit.box(w, h, d, '#a9b1b3', x, y, z, 0, {
      map: tex,
      rough: 0.6,
      metal: 0.05,
      emissiveIntensity: 0.5,
    });
    kit.box(w * 0.94, 0.3, d * 0.94, '#8d9496', x, y + h, z);
  }

  /* --- wind on the ridge --- */
  turbine(group, kit, updaters, -78, 40, 28);
  turbine(group, kit, updaters, -90, 15, 24);
  turbine(group, kit, updaters, -66, 58, 26);

  /* --- solar field on the east flats --- */
  const panelGeo = new THREE.BoxGeometry(2.6, 0.12, 1.7);
  const panelMat = new THREE.MeshStandardMaterial({
    color: '#1d2c38',
    roughness: 0.32,
    metalness: 0.5,
    emissive: '#16323f',
    emissiveIntensity: 0.5,
  });
  const panels = new THREE.InstancedMesh(panelGeo, panelMat, 24);
  panels.castShadow = true;
  panels.receiveShadow = true;
  const pm = new THREE.Matrix4();
  const pq = new THREE.Quaternion();
  const pe = new THREE.Euler(-0.42, 0.35, 0);
  pq.setFromEuler(pe);
  let pi = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const x = 20 + c * 3.3;
      const z = -18 + r * 3.0;
      pm.compose(new THREE.Vector3(x, gy(x, z) + 0.7, z), pq, new THREE.Vector3(1, 1, 1));
      panels.setMatrixAt(pi++, pm);
    }
  }
  panels.instanceMatrix.needsUpdate = true;
  group.add(panels);

  /* --- the wood comes back, on purpose --- */
  const grove = [
    [-13, 11],
    [-17, 15],
    [-9, 5],
    [-21, 18],
    [-6, -7],
    [-15, -11],
    [-2, 2],
    [2, -5],
    [-24, 21],
    [17, 7],
    [23, 1],
    [29, 11],
    [-10, 23],
    [31, -15],
    [-19, -3],
    [6, 12],
  ].map(([x, z]) => ({ x, y: gy(x, z), z }));
  group.add(createGrove(grove, '#5b4a38', '#55703f'));

  /* --- promenade on the west bank --- */
  kit.plate(7, 26, '#8e9288', -14, gy(-14, -2) + 0.08, -2, 0.11);

  /* --- street lights with real halos --- */
  const lampPts = [
    [-12, 4],
    [-20, 8],
    [-26, -5],
    [-34, -10],
    [-38, 9],
    [16, 2],
  ];
  for (const [x, z] of lampPts) {
    const y = gy(x, z);
    kit.cyl(0.07, 0.1, 4.4, 6, '#6f7570', x, y, z);
    kit.boxC(1.0, 0.12, 0.24, '#8d938d', x + 0.4, y + 4.4, z);
    kit.sphere(0.14, '#ffffff', x + 0.85, y + 4.32, z, {
      emissive: '#ffe6c0',
      emissiveIntensity: 3.2,
    });
    group.add(createGlow(new THREE.Vector3(x + 0.85, y + 4.32, z), 4.2, '#ffc98a', 0.4));
  }

  /* --- the plaque on the boulder: the one spot marked in every century --- */
  const bx = 30.2;
  const bz = 33.4;
  const by = gy(bx, bz);
  kit.box(0.9, 0.75, 0.14, '#3c4346', bx, by + 0.5, bz, 0.6);
  kit.boxC(0.72, 0.5, 0.02, '#ffe2b0', bx, by + 0.92, bz + 0.09, 0.6, {
    emissive: '#ffd9a0',
    emissiveIntensity: 2.6,
  });
  group.add(createGlow(new THREE.Vector3(bx, by + 1.0, bz), 5.0, '#ffbe83', 0.35));

  /* --- traffic on the crossing --- */
  const cars = new THREE.Group();
  group.add(cars);
  const carCols = ['#d8d5cc', '#2f3a40', '#9c4b32'];
  const movers = [];
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    cars.add(car);
    const k = createKit(car);
    k.box(1.9, 0.62, 1.05, carCols[i], 0, 0, 0);
    k.box(1.0, 0.5, 0.95, i === 1 ? '#1e2a30' : '#b9c6c9', -0.12, 0.62, 0);
    movers.push({
      back: i === 1,
      speed: 3.4 + i * 1.3,
      off: i * 5.2,
      lane: i === 1 ? 1.6 : -1.6,
    });
  }
  updaters.push((dt, t) => {
    for (let i = 0; i < movers.length; i++) {
      const m = movers[i];
      const span = 22;
      let x = ((t * m.speed + m.off) % span) - 3;
      if (m.back) x = 17 - x;
      cars.children[i].position.set(x, FORD.deck + 0.02, FORD.z + m.lane);
    }
  });
}

const BUILDERS = [eraCamp, eraIron, eraMedieval, eraIndustrial, eraModern];

export function buildEra(index) {
  const group = new THREE.Group();
  group.name = `era-${index}`;
  const kit = createKit(group);
  const updaters = [];
  BUILDERS[index](kit, group, updaters);

  return {
    group,
    /**
     * The whole transition: the era grows out of the terrace, pivoting on the
     * pad height so ground detail stays put while the rooflines rise.
     */
    setWeight(w) {
      const s = Math.max(0.00012, w);
      group.visible = w > 0.004;
      group.scale.y = s;
      group.position.y = PAD.y * (1 - s);
      const o = Math.min(1, w * w * 1.7);
      for (const m of kit.fades) m.opacity = o;
    },
    update(dt, t) {
      for (let i = 0; i < updaters.length; i++) updaters[i](dt, t);
    },
  };
}


