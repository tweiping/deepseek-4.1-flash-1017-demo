import * as THREE from 'three';

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(x) {
  const t = clamp(x, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/* ---------- deterministic noise ---------- */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

export function fbm(x, y, octaves = 4, lacunarity = 2.02, gain = 0.5) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq, y * freq) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/* ---------- geometry helpers ---------- */

/**
 * A flat ribbon that follows a polyline in the XZ plane. Used for water and roads.
 * @param {{x:number,z:number}[]} pts  centre-line, ordered
 * @param {number|((i:number,t:number)=>number)} halfWidth
 * @param {number} y  height of the ribbon
 */
export function ribbonGeometry(pts, halfWidth, y = 0, across = 1) {
  const n = pts.length;
  const cols = across + 1;
  const positions = new Float32Array(n * cols * 3);
  const uvs = new Float32Array(n * cols * 2);
  let run = 0;

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const w = typeof halfWidth === 'function' ? halfWidth(i, i / (n - 1)) : halfWidth;
    const yy = typeof y === 'function' ? y(i, i / (n - 1)) : y;

    if (i > 0) run += Math.hypot(p.x - prev.x, p.z - prev.z) * 0.04;

    for (let j = 0; j < cols; j++) {
      const u = j / across;
      const off = -w + 2 * w * u;
      const o = (i * cols + j) * 3;
      positions[o + 0] = p.x - tz * off;
      positions[o + 1] = yy;
      positions[o + 2] = p.z + tx * off;

      const q = (i * cols + j) * 2;
      uvs[q + 0] = u;
      uvs[q + 1] = run;
    }
  }

  const index = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < across; j++) {
      const l0 = i * cols + j;
      const r0 = l0 + 1;
      const l1 = l0 + cols;
      const r1 = l1 + 1;
      index.push(l0, r0, l1, r0, r1, l1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Radial soft puff, used for smoke and lamp glow. */
export function radialTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Lit window grid for the modern era. */
export function windowTexture() {
  const w = 128;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c1116';
  ctx.fillRect(0, 0, w, h);

  const cols = 6;
  const rows = 12;
  const cw = w / cols;
  const ch = h / rows;
  const rand = mulberry32(20261017);

  for (let y = 0; y < rows; y++) {
    // floor slab line, so the facade reads as storeys rather than noise
    ctx.fillStyle = 'rgba(126, 136, 140, 0.22)';
    ctx.fillRect(0, y * ch + ch - 4, w, 2);

    for (let x = 0; x < cols; x++) {
      const r = rand();
      if (r < 0.3) {
        ctx.fillStyle = '#0a1015';
      } else {
        const warm = rand() < 0.72;
        const a = 0.4 + rand() * 0.55;
        ctx.fillStyle = warm
          ? `rgba(255, 203, 148, ${a})`
          : `rgba(146, 190, 208, ${a})`;
      }
      ctx.fillRect(x * cw + 3, y * ch + 4, cw - 6, ch - 11);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}
