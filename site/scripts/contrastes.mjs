// Audit des contrastes (docs/design-final/DESIGN-FINAL.md, § 9) : sur les 31 écrans de
// scripts/ecrans.mjs, à 1 440 et 390 px, chaque texte visible est mesuré contre son fond réel
// (couleurs des ancêtres composées, transparences comprises). Seuils WCAG AA : 4,5:1, ou 3:1 pour
// un grand texte (24 px, ou 18,66 px en gras).
// Un texte posé sur la salle (scène 3D, image de la tribune du mode focus) n'a pas de fond
// mesurable : la règle est qu'il soit sur un voile d'au moins 74 % ; il est alors mesuré au pire,
// sur un fond blanc et sur un fond noir sous ce voile. Sinon il est signalé à part (« sur la salle,
// sans voile »), sans faire échouer l'audit : c'est à regarder sur les planches.
//
// Usage (depuis site/) : node scripts/contrastes.mjs [build] [--gpu] [--ecrans=…] [--appareils=…] [--details]

import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { APPAREILS, lancer, options, parcourir } from './ecrans.mjs';

const opts = options(process.argv.slice(2));
const libres = opts.reste.filter((a) => !a.startsWith('--'));
const details = opts.reste.includes('--details');
const serveur = await servir(resolve(libres[0] ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = opts.gpu ? await lancer({ gpu: true }) : await chromium.launch({ args: ['--disable-3d-apis'] });

/** Dans la page : les textes sous le seuil, et ceux posés sur la salle sans voile. */
function mesurer() {
  const rgba = (s) => { const m = s.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return [m[0], m[1], m[2], m[3] ?? 1]; };
  const sur = (h, b) => [0, 1, 2].map((k) => h[k] * h[3] + b[k] * (1 - h[3])).concat(1);
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const focus = document.body.classList.contains('focus');
  const decrire = (el) => {
    const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (c ? `.${c}` : '');
  };
  const fautes = [];
  const salle = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg', 'SVG'].includes(el.tagName)) continue;
    const texte = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (!texte || !/[\p{L}\p{N}]/u.test(texte)) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || Number(s.opacity) === 0) continue;
    // Les couches de fond, de l'élément vers la racine, jusqu'à la première opaque.
    const couches = [];
    let opaque = null;
    let surSalle = false;
    for (let a = el; a; a = a.parentElement) {
      if (a.matches?.('[data-salle3d] .image ~ *, [data-salle3d] .image *') || (a === document.body && focus)) { surSalle = true; break; }
      const st = getComputedStyle(a);
      const c = rgba(st.backgroundColor);
      if (c[3] > 0) couches.push(c);
      if (c[3] >= 1) { opaque = c; break; }
      if (a.matches?.('[data-salle3d]')) { surSalle = true; break; }
    }
    const grand = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
    const seuil = grand ? 3 : 4.5;
    const fg = rgba(s.color);
    const composer = (fond) => couches.slice().reverse().reduce((b, c) => (c[3] >= 1 ? c : sur(c, b)), fond);
    if (opaque) {
      const fond = composer(opaque);
      const r2 = ratio(sur(fg, fond), fond);
      if (r2 < seuil) fautes.push({ element: decrire(el), texte: texte.slice(0, 60), ratio: Math.round(r2 * 100) / 100, seuil });
      continue;
    }
    // Sur la salle : l'opacité cumulée des voiles entre le texte et la salle.
    const alpha = 1 - couches.reduce((p, c) => p * (1 - c[3]), 1);
    if (!surSalle && couches.length === 0) continue;
    if (alpha < 0.74) { salle.push({ element: decrire(el), texte: texte.slice(0, 60), voile: Math.round(alpha * 100) }); continue; }
    const pire = Math.min(...[[255, 255, 255, 1], [0, 0, 0, 1]].map((f) => { const fond = composer(f); return ratio(sur(fg, fond), fond); }));
    if (pire < seuil) fautes.push({ element: decrire(el), texte: texte.slice(0, 60), ratio: Math.round(pire * 100) / 100, seuil, salle: true });
  }
  return { fautes, salle };
}

let total = 0;
for (const [appareil, largeur, hauteur] of APPAREILS.filter(([a]) => opts.appareils.includes(a))) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  await parcourir({ page, base, ecrans: opts.ecrans, surEcran: async (nom) => {
    const r = await page.evaluate(mesurer);
    total += r.fautes.length;
    console.log(`${appareil} · ${nom} : ${r.fautes.length} contraste(s) sous le seuil, ${r.salle.length} texte(s) sur la salle sans voile`);
    for (const f of r.fautes.slice(0, details ? Infinity : 6)) console.log(`    ✗ ${f.ratio}:1 < ${f.seuil}:1 ${f.element} « ${f.texte} »${f.salle ? ' (sur la salle)' : ''}`);
    if (details) for (const f of r.salle) console.log(`    ◌ voile ${f.voile} % ${f.element} « ${f.texte} »`);
  } });
  await contexte.close();
}
await navigateur.close();
serveur.close();
console.log(`\nContrastes sous le seuil AA : ${total}.`);
process.exit(total > 0 ? 1 : 0);
