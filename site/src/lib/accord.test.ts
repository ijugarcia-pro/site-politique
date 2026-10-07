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

test('aucun vote en commun', () => {
  assert.deepEqual(accord(votes, {}), { communs: 0, identiques: 0, taux: null });
  // Le député était absent ou non-votant : rien en commun.
  assert.deepEqual(accord(votes, { V4: 'pour', V5: 'contre' }),
    { communs: 0, identiques: 0, taux: null });
});

test("l'abstention du député compte comme un désaccord", () => {
  assert.deepEqual(accord(votes, { V1: 'pour', V2: 'pour', V3: 'contre' }),
    { communs: 3, identiques: 1, taux: 33 });
});

test('les motions de censure sont exclues', () => {
  assert.deepEqual(accord(votes, { V1: 'pour', V6: 'pour' }, new Set(['V6'])),
    { communs: 1, identiques: 1, taux: 100 });
});
