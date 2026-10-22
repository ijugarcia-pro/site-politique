import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classer, colonnes, comparer, initiales, niveau, partCommeToi, precision, profil,
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

test('précision', () => {
  assert.equal(precision(0), 0);
  assert.ok(Math.abs(precision(20) - (1 - Math.exp(-1))) < 1e-12);
  assert.ok(precision(25) > 0.7 && precision(25) < 0.72);
});

test('comparaison : identiques, contraires (abstention comprise), absents', () => {
  const mes = colonnes(matrice, reponses);
  assert.deepEqual(mes, [[0, 'P'], [1, 'P'], [2, 'C'], [3, 'P']]);
  assert.deepEqual(comparer('PP--', mes),
    { identiques: 2, contraires: 0, absents: 2, part: 0.5, taux: 50 });
  assert.deepEqual(comparer('CCPA', mes),
    { identiques: 0, contraires: 4, absents: 0, part: 0, taux: 0 });
  assert.deepEqual(comparer('----', mes),
    { identiques: 0, contraires: 0, absents: 4, part: 0, taux: 0 });
  assert.deepEqual(comparer('PPCP', []),
    { identiques: 0, contraires: 0, absents: 0, part: 0, taux: null });
});

test('jumeau, opposé et groupes', () => {
  const p = profil(matrice, reponses);
  assert.equal(p.reponses, 4);
  // Alice : 4 identiques devant Bruno : 2 identiques et 2 absences ; David, ancien député,
  // exclu ; Emma, toujours absente, n'est pas classée.
  assert.deepEqual(p.deputes.map((d) => d.ligne.u), ['PA1', 'PA2', 'PA3']);
  assert.equal(p.jumeau?.ligne.u, 'PA1');
  assert.equal(p.egalites, 0);
  assert.equal(p.oppose?.ligne.u, 'PA3');
  assert.deepEqual(p.groupes.map((g) => [g.ligne.sigle, g.taux]), [['GA', 100], ['GB', 0]]);
});

test('aucune réponse : pas de jumeau ni de groupe', () => {
  const p = profil(matrice, {});
  assert.equal(p.jumeau, null);
  assert.equal(p.oppose, null);
  assert.equal(p.egalites, 0);
  assert.deepEqual(p.groupes, []);
  assert.equal(p.precision, 0);
});

test('un seul vote identique suffit pour montrer un jumeau', () => {
  const p = profil(matrice, { V3: 'pour' });
  // Seule Chloé a voté pour au vote 3 ; Alice contre, Bruno absent.
  assert.equal(p.jumeau?.ligne.u, 'PA3');
  assert.equal(p.jumeau?.identiques, 1);
  assert.equal(p.oppose?.ligne.u, 'PA1');
});

test('aucun vote identique : pas de jumeau', () => {
  const m: Matrice = { ...matrice, deputes: [{ u: 'PA1', n: 'Alice', g: null, e: 1, s: 'C' }],
    votes: ['V1'], groupes: [] };
  const p = profil(m, { V1: 'pour' });
  assert.equal(p.jumeau, null);
  assert.equal(p.oppose?.ligne.u, 'PA1');
});

/** Une ligne de 20 votes : `id` comme toi (toujours « pour »), `ct` contre, le reste absent. */
const ligne = (id: number, ct: number, abs: number) => 'P'.repeat(id) + 'C'.repeat(ct) + '-'.repeat(abs);
const vingt = Array.from({ length: 20 }, (_, i) => `V${i + 1}`);
const tousPour = Object.fromEntries(vingt.map((v) => [v, 'pour'])) as Record<string, 'pour'>;
const salle = (lignes: [string, string][]): Matrice => ({
  votes: vingt, groupes: [],
  deputes: lignes.map(([n, s], i) => ({ u: `PA${i}`, n, g: null, e: 1, s })),
});

test("l'exemple de Julien : une absence n'est pas un accord", () => {
  // 20 votes tranchés ; A : 15 comme toi, 3 autrement, 2 absences ; B : 9 comme toi,
  // 1 autrement, 10 absences. L'ancien accord lissé plaçait B devant (0,786 contre 0,773).
  const p = profil(salle([['B', ligne(9, 1, 10)], ['A', ligne(15, 3, 2)]]), tousPour);
  assert.equal(p.reponses, 20);
  assert.equal(p.jumeau?.ligne.n, 'A');
  assert.deepEqual([p.jumeau?.identiques, p.jumeau?.contraires, p.jumeau?.absents], [15, 3, 2]);
  assert.equal(p.deputes[1].ligne.n, 'B');
  assert.equal(p.deputes[1].absents, 10);
});

test('15 identiques et 5 contraires passent devant 14 identiques et 6 absences', () => {
  const p = profil(salle([['Assidu', ligne(14, 0, 6)], ['Présent', ligne(15, 5, 0)]]), tousPour);
  assert.deepEqual(p.deputes.map((d) => d.ligne.n), ['Présent', 'Assidu']);
});

test('à identiques égaux, le moins de contraires gagne, puis le nom', () => {
  const p = profil(salle([['Zoé', ligne(10, 4, 6)], ['Marc', ligne(10, 2, 8)],
    ['Anne', ligne(10, 4, 6)]]), tousPour);
  assert.deepEqual(p.deputes.map((d) => d.ligne.n), ['Marc', 'Anne', 'Zoé']);
  assert.equal(p.egalites, 0);
});

test('égalités : les autres députés au même couple que le jumeau', () => {
  const p = profil(salle([['Zoé', ligne(10, 2, 8)], ['Marc', ligne(10, 2, 8)],
    ['Anne', ligne(10, 2, 8)], ['Paul', ligne(10, 3, 7)]]), tousPour);
  assert.equal(p.jumeau?.ligne.n, 'Anne');
  assert.equal(p.egalites, 2);
});

test("l'opposé : le plus de contraires, jamais un député sans vote exprimé", () => {
  const p = profil(salle([['Absent', ligne(0, 0, 20)], ['Proche', ligne(18, 1, 1)],
    ['Loin', ligne(2, 12, 6)], ['Rare', ligne(0, 3, 17)]]), tousPour);
  assert.equal(p.oppose?.ligne.n, 'Loin');
  assert.ok(!p.deputes.some((d) => d.ligne.n === 'Absent'));
  // À contraires égaux, le moins d'identiques.
  const q = profil(salle([['Un', ligne(5, 6, 9)], ['Deux', ligne(1, 6, 13)],
    ['Trois', ligne(19, 0, 1)]]), tousPour);
  assert.equal(q.oppose?.ligne.n, 'Deux');
  // Personne n'a voté contre toi : pas d'opposé.
  const r = profil(salle([['Un', ligne(5, 0, 15)], ['Deux', ligne(3, 0, 17)]]), tousPour);
  assert.equal(r.oppose, null);
});

test('les groupes suivent la même règle', () => {
  const m: Matrice = { votes: vingt, deputes: [], groupes: [
    { u: 'PO1', sigle: 'GB', libelle: 'Groupe B', s: ligne(9, 1, 10) },
    { u: 'PO2', sigle: 'GA', libelle: 'Groupe A', s: ligne(15, 3, 2) },
    { u: 'PO3', sigle: 'GC', libelle: 'Groupe C', s: ligne(15, 1, 4) },
  ] };
  assert.deepEqual(profil(m, tousPour).groupes.map((g) => g.ligne.sigle), ['GC', 'GA', 'GB']);
});

test('classer : sans nom, le sigle départage', () => {
  const lignes = [{ sigle: 'ZZ', s: 'PP' }, { sigle: 'AA', s: 'PP' }, { sigle: 'MM', s: 'P-' }];
  const mes: [number, string][] = [[0, 'P'], [1, 'P']];
  assert.deepEqual(classer(lignes, mes).map((c) => c.ligne.sigle), ['AA', 'ZZ', 'MM']);
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
