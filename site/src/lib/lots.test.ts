import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prochainLot } from './lots.ts';
import { puceTheme, PUCES_THEMES } from './themes.ts';

test('le prochain lot est le premier pas encore fait', () => {
  assert.equal(prochainLot([], 5), 0);
  assert.equal(prochainLot([0, 1], 5), 2);
  assert.equal(prochainLot([1], 5), 0);
  assert.equal(prochainLot([0, 1, 2, 3, 4], 5), null);
});

test('chaque thème a sa puce, un thème inconnu prend la violette', () => {
  assert.equal(Object.keys(PUCES_THEMES).length, 12);
  assert.equal(puceTheme('Logement'), '#FFE4E0:#B3261E');
  assert.equal(puceTheme('Inconnu'), '#E8E1FF:#5B35E6');
});
