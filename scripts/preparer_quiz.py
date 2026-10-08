"""Prépare le choix des 10 votes du quiz d'entrée (tâche t20).

Usage :
    uv run python -m scripts.preparer_quiz [--base site.duckdb] [--textes data/raw/textes]

Critères (décision de Julien, 8 octobre 2026) : des sujets de société, à objet unique, qu'un
citoyen comprend en une phrase sans connaître le dossier ; pas de texte technique ni de texte
« fourre-tout » (les députés votent l'ensemble, la question n'en citerait qu'une mesure). Les
votes peuvent venir au-delà des scrutins solennels ; leur participation est alors affichée.

Chaque candidat a une question fermée (« oui » veut dire voter pour) et une phrase
« Concrètement », rédigées d'après le texte voté et contrôlées comme les fiches
(docs/vulgarisation-controles.md) : longueurs, question fermée, vocabulaire neutre, et chiffres
présents dans le texte. Pour chaque vote : le résultat, la participation, la position de chaque
groupe et les votes contre leur groupe. Le script propose les 10 votes qui séparent le mieux les
groupes deux à deux, et compte combien de députés ont pris position sur chacun d'eux.

Produit :
    docs/quiz-candidats.md                 la grille à cocher par Julien
    data/mesures/quiz/candidats.json       les candidats et leurs positions
    data/quiz.json                         les 10 votes choisis par Julien (lu par t21)
"""

from __future__ import annotations

import argparse
import itertools
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

import duckdb

from pipeline import vulgarisation as vg

RACINE = Path(__file__).resolve().parent.parent
BASE = RACINE / "data" / "site.duckdb"
TEXTES = RACINE / "data" / "raw" / "textes"
SORTIE = RACINE / "docs" / "quiz-candidats.md"
DONNEES = RACINE / "data" / "mesures" / "quiz" / "candidats.json"
QUIZ = RACINE / "data" / "quiz.json"
# Choix de Julien, 8 octobre 2026 (t20) : la proposition calculée, retenue telle quelle.
CHOIX = [988, 1308, 2257, 2957, 3061, 3260, 7454, 7987, 8280, 8431]
LIEN = "https://www.assemblee-nationale.fr/dyn/17/scrutins/{numero}"
N_QUIZ = 10
NON_INSCRITS = "NI"
# Les deux groupes UDR successifs (avant et après le 5 septembre 2025) portent le même sigle
# affiché : ils se comparent comme un seul groupe, sans table de correspondance.
PRISES_DE_POSITION = ("pour", "contre", "abstention")


@dataclass(frozen=True)
class Candidat:
    numero: int
    theme: str
    question: str
    concretement: str
    verifie: str
    reserve: str = ""
    # Documents de l'Assemblée (texte voté, texte déposé avec son exposé des motifs) où les
    # chiffres de la question et de « Concrètement » doivent figurer (contrôle 6).
    sources: tuple[str, ...] = field(default_factory=tuple)


RESOLUTION = "Cette résolution, qui n'a pas force de loi,"

# Rédigés en session d'après le texte voté (dernier texte de l'Assemblée avant le scrutin) :
# « verifie » dit ce qui a été lu, « reserve » ce que la question simplifie ou ce qui n'a pas
# pu être vérifié. Les questions et « Concrètement » de la Corse, de la légitime défense et des
# réseaux sociaux sont ceux des fiches de t07, relues par Julien en t08.
CANDIDATS = [
    Candidat(8280, "Fin de vie",
             "Faut-il permettre aux adultes atteints d'une maladie grave et incurable en phase "
             "avancée de demander une aide à mourir ?",
             "Le texte crée un droit à l'aide à mourir : une personne majeure, atteinte d'une "
             "affection grave et incurable qui engage son pronostic vital, en phase avancée, peut "
             "demander à recourir à une substance létale, sous d'autres conditions.",
             "Texte adopté en lecture définitive, articles 2 et 4 (définition et conditions "
             "d'accès).",
             sources=("PIONANR5L17BTA0323", "PIONANR5L17B1100")),
    Candidat(8431, "Numérique",
             "Faut-il interdire les réseaux sociaux aux moins de quinze ans et le téléphone "
             "portable dans les lycées ?",
             "Le texte interdit l'accès aux réseaux sociaux aux moins de quinze ans, étend aux "
             "lycées l'interdiction du téléphone portable et ajoute la propagande pour des moyens "
             "de se donner la mort aux contenus que les sites doivent combattre.",
             "Fiche de t07, relue par Julien.",
             "Deux mesures dans une question (relevé en t07, accepté en t08)."),
    Candidat(7987, "Police",
             "Faut-il présumer que les policiers et gendarmes qui utilisent leur arme dans les "
             "cas prévus par la loi ont agi en légitime défense ?",
             "Le texte prévoit qu'un policier ou un gendarme qui tire avec son arme dans les cas "
             "déjà autorisés par la loi est considéré d'office comme ayant agi en légitime "
             "défense, sauf si l'enquête prouve le contraire.",
             "Fiche de t07, relue par Julien (phrase « Concrètement » raccourcie)."),
    Candidat(7454, "Corse",
             "Faut-il inscrire dans la Constitution un statut d'autonomie pour la Corse au sein "
             "de la République ?",
             "Le texte modifie la Constitution pour donner à la Corse un statut d'autonomie. Sous "
             "conditions, la Collectivité de Corse pourra adapter des lois nationales ou fixer "
             "ses propres règles dans certains domaines.",
             "Fiche de t07, relue par Julien.",
             "Première lecture d'une révision constitutionnelle : le texte n'est pas définitif."),
    Candidat(2958, "Immigration",
             "Faut-il pouvoir retenir jusqu'à deux cent dix jours avant leur expulsion les "
             "étrangers condamnés pour des faits graves ?",
             "Les étrangers condamnés pour certains crimes ou délits graves, ou dont le "
             "comportement menace gravement l'ordre public, pourront être maintenus en rétention "
             "administrative jusqu'à deux cent dix jours, le temps d'organiser leur départ.",
             "Texte de la commission mixte paritaire, articles 1er à 3 : durée maximale de "
             "rétention de « deux cent dix jours » pour ces étrangers.",
             "« Expulsion » est le mot courant ; le texte parle d'éloignement."),
    Candidat(1308, "Nationalité",
             "Faut-il exiger que les deux parents résident en France depuis plus d'un an pour "
             "qu'un enfant né à Mayotte puisse devenir français ?",
             "Pour qu'un enfant né à Mayotte puisse devenir français, ses deux parents devront "
             "résider régulièrement en France depuis plus d'un an à sa naissance, au lieu d'un "
             "seul parent depuis plus de trois mois.",
             "Article unique : « ses deux parents résidaient » au lieu de « l'un de ses parents "
             "au moins », « d'un an » au lieu de « de trois mois ».",
             "Le texte prévoit un cas particulier quand la filiation n'est établie qu'à l'égard "
             "d'un parent.",
             sources=("PIONANR5L17BTC1199", "PIONANR5L17B0693")),
    Candidat(3260, "Immigration",
             "Faut-il demander au Gouvernement de dénoncer l'accord franco-algérien de 1968 sur "
             "l'entrée et le séjour des Algériens ?",
             f"{RESOLUTION} appelle le Gouvernement à dénoncer l'accord du 27 décembre 1968, qui "
             "fixe des règles particulières pour l'entrée et le séjour des ressortissants "
             "algériens en France.",
             "Proposition de résolution (article 34-1 de la Constitution) : exposé des motifs et "
             "article unique.",
             "Vote serré (185 pour, 184 contre) et participation moyenne.",
             sources=("PNREANR5L17B1778",)),
    Candidat(5106, "Islamisme",
             "Faut-il demander l'inscription des Frères musulmans sur la liste européenne des "
             "organisations terroristes ?",
             f"{RESOLUTION} invite la Commission européenne à proposer l'inscription de la "
             "mouvance des Frères musulmans et de ses responsables sur la liste européenne des "
             "organisations terroristes.",
             "Proposition de résolution européenne, texte de la commission, point 5.",
             "Participation faible : moins de la moitié des députés ont voté.",
             sources=("PNREANR5L17BTC2344",)),
    Candidat(988, "Ukraine",
             "Faut-il appeler l'Union européenne et ses alliés à accroître leur soutien "
             "politique, économique et militaire à l'Ukraine ?",
             f"{RESOLUTION} condamne l'agression russe et encourage l'Union européenne, ses États "
             "membres et l'OTAN à poursuivre et accroître leur soutien politique, économique et "
             "militaire à l'Ukraine.",
             "Proposition de résolution européenne, point 12.",
             "La résolution invite aussi à faciliter l'adhésion de l'Ukraine à l'Union.",
             sources=("PNREANR5L17BTC1001", "PNREANR5L17B0916")),
    Candidat(7905, "Défense",
             "Faut-il ajouter 36 milliards d'euros de ressources aux armées pour les années "
             "2026 à 2030 ?",
             "Le texte actualise la programmation militaire 2024-2030 : il prévoit 36 milliards "
             "d'euros de ressources nouvelles pour les armées sur la période 2026-2030.",
             "Texte de la commission mixte paritaire, article 2.",
             "Le texte contient aussi d'autres mesures de défense (43 articles) : la question "
             "retient la principale.",
             sources=("PRJLANR5L17BTC2976",)),
    Candidat(881, "Impôts",
             "Faut-il que les personnes dont le patrimoine dépasse 100 millions d'euros paient au "
             "moins 2 % de sa valeur en impôts ?",
             "Le texte crée un impôt plancher sur la fortune : les personnes dont le patrimoine "
             "dépasse 100 millions d'euros devraient payer, au total, des impôts égaux à au moins "
             "2 % de sa valeur.",
             "Exposé des motifs et article unique (texte de la commission).",
             "Vote en première lecture, participation faible (un tiers des députés) ; le texte "
             "n'est pas devenu loi.",
             sources=("PIONANR5L17BTC0930", "PIONANR5L17B0768")),
    Candidat(2257, "Retraites",
             "Faut-il affirmer la nécessité d'abroger la réforme des retraites de 2023, qui a "
             "reculé l'âge légal de 62 à 64 ans ?",
             f"{RESOLUTION} affirme « l'impérieuse nécessité d'aboutir à l'abrogation de la "
             "réforme des retraites » de 2023, qui a reculé l'âge légal de départ de 62 à 64 ans.",
             "Proposition de résolution : exposé des motifs (âge de 62 à 64 ans) et article "
             "unique.",
             "Participation faible : plusieurs groupes n'ont presque pas pris part au vote.",
             sources=("PNREANR5L17B1352",)),
    Candidat(3061, "Violences sexuelles",
             "Faut-il définir le viol et les agressions sexuelles comme tout acte sexuel non "
             "consenti ?",
             "Le code pénal définirait l'agression sexuelle comme « tout acte sexuel non "
             "consenti », au lieu d'une atteinte commise « avec violence, contrainte, menace ou "
             "surprise ».",
             "Texte de la commission, article 1er.",
             "Participation faible (un tiers des députés).",
             sources=("PIONANR5L17BTC1982",)),
    Candidat(852, "Environnement",
             "Faut-il interdire les cosmétiques, les farts et les vêtements contenant des "
             "substances PFAS ?",
             "Le texte interdit à partir du 1er janvier 2026 la fabrication et la vente de "
             "cosmétiques, de farts et de vêtements contenant des PFAS, sauf équipements de "
             "protection, et fixe une trajectoire de réduction de leurs rejets.",
             "Texte de la commission (deuxième lecture), articles 1er et 1er bis.",
             "Participation faible (la moitié des députés).",
             sources=("PIONANR5L17BTC0929",)),
    Candidat(7380, "Industrie",
             "Faut-il nationaliser la société ArcelorMittal France ?",
             "L'État achèterait la société ArcelorMittal France, à un prix fixé par une "
             "commission et plafonné à la valeur moyenne de ses actions entre le 1er octobre 2024 "
             "et le 30 septembre 2025.",
             "Texte de la commission, article 1er.",
             "Participation faible (un tiers des députés).",
             sources=("PIONANR5L17BTC2872",)),
    Candidat(2957, "Agriculture",
             "Faut-il permettre, à titre exceptionnel, des dérogations à l'interdiction des "
             "pesticides néonicotinoïdes ?",
             "Un décret pourra, à titre exceptionnel et face à une menace grave pour une "
             "production agricole, autoriser des produits néonicotinoïdes aujourd'hui interdits. "
             "Le texte modifie aussi d'autres règles, notamment sur la gestion de l'eau.",
             "Texte de la commission mixte paritaire, article 2.",
             "Texte à plusieurs volets : la question ne retient que la mesure la plus débattue.",
             sources=("PIONANR5L17BTC1652",)),
]


def texte_source(uid: str, dossier: Path) -> str:
    """Le texte brut d'un document de l'Assemblée, téléchargé une fois puis lu en cache."""
    chemin = dossier / f"{uid}.html"
    if not chemin.exists():
        import httpx

        reponse = httpx.get(vg.URL_DOCUMENT.format(uid=uid), timeout=60,
                            follow_redirects=True)
        reponse.raise_for_status()
        dossier.mkdir(parents=True, exist_ok=True)
        chemin.write_text(reponse.text, encoding="utf-8")
    return vg.texte_du_html(chemin.read_text(encoding="utf-8"))


def controler(c: Candidat, sources: str = "") -> list[str]:
    """Contrôles 2 (longueurs), 4 (question fermée), 5 (vocabulaire) et 6 (chiffres) des
    fiches, sur la question et la phrase « Concrètement »."""
    erreurs = []
    for cle, valeur in (("question", c.question), ("concretement", c.concretement)):
        mini, maxi = vg.LONGUEURS[cle]
        if not mini <= len(valeur) <= maxi:
            erreurs.append(f"{cle} : {len(valeur)} caractères (attendu de {mini} à {maxi})")
    fiche = {"question": c.question, "concretement": c.concretement, "cartes": []}
    erreurs += vg.controle_question(fiche).erreurs
    erreurs += vg.controle_vocabulaire(fiche, sources).erreurs
    erreurs += vg.controle_chiffres(fiche, sources).erreurs
    return erreurs


def lire(con: duckdb.DuckDBPyConnection, numero: int) -> dict:
    (uid, jour, titre, sort, pour, contre, abst, solennel, inverser,
     dossier) = con.execute("""
        SELECT s.uid, s.date, s.titre, s.sort, s.pour_publie, s.contre_publie,
               s.abstentions_publiees, s.solennel, s.voix_pour_inverser, d.titre
        FROM scrutin s LEFT JOIN dossier d ON d.uid = s.dossier_uid
        WHERE s.numero = ?""", [numero]).fetchone()
    groupes = {}
    for sigle, position, p, c, a, membres in con.execute("""
            SELECT g.sigle, pg.position, pg.pour, pg.contre, pg.abstentions, pg.membres
            FROM position_groupe pg JOIN groupe g ON g.uid = pg.groupe_uid
            WHERE pg.scrutin_uid = ? AND pg.membres > 0""", [uid]).fetchall():
        groupes[sigle] = {"position": position, "pour": p, "contre": c, "abstention": a,
                          "membres": membres}
    dissidents, en_exercice = con.execute(
        "SELECT count(*) FILTER (WHERE dissident), count(*) FROM vote WHERE scrutin_uid = ?",
        [uid]).fetchone()
    deputes = [d for d, in con.execute(
        "SELECT depute_uid FROM vote WHERE scrutin_uid = ? AND list_contains(?, position)",
        [uid, list(PRISES_DE_POSITION)]).fetchall()]
    return {"uid": uid, "numero": numero, "date": jour.isoformat(), "titre": titre,
            "dossier": dossier, "sort": sort, "solennel": solennel,
            "decompte": {"pour": pour, "contre": contre, "abstention": abst},
            "participation": round(100 * (pour + contre + abst) / en_exercice),
            "voix_pour_inverser": inverser, "dissidents": dissidents, "groupes": groupes,
            "deputes": deputes}


def separation(votes: list[dict], groupes: list[str]) -> dict[tuple[str, str], int]:
    """Pour chaque paire de groupes : le nombre de votes où leurs positions diffèrent (pour,
    contre et abstention sont trois positions distinctes ; un groupe sans position ne compte
    pas)."""
    resultat = {}
    for a, b in itertools.combinations(groupes, 2):
        n = 0
        for v in votes:
            pa = v["groupes"].get(a, {}).get("position")
            pb = v["groupes"].get(b, {}).get("position")
            n += bool(pa and pb and pa != pb)
        resultat[(a, b)] = n
    return resultat


def recommander(votes: list[dict], groupes: list[str], n: int = N_QUIZ) -> list[int]:
    """Les n votes qui séparent le mieux les groupes deux à deux : d'abord la plus petite
    séparation entre deux groupes, puis le nombre de paires séparées au moins deux fois, puis
    la participation totale (plus de députés comparables), puis la séparation totale.
    Recherche exhaustive."""
    paires = list(itertools.combinations(groupes, 2))
    separe = {v["numero"]: [separation([v], groupes)[p] for p in paires] for v in votes}
    meilleur, cle_meilleure = None, None
    for combi in itertools.combinations(votes, n):
        sep = [sum(col) for col in zip(*(separe[v["numero"]] for v in combi), strict=True)]
        cle = (min(sep), sum(s >= 2 for s in sep), sum(v.get("participation", 0) for v in combi),
               sum(sep))
        if cle_meilleure is None or cle > cle_meilleure:
            meilleur, cle_meilleure = combi, cle
    return sorted(v["numero"] for v in meilleur)


def couverture(votes: list[dict]) -> dict[int, int]:
    """Combien de députés ont pris position (pour, contre, abstention) sur k des votes, pour
    chaque k : le jumeau n'est affiché qu'à partir de 10 votes en commun (§ 4.3)."""
    compte: dict[str, int] = {}
    for v in votes:
        for d in v["deputes"]:
            compte[d] = compte.get(d, 0) + 1
    resultat: dict[int, int] = {}
    for k in compte.values():
        resultat[k] = resultat.get(k, 0) + 1
    return dict(sorted(resultat.items(), reverse=True))


ETIQUETTES = {"pour": "Pour", "contre": "Contre", "abstention": "Abstention"}
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre",
        "octobre", "novembre", "décembre"]


def date_lisible(iso: str) -> str:
    """« 2026-07-15 » → « 15 juillet 2026 »."""
    annee, mois, jour = (int(x) for x in iso.split("-"))
    return f"{jour} {MOIS[mois - 1]} {annee}"


def ligne_groupes(vote: dict) -> list[str]:
    par_position: dict[str | None, list[str]] = {"pour": [], "contre": [], "abstention": [],
                                                 None: []}
    for sigle, g in sorted(vote["groupes"].items()):
        if sigle == NON_INSCRITS:
            continue
        detail = f"{sigle} ({g['pour']}-{g['contre']}-{g['abstention']})"
        par_position.setdefault(g["position"], []).append(detail)
    lignes = [f"  - {ETIQUETTES[p]} : {', '.join(par_position[p])}"
              for p in ("pour", "contre", "abstention") if par_position[p]]
    if par_position[None]:
        lignes.append(f"  - Sans position majoritaire : {', '.join(par_position[None])}")
    return lignes


def rapport(candidats: list[Candidat], votes: list[dict], groupes: list[str],
            recommandes: list[int]) -> str:
    par_numero = {v["numero"]: v for v in votes}
    proposes = [par_numero[n] for n in recommandes]
    sep = separation(proposes, groupes)
    faibles = sorted((k for k, s in sep.items() if s <= 1), key=lambda k: (sep[k], k))
    cover = couverture(proposes)
    tous_les_dix = cover.get(N_QUIZ, 0)
    au_moins_huit = sum(n for k, n in cover.items() if k >= 8)
    lignes = [
        "# Quiz d'entrée : votes candidats (t20)",
        "",
        "> Généré par `uv run python -m scripts.preparer_quiz`. Ne pas modifier à la main : "
        "cocher ci-dessous, puis répondre en session.",
        "",
        "Le quiz d'entrée pose 10 vrais votes de l'Assemblée. Tes réponses sont comparées à "
        "celles des 577 députés : le groupe le plus proche, le jumeau, la précision (t21). "
        "C'est le **seul choix éditorial fixe** du site.",
        "",
        "## Critères (ta décision du 8 octobre 2026)",
        "",
        f"- **Des sujets de société, à objet unique**, qu'on comprend en une phrase sans "
        f"connaître le dossier. Pas de texte technique, pas de texte « fourre-tout » : les "
        f"députés votent l'ensemble, et une question qui n'en citerait qu'une mesure ne "
        f"mesurerait pas le même vote. {len(candidats)} candidats tiennent ce critère.",
        "- **Au-delà des scrutins solennels** quand le sujet le justifie. Un vote ordinaire "
        "réunit moins de députés : sa **participation** est indiquée.",
        "- **Chaque question est fermée** (« oui » veut dire voter pour) et accompagnée d'une "
        "phrase **« Concrètement »**, tirée des articles du texte voté. Les deux passent les "
        "contrôles 2, 4, 5 et 6 des fiches (longueurs, question fermée, vocabulaire neutre, "
        "chiffres présents dans le texte). « Vérifié » dit ce qui a été lu ; « Réserve », ce "
        "que la question simplifie ou ce qui n'a pas pu l'être.",
        "- **Un bouton « Je ne sais pas »** à chaque question (pour t21) : personne n'est "
        "obligé de trancher un sujet qu'il ne connaît pas.",
        "",
        "Coche 10 cases (ou donne les numéros en session). Tu peux aussi corriger une question.",
        "",
        "## Choix de Julien",
        "",
        f"Le 8 octobre 2026, Julien a retenu la proposition ci-dessous : votes n° "
        f"{', '.join(str(n) for n in CHOIX)}. Ils sont figés dans `data/quiz.json`, que lit le "
        "quiz (t21).",
        "",
        "## Ma proposition de 10",
        "",
        f"Votes n° {', '.join(str(n) for n in recommandes)}. Ensemble, ils séparent chaque "
        f"paire de groupes au moins {min(sep.values())} fois sur 10 ; "
        f"{sum(s >= 2 for s in sep.values())} paires sur {len(sep)} au moins deux fois.",
    ]
    if faibles:
        lignes.append("Paires de groupes séparées une seule fois (ou jamais) : "
                      + ", ".join(f"{a} / {b} ({sep[(a, b)]})" for a, b in faibles) + ".")
    lignes += [
        "",
        f"**Point d'attention pour t21.** Le jumeau n'est affiché qu'à partir de 10 votes en "
        f"commun. Sur ces 10 votes, **{tous_les_dix} députés** ont pris position sur les 10, "
        f"et {au_moins_huit} sur au moins 8 (votes ordinaires moins suivis, absences). Avec la "
        f"réponse « Je ne sais pas » en plus, le jumeau ne pourra presque jamais s'afficher "
        f"après le seul quiz : t21 devra soit l'annoncer « à préciser », soit inviter à trancher "
        f"d'autres votes. Le groupe le plus proche, lui, se calcule sans problème.",
        "",
        "La proposition est calculée (séparation des groupes, puis participation) : elle ne dit "
        "rien de l'intérêt d'un sujet pour le public, que toi seul juges.",
        "",
        "## Les candidats",
        "",
    ]
    for i, c in enumerate(candidats, 1):
        v = par_numero[c.numero]
        d = v["decompte"]
        marque = " · **proposé**" if c.numero in recommandes else ""
        nature = "scrutin solennel" if v["solennel"] else "scrutin ordinaire"
        lignes += [
            f"### {i}. {c.theme} · n° {c.numero}{marque}",
            "",
            "- [ ] **Je le retiens**",
            f"- **Question** : « {c.question} »",
            f"- **Concrètement** : {c.concretement}",
            f"- **Le vote** : {nature}, {v['sort']} le {date_lisible(v['date'])} ; {d['pour']} "
            f"pour, {d['contre']} contre, {d['abstention']} abstentions ; participation "
            f"{v['participation']} % ; {v['dissidents']} votes contre leur groupe. "
            f"[Scrutin n° {c.numero}]({LIEN.format(numero=c.numero)}).",
            f"- **Objet officiel** : {v['titre']}",
            "- **Écart entre groupes** :",
            *ligne_groupes(v),
            f"- **Vérifié** : {c.verifie}",
        ]
        if c.reserve:
            lignes.append(f"- **Réserve** : {c.reserve}")
        lignes.append("")
    lignes += [
        "## Séparation des groupes par ma proposition",
        "",
        "Nombre de votes, sur les 10 proposés, où les deux groupes n'ont pas la même position.",
        "",
        "| | " + " | ".join(groupes) + " |",
        "|" + "---|" * (len(groupes) + 1),
    ]
    for a in groupes:
        cases = ["—" if a == b else str(sep.get((a, b), sep.get((b, a)))) for b in groupes]
        lignes.append(f"| **{a}** | " + " | ".join(cases) + " |")
    lignes += [
        "",
        "## Écartés de la première liste",
        "",
        "Retirés le 8 octobre 2026 parce que techniques ou « fourre-tout » : parité dans les "
        "communes de moins de 1 000 habitants (n° 1303), élections en Nouvelle-Calédonie "
        "(n° 3182), antisémitisme dans l'enseignement supérieur (n° 2880 : titre qui pousse au "
        "oui, contenu débattu), barrages (n° 7409), prix de l'alimentation (n° 1319), fraudes "
        "(n° 6319), mineurs délinquants (n° 1624), simplification de la vie économique "
        "(n° 6184), budget de la Sécurité sociale (n° 4758), budget 2025 (n° 438), "
        "programmation de l'énergie (n° 2653). La première liste reste dans l'historique git.",
        "",
    ]
    return "\n".join(lignes)


def main(argv: list[str] | None = None) -> int:
    args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    args.add_argument("--base", type=Path, default=BASE)
    args.add_argument("--textes", type=Path, default=TEXTES)
    options = args.parse_args(argv)

    erreurs = {}
    for c in CANDIDATS:
        sources = "\n".join(texte_source(u, options.textes) for u in c.sources)
        erreurs[c.numero] = controler(c, sources)
    if any(erreurs.values()):
        for numero, e in erreurs.items():
            for message in e:
                print(f"n° {numero} : {message}", file=sys.stderr)
        return 1
    con = duckdb.connect(str(options.base), read_only=True)
    try:
        votes = [lire(con, c.numero) for c in CANDIDATS]
    finally:
        con.close()
    groupes = sorted({g for v in votes for g in v["groupes"]} - {NON_INSCRITS})
    recommandes = recommander(votes, groupes)
    SORTIE.write_text(rapport(CANDIDATS, votes, groupes, recommandes), encoding="utf-8")
    # Le quiz figé : les votes choisis, dans l'ordre des candidats (du plus parlant au plus
    # spécifique), avec leur question et leur phrase « Concrètement ».
    par_numero = {v["numero"]: v for v in votes}
    if sorted(CHOIX) != sorted(set(CHOIX)) or not set(CHOIX) <= set(par_numero):
        print("CHOIX doit contenir des candidats distincts", file=sys.stderr)
        return 1
    QUIZ.write_text(json.dumps([
        {"uid": par_numero[c.numero]["uid"], "numero": c.numero, "theme": c.theme,
         "question": c.question, "concretement": c.concretement}
        for c in CANDIDATS if c.numero in CHOIX], ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8")
    DONNEES.parent.mkdir(parents=True, exist_ok=True)
    DONNEES.write_text(json.dumps({
        "recommandes": recommandes,
        "candidats": [{"question": c.question, "concretement": c.concretement,
                       "theme": c.theme, **{k: x for k, x in v.items() if k != "deputes"}}
                      for c, v in zip(CANDIDATS, votes, strict=True)],
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(CANDIDATS)} candidats, proposition : {recommandes}")
    proposes = [v for v in votes if v["numero"] in recommandes]
    print(f"Couverture de la proposition : {couverture(proposes)}")
    print(f"Écrit : {SORTIE.relative_to(RACINE)} et {DONNEES.relative_to(RACINE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
