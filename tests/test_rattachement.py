from pipeline.rattachement import (
    Amendement,
    Index,
    analyser_libelle,
    auteur_correspond,
    categorie,
    coeur,
    combiner,
    methode_actes,
    methode_libelle,
    methode_seance,
    normaliser,
)

SEANCE = "RUANR5L17S2026IDS1"


def scrutin(titre, type_vote="SPO", uid="VTANR5L17V1", date="2026-05-20", seance=SEANCE):
    return {"uid": uid, "titre": titre, "type_vote": type_vote, "date": date, "seance": seance}


def amendement(numero, dossier, signataires, seance=SEANCE, date="2026-05-20", uid=None):
    return Amendement(uid=uid or f"AM{dossier}{numero}", numero=numero, dossier=dossier,
                      texte=None, seance=seance, date_sort=date, signataires=signataires,
                      article="Article 2")


def index_titres(**titres) -> Index:
    """index_titres(DL1="proposition de loi visant à …") : un dossier par titre, examiné en
    séance le 20 mai 2026."""
    index = Index()
    for dossier, titre in titres.items():
        index.titres.setdefault(coeur(titre), set()).add(dossier)
        index.premier_depot[dossier] = "2026-01-01"
        index.debats[dossier] = {"2026-05-20"}
    return index


# --- Lecture des libellés ---------------------------------------------------------------------


def test_normaliser_retire_accents_ligatures_et_apostrophes_typographiques():
    assert normaliser("Mise en œuvre de l’accord  Élu") == "mise en oeuvre de l'accord elu"


def test_categorie_tolere_les_fautes_de_frappe_observees():
    assert categorie("l'amenedement n° 187 de M. Renault", "SPO") == "amendement"
    assert categorie("le sous-amendmeent n° 196 de M. Léaument", "SPO") == "sous-amendement"
    assert categorie("l'aticle 6 du projet de loi", "SPO") == "article"
    assert categorie("l’ensemble du projet de loi", "SPS") == "ensemble"
    assert categorie("la première partie du projet de loi de finances", "SPS") == "partie"
    assert categorie("la motion de censure déposée", "MOC") == "motion de censure"


def test_analyser_libelle_lit_numero_et_auteur_de_l_amendement():
    lib = analyser_libelle(
        "l'amendement n° 1047 de M. Le Coq à l'article 45 (examen prioritaire) du projet de loi "
        "de finances pour 2026 (première lecture).", "SPO")
    assert (lib.numero_amendement, lib.auteur) == (1047, "le coq")
    assert lib.coeur == "de finances pour 2026"


def test_analyser_libelle_auteur_sans_civilite_ou_gouvernement():
    sous = analyser_libelle(
        "le sous-amendement n° 879 de Potier à l'amendement n° 339 de Mme Trouvé à l'article 5",
        "SPO")
    assert (sous.numero_amendement, sous.auteur) == (879, "potier")
    gouv = analyser_libelle("l'amendement n° 8 (rect.) du Gouvernement au projet de loi", "SPO")
    assert gouv.auteur == "gouvernement"
    suppression = analyser_libelle(
        "l'amendement n° 393 de Mme Capdevielle de suppression de l'article 6", "SPO")
    assert suppression.auteur == "capdevielle"


def test_coeur_identique_entre_scrutin_et_texte_de_la_commission():
    scrutin_titre = analyser_libelle(
        "l'ensemble de la proposition de loi, adoptée par le Sénat, après engagement de la "
        "procédure accélérée, visant à sortir la France du piège du narcotrafic (première "
        "lecture).", "SPS")
    # Les textes de la commission (BTC) n'ont pas de nature en tête de titre.
    assert scrutin_titre.coeur == coeur("visant à sortir la France du piège du narcotrafic")


def test_analyser_libelle_repere_la_nature_organique():
    lib = analyser_libelle("l'article 2 de la proposition de loi organique visant à", "SPO")
    assert lib.nature == "organique"
    assert analyser_libelle("l'article 2 de la proposition de loi visant à", "SPO").nature == (
        "ordinaire")


def test_auteur_correspond_a_une_lettre_pres_et_au_seul_nom_de_famille():
    am = amendement(879, "DL1", "mme colin-oesterle, m. berrios")
    assert auteur_correspond("colin-osterle", am)
    assert auteur_correspond("jean-rene cazeneuve", amendement(1, "DL1", "m. cazeneuve"))
    assert not auteur_correspond("jean-rene cazeneuve", amendement(1, "DL1", "m. belhaddad"))


# --- Méthodes ---------------------------------------------------------------------------------


def test_methode_actes_un_ou_plusieurs_dossiers():
    index = Index(actes={"VTANR5L17V1": {"DL1"}, "VTANR5L17V2": {"DL1", "DL2"}})
    assert methode_actes(scrutin("x"), index).dossier == "DL1"
    plusieurs = methode_actes(scrutin("x", uid="VTANR5L17V2"), index)
    assert plusieurs.dossier is None and plusieurs.voie == "plusieurs dossiers citent le scrutin"
    assert methode_actes(scrutin("x", uid="VTANR5L17V3"), index).dossiers == set()


def test_methode_libelle_retrouve_l_amendement_dans_la_seance():
    index = index_titres(DL1="projet de loi d'urgence agricole", DL2="projet de loi sur l'eau")
    index.amendements = {12: [amendement(12, "DL1", "m. dupont"),
                              amendement(12, "DL2", "mme durand")]}
    r = methode_libelle(scrutin(
        "l'amendement n° 12 de Mme Durand à l'article 2 du projet de loi sur l'eau"), index)
    assert r.dossier == "DL2"
    assert r.voie == "amendement retrouvé"
    assert r.article == "Article 2"


def test_methode_libelle_ecarte_un_amendement_du_meme_numero_d_un_autre_auteur():
    # Cas réel (scrutin 8426) : l'amendement n° 1 du jour appartient à un autre texte.
    index = index_titres(DL1="projet de loi d'urgence agricole", DL2="proposition de loi sur l'eau")
    index.amendements = {1: [amendement(1, "DL2", "m. belhaddad", seance=None)]}
    r = methode_libelle(scrutin(
        "l'amendement n° 1 de M. Jean-René Cazeneuve au projet de loi d'urgence agricole"), index)
    assert r.dossier == "DL1"
    assert r.voie == "amendement introuvable ; titre du texte identique"


def test_methode_libelle_titre_approchant_quand_les_mots_sont_dans_un_autre_ordre():
    index = index_titres(DL1="proposition de loi relative aux soins palliatifs et d'accompagnement")
    r = methode_libelle(scrutin(
        "l'article premier de la proposition de loi relative à l'accompagnement et aux soins "
        "palliatifs (première lecture)."), index)
    assert (r.dossier, r.voie) == ("DL1", "titre du texte approchant")


def test_methode_libelle_departage_par_la_nature_organique():
    index = index_titres(DL1="proposition de loi visant à harmoniser le mode de scrutin",
                         DL2="proposition de loi organique visant à harmoniser le mode de scrutin")
    index.natures["DL2"] = "organique"
    ordinaire = methode_libelle(scrutin(
        "l'article 5 de la proposition de loi visant à harmoniser le mode de scrutin"), index)
    organique = methode_libelle(scrutin(
        "l'article 2 de la proposition de loi organique visant à harmoniser le mode de scrutin"),
        index)
    assert (ordinaire.dossier, organique.dossier) == ("DL1", "DL2")


def test_methode_libelle_departage_par_le_jour_d_examen_en_seance():
    index = index_titres(DL1="proposition de loi visant à protéger les abeilles",
                         DL2="proposition de loi visant à protéger les abeilles")
    index.debats["DL1"] = {"2025-01-10"}
    r = methode_libelle(scrutin("l'article 1er de la proposition de loi visant à protéger les "
                                "abeilles"), index)
    assert r.dossier == "DL2"


def test_methode_libelle_sans_texte_designe():
    r = methode_libelle(scrutin("la déclaration du Gouvernement portant sur la défense", "SPS"),
                        Index())
    assert r.dossiers == set() and r.voie == "le libellé ne désigne aucun texte"


def test_methode_seance_un_seul_dossier_a_l_ordre_du_jour():
    index = Index(seances={SEANCE: {"DL1"}, "AUTRE": {"DL1", "DL2"}})
    assert methode_seance(scrutin("x"), index).dossier == "DL1"
    assert methode_seance(scrutin("x", seance="AUTRE"), index).dossier is None


# --- Combinaison ------------------------------------------------------------------------------


def test_combiner_prefere_l_amendement_retrouve_puis_les_actes():
    index = index_titres(DL1="projet de loi sur l'eau")
    index.amendements = {3: [amendement(3, "DL1", "m. dupont")]}
    index.actes = {"VTANR5L17V1": {"DL9"}}
    index.seances = {SEANCE: {"DL8"}}
    s = scrutin("l'amendement n° 3 de M. Dupont à l'article 2 du projet de loi sur l'eau")
    r = combiner(methode_actes(s, index), methode_libelle(s, index), methode_seance(s, index))
    assert (r.dossier, r.voie) == ("DL1", "B · amendement retrouvé")
    ensemble = scrutin("l'ensemble du projet de loi sur l'eau")
    r = combiner(methode_actes(ensemble, index), methode_libelle(ensemble, index),
                 methode_seance(ensemble, index))
    assert (r.dossier, r.voie) == ("DL9", "A · acte du dossier")


def test_combiner_ecarte_un_titre_menant_a_un_dossier_jamais_examine():
    # Cas réel (scrutin 7302) : le libellé garde le titre d'une ancienne proposition.
    index = index_titres(DL1="proposition de loi visant à protéger l'alimentation du cadmium")
    del index.debats["DL1"]
    index.seances = {SEANCE: {"DL2"}}
    s = scrutin("l'article unique de la proposition de loi visant à protéger l'alimentation du "
                "cadmium")
    libelle = methode_libelle(s, index)
    assert libelle.fragile
    r = combiner(methode_actes(s, index), libelle, methode_seance(s, index))
    assert (r.dossier, r.voie) == ("DL2", "C · seul dossier de la séance, titre écarté")


def test_combiner_n_attribue_pas_un_vote_sans_texte_au_dossier_de_la_seance():
    index = Index(seances={SEANCE: {"DL1"}})
    s = scrutin("la déclaration du Gouvernement portant sur la défense", "SPS")
    r = combiner(methode_actes(s, index), methode_libelle(s, index), methode_seance(s, index),
                 categorie(s["titre"], s["type_vote"]))
    assert r.dossier is None


def test_combiner_recoupe_deux_methodes_a_plusieurs_candidats():
    index = Index(actes={"VTANR5L17V1": {"DL1", "DL2"}}, seances={SEANCE: {"DL2", "DL3"}})
    s = scrutin("la motion de censure déposée", "MOC")
    r = combiner(methode_actes(s, index), methode_libelle(s, index), methode_seance(s, index),
                 "motion de censure")
    assert (r.dossier, r.voie) == ("DL2", "A ∩ C · recoupement")
