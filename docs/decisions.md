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
