// Où en est le visiteur dans les 5 lots de votes qui suivent le quiz (data/lots.json) : gardé
// dans son navigateur, comme ses réponses (lib/navigateur.ts).
import { lireJSON } from './navigateur.ts';

const CLE = '578e.lots.v1';

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
