// Les images fixes de la salle (docs/refonte-la-seance.md, § 4) : les pages en mode focus (quiz,
// lots, séance) n'ouvrent pas la 3D en direct ; elles posent leur panneau sur une image de la
// salle vue depuis le sol (CAM 2 · Tribune). Ce script la rend une fois, en développement, avec
// la vraie scène (Playwright, WebGL logiciel), et l'écrit en webp dans public/salle3d/.
//
// Usage (depuis site/) : node scripts/images-fixes.mjs [dossier du build]
// À relancer quand la salle change ; les images sont versionnées.

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';

const dist = resolve(process.argv[2] ?? join(SITE, 'dist'));
const serveur = await servir(dist);
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });

// La scène en plein écran, sans bandeau ni puces, caméra posée sans mouvement.
const PLEIN_ECRAN = `
  main.page { max-width: none !important; padding: 0 !important; }
  .entete, .pied, .ticket, .mise-en-page { display: none !important; }
  .scene .ecran { height: 100vh !important; min-height: 0 !important; }
  .scene .ecran::after, .scene .dessus, .scene .cameras, .scene .repere { display: none !important; }`;

for (const [nom, l, h, echelle] of [['fond-tribune', 1600, 1000, 1], ['fond-tribune-telephone', 430, 932, 2]]) {
  const contexte = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: echelle,
    reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  await page.goto(`${base}/`);
  await page.addStyleTag({ content: PLEIN_ECRAN });
  await page.waitForFunction(() => document.querySelector('[data-salle3d]')?.dataset.salle3dEtat === 'prete',
    null, { timeout: 180000 });
  await page.evaluate(() => document.querySelector('[data-camera="tribune"]')?.click());
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
  const sortie = join(SITE, 'public', 'salle3d', `${nom}.webp`);
  writeFileSync(sortie, Buffer.from(webp, 'base64'));
  console.log(`${nom} : ${Math.round(Buffer.from(webp, 'base64').length / 1024)} Ko`);
  await contexte.close();
}
await navigateur.close();
serveur.close();
