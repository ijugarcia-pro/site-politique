"""Ingestion de nuit : récupère les sources qui ont changé et tient leur état (tâche t11).

Usage :
    uv run python -m pipeline.ingest

Pour chaque source de pipeline/sources.py :
1. une requête HEAD (avec paramètre anti-cache) lit la date de modification ; si elle n'a pas
   bougé et que le fichier local est là, rien n'est téléchargé ;
2. sinon, l'archive est téléchargée (plusieurs tentatives), et son empreinte SHA-256 comparée à
   celle de la version connue : une archive régénérée à l'identique n'est pas un changement ;
3. un échec garde le fichier et l'état précédents, et compte les nuits d'échec d'affilée.

Le pipeline ne recalcule rien si aucune empreinte n'a changé. Sortie : code 1 si une source
requise a échoué (le build s'arrête, la version publiée reste en ligne), 0 sinon.

Produit :
    data/sources/etat.json   état versionné des sources (empreinte, date, échecs d'affilée)
    data/raw/<fichier>       dernière version de chaque source (non versionnée)
    data/raw/alerte.md       si une source échoue depuis SEUIL_ALERTE nuits (pour une issue)
    $GITHUB_OUTPUT           changement=true|false, telecharge=true|false, fichiers=<liste>
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import httpx

from pipeline.an import sans_cache
from pipeline.sources import SOURCES, nom_fichier

RACINE = Path(__file__).resolve().parent.parent
RAW = RACINE / "data" / "raw"
ETAT = RACINE / "data" / "sources" / "etat.json"
TENTATIVES = 4
SEUIL_ALERTE = 3


@dataclass
class Bilan:
    id: str
    statut: str  # « inchangée », « nouvelle version » ou « échec »
    requise: bool
    telecharge: bool = False
    detail: str = ""


def maintenant() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def requete(client: httpx.Client, methode: str, url: str, pause: Callable[[float], None]):
    """HEAD avec nouvelles tentatives (le serveur de l'Assemblée renvoie parfois des 503)."""
    for tentative in range(1, TENTATIVES + 1):
        try:
            reponse = client.request(methode, sans_cache(url))
            reponse.raise_for_status()
            return reponse
        except httpx.HTTPError:
            if tentative == TENTATIVES:
                raise
            pause(15 * tentative)


def telecharger(client: httpx.Client, url: str, cible: Path,
                pause: Callable[[float], None]) -> tuple[str, str | None]:
    """Télécharge dans un fichier temporaire, puis remplace la cible ; renvoie (empreinte,
    date de modification). Un échec laisse la cible intacte."""
    partiel = cible.with_name(cible.name + ".part")
    for tentative in range(1, TENTATIVES + 1):
        empreinte = hashlib.sha256()
        try:
            with client.stream("GET", sans_cache(url)) as reponse:
                reponse.raise_for_status()
                modification = reponse.headers.get("last-modified")
                with partiel.open("wb") as sortie:
                    for bloc in reponse.iter_bytes(1 << 20):
                        sortie.write(bloc)
                        empreinte.update(bloc)
            partiel.replace(cible)
            return empreinte.hexdigest(), modification
        except httpx.HTTPError:
            partiel.unlink(missing_ok=True)
            if tentative == TENTATIVES:
                raise
            pause(15 * tentative)
    raise AssertionError("inaccessible")


def recuperer(client: httpx.Client, source: dict, raw: Path, connu: dict | None,
              pause: Callable[[float], None]) -> tuple[Bilan, dict]:
    chemin = raw / nom_fichier(source)
    tete = requete(client, "HEAD", source["url"], pause)
    modification = tete.headers.get("last-modified")
    if (connu and chemin.exists() and modification
            and modification == connu.get("derniere_modification")
            and chemin.stat().st_size == connu.get("taille")):
        return Bilan(source["id"], "inchangée", source["requise"]), connu

    empreinte, modification_get = telecharger(client, source["url"], chemin, pause)
    meta = {
        "url": source["url"],
        "fichier": chemin.name,
        "taille": chemin.stat().st_size,
        "sha256": empreinte,
        "derniere_modification": modification_get or modification,
        "recupere_le": maintenant(),
        "echecs_consecutifs": 0,
    }
    if connu and connu.get("sha256") == empreinte:
        # Même contenu : on garde la date de récupération de la version, seule la date de
        # modification annoncée par le serveur change (pour éviter de retélécharger demain).
        meta["recupere_le"] = connu.get("recupere_le", meta["recupere_le"])
        return Bilan(source["id"], "inchangée", source["requise"], telecharge=True,
                     detail="régénérée à l'identique"), meta
    return Bilan(source["id"], "nouvelle version", source["requise"], telecharge=True), meta


def ingerer(client: httpx.Client, sources: list[dict], raw: Path, etat_chemin: Path,
            pause: Callable[[float], None] | None = None) -> list[Bilan]:
    """Une passe sur toutes les sources ; met à jour etat.json, même en cas d'échec."""
    pause = pause or time.sleep
    raw.mkdir(parents=True, exist_ok=True)
    etat = json.loads(etat_chemin.read_text(encoding="utf-8")) if etat_chemin.exists() else {}
    bilans = []
    for source in sources:
        connu = etat.get(source["id"])
        try:
            bilan, meta = recuperer(client, source, raw, connu, pause)
            etat[source["id"]] = {**meta, "echecs_consecutifs": 0}
            etat[source["id"]].pop("dernier_echec", None)
        except httpx.HTTPError as erreur:
            entree = dict(connu or {"url": source["url"], "fichier": nom_fichier(source)})
            entree["echecs_consecutifs"] = entree.get("echecs_consecutifs", 0) + 1
            entree["dernier_echec"] = f"{maintenant()} · {erreur.__class__.__name__}: {erreur}"
            etat[source["id"]] = entree
            bilan = Bilan(source["id"], "échec", source["requise"], detail=str(erreur))
        bilans.append(bilan)
        print(f"  {bilan.id} : {bilan.statut}{' (' + bilan.detail + ')' if bilan.detail else ''}",
              flush=True)
    etat_chemin.parent.mkdir(parents=True, exist_ok=True)
    etat_chemin.write_text(json.dumps(etat, indent=1, ensure_ascii=False, sort_keys=True) + "\n",
                           encoding="utf-8")
    return bilans


def alerte(etat: dict, sources: list[dict]) -> str | None:
    """Texte d'issue si une source échoue depuis SEUIL_ALERTE nuits ou plus."""
    en_echec = [(s, etat[s["id"]]) for s in sources
                if etat.get(s["id"], {}).get("echecs_consecutifs", 0) >= SEUIL_ALERTE]
    if not en_echec:
        return None
    lignes = ["L'ingestion de nuit échoue de façon répétée. La dernière version publiée reste en "
              "ligne.", "", "| Source | Requise | Nuits d'échec d'affilée | Dernier échec |",
              "|---|---|---|---|"]
    for source, entree in en_echec:
        lignes.append(f"| {source['nom']} | {'oui' if source['requise'] else 'non'} | "
                      f"{entree['echecs_consecutifs']} | {entree.get('dernier_echec', '')} |")
    return "\n".join(lignes) + "\n"


def sorties_github(bilans: list[Bilan], raw: Path, sources: list[dict]) -> str:
    """Variables lues par le workflow : faut-il recalculer, garder le cache, archiver quoi."""
    par_id = {s["id"]: s for s in sources}
    nouveaux = [str(raw / nom_fichier(par_id[b.id])) for b in bilans
                if b.statut == "nouvelle version"]
    changement = "true" if nouveaux else "false"
    telecharge = "true" if any(b.telecharge for b in bilans) else "false"
    return (f"changement={changement}\ntelecharge={telecharge}\n"
            f"fichiers<<FIN\n" + "\n".join(nouveaux) + "\nFIN\n")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    print("Ingestion des sources", flush=True)
    with httpx.Client(follow_redirects=True, timeout=httpx.Timeout(60, read=300)) as client:
        bilans = ingerer(client, SOURCES, RAW, ETAT)
    etat = json.loads(ETAT.read_text(encoding="utf-8"))
    texte = alerte(etat, SOURCES)
    fichier_alerte = RAW / "alerte.md"
    if texte:
        fichier_alerte.write_text(texte, encoding="utf-8")
    else:
        fichier_alerte.unlink(missing_ok=True)
    if "GITHUB_OUTPUT" in os.environ:
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as sortie:
            sortie.write(sorties_github(bilans, RAW, SOURCES))
    nouvelles = [b.id for b in bilans if b.statut == "nouvelle version"]
    echecs_requis = [b.id for b in bilans if b.statut == "échec" and b.requise]
    print(f"Nouvelles versions : {', '.join(nouvelles) or 'aucune'} ; échecs bloquants : "
          f"{', '.join(echecs_requis) or 'aucun'}")
    return 1 if echecs_requis else 0


if __name__ == "__main__":
    sys.exit(main())
