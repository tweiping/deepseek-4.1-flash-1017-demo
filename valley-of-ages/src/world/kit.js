import * as THREE from 'three';

/**
 * Small primitive kit. Every era builds from these, and every material is
 * cached per era so a whole group can share a handful of shader programs.
 */
export function createKit(group) {
  const cache = new Map();
  const roofCache = new Map();
  const fades = [];

  function mat(color, o = {}) {
    const rough = o.rough ?? 0.92;
    const metal = o.metal ?? 0;
    const emissive = o.emissive ?? null;
    const ei = o.emissiveIntensity ?? 1;
    const mapKey = o.map ? o.map.uuid : '-';
    const key = `${color}|${rough}|${metal}|${emissive}|${ei}|${mapKey}`;
    if (cache.has(key)) return cache.get(key);

    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
    });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = ei;
    }
    if (o.map) {
      m.map = o.map;
      m.emissiveMap = o.map;
      m.emissive = new THREE.Color('#ffffff');
      m.emissiveIntensity = o.emissiveIntensity ?? 1;
    }
    cache.set(key, m);
    return m;
  }

  function roofMat(color) {
    if (roofCache.has(color)) return roofCache.get(color);
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    roofCache.set(color, m);
    return m;
  }

  function add(mesh, cast = true, receive = true) {
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    group.add(mesh);
    return mesh;
  }

  /** Box sitting on its own base: y is the bottom, not the centre. */
  function box(w, h, d, color, x, y, z, ry = 0, o = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, o));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = ry;
    return add(m, o.cast ?? true, o.receive ?? true);
  }

  function boxC(w, h, d, color, x, y, z, ry = 0, o = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, o));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    return add(m, o.cast ?? true, o.receive ?? true);
  }

  function cyl(rTop, rBot, h, seg, color, x, y, z, ry = 0, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat(color, o));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = ry;
    return add(m, o.cast ?? true, o.receive ?? true);
  }

  function cone(r, h, seg, color, x, y, z, ry = 0, o = {}) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color, o));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = ry;
    return add(m, o.cast ?? true, o.receive ?? true);
  }

  function sphere(r, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, o.seg ?? 10, o.rings ?? 8),
      mat(color, o)
    );
    m.position.set(x, y, z);
    return add(m, o.cast ?? true, o.receive ?? true);
  }

  /** Gable roof, ridge running along Z, base sitting at y. */
  function roof(w, h, d, color, x, y, z, ry = 0) {
    const hw = w / 2;
    const hd = d / 2;
    const A = [-hw, 0, -hd];
    const B = [hw, 0, -hd];
    const C = [0, h, -hd];
    const D = [-hw, 0, hd];
    const E = [hw, 0, hd];
    const F = [0, h, hd];
    const v = [];
    const quad = (a, b, c, dd) => {
      v.push(...a, ...b, ...c, ...a, ...c, ...dd);
    };
    quad(A, C, F, D);
    quad(E, B, C, F);
    v.push(...A, ...B, ...C);
    v.push(...E, ...D, ...F);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();

    const m = new THREE.Mesh(geo, roofMat(color));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    return add(m);
  }

  /** Decal material: transparent so ground detail can cross-fade with the era. */
  function matFaded(color, o = {}) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 1,
      metalness: 0,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    fades.push(m);
    return m;
  }

  /** A flat patch lying on the terrace. */
  function plate(w, d, color, x, y, z, ry = 0, o = {}) {
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, matFaded(color, o));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }

  /** Open-ended ring wall (palisade, curtain wall, stadium). */
  function ring(r, h, thick, color, x, y, z, thetaStart = 0, thetaLength = Math.PI * 2) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 40, 1, true, thetaStart, thetaLength),
      mat(color, { rough: 0.95 })
    );
    m.position.set(x, y + h / 2, z);
    m.material.side = THREE.DoubleSide;
    return add(m);
  }

  return { mat, matFaded, box, boxC, cyl, cone, sphere, roof, plate, ring, add, fades };
}
