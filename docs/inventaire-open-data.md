# Inventaire des fichiers open data

Généré le 2026-10-07T11:15:07+00:00 par `uv run python -m scripts.inventaire_open_data`. Tout ce document est régénéré, sauf la section « Constats ». Mesures complètes : `data/mesures/inventaire_open_data.json`.

## Constats

<!-- constats:debut -->
Lecture de l'inventaire du 7 octobre 2026. Les chiffres viennent des mesures ci-dessous.

**Disponibilité**
- 9 sources, 418 Mo téléchargés. L'archive des scrutins du 7 octobre contient les scrutins jusqu'au 6 octobre. Ce n'est qu'une observation : la mesure du délai de publication reste à faire (question ouverte 1).
- **Cache** : `data.assemblee-nationale.fr` garde les fichiers 4 h en cache (`Cache-Control: max-age=14400`). Sans paramètre anti-cache, on peut recevoir une version vieille de 4 h. Les dates de cet inventaire (00 h 34 à 06 h 24 GMT) viennent de ce cache. Le 7 octobre à 11 h 11 GMT, le serveur d'origine annonçait une régénération des scrutins à 10 h 26, de l'agenda à 10 h 41, des dossiers à 10 h 16 et des amendements à 08 h 23 : les archives sont régénérées plusieurs fois par jour, et pas seulement la nuit. Le script ajoute désormais un paramètre anti-cache à chaque requête.
- Le téléchargement des amendements (310 Mo) a échoué deux fois (503, puis coupure) avant de réussir. Le pipeline doit donc réessayer et ne pas dépendre de cette archive pour publier.
- Non retenu : `AMO50_acteurs_mandats_organes_divises`, figé depuis juillet 2024.
- Pour data.gouv.fr, la « dernière modification » est celle du serveur de fichiers (juillet 2026), pas celle des données (table de 2017, contours de juin 2024).

**Pièges de structure (JSON converti depuis le XML)**
- Un élément répétable est un objet s'il est seul, une liste sinon. Exemple dans les scrutins : 36 092 listes de votants réduites à un objet, contre 96 602 vraies listes. Même cas pour les groupes, les mandats, les points d'ordre du jour… Il faut toujours normaliser.
- Il existe deux formes de valeur nulle : `null` et `{"@xsi:nil": "true"}`.
- Toutes les valeurs sont du texte, y compris les nombres et les booléens (`"false"`).
- L'identifiant d'un acteur est dans `acteur.uid["#text"]`. Dans les scrutins, il est directement dans `acteurRef`.

**Scrutins** : 8 560, du 8 octobre 2024 au 6 octobre 2026, numérotés de 1 à 8 560 sans trou.
- Types : 8 465 ordinaires (SPO), 72 solennels (SPS), 23 motions de censure (MOC).
- Les absents ne sont pas listés. Un scrutin liste en médiane 134 députés, alors que la somme des `nombreMembresGroupe` va de 569 à 577 : les absents doivent être reconstitués, ce qui confirme la règle.
- Pour les motions de censure, seuls les « pour » (4 037) et les non-votants (86) sont listés, ce qui confirme qu'il faut les exclure.
- Les non-votants ont une cause : MG (membre du gouvernement), PAN (président de l'Assemblée) ou PSE (président de séance). Ce ne sont pas des absents.
- `nbrSuffragesRequis` est renseigné pour tous les scrutins, donc la formule « voix pour inverser » est applicable partout.
- Les décomptes nominatifs concordent avec la synthèse, à un écart près (non-votants) sur 8 560 scrutins. Aucun député n'est listé deux fois dans un même scrutin.
- 18 % des scrutins (1 582) ont une mise au point. 15 % des votes listés sont exprimés par délégation.
- **Groupe `PO0`** : 14 scrutins (n° 489 à 501 en décembre 2024, puis 1302 et 6256) classent des votes sous un organe `PO0` qui n'existe pas. Le groupe doit donc toujours être reconstitué depuis les mandats GP à la date du vote, et pas lu dans la ventilation.
- Le lien avec un dossier (`objet.dossierLegislatif`) n'est renseigné que pour 30 scrutins solennels sur 72, 2 703 ordinaires sur 8 465 et 1 motion sur 23. Toutes les références renseignées existent bien. Pour la question ouverte 2, il faudra une autre voie (agenda, titre).

**Députés et groupes**
- 569 députés en exercice, soit 8 sièges vacants. 649 députés différents ont siégé pendant la 17e législature (678 mandats).
- 14 groupes politiques ont existé pendant la 17e. Deux ont pris fin : AD le 11 septembre 2024 et UDR le 4 septembre 2025 ; UDDPLR a été créé le 5 septembre 2025. Les non-inscrits ont eux aussi un organe GP (PO840056) : il faut l'exclure du calcul des dissidences.
- Les 11 présidents de groupe ont deux mandats GP en cours (membre et président). Il faut dédoublonner par député.

**Agenda** : 7 989 réunions, programmées jusqu'au 19 janvier 2027, dont 74 séances publiques à venir.
- 89 points « Vote solennel » en séance pour 72 scrutins solennels. C'est la piste pour « Vote avant eux ».
- 939 réunions sont annulées et 281 supprimées : il faut filtrer sur `cycleDeVie.etat`.
- 1 281 points d'ordre du jour en séance sur 3 844 citent un dossier législatif.

**Dossiers, textes, amendements**
- 3 232 dossiers, dont 3 036 de la 17e. 7 268 documents, dont 2 426 sans législature : ce sont surtout des documents du Sénat (identifiants `…SNR…`).
- 128 762 amendements. 149 sont rangés dans un dossier `incorrect_data`, 58 273 n'ont pas de sort et 4 textes visés sont introuvables parmi les documents.

**Géographie**
- Codes postaux : fichier en ISO-8859-1, séparateur `;`, en-tête précédé de `#`. 394 communes ont plusieurs codes postaux et 4 205 codes postaux couvrent plusieurs communes. Le code postal ne suffit donc pas toujours à trouver la circonscription.
- Communes → circonscriptions : la seule table officielle trouvée date de 2017. Elle couvre les 577 circonscriptions, mais avec le découpage communal de 2017 (des communes ont fusionné depuis) et les codes « Z » du ministère (ZA = 971 … ZZ = Français de l'étranger). 118 communes sont réparties sur plusieurs circonscriptions : la commune ne suffit donc pas toujours.
- Vérifié : ni les résultats des législatives 2024 par bureau de vote, ni la table Insee des bureaux de vote ne contiennent le code de circonscription.
- Contours : 559 circonscriptions sur 577. Manquent Saint-Barthélemy et Saint-Martin, Wallis-et-Futuna, la Polynésie française (3), la Nouvelle-Calédonie (2) et les 11 circonscriptions des Français de l'étranger.
<!-- constats:fin -->

## Sources

| Source | Producteur | Taille | Dernière modification | Contenu |
|---|---|---|---|---|
| Scrutins de la 17e législature | Assemblée nationale | 26,7 Mo | Wed, 07 Oct 2026 04:26:32 GMT | 8 560 fichiers JSON (174,9 Mo décompressés) |
| Députés en exercice, mandats actifs et organes (AMO10) | Assemblée nationale | 4,9 Mo | Wed, 07 Oct 2026 01:50:38 GMT | 7 716 fichiers JSON (13,1 Mo décompressés) |
| Tous acteurs, tous mandats, tous organes, historique (AMO30) | Assemblée nationale | 13,7 Mo | Wed, 07 Oct 2026 00:34:35 GMT | 14 046 fichiers JSON (95,1 Mo décompressés) |
| Agenda (réunions) | Assemblée nationale | 8,3 Mo | Wed, 07 Oct 2026 04:40:58 GMT | 7 989 fichiers JSON (24,7 Mo décompressés) |
| Dossiers législatifs et textes | Assemblée nationale | 10,7 Mo | Wed, 07 Oct 2026 06:16:41 GMT | 10 500 fichiers JSON (37,7 Mo décompressés) |
| Amendements | Assemblée nationale | 310,2 Mo | Wed, 07 Oct 2026 06:24:54 GMT | 128 762 fichiers JSON (867,1 Mo décompressés) |
| Base officielle des codes postaux | La Poste (via data.gouv.fr) | 1,6 Mo | Tue, 08 Sep 2026 02:25:01 GMT | 39 192 lignes |
| Table de correspondance communes → circonscriptions législatives (mise à jour 2017) | Ministère de l'Intérieur (via data.gouv.fr) | 1,7 Mo | Thu, 02 Jul 2026 15:21:44 GMT | 36 466 lignes |
| Contours géographiques des circonscriptions législatives (précision 10 m) | data.gouv.fr | 5,4 Mo | Thu, 02 Jul 2026 15:32:08 GMT | 559 entités |

## Recoupements entre sources

- Circonscriptions des députés (17e) absentes de « communes_circonscriptions » (0) : aucun
- Circonscriptions de « communes_circonscriptions » sans député (17e) (0) : aucun
- Circonscriptions des députés (17e) absentes de « contours_circonscriptions » (18) : 977-1, 986-1, 987-1, 987-2, 987-3, 988-1, 988-2, 99-1, 99-10, 99-11, 99-2, 99-3, 99-4, 99-5, 99-6, 99-7, 99-8, 99-9
- Circonscriptions de « contours_circonscriptions » sans député (17e) (0) : aucun

## Détail par source

### Scrutins de la 17e législature

- Producteur : Assemblée nationale · licence : Licence ouverte
- URL : <https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip>
- Fichier : `data/raw/Scrutins.json.zip` · 26,7 Mo · SHA-256 `e2f37559c1dd135d…`
- Dernière modification côté serveur : Wed, 07 Oct 2026 04:26:32 GMT · téléchargé le 2026-10-07T09:51:37+00:00
- Contenu : 8 560 fichiers JSON (174,9 Mo décompressés)

**Mesures**

- scrutins : 8 560
- premier scrutin : 2024-10-08
- dernier scrutin : 2026-10-06
- numeros : min : 1 · max : 8 560 · manquants : 0 · premiers_manquants : aucun
- types de vote : SPO (scrutin public ordinaire) : 8 465 · SPS (scrutin public solennel) : 72 · MOC (motion de censure) : 23
- resultats : rejeté : 5 651 · adopté : 2 909
- type et mode de publication : SPO · DecompteNominatif : 8 465 · SPS · DecompteNominatif : 72 · MOC · DecompteNominatif : 23
- suffrages requis renseignes : 8 560
- dossier legislatif renseigne par type : SPO : scrutins : 8 465 · avec_dossier : 2 703 · SPS : scrutins : 72 · avec_dossier : 30 · MOC : scrutins : 23 · avec_dossier : 1
- dossiers cites introuvables : 0
- scrutins avec mise au point : 1 582
- decompte nominatif : deputes_listes_par_scrutin : min : 18 · mediane : 134.0 · max : 574 · membres_des_groupes_par_scrutin : min : 569 · mediane : 577.0 · max : 577 · non_listes_par_scrutin : min : 1 · mediane : 442.0 · max : 557 · ecarts_avec_la_synthese : nonVotants : 1
- scrutins avec un depute liste deux fois : 0
- votes par delegation : 193973 sur 1284833
- forme des listes de votants : liste : 96 602 · objet unique : 36 092
- positions majoritaires des groupes : pour : 49 624 · contre : 47 951 · abstention : 5 145
- causes de non vote : MG : 9 991 · PAN : 7 623 · PSE : 5 919
- votes nominatifs par type et categorie : SPO : contres : 616 194 · pours : 534 165 · abstentions : 69 766 · nonVotants : 23 366 · SPS : pours : 24 602 · contres : 10 070 · abstentions : 2 466 · nonVotants : 81 · MOC : pours : 4 037 · nonVotants : 86
- acteurs inconnus de l historique : 0
- groupes inconnus de l historique : PO0 : scrutins : 14 · du : 2024-12-02 · au : 2026-04-16 · numeros : 489, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 1 302, 6 256

| Groupe de fichiers | Fichiers | Décompressé | Formes d'identifiant |
|---|---|---|---|
| `json/<id>.json` | 8 560 | 174,9 Mo | `VTANR9L9V9` (8 560) |

<details><summary>Structure de <code>json/<id>.json</code> (132 chemins, échantillon de 408 fichiers, 11 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `scrutin` | 100% | objet |  |
| `scrutin.uid` | 100% | texte | VTANR5L17V2657 |
| `scrutin.numero` | 100% | texte | 2657 |
| `scrutin.organeRef` | 100% | texte | PO838901 |
| `scrutin.legislature` | 100% | texte | 17 |
| `scrutin.sessionRef` | 100% | texte | SCR5A2025O1 |
| `scrutin.seanceRef` | 100% | texte | RUANR5L17S2025IDS29580 |
| `scrutin.dateScrutin` | 100% | texte | 2025-06-24 |
| `scrutin.quantiemeJourSeance` | 100% | texte | 1 |
| `scrutin.typeVote` | 100% | objet |  |
| `scrutin.typeVote.codeTypeVote` | 100% | texte | SPO |
| `scrutin.typeVote.libelleTypeVote` | 100% | texte | scrutin public ordinaire |
| `scrutin.typeVote.typeMajorite` | 100% | texte | Majorité absolue des suffrages exprimés |
| `scrutin.sort` | 100% | objet |  |
| `scrutin.sort.code` | 100% | texte | adopté |
| `scrutin.sort.libelle` | 100% | texte | l'Assemblée nationale a adopté |
| `scrutin.titre` | 100% | texte | l'article 22 (examen prioritaire) du projet de loi de progra |
| `scrutin.demandeur` | 100% | objet |  |
| `scrutin.demandeur.texte` | 100% | texte | Présidente du groupe "Rassemblement National" |
| `scrutin.demandeur.referenceLegislative` | 100% | null |  |
| `scrutin.objet` | 100% | objet |  |
| `scrutin.objet.libelle` | 100% | texte | l'article 22 (examen prioritaire) du projet de loi de progra |
| `scrutin.objet.dossierLegislatif` | 100% | null, objet |  |
| `scrutin.objet.referenceLegislative` | 100% | null |  |
| `scrutin.modePublicationDesVotes` | 100% | texte | DecompteNominatif |
| `scrutin.syntheseVote` | 100% | objet |  |
| `scrutin.syntheseVote.nombreVotants` | 100% | texte | 144 |
| `scrutin.syntheseVote.suffragesExprimes` | 100% | texte | 144 |
| `scrutin.syntheseVote.nbrSuffragesRequis` | 100% | texte | 73 |
| `scrutin.syntheseVote.annonce` | 100% | texte | l'Assemblée nationale a adopté |
| `scrutin.syntheseVote.decompte` | 100% | objet |  |
| `scrutin.syntheseVote.decompte.nonVotants` | 100% | texte | 2 |
| `scrutin.syntheseVote.decompte.pour` | 100% | texte | 121 |
| `scrutin.syntheseVote.decompte.contre` | 100% | texte | 23 |
| `scrutin.syntheseVote.decompte.abstentions` | 100% | texte | 0 |
| `scrutin.syntheseVote.decompte.nonVotantsVolontaires` | 100% | texte | 0 |
| `scrutin.ventilationVotes` | 100% | objet |  |
| `scrutin.ventilationVotes.organe` | 100% | objet |  |
| `scrutin.ventilationVotes.organe.organeRef` | 100% | texte | PO838901 |
| `scrutin.ventilationVotes.organe.groupes` | 100% | objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe` | 100% | liste, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.organeRef` | 100% | texte | PO845401 |
| `scrutin.ventilationVotes.organe.groupes.groupe.nombreMembresGroupe` | 100% | texte | 123 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote` | 100% | objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.positionMajoritaire` | 100% | texte | pour |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteVoix` | 100% | objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteVoix.nonVotants` | 100% | texte | 0 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteVoix.pour` | 100% | texte | 54 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteVoix.contre` | 100% | texte | 0 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteVoix.abstentions` | 100% | texte | 0 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteVoix.nonVotantsVolontaires` | 100% | texte | 0 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif` | 100% | objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.nonVotants` | 100% | null, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.pours` | 100% | null, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.pours.votant` | 100% | liste, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.pours.votant.acteurRef` | 100% | texte | PA842279 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.pours.votant.mandatRef` | 100% | texte | PM843779 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.pours.votant.parDelegation` | 100% | texte | false |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.pours.votant.numPlace` | 100% | texte | 026 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.contres` | 100% | null, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.abstentions` | 100% | null, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.nonVotants.votant` | 100% | liste, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.nonVotants.votant.acteurRef` | 100% | texte | PA721908 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.nonVotants.votant.mandatRef` | 100% | texte | PM843467 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.nonVotants.votant.parDelegation` | 100% | texte | false |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.nonVotants.votant.numPlace` | 100% | null, texte | 402 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.nonVotants.votant.causePositionVote` | 100% | texte | PAN |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.contres.votant` | 96% | liste, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.contres.votant.acteurRef` | 96% | texte | PA793262 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.contres.votant.mandatRef` | 96% | texte | PM842438 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.contres.votant.parDelegation` | 96% | texte | true |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.contres.votant.numPlace` | 96% | null, texte | 571 |
| `scrutin.miseAuPoint` | 100% | objet |  |
| `scrutin.miseAuPoint.nonVotants` | 100% | liste, null, objet |  |
| `scrutin.miseAuPoint.pours` | 100% | null, objet |  |
| `scrutin.miseAuPoint.abstentions` | 100% | liste, null, objet |  |
| `scrutin.miseAuPoint.nonVotantsVolontaires` | 100% | liste, null |  |
| `scrutin.miseAuPoint.contres` | 100% | null, objet |  |
| `scrutin.miseAuPoint.dysfonctionnement` | 100% | objet |  |
| `scrutin.miseAuPoint.dysfonctionnement.nonVotants` | 100% | null |  |
| `scrutin.miseAuPoint.dysfonctionnement.pour` | 100% | null, objet |  |
| `scrutin.miseAuPoint.dysfonctionnement.contre` | 100% | null, objet |  |
| `scrutin.miseAuPoint.dysfonctionnement.abstentions` | 100% | null, objet |  |
| `scrutin.miseAuPoint.dysfonctionnement.nonVotantsVolontaires` | 100% | null, objet |  |
| `scrutin.lieuVote` | 100% | texte | Hémicycle |
| `scrutin.objet.dossierLegislatif.libelle` | 33% | texte | Projet de loi visant à offrir des réponses immédiates aux ph |
| `scrutin.objet.dossierLegislatif.dossierRef` | 33% | texte | DLR5L17N53980 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.abstentions.votant` | 74% | liste, objet |  |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.abstentions.votant.acteurRef` | 74% | texte | PA718884 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.abstentions.votant.mandatRef` | 74% | texte | PM842420 |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.abstentions.votant.parDelegation` | 74% | texte | true |
| `scrutin.ventilationVotes.organe.groupes.groupe.vote.decompteNominatif.abstentions.votant.numPlace` | 74% | texte | 199 |
| `scrutin.miseAuPoint.pours.votant` | 8% | liste, objet |  |
| `scrutin.miseAuPoint.pours.votant.acteurRef` | 8% | texte | PA796034 |
| `scrutin.miseAuPoint.pours.votant.mandatRef` | 8% | texte | PM840393 |
| `scrutin.miseAuPoint.pours.votant.parDelegation` | 8% | texte | false |
| `scrutin.miseAuPoint.pours.votant.numPlace` | 8% | texte | 148 |
| `scrutin.miseAuPoint.abstentions.votant` | 2% | liste, objet |  |
| `scrutin.miseAuPoint.abstentions.votant.acteurRef` | 2% | texte | PA795244 |
| `scrutin.miseAuPoint.abstentions.votant.mandatRef` | 2% | texte | PM843749 |
| `scrutin.miseAuPoint.abstentions.votant.parDelegation` | 2% | texte | false |
| `scrutin.miseAuPoint.abstentions.votant.numPlace` | 2% | texte | 456 |
| `scrutin.miseAuPoint.contres.votant` | 8% | liste, objet |  |
| `scrutin.miseAuPoint.contres.votant.acteurRef` | 8% | texte | PA610968 |
| `scrutin.miseAuPoint.contres.votant.mandatRef` | 8% | texte | PM840381 |
| `scrutin.miseAuPoint.contres.votant.parDelegation` | 8% | texte | false |
| `scrutin.miseAuPoint.contres.votant.numPlace` | 8% | texte | 516 |
| `scrutin.miseAuPoint.dysfonctionnement.pour.votant` | 1% | objet |  |
| `scrutin.miseAuPoint.dysfonctionnement.pour.votant.acteurRef` | 1% | texte | PA840979 |
| `scrutin.miseAuPoint.dysfonctionnement.pour.votant.mandatRef` | 1% | texte | PM842588 |
| `scrutin.miseAuPoint.dysfonctionnement.pour.votant.parDelegation` | 1% | texte | false |
| `scrutin.miseAuPoint.dysfonctionnement.pour.votant.numPlace` | 1% | texte | 211 |
| `scrutin.miseAuPoint.dysfonctionnement.abstentions.votant` | 0% | objet |  |
| `scrutin.miseAuPoint.dysfonctionnement.abstentions.votant.acteurRef` | 0% | texte | PA840869 |
| `scrutin.miseAuPoint.dysfonctionnement.abstentions.votant.mandatRef` | 0% | texte | PM842522 |
| `scrutin.miseAuPoint.dysfonctionnement.abstentions.votant.parDelegation` | 0% | texte | false |
| `scrutin.miseAuPoint.dysfonctionnement.abstentions.votant.numPlace` | 0% | texte | 047 |
| `scrutin.miseAuPoint.nonVotants.votant` | 5% | liste, objet |  |
| `scrutin.miseAuPoint.nonVotants.votant.acteurRef` | 5% | texte | PA793664 |
| `scrutin.miseAuPoint.nonVotants.votant.mandatRef` | 5% | texte | PM842549 |
| `scrutin.miseAuPoint.nonVotants.votant.parDelegation` | 5% | texte | false |
| `scrutin.miseAuPoint.nonVotants.votant.numPlace` | 5% | texte | 522 |
| `scrutin.miseAuPoint.dysfonctionnement.contre.votant` | 1% | objet |  |
| `scrutin.miseAuPoint.dysfonctionnement.contre.votant.acteurRef` | 1% | texte | PA794786 |
| `scrutin.miseAuPoint.dysfonctionnement.contre.votant.mandatRef` | 1% | texte | PM843242 |
| `scrutin.miseAuPoint.dysfonctionnement.contre.votant.parDelegation` | 1% | texte | false |
| `scrutin.miseAuPoint.dysfonctionnement.contre.votant.numPlace` | 1% | texte | 547 |
| `scrutin.miseAuPoint.dysfonctionnement.nonVotantsVolontaires.votant` | 0% | objet |  |
| `scrutin.miseAuPoint.dysfonctionnement.nonVotantsVolontaires.votant.acteurRef` | 0% | texte | PA793342 |
| `scrutin.miseAuPoint.dysfonctionnement.nonVotantsVolontaires.votant.mandatRef` | 0% | texte | PM842345 |
| `scrutin.miseAuPoint.dysfonctionnement.nonVotantsVolontaires.votant.parDelegation` | 0% | texte | false |
| `scrutin.miseAuPoint.dysfonctionnement.nonVotantsVolontaires.votant.numPlace` | 0% | texte | 204 |

</details>

### Députés en exercice, mandats actifs et organes (AMO10)

- Producteur : Assemblée nationale · licence : Licence ouverte
- URL : <https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip>
- Fichier : `data/raw/AMO10_deputes_actifs_mandats_actifs_organes.json.zip` · 4,9 Mo · SHA-256 `e96a4bca1577e454…`
- Dernière modification côté serveur : Wed, 07 Oct 2026 01:50:38 GMT · téléchargé le 2026-10-07T09:51:49+00:00
- Contenu : 7 716 fichiers JSON (13,1 Mo décompressés)

**Mesures**

- acteurs : 569
- acteurs avec mandat de depute en cours : 569
- acteurs absents de l historique : 0

| Groupe de fichiers | Fichiers | Décompressé | Formes d'identifiant |
|---|---|---|---|
| `json/organe/<id>.json` | 7 117 | 5,4 Mo | `PO9` (7 117) |
| `json/acteur/<id>.json` | 569 | 7,7 Mo | `PA9` (569) |
| `json/deport/<id>.json` | 30 | 0,0 Mo | `DPTR9L9PA9D9` (30) |

<details><summary>Structure de <code>json/organe/<id>.json</code> (37 chemins, échantillon de 419 fichiers, 0 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `organe` | 100% | objet |  |
| `organe.@xsi:type` | 100% | texte | OrganeCirconscription_type |
| `organe.uid` | 100% | texte | PO53107 |
| `organe.codeType` | 100% | texte | CIRCONSCRIPTION |
| `organe.libelle` | 100% | texte | 9ème circonscription de Seine-Saint-Denis |
| `organe.libelleEdition` | 100% | null, texte | de la circonscription |
| `organe.libelleAbrege` | 100% | texte | 93 Seine-Saint-Denis (° 9°) |
| `organe.libelleAbrev` | 100% | texte | CIRCO |
| `organe.viMoDe` | 100% | objet |  |
| `organe.viMoDe.dateDebut` | 100% | null, texte | 1988-06-05 |
| `organe.viMoDe.dateAgrement` | 100% | null, texte | 2024-11-20 |
| `organe.viMoDe.dateFin` | 100% | null, texte | 1993-04-01 |
| `organe.organeParent` | 100% | null, texte | PO419604 |
| `organe.chambre` | 100% | null |  |
| `organe.regime` | 100% | null, texte | 5ème République |
| `organe.legislature` | 100% | null, texte | 9 |
| `organe.numero` | 93% | null, texte | 9 |
| `organe.lieu` | 93% | objet |  |
| `organe.lieu.region` | 93% | objet |  |
| `organe.lieu.region.type` | 93% | texte | Métropolitain |
| `organe.lieu.region.libelle` | 93% | texte | Ile-de-France |
| `organe.lieu.departement` | 93% | objet |  |
| `organe.lieu.departement.codeNatureDep` | 93% | texte | M |
| `organe.lieu.departement.code` | 93% | texte | 93 |
| `organe.lieu.departement.libelle` | 93% | texte | Seine-Saint-Denis |
| `organe.regimeJuridique` | 3% | null, texte | Article 3 de la loi n° 55-1052 du 6 août 1955 |
| `organe.siteInternet` | 3% | null, texte | http://www.taaf.fr/Le-conseil-consultatif |
| `organe.nombreReunionsAnnuelles` | 3% | null, texte | 0 |
| `organe.secretariat` | 4% | objet |  |
| `organe.secretariat.secretaire01` | 4% | null, texte | M. Jean Thomas |
| `organe.secretariat.secretaire02` | 4% | null |  |
| `organe.listePays` | 2% | null, objet |  |
| `organe.positionPolitique` | 0% | null |  |
| `organe.preseance` | 0% | texte | 10 |
| `organe.couleurAssociee` | 0% | texte | #830E21 |
| `organe.listePays.paysRef` | 2% | texte | GOP756413 |
| `organe.organePrecedentRef` | 0% | null |  |

</details>

<details><summary>Structure de <code>json/acteur/<id>.json</code> (87 chemins, échantillon de 569 fichiers, 3 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `acteur` | 100% | objet |  |
| `acteur.uid` | 100% | objet |  |
| `acteur.uid.@xsi:type` | 100% | texte | IdActeur_type |
| `acteur.uid.#text` | 100% | texte | PA841605 |
| `acteur.etatCivil` | 100% | objet |  |
| `acteur.etatCivil.ident` | 100% | objet |  |
| `acteur.etatCivil.ident.civ` | 100% | texte |  |
| `acteur.etatCivil.ident.prenom` | 100% | texte |  |
| `acteur.etatCivil.ident.nom` | 100% | texte |  |
| `acteur.etatCivil.ident.alpha` | 100% | texte |  |
| `acteur.etatCivil.ident.trigramme` | 100% | texte |  |
| `acteur.etatCivil.infoNaissance` | 100% | objet |  |
| `acteur.etatCivil.infoNaissance.dateNais` | 100% | texte |  |
| `acteur.etatCivil.infoNaissance.villeNais` | 100% | texte |  |
| `acteur.etatCivil.infoNaissance.depNais` | 100% | nil (xsi), texte |  |
| `acteur.etatCivil.infoNaissance.paysNais` | 100% | texte |  |
| `acteur.etatCivil.dateDeces` | 100% | nil (xsi) |  |
| `acteur.profession` | 100% | objet |  |
| `acteur.profession.libelleCourant` | 100% | texte | (47) - Technicien |
| `acteur.profession.socProcINSEE` | 100% | objet |  |
| `acteur.profession.socProcINSEE.catSocPro` | 100% | nil (xsi), texte | Techniciens |
| `acteur.profession.socProcINSEE.famSocPro` | 100% | nil (xsi), texte | Professions intermédiaires |
| `acteur.uri_hatvp` | 100% | nil (xsi), texte |  |
| `acteur.adresses` | 100% | objet |  |
| `acteur.adresses.adresse` | 100% | liste, objet |  |
| `acteur.adresses.adresse.@xsi:type` | 100% | texte |  |
| `acteur.adresses.adresse.uid` | 100% | texte |  |
| `acteur.adresses.adresse.type` | 100% | texte |  |
| `acteur.adresses.adresse.typeLibelle` | 100% | texte |  |
| `acteur.adresses.adresse.poids` | 100% | null, texte |  |
| `acteur.adresses.adresse.adresseDeRattachement` | 100% | null, texte |  |
| `acteur.adresses.adresse.intitule` | 100% | null, texte |  |
| `acteur.adresses.adresse.numeroRue` | 100% | null, texte |  |
| `acteur.adresses.adresse.nomRue` | 100% | null, texte |  |
| `acteur.adresses.adresse.complementAdresse` | 100% | null, texte |  |
| `acteur.adresses.adresse.codePostal` | 100% | null, texte |  |
| `acteur.adresses.adresse.ville` | 100% | null, texte |  |
| `acteur.adresses.adresse.valElec` | 100% | texte |  |
| `acteur.mandats` | 100% | objet |  |
| `acteur.mandats.mandat` | 100% | liste, objet |  |
| `acteur.mandats.mandat.@xsi:type` | 100% | texte | MandatSimple_Type |
| `acteur.mandats.mandat.uid` | 100% | texte | PM876382 |
| `acteur.mandats.mandat.acteurRef` | 100% | texte | PA841605 |
| `acteur.mandats.mandat.legislature` | 100% | null, texte | 17 |
| `acteur.mandats.mandat.typeOrgane` | 100% | texte | PARPOL |
| `acteur.mandats.mandat.dateDebut` | 100% | texte | 2025-12-03 |
| `acteur.mandats.mandat.datePublication` | 100% | null, texte | 2025-12-03 |
| `acteur.mandats.mandat.dateFin` | 100% | null |  |
| `acteur.mandats.mandat.preseance` | 100% | texte | 5 |
| `acteur.mandats.mandat.nominPrincipale` | 100% | texte | 1 |
| `acteur.mandats.mandat.infosQualite` | 100% | objet |  |
| `acteur.mandats.mandat.infosQualite.codeQualite` | 100% | null, texte | Membre |
| `acteur.mandats.mandat.infosQualite.libQualite` | 100% | texte | Membre |
| `acteur.mandats.mandat.infosQualite.libQualiteSex` | 100% | null, texte | Membre |
| `acteur.mandats.mandat.organes` | 100% | objet |  |
| `acteur.mandats.mandat.organes.organeRef` | 100% | liste, texte | PO761239 |
| `acteur.mandats.mandat.suppleants` | 100% | null, objet |  |
| `acteur.mandats.mandat.suppleants.suppleant` | 92% | objet |  |
| `acteur.mandats.mandat.suppleants.suppleant.dateDebut` | 92% | texte | 2024-07-07 |
| `acteur.mandats.mandat.suppleants.suppleant.dateFin` | 92% | null |  |
| `acteur.mandats.mandat.suppleants.suppleant.suppleantRef` | 92% | texte | PA841609 |
| `acteur.mandats.mandat.chambre` | 100% | null |  |
| `acteur.mandats.mandat.election` | 100% | objet |  |
| `acteur.mandats.mandat.election.lieu` | 100% | objet |  |
| `acteur.mandats.mandat.election.lieu.region` | 100% | null, texte | Hauts-de-France |
| `acteur.mandats.mandat.election.lieu.regionType` | 100% | null, texte | Métropolitain |
| `acteur.mandats.mandat.election.lieu.departement` | 100% | null, texte | Pas-de-Calais |
| `acteur.mandats.mandat.election.lieu.numDepartement` | 100% | null, texte | 62 |
| `acteur.mandats.mandat.election.lieu.numCirco` | 100% | null, texte | 5 |
| `acteur.mandats.mandat.election.causeMandat` | 100% | null, texte | élections générales |
| `acteur.mandats.mandat.election.refCirconscription` | 100% | texte | PO839633 |
| `acteur.mandats.mandat.mandature` | 100% | objet |  |
| `acteur.mandats.mandat.mandature.datePriseFonction` | 100% | null, texte | 2024-07-08 |
| `acteur.mandats.mandat.mandature.causeFin` | 100% | null |  |
| `acteur.mandats.mandat.mandature.premiereElection` | 100% | texte | 0 |
| `acteur.mandats.mandat.mandature.placeHemicycle` | 100% | null, texte | 077 |
| `acteur.mandats.mandat.mandature.mandatRemplaceRef` | 100% | null, texte | PM842372 |
| `acteur.mandats.mandat.collaborateurs` | 100% | null, objet |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur` | 100% | liste, objet |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.qualite` | 100% | texte |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.prenom` | 100% | texte |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.nom` | 100% | texte |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.dateDebut` | 100% | null |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.dateFin` | 100% | null |  |
| `acteur.mandats.mandat.libelle` | 29% | null, texte | L'avenir de la sidérurgie en France |
| `acteur.mandats.mandat.missionSuivanteRef` | 29% | null |  |
| `acteur.mandats.mandat.missionPrecedenteRef` | 29% | null |  |

</details>

<details><summary>Structure de <code>json/deport/<id>.json</code> (23 chemins, échantillon de 30 fichiers, 0 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `deport` | 100% | objet |  |
| `deport.uid` | 100% | texte | DPTR5L16PA794810D0001 |
| `deport.chronotag` | 100% | texte | 3 |
| `deport.legislature` | 100% | texte | 16 |
| `deport.refActeur` | 100% | texte | PA794810 |
| `deport.dateCreation` | 100% | texte | 2023-06-22T15:46:30.952170+00:00 |
| `deport.datePublication` | 100% | null, texte | 2023-06-22T15:48:11.809295+00:00 |
| `deport.portee` | 100% | objet |  |
| `deport.portee.code` | 100% | texte | COMPLET |
| `deport.portee.libelle` | 100% | texte | Être absent pour la totalité du processus législatif concern |
| `deport.lecture` | 100% | objet |  |
| `deport.lecture.code` | 100% | texte | TL |
| `deport.lecture.libelle` | 100% | texte | Toutes lectures restantes |
| `deport.instance` | 100% | objet |  |
| `deport.instance.code` | 100% | texte | SEA_COM |
| `deport.instance.libelle` | 100% | texte | Séance publique et Commission |
| `deport.cible` | 100% | objet |  |
| `deport.cible.type` | 100% | objet |  |
| `deport.cible.type.code` | 100% | texte | TEXTE |
| `deport.cible.type.libelle` | 100% | texte | Projet ou proposition de loi ou de résolution, dans son inté |
| `deport.cible.referenceTextuelle` | 100% | texte | Industrie Verte |
| `deport.cible.references` | 100% | null |  |
| `deport.explication` | 100% | null, texte | &lt;p>Conflit&nbsp;d&#39;int&eacute;r&ecirc;t&nbsp;d&#39;ordre  |

</details>

### Tous acteurs, tous mandats, tous organes, historique (AMO30)

- Producteur : Assemblée nationale · licence : Licence ouverte
- URL : <https://data.assemblee-nationale.fr/static/openData/repository/17/amo/tous_acteurs_mandats_organes_xi_legislature/AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip>
- Fichier : `data/raw/AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip` · 13,7 Mo · SHA-256 `34d332519a642a59…`
- Dernière modification côté serveur : Wed, 07 Oct 2026 00:34:35 GMT · téléchargé le 2026-10-07T09:51:50+00:00
- Contenu : 14 046 fichiers JSON (95,1 Mo décompressés)

**Mesures**

- acteurs : 3 170
- types de mandats : GA : 39 798 · GE : 37 694 · COMPER : 25 495 · CMP : 17 350 · GP : 7 767 · ORGEXTPARL : 3 996 · ASSEMBLEE : 3 955 · MISINFO : 3 673 · CNPE : 3 672 · PARPOL : 3 670 · CNPS : 2 762 · API : 2 708
- types d organes : CIRCONSCRIPTION : 6 555 · GA : 937 · MINISTERE : 758 · GE : 637 · CMP : 557 · MISINFO : 482 · ORGEXTPARL : 334 · CNPE : 88 · GP : 63 · PARPOL : 58 · DELEGBUREAU : 48 · GEVI : 47
- mandats de depute 17e : 678
- deputes distincts 17e : 649
- mandats de depute 17e en cours : 569
- circonscriptions 17e : 577
- mandats de groupe en cours par qualite : Membre du : 514 · Apparenté au : 44 · Député non-inscrit : 11 · Président du : 11
- deputes avec plusieurs mandats de groupe en cours : 11

| Groupe | Sigle | Libellé | Début | Fin | Membres en cours |
|---|---|---|---|---|---|
| PO840056 | NI | Non inscrit | 2024-07-01 |  | 11 |
| PO845401 | RN | Rassemblement National | 2024-07-18 |  | 118 |
| PO845425 | DR | Droite Républicaine | 2024-07-18 |  | 47 |
| PO845514 | GDR | Gauche Démocrate et Républicaine | 2024-07-18 |  | 17 |
| PO845454 | DEM | Les Démocrates | 2024-07-18 |  | 37 |
| PO845419 | SOC | Socialistes et apparentés | 2024-07-18 |  | 67 |
| PO845485 | LIOT | Libertés, Indépendants, Outre-mer et Territoires | 2024-07-18 |  | 23 |
| PO845413 | LFI-NFP | La France insoumise - Nouveau Front Populaire | 2024-07-18 |  | 70 |
| PO845520 | AD | À Droite | 2024-07-18 | 2024-09-11 | 0 |
| PO845407 | EPR | Ensemble pour la République | 2024-07-18 |  | 90 |
| PO845439 | ECOS | Écologiste et Social | 2024-07-18 |  | 38 |
| PO845470 | HOR | Horizons & Indépendants | 2024-07-18 |  | 34 |
| PO847173 | UDR | UDR | 2024-09-12 | 2025-09-04 | 0 |
| PO872880 | UDDPLR | Union des droites pour la République | 2025-09-05 |  | 17 |

| Groupe de fichiers | Fichiers | Décompressé | Formes d'identifiant |
|---|---|---|---|
| `json/organe/<id>.json` | 10 817 | 8,1 Mo | `PO9` (10 817) |
| `json/acteur/<id>.json` | 3 170 | 86,9 Mo | `PA9` (3 170) |
| `json/deport/<id>.json` | 59 | 0,1 Mo | `DPTR9L9PA9D9` (59) |

<details><summary>Structure de <code>json/organe/<id>.json</code> (37 chemins, échantillon de 401 fichiers, 0 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `organe` | 100% | objet |  |
| `organe.@xsi:type` | 100% | texte | OrganeExtraParlementaire_type |
| `organe.uid` | 100% | texte | PO684277 |
| `organe.codeType` | 100% | texte | ORGEXTPARL |
| `organe.libelle` | 100% | texte | Comité de préfiguration des modalités d'instauration du prof |
| `organe.libelleEdition` | 100% | null, texte | du Comité de préfiguration des modalités d'instauration du p |
| `organe.libelleAbrege` | 100% | texte | Profil biologique des sportifs |
| `organe.libelleAbrev` | 100% | texte | 302 |
| `organe.viMoDe` | 100% | objet |  |
| `organe.viMoDe.dateDebut` | 100% | null, texte | 2012-09-13 |
| `organe.viMoDe.dateAgrement` | 100% | null, texte | 2012-07-18 |
| `organe.viMoDe.dateFin` | 100% | null, texte | 2017-06-26 |
| `organe.organeParent` | 100% | null, texte | PO384206 |
| `organe.chambre` | 92% | null |  |
| `organe.regime` | 92% | null, texte | 5ème République |
| `organe.legislature` | 92% | null, texte | 8 |
| `organe.regimeJuridique` | 4% | texte | Article 1er de l'arrêté du 13 septembre 2012 |
| `organe.siteInternet` | 4% | null, texte | http://www.enseignementsup-recherche.gouv.fr/cid53497/le-con |
| `organe.nombreReunionsAnnuelles` | 4% | null, texte | 20 |
| `organe.numero` | 60% | null, texte | 2 |
| `organe.lieu` | 60% | objet |  |
| `organe.lieu.region` | 60% | objet |  |
| `organe.lieu.region.type` | 60% | texte | Métropolitain |
| `organe.lieu.region.libelle` | 60% | texte | Pays de la Loire |
| `organe.lieu.departement` | 60% | objet |  |
| `organe.lieu.departement.codeNatureDep` | 60% | texte | M |
| `organe.lieu.departement.code` | 60% | texte | 44 |
| `organe.lieu.departement.libelle` | 60% | texte | Loire-Atlantique |
| `organe.secretariat` | 28% | objet |  |
| `organe.secretariat.secretaire01` | 28% | null, texte | Mme Dalila Fadé |
| `organe.secretariat.secretaire02` | 28% | null |  |
| `organe.listePays` | 10% | null, objet |  |
| `organe.listePays.paysRef` | 4% | texte | GOP756403 |
| `organe.preseance` | 9% | null, texte | 27 |
| `organe.organePrecedentRef` | 8% | null, texte | PO801887 |
| `organe.positionPolitique` | 0% | texte | Majoritaire |
| `organe.couleurAssociee` | 0% | null |  |

</details>

<details><summary>Structure de <code>json/acteur/<id>.json</code> (87 chemins, échantillon de 453 fichiers, 3 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `acteur` | 100% | objet |  |
| `acteur.uid` | 100% | objet |  |
| `acteur.uid.@xsi:type` | 100% | texte | IdActeur_type |
| `acteur.uid.#text` | 100% | texte | PA267551 |
| `acteur.etatCivil` | 100% | objet |  |
| `acteur.etatCivil.ident` | 100% | objet |  |
| `acteur.etatCivil.ident.civ` | 100% | texte |  |
| `acteur.etatCivil.ident.prenom` | 100% | texte |  |
| `acteur.etatCivil.ident.nom` | 100% | texte |  |
| `acteur.etatCivil.ident.alpha` | 100% | texte |  |
| `acteur.etatCivil.ident.trigramme` | 100% | nil (xsi), texte |  |
| `acteur.etatCivil.infoNaissance` | 100% | objet |  |
| `acteur.etatCivil.infoNaissance.dateNais` | 100% | nil (xsi), texte |  |
| `acteur.etatCivil.infoNaissance.villeNais` | 100% | nil (xsi), texte |  |
| `acteur.etatCivil.infoNaissance.depNais` | 100% | nil (xsi), texte |  |
| `acteur.etatCivil.infoNaissance.paysNais` | 100% | nil (xsi), texte |  |
| `acteur.etatCivil.dateDeces` | 100% | nil (xsi), texte |  |
| `acteur.profession` | 100% | objet |  |
| `acteur.profession.libelleCourant` | 100% | nil (xsi), texte | Vétérinaire |
| `acteur.profession.socProcINSEE` | 100% | objet |  |
| `acteur.profession.socProcINSEE.catSocPro` | 100% | nil (xsi), texte | Professions libérales et assimilés |
| `acteur.profession.socProcINSEE.famSocPro` | 100% | nil (xsi), texte | Cadres et professions intellectuelles supérieures |
| `acteur.uri_hatvp` | 100% | nil (xsi), texte |  |
| `acteur.adresses` | 100% | nil (xsi), objet |  |
| `acteur.adresses.adresse` | 97% | liste, objet |  |
| `acteur.adresses.adresse.@xsi:type` | 97% | texte |  |
| `acteur.adresses.adresse.uid` | 97% | texte |  |
| `acteur.adresses.adresse.type` | 97% | texte |  |
| `acteur.adresses.adresse.typeLibelle` | 97% | texte |  |
| `acteur.adresses.adresse.poids` | 97% | null, texte |  |
| `acteur.adresses.adresse.adresseDeRattachement` | 97% | null, texte |  |
| `acteur.adresses.adresse.valElec` | 96% | texte |  |
| `acteur.adresses.adresse.intitule` | 67% | null, texte |  |
| `acteur.adresses.adresse.numeroRue` | 67% | null, texte |  |
| `acteur.adresses.adresse.nomRue` | 67% | null, texte |  |
| `acteur.adresses.adresse.complementAdresse` | 67% | null, texte |  |
| `acteur.adresses.adresse.codePostal` | 67% | texte |  |
| `acteur.adresses.adresse.ville` | 67% | texte |  |
| `acteur.mandats` | 100% | objet |  |
| `acteur.mandats.mandat` | 100% | liste, objet |  |
| `acteur.mandats.mandat.@xsi:type` | 100% | texte | MandatAvecSuppleant_Type |
| `acteur.mandats.mandat.uid` | 100% | texte | PM706526 |
| `acteur.mandats.mandat.acteurRef` | 100% | texte | PA267551 |
| `acteur.mandats.mandat.legislature` | 100% | null, texte | 14 |
| `acteur.mandats.mandat.typeOrgane` | 100% | texte | OFFPAR |
| `acteur.mandats.mandat.dateDebut` | 100% | texte | 2015-03-10 |
| `acteur.mandats.mandat.datePublication` | 100% | null, texte | 2015-03-10 |
| `acteur.mandats.mandat.dateFin` | 100% | null, texte | 2016-04-27 |
| `acteur.mandats.mandat.preseance` | 100% | null, texte | 24 |
| `acteur.mandats.mandat.nominPrincipale` | 100% | texte | 1 |
| `acteur.mandats.mandat.infosQualite` | 100% | objet |  |
| `acteur.mandats.mandat.infosQualite.codeQualite` | 100% | null, texte | Membre |
| `acteur.mandats.mandat.infosQualite.libQualite` | 100% | texte | Membre |
| `acteur.mandats.mandat.infosQualite.libQualiteSex` | 100% | null, texte | Membre |
| `acteur.mandats.mandat.organes` | 100% | objet |  |
| `acteur.mandats.mandat.organes.organeRef` | 100% | liste, texte | PO273589 |
| `acteur.mandats.mandat.suppleants` | 97% | null, objet |  |
| `acteur.mandats.mandat.libelle` | 46% | null, texte | Soutien à l'investissement dans les startups, les petites et |
| `acteur.mandats.mandat.missionSuivanteRef` | 46% | null, texte | PM773764 |
| `acteur.mandats.mandat.missionPrecedenteRef` | 46% | null, texte | PM770942 |
| `acteur.mandats.mandat.suppleants.suppleant` | 56% | objet |  |
| `acteur.mandats.mandat.suppleants.suppleant.dateDebut` | 56% | texte | 2007-06-20 |
| `acteur.mandats.mandat.suppleants.suppleant.dateFin` | 56% | null, texte | 2012-06-19 |
| `acteur.mandats.mandat.suppleants.suppleant.suppleantRef` | 56% | texte | PA343360 |
| `acteur.mandats.mandat.chambre` | 96% | null |  |
| `acteur.mandats.mandat.election` | 97% | objet |  |
| `acteur.mandats.mandat.election.lieu` | 97% | objet |  |
| `acteur.mandats.mandat.election.lieu.region` | 97% | null, texte | Grand Est |
| `acteur.mandats.mandat.election.lieu.regionType` | 97% | null, texte | Métropolitain |
| `acteur.mandats.mandat.election.lieu.departement` | 97% | null, texte | Meurthe-et-Moselle |
| `acteur.mandats.mandat.election.lieu.numDepartement` | 97% | null, texte | 54 |
| `acteur.mandats.mandat.election.lieu.numCirco` | 97% | null, texte | 4 |
| `acteur.mandats.mandat.election.causeMandat` | 97% | null, texte | élections générales |
| `acteur.mandats.mandat.election.refCirconscription` | 65% | texte | PO384518 |
| `acteur.mandats.mandat.mandature` | 97% | objet |  |
| `acteur.mandats.mandat.mandature.datePriseFonction` | 97% | null, texte | 2007-06-20 |
| `acteur.mandats.mandat.mandature.causeFin` | 97% | null, texte | Fin de législature |
| `acteur.mandats.mandat.mandature.premiereElection` | 97% | texte | 0 |
| `acteur.mandats.mandat.mandature.placeHemicycle` | 97% | null, texte | 021 |
| `acteur.mandats.mandat.mandature.mandatRemplaceRef` | 97% | null, texte | PM722798 |
| `acteur.mandats.mandat.collaborateurs` | 97% | null, objet |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur` | 19% | liste, objet |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.qualite` | 19% | texte |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.prenom` | 19% | texte |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.nom` | 19% | texte |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.dateDebut` | 19% | null |  |
| `acteur.mandats.mandat.collaborateurs.collaborateur.dateFin` | 19% | null |  |

</details>

<details><summary>Structure de <code>json/deport/<id>.json</code> (23 chemins, échantillon de 59 fichiers, 0 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `deport` | 100% | objet |  |
| `deport.uid` | 100% | texte | DPTR5L16PA794810D0001 |
| `deport.chronotag` | 100% | texte | 3 |
| `deport.legislature` | 100% | texte | 16 |
| `deport.refActeur` | 100% | texte | PA794810 |
| `deport.dateCreation` | 100% | texte | 2023-06-22T15:46:30.952170+00:00 |
| `deport.datePublication` | 100% | null, texte | 2023-06-22T15:48:11.809295+00:00 |
| `deport.portee` | 100% | objet |  |
| `deport.portee.code` | 100% | texte | COMPLET |
| `deport.portee.libelle` | 100% | texte | Être absent pour la totalité du processus législatif concern |
| `deport.lecture` | 100% | objet |  |
| `deport.lecture.code` | 100% | texte | TL |
| `deport.lecture.libelle` | 100% | texte | Toutes lectures restantes |
| `deport.instance` | 100% | objet |  |
| `deport.instance.code` | 100% | texte | SEA_COM |
| `deport.instance.libelle` | 100% | texte | Séance publique et Commission |
| `deport.cible` | 100% | objet |  |
| `deport.cible.type` | 100% | objet |  |
| `deport.cible.type.code` | 100% | texte | TEXTE |
| `deport.cible.type.libelle` | 100% | texte | Projet ou proposition de loi ou de résolution, dans son inté |
| `deport.cible.referenceTextuelle` | 100% | texte | Industrie Verte |
| `deport.cible.references` | 100% | null |  |
| `deport.explication` | 100% | null, texte | &lt;p>Conflit&nbsp;d&#39;int&eacute;r&ecirc;t&nbsp;d&#39;ordre  |

</details>

### Agenda (réunions)

- Producteur : Assemblée nationale · licence : Licence ouverte
- URL : <https://data.assemblee-nationale.fr/static/openData/repository/17/vp/reunions/Agenda.json.zip>
- Fichier : `data/raw/Agenda.json.zip` · 8,3 Mo · SHA-256 `e0162c284142d6dd…`
- Dernière modification côté serveur : Wed, 07 Oct 2026 04:40:58 GMT · téléchargé le 2026-10-07T09:52:11+00:00
- Contenu : 7 989 fichiers JSON (24,7 Mo décompressés)

**Mesures**

- reunions : 7 989
- premiere reunion : 2024-07-01
- derniere reunion : 2027-01-19
- types de reunion : reunionCommission_type : 6 687 · seance_type : 1 111 · reunionInitParlementaire_type : 191
- etats : Confirmé : 6 681 · Annulé : 939 · Supprimé : 281 · Eventuel : 88
- seances publiques : 1 111
- seances publiques a venir : 74
- points d ordre du jour en seance : 3 844
- points avec dossier legislatif : 1 281
- dossiers cites introuvables : 0
- types de points en seance : Suite de la discussion : 2 071 · Discussion : 1 340 · Questions au Gouvernement : 162 · Débat d'initiative parlementaire : 106 · Vote solennel : 89 · Questions orales sans débat : 27 · Déclaration du Gouvernement suivie d'un débat : 17 · Ouverture et clôture de session : 17 · Séances réservées à un groupe de l'opposition ou minoritaire : 12 · Vote par scrutin public : 3
- reunions mentionnant solennel : 56
- exemples solennel : Vote solennel sur le projet de loi portant transposition de l’avenant n°3 du 25 février 2026 au protocole d’accord du 10 novembre 2023 relat, Vote solennel, Vote solennel sur le projet de loi, après engagement de la procédure accélérée, actualisant la programmation militaire pour les années 2024 , Vote solennel sur le projet de loi relatif aux jeux Olympiques et Paralympiques de 2030, Vote solennel sur la proposition de loi, adoptée par le Sénat, après engagement de la procédure accélérée, visant à sortir la France du pièg, Vote solennel sur la proposition de loi organique, adoptée par le Sénat, après engagement de la procédure accélérée, fixant le statut du pro

| Groupe de fichiers | Fichiers | Décompressé | Formes d'identifiant |
|---|---|---|---|
| `json/reunion/<id>.json` | 7 989 | 24,7 Mo | `RUANR9L9S9IDC9` (6 687), `RUANR9L9S9IDS9` (963), `RUANR9L9S9IDFL9` (191), `RUSNR9L9S9IDS9` (148) |

<details><summary>Structure de <code>json/reunion/<id>.json</code> (63 chemins, échantillon de 421 fichiers, 2 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `reunion` | 100% | objet |  |
| `reunion.@xsi:type` | 100% | texte | seance_type |
| `reunion.uid` | 100% | texte | RUANR5L17S2026IDS29879 |
| `reunion.timeStampDebut` | 100% | texte | 2025-11-07T21:30:00.000+01:00 |
| `reunion.timeStampFin` | 67% | texte | 2025-11-08T00:00:00.000+01:00 |
| `reunion.lieu` | 100% | objet |  |
| `reunion.lieu.lieuRef` | 100% | null, texte | AN |
| `reunion.lieu.libelleLong` | 100% | texte | Assemblée nationale |
| `reunion.cycleDeVie` | 100% | objet |  |
| `reunion.cycleDeVie.etat` | 100% | texte | Confirmé |
| `reunion.cycleDeVie.chrono` | 100% | objet |  |
| `reunion.cycleDeVie.chrono.creation` | 100% | texte | 2025-10-14T00:00:00.000+02:00 |
| `reunion.cycleDeVie.chrono.cloture` | 100% | null, texte | 2025-03-31T00:00:00.000+02:00 |
| `reunion.demandeur` | 100% | null |  |
| `reunion.organeReuniRef` | 100% | texte | PO838901 |
| `reunion.participants` | 100% | null, objet |  |
| `reunion.visioConference` | 100% | texte | false |
| `reunion.sessionRef` | 98% | null, texte | SCR5A2026O1 |
| `reunion.ouverturePresse` | 98% | texte | true |
| `reunion.captationVideo` | 98% | texte | true |
| `reunion.ODJ` | 100% | objet |  |
| `reunion.ODJ.convocationODJ` | 100% | null, objet |  |
| `reunion.ODJ.resumeODJ` | 100% | null, objet |  |
| `reunion.ODJ.pointsODJ` | 98% | null, objet |  |
| `reunion.ODJ.pointsODJ.pointODJ` | 30% | liste, objet |  |
| `reunion.ODJ.pointsODJ.pointODJ.@xsi:type` | 30% | texte | podjSeanceConfPres_type |
| `reunion.ODJ.pointsODJ.pointODJ.uid` | 30% | texte | RUANR5L17S2026IDS29879PT50907 |
| `reunion.ODJ.pointsODJ.pointODJ.cycleDeVie` | 30% | objet |  |
| `reunion.ODJ.pointsODJ.pointODJ.cycleDeVie.etat` | 30% | texte | Confirmé |
| `reunion.ODJ.pointsODJ.pointODJ.cycleDeVie.chrono` | 30% | objet |  |
| `reunion.ODJ.pointsODJ.pointODJ.cycleDeVie.chrono.creation` | 30% | texte | 2025-10-14T00:00:00.000+02:00 |
| `reunion.ODJ.pointsODJ.pointODJ.cycleDeVie.chrono.cloture` | 30% | null, texte | 2025-03-31T00:00:00.000+02:00 |
| `reunion.ODJ.pointsODJ.pointODJ.objet` | 30% | texte | Suite de la discussion du projet de loi de financement de la |
| `reunion.ODJ.pointsODJ.pointODJ.demandeurPoint` | 30% | null |  |
| `reunion.ODJ.pointsODJ.pointODJ.procedure` | 30% | null, texte | procédure d'examen simplifiée-Article 103 |
| `reunion.ODJ.pointsODJ.pointODJ.dossiersLegislatifsRefs` | 30% | null, objet |  |
| `reunion.ODJ.pointsODJ.pointODJ.dossiersLegislatifsRefs.dossierRef` | 23% | liste, texte | DLR5L17N52922 |
| `reunion.ODJ.pointsODJ.pointODJ.typePointODJ` | 30% | texte | Suite de la discussion |
| `reunion.ODJ.pointsODJ.pointODJ.comiteSecret` | 30% | texte | false |
| `reunion.ODJ.pointsODJ.pointODJ.textesAssocies` | 30% | null |  |
| `reunion.ODJ.pointsODJ.pointODJ.natureTravauxODJ` | 14% | texte | ODJPR |
| `reunion.compteRenduRef` | 98% | null, texte | CRSANR5L17S2026O1N039 |
| `reunion.identifiants` | 14% | objet |  |
| `reunion.identifiants.numSeanceJO` | 14% | null, texte | 39 |
| `reunion.identifiants.idJO` | 14% | null, texte | 20260039 |
| `reunion.identifiants.quantieme` | 14% | texte | Troisième |
| `reunion.identifiants.DateSeance` | 14% | texte | 2025-11-07+01:00 |
| `reunion.participants.participantsInternes` | 85% | null, objet |  |
| `reunion.participants.participantsInternes.participantInterne` | 40% | liste, objet |  |
| `reunion.participants.participantsInternes.participantInterne.acteurRef` | 40% | texte | PA795588 |
| `reunion.participants.participantsInternes.participantInterne.presence` | 40% | texte | absent |
| `reunion.participants.personnesAuditionnees` | 85% | null, objet |  |
| `reunion.ODJ.convocationODJ.item` | 86% | liste, texte | - À 9 heures 30 : |
| `reunion.ODJ.resumeODJ.item` | 79% | liste, texte | audition, ouverte à la presse, de M. Alain Garrigou, profess |
| `reunion.formatReunion` | 85% | texte | Ordinaire |
| `reunion.infosReunionsInternationale` | 85% | objet |  |
| `reunion.infosReunionsInternationale.estReunionInternationale` | 85% | texte | false |
| `reunion.infosReunionsInternationale.listePays` | 85% | null, objet |  |
| `reunion.infosReunionsInternationale.listePays.paysRef` | 4% | liste, texte | GOP756486 |
| `reunion.participants.personnesAuditionnees.personneAuditionnee` | 4% | liste, null |  |
| `reunion.ODJ.pointsODJ.pointODJ.dateConfPres` | 1% | texte | 2025-06-24+02:00 |
| `reunion.typeReunion` | 2% | texte | GE |
| `reunion.ODJ.pointsODJ.pointODJ.dateLettreMinistre` | 0% | texte | 2025-08-28+02:00 |

</details>

### Dossiers législatifs et textes

- Producteur : Assemblée nationale · licence : Licence ouverte
- URL : <https://data.assemblee-nationale.fr/static/openData/repository/17/loi/dossiers_legislatifs/Dossiers_Legislatifs.json.zip>
- Fichier : `data/raw/Dossiers_Legislatifs.json.zip` · 10,7 Mo · SHA-256 `b638d02140b4baed…`
- Dernière modification côté serveur : Wed, 07 Oct 2026 06:16:41 GMT · téléchargé le 2026-10-07T09:52:47+00:00
- Contenu : 10 500 fichiers JSON (37,7 Mo décompressés)

**Mesures**

- dossiers : 3 232
- dossiers par legislature : 17 : 3 036 · 16 : 88 · 15 : 64 · 14 : 27 · 13 : 9 · 11 : 5 · 12 : 2 · 8 : 1
- natures de dossier : DossierLegislatif_Type : 2 490 · DossierResolutionAN : 451 · DossierMissionControle_Type : 220 · DossierMissionInformation_Type : 27 · DossierCommissionEnquete_Type : 22 · DossierIniativeExecutif_Type : 20 ·  : 2
- procedures : Proposition de loi ordinaire : 2 206 · Résolution : 250 · Rapport d'information sans mission : 216 · Résolution Article 34-1 : 199 · Projet ou proposition de loi constitutionnelle : 92 · Projet de loi ordinaire : 75 · Projet ou proposition de loi organique : 65 · Projet de ratification des traités et conventions : 41 · Mission d'information : 27 · Commission d'enquête : 22 · Engagement de la responsabilité gouvernementale : 20 · Responsabilité pénale du président de la république : 4
- documents : 7 268
- documents par legislature : 17 : 4 314 ·  : 2 426 · 16 : 307 · 15 : 132 · 14 : 53 · 13 : 20 · 11 : 8 · 12 : 7 · 8 : 1
- types de document : Proposition de loi : 4 594 · Rapport : 1 089 · Projet de loi : 633 · Proposition de résolution : 526 · Rapport d'information : 204 · Résolution : 81 · Accord international : 41 · Avis : 24 · Motion : 24 · Etude d'impact : 21 · Avis du Conseil d'Etat : 18 · Déclaration : 8
- documents rattaches a un dossier : 7 267

| Groupe de fichiers | Fichiers | Décompressé | Formes d'identifiant |
|---|---|---|---|
| `json/document/<id>.json` | 7 268 | 25,8 Mo | `PIONANR9L9B9` (2 288), `PIONSNR9S9B9` (855), `RAPPANR9L9B9` (594), `RAPPSNR9S9B9` (492), `PNREANR9L9B9` (453), `PIONSNR9S9BTC9` (376), `PIONSNR9S9BTA9` (360), `PIONANR9L9BTC9` (289) |
| `json/dossierParlementaire/<id>.json` | 3 232 | 11,9 Mo | `DLR9L9N9` (3 232) |

<details><summary>Structure de <code>json/document/<id>.json</code> (133 chemins, échantillon de 404 fichiers, 5 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `document` | 100% | objet |  |
| `document.@xsi:type` | 100% | texte | texteLoi_Type |
| `document.uid` | 100% | texte | PIONANR5L16B0097 |
| `document.legislature` | 100% | null, texte | 16 |
| `document.cycleDeVie` | 100% | objet |  |
| `document.cycleDeVie.chrono` | 100% | objet |  |
| `document.cycleDeVie.chrono.dateCreation` | 100% | null, texte | 2022-07-12T00:00:00.000+02:00 |
| `document.cycleDeVie.chrono.dateDepot` | 100% | null, texte | 2022-07-12T00:00:00.000+02:00 |
| `document.cycleDeVie.chrono.datePublication` | 100% | null, texte | 2026-07-09T00:00:00.000+02:00 |
| `document.cycleDeVie.chrono.datePublicationWeb` | 100% | null, texte | 2022-07-13T14:25:00.000+02:00 |
| `document.denominationStructurelle` | 100% | texte | Proposition de loi |
| `document.provenance` | 99% | texte | Texte Déposé |
| `document.titres` | 100% | objet |  |
| `document.titres.titrePrincipal` | 100% | texte | proposition de loi tendant à renforcer l'intervention du mai |
| `document.titres.titrePrincipalCourt` | 100% | texte | Intervention du maire dans la lutte contre les espèces exoti |
| `document.divisions` | 100% | null, objet |  |
| `document.dossierRef` | 100% | texte | DLR5L15N37420 |
| `document.redacteur` | 100% | null |  |
| `document.classification` | 100% | objet |  |
| `document.classification.famille` | 100% | objet |  |
| `document.classification.famille.depot` | 100% | objet |  |
| `document.classification.famille.depot.code` | 100% | texte | INITNAV |
| `document.classification.famille.depot.libelle` | 100% | texte | Initiative en Navette |
| `document.classification.famille.classe` | 100% | objet |  |
| `document.classification.famille.classe.code` | 100% | texte | PIONLOI |
| `document.classification.famille.classe.libelle` | 100% | texte | Proposition de loi |
| `document.classification.type` | 100% | objet |  |
| `document.classification.type.code` | 100% | texte | PION |
| `document.classification.type.libelle` | 100% | texte | Proposition de loi |
| `document.classification.sousType` | 100% | null, objet |  |
| `document.classification.statutAdoption` | 100% | null, texte | ADOPTSEANCE |
| `document.auteurs` | 100% | objet |  |
| `document.auteurs.auteur` | 100% | liste, objet |  |
| `document.auteurs.auteur.organe` | 59% | objet |  |
| `document.auteurs.auteur.organe.organeRef` | 59% | texte | PO791932 |
| `document.organesReferents` | 82% | null, objet |  |
| `document.organesReferents.organeRef` | 71% | liste, texte | PO59051 |
| `document.correction` | 100% | null, objet |  |
| `document.correction.typeCorrection` | 1% | texte | Rectifié |
| `document.correction.niveauCorrection` | 1% | texte | 1 |
| `document.notice` | 100% | objet |  |
| `document.notice.numNotice` | 99% | texte | 97 |
| `document.notice.formule` | 99% | texte | , adoptée par le Sénat, tendant à renforcer l'intervention d |
| `document.notice.adoptionConforme` | 100% | texte | false |
| `document.indexation` | 100% | null |  |
| `document.imprimerie` | 100% | objet |  |
| `document.imprimerie.ISSN` | 100% | null |  |
| `document.imprimerie.ISBN` | 100% | null |  |
| `document.imprimerie.DIAN` | 100% | null, texte | 96/2025 |
| `document.imprimerie.nbPage` | 100% | null, texte | 0 |
| `document.imprimerie.prix` | 100% | null, texte | 0.75 |
| `document.coSignataires` | 82% | null, objet |  |
| `document.depotAmendements` | 82% | null, objet |  |
| `document.depotAmendements.amendementsSeance` | 78% | objet |  |
| `document.depotAmendements.amendementsSeance.amendable` | 78% | texte | false |
| `document.depotAmendements.amendementsSeance.dateLimiteDepot` | 78% | null |  |
| `document.depotAmendements.amendementsCommission` | 47% | objet |  |
| `document.depotAmendements.amendementsCommission.commission` | 47% | liste, objet |  |
| `document.depotAmendements.amendementsCommission.commission.organeRef` | 47% | texte | PO59051 |
| `document.depotAmendements.amendementsCommission.commission.amendable` | 47% | texte | true |
| `document.depotAmendements.amendementsCommission.commission.dateLimiteDepot` | 47% | null |  |
| `document.auteurs.auteur.acteur` | 72% | objet |  |
| `document.auteurs.auteur.acteur.acteurRef` | 72% | texte | PA703510 |
| `document.auteurs.auteur.acteur.qualite` | 72% | texte | rapporteur |
| `document.rapportPublie` | 16% | texte | false |
| `document.coSignataires.coSignataire` | 24% | liste, objet |  |
| `document.coSignataires.coSignataire.acteur` | 24% | objet |  |
| `document.coSignataires.coSignataire.acteur.acteurRef` | 24% | texte | PA794734 |
| `document.coSignataires.coSignataire.dateCosignature` | 24% | texte | 2025-09-04+02:00 |
| `document.coSignataires.coSignataire.dateRetraitCosignature` | 24% | null, texte | 2025-06-25+02:00 |
| `document.coSignataires.coSignataire.edite` | 24% | texte | false |
| `document.classification.famille.espece` | 20% | objet |  |
| `document.classification.famille.espece.code` | 20% | texte | APPART341 |
| `document.classification.famille.espece.libelle` | 20% | texte | en application de Article 34-1 de la Constitution |
| `document.classification.sousType.code` | 20% | texte | APPART341 |
| `document.classification.sousType.libelle` | 20% | texte | en application de Article 34-1 de la Constitution |
| `document.classification.sousType.libelleEdition` | 11% | texte | constitutionnelle |
| `document.divisions.division` | 6% | liste, objet |  |
| `document.divisions.division.@xsi:type` | 6% | texte | rapportParlementaire_Type |
| `document.divisions.division.uid` | 6% | texte | RAPPANR5L17B1281-COMPA |
| `document.divisions.division.legislature` | 6% | texte | 17 |
| `document.divisions.division.cycleDeVie` | 6% | objet |  |
| `document.divisions.division.cycleDeVie.chrono` | 6% | objet |  |
| `document.divisions.division.cycleDeVie.chrono.dateCreation` | 6% | texte | 2025-04-11T00:00:00.000+02:00 |
| `document.divisions.division.cycleDeVie.chrono.dateDepot` | 6% | texte | 2025-04-11T00:00:00.000+02:00 |
| `document.divisions.division.cycleDeVie.chrono.datePublication` | 6% | null, texte | 2025-04-28T00:00:00.000+02:00 |
| `document.divisions.division.cycleDeVie.chrono.datePublicationWeb` | 6% | texte | 2025-04-16T11:58:00.000+02:00 |
| `document.divisions.division.denominationStructurelle` | 6% | texte | Annexe Texte comparatif COMPA |
| `document.divisions.division.titres` | 6% | objet |  |
| `document.divisions.division.titres.titrePrincipal` | 6% | texte | Texte comparatif |
| `document.divisions.division.titres.titrePrincipalCourt` | 6% | texte | Soins palliatifs et d’accompagnement |
| `document.divisions.division.divisions` | 6% | null |  |
| `document.divisions.division.dossierRef` | 6% | texte | DLR5L17N51672 |
| `document.divisions.division.redacteur` | 6% | null |  |
| `document.divisions.division.classification` | 6% | objet |  |
| `document.divisions.division.classification.famille` | 6% | null |  |
| `document.divisions.division.classification.type` | 6% | objet |  |
| `document.divisions.division.classification.type.code` | 6% | texte | RAPP |
| `document.divisions.division.classification.type.libelle` | 6% | texte | Rapport |
| `document.divisions.division.classification.sousType` | 6% | null, objet |  |
| `document.divisions.division.classification.sousType.code` | 6% | texte | COMPA |
| `document.divisions.division.classification.sousType.libelle` | 6% | texte | Texte comparatif |
| `document.divisions.division.classification.statutAdoption` | 6% | null, texte | ADOPTCOM |
| `document.divisions.division.auteurs` | 6% | objet |  |
| `document.divisions.division.auteurs.auteur` | 6% | liste, objet |  |
| `document.divisions.division.auteurs.auteur.acteur` | 6% | objet |  |
| `document.divisions.division.auteurs.auteur.acteur.acteurRef` | 6% | texte | PA722102 |
| `document.divisions.division.auteurs.auteur.acteur.qualite` | 6% | texte | rapporteur |
| `document.divisions.division.auteurs.auteur.organe` | 6% | objet |  |
| `document.divisions.division.auteurs.auteur.organe.organeRef` | 6% | texte | PO420120 |
| `document.divisions.division.correction` | 6% | null, objet |  |
| `document.divisions.division.notice` | 6% | objet |  |
| `document.divisions.division.notice.numNotice` | 6% | texte | 1281 |
| `document.divisions.division.notice.formule` | 6% | texte | sur la proposition de loi de Mme Annie Vidal relative aux so |
| `document.divisions.division.notice.adoptionConforme` | 6% | texte | false |
| `document.divisions.division.indexation` | 6% | null |  |
| `document.divisions.division.imprimerie` | 6% | objet |  |
| `document.divisions.division.imprimerie.ISSN` | 6% | null |  |
| `document.divisions.division.imprimerie.ISBN` | 6% | null |  |
| `document.divisions.division.imprimerie.DIAN` | 6% | null |  |
| `document.divisions.division.imprimerie.nbPage` | 6% | texte | 0 |
| `document.divisions.division.imprimerie.prix` | 6% | null, texte | 5.900000095367432 |
| `document.divisions.division.rapportPublie` | 6% | texte | false |
| `document.divisions.division.correction.typeCorrection` | 0% | texte | Rectifié |
| `document.divisions.division.correction.niveauCorrection` | 0% | texte | 1 |
| `document.divisions.division.organesReferents` | 0% | objet |  |
| `document.divisions.division.organesReferents.organeRef` | 0% | texte | PO59048 |
| `document.divisions.division.coSignataires` | 0% | null |  |
| `document.divisions.division.depotAmendements` | 0% | null |  |
| `document.divisions.division.classification.sousType.libelleEdition` | 1% | texte | d'enquête |
| `document.coSignataires.coSignataire.organe` | 0% | objet |  |
| `document.coSignataires.coSignataire.organe.organeRef` | 0% | texte | PO77710 |
| `document.coSignataires.coSignataire.organe.etApparentes` | 0% | texte | true |

</details>

<details><summary>Structure de <code>json/dossierParlementaire/<id>.json</code> (145 chemins, échantillon de 404 fichiers, 8 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `dossierParlementaire` | 100% | objet |  |
| `dossierParlementaire.@xsi:type` | 100% | texte | DossierMissionControle_Type |
| `dossierParlementaire.uid` | 100% | texte | DLR5L17N52422 |
| `dossierParlementaire.legislature` | 100% | texte | 17 |
| `dossierParlementaire.titreDossier` | 100% | objet |  |
| `dossierParlementaire.titreDossier.titre` | 100% | texte | Les dépenses de soutien aux aéroports |
| `dossierParlementaire.titreDossier.titreChemin` | 100% | null, texte | depenses_soutien_aeroports |
| `dossierParlementaire.titreDossier.senatChemin` | 100% | null, texte | http://www.senat.fr/dossier-legislatif/ppl22-545.html |
| `dossierParlementaire.procedureParlementaire` | 100% | objet |  |
| `dossierParlementaire.procedureParlementaire.code` | 100% | texte | 19 |
| `dossierParlementaire.procedureParlementaire.libelle` | 100% | texte | Rapport d'information sans mission |
| `dossierParlementaire.initiateur` | 100% | null, objet |  |
| `dossierParlementaire.actesLegislatifs` | 100% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif` | 100% | liste, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.@xsi:type` | 100% | texte | Etape_Type |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.uid` | 100% | texte | L17-AN20-52422 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.codeActe` | 100% | texte | AN20 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.libelleActe` | 100% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.libelleActe.nomCanonique` | 100% | texte | Travaux |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.organeRef` | 100% | texte | PO838901 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.dateActe` | 100% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs` | 100% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif` | 100% | liste, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.@xsi:type` | 100% | texte | DepotRapport_Type |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.uid` | 100% | texte | L17-VD226967 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.codeActe` | 100% | texte | AN20-RAPPORT |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe` | 100% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe.nomCanonique` | 100% | texte | Dépôt de rapport |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe.libelleCourt` | 100% | texte | Dépôt de rapport |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.organeRef` | 100% | texte | PO59048 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.dateActe` | 100% | null, texte | 2025-07-02T00:00:00.000+02:00 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs` | 100% | null, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.texteAssocie` | 99% | texte | RINFANR5L17B1659 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.texteAdopte` | 8% | null |  |
| `dossierParlementaire.fusionDossier` | 100% | null |  |
| `dossierParlementaire.initiateur.acteurs` | 91% | objet |  |
| `dossierParlementaire.initiateur.acteurs.acteur` | 91% | liste, objet |  |
| `dossierParlementaire.initiateur.acteurs.acteur.acteurRef` | 91% | texte | PA736182 |
| `dossierParlementaire.initiateur.acteurs.acteur.mandatRef` | 91% | texte | PM736346 |
| `dossierParlementaire.initiateur.organes` | 23% | objet |  |
| `dossierParlementaire.initiateur.organes.organe` | 23% | objet |  |
| `dossierParlementaire.initiateur.organes.organe.organeRef` | 23% | objet |  |
| `dossierParlementaire.initiateur.organes.organe.organeRef.uid` | 23% | texte | PO78718 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.libelleActe.libelleCourt` | 75% | texte | 1ère lecture |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif` | 88% | liste, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.@xsi:type` | 88% | texte | Etape_Type |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.uid` | 88% | texte | L16-VD213034CF |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.codeActe` | 88% | texte | SN1-COM-FOND |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe` | 88% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe.nomCanonique` | 88% | texte | Travaux de la commission saisie au fond |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe.libelleCourt` | 88% | texte | Travaux de la commission saisie au fond |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.organeRef` | 88% | texte | PO211490 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.dateActe` | 88% | null, texte | 2023-06-13T00:00:00.000+02:00 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs` | 88% | null, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif` | 84% | liste, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.@xsi:type` | 84% | texte | SaisieComFond_Type |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.uid` | 84% | texte | L16-VD213034CFS |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.codeActe` | 84% | texte | SN1-COM-FOND-SAISIE |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe` | 84% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe.nomCanonique` | 84% | texte | Renvoi en commission au fond |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.libelleActe.libelleCourt` | 84% | texte | Renvoi en commission au fond |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.organeRef` | 84% | texte | PO211490 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.dateActe` | 84% | null, texte | 2023-04-21T00:00:00.000+02:00 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs` | 84% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.rapporteurs` | 22% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.rapporteurs.rapporteur` | 22% | liste, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.rapporteurs.rapporteur.acteurRef` | 22% | texte | PA736238 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.rapporteurs.rapporteur.typeRapporteur` | 22% | texte | rapporteur |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.reunion` | 22% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.texteAssocie` | 22% | texte | RAPPSNR5S399B0693 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.texteAdopte` | 22% | null, texte | PIONSNR5S399BTC0694 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion` | 18% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion.fam_code` | 18% | texte | TSORTF01 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion.libelle` | 18% | texte | adoptée |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.reunionRef` | 21% | null, texte | RUANR5L17S2025IDS29594 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.voteRefs` | 19% | null, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.textesAssocies` | 18% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.textesAssocies.texteAssocie` | 18% | liste, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.textesAssocies.texteAssocie.typeTexte` | 18% | texte | BTA |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.textesAssocies.texteAssocie.refTexteAssocie` | 18% | texte | PIONSNR5S399BTA0132 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.provenance` | 15% | texte | PO78718 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.depotInitialLectureDefinitiveRef` | 15% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.reunionRef` | 15% | null, texte | RUANR5L16S2024IDC452455 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.odjRef` | 15% | texte | RUANR5L16S2024IDC452455PT34024 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.odjRef` | 17% | texte | RUANR5L17S2025IDS29594PT50448 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.voteRefs.voteRef` | 6% | texte | VTANR5L17V2873 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.texteLoiRef` | 3% | texte | PRJLANR5L17BTA0157 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.infoJO` | 4% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.infoJO.typeJO` | 4% | texte | JO_LOI_DECRET |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.infoJO.dateJO` | 4% | texte | 2025-07-16+02:00 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.infoJO.pageJO` | 4% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.infoJO.numJO` | 4% | texte | 163 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.infoJO.urlLegifrance` | 4% | texte | http://www.legifrance.gouv.fr/WAspad/UnTexteDeJorf?numjo=ATD |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.infoJO.referenceNOR` | 4% | texte | ATDB2507833L |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.urlEcheancierLoi` | 4% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.codeLoi` | 4% | texte | 2025-640 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.titreLoi` | 4% | texte | portant création de l’établissement public du commerce et de |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.dateRetrait` | 0% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.rapporteurs` | 2% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.rapporteurs.rapporteur` | 2% | liste, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.rapporteurs.rapporteur.acteurRef` | 2% | texte | PA721896 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.rapporteurs.rapporteur.typeRapporteur` | 2% | texte | rapporteur |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.reunion` | 2% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.texteAssocie` | 2% | texte | RAPPANR5L17B2998 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.texteAdopte` | 2% | null, texte | PRJLSNR5S479BTC0869 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.initiateurs` | 0% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.initiateurs.organeRef` | 0% | texte | PO874520 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.initiateur` | 1% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.initiateur.acteurs` | 1% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.initiateur.acteurs.acteur` | 1% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.initiateur.acteurs.acteur.acteurRef` | 1% | texte | PA643210 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.initiateur.acteurs.acteur.mandatRef` | 1% | texte | PM873637 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion` | 1% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion.fam_code` | 1% | texte | TCCMP01 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion.libelle` | 1% | texte | Accord |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.reunionRef` | 1% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.voteRefs` | 1% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.casSaisine` | 1% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.casSaisine.fam_code` | 1% | texte | TSCCONT07 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.casSaisine.libelle` | 1% | texte | De droit (article 61 alinéa 1 de la Constitution) |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.initiateurs` | 1% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.motif` | 1% | texte | En application de l'article 61§2 de la Constitution |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.urlConclusion` | 1% | texte | http://www.conseil-constitutionnel.fr/decision/2026/2026908D |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.numDecision` | 1% | texte | 908 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.anneeDecision` | 1% | texte | 2026 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.decision` | 0% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.decision.fam_code` | 0% | texte | TSORTMOT02 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.decision.libelle` | 0% | texte | Motion rejetée |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.odSeancejRef` | 0% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.voteRefs` | 1% | null, objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.voteRefs.voteRef` | 0% | texte | VTANR5L17V693 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.decision` | 0% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.decision.fam_code` | 0% | texte | TSORTMOT02 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.decision.libelle` | 0% | texte | Motion rejetée |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.odSeancejRef` | 0% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.dateRetrait` | 0% | null |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.typeDeclaration` | 0% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.typeDeclaration.fam_code` | 0% | texte | Art.49.3 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.typeDeclaration.libelle` | 0% | texte | Déclaration engageant la responsabilité du Gouvernement deva |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion` | 0% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion.fam_code` | 0% | texte | TMRC01 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.statutConclusion.libelle` | 0% | texte | rejet du texte par la commission préalable |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.contributionInternaute` | 1% | objet |  |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.contributionInternaute.dateOuverture` | 1% | texte | 2026-02-14+01:00 |
| `dossierParlementaire.actesLegislatifs.acteLegislatif.actesLegislatifs.acteLegislatif.contributionInternaute.dateFermeture` | 1% | texte | 2026-04-16+02:00 |

</details>

### Amendements

- Producteur : Assemblée nationale · licence : Licence ouverte
- URL : <https://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip>
- Fichier : `data/raw/Amendements.json.zip` · 310,2 Mo · SHA-256 `ef646e61a3f9cd1e…`
- Dernière modification côté serveur : Wed, 07 Oct 2026 06:24:54 GMT · téléchargé le 2026-10-07T09:55:26+00:00
- Contenu : 128 762 fichiers JSON (867,1 Mo décompressés)

**Mesures**

- amendements : 128 762
- repartition dossiers : rangés par dossier : 128 613 · incorrect_data : 149
- par legislature : 17 : 128 762
- premier depot : 2024-09-18
- dernier depot : 2026-10-07
- sorts :  : 58 273 · Rejeté : 30 211 · Adopté : 16 775 · Tombé : 11 574 · Non soutenu : 7 537 · Retiré : 4 392
- etats : Discuté : 70 489 · En traitement : 16 905 · Irrecevable : 11 718 · A discuter : 10 925 · Irrecevable 40 : 10 184 · Retiré : 8 537 · effacé : 4
- types d auteur : Député : 119 572 · Rapporteur : 7 705 · Gouvernement : 1 485
- textes vises : 603
- textes vises introuvables dans les documents : 4

| Groupe de fichiers | Fichiers | Décompressé | Formes d'identifiant |
|---|---|---|---|
| `json/<id>/<id>/<id>.json` | 128 613 | 866,0 Mo | `AMANR9L9PO9B9P9D9N9` (84 732), `AMANR9L9PO9BTC9P9D9N9` (43 881) |
| `json/incorrect_data/<id>/<id>.json` | 149 | 1,0 Mo | `AMANR9L9PO9BTC9P9D9N9` (75), `AMANR9L9PO9B9P9D9N9` (74) |

<details><summary>Structure de <code>json/<id>/<id>/<id>.json</code> (134 chemins, échantillon de 401 fichiers, 2 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `amendement` | 100% | objet |  |
| `amendement.uid` | 100% | texte | AMANR5L17PO420120B2851P0D1N000002 |
| `amendement.chronotag` | 100% | texte | 1791299221440 |
| `amendement.legislature` | 100% | texte | 17 |
| `amendement.identification` | 100% | objet |  |
| `amendement.identification.numeroLong` | 100% | texte | AS2 |
| `amendement.identification.numeroOrdreDepot` | 100% | texte | 2 |
| `amendement.identification.prefixeOrganeExamen` | 100% | texte | CION-SOC |
| `amendement.identification.numeroRect` | 100% | texte | 0 |
| `amendement.examenRef` | 100% | texte | EXANR5L17PO420120B2851P0D1 |
| `amendement.texteLegislatifRef` | 100% | texte | PIONANR5L17B2851 |
| `amendement.triAmendement` | 100% | texte | eaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaae |
| `amendement.cardinaliteAmdtMultiples` | 100% | texte | 1 |
| `amendement.amendementParentRef` | 100% | nil (xsi), texte | AMANR5L17PO838901BTC2335P0D1N000073 |
| `amendement.signataires` | 100% | objet |  |
| `amendement.signataires.auteur` | 100% | objet |  |
| `amendement.signataires.auteur.typeAuteur` | 100% | texte | Député |
| `amendement.signataires.auteur.gouvernementRef` | 100% | nil (xsi), texte | PO873634 |
| `amendement.signataires.auteur.acteurRef` | 100% | nil (xsi), texte | PA793334 |
| `amendement.signataires.auteur.groupePolitiqueRef` | 100% | nil (xsi), texte | PO845401 |
| `amendement.signataires.auteur.auteurRapporteurOrganeRef` | 100% | nil (xsi), texte | PO59048 |
| `amendement.signataires.cosignataires` | 100% | nil (xsi), objet |  |
| `amendement.signataires.cosignataires.acteurRef` | 72% | liste, texte | PA842279 |
| `amendement.signataires.suffixe` | 100% | nil (xsi), texte | et les membres du groupe Socialistes et apparentés |
| `amendement.signataires.libelle` | 100% | texte | M.&#160;Tribuiani,  Mme&#160;Bamana, M.&#160;Bentz, M.&#160; |
| `amendement.pointeurFragmentTexte` | 100% | objet |  |
| `amendement.pointeurFragmentTexte.partieAmendableRef` | 100% | nil (xsi) |  |
| `amendement.pointeurFragmentTexte.division` | 100% | objet |  |
| `amendement.pointeurFragmentTexte.division.titre` | 100% | texte | Article unique |
| `amendement.pointeurFragmentTexte.division.articleDesignationCourte` | 100% | texte | ART. UNIQUE |
| `amendement.pointeurFragmentTexte.division.articleDesignation` | 100% | texte | ARTICLE UNIQUE |
| `amendement.pointeurFragmentTexte.division.type` | 100% | texte | ARTICLE |
| `amendement.pointeurFragmentTexte.division.avant_A_Apres` | 100% | texte | A |
| `amendement.pointeurFragmentTexte.division.divisionRattachee` | 100% | nil (xsi), texte | ARTICLE 42 |
| `amendement.pointeurFragmentTexte.division.articleAdditionnel` | 100% | texte | false |
| `amendement.pointeurFragmentTexte.division.chapitreAdditionnel` | 100% | texte | false |
| `amendement.pointeurFragmentTexte.division.urlDivisionTexteVise` | 100% | texte | /17/textes/2851.asp#D_Article_unique |
| `amendement.pointeurFragmentTexte.amendementStandard` | 86% | objet |  |
| `amendement.pointeurFragmentTexte.amendementStandard.alinea` | 86% | nil (xsi), objet |  |
| `amendement.pointeurFragmentTexte.amendementStandard.alinea.avant_A_Apres` | 43% | nil (xsi), texte | Apres |
| `amendement.pointeurFragmentTexte.amendementStandard.alinea.numero` | 43% | texte | 2 |
| `amendement.pointeurFragmentTexte.amendementStandard.alinea.alineaDesignation` | 43% | texte | Après l'alinéa 2 |
| `amendement.corps` | 100% | objet |  |
| `amendement.corps.cartoucheInformatif` | 100% | nil (xsi), texte | Cet amendement a été déclaré irrecevable au titre de l’artic |
| `amendement.corps.contenuAuteur` | 100% | nil (xsi), objet |  |
| `amendement.corps.contenuAuteur.dispositif` | 67% | texte | &lt;p style="text-align: justify;">I.&nbsp;&#x2013;&nbsp;Apr&#x |
| `amendement.corps.contenuAuteur.avantAppel` | 79% | nil (xsi) |  |
| `amendement.corps.contenuAuteur.exposeSommaire` | 79% | texte | &lt;p style="text-align: justify;">Cet amendement vise &#x00E0; |
| `amendement.corps.contenuAuteur.annexeExposeSommaire` | 79% | nil (xsi) |  |
| `amendement.cycleDeVie` | 100% | objet |  |
| `amendement.cycleDeVie.dateDepot` | 100% | nil (xsi), texte | 2026-09-29 |
| `amendement.cycleDeVie.datePublication` | 100% | nil (xsi), texte | 2026-10-06 |
| `amendement.cycleDeVie.soumisArticle40` | 100% | texte | false |
| `amendement.cycleDeVie.etatDesTraitements` | 100% | objet |  |
| `amendement.cycleDeVie.etatDesTraitements.etat` | 100% | objet |  |
| `amendement.cycleDeVie.etatDesTraitements.etat.code` | 100% | texte | DI |
| `amendement.cycleDeVie.etatDesTraitements.etat.libelle` | 100% | texte | Discuté |
| `amendement.cycleDeVie.etatDesTraitements.sousEtat` | 100% | nil (xsi), objet |  |
| `amendement.cycleDeVie.etatDesTraitements.sousEtat.code` | 83% | texte | DI |
| `amendement.cycleDeVie.etatDesTraitements.sousEtat.libelle` | 83% | texte | Rejeté |
| `amendement.cycleDeVie.dateSort` | 100% | nil (xsi), texte | 2026-10-06T17:06:55+02:00 |
| `amendement.cycleDeVie.sort` | 100% | nil (xsi), texte | Rejeté |
| `amendement.representations` | 100% | objet |  |
| `amendement.representations.representation` | 100% | objet |  |
| `amendement.representations.representation.nom` | 100% | texte | PDF |
| `amendement.representations.representation.typeMime` | 100% | objet |  |
| `amendement.representations.representation.typeMime.type` | 100% | texte | application |
| `amendement.representations.representation.typeMime.subType` | 100% | texte | PDF |
| `amendement.representations.representation.statutRepresentation` | 100% | objet |  |
| `amendement.representations.representation.statutRepresentation.verbatim` | 100% | texte | true |
| `amendement.representations.representation.statutRepresentation.canonique` | 100% | texte | true |
| `amendement.representations.representation.statutRepresentation.officielle` | 100% | texte | true |
| `amendement.representations.representation.statutRepresentation.transcription` | 100% | texte | false |
| `amendement.representations.representation.statutRepresentation.enregistrement` | 100% | texte | false |
| `amendement.representations.representation.repSource` | 100% | nil (xsi) |  |
| `amendement.representations.representation.offset` | 100% | nil (xsi) |  |
| `amendement.representations.representation.contenu` | 100% | objet |  |
| `amendement.representations.representation.contenu.documentURI` | 100% | texte | /base/AMANR5L17PO420120B2851P0D1N000002?format=pdf |
| `amendement.representations.representation.dateDispoRepresentation` | 100% | nil (xsi) |  |
| `amendement.seanceDiscussionRef` | 100% | nil (xsi), texte | RUANR5L17S2025IDS29361 |
| `amendement.article99` | 100% | texte | false |
| `amendement.loiReference` | 100% | nil (xsi), objet |  |
| `amendement.discussionCommune` | 100% | nil (xsi), objet |  |
| `amendement.discussionIdentique` | 100% | nil (xsi), objet |  |
| `amendement.accordGouvernementDepotHorsDelai` | 100% | texte | Sans objet |
| `amendement.loiReference.codeLoi` | 55% | nil (xsi), null, texte | 1 |
| `amendement.loiReference.divisionCodeLoi` | 55% | nil (xsi), null, texte | L912-1-2 |
| `amendement.discussionCommune.idDiscussion` | 20% | texte | 28580 |
| `amendement.discussionCommune.typePosition` | 20% | texte | Milieu |
| `amendement.discussionIdentique.idDiscussion` | 19% | texte | 75076 |
| `amendement.discussionIdentique.typePosition` | 19% | texte | Milieu |
| `amendement.pointeurFragmentTexte.missionVisee` | 16% | objet |  |
| `amendement.pointeurFragmentTexte.missionVisee.codeEtat` | 16% | texte | B |
| `amendement.pointeurFragmentTexte.missionVisee.codeMissionMinefi` | 16% | texte | JA |
| `amendement.pointeurFragmentTexte.missionVisee.libelleMission` | 16% | texte | Justice |
| `amendement.pointeurFragmentTexte.missionVisee.missionRef` | 16% | texte | 2876 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF` | 12% | objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes` | 12% | objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme` | 12% | liste, objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.libelle` | 12% | texte | Justice judiciaire |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.programmeRef` | 12% | texte | 518970 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.autorisationEngagement` | 12% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.creditPaiement` | 12% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.action` | 12% | texte | modification |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.lignesCredits` | 12% | nil (xsi), objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.soldeAE` | 12% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.soldeCP` | 12% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.cpEgalAe` | 12% | texte | true |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.lignesCredits.ligneCredit` | 0% | objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.lignesCredits.ligneCredit.id` | 0% | texte | 20415 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.lignesCredits.ligneCredit.libelle` | 0% | texte | dont titre 2 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.lignesCredits.ligneCredit.autorisationEngagement` | 0% | texte | -1480000000 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.lignesCredits.ligneCredit.creditPaiement` | 0% | texte | -1480000000 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLF.listeProgrammes.programme.lignesCredits.ligneCredit.action` | 0% | texte | modification |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR` | 0% | objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes` | 0% | objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme` | 0% | liste, objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme.libelle` | 0% | texte | Concours financiers aux collectivités territoriales et à leu |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme.programmeRef` | 0% | texte | 671329 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme.autorisationEngagementSupplementaire` | 0% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme.creditPaiementSupplementaire` | 0% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme.autorisationEngagementAnnule` | 0% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme.creditPaiementAnnule` | 0% | texte | -40000000 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme.action` | 0% | texte | modification |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.listeProgrammes.programme.lignesCredits` | 0% | nil (xsi) |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.totalAE` | 0% | objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.totalAE.supplementaire` | 0% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.totalAE.annule` | 0% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.totalAE.solde` | 0% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.totalCP` | 0% | objet |  |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.totalCP.supplementaire` | 0% | texte | 0 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.totalCP.annule` | 0% | texte | -65356965 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.totalCP.solde` | 0% | texte | 65356965 |
| `amendement.corps.contenuAuteur.dispositifAmdtCreditPLFR.cpEgalAe` | 0% | texte | false |

</details>

<details><summary>Structure de <code>json/incorrect_data/<id>/<id>.json</code> (91 chemins, échantillon de 149 fichiers, 0 chemins tantôt objet, tantôt liste)</summary>

| Chemin | Présence | Types | Exemple |
|---|---|---|---|
| `amendement` | 100% | objet |  |
| `amendement.uid` | 100% | texte | AMANR5L17PO838901BTC2202P0D1N000015 |
| `amendement.chronotag` | 100% | texte | 1779114340700 |
| `amendement.legislature` | 100% | texte | 17 |
| `amendement.identification` | 100% | objet |  |
| `amendement.identification.numeroLong` | 100% | texte | 15 |
| `amendement.identification.numeroOrdreDepot` | 100% | texte | 15 |
| `amendement.identification.prefixeOrganeExamen` | 100% | texte | AN |
| `amendement.identification.numeroRect` | 100% | texte | 0 |
| `amendement.examenRef` | 100% | texte | EXANR5L17PO838901BTC2202P0D1 |
| `amendement.texteLegislatifRef` | 100% | texte | PIONANR5L17BTC2202 |
| `amendement.triAmendement` | 100% | texte | baaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaayq |
| `amendement.cardinaliteAmdtMultiples` | 100% | texte | 1 |
| `amendement.amendementParentRef` | 100% | nil (xsi), texte | AMANR5L17PO838901BTC2202P0D1N000032 |
| `amendement.signataires` | 100% | objet |  |
| `amendement.signataires.auteur` | 100% | objet |  |
| `amendement.signataires.auteur.typeAuteur` | 100% | texte | Député |
| `amendement.signataires.auteur.gouvernementRef` | 100% | nil (xsi), texte | PO847639 |
| `amendement.signataires.auteur.acteurRef` | 100% | nil (xsi), texte | PA719798 |
| `amendement.signataires.auteur.groupePolitiqueRef` | 100% | nil (xsi), texte | PO845407 |
| `amendement.signataires.auteur.auteurRapporteurOrganeRef` | 100% | nil (xsi) |  |
| `amendement.signataires.cosignataires` | 100% | nil (xsi), objet |  |
| `amendement.signataires.suffixe` | 100% | nil (xsi), texte | et les membres du groupe Rassemblement National |
| `amendement.signataires.libelle` | 100% | texte | M.&#160;Labaronne |
| `amendement.pointeurFragmentTexte` | 100% | objet |  |
| `amendement.pointeurFragmentTexte.partieAmendableRef` | 100% | nil (xsi) |  |
| `amendement.pointeurFragmentTexte.division` | 100% | objet |  |
| `amendement.pointeurFragmentTexte.division.titre` | 100% | texte | Article PREMIER |
| `amendement.pointeurFragmentTexte.division.articleDesignationCourte` | 100% | texte | ART. PREMIER |
| `amendement.pointeurFragmentTexte.division.articleDesignation` | 100% | texte | ARTICLE PREMIER |
| `amendement.pointeurFragmentTexte.division.type` | 100% | texte | ARTICLE |
| `amendement.pointeurFragmentTexte.division.avant_A_Apres` | 100% | texte | A |
| `amendement.pointeurFragmentTexte.division.divisionRattachee` | 100% | nil (xsi) |  |
| `amendement.pointeurFragmentTexte.division.articleAdditionnel` | 100% | texte | false |
| `amendement.pointeurFragmentTexte.division.chapitreAdditionnel` | 100% | texte | false |
| `amendement.pointeurFragmentTexte.division.urlDivisionTexteVise` | 100% | texte | /17/textes/2202.asp#D_Article_1er |
| `amendement.pointeurFragmentTexte.amendementStandard` | 100% | objet |  |
| `amendement.pointeurFragmentTexte.amendementStandard.alinea` | 100% | nil (xsi), objet |  |
| `amendement.pointeurFragmentTexte.amendementStandard.alinea.avant_A_Apres` | 58% | nil (xsi), texte | Apres |
| `amendement.pointeurFragmentTexte.amendementStandard.alinea.numero` | 58% | texte | 10 |
| `amendement.pointeurFragmentTexte.amendementStandard.alinea.alineaDesignation` | 58% | texte | Alinéa 10 |
| `amendement.corps` | 100% | objet |  |
| `amendement.corps.cartoucheInformatif` | 100% | nil (xsi), texte | Sous réserve de son traitement par les services de l'Assembl |
| `amendement.corps.contenuAuteur` | 100% | nil (xsi), objet |  |
| `amendement.corps.contenuAuteur.dispositif` | 97% | texte | &lt;p style="text-align: justify;">Supprimer l&#x2019;alin&#x00 |
| `amendement.corps.contenuAuteur.avantAppel` | 97% | nil (xsi) |  |
| `amendement.corps.contenuAuteur.exposeSommaire` | 97% | texte | &lt;p>Il existe aujourd&#x2019;hui un dialogue au niveau local  |
| `amendement.corps.contenuAuteur.annexeExposeSommaire` | 97% | nil (xsi) |  |
| `amendement.cycleDeVie` | 100% | objet |  |
| `amendement.cycleDeVie.dateDepot` | 100% | texte | 2025-12-08 |
| `amendement.cycleDeVie.datePublication` | 100% | texte | 2026-05-13 |
| `amendement.cycleDeVie.soumisArticle40` | 100% | texte | false |
| `amendement.cycleDeVie.etatDesTraitements` | 100% | objet |  |
| `amendement.cycleDeVie.etatDesTraitements.etat` | 100% | objet |  |
| `amendement.cycleDeVie.etatDesTraitements.etat.code` | 100% | texte | AC |
| `amendement.cycleDeVie.etatDesTraitements.etat.libelle` | 100% | texte | A discuter |
| `amendement.cycleDeVie.etatDesTraitements.sousEtat` | 100% | nil (xsi), objet |  |
| `amendement.cycleDeVie.dateSort` | 100% | nil (xsi), texte | 2024-11-07T10:27:20+01:00 |
| `amendement.cycleDeVie.sort` | 100% | nil (xsi), texte | Adopté |
| `amendement.representations` | 100% | objet |  |
| `amendement.representations.representation` | 100% | objet |  |
| `amendement.representations.representation.nom` | 100% | texte | PDF |
| `amendement.representations.representation.typeMime` | 100% | objet |  |
| `amendement.representations.representation.typeMime.type` | 100% | texte | application |
| `amendement.representations.representation.typeMime.subType` | 100% | texte | PDF |
| `amendement.representations.representation.statutRepresentation` | 100% | objet |  |
| `amendement.representations.representation.statutRepresentation.verbatim` | 100% | texte | true |
| `amendement.representations.representation.statutRepresentation.canonique` | 100% | texte | true |
| `amendement.representations.representation.statutRepresentation.officielle` | 100% | texte | true |
| `amendement.representations.representation.statutRepresentation.transcription` | 100% | texte | false |
| `amendement.representations.representation.statutRepresentation.enregistrement` | 100% | texte | false |
| `amendement.representations.representation.repSource` | 100% | nil (xsi) |  |
| `amendement.representations.representation.offset` | 100% | nil (xsi) |  |
| `amendement.representations.representation.contenu` | 100% | objet |  |
| `amendement.representations.representation.contenu.documentURI` | 100% | texte | /base/AMANR5L17PO838901BTC2202P0D1N000015?format=pdf |
| `amendement.representations.representation.dateDispoRepresentation` | 100% | nil (xsi) |  |
| `amendement.seanceDiscussionRef` | 100% | nil (xsi), texte | RUANR5L17S2026IDS30404 |
| `amendement.article99` | 100% | texte | false |
| `amendement.loiReference` | 100% | nil (xsi), objet |  |
| `amendement.loiReference.codeLoi` | 58% | texte | 0 |
| `amendement.loiReference.divisionCodeLoi` | 58% | nil (xsi), texte | 235 ter ZH |
| `amendement.discussionCommune` | 100% | nil (xsi), objet |  |
| `amendement.discussionIdentique` | 100% | nil (xsi), objet |  |
| `amendement.accordGouvernementDepotHorsDelai` | 100% | texte | Sans objet |
| `amendement.discussionIdentique.idDiscussion` | 23% | texte | 85523 |
| `amendement.discussionIdentique.typePosition` | 23% | texte | Premier |
| `amendement.signataires.cosignataires.acteurRef` | 69% | liste, texte | PA841067 |
| `amendement.discussionCommune.idDiscussion` | 15% | texte | 35541 |
| `amendement.discussionCommune.typePosition` | 15% | texte | Premier |
| `amendement.cycleDeVie.etatDesTraitements.sousEtat.code` | 38% | texte | IR |
| `amendement.cycleDeVie.etatDesTraitements.sousEtat.libelle` | 38% | texte | Charge |

</details>

### Base officielle des codes postaux

- Producteur : La Poste (via data.gouv.fr) · licence : Licence ouverte 2.0
- URL : <https://data.laposte.fr/data-fair/api/v1/datasets/laposte-hexasmal/raw>
- Fichier : `data/raw/laposte_hexasmal.csv` · 1,6 Mo · SHA-256 `f921ac020ca3b9ef…`
- Dernière modification côté serveur : Tue, 08 Sep 2026 02:25:01 GMT · téléchargé le 2026-10-07T09:55:26+00:00
- Contenu : 39 192 lignes
- Encodage : ISO-8859-1 · séparateur `;`

**Mesures**

- lignes : 39 192
- communes : 35 007
- codes postaux : 6 328
- communes a plusieurs codes postaux : 394
- codes postaux a plusieurs communes : 4 205

| Colonne | Remplissage | Valeurs distinctes | Exemple |
|---|---|---|---|
| #Code_commune_INSEE | 100% | 35 007 | 01001 |
| Nom_de_la_commune | 100% | 32 715 | L ABERGEMENT CLEMENCIAT |
| Code_postal | 100% | 6 328 | 01400 |
| Libellé_d_acheminement | 100% | 32 861 | L ABERGEMENT CLEMENCIAT |
| Ligne_5 | 12% | 4 548 | ARBIGNIEU |

### Table de correspondance communes → circonscriptions législatives (mise à jour 2017)

- Producteur : Ministère de l'Intérieur (via data.gouv.fr) · licence : Licence ouverte
- URL : <https://static.data.gouv.fr/resources/circonscriptions-legislatives-table-de-correspondance-des-communes-et-des-cantons-pour-les-elections-legislatives-de-2012-et-sa-mise-a-jour-pour-les-elections-legislatives-2017/20170411-141128/Table_de_correspondance_circo_legislatives2017-1.xlsx>
- Fichier : `data/raw/Table_de_correspondance_circo_legislatives2017-1.xlsx` · 1,7 Mo · SHA-256 `46ff9b58d8ee4cb6…`
- Dernière modification côté serveur : Thu, 02 Jul 2026 15:21:44 GMT · téléchargé le 2026-10-07T09:58:14+00:00
- Contenu : 36 466 lignes

**Mesures**

- lignes : 36 466
- communes : 35 720
- communes sur plusieurs circonscriptions : 118
- circonscriptions : 577
- codes departement non numeriques : 2A, 2B, ZA, ZB, ZC, ZD, ZM, ZN, ZP, ZS, ZW, ZX, ZZ

Feuille « PR17_Découpage »

| Colonne | Remplissage | Valeurs distinctes | Exemple |
|---|---|---|---|
| CODE DPT | 100% | 107 | ZA |
| NOM DPT | 100% | 107 | Guadeloupe |
| CODE COMMUNE | 100% | 908 | 101 |
| NOM COMMUNE | 100% | 33 364 | Les Abymes |
| CODE CIRC LEGISLATIVE | 100% | 21 | 1 |
| CODE CANTON | 100% | 42 | 1 |
| NOM CANTON | 100% | 2 065 | Les Abymes-1 |

### Contours géographiques des circonscriptions législatives (précision 10 m)

- Producteur : data.gouv.fr · licence : Licence ouverte 2.0
- URL : <https://static.data.gouv.fr/resources/contours-geographiques-des-circonscriptions-legislatives/20240613-191520/circonscriptions-legislatives-p10.geojson>
- Fichier : `data/raw/circonscriptions-legislatives-p10.geojson` · 5,4 Mo · SHA-256 `971151f0f20c328c…`
- Dernière modification côté serveur : Thu, 02 Jul 2026 15:32:08 GMT · téléchargé le 2026-10-07T09:55:29+00:00
- Contenu : 559 entités
- Géométries : Polygon : 526 · MultiPolygon : 33

**Mesures**

- entites : 559
- circonscriptions : 559

| Colonne | Remplissage | Valeurs distinctes | Exemple |
|---|---|---|---|
| codeDepartement | 100% | 102 | 01 |
| nomDepartement | 100% | 102 | Ain |
| codeCirconscription | 100% | 559 | 0104 |
| nomCirconscription | 100% | 22 | 4ème circonscription |
