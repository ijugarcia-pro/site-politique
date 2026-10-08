# Quiz d'entrée : votes candidats (t20)

> Généré par `uv run python -m scripts.preparer_quiz`. Ne pas modifier à la main : cocher ci-dessous, puis répondre en session.

Le quiz d'entrée pose 10 vrais votes de l'Assemblée. Tes réponses sont comparées à celles des 577 députés : le groupe le plus proche, le jumeau, la précision (t21). C'est le **seul choix éditorial fixe** du site.

## Critères (ta décision du 8 octobre 2026)

- **Des sujets de société, à objet unique**, qu'on comprend en une phrase sans connaître le dossier. Pas de texte technique, pas de texte « fourre-tout » : les députés votent l'ensemble, et une question qui n'en citerait qu'une mesure ne mesurerait pas le même vote. 16 candidats tiennent ce critère.
- **Au-delà des scrutins solennels** quand le sujet le justifie. Un vote ordinaire réunit moins de députés : sa **participation** est indiquée.
- **Chaque question est fermée** (« oui » veut dire voter pour) et accompagnée d'une phrase **« Concrètement »**, tirée des articles du texte voté. Les deux passent les contrôles 2, 4, 5 et 6 des fiches (longueurs, question fermée, vocabulaire neutre, chiffres présents dans le texte). « Vérifié » dit ce qui a été lu ; « Réserve », ce que la question simplifie ou ce qui n'a pas pu l'être.
- **Un bouton « Je ne sais pas »** à chaque question (pour t21) : personne n'est obligé de trancher un sujet qu'il ne connaît pas.

Coche 10 cases (ou donne les numéros en session). Tu peux aussi corriger une question.

## Choix de Julien

Le 8 octobre 2026, Julien a retenu la proposition ci-dessous : votes n° 988, 1308, 2257, 2957, 3061, 3260, 7454, 7987, 8280, 8431. Ils sont figés dans `data/quiz.json`, que lit le quiz (t21).

## Ma proposition de 10

Votes n° 988, 1308, 2257, 2957, 3061, 3260, 7454, 7987, 8280, 8431. Ensemble, ils séparent chaque paire de groupes au moins 0 fois sur 10 ; 52 paires sur 55 au moins deux fois.
Paires de groupes séparées une seule fois (ou jamais) : DEM / EPR (0), ECOS / SOC (0), DR / HOR (1).

**Point d'attention pour t21.** Le jumeau n'est affiché qu'à partir de 10 votes en commun. Sur ces 10 votes, **30 députés** ont pris position sur les 10, et 292 sur au moins 8 (votes ordinaires moins suivis, absences). Avec la réponse « Je ne sais pas » en plus, le jumeau ne pourra presque jamais s'afficher après le seul quiz : t21 devra soit l'annoncer « à préciser », soit inviter à trancher d'autres votes. Le groupe le plus proche, lui, se calcule sans problème.

La proposition est calculée (séparation des groupes, puis participation) : elle ne dit rien de l'intérêt d'un sujet pour le public, que toi seul juges.

## Les candidats

### 1. Fin de vie · n° 8280 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il permettre aux adultes atteints d'une maladie grave et incurable en phase avancée de demander une aide à mourir ? »
- **Concrètement** : Le texte crée un droit à l'aide à mourir : une personne majeure, atteinte d'une affection grave et incurable qui engage son pronostic vital, en phase avancée, peut demander à recourir à une substance létale, sous d'autres conditions.
- **Le vote** : scrutin solennel, adopté le 15 juillet 2026 ; 291 pour, 241 contre, 29 abstentions ; participation 97 % ; 85 votes contre leur groupe. [Scrutin n° 8280](https://www.assemblee-nationale.fr/dyn/17/scrutins/8280).
- **Objet officiel** : l'ensemble de la proposition de loi relative au droit à l'aide à mourir (lecture définitive).
- **Écart entre groupes** :
  - Pour : DEM (20-16-0), ECOS (33-2-1), EPR (64-18-9), GDR (10-2-3), LFI-NFP (61-2-3), LIOT (10-8-4), SOC (57-4-6)
  - Contre : DR (5-41-2), HOR (16-18-1), RN (12-106-0), UDDPLR (0-17-0)
- **Vérifié** : Texte adopté en lecture définitive, articles 2 et 4 (définition et conditions d'accès).

### 2. Numérique · n° 8431 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il interdire les réseaux sociaux aux moins de quinze ans et le téléphone portable dans les lycées ? »
- **Concrètement** : Le texte interdit l'accès aux réseaux sociaux aux moins de quinze ans, étend aux lycées l'interdiction du téléphone portable et ajoute la propagande pour des moyens de se donner la mort aux contenus que les sites doivent combattre.
- **Le vote** : scrutin solennel, adopté le 21 juillet 2026 ; 279 pour, 81 contre, 66 abstentions ; participation 74 % ; 16 votes contre leur groupe. [Scrutin n° 8431](https://www.assemblee-nationale.fr/dyn/17/scrutins/8431).
- **Objet officiel** : l'ensemble de la proposition de loi visant à protéger les mineurs des risques auxquels les expose l'utilisation des réseaux sociaux (texte de la commission mixte paritaire).
- **Écart entre groupes** :
  - Pour : DEM (32-1-2), DR (40-0-3), ECOS (19-7-7), EPR (83-0-0), GDR (6-3-5), HOR (33-0-0), LIOT (22-0-1), SOC (30-0-28), UDDPLR (8-5-4)
  - Contre : LFI-NFP (0-63-0)
  - Abstention : RN (0-2-14)
- **Vérifié** : Fiche de t07, relue par Julien.
- **Réserve** : Deux mesures dans une question (relevé en t07, accepté en t08).

### 3. Police · n° 7987 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il présumer que les policiers et gendarmes qui utilisent leur arme dans les cas prévus par la loi ont agi en légitime défense ? »
- **Concrètement** : Le texte prévoit qu'un policier ou un gendarme qui tire avec son arme dans les cas déjà autorisés par la loi est considéré d'office comme ayant agi en légitime défense, sauf si l'enquête prouve le contraire.
- **Le vote** : scrutin solennel, adopté le 7 juillet 2026 ; 313 pour, 199 contre, 5 abstentions ; participation 90 % ; 21 votes contre leur groupe. [Scrutin n° 7987](https://www.assemblee-nationale.fr/dyn/17/scrutins/7987).
- **Objet officiel** : l'ensemble de la proposition de loi visant à reconnaître une présomption de légitime défense pour les forces de l'ordre, dans l'exercice de leurs fonctions (première lecture).
- **Écart entre groupes** :
  - Pour : DEM (28-1-5), DR (48-0-0), EPR (55-12-0), HOR (31-0-0), LIOT (9-8-0), RN (122-0-0), UDDPLR (14-0-0)
  - Contre : ECOS (0-29-0), GDR (0-17-0), LFI-NFP (0-69-0), SOC (0-62-0)
- **Vérifié** : Fiche de t07, relue par Julien (phrase « Concrètement » raccourcie).

### 4. Corse · n° 7454 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il inscrire dans la Constitution un statut d'autonomie pour la Corse au sein de la République ? »
- **Concrètement** : Le texte modifie la Constitution pour donner à la Corse un statut d'autonomie. Sous conditions, la Collectivité de Corse pourra adapter des lois nationales ou fixer ses propres règles dans certains domaines.
- **Le vote** : scrutin solennel, adopté le 23 juin 2026 ; 271 pour, 202 contre, 64 abstentions ; participation 93 % ; 20 votes contre leur groupe. [Scrutin n° 7454](https://www.assemblee-nationale.fr/dyn/17/scrutins/7454).
- **Objet officiel** : l'ensemble du projet de loi constitutionnelle pour une Corse autonome au sein de la République (première lecture).
- **Écart entre groupes** :
  - Pour : DEM (25-0-11), ECOS (27-5-4), EPR (66-5-11), HOR (22-0-6), LFI-NFP (60-2-0), LIOT (21-2-0), SOC (41-5-19)
  - Contre : DR (1-34-10), RN (0-120-0), UDDPLR (0-17-0)
  - Sans position majoritaire : GDR (6-6-2)
- **Vérifié** : Fiche de t07, relue par Julien.
- **Réserve** : Première lecture d'une révision constitutionnelle : le texte n'est pas définitif.

### 5. Immigration · n° 2958

- [ ] **Je le retiens**
- **Question** : « Faut-il pouvoir retenir jusqu'à deux cent dix jours avant leur expulsion les étrangers condamnés pour des faits graves ? »
- **Concrètement** : Les étrangers condamnés pour certains crimes ou délits graves, ou dont le comportement menace gravement l'ordre public, pourront être maintenus en rétention administrative jusqu'à deux cent dix jours, le temps d'organiser leur départ.
- **Le vote** : scrutin solennel, adopté le 8 juillet 2025 ; 303 pour, 168 contre, 1 abstentions ; participation 82 % ; 2 votes contre leur groupe. [Scrutin n° 2958](https://www.assemblee-nationale.fr/dyn/17/scrutins/2958).
- **Objet officiel** : l'ensemble de la proposition de loi visant à faciliter le maintien en rétention des personnes condamnées pour des faits d’une particulière gravité et présentant de forts risques de récidive (première lecture).
- **Écart entre groupes** :
  - Pour : DEM (25-0-1), DR (48-0-0), EPR (61-1-0), HOR (24-0-0), LIOT (19-1-0), RN (108-0-0), UDDPLR (13-0-0)
  - Contre : ECOS (0-33-0), GDR (0-12-0), LFI-NFP (0-58-0), SOC (0-59-0)
- **Vérifié** : Texte de la commission mixte paritaire, articles 1er à 3 : durée maximale de rétention de « deux cent dix jours » pour ces étrangers.
- **Réserve** : « Expulsion » est le mot courant ; le texte parle d'éloignement.

### 6. Nationalité · n° 1308 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il exiger que les deux parents résident en France depuis plus d'un an pour qu'un enfant né à Mayotte puisse devenir français ? »
- **Concrètement** : Pour qu'un enfant né à Mayotte puisse devenir français, ses deux parents devront résider régulièrement en France depuis plus d'un an à sa naissance, au lieu d'un seul parent depuis plus de trois mois.
- **Le vote** : scrutin solennel, adopté le 8 avril 2025 ; 339 pour, 174 contre, 11 abstentions ; participation 91 % ; 1 votes contre leur groupe. [Scrutin n° 1308](https://www.assemblee-nationale.fr/dyn/17/scrutins/1308).
- **Objet officiel** : l'ensemble de la proposition de loi visant à renforcer les conditions d'accès à la nationalité française à Mayotte (texte de la commission mixte paritaire).
- **Écart entre groupes** :
  - Pour : DEM (30-1-3), DR (47-0-0), EPR (73-0-4), HOR (32-0-0), LIOT (13-0-0), RN (122-0-0), UDDPLR (15-0-0)
  - Contre : ECOS (0-32-0), GDR (0-13-0), LFI-NFP (0-65-0), SOC (0-61-3)
- **Vérifié** : Article unique : « ses deux parents résidaient » au lieu de « l'un de ses parents au moins », « d'un an » au lieu de « de trois mois ».
- **Réserve** : Le texte prévoit un cas particulier quand la filiation n'est établie qu'à l'égard d'un parent.

### 7. Immigration · n° 3260 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il demander au Gouvernement de dénoncer l'accord franco-algérien de 1968 sur l'entrée et le séjour des Algériens ? »
- **Concrètement** : Cette résolution, qui n'a pas force de loi, appelle le Gouvernement à dénoncer l'accord du 27 décembre 1968, qui fixe des règles particulières pour l'entrée et le séjour des ressortissants algériens en France.
- **Le vote** : scrutin ordinaire, adopté le 30 octobre 2025 ; 185 pour, 184 contre, 5 abstentions ; participation 65 % ; 1 votes contre leur groupe. [Scrutin n° 3260](https://www.assemblee-nationale.fr/dyn/17/scrutins/3260).
- **Objet officiel** : la proposition de résolution visant à dénoncer les accords franco-algériens du 27 décembre 1968 (article 34-1 de la Constitution).
- **Écart entre groupes** :
  - Pour : DR (26-0-0), HOR (17-0-0), LIOT (2-1-0), RN (122-0-0), UDDPLR (15-0-0)
  - Contre : DEM (0-10-2), ECOS (0-32-0), EPR (0-30-3), GDR (0-6-0), LFI-NFP (0-52-0), SOC (0-53-0)
- **Vérifié** : Proposition de résolution (article 34-1 de la Constitution) : exposé des motifs et article unique.
- **Réserve** : Vote serré (185 pour, 184 contre) et participation moyenne.

### 8. Islamisme · n° 5106

- [ ] **Je le retiens**
- **Question** : « Faut-il demander l'inscription des Frères musulmans sur la liste européenne des organisations terroristes ? »
- **Concrètement** : Cette résolution, qui n'a pas force de loi, invite la Commission européenne à proposer l'inscription de la mouvance des Frères musulmans et de ses responsables sur la liste européenne des organisations terroristes.
- **Le vote** : scrutin ordinaire, adopté le 22 janvier 2026 ; 157 pour, 101 contre, 1 abstentions ; participation 45 % ; 0 votes contre leur groupe. [Scrutin n° 5106](https://www.assemblee-nationale.fr/dyn/17/scrutins/5106).
- **Objet officiel** : l'article unique de la proposition de résolution européenne visant à inscrire la mouvance des frères musulmans sur la liste européenne des organisations terroristes.
- **Écart entre groupes** :
  - Pour : DEM (10-0-1), DR (40-0-0), EPR (22-0-0), HOR (9-0-0), LIOT (2-0-0), RN (65-0-0), UDDPLR (7-0-0)
  - Contre : ECOS (0-23-0), GDR (0-6-0), LFI-NFP (0-47-0), SOC (0-25-0)
- **Vérifié** : Proposition de résolution européenne, texte de la commission, point 5.
- **Réserve** : Participation faible : moins de la moitié des députés ont voté.

### 9. Ukraine · n° 988 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il appeler l'Union européenne et ses alliés à accroître leur soutien politique, économique et militaire à l'Ukraine ? »
- **Concrètement** : Cette résolution, qui n'a pas force de loi, condamne l'agression russe et encourage l'Union européenne, ses États membres et l'OTAN à poursuivre et accroître leur soutien politique, économique et militaire à l'Ukraine.
- **Le vote** : scrutin solennel, adopté le 12 mars 2025 ; 288 pour, 54 contre, 132 abstentions ; participation 82 % ; 0 votes contre leur groupe. [Scrutin n° 988](https://www.assemblee-nationale.fr/dyn/17/scrutins/988).
- **Objet officiel** : l'article unique de la proposition de résolution européenne appelant au renforcement du soutien à l'Ukraine.
- **Écart entre groupes** :
  - Pour : DEM (36-0-0), DR (28-0-0), ECOS (34-0-2), EPR (81-0-0), HOR (33-0-0), LIOT (23-0-0), SOC (46-0-0)
  - Contre : GDR (0-9-3), LFI-NFP (0-45-0)
  - Abstention : RN (0-0-114), UDDPLR (0-0-12)
- **Vérifié** : Proposition de résolution européenne, point 12.
- **Réserve** : La résolution invite aussi à faciliter l'adhésion de l'Ukraine à l'Union.

### 10. Défense · n° 7905

- [ ] **Je le retiens**
- **Question** : « Faut-il ajouter 36 milliards d'euros de ressources aux armées pour les années 2026 à 2030 ? »
- **Concrètement** : Le texte actualise la programmation militaire 2024-2030 : il prévoit 36 milliards d'euros de ressources nouvelles pour les armées sur la période 2026-2030.
- **Le vote** : scrutin solennel, adopté le 1 juillet 2026 ; 375 pour, 113 contre, 2 abstentions ; participation 85 % ; 2 votes contre leur groupe. [Scrutin n° 7905](https://www.assemblee-nationale.fr/dyn/17/scrutins/7905).
- **Objet officiel** : l'ensemble du projet de loi actualisant la programmation militaire pour les années 2024 à 2030 et portant diverses dispositions intéressant la défense (texte de la commission mixte paritaire).
- **Écart entre groupes** :
  - Pour : DEM (26-0-0), DR (44-0-0), EPR (86-0-0), HOR (35-0-0), LIOT (19-0-0), RN (97-0-0), SOC (46-1-0), UDDPLR (14-0-0)
  - Contre : ECOS (1-36-1), GDR (0-14-1), LFI-NFP (0-62-0)
- **Vérifié** : Texte de la commission mixte paritaire, article 2.
- **Réserve** : Le texte contient aussi d'autres mesures de défense (43 articles) : la question retient la principale.

### 11. Impôts · n° 881

- [ ] **Je le retiens**
- **Question** : « Faut-il que les personnes dont le patrimoine dépasse 100 millions d'euros paient au moins 2 % de sa valeur en impôts ? »
- **Concrètement** : Le texte crée un impôt plancher sur la fortune : les personnes dont le patrimoine dépasse 100 millions d'euros devraient payer, au total, des impôts égaux à au moins 2 % de sa valeur.
- **Le vote** : scrutin ordinaire, adopté le 20 février 2025 ; 116 pour, 39 contre, 31 abstentions ; participation 32 % ; 0 votes contre leur groupe. [Scrutin n° 881](https://www.assemblee-nationale.fr/dyn/17/scrutins/881).
- **Objet officiel** : l'ensemble de la proposition de loi instaurant un impôt plancher de 2 % sur le patrimoine des ultra riches (première lecture).
- **Écart entre groupes** :
  - Pour : ECOS (38-0-0), GDR (5-0-0), LFI-NFP (37-0-0), SOC (36-0-0)
  - Contre : DEM (0-9-0), DR (0-3-0), EPR (0-16-0), HOR (0-7-3), UDDPLR (0-4-0)
  - Abstention : RN (0-0-28)
  - Sans position majoritaire : LIOT (0-0-0)
- **Vérifié** : Exposé des motifs et article unique (texte de la commission).
- **Réserve** : Vote en première lecture, participation faible (un tiers des députés) ; le texte n'est pas devenu loi.

### 12. Retraites · n° 2257 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il affirmer la nécessité d'abroger la réforme des retraites de 2023, qui a reculé l'âge légal de 62 à 64 ans ? »
- **Concrètement** : Cette résolution, qui n'a pas force de loi, affirme « l'impérieuse nécessité d'aboutir à l'abrogation de la réforme des retraites » de 2023, qui a reculé l'âge légal de départ de 62 à 64 ans.
- **Le vote** : scrutin ordinaire, adopté le 5 juin 2025 ; 198 pour, 35 contre, 0 abstentions ; participation 40 % ; 3 votes contre leur groupe. [Scrutin n° 2257](https://www.assemblee-nationale.fr/dyn/17/scrutins/2257).
- **Objet officiel** : la proposition de résolution visant à abroger la loi n° 2023-270 du 14 avril 2023 de financement rectificative de la sécurité sociale pour 2023 dite réforme des retraites.
- **Écart entre groupes** :
  - Pour : ECOS (33-0-0), GDR (17-0-0), LFI-NFP (59-0-0), LIOT (4-3-0), RN (41-0-0), SOC (44-0-0)
  - Contre : DEM (0-11-0), DR (0-1-0), EPR (0-11-0), HOR (0-7-0), UDDPLR (0-2-0)
- **Vérifié** : Proposition de résolution : exposé des motifs (âge de 62 à 64 ans) et article unique.
- **Réserve** : Participation faible : plusieurs groupes n'ont presque pas pris part au vote.

### 13. Violences sexuelles · n° 3061 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il définir le viol et les agressions sexuelles comme tout acte sexuel non consenti ? »
- **Concrètement** : Le code pénal définirait l'agression sexuelle comme « tout acte sexuel non consenti », au lieu d'une atteinte commise « avec violence, contrainte, menace ou surprise ».
- **Le vote** : scrutin ordinaire, adopté le 23 octobre 2025 ; 155 pour, 31 contre, 5 abstentions ; participation 33 % ; 0 votes contre leur groupe. [Scrutin n° 3061](https://www.assemblee-nationale.fr/dyn/17/scrutins/3061).
- **Objet officiel** : l'ensemble de la proposition de loi modifiant la définition pénale du viol et des agressions sexuelles (texte de la commission mixte paritaire).
- **Écart entre groupes** :
  - Pour : DEM (12-0-0), DR (8-0-0), ECOS (21-0-0), EPR (40-0-0), HOR (16-0-0), LFI-NFP (29-0-0), LIOT (6-0-0), SOC (22-0-0)
  - Contre : RN (0-27-3), UDDPLR (0-4-0)
  - Abstention : GDR (0-0-2)
- **Vérifié** : Texte de la commission, article 1er.
- **Réserve** : Participation faible (un tiers des députés).

### 14. Environnement · n° 852

- [ ] **Je le retiens**
- **Question** : « Faut-il interdire les cosmétiques, les farts et les vêtements contenant des substances PFAS ? »
- **Concrètement** : Le texte interdit à partir du 1er janvier 2026 la fabrication et la vente de cosmétiques, de farts et de vêtements contenant des PFAS, sauf équipements de protection, et fixe une trajectoire de réduction de leurs rejets.
- **Le vote** : scrutin ordinaire, adopté le 20 février 2025 ; 231 pour, 51 contre, 7 abstentions ; participation 50 % ; 1 votes contre leur groupe. [Scrutin n° 852](https://www.assemblee-nationale.fr/dyn/17/scrutins/852).
- **Objet officiel** : l'ensemble de la proposition de loi visant à protéger la population des risques liés aux substances perfluoroalkylées et polyfluoroalkylées (deuxième lecture).
- **Écart entre groupes** :
  - Pour : DEM (22-0-0), DR (10-1-0), ECOS (38-0-0), EPR (39-0-0), GDR (8-0-0), HOR (20-0-0), LFI-NFP (45-0-0), LIOT (2-0-0), SOC (46-0-0)
  - Contre : RN (0-50-0)
  - Abstention : UDDPLR (0-0-7)
- **Vérifié** : Texte de la commission (deuxième lecture), articles 1er et 1er bis.
- **Réserve** : Participation faible (la moitié des députés).

### 15. Industrie · n° 7380

- [ ] **Je le retiens**
- **Question** : « Faut-il nationaliser la société ArcelorMittal France ? »
- **Concrètement** : L'État achèterait la société ArcelorMittal France, à un prix fixé par une commission et plafonné à la valeur moyenne de ses actions entre le 1er octobre 2024 et le 30 septembre 2025.
- **Le vote** : scrutin ordinaire, adopté le 11 juin 2026 ; 106 pour, 49 contre, 47 abstentions ; participation 35 % ; 0 votes contre leur groupe. [Scrutin n° 7380](https://www.assemblee-nationale.fr/dyn/17/scrutins/7380).
- **Objet officiel** : l'ensemble de la proposition de loi visant à la nationalisation d'ArcelorMittal France afin de préserver la souveraineté industrielle de la France (deuxième lecture).
- **Écart entre groupes** :
  - Pour : ECOS (20-0-0), GDR (16-0-0), LFI-NFP (45-0-0), SOC (25-0-0)
  - Contre : DEM (0-5-0), DR (0-2-0), EPR (0-30-0), HOR (0-7-2), LIOT (0-1-0), UDDPLR (0-4-0)
  - Abstention : RN (0-0-45)
- **Vérifié** : Texte de la commission, article 1er.
- **Réserve** : Participation faible (un tiers des députés).

### 16. Agriculture · n° 2957 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il permettre, à titre exceptionnel, des dérogations à l'interdiction des pesticides néonicotinoïdes ? »
- **Concrètement** : Un décret pourra, à titre exceptionnel et face à une menace grave pour une production agricole, autoriser des produits néonicotinoïdes aujourd'hui interdits. Le texte modifie aussi d'autres règles, notamment sur la gestion de l'eau.
- **Le vote** : scrutin solennel, adopté le 8 juillet 2025 ; 316 pour, 223 contre, 25 abstentions ; participation 98 % ; 29 votes contre leur groupe. [Scrutin n° 2957](https://www.assemblee-nationale.fr/dyn/17/scrutins/2957).
- **Objet officiel** : l'ensemble de la proposition de loi visant à lever les contraintes à l'exercice du métier d'agriculteur (texte de la commission mixte paritaire).
- **Écart entre groupes** :
  - Pour : DEM (26-9-1), DR (47-0-1), EPR (64-14-10), HOR (26-3-4), LIOT (12-3-6), RN (119-0-2), UDDPLR (16-0-0)
  - Contre : ECOS (0-38-0), GDR (0-17-0), LFI-NFP (0-71-0), SOC (0-65-0)
- **Vérifié** : Texte de la commission mixte paritaire, article 2.
- **Réserve** : Texte à plusieurs volets : la question ne retient que la mesure la plus débattue.

## Séparation des groupes par ma proposition

Nombre de votes, sur les 10 proposés, où les deux groupes n'ont pas la même position.

| | DEM | DR | ECOS | EPR | GDR | HOR | LFI-NFP | LIOT | RN | SOC | UDDPLR |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **DEM** | — | 3 | 4 | 0 | 6 | 2 | 6 | 2 | 7 | 4 | 5 |
| **DR** | 3 | — | 7 | 3 | 8 | 1 | 9 | 3 | 4 | 7 | 2 |
| **ECOS** | 4 | 7 | — | 4 | 2 | 6 | 2 | 4 | 9 | 0 | 9 |
| **EPR** | 0 | 3 | 4 | — | 6 | 2 | 6 | 2 | 7 | 4 | 5 |
| **GDR** | 6 | 8 | 2 | 6 | — | 8 | 2 | 6 | 8 | 2 | 8 |
| **HOR** | 2 | 1 | 6 | 2 | 8 | — | 8 | 2 | 5 | 6 | 3 |
| **LFI-NFP** | 6 | 9 | 2 | 6 | 2 | 8 | — | 6 | 9 | 2 | 10 |
| **LIOT** | 2 | 3 | 4 | 2 | 6 | 2 | 6 | — | 5 | 4 | 5 |
| **RN** | 7 | 4 | 9 | 7 | 8 | 5 | 9 | 5 | — | 9 | 2 |
| **SOC** | 4 | 7 | 0 | 4 | 2 | 6 | 2 | 4 | 9 | — | 9 |
| **UDDPLR** | 5 | 2 | 9 | 5 | 8 | 3 | 10 | 5 | 2 | 9 | — |

## Écartés de la première liste

Retirés le 8 octobre 2026 parce que techniques ou « fourre-tout » : parité dans les communes de moins de 1 000 habitants (n° 1303), élections en Nouvelle-Calédonie (n° 3182), antisémitisme dans l'enseignement supérieur (n° 2880 : titre qui pousse au oui, contenu débattu), barrages (n° 7409), prix de l'alimentation (n° 1319), fraudes (n° 6319), mineurs délinquants (n° 1624), simplification de la vie économique (n° 6184), budget de la Sécurité sociale (n° 4758), budget 2025 (n° 438), programmation de l'énergie (n° 2653). La première liste reste dans l'historique git.
