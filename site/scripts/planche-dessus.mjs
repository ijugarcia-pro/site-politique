// La planche de la porte G2 (cadrage MVP, R5, lot 6) : /salle/ en perspective et en mode « Dessus »,
// à 1 440 × 900, 1 280 × 650 et 390 × 844, sur la vraie carte graphique ; d'un groupe allumé, pour
// voir les sièges. Un visiteur inventé (12 réponses illustratives, jamais envoyées).
//
// Usage (depuis site/, après un build) : node scripts/planche-dessus.mjs <sortie> [build]

import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const [sortie, dossier] = process.argv.slice(2);
if (!sortie) { console.error('Usage : node scripts/planche-dessus.mjs <sortie> [build]'); process.exit(1); }
mkdirSync(sortie, { recursive: true });
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: true });
const TAILLES = [[1440, 900], [1280, 650], [390, 844]];
const MODES = [['salle', 'Perspective'], ['dessus', 'Dessus']];

for (const [l, h] of TAILLES) {
  const contexte = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: l < 500 ? 2 : 1 });
  const page = await contexte.newPage();
  await page.goto(`${base}/404.html`);
  const votes = await page.evaluate(async () => (await (await fetch('/donnees/matrice.json')).json()).votes.slice(0, 12));
  await page.evaluate((v) => { localStorage.clear(); localStorage.setItem('578e.reponses.v1', JSON.stringify(Object.fromEntries(v.map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }])))); }, votes);
  await page.goto(`${base}/salle/?qualite=0`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat === 'prete', null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  for (const [mode] of MODES) {
    await page.click(`[data-mode="${mode}"]`);
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(sortie, `${l}x${h}-${mode}.png`) });
  }
  await contexte.close();
}
const lignes = TAILLES.map(([l, h]) => `<tr><th>${l} × ${h}</th>${MODES.map(([m]) => `<td><img style="max-width:${l < 500 ? 300 : 760}px" src="data:image/png;base64,${readFileSync(join(sortie, `${l}x${h}-${m}.png`)).toString('base64')}"></td>`).join('')}</tr>`).join('');
const cp = await navigateur.newContext({ viewport: { width: 1700, height: 800 } });
const pp = await cp.newPage();
await pp.setContent(`<style>body{margin:0;padding:12px;background:#F2F2F2;font:600 14px sans-serif}table{border-spacing:8px}th{text-align:left;white-space:nowrap}td{vertical-align:top}img{display:block;border:1px solid #BBB}</style><table><tr><th></th>${MODES.map(([, t]) => `<th>${t}</th>`).join('')}</tr>${lignes}</table>`);
await pp.screenshot({ path: join(sortie, 'planche-dessus.jpg'), fullPage: true, type: 'jpeg', quality: 82 });
await navigateur.close();
serveur.close();
