import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ERAS, WATER } from './world/palettes.js';
import { FORD, PAD, createTerrain, createBoulder } from './world/terrain.js';
import { createWater } from './world/water.js';
import { createSky, createLighting } from './world/sky.js';
import { createForest, CANOPY_SLOTS } from './world/flora.js';
import { buildEra } from './world/eras.js';
import { createUI } from './ui/timeline.js';
import { clamp, easeOutCubic, smootherstep } from './util.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- camera keyframes: one shot per era, all on the same axis ---------- */
const CAM = [
  { p: [40, 30, 62], t: [-16, 6, 0] },
  { p: [44, 33, 66], t: [-18, 7, 0] },
  { p: [50, 38, 70], t: [-20, 9, -2] },
  { p: [54, 42, 74], t: [-22, 11, -5] },
  { p: [58, 46, 78], t: [-24, 13, -7] },
];
const INTRO_FROM = new THREE.Vector3(150, 118, 190);

const canvas = document.getElementById('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  document.querySelector('[data-boot]').textContent = 'This scene needs WebGL.';
  throw err;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#8c8271', 0.0078);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 1600);
camera.position.set(...CAM[0].p);

const controls = new OrbitControls(camera, canvas);
controls.target.set(...CAM[0].t);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 45;
controls.maxDistance = 230;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.45;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.7;
controls.update();

/* ---------- world ---------- */
const sky = createSky();
scene.add(sky.mesh);

const lighting = createLighting();
scene.add(lighting.hemi, lighting.sun, lighting.target);

scene.add(createTerrain());
scene.add(createBoulder());

const water = createWater();
scene.add(water.mesh);

const forest = createForest();
scene.add(forest.group);

const eras = [0, 1, 2, 3, 4].map((i) => buildEra(i));
for (const e of eras) {
  scene.add(e.group);
  e.setWeight(0);
}

/* ---------- palette blending ---------- */
const PAL = ERAS.map((e) => ({
  top: new THREE.Color(e.sky.top),
  horizon: new THREE.Color(e.sky.horizon),
  sunColor: new THREE.Color(e.sky.sun),
  sunDir: new THREE.Vector3(e.sun.dir[0], e.sun.dir[1], e.sun.dir[2]).normalize(),
  fogColor: new THREE.Color(e.fog.color),
  fogDensity: e.fog.density,
  hemiSky: new THREE.Color(e.hemi.sky),
  hemiGround: new THREE.Color(e.hemi.ground),
  hemiIntensity: e.hemi.intensity,
  sunIntensity: e.sun.intensity,
  exposure: e.exposure,
}));

const WAT = WATER.map((w) => ({
  deep: new THREE.Color(w.deep),
  shallow: new THREE.Color(w.shallow),
  sky: new THREE.Color(w.sky),
  sun: new THREE.Color(w.sun),
}));

const blend = {
  top: new THREE.Color(),
  horizon: new THREE.Color(),
  sunColor: new THREE.Color(),
  sunDir: new THREE.Vector3(),
  fogColor: new THREE.Color(),
  fogDensity: 0,
  hemiSky: new THREE.Color(),
  hemiGround: new THREE.Color(),
  hemiIntensity: 0,
  sunIntensity: 0,
  exposure: 1,
};
const waterBlend = {
  deep: new THREE.Color(),
  shallow: new THREE.Color(),
  sky: new THREE.Color(),
  sun: new THREE.Color(),
};

const WEIGHTS = [0, 0, 0, 0, 0];


/* ---------- state ---------- */
let t = 0;
let easeTarget = null;
let playing = false;
let autoCam = true;
let introK = reduceMotion ? 1 : 0;
let elapsed = 0;
let startedAt = performance.now();
let ready = false;

const _c = new THREE.Color();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _zero = new THREE.Vector3(0, 0, 0);

controls.addEventListener('start', () => {
  autoCam = false;
  introK = 1;
});

function apply(tv) {
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    const w = 1 - smootherstep(Math.abs(tv - i));
    WEIGHTS[i] = w;
    sum += w;
  }
  if (sum < 1e-5) {
    WEIGHTS[Math.round(clamp(tv, 0, 4))] = 1;
    sum = 1;
  }

  blend.top.setRGB(0, 0, 0);
  blend.horizon.setRGB(0, 0, 0);
  blend.sunColor.setRGB(0, 0, 0);
  blend.fogColor.setRGB(0, 0, 0);
  blend.hemiSky.setRGB(0, 0, 0);
  blend.hemiGround.setRGB(0, 0, 0);
  blend.sunDir.set(0, 0, 0);
  blend.fogDensity = 0;
  blend.hemiIntensity = 0;
  blend.sunIntensity = 0;
  blend.exposure = 0;

  waterBlend.deep.setRGB(0, 0, 0);
  waterBlend.shallow.setRGB(0, 0, 0);
  waterBlend.sky.setRGB(0, 0, 0);
  waterBlend.sun.setRGB(0, 0, 0);

  for (let i = 0; i < 5; i++) {
    const w = WEIGHTS[i] / sum;
    if (w <= 0) continue;
    const p = PAL[i];
    blend.top.add(_c.copy(p.top).multiplyScalar(w));
    blend.horizon.add(_c.copy(p.horizon).multiplyScalar(w));
    blend.sunColor.add(_c.copy(p.sunColor).multiplyScalar(w));
    blend.fogColor.add(_c.copy(p.fogColor).multiplyScalar(w));
    blend.hemiSky.add(_c.copy(p.hemiSky).multiplyScalar(w));
    blend.hemiGround.add(_c.copy(p.hemiGround).multiplyScalar(w));
    blend.sunDir.add(_v1.copy(p.sunDir).multiplyScalar(w));
    blend.fogDensity += p.fogDensity * w;
    blend.hemiIntensity += p.hemiIntensity * w;
    blend.sunIntensity += p.sunIntensity * w;
    blend.exposure += p.exposure * w;

    const wp = WAT[i];
    waterBlend.deep.add(_c.copy(wp.deep).multiplyScalar(w));
    waterBlend.shallow.add(_c.copy(wp.shallow).multiplyScalar(w));
    waterBlend.sky.add(_c.copy(wp.sky).multiplyScalar(w));
    waterBlend.sun.add(_c.copy(wp.sun).multiplyScalar(w));
  }

  blend.sunDir.normalize();

  scene.fog.color.copy(blend.fogColor);
  scene.fog.density = blend.fogDensity;
  renderer.toneMappingExposure = blend.exposure;
  lighting.update(blend);
  sky.update(blend);
  water.update(elapsed, waterBlend);

  let canopy = 0;
  let stumps = 0;
  for (let i = 0; i < 5; i++) {
    const w = WEIGHTS[i] / sum;
    eras[i].setWeight(WEIGHTS[i]);
    canopy += CANOPY_SLOTS[i] * w;
    stumps += (i === 3 ? 1 : i === 4 ? 0.18 : 0) * w;
  }
  forest.setDensity(canopy);
  forest.setStumps(stumps);

  /* camera: one axis for all five eras, only the distance changes */
  if (autoCam) {
    const i = Math.min(3, Math.floor(tv));
    const f = tv - i;
    const a = CAM[i];
    const b = CAM[i + 1];
    _v1.set(
      a.p[0] + (b.p[0] - a.p[0]) * f,
      a.p[1] + (b.p[1] - a.p[1]) * f,
      a.p[2] + (b.p[2] - a.p[2]) * f
    );
    _v2.set(
      a.t[0] + (b.t[0] - a.t[0]) * f,
      a.t[1] + (b.t[1] - a.t[1]) * f,
      a.t[2] + (b.t[2] - a.t[2]) * f
    );

    // narrow screens get the same picture, just from further back
    const pull = Math.min(1.9, Math.max(1, 1.55 / camera.aspect));
    if (pull > 1) _v1.sub(_v2).multiplyScalar(pull).add(_v2);

    if (introK < 1) {
      camera.position.lerpVectors(INTRO_FROM, _v1, introK);
      controls.target.lerpVectors(_zero, _v2, introK);
    } else {
      camera.position.copy(_v1);
      controls.target.copy(_v2);
    }
  }
  controls.update();
  sky.mesh.position.copy(camera.position);
}

/* ---------- ui ---------- */
const ui = createUI({
  eras: ERAS,
  onSeek: (v, animate) => {
    const v2 = clamp(v, 0, 4);
    if (animate) {
      easeTarget = v2;
    } else {
      easeTarget = null;
      t = v2;
    }
  },
  onPlay: (v) => {
    playing = v;
    autoCam = true;
    introK = 1;
    if (v && t >= 3.999) t = 0;
  },
  onRecentre: () => {
    autoCam = true;
    introK = 1;
  },
});

/* ---------- loop ---------- */
const boot = document.querySelector('[data-boot]');
let prev = performance.now();

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000));
  prev = now;
  elapsed += dt;

  if (easeTarget !== null) {
    t += (easeTarget - t) * Math.min(1, dt * 7);
    if (Math.abs(easeTarget - t) < 0.0015) {
      t = easeTarget;
      easeTarget = null;
    }
  }
  if (playing) {
    t += dt * 0.16;
    if (t >= 4) {
      t = 4;
      playing = false;
      ui.setPlaying(false);
    }
  }
  if (!reduceMotion && introK < 1) {
    introK = easeOutCubic((now - startedAt - 200) / 2400);
  }

  apply(t);
  ui.render(t);

  for (let i = 0; i < 5; i++) {
    if (eras[i].group.visible) eras[i].update(dt, elapsed);
  }

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    document.documentElement.dataset.ready = 'true';
    if (boot) {
      boot.classList.add('boot--gone');
      setTimeout(() => boot.remove(), 800);
    }
  }
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', resize);
resize();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) renderer.setAnimationLoop(null);
  else {
    prev = performance.now();
    renderer.setAnimationLoop(frame);
  }
});

startedAt = performance.now();
renderer.setAnimationLoop(frame);

/* small hook so the scene can be driven from a test or the console */
window.__valley = {
  ford: { ...FORD },
  pad: { ...PAD },
  scene,
  camera,
  water,
  seek: (v) => {
    t = clamp(v, 0, 4);
    easeTarget = null;
    apply(t);
  },
  state: () => ({ t, playing, weights: [...WEIGHTS], trees: forest.total }),
};
