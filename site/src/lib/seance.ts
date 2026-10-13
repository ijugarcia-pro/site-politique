// Le déroulé commun au quiz et aux lots (components/Seance.astro) : poser une question,
// révéler le vrai vote, colorer ton hémicycle. Tout est calculé dans le navigateur ; les
// réponses y restent (lib/navigateur.ts). La page décide de l'enchaînement et de l'écran de fin.
import { reponses as mesReponses } from './navigateur.ts';
import { colonnes, niveau, precision, profil, type Matrice, type Profil, type Reponse } from './profil.ts';
import { jauge } from './jauge.ts';
import { Salle } from './salle.ts';
import { voix578 } from './votes.ts';

export interface QuestionSeance {
  uid: string; numero: number; theme: string; question: string; concretement: string;
  date: string; lien: string; verdict: string; adopte: boolean; dissidents: number;
  marge: number | null; requis: number | null; puce: string; sieges: string;
  /** Vote annoncé, pas encore tenu : pas de révélation, un pronostic (séance de la semaine). */
  attente: boolean; quand: string;
  decompte: { pour: number; contre: number; abstention: number };
}

const COULEURS: Record<string, string> = { P: '#2F7BFF', C: '#FF6A3D', A: '#FFC531',
  N: '#9AA1B2', '-': '#DFE3EB' };

export const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
export const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Tes réponses, { uid: 'pour' | 'contre' }. */
export const mesReps = (): Record<string, Reponse> =>
  Object.fromEntries(Object.entries(mesReponses()).map(([k, r]) => [k, r.v]));

/** Allume les segments d'une jauge de précision (10 segments). */
export const segments = (selecteur: string, p: number) => {
  document.querySelectorAll<HTMLElement>(`${selecteur} span`)
    .forEach((s, k) => s.classList.toggle('plein', k < Math.round(p * 10)));
};

export interface Options {
  /** Le libellé du bouton de la révélation après la question i (« Continuer », « Voir ma place »). */
  libelleContinuer: (i: number) => string;
  /** La place de la question i dans ce que l'on tranche d'affilée (un lot de 3) : par défaut,
   *  toutes les questions de la page. */
  rang?: (i: number) => { n: number; total: number };
}

export function seance({ libelleContinuer, rang }: Options) {
  const { questions } = JSON.parse(
    $('[data-donnees-seance]').textContent!) as { questions: QuestionSeance[] };
  const salle = new Salle($('[data-salle]'));
  let matrice: Matrice | null = null;
  const chargement = fetch('/donnees/matrice.json').then((r) => r.json())
    .then((m: Matrice) => { matrice = m; return m; });

  const montrer = (ecran: string) => {
    for (const e of document.querySelectorAll<HTMLElement>('[data-ecran]')) {
      e.hidden = e.dataset.ecran !== ecran;
    }
  };
  const place = rang ?? ((i: number) => ({ n: i, total: questions.length }));
  const progression = (n: number, total: number) => {
    $('[data-barre]').setAttribute('aria-valuenow', String(n));
    $('[data-barre]').setAttribute('aria-valuemax', String(total));
    $('[data-barre-pleine]').style.width = `${(100 * n) / total}%`;
  };

  /** Ton hémicycle tel qu'il est : plus un siège est foncé, plus ce député vote comme toi. */
  const tonHemicycle = (m: Matrice | null): Profil | null => {
    const p = m ? profil(m, mesReps()) : null;
    const n = p?.reponses ?? 0;
    $('[data-precision-tete-pct]').textContent = `${Math.round(100 * precision(n))} %`;
    segments('[data-segments-tete]', precision(n));
    if (!p || !n) {
      salle.colorer(() => ({ fond: '#D6DBE4' }));
      salle.centre('577', 'sièges… et le tien');
      salle.libre(true);
      return p;
    }
    const parDepute = new Map(p.deputes.map((x) => [x.ligne.u, x]));
    salle.colorer((_, uid) => {
      const x = parDepute.get(uid);
      return x ? { fond: niveau(x.lisse).couleur } : { sansCommun: true };
    });
    const proches = p.deputes.filter((x) => niveau(x.lisse).haut).length;
    salle.centre(String(proches), `député${proches > 1 ? 's' : ''} d'accord avec toi la plupart du temps`);
    salle.libre(false);
    return p;
  };

  /** Le panneau de droite en mode « ton hémicycle » (pendant une question, à la fin). */
  const panneauHemicycle = (sous: string) => {
    $('[data-panneau-titre]').textContent = 'Ton hémicycle';
    $('[data-panneau-sous]').textContent = sous;
    $('[data-legende-vote]').hidden = true;
    $('[data-legende-accord]').hidden = false;
  };

  /** Frame ⑥ : les députés n'ont pas encore voté ; l'hémicycle reste gris, le résultat viendra. */
  const panneauAttente = (q: QuestionSeance) => {
    $('[data-panneau-titre]').textContent = 'Les députés n’ont pas encore voté';
    $('[data-panneau-sous]').textContent = `Ils votent ${q.quand}`;
    $('[data-precision-tete]').hidden = true;
    $('[data-legende-vote]').hidden = true;
    $('[data-legende-accord]').hidden = true;
    salle.colorer(() => ({ fond: '#D6DBE4' }));
    salle.centre('?', 'Le résultat le lendemain matin');
    salle.libre(true);
  };

  /** Le geste de vote : le bouton choisi est marqué (même animation pour chaque choix), les
   *  autres s'éteignent ; la section, zone aria-live, annonce « Vote enregistré ». */
  const marquerChoix = (v: Reponse | null) => {
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-reponse]')) {
      b.disabled = true;
      const choisi = (b.dataset.reponse || null) === v;
      b.classList.toggle('choisi', choisi);
      b.classList.toggle('estompe', !choisi);
      if (choisi) b.setAttribute('aria-pressed', 'true');
      else b.removeAttribute('aria-pressed');
    }
    $('[data-annonce-vote]').textContent = 'Vote enregistré';
  };

  /** A1, retour de Julien du 13 oct. : la page revient en haut (la progression reste visible)
   *  et la nouvelle carte monte. Un appui pendant l'arrivée la termine sans compter comme une
   *  réponse : un double appui sur « Continuer » ne vote jamais à la question suivante. */
  let finirArrivee: (() => void) | null = null;
  const arriver = (carte: HTMLElement) => {
    finirArrivee?.();
    window.scrollTo({ top: 0, behavior: 'instant' });
    carte.classList.remove('arrive');
    void carte.offsetWidth;
    carte.classList.add('arrive');
    const intercepter = (e: Event) => { e.preventDefault(); e.stopPropagation(); finir(); };
    const finir = () => {
      if (finirArrivee !== finir) return;
      finirArrivee = null;
      document.removeEventListener('click', intercepter, true);
      carte.getAnimations().forEach((x) => x.finish());
    };
    finirArrivee = finir;
    document.addEventListener('click', intercepter, true);
    carte.addEventListener('animationend', finir, { once: true });
    setTimeout(finir, 600);
  };

  // Un appui pendant la révélation (autre que le vote qui l'ouvre) la termine : l'hémicycle,
  // les chiffres et la jauge passent à leur état final.
  let onde: { passer(): void } | null = null;
  document.addEventListener('click', (e) => {
    const rv = $('[data-revelation]');
    if (rv.hidden || (e.target as Element).closest?.('[data-reponse]')) return;
    onde?.passer();
    rv.getAnimations({ subtree: true }).forEach((a) => a.finish());
  });

  // --- Une question ---
  const poser = (i: number) => {
    onde?.passer();
    const q = questions[i];
    const carte = $('[data-carte]');
    // Une carte était à l'écran (on vient d'une révélation ou d'un pronostic) : elle s'envole.
    const enchaine = !$('[data-ecran="question"]').hidden && !!$('[data-question]').textContent;
    montrer('question');
    $('[data-revelation]').hidden = true;
    $('[data-pied-focus]').hidden = false;
    const bulle = document.querySelector<HTMLElement>('[data-bulle]');
    if (bulle) bulle.hidden = i > 0;
    const theme = $('[data-theme]');
    const [fond, encre] = q.puce.split(':');
    theme.textContent = q.theme;
    theme.style.background = fond;
    theme.style.color = encre;
    const date = document.querySelector('[data-date-texte]');
    if (date) date.textContent = q.date;
    const titre = $('[data-question]');
    titre.textContent = q.question;
    titre.classList.toggle('longue', q.question.length > 95);
    $('[data-concretement]').textContent = q.concretement;
    const { n, total } = place(i);
    $('[data-compteur]').textContent = `Vote ${n + 1} sur ${total}`;
    progression(n, total);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-reponse]')) {
      b.disabled = false;
      b.classList.remove('choisi', 'estompe');
      b.removeAttribute('aria-pressed');
    }
    $('[data-annonce-vote]').textContent = '';
    const pronostic = document.querySelector<HTMLElement>('[data-pronostic]');
    if (pronostic) pronostic.hidden = true;
    salle.jumeau(null);
    salle.toi(null);
    if (q.attente) {
      panneauAttente(q);
    } else {
      panneauHemicycle('Il se construit à chaque réponse');
      $('[data-precision-tete]').hidden = false;
      tonHemicycle(matrice);
      if (!matrice) chargement.then((m) => { if (!$('[data-ecran="question"]').hidden) tonHemicycle(m); });
    }
    if (enchaine) {
      // Le focus passe au titre de la nouvelle question, la page étant revenue en haut.
      arriver(carte);
      titre.focus({ preventScroll: true });
    } else if (i > 0) titre.focus();
  };

  // --- La révélation du vote réel ---
  const reveler = (i: number, v: Reponse | null) => {
    const q = questions[i];
    marquerChoix(v);
    // En couleur vive : les députés qui ont voté comme toi.
    const mienne = v === 'pour' ? 'P' : v === 'contre' ? 'C' : null;
    const d = q.decompte;
    onde = salle.reveler((k) => {
      const brut = q.sieges[k];
      if (brut === 'x') return { sansCommun: true };
      const l = brut.toUpperCase();
      return { fond: COULEURS[l] ?? '#DFE3EB', contreGroupe: brut !== l,
        estompe: !!mienne && l !== '-' && l !== mienne };
    }, { pour: d.pour, contre: d.contre, legende: `${q.adopte ? 'Adopté' : 'Rejeté'} · pour – contre` });
    salle.libre(false);
    $('[data-panneau-titre]').textContent = 'Comment l\'Assemblée a voté';
    $('[data-panneau-sous]').textContent = v ? 'En couleur vive : ceux qui ont voté comme toi'
      : 'Tu n\'as pas répondu à ce vote';
    $('[data-precision-tete]').hidden = true;
    $('[data-legende-vote]').hidden = false;
    $('[data-legende-hors]').hidden = !q.sieges.includes('x');
    $('[data-legende-accord]').hidden = true;
    const gagnant = q.adopte ? 'pour' : 'contre';
    $('[data-rv-titre]').textContent = v
      ? `Tu es ${v === gagnant ? 'avec la majorité' : 'dans la minorité'} : ${v === 'pour' ? d.pour : d.contre} députés ont voté comme toi`
      : 'Voici ce qu\'a voté l\'Assemblée';
    $('[data-rv-ligne]').textContent = `Le texte a été ${q.adopte ? 'adopté' : 'rejeté'} par ${d.pour} voix contre ${d.contre}.`
      + (q.dissidents ? ` ${pluriel(q.dissidents, 'député')} ${q.dissidents > 1 ? 'ont' : 'a'} voté contre leur propre groupe.` : '');
    $<HTMLAnchorElement>('[data-lien-vote]').href = q.lien;
    // Avec ta voix, la majorité requise est recalculée (lib/votes.ts) ; sans réponse, la marge
    // reste celle du résultat officiel.
    const inverser = (n: number, quoi: string) =>
      `Pour inverser ${quoi}, il aurait fallu que ${pluriel(n, 'député')} change${n > 1 ? 'nt' : ''} d'avis.`;
    const x = v ? voix578(d, q.requis, v) : null;
    const avec = v ? `Avec ta voix : ${d.pour + (v === 'pour' ? 1 : 0)} pour, ${d.contre + (v === 'contre' ? 1 : 0)} contre` : '';
    $('[data-rv-voix]').textContent = !v
      ? 'Tu n\'as pas tranché : ce vote ne compte pas dans ton résultat. ' + (q.marge ? inverser(q.marge, 'le résultat') : '')
      : !x ? `${avec}.`
        : x.adopte !== q.adopte
          ? `${avec} : ta voix aurait changé le résultat, le texte aurait été ${x.adopte ? 'adopté' : 'rejeté'}.`
          : `${avec}. ${inverser(x.inverser, 'ce résultat')}`;
    $('[data-revelation]').hidden = false;
    $('[data-pied-focus]').hidden = true;
    // La précision, avant et après ce vote (R4), 1,2 s après la révélation.
    const bloc = $('[data-rv-precision]');
    bloc.hidden = !matrice;
    if (matrice) {
      const reps = mesReps();
      const apres = colonnes(matrice, reps).length;
      delete reps[q.uid];
      jauge(bloc.querySelector<HTMLElement>('[data-jauge]')!, colonnes(matrice, reps).length, apres, 1200);
    }
    $('[data-continuer]').textContent = libelleContinuer(i);
    $('[data-continuer]').focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 1000px)').matches) {
      document.querySelector('.panneau')!.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /** Après la réponse à un vote pas encore tenu : ta réponse est gardée, et un pronostic
   *  facultatif est proposé (frame ⑥). */
  const attendre = (i: number, v: Reponse | null) => {
    const q = questions[i];
    marquerChoix(v);
    const pronostic = $('[data-pronostic]');
    $('[data-prono-question]').textContent = `Selon toi, ${q.quand}, le texte sera…`;
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-prono]')) b.classList.remove('choisi');
    $('[data-suivant]').textContent = libelleContinuer(i);
    pronostic.hidden = false;
    $<HTMLButtonElement>('[data-prono="adopte"]').focus({ preventScroll: true });
  };

  /** Quitte la révélation pour l'écran de fin de la page. */
  const finir = (ecran: string) => {
    onde?.passer();
    montrer(ecran);
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('[data-revelation]').hidden = true;
    $('[data-pied-focus]').hidden = false;
    const pronostic = document.querySelector<HTMLElement>('[data-pronostic]');
    if (pronostic) pronostic.hidden = true;
    progression(1, 1);
    $('[data-compteur]').textContent = 'Terminé';
    $('[data-precision-tete]').hidden = true;
  };

  return { questions, salle, chargement, matrice: () => matrice, montrer, progression,
    tonHemicycle, panneauHemicycle, poser, reveler, attendre, finir };
}
