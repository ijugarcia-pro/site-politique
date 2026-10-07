import assert from 'node:assert/strict';
import { test } from 'node:test';
import { circoDuPoint, codePostalValide, conclure, contient, departementDe, libelleCirco,
  prefixe, type Geometrie } from './geo.ts';

const carre = (x: number, y: number, c = 1): [number, number][] =>
  [[x, y], [x + c, y], [x + c, y + c], [x, y + c], [x, y]];

test('code postal et circonscription', () => {
  assert.ok(codePostalValide('75011'));
  assert.ok(!codePostalValide('7501'));
  assert.ok(!codePostalValide('75 011'));
  assert.equal(prefixe('97400'), '97');
  assert.equal(departementDe('971-2'), '971');
  assert.equal(libelleCirco('75-1'), '1re circonscription');
  assert.equal(libelleCirco('75-12'), '12e circonscription');
});

test('conclure à partir des communes du code postal', () => {
  assert.deepEqual(conclure(undefined), { type: 'inconnu' });
  assert.deepEqual(conclure([{ n: 'A', c: ['01-5'] }]), { type: 'trouve', circo: '01-5' });
  // Deux communes dans la même circonscription : pas besoin de choisir.
  assert.deepEqual(conclure([{ n: 'A', c: ['01-5'] }, { n: 'B', c: ['01-5'] }]),
    { type: 'trouve', circo: '01-5' });
  const deux = [{ n: 'A', c: ['01-5'] }, { n: 'B', c: ['01-4'] }];
  assert.deepEqual(conclure(deux), { type: 'communes', communes: deux });
  assert.deepEqual(conclure([{ n: 'Paris 11', c: ['75-5', '75-6'], a: 1 }]),
    { type: 'adresse', candidates: ['75-5', '75-6'] });
  // Une seule circonscription, mais commune absente de la table : on vérifie l'adresse.
  assert.deepEqual(conclure([{ n: 'C', c: ['01-5'], a: 1 }]),
    { type: 'adresse', candidates: ['01-5'] });
});

test('point dans un polygone, avec trou et multipolygone', () => {
  const avecTrou: Geometrie = { type: 'Polygon', coordinates: [carre(0, 0, 10), carre(4, 4, 2)] };
  assert.ok(contient(avecTrou, [1, 1]));
  assert.ok(!contient(avecTrou, [5, 5]));
  assert.ok(!contient(avecTrou, [11, 1]));
  const iles: Geometrie = { type: 'MultiPolygon', coordinates: [[carre(0, 0)], [carre(5, 5)]] };
  assert.ok(contient(iles, [5.5, 5.5]));
  assert.ok(!contient(iles, [3, 3]));
});

test('circonscription du point, parmi les candidates', () => {
  const contours: Record<string, Geometrie> = {
    '75-5': { type: 'Polygon', coordinates: [carre(0, 0)] },
    '75-6': { type: 'Polygon', coordinates: [carre(1, 0)] },
  };
  assert.equal(circoDuPoint(contours, [1.5, 0.5]), '75-6');
  assert.equal(circoDuPoint(contours, [1.5, 0.5], ['75-5']), null);
  assert.equal(circoDuPoint(contours, [9, 9]), null);
});
