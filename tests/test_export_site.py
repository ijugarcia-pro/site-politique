import json
from datetime import date

import duckdb
import pytest

from pipeline import export_site

GAUCHE, DROITE, DISSOUS, NI = "PO1", "PO2", "PO3", export_site.NON_INSCRITS

# Députés : uid, prénom, nom, place dans l'hémicycle, appartenances (groupe, début, fin).
DEPUTES = [
    ("PA1", "Alice", "Martin", "600", [(GAUCHE, "2024-07-18", None)]),
    ("PA2", "Bruno", "Petit", "550", [(GAUCHE, "2024-07-18", None)]),
    ("PA3", "Chloé", "Durand", "20", [(DROITE, "2024-07-18", None)]),
    # A quitté un groupe dissous pour la droite : le groupe dissous se place d'après lui.
    ("PA4", "David", "Leroy", "40", [(DISSOUS, "2024-07-18", "2025-01-31"),
                                     (DROITE, "2025-02-01", None)]),
    # Non-inscrit assis au milieu de la gauche : rangé à la fin quand même.
    ("PA5", "Emma", "Roux", "580", [(NI, "2024-07-18", None)]),
]


@pytest.fixture
def base(tmp_path):
    chemin = tmp_path / "site.duckdb"
    con = duckdb.connect(str(chemin))
    con.execute("CREATE TABLE depute (uid VARCHAR, prenom VARCHAR, nom VARCHAR, nom_tri VARCHAR)")
    con.execute("CREATE TABLE mandat (depute_uid VARCHAR, debut DATE, fin DATE, "
                "place_hemicycle VARCHAR)")
    con.execute("CREATE TABLE groupe (uid VARCHAR, sigle VARCHAR, libelle VARCHAR, "
                "couleur VARCHAR, preseance VARCHAR)")
    con.execute("CREATE TABLE appartenance (depute_uid VARCHAR, groupe_uid VARCHAR, "
                "debut DATE, fin DATE)")
    con.execute("""CREATE TABLE scrutin (uid VARCHAR, numero INTEGER, date DATE, titre VARCHAR,
        sort VARCHAR, type_vote VARCHAR, solennel BOOLEAN, motion_censure BOOLEAN,
        requis INTEGER, voix_pour_inverser INTEGER, pour_publie INTEGER, contre_publie INTEGER,
        abstentions_publiees INTEGER, non_votants_publies INTEGER)""")
    con.execute("""CREATE TABLE vote (scrutin_uid VARCHAR, depute_uid VARCHAR, position VARCHAR,
        groupe_uid VARCHAR, dissident BOOLEAN, position_mise_au_point VARCHAR)""")
    con.execute("CREATE TABLE position_groupe (scrutin_uid VARCHAR, groupe_uid VARCHAR, "
                "membres BIGINT, position VARCHAR)")
    for uid, prenom, nom, place, appartenances in DEPUTES:
        con.execute("INSERT INTO depute VALUES (?, ?, ?, ?)", [uid, prenom, nom, nom.lower()])
        con.execute("INSERT INTO mandat VALUES (?, '2024-07-18', NULL, ?)", [uid, place])
        for groupe, debut, fin in appartenances:
            con.execute("INSERT INTO appartenance VALUES (?, ?, ?, ?)",
                        [uid, groupe, debut, fin])
    con.executemany("INSERT INTO groupe VALUES (?, ?, ?, ?, ?)", [
        (DROITE, "DRT", "Groupe de droite", "#111111", "1"),
        (GAUCHE, "GCH", "Groupe de gauche", "#222222", "2"),
        (DISSOUS, "DIS", "Groupe dissous", "#333333", "3"),
        (NI, "NI", "Non inscrit", "#444444", "99"),
    ])
    con.executemany("INSERT INTO scrutin VALUES (?, ?, ?, ?, 'adopté', 'SPS', ?, ?, 2, 1, "
                    "3, 1, 0, 0)", [
                        ("VT10", 10, "2025-01-15", "un vote solennel ancien", True, False),
                        ("VT11", 11, "2025-03-01", "un vote ordinaire", False, False),
                        ("VT12", 12, "2025-03-02", "une motion de censure", True, True),
                        ("VT13", 13, "2025-03-03", "le dernier vote solennel", True, False),
                    ])
    con.executemany("INSERT INTO vote VALUES ('VT10', ?, ?, ?, ?, ?)", [
        ("PA1", "pour", GAUCHE, False, None),
        ("PA2", "contre", GAUCHE, True, "pour"),
        ("PA3", "pour", DROITE, False, None),
        ("PA4", "absent", DISSOUS, False, None),
        ("PA5", "abstention", NI, False, None),
    ])
    con.executemany("INSERT INTO position_groupe VALUES ('VT10', ?, ?, ?)", [
        (GAUCHE, 2, "pour"), (DROITE, 1, "pour"), (DISSOUS, 1, None), (NI, 1, None)])
    con.close()
    return chemin


def test_ordre_des_groupes_suit_les_places_non_inscrits_a_la_fin(base):
    con = duckdb.connect(str(base), read_only=True)
    rangs = export_site.ordre_groupes(con)
    con.close()
    # Médianes des places : gauche 575, dissous 40 (David), droite 30 (Chloé 20, David 40).
    assert sorted(rangs, key=rangs.get) == [GAUCHE, DISSOUS, DROITE, NI]


def test_composition_577_sieges_groupes_contigus(base, tmp_path):
    donnees = export_site.exporter(base, tmp_path / "export", date(2025, 6, 1))
    compo = donnees["composition.json"]
    sieges = compo["sieges"]
    assert len(sieges) == export_site.SIEGES
    assert sum(bool(s.get("vacant")) for s in sieges) == export_site.SIEGES - 5
    occupes = [s for s in sieges if not s.get("vacant")]
    # Gauche d'abord, places décroissantes ; David est à droite à cette date ; NI à la fin.
    assert [s["depute"] for s in occupes] == ["PA1", "PA2", "PA4", "PA3", "PA5"]
    assert [(g["sigle"], g["membres"]) for g in compo["groupes"]] == [
        ("GCH", 2), ("DRT", 2), ("NI", 1)]
    assert all(not s.get("vacant") for s in sieges[:5])  # les vacants sont à la fin
    assert not any(k.startswith("_") for s in sieges for k in s)
    assert json.loads((tmp_path / "export" / "composition.json").read_text("utf-8")) == compo


def test_scrutin_siege_par_siege(base, tmp_path):
    donnees = export_site.exporter(base, tmp_path / "export", date(2025, 6, 1))
    scrutins = donnees["scrutins-solennels.json"]
    # Ni vote ordinaire, ni motion de censure ; le plus récent d'abord.
    assert [s["numero"] for s in scrutins] == [13, 10]
    s = scrutins[1]
    assert s["decompte"] == {"pour": 2, "contre": 1, "abstention": 1, "non_votant": 0,
                             "absent": 1}
    assert s["lien"] == "https://www.assemblee-nationale.fr/dyn/17/scrutins/10"
    occupes = [x for x in s["sieges"] if not x.get("vacant")]
    # À la date du vote, David siégeait encore dans le groupe dissous.
    assert [(x["depute"], x["groupe"]) for x in occupes][2] == ("PA4", DISSOUS)
    bruno = next(x for x in occupes if x["depute"] == "PA2")
    assert bruno == {"depute": "PA2", "nom": "Bruno Petit", "groupe": GAUCHE, "vote": "contre",
                     "dissident": True, "mise_au_point": "pour"}
    gauche = s["groupes"][0]
    assert gauche["decompte"]["contre"] == 1 and gauche["dissidents"] == 1
    assert gauche["position"] == "pour"


def test_scrutins_mis_de_cote_exclus(base, tmp_path):
    donnees = export_site.exporter(base, tmp_path / "export", date(2025, 6, 1), {"VT13"})
    assert [s["numero"] for s in donnees["scrutins-solennels.json"]] == [10]


def test_trop_de_deputes_refuse():
    with pytest.raises(ValueError):
        export_site.completer([{"groupe": "PO1", "_place": 1, "_tri": "a"}] * 578, {})
