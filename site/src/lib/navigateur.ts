// Ce que le site garde dans le navigateur du visiteur, et nulle part ailleurs : ses réponses
// aux votes et le député qu'il a choisi. Les opinions politiques sont des données sensibles
// (RGPD) : rien n'est envoyé à un serveur. Le stockage peut être indisponible (navigation
// privée, données bloquées) : chaque accès est protégé, et le site reste lisible sans lui.

const CLE_REPONSES = '578e.reponses.v1';
const CLE_DEPUTE = '578e.depute.v1';

export type Reponse = 'pour' | 'contre';

interface Enregistrement {
  v: Reponse;
  /** Date de la réponse (ISO). */
  le: string;
}

function lire<T>(cle: string, defaut: T): T {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}

function ecrire(cle: string, valeur: unknown): boolean {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

/** Toutes les réponses du visiteur, par identifiant de scrutin (VTANR…). */
export function reponses(): Record<string, Enregistrement> {
  return lire<Record<string, Enregistrement>>(CLE_REPONSES, {});
}

export const reponse = (uid: string): Reponse | null => reponses()[uid]?.v ?? null;

/** Enregistre (ou efface, avec null) la réponse à un scrutin. Faux si le navigateur refuse. */
export function repondre(uid: string, v: Reponse | null): boolean {
  const toutes = reponses();
  if (v) toutes[uid] = { v, le: new Date().toISOString() };
  else delete toutes[uid];
  return ecrire(CLE_REPONSES, toutes);
}

/** Le député choisi par le visiteur (identifiant PA…), ou null. */
export const deputeChoisi = (): string | null => lire<string | null>(CLE_DEPUTE, null);

export const choisirDepute = (uid: string | null): boolean => ecrire(CLE_DEPUTE, uid);
