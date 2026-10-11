import hashlib

import httpx
import pytest

from pipeline import telechargement

URL = "https://an.test/Scrutins.json.zip"
V1 = bytes(range(256)) * 4
V2 = V1[::-1]


class Coupure(httpx.SyncByteStream):
    """Corps de réponse interrompu : le début arrive, puis la connexion tombe."""

    def __init__(self, debut: bytes):
        self.debut = debut

    def __iter__(self):
        yield self.debut
        raise httpx.RemoteProtocolError("peer closed connection without sending complete "
                                        "message body")


class Serveur:
    """Faux data.assemblee-nationale.fr : une origine (URL avec « t= ») qui peut couper les
    téléchargements, et une copie en cache (URL nue) qui peut être d'une version plus ancienne."""

    def __init__(self, etag: str | None = '"v1"'):
        self.origine = [V1, etag, "Sun, 11 Oct 2026 22:26:56 GMT"]
        self.cache: list | None = None  # None : même version que l'origine
        self.coupures: list[int] = []  # octets servis par les prochains GET à l'origine
        self.requetes: list[httpx.Request] = []

    def __call__(self, requete: httpx.Request) -> httpx.Response:
        self.requetes.append(requete)
        a_l_origine = "t=" in str(requete.url.query)
        contenu, etag, modification = self.origine if a_l_origine or not self.cache else self.cache
        entetes = {"last-modified": modification} | ({"etag": etag} if etag else {})
        if requete.method == "HEAD":
            return httpx.Response(200, headers=entetes)
        code, debut = 200, 0
        if "range" in requete.headers and requete.headers.get("if-range") in (etag, modification):
            code, debut = 206, int(requete.headers["range"].removeprefix("bytes=").rstrip("-"))
            entetes["content-range"] = f"bytes {debut}-{len(contenu) - 1}/{len(contenu)}"
        else:
            entetes["content-length"] = str(len(contenu))
        if a_l_origine and self.coupures:
            fin = debut + self.coupures.pop(0)
            return httpx.Response(code, headers=entetes, stream=Coupure(contenu[debut:fin]))
        return httpx.Response(code, headers=entetes, content=contenu[debut:])

    def get(self) -> list[httpx.Request]:
        return [r for r in self.requetes if r.method == "GET"]


def telecharger(serveur, tmp_path, avec_annonce=True):
    client = httpx.Client(transport=httpx.MockTransport(serveur))
    pauses = []
    annonce = telechargement.requete(client, "HEAD", URL, pauses.append).headers
    resultat = telechargement.telecharger(client, URL, tmp_path / "archive.zip", pauses.append,
                                          annonce if avec_annonce else None)
    return resultat, pauses


def test_copie_en_cache_prise_si_c_est_la_version_annoncee(tmp_path):
    serveur = Serveur()
    (empreinte, modification), pauses = telecharger(serveur, tmp_path)
    assert (tmp_path / "archive.zip").read_bytes() == V1
    assert empreinte == hashlib.sha256(V1).hexdigest()
    assert modification == "Sun, 11 Oct 2026 22:26:56 GMT"
    [get] = serveur.get()
    assert not get.url.query  # la copie en cache, sans solliciter l'origine
    assert pauses == []


def test_copie_en_cache_d_une_autre_version_ignoree(tmp_path):
    serveur = Serveur()
    serveur.cache = [V2, '"v0"', "Sun, 11 Oct 2026 16:26:33 GMT"]
    (_, modification), _ = telecharger(serveur, tmp_path)
    assert (tmp_path / "archive.zip").read_bytes() == V1
    assert modification == "Sun, 11 Oct 2026 22:26:56 GMT"
    assert ["t=" in str(r.url.query) for r in serveur.get()] == [False, True]


def test_copie_en_cache_tronquee_ignoree(tmp_path):
    serveur = Serveur()
    serveur.cache = [V1[:100], *serveur.origine[1:]]  # mêmes en-têtes, corps incomplet

    def reponse(requete):
        r = serveur(requete)
        if requete.method == "GET" and not requete.url.query:
            r.headers["content-length"] = str(len(V1))
        return r

    client = httpx.Client(transport=httpx.MockTransport(reponse))
    annonce = client.head(URL + "?t=1").headers
    telechargement.telecharger(client, URL, tmp_path / "archive.zip", lambda s: None, annonce)
    assert (tmp_path / "archive.zip").read_bytes() == V1


def test_sans_annonce_le_cache_n_est_pas_utilise(tmp_path):
    serveur = Serveur()
    telecharger(serveur, tmp_path, avec_annonce=False)
    assert ["t=" in str(r.url.query) for r in serveur.get()] == [True]


@pytest.mark.parametrize("etag", ['"v1"', None, 'W/"v1"'])
def test_reprise_la_ou_la_connexion_a_ete_coupee(tmp_path, etag):
    serveur = Serveur(etag)
    serveur.coupures = [300, 0, 200]
    (empreinte, _), pauses = telecharger(serveur, tmp_path, avec_annonce=False)
    assert (tmp_path / "archive.zip").read_bytes() == V1
    assert empreinte == hashlib.sha256(V1).hexdigest()
    gets = serveur.get()
    assert [r.headers.get("range") for r in gets] == [None, "bytes=300-", "bytes=300-",
                                                     "bytes=500-"]
    # La reprise est conditionnée à la version : ETag fort, sinon date de modification.
    validateur = etag if etag == '"v1"' else "Sun, 11 Oct 2026 22:26:56 GMT"
    assert {r.headers.get("if-range") for r in gets[1:]} == {validateur}
    assert pauses == [5, 15, 5]  # courte si le fichier a grossi, plus longue sinon
    assert not (tmp_path / "archive.zip.part").exists()


def test_version_changee_pendant_la_reprise_on_repart_de_zero(tmp_path):
    serveur = Serveur()
    serveur.coupures = [300]

    def reponse(requete):
        if len(serveur.get()) == 1 and requete.method == "GET":  # deuxième GET : nouvelle version
            serveur.origine = [V2, '"v2"', "Mon, 12 Oct 2026 04:26:10 GMT"]
        return serveur(requete)

    client = httpx.Client(transport=httpx.MockTransport(reponse))
    _, modification = telechargement.telecharger(client, URL, tmp_path / "archive.zip",
                                                 lambda s: None)
    assert (tmp_path / "archive.zip").read_bytes() == V2
    assert modification == "Mon, 12 Oct 2026 04:26:10 GMT"
    assert serveur.get()[1].headers["range"] == "bytes=300-"


def test_abandon_apres_plusieurs_tentatives_sans_rien_recevoir(tmp_path):
    serveur = Serveur()
    serveur.coupures = [300] + [0] * 20
    (tmp_path / "archive.zip").write_bytes(b"version precedente")
    with pytest.raises(httpx.RemoteProtocolError):
        telecharger(serveur, tmp_path, avec_annonce=False)
    assert len(serveur.get()) == 1 + telechargement.TENTATIVES
    assert (tmp_path / "archive.zip").read_bytes() == b"version precedente"
    assert not (tmp_path / "archive.zip.part").exists()


def test_abandon_si_les_reprises_n_en_finissent_pas(tmp_path, monkeypatch):
    monkeypatch.setattr(telechargement, "REPRISES", 6)
    serveur = Serveur()
    serveur.coupures = [1] * 20
    with pytest.raises(httpx.RemoteProtocolError):
        telecharger(serveur, tmp_path, avec_annonce=False)
    assert len(serveur.get()) == 6


def test_requete_reessaie_apres_une_erreur_du_serveur():
    reponses = [httpx.Response(503), httpx.Response(503), httpx.Response(200)]
    client = httpx.Client(transport=httpx.MockTransport(lambda requete: reponses.pop(0)))
    pauses = []
    assert telechargement.requete(client, "HEAD", URL, pauses.append).status_code == 200
    assert pauses == [15, 30]
