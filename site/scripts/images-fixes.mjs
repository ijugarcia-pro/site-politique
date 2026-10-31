// Les images fixes de la salle, rendues une fois en développement avec la vraie scène et écrites
// en webp dans public/salle3d/ (versionnées ; à relancer quand la salle change). Avec --gpu, sur la
// vraie carte graphique (couleurs justes) ; sans, en WebGL logiciel.
//
// Depuis le lot 2 du cadrage MVP (docs/cadrage-mvp-retours-test-578e.md, R1), le script passe par
// la page interne /vdef-composants/place/?vue=… (la vue posée sans mouvement, toute l'interface
// masquée) : l'ancienne commande des caméras (`[data-camera]`) a disparu avec la VDEF. Images :
// - fond-revelation : la vue haute du dévoilement (salle3d/cadrage-haut.ts), sièges clairs et
//   neutres, sans voyants. Le prototype A y peint les 577 sièges aux couleurs du vote ; les
//   proportions (1,2 sur ordinateur, 1,3 au téléphone) sont celles de la zone que la feuille laisse
//   voir, et ses sièges sont posés au build avec les mêmes proportions (siegesHaut).
// - fond-tribune, fond-salle : les fonds des pages (Base.astro), à ne régénérer qu'exprès
//   (--vues=fond-tribune,fond-salle). fond-verdict n'a plus de recette : il date de « La Séance ».
//
// Usage (depuis site/) : node scripts/images-fixes.mjs [dossier du build] [--gpu] [--vues=fond-revelation]

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const args = process.argv.slice(2);
const dist = resolve(args.find((a) => !a.startsWith('--')) ?? join(SITE, 'dist'));
const voulues = (args.find((a) => a.startsWith('--vues='))?.split('=')[1] ?? 'fond-revelation').split(',');
const serveur = await servir(dist);
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: args.includes('--gpu') });

// Toute l'interface masquée : la salle seule, sur toute la fenêtre.
const SALLE_SEULE = `
  .sur-salle, .barre-haut, .barre-bas, [data-barre-normale], [data-barre-focus], .evitement,
  .salle-vdef .calque { display: none !important; }
  .salle-vdef canvas { transition: none !important; }`;

/** [nom, vue, neutre, formats : [suffixe, largeur, hauteur, densité]] */
const VUES = [
  ['fond-revelation', 'haute', true, [['', 1200, 1000, 1], ['-telephone', 390, 300, 2]]],
  ['fond-tribune', 'tribune', false, [['', 1600, 1000, 1], ['-telephone', 430, 932, 2]]],
  ['fond-salle', 'salle', false, [['', 1600, 1000, 1], ['-telephone', 430, 932, 2]]],
].filter(([nom]) => voulues.includes(nom));

for (const [nom, vue, neutre, formats] of VUES) {
  for (const [suffixe, l, h, densite] of formats) {
    const contexte = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: densite,
      reducedMotion: 'reduce' });
    const page = await contexte.newPage();
    await page.goto(`${base}/vdef-composants/place/?vue=${vue}${neutre ? '&neutre' : ''}&qualite=0`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: SALLE_SEULE });
    // Sans feuille, le cadre de la salle est toute la fenêtre (Salle.astro le relit au redimensionnement).
    await page.evaluate(() => dispatchEvent(new Event('resize')));
    await page.waitForFunction(() => document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat === 'prete',
      null, { timeout: 180000 });
    await page.waitForTimeout(3000);
    const png = await page.locator('[data-salle-vdef] canvas').screenshot({ timeout: 300000 });
    // En webp, par le navigateur (pas de dépendance d'image côté Node).
    const webp = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', 0.8).split(',')[1];
    }, png.toString('base64'));
    const fichier = `${nom}${suffixe}`;
    writeFileSync(join(SITE, 'public', 'salle3d', `${fichier}.webp`), Buffer.from(webp, 'base64'));
    console.log(`${fichier} : ${l * densite} × ${h * densite}, ${Math.round(Buffer.from(webp, 'base64').length / 1024)} Ko`);
    await contexte.close();
  }
}
await navigateur.close();
serveur.close();
