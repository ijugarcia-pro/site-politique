import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dateLisible, majuscule } from './donnees.ts';

test('dates lisibles, heure de Paris', () => {
  assert.equal(dateLisible('2026-07-21'), '21 juillet 2026');
  assert.equal(dateLisible('2026-10-07T10:26:12+00:00'), '7 octobre 2026 à 12 h 26');
  assert.equal(dateLisible('2026-01-05T08:05:00+00:00'), '5 janvier 2026 à 9 h 05');
  assert.equal(dateLisible(null), 'inconnue');
});

test('majuscule initiale des titres officiels', () => {
  assert.equal(majuscule("l'ensemble du projet de loi"), "L'ensemble du projet de loi");
});
