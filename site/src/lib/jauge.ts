// La jauge de précision (components/JaugePrecision.astro) : de l'ancienne à la nouvelle valeur,
// quand elle est à l'écran. Mouvement réduit : valeur finale tout de suite.
import { mouvementReduit, quandVisible } from './motion.ts';
import { VOTES_FIABLES } from './profil.ts';

/** La précision en pourcentage arrondi, après n votes tranchés : 1 − e^(−n/20). */
export const pourcent = (n: number) => Math.round((1 - Math.exp(-n / 20)) * 100);

/** La pastille « Fiable » ne s'anime qu'au vote qui fait passer le seuil (24 → 25). */
export const franchit = (avant: number, apres: number) => avant < VOTES_FIABLES && apres >= VOTES_FIABLES;

/** Montre la jauge passant de `avant` à `apres` votes tranchés, après `delai` ms. */
export function jauge(el: HTMLElement, avant: number, apres: number, delai = 0): void {
  const [a, b] = [pourcent(avant), pourcent(apres)];
  const jeton = String(Number(el.dataset.jeton ?? 0) + 1);
  el.dataset.jeton = jeton;
  el.setAttribute('aria-valuenow', String(b));
  el.setAttribute('aria-valuetext', `${b} %`);
  const pct = el.querySelector<HTMLElement>('[data-jauge-pct]')!;
  const plein = el.querySelector<HTMLElement>('[data-jauge-plein]')!;
  const fiable = el.querySelector<HTMLElement>('[data-jauge-fiable]')!;
  // État de départ, puis animation quand la jauge est visible (une seule à la fois).
  plein.getAnimations().forEach((x) => x.cancel());
  plein.style.transform = `scaleX(${a / 100})`;
  pct.classList.remove('compte');
  pct.style.setProperty('--from', String(a));
  pct.style.setProperty('--to', String(b));
  pct.style.setProperty('--delay', `${delai}ms`);
  pct.textContent = `${a}`;
  fiable.classList.remove('apparait');
  fiable.hidden = avant < VOTES_FIABLES;
  const final = () => {
    plein.style.transform = `scaleX(${b / 100})`;
    pct.textContent = '';
    pct.classList.add('compte');
    fiable.hidden = apres < VOTES_FIABLES;
  };
  if (mouvementReduit()) { final(); return; }
  quandVisible(el, () => {
    if (el.dataset.jeton !== jeton) return;
    final();
    plein.animate([{ transform: `scaleX(${a / 100})` }, { transform: `scaleX(${b / 100})` }],
      { duration: 600, delay: delai, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    if (franchit(avant, apres)) {
      fiable.style.animationDelay = `${delai + 500}ms`;
      fiable.classList.add('apparait');
    }
  });
}
