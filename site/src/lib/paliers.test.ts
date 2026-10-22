import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dossiers, nouveauxPaliers, palierAtteint, PALIERS, paliersAAnnoncer, prochainPalier,
  votesTranches } from './paliers.ts';

/** n réponses « pour » sur des votes V1 à Vn. */
const tranches = (n: number) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`V${i + 1}`, 'pour']));

test('les seuils : 10, 25, 40', () => {
  assert.deepEqual(PALIERS.map((p) => [p.id, p.seuil]),
    [['place', 10], ['salle-eclairee', 25], ['bilan', 40]]);
  const atteint = (n: number) => palierAtteint(n)?.id ?? null;
  assert.equal(atteint(0), null);
  assert.equal(atteint(9), null);
  assert.equal(atteint(10), 'place');
  assert.equal(atteint(24), 'place');
  assert.equal(atteint(25), 'salle-eclairee');
  assert.equal(atteint(39), 'salle-eclairee');
  assert.equal(atteint(40), 'bilan');
  assert.equal(atteint(400), 'bilan');
});

test('le prochain palier et ce qui manque', () => {
  assert.deepEqual([prochainPalier(9)?.palier.id, prochainPalier(9)?.reste], ['place', 1]);
  assert.deepEqual([prochainPalier(10)?.palier.id, prochainPalier(10)?.reste], ['salle-eclairee', 15]);
  assert.deepEqual([prochainPalier(24)?.palier.id, prochainPalier(24)?.reste], ['salle-eclairee', 1]);
  assert.deepEqual([prochainPalier(25)?.palier.id, prochainPalier(25)?.reste], ['bilan', 15]);
  assert.deepEqual([prochainPalier(39)?.palier.id, prochainPalier(39)?.reste], ['bilan', 1]);
  assert.equal(prochainPalier(40), null);
});

test('les paliers franchis entre deux comptes', () => {
  assert.deepEqual(nouveauxPaliers(9, 10).map((p) => p.id), ['place']);
  assert.deepEqual(nouveauxPaliers(10, 11), []);
  assert.deepEqual(nouveauxPaliers(24, 25).map((p) => p.id), ['salle-eclairee']);
  assert.deepEqual(nouveauxPaliers(39, 40).map((p) => p.id), ['bilan']);
  assert.deepEqual(nouveauxPaliers(0, 40).map((p) => p.id), ['place', 'salle-eclairee', 'bilan']);
  assert.deepEqual(nouveauxPaliers(12, 9), []);
});

test('« Je ne sais pas » ne compte pas ; seuls les votes de la matrice comptent', () => {
  const reps = { ...tranches(9), X1: null, X2: '', X3: undefined };
  assert.equal(votesTranches(reps), 9);
  assert.equal(palierAtteint(votesTranches(reps)), null);
  // Le format de 578e.reponses.v1 : { v, le }.
  assert.equal(votesTranches({ A: { v: 'pour' }, B: { v: 'contre' }, C: { v: null } }), 2);
  // Hors de la matrice (motion de censure, vote sans page) : ne compte pas.
  assert.equal(votesTranches(tranches(10), ['V1', 'V2', 'V3']), 3);
});

test('un palier ne s\'annonce qu\'une fois', () => {
  assert.deepEqual(paliersAAnnoncer(9, []), []);
  assert.deepEqual(paliersAAnnoncer(10, []).map((p) => p.id), ['place']);
  assert.deepEqual(paliersAAnnoncer(10, ['place']), []);
  assert.deepEqual(paliersAAnnoncer(26, ['place']).map((p) => p.id), ['salle-eclairee']);
  assert.deepEqual(paliersAAnnoncer(41, ['place', 'salle-eclairee', 'bilan']), []);
});

test('un dossier s\'ouvre au 3e vote tranché du thème', () => {
  const cartes = [
    { uid: 'S1', theme: 'Santé' }, { uid: 'S2', theme: 'Santé' }, { uid: 'S3', theme: 'Santé' },
    { uid: 'S3', theme: 'Santé' }, // la même carte en double (lot et séance) : un seul vote
    { uid: 'L1', theme: 'Logement' },
    { uid: 'Q1', theme: 'Fin de vie' }, // thème hors de la liste fermée : aucun dossier
  ];
  const sante = (reps: Record<string, string | null>) =>
    dossiers(reps, cartes).find((d) => d.theme === 'Santé')!;
  assert.deepEqual(sante({}), { theme: 'Santé', votes: ['S1', 'S2', 'S3'], tranches: 0,
    ouvert: false, reste: 3 });
  assert.equal(sante({ S1: 'pour', S2: 'contre' }).ouvert, false);
  assert.equal(sante({ S1: 'pour', S2: 'contre', S3: null }).reste, 1);
  assert.equal(sante({ S1: 'pour', S2: 'contre', S3: 'pour' }).ouvert, true);
  const tous = dossiers({}, cartes);
  assert.equal(tous.length, 12);
  assert.ok(!tous.some((d) => d.theme === 'Fin de vie'));
  assert.deepEqual(tous.find((d) => d.theme === 'Logement')?.votes, ['L1']);
});
