// Précalcul des matières de la salle 3D (docs/refonte-la-seance.md, § 9.4, accord de Julien du
// 20 octobre 2026). Les matières sont celles du prototype de Julien (docs/salle-3d/textures.js),
// calculées une fois, en développement, dans le navigateur de Playwright, puis écrites en webp
// dans public/salle3d/. Le visiteur télécharge les images au lieu de les calculer (3 s sur un
// ordinateur, environ 14 s avec un processeur ralenti 4 fois, mesurés le 20 octobre).
//
// Usage (depuis site/) : node scripts/matieres.mjs
// À relancer seulement si docs/salle-3d/textures.js change ; les images sont versionnées.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';

const SOURCE = resolve(SITE, '..', 'docs', 'salle-3d', 'textures.js');
const SORTIE = join(SITE, 'public', 'salle3d');

const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: `${readFileSync(SOURCE, 'utf8')};window.MAT = MAT;` });
const images = await page.evaluate(() => {
  const M = window.MAT;
  const bois = M.noyer(7);
  const pan = M.panneaux(bois, 4, 1, 26);
  const vel = M.velours();
  const moq = M.moquette();
  const cai = M.caisson();
  const mos = M.mosaique();
  const bal = M.balustrade();
  const ent = M.entablement();
  const mur = M.murFond();
  const facT = M.facade(83, true);
  const facP = M.facade(89, false);
  // La mosaïque du sol est vue de loin : réduite de moitié (couleur) et au quart (relief), elle
  // passe de 2,9 Mo à quelques centaines de Ko.
  const reduire = (c, f) => {
    const r = document.createElement('canvas');
    r.width = Math.round(c.width / f); r.height = Math.round(c.height / f);
    const x = r.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, r.width, r.height);
    return r;
  };
  // nom → [canevas, couleur ?] ; une carte de relief, de rugosité ou de métal n'est pas une couleur.
  const liste = {
    bois: [bois.c, 1], 'bois-h': [bois.h, 0], 'bois-r': [bois.ro, 0], 'bois-clair': [M.noyer(9, 0.05).c, 1],
    panneau: [pan.c, 1], 'panneau-h': [pan.h, 0], velours: [vel.c, 1], 'velours-h': [vel.h, 0],
    moquette: [moq.c, 1], 'moquette-h': [moq.h, 0], marbre: [M.marbre(17, 'gris-rose').c, 1],
    statuaire: [M.marbre(19, 'statuaire').c, 1], patine: [M.patine().ro, 0],
    caisson: [cai.c, 1], 'caisson-h': [cai.h, 0], 'caisson-m': [cai.m, 0], 'caisson-r': [cai.ro, 0],
    verriere: [M.verriere().c, 1], vitrage: [M.vitrage().c, 1], mosaique: [reduire(mos.c, 2), 1], 'mosaique-h': [reduire(mos.h, 4), 0],
    cannelures: [M.cannelures().h, 0], balustrade: [bal.a, 1], 'balustrade-h': [bal.h, 0],
    entablement: [ent.c, 1], 'entablement-h': [ent.h, 0], 'entablement-m': [ent.m, 0], galerie: [M.galerie().c, 1],
    mur: [mur.c, 1], 'mur-h': [mur.h, 0], tribune: [facT.c, 1], 'tribune-h': [facT.h, 0],
    perchoir: [facP.c, 1], 'perchoir-h': [facP.h, 0], plaque: [M.plaque578(), 1], environnement: [M.environnement(), 1],
  };
  return Object.fromEntries(Object.entries(liste).map(([nom, [c, couleur]]) =>
    [nom, { url: c.toDataURL('image/webp', couleur ? 0.86 : 0.9), l: c.width, h: c.height, couleur }]));
});
await navigateur.close();

mkdirSync(SORTIE, { recursive: true });
const manifeste = {};
let total = 0;
for (const [nom, { url, l, h, couleur }] of Object.entries(images)) {
  const octets = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(join(SORTIE, `${nom}.webp`), octets);
  manifeste[nom] = { l, h, couleur: !!couleur };
  total += octets.length;
}
writeFileSync(join(SORTIE, 'matieres.json'), `${JSON.stringify(manifeste, null, 1)}\n`);
console.log(`${Object.keys(images).length} matières, ${Math.round(total / 1024)} Ko, dans ${SORTIE}`);
