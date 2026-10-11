import json
import zipfile

import pytest

from pipeline import normalize
from pipeline.sources import SOURCES, nom_fichier

A, B, NI = "PO1", "PO2", normalize.NON_INSCRITS


def fichier(source_id: str) -> str:
    return nom_fichier(next(s for s in SOURCES if s["id"] == source_id))


def ecrire_zip(chemin, fichiers: dict[str, dict]) -> None:
    with zipfile.ZipFile(chemin, "w") as z:
        for nom, contenu in fichiers.items():
            z.writestr(nom, json.dumps(contenu))


def mandat_depute(uid, pa, debut, fin=None, prise_de_fonction=None, circo="1"):
    return {"uid": uid, "acteurRef": pa, "legislature": "17", "typeOrgane": "ASSEMBLEE",
            "dateDebut": debut, "dateFin": fin,
            "mandature": {"datePriseFonction": prise_de_fonction or debut, "causeFin": None,
                          "placeHemicycle": "001", "mandatRemplaceRef": None},
            "election": {"lieu": {"departement": "Ain", "numDepartement": "01",
                                  "numCirco": circo},
                         "refCirconscription": "PO99", "causeMandat": "élections générales"}}


def mandat_groupe(pa, groupe, debut, fin=None, qualite="Membre"):
    return {"uid": f"PM{pa}{groupe}{debut}{qualite}", "acteurRef": pa, "legislature": "17",
            "typeOrgane": "GP", "dateDebut": debut, "dateFin": fin,
            "organes": {"organeRef": groupe}, "infosQualite": {"codeQualite": qualite}}


def acteur(pa, nom, mandats):
    return {"acteur": {"uid": {"#text": pa},
                       "etatCivil": {"ident": {"civ": "M.", "prenom": "Jean", "nom": nom,
                                               "alpha": nom}},
                       "mandats": {"mandat": mandats}}}


def organe(uid, sigle):
    return {"organe": {"uid": uid, "codeType": "GP", "legislature": "17", "libelleAbrev": sigle,
                       "libelle": f"Groupe {sigle}", "viMoDe": {"dateDebut": "2024-07-18",
                                                                 "dateFin": None},
                       "couleurAssociee": "#000000", "preseance": "1"}}


def votants(*pas):
    if not pas:
        return None
    liste = [{"acteurRef": pa, "parDelegation": "false"} for pa in pas]
    return {"votant": liste[0] if len(liste) == 1 else liste}  # un seul : objet, pas liste


def groupe_ventile(ref, membres, pours=(), contres=(), abstentions=(), non_votants=()):
    return {"organeRef": ref, "nombreMembresGroupe": str(membres),
            "vote": {"positionMajoritaire": "pour",
                     "decompteNominatif": {"pours": votants(*pours), "contres": votants(*contres),
                                           "abstentions": votants(*abstentions),
                                           "nonVotants": votants(*non_votants)}}}


def scrutin(numero, date, groupes, decompte, type_vote="SPO", sort="adopté",
            titre="l'ensemble de la proposition de loi sur les abeilles (première lecture).",
            mise_au_point=None):
    uid = f"VTANR5L17V{numero}"
    return f"json/{uid}.json", {"scrutin": {
        "uid": uid, "numero": str(numero), "dateScrutin": date,
        "seanceRef": "RUANR5L17S2025IDS1", "typeVote": {"codeTypeVote": type_vote},
        "titre": titre, "sort": {"code": sort},
        "syntheseVote": {"nombreVotants": "5", "suffragesExprimes": "4",
                         "nbrSuffragesRequis": "2",
                         "decompte": {k: str(v) for k, v in decompte.items()}},
        "objet": {"dossierLegislatif": None},
        "ventilationVotes": {"organe": {"groupes": {"groupe": groupes}}},
        "miseAuPoint": mise_au_point or {},
    }}


def construire_raw(raw):
    """Fausses archives au format de l'Assemblée, partagées avec tests/test_checks.py."""
    ecrire_zip(raw / fichier("historique_mandats"), {
        # PA1 change de groupe le 1er avril 2025 ; il préside A (deux mandats GP).
        "json/acteur/PA1.json": acteur("PA1", "Un", [
            mandat_depute("PM1", "PA1", "2024-07-08"),
            mandat_groupe("PA1", A, "2024-07-18", "2025-03-31"),
            mandat_groupe("PA1", A, "2024-07-18", "2025-03-31", "Président"),
            mandat_groupe("PA1", B, "2025-04-01")]),
        "json/acteur/PA2.json": acteur("PA2", "Deux", [
            mandat_depute("PM2", "PA2", "2024-07-08", circo="2"),
            mandat_groupe("PA2", A, "2024-07-18")]),
        "json/acteur/PA3.json": acteur("PA3", "Trois", [
            mandat_depute("PM3", "PA3", "2024-07-08", circo="3"),
            mandat_groupe("PA3", A, "2024-07-18")]),
        # PA4 quitte l'Assemblée fin janvier 2025 ; son suppléant PA5 a pour dateDebut la
        # date de l'élection, mais n'entre en fonction que le 1er février.
        "json/acteur/PA4.json": acteur("PA4", "Quatre", [
            mandat_depute("PM4", "PA4", "2024-07-08", "2025-01-31", circo="4"),
            mandat_groupe("PA4", B, "2024-07-18", "2025-01-31")]),
        "json/acteur/PA5.json": acteur("PA5", "Cinq", [
            mandat_depute("PM5", "PA5", "2024-07-07", prise_de_fonction="2025-02-01", circo="4"),
            mandat_groupe("PA5", B, "2025-02-01")]),
        "json/acteur/PA6.json": acteur("PA6", "Six", [
            mandat_depute("PM6", "PA6", "2024-07-08", circo="5"),
            mandat_groupe("PA6", NI, "2024-07-18")]),
        "json/organe/PO1.json": organe(A, "A"), "json/organe/PO2.json": organe(B, "B"),
        f"json/organe/{NI}.json": organe(NI, "NI"),
    })
    ecrire_zip(raw / fichier("scrutins"), dict([
        # V1 : PO0 dans la ventilation (le groupe vient des mandats GP, pas d'ici).
        scrutin(1, "2025-01-15",
                [groupe_ventile("PO0", 3, pours=("PA1", "PA2"), contres=("PA3",)),
                 groupe_ventile(B, 1, abstentions=("PA4",)),
                 groupe_ventile(NI, 1, contres=("PA6",))],
                {"pour": 2, "contre": 2, "abstentions": 1, "nonVotants": 0}),
        # V2 : PA1 a changé de groupe ; PA2 fait une mise au point (voulait voter pour).
        scrutin(2, "2025-06-01",
                [groupe_ventile(A, 2, contres=("PA2",)),
                 groupe_ventile(B, 2, pours=("PA1", "PA5"))],
                {"pour": 2, "contre": 1, "abstentions": 0, "nonVotants": 0},
                mise_au_point={"pours": votants("PA2")}),
        # V3 : motion de censure, seuls les « pour » sont publiés.
        scrutin(3, "2025-06-02", [groupe_ventile(B, 2, pours=("PA1",))],
                {"pour": 1, "contre": 0, "abstentions": 0, "nonVotants": 0}, type_vote="MOC",
                titre="la motion de censure déposée en application de l'article 49."),
        # V4 : décompte publié faux.
        scrutin(4, "2025-06-03", [groupe_ventile(A, 2, pours=("PA2", "PA3"))],
                {"pour": 3, "contre": 0, "abstentions": 0, "nonVotants": 0}, sort="rejeté"),
    ]))
    ecrire_zip(raw / fichier("dossiers_legislatifs"), {
        "json/dossierParlementaire/DL1.json": {"dossierParlementaire": {
            "uid": "DL1", "legislature": "17", "@xsi:type": "DossierLegislatif_Type",
            "titreDossier": {"titre": "Protéger les abeilles"},
            "procedureParlementaire": {"libelle": "Proposition de loi ordinaire"},
            "actesLegislatifs": {"acteLegislatif": {
                "uid": "L17-AN1-1", "codeActe": "AN1", "libelleActe": {"nomCanonique": "1ère"},
                "actesLegislatifs": {"acteLegislatif": {
                    "uid": "L17-AN1-DEC", "codeActe": "AN1-DEBATS-DEC", "dateActe":
                    "2025-01-15T00:00:00.000+01:00", "voteRefs": {"voteRef": "VTANR5L17V1"},
                    "libelleActe": {"nomCanonique": "Décision"}}}}}}},
        "json/document/PIONANR5L17B1.json": {"document": {
            "uid": "PIONANR5L17B1", "dossierRef": "DL1",
            "classification": {"type": {"code": "PION"}},
            "titres": {"titrePrincipal": "proposition de loi sur les abeilles"},
            "cycleDeVie": {"chrono": {"dateDepot": "2024-10-01T00:00:00.000+02:00"}}}},
    })
    point = {"uid": "PT1", "typePointODJ": "Vote solennel", "objet": "Vote solennel",
             "cycleDeVie": {"etat": "Confirmé"}, "dossiersLegislatifsRefs": {"dossierRef": "DL1"}}
    annule = {**point, "uid": "PT2", "cycleDeVie": {"etat": "Annulé"}}
    ecrire_zip(raw / fichier("agenda"), {"json/reunion/RU1.json": {"reunion": {
        "uid": "RU1", "@xsi:type": "seance_type", "timeStampDebut":
        "2099-01-13T15:00:00.000+01:00", "cycleDeVie": {"etat": "Confirmé"},
        "ODJ": {"pointsODJ": {"pointODJ": [point, annule]}}}}})
    # Liste des députés en exercice (AMO10), cohérente avec l'historique.
    actifs = {"PA1": B, "PA2": A, "PA3": A, "PA5": B, "PA6": NI}
    ecrire_zip(raw / fichier("deputes_actifs"), {
        f"json/acteur/{pa}.json": acteur(pa, pa, [mandat_groupe(pa, groupe, "2024-07-18")])
        for pa, groupe in actifs.items()})


@pytest.fixture(scope="module")
def base(tmp_path_factory):
    raw = tmp_path_factory.mktemp("raw")
    construire_raw(raw)
    con = normalize.normaliser(raw, raw / "site.duckdb", fiches=raw / "fiches")
    yield con
    con.close()


def cases(con, numero):
    return {pa: (position, groupe) for pa, position, groupe in con.execute(
        "SELECT depute_uid, position, groupe_uid FROM vote v JOIN scrutin s ON s.uid = "
        "v.scrutin_uid WHERE s.numero = ?", [numero]).fetchall()}


def test_les_onze_tables_existent(base):
    for table in normalize.TABLES:
        base.execute(f"SELECT * FROM {table} LIMIT 1")


def test_partition_une_case_par_depute_en_exercice(base):
    # Le 15 janvier 2025, PA4 siège encore et son suppléant PA5 pas encore.
    assert set(cases(base, 1)) == {"PA1", "PA2", "PA3", "PA4", "PA6"}
    # Le 1er juin, c'est l'inverse : la prise de fonction compte, pas la date d'élection.
    assert set(cases(base, 2)) == {"PA1", "PA2", "PA3", "PA5", "PA6"}
    assert cases(base, 2)["PA3"][0] == "absent"
    assert base.execute("SELECT count(*) FROM (SELECT scrutin_uid, depute_uid FROM vote "
                        "GROUP BY ALL HAVING count(*) > 1)").fetchone()[0] == 0
    assert base.execute("SELECT count_if(hors_mandat) FROM vote").fetchone()[0] == 0


def test_totaux_egaux_au_decompte_publie_sauf_scrutin_fautif(base):
    ecarts = normalize.ecarts_partition_totaux(base)
    assert [e["numero"] for e in ecarts] == [4]
    assert ecarts[0]["raisons"] == ["totaux : pour 2 au lieu de 3"]


def test_groupe_lu_dans_les_mandats_meme_si_la_ventilation_dit_po0(base):
    assert cases(base, 1)["PA1"] == ("pour", A)


def test_depute_qui_change_de_groupe(base):
    assert cases(base, 1)["PA1"][1] == A
    assert cases(base, 2)["PA1"][1] == B
    # Président et membre du même groupe : une seule période d'appartenance.
    assert base.execute("SELECT count(*), any_value(qualite) FROM appartenance "
                        "WHERE depute_uid = 'PA1' AND groupe_uid = ?", [A]).fetchone() == (
                            1, "Membre")


def test_position_de_groupe_et_dissidents(base):
    position = base.execute("SELECT position FROM position_groupe pg JOIN scrutin s ON s.uid = "
                            "pg.scrutin_uid WHERE s.numero = 1 AND groupe_uid = ?",
                            [A]).fetchone()[0]
    assert position == "pour"
    dissidents = {pa for (pa,) in base.execute(
        "SELECT depute_uid FROM vote WHERE dissident").fetchall()}
    assert dissidents == {"PA3"}  # PA6 vote contre aussi, mais il est non inscrit


def test_motion_de_censure(base):
    v3 = cases(base, 3)
    assert v3["PA1"][0] == "pour"
    assert {p for pa, (p, _) in v3.items() if pa != "PA1"} == {"absent"}
    assert base.execute("SELECT motion_censure FROM scrutin WHERE numero = 3").fetchone()[0]


def test_mise_au_point_gardee_a_cote_du_vote_officiel(base):
    assert base.execute(
        "SELECT position, position_mise_au_point FROM vote v JOIN scrutin s ON s.uid = "
        "v.scrutin_uid WHERE s.numero = 2 AND depute_uid = 'PA2'").fetchone() == (
            "contre", "pour")


def test_voix_pour_inverser(base):
    # Adopté : P − R + 1 ; rejeté : R − P.
    assert base.execute("SELECT numero, voix_pour_inverser FROM scrutin WHERE numero IN (1, 4) "
                        "ORDER BY numero").fetchall() == [(1, 1), (4, -1)]


def test_rattachement_et_votes_prevus(base):
    assert base.execute("SELECT dossier_uid, voie_rattachement FROM scrutin WHERE numero = 1"
                        ).fetchone() == ("DL1", "A · acte du dossier")
    assert base.execute("SELECT point_uid, dossier_uid FROM vote_prevu").fetchall() == [
        ("PT1", "DL1")]
    assert base.execute("SELECT count(*) FROM etape WHERE dossier_uid = 'DL1'").fetchone()[0] == 2


def test_sigle_affiche_celui_du_site_de_l_assemblee():
    lfi = {"libelleAbrege": "LFI-NFP", "libelleAbrev": "LFI-NFP"}
    udr = {"libelleAbrege": "UDR", "libelleAbrev": "UDDPLR"}
    ancien = {"libelleAbrev": "AD"}  # sans abréviation affichée : le code court
    assert [normalize.sigle_affiche(o) for o in (lfi, udr, ancien)] == ["LFI", "UDR", "AD"]
