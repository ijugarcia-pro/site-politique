import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// D3, repris par la VDEF (lot V5) : ADOPTÉ et REJETÉ s'affichent de la même façon, avec la même
// taille, la même couleur et le même élément, au verdict comme à la révélation.
test('l’issue du verdict s’affiche de la même façon, adoptée ou rejetée', () => {
  const page = readFileSync(new URL('../pages/verdict.astro', import.meta.url), 'utf-8');
  assert.match(page, /<p class="t-issue issue">\{v\.verdict\}<\/p>/);
  const style = page.slice(page.indexOf('<style>'));
  assert.doesNotMatch(style, /adopt|rejet/i);
  const trancher = readFileSync(new URL('../components/vdef/Trancher.astro', import.meta.url), 'utf-8');
  assert.match(trancher, /<span class="t-issue" data-rv-issue tabindex="-1"><\/span>/);
  assert.doesNotMatch(trancher.slice(trancher.indexOf('<style>')), /adopt|rejet/i);
});
