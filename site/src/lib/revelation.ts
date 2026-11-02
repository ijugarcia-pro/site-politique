// Le dévoilement d'un vote (cadrage MVP, R1 ; porte G1 du 31 oct. 2026 : le prototype A), commun au
// quiz, aux lots, à la séance et au verdict : la question se pose sur l'image fixe de la tribune,
// sans 3D ni mouvement de caméra ; au dévoilement, l'image fixe du Dessus
// (public/salle3d/fond-revelation*.webp : les 577 sièges, clairs et neutres) arrive en fondu, et un
// calque 2D peint chaque siège à la couleur du vote, du rang intérieur vers l'extérieur (mélange
// « multiply » : l'ombre et le volume de l'image restent), au pixel près grâce au masque des sièges
// (fond-revelation*-masque.png ; sans lui, un disque par siège). Aucun WebGL, aucun three : la salle 3D
// reste à l'arrêt sur ces pages, sauf pour « Ta place est prête » (ouvrirSalle). Les sièges sont
// posés au build (salle3d/cadrage-haut.ts, positionsDevoilement). Chargé à la demande par
// lib/trancher.ts et pages/verdict.astro : il ne pèse rien dans le JavaScript initial. Fondu de
// 250 ms, aucun en mouvement réduit. Rien n'est gardé dans le navigateur. Les marques
// `revelation:*` servent à la mesure (scripts/perf-navigation.mjs).

import type { Pilote } from '../salle3d/pilote.ts';
import { VOYANTS } from './trancher.ts';

/** Un siège dans l'image fixe : x, y (part de l'image), rayon (part de sa largeur), délai de l'onde (ms). */
export type SiegeImage = [number, number, number, number];
/** `zone` : la part de l'image (centrée) que la salle occupe ; le reste remplit l'écran autour. */
interface Format { sieges: SiegeImage[]; fauteuil: [number, number]; zone: [number, number] }
export interface PositionsRevelation { ordinateur: Format; telephone: Format }
/** Un repère posé sur l'image (« Toi ») ; i = -1 : le 578e fauteuil, au pied de la tribune. */
export interface RepereImage { i: number; libelle: string }

const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const telephone = () => matchMedia('(max-width: 900px), (max-height: 560px)').matches;
/** L'image où la salle est couchée : un téléphone en portrait. */
const imagePortrait = () => matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
/** L'onde, comme dans la 3D : 1,1 s du premier au dernier siège. */
/** Le plafond doré au bord de l'image fixe (relevé une fois : le lire dans l'image à chaque
 *  dévoilement figeait la page), le temps que l'image se pose. */
const FOND_IMAGE = 'rgb(240, 232, 212)';
const DUREE_ONDE = 1100;

let calque: { racine: HTMLElement; img: HTMLImageElement; toile: HTMLCanvasElement; reperes: HTMLElement } | null = null;
/** Où l'image est posée, pour les repères. */
let pose: { x0: number; y0: number; w: number; h: number; format: Format } | null = null;
/** Les repères en cours, reposés à chaque dévoilement. */
let reperesCourants: RepereImage[] = [];

/** Le masque des sièges, une fois lu : pour chaque siège, ses segments de pixels [x, y, longueur]
 *  dans l'image. Lu une seule fois, avant le premier dévoilement ; null tant qu'il ne l'est pas. */
const masques = new Map<string, Promise<number[][] | null>>();
function lireMasque(portrait: boolean, zone: [number, number]): Promise<number[][] | null> {
  const src = `/salle3d/fond-revelation${portrait ? '-telephone' : ''}-masque.png`;
  let m = masques.get(src);
  if (!m) {
    m = (async () => {
      try {
        const img = new Image();
        img.src = src;
        await img.decode();
        const l = img.naturalWidth, h = img.naturalHeight;
        const c = document.createElement('canvas');
        c.width = l; c.height = h;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, l, h).data;
        // Le masque couvre la zone de la salle : ses pixels se reportent au centre de l'image.
        const dx = Math.round((l / zone[0] - l) / 2), dy = Math.round((h / zone[1] - h) / 2);
        const segments: number[][] = [];
        for (let y = 0; y < h; y++) {
          let id = 0, debut = 0;
          for (let x = 0; x < l; x++) {
            const p = (y * l + x) * 4, v = d[p] + 256 * d[p + 1];
            if (v === id) continue;
            if (id) (segments[id - 1] ??= []).push(debut + dx, y + dy, x - debut);
            id = v; debut = x;
          }
          if (id) (segments[id - 1] ??= []).push(debut + dx, y + dy, l - debut);
        }
        return segments;
      } catch { return null; }
    })();
    masques.set(src, m);
  }
  return m;
}
/** Chaque question ou dévoilement ouvre un nouveau cycle : une onde en cours s'arrête. */
let cycle = 0;

function monter() {
  if (calque?.racine.isConnected) return calque;
  const scene = document.querySelector<HTMLElement>('.scene')!;
  const racine = document.createElement('div');
  racine.className = 'revelation-calque';
  racine.setAttribute('aria-hidden', 'true');
  racine.style.cssText = 'position:absolute;inset:0;z-index:2;opacity:0;pointer-events:none;'
    + `transition:opacity ${reduit() ? 0 : 250}ms ease;background:${FOND_IMAGE}`;
  const img = new Image();
  img.alt = '';
  img.style.cssText = 'position:absolute;display:block';
  const toile = document.createElement('canvas');
  toile.style.cssText = 'position:absolute;display:block;mix-blend-mode:multiply';
  const reperes = document.createElement('div');
  reperes.style.cssText = 'position:absolute;inset:0';
  racine.append(img, toile, reperes);
  scene.append(racine);
  calque = { racine, img, toile, reperes };
  return calque;
}

/** Ce que la barre flottante (en haut) et, au téléphone, le tiroir (en bas) couvrent de la salle,
 *  en pixels. */
function couvert(scene: DOMRect): { haut: number; bas: number } {
  const barre = [...document.querySelectorAll<HTMLElement>('.barre-haut')].find((b) => !b.hidden)?.getBoundingClientRect();
  const tiroir = document.querySelector<HTMLElement>('.sur-salle')?.getBoundingClientRect();
  return {
    haut: barre ? Math.max(0, Math.min(scene.height / 3, barre.bottom - scene.top + 6)) : 0,
    bas: telephone() && tiroir?.height ? Math.max(0, scene.bottom - tiroir.top) : 0,
  };
}

// Le tiroir a changé de cran : l'image du dévoilement se repose, sans onde, dans la nouvelle zone
// (après l'animation du tiroir, 200 ms).
let dernier: { salle: Pilote | null; lettres: string; positions: PositionsRevelation } | null = null;
let attenteTiroir = 0;
document.addEventListener('vdef:tiroir', () => {
  clearTimeout(attenteTiroir);
  attenteTiroir = window.setTimeout(() => {
    if (dernier && affiche()) void reveler(dernier.salle, dernier.lettres, dernier.positions, { onde: false });
  }, 220);
});

/** Une question : l'image fixe de la tribune (le fond de la page), sans 3D. */
export function question(salle: Pilote | null): void {
  cycle += 1;
  dernier = null;
  reperesCourants = [];
  if (calque) calque.racine.style.opacity = '0';
  salle?.actif(false);
}

/** Le masque lu à l'avance, en tâche de fond : le premier dévoilement n'a plus qu'à peindre. */
export function preparer(positions: PositionsRevelation | undefined): void {
  if (!positions) return;
  const portrait = imagePortrait();
  const lire = () => void lireMasque(portrait, (portrait ? positions.telephone : positions.ordinateur).zone);
  if ('requestIdleCallback' in window) requestIdleCallback(lire, { timeout: 1500 }); else setTimeout(lire, 200);
}

/** Le dévoilement d'un vote : `lettres`, le vote de chaque siège (P, C, A, N, -, x, V) ; vide, la
 *  salle neutre (un verdict pas encore découvert). `reperes` remplace les repères en cours ; sans
 *  lui, ils restent. Faux si l'image fixe ne se charge pas : la page montre alors son hémicycle 2D. */
export async function reveler(salle: Pilote | null, lettres: string, positions: PositionsRevelation | undefined,
  { onde = true, reperes }: { onde?: boolean; reperes?: RepereImage[] } = {}): Promise<boolean> {
  const n = (cycle += 1);
  if (reperes) reperesCourants = reperes;
  salle?.actif(false);
  if (!positions) return false;
  dernier = { salle, lettres, positions };
  performance.mark('revelation:clic');
  const c = monter();
  const tel = telephone(), portrait = imagePortrait();
  const src = `/salle3d/fond-revelation${portrait ? '-telephone' : ''}.webp`;
  if (c.img.getAttribute('src') !== src) c.img.src = src;
  try { await c.img.decode(); } catch { return false; }
  if (n !== cycle) return true;
  // La zone que la feuille de droite laisse voir (ordinateur), sous la barre ; au téléphone, sous la
  // barre et au-dessus de la feuille.
  const scene = c.racine.getBoundingClientRect();
  let droite = 0;
  if (!tel) {
    for (const f of document.querySelectorAll<HTMLElement>('.sur-salle .feuille.droite')) {
      const b = f.getBoundingClientRect();
      if (b.width) droite = Math.max(droite, scene.right - b.left);
    }
  }
  const { haut, bas } = couvert(scene);
  const zl = Math.max(1, scene.width - droite), zh = Math.max(1, scene.height - haut - bas);
  // La salle tient dans la zone ; le reste de l'image déborde autour, sous la barre et les feuilles.
  const format = portrait ? positions.telephone : positions.ordinateur;
  const li = c.img.naturalWidth, hi = c.img.naturalHeight;
  const k = Math.min(zl / (li * format.zone[0]), zh / (hi * format.zone[1]));
  const w = li * k, h = hi * k, x0 = (zl - w) / 2, y0 = haut + (zh - h) / 2;
  for (const el of [c.img, c.toile]) Object.assign(el.style, { left: `${x0}px`, top: `${y0}px`, width: `${w}px`, height: `${h}px` });
  // Au-delà de l'image, le plafond continue : ses caissons (2,4 m), à la même échelle, jamais une
  // deuxième salle (un seul hémicycle par écran).
  const caisson = Math.max(16, (w * format.zone[0] * 2.4) / 44);
  Object.assign(c.racine.style, { backgroundImage: 'url(/salle3d/caisson.webp)', backgroundSize: `${caisson}px ${caisson}px`, backgroundPosition: `${x0}px ${y0}px` });
  pose = { x0, y0, w, h, format };
  poserReperes(reperesCourants);
  // La toile a la taille de l'image, posée exactement sur elle : un pixel du masque, un pixel d'image.
  c.toile.width = li;
  c.toile.height = hi;
  const g = c.toile.getContext('2d')!;
  const sieges = format.sieges;
  // Prêt ou pas : le dévoilement n'attend pas le masque.
  let segments: number[][] | null = null;
  void lireMasque(portrait, format.zone).then((m) => { segments = m; });
  await Promise.resolve();
  const peindre = (i: number) => {
    const couleur = VOYANTS[lettres[i]];
    const s = sieges[i];
    if (!couleur || !s) return;
    g.fillStyle = couleur;
    const seg = segments?.[i];
    if (seg) {
      for (let q = 0; q < seg.length; q += 3) g.fillRect(seg[q], seg[q + 1], seg[q + 2], 1);
      return;
    }
    g.beginPath();
    g.arc(s[0] * li, s[1] * hi, Math.max(1.6, s[2] * li * 1.15), 0, 2 * Math.PI);
    g.fill();
  };
  c.racine.style.opacity = '1';
  requestAnimationFrame(() => performance.mark('revelation:premier'));
  if (!onde || reduit()) {
    sieges.forEach((_, i) => peindre(i));
    performance.mark('revelation:fin');
    return true;
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
  return true;
}

/** Vrai si l'image d'un dévoilement est posée sur cette page (sinon, la page peut poser la salle
 *  neutre avant ses repères). */
export const affiche = () => !!(calque?.racine.isConnected && pose && calque.racine.style.opacity === '1');

/** Les repères posés sur l'image du dernier dévoilement (le point noir à anneau blanc de « Toi »,
 *  comme dans la salle 3D, VDEF § 7). */
export function poserReperes(liste: RepereImage[]): void {
  reperesCourants = liste;
  if (!calque || !pose) return;
  const { x0, y0, w, h, format } = pose;
  calque.reperes.replaceChildren(...liste.map(({ i, libelle }) => {
    const p = i < 0 ? format.fauteuil : format.sieges[i];
    const el = document.createElement('span');
    if (!p) return el;
    const x = x0 + p[0] * w, y = y0 + p[1] * h;
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0`;
    const point = document.createElement('span');
    point.style.cssText = 'position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:999px;'
      + 'background:var(--encre);border:3px solid var(--feuille);box-shadow:0 2px 10px rgba(0,0,0,.4)';
    const texte = document.createElement('span');
    texte.textContent = libelle;
    texte.style.cssText = 'position:absolute;bottom:16px;padding:8px 12px;border-radius:999px;white-space:nowrap;'
      + 'background:var(--encre);color:var(--feuille);font:600 13px/1 var(--police-texte);box-shadow:var(--ombre-repere);'
      + (x - x0 < 120 ? 'left:-14px' : x0 + w - x < 120 ? 'right:-14px' : 'left:0;transform:translateX(-50%)');
    el.append(point, texte);
    return el;
  }));
}

/** « Ta place est prête » : la salle 3D s'ouvre (la marche du personnage), seulement maintenant.
 *  Pendant le chargement, l'image du dernier dévoilement reste, avec « La salle s'ouvre… » ; vrai
 *  quand la 3D est là, faux si elle ne peut pas s'ouvrir (pas de WebGL, appareil trop lent) : la
 *  page garde alors l'image et son repère. */
export async function ouvrirSalle(salle: Pilote | null): Promise<boolean> {
  if (!salle) return false;
  cycle += 1;
  const attente = calque?.racine.isConnected ? document.createElement('span') : null;
  if (attente && calque) {
    attente.textContent = 'La salle s’ouvre…';
    attente.setAttribute('role', 'status');
    attente.style.cssText = 'position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);padding:10px 16px;'
      + 'border-radius:999px;background:var(--feuille);color:var(--encre);font:600 14px/1 var(--police-texte)';
    // Hors du calque (masqué aux lecteurs d'écran) : l'attente est annoncée.
    calque.racine.after(attente);
  }
  salle.actif(true);
  const s = await salle.prete;
  attente?.remove();
  if (s && calque) calque.racine.style.opacity = '0';
  return !!s;
}
