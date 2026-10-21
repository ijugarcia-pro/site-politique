// Contrat de la refonte « La Séance » : chaque attribut data-* reste présent, sur un élément du
// même type, et le JavaScript initial d'une page ne s'alourdit pas. Compare le build (site/dist,
// ou le dossier donné par INVENTAIRE_DIST) aux références enregistrées au lot 0
// (scripts/inventaire.mjs). Lancer `npm run build` avant `npm run test:inventaire`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inventairePages, inventaireSource, poidsPages, REF_DATA, REF_POIDS, SITE }
  from '../scripts/inventaire.mjs';

const dist = resolve(process.env.INVENTAIRE_DIST ?? join(SITE, 'dist'));
const ref = JSON.parse(readFileSync(REF_DATA, 'utf8'));

test('le code garde tous ses noms data-*', () => {
  const avant = new Set(ref.source);
  const apres = new Set(inventaireSource());
  assert.deepEqual([...avant].filter((n) => !apres.has(n)), [], 'noms data-* disparus du code');
  assert.deepEqual([...apres].filter((n) => !avant.has(n)), [],
    'noms data-* nouveaux : les ajouter à la référence si c\'est voulu');
});

test('chaque page garde ses data-*, sur un élément du même type', () => {
  assert.ok(existsSync(dist), `pas de build dans ${dist} : lancer npm run build`);
  const pages = inventairePages(dist);
  assert.deepEqual(Object.keys(pages), Object.keys(ref.pages), 'routes différentes');
  for (const [r, avant] of Object.entries(ref.pages)) {
    const apres = new Set(pages[r]);
    assert.deepEqual(avant.filter((x) => !apres.has(x)), [], `${r} : data-* perdus ou déplacés`);
    const avantS = new Set(avant);
    assert.deepEqual(pages[r].filter((x) => !avantS.has(x)), [], `${r} : data-* nouveaux`);
  }
});

test('le JavaScript initial de chaque page ne s\'alourdit pas', () => {
  assert.ok(existsSync(dist), `pas de build dans ${dist} : lancer npm run build`);
  const avant = JSON.parse(readFileSync(REF_POIDS, 'utf8'));
  const apres = poidsPages(dist);
  // Une marge de 2 % absorbe le bruit de la compression (noms de fichiers hachés).
  const plusLourdes = Object.entries(avant)
    .filter(([r, p]) => apres[r] && apres[r].js_gzip > p.js_gzip * 1.02)
    .map(([r, p]) => `${r} : ${p.js_gzip} → ${apres[r].js_gzip} octets compressés`);
  assert.deepEqual(plusLourdes, []);
});
