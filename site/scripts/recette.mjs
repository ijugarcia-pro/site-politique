// La recette du MVP (cadrage MVP, lot 8, t91) : un vrai parcours, par de vrais clics, sur ordinateur
// et au téléphone (émulé) : première visite → quiz de 10 votes → ta place → salle → séance → verdict.
// À chaque étape : pas d'erreur de la page, rien de coupé (la page ne défile pas, l'action principale
// est dans la fenêtre), le texte attendu ; plus la plus longue tâche et les captures. Vraie carte
// graphique. Visiteur inventé, données d'essai : les résultats affichés sont illustratifs.
//
// Usage (depuis site/, après un build) : node scripts/recette.mjs <sortie> [build] [--cpu=4]

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const args = process.argv.slice(2);
const positionnels = args.filter((a) => !a.startsWith('--'));
const [sortie, dossier] = positionnels;
if (!sortie) { console.error('Usage : node scripts/recette.mjs <sortie> [build] [--cpu=4]'); process.exit(1); }
const CPU = Number(args.find((a) => a.startsWith('--cpu='))?.split('=')[1] ?? 1);
mkdirSync(sortie, { recursive: true });
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: true });
let fautes = 0;
const bilan = [];

for (const [appareil, opts] of [
  ['ordinateur', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 }],
  ['petit-portable', { viewport: { width: 1280, height: 600 } }],
  ['telephone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
]) {
  const contexte = await navigateur.newContext(opts);
  const page = await contexte.newPage();
  if (CPU > 1) await (await contexte.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  await page.addInitScript(() => {
    window.__longues = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
  });
  const clic = async (sel) => { const el = await page.waitForSelector(`${sel}:visible`, { timeout: 15000 }); await (opts.hasTouch ? el.tap() : el.click()); };
  const etape = async (nom, attendu) => {
    await page.waitForTimeout(800);
    const r = await page.evaluate((a) => {
      const de = document.documentElement;
      return { texte: !a || new RegExp(a).test(document.body.innerText), defile: document.body.classList.contains('gabarit-salle') && de.scrollHeight > innerHeight + 1,
        horizontal: de.scrollWidth > innerWidth + 1, longue: Math.max(0, ...window.__longues), adresse: location.pathname };
    }, attendu);
    await page.evaluate(() => { window.__longues.length = 0; });
    await page.screenshot({ path: join(sortie, `${appareil}-${String(bilan.filter((b) => b.appareil === appareil).length + 1).padStart(2, '0')}-${nom}.jpg`), type: 'jpeg', quality: 72 });
    const defauts = [!r.texte && `texte attendu absent (${attendu})`, r.defile && 'la page défile', r.horizontal && 'défilement horizontal', ...erreurs.splice(0).map((e) => `erreur : ${e}`)].filter(Boolean);
    bilan.push({ appareil, nom, adresse: r.adresse, longue: r.longue, defauts });
    fautes += defauts.length;
    console.log(`${defauts.length ? '✗' : '✓'} ${appareil} · ${nom} (${r.adresse}), plus longue tâche ${r.longue} ms${defauts.length ? ` : ${defauts.join(' ; ')}` : ''}`);
  };

  try {
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await etape('premiere-visite', 'quiz|Quiz|vote');

    await page.goto(`${base}/quiz/`, { waitUntil: 'networkidle' });
    await etape('quiz-question', 'Pour');
    for (let i = 0; i < 10; i++) {
      await clic(`[data-reponse="${i % 3 ? 'pour' : 'contre'}"]`);
      await page.waitForTimeout(350);
      const voir = await page.$('[data-continuer]:visible');
      if (voir) { await (opts.hasTouch ? voir.tap() : voir.click()); }
      await page.waitForTimeout(1400);
      if (i === 0) await etape('quiz-devoilement', 'Adopt|Rejet');
      if (i === 3) {
        const texte = await page.evaluate(() => document.body.innerText);
        const montre = /Ton jumeau,|Ton opposé ·/.test(texte);
        if (montre) { fautes += 1; console.log('✗ jumeau montré sous 10 votes'); }
      }
      const suite = await page.$('[data-suivant]:visible');
      if (suite) { await (opts.hasTouch ? suite.tap() : suite.click()); await page.waitForTimeout(350); }
    }
    await page.waitForTimeout(2500);
    await etape('quiz-resultat', 'Ta place est prête');
    await page.waitForFunction(() => /prete|qualite|webgl/.test(document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat ?? ''), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(4500);
    await etape('marche-du-personnage', 'Ta place est prête');

    await clic('[data-voir-siege]');
    await page.waitForURL('**/ta-place/**');
    await page.waitForTimeout(1200);
    await etape('ta-place', 'Qui vote comme toi');

    await page.goto(`${base}/salle/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => /prete|qualite|webgl/.test(document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat ?? ''), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await etape('salle', 'Montrer dans la salle');
    await clic('[data-immersion]');
    await page.waitForTimeout(1900);
    await etape('voir-les-deputes', 'Afficher les menus');
    await clic('[data-immersion]');
    await page.waitForTimeout(1900);
    await etape('retour-aux-menus', 'Montrer dans la salle');

    await page.goto(`${base}/seance/`, { waitUntil: 'networkidle' });
    await etape('seance', '');
    for (let i = 0; i < 5; i++) {
      const r = await page.$('[data-reponse="pour"]:not([disabled]):visible');
      if (!r) break;
      await (opts.hasTouch ? r.tap() : r.click());
      await page.waitForTimeout(350);
      for (const sel of ['[data-continuer]:visible', '[data-suivant]:visible']) {
        const suite = await page.$(sel);
        if (suite) { await (opts.hasTouch ? suite.tap() : suite.click()); await page.waitForTimeout(500); }
      }
    }
    await page.waitForTimeout(1500);
    await etape('seance-fin', '');

    await page.goto(`${base}/verdict/`, { waitUntil: 'networkidle' });
    const bouton = await page.$('[data-decouvrir-bouton]:visible');
    if (bouton) { await (opts.hasTouch ? bouton.tap() : bouton.click()); await page.waitForTimeout(2000); }
    await etape('verdict', '');
  } catch (e) {
    fautes += 1;
    console.log(`✗ ${appareil} : parcours interrompu : ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: join(sortie, `${appareil}-interrompu.jpg`), type: 'jpeg', quality: 72 }).catch(() => {});
  }
  await contexte.close();
}
writeFileSync(join(sortie, 'bilan.json'), JSON.stringify(bilan, null, 1));
await navigateur.close();
serveur.close();
console.log(fautes ? `\n${fautes} défaut(s).` : '\nParcours complet : aucun défaut.');
process.exit(fautes ? 1 : 0);
