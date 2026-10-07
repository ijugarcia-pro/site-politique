"""Prototype de vulgarisation sur 5 textes votés en scrutin solennel (tâche t07).

Usage :
    uv run python -m scripts.essai_vulgarisation               # appelle l'API (payant)
    uv run python -m scripts.essai_vulgarisation --hors-ligne  # régénère le rapport seul

Pour chaque texte : télécharge le texte voté et le texte déposé (pour l'exposé des motifs) sur
assemblee-nationale.fr, demande une fiche à l'API Anthropic, la passe aux 7 contrôles de
docs/vulgarisation-controles.md (le 7e par une relecture automatique séparée), retente une fois
en cas d'échec avec la liste des erreurs, puis replie (vote sans cartes) si l'échec persiste.
La clé est lue dans ANTHROPIC_API_KEY (secret GitHub, jamais dans le dépôt). L'essai s'arrête
dès que le coût cumulé dépasse le plafond (--plafond, en dollars).

Produit :
    data/mesures/vulgarisation/essai.json  sorties brutes, contrôles, jetons et coût
    docs/vulgarisation-essai.md            rapport (la grille de relecture de t08 est conservée)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx

from pipeline.vulgarisation import (
    CONSIGNES,
    CONSIGNES_RELECTURE,
    SCHEMA_FICHE,
    SCHEMA_RELECTURE,
    URL_DOCUMENT,
    articles,
    controle_relecture,
    controles_locaux,
    cout,
    expose_des_motifs,
    message_redaction,
    message_relecture,
    texte_du_html,
)

RACINE = Path(__file__).resolve().parent.parent
CACHE = RACINE / "data" / "raw" / "textes"
SORTIE = RACINE / "data" / "mesures" / "vulgarisation" / "essai.json"
RAPPORT = RACINE / "docs" / "vulgarisation-essai.md"
DEBUT_RELECTURE = "<!-- relecture:debut -->"
FIN_RELECTURE = "<!-- relecture:fin -->"
DEBUT_CONSTATS = "<!-- constats:debut -->"
FIN_CONSTATS = "<!-- constats:fin -->"

MODELE = "claude-opus-5-5"
EFFORT = "high"
MAX_TOKENS = 16000
BETA_REPLI = "server-side-fallback-2026-07-01"
TENTATIVES = 2

# Cinq textes récents, votés en scrutin solennel, de thèmes variés. Le texte voté est le dernier
# texte de l'Assemblée déposé avant le scrutin pour cette lecture : texte de la commission (BTC),
# texte de la commission mixte paritaire, ou texte déposé quand la commission n'en a pas établi.
# L'exposé des motifs vient du texte déposé en premier.
SELECTION = [
    {"scrutin": "VTANR5L17V7454", "numero": 7454, "date": "2026-06-23", "theme": "institutions",
     "titre": "l'ensemble du projet de loi constitutionnelle pour une Corse autonome au sein de "
              "la République (première lecture)",
     "dossier": "DLR5L17N54218", "texte_vote": "PRJLANR5L17B2697",
     "texte_depose": "PRJLANR5L17B2697"},
    {"scrutin": "VTANR5L17V7987", "numero": 7987, "date": "2026-07-07", "theme": "sécurité",
     "titre": "l'ensemble de la proposition de loi visant à reconnaître une présomption de "
              "légitime défense pour les forces de l'ordre, dans l'exercice de leurs fonctions "
              "(première lecture)",
     "dossier": "DLR5L17N51037", "texte_vote": "PIONANR5L17B0691",
     "texte_depose": "PIONANR5L17B0691"},
    {"scrutin": "VTANR5L17V7409", "numero": 7409, "date": "2026-06-17", "theme": "énergie",
     "titre": "l'ensemble de la proposition de loi visant à relancer les investissements dans le "
              "secteur de l'hydroélectricité pour contribuer à la transition énergétique (texte "
              "de la commission mixte paritaire)",
     "dossier": "DLR5L17N53530", "texte_vote": "PIONANR5L17BTC2856",
     "texte_depose": "PIONANR5L17B2334"},
    {"scrutin": "VTANR5L17V8431", "numero": 8431, "date": "2026-07-21", "theme": "numérique",
     "titre": "l'ensemble de la proposition de loi visant à protéger les mineurs des risques "
              "auxquels les expose l'utilisation des réseaux sociaux (texte de la commission "
              "mixte paritaire)",
     "dossier": "DLR5L17N53187", "texte_vote": "PIONANR5L17BTC3069",
     "texte_depose": "PIONANR5L17B2107"},
    {"scrutin": "VTANR5L17V8419", "numero": 8419, "date": "2026-07-20", "theme": "santé",
     "titre": "l'ensemble de la proposition de loi visant à doter la France d'une stratégie "
              "nationale de lutte contre les maladies cardio-neuro-vasculaires (texte de la "
              "commission mixte paritaire)",
     "dossier": "DLR5L17N53426", "texte_vote": "PIONANR5L17BTC2995",
     "texte_depose": "PIONANR5L17B2309"},
]

# Pour la projection : 239 scrutins sur un texte entier (ensemble, partie, résolution) en
# 24 mois de 17e législature, dont 67 solennels (docs/rattachement.md).
TEXTES_PAR_MOIS = 239 / 24
SOLENNELS_PAR_MOIS = 67 / 24


# --- Textes -----------------------------------------------------------------------------------


def document(client: httpx.Client, uid: str) -> str:
    """Texte brut d'un document de l'Assemblée, mis en cache dans data/raw/textes/."""
    CACHE.mkdir(parents=True, exist_ok=True)
    chemin = CACHE / f"{uid}.html"
    if not chemin.exists():
        for tentative in range(3):
            try:
                reponse = client.get(URL_DOCUMENT.format(uid=uid))
                reponse.raise_for_status()
                break
            except httpx.HTTPError:
                if tentative == 2:
                    raise
                time.sleep(10)
        chemin.write_bytes(reponse.content)
    return texte_du_html(chemin.read_text(encoding="utf-8"))


# --- API --------------------------------------------------------------------------------------


def appeler(api, consignes: str, message: str, schema: dict) -> dict:
    """Un appel à l'API, avec sortie JSON imposée. Renvoie la sortie et les jetons consommés."""
    reponse = api.beta.messages.create(
        model=MODELE,
        max_tokens=MAX_TOKENS,
        system=consignes,
        messages=[{"role": "user", "content": message}],
        output_config={"effort": EFFORT, "format": {"type": "json_schema", "schema": schema}},
        betas=[BETA_REPLI],
        fallbacks="default",
    )
    texte = None
    if reponse.stop_reason != "refusal":
        texte = next((b.text for b in reponse.content if b.type == "text"), None)
    usage = reponse.usage
    return {
        "sortie": texte,
        "stop_reason": reponse.stop_reason,
        "modele": reponse.model,
        "jetons_entree": usage.input_tokens,
        "jetons_sortie": usage.output_tokens,
        "cout": round(cout(MODELE, usage.input_tokens, usage.output_tokens), 4),
        "id": reponse.id,
    }


def vulgariser(api, choix: dict, texte: dict[str, str], expose: str | None) -> dict:
    """Rédaction, contrôles, relecture ; une nouvelle tentative au plus ; sinon repli."""
    essais, erreurs = [], None
    for numero in range(1, TENTATIVES + 1):
        redaction = appeler(api, CONSIGNES, message_redaction(choix["titre"], expose, texte,
                                                              erreurs), SCHEMA_FICHE)
        essai = {"tentative": numero, "redaction": redaction, "relecture": None}
        controles, fiche = controles_locaux(redaction["sortie"] or "", texte, expose)
        if fiche is not None and all(c.reussi for c in controles):
            relecture = appeler(api, CONSIGNES_RELECTURE, message_relecture(fiche, texte, expose),
                                SCHEMA_RELECTURE)
            essai["relecture"] = relecture
            controles.append(controle_relecture(relecture["sortie"]))
        essai["controles"] = [c.__dict__ for c in controles]
        essai["fiche"] = fiche
        essais.append(essai)
        if len(controles) == 7 and all(c.reussi for c in controles):
            return {"statut": "publiée", "fiche": fiche, "essais": essais}
        erreurs = [e for c in controles for e in c.erreurs]
    return {"statut": "repli (sans cartes)", "fiche": None, "essais": essais}


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
        f"- Projection : environ {TEXTES_PAR_MOIS:.0f} textes entiers votés par mois "
        f"({SOLENNELS_PAR_MOIS:.0f} en scrutin solennel), soit **{TEXTES_PAR_MOIS * moyen:.2f} $ "
        f"par mois** pour tous, ou {SOLENNELS_PAR_MOIS * moyen:.2f} $ pour les seuls solennels. "
        "Avec le cache par empreinte du texte, un texte inchangé n'est jamais revulgarisé.",
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hors-ligne", action="store_true",
                        help="régénérer le rapport depuis essai.json, sans appel")
    parser.add_argument("--plafond", type=float, default=2.5,
                        help="coût cumulé (dollars) au-delà duquel l'essai s'arrête")
    args = parser.parse_args()

    if args.hors_ligne:
        ecrire_rapport(json.loads(SORTIE.read_text(encoding="utf-8")))
        print(f"Écrit : {RAPPORT.relative_to(RACINE)}")
        return

    import anthropic  # seulement pour l'appel réel

    api = anthropic.Anthropic()
    resultats, depense = [], 0.0
    try:
        with httpx.Client(follow_redirects=True, timeout=httpx.Timeout(60, read=180)) as web:
            for choix in SELECTION:
                if depense >= args.plafond:
                    print(f"Plafond de {args.plafond} $ atteint : arrêt avant {choix['numero']}.")
                    break
                texte = articles(document(web, choix["texte_vote"]))
                expose = expose_des_motifs(document(web, choix["texte_depose"]))
                print(f"Scrutin {choix['numero']} : {len(texte)} articles", flush=True)
                resultat = vulgariser(api, choix, texte, expose)
                resultat["choix"] = choix
                resultat["nb_articles"] = len(texte)
                resultats.append(resultat)
                depense += cout_total(resultat)
                print(f"  {resultat['statut']} · {cout_total(resultat):.3f} $ "
                      f"(cumul {depense:.3f} $)", flush=True)
    finally:
        # Même interrompu, l'essai garde ce qui a déjà été payé.
        if resultats:
            donnees = {"genere_le": datetime.now(UTC).isoformat(timespec="seconds"),
                       "modele": MODELE, "effort": EFFORT, "resultats": resultats}
            SORTIE.parent.mkdir(parents=True, exist_ok=True)
            SORTIE.write_text(json.dumps(donnees, indent=1, ensure_ascii=False) + "\n",
                              encoding="utf-8")
            ecrire_rapport(donnees)
            print(f"Écrit : {SORTIE.relative_to(RACINE)} et {RAPPORT.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
