// Accord entre les réponses du visiteur et les votes d'un député, calculé dans le navigateur.
// Un vote compte « en commun » quand le visiteur a répondu (pour ou contre) et que le député a
// pris position (pour, contre ou abstention) ; ils sont d'accord quand les deux réponses sont
// identiques. Les motions de censure ne comptent pas (seuls les « pour » y sont publiés).
// Pas de lissage ici : c'est un taux brut, affiché avec son nombre de votes. Le lissage
// (m + 2) / (n + 4) sert au classement du jumeau (t21).

export type Reponse = 'pour' | 'contre';

export interface VoteDepute {
  uid: string;
  vote: string;
}

export interface Accord {
  communs: number;
  identiques: number;
  /** En pourcentage arrondi, ou null sans vote en commun. */
  taux: number | null;
}

const PRISES_DE_POSITION = new Set(['pour', 'contre', 'abstention']);

export function accord(votes: VoteDepute[], reponses: Record<string, Reponse>,
  censures: Set<string> = new Set()): Accord {
  let communs = 0;
  let identiques = 0;
  for (const v of votes) {
    const r = reponses[v.uid];
    if (!r || censures.has(v.uid) || !PRISES_DE_POSITION.has(v.vote)) continue;
    communs += 1;
    if (v.vote === r) identiques += 1;
  }
  return { communs, identiques, taux: communs ? Math.round((100 * identiques) / communs) : null };
}
