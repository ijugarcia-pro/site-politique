import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classer, colonnes, comparer, initiales, lisse, niveau, partCommeToi, precision, profil,
  teinte, type Matrice } from './profil.ts';

const matrice: Matrice = {
  votes: ['V1', 'V2', 'V3', 'V4'],
  deputes: [
    { u: 'PA1', n: 'Alice Martin', g: 'PO1', e: 1, s: 'PPCP' },
    { u: 'PA2', n: 'Bruno Petit', g: 'PO1', e: 1, s: 'PP--' },
    { u: 'PA3', n: 'Chloé Durand', g: 'PO2', e: 1, s: 'CCPA' },
    { u: 'PA4', n: 'David Leroy', g: null, e: 0, s: 'PPCP' }, // ancien député
    { u: 'PA5', n: 'Emma Roux', g: 'PO2', e: 1, s: '----' },
  ],
  groupes: [
    { u: 'PO1', sigle: 'GA', libelle: 'Groupe A', s: 'PPCP' },
    { u: 'PO2', sigle: 'GB', libelle: 'Groupe B', s: 'CCPC' },
  ],
};
const reponses = { V1: 'pour', V2: 'pour', V3: 'contre', V4: 'pour' } as const;

test('accord lissé et précision', () => {
  assert.equal(lisse(0, 0), 0.5);
  assert.equal(lisse(4, 4), 0.75);
  assert.equal(precision(0), 0);
  assert.ok(Math.abs(precision(20) - (1 - Math.exp(-1))) < 1e-12);
  assert.ok(precision(25) > 0.7 && precision(25) < 0.72);
});

test('comparaison : absences ignorées, abstention comptée comme différente', () => {
  const mes = colonnes(matrice, reponses);
  assert.deepEqual(mes, [[0, 'P'], [1, 'P'], [2, 'C'], [3, 'P']]);
  assert.deepEqual(comparer('PP--', mes), { communs: 2, identiques: 2, lisse: 4 / 6, taux: 100 });
  assert.deepEqual(comparer('CCPA', mes), { communs: 4, identiques: 0, lisse: 2 / 8, taux: 0 });
  assert.deepEqual(comparer('----', mes), { communs: 0, identiques: 0, lisse: 0.5, taux: null });
});

test('jumeau, opposé et groupes', () => {
  const p = profil(matrice, reponses);
  assert.equal(p.reponses, 4);
  // Alice : 4 sur 4 (lissé 0,75) devant Bruno : 2 sur 2 (0,67) ; David, ancien député, exclu ;
  // Emma, sans vote en commun, n'est pas classée.
  assert.deepEqual(p.deputes.map((d) => d.ligne.u), ['PA1', 'PA2', 'PA3']);
  assert.equal(p.jumeau?.ligne.u, 'PA1');
  assert.equal(p.oppose?.ligne.u, 'PA3');
  assert.deepEqual(p.groupes.map((g) => [g.ligne.sigle, g.taux]), [['GA', 100], ['GB', 0]]);
});

test('aucune réponse : pas de jumeau ni de groupe', () => {
  const p = profil(matrice, {});
  assert.equal(p.jumeau, null);
  assert.equal(p.oppose, null);
  assert.deepEqual(p.groupes, []);
  assert.equal(p.precision, 0);
});

test('une seule réponse suffit pour montrer un jumeau', () => {
  const p = profil(matrice, { V3: 'pour' });
  // Seule Chloé a voté pour au vote 3 ; Alice et David contre, Bruno absent.
  assert.equal(p.jumeau?.ligne.u, 'PA3');
  assert.equal(p.jumeau?.communs, 1);
});

test('égalité : le plus de votes en commun, puis le nom', () => {
  const lignes = [
    { n: 'Zoé', s: 'PP' },
    { n: 'Anne', s: 'PP' },
    { n: 'Marc', s: 'P-' },
  ];
  const mes: [number, string][] = [[0, 'P'], [1, 'P']];
  assert.deepEqual(classer(lignes, mes).map((c) => c.ligne.n), ['Anne', 'Zoé', 'Marc']);
});

test('part des députés qui ont voté comme toi', () => {
  // Vote 1 : trois pour (Alice, Bruno, David) et un contre (Chloé) parmi les exprimés.
  assert.equal(partCommeToi(matrice, 0, 'pour'), 75);
  assert.equal(partCommeToi(matrice, 0, 'contre'), 25);
  assert.equal(partCommeToi({ ...matrice, deputes: [] }, 0, 'pour'), null);
});

test('teintes et initiales', () => {
  assert.equal(teinte(null), '#FFFFFF');
  assert.equal(teinte(0.2), '#DFE3EB');
  assert.equal(teinte(0.6), '#A98BFF');
  assert.equal(teinte(0.9), '#6A3DF0');
  assert.equal(niveau(0.67).haut, true);
  assert.equal(niveau(0.66).haut, false);
  assert.equal(initiales('Charles de Courson'), 'CC');
  assert.equal(initiales('Jean-Luc Mélenchon'), 'JM');
  assert.equal(initiales('Marie-France Lorho'), 'ML');
});
