// Les mesures du lot 0 (docs/rapport-perf-30-oct.md) : sans `perf` dans l'adresse, la salle ne
// change rien ; `instant` et `leger` ne s'activent que demandés.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modePerf } from './scene.ts';

test('sans perf dans l\'adresse, aucune mesure ni aucun réglage', () => {
  assert.deepEqual(modePerf(''), { marques: false, instant: false, leger: false });
  assert.deepEqual(modePerf('?revelation=a'), { marques: false, instant: false, leger: false });
});

test('perf=1 pose les marques sans rien changer au rendu', () => {
  assert.deepEqual(modePerf('?perf=1'), { marques: true, instant: false, leger: false });
});

test('perf=instant et perf=leger se combinent', () => {
  assert.deepEqual(modePerf('?perf=instant&perf=leger'), { marques: true, instant: true, leger: true });
});
