"""Les 6 contrôles du pipeline et l'arrêt du build (tâche t13, planning § 4.5).

Usage :
    uv run python -m pipeline.checks

| N° | Contrôle | Échec |
|---|---|---|
| 1 | Partition : une case par député en exercice et par scrutin | scrutin mis de côté |
| 2 | Totaux : décompte égal au décompte publié | scrutin mis de côté |
| 3 | Effectifs : cohérents entre sources | build arrêté |
| 4 | Non-régression : un résultat déjà publié ne change pas | build arrêté |
| 5 | Schéma : les sources ont la structure attendue | build arrêté |
| 6 | Fraîcheur : l'archive des scrutins n'est pas trop ancienne | alerte, sans arrêt |

Un build arrêté ne publie rien : la version en ligne reste la dernière valide, et une issue
GitHub est ouverte (workflow nuit.yml). Un scrutin mis de côté n'est pas publié ; les autres le
sont.

Lit data/site.duckdb (pipeline/normalize.py), data/raw/ et data/sources/etat.json. Produit :
    data/controles/resultat.json   résultat des contrôles (lu par l'export, puis par t14)
    data/controles/publies.json    empreinte des résultats publiés (non-régression), versionné
    data/raw/alerte_controles.md   texte de l'issue, si un contrôle bloquant ou la fraîcheur échoue
Code de sortie : 1 si le build doit s'arrêter, 0 sinon.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path

import duckdb

from pipeline.an import champ, documents, liste
from pipeline.normalize import ecarts_partition_totaux
from pipeline.sources import SOURCES, nom_fichier

RACINE = Path(__file__).resolve().parent.parent
RAW = RACINE / "data" / "raw"
BASE = RACINE / "data" / "site.duckdb"
ETAT = RACINE / "data" / "sources" / "etat.json"
CONTROLES = RACINE / "data" / "controles"
DEROGATIONS = CONTROLES / "derogations.json"

SIEGES = 577
# En dessous, l'Assemblée serait anormalement vide : signe d'une erreur de mandats.
MINIMUM_EN_EXERCICE = 540
FRAICHEUR_MAX = timedelta(hours=72)

# 5. Chemins qui doivent exister dans chaque document des sources requises.
SCHEMA = {
    "scrutins": ("", [
        ("scrutin", "uid"), ("scrutin", "numero"), ("scrutin", "dateScrutin"),
        ("scrutin", "typeVote", "codeTypeVote"), ("scrutin", "sort", "code"),
        ("scrutin", "titre"), ("scrutin", "syntheseVote", "nbrSuffragesRequis"),
        ("scrutin", "syntheseVote", "decompte"),
        ("scrutin", "ventilationVotes", "organe", "groupes", "groupe"),
    ]),
    "historique_mandats": ("json/acteur/", [("acteur", "uid", "#text"),
                                            ("acteur", "mandats", "mandat")]),
    "deputes_actifs": ("json/acteur/", [("acteur", "uid", "#text"),
                                        ("acteur", "mandats", "mandat")]),
    "dossiers_legislatifs": ("json/dossierParlementaire/", [
        ("dossierParlementaire", "uid"), ("dossierParlementaire", "titreDossier", "titre")]),
    "agenda": ("", [("reunion", "uid"), ("reunion", "timeStampDebut")]),
}


def archive(raw: Path, source_id: str) -> Path:
    return raw / nom_fichier(next(s for s in SOURCES if s["id"] == source_id))


def resultat(numero: int, nom: str, reussi: bool, details: list[str], bloquant: bool) -> dict:
    return {"numero": numero, "nom": nom, "reussi": reussi, "bloquant": bloquant,
            "details": details}


# --- 1 et 2 : partition et totaux, par scrutin ------------------------------------------------


def controle_partition_totaux(con: duckdb.DuckDBPyConnection) -> tuple[dict, dict, list[dict]]:
    ecarts = ecarts_partition_totaux(con)
    partition = [e for e in ecarts if any(r.startswith("partition") for r in e["raisons"])]
    totaux = [e for e in ecarts if any(r.startswith("totaux") for r in e["raisons"])]
    detail = lambda es: [f"n° {e['numero']} : {' ; '.join(e['raisons'])}" for e in es]  # noqa: E731
    return (resultat(1, "partition", not partition, detail(partition), bloquant=False),
            resultat(2, "totaux", not totaux, detail(totaux), bloquant=False),
            ecarts)


# --- 3 : effectifs ----------------------------------------------------------------------------


def actifs_amo10(chemin: Path) -> dict[str, str | None]:
    """Députés en exercice selon AMO10, avec leur groupe en cours."""
    actifs = {}
    for _, doc in documents(chemin, "json/acteur/"):
        acteur = doc["acteur"]
        groupes = [liste(champ(m, "organes", "organeRef"))[0]
                   for m in liste(champ(acteur, "mandats", "mandat"))
                   if m.get("typeOrgane") == "GP" and champ(m, "dateFin") is None]
        actifs[acteur["uid"]["#text"]] = groupes[0] if groupes else None
    return actifs


def controle_effectifs(con: duckdb.DuckDBPyConnection, raw: Path) -> dict:
    """Effectifs cohérents : jamais plus de 577 députés ni moins de MINIMUM_EN_EXERCICE en
    exercice ; aujourd'hui, mêmes députés et mêmes groupes que la liste des députés en exercice
    (AMO10), une autre archive que l'historique (AMO30) qui sert à la normalisation.

    La ventilation publiée des scrutins n'est pas une référence : elle compte les nouveaux
    députés avec retard et garde des groupes dissous (docs/normalisation.md)."""
    details = []
    for numero, n in con.execute(
            "SELECT s.numero, count(*) FROM vote v JOIN scrutin s ON s.uid = v.scrutin_uid "
            "GROUP BY ALL HAVING count(*) > ? OR count(*) < ? ORDER BY 1",
            [SIEGES, MINIMUM_EN_EXERCICE]).fetchall():
        details.append(f"scrutin n° {numero} : {n} députés en exercice")
    nous = dict(con.execute("""
        SELECT m.depute_uid, any_value(a.groupe_uid) FROM mandat m
        LEFT JOIN appartenance a ON a.depute_uid = m.depute_uid AND a.fin IS NULL
        WHERE m.fin IS NULL GROUP BY ALL""").fetchall())
    amo10 = actifs_amo10(archive(raw, "deputes_actifs"))
    for pa in sorted(set(nous) - set(amo10)):
        details.append(f"{pa} en exercice selon l'historique, pas selon la liste des actifs")
    for pa in sorted(set(amo10) - set(nous)):
        details.append(f"{pa} en exercice selon la liste des actifs, pas selon l'historique")
    for pa in sorted(set(nous) & set(amo10)):
        if nous[pa] != amo10[pa]:
            details.append(f"{pa} : groupe {nous[pa]} selon l'historique, {amo10[pa]} selon la "
                           "liste des actifs")
    return resultat(3, "effectifs", not details, details[:50], bloquant=True)


# --- 4 : non-régression -----------------------------------------------------------------------


def empreintes(con: duckdb.DuckDBPyConnection, ecartes: set[str]) -> dict[str, str]:
    """Empreinte du résultat de chaque scrutin publiable : sort et position de chaque député.

    XOR des MD5 des cases « député:position » : indépendant de l'ordre des lignes, et calculé en
    moins d'une seconde (une agrégation triée de chaînes prend 8 minutes sur 4,9 millions de
    cases et fait planter DuckDB). La partition garantit qu'aucune case n'est en double."""
    lignes = con.execute("""
        SELECT s.uid, s.sort, bit_xor(md5_number(v.depute_uid || ':' || v.position)), count(*)
        FROM vote v JOIN scrutin s ON s.uid = v.scrutin_uid GROUP BY ALL""").fetchall()
    return {uid: f"{sort}|{cases}|{empreinte:032x}"[:-16]
            for uid, sort, empreinte, cases in lignes if uid not in ecartes}


def controle_non_regression(actuelles: dict[str, str], publiees: dict[str, str],
                            derogations: dict[str, str],
                            mis_de_cote: frozenset[str] = frozenset()) -> dict:
    """Un scrutin déjà publié ne disparaît pas et son résultat ne change pas, sauf dérogation
    écrite par Julien dans data/controles/derogations.json ({uid: raison})."""
    details = []
    for uid, empreinte in sorted(publiees.items()):
        if uid in derogations:
            continue
        if uid in mis_de_cote:
            details.append(f"{uid} publié, mais désormais mis de côté (partition ou totaux)")
        elif uid not in actuelles:
            details.append(f"{uid} publié mais absent du nouveau build")
        elif actuelles[uid] != empreinte:
            details.append(f"{uid} : le résultat publié a changé")
    return resultat(4, "non-régression", not details, details[:50], bloquant=True)


# --- 5 : schéma -------------------------------------------------------------------------------


def controle_schema(raw: Path) -> dict:
    details = []
    for source_id, (prefixe, chemins) in SCHEMA.items():
        chemin = archive(raw, source_id)
        if not chemin.exists():
            details.append(f"{source_id} : archive absente")
            continue
        nb, manquants = 0, {}
        try:
            for nom, doc in documents(chemin, prefixe):
                nb += 1
                for c in chemins:
                    if champ(doc, *c) is None:
                        manquants.setdefault(".".join(c), nom)
        except Exception as erreur:  # archive illisible : c'est aussi un échec de schéma
            details.append(f"{source_id} : archive illisible ({erreur.__class__.__name__})")
            continue
        if nb == 0:
            details.append(f"{source_id} : aucun document")
        details += [f"{source_id} : « {c} » absent (premier cas : {nom})"
                    for c, nom in manquants.items()]
    return resultat(5, "schéma", not details, details, bloquant=True)


# --- 6 : fraîcheur ----------------------------------------------------------------------------


def controle_fraicheur(etat: dict, maintenant: datetime) -> dict:
    """La dernière version de l'archive des scrutins date de moins de 72 h (elle est
    régénérée plusieurs fois par jour, même sans nouveau scrutin)."""
    date = (etat.get("scrutins") or {}).get("derniere_modification")
    if not date:
        return resultat(6, "fraîcheur", False, ["date de l'archive des scrutins inconnue"],
                        bloquant=False)
    age = maintenant - parsedate_to_datetime(date)
    reussi = age <= FRAICHEUR_MAX
    heures = age.total_seconds() / 3600
    details = [] if reussi else [f"archive des scrutins vieille de {heures:.0f} h (au-delà de "
                                 f"{FRAICHEUR_MAX.total_seconds() / 3600:.0f} h)"]
    return resultat(6, "fraîcheur", reussi, details, bloquant=False)


# --- Ensemble ---------------------------------------------------------------------------------


def lire_json(chemin: Path, defaut):
    return json.loads(chemin.read_text(encoding="utf-8")) if chemin.exists() else defaut


def controler(base: Path, raw: Path, etat_chemin: Path, controles: Path,
              maintenant: datetime | None = None) -> dict:
    maintenant = maintenant or datetime.now(UTC)
    con = duckdb.connect(str(base), read_only=True)
    try:
        partition, totaux, ecarts = controle_partition_totaux(con)
        effectifs = controle_effectifs(con, raw)
        ecartes = {e["uid"] for e in ecarts}
        actuelles = empreintes(con, ecartes)
    finally:
        con.close()
    publiees = lire_json(controles / "publies.json", {})
    non_regression = controle_non_regression(actuelles, publiees,
                                             lire_json(controles / "derogations.json", {}),
                                             frozenset(ecartes))
    resultats = [partition, totaux, effectifs, non_regression, controle_schema(raw),
                 controle_fraicheur(lire_json(etat_chemin, {}), maintenant)]
    arret = any(r["bloquant"] and not r["reussi"] for r in resultats)
    rapport = {
        "controle_le": maintenant.isoformat(timespec="seconds"),
        "build_arrete": arret,
        "controles": resultats,
        "scrutins_mis_de_cote": [{"uid": e["uid"], "numero": e["numero"],
                                  "raison": " ; ".join(e["raisons"])} for e in ecarts],
    }
    controles.mkdir(parents=True, exist_ok=True)
    (controles / "resultat.json").write_text(
        json.dumps(rapport, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    if not arret:
        # Ce qui sera publié devient la référence de la nuit suivante. Un scrutin mis de côté
        # n'est pas publié : il n'entre pas dans la référence.
        (controles / "publies.json").write_text(
            json.dumps(dict(sorted(actuelles.items())), indent=0) + "\n", encoding="utf-8")
    return rapport


def texte_alerte(rapport: dict) -> str | None:
    echecs = [r for r in rapport["controles"] if not r["reussi"]
              and (r["bloquant"] or r["numero"] == 6)]
    if not echecs:
        return None
    lignes = ["**Build arrêté** : la version en ligne reste la dernière valide."
              if rapport["build_arrete"] else "Alerte sans arrêt du build.", ""]
    for r in echecs:
        lignes.append(f"### Contrôle {r['numero']} · {r['nom']}")
        lignes += [f"- {d}" for d in r["details"][:20]] + [""]
    return "\n".join(lignes)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    rapport = controler(BASE, RAW, ETAT, CONTROLES)
    for r in rapport["controles"]:
        etat = "ok" if r["reussi"] else ("ÉCHEC" if r["bloquant"] else "échec (non bloquant)")
        print(f"  {r['numero']} · {r['nom']} : {etat}")
        for d in r["details"][:10]:
            print(f"      {d}")
    print(f"Scrutins mis de côté : {len(rapport['scrutins_mis_de_cote'])}")
    alerte = texte_alerte(rapport)
    fichier = RAW / "alerte_controles.md"
    if alerte:
        fichier.write_text(alerte, encoding="utf-8")
    else:
        fichier.unlink(missing_ok=True)
    print("Build arrêté." if rapport["build_arrete"] else "Build autorisé.")
    return 1 if rapport["build_arrete"] else 0


if __name__ == "__main__":
    sys.exit(main())
