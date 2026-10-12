// Où en est le visiteur dans les lots de votes qui suivent le quiz (data/lots.json) : gardé
// dans son navigateur, comme ses réponses (lib/navigateur.ts). Les premiers lots forment le
// parcours ; les suivants sont facultatifs, pour affiner.
import { lireJSON } from './navigateur.ts';

const CLE = '578e.lots.v1';

/** L'ancre d'un lien « Affiner encore » : lui seul fait démarrer un lot facultatif à l'arrivée
 *  sur /lots/. */
export const ANCRE_AFFINER = '#affiner';

export interface EtatLots {
  /** Les lots terminés (indices à partir de 0). */
  faits: number[];
  /** Le lot en cours et la question en cours dans ce lot, ou null. */
  lot: number | null;
  i: number;
}

export const etatLots = (): EtatLots =>
  ({ faits: [], lot: null, i: 0, ...lireJSON<Partial<EtatLots>>(CLE, {}) });

export function sauverLots(etat: EtatLots): void {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage indisponible */ }
}

/** Le premier lot pas encore terminé, ou null quand les n lots le sont. */
export function prochainLot(faits: number[], n: number): number | null {
  for (let k = 0; k < n; k += 1) if (!faits.includes(k)) return k;
  return null;
}

export interface SuiteLots {
  /** Le prochain lot à proposer (indice à partir de 0), ou null quand tout est fait. */
  lot: number | null;
  /** Ce lot vient après le parcours : il se propose, il ne s'enchaîne jamais seul. */
  facultatif: boolean;
  /** Les lots du parcours qui restent à faire. */
  resteParcours: number;
  /** Les lots facultatifs qui restent à faire. */
  resteFacultatifs: number;
}

/** La suite pour ce visiteur : d'abord les lots du parcours (les `parcours` premiers), puis les
 *  lots facultatifs, jusqu'au dernier des `total` lots. */
export function suiteDesLots(faits: number[], parcours: number, total: number): SuiteLots {
  const lot = prochainLot(faits, total);
  const faitsParcours = faits.filter((k) => k < parcours).length;
  const faitsFacultatifs = faits.filter((k) => k >= parcours && k < total).length;
  return { lot, facultatif: lot !== null && lot >= parcours,
    resteParcours: parcours - faitsParcours,
    resteFacultatifs: total - parcours - faitsFacultatifs };
}
