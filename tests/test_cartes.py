import json

import pytest

from pipeline import cartes


def carte(**champs):
    valeurs = {"uid": "VTANR5L17V1234", "numero": 1234, "theme": "Logement",
               "titre": "L'encadrement des loyers prolongé",
               "question": "Faut-il prolonger l'encadrement des loyers ?",
               "concretement": "Les villes volontaires pourraient continuer à plafonner les "
                               "loyers des nouveaux baux."}
    return cartes.Carte(**(valeurs | champs))


def test_une_carte_correcte_passe():
    assert cartes.controler_format(carte()) == []
    assert cartes.controler(carte(), "") == []


def test_theme_hors_liste_et_identifiant_discordant():
    assert cartes.controler_format(carte(theme="Fin de vie"))
    assert cartes.controler_format(carte(numero=99))
    assert cartes.controler_format(carte(uid="VTANR5L16V1234"))


def test_longueurs_et_ponctuation_du_titre():
    assert cartes.controler_format(carte(titre="Loi"))
    assert cartes.controler_format(carte(titre="x" * 61))
    assert cartes.controler_format(carte(titre="L'encadrement des loyers prolongé."))
    assert cartes.controler_format(carte(concretement="Trop court."))


def test_question_fermee():
    assert cartes.controler_format(carte(question="Pourquoi encadrer les loyers ?"))
    assert cartes.controler_format(carte(question="Faut-il encadrer les loyers"))


def test_vocabulaire_et_chiffres_du_titre_compris():
    assert cartes.controler(carte(titre="L'encadrement historique des loyers"), "")
    assert cartes.controler(carte(titre="L'encadrement historique des loyers"),
                            "une décision historique") == []
    assert cartes.controler(carte(titre="Les loyers encadrés pour 8 ans"), "aucun nombre")
    assert cartes.controler(carte(titre="Les loyers encadrés pour 8 ans"), "pendant 8 ans") == []


def test_aller_retour_json():
    c = carte()
    assert cartes.depuis_json(cartes.vers_json(c)) == c
    with pytest.raises(ValueError):
        cartes.depuis_json(cartes.vers_json(c) | {"source": "inventé"})


def lots(*numeros_par_lot):
    return [{"lot": i, "cartes": [cartes.vers_json(carte(uid=f"VTANR5L17V{n}", numero=n))
                                  for n in numeros]}
            for i, numeros in enumerate(numeros_par_lot, 1)]


def test_lire_lots(tmp_path):
    chemin = tmp_path / "lots.json"
    chemin.write_text(json.dumps(lots((1, 2, 3), (4, 5, 6))), encoding="utf-8")
    lus = cartes.lire_lots(chemin)
    assert [[c.numero for c in lot] for lot in lus] == [[1, 2, 3], [4, 5, 6]]
    for mauvais in (lots((1, 2)), lots((1, 2, 3), (3, 4, 5)),
                    [{"lot": 2, "cartes": lots((1, 2, 3))[0]["cartes"]}]):
        chemin.write_text(json.dumps(mauvais), encoding="utf-8")
        with pytest.raises(ValueError):
            cartes.lire_lots(chemin)


def test_douze_themes_distincts():
    assert len(set(cartes.THEMES)) == 12
