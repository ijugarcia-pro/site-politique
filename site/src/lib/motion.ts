// Socle des animations (docs/animations-lot-1.md, § 0) : mouvement réduit, séquences passables
// d'un geste, démarrage quand l'élément devient visible. Aucune dépendance.

/** Vrai si le visiteur a demandé à réduire les animations. */
export const mouvementReduit = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface Etape { a: number; faire: () => void }

/** Programme des étapes (`a` en ms). `passer()` exécute tout de suite celles qui restent, dans
 *  l'ordre, puis termine les animations du conteneur : on arrive à l'état final. Mouvement
 *  réduit : tout s'exécute immédiatement. */
export function sequence(etapes: Etape[], conteneur: HTMLElement): { passer(): void } {
  const restantes = [...etapes].sort((x, y) => x.a - y.a);
  const minuteurs: ReturnType<typeof setTimeout>[] = [];
  const executer = (e: Etape) => {
    const k = restantes.indexOf(e);
    if (k >= 0) { restantes.splice(k, 1); e.faire(); }
  };
  const passer = () => {
    minuteurs.forEach(clearTimeout);
    restantes.slice().forEach(executer);
    for (const a of conteneur.getAnimations({ subtree: true })) {
      // Une animation infinie ne peut pas « finir » : on l'arrête.
      try { a.finish(); } catch { a.cancel(); }
    }
  };
  if (mouvementReduit()) passer();
  else for (const e of restantes.slice()) minuteurs.push(setTimeout(() => executer(e), e.a));
  return { passer };
}

/** Appelle `fn` une seule fois, quand au moins 30 % de l'élément est visible. */
export function quandVisible(el: Element, fn: () => void): void {
  if (typeof IntersectionObserver !== 'function') { fn(); return; }
  const obs = new IntersectionObserver((entrees) => {
    if (entrees.some((e) => e.isIntersecting)) { obs.disconnect(); fn(); }
  }, { threshold: 0.3 });
  obs.observe(el);
}
