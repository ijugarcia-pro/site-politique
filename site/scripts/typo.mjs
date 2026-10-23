// Contrôle de la typographie (VDEF, docs/design-vdef/VDEF.md, § 2 et § 6 ; lot V10) : sur les 31
// écrans de scripts/ecrans.mjs, à 1 440 et 390 px, tout texte visible est en Bricolage Grotesque
// ou en Figtree (les deux seules polices du site), et aucun n'est mis en capitales par
// `text-transform: uppercase` (« jamais de capitales forcées »). Les champs (valeur et indication)
// sont contrôlés aussi.
//
// Le contrôle échoue (code 1) s'il reste une faute. Il est bloquant : `npm run test:inventaire` le
// lance après l'inventaire. Il lit le build (site/dist).
//
// Usage (depuis site/) :
//   npm run test:typo
//   node scripts/typo.mjs [build] [--gpu] [--ecrans=01,16] [--appareils=ordinateur]
//                         [--rapport=chemin.json] [--details]
// Sans --gpu, la salle 3D n'est pas ouverte (WebGL coupé : le repli s'affiche), ce qui suffit pour
// la typographie et va vite.

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { APPAREILS, lancer, options, parcourir } from './ecrans.mjs';

const opts = options(process.argv.slice(2));
const libres = opts.reste.filter((a) => !a.startsWith('--'));
const rapport = opts.reste.find((a) => a.startsWith('--rapport='))?.slice(10);
const details = opts.reste.includes('--details');
const serveur = await servir(resolve(libres[0] ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = opts.gpu ? await lancer({ gpu: true }) : await chromium.launch({ args: ['--disable-3d-apis'] });

/** Dans la page : les textes hors des deux polices, et les capitales forcées. */
function examiner() {
  const POLICES = /^["']?(Bricolage Grotesque|Figtree)/i;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && Number(s.opacity) > 0;
  };
  const decrire = (el) => {
    const classe = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (classe ? `.${classe}` : '');
  };
  const fautes = [];
  const juger = (el, s, texte, ou = '') => {
    if (!texte || !/\p{L}/u.test(texte)) return;
    if (!POLICES.test(s.fontFamily)) fautes.push({ element: decrire(el) + ou, texte: texte.slice(0, 80), regle: `police ${s.fontFamily.split(',')[0]}` });
    if (s.textTransform === 'uppercase') fautes.push({ element: decrire(el) + ou, texte: texte.slice(0, 80), regle: 'capitales forcées' });
  };
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
      juger(el, s, el.tagName === 'SELECT' ? el.selectedOptions[0]?.textContent ?? '' : el.value);
      if (!el.value && el.placeholder) juger(el, getComputedStyle(el, '::placeholder'), el.placeholder, '::placeholder');
      continue;
    }
    // Le texte propre de l'élément (ses nœuds texte directs).
    juger(el, s, [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim());
  }
  return { fautes };
}

const resultats = [];
for (const [appareil, largeur, hauteur] of APPAREILS.filter(([a]) => opts.appareils.includes(a))) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  await parcourir({ page, base, ecrans: opts.ecrans, surEcran: async (nom) => {
    const r = await page.evaluate(examiner);
    resultats.push({ appareil, ecran: nom, ...r });
    console.log(`${appareil} · ${nom} : ${r.fautes.length} faute(s)`);
    for (const f of r.fautes.slice(0, details ? Infinity : 5)) console.log(`    ✗ ${f.element} « ${f.texte} » (${f.regle})`);
    if (!details && r.fautes.length > 5) console.log(`    … et ${r.fautes.length - 5} autre(s) (--details)`);
  } });
  await contexte.close();
}
await navigateur.close();
serveur.close();

const total = resultats.reduce((t, r) => t + r.fautes.length, 0);
if (rapport) writeFileSync(rapport, `${JSON.stringify(resultats, null, 1)}\n`);
console.log(`\nBricolage Grotesque et Figtree seulement, sans capitales forcées : ${total} faute(s) sur ${resultats.length} écran(s).`);
process.exit(total > 0 ? 1 : 0);
