# Essai de vulgarisation sur 5 textes

Généré le 2026-10-07T13:25:56+00:00 par `uv run python -m scripts.essai_vulgarisation` (modèle `claude-opus-5-5`, effort `high`). Sorties brutes : `data/mesures/vulgarisation/essai.json`. Contrôles : `docs/vulgarisation-controles.md`. Tout est régénéré, sauf les sections « Constats » et « Relecture ».

Fiches **générées automatiquement à partir du texte officiel**, à relire avant toute publication.

## Constats

<!-- constats:debut -->
Lecture de l'essai du 7 octobre 2026, lancé par le workflow « Essai de vulgarisation » sur GitHub (Claude Opus 5.5, effort `high`).

**Résultat**
- **3 fiches publiables sur 5**, toutes dès la première tentative : légitime défense (7987), hydroélectricité (7409) et réseaux sociaux (8431).
- **2 replis** (Corse 7454, maladies cardio-neuro-vasculaires 8419). Ils étaient justifiés : à la 2e tentative, la relecture automatique (contrôle 7) a relevé une vraie inexactitude dans la carte 3. Pour la Corse, la carte parlait d'un « décret du Gouvernement » là où le texte prévoit un décret en Conseil d'État délibéré en conseil des ministres, après avis de l'assemblée de Corse. Pour la santé, le dépistage n'est prévu qu'à la visite de mi-carrière, pas à toute visite médicale au travail. Rien d'inexact n'aurait donc été publié : le repli a fonctionné comme prévu.
- Aucune réponse refusée par le modèle, aucun basculement vers un modèle de secours.

**Deux faux positifs, corrigés après l'essai**
- Les premières tentatives de ces deux textes avaient été rejetées à tort par le contrôle 5 (vocabulaire). « rendez-vous » déclenchait « vous » ; « historique » venait du texte constitutionnel lui-même (« communauté historique »). Le contrôle ne compte plus que les mots entiers, et accepte un mot employé par le texte voté.
- Recontrôlées avec cette correction, les 7 tentatives de l'essai passent toutes les contrôles 1 à 6. On ne sait pas si les premières versions de la Corse et de la santé auraient passé la relecture (contrôle 7) : elles n'y sont pas allées. Je n'ai pas relancé l'essai, pour garder le crédit.

**Limites constatées (à traiter en t27)**
- **Un extrait peut être exact sans prouver la carte.** Pour la carte 3 du texte sur les réseaux sociaux, l'extrait est l'insertion d'une référence (« 223‑14 ») dans une loi de 2004 : il est bien dans l'article, mais n'éclaire pas le lecteur. Proposition : demander aussi à la relecture si l'extrait appuie la carte.
- **Question double.** « Faut-il interdire les réseaux sociaux aux moins de quinze ans et le téléphone portable dans les lycées ? » est fermée, mais elle réunit deux mesures. Faut-il imposer une seule idée par question ? À trancher à la relecture (t08).
- **Texte de commission mixte paritaire.** Il ne contient que les articles restés en discussion (17 sur 24 pour l'hydroélectricité, 3 pour les réseaux sociaux). Les mesures adoptées dans les mêmes termes par les deux chambres en sont absentes. Les cartes peuvent donc manquer une mesure importante. Pour t27 : reconstituer le texte complet à partir du dernier texte adopté.
- **Choix du texte voté.** Il a été fait à la main pour l'essai, selon une règle simple : le dernier texte de l'Assemblée déposé avant le scrutin. Pour la Corse et la légitime défense, la commission n'a pas publié de texte : c'est le texte déposé qui est voté. Cette règle est à automatiser en t27.
- **Très gros textes.** Le texte le plus long (hydroélectricité, 74 000 jetons en entrée) a coûté 0,37 $. Un budget (projet de loi de finances) dépasserait largement ce volume : il faudra le découper ou l'exclure.

**Coût**
- 1,02 $ pour l'essai (environ 0,95 €), soit 0,20 $ par texte, nouvelle tentative et relecture comprises. La réflexion du modèle est comptée dans les jetons de sortie.
- **Décision du 7 octobre 2026 : zéro euro.** Ce coût, même faible (environ 2 $ par mois projetés), n'est pas acceptable pour le projet. L'essai ne sera pas reconduit avec l'API. Les fiches seront rédigées dans la session Claude Code hebdomadaire de Julien, qui les valide (voir docs/decisions.md et t27). Les consignes, le schéma et les 7 contrôles de cet essai restent ceux de la session.

**Critère de fin de t07**
- Les 5 fiches sont lisibles ci-dessous. Pour les 2 replis, c'est la dernière version, marquée comme non publiée.
- Chaque carte cite un article du texte voté, avec un extrait vérifié mot pour mot (contrôle 3). Le lien vers le texte figure sous chaque fiche.
- Le coût par dossier est connu.
- Reste la relecture humaine (t08).
<!-- constats:fin -->

<!-- relecture:debut -->
## Relecture de Julien (t08)

Pour chaque fiche, cocher (remplacer `[ ]` par `[x]`) ce qui est vrai, et noter toute remarque en dessous. Ouvrir le texte voté (lien sous chaque fiche) pour vérifier les articles cités.

**Scrutin 7454 · institutions**
- [ ] Juste : chaque carte dit bien ce que prévoit l'article cité
- [ ] Neutre : rien ne pousse à voter pour ou contre
- [ ] Compréhensible par quelqu'un qui ne suit pas la politique
- Remarques :

**Scrutin 7987 · sécurité**
- [ ] Juste : chaque carte dit bien ce que prévoit l'article cité
- [ ] Neutre : rien ne pousse à voter pour ou contre
- [ ] Compréhensible par quelqu'un qui ne suit pas la politique
- Remarques :

**Scrutin 7409 · énergie**
- [ ] Juste : chaque carte dit bien ce que prévoit l'article cité
- [ ] Neutre : rien ne pousse à voter pour ou contre
- [ ] Compréhensible par quelqu'un qui ne suit pas la politique
- Remarques :

**Scrutin 8431 · numérique**
- [ ] Juste : chaque carte dit bien ce que prévoit l'article cité
- [ ] Neutre : rien ne pousse à voter pour ou contre
- [ ] Compréhensible par quelqu'un qui ne suit pas la politique
- Remarques :

**Scrutin 8419 · santé**
- [ ] Juste : chaque carte dit bien ce que prévoit l'article cité
- [ ] Neutre : rien ne pousse à voter pour ou contre
- [ ] Compréhensible par quelqu'un qui ne suit pas la politique
- Remarques :

**Remarques générales** :

<!-- relecture:fin -->

## Synthèse

- Fiches publiables (7 contrôles passés) : **3 sur 5**.
- Coût de l'essai : **1.02 $** au tarif public de `claude-opus-5-5`, soit 0.204 $ par texte en moyenne, nouvelles tentatives et relecture comprises.
- Essai unique : depuis le 7 octobre 2026, le projet ne fait plus aucun appel payant (voir docs/decisions.md).

| Scrutin | Thème | Statut | Tentatives | Jetons entrée | Jetons sortie | Coût |
|---|---|---|---|---|---|---|
| 7454 | institutions | repli (sans cartes) | 2 | 20074 | 5294 | 0.186 $ |
| 7987 | sécurité | publiée | 1 | 6003 | 2840 | 0.081 $ |
| 7409 | énergie | publiée | 1 | 73989 | 3925 | 0.374 $ |
| 8431 | numérique | publiée | 1 | 17761 | 3571 | 0.143 $ |
| 8419 | santé | repli (sans cartes) | 2 | 27751 | 6208 | 0.235 $ |

## Les fiches

### Scrutin 7454 · institutions

Vote du 2026-06-23 sur l'ensemble du projet de loi constitutionnelle pour une Corse autonome au sein de la République (première lecture). Texte voté : [PRJLANR5L17B2697](https://www.assemblee-nationale.fr/dyn/opendata/PRJLANR5L17B2697.html) (1 articles) · exposé des motifs : [PRJLANR5L17B2697](https://www.assemblee-nationale.fr/dyn/opendata/PRJLANR5L17B2697.html).

**Résultat : repli (sans cartes)** · 2 tentative(s) · 20074 jetons en entrée, 5294 en sortie · 0.186 $

_Fiche non publiée (repli). Dernière version, pour information :_

> **Faut-il inscrire dans la Constitution un statut d'autonomie pour la Corse au sein de la République ?**
>
> **Concrètement** : Le texte modifie la Constitution pour donner à la Corse un statut d'autonomie. Sous conditions, la Collectivité de Corse pourra adapter des lois nationales ou fixer ses propres règles dans certains domaines.

1. **Un statut d'autonomie dans la Constitution** — Un nouvel article de la Constitution donne à la Corse un statut d'autonomie. Ce statut tient compte de ses intérêts propres, liés à son insularité et à sa communauté de langue et de culture.
   *Article unique* : « La Corse est dotée d’un statut d’autonomie au sein de la République, qui tient compte de ses intérêts propres, liés à son insularité méditerranéenne »
2. **Des règles fixées par la Collectivité de Corse** — La Collectivité de Corse pourra être autorisée à fixer elle-même des règles dans ses domaines de compétence. Une loi spéciale, dite organique, en fixe les conditions et les limites.
   *Article unique* : « La Collectivité de Corse peut également être habilitée à fixer les normes dans les matières où s’exercent ses compétences, dans les conditions et sous les réserves prévues par la loi organique. »
3. **Une consultation des électeurs de Corse** — Les électeurs inscrits sur les listes électorales de Corse peuvent être consultés sur le projet de statut. Les règles de cette consultation sont fixées par un décret du Gouvernement.
   *Article unique* : « Les électeurs inscrits sur les listes électorales de Corse peuvent être consultés sur le projet de statut, après avis de l’assemblée délibérante »

| Tentative | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 1 | ok | ok | ok | ok | échec | ok | — |
| 2 | ok | ok | ok | ok | ok | ok | échec |

Erreurs relevées :
- tentative 1 : carte 1, texte : mot à éviter « historique »
- tentative 2 : carte 3 : non fidèle — Le texte de la carte omet deux garanties prévues : la consultation intervient après avis de l'assemblée délibérante de Corse, et ses conditions sont fixées par un décret en Conseil d'État délibéré en conseil des ministres, pas par un simple « décret du Gouvernement ».

### Scrutin 7987 · sécurité

Vote du 2026-07-07 sur l'ensemble de la proposition de loi visant à reconnaître une présomption de légitime défense pour les forces de l'ordre, dans l'exercice de leurs fonctions (première lecture). Texte voté : [PIONANR5L17B0691](https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17B0691.html) (1 articles) · exposé des motifs : [PIONANR5L17B0691](https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17B0691.html).

**Résultat : publiée** · 1 tentative(s) · 6003 jetons en entrée, 2840 en sortie · 0.081 $

> **Faut-il présumer que les policiers et gendarmes qui utilisent leur arme dans les cas prévus par la loi ont agi en légitime défense ?**
>
> **Concrètement** : Le texte prévoit qu'un policier ou un gendarme qui tire avec son arme dans les cas déjà autorisés par la loi est considéré d'office comme ayant agi en légitime défense (une situation où l'usage de la force n'est pas puni), sauf si l'enquête prouve le contraire.

1. **Une légitime défense présumée pour les agents armés** — Les policiers nationaux, les policiers municipaux et les gendarmes qui utilisent leur arme sont considérés d'office comme ayant agi en légitime défense. Ils n'ont pas à démontrer eux-mêmes qu'ils étaient dans cette situation.
   *Article unique* : « Est présumé avoir agi en état de légitime défense, l’agent de la police nationale ou municipale ainsi que le militaire de la gendarmerie nationale »
2. **Seulement dans les cas où tirer est déjà permis** — La présomption ne vaut que si l'arme est utilisée dans les situations déjà prévues par deux articles du code de la sécurité intérieure, qui fixent quand ces agents peuvent faire usage de leur arme.
   *Article unique* : « qui a fait usage de son arme dans les conditions prévues par les articles L. 435‑1 et L. 511‑5‑1 du code de la sécurité intérieure. »
3. **L'enquête peut écarter la présomption** — Si l'enquête judiciaire montre que l'arme a été utilisée de façon nettement disproportionnée, ou sans nécessité absolue, l'agent n'est plus présumé avoir agi en légitime défense.
   *Article unique* : « peut être renversée si l’enquête judiciaire démontre une utilisation des armes manifestement disproportionnée ou contraire au principe de nécessité absolue établi par la loi. »

| Tentative | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 1 | ok | ok | ok | ok | ok | ok | ok |

### Scrutin 7409 · énergie

Vote du 2026-06-17 sur l'ensemble de la proposition de loi visant à relancer les investissements dans le secteur de l'hydroélectricité pour contribuer à la transition énergétique (texte de la commission mixte paritaire). Texte voté : [PIONANR5L17BTC2856](https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17BTC2856.html) (17 articles) · exposé des motifs : [PIONANR5L17B2334](https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17B2334.html).

**Résultat : publiée** · 1 tentative(s) · 73989 jetons en entrée, 3925 en sortie · 0.374 $

> **Faut-il remplacer les contrats de concession des grands barrages par un droit d'exploitation de soixante-dix ans accordé aux exploitants actuels ?**
>
> **Concrètement** : Le texte met fin aux contrats par lesquels l'État confie l'exploitation des barrages de plus de 4 500 kilowatts. Les exploitants actuels peuvent les garder contre paiement, et EDF doit mettre aux enchères une partie de sa production.

1. **Un droit d'exploitation de soixante-dix ans** — Les entreprises qui exploitent aujourd'hui les grands barrages obtiennent le droit de continuer à les utiliser pendant soixante-dix ans. Ce droit ne peut être cédé à une autre entreprise qu'avec l'accord de l'État.
   *Article 2* : « est attribué pour une durée de soixante‑dix ans aux titulaires de ces contrats dans les conditions prévues à l’article 5. »
2. **EDF doit vendre une part de sa production aux enchères** — Pendant vingt ans, EDF doit proposer à d'autres entreprises, par des enchères, une part de sa production, d'abord équivalente à 6 gigawatts, puis revue tous les cinq ans. Les acheteurs ne gèrent pas les barrages.
   *Article 12* : « Initialement fixée à 6 gigawatts, la capacité hydroélectrique virtuelle mise à la disposition de tiers est fixée, tous les cinq ans, par un arrêté du ministre chargé de l’énergie »
3. **Une redevance liée au bénéfice des exploitants** — Les exploitants des grands barrages paient chaque année à l'État une redevance calculée sur l'électricité produite et le bénéfice par mégawattheure : plus ce bénéfice est élevé, plus le taux appliqué est fort.
   *Article 8* : « Le barème applique un taux croissant à ce rapport, établi par décret en Conseil d’État pour chacune des tranches suivantes : »

| Tentative | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 1 | ok | ok | ok | ok | ok | ok | ok |

### Scrutin 8431 · numérique

Vote du 2026-07-21 sur l'ensemble de la proposition de loi visant à protéger les mineurs des risques auxquels les expose l'utilisation des réseaux sociaux (texte de la commission mixte paritaire). Texte voté : [PIONANR5L17BTC3069](https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17BTC3069.html) (3 articles) · exposé des motifs : [PIONANR5L17B2107](https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17B2107.html).

**Résultat : publiée** · 1 tentative(s) · 17761 jetons en entrée, 3571 en sortie · 0.143 $

> **Faut-il interdire les réseaux sociaux aux moins de quinze ans et le téléphone portable dans les lycées ?**
>
> **Concrètement** : Le texte interdit l'accès aux réseaux sociaux aux moins de quinze ans, étend aux lycées l'interdiction du téléphone portable et ajoute la propagande pour des moyens de se donner la mort aux contenus que les sites doivent combattre.

1. **Réseaux sociaux interdits aux moins de quinze ans** — À partir du 1er septembre 2026, les moins de quinze ans ne peuvent plus accéder aux réseaux sociaux. Les comptes créés avant cette date sont concernés quatre mois plus tard. Les encyclopédies en ligne et les sites éducatifs sont exclus.
   *Article 1er* : « L’accès à un service de réseaux sociaux en ligne fourni par une plateforme en ligne est interdit aux mineurs de quinze ans. »
2. **Téléphone portable interdit au lycée** — Dès la rentrée 2026-2027, l'interdiction du téléphone portable, qui s'applique déjà dans les écoles et les collèges, s'étend aux lycées. Le règlement intérieur de chaque établissement fixe les modalités et les exceptions.
   *Article 6* : « les mots : « et les collèges » sont remplacés par les mots : « , les collèges et les lycées » »
3. **Propagande pour le suicide ciblée en ligne** — La propagande ou la publicité pour des moyens de se donner la mort s'ajoute aux contenus que les hébergeurs de sites doivent aider à combattre. Un juge peut aussi suspendre le compte en ligne d'une personne condamnée pour ce délit.
   *Article 2* : « Au premier alinéa du A du IV de l’article 6 de la loi n° 2004‑575 du 21 juin 2004 pour la confiance dans l’économie numérique, après la référence : « 223‑13, », est insérée la référence : « 223‑14, » »

| Tentative | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 1 | ok | ok | ok | ok | ok | ok | ok |

### Scrutin 8419 · santé

Vote du 2026-07-20 sur l'ensemble de la proposition de loi visant à doter la France d'une stratégie nationale de lutte contre les maladies cardio-neuro-vasculaires (texte de la commission mixte paritaire). Texte voté : [PIONANR5L17BTC2995](https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17BTC2995.html) (5 articles) · exposé des motifs : [PIONANR5L17B2309](https://www.assemblee-nationale.fr/dyn/opendata/PIONANR5L17B2309.html).

**Résultat : repli (sans cartes)** · 2 tentative(s) · 27751 jetons en entrée, 6208 en sortie · 0.235 $

_Fiche non publiée (repli). Dernière version, pour information :_

> **Faut-il doter la France d’une stratégie nationale contre les maladies du cœur et des vaisseaux et renforcer leur dépistage ?**
>
> **Concrètement** : Le texte charge l’État de fixer une stratégie contre les maladies cardio-neuro-vasculaires (cœur, vaisseaux, cerveau) et ajoute des dépistages et des actions d’information pour les enfants, les salariés et les adultes lors des bilans de prévention.

1. **Une stratégie nationale fixée par l’État** — L’État doit fixer une stratégie sur plusieurs années, avec chercheurs, soignants et patients, sur la prévention, le dépistage et les soins. Elle vise à réduire les inégalités sociales et territoriales.
   *Article 1er* : « L’État conduit une politique de lutte contre les maladies cardio‑neuro‑vasculaires et leurs facteurs de risques. Il arrête une stratégie nationale pluriannuelle »
2. **Un dépistage pour les enfants de six ans** — Un dépistage, notamment d’un excès de cholestérol d’origine familiale, est fait chez l’enfant dans l’année qui suit ses six ans, par un médecin formé. Les parents peuvent refuser ; c’est noté dans le carnet de santé.
   *Article 1er* : « est réalisé dans l’année qui suit le sixième anniversaire de l’enfant par un médecin spécialement formé »
3. **Un dépistage proposé lors de la visite au travail** — Lors de la visite médicale au travail, un dépistage de ces maladies est proposé au salarié. Les services de santé au travail mènent aussi chaque année des actions d’information sur les facteurs de risque.
   *Article 2* : « Un dépistage précoce des maladies cardio‑neuro‑vasculaires et des maladies cardiaques structurelles est proposé au travailleur lors de cet examen. »

| Tentative | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 1 | ok | ok | ok | ok | échec | ok | — |
| 2 | ok | ok | ok | ok | ok | ok | échec |

Erreurs relevées :
- tentative 1 : carte 1, texte : mot à éviter « vous »
- tentative 1 : carte 2, texte : mot à éviter « vous »
- tentative 2 : carte 3 : non fidèle — Le dépistage n'est pas proposé à chaque visite médicale au travail : l'article le rattache à « cet examen » de l'article L. 4624-2-2 (la visite de mi-carrière), alors que la carte laisse croire qu'il concerne toute visite.
