from scripts import preparer_quiz as pq


def vote(numero, deputes=(), participation=50, **positions):
    return {"numero": numero, "participation": participation, "deputes": list(deputes),
            "groupes": {g: {"position": p} for g, p in positions.items()}}


def candidat(question="Faut-il interdire ceci dans les écoles ?",
             concretement="Le texte interdit ceci dans les écoles, à partir de la rentrée."):
    return pq.Candidat(1, "thème", question, concretement, "vérifié")


def test_candidats_uniques_et_assez_nombreux():
    numeros = [c.numero for c in pq.CANDIDATS]
    assert len(numeros) == len(set(numeros)) >= pq.N_QUIZ
    # Hors chiffres (qui demandent les textes), toutes les questions passent les contrôles.
    for c in pq.CANDIDATS:
        assert pq.controler(c, f"{c.question}\n{c.concretement}") == [], c.numero


def test_controles_d_une_question():
    assert pq.controler(candidat()) == []
    assert pq.controler(candidat(question="Pourquoi faut-il interdire ceci ?"))
    assert pq.controler(candidat(question="Faut-il voter ce texte historique de la gauche ?"))
    assert pq.controler(candidat(question="Trop court ?"))
    assert pq.controler(candidat(concretement="Trop court."))
    chiffre = candidat(concretement="Le texte interdit ceci dans 300 écoles dès la rentrée.")
    assert pq.controler(chiffre, "aucun nombre ici")
    assert pq.controler(chiffre, "dans 300 écoles") == []


def test_separation_des_groupes():
    votes = [vote(1, A="pour", B="contre", C="pour"),
             vote(2, A="pour", B="abstention", C=None)]
    assert pq.separation(votes, ["A", "B", "C"]) == {("A", "B"): 2, ("A", "C"): 0,
                                                       ("B", "C"): 1}


def test_recommandation_separe_puis_participation():
    votes = [vote(1, A="pour", B="pour", C="contre"),
             vote(2, A="pour", B="contre", C="contre", participation=40),
             vote(3, A="pour", B="contre", C="contre", participation=90),
             vote(4, A="pour", B="pour", C="pour")]
    assert pq.recommander(votes, ["A", "B", "C"], n=2) == [1, 3]


def test_couverture_des_deputes():
    votes = [vote(1, deputes=["PA1", "PA2"]), vote(2, deputes=["PA1"])]
    assert pq.couverture(votes) == {2: 1, 1: 1}


def test_date_lisible():
    assert pq.date_lisible("2026-07-15") == "15 juillet 2026"
