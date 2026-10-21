// Les images fixes de la salle (docs/refonte-la-seance.md, § 4 ; docs/design-final/DESIGN-FINAL.md,
// § 5.1 et § 7). Les pages en mode focus (quiz, lots, séance) n'ouvrent pas la 3D en direct : elles
// posent leur panneau sur la salle vue depuis le sol (CAM 2 · Tribune). Les scènes plein cadre
// (accueil, Mon hémicycle, verdict) montrent, tant que la 3D n'est pas prête ou si elle ne peut pas
// s'ouvrir, la même caméra en image : CAM 1 de jour, et CAM 1 au verdict (lumières allumées,
// voyants éteints : aucun vrai vote n'est figé dans l'image). CAM 3 n'a pas d'image fixe : elle
// part du siège de chaque visiteur.
// Ce script les rend une fois, en développement, avec la vraie scène, et les écrit en webp dans
// public/salle3d/. Avec --gpu, sur la vraie carte graphique (couleurs justes) ; sans, en WebGL
// logiciel.
//
// Usage (depuis site/) : node scripts/images-fixes.mjs [dossier du build] [--gpu]
// À relancer quand la salle change ; les images sont versionnées.

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const args = process.argv.slice(2);
const dist = resolve(args.find((a) => !a.startsWith('--')) ?? join(SITE, 'dist'));
const serveur = await servir(dist);
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: args.includes('--gpu') });

// La scène en plein écran, sans en-tête, bandeau, puces ni repères, caméra posée sans mouvement.
const PLEIN_ECRAN = `
  main.page { max-width: none !important; padding: 0 !important; }
  .entete, .pied, .ticket, .mise-en-page { display: none !important; }
  .scene .ecran { height: 100vh !important; min-height: 0 !important; }
  .scene .ecran::after, .scene .dessus, .scene .cameras, .scene .repere { display: none !important; }`;

const FORMATS = [['', 1600, 1000, 1], ['-telephone', 430, 932, 2]];
const VUES = [
  { nom: 'fond-tribune', page: '/', camera: 'tribune' },
  { nom: 'fond-salle', page: '/', camera: 'salle' },
  { nom: 'fond-verdict', page: '/verdict/', camera: 'salle', verdict: true },
];

for (const v of VUES) {
  for (const [suffixe, l, h, echelle] of FORMATS) {
    const contexte = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: echelle,
      reducedMotion: 'reduce' });
    const page = await contexte.newPage();
    if (v.verdict) {
      // Les voyants éteints : chaque siège devient « - » (n'a pas pris part au vote) dans les données
      // de la page, le temps du rendu. Rien n'est modifié dans le build.
      await page.route(`${base}/verdict/`, async (route) => {
        const reponse = await route.fetch();
        const html = (await reponse.text()).replace(/"sieges":"([^"]*)"/g, (_, s) => `"sieges":"${'-'.repeat(s.length)}"`);
        await route.fulfill({ response: reponse, body: html });
      });
    }
    await page.goto(base + v.page, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: PLEIN_ECRAN });
    await page.waitForFunction(() => document.querySelector('[data-salle3d]')?.dataset.salle3dEtat === 'prete',
      null, { timeout: 180000 });
    if (v.verdict) {
      await page.evaluate(() => document.querySelector('[data-decouvrir-bouton]')?.click());
      await page.waitForTimeout(1500);
      await page.addStyleTag({ content: PLEIN_ECRAN });
      await page.evaluate(() => scrollTo(0, 0));
    }
    await page.evaluate((c) => document.querySelector(`[data-camera="${c}"]`)?.click(), v.camera);
    await page.waitForTimeout(4000);
    const png = await page.locator('[data-salle3d] canvas').screenshot({ timeout: 300000 });
    // En webp, par le navigateur (pas de dépendance d'image côté Node).
    const webp = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', 0.78).split(',')[1];
    }, png.toString('base64'));
    const nom = `${v.nom}${suffixe}`;
    writeFileSync(join(SITE, 'public', 'salle3d', `${nom}.webp`), Buffer.from(webp, 'base64'));
    console.log(`${nom} : ${Math.round(Buffer.from(webp, 'base64').length / 1024)} Ko`);
    await contexte.close();
  }
}
await navigateur.close();
serveur.close();
