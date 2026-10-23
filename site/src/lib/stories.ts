// Les stories, dessinées dans le navigateur sur un canevas 1080 × 1920, sans aucun service
// extérieur ; seul ce que le visiteur choisit de partager quitte sa machine, sous forme d'image.
// Charte VDEF (capture T6, lot V9) : la salle en fond (l'image fixe, recadrée autour de ta place),
// une carte blanche, le repère « Moi », l'adresse du site en pilule. Les stories ont le même
// habillage quelle que soit la réponse : aucune couleur de vote en fond, aucune couleur de parti.
// - « Ta place », « Mon jumeau », « Mon vote le plus à contre-courant » (après le quiz) ;
// - « Ton bilan » (palier 3, 40 votes) : ton année en cinq images.

export interface DonneesStories {
  /** `sur` : tes votes tranchés (N) ; `identiques` : ceux où ton jumeau a voté comme toi. */
  jumeau: { nom: string; groupe: string; identiques: number; sur: number } | null;
  contre: { question: string; reponse: string; part: number } | null;
  /** Ta place (le siège de ton jumeau) dans l'image fixe de la salle, x et y entre 0 et 1. */
  repere: { x: number; y: number } | null;
  votes: number;
}

export type TypeStory = 'place' | 'jumeau' | 'contre';

export interface DonneesBilan {
  votes: number;
  /** Tes votes à contre-courant de l'issue, sur ceux dont le verdict est tombé. */
  contreCourant: { n: number; sur: number };
  jumeau: { nom: string; identiques: number; sur: number } | null;
  theme: { nom: string; n: number } | null;
  serie: number;
  repere: { x: number; y: number } | null;
}

const L = 1080;
const H = 1920;
const TITRE = '"Bricolage Grotesque Variable", "Bricolage Grotesque", system-ui, sans-serif';
const TEXTE = '"Figtree Variable", "Figtree", system-ui, sans-serif';
const SITE = 'le578esiege.pages.dev';
const ENCRE = '#121212', FEUILLE = '#FFFFFF', TEXTE_2 = '#5E5E5E';
const FOND = '/salle3d/fond-salle.webp';

let image: Promise<HTMLImageElement> | null = null;
const chargerFond = () => {
  image ??= new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error('image de la salle'));
    img.src = FOND;
  });
  return image;
};

function lignes(ctx: CanvasRenderingContext2D, texte: string, largeur: number): string[] {
  // Seules les espaces ordinaires coupent une ligne : l'espace fine avant « ? » reste insécable.
  const sortie: string[] = [];
  let courante = '';
  for (const mot of texte.split(/ +/)) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (ctx.measureText(essai).width > largeur && courante) {
      sortie.push(courante);
      courante = mot;
    } else courante = essai;
  }
  if (courante) sortie.push(courante);
  return sortie;
}

function paragraphe(ctx: CanvasRenderingContext2D, texte: string, x: number, y: number, largeur: number, hauteur: number): number {
  for (const l of lignes(ctx, texte, largeur)) {
    ctx.fillText(l, x, y);
    y += hauteur;
  }
  return y;
}

function pilule(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, l, h, r);
}

/** La salle en fond, recadrée (en largeur) autour de ta place ; un voile en bas pour le pied. */
function fond(ctx: CanvasRenderingContext2D, img: HTMLImageElement, repere: { x: number } | null) {
  const echelle = H / img.height;
  const largeur = img.width * echelle;
  const cx = (repere?.x ?? 0.5) * largeur;
  const x0 = Math.min(0, Math.max(L - largeur, L / 2 - cx));
  ctx.drawImage(img, x0, 0, largeur, H);
  const voile = ctx.createLinearGradient(0, H - 420, 0, H);
  voile.addColorStop(0, 'rgba(0, 0, 0, 0)');
  voile.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = voile;
  ctx.fillRect(0, H - 420, L, 420);
  return { x0, largeur };
}

/** Le repère (VDEF § 7) : un point noir à anneau blanc et son étiquette noire. */
function repere(ctx: CanvasRenderingContext2D, x: number, y: number, libelle: string) {
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, 2 * Math.PI);
  ctx.fillStyle = FEUILLE;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 19, 0, 2 * Math.PI);
  ctx.fillStyle = ENCRE;
  ctx.fill();
  ctx.font = `700 40px ${TEXTE}`;
  const l = ctx.measureText(libelle).width + 56;
  pilule(ctx, x - l / 2, y - 130, l, 76, 38);
  ctx.fillStyle = ENCRE;
  ctx.fill();
  ctx.fillStyle = FEUILLE;
  ctx.fillText(libelle, x - l / 2 + 28, y - 79);
}

/** La carte blanche du haut : la marque, un titre, un texte. Rend le bas de la carte. */
function carte(ctx: CanvasRenderingContext2D, etiquette: string, titre: string, texte: string, tailleTitre = 92): number {
  const x = 40, l = L - 80, marge = 56;
  // Mesurer d'abord, pour la hauteur.
  ctx.font = `800 ${tailleTitre}px ${TITRE}`;
  const lt = lignes(ctx, titre, l - 2 * marge);
  ctx.font = `500 44px ${TEXTE}`;
  const lx = texte ? lignes(ctx, texte, l - 2 * marge) : [];
  const h = 150 + lt.length * tailleTitre * 1.08 + (lx.length ? 24 + lx.length * 60 : 0) + 48;
  pilule(ctx, x, 110, l, h, 48);
  ctx.fillStyle = FEUILLE;
  ctx.fill();
  // La marque : l'arc de l'hémicycle, un point, le nom ; puis l'étiquette.
  ctx.strokeStyle = ENCRE;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x + marge + 30, 110 + 96, 26, Math.PI, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + marge + 22, 110 + 84, 7, 0, 2 * Math.PI);
  ctx.fillStyle = ENCRE;
  ctx.fill();
  ctx.font = `800 40px ${TITRE}`;
  ctx.fillText('Le 578e siège', x + marge + 76, 110 + 96);
  ctx.font = `600 34px ${TEXTE}`;
  ctx.fillStyle = TEXTE_2;
  const we = ctx.measureText(etiquette).width;
  ctx.fillText(etiquette, x + l - marge - we, 110 + 96);
  let y = 110 + 150 + tailleTitre * 0.85;
  ctx.fillStyle = ENCRE;
  ctx.font = `800 ${tailleTitre}px ${TITRE}`;
  for (const t of lt) { ctx.fillText(t, x + marge, y); y += tailleTitre * 1.08; }
  if (lx.length) {
    y += 24 - tailleTitre * 0.08;
    ctx.font = `500 44px ${TEXTE}`;
    ctx.fillStyle = '#3A3A3A';
    for (const t of lx) { ctx.fillText(t, x + marge, y); y += 60; }
  }
  return 110 + h;
}

/** Le pied : l'adresse du site en pilule blanche, et la promesse du site. */
function pied(ctx: CanvasRenderingContext2D) {
  ctx.font = `700 40px ${TEXTE}`;
  const l = ctx.measureText(SITE).width + 72;
  pilule(ctx, (L - l) / 2, H - 230, l, 88, 44);
  ctx.fillStyle = FEUILLE;
  ctx.fill();
  ctx.fillStyle = ENCRE;
  ctx.fillText(SITE, (L - l) / 2 + 36, H - 172);
  ctx.font = `500 30px ${TEXTE}`;
  ctx.fillStyle = FEUILLE;
  const t = 'Vrais votes de l’Assemblée nationale · sans commentaire politique';
  ctx.fillText(t, (L - ctx.measureText(t).width) / 2, H - 92);
}

async function nouveau(): Promise<{ canevas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: HTMLImageElement }> {
  await Promise.all([document.fonts.load(`800 92px ${TITRE}`), document.fonts.load(`500 44px ${TEXTE}`),
    document.fonts.load(`700 40px ${TEXTE}`)]);
  const canevas = document.createElement('canvas');
  canevas.width = L;
  canevas.height = H;
  const ctx = canevas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#2A211B';
  ctx.fillRect(0, 0, L, H);
  return { canevas, ctx, img: await chargerFond() };
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export async function dessiner(type: TypeStory, d: DonneesStories): Promise<HTMLCanvasElement> {
  const { canevas, ctx, img } = await nouveau();
  const cadre = fond(ctx, img, type === 'contre' ? null : d.repere);
  const poser = (libelle: string) => {
    if (d.repere) repere(ctx, cadre.x0 + d.repere.x * cadre.largeur, d.repere.y * H, libelle);
  };
  if (type === 'place') {
    const j = d.jumeau;
    carte(ctx, 'Ma place', j ? `Je siège à la place de ${j.nom}.` : 'J’ai pris le 578e siège.',
      j ? `${j.nom} a voté comme moi sur ${j.identiques} de mes ${pluriel(j.sur, 'vote')}. Et toi, tu siégerais où ?`
        : `Après ${pluriel(d.votes, 'vrai vote')} de l’Assemblée. Et toi, tu siégerais où ?`);
    poser('Moi');
  } else if (type === 'jumeau') {
    const j = d.jumeau;
    carte(ctx, 'Mon jumeau', j ? j.nom : 'Pas encore de jumeau',
      j ? `${j.groupe}. Parmi les 577 députés, celui qui a voté comme moi sur le plus de mes votes : ${j.identiques} sur ${j.sur}. Et toi, c’est qui ton jumeau ?`
        : 'Et toi, c’est qui ton jumeau ?', 84);
    poser('Son siège');
  } else {
    const c = d.contre;
    const bas = carte(ctx, 'À contre-courant', c ? c.question : 'Mon vote le plus à contre-courant',
      c ? `J’ai voté ${c.reponse}.` : '', 64);
    if (c) {
      pilule(ctx, 40, bas + 40, L - 80, 380, 48);
      ctx.fillStyle = FEUILLE;
      ctx.fill();
      ctx.fillStyle = ENCRE;
      ctx.font = `800 170px ${TITRE}`;
      ctx.fillText(`${c.part} %`, 96, bas + 230);
      ctx.font = `500 42px ${TEXTE}`;
      ctx.fillStyle = '#3A3A3A';
      paragraphe(ctx, 'des députés qui se sont exprimés ont voté comme moi.', 96, bas + 310, L - 192, 56);
    }
  }
  pied(ctx);
  return canevas;
}

/** « Ton bilan » (palier 3) : cinq images, une idée chacune. */
export async function dessinerBilan(d: DonneesBilan): Promise<HTMLCanvasElement[]> {
  const pages: [string, string, string][] = [
    [`${pluriel(d.votes, 'vote')} tranché${d.votes > 1 ? 's' : ''}`,
      'De vrais votes de l’Assemblée nationale, tranchés avant ou après les députés.', 'Moi'],
    [d.contreCourant.sur ? `${d.contreCourant.n} sur ${d.contreCourant.sur}` : 'Aucun verdict',
      d.contreCourant.sur ? 'fois à contre-courant : j’ai voté l’inverse de ce que l’Assemblée a décidé.' : 'Pas encore de vote dont le verdict est tombé.', 'Moi'],
    [d.jumeau ? d.jumeau.nom : 'Pas encore de jumeau',
      d.jumeau ? `Mon jumeau à l’Assemblée : ${d.jumeau.identiques} votes comme moi sur mes ${d.jumeau.sur}.` : 'Le député qui vote le plus comme moi.', 'Moi'],
    [d.theme ? d.theme.nom : 'Tous les thèmes',
      d.theme ? `Mon thème le plus tranché : ${pluriel(d.theme.n, 'vote')}.` : 'Pas encore de thème plus tranché que les autres.', 'Moi'],
    [d.serie ? `${pluriel(d.serie, 'semaine')} d’affilée` : 'Pas encore de série',
      'À trancher la séance de la semaine avant les députés. Et toi, tu siégerais où ?', 'Moi'],
  ];
  const sortie: HTMLCanvasElement[] = [];
  for (const [k, [titre, texte, libelle]] of pages.entries()) {
    const { canevas, ctx, img } = await nouveau();
    const cadre = fond(ctx, img, d.repere);
    carte(ctx, `Mon bilan · ${k + 1} / ${pages.length}`, titre, texte, 104);
    if (d.repere) repere(ctx, cadre.x0 + d.repere.x * cadre.largeur, d.repere.y * H, libelle);
    pied(ctx);
    sortie.push(canevas);
  }
  return sortie;
}

export function enImage(canevas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, ko) => canevas.toBlob((b) => (b ? ok(b) : ko(new Error('image'))), 'image/png'));
}
