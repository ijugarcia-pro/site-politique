// Le tiroir au téléphone (cadrage MVP, lot 5) : le cran le plus proche au lâcher, le cran suivant
// à l'appui.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cranProche, cranSuivant } from './tiroir.ts';

const H = { replie: 72, moyen: 380, plein: 742 };

test('au lâcher, le tiroir va au cran le plus proche', () => {
  assert.equal(cranProche(80, H), 'replie');
  assert.equal(cranProche(200, H), 'replie');
  assert.equal(cranProche(240, H), 'moyen');
  assert.equal(cranProche(500, H), 'moyen');
  assert.equal(cranProche(600, H), 'plein');
  assert.equal(cranProche(742, H), 'plein');
});

test('un appui passe au cran suivant, et le plein revient au replié', () => {
  assert.equal(cranSuivant('replie'), 'moyen');
  assert.equal(cranSuivant('moyen'), 'plein');
  assert.equal(cranSuivant('plein'), 'replie');
});
