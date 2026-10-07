"""Page « État des données » : ce que le site sait, d'où ça vient, ce qui a été mis de côté (t14).

Usage :
    uv run python -m pipeline.etat

Lit data/site.duckdb, data/controles/resultat.json (pipeline/checks.py) et
data/sources/etat.json (pipeline/ingest.py). Produit, à chaque build autorisé :
    export/etat.json   données publiques, sans aucune donnée personnelle
    export/etat.html   page autonome qui les affiche (servie par le site à partir de t17)
"""

from __future__ import annotations

import html
import json
import sys
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from pathlib import Path

import duckdb

from pipeline.sources import SOURCES

RACINE = Path(__file__).resolve().parent.parent
BASE = RACINE / "data" / "site.duckdb"
RESULTAT = RACINE / "data" / "controles" / "resultat.json"
ETAT_SOURCES = RACINE / "data" / "sources" / "etat.json"
EXPORT = RACINE / "export"


def iso_http(date: str | None) -> str | None:
    """« Wed, 07 Oct 2026 10:26:12 GMT » → « 2026-10-07T10:26:12+00:00 »."""
    if not date:
        return None
    return parsedate_to_datetime(date).astimezone(UTC).isoformat(timespec="seconds")


def construire(con: duckdb.DuckDBPyConnection, resultat: dict, etat_sources: dict,
               maintenant: datetime) -> dict:
    total, = con.execute("SELECT count(*) FROM scrutin").fetchone()
    numero, date, titre, uid = con.execute(
        "SELECT numero, date, titre, uid FROM scrutin ORDER BY numero DESC LIMIT 1").fetchone()
    deputes, = con.execute("SELECT count(*) FROM mandat WHERE fin IS NULL").fetchone()
    mis_de_cote = resultat["scrutins_mis_de_cote"]
    sources = []
    for source in SOURCES:
        entree = etat_sources.get(source["id"], {})
        sources.append({
            "id": source["id"], "nom": source["nom"], "producteur": source["producteur"],
            "licence": source["licence"], "url": source["url"], "requise": source["requise"],
            "version": iso_http(entree.get("derniere_modification")),
            "recuperee_le": entree.get("recupere_le"),
            "echecs_consecutifs": entree.get("echecs_consecutifs", 0),
        })
    return {
        "genere_le": maintenant.isoformat(timespec="seconds"),
        "controle_le": resultat["controle_le"],
        "dernier_scrutin": {"uid": uid, "numero": numero, "date": date.isoformat(),
                            "titre": titre},
        "scrutins": {"total": total, "publies": total - len(mis_de_cote),
                     "mis_de_cote": len(mis_de_cote)},
        "deputes_en_exercice": deputes,
        "scrutins_mis_de_cote": mis_de_cote,
        "controles": [{k: r[k] for k in ("numero", "nom", "reussi", "bloquant")}
                      | {"details": r["details"][:10]} for r in resultat["controles"]],
        "sources": sources,
    }


def date_lisible(iso: str | None) -> str:
    """« 2026-10-07T10:26:12+00:00 » → « 7 octobre 2026 à 12 h 26 » (heure de Paris)."""
    if not iso:
        return "inconnue"
    from zoneinfo import ZoneInfo

    mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
            "septembre", "octobre", "novembre", "décembre"]
    d = datetime.fromisoformat(iso)
    if d.tzinfo is None:
        return f"{d.day} {mois[d.month - 1]} {d.year}"
    d = d.astimezone(ZoneInfo("Europe/Paris"))
    return f"{d.day} {mois[d.month - 1]} {d.year} à {d.hour} h {d.minute:02d}"


POLICES = ("https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600"
           "&amp;family=Nunito:wght@400;600;700&amp;display=swap")

STYLE = """
:root { --violet: #7C4DFF; --fond: #F7F6FB; --carte: #FFFFFF; --texte: #1E1B2E;
        --doux: #5F5B73; --ok: #1F8A4C; --alerte: #C2410C; --bord: #E4E1EE; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --fond: #15131F; --carte: #1F1C2C; --texte: #F2F0FA;
        --doux: #ABA6C2; --ok: #4ADE80; --alerte: #FB923C; --bord: #34304A; }
}
:root[data-theme="dark"] { --fond: #15131F; --carte: #1F1C2C; --texte: #F2F0FA;
      --doux: #ABA6C2; --ok: #4ADE80; --alerte: #FB923C; --bord: #34304A; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--fond); color: var(--texte);
       font: 16px/1.55 Nunito, system-ui, sans-serif; }
main { max-width: 860px; margin: 0 auto; padding: 32px 16px 64px; }
h1, h2 { font-family: Fredoka, Nunito, system-ui, sans-serif; line-height: 1.2; }
h1 { font-size: 2rem; margin: 0 0 4px; } h1 span { color: var(--violet); }
h2 { font-size: 1.25rem; margin: 32px 0 12px; }
.sous-titre { color: var(--doux); margin: 0 0 24px; }
.cartes { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.carte { background: var(--carte); border: 1px solid var(--bord); border-radius: 16px;
         padding: 16px; }
.carte strong { display: block; font-family: Fredoka, Nunito, sans-serif; font-size: 1.6rem; }
.carte small { color: var(--doux); }
table { width: 100%; border-collapse: collapse; background: var(--carte);
        border: 1px solid var(--bord); border-radius: 12px; overflow: hidden; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--bord);
         vertical-align: top; font-size: .95rem; }
th { color: var(--doux); font-weight: 600; }
.tableau { overflow-x: auto; }
.ok { color: var(--ok); font-weight: 700; } .alerte { color: var(--alerte); font-weight: 700; }
a { color: var(--violet); }
footer { margin-top: 40px; color: var(--doux); font-size: .9rem; }
"""


def e(texte) -> str:
    return html.escape(str(texte), quote=True)


def page(etat: dict) -> str:
    dernier = etat["dernier_scrutin"]
    lignes_controles = "".join(
        f"<tr><td>{c['numero']}</td><td>{e(c['nom'].capitalize())}</td><td>"
        + ("<span class='ok'>réussi</span>" if c["reussi"] else
           f"<span class='alerte'>{'échec' if c['bloquant'] else 'signalé'}</span>")
        + "</td><td>" + e(" ; ".join(c["details"][:3]) or "—") + "</td></tr>"
        for c in etat["controles"])
    lignes_cote = "".join(
        f"<tr><td>{s['numero']}</td><td>{e(s['raison'])}</td></tr>"
        for s in etat["scrutins_mis_de_cote"]) or (
        "<tr><td colspan='2'>Aucun scrutin mis de côté.</td></tr>")
    lignes_sources = "".join(
        f"<tr><td><a href='{e(s['url'])}'>{e(s['nom'])}</a><br><small>{e(s['producteur'])} · "
        f"{e(s['licence'])}</small></td><td>{e(date_lisible(s['version']))}</td><td>"
        + ("<span class='ok'>à jour</span>" if s["echecs_consecutifs"] == 0 else
           f"<span class='alerte'>{s['echecs_consecutifs']} échec(s) d'affilée</span>")
        + "</td></tr>" for s in etat["sources"])
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>État des données · Le 578e siège</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{POLICES}" rel="stylesheet">
<style>{STYLE}</style>
</head>
<body>
<main>
<h1>État des <span>données</span></h1>
<p class="sous-titre">Mis à jour le {e(date_lisible(etat["genere_le"]))}, à partir de l'open
data de l'Assemblée nationale.</p>

<div class="cartes">
  <div class="carte"><strong>{etat["scrutins"]["publies"]}</strong><small>scrutins publiés sur
  {etat["scrutins"]["total"]}</small></div>
  <div class="carte"><strong>n° {dernier["numero"]}</strong><small>dernier scrutin intégré,
  du {e(date_lisible(dernier["date"]))}</small></div>
  <div class="carte"><strong>{etat["deputes_en_exercice"]}</strong><small>députés en
  exercice</small></div>
  <div class="carte"><strong>{etat["scrutins"]["mis_de_cote"]}</strong><small>scrutin(s) mis
  de côté</small></div>
</div>

<h2>Dernier scrutin intégré</h2>
<p>Scrutin n° {dernier["numero"]} du {e(date_lisible(dernier["date"]))} : {e(dernier["titre"])}</p>

<h2>Scrutins mis de côté</h2>
<p>Un scrutin dont le décompte ne tombe pas juste n'est pas publié ; les autres le sont.</p>
<div class="tableau"><table>
<thead><tr><th>N°</th><th>Raison</th></tr></thead><tbody>{lignes_cote}</tbody>
</table></div>

<h2>Contrôles du dernier build</h2>
<div class="tableau"><table>
<thead><tr><th>N°</th><th>Contrôle</th><th>Résultat</th><th>Détail</th></tr></thead>
<tbody>{lignes_controles}</tbody>
</table></div>

<h2>Sources</h2>
<div class="tableau"><table>
<thead><tr><th>Source</th><th>Version utilisée</th><th>Récupération</th></tr></thead>
<tbody>{lignes_sources}</tbody>
</table></div>

<footer>Données publiques, en Licence ouverte. Les mêmes informations, en JSON :
<a href="etat.json">etat.json</a>.</footer>
</main>
</body>
</html>
"""


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    con = duckdb.connect(str(BASE), read_only=True)
    try:
        etat = construire(con, json.loads(RESULTAT.read_text(encoding="utf-8")),
                          json.loads(ETAT_SOURCES.read_text(encoding="utf-8")),
                          datetime.now(UTC))
    finally:
        con.close()
    EXPORT.mkdir(exist_ok=True)
    (EXPORT / "etat.json").write_text(json.dumps(etat, indent=1, ensure_ascii=False) + "\n",
                                      encoding="utf-8")
    (EXPORT / "etat.html").write_text(page(etat), encoding="utf-8")
    print(f"Écrit : export/etat.json et export/etat.html (dernier scrutin : n° "
          f"{etat['dernier_scrutin']['numero']}, {etat['scrutins']['mis_de_cote']} mis de côté)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
