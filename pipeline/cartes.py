"""La carte de vote : la forme sous laquelle un vote se présente et se tranche sur le site.

Une carte est commune au quiz (`data/quiz.json`), aux lots (`data/lots.json`), aux séances et
aux pages de vote (cadrage produit du 8 octobre 2026, docs/cadrage-produit.md) :

    uid           identifiant officiel du scrutin (VTANR5L17V…)
    numero        numéro du scrutin, comme sur le site de l'Assemblée
    theme         un des 12 thèmes de THEMES (liste fermée, celle de l'écran Explorer de V5)
    titre         titre court (« L'encadrement des loyers rendu permanent »)
    question      question fermée : « oui » veut dire voter pour
    concretement  une phrase, tirée des articles du texte voté

Le titre officiel du scrutin n'est pas dans la carte : il reste la troisième couche de la page
de vote (« Pour aller plus loin »). Les 3 cartes « Ce que ça change » sont des fiches (t27),
jointes à part. Chaque carte passe les contrôles 2, 4, 5 et 6 des fiches
(docs/vulgarisation-controles.md) avant d'être proposée à Julien, qui la valide.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

from pipeline import vulgarisation as vg

# Les 12 thèmes de l'écran Explorer des maquettes V5 (« Par thème »), dans leur ordre.
THEMES = ("Numérique", "Droits", "Travail", "Économie", "Immigration", "Environnement",
          "Éducation", "Institutions", "Énergie", "Sécurité", "Logement", "Santé")
CHAMPS = ("uid", "numero", "theme", "titre", "question", "concretement")
UID = re.compile(r"^VTANR5L17V(\d+)$")
VOTES_PAR_LOT = 3
CLES_LOT = {"lot", "cartes", "facultatif"}


@dataclass(frozen=True)
class Carte:
    uid: str
    numero: int
    theme: str
    titre: str
    question: str
    concretement: str


def _fiche(carte: Carte) -> dict:
    # Le titre court passe les contrôles comme le titre d'une carte « Ce que ça change ».
    return {"question": carte.question, "concretement": carte.concretement,
            "cartes": [{"titre": carte.titre, "texte": "", "article": "", "extrait": ""}]}


def controler_format(carte: Carte) -> list[str]:
    """Ce qui se vérifie sans le texte voté : thème de la liste, identifiant, contrôle 2
    (longueurs) et contrôle 4 (question fermée)."""
    erreurs = []
    if carte.theme not in THEMES:
        erreurs.append(f"thème « {carte.theme} » hors de la liste fermée")
    m = UID.match(carte.uid)
    if not m or int(m.group(1)) != carte.numero:
        erreurs.append(f"identifiant {carte.uid} et numéro {carte.numero} ne concordent pas")
    for cle in ("titre", "question", "concretement"):
        valeur = getattr(carte, cle)
        mini, maxi = vg.LONGUEURS[cle]
        if not mini <= len(valeur) <= maxi:
            erreurs.append(f"{cle} : {len(valeur)} caractères (attendu de {mini} à {maxi})")
    if carte.titre.rstrip().endswith((".", "?", "!")):
        erreurs.append("titre : pas de ponctuation finale")
    return erreurs + vg.controle_question(_fiche(carte)).erreurs


def controler(carte: Carte, sources: str) -> list[str]:
    """Toutes les erreurs d'une carte : le format, puis les contrôles 5 (vocabulaire neutre)
    et 6 (chiffres), jugés contre `sources`, le texte voté et son exposé des motifs."""
    fiche = _fiche(carte)
    return (controler_format(carte) + vg.controle_vocabulaire(fiche, sources).erreurs
            + vg.controle_chiffres(fiche, sources).erreurs)


def depuis_json(donnees: dict) -> Carte:
    """Une carte lue d'un fichier ; refuse un champ manquant ou inconnu."""
    if set(donnees) != set(CHAMPS):
        raise ValueError(f"champs attendus {CHAMPS}, reçus {tuple(donnees)}")
    return Carte(**donnees)


def vers_json(carte: Carte) -> dict:
    return asdict(carte)


def lire_lots(chemin: Path) -> list[list[Carte]]:
    """`data/lots.json` : une liste de lots, chacun `{"lot": n, "cartes": [3 cartes]}`, dans
    l'ordre où on les propose. Les lots du parcours viennent d'abord ; ceux qui les suivent
    pour affiner portent `"facultatif": true`. Vérifie la numérotation, la taille des lots,
    l'unicité des votes et le format de chaque carte (le vocabulaire et les chiffres, qui
    demandent les textes, sont contrôlés à la préparation)."""
    lots = json.loads(chemin.read_text(encoding="utf-8"))
    vus: set[int] = set()
    resultat = []
    facultatif = False
    for i, lot in enumerate(lots, 1):
        if (set(lot) - CLES_LOT or lot.get("lot") != i
                or len(lot.get("cartes", [])) != VOTES_PAR_LOT):
            raise ValueError(f"lot {i} : champ, numéro ou nombre de cartes inattendu")
        if facultatif and not lot.get("facultatif"):
            raise ValueError(f"lot {i} : un lot du parcours après un lot facultatif")
        facultatif = lot.get("facultatif", False)
        cartes = [depuis_json(c) for c in lot["cartes"]]
        for c in cartes:
            if c.numero in vus:
                raise ValueError(f"vote n° {c.numero} présent deux fois")
            vus.add(c.numero)
            if erreurs := controler_format(c):
                raise ValueError(f"n° {c.numero} : {' ; '.join(erreurs)}")
        resultat.append(cartes)
    return resultat


def scrutins_avec_carte(racine: Path) -> set[str]:
    """Les scrutins qui ont une carte de vote versionnée : ceux du quiz (`data/quiz.json`) et
    des lots (`data/lots.json`). Le site leur doit une page et une colonne dans la matrice."""
    uids = {q["uid"] for q in json.loads((racine / "data" / "quiz.json").read_text("utf-8"))}
    lots = racine / "data" / "lots.json"
    if lots.exists():
        uids |= {c["uid"] for lot in json.loads(lots.read_text("utf-8")) for c in lot["cartes"]}
    return uids


def lots_du_parcours(chemin: Path) -> int:
    """Le nombre de lots du parcours dans `data/lots.json` : ceux qui ne sont pas facultatifs."""
    return sum(not lot.get("facultatif") for lot in json.loads(chemin.read_text("utf-8")))
