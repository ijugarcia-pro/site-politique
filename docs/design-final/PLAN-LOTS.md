# Design définitif « La Séance » · plan des lots

> Plan proposé par Claude et validé par Julien le 20 octobre 2026. Suivi : docs/PLANNING.md, tâches t63 à t70. Références : `DESIGN-FINAL.md` (ce dossier), `PROMPT-CLAUDE-CODE.md` (la demande).

## Contexte

La refonte « La Séance » (lots 0 à 6, PR #42 à #50, empilées, non fusionnées) a posé la mécanique, mais le site ne ressemble pas aux maquettes V6C. Il y a cinq écarts principaux : la salle est enfermée dans une vignette, le mode focus est noyé dans le noir, le condensé est en bas de casse partout (`--police-titre` employé 162 fois, Literata 2 fois), la « lumière » dore toute la page et la 3D tire vers l'orange. But : recopier les maquettes écran par écran sans toucher à la mécanique. Ordre de priorité : contrat (`refonte-la-seance.md` § 2 et § 8), puis maquettes V6C, puis `DESIGN-FINAL.md`, puis le design system.

Décisions de Julien (20 oct., ce plan) :
- **Niveaux d'accord en ivoire** : oui. Fait au lot D1, avec la mise à jour de CLAUDE.md et de decisions.md.
- **Base** : les lots s'empilent sur `seance-lot-6` (PR #50). Si la pile est fusionnée entre-temps, je rebase sur `main`.
- **Fichiers** : `docs/design-final/` est versionné (environ 13 Mo). Les planches de chaque lot vont dans `docs/design-final/planches/Dx/`, en JPEG compressé, et s'affichent dans la PR. `captures-la-seance/` et son zip restent ignorés par git.

## Règles communes à chaque lot

- Une branche par lot (`design-d0`, `design-d1`…), une PR empilée sur la précédente. Rien n'est fusionné sans l'accord de Julien.
- En début de session : `ListAgents`, `git branch --show-current`, `gh pr list`, `git fetch`. Si une autre session tourne dans le dossier, je commite par index privé, sans changer la branche extraite (mémoire « un seul dossier »).
- Contrat : rien dans `pipeline/` ni dans `site/src/lib/`, sauf `stories.ts` et `themes.ts`. Chaque `data-*` reste sur un élément du même type, même quand il change de place. Les clés localStorage, les textes réglementaires, la neutralité, l'accessibilité, le budget JS et les polices @fontsource restent tels quels.
- Verts à chaque lot : `npm test`, `npm run build`, `npm run test:inventaire`, `uv run pytest`, `uv run ruff check .`.
- Fin de lot :
  - planches site / maquette (ou avant / après), à 1440 et 390 px ;
  - liste du § 9 de DESIGN-FINAL cochée écran par écran ;
  - compteur du test typographique ;
  - PLANNING.md à jour (case cochée, « Réalisé ») ;
  - résumé : fait, à regarder en premier, 3 défauts honnêtes, PR.
- Un écart impossible à tenir sans casser le contrat : je ne tranche pas, je montre l'écart et deux options.

## Les lots (8 PR)

Par rapport à la proposition, deux changements :
- **D3 est coupé en deux** : `index`, `verdict` et `hemicycle` font chacun environ 500 lignes, et l'en-tête plus le gabarit de scène forment déjà un socle à relire seul.
- **Le téléphone se fait dans le lot de chaque écran** : chaque lot doit fournir ses planches à 390 px et touche les mêmes fichiers. V6C-06 va donc en D3b, V6C-05 en D4, la barre fixe du bas en D3a. D6 garde les finitions, les docs et le jeu complet de captures.

### D0 · Outils de comparaison (t63)
- Versionner `site/scripts/frames.mjs` (aujourd'hui non suivi : c'est lui qui a produit les 31 écrans) et `docs/design-final/`. Ajouter `captures-*/` et `*.zip` à `.gitignore`.
- `frames.mjs` reçoit l'option `--gpu` (`--use-angle=d3d11`, carte Intel Iris Xe présente) en plus du rendu logiciel actuel. Il reçoit aussi un filtre d'écrans, pour ne refaire que ceux d'un lot.
- `site/scripts/planches.mjs` compose les planches avec Playwright seul, sans nouvelle dépendance : une page HTML met deux images côte à côte, avec les étiquettes « SITE » et « MAQUETTE » (ou « AVANT » et « APRÈS »), puis la capture en JPEG q80. Correspondances :
  - 01/02 → V6C-01 ;
  - 05/09/12/13 → V6C-02 ;
  - 16 → V6C-03 ;
  - 19 → V6C-04 ;
  - 12 téléphone → V6C-05 ;
  - 19 et 21 téléphone → V6C-06 ;
  - les autres écrans : avant / après, l'avant étant `captures-la-seance/`.
- `site/scripts/typo.mjs` et `npm run test:typo` : parcourt les pages construites (états du stockage préparés comme dans `frames.mjs`). Il échoue si un élément visible a une `font-family` calculée Barlow Condensed sans `text-transform: uppercase`, sauf si son texte ne contient que des chiffres ou des signes. Il donne la liste par page et un total. Il est rouge au départ, **hors** des 4 commandes obligatoires, et doit être vert à la fin de D5. Il signale aussi, sans échouer, les rayons hors liste blanche et la couleur `lumiere` hors des repères « toi » : c'est une aide pour le § 9.
- PLANNING.md : tâches t63 à t70 (numéros à vérifier au début), fiches reprises de ce plan. Pas d'entrée dans decisions.md.
- Planche témoin : le site actuel face aux maquettes, avec `--gpu`.

### D1 · Typographie et couleurs, partout (t64)
- `global.css` :
  - classes `.t-ecran`, `.t-mot`, `.t-section`, `.t-bandeau`, `.t-compteur`, `.t-numero`, `.t-puce`, `.t-bouton`, `.t-vote`, `.t-question`, `.t-loi`, `.t-corps`, `.t-legende`, aux valeurs du § 3, relues dans les HTML de `maquettes/` ;
  - `h1/h2/h3` n'imposent plus le condensé ; `main h2` n'impose plus les capitales ;
  - `.bouton` et `.bouton-direct` à coins vifs, 18 et 15 px ;
  - `.encart` sans liseré lumière ;
  - `a:hover` souligné en `ivoire` ;
  - `.carte` ne garde son ombre et son rayon que comme panneau posé sur la salle (§ 5.2) ;
  - nouvelle classe `.aplats`, grille `gap: 2px` (§ 5.3) ;
  - chiffres en `tabular-nums`.
- Literata : import `@fontsource-variable/literata/opsz.css`, en vérifiant que la graisse rendue est bien 500.
- Lumière réservée à toi. On la retire des surtitres « Ta place », « Ton jumeau » et « Ton personnage », de l'encart, des puces d'Explorer, des barres autres que la précision, et des tons de `fin-seance.css`. Le jumeau passe en ivoire.
- Niveaux d'accord en ivoire :
  - jetons `--accord-1..3` (Séance et Jour) et la règle « rarement » (`#3A3D45`) ;
  - même échelle en blanc chaud de lampe pour les voyants 3D « par accord » (correspondance dans le script de `hemicycle.astro` ou dans `pilote.ts` ; rien dans `lib/`) ;
  - absents des barres de totaux en `#3A3D45` ;
  - CLAUDE.md : « lumière #F2C98A (toi) ; l'accord en intensités d'ivoire » ; entrée datée dans decisions.md.
- Composants partagés aux nouvelles classes :
  - `LigneVote` : `.t-loi` 16 px, verdict en `.t-mot` 17 px, barre de totaux de 6 px ; capsules ivoire et noires supprimées ;
  - `EnteteSeance`, `JaugePrecision`, `SerieGelee`, `Hemicycle` (légendes, « Groupe par groupe »), `MiniHemicycle`, puces de filtre à coins vifs ;
  - un passage mécanique sur toutes les pages : chaque `font: … var(--police-titre)` en bas de casse devient une classe ou la police de texte. Les intitulés de loi passent en `.t-loi` ou `.t-question`, et les noms de députés en Barlow 600.
- Aucune mise en page déplacée dans ce lot : on change la peau, pas les gabarits. Objectif : le compteur `test:typo` baisse nettement ; il ne doit pas encore être à zéro.

### D2 · Couleur de la salle 3D (t65)
- Tester d'abord l'hypothèse : `THREE.ColorManagement.enabled = false` en tête de `site/src/salle3d/scene.ts`, avant toute couleur. On rend CAM 1 jour avec `--gpu` et on compare à `maquettes/images/fond-cam1-salle-jour.jpg`. Si l'image s'en rapproche, on garde ce réglage ; sinon, on convertit à la main les couleurs du prototype. Textures en `SRGBColorSpace`, sortie en `outputColorSpace = SRGBColorSpace`.
- Calibrer exposition, brouillard et intensités des lumières pour les quatre caméras, dans les cadrages de `maquettes/images/` (CAM 1 jour, CAM 2, CAM 3, verdict allumé). On compare sur GPU, pas en rendu logiciel. Géométrie inchangée.
- `images-fixes.mjs` :
  - option `--gpu` ;
  - recalcul de `fond-tribune*.webp` ;
  - nouvelles images fixes par caméra, pour le repli plein cadre de D3 : CAM 1 jour, CAM 1 verdict et CAM 3 générique, en ordinateur et téléphone, en webp, avec un poids total annoncé dans la PR.
- Planche avant / après pour chaque caméra, et image du prototype à côté. `npm run test:inventaire` vérifie que le JS initial n'a pas bougé.

### D3a · En-tête, gabarit « scène », accueil (t66) · V6C-01
- `Base.astro` :
  - **mode onglets** : en-tête posé sur la scène (fond `rgba(8,9,12,.74)`, `padding: 16px 32px`, absolu ou sticky). Marque, onglets de 15 px soulignés de 2 px en `direct`, « Site indépendant, non officiel » en `.t-puce`, recherche et anneau de 36 px. Sur une page sans scène, fond `nuit` ;
  - **mode focus** : progression en segments de 28 × 4 px, « Quitter la séance » en `.t-puce` ;
  - **téléphone** : barre du bas fixe, onglets `.t-puce` 13 px, actif avec liseré haut de 2 px en `direct`.
- `Salle3D.astro` devient la scène plein cadre (§ 5.1) :
  - placée hors de `.page`, bord à bord, `min-height` passée en prop (900 ou 980 px) ;
  - `.scene-voile` avec le dégradé de chaque page (prop) ;
  - puces au format « Cam 1 · Salle » en une seule chaîne, sans double espace, à `top: 96px; right: 32px` (la position est une prop, pour la gauche de V6C-04) ;
  - `.dessus` devient `.scene-pied` (`margin-top: auto`) ;
  - le repère « Toi » reste en lumière, un second repère « Ton jumeau » s'ajoute en ivoire.
- Le repli occupe le même cadre : l'image fixe de la caméra de D2 sert de `background` tant que la 3D n'est pas prête. Le SVG accessible reste dans le DOM. `data-salle3d`, `data-camera` et `data-salle3d-etat` sont inchangés.
- `index.astro` :
  - bandeau (étiquette « Cette semaine », titre de 34 px) et action principale `direct` à droite ;
  - programme 01-02-03 dans la scène : le contenu de `data-ticket-items` (votes de la séance, ou le prochain lot), caché s'il est vide ;
  - le titre du ticket (`h2[data-ticket-titre]`) devient le titre du bandeau, et le `h1` de page reste dans le DOM ;
  - repère « Toi · le siège de ton jumeau », ou « Ta place t'attend » avant 10 votes ;
  - sous la scène, « La semaine dernière » en `.t-section` plus `.t-puce`, puis une grille d'aplats : derniers verdicts (`.t-mot`, « à N voix près », barre de 10 px), le ticket du verdict, la mini-carte « Ton hémicycle » et « Ton député » ;
  - les doublons restent dans le DOM, en `.t-legende` dans le sous-bandeau ;
  - pied de page en une ligne `.t-legende`.
- Téléphone (même lot) : la scène occupe environ 60 % de l'écran, les puces sont en bas de l'image, le contenu est en feuille, la gouttière fait 16 px.

### D3b · Verdict et Mon hémicycle (t67) · V6C-03, V6C-04, V6C-06
- **Verdict** :
  - scène CAM 1 allumée de 980 px ;
  - bloc central qui démarre sous les puces (`padding-top` ≥ 64 px) : `.t-puce`, puis la question en Literata 22 px, puis ADOPTÉ / REJETÉ en `.t-ecran` ;
  - repères Toi et Ton jumeau ;
  - pied de scène : bandeau, puis compteurs sur `voile` (4 colonnes, carré de 12 px, `.t-compteur`) ;
  - sous la scène, une grille d'aplats : « Ta voix de 578e », député et jumeau, « Et maintenant » ;
  - la `Salle` SVG détaillée et son tableau de repli passent dessous ;
  - « 1 vote sur 3 jugé » en `.t-legende`.
  - Le premier `[data-salle]` de la page reste la salle SVG interactive : à vérifier.
- **Mon hémicycle** :
  - scène CAM 3 de 980 px, puces en haut à gauche, consigne de geste centrée ;
  - bandeau « Ta place » / « Le siège de <jumeau> », avec `data-bandeau-place` gardé ;
  - aplat de précision : 64 px, jauge `lumiere` avec repère « fiable », groupes sur une grille `80px 1fr 40px`, pastille officielle et barre ivoire ;
  - sous la scène : grille d'aplats (jumeau, opposé, député, compteurs), hémicycle « par accord », « Tes réponses » (`.t-loi` 16 px, pastille de vote de 10 px et mot) ;
  - « Ton personnage » : bouton secondaire qui ouvre un panneau repliable (`<details>` ou `dialog`, avec ses `data-*` d'origine) ; feuille sur téléphone.
- **Téléphone V6C-06** : salle plein écran (la caméra par défaut est celle du contrat), bandeau et précision en bas, au-dessus de la navigation.

### D4 · Mode focus (t68) · V6C-02, V6C-05
- `Seance.astro`, `quiz`, `lots`, `seance`, `fin-seance.css` :
  - on retire le voile `body.focus::before` de 80 à 93 % ;
  - `fond-tribune.webp` (celui de D2) devient visible, sous le dégradé de 90° du § 5.1.
- Deux colonnes inversées par la grille CSS, sans déplacer le DOM si possible :
  - **à gauche** : puces CAM 2 décoratives (`aria-hidden`), puis le mini-hémicycle sur `voile` (520 px au plus), puis le bandeau de l'étape ;
  - **à droite** : le panneau de vote (§ 5.2), dans l'ordre de la maquette.
  - « Vérifié / Réserve » et la frise n'apparaissent que si la donnée existe (contrat § 8).
- Boutons de vote : `.t-vote`, 58 px, rayon de 6 px. Après le vote, les autres réponses **ne sont plus grisées** ; seul le choisi a sa bordure de 2 px et « Ton vote ». Pronostic : deux boutons identiques.
- Révélation : bandeau de régie (« Ta voix de 578e ») en bas à gauche. Fin de séance et résultat du quiz : bandeau étiquette + titre (on retire le titre de 72 px et le « ! »), statistiques en aplats, deux actions au plus.
- Téléphone V6C-05 : salle sur les 40 % du haut, puces en bas de l'image (« Cam 1 · Salle », « Cam 2 »…), panneau en feuille, question en Literata 22 px, boutons de 58 px.
- Neutralité : `parcours.mjs` vérifie déjà que les boutons sont identiques. Il vérifie aussi l'état après le vote.

### D5 · Pages en thème Jour (t69)
- Explorer, page d'un vote, « Qui te représente ? », fiche député, calcul, état, pages légales, 404. L'en-tête reste sombre.
- Titres : `.t-section` court ; intitulé d'un vote en `h1.t-question` ; nom d'un député en Literata 34 px.
- Listes : une ligne = `.t-puce`, puis `.t-loi` 16 px, puis `.t-mot` 17 px, puis la barre de 6 px.
- Filtres : rectangles `panneau` ; l'actif en `ivoire` plein.
- Blocs : aplats blancs en `gap: 2px`.
- Page d'un vote :
  - le résultat devient un bandeau sombre à coins vifs, puis les compteurs, l'hémicycle et « Groupe par groupe » ;
  - « Pour aller plus loin » : accordéons à coins vifs.
- Fin de lot : `npm run test:typo` **vert**.

### D6 · Finitions (t70)
- `stories.ts` et `themes.ts` alignés (classes, ivoire pour l'accord, lumière pour toi seulement).
- Audit complet du § 9 : contrastes AA dans les deux thèmes (texte sur la salle sur `voile` ou un dégradé ≥ .74), navigation au clavier, mouvement réduit, absence de WebGL. Le plafond de 44 px pour les cibles reste valable.
- `test:typo` ajouté à `npm run test:inventaire`, pour qu'il devienne bloquant.
- Docs :
  - CLAUDE.md (direction visuelle) ;
  - decisions.md, entrée « design définitif » ;
  - refonte-la-seance.md : renvoi vers DESIGN-FINAL ;
  - PLANNING.md, § 4.
- Jeu complet des 31 écrans, aux 2 formats, avec `--gpu`, et les 6 planches site / maquette finales.

## Points à surveiller (je les signalerai, sans trancher seul)

- **V6C-02 montre l'en-tête à onglets et la 3D en direct.** Le contrat garde le mode focus et une image fixe. Je suis le contrat et DESIGN-FINAL § 6 : en-tête focus, image fixe, puces décoratives.
- **Programme de l'accueil sans séance annoncée.** Je propose d'y mettre le prochain lot de 3 votes, déjà calculé par la page, sinon de le cacher. Pas de données inventées.
- **Écarts déjà décidés** : on ne montre ni CAM 5, ni « Données de maquette », ni « Je m'abstiens », ni « Suivre ce texte ».
- **Repli sans WebGL** : l'image fixe sert de fond, mais les voyants personnels n'y sont pas. Le SVG accessible reste disponible (« Plan » ou sous la scène).

## Vérification

- À chaque lot :
  - `npm test`, `npm run build`, `npm run test:inventaire`, `uv run pytest`, `uv run ruff check .` ;
  - `npm run test:typo` (compteur dans la PR) ;
  - `node scripts/parcours.mjs` (neutralité des boutons) ;
  - `node scripts/frames.mjs --gpu` sur les écrans touchés, puis `planches.mjs`.
- Aperçu dans le panneau navigateur : build dans le scratchpad, configuration à part dans `.claude/launch.json`. Sur ce build, je rejoue les parcours du § 7 de `refonte-la-seance.md` à 390 et 1440 px, avec et sans mouvement réduit, avec et sans WebGL.
- Chaque PR donne les liens des planches (`docs/design-final/planches/Dx/…`) et leurs chemins sur le disque.
