"""Prépare la vérification à la main de 5 scrutins contre le site de l'Assemblée (tâche t15).

Usage :
    uv run python -m scripts.preparer_verification_scrutins

Tire 5 scrutins variés (graine fixe) dans data/site.duckdb : un scrutin solennel, un
amendement, un scrutin avec mise au point, un scrutin récent et un scrutin de 2024. Pour
chacun : le lien officiel, le décompte attendu et 5 députés dont le vote est à contrôler (un
pour, un contre, une abstention ou un non-votant, un absent, un dissident quand il y en a).

Produit : docs/verification-scrutins.md (grille à cocher par Julien)
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

import duckdb

RACINE = Path(__file__).resolve().parent.parent
BASE = RACINE / "data" / "site.duckdb"
SORTIE = RACINE / "docs" / "verification-scrutins.md"
GRAINE = 15
LIEN = "https://www.assemblee-nationale.fr/dyn/17/scrutins/{numero}"
LIBELLES = {"pour": "Pour", "contre": "Contre", "abstention": "Abstention",
            "non_votant": "Non-votant", "absent": "Absent"}

FAMILLES = [
    ("scrutin solennel", "type_vote = 'SPS'"),
    ("amendement", "type_vote = 'SPO' AND categorie = 'amendement'"),
    ("avec mise au point", "uid IN (SELECT scrutin_uid FROM vote "
                           "WHERE position_mise_au_point IS NOT NULL)"),
    ("récent", "date >= (SELECT max(date) FROM scrutin) - INTERVAL 30 DAY"),
    ("2024", "year(date) = 2024 AND type_vote <> 'MOC'"),
]


def tirer(con: duckdb.DuckDBPyConnection, hasard: random.Random) -> list[tuple[str, str]]:
    choisis: list[tuple[str, str]] = []
    for nom, condition in FAMILLES:
        candidats = [uid for (uid,) in con.execute(
            f"SELECT uid FROM scrutin WHERE {condition} AND type_vote <> 'MOC' ORDER BY uid"
        ).fetchall() if uid not in {u for _, u in choisis}]
        choisis.append((nom, hasard.choice(candidats)))
    return choisis


def votes_a_controler(con, uid: str, hasard: random.Random) -> list[tuple]:
    cases = con.execute("""
        SELECT d.prenom || ' ' || d.nom, g.sigle, v.position, v.dissident,
               v.position_mise_au_point
        FROM vote v JOIN depute d ON d.uid = v.depute_uid
        LEFT JOIN groupe g ON g.uid = v.groupe_uid
        WHERE v.scrutin_uid = ? ORDER BY d.nom_tri, d.prenom""", [uid]).fetchall()
    choix: list[tuple] = []

    def prendre(filtre):
        restants = [c for c in cases if filtre(c) and c not in choix]
        if restants:
            choix.append(hasard.choice(restants))

    # Une case de chaque sorte, puis un dissident ou une mise au point s'il y en a.
    for position in ("pour", "contre"):
        prendre(lambda c, p=position: c[2] == p)
    prendre(lambda c: c[2] in ("abstention", "non_votant"))
    prendre(lambda c: c[2] == "absent")
    prendre(lambda c: c[3] or c[4] is not None)
    while len(choix) < 5:
        prendre(lambda c: True)
    return choix[:5]


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    con = duckdb.connect(str(BASE), read_only=True)
    hasard = random.Random(GRAINE)
    lignes = [
        "# Vérification de 5 scrutins (t15)",
        "",
        "Généré par `uv run python -m scripts.preparer_verification_scrutins` à partir de "
        "`data/site.duckdb`. **Porte ◆** : s'il y a un écart, on revient à t12 et on ne passe "
        "pas à la phase 2.",
        "",
        "Pour chaque scrutin, ouvrir le lien officiel, puis :",
        "1. comparer le **décompte** (pour, contre, abstentions, non-votants) ;",
        "2. pour chaque député, chercher son nom sur la page (Ctrl+F) et vérifier sa "
        "**position**. « Absent » veut dire que son nom n'apparaît dans aucune liste ;",
        "3. cocher `[x]` si c'est conforme, sinon noter l'écart dans « Remarques ».",
        "",
        "Les groupes indiqués sont ceux de la date du vote. Les sigles de la page officielle "
        "peuvent différer (groupes renommés ou dissous depuis).",
        "",
    ]
    for i, (famille, uid) in enumerate(tirer(con, hasard), 1):
        numero, date, titre, sort, pour, contre, abst, nv = con.execute(
            "SELECT numero, date, titre, sort, pour_publie, contre_publie, "
            "abstentions_publiees, non_votants_publies FROM scrutin WHERE uid = ?",
            [uid]).fetchone()
        lignes += [
            f"## {i}. Scrutin n° {numero} ({famille})",
            "",
            f"Vote du {date:%d/%m/%Y}, {sort} : {titre}",
            "",
            f"Page officielle : <{LIEN.format(numero=numero)}>",
            "",
            f"- [ ] Décompte : **{pour} pour, {contre} contre, {abst} abstentions, {nv} "
            "non-votants**",
            "",
            "| Vérifié | Député | Groupe | Position attendue |",
            "|---|---|---|---|",
        ]
        for nom, sigle, position, dissident, mise in votes_a_controler(con, uid, hasard):
            precisions = []
            if dissident:
                precisions.append("dissident")
            if mise:
                precisions.append(f"mise au point : {LIBELLES[mise].lower()}")
            suffixe = f" ({', '.join(precisions)})" if precisions else ""
            lignes.append(f"| [ ] | {nom} | {sigle or '—'} | {LIBELLES[position]}{suffixe} |")
        lignes += ["", "Remarques :", ""]
    lignes += ["## Conclusion", "", "- [ ] Les 5 scrutins sont conformes : on peut passer à la "
               "phase 2.", "- Écarts constatés :", ""]
    con.close()
    SORTIE.write_text("\n".join(lignes), encoding="utf-8")
    print(f"Écrit : {SORTIE.relative_to(RACINE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
