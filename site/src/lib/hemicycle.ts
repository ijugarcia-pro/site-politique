// Géométrie de l'hémicycle, reprise de la maquette V5 : 577 sièges sur 13 rangées en demi-cercle.
// Coordonnées dans un repère de 1000 de large ; le schéma se lit de gauche à droite, et les
// sièges sont remplis colonne par colonne (par angle, puis du centre vers l'extérieur), si bien
// qu'un groupe occupe une part de l'hémicycle.

export const SIEGES = 577;
export const LARGEUR = 1000;
export const HAUTEUR = 510;
const RANGEES = 13;
const R_INTERIEUR = 170;
export const R_EXTERIEUR = 430;
export const CENTRE_Y = 490;
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

/** Un point de l'hémicycle, à l'angle `angle` (0 à gauche, π à droite) et au rayon `r`. */
export const point = (angle: number, r: number) =>
  ({ x: LARGEUR / 2 - r * Math.cos(angle), y: CENTRE_Y - r * Math.sin(angle) });

export interface Part {
  groupe: string;
  debut: number;
  fin: number;
}

/** La part de chaque groupe, dans l'ordre des places : ses sièges sont contigus (remplissage
 *  par angle). `groupes` donne le groupe de chaque siège (vide pour un siège vacant). */
export function parts(groupes: (string | null | undefined)[]): Part[] {
  const sortie: Part[] = [];
  groupes.forEach((g, i) => {
    if (!g) return;
    const derniere = sortie[sortie.length - 1];
    if (derniere?.groupe === g) derniere.fin = i;
    else sortie.push({ groupe: g, debut: i, fin: i });
  });
  return sortie;
}

/** L'angle du milieu d'une part. */
export const milieu = (liste: Place[], p: Pick<Part, 'debut' | 'fin'>) =>
  (liste[p.debut].angle + liste[p.fin].angle) / 2;

/** Un arc de cercle (attribut `d` d'un chemin SVG) qui borde une part, au rayon `r`. */
export function arc(liste: Place[], p: Pick<Part, 'debut' | 'fin'>, r: number): string {
  const a = point(liste[p.debut].angle, r);
  const b = point(liste[p.fin].angle, r);
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}A${r} ${r} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/** Les étiquettes des groupes : au milieu de leur part ; quand une part est trop étroite pour
 *  son sigle, une étiquette sur deux est éloignée du centre de `ecart`. `largeur` donne la
 *  place que prend le sigle, dans les unités du dessin. */
export function etiquettes(liste: Place[], lesParts: Part[], largeur: (p: Part) => number,
  ecart: number, decalage = 0): (Etiquette & { part: Part })[] {
  let decale = false;
  return lesParts.map((p) => {
    const ouverture = (liste[p.fin].angle - liste[p.debut].angle + Math.PI / SIEGES)
      * (R_EXTERIEUR + 30 + decalage);
    decale = ouverture < largeur(p) ? !decale : false;
    return { part: p, ...etiquette(liste, p.debut, p.fin, decalage + (decale ? ecart : 0)) };
  });
}
