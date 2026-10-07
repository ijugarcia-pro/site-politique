"""Inventaire des fichiers open data : téléchargement dans data/raw/ puis description.

Usage :
    uv run python -m scripts.inventaire_open_data               # télécharge puis inventorie
    uv run python -m scripts.inventaire_open_data --hors-ligne  # inventorie les fichiers présents

Produit :
    data/mesures/inventaire_open_data.json  (mesure versionnée, lisible par machine)
    docs/inventaire-open-data.md            (rapport lisible)
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import statistics
import sys
import time
import zipfile
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

import httpx
import openpyxl

from pipeline.an import champ, est_nil, liste, sans_cache, val

RACINE = Path(__file__).resolve().parent.parent
RAW = RACINE / "data" / "raw"
MESURE = RACINE / "data" / "mesures" / "inventaire_open_data.json"
RAPPORT = RACINE / "docs" / "inventaire-open-data.md"

# Nombre maximal de fichiers lus par groupe pour décrire la structure.
ECHANTILLON = 400
# Chemins dont on ne recopie pas d'exemple de valeur (données personnelles).
MASQUE = re.compile(
    r"adresse|collaborateur|etatCivil|infoNaissance|dateDeces|uri_hatvp|personneAuditionnee"
)
ID_FICHIER = re.compile(r"[A-Z][A-Z0-9-]*\d[A-Z0-9-]*")
DEBUT_CONSTATS = "<!-- constats:debut -->"
FIN_CONSTATS = "<!-- constats:fin -->"

AN = "https://data.assemblee-nationale.fr/static/openData/repository/17/"
DATAGOUV = "https://static.data.gouv.fr/resources/"
TENTATIVES = 4

SOURCES = [
    {
        "id": "scrutins",
        "producteur": "Assemblée nationale",
        "nom": "Scrutins de la 17e législature",
        "url": AN + "loi/scrutins/Scrutins.json.zip",
        "licence": "Licence ouverte",
    },
    {
        "id": "deputes_actifs",
        "producteur": "Assemblée nationale",
        "nom": "Députés en exercice, mandats actifs et organes (AMO10)",
        "url": AN
        + "amo/deputes_actifs_mandats_actifs_organes/"
        "AMO10_deputes_actifs_mandats_actifs_organes.json.zip",
        "licence": "Licence ouverte",
    },
    {
        "id": "historique_mandats",
        "producteur": "Assemblée nationale",
        "nom": "Tous acteurs, tous mandats, tous organes, historique (AMO30)",
        "url": AN
        + "amo/tous_acteurs_mandats_organes_xi_legislature/"
        "AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip",
        "licence": "Licence ouverte",
    },
    {
        "id": "agenda",
        "producteur": "Assemblée nationale",
        "nom": "Agenda (réunions)",
        "url": AN + "vp/reunions/Agenda.json.zip",
        "licence": "Licence ouverte",
    },
    {
        "id": "dossiers_legislatifs",
        "producteur": "Assemblée nationale",
        "nom": "Dossiers législatifs et textes",
        "url": AN + "loi/dossiers_legislatifs/Dossiers_Legislatifs.json.zip",
        "licence": "Licence ouverte",
    },
    {
        "id": "amendements",
        "producteur": "Assemblée nationale",
        "nom": "Amendements",
        "url": AN + "loi/amendements_div_legis/Amendements.json.zip",
        "licence": "Licence ouverte",
    },
    {
        "id": "codes_postaux",
        "producteur": "La Poste (via data.gouv.fr)",
        "nom": "Base officielle des codes postaux",
        "url": "https://data.laposte.fr/data-fair/api/v1/datasets/laposte-hexasmal/raw",
        "fichier": "laposte_hexasmal.csv",
        "licence": "Licence ouverte 2.0",
    },
    {
        "id": "communes_circonscriptions",
        "producteur": "Ministère de l'Intérieur (via data.gouv.fr)",
        "nom": "Table de correspondance communes → circonscriptions législatives "
        "(mise à jour 2017)",
        "url": DATAGOUV
        + "circonscriptions-legislatives-table-de-correspondance-des-communes-et-des-cantons-"
        "pour-les-elections-legislatives-de-2012-et-sa-mise-a-jour-pour-les-elections-"
        "legislatives-2017/20170411-141128/Table_de_correspondance_circo_legislatives2017-1.xlsx",
        "licence": "Licence ouverte",
    },
    {
        "id": "contours_circonscriptions",
        "producteur": "data.gouv.fr",
        "nom": "Contours géographiques des circonscriptions législatives (précision 10 m)",
        "url": DATAGOUV
        + "contours-geographiques-des-circonscriptions-legislatives/"
        "20240613-191520/circonscriptions-legislatives-p10.geojson",
        "licence": "Licence ouverte 2.0",
    },
]


def nom_fichier(source: dict) -> str:
    return source.get("fichier") or source["url"].rsplit("/", 1)[-1]


def telecharger(client: httpx.Client, source: dict) -> dict:
    """Télécharge la source si la version distante a changé ; renvoie ses métadonnées."""
    chemin = RAW / nom_fichier(source)
    meta_chemin = chemin.with_name(chemin.name + ".meta.json")
    tete = client.head(sans_cache(source["url"]))
    distant = {
        "taille": int(tete.headers["content-length"]) if "content-length" in tete.headers else None,
        "derniere_modification": tete.headers.get("last-modified"),
    }
    if chemin.exists() and meta_chemin.exists():
        meta = json.loads(meta_chemin.read_text(encoding="utf-8"))
        inchange = (
            distant["derniere_modification"] is not None
            and meta.get("derniere_modification") == distant["derniere_modification"]
            and meta.get("taille") == chemin.stat().st_size
        )
        if inchange:
            print(f"  {source['id']} : déjà à jour")
            return meta

    print(f"  {source['id']} : téléchargement…", flush=True)
    partiel = chemin.with_name(chemin.name + ".part")
    for tentative in range(1, TENTATIVES + 1):
        empreinte = hashlib.sha256()
        try:
            with client.stream("GET", sans_cache(source["url"])) as reponse:
                reponse.raise_for_status()
                derniere_modification = reponse.headers.get("last-modified")
                with partiel.open("wb") as sortie:
                    for bloc in reponse.iter_bytes(1 << 20):
                        sortie.write(bloc)
                        empreinte.update(bloc)
            break
        except httpx.HTTPError as erreur:
            if tentative == TENTATIVES:
                raise
            print(f"    échec ({erreur.__class__.__name__}), nouvelle tentative…", flush=True)
            time.sleep(15 * tentative)
    partiel.replace(chemin)
    meta = {
        "url": source["url"],
        "taille": chemin.stat().st_size,
        "sha256": empreinte.hexdigest(),
        "derniere_modification": derniere_modification or distant["derniere_modification"],
        "telecharge_le": datetime.now(UTC).isoformat(timespec="seconds"),
    }
    meta_chemin.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return meta


# --- Lecture des archives ---------------------------------------------------------------------


def motif(nom: str) -> str:
    """Remplace les identifiants d'un chemin d'archive par <id> pour grouper les fichiers."""
    parties = []
    for partie in nom.split("/"):
        racine, point, extension = partie.partition(".")
        parties.append(f"<id>{point}{extension}" if ID_FICHIER.fullmatch(racine) else partie)
    return "/".join(parties)


def nouveau_schema() -> defaultdict:
    return defaultdict(lambda: {"docs": 0, "types": set(), "exemple": None})


def parcourir(valeur, chemin: str, schema: defaultdict, vus: set) -> None:
    """Relève chemins, types et un exemple ; une liste est décrite au chemin de ses éléments."""
    if isinstance(valeur, list):
        schema[chemin]["types"].add("liste")
        for element in valeur:
            parcourir(element, chemin, schema, vus)
        return
    entree = schema[chemin]
    if chemin not in vus:
        vus.add(chemin)
        entree["docs"] += 1
    if valeur is None:
        entree["types"].add("null")
    elif est_nil(valeur):
        entree["types"].add("nil (xsi)")
    elif isinstance(valeur, dict):
        entree["types"].add("objet")
        for cle, enfant in valeur.items():
            if not cle.startswith("@xmlns"):
                parcourir(enfant, f"{chemin}.{cle}" if chemin else cle, schema, vus)
    else:
        entree["types"].add("texte" if isinstance(valeur, str) else type(valeur).__name__)
        if entree["exemple"] is None and not MASQUE.search(chemin):
            entree["exemple"] = str(valeur)[:60]


def schema_en_liste(schema: defaultdict, nb_docs: int) -> list[dict]:
    return [
        {
            "chemin": chemin,
            "presence": round(entree["docs"] / nb_docs, 3),
            "types": sorted(entree["types"]),
            "exemple": entree["exemple"],
        }
        for chemin, entree in schema.items()
        if chemin
    ]


# --- Description générique par format --------------------------------------------------------


def decrire_zip(chemin: Path) -> dict:
    with zipfile.ZipFile(chemin) as archive:
        infos = [info for info in archive.infolist() if not info.is_dir()]
        groupes = defaultdict(list)
        for info in infos:
            groupes[motif(info.filename)].append(info)
        description = {
            "format": "zip",
            "fichiers": len(infos),
            "taille_decompressee": sum(info.file_size for info in infos),
            "groupes": [],
        }
        for nom_groupe, membres in sorted(groupes.items(), key=lambda g: -len(g[1])):
            echantillon = membres[:: max(1, len(membres) // ECHANTILLON)]
            schema = nouveau_schema()
            for info in echantillon:
                if info.filename.endswith(".json"):
                    parcourir(json.loads(archive.read(info)), "", schema, set())
            identifiants = Counter(
                re.sub(r"\d+", "9", Path(info.filename).stem) for info in membres
            )
            description["groupes"].append(
                {
                    "motif": nom_groupe,
                    "fichiers": len(membres),
                    "taille_decompressee": sum(info.file_size for info in membres),
                    "formes_identifiants": dict(identifiants.most_common(8)),
                    "echantillon": len(echantillon),
                    "schema": schema_en_liste(schema, len(echantillon)),
                }
            )
    return description


def decrire_colonnes(entete: list, lignes: list) -> list[dict]:
    colonnes = []
    for indice, nom in enumerate(entete):
        valeurs = [ligne[indice] for ligne in lignes if indice < len(ligne)]
        remplies = [v for v in valeurs if v is not None and str(v).strip()]
        colonnes.append(
            {
                "colonne": str(nom),
                "remplissage": round(len(remplies) / len(lignes), 3) if lignes else 0,
                "distinctes": len(set(map(str, remplies))),
                "exemple": str(remplies[0])[:60] if remplies else None,
            }
        )
    return colonnes


def lire_csv(chemin: Path) -> tuple[list, list, str, str]:
    brut = chemin.read_bytes()
    try:
        texte, encodage = brut.decode("utf-8-sig"), "UTF-8"
    except UnicodeDecodeError:
        texte, encodage = brut.decode("latin-1"), "ISO-8859-1"
    dialecte = csv.Sniffer().sniff(texte[:5000], delimiters=";,\t")
    lignes = list(csv.reader(io.StringIO(texte), dialecte))
    return lignes[0], lignes[1:], encodage, dialecte.delimiter


def decrire_csv(chemin: Path) -> dict:
    entete, lignes, encodage, separateur = lire_csv(chemin)
    return {
        "format": "csv",
        "encodage": encodage,
        "separateur": separateur,
        "lignes": len(lignes),
        "colonnes": decrire_colonnes(entete, lignes),
    }


def lire_xlsx(chemin: Path) -> dict[str, list]:
    classeur = openpyxl.load_workbook(chemin, read_only=True, data_only=True)
    feuilles = {f.title: list(f.iter_rows(values_only=True)) for f in classeur.worksheets}
    classeur.close()
    return feuilles


def decrire_xlsx(chemin: Path) -> dict:
    return {
        "format": "xlsx",
        "feuilles": [
            {
                "feuille": nom,
                "lignes": len(lignes) - 1,
                "colonnes": decrire_colonnes(lignes[0], lignes[1:]),
            }
            for nom, lignes in lire_xlsx(chemin).items()
            if lignes
        ],
    }


def decrire_geojson(chemin: Path) -> dict:
    entites = json.loads(chemin.read_text(encoding="utf-8"))["features"]
    proprietes = [e["properties"] for e in entites]
    entete = list(dict.fromkeys(cle for p in proprietes for cle in p))
    return {
        "format": "geojson",
        "entites": len(entites),
        "geometries": dict(Counter(e["geometry"]["type"] for e in entites)),
        "colonnes": decrire_colonnes(entete, [[p.get(c) for c in entete] for p in proprietes]),
    }


def decrire(chemin: Path) -> dict:
    suffixe = chemin.suffix.lower()
    if suffixe == ".zip":
        return decrire_zip(chemin)
    if suffixe == ".csv":
        return decrire_csv(chemin)
    if suffixe == ".xlsx":
        return decrire_xlsx(chemin)
    if suffixe == ".geojson":
        return decrire_geojson(chemin)
    raise ValueError(f"format non pris en charge : {chemin.name}")


# --- Mesures ciblées sur les règles du projet ------------------------------------------------


def documents(chemin: Path, prefixe: str):
    with zipfile.ZipFile(chemin) as archive:
        for nom in archive.namelist():
            if nom.startswith(prefixe) and nom.endswith(".json"):
                yield nom, json.loads(archive.read(nom))


def ids_archive(chemin: Path, prefixe: str) -> set[str]:
    with zipfile.ZipFile(chemin) as archive:
        return {
            Path(nom).stem for nom in archive.namelist() if nom.startswith(prefixe)
        }


def compteur(c: Counter, limite: int | None = None) -> dict:
    return dict(c.most_common(limite))


def resume(valeurs: list) -> dict | None:
    if not valeurs:
        return None
    return {"min": min(valeurs), "mediane": statistics.median(valeurs), "max": max(valeurs)}


# Codes « Z » du ministère de l'Intérieur → codes de l'Assemblée (99 = Français de l'étranger).
CODES_INTERIEUR = {
    "ZA": "971", "ZB": "972", "ZC": "973", "ZD": "974", "ZM": "976", "ZN": "988",
    "ZP": "987", "ZS": "975", "ZW": "986", "ZX": "977", "ZZ": "99",
}


def cle_circo(departement, numero) -> str:
    departement = str(departement).upper()
    departement = CODES_INTERIEUR.get(departement, departement).lstrip("0")
    return f"{departement}-{int(numero)}"


def mesurer_historique(chemin: Path) -> tuple[dict, dict]:
    types_mandats, types_organes, qualites_gp = Counter(), Counter(), Counter()
    acteurs17, circos17, gp_membres = set(), set(), defaultdict(set)
    gp_par_acteur = defaultdict(int)
    mandats17 = en_cours17 = nb_acteurs = 0
    for _, doc in documents(chemin, "json/acteur/"):
        nb_acteurs += 1
        acteur = doc["acteur"]
        for mandat in liste(champ(acteur, "mandats", "mandat")):
            type_organe = mandat.get("typeOrgane")
            types_mandats[type_organe] += 1
            if val(mandat.get("legislature")) != "17":
                continue
            if type_organe == "ASSEMBLEE":
                mandats17 += 1
                acteurs17.add(mandat["acteurRef"])
                en_cours17 += champ(mandat, "dateFin") is None
                lieu = champ(mandat, "election", "lieu") or {}
                if val(lieu.get("numDepartement")) and val(lieu.get("numCirco")):
                    circos17.add(cle_circo(lieu["numDepartement"], lieu["numCirco"]))
            elif type_organe == "GP" and champ(mandat, "dateFin") is None:
                gp_membres[liste(champ(mandat, "organes", "organeRef"))[0]].add(mandat["acteurRef"])
                gp_par_acteur[mandat["acteurRef"]] += 1
                qualites_gp[champ(mandat, "infosQualite", "libQualite")] += 1
    groupes = []
    for _, doc in documents(chemin, "json/organe/"):
        organe = doc["organe"]
        types_organes[organe["codeType"]] += 1
        if organe["codeType"] == "GP" and val(organe.get("legislature")) == "17":
            groupes.append(
                {
                    "uid": organe["uid"],
                    "sigle": val(organe.get("libelleAbrev")),
                    "libelle": organe["libelle"],
                    "debut": champ(organe, "viMoDe", "dateDebut"),
                    "fin": champ(organe, "viMoDe", "dateFin"),
                    "membres_en_cours": len(gp_membres[organe["uid"]]),
                }
            )
    mesures = {
        "acteurs": nb_acteurs,
        "types_de_mandats": compteur(types_mandats, 12),
        "types_d_organes": compteur(types_organes, 12),
        "mandats_de_depute_17e": mandats17,
        "deputes_distincts_17e": len(acteurs17),
        "mandats_de_depute_17e_en_cours": en_cours17,
        "circonscriptions_17e": len(circos17),
        "mandats_de_groupe_en_cours_par_qualite": compteur(qualites_gp),
        "deputes_avec_plusieurs_mandats_de_groupe_en_cours": sum(
            n > 1 for n in gp_par_acteur.values()
        ),
        "groupes_politiques_17e": sorted(groupes, key=lambda g: g["debut"] or ""),
    }
    return mesures, {"circos17": circos17}


def mesurer_actifs(chemin: Path, ids_historique: set[str]) -> dict:
    ids_acteurs, deputes_en_cours = set(), 0
    for _, doc in documents(chemin, "json/acteur/"):
        acteur = doc["acteur"]
        ids_acteurs.add(champ(acteur, "uid", "#text"))
        deputes_en_cours += any(
            m.get("typeOrgane") == "ASSEMBLEE"
            and val(m.get("legislature")) == "17"
            and champ(m, "dateFin") is None
            for m in liste(champ(acteur, "mandats", "mandat"))
        )
    return {
        "acteurs": len(ids_acteurs),
        "acteurs_avec_mandat_de_depute_en_cours": deputes_en_cours,
        "acteurs_absents_de_l_historique": len(ids_acteurs - ids_historique),
    }


def votants(noeud) -> int:
    """Compte les votants (objets portant acteurRef) sous un nœud quelconque."""
    if isinstance(noeud, list):
        return sum(votants(n) for n in noeud)
    if isinstance(noeud, dict):
        return 1 if "acteurRef" in noeud else sum(votants(n) for n in noeud.values())
    return 0


def mesurer_scrutins(chemin: Path, ids_acteurs: set, ids_organes: set, ids_dossiers: set):
    CATEGORIES = {"pours": "pour", "contres": "contre", "abstentions": "abstentions",
                  "nonVotants": "nonVotants"}
    dates, numeros = [], []
    types, sorts, modes, positions, causes, formes = (Counter() for _ in range(6))
    dossier_par_type, ecarts = defaultdict(lambda: [0, 0]), Counter()
    categories_par_type = defaultdict(Counter)
    requis = mise_au_point = doublons = delegations = votes_listes = 0
    listes_par_scrutin, absents_par_scrutin, membres_par_scrutin = [], [], []
    acteurs_inconnus, refs_dossiers = set(), set()
    groupes_inconnus = defaultdict(set)
    for _, doc in documents(chemin, "json/"):
        s = doc["scrutin"]
        dates.append(s["dateScrutin"])
        numeros.append(int(s["numero"]))
        code = s["typeVote"]["codeTypeVote"]
        types[f"{code} ({s['typeVote']['libelleTypeVote']})"] += 1
        sorts[s["sort"]["code"]] += 1
        mode = s["modePublicationDesVotes"]
        modes[f"{code} · {mode}"] += 1
        synthese = s["syntheseVote"]
        requis += val(synthese.get("nbrSuffragesRequis")) is not None
        dossier = champ(s, "objet", "dossierLegislatif", "dossierRef")
        dossier_par_type[code][0] += 1
        if dossier:
            dossier_par_type[code][1] += 1
            refs_dossiers.add(dossier)
        mise_au_point += votants(s.get("miseAuPoint")) > 0
        par_acteur, par_categorie, membres = Counter(), Counter(), 0
        for groupe in liste(champ(s, "ventilationVotes", "organe", "groupes", "groupe")):
            if groupe["organeRef"] not in ids_organes:
                groupes_inconnus[groupe["organeRef"]].add((s["dateScrutin"], int(s["numero"])))
            membres += int(val(groupe.get("nombreMembresGroupe")) or 0)
            positions[champ(groupe, "vote", "positionMajoritaire")] += 1
            nominatif = champ(groupe, "vote", "decompteNominatif") or {}
            for categorie, bloc in nominatif.items():
                brut = val(bloc).get("votant") if isinstance(val(bloc), dict) else None
                if brut is None:
                    continue
                formes["objet unique" if isinstance(brut, dict) else "liste"] += 1
                for votant in liste(brut):
                    par_acteur[votant["acteurRef"]] += 1
                    par_categorie[categorie] += 1
                    categories_par_type[code][categorie] += 1
                    delegations += votant.get("parDelegation") == "true"
                    if categorie == "nonVotants":
                        causes[val(votant.get("causePositionVote"))] += 1
        listes = sum(par_acteur.values())
        votes_listes += listes
        doublons += any(n > 1 for n in par_acteur.values())
        acteurs_inconnus |= set(par_acteur) - ids_acteurs
        if mode == "DecompteNominatif":
            listes_par_scrutin.append(listes)
            membres_par_scrutin.append(membres)
            absents_par_scrutin.append(membres - listes)
            decompte = synthese["decompte"]
            for categorie, cle in CATEGORIES.items():
                if par_categorie[categorie] != int(val(decompte.get(cle)) or 0):
                    ecarts[cle] += 1
    manquants = sorted(set(range(min(numeros), max(numeros) + 1)) - set(numeros))
    return {
        "scrutins": len(numeros),
        "premier_scrutin": min(dates),
        "dernier_scrutin": max(dates),
        "numeros": {"min": min(numeros), "max": max(numeros), "manquants": len(manquants),
                    "premiers_manquants": manquants[:10]},
        "types_de_vote": compteur(types),
        "resultats": compteur(sorts),
        "type_et_mode_de_publication": compteur(modes),
        "suffrages_requis_renseignes": requis,
        "dossier_legislatif_renseigne_par_type": {
            code: {"scrutins": n, "avec_dossier": d} for code, (n, d) in dossier_par_type.items()
        },
        "dossiers_cites_introuvables": len(refs_dossiers - ids_dossiers),
        "scrutins_avec_mise_au_point": mise_au_point,
        "decompte_nominatif": {
            "deputes_listes_par_scrutin": resume(listes_par_scrutin),
            "membres_des_groupes_par_scrutin": resume(membres_par_scrutin),
            "non_listes_par_scrutin": resume(absents_par_scrutin),
            "ecarts_avec_la_synthese": compteur(ecarts),
        },
        "scrutins_avec_un_depute_liste_deux_fois": doublons,
        "votes_par_delegation": f"{delegations} sur {votes_listes}",
        "forme_des_listes_de_votants": compteur(formes),
        "positions_majoritaires_des_groupes": compteur(positions),
        "causes_de_non_vote": compteur(causes),
        "votes_nominatifs_par_type_et_categorie": {
            code: compteur(c) for code, c in categories_par_type.items()
        },
        "acteurs_inconnus_de_l_historique": len(acteurs_inconnus),
        "groupes_inconnus_de_l_historique": {
            ref: {
                "scrutins": len(occurrences),
                "du": min(occurrences)[0],
                "au": max(occurrences)[0],
                "numeros": sorted(n for _, n in occurrences)[:15],
            }
            for ref, occurrences in groupes_inconnus.items()
        },
    }


def textes(noeud):
    if isinstance(noeud, str):
        yield noeud
    elif isinstance(noeud, list):
        for n in noeud:
            yield from textes(n)
    elif isinstance(noeud, dict):
        for n in noeud.values():
            yield from textes(n)


def mesurer_agenda(chemin: Path, ids_dossiers: set) -> dict:
    aujourd_hui = datetime.now(UTC).date().isoformat()
    types, etats, types_points, debuts = Counter(), Counter(), Counter(), []
    seances = seances_futures = points = points_avec_dossier = reunions_solennel = 0
    exemples_solennel, refs = [], set()
    for _, doc in documents(chemin, "json/reunion/"):
        r = doc["reunion"]
        types[r.get("@xsi:type")] += 1
        etats[champ(r, "cycleDeVie", "etat")] += 1
        debut = r["timeStampDebut"][:10]
        debuts.append(debut)
        if r.get("@xsi:type") == "seance_type":
            seances += 1
            seances_futures += debut > aujourd_hui
            for point in liste(champ(r, "ODJ", "pointsODJ", "pointODJ")):
                points += 1
                types_points[val(point.get("typePointODJ"))] += 1
                dossiers = liste(champ(point, "dossiersLegislatifsRefs", "dossierRef"))
                points_avec_dossier += bool(dossiers)
                refs.update(dossiers)
        mentions = [t for t in textes(r.get("ODJ")) if "solennel" in t.lower()]
        if mentions:
            reunions_solennel += 1
            for t in mentions:
                if len(exemples_solennel) < 6 and t[:140] not in exemples_solennel:
                    exemples_solennel.append(t[:140])
    return {
        "reunions": len(debuts),
        "premiere_reunion": min(debuts),
        "derniere_reunion": max(debuts),
        "types_de_reunion": compteur(types),
        "etats": compteur(etats),
        "seances_publiques": seances,
        "seances_publiques_a_venir": seances_futures,
        "points_d_ordre_du_jour_en_seance": points,
        "points_avec_dossier_legislatif": points_avec_dossier,
        "dossiers_cites_introuvables": len(refs - ids_dossiers),
        "types_de_points_en_seance": compteur(types_points, 15),
        "reunions_mentionnant_solennel": reunions_solennel,
        "exemples_solennel": exemples_solennel,
    }


def mesurer_dossiers(chemin: Path) -> dict:
    legislatures, natures, procedures = Counter(), Counter(), Counter()
    for _, doc in documents(chemin, "json/dossierParlementaire/"):
        d = doc["dossierParlementaire"]
        legislatures[d.get("legislature")] += 1
        natures[d.get("@xsi:type")] += 1
        procedures[champ(d, "procedureParlementaire", "libelle")] += 1
    legislatures_docs, types_docs, avec_dossier, nb_docs = Counter(), Counter(), 0, 0
    for _, doc in documents(chemin, "json/document/"):
        d = doc["document"]
        nb_docs += 1
        legislatures_docs[val(d.get("legislature"))] += 1
        types_docs[champ(d, "classification", "type", "libelle")] += 1
        avec_dossier += val(d.get("dossierRef")) is not None
    return {
        "dossiers": sum(legislatures.values()),
        "dossiers_par_legislature": compteur(legislatures),
        "natures_de_dossier": compteur(natures),
        "procedures": compteur(procedures, 12),
        "documents": nb_docs,
        "documents_par_legislature": compteur(legislatures_docs),
        "types_de_document": compteur(types_docs, 12),
        "documents_rattaches_a_un_dossier": avec_dossier,
    }


def mesurer_amendements(chemin: Path, ids_documents: set) -> dict:
    sorts, etats, auteurs, legislatures, dossiers = (Counter() for _ in range(5))
    depots, textes_vises = [], set()
    for nom, doc in documents(chemin, "json/"):
        a = doc["amendement"]
        dossiers["incorrect_data" if "/incorrect_data/" in nom else "rangés par dossier"] += 1
        legislatures[a.get("legislature")] += 1
        sorts[champ(a, "cycleDeVie", "sort")] += 1
        etats[champ(a, "cycleDeVie", "etatDesTraitements", "etat", "libelle")] += 1
        auteurs[champ(a, "signataires", "auteur", "typeAuteur")] += 1
        if depot := champ(a, "cycleDeVie", "dateDepot"):
            depots.append(depot)
        textes_vises.add(a.get("texteLegislatifRef"))
    return {
        "amendements": sum(dossiers.values()),
        "repartition_dossiers": compteur(dossiers),
        "par_legislature": compteur(legislatures),
        "premier_depot": min(depots),
        "dernier_depot": max(depots),
        "sorts": compteur(sorts),
        "etats": compteur(etats),
        "types_d_auteur": compteur(auteurs),
        "textes_vises": len(textes_vises),
        "textes_vises_introuvables_dans_les_documents": len(textes_vises - ids_documents),
    }


def mesurer_codes_postaux(chemin: Path) -> dict:
    entete, lignes, _, _ = lire_csv(chemin)
    insee, postal = entete.index("#Code_commune_INSEE"), entete.index("Code_postal")
    cp_par_commune, communes_par_cp = defaultdict(set), defaultdict(set)
    for ligne in lignes:
        cp_par_commune[ligne[insee]].add(ligne[postal])
        communes_par_cp[ligne[postal]].add(ligne[insee])
    return {
        "lignes": len(lignes),
        "communes": len(cp_par_commune),
        "codes_postaux": len(communes_par_cp),
        "communes_a_plusieurs_codes_postaux": sum(len(v) > 1 for v in cp_par_commune.values()),
        "codes_postaux_a_plusieurs_communes": sum(len(v) > 1 for v in communes_par_cp.values()),
    }


def mesurer_table_circos(chemin: Path) -> tuple[dict, set]:
    lignes = next(iter(lire_xlsx(chemin).values()))
    entete = lignes[0]
    dpt, commune, circ = (
        entete.index(c) for c in ("CODE DPT", "CODE COMMUNE", "CODE CIRC LEGISLATIVE")
    )
    circos_par_commune = defaultdict(set)
    for ligne in lignes[1:]:
        circos_par_commune[(ligne[dpt], ligne[commune])].add(ligne[circ])
    circos = {cle_circo(d, c) for (d, _), cs in circos_par_commune.items() for c in cs}
    codes_dpt = sorted({str(d) for d, _ in circos_par_commune})
    return {
        "lignes": len(lignes) - 1,
        "communes": len(circos_par_commune),
        "communes_sur_plusieurs_circonscriptions": sum(
            len(v) > 1 for v in circos_par_commune.values()
        ),
        "circonscriptions": len(circos),
        "codes_departement_non_numeriques": [c for c in codes_dpt if not c.isdigit()],
    }, circos


def mesurer_contours(chemin: Path) -> tuple[dict, set]:
    entites = json.loads(chemin.read_text(encoding="utf-8"))["features"]
    circos = {
        cle_circo(e["properties"]["codeDepartement"], e["properties"]["codeCirconscription"][-2:])
        for e in entites
    }
    return {"entites": len(entites), "circonscriptions": len(circos)}, circos


def mesurer(fichiers: dict[str, Path]) -> tuple[dict, dict]:
    """Mesures ciblées par source, puis recoupements entre sources."""
    m: dict = {}
    disponibles = {k for k, p in fichiers.items() if p.exists()}

    def pret(*ids: str) -> bool:
        return all(i in disponibles for i in ids)

    ids_acteurs = ids_organes = ids_dossiers = ids_documents = set()
    circos_an: set = set()
    if pret("historique_mandats"):
        print("  historique_mandats", flush=True)
        m["historique_mandats"], extra = mesurer_historique(fichiers["historique_mandats"])
        circos_an = extra["circos17"]
        ids_acteurs = ids_archive(fichiers["historique_mandats"], "json/acteur/")
        ids_organes = ids_archive(fichiers["historique_mandats"], "json/organe/")
    if pret("deputes_actifs", "historique_mandats"):
        print("  deputes_actifs", flush=True)
        m["deputes_actifs"] = mesurer_actifs(fichiers["deputes_actifs"], ids_acteurs)
    if pret("dossiers_legislatifs"):
        print("  dossiers_legislatifs", flush=True)
        m["dossiers_legislatifs"] = mesurer_dossiers(fichiers["dossiers_legislatifs"])
        ids_dossiers = ids_archive(fichiers["dossiers_legislatifs"], "json/dossierParlementaire/")
        ids_documents = ids_archive(fichiers["dossiers_legislatifs"], "json/document/")
    if pret("scrutins", "historique_mandats", "dossiers_legislatifs"):
        print("  scrutins", flush=True)
        m["scrutins"] = mesurer_scrutins(
            fichiers["scrutins"], ids_acteurs, ids_organes, ids_dossiers
        )
    if pret("agenda", "dossiers_legislatifs"):
        print("  agenda", flush=True)
        m["agenda"] = mesurer_agenda(fichiers["agenda"], ids_dossiers)
    if pret("amendements", "dossiers_legislatifs"):
        print("  amendements", flush=True)
        m["amendements"] = mesurer_amendements(fichiers["amendements"], ids_documents)
    if pret("codes_postaux"):
        m["codes_postaux"] = mesurer_codes_postaux(fichiers["codes_postaux"])

    recoupements: dict = {}
    for source, mesure_fn in (
        ("communes_circonscriptions", mesurer_table_circos),
        ("contours_circonscriptions", mesurer_contours),
    ):
        if not pret(source):
            continue
        m[source], circos = mesure_fn(fichiers[source])
        if circos_an:
            recoupements[f"Circonscriptions des députés (17e) absentes de « {source} »"] = sorted(
                circos_an - circos
            )
            recoupements[f"Circonscriptions de « {source} » sans député (17e)"] = sorted(
                circos - circos_an
            )
    return m, recoupements


# --- Rapport -----------------------------------------------------------------------------------


def nombre(n) -> str:
    return f"{n:,}".replace(",", "\u202f") if isinstance(n, int) else str(n)


def taille(octets: int) -> str:
    return f"{octets / 1e6:,.1f} Mo".replace(",", "\u202f").replace(".", ",")


def cellule(texte) -> str:
    if texte is None:
        return ""
    return str(texte).replace("|", "\\|").replace("\n", " ").replace("<", "&lt;")


def en_ligne(valeur) -> str:
    if isinstance(valeur, dict):
        return " · ".join(f"{cellule(k)} : {en_ligne(v)}" for k, v in valeur.items())
    if isinstance(valeur, list):
        return ", ".join(en_ligne(v) for v in valeur) if valeur else "aucun"
    return cellule(nombre(valeur))


def contenu_court(description: dict) -> str:
    if description["format"] == "zip":
        return (f"{nombre(description['fichiers'])} fichiers JSON "
                f"({taille(description['taille_decompressee'])} décompressés)")
    if description["format"] == "csv":
        return f"{nombre(description['lignes'])} lignes"
    if description["format"] == "xlsx":
        return ", ".join(f"{nombre(f['lignes'])} lignes" for f in description["feuilles"])
    return f"{nombre(description['entites'])} entités"


def table_colonnes(colonnes: list[dict]) -> list[str]:
    lignes = ["| Colonne | Remplissage | Valeurs distinctes | Exemple |", "|---|---|---|---|"]
    for c in colonnes:
        lignes.append(f"| {cellule(c['colonne'])} | {c['remplissage']:.0%} | "
                      f"{nombre(c['distinctes'])} | {cellule(c['exemple'])} |")
    return lignes


def section_source(source: dict, meta: dict | None, description: dict | None,
                   mesures: dict | None) -> list[str]:
    lignes = [f"### {source['nom']}", ""]
    lignes.append(f"- Producteur : {source['producteur']} · licence : {source['licence']}")
    lignes.append(f"- URL : <{source['url']}>")
    if meta is None or description is None:
        return lignes + ["- **Non disponible** : le téléchargement a échoué.", ""]
    lignes.append(f"- Fichier : `data/raw/{nom_fichier(source)}` · {taille(meta['taille'])} · "
                  f"SHA-256 `{meta.get('sha256', '')[:16]}…`")
    lignes.append(f"- Dernière modification côté serveur : {meta.get('derniere_modification')} · "
                  f"téléchargé le {meta.get('telecharge_le')}")
    lignes.append(f"- Contenu : {contenu_court(description)}")
    if description["format"] == "csv":
        lignes.append(f"- Encodage : {description['encodage']} · séparateur "
                      f"`{description['separateur']}`")
    if description["format"] == "geojson":
        lignes.append(f"- Géométries : {en_ligne(description['geometries'])}")
    lignes.append("")
    if mesures:
        lignes += ["**Mesures**", ""]
        for cle, valeur in mesures.items():
            if cle == "groupes_politiques_17e":
                continue
            lignes.append(f"- {cle.replace('_', ' ')} : {en_ligne(valeur)}")
        if mesures.get("groupes_politiques_17e"):
            lignes += ["", "| Groupe | Sigle | Libellé | Début | Fin | Membres en cours |",
                       "|---|---|---|---|---|---|"]
            for g in mesures["groupes_politiques_17e"]:
                lignes.append(f"| {g['uid']} | {cellule(g['sigle'])} | {cellule(g['libelle'])} | "
                              f"{g['debut'] or ''} | {g['fin'] or ''} | {g['membres_en_cours']} |")
        lignes.append("")
    if description["format"] == "zip":
        lignes += ["| Groupe de fichiers | Fichiers | Décompressé | Formes d'identifiant |",
                   "|---|---|---|---|"]
        for g in description["groupes"]:
            formes = ", ".join(f"`{k}` ({nombre(v)})" for k, v in g["formes_identifiants"].items())
            lignes.append(f"| `{g['motif']}` | {nombre(g['fichiers'])} | "
                          f"{taille(g['taille_decompressee'])} | {formes} |")
        lignes.append("")
        for g in description["groupes"]:
            polymorphes = [c for c in g["schema"] if {"liste", "objet"} <= set(c["types"])]
            lignes += [f"<details><summary>Structure de <code>{g['motif']}</code> "
                       f"({len(g['schema'])} chemins, échantillon de {g['echantillon']} fichiers, "
                       f"{len(polymorphes)} chemins tantôt objet, tantôt liste)</summary>", "",
                       "| Chemin | Présence | Types | Exemple |", "|---|---|---|---|"]
            for c in g["schema"]:
                lignes.append(f"| `{c['chemin']}` | {c['presence']:.0%} | "
                              f"{', '.join(c['types'])} | {cellule(c['exemple'])} |")
            lignes += ["", "</details>", ""]
    elif description["format"] == "xlsx":
        for f in description["feuilles"]:
            lignes += [f"Feuille « {f['feuille']} »", ""] + table_colonnes(f["colonnes"]) + [""]
    else:
        lignes += table_colonnes(description["colonnes"]) + [""]
    return lignes


def ecrire_rapport(inventaire: dict) -> None:
    constats = (f"{DEBUT_CONSTATS}\n_À rédiger après lecture des mesures._\n{FIN_CONSTATS}")
    if RAPPORT.exists():
        ancien = RAPPORT.read_text(encoding="utf-8")
        if DEBUT_CONSTATS in ancien and FIN_CONSTATS in ancien:
            debut = ancien.index(DEBUT_CONSTATS)
            constats = ancien[debut : ancien.index(FIN_CONSTATS) + len(FIN_CONSTATS)]
    lignes = [
        "# Inventaire des fichiers open data",
        "",
        f"Généré le {inventaire['genere_le']} par `uv run python -m scripts.inventaire_open_data`. "
        "Tout ce document est régénéré, sauf la section « Constats ». "
        "Mesures complètes : `data/mesures/inventaire_open_data.json`.",
        "",
        "## Constats",
        "",
        constats,
        "",
        "## Sources",
        "",
        "| Source | Producteur | Taille | Dernière modification | Contenu |",
        "|---|---|---|---|---|",
    ]
    for source in SOURCES:
        entree = inventaire["sources"][source["id"]]
        if entree["description"] is None:
            lignes.append(f"| {source['nom']} | {source['producteur']} | — | — | non disponible |")
            continue
        lignes.append(
            f"| {source['nom']} | {source['producteur']} | {taille(entree['meta']['taille'])} | "
            f"{entree['meta'].get('derniere_modification')} | "
            f"{contenu_court(entree['description'])} |"
        )
    if inventaire["recoupements"]:
        lignes += ["", "## Recoupements entre sources", ""]
        for cle, valeur in inventaire["recoupements"].items():
            lignes.append(f"- {cle} ({len(valeur)}) : {en_ligne(valeur)}")
    lignes += ["", "## Détail par source", ""]
    for source in SOURCES:
        entree = inventaire["sources"][source["id"]]
        lignes += section_source(source, entree["meta"], entree["description"],
                                 inventaire["mesures"].get(source["id"]))
    RAPPORT.write_text("\n".join(lignes).rstrip() + "\n", encoding="utf-8")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hors-ligne", action="store_true", help="ne rien télécharger")
    args = parser.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    if not args.hors_ligne:
        print("Téléchargement")
        with httpx.Client(follow_redirects=True, timeout=httpx.Timeout(60, read=300)) as client:
            for source in SOURCES:
                try:
                    telecharger(client, source)
                except httpx.HTTPError as erreur:
                    print(f"  {source['id']} : ÉCHEC — {erreur}")

    print("Description")
    fichiers = {s["id"]: RAW / nom_fichier(s) for s in SOURCES}
    sources = {}
    for source in SOURCES:
        chemin = fichiers[source["id"]]
        meta_chemin = chemin.with_name(chemin.name + ".meta.json")
        if not (chemin.exists() and meta_chemin.exists()):
            sources[source["id"]] = {"meta": None, "description": None}
            continue
        print(f"  {source['id']}", flush=True)
        sources[source["id"]] = {
            "meta": json.loads(meta_chemin.read_text(encoding="utf-8")),
            "description": decrire(chemin),
        }
    print("Mesures")
    mesures, recoupements = mesurer(fichiers)
    inventaire = {
        "genere_le": datetime.now(UTC).isoformat(timespec="seconds"),
        "sources": sources,
        "mesures": mesures,
        "recoupements": recoupements,
    }
    MESURE.write_text(json.dumps(inventaire, indent=1, ensure_ascii=False) + "\n",
                      encoding="utf-8")
    ecrire_rapport(inventaire)
    print(f"Écrit : {MESURE.relative_to(RACINE)} et {RAPPORT.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
