import * as THREE from 'three';
import { PAD, ROAD, groundHeight, riverX, slopeAt } from './terrain.js';
import { mulberry32, noise2 } from '../util.js';

const MAX = 620;
const CUT_SLOTS = 60;

function distToRoad(x, z) {
  let best = Infinity;
  for (let i = 0; i < ROAD.length - 1; i++) {
    const a = ROAD[i];
    const b = ROAD[i + 1];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz))
    );
    const d = Math.hypot(x - (a.x + abx * t), z - (a.z + abz * t));
    if (d < best) best = d;
  }
  return best;
}

export const CANOPY_SLOTS = [
  0.7, 0.55, 0.42, 0.16, 0.3,
];

export function createForest() {
  const rand = mulberry32(88991);
  const sites = [];
  let guard = 0;

  while (sites.length < MAX && guard < 60000) {
    guard++;
    const x = -146 + rand() * 292;
    const z = -146 + rand() * 292;
    const h = groundHeight(x, z);
    if (h < 2.1 || h > 36) continue;
    if (Math.abs(x - riverX(z)) < 9.5) continue;
    if (Math.hypot(x - PAD.x, z - PAD.z) < PAD.r + 4) continue;
    if (slopeAt(x, z) > 0.66) continue;
    if (distToRoad(x, z) < 5.5) continue;
    sites.push({ x, z, h, s: 0.62 + rand() * 0.85, r: rand() * Math.PI * 2 });
  }

  // Farthest from the village first, so shrinking the count always means
  // "the near woods were cut and the far slopes survived".
  sites.sort(
    (a, b) =>
      Math.hypot(b.x - PAD.x, b.z - PAD.z) - Math.hypot(a.x - PAD.x, a.z - PAD.z)
  );

  const trunkGeo = new THREE.CylinderGeometry(0.17, 0.3, 2.1, 5);
  trunkGeo.translate(0, 1.05, 0);
  const canopyGeo = new THREE.ConeGeometry(1.5, 5.6, 7);
  canopyGeo.translate(0, 3.55, 0);

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3b2c', roughness: 1 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: '#4a5c40', roughness: 1, flatShading: true });

  const maxSites = Math.max(sites.length, MAX);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, maxSites);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, maxSites);
  trunks.castShadow = true;
  canopies.castShadow = true;
  canopies.receiveShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();

  for (let i = 0; i < sites.length; i++) {
    const s = sites[i];
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.r);
    const tall = 0.85 + ((i * 37) % 11) / 18;
    pos.set(s.x, s.h - 0.15, s.z);
    scl.set(s.s, s.s * tall, s.s);
    m.compose(pos, q, scl);
    trunks.setMatrixAt(i, m);
    canopies.setMatrixAt(i, m);
    const tint = 0.82 + noise2(s.x * 0.3, s.z * 0.3) * 0.42;
    col.setRGB(tint * 0.94, tint, tint * 0.86);
    canopies.setColorAt(i, col);
  }
  trunks.count = sites.length;
  canopies.count = sites.length;
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;

  // stumps mark where the wood was taken
  const stumpGeo = new THREE.CylinderGeometry(0.3, 0.38, 0.42, 6);
  stumpGeo.translate(0, 0.21, 0);
  const stumpMat = new THREE.MeshStandardMaterial({ color: '#6a5741', roughness: 1 });
  const stumps = new THREE.InstancedMesh(stumpGeo, stumpMat, CUT_SLOTS);
  stumps.receiveShadow = true;
  stumps.castShadow = true;
  stumps.count = 0;

  for (let i = 0; i < CUT_SLOTS; i++) {
    const idx = Math.min(sites.length - 1, Math.round(30 + i * 6.4));
    const s = sites[idx] || sites[0];
    pos.set(s.x, s.h - 0.05, s.z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.r);
    scl.set(1, 0.8 + ((i * 13) % 7) / 12, 1);
    m.compose(pos, q, scl);
    stumps.setMatrixAt(i, m);
  }
  stumps.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.name = 'forest';
  group.add(trunks, canopies, stumps);

  return {
    group,
    total: sites.length,
    setDensity(f) {
      const n = Math.round(Math.max(0, Math.min(1, f)) * sites.length);
      trunks.count = n;
      canopies.count = n;
    },
    setStumps(f) {
      stumps.count = Math.round(Math.max(0, Math.min(1, f)) * CUT_SLOTS);
    },
  };
}

/** A small, deliberate broadleaf grove — used where people replanted. */
export function createGrove(points, bark = '#5b4a38', leaf = '#556b3f') {
  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 1.5, 5);
  trunkGeo.translate(0, 0.75, 0);
  const canopyGeo = new THREE.IcosahedronGeometry(1.25, 0);
  canopyGeo.translate(0, 2.3, 0);

  const trunks = new THREE.InstancedMesh(
    trunkGeo,
    new THREE.MeshStandardMaterial({ color: bark, roughness: 1 }),
    points.length
  );
  const canopies = new THREE.InstancedMesh(
    canopyGeo,
    new THREE.MeshStandardMaterial({ color: leaf, roughness: 1, flatShading: true }),
    points.length
  );
  trunks.castShadow = true;
  canopies.castShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const rand = mulberry32(4242);

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
    const k = 0.75 + rand() * 0.55;
    p.set(pt.x, pt.y, pt.z);
    s.set(k, k * (0.9 + rand() * 0.4), k);
    m.compose(p, q, s);
    trunks.setMatrixAt(i, m);
    canopies.setMatrixAt(i, m);
  }
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;

  const g = new THREE.Group();
  g.add(trunks, canopies);
  return g;
}
