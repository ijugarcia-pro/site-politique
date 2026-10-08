import json
from datetime import date

import duckdb
import openpyxl
import pytest

from pipeline import export_deputes as ed

G1, G2 = "PO1", "PO2"


@pytest.fixture
def base(tmp_path):
    chemin = tmp_path / "site.duckdb"
    con = duckdb.connect(str(chemin))
    con.execute("CREATE TABLE depute (uid VARCHAR, civilite VARCHAR, prenom VARCHAR, "
                "nom VARCHAR, nom_tri VARCHAR)")
    con.execute("""CREATE TABLE mandat (depute_uid VARCHAR, debut DATE, fin DATE,
        cause_fin VARCHAR, departement VARCHAR, num_departement VARCHAR, num_circo VARCHAR,
        place_hemicycle VARCHAR)""")
    con.execute("CREATE TABLE groupe (uid VARCHAR, sigle VARCHAR, libelle VARCHAR)")
    con.execute("CREATE TABLE appartenance (depute_uid VARCHAR, groupe_uid VARCHAR, "
                "debut DATE, fin DATE)")
    con.execute("""CREATE TABLE scrutin (uid VARCHAR, numero INTEGER, date DATE, titre VARCHAR,
        categorie VARCHAR, solennel BOOLEAN, motion_censure BOOLEAN, sort VARCHAR)""")
    con.execute("""CREATE TABLE vote (scrutin_uid VARCHAR, depute_uid VARCHAR, position VARCHAR,
        groupe_uid VARCHAR, dissident BOOLEAN, position_mise_au_point VARCHAR)""")
    con.execute("CREATE TABLE position_groupe (scrutin_uid VARCHAR, groupe_uid VARCHAR, "
                "position VARCHAR)")
    con.executemany("INSERT INTO depute VALUES (?, ?, ?, ?, ?)", [
        ("PA1", "Mme", "Alice", "Martin", "Martin"),
        ("PA2", "M.", "Bruno", "Petit", "Petit"),
    ])
    con.executemany("INSERT INTO mandat VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        ("PA1", "2024-07-18", None, None, "Paris", "75", "5", "100"),
        # Bruno a quitté l'Assemblée : il reste dans l'index, plus en exercice.
        ("PA2", "2024-07-18", "2025-03-01", "Démission", "Réunion", "974", "2", "200"),
    ])
    con.executemany("INSERT INTO groupe VALUES (?, ?, ?)", [
        (G1, "GA", "Groupe A"), (G2, "GB", "Groupe B")])
    con.executemany("INSERT INTO appartenance VALUES (?, ?, ?, ?)", [
        ("PA1", G1, "2024-07-18", "2025-01-31"),
        ("PA1", G2, "2025-02-01", None),
        ("PA2", G1, "2024-07-18", "2025-03-01"),
    ])
    con.executemany("INSERT INTO scrutin VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        ("VT1", 1, "2025-01-10", "l'ensemble du texte un", "ensemble", True, False, "adopté"),
        ("VT2", 2, "2025-02-10", "l'amendement n° 3", "amendement", False, False, "rejeté"),
        ("VT3", 3, "2025-02-11", "la motion de censure", "motion de censure", False, True,
         "rejeté"),
    ])
    con.executemany("INSERT INTO vote VALUES (?, ?, ?, ?, ?, ?)", [
        ("VT1", "PA1", "pour", G1, False, None),
        ("VT2", "PA1", "contre", G2, True, "pour"),
        ("VT3", "PA1", "absent", G2, False, None),
        ("VT1", "PA2", "absent", G1, False, None),
    ])
    con.executemany("INSERT INTO position_groupe VALUES (?, ?, ?)", [
        ("VT1", G1, "pour"), ("VT2", G2, "pour")])
    con.close()
    return chemin


@pytest.fixture
def raw(tmp_path):
    dossier = tmp_path / "raw"
    dossier.mkdir()
    (dossier / ed.LAPOSTE).write_text(
        "#Code_commune_INSEE;Nom_de_la_commune;Code_postal;Libellé_d_acheminement;Ligne_5\n"
        "01004;AMBERIEU EN BUGEY;01500;AMBERIEU EN BUGEY;\n"
        "01004;AMBERIEU EN BUGEY;01500;AMBERIEU EN BUGEY;VAREY\n"
        "01005;AMBERIEUX EN DOMBES;01330;AMBERIEUX EN DOMBES;\n"
        "01999;COMMUNE NOUVELLE;01500;COMMUNE NOUVELLE;\n"
        "75111;PARIS 11;75011;PARIS;\n"
        "97411;SAINT DENIS;97400;SAINT DENIS;\n",
        encoding="latin-1")
    classeur = openpyxl.Workbook()
    feuille = classeur.active
    feuille.append(["CODE DPT", "NOM DPT", "CODE COMMUNE", "NOM COMMUNE",
                    "CODE CIRC LEGISLATIVE", "CODE CANTON", "NOM CANTON"])
    for ligne in [(1, "Ain", 4, "Ambérieu-en-Bugey", 5, 1, "x"),
                  (1, "Ain", 5, "Ambérieux-en-Dombes", 4, 2, "x"),
                  (75, "Paris", 56, "Paris", 5, 3, "C"),
                  (75, "Paris", 56, "Paris", 6, 4, "C"),
                  ("ZD", "Réunion", 411, "Saint-Denis", 1, 5, "x"),
                  ("ZD", "Réunion", 411, "Saint-Denis", 2, 6, "x")]:
        feuille.append(list(ligne))
    classeur.save(dossier / ed.TABLE_CIRCOS)
    carre = [[[2.0, 48.0], [3.0, 48.0], [3.0, 49.0], [2.0, 49.0], [2.0, 48.0]]]
    (dossier / ed.CONTOURS).write_text(json.dumps({"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"codeDepartement": "75",
                                           "codeCirconscription": "7505"},
         "geometry": {"type": "Polygon", "coordinates": carre}},
        {"type": "Feature", "properties": {"codeDepartement": "ZD",
                                           "codeCirconscription": "ZD02"},
         "geometry": {"type": "MultiPolygon", "coordinates": [[[[55.123456, -21.0],
                                                                 [55.2, -21.0],
                                                                 [55.2, -20.9],
                                                                 [55.123456, -21.0]]]]}},
    ]}), encoding="utf-8")
    return dossier


def test_codes_insee_et_departements():
    assert ed.insee(1, 4) == "01004"
    assert ed.insee("2A", 4) == "2A004"
    assert ed.insee("ZA", 101) == "97101"
    assert ed.insee("ZP", 735) == "98735"
    assert ed.departement("ZZ") == "099"
    assert ed.cle_circo("75", "05") == "75-5"


def test_index_et_fiche(base, raw, tmp_path):
    r = ed.exporter(base, tmp_path / "export", date(2025, 6, 1), ["VT1", "VT3"], raw)
    alice, bruno = r["index"]
    assert alice["circo"] == "75-5" and alice["en_exercice"]
    assert (alice["sigle"], alice["place"]) == ("GB", 100)  # groupe actuel
    assert not bruno["en_exercice"] and bruno["circo"] == "974-2"
    fiche = json.loads((tmp_path / "export" / "deputes" / "PA1.json").read_text("utf-8"))
    assert [g["sigle"] for g in fiche["groupes"]] == ["GA", "GB"]
    # Hors motion de censure : 2 scrutins, 1 pour, 1 contre, 1 contre son groupe.
    assert fiche["chiffres"]["tous"] == {"scrutins": 2, "pour": 1, "contre": 1,
                                         "abstention": 0, "non_votant": 0, "absent": 0,
                                         "contre_groupe": 1}
    assert fiche["chiffres"]["solennels"]["scrutins"] == 1
    # Seuls les votes qui ont une page, du plus récent au plus ancien.
    assert [(v["numero"], v["vote"]) for v in fiche["votes"]] == [(3, "absent"), (1, "pour")]
    assert fiche["votes"][1] == {"uid": "VT1", "numero": 1, "vote": "pour", "groupe": "GA",
                                 "position_groupe": "pour"}
    assert fiche["lien"] == "https://www.assemblee-nationale.fr/dyn/deputes/PA1"


def test_codes_postaux(base, raw, tmp_path):
    r = ed.exporter(base, tmp_path / "export", date(2025, 6, 1), [], raw)
    cp = r["cp"]
    # Une commune dans une seule circonscription ; le lieu-dit ne la duplique pas.
    assert cp["01"]["01500"][0] == {"n": "Ambérieu-en-Bugey", "c": ["01-5"]}
    # Commune absente de la table : toutes les circonscriptions du département, adresse.
    assert cp["01"]["01500"][1] == {"n": "Commune Nouvelle", "c": ["01-4", "01-5"], "a": 1}
    # Arrondissement de Paris : les circonscriptions de Paris, adresse demandée.
    assert cp["75"]["75011"] == [{"n": "Paris 11", "c": ["75-5", "75-6"], "a": 1}]
    # Commune partagée entre deux circonscriptions.
    assert cp["97"]["97400"] == [{"n": "Saint-Denis", "c": ["974-1", "974-2"], "a": 1}]
    assert json.loads((tmp_path / "export" / "cp" / "75.json").read_text("utf-8")) == cp["75"]


def test_contours(base, raw, tmp_path):
    r = ed.exporter(base, tmp_path / "export", date(2025, 6, 1), [], raw)
    assert set(r["contours"]) == {"75", "974"}
    assert r["contours"]["974"]["974-2"]["coordinates"][0][0][0] == [55.1235, -21.0]
    assert (tmp_path / "export" / "contours" / "974.json").exists()


def test_sans_fichiers_geographiques(base, tmp_path):
    r = ed.exporter(base, tmp_path / "export", date(2025, 6, 1), [], tmp_path / "vide")
    assert r["cp"] is None and len(r["index"]) == 2
    assert not (tmp_path / "export" / "cp").exists()
