import assert from 'node:assert/strict';
import { test } from 'node:test';
import { etiquette, LARGEUR, places, RAYON_SIEGE, SIEGES } from './hemicycle.ts';

test('577 places, de gauche à droite', () => {
  const liste = places();
  assert.equal(liste.length, SIEGES);
  for (let i = 1; i < liste.length; i++) assert.ok(liste[i].angle >= liste[i - 1].angle);
  assert.ok(liste[0].x < LARGEUR / 2 && liste[SIEGES - 1].x > LARGEUR / 2);
});

test('aucun siège ne se chevauche', () => {
  const liste = places();
  let minimum = Infinity;
  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      minimum = Math.min(minimum, Math.hypot(liste[i].x - liste[j].x, liste[i].y - liste[j].y));
    }
  }
  assert.ok(minimum > 2 * RAYON_SIEGE, `distance minimale ${minimum}`);
});

test("l'étiquette d'un groupe est au milieu de sa part", () => {
  const liste = places();
  const e = etiquette(liste, 0, SIEGES - 1);
  assert.ok(Math.abs(e.x - LARGEUR / 2) < 1e-9);
  assert.ok(Math.abs(e.rotation) < 1e-9);
});
