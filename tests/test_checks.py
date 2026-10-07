import json
import shutil
from datetime import UTC, datetime

import duckdb
import pytest

from pipeline import checks, normalize
from tests.test_normalize import acteur, construire_raw, ecrire_zip, fichier, mandat_groupe

MAINTENANT = datetime(2025, 6, 4, 12, 0, tzinfo=UTC)
ETAT_FRAIS = {"scrutins": {"derniere_modification": "Wed, 04 Jun 2025 04:26:32 GMT"}}


@pytest.fixture(scope="module")
def modele(tmp_path_factory):
    """Archives et base de référence, construites une fois ; chaque test en travaille une copie."""
    dossier = tmp_path_factory.mktemp("modele")
    (dossier / "raw").mkdir()
    construire_raw(dossier / "raw")
    normalize.normaliser(dossier / "raw", dossier / "site.duckdb",
                         fiches=dossier / "fiches").close()
    return dossier


@pytest.fixture(autouse=True)
def petite_assemblee(monkeypatch):
    """Le jeu de test compte 5 députés : on abaisse le minimum de députés en exercice."""
    monkeypatch.setattr(checks, "MINIMUM_EN_EXERCICE", 1)


@pytest.fixture
def env(modele, tmp_path):
    shutil.copytree(modele / "raw", tmp_path / "raw")
    shutil.copy(modele / "site.duckdb", tmp_path / "site.duckdb")
    (tmp_path / "etat.json").write_text(json.dumps(ETAT_FRAIS), encoding="utf-8")
    return tmp_path


def controler(env):
    return checks.controler(env / "site.duckdb", env / "raw", env / "etat.json",
                            env / "controles", maintenant=MAINTENANT)


def par_numero(rapport):
    return {r["numero"]: r for r in rapport["controles"]}


def test_build_autorise_et_scrutin_fautif_mis_de_cote(env):
    rapport = controler(env)
    c = par_numero(rapport)
    assert not rapport["build_arrete"]
    assert c[1]["reussi"] and c[3]["reussi"] and c[4]["reussi"] and c[5]["reussi"]
    assert c[6]["reussi"]
    # Totaux faux (scrutin 4) : mis de côté, sans arrêter le build.
    assert not c[2]["reussi"] and not c[2]["bloquant"]
    assert [s["numero"] for s in rapport["scrutins_mis_de_cote"]] == [4]
    publies = json.loads((env / "controles" / "publies.json").read_text())
    assert "VTANR5L17V1" in publies and "VTANR5L17V4" not in publies
    assert checks.texte_alerte(rapport) is None


def test_partition_en_echec_met_le_scrutin_de_cote(env):
    con = duckdb.connect(str(env / "site.duckdb"))
    con.execute("INSERT INTO vote SELECT * FROM vote WHERE scrutin_uid = 'VTANR5L17V2' "
                "AND depute_uid = 'PA1'")  # une case en double
    con.close()
    rapport = controler(env)
    assert not par_numero(rapport)[1]["reussi"]
    assert not rapport["build_arrete"]
    assert 2 in [s["numero"] for s in rapport["scrutins_mis_de_cote"]]


def test_effectifs_incoherents_arretent_le_build(env):
    # La liste des actifs oublie PA6 et met PA2 dans un autre groupe.
    ecrire_zip(env / "raw" / fichier("deputes_actifs"), {
        f"json/acteur/{pa}.json": acteur(pa, pa, [mandat_groupe(pa, g, "2024-07-18")])
        for pa, g in {"PA1": "PO2", "PA2": "PO2", "PA3": "PO1", "PA5": "PO2"}.items()})
    rapport = controler(env)
    effectifs = par_numero(rapport)[3]
    assert rapport["build_arrete"] and not effectifs["reussi"]
    assert any("PA6" in d for d in effectifs["details"])
    assert any(d.startswith("PA2 : groupe PO1") for d in effectifs["details"])
    # Build arrêté : la référence publiée n'est pas remplacée.
    assert not (env / "controles" / "publies.json").exists()
    assert "Build arrêté" in checks.texte_alerte(rapport)


def test_trop_de_deputes_en_exercice(env, monkeypatch):
    monkeypatch.setattr(checks, "SIEGES", 4)
    details = par_numero(controler(env))[3]["details"]
    assert any(d.startswith("scrutin n° 1 : 5 députés") for d in details)


def test_non_regression_resultat_publie_modifie(env):
    assert not controler(env)["build_arrete"]  # première publication : référence
    con = duckdb.connect(str(env / "site.duckdb"))
    # PA1 (pour) et PA3 (contre) échangent leur vote : mêmes totaux, résultat différent.
    con.execute("UPDATE vote SET position = CASE depute_uid WHEN 'PA1' THEN 'contre' "
                "ELSE 'pour' END WHERE scrutin_uid = 'VTANR5L17V1' "
                "AND depute_uid IN ('PA1', 'PA3')")
    con.close()
    rapport = controler(env)
    assert rapport["build_arrete"]
    assert par_numero(rapport)[4]["details"] == ["VTANR5L17V1 : le résultat publié a changé"]


def test_non_regression_scrutin_publie_puis_mis_de_cote(env):
    controler(env)
    con = duckdb.connect(str(env / "site.duckdb"))
    con.execute("UPDATE vote SET position = 'contre' WHERE scrutin_uid = 'VTANR5L17V1' "
                "AND depute_uid = 'PA1'")  # totaux faux désormais
    con.close()
    rapport = controler(env)
    assert rapport["build_arrete"]
    assert "désormais mis de côté" in par_numero(rapport)[4]["details"][0]


def test_non_regression_derogation_et_disparition():
    publiees = {"V1": "a", "V2": "b"}
    assert not checks.controle_non_regression({"V1": "a"}, publiees, {})["reussi"]
    assert checks.controle_non_regression({"V1": "a"}, publiees,
                                          {"V2": "rectification officielle"})["reussi"]
    assert checks.controle_non_regression({"V1": "a", "V2": "b", "V3": "c"}, publiees,
                                          {})["reussi"]  # un nouveau scrutin n'est pas un écart


def test_schema_champ_manquant_arrete_le_build(env):
    ecrire_zip(env / "raw" / fichier("agenda"), {"json/reunion/RU1.json": {"reunion": {
        "uid": "RU1"}}})  # plus de timeStampDebut
    rapport = controler(env)
    schema = par_numero(rapport)[5]
    assert rapport["build_arrete"] and not schema["reussi"]
    assert schema["details"] == ["agenda : « reunion.timeStampDebut » absent (premier cas : "
                                 "json/reunion/RU1.json)"]


def test_schema_archive_illisible(env):
    (env / "raw" / fichier("dossiers_legislatifs")).write_bytes(b"pas un zip")
    assert "illisible" in par_numero(controler(env))[5]["details"][0]


def test_fraicheur_alerte_sans_arreter(env):
    (env / "etat.json").write_text(json.dumps({"scrutins": {
        "derniere_modification": "Sat, 31 May 2025 04:26:32 GMT"}}), encoding="utf-8")
    rapport = controler(env)
    fraicheur = par_numero(rapport)[6]
    assert not fraicheur["reussi"] and not rapport["build_arrete"]
    assert "104 h" in fraicheur["details"][0]
    assert "Alerte sans arrêt" in checks.texte_alerte(rapport)
