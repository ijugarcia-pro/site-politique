# Vérification de 5 scrutins (t15)

Généré par `uv run python -m scripts.preparer_verification_scrutins` à partir de `data/site.duckdb`. **Porte ◆** : s'il y a un écart, on revient à t12 et on ne passe pas à la phase 2.

Pour chaque scrutin, ouvrir le lien officiel, puis :
1. comparer le **décompte** (pour, contre, abstentions, non-votants) ;
2. pour chaque député, chercher son nom sur la page (Ctrl+F) et vérifier sa **position**. « Absent » veut dire que son nom n'apparaît dans aucune liste ;
3. cocher `[x]` si c'est conforme, sinon noter l'écart dans « Remarques ».

Les groupes indiqués sont ceux de la date du vote. Les sigles de la page officielle peuvent différer (groupes renommés ou dissous depuis).

## 1. Scrutin n° 4442 (scrutin solennel)

Vote du 02/12/2025, adopté : l'ensemble du projet de loi de fin de gestion pour 2025 (texte de la commission mixte paritaire).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/4442>

- [ ] Décompte : **217 pour, 213 contre, 84 abstentions, 1 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [ ] | Céline Calvez | EPR | Pour |
| [ ] | Nicolas Dragon | RN | Contre |
| [ ] | Joël Aviragnet | SOC | Abstention |
| [ ] | Pouria Amirshahi | ECOS | Absent |
| [ ] | Yannick Neuder | DR | Absent (mise au point : pour) |

Remarques :

## 2. Scrutin n° 1106 (amendement)

Vote du 21/03/2025, rejeté : l'amendement n° 90 de M. Causse à l'article 24 (examen prioritaire) de la proposition de loi visant à sortir la France du piège du narcotrafic (première lecture).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/1106>

- [ ] Décompte : **39 pour, 45 contre, 5 abstentions, 2 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [ ] | Julien Limongi | RN | Pour |
| [ ] | Jean-François Coulomme | LFI-NFP | Contre |
| [ ] | Nicolas Bonnet | ECOS | Abstention |
| [ ] | Bruno Fuchs | DEM | Absent |
| [ ] | Laurent Lhardit | SOC | Pour (dissident, mise au point : contre) |

Remarques :

## 3. Scrutin n° 6876 (avec mise au point)

Vote du 22/05/2026, adopté : l'amendement n° 814 de M. Humbert et les amendements identiques suivants de suppression de l'article 8 bis (examen prioritaire) du projet de loi d'urgence pour la protection et la souveraineté agricoles (première lecture).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/6876>

- [ ] Décompte : **55 pour, 35 contre, 2 abstentions, 1 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [ ] | Xavier Roseren | HOR | Pour |
| [ ] | Sébastien Peytavie | ECOS | Contre |
| [ ] | Jean-Michel Brard | HOR | Abstention |
| [ ] | Frank Giletti | RN | Absent |
| [ ] | Liliana Tanguy | EPR | Contre (dissident) |

Remarques :

## 4. Scrutin n° 8529 (récent)

Vote du 05/10/2026, adopté : l'amendement n° 1096 de Mme Miller et l'amendement identique suivant à l'article 3 de la proposition de loi apportant une réponse intégrale au phénomène des violences sexuelles et sexistes contre les femmes et les enfants (première lecture).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/8529>

- [ ] Décompte : **73 pour, 38 contre, 13 abstentions, 1 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [ ] | Julien Limongi | RN | Pour |
| [ ] | Marie-Charlotte Garin | ECOS | Contre |
| [ ] | Aurélien Saintoul | LFI-NFP | Abstention |
| [ ] | Paul Christophle | SOC | Absent |
| [ ] | Céline Thiébault-Martinez | SOC | Contre (dissident) |

Remarques :

## 5. Scrutin n° 133 (2024)

Vote du 26/10/2024, adopté : l'article 26 (examen prioritaire) du projet de loi de finances pour 2025 (première lecture).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/133>

- [ ] Décompte : **186 pour, 46 contre, 0 abstentions, 3 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [ ] | Zahia Hamdane | LFI-NFP | Pour |
| [ ] | Constance Le Grip | EPR | Contre |
| [ ] | Yaël Braun-Pivet | EPR | Non-votant |
| [ ] | Cyrille Isaac-Sibille | DEM | Absent |
| [ ] | Sophie Taillé-Polian | ECOS | Absent |

Remarques :

## Conclusion

- [ ] Les 5 scrutins sont conformes : on peut passer à la phase 2.
- Écarts constatés :
