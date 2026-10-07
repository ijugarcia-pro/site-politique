"""Vulgarisation d'un texte de loi : découpage du texte, consignes, schéma de sortie, contrôles.

Une fiche vulgarisée contient une question fermée, une phrase « Concrètement » et trois cartes
« Ce que ça change », chacune rattachée à un article du texte voté par un extrait recopié mot pour
mot. Elle n'est publiée que si elle passe les 7 contrôles décrits dans
docs/vulgarisation-controles.md. Les six premiers sont faits ici, sans appel réseau ; le
septième (fidélité) est rendu par une relecture automatique séparée, dont ce module fournit les
consignes et le schéma.
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from html.parser import HTMLParser

# --- Texte d'un document de l'Assemblée -------------------------------------------------------

URL_DOCUMENT = "https://www.assemblee-nationale.fr/dyn/opendata/{uid}.html"


class _Texte(HTMLParser):
    BLOCS = {"p", "div", "br", "h1", "h2", "h3", "h4", "h5", "li", "tr", "table"}
    IGNORES = {"style", "script", "head"}

    def __init__(self):
        super().__init__()
        self.morceaux: list[str] = []
        self.ignore = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.IGNORES:
            self.ignore += 1
        elif tag in self.BLOCS:
            self.morceaux.append("\n")

    def handle_endtag(self, tag):
        if tag in self.IGNORES:
            self.ignore = max(0, self.ignore - 1)
        elif tag in self.BLOCS:
            self.morceaux.append("\n")

    def handle_data(self, data):
        if not self.ignore:
            self.morceaux.append(data)


def texte_du_html(page: str) -> str:
    """Texte brut d'un document HTML de l'Assemblée : une ligne par paragraphe."""
    parseur = _Texte()
    parseur.feed(page)
    texte = "".join(parseur.morceaux).replace("\xa0", " ").replace(" ", " ")
    lignes = (re.sub(r"[ \t]+", " ", ligne).strip() for ligne in texte.splitlines())
    return "\n".join(ligne for ligne in lignes if ligne)


TITRE_ARTICLE = re.compile(
    r"^Article\s+(unique|premier|1er|\d+)"
    r"((?:\s+(?:bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies|[A-Z]{1,3})\b)*)"
    r"\s*(?:\(.*\))?$"
)
TITRE_DIVISION = re.compile(r"^(TITRE|CHAPITRE|Section|Sous-section)\b")


def cle_article(libelle: str) -> str:
    """« Article 1er », « article premier », « Art. 1er » → « 1er » ;
    « Article 2 bis » → « 2 bis »."""
    texte = normaliser(libelle)
    texte = re.sub(r"^(l'|les )?(article|art\.?)\s+", "", texte)
    texte = re.sub(r"\bpremier\b", "1er", texte)
    texte = re.sub(r"\(.*\)", "", texte)
    return re.sub(r"\s+", " ", texte).strip()


def articles(texte: str) -> dict[str, str]:
    """Articles d'un texte de loi, dans l'ordre : {« Article 1er » : « contenu », …}.

    Les intitulés de titres et de chapitres et les articles supprimés sont écartés ; un article
    qui apparaît deux fois garde sa première occurrence."""
    resultat: dict[str, list[str]] = {}
    courant = None
    for ligne in texte.splitlines():
        if TITRE_ARTICLE.match(ligne):
            courant = re.sub(r"\s*\(.*\)$", "", ligne).strip()
            if courant in resultat:
                courant = None  # doublon : on ignore la suite
            else:
                resultat[courant] = []
        elif TITRE_DIVISION.match(ligne):
            continue
        elif courant is not None:
            resultat[courant].append(ligne)
    textes = {titre: "\n".join(lignes).strip() for titre, lignes in resultat.items()}
    # Un article supprimé au cours de la navette ne contient que « (Supprimé) ».
    return {t: c for t, c in textes.items() if normaliser(c).strip("() .") not in ("", "supprime")}


def expose_des_motifs(texte: str) -> str | None:
    """Exposé des motifs d'un texte déposé : entre son titre et le premier article (ou la formule
    « Le Premier ministre » d'un projet de loi)."""
    debut = re.search(r"(?m)^EXPOS[ÉE] DES MOTIFS\s*$", texte)
    if not debut:
        return None
    suite = texte[debut.end():]
    # Fin de l'exposé : premier article, décret de présentation d'un projet de loi, ou numéro de
    # la première page du dispositif (« – 1 – »).
    fin = re.search(r"(?m)^(Article\s|Le Premier ministre\s*[,:]?\s*$"
                    r"|Le Président de la République,\s*$|– 1 –$"
                    r"|(?i:(projet|proposition) de loi( organique| constitutionnelle)?)\s*$)",
                    suite)
    return (suite[: fin.start()] if fin else suite).strip() or None


# --- Normalisation pour les contrôles ---------------------------------------------------------


def normaliser(texte: str | None) -> str:
    """Minuscules, sans accents, apostrophes et tirets simples, espaces simples."""
    if not texte:
        return ""
    texte = texte.replace("’", "'").replace("‘", "'").replace("‑", "-").replace("–", "-")
    texte = texte.replace("œ", "oe").replace("Œ", "Oe").replace("«", '"').replace("»", '"')
    texte = unicodedata.normalize("NFKD", texte)
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texte.lower()).strip()


# --- Consignes et schéma ----------------------------------------------------------------------

LONGUEURS = {"question": (20, 150), "concretement": (40, 300), "titre": (5, 60),
             "texte": (40, 240), "extrait": (15, 220)}

SCHEMA_FICHE = {
    "type": "object",
    "properties": {
        "question": {"type": "string"},
        "concretement": {"type": "string"},
        "cartes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "titre": {"type": "string"},
                    "texte": {"type": "string"},
                    "article": {"type": "string"},
                    "extrait": {"type": "string"},
                },
                "required": ["titre", "texte", "article", "extrait"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["question", "concretement", "cartes"],
    "additionalProperties": False,
}

CONSIGNES = f"""Tu rédiges, pour le site « Le 578e siège », la fiche qui présente un texte de loi \
voté à l'Assemblée nationale à des personnes qui ne suivent pas la politique. Le site ne prend \
jamais parti : il décrit ce que le texte change, pour que chacun se fasse son avis.

La fiche contient :
- « question » : une question fermée, à laquelle on répond par oui ou par non, qui résume la \
décision. Répondre « oui » doit revenir à voter pour le texte. Elle commence de préférence par \
« Faut-il ». Elle n'oriente pas la réponse. Entre {LONGUEURS['question'][0]} et \
{LONGUEURS['question'][1]} caractères.
- « concretement » : une phrase qui dit ce que fait le texte, en langage courant. Entre \
{LONGUEURS['concretement'][0]} et {LONGUEURS['concretement'][1]} caractères.
- « cartes » : exactement trois cartes « Ce que ça change », chacune sur une mesure précise du \
texte voté, de la plus importante à la moins importante. Pour chaque carte :
  - « titre » : quelques mots ({LONGUEURS['titre'][1]} caractères au plus) ;
  - « texte » : ce que la mesure change, pour qui, concrètement \
({LONGUEURS['texte'][0]} à {LONGUEURS['texte'][1]} caractères) ;
  - « article » : l'intitulé exact de l'article du texte voté qui prévoit la mesure, tel qu'il \
apparaît dans le texte (par exemple « Article 2 » ou « Article unique ») ;
  - « extrait » : un passage de cet article, recopié mot pour mot, sans rien changer ni couper \
au milieu d'un mot, qui prouve ce que dit la carte ({LONGUEURS['extrait'][1]} caractères au plus).

Règles :
- Décris ce que le texte prévoit, pas ce qu'il produira. Ne fais aucune prédiction d'effet qui \
ne soit pas écrite dans le texte.
- L'exposé des motifs donne les arguments des auteurs : sers-t'en pour comprendre le texte, \
jamais pour présenter leurs objectifs comme des faits. Ne reprends ni leurs jugements ni leur \
vocabulaire militant.
- Aucun adjectif ou adverbe qui juge (« historique », « dangereux », « enfin », « courageux », \
« bonne nouvelle »…). Aucun nom de parti, de groupe politique, de responsable politique ni \
d'étiquette (gauche, droite…).
- Langage courant : phrases courtes, pas de jargon juridique ; si un terme technique est \
indispensable, explique-le en quelques mots. Ne t'adresse pas au lecteur (ni « tu » ni « vous »).
- Chiffres : n'écris un nombre en chiffres que s'il est écrit en chiffres dans le texte ou \
l'exposé ; s'il y est écrit en lettres, écris-le en lettres. N'ajoute aucun chiffre qui n'y \
figure pas.
- Ne cite que des articles du texte voté, fourni entre les balises <texte_vote>. Si le texte n'a \
qu'un article, les trois cartes peuvent toutes le citer.
"""

CONSIGNES_RELECTURE = """Tu relis, pour le site « Le 578e siège », une fiche qui vulgarise un \
texte de loi. Tu reçois la fiche, les articles qu'elle cite et l'exposé des motifs. Pour chaque \
élément (la question, la phrase « Concrètement », chacune des trois cartes), dis s'il est fidèle \
au texte : il ne dit rien que les articles ne prévoient pas, ne déforme pas leur portée, et ne \
présente pas les objectifs des auteurs comme des faits. Dis aussi s'il est neutre : il ne prend \
pas parti, n'oriente pas la réponse et ne juge pas. Sois exigeant mais factuel : une \
simplification exacte est acceptable, une approximation qui change le sens ne l'est pas. Pour \
tout élément non fidèle ou non neutre, explique le problème en une phrase."""

SCHEMA_RELECTURE = {
    "type": "object",
    "properties": {
        "elements": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "element": {"type": "string",
                                "enum": ["question", "concretement", "carte 1", "carte 2",
                                         "carte 3"]},
                    "fidele": {"type": "boolean"},
                    "neutre": {"type": "boolean"},
                    "probleme": {"type": "string"},
                },
                "required": ["element", "fidele", "neutre", "probleme"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["elements"],
    "additionalProperties": False,
}


def message_redaction(titre_scrutin: str, expose: str | None, texte: dict[str, str],
                      erreurs: list[str] | None = None) -> str:
    """Message de demande : le vote, l'exposé des motifs, puis le texte voté article par article.

    `erreurs` : problèmes relevés par les contrôles sur une première version, pour la seconde
    tentative."""
    blocs = [f"<vote>{titre_scrutin}</vote>"]
    if expose:
        blocs.append(f"<expose_des_motifs>\n{expose}\n</expose_des_motifs>")
    corps = "\n\n".join(f"<article intitule=\"{titre}\">\n{contenu}\n</article>"
                        for titre, contenu in texte.items())
    blocs.append(f"<texte_vote>\n{corps}\n</texte_vote>")
    if erreurs:
        blocs.append("Une première version de la fiche a échoué aux contrôles suivants. "
                     "Rédige une nouvelle fiche qui les respecte :\n"
                     + "\n".join(f"- {e}" for e in erreurs))
    else:
        blocs.append("Rédige la fiche de ce texte.")
    return "\n\n".join(blocs)


def message_relecture(fiche: dict, texte: dict[str, str], expose: str | None) -> str:
    cites = {cle_article(c["article"]) for c in fiche.get("cartes", [])}
    corps = "\n\n".join(f"<article intitule=\"{t}\">\n{c}\n</article>"
                        for t, c in texte.items() if cle_article(t) in cites)
    blocs = [f"<fiche>\n{json.dumps(fiche, ensure_ascii=False, indent=1)}\n</fiche>",
             f"<articles_cites>\n{corps}\n</articles_cites>"]
    if expose:
        blocs.append(f"<expose_des_motifs>\n{expose}\n</expose_des_motifs>")
    blocs.append("Relis cette fiche.")
    return "\n\n".join(blocs)


# --- Contrôles --------------------------------------------------------------------------------


@dataclass
class Controle:
    numero: int
    nom: str
    reussi: bool
    erreurs: list[str] = field(default_factory=list)


def controle_format(sortie: str) -> tuple[Controle, dict | None]:
    """1. JSON valide, conforme au schéma, trois cartes, aucun champ vide."""
    erreurs = []
    try:
        fiche = json.loads(sortie)
    except (json.JSONDecodeError, TypeError):
        return Controle(1, "format", False, ["la sortie n'est pas un JSON valide"]), None
    if not isinstance(fiche, dict):
        return Controle(1, "format", False, ["la sortie n'est pas un objet JSON"]), None
    for cle in ("question", "concretement"):
        if not isinstance(fiche.get(cle), str) or not fiche[cle].strip():
            erreurs.append(f"le champ « {cle} » est absent ou vide")
    cartes = fiche.get("cartes")
    if not isinstance(cartes, list) or len(cartes) != 3:
        erreurs.append("il faut exactement trois cartes")
    else:
        for i, carte in enumerate(cartes, 1):
            for cle in ("titre", "texte", "article", "extrait"):
                if not isinstance(carte, dict) or not str(carte.get(cle, "")).strip():
                    erreurs.append(f"carte {i} : le champ « {cle} » est absent ou vide")
    return Controle(1, "format", not erreurs, erreurs), (fiche if not erreurs else None)


def _champs(fiche: dict):
    yield "question", "question", fiche["question"]
    yield "concretement", "concretement", fiche["concretement"]
    for i, carte in enumerate(fiche["cartes"], 1):
        yield f"carte {i}, titre", "titre", carte["titre"]
        yield f"carte {i}, texte", "texte", carte["texte"]
        yield f"carte {i}, extrait", "extrait", carte["extrait"]


def controle_longueurs(fiche: dict) -> Controle:
    """2. Chaque champ respecte sa longueur (en caractères)."""
    erreurs = []
    for nom, cle, valeur in _champs(fiche):
        mini, maxi = LONGUEURS[cle]
        if not mini <= len(valeur) <= maxi:
            erreurs.append(f"{nom} : {len(valeur)} caractères (attendu de {mini} à {maxi})")
    return Controle(2, "longueurs", not erreurs, erreurs)


def controle_articles(fiche: dict, texte: dict[str, str]) -> Controle:
    """3. Chaque carte cite un article qui existe dans le texte voté, et son extrait figure mot
    pour mot dans cet article."""
    par_cle = {cle_article(titre): contenu for titre, contenu in texte.items()}
    erreurs = []
    for i, carte in enumerate(fiche["cartes"], 1):
        contenu = par_cle.get(cle_article(carte["article"]))
        if contenu is None:
            erreurs.append(f"carte {i} : « {carte['article']} » n'est pas un article du texte voté")
        elif normaliser(carte["extrait"]).strip(" .…\"") not in normaliser(contenu):
            erreurs.append(f"carte {i} : l'extrait ne figure pas mot pour mot dans "
                           f"« {carte['article']} »")
    return Controle(3, "articles", not erreurs, erreurs)


_INTERROGATIFS = re.compile(
    r"^(comment|pourquoi|quel|quelle|quels|quelles|combien|ou |qui |que |quoi|lequel|laquelle)\b"
)


def controle_question(fiche: dict) -> Controle:
    """4. Question fermée : se termine par « ? », une seule question, pas de mot interrogatif
    ouvert, pas d'alternative (« ou bien »)."""
    question = fiche["question"].strip()
    q = normaliser(question)
    erreurs = []
    if not question.endswith("?"):
        erreurs.append("la question ne se termine pas par « ? »")
    if question.count("?") > 1:
        erreurs.append("la question en contient plusieurs")
    if _INTERROGATIFS.match(q):
        erreurs.append("la question est ouverte (comment, pourquoi, quel…)")
    if re.search(r"\bou (bien|plutot)\b|\bou non\b", q):
        erreurs.append("la question propose une alternative au lieu d'un oui ou non")
    return Controle(4, "question fermée", not erreurs, erreurs)


# Vocabulaire qui juge ou qui situe politiquement. La liste est volontairement courte et sûre :
# la relecture (contrôle 7) couvre les cas plus subtils.
VOCABULAIRE_INTERDIT = [
    "historique", "scandale", "scandaleux", "scandaleuse", "inacceptable", "inadmissible",
    "courageux", "courageuse", "dangereux", "dangereuse", "enfin", "bonne nouvelle",
    "mauvaise nouvelle", "heureusement", "malheureusement", "regrettable", "honteux", "honteuse",
    "liberticide", "cadeau", "casse sociale", "deni", "absurde", "ideologique", "laxisme",
    "laxiste", "injuste", "salutaire", "revolutionnaire",
    "gauche", "droite", "extreme", "macronie", "macroniste", "insoumis",
    "rassemblement national", "republicains", "socialistes", "ecologistes", "communistes",
    "majorite presidentielle", "nous", "notre", "nos", "vous", "votre", "vos", "tu", "tes",
]
_INTERDIT = re.compile(r"\b(" + "|".join(re.escape(m) for m in VOCABULAIRE_INTERDIT) + r")\b")


def controle_vocabulaire(fiche: dict) -> Controle:
    """5. Aucun mot de jugement, aucune étiquette politique, aucune adresse au lecteur."""
    erreurs = []
    for nom, cle, valeur in _champs(fiche):
        if cle == "extrait":  # recopié du texte : il peut contenir n'importe quel mot
            continue
        for mot in sorted(set(_INTERDIT.findall(normaliser(valeur)))):
            erreurs.append(f"{nom} : mot à éviter « {mot} »")
    return Controle(5, "vocabulaire neutre", not erreurs, erreurs)


def nombres(texte: str) -> set[str]:
    """Nombres écrits en chiffres, sans séparateurs (« 4 500 » → « 4500 », « 2,5 » → « 2,5 »).
    Les ordinaux d'articles (« 1er ») et les numéros d'article cités sont ignorés."""
    texte = re.sub(r"(?i)\b(article|art\.)\s+[\w-]+", " ", texte)
    texte = re.sub(r"\b\d+er\b", " ", texte)
    trouves = re.findall(r"\d{1,3}(?:[   ]\d{3})+(?:,\d+)?|\d+(?:,\d+)?", texte)
    return {re.sub(r"[   ]", "", n) for n in trouves}


def controle_chiffres(fiche: dict, sources: str) -> Controle:
    """6. Tout nombre écrit en chiffres dans la fiche figure en chiffres dans le texte voté ou
    l'exposé des motifs."""
    connus = nombres(sources)
    erreurs = []
    for nom, cle, valeur in _champs(fiche):
        if cle == "extrait":
            continue
        for n in sorted(nombres(valeur) - connus):
            erreurs.append(f"{nom} : le nombre {n} ne figure pas dans le texte")
    return Controle(6, "chiffres", not erreurs, erreurs)


def controle_relecture(sortie: str | None) -> Controle:
    """7. Fidélité et neutralité, jugées par une relecture automatique séparée."""
    if sortie is None:
        return Controle(7, "fidélité", False, ["la relecture n'a pas pu être faite"])
    try:
        elements = json.loads(sortie)["elements"]
    except (json.JSONDecodeError, KeyError, TypeError):
        return Controle(7, "fidélité", False, ["la relecture n'a pas rendu un JSON valide"])
    erreurs = []
    vus = {e.get("element") for e in elements}
    for attendu in ("question", "concretement", "carte 1", "carte 2", "carte 3"):
        if attendu not in vus:
            erreurs.append(f"la relecture n'a pas jugé « {attendu} »")
    for e in elements:
        if not e.get("fidele"):
            erreurs.append(f"{e.get('element')} : non fidèle — {e.get('probleme', '')}".strip())
        if not e.get("neutre"):
            erreurs.append(f"{e.get('element')} : non neutre — {e.get('probleme', '')}".strip())
    return Controle(7, "fidélité", not erreurs, erreurs)


def controles_locaux(sortie: str, texte: dict[str, str], expose: str | None
                     ) -> tuple[list[Controle], dict | None]:
    """Les contrôles 1 à 6. Si le format échoue, les suivants ne peuvent pas être faits."""
    format_, fiche = controle_format(sortie)
    if fiche is None:
        return [format_], None
    sources = "\n".join(texte.values()) + "\n" + (expose or "")
    return [
        format_,
        controle_longueurs(fiche),
        controle_articles(fiche, texte),
        controle_question(fiche),
        controle_vocabulaire(fiche),
        controle_chiffres(fiche, sources),
    ], fiche


# --- Coût -------------------------------------------------------------------------------------

# Claude Opus 5.5, tarif public au 25 septembre 2026, en dollars par million de jetons.
PRIX = {"claude-opus-5-5": {"entree": 4.00, "sortie": 20.00}}


def cout(modele: str, jetons_entree: int, jetons_sortie: int) -> float:
    prix = PRIX[modele]
    return (jetons_entree * prix["entree"] + jetons_sortie * prix["sortie"]) / 1_000_000
