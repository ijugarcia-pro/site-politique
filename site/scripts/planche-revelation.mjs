// La planche de la porte G1 (lot 2 du cadrage MVP, docs/cadrage-mvp-retours-test-578e.md, § 6) :
// la question puis la révélation d'un même vote du quiz, en l'état actuel et avec les prototypes A
// (image fixe + calque 2D) et B (3D allégée), à 1 440 × 900, 1 280 × 650 et 390 × 844, sur la
// vraie carte graphique. Note aussi, pour chaque prise, si un contexte WebGL a été créé. Un
// visiteur neuf, qui répond « Pour » (réponse illustrative, jamais envoyée).
//
// Usage (depuis site/, après un build) : node scripts/planche-revelation.mjs <sortie> [build] [--logiciel]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const args = process.argv.slice(2);
const [sortie, dossier] = args.filter((a) => !a.startsWith('--'));
if (!sortie) { console.error('Usage : node scripts/planche-revelation.mjs <sortie> [build]'); process.exit(1); }
mkdirSync(sortie, { recursive: true });
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: !args.includes('--logiciel') });

const TAILLES = [[1440, 900], [1280, 650], [390, 844]];
const MODES = [['actuel', ''], ['a', 'revelation=a'], ['b', 'revelation=b']];
const bilan = [];

for (const [l, h] of TAILLES) {
  for (const [mode, param] of MODES) {
    const contexte = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: l < 500 ? 2 : 1 });
    // Chaque contexte WebGL créé est noté (le prototype A ne doit en créer aucun).
    await contexte.addInitScript(() => {
      window.__webgl = 0;
      const avant = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...r) {
        if (/webgl/.test(type) && this.isConnected) window.__webgl += 1;
        return avant.call(this, type, ...r);
      };
    });
    const page = await contexte.newPage();
    await page.goto(`${base}/404.html`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${base}/quiz/${param ? `?${param}` : ''}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(mode === 'actuel' ? 9000 : 2500);
    const nom = (etat) => join(sortie, `${l}x${h}-${mode}-${etat}.png`);
    await page.screenshot({ path: nom('1-question') });
    await page.click('[data-reponse="pour"]');
    await page.waitForTimeout(400);
    await page.click('[data-continuer]');
    // Le temps de l'onde (et, pour B, d'ouvrir la 3D au premier dévoilement).
    await page.waitForTimeout(mode === 'b' ? 12000 : 4000);
    await page.screenshot({ path: nom('2-revelation') });
    const webgl = await page.evaluate(() => window.__webgl);
    bilan.push({ taille: `${l} × ${h}`, mode, webgl });
    console.log(`${l} × ${h} · ${mode} : contextes WebGL créés ${webgl}`);
    await contexte.close();
  }
}
writeFileSync(join(sortie, 'bilan.json'), JSON.stringify(bilan, null, 1));

// Une planche par taille : en colonnes l'état actuel, A et B ; en lignes la question puis la révélation.
const NOMS = { actuel: 'Aujourd’hui (glisse de caméra)', a: 'A · image fixe + calque 2D', b: 'B · 3D allégée' };
for (const [l, h] of TAILLES) {
  const image = (mode, etat) => `data:image/png;base64,${readFileSync(join(sortie, `${l}x${h}-${mode}-${etat}.png`)).toString('base64')}`;
  const largeur = l < 500 ? 300 : 560;
  const cellules = MODES.map(([mode]) => {
    const w = bilan.find((b) => b.taille === `${l} × ${h}` && b.mode === mode)?.webgl ?? '?';
    return `<figure><figcaption>${NOMS[mode]} · WebGL : ${w ? 'oui' : 'aucun'}</figcaption>`
      + `<img src="${image(mode, '1-question')}"><img src="${image(mode, '2-revelation')}"></figure>`;
  }).join('');
  const contexte = await navigateur.newContext({ viewport: { width: 3 * largeur + 80, height: 400 } });
  const page = await contexte.newPage();
  await page.setContent(`<style>body{margin:0;padding:20px;background:#F2F2F2;font:600 15px/1.3 sans-serif;color:#121212}
    h1{font-size:18px;margin:0 0 12px}main{display:flex;gap:20px}figure{margin:0;width:${largeur}px;display:flex;flex-direction:column;gap:8px}
    img{width:100%;display:block;border:1px solid #E7E7E7}</style>
    <h1>Porte G1 · le dévoilement d’un vote du quiz · ${l} × ${h} · question puis révélation</h1><main>${cellules}</main>`);
  await page.screenshot({ path: join(sortie, `planche-${l}x${h}.jpg`), fullPage: true, type: 'jpeg', quality: 82 });
  await contexte.close();
}
await navigateur.close();
serveur.close();
