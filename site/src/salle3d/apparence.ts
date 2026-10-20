// Le personnage du visiteur (docs/refonte-la-seance.md, § 5) : formes simples et lisses, 6 teintes
// de peau, 6 coiffures, 5 tenues sobres sans connotation de groupe (gris, anthracite, sable,
// ardoise, écru), aucun genre imposé, pas d'écharpe. Ses choix restent dans le navigateur
// (578e.personnage.v1), comme les réponses. Ce module ne dépend ni de three ni du DOM.

export const CLE_PERSONNAGE = '578e.personnage.v1';

export const PEAUX = [
  { id: 'p1', nom: 'Très claire', c: '#F1D3BC' },
  { id: 'p2', nom: 'Claire', c: '#E0B48F' },
  { id: 'p3', nom: 'Dorée', c: '#C9925F' },
  { id: 'p4', nom: 'Mate', c: '#A86F46' },
  { id: 'p5', nom: 'Brune', c: '#7C4E2F' },
  { id: 'p6', nom: 'Foncée', c: '#4E3020' },
] as const;

export const COIFFURES = [
  { id: 'rasee', nom: 'Rasée' },
  { id: 'courte', nom: 'Courte' },
  { id: 'carre', nom: 'Carré' },
  { id: 'longue', nom: 'Longue' },
  { id: 'boucles', nom: 'Bouclée' },
  { id: 'chignon', nom: 'Chignon' },
] as const;

/** Les tenues : des neutres, aucune couleur de groupe ni de vote. */
export const TENUES = [
  { id: 'gris', nom: 'Gris', haut: '#6B6E73', bas: '#3A3D42' },
  { id: 'anthracite', nom: 'Anthracite', haut: '#34373D', bas: '#202226' },
  { id: 'sable', nom: 'Sable', haut: '#B9A88A', bas: '#5E5546' },
  { id: 'ardoise', nom: 'Ardoise', haut: '#4A5562', bas: '#2B3038' },
  { id: 'ecru', nom: 'Écru', haut: '#E3DCCB', bas: '#6F6A60' },
] as const;

export const CHEVEUX = '#2B2019';

export interface Apparence { peau: string; coiffure: string; tenue: string }

export const APPARENCE_DEFAUT: Apparence = { peau: 'p3', coiffure: 'courte', tenue: 'gris' };

/** Une apparence lue du stockage : chaque choix inconnu reprend la valeur par défaut. */
export function lireApparence(brut: unknown): Apparence {
  const o = (brut && typeof brut === 'object' ? brut : {}) as Partial<Record<keyof Apparence, unknown>>;
  const choisir = (v: unknown, liste: readonly { id: string }[], defaut: string) =>
    (typeof v === 'string' && liste.some((x) => x.id === v) ? v : defaut);
  return {
    peau: choisir(o.peau, PEAUX, APPARENCE_DEFAUT.peau),
    coiffure: choisir(o.coiffure, COIFFURES, APPARENCE_DEFAUT.coiffure),
    tenue: choisir(o.tenue, TENUES, APPARENCE_DEFAUT.tenue),
  };
}

/** Les couleurs à dessiner pour une apparence. */
export function couleursDe(a: Apparence) {
  const t = TENUES.find((x) => x.id === a.tenue) ?? TENUES[0];
  return { peau: (PEAUX.find((x) => x.id === a.peau) ?? PEAUX[2]).c, haut: t.haut, bas: t.bas, cheveux: CHEVEUX };
}

/** Le personnage attend au pied de la tribune tant que la place n'est pas assez sûre. */
export const VOTES_POUR_SIEGER = 10;
