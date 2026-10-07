"""Rattachement d'un scrutin à son dossier législatif (question ouverte 2).

Trois méthodes indépendantes, puis une combinaison :
- A, les actes : un acte d'un dossier législatif cite le scrutin (`voteRefs`) ;
- B, le libellé : on lit le titre du scrutin. Pour un amendement, on retrouve l'amendement par son
  numéro, sa séance et son auteur dans l'archive des amendements. Sinon, on compare la désignation
  du texte (« du projet de loi … ») aux titres des textes déposés ;
- C, la séance : l'ordre du jour de la séance du scrutin (agenda) ne cite qu'un dossier.

Ce module ne fait aucune lecture de fichier : il travaille sur des index construits par l'appelant
(voir scripts/mesurer_rattachement.py), ce qui permet de le tester sur des données factices.
"""

from __future__ import annotations

import html
import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher

# --- Normalisation des libellés ---------------------------------------------------------------


def normaliser(texte: str | None) -> str:
    """Minuscules, sans accents ni ligatures, apostrophes droites, espaces simples."""
    if not texte:
        return ""
    texte = html.unescape(texte).replace("’", "'").replace("‘", "'")
    texte = texte.replace("œ", "oe").replace("Œ", "Oe").replace("æ", "ae").replace("Æ", "Ae")
    texte = unicodedata.normalize("NFKD", texte)
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texte.lower()).strip()


# --- Catégorie d'un scrutin -------------------------------------------------------------------

CATEGORIES = [
    "ensemble", "partie", "article", "amendement", "sous-amendement", "motion de procédure",
    "motion de censure", "résolution", "déclaration", "procédure", "autre",
]

_REGLES_CATEGORIE = [
    # L'ordre compte : la première règle qui s'applique gagne. Les fautes de frappe observées
    # dans les titres (« amenedement », « aticle », « sous-amendmeent ») sont tolérées.
    ("sous-amendement", r"^(le |les )?sous-amen\w*"),
    ("amendement", r"^(l'|les )amen\w*"),
    ("article", r"^(l'|les )a\w?ticles?\b"),
    ("partie", r"^(l'ensemble de )?la (premiere|deuxieme|seconde|troisieme|quatrieme) partie\b"),
    ("ensemble", r"^(l'ensemble|le projet de loi|la proposition de loi)\b"),
    ("motion de procédure", r"^la motion (de rejet|de renvoi|referendaire|d'ajournement)"),
    ("résolution", r"^la proposition de resolution\b"),
    ("déclaration", r"^la declaration\b"),
    ("procédure", r"^la (demande|proposition du gouvernement)\b"),
]


def categorie(titre: str, code_type_vote: str) -> str:
    if code_type_vote == "MOC":
        return "motion de censure"
    titre = normaliser(titre)
    for nom, motif in _REGLES_CATEGORIE:
        if re.match(motif, titre):
            return nom
    return "autre"


# --- Analyse du libellé -----------------------------------------------------------------------

_NATURE = re.compile(r"\b(projet|proposition) de (loi|resolution)\b")
_QUALIFICATIF = re.compile(
    r"^(projet|proposition) de (loi|resolution)( organique| constitutionnelle| europeenne)?"
)
# Incises qui changent d'une lecture à l'autre et ne désignent pas le texte.
_INCISES = [
    r"\b(adopte|adoptee|modifie|modifiee|rejete|rejetee|transmis|transmise)s?\b"
    r"(?: (?:avec modifications|par|en|apres)\b[^,]*)?",
    r"\bapres engagement de la procedure acceleree\b",
    r"\brectifiee?\b",
]
_NUMERO_AMENDEMENT = re.compile(r"n\s*°\s*(\d+)")
# Juste après le numéro : « de M. Le Coq », « de Potier » (civilité oubliée), « du Gouvernement ».
_AUTEUR = re.compile(
    r"\s*(?:\([^)]*\)\s*)?(?:rectifie\s+)?(?:"
    r"(?P<gouvernement>du gouvernement)|(?P<commission>de la commission)"
    r"|de (?:(?:m\.|mme|mm\.)\s+)?(?!suppression|retablissement|redaction)(?P<nom>.+?)"
    r"(?= et | a | au | aux | apres | avant | sur | l'| de suppression| de retablissement"
    r"| de redaction| tendant|,|$))"
)
_MOTS_VIDES = {"visant", "relative", "relatif", "portant", "pour", "dans", "avec", "sans", "leur",
               "leurs", "entre", "afin", "ainsi", "notamment", "certains", "certaines"}


def coeur(designation: str) -> str:
    """Partie stable d'un titre de texte : sans nature, incises, parenthèses ni ponctuation."""
    texte = normaliser(designation)
    texte = re.sub(r"\([^)]*\)", " ", texte)
    texte = _QUALIFICATIF.sub("", texte)
    for incise in _INCISES:
        texte = re.sub(incise, " ", texte)
    texte = re.sub(r"[,;:.«»\"!?()…]", " ", texte)
    return re.sub(r"\s+", " ", texte).strip()


def mots(coeur_titre: str) -> frozenset[str]:
    """Mots porteurs de sens d'un titre, sans élisions : pour comparer deux titres reformulés."""
    sans_elision = re.sub(r"\b[dlnsjc]'", "", coeur_titre)
    return frozenset(
        m for m in re.findall(r"[\w-]+", sans_elision) if len(m) >= 4 and m not in _MOTS_VIDES
    )


@dataclass
class Libelle:
    categorie: str
    numero_amendement: int | None = None
    auteur: str | None = None  # nom normalisé, « gouvernement » ou « commission »
    designation: str | None = None  # « projet de loi … » tel qu'écrit dans le titre
    coeur: str | None = None
    nature: str = "ordinaire"  # « organique », « constitutionnelle » ou « ordinaire »


def analyser_libelle(titre: str, code_type_vote: str) -> Libelle:
    cat = categorie(titre, code_type_vote)
    texte = normaliser(titre)
    resultat = Libelle(cat)
    if cat in ("amendement", "sous-amendement"):
        numero = _NUMERO_AMENDEMENT.search(texte)
        if numero:
            resultat.numero_amendement = int(numero.group(1))
            auteur = _AUTEUR.match(texte, numero.end())
            if auteur and auteur.group("gouvernement"):
                resultat.auteur = "gouvernement"
            elif auteur and auteur.group("commission"):
                resultat.auteur = "commission"
            elif auteur:
                resultat.auteur = auteur.group("nom").strip()
    nature = _NATURE.search(texte)
    if nature:
        resultat.designation = texte[nature.start():]
        resultat.coeur = coeur(resultat.designation) or None
        qualificatif = _QUALIFICATIF.match(resultat.designation).group(3)
        if qualificatif and qualificatif.strip() in ("organique", "constitutionnelle"):
            resultat.nature = qualificatif.strip()
    return resultat


# --- Index -------------------------------------------------------------------------------------


@dataclass
class Amendement:
    uid: str
    numero: int
    dossier: str
    texte: str | None
    seance: str | None
    date_sort: str | None  # AAAA-MM-JJ
    signataires: str  # libellé normalisé
    article: str | None


@dataclass
class Index:
    """Tout ce dont les méthodes ont besoin, construit une fois pour toutes."""

    # A : scrutin → dossiers dont un acte cite le scrutin
    actes: dict[str, set[str]] = field(default_factory=dict)
    # B : numéro → amendements de séance portant ce numéro
    amendements: dict[int, list[Amendement]] = field(default_factory=dict)
    # B : cœur d'un titre de texte → dossiers
    titres: dict[str, set[str]] = field(default_factory=dict)
    # B : dossier → date du premier texte déposé (AAAA-MM-JJ)
    premier_depot: dict[str, str] = field(default_factory=dict)
    # B : dossier → jours où il a été examiné en séance publique à l'Assemblée (actes « DEBATS »)
    debats: dict[str, set[str]] = field(default_factory=dict)
    # B : dossier → « organique » ou « constitutionnelle » (les autres sont ordinaires)
    natures: dict[str, str] = field(default_factory=dict)
    # C : séance → dossiers cités à son ordre du jour
    seances: dict[str, set[str]] = field(default_factory=dict)
    # cache : mots de chaque titre, pour les titres reformulés
    _mots: dict[str, frozenset[str]] | None = None

    def mots_des_titres(self) -> dict[str, frozenset[str]]:
        if self._mots is None:
            self._mots = {c: mots(c) for c in self.titres}
        return self._mots


# --- Méthodes ---------------------------------------------------------------------------------


@dataclass
class Resultat:
    dossiers: set[str]
    voie: str  # comment la méthode a conclu ou pourquoi elle a échoué
    amendement: str | None = None
    article: str | None = None
    fragile: bool = False  # dossier trouvé par le titre mais jamais examiné en séance

    @property
    def dossier(self) -> str | None:
        return next(iter(self.dossiers)) if len(self.dossiers) == 1 else None


def methode_actes(scrutin: dict, index: Index) -> Resultat:
    dossiers = index.actes.get(scrutin["uid"], set())
    if not dossiers:
        return Resultat(set(), "aucun acte ne cite le scrutin")
    if len(dossiers) > 1:
        return Resultat(dossiers, "plusieurs dossiers citent le scrutin")
    return Resultat(dossiers, "acte du dossier")


SEUIL_TITRE_APPROCHANT = 0.8


def _titres_approchants(lib: Libelle, index: Index) -> set[str]:
    """Titres reformulés (« soins palliatifs et d'accompagnement » / « l'accompagnement et
    soins palliatifs ») ou avec une faute de frappe : mêmes mots porteurs, à 80 % au moins."""
    cherches = mots(lib.coeur)
    if len(cherches) < 3:
        return set()
    meilleurs, score_max = set(), SEUIL_TITRE_APPROCHANT
    for titre, mots_titre in index.mots_des_titres().items():
        if not mots_titre:
            continue
        score = len(cherches & mots_titre) / len(cherches | mots_titre)
        if score < score_max and score >= SEUIL_TITRE_APPROCHANT - 0.2:
            # une faute de frappe sur un mot : on compare aussi les titres lettre à lettre
            score = max(score, SequenceMatcher(None, lib.coeur, titre).ratio() - 0.1)
        if score > score_max:
            meilleurs, score_max = set(index.titres[titre]), score
        elif score == score_max:
            meilleurs |= index.titres[titre]
    return meilleurs


def departager(candidats: set[str], lib: Libelle, date: str, index: Index) -> set[str]:
    """Garde, parmi plusieurs dossiers, ceux qui collent au scrutin ; sinon les rend tous."""
    for filtre in (
        lambda d: index.premier_depot.get(d, "9999") <= date,  # le texte existait déjà
        lambda d: index.natures.get(d, "ordinaire") == lib.nature,  # même nature (organique…)
        lambda d: date in index.debats.get(d, ()),  # examiné en séance ce jour-là
        lambda d: d in index.debats,  # examiné en séance un jour
    ):
        if len(candidats) > 1:
            candidats = {d for d in candidats if filtre(d)} or candidats
    return candidats


def _par_titre(lib: Libelle, date: str, index: Index) -> Resultat:
    if not lib.coeur:
        return Resultat(set(), "le libellé ne désigne aucun texte")
    candidats = set(index.titres.get(lib.coeur, set()))
    voie = "titre du texte identique"
    if not candidats:
        candidats = _titres_approchants(lib, index)
        voie = "titre du texte approchant"
    if not candidats:
        return Resultat(set(), "aucun texte de ce titre")
    candidats = departager(candidats, lib, date, index)
    if len(candidats) > 1:
        return Resultat(candidats, "plusieurs dossiers portent ce titre")
    if not candidats & index.debats.keys():
        # Un libellé peut garder le titre d'une ancienne proposition du même auteur, déposée
        # puis remplacée : le dossier trouvé n'a alors jamais été examiné en séance.
        return Resultat(candidats, voie + ", dossier jamais examiné en séance", fragile=True)
    return Resultat(candidats, voie)


def _noms(signataires: str) -> list[str]:
    """« mme colin-oesterle, m. berrios » → ['colin-oesterle', 'berrios']."""
    return [re.sub(r"^(m|mme|mm)\.\s*", "", s).strip() for s in signataires.split(",")]


def auteur_correspond(auteur: str | None, amendement: Amendement) -> bool:
    """Le titre du scrutin donne le nom complet (« M. Jean-René Cazeneuve »), les signataires
    parfois le seul nom de famille, et l'orthographe varie (« Colin-Osterlé », « Colin-Oesterle »)
    : on compare le nom de famille, à une lettre près."""
    if auteur is None:
        return True
    signataires = amendement.signataires
    if auteur == "gouvernement":
        return "gouvernement" in signataires
    if auteur == "commission":
        return "commission" in signataires or "rapporteur" in signataires
    if auteur in signataires:
        return True
    famille = auteur.split()[-1]
    return any(
        SequenceMatcher(None, famille, mot).ratio() >= 0.85
        for nom in _noms(signataires) for mot in nom.split()
    )


def methode_libelle(scrutin: dict, index: Index) -> Resultat:
    lib = analyser_libelle(scrutin["titre"], scrutin["type_vote"])
    par_titre = _par_titre(lib, scrutin["date"], index)
    if lib.numero_amendement is None:
        return par_titre

    # Le numéro d'un amendement n'est unique que dans un texte : on le cherche dans la séance du
    # scrutin, à défaut (un tiers des amendements de séance n'ont pas de séance renseignée) parmi
    # ceux dont le sort date du jour du scrutin. L'auteur doit correspondre.
    meme_numero = index.amendements.get(lib.numero_amendement, [])
    candidats = [a for a in meme_numero if a.seance and a.seance == scrutin["seance"]]
    if not candidats:
        candidats = [a for a in meme_numero if a.date_sort == scrutin["date"]]
    candidats = [a for a in candidats if auteur_correspond(lib.auteur, a)]
    dossiers = {a.dossier for a in candidats}
    if len(dossiers) > 1 and par_titre.dossiers & dossiers:
        dossiers &= par_titre.dossiers
    dossiers = departager(dossiers, lib, scrutin["date"], index)
    candidats = [a for a in candidats if a.dossier in dossiers]
    if len(dossiers) == 1:
        amendement = candidats[0] if len(candidats) == 1 else None
        voie = "amendement retrouvé"
        if par_titre.dossiers and not dossiers & par_titre.dossiers:
            voie = "amendement retrouvé, titre du texte différent"
        return Resultat(dossiers, voie, amendement=amendement.uid if amendement else None,
                        article=amendement.article if amendement else None)
    if dossiers:
        return Resultat(dossiers, "plusieurs amendements possibles")
    par_titre.voie = f"amendement introuvable ; {par_titre.voie}"
    return par_titre


def methode_seance(scrutin: dict, index: Index) -> Resultat:
    dossiers = index.seances.get(scrutin["seance"], set())
    if not dossiers:
        return Resultat(set(), "l'ordre du jour de la séance ne cite aucun dossier")
    if len(dossiers) > 1:
        return Resultat(dossiers, "l'ordre du jour cite plusieurs dossiers")
    return Resultat(dossiers, "seul dossier de la séance")


# Votes qui ne portent sur aucun texte : le seul dossier de la séance n'est pas leur objet.
SANS_TEXTE = {"déclaration", "motion de censure"}


def combiner(actes: Resultat, libelle: Resultat, seance: Resultat,
             categorie_scrutin: str | None = None) -> Resultat:
    """Ordre de confiance : amendement retrouvé, acte du dossier, titre, séance, recoupement.

    Exceptions : un titre qui mène à un dossier jamais examiné en séance cède devant l'agenda ;
    l'agenda seul ne conclut pas pour un vote sans texte (déclaration, motion de censure)."""
    if libelle.dossier and libelle.voie.startswith("amendement retrouvé"):
        return Resultat(libelle.dossiers, "B · " + libelle.voie, libelle.amendement,
                        libelle.article)
    fragile = libelle.fragile and not actes.dossier
    if fragile and seance.dossier and seance.dossier != libelle.dossier:
        return Resultat(seance.dossiers, "C · seul dossier de la séance, titre écarté")
    methodes = [("A", actes), ("B", libelle)]
    if categorie_scrutin not in SANS_TEXTE:
        methodes.append(("C", seance))
    for nom, resultat in methodes:
        if resultat.dossier:
            return Resultat(resultat.dossiers, f"{nom} · {resultat.voie}", resultat.amendement,
                            resultat.article)
    for (nom1, r1), (nom2, r2) in (
        (("B", libelle), ("C", seance)), (("A", actes), ("C", seance)),
        (("A", actes), ("B", libelle)),
    ):
        commun = r1.dossiers & r2.dossiers
        if len(commun) == 1:
            return Resultat(commun, f"{nom1} ∩ {nom2} · recoupement")
    return Resultat(set(), "aucune méthode ne conclut")
