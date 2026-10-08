// Ton hémicycle, calculé dans le navigateur à partir de tes réponses et de la matrice des votes
// (export/site/matrice.json, une lettre par vote : P pour, C contre, A abstention, - absent ou
// hors mandat). Aucune réponse ne quitte le navigateur. Règles (CLAUDE.md, § 4.3 du planning) :
// - un vote est « en commun » quand tu as répondu pour ou contre et que le député (ou le groupe)
//   a pris position ; une abstention compte comme une réponse différente ;
// - classement par accord lissé (m + 2) / (n + 4), m votes identiques sur n en commun ;
// - le jumeau est le député en exercice le mieux classé, toujours montré dès un vote en commun
//   (décision du 8 octobre 2026), à égalité celui qui a le plus de votes en commun ;
// - précision : 1 − e^(−n / 20), n = tes réponses sur les votes de la matrice.
// Aucun axe gauche-droite : seulement des taux d'accord sur des votes réels.

export type Reponse = 'pour' | 'contre';

export interface LigneDepute {
  u: string;
  n: string;
  g: string | null;
  e: number;
  s: string;
}

export interface LigneGroupe {
  u: string;
  sigle: string;
  libelle: string;
  s: string;
}

export interface Matrice {
  votes: string[];
  deputes: LigneDepute[];
  groupes: LigneGroupe[];
}

export interface Comparaison {
  communs: number;
  identiques: number;
  /** Accord lissé (m + 2) / (n + 4), entre 0 et 1. */
  lisse: number;
  /** Accord brut en pourcentage arrondi, ou null sans vote en commun. */
  taux: number | null;
}

const LETTRE: Record<Reponse, string> = { pour: 'P', contre: 'C' };
const PRISE_DE_POSITION = new Set(['P', 'C', 'A']);

export const lisse = (identiques: number, communs: number) => (identiques + 2) / (communs + 4);

export const precision = (n: number) => 1 - Math.exp(-n / 20);

/** Tes réponses, traduites en [indice du vote dans la matrice, lettre]. */
export function colonnes(matrice: Pick<Matrice, 'votes'>,
  reponses: Record<string, Reponse>): [number, string][] {
  const sortie: [number, string][] = [];
  matrice.votes.forEach((uid, i) => {
    const r = reponses[uid];
    if (r) sortie.push([i, LETTRE[r]]);
  });
  return sortie;
}

export function comparer(ligne: string, mes: [number, string][]): Comparaison {
  let communs = 0;
  let identiques = 0;
  for (const [i, lettre] of mes) {
    const sienne = ligne[i];
    if (!PRISE_DE_POSITION.has(sienne)) continue;
    communs += 1;
    if (sienne === lettre) identiques += 1;
  }
  return { communs, identiques, lisse: lisse(identiques, communs),
    taux: communs ? Math.round((100 * identiques) / communs) : null };
}

export interface Classe<T> extends Comparaison {
  ligne: T;
}

/** Du plus proche au plus lointain : accord lissé, puis nombre de votes en commun, puis nom.
 *  Seules les lignes qui ont au moins un vote en commun sont classées. */
export function classer<T extends { s: string; n?: string; sigle?: string }>(lignes: T[],
  mes: [number, string][]): Classe<T>[] {
  return lignes
    .map((ligne) => ({ ligne, ...comparer(ligne.s, mes) }))
    .filter((c) => c.communs > 0)
    .sort((a, b) => b.lisse - a.lisse || b.communs - a.communs
      || (a.ligne.n ?? a.ligne.sigle ?? '').localeCompare(b.ligne.n ?? b.ligne.sigle ?? '', 'fr'));
}

export interface Profil {
  /** Tes réponses sur des votes de la matrice. */
  reponses: number;
  precision: number;
  deputes: Classe<LigneDepute>[];
  groupes: Classe<LigneGroupe>[];
  jumeau: Classe<LigneDepute> | null;
  oppose: Classe<LigneDepute> | null;
}

export function profil(matrice: Matrice, reponses: Record<string, Reponse>): Profil {
  const mes = colonnes(matrice, reponses);
  const deputes = classer(matrice.deputes.filter((d) => d.e === 1), mes);
  const groupes = classer(matrice.groupes, mes);
  const oppose = deputes.length > 1
    ? [...deputes].sort((a, b) => a.lisse - b.lisse || b.communs - a.communs)[0]
    : null;
  return { reponses: mes.length, precision: precision(mes.length), deputes, groupes,
    jumeau: deputes[0] ?? null, oppose };
}

/** La part des députés qui ont pris position sur un vote et voté comme toi (pour l'écran de
 *  révélation et la story « à contre-courant »). */
export function partCommeToi(matrice: Matrice, indice: number, reponse: Reponse): number | null {
  let exprimes = 0;
  let pareils = 0;
  for (const d of matrice.deputes) {
    const l = d.s[indice];
    if (l !== 'P' && l !== 'C') continue;
    exprimes += 1;
    if (l === LETTRE[reponse]) pareils += 1;
  }
  return exprimes ? Math.round((100 * pareils) / exprimes) : null;
}

/** Les teintes de l'hémicycle personnel : plus un siège est foncé, plus ce député vote comme
 *  toi. Gris : aucun vote en commun. */
export const TEINTES = [
  { jusqua: 0.35, couleur: '#EDE7FF', libelle: 'Rarement comme toi' },
  { jusqua: 0.5, couleur: '#D3C4FF', libelle: 'Parfois' },
  { jusqua: 0.65, couleur: '#A98BFF', libelle: 'Souvent' },
  { jusqua: 0.8, couleur: '#7C4DFF', libelle: 'Très souvent' },
  { jusqua: Infinity, couleur: '#4B2BC2', libelle: 'Presque toujours' },
];
export const SANS_VOTE_COMMUN = '#DFE3EB';

export function teinte(lisse: number | null): string {
  if (lisse === null) return SANS_VOTE_COMMUN;
  return TEINTES.find((t) => lisse < t.jusqua)!.couleur;
}

/** « Prénom Nom » → « PN » (le premier mot qui n'est pas une particule pour le nom). */
export function initiales(nom: string): string {
  const PARTICULES = new Set(['de', 'du', 'des', 'la', 'le', "d'"]);
  const [prenom, ...reste] = nom.split(' ');
  const famille = reste.flatMap((m) => m.split('-')).find((m) => !PARTICULES.has(m.toLowerCase()))
    ?? reste[0] ?? '';
  return (prenom.charAt(0) + famille.charAt(0)).toUpperCase();
}
