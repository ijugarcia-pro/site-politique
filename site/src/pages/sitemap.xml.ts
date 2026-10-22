// Le plan du site pour les moteurs de recherche (t36), produit au build, sans dépendance : les
// pages fixes, chaque vote et chaque député. Les pages où l'on tranche des votes (quiz, lots,
// séance, verdict) y figurent aussi : elles se lisent sans compte.
import type { APIRoute } from 'astro';
import { deputes, scrutins } from '../lib/donnees.ts';

const FIXES = ['/', '/quiz/', '/lots/', '/seance/', '/verdict/', '/salle/', '/ta-place/', '/tes-reponses/', '/parcours/', '/explorer/',
  '/deputes/', '/calcul/', '/etat/', '/mentions-legales/', '/confidentialite/'];

export const GET: APIRoute = ({ site }) => {
  const url = (chemin: string) => new URL(chemin, site).href;
  const entrees = [
    ...FIXES.map((c) => ({ loc: url(c), lastmod: null as string | null })),
    ...scrutins().map((s) => ({ loc: url(`/votes/${s.numero}/`), lastmod: s.date })),
    ...deputes().map((d) => ({ loc: url(`/deputes/${d.uid}/`), lastmod: null })),
  ];
  const corps = entrees.map((e) => `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corps}\n</urlset>\n`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
