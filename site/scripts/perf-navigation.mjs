// La mesure du gel au changement de page (lot 0 du cadrage MVP, docs/cadrage-mvp-retours-test-578e.md,
// § 6 ; rapport : docs/rapport-perf-30-oct.md). Chromium, processeur ralenti ×4 (CDP), rejoue le
// parcours principal par de vrais clics sur des liens (le ClientRouter d'Astro garde la page et la
// salle 3D d'une navigation à l'autre) et journalise, par navigation : les tâches longues, la durée
// des gestionnaires astro:page-load, les chargements de /donnees/, les appels à redimensionner(),
// les glisses de caméra et la plus longue image. Puis, sur le quiz, le coût d'un vote (révélation :
// glisse vers la salle et onde de voyants ; question suivante : glisse vers la tribune) et, sur
// /salle/, le coût du survol d'un siège (lancer de rayon).
// Les marques de la salle viennent de `?perf=…` (salle3d/scene.ts, modePerf) ; le reste est
// observé depuis la page (script d'initialisation), sans toucher au site. Le visiteur est inventé
// (réponses illustratives, jamais envoyées).
//
// Usage (depuis site/, après un build) :
//   node scripts/perf-navigation.mjs [build] [--variantes=normal,instant,leger,sans-webgl]
//     [--logiciel] [--cpu=4] [--dpr=1.5] [--json=<fichier>]
// --logiciel : WebGL logiciel (SwiftShader) au lieu de la vraie carte graphique.

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';

const args = process.argv.slice(2);
const opt = (nom, defaut) => args.find((a) => a.startsWith(`--${nom}=`))?.split('=')[1] ?? defaut;
const dossier = args.find((a) => !a.startsWith('--'));
const VARIANTES = opt('variantes', 'normal,instant,leger,sans-webgl').split(',');
const CPU = Number(opt('cpu', '4'));
const DPR = Number(opt('dpr', '1.5'));
const LOGICIEL = args.includes('--logiciel');
// Le parcours principal du cadrage (§ R2), plus un retour vers /salle/ : /tes-reponses/ est en
// gabarit « lecture », où la salle est cachée (display: none), ce qui teste H3.
const PARCOURS = ['/', '/quiz/', '/salle/', '/ta-place/', '/verdict/', '/tes-reponses/', '/salle/'];
/** Ce qu'une variante met dans l'adresse de la première page (salle3d/scene.ts, modePerf). */
const PERF = { normal: 'perf=1', instant: 'perf=instant', leger: 'perf=leger', 'instant-leger': 'perf=instant&perf=leger', 'sans-webgl': 'perf=1' };

const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;

/** Observé dans la page dès son ouverture : tâches longues, images, gestionnaires, données. */
function observer() {
  const P = (window.__perf = { longues: [], images: [], gestionnaires: [], donnees: [], evenements: [] });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) P.longues.push([e.startTime, e.duration]); })
      .observe({ type: 'longtask', buffered: true });
  } catch { /* pas de longtask */ }
  const image = (t) => { P.images.push(t); requestAnimationFrame(image); };
  requestAnimationFrame(image);
  for (const type of ['astro:before-preparation', 'astro:after-swap', 'astro:page-load']) {
    document.addEventListener(type, () => P.evenements.push([type, performance.now(), location.pathname]));
  }
  // La durée (partie synchrone) de chaque gestionnaire des événements d'Astro.
  const ajouter = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, f, o) {
    if (typeof f === 'function' && typeof type === 'string' && type.startsWith('astro:')) {
      const g = function (...a) {
        const t0 = performance.now();
        try { return f.apply(this, a); } finally { P.gestionnaires.push([type, t0, performance.now() - t0]); }
      };
      return ajouter.call(this, type, g, o);
    }
    return ajouter.call(this, type, f, o);
  };
  // Les chargements de /donnees/ : réseau (fetch) et lecture du JSON.
  const fetch0 = window.fetch;
  window.fetch = async function (u, ...r) {
    const url = String(u instanceof Request ? u.url : u);
    const t0 = performance.now();
    const rep = await fetch0.call(this, u, ...r);
    if (url.includes('/donnees/')) {
      const json0 = rep.json.bind(rep);
      const t1 = performance.now();
      rep.json = async () => {
        const t2 = performance.now();
        const v = await json0();
        P.donnees.push({ url: url.replace(/^.*\/donnees\//, ''), debut: t0, reseau: t1 - t0, json: performance.now() - t2 });
        return v;
      };
    }
    return rep;
  };
}

/** Ce qui s'est passé dans la page entre t0 et t1 (en ms, horloge de la page). */
async function tranche(page, t0, t1) {
  return page.evaluate(([a, b]) => {
    const P = window.__perf;
    const dans = (t) => t >= a && t <= b;
    const longues = P.longues.filter(([t]) => dans(t)).map(([, d]) => d);
    const images = P.images.filter(dans);
    const ecarts = images.slice(1).map((t, k) => t - images[k]);
    const m = (nom) => performance.getEntriesByName(nom).filter((e) => dans(e.startTime));
    const rendus = m('salle:rendre').map((e) => e.duration).sort((x, y) => x - y);
    const vues = m('salle:vue');
    const glisses = vues.filter((e) => e.duration > 0);
    const imagesGlisse = glisses.map((g) => {
      const n = images.filter((t) => t >= g.startTime && t <= g.startTime + g.duration).length;
      return Math.round((1000 * n) / g.duration);
    });
    const ev = (type) => P.evenements.find(([t, tt]) => t === type && dans(tt))?.[1];
    return {
      apresEchange: ev('astro:after-swap') ? Math.round(ev('astro:after-swap') - a) : null,
      chargee: ev('astro:page-load') ? Math.round(ev('astro:page-load') - a) : null,
      longues: { n: longues.length, max: Math.round(Math.max(0, ...longues)), total: Math.round(longues.reduce((s, d) => s + d, 0)) },
      imageMax: Math.round(Math.max(0, ...ecarts)),
      images50: ecarts.filter((e) => e > 50).length,
      gestionnaires: Math.round(P.gestionnaires.filter(([t, t0]) => t === 'astro:page-load' && dans(t0)).reduce((s, [, , d]) => s + d, 0)),
      donnees: P.donnees.filter((d) => dans(d.debut)).map((d) => `${d.url} ${Math.round(d.reseau)}+${Math.round(d.json)}`),
      redimensionner: m('salle:redimensionner').map((e) => `${e.detail.w}×${e.detail.h}`),
      glisses: glisses.map((g) => Math.round(g.duration)),
      imagesParSeconde: imagesGlisse,
      rendu: rendus.length ? { n: rendus.length, median: +rendus[rendus.length >> 1].toFixed(1), max: +rendus[rendus.length - 1].toFixed(1) } : null,
      ondes: m('salle:onde').map((e) => Math.round(e.duration)),
    };
  }, [t0, t1]);
}

const maintenant = (page) => page.evaluate(() => performance.now());
/** Un vrai clic sur un lien : le ClientRouter intercepte la navigation. */
async function cliquerVers(page, chemin) {
  return page.evaluate((c) => {
    const a = document.createElement('a');
    a.href = c; a.textContent = 'perf'; a.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
    document.body.append(a);
    const t = performance.now();
    a.click();
    return t;
  }, chemin);
}
const etatSalle = (page) => page.evaluate(() => document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat ?? null);
async function attendreSalle(page, ms = 60000) {
  await page.waitForFunction(() => {
    const e = document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat;
    return e && !['attente', 'chargement'].includes(e);
  }, null, { timeout: ms }).catch(() => {});
  return etatSalle(page);
}

async function variante(nom) {
  const navigateur = await chromium.launch({ args: nom === 'sans-webgl' ? ['--disable-3d-apis']
    : LOGICIEL ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
      : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR });
  await contexte.addInitScript(observer);
  const page = await contexte.newPage();
  const cdp = await contexte.newCDPSession(page);
  const sortie = { variante: nom, navigations: [], quiz: [], survol: null };

  // Le visiteur : 12 votes de la matrice, une réponse sur trois « contre » (« Ta place » ouverte).
  await page.goto(`${base}/404.html`);
  const votes = await page.evaluate(async () => (await (await fetch('/donnees/matrice.json')).json()).votes.slice(0, 12));
  const preparer = (v) => {
    localStorage.clear();
    if (v) localStorage.setItem('578e.reponses.v1', JSON.stringify(Object.fromEntries(v.map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }]))));
    localStorage.setItem('578e.verdicts-vus.v1', JSON.stringify([]));
  };
  await page.evaluate(preparer, votes);

  // 1. Le parcours principal, navigation par navigation.
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const t00 = Date.now();
  await page.goto(`${base}/?${PERF[nom]}`, { waitUntil: 'load' });
  sortie.salle = await attendreSalle(page);
  sortie.premiereOuverture = Date.now() - t00;
  await page.waitForTimeout(2500);
  for (const chemin of PARCOURS.slice(1)) {
    const t0 = await cliquerVers(page, chemin);
    await page.waitForFunction(([c, debut]) => window.__perf.evenements.some(([t, tt, p]) => t === 'astro:page-load' && p === c && tt > debut),
      [chemin, t0], { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3500);
    sortie.navigations.push({ vers: chemin, ...(await tranche(page, t0, await maintenant(page))) });
  }

  // 2. Le quiz : trois votes de suite, sur un visiteur neuf.
  if (nom !== 'sans-webgl') {
    await page.evaluate(preparer, null);
    await page.goto(`${base}/quiz/?${PERF[nom]}`, { waitUntil: 'load' });
    await attendreSalle(page);
    await page.waitForTimeout(3000);
    for (let k = 0; k < 3; k++) {
      const r = await page.$('[data-reponse="pour"]:not([disabled])');
      if (!r) break;
      await r.click();
      await page.waitForTimeout(300);
      let t0 = await maintenant(page);
      await page.click('[data-continuer]');
      await page.waitForTimeout(3500);
      sortie.quiz.push({ geste: `révélation ${k + 1}`, ...(await tranche(page, t0, await maintenant(page))) });
      const suite = await page.$('[data-suivant]:visible');
      if (!suite) break;
      t0 = await maintenant(page);
      await suite.click();
      await page.waitForTimeout(2500);
      sortie.quiz.push({ geste: `question suivante ${k + 1}`, ...(await tranche(page, t0, await maintenant(page))) });
    }

    // 3. Le survol sur /salle/ : 60 positions de souris sur la salle.
    await page.evaluate(preparer, votes);
    await page.goto(`${base}/salle/?${PERF[nom]}`, { waitUntil: 'load' });
    await attendreSalle(page);
    await page.waitForTimeout(3000);
    await page.evaluate(() => performance.clearMeasures('salle:siegeSous'));
    for (let k = 0; k < 60; k++) {
      await page.mouse.move(560 + (k % 20) * 20, 330 + Math.floor(k / 20) * 60);
      await page.waitForTimeout(40);
    }
    sortie.survol = await page.evaluate(() => {
      const d = performance.getEntriesByName('salle:siegeSous').map((e) => e.duration).sort((a, b) => a - b);
      return d.length ? { n: d.length, median: +d[d.length >> 1].toFixed(2), max: +d[d.length - 1].toFixed(2) } : null;
    });
  }
  sortie.info = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return { carte: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl ? 'inconnue' : 'aucune', dpr: devicePixelRatio };
  });
  await navigateur.close();
  return sortie;
}

const resultats = [];
for (const v of VARIANTES) {
  const r = await variante(v);
  resultats.push(r);
  console.log(`\n=== ${v} · salle ${r.salle} · ${r.info.carte} · dpr ${r.info.dpr} · CPU ×${CPU} · première ouverture ${r.premiereOuverture} ms`);
  console.table(r.navigations.map((n) => ({ vers: n.vers, echange: n.apresEchange, chargee: n.chargee, 'longues n': n.longues.n,
    'longue max': n.longues.max, 'longues tot': n.longues.total, 'image max': n.imageMax, 'images>50': n.images50,
    'page-load ms': n.gestionnaires, redim: n.redimensionner.join(' '), glisse: n.glisses.join(' '), 'img/s': n.imagesParSeconde.join(' '),
    'rendu med': n.rendu?.median ?? '', donnees: n.donnees.join(' · ') })));
  if (r.quiz.length) {
    console.table(r.quiz.map((q) => ({ geste: q.geste, 'longues n': q.longues.n, 'longue max': q.longues.max, 'image max': q.imageMax,
      'images>50': q.images50, glisse: q.glisses.join(' '), 'img/s': q.imagesParSeconde.join(' '), onde: q.ondes.join(' '),
      'rendu med': q.rendu?.median ?? '', 'rendu n': q.rendu?.n ?? '' })));
  }
  if (r.survol) console.log('survol (siegeSous, ms) :', r.survol);
}
const fichier = opt('json', null);
if (fichier) writeFileSync(fichier, JSON.stringify({ date: new Date().toISOString(), cpu: CPU, dpr: DPR, logiciel: LOGICIEL, resultats }, null, 1));
serveur.close();
