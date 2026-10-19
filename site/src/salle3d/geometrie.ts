// La géométrie de la salle 3D (docs/refonte-la-seance.md, § 4 et § 9.1). Les sièges ne sont pas
// recalculés : on part des 577 places du plan 2D (lib/hemicycle.ts), et le siège n° i du plan est
// le siège n° i de la salle. Chaque rangée garde ses sièges, dans l'ordre de leur angle ; ils
// sont seulement répartis entre les 6 blocs séparés par les 5 allées du prototype de Julien
// (docs/salle-3d/room.js). Un groupe garde donc une part contiguë de la salle, coupée par les
// allées. Repère : centre de l'hémicycle à l'origine, sièges vers +z, tribune vers −z, mètres.

import { places, type Place } from '../lib/hemicycle.ts';

/** Les cotes du prototype (room.js, `P`). */
export const P = {
  R0: 6.4, D: 1.08, H: 0.36, NR: 13, TH0: 6, TH1: 174,
  ALLEES: [33, 61.5, 90, 118.5, 147], ALLEE: 1.05,
  RCOL: 21.0, YTOP: 13 * 0.36, YENT: 12.6, YCOR: 13.8, RDOME: 23.0, KDOME: 0.42, ZFOND: -6.5,
} as const;

/** Largeur d'un fauteuil, accoudoirs compris (room.js : bois ±0,31 + 0,035). */
export const LARGEUR_FAUTEUIL = 0.69;

const rad = (d: number) => (d * Math.PI) / 180;

export interface Secteur { a0: number; a1: number; l: number }
export interface Rangee { i: number; rd: number; rs: number; y: number; secteurs: Secteur[]; l: number }

/** Les 13 rangées et leurs 6 blocs, comme dans le prototype : rd, le bord du pupitre ; rs, le
 *  rayon des sièges ; y, la hauteur de la marche ; a0 et a1, les angles utiles d'un bloc. */
export function rangees(): Rangee[] {
  const bornes = [P.TH0, ...P.ALLEES, P.TH1];
  return Array.from({ length: P.NR }, (_, i) => {
    const rd = P.R0 + i * P.D;
    const rs = rd + 0.74;
    const secteurs = bornes.slice(0, -1).map((b, k) => {
      const ma = (k === 0 ? 0.4 : P.ALLEE / 2) / rs;
      const mb = (k === bornes.length - 2 ? 0.4 : P.ALLEE / 2) / rs;
      const a0 = rad(b) + ma;
      const a1 = rad(bornes[k + 1]) - mb;
      return { a0, a1, l: (a1 - a0) * rs };
    });
    return { i, rd, rs, y: (i + 1) * P.H, secteurs, l: secteurs.reduce((s, x) => s + x.l, 0) };
  });
}

/** Répartit n sièges entre des longueurs, au plus fort reste (somme exacte, ordre gardé). */
export function repartir(n: number, longueurs: number[]): number[] {
  const total = longueurs.reduce((a, b) => a + b, 0);
  const brut = longueurs.map((l) => (n * l) / total);
  const base = brut.map(Math.floor);
  const reste = n - base.reduce((a, b) => a + b, 0);
  brut.map((v, k) => [v - Math.floor(v), k] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, reste).forEach(([, k]) => { base[k] += 1; });
  return base;
}

export interface Siege3D {
  /** Le numéro du siège dans le plan 2D (lib/hemicycle.ts), et donc dans la composition. */
  i: number;
  rang: number;
  secteur: number;
  /** Angle dans la salle (0 : à gauche vu du perchoir, π : à droite), comme l'angle du plan. */
  th: number;
  /** Rayon des sièges, bord du pupitre, hauteur de la marche. */
  r: number;
  rd: number;
  y: number;
  /** Écart entre deux sièges voisins de la rangée, en mètres. */
  pas: number;
}

/** Les 577 sièges de la salle, indexés comme le plan 2D. */
export function sieges3D(liste: Place[] = places()): Siege3D[] {
  const rs = rangees();
  const parRangee = new Map<number, number[]>();
  liste.forEach((p, i) => {
    const l = parRangee.get(p.rangee) ?? [];
    l.push(i);
    parRangee.set(p.rangee, l);
  });
  const sortie = new Array<Siege3D>(liste.length);
  for (const [k, indices] of parRangee) {
    const rg = rs[k];
    indices.sort((a, b) => liste[a].angle - liste[b].angle);
    const parSecteur = repartir(indices.length, rg.secteurs.map((s) => s.l));
    let j = 0;
    parSecteur.forEach((n, sec) => {
      const s = rg.secteurs[sec];
      for (let q = 0; q < n; q++, j++) {
        sortie[indices[j]] = { i: indices[j], rang: k, secteur: sec, th: s.a0 + ((q + 0.5) * (s.a1 - s.a0)) / n,
          r: rg.rs, rd: rg.rd, y: rg.y, pas: ((s.a1 - s.a0) * rg.rs) / n };
      }
    });
  }
  return sortie;
}

/** La largeur d'un fauteuil sur sa rangée : jamais plus que l'écart entre deux sièges, moins un
 *  jour de 2 cm. Les rangs intérieurs, plus serrés que dans le prototype, ont des fauteuils plus
 *  étroits. */
export const echelleFauteuil = (pas: number) => Math.min(1, (pas - 0.02) / LARGEUR_FAUTEUIL);

/** Position d'un siège dans la salle. */
export function position(s: Pick<Siege3D, 'r' | 'th' | 'y'>, dy = 0): [number, number, number] {
  return [s.r * Math.cos(s.th), s.y + dy, s.r * Math.sin(s.th)];
}
