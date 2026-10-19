// Inventaire du site construit, pour la refonte « La Séance » (docs/PLANNING.md, lot 0).
//
// 1. Les attributs data-* : le lien entre le HTML et les scripts des pages. Une refonte peut
//    changer les balises, les classes et la mise en page, mais chaque data-* doit rester, sur un
//    élément du même type. On relève donc :
//    - dans le code (src/, hors tests) : tous les noms data-* écrits, y compris ceux que les
//      scripts posent ou cherchent (`querySelector('[data-…]')`) ;
//    - dans les pages construites : pour chaque route, chaque data-* avec le type de l'élément
//      qui le porte (lien, bouton, champ… ; les simples conteneurs sont confondus).
// 2. Le poids du JavaScript chargé à l'ouverture de chaque route (imports statiques compris,
//    imports dynamiques exclus), brut et compressé : la refonte ne doit pas l'alourdir.
//
// Usage (depuis site/) :
//   node scripts/inventaire.mjs enregistrer [dossier du build]   écrit les deux références
//   npm run test:inventaire                                     compare au build (site/dist)

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ICI = dirname(fileURLToPath(import.meta.url));
export const SITE = resolve(ICI, '..');
export const REF_DATA = join(SITE, 'tests', 'inventaire-data.json');
export const REF_POIDS = resolve(SITE, '..', 'data', 'mesures', 'poids-site.json');

function fichiers(dossier, filtre) {
  const sortie = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin, filtre));
    else if (filtre(chemin)) sortie.push(chemin);
  }
  return sortie.sort();
}

// data-astro-* : posés par Astro (styles délimités), ils changent avec le CSS.
const NOM_DATA = /\bdata-(?!astro-)[a-z0-9]+(?:-[a-z0-9]+)*/g;

/** Tous les noms data-* écrits dans le code du site (src/, hors tests). */
export function inventaireSource(src = join(SITE, 'src')) {
  const noms = new Set();
  for (const f of fichiers(src, (c) => /\.(astro|ts|mjs|js)$/.test(c) && !/\.test\.ts$/.test(c))) {
    for (const m of readFileSync(f, 'utf8').matchAll(NOM_DATA)) noms.add(m[0]);
  }
  return [...noms].sort();
}

// Le type d'un élément, au sens du contrat : ces balises gardent leur nom ; les autres (div,
// span, section, p, h1…) sont des conteneurs, interchangeables.
const TYPES = new Set(['a', 'button', 'input', 'select', 'textarea', 'form', 'label', 'output',
  'script', 'template', 'img', 'canvas', 'svg', 'g', 'circle', 'path', 'rect', 'text',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'details', 'summary', 'dialog',
  'meter', 'progress', 'abbr', 'time']);
const typeDe = (balise) => (TYPES.has(balise) ? balise : 'conteneur');

/** La route d'une page construite : les pages d'un vote et d'un député sont regroupées. */
export function route(cheminRelatif) {
  const segs = cheminRelatif.split(sep).join('/').replace(/(^|\/)index\.html$/, '$1')
    .replace(/\.html$/, '/').split('/');
  return '/' + segs.map((s, i) => (segs[i - 1] === 'votes' && /^\d+$/.test(s) ? '[numero]'
    : segs[i - 1] === 'deputes' && /^PA\d+$/.test(s) ? '[uid]' : s)).join('/');
}

const BALISE = /<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>/g;

/** Pour chaque route : les couples « type[data-nom] » présents dans le HTML construit. */
export function inventairePages(dist) {
  const parRoute = {};
  for (const f of fichiers(dist, (c) => c.endsWith('.html'))) {
    const r = route(relative(dist, f));
    const ens = (parRoute[r] ??= new Set());
    for (const [, balise, attrs = ''] of readFileSync(f, 'utf8').matchAll(BALISE)) {
      for (const m of attrs.matchAll(/\s(data-(?!astro-)[a-z0-9-]+)/g)) {
        ens.add(`${typeDe(balise.toLowerCase())}[${m[1]}]`);
      }
    }
  }
  return Object.fromEntries(Object.keys(parRoute).sort()
    .map((r) => [r, [...parRoute[r]].sort()]));
}

/** Le JavaScript chargé à l'ouverture d'une page : modules et leurs imports statiques. */
function scriptsDePage(dist, html) {
  const vus = new Set();
  const enLigne = [];
  const aSuivre = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, attrs, corps] = m;
    if (/type="application\/(ld\+)?json"/.test(attrs)) continue;
    const src = attrs.match(/\ssrc="([^"]+)"/);
    if (src) aSuivre.push(src[1]);
    else if (corps.trim()) enLigne.push(corps);
  }
  while (aSuivre.length) {
    const url = aSuivre.pop();
    if (vus.has(url) || !url.startsWith('/')) continue;
    vus.add(url);
    const code = readFileSync(join(dist, url), 'utf8');
    // Imports statiques seulement : `import … from"./x.js"` et `import"./x.js"`, pas import().
    for (const i of code.matchAll(/(?:\bfrom\s*|\bimport\s*)"(\.\/[^"]+\.js)"/g)) {
      aSuivre.push(new URL(i[1], `http://x${url}`).pathname);
    }
  }
  return { fichiers: [...vus].sort(), enLigne };
}

/** Pour chaque route : poids du JavaScript et du CSS chargés à l'ouverture (le plus lourd
 *  des pages de la route), en octets, bruts et compressés (gzip, niveau 9). */
export function poidsPages(dist) {
  const parRoute = {};
  for (const f of fichiers(dist, (c) => c.endsWith('.html'))) {
    const r = route(relative(dist, f));
    const html = readFileSync(f, 'utf8');
    const { fichiers: js, enLigne } = scriptsDePage(dist, html);
    const css = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    const lire = (url) => readFileSync(join(dist, url));
    const codeJs = Buffer.concat([...js.map(lire), ...enLigne.map((s) => Buffer.from(s))]);
    const codeCss = Buffer.concat(css.filter((u) => u.startsWith('/')).map(lire));
    const p = {
      js: codeJs.length, js_gzip: gzipSync(codeJs, { level: 9 }).length,
      css: codeCss.length, css_gzip: gzipSync(codeCss, { level: 9 }).length,
      modules: js.length,
    };
    if (!parRoute[r] || p.js_gzip > parRoute[r].js_gzip) parRoute[r] = p;
  }
  return Object.fromEntries(Object.keys(parRoute).sort().map((r) => [r, parRoute[r]]));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, dossier] = process.argv.slice(2);
  const dist = resolve(dossier ?? join(SITE, 'dist'));
  if (action !== 'enregistrer' || !existsSync(dist)) {
    console.error('Usage : node scripts/inventaire.mjs enregistrer [dossier du build]');
    process.exit(1);
  }
  const data = { source: inventaireSource(), pages: inventairePages(dist) };
  writeFileSync(REF_DATA, JSON.stringify(data, null, 1) + '\n');
  writeFileSync(REF_POIDS, JSON.stringify(poidsPages(dist), null, 1) + '\n');
  const n = Object.values(data.pages).reduce((s, l) => s + l.length, 0);
  console.log(`${data.source.length} noms data-* dans le code, ${n} couples type[data-*] sur ` +
    `${Object.keys(data.pages).length} routes.`);
}
