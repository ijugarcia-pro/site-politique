"""Rapport de l'essai de vulgarisation sur 5 textes (tâche t07, 7 octobre 2026).

Usage :
    uv run python -m scripts.essai_vulgarisation

L'essai a été fait une seule fois, avec l'API Anthropic depuis GitHub Actions (1,02 $). Le
7 octobre 2026, le projet est passé à zéro euro : plus aucun appel payant. Les fiches sont
désormais rédigées dans une session Claude Code hebdomadaire (voir docs/decisions.md). Ce script
ne fait plus que régénérer le rapport à partir des résultats enregistrés.

Lit :     data/mesures/vulgarisation/essai.json  (sorties brutes, contrôles, jetons, coût)
Produit : docs/vulgarisation-essai.md  (sections Constats et Relecture conservées)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from pipeline.vulgarisation import URL_DOCUMENT

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "mesures" / "vulgarisation" / "essai.json"
RAPPORT = RACINE / "docs" / "vulgarisation-essai.md"
DEBUT_RELECTURE = "<!-- relecture:debut -->"
FIN_RELECTURE = "<!-- relecture:fin -->"
DEBUT_CONSTATS = "<!-- constats:debut -->"
FIN_CONSTATS = "<!-- constats:fin -->"


def cout_total(resultat: dict) -> float:
    return sum(e["redaction"]["cout"] + (e["relecture"]["cout"] if e["relecture"] else 0)
               for e in resultat["essais"])


def jetons(resultat: dict, cle: str) -> int:
    return sum(e["redaction"][cle] + (e["relecture"][cle] if e["relecture"] else 0)
               for e in resultat["essais"])


# --- Rapport ----------------------------------------------------------------------------------


def lien(uid: str) -> str:
    return URL_DOCUMENT.format(uid=uid)


def grille(resultats: list[dict]) -> str:
    lignes = [
        DEBUT_RELECTURE,
        "## Relecture de Julien (t08)",
        "",
        "Pour chaque fiche, cocher (remplacer `[ ]` par `[x]`) ce qui est vrai, et noter toute "
        "remarque en dessous. Ouvrir le texte voté (lien sous chaque fiche) pour vérifier les "
        "articles cités.",
        "",
    ]
    for r in resultats:
        c = r["choix"]
        lignes += [
            f"**Scrutin {c['numero']} · {c['theme']}**",
            "- [ ] Juste : chaque carte dit bien ce que prévoit l'article cité",
            "- [ ] Neutre : rien ne pousse à voter pour ou contre",
            "- [ ] Compréhensible par quelqu'un qui ne suit pas la politique",
            "- Remarques :",
            "",
        ]
    lignes += ["**Remarques générales** :", "", FIN_RELECTURE]
    return "\n".join(lignes)


def section_fiche(r: dict) -> list[str]:
    c = r["choix"]
    lignes = [
        f"### Scrutin {c['numero']} · {c['theme']}",
        "",
        f"Vote du {c['date']} sur {c['titre']}. Texte voté : [{c['texte_vote']}]"
        f"({lien(c['texte_vote'])}) ({r['nb_articles']} articles) · exposé des motifs : "
        f"[{c['texte_depose']}]({lien(c['texte_depose'])}).",
        "",
        f"**Résultat : {r['statut']}** · {len(r['essais'])} tentative(s) · "
        f"{jetons(r, 'jetons_entree')} jetons en entrée, {jetons(r, 'jetons_sortie')} en "
        f"sortie · {cout_total(r):.3f} $",
        "",
    ]
    fiche = r["fiche"] or r["essais"][-1]["fiche"]
    if fiche:
        if r["fiche"] is None:
            lignes += ["_Fiche non publiée (repli). Dernière version, pour information :_", ""]
        lignes += [f"> **{fiche['question']}**", ">", f"> **Concrètement** : "
                   f"{fiche['concretement']}", ""]
        for i, carte in enumerate(fiche["cartes"], 1):
            lignes += [f"{i}. **{carte['titre']}** — {carte['texte']}",
                       f"   *{carte['article']}* : « {carte['extrait']} »"]
        lignes.append("")
    lignes += ["| Tentative | " + " | ".join(f"{n}" for n in range(1, 8)) + " |",
               "|---|" + "---|" * 7]
    for essai in r["essais"]:
        par_numero = {ctl["numero"]: ctl for ctl in essai["controles"]}
        cellules = []
        for n in range(1, 8):
            ctl = par_numero.get(n)
            cellules.append("—" if ctl is None else ("ok" if ctl["reussi"] else "échec"))
        lignes.append(f"| {essai['tentative']} | " + " | ".join(cellules) + " |")
    erreurs = [(essai["tentative"], e) for essai in r["essais"] for ctl in essai["controles"]
               for e in ctl["erreurs"]]
    if erreurs:
        lignes += ["", "Erreurs relevées :"]
        lignes += [f"- tentative {t} : {e}" for t, e in erreurs]
    lignes.append("")
    return lignes


def conserve(ancien: str, debut: str, fin: str, defaut: str) -> str:
    """Section écrite à la main, reprise telle quelle d'une génération à l'autre."""
    if debut in ancien and fin in ancien:
        return ancien[ancien.index(debut): ancien.index(fin) + len(fin)]
    return defaut


def ecrire_rapport(donnees: dict) -> None:
    resultats = donnees["resultats"]
    ancien = RAPPORT.read_text(encoding="utf-8") if RAPPORT.exists() else ""
    relecture = conserve(ancien, DEBUT_RELECTURE, FIN_RELECTURE, grille(resultats))
    constats = conserve(ancien, DEBUT_CONSTATS, FIN_CONSTATS,
                        f"{DEBUT_CONSTATS}\n_À rédiger après lecture des résultats._\n"
                        f"{FIN_CONSTATS}")
    publiees = sum(1 for r in resultats if r["fiche"])
    total = sum(cout_total(r) for r in resultats)
    moyen = total / len(resultats) if resultats else 0
    lignes = [
        "# Essai de vulgarisation sur 5 textes",
        "",
        f"Généré le {donnees['genere_le']} par `uv run python -m scripts.essai_vulgarisation` "
        f"(modèle `{donnees['modele']}`, effort `{donnees['effort']}`). Sorties brutes : "
        "`data/mesures/vulgarisation/essai.json`. Contrôles : `docs/vulgarisation-controles.md`. "
        "Tout est régénéré, sauf les sections « Constats » et « Relecture ».",
        "",
        "Fiches **générées automatiquement à partir du texte officiel**, à relire avant toute "
        "publication.",
        "",
        "## Constats",
        "",
        constats,
        "",
        relecture,
        "",
        "## Synthèse",
        "",
        f"- Fiches publiables (7 contrôles passés) : **{publiees} sur {len(resultats)}**.",
        f"- Coût de l'essai : **{total:.2f} $** au tarif public de `{donnees['modele']}`, soit "
        f"{moyen:.3f} $ par texte en moyenne, nouvelles tentatives et relecture comprises.",
        "- Essai unique : depuis le 7 octobre 2026, le projet ne fait plus aucun appel payant "
        "(voir docs/decisions.md).",
        "",
        "| Scrutin | Thème | Statut | Tentatives | Jetons entrée | Jetons sortie | Coût |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in resultats:
        c = r["choix"]
        lignes.append(f"| {c['numero']} | {c['theme']} | {r['statut']} | {len(r['essais'])} | "
                      f"{jetons(r, 'jetons_entree')} | {jetons(r, 'jetons_sortie')} | "
                      f"{cout_total(r):.3f} $ |")
    lignes += ["", "## Les fiches", ""]
    for r in resultats:
        lignes += section_fiche(r)
    RAPPORT.write_text("\n".join(lignes).rstrip() + "\n", encoding="utf-8")


# --- Programme --------------------------------------------------------------------------------


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ecrire_rapport(json.loads(SORTIE.read_text(encoding="utf-8")))
    print(f"Écrit : {RAPPORT.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
