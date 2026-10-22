// Le pilote de la salle 3D, seul morceau chargé avec la page : il décide d'ouvrir la 3D, la charge
// à la demande (import dynamique de three et de la scène) et garde les ordres de la page (voyants,
// vue, cadre des feuilles, repères) jusqu'à ce qu'elle soit prête. Tant qu'elle ne l'est pas, ou
// si elle ne doit pas s'ouvrir, le repli reste affiché (image fixe de la vue, ou hémicycle SVG).
// Il porte aussi les gestes (VDEF, lot V3) : glisser pour tourner (pointeur capturé, amortissement,
// petite inertie ; ni l'un ni l'autre en mouvement réduit), pincer ou Ctrl + molette pour zoomer,
// double clic ou Échap pour revenir ; au clavier, flèches, + et −, Échap. La molette seule fait
// défiler la page. Un clic sur un siège le donne à la page (son député) ; un anneau blanc marque
// le siège survolé et le siège choisi (maquette 09).

import type { Apparence } from './apparence.ts';
import type { Cadre, NomVue, Salle3D } from './scene.ts';

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

/** Le glisser : la part de l'écart rattrapée à chaque image, la durée de l'inertie au lâcher, et
 *  le déplacement en deçà duquel un appui est un clic. */
export const GLISSER = { rattrapage: 0.15, inertie: 400, clic: 6 } as const;

/** Une image de l'amortissement : la part de l'écart restant appliquée maintenant. */
export function amortir(reste: number, rattrapage: number = GLISSER.rattrapage): { pas: number; reste: number } {
  const pas = Math.abs(reste) < 1e-4 ? reste : reste * rattrapage;
  return { pas, reste: reste - pas };
}

/** L'inertie au lâcher : la vitesse (par ms) qui reste après t ms, nulle au-delà de la durée. */
export const vitesseInertie = (v: number, t: number, duree: number = GLISSER.inertie) =>
  (t >= duree ? 0 : v * (1 - t / duree));

export interface RepereSalle {
  /** Le siège (index de la composition) ; -1 : le 578e fauteuil. */
  i: number;
  libelle: string;
  /** Toi : noir à anneau blanc ; les autres (jumeau, opposé, ton député) : blancs. */
  toi?: boolean;
}

export interface Pilote {
  voyants(couleurs: (string | null)[]): void;
  /** Les voyants en onde (verdict) ; en mouvement réduit, d'un coup. */
  onde(couleurs: (string | null)[], duree?: number): void;
  vue(nom: NomVue, opt?: { instant?: boolean }): void;
  /** Ce que les feuilles couvrent : la vue se centre sur le reste. */
  cadre(c: Cadre): void;
  ambiance(nom: 'jour' | 'verdict'): void;
  jumeau(i: number | null): void;
  /** Un repère au-dessus d'un siège (ancien gabarit) ; null : aucun. */
  repere(i: number | null, texte?: string): void;
  /** Les repères de la VDEF, plusieurs à la fois ; cachés quand ils sortent du cadre. */
  reperes(liste: RepereSalle[]): void;
  /** Le siège touché (clic, toucher) et le siège survolé (null en sortant) ; sans gestionnaire,
   *  les sièges ne réagissent pas. */
  surSiege(touche: ((i: number) => void) | null, survol?: (i: number | null) => void): void;
  /** Le siège choisi (sa carte est ouverte), marqué d'un anneau ; null : aucun. */
  selection(i: number | null): void;
  /** Le personnage du visiteur, et sa place (null : au pied de la tribune). */
  personnage(a: Apparence | null): void;
  asseoir(i: number | null, opt?: { marcher?: boolean }): void;
  /** Montrer ou cacher une puce de caméra (ancien gabarit). */
  camera(nom: NomVue, disponible: boolean): void;
  /** Résolue quand la salle est à l'écran ; null si elle ne s'ouvre pas (le repli reste). */
  prete: Promise<Salle3D | null>;
}

const pilotes = new WeakMap<HTMLElement, Pilote>();

/** L'anneau blanc posé sur un siège (survolé ou choisi), dans le calque des repères. */
function anneau(calque: HTMLElement | null, sorte: string): HTMLElement | null {
  if (!calque) return null;
  const el = document.createElement('span');
  el.className = `anneau-siege ${sorte}`;
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
  calque.append(el);
  return el;
}

/** `racine` : l'élément [data-salle3d] (components/vdef/Salle.astro, ou l'ancien Salle3D.astro).
 *  Un seul pilote par salle : le composant l'ouvre lui-même, la page récupère le même. */
export function salle3D(racine: HTMLElement): Pilote {
  const deja = pilotes.get(racine);
  if (deja) return deja;
  const pilote = creerPilote(racine);
  pilotes.set(racine, pilote);
  return pilote;
}

function creerPilote(racine: HTMLElement): Pilote {
  const canvas = racine.querySelector<HTMLCanvasElement>('canvas')!;
  const ecran = racine.querySelector<HTMLElement>('.ecran') ?? racine;
  const marque = racine.querySelector<HTMLElement>('.repere');
  const calque = racine.querySelector<HTMLElement>('[data-reperes]');
  const attente: ((s: Salle3D) => void)[] = [];
  let salle: Salle3D | null = null;
  let repere: { i: number; texte: string } | null = null;
  let liste: { r: RepereSalle; el: HTMLElement }[] = [];
  let toucheSiege: ((i: number) => void) | null = null;
  let survole: number | null = null;
  let choisi: number | null = null;
  const anneaux = { survol: anneau(calque, 'survol'), choisi: anneau(calque, 'choisi') };
  let survolSiege: ((i: number | null) => void) | null = null;
  const faire = (f: (s: Salle3D) => void) => { if (salle) f(salle); else attente.push(f); };
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Les repères suivent leur siège à chaque image (la caméra bouge) ; cachés hors du cadre.
  const dansLeCadre = (p: { x: number; y: number; devant: boolean }) =>
    p.devant && p.x > 0.02 && p.x < 0.98 && p.y > 0.04 && p.y < 0.96;
  const placerReperes = () => {
    if (marque) {
      if (!salle || !repere) marque.hidden = true;
      else {
        const [p] = salle.projeter([salle.positionSiege(repere.i, 1.05)]);
        marque.hidden = !dansLeCadre(p);
        marque.style.left = `${(100 * p.x).toFixed(2)}%`;
        marque.style.top = `${(100 * p.y).toFixed(2)}%`;
        marque.classList.toggle('a-gauche', p.x < 0.3);
        marque.classList.toggle('a-droite', p.x > 0.7);
      }
    }
    if (!salle) return;
    const points = salle.projeter(liste.map(({ r }) => salle!.positionSiege(r.i, 1.05)));
    liste.forEach(({ el }, k) => poser(el, points[k]));
    for (const [cle, i] of [['survol', survole], ['choisi', choisi]] as const) {
      const el = anneaux[cle];
      if (!el) continue;
      if (i === null || (cle === 'survol' && i === choisi)) { el.hidden = true; continue; }
      poser(el, salle.projeter([salle.positionSiege(i, 0.55)])[0]);
    }
  };
  const poser = (el: HTMLElement, p: { x: number; y: number; devant: boolean }) => {
    el.hidden = !dansLeCadre(p);
    el.style.left = `${(100 * p.x).toFixed(2)}%`;
    el.style.top = `${(100 * p.y).toFixed(2)}%`;
    // Près d'un bord, l'étiquette s'ancre sur le côté pour rester dans le cadre.
    el.classList.toggle('a-gauche', p.x < 0.15);
    el.classList.toggle('a-droite', p.x > 0.85);
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
        salle.surRendu = placerReperes;
        for (const f of attente.splice(0)) f(salle);
        racine.dataset.salle3dEtat = 'prete';
        new ResizeObserver(() => salle?.redimensionner()).observe(canvas);
        resoudre(salle);
      } catch (e) {
        console.warn('Salle 3D indisponible, repli :', e);
        racine.dataset.salle3dEtat = 'erreur';
        resoudre(null);
      }
    }, { threshold: 0.1 });
    io.observe(racine);
  });

  // Les puces de caméra de l'ancien gabarit : une caméra en cours à la fois (aria-pressed).
  for (const b of racine.querySelectorAll<HTMLButtonElement>('[data-camera]')) {
    b.addEventListener('click', () => {
      for (const x of racine.querySelectorAll('[data-camera]')) x.setAttribute('aria-pressed', String(x === b));
      faire((s) => { void s.vue(b.dataset.camera as NomVue); });
    });
  }

  // Le glisser, amorti : l'écart demandé est rattrapé par images ; au lâcher, une petite inertie.
  const ecart = { lacet: 0, tangage: 0 };
  let inertie: { lacet: number; tangage: number; debut: number } | null = null;
  let boucle = false;
  const tourner = (dLacet: number, dTangage: number) => {
    if (!salle) return;
    if (reduit) { salle.orbiter(dLacet, dTangage); return; }
    ecart.lacet += dLacet; ecart.tangage += dTangage;
    lancer();
  };
  let derniere = 0;
  const image = (t: number) => {
    boucle = false;
    if (!salle) return;
    const dt = derniere ? Math.min(50, t - derniere) : 16;
    derniere = t;
    if (inertie) {
      const ecoule = t - inertie.debut;
      const vl = vitesseInertie(inertie.lacet, ecoule), vt = vitesseInertie(inertie.tangage, ecoule);
      if (vl === 0 && vt === 0) inertie = null;
      else { ecart.lacet += vl * dt; ecart.tangage += vt * dt; }
    }
    const l = amortir(ecart.lacet), g = amortir(ecart.tangage);
    ecart.lacet = l.reste; ecart.tangage = g.reste;
    if (l.pas || g.pas) salle.orbiter(l.pas, g.pas);
    if (ecart.lacet || ecart.tangage || inertie) lancer(); else derniere = 0;
  };
  const lancer = () => { if (!boucle) { boucle = true; requestAnimationFrame(image); } };
  const arreter = () => { ecart.lacet = 0; ecart.tangage = 0; inertie = null; };

  // Les pointeurs : un doigt ou la souris tourne, deux doigts zooment ; un appui court est un clic.
  const pointeurs = new Map<number, { x: number; y: number }>();
  let appui: { x: number; y: number; t: number; bouge: number } | null = null;
  let vitesse = { lacet: 0, tangage: 0, t: 0 };
  let ecart0 = 0;
  const point = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / Math.max(1, r.width), y: (e.clientY - r.top) / Math.max(1, r.height) };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    salle?.terminer();
    arreter();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    appui = pointeurs.size === 1 ? { x: e.clientX, y: e.clientY, t: e.timeStamp, bouge: 0 } : null;
    vitesse = { lacet: 0, tangage: 0, t: performance.now() };
    racine.classList.add('saisie');
    if (pointeurs.size === 2) { const [a, b] = [...pointeurs.values()]; ecart0 = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  let survolPrevu = false;
  let dernierSurvol: PointerEvent | null = null;
  canvas.addEventListener('pointermove', (e) => {
    const avant = pointeurs.get(e.pointerId);
    if (!avant) {
      // Le survol (souris seulement) : le siège sous le pointeur, une fois par image.
      if (e.pointerType !== 'mouse' || !survolSiege || !salle) return;
      dernierSurvol = e;
      if (survolPrevu) return;
      survolPrevu = true;
      requestAnimationFrame(() => {
        survolPrevu = false;
        if (!salle || !dernierSurvol || !survolSiege) return;
        const p = point(dernierSurvol);
        const i = salle.vueCourante === 'salle' ? salle.siegeSous(p.x, p.y) : null;
        if (i === survole) return;
        survole = i;
        placerReperes();
        racine.classList.toggle('sur-siege', i !== null);
        survolSiege(i);
      });
      return;
    }
    if (!salle) return;
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size === 2) {
      const [a, b] = [...pointeurs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (ecart0 > 0 && d > 0) salle.zoomer(ecart0 / d);
      ecart0 = d;
      return;
    }
    if (appui) appui.bouge += Math.hypot(e.clientX - avant.x, e.clientY - avant.y);
    const l = canvas.clientWidth || 1;
    // Au doigt, seul le glissé horizontal tourne : le glissé vertical fait défiler la page.
    const dLacet = (-1.2 * (e.clientX - avant.x)) / l;
    const dTangage = e.pointerType === 'touch' ? 0 : (0.8 * (e.clientY - avant.y)) / l;
    const t = performance.now(), dt = Math.max(1, t - vitesse.t);
    vitesse = { lacet: dLacet / dt, tangage: dTangage / dt, t };
    tourner(dLacet, dTangage);
  });
  const relacher = (e: PointerEvent, annule = false) => {
    if (!pointeurs.has(e.pointerId)) return;
    pointeurs.delete(e.pointerId);
    ecart0 = 0;
    if (pointeurs.size) return;
    racine.classList.remove('saisie');
    const a = appui;
    appui = null;
    if (!a || annule) return;
    // La durée de l'appui se lit sur l'horodatage des événements : une page chargée ne change
    // pas un clic en glisser.
    const clic = a.bouge < GLISSER.clic && e.timeStamp - a.t < 500;
    if (clic) {
      if (toucheSiege && salle && salle.vueCourante === 'salle') {
        const p = point(e);
        const i = salle.siegeSous(p.x, p.y);
        if (i !== null) toucheSiege(i);
      }
      return;
    }
    // L'inertie part de la vitesse du dernier mouvement (s'il est récent).
    if (!reduit && performance.now() - vitesse.t < 80) {
      inertie = { lacet: vitesse.lacet, tangage: vitesse.tangage, debut: performance.now() };
      lancer();
    }
  };
  canvas.addEventListener('pointerup', (e) => relacher(e));
  canvas.addEventListener('pointercancel', (e) => relacher(e, true));
  canvas.addEventListener('pointerleave', () => {
    if (pointeurs.size || !survolSiege) return;
    survole = null;
    placerReperes();
    racine.classList.remove('sur-siege');
    survolSiege(null);
  });
  canvas.addEventListener('dblclick', () => { arreter(); salle?.recentrer(); });
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
    arreter();
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
      racine.dataset.vue = nom;
      for (const x of racine.querySelectorAll<HTMLElement>('[data-camera]')) x.setAttribute('aria-pressed', String(x.dataset.camera === nom));
      arreter();
      faire((s) => { void s.vue(nom, opt); });
    },
    cadre: (c) => faire((s) => s.cadre(c)),
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
      if (marque) marque.querySelector('span')!.textContent = texte;
      if (salle) placerReperes(); else if (marque) marque.hidden = true;
    },
    reperes: (nouveaux) => {
      if (!calque) return;
      for (const { el } of liste) el.remove();
      liste = nouveaux.map((r) => {
        const el = document.createElement('span');
        el.className = `repere-salle${r.toi ? ' toi' : ''}`;
        el.hidden = true;
        const pt = document.createElement('span');
        pt.className = 'repere-point';
        pt.setAttribute('aria-hidden', 'true');
        const lib = document.createElement('span');
        lib.className = 'repere-libelle';
        lib.textContent = r.libelle;
        el.append(pt, lib);
        calque.append(el);
        return { r, el };
      });
      if (salle) placerReperes();
    },
    surSiege: (touche, survol) => {
      toucheSiege = touche;
      survolSiege = touche ? (survol ?? (() => {})) : null;
      racine.classList.toggle('sieges-actifs', !!touche);
      if (!touche) { survole = null; choisi = null; placerReperes(); racine.classList.remove('sur-siege'); }
    },
    selection: (i) => { choisi = i; placerReperes(); },
    prete,
  };
}
