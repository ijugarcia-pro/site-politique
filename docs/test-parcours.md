# Tester le parcours complet (t22)

> Préparé le 8 octobre 2026 par Claude Code. Durée visée : 1 h. À faire sur le site en ligne,
> https://le578esiege.pages.dev, une fois les PR #8 à #11 fusionnées et le déploiement vert.

Deux personnages, deux appareils : **Jade** ne suit pas la politique et découvre le site sur son
**téléphone** ; **Marc** cherche ce qu'a voté sa députée, sur son **ordinateur**. Coche chaque
case ; à la moindre gêne, ouvre une issue avec le modèle « Friction de parcours »
([nouvelle issue](https://github.com/ijugarcia-pro/site-politique/issues/new/choose)), en notant
le numéro du scénario (J3, M2…). Une friction = une issue, même petite.

## Avant de commencer

- [ ] Ouvrir le site en **navigation privée** sur les deux appareils, pour partir de zéro (aucune
  réponse ni député gardés d'une visite précédente).
- [ ] Noter l'appareil et le navigateur (ex. « iPhone 13, Safari », « Windows, Chrome »).
- [ ] Ne pas lire le code ni ce document en détail avant : réagis comme un visiteur.

## Jade, sur son téléphone

**J1 · Comprendre en dix secondes**
- [ ] Sur l'accueil, sans faire défiler : comprends-tu ce que propose le site ?
- [ ] Le bouton « Prendre ma place » donne-t-il envie, et dit-il ce qui va se passer ?

**J2 · Le quiz** (`/quiz/`)
- [ ] Réponds aux 10 questions. Lis la phrase « Concrètement » à chaque fois.
- [ ] Utilise au moins une fois « Je ne sais pas ».
- [ ] Chaque question se comprend-elle sans connaître le dossier ?
- [ ] **Neutralité** : une question te semble-t-elle pousser vers le oui ou le non ? Lesquelles ?
- [ ] Après chaque réponse, la révélation (verdict, « % des députés comme toi », « Ta voix de
  578e ») est-elle claire ? Le bouton « Continuer » est-il facile à trouver ?
- [ ] Le lien « Tout savoir sur ce vote » mène-t-il à la bonne page ?

**J3 · Le résultat**
- [ ] Comprends-tu « le groupe qui vote le plus comme toi », « ton jumeau » et « précision » ?
- [ ] Le jumeau t'étonne-t-il ? Est-ce expliqué (nombre de votes en commun) ?
- [ ] La phrase sur la précision (fiable vers 25 votes) donne-t-elle envie de continuer ?

**J4 · Partager**
- [ ] « Partager » : les trois stories s'affichent-elles ?
- [ ] Partage une story vers Instagram, WhatsApp ou Messages (partage natif du téléphone). Si
  le téléphone ne propose pas le partage, l'image est-elle téléchargée ?
- [ ] L'image est-elle nette et lisible, sans texte coupé ?

**J5 · Mon hémicycle** (`/hemicycle/`)
- [ ] Les teintes (« plus un siège est foncé… ») et l'étoile se comprennent-elles ?
- [ ] Toucher un siège affiche-t-il le député ? Est-ce faisable au doigt ?
- [ ] Le jumeau et l'opposé mènent-ils à leur fiche ?

**J6 · Revenir**
- [ ] Quitte le site, reviens-y dans le même navigateur (sans navigation privée cette fois, en
  refaisant le quiz) : la réponse « Voir ma place » apparaît-elle à l'accueil ?

## Marc, sur son ordinateur

**M1 · Trouver sa députée**
- [ ] Explorer → « Qui te représente ? » : entre **ton propre code postal**. Le bon député
  s'affiche-t-il ?
- [ ] Essaie aussi les cas ci-dessous ; le résultat attendu est indiqué.

| Code postal | Ce qui doit se passer |
|---|---|
| 01330 | Une seule circonscription : le député s'affiche directement. |
| 01500 | Plusieurs communes : choisir la sienne, puis le député (ou l'adresse si la commune est partagée). |
| 75011 | Paris : on demande la rue. Essaie « 12 rue de la Roquette » → 7e circonscription. |
| 13001 | Marseille : on demande la rue, avec la liste des 7 circonscriptions possibles en repli. |
| 35000 | Rennes : commune partagée entre 4 circonscriptions, on demande la rue. |
| 97400 | Saint-Denis de La Réunion : on demande la rue. |
| 20000 | Ajaccio : on demande la rue. |
| 98800 | Nouméa : une seule circonscription. |

- [ ] Le message sur l'adresse (envoyée au service public de l'IGN, non gardée) est-il clair ?

**M2 · La fiche de sa députée**
- [ ] « C'est ma députée » : le bandeau « Ta députée » apparaît-il ?
- [ ] La participation et la **médiane des députés** à côté se comprennent-elles ?
- [ ] « Ses votes face aux tiens » : les filtres fonctionnent-ils ? Ta colonne « Toi » se
  remplit-elle avec les votes tranchés ?
- [ ] « Sa fiche sur le site de l'Assemblée » mène-t-il à la bonne page ?

**M3 · Une page de vote**
- [ ] Depuis Explorer, ouvre un vote récent. Tranche « Et toi, qu'aurais-tu voté ? ».
- [ ] Filtres de l'hémicycle : « Contre leur groupe », « Ton député », « Ton jumeau ».
- [ ] Clique sur un siège : le député s'affiche-t-il, avec un lien vers sa fiche ?
- [ ] Au clavier : Tab jusqu'à l'hémicycle, flèches, Entrée (ouvre la fiche du député).
- [ ] « Pour aller plus loin » et « Le parcours du texte » sont-ils compréhensibles ?
- [ ] Compare le décompte avec le lien « Le scrutin sur le site de l'Assemblée nationale ».

**M4 · Chercher**
- [ ] Dans Explorer, cherche un mot (ex. « retraites »), puis un nom de député.
- [ ] Filtres par type (Solennels, Textes, Budget, Censures) et « Afficher plus de votes ».

## Vérifications de fond (ordinateur)

- [ ] **Ordre des groupes** dans l'hémicycle, comparé au
  [schéma officiel de l'Assemblée](https://www.assemblee-nationale.fr/dyn/vos-deputes/hemicycle) :
  notre calcul place LIOT avant SOC ; est-ce conforme ? (point laissé ouvert en t17)
- [ ] **Zoom à 200 %** du navigateur : tout reste-t-il lisible, sans texte coupé ?
- [ ] **État des données** (`/etat/`) : la date de mise à jour est-elle d'aujourd'hui ou d'hier ?
- [ ] **Navigation privée stricte** (ou cookies bloqués) : le quiz reste-t-il utilisable ?

## Limites connues (inutile d'ouvrir une issue)

- La séance de la semaine (voter avant les députés) arrive en phase 3 (t23 à t25).
- Pas encore de cartes « Ce que ça change » : elles viendront de la session hebdomadaire de
  rédaction (t27). Pas de thèmes avant t28.
- Pas de duel entre amis ni de code QR vers le téléphone (reportés).
- Pas encore de bouton « Effacer toutes mes réponses » : tes réponses s'effacent avec les données
  du site dans ton navigateur. À ajouter (t34, confidentialité).

## Après le test

- [ ] Toutes les frictions sont dans des issues avec le libellé `parcours`.
- [ ] Dis à Claude Code, en session, combien d'issues sont ouvertes : il les classera par
  gravité et proposera l'ordre de correction.
