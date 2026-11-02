// Le siège visé, sans lancer de rayon (cadrage MVP, R6, lot 6) : les 577 sièges sont projetés à
// l'écran une fois par changement de caméra (scene.ts) et rangés dans une grille ; un mouvement de
// souris ne regarde que les cases voisines du pointeur. Pur et testable sans WebGL.

/** Un siège à l'écran : x et y en pixels, r son rayon apparent, d sa distance à la caméra. */
export interface PointVise { x: number; y: number; r: number; d: number }

/** Deux sièges à moins de ce nombre de pixels du pointeur sont à égalité : le plus proche de la
 *  caméra l'emporte. */
const EGALITE = 0.5;

export function grilleSieges(points: (PointVise | null)[], rayonMax = 22) {
  const cellule = Math.max(rayonMax, ...points.map((p) => p?.r ?? 0), 1);
  const cases = new Map<number, number[]>();
  const cle = (cx: number, cy: number) => cx * 100003 + cy;
  points.forEach((p, i) => {
    if (!p) return;
    const k = cle(Math.floor(p.x / cellule), Math.floor(p.y / cellule));
    const c = cases.get(k);
    if (c) c.push(i); else cases.set(k, [i]);
  });
  /** Le siège le plus proche dans son rayon apparent, ou dans `rayonMin` pixels s'il est plus grand
   *  (le doigt) ; null : aucun. */
  return (x: number, y: number, rayonMin = 0): number | null => {
    const cx = Math.floor(x / cellule), cy = Math.floor(y / cellule);
    let meilleur: number | null = null, dist = Infinity, prof = Infinity;
    for (let a = cx - 1; a <= cx + 1; a++) for (let b = cy - 1; b <= cy + 1; b++) {
      for (const i of cases.get(cle(a, b)) ?? []) {
        const p = points[i]!, e = Math.hypot(p.x - x, p.y - y);
        if (e > Math.max(p.r, rayonMin)) continue;
        if (e < dist - EGALITE || (e <= dist + EGALITE && p.d < prof)) { meilleur = i; dist = e; prof = p.d; }
      }
    }
    return meilleur;
  };
}
