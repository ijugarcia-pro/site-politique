"""La séance de la semaine (t23) : les 3 votes que le visiteur tranche avant les députés.

Chaque semaine (du lundi au dimanche), le pipeline lit les votes solennels annoncés à l'agenda
(table `vote_prevu`) et en choisit 3 :
  1. le vote sur l'ensemble d'un texte avant le vote d'une partie (budget) ;
  2. le thème le moins représenté dans les séances des 4 semaines précédentes (quand une carte
     validée donne le thème) ;
  3. des groupes d'origine variés (groupe du député qui a déposé le texte) ;
  4. puis l'ordre de l'agenda.
Moins de 3 votes annoncés : la séance est complétée par des votes passés qui divisent (votes à
page, hors quiz, lots et séances précédentes ; écart le plus serré d'abord). Aucune séance
publique dans la semaine : ce sont les vacances parlementaires, il n'y a pas de séance et la
série est gelée.

La sélection est figée au premier passage de la semaine (`data/semaines/{lundi}.json`, commité
par le pipeline) : un vote ajouté à l'agenda en cours de semaine n'entre pas dans la séance, un
vote retiré y reste marqué « retiré », un vote déplacé dans la semaine suit sa nouvelle date.
Les cartes (thème, titre, question, « Concrètement ») viennent de la session hebdomadaire de
Julien (`data/seances/{lundi}.json`, t27) ; sans carte, la séance montre l'objet officiel.

Usage :
    uv run python -m pipeline.semaine [--jour AAAA-MM-JJ]
Produit `export/site/semaine.json`.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from datetime import date, timedelta
from pathlib import Path

import duckdb

from pipeline.an import champ, documents, liste
from pipeline.normalize import ETATS_ECARTES, archive

RACINE = Path(__file__).resolve().parent.parent
BASE = RACINE / "data" / "site.duckdb"
RAW = RACINE / "data" / "raw"
SEMAINES = RACINE / "data" / "semaines"
SEANCES = RACINE / "data" / "seances"
EXPORT = RACINE / "export" / "site" / "semaine.json"
VOTES = 3
SEMAINES_THEMES = 4
SEUIL_TITRE = 0.6
PARTICIPATION_MINIMALE = 20
CATEGORIES_PASSES = ("ensemble", "résolution")


def lundi_de(jour: date) -> date:
    return jour - timedelta(days=jour.weekday())


# --- Rattacher un point de l'agenda à son dossier ----------------------------------------------

_VIDES = set("le la les de des du d l a au aux et en sur pour par un une visant relatif relative "
             "relatifs portant loi projet proposition organique constitutionnelle adopte adoptee "
             "senat vote solennel ensemble partie premiere seconde lecture nos notre".split())


def mots(texte: str) -> set[str]:
    t = unicodedata.normalize("NFKD", texte.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return {m for m in re.findall(r"[a-z0-9]+", t) if m not in _VIDES and len(m) > 2}


def rattacher(objet: str, dossiers: list[tuple[str, str]]) -> str | None:
    """Le dossier dont le titre ressemble le plus à l'objet du point (indice de Jaccard sur les
    mots utiles), s'il dépasse SEUIL_TITRE et devance nettement le suivant ; sinon None."""
    m = mots(objet)
    scores = sorted(((len(m & mots(t)) / len(m | mots(t)) if m | mots(t) else 0, u)
                     for u, t in dossiers if t), reverse=True)
    if not scores or scores[0][0] < SEUIL_TITRE:
        return None
    if len(scores) > 1 and scores[0][0] - scores[1][0] < 0.15:
        return None
    return scores[0][1]


def nature(objet: str) -> str:
    """« partie » pour le vote d'une partie d'un budget, sinon « ensemble »."""
    return "partie" if re.search(r"\bpartie\b", objet.lower()) else "ensemble"


# --- Lire l'agenda ---------------------------------------------------------------------------

def jours_de_seance(agenda: Path) -> set[date]:
    """Les jours où une séance publique est inscrite à l'agenda (ni annulée ni supprimée)."""
    jours = set()
    for _, doc in documents(agenda):
        r = doc["reunion"]
        if (r.get("@xsi:type") == "seance_type"
                and champ(r, "cycleDeVie", "etat") not in ETATS_ECARTES):
            jours.add(date.fromisoformat(r["timeStampDebut"][:10]))
    return jours


def auteurs(dossiers_zip: Path, uids: set[str]) -> dict[str, str]:
    """Le député qui a déposé chacun de ces dossiers (premier initiateur), s'il y en a un."""
    resultat = {}
    for nom, doc in documents(dossiers_zip, "json/dossierParlementaire/"):
        uid = nom.rsplit("/", 1)[-1].removesuffix(".json")
        if uid not in uids:
            continue
        acteurs = liste(champ(doc, "dossierParlementaire", "initiateur", "acteurs", "acteur"))
        if acteurs and acteurs[0].get("acteurRef"):
            resultat[uid] = acteurs[0]["acteurRef"]
    return resultat


def groupe_a(con: duckdb.DuckDBPyConnection, depute: str, jour: date) -> str | None:
    ligne = con.execute(
        "SELECT g.sigle FROM appartenance a JOIN groupe g ON g.uid = a.groupe_uid "
        "WHERE a.depute_uid = ? AND a.debut <= ? AND (a.fin IS NULL OR a.fin >= ?) "
        "ORDER BY a.debut DESC LIMIT 1", [depute, jour, jour]).fetchone()
    return ligne[0] if ligne else None


def annonces(con: duckdb.DuckDBPyConnection, lundi: date) -> list[dict]:
    """Les votes solennels annoncés du lundi au dimanche, un par point de l'ordre du jour, avec
    leur dossier (celui de l'agenda, sinon retrouvé par le titre)."""
    dimanche = lundi + timedelta(days=6)
    lignes = con.execute(
        "SELECT point_uid, CAST(debut AS VARCHAR), date, objet, dossier_uid FROM vote_prevu "
        "WHERE date BETWEEN ? AND ? ORDER BY debut, point_uid", [lundi, dimanche]).fetchall()
    dossiers = con.execute("SELECT uid, titre FROM dossier").fetchall()
    titres = dict(dossiers)
    points: dict[str, dict] = {}
    for point, debut, jour, objet, dossier in lignes:
        p = points.setdefault(point, {"cle": point, "type": "annonce", "date": jour.isoformat(),
                                      "debut": debut, "objet": objet, "nature": nature(objet),
                                      "dossier_uid": None})
        p["dossier_uid"] = p["dossier_uid"] or dossier
    for p in points.values():
        p["dossier_uid"] = p["dossier_uid"] or rattacher(p["objet"], dossiers)
        p["dossier"] = titres.get(p["dossier_uid"])
    return list(points.values())


# --- Choisir ---------------------------------------------------------------------------------

def choisir(candidats: list[dict], themes_recents: dict[str, int], n: int = VOTES) -> list[dict]:
    """Les n votes annoncés retenus, dans l'ordre des règles (docstring du module). Chaque
    candidat porte `nature`, `theme` (ou None), `groupe` (ou None) et sa place dans l'agenda."""
    restants = list(candidats)
    choisis: list[dict] = []
    while restants and len(choisis) < n:
        groupes = {c.get("groupe") for c in choisis} - {None}
        meilleur = min(restants, key=lambda c, g=groupes: (
            c["nature"] != "ensemble", themes_recents.get(c.get("theme") or "", 0),
            c.get("groupe") in g, restants.index(c)))
        choisis.append(meilleur)
        restants.remove(meilleur)
    return choisis


# Budgets et textes « fourre-tout » : jamais proposés en complément (critère du quiz et des lots).
_FOURRE_TOUT = re.compile(r"finances|financement de la sécurité sociale|fin de gestion|"
                          r"loi spéciale|simplification", re.IGNORECASE)


def passes_qui_divisent(con: duckdb.DuckDBPyConnection, exclus: set[str], n: int,
                        reserve: list[int] = ()) -> list[dict]:
    """Des votes passés pour compléter. D'abord la réserve (cartes rédigées et contrôlées en
    t42, non retenues pour les lots : `data/reserve.json`), puis les votes solennels ou sur
    l'ensemble d'un texte ou une résolution. Jamais une motion de censure, un budget, un vote
    ou un dossier déjà proposé ; participation suffisante. Dans chaque groupe, l'écart pour /
    contre le plus serré d'abord, puis le plus récent."""
    lignes = con.execute("""
        SELECT s.uid, s.numero, s.date, s.titre, s.dossier_uid, d.titre,
               s.pour_publie, s.contre_publie, s.abstentions_publiees,
               (SELECT count(*) FROM vote v WHERE v.scrutin_uid = s.uid) AS sieges
        FROM scrutin s LEFT JOIN dossier d ON d.uid = s.dossier_uid
        WHERE NOT s.motion_censure AND (s.solennel OR list_contains(?, s.categorie))
        """, [list(CATEGORIES_PASSES)]).fetchall()
    dossiers_pris = {d for d, in con.execute(
        "SELECT DISTINCT dossier_uid FROM scrutin WHERE list_contains(?, uid)",
        [sorted(exclus)]).fetchall() if d}
    candidats = []
    for uid, numero, jour, titre, dossier, dossier_titre, pour, contre, abst, sieges in lignes:
        if uid in exclus or dossier in dossiers_pris or not sieges or pour + contre == 0:
            continue
        if _FOURRE_TOUT.search(f"{titre} {dossier_titre or ''}"):
            continue
        if 100 * (pour + contre + abst) / sieges < PARTICIPATION_MINIMALE:
            continue
        candidats.append(((numero not in reserve, abs(pour - contre) / (pour + contre), -numero),
                          {"cle": f"scrutin:{uid}", "type": "passe", "scrutin_uid": uid,
                           "numero": numero, "date": jour.isoformat(), "objet": titre,
                           "dossier_uid": dossier, "dossier": dossier_titre,
                           "reserve": numero in reserve}))
    choisis: list[dict] = []
    for _, c in sorted(candidats, key=lambda x: x[0]):
        if len(choisis) == n:
            break
        if c["dossier_uid"] and any(c["dossier_uid"] == x["dossier_uid"] for x in choisis):
            continue
        choisis.append(c)
    return choisis


def reserve(racine: Path = RACINE) -> list[int]:
    chemin = racine / "data" / "reserve.json"
    return [c["numero"] for c in json.loads(chemin.read_text("utf-8"))] if chemin.exists() else []


def deja_proposes(semaines: Path, racine: Path = RACINE) -> set[str]:
    """Les scrutins déjà proposés : quiz, lots, votes passés des séances précédentes."""
    uids = {q["uid"] for q in json.loads((racine / "data" / "quiz.json").read_text("utf-8"))}
    lots = racine / "data" / "lots.json"
    if lots.exists():
        uids |= {c["uid"] for lot in json.loads(lots.read_text("utf-8")) for c in lot["cartes"]}
    for chemin in sorted(semaines.glob("*.json")) if semaines.exists() else []:
        uids |= {v["scrutin_uid"] for v in json.loads(chemin.read_text("utf-8"))["votes"]
                 if v.get("scrutin_uid")}
    return uids


def cartes_seance(seances: Path, lundi: date) -> dict[str, dict]:
    """Les cartes validées par Julien pour la séance de ce lundi (t27), par clé de vote."""
    chemin = seances / f"{lundi.isoformat()}.json"
    return json.loads(chemin.read_text("utf-8"))["cartes"] if chemin.exists() else {}


def themes_recents(seances: Path, lundi: date) -> dict[str, int]:
    compte: dict[str, int] = {}
    for k in range(1, SEMAINES_THEMES + 1):
        for carte in cartes_seance(seances, lundi - timedelta(weeks=k)).values():
            compte[carte["theme"]] = compte.get(carte["theme"], 0) + 1
    return compte


def selectionner(con: duckdb.DuckDBPyConnection, lundi: date, jours_seance: set[date],
                 auteurs_dossiers: dict[str, str], exclus: set[str],
                 cartes: dict[str, dict], recents: dict[str, int]) -> dict:
    """La séance d'une semaine qui n'en a pas encore : vacances, ou 3 votes."""
    semaine = {lundi + timedelta(days=k) for k in range(7)}
    if not semaine & jours_seance:
        return {"lundi": lundi.isoformat(), "vacances": True, "votes": []}
    candidats = annonces(con, lundi)
    for c in candidats:
        c["theme"] = (cartes.get(c["cle"]) or {}).get("theme")
        auteur = auteurs_dossiers.get(c["dossier_uid"] or "")
        c["groupe"] = groupe_a(con, auteur, date.fromisoformat(c["date"])) if auteur else None
    votes = choisir(candidats, recents)
    votes += passes_qui_divisent(con, exclus, VOTES - len(votes), reserve())
    for v in votes:
        v.pop("theme", None)
    return {"lundi": lundi.isoformat(), "vacances": False, "votes": votes}


def mettre_a_jour(selection: dict, con: duckdb.DuckDBPyConnection) -> dict:
    """La séance figée, revue au fil de la semaine : un vote annoncé retiré de l'agenda est
    marqué « retiré » ; déplacé dans la semaine, il suit sa nouvelle date ; rien n'est ajouté."""
    if selection["vacances"]:
        return selection
    lundi = date.fromisoformat(selection["lundi"])
    actuels = {a["cle"]: a for a in annonces(con, lundi)}
    for v in selection["votes"]:
        if v["type"] != "annonce":
            continue
        a = actuels.get(v["cle"])
        if a is None:
            v["retire"] = True
        else:
            v.pop("retire", None)
            v["date"], v["debut"] = a["date"], a["debut"]
    return selection


def scrutin_du_vote(con: duckdb.DuckDBPyConnection, v: dict) -> tuple[str, int] | None:
    """Le scrutin qui a tranché un vote annoncé : solennel, le jour prévu, sur le même dossier."""
    if v["type"] == "passe":
        return v["scrutin_uid"], v["numero"]
    if not v.get("dossier_uid"):
        return None
    ligne = con.execute(
        "SELECT uid, numero FROM scrutin WHERE solennel AND date = ? AND dossier_uid = ? "
        "ORDER BY numero DESC LIMIT 1", [v["date"], v["dossier_uid"]]).fetchone()
    return (ligne[0], ligne[1]) if ligne else None


def exporter(selection: dict, con: duckdb.DuckDBPyConnection, cartes: dict[str, dict]) -> dict:
    """Ce que lit le site : chaque vote avec sa carte (ou rien), son statut et son scrutin."""
    votes = []
    for v in selection["votes"]:
        tranche = scrutin_du_vote(con, v)
        statut = "retiré" if v.get("retire") else "voté" if tranche else "à venir"
        votes.append({**{k: v.get(k) for k in ("cle", "type", "date", "debut", "objet", "nature",
                                               "dossier_uid", "dossier")},
                      "statut": statut, "carte": cartes.get(v["cle"]),
                      "scrutin": {"uid": tranche[0], "numero": tranche[1]} if tranche else None})
    return {"lundi": selection["lundi"], "vacances": selection["vacances"], "votes": votes}


def semaine(con: duckdb.DuckDBPyConnection, jour: date, raw: Path = RAW,
            semaines: Path = SEMAINES, seances: Path = SEANCES) -> dict:
    """La séance de la semaine de `jour` : choisie au premier passage, puis revue."""
    lundi = lundi_de(jour)
    chemin = semaines / f"{lundi.isoformat()}.json"
    cartes = cartes_seance(seances, lundi)
    if chemin.exists():
        selection = mettre_a_jour(json.loads(chemin.read_text("utf-8")), con)
    else:
        jours = jours_de_seance(archive(raw, "agenda"))
        uids = {a["dossier_uid"] for a in annonces(con, lundi) if a["dossier_uid"]}
        selection = selectionner(con, lundi, jours, auteurs(archive(raw, "dossiers_legislatifs"),
                                                             uids),
                                 deja_proposes(semaines), cartes, themes_recents(seances, lundi))
    semaines.mkdir(parents=True, exist_ok=True)
    chemin.write_text(json.dumps(selection, ensure_ascii=False, indent=1) + "\n", "utf-8")
    return exporter(selection, con, cartes)


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    args.add_argument("--jour", type=date.fromisoformat, default=date.today())
    options = args.parse_args(argv)
    con = duckdb.connect(str(BASE), read_only=True)
    try:
        resultat = semaine(con, options.jour)
    finally:
        con.close()
    EXPORT.parent.mkdir(parents=True, exist_ok=True)
    EXPORT.write_text(json.dumps(resultat, ensure_ascii=False, separators=(",", ":")), "utf-8")
    if resultat["vacances"]:
        print(f"Semaine du {resultat['lundi']} : vacances parlementaires, pas de séance.")
    for v in resultat["votes"]:
        print(f"Semaine du {resultat['lundi']} : {v['statut']} · {v['type']} · {v['date']} · "
              f"{(v['dossier'] or v['objet'])[:80]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
