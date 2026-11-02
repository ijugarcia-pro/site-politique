// La matrice d'écrans du cadrage MVP (docs/cadrage-mvp-retours-test-578e.md, § 7 ; lot 4) : capture
// /, /quiz/ (question et dévoilement), /salle/, /ta-place/ et /verdict/ à chaque taille, et contrôle
// ce que le critère de R3 demande : pas de défilement horizontal ; aucune feuille ni barre hors de
// la fenêtre (une feuille trop longue défile à l'intérieur) ; une feuille ne couvre pas la barre du
// haut ; les 577 sièges du dévoilement dans la zone libre ; cibles tactiles de 44 px au moins, sur
// les tailles tactiles. Un visiteur inventé (12 réponses illustratives, jamais envoyées).
//
// Usage (depuis site/, après un build) : node scripts/matrice-ecrans.mjs <sortie> [build] [--gpu] [--tailles=1280x600,390x844]
// Sortie : une capture par écran, resultats.json, planche-matrice.jpg, et le code de retour 1 s'il
// reste un défaut.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

export const MATRICE = [[1280, 600], [1366, 650], [1440, 900], [1536, 730], [1920, 1080], [2560, 1080],
  [768, 1024], [1024, 768], [360, 640], [390, 844], [412, 915], [844, 390]];

const args = process.argv.slice(2);
const [sortie, dossier] = args.filter((a) => !a.startsWith('--'));
if (!sortie) { console.error('Usage : node scripts/matrice-ecrans.mjs <sortie> [build] [--gpu] [--tailles=…]'); process.exit(1); }
mkdirSync(sortie, { recursive: true });
const voulues = args.find((a) => a.startsWith('--tailles='))?.split('=')[1].split(',').map((t) => t.split('x').map(Number));
const TAILLES = voulues ?? MATRICE;
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: args.includes('--gpu'), sansWebgl: !args.includes('--gpu') });

/** Les contrôles, dans la page : une liste de défauts. */
function controler({ tactile }) {
  const defauts = [];
  const W = innerWidth, H = innerHeight;
  const de = document.documentElement;
  if (de.scrollWidth > W + 1) defauts.push(`défilement horizontal (${de.scrollWidth} px pour ${W})`);
  const visible = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  // La page défile-t-elle (au téléphone, c'est normal tant qu'il n'y a pas de tiroir) ?
  const pageDefile = de.scrollHeight > H + 1;
  // Sur ordinateur (hors disposition « tiroir »), un écran de salle ne défile jamais.
  if (pageDefile && W > 900 && H > 560 && document.body.classList.contains('gabarit-salle')) defauts.push(`la page défile (${de.scrollHeight} px pour ${H})`);
  const barre = [...document.querySelectorAll('.barre-haut')].find(visible)?.getBoundingClientRect();
  for (const f of document.querySelectorAll('.sur-salle .feuille')) {
    if (!visible(f)) continue;
    const r = f.getBoundingClientRect();
    if (r.left < -1 || r.right > W + 1) defauts.push(`feuille hors de la largeur (${Math.round(r.left)} à ${Math.round(r.right)})`);
    if (!pageDefile && (r.top < -1 || r.bottom > H + 1)) defauts.push(`feuille coupée (${Math.round(r.top)} à ${Math.round(r.bottom)} pour ${H})`);
    // Une feuille trop longue doit pouvoir défiler à l'intérieur.
    const o = getComputedStyle(f).overflowY;
    if (f.scrollHeight > f.clientHeight + 1 && !['auto', 'scroll'].includes(o) && !pageDefile) defauts.push('feuille tronquée, sans défilement');
    // Sous la barre du haut, sauf si elle en occupe le côté libre (feuille à droite en mode focus).
    if (barre && r.top < barre.bottom - 1 && r.left < barre.right - 1 && r.right > barre.left + 1 && !document.body.classList.contains('focus')) {
      defauts.push(`feuille sous la barre du haut (${Math.round(r.top)} < ${Math.round(barre.bottom)})`);
    }
  }
  // Le dévoilement : l'image (donc les 577 sièges) dans la zone libre.
  const calque = document.querySelector('.revelation-calque');
  if (calque && calque.style.opacity === '1') {
    const i = calque.querySelector('img').getBoundingClientRect();
    const droite = [...document.querySelectorAll('.sur-salle .feuille.droite')].find(visible)?.getBoundingClientRect();
    const scene = calque.getBoundingClientRect();
    if (i.left < scene.left - 1 || i.top < scene.top - 1 || i.bottom > scene.bottom + 1) defauts.push('image du dévoilement coupée');
    if (droite && W > 900 && H > 560 && i.right > droite.left + 1) defauts.push('image du dévoilement sous la feuille');
    if (barre && W > 900 && i.top < barre.bottom - 1) defauts.push('image du dévoilement sous la barre');
  }
  if (tactile) {
    const petites = [...document.querySelectorAll('.sur-salle button, .barre-bas a')].filter((b) => {
      if (!visible(b)) return false; const r = b.getBoundingClientRect(); return r.height < 44 && r.width < 44; });
    if (petites.length) defauts.push(`${petites.length} cible(s) de moins de 44 px`);
  }
  return defauts;
}

const resultats = [];
let total = 0;
for (const [l, h] of TAILLES) {
  const tactile = l < 1100;
  const contexte = await navigateur.newContext({ viewport: { width: l, height: h } });
  const page = await contexte.newPage();
  await page.goto(`${base}/404.html`);
  const votes = await page.evaluate(async () => (await (await fetch('/donnees/matrice.json')).json()).votes.slice(0, 12));
  const stocker = (v) => { localStorage.clear(); if (v) localStorage.setItem('578e.reponses.v1', JSON.stringify(Object.fromEntries(v.map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }])))); };
  const prise = async (nom) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(sortie, `${l}x${h}-${nom}.png`) });
    const defauts = await page.evaluate(controler, { tactile });
    resultats.push({ taille: `${l}x${h}`, ecran: nom, defauts });
    total += defauts.length;
    console.log(`${defauts.length ? '✗' : '✓'} ${l}x${h} ${nom}${defauts.length ? ` : ${defauts.join(' ; ')}` : ''}`);
  };
  await page.evaluate(stocker, votes);
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await prise('tribune');
  await page.evaluate(stocker, null);
  await page.goto(`${base}/quiz/`, { waitUntil: 'networkidle' });
  await prise('quiz-question');
  await page.click('[data-reponse="pour"]');
  await page.waitForTimeout(200);
  await page.click('[data-continuer]');
  await page.waitForTimeout(1600);
  await prise('quiz-devoilement');
  await page.evaluate(stocker, votes);
  for (const [chemin, nom] of [['/salle/', 'salle'], ['/ta-place/', 'ta-place']]) {
    await page.goto(base + chemin, { waitUntil: 'networkidle' });
    await prise(nom);
  }
  await page.goto(`${base}/verdict/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('[data-decouvrir-bouton]:not([hidden])')?.click());
  await page.waitForTimeout(1600);
  await prise('verdict');
  await contexte.close();
}
writeFileSync(join(sortie, 'resultats.json'), JSON.stringify(resultats, null, 1));

// La planche : une ligne par taille, une colonne par écran.
const ECRANS = ['tribune', 'quiz-question', 'quiz-devoilement', 'salle', 'ta-place', 'verdict'];
const lignes = TAILLES.map(([l, h]) => '<tr><th>' + l + ' × ' + h + '</th>' + ECRANS.map((e) => {
  const png = readFileSync(join(sortie, l + 'x' + h + '-' + e + '.png')).toString('base64');
  return '<td><img src="data:image/png;base64,' + png + '"></td>';
}).join('') + '</tr>').join('');
const cp = await navigateur.newContext({ viewport: { width: 1700, height: 800 } });
const pp = await cp.newPage();
await pp.setContent('<style>body{margin:0;padding:12px;background:#F2F2F2;font:600 13px sans-serif}table{border-spacing:6px}th{white-space:nowrap;text-align:left}td{vertical-align:top}img{display:block;max-width:250px;max-height:200px;border:1px solid #BBB}</style><table><tr><th></th>' + ECRANS.map((e) => '<th>' + e + '</th>').join('') + '</tr>' + lignes + '</table>');
await pp.waitForTimeout(500);
await pp.screenshot({ path: join(sortie, 'planche-matrice.jpg'), fullPage: true, type: 'jpeg', quality: 80 });
await cp.close();
await navigateur.close();
serveur.close();
console.log(`\n${resultats.length} écrans, ${total} défaut(s).`);
process.exit(total ? 1 : 0);
