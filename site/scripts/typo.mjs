// Contrôle de la typographie (docs/design-final/DESIGN-FINAL.md, § 2 et § 9) : sur les 31 écrans
// de scripts/ecrans.mjs, à 1 440 et 390 px, aucun texte visible ne doit être en Barlow Condensed
// sans capitales (`text-transform: uppercase`). Sont tolérés les textes sans aucune minuscule
// (chiffres, sigles déjà en capitales, signes), qui se lisent de la même façon.
// Il signale aussi, sans échouer, deux aides à la liste de contrôle du § 9 : les coins arrondis
// (rayon ni nul ni en pilule) et les éléments en couleur « lumière » (réservée à toi).
//
// Le contrôle échoue (code 1) tant qu'il reste une faute : c'est voulu, il doit être vert à la
// fin du lot D5 (docs/design-final/PLAN-LOTS.md). Il lit le build (site/dist par défaut).
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

/** Dans la page : les fautes de typographie, les coins arrondis et la lumière. */
function examiner() {
  const LUMIERE = ['rgb(242, 201, 138)', 'rgb(138, 90, 18)'];
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
  const condense = (s) => /^["']?Barlow Condensed/i.test(s.fontFamily);
  const minuscules = (t) => /\p{Ll}/u.test(t);
  const fautes = [];
  const arrondis = new Map();
  const lumiere = new Map();
  const noter = (carte, cle) => carte.set(cle, (carte.get(cle) ?? 0) + 1);

  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    // Le texte propre de l'élément (ses nœuds texte directs), et, pour un champ, sa valeur et son indication.
    let texte = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (['INPUT', 'TEXTAREA'].includes(el.tagName)) {
      texte = el.value || '';
      const p = getComputedStyle(el, '::placeholder');
      if (!el.value && el.placeholder && condense(p) && p.textTransform !== 'uppercase' && minuscules(el.placeholder)) {
        fautes.push({ element: `${decrire(el)}::placeholder`, texte: el.placeholder.slice(0, 80) });
      }
    }
    if (texte && condense(s) && s.textTransform !== 'uppercase' && minuscules(texte)) {
      fautes.push({ element: decrire(el), texte: texte.slice(0, 80) });
    }
    const r = el.getBoundingClientRect();
    const rayon = parseFloat(s.borderTopLeftRadius) || 0;
    const pilule = rayon >= Math.min(r.width, r.height) / 2 - 1 || s.borderTopLeftRadius.endsWith('%');
    if (rayon > 0 && !pilule && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.borderTopWidth !== '0px' || s.boxShadow !== 'none')) {
      noter(arrondis, `${decrire(el)} (${s.borderTopLeftRadius})`);
    }
    for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor', 'fill', 'stroke']) {
      const v = s[prop];
      if (!LUMIERE.includes(v)) continue;
      if (prop === 'color' && !texte) continue;
      if (prop.startsWith('border') && s[prop.replace('Color', 'Width')] === '0px') continue;
      noter(lumiere, `${decrire(el)} [${prop}]`);
    }
  }
  return { fautes, arrondis: [...arrondis].sort((a, b) => b[1] - a[1]), lumiere: [...lumiere].sort((a, b) => b[1] - a[1]) };
}

const resultats = [];
for (const [appareil, largeur, hauteur] of APPAREILS.filter(([a]) => opts.appareils.includes(a))) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  await parcourir({ page, base, ecrans: opts.ecrans, surEcran: async (nom) => {
    const r = await page.evaluate(examiner);
    resultats.push({ appareil, ecran: nom, ...r });
    const resume = `${appareil} · ${nom} : ${r.fautes.length} faute(s), ${r.arrondis.reduce((t, [, n]) => t + n, 0)} coin(s) arrondi(s), `
      + `${r.lumiere.reduce((t, [, n]) => t + n, 0)} élément(s) en lumière`;
    console.log(resume);
    for (const f of r.fautes.slice(0, details ? Infinity : 5)) console.log(`    ✗ ${f.element} « ${f.texte} »`);
    if (!details && r.fautes.length > 5) console.log(`    … et ${r.fautes.length - 5} autre(s) (--details)`);
    if (details) {
      for (const [cle, n] of r.arrondis) console.log(`    ◜ ${cle} ×${n}`);
      for (const [cle, n] of r.lumiere) console.log(`    ☀ ${cle} ×${n}`);
    }
  } });
  await contexte.close();
}
await navigateur.close();
serveur.close();

const total = resultats.reduce((t, r) => t + r.fautes.length, 0);
if (rapport) writeFileSync(rapport, `${JSON.stringify(resultats, null, 1)}\n`);
console.log(`\nBarlow Condensed sans capitales : ${total} faute(s) sur ${resultats.length} écran(s).`);
process.exit(total > 0 ? 1 : 0);
