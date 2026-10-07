# Site Politique · Le 578e siège

Site qui rend accessibles les votes de l'Assemblée nationale : chaque semaine, l'utilisateur tranche 3 vrais votes avant les députés (scrutins solennels annoncés à l'agenda), puis découvre le verdict ; ses réponses dessinent son hémicycle (groupe le plus proche, jumeau parmi les 577, précision).

## Décisions fixées
- Direction visuelle : maquette V5 « Le 578e siège » (Fredoka + Nunito, violet #7C4DFF ; pour #2F7BFF, contre #FF6A3D, abstention #FFC531, absent #DFE3EB). Navigation : Cette semaine · Mon hémicycle · Explorer.
- Mode de vote hybride : « Vote avant eux » pour les scrutins solennels (connus à l'avance par l'agenda) ; « Et toi, qu'aurais-tu voté ? » pour tous les autres votes.
- Données publiques : pipeline de nuit (GitHub Actions) → Python + DuckDB → JSON statiques → Cloudflare Pages. Pas de base de données dans ce chemin. Un build en échec ne publie rien.
- Calculs personnels dans le navigateur ; réponses en localStorage par défaut (les opinions politiques sont des données sensibles au sens du RGPD).
- Supabase uniquement pour les comptes facultatifs, suivis, alertes, signalements et agrégats consentis. E-mails via Brevo.
- Vulgarisation (question, « Concrètement », 3 cartes « Ce que ça change ») rédigée par l'API Anthropic, publiée seulement si les 7 contrôles passent ; sinon le vote est affiché sans cartes.

## Sources
- Open data de l'Assemblée nationale, 17e législature (Licence ouverte) : scrutins, députés/mandats/organes, historique des mandats, agenda, dossiers législatifs, textes et amendements. Scrutins : https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip
- data.gouv.fr : codes postaux, communes → circonscriptions, contours des circonscriptions.
- Projet voisin à étudier pour ses pièges : https://github.com/denvi44/kivotkoi

## Règles de données
- Clés = identifiants officiels (PA… pour les députés, PO… pour les groupes), jamais les noms.
- Un député occupe exactement une case par scrutin : pour, contre, abstention, non-votant, absent.
- Les absents ne sont pas listés dans les fichiers : on les reconstitue depuis les appartenances aux groupes à la date du vote. Non-votant ≠ absent.
- Motions de censure exclues des calculs d'accord (seuls les « pour » y sont publiés). Mise au point affichée, calcul sur le vote officiel.
- Dissident : vote opposé à la position majoritaire de son groupe ; jamais pour les non-inscrits ; une abstention n'est pas une dissidence.
- Voix pour inverser un résultat : P − R + 1 si adopté, R − P si rejeté (P = voix pour, R = suffrages requis publiés avec le scrutin).
- Jumeau : classement par accord lissé (m+2)/(n+4), affiché à partir de 10 votes en commun. Précision V1 : 1 − e^(−n/20).
- Aucun axe gauche-droite : seulement des taux d'accord sur des votes réels.

## Arborescence
- pipeline/ : ingestion, normalisation, contrôles, calculs, export (Python)
- scripts/ : scripts ponctuels d'exploration et de mesure
- data/raw/ : archives téléchargées (non versionnées)
- data/mesures/ : mesures versionnées (délai de publication…)
- docs/ : décisions, rapports, inventaires, planning (docs/PLANNING.md)
- tests/ : tests pytest
- site/ : le site (Astro), créé plus tard

## Planning
docs/PLANNING.md est la source de vérité : il dit quoi faire, dans quel ordre, et quand une tâche est terminée.
- **En début de session**, toujours le relire, en plus de ce fichier et de docs/decisions.md. Repère dans le § 2 la tâche à faire, vérifie que ses dépendances sont cochées, puis lis sa fiche (« À faire », livrable, critère de fin, « Ne pas faire »). Si on te demande « la suite », c'est la première tâche non cochée dont les dépendances sont faites ; s'il s'agit d'une tâche 👤 de Julien, prépare-la (voir la fiche) plutôt que de la sauter. Ne passe jamais une porte ◆ sans accord explicite de Julien.
- **En fin de session**, toujours le mettre à jour, avant le commit final :
  - cocher la tâche dans le § 2, avec la date, ou noter son état si elle n'est pas finie (par exemple : livrée, en attente de fusion) ;
  - ajouter dans sa fiche une ligne « Réalisé (date) » : livrables réels et chemins s'ils diffèrent de la fiche, écarts au critère de fin, ce qui reste à faire ;
  - corriger la date de « Dernière mise à jour » en tête du fichier, et les sections de référence (§ 4) si la réalité a changé ;
  - puis résumer à Julien : fait, échoué, non vérifié, tâche suivante.
- Ne réécris pas les fiches des tâches à venir de ton propre chef : signale les incohérences à Julien.

## Façon de travailler
- Une tâche du planning = une session. Commence par relire ce fichier, docs/decisions.md et docs/PLANNING.md.
- Tout le pipeline est testé avec pytest ; ne jamais publier des données qui échouent aux contrôles.
- Commandes : `uv sync` pour installer, `uv run pytest` pour tester, `uv run ruff check .` pour le style, `uv run python -m scripts.<nom>` pour lancer un script.
- Textes en français, ton neutre et factuel. Toute donnée de maquette doit être marquée comme illustrative.
- Une décision structurante prise en session = une entrée datée dans docs/decisions.md.
- Avant d'installer quoi que ce soit hors du projet (outil global, service payant), demande-moi.
