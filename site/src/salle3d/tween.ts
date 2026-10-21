// Une interpolation pour les mouvements de caméra, sans GSAP (docs/refonte-la-seance.md, § 10,
// recommandation 1) : power2.inOut sur une durée donnée, passable d'un geste (`finir`), coupée
// en mouvement réduit par l'appelant. Pas de dépendance au DOM au-delà de requestAnimationFrame.

/** power2.inOut de GSAP : (2t)²/2 puis 1 − (2 − 2t)²/2. */
export const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - ((2 - 2 * t) ** 2) / 2);

export interface Tween { finir(): void; arreter(): void; fini: Promise<void> }

/** Appelle `pas(e)` à chaque image, e allant de 0 à 1 selon power2.inOut, pendant `duree` ms. */
export function interpoler(duree: number, pas: (e: number) => void,
  horloge: { maintenant(): number; image(f: () => void): void } = {
    maintenant: () => performance.now(), image: (f) => { requestAnimationFrame(f); },
  }): Tween {
  const debut = horloge.maintenant();
  let arrete = false;
  let resoudre: () => void = () => {};
  const fini = new Promise<void>((r) => { resoudre = r; });
  const terminer = () => { if (arrete) return; arrete = true; pas(1); resoudre(); };
  const image = () => {
    if (arrete) return;
    const t = Math.min(1, (horloge.maintenant() - debut) / duree);
    if (t >= 1) { terminer(); return; }
    pas(power2InOut(t));
    horloge.image(image);
  };
  horloge.image(image);
  return { finir: terminer, arreter: () => { arrete = true; resoudre(); }, fini };
}
