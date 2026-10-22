// Captures des écrans pour chaque PR de la refonte « La Séance » (docs/refonte-la-seance.md, § 7) :
// sert le build (site/dist ou le dossier donné) sur un petit serveur local, puis photographie
// chaque page à 390 px et à 1440 px avec Playwright (Chromium), en « nouveau visiteur » et en
// visiteur qui a déjà répondu au quiz (réponses illustratives écrites dans le stockage local de
// la page, jamais envoyées). Rien ne sort du poste.
//
// Usage (depuis site/) :
//   node scripts/captures.mjs <dossier de sortie> [dossier du build] [chemins…]
//   ex. node scripts/captures.mjs ../captures-lot-1 dist / /quiz/ /explorer/

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };

export function servir(dist) {
  const serveur = createServer((req, res) => {
    let chemin = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (existsSync(chemin) && statSync(chemin).isDirectory()) chemin = join(chemin, 'index.html');
    if (!existsSync(chemin)) { res.writeHead(404); res.end(readFileSync(join(dist, '404.html'))); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' });
    res.end(readFileSync(chemin));
  });
  return new Promise((ok) => serveur.listen(0, '127.0.0.1', () => ok(serveur)));
}

/** Les pages à photographier : les pages fixes, plus un vote et un député pris dans le build. */
export function pagesParDefaut(dist) {
  const premier = (dossier, motif) => readdirSync(join(dist, dossier)).filter((n) => motif.test(n)).sort()[0];
  return ['/', '/quiz/', '/lots/', '/seance/', '/verdict/', '/hemicycle/', '/explorer/',
    `/votes/${premier('votes', /^\d+$/)}/`, '/deputes/', `/deputes/${premier('deputes', /^PA\d+$/)}/`,
    '/calcul/', '/etat/', '/confidentialite/', '/mentions-legales/', '/404.html'];
}

const nomDe = (chemin) => (chemin === '/' ? 'accueil' : chemin.replace(/^\/|\/$|\.html$/g, '').replace(/\//g, '-'));

/** Un visiteur qui a répondu « pour » aux 10 votes du quiz (illustratif). */
async function avecReponses(page, base) {
  await page.goto(`${base}/quiz/`);
  await page.evaluate(() => {
    const { questions } = JSON.parse(document.querySelector('[data-donnees-trancher]')?.textContent ?? '{"questions":[]}');
    const rep = Object.fromEntries(questions.map((q, i) =>
      [q.uid, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00.000Z' }]));
    localStorage.setItem('578e.reponses.v1', JSON.stringify(rep));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(SITE, 'scripts', 'captures.mjs')) {
  const [sortie, dossier, ...chemins] = process.argv.slice(2);
  if (!sortie) { console.error('Usage : node scripts/captures.mjs <sortie> [build] [chemins…]'); process.exit(1); }
  const dist = resolve(dossier ?? join(SITE, 'dist'));
  mkdirSync(sortie, { recursive: true });
  const serveur = await servir(dist);
  const base = `http://127.0.0.1:${serveur.address().port}`;
  const navigateur = await chromium.launch();
  const liste = chemins.length ? chemins : pagesParDefaut(dist);
  for (const [largeur, hauteur] of [[390, 844], [1440, 900]]) {
    for (const etat of ['nouveau', 'reponses']) {
      const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur },
        deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await contexte.newPage();
      if (etat === 'reponses') await avecReponses(page, base);
      for (const chemin of liste) {
        await page.goto(base + chemin, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: join(sortie, `${nomDe(chemin)}-${largeur}-${etat}.png`), fullPage: true });
      }
      await contexte.close();
    }
  }
  await navigateur.close();
  serveur.close();
  console.log(`${liste.length * 4} captures dans ${resolve(sortie)}`);
}
