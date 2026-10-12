import json

from pipeline import cartes
from scripts import preparer_lots as pl
from scripts import preparer_quiz as pq


def vote(numero, theme="Logement", participation=50, **positions):
    return {"numero": numero, "theme": theme, "participation": participation,
            "groupes": {g: {"position": p} for g, p in positions.items()}}


def test_candidats_uniques_hors_quiz_et_au_format():
    candidats = pl.tous_les_candidats()
    numeros = [c.numero for c in candidats]
    assert len(numeros) == len(set(numeros)) >= 3 * pl.N_LOTS
    assert not set(numeros) & set(pq.CHOIX)
    assert len(pl.NOUVEAUX) >= 12
    for c in candidats:
        assert cartes.controler_format(c.carte(pl.uid(c.numero))) == [], c.numero
        assert c.sources, c.numero


def test_cartes_du_quiz_completes():
    assert set(pl.QUIZ_CARTES) == set(pq.CHOIX)
    assert {t for t, _ in pl.QUIZ_CARTES.values()} <= set(cartes.THEMES)


def test_precision():
    assert pl.precision(10) == 39
    assert pl.precision(25) == 71
    # Les lots facultatifs : 28, 31, 34 et 37 votes.
    assert [pl.precision(n) for n in (28, 31, 34, 37)] == [75, 79, 82, 84]


def test_un_lot_separe_d_abord_les_groupes_les_moins_separes():
    base = [vote(0, A="pour", B="pour", C="contre")]  # A et B jamais séparés
    candidats = [vote(1, "Santé", A="pour", B="contre", C="contre"),
                 vote(2, "Droits", A="pour", B="pour", C="contre", participation=90),
                 vote(3, "Travail", A="pour", B="pour", C="contre", participation=80),
                 vote(4, "Énergie", A="pour", B="pour", C="contre", participation=10)]
    lots = pl.composer(base, candidats, ["A", "B", "C"], n_lots=1)
    # Le n° 1 est le seul à séparer A et B ; puis la participation départage.
    assert lots == [[1, 2, 3]]


def test_themes_differents_dans_un_lot_et_plafond_par_theme():
    candidats = [vote(n, theme, A="pour", B="contre") for n, theme in
                 [(1, "Santé"), (2, "Santé"), (3, "Droits"), (4, "Travail"),
                  (5, "Santé"), (6, "Droits"), (7, "Travail")]]
    lots = pl.composer([], candidats, ["A", "B"], n_lots=3, max_par_theme=2)
    themes = {v["numero"]: v["theme"] for v in candidats}
    for lot in lots:
        assert len({themes[n] for n in lot}) == 3
    assert len(lots) == 2  # le troisième lot demanderait une troisième « Santé »
    assert sum(themes[n] == "Santé" for lot in lots for n in lot) == 2


def test_choix_de_julien_respecte_les_regles_des_lots():
    lots = pl.CHOIX
    numeros = [n for lot in lots for n in lot]
    assert len(lots) == pl.N_LOTS and len(numeros) == len(set(numeros)) == 15
    themes = {c.numero: c.theme for c in pl.tous_les_candidats()}
    assert set(numeros) <= set(themes) and not set(numeros) & set(pq.CHOIX)
    for lot in lots:
        assert len({themes[n] for n in lot}) == len(lot)
    compte = {}
    for n in numeros:
        compte[themes[n]] = compte.get(themes[n], 0) + 1
    assert max(compte.values()) <= pl.MAX_PAR_THEME


def test_lots_facultatifs_valides_par_julien():
    lots = pl.FACULTATIFS
    numeros = [n for lot in lots for n in lot]
    assert len(numeros) == len(set(numeros)) == 12
    themes = {c.numero: c.theme for c in pl.tous_les_candidats()}
    assert set(numeros) <= set(themes)
    assert not set(numeros) & (set(pq.CHOIX) | {n for lot in pl.CHOIX for n in lot}
                               | pl.EN_SEANCE)
    for lot in lots:
        assert len(lot) == cartes.VOTES_PAR_LOT == len({themes[n] for n in lot})


def test_data_lots_json_conforme_au_choix():
    lus = cartes.lire_lots(pl.LOTS)
    assert [[c.numero for c in lot] for lot in lus] == pl.CHOIX + pl.FACULTATIFS
    assert cartes.lots_du_parcours(pl.LOTS) == pl.N_LOTS == len(pl.CHOIX)


def test_chaque_carte_des_lots_a_un_scrutin_a_exporter():
    avec_carte = cartes.scrutins_avec_carte(pl.RACINE)
    for lot in pl.CHOIX + pl.FACULTATIFS:
        assert {pl.uid(n) for n in lot} <= avec_carte
    assert {pl.uid(n) for n in pq.CHOIX} <= avec_carte


def test_reserve_sans_les_cartes_validees():
    reserve = {c["numero"] for c in json.loads(pl.RESERVE.read_text(encoding="utf-8"))}
    valides = {n for lot in pl.CHOIX + pl.FACULTATIFS for n in lot} | pl.EN_SEANCE
    assert not reserve & valides
    assert reserve == {c.numero for c in pl.tous_les_candidats()} - valides


def test_comparables_et_paires_les_moins_separees():
    votes = [{"deputes": ["PA1", "PA2"]}] * 9 + [{"deputes": ["PA1"]}]
    assert pl.comparables(votes) == 1  # PA1 : 10 votes ; PA2 : 9
    separations = {("A", "B"): 4, ("A", "C"): 3, ("B", "C"): 7}
    assert pl.moins_separees(separations, 2) == "A / C (3), A / B (4)"
