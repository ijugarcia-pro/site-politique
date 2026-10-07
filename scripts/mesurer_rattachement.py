"""Mesure du rattachement scrutin → dossier législatif (tâche t06, question ouverte 2).

Usage :
    uv run python -m scripts.mesurer_rattachement                    # mesure et rapport
    uv run python -m scripts.mesurer_rattachement --nouvel-echantillon

Lit les archives de data/raw/ (téléchargées par `uv run python -m scripts.inventaire_open_data`) :
scrutins, dossiers législatifs, agenda et amendements. Applique à chaque scrutin les trois méthodes
de pipeline/rattachement.py, puis :
- compare chaque méthode au dossier déclaré dans le scrutin (`objet.dossierLegislatif`), quand il
  existe : c'est le contrôle de justesse automatique, sur plusieurs milliers de scrutins ;
- tire un échantillon de 100 scrutins variés (gardé d'un passage à l'autre) et le joint aux
  vérifications faites à la main (data/mesures/rattachement/verification.csv).

Produit :
    data/mesures/rattachement/echantillon.csv   les 100 scrutins, le résultat de chaque méthode
    data/mesures/rattachement/synthese.json     taux par méthode, catégorie et type de vote
    docs/rattachement.md                        rapport (la section « Constats » est conservée)
"""

from __future__ import annotations

import argparse
import csv
import dataclasses
import json
import random
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from pipeline.an import champ, val
from pipeline.an import documents as lire_archive
from pipeline.rattachement import (
    CATEGORIES,
    Index,
    Resultat,
    analyser_libelle,
    categorie,
    charger_index,
    combiner,
    methode_actes,
    methode_libelle,
    methode_seance,
)

RACINE = Path(__file__).resolve().parent.parent
RAW = RACINE / "data" / "raw"
SORTIE = RACINE / "data" / "mesures" / "rattachement"
ECHANTILLON = SORTIE / "echantillon.csv"
VERIFICATION = SORTIE / "verification.csv"
SYNTHESE = SORTIE / "synthese.json"
RAPPORT = RACINE / "docs" / "rattachement.md"
DEBUT_CONSTATS = "<!-- constats:debut -->"
FIN_CONSTATS = "<!-- constats:fin -->"

ARCHIVES = {
    "scrutins": "Scrutins.json.zip",
    "dossiers": "Dossiers_Legislatifs.json.zip",
    "agenda": "Agenda.json.zip",
    "amendements": "Amendements.json.zip",
}
METHODES = {"A": "actes du dossier", "B": "libellé", "C": "séance (agenda)",
            "combinee": "combinaison"}

# Échantillon : 100 scrutins, répartis entre les familles de scrutins.
QUOTAS = [
    ("solennels", 20, lambda s: s["type_vote"] == "SPS"),
    ("ensemble", 12, lambda s: s["type_vote"] == "SPO" and s["categorie"] == "ensemble"),
    ("article", 12, lambda s: s["type_vote"] == "SPO" and s["categorie"] == "article"),
    ("amendement", 20, lambda s: s["type_vote"] == "SPO" and s["categorie"] == "amendement"),
    ("sous-amendement", 8, lambda s: s["categorie"] == "sous-amendement"),
    ("motion de procédure", 8, lambda s: s["type_vote"] == "SPO"
     and s["categorie"] == "motion de procédure"),
    ("motion de censure", 6, lambda s: s["type_vote"] == "MOC"),
    ("résolution, déclaration, partie", 8, lambda s: s["type_vote"] == "SPO"
     and s["categorie"] in ("résolution", "déclaration", "partie")),
    ("procédure, autre", 6, lambda s: s["type_vote"] == "SPO"
     and s["categorie"] in ("procédure", "autre")),
]
GRAINE = 6


# --- Lecture des archives ---------------------------------------------------------------------


def documents(nom_archive: str):
    chemin = RAW / nom_archive
    if not chemin.exists():
        sys.exit(f"Archive absente : {chemin}. Lancer d'abord "
                 "`uv run python -m pipeline.ingest`.")
    yield from lire_archive(chemin)


def charger_scrutins() -> list[dict]:
    scrutins = []
    for _, doc in documents(ARCHIVES["scrutins"]):
        s = doc["scrutin"]
        code = champ(s, "typeVote", "codeTypeVote")
        scrutins.append({
            "uid": s["uid"],
            "numero": int(s["numero"]),
            "date": s["dateScrutin"],
            "type_vote": code,
            "titre": s["titre"].strip(),
            "seance": val(s.get("seanceRef")),
            "declare": champ(s, "objet", "dossierLegislatif", "dossierRef"),
            "categorie": categorie(s["titre"], code),
        })
    return sorted(scrutins, key=lambda s: s["numero"])


# --- Mesure -----------------------------------------------------------------------------------


def rattacher(scrutins: list[dict], index: Index) -> None:
    for s in scrutins:
        a = methode_actes(s, index)
        b = methode_libelle(s, index)
        c = methode_seance(s, index)
        s["resultats"] = {"A": a, "B": b, "C": c, "combinee": combiner(a, b, c, s["categorie"])}


def sans_amendements(scrutins: list[dict], index: Index) -> dict:
    """La combinaison si l'archive des amendements manque (310 Mo, téléchargement fragile)."""
    reduit = dataclasses.replace(index, amendements={})
    conclut = perdus = differents = 0
    for s in scrutins:
        r = combiner(methode_actes(s, reduit), methode_libelle(s, reduit),
                     methode_seance(s, reduit), s["categorie"]).dossier
        avec = s["resultats"]["combinee"].dossier
        conclut += bool(r)
        perdus += bool(avec and not r)
        differents += bool(avec and r and r != avec)
    return {"scrutins": len(scrutins), "conclut": conclut, "perdus": perdus,
            "differents": differents}


def verdict_declare(resultat: Resultat, declare: str | None) -> str | None:
    """Accord avec le dossier déclaré dans le scrutin, quand il y en a un."""
    if not declare or not resultat.dossier:
        return None
    return "accord" if resultat.dossier == declare else "désaccord"


def taux(scrutins: list[dict], methode: str) -> dict:
    n = len(scrutins)
    conclut = [s for s in scrutins if s["resultats"][methode].dossier]
    verdicts = Counter(verdict_declare(s["resultats"][methode], s["declare"]) for s in conclut)
    return {
        "scrutins": n,
        "conclut": len(conclut),
        "taux_conclut": round(len(conclut) / n, 3) if n else None,
        "compares_au_declare": verdicts["accord"] + verdicts["désaccord"],
        "accord_avec_declare": verdicts["accord"],
        "desaccord_avec_declare": verdicts["désaccord"],
    }


def causes(scrutins: list[dict], methode: str) -> dict:
    return dict(Counter(
        s["resultats"][methode].voie for s in scrutins if not s["resultats"][methode].dossier
    ).most_common())


def tirer_echantillon(scrutins: list[dict]) -> list[str]:
    hasard = random.Random(GRAINE)
    choisis: list[str] = []
    for _, quota, condition in QUOTAS:
        famille = [s["uid"] for s in scrutins if condition(s) and s["uid"] not in choisis]
        choisis += hasard.sample(famille, min(quota, len(famille)))
    return choisis


def famille(s: dict) -> str:
    for nom, _, condition in QUOTAS:
        if condition(s):
            return nom
    return "autre"


def lire_csv(chemin: Path) -> list[dict]:
    if not chemin.exists():
        return []
    with chemin.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def ligne_echantillon(s: dict, titres: dict[str, str]) -> dict:
    lib = analyser_libelle(s["titre"], s["type_vote"])
    ligne = {
        "uid": s["uid"], "numero": s["numero"], "date": s["date"], "type_vote": s["type_vote"],
        "famille": famille(s), "categorie": s["categorie"], "titre": s["titre"],
        "numero_amendement": lib.numero_amendement or "", "auteur_lu": lib.auteur or "",
        "dossier_declare": s["declare"] or "",
    }
    for cle in ("A", "B", "C", "combinee"):
        r = s["resultats"][cle]
        ligne[f"{cle}_dossier"] = r.dossier or ""
        ligne[f"{cle}_candidats"] = len(r.dossiers)
        ligne[f"{cle}_voie"] = r.voie
    r = s["resultats"]["combinee"]
    ligne["amendement"] = r.amendement or ""
    ligne["article_vise"] = r.article or ""
    ligne["titre_dossier_retenu"] = titres.get(r.dossier, "") if r.dossier else ""
    return ligne


def ecrire_csv(chemin: Path, lignes: list[dict]) -> None:
    with chemin.open("w", encoding="utf-8", newline="") as f:
        ecrivain = csv.DictWriter(f, fieldnames=list(lignes[0]))
        ecrivain.writeheader()
        ecrivain.writerows(lignes)


def synthese(scrutins: list[dict], echantillon: list[dict], verifs: dict[str, dict],
             index: Index) -> dict:
    resultat = {"genere_le": datetime.now(UTC).isoformat(timespec="seconds"),
                "scrutins": len(scrutins),
                "sans_amendements": sans_amendements(scrutins, index),
                "premier": scrutins[0]["date"], "dernier": scrutins[-1]["date"],
                "echantillon": {}, "tous": {}}
    for nom, groupe in (("echantillon", echantillon), ("tous", scrutins)):
        bloc = resultat[nom]
        for m in METHODES:
            bloc[m] = {
                "global": taux(groupe, m),
                "causes_d_echec": causes(groupe, m),
                "par_type_de_vote": {t: taux([s for s in groupe if s["type_vote"] == t], m)
                                     for t in ("SPS", "SPO", "MOC")},
                "par_categorie": {c: taux(sc, m) for c in CATEGORIES
                                  if (sc := [s for s in groupe if s["categorie"] == c])},
            }
        bloc["combinee_par_voie"] = dict(Counter(
            s["resultats"]["combinee"].voie for s in groupe).most_common())
    # Désaccords avec le dossier déclaré, pour la liste du rapport.
    resultat["desaccords"] = [
        {"uid": s["uid"], "numero": s["numero"], "methode": m, "trouve": s["resultats"][m].dossier,
         "declare": s["declare"], "titre": s["titre"]}
        for s in scrutins for m in ("A", "B", "C")
        if verdict_declare(s["resultats"][m], s["declare"]) == "désaccord"
    ]
    # Vérification à la main de l'échantillon.
    if verifs:
        par_methode = {}
        for m in METHODES:
            compte = Counter()
            for s in echantillon:
                dossier = s["resultats"][m].dossier
                v = verifs.get(s["uid"])
                if not dossier or not v:
                    continue
                if v["dossier_attendu"] == "aucun":
                    compte["faux positif"] += 1
                else:
                    compte["juste" if dossier == v["dossier_attendu"] else "faux positif"] += 1
            par_methode[m] = dict(compte)
        resultat["verification_manuelle"] = {
            "scrutins_verifies": sum(1 for s in echantillon if s["uid"] in verifs),
            "par_methode": par_methode,
        }
    return resultat


# --- Rapport ----------------------------------------------------------------------------------


def pourcent(a: int, b: int) -> str:
    return f"{a / b:.0%}".replace("%", " %") if b else "—"


def tableau_taux(bloc: dict, cle: str, libelles: list[str]) -> list[str]:
    lignes = ["| | Scrutins | " + " | ".join(f"{METHODES[m]}" for m in METHODES) + " |",
              "|---|---|" + "---|" * len(METHODES)]
    for libelle in libelles:
        valeurs = [bloc[m][cle].get(libelle) for m in METHODES]
        if not valeurs[0] or not valeurs[0]["scrutins"]:
            continue
        cellules = [f"{v['conclut']} ({pourcent(v['conclut'], v['scrutins'])})" for v in valeurs]
        lignes.append(f"| {libelle} | {valeurs[0]['scrutins']} | " + " | ".join(cellules) + " |")
    return lignes


def ecrire_rapport(donnees: dict, echantillon: list[dict], titres: dict[str, str],
                   verifs: dict[str, dict]) -> None:
    constats = f"{DEBUT_CONSTATS}\n_À rédiger après lecture des mesures._\n{FIN_CONSTATS}"
    if RAPPORT.exists():
        ancien = RAPPORT.read_text(encoding="utf-8")
        if DEBUT_CONSTATS in ancien and FIN_CONSTATS in ancien:
            debut = ancien.index(DEBUT_CONSTATS)
            constats = ancien[debut: ancien.index(FIN_CONSTATS) + len(FIN_CONSTATS)]
    types = ["SPS", "SPO", "MOC"]
    ech, tous = donnees["echantillon"], donnees["tous"]
    lignes = [
        "# Rattachement d'un scrutin à son dossier législatif",
        "",
        f"Généré le {donnees['genere_le']} par `uv run python -m scripts.mesurer_rattachement`, "
        f"sur les archives de `data/raw/` ({donnees['scrutins']} scrutins, du "
        f"{donnees['premier']} au {donnees['dernier']}). Tout ce document est régénéré, sauf la "
        "section « Constats et recommandation ». Mesures : `data/mesures/rattachement/`.",
        "",
        "## Constats et recommandation",
        "",
        constats,
        "",
        "## Les méthodes",
        "",
        "- **A · actes du dossier** : un acte du dossier législatif (décision, vote d'une motion) "
        "cite le scrutin dans `voteRefs`.",
        "- **B · libellé** : pour un amendement ou un sous-amendement, on retrouve l'amendement "
        "dans l'archive des amendements par son numéro, la séance du scrutin (à défaut, la date "
        "de son sort) et le nom de l'auteur. Sinon, on compare la désignation du texte "
        "(« du projet de loi … ») aux titres des textes déposés et des dossiers, sans les "
        "incises (« adoptée par le Sénat », « après engagement de la procédure accélérée ») ni "
        "les parenthèses. À titre égal, on garde le dossier déjà déposé et examiné en séance.",
        "- **C · séance (agenda)** : l'ordre du jour de la séance du scrutin ne cite qu'un "
        "dossier.",
        "- **Combinaison** : amendement retrouvé, puis A, puis B, puis C, puis un dossier commun "
        "à deux méthodes qui ont chacune plusieurs candidats.",
        "",
        "Une méthode « conclut » quand elle désigne un seul dossier. La justesse est contrôlée "
        "de deux façons : (1) contre le dossier déclaré dans le scrutin "
        "(`objet.dossierLegislatif`), renseigné pour un tiers des scrutins ; (2) à la main, sur "
        "l'échantillon de 100 scrutins (`verification.csv`).",
        "",
        "## Échantillon de 100 scrutins",
        "",
        "Répartition : " + " · ".join(
            f"{nom} {sum(1 for s in echantillon if famille(s) == nom)}" for nom, _, _ in QUOTAS)
        + ". L'échantillon est tiré une fois (graine fixe) et gardé dans `echantillon.csv`.",
        "",
        "**Taux de conclusion par type de vote** (nombre de scrutins rattachés à un seul dossier)",
        "",
        *tableau_taux(ech, "par_type_de_vote", types),
        "",
        "**Taux de conclusion par catégorie de scrutin**",
        "",
        *tableau_taux(ech, "par_categorie", CATEGORIES),
        "",
    ]
    if "verification_manuelle" in donnees:
        vm = donnees["verification_manuelle"]
        lignes += [
            f"**Vérification à la main** ({vm['scrutins_verifies']} scrutins vérifiés : le "
            "dossier attendu est noté dans `verification.csv`)",
            "",
            "| Méthode | Rattachements vérifiés | Justes | Faux positifs |",
            "|---|---|---|---|",
        ]
        for m, compte in vm["par_methode"].items():
            total = sum(compte.values())
            lignes.append(f"| {METHODES[m]} | {total} | {compte.get('juste', 0)} | "
                          f"{compte.get('faux positif', 0)} |")
        lignes.append("")
    lignes += ["**Échecs de la combinaison dans l'échantillon, avec la cause**", ""]
    echecs = [s for s in echantillon if not s["resultats"]["combinee"].dossier]
    if not echecs:
        lignes.append("Aucun.")
    else:
        lignes += ["| N° | Type | Catégorie | Titre | A | B | C |", "|---|---|---|---|---|---|---|"]
        for s in echecs:
            r = s["resultats"]
            lignes.append(
                f"| {s['numero']} | {s['type_vote']} | {s['categorie']} | "
                f"{s['titre'][:140].replace('|', '/')} | {r['A'].voie} | {r['B'].voie} | "
                f"{r['C'].voie} |")
    lignes += ["", "**Causes d'échec par méthode dans l'échantillon**", ""]
    for m in ("A", "B", "C"):
        lignes.append(f"- {METHODES[m]} : " + " · ".join(
            f"{cause} ({n})" for cause, n in ech[m]["causes_d_echec"].items()))
    lignes += [
        "",
        "## Tous les scrutins",
        "",
        "Les mêmes méthodes appliquées aux "
        f"{donnees['scrutins']} scrutins, pour confirmer l'échantillon.",
        "",
        "**Par type de vote**",
        "",
        *tableau_taux(tous, "par_type_de_vote", types),
        "",
        "**Par catégorie de scrutin**",
        "",
        *tableau_taux(tous, "par_categorie", CATEGORIES),
        "",
        "**Justesse contre le dossier déclaré dans le scrutin**",
        "",
        "| Méthode | Comparés | Accord | Désaccord |",
        "|---|---|---|---|",
    ]
    for m in METHODES:
        g = tous[m]["global"]
        lignes.append(f"| {METHODES[m]} | {g['compares_au_declare']} | "
                      f"{g['accord_avec_declare']} "
                      f"({pourcent(g['accord_avec_declare'], g['compares_au_declare'])}) | "
                      f"{g['desaccord_avec_declare']} |")
    sa = donnees["sans_amendements"]
    lignes += [
        "",
        f"**Sans l'archive des amendements**, la combinaison conclut pour {sa['conclut']} "
        f"scrutins sur {sa['scrutins']} ({pourcent(sa['conclut'], sa['scrutins'])}) : "
        f"{sa['perdus']} rattachements perdus, {sa['differents']} différents.",
    ]
    lignes += ["", "**Voies de la combinaison (tous les scrutins)**", ""]
    lignes += [f"- {voie} : {n}" for voie, n in tous["combinee_par_voie"].items()]
    lignes += ["", "**Causes d'échec par méthode (tous les scrutins)**", ""]
    for m in ("A", "B", "C", "combinee"):
        lignes.append(f"- {METHODES[m]} : " + " · ".join(
            f"{cause} ({n})" for cause, n in tous[m]["causes_d_echec"].items()))
    lignes += ["", "**Désaccords avec le dossier déclaré**", ""]
    if not donnees["desaccords"]:
        lignes.append("Aucun.")
    else:
        lignes += ["| N° | Méthode | Trouvé | Déclaré | Titre |", "|---|---|---|---|---|"]
        for d in donnees["desaccords"]:
            lignes.append(
                f"| {d['numero']} | {d['methode']} | {d['trouve']} "
                f"({titres.get(d['trouve'], '?')[:60]}) | {d['declare']} "
                f"({titres.get(d['declare'], '?')[:60]}) | {d['titre'][:110]} |")
    RAPPORT.write_text("\n".join(lignes).rstrip() + "\n", encoding="utf-8")


# --- Programme --------------------------------------------------------------------------------


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--nouvel-echantillon", action="store_true",
                        help="retirer un échantillon au lieu de garder celui d'echantillon.csv")
    args = parser.parse_args()

    print("Lecture des archives", flush=True)
    scrutins = charger_scrutins()
    index, titres = charger_index(RAW / ARCHIVES["dossiers"], RAW / ARCHIVES["agenda"],
                                  RAW / ARCHIVES["amendements"])
    print("Rattachement", flush=True)
    rattacher(scrutins, index)

    par_uid = {s["uid"]: s for s in scrutins}
    anciens = [ligne["uid"] for ligne in lire_csv(ECHANTILLON)]
    if args.nouvel_echantillon or not anciens or any(u not in par_uid for u in anciens):
        anciens = tirer_echantillon(scrutins)
    echantillon = sorted((par_uid[u] for u in anciens), key=lambda s: s["numero"])
    verifs = {v["uid"]: v for v in lire_csv(VERIFICATION) if v.get("dossier_attendu")}

    SORTIE.mkdir(parents=True, exist_ok=True)
    ecrire_csv(ECHANTILLON, [ligne_echantillon(s, titres) for s in echantillon])
    donnees = synthese(scrutins, echantillon, verifs, index)
    SYNTHESE.write_text(json.dumps(donnees, indent=1, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    ecrire_rapport(donnees, echantillon, titres, verifs)
    for m in METHODES:
        g = donnees["tous"][m]["global"]
        e = donnees["echantillon"][m]["global"]
        print(f"  {METHODES[m]:<18} échantillon {e['conclut']}/{e['scrutins']} · "
              f"tous {g['conclut']}/{g['scrutins']} · désaccords avec le déclaré "
              f"{g['desaccord_avec_declare']}/{g['compares_au_declare']}")
    print(f"Écrit : {ECHANTILLON.relative_to(RACINE)}, {SYNTHESE.relative_to(RACINE)}, "
          f"{RAPPORT.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
