import { FORD } from './terrain.js';

/* Every era's bridge lives on exactly these coordinates — the crossing is
 * the one thing in the scene that is not allowed to drift. */
const X0 = FORD.x0;
const X1 = FORD.x1;
const SPAN = X1 - X0;
const MIDX = (X0 + X1) / 2;
const Z = FORD.z;
const DECK = FORD.deck;

/** Two short ramps so no deck ever ends in a step. */
function aprons(kit, color) {
  const len = 3.4;
  const half = 0.22;
  for (const side of [-1, 1]) {
    const cx = side < 0 ? X0 - len / 2 : X1 + len / 2;
    const m = kit.boxC(len, 0.42, 3.4, color, cx, DECK - 0.34, Z);
    m.rotation.z = side < 0 ? half : -half;
  }
}

function timber(kit) {
  const wood = '#6b5136';
  const dark = '#54402a';

  kit.box(SPAN, 0.18, 2.5, wood, MIDX, DECK - 0.18, Z);
  for (const dz of [-0.85, 0.85]) {
    kit.box(SPAN, 0.26, 0.22, dark, MIDX, DECK - 0.44, Z + dz);
  }
  for (const x of [X0 + 0.7, MIDX, X1 - 0.7]) {
    kit.box(0.24, 0.24, 2.8, dark, x, DECK - 0.68, Z);
  }
  // trestles standing in the water
  for (const x of [X0 + 2.4, X1 - 2.4]) {
    for (const dz of [-0.95, 0.95]) {
      kit.cyl(0.17, 0.2, 3.6, 6, dark, x, -1.5, Z + dz);
    }
    kit.box(0.18, 0.18, 2.2, dark, x, DECK - 0.9, Z);
  }
  // handrails
  for (const dz of [-1.12, 1.12]) {
    for (const x of [X0 + 0.5, MIDX, X1 - 0.5]) {
      kit.box(0.12, 0.95, 0.12, dark, x, DECK, Z + dz);
    }
    kit.box(SPAN - 0.4, 0.08, 0.09, wood, MIDX, DECK + 0.95, Z + dz);
  }
  aprons(kit, '#6b5136');
}

function stone(kit) {
  const mason = '#9b968a';
  const dark = '#8e887a';
  const r = 2.8;
  const spring = DECK - 0.62 - r;

  kit.box(SPAN + 1.4, 0.55, 3.5, mason, MIDX, DECK - 0.55, Z);
  for (const dz of [-1.55, 1.55]) {
    kit.box(SPAN + 1.4, 0.4, 0.3, dark, MIDX, DECK, Z + dz);
  }

  // centre pier
  kit.box(1.5, 5.0, 3.6, dark, MIDX, -2.4, Z);

  // 7 voussoirs per arch, hung on a semicircle
  for (const [a, b] of [
    [X0, MIDX - 0.75],
    [MIDX + 0.75, X1],
  ]) {
    const cx = (a + b) / 2;
    for (let i = 0; i < 7; i++) {
      const th = Math.PI * (0.07 + (0.86 * i) / 6);
      const v = kit.boxC(
        0.6,
        0.52,
        3.5,
        mason,
        cx + Math.cos(th) * r,
        spring + Math.sin(th) * r,
        Z
      );
      v.rotation.z = th + Math.PI / 2;
    }
  }
  aprons(kit, '#8f8a7e');
}

function iron(kit) {
  const steel = '#5f625f';
  const stoneC = '#9b968a';
  const railH = 1.7;

  kit.box(SPAN, 0.3, 3.0, '#6e6257', MIDX, DECK - 0.3, Z);

  for (const dz of [-1.35, 1.35]) {
    kit.box(SPAN, 0.24, 0.22, steel, MIDX, DECK, Z + dz);
    kit.box(SPAN, 0.18, 0.22, steel, MIDX, DECK + railH, Z + dz);

    const posts = 5;
    for (let i = 0; i < posts; i++) {
      const x = X0 + 0.6 + ((SPAN - 1.2) * i) / (posts - 1);
      kit.boxC(0.15, 0.15, railH, steel, x, DECK + railH / 2, Z + dz);
    }
    for (let i = 0; i < posts - 1; i++) {
      const xa = X0 + 0.6 + ((SPAN - 1.2) * i) / (posts - 1);
      const xb = X0 + 0.6 + ((SPAN - 1.2) * (i + 1)) / (posts - 1);
      const len = Math.hypot(xb - xa, railH);
      const d = kit.boxC(len, 0.11, 0.11, steel, (xa + xb) / 2, DECK + railH / 2, Z + dz);
      d.rotation.z = Math.atan2(railH, xb - xa);
    }
  }

  for (const x of [X0 + 1.6, X1 - 1.6]) {
    kit.box(1.1, 3.8, 3.4, stoneC, x, -1.9, Z);
  }
  aprons(kit, '#6e6257');
}

function modern(kit, s) {
  const concrete = '#b4b6b2';
  const rail = '#8d9091';

  kit.box(SPAN + 2, 0.6, 6.4, concrete, MIDX, DECK - 0.6, Z);
  for (const dz of [-3.1, 3.1]) {
    kit.box(SPAN + 2, 0.45, 0.3, rail, MIDX, DECK - 0.05, Z + dz);
  }
  for (const dz of [-1.8, 1.8]) {
    kit.box(SPAN - 2.4, 0.12, 0.16, '#d8d8d2', MIDX, DECK - 0.02, Z + dz);
  }
  for (const x of [X0 + 2.2, X1 - 2.2]) {
    kit.box(1.6, 3.4, 5.0, '#a2a5a0', x, -1.7, Z);
  }

  // lamp standards
  for (const x of [X0 + 1.2, MIDX, X1 - 1.2]) {
    for (const dz of [-3.0, 3.0]) {
      kit.cyl(0.07, 0.07, 3.0, 5, rail, x, DECK, Z + dz);
      kit.sphere(0.16, '#ffe3b0', x, DECK + 3.05, Z + dz, {
        emissive: '#ffd9a0',
        emissiveIntensity: 2.4,
      });
    }
  }
  aprons(kit, concrete);
}

/**
 * @param {'none'|'timber'|'stone'|'iron'|'modern'} kind
 */
export function buildBridge(kind, kit) {
  if (kind === 'timber') timber(kit);
  else if (kind === 'stone') stone(kit);
  else if (kind === 'iron') iron(kit);
  else if (kind === 'modern') modern(kit);
  return { x0: X0, x1: X1, z: Z, deck: DECK };
}
