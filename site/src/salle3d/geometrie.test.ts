import assert from 'node:assert/strict';
import { test } from 'node:test';
import { places, SIEGES } from '../lib/hemicycle.ts';
import { echelleFauteuil, LARGEUR_FAUTEUIL, P, rangees, repartir, sieges3D } from './geometrie.ts';

const rad = (d: number) => (d * Math.PI) / 180;

test('les 577 sièges du plan 2D sont les sièges de la salle, dans le même ordre', () => {
  const liste = places();
  const s = sieges3D(liste);
  assert.equal(s.length, SIEGES);
  s.forEach((x, i) => {
    assert.equal(x.i, i);
    assert.equal(x.rang, liste[i].rangee);
  });
});

test('dans chaque rangée, l’ordre des angles est gardé et aucun siège n’est dans une allée', () => {
  const liste = places();
  const s = sieges3D(liste);
  for (let k = 0; k < P.NR; k++) {
    const rangee = s.filter((x) => x.rang === k).sort((a, b) => liste[a.i].angle - liste[b.i].angle);
    for (let q = 1; q < rangee.length; q++) assert.ok(rangee[q].th > rangee[q - 1].th);
    for (const x of rangee) {
      for (const a of P.ALLEES) assert.ok(Math.abs(x.th - rad(a)) * x.r > P.ALLEE / 2 - 1e-9, `allée ${a}°`);
      assert.ok(x.th > rad(P.TH0) && x.th < rad(P.TH1));
    }
  }
});

test('un groupe garde une part contiguë : les secteurs croissent avec l’angle du plan', () => {
  const liste = places();
  const s = sieges3D(liste);
  const ordre = s.map((x) => x).sort((a, b) => liste[a.i].angle - liste[b.i].angle);
  for (let k = 0; k < P.NR; k++) {
    const secs = ordre.filter((x) => x.rang === k).map((x) => x.secteur);
    for (let q = 1; q < secs.length; q++) assert.ok(secs[q] >= secs[q - 1]);
  }
});

test('répartition au plus fort reste : somme exacte', () => {
  assert.deepEqual(repartir(10, [1, 1, 1]), [4, 3, 3]);
  assert.equal(repartir(25, rangees()[0].secteurs.map((x) => x.l)).reduce((a, b) => a + b, 0), 25);
});

test('les fauteuils ne se chevauchent pas', () => {
  for (const x of sieges3D()) {
    assert.ok(LARGEUR_FAUTEUIL * echelleFauteuil(x.pas) <= x.pas - 0.019, `siège ${x.i}`);
  }
});
