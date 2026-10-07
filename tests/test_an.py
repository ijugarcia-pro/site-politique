from pipeline.an import champ, liste, sans_cache, val


def test_val_traite_les_deux_formes_de_nul():
    assert val(None) is None
    assert val({"@xsi:nil": "true"}) is None
    assert val("17") == "17"


def test_liste_normalise_objet_unique_et_liste():
    assert liste(None) == []
    assert liste({"@xsi:nil": "true"}) == []
    assert liste({"acteurRef": "PA1"}) == [{"acteurRef": "PA1"}]
    assert liste([{"acteurRef": "PA1"}]) == [{"acteurRef": "PA1"}]


def test_champ_s_arrete_au_premier_maillon_absent():
    doc = {"objet": {"dossierLegislatif": None}}
    assert champ(doc, "objet", "dossierLegislatif", "dossierRef") is None
    assert champ({"a": {"b": "x"}}, "a", "b") == "x"


def test_sans_cache_ajoute_un_parametre_unique():
    url = "https://exemple.test/Scrutins.json.zip"
    assert sans_cache(url).startswith(url + "?t=")
    assert sans_cache(url + "?a=1").startswith(url + "?a=1&t=")
    assert sans_cache(url) != sans_cache(url)
