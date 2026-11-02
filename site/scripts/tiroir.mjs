// Le contrôle du tiroir et de l'immersion (cadrage MVP, R4 et R10, lot 5), à 390 × 844 et 360 × 640,
// avec la planche demandée (trois crans et immersion) : les crans au clavier et au glisser de la
// poignée ; le glisser de la salle ne bouge pas le tiroir, ni le glisser de la poignée la salle ;
// l'immersion ne laisse que la salle et le bouton, garde le focus sur le bouton, dit son état, sort à
// Échap, et s'arrête en changeant de page ; rien n'est écrit dans le stockage du navigateur. Un
// visiteur inventé (12 réponses illustratives, jamais envoyées).
//
// Usage (depuis site/, après un build) : node scripts/tiroir.mjs <sortie> [build]

import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const [sortie, dossier] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!sortie) { console.error('Usage : node scripts/tiroir.mjs <sortie> [build]'); process.exit(1); }
mkdirSync(sortie, { recursive: true });
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: true });

let echecs = 0;
const verifier = (ok, texte) => { console.log(`${ok ? '✓' : '✗'} ${texte}`); if (!ok) echecs += 1; };
const TAILLES = [[390, 844], [360, 640]];
const ETATS = ['replie', 'moyen', 'plein', 'immersion'];

for (const [l, h] of TAILLES) {
  console.log(`\n${l} × ${h}`);
  const contexte = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 2 });
  const page = await contexte.newPage();
  await page.goto(`${base}/404.html`);
  const votes = await page.evaluate(async () => (await (await fetch('/donnees/matrice.json')).json()).votes.slice(0, 12));
  await page.evaluate((v) => { localStorage.clear(); localStorage.setItem('578e.reponses.v1', JSON.stringify(Object.fromEntries(v.map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }])))); }, votes);
  await page.goto(`${base}/salle/?qualite=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat === 'prete', null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const cran = () => page.evaluate(() => document.querySelector('.sur-salle').dataset.cran);
  const hauteur = () => page.evaluate(() => Math.round(document.querySelector('.sur-salle').getBoundingClientRect().height));
  const poignee = page.locator('[data-tiroir-poignee]');
  const prendre = (nom) => page.screenshot({ path: join(sortie, `${l}x${h}-${nom}.png`) });

  verifier(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'la page ne défile pas : le contenu défile dans le tiroir');
  verifier(await page.evaluate(() => { const c = document.querySelector('[data-salle-vdef] canvas').getBoundingClientRect(); return c.width >= innerWidth - 1 && c.height >= innerHeight - 1; }), 'la salle occupe tout l\'écran, derrière le tiroir');
  const b = await poignee.boundingBox();
  verifier(b.height >= 44, `la poignée fait ${Math.round(b.height)} px de haut`);

  // Au clavier : moyen → plein → replié → moyen.
  await poignee.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  verifier(await cran() === 'plein', 'Entrée passe au cran plein');
  await prendre('plein');
  const hPlein = await hauteur();
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  verifier(await cran() === 'replie', 'Espace passe au cran replié');
  verifier(await poignee.getAttribute('aria-expanded') === 'false', 'aria-expanded dit que le tiroir est replié');
  await prendre('replie');
  const hReplie = await hauteur();
  verifier(hReplie >= 60 && hReplie <= 90, `replié : ${hReplie} px`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  verifier(await cran() === 'moyen', 'Entrée revient au cran moyen');
  await prendre('moyen');
  const hMoyen = await hauteur();
  verifier(hReplie < hMoyen && hMoyen < hPlein, `moyen entre les deux : ${hMoyen} px (plein : ${hPlein} px)`);

  // La barre du bas ne masque pas le tiroir.
  verifier(await page.evaluate(() => { const m = document.querySelector('.sur-salle').getBoundingClientRect(); const b = document.querySelector('.barre-bas').getBoundingClientRect(); return m.bottom <= b.top + 1; }), 'le tiroir s\'arrête au-dessus de la barre du bas');

  // Au glisser de la poignée : vers le haut, le plein ; vers le bas, le replié.
  const glisser = async (de, vers) => {
    const x = l / 2;
    await page.mouse.move(x, de);
    await page.mouse.down();
    for (let k = 1; k <= 5; k += 1) await page.mouse.move(x, de + ((vers - de) * k) / 5);
    await page.mouse.up();
    await page.waitForTimeout(350);
  };
  let p = await poignee.boundingBox();
  await glisser(p.y + 20, 90);
  verifier(await cran() === 'plein', 'glisser la poignée vers le haut : cran plein');
  p = await poignee.boundingBox();
  await glisser(p.y + 20, h - 40);
  verifier(await cran() === 'replie', 'glisser la poignée vers le bas : cran replié');

  // Le glisser de la salle ne bouge pas le tiroir, et tourne la salle.
  const zone = { x: 40, y: 120, width: l - 80, height: 180 };
  const avant = await page.screenshot({ clip: zone });
  await page.mouse.move(l / 2, 220);
  await page.mouse.down();
  for (let k = 1; k <= 5; k += 1) await page.mouse.move(l / 2 + 25 * k, 220);
  await page.mouse.up();
  await page.waitForTimeout(800);
  verifier(await cran() === 'replie', 'glisser sur la salle ne bouge pas le tiroir');
  verifier(!avant.equals(await page.screenshot({ clip: zone })), 'glisser sur la salle la fait tourner');

  // L'immersion.
  const bouton = page.locator('[data-immersion]');
  await bouton.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  verifier(await bouton.getAttribute('aria-pressed') === 'true', 'immersion : aria-pressed est vrai');
  verifier(await page.evaluate(() => document.activeElement?.hasAttribute('data-immersion')), 'immersion : le focus reste sur le bouton');
  verifier(await page.evaluate(() => ['.sur-salle', '.barre-bas', '.barre-haut'].every((s) => { const e = document.querySelector(s); return !e || getComputedStyle(e).display === 'none'; })), 'immersion : feuille et barres masquées');
  verifier(await bouton.isVisible(), 'immersion : le bouton reste');
  await page.waitForTimeout(400);
  await prendre('immersion');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  verifier(await bouton.getAttribute('aria-pressed') === 'false', 'Échap sort de l\'immersion');
  await bouton.click();
  await page.waitForTimeout(100);
  await page.evaluate(() => { const a = document.createElement('a'); a.href = '/ta-place/'; document.body.append(a); a.click(); });
  await page.waitForFunction(() => location.pathname === '/ta-place/');
  await page.waitForTimeout(800);
  verifier(await page.evaluate(() => !document.body.classList.contains('immersion')), 'l\'immersion s\'arrête en changeant de page');
  verifier(await page.evaluate(() => !Object.keys(localStorage).some((k) => /tiroir|cran|immersion|indice/i.test(k))), 'ni le tiroir ni l’immersion n’écrivent dans le stockage du navigateur');
  await contexte.close();
}

// La planche : les trois crans et l'immersion, par taille.
const lignes = TAILLES.map(([l, h]) => `<tr><th>${l} × ${h}</th>${ETATS.map((e) => `<td><img src="data:image/png;base64,${readFileSync(join(sortie, `${l}x${h}-${e}.png`)).toString('base64')}"></td>`).join('')}</tr>`).join('');
const cp = await navigateur.newContext({ viewport: { width: 1300, height: 800 } });
const pp = await cp.newPage();
await pp.setContent(`<style>body{margin:0;padding:12px;background:#F2F2F2;font:600 14px sans-serif}table{border-spacing:8px}th{text-align:left}td{vertical-align:top}img{display:block;width:270px;border:1px solid #BBB}</style><table><tr><th></th><th>Replié</th><th>Moyen</th><th>Plein</th><th>Immersion</th></tr>${lignes}</table>`);
await pp.screenshot({ path: join(sortie, 'planche-tiroir.jpg'), fullPage: true, type: 'jpeg', quality: 82 });
await navigateur.close();
serveur.close();
console.log(echecs ? `\n${echecs} contrôle(s) en échec.` : '\nTiroir et immersion : tous les contrôles passent.');
process.exit(echecs ? 1 : 0);
