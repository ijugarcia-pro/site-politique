// La règle des 10 votes (cadrage MVP, R9, Q4) : sous le seuil, aucun jumeau ni opposé nulle part.
// Toute page ou tout module qui lit le jumeau ou l'opposé d'un profil doit passer par jumeauVisible
// ou palierAtteint ; scripts/seuil-jumeau.mjs vérifie ensuite le rendu, page par page.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { jumeauVisible, phraseSeuilJumeau } from './paliers.ts';

const fichiers = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const f = join(d, n);
  return statSync(f).isDirectory() ? fichiers(f) : /\.(astro|ts)$/.test(n) && !n.includes('.test.') ? [f] : [];
});

test('10 votes tranchés : le seuil du jumeau et de l\'opposé', () => {
  assert.equal(jumeauVisible(9), false);
  assert.equal(jumeauVisible(10), true);
  assert.equal(phraseSeuilJumeau(2), 'À 10 votes, ton jumeau et ton opposé apparaissent · 2 / 10');
});

test('toute lecture du jumeau ou de l\'opposé d\'un profil passe par le seuil', () => {
  const lectures = fichiers('src').filter((f) => /\b\w*(p|profil\([^)]*\))\??\.(jumeau|oppose)\b/.test(readFileSync(f, 'utf8')) && !f.endsWith('profil.ts'));
  assert.ok(lectures.length >= 5, `lectures trouvées : ${lectures.join(', ')}`);
  for (const f of lectures) assert.match(readFileSync(f, 'utf8'), /jumeauVisible|palierAtteint/, f);
});
