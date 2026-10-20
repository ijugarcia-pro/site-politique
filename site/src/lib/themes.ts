// Les 12 thèmes des cartes de vote (liste fermée, pipeline/cartes.py) et leur puce. Charte « La
// Séance » (docs/refonte-la-seance.md, lot 6) : le thème est une étiquette de régie, la même pour
// les 12 (rouge de régie, texte blanc, 6,9:1), comme dans les maquettes V6C ; aucun thème ne
// prend une couleur qui pourrait le rapprocher d'un groupe ou d'un vote.
const ETIQUETTE = { fond: '#B3132F', encre: '#FFFFFF' };
export const PUCES_THEMES: Record<string, { fond: string; encre: string }> = Object.fromEntries(
  ['Numérique', 'Droits', 'Travail', 'Économie', 'Immigration', 'Environnement', 'Éducation',
    'Institutions', 'Énergie', 'Sécurité', 'Logement', 'Santé'].map((t) => [t, ETIQUETTE]));

/** La puce d'un thème, « fond:encre » ; un thème inconnu prend la même étiquette. */
export const puceTheme = (theme: string): string => {
  const p = PUCES_THEMES[theme] ?? ETIQUETTE;
  return `${p.fond}:${p.encre}`;
};
