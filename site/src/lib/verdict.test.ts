import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// D3 : ADOPTÉ et REJETÉ ont le même tampon, la même couleur, la même animation.
test('le tampon du verdict ne dépend pas de l’issue', () => {
  const page = readFileSync(new URL('../pages/verdict.astro', import.meta.url), 'utf-8');
  assert.match(page, /<span class="tampon">\{v\.verdict\}<\/span>/);
  const style = page.slice(page.indexOf('<style>'));
  assert.doesNotMatch(style, /adopt|rejet/i);
  assert.match(style, /\.boite:global\(\.apparait\) \.tampon \{ animation: tampon-verdict 600ms/);
});
