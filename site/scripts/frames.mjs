// Toutes les « frames » du site : les 31 écrans de scripts/ecrans.mjs, à 1 440 px (ordinateur) et
// à 390 px (téléphone), pleine page, aux mêmes noms que captures-la-seance/ (captures du 20 oct.).
// Avec --gpu, la salle 3D est rendue par la vraie carte graphique (couleurs justes, rapide) ;
// sans, en WebGL logiciel (comptez plusieurs minutes). Les pages très longues (annuaire des
// députés) sont coupées à 4 000 px, les autres à 8 000.
//
// Usage (depuis site/) :
//   node scripts/frames.mjs <sortie> [build] [--gpu | --sans-webgl] [--ecrans=01,16,19] [--appareils=ordinateur]
//   ex. node scripts/frames.mjs ../captures-d0 --gpu --ecrans=01,02

import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { APPAREILS, lancer, options, parcourir } from './ecrans.mjs';

const opts = options(process.argv.slice(2));
const [sortie, dossier] = opts.reste;
if (!sortie) { console.error('Usage : node scripts/frames.mjs <sortie> [build] [--gpu] [--ecrans=…] [--appareils=…]'); process.exit(1); }
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: opts.gpu, sansWebgl: opts.sansWebgl });

for (const [appareil, largeur, hauteur] of APPAREILS.filter(([a]) => opts.appareils.includes(a))) {
  const dir = join(sortie, appareil);
  mkdirSync(dir, { recursive: true });
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  page.on('pageerror', (e) => console.log(`  erreur de page : ${e.message}`));
  await parcourir({ page, base, ecrans: opts.ecrans, surEcran: async (nom) => {
    const plafond = /^2[45]-/.test(nom) ? 4000 : 8000;
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: join(dir, `${nom}.png`), fullPage: true, timeout: 300000,
      clip: { x: 0, y: 0, width: largeur, height: Math.min(total, plafond) } });
    console.log(`${appareil} · ${nom}`);
  } });
  await contexte.close();
}
await navigateur.close();
serveur.close();
console.log('Terminé.');
