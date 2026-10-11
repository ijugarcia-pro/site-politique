import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arc, etiquette, etiquettes, LARGEUR, parts, places, RAYON_SIEGE, SIEGES } from './hemicycle.ts';

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

test('les parts des groupes, sièges vacants exclus', () => {
  assert.deepEqual(parts(['A', 'A', 'B', null, 'C', 'C', '']), [
    { groupe: 'A', debut: 0, fin: 1 }, { groupe: 'B', debut: 2, fin: 2 },
    { groupe: 'C', debut: 4, fin: 5 },
  ]);
});

test("l'arc d'une part va de son premier à son dernier siège, par le haut", () => {
  const liste = places();
  assert.equal(arc(liste, { debut: 0, fin: SIEGES - 1 }, 100), 'M400.0 490.0A100 100 0 0 1 600.0 490.0');
});

test("les étiquettes restent au même rayon tant qu'elles ne se chevauchent pas", () => {
  const liste = places();
  const lesParts = [{ groupe: 'A', debut: 0, fin: 99 }, { groupe: 'B', debut: 100, fin: 299 },
    { groupe: 'C', debut: 300, fin: 309 }, { groupe: 'D', debut: 310, fin: 319 }];
  const rayon = (e: { x: number; y: number }) => Math.hypot(e.x - LARGEUR / 2, e.y - 490);
  const [a, b, c, d] = etiquettes(liste, lesParts, () => 50, 30);
  assert.ok(Math.abs(rayon(a) - rayon(b)) < 1e-6 && Math.abs(rayon(a) - rayon(c)) < 1e-6);
  assert.ok(rayon(d) > rayon(c) + 29); // trop proche de C : éloignée
});
