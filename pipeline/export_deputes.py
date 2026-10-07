"""Export des députés et de la recherche par code postal (t19).

Usage (lancé aussi par pipeline.export_site) :
    uv run python -m pipeline.export_deputes

Lit data/site.duckdb et les fichiers géographiques de data/raw/, et produit :
    export/site/deputes.json             tous les députés de la législature (index)
    export/site/deputes/{uid}.json       la fiche de chacun : mandat, groupes, chiffres, votes
    export/site/cp/{xx}.json             code postal → communes → circonscriptions
                                         (xx = deux premiers chiffres du code postal)
    export/site/contours/{dep}.json      contours des circonscriptions d'un département, pour
                                         situer une adresse quand une commune en couvre plusieurs

Règles :
- une circonscription est désignée par « {département}-{numéro} » (« 75-5 », « 971-2 »,
  « 099-3 » pour les Français de l'étranger), comme dans les mandats de l'Assemblée ;
- les chiffres d'un député portent sur tous les scrutins de son mandat, hors motions de
  censure (seuls les « pour » y sont publiés) ;
- commune → circonscriptions : table du ministère de l'Intérieur (2017). Une commune qui n'y
  est pas (arrondissements de Paris, Lyon et Marseille, communes nouvelles créées depuis)
  reçoit toutes les circonscriptions de sa ville ou de son département, avec la mention
  « adresse » : l'adresse précise est alors demandée et située dans les contours ;
- les fichiers géographiques sont facultatifs : sans eux, la recherche par code postal n'est
  pas exportée, et le reste du site l'est quand même.
"""

from __future__ import annotations

import csv
import json
import shutil
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

import duckdb

RACINE = Path(__file__).resolve().parent.parent
BASE = RACINE / "data" / "site.duckdb"
RAW = RACINE / "data" / "raw"
EXPORT = RACINE / "export" / "site"
LAPOSTE = "laposte_hexasmal.csv"
TABLE_CIRCOS = "Table_de_correspondance_circo_legislatives2017-1.xlsx"
CONTOURS = "circonscriptions-legislatives-p10.geojson"
LIEN_AN = "https://www.assemblee-nationale.fr/dyn/deputes/{uid}"
POSITIONS = ("pour", "contre", "abstention", "non_votant", "absent")

# Codes de département de la table de 2017 et des contours → numéro de département des
# mandats de l'Assemblée.
OUTRE_MER = {"ZA": "971", "ZB": "972", "ZC": "973", "ZD": "974", "ZM": "976", "ZN": "988",
             "ZP": "987", "ZS": "975", "ZW": "986", "ZX": "977", "ZZ": "099"}
# Arrondissements (codes postaux) → commune de la table de 2017.
ARRONDISSEMENTS = {"751": "75056", "132": "13055", "6938": "69123"}


def departement(code) -> str:
    code = str(code).strip()
    if code in OUTRE_MER:
        return OUTRE_MER[code]
    return code.zfill(2) if code.isdigit() else code


def cle_circo(dep: str, numero) -> str:
    return f"{dep}-{int(numero)}"


def insee(dep_table, commune) -> str:
    """Code INSEE d'une commune de la table de 2017 (« 1 », 4 → « 01004 » ; « ZA », 101 →
    « 97101 » ; « ZP », 735 → « 98735 »)."""
    dep = departement(dep_table)
    prefixe = dep[:2] if len(dep) == 3 else dep
    return prefixe + str(commune).zfill(3)


# --- Députés -------------------------------------------------------------------------------

SQL_DEPUTES = """
WITH dernier_mandat AS (
    SELECT * FROM mandat
    QUALIFY row_number() OVER (PARTITION BY depute_uid ORDER BY debut DESC) = 1
), dernier_groupe AS (
    SELECT * FROM appartenance
    QUALIFY row_number() OVER (PARTITION BY depute_uid
                               ORDER BY coalesce(fin, DATE '9999-12-31') DESC, debut DESC) = 1
)
SELECT d.uid, d.civilite, d.prenom, d.nom, d.nom_tri, m.departement, m.num_departement,
       m.num_circo, m.debut, m.fin, m.cause_fin, try_cast(m.place_hemicycle AS INTEGER),
       g.uid, g.sigle, g.libelle
FROM depute d
JOIN dernier_mandat m ON m.depute_uid = d.uid
LEFT JOIN dernier_groupe a ON a.depute_uid = d.uid
LEFT JOIN groupe g ON g.uid = a.groupe_uid
ORDER BY d.nom_tri, d.prenom
"""


def index_deputes(con: duckdb.DuckDBPyConnection, jour: date) -> list[dict]:
    sortie = []
    for (uid, civ, prenom, nom, tri, dep_nom, dep, circo, debut, fin, cause_fin, place, g_uid,
         sigle, libelle) in con.execute(SQL_DEPUTES).fetchall():
        sortie.append({
            "uid": uid, "civilite": civ, "prenom": prenom, "nom": nom, "tri": tri,
            "departement": dep_nom, "num_departement": dep, "num_circo": int(circo),
            "circo": cle_circo(dep, circo),
            "en_exercice": debut <= jour and (fin is None or fin >= jour),
            "debut": debut.isoformat(), "fin": fin.isoformat() if fin else None,
            "cause_fin": cause_fin, "place": place,
            "groupe": g_uid, "sigle": sigle, "groupe_libelle": libelle,
        })
    return sortie


def fiches(con: duckdb.DuckDBPyConnection, index: list[dict], pages: list[str]) -> list[dict]:
    """La fiche de chaque député : mandats, groupes successifs, chiffres et votes à page.

    Quelques requêtes sur tous les députés à la fois, plutôt que plusieurs par député : la
    table des votes compte des millions de lignes.
    """
    mandats: dict[str, list] = defaultdict(list)
    for uid, d, f, cf, dep, c in con.execute(
            "SELECT depute_uid, debut, fin, cause_fin, num_departement, num_circo FROM mandat "
            "ORDER BY debut").fetchall():
        mandats[uid].append({"debut": d.isoformat(), "fin": f.isoformat() if f else None,
                             "cause_fin": cf, "circo": cle_circo(dep, c)})
    groupes: dict[str, list] = defaultdict(list)
    for uid, g, sigle, lib, d, f in con.execute("""
            SELECT a.depute_uid, a.groupe_uid, g.sigle, g.libelle, a.debut, a.fin
            FROM appartenance a JOIN groupe g ON g.uid = a.groupe_uid
            ORDER BY a.debut""").fetchall():
        groupes[uid].append({"uid": g, "sigle": sigle, "libelle": lib, "debut": d.isoformat(),
                             "fin": f.isoformat() if f else None})
    comptes = ", ".join(
        f"count(*) FILTER (WHERE {condition}{' AND ' + p_cond if p_cond else ''})"
        for condition in ("TRUE", "s.solennel")
        for p_cond in ("", *(f"v.position = '{p}'" for p in POSITIONS), "v.dissident"))
    cles = ("scrutins", *POSITIONS, "contre_groupe")
    chiffres = {}
    for uid, *valeurs in con.execute(f"""
            SELECT v.depute_uid, {comptes}
            FROM vote v JOIN scrutin s ON s.uid = v.scrutin_uid
            WHERE NOT s.motion_censure
            GROUP BY v.depute_uid""").fetchall():
        n = len(cles)
        chiffres[uid] = {"tous": dict(zip(cles, valeurs[:n], strict=True)),
                         "solennels": dict(zip(cles, valeurs[n:], strict=True))}
    votes: dict[str, list] = defaultdict(list)
    # Le titre, la date et le résultat de chaque vote sont dans l'index des votes
    # (export/site/scrutins.json) : la fiche ne garde que ce qui est propre au député.
    for uid, s_uid, numero, pos, dis, mp, sigle, pg in con.execute("""
            SELECT v.depute_uid, s.uid, s.numero, v.position, v.dissident,
                   v.position_mise_au_point, g.sigle, pg.position
            FROM vote v
            JOIN scrutin s ON s.uid = v.scrutin_uid
            LEFT JOIN groupe g ON g.uid = v.groupe_uid
            LEFT JOIN position_groupe pg
                   ON pg.scrutin_uid = v.scrutin_uid AND pg.groupe_uid = v.groupe_uid
            WHERE s.uid IN (SELECT unnest(?::VARCHAR[]))
            ORDER BY s.numero DESC""", [pages]).fetchall():
        vote = {"uid": s_uid, "numero": numero, "vote": pos, "groupe": sigle,
                "position_groupe": pg}
        if dis:
            vote["dissident"] = True
        if mp:
            vote["mise_au_point"] = mp
        votes[uid].append(vote)
    vide = dict.fromkeys(cles, 0)
    return [{**e, "lien": LIEN_AN.format(uid=e["uid"]), "mandats": mandats[e["uid"]],
             "groupes": groupes[e["uid"]],
             "chiffres": chiffres.get(e["uid"], {"tous": vide, "solennels": vide}),
             "votes": votes[e["uid"]]} for e in index]


# --- Code postal et contours ---------------------------------------------------------------

def table_circos(chemin: Path) -> tuple[dict[str, set[str]], dict[str, str]]:
    """Commune (code INSEE) → circonscriptions, et le nom de chaque commune."""
    import openpyxl

    classeur = openpyxl.load_workbook(chemin, read_only=True)
    circos: dict[str, set[str]] = defaultdict(set)
    noms: dict[str, str] = {}
    for ligne in list(classeur.worksheets[0].iter_rows(values_only=True))[1:]:
        dep, _, commune, nom, circo = ligne[:5]
        if dep is None or commune is None or circo is None:
            continue
        code = insee(dep, commune)
        circos[code].add(cle_circo(departement(dep), circo))
        noms[code] = str(nom)
    classeur.close()
    return circos, noms


def codes_postaux(laposte: Path, circos: dict[str, set[str]],
                  noms: dict[str, str]) -> dict[str, dict[str, list[dict]]]:
    """Par préfixe (deux premiers chiffres) : code postal → communes et circonscriptions."""
    par_departement: dict[str, set[str]] = defaultdict(set)
    for cles in circos.values():
        for cle in cles:
            par_departement[cle.split("-")[0]].add(cle)
    vus: set[tuple[str, str]] = set()
    sortie: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    with laposte.open(encoding="latin-1", newline="") as f:
        lecteur = csv.reader(f, delimiter=";")
        next(lecteur)
        for ligne in lecteur:
            code, nom, cp = ligne[0].strip(), ligne[1].strip(), ligne[2].strip()
            if not code or not cp or (cp, code) in vus:
                continue
            vus.add((cp, code))
            ville = next((v for p, v in ARRONDISSEMENTS.items() if code.startswith(p)), None)
            cles = circos.get(ville or code)
            if cles is None:
                dep = code[:3] if code[:2] in ("97", "98") else code[:2]
                cles = par_departement.get(dep, set())
            adresse = ville is not None or code not in circos or len(cles) > 1
            entree = {"n": noms.get(code) or nom.title(), "c": sorted(cles, key=_ordre)}
            if adresse:
                entree["a"] = 1
            sortie[cp[:2]][cp].append(entree)
    return {p: {cp: sorted(v, key=lambda e: e["n"]) for cp, v in sorted(cps.items())}
            for p, cps in sorted(sortie.items())}


def _ordre(cle: str) -> tuple[str, int]:
    dep, num = cle.split("-")
    return dep, int(num)


def contours(chemin: Path, decimales: int = 4) -> dict[str, dict[str, dict]]:
    """Département → circonscription → géométrie GeoJSON (coordonnées arrondies)."""
    def arrondir(x):
        if isinstance(x, (int, float)):
            return round(x, decimales)
        return [arrondir(y) for y in x]

    sortie: dict[str, dict[str, dict]] = defaultdict(dict)
    for f in json.loads(chemin.read_text(encoding="utf-8"))["features"]:
        p = f["properties"]
        dep = departement(p["codeDepartement"])
        cle = cle_circo(dep, p["codeCirconscription"][-2:])
        geo = f["geometry"]
        sortie[dep][cle] = {"type": geo["type"], "coordinates": arrondir(geo["coordinates"])}
    return dict(sortie)


# --- Export --------------------------------------------------------------------------------

def ecrire(chemin: Path, contenu) -> None:
    chemin.write_text(json.dumps(contenu, ensure_ascii=False, separators=(",", ":")),
                      encoding="utf-8")


def vider(dossier: Path) -> Path:
    if dossier.exists():
        shutil.rmtree(dossier)
    dossier.mkdir(parents=True)
    return dossier


def exporter(base: Path, dossier: Path, jour: date, pages: list[str],
             raw: Path = RAW) -> dict:
    con = duckdb.connect(str(base), read_only=True)
    try:
        index = index_deputes(con, jour)
        liste = fiches(con, index, pages)
    finally:
        con.close()
    dossier.mkdir(parents=True, exist_ok=True)
    ecrire(dossier / "deputes.json", index)
    rep = vider(dossier / "deputes")
    for f in liste:
        ecrire(rep / f"{f['uid']}.json", f)

    resultat: dict = {"index": index, "fiches": liste, "cp": None, "contours": None}
    sources = [raw / LAPOSTE, raw / TABLE_CIRCOS, raw / CONTOURS]
    for sous in ("cp", "contours"):
        if (dossier / sous).exists():
            shutil.rmtree(dossier / sous)
    if not all(s.exists() for s in sources):
        manquants = ", ".join(s.name for s in sources if not s.exists())
        print(f"Recherche par code postal non exportée : fichier(s) absent(s) ({manquants}).")
        return resultat
    circos, noms = table_circos(raw / TABLE_CIRCOS)
    cps = codes_postaux(raw / LAPOSTE, circos, noms)
    rep = vider(dossier / "cp")
    for prefixe, contenu in cps.items():
        ecrire(rep / f"{prefixe}.json", contenu)
    geo = contours(raw / CONTOURS)
    rep = vider(dossier / "contours")
    for dep, contenu in geo.items():
        ecrire(rep / f"{dep}.json", contenu)
    resultat.update(cp=cps, contours=geo)
    return resultat


def main(pages: list[str] | None = None) -> int:
    if pages is None:
        pages = [s["uid"] for s in
                 json.loads((EXPORT / "scrutins.json").read_text(encoding="utf-8"))]
    r = exporter(BASE, EXPORT, date.today(), pages)
    en_exercice = sum(d["en_exercice"] for d in r["index"])
    print(f"{len(r['index'])} députés exportés, dont {en_exercice} en exercice.")
    if r["cp"]:
        n = sum(len(v) for v in r["cp"].values())
        print(f"{n} codes postaux, contours de {len(r['contours'])} départements.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
