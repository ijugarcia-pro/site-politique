import json

import httpx

from pipeline import ingest

SOURCES = [
    {"id": "scrutins", "nom": "Scrutins", "url": "https://an.test/Scrutins.json.zip",
     "requise": True},
    {"id": "amendements", "nom": "Amendements", "url": "https://an.test/Amendements.json.zip",
     "requise": False},
]


class Serveur:
    """Faux serveur : un contenu et une date de modification par fichier ; pannes à la demande."""

    def __init__(self):
        self.fichiers = {
            "/Scrutins.json.zip": [b"scrutins v1", "Wed, 07 Oct 2026 04:26:32 GMT"],
            "/Amendements.json.zip": [b"amendements v1", "Wed, 07 Oct 2026 06:24:54 GMT"],
        }
        self.en_panne: set[str] = set()
        self.requetes: list[httpx.Request] = []

    def __call__(self, requete: httpx.Request) -> httpx.Response:
        self.requetes.append(requete)
        if requete.url.path in self.en_panne:
            return httpx.Response(503)
        contenu, modification = self.fichiers[requete.url.path]
        return httpx.Response(200, headers={"last-modified": modification},
                              content=b"" if requete.method == "HEAD" else contenu)

    def get(self) -> list[str]:
        return [r.url.path for r in self.requetes if r.method == "GET"]


def passe(serveur, tmp_path, pauses=None):
    client = httpx.Client(transport=httpx.MockTransport(serveur))
    pauses = [] if pauses is None else pauses
    bilans = ingest.ingerer(client, SOURCES, tmp_path / "raw", tmp_path / "etat.json",
                            pause=pauses.append)
    etat = json.loads((tmp_path / "etat.json").read_text(encoding="utf-8"))
    return {b.id: b for b in bilans}, etat


def test_premiere_passe_telecharge_tout_et_note_les_empreintes(tmp_path):
    serveur = Serveur()
    bilans, etat = passe(serveur, tmp_path)
    assert {b.statut for b in bilans.values()} == {"nouvelle version"}
    assert (tmp_path / "raw" / "Scrutins.json.zip").read_bytes() == b"scrutins v1"
    assert len(etat["scrutins"]["sha256"]) == 64
    assert etat["scrutins"]["derniere_modification"] == "Wed, 07 Oct 2026 04:26:32 GMT"
    assert all("t=" in str(r.url.query) for r in serveur.requetes)  # anti-cache


def test_date_inchangee_aucun_telechargement(tmp_path):
    serveur = Serveur()
    passe(serveur, tmp_path)
    serveur.requetes.clear()
    bilans, _ = passe(serveur, tmp_path)
    assert {b.statut for b in bilans.values()} == {"inchangée"}
    assert serveur.get() == []  # seulement des HEAD


def test_archive_regeneree_a_l_identique_n_est_pas_un_changement(tmp_path):
    serveur = Serveur()
    _, avant = passe(serveur, tmp_path)
    serveur.fichiers["/Scrutins.json.zip"][1] = "Wed, 07 Oct 2026 10:26:12 GMT"
    bilans, etat = passe(serveur, tmp_path)
    assert bilans["scrutins"].statut == "inchangée"
    assert bilans["scrutins"].telecharge
    assert etat["scrutins"]["sha256"] == avant["scrutins"]["sha256"]
    assert etat["scrutins"]["recupere_le"] == avant["scrutins"]["recupere_le"]
    # La nouvelle date est retenue : la nuit suivante, plus de téléchargement.
    assert etat["scrutins"]["derniere_modification"] == "Wed, 07 Oct 2026 10:26:12 GMT"
    assert "changement=false" in ingest.sorties_github(list(bilans.values()), tmp_path / "raw",
                                                       SOURCES)


def test_nouvelle_version_detectee_et_listee_pour_l_archive(tmp_path):
    serveur = Serveur()
    passe(serveur, tmp_path)
    serveur.fichiers["/Scrutins.json.zip"] = [b"scrutins v2", "Thu, 08 Oct 2026 04:30:00 GMT"]
    bilans, _ = passe(serveur, tmp_path)
    assert bilans["scrutins"].statut == "nouvelle version"
    assert bilans["amendements"].statut == "inchangée"
    sorties = ingest.sorties_github(list(bilans.values()), tmp_path / "raw", SOURCES)
    assert "changement=true" in sorties
    assert "Scrutins.json.zip" in sorties and "Amendements.json.zip" not in sorties


def test_fichier_local_absent_retelecharge_sans_changement(tmp_path):
    # Runner neuf sans cache : la source doit être là pour la suite, sans relancer les calculs.
    serveur = Serveur()
    passe(serveur, tmp_path)
    (tmp_path / "raw" / "Scrutins.json.zip").unlink()
    bilans, _ = passe(serveur, tmp_path)
    assert bilans["scrutins"].statut == "inchangée" and bilans["scrutins"].telecharge
    assert (tmp_path / "raw" / "Scrutins.json.zip").exists()


def test_echec_de_telechargement_garde_la_version_precedente(tmp_path):
    serveur = Serveur()
    _, avant = passe(serveur, tmp_path)
    serveur.fichiers["/Scrutins.json.zip"] = [b"scrutins v2", "Thu, 08 Oct 2026 04:30:00 GMT"]
    serveur.en_panne.add("/Scrutins.json.zip")
    pauses = []
    bilans, etat = passe(serveur, tmp_path, pauses)
    assert bilans["scrutins"].statut == "échec"
    assert len(pauses) == ingest.TENTATIVES - 1  # nouvelles tentatives, avec attente
    assert (tmp_path / "raw" / "Scrutins.json.zip").read_bytes() == b"scrutins v1"
    assert not (tmp_path / "raw" / "Scrutins.json.zip.part").exists()
    assert etat["scrutins"]["sha256"] == avant["scrutins"]["sha256"]
    assert etat["scrutins"]["echecs_consecutifs"] == 1
    assert "503" in etat["scrutins"]["dernier_echec"]


def test_alerte_apres_trois_nuits_d_echec_puis_retour_a_la_normale(tmp_path):
    serveur = Serveur()
    passe(serveur, tmp_path)
    serveur.en_panne.add("/Amendements.json.zip")
    for nuit in range(ingest.SEUIL_ALERTE):
        _, etat = passe(serveur, tmp_path)
        assert (ingest.alerte(etat, SOURCES) is None) == (nuit < ingest.SEUIL_ALERTE - 1)
    texte = ingest.alerte(etat, SOURCES)
    assert "Amendements" in texte and "| non |" in texte
    serveur.en_panne.clear()
    _, etat = passe(serveur, tmp_path)
    assert etat["amendements"]["echecs_consecutifs"] == 0
    assert "dernier_echec" not in etat["amendements"]
    assert ingest.alerte(etat, SOURCES) is None


def test_main_echoue_seulement_si_une_source_requise_manque(tmp_path, monkeypatch):
    serveur = Serveur()
    transport = httpx.MockTransport(serveur)
    vrai_client = httpx.Client
    monkeypatch.setattr(ingest.httpx, "Client", lambda **kw: vrai_client(transport=transport))
    monkeypatch.setattr(ingest, "SOURCES", SOURCES)
    monkeypatch.setattr(ingest, "RAW", tmp_path / "raw")
    monkeypatch.setattr(ingest, "ETAT", tmp_path / "etat.json")
    monkeypatch.setattr(ingest.time, "sleep", lambda s: None)
    sortie = tmp_path / "github_output"
    monkeypatch.setenv("GITHUB_OUTPUT", str(sortie))

    assert ingest.main() == 0
    assert "changement=true" in sortie.read_text(encoding="utf-8")

    serveur.en_panne.add("/Amendements.json.zip")  # facultative
    assert ingest.main() == 0
    serveur.en_panne.add("/Scrutins.json.zip")  # requise
    serveur.fichiers["/Scrutins.json.zip"][1] = "Thu, 08 Oct 2026 04:30:00 GMT"
    assert ingest.main() == 1
