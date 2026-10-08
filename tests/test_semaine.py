import json
from datetime import date

import duckdb
import pytest

from pipeline import semaine as s

LUNDI = date(2026, 10, 12)


@pytest.fixture
def con():
    c = duckdb.connect()
    c.execute("CREATE TABLE vote_prevu (reunion_uid VARCHAR, point_uid VARCHAR, debut TIMESTAMP, "
              "date DATE, objet VARCHAR, dossier_uid VARCHAR, etat VARCHAR)")
    c.execute("CREATE TABLE dossier (uid VARCHAR, titre VARCHAR)")
    c.execute("CREATE TABLE scrutin (uid VARCHAR, numero INTEGER, date DATE, titre VARCHAR, "
              "dossier_uid VARCHAR, solennel BOOLEAN, motion_censure BOOLEAN, categorie VARCHAR, "
              "pour_publie INTEGER, contre_publie INTEGER, abstentions_publiees INTEGER)")
    c.execute("CREATE TABLE vote (scrutin_uid VARCHAR, depute_uid VARCHAR)")
    c.execute("CREATE TABLE appartenance (depute_uid VARCHAR, groupe_uid VARCHAR, debut DATE, "
              "fin DATE)")
    c.execute("CREATE TABLE groupe (uid VARCHAR, sigle VARCHAR)")
    c.execute("INSERT INTO groupe VALUES ('PO1', 'A'), ('PO2', 'B')")
    c.execute("INSERT INTO appartenance VALUES ('PA1', 'PO1', '2024-07-01', NULL), "
              "('PA2', 'PO1', '2024-07-01', NULL), ('PA3', 'PO2', '2024-07-01', NULL)")
    return c


def annoncer(con, point, jour, objet, dossier=None, titre=None):
    con.execute("INSERT INTO vote_prevu VALUES ('R', ?, ?, ?, ?, ?, 'Confirmé')",
                [point, f"{jour} 15:00:00", jour, objet, dossier])
    if dossier and titre:
        con.execute("INSERT INTO dossier VALUES (?, ?)", [dossier, titre])


def passe(con, numero, pour, contre, titre="Proposition de loi", dossier=None, jour="2026-03-01",
          sieges=10, solennel=True):
    uid = f"VTANR5L17V{numero}"
    con.execute("INSERT INTO scrutin VALUES (?, ?, ?, ?, ?, ?, false, 'ensemble', ?, ?, 0)",
                [uid, numero, jour, titre, dossier, solennel, pour, contre])
    for k in range(sieges):
        con.execute("INSERT INTO vote VALUES (?, ?)", [uid, f"PA{k}"])
    return uid


def lancer(con, tmp_path, jour=LUNDI, jours_seance=None, auteurs=None, monkeypatch=None):
    monkeypatch.setattr(s, "jours_de_seance", lambda _: jours_seance
                        if jours_seance is not None else {LUNDI, date(2026, 10, 13)})
    monkeypatch.setattr(s, "auteurs", lambda _, __: auteurs or {})
    monkeypatch.setattr(s, "archive", lambda raw, source: tmp_path / source)
    monkeypatch.setattr(s, "deja_proposes", lambda _: set())
    monkeypatch.setattr(s, "reserve", lambda: [])
    return s.semaine(con, jour, raw=tmp_path, semaines=tmp_path / "semaines",
                     seances=tmp_path / "seances")


def test_rattacher_et_nature():
    dossiers = [("D1", "Projet de loi de finances pour 2027"),
                ("D2", "Projet de loi de finances pour 2026"),
                ("D3", "Apporter une réponse intégrale aux violences sexuelles")]
    assert s.rattacher("Vote solennel sur le projet de loi de finances pour 2027", dossiers) == "D1"
    assert s.rattacher("Vote solennel sur la proposition de loi apportant une réponse intégrale "
                       "aux violences sexuelles", dossiers) == "D3"
    assert s.rattacher("Vote solennel sur un tout autre sujet", dossiers) is None
    assert s.nature("Vote solennel sur le projet de loi de finances (première partie).") == "partie"
    assert s.nature("Vote solennel sur l'ensemble du projet de loi") == "ensemble"


def test_choisir_ensemble_theme_rare_et_groupes_varies():
    c = [{"cle": "p1", "nature": "partie", "theme": None, "groupe": None},
         {"cle": "p2", "nature": "ensemble", "theme": "Santé", "groupe": "A"},
         {"cle": "p3", "nature": "ensemble", "theme": "Santé", "groupe": "A"},
         {"cle": "p4", "nature": "ensemble", "theme": "Logement", "groupe": "B"},
         {"cle": "p5", "nature": "ensemble", "theme": "Travail", "groupe": "A"}]
    choix = [x["cle"] for x in s.choisir(c, {"Santé": 2, "Travail": 1})]
    # Logement (jamais vu récemment) d'abord, puis Travail, puis Santé ; la partie de budget
    # passe après tous les textes entiers.
    assert choix == ["p4", "p5", "p2"]
    # À thème égal, un groupe d'origine pas encore représenté passe devant.
    c2 = [{"cle": "a", "nature": "ensemble", "groupe": "A"},
          {"cle": "b", "nature": "ensemble", "groupe": "A"},
          {"cle": "c", "nature": "ensemble", "groupe": "B"}]
    assert [x["cle"] for x in s.choisir(c2, {}, n=2)] == ["a", "c"]


def test_semaine_pleine(con, tmp_path, monkeypatch):
    for k, jour in enumerate(["2026-10-13", "2026-10-13", "2026-10-14", "2026-10-15"]):
        annoncer(con, f"PT{k}", jour, f"Vote solennel sur la proposition de loi numéro {k}",
                 f"D{k}", f"Proposition de loi numéro {k}")
    r = lancer(con, tmp_path, auteurs={"D0": "PA1", "D1": "PA2", "D2": "PA3"},
               monkeypatch=monkeypatch)
    assert not r["vacances"]
    # PT1 vient du même groupe que PT0 : PT3, d'auteur inconnu, passe devant.
    assert [v["cle"] for v in r["votes"]] == ["PT0", "PT2", "PT3"]
    assert all(v["type"] == "annonce" and v["statut"] == "à venir" for v in r["votes"])
    assert (tmp_path / "semaines" / "2026-10-12.json").exists()


def test_semaine_creuse_completee_par_des_votes_passes(con, tmp_path, monkeypatch):
    annoncer(con, "PT0", "2026-10-13", "Vote solennel sur la proposition de loi climat", "D0",
             "Proposition de loi climat")
    passe(con, 10, 60, 40)           # écart 20 %
    passe(con, 11, 51, 49)           # le plus serré
    passe(con, 12, 50, 50, titre="Projet de loi de finances pour 2026")   # budget : jamais
    passe(con, 13, 50, 49, sieges=1000)                                   # participation faible
    r = lancer(con, tmp_path, monkeypatch=monkeypatch)
    assert [v["cle"] for v in r["votes"]] == ["PT0", "scrutin:VTANR5L17V11",
                                              "scrutin:VTANR5L17V10"]
    assert r["votes"][1]["statut"] == "voté"
    assert r["votes"][1]["scrutin"] == {"uid": "VTANR5L17V11", "numero": 11}


def test_vacances_parlementaires(con, tmp_path, monkeypatch):
    passe(con, 10, 60, 40)
    r = lancer(con, tmp_path, jours_seance={date(2026, 9, 30)}, monkeypatch=monkeypatch)
    assert r["vacances"] and r["votes"] == []
    # La semaine suivante voit les vacances dans son historique (série gelée).
    suivante = lancer(con, tmp_path, jour=date(2026, 10, 19), jours_seance={date(2026, 9, 30)},
                      monkeypatch=monkeypatch)
    assert suivante["historique"] == [{"lundi": "2026-10-12", "vacances": True, "tranches": {}}]


def test_agenda_modifie_en_cours_de_semaine(con, tmp_path, monkeypatch):
    annoncer(con, "PT0", "2026-10-13", "Vote solennel sur la loi A", "D0", "Loi A")
    annoncer(con, "PT1", "2026-10-13", "Vote solennel sur la loi B", "D1", "Loi B")
    annoncer(con, "PT2", "2026-10-14", "Vote solennel sur la loi C", "D2", "Loi C")
    premier = lancer(con, tmp_path, monkeypatch=monkeypatch)
    assert [v["cle"] for v in premier["votes"]] == ["PT0", "PT1", "PT2"]
    # Mercredi : A est retiré, B passe à jeudi, D est ajouté.
    con.execute("DELETE FROM vote_prevu WHERE point_uid IN ('PT0', 'PT1')")
    annoncer(con, "PT1", "2026-10-15", "Vote solennel sur la loi B")
    annoncer(con, "PT3", "2026-10-15", "Vote solennel sur la loi D", "D3", "Loi D")
    ensuite = lancer(con, tmp_path, jour=date(2026, 10, 14), monkeypatch=monkeypatch)
    votes = {v["cle"]: v for v in ensuite["votes"]}
    assert list(votes) == ["PT0", "PT1", "PT2"]
    assert votes["PT0"]["statut"] == "retiré"
    assert votes["PT1"]["date"] == "2026-10-15" and votes["PT1"]["statut"] == "à venir"


def test_vote_annonce_tranche_par_son_scrutin(con, tmp_path, monkeypatch):
    annoncer(con, "PT0", "2026-10-13", "Vote solennel sur la loi A", "D0", "Loi A")
    passe(con, 9000, 300, 200, dossier="D0", jour="2026-10-13")
    r = lancer(con, tmp_path, monkeypatch=monkeypatch)
    assert r["votes"][0]["statut"] == "voté"
    assert r["votes"][0]["scrutin"]["numero"] == 9000


def test_carte_validee_jointe(con, tmp_path, monkeypatch):
    annoncer(con, "PT0", "2026-10-13", "Vote solennel sur la loi A", "D0", "Loi A")
    (tmp_path / "seances").mkdir()
    carte = {"theme": "Santé", "titre": "La loi A", "question": "Faut-il adopter la loi A ?",
             "concretement": "La loi A change ceci."}
    (tmp_path / "seances" / "2026-10-12.json").write_text(
        json.dumps({"lundi": "2026-10-12", "cartes": {"PT0": carte}}), encoding="utf-8")
    r = lancer(con, tmp_path, monkeypatch=monkeypatch)
    assert r["votes"][0]["carte"] == carte


def test_historique_relie_les_votes_annonces_a_leur_scrutin(con, tmp_path, monkeypatch):
    annoncer(con, "PT0", "2026-10-13", "Vote solennel sur la loi A", "D0", "Loi A")
    lancer(con, tmp_path, monkeypatch=monkeypatch)
    passe(con, 9000, 300, 200, dossier="D0", jour="2026-10-13")
    suivante = lancer(con, tmp_path, jour=date(2026, 10, 19), monkeypatch=monkeypatch)
    assert suivante["historique"][0]["tranches"] == {"PT0": "VTANR5L17V9000"}
