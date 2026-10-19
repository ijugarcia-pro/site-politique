// Le pilote de la salle 3D, seul morceau chargé avec la page (docs/refonte-la-seance.md, § 4) :
// il décide d'ouvrir la 3D, la charge à la demande (import dynamique de three et de la scène) et
// garde les ordres de la page (voyants, caméra, ambiance) jusqu'à ce qu'elle soit prête. Tant
// qu'elle ne l'est pas, ou si elle ne doit pas s'ouvrir, le repli (un hémicycle SVG) reste affiché.

import type { NomVue, Salle3D } from './scene.ts';

export type Raison = 'ok' | 'webgl' | 'economie' | 'memoire' | 'erreur';

/** Ouvrir la 3D ? Pas sans WebGL, ni en mode « économie de données », ni sur un appareil de
 *  moins de 4 Go de mémoire (quand le navigateur le dit). */
export function peutOuvrir(nav: { connection?: { saveData?: boolean }; deviceMemory?: number } = navigator as never,
  webgl: () => boolean = () => {
    try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
  }): Raison {
  if (nav.connection?.saveData) return 'economie';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return 'memoire';
  if (!webgl()) return 'webgl';
  return 'ok';
}

export interface Pilote {
  voyants(couleurs: (string | null)[]): void;
  vue(nom: NomVue, opt?: { instant?: boolean }): void;
  ambiance(nom: 'jour' | 'verdict'): void;
  /** Résolue quand la salle est à l'écran ; null si elle ne s'ouvre pas (le repli reste). */
  prete: Promise<Salle3D | null>;
}

const pilotes = new WeakMap<HTMLElement, Pilote>();

/** `racine` : l'élément [data-salle3d] de components/Salle3D.astro. Un seul pilote par salle :
 *  le composant l'ouvre lui-même, la page récupère le même pour la piloter. */
export function salle3D(racine: HTMLElement): Pilote {
  const deja = pilotes.get(racine);
  if (deja) return deja;
  const pilote = creerPilote(racine);
  pilotes.set(racine, pilote);
  return pilote;
}

function creerPilote(racine: HTMLElement): Pilote {
  const canvas = racine.querySelector<HTMLCanvasElement>('canvas')!;
  const attente: ((s: Salle3D) => void)[] = [];
  let salle: Salle3D | null = null;
  const faire = (f: (s: Salle3D) => void) => { if (salle) f(salle); else attente.push(f); };
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const prete = new Promise<Salle3D | null>((resoudre) => {
    const raison = peutOuvrir();
    racine.dataset.salle3dEtat = raison === 'ok' ? 'attente' : raison;
    if (raison !== 'ok') { resoudre(null); return; }
    // Seulement quand la salle est à l'écran (règle « rien hors écran »).
    const io = new IntersectionObserver(async (entrees) => {
      if (!entrees.some((e) => e.isIntersecting)) return;
      io.disconnect();
      racine.dataset.salle3dEtat = 'chargement';
      try {
        const { creer } = await import('./scene.ts');
        salle = await creer(canvas, { mouvementReduit: reduit });
        for (const f of attente.splice(0)) f(salle);
        racine.dataset.salle3dEtat = 'prete';
        new ResizeObserver(() => salle?.redimensionner()).observe(canvas);
        resoudre(salle);
      } catch (e) {
        console.warn('Salle 3D indisponible, repli 2D :', e);
        racine.dataset.salle3dEtat = 'erreur';
        resoudre(null);
      }
    }, { threshold: 0.1 });
    io.observe(racine);
  });

  // Les puces de caméra : une caméra en cours à la fois (aria-pressed).
  for (const b of racine.querySelectorAll<HTMLButtonElement>('[data-camera]')) {
    b.addEventListener('click', () => {
      for (const x of racine.querySelectorAll('[data-camera]')) x.setAttribute('aria-pressed', String(x === b));
      faire((s) => { void s.vue(b.dataset.camera as NomVue); });
    });
  }
  // Un appui pendant un mouvement de caméra le termine (toute séquence est passable d'un geste).
  canvas.addEventListener('pointerdown', () => salle?.terminer());

  // Le repli (hémicycle SVG) montre les mêmes voyants que la salle, siège par siège.
  const peindreRepli = (couleurs: (string | null)[]) => {
    racine.querySelectorAll<SVGCircleElement>('.repli circle:not(.marque)').forEach((c, i) => {
      c.setAttribute('fill', couleurs[i] ?? '#2A2D33');
    });
  };

  return {
    voyants: (c) => { peindreRepli(c); faire((s) => s.voyants(c)); },
    vue: (nom, opt) => faire((s) => { void s.vue(nom, opt); }),
    ambiance: (nom) => faire((s) => s.ambiance(nom)),
    prete,
  };
}
