// Ton hémicycle, calculé dans le navigateur à partir de tes réponses et de la matrice des votes
// (export/site/matrice.json, une lettre par vote : P pour, C contre, A abstention, - absent ou
// hors mandat). Aucune réponse ne quitte le navigateur. Règles (CLAUDE.md, décision du 22 oct.
// 2026 « Le jumeau se compte en votes identiques ») :
// - N = tes réponses pour ou contre sur des votes de la matrice ;
// - pour chaque député (ou groupe) : identiques (même vote), contraires (vote inverse ou
//   abstention), absents = N − identiques − contraires (absent, non-votant ou hors mandat) ;
//   une absence n'est pas un accord ;
// - classement : identiques décroissant, puis contraires croissant, puis nom ;
// - le jumeau est le député en exercice classé premier, toujours montré dès un vote identique ;
// - précision : 1 − e^(−N / 20).
// Aucun axe gauche-droite : seulement des votes réels.

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
  /** Même vote que toi. */
  identiques: number;
  /** Vote inverse du tien, ou abstention. */
  contraires: number;
  /** N − identiques − contraires : absent, non-votant ou hors mandat. */
  absents: number;
  /** identiques / N, entre 0 et 1 (0 sans réponse) : sert aux niveaux d'accord. */
  part: number;
  /** identiques / N en pourcentage arrondi, ou null sans réponse. */
  taux: number | null;
}

const LETTRE: Record<Reponse, string> = { pour: 'P', contre: 'C' };

export const precision = (n: number) => 1 - Math.exp(-n / 20);

/** Le nombre de votes tranchés à partir duquel la place est dite fiable (précision de 71 %) :
 *  ceux du quiz et des lots du parcours (data/quiz.json, data/lots.json ; lots.test.ts vérifie
 *  que les deux restent d'accord). Les lots facultatifs affinent au-delà. */
export const VOTES_FIABLES = 25;

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
  let identiques = 0;
  let contraires = 0;
  for (const [i, lettre] of mes) {
    const sienne = ligne[i];
    if (sienne === lettre) identiques += 1;
    else if (sienne === 'P' || sienne === 'C' || sienne === 'A') contraires += 1;
  }
  const n = mes.length;
  return { identiques, contraires, absents: n - identiques - contraires,
    part: n ? identiques / n : 0, taux: n ? Math.round((100 * identiques) / n) : null };
}

export interface Classe<T> extends Comparaison {
  ligne: T;
}

const nomDe = (l: { n?: string; sigle?: string }) => l.n ?? l.sigle ?? '';

/** Du plus proche au plus lointain : le plus de votes identiques, puis le moins de votes
 *  contraires, puis le nom. Seules les lignes qui ont voté au moins une fois (pour, contre ou
 *  abstention) sur tes votes sont classées. */
export function classer<T extends { s: string; n?: string; sigle?: string }>(lignes: T[],
  mes: [number, string][]): Classe<T>[] {
  return lignes
    .map((ligne) => ({ ligne, ...comparer(ligne.s, mes) }))
    .filter((c) => c.identiques + c.contraires > 0)
    .sort((a, b) => b.identiques - a.identiques || a.contraires - b.contraires
      || nomDe(a.ligne).localeCompare(nomDe(b.ligne), 'fr'));
}

export interface Profil {
  /** N : tes réponses pour ou contre sur des votes de la matrice. */
  reponses: number;
  precision: number;
  deputes: Classe<LigneDepute>[];
  groupes: Classe<LigneGroupe>[];
  jumeau: Classe<LigneDepute> | null;
  /** Le nombre d'autres députés au même couple (identiques, contraires) que le jumeau. */
  egalites: number;
  oppose: Classe<LigneDepute> | null;
}

export function profil(matrice: Matrice, reponses: Record<string, Reponse>): Profil {
  const mes = colonnes(matrice, reponses);
  const deputes = classer(matrice.deputes.filter((d) => d.e === 1), mes);
  const groupes = classer(matrice.groupes, mes);
  const premier = deputes[0];
  const jumeau = premier && premier.identiques > 0 ? premier : null;
  const egalites = jumeau ? deputes.filter((d) => d !== jumeau
    && d.identiques === jumeau.identiques && d.contraires === jumeau.contraires).length : 0;
  // Ton opposé : le plus de votes contraires, puis le moins d'identiques, puis le nom. Il faut
  // au moins un vote contraire : un député toujours absent n'est jamais ton opposé.
  const oppose = deputes.filter((d) => d !== jumeau && d.contraires > 0)
    .sort((a, b) => b.contraires - a.contraires || a.identiques - b.identiques
      || nomDe(a.ligne).localeCompare(nomDe(b.ligne), 'fr'))[0] ?? null;
  return { reponses: mes.length, precision: precision(mes.length), deputes, groupes, jumeau,
    egalites, oppose };
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

/** Les quatre niveaux de l'hémicycle personnel : plus un siège est foncé, plus ce député vote
 *  comme toi, d'après la part de tes votes où il a voté comme toi (identiques / N ; une absence
 *  n'est pas un accord). Le dernier, « presque toujours », est celui que compte le chiffre au
 *  centre de l'hémicycle. */
export const NIVEAUX = [
  { jusqua: 0.35, couleur: '#DFE3EB', libelle: 'Rarement comme toi', haut: false },
  { jusqua: 0.5, couleur: '#D9CCFF', libelle: 'Parfois', haut: false },
  { jusqua: 0.67, couleur: '#A98BFF', libelle: 'Souvent', haut: false },
  { jusqua: Infinity, couleur: '#6A3DF0', libelle: 'Presque toujours', haut: true },
];
/** Les mêmes niveaux dans la salle éclairée (palier 2) : de l'éteint au blanc chaud d'une lampe,
 *  sans couleur de parti (VDEF § 6). */
export const INTENSITES = ['#3A3D45', '#6E6B66', '#A9A49B', '#F4EDE2'];
/** Aucun vote exprimé sur tes votes : un siège blanc, cerclé de gris. */
export const SANS_VOTE_COMMUN = '#DFE3EB';

export const niveau = (part: number) => NIVEAUX.find((t) => part < t.jusqua)!;

export function teinte(part: number | null): string {
  return part === null ? '#FFFFFF' : niveau(part).couleur;
}

/** « Prénom Nom » → « PN » (le premier mot qui n'est pas une particule pour le nom). */
export function initiales(nom: string): string {
  const PARTICULES = new Set(['de', 'du', 'des', 'la', 'le', "d'"]);
  const [prenom, ...reste] = nom.split(' ');
  const famille = reste.flatMap((m) => m.split('-')).find((m) => !PARTICULES.has(m.toLowerCase()))
    ?? reste[0] ?? '';
  return (prenom.charAt(0) + famille.charAt(0)).toUpperCase();
}
