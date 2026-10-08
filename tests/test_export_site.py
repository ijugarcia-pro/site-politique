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
        sort VARCHAR, type_vote VARCHAR, categorie VARCHAR, solennel BOOLEAN,
        motion_censure BOOLEAN, requis INTEGER, voix_pour_inverser INTEGER,
        pour_publie INTEGER, contre_publie INTEGER, abstentions_publiees INTEGER,
        non_votants_publies INTEGER, dossier_uid VARCHAR)""")
    con.execute("CREATE TABLE dossier (uid VARCHAR, titre VARCHAR, chemin_an VARCHAR, "
                "procedure VARCHAR)")
    con.execute("CREATE TABLE etape (dossier_uid VARCHAR, ordre INTEGER, code VARCHAR, "
                "parent_uid VARCHAR, date DATE, scrutins VARCHAR)")
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
    con.executemany("INSERT INTO scrutin VALUES (?, ?, ?, ?, 'adopté', ?, ?, ?, ?, 2, 1, "
                    "3, 1, 0, 0, ?)", [
                        ("VT10", 10, "2025-01-15", "l'ensemble du projet de loi", "SPS",
                         "ensemble", True, False, "DL1"),
                        ("VT11", 11, "2025-03-01", "l'amendement n° 4", "SPO", "amendement",
                         False, False, "DL1"),
                        ("VT12", 12, "2025-03-02", "la motion de censure", "MOC",
                         "motion de censure", False, True, None),
                        ("VT13", 13, "2025-03-03", "le dernier vote solennel", "SPS",
                         "ensemble", True, False, None),
                        ("VT14", 14, "2025-03-04", "l'ensemble d'une proposition de loi",
                         "SPO", "ensemble", False, False, "DL2"),
                    ])
    con.execute("INSERT INTO dossier VALUES ('DL1', 'Projet de loi exemple', 'exemple', "
                "'Projet de loi ordinaire'), ('DL2', 'Proposition sans parcours', NULL, NULL)")
    # Parcours de DL1 : première lecture à l'Assemblée (le vote 10), puis au Sénat, puis une
    # étape « Travaux » qui n'est pas une étape du texte.
    con.executemany("INSERT INTO etape VALUES ('DL1', ?, ?, ?, ?, ?)", [
        (0, "AN1", None, None, None),
        (1, "AN1-DEPOT", "x", "2024-12-01", None),
        (2, "AN1-DEBATS-DEC", "x", "2025-01-15", "VT10"),
        (3, "SN1", None, None, None),
        (4, "SN1-DEPOT", "x", "2025-01-20", None),
        (5, "SN1-DEBATS-DEC", "x", "2025-02-10", None),
        (6, "AN20", None, None, None),
        (7, "AN20-RAPPORT", "x", "2025-02-11", None),
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
    compo = donnees["composition"]
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


def test_pages_des_votes_et_index(base, tmp_path):
    export = tmp_path / "export"
    (export / "scrutins").mkdir(parents=True)
    (export / "scrutins" / "VT99.json").write_text("{}", encoding="utf-8")
    (export / "scrutins-solennels.json").write_text("[]", encoding="utf-8")
    donnees = export_site.exporter(base, export, date(2025, 6, 1))
    # Solennels, ensembles et motions de censure ; pas l'amendement ; le plus récent d'abord.
    assert [s["numero"] for s in donnees["index"]] == [14, 13, 12, 10]
    # Les fichiers d'un build précédent disparaissent.
    assert sorted(p.name for p in (export / "scrutins").iterdir()) == [
        "VT10.json", "VT12.json", "VT13.json", "VT14.json"]
    assert not (export / "scrutins-solennels.json").exists()
    index = json.loads((export / "scrutins.json").read_text("utf-8"))
    assert index == donnees["index"]
    assert index[-1]["dossier"] == "Projet de loi exemple"
    assert "sieges" not in index[-1] and index[-1]["dissidents"] == 1


def test_scrutin_siege_par_siege(base, tmp_path):
    export = tmp_path / "export"
    export_site.exporter(base, export, date(2025, 6, 1))
    s = json.loads((export / "scrutins" / "VT10.json").read_text("utf-8"))
    assert s["decompte"] == {"pour": 2, "contre": 1, "abstention": 1, "non_votant": 0,
                             "absent": 1}
    assert s["lien"] == "https://www.assemblee-nationale.fr/dyn/17/scrutins/10"
    assert s["categorie"] == "ensemble" and s["dissidents"] == 1
    occupes = [x for x in s["sieges"] if not x.get("vacant")]
    assert len(s["sieges"]) == export_site.SIEGES
    # À la date du vote, David siégeait encore dans le groupe dissous.
    assert [(x["depute"], x["groupe"]) for x in occupes][2] == ("PA4", DISSOUS)
    bruno = next(x for x in occupes if x["depute"] == "PA2")
    assert bruno == {"depute": "PA2", "nom": "Bruno Petit", "groupe": GAUCHE, "vote": "contre",
                     "dissident": True, "mise_au_point": "pour"}
    gauche = s["groupes"][0]
    assert gauche["decompte"]["contre"] == 1 and gauche["dissidents"] == 1
    assert gauche["position"] == "pour"


def test_parcours_du_texte(base, tmp_path):
    donnees = export_site.exporter(base, tmp_path / "export", date(2025, 6, 1))
    par_numero = {s["numero"]: s for s in donnees["scrutins"]}
    dossier = par_numero[10]["dossier"]
    assert dossier["lien"] == "https://www.assemblee-nationale.fr/dyn/17/dossiers/exemple"
    # L'étape « Travaux » (AN20) n'est pas une étape du texte.
    assert dossier["parcours"] == [
        {"code": "AN1", "libelle": "Première lecture à l'Assemblée", "debut": "2024-12-01",
         "fin": "2025-01-15", "ce_vote": True},
        {"code": "SN1", "libelle": "Première lecture au Sénat", "debut": "2025-01-20",
         "fin": "2025-02-10", "ce_vote": False},
    ]
    # Dossier sans chemin ni étapes : le lien passe par l'identifiant.
    assert par_numero[14]["dossier"]["lien"].endswith("/dossiers/DL2")
    assert par_numero[14]["dossier"]["parcours"] == []
    # Vote sans dossier (motion de censure, déclaration…).
    assert par_numero[12]["dossier"] is None


def test_scrutins_mis_de_cote_exclus(base, tmp_path):
    donnees = export_site.exporter(base, tmp_path / "export", date(2025, 6, 1), {"VT13"})
    assert [s["numero"] for s in donnees["index"]] == [14, 12, 10]


def test_trop_de_deputes_refuse():
    with pytest.raises(ValueError):
        export_site.completer([{"groupe": "PO1", "_place": 1, "_tri": "a"}] * 578, {})


def test_matrice_des_votes(base, tmp_path):
    donnees = export_site.exporter(base, tmp_path / "export", date(2025, 6, 1))
    m = donnees["matrice"]
    # Hors motion de censure (VT12), dans l'ordre de l'index : 14, 13, 10.
    assert m["votes"] == ["VT14", "VT13", "VT10"]
    lignes = {d["u"]: d for d in m["deputes"]}
    # Seul VT10 a des votes : P, C, P, absent (« - »), A.
    assert [lignes[u]["s"] for u in ["PA1", "PA2", "PA3", "PA4", "PA5"]] == [
        "--P", "--C", "--P", "---", "--A"]
    assert lignes["PA1"]["e"] == 1 and lignes["PA1"]["g"] == GAUCHE
    groupes = {g["sigle"]: g["s"] for g in m["groupes"]}
    # Positions des groupes actuels ; pas de ligne pour les non-inscrits.
    assert groupes == {"GCH": "--P", "DRT": "--P"}
    assert (tmp_path / "export" / "matrice.json").exists()
