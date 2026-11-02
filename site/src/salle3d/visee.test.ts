// Le siège visé en 2D (cadrage MVP, R6) : le bon siège sur les 577 de la vraie salle, vus par une
// caméra factice ; les sièges superposés ; le rayon du doigt ; moins d'une milliseconde.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { cameraDessus } from './cadrage-haut.ts';
import { position, sieges3D } from './geometrie.ts';
import { grilleSieges, type PointVise } from './visee.ts';

const L = 1440, H = 900;
const projeter = (): PointVise[] => {
  const c = cameraDessus(L, H, L, H), v = new THREE.Vector3(), w = new THREE.Vector3();
  return sieges3D().map((s) => {
    const [x, y, z] = position(s, 0.55);
    v.set(x, y, z).project(c);
    w.set(x + 0.38 * Math.cos(s.th), y, z + 0.38 * Math.sin(s.th)).project(c);
    const px = (v.x + 1) * L / 2, py = (1 - v.y) * H / 2;
    return { x: px, y: py, r: Math.hypot((w.x + 1) * L / 2 - px, (1 - w.y) * H / 2 - py), d: c.position.distanceTo(new THREE.Vector3(x, y, z)) };
  });
};

test('sur la vraie salle, en Dessus, chaque siège se trouve lui-même', () => {
  const points = projeter(), viser = grilleSieges(points);
  assert.equal(points.length, 577);
  points.forEach((p, i) => assert.equal(viser(p.x, p.y), i));
});

test('hors de tout siège, rien ; dans le rayon du doigt, le plus proche', () => {
  const viser = grilleSieges([{ x: 100, y: 100, r: 8, d: 10 }, { x: 140, y: 100, r: 8, d: 10 }]);
  assert.equal(viser(120, 130), null);
  assert.equal(viser(112, 100), null);
  assert.equal(viser(112, 100, 22), 0);
  assert.equal(viser(128, 100, 22), 1);
  assert.equal(viser(100, 130, 22), null);
});

test('deux sièges superposés : le plus proche de la caméra', () => {
  const viser = grilleSieges([{ x: 50, y: 50, r: 10, d: 30 }, { x: 50, y: 50, r: 10, d: 12 }, { x: 50.2, y: 50, r: 10, d: 40 }]);
  assert.equal(viser(50, 50), 1);
});

test('un siège hors de l\'écran n\'existe pas', () => {
  assert.equal(grilleSieges([null, { x: 5, y: 5, r: 3, d: 1 }])(5, 5), 1);
});

test('un siège à cheval sur deux cases se trouve des deux côtés', () => {
  const viser = grilleSieges([{ x: 21.5, y: 21.5, r: 8, d: 1 }]);
  assert.equal(viser(23, 23), 0);
  assert.equal(viser(19, 19), 0);
});

test('moins d\'une milliseconde par visée', () => {
  const points = projeter(), viser = grilleSieges(points);
  const t0 = performance.now();
  for (let k = 0; k < 10000; k++) viser((k * 7) % L, (k * 13) % H);
  assert.ok((performance.now() - t0) / 10000 < 1);
});
