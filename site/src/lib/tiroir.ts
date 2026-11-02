// Le geste du tiroir au téléphone (cadrage MVP, R4, lot 5 ; components/vdef/TiroirMobile.astro) :
// trois crans, replié, moyen, plein. La hauteur vient de l'attribut data-cran de <main> (Base.astro,
// en CSS) : ce module ne fait que le glisser et le changement de cran, sur la poignée seulement,
// pour ne gêner ni le glisser de la salle ni le défilement du contenu. Entrée, Espace ou un appui
// passent au cran suivant. L'état vit en mémoire : rien n'est gardé dans le navigateur. Chargé à la
// demande, seulement dans la disposition téléphone.

export const CRANS = ['replie', 'moyen', 'plein'] as const;
export type Cran = (typeof CRANS)[number];
/** Le déplacement en deçà duquel un appui sur la poignée est un clic. */
const CLIC = 6;

/** Le cran le plus proche d'une hauteur, parmi les hauteurs de chaque cran (pur, testé). */
export function cranProche(hauteur: number, hauteurs: Record<Cran, number>): Cran {
  return CRANS.reduce((m, c) => (Math.abs(hauteurs[c] - hauteur) < Math.abs(hauteurs[m] - hauteur) ? c : m), CRANS[0]);
}

/** Le cran suivant : replié → moyen → plein → replié. */
export const cranSuivant = (c: Cran): Cran => CRANS[(CRANS.indexOf(c) + 1) % CRANS.length];

export function changerCran(main: HTMLElement, c: Cran): void {
  main.dataset.cran = c;
  document.dispatchEvent(new Event('vdef:tiroir'));
}

/** La hauteur de chaque cran dans cette fenêtre : on la lit en posant l'attribut, sans animation. */
function hauteurs(main: HTMLElement): Record<Cran, number> {
  const avant = main.dataset.cran;
  const h = {} as Record<Cran, number>;
  main.classList.add('glisse');
  for (const c of CRANS) { main.dataset.cran = c; h[c] = main.getBoundingClientRect().height; }
  main.dataset.cran = avant;
  return h;
}

/** Branche la poignée de cette page (une fois par page : <main> change à chaque navigation). */
export function brancher(): void {
  const main = document.querySelector<HTMLElement>('.sur-salle');
  const poignee = main?.querySelector<HTMLButtonElement>('[data-tiroir-poignee]');
  if (!main || !poignee || poignee.dataset.branchee) return;
  poignee.dataset.branchee = '1';
  const dire = () => poignee.setAttribute('aria-expanded', String(main.dataset.cran !== 'replie'));
  new MutationObserver(dire).observe(main, { attributes: true, attributeFilter: ['data-cran'] });
  dire();
  let depart: { y: number; h: number; crans: Record<Cran, number> } | null = null;
  let bouge = 0;
  poignee.addEventListener('pointerdown', (e) => {
    depart = { y: e.clientY, h: main.getBoundingClientRect().height, crans: hauteurs(main) };
    bouge = 0;
    try { poignee.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
  });
  poignee.addEventListener('pointermove', (e) => {
    if (!depart) return;
    bouge = Math.max(bouge, Math.abs(e.clientY - depart.y));
    if (bouge < CLIC) return;
    main.style.height = `${Math.min(depart.crans.plein, Math.max(depart.crans.replie, depart.h + depart.y - e.clientY))}px`;
  });
  const lacher = () => {
    if (!depart) return;
    const d = depart;
    depart = null;
    main.classList.remove('glisse');
    if (bouge < CLIC) return;
    const fin = main.getBoundingClientRect().height;
    main.style.height = '';
    changerCran(main, cranProche(fin, d.crans));
  };
  poignee.addEventListener('pointerup', lacher);
  poignee.addEventListener('pointercancel', lacher);
  // Un appui sans déplacement, Entrée ou Espace : le cran suivant.
  poignee.addEventListener('click', () => {
    if (bouge >= CLIC) { bouge = 0; return; }
    changerCran(main, cranSuivant((main.dataset.cran ?? 'moyen') as Cran));
  });
}
