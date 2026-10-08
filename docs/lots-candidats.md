# Lots de votes : candidats (t42)

> Généré par `uv run python -m scripts.preparer_lots`. Ne pas modifier à la main : cocher ci-dessous, puis répondre en session (t43).

Après le quiz d'entrée, l'utilisateur continue avec des **lots de 3 votes**, au format d'une séance (ta décision du 8 octobre 2026). 10 votes du quiz + 5 lots de 3 = **25 votes** : la précision passe de 39 % à 71 %, le seuil où elle devient fiable. Comme pour le quiz, c'est un choix éditorial : tu retiens 15 votes et tu corriges ce que tu veux.

## La carte de vote

Chaque vote se présente sous la même forme partout (quiz, lots, séances, pages de vote) : un **thème**, un **titre court**, une **question fermée** (« oui » veut dire voter pour) et une phrase **« Concrètement »**. Le titre officiel reste dans « Pour aller plus loin ». Format et contrôles : `pipeline/cartes.py`.

- **Les 12 thèmes** (liste fermée, celle de l'écran Explorer des maquettes) : Numérique, Droits, Travail, Économie, Immigration, Environnement, Éducation, Institutions, Énergie, Sécurité, Logement, Santé.
- **Les lots** iront dans `data/lots.json` après ton choix : 5 lots numérotés dans l'ordre où on les propose, 3 cartes chacun. Les 10 cartes du quiz restent dans `data/quiz.json`, au même format : il leur faut un thème de la liste et un titre court (proposés plus bas, à valider aussi).
- **Question pour toi.** La liste n'a pas de thème « International » ni « Défense » : je range le soutien à l'Ukraine (quiz) et la programmation militaire sous « Sécurité ». Autre solution : remplacer un thème peu servi par « International ».

## Critères

- **Les tiens, comme pour le quiz** : des sujets de société, à objet unique, compris en une phrase. Quand un texte en contient plusieurs, la carte retient la mesure principale et la réserve le dit.
- **Départager les groupes que le quiz sépare mal** : Dem / EPR (0), EcoS / SOC (0), DR / HOR (1) ; entre parenthèses, le nombre de votes du quiz où leurs positions diffèrent.
- **Varier les thèmes** : 3 thèmes différents par lot, pas plus de 2 votes par thème sur les 15.
- **Rédigé d'après le texte adopté** par l'Assemblée, lu en entier (à défaut, le texte de la commission, quand c'est lui qui a été voté). Chaque carte passe les contrôles 2, 4, 5 et 6 des fiches : longueurs, question fermée, vocabulaire neutre, chiffres présents dans le texte. « Vérifié » dit ce qui a été lu ; « Réserve », ce que la carte simplifie.
- **Une participation d'au moins 20 %** : en dessous, trop peu de députés à comparer.

## Ma proposition de 5 lots

Les lots sont composés un par un : chaque lot est le trio qui, ajouté au quiz et aux lots précédents, sépare le mieux les paires de groupes encore les moins séparées. Le premier lot est donc celui qui apporte le plus à qui s'arrête tôt.

| Lot | Votes | Paires les moins séparées qu'il départage | Précision après |
|---|---|---|---|
| 1 | Sécurité · 36 milliards d'euros de plus pour les armées (n° 7905) ; Santé · Le don du sang sur le temps de travail (n° 2256) ; Institutions · L'Alsace, une collectivité unique (n° 6045) | Dem / EPR (0 → 2), EcoS / SOC (0 → 1), DR / HOR (1 → 2), DR / UDR (2 → 3) | 48 % |
| 2 | Économie · S'opposer à l'accord avec le Mercosur (n° 4244) ; Institutions · Paris, Lyon, Marseille : deux votes municipaux (n° 1330) ; Énergie · Les centrales à charbon converties (n° 1306) | EcoS / SOC (1 → 2), DR / HOR (2 → 3), Dem / EPR (2 → 3), EPR / LIOT (2 → 3) | 55 % |
| 3 | Environnement · Les PFAS interdits dans cosmétiques et vêtements (n° 852) ; Éducation · Le repas à 1 euro pour tous les étudiants (n° 606) ; Sécurité · Le délit d'homicide routier (n° 2217) | DR / HOR (3 → 4), DR / LIOT (3 → 4), DR / UDR (3 → 4), Dem / LIOT (3 → 4) | 61 % |
| 4 | Économie · La nationalisation d'ArcelorMittal France (n° 7380) ; Santé · Un nombre minimum de soignants à l'hôpital (n° 600) ; Logement · Le logement social lié à l'emploi public (n° 7408) | DR / EPR (4 → 5), DR / HOR (4 → 5), DR / LIOT (4 → 5), DR / UDR (4 → 5) | 67 % |
| 5 | Immigration · La rétention des étrangers condamnés allongée (n° 2958) ; Logement · L'encadrement des loyers rendu permanent (n° 4745) ; Environnement · La publicité pour la mode ultra-express interdite (n° 7494) | DR / LIOT (5 → 6), Dem / LIOT (6 → 7), EPR / LIOT (6 → 7), HOR / LIOT (6 → 7) | 71 % |

Sur le quiz seul, la paire la moins séparée l'est 0 fois ; avec les 5 lots, 2 fois. 54 paires sur 55 sont séparées au moins trois fois sur les 25 votes.

**Jumeau.** Sur ces 25 votes, **519 députés** ont pris position (pour, contre, abstention) sur au moins 10 : ce sont ceux qui pourront être comparés à quelqu'un qui a tout tranché.

La proposition est calculée (séparation des groupes, puis participation) : elle ne dit rien de l'intérêt d'un sujet pour le public, que toi seul juges. Si tu retires un vote, je recalcule les lots.

## Les candidats

24 cartes : les 6 candidats du quiz non retenus, puis 18 nouveaux. Coche 15 cases (ou donne les numéros en session).

### 1. Immigration · La rétention des étrangers condamnés allongée · n° 2958 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il pouvoir retenir jusqu'à deux cent dix jours avant leur expulsion les étrangers condamnés pour des faits graves ? »
- **Concrètement** : Les étrangers condamnés pour certains crimes ou délits graves, ou dont le comportement menace gravement l'ordre public, pourront être maintenus en rétention administrative jusqu'à deux cent dix jours, le temps d'organiser leur départ.
- **Le vote** : scrutin solennel, adopté le 8 juillet 2025 ; 303 pour, 168 contre, 1 abstention ; participation 82 % ; 2 votes contre leur groupe. [Scrutin n° 2958](https://www.assemblee-nationale.fr/dyn/17/scrutins/2958).
- **Objet officiel** : l'ensemble de la proposition de loi visant à faciliter le maintien en rétention des personnes condamnées pour des faits d’une particulière gravité et présentant de forts risques de récidive (première lecture).
- **Écart entre groupes** :
  - Pour : DR (48-0-0), Dem (25-0-1), EPR (61-1-0), HOR (24-0-0), LIOT (19-1-0), RN (108-0-0), UDR (13-0-0)
  - Contre : EcoS (0-33-0), GDR (0-12-0), LFI (0-58-0), SOC (0-59-0)
- **Vérifié** : Texte de la commission (première lecture à l'Assemblée), articles 1er à 3 : durée maximale de rétention de « deux cent dix jours ».
- **Réserve** : « Expulsion » est le mot courant ; le texte parle d'éloignement.

### 2. Sécurité · Les Frères musulmans sur la liste terroriste de l'UE · n° 5106

- [ ] **Je le retiens**
- **Question** : « Faut-il demander l'inscription des Frères musulmans sur la liste européenne des organisations terroristes ? »
- **Concrètement** : Cette résolution, qui n'a pas force de loi, invite la Commission européenne à proposer l'inscription de la mouvance des Frères musulmans et de ses responsables sur la liste européenne des organisations terroristes.
- **Le vote** : scrutin ordinaire, adopté le 22 janvier 2026 ; 157 pour, 101 contre, 1 abstention ; participation 45 % ; 0 vote contre leur groupe. [Scrutin n° 5106](https://www.assemblee-nationale.fr/dyn/17/scrutins/5106).
- **Objet officiel** : l'article unique de la proposition de résolution européenne visant à inscrire la mouvance des frères musulmans sur la liste européenne des organisations terroristes.
- **Écart entre groupes** :
  - Pour : DR (40-0-0), Dem (10-0-1), EPR (22-0-0), HOR (9-0-0), LIOT (2-0-0), RN (65-0-0), UDR (7-0-0)
  - Contre : EcoS (0-23-0), GDR (0-6-0), LFI (0-47-0), SOC (0-25-0)
- **Vérifié** : Proposition de résolution européenne, texte de la commission, point 5.
- **Réserve** : Participation faible : moins de la moitié des députés ont voté.

### 3. Sécurité · 36 milliards d'euros de plus pour les armées · n° 7905 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il ajouter 36 milliards d'euros de ressources aux armées pour les années 2026 à 2030 ? »
- **Concrètement** : Le texte actualise la programmation militaire 2024-2030 : il prévoit 36 milliards d'euros de ressources nouvelles pour les armées sur la période 2026-2030.
- **Le vote** : scrutin solennel, adopté le 1 juillet 2026 ; 375 pour, 113 contre, 2 abstentions ; participation 85 % ; 2 votes contre leur groupe. [Scrutin n° 7905](https://www.assemblee-nationale.fr/dyn/17/scrutins/7905).
- **Objet officiel** : l'ensemble du projet de loi actualisant la programmation militaire pour les années 2024 à 2030 et portant diverses dispositions intéressant la défense (texte de la commission mixte paritaire).
- **Écart entre groupes** :
  - Pour : DR (44-0-0), Dem (26-0-0), EPR (86-0-0), HOR (35-0-0), LIOT (19-0-0), RN (97-0-0), SOC (46-1-0), UDR (14-0-0)
  - Contre : EcoS (1-36-1), GDR (0-14-1), LFI (0-62-0)
- **Vérifié** : Texte de la commission mixte paritaire, article 2.
- **Réserve** : Le texte contient aussi d'autres mesures de défense (43 articles) : la question retient la principale.

### 4. Économie · Un impôt plancher sur les très grands patrimoines · n° 881

- [ ] **Je le retiens**
- **Question** : « Faut-il que les personnes dont le patrimoine dépasse 100 millions d'euros paient au moins 2 % de sa valeur en impôts ? »
- **Concrètement** : Le texte crée un impôt plancher sur la fortune : les personnes dont le patrimoine dépasse 100 millions d'euros devraient payer, au total, des impôts égaux à au moins 2 % de sa valeur.
- **Le vote** : scrutin ordinaire, adopté le 20 février 2025 ; 116 pour, 39 contre, 31 abstentions ; participation 32 % ; 0 vote contre leur groupe. [Scrutin n° 881](https://www.assemblee-nationale.fr/dyn/17/scrutins/881).
- **Objet officiel** : l'ensemble de la proposition de loi instaurant un impôt plancher de 2 % sur le patrimoine des ultra riches (première lecture).
- **Écart entre groupes** :
  - Pour : EcoS (38-0-0), GDR (5-0-0), LFI (37-0-0), SOC (36-0-0)
  - Contre : DR (0-3-0), Dem (0-9-0), EPR (0-16-0), HOR (0-7-3), UDR (0-4-0)
  - Abstention : RN (0-0-28)
  - Sans position majoritaire : LIOT (0-0-0)
- **Vérifié** : Exposé des motifs et article unique (texte de la commission).
- **Réserve** : Vote en première lecture, participation faible (un tiers des députés) ; le texte n'est pas devenu loi.

### 5. Environnement · Les PFAS interdits dans cosmétiques et vêtements · n° 852 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il interdire les cosmétiques, les farts et les vêtements contenant des substances PFAS ? »
- **Concrètement** : Le texte interdit à partir du 1er janvier 2026 la fabrication et la vente de cosmétiques, de farts et de vêtements contenant des PFAS, sauf équipements de protection, et fixe une trajectoire de réduction de leurs rejets.
- **Le vote** : scrutin ordinaire, adopté le 20 février 2025 ; 231 pour, 51 contre, 7 abstentions ; participation 50 % ; 1 vote contre leur groupe. [Scrutin n° 852](https://www.assemblee-nationale.fr/dyn/17/scrutins/852).
- **Objet officiel** : l'ensemble de la proposition de loi visant à protéger la population des risques liés aux substances perfluoroalkylées et polyfluoroalkylées (deuxième lecture).
- **Écart entre groupes** :
  - Pour : DR (10-1-0), Dem (22-0-0), EPR (39-0-0), EcoS (38-0-0), GDR (8-0-0), HOR (20-0-0), LFI (45-0-0), LIOT (2-0-0), SOC (46-0-0)
  - Contre : RN (0-50-0)
  - Abstention : UDR (0-0-7)
- **Vérifié** : Texte de la commission (deuxième lecture), articles 1er et 1er bis.
- **Réserve** : Participation faible (la moitié des députés).

### 6. Économie · La nationalisation d'ArcelorMittal France · n° 7380 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il nationaliser la société ArcelorMittal France ? »
- **Concrètement** : L'État achèterait la société ArcelorMittal France, à un prix fixé par une commission et plafonné à la valeur moyenne de ses actions entre le 1er octobre 2024 et le 30 septembre 2025.
- **Le vote** : scrutin ordinaire, adopté le 11 juin 2026 ; 106 pour, 49 contre, 47 abstentions ; participation 35 % ; 0 vote contre leur groupe. [Scrutin n° 7380](https://www.assemblee-nationale.fr/dyn/17/scrutins/7380).
- **Objet officiel** : l'ensemble de la proposition de loi visant à la nationalisation d'ArcelorMittal France afin de préserver la souveraineté industrielle de la France (deuxième lecture).
- **Écart entre groupes** :
  - Pour : EcoS (20-0-0), GDR (16-0-0), LFI (45-0-0), SOC (25-0-0)
  - Contre : DR (0-2-0), Dem (0-5-0), EPR (0-30-0), HOR (0-7-2), LIOT (0-1-0), UDR (0-4-0)
  - Abstention : RN (0-0-45)
- **Vérifié** : Texte de la commission, article 1er.
- **Réserve** : Participation faible (un tiers des députés).

### 7. Santé · Le don du sang sur le temps de travail · n° 2256 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il permettre aux salariés de donner leur sang pendant leurs heures de travail, sans perte de salaire ? »
- **Concrètement** : Les salariés et les agents publics pourraient s'absenter, sans perte de salaire, pour donner leur sang, leurs plaquettes ou leur plasma, dans la limite de huit absences par an. L'employeur peut s'y opposer pour des raisons d'organisation.
- **Le vote** : scrutin ordinaire, adopté le 4 juin 2025 ; 125 pour, 12 contre, 8 abstentions ; participation 25 % ; 2 votes contre leur groupe. [Scrutin n° 2256](https://www.assemblee-nationale.fr/dyn/17/scrutins/2256).
- **Objet officiel** : l'ensemble de la proposition de loi permettant aux salariés de participer aux collectes de sang, de plaquettes ou de plasma sur leur temps de travail (première lecture).
- **Écart entre groupes** :
  - Pour : DR (8-0-0), EPR (12-2-4), EcoS (16-0-0), GDR (2-0-0), HOR (8-0-0), LFI (19-0-0), LIOT (4-0-0), RN (30-0-3), SOC (26-0-0)
  - Contre : Dem (0-7-1), UDR (0-3-0)
- **Vérifié** : Texte adopté, article 1er (autorisation d'absence, rémunération maintenue).

### 8. Éducation · Le repas à 1 euro pour tous les étudiants · n° 606 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il plafonner à 1 euro le prix du repas étudiant dans tous les restaurants universitaires ? »
- **Concrètement** : Le repas à tarif modéré servi aux étudiants dans tous les restaurants des Crous ne pourrait pas coûter plus de 1 euro, sur place comme à emporter.
- **Le vote** : scrutin ordinaire, adopté le 23 janvier 2025 ; 149 pour, 5 contre, 19 abstentions ; participation 30 % ; 0 vote contre leur groupe. [Scrutin n° 606](https://www.assemblee-nationale.fr/dyn/17/scrutins/606).
- **Objet officiel** : l'ensemble de la proposition de loi visant à rendre accessible à tous les étudiants le repas à 1 euro (première lecture).
- **Écart entre groupes** :
  - Pour : EcoS (27-0-0), GDR (4-0-0), LFI (32-0-0), LIOT (4-0-0), RN (24-0-0), SOC (57-0-0)
  - Contre : HOR (0-3-1)
  - Abstention : DR (0-0-2), Dem (0-0-5), EPR (1-2-11)
  - Sans position majoritaire : UDR (0-0-0)
- **Vérifié** : Texte adopté, article 1er.
- **Réserve** : Le texte s'applique à l'offre à tarif modéré ouverte à tous les étudiants ; le repas à 1 euro était jusque-là réservé aux boursiers et aux étudiants en difficulté (exposé des motifs).

### 9. Santé · Un nombre minimum de soignants à l'hôpital · n° 600 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il fixer un nombre minimum de soignants par patient dans les hôpitaux ? »
- **Concrètement** : Pour chaque spécialité, un décret fixerait, après avis de la Haute Autorité de santé, un nombre minimum de soignants par lit. Un hôpital public qui ne peut le respecter plus de trois jours devrait prévenir l'agence régionale de santé.
- **Le vote** : scrutin ordinaire, adopté le 23 janvier 2025 ; 138 pour, 3 contre, 70 abstentions ; participation 37 % ; 0 vote contre leur groupe. [Scrutin n° 600](https://www.assemblee-nationale.fr/dyn/17/scrutins/600).
- **Objet officiel** : l'ensemble de la proposition de loi, adoptée par le Sénat, relative à l'instauration d'un nombre minimum de soignants par patient hospitalisé (première lecture).
- **Écart entre groupes** :
  - Pour : DR (2-0-0), EcoS (27-0-0), GDR (6-0-0), LFI (35-0-0), LIOT (4-0-0), SOC (62-0-0)
  - Abstention : Dem (1-0-6), EPR (0-1-26), HOR (1-2-7), RN (0-0-30), UDR (0-0-1)
- **Vérifié** : Texte adopté (article unique, II : articles L. 6124-3 et L. 6124-5).
- **Réserve** : Texte venu du Sénat ; le ratio s'applique à partir du 1er janvier 2027.

### 10. Économie · S'opposer à l'accord avec le Mercosur · n° 4244 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il demander au Gouvernement de s'opposer à l'accord de libre-échange entre l'Union européenne et le Mercosur ? »
- **Concrètement** : Cette résolution, qui n'a pas force de loi, invite le Gouvernement à s'opposer à l'accord de libre-échange entre l'Union européenne et les pays du Mercosur, en réunissant une minorité de blocage au Conseil de l'Union, et à saisir la Cour de justice de l'Union.
- **Le vote** : scrutin ordinaire, adopté le 27 novembre 2025 ; 244 pour, 1 contre, 5 abstentions ; participation 43 % ; 1 vote contre leur groupe. [Scrutin n° 4244](https://www.assemblee-nationale.fr/dyn/17/scrutins/4244).
- **Objet officiel** : la proposition de résolution invitant le Gouvernement de la République française à s’opposer à l’adoption de l’accord commercial entre l’Union européenne et le Mercosur (article 34-1 de la Constitution).
- **Écart entre groupes** :
  - Pour : DR (11-0-0), Dem (8-0-0), EcoS (26-0-0), GDR (8-0-0), HOR (13-0-0), LFI (68-0-0), LIOT (6-0-0), RN (64-0-0), SOC (29-1-0), UDR (8-0-0)
  - Abstention : EPR (0-0-5)
- **Vérifié** : Proposition de résolution (article 34-1 de la Constitution) : dispositif.
- **Réserve** : Le Mercosur réunit des pays d'Amérique du Sud ; la carte ne le dit pas, faute de le lire dans le texte.

### 11. Institutions · L'Alsace, une collectivité unique · n° 6045 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il que l'Alsace devienne une collectivité unique, avec les compétences d'un département et d'une région ? »
- **Concrètement** : La Collectivité européenne d'Alsace deviendrait « l'Alsace », une collectivité à statut particulier qui exercerait les compétences des départements et des régions, avec une assemblée élue en même temps que les conseils régionaux.
- **Le vote** : scrutin ordinaire, adopté le 8 avril 2026 ; 131 pour, 100 contre, 12 abstentions ; participation 42 % ; 13 votes contre leur groupe. [Scrutin n° 6045](https://www.assemblee-nationale.fr/dyn/17/scrutins/6045).
- **Objet officiel** : l'ensemble de la proposition de loi visant à simplifier le millefeuille territorial par la collectivité unique (première lecture).
- **Écart entre groupes** :
  - Pour : DR (9-4-1), EPR (35-3-1), RN (64-0-0), UDR (4-0-0)
  - Contre : EcoS (0-13-0), GDR (0-2-0), HOR (5-8-1), LFI (0-27-0), SOC (1-32-0)
  - Abstention : Dem (6-4-8)
  - Sans position majoritaire : LIOT (4-4-0)
- **Vérifié** : Texte adopté, article 2.
- **Réserve** : Sujet régional. L'article 1er, qui permettait à d'autres départements regroupés de reprendre les compétences de leur région, a été supprimé en commission.

### 12. Économie · Le pays d'origine sur toutes les étiquettes · n° 3273

- [ ] **Je le retiens**
- **Question** : « Faut-il rendre obligatoire l'indication du pays d'origine sur tous les produits alimentaires ? »
- **Concrètement** : L'étiquette de tout produit agricole ou alimentaire, brut ou transformé, devrait indiquer son pays d'origine, ainsi que celui de l'ingrédient principal et de chaque ingrédient qui représente 10 % ou plus du produit.
- **Le vote** : scrutin ordinaire, rejeté le 30 octobre 2025 ; 149 pour, 174 contre, 8 abstentions ; participation 57 % ; 1 vote contre leur groupe. [Scrutin n° 3273](https://www.assemblee-nationale.fr/dyn/17/scrutins/3273).
- **Objet officiel** : l'ensemble de la proposition de loi visant à rendre systématique l'information du consommateur sur l'origine des denrées alimentaires par le moyen de l'étiquetage (première lecture).
- **Écart entre groupes** :
  - Pour : DR (16-0-0), RN (119-0-0), UDR (12-0-0)
  - Contre : Dem (1-8-1), EPR (0-41-0), EcoS (0-26-0), GDR (0-2-0), LFI (0-48-0), SOC (0-46-0)
  - Abstention : HOR (0-2-4), LIOT (0-1-2)
- **Vérifié** : Texte de la commission (texte voté), article 1er.
- **Réserve** : Texte rejeté. Il prévoyait aussi des sanctions, et un étiquetage des produits importés faits avec des produits phytosanitaires interdits dans l'Union.

### 13. Logement · Le logement social lié à l'emploi public · n° 7408 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il qu'un agent public logé grâce à son employeur puisse perdre ce logement quand il quitte son poste ? »
- **Concrètement** : Un agent public, ou un salarié des transports publics dans les zones tendues, logé sur proposition de son employeur pourrait voir son bail résilié dans l'année qui suit la fin de son emploi, avec un préavis d'au moins six mois.
- **Le vote** : scrutin solennel, adopté le 17 juin 2026 ; 292 pour, 160 contre, 14 abstentions ; participation 81 % ; 0 vote contre leur groupe. [Scrutin n° 7408](https://www.assemblee-nationale.fr/dyn/17/scrutins/7408).
- **Objet officiel** : l'ensemble de la proposition de loi visant à améliorer l'accès au logement des travailleurs des services publics (texte de la commission mixte paritaire).
- **Écart entre groupes** :
  - Pour : DR (42-0-0), Dem (24-0-2), EPR (80-0-0), HOR (33-0-0), RN (89-0-0), UDR (17-0-0)
  - Contre : EcoS (0-31-0), GDR (0-13-0), LFI (0-63-0), SOC (0-51-0)
  - Abstention : LIOT (2-2-12)
- **Vérifié** : Texte adopté (commission mixte paritaire), article 1er : clause de fonction.
- **Réserve** : Le texte contient d'autres mesures pour loger ces travailleurs (terrains publics vendus moins cher, constructions dérogatoires) : la question retient la plus débattue.

### 14. Logement · L'encadrement des loyers rendu permanent · n° 4745 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il rendre permanent l'encadrement des loyers et l'ouvrir à toutes les communes où se loger est difficile ? »
- **Concrètement** : L'encadrement des loyers ne serait plus une expérimentation : les villes où l'offre de logements ne suffit pas à la demande pourraient l'appliquer durablement, sur tout ou partie de leur territoire.
- **Le vote** : scrutin ordinaire, adopté le 11 décembre 2025 ; 105 pour, 56 contre, 4 abstentions ; participation 29 % ; 0 vote contre leur groupe. [Scrutin n° 4745](https://www.assemblee-nationale.fr/dyn/17/scrutins/4745).
- **Objet officiel** : l'ensemble de la proposition de loi pour retrouver la confiance et l'équilibre dans les rapports locatifs (première lecture).
- **Écart entre groupes** :
  - Pour : EcoS (17-0-0), GDR (3-0-0), LFI (30-0-0), LIOT (1-0-0), SOC (54-0-0)
  - Contre : DR (0-2-0), Dem (0-4-0), EPR (0-13-3), HOR (0-6-0), RN (0-28-1), UDR (0-3-0)
- **Vérifié** : Texte adopté, article 1er.
- **Réserve** : Le texte double aussi les amendes des bailleurs qui ne respectent pas l'encadrement et oblige à justifier un congé pour vente : la question retient la mesure principale.

### 15. Institutions · Le vote par correspondance des détenus limité · n° 2244

- [ ] **Je le retiens**
- **Question** : « Faut-il limiter le vote par correspondance des personnes détenues aux élections européennes et aux référendums ? »
- **Concrètement** : Une personne détenue ne pourrait plus voter par correspondance, depuis la commune de sa prison, qu'aux élections où la France forme une seule circonscription, comme les européennes, et aux référendums.
- **Le vote** : scrutin ordinaire, adopté le 4 juin 2025 ; 109 pour, 60 contre, 2 abstentions ; participation 30 % ; 0 vote contre leur groupe. [Scrutin n° 2244](https://www.assemblee-nationale.fr/dyn/17/scrutins/2244).
- **Objet officiel** : l'ensemble de la proposition de loi relative au droit de vote par correspondance des personnes détenues (première lecture).
- **Écart entre groupes** :
  - Pour : DR (5-0-0), Dem (5-0-0), EPR (29-0-0), HOR (13-0-0), RN (53-0-0), UDR (4-0-0)
  - Contre : EcoS (0-12-0), GDR (0-2-0), LFI (0-26-0), LIOT (0-2-0), SOC (0-18-2)
- **Vérifié** : Texte adopté, article unique (code électoral, article L. 12-1).
- **Réserve** : Le texte de la commission disait l'inverse (bureau de vote dans chaque prison) : la séance l'a réécrit. Les européennes ne sont pas nommées dans le texte.

### 16. Institutions · Paris, Lyon, Marseille : deux votes municipaux · n° 1330 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il élire le conseil municipal de Paris, Lyon et Marseille séparément des conseils d'arrondissement ? »
- **Concrètement** : À Paris, Lyon et Marseille, le conseil de la ville et les conseils d'arrondissement seraient élus par deux scrutins distincts, au lieu d'un seul vote par secteur. La liste arrivée en tête dans la ville aurait une prime d'un quart des sièges.
- **Le vote** : scrutin ordinaire, adopté le 9 avril 2025 ; 183 pour, 53 contre, 17 abstentions ; participation 44 % ; 7 votes contre leur groupe. [Scrutin n° 1330](https://www.assemblee-nationale.fr/dyn/17/scrutins/1330).
- **Objet officiel** : l'ensemble de la proposition de loi visant à réformer le mode d'élection des membres du Conseil de Paris et des conseils municipaux de Lyon et Marseille (première lecture).
- **Écart entre groupes** :
  - Pour : DR (14-1-2), Dem (20-1-0), EPR (28-0-2), LFI (50-0-0), LIOT (4-3-1), RN (57-0-0), UDR (6-0-0)
  - Contre : EcoS (0-20-0), GDR (0-6-0), SOC (2-22-0)
  - Abstention : HOR (0-0-12)
- **Vérifié** : Texte adopté, articles 1er (L. 271, L. 272-4-1) et 4.
- **Réserve** : Première lecture ; la loi a été adoptée définitivement le 10 juillet 2025 (scrutin n° 3018, participation plus faible).

### 17. Économie · Les allocations familiales dès le premier enfant · n° 2272

- [ ] **Je le retiens**
- **Question** : « Faut-il verser les allocations familiales dès le premier enfant ? »
- **Concrètement** : Les familles toucheraient les allocations familiales dès leur premier enfant, et non plus à partir du deuxième.
- **Le vote** : scrutin ordinaire, adopté le 5 juin 2025 ; 103 pour, 17 contre, 5 abstentions ; participation 22 % ; 0 vote contre leur groupe. [Scrutin n° 2272](https://www.assemblee-nationale.fr/dyn/17/scrutins/2272).
- **Objet officiel** : l'ensemble de la proposition de loi visant à accorder le versement des allocations familiales dès le premier enfant (première lecture).
- **Écart entre groupes** :
  - Pour : DR (4-0-0), EcoS (19-0-0), GDR (15-0-0), LFI (22-0-0), LIOT (2-0-0), RN (24-0-0), SOC (14-0-0), UDR (3-0-0)
  - Contre : EPR (0-13-2), HOR (0-3-2)
  - Sans position majoritaire : Dem (0-1-1)
- **Vérifié** : Texte de la commission, article 1er (aucun texte adopté publié).

### 18. Environnement · La publicité pour la mode ultra-express interdite · n° 7494 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il interdire la publicité pour la mode ultra-express, y compris par les influenceurs ? »
- **Concrètement** : Le texte définit la mode ultra-express, qui met en vente un très grand nombre de nouveaux vêtements peu réparables, et en interdit la publicité, y compris par les influenceurs, à partir du 1er janvier 2027.
- **Le vote** : scrutin solennel, adopté le 24 juin 2026 ; 338 pour, 0 contre, 151 abstentions ; participation 85 % ; 0 vote contre leur groupe. [Scrutin n° 7494](https://www.assemblee-nationale.fr/dyn/17/scrutins/7494).
- **Objet officiel** : l’ensemble de la proposition de loi visant à réduire l’impact environnemental de l’industrie textile (texte de la commission mixte paritaire).
- **Écart entre groupes** :
  - Pour : DR (44-0-0), Dem (32-0-0), EPR (89-0-0), HOR (33-0-0), LIOT (16-0-0), RN (98-0-0), UDR (17-0-0)
  - Abstention : EcoS (0-0-35), GDR (3-0-12), LFI (0-0-50), SOC (0-0-54)
- **Vérifié** : Texte adopté (commission mixte paritaire), articles 1er, 3 et 3 bis.
- **Réserve** : Le texte contient d'autres mesures (affichage du lieu de fabrication, éco-contribution modulée) : la question retient la plus visible.

### 19. Énergie · Les centrales à charbon converties · n° 1306 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il faciliter la conversion des centrales électriques au charbon vers des combustibles moins émetteurs ? »
- **Concrètement** : Les centrales au charbon converties pour émettre moins de 550 grammes de dioxyde de carbone par kilowattheure seraient traitées comme de nouvelles installations ; les entreprises publiques qui en exploitent présenteraient un plan avant fin 2026.
- **Le vote** : scrutin ordinaire, adopté le 7 avril 2025 ; 145 pour, 0 contre, 6 abstentions ; participation 26 % ; 0 vote contre leur groupe. [Scrutin n° 1306](https://www.assemblee-nationale.fr/dyn/17/scrutins/1306).
- **Objet officiel** : l'ensemble de la proposition de loi visant à convertir des centrales à charbon vers des combustibles moins émetteurs en dioxyde de carbone pour permettre une transition écologique plus juste socialement (première lecture).
- **Écart entre groupes** :
  - Pour : DR (2-0-0), Dem (11-0-0), EPR (17-0-0), GDR (4-0-0), HOR (7-0-0), LFI (31-0-0), LIOT (3-0-0), RN (46-0-0), SOC (16-0-0), UDR (5-0-0)
  - Abstention : EcoS (0-0-6)
- **Vérifié** : Texte de la commission, articles 1er et 4 (texte venu du Sénat).
- **Réserve** : Seul le groupe écologiste s'est abstenu ; tous les autres ont voté pour.

### 20. Sécurité · Les rave-parties non déclarées punies de prison · n° 6124

- [ ] **Je le retiens**
- **Question** : « Faut-il punir de prison l'organisation d'une rave-party non déclarée ou interdite ? »
- **Concrètement** : Aider à organiser une rave-party d'au moins 250 personnes sans déclaration ou malgré une interdiction serait puni de six mois de prison et de 30 000 euros d'amende, avec confiscation du matériel.
- **Le vote** : scrutin ordinaire, adopté le 9 avril 2026 ; 78 pour, 67 contre, 0 abstention ; participation 25 % ; 0 vote contre leur groupe. [Scrutin n° 6124](https://www.assemblee-nationale.fr/dyn/17/scrutins/6124).
- **Objet officiel** : l'ensemble de la proposition de loi visant à renforcer la pénalisation de l’organisation de rave-parties (première lecture).
- **Écart entre groupes** :
  - Pour : DR (7-0-0), Dem (8-0-0), EPR (16-0-0), HOR (27-0-0), LIOT (1-0-0), RN (18-0-0)
  - Contre : EcoS (0-21-0), GDR (0-2-0), LFI (0-34-0), SOC (0-10-0)
  - Sans position majoritaire : UDR (0-0-0)
- **Vérifié** : Texte adopté, articles 1er et 2.
- **Réserve** : Le texte parle de « rassemblement festif à caractère musical », pas de rave-party.

### 21. Sécurité · Le délit d'homicide routier · n° 2217 · **proposé**

- [ ] **Je le retiens**
- **Question** : « Faut-il créer un délit d'homicide routier pour les conducteurs qui tuent en ayant bu, pris des stupéfiants ou commis une faute délibérée ? »
- **Concrètement** : Un conducteur qui cause la mort sans le vouloir commettrait un « homicide routier », puni de sept ans de prison et de 100 000 euros d'amende, s'il conduisait ivre ou drogué, ou en violant délibérément une règle de sécurité.
- **Le vote** : scrutin ordinaire, adopté le 3 juin 2025 ; 194 pour, 6 contre, 3 abstentions ; participation 35 % ; 0 vote contre leur groupe. [Scrutin n° 2217](https://www.assemblee-nationale.fr/dyn/17/scrutins/2217).
- **Objet officiel** : l'ensemble de la proposition de loi créant l'homicide routier et visant à lutter contre la violence routière (deuxième lecture).
- **Écart entre groupes** :
  - Pour : DR (23-0-0), Dem (16-0-0), EPR (35-0-0), EcoS (9-0-0), GDR (2-0-0), HOR (9-0-0), LIOT (5-0-0), RN (57-0-0), SOC (28-0-0), UDR (7-0-0)
  - Contre : LFI (0-6-3)
- **Vérifié** : Texte adopté (deuxième lecture), article 1er (article 221-18 du code pénal).
- **Réserve** : Le texte compte d'autres cas (sans permis, grand excès de vitesse, délit de fuite…) et d'autres mesures de sécurité routière.

### 22. Immigration · Les titres de séjour renouvelés automatiquement · n° 4754

- [ ] **Je le retiens**
- **Question** : « Faut-il renouveler automatiquement les titres de séjour de longue durée des étrangers ? »
- **Concrètement** : La carte de séjour pluriannuelle et la carte de résident seraient renouvelées automatiquement ; sans réponse de l'administration quatre mois après une demande de renouvellement, celle-ci serait acceptée.
- **Le vote** : scrutin ordinaire, adopté le 11 décembre 2025 ; 98 pour, 37 contre, 2 abstentions ; participation 24 % ; 0 vote contre leur groupe. [Scrutin n° 4754](https://www.assemblee-nationale.fr/dyn/17/scrutins/4754).
- **Objet officiel** : l'ensemble de la proposition de loi visant à garantir un renouvellement automatique des titres de séjour de longue durée (première lecture).
- **Écart entre groupes** :
  - Pour : EcoS (14-0-0), GDR (5-0-0), LFI (29-0-0), SOC (50-0-0)
  - Contre : DR (0-2-0), EPR (0-9-0), HOR (0-1-0), RN (0-20-0), UDR (0-3-0)
  - Sans position majoritaire : Dem (0-2-2), LIOT (0-0-0)
- **Vérifié** : Texte adopté, article 1er.

### 23. Droits · Les jeunes isolés hébergés pendant leur recours · n° 4723

- [ ] **Je le retiens**
- **Question** : « Faut-il continuer d'héberger un jeune qui se dit mineur et isolé tant que le juge n'a pas tranché son recours ? »
- **Concrètement** : Un jeune qui se dit mineur et isolé, mais n'a pas été reconnu comme tel, resterait hébergé en urgence pendant son recours devant le juge. Le texte interdit aussi d'évaluer son âge par un examen des os, des dents ou de la puberté.
- **Le vote** : scrutin ordinaire, adopté le 11 décembre 2025 ; 144 pour, 100 contre, 2 abstentions ; participation 43 % ; 0 vote contre leur groupe. [Scrutin n° 4723](https://www.assemblee-nationale.fr/dyn/17/scrutins/4723).
- **Objet officiel** : l'ensemble de la proposition de loi visant à protéger les mineurs isolés et à lutter contre le sans-abrisme (première lecture).
- **Écart entre groupes** :
  - Pour : EcoS (23-0-0), GDR (7-0-0), LFI (51-0-0), SOC (63-0-0)
  - Contre : DR (0-6-0), Dem (0-3-2), EPR (0-28-0), HOR (0-10-0), LIOT (0-1-0), RN (0-48-0), UDR (0-4-0)
- **Vérifié** : Texte adopté, articles 1er et 1er ter.

### 24. Sécurité · Protéger ceux qui agissent contre les réseaux · n° 5358

- [ ] **Je le retiens**
- **Question** : « Faut-il que l'État protège les personnes menacées parce qu'elles agissent contre la criminalité organisée ? »
- **Concrètement** : Les personnes mises en danger parce qu'elles rassemblent des preuves contre la criminalité organisée, aident ses victimes ou agissent pour la faire reculer, ainsi que leurs proches, seraient protégées par la police et la gendarmerie.
- **Le vote** : scrutin ordinaire, adopté le 12 février 2026 ; 123 pour, 0 contre, 133 abstentions ; participation 44 % ; 0 vote contre leur groupe. [Scrutin n° 5358](https://www.assemblee-nationale.fr/dyn/17/scrutins/5358).
- **Objet officiel** : l'ensemble de la proposition de loi améliorant la protection des personnes ciblées par les réseaux de criminalité organisée (première lecture).
- **Écart entre groupes** :
  - Pour : EcoS (37-0-0), GDR (3-0-0), LFI (48-0-0), LIOT (4-0-1), SOC (28-0-0)
  - Abstention : DR (0-0-15), Dem (1-0-7), EPR (2-0-26), HOR (0-0-12), RN (0-0-65), UDR (0-0-7)
- **Vérifié** : Texte adopté, article 1er (article L. 22-12-1 du code de la sécurité intérieure).

## Les cartes du quiz : thème et titre court proposés

Les questions et « Concrètement » du quiz ne changent pas.

| N° | Thème | Titre court | Question |
|---|---|---|---|
| 8280 | Santé | L'aide à mourir | Faut-il permettre aux adultes atteints d'une maladie grave et incurable en phase avancée de demander une aide à mourir ? |
| 8431 | Numérique | Les réseaux sociaux interdits avant 15 ans | Faut-il interdire les réseaux sociaux aux moins de quinze ans et le téléphone portable dans les lycées ? |
| 7987 | Sécurité | La légitime défense présumée des forces de l'ordre | Faut-il présumer que les policiers et gendarmes qui utilisent leur arme dans les cas prévus par la loi ont agi en légitime défense ? |
| 7454 | Institutions | Un statut d'autonomie pour la Corse | Faut-il inscrire dans la Constitution un statut d'autonomie pour la Corse au sein de la République ? |
| 1308 | Immigration | La nationalité des enfants nés à Mayotte | Faut-il exiger que les deux parents résident en France depuis plus d'un an pour qu'un enfant né à Mayotte puisse devenir français ? |
| 3260 | Immigration | Dénoncer l'accord franco-algérien de 1968 | Faut-il demander au Gouvernement de dénoncer l'accord franco-algérien de 1968 sur l'entrée et le séjour des Algériens ? |
| 988 | Sécurité | Plus de soutien à l'Ukraine | Faut-il appeler l'Union européenne et ses alliés à accroître leur soutien politique, économique et militaire à l'Ukraine ? |
| 2257 | Travail | L'abrogation de la réforme des retraites | Faut-il affirmer la nécessité d'abroger la réforme des retraites de 2023, qui a reculé l'âge légal de 62 à 64 ans ? |
| 3061 | Droits | Le consentement dans la définition du viol | Faut-il définir le viol et les agressions sexuelles comme tout acte sexuel non consenti ? |
| 2957 | Environnement | Des dérogations pour les néonicotinoïdes | Faut-il permettre, à titre exceptionnel, des dérogations à l'interdiction des pesticides néonicotinoïdes ? |

## Séparation des groupes

Nombre de votes où les deux groupes n'ont pas la même position : sur les 10 du quiz, puis sur les 25 avec les lots proposés.

| | DR | Dem | EPR | EcoS | GDR | HOR | LFI | LIOT | RN | SOC | UDR |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **DR** | — | 3 → 6 | 3 → 5 | 7 → 17 | 8 → 17 | 1 → 5 | 9 → 18 | 3 → 6 | 4 → 8 | 7 → 15 | 2 → 5 |
| **Dem** | 3 → 6 | — | 0 → 3 | 4 → 16 | 6 → 17 | 2 → 6 | 6 → 17 | 2 → 7 | 7 → 12 | 4 → 14 | 5 → 7 |
| **EPR** | 3 → 5 | 0 → 3 | — | 4 → 16 | 6 → 17 | 2 → 6 | 6 → 17 | 2 → 7 | 7 → 11 | 4 → 14 | 5 → 8 |
| **EcoS** | 7 → 17 | 4 → 16 | 4 → 16 | — | 2 → 3 | 6 → 16 | 2 → 5 | 4 → 11 | 9 → 20 | 0 → 2 | 9 → 21 |
| **GDR** | 8 → 17 | 6 → 17 | 6 → 17 | 2 → 3 | — | 8 → 17 | 2 → 4 | 6 → 12 | 8 → 18 | 2 → 3 | 8 → 19 |
| **HOR** | 1 → 5 | 2 → 6 | 2 → 6 | 6 → 16 | 8 → 17 | — | 8 → 18 | 2 → 7 | 5 → 10 | 6 → 14 | 3 → 7 |
| **LFI** | 9 → 18 | 6 → 17 | 6 → 17 | 2 → 5 | 2 → 4 | 8 → 18 | — | 6 → 12 | 9 → 19 | 2 → 5 | 10 → 21 |
| **LIOT** | 3 → 6 | 2 → 7 | 2 → 7 | 4 → 11 | 6 → 12 | 2 → 7 | 6 → 12 | — | 5 → 10 | 4 → 9 | 5 → 10 |
| **RN** | 4 → 8 | 7 → 12 | 7 → 11 | 9 → 20 | 8 → 18 | 5 → 10 | 9 → 19 | 5 → 10 | — | 9 → 18 | 2 → 5 |
| **SOC** | 7 → 15 | 4 → 14 | 4 → 14 | 0 → 2 | 2 → 3 | 6 → 14 | 2 → 5 | 4 → 9 | 9 → 18 | — | 9 → 19 |
| **UDR** | 2 → 5 | 5 → 7 | 5 → 8 | 9 → 21 | 8 → 19 | 3 → 7 | 10 → 21 | 5 → 10 | 2 → 5 | 9 → 19 | — |

## Regardés et écartés

- n° 5254 (gratuité des parkings des hôpitaux), 7397 (bourses étudiantes), 2274 (« double dette » d'Haïti), 682 (protoxyde d'azote), 5427 (outils numériques des commerçants) : participation de 17 % ou moins : trop peu de députés à comparer.
- n° 3018 (Paris, Lyon, Marseille, lecture définitive) : même texte que le n° 1330, avec une participation de 25 % au lieu de 44 %.
- n° 8433 et 8279 (ordre public), 8427 et 7259 (urgence agricole), 8042 (justice criminelle), 1473 et 1194 (narcotrafic), 7405 et 6318 (sécurité et rétention), 6023 (fraudes) : textes « fourre-tout » : la question n'en citerait qu'une mesure.
- n° 2460 (stockage du dioxyde de carbone sous la mer, Protocole de Londres) : technique : ne se comprend pas en une phrase.
- n° 7894, 5729, 2107 (aide à mourir), 5192 (réseaux sociaux), 738 (Mayotte), 1202 (viol), 4438 (ArcelorMittal), 217 (retraites) : même sujet qu'un vote du quiz ou qu'un candidat repris.
- n° 289 (meublés de tourisme) : texte de la commission mixte paritaire publié par le Sénat seulement : pas de texte de l'Assemblée à citer.
