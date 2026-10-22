import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accord } from './accord.ts';

const votes = [
  { uid: 'V1', vote: 'pour' },
  { uid: 'V2', vote: 'contre' },
  { uid: 'V3', vote: 'abstention' },
  { uid: 'V4', vote: 'absent' },
  { uid: 'V5', vote: 'non_votant' },
  { uid: 'V6', vote: 'pour' },
];

test('aucune réponse', () => {
  assert.deepEqual(accord(votes, {}),
    { n: 0, identiques: 0, contraires: 0, absents: 0, taux: null });
});

test("une absence n'est pas un accord", () => {
  // Absent, non-votant, ou vote hors de son mandat (V9) : compté dans N, jamais identique.
  assert.deepEqual(accord(votes, { V1: 'pour', V4: 'pour', V5: 'contre', V9: 'pour' }),
    { n: 4, identiques: 1, contraires: 0, absents: 3, taux: 25 });
});

test("l'abstention du député compte comme un vote contraire", () => {
  assert.deepEqual(accord(votes, { V1: 'pour', V2: 'pour', V3: 'contre' }),
    { n: 3, identiques: 1, contraires: 2, absents: 0, taux: 33 });
});

test('les motions de censure sont exclues', () => {
  assert.deepEqual(accord(votes, { V1: 'pour', V6: 'pour' }, new Set(['V6'])),
    { n: 1, identiques: 1, contraires: 0, absents: 0, taux: 100 });
});
