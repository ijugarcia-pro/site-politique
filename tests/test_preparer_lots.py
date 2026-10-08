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
