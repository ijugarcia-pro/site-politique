// Ce que la page vote dit d'un scrutin, calculé à partir des seules données publiées : issue,
// marge, voix qui auraient fait basculer le résultat, détail par groupe. Fonctions pures,
// testées dans votes.test.ts ; aucun texte ne juge le vote.

export interface Chiffres {
  sort: string;
  categorie: string;
  solennel: boolean;
  motion_censure: boolean;
  decompte: { pour: number; contre: number; abstention: number; non_votant: number;
    absent: number };
  requis: number | null;
  voix_pour_inverser: number | null;
}

export const adopte = (s: Pick<Chiffres, 'sort'>) => s.sort.toLowerCase().startsWith('adopt');

const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) =>
  `${n.toLocaleString('fr-FR')} ${n > 1 ? motPluriel : mot}`;

/** Ce qui est mis aux voix, et s'il faut accorder au féminin. */
function objet(s: Pick<Chiffres, 'categorie' | 'motion_censure'>): [string, boolean] {
  if (s.motion_censure) return ['la motion', true];
  const objets: Record<string, [string, boolean]> = {
    partie: ['cette partie du budget', true],
    'résolution': ['la résolution', true],
    'déclaration': ['la déclaration', true],
  };
  return objets[s.categorie] ?? ['le texte', false];
}

/** « Adopté » / « Rejeté », accordé : une motion, une résolution, une déclaration sont
 *  féminines. */
export function verdict(s: Chiffres): string {
  return (adopte(s) ? 'Adopté' : 'Rejeté') + (objet(s)[1] ? 'e' : '');
}

/** Ce sur quoi porte le vote, en quelques mots, pour l'étiquette de la page. */
export function nature(s: Pick<Chiffres, 'categorie' | 'solennel' | 'motion_censure'>): string {
  if (s.motion_censure) return 'Motion de censure';
  const base: Record<string, string> = {
    ensemble: "Vote sur l'ensemble d'un texte",
    partie: "Vote sur une partie d'un budget",
    'résolution': 'Vote sur une résolution',
    'déclaration': 'Vote sur une déclaration du Gouvernement',
    article: "Vote sur un article",
  };
  const libelle = base[s.categorie] ?? 'Vote';
  return s.solennel ? `Scrutin solennel · ${libelle.replace(/^Vote/, 'vote')}` : libelle;
}

/** Les voix qui auraient fait basculer le résultat (règle du projet : P − R + 1 si adopté,
 *  R − P si rejeté ; R = suffrages requis publiés avec le scrutin). La phrase dit exactement ce
 *  que le calcul suppose : des députés qui changent de camp, les suffrages exprimés restant
 *  les mêmes. Pour une motion de censure, seules les voix pour comptent. */
export function bascule(s: Chiffres): string | null {
  const n = s.voix_pour_inverser;
  if (n === null || n <= 0 || s.requis === null) return null;
  if (s.motion_censure) {
    return adopte(s)
      ? `La motion a été adoptée avec ${pluriel(n - 1, 'voix', 'voix')} de plus que les `
        + `${s.requis} requises.`
      : `Il a manqué ${pluriel(n, 'voix', 'voix')} pour atteindre les ${s.requis} requises `
        + `et faire tomber le Gouvernement.`;
  }
  const [nom, feminin] = objet(s);
  const e = feminin ? 'e' : '';
  const verbe = `avai${n > 1 ? 'en' : ''}t`;
  return adopte(s)
    ? `Si ${pluriel(n, 'député ayant voté pour', 'députés ayant voté pour')} ${verbe} `
      + `voté contre, ${nom} aurait été rejeté${e}.`
    : `Si ${pluriel(n, 'député ayant voté contre', 'députés ayant voté contre')} ${verbe} `
      + `voté pour, ${nom} aurait été adopté${e}.`;
}

/** La marge, pour le gros titre : « à 25 voix près ». */
export function marge(s: Chiffres): string | null {
  const n = s.voix_pour_inverser;
  if (n === null || n <= 0) return null;
  return `à ${pluriel(n, 'voix', 'voix')} près`;
}

export interface Voix578 {
  pour: number;
  contre: number;
  /** Le sort du texte si ta voix avait compté. */
  adopte: boolean;
  /** Les députés qui devraient alors changer de camp pour inverser ce sort. */
  inverser: number;
}

/** « Ta voix de 578e » : le résultat si ta voix s'ajoutait à celles des députés. Les suffrages
 *  exprimés augmentent d'un : la majorité requise est donc recalculée (la moitié des suffrages
 *  exprimés, plus une voix), puis la règle du projet s'applique à ce nouveau décompte
 *  (P − R + 1 si adopté, R − P si rejeté). Quand le seuil publié n'est pas cette majorité
 *  (motion de censure : majorité des membres), il est gardé tel quel. Ta voix peut à elle seule
 *  changer le sort d'un vote très serré : `adopte` le dit. */
export function voix578(decompte: { pour: number; contre: number }, requis: number | null,
  reponse: 'pour' | 'contre'): Voix578 | null {
  if (requis === null || requis <= 0) return null;
  const majorite = (exprimes: number) => Math.floor(exprimes / 2) + 1;
  const pour = decompte.pour + (reponse === 'pour' ? 1 : 0);
  const contre = decompte.contre + (reponse === 'contre' ? 1 : 0);
  const r = requis === majorite(decompte.pour + decompte.contre) ? majorite(pour + contre) : requis;
  const adopte = pour >= r;
  return { pour, contre, adopte, inverser: adopte ? pour - r + 1 : r - pour };
}

/** Part des suffrages exprimés (pour + contre) qui va dans le sens d'une réponse. */
export function partExprimes(s: Pick<Chiffres, 'decompte'>, reponse: 'pour' | 'contre'): number {
  const exprimes = s.decompte.pour + s.decompte.contre;
  return exprimes ? Math.round((100 * s.decompte[reponse]) / exprimes) : 0;
}

export interface Barre {
  pour: number;
  abstention: number;
  contre: number;
}

/** Largeurs (en %) des parts pour, abstention et contre d'un groupe, rapportées à ses
 *  membres : le reste de la barre (non-votants et absents) reste gris. */
export function barre(decompte: Chiffres['decompte'], membres: number): Barre {
  if (!membres) return { pour: 0, abstention: 0, contre: 0 };
  const p = (n: number) => Math.round((1000 * n) / membres) / 10;
  return { pour: p(decompte.pour), abstention: p(decompte.abstention), contre: p(decompte.contre) };
}

/** Le décompte d'un groupe en toutes lettres, dans l'ordre du résultat. */
export function ligneGroupe(decompte: Chiffres['decompte']): string {
  const morceaux = [`${decompte.pour} pour`, `${decompte.contre} contre`];
  if (decompte.abstention) morceaux.push(pluriel(decompte.abstention, 'abst.', 'abst.'));
  return morceaux.join(' · ');
}

/** Les familles de votes, pour l'étiquette courte et les filtres d'Explorer. */
export type Famille = 'texte' | 'budget' | 'resolution' | 'declaration' | 'censure';

export function famille(s: Pick<Chiffres, 'categorie' | 'motion_censure'>): Famille {
  if (s.motion_censure) return 'censure';
  const familles: Record<string, Famille> = {
    partie: 'budget', 'résolution': 'resolution', 'déclaration': 'declaration',
  };
  return familles[s.categorie] ?? 'texte';
}

export const FAMILLES: Record<Famille, string> = {
  texte: 'Texte', budget: 'Budget', resolution: 'Résolution', declaration: 'Déclaration',
  censure: 'Censure',
};

/** Texte comparable pour la recherche : minuscules, sans accents ni ponctuation. */
export function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export type PositionGroupe = 'pour' | 'contre' | 'abstention';

/** La position majoritaire d'un groupe : celle qui réunit le plus de ses votes exprimés (pour,
 *  contre, abstention) ; null s'il n'a pas voté ou en cas d'égalité en tête. */
export function positionGroupe(d: Pick<Chiffres['decompte'], 'pour' | 'contre' | 'abstention'>): PositionGroupe | null {
  const rangs = (['pour', 'contre', 'abstention'] as const).map((p) => [p, d[p]] as const)
    .sort((a, b) => b[1] - a[1]);
  if (!rangs[0][1] || rangs[0][1] === rangs[1][1]) return null;
  return rangs[0][0];
}

/** « Avec son groupe ? » pour le tableau des 577 votes : « Non » pour un vote contre son groupe
 *  (la règle du projet : jamais pour les non-inscrits, jamais pour une abstention), « Oui » quand
 *  le vote est la position majoritaire du groupe, « — » sinon (absent, non-votant, non-inscrit,
 *  groupe sans position nette). */
export function avecSonGroupe(vote: string | undefined, dissident: boolean | undefined,
  position: PositionGroupe | null, nonInscrit: boolean): 'Oui' | 'Non' | '—' {
  if (nonInscrit || !vote) return '—';
  if (dissident) return 'Non';
  return position && vote === position ? 'Oui' : '—';
}

/** Une phrase qui dit comment les groupes ont voté, sans juger : les groupes rangés par leur
 *  position majoritaire (hors non-inscrits). */
export function phraseGroupes(groupes: { sigle: string; non_inscrits?: boolean;
  decompte?: Pick<Chiffres['decompte'], 'pour' | 'contre' | 'abstention'> }[]): string {
  const par: Record<PositionGroupe, string[]> = { pour: [], contre: [], abstention: [] };
  for (const g of groupes) {
    if (g.non_inscrits || !g.decompte) continue;
    const p = positionGroupe(g.decompte);
    if (p) par[p].push(g.sigle);
  }
  const morceaux: string[] = [];
  const liste = (x: string[]) => (x.length > 1 ? `${x.slice(0, -1).join(', ')} et ${x.at(-1)}` : x[0]);
  if (par.pour.length) morceaux.push(`En majorité pour : ${liste(par.pour)}.`);
  if (par.contre.length) morceaux.push(`En majorité contre : ${liste(par.contre)}.`);
  if (par.abstention.length) morceaux.push(`En majorité abstention : ${liste(par.abstention)}.`);
  return morceaux.join(' ');
}
