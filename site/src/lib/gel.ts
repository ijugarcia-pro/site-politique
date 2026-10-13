// La série gelée (components/SerieGelee.astro) : le texte, puis le flocon qui se dessine quand
// la carte est à l'écran.
import { quandVisible } from './motion.ts';
import { repriseApres, texteGel } from './seances.ts';

export function montrerGel(n: number, lundi: string): void {
  const carte = document.querySelector<HTMLElement>('[data-serie-gelee]');
  if (!carte || n < 1) return;
  carte.querySelector('[data-serie-gelee-texte]')!.textContent = texteGel(n, repriseApres(lundi));
  carte.hidden = false;
  quandVisible(carte, () => carte.classList.add('joue'));
}
