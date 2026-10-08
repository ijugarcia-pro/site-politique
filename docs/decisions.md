# Décisions

## 2026-10-07 · Direction visuelle : maquette V5 « Le 578e siège »
- Décision : Fredoka + Nunito, violet #7C4DFF ; pour #2F7BFF, contre #FF6A3D, abstention #FFC531, absent #DFE3EB. Navigation : Cette semaine · Mon hémicycle · Explorer.
- Raison : un ton accessible et ludique, loin de l'imagerie institutionnelle habituelle.
- Conséquence : toute donnée de maquette est marquée comme illustrative ; les couleurs de vote sont fixes dans tout le site.

## 2026-10-07 · Mode de vote hybride
- Décision : « Vote avant eux » pour les scrutins solennels (connus à l'avance par l'agenda) ; « Et toi, qu'aurais-tu voté ? » pour tous les autres votes.
- Raison : seuls les scrutins solennels sont annoncés assez tôt pour voter avant les députés.
- Conséquence : le pipeline doit lire l'agenda pour distinguer les deux modes.

## 2026-10-07 · Architecture statique pour les données publiques
- Décision : pipeline de nuit (GitHub Actions) → Python + DuckDB → JSON statiques → Cloudflare Pages ; pas de base de données dans ce chemin.
- Raison : simplicité, coût quasi nul, robustesse ; les données publiques changent peu.
- Conséquence : un build en échec ne publie rien ; le site reste sur la dernière version valide.

## 2026-10-07 · Calculs personnels dans le navigateur
- Décision : groupe le plus proche, jumeau et précision sont calculés côté navigateur ; les réponses sont en localStorage par défaut.
- Raison : les opinions politiques sont des données sensibles au sens du RGPD.
- Conséquence : aucune réponse ne quitte l'appareil sans consentement explicite.

## 2026-10-07 · Supabase limité aux usages utilisateur
- Décision : Supabase uniquement pour les comptes facultatifs, suivis, alertes, signalements et agrégats consentis ; e-mails via Brevo.
- Raison : garder la base hors du chemin des données publiques et minimiser les données personnelles.
- Conséquence : le site fonctionne intégralement sans compte ni base de données.

## 2026-10-07 · Vulgarisation automatique avec contrôles
- Décision : la question, « Concrètement » et les 3 cartes « Ce que ça change » sont rédigées par l'API Anthropic et publiées seulement si les 7 contrôles passent.
- Raison : vulgariser à l'échelle sans publier de texte inexact ou partisan.
- Conséquence : si un contrôle échoue, le vote est affiché sans cartes.

## 2026-10-07 · Lecture défensive des JSON de l'Assemblée
- Décision : l'appartenance d'un député à un groupe à la date d'un vote vient toujours des mandats GP (AMO30), jamais du `organeRef` de la ventilation du scrutin. Tout élément répétable est normalisé en liste, et les deux formes de nul (`null`, `{"@xsi:nil": "true"}`) sont traitées comme absentes.
- Raison : l'inventaire du 7 octobre 2026 a trouvé 14 scrutins dont les votes sont classés sous un organe `PO0` qui n'existe pas. Il a aussi montré que les listes à un seul élément deviennent des objets, et que les présidents de groupe ont deux mandats GP en cours (dédoublonnage par député).
- Conséquence : le pipeline reprend ces règles et les teste. Voir docs/inventaire-open-data.md.

## 2026-10-07 · Contourner le cache de l'open data de l'Assemblée
- Décision : toute requête vers `data.assemblee-nationale.fr` porte un paramètre anti-cache (`pipeline.an.sans_cache`). La date d'une version est le `Last-Modified` renvoyé par le serveur d'origine.
- Raison : le serveur garde les fichiers 4 h en cache. Le 7 octobre 2026, la requête simple renvoyait l'archive des scrutins de 04 h 26 GMT, alors que le serveur d'origine avait déjà celle de 10 h 26.
- Conséquence : sans ce paramètre, le pipeline de nuit pourrait publier des données vieilles de 4 h et dater faussement les versions.

## 2026-10-07 · Mesure du délai de publication par relevé horaire
- Décision : un workflow GitHub Actions relève toutes les heures la version de l'archive des scrutins (`scripts/mesurer_delai_publication.py`). Il commite directement sur `main` les mesures (`data/mesures/delai_publication/`, `docs/delai-publication.md`), seulement quand une nouvelle version apparaît.
- Raison : l'archive ne dit pas quand un scrutin y est entré, il faut donc l'observer. Dater chaque scrutin par le `Last-Modified` de la version rend la mesure indépendante du retard des tâches planifiées.
- Conséquence : le relevé ne démarre qu'une fois le workflow sur `main`. Il faut quelques semaines de suivi, avec plusieurs mardis de votes solennels, avant de trancher la formule du verdict. On arrêtera ensuite le workflow.

## 2026-10-07 · Code partagé dans pipeline/, scripts lancés en module
- Décision : le code commun vit dans `pipeline/` (d'abord `pipeline/an.py` : lecture des JSON de l'Assemblée et URL anti-cache). Les scripts se lancent avec `uv run python -m scripts.<nom>`, et pytest ajoute la racine du projet au chemin d'import.
- Raison : éviter de recopier les règles de lecture entre scripts et pipeline, et les tester une seule fois.
- Conséquence : un nouveau script importe `pipeline.*` au lieu de redéfinir ces fonctions.

## 2026-10-07 · Rattachement d'un scrutin à son dossier : trois méthodes combinées
- Décision : un scrutin est rattaché à son dossier législatif par `pipeline/rattachement.py`, dans cet ordre : l'amendement retrouvé dans l'archive des amendements (numéro, séance ou date, auteur), puis les actes du dossier qui citent le scrutin, puis le titre du texte cité dans le libellé, puis l'agenda de la séance. Le champ `objet.dossierLegislatif` du scrutin n'est pas utilisé. L'agenda seul ne rattache jamais une déclaration du Gouvernement ni une motion de censure.
- Raison : mesure de t06 sur les 8 560 scrutins. La combinaison rattache 99,8 % des scrutins, sans faux positif sur 97 vérifications à la main. Le champ déclaré n'est rempli que pour un tiers des scrutins, et il contient au moins une erreur (scrutin 6758).
- Conséquence : « Ce que ça change » est réservé aux votes sur l'ensemble d'un texte, une partie de budget ou une résolution, et, avec prudence, à un article (à trancher en t07). Ni les amendements, ni les motions de procédure, ni les votes sans texte n'en reçoivent en V1. Le pipeline peut publier sans l'archive des amendements (99,4 % de rattachement). Voir docs/rattachement.md.

## 2026-10-07 · Vulgarisation : modèle, contrôles figés, exécution dans GitHub Actions
- Décision : les fiches sont rédigées par Claude Opus 5.5 (effort `high`, sortie JSON imposée par un schéma, modèle de secours automatique en cas de refus). Les 7 contrôles sont figés dans docs/vulgarisation-controles.md. Chaque carte doit citer un article du texte voté, avec un extrait recopié mot pour mot. Le 7e contrôle est une relecture automatique séparée, qui ne voit que les articles cités et l'exposé des motifs. Les appels à l'API passent par un workflow GitHub Actions, où se trouve la clé ; elle n'est jamais sur un poste ni dans le dépôt.
- Raison : essai de t07 sur 5 textes. 3 fiches publiables, et 2 replis justifiés par de vraies inexactitudes repérées par la relecture. Coût : 1,02 $, soit 0,20 $ par texte et environ 2 $ par mois en production.
- Conséquence : t27 reprend `pipeline/vulgarisation.py`. Trois points restent à traiter : la relecture doit aussi vérifier que l'extrait appuie la carte ; le texte de commission mixte paritaire est incomplet ; le texte voté doit être choisi automatiquement. Le crédit de 4 € devra être rechargé avant le lancement.

## 2026-10-07 · Zéro euro : vulgarisation dans une session Claude Code hebdomadaire
- Décision (Julien) : le projet ne doit rien coûter. Aucun appel à l'API Anthropic, ni dans le pipeline ni dans GitHub Actions. Les fiches (question, « Concrètement », 3 cartes) et les thèmes sont rédigés pendant une session Claude Code hebdomadaire que Julien lance avec son abonnement. Julien relit et valide chaque fiche avant publication. Il sert ainsi de garde-fou. Les 7 contrôles restent obligatoires. Le 7e (fidélité) est fait par un agent séparé, dans la même session, qui ne voit que la fiche, les articles cités et l'exposé des motifs. Plus largement, chaque service utilisé doit rester dans son offre gratuite.
- Raison : budget nul. La relecture humaine hebdomadaire est en outre plus sûre qu'une publication automatique.
- Conséquence : cette décision remplace « Vulgarisation automatique avec contrôles » et la partie « API » de l'entrée précédente. Le workflow de l'essai et la dépendance `anthropic` sont supprimés. Le secret `ANTHROPIC_API_KEY` n'a plus d'usage et peut être révoqué. Une semaine sans session, les votes de la semaine s'affichent sans cartes (repli) : la séance reste automatique, seules les cartes en dépendent. Le planning est revu en conséquence : t27, t28, t29, t36, t16 et le principe 10.

## 2026-10-07 · Périmètre : un projet portfolio centré sur les données et le site
- Décision (Julien) : le projet est d'abord un projet de portfolio, sans vocation d'utilité publique pour l'instant. On se concentre sur les jeux de données, la normalisation et le build du site. Les fonctions centrées sur l'utilisateur sont reportées : comptes, suivis, e-mails, alertes, récap du dimanche, signalements, duel. Par défaut, quand personne n'intervient, le site montre les derniers votes, sans cartes si aucune fiche n'est validée. Le dépôt GitHub devient public.
- Raison : temps limité et budget nul. Les e-mails demanderaient en outre un nom de domaine payant (question ouverte 4).
- Conséquence : t30 à t33 et la partie « signalements » de t28 sont marquées reportées dans le planning, sans être supprimées. Supabase et Brevo ne sont pas mis en place. Un dépôt public dispose de minutes GitHub Actions illimitées et gratuites.

## 2026-10-07 · Porte t10 : go pour la phase 1, formule du verdict en suspens
- Décision (Julien) : go. La phase 1 (ingestion de nuit, normalisation, contrôles) démarre. La formule du verdict sera tranchée vers le 28 octobre 2026, une fois le délai de publication mesuré sur au moins trois mardis de votes solennels. D'ici là, la formule par défaut est « le verdict du matin ».
- Raison : docs/faisabilite.md. Le rattachement et la vulgarisation sont validés ; le délai ne touche que l'écran Verdict (t25, phase 3).
- Conséquence : t03 continue son relevé jusqu'au 28 octobre, et docs/faisabilite.md sera complété à cette date.

## 2026-10-07 · Ingestion de nuit : état versionné, fichiers bruts hors du dépôt
- Décision : `pipeline/ingest.py` tient l'état des sources dans `data/sources/etat.json`, versionné : empreinte SHA-256, date de modification, nuits d'échec d'affilée. Les fichiers bruts (environ 420 Mo) ne sont jamais versionnés. Ils passent d'une nuit à l'autre par le cache de GitHub Actions, et chaque nouvelle version est archivée 30 jours comme artefact du workflow. Une requête HEAD suffit à voir qu'une source n'a pas changé. Une archive régénérée à l'identique (même empreinte) n'est pas un changement. Une source requise en échec arrête le build et laisse la version publiée en ligne ; une source facultative (amendements, données géographiques) ne bloque rien. Au bout de 3 nuits d'échec d'affilée, une issue GitHub est ouverte.
- Raison : principe « pas d'usine à gaz ». Pas de stockage externe, et tout reste gratuit puisque le dépôt est public. L'empreinte, plutôt que la date, évite de tout recalculer quand l'Assemblée régénère une archive sans la modifier.
- Conséquence : la liste des sources vit dans `pipeline/sources.py`, partagée avec l'inventaire. Le workflow `nuit.yml` tourne à 6 h 11 UTC et n'enchaîne les étapes suivantes (t12 et après) que si une empreinte a changé.

## 2026-10-07 · Normalisation : prise de fonction, position des groupes recalculée
- Décision : un député est en exercice à la date d'un scrutin du jour de sa prise de fonction (`mandature.datePriseFonction`) au jour de fin de son mandat, inclus. La position d'un groupe est calculée par nous, à la majorité simple des voix nominatives (pour, contre, abstention) ; en cas d'égalité ou si personne n'a voté, il n'y a pas de position et donc pas de dissident. La « position majoritaire » publiée n'est gardée que pour comparaison. Pour une motion de censure, « absent » veut dire « n'a pas voté la censure ».
- Raison : mesures de t12 sur les 8 560 scrutins (docs/normalisation.md). Avec `dateDebut`, les suppléants seraient comptés dès l'élection de juillet 2024, d'où jusqu'à 637 députés en exercice. Avec la prise de fonction, aucun votant n'est hors mandat, et 8 559 scrutins sur 8 560 passent partition et totaux. La position publiée contredit parfois le décompte publié lui-même (2 pour et 17 contre donnent « pour » au scrutin 3008). Elle vaut aussi « pour » quand personne n'a voté.
- Conséquence : les effectifs de groupe publiés ne servent pas de référence stricte. Ils comptent les nouveaux députés avec retard et gardent les groupes dissous ; le contrôle des effectifs de t13 devra tolérer ces écarts documentés.

## 2026-10-07 · Les 6 contrôles : définitions retenues
- Décision (`pipeline/checks.py`) :
  - (1) partition et (2) totaux sont jugés par scrutin ; un échec met le scrutin de côté, sans arrêter le build ;
  - (3) les effectifs sont vérifiés entre deux sources de l'Assemblée : jamais plus de 577 députés ni moins de 540 en exercice, et aujourd'hui les mêmes députés et les mêmes groupes dans l'historique (AMO30) et dans la liste des députés en exercice (AMO10). La ventilation publiée des scrutins n'est pas une référence ;
  - (4) la non-régression compare l'empreinte de chaque scrutin publié (sort, et position de chaque député) à la référence versionnée `data/controles/publies.json`. Une disparition, une modification ou un scrutin publié puis mis de côté arrête le build, sauf dérogation écrite par Julien dans `data/controles/derogations.json` ;
  - (5) le schéma exige, dans chaque document des sources requises, les chemins dont le pipeline dépend ;
  - (6) la fraîcheur exige une archive des scrutins de moins de 72 h. Son échec lève une alerte, sans arrêter le build, car le planning ne prévoit pas d'arrêt pour elle.
  Un échec de (3), (4) ou (5) arrête le build et ouvre une issue GitHub.
- Raison : des contrôles qui ne déclenchent pas de fausse alerte sur les écarts connus de la ventilation publiée (docs/normalisation.md), mais qui arrêtent tout ce qui changerait un résultat déjà publié.
- Conséquence : tant que le site n'est pas déployé (t17), « publié » veut dire « passé aux contrôles ». La référence est remplacée à chaque build autorisé.

## 2026-10-08 · Porte t15 : données conformes au site de l'Assemblée, passage à la phase 2
- Décision (Julien) : les 5 scrutins tirés au hasard sont conformes au site officiel (décomptes et 25 votes nominatifs, y compris les absents et les mises au point). La phase 2 (site) peut commencer.
- Raison : docs/verification-scrutins.md.
- Conséquence : la notion de dissident n'est pas affichée par l'Assemblée. Le site devra l'expliquer et la rendre vérifiable, avec le décompte du groupe à côté de la mention, pour éviter que le visiteur la prenne pour une donnée officielle.


## 2026-10-08 · Déploiement par téléversement direct depuis GitHub Actions
- Décision : le site est envoyé à Cloudflare Pages par le pipeline de nuit (GitHub Actions, `wrangler pages deploy`), et non construit par Cloudflare à partir du dépôt (liaison Git). Deux secrets GitHub : `CLOUDFLARE_API_TOKEN` (clé limitée à « Cloudflare Pages : Edit ») et `CLOUDFLARE_ACCOUNT_ID`. Le projet Pages est créé par Claude Code en t17.
- Raison : les données du site (`export/`, base DuckDB) sont produites dans GitHub Actions et ne sont pas versionnées ; un build fait par Cloudflare n'y aurait pas accès. Le déploiement n'a lieu que si les contrôles ont réussi : un build arrêté ne publie rien.
- Conséquence : t16 se limite au compte, à la clé et aux secrets (docs/deploiement-cloudflare.md). Un projet en téléversement direct ne peut pas passer ensuite à la liaison Git. Limite gratuite à surveiller : 20 000 fichiers par déploiement.

## 2026-10-08 · Site : Astro statique, données lues au build, polices hébergées par le site
- Décision : le site (`site/`, Astro 7, sortie statique) lit au build les JSON du pipeline (`export/site/composition.json`, `export/site/scrutins-solennels.json`, `export/etat.json`) ; s'il en manque un, le build échoue. Il est construit et déployé par `nuit.yml`, après les contrôles : chaque nuit si une source a changé, et à chaque lancement à la main ou modification de `site/`, `pipeline/` ou du workflow sur `main`. Les polices Fredoka et Nunito sont servies par le site (paquets Fontsource), sans appel à Google Fonts. La page « État des données » est rendue par Astro depuis `etat.json`, avec la navigation du site.
- Raison : zéro serveur, zéro base, un build en échec ne publie rien ; aucune adresse IP de visiteur transmise à un tiers pour des polices.
- Conséquence : `export/etat.html` reste produit pour l'artefact du build, mais n'est plus servi.

## 2026-10-08 · Hémicycle : ordre des groupes, couleurs, accessibilité
- Décision : 577 sièges dessinés comme dans la maquette V5 (13 rangées, remplissage par angle). Les groupes sont rangés de gauche à droite par la médiane décroissante des numéros de siège officiels (`placeHemicycle`) de leurs membres ; les non-inscrits, dispersés dans la salle, sont mis à la fin ; un groupe dissous est placé d'après les places de ses anciens membres ; les sièges vacants sont à la fin, en pointillés. En mode vote : couleurs de la charte, non-votant en gris moyen #9AA1B2 (distinct de l'absent #DFE3EB), vote contre la majorité de son groupe cerclé. En mode composition : deux gris alternés, sans couleur de parti. Au clavier : flèches (siège, groupe), Début, Fin, chaque siège annoncé ; un tableau par groupe sert d'alternative.
- Raison : l'ordre vient des places réelles dans la salle, pas d'un score ni d'un axe gauche-droite ; la maquette n'avait pas de couleur pour les non-votants, qui ne sont pas des absents.
- Conséquence : l'ordre calculé place LIOT (médiane 464) avant SOC (444). À comparer au schéma officiel de l'Assemblée lors du test de t22.

## 2026-10-08 · Pages de vote : quels votes, et rien d'inventé tant qu'il n'y a pas de fiche
- Décision : un vote a sa page (`/votes/{numéro}/`, le numéro du scrutin comme sur le site de l'Assemblée) s'il est solennel, ou s'il porte sur l'ensemble d'un texte, une partie de budget, une résolution ou une motion de censure : 266 votes aujourd'hui. Les amendements, articles et motions de procédure n'en ont pas. Sans fiche « Ce que ça change » validée, la page affiche l'objet officiel, le dossier et les liens vers l'Assemblée, sans cartes. Le parcours du texte reprend les grandes étapes du dossier législatif avec leurs dates, sans prévoir l'étape suivante. Les voix qui auraient fait basculer le résultat sont dites en clair (« si 25 députés ayant voté pour avaient voté contre… »), car c'est exactement ce que suppose le calcul. « Et toi, qu'aurais-tu voté ? » garde la réponse dans le navigateur (`578e.reponses.v1`).
- Raison : ce sont les votes que « Ce que ça change » pourra expliquer (docs/rattachement.md), plus les motions de censure, que le public connaît ; une page par scrutin (8 560) alourdirait le site sans intérêt pour le public visé.
- Conséquence : `export/site/scrutins-solennels.json` est remplacé par `scrutins.json` et `scrutins/{uid}.json`. Le filtre « Mon jumeau » viendra avec t21 ; les thèmes (t28) remplaceront les filtres par type de vote dans Explorer.

## 2026-10-08 · Député par code postal : table de 2017, puis adresse géocodée par l'IGN
- Décision : code postal → communes (La Poste) → circonscriptions (table du ministère de l'Intérieur, 2017). Quand la commune est partagée entre plusieurs circonscriptions, ou absente de la table (arrondissements de Paris, Lyon, Marseille ; communes nouvelles créées depuis 2017), le site demande la rue, la géocode avec le service public de l'IGN (`data.geopf.fr/geocodage`, gratuit, sans clé) et la situe dans les contours des circonscriptions (data.gouv.fr), dans le navigateur. Le code postal passe par le fragment `#cp=`, jamais envoyé au serveur ; l'adresse n'est envoyée qu'à l'IGN, au moment où le visiteur la demande, et le site le dit. Le député choisi est gardé dans le navigateur (`578e.depute.v1`).
- Raison : la table de 2017 est la seule correspondance officielle commune → circonscription ; les contours règlent les cas qu'elle ne couvre pas. L'API Adresse de data.gouv.fr a migré vers la Géoplateforme de l'IGN.
- Conséquence : les fichiers géographiques restent facultatifs : sans eux, la recherche par code postal n'est pas exportée et le site renvoie vers la recherche par nom. Les Français établis hors de France n'ont pas de code postal : recherche par nom.

## 2026-10-08 · Fiche député : des chiffres situés, un accord brut
- Décision : la participation compte les votes pour, contre et abstention, rapportés à tous les scrutins du mandat, hors motions de censure ; elle est affichée avec la médiane des députés en exercice, et la participation aux votes solennels à côté. L'accord avec le visiteur est un taux brut, affiché avec son nombre de votes en commun : un vote compte quand le visiteur a répondu et que le député a voté pour, contre ou abstention (une abstention compte comme une réponse différente). Pas de photo : des initiales.
- Raison : sur tous les scrutins, amendements compris, la participation médiane est d'environ 25 % ; un taux seul ferait passer tous les députés pour absents. Le lissage (m + 2) / (n + 4) sert au classement du jumeau (t21), pas à ce taux. Les photos de l'Assemblée ne sont pas sous Licence ouverte et seraient chargées depuis un tiers.
- Conséquence : t21 reprendra la même définition des votes en commun (`site/src/lib/accord.ts`), ou la changera par une décision explicite.

## 2026-10-08 · Quiz d'entrée : des sujets de société, et le droit de ne pas savoir
- Décision (Julien) : le quiz d'entrée ne pose que des sujets de société à objet unique, qu'un citoyen comprend en une phrase sans connaître le dossier. Pas de texte technique, pas de texte « fourre-tout » (les députés votent l'ensemble ; une question qui n'en citerait qu'une mesure ne mesurerait pas le même vote). Les votes peuvent venir au-delà des scrutins solennels. Chaque question a une phrase « Concrètement » tirée du texte voté, contrôlée comme les fiches (longueurs, question fermée, vocabulaire, chiffres). Chaque question offre « Je ne sais pas ». Les 10 votes retenus sont figés dans `data/quiz.json`.
- Raison : la première liste (20 scrutins solennels choisis pour séparer les groupes) demandait de connaître des dossiers techniques ; un titre officiel peut aussi pousser au « oui » alors que c'est le contenu qui fait débat.
- Conséquence : le quiz distingue moins bien des groupes qui votent souvent ensemble (DEM / EPR, DEM / LIOT ne sont séparés qu'une fois). Plusieurs votes ont une participation moyenne ou faible : seuls 30 députés ont pris position sur les 10.

## 2026-10-08 · Le jumeau est toujours montré
- Décision (Julien) : le jumeau est le député le mieux classé par l'accord lissé (m + 2) / (n + 4), et il est toujours montré, même avec moins de 10 votes en commun et même sans accord total. Son nombre de votes en commun et la jauge de précision l'accompagnent. Le seuil de 10 votes en commun est abandonné.
- Raison : avec 10 questions, des absences et « Je ne sais pas », le seuil aurait empêché presque toujours d'afficher un jumeau après le quiz.
- Conséquence : t21 classe les députés par accord lissé, départage les égalités par le nombre de votes en commun ; la précision dit au visiteur que le résultat est provisoire. CLAUDE.md et le § 4.3 du planning sont mis à jour.

## 2026-10-08 · Ton hémicycle : la matrice vient au navigateur, les réponses n'en partent pas
- Décision : le pipeline publie `matrice.json` (le vote de chaque député et la position de chaque groupe actuel sur les 244 votes à page, hors motions de censure) ; le navigateur la télécharge et calcule le profil sur place (`site/src/lib/profil.ts`). Les réponses du quiz et des pages de vote partagent le même stockage local. Un vote compte en commun quand le visiteur a répondu et que le député a voté pour, contre ou abstention. Les stories sont dessinées dans le navigateur (canevas) et ne partent que si le visiteur les partage lui-même. Ta place dans l'hémicycle est figurée par une étoile près de ton jumeau.
- Raison : opinions politiques = données sensibles (RGPD) : aucun serveur ne doit les voir. 207 Ko compressés suffisent pour tout calculer. Sans axe gauche-droite, la seule place honnête est près du député qui vote le plus comme toi.
- Conséquence : le groupe d'un député qui a changé de nom est suivi par sa lignée (« À droite », UDR, UDDPLR) ; toute nouvelle fusion ou scission de groupe devra être ajoutée à `LIGNEE` dans `pipeline/export_site.py`.

## 2026-10-08 · Sigles des groupes : ceux qu'affiche l'Assemblée, et « LFI »
- Décision (Julien) : le sigle affiché d'un groupe est l'abréviation que l'Assemblée affiche sur son site (`libelleAbrege` : UDR, EcoS, Dem), à défaut son code court (`libelleAbrev` : UDDPLR, ECOS, DEM, utilisé jusqu'ici). Une exception, à la demande de Julien : « LFI » plutôt que « LFI-NFP » (`SIGLES_AFFICHES` dans `pipeline/normalize.py`). Le nom officiel du groupe reste affiché en entier (`libelle`), sur la fiche député et au survol des sigles.
- Raison : retour de Julien sur t22 (« le NFP n'existe plus »). L'open data donne encore « La France insoumise - Nouveau Front Populaire » et « LFI-NFP » au 8 octobre 2026 : c'est le nom sous lequel le groupe est enregistré à l'Assemblée. Le sigle court suit l'usage courant et la maquette V5, le nom complet reste celui de la source.
- Conséquence : les deux groupes UDR successifs portent le même sigle ; `scripts/preparer_quiz.py` n'a plus besoin de table de correspondance. Toute autre exception s'ajoute à `SIGLES_AFFICHES`, avec une entrée ici.

## 2026-10-08 · Couleurs des groupes : celles de l'Assemblée, autour de l'hémicycle
- Décision (Julien) : chaque groupe est reconnaissable d'un coup d'œil par la couleur que l'Assemblée lui associe dans son open data (`couleurAssociee`). Autour de chaque hémicycle, la part du groupe est bordée d'un arc et étiquetée d'une pastille à cette couleur (texte blanc ou foncé selon le contraste) ; partout ailleurs, son sigle est précédé d'un point à sa couleur (`site/src/lib/couleurs.ts`). Dans « Mon hémicycle », tant que le visiteur n'a rien tranché, chaque siège prend la couleur de son groupe.
- Raison : retour de Julien sur t22 : on voyait qui vote comme soi, pas de quel groupe il est. La couleur vient de la source, sans choix de notre part.
- Conséquence : remplace « deux gris alternés, sans couleur de parti » de l'entrée « Hémicycle : ordre des groupes, couleurs, accessibilité » pour les étiquettes ; les sièges gardent les couleurs de vote ou d'accord. La couleur ne porte jamais seule l'information : le sigle est toujours écrit.

## 2026-10-08 · Ton hémicycle : les quatre niveaux et la place de la maquette
- Décision : l'hémicycle personnel reprend la frame V5 : quatre niveaux d'accord lissé (rarement comme toi en dessous de 0,35, parfois jusqu'à 0,5, souvent jusqu'à 0,67, presque toujours au-delà ; `NIVEAUX` dans `site/src/lib/profil.ts`), un siège blanc cerclé quand il n'y a aucun vote en commun, et au centre le nombre de députés d'accord « presque toujours ». L'étoile « Toi · 578e siège » est placée au-dessus du groupe qui vote le plus comme toi (hors non-inscrits), et le jumeau a son propre repère. Le quiz construit cet hémicycle à chaque réponse.
- Raison : retour de Julien sur t22 (« recopier parfaitement les maquettes »). Placer l'étoile au-dessus d'un groupe ne crée pas d'axe : c'est le groupe le plus proche, calculé sur des votes réels.
- Conséquence : remplace les cinq teintes de t21 et l'étoile « près du jumeau ». Le dessin est commun à « Mon hémicycle » et au quiz (`site/src/components/Salle.astro`, `site/src/lib/salle.ts`).

## 2026-10-08 · Après le quiz : des lots de votes rédigés, 5 prêts au lancement
- Décision (Julien) : après le quiz, l'utilisateur continue de se placer par lots de votes rédigés comme ceux du quiz (thème, question fermée, « Concrètement »), contrôlés et validés pendant la session hebdomadaire (zéro euro). Au lancement, 5 lots sont prêts, pour que l'utilisateur puisse aller au bout de son placement : « c'est la base du projet, elle doit être respectée de bout en bout ».
- Raison : retour de Julien sur t22 ; les titres officiels sont trop techniques pour être tranchés d'un clic (t20).
- Conséquence : docs/cadrage-produit.md propose la taille d'un lot (3 votes : 10 + 15 = 25, le seuil de précision fiable), qu'une séance passée devienne un lot, et de rédiger les cartes de vote avant de construire la séance. À valider par Julien avant de modifier le planning.

## 2026-10-08 · Lots de 3 votes, séances recyclées, le contenu avant la séance
- Décision (Julien) : un lot compte 3 votes, au format d'une séance ; une séance de la semaine, une fois son verdict tombé, devient un lot à rattraper ; les cartes de vote (thème, titre court, question, « Concrètement ») et les 5 lots du lancement sont construits avant la séance de la semaine.
- Raison : docs/cadrage-produit.md. Quiz (10) + 5 lots (15) = 25 votes, le seuil où la précision devient fiable ; une seule chaîne de rédaction par semaine ; tous les écrans des maquettes présentent les votes sous forme de carte.
- Conséquence : phase 2 bis ajoutée au planning (t42 à t45) ; t23, t24, t27 et t28 ajustées (dépendance, reprise de l'écran de lot, séance recyclée en lot, liste des thèmes fixée dès t42).

