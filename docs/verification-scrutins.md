# Vérification de 5 scrutins (t15)

Généré par `uv run python -m scripts.preparer_verification_scrutins` à partir de `data/site.duckdb`. **Porte ◆** : s'il y a un écart, on revient à t12 et on ne passe pas à la phase 2.

Pour chaque scrutin, ouvrir le lien officiel, puis :
1. comparer le **décompte** (pour, contre, abstentions, non-votants) ;
2. pour chaque député, chercher son nom sur la page (Ctrl+F) et vérifier sa **position**. « Absent » veut dire que son nom n'apparaît dans aucune liste ;
3. cocher `[x]` si c'est conforme, sinon noter l'écart dans « Remarques ».

Les groupes indiqués sont ceux de la date du vote. Les sigles de la page officielle peuvent différer (groupes renommés ou dissous depuis).

« Dissident » n'apparaît pas sur la page officielle : c'est notre calcul (vote pour quand la majorité de son groupe vote contre, ou l'inverse). Pour le vérifier, comparer les nombres de pour et de contre de son groupe sur la page.

## 1. Scrutin n° 4442 (scrutin solennel)

Vote du 02/12/2025, adopté : l'ensemble du projet de loi de fin de gestion pour 2025 (texte de la commission mixte paritaire).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/4442>

- [x] Décompte : **217 pour, 213 contre, 84 abstentions, 1 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [x] | Céline Calvez | EPR | Pour |
| [x] | Nicolas Dragon | RN | Contre |
| [x] | Joël Aviragnet | SOC | Abstention |
| [x] | Pouria Amirshahi | ECOS | Absent |
| [x] | Yannick Neuder | DR | Absent (mise au point : pour) |

Remarques :

## 2. Scrutin n° 1106 (amendement)

Vote du 21/03/2025, rejeté : l'amendement n° 90 de M. Causse à l'article 24 (examen prioritaire) de la proposition de loi visant à sortir la France du piège du narcotrafic (première lecture).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/1106>

- [x] Décompte : **39 pour, 45 contre, 5 abstentions, 2 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [x] | Julien Limongi | RN | Pour |
| [x] | Jean-François Coulomme | LFI-NFP | Contre |
| [x] | Nicolas Bonnet | ECOS | Abstention |
| [x] | Bruno Fuchs | DEM | Absent |
| [x] | Laurent Lhardit | SOC | Pour (dissident, mise au point : contre) |

Remarques :

## 3. Scrutin n° 6876 (avec mise au point)

Vote du 22/05/2026, adopté : l'amendement n° 814 de M. Humbert et les amendements identiques suivants de suppression de l'article 8 bis (examen prioritaire) du projet de loi d'urgence pour la protection et la souveraineté agricoles (première lecture).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/6876>

- [x] Décompte : **55 pour, 35 contre, 2 abstentions, 1 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [x] | Xavier Roseren | HOR | Pour |
| [x] | Sébastien Peytavie | ECOS | Contre |
| [x] | Jean-Michel Brard | HOR | Abstention |
| [x] | Frank Giletti | RN | Absent |
| [x] | Liliana Tanguy | EPR | Contre (dissident) |

Remarques :

## 4. Scrutin n° 8529 (récent)

Vote du 05/10/2026, adopté : l'amendement n° 1096 de Mme Miller et l'amendement identique suivant à l'article 3 de la proposition de loi apportant une réponse intégrale au phénomène des violences sexuelles et sexistes contre les femmes et les enfants (première lecture).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/8529>

- [x] Décompte : **73 pour, 38 contre, 13 abstentions, 1 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [x] | Julien Limongi | RN | Pour |
| [x] | Marie-Charlotte Garin | ECOS | Contre |
| [x] | Aurélien Saintoul | LFI-NFP | Abstention |
| [x] | Paul Christophle | SOC | Absent |
| [x] | Céline Thiébault-Martinez | SOC | Contre (dissident) |

Remarques :

## 5. Scrutin n° 133 (2024)

Vote du 26/10/2024, adopté : l'article 26 (examen prioritaire) du projet de loi de finances pour 2025 (première lecture).

Page officielle : <https://www.assemblee-nationale.fr/dyn/17/scrutins/133>

- [x] Décompte : **186 pour, 46 contre, 0 abstentions, 3 non-votants**

| Vérifié | Député | Groupe | Position attendue |
|---|---|---|---|
| [x] | Zahia Hamdane | LFI-NFP | Pour |
| [x] | Constance Le Grip | EPR | Contre |
| [x] | Yaël Braun-Pivet | EPR | Non-votant |
| [x] | Cyrille Isaac-Sibille | DEM | Absent |
| [x] | Sophie Taillé-Polian | ECOS | Absent |

Remarques :

## Conclusion

- [x] Les 5 scrutins sont conformes : on peut passer à la phase 2.
- Écarts constatés : aucun.

Vérifié par Julien le 7 et le 8 octobre 2026 sur le site de l'Assemblée, malgré de nombreuses erreurs 503 et des pages qui ne chargeaient pas. Il n'a trouvé aucun écart. Ses seules questions portaient sur deux « dissidents » (Liliana Tanguy au n° 6876, Céline Thiébault-Martinez au n° 8529) : la page officielle ne le dit pas, c'est notre calcul. Il se vérifie par le décompte du groupe : EPR, 8 pour et 2 contre ; SOC, 13 pour et 11 contre. Cases cochées par Claude Code d'après le compte rendu de Julien.
