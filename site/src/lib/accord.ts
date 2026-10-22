// Accord entre les réponses du visiteur et les votes d'un député, calculé dans le navigateur,
// avec la règle du jumeau (lib/profil.ts, décision du 22 oct. 2026) : sur tes N réponses (pour
// ou contre), le député a voté comme toi (identiques), autrement (contraires : vote inverse ou
// abstention), ou n'a pas voté (absents : absent, non-votant ou hors mandat). Une absence n'est
// pas un accord. Les motions de censure ne comptent pas (seuls les « pour » y sont publiés).

export type Reponse = 'pour' | 'contre';

export interface VoteDepute {
  uid: string;
  vote: string;
}

export interface Accord {
  /** Tes réponses, hors motions de censure. */
  n: number;
  identiques: number;
  contraires: number;
  absents: number;
  /** identiques / N en pourcentage arrondi, ou null sans réponse. */
  taux: number | null;
}

export function accord(votes: VoteDepute[], reponses: Record<string, Reponse>,
  censures: Set<string> = new Set()): Accord {
  const siens = new Map(votes.map((v) => [v.uid, v.vote]));
  let n = 0;
  let identiques = 0;
  let contraires = 0;
  for (const [uid, r] of Object.entries(reponses)) {
    if (censures.has(uid)) continue;
    n += 1;
    const v = siens.get(uid);
    if (v === r) identiques += 1;
    else if (v === 'pour' || v === 'contre' || v === 'abstention') contraires += 1;
  }
  return { n, identiques, contraires, absents: n - identiques - contraires,
    taux: n ? Math.round((100 * identiques) / n) : null };
}
