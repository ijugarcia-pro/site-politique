import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { couleurExacte } from './gestion-couleurs.ts';

test('les couleurs hexadécimales de la salle sont prises telles quelles, comme en r128', () => {
  assert.equal(THREE.ColorManagement.enabled, false);
  const soleil = new THREE.Color(0xffdcaa);
  assert.ok(Math.abs(soleil.g - 0xdc / 255) < 1e-6);
  assert.ok(Math.abs(soleil.b - 0xaa / 255) < 1e-6);
});

test('une couleur de vote ressort exactement (convertie à la main, rendue en sRGB)', () => {
  for (const hex of ['#2F7BFF', '#FF6A3D', '#FFC531', '#F2EEE6']) {
    const c = couleurExacte(hex);
    assert.ok(c.r <= 1 && c.g <= 1 && c.b <= 1);
    assert.equal(`#${c.clone().convertLinearToSRGB().getHexString()}`, hex.toLowerCase());
  }
  // En linéaire, le bleu « pour » a une composante rouge bien plus faible qu'en sRGB.
  assert.ok(couleurExacte('#2F7BFF').r < 0.05);
});
