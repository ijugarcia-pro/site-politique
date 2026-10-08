// La séance de la semaine, côté visiteur (t24) : ses réponses aux votes pas encore tenus, ses
// pronostics, où il en est, et sa série de semaines. Tout reste dans son navigateur, comme ses
// autres réponses (lib/navigateur.ts).
import { lireJSON, reponse, repondre, type Reponse } from './navigateur.ts';

const CLE = '578e.seances.v1';

export type Pronostic = 'adopte' | 'rejete';

export interface EtatSeance {
  /** Réponse par clé de vote (point de l'ordre du jour, ou `scrutin:{uid}`) ; null : « Je ne
   *  sais pas ». */
  reponses: Record<string, Reponse | null>;
  pronostics: Record<string, Pronostic>;
  /** La question en cours, et si la séance est terminée. */
  i: number;
  fini: boolean;
}

const toutes = (): Record<string, EtatSeance> => lireJSON<Record<string, EtatSeance>>(CLE, {});

export const etatSeance = (lundi: string): EtatSeance =>
  ({ reponses: {}, pronostics: {}, i: 0, fini: false, ...toutes()[lundi] });

export function sauverSeance(lundi: string, etat: EtatSeance): void {
  try {
    localStorage.setItem(CLE, JSON.stringify({ ...toutes(), [lundi]: etat }));
  } catch { /* stockage indisponible */ }
}

/** Les lundis des séances terminées. */
export const seancesFaites = (): Set<string> =>
  new Set(Object.entries(toutes()).filter(([, e]) => e.fini).map(([l]) => l));

const lundiAvant = (lundi: string) => {
  const d = new Date(`${lundi}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
};

/** La série : les semaines d'affilée où la séance a été faite, en remontant depuis la semaine
 *  en cours (si elle n'est pas encore faite, on part de la précédente). Une semaine de vacances
 *  parlementaires ne compte pas et ne casse pas la série : elle est gelée. */
export function serie(faites: Set<string>, vacances: Set<string>, lundi: string): number {
  let n = 0;
  let l = faites.has(lundi) ? lundi : lundiAvant(lundi);
  for (let k = 0; k < 260; k += 1, l = lundiAvant(l)) {
    if (vacances.has(l)) continue;
    if (!faites.has(l)) break;
    n += 1;
  }
  return n;
}

/** Une fois le vote tenu, la réponse donnée avant le vote rejoint les autres réponses (et
 *  compte dans l'hémicycle). `tranches` : par lundi, la clé du vote et son scrutin. */
export function reporterReponses(tranches: Record<string, Record<string, string>>): number {
  let n = 0;
  const etats = toutes();
  for (const [lundi, votes] of Object.entries(tranches)) {
    for (const [cle, uid] of Object.entries(votes)) {
      const v = etats[lundi]?.reponses[cle];
      if (v && !reponse(uid)) {
        repondre(uid, v);
        n += 1;
      }
    }
  }
  return n;
}
