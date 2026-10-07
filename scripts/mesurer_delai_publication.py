"""Mesure du délai entre un scrutin et sa présence dans l'archive open data (question ouverte 1).

À lancer toutes les heures (workflow « Mesure du délai de publication ») :
    uv run python -m scripts.mesurer_delai_publication

Chaque passage lit la date de modification de l'archive des scrutins sur le serveur d'origine
(paramètre anti-cache). Quand elle change, on télécharge l'archive et on relève les scrutins
qu'on n'avait jamais vus : leur date de publication est la date de modification de cette version.
L'heure exacte d'un vote n'est pas publiée ; on encadre donc le délai avec l'heure de début et de
fin (prévue) de la séance, lues dans l'agenda.

Le premier passage ne mesure rien : il note les scrutins déjà publiés (référence).

Produit :
    data/mesures/delai_publication/etat.json      référence du suivi
    data/mesures/delai_publication/versions.csv   versions de l'archive observées
    data/mesures/delai_publication/scrutins.csv   scrutins apparus pendant le suivi
    docs/delai-publication.md                     rapport
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import statistics
import sys
import time
import zipfile
from collections import Counter
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path

import httpx

from pipeline.an import URL_AGENDA, URL_SCRUTINS, champ, sans_cache, val

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "mesures" / "delai_publication"
RAPPORT = RACINE / "docs" / "delai-publication.md"
TENTATIVES = 3
NOM_SCRUTIN = re.compile(r"json/(VTANR5L17V(\d+))\.json")

CHAMPS_VERSIONS = [
    "derniere_modification", "observee_le", "taille", "scrutins", "dernier_numero",
    "nouveaux_scrutins",
]
CHAMPS_SCRUTINS = [
    "uid", "numero", "date_scrutin", "type_vote", "seance_ref", "debut_seance", "fin_seance",
    "publie_le", "observe_le",
]
TRANCHES = [(1, "moins de 1 h"), (3, "1 à 3 h"), (6, "3 à 6 h"), (12, "6 à 12 h"),
            (24, "12 à 24 h"), (float("inf"), "plus de 24 h")]


# --- Réseau -----------------------------------------------------------------------------------


def requete(client: httpx.Client, methode: str, url: str) -> httpx.Response:
    for tentative in range(1, TENTATIVES + 1):
        try:
            reponse = client.request(methode, sans_cache(url))
            reponse.raise_for_status()
            return reponse
        except httpx.HTTPError as erreur:
            if tentative == TENTATIVES:
                raise
            print(f"  échec ({erreur.__class__.__name__}), nouvelle tentative…", flush=True)
            time.sleep(20 * tentative)
    raise AssertionError("inatteignable")


def date_http(reponse: httpx.Response) -> str:
    """Last-Modified du serveur d'origine, en ISO UTC."""
    return iso(parsedate_to_datetime(reponse.headers["last-modified"]))


def iso(moment: datetime) -> str:
    return moment.astimezone(UTC).isoformat(timespec="seconds")


def maintenant() -> str:
    return iso(datetime.now(UTC))


# --- Fichiers de mesure -----------------------------------------------------------------------


def lire_csv(chemin: Path) -> list[dict]:
    if not chemin.exists():
        return []
    with chemin.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def ecrire_csv(chemin: Path, champs: list[str], lignes: list[dict]) -> None:
    with chemin.open("w", encoding="utf-8", newline="") as f:
        ecrivain = csv.DictWriter(f, champs, lineterminator="\n")
        ecrivain.writeheader()
        ecrivain.writerows(lignes)


def scrutins_de_l_archive(archive: zipfile.ZipFile) -> dict[str, int]:
    """uid → numéro, d'après les noms de fichiers (sans lire les JSON)."""
    trouves = (NOM_SCRUTIN.fullmatch(nom) for nom in archive.namelist())
    return {m.group(1): int(m.group(2)) for m in trouves if m}


def est_connu(uid: str, numero: int, etat: dict, deja_vus: set[str]) -> bool:
    reference = etat["reference"]
    return uid in deja_vus or (
        numero <= reference["dernier_numero"] and numero not in reference["numeros_manquants"]
    )


def seances(client: httpx.Client, refs: set[str]) -> dict[str, tuple[str, str | None]]:
    """seanceRef → (début, fin prévue), lus dans l'agenda."""
    if not refs:
        return {}
    archive = zipfile.ZipFile(io.BytesIO(requete(client, "GET", URL_AGENDA).content))
    noms = set(archive.namelist())
    trouvees = {}
    for ref in refs:
        nom = f"json/reunion/{ref}.json"
        if nom in noms:
            reunion = json.loads(archive.read(nom))["reunion"]
            trouvees[ref] = (reunion["timeStampDebut"], val(reunion.get("timeStampFin")))
    return trouvees


# --- Passage ----------------------------------------------------------------------------------


def passage(client: httpx.Client, sortie: Path) -> bool:
    """Un relevé ; renvoie True si les mesures ont changé."""
    sortie.mkdir(parents=True, exist_ok=True)
    chemin_etat = sortie / "etat.json"
    versions = lire_csv(sortie / "versions.csv")
    scrutins = lire_csv(sortie / "scrutins.csv")

    tete = requete(client, "HEAD", URL_SCRUTINS)
    modification = date_http(tete)
    if versions and modification <= versions[-1]["derniere_modification"]:
        print(f"Archive inchangée (modifiée le {modification}).")
        return False

    observee_le = maintenant()
    reponse = requete(client, "GET", URL_SCRUTINS)
    modification = date_http(reponse)
    archive = zipfile.ZipFile(io.BytesIO(reponse.content))
    presents = scrutins_de_l_archive(archive)
    version = {
        "derniere_modification": modification,
        "observee_le": observee_le,
        "taille": len(reponse.content),
        "scrutins": len(presents),
        "dernier_numero": max(presents.values()),
    }

    if not chemin_etat.exists():
        numeros = set(presents.values())
        etat = {
            "debut_du_suivi": observee_le,
            "reference": {
                "derniere_modification": modification,
                "dernier_numero": max(numeros),
                "numeros_manquants": sorted(set(range(1, max(numeros) + 1)) - numeros),
            },
        }
        chemin_etat.write_text(json.dumps(etat, indent=2, ensure_ascii=False) + "\n",
                               encoding="utf-8")
        ecrire_csv(sortie / "versions.csv", CHAMPS_VERSIONS,
                   [{**version, "nouveaux_scrutins": "référence"}])
        ecrire_csv(sortie / "scrutins.csv", CHAMPS_SCRUTINS, [])
        print(f"Référence : {len(presents)} scrutins publiés (archive du {modification}).")
        return True

    etat = json.loads(chemin_etat.read_text(encoding="utf-8"))
    deja_vus = {ligne["uid"] for ligne in scrutins}
    nouveaux = []
    for uid, numero in sorted(presents.items(), key=lambda p: p[1]):
        if est_connu(uid, numero, etat, deja_vus):
            continue
        scrutin = json.loads(archive.read(f"json/{uid}.json"))["scrutin"]
        nouveaux.append({
            "uid": uid,
            "numero": numero,
            "date_scrutin": scrutin["dateScrutin"],
            "type_vote": champ(scrutin, "typeVote", "codeTypeVote"),
            "seance_ref": scrutin["seanceRef"],
            "debut_seance": "",
            "fin_seance": "",
            "publie_le": modification,
            "observe_le": observee_le,
        })
    scrutins += nouveaux

    # Heures de séance : pour les nouveaux scrutins et ceux que l'agenda ne connaissait pas encore.
    sans_seance = {ligne["seance_ref"] for ligne in scrutins if not ligne["debut_seance"]}
    if sans_seance:
        trouvees = seances(client, sans_seance)
        for ligne in scrutins:
            if not ligne["debut_seance"] and ligne["seance_ref"] in trouvees:
                debut, fin = trouvees[ligne["seance_ref"]]
                ligne["debut_seance"], ligne["fin_seance"] = debut, fin or ""

    versions.append({**version, "nouveaux_scrutins": len(nouveaux)})
    ecrire_csv(sortie / "versions.csv", CHAMPS_VERSIONS, versions)
    ecrire_csv(sortie / "scrutins.csv", CHAMPS_SCRUTINS, scrutins)
    print(f"Nouvelle version du {modification} : {len(nouveaux)} nouveaux scrutins.")
    return True


# --- Rapport ----------------------------------------------------------------------------------


def heures(debut: str, fin: str) -> float:
    return (datetime.fromisoformat(fin) - datetime.fromisoformat(debut)).total_seconds() / 3600


def lendemain_8h(ligne: dict) -> datetime:
    """Le lendemain du scrutin à 8 h, à l'heure locale de la séance."""
    fuseau = datetime.fromisoformat(ligne["debut_seance"]).tzinfo
    jour = datetime.fromisoformat(ligne["date_scrutin"]).replace(tzinfo=fuseau)
    return jour + timedelta(days=1, hours=8)


def resume(valeurs: list[float]) -> str:
    if not valeurs:
        return "—"
    valeurs = sorted(valeurs)
    p90 = valeurs[min(len(valeurs) - 1, int(0.9 * len(valeurs)))]
    return (f"min {valeurs[0]:.1f} h · médiane {statistics.median(valeurs):.1f} h · "
            f"90 % ≤ {p90:.1f} h · max {valeurs[-1]:.1f} h").replace(".", ",")


def tranche(valeur: float) -> str:
    return next(nom for borne, nom in TRANCHES if valeur < borne)


def lignes_delais(titre: str, lignes: list[dict]) -> list[str]:
    avec_fin = [ligne for ligne in lignes if ligne["fin_seance"]]
    depuis_fin = [heures(ligne["fin_seance"], ligne["publie_le"]) for ligne in avec_fin]
    depuis_debut = [heures(ligne["debut_seance"], ligne["publie_le"]) for ligne in lignes]
    matin = sum(
        datetime.fromisoformat(ligne["publie_le"]) <= lendemain_8h(ligne) for ligne in lignes
    )
    repartition = Counter(tranche(max(d, 0)) for d in depuis_fin)
    sortie = [
        f"**{titre}** : {len(lignes)} scrutins",
        "",
        f"- Depuis la fin prévue de la séance (borne basse) : {resume(depuis_fin)}",
        f"- Depuis le début de la séance (borne haute) : {resume(depuis_debut)}",
        f"- Publiés au plus tard le lendemain du vote à 8 h : {matin} sur {len(lignes)}",
    ]
    if repartition:
        sortie.append("- Répartition depuis la fin prévue : " + " · ".join(
            f"{nom} : {repartition[nom]}" for _, nom in TRANCHES if repartition[nom]
        ))
    return sortie + [""]


def ecrire_rapport(sortie: Path, rapport: Path) -> None:
    etat = json.loads((sortie / "etat.json").read_text(encoding="utf-8"))
    versions = lire_csv(sortie / "versions.csv")
    scrutins = [ligne for ligne in lire_csv(sortie / "scrutins.csv") if ligne["debut_seance"]]
    sans_seance = len(lire_csv(sortie / "scrutins.csv")) - len(scrutins)
    modifications = [v["derniere_modification"] for v in versions]
    ecarts = [heures(a, b) for a, b in zip(modifications, modifications[1:], strict=False)]
    heures_utc = Counter(m[11:13] for m in modifications[1:])

    texte = [
        "# Délai de publication des scrutins",
        "",
        f"Généré le {maintenant()} par `uv run python -m scripts.mesurer_delai_publication`. "
        "Données : `data/mesures/delai_publication/`.",
        "",
        "## Méthode",
        "",
        "- Toutes les heures, on lit la date de modification de l'archive des scrutins sur le "
        "serveur d'origine. Un paramètre anti-cache est nécessaire, car le serveur garde les "
        "fichiers 4 h en cache.",
        "- Un scrutin est daté de la première version de l'archive qui le contient. On retient "
        "la date de modification de cette version, pas l'heure de l'observation, si bien que le "
        "rythme du relevé ne fausse pas la mesure.",
        "- L'heure du vote n'est pas publiée. Le délai est encadré entre la fin prévue de la "
        "séance (borne basse, négative si l'archive a été régénérée pendant la séance) et son "
        "début (borne haute). Ces heures viennent de l'agenda.",
        "- Limites : si l'archive est régénérée deux fois entre deux relevés, ou si un relevé "
        "échoue, les scrutins sont datés de la version suivante, et le délai est alors "
        "surestimé. Les écarts entre versions ci-dessous permettent de repérer ces trous.",
        "",
        "## Suivi",
        "",
        f"- Début du suivi : {etat['debut_du_suivi']}. La référence, c'est-à-dire l'archive du "
        f"{etat['reference']['derniere_modification']}, contenait les scrutins 1 à "
        f"{etat['reference']['dernier_numero']}. Ils ne sont pas mesurés.",
        f"- Versions observées après la référence : {len(versions) - 1}",
    ]
    if ecarts:
        texte.append(f"- Écart entre deux versions : {resume(ecarts)}")
        texte.append("- Heure (UTC) des versions : " + " · ".join(
            f"{h} h : {n}" for h, n in sorted(heures_utc.items())
        ))
    if sans_seance:
        texte.append(f"- Scrutins dont la séance est absente de l'agenda : {sans_seance}")
    texte += ["", "## Délais", ""]
    if scrutins:
        texte += lignes_delais("Tous les scrutins", scrutins)
        solennels = [ligne for ligne in scrutins if ligne["type_vote"] == "SPS"]
        texte += lignes_delais("Scrutins solennels", solennels) if solennels else [
            "Aucun scrutin solennel mesuré pour l'instant.", ""]
    else:
        texte += ["Aucun scrutin mesuré pour l'instant.", ""]
    texte += ["## Versions observées", "", "| Modifiée le (UTC) | Observée le (UTC) | Scrutins "
              "| Dernier numéro | Nouveaux |", "|---|---|---|---|---|"]
    for v in versions:
        texte.append(f"| {v['derniere_modification']} | {v['observee_le']} | {v['scrutins']} | "
                     f"{v['dernier_numero']} | {v['nouveaux_scrutins']} |")
    rapport.write_text("\n".join(texte) + "\n", encoding="utf-8")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sortie", type=Path, default=SORTIE, help="dossier des mesures")
    parser.add_argument("--rapport", type=Path, default=RAPPORT, help="rapport Markdown")
    args = parser.parse_args()
    with httpx.Client(follow_redirects=True, timeout=httpx.Timeout(60, read=300)) as client:
        if passage(client, args.sortie):
            ecrire_rapport(args.sortie, args.rapport)


if __name__ == "__main__":
    main()
