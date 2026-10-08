"""Prépare les 5 lots de 3 votes qui suivent le quiz d'entrée (tâche t42).

Usage :
    uv run python -m scripts.preparer_lots [--base data/site.duckdb] [--textes data/raw/textes]

Un lot = 3 votes au format d'une séance (décision de Julien du 8 octobre 2026,
docs/cadrage-produit.md) : 10 votes du quiz + 5 lots de 3 = 25 votes, le seuil où la précision
devient fiable (1 − e^(−25/20) ≈ 71 %). Critères : ceux du quiz (des sujets de société à objet
unique, compris en une phrase), plus deux : départager les groupes que le quiz sépare mal, et
varier les thèmes.

Chaque candidat est une carte de vote (pipeline/cartes.py) rédigée d'après le texte adopté par
l'Assemblée (à défaut, le texte de la commission, qui est alors le texte voté), et passée aux
contrôles 2, 4, 5 et 6 des fiches. Les lots sont composés un par un : chaque lot est le trio de
thèmes différents qui, ajouté au quiz et aux lots précédents, sépare le mieux les paires de
groupes encore les moins séparées. Le premier lot rapporte donc le plus à celui qui s'arrête
tôt.

Produit :
    docs/lots-candidats.md                 la grille à cocher par Julien (t43)
    data/mesures/lots/candidats.json       les candidats, leurs positions et la proposition
`data/lots.json` n'est écrit qu'après la validation de Julien (t43).
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import duckdb

from pipeline import cartes
from scripts import preparer_quiz as pq

RACINE = Path(__file__).resolve().parent.parent
BASE = RACINE / "data" / "site.duckdb"
TEXTES = RACINE / "data" / "raw" / "textes"
QUIZ = RACINE / "data" / "quiz.json"
SORTIE = RACINE / "docs" / "lots-candidats.md"
DONNEES = RACINE / "data" / "mesures" / "lots" / "candidats.json"
N_LOTS = 5
MAX_PAR_THEME = 2  # sur les 15 votes des lots
PAIRES_AFFICHEES = 4
PARTICIPATION_MINIMALE = 20  # en pour cent : en dessous, trop peu de députés à comparer
RESOLUTION = pq.RESOLUTION


@dataclass(frozen=True)
class Candidat:
    numero: int
    theme: str
    titre: str
    question: str
    concretement: str
    verifie: str
    reserve: str = ""
    # Texte voté (adopté, ou de la commission s'il n'y a pas de texte adopté) puis texte déposé
    # avec son exposé des motifs : les chiffres de la carte doivent y figurer (contrôle 6).
    sources: tuple[str, ...] = ()

    def carte(self, uid: str) -> cartes.Carte:
        return cartes.Carte(uid, self.numero, self.theme, self.titre, self.question,
                            self.concretement)


def uid(numero: int) -> str:
    return f"VTANR5L17V{numero}"


# Les 6 candidats du quiz contrôlés et non retenus (t20) : question et « Concrètement » de
# scripts/preparer_quiz.py, thème ramené à la liste fermée, titre court ajouté.
REPRIS = {2958: ("Immigration", "La rétention des étrangers condamnés allongée"),
          5106: ("Sécurité", "Les Frères musulmans sur la liste terroriste de l'UE"),
          7905: ("Sécurité", "36 milliards d'euros de plus pour les armées"),
          881: ("Économie", "Un impôt plancher sur les très grands patrimoines"),
          852: ("Environnement", "Les PFAS interdits dans cosmétiques et vêtements"),
          7380: ("Économie", "La nationalisation d'ArcelorMittal France")}

# Rédigés en session (8 octobre 2026) d'après le texte adopté par l'Assemblée, lu en entier.
NOUVEAUX = [
    Candidat(2256, "Santé", "Le don du sang sur le temps de travail",
             "Faut-il permettre aux salariés de donner leur sang pendant leurs heures de "
             "travail, sans perte de salaire ?",
             "Les salariés et les agents publics pourraient s'absenter, sans perte de salaire, "
             "pour donner leur sang, leurs plaquettes ou leur plasma, dans la limite de huit "
             "absences par an. L'employeur peut s'y opposer pour des raisons d'organisation.",
             "Texte adopté, article 1er (autorisation d'absence, rémunération maintenue).",
             sources=("PIONANR5L17BTA0132", "PIONANR5L17B0732")),
    Candidat(606, "Éducation", "Le repas à 1 euro pour tous les étudiants",
             "Faut-il plafonner à 1 euro le prix du repas étudiant dans tous les restaurants "
             "universitaires ?",
             "Le repas à tarif modéré servi aux étudiants dans tous les restaurants des Crous ne "
             "pourrait pas coûter plus de 1 euro, sur place comme à emporter.",
             "Texte adopté, article 1er.",
             "Le texte s'applique à l'offre à tarif modéré ouverte à tous les étudiants ; le "
             "repas à 1 euro était jusque-là réservé aux boursiers et aux étudiants en "
             "difficulté (exposé des motifs).",
             sources=("PIONANR5L17BTA0028", "PIONANR5L17B0519")),
    Candidat(600, "Santé", "Un nombre minimum de soignants à l'hôpital",
             "Faut-il fixer un nombre minimum de soignants par patient dans les hôpitaux ?",
             "Pour chaque spécialité, un décret fixerait, après avis de la Haute Autorité de "
             "santé, un nombre minimum de soignants par lit. Un hôpital public qui ne peut le "
             "respecter plus de trois jours devrait prévenir l'agence régionale de santé.",
             "Texte adopté (article unique, II : articles L. 6124-3 et L. 6124-5).",
             "Texte venu du Sénat ; le ratio s'applique à partir du 1er janvier 2027.",
             sources=("PIONANR5L17BTA0027", "PIONANR5L17B0104")),
    Candidat(4244, "Économie", "S'opposer à l'accord avec le Mercosur",
             "Faut-il demander au Gouvernement de s'opposer à l'accord de libre-échange entre "
             "l'Union européenne et le Mercosur ?",
             f"{RESOLUTION} invite le Gouvernement à s'opposer à l'accord de libre-échange entre "
             "l'Union européenne et les pays du Mercosur, en réunissant une minorité de blocage "
             "au Conseil de l'Union, et à saisir la Cour de justice de l'Union.",
             "Proposition de résolution (article 34-1 de la Constitution) : dispositif.",
             "Le Mercosur réunit des pays d'Amérique du Sud ; la carte ne le dit pas, faute de "
             "le lire dans le texte.",
             sources=("RIONANR5L17BTA0182", "PNREANR5L17B2044")),
    Candidat(6045, "Institutions", "L'Alsace, une collectivité unique",
             "Faut-il que l'Alsace devienne une collectivité unique, avec les compétences d'un "
             "département et d'une région ?",
             "La Collectivité européenne d'Alsace deviendrait « l'Alsace », une collectivité à "
             "statut particulier qui exercerait les compétences des départements et des "
             "régions, avec une assemblée élue en même temps que les conseils régionaux.",
             "Texte adopté, article 2.",
             "Sujet régional. L'article 1er, qui permettait à d'autres départements regroupés "
             "de reprendre les compétences de leur région, a été supprimé en commission.",
             sources=("PIONANR5L17BTA0264", "PIONANR5L17B1800")),
    Candidat(3273, "Économie", "Le pays d'origine sur toutes les étiquettes",
             "Faut-il rendre obligatoire l'indication du pays d'origine sur tous les produits "
             "alimentaires ?",
             "L'étiquette de tout produit agricole ou alimentaire, brut ou transformé, devrait "
             "indiquer son pays d'origine, ainsi que celui de l'ingrédient principal et de "
             "chaque ingrédient qui représente 10 % ou plus du produit.",
             "Texte de la commission (texte voté), article 1er.",
             "Texte rejeté. Il prévoyait aussi des sanctions, et un étiquetage des produits "
             "importés faits avec des produits phytosanitaires interdits dans l'Union.",
             sources=("PIONANR5L17BTC1985", "PIONANR5L17B1837")),
    Candidat(7408, "Logement", "Le logement social lié à l'emploi public",
             "Faut-il qu'un agent public logé grâce à son employeur puisse perdre ce logement "
             "quand il quitte son poste ?",
             "Un agent public, ou un salarié des transports publics dans les zones tendues, logé "
             "sur proposition de son employeur pourrait voir son bail résilié dans l'année qui "
             "suit la fin de son emploi, avec un préavis d'au moins six mois.",
             "Texte adopté (commission mixte paritaire), article 1er : clause de fonction.",
             "Le texte contient d'autres mesures pour loger ces travailleurs (terrains publics "
             "vendus moins cher, constructions dérogatoires) : la question retient la plus "
             "débattue.",
             sources=("PIONANR5L17BTA0316", "PIONANR5L17B1332")),
    Candidat(4745, "Logement", "L'encadrement des loyers rendu permanent",
             "Faut-il rendre permanent l'encadrement des loyers et l'ouvrir à toutes les "
             "communes où se loger est difficile ?",
             "L'encadrement des loyers ne serait plus une expérimentation : les villes où l'offre "
             "de logements ne suffit pas à la demande pourraient l'appliquer durablement, sur "
             "tout ou partie de leur territoire.",
             "Texte adopté, article 1er.",
             "Le texte double aussi les amendes des bailleurs qui ne respectent pas "
             "l'encadrement et oblige à justifier un congé pour vente : la question retient la "
             "mesure principale.",
             sources=("PIONANR5L17BTA0196", "PIONANR5L17B2039")),
    Candidat(2244, "Institutions", "Le vote par correspondance des détenus limité",
             "Faut-il limiter le vote par correspondance des personnes détenues aux élections "
             "européennes et aux référendums ?",
             "Une personne détenue ne pourrait plus voter par correspondance, depuis la commune "
             "de sa prison, qu'aux élections où la France forme une seule circonscription, comme "
             "les européennes, et aux référendums.",
             "Texte adopté, article unique (code électoral, article L. 12-1).",
             "Le texte de la commission disait l'inverse (bureau de vote dans chaque prison) : "
             "la séance l'a réécrit. Les européennes ne sont pas nommées dans le texte.",
             sources=("PIONANR5L17BTA0131", "PIONANR5L17B1163")),
    Candidat(1330, "Institutions", "Paris, Lyon, Marseille : deux votes municipaux",
             "Faut-il élire le conseil municipal de Paris, Lyon et Marseille séparément des "
             "conseils d'arrondissement ?",
             "À Paris, Lyon et Marseille, le conseil de la ville et les conseils "
             "d'arrondissement seraient élus par deux scrutins distincts, au lieu d'un seul "
             "vote par secteur. La liste arrivée en tête dans la ville aurait une prime d'un "
             "quart des sièges.",
             "Texte adopté, articles 1er (L. 271, L. 272-4-1) et 4.",
             "Première lecture ; la loi a été adoptée définitivement le 10 juillet 2025 "
             "(scrutin n° 3018, participation plus faible).",
             sources=("PIONANR5L17BTA0098", "PIONANR5L17B0451")),
    Candidat(2272, "Économie", "Les allocations familiales dès le premier enfant",
             "Faut-il verser les allocations familiales dès le premier enfant ?",
             "Les familles toucheraient les allocations familiales dès leur premier enfant, et "
             "non plus à partir du deuxième.",
             "Texte de la commission, article 1er (aucun texte adopté publié).",
             sources=("PIONANR5L17BTC1473", "PIONANR5L17B1342")),
    Candidat(7494, "Environnement", "La publicité pour la mode ultra-express interdite",
             "Faut-il interdire la publicité pour la mode ultra-express, y compris par les "
             "influenceurs ?",
             "Le texte définit la mode ultra-express, qui met en vente un très grand nombre de "
             "nouveaux vêtements peu réparables, et en interdit la publicité, y compris par les "
             "influenceurs, à partir du 1er janvier 2027.",
             "Texte adopté (commission mixte paritaire), articles 1er, 3 et 3 bis.",
             "Le texte contient d'autres mesures (affichage du lieu de fabrication, "
             "éco-contribution modulée) : la question retient la plus visible.",
             sources=("PIONANR5L17BTA0321", "PIONANR5L17B1557")),
    Candidat(1306, "Énergie", "Les centrales à charbon converties",
             "Faut-il faciliter la conversion des centrales électriques au charbon vers des "
             "combustibles moins émetteurs ?",
             "Les centrales au charbon converties pour émettre moins de 550 grammes de dioxyde "
             "de carbone par kilowattheure seraient traitées comme de nouvelles installations ; "
             "les entreprises publiques qui en exploitent présenteraient un plan avant fin 2026.",
             "Texte de la commission, articles 1er et 4 (texte venu du Sénat).",
             "Seul le groupe écologiste s'est abstenu ; tous les autres ont voté pour.",
             sources=("PIONANR5L17BTC1202", "PIONANR5L17B1173")),
    Candidat(6124, "Sécurité", "Les rave-parties non déclarées punies de prison",
             "Faut-il punir de prison l'organisation d'une rave-party non déclarée ou "
             "interdite ?",
             "Aider à organiser une rave-party d'au moins 250 personnes sans déclaration ou "
             "malgré une interdiction serait puni de six mois de prison et de 30 000 euros "
             "d'amende, avec confiscation du matériel.",
             "Texte adopté, articles 1er et 2.",
             "Le texte parle de « rassemblement festif à caractère musical », pas de "
             "rave-party.",
             sources=("PIONANR5L17BTA0268", "PIONANR5L17B1133")),
    Candidat(2217, "Sécurité", "Le délit d'homicide routier",
             "Faut-il créer un délit d'homicide routier pour les conducteurs qui tuent en ayant "
             "bu, pris des stupéfiants ou commis une faute délibérée ?",
             "Un conducteur qui cause la mort sans le vouloir commettrait un « homicide "
             "routier », puni de sept ans de prison et de 100 000 euros d'amende, s'il "
             "conduisait ivre ou drogué, ou en violant délibérément une règle de sécurité.",
             "Texte adopté (deuxième lecture), article 1er (article 221-18 du code pénal).",
             "Le texte compte d'autres cas (sans permis, grand excès de vitesse, délit de "
             "fuite…) et d'autres mesures de sécurité routière.",
             sources=("PIONANR5L17BTA0128", "PIONANR5L17B0157")),
    Candidat(4754, "Immigration", "Les titres de séjour renouvelés automatiquement",
             "Faut-il renouveler automatiquement les titres de séjour de longue durée des "
             "étrangers ?",
             "La carte de séjour pluriannuelle et la carte de résident seraient renouvelées "
             "automatiquement ; sans réponse de l'administration quatre mois après une demande "
             "de renouvellement, celle-ci serait acceptée.",
             "Texte adopté, article 1er.",
             sources=("PIONANR5L17BTA0197", "PIONANR5L17B1799")),
    Candidat(4723, "Droits", "Les jeunes isolés hébergés pendant leur recours",
             "Faut-il continuer d'héberger un jeune qui se dit mineur et isolé tant que le juge "
             "n'a pas tranché son recours ?",
             "Un jeune qui se dit mineur et isolé, mais n'a pas été reconnu comme tel, resterait "
             "hébergé en urgence pendant son recours devant le juge. Le texte interdit aussi "
             "d'évaluer son âge par un examen des os, des dents ou de la puberté.",
             "Texte adopté, articles 1er et 1er ter.",
             sources=("PIONANR5L17BTA0195", "PIONANR5L17B2021")),
    Candidat(5358, "Sécurité", "Protéger ceux qui agissent contre les réseaux",
             "Faut-il que l'État protège les personnes menacées parce qu'elles agissent contre "
             "la criminalité organisée ?",
             "Les personnes mises en danger parce qu'elles rassemblent des preuves contre la "
             "criminalité organisée, aident ses victimes ou agissent pour la faire reculer, "
             "ainsi que leurs proches, seraient protégées par la police et la gendarmerie.",
             "Texte adopté, article 1er (article L. 22-12-1 du code de la sécurité intérieure).",
             sources=("PIONANR5L17BTA0236", "PIONANR5L17B2310")),
]

# Thèmes et titres courts proposés pour les 10 cartes du quiz (format commun, t42) : à valider
# avec les lots (t43), puis reportés dans data/quiz.json.
QUIZ_CARTES = {8280: ("Santé", "L'aide à mourir"),
               8431: ("Numérique", "Les réseaux sociaux interdits avant 15 ans"),
               7987: ("Sécurité", "La légitime défense présumée des forces de l'ordre"),
               7454: ("Institutions", "Un statut d'autonomie pour la Corse"),
               1308: ("Immigration", "La nationalité des enfants nés à Mayotte"),
               3260: ("Immigration", "Dénoncer l'accord franco-algérien de 1968"),
               988: ("Sécurité", "Plus de soutien à l'Ukraine"),
               2257: ("Travail", "L'abrogation de la réforme des retraites"),
               3061: ("Droits", "Le consentement dans la définition du viol"),
               2957: ("Environnement", "Des dérogations pour les néonicotinoïdes")}

# Votes regardés et écartés (8 octobre 2026), avec leur raison.
ECARTES = [
    ("n° 5254 (gratuité des parkings des hôpitaux), 7397 (bourses étudiantes), 2274 (« double "
     "dette » d'Haïti), 682 (protoxyde d'azote), 5427 (outils numériques des commerçants)",
     "participation de 17 % ou moins : trop peu de députés à comparer"),
    ("n° 3018 (Paris, Lyon, Marseille, lecture définitive)",
     "même texte que le n° 1330, avec une participation de 25 % au lieu de 44 %"),
    ("n° 8433 et 8279 (ordre public), 8427 et 7259 (urgence agricole), 8042 (justice "
     "criminelle), 1473 et 1194 (narcotrafic), 7405 et 6318 (sécurité et rétention), 6023 "
     "(fraudes)", "textes « fourre-tout » : la question n'en citerait qu'une mesure"),
    ("n° 2460 (stockage du dioxyde de carbone sous la mer, Protocole de Londres)",
     "technique : ne se comprend pas en une phrase"),
    ("n° 7894, 5729, 2107 (aide à mourir), 5192 (réseaux sociaux), 738 (Mayotte), 1202 "
     "(viol), 4438 (ArcelorMittal), 217 (retraites)", "même sujet qu'un vote du quiz ou qu'un "
     "candidat repris"),
    ("n° 289 (meublés de tourisme)", "texte de la commission mixte paritaire publié par le "
     "Sénat seulement : pas de texte de l'Assemblée à citer"),
]


# Le n° 2958 n'avait pas de sources dans preparer_quiz.py, et son texte n'est pas celui d'une
# commission mixte paritaire : c'est la première lecture à l'Assemblée d'un texte du Sénat.
CORRECTIONS = {2958: ("Texte de la commission (première lecture à l'Assemblée), articles 1er "
                      "à 3 : durée maximale de rétention de « deux cent dix jours ».",
                      ("PIONANR5L17BTC1640", "PIONANR5L17B1148"))}


def candidats_repris() -> list[Candidat]:
    par_numero = {c.numero: c for c in pq.CANDIDATS}
    resultat = []
    for n, (theme, titre) in REPRIS.items():
        c = par_numero[n]
        verifie, sources = CORRECTIONS.get(n, (c.verifie, c.sources))
        resultat.append(Candidat(n, theme, titre, c.question, c.concretement, verifie,
                                 c.reserve, sources))
    return resultat


def tous_les_candidats() -> list[Candidat]:
    return candidats_repris() + NOUVEAUX


def precision(n: int) -> int:
    """Précision V1 en pour cent après n votes (§ 4.3 du planning)."""
    return round(100 * (1 - math.exp(-n / 20)))


def vecteur(vote: dict, paires: list[tuple[str, str]]) -> tuple[int, ...]:
    """1 pour chaque paire de groupes que ce vote sépare (positions connues et différentes)."""
    pos = {g: v.get("position") for g, v in vote["groupes"].items()}
    return tuple(int(bool(pos.get(a) and pos.get(b) and pos[a] != pos[b])) for a, b in paires)


def composer(base: list[dict], candidats: list[dict], groupes: list[str],
             n_lots: int = N_LOTS, max_par_theme: int = MAX_PAR_THEME) -> list[list[int]]:
    """Les lots, un par un. Chaque lot est le trio de candidats de thèmes différents qui, ajouté
    à `base` (le quiz) et aux lots déjà composés, maximise d'abord la séparation des paires de
    groupes les moins séparées (comparaison des séparations triées, la plus faible d'abord),
    puis la participation. Un thème ne revient pas plus de `max_par_theme` fois en tout."""
    paires = list(itertools.combinations(groupes, 2))
    cumul = [sum(col) for col in zip(*(vecteur(v, paires) for v in base), strict=True)] \
        if base else [0] * len(paires)
    restants = list(candidats)
    themes: dict[str, int] = {}
    lots = []
    for _ in range(n_lots):
        meilleur, cle_meilleure = None, None
        for trio in itertools.combinations(restants, cartes.VOTES_PAR_LOT):
            noms = [v["theme"] for v in trio]
            if len(set(noms)) < len(noms) or any(themes.get(t, 0) >= max_par_theme
                                                 for t in noms):
                continue
            somme = [c + sum(x) for c, *x in zip(cumul, *(vecteur(v, paires) for v in trio),
                                                   strict=True)]
            cle = (sorted(somme), sum(v["participation"] for v in trio))
            if cle_meilleure is None or cle > cle_meilleure:
                meilleur, cle_meilleure = trio, cle
        if meilleur is None:
            break
        lots.append([v["numero"] for v in meilleur])
        cumul = [c + sum(x) for c, *x in zip(cumul, *(vecteur(v, paires) for v in meilleur),
                                              strict=True)]
        for v in meilleur:
            themes[v["theme"]] = themes.get(v["theme"], 0) + 1
            restants.remove(v)
    return lots


def pluriel(n: int, mot: str) -> str:
    return f"{n} {mot}{'s' if n > 1 else ''}"


def matrice(sep: dict[tuple[str, str], int], groupes: list[str],
            avant: dict[tuple[str, str], int] | None = None) -> list[str]:
    """Le tableau des séparations par paire de groupes ; « a → b » quand `avant` est donné."""
    lignes = ["| | " + " | ".join(groupes) + " |", "|" + "---|" * (len(groupes) + 1)]
    for a in groupes:
        cases = []
        for b in groupes:
            if a == b:
                cases.append("—")
                continue
            cle = (a, b) if (a, b) in sep else (b, a)
            cases.append(f"{avant[cle]} → {sep[cle]}" if avant else str(sep[cle]))
        lignes.append(f"| **{a}** | " + " | ".join(cases) + " |")
    return lignes


def rapport(candidats: list[Candidat], votes: dict[int, dict], quiz: list[dict],
            questions_quiz: dict[int, str], groupes: list[str], lots: list[list[int]]) -> str:
    sep_quiz = pq.separation(quiz, groupes)
    choisis = [votes[n] for lot in lots for n in lot]
    sep_fin = pq.separation(quiz + choisis, groupes)
    faibles = sorted((k for k, s in sep_quiz.items() if s <= 1), key=lambda k: (sep_quiz[k], k))
    cover = pq.couverture(quiz + choisis)
    au_moins_dix = sum(n for k, n in cover.items() if k >= 10)
    par_numero = {c.numero: c for c in candidats}
    lignes = [
        "# Lots de votes : candidats (t42)",
        "",
        "> Généré par `uv run python -m scripts.preparer_lots`. Ne pas modifier à la main : "
        "cocher ci-dessous, puis répondre en session (t43).",
        "",
        "Après le quiz d'entrée, l'utilisateur continue avec des **lots de 3 votes**, au format "
        "d'une séance (ta décision du 8 octobre 2026). 10 votes du quiz + 5 lots de 3 = "
        f"**25 votes** : la précision passe de {precision(10)} % à {precision(25)} %, le seuil "
        "où elle devient fiable. Comme pour le quiz, c'est un choix éditorial : tu retiens 15 "
        "votes et tu corriges ce que tu veux.",
        "",
        "## La carte de vote",
        "",
        "Chaque vote se présente sous la même forme partout (quiz, lots, séances, pages de "
        "vote) : un **thème**, un **titre court**, une **question fermée** (« oui » veut dire "
        "voter pour) et une phrase **« Concrètement »**. Le titre officiel reste dans « Pour "
        "aller plus loin ». Format et contrôles : `pipeline/cartes.py`.",
        "",
        f"- **Les 12 thèmes** (liste fermée, celle de l'écran Explorer des maquettes) : "
        f"{', '.join(cartes.THEMES)}.",
        "- **Les lots** iront dans `data/lots.json` après ton choix : 5 lots numérotés dans "
        "l'ordre où on les propose, 3 cartes chacun. Les 10 cartes du quiz restent dans "
        "`data/quiz.json`, au même format : il leur faut un thème de la liste et un titre court "
        "(proposés plus bas, à valider aussi).",
        "- **Question pour toi.** La liste n'a pas de thème « International » ni « Défense » : "
        "je range le soutien à l'Ukraine (quiz) et la programmation militaire sous "
        "« Sécurité ». Autre solution : remplacer un thème peu servi par « International ».",
        "",
        "## Critères",
        "",
        "- **Les tiens, comme pour le quiz** : des sujets de société, à objet unique, compris "
        "en une phrase. Quand un texte en contient plusieurs, la carte retient la mesure "
        "principale et la réserve le dit.",
        "- **Départager les groupes que le quiz sépare mal** : "
        + ", ".join(f"{a} / {b} ({sep_quiz[(a, b)]})" for a, b in faibles)
        + " ; entre parenthèses, le nombre de votes du quiz où leurs positions diffèrent.",
        "- **Varier les thèmes** : 3 thèmes différents par lot, pas plus de "
        f"{MAX_PAR_THEME} votes par thème sur les 15.",
        "- **Rédigé d'après le texte adopté** par l'Assemblée, lu en entier (à défaut, le "
        "texte de la commission, quand c'est lui qui a été voté). Chaque carte passe les "
        "contrôles 2, 4, 5 et 6 des fiches : longueurs, question fermée, vocabulaire neutre, "
        "chiffres présents dans le texte. « Vérifié » dit ce qui a été lu ; « Réserve », ce que "
        "la carte simplifie.",
        f"- **Une participation d'au moins {PARTICIPATION_MINIMALE} %** : en dessous, trop peu "
        "de députés à comparer.",
        "",
        "## Ma proposition de 5 lots",
        "",
        "Les lots sont composés un par un : chaque lot est le trio qui, ajouté au quiz et aux "
        "lots précédents, sépare le mieux les paires de groupes encore les moins séparées. Le "
        "premier lot est donc celui qui apporte le plus à qui s'arrête tôt.",
        "",
        "| Lot | Votes | Paires les moins séparées qu'il départage | Précision après |",
        "|---|---|---|---|",
    ]
    cumul = list(quiz)
    for i, lot in enumerate(lots, 1):
        avant = pq.separation(cumul, groupes)
        lot_votes = [votes[n] for n in lot]
        cumul += lot_votes
        apres = pq.separation(cumul, groupes)
        # Les paires les moins séparées jusque-là que ce lot départage.
        departage = sorted((k for k in avant if apres[k] > avant[k]),
                           key=lambda k: (avant[k], k))[:PAIRES_AFFICHEES]
        noms = " ; ".join(f"{par_numero[n].theme} · {par_numero[n].titre} (n° {n})"
                          for n in lot)
        paires = ", ".join(f"{a} / {b} ({avant[(a, b)]} → {apres[(a, b)]})"
                           for a, b in departage) or "—"
        lignes.append(f"| {i} | {noms} | {paires} | {precision(10 + 3 * i)} % |")
    restes = sorted((k for k, s in sep_fin.items() if s <= 1), key=lambda k: (sep_fin[k], k))
    lignes += [
        "",
        f"Sur le quiz seul, la paire la moins séparée l'est {min(sep_quiz.values())} fois ; "
        f"avec les 5 lots, {min(sep_fin.values())} fois"
        + (" (" + ", ".join(f"{a} / {b}" for a, b in restes) + ")." if restes else ".")
        + f" {sum(s >= 3 for s in sep_fin.values())} paires sur {len(sep_fin)} sont séparées "
        "au moins trois fois sur les 25 votes.",
        "",
        f"**Jumeau.** Sur ces 25 votes, **{au_moins_dix} députés** ont pris position (pour, "
        "contre, abstention) sur au moins 10 : ce sont ceux qui pourront être comparés à "
        "quelqu'un qui a tout tranché.",
        "",
        "La proposition est calculée (séparation des groupes, puis participation) : elle ne dit "
        "rien de l'intérêt d'un sujet pour le public, que toi seul juges. Si tu retires un "
        "vote, je recalcule les lots.",
        "",
        "## Les candidats",
        "",
        f"{len(candidats)} cartes : les {len(REPRIS)} candidats du quiz non retenus, puis "
        f"{len(candidats) - len(REPRIS)} nouveaux. Coche 15 cases (ou donne les numéros en "
        "session).",
        "",
    ]
    proposes = {n for lot in lots for n in lot}
    for i, c in enumerate(candidats, 1):
        v = votes[c.numero]
        d = v["decompte"]
        marque = " · **proposé**" if c.numero in proposes else ""
        nature = "scrutin solennel" if v["solennel"] else "scrutin ordinaire"
        lignes += [
            f"### {i}. {c.theme} · {c.titre} · n° {c.numero}{marque}",
            "",
            "- [ ] **Je le retiens**",
            f"- **Question** : « {c.question} »",
            f"- **Concrètement** : {c.concretement}",
            f"- **Le vote** : {nature}, {v['sort']} le {pq.date_lisible(v['date'])} ; "
            f"{d['pour']} pour, {d['contre']} contre, {pluriel(d['abstention'], 'abstention')} ; "
            f"participation {v['participation']} % ; {pluriel(v['dissidents'], 'vote')} contre "
            f"leur groupe. [Scrutin n° {c.numero}]({pq.LIEN.format(numero=c.numero)}).",
            f"- **Objet officiel** : {v['titre']}",
            "- **Écart entre groupes** :",
            *pq.ligne_groupes(v),
            f"- **Vérifié** : {c.verifie}",
        ]
        if c.reserve:
            lignes.append(f"- **Réserve** : {c.reserve}")
        lignes.append("")
    lignes += [
        "## Les cartes du quiz : thème et titre court proposés",
        "",
        "Les questions et « Concrètement » du quiz ne changent pas.",
        "",
        "| N° | Thème | Titre court | Question |",
        "|---|---|---|---|",
        *(f"| {n} | {theme} | {titre} | {questions_quiz[n]} |"
          for n, (theme, titre) in QUIZ_CARTES.items()),
        "",
        "## Séparation des groupes",
        "",
        "Nombre de votes où les deux groupes n'ont pas la même position : sur les 10 du quiz, "
        "puis sur les 25 avec les lots proposés.",
        "",
        *matrice(sep_fin, groupes, sep_quiz),
        "",
        "## Regardés et écartés",
        "",
        *(f"- {quels} : {raison}." for quels, raison in ECARTES),
        "",
    ]
    return "\n".join(lignes)


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    args.add_argument("--base", type=Path, default=BASE)
    args.add_argument("--textes", type=Path, default=TEXTES)
    options = args.parse_args(argv)

    candidats = tous_les_candidats()
    quiz_json = json.loads(QUIZ.read_text(encoding="utf-8"))
    erreurs = {}
    for c in candidats:
        sources = "\n".join(pq.texte_source(u, options.textes) for u in c.sources)
        erreurs[c.numero] = cartes.controler(c.carte(uid(c.numero)), sources)
    for q in quiz_json:
        theme, titre = QUIZ_CARTES[q["numero"]]
        erreurs[q["numero"]] = cartes.controler_format(cartes.Carte(
            q["uid"], q["numero"], theme, titre, q["question"], q["concretement"]))
    if any(erreurs.values()):
        for numero, e in erreurs.items():
            for message in e:
                print(f"n° {numero} : {message}", file=sys.stderr)
        return 1
    con = duckdb.connect(str(options.base), read_only=True)
    try:
        votes = {c.numero: pq.lire(con, c.numero) for c in candidats}
        quiz = [pq.lire(con, q["numero"]) for q in quiz_json]
    finally:
        con.close()
    groupes = sorted({g for v in [*votes.values(), *quiz] for g in v["groupes"]}
                     - {pq.NON_INSCRITS})
    eligibles = [{**votes[c.numero], "theme": c.theme} for c in candidats
                 if votes[c.numero]["participation"] >= PARTICIPATION_MINIMALE]
    lots = composer(quiz, eligibles, groupes)
    questions_quiz = {q["numero"]: q["question"] for q in quiz_json}
    SORTIE.write_text(rapport(candidats, votes, quiz, questions_quiz, groupes, lots),
                      encoding="utf-8")
    DONNEES.parent.mkdir(parents=True, exist_ok=True)
    DONNEES.write_text(json.dumps({
        "lots_proposes": lots,
        "candidats": [{**cartes.vers_json(c.carte(uid(c.numero))),
                       **{k: x for k, x in votes[c.numero].items()
                          if k not in ("deputes", "uid", "numero")}}
                      for c in candidats],
        "quiz": {str(n): {"theme": t, "titre": titre} for n, (t, titre) in QUIZ_CARTES.items()},
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(candidats)} candidats, lots proposés : {lots}")
    print(f"Écrit : {SORTIE.relative_to(RACINE)} et {DONNEES.relative_to(RACINE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
