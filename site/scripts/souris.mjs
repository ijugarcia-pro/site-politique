// Le test de la souris (VDEF, lot V10) : sur la tribune, la salle, ta place et le verdict, on
// enfonce le bouton au milieu de ce que les feuilles laissent voir de la salle, on glisse de
// 300 px, on relâche : l'image de la salle doit changer (le glisser tourne la caméra). La salle
// est rendue en WebGL logiciel (SwiftShader) : lent, mais partout disponible. Un visiteur
// inventé (réponses illustratives, jamais envoyées) a tranché 12 votes, pour que « Ta place »
// s'ouvre.
//
// Usage (depuis site/, après npm run build) : npm run test:souris   ou   node scripts/souris.mjs [build]

import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const PAGES = ['/', '/salle/', '/ta-place/', '/verdict/'];
const serveur = await servir(resolve(process.argv[2] ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer();
const page = await (await navigateur.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();

// Le visiteur : les votes de la matrice, une réponse sur trois « contre ».
await page.goto(`${base}/404.html`);
const votes = await page.evaluate(async () => (await (await fetch('/donnees/matrice.json')).json()).votes.slice(0, 12));
await page.evaluate((v) => {
  localStorage.clear();
  localStorage.setItem('578e.reponses.v1', JSON.stringify(Object.fromEntries(v.map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }]))));
  localStorage.setItem('578e.verdicts-vus.v1', JSON.stringify([]));
}, votes);

let echecs = 0;
for (const chemin of PAGES) {
  await page.goto(base + chemin, { waitUntil: 'networkidle' });
  const etat = await page.waitForFunction(() => {
    const e = document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat;
    return ['prete', 'erreur', 'webgl'].includes(e ?? '') ? e : null;
  }, null, { timeout: 240000 }).then((h) => h.jsonValue());
  if (etat !== 'prete') { console.log(`✗ ${chemin} : la salle 3D ne s'est pas ouverte (${etat})`); echecs += 1; continue; }
  await page.waitForTimeout(6000);
  // Le point de départ : le milieu de la plus grande bande de canevas visible sur la ligne du tiers haut.
  const depart = await page.evaluate(() => {
    const y = Math.round(innerHeight * 0.35);
    const libres = [];
    for (let x = 10; x < innerWidth - 10; x += 10) {
      if (document.elementFromPoint(x, y)?.tagName === 'CANVAS') libres.push(x);
    }
    return libres.length ? { x: libres[Math.floor(libres.length / 2)], y } : null;
  });
  if (!depart) { console.log(`✗ ${chemin} : aucun endroit libre sur la salle`); echecs += 1; continue; }
  const zone = { x: Math.max(0, depart.x - 150), y: Math.max(0, depart.y - 100), width: 300, height: 200 };
  const avant = await page.screenshot({ clip: zone, timeout: 240000 });
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k += 1) await page.mouse.move(depart.x + 30 * k, depart.y, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(8000);
  const apres = await page.screenshot({ clip: zone, timeout: 240000 });
  const change = !avant.equals(apres);
  console.log(`${change ? '✓' : '✗'} ${chemin} : ${change ? 'l’image a changé' : 'l’image n’a pas changé'} (départ ${depart.x}, ${depart.y})`);
  if (!change) echecs += 1;
}
await navigateur.close();
serveur.close();
console.log(echecs ? `\n${echecs} page(s) en échec.` : '\nLe glisser à la souris tourne la salle sur les 4 pages.');
process.exit(echecs ? 1 : 0);
