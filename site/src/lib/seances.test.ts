import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serie } from './seances.ts';

const f = (...l: string[]) => new Set(l);

test('la série compte les semaines d’affilée', () => {
  assert.equal(serie(f(), f(), '2026-10-12'), 0);
  assert.equal(serie(f('2026-10-12', '2026-10-05'), f(), '2026-10-12'), 2);
  // La semaine en cours pas encore faite ne casse pas la série.
  assert.equal(serie(f('2026-10-05', '2026-09-28'), f(), '2026-10-12'), 2);
  // Une semaine manquée la casse.
  assert.equal(serie(f('2026-10-12', '2026-09-28'), f(), '2026-10-12'), 1);
});

test('les vacances gèlent la série sans la casser', () => {
  assert.equal(serie(f('2026-10-12', '2026-09-21'), f('2026-10-05', '2026-09-28'), '2026-10-12'), 2);
});
