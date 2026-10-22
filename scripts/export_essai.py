"""Export d'essai : une base DuckDB inventée et l'export du site, pour construire le site sans
réseau (sessions dans le cloud qui n'atteignent ni l'Assemblée nationale ni les artefacts du
pipeline).

Données d'essai, illustratives : 577 députés et 9 groupes inventés, des votes tirés au hasard.
Seuls les identifiants des scrutins du quiz, des lots et des séances sont repris, pour que les
pages du site les trouvent. Rien de cet export ne doit être publié : il sert à `npm run build`,
aux tests d'inventaire et aux captures.

Usage :
    uv run python -m scripts.export_essai <dossier>
    cd site && EXPORT_DIR=<dossier> npm run build
"""

from __future__ import annotations

import json
import random
import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import duckdb

from pipeline import cartes, etat, export_deputes, export_site, semaine

RACINE = Path(__file__).resolve().parent.parent
JOUR = date(2026, 10, 22)
# Taille des 9 groupes inventés ; le reste des 577 sièges va aux non-inscrits.
TAILLES = [72, 92, 38, 36, 17, 98, 22, 50, 123]
CENSURES = (3007, 3031)

TABLES = """
CREATE TABLE depute (uid VARCHAR, civilite VARCHAR, prenom VARCHAR, nom VARCHAR,
    nom_tri VARCHAR);
CREATE TABLE mandat (depute_uid VARCHAR, debut DATE, fin DATE, cause_fin VARCHAR,
    departement VARCHAR, num_departement VARCHAR, num_circo VARCHAR, place_hemicycle VARCHAR);
CREATE TABLE groupe (uid VARCHAR, sigle VARCHAR, libelle VARCHAR, couleur VARCHAR,
    preseance VARCHAR);
CREATE TABLE appartenance (depute_uid VARCHAR, groupe_uid VARCHAR, debut DATE, fin DATE);
CREATE TABLE scrutin (uid VARCHAR, numero INTEGER, date DATE, titre VARCHAR, sort VARCHAR,
    type_vote VARCHAR, categorie VARCHAR, solennel BOOLEAN, motion_censure BOOLEAN,
    requis INTEGER, voix_pour_inverser INTEGER, pour_publie INTEGER, contre_publie INTEGER,
    abstentions_publiees INTEGER, non_votants_publies INTEGER, dossier_uid VARCHAR);
CREATE TABLE dossier (uid VARCHAR, titre VARCHAR, chemin_an VARCHAR, procedure VARCHAR);
CREATE TABLE etape (dossier_uid VARCHAR, ordre INTEGER, code VARCHAR, parent_uid VARCHAR,
    date DATE, scrutins VARCHAR);
CREATE TABLE vote (scrutin_uid VARCHAR, depute_uid VARCHAR, position VARCHAR,
    groupe_uid VARCHAR, dissident BOOLEAN, position_mise_au_point VARCHAR);
CREATE TABLE position_groupe (scrutin_uid VARCHAR, groupe_uid VARCHAR, membres BIGINT,
    position VARCHAR);
CREATE TABLE vote_prevu (reunion_uid VARCHAR, point_uid VARCHAR, debut TIMESTAMPTZ, date DATE,
    objet VARCHAR, dossier_uid VARCHAR, etat VARCHAR);
CREATE TABLE contenu (uid VARCHAR);
"""


def scrutins_utiles() -> dict[str, int]:
    """Les scrutins des cartes (quiz, lots) et des séances figées, plus 60 votes d'essai."""
    uids: dict[str, int] = {}
    for q in json.loads((RACINE / "data" / "quiz.json").read_text(encoding="utf-8")):
        uids[q["uid"]] = q["numero"]
    for lot in json.loads((RACINE / "data" / "lots.json").read_text(encoding="utf-8")):
        for c in lot["cartes"]:
            uids[c["uid"]] = c["numero"]
    for f in (RACINE / "data" / "semaines").glob("*.json"):
        s = json.loads(f.read_text(encoding="utf-8"))
        for v in s["votes"]:
            if v.get("scrutin_uid"):
                uids[v["scrutin_uid"]] = v["numero"]
        for h in s.get("historique", []):
            for u in (h.get("tranches") or {}).values():
                uids.setdefault(u, int(u.rsplit("V", 1)[1]))
    for n in range(3000, 3060):
        uids.setdefault(f"VTANR5L17V{n}", n)
    return uids


def position(groupe: str, tendance: str, solennel: bool, censure: bool) -> str:
    r = random.random()
    if censure:
        return "pour" if tendance == "contre" and r < 0.9 else "absent"
    if r < (0.12 if solennel else 0.45):
        return "absent"
    if r < (0.13 if solennel else 0.46):
        return "non_votant"
    if r < 0.9:
        return tendance
    return random.choice(["pour", "contre", "abstention"])


def remplir(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(TABLES)
    groupes = [(f"PO90000{k}", f"G{chr(65 + k)}", f"Groupe d'essai {chr(65 + k)}", "#888888",
                str(k + 1)) for k in range(len(TAILLES))]
    ni = export_site.NON_INSCRITS
    con.executemany("INSERT INTO groupe VALUES (?, ?, ?, ?, ?)", groupes)
    con.execute("INSERT INTO groupe VALUES (?, 'NI', 'Non inscrit', '#999999', '99')", [ni])
    membres = [g[0] for g, taille in zip(groupes, TAILLES, strict=True) for _ in range(taille)]
    membres += [ni] * (577 - len(membres))
    deputes = []
    for i, g in enumerate(membres):
        uid = f"PA9{i:05d}"
        deputes.append((uid, g))
        con.execute("INSERT INTO depute VALUES (?, ?, 'Prénom', ?, ?)",
                    [uid, "Mme" if i % 2 else "M.", f"Essai {i + 1:03d}", f"essai {i + 1:03d}"])
        dep = f"{(i % 95) + 1:02d}"
        con.execute("INSERT INTO mandat VALUES (?, '2024-07-18', NULL, NULL, ?, ?, ?, ?)",
                    [uid, f"Département {dep}", dep, str(i // 95 + 1), str(i + 1)])
        con.execute("INSERT INTO appartenance VALUES (?, ?, '2024-07-18', NULL)", [uid, g])

    for k, (uid, numero) in enumerate(sorted(scrutins_utiles().items(), key=lambda x: x[1])):
        jour = min(date(2024, 10, 1) + timedelta(days=numero // 9),
                   JOUR - timedelta(days=2 + k % 30))
        solennel = k % 3 == 0
        censure = numero in CENSURES
        dossier = f"DLR5L17N9{numero:05d}"
        con.execute("INSERT INTO dossier VALUES (?, ?, NULL, 'Proposition de loi')",
                    [dossier, f"Texte d'essai n° {numero}"])
        con.execute("INSERT INTO etape VALUES (?, 1, 'AN1', NULL, NULL, NULL), "
                    "(?, 2, 'AN1', 'x', ?, ?)", [dossier, dossier, jour, uid])
        tendances = {g[0]: random.choice(["pour", "contre", "pour", "contre", "abstention"])
                     for g in groupes}
        tendances[ni] = "pour"
        decompte = {"pour": 0, "contre": 0, "abstention": 0, "non_votant": 0, "absent": 0}
        lignes = []
        for d, g in deputes:
            pos = position(g, tendances[g], solennel, censure)
            decompte[pos] += 1
            dissident = (g != ni and pos in ("pour", "contre")
                         and tendances[g] in ("pour", "contre") and pos != tendances[g])
            lignes.append((uid, d, pos, g, dissident, None))
        con.executemany("INSERT INTO vote VALUES (?, ?, ?, ?, ?, ?)", lignes)
        con.executemany("INSERT INTO position_groupe VALUES (?, ?, ?, ?)",
                        [(uid, g[0], t, tendances[g[0]]) for g, t in zip(groupes, TAILLES,
                                                                        strict=True)])
        requis = (decompte["pour"] + decompte["contre"]) // 2 + 1
        sort = "adopté" if decompte["pour"] >= requis else "rejeté"
        inverser = decompte["pour"] - requis + 1 if sort == "adopté" else requis - decompte["pour"]
        con.execute("INSERT INTO scrutin VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
            uid, numero, jour, f"l'ensemble du texte d'essai n° {numero} (première lecture)",
            sort, "scrutin public solennel" if solennel else "scrutin public ordinaire",
            "motion de censure" if censure else random.choice(["ensemble", "résolution"]),
            solennel, censure, None if censure else requis, None if censure else inverser,
            decompte["pour"], decompte["contre"], decompte["abstention"],
            decompte["non_votant"], dossier])


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print(__doc__)
        return 2
    sortie = Path(args[0])
    sortie.mkdir(parents=True, exist_ok=True)
    base = sortie / "essai.duckdb"
    base.unlink(missing_ok=True)
    random.seed(578)
    con = duckdb.connect(str(base))
    try:
        remplir(con)
    finally:
        con.close()
    dossier = sortie / "site"
    donnees = export_site.exporter(base, dossier, JOUR, set(), cartes.scrutins_avec_carte(RACINE))
    export_deputes.exporter(base, dossier, JOUR, [s["uid"] for s in donnees["index"]],
                            raw=sortie / "raw")
    con = duckdb.connect(str(base), read_only=True)
    try:
        (dossier / "semaine.json").write_text(
            json.dumps(semaine.semaine(con, JOUR), ensure_ascii=False), encoding="utf-8")
        resultat = json.loads((RACINE / "data" / "controles" / "resultat.json")
                              .read_text(encoding="utf-8"))
        sources = json.loads(etat.ETAT_SOURCES.read_text(encoding="utf-8"))
        etat_essai = etat.construire(con, resultat, sources, datetime.now(UTC))
    finally:
        con.close()
    (sortie / "etat.json").write_text(json.dumps(etat_essai, ensure_ascii=False, default=str),
                                      encoding="utf-8")
    print(f"Export d'essai (données inventées) : {sortie}, {len(donnees['index'])} scrutins.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
