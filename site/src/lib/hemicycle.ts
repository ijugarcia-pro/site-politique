// Géométrie de l'hémicycle, reprise de la maquette V5 : 577 sièges sur 13 rangées en demi-cercle.
// Coordonnées dans un repère de 1000 de large ; le schéma se lit de gauche à droite, et les
// sièges sont remplis colonne par colonne (par angle, puis du centre vers l'extérieur), si bien
// qu'un groupe occupe une part de l'hémicycle.

export const SIEGES = 577;
export const LARGEUR = 1000;
export const HAUTEUR = 510;
const RANGEES = 13;
const R_INTERIEUR = 170;
const R_EXTERIEUR = 430;
const CENTRE_Y = 490;
export const RAYON_SIEGE = 7.6;

export interface Place {
  x: number;
  y: number;
  angle: number; // 0 à gauche, π à droite
  rangee: number; // 0 au centre
}

export function places(): Place[] {
  const rayons = Array.from({ length: RANGEES },
    (_, i) => R_INTERIEUR + (i * (R_EXTERIEUR - R_INTERIEUR)) / (RANGEES - 1));
  const somme = rayons.reduce((a, b) => a + b, 0);
  const nombres = rayons.map((r) => Math.round((SIEGES * r) / somme));
  nombres[RANGEES - 1] += SIEGES - nombres.reduce((a, b) => a + b, 0);
  const brutes: (Place & { r: number })[] = [];
  rayons.forEach((r, rangee) => {
    const n = nombres[rangee];
    for (let j = 0; j < n; j++) {
      const angle = (Math.PI * j) / (n - 1);
      brutes.push({ x: LARGEUR / 2 - r * Math.cos(angle), y: CENTRE_Y - r * Math.sin(angle),
        angle, rangee, r });
    }
  });
  brutes.sort((a, b) => a.angle - b.angle || a.r - b.r);
  return brutes.map(({ x, y, angle, rangee }) => ({ x, y, angle, rangee }));
}

export interface Etiquette {
  x: number;
  y: number;
  rotation: number;
}

/** Position de l'étiquette d'un groupe : au milieu de sa part, juste au-dessus de la dernière
 *  rangée, tournée selon le rayon. `debut` et `fin` sont les indices de ses sièges ;
 *  `decalage` l'éloigne encore du centre (petits groupes voisins). */
export function etiquette(liste: Place[], debut: number, fin: number, decalage = 0): Etiquette {
  const angle = (liste[debut].angle + liste[fin].angle) / 2;
  const r = R_EXTERIEUR + 30 + decalage;
  return { x: LARGEUR / 2 - r * Math.cos(angle), y: CENTRE_Y - r * Math.sin(angle),
    rotation: (angle * 180) / Math.PI - 90 };
}
