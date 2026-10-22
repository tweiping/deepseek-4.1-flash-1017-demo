import * as THREE from 'three';
import { ribbonGeometry } from '../util.js';
import { RIVER_LEVEL, riverX, riverWidth } from './terrain.js';

const vert = /* glsl */ `
#include <fog_pars_vertex>
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorld = worldPos.xyz;
  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const frag = /* glsl */ `
#include <fog_pars_fragment>
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uSun;
varying vec2 vUv;
varying vec3 vWorld;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += vnoise(p) * a;
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 p = vec2(vUv.x * 3.2, vUv.y * 26.0);
  float n1 = fbm(p + vec2(0.0, -uTime * 0.5));
  float n2 = fbm(p * 1.9 + vec2(3.7, uTime * 0.8));
  float ripple = n1 * 0.62 + n2 * 0.38;

  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);

  vec3 col = mix(uDeep, uShallow, smoothstep(0.3, 0.9, ripple));
  col = mix(col, uSky, fres * 0.26);

  float glint = pow(max(ripple - 0.64, 0.0) * 2.4, 6.0);
  col += uSun * glint * 1.1;

  gl_FragColor = vec4(col, 0.96);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createWater() {
  const pts = [];
  for (let z = -152; z <= 152; z += 2) pts.push({ x: riverX(z), z });

  const geo = ribbonGeometry(
    pts,
    (i) => riverWidth(pts[i].z),
    RIVER_LEVEL,
    4
  );

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#2b3a3f') },
      uShallow: { value: new THREE.Color('#55706e') },
      uSky: { value: new THREE.Color('#b5876a') },
      uSun: { value: new THREE.Color('#ffb877') },
    },
  ]);

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    side: THREE.DoubleSide,
    fog: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'water';
  mesh.renderOrder = 1;

  return {
    mesh,
    update(time, palette) {
      mat.uniforms.uTime.value = time;
      if (palette) {
        mat.uniforms.uDeep.value.copy(palette.deep);
        mat.uniforms.uShallow.value.copy(palette.shallow);
        mat.uniforms.uSky.value.copy(palette.sky);
        mat.uniforms.uSun.value.copy(palette.sun);
      }
    },
  };
}
