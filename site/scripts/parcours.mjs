// Les états qui demandent un geste (docs/refonte-la-seance.md, § 7) : la révélation après un
// vote du quiz, le verdict découvert, la fin d'un lot et la fin de la séance, à 390 et 1 440 px,
// avec et sans mouvement réduit. Complète scripts/captures.mjs, qui photographie les pages telles
// qu'elles s'ouvrent. Vérifie aussi que les boutons de vote ont le même style, à la couleur de
// leur pastille près.
//
// Usage (depuis site/) : node scripts/parcours.mjs <dossier de sortie> [dossier du build]

import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';

const [sortie, dossier] = process.argv.slice(2);
if (!sortie) { console.error('Usage : node scripts/parcours.mjs <sortie> [build]'); process.exit(1); }
mkdirSync(sortie, { recursive: true });
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await chromium.launch();

/** Trancher les votes de l'écran ouvert (« Pour » à chaque fois) jusqu'à l'écran de fin. */
async function trancher(page, max) {
  for (let i = 0; i < max; i++) {
    const r = await page.$('[data-reponse="pour"]:not([disabled]):visible');
    if (!r) break;
    await r.click();
    await page.waitForTimeout(400);
    const suite = await page.$('[data-suivant]:visible, [data-continuer]:visible');
    if (suite) { await suite.click(); await page.waitForTimeout(500); }
  }
  await page.waitForTimeout(2600);
}

let ecarts = 0;
for (const [largeur, hauteur] of [[390, 844], [1440, 900]]) {
  for (const reduit of [false, true]) {
    const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur },
      reducedMotion: reduit ? 'reduce' : 'no-preference' });
    const page = await contexte.newPage();
    const nom = (n) => join(sortie, `${n}-${largeur}${reduit ? '-reduit' : ''}.png`);

    await page.goto(`${base}/quiz/`);
    await page.click('[data-reponse="contre"]');
    await page.waitForTimeout(2600);
    await page.screenshot({ path: nom('quiz-revelation'), fullPage: true });
    // Neutralité : hors pastille et état choisi, les trois boutons ont le même style.
    const styles = await page.evaluate(() => [...document.querySelectorAll('[data-reponse]')].map((e) => {
      const s = getComputedStyle(e);
      return [s.backgroundColor, s.fontSize, s.minHeight, s.fontFamily, e.classList.contains('choisi')
        ? 'choisi' : `${s.opacity}/${s.transform}`].join(' ');
    }));
    const eteints = new Set(styles.filter((s) => !s.endsWith('choisi')));
    if (eteints.size !== 1) { ecarts++; console.log(`${largeur} : boutons différents`, styles); }

    await page.goto(`${base}/verdict/`);
    const bouton = await page.$('[data-decouvrir-bouton]:visible');
    if (bouton) { await bouton.click(); await page.waitForTimeout(2600); }
    await page.screenshot({ path: nom('verdict-decouvert'), fullPage: true });

    await page.goto(`${base}/lots/`);
    await trancher(page, 3);
    await page.screenshot({ path: nom('lots-fin'), fullPage: true });

    await page.goto(`${base}/seance/`);
    await trancher(page, 5);
    await page.screenshot({ path: nom('seance-fin'), fullPage: true });
    await contexte.close();
  }
}
await navigateur.close();
serveur.close();
console.log(ecarts ? `${ecarts} écart(s) de style entre les boutons de vote` : 'Boutons de vote : même style pour chaque choix.');
