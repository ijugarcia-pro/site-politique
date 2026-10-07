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
