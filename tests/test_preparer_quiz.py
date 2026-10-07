from scripts import preparer_quiz as pq


def vote(numero, **positions):
    return {"numero": numero, "groupes": {g: {"position": p} for g, p in positions.items()}}


def test_toutes_les_questions_passent_les_controles():
    assert {c.numero: pq.controler(c.question) for c in pq.CANDIDATS} == {
        c.numero: [] for c in pq.CANDIDATS}
    assert len(pq.CANDIDATS) == 20
    assert len({c.numero for c in pq.CANDIDATS}) == 20


def test_controles_d_une_question():
    assert pq.controler("Faut-il interdire ceci ?") == []
    assert pq.controler("Pourquoi faut-il interdire ceci ?")  # question ouverte
    assert pq.controler("Faut-il voter ce texte historique de la gauche ?")  # vocabulaire
    assert pq.controler("Trop court ?")  # moins de 20 caractères


def test_separation_des_groupes():
    votes = [vote(1, A="pour", B="contre", C="pour"),
             vote(2, A="pour", B="abstention", C=None)]
    # A et B diffèrent deux fois ; un groupe sans position ne compte pas.
    assert pq.separation(votes, ["A", "B", "C"]) == {("A", "B"): 2, ("A", "C"): 0,
                                                       ("B", "C"): 1}


def test_recommandation_separe_le_mieux():
    votes = [vote(1, A="pour", B="pour", C="contre"),
             vote(2, A="pour", B="contre", C="contre"),
             vote(3, A="pour", B="pour", C="pour")]
    themes = {1: "x", 2: "y", 3: "z"}
    # Avec deux votes : 1 et 2 séparent toutes les paires ; le vote 3 ne sépare rien.
    assert pq.recommander(votes, ["A", "B", "C"], themes, n=2) == [1, 2]


def test_date_lisible():
    assert pq.date_lisible("2026-07-15") == "15 juillet 2026"
