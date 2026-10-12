import assert from 'node:assert/strict';
import { test } from 'node:test';
import { franchit, pourcent } from './jauge.ts';

test('précision : 1 − e^(−n/20), arrondie', () => {
  assert.equal(pourcent(0), 0);
  assert.equal(pourcent(10), 39);
  assert.equal(pourcent(25), 71);
  assert.equal(pourcent(37), 84);
});

test('la pastille « Fiable » ne s’anime qu’au 25e vote', () => {
  assert.equal(franchit(24, 25), true);
  assert.equal(franchit(22, 25), true);
  assert.equal(franchit(23, 24), false);
  assert.equal(franchit(25, 26), false);
  assert.equal(franchit(25, 25), false);
});
