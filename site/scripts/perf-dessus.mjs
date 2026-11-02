// La mesure de « Voir les députés » sur /salle/ (t92) : le palier choisi par le gouverneur, le passage
// Perspective → députés → Perspective (images par seconde, plus longue image, tâches longues : les
// ombres y sont recalculées une fois) et le déplacement au glisser. Chromium, vraie carte graphique,
// 1 440 × 900, densité 1,5. perf-navigation.mjs ne passe pas par ce bouton.
//
// Usage (depuis site/, après un build) : node scripts/perf-dessus.mjs [build] [--cpu=1] [--qualite=0]

import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const args = process.argv.slice(2);
const opt = (nom) => args.find((a) => a.startsWith(`--${nom}=`))?.split('=')[1];
const cpu = Number(opt('cpu') ?? 1);
const qualite = opt('qualite');
const serveur = await servir(resolve(args.find((a) => !a.startsWith('--')) ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: true });
const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const page = await contexte.newPage();
if (cpu > 1) await (await contexte.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: cpu });
await page.addInitScript(() => {
  window.__mesure = { longues: [], images: [], t: 0 };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__mesure.longues.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
  const boucle = (t) => { if (window.__mesure.t) window.__mesure.images.push(t - window.__mesure.t); window.__mesure.t = t; requestAnimationFrame(boucle); };
  requestAnimationFrame(boucle);
});
await page.goto(`${base}/salle/?perf=1${qualite ? `&qualite=${qualite}` : ''}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => /prete|qualite/.test(document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat ?? ''), null, { timeout: 120000 });
await page.waitForTimeout(300);
const etat = await page.evaluate(() => document.querySelector('[data-salle-vdef]').dataset.salle3dEtat);
console.log(`CPU ×${cpu}, état de la salle : ${etat}`);
await page.waitForTimeout(1000);

const fenetre = async (nom, geste, ms) => {
  await page.evaluate(() => { window.__mesure.longues.length = 0; window.__mesure.images.length = 0; window.__mesure.t = 0; performance.clearMeasures(); });
  await geste();
  await page.waitForTimeout(ms);
  const { longues, images } = await page.evaluate(() => window.__mesure);
  const rendus = await page.evaluate(() => performance.getEntriesByName('salle:rendre').map((e) => e.duration));
  const trR = [...rendus].sort((a, b) => a - b);
  const tri = [...images].sort((a, b) => a - b);
  console.log(`${nom} : ${(images.length / (ms / 1000)).toFixed(0)} images/s, médiane ${tri[tri.length >> 1]?.toFixed(0)} ms, plus longue image ${tri.at(-1)?.toFixed(0)} ms, tâches longues ${JSON.stringify(longues)} ; ${rendus.length} rendus, médiane ${trR[trR.length >> 1]?.toFixed(1)} ms, max ${trR.at(-1)?.toFixed(1)} ms`);
};
if (etat === 'prete') {
  await fenetre('Perspective → députés', () => page.click('[data-immersion]'), 2000);
  const glisser = async () => {
    await page.mouse.move(900, 450); await page.mouse.down();
    for (let k = 0; k < 40; k++) { await page.mouse.move(900 + k * 3, 450 + k * 2); await page.waitForTimeout(16); }
    await page.mouse.up();
  };
  await fenetre('Députés, glisser', glisser, 1200);
  await fenetre('Députés → Perspective', () => page.click('[data-immersion]'), 2000);
}
await navigateur.close();
serveur.close();
