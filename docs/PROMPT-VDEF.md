# Prompt Claude Code · Construire la VDEF « La salle est le menu »

À coller tel quel dans Claude Code, à la racine du dépôt `site-politique` (ou : « Lis docs/PROMPT-VDEF.md et exécute-le »). Rédigé le 22 octobre 2026. Remplace `docs/PROMPT-JUMEAU-CAMERAS.md`, jamais lancé : son contenu (le jumeau, la souris, la vue subjective) est repris ici, adapté à la VDEF.

> Versionné le 22 octobre 2026 par Claude Code, à partir du texte collé par Julien en début de session. À cette date, `docs/design-vdef/captures/` et `docs/design-vdef/maquettes/` n'étaient pas encore dans le dépôt ; `VDEF.md` a été collé par Julien et versionné dans `docs/design-vdef/`. Le suivi des lots est dans `docs/PLANNING.md` (section « VDEF », t71 à t82).

Bonjour. Julien a validé un nouveau design pour tout le site : la maquette VDEF « La salle est le menu ». Tu vas la construire en entier, sur les vraies données, sans toucher au pipeline. C'est un gros chantier : il est découpé en 11 lots (V0 à V10), à faire dans l'ordre. Tu peux les enchaîner dans une même session si ton contexte le permet ; sinon, arrête-toi proprement à la fin d'un lot (commit, planning à jour) : la session suivante reprendra à « la suite ».

## Lis d'abord

1. `CLAUDE.md`, `docs/decisions.md`, `docs/PLANNING.md` (comme toujours).
2. `docs/design-vdef/VDEF.md` : la spec du design (principes, les trois vues, les écrans et leurs adresses, les paliers, les jetons, les composants, le texte).
3. `docs/design-vdef/captures/` : une image par écran. Regarde la capture d'un écran avant de le coder, et compare ton rendu à elle à la fin du lot.
4. `docs/design-vdef/maquettes/` : le code source de chaque écran (mesures, tailles, couleurs, textes exacts). C'est la référence quand la capture ne suffit pas.

Toutes les données des maquettes sont illustratives (députés, groupes A à E, chiffres, thèmes) : affiche toujours les vraies données ; ne recopie aucun nom ni chiffre de maquette.

## Ce qui ne change pas

- Le pipeline (`pipeline/`), les exports JSON, les règles de données de `CLAUDE.md` (sauf la ligne « Jumeau », lot V1), le zéro euro, la vulgarisation et ses 7 contrôles.
- Les réponses restent dans le navigateur. Toute nouvelle clé du stockage local est annoncée sur `/confidentialite/` et dans `docs/confidentialite.md`, et effacée par « Tout effacer » (test).
- La neutralité : aucun axe gauche-droite, aucune couleur de parti, rien qui récompense le contenu d'une réponse.
- Les adresses existantes restent valides (`/`, `/quiz/`, `/lots/`, `/seance/`, `/verdict/`, `/explorer/`, `/votes/[numero]/`, `/deputes/`, `/deputes/[uid]/`, `/calcul/`, `/confidentialite/`, `/mentions-legales/`, `/etat/`). Seule `/hemicycle/` est remplacée, par une redirection.
- La salle 3D reste celle de `site/src/salle3d/` (géométrie, matières, lumières de jour, personnage), et le repli sans WebGL reste obligatoire.

## Organisation

- Branche `vdef` partie de `main`, un commit par lot, une seule PR à la fin (titre : « VDEF · La salle est le menu »).
- Au début, ajoute au planning une section « VDEF » avec les tâches t71 à t81 (une par lot ci-dessous, avec leur fiche : À faire, livrable, critère de fin, Ne pas faire, reprises de ce prompt) et une tâche t82 👤 Julien teste la VDEF sur ordinateur et téléphone (porte ◆ avant la fusion).
- À chaque fin de lot (commandes lancées dans `site/`) : `npm test` et `npm run build` passent ; coche la tâche avec la date et une ligne « Réalisé » ; commit.
- Une décision structurante = une entrée datée dans `docs/decisions.md`. Au minimum : « 2026-10-22 · Design VDEF “La salle est le menu” » (remplace « La Séance »), « Le jumeau se compte en votes identiques », « Les paliers », « Trois vues de la salle ».
- Les tests `test:inventaire`, `test:typo` et `test:contrastes` vont casser, c'est normal : le DOM change entièrement. Adapte-les volontairement (lot V10 au plus tard) et explique chaque changement dans le commit ; ne les supprime pas.

## V0 · t71 · Les fondations : jetons, polices, gabarits

À faire
- Installe `@fontsource-variable/bricolage-grotesque` et `@fontsource-variable/figtree` (5.3.0, comme les polices actuelles : dépendances du projet, gratuites, auto-hébergées). Retire Barlow, Barlow Condensed et Literata au lot V10 seulement, quand plus rien ne les utilise.
- Réécris `site/src/styles/global.css` avec les jetons de `VDEF.md` § 6 (variables CSS) et des classes de typographie. Un seul thème : supprime la logique `theme-seance` / `theme-jour` au fur et à mesure que les pages sont reprises (au plus tard en V10).
- Crée les composants (`site/src/components/vdef/`) : `BarreHaut.astro` (logo, les trois vues, loupe, anneau de progression ; variante focus « Quitter » + segments), `BarreBas.astro` (téléphone : Tribune, Salle, Ta place, Galerie), `Feuille.astro` (positions : droite, gauche, bas, pleine page sur salle floutée), `Carte.astro`, `Repere.astro`, `BarreVote.astro`, `Bouton.astro`, `Pastille.astro`, `Onglets.astro` (les trois niveaux de lecture), `Palier.astro`.
- Refais `site/src/layouts/Base.astro` : la salle (3D ou image fixe) en fond plein écran, la barre du haut posée dessus, le contenu dans des feuilles. Les pages de lecture prennent le gabarit « pleine page sur salle floutée ».

Critère de fin : une page de démonstration interne (non publiée dans le plan du site, `noindex`) montre chaque composant ; elle correspond aux captures 05, 10 et 14b pour les tailles, rayons, ombres et couleurs.
Ne pas faire : pas de Google Fonts, pas de bibliothèque de composants externe, pas de capitales forcées (`text-transform: uppercase` interdit).

## V1 · t72 · Le jumeau se compte en votes identiques

Le problème. Le classement actuel utilise l'accord lissé `(m + 2) / (n + 4)` sur les votes en commun, donc un député souvent absent passe devant un député assidu. Exemple de Julien : tu as tranché 20 votes ; A a voté comme toi 15 fois (3 autrement, 2 absences), B 9 fois (1 autrement, 10 absences). Aujourd'hui B gagne (0,786 contre 0,773). Julien veut A : une absence n'est pas un accord.

La règle
- `N` = tes réponses pour ou contre sur des votes de la matrice (`profil().reponses`).
- Pour chaque député en exercice : `identiques` (même vote), `contraires` (vote inverse ou abstention), `absents = N − identiques − contraires` (absent, non-votant ou hors mandat).
- Classement : `identiques` décroissant, puis `contraires` croissant, puis nom (`localeCompare` en français). Le jumeau est le premier, toujours montré dès un vote identique.
- `Profil` expose `egalites` : le nombre d'autres députés au même couple (identiques, contraires) que le jumeau. L'interface l'écrit sous le nom (« et 11 autres à égalité ») quand il est supérieur à 0.
- Ton opposé : le plus de `contraires`, puis le moins d'`identiques`, puis le nom. Un député toujours absent n'est jamais ton opposé.
- Les groupes : même règle. Le top 3 de la vue « Ta place » est le début de ce classement (hors non-inscrits).
- Les chiffres affichés partout : « X votes comme toi sur N » ; un pourcentage, s'il en faut un, est `identiques / N`. Les niveaux d'accord (palier 2, la salle éclairée) se calculent sur `part = identiques / N`, avec les seuils actuels (0,35 · 0,5 · 0,67).
- La précision ne change pas : `1 − e^(−N/20)`.
- Supprime `lisse` (fonction et champ ; les commentaires « formes lisses » de `salle3d/` n'ont rien à voir). Fichiers concernés au minimum : `lib/profil.ts`, `lib/accord.ts`, `lib/seance.ts`, `lib/stories.ts`, et toutes les pages qui les lisent (`grep -rn "lisse\|communs\|classer(\|\.jumeau\|oppose\|niveau(" site/src`). Julien autorise ces modifications de `lib/`.

Tests (`profil.test.ts`) : l'exemple exact de Julien ; 15 identiques et 5 contraires passent devant 14 identiques, 0 contraire et 6 absents ; à identiques égaux, le moins de contraires gagne ; `egalites` correct (0 si seul en tête) ; l'opposé n'est jamais un député sans vote exprimé ; les groupes suivent la même règle.
Documents : la ligne « Jumeau » de `CLAUDE.md` ; une entrée dans `docs/decisions.md` ; le texte de `/calcul/` (lot V9) reprend l'exemple de Julien. Mesure, sur la vraie matrice et un profil type de 25 réponses, combien de députés tombent dans chaque niveau d'accord avant et après le changement, et donne les chiffres à Julien dans ton résumé.
Ne pas faire : pas de nouvelle clé de stockage, pas de changement du pipeline ni de `matrice.json`.

## V2 · t73 · Les paliers et les dossiers (la logique, sans écran)

À faire : `site/src/lib/paliers.ts`, pur et testé.
- `votesTranches(reponses)` : le nombre de réponses pour ou contre sur des votes de la matrice (les « Je ne sais pas » ne comptent pas).
- `PALIERS` : `[{ id: 'place', seuil: 10 }, { id: 'salle-eclairee', seuil: 25 }, { id: 'bilan', seuil: 40 }]` ; `palierAtteint(n)`, `prochainPalier(n)` (avec le reste à faire), `nouveauxPaliers(avant, apres)`.
- Les dossiers par thème : les thèmes sont ceux des cartes de vote (les 12 de `lib/themes.ts` : Numérique, Droits, Travail, Économie, Immigration, Environnement, Éducation, Institutions, Énergie, Sécurité, Logement, Santé ; pas ceux des maquettes). Un vote a un thème seulement s'il a une carte (quiz, lots, séances). `dossiers(reponses, cartes)` renvoie, par thème : les votes du thème, combien tu en as tranché, ouvert si ≥ 3.
- Un palier franchi s'annonce une seule fois : nouvelle clé `578e.paliers-vus.v1` (annoncée, effacée par « Tout effacer », test).

Critère de fin : tests des seuils (9, 10, 24, 25, 39, 40), d'un « Je ne sais pas » qui ne compte pas, d'un dossier ouvert au 3e vote du thème, de l'annonce unique.
Ne pas faire : rien qui dépende du contenu d'une réponse ; pas de points, pas de classement.

## V3 · t74 · La salle 3D : trois vues, la souris, la vue subjective, les sièges qu'on touche

Les trois vues (dans `salle3d/scene.ts`, `NomVue = 'tribune' | 'salle' | 'place'`) :
- `tribune` : depuis le sol, face au pupitre. Sur ordinateur, le pupitre doit tomber dans le tiers haut de l'écran : la feuille du tableau de bord couvre la moitié basse (capture 05). Sur les écrans de vote, la feuille est à droite (capture 06) : décale le cadrage pour que le pupitre reste dans la partie visible.
- `salle` : le cadrage actuel depuis le perchoir.
- `place` : vue subjective depuis le siège du jumeau. Caméra à la hauteur des yeux du personnage assis (lue dans `personnage3d.ts`, pas un nombre écrit à la main), avancée d'environ 12 cm, tête du personnage cachée tant que la vue est active, `near` à 0,05. Regard initial : la tribune. On tourne la tête sans se déplacer : lacet ±80°, tangage de −30° à +20°, champ de 40° à 70° (Ctrl + molette, pincement). La feuille est à gauche (capture 10) : décale le regard initial vers la droite.
- Supprime la vue `plan`, le grossissement des voyants (`echV`) et la prop `planSurTelephone`.
- Critère mesurable : pour chacun des 577 sièges, le rayon des yeux vers le centre de la tribune ne touche ni colonne, ni pilastre, ni balustrade (`THREE.Raycaster`, script ou test). Captures `--gpu` pour 6 sièges : extrême gauche bas et haut, centre bas et haut, extrême droite bas et haut.

La souris : aujourd'hui, le glisser ne marche pas sur Mon hémicycle ni sur le verdict, seulement au clavier. Cause probable : le bloc `.dessus` de `Salle3D.astro` (`z-index: 2`, `flex: 1`) couvre le canevas et reçoit les `pointerdown`. Vérifie d'abord (`document.elementFromPoint` au centre de la scène). Ensuite : tout ce qui est posé sur la salle et n'est pas interactif est en `pointer-events: none` ; `setPointerCapture` au `pointerdown` ; curseur `grab` puis `grabbing` ; amortissement (environ 15 % de l'écart rattrapé par image) et petite inertie (environ 400 ms) au lâcher ; rendu à la demande conservé (boucle seulement pendant le mouvement) ; mouvement réduit : ni inertie ni amortissement. La molette seule fait défiler (pages de lecture) ; double-clic ou Échap : retour au cadrage ; clavier inchangé. Au doigt : glissé horizontal pour tourner.

Les sièges qu'on touche (vue `salle`) : un clic ou un toucher sur un siège (raycast sur les fauteuils instanciés) renvoie son index, donc son député ; la page ouvre la carte du député (capture 09). Survol : léger contour du siège. Au clavier : les sièges restent accessibles par le repli 2D (liste ou hémicycle SVG caché visuellement), avec la même carte.

Les voyants : quatre modes : éteints ; couleurs d'un vote (révélation du quiz, verdict) ; accord avec toi en intensités (seulement à partir du palier 2, 25 votes) ; un groupe mis en lumière (filtre « Un groupe » de la vue Salle).

Les repères (`Repere.astro`, projetés comme l'actuel `repere`) : toi (noir), jumeau, opposé, ton député (blancs) ; plusieurs à la fois ; cachés quand ils sortent du cadre.

Une salle qui ne se recharge pas : passer d'une vue à l'autre doit glisser la caméra, pas recharger la 3D. Utilise les transitions d'Astro (`<ClientRouter />`, `transition:persist` sur la salle) pour garder le canevas d'une page à l'autre, et adapte les scripts des pages à `astro:page-load`. Si cela casse quelque chose que tu ne sais pas réparer proprement, garde des pages classiques avec l'image fixe de la vue pendant le chargement, et dis-le à Julien.

Repli sans WebGL (et pendant le chargement) : l'image fixe de la vue (`fond-tribune`, `fond-salle` ; pour `place`, `fond-salle` avec le repère « Toi ») ; dans la vue Salle, l'hémicycle SVG cliquable remplace la 3D. Recalcule les images fixes si les cadrages changent (`scripts/images-fixes.mjs --gpu`).

Ne pas faire : pas de nouvelle dépendance (pas d'`OrbitControls`), pas de déplacement libre dans la salle, pas de changement des lumières de jour ni des matières. L'ambiance « verdict » allumée et l'idée « salle éteinte » ne font pas partie de la VDEF : le verdict se montre dans la salle de jour, par les voyants.

## V4 · t75 · La tribune : l'accueil et le tableau de bord (`/`)

Captures 01 (0 vote) et 05 (avec des votes). Le choix entre les deux se fait dans le navigateur (nombre de votes tranchés).
- Première visite : la grande carte noire « Prends le 578e siège de l'Assemblée » → `/quiz/` ; le dernier verdict ; « Ton député » avec le champ code postal ; « Ce que tu débloques en tranchant » (les 3 paliers en cadenas) ; « La galerie du public · ouverte ».
- Chaque semaine : la feuille du bas en grille (1,35 fr · 1 fr · 1 fr) : « Cette semaine » (les votes de `semaine.json`, état tranché / à trancher, bouton « Commencer » ou « Reprendre · N votes », « Verdict … ») ; le dernier verdict ; ton député (ou le champ code postal s'il n'est pas choisi) ; tes réponses (nombre, phrase) ; la galerie (champ de recherche) ; en bas, la bande « Ton parcours » (paliers et prochain dossier) → `/parcours/`.
- Semaine de vacances parlementaires : la carte « Cette semaine » le dit et propose les votes passés (`/lots/`).
- Téléphone : capture T1.

## V5 · t76 · Trancher : quiz, lots, séance, révélation, verdict

Captures 02, 02b, 03, 04, 06, 06b, 07, 08, T2.
- Écran de vote (quiz, lots, séance) : vue `tribune`, barre focus, feuille à droite : pastilles (thème, date ou « Ils votent mardi à 16 h »), « Et toi, qu'aurais-tu voté ? » ou « Vote avant eux », la question, « Concrètement », les trois réponses, puis l'encart de suite. « Comprendre ce texte » se déplie en bas de la feuille (les 3 cartes « Ce que ça change » quand elles existent). Pronostic facultatif de la séance : garde-le, sous les réponses, discret.
- Révélation (quiz et lots) : la caméra passe en vue `salle`, voyants aux couleurs du vote ; feuille à droite : l'issue, la barre de vote, les quatre pastilles, l'encart noir « Tu es avec la majorité : N députés ont voté comme toi » (ou « à contre-courant »), « Ta voix de 578e », la progression vers 10.
- Ta place est prête (10e réponse) : pastille « Palier 1 débloqué · Ta place », le personnage marche jusqu'au siège du jumeau (marche existante), « Tu sièges à la place de … », le top 3 des groupes, « Voir depuis ton siège », « Partager » (story), « 3 votes de plus ».
- Séance terminée : « A voté. », tes réponses, le rendez-vous du verdict. À la place de « Me prévenir » (les comptes et les e-mails ne sont pas faits, t30 à t32), propose « Ajouter le verdict à mon agenda » : un fichier `.ics` généré dans le navigateur, rien n'est envoyé. Puis « Trancher des votes passés » et « Retour à la tribune ».
- Verdict : vue `salle`, voyants aux couleurs du vote, repère « Toi · pour » sur ta place (si tu en as une) ; feuille à droite : l'issue en grand, « Il aurait suffi que N députés changent d'avis », la barre et les pastilles, puis toi / ton jumeau / ton député, « Comprendre ce vote » et « Verdict suivant ». La logique actuelle du verdict (verdict partiel, verdicts vus, « Ta voix de 578e ») ne change pas.
- Un palier franchi pendant un vote s'annonce sur l'écran suivant (une fois).

## V6 · t77 · La salle et ta place

- `/salle/` (capture 09) : vue `salle`, repères, panneau « Montrer dans la salle » (bascules : ton jumeau, ton opposé, ton député ; liste « Un groupe » ; « Trouver un député »), carte du député touché (nom, groupe, « vote comme toi sur X de tes N votes », mini-barre, « Voir sa fiche »), encart du palier 2 tant qu'il n'est pas atteint. Au palier 2 : les voyants d'accord s'allument et l'encart devient la légende des intensités.
- `/ta-place/` (capture 10, T3) : vue `place`. La feuille de gauche montre seulement : ton jumeau (carte noire, « et N autres à égalité » si besoin), ton opposé, les 3 groupes les plus proches, et le bouton « Revoir mes votes · N » → `/tes-reponses/`. En bas de la feuille, un lien discret « Ton personnage » ouvre le choix d'apparence existant (clé `578e.personnage.v1`). Avant 10 votes : la vue est verrouillée dans la barre ; l'adresse montre la salle avec le 578e fauteuil, et une feuille « Encore N votes pour prendre ta place » → quiz ou lots.
- Redirection `/hemicycle/` → `/ta-place/` (fichier `site/public/_redirects` de Cloudflare Pages, 301). Mets à jour le plan du site et les liens internes.
- `/tes-reponses/` (capture 11) : trois chiffres en phrases ; filtres (toutes, avec la majorité, à contre-courant, en attente du verdict) ; liste groupée par mois : la question (ou le titre court), le thème s'il existe, ta réponse, l'issue en phrase, lien vers la page du vote. Les « Je ne sais pas » de la séance apparaissent s'ils sont stockés. Pied : « Changer ou tout effacer » → `/calcul/#tes-donnees`.
- `/parcours/` (capture 12) : les 3 paliers (fait, en cours avec barre et bouton « Trancher 3 votes passés », verrouillé), les dossiers par thème (12 thèmes réels, x/3, cadenas ou coche), la série (`lib/seances.ts`), l'encart « Ce qu'on ne fera jamais ».

## V7 · t78 · La galerie, la page d'un vote, les dossiers

- `/explorer/`, nommée « La galerie » partout (capture 13, T4) : la recherche (l'actuelle), les 12 thèmes réels avec leur nombre de votes à carte, « Les votes qui divisent » et « Les plus serrés » (calculs actuels), « Tous les votes » avec les filtres (tous, solennels, tranchés par toi, pas encore tranchés) et « Afficher plus », le bouton « Trouver ton député ». Un vote sans carte n'a pas de thème : il est dans « Tous les votes » seulement (le classement de tous les votes par thème est la tâche t28, plus tard).
- `/votes/[numero]/` (captures 14a, 14b, 14c) : pastilles, la question en titre, l'issue en pilule noire et « à N voix près », lien « Voir le vote dans la salle » (vue `salle` + voyants du vote) ; les trois onglets : L'essentiel (la phrase-réponse, la barre et les pastilles, toi / ton jumeau / ton député, « Comprendre ce que ça change », « Changer ma réponse » ou les boutons pour répondre si tu n'as pas tranché) ; Comprendre (les 3 cartes « Ce que ça change » si validées, « Qui a voté quoi » par groupe avec une phrase, le parcours du texte) ; Fouiller (intitulé officiel, type, numéro, majorité requise, dissidents, sources, tableau des 577 votes avec « avec son groupe ? », téléchargement CSV généré dans le navigateur). Les onglets sont de vrais onglets accessibles (`role="tablist"`, flèches du clavier) et l'onglet ouvert se reflète dans l'adresse (`#comprendre`).
- `/dossiers/[theme]/` (capture 15), une page par thème : le fil des votes du thème (date, question, issue, ta réponse ou « Trancher »), trois chiffres en phrases. La synthèse personnelle (ton jumeau sur le thème, ta part avec la majorité) s'ouvre à 3 votes tranchés sur le thème ; avant, une carte « Encore N votes sur ce thème ».

## V8 · t79 · Les députés

- `/deputes/` (capture 16) : code postal → circonscription(s) (données actuelles) ; quand un code postal couvre plusieurs circonscriptions, le visiteur choisit la sienne (boutons radio) ; « C'est ma circonscription » enregistre le député (clé actuelle `578e.depute.v1`) ; recherche par nom ; pastilles des groupes → `/salle/` avec ce groupe en lumière.
- `/deputes/[uid]/` (capture 17, T5) : nom en titre, pastilles (groupe, circonscription, depuis…), « C'est mon député » (bascule), un cadre de la salle avec son siège (image fixe recadrée ou rendu, repère blanc) et « Voir dans la salle », la carte noire « Il ou elle a voté comme toi sur X de tes N votes » (nouvelle règle), la carte « Sur la législature » en phrases (présence aux votes solennels, votes contre son groupe) avec « Comment lire ces chiffres » dépliable, puis « Ses votes face aux tiens » (filtres, liste, « Trancher » quand tu n'as pas répondu).

## V9 · t80 · Pages de service, téléphone, stories

- `/calcul/`, `/confidentialite/`, `/mentions-legales/`, `/etat/` et la 404 prennent le gabarit de la capture 18 : feuille pleine page, sous-navigation en pastilles, sections séparées par un filet. Réécris « Comment c'est calculé » pour le nouveau jumeau (avec l'exemple de Julien), les paliers et « à N voix près ». Ajoute l'ancre `#tes-donnees` avec « Télécharger mes réponses » (JSON généré dans le navigateur) et « Tout effacer ».
- Téléphone (390 px) : vérifie chaque écran contre T1 à T5 : image de la salle en haut (300 px), feuille qui monte (à partir de 236 px), barre du bas ; les écrans de vote sans barre du bas (T2).
- Stories (`lib/stories.ts`) : restyle la story « ta place » d'après T6 (fond de la salle, carte blanche, repère « Moi »), et ajoute la story « Ton bilan » du palier 3 (ton année en 5 images : votes tranchés, à contre-courant, ton jumeau, ton thème le plus tranché, ta série), dessinées dans le navigateur comme aujourd'hui, partagées seulement si le visiteur le décide.

## V10 · t81 · Ménage, contrôles, captures, documents

- Supprime le code mort de « La Séance » : en-tête de régie, thèmes Séance / Jour, puces de caméra, styles et composants qui ne servent plus, la vue `plan`, Barlow, Barlow Condensed et Literata (`package.json`).
- Tests : `npm test`, `npm run build` ; adapte `test:inventaire` (réenregistre l'inventaire des `data-*` et le poids du JavaScript initial, en listant ce qui change et pourquoi) ; remplace le contrôle typographique par la nouvelle règle (seulement Bricolage Grotesque et Figtree, jamais `text-transform: uppercase`) ; adapte `test:contrastes` aux nouveaux écrans (0 sous AA).
- Test de la souris avec Playwright sur `/`, `/salle/`, `/ta-place/` et `/verdict/` : `mouse.down` au centre, `mouse.move` de 300 px, `mouse.up` : l'image du canevas change.
- Captures `--gpu` de chaque écran (ordinateur 1 440 px et téléphone 390 px) et planches site / maquette (`scripts/planches.mjs`, avec `docs/design-vdef/captures/` comme référence). Range-les dans `captures-vdef/`.
- Documents : `CLAUDE.md` (« Décisions fixées · Direction visuelle » réécrite d'après `VDEF.md` ; navigation ; ligne « Jumeau »), `docs/decisions.md`, `docs/PLANNING.md` (§ 1 et § 4 si la réalité a changé), une mention « remplacé par docs/design-vdef/VDEF.md » en tête de `docs/design-final/DESIGN-FINAL.md` et de `docs/refonte-la-seance.md`, et `docs/PROMPT-JUMEAU-CAMERAS.md` marqué « remplacé par PROMPT-VDEF.md, jamais lancé ».
- Ouvre la PR « VDEF · La salle est le menu ». Ne la fusionne pas : c'est la porte t82, Julien teste d'abord.

## Fin

Résume à Julien en quelques lignes : ce qui est fait, ce qui a échoué, ce qui n'a pas pu être vérifié, les écarts aux captures (avec les planches), les chiffres des niveaux d'accord avant / après (V1), et ce qu'il doit tester lui-même (glisser à la souris, la vue « Ta place », un parcours complet au téléphone, les paliers avec un profil de 10, 25 et 40 votes : explique-lui comment les simuler sans toucher à ses vraies réponses).
