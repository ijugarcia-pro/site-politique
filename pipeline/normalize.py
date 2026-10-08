"""Normalisation : les archives de l'Assemblée deviennent 11 tables DuckDB (tâche t12).

Usage :
    uv run python -m pipeline.normalize

Tables (data/site.duckdb, non versionné) :
    depute, mandat, groupe, appartenance          qui siège, pour quelle circonscription, où
    scrutin, vote, position_groupe                 chaque vote, et une case par député et scrutin
    dossier, etape, vote_prevu, contenu            textes, étapes, votes solennels annoncés, fiches

Règles (CLAUDE.md, docs/decisions.md) :
- clés = identifiants officiels (PA…, PO…, PM…, VTANR…, DLR…) ;
- un député est en exercice à la date d'un scrutin si un de ses mandats de député de la
  17e législature la couvre, de la prise de fonction (`mandature.datePriseFonction`, et non
  `dateDebut`, qui reste la date de l'élection pour un suppléant) à la fin du mandat, incluse ;
- il occupe alors exactement une case : pour, contre, abstention, non_votant, ou absent s'il
  n'est pas listé (les absents ne sont pas publiés) ;
- son groupe à cette date vient des mandats de groupe (GP), jamais de la ventilation du scrutin
  (groupe « PO0 », groupes dissous encore cités) ;
- motion de censure : seuls les « pour » sont publiés ; « absent » y veut dire « n'a pas voté
  la censure », et ces scrutins sont exclus des calculs d'accord ;
- mise au point : gardée à côté du vote officiel, qui seul compte ;
- dissident : vote pour quand son groupe vote contre, ou l'inverse ; jamais pour un non-inscrit,
  jamais pour une abstention.
"""

from __future__ import annotations

import csv
import json
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

import duckdb

from pipeline.an import champ, documents, liste, val
from pipeline.rattachement import (
    categorie,
    charger_index,
    combiner,
    methode_actes,
    methode_libelle,
    methode_seance,
)
from pipeline.sources import SOURCES, nom_fichier

RACINE = Path(__file__).resolve().parent.parent
RAW = RACINE / "data" / "raw"
BASE = RACINE / "data" / "site.duckdb"
FICHES = RACINE / "data" / "fiches"
NON_INSCRITS = "PO840056"
POSITIONS = {"pours": "pour", "contres": "contre", "abstentions": "abstention",
             "nonVotants": "non_votant", "nonVotantsVolontaires": "non_votant"}
# Mise au point : rubriques de `miseAuPoint` et de `miseAuPoint.dysfonctionnement`.
POSITIONS_MISE_AU_POINT = {**POSITIONS, "pour": "pour", "contre": "contre"}
# Sigle affiché d'un groupe : l'abréviation que l'Assemblée affiche sur son site
# (`libelleAbrege` : UDR, EcoS, Dem), à défaut son code court (`libelleAbrev` : UDDPLR, ECOS…).
# Exception décidée par Julien le 8 octobre 2026 : « LFI » plutôt que « LFI-NFP » ; le nom
# officiel du groupe reste dans `libelle`.
SIGLES_AFFICHES = {"LFI-NFP": "LFI"}


def archive(raw: Path, source_id: str) -> Path:
    source = next(s for s in SOURCES if s["id"] == source_id)
    return raw / nom_fichier(source)


def jour(texte: str | None) -> str | None:
    return texte[:10] if texte else None


# --- Lecture des archives ---------------------------------------------------------------------


def lire_acteurs(chemin: Path) -> dict[str, list[dict]]:
    """Députés de la 17e, leurs mandats de député et leurs mandats de groupe (AMO30)."""
    deputes, mandats, gp = [], [], []
    for _, doc in documents(chemin, "json/acteur/"):
        acteur = doc["acteur"]
        uid = acteur["uid"]["#text"]
        siens = [m for m in liste(champ(acteur, "mandats", "mandat"))
                 if val(m.get("legislature")) == "17"]
        assemblee = [m for m in siens if m.get("typeOrgane") == "ASSEMBLEE"]
        if not assemblee:
            continue
        ident = champ(acteur, "etatCivil", "ident") or {}
        deputes.append({"uid": uid, "civilite": val(ident.get("civ")),
                        "prenom": val(ident.get("prenom")), "nom": val(ident.get("nom")),
                        "nom_tri": val(ident.get("alpha"))})
        for m in assemblee:
            lieu = champ(m, "election", "lieu") or {}
            mandats.append({
                "uid": m["uid"], "depute_uid": uid,
                "debut": jour(champ(m, "mandature", "datePriseFonction") or m["dateDebut"]),
                "fin": jour(val(m.get("dateFin"))),
                "date_election": jour(m["dateDebut"]),
                "departement": val(lieu.get("departement")),
                "num_departement": val(lieu.get("numDepartement")),
                "num_circo": val(lieu.get("numCirco")),
                "circo_uid": champ(m, "election", "refCirconscription"),
                "cause_mandat": champ(m, "election", "causeMandat"),
                "cause_fin": champ(m, "mandature", "causeFin"),
                "place_hemicycle": champ(m, "mandature", "placeHemicycle"),
                "mandat_remplace": champ(m, "mandature", "mandatRemplaceRef"),
            })
        for m in siens:
            if m.get("typeOrgane") == "GP":
                gp.append({"depute_uid": uid,
                           "groupe_uid": liste(champ(m, "organes", "organeRef"))[0],
                           "debut": jour(m["dateDebut"]), "fin": jour(val(m.get("dateFin"))),
                           "qualite": champ(m, "infosQualite", "codeQualite")
                           or champ(m, "infosQualite", "libQualite")})
    return {"depute": deputes, "mandat": mandats, "appartenance": fusionner_appartenances(gp)}


def fusionner_appartenances(gp: list[dict]) -> list[dict]:
    """Une ligne par période d'appartenance à un groupe. Les présidents de groupe ont deux
    mandats GP en cours (membre et président) : on fusionne les périodes qui se recouvrent, et
    la qualité retenue est celle de l'appartenance (membre, apparenté), pas la présidence."""
    par_cle = defaultdict(list)
    for m in gp:
        par_cle[(m["depute_uid"], m["groupe_uid"])].append(m)
    resultat = []
    for periodes in par_cle.values():
        periodes.sort(key=lambda m: m["debut"])
        fusion: list[dict] = []
        for m in periodes:
            if fusion and (fusion[-1]["fin"] is None or m["debut"] <= fusion[-1]["fin"]):
                dernier = fusion[-1]
                if dernier["fin"] is not None and (m["fin"] is None or m["fin"] > dernier["fin"]):
                    dernier["fin"] = m["fin"]
                if str(dernier["qualite"]).startswith("Président"):
                    dernier["qualite"] = m["qualite"]
            else:
                fusion.append(dict(m))
        resultat += fusion
    return resultat


def sigle_affiche(organe: dict) -> str | None:
    sigle = val(organe.get("libelleAbrege")) or val(organe.get("libelleAbrev"))
    return SIGLES_AFFICHES.get(sigle, sigle)


def lire_groupes(chemin: Path) -> list[dict]:
    groupes = []
    for _, doc in documents(chemin, "json/organe/"):
        organe = doc["organe"]
        if organe.get("codeType") == "GP" and val(organe.get("legislature")) == "17":
            groupes.append({
                "uid": organe["uid"], "sigle": sigle_affiche(organe),
                "libelle": organe["libelle"], "debut": jour(champ(organe, "viMoDe", "dateDebut")),
                "fin": jour(champ(organe, "viMoDe", "dateFin")),
                "couleur": val(organe.get("couleurAssociee")),
                "preseance": val(organe.get("preseance")),
                "non_inscrits": organe["uid"] == NON_INSCRITS,
            })
    return groupes


def votants(noeud, rubriques: dict[str, str]):
    for rubrique, position in rubriques.items():
        for votant in liste(champ(noeud, rubrique, "votant")):
            yield position, votant


def lire_scrutins(chemin: Path) -> dict[str, list[dict]]:
    scrutins, listes, mises_au_point, publiees = [], [], [], []
    for _, doc in documents(chemin):
        s = doc["scrutin"]
        uid = s["uid"]
        code = champ(s, "typeVote", "codeTypeVote")
        decompte = champ(s, "syntheseVote", "decompte") or {}
        scrutins.append({
            "uid": uid, "numero": int(s["numero"]), "date": s["dateScrutin"],
            "seance_uid": val(s.get("seanceRef")), "type_vote": code,
            "titre": s["titre"].strip(), "categorie": categorie(s["titre"], code),
            "sort": champ(s, "sort", "code"),
            "votants": int(champ(s, "syntheseVote", "nombreVotants") or 0),
            "exprimes": int(champ(s, "syntheseVote", "suffragesExprimes") or 0),
            "requis": int(champ(s, "syntheseVote", "nbrSuffragesRequis") or 0),
            "pour_publie": int(val(decompte.get("pour")) or 0),
            "contre_publie": int(val(decompte.get("contre")) or 0),
            "abstentions_publiees": int(val(decompte.get("abstentions")) or 0),
            "non_votants_publies": int(val(decompte.get("nonVotants")) or 0)
            + int(val(decompte.get("nonVotantsVolontaires")) or 0),
            "dossier_declare": champ(s, "objet", "dossierLegislatif", "dossierRef"),
        })
        for groupe in liste(champ(s, "ventilationVotes", "organe", "groupes", "groupe")):
            publiees.append({"scrutin_uid": uid, "groupe_uid": groupe["organeRef"],
                             "position_publiee": champ(groupe, "vote", "positionMajoritaire"),
                             "membres_publies": int(groupe.get("nombreMembresGroupe") or 0)})
            for position, v in votants(champ(groupe, "vote", "decompteNominatif"), POSITIONS):
                listes.append({"scrutin_uid": uid, "depute_uid": v["acteurRef"],
                               "position": position,
                               "par_delegation": val(v.get("parDelegation")) == "true",
                               "cause": val(v.get("causePositionVote"))})
        mise = champ(s, "miseAuPoint")
        for noeud in (mise, champ(mise, "dysfonctionnement")):
            for position, v in votants(noeud, POSITIONS_MISE_AU_POINT):
                mises_au_point.append({"scrutin_uid": uid, "depute_uid": v["acteurRef"],
                                       "position": position})
    return {"scrutin": scrutins, "liste": listes, "mise_au_point": mises_au_point,
            "publiee": publiees}


def actes(noeud, parent=None):
    for acte in liste(noeud):
        yield acte, parent
        yield from actes(champ(acte, "actesLegislatifs", "acteLegislatif"), acte["uid"])


def lire_dossiers(chemin: Path) -> dict[str, list[dict]]:
    dossiers, etapes = [], []
    for _, doc in documents(chemin, "json/dossierParlementaire/"):
        d = doc["dossierParlementaire"]
        procedure = champ(d, "procedureParlementaire", "libelle") or ""
        dossiers.append({
            "uid": d["uid"], "titre": champ(d, "titreDossier", "titre"),
            "procedure": procedure, "nature": d.get("@xsi:type"),
            "legislature": val(d.get("legislature")),
            "chemin_an": champ(d, "titreDossier", "titreChemin"),
            "chemin_senat": champ(d, "titreDossier", "senatChemin"),
        })
        for ordre, (acte, parent) in enumerate(actes(champ(d, "actesLegislatifs",
                                                             "acteLegislatif"))):
            etapes.append({
                "uid": acte["uid"], "dossier_uid": d["uid"], "parent_uid": parent,
                "ordre": ordre, "code": acte.get("codeActe"),
                "libelle": champ(acte, "libelleActe", "nomCanonique"),
                "date": jour(val(acte.get("dateActe"))), "organe_uid": val(acte.get("organeRef")),
                "texte_associe": val(acte.get("texteAssocie")),
                "texte_adopte": val(acte.get("texteAdopte")),
                "scrutins": " ".join(liste(champ(acte, "voteRefs", "voteRef"))) or None,
            })
    return {"dossier": dossiers, "etape": etapes}


ETATS_ECARTES = {"Annulé", "Supprimé"}


def lire_votes_prevus(chemin: Path) -> list[dict]:
    """Points « Vote solennel » de l'ordre du jour des séances publiques encore prévues."""
    prevus = []
    for _, doc in documents(chemin):
        r = doc["reunion"]
        if r.get("@xsi:type") != "seance_type" or champ(r, "cycleDeVie", "etat") in ETATS_ECARTES:
            continue
        for point in liste(champ(r, "ODJ", "pointsODJ", "pointODJ")):
            if point.get("typePointODJ") != "Vote solennel":
                continue
            if champ(point, "cycleDeVie", "etat") in ETATS_ECARTES:
                continue
            for dossier in liste(champ(point, "dossiersLegislatifsRefs", "dossierRef")) or [None]:
                prevus.append({"reunion_uid": r["uid"], "point_uid": point["uid"],
                               "debut": r["timeStampDebut"], "date": jour(r["timeStampDebut"]),
                               "objet": val(point.get("objet")), "dossier_uid": dossier,
                               "etat": champ(point, "cycleDeVie", "etat")})
    return prevus


def lire_contenus(dossier: Path) -> list[dict]:
    """Fiches validées pendant la session hebdomadaire (data/fiches/*.json, à partir de t27)."""
    contenus = []
    for chemin in sorted(dossier.glob("*.json")) if dossier.exists() else []:
        fiche = json.loads(chemin.read_text(encoding="utf-8"))
        contenus.append({"dossier_uid": fiche["dossier_uid"], "texte_uid": fiche["texte_uid"],
                         "empreinte_texte": fiche["empreinte_texte"],
                         "valide_le": fiche["valide_le"],
                         "fiche": json.dumps(fiche["fiche"], ensure_ascii=False)})
    return contenus


# --- Chargement dans DuckDB -------------------------------------------------------------------

SCHEMAS = {
    "depute": {"uid": "VARCHAR", "civilite": "VARCHAR", "prenom": "VARCHAR", "nom": "VARCHAR",
               "nom_tri": "VARCHAR"},
    "mandat": {"uid": "VARCHAR", "depute_uid": "VARCHAR", "debut": "DATE", "fin": "DATE",
               "date_election": "DATE", "departement": "VARCHAR", "num_departement": "VARCHAR",
               "num_circo": "VARCHAR", "circo_uid": "VARCHAR", "cause_mandat": "VARCHAR",
               "cause_fin": "VARCHAR", "place_hemicycle": "VARCHAR",
               "mandat_remplace": "VARCHAR"},
    "groupe": {"uid": "VARCHAR", "sigle": "VARCHAR", "libelle": "VARCHAR", "debut": "DATE",
               "fin": "DATE", "couleur": "VARCHAR", "preseance": "VARCHAR",
               "non_inscrits": "BOOLEAN"},
    "appartenance": {"depute_uid": "VARCHAR", "groupe_uid": "VARCHAR", "debut": "DATE",
                     "fin": "DATE", "qualite": "VARCHAR"},
    "scrutin": {"uid": "VARCHAR", "numero": "INTEGER", "date": "DATE", "seance_uid": "VARCHAR",
                "type_vote": "VARCHAR", "titre": "VARCHAR", "categorie": "VARCHAR",
                "sort": "VARCHAR", "votants": "INTEGER", "exprimes": "INTEGER",
                "requis": "INTEGER", "pour_publie": "INTEGER", "contre_publie": "INTEGER",
                "abstentions_publiees": "INTEGER", "non_votants_publies": "INTEGER",
                "dossier_declare": "VARCHAR", "dossier_uid": "VARCHAR",
                "voie_rattachement": "VARCHAR"},
    "liste": {"scrutin_uid": "VARCHAR", "depute_uid": "VARCHAR", "position": "VARCHAR",
              "par_delegation": "BOOLEAN", "cause": "VARCHAR"},
    "mise_au_point": {"scrutin_uid": "VARCHAR", "depute_uid": "VARCHAR", "position": "VARCHAR"},
    "publiee": {"scrutin_uid": "VARCHAR", "groupe_uid": "VARCHAR",
                "position_publiee": "VARCHAR", "membres_publies": "INTEGER"},
    "dossier": {"uid": "VARCHAR", "titre": "VARCHAR", "procedure": "VARCHAR",
                "nature": "VARCHAR", "legislature": "VARCHAR", "chemin_an": "VARCHAR",
                "chemin_senat": "VARCHAR"},
    "etape": {"uid": "VARCHAR", "dossier_uid": "VARCHAR", "parent_uid": "VARCHAR",
              "ordre": "INTEGER", "code": "VARCHAR", "libelle": "VARCHAR", "date": "DATE",
              "organe_uid": "VARCHAR", "texte_associe": "VARCHAR", "texte_adopte": "VARCHAR",
              "scrutins": "VARCHAR"},
    "vote_prevu": {"reunion_uid": "VARCHAR", "point_uid": "VARCHAR", "debut": "TIMESTAMPTZ",
                   "date": "DATE", "objet": "VARCHAR", "dossier_uid": "VARCHAR",
                   "etat": "VARCHAR"},
    "contenu": {"dossier_uid": "VARCHAR", "texte_uid": "VARCHAR", "empreinte_texte": "VARCHAR",
                "valide_le": "DATE", "fiche": "JSON"},
}


def charger(con: duckdb.DuckDBPyConnection, table: str, lignes: list[dict],
            dossier_tmp: Path) -> None:
    """Crée une table depuis des dictionnaires, via un CSV temporaire (bien plus rapide
    qu'une insertion ligne à ligne pour le million de votes listés)."""
    colonnes = SCHEMAS[table]
    chemin = dossier_tmp / f"{table}.csv"
    with chemin.open("w", encoding="utf-8", newline="") as f:
        ecrivain = csv.DictWriter(f, fieldnames=list(colonnes), extrasaction="ignore",
                                  lineterminator="\n")
        ecrivain.writeheader()
        ecrivain.writerows(lignes)
    types = ", ".join(f"'{c}': '{t}'" for c, t in colonnes.items())
    # Dialecte imposé : le détecteur de DuckDB se trompe sur les titres qui contiennent des
    # guillemets doublés (« pour ""lutter contre…"" »).
    con.execute(f"CREATE OR REPLACE TABLE {table} AS SELECT * FROM read_csv(?, header = true, "
                f"delim = ',', quote = '\"', escape = '\"', new_line = '\\n', "
                f"columns = {{{types}}}, nullstr = '')", [str(chemin)])


SQL_VOTE = """
CREATE OR REPLACE TABLE vote AS
WITH en_exercice AS (
    SELECT DISTINCT s.uid AS scrutin_uid, m.depute_uid
    FROM scrutin s JOIN mandat m ON m.debut <= s.date AND (m.fin IS NULL OR s.date <= m.fin)
),
cases AS (
    SELECT coalesce(l.scrutin_uid, e.scrutin_uid) AS scrutin_uid,
           coalesce(l.depute_uid, e.depute_uid) AS depute_uid,
           coalesce(l.position, 'absent') AS position,
           coalesce(l.par_delegation, false) AS par_delegation,
           l.cause,
           e.depute_uid IS NULL AS hors_mandat
    FROM en_exercice e FULL OUTER JOIN liste l USING (scrutin_uid, depute_uid)
)
SELECT c.*, s.date, a.groupe_uid, mp.position AS position_mise_au_point
FROM cases c
JOIN scrutin s ON s.uid = c.scrutin_uid
LEFT JOIN appartenance a ON a.depute_uid = c.depute_uid
    AND a.debut <= s.date AND (a.fin IS NULL OR s.date <= a.fin)
LEFT JOIN (SELECT scrutin_uid, depute_uid, any_value(position) AS position
           FROM mise_au_point GROUP BY ALL) mp
    ON mp.scrutin_uid = c.scrutin_uid AND mp.depute_uid = c.depute_uid
"""

SQL_POSITION_GROUPE = """
CREATE OR REPLACE TABLE position_groupe AS
WITH comptes AS (
    SELECT scrutin_uid, groupe_uid, count(*) AS membres,
           count_if(position = 'pour') AS pour, count_if(position = 'contre') AS contre,
           count_if(position = 'abstention') AS abstentions,
           count_if(position = 'non_votant') AS non_votants,
           count_if(position = 'absent') AS absents
    FROM vote WHERE groupe_uid IS NOT NULL GROUP BY ALL
)
SELECT c.*,
       CASE WHEN c.pour > c.contre AND c.pour > c.abstentions THEN 'pour'
            WHEN c.contre > c.pour AND c.contre > c.abstentions THEN 'contre'
            WHEN c.abstentions > c.pour AND c.abstentions > c.contre THEN 'abstention'
       END AS position,
       p.position_publiee, p.membres_publies
FROM comptes c
LEFT JOIN publiee p USING (scrutin_uid, groupe_uid)
"""

SQL_DISSIDENTS = """
CREATE OR REPLACE TABLE vote AS
SELECT v.*,
       coalesce(v.position IN ('pour', 'contre') AND pg.position IN ('pour', 'contre')
                AND v.position <> pg.position AND NOT g.non_inscrits
                AND s.type_vote <> 'MOC', false) AS dissident
FROM vote v
JOIN scrutin s ON s.uid = v.scrutin_uid
LEFT JOIN position_groupe pg USING (scrutin_uid, groupe_uid)
LEFT JOIN groupe g ON g.uid = v.groupe_uid
"""


def rattacher(scrutins: list[dict], raw: Path) -> None:
    """Dossier de chaque scrutin (pipeline/rattachement.py) ; l'archive des amendements est
    facultative."""
    index, _ = charger_index(archive(raw, "dossiers_legislatifs"), archive(raw, "agenda"),
                             archive(raw, "amendements"))
    for s in scrutins:
        cle = {"uid": s["uid"], "titre": s["titre"], "type_vote": s["type_vote"],
               "date": s["date"], "seance": s["seance_uid"]}
        r = combiner(methode_actes(cle, index), methode_libelle(cle, index),
                     methode_seance(cle, index), s["categorie"])
        s["dossier_uid"], s["voie_rattachement"] = r.dossier, r.voie


def normaliser(raw: Path, base: Path, fiches: Path = FICHES) -> duckdb.DuckDBPyConnection:
    acteurs = lire_acteurs(archive(raw, "historique_mandats"))
    scrutins = lire_scrutins(archive(raw, "scrutins"))
    rattacher(scrutins["scrutin"], raw)
    tables = {
        **acteurs,
        "groupe": lire_groupes(archive(raw, "historique_mandats")),
        **scrutins,
        **lire_dossiers(archive(raw, "dossiers_legislatifs")),
        "vote_prevu": lire_votes_prevus(archive(raw, "agenda")),
        "contenu": lire_contenus(fiches),
    }
    base.parent.mkdir(parents=True, exist_ok=True)
    base.unlink(missing_ok=True)
    con = duckdb.connect(str(base))
    with tempfile.TemporaryDirectory() as tmp:
        for table, lignes in tables.items():
            charger(con, table, lignes, Path(tmp))
    con.execute(SQL_VOTE)
    con.execute(SQL_POSITION_GROUPE)
    con.execute(SQL_DISSIDENTS)
    con.execute("""
        CREATE OR REPLACE TABLE scrutin AS
        SELECT *, type_vote = 'SPS' AS solennel, type_vote = 'MOC' AS motion_censure,
               CASE WHEN sort = 'adopté' THEN pour_publie - requis + 1
                    ELSE requis - pour_publie END AS voix_pour_inverser
        FROM scrutin""")
    # Tables de travail : leur contenu est désormais dans vote et position_groupe.
    for table in ("liste", "mise_au_point", "publiee"):
        con.execute(f"DROP TABLE {table}")
    return con


# --- Contrôles de t12 : partition et totaux -------------------------------------------------


def ecarts_partition_totaux(con: duckdb.DuckDBPyConnection) -> list[dict]:
    """Scrutins qui échouent à la partition (une case par député en exercice) ou aux totaux
    (décompte égal au décompte publié), avec la raison."""
    requete = """
    WITH par_scrutin AS (
        SELECT scrutin_uid, count(*) AS cases, count(DISTINCT depute_uid) AS deputes,
               count_if(hors_mandat) AS hors_mandat,
               count_if(position = 'pour') AS pour, count_if(position = 'contre') AS contre,
               count_if(position = 'abstention') AS abstentions,
               count_if(position = 'non_votant') AS non_votants
        FROM vote GROUP BY ALL
    )
    SELECT s.uid, s.numero, s.type_vote, p.cases, p.deputes, p.hors_mandat,
           p.pour, s.pour_publie, p.contre, s.contre_publie, p.abstentions,
           s.abstentions_publiees, p.non_votants, s.non_votants_publies
    FROM scrutin s JOIN par_scrutin p ON p.scrutin_uid = s.uid
    ORDER BY s.numero
    """
    ecarts = []
    for (uid, numero, type_vote, cases, deputes, hors_mandat, pour, pour_p, contre, contre_p,
         abst, abst_p, nv, nv_p) in con.execute(requete).fetchall():
        raisons = []
        if cases != deputes:
            raisons.append(f"partition : {cases - deputes} député(s) sur deux cases")
        if hors_mandat:
            raisons.append(f"partition : {hors_mandat} votant(s) hors mandat")
        comparaisons = [("pour", pour, pour_p)]
        if type_vote != "MOC":  # seuls les « pour » sont publiés pour une motion de censure
            comparaisons += [("contre", contre, contre_p), ("abstention", abst, abst_p)]
        comparaisons.append(("non-votants", nv, nv_p))
        for nom, nous, publie in comparaisons:
            if nous != publie:
                raisons.append(f"totaux : {nom} {nous} au lieu de {publie}")
        if raisons:
            ecarts.append({"uid": uid, "numero": numero, "raisons": raisons})
    return ecarts


TABLES = ("depute", "mandat", "groupe", "appartenance", "scrutin", "vote", "position_groupe",
          "dossier", "etape", "vote_prevu", "contenu")
MESURE = RACINE / "data" / "mesures" / "normalisation.json"
RAPPORT = RACINE / "docs" / "normalisation.md"


def mesurer(con: duckdb.DuckDBPyConnection) -> dict:
    un = lambda sql: con.execute(sql).fetchone()[0]  # noqa: E731
    paires = lambda sql: [list(r) for r in con.execute(sql).fetchall()]  # noqa: E731
    return {
        "lignes": {t: un(f"SELECT count(*) FROM {t}") for t in TABLES},
        "scrutins": un("SELECT count(*) FROM scrutin"),
        "ecarts_partition_totaux": ecarts_partition_totaux(con),
        "positions": paires("SELECT position, count(*) FROM vote GROUP BY ALL ORDER BY 2 DESC"),
        "cases_sans_groupe": un("SELECT count(*) FROM vote WHERE groupe_uid IS NULL"),
        "dissidents": paires("SELECT count(*), count(DISTINCT depute_uid) FROM vote "
                             "WHERE dissident")[0],
        "mises_au_point": un("SELECT count(*) FROM vote WHERE position_mise_au_point IS NOT NULL"),
        "scrutins_rattaches": un("SELECT count(*) FROM scrutin WHERE dossier_uid IS NOT NULL"),
        "position_groupe_vs_publiee": paires("""
            SELECT CASE WHEN position IS NULL AND pour + contre + abstentions = 0
                        THEN 'aucune voix exprimée'
                        WHEN position IS NULL THEN 'égalité'
                        WHEN position = position_publiee THEN 'accord'
                        ELSE 'désaccord' END AS cas, count(*)
            FROM position_groupe WHERE position_publiee IS NOT NULL
            GROUP BY ALL ORDER BY 2 DESC"""),
        "effectif_vs_publie": paires("""
            SELECT membres - membres_publies AS ecart, count(*) FROM position_groupe
            WHERE membres_publies IS NOT NULL GROUP BY ALL ORDER BY 2 DESC LIMIT 10"""),
        "votes_prevus_a_venir": un("SELECT count(*) FROM vote_prevu WHERE date >= current_date"),
    }


def ecrire_rapport(m: dict, rapport: Path) -> None:
    ecarts = m["ecarts_partition_totaux"]
    passent = m["scrutins"] - len(ecarts)
    lignes = [
        "# Normalisation : les 11 tables",
        "",
        "Généré par `uv run python -m pipeline.normalize` (base `data/site.duckdb`, non "
        "versionnée). Mesures : `data/mesures/normalisation.json`. Règles : docstring de "
        "`pipeline/normalize.py` et docs/decisions.md.",
        "",
        "## Partition et totaux",
        "",
        f"**{passent} scrutins sur {m['scrutins']}** passent la partition (une case par député "
        "en exercice, aucun votant hors mandat) et les totaux (décompte égal au décompte "
        "publié).",
        "",
    ]
    if ecarts:
        lignes += ["| N° | Raison |", "|---|---|"]
        lignes += [f"| {e['numero']} | {' ; '.join(e['raisons'])} |" for e in ecarts]
        lignes.append("")
    lignes += ["## Tables", "", "| Table | Lignes |", "|---|---|"]
    lignes += [f"| `{t}` | {n} |" for t, n in m["lignes"].items()]
    lignes += [
        "",
        "## Contenu",
        "",
        "- Cases par position : " + " · ".join(f"{p} {n}" for p, n in m["positions"]) + ".",
        f"- Cases sans groupe : {m['cases_sans_groupe']}.",
        f"- Votes dissidents : {m['dissidents'][0]}, de {m['dissidents'][1]} députés.",
        f"- Mises au point (gardées à côté du vote officiel) : {m['mises_au_point']}.",
        f"- Scrutins rattachés à un dossier : {m['scrutins_rattaches']} sur {m['scrutins']}.",
        f"- Votes solennels annoncés à venir : {m['votes_prevus_a_venir']}.",
        "",
        "## Comparaison avec la ventilation publiée",
        "",
        "- **Position des groupes.** Elle est calculée à la majorité simple des voix nominatives "
        "(pour, contre, abstention), et vaut « aucune » en cas d'égalité ou si personne n'a voté. "
        "La « position majoritaire » publiée n'est pas fiable : pour le même décompte, elle "
        "contredit parfois la majorité (2 pour et 17 contre publiés « pour », scrutin 3008), et "
        "elle vaut presque toujours « pour » quand personne n'a voté. Répartition : "
        + " · ".join(f"{c} {n}" for c, n in m["position_groupe_vs_publiee"]) + ".",
        "- **Effectifs des groupes** (nos membres − membres publiés, cas les plus fréquents) : "
        + " · ".join(f"{e:+d} : {n}" for e, n in m["effectif_vs_publie"]) + ". "
        "Les écarts viennent de la ventilation publiée. Elle compte un nouveau député avec "
        "quelques jours de retard (entré en fonction le 25 mai 2026 en remplacement d'un député "
        "décédé, absent de l'effectif publié le 26), garde des groupes dissous (votes de "
        "novembre 2025 classés sous un groupe dissous en septembre) et range parfois les votes "
        "sous « PO0 ». Nos effectifs suivent les mandats de député et de groupe.",
    ]
    rapport.write_text("\n".join(lignes) + "\n", encoding="utf-8")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    print("Normalisation", flush=True)
    con = normaliser(RAW, BASE)
    m = mesurer(con)
    con.close()
    for table, n in m["lignes"].items():
        print(f"  {table} : {n} lignes")
    ecarts = m["ecarts_partition_totaux"]
    print(f"Partition et totaux : {m['scrutins'] - len(ecarts)} scrutins sur {m['scrutins']} "
          "passent.")
    for e in ecarts[:20]:
        print(f"  n° {e['numero']} : {' ; '.join(e['raisons'])}")
    MESURE.write_text(json.dumps(m, indent=1, ensure_ascii=False, default=str) + "\n",
                      encoding="utf-8")
    ecrire_rapport(m, RAPPORT)
    print(f"Écrit : {MESURE.relative_to(RACINE)} et {RAPPORT.relative_to(RACINE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
