"""Les sources de données du projet : URL, producteur, licence, et si le pipeline peut s'en passer.

Partagé par l'inventaire (scripts/inventaire_open_data.py) et l'ingestion de nuit
(pipeline/ingest.py).
"""

from __future__ import annotations

from pipeline.an import REPOSITORY as AN

DATAGOUV = "https://static.data.gouv.fr/resources/"

# « requise » : sans elle, le build de la nuit s'arrête et garde la version publiée. Les autres
# sont facultatives : leur échec est signalé mais ne bloque rien (le rattachement des scrutins
# tombe de 99,8 % à 99,4 % sans les amendements, docs/rattachement.md).
SOURCES = [
    {
        "id": "scrutins",
        "producteur": "Assemblée nationale",
        "nom": "Scrutins de la 17e législature",
        "url": AN + "loi/scrutins/Scrutins.json.zip",
        "licence": "Licence ouverte",
        "requise": True,
    },
    {
        "id": "deputes_actifs",
        "producteur": "Assemblée nationale",
        "nom": "Députés en exercice, mandats actifs et organes (AMO10)",
        "url": AN
        + "amo/deputes_actifs_mandats_actifs_organes/"
        "AMO10_deputes_actifs_mandats_actifs_organes.json.zip",
        "licence": "Licence ouverte",
        "requise": True,
    },
    {
        "id": "historique_mandats",
        "producteur": "Assemblée nationale",
        "nom": "Tous acteurs, tous mandats, tous organes, historique (AMO30)",
        "url": AN
        + "amo/tous_acteurs_mandats_organes_xi_legislature/"
        "AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip",
        "licence": "Licence ouverte",
        "requise": True,
    },
    {
        "id": "agenda",
        "producteur": "Assemblée nationale",
        "nom": "Agenda (réunions)",
        "url": AN + "vp/reunions/Agenda.json.zip",
        "licence": "Licence ouverte",
        "requise": True,
    },
    {
        "id": "dossiers_legislatifs",
        "producteur": "Assemblée nationale",
        "nom": "Dossiers législatifs et textes",
        "url": AN + "loi/dossiers_legislatifs/Dossiers_Legislatifs.json.zip",
        "licence": "Licence ouverte",
        "requise": True,
    },
    {
        "id": "amendements",
        "producteur": "Assemblée nationale",
        "nom": "Amendements",
        "url": AN + "loi/amendements_div_legis/Amendements.json.zip",
        "licence": "Licence ouverte",
        "requise": False,
    },
    {
        "id": "codes_postaux",
        "producteur": "La Poste (via data.gouv.fr)",
        "nom": "Base officielle des codes postaux",
        "url": "https://data.laposte.fr/data-fair/api/v1/datasets/laposte-hexasmal/raw",
        "fichier": "laposte_hexasmal.csv",
        "licence": "Licence ouverte 2.0",
        "requise": False,
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
        "requise": False,
    },
    {
        "id": "contours_circonscriptions",
        "producteur": "data.gouv.fr",
        "nom": "Contours géographiques des circonscriptions législatives (précision 10 m)",
        "url": DATAGOUV
        + "contours-geographiques-des-circonscriptions-legislatives/"
        "20240613-191520/circonscriptions-legislatives-p10.geojson",
        "licence": "Licence ouverte 2.0",
        "requise": False,
    },
]


def nom_fichier(source: dict) -> str:
    return source.get("fichier") or source["url"].rsplit("/", 1)[-1]
