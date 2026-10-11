import assert from 'node:assert/strict';
import { test } from 'node:test';
import { couleurGroupe, encreSur } from './couleurs.ts';

test("l'encre la plus lisible sur la couleur d'un groupe", () => {
  assert.equal(encreSur('#C00D0D'), '#FFFFFF');
  assert.equal(encreSur('#313567'), '#FFFFFF');
  assert.equal(encreSur('#FFD96F'), '#1F2433');
  assert.equal(encreSur('#B5E2F9'), '#1F2433');
});

test('un groupe sans couleur valide est gris', () => {
  assert.equal(couleurGroupe(null), '#9AA1B2');
  assert.equal(couleurGroupe('rouge'), '#9AA1B2');
  assert.equal(couleurGroupe('#77AA79'), '#77AA79');
});
