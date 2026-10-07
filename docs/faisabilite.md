# Rapport de faisabilité (phase 0)

Rédigé le 7 octobre 2026 (t09), pour la décision go / no-go de Julien (t10). Sources : `docs/inventaire-open-data.md`, `docs/delai-publication.md`, `docs/rattachement.md`, `docs/vulgarisation-essai.md`, `docs/decisions.md`.

## En bref

| Question | Réponse | Confiance |
|---|---|---|
| Les données de l'Assemblée suffisent-elles ? | Oui. Tous les champs utiles existent ; les pièges sont connus et documentés. | Élevée (inventaire complet) |
| Peut-on rattacher un vote à son texte ? | Oui : 99,8 % des 8 560 scrutins, sans faux positif sur l'échantillon vérifié à la main. | Élevée |
| La vulgarisation est-elle de qualité suffisante ? | Oui : 3 fiches publiables sur 5 ; les 2 autres écartées à juste titre ; relecture de Julien positive. | Moyenne (5 textes seulement) |
| Peut-on le faire à zéro euro ? | Oui : rédaction dans la session Claude Code hebdomadaire de Julien, services gratuits. | Élevée |
| Combien de temps après le vote le résultat est-il publié ? | **Pas encore mesuré.** Un premier indice suggère quelques heures. | Faible : données insuffisantes |

**Recommandation : go pour la phase 1** (ingestion, normalisation, contrôles), **avec la formule du verdict en suspens**. On la tranchera vers le 28 octobre, une fois le délai mesuré sur au moins trois mardis de votes solennels. Le délai ne change rien aux phases 1 et 2 : il ne fixe que la formulation de l'écran Verdict (t25, phase 3). Pour l'instant, la formule par défaut, sans risque, est « le verdict du matin ».

## 1. Délai de publication (question ouverte 1)

**Données insuffisantes : je ne conclus pas.** La fiche t09 demandait au moins deux semaines de scrutins solennels mesurés. Le relevé a démarré le 7 octobre à 11 h 31 UTC. Aucun nouveau scrutin n'a encore été mesuré (`docs/delai-publication.md`).

Ce qu'on sait déjà :
- L'archive est régénérée **plusieurs fois par jour**, et pas seulement la nuit. Le 7 octobre, le serveur d'origine affichait une version de 10 h 26 UTC (inventaire).
- **Premier indice** : la séance du 6 octobre au soir (21 h 30 – 00 h 00, heure de Paris) comptait des scrutins ordinaires. Ils figuraient déjà dans l'archive modifiée le 7 octobre à 04 h 26 UTC. Le délai a donc été **au plus d'environ 6 h 30** après la fin prévue de la séance. C'est un seul cas, de scrutins ordinaires : un indice, pas une mesure.
- **Incident à suivre** : GitHub n'a déclenché aucun des passages horaires programmés depuis le lancement manuel du 7 octobre. Les passages de 12 h 07, 13 h 07 et 14 h 07 UTC sont absents, alors que le workflow est actif. Le planificateur de GitHub est connu pour démarrer tard et sauter des passages aux heures chargées. Si rien n'a tourné d'ici le 8 octobre, il faudra décaler le cron vers une minute moins chargée, voire doubler le relevé. Le dépôt est désormais public : les minutes de GitHub Actions ne sont plus comptées.

**Conséquence pour le verdict.** Les deux formules restent possibles, et le site peut être construit sans choisir :
- « **dès la publication** » si le délai des scrutins solennels est court et régulier (par exemple, publié le soir même dans la grande majorité des cas) ;
- « **le verdict du matin** » sinon. C'est la formule par défaut, compatible avec l'indice ci-dessus. Le pipeline de nuit tourne à 6 h UTC.

**Proposition** : prolonger le relevé jusqu'au 28 octobre (trois mardis de votes solennels), puis compléter ce rapport et trancher la formule. C'est une décision légère, qui peut se prendre plus tard, sans bloquer la porte t10.

## 2. Rattachement vote → texte (question ouverte 2) : réglé

- La combinaison de trois méthodes (amendement retrouvé, actes du dossier, titre du texte, agenda de la séance) rattache **8 546 scrutins sur 8 560** à un seul dossier.
- **Justesse** : 97 rattachements vérifiés à la main dans l'échantillon, aucun faux positif. Le dossier déclaré par l'Assemblée existe pour 2 734 scrutins, et la combinaison est d'accord avec lui 2 733 fois. Le seul désaccord est une erreur de l'open data, vérifiée sur le site officiel (scrutin 6758).
- **Échecs attendus** (14) : déclarations du Gouvernement et motions de censure, qui ne portent sur aucun texte, et 4 textes renommés.
- **Conséquence** : « Ce que ça change » pour les votes sur un texte entier, une partie de budget ou une résolution, ce qui couvre 67 des 72 scrutins solennels. Pour un article, avec prudence. Rien pour les amendements, les motions et les votes sans texte.

## 3. Vulgarisation : qualité suffisante, coût nul

- **Essai sur 5 textes** de thèmes variés : 3 fiches publiables dès la première tentative. Les 2 autres ont été écartées par la relecture automatique, pour de vraies inexactitudes. Le repli a fonctionné : rien de faux n'aurait été publié.
- **Relecture de Julien (t08)** : « tout est bon », sans remarque.
- **Coût** : l'essai a coûté 1,02 $, avec l'API. Depuis la décision du 7 octobre, c'est **zéro euro**. Les fiches seront rédigées dans la session Claude Code hebdomadaire de Julien, avec les mêmes consignes et les mêmes 7 contrôles, puis validées par lui.
- **Limite** : l'essai a été fait avec l'API, pas dans une session Claude Code. La qualité devrait être la même, puisque ce sont les mêmes consignes et les mêmes contrôles, mais ce ne sera vérifié qu'en t27.

## 4. Risques restants

| Risque | Gravité | Parade |
|---|---|---|
| Relevé horaire non déclenché par GitHub | Moyenne (retarde la décision sur le verdict) | Vérifier le 8 octobre ; décaler le cron ; prolonger le relevé |
| Commune ou code postal partagés entre plusieurs circonscriptions (question ouverte 3) | Moyenne (recherche par code postal, t19) | Saisie de la rue (Base Adresse Nationale) ou choix de la circonscription par l'utilisateur ; à trancher en t19 |
| Texte de commission mixte paritaire incomplet | Faible | Reconstituer le texte complet (t27) |
| Format de l'open data qui change | Moyenne | Contrôle de schéma, arrêt du build, alerte (t13) |
| Session hebdomadaire sautée | Faible | Les derniers votes s'affichent sans cartes (repli) |
| Archive des amendements indisponible (310 Mo, téléchargements qui échouent) | Faible | Rattachement à 99,4 % sans elle ; nouvelles tentatives (t11) |

## 5. Scénario de repli en cas de no-go partiel

Si Julien préfère ne pas s'engager sur la vulgarisation, le site garde tout son intérêt pour un portfolio : votes, hémicycle, groupe le plus proche, jumeau, fiche député. Ces écrans s'appuient uniquement sur les données publiques. Les cartes « Ce que ça change » deviennent alors un bonus, ajouté plus tard sans rien casser.
