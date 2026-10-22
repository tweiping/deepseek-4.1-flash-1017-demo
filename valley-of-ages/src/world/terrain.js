import * as THREE from 'three';
import { clamp, fbm, lerp, smoothstep, noise2 } from '../util.js';

/* ------------------------------------------------------------------ *
 * The map. Every era reads these constants, which is the whole point:
 * one valley, one ford, one terrace, one boulder.
 * ------------------------------------------------------------------ */

export const RIVER_LEVEL = -0.62;
export const FORD = { x: 6.5, z: 0, x0: 0.4, x1: 13.2, deck: 2.6 };
export const PAD = { x: -32, z: 2, r: 30, y: 3.2 };
export const CRAG = { x: -64, z: -16, r: 18, y: 19 };
export const BOULDER = { x: 33, z: 31 };

export function riverX(z) {
  return 12 * Math.sin(z * 0.0165) + 6.5 * Math.sin(z * 0.034 + 1.1);
}

export function riverWidth(z) {
  return 3.4 + 1.1 * Math.sin(z * 0.05 + 0.7);
}

/** The road, identical in shape in every era (it only gets paved). */
export const ROAD = [
  { x: 52, z: 34 },
  { x: 34, z: 17 },
  { x: 19, z: 5.5 },
  { x: FORD.x, z: FORD.z },
  { x: -4, z: -0.6 },
  { x: -16, z: 0.6 },
  { x: -32, z: 2 },
  { x: -47, z: -6 },
  { x: -60, z: -14 },
];

function baseHeight(x, z) {
  const dx = x - riverX(z);
  const a = Math.abs(dx);

  // channel bed -> floodplain -> valley wall
  let h = -3.1 + 4.4 * smoothstep(1.0, 7.2, a);
  h += 46 * Math.pow(smoothstep(14, 132, a), 2.2);

  // ridge texture, kept off the floodplain
  const n = fbm(x * 0.0165, z * 0.0165, 4);
  h += (n - 0.5) * 30 * smoothstep(18, 62, a);

  // the valley closes gently at its far ends
  h += 24 * Math.pow(smoothstep(110, 155, Math.abs(z)), 1.6);
  h += 26 * Math.pow(smoothstep(112, 152, Math.abs(x)), 1.6);

  // the crag: a flat-topped mesa above the west bank
  const cd = Math.hypot(x - CRAG.x, z - CRAG.z);
  const cragMask = 1 - smoothstep(CRAG.r * 0.22, CRAG.r * 1.4, cd);
  if (cragMask > 0) h = lerp(h, CRAG.y + (n - 0.5) * 3.4, cragMask);

  // the terrace every era builds on
  const pd = Math.hypot(x - PAD.x, z - PAD.z);
  const padMask = 1 - smoothstep(PAD.r * 0.5, PAD.r, pd);
  if (padMask > 0) h = lerp(h, PAD.y, padMask * 0.95);

  // level the two banks at the crossing so nothing ever floats
  const fd = Math.hypot(x - FORD.x, z - FORD.z);
  const bankMask = (1 - smoothstep(9, 22, fd)) * smoothstep(4.2, 7.5, a) * 0.6;
  if (bankMask > 0) h = lerp(h, 1.9, bankMask);

  return h;
}

export function groundHeight(x, z) {
  return baseHeight(x, z);
}

export function slopeAt(x, z) {
  const d = 1.6;
  const hx = baseHeight(x + d, z) - baseHeight(x - d, z);
  const hz = baseHeight(x, z + d) - baseHeight(x, z - d);
  return Math.hypot(hx, hz) / (2 * d);
}

/* --- soil stratigraphy, read off the height of each vertex --- */
const STRATA = [
  [0.0, '#3b4033'],
  [0.055, '#4e5839'],
  [0.13, '#68724b'],
  [0.26, '#7f6a42'],
  [0.42, '#8a4c37'],
  [0.6, '#9d7a52'],
  [0.76, '#bdb5a0'],
  [0.9, '#7a7873'],
  [1.0, '#5a5955'],
].map(([stop, hex]) => [stop, new THREE.Color(hex)]);

const _ca = new THREE.Color();
const _cb = new THREE.Color();

function strataColor(h, slope, jitter, out) {
  const t = clamp((h + 4) / 52, 0, 1);
  let i = 0;
  while (i < STRATA.length - 2 && t > STRATA[i + 1][0]) i++;
  const [s0, c0] = STRATA[i];
  const [s1, c1] = STRATA[i + 1];
  _ca.copy(c0);
  _cb.copy(c1);
  out.copy(_ca).lerp(_cb, clamp((t - s0) / (s1 - s0 || 1), 0, 1));

  // exposed rock is darker, flats catch more light
  out.multiplyScalar(0.8 + 0.2 * (1 - clamp(slope * 2.2, 0, 1)));
  out.multiplyScalar(0.93 + jitter * 0.16);
  return out;
}

export function createTerrain() {
  const SIZE = 300;
  const N = 180;
  const step = SIZE / N;
  const half = SIZE / 2;

  const geo = new THREE.BufferGeometry();
  const count = (N + 1) * (N + 1);
  const pos = new Float32Array(count * 3);

  let p = 0;
  for (let iz = 0; iz <= N; iz++) {
    const z = -half + iz * step;
    for (let ix = 0; ix <= N; ix++) {
      const x = -half + ix * step;
      pos[p++] = x;
      pos[p++] = baseHeight(x, z);
      pos[p++] = z;
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const idx = new Uint32Array(N * N * 6);
  let q = 0;
  for (let iz = 0; iz < N; iz++) {
    for (let ix = 0; ix < N; ix++) {
      const a = iz * (N + 1) + ix;
      const b = a + 1;
      const c = a + N + 1;
      const d = c + 1;
      idx[q++] = a;
      idx[q++] = c;
      idx[q++] = b;
      idx[q++] = b;
      idx[q++] = c;
      idx[q++] = d;
    }
  }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();

  const normals = geo.getAttribute('normal');
  const colors = new Float32Array(count * 3);
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];
    const slope = 1 - clamp(normals.getY(i), 0, 1);
    const jitter = noise2(x * 0.55, z * 0.55);
    strataColor(y, slope, jitter, tmp);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

/** The one landmark that survives all five eras. */
export function createBoulder() {
  const geo = new THREE.IcosahedronGeometry(BOULDER.r, 1);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 0.72 + noise2(x * 1.7 + 11, z * 1.7 - 4) * 0.5;
    pos.setXYZ(i, x * k * 1.15, y * k * 0.72, z * k);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: '#8d8b86',
    roughness: 0.94,
    metalness: 0.02,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(BOULDER.x, groundHeight(BOULDER.x, BOULDER.z) + 0.9, BOULDER.z);
  mesh.rotation.set(0.16, 0.9, -0.1);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'boulder';
  return mesh;
}

