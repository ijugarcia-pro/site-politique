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

/** Les trêves parlementaires et leur reprise (« le lundi 4 janvier »), en attendant de les lire
 *  dans l'agenda : `du` et `au` sont des lundis. Vide tant que les dates ne sont pas confirmées :
 *  la série gelée dit alors « pour la reprise », sans date. */
export const TREVES: { du: string; au: string; reprise: string }[] = [];

/** La reprise annoncée pour la semaine du `lundi`, s'il tombe dans une trêve connue. */
export const repriseApres = (lundi: string, treves = TREVES) =>
  treves.find((t) => t.du <= lundi && lundi <= t.au)?.reprise ?? null;

/** Le texte de la série gelée : elle attend, elle ne se perd pas. */
export const texteGel = (n: number, reprise: string | null) =>
  `Ta série de ${n} semaine${n > 1 ? 's' : ''} est gelée : elle t'attend pour la reprise${reprise ? `, ${reprise}` : ''}.`;

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.',
  'oct.', 'nov.', 'déc.'];

/** Quand les députés votent, en court : « mardi 13 oct., 15 h » (heure de Paris, celle de
 *  l'agenda ; `debut` : « 2026-10-13 15:00:00+02 »). */
export function quandCourt(date: string, debut: string | null): string {
  const jour = JOURS[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const texte = `${jour} ${Number(date.slice(8, 10))} ${MOIS_COURTS[Number(date.slice(5, 7)) - 1]}`;
  if (!debut) return texte;
  const [h, m] = debut.slice(11, 16).split(':');
  return `${texte}, ${Number(h)} h${m !== '00' ? ` ${m}` : ''}`;
}

/** Un vote de la séance, vu du verdict : jugé quand son scrutin est publié. */
export interface VoteJuge { juge: boolean; date: string; debut: string | null }

export interface Avancement {
  total: number;
  juges: number;
  /** aucun : pas encore de verdict ; partiel : la séance n'est tranchée qu'en partie ;
   *  complet : tous ses votes sont jugés. */
  etat: 'aucun' | 'partiel' | 'complet';
  /** « 1/3 ». */
  fraction: string;
  /** Le bandeau du verdict partiel : « 1 vote sur 3 jugé · les 2 autres : mardi 13 oct.,
   *  15 h » ; null si la séance n'est pas tranchée en partie. */
  bandeau: string | null;
}

/** Où en est le verdict d'une séance (ses votes retirés de l'agenda ne comptent pas). Tant
 *  qu'elle n'est tranchée qu'en partie, le verdict, l'accueil et la fin de séance le disent. */
export function avancement(votes: VoteJuge[]): Avancement {
  const total = votes.length;
  const juges = votes.filter((v) => v.juge).length;
  const etat = juges === 0 ? 'aucun' : juges < total ? 'partiel' : 'complet';
  let bandeau: string | null = null;
  if (etat === 'partiel') {
    const reste = total - juges;
    const quand = [...new Set(votes.filter((v) => !v.juge).map((v) => quandCourt(v.date, v.debut)))];
    bandeau = `${juges} vote${juges > 1 ? 's' : ''} sur ${total} jugé${juges > 1 ? 's' : ''} · `
      + `${reste > 1 ? `les ${reste} autres` : 'le dernier'} : ${quand.join(' et ')}`;
  }
  return { total, juges, etat, fraction: `${juges}/${total}`, bandeau };
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
