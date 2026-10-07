"""Prépare le choix des 10 votes du quiz d'entrée (tâche t20).

Usage :
    uv run python -m scripts.preparer_quiz [--base chemin/vers/site.duckdb]

Vingt scrutins solennels qui divisent, sur des thèmes variés, chacun avec une question fermée
(« oui » veut dire voter pour) rédigée d'après le texte voté. Les questions sont contrôlées
comme les fiches (docs/vulgarisation-controles.md : longueur, question fermée, vocabulaire
neutre). Pour chaque vote : le résultat, la position de chaque groupe et les votes contre leur
groupe. Le script propose ensuite les 10 votes qui, ensemble, séparent le mieux les groupes
deux à deux : un quiz qui ne distingue pas deux groupes ne peut pas dire duquel on est proche.

Produit :
    docs/quiz-candidats.md                 la grille à cocher par Julien
    data/mesures/quiz/candidats.json       les 20 candidats et leurs positions (pour t21)
"""

from __future__ import annotations

import argparse
import itertools
import json
import sys
from dataclasses import dataclass
from pathlib import Path

import duckdb

from pipeline import vulgarisation as vg

RACINE = Path(__file__).resolve().parent.parent
BASE = RACINE / "data" / "site.duckdb"
SORTIE = RACINE / "docs" / "quiz-candidats.md"
DONNEES = RACINE / "data" / "mesures" / "quiz" / "candidats.json"
LIEN = "https://www.assemblee-nationale.fr/dyn/17/scrutins/{numero}"
N_QUIZ = 10
NON_INSCRITS = "NI"
# UDR est devenu UDDPLR le 5 septembre 2025 : même groupe pour comparer les votes.
SUCCESSEURS = {"UDR": "UDDPLR"}


@dataclass(frozen=True)
class Candidat:
    numero: int
    theme: str
    question: str
    verifie: str
    reserve: str = ""


# Rédigés en session d'après le texte voté (dernier texte de l'Assemblée avant le scrutin,
# docs/vulgarisation-essai.md) ; « verifie » dit ce qui a été lu, « reserve » ce qui ne l'a pas
# été. Les questions de la Corse, de la légitime défense, de l'hydroélectricité et des réseaux
# sociaux sont celles des fiches de t07, relues par Julien en t08.
CANDIDATS = [
    Candidat(8280, "Santé et fin de vie",
             "Faut-il permettre aux adultes atteints d'une maladie grave et incurable en phase "
             "avancée de demander une aide à mourir ?",
             "Texte adopté (lecture définitive), article 4 : 18 ans au moins, affection grave et "
             "incurable qui engage le pronostic vital, en phase avancée, et autres conditions."),
    Candidat(7454, "Institutions",
             "Faut-il inscrire dans la Constitution un statut d'autonomie pour la Corse au sein "
             "de la République ?",
             "Question de la fiche t07, relue par Julien."),
    Candidat(1303, "Institutions",
             "Faut-il étendre le scrutin de liste paritaire aux communes de moins de 1 000 "
             "habitants ?",
             "Exposé des motifs et texte de la commission (deuxième lecture) : extension du "
             "scrutin de liste paritaire aux communes de moins de 1 000 habitants."),
    Candidat(3182, "Outre-mer",
             "Faut-il reporter au plus tard à juin 2026 les élections provinciales en "
             "Nouvelle-Calédonie ?",
             "Texte de la commission mixte paritaire, article 1er : élections « au plus tard le "
             "28 juin 2026 » au lieu du 30 novembre 2025.",
             "Le report sert à appliquer l'accord du 12 juillet 2025 : la question ne le dit pas."),
    Candidat(1308, "Outre-mer",
             "Faut-il exiger, à Mayotte, que les deux parents d'un enfant y résident "
             "régulièrement depuis un an pour qu'il puisse devenir français ?",
             "Article unique : « ses deux parents résidaient » au lieu de « l'un de ses parents "
             "au moins », et « d'un an » au lieu de « de trois mois ».",
             "La condition porte sur la résidence régulière en France à la naissance : relire la "
             "formulation « y résident »."),
    Candidat(7987, "Sécurité et justice",
             "Faut-il présumer que les policiers et gendarmes qui utilisent leur arme dans les "
             "cas prévus par la loi ont agi en légitime défense ?",
             "Question de la fiche t07, relue par Julien."),
    Candidat(1624, "Sécurité et justice",
             "Faut-il sanctionner davantage les parents de mineurs délinquants et juger plus "
             "vite les mineurs de 16 ans et plus ?",
             "Texte de la commission mixte paritaire : peines et amende civile pour les parents "
             "(articles 1er et 2), audience unique pour les mineurs d'au moins 16 ans (article 4).",
             "Deux mesures dans une question, comme pour les réseaux sociaux en t07."),
    Candidat(2958, "Immigration",
             "Faut-il pouvoir retenir jusqu'à 210 jours avant leur expulsion les étrangers "
             "condamnés pour des faits graves ?",
             "Texte de la commission mixte paritaire : durée maximale de rétention portée à « deux "
             "cent dix jours » pour les étrangers condamnés pour des faits graves ou menaçants.",
             "« Expulsion » est le mot courant ; le texte dit « éloignement »."),
    Candidat(2880, "Éducation",
             "Faut-il renforcer la formation, la prévention et les sanctions contre "
             "l'antisémitisme et le racisme dans les universités ?",
             "Texte de la commission mixte paritaire : formation (article 1er), mission « égalité "
             "et diversité » (article 2), section disciplinaire formée à ces sujets (article 3).",
             "Le texte vise l'enseignement supérieur, pas seulement les universités."),
    Candidat(8431, "Numérique",
             "Faut-il interdire les réseaux sociaux aux moins de quinze ans et le téléphone "
             "portable dans les lycées ?",
             "Question de la fiche t07, relue par Julien."),
    Candidat(7409, "Énergie",
             "Faut-il remplacer les contrats de concession des grands barrages par un droit "
             "d'exploitation de soixante-dix ans accordé aux exploitants actuels ?",
             "Question de la fiche t07, relue par Julien."),
    Candidat(2653, "Énergie",
             "Faut-il adopter cette programmation nationale de l'énergie et du climat, avec ses "
             "objectifs de production nucléaire et renouvelable ?",
             "Texte de la commission : objectifs de production décarbonée (article 5), monopole "
             "public du nucléaire (article 1er A).",
             "Texte rejeté après des amendements de séance qui ne sont pas publiés dans un texte "
             "séparé : ce qui a été réellement voté n'a pas pu être relu. À éviter."),
    Candidat(2957, "Agriculture",
             "Faut-il assouplir les règles imposées aux agriculteurs, notamment en permettant "
             "des dérogations à l'interdiction des néonicotinoïdes ?",
             "Texte de la commission mixte paritaire, article 2 : un décret peut, à titre "
             "exceptionnel, déroger à l'interdiction des produits néonicotinoïdes.",
             "Le texte touche aussi l'eau et les élevages : la question met en avant la mesure "
             "la plus débattue."),
    Candidat(1319, "Économie",
             "Faut-il prolonger jusqu'en 2028 l'obligation pour les supermarchés de revendre "
             "l'alimentation au moins 10 % au-dessus de son prix d'achat ?",
             "Exposé des motifs (« SRP+10 ») et article 1er : dispositif applicable « jusqu'au 15 "
             "avril 2028 ».",
             "Le texte prolonge aussi l'encadrement des promotions et relève les amendes."),
    Candidat(6184, "Économie",
             "Faut-il adopter ce texte de simplification de la vie économique, qui supprime "
             "notamment les zones à faibles émissions ?",
             "Texte de la commission mixte paritaire : références aux zones à faibles émissions "
             "supprimées (article sur le code des transports).",
             "Texte de 80 articles : la question n'en cite qu'une mesure, la plus débattue. "
             "Vérifier que l'abrogation des ZFE est bien dans le texte final."),
    Candidat(6319, "Économie",
             "Faut-il donner plus de moyens d'enquête et d'échange d'informations aux services "
             "qui luttent contre les fraudes sociales et fiscales ?",
             "Texte de la commission mixte paritaire : partage d'informations entre douanes, "
             "services fiscaux et organismes sociaux (articles 1er à 2 bis AA).",
             "Texte de 102 articles, résumé à grands traits."),
    Candidat(4758, "Budget",
             "Faut-il adopter le budget 2026 de la Sécurité sociale, qui suspend notamment le "
             "recul de l'âge légal de départ à la retraite ?",
             "Texte adopté (lecture définitive) : âges de départ fixés par génération (calendrier "
             "de la réforme de 2023 gelé).",
             "Texte de 127 articles ; « suspend » résume un gel du calendrier, à confirmer."),
    Candidat(438, "Budget",
             "Faut-il adopter la partie recettes du budget de l'État pour 2025, telle que "
             "modifiée par les députés ?",
             "Titre officiel : première partie du projet de loi de finances (les recettes).",
             "Partie rejetée après de nombreux amendements de séance, non publiés dans un texte "
             "séparé : contenu réel non relu. À éviter."),
    Candidat(7905, "Défense",
             "Faut-il ajouter 36 milliards d'euros de ressources aux armées pour les années "
             "2026 à 2030 ?",
             "Texte de la commission mixte paritaire, article 2 : « 36 milliards d'euros de "
             "ressources nouvelles pour la période 2026‑2030 »."),
    Candidat(988, "International",
             "Faut-il appeler l'Union européenne et ses alliés à accroître leur soutien "
             "politique, économique et militaire à l'Ukraine ?",
             "Résolution européenne, point 12 : « poursuivre et accroître leur soutien politique, "
             "économique et militaire à l'Ukraine ».",
             "La résolution invite aussi à faciliter l'adhésion de l'Ukraine à l'Union."),
]


def controler(question: str) -> list[str]:
    """Contrôles 2 (longueur), 4 (question fermée) et 5 (vocabulaire) des fiches."""
    mini, maxi = vg.LONGUEURS["question"]
    erreurs = [] if mini <= len(question) <= maxi else [
        f"{len(question)} caractères (attendu de {mini} à {maxi})"]
    fiche = {"question": question, "concretement": "", "cartes": []}
    erreurs += vg.controle_question(fiche).erreurs
    erreurs += vg.controle_vocabulaire(fiche).erreurs
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
        groupes[SUCCESSEURS.get(sigle, sigle)] = {"position": position, "pour": p,
                                                  "contre": c, "abstention": a,
                                                  "membres": membres}
    dissidents = con.execute("SELECT count(*) FROM vote WHERE scrutin_uid = ? AND dissident",
                             [uid]).fetchone()[0]
    return {"uid": uid, "numero": numero, "date": jour.isoformat(), "titre": titre,
            "dossier": dossier, "sort": sort, "solennel": solennel,
            "decompte": {"pour": pour, "contre": contre, "abstention": abst},
            "voix_pour_inverser": inverser, "dissidents": dissidents, "groupes": groupes}


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


def recommander(votes: list[dict], groupes: list[str], themes: dict[int, str],
                n: int = N_QUIZ) -> list[int]:
    """Les n votes qui séparent le mieux les groupes deux à deux : d'abord la plus petite
    séparation entre deux groupes, puis le nombre de paires séparées au moins deux fois, puis
    le nombre de thèmes, puis la séparation totale. Recherche exhaustive (quelques dizaines de
    milliers de combinaisons)."""
    # Pour chaque vote, la liste 0 / 1 des paires qu'il sépare : la somme sur une combinaison
    # donne sa séparation.
    paires = list(itertools.combinations(groupes, 2))
    separe = {v["numero"]: [separation([v], groupes)[p] for p in paires] for v in votes}
    meilleur, cle_meilleure = None, None
    for combi in itertools.combinations(votes, n):
        sep = [sum(col) for col in zip(*(separe[v["numero"]] for v in combi), strict=True)]
        cle = (min(sep), sum(s >= 2 for s in sep), len({themes[v["numero"]] for v in combi}),
               sum(sep))
        if cle_meilleure is None or cle > cle_meilleure:
            meilleur, cle_meilleure = combi, cle
    return sorted(v["numero"] for v in meilleur)


ETIQUETTES = {"pour": "Pour", "contre": "Contre", "abstention": "Abstention"}
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre",
        "octobre", "novembre", "décembre"]


def date_lisible(iso: str) -> str:
    """« 2026-07-15 » → « 15 juillet 2026 »."""
    annee, mois, jour = (int(x) for x in iso.split("-"))
    return f"{jour} {MOIS[mois - 1]} {annee}"


def ligne_groupes(vote: dict) -> list[str]:
    par_position: dict[str, list[str]] = {"pour": [], "contre": [], "abstention": [], None: []}
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
    sep = separation([par_numero[n] for n in recommandes], groupes)
    faibles = sorted((k for k, s in sep.items() if s <= 1), key=lambda k: (sep[k], k))
    themes = sorted({c.theme for c in candidats if c.numero in recommandes})
    lignes = [
        "# Quiz d'entrée : 20 votes candidats (t20)",
        "",
        "> Généré par `uv run python -m scripts.preparer_quiz`. Ne pas modifier à la main : "
        "cocher ci-dessous, puis répondre en session.",
        "",
        "Le quiz d'entrée pose 10 vrais votes de l'Assemblée. Tes réponses sont comparées à "
        "celles des 577 députés : le groupe le plus proche, le jumeau, la précision (t21). "
        "C'est le **seul choix éditorial fixe** du site.",
        "",
        "## Comment choisir",
        "",
        "- Les 20 candidats sont des **scrutins solennels** (tous les députés sont appelés à "
        "voter) qui **divisent** : aucun n'est voté à l'unanimité. Pour un texte voté plusieurs "
        "fois, c'est la lecture finale qui est retenue.",
        "- Chaque question est **fermée** : « oui » veut dire voter pour. Elle est rédigée "
        "d'après le texte voté, et passe les contrôles 2, 4 et 5 des fiches (longueur, "
        "question fermée, vocabulaire neutre). La ligne « Vérifié » dit ce qui a été lu dans "
        "le texte ; « Réserve », ce qui ne l'a pas été ou ce que la question simplifie.",
        "- L'**écart entre groupes** donne la position majoritaire de chaque groupe, avec son "
        "décompte (pour-contre-abstention). Les non-inscrits n'ont pas de position commune.",
        "- Un bon quiz **sépare les groupes deux à deux** : si deux groupes votent pareil sur "
        "les 10 votes, le quiz ne peut pas dire duquel tu es le plus proche.",
        "",
        "Coche 10 cases (ou réponds simplement en session avec les numéros). Tu peux aussi "
        "corriger une question : c'est le moment.",
        "",
        "## Ma proposition de 10",
        "",
        f"Votes n° {', '.join(str(n) for n in recommandes)}. Ensemble, ils couvrent "
        f"{len(themes)} thèmes ({', '.join(themes).lower()}) et séparent chaque paire de groupes "
        f"au moins {min(sep.values())} fois sur 10 ; {sum(s >= 2 for s in sep.values())} paires "
        f"sur {len(sep)} au moins deux fois.",
    ]
    if faibles:
        lignes.append("Paires de groupes séparées une seule fois (ou jamais) : "
                 + ", ".join(f"{a} / {b} ({sep[(a, b)]})" for a, b in faibles) + ".")
    lignes += [
        "",
        "Les candidats marqués « À éviter » (contenu réellement voté non relu) sont exclus de "
        "cette proposition. Elle est calculée : elle ne dit rien de l'intérêt d'un vote pour le "
        "public, que toi seul juges.",
        "",
        "## Les 20 candidats",
        "",
    ]
    for i, c in enumerate(candidats, 1):
        v = par_numero[c.numero]
        d = v["decompte"]
        marque = " · **proposé**" if c.numero in recommandes else ""
        lignes += [
            f"### {i}. {c.theme} · n° {c.numero}{marque}",
            "",
            "- [ ] **Je le retiens**",
            f"- **Question** : « {c.question} »",
            f"- **Le vote** : {v['sort']} le {date_lisible(v['date'])}, {d['pour']} pour, "
            f"{d['contre']} "
            f"contre, {d['abstention']} abstentions ; {v['dissidents']} votes contre leur "
            f"groupe. [Scrutin n° {c.numero}]({LIEN.format(numero=c.numero)}), page du site "
            f"`/votes/{c.numero}/`.",
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
        cases = []
        for b in groupes:
            if a == b:
                cases.append("—")
            else:
                cases.append(str(sep.get((a, b), sep.get((b, a)))))
        lignes.append(f"| **{a}** | " + " | ".join(cases) + " |")
    lignes.append("")
    return "\n".join(lignes)


def main(argv: list[str] | None = None) -> int:
    args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    args.add_argument("--base", type=Path, default=BASE)
    base = args.parse_args(argv).base

    erreurs = {c.numero: controler(c.question) for c in CANDIDATS}
    if any(erreurs.values()):
        for numero, e in erreurs.items():
            for message in e:
                print(f"n° {numero} : {message}", file=sys.stderr)
        return 1
    con = duckdb.connect(str(base), read_only=True)
    try:
        votes = [lire(con, c.numero) for c in CANDIDATS]
    finally:
        con.close()
    non_solennels = [v["numero"] for v in votes if not v["solennel"]]
    if non_solennels:
        print(f"Scrutins non solennels : {non_solennels}", file=sys.stderr)
        return 1
    groupes = sorted({g for v in votes for g in v["groupes"]} - {NON_INSCRITS})
    themes = {c.numero: c.theme for c in CANDIDATS}
    eviter = {c.numero for c in CANDIDATS if "À éviter" in c.reserve}
    recommandes = recommander([v for v in votes if v["numero"] not in eviter], groupes, themes)
    SORTIE.write_text(rapport(CANDIDATS, votes, groupes, recommandes), encoding="utf-8")
    DONNEES.parent.mkdir(parents=True, exist_ok=True)
    DONNEES.write_text(json.dumps({
        "recommandes": recommandes,
        "candidats": [{"question": c.question, "theme": c.theme, **v}
                      for c, v in zip(CANDIDATS, votes, strict=True)],
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(CANDIDATS)} candidats, proposition : {recommandes}")
    print(f"Écrit : {SORTIE.relative_to(RACINE)} et {DONNEES.relative_to(RACINE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
