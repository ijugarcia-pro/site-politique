"""Export des données du site : les 577 sièges, aujourd'hui et à chaque vote publié (t17, t18).

Usage :
    uv run python -m pipeline.export_site

Lit data/site.duckdb (pipeline/normalize.py) et produit, à chaque build autorisé :
    export/site/composition.json       l'Assemblée aujourd'hui : groupes et sièges
    export/site/scrutins.json          l'index des votes qui ont une page, du plus récent au
                                       plus ancien
    export/site/scrutins/{uid}.json    chacun de ces votes, siège par siège, avec le parcours
                                       de son texte
puis les députés et la recherche par code postal (pipeline/export_deputes.py).

Un vote a sa page s'il est solennel, ou s'il porte sur l'ensemble d'un texte, une partie de
budget, une résolution ou une motion de censure : les votes que « Ce que ça change » pourra
expliquer (docs/rattachement.md), et les motions de censure. Les amendements, les articles et
les motions de procédure n'en ont pas.

Règles :
- 577 sièges exactement ; un siège sans député en exercice est « vacant » et placé à la fin ;
- les groupes sont rangés dans l'ordre de leurs places dans l'hémicycle : médiane des numéros
  de siège officiels (`placeHemicycle`) de leurs membres, du plus grand au plus petit, ce qui
  donne de gauche à droite l'ordre du schéma officiel ; les non-inscrits, dispersés dans la
  salle, sont mis à la fin. Aucun score ni axe : seulement l'ordre des places ;
- dans un groupe, les députés suivent le même ordre des places, puis l'ordre alphabétique ;
- clés = identifiants officiels (PA…, PO…, VTANR…, DLR…).
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import date
from pathlib import Path

import duckdb

from pipeline import export_deputes

RACINE = Path(__file__).resolve().parent.parent
BASE = RACINE / "data" / "site.duckdb"
EXPORT = RACINE / "export" / "site"
SIEGES = 577
NON_INSCRITS = "PO840056"
# Catégories de scrutin qui ont une page, en plus des scrutins solennels.
CATEGORIES_PAGES = ("ensemble", "partie", "résolution", "motion de censure")
POSITIONS = ("pour", "contre", "abstention", "non_votant", "absent")
LIEN_SCRUTIN = "https://www.assemblee-nationale.fr/dyn/17/scrutins/{numero}"
LIEN_DOSSIER = "https://www.assemblee-nationale.fr/dyn/17/dossiers/{chemin}"

# Les grandes étapes du parcours d'un texte (étapes de premier niveau du dossier législatif).
# Les autres (« Travaux », « Débat » des rapports d'information) ne sont pas des étapes d'un
# texte voté : elles ne sont pas affichées.
ETAPES = {
    "AN1": "Première lecture à l'Assemblée",
    "SN1": "Première lecture au Sénat",
    "AN2": "Deuxième lecture à l'Assemblée",
    "SN2": "Deuxième lecture au Sénat",
    "CMP": "Commission mixte paritaire",
    "ANNLEC": "Nouvelle lecture à l'Assemblée",
    "SNNLEC": "Nouvelle lecture au Sénat",
    "ANLDEF": "Lecture définitive à l'Assemblée",
    "ANLUNI": "Lecture unique à l'Assemblée",
    "CC": "Conseil constitutionnel",
    "PROM": "Promulgation",
    "AN-APPLI": "Mise en application",
}

# Dernière place connue de chaque député (mandat le plus récent).
SQL_PLACES = """
SELECT depute_uid, try_cast(place_hemicycle AS INTEGER) AS place
FROM mandat
QUALIFY row_number() OVER (PARTITION BY depute_uid ORDER BY debut DESC) = 1
"""


def ordre_groupes(con: duckdb.DuckDBPyConnection) -> dict[str, int]:
    """Rang de chaque groupe, de la gauche à la droite du schéma ; non-inscrits à la fin.

    Un groupe dissous est placé d'après les places actuelles de ses anciens membres.
    """
    lignes = con.execute(f"""
        WITH places AS ({SQL_PLACES})
        SELECT g.uid, median(p.place) AS mediane, try_cast(g.preseance AS INTEGER) AS preseance
        FROM groupe g
        LEFT JOIN appartenance a ON a.groupe_uid = g.uid
        LEFT JOIN places p ON p.depute_uid = a.depute_uid
        GROUP BY g.uid, g.preseance
    """).fetchall()

    def cle(ligne):
        uid, mediane, preseance = ligne
        return (uid == NON_INSCRITS, mediane is None, -(mediane or 0), preseance or 99, uid)

    return {uid: rang for rang, (uid, *_) in enumerate(sorted(lignes, key=cle))}


def groupes(con: duckdb.DuckDBPyConnection, uids: set[str], rangs: dict[str, int]) -> list[dict]:
    lignes = con.execute(
        "SELECT uid, sigle, libelle, couleur FROM groupe WHERE list_contains(?, uid)",
        [sorted(uids)]).fetchall()
    sortie = [{"uid": u, "sigle": s, "libelle": lib, "couleur": c,
               "non_inscrits": u == NON_INSCRITS} for u, s, lib, c in lignes]
    return sorted(sortie, key=lambda g: rangs.get(g["uid"], len(rangs)))


def completer(sieges: list[dict], rangs: dict[str, int]) -> list[dict]:
    """Trie les sièges et complète jusqu'à 577 avec des sièges vacants."""
    if len(sieges) > SIEGES:
        raise ValueError(f"{len(sieges)} députés pour {SIEGES} sièges")
    sieges = sorted(sieges, key=lambda s: (rangs.get(s["groupe"], len(rangs)),
                                           -(s.pop("_place") or 0), s.pop("_tri") or ""))
    return sieges + [{"vacant": True} for _ in range(SIEGES - len(sieges))]


def composition(con: duckdb.DuckDBPyConnection, rangs: dict[str, int], jour: date) -> dict:
    """Les députés en exercice ce jour-là, avec leur groupe à cette date."""
    lignes = con.execute(f"""
        WITH places AS ({SQL_PLACES})
        SELECT d.uid, d.prenom || ' ' || d.nom, d.nom_tri, a.groupe_uid, p.place
        FROM mandat m
        JOIN depute d ON d.uid = m.depute_uid
        JOIN appartenance a ON a.depute_uid = m.depute_uid
             AND a.debut <= $jour AND (a.fin IS NULL OR a.fin >= $jour)
        LEFT JOIN places p ON p.depute_uid = d.uid
        WHERE m.debut <= $jour AND (m.fin IS NULL OR m.fin >= $jour)
    """, {"jour": jour}).fetchall()
    sieges = [{"depute": uid, "nom": nom, "groupe": g, "_place": place, "_tri": tri}
              for uid, nom, tri, g, place in lignes]
    effectifs: dict[str, int] = {}
    for s in sieges:
        effectifs[s["groupe"]] = effectifs.get(s["groupe"], 0) + 1
    liste = groupes(con, set(effectifs), rangs)
    for g in liste:
        g["membres"] = effectifs[g["uid"]]
    return {"date": jour.isoformat(), "groupes": liste, "sieges": completer(sieges, rangs)}


def parcours(con: duckdb.DuckDBPyConnection, dossier: str, uid: str,
             jour: date) -> list[dict]:
    """Les grandes étapes du texte, dans l'ordre du dossier, avec leurs dates.

    Une étape de premier niveau couvre les étapes qui la suivent dans le dossier, jusqu'à la
    suivante. `ce_vote` marque celle qui contient le scrutin : par l'acte qui le cite, sinon
    par sa date (étape de l'Assemblée seulement).
    """
    lignes = con.execute("""
        SELECT code, parent_uid IS NULL, date, scrutins
        FROM etape WHERE dossier_uid = ? ORDER BY ordre""", [dossier]).fetchall()
    etapes: list[dict] = []
    for code, tete, jour_etape, scrutins in lignes:
        if tete:
            etapes.append({"code": code, "dates": [], "cite": False})
        elif etapes:
            if jour_etape:
                etapes[-1]["dates"].append(jour_etape)
            if scrutins == uid:
                etapes[-1]["cite"] = True
    etapes = [e for e in etapes if e["code"] in ETAPES]
    cite = any(e["cite"] for e in etapes)
    sortie = []
    for e in etapes:
        debut = min(e["dates"]) if e["dates"] else None
        fin = max(e["dates"]) if e["dates"] else None
        par_date = (not cite and e["code"].startswith("AN") and debut is not None
                    and debut <= jour <= fin)
        sortie.append({
            "code": e["code"], "libelle": ETAPES[e["code"]],
            "debut": debut.isoformat() if debut else None,
            "fin": fin.isoformat() if fin else None,
            "ce_vote": e["cite"] or par_date,
        })
    return sortie


def scrutin(con: duckdb.DuckDBPyConnection, uid: str, rangs: dict[str, int]) -> dict:
    """Un scrutin : décompte, position de chaque groupe, vote de chaque siège, et son texte."""
    (numero, jour, titre, sort, type_vote, categorie, solennel, censure, requis, inverser,
     pour_p, contre_p, abst_p, nv_p, dossier_uid) = con.execute("""
        SELECT numero, date, titre, sort, type_vote, categorie, solennel, motion_censure,
               requis, voix_pour_inverser, pour_publie, contre_publie, abstentions_publiees,
               non_votants_publies, dossier_uid
        FROM scrutin WHERE uid = ?""", [uid]).fetchone()
    lignes = con.execute(f"""
        WITH places AS ({SQL_PLACES})
        SELECT v.depute_uid, d.prenom || ' ' || d.nom, d.nom_tri, v.groupe_uid, v.position,
               v.dissident, v.position_mise_au_point, p.place
        FROM vote v
        JOIN depute d ON d.uid = v.depute_uid
        LEFT JOIN places p ON p.depute_uid = v.depute_uid
        WHERE v.scrutin_uid = ?""", [uid]).fetchall()
    sieges = []
    for dep, nom, tri, g, position, dissident, mise_au_point, place in lignes:
        siege = {"depute": dep, "nom": nom, "groupe": g, "vote": position,
                 "_place": place, "_tri": tri}
        if dissident:
            siege["dissident"] = True
        if mise_au_point:
            siege["mise_au_point"] = mise_au_point
        sieges.append(siege)
    positions = {g: (pos, membres) for g, pos, membres in con.execute(
        "SELECT groupe_uid, position, membres FROM position_groupe WHERE scrutin_uid = ?",
        [uid]).fetchall()}
    liste = groupes(con, {s["groupe"] for s in sieges}, rangs)
    for g in liste:
        siens = [s for s in sieges if s["groupe"] == g["uid"]]
        g["membres"] = len(siens)
        g["decompte"] = {p: sum(s["vote"] == p for s in siens) for p in POSITIONS}
        g["dissidents"] = sum(bool(s.get("dissident")) for s in siens)
        g["position"] = positions.get(g["uid"], (None, None))[0]
    dossier = None
    ligne = con.execute("SELECT titre, chemin_an, procedure FROM dossier WHERE uid = ?",
                        [dossier_uid]).fetchone() if dossier_uid else None
    if ligne:
        titre_dossier, chemin, procedure = ligne
        dossier = {
            "uid": dossier_uid, "titre": titre_dossier, "procedure": procedure,
            "lien": LIEN_DOSSIER.format(chemin=chemin or dossier_uid),
            "parcours": parcours(con, dossier_uid, uid, jour),
        }
    return {
        "uid": uid, "numero": numero, "date": jour.isoformat(), "titre": titre, "sort": sort,
        "type_vote": type_vote, "categorie": categorie, "solennel": solennel,
        "motion_censure": censure,
        "decompte": {p: sum(s["vote"] == p for s in sieges) for p in POSITIONS},
        "publie": {"pour": pour_p, "contre": contre_p, "abstention": abst_p,
                   "non_votant": nv_p},
        "requis": requis, "voix_pour_inverser": inverser,
        "dissidents": sum(bool(s.get("dissident")) for s in sieges),
        "lien": LIEN_SCRUTIN.format(numero=numero),
        "dossier": dossier,
        "groupes": liste, "sieges": completer(sieges, rangs),
    }


def resume(s: dict) -> dict:
    """L'entrée d'un scrutin dans l'index : de quoi le lister et le chercher, sans les sièges."""
    cles = ("uid", "numero", "date", "titre", "sort", "categorie", "solennel",
            "motion_censure", "decompte", "requis", "voix_pour_inverser", "dissidents")
    entree = {k: s[k] for k in cles}
    entree["dossier"] = s["dossier"]["titre"] if s["dossier"] else None
    return entree


def scrutins_pages(con: duckdb.DuckDBPyConnection,
                   exclus: set[str] = frozenset()) -> list[str]:
    """Les scrutins qui ont une page, du plus récent au plus ancien, hors mis de côté."""
    uids = [u for u, in con.execute(
        "SELECT uid FROM scrutin WHERE solennel OR list_contains(?, categorie) "
        "ORDER BY numero DESC", [list(CATEGORIES_PAGES)]).fetchall()]
    return [u for u in uids if u not in exclus]


def ecrire(chemin: Path, contenu) -> None:
    chemin.write_text(json.dumps(contenu, ensure_ascii=False, separators=(",", ":")),
                      encoding="utf-8")


def exporter(base: Path, dossier: Path, jour: date, exclus: set[str] = frozenset()) -> dict:
    con = duckdb.connect(str(base), read_only=True)
    try:
        rangs = ordre_groupes(con)
        compo = composition(con, rangs, jour)
        scrutins = [scrutin(con, u, rangs) for u in scrutins_pages(con, exclus)]
    finally:
        con.close()
    # Les fichiers d'un build précédent ne doivent pas survivre (scrutin mis de côté depuis).
    pages = dossier / "scrutins"
    if pages.exists():
        shutil.rmtree(pages)
    pages.mkdir(parents=True)
    (dossier / "scrutins-solennels.json").unlink(missing_ok=True)
    index = [resume(s) for s in scrutins]
    ecrire(dossier / "composition.json", compo)
    ecrire(dossier / "scrutins.json", index)
    for s in scrutins:
        ecrire(pages / f"{s['uid']}.json", s)
    return {"composition": compo, "index": index, "scrutins": scrutins}


def main() -> int:
    resultat = RACINE / "data" / "controles" / "resultat.json"
    exclus = set()
    if resultat.exists():
        exclus = {s["uid"] for s in
                  json.loads(resultat.read_text(encoding="utf-8"))["scrutins_mis_de_cote"]}
    donnees = exporter(BASE, EXPORT, date.today(), exclus)
    compo = donnees["composition"]
    occupes = sum(not s.get("vacant") for s in compo["sieges"])
    print(f"Composition : {occupes} députés, {SIEGES - occupes} siège(s) vacant(s), "
          f"{len(compo['groupes'])} groupes.")
    index = donnees["index"]
    if index:
        print(f"{len(index)} votes avec une page, dont {sum(s['solennel'] for s in index)} "
              f"solennels ; le plus récent : n° {index[0]['numero']} du {index[0]['date']}.")
    # Les députés et la recherche par code postal (t19), sur les mêmes votes.
    return export_deputes.main([s["uid"] for s in index])


if __name__ == "__main__":
    sys.exit(main())
