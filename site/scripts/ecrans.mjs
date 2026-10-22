// Les 31 écrans du site (VDEF, docs/design-vdef/VDEF.md, § 4) : chaque page et chaque état qui
// demande un geste (révélation, fin de lot, verdict découvert, onglets d'un vote…). Les états
// sont préparés dans le stockage local (réponses illustratives, jamais envoyées) ; les animations
// sont coupées (mouvement réduit) pour voir les états finaux. Partagé par frames.mjs (captures)
// et typo.mjs (contrôle de la typographie), pour qu'ils parcourent exactement les mêmes états.

import { chromium } from 'playwright';

/** Les écrans, dans l'ordre, regroupés par parcours (un parcours prépare ses états une fois). */
export const PARCOURS = [
  ['accueil', ['01-tribune-premiere-visite', '02-tribune-tableau-de-bord', '03-la-salle-d-un-vote', '04-dossier-theme']],
  ['quiz', ['05-quiz-question', '06-quiz-revelation', '07-quiz-resultat', '08-quiz-partage-stories']],
  ['lots', ['09-lots-question', '10-lots-revelation', '11-lots-fin-de-lot']],
  ['seance', ['12-seance-question', '13-seance-apres-vote', '14-seance-terminee']],
  ['verdict', ['15-verdict-avant-le-toucher', '16-verdict-decouvert', '17-tes-reponses']],
  ['place', ['18-ta-place-fermee', '19-ta-place', '20-la-salle', '21-ton-parcours']],
  ['lecture', ['22-la-galerie', '23-page-d-un-vote', '24-deputes-qui-te-represente', '25-deputes-recherche-code-postal',
    '26-fiche-depute', '27-comment-c-est-calcule', '28-etat-des-donnees', '29-confidentialite', '30-mentions-legales',
    '31-page-introuvable']],
];

export const APPAREILS = [['ordinateur', 1440, 900], ['telephone', 390, 844]];

/**
 * Chromium, avec la salle 3D rendue par la vraie carte graphique (`gpu`, Direct3D 11 sous
 * Windows : c'est ce qu'il faut pour juger les couleurs) ou en WebGL logiciel (lent, couleurs
 * approximatives, mais partout disponible).
 */
export function lancer({ gpu = false, sansWebgl = false } = {}) {
  // Sans WebGL : la salle 3D ne s'ouvre pas, le repli (image fixe ou hémicycle SVG) reste affiché.
  if (sansWebgl) return chromium.launch({ args: ['--disable-3d-apis'] });
  return chromium.launch({ args: gpu
    ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']
    : ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
}

/**
 * Lit les options communes de la ligne de commande : `--gpu`, `--sans-webgl`, `--ecrans=01,16,19` (préfixes des
 * noms d'écran) et `--appareils=ordinateur` ; le reste est rendu tel quel, dans l'ordre.
 */
export function options(argv) {
  const opts = { gpu: false, sansWebgl: false, ecrans: null, appareils: APPAREILS.map(([a]) => a), reste: [] };
  for (const a of argv) {
    if (a === '--gpu') opts.gpu = true;
    else if (a === '--sans-webgl') opts.sansWebgl = true;
    else if (a.startsWith('--ecrans=')) opts.ecrans = a.slice(9).split(',').filter(Boolean);
    else if (a.startsWith('--appareils=')) opts.appareils = a.slice(12).split(',').filter(Boolean);
    else opts.reste.push(a);
  }
  return opts;
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Parcourt les écrans retenus (`ecrans` : préfixes, tous si null) dans `page` et appelle
 * `surEcran(nom)` une fois chaque état prêt, page en haut ou là où le geste l'a laissée.
 */
export async function parcourir({ page, base, ecrans = null, surEcran }) {
  const garde = (nom) => !ecrans || ecrans.some((p) => nom.startsWith(p));
  const ecran = async (nom) => { if (garde(nom)) { await attendre(800); await surEcran(nom); } };

  // Les 10 votes du quiz, pour fabriquer un visiteur qui a répondu (une réponse sur trois « contre »).
  await page.goto(`${base}/quiz/`);
  const uids = await page.evaluate(() => JSON.parse(document.querySelector('[data-donnees-trancher]').textContent).questions.map((q) => q.uid));
  const reponses = Object.fromEntries(uids.map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }]));
  const avecReponses = { '578e.reponses.v1': reponses };

  /** Repartir d'un navigateur vierge, avec ce qu'il faut dans le stockage local. */
  const etat = async (stockage = {}) => {
    await page.goto(`${base}/404.html`);
    await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, stockage);
  };
  const salle = () => page.waitForFunction(() => {
    const e = document.querySelector('[data-salle3d]')?.dataset.salle3dEtat;
    return !e || ['prete', 'erreur', 'webgl', 'memoire', 'economie'].includes(e);
  }, null, { timeout: 240000 });
  const aller = async (chemin) => { await page.goto(base + chemin, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready); };
  const trancher = async (max) => {
    for (let i = 0; i < max; i++) {
      const r = await page.$('[data-reponse="pour"]:not([disabled]):visible');
      if (!r) break;
      await r.click(); await attendre(400);
      // VDEF : « Voir la salle » (ou « Vote suivant » avant le vote des députés), puis, après la
      // révélation, « Question suivante ».
      for (const sel of ['[data-continuer]:visible', '[data-suivant]:visible']) {
        const suite = await page.$(sel);
        if (suite) { await suite.click(); await attendre(500); }
      }
    }
    await attendre(1500);
  };

  const ETAPES = {
    accueil: async () => {
      await etat(); await aller('/'); await salle(); await ecran('01-tribune-premiere-visite');
      await etat(avecReponses); await aller('/'); await salle(); await ecran('02-tribune-tableau-de-bord');
      if (garde('03')) { await aller(`/salle/#vote=${uids[0]}`); await salle(); await attendre(1500); await ecran('03-la-salle-d-un-vote'); }
      if (garde('04')) {
        const dossier = await page.evaluate(() => document.querySelector('a[href^="/dossiers/"]')?.getAttribute('href') ?? '/dossiers/sante/');
        await aller('/explorer/');
        const lien = await page.evaluate(() => [...document.querySelectorAll('a[href^="/dossiers/"]')].map((a) => a.getAttribute('href'))[0]);
        await aller(lien ?? dossier); await ecran('04-dossier-theme');
      }
    },
    quiz: async () => {
      await etat(); await aller('/quiz/'); await ecran('05-quiz-question');
      await page.click('[data-reponse="contre"]'); await page.click('[data-continuer]'); await attendre(2500); await ecran('06-quiz-revelation');
      await etat({ ...avecReponses, '578e.quiz.v1': { i: 10, fini: true } }); await aller('/quiz/'); await attendre(2500);
      await ecran('07-quiz-resultat');
      if (garde('08')) {
        await page.click('[data-ouvrir-partage]');
        await page.waitForFunction(() => [...document.querySelectorAll('[data-story]')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60000 });
        await ecran('08-quiz-partage-stories');
      }
    },
    lots: async () => {
      await etat(avecReponses); await aller('/lots/'); await ecran('09-lots-question');
      await page.click('[data-reponse="pour"]'); await page.click('[data-continuer]'); await attendre(2500); await ecran('10-lots-revelation');
      if (garde('11')) { await etat(avecReponses); await aller('/lots/'); await trancher(3); await ecran('11-lots-fin-de-lot'); }
    },
    seance: async () => {
      await etat(avecReponses); await aller('/seance/'); await ecran('12-seance-question');
      await page.click('[data-reponse="pour"]'); await attendre(2500); await ecran('13-seance-apres-vote');
      if (garde('14')) { await etat(avecReponses); await aller('/seance/'); await trancher(5); await ecran('14-seance-terminee'); }
    },
    verdict: async () => {
      await etat(avecReponses); await aller('/verdict/'); await salle(); await ecran('15-verdict-avant-le-toucher');
      const decouvrir = await page.$('[data-decouvrir-bouton]:visible');
      if (decouvrir) { await decouvrir.click(); await attendre(3000); }
      await page.evaluate(() => scrollTo(0, 0)); await ecran('16-verdict-decouvert');
      if (garde('17')) { await aller('/tes-reponses/'); await attendre(1000); await ecran('17-tes-reponses'); }
    },
    place: async () => {
      if (garde('18')) { await etat(); await aller('/ta-place/'); await salle(); await attendre(1500); await ecran('18-ta-place-fermee'); }
      await etat({ ...avecReponses, '578e.personnage.v1': { peau: 'p3', coiffure: 'courte', tenue: 'ardoise' } });
      await aller('/ta-place/'); await salle(); await attendre(1500); await ecran('19-ta-place');
      await aller('/salle/'); await salle(); await attendre(1500); await ecran('20-la-salle');
      await aller('/parcours/'); await ecran('21-ton-parcours');
    },
    lecture: async () => {
      await etat(avecReponses);
      const premier = async (motif, prefixe) => page.evaluate(([m, p]) =>
        [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')).find((h) => h && new RegExp(m).test(h)) ?? p, [motif, prefixe]);
      await aller('/explorer/');
      const vote = await premier('^/votes/\\d+/$', '/votes/8434/');
      await ecran('22-la-galerie');
      if (garde('23')) { await aller(vote); await ecran('23-page-d-un-vote'); }
      if (garde('24')) { await aller('/deputes/'); await ecran('24-deputes-qui-te-represente'); }
      if (garde('25') || garde('26')) {
        await aller('/deputes/#cp=75011'); await attendre(2500); await ecran('25-deputes-recherche-code-postal');
        const depute = await premier('^/deputes/PA\\d+/$', '/deputes/PA1008/');
        if (garde('26')) { await aller(depute); await ecran('26-fiche-depute'); }
      }
      for (const [chemin, nom] of [['/calcul/', '27-comment-c-est-calcule'], ['/etat/', '28-etat-des-donnees'],
        ['/confidentialite/', '29-confidentialite'], ['/mentions-legales/', '30-mentions-legales'],
        ['/page-qui-n-existe-pas/', '31-page-introuvable']]) {
        if (garde(nom)) { await aller(chemin); await ecran(nom); }
      }
    },
  };

  for (const [cle, noms] of PARCOURS) {
    if (noms.some(garde)) await ETAPES[cle]();
  }
}
