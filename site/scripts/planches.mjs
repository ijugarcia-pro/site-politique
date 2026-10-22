// Planches de comparaison (VDEF, lot V10 ; d'abord DESIGN-FINAL.md, § 9) : pour chaque capture
// d'écran (frames.mjs), une image qui la pose à côté de la capture de la maquette VDEF
// correspondante (docs/design-vdef/captures/), et, si on lui donne les captures d'avant, à côté
// de l'écran d'avant. Mêmes largeurs, haut aligné ; un
// pointillé rouge marque le bas du premier écran (900 px sur ordinateur, 844 sur téléphone).
// Composées par Playwright (une page HTML, capturée en JPEG) : aucune dépendance de plus.
//
// Usage (depuis site/) :
//   node scripts/planches.mjs <captures> <sortie> [--avant=<captures d'avant>] [--titre=D1]
//                             [--ecrans=01,16] [--appareils=ordinateur]
//   ex. node scripts/planches.mjs ../captures-vdef ../docs/design-vdef/planches/final --titre=VDEF

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';
import { APPAREILS, options } from './ecrans.mjs';

const MAQUETTES = resolve(SITE, '..', 'docs', 'design-vdef', 'captures');

/** Quelle capture de la maquette VDEF montre quel écran (préfixe du nom de capture), par appareil. */
const CORRESPONDANCES = {
  ordinateur: { '01': '01-tribune-premiere-visite', '02': '05-tribune', '03': '09-la-salle', '04': '15-dossier-theme',
    '05': '02-quiz-question', '06': '03-quiz-revelation', '07': '04-ta-place-est-prete', '09': '06-trancher',
    '10': '03-quiz-revelation', '11': '07-seance-terminee', '12': '06-trancher', '13': '06b-trancher-repondu',
    '14': '07-seance-terminee', '15': '08-verdict', '16': '08-verdict', '17': '11-tes-reponses', '18': '10-ta-place',
    '19': '10-ta-place', '20': '09-la-salle', '21': '12-ton-parcours', '22': '13-la-galerie', '23': '14a-vote-essentiel',
    '24': '16-trouver-ton-depute', '25': '16-trouver-ton-depute', '26': '17-fiche-depute', '27': '18-comment-c-est-calcule',
    '28': '18-comment-c-est-calcule', '29': '18-comment-c-est-calcule', '30': '18-comment-c-est-calcule' },
  telephone: { '01': 'T1-tel-tribune', '02': 'T1-tel-tribune', '05': 'T2-tel-trancher', '09': 'T2-tel-trancher',
    '12': 'T2-tel-trancher', '13': 'T2-tel-trancher', '19': 'T3-tel-ta-place', '22': 'T4-tel-galerie', '26': 'T5-tel-fiche-depute' },
};

const MISE_EN_PAGE = {
  ordinateur: { colonne: 960, echelle: 960 / 1440, pli: 900, plafond: 2400 },
  telephone: { colonne: 390, echelle: 1, pli: 844, plafond: 2600 },
};

const opts = options(process.argv.slice(2));
const libres = opts.reste.filter((a) => !a.startsWith('--'));
const drapeau = (nom) => opts.reste.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const [captures, sortie] = libres;
if (!captures || !sortie) {
  console.error('Usage : node scripts/planches.mjs <captures> <sortie> [--avant=…] [--titre=…] [--ecrans=…] [--appareils=…]');
  process.exit(1);
}
const avant = drapeau('avant');
const titre = drapeau('titre') ?? 'site';
mkdirSync(sortie, { recursive: true });

const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const url = (chemin) => `http://planches.local/f/${encodeURIComponent(resolve(chemin))}`;

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1200, height: 800 } });
// Les images sont servies depuis le disque par interception : pas de serveur, pas de data: géants.
await page.route('http://planches.local/f/**', (route) =>
  route.fulfill({ path: decodeURIComponent(new URL(route.request().url()).pathname.slice(3)) }));

let n = 0;
for (const [appareil] of APPAREILS.filter(([a]) => opts.appareils.includes(a))) {
  const dir = join(captures, appareil);
  if (!existsSync(dir)) continue;
  const m = MISE_EN_PAGE[appareil];
  for (const fichier of readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
    const nom = basename(fichier, '.png');
    if (opts.ecrans && !opts.ecrans.some((p) => nom.startsWith(p))) continue;
    const colonnes = [];
    const ancien = avant && join(avant, appareil, fichier);
    if (ancien && existsSync(ancien)) colonnes.push(['Avant', ancien, '#5B5E66']);
    colonnes.push([`Site · ${titre}`, join(dir, fichier), '#2F7BFF']);
    const maquette = CORRESPONDANCES[appareil][nom.slice(0, 2)];
    if (maquette) colonnes.push([`Maquette · ${maquette.replace(/-/g, ' ')}`, join(MAQUETTES, `${maquette}.jpg`), '#121212']);
    if (colonnes.length < 2) continue;

    const html = `<!doctype html><meta charset="utf-8"><style>
      body { margin: 0; padding: 20px; background: #F2F2F2; font: 600 15px/1.2 'Segoe UI', system-ui, sans-serif; color: #121212; width: max-content; }
      h1 { margin: 0 0 14px; font-size: 20px; }
      .rang { display: flex; gap: 20px; align-items: flex-start; }
      .col { width: ${m.colonne}px; }
      .etiquette { display: inline-block; margin-bottom: 8px; padding: 4px 10px; border-radius: 999px; color: #fff; font-size: 13px; }
      .cadre { position: relative; max-height: ${m.plafond}px; overflow: hidden; background: #2A211B; }
      .cadre img { display: block; width: ${m.colonne}px; }
      .pli { position: absolute; left: 0; right: 0; top: ${Math.round(m.pli * m.echelle)}px; border-top: 2px dashed #FF2A55; }
      .pli span { position: absolute; right: 4px; top: 2px; padding: 1px 5px; background: #FF2A55; color: #fff; font-size: 11px; }
      .coupe { margin-top: 4px; font-size: 12px; color: #5B5E66; font-weight: 500; }
    </style>
    <h1>${echapper(nom)} · ${appareil === 'ordinateur' ? 'ordinateur, 1 440 px' : 'téléphone, 390 px'}</h1>
    <div class="rang">${colonnes.map(([etiquette, chemin, couleur]) => `
      <div class="col"><span class="etiquette" style="background:${couleur}">${echapper(etiquette)}</span>
        <div class="cadre"><img src="${url(chemin)}"><div class="pli"><span>pli</span></div></div>
        <div class="coupe" data-coupe></div></div>`).join('')}
    </div>`;
    await page.setViewportSize({ width: colonnes.length * (m.colonne + 20) + 20, height: 800 });
    await page.setContent(html, { waitUntil: 'load' });
    // Signale les colonnes coupées par le plafond de hauteur.
    await page.evaluate((plafond) => {
      for (const col of document.querySelectorAll('.col')) {
        const img = col.querySelector('img');
        if (img.getBoundingClientRect().height > plafond) col.querySelector('[data-coupe]').textContent = '… coupée (capture plus longue)';
      }
    }, m.plafond);
    const cible = join(sortie, `${appareil}-${nom}.jpg`);
    await page.screenshot({ path: cible, fullPage: true, type: 'jpeg', quality: 80 });
    n += 1;
    console.log(cible);
  }
}
await navigateur.close();
console.log(`${n} planche(s).`);
