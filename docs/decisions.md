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
