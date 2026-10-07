import csv
import io
import json
import zipfile

import httpx

from scripts import mesurer_delai_publication as mesure

SEANCE = "RUANR5L17S2026IDS1"


def archive(fichiers: dict[str, dict]) -> bytes:
    tampon = io.BytesIO()
    with zipfile.ZipFile(tampon, "w") as z:
        for nom, contenu in fichiers.items():
            z.writestr(nom, json.dumps(contenu))
    return tampon.getvalue()


def scrutin(numero: int, type_vote: str = "SPO") -> tuple[str, dict]:
    uid = f"VTANR5L17V{numero}"
    return f"json/{uid}.json", {"scrutin": {
        "uid": uid, "numero": str(numero), "dateScrutin": "2026-10-06", "seanceRef": SEANCE,
        "typeVote": {"codeTypeVote": type_vote},
    }}


AGENDA = archive({f"json/reunion/{SEANCE}.json": {"reunion": {
    "uid": SEANCE,
    "timeStampDebut": "2026-10-06T15:00:00.000+02:00",
    "timeStampFin": "2026-10-06T20:00:00.000+02:00",
}}})


class Serveur:
    """Faux data.assemblee-nationale.fr : une archive des scrutins et sa date de modification."""

    def __init__(self):
        self.scrutins = archive(dict([scrutin(1), scrutin(2)]))
        self.modification = "Wed, 07 Oct 2026 04:26:32 GMT"
        self.requetes = []

    def __call__(self, requete: httpx.Request) -> httpx.Response:
        self.requetes.append(requete)
        corps = AGENDA if "Agenda" in requete.url.path else self.scrutins
        entetes = {"last-modified": self.modification}
        return httpx.Response(200, headers=entetes, content=b"" if requete.method == "HEAD"
                              else corps)


def lire(chemin):
    with chemin.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_suivi_reference_puis_nouveaux_scrutins(tmp_path):
    serveur = Serveur()
    client = httpx.Client(transport=httpx.MockTransport(serveur))

    assert mesure.passage(client, tmp_path) is True
    assert json.loads((tmp_path / "etat.json").read_text())["reference"]["dernier_numero"] == 2
    assert lire(tmp_path / "scrutins.csv") == []

    assert mesure.passage(client, tmp_path) is False

    serveur.scrutins = archive(dict([scrutin(1), scrutin(2), scrutin(3, "SPS")]))
    serveur.modification = "Wed, 07 Oct 2026 10:26:12 GMT"
    assert mesure.passage(client, tmp_path) is True
    [nouveau] = lire(tmp_path / "scrutins.csv")
    assert nouveau["uid"] == "VTANR5L17V3"
    assert nouveau["type_vote"] == "SPS"
    assert nouveau["publie_le"] == "2026-10-07T10:26:12+00:00"
    assert nouveau["fin_seance"] == "2026-10-06T20:00:00.000+02:00"
    assert lire(tmp_path / "versions.csv")[-1]["nouveaux_scrutins"] == "1"

    # Toutes les requêtes contournent le cache.
    assert all("t=" in str(r.url.query) for r in serveur.requetes)

    rapport = tmp_path / "rapport.md"
    mesure.ecrire_rapport(tmp_path, rapport)
    texte = rapport.read_text(encoding="utf-8")
    assert "**Scrutins solennels** : 1 scrutins" in texte
    assert "Publiés au plus tard le lendemain du vote à 8 h : 0 sur 1" in texte


def test_lendemain_8h_a_l_heure_de_la_seance():
    ligne = {"date_scrutin": "2026-10-06", "debut_seance": "2026-10-06T21:30:00.000+02:00"}
    assert mesure.lendemain_8h(ligne).isoformat() == "2026-10-07T08:00:00+02:00"


def test_tranche_des_delais():
    assert mesure.tranche(0.5) == "moins de 1 h"
    assert mesure.tranche(6) == "6 à 12 h"
    assert mesure.tranche(30) == "plus de 24 h"
