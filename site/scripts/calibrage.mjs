// Calibrage des couleurs de la salle 3D (docs/design-final/DESIGN-FINAL.md, § 7) : rend, sur la
// vraie carte graphique, les quatre vues de référence (CAM 1 de jour, CAM 2 · Tribune, CAM 3 · Ta
// travée, CAM 1 au verdict, lumières allumées) en 1 920 × 1 080, salle seule, plein cadre ; puis,
// si on lui donne un rendu d'avant, compose une planche avant / après / rendu du prototype
// (docs/design-final/maquettes/images/, three r128 sur une vraie carte graphique).
//
// Usage (depuis site/) :
//   node scripts/calibrage.mjs <sortie> [build] [--avant=<rendus d'avant>] [--logiciel]
//   ex. node scripts/calibrage.mjs ../calibrage/apres --avant=../calibrage/avant

import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const args = process.argv.slice(2);
const [sortie, dossier] = args.filter((a) => !a.startsWith('--'));
const avant = args.find((a) => a.startsWith('--avant='))?.slice(8);
if (!sortie) { console.error('Usage : node scripts/calibrage.mjs <sortie> [build] [--avant=…] [--logiciel]'); process.exit(1); }
mkdirSync(sortie, { recursive: true });
const REFERENCES = resolve(SITE, '..', 'docs', 'design-final', 'maquettes', 'images');

/** La salle seule, plein cadre : ni en-tête, ni bandeaux, ni repères, ni dégradé. */
const PLEIN_ECRAN = `
  main.page { max-width: none !important; padding: 0 !important; }
  .entete, .pied, .evitement { display: none !important; }
  .scene .ecran { height: 100vh !important; min-height: 0 !important; }
  .scene .ecran::after, .scene .dessus, .scene .cameras, .scene .repere { display: none !important; }`;

const VUES = [
  { nom: 'cam1-salle-jour', reference: 'fond-cam1-salle-jour.jpg', page: '/', camera: 'salle' },
  { nom: 'cam2-tribune', reference: 'fond-cam2-tribune.jpg', page: '/', camera: 'tribune' },
  { nom: 'cam3-ta-travee', reference: 'fond-cam3-ta-travee.jpg', page: '/hemicycle/', camera: 'travee', reponses: true },
  { nom: 'verdict-lumieres', reference: 'fond-verdict-lumieres.jpg', page: '/verdict/', camera: 'salle', reponses: true, decouvrir: true },
];

const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: !args.includes('--logiciel') });
const contexte = await navigateur.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
const page = await contexte.newPage();
page.on('pageerror', (e) => console.log(`  erreur de page : ${e.message}`));

// Un visiteur qui a répondu aux 10 votes du quiz (illustratif), pour avoir une place (CAM 3).
await page.goto(`${base}/quiz/`);
const uids = await page.evaluate(() => JSON.parse(document.querySelector('[data-donnees-trancher]').textContent).questions.map((q) => q.uid));
const reponses = Object.fromEntries(uids.map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }]));

for (const v of VUES) {
  await page.goto(`${base}/404.html`);
  await page.evaluate((s) => { localStorage.clear(); for (const [k, x] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(x)); },
    v.reponses ? { '578e.reponses.v1': reponses, '578e.personnage.v1': { peau: 'p3', coiffure: 'courte', tenue: 'ardoise' } } : {});
  await page.goto(base + v.page, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: PLEIN_ECRAN });
  await page.waitForFunction(() => document.querySelector('[data-salle3d]')?.dataset.salle3dEtat === 'prete', null, { timeout: 180000 });
  if (v.decouvrir) {
    await page.evaluate(() => document.querySelector('[data-decouvrir-bouton]')?.click());
    await page.waitForTimeout(3000);
    await page.addStyleTag({ content: PLEIN_ECRAN });
  }
  await page.evaluate((c) => document.querySelector(`[data-camera="${c}"]`)?.click(), v.camera);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(4000);
  await page.locator('[data-salle3d] canvas').screenshot({ path: join(sortie, `${v.nom}.png`), timeout: 300000 });
  console.log(`${v.nom}`);
}
await contexte.close();

// La planche : avant / après / prototype, chaque vue sur une ligne.
if (avant) {
  const url = (p) => `http://planches.local/f/${encodeURIComponent(resolve(p))}`;
  const p2 = await navigateur.newPage({ viewport: { width: 3 * 640 + 80, height: 800 } });
  await p2.route('http://planches.local/f/**', (route) =>
    route.fulfill({ path: decodeURIComponent(new URL(route.request().url()).pathname.slice(3)) }));
  const lignes = VUES.map((v) => {
    const cols = [['Avant', join(avant, `${v.nom}.png`), '#5B5E66'], ['Après', join(sortie, `${v.nom}.png`), '#B3132F'],
      ['Prototype (référence)', join(REFERENCES, v.reference), '#1F6B3A']].filter(([, c]) => existsSync(c));
    return `<h2>${v.nom}</h2><div class="rang">${cols.map(([e, c, couleur]) =>
      `<div><span style="background:${couleur}">${e}</span><img src="${url(c)}"></div>`).join('')}</div>`;
  }).join('');
  await p2.setContent(`<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; padding: 20px; background: #ECEAE5; font: 600 15px 'Segoe UI', system-ui, sans-serif; }
    h2 { margin: 18px 0 8px; font-size: 17px; } .rang { display: flex; gap: 20px; }
    .rang span { display: inline-block; margin-bottom: 6px; padding: 3px 9px; color: #fff; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
    img { display: block; width: 640px; height: 360px; object-fit: cover; }</style>${lignes}`, { waitUntil: 'load' });
  await p2.screenshot({ path: join(sortie, 'planche-avant-apres.jpg'), fullPage: true, type: 'jpeg', quality: 82 });
  console.log(join(sortie, 'planche-avant-apres.jpg'));
}
await navigateur.close();
serveur.close();
