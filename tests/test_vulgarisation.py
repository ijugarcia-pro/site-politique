import json
from types import SimpleNamespace

from pipeline.vulgarisation import (
    articles,
    cle_article,
    controle_articles,
    controle_chiffres,
    controle_format,
    controle_longueurs,
    controle_question,
    controle_relecture,
    controle_vocabulaire,
    controles_locaux,
    cout,
    expose_des_motifs,
    message_redaction,
    message_relecture,
    nombres,
    texte_du_html,
)
from scripts import essai_vulgarisation as essai

PAGE = """<html><head><style>body {}</style></head><body>
<p>PROPOSITION DE LOI</p><p>EXPOSÉ DES MOTIFS</p>
<p>Mesdames, Messieurs,</p><p>Les auteurs veulent protéger les abeilles.</p>
<p>– 1 –</p><p>proposition de loi</p>
<p>TITRE Ier</p><p>Dispositions générales</p>
<p>Article 1er</p><p>Les ruches déclarées bénéficient d’une aide de 4&nbsp;500 euros.</p>
<p>Article 2</p><p>(Supprimé)</p>
<p>Article 2 bis</p><p>Le préfet tient un registre des ruchers.</p>
</body></html>"""

TEXTE = {
    "Article 1er": "Les ruches déclarées bénéficient d’une aide de 4 500 euros par an.",
    "Article 2 bis": "Le préfet tient un registre des ruchers du département.",
}


def fiche(**modifs):
    base = {
        "question": "Faut-il créer une aide pour les ruches déclarées ?",
        "concretement": "Le texte crée une aide annuelle pour les ruches déclarées et un "
                        "registre des ruchers tenu par le préfet.",
        "cartes": [
            {"titre": "Une aide par ruche", "texte": "Chaque ruche déclarée ouvre droit à une "
             "aide de 4 500 euros par an.", "article": "Article 1er",
             "extrait": "bénéficient d'une aide de 4 500 euros"},
            {"titre": "Un registre", "texte": "Le préfet tient la liste des ruchers de chaque "
             "département.", "article": "Article 2 bis",
             "extrait": "Le préfet tient un registre des ruchers"},
            {"titre": "Les ruches déclarées", "texte": "Seules les ruches déclarées sont "
             "concernées par la nouvelle aide.", "article": "article premier",
             "extrait": "Les ruches déclarées bénéficient"},
        ],
    }
    base.update(modifs)
    return base


# --- Découpage --------------------------------------------------------------------------------


def test_texte_du_html_garde_les_paragraphes_et_ignore_le_style():
    texte = texte_du_html(PAGE)
    assert "body {}" not in texte
    assert "Les ruches déclarées bénéficient d’une aide de 4 500 euros." in texte.splitlines()


def test_articles_ecarte_titres_et_articles_supprimes():
    resultat = articles(texte_du_html(PAGE))
    assert list(resultat) == ["Article 1er", "Article 2 bis"]
    assert "TITRE" not in resultat["Article 1er"]


def test_expose_des_motifs_s_arrete_avant_le_dispositif():
    expose = expose_des_motifs(texte_du_html(PAGE))
    assert expose.endswith("protéger les abeilles.")
    assert expose_des_motifs("PROPOSITION DE LOI\nArticle 1er\nTexte") is None


def test_cle_article_rapproche_les_ecritures():
    assert cle_article("Article 1er") == cle_article("article premier") == "1er"
    assert cle_article("Art. 2 bis") == "2 bis"
    assert cle_article("Article unique") == "unique"


def test_message_redaction_contient_le_texte_et_les_erreurs_a_corriger():
    message = message_redaction("l'ensemble de la proposition de loi", "Exposé.", TEXTE,
                                ["carte 1 : extrait absent"])
    assert '<article intitule="Article 2 bis">' in message
    assert "carte 1 : extrait absent" in message


def test_message_relecture_ne_transmet_que_les_articles_cites():
    message = message_relecture(fiche(cartes=fiche()["cartes"][:1] * 3), TEXTE, None)
    assert "Article 1er" in message and "Article 2 bis" not in message


# --- Contrôles --------------------------------------------------------------------------------


def test_une_fiche_correcte_passe_les_six_controles_locaux():
    controles, resultat = controles_locaux(json.dumps(fiche()), TEXTE, "Exposé.")
    assert resultat is not None
    assert [c.numero for c in controles] == [1, 2, 3, 4, 5, 6]
    assert all(c.reussi for c in controles), [c.erreurs for c in controles]


def test_controle_format():
    assert not controle_format("pas du json")[0].reussi
    assert not controle_format(json.dumps(fiche(cartes=fiche()["cartes"][:2])))[0].reussi
    vide = fiche()
    vide["cartes"][0]["article"] = " "
    assert not controle_format(json.dumps(vide))[0].reussi


def test_controle_longueurs():
    assert not controle_longueurs(fiche(question="Oui ?")).reussi


def test_controle_articles_refuse_article_inconnu_et_extrait_invente():
    inconnu = fiche()
    inconnu["cartes"][0]["article"] = "Article 7"
    invente = fiche()
    invente["cartes"][1]["extrait"] = "Le préfet supprime les ruchers"
    assert not controle_articles(inconnu, TEXTE).reussi
    resultat = controle_articles(invente, TEXTE)
    assert not resultat.reussi and "carte 2" in resultat.erreurs[0]


def test_controle_question_fermee():
    assert controle_question(fiche()).reussi
    assert not controle_question(fiche(question="Pourquoi aider les ruches déclarées ?")).reussi
    assert not controle_question(fiche(question="Faut-il aider les ruches ou bien les "
                                                "apiculteurs ?")).reussi
    assert not controle_question(fiche(question="Faut-il aider les ruches déclarées.")).reussi


def test_controle_vocabulaire_ignore_les_extraits():
    jugement = fiche(concretement="Le texte crée enfin une aide historique pour les ruches.")
    resultat = controle_vocabulaire(jugement)
    assert not resultat.reussi
    assert {"enfin", "historique"} <= {e.split("« ")[1].rstrip(" »") for e in resultat.erreurs}
    extrait = fiche()
    extrait["cartes"][0]["extrait"] = "nous, la gauche"
    assert controle_vocabulaire(extrait).reussi


def test_controle_vocabulaire_sans_faux_positifs_observes_dans_l_essai():
    # Essai du 7 octobre 2026 : « rendez-vous » (scrutin 8419) et « communauté historique »,
    # mot du texte constitutionnel lui-même (scrutin 7454).
    assert controle_vocabulaire(fiche(concretement="Le texte ajoute un rendez-vous de "
                                                   "dépistage pour les enfants de six ans.")).reussi
    historique = fiche(concretement="Le texte reconnaît la communauté historique et culturelle "
                                    "de la Corse dans la Constitution.")
    assert not controle_vocabulaire(historique).reussi
    assert controle_vocabulaire(historique, "sa communauté historique, linguistique").reussi


def test_nombres_ignore_les_numeros_d_article_et_les_separateurs():
    assert nombres("une aide de 4 500 euros, article 12, le 1er janvier 2027") == {"4500",
                                                                                     "2027"}


def test_controle_chiffres_refuse_un_nombre_absent_de_la_source():
    sources = "\n".join(TEXTE.values())
    assert controle_chiffres(fiche(), sources).reussi
    resultat = controle_chiffres(fiche(concretement="Le texte coûtera 30 millions d'euros "
                                                    "par an aux finances publiques."), sources)
    assert not resultat.reussi and "30" in resultat.erreurs[0]


def test_controle_relecture():
    elements = [{"element": e, "fidele": True, "neutre": True, "probleme": ""}
                for e in ("question", "concretement", "carte 1", "carte 2", "carte 3")]
    assert controle_relecture(json.dumps({"elements": elements})).reussi
    elements[2]["fidele"] = False
    elements[2]["probleme"] = "l'article ne prévoit pas de montant annuel"
    resultat = controle_relecture(json.dumps({"elements": elements}))
    assert not resultat.reussi and "carte 1" in resultat.erreurs[0]
    assert not controle_relecture(json.dumps({"elements": elements[:4]})).reussi
    assert not controle_relecture(None).reussi


def test_cout_au_tarif_public():
    assert cout("claude-opus-5-5", 1_000_000, 100_000) == 6.0


# --- Circuit complet, avec une fausse API -----------------------------------------------------


class FausseAPI:
    """Rend les sorties prévues, dans l'ordre, et note chaque appel."""

    def __init__(self, sorties):
        self.sorties = list(sorties)
        self.appels = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self.create))

    def create(self, **parametres):
        self.appels.append(parametres)
        sortie = self.sorties.pop(0)
        return SimpleNamespace(
            stop_reason="refusal" if sortie is None else "end_turn",
            content=[] if sortie is None else [SimpleNamespace(type="text", text=sortie)],
            usage=SimpleNamespace(input_tokens=1000, output_tokens=200),
            model="claude-opus-5-5", id="msg_test",
        )


RELECTURE_OK = json.dumps({"elements": [
    {"element": e, "fidele": True, "neutre": True, "probleme": ""}
    for e in ("question", "concretement", "carte 1", "carte 2", "carte 3")]})
CHOIX = {"titre": "l'ensemble de la proposition de loi sur les ruches"}


def test_vulgariser_publie_une_fiche_qui_passe_les_sept_controles():
    api = FausseAPI([json.dumps(fiche()), RELECTURE_OK])
    resultat = essai.vulgariser(api, CHOIX, TEXTE, "Exposé.")
    assert resultat["statut"] == "publiée"
    assert len(api.appels) == 2
    appel = api.appels[0]
    assert appel["model"] == "claude-opus-5-5"
    assert appel["output_config"]["format"]["type"] == "json_schema"
    assert appel["fallbacks"] == "default"
    assert essai.cout_total(resultat) == round(2 * cout("claude-opus-5-5", 1000, 200), 4)


def test_vulgariser_retente_une_fois_avec_les_erreurs_puis_publie():
    mauvaise = fiche(question="Pourquoi aider les ruches déclarées ?")
    api = FausseAPI([json.dumps(mauvaise), json.dumps(fiche()), RELECTURE_OK])
    resultat = essai.vulgariser(api, CHOIX, TEXTE, None)
    assert resultat["statut"] == "publiée"
    assert len(resultat["essais"]) == 2
    assert "question est ouverte" in api.appels[1]["messages"][0]["content"]


def test_vulgariser_replie_sans_cartes_apres_deux_echecs():
    api = FausseAPI([None, "pas du json"])  # un refus, puis une sortie invalide
    resultat = essai.vulgariser(api, CHOIX, TEXTE, None)
    assert resultat["statut"] == "repli (sans cartes)"
    assert resultat["fiche"] is None
    assert len(api.appels) == 2  # pas de relecture d'une fiche invalide


def test_rapport_conserve_la_relecture_de_julien(tmp_path, monkeypatch):
    monkeypatch.setattr(essai, "RAPPORT", tmp_path / "essai.md")
    resultat = essai.vulgariser(FausseAPI([json.dumps(fiche()), RELECTURE_OK]), CHOIX, TEXTE,
                                None)
    resultat |= {"choix": {**essai.SELECTION[0]}, "nb_articles": 2}
    donnees = {"genere_le": "2026-10-07", "modele": "claude-opus-5-5", "effort": "high",
               "resultats": [resultat]}
    essai.ecrire_rapport(donnees)
    rapport = essai.RAPPORT.read_text(encoding="utf-8")
    assert "Faut-il créer une aide pour les ruches déclarées ?" in rapport
    essai.RAPPORT.write_text(rapport.replace("- [ ] Neutre", "- [x] Neutre"), encoding="utf-8")
    essai.ecrire_rapport(donnees)
    assert "- [x] Neutre" in essai.RAPPORT.read_text(encoding="utf-8")
