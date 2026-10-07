from scripts import inventaire_open_data as inventaire


def test_motif_remplace_les_identifiants():
    assert inventaire.motif("json/acteur/PA841605.json") == "json/acteur/<id>.json"
    assert (
        inventaire.motif("json/incorrect_data/PIONANR5L17BTC2202/AMANR5L17PO838901B2202P0D1N7.json")
        == "json/incorrect_data/<id>/<id>.json"
    )
    assert inventaire.motif("json/document/MIONANR5L17-N11.json") == "json/document/<id>.json"


def test_parcourir_signale_les_chemins_tantot_objet_tantot_liste():
    schema = inventaire.nouveau_schema()
    inventaire.parcourir({"votant": {"acteurRef": "PA1"}}, "", schema, set())
    plusieurs = {"votant": [{"acteurRef": "PA2"}, {"acteurRef": "PA3"}]}
    inventaire.parcourir(plusieurs, "", schema, set())
    resultat = {c["chemin"]: c for c in inventaire.schema_en_liste(schema, 2)}
    assert resultat["votant"]["types"] == ["liste", "objet"]
    assert resultat["votant.acteurRef"]["presence"] == 1.0


def test_cle_circo_aligne_les_codes_du_ministere_et_de_l_assemblee():
    assert inventaire.cle_circo("ZA", 1) == inventaire.cle_circo("971", "1")
    assert inventaire.cle_circo("ZZ", "11") == inventaire.cle_circo("099", "11")
    assert inventaire.cle_circo("01", "04") == inventaire.cle_circo("1", 4)
