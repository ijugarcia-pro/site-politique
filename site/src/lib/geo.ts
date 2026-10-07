// Retrouver sa circonscription : code postal → communes → circonscriptions (fichiers
// /donnees/cp/{xx}.json), puis, si une commune en couvre plusieurs, l'adresse située dans les
// contours des circonscriptions (/donnees/contours/{dep}.json). Fonctions pures, testées dans
// geo.test.ts ; les appels réseau sont dans la page /deputes/.

/** Une commune d'un code postal : nom, circonscriptions (« 75-5 »), et `a` si l'adresse est
 *  nécessaire pour choisir (commune partagée, arrondissement, commune nouvelle). */
export interface Commune {
  n: string;
  c: string[];
  a?: 1;
}

export type Anneau = [number, number][];
export type Geometrie =
  | { type: 'Polygon'; coordinates: Anneau[] }
  | { type: 'MultiPolygon'; coordinates: Anneau[][] };

export const codePostalValide = (cp: string) => /^\d{5}$/.test(cp);

/** Le fichier qui contient un code postal : ses deux premiers chiffres. */
export const prefixe = (cp: string) => cp.slice(0, 2);

/** Le département d'une circonscription (« 971-2 » → « 971 »). */
export const departementDe = (circo: string) => circo.split('-')[0];

/** « 75-5 » → « 5e circonscription » ; la première est la « 1re ». */
export function libelleCirco(circo: string): string {
  const n = Number(circo.split('-')[1]);
  return `${n}${n === 1 ? 're' : 'e'} circonscription`;
}

/** Ce qu'un code postal permet de conclure : une seule circonscription, un choix de commune,
 *  ou une adresse à préciser parmi des circonscriptions candidates. */
export type Issue =
  | { type: 'inconnu' }
  | { type: 'trouve'; circo: string }
  | { type: 'communes'; communes: Commune[] }
  | { type: 'adresse'; candidates: string[] };

export function conclure(communes: Commune[] | undefined): Issue {
  if (!communes || communes.length === 0) return { type: 'inconnu' };
  if (communes.length > 1) {
    const toutes = new Set(communes.flatMap((c) => c.c));
    if (toutes.size === 1 && communes.every((c) => !c.a)) {
      return { type: 'trouve', circo: [...toutes][0] };
    }
    return { type: 'communes', communes };
  }
  return conclureCommune(communes[0]);
}

export function conclureCommune(commune: Commune): Issue {
  if (commune.c.length === 1 && !commune.a) return { type: 'trouve', circo: commune.c[0] };
  return { type: 'adresse', candidates: commune.c };
}

/** Le point (longitude, latitude) est-il dans l'anneau ? Lancer de rayon. */
function dansAnneau([x, y]: [number, number], anneau: Anneau): boolean {
  let dedans = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [xi, yi] = anneau[i];
    const [xj, yj] = anneau[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Dans un polygone : dans l'anneau extérieur, hors de ses trous. */
function dansPolygone(point: [number, number], anneaux: Anneau[]): boolean {
  return dansAnneau(point, anneaux[0]) && !anneaux.slice(1).some((t) => dansAnneau(point, t));
}

export function contient(geo: Geometrie, point: [number, number]): boolean {
  return geo.type === 'Polygon'
    ? dansPolygone(point, geo.coordinates)
    : geo.coordinates.some((p) => dansPolygone(point, p));
}

/** La circonscription qui contient le point, parmi les candidates (toutes si la liste est
 *  vide). */
export function circoDuPoint(contours: Record<string, Geometrie>, point: [number, number],
  candidates: string[] = []): string | null {
  const cles = candidates.length ? candidates : Object.keys(contours);
  return cles.find((c) => contours[c] && contient(contours[c], point)) ?? null;
}
