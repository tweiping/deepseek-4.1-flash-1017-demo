import * as THREE from 'three';
import { mulberry32, radialTexture } from '../util.js';

const plumeVert = /* glsl */ `
uniform float uTime;
uniform float uRise;
uniform float uDrift;
uniform float uSize;
attribute float aSeed;
varying float vAlpha;

void main() {
  float life = fract(aSeed + uTime * 0.055);
  vec3 p = position;
  p.y += life * uRise;
  p.x += life * life * uDrift;
  p.z += life * life * uDrift * 0.4;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.35 + life * 1.7) * (360.0 / max(0.001, -mv.z));
  gl_Position = projectionMatrix * mv;
  vAlpha = (1.0 - life) * smoothstep(0.0, 0.1, life);
}
`;

const plumeFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float falloff = smoothstep(1.0, 0.15, r);
  gl_FragColor = vec4(uColor, vAlpha * uOpacity * falloff);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * A drifting column of puffs: hearth smoke, chimney smoke.
 * @param {{x:number,y:number,z:number}} origin
 */
export function createPlume({
  origin,
  count = 26,
  spread = 0.5,
  rise = 16,
  drift = 6,
  size = 2.4,
  color = '#b9b2a6',
  opacity = 0.5,
  speed = 1,
}) {
  const rand = mulberry32(1337);
  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = origin.x + (rand() - 0.5) * spread;
    pos[i * 3 + 1] = origin.y;
    pos[i * 3 + 2] = origin.z + (rand() - 0.5) * spread;
    seeds[i] = rand();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uRise: { value: rise },
    uDrift: { value: drift },
    uSize: { value: size },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: plumeVert,
    fragmentShader: plumeFrag,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;

  return {
    object: points,
    update(t) {
      uniforms.uTime.value = t * speed;
    },
  };
}

/** Additive halo, used for the plaque and street lamps. */
export function createGlow(position, size = 3, color = '#ffca8a', opacity = 0.55) {
  const mat = new THREE.SpriteMaterial({
    map: radialTexture(64),
    color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(position);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 5;
  return sprite;
}
