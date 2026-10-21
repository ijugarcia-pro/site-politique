import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APPARENCE_DEFAUT, COIFFURES, couleursDe, lireApparence, PEAUX, TENUES } from './apparence.ts';
import { chemin, FAUTEUIL_578, longueur, P, sieges3D, surChemin } from './geometrie.ts';

test('6 peaux, 6 coiffures, 5 tenues ; les tenues n’ont aucune couleur de vote', () => {
  assert.equal(PEAUX.length, 6);
  assert.equal(COIFFURES.length, 6);
  assert.equal(TENUES.length, 5);
  const VOTES = ['#2F7BFF', '#FF6A3D', '#FFC531'];
  for (const t of TENUES) assert.ok(!VOTES.includes(t.haut.toUpperCase()) && !VOTES.includes(t.bas.toUpperCase()));
});

test('une apparence illisible reprend les choix par défaut', () => {
  assert.deepEqual(lireApparence(null), APPARENCE_DEFAUT);
  assert.deepEqual(lireApparence({ peau: 'p6', coiffure: 'inconnue', tenue: 42 }),
    { ...APPARENCE_DEFAUT, peau: 'p6' });
  assert.equal(couleursDe(lireApparence({ tenue: 'ecru' })).haut, '#E3DCCB');
});

test('le chemin part du 578e fauteuil, passe par une allée et finit au siège', () => {
  const s = sieges3D();
  for (const k of [0, 100, 288, 400, 576]) {
    const c = chemin(s[k]);
    assert.ok(Math.hypot(c[0][0] - FAUTEUIL_578.x, c[0][2] - (FAUTEUIL_578.z + 0.5)) < 1e-9);
    const fin = c[c.length - 1];
    assert.ok(Math.hypot(fin[0] - s[k].r * Math.cos(s[k].th), fin[2] - s[k].r * Math.sin(s[k].th)) < 1e-9);
    // Le pied de l'allée est sur l'une des 5 allées.
    const a = Math.atan2(c[1][2], c[1][0]) * 180 / Math.PI;
    assert.ok(P.ALLEES.some((x) => Math.abs(x - a) < 1e-6), `allée ${a}`);
    // Jamais au-delà de la colonnade.
    for (const p of c) assert.ok(Math.hypot(p[0], p[2]) < P.RCOL);
    const fin2 = surChemin(c, longueur(c) + 10).p;
    assert.ok(Math.hypot(fin2[0] - fin[0], fin2[2] - fin[2]) < 1e-9);
  }
});
