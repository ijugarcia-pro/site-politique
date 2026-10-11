// Pilotage, dans le navigateur, de la salle dessinée par components/Salle.astro : couleur des
// sièges, repères (ta place, ton jumeau, le 578e siège libre), chiffre du centre, carte d'un
// siège. Les positions sont celles du repère de lib/hemicycle.ts, converties en pourcentages.

import { places, point, type Place } from './hemicycle.ts';
import { initiales } from './profil.ts';

export interface InfoGroupe { s: string; l: string; c: string; ni: boolean }

interface Reglages {
  boite: { x: number; y: number; l: number; h: number };
  rayonToi: number;
  centres: Record<string, number>;
  groupes: Record<string, InfoGroupe>;
  /** [député, groupe] de chaque siège ; vides pour un siège vacant. */
  sieges: [string, string][];
}

/** Ce qu'un siège affiche : sa couleur, estompé ou non, cerclé (vote contre son groupe). */
export interface Rendu {
  fond?: string;
  sansCommun?: boolean;
  estompe?: boolean;
  contreGroupe?: boolean;
}

/** La pastille d'un groupe : son sigle, précédé d'un point à sa couleur (.pastille-groupe). */
export function pastille(el: HTMLElement, g: InfoGroupe | undefined) {
  el.classList.add('pastille-groupe');
  el.textContent = g?.s ?? '';
  el.style.setProperty('--c', g?.c ?? '#9AA1B2');
  el.title = g?.l ?? '';
}

export class Salle {
  readonly racine: HTMLElement;
  readonly reglages: Reglages;
  readonly cercles: SVGCircleElement[];
  readonly liste: Place[] = places();
  private etat: { toi: string | null; jumeau: string | null } = { toi: null, jumeau: null };
  private observe = false;

  constructor(racine: HTMLElement) {
    this.racine = racine;
    this.reglages = JSON.parse(racine.querySelector('[data-salle-reglages]')!.textContent!);
    this.cercles = [...racine.querySelectorAll<SVGCircleElement>('circle[data-i]')];
  }

  private el(nom: string) {
    return this.racine.querySelector<HTMLElement>(`[data-salle-${nom}]`)!;
  }

  placer(el: HTMLElement, x: number, y: number) {
    const b = this.reglages.boite;
    el.style.left = `${(100 * (x - b.x)) / b.l}%`;
    el.style.top = `${(100 * (y - b.y)) / b.h}%`;
  }

  /** Colore chaque siège occupé ; `rendu` reçoit l'indice du siège et son député. */
  colorer(rendu: (i: number, depute: string) => Rendu) {
    this.cercles.forEach((c, i) => {
      const depute = this.reglages.sieges[i][0];
      if (!depute) return;
      const r = rendu(i, depute);
      c.style.fill = r.sansCommun ? '' : r.fond ?? '';
      c.classList.toggle('sans-commun', !!r.sansCommun);
      c.classList.toggle('estompe', !!r.estompe);
      c.classList.toggle('contre-groupe', !!r.contreGroupe);
    });
  }

  centre(chiffre: string, legende: string) {
    this.el('chiffre').textContent = chiffre;
    this.el('legende').textContent = legende;
  }

  libre(visible: boolean) {
    this.el('libre').hidden = !visible;
  }

  /** Ton jumeau : son siège agrandi et cerclé, et son repère. */
  jumeau(depute: string | null) {
    this.etat.jumeau = depute;
    for (const c of this.cercles) c.classList.remove('siege-jumeau');
    const i = depute ? this.reglages.sieges.findIndex(([u]) => u === depute) : -1;
    if (i >= 0) {
      const c = this.cercles[i];
      c.classList.add('siege-jumeau');
      c.parentNode!.append(c);
    }
    this.reperes();
  }

  /** Ta place : au-dessus de la part d'un groupe. */
  toi(groupe: string | null) {
    this.etat.toi = groupe;
    this.reperes();
  }

  /** Place les repères sans qu'ils couvrent une étiquette, le chiffre du centre ou l'autre
   *  repère. Les étiquettes ont une taille fixe en pixels et le dessin, une taille relative :
   *  les repères sont replacés quand la largeur change et quand les polices arrivent. */
  private reperes() {
    if (!this.observe) {
      this.observe = true;
      new ResizeObserver(() => this.reperes()).observe(this.racine);
      document.fonts?.ready.then(() => this.reperes());
    }
    const obstacles = () => [
      ...[...this.racine.querySelectorAll('.etiquette')].map((e) => e.getBoundingClientRect()),
      ...[...this.racine.querySelectorAll('.centre > div')].map((e) => e.getBoundingClientRect()),
    ];
    const couvre = (r: DOMRect, autres: DOMRect[]) => autres.some((e) => e.width && e.left < r.right
      && e.right > r.left && e.top < r.bottom && e.bottom > r.top);
    const cadre = this.racine.getBoundingClientRect();
    const dedans = (r: DOMRect) => r.left >= cadre.left - 1 && r.right <= cadre.right + 1
      && r.top >= cadre.top - 1 && r.bottom <= cadre.bottom + 1;

    // Ta place : au-dessus de son groupe ; remontée tant qu'elle couvre une étiquette.
    const toi = this.el('toi');
    const angle = this.etat.toi ? this.reglages.centres[this.etat.toi] : undefined;
    toi.hidden = angle === undefined;
    if (angle !== undefined) {
      const pt = point(angle, this.reglages.rayonToi);
      let { x } = pt;
      this.placer(toi, x, pt.y);
      const unite = cadre.width / this.reglages.boite.l || 1;
      for (let essai = 0, d = 0; essai < 40; essai++) {
        const r = toi.getBoundingClientRect();
        const hors = r.left < cadre.left ? cadre.left - r.left : r.right > cadre.right ? cadre.right - r.right : 0;
        const gene = couvre(r, obstacles());
        if (!hors && !gene) break;
        x += hors / unite;
        if (gene) d += 6;
        this.placer(toi, x, pt.y - d);
      }
    }

    // Ton jumeau : au-dessus de son siège, sinon dessous, sinon à côté (vers le centre, puis
    // vers l'extérieur) : la première place libre.
    const marque = this.el('jumeau');
    const i = this.etat.jumeau ? this.reglages.sieges.findIndex(([u]) => u === this.etat.jumeau) : -1;
    marque.hidden = i < 0;
    if (i < 0) return;
    const pt = this.liste[i];
    const versCentre = pt.x < 500 ? 'vers-droite' : 'vers-gauche';
    const versBord = pt.x < 500 ? 'vers-gauche' : 'vers-droite';
    const places: [string, number, number][] = [
      ['', 0, -13], ['dessous', 0, 13],
      [versCentre, pt.x < 500 ? 13 : -13, 0], [versBord, pt.x < 500 ? -13 : 13, 0],
    ];
    const autres = [...obstacles(), ...(toi.hidden ? [] : [toi.getBoundingClientRect()])];
    for (const [classe, dx, dy] of places) {
      marque.classList.remove('dessous', 'vers-droite', 'vers-gauche');
      if (classe) marque.classList.add(classe);
      this.placer(marque, pt.x + dx, pt.y + dy);
      const r = marque.getBoundingClientRect();
      if (!cadre.width || (!couvre(r, autres) && dedans(r))) return;
    }
    marque.classList.remove('dessous', 'vers-droite', 'vers-gauche');
    this.placer(marque, pt.x, pt.y - 13);
  }

  /** La carte d'un siège, au-dessus de lui ; `accord` dit où il en est avec toi. */
  carte(i: number, nom: string, accord: string) {
    const carte = this.el('carte');
    const g = this.reglages.groupes[this.reglages.sieges[i][1]];
    carte.querySelector('[data-carte-ini]')!.textContent = initiales(nom);
    carte.querySelector('[data-carte-nom]')!.textContent = nom;
    pastille(carte.querySelector<HTMLElement>('[data-carte-sigle]')!, g);
    carte.querySelector('[data-carte-libelle]')!.textContent = g?.l ?? '';
    carte.querySelector('[data-carte-accord]')!.textContent = accord;
    const pt = this.liste[i];
    this.placer(carte, pt.x, pt.y - 14);
    carte.classList.toggle('a-gauche', pt.x < 250);
    carte.classList.toggle('a-droite', pt.x > 750);
    carte.hidden = false;
  }

  cacherCarte() {
    this.el('carte').hidden = true;
  }

  /** Survol (souris) et toucher : un premier toucher montre la carte, un second, ou un clic,
   *  appelle `ouvrir`. */
  surSiege(montrer: (i: number) => void, ouvrir: (i: number) => void) {
    const svg = this.el('svg');
    let touche = -1;
    const indice = (e: Event) => {
      const c = e.target as Element;
      return c instanceof SVGCircleElement && c.dataset.i !== undefined
        && this.reglages.sieges[Number(c.dataset.i)][0] ? Number(c.dataset.i) : -1;
    };
    svg.addEventListener('pointerover', (e) => {
      const i = indice(e);
      if (i >= 0 && (e as PointerEvent).pointerType !== 'touch') montrer(i);
    });
    svg.addEventListener('pointerleave', (e) => {
      if ((e as PointerEvent).pointerType !== 'touch') this.cacherCarte();
    });
    svg.addEventListener('click', (e) => {
      const i = indice(e);
      if (i < 0) return;
      if ((e as PointerEvent).pointerType === 'touch' && touche !== i) {
        touche = i;
        montrer(i);
        return;
      }
      ouvrir(i);
    });
  }
}
