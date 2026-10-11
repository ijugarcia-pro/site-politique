"""Requêtes et téléchargements des sources : nouvelles tentatives, reprise après une coupure.

Le serveur d'origine de data.assemblee-nationale.fr renvoie parfois des 503 et coupe souvent un
téléchargement en cours de route (12 oct. 2026 : 6 sur 8 coupés après 3 à 6 Mo sur 27), alors que
la copie gardée 4 h par son cache passe. Pour chaque archive, on essaie donc :
1. la copie en cache (URL sans paramètre anti-cache), seulement si c'est la version annoncée par
   le HEAD sans cache (mêmes ETag et date de modification) ;
2. sinon le serveur d'origine, en reprenant après chaque coupure là où elle s'est produite
   (Range + If-Range), tant que le fichier grossit.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Callable
from pathlib import Path

import httpx

from pipeline.an import sans_cache

TENTATIVES = 5  # d'affilée sans rien recevoir de plus
REPRISES = 40  # au total pour un fichier
BLOC = 1 << 20
# Sans compression : les positions de Range comptent alors les octets écrits sur le disque.
IDENTITE = {"Accept-Encoding": "identity"}
PLAGE = re.compile(r"bytes (\d+)-\d+/(\d+)")


def requete(client: httpx.Client, methode: str, url: str,
            pause: Callable[[float], None]) -> httpx.Response:
    """Requête sans cache, avec nouvelles tentatives."""
    for tentative in range(1, TENTATIVES + 1):
        try:
            reponse = client.request(methode, sans_cache(url))
            reponse.raise_for_status()
            return reponse
        except httpx.HTTPError as erreur:
            if tentative == TENTATIVES:
                raise
            print(f"  {methode} : échec ({erreur.__class__.__name__}), nouvelle tentative…",
                  flush=True)
            pause(15 * tentative)
    raise AssertionError("inaccessible")


def version(entetes) -> tuple[str | None, str | None] | None:
    """Ce qui identifie une version d'un fichier : (ETag, date de modification)."""
    etag, modification = entetes.get("etag"), entetes.get("last-modified")
    return (etag, modification) if etag or modification else None


def taille(chemin: Path) -> int:
    return chemin.stat().st_size if chemin.exists() else 0


def ecrire(reponse: httpx.Response, partiel: Path, a_la_suite: bool) -> None:
    """Écrit le corps de la réponse ; erreur si le fichier n'a pas la taille annoncée."""
    with partiel.open("ab" if a_la_suite else "wb") as sortie:
        # Sans taille de bloc : chaque morceau est écrit dès qu'il arrive, pour ne rien perdre
        # de ce qui a été reçu avant une coupure.
        for bloc in reponse.iter_bytes():
            sortie.write(bloc)
    plage = PLAGE.fullmatch(reponse.headers.get("content-range", ""))
    total = plage.group(2) if plage else reponse.headers.get("content-length")
    if total is not None and "content-encoding" not in reponse.headers \
            and taille(partiel) != int(total):
        raise httpx.RemoteProtocolError(
            f"fichier incomplet ({taille(partiel)} octets reçus, {total} attendus)")


def copie_en_cache(client: httpx.Client, url: str, partiel: Path, annonce) -> bool:
    """Prend la copie du cache si c'est la version annoncée ; False sinon, ou si elle échoue."""
    if version(annonce) is None:
        return False
    try:
        with client.stream("GET", url, headers=IDENTITE) as reponse:
            if reponse.status_code != 200 or version(reponse.headers) != version(annonce):
                return False
            ecrire(reponse, partiel, a_la_suite=False)
        return True
    except httpx.HTTPError:
        return False


def depuis_l_origine(client: httpx.Client, url: str, partiel: Path,
                     pause: Callable[[float], None]) -> httpx.Headers:
    """Télécharge sans cache, en reprenant après chaque coupure ; renvoie les en-têtes."""
    partiel.unlink(missing_ok=True)
    validateur = None  # ETag ou date de la version en cours : la reprise doit être la même
    sans_progres = 0
    for reprise in range(1, REPRISES + 1):
        deja = taille(partiel)
        entetes = dict(IDENTITE)
        if deja and validateur:
            entetes |= {"Range": f"bytes={deja}-", "If-Range": validateur}
        try:
            with client.stream("GET", sans_cache(url), headers=entetes) as reponse:
                reponse.raise_for_status()
                plage = PLAGE.fullmatch(reponse.headers.get("content-range", ""))
                a_la_suite = reponse.status_code == 206
                if a_la_suite and (not plage or int(plage.group(1)) != deja):
                    partiel.unlink()
                    raise httpx.RemoteProtocolError("plage inattendue : on repart de zéro")
                if not a_la_suite:
                    # Réponse complète : premier essai, ou version changée entre deux essais.
                    etag = reponse.headers.get("etag", "")
                    validateur = (etag if etag and not etag.startswith("W/")
                                  else reponse.headers.get("last-modified"))
                ecrire(reponse, partiel, a_la_suite)
            return reponse.headers
        except httpx.HTTPError as erreur:
            if isinstance(erreur, httpx.HTTPStatusError) and erreur.response.status_code == 416:
                partiel.unlink(missing_ok=True)
            sans_progres = 0 if taille(partiel) > deja else sans_progres + 1
            if sans_progres == TENTATIVES or reprise == REPRISES:
                raise
            print(f"  GET : échec ({erreur.__class__.__name__}) à {taille(partiel) / 1e6:.1f} Mo, "
                  "nouvelle tentative…", flush=True)
            pause(15 * sans_progres if sans_progres else 5)
    raise AssertionError("inaccessible")


def telecharger(client: httpx.Client, url: str, cible: Path, pause: Callable[[float], None],
                annonce=None) -> tuple[str, str | None]:
    """Télécharge dans un fichier temporaire, puis remplace la cible ; renvoie (empreinte,
    date de modification). Un échec laisse la cible intacte. `annonce` : les en-têtes du HEAD
    sans cache, pour reconnaître la copie en cache."""
    partiel = cible.with_name(cible.name + ".part")
    try:
        if annonce is not None and copie_en_cache(client, url, partiel, annonce):
            entetes = annonce
        else:
            entetes = depuis_l_origine(client, url, partiel, pause)
        empreinte = hashlib.sha256()
        with partiel.open("rb") as fichier:
            while bloc := fichier.read(BLOC):
                empreinte.update(bloc)
        partiel.replace(cible)
        return empreinte.hexdigest(), entetes.get("last-modified")
    finally:
        partiel.unlink(missing_ok=True)
