import * as THREE from 'three';

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFrag = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunDir;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float up = d.y;

  vec3 col = mix(uHorizon, uTop, pow(clamp(up, 0.0, 1.0), 0.55));

  // haze band sitting on the horizon
  float haze = 1.0 - smoothstep(0.0, 0.32, abs(up));
  col = mix(col, uHorizon * 1.1, haze * 0.55);

  // underneath the horizon, fall away into shadow
  col = mix(col, uHorizon * 0.3, smoothstep(0.0, -0.4, up));

  float s = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSun * pow(s, 340.0) * 3.2;
  col += uSun * pow(s, 7.0) * 0.15;

  gl_FragColor = vec4(col, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createSky() {
  const uniforms = {
    uTop: { value: new THREE.Color('#25313d') },
    uHorizon: { value: new THREE.Color('#b5876a') },
    uSun: { value: new THREE.Color('#ffb877') },
    uSunDir: { value: new THREE.Vector3(-0.62, 0.2, 0.34).normalize() },
  };

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 20),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
  );
  mesh.name = 'sky';
  mesh.frustumCulled = false;

  return {
    mesh,
    update(p) {
      uniforms.uTop.value.copy(p.top);
      uniforms.uHorizon.value.copy(p.horizon);
      uniforms.uSun.value.copy(p.sunColor);
      uniforms.uSunDir.value.copy(p.sunDir);
    },
  };
}

/** One hemisphere + one shadow-casting sun, re-tinted from the era palette. */
export function createLighting() {
  const hemi = new THREE.HemisphereLight('#9fb0bd', '#3a3428', 0.5);
  hemi.position.set(0, 60, 0);

  const sun = new THREE.DirectionalLight('#ffcb96', 2.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -130;
  sun.shadow.camera.right = 130;
  sun.shadow.camera.top = 130;
  sun.shadow.camera.bottom = -130;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 460;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.38;

  const target = new THREE.Object3D();
  target.position.set(-26, 2, -2);
  sun.target = target;

  return {
    hemi,
    sun,
    target,
    update(p) {
      hemi.color.copy(p.hemiSky);
      hemi.groundColor.copy(p.hemiGround);
      hemi.intensity = p.hemiIntensity;

      sun.color.copy(p.sunColor);
      sun.intensity = p.sunIntensity;
      sun.position.copy(p.sunDir).multiplyScalar(200).add(target.position);
    },
  };
}
