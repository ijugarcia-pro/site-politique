// Les 12 thèmes des cartes de vote (liste fermée, pipeline/cartes.py) et leur puce : fond et
// encre repris de l'écran Explorer des maquettes V5 (« Par thème »).
export const PUCES_THEMES: Record<string, { fond: string; encre: string }> = {
  Numérique: { fond: '#E8E1FF', encre: '#5B35E6' },
  Droits: { fond: '#FFE1EF', encre: '#B5175A' },
  Travail: { fond: '#E3F6D5', encre: '#3B7F12' },
  Économie: { fond: '#FFF1CC', encre: '#9A5B00' },
  Immigration: { fond: '#DDF1FF', encre: '#0B6AAE' },
  Environnement: { fond: '#D9F7EA', encre: '#0C7F57' },
  Éducation: { fond: '#FFE6DA', encre: '#B83C0A' },
  Institutions: { fond: '#E6E9F0', encre: '#3A4256' },
  Énergie: { fond: '#FFF6C2', encre: '#7A6000' },
  Sécurité: { fond: '#E2E5FF', encre: '#3443B0' },
  Logement: { fond: '#FFE4E0', encre: '#B3261E' },
  Santé: { fond: '#DCF5F7', encre: '#0B6E78' },
};

/** La puce d'un thème, « fond:encre » ; un thème inconnu prend la puce violette. */
export const puceTheme = (theme: string): string => {
  const p = PUCES_THEMES[theme] ?? PUCES_THEMES.Numérique;
  return `${p.fond}:${p.encre}`;
};
