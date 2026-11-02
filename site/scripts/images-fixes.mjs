// Les images fixes de la salle, rendues une fois en développement avec la vraie scène et écrites
// en webp dans public/salle3d/ (versionnées ; à relancer quand la salle change). Avec --gpu, sur la
// vraie carte graphique (couleurs justes) ; sans, en WebGL logiciel.
//
// Depuis le lot 2 du cadrage MVP (docs/cadrage-mvp-retours-test-578e.md, R1), le script passe par
// la page interne /vdef-composants/place/?vue=… (la vue posée sans mouvement, toute l'interface
// masquée) : l'ancienne commande des caméras (`[data-camera]`) a disparu avec la VDEF. Images :
// - fond-revelation : le Dessus du dévoilement (salle3d/cadrage-haut.ts, FORMATS_DEVOILEMENT), sièges
//   clairs et neutres, sans voyants, plus le masque de ses sièges (PNG, un siège = son numéro + 1
//   codé en R et G, sur la seule zone de la salle) : le calque 2D y peint les 577 sièges au pixel
//   près. Ses sièges sont posés au build avec les mêmes proportions (positionsDevoilement).
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

/** [nom, vue, neutre, formats : [suffixe, largeur, hauteur, densité, zone de la salle]] */
const VUES = [
  ['fond-revelation', 'dessus', true, [['', 2000, 1400, 1, [1200, 1000]], ['-telephone', 620, 1000, 1.6, [390, 618]]]],
  ['fond-tribune', 'tribune', false, [['', 1600, 1000, 1], ['-telephone', 430, 932, 2]]],
  ['fond-salle', 'salle', false, [['', 1600, 1000, 1], ['-telephone', 430, 932, 2]]],
].filter(([nom]) => voulues.includes(nom));

for (const [nom, vue, neutre, formats] of VUES) {
  for (const [suffixe, l, h, densite, zone] of formats) {
    const contexte = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: densite,
      reducedMotion: 'reduce' });
    const page = await contexte.newPage();
    await page.goto(`${base}/vdef-composants/place/?vue=${vue}${neutre ? '&neutre' : ''}&qualite=0`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: SALLE_SEULE });
    // Sans feuille, le cadre de la salle est toute la fenêtre (Salle.astro le relit au redimensionnement).
    await page.evaluate(() => dispatchEvent(new Event('resize')));
    await page.waitForFunction(() => document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat === 'prete',
      null, { timeout: 180000 });
    // La salle tient dans la zone, centrée ; le reste de l'image est ce qui l'entoure. Après le
    // recadrage que le redimensionnement a programmé (Salle.astro, 120 ms).
    await page.waitForTimeout(400);
    if (zone) await page.evaluate(([gx, gy]) => window.__salle.cadre({ gauche: gx, droite: gx, haut: gy, bas: gy }), [(l - zone[0]) / 2, (h - zone[1]) / 2]);
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
    console.log(`${fichier} : ${Math.round(l * densite)} × ${Math.round(h * densite)}, ${Math.round(Buffer.from(webp, 'base64').length / 1024)} Ko`);
    if (zone) {
      // Le masque des sièges, en PNG sans perte, recadré sur la zone de la salle.
      const masque = await page.evaluate(([zl, zh, lc, hc]) => {
        const { largeur, hauteur, pixels } = window.__salle.masqueSieges();
        const fx = zl / lc, fy = zh / hc, w = Math.round(largeur * fx), h2 = Math.round(hauteur * fy);
        const x0 = Math.round((largeur - w) / 2), y0 = Math.round((hauteur - h2) / 2);
        const sortie = new Uint8ClampedArray(w * h2 * 4), vus = new Set();
        for (let y = 0; y < h2; y++) for (let x = 0; x < w; x++) {
          const p = ((y + y0) * largeur + x + x0) * 4, q = (y * w + x) * 4;
          sortie[q] = pixels[p]; sortie[q + 1] = pixels[p + 1]; sortie[q + 2] = 0; sortie[q + 3] = 255;
          if (pixels[p] || pixels[p + 1]) vus.add(pixels[p] + 256 * pixels[p + 1]);
        }
        const c = document.createElement('canvas'); c.width = w; c.height = h2;
        c.getContext('2d').putImageData(new ImageData(sortie, w, h2), 0, 0);
        return { url: c.toDataURL('image/png').split(',')[1], sieges: vus.size, w, h: h2 };
      }, [zone[0], zone[1], l, h]);
      const octets = Buffer.from(masque.url, 'base64');
      writeFileSync(join(SITE, 'public', 'salle3d', `${fichier}-masque.png`), octets);
      console.log(`${fichier}-masque : ${masque.w} × ${masque.h}, ${Math.round(octets.length / 1024)} Ko, ${masque.sieges} sièges`);
      if (masque.sieges !== 577) throw new Error(`masque : ${masque.sieges} sièges au lieu de 577`);
    }
    await contexte.close();
  }
}
await navigateur.close();
serveur.close();
