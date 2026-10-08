// Les trois stories du résultat (frames V5 « Story »), dessinées dans le navigateur sur un
// canevas 1080 × 1920, sans aucun service extérieur : « J'ai pris le 578e siège », « Mon jumeau
// à l'Assemblée », « Mon vote le plus à contre-courant ». Seul ce que le visiteur choisit de
// partager quitte sa machine, sous forme d'image.
import { LARGEUR, places, RAYON_SIEGE } from './hemicycle.ts';

export interface DonneesStories {
  groupe: { sigle: string; libelle: string } | null;
  jumeau: { nom: string; groupe: string; initiales: string; identiques: number;
    communs: number } | null;
  contre: { question: string; reponse: string; part: number } | null;
  /** Couleur de chaque siège (577), dans l'ordre de l'hémicycle. */
  sieges: string[];
  /** Indice du siège près duquel poser l'étoile (celui du jumeau), ou -1. */
  etoile: number;
  votes: number;
}

export type TypeStory = 'place' | 'jumeau' | 'contre';

const L = 1080;
const H = 1920;
const TITRE = '"Fredoka Variable", "Fredoka", system-ui, sans-serif';
const TEXTE = '"Nunito Variable", "Nunito", system-ui, sans-serif';
const SITE = 'le578esiege.pages.dev';

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

function rectangleArrondi(ctx: CanvasRenderingContext2D, x: number, y: number, w: number,
  h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function etoile(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = '#FFC531';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#1F2433';
  ctx.stroke();
}

function hemicycle(ctx: CanvasRenderingContext2D, sieges: string[], y: number, largeur: number,
  indiceEtoile = -1) {
  const echelle = largeur / LARGEUR;
  const x0 = (L - largeur) / 2;
  const liste = places();
  liste.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(x0 + p.x * echelle, y + p.y * echelle, RAYON_SIEGE * echelle, 0, 2 * Math.PI);
    ctx.fillStyle = sieges[i] ?? '#DFE3EB';
    ctx.fill();
  });
  if (indiceEtoile >= 0) {
    const p = liste[indiceEtoile];
    etoile(ctx, x0 + p.x * echelle, y + p.y * echelle - 34, 34);
  }
}

function entete(ctx: CanvasRenderingContext2D, encre: string) {
  ctx.fillStyle = encre;
  ctx.font = `700 40px ${TITRE}`;
  ctx.fillText('578e siège', 96, 140);
}

function pied(ctx: CanvasRenderingContext2D, question: string, fond: string) {
  ctx.fillStyle = fond;
  rectangleArrondi(ctx, 72, H - 220, L - 144, 136, 40);
  ctx.fillStyle = '#1F2433';
  ctx.font = `700 40px ${TITRE}`;
  ctx.fillText(question, 112, H - 138);
  ctx.fillStyle = '#7C4DFF';
  ctx.font = `600 30px ${TITRE}`;
  const w = ctx.measureText(SITE).width;
  rectangleArrondi(ctx, L - 112 - w - 40, H - 196, w + 40, 88, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(SITE, L - 112 - w - 20, H - 140);
}

export async function dessiner(type: TypeStory, d: DonneesStories): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(`700 60px ${TITRE}`), document.fonts.load(`400 30px ${TEXTE}`)]);
  const canevas = document.createElement('canvas');
  canevas.width = L;
  canevas.height = H;
  const ctx = canevas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';

  if (type === 'place') {
    ctx.fillStyle = '#7C4DFF';
    ctx.fillRect(0, 0, L, H);
    entete(ctx, '#FFFFFF');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 112px ${TITRE}`;
    let y = paragraphe(ctx, "J'ai pris le 578e siège de l'Assemblée.", 96, 360, L - 192, 118);
    ctx.font = `400 44px ${TEXTE}`;
    ctx.fillStyle = '#E6DDFF';
    if (d.groupe) {
      y = paragraphe(ctx, `Après ${d.votes} vrais votes, le groupe qui vote le plus comme moi : `
        + `${d.groupe.libelle} (${d.groupe.sigle}).`, 96, y + 40, L - 192, 58);
    }
    hemicycle(ctx, d.sieges, 1020, L - 120, d.etoile);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rectangleArrondi(ctx, 72, 1560, L - 144, 110, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 36px ${TITRE}`;
    ctx.fillText('Plus un siège est foncé, plus ce député vote comme moi.', 108, 1628);
    pied(ctx, 'Et toi, tu siègerais où ?', '#FFFFFF');
  } else if (type === 'jumeau') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, L, H);
    entete(ctx, '#7C4DFF');
    ctx.fillStyle = '#1F2433';
    ctx.font = `700 100px ${TITRE}`;
    let y = paragraphe(ctx, "Mon jumeau à l'Assemblée", 96, 340, L - 192, 108);
    ctx.font = `400 42px ${TEXTE}`;
    ctx.fillStyle = '#5A6275';
    y = paragraphe(ctx, 'Parmi les 577 députés, celui qui vote le plus souvent comme moi :', 96,
      y + 20, L - 192, 56);
    if (d.jumeau) {
      ctx.fillStyle = '#7C4DFF';
      rectangleArrondi(ctx, 96, y + 40, 220, 220, 64);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 96px ${TITRE}`;
      const wi = ctx.measureText(d.jumeau.initiales).width;
      ctx.fillText(d.jumeau.initiales, 96 + 110 - wi / 2, y + 185);
      ctx.fillStyle = '#1F2433';
      ctx.font = `700 64px ${TITRE}`;
      const yn = paragraphe(ctx, d.jumeau.nom, 360, y + 120, L - 456, 70);
      ctx.fillStyle = '#5A6275';
      ctx.font = `400 38px ${TEXTE}`;
      ctx.fillText(d.jumeau.groupe, 360, yn + 10);
      ctx.fillStyle = '#7C4DFF';
      ctx.font = `700 200px ${TITRE}`;
      const score = `${d.jumeau.identiques}/${d.jumeau.communs}`;
      ctx.fillText(score, 96, y + 560);
      const ws = ctx.measureText(score).width;
      ctx.fillStyle = '#1F2433';
      ctx.font = `600 44px ${TITRE}`;
      paragraphe(ctx, 'votes pareils que moi', 96 + ws + 36, y + 470, L - 192 - ws - 36, 54);
    }
    hemicycle(ctx, d.sieges, 1180, L - 160, d.etoile);
    pied(ctx, "Et toi, c'est qui ton jumeau ?", '#F3EEFF');
  } else {
    ctx.fillStyle = '#FF6A3D';
    ctx.fillRect(0, 0, L, H);
    entete(ctx, '#FFFFFF');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 50px ${TITRE}`;
    ctx.fillText('Mon vote le plus à contre-courant', 96, 330);
    if (d.contre) {
      ctx.font = `700 76px ${TITRE}`;
      let y = paragraphe(ctx, d.contre.question, 96, 450, L - 192, 86);
      ctx.font = `700 52px ${TITRE}`;
      const etiquette = `J'ai voté ${d.contre.reponse}`.toUpperCase();
      const we = ctx.measureText(etiquette).width;
      ctx.fillStyle = '#FFFFFF';
      rectangleArrondi(ctx, 96, y + 30, we + 80, 110, 32);
      ctx.fillStyle = '#1F2433';
      ctx.fillText(etiquette, 136, y + 104);
      y += 420;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 260px ${TITRE}`;
      ctx.fillText(`${d.contre.part} %`, 96, y);
      ctx.font = `400 44px ${TEXTE}`;
      ctx.fillStyle = '#FFE3D8';
      paragraphe(ctx, 'des députés qui se sont exprimés ont voté comme moi.', 96, y + 90,
        L - 192, 56);
    }
    pied(ctx, 'Et toi, tu siègerais où ?', '#FFFFFF');
  }
  return canevas;
}

export function enImage(canevas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, ko) => canevas.toBlob((b) => (b ? ok(b) : ko(new Error('image'))),
    'image/png'));
}
