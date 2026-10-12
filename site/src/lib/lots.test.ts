import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { prochainLot, suiteDesLots } from './lots.ts';
import { precision, VOTES_FIABLES } from './profil.ts';
import { puceTheme, PUCES_THEMES } from './themes.ts';

test('le prochain lot est le premier pas encore fait', () => {
  assert.equal(prochainLot([], 5), 0);
  assert.equal(prochainLot([0, 1], 5), 2);
  assert.equal(prochainLot([1], 5), 0);
  assert.equal(prochainLot([0, 1, 2, 3, 4], 5), null);
});

test('la suite : le parcours d\'abord, puis les lots facultatifs, puis rien', () => {
  assert.deepEqual(suiteDesLots([], 5, 9),
    { lot: 0, facultatif: false, resteParcours: 5, resteFacultatifs: 4 });
  assert.deepEqual(suiteDesLots([0, 1, 2, 3], 5, 9),
    { lot: 4, facultatif: false, resteParcours: 1, resteFacultatifs: 4 });
  // Le lot 5 fait : le lot 6 se propose, il est facultatif.
  assert.deepEqual(suiteDesLots([0, 1, 2, 3, 4], 5, 9),
    { lot: 5, facultatif: true, resteParcours: 0, resteFacultatifs: 4 });
  assert.deepEqual(suiteDesLots([0, 1, 2, 3, 4, 5, 6, 7], 5, 9),
    { lot: 8, facultatif: true, resteParcours: 0, resteFacultatifs: 1 });
  // Le lot 9 est la fin.
  assert.deepEqual(suiteDesLots([0, 1, 2, 3, 4, 5, 6, 7, 8], 5, 9),
    { lot: null, facultatif: false, resteParcours: 0, resteFacultatifs: 0 });
  // Sans lot facultatif, rien ne suit le parcours.
  assert.equal(suiteDesLots([0, 1, 2, 3, 4], 5, 5).lot, null);
});

test('les lots versionnés : le parcours mène au seuil de fiabilité, les facultatifs affinent', () => {
  const lire = (nom: string) => JSON.parse(readFileSync(new URL(`../../../data/${nom}`, import.meta.url), 'utf-8'));
  const quiz = lire('quiz.json') as unknown[];
  const lots = lire('lots.json') as { lot: number; facultatif?: boolean; cartes: unknown[] }[];
  const parcours = lots.filter((l) => !l.facultatif);
  // Les lots facultatifs viennent après ceux du parcours.
  assert.deepEqual(lots.map((l) => !!l.facultatif), lots.map((_, k) => k >= parcours.length));
  assert.equal(quiz.length + parcours.reduce((n, l) => n + l.cartes.length, 0), VOTES_FIABLES);
  // La jauge après chaque lot, du quiz au dernier lot facultatif.
  let n = quiz.length;
  const jauge = lots.map((l) => Math.round(100 * precision(n += l.cartes.length)));
  assert.deepEqual(jauge, [48, 55, 61, 67, 71, 75, 79, 82, 84]);
});

test('chaque thème a sa puce, un thème inconnu prend la violette', () => {
  assert.equal(Object.keys(PUCES_THEMES).length, 12);
  assert.equal(puceTheme('Logement'), '#FFE4E0:#B3261E');
  assert.equal(puceTheme('Inconnu'), '#E8E1FF:#5B35E6');
});
