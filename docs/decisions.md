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
