// Chaque clé du stockage local utilisée par le site est annoncée sur /confidentialite/ et effacée
// par le bouton « Tout effacer » de /calcul/. Écart trouvé le 20 octobre 2026 :
// 578e.verdicts-vus.v1 n'était ni annoncée ni effacée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../scripts/inventaire.mjs';

const SRC = join(SITE, 'src');
const lire = (...c) => readFileSync(join(SRC, ...c), 'utf8');
const CLE = /578e\.[a-z-]+\.v\d+/g;

function cles() {
  const sortie = new Set();
  const parcourir = (d) => {
    for (const nom of readdirSync(d)) {
      const c = join(d, nom);
      if (statSync(c).isDirectory()) parcourir(c);
      else if (/\.(astro|ts)$/.test(c) && !c.endsWith('.test.ts')) {
        for (const m of readFileSync(c, 'utf8').matchAll(CLE)) sortie.add(m[0]);
      }
    }
  };
  parcourir(SRC);
  return [...sortie].sort();
}

test('chaque clé du stockage local est annoncée et effaçable', () => {
  const toutes = cles();
  assert.ok(toutes.includes('578e.reponses.v1'));
  const confidentialite = lire('pages', 'confidentialite.astro');
  const effacer = lire('pages', 'calcul.astro').match(/const CLES = \[([^\]]*)\]/)[1];
  assert.deepEqual(toutes.filter((c) => !confidentialite.includes(c)), [],
    'clés absentes de /confidentialite/');
  assert.deepEqual(toutes.filter((c) => !effacer.includes(`'${c}'`)), [],
    'clés que « Tout effacer » (/calcul/) n\'efface pas');
});
