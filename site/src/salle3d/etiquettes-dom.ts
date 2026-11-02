// Les étiquettes posées à l'écran : ce que placerEtiquettes (etiquettes.ts) décide, appliqué aux
// repères du calque, avec un fil si l'étiquette s'éloigne de son point. Vit avec la scène, chargée à
// la demande : rien dans le JavaScript initial (pilote.ts ne porte qu'un appel).
import { placerEtiquettes, type Rect } from './etiquettes.ts';

export interface RepereDom { libelle: string; el: HTMLElement; lib: HTMLElement; fil: HTMLElement; l: number; h: number }

/** Ce que les étiquettes évitent : les barres, le bouton d'immersion, les feuilles ; au téléphone,
 *  le tiroir. En coordonnées du canevas. */
export function lireObstacles(canvas: HTMLElement): Rect[] {
  const c = canvas.getBoundingClientRect();
  const telephone = matchMedia('(max-width: 900px), (max-height: 560px)').matches;
  const els = [...document.querySelectorAll<HTMLElement>('.barre-haut, .barre-bas, .bouton-immersion'),
    ...document.querySelectorAll<HTMLElement>(telephone ? '.sur-salle' : '.sur-salle > *')];
  return els.map((e) => e.getBoundingClientRect()).filter((b) => b.width && b.height)
    .map((b) => ({ x: b.left - c.left, y: b.top - c.top, l: b.width, h: b.height }));
}

/** Chaque étiquette à une place libre ; deux points très proches partagent une étiquette à deux
 *  lignes. `points` : la position de chaque repère, de 0 à 1 dans le canevas. */
export function poserEtiquettes(reperes: RepereDom[], points: { x: number; y: number }[], w: number, h: number, obstacles: Rect[]) {
  const vus = reperes.map((e, k) => ({ e, k })).filter(({ e }) => !e.el.hidden);
  const pts = vus.map(({ e, k }) => {
    if (!e.l) { e.l = e.lib.offsetWidth; e.h = e.lib.offsetHeight; }
    return { x: points[k].x * w, y: points[k].y * h, l: e.l, h: e.h };
  });
  const places = placerEtiquettes(pts, obstacles, { x: 0, y: 0, l: w, h });
  vus.forEach(({ e }, v) => {
    const p = places[v], q = pts[v];
    e.lib.hidden = p.avec !== null || p.x === null;
    e.fil.hidden = !p.fil;
    if (e.lib.hidden) return;
    e.lib.textContent = [e.libelle, ...p.groupes.map((g) => vus[g].e.libelle)].join('\n');
    e.lib.classList.toggle('double', p.groupes.length > 0);
    e.lib.style.left = `${p.x! - q.x}px`;
    e.lib.style.top = `${p.y! - q.y}px`;
    if (p.fil) {
      // Du point au bord le plus proche de l'étiquette.
      const lt = Math.max(e.l, ...p.groupes.map((g) => vus[g].e.l));
      const cx = Math.max(p.x!, Math.min(q.x, p.x! + lt)) - q.x, cy = Math.max(p.y!, Math.min(q.y, p.y! + e.h)) - q.y;
      e.fil.style.width = `${Math.hypot(cx, cy)}px`;
      e.fil.style.transform = `rotate(${Math.atan2(cy, cx)}rad)`;
    }
  });
}
