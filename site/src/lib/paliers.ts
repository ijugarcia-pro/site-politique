// Les paliers et les dossiers par thème (VDEF, docs/design-vdef/VDEF.md § 5 ; décision du 22 oct.
// 2026 « Les paliers ») : on gagne de la curiosité, pas des points. Tout dépend du nombre de votes
// tranchés, jamais du contenu d'une réponse ; aucun point, aucun classement. Module pur : le
// stockage des paliers déjà annoncés est dans lib/navigateur.ts.
import { THEMES } from './themes.ts';

/** Une réponse telle que le site la garde : pour, contre, ou « Je ne sais pas » (null, vide). */
type ReponseLue = string | null | undefined | { v?: string | null };

const tranchee = (r: ReponseLue): boolean => {
  const v = r && typeof r === 'object' ? r.v : r;
  return v === 'pour' || v === 'contre';
};

/** Le nombre de votes tranchés : réponses pour ou contre, sur des votes de la matrice si sa liste
 *  est donnée. Les « Je ne sais pas » ne comptent pas (comme pour la précision). */
export function votesTranches(reponses: Record<string, ReponseLue>,
  votes?: Iterable<string>): number {
  const dans = votes ? new Set(votes) : null;
  return Object.entries(reponses)
    .filter(([uid, r]) => tranchee(r) && (!dans || dans.has(uid))).length;
}

export type IdPalier = 'place' | 'salle-eclairee' | 'bilan';

export interface Palier {
  id: IdPalier;
  seuil: number;
  /** Le rang affiché : « Palier 1 sur 3 ». */
  rang: number;
  libelle: string;
}

export const PALIERS: readonly Palier[] = [
  { id: 'place', seuil: 10, rang: 1, libelle: 'Ta place' },
  { id: 'salle-eclairee', seuil: 25, rang: 2, libelle: 'La salle éclairée' },
  { id: 'bilan', seuil: 40, rang: 3, libelle: 'Ton bilan' },
];

/** Le dernier palier atteint avec n votes tranchés, ou null avant le premier. */
export const palierAtteint = (n: number): Palier | null =>
  [...PALIERS].reverse().find((p) => n >= p.seuil) ?? null;

/** Le prochain palier et les votes qui manquent pour l'atteindre, ou null quand tout est ouvert. */
export function prochainPalier(n: number): { palier: Palier; reste: number } | null {
  const palier = PALIERS.find((p) => n < p.seuil);
  return palier ? { palier, reste: palier.seuil - n } : null;
}

/** Les paliers franchis en passant de `avant` à `apres` votes tranchés. */
export const nouveauxPaliers = (avant: number, apres: number): Palier[] =>
  PALIERS.filter((p) => avant < p.seuil && apres >= p.seuil);

/** Les paliers atteints qui n'ont pas encore été annoncés : chacun s'annonce une seule fois. */
export const paliersAAnnoncer = (n: number, vus: Iterable<string>): Palier[] => {
  const deja = new Set(vus);
  return PALIERS.filter((p) => n >= p.seuil && !deja.has(p.id));
};

/** Le nombre de votes tranchés sur un thème qui ouvre sa synthèse personnelle. */
export const SEUIL_DOSSIER = 3;

/** Une carte de vote, réduite à ce qui sert ici : le scrutin et son thème. */
export interface CarteTheme {
  uid: string;
  theme: string;
}

export interface Dossier {
  theme: string;
  /** Les votes du thème (scrutins qui ont une carte de ce thème), sans doublon. */
  votes: string[];
  tranches: number;
  ouvert: boolean;
  /** Ce qui manque pour l'ouvrir (0 s'il est ouvert). */
  reste: number;
}

/** Les dossiers par thème, dans l'ordre des 12 thèmes des cartes (lib/themes.ts). Un vote n'a de
 *  thème que s'il a une carte (quiz, lots, séances) ; une carte dont le thème est hors de la
 *  liste fermée (anciennes cartes du quiz) n'entre dans aucun dossier. */
export function dossiers(reponses: Record<string, ReponseLue>, cartes: CarteTheme[]): Dossier[] {
  return THEMES.map((theme) => {
    const votes = [...new Set(cartes.filter((c) => c.theme === theme).map((c) => c.uid))];
    const tranches = votes.filter((u) => tranchee(reponses[u])).length;
    return { theme, votes, tranches, ouvert: tranches >= SEUIL_DOSSIER,
      reste: Math.max(0, SEUIL_DOSSIER - tranches) };
  });
}
