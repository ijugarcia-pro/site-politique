"""Accès à l'open data de l'Assemblée nationale : URL sans cache et lecture des JSON.

Les JSON de l'Assemblée sont convertis depuis du XML :
- une valeur nulle vaut None ou {"@xsi:nil": "true"} ;
- un élément répétable est un objet quand il est seul, une liste sinon ;
- toutes les valeurs sont du texte.
"""

from __future__ import annotations

import json
import uuid
import zipfile
from collections.abc import Iterator
from pathlib import Path

REPOSITORY = "https://data.assemblee-nationale.fr/static/openData/repository/17/"
URL_SCRUTINS = REPOSITORY + "loi/scrutins/Scrutins.json.zip"
URL_AGENDA = REPOSITORY + "vp/reunions/Agenda.json.zip"


def sans_cache(url: str) -> str:
    """Ajoute un paramètre unique : le cache de data.assemblee-nationale.fr garde 4 h sinon."""
    return f"{url}{'&' if '?' in url else '?'}t={uuid.uuid4().hex}"


def est_nil(valeur) -> bool:
    return isinstance(valeur, dict) and valeur.get("@xsi:nil") == "true"


def val(valeur):
    """Valeur utile, ou None pour les deux formes de nul."""
    return None if valeur is None or est_nil(valeur) else valeur


def liste(valeur) -> list:
    """Normalise un élément répétable en liste."""
    valeur = val(valeur)
    if valeur is None:
        return []
    return valeur if isinstance(valeur, list) else [valeur]


def champ(objet, *cles):
    """Descend dans un objet par clés successives ; None dès qu'un maillon manque."""
    for cle in cles:
        if not isinstance(objet, dict):
            return None
        objet = val(objet.get(cle))
    return objet


def documents(chemin: Path, prefixe: str = "") -> Iterator[tuple[str, dict]]:
    """Chaque fichier JSON d'une archive zip de l'Assemblée : (nom dans l'archive, contenu)."""
    with zipfile.ZipFile(chemin) as archive:
        for nom in archive.namelist():
            if nom.startswith(prefixe) and nom.endswith(".json"):
                yield nom, json.loads(archive.read(nom))
