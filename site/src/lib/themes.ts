// Les 12 thèmes des cartes de vote (liste fermée, pipeline/cartes.py). Dans la VDEF, un thème
// est une pastille grise comme les autres (VDEF § 7) : aucun thème ne prend une couleur qui
// pourrait le rapprocher d'un groupe ou d'un vote ; chacun a son dossier (/dossiers/{adresse}/).
export const THEMES = ['Numérique', 'Droits', 'Travail', 'Économie', 'Immigration',
  'Environnement', 'Éducation', 'Institutions', 'Énergie', 'Sécurité', 'Logement', 'Santé'] as const;

/** L'adresse du dossier d'un thème : « Économie » → « economie » (/dossiers/economie/). */
export const slugTheme = (theme: string): string =>
  theme.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
