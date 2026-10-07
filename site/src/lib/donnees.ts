// Lecture, au build, des JSON produits par le pipeline (export/). Rien n'est inventé ici :
// si un fichier manque, le build échoue, et rien n'est publié.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPORT = process.env.EXPORT_DIR ?? resolve(process.cwd(), '..', 'export');

function lire<T>(chemin: string, commande: string): T {
  const complet = resolve(EXPORT, chemin);
  if (!existsSync(complet)) {
    throw new Error(`Données manquantes : export/${chemin}. Lancer d'abord : ${commande}`);
  }
  return JSON.parse(readFileSync(complet, 'utf-8')) as T;
}

export type Position = 'pour' | 'contre' | 'abstention' | 'non_votant' | 'absent';
export type Decompte = Record<Position, number>;

export interface Groupe {
  uid: string;
  sigle: string;
  libelle: string;
  couleur: string | null;
  non_inscrits: boolean;
  membres: number;
  decompte?: Decompte;
  dissidents?: number;
  position?: string | null;
}

export interface Siege {
  depute?: string;
  nom?: string;
  groupe?: string;
  vote?: Position;
  dissident?: boolean;
  mise_au_point?: string;
  vacant?: boolean;
}

export interface Composition {
  date: string;
  groupes: Groupe[];
  sieges: Siege[];
}

/** Une grande étape du parcours d'un texte (lecture, commission mixte paritaire…). */
export interface Etape {
  code: string;
  libelle: string;
  debut: string | null;
  fin: string | null;
  ce_vote: boolean;
}

export interface Dossier {
  uid: string;
  titre: string;
  procedure: string | null;
  lien: string;
  parcours: Etape[];
}

/** L'entrée d'un vote dans l'index (export/site/scrutins.json). */
export interface ResumeScrutin {
  uid: string;
  numero: number;
  date: string;
  titre: string;
  sort: string;
  categorie: string;
  solennel: boolean;
  motion_censure: boolean;
  decompte: Decompte;
  requis: number | null;
  voix_pour_inverser: number | null;
  dissidents: number;
  dossier: string | null;
}

/** Un vote complet (export/site/scrutins/{uid}.json). */
export interface Scrutin extends Omit<ResumeScrutin, 'dossier'> {
  type_vote: string;
  publie: { pour: number; contre: number; abstention: number; non_votant: number };
  lien: string;
  dossier: Dossier | null;
  groupes: Groupe[];
  sieges: Siege[];
}

export interface Etat {
  genere_le: string;
  controle_le: string;
  dernier_scrutin: { uid: string; numero: number; date: string; titre: string };
  scrutins: { total: number; publies: number; mis_de_cote: number };
  deputes_en_exercice: number;
  scrutins_mis_de_cote: { uid: string; numero: number; raison: string }[];
  controles: { numero: number; nom: string; reussi: boolean; bloquant: boolean;
    details: string[] }[];
  sources: { id: string; nom: string; producteur: string; licence: string; url: string;
    requise: boolean; version: string | null; recuperee_le: string | null;
    echecs_consecutifs: number }[];
}

const EXPORT_SITE = 'uv run python -m pipeline.export_site';

export const composition = () => lire<Composition>('site/composition.json', EXPORT_SITE);
/** Les votes qui ont une page, du plus récent au plus ancien. */
export const scrutins = () => lire<ResumeScrutin[]>('site/scrutins.json', EXPORT_SITE);
export const scrutin = (uid: string) => lire<Scrutin>(`site/scrutins/${uid}.json`, EXPORT_SITE);
/** Adresse de la page d'un vote : son numéro, comme sur le site de l'Assemblée. */
export const lienVote = (s: { numero: number }) => `/votes/${s.numero}/`;
export const etat = () => lire<Etat>('etat.json', 'uv run python -m pipeline.etat');

export const LIBELLES: Record<Position, string> = {
  pour: 'pour', contre: 'contre', abstention: 'abstention', non_votant: 'non-votant',
  absent: 'absent',
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-07-21 » → « 21 juillet 2026 » ; avec une heure : « … à 12 h 26 », heure de Paris. */
export function dateLisible(iso: string | null): string {
  if (!iso) return 'inconnue';
  if (iso.length === 10) {
    const [a, m, j] = iso.split('-').map(Number);
    return `${j} ${MOIS[m - 1]} ${a}`;
  }
  const parties = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${Number(parties.day)} ${MOIS[Number(parties.month) - 1]} ${parties.year} à `
    + `${Number(parties.hour)} h ${parties.minute}`;
}

/** Les titres officiels commencent par une minuscule (« l'ensemble du projet de loi… »). */
export const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);
