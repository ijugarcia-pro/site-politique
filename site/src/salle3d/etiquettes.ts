// Les étiquettes des repères, sans collision (cadrage MVP, R8, lot 7). Fonction pure : elle reçoit
// les points à l'écran, par ordre de priorité (Toi, jumeau, opposé, député), et rend où poser chaque
// étiquette. Elle essaie quatre emplacements autour du point, puis s'en éloigne en gardant un fil
// vers le point. Deux points à moins de 30 px partagent une étiquette à deux lignes. Elle ne déplace
// jamais un point : un opposé voisin d'un jumeau reste à sa place (cadrage, R8).

export interface Rect { x: number; y: number; l: number; h: number }
/** Un point et la taille de son étiquette, en pixels. */
export interface PointEtiquette { x: number; y: number; l: number; h: number }
export interface Placement {
  /** Le coin haut gauche de l'étiquette ; null : ce point partage l'étiquette d'un autre. */
  x: number | null; y: number | null;
  /** Le point dont l'étiquette porte aussi ce point ; les points groupés avec lui, sinon. */
  avec: number | null; groupes: number[];
  /** Vrai : l'étiquette est loin de son point, un fil les relie. */
  fil: boolean;
}

export const GROUPE_PX = 30;
/** L'écart entre un point et son étiquette, entre deux étiquettes, et le rayon d'un point. */
const ECART = 8, MARGE = 4, RAYON_POINT = 13;
/** Les distances essayées autour du point : la première sans fil. */
const DISTANCES = [ECART + RAYON_POINT, 44, 72, 104, 144, 192, 248, 312];
const SANS_FIL = DISTANCES[0];

const recouvre = (a: Rect, b: Rect, marge = 0) =>
  a.x < b.x + b.l + marge && b.x < a.x + a.l + marge && a.y < b.y + b.h + marge && b.y < a.y + a.h + marge;

/** Les emplacements autour d'un point, à une distance : dessus, dessous, à gauche, à droite, puis
 *  les quatre coins. */
function emplacements(p: { x: number; y: number }, l: number, h: number, d: number): Rect[] {
  const a = [
    { x: p.x - l / 2, y: p.y - d - h }, { x: p.x - l / 2, y: p.y + d },
    { x: p.x - d - l, y: p.y - h / 2 }, { x: p.x + d, y: p.y - h / 2 },
  ];
  if (d > SANS_FIL) a.push({ x: p.x - d - l, y: p.y - d - h }, { x: p.x + d, y: p.y - d - h }, { x: p.x - d - l, y: p.y + d }, { x: p.x + d, y: p.y + d });
  return a.map((r) => ({ ...r, l, h }));
}

/** `hauteurLigne` : ce qu'ajoute une ligne de plus à une étiquette groupée. */
export function placerEtiquettes(points: PointEtiquette[], obstacles: Rect[], bornes: Rect, hauteurLigne = 18): Placement[] {
  const sortie: Placement[] = points.map(() => ({ x: null, y: null, avec: null, groupes: [], fil: false }));
  // Les groupes : le point le plus prioritaire garde l'étiquette.
  for (let i = 0; i < points.length; i++) {
    if (sortie[i].avec !== null) continue;
    for (let j = i + 1; j < points.length; j++) {
      if (sortie[j].avec === null && Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < GROUPE_PX) {
        sortie[j].avec = i;
        sortie[i].groupes.push(j);
      }
    }
  }
  const dedans = (r: Rect) => r.x >= bornes.x && r.y >= bornes.y && r.x + r.l <= bornes.x + bornes.l && r.y + r.h <= bornes.y + bornes.h;
  // Une étiquette large sur un petit écran glisse pour rester dans le cadre.
  const ramener = (r: Rect): Rect => ({ ...r,
    x: Math.max(bornes.x, Math.min(r.x, bornes.x + bornes.l - r.l)), y: Math.max(bornes.y, Math.min(r.y, bornes.y + bornes.h - r.h)) });
  const poses: Rect[] = [];
  const pointsRects = points.map((p) => ({ x: p.x - RAYON_POINT, y: p.y - RAYON_POINT, l: 2 * RAYON_POINT, h: 2 * RAYON_POINT }));
  const libre = (r: Rect, obstaclesAussi: boolean) => dedans(r) && !poses.some((o) => recouvre(r, o, MARGE))
    && !pointsRects.some((o) => recouvre(r, o))
    && (!obstaclesAussi || !obstacles.some((o) => recouvre(r, o)));

  points.forEach((p, i) => {
    if (sortie[i].avec !== null) return;
    const groupe = [i, ...sortie[i].groupes];
    const l = Math.max(...groupe.map((k) => points[k].l));
    const h = p.h + (groupe.length - 1) * hauteurLigne;
    let choix: Rect | null = null, d = SANS_FIL;
    // D'abord loin des feuilles ; si la zone est trop petite, on accepte de passer sous une feuille :
    // deux étiquettes ne se recouvrent jamais.
    for (const obstaclesAussi of [true, false]) {
      for (const dist of DISTANCES) {
        choix = emplacements(p, l, h, dist).map(ramener).find((r) => libre(r, obstaclesAussi)) ?? null;
        if (choix) { d = dist; break; }
      }
      if (choix) break;
    }
    if (!choix) {
      // Dernier recours : une grille sur tout le cadre, la case libre la plus proche du point.
      let dist = Infinity;
      for (let y = bornes.y; y + h <= bornes.y + bornes.h; y += h / 2) {
        for (let x = bornes.x; x + l <= bornes.x + bornes.l; x += 20) {
          const r = { x, y, l, h };
          const e = Math.hypot(x + l / 2 - p.x, y + h / 2 - p.y);
          if (e < dist && !poses.some((o) => recouvre(r, o, MARGE))) { dist = e; choix = r; }
        }
      }
      d = Infinity;
    }
    if (!choix) return; // Un cadre plus petit qu'une étiquette : elle n'est pas posée.
    poses.push(choix);
    sortie[i].x = choix.x; sortie[i].y = choix.y; sortie[i].fil = d > SANS_FIL;
  });
  return sortie;
}

