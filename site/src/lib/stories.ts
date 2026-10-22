// Les trois stories du résultat, dessinées dans le navigateur sur un canevas 1080 × 1920, sans
// aucun service extérieur : « J'ai pris le 578e siège », « Mon jumeau à l'Assemblée », « Mon vote
// le plus à contre-courant ». Seul ce que le visiteur choisit de partager quitte sa machine, sous
// forme d'image. Charte « La Séance » (docs/refonte-la-seance.md, lot 6) : fond nuit, bandeau de
// régie rouge, capitales condensées, chiffres de compteur, ta place en lumière ; les trois stories
// ont le même habillage, quelle que soit la réponse (aucune couleur de vote en fond).
import { LARGEUR, places, RAYON_SIEGE } from './hemicycle.ts';

export interface DonneesStories {
  groupe: { sigle: string; libelle: string } | null;
  /** `sur` : tes votes tranchés (N) ; `identiques` : ceux où ton jumeau a voté comme toi. */
  jumeau: { nom: string; groupe: string; initiales: string; identiques: number;
    sur: number } | null;
  contre: { question: string; reponse: string; part: number } | null;
  /** Couleur de chaque siège (577), dans l'ordre de l'hémicycle. */
  sieges: string[];
  /** Indice du siège où poser ta place (celui du jumeau), ou -1. */
  etoile: number;
  votes: number;
}

export type TypeStory = 'place' | 'jumeau' | 'contre';

const L = 1080;
const H = 1920;
const CONDENSE = '"Barlow Condensed", "Arial Narrow", sans-serif';
const TEXTE = '"Barlow", "Segoe UI", system-ui, sans-serif';
const QUESTION = '"Literata Variable", "Literata", Georgia, serif';
const SITE = 'le578esiege.pages.dev';
// Les jetons du thème « Séance ».
const NUIT = '#0C0D10', PANNEAU = '#16181D', PANNEAU_2 = '#1F2229', FILET = '#2E313A';
const IVOIRE = '#F2EEE6', IVOIRE_2 = '#ABA69C', DIRECT = '#B3132F', LUMIERE = '#F2C98A';
/** Les teintes de l'hémicycle personnel (lib/profil.ts) deviennent des intensités d'ivoire, comme
 *  sur le site (décision du 20 oct. 2026) : la lumière ne désigne que toi (l'anneau de ta place). */
const TEINTES: Record<string, string> = {
  '#DFE3EB': '#3A3D45', '#D9CCFF': '#6E6B66', '#A98BFF': '#A9A49B', '#6A3DF0': IVOIRE, '#FFFFFF': '#2A2D33',
};

function lignes(ctx: CanvasRenderingContext2D, texte: string, largeur: number): string[] {
  // Seules les espaces ordinaires coupent une ligne : l'espace fine avant « ? » reste
  // insécable.
  const mots = texte.split(/ +/);
  const sortie: string[] = [];
  let courante = '';
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (ctx.measureText(essai).width > largeur && courante) {
      sortie.push(courante);
      courante = mot;
    } else {
      courante = essai;
    }
  }
  if (courante) sortie.push(courante);
  return sortie;
}

function paragraphe(ctx: CanvasRenderingContext2D, texte: string, x: number, y: number,
  largeur: number, hauteur: number): number {
  for (const l of lignes(ctx, texte, largeur)) {
    ctx.fillText(l, x, y);
    y += hauteur;
  }
  return y;
}

/** Ta place : un anneau de lumière, jamais une couleur de vote. */
function place(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r + 10, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(242, 201, 138, 0.25)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.lineWidth = 6;
  ctx.strokeStyle = LUMIERE;
  ctx.stroke();
}

function hemicycle(ctx: CanvasRenderingContext2D, sieges: string[], y: number, largeur: number,
  indicePlace = -1) {
  const echelle = largeur / LARGEUR;
  const x0 = (L - largeur) / 2;
  const liste = places();
  liste.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(x0 + p.x * echelle, y + p.y * echelle, RAYON_SIEGE * echelle, 0, 2 * Math.PI);
    const c = (sieges[i] ?? '#DFE3EB').toUpperCase();
    ctx.fillStyle = TEINTES[c] ?? c;
    ctx.fill();
  });
  if (indicePlace >= 0) {
    const p = liste[indicePlace];
    place(ctx, x0 + p.x * echelle, y + p.y * echelle, 18);
  }
}

/** La marque en haut : le nom du site, en capitales condensées, sur un filet rouge. */
function entete(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = DIRECT;
  ctx.fillRect(96, 104, 64, 8);
  ctx.fillStyle = IVOIRE;
  ctx.font = `700 44px ${CONDENSE}`;
  ctx.fillText('LE 578e SIÈGE', 180, 124);
}

/** Un bandeau de régie : une étiquette rouge et un titre en capitales sur un panneau. */
function bandeau(ctx: CanvasRenderingContext2D, etiquette: string, titre: string, y: number): number {
  ctx.font = `600 34px ${CONDENSE}`;
  const we = ctx.measureText(etiquette.toUpperCase()).width;
  ctx.fillStyle = DIRECT;
  ctx.fillRect(96, y, we + 56, 96);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(etiquette.toUpperCase(), 124, y + 60);
  ctx.font = `600 60px ${CONDENSE}`;
  const lt = lignes(ctx, titre.toUpperCase(), L - 192 - we - 56 - 56);
  const h = Math.max(96, 28 + lt.length * 66);
  ctx.fillStyle = PANNEAU;
  ctx.fillRect(96 + we + 56, y, L - 192 - we - 56, h);
  ctx.fillStyle = IVOIRE;
  lt.forEach((l, k) => ctx.fillText(l, 96 + we + 56 + 28, y + 70 + k * 66));
  return y + h;
}

function pied(ctx: CanvasRenderingContext2D, question: string) {
  ctx.fillStyle = PANNEAU_2;
  ctx.fillRect(72, H - 230, L - 144, 150);
  ctx.font = `600 30px ${CONDENSE}`;
  const w = ctx.measureText(SITE.toUpperCase()).width;
  // La question garde sa place à gauche du badge : sa police diminue si elle est longue.
  let taille = 42;
  ctx.font = `500 ${taille}px ${QUESTION}`;
  while (taille > 28 && ctx.measureText(question).width > L - 112 - w - 40 - 112 - 24) {
    taille -= 2;
    ctx.font = `500 ${taille}px ${QUESTION}`;
  }
  ctx.fillStyle = IVOIRE;
  ctx.fillText(question, 112, H - 140);
  ctx.font = `600 30px ${CONDENSE}`;
  ctx.fillStyle = DIRECT;
  ctx.fillRect(L - 112 - w - 40, H - 204, w + 40, 96);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(SITE.toUpperCase(), L - 112 - w - 20, H - 145);
}

export async function dessiner(type: TypeStory, d: DonneesStories): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(`700 60px ${CONDENSE}`), document.fonts.load(`600 60px ${CONDENSE}`),
    document.fonts.load(`400 30px ${TEXTE}`), document.fonts.load(`500 42px ${QUESTION}`)]);
  const canevas = document.createElement('canvas');
  canevas.width = L;
  canevas.height = H;
  const ctx = canevas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = NUIT;
  ctx.fillRect(0, 0, L, H);
  entete(ctx);

  if (type === 'place') {
    ctx.fillStyle = IVOIRE;
    ctx.font = `700 120px ${CONDENSE}`;
    let y = paragraphe(ctx, "J'AI PRIS LE 578e SIÈGE DE L'ASSEMBLÉE.", 96, 330, L - 192, 112);
    ctx.font = `400 44px ${TEXTE}`;
    ctx.fillStyle = IVOIRE_2;
    if (d.groupe) {
      y = paragraphe(ctx, `Après ${d.votes} vrais votes, le groupe qui vote le plus comme moi : `
        + `${d.groupe.libelle} (${d.groupe.sigle}).`, 96, y + 40, L - 192, 60);
    }
    hemicycle(ctx, d.sieges, 1020, L - 120, d.etoile);
    ctx.fillStyle = PANNEAU;
    ctx.fillRect(72, 1560, L - 144, 110);
    ctx.fillStyle = IVOIRE_2;
    ctx.font = `600 34px ${CONDENSE}`;
    ctx.fillText('PLUS UN SIÈGE EST LUMINEUX, PLUS CE DÉPUTÉ VOTE COMME MOI.', 108, 1628);
    pied(ctx, 'Et toi, tu siègerais où ?');
  } else if (type === 'jumeau') {
    let y = bandeau(ctx, 'Mon jumeau', "à l'Assemblée", 240);
    ctx.font = `400 42px ${TEXTE}`;
    ctx.fillStyle = IVOIRE_2;
    y = paragraphe(ctx, 'Parmi les 577 députés, celui qui vote le plus souvent comme moi :', 96,
      y + 90, L - 192, 56);
    if (d.jumeau) {
      ctx.beginPath();
      ctx.arc(96 + 110, y + 150, 104, 0, 2 * Math.PI);
      ctx.lineWidth = 6;
      ctx.strokeStyle = IVOIRE;
      ctx.stroke();
      ctx.fillStyle = IVOIRE;
      ctx.font = `600 96px ${CONDENSE}`;
      const wi = ctx.measureText(d.jumeau.initiales).width;
      ctx.fillText(d.jumeau.initiales, 96 + 110 - wi / 2, y + 185);
      ctx.font = `700 70px ${CONDENSE}`;
      const yn = paragraphe(ctx, d.jumeau.nom.toUpperCase(), 360, y + 130, L - 456, 72);
      ctx.fillStyle = IVOIRE_2;
      ctx.font = `400 38px ${TEXTE}`;
      ctx.fillText(d.jumeau.groupe, 360, yn + 10);
      ctx.fillStyle = IVOIRE;
      ctx.font = `600 220px ${CONDENSE}`;
      const score = `${d.jumeau.identiques}/${d.jumeau.sur}`;
      ctx.fillText(score, 96, y + 560);
      const ws = ctx.measureText(score).width;
      ctx.fillStyle = IVOIRE_2;
      ctx.font = `600 44px ${CONDENSE}`;
      paragraphe(ctx, 'VOTES PAREILS QUE MOI', 96 + ws + 36, y + 470, L - 192 - ws - 36, 54);
    }
    hemicycle(ctx, d.sieges, 1180, L - 160, d.etoile);
    pied(ctx, "Et toi, c'est qui ton jumeau ?");
  } else {
    let y = bandeau(ctx, 'Mon vote', 'le plus à contre-courant', 240);
    if (d.contre) {
      ctx.fillStyle = IVOIRE;
      ctx.font = `500 70px ${QUESTION}`;
      y = paragraphe(ctx, d.contre.question, 96, y + 140, L - 192, 86);
      ctx.font = `600 48px ${CONDENSE}`;
      const etiquette = `J'ai voté ${d.contre.reponse}`.toUpperCase();
      const we = ctx.measureText(etiquette).width;
      ctx.fillStyle = PANNEAU_2;
      ctx.fillRect(96, y + 30, we + 80, 110);
      ctx.strokeStyle = IVOIRE;
      ctx.lineWidth = 4;
      ctx.strokeRect(96, y + 30, we + 80, 110);
      ctx.fillStyle = IVOIRE;
      ctx.fillText(etiquette, 136, y + 102);
      y += 420;
      ctx.fillStyle = IVOIRE;
      ctx.font = `600 260px ${CONDENSE}`;
      ctx.fillText(`${d.contre.part} %`, 96, y);
      ctx.font = `400 44px ${TEXTE}`;
      ctx.fillStyle = IVOIRE_2;
      paragraphe(ctx, 'des députés qui se sont exprimés ont voté comme moi.', 96, y + 90,
        L - 192, 56);
      ctx.fillStyle = FILET;
      ctx.fillRect(96, y + 200, L - 192, 2);
    }
    pied(ctx, 'Et toi, tu siègerais où ?');
  }
  return canevas;
}

export function enImage(canevas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, ko) => canevas.toBlob((b) => (b ? ok(b) : ko(new Error('image'))),
    'image/png'));
}
