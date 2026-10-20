// Le pilote de la salle 3D, seul morceau chargé avec la page (docs/refonte-la-seance.md, § 4) :
// il décide d'ouvrir la 3D, la charge à la demande (import dynamique de three et de la scène) et
// garde les ordres de la page (voyants, caméra, ambiance, repère) jusqu'à ce qu'elle soit prête.
// Tant qu'elle ne l'est pas, ou si elle ne doit pas s'ouvrir, le repli (un hémicycle SVG) reste
// affiché, avec les mêmes voyants. Il porte aussi la caméra libre : glisser pour tourner,
// pincer (ou Ctrl + molette) pour zoomer, double appui pour revenir ; au clavier, flèches, + et −,
// Échap.

import type { Apparence } from './apparence.ts';
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

/** Le pas de la caméra libre au clavier : un vingtième de tour, un dixième de recul. */
export const PAS_CLAVIER = { lacet: Math.PI / 20, tangage: Math.PI / 40, zoom: 1.1 };

/** La touche → le geste de caméra (null : la touche n'est pas pour la salle). */
export function geste(touche: string): { lacet?: number; tangage?: number; zoom?: number; recentrer?: true } | null {
  switch (touche) {
    case 'ArrowLeft': return { lacet: -PAS_CLAVIER.lacet };
    case 'ArrowRight': return { lacet: PAS_CLAVIER.lacet };
    case 'ArrowUp': return { tangage: PAS_CLAVIER.tangage };
    case 'ArrowDown': return { tangage: -PAS_CLAVIER.tangage };
    case '+': case '=': return { zoom: 1 / PAS_CLAVIER.zoom };
    case '-': case '_': return { zoom: PAS_CLAVIER.zoom };
    case 'Escape': case '0': return { recentrer: true };
    default: return null;
  }
}

export interface Pilote {
  voyants(couleurs: (string | null)[]): void;
  /** Les voyants en onde (verdict) ; en mouvement réduit, d'un coup. */
  onde(couleurs: (string | null)[], duree?: number): void;
  vue(nom: NomVue, opt?: { instant?: boolean }): void;
  ambiance(nom: 'jour' | 'verdict'): void;
  jumeau(i: number | null): void;
  /** Un repère posé sur la salle, au-dessus d'un siège ; null : aucun. */
  repere(i: number | null, texte?: string): void;
  /** Le personnage du visiteur, et sa place (null : au pied de la tribune). */
  personnage(a: Apparence | null): void;
  asseoir(i: number | null, opt?: { marcher?: boolean }): void;
  /** Montrer ou cacher une puce de caméra (CAM 3 n'existe qu'avec une place). */
  camera(nom: NomVue, disponible: boolean): void;
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
  const ecran = racine.querySelector<HTMLElement>('.ecran')!;
  const marque = racine.querySelector<HTMLElement>('.repere')!;
  const attente: ((s: Salle3D) => void)[] = [];
  let salle: Salle3D | null = null;
  let repere: { i: number; texte: string } | null = null;
  const faire = (f: (s: Salle3D) => void) => { if (salle) f(salle); else attente.push(f); };
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Le repère suit le siège à chaque image (la caméra bouge) ; caché s'il sort du cadre.
  const placerRepere = () => {
    if (!salle || !repere) { marque.hidden = true; return; }
    const [p] = salle.projeter([salle.positionSiege(repere.i, 1.05)]);
    const dedans = p.devant && p.x > 0.02 && p.x < 0.98 && p.y > 0.04 && p.y < 0.96;
    marque.hidden = !dedans;
    marque.style.left = `${(100 * p.x).toFixed(2)}%`;
    marque.style.top = `${(100 * p.y).toFixed(2)}%`;
    marque.classList.toggle('a-gauche', p.x < 0.3);
    marque.classList.toggle('a-droite', p.x > 0.7);
  };

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
        salle.surRendu = placerRepere;
        // Sur téléphone, Mon hémicycle s'ouvre sur le plan (maquette V6C-06).
        if (racine.classList.contains('plan-telephone') && innerWidth < 640) {
          await salle.vue('plan', { instant: true });
          for (const x of racine.querySelectorAll<HTMLElement>('[data-camera]')) {
            x.setAttribute('aria-pressed', String(x.dataset.camera === 'plan'));
          }
        }
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

  // La caméra libre. Un appui termine d'abord un mouvement en cours (toute séquence est passable).
  const pointeurs = new Map<number, { x: number; y: number }>();
  let ecart0 = 0;
  canvas.addEventListener('pointerdown', (e) => {
    salle?.terminer();
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size === 2) { const [a, b] = [...pointeurs.values()]; ecart0 = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener('pointermove', (e) => {
    const avant = pointeurs.get(e.pointerId);
    if (!avant || !salle) return;
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size === 2) {
      const [a, b] = [...pointeurs.values()];
      const ecart = Math.hypot(a.x - b.x, a.y - b.y);
      if (ecart0 > 0 && ecart > 0) salle.zoomer(ecart0 / ecart);
      ecart0 = ecart;
      return;
    }
    const l = canvas.clientWidth || 1;
    // Au doigt, seul le glissé horizontal tourne : le glissé vertical fait défiler la page.
    salle.orbiter((-1.2 * (e.clientX - avant.x)) / l, e.pointerType === 'touch' ? 0 : (0.8 * (e.clientY - avant.y)) / l);
  });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) {
    canvas.addEventListener(t, (e) => { pointeurs.delete((e as PointerEvent).pointerId); ecart0 = 0; });
  }
  canvas.addEventListener('dblclick', () => salle?.recentrer());
  canvas.addEventListener('wheel', (e) => {
    // La molette fait défiler la page ; Ctrl + molette (et le pincement du pavé tactile) zoome.
    if (!e.ctrlKey || !salle) return;
    e.preventDefault();
    salle.zoomer(Math.exp(e.deltaY * 0.002));
  }, { passive: false });
  ecran.addEventListener('keydown', (e) => {
    if (e.target !== ecran || !salle) return;
    const g = geste(e.key);
    if (!g) return;
    e.preventDefault();
    if (g.recentrer) salle.recentrer();
    else if (g.zoom) salle.zoomer(g.zoom);
    else salle.orbiter(g.lacet ?? 0, g.tangage ?? 0);
  });

  // Le repli (hémicycle SVG) montre les mêmes voyants que la salle, siège par siège.
  const peindreRepli = (couleurs: (string | null)[]) => {
    racine.querySelectorAll<SVGCircleElement>('.repli circle:not(.marque)').forEach((c, i) => {
      c.setAttribute('fill', couleurs[i] ?? '#2A2D33');
    });
  };

  return {
    voyants: (c) => { peindreRepli(c); faire((s) => s.voyants(c)); },
    onde: (c, duree) => { peindreRepli(c); faire((s) => { void s.voyantsEnOnde(c, duree); }); },
    vue: (nom, opt) => {
      for (const x of racine.querySelectorAll<HTMLElement>('[data-camera]')) x.setAttribute('aria-pressed', String(x.dataset.camera === nom));
      faire((s) => { void s.vue(nom, opt); });
    },
    ambiance: (nom) => faire((s) => s.ambiance(nom)),
    jumeau: (i) => faire((s) => s.jumeau(i)),
    personnage: (a) => faire((s) => s.personnage(a)),
    asseoir: (i, opt) => faire((s) => { void s.asseoir(i, opt); }),
    camera: (nom, disponible) => {
      const b = racine.querySelector<HTMLElement>(`[data-camera="${nom}"]`);
      if (b) b.hidden = !disponible;
    },
    repere: (i, texte = '') => {
      repere = i === null ? null : { i, texte };
      marque.querySelector('span')!.textContent = texte;
      if (salle) placerRepere(); else marque.hidden = true;
    },
    prete,
  };
}
