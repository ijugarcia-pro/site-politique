# Rattachement d'un scrutin à son dossier législatif

Généré le 2026-10-07T12:03:25+00:00 par `uv run python -m scripts.mesurer_rattachement`, sur les archives de `data/raw/` (8560 scrutins, du 2024-10-08 au 2026-10-06). Tout ce document est régénéré, sauf la section « Constats et recommandation ». Mesures : `data/mesures/rattachement/`.

## Constats et recommandation

<!-- constats:debut -->
Lecture des mesures du 7 octobre 2026. Les chiffres viennent des tableaux ci-dessous.

**Réponse à la question ouverte 2 : oui, on sait rattacher un scrutin à son dossier, de façon fiable.**
- La combinaison des trois méthodes rattache **8 546 scrutins sur 8 560 (99,8 %)** à un seul dossier, et **97 des 100 scrutins de l'échantillon** (les 3 autres sont 2 déclarations du Gouvernement et 1 motion de censure, voir plus bas).
- **Justesse.** Aucun faux positif sur les 97 rattachements de l'échantillon vérifiés à la main. Le dossier déclaré dans le scrutin (`objet.dossierLegislatif`) existe pour 2 734 scrutins. La combinaison est d'accord avec lui 2 733 fois. Le seul désaccord (scrutin 6758) est une erreur de l'open data : la page officielle du scrutin et l'amendement n° 1128 (texte n° 2765) désignent le projet de loi d'urgence agricole, alors que le champ déclaré renvoie à une proposition de loi organique sur le corps électoral.
- **Les 14 échecs** sont attendus : 4 déclarations du Gouvernement (articles 49-1 et 50-1), qui ne portent sur aucun texte ; 6 motions de censure, dont le titre ne cite pas de texte et que les actes rattachent à deux dossiers ; 4 scrutins dont le titre ne ressemble à aucun titre de texte (textes renommés : n° 901, 911, 2575, 4439).

**Ce que vaut chaque méthode**
- **A, actes du dossier** : jamais fausse (78 accords sur 78 avec le dossier déclaré, 31 sur 31 à la main), mais ne couvre que les votes de décision : 85 % des scrutins solennels, 88 % des votes sur l'ensemble d'un texte, 2 % des scrutins ordinaires. C'est la source à privilégier pour « Vote avant eux ».
- **B, libellé** : la méthode principale, avec 8 513 scrutins rattachés sur 8 560 (99,5 %). Pour 7 270 amendements et sous-amendements, on retrouve l'amendement lui-même dans l'archive des amendements, avec l'article visé. Elle s'est trompée deux fois (n° 7302 et 7303) : le titre du scrutin reprend celui d'une ancienne proposition du même auteur, jamais examinée en séance. La combinaison corrige ces deux cas, par les actes et par l'agenda.
- **C, séance (agenda)** : conclut pour 70 % des scrutins, car la plupart des séances ne traitent qu'un texte. Mais elle peut se tromper quand l'ordre du jour est incomplet (n° 6283) ou que le vote ne porte sur aucun texte (n° 4698, une déclaration rattachée à tort au seul texte de la séance). Elle ne sert donc que de complément ; seule, elle ne conclut jamais pour une déclaration ou une motion de censure.
- **Sans l'archive des amendements** (310 Mo, téléchargement qui échoue parfois), la combinaison rattache encore 8 505 scrutins (99,4 %). Le pipeline peut donc publier sans elle ; il perd seulement l'article visé par l'amendement et une quarantaine de rattachements.
- Le champ `objet.dossierLegislatif` du scrutin n'est renseigné que pour un tiers des scrutins (30 solennels sur 72), et il peut être faux : on ne s'appuie pas dessus.

**Pièges rencontrés (règles à garder dans le pipeline)**
- Les titres des scrutins ont des fautes de frappe (« amenedement », « aticle », « ascenceur », « fin des gestion ») et des apostrophes typographiques ou droites ; il faut normaliser accents, ligatures (« œ ») et apostrophes.
- Le titre d'un texte change d'une lecture à l'autre (dossier « Fin de vie » → « droit à l'aide à mourir », « améliorer » → « optimiser »). On compare donc à tous les textes du dossier, et pas seulement au titre du dossier, puis à défaut aux mots du titre dans un autre ordre (« soins palliatifs et d'accompagnement »).
- Un même titre peut désigner plusieurs dossiers : la proposition de loi et la proposition de loi organique jumelle, ou des propositions identiques déposées par plusieurs groupes. On départage par la nature (organique), puis par le jour d'examen en séance.
- Un dossier ancien peut être réutilisé : la proposition « harmoniser le mode de scrutin aux élections municipales » (2025) vit dans un dossier de la 15e législature intitulé « Renforcement de la parité… ». Il ne faut donc jamais filtrer les dossiers sur la législature.
- Un numéro d'amendement n'est unique que dans un texte : le même jour, l'amendement n° 1 peut exister dans trois textes. Il faut la séance (absente pour un tiers des amendements de séance), à défaut la date, et toujours le nom de l'auteur, comparé à une lettre près (« Colin-Osterlé » / « Colin-Oesterle »).

**Recommandation : quels scrutins peuvent avoir « Ce que ça change »**

| Catégorie | Rattachement | « Ce que ça change » |
|---|---|---|
| Ensemble d'un texte, partie d'un budget, proposition de résolution | 100 % | **Oui** : les cartes décrivent le texte voté. Cela couvre 67 des 72 scrutins solennels ; parmi les 5 autres, 1 porte sur un article et 4 sont des déclarations du Gouvernement. |
| Article | 99,8 % | **Oui, avec prudence** : les cartes du texte, accompagnées de la mention « Ce vote porte sur l'article N », ou une carte limitée à cet article. À trancher en t07. |
| Motion de rejet préalable, de renvoi | 98 % | **Non en V1** : voter « pour » veut dire rejeter le texte sans le discuter. Les cartes du texte inverseraient le sens apparent du vote. On affiche l'objet officiel et le lien. |
| Amendement, sous-amendement | 100 % | **Non** pour les cartes du texte : un amendement change un point précis. Plus tard, on pourra vulgariser l'amendement lui-même, à partir de son exposé sommaire, présent dans l'archive. |
| Motion de censure, déclaration, demande de procédure | sans objet | **Non** : aucun texte. Les motions de censure sont déjà exclues des calculs d'accord. |

**Pour la suite**
- **t07** a besoin du texte, et pas seulement du dossier. Pour un vote sur l'ensemble, l'acte de décision donne le texte adopté (`textesAssocies`, 260 actes). Le texte examiné est le texte de la commission (BTC) de la même lecture. Pour un amendement, le texte visé est dans l'amendement (`texteLegislatifRef`).
- **t12** (table `dossier` et `contenu`) : reprendre `pipeline/rattachement.py` tel quel, garder la voie de rattachement (`voie`) pour pouvoir la tracer, et ne jamais publier de cartes pour un scrutin non rattaché.
<!-- constats:fin -->

## Les méthodes

- **A · actes du dossier** : un acte du dossier législatif (décision, vote d'une motion) cite le scrutin dans `voteRefs`.
- **B · libellé** : pour un amendement ou un sous-amendement, on retrouve l'amendement dans l'archive des amendements par son numéro, la séance du scrutin (à défaut, la date de son sort) et le nom de l'auteur. Sinon, on compare la désignation du texte (« du projet de loi … ») aux titres des textes déposés et des dossiers, sans les incises (« adoptée par le Sénat », « après engagement de la procédure accélérée ») ni les parenthèses. À titre égal, on garde le dossier déjà déposé et examiné en séance.
- **C · séance (agenda)** : l'ordre du jour de la séance du scrutin ne cite qu'un dossier.
- **Combinaison** : amendement retrouvé, puis A, puis B, puis C, puis un dossier commun à deux méthodes qui ont chacune plusieurs candidats.

Une méthode « conclut » quand elle désigne un seul dossier. La justesse est contrôlée de deux façons : (1) contre le dossier déclaré dans le scrutin (`objet.dossierLegislatif`), renseigné pour un tiers des scrutins ; (2) à la main, sur l'échantillon de 100 scrutins (`verification.csv`).

## Échantillon de 100 scrutins

Répartition : solennels 20 · ensemble 12 · article 12 · amendement 20 · sous-amendement 8 · motion de procédure 8 · motion de censure 6 · résolution, déclaration, partie 8 · procédure, autre 6. L'échantillon est tiré une fois (graine fixe) et gardé dans `echantillon.csv`.

**Taux de conclusion par type de vote** (nombre de scrutins rattachés à un seul dossier)

| | Scrutins | actes du dossier | libellé | séance (agenda) | combinaison |
|---|---|---|---|---|---|
| SPS | 20 | 15 (75 %) | 18 (90 %) | 4 (20 %) | 18 (90 %) |
| SPO | 74 | 13 (18 %) | 71 (96 %) | 46 (62 %) | 74 (100 %) |
| MOC | 6 | 3 (50 %) | 0 (0 %) | 2 (33 %) | 5 (83 %) |

**Taux de conclusion par catégorie de scrutin**

| | Scrutins | actes du dossier | libellé | séance (agenda) | combinaison |
|---|---|---|---|---|---|
| ensemble | 28 | 23 (82 %) | 28 (100 %) | 4 (14 %) | 28 (100 %) |
| partie | 5 | 2 (40 %) | 5 (100 %) | 5 (100 %) | 5 (100 %) |
| article | 12 | 0 (0 %) | 12 (100 %) | 9 (75 %) | 12 (100 %) |
| amendement | 20 | 0 (0 %) | 20 (100 %) | 15 (75 %) | 20 (100 %) |
| sous-amendement | 8 | 0 (0 %) | 8 (100 %) | 8 (100 %) | 8 (100 %) |
| motion de procédure | 8 | 1 (12 %) | 8 (100 %) | 2 (25 %) | 8 (100 %) |
| motion de censure | 6 | 3 (50 %) | 0 (0 %) | 2 (33 %) | 5 (83 %) |
| résolution | 5 | 2 (40 %) | 5 (100 %) | 0 (0 %) | 5 (100 %) |
| déclaration | 2 | 0 (0 %) | 0 (0 %) | 1 (50 %) | 0 (0 %) |
| procédure | 6 | 0 (0 %) | 3 (50 %) | 6 (100 %) | 6 (100 %) |

**Vérification à la main** (99 scrutins vérifiés : le dossier attendu est noté dans `verification.csv`)

| Méthode | Rattachements vérifiés | Justes | Faux positifs |
|---|---|---|---|
| actes du dossier | 31 | 31 | 0 |
| libellé | 89 | 89 | 0 |
| séance (agenda) | 52 | 51 | 1 |
| combinaison | 97 | 97 | 0 |

**Échecs de la combinaison dans l'échantillon, avec la cause**

| N° | Type | Catégorie | Titre | A | B | C |
|---|---|---|---|---|---|---|
| 456 | SPS | déclaration | la déclaration du Gouvernement portant sur les négociations en cours relatives à l'accord d'association entre l'Union européenne et le Merco | aucun acte ne cite le scrutin | le libellé ne désigne aucun texte | l'ordre du jour de la séance ne cite aucun dossier |
| 739 | MOC | motion de censure | la motion de censure déposée en application de l'article 49, alinéa 3, de la Constitution par Mme Mathilde Panot et 70 députés. | plusieurs dossiers citent le scrutin | le libellé ne désigne aucun texte | l'ordre du jour cite plusieurs dossiers |
| 4698 | SPS | déclaration | la déclaration du Gouvernement portant sur la stratégie de défense nationale (application de l'article 50-1 de la Constitution). | aucun acte ne cite le scrutin | le libellé ne désigne aucun texte | seul dossier de la séance |

**Causes d'échec par méthode dans l'échantillon**

- actes du dossier : aucun acte ne cite le scrutin (66) · plusieurs dossiers citent le scrutin (3)
- libellé : le libellé ne désigne aucun texte (11)
- séance (agenda) : l'ordre du jour cite plusieurs dossiers (47) · l'ordre du jour de la séance ne cite aucun dossier (1)

## Tous les scrutins

Les mêmes méthodes appliquées aux 8560 scrutins, pour confirmer l'échantillon.

**Par type de vote**

| | Scrutins | actes du dossier | libellé | séance (agenda) | combinaison |
|---|---|---|---|---|---|
| SPS | 72 | 61 (85 %) | 66 (92 %) | 9 (12 %) | 68 (94 %) |
| SPO | 8465 | 168 (2 %) | 8447 (100 %) | 5994 (71 %) | 8461 (100 %) |
| MOC | 23 | 10 (43 %) | 0 (0 %) | 4 (17 %) | 17 (74 %) |

**Par catégorie de scrutin**

| | Scrutins | actes du dossier | libellé | séance (agenda) | combinaison |
|---|---|---|---|---|---|
| ensemble | 221 | 194 (88 %) | 217 (98 %) | 35 (16 %) | 221 (100 %) |
| partie | 9 | 3 (33 %) | 9 (100 %) | 7 (78 %) | 9 (100 %) |
| article | 896 | 21 (2 %) | 885 (99 %) | 552 (62 %) | 894 (100 %) |
| amendement | 6673 | 0 (0 %) | 6672 (100 %) | 4878 (73 %) | 6672 (100 %) |
| sous-amendement | 649 | 0 (0 %) | 649 (100 %) | 496 (76 %) | 649 (100 %) |
| motion de procédure | 57 | 6 (11 %) | 56 (98 %) | 20 (35 %) | 56 (98 %) |
| motion de censure | 23 | 10 (43 %) | 0 (0 %) | 4 (17 %) | 17 (74 %) |
| résolution | 9 | 5 (56 %) | 9 (100 %) | 0 (0 %) | 9 (100 %) |
| déclaration | 4 | 0 (0 %) | 0 (0 %) | 1 (25 %) | 0 (0 %) |
| procédure | 18 | 0 (0 %) | 15 (83 %) | 13 (72 %) | 18 (100 %) |
| autre | 1 | 0 (0 %) | 1 (100 %) | 1 (100 %) | 1 (100 %) |

**Justesse contre le dossier déclaré dans le scrutin**

| Méthode | Comparés | Accord | Désaccord |
|---|---|---|---|
| actes du dossier | 78 | 78 (100 %) | 0 |
| libellé | 2731 | 2728 (100 %) | 3 |
| séance (agenda) | 1922 | 1921 (100 %) | 1 |
| combinaison | 2734 | 2733 (100 %) | 1 |

**Sans l'archive des amendements**, la combinaison conclut pour 8505 scrutins sur 8560 (99 %) : 41 rattachements perdus, 2 différents.

**Voies de la combinaison (tous les scrutins)**

- B · amendement retrouvé : 7261
- B · titre du texte identique : 921
- A · acte du dossier : 239
- B · amendement introuvable ; titre du texte identique : 49
- B · titre du texte approchant : 45
- aucune méthode ne conclut : 14
- C · seul dossier de la séance : 13
- B · amendement retrouvé, titre du texte différent : 9
- A ∩ C · recoupement : 7
- B · amendement introuvable ; titre du texte approchant : 1
- C · seul dossier de la séance, titre écarté : 1

**Causes d'échec par méthode (tous les scrutins)**

- actes du dossier : aucun acte ne cite le scrutin (8310) · plusieurs dossiers citent le scrutin (11)
- libellé : le libellé ne désigne aucun texte (30) · aucun texte de ce titre (16) · plusieurs amendements possibles (1)
- séance (agenda) : l'ordre du jour cite plusieurs dossiers (2530) · l'ordre du jour de la séance ne cite aucun dossier (23)
- combinaison : aucune méthode ne conclut (14)

**Désaccords avec le dossier déclaré**

| N° | Méthode | Trouvé | Déclaré | Titre |
|---|---|---|---|---|
| 6283 | C | DLR5L17N53284 (Renforcer la sécurité, la rétention administrative et la pré) | DLR5L17N53981 (Projet de loi portant transposition de l’avenant n°3 du 25 f) | l'amendement n° 1 de M. Monnet et les amendements identiques suivants de suppression de l'article unique du pr |
| 6758 | B | DLR5L17N54085 (Projet de loi d’urgence pour la protection et la souverainet) | DLR5L17N52104 (Proposition de loi organique portant actualisation du corps ) | l'amendement n° 1128 de M. Casterman à l'article premier du projet de loi d'urgence pour la protection et la s |
| 7302 | B | DLR5L17N53418 (Protéger l’alimentation des Français et des Françaises des c) | DLR5L17N54148 (Réduire les risques sanitaires liés aux contaminations au ca) | l'article unique de la proposition de loi visant à protéger l'alimentation des Français et des Françaises des  |
| 7303 | B | DLR5L17N53418 (Protéger l’alimentation des Français et des Françaises des c) | DLR5L17N54148 (Réduire les risques sanitaires liés aux contaminations au ca) | l'ensemble de la proposition de loi visant à protéger l'alimentation des Français et des Françaises des contam |
