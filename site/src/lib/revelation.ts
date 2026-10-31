// Les deux prototypes du dévoilement léger (lot 2 du cadrage MVP, docs/cadrage-mvp-retours-test-578e.md,
// R1, porte G1), sur le quiz seulement, derrière `?revelation=a` ou `?revelation=b`. Chargé à la
// demande par lib/trancher.ts : il ne pèse rien dans le JavaScript initial. Dans les deux cas, la
// question se pose sur l'image fixe de la tribune, sans 3D ni mouvement de caméra.
// - A : une image fixe de la vue haute (public/salle3d/fond-revelation*.webp, sièges clairs et
//   neutres) et, par-dessus, un calque 2D qui peint les 577 sièges aux couleurs du vote, du rang
//   intérieur vers l'extérieur (mélange « multiply » : l'ombre et le volume de l'image restent).
//   Aucun WebGL. Les sièges sont posés au build (salle3d/cadrage-haut.ts, siegesHaut).
// - B : la 3D en rendu léger (palier 1), coupée net sur la vue haute, voyants en onde. La 3D ne
//   s'ouvre qu'au premier dévoilement.
// L'image et la salle arrivent en fondu (250 ms ; aucun en mouvement réduit). Rien n'est gardé
// dans le navigateur. Les marques `revelation:*` servent à la mesure (scripts/perf-revelation.mjs).

import type { Pilote } from '../salle3d/pilote.ts';
import { VOYANTS } from './trancher.ts';

export type Prototype = 'a' | 'b';
/** Un siège dans l'image fixe : x, y (part de l'image), rayon (part de sa largeur), délai de l'onde (ms). */
export type SiegeImage = [number, number, number, number];
export interface PositionsRevelation { ordinateur: SiegeImage[]; telephone: SiegeImage[] }

const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const telephone = () => matchMedia('(max-width: 720px)').matches;
/** L'onde, comme dans la 3D (scene.ts, voyantsEnOnde) : 1,1 s du premier au dernier siège. */
const DUREE_ONDE = 1100;

let calque: { racine: HTMLElement; img: HTMLImageElement; toile: HTMLCanvasElement } | null = null;
/** Chaque question ou révélation ouvre un nouveau cycle : une onde en cours s'arrête. */
let cycle = 0;

function monter() {
  if (calque?.racine.isConnected) return calque;
  const scene = document.querySelector<HTMLElement>('.scene')!;
  const racine = document.createElement('div');
  racine.className = 'revelation-calque';
  racine.setAttribute('aria-hidden', 'true');
  racine.style.cssText = 'position:absolute;inset:0;z-index:2;opacity:0;pointer-events:none;'
    + `transition:opacity ${reduit() ? 0 : 250}ms ease;background:var(--fond-salle)`;
  const img = new Image();
  img.alt = '';
  img.style.cssText = 'position:absolute;display:block';
  const toile = document.createElement('canvas');
  toile.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply';
  racine.append(img, toile);
  scene.append(racine);
  calque = { racine, img, toile };
  return calque;
}

/** La couleur d'un coin de l'image : le fond du calque se fond avec elle. */
function fondDe(img: HTMLImageElement): string | null {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const g = c.getContext('2d')!;
    g.drawImage(img, 2, 2, 1, 1, 0, 0, 1, 1);
    const [r, v, b] = g.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${v}, ${b})`;
  } catch { return null; }
}

/** Au téléphone, ce que la barre flottante (en haut) et la feuille (qui monte en bas) couvrent de
 *  la salle, en pixels. */
function couvert(scene: DOMRect): { haut: number; bas: number } {
  const barre = [...document.querySelectorAll<HTMLElement>('.barre-haut')].find((b) => !b.hidden)?.getBoundingClientRect();
  const feuille = document.querySelector<HTMLElement>('.sur-salle .feuille')?.getBoundingClientRect();
  return {
    haut: barre ? Math.max(0, Math.min(scene.height / 3, barre.bottom - scene.top + 6)) : 0,
    bas: feuille ? Math.max(0, Math.min(scene.height / 3, scene.bottom - feuille.top)) : 0,
  };
}

/** Une question : l'image fixe de la tribune, sans 3D (pages du quiz). */
export function question(salle: Pilote | null): void {
  cycle += 1;
  if (calque) calque.racine.style.opacity = '0';
  salle?.actif(false);
  // La 3D de B, si elle est ouverte, s'efface en fondu (Salle.astro, classe « arret »).
  document.querySelector('[data-salle-vdef]')?.classList.add('arret');
}

/** Le dévoilement d'un vote : `lettres`, le vote de chaque siège (P, C, A, N, -, x, V). */
export async function reveler(proto: Prototype, salle: Pilote | null, lettres: string,
  positions: PositionsRevelation | undefined): Promise<void> {
  const n = (cycle += 1);
  performance.mark('revelation:clic');
  if (proto === 'b') {
    if (!salle) return;
    // Au téléphone, la barre flottante du haut couvre la salle : la vue haute tient en dessous.
    const scene = document.querySelector<HTMLElement>('.scene')?.getBoundingClientRect();
    if (telephone() && scene) salle.cadre(couvert(scene));
    document.querySelector('[data-salle-vdef]')?.classList.remove('arret');
    salle.actif(true);
    salle.vue('haute', { instant: true });
    void salle.prete.then((s) => {
      if (!s || n !== cycle) return;
      s.qualite(1);
      requestAnimationFrame(() => performance.mark('revelation:premier'));
    });
    salle.onde([...lettres].map((l) => VOYANTS[l] ?? null), DUREE_ONDE);
    return;
  }
  if (!positions) return;
  const c = monter();
  const tel = telephone();
  const src = `/salle3d/fond-revelation${tel ? '-telephone' : ''}.webp`;
  if (c.img.getAttribute('src') !== src) c.img.src = src;
  await c.img.decode().catch(() => {});
  if (n !== cycle) return;
  const fond = fondDe(c.img);
  if (fond) c.racine.style.background = fond;
  // La zone que la feuille de droite laisse voir (ordinateur) ; au téléphone, toute la salle.
  const scene = c.racine.getBoundingClientRect();
  let droite = 0;
  if (!tel) {
    for (const f of document.querySelectorAll<HTMLElement>('.sur-salle .feuille.droite')) {
      const b = f.getBoundingClientRect();
      if (b.width) droite = Math.max(droite, scene.right - b.left);
    }
  }
  const { haut, bas } = tel ? couvert(scene) : { haut: 0, bas: 0 };
  const zl = Math.max(1, scene.width - droite), zh = Math.max(1, scene.height - haut - bas);
  const k = Math.min(zl / c.img.naturalWidth, zh / c.img.naturalHeight);
  const w = c.img.naturalWidth * k, h = c.img.naturalHeight * k, x0 = (zl - w) / 2, y0 = haut + (zh - h) / 2;
  Object.assign(c.img.style, { left: `${x0}px`, top: `${y0}px`, width: `${w}px`, height: `${h}px` });
  const dpr = devicePixelRatio || 1;
  c.toile.width = Math.round(scene.width * dpr);
  c.toile.height = Math.round(scene.height * dpr);
  const g = c.toile.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sieges = tel ? positions.telephone : positions.ordinateur;
  const peindre = (i: number) => {
    const couleur = VOYANTS[lettres[i]];
    const s = sieges[i];
    if (!couleur || !s) return;
    g.fillStyle = couleur;
    g.beginPath();
    g.arc(x0 + s[0] * w, y0 + s[1] * h, Math.max(1.6, s[2] * w * 1.15), 0, 2 * Math.PI);
    g.fill();
  };
  c.racine.style.opacity = '1';
  requestAnimationFrame(() => performance.mark('revelation:premier'));
  if (reduit()) {
    sieges.forEach((_, i) => peindre(i));
    performance.mark('revelation:fin');
    return;
  }
  const max = Math.max(...sieges.map((s) => s[3]));
  const echelle = Math.max(1, DUREE_ONDE - 200) / max;
  const ordre = sieges.map((s, i) => [s[3] * echelle, i]).sort((a, b) => a[0] - b[0]);
  let j = 0;
  const debut = performance.now();
  const image = () => {
    if (n !== cycle) return;
    const t = performance.now() - debut;
    while (j < ordre.length && ordre[j][0] <= t) peindre(ordre[j++][1]);
    if (j < ordre.length) requestAnimationFrame(image);
    else performance.mark('revelation:fin');
  };
  requestAnimationFrame(image);
}
