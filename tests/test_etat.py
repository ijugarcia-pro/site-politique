import json
from datetime import UTC, datetime

import duckdb
import pytest

from pipeline import checks, etat, normalize
from tests.test_normalize import construire_raw

MAINTENANT = datetime(2025, 6, 4, 12, 0, tzinfo=UTC)
SOURCES = {"scrutins": {"derniere_modification": "Wed, 04 Jun 2025 04:26:32 GMT",
                        "recupere_le": "2025-06-04T06:15:00+00:00", "echecs_consecutifs": 0},
           "amendements": {"derniere_modification": "Tue, 03 Jun 2025 06:24:54 GMT",
                           "echecs_consecutifs": 2}}


@pytest.fixture(scope="module")
def donnees(tmp_path_factory, monkeypatch_module):
    dossier = tmp_path_factory.mktemp("etat")
    (dossier / "raw").mkdir()
    construire_raw(dossier / "raw")
    normalize.normaliser(dossier / "raw", dossier / "site.duckdb", fiches=dossier / "f").close()
    (dossier / "etat.json").write_text(json.dumps(SOURCES), encoding="utf-8")
    monkeypatch_module.setattr(checks, "MINIMUM_EN_EXERCICE", 1)
    resultat = checks.controler(dossier / "site.duckdb", dossier / "raw", dossier / "etat.json",
                                dossier / "controles", maintenant=MAINTENANT)
    con = duckdb.connect(str(dossier / "site.duckdb"), read_only=True)
    yield etat.construire(con, resultat, SOURCES, MAINTENANT)
    con.close()


@pytest.fixture(scope="module")
def monkeypatch_module():
    with pytest.MonkeyPatch.context() as mp:
        yield mp


def test_etat_resume_le_build(donnees):
    assert donnees["dernier_scrutin"]["numero"] == 4
    assert donnees["scrutins"] == {"total": 4, "publies": 3, "mis_de_cote": 1}
    assert donnees["scrutins_mis_de_cote"][0]["raison"] == "totaux : pour 2 au lieu de 3"
    assert donnees["deputes_en_exercice"] == 5
    assert [c["numero"] for c in donnees["controles"]] == [1, 2, 3, 4, 5, 6]


def test_etat_decrit_chaque_source(donnees):
    par_id = {s["id"]: s for s in donnees["sources"]}
    assert par_id["scrutins"]["version"] == "2025-06-04T04:26:32+00:00"
    assert par_id["amendements"]["echecs_consecutifs"] == 2
    assert par_id["contours_circonscriptions"]["version"] is None  # jamais récupérée
    assert all(s["licence"] for s in donnees["sources"])


def test_page_affiche_l_etat_et_echappe_les_titres(donnees):
    donnees = {**donnees, "dernier_scrutin": {**donnees["dernier_scrutin"],
                                              "titre": "<script>alert(1)</script>"}}
    page = etat.page(donnees)
    assert "<script>alert(1)" not in page and "&lt;script&gt;" in page
    assert "totaux : pour 2 au lieu de 3" in page
    assert "2 échec(s) d'affilée" in page
    assert '<html lang="fr">' in page and "État des <span>données</span>" in page


def test_date_lisible_en_heure_de_paris():
    assert etat.date_lisible("2026-10-07T10:26:12+00:00") == "7 octobre 2026 à 12 h 26"
    assert etat.date_lisible("2026-10-06") == "6 octobre 2026"
    assert etat.date_lisible(None) == "inconnue"
