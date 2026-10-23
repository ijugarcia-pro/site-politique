// Le déroulé commun au quiz, aux lots et à la séance (components/vdef/Trancher.astro ; VDEF, lot
// V5) : poser une question sur la tribune, marquer la réponse, proposer la suite, révéler le
// vrai vote dans la salle (vue « La salle », voyants aux couleurs du vote), annoncer un palier
// franchi une seule fois. Tout est calculé dans le navigateur ; les réponses y restent
// (lib/navigateur.ts). La page décide de l'enchaînement et de l'écran de fin.
import { marquerPaliersVus, paliersVus, reponses as mesReponses } from './navigateur.ts';
import { paliersAAnnoncer, prochainPalier, votesTranches } from './paliers.ts';
import type { Reponse } from './profil.ts';
import { voix578 } from './votes.ts';
import { salle3D, type Pilote } from '../salle3d/pilote.ts';

export interface QuestionTrancher {
  uid: string; numero: number; theme: string; question: string; titre: string; concretement: string;
  date: string; intitule: string; lien: string; verdict: string; adopte: boolean; dissidents: number;
  marge: number | null; requis: number | null; sieges: string; changes: string[];
  /** Vote annoncé, pas encore tenu : pas de révélation, un pronostic (séance de la semaine). */
  attente: boolean; quand: string;
  decompte: { pour: number; contre: number; abstention: number; absent: number };
}

/** Les voyants d'un vote, siège par siège (VDEF § 6) : absent en gris plein, non-votant en gris
 *  foncé (jamais confondus), pas encore député ou siège vacant éteint. */
export const VOYANTS: Record<string, string | null> = { P: '#2F7BFF', C: '#FF6A3D', A: '#FFC531',
  '-': '#8A8A8A', N: '#3A3A3A', x: null, V: null };
/** Le même vote dans l'hémicycle 2D du repli : un siège éteint y est gris clair. */
const REPLI: Record<string, string> = { P: '#2F7BFF', C: '#FF6A3D', A: '#FFC531', '-': '#8A8A8A', N: '#3A3A3A',
  x: '#E7E7E7', V: '#FFFFFF' };

export const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
export const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Tes réponses, { uid: 'pour' | 'contre' }. */
export const mesReps = (): Record<string, Reponse> =>
  Object.fromEntries(Object.entries(mesReponses()).map(([k, r]) => [k, r.v]));

/** Tes votes tranchés, hors motions de censure (la matrice). */
export const tranches = (horsMatrice: Set<string> = new Set()) =>
  votesTranches(Object.fromEntries(Object.entries(mesReps()).filter(([uid]) => !horsMatrice.has(uid))));

export interface Options {
  /** La place de la question i dans ce que l'on tranche d'affilée (un lot de 3) : par défaut,
   *  toutes les questions de la page ; et le mot du compteur (« Question », « Vote »). */
  rang?: (i: number) => { n: number; total: number };
  mot?: string;
  /** Le libellé du bouton de la révélation après la question i. */
  libelleSuivant: (i: number) => string;
}

export function trancher({ rang, mot = 'Vote', libelleSuivant }: Options) {
  const { questions } = JSON.parse($('[data-donnees-trancher]').textContent!) as { questions: QuestionTrancher[] };
  const racineSalle = document.querySelector<HTMLElement>('[data-salle-vdef]');
  const salle: Pilote | null = racineSalle ? salle3D(racineSalle) : null;
  // Sans 3D (pas de WebGL, économie de données…), la révélation montre l'hémicycle 2D.
  let sans3D = !salle;
  salle?.prete.then((s) => { sans3D = !s; });
  const place = rang ?? ((i: number) => ({ n: i, total: questions.length }));

  const montrer = (ecran: string) => {
    for (const e of document.querySelectorAll<HTMLElement>('[data-trancher] [data-ecran]')) {
      e.hidden = e.dataset.ecran !== ecran;
    }
    document.querySelector('[data-trancher]')?.scrollTo?.({ top: 0 });
  };
  /** La progression de la barre du haut, en segments. */
  const progression = (n: number, total: number, libelle?: string) => {
    const l = document.querySelector('[data-focus-libelle]');
    if (l) l.textContent = libelle ?? `${mot} ${Math.min(n + 1, total)} sur ${total}`;
    document.querySelectorAll<HTMLElement>('[data-focus-segment]')
      .forEach((s, k) => s.classList.toggle('plein', k <= Math.min(n, total - 1)));
  };
  const lieu = (texte: string | null) => {
    const el = document.querySelector<HTMLElement>('[data-lieu]');
    if (!el) return;
    el.hidden = texte === null;
    if (texte) el.querySelector('.etiquette')!.textContent = texte;
  };
  const pastille = (sel: string, texte: string, noire = false) => {
    const el = $(sel);
    el.textContent = texte;
    el.classList.toggle('noire', noire);
  };

  /** Un palier franchi s'annonce une fois (lib/paliers.ts) : dans l'élément donné. */
  const annoncer = (el: HTMLElement | null, horsMatrice?: Set<string>) => {
    if (!el) return [];
    const nouveaux = paliersAAnnoncer(tranches(horsMatrice), paliersVus());
    el.hidden = !nouveaux.length;
    if (!nouveaux.length) return [];
    const p = nouveaux[nouveaux.length - 1];
    el.textContent = `✓ Palier ${p.rang} débloqué · ${p.libelle}`;
    marquerPaliersVus(nouveaux.map((x) => x.id));
    return nouveaux;
  };

  // --- Une question, sur la tribune ---
  const poser = (i: number) => {
    const q = questions[i];
    montrer('question');
    salle?.voyants([]);
    salle?.reperes([]);
    salle?.vue('tribune');
    lieu(q.attente ? `La tribune · ${q.date.replace(/^Ils votent /, '')}` : 'La tribune · ce texte y a été voté');
    pastille('[data-theme]', q.theme);
    pastille('[data-date]', q.date, q.attente);
    $('[data-mode]').textContent = q.attente ? 'Vote avant eux' : 'Et toi, qu’aurais-tu voté ?';
    const titre = $('[data-question]');
    titre.textContent = q.question;
    titre.classList.toggle('longue', q.question.length > 95);
    $('[data-concretement]').textContent = q.concretement;
    const corps = $('[data-comprendre-corps]');
    corps.replaceChildren();
    if (q.changes.length) {
      const ol = document.createElement('ol');
      for (const c of q.changes) { const li = document.createElement('li'); li.textContent = c; ol.append(li); }
      corps.append(ol);
    }
    const p = document.createElement('p');
    p.textContent = q.attente
      ? `Le texte est mis aux voix ${q.quand}. Tu donnes ta réponse avant les députés ; le verdict arrive dès que l'Assemblée publie le scrutin.`
      : q.intitule ? `Intitulé officiel : ${q.intitule}` : '';
    corps.append(p);
    if (q.lien) {
      const a = document.createElement('a');
      a.href = q.lien;
      a.textContent = 'La page de ce vote : décompte, groupes, sources';
      corps.append(a);
    }
    ($('[data-comprendre]') as HTMLDetailsElement).open = false;
    const { n, total } = place(i);
    progression(n, total);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-reponse]')) {
      b.disabled = false;
      b.classList.remove('choisi', 'estompe');
      b.removeAttribute('aria-pressed');
    }
    $('[data-annonce-vote]').textContent = '';
    $('[data-suite]').hidden = true;
    const prono = document.querySelector<HTMLElement>('[data-pronostic]');
    if (prono) prono.hidden = true;
    if (i > 0) titre.focus();
  };

  /** Le geste de vote : le choix en noir, les autres grisés ; puis l'encart de suite. Pour un
   *  vote pas encore tenu, la réponse est gardée et un pronostic facultatif est proposé. */
  const repondu = (i: number, v: Reponse | null, opt: { lendemain?: string | null; pronostic?: string } = {}) => {
    const q = questions[i];
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-reponse]')) {
      b.disabled = true;
      const choisi = (b.dataset.reponse || null) === v;
      b.classList.toggle('choisi', choisi);
      b.classList.toggle('estompe', !choisi);
      if (choisi) b.setAttribute('aria-pressed', 'true'); else b.removeAttribute('aria-pressed');
    }
    $('[data-annonce-vote]').textContent = 'Réponse enregistrée';
    document.dispatchEvent(new Event('vdef:reponses'));
    const texte = $('[data-suite-texte]');
    const bouton = $<HTMLButtonElement>('[data-continuer]');
    if (q.attente) {
      texte.textContent = opt.lendemain
        ? `Noté. ${majuscule(opt.lendemain)} matin, la salle te dira ce qu’ils ont voté.`
        : 'Noté. Le verdict arrive dès que l’Assemblée publie le scrutin.';
      bouton.textContent = libelleSuivant(i);
      const prono = document.querySelector<HTMLElement>('[data-pronostic]');
      if (prono) {
        prono.hidden = false;
        $('[data-prono-question]').textContent = 'Ton pronostic, facultatif : le texte sera…';
        for (const b of document.querySelectorAll<HTMLButtonElement>('[data-prono]')) {
          b.setAttribute('aria-pressed', String(b.dataset.prono === opt.pronostic));
        }
      }
    } else {
      texte.textContent = 'Voyons ce que les 577 députés ont voté.';
      bouton.textContent = 'Voir la salle';
    }
    $('[data-suite]').hidden = false;
    bouton.focus({ preventScroll: true });
  };

  // --- La révélation, dans la salle ---
  /** `annoncer` : faux quand l'écran suivant annonce lui-même le palier (la fin du quiz). */
  const reveler = (i: number, v: Reponse | null, horsMatrice?: Set<string>, annoncerIci = true) => {
    const q = questions[i];
    montrer('revelation');
    lieu(null);
    const voyants = [...q.sieges].map((l) => VOYANTS[l] ?? null);
    salle?.vue('salle');
    salle?.onde(voyants, 1100);
    const repli = $('[data-repli-2d]');
    repli.hidden = !sans3D;
    if (sans3D) {
      repli.querySelectorAll<SVGCircleElement>('circle:not(.marque)').forEach((c, k) => c.setAttribute('fill', REPLI[q.sieges[k]] ?? '#E7E7E7'));
    }
    pastille('[data-rv-theme]', q.theme);
    pastille('[data-rv-date]', q.date);
    $('[data-rv-question]').textContent = q.titre;
    $('[data-rv-issue]').textContent = q.verdict;
    $('[data-rv-marge]').textContent = q.marge ? `à ${q.marge} voix près` : '';
    const d = q.decompte;
    const parts: [string, number, string][] = [['pour', d.pour, `${d.pour} pour`], ['contre', d.contre, `${d.contre} contre`],
      ['abstention', d.abstention, pluriel(d.abstention, 'abstention')], ['absent', d.absent, pluriel(d.absent, 'absent')]];
    const barre = $('[data-rv-barre]');
    barre.setAttribute('aria-label', parts.map((p) => p[2]).join(', '));
    barre.replaceChildren(...parts.filter((p) => p[1] > 0).map(([cle, n]) => {
      const s = document.createElement('span');
      s.className = `point ${cle}`;
      s.style.cssText = `flex: ${n}; width: auto; height: auto; border-radius: 0`;
      return s;
    }));
    $('[data-rv-pastilles]').replaceChildren(...parts.map(([cle, , texte]) => {
      const s = document.createElement('span');
      s.className = 'pastille-rv';
      const pt = document.createElement('span');
      pt.className = `point ${cle}`;
      pt.setAttribute('aria-hidden', 'true');
      s.append(pt, texte);
      return s;
    }));
    // L'encart noir : avec la majorité ou à contre-courant, puis ta voix de 578e (lib/votes.ts).
    const gagnant = q.adopte ? 'pour' : 'contre';
    const comme = v === 'pour' ? d.pour : v === 'contre' ? d.contre : 0;
    $('[data-rv-titre]').textContent = !v ? 'Voici ce qu’a voté l’Assemblée.'
      : v === gagnant ? `Tu es avec la majorité : ${pluriel(comme, 'député')} ${comme > 1 ? 'ont' : 'a'} voté comme toi.`
        : `Tu es à contre-courant : ${pluriel(comme, 'député')} ${comme > 1 ? 'ont' : 'a'} voté comme toi.`;
    const x = v ? voix578(d, q.requis, v) : null;
    const inverser = (n: number) => `Il aurait suffi que ${pluriel(n, 'député')} change${n > 1 ? 'nt' : ''} d’avis.`;
    $('[data-rv-voix]').textContent = !v
      ? `Tu n’as pas tranché : ce vote ne compte pas dans ton résultat.${q.marge ? ` ${inverser(q.marge)}` : ''}`
      : `Ta voix de 578e : ${(v === 'pour' ? d.pour : d.contre) + 1} ${v}. `
        + (x && x.adopte !== q.adopte
          ? `Ta voix aurait changé le résultat : le texte aurait été ${x.adopte ? 'adopté' : 'rejeté'}.`
          : `Le résultat ne change pas. ${x ? inverser(x.inverser) : ''}`);
    $<HTMLAnchorElement>('[data-rv-lien]').href = q.lien || '/explorer/';
    // La progression vers le prochain palier (« Ta place se dessine · 3 / 10 »).
    const n = tranches(horsMatrice);
    const prochain = prochainPalier(n);
    const bloc = $('[data-progression]');
    bloc.hidden = !prochain;
    if (prochain) {
      const LIBELLES: Record<string, string> = { place: 'Ta place se dessine', 'salle-eclairee': 'La salle s’éclaire',
        bilan: 'Ton bilan se prépare' };
      $('[data-progression-libelle]').textContent = LIBELLES[prochain.palier.id];
      $('[data-progression-chiffre]').textContent = `${n} / ${prochain.palier.seuil}`;
      $('[data-progression-plein]').style.width = `${(100 * n) / prochain.palier.seuil}%`;
    }
    if (annoncerIci) annoncer(document.querySelector('[data-annonce-palier]'), horsMatrice);
    else $('[data-annonce-palier]').hidden = true;
    $('[data-suivant]').textContent = libelleSuivant(i);
    $('[data-rv-issue]').focus({ preventScroll: true });
  };

  /** Quitte la question pour l'écran de fin de la page ; `sortirFocus` : la barre normale revient
   *  (la fin du quiz, maquette 04). */
  const finir = (ecran: string, libelle = 'Terminé', sortirFocus = false) => {
    montrer(ecran);
    lieu(null);
    if (sortirFocus) {
      document.body.classList.remove('focus');
      document.querySelector<HTMLElement>('[data-barre-focus]')?.setAttribute('hidden', '');
      document.querySelector<HTMLElement>('[data-barre-normale]')?.removeAttribute('hidden');
    }
    const segments = document.querySelectorAll('[data-focus-segment]').length;
    progression(segments, segments, libelle);
  };

  return { questions, salle, sans3D: () => sans3D, poser, repondu, reveler, finir, progression, annoncer, montrer };
}
