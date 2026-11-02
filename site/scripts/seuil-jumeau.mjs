// Le contrôle du seuil des 10 votes dans le rendu (cadrage MVP, R9, Q4) : un visiteur inventé à 5
// votes ne voit de jumeau ni d'opposé sur aucune page, ni le nom de celui qui le serait ; à 12 votes,
// ils sont bien là. Seules la phrase du seuil et les phrases qui annoncent le palier parlent d'eux.
//
// Usage (depuis site/, après un build) : node scripts/seuil-jumeau.mjs [build]

import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const serveur = await servir(resolve(process.argv[2] ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({});
let fautes = 0;
const controle = (ok, texte) => { console.log(`${ok ? '✓' : '✗'} ${texte}`); if (!ok) fautes += 1; };

// Ce qui dit qu'un jumeau ou un opposé est montré, nommé.
const INTERDIT = /Ton jumeau,|Ton jumeau ·|Toi et ton jumeau|Ton opposé ·|Ton opposé$|fois comme ton jumeau|C.est aussi ton jumeau|Ce n.est pas ton jumeau|Ton jumeau sur/m;

const visiter = async (nb) => {
  const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  await page.goto(`${base}/404.html`);
  const { votes, numero, theme } = await page.evaluate(async () => {
    const m = await (await fetch('/donnees/matrice.json')).json();
    return { votes: m.votes.slice(0, 40), numero: null, theme: null };
  });
  const reps = Object.fromEntries(votes.slice(0, nb).map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }]));
  await page.evaluate((r) => { localStorage.clear(); localStorage.setItem('578e.reponses.v1', JSON.stringify(r)); }, reps);
  void numero; void theme;
  return { contexte, page };
};

const PAGES = ['/', '/salle/', '/ta-place/', '/verdict/', '/tes-reponses/', '/parcours/', '/quiz/', '/votes/1/'];
const texteDe = async (page, chemin) => {
  const r = await page.goto(`${base}${chemin}`, { waitUntil: 'networkidle' });
  if (!r || r.status() >= 400) return null;
  await page.waitForTimeout(600);
  return page.evaluate(() => document.body.innerText);
};

{
  const { contexte, page } = await visiter(5);
  const reps5 = await page.evaluate(() => localStorage.getItem('578e.reponses.v1'));
  const liens = await (async () => {
    await page.goto(`${base}/dossiers/`, { waitUntil: 'networkidle' }).catch(() => null);
    const d = await page.evaluate(() => [...document.querySelectorAll('a[href^="/dossiers/"]')].map((a) => a.getAttribute('href')).filter((h) => h !== '/dossiers/'));
    await page.goto(`${base}/explorer/`, { waitUntil: 'networkidle' });
    const v = await page.evaluate(() => [...document.querySelectorAll('a[href^="/votes/"]')].map((a) => a.getAttribute('href')));
    return [d[0], v[0]].filter(Boolean);
  })();
  for (const chemin of [...PAGES.filter((c) => c !== '/votes/1/'), ...liens]) {
    const t = await texteDe(page, chemin);
    if (t === null) { console.log(`· ${chemin} : absente de ce build`); continue; }
    const m = INTERDIT.exec(t);
    controle(!m, `5 votes, ${chemin} : aucun jumeau ni opposé${m ? ` (trouvé : « ${m[0]} »)` : ''}`);
  }
  // Un dossier ouvert (3 votes sur son thème), à 5 votes en tout : ni jumeau, même sur le thème.
  for (const theme of readdirSync(join(resolve(process.argv[2] ?? join(SITE, 'dist')), 'dossiers'), { withFileTypes: true }).filter((d) => d.isDirectory())) {
    await page.goto(`${base}/dossiers/${theme.name}/`, { waitUntil: 'networkidle' });
    const uids = await page.evaluate(() => JSON.parse(document.querySelector('[data-donnees-dossier]')?.textContent ?? '{"votes":[]}').votes.map((v) => v.uid));
    if (uids.length < 3) continue;
    await page.evaluate((u) => localStorage.setItem('578e.reponses.v1', JSON.stringify(Object.fromEntries(u.slice(0, 3).map((x) => [x, { v: 'pour', le: '2026-10-20T10:00:00Z' }])))), uids);
    const t = await texteDe(page, `/dossiers/${theme.name}/`);
    controle(!INTERDIT.test(t) && t.includes('3 / 10'), `3 votes, /dossiers/${theme.name}/ : la phrase du seuil, pas de jumeau`);
    break;
  }
  await page.evaluate((r) => localStorage.setItem('578e.reponses.v1', r), reps5);
  const s = await texteDe(page, '/salle/');
  controle(s.includes('À 10 votes, ton jumeau et ton opposé apparaissent · 5 / 10'), '5 votes, /salle/ : la phrase du seuil');
  const reperes = await page.evaluate(() => [...document.querySelectorAll('.repere-salle')].map((e) => e.textContent));
  controle(!reperes.some((r) => /jumeau|opposé/i.test(r)), '5 votes, /salle/ : aucun repère de jumeau ni d’opposé');
  await contexte.close();
}
{
  const { contexte, page } = await visiter(12);
  const s = await texteDe(page, '/ta-place/');
  controle(/Ton jumeau/.test(s) && /Ton opposé/.test(s), '12 votes, /ta-place/ : jumeau et opposé présents');
  await texteDe(page, '/salle/');
  const b = await page.evaluate(() => !document.querySelector('[data-bascule="jumeau"]').hidden && document.querySelector('[data-seuil-jumeau]').hidden);
  controle(b, '12 votes, /salle/ : les bascules, sans la phrase du seuil');
  await contexte.close();
}
await navigateur.close();
serveur.close();
console.log(fautes ? `\n${fautes} défaut(s).` : '\nSeuil des 10 votes : tous les contrôles passent.');
process.exit(fautes ? 1 : 0);
