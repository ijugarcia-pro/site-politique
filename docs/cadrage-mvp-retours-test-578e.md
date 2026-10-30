# Le 578e siège · Cadrage MVP · retours de test du 30 octobre 2026

> Document de référence pour Claude Code. Il remplace, pour les sujets traités ici, ce que disent `docs/design-vdef/VDEF.md` et `docs/decisions.md` (chaque décision rouverte est listée au §9 et doit être consignée dans `docs/decisions.md`). Tout le reste du contrat (CLAUDE.md) reste valable.
> Il a été produit après une relecture du code (§2), puis une **réunion de cadrage fictive** (§3) : l'équipe a pris les retours de Julien un par un, les a confrontés au code, a écarté ou amendé ce qui ne tenait pas, puis s'est relue elle-même (§4). Les lots du §6 sont prêts à être lancés dans l'ordre.
> Statut : **décisions proposées, à valider par Julien** (les points qui exigent son accord sont au §8).

---

## 0. Comment travailler avec ce document

- Un lot = une session = une branche = un commit final lisible. Lis `CLAUDE.md`, `docs/decisions.md`, `docs/PLANNING.md` puis ce document. Ne fais que le lot demandé. Termine par un résumé de 10 lignes (fait / non fait / mesures / questions) et **STOP**.
- **Mesurer avant d'optimiser.** Aucune optimisation de performance sans la mesure du lot 0. Les causes du §2 sont des **hypothèses classées**, sauf celles marquées « vérifié dans le code ».
- Toute **nouvelle clé de stockage local** doit être annoncée sur `/confidentialite/`, effacée par `/calcul/` et testée (règle CLAUDE.md). Ce cadrage n'en crée aucune : l'état d'interface (mode immersion, mode de vue, palier du panneau) vit **en mémoire**, jamais en stockage.
- **Noms de fichiers et de fonctions** : ceux du §2 ont été lus dans le code ; ceux des lots (`placerEtiquettes`, `matrice-cache.ts`, `palierAtteint`, `delaiOnde`, `lib/accord.ts`, etc.) sont **indicatifs** : vérifie-les avant d'écrire et adapte si le nom réel diffère.
- Contrats inchangés : zéro euro ; neutralité (aucune couleur ni formulation qui favorise une opinion) ; couleurs de vote pour `#2F7BFF`, contre `#FF6A3D`, abstention `#FFC531`, absent gris plein, non-votant en contour ; Bricolage Grotesque et Figtree seulement, jamais de capitales forcées ; contrastes AA ; mouvement réduit respecté ; chaque chiffre a sa phrase ; un seul hémicycle par écran.
- Les gardes-fous existants restent verts à chaque lot : `npm test`, `npm run build`, `npm run test:inventaire` (le réenregistrement de l'inventaire est autorisé quand le lot change des attributs `data-*` ; liste les changements dans le commit), `test:typo`, `test:contrastes`, `test:souris`, `uv run pytest`.

---

## 1. Les retours de Julien (30.10.2026)

| N° | Retour (résumé fidèle) | Écran |
| --- | --- | --- |
| R1 | À chaque vote, la caméra passe de la tribune à la salle puis revient : lourd, lent, répétitif, peu utile. Il propose : **image fixe de la tribune** pendant les questions, puis, au dévoilement, une vue de l'hémicycle **plus dézoomée** où l'on voit **tous les sièges** (aujourd'hui même en tournant la caméra on ne les voit pas tous) et où les sièges se colorent selon les résultats. Retirer le libellé « La tribune · ce texte y a été voté ». Le design minimaliste (esprit Uber Eats) est validé. | Quiz, lots, séance |
| R2 | À chaque changement de page : un temps de gel (la page se fige, rien n'est cliquable). Cela casse l'usage, y compris pour lui. | Tout le site |
| R3 | Sur un écran de PC plus petit, la vue hémicycle n'est pas adaptée : règles de responsive pour tout type d'écran. | Salle, tribune |
| R4 | Sur mobile, la 3D a moins de sens : la salle n'est pas vue en entier. Il veut pouvoir **baisser le bloc blanc** et voir la salle sans menu. | Mobile |
| R5 | Sélectionner un siège : le rond posé sur le siège est ambigu (avant-dernier siège ou siège du fond ?). Il propose une **vue par le haut**, plus lisible. | La salle |
| R6 | **Colorer le siège survolé** plutôt que (ou en plus de) le rond. | La salle |
| R7 | **Afficher le nom du député au survol**, dans un bloc dans l'espace vide à droite, sans devoir cliquer. | La salle |
| R8 | Jumeau et opposé étant au même endroit, leurs **étiquettes se cachent**. Il faut un système qui l'empêche. Selon lui, « un opposé ne peut pas être à côté d'un jumeau » ; « ton député » peut l'être. | La salle |
| R9 | On affiche jumeau et opposé alors qu'il n'a tranché que **2 votes** : comportement anormal. | La salle |
| R10 | L'étiquette « Glisse pour tourner · touche un siège » devient un **bouton qui masque / affiche les menus** de la page, pour voir la 3D sans menu. Sur mobile : pouvoir baisser le menu tout en bas. | Salle, mobile |

Demande de méthode : ne pas appliquer bêtement ; débattre, évaluer, trouver le bon système, pour un site parfait sur ordinateur et sur mobile ; aboutir à un cadrage découpé en lots.

---

## 2. Ce que le code dit (relecture du 30.10.2026)

**Vérifié dans le code**

| Fait | Où |
| --- | --- |
| Chaque changement de vue lance une **animation de caméra de 1,6 s** qui rend **toute la scène à chaque image** (577 sièges instanciés en 6 à 7 maillages, ombres PCF, pixel ratio jusqu'à 1,75 sur ordinateur et 2 sur téléphone, antialiasing sur ordinateur). À la fin, les ombres sont recalculées (`shadowMap.needsUpdate`). | `site/src/salle3d/scene.ts` (`vue()`, `interpoler(1600…)`, `finVue`, `redimensionner`, `new WebGLRenderer`) |
| Le dévoilement d'un vote fait `salle.vue('salle')` **puis** une onde de voyants de 1,1 s (un rendu complet à chaque lot de sièges allumés) ; « Question suivante » refait `salle.vue('tribune')`. Soit environ **3 s de rendu continu par vote**, 10 fois dans le quiz. | `site/src/lib/trancher.ts` (l. ~100-102 et ~186-188) |
| La vue « salle » vient d'un cadrage fixe (`pos [0, 7, -6.4]`, `cible [0, 5.5, 11]`, champ 64°) et la caméra libre est **bornée** (rayon ≤ 18 m, élévation ≤ 63°, hauteur ≤ 12 m) : on **ne peut pas** voir toute la salle en reculant. | `scene.ts` (`cadrage`, `poserLibre`) |
| À chaque page, `astro:page-load` relance `pilote.cadre(...)` et `pilote.vue(...)` : donc une animation de caméra à **chaque navigation**. | `site/src/components/vdef/Salle.astro` |
| La plupart des pages **re-téléchargent et re-parsent `/donnees/matrice.json`** (207 Ko sur l'export d'essai ; vérifier la taille réelle) à chaque visite, puis recalculent le profil sur 649 députés. Aucun cache partagé n'est utilisé alors que `ClientRouter` garde le même contexte JavaScript d'une page à l'autre. | `quiz.astro`, `salle.astro`, `ta-place.astro`, `verdict.astro`, `tes-reponses.astro`, `parcours.astro`, `index.astro`, `votes/[numero].astro`, `dossiers/[theme].astro` |
| Le **survol** d'un siège passe par un **lancer de rayon** (`siegeSous`) sur les maillages instanciés, une fois par image tant que la souris bouge. | `scene.ts` (`siegeSous`), `pilote.ts` (`pointermove`) |
| Les **étiquettes** des repères sont posées au point projeté du siège, **sans aucun calcul de collision** ; seules les classes `a-gauche` / `a-droite` existent près des bords. | `pilote.ts` (`placerReperes`), `Salle.astro` (style `.repere-libelle`) |
| Le gabarit « salle » impose `min-height: 760px` avec `overflow: hidden` : sur un écran dont la fenêtre fait moins de 760 px de haut, **le bas de l'écran est coupé**. Le cadrage ne distingue que « portrait » (`aspect < 0.9`) et « paysage ». | `site/src/layouts/Base.astro` (l. ~180), `scene.ts` (`cadrage`) |
| Sur téléphone (≤ 720 px), la salle fait **300 px de haut** en haut de page, la feuille « monte » dessous : la salle n'est jamais vue en entier. | `Base.astro` (media 720 px) |
| Sur `/salle/`, jumeau et opposé sont **affichés dès le premier vote** (« Ton jumeau · nom ») alors que « Ta place » reste verrouillée jusqu'à 10 votes (palier 1). | `site/src/pages/salle.astro` (l. ~150-170) |
| La vue de dessus a existé puis a été **retirée** en V3 le 22.10.2026 (« une vue de dessus montrait un hémicycle de plus »). Elle est dans l'historique git (`git show b6d1ac6`, `git show 7e32a24^`). | `docs/decisions.md` « Trois vues de la salle » |
| L'intention d'origine de « La Séance » était que **les pages en mode focus n'ouvrent pas la 3D en direct** : elles posent leur panneau sur l'image fixe. La VDEF a remis la caméra en direct. | `site/scripts/images-fixes.mjs` (en-tête) |
| Un moyen de **poser un siège sur une image fixe** existe déjà (utilisé pour les stories et la fiche d'un député). | `site/src/salle3d/projection.ts` (`siegeDansFond`) |
| Les teintes par siège (le velours prend la couleur du vote) passent par un attribut instancié : colorer un seul siège est peu coûteux. | `scene.ts` (`teintes`, `teinter`) |

**Hypothèses à confirmer par mesure (lot 0)**

| H | Hypothèse sur le gel au changement de page | Test |
| --- | --- | --- |
| H1 | L'animation de caméra de 1,6 s + rendu plein à chaque navigation occupe le fil principal / le GPU pendant que la page charge. | Désactiver l'animation (`instant`) et remesurer. |
| H2 | Le fetch + parse de `matrice.json` + le calcul de profil à chaque page créent de longues tâches. | Marques `performance.mark` autour de chaque script de page. |
| H3 | Le canevas persistant est **redimensionné** (réallocation du tampon) quand le gabarit change (`display: none` du gabarit « lecture », puis retour). | Journaliser `redimensionner()` et `renderer.setSize` par navigation. |
| H4 | Le GPU intégré ne tient pas 577 sièges instanciés + ombres + antialiasing à pixel ratio 1,75. | `renderer.info`, fréquence d'images, test avec `?qualite=1`. |

---

## 3. La réunion de cadrage (fictive)

**Participants (rôles)** : **Produit** (porte la voix de Julien, tranche), **UX/UI**, **3D & perf**, **Front (Astro)**, **Données**, **QA & accessibilité**.
**Règle de la réunion** : chaque retour reçoit un constat, des options, des objections, une décision et un critère d'acceptation. On a le droit de dire non à une proposition si l'objectif de Julien est mieux atteint autrement.

### R1 · Le dévoilement lourd, la tribune, tous les sièges

**Constat.** Julien a raison sur le fond et le code le confirme : ~3 s de rendu plein par vote, 10 fois de suite, avec une caméra qui fait l'aller-retour. Et il a raison sur la vue : elle ne montre pas tous les sièges.

**Débat.**
- **3D & perf** : le problème n'est pas la 3D, c'est de la **rejouer à chaque question**. Pendant la question, rien ne bouge : une image fixe suffit. D'ailleurs, l'intention d'origine de « La Séance » était exactement celle-là (pages focus sur image fixe).
- **UX/UI** : la tension est ailleurs. Le dévoilement est le moment fort du jeu : sièges qui se colorent, « 291 députés ont voté comme toi ». Si on le rend plat, on perd la récompense. Il faut qu'il reste **beau**, pas seulement léger.
- **Front** : trois façons de faire le dévoilement :
  - **A. Image fixe + calque 2D.** Une nouvelle image pré-rendue de la salle vue de haut (tous les sièges visibles, sièges clairs et neutres), et un calque 2D qui peint les 577 sièges aux couleurs du vote (positions projetées, comme `siegeDansFond` le fait déjà pour les stories ; mélange `multiply` pour garder l'ombre et le volume). **Aucun WebGL, aucun chargement de three** sur les pages de vote.
  - **B. 3D allégée.** La même scène, mais en palier « léger » : coupure instantanée vers une vue haute, pixel ratio 1, sans antialiasing, ombres figées, jamais d'animation de caméra.
  - **C. Hémicycle 2D vectoriel** (`lib/hemicycle.ts`, déjà là comme repli). Le plus léger, mais le moins fidèle à la direction « salle réaliste ».
- **Données** : A et C ont un avantage de fond : les personnes **sans WebGL, en économie de données ou avec moins de 4 Go de mémoire** reçoivent déjà le repli statique. Si A devient le chemin normal, **il n'y a plus qu'un chemin à maintenir** pour tous.
- **QA & accessibilité** : A est aussi le plus simple à rendre accessible (SVG ou canvas + texte de repli) et le plus prévisible en mouvement réduit.
- **UX/UI** (objection) : le risque de A, c'est un rendu « autocollant » : des pastilles posées sur une photo. À prouver par maquette réelle, pas à supposer.
- **3D & perf** (objection à B) : même allégée, B oblige à initialiser WebGL, décoder les textures et tenir une fréquence d'images sur du matériel faible, au moment du premier vote, quand la patience de l'utilisateur est la plus faible.

**Décision.**
1. Pendant les questions : **image fixe de la tribune, aucun WebGL, aucun mouvement de caméra**. Le libellé « La tribune · ce texte y a été voté » est **supprimé** (repère dans `components/vdef/Trancher.astro`, et le texte « ce texte y a été voté » dans `lib/trancher.ts` ou `pages/quiz.astro` : cherche la chaîne).
2. Au dévoilement : **fondu enchaîné** (≤ 250 ms, aucun en mouvement réduit) de la tribune vers une **vue haute et dézoomée où les 577 sièges sont visibles**, sans voyage de caméra ; les sièges se colorent du rang intérieur vers l'extérieur (même onde qu'aujourd'hui, dessinée en 2D). « Question suivante » : fondu inverse.
3. Le **choix entre A et B n'est pas fait sur dossier** : le lot 2 prototype les deux sur une même question, mesure, et Julien tranche sur captures (**porte G1**). Recommandation de l'équipe : **A**, B en repli si le rendu de A est jugé trop plat.
4. Le même mécanisme sert **les lots, la séance et le verdict** (une seule présentation du résultat d'un vote dans tout le site).

**Critères d'acceptation.** Sur les pages quiz, lots, séance : aucun contexte WebGL créé tant qu'on ne sort pas du parcours de vote ; aucun mouvement de caméra ; les 577 sièges visibles à 1440 × 900, 1280 × 650 et 390 × 844 ; fréquence d'images ≥ 30 pendant l'onde sur le matériel de référence ; JavaScript initial inchangé ou réduit.

### R2 · Le gel à chaque changement de page

**Constat.** Cause probable multiple (H1 à H4). Le point sûr : **chaque navigation rejoue une animation de caméra de 1,6 s avec rendu plein**, pendant que la page fait ses propres calculs.

**Débat.**
- **3D & perf** : la glisse de caméra entre « tribune / salle / ta place » est jolie quand on la déclenche, **insupportable quand on veut juste changer de page**. On coupe sec et on fait un fondu CSS.
- **Front** : `ClientRouter` garde le même contexte JavaScript : un **cache partagé** de `matrice.json` et un **profil mémoïsé** (recalculé seulement quand les réponses changent) suppriment les re-téléchargements et re-calculs. C'est gratuit et sûr.
- **QA & accessibilité** : demander à Julien de « sentir » un gel ne suffit pas pour valider. Il faut un **script de mesure** (tâches longues par navigation) et un seuil.
- **3D & perf** : un **gouverneur de qualité** : mesurer les 20 premières images ; si > 24 ms → palier léger ; si > 40 ms → pas de 3D du tout (repli statique). Plus un paramètre d'URL `?qualite=0|1|2` pour tester, sans stockage.
- **Produit** : on garde l'effet « la salle est le menu » ? **Oui, mais là où il compte** : la glisse de caméra reste entre `/salle/` et `/ta-place/` (palier 0 seulement, ≤ 600 ms, passable) ; partout ailleurs, coupure + fondu.

**Décision.** Lot 0 : mesurer. Lot 1 : navigation sans animation de caméra, cache de matrice partagé, profil mémoïsé, travail non critique différé (`requestIdleCallback`), canevas jamais caché par `display: none` (ni redimensionné inutilement), gouverneur de qualité.

**Critères d'acceptation.** Sur le matériel de référence (§7) avec ralentissement CPU ×4 : **aucune tâche longue > 100 ms** pendant les navigations du parcours principal (`/` → `/quiz/` → `/salle/` → `/ta-place/` → `/verdict/` → `/tes-reponses/`) ; délai entre le clic et la réaction visible < 100 ms ; mesures avant / après dans le résumé du lot.

### R3 · Petits écrans d'ordinateur

**Constat.** `min-height: 760px` + `overflow: hidden` coupe l'écran sous 760 px de fenêtre (courant sur un portable 13″ avec la barre du navigateur) ; le cadrage ne gère que « portrait / paysage ». Aucune règle ne rapproche ou n'éloigne la caméra selon la place réellement visible.

**Débat.**
- **UX/UI** : deux niveaux de responsive. (1) La **mise en page** : tailles des feuilles, point de bascule vers le tiroir (voir R4). (2) Le **cadrage 3D** : calculé à partir de la zone **réellement visible** (fenêtre moins les feuilles), pas de constantes.
- **3D & perf** : cadrage « ajusté » : on calcule la distance et le champ pour que l'ensemble des sièges tienne dans la zone visible avec une marge de 4 %. Même fonction pour la vue haute du dévoilement et pour la vue « Dessus ».
- **Front** : les feuilles défilent **à l'intérieur** (déjà `overflow: auto`), avec `max-height` calculé sur `100dvh`. On supprime `min-height: 760px`.
- **QA & accessibilité** : fixer **une matrice d'écrans** (§7) et un test de capture automatique.

**Décision.** Lot 4. Point de bascule vers la disposition « tiroir » relevé à **900 px de largeur** (au lieu de 720) et ajout d'une règle **paysage bas** (hauteur ≤ 560 px) où la feuille est repliée par défaut.

**Critères d'acceptation.** Sur toute la matrice : aucun contenu coupé, tous les sièges visibles dans les vues « salle » (dévoilement) et « Dessus », cibles tactiles ≥ 44 px, aucune barre de défilement horizontale.

### R4 · Mobile : la salle en entier, le bloc blanc qu'on baisse

**Constat.** 300 px de salle en haut, feuille dessous : on ne voit jamais la salle. Julien veut baisser la feuille.

**Débat.**
- **UX/UI** : le modèle est celui du **tiroir à crans** (comme les cartes ou Uber Eats) : la salle plein écran **derrière**, la feuille en **trois crans** : *replié* (poignée + titre), *moyen* (~45 %), *plein* (~88 %), plus un état **immersion** (tout masqué sauf un bouton flottant).
- **Front** : le glissé se fait **uniquement sur la poignée et l'en-tête** de la feuille, pour ne pas entrer en conflit avec le glissé de la salle ni avec le défilement du contenu. Poignée = bouton de 44 px, accessible au clavier (`aria-expanded`, Entrée / Espace pour passer d'un cran à l'autre).
- **3D & perf** : sur mobile, la 3D à pleine surface coûte plus cher. D'où : palier de qualité automatique (R2) ; et **sur `/salle/` mobile, mode « Dessus » par défaut** (voir R5), plus lisible et plus léger.
- **Produit** (objection) : « la 3D a moins de sens sur mobile ». L'équipe nuance : la 3D garde du sens sur `/ta-place/` (vue subjective, c'est ce qui fait rêver) ; sur `/salle/` c'est un outil, donc la vue du dessus convient mieux.
- **UX/UI** (point dur) : en vue du dessus, **577 sièges sur 390 px de large font des sièges de 5 à 6 px** : impossible à viser au doigt. À traiter : **zoom au pincement + déplacement**, sélection du siège **le plus proche** dans un rayon de 22 px, et la recherche « Trouver un député » reste le chemin de secours.

**Décision.** Lot 5 (tiroir et immersion) et lot 6 (sélection tactile).

**Critères d'acceptation.** Sur 390 × 844 et 360 × 640 : les trois crans fonctionnent au doigt et au clavier ; en immersion, la salle occupe tout l'écran ; sélectionner un siège voulu prend **deux gestes au plus** ; aucune barre du bas qui masque du contenu à un cran donné.

### R5 · La vue du dessus (décision précédente rouverte)

**Constat.** Le 22.10.2026, la vue de dessus a été retirée au nom de « un seul hémicycle par écran ». Julien la redemande parce que la perspective rend le choix d'un siège ambigu (profondeur). Les deux arguments sont valides.

**Débat.**
- **UX/UI** : le principe « un seul hémicycle par écran » vise à ne **pas empiler** deux hémicycles. Une **bascule** entre deux angles du **même** hémicycle le respecte.
- **3D & perf** : trois angles possibles : *Perspective* (immersion, l'actuelle), *Plongée* (≈ 55-60°, tous les sièges visibles, volume conservé), *Dessus* (≈ 90°, champ réduit, quasi orthographique, **plafond et coupole masqués**). Trois, c'est trop : **deux modes** dans un contrôle segmenté du panneau « Montrer dans la salle » : **Perspective** et **Dessus**.
- **Produit** : la vue du dessus doit-elle être par défaut ? Pas sur ordinateur (l'immersion fait la première impression), **oui sur mobile**. Le choix est gardé **en mémoire** pendant la session, pas en stockage.
- **Front** : le code de l'ancienne vue « plan » est dans l'historique (`git show b6d1ac6` et `git show 7e32a24`, notamment le masquage du plafond) : à **reprendre, pas à réécrire**.
- **UX/UI** (garde-fou) : valider **visuellement** le rendu du dessus avant de généraliser : la coupole coupée ne doit pas donner un effet « maquette d'architecte » incohérent avec le reste (**porte G2**, captures du dessus à 1440 et 390).

**Décision.** Lot 6 : mode « Dessus » dans `/salle/` (bascule, pas une quatrième vue de navigation). Le mode « Plongée » est écarté. La vue haute du dévoilement (R1) réutilise le même cadrage « ajusté » mais **ne propose pas** de bascule.

**Critères d'acceptation.** En « Dessus », aucun siège n'en masque un autre ; le siège sous le curseur est sans ambiguïté ; la bascule dure ≤ 600 ms (coupure en mouvement réduit) ; une seule vue de la salle à l'écran.

### R6 · Colorer le siège survolé

**Constat.** Le rond actuel (34 px) ne dit pas quel siège est visé. Le survol existe, mais coûte un lancer de rayon par image.

**Débat.**
- **3D & perf** : on **remplace le lancer de rayon** par un test **en 2D** : on projette les 577 sièges à l'écran **une fois par changement de caméra** (pas par mouvement de souris), on range les points dans une grille, et on cherche le **plus proche dans le rayon apparent du siège** (le plus proche de la caméra en cas d'égalité). Coût < 1 ms, plus fiable que le rayon pour des sièges serrés, testable sans WebGL.
- **UX/UI** : la couleur du siège survolé ne doit pas rentrer en conflit avec les couleurs de vote (bleu, orange, jaune, gris) ni avec l'« ivoire » du groupe : **blanc franc + fin contour encre**, et on **garde un anneau** (la couleur seule n'est pas un signal accessible).
- **Front** : le survol existe seulement en vue « salle » aujourd'hui ; il doit exister en « Dessus ». Pas de survol au toucher : le **toucher sélectionne**.

**Décision.** Lot 6. Le siège survolé passe au blanc (attribut de teinte existant), anneau fin conservé ; le siège **choisi** garde un anneau plein jusqu'à un clic ailleurs ou Échap.

**Critères d'acceptation.** Test unitaire du test 2D (caméra factice, 577 sièges, cas de sièges superposés) ; coût du survol < 1 ms mesuré ; aucun lancer de rayon par mouvement de souris.

### R7 · Le nom du député au survol

**Décision.** Sur ordinateur, un **bloc d'information dans l'espace libre à droite** (même style que les cartes de la feuille) affiche, **dès le survol** : nom, groupe (pastille), « a voté comme toi sur X de tes N votes » (si N ≥ 1), et le lien « Voir sa fiche ». Un clic **épingle** la carte (il devient possible d'y aller avec la souris) ; sans épingle, la carte suit le survol et disparaît quand il n'y en a plus. Au toucher : le toucher épingle ; sur mobile, la carte s'ouvre dans le tiroir (cran replié = nom seul).

**Débat.**
- **QA & accessibilité** : une zone `aria-live="polite"` **temporisée** (150 ms) pour ne pas annoncer 30 noms par seconde. Au clavier : « Trouver un député » reste le chemin principal ; en « Dessus », **les flèches déplacent la sélection de siège en siège** (souhaitable, P2).
- **Données** : la phrase « a voté comme toi sur X de tes N » est déjà calculée (`lib/accord.ts`) ; **aucune nouvelle donnée**.
- **UX/UI** : en mode immersion, seule l'info-bulle minimale (nom) reste au survol.

**Critères d'acceptation.** Le nom apparaît en < 100 ms ; aucune superposition avec la feuille de gauche ni l'encart de palier ; test de contraste AA sur la carte.

### R8 · Étiquettes qui se masquent ; « un opposé ne peut pas être à côté d'un jumeau »

**Constat.** Aucune gestion de collision. Et l'hypothèse de Julien sur l'opposé mérite d'être traitée à part.

**Débat.**
- **Données** (objection de fond) : **on ne peut pas garantir par les données qu'un opposé n'est jamais voisin d'un jumeau.** Les sièges sont rangés par groupe ; deux députés d'un même groupe voisins peuvent très bien avoir, l'un le plus de votes identiques, l'autre le plus de votes contraires, surtout avec peu de votes. **Forcer l'éloignement fausserait le résultat** et contredirait la règle « une absence n'est pas un accord » : on ne truque pas le classement pour arranger l'affichage.
- **Données** (ce qui est légitime) : un **départage des égalités exactes**. Aujourd'hui, à égalité parfaite (mêmes contraires, mêmes identiques), l'ordre est alphabétique, donc arbitraire. On peut le remplacer par : **préférer un député d'un autre groupe que le jumeau, puis le nom**. Cela n'altère aucun classement : cela ne joue qu'à égalité parfaite. **À valider par Julien** (§8, Q3) car c'est une règle de calcul.
- **UX/UI** : l'affichage doit **tolérer** la proximité : un algorithme de placement qui essaie quatre emplacements autour du point (au-dessus, en dessous, à gauche, à droite), évite les autres étiquettes, les points, les bords et les feuilles, puis **trace un fil** entre l'étiquette et son point. Si deux points sont à moins de 30 px, **une étiquette groupée** à deux lignes (« Ton jumeau · A » / « Ton député · B »).
- **Front** : fonction **pure et testée** `placerEtiquettes(points, tailles, obstacles, bornes)`. Priorité : Toi > jumeau > opposé > député. Libellés raccourcis : on retire « (Alpes-Maritimes) » sauf homonyme dans la liste affichée.
- **Produit** : « ton député » à côté du jumeau ou de l'opposé est donc **normal** : l'algorithme le gère comme le reste.

**Décision.** Lot 7 : `placerEtiquettes`, étiquette groupée, fils, libellés raccourcis, **plus** (si Julien valide Q3) le départage par groupe dans `lib/profil.ts` avec tests et entrée dans `docs/decisions.md`.

**Critères d'acceptation.** Test pur : jamais deux étiquettes qui se recouvrent sur 200 tirages aléatoires de 4 repères dans un cadre de 1440 × 900 et de 390 × 844 ; jumeau et opposé adjacents : les deux étiquettes restent lisibles ; captures de ce cas.

### R9 · Jumeau et opposé à 2 votes

**Constat (confirmé sur les captures).** L'écran dit « Ton parcours · 2 votes », « Ta place » est verrouillée, et pourtant le jumeau et l'opposé sont affichés.

**Débat.**
- **Données** : avec 2 votes, plusieurs députés sont à égalité et le « jumeau » n'a pas de sens statistique. La règle du site est d'ailleurs claire : « Ta place » s'ouvre à **10 votes** (palier 1), avec une précision affichée.
- **Produit** : cohérence avant tout. Tout ce qui dépend du jumeau ou de l'opposé suit le **même seuil**.
- **QA & accessibilité** : vérifier **tous les écrans** qui montrent un jumeau ou un opposé : `/salle/`, `/verdict/`, la tribune, les stories, `/tes-reponses/`, `/parcours/`.

**Décision.** Lot 7 : avant 10 votes tranchés (`palierAtteint`), **aucun jumeau ni opposé** n'est montré nulle part ; à la place, une phrase : « À 10 votes, ton jumeau et ton opposé apparaissent · N / 10 ». « Ton député » et « Un groupe » restent disponibles. Un test garde la règle : aucune chaîne « jumeau » ou « opposé » dans le rendu sous le seuil.

### R10 · Bouton « masquer les menus » ; tiroir à baisser

**Décision.** Un **seul concept d'immersion** pour ordinateur et mobile : un **bouton** (icône œil + libellé « Masquer les menus » / « Afficher les menus ») remplace l'étiquette « Glisse pour tourner · touche un siège ». Sur ordinateur, en bas au centre ; sur mobile, flottant en haut à droite (44 px). En immersion : feuilles, barres haute et basse, encarts masqués ; **restent** le bouton, les repères posés par la page et l'info-bulle du survol. Échap, ou le bouton, quitte l'immersion. L'indication « Glisse pour tourner » devient un **petit texte discret** qui disparaît au **premier geste** (en mémoire, pas de stockage). Sur mobile : le tiroir **replié** (poignée seule) est le « premier cran » de l'immersion.

**Critères d'acceptation.** En immersion, rien d'autre n'est visible que la salle, les repères et le bouton ; le focus clavier reste sur le bouton ; l'état est annoncé (`aria-pressed`) ; l'immersion se réinitialise en quittant `/salle/` ou `/ta-place/`.

---

## 4. Seconde passe : l'équipe se relit

Après avoir fixé les décisions, l'équipe a cherché les failles de sa propre proposition.

| Faille trouvée | Conséquence retenue |
| --- | --- |
| Le dévoilement « image + calque 2D » peut sembler plat. | **Porte G1** : prototype A et B sur une même question, captures comparées, **Julien tranche**. Pas de généralisation avant. |
| Une nouvelle image fixe (vue haute, sièges neutres) doit rester **fidèle à la salle** quand la salle change (lumières, matières). | La produire avec `site/scripts/images-fixes.mjs` (déjà versionné, `--gpu` sur la vraie carte graphique) et la **régénérer** à chaque changement de salle ; l'ajouter au contrôle de CLAUDE.md. |
| Retirer la caméra entre pages dégrade le principe « la salle est le menu ». | On le garde **où il compte** (glisse entre `/salle/` et `/ta-place/`, palier 0, passable) ; ailleurs, fondu. À re-tester par Julien. |
| « Ta place est prête » : le personnage marche jusqu'à son siège (3,5 s, 3D). Le dévoilement sans WebGL oblige à ouvrir la 3D **une fois**, à la 10e réponse. | La 3D se charge **à la demande** à ce moment-là, avec un état de chargement et un repli statique (fondu vers l'image de la place) si le palier de qualité est 2. La marche reste passable. |
| Le gel peut venir d'ailleurs que de ce qu'on a vu. | Le **lot 0 est bloquant** : pas d'optimisation avant la mesure, et le lot 1 se juge **sur la mesure**, pas sur le ressenti. |
| La vue « Dessus » sur 390 px est inutilisable au doigt sans zoom. | Zoom/déplacement au pincement et plus proche voisin à 22 px, **critère de deux gestes**, prototype avant généralisation. |
| Hover = souris seulement. | Au toucher : toucher = sélection ; la carte vit dans le tiroir. |
| Les attributs `data-*`, le poids du JavaScript initial et les tests de la souris sont gardés par des contrôles. | Réenregistrer l'inventaire quand un lot le justifie, **avec la liste des changements** ; adapter `test:souris` au nouveau comportement, **ne pas le supprimer**. |
| Risque de régression sur la neutralité (couleur du survol, libellés). | Blanc + encre pour le survol ; aucune couleur de groupe en survol ; aucune formulation nouvelle qui qualifie un choix. |

---

## 5. Spécification cible (ce que l'utilisateur vivra)

**Quiz, lots, séance (10 votes d'affilée).** La tribune en image fixe, aucune caméra. L'utilisateur lit, répond. Fondu vers la vue haute : les 577 sièges visibles, l'onde de couleur du rang intérieur vers l'extérieur, la feuille de droite (issue, barre, « Tu es avec la majorité… »). « Question suivante » : fondu inverse. Aucun contexte WebGL tant qu'on ne quitte pas ce parcours.

**Navigation.** Changer de page : coupure franche + fondu CSS ; rien ne se fige ; les pages réutilisent les données déjà chargées.

**La salle.** Le panneau « Montrer dans la salle » avec une bascule **Perspective / Dessus**. Le **siège survolé devient blanc** ; sa **carte** s'affiche dans l'espace libre à droite (nom, groupe, accord) ; un clic l'épingle. Avant 10 votes : pas de jumeau ni d'opposé, une phrase qui dit pourquoi. Les étiquettes ne se recouvrent jamais. Un bouton **Masquer les menus** donne la salle seule.

**Mobile.** La salle plein écran derrière un **tiroir à trois crans** (replié, moyen, plein) + immersion. Sur `/salle/`, vue du dessus par défaut, zoom au pincement, sélection du siège le plus proche.

**Partout.** Le cadrage s'ajuste à la zone visible ; plus rien de coupé sur un petit écran ; mouvement réduit et clavier respectés.

---

## 6. Les lots

Ordre d'exécution conseillé : **0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. Les lots 4, 5 et 7 peuvent s'échanger avec 2-3 sans dépendance technique ; le lot 7 (seuil des 10 votes) est le plus court et peut passer en premier si Julien veut une victoire rapide. Taille : S ≈ 1 session courte, M ≈ 1 session, L ≈ 2 sessions.

### Lot 0 · Mesurer · S

- **À faire** : (1) `site/scripts/perf-navigation.mjs` (Playwright, Chromium, ralentissement CPU ×4 via CDP) : rejoue le parcours principal et journalise, **par navigation**, les tâches longues (`PerformanceObserver` `longtask`), la durée des handlers `astro:page-load`, le nombre d'appels à `redimensionner()` et `setSize`, la fréquence d'images pendant une animation de caméra et pendant l'onde de voyants. (2) Ajoute des `performance.mark` / `measure` **désactivés par défaut** (activés par `?perf=1`) autour des scripts de page et des appels `vue()`, `voyants()`, `onde()`. (3) Teste H1 à H4 (§2) une par une (`instant`, cache de matrice, `?qualite=1`) et écris le tableau avant / après. (4) Mesure la taille réelle de `matrice.json` et le coût du lancer de rayon du survol (`siegeSous`).
- **Livrable** : `docs/rapport-perf-30-oct.md` (causes confirmées, causes écartées, mesures, **seuils retenus** pour les lots suivants).
- **Critère de fin** : chaque hypothèse H1-H4 est confirmée ou écartée **par une mesure**.
- **Ne pas faire** : aucune optimisation, aucun changement de comportement.

### Lot 1 · Navigation sans gel · M

- **À faire** : (1) `Salle.astro` : à la navigation, `pilote.vue(vue, { instant: true })` + fondu CSS ; la glisse de caméra **seulement** entre `/salle/` et `/ta-place/` en palier 0 (≤ 600 ms, passable). (2) `site/src/lib/matrice-cache.ts` : une promesse partagée de `matrice.json`, `deputes.json` et `votes.json`, et un **profil mémoïsé** par jeu de réponses ; toutes les pages l'utilisent (liste au §2). (3) Travail non critique de chaque page différé (`requestIdleCallback` avec repli). (4) Canevas jamais en `display: none` ni redimensionné inutilement (`redimensionner()` ne réalloue que si la taille change vraiment). (5) **Gouverneur de qualité** : palier 0 complet ; palier 1 léger (pixel ratio 1, sans antialiasing, ombres figées) si la médiane des 20 premières images > 24 ms ; palier 2 statique si > 40 ms ; `?qualite=0|1|2` pour forcer ; arrêt du rendu quand l'onglet est caché.
- **Critère de fin** : seuils du lot 0 tenus (aucune tâche longue > 100 ms par navigation sur le parcours principal, matériel de référence ×4 CPU) ; rapport avant / après.
- **Ne pas faire** : toucher au pipeline, aux calculs ou aux clés de stockage ; retirer la 3D de `/salle/` et `/ta-place/`.

### Lot 2 · Dévoilement léger : prototype et porte G1 · M

- **À faire** : (1) `Trancher.astro` / `lib/trancher.ts` / `quiz.astro` : retirer le libellé « La tribune · ce texte y a été voté » ; tribune en **image fixe seule** (aucun WebGL, aucun `vue()`), y compris au retour de « Question suivante ». (2) Nouvelle image fixe **vue haute, 577 sièges visibles, sièges clairs et neutres, sans voyants**, générée par `scripts/images-fixes.mjs` (`--gpu`) : `fond-revelation.webp` et `fond-revelation-telephone.webp` ; cadrage par la fonction « ajustée » (lot 4 : en attendant, un cadrage fixe qui montre tous les sièges). (3) **Prototype A** : calque 2D (canvas) qui peint les 577 sièges (positions via une version généralisée de `projection.ts`, onde du rang intérieur vers l'extérieur par `delaiOnde`, mélange `multiply`). (4) **Prototype B** : 3D allégée (palier 1, coupure instantanée vers la vue haute, aucune glisse). (5) Mesure de A et B : temps jusqu'au premier dévoilement, fréquence d'images, JavaScript chargé, contexte WebGL créé ou non. (6) Planche de captures A / B à 1440 × 900, 1280 × 650, 390 × 844.
- **Livrable** : les deux prototypes derrière `?revelation=a|b`, la planche, les mesures.
- **Porte G1** : **Julien choisit A ou B sur captures et mesures.** Rien n'est généralisé avant.
- **Ne pas faire** : généraliser à lots / séance / verdict ; supprimer le code 3D du dévoilement avant la décision.

### Lot 3 · Dévoilement final · M

- **À faire** : généraliser le choix de G1 à `quiz`, `lots`, `seance`, `verdict` (mécanisme unique) ; fondu enchaîné ≤ 250 ms (aucun en mouvement réduit) ; « Ta place est prête » : la 3D se charge **à la demande** à la 10e réponse, état de chargement visible, repli statique si palier 2 ; supprimer le code mort du dévoilement 3D si A est retenu (en gardant la 3D pour `/salle/`, `/ta-place/`, la marche) ; régénérer les images fixes ; mettre à jour `docs/design-vdef/VDEF.md` (addendum daté, sans réécrire le contrat) et `test:souris` pour les pages concernées.
- **Critère de fin** : critères de R1 (§3) ; `npm run test:inventaire` réenregistré avec la liste des changements.
- **Ne pas faire** : modifier la formule de calcul des résultats, les textes réglementaires du verdict ou « Ta voix de 578e ».

### Lot 4 · Cadre et responsive · M

- **À faire** : (1) supprimer `min-height: 760px` ; `100dvh` ; feuilles à `max-height` calculé et défilement interne. (2) `cadrageAjuste(nom, zoneVisible)` dans `scene.ts` : distance et champ calculés pour que l'ensemble des sièges tienne dans la zone visible (fenêtre moins feuilles), marge 4 %, pour la vue haute du dévoilement, « salle » et (lot 6) « Dessus » ; tests unitaires (`geometrie.test.ts` ou nouveau). (3) Point de bascule vers la disposition « tiroir » à 900 px ; règle « paysage bas » (hauteur ≤ 560 px). (4) `site/scripts/matrice-ecrans.mjs` : captures automatiques de toute la matrice du §7 sur `/`, `/quiz/` (réponse + dévoilement), `/salle/`, `/ta-place/`, `/verdict/`.
- **Critère de fin** : critère de R3 sur toute la matrice (rien de coupé, tous les sièges visibles, pas de défilement horizontal) ; planche de captures dans le résumé.
- **Ne pas faire** : changer la direction visuelle ni les couleurs.

### Lot 5 · Tiroir mobile et immersion · M

- **À faire** : (1) Composant `TiroirMobile` (dans `components/vdef/`) : salle **plein écran fixe** derrière, feuille à trois crans (replié ≈ 72 px, moyen ≈ 45 %, plein ≈ 88 %), glissé sur la poignée et l'en-tête seulement, poignée = bouton 44 px avec `aria-expanded`, Entrée / Espace pour changer de cran, `prefers-reduced-motion` : changement de cran sans animation ; barre du bas visible sauf en immersion. (2) **Bouton d'immersion** (§R10) sur ordinateur et mobile, état en mémoire, Échap, `aria-pressed`. (3) Remplacer l'étiquette « Glisse pour tourner · touche un siège » par le bouton + un indice discret qui disparaît au premier geste. (4) Adapter `Base.astro` / `Feuille.astro` (le mobile n'est plus « salle 300 px + feuille dessous »).
- **Critère de fin** : critères de R4 et R10 ; tests clavier ; captures 390 × 844 et 360 × 640 aux trois crans et en immersion.
- **Ne pas faire** : de stockage local ; un glissé qui entre en conflit avec le glissé de la salle (test).

### Lot 6 · La salle : Dessus, survol, carte, sélection · L

- **À faire** : (1) **Mode « Dessus »** (`salle3d/scene.ts`) en reprenant le code retiré (`git show b6d1ac6`) : caméra quasi verticale, champ réduit, **plafond et coupole masqués**, cadrage ajusté ; bascule **Perspective / Dessus** dans le panneau (contrôle segmenté, `aria-pressed`), vue du dessus **par défaut sur mobile et sous 900 px**, état en mémoire. **Porte G2** : captures du Dessus à 1440 et 390 validées par Julien avant de poursuivre. (2) **Test 2D du siège visé** : `salle.projeterSieges()` mis en cache par changement de caméra, grille, plus proche voisin dans le rayon apparent (le plus proche de la caméra à égalité) ; remplace `siegeSous` dans `pilote.ts` ; tests unitaires. (3) **Survol** : siège survolé en blanc (attribut de teinte existant) + anneau fin ; siège choisi : anneau plein. (4) **Carte au survol** : bloc dans l'espace libre à droite (nom, groupe, accord, « Voir sa fiche »), épinglée au clic, zone `aria-live` temporisée ; sur mobile, dans le tiroir. (5) **Sélection tactile** : zoom au pincement et déplacement en « Dessus », plus proche siège dans 22 px. (6) Flèches : en « Dessus », elles déplacent la sélection (P2).
- **Critère de fin** : critères de R5, R6, R7 ; coût du survol < 1 ms ; sélection d'un siège voulu en ≤ 2 gestes sur 390 × 844.
- **Ne pas faire** : ajouter une quatrième vue de navigation ; ajouter un mode « Plongée » ; changer la couleur des groupes.

### Lot 7 · Étiquettes sans collision et seuil des 10 votes · M

- **À faire** : (1) `site/src/salle3d/etiquettes.ts` : fonction pure `placerEtiquettes` (quatre emplacements, évite autres étiquettes / points / bords / feuilles, fils, **étiquette groupée** si deux points < 30 px, priorité Toi > jumeau > opposé > député), tests (200 tirages, deux cadres). (2) `pilote.ts` : l'utiliser à chaque projection ; libellés raccourcis (département seulement en cas d'homonyme). (3) **Seuil des 10 votes** : `salle.astro`, `verdict.astro`, tribune, stories, `tes-reponses`, `parcours` : aucun jumeau ni opposé avant `palierAtteint(n)` ; phrase « À 10 votes, ton jumeau et ton opposé apparaissent · N / 10 » ; test qui garde la règle. (4) **Si Julien valide Q3** : départage des égalités exactes de l'opposé par « un autre groupe que le jumeau » avant le nom (`lib/profil.ts`, tests, entrée dans `docs/decisions.md`, CLAUDE.md « Jumeau »).
- **Critère de fin** : critères de R8 et R9 ; captures de jumeau et opposé adjacents.
- **Ne pas faire** : modifier le classement du jumeau ou la règle « une absence n'est pas un accord » ; déplacer artificiellement un opposé.

### Lot 8 · Recette finale · M

- **À faire** : (1) Parcours complet sur toute la matrice du §7 (captures automatiques + liste de contrôle manuelle). (2) Mesures finales (`perf-navigation.mjs`, poids du JavaScript, images fixes). (3) `test:typo`, `test:contrastes`, `test:souris`, `test:inventaire`, `npm test`, `uv run pytest` verts. (4) Documents : `docs/decisions.md` (§9), addendum `docs/design-vdef/VDEF.md`, `CLAUDE.md`, `docs/PLANNING.md`. (5) Un fichier **`docs/recette-mvp.md`** : ce qui marche, ce qui reste, les écarts connus. (6) Préparer le **kit de captures du portfolio** (voir `prompt-portfolio-578e-siege.md`, annexe) **seulement après** cette recette.
- **Critère de fin** : le parcours « première visite → quiz de 10 votes → ta place → salle → séance → verdict » se déroule sans gel ni écran coupé sur ordinateur et téléphone ; mesures sous les seuils.

---

## 7. Matrice de test et matériel de référence

| Catégorie | Tailles (largeur × hauteur de la fenêtre) |
| --- | --- |
| Petit portable | 1280 × 600, 1366 × 650 |
| Ordinateur courant | 1440 × 900, 1536 × 730 |
| Grand écran | 1920 × 1080, 2560 × 1080 (ultra-large) |
| Tablette | 768 × 1024 (portrait), 1024 × 768 (paysage) |
| Téléphone | 360 × 640, 390 × 844, 412 × 915 |
| Téléphone paysage | 844 × 390 |

**Matériel de référence** : l'ordinateur de Julien avec ralentissement CPU ×4 (Chrome, onglet Performance) **et** le téléphone Android où il a fait ses captures (Chrome). Julien note modèle et navigateur dans `docs/rapport-perf-30-oct.md`.

---

## 8. Questions pour Julien (à trancher avant les lots concernés)

| N° | Question | Avant le lot | Recommandation de l'équipe |
| --- | --- | --- | --- |
| Q1 | Dévoilement : **A** (image fixe + calque 2D) ou **B** (3D allégée) ? | 3 (porte G1) | A, B en repli ; décision sur captures. |
| Q2 | La vue du dessus par défaut sur ordinateur, ou la perspective ? | 6 (porte G2) | Perspective sur ordinateur, Dessus sur mobile et sous 900 px. |
| Q3 | Départager les égalités exactes de l'opposé par « un autre groupe que le jumeau » avant le nom ? | 7 | Oui (ne change aucun classement, seulement les égalités parfaites). |
| Q4 | Sous 10 votes, masquer jumeau et opposé **partout** (verdict, stories, parcours) ou seulement dans la salle ? | 7 | Partout, pour la cohérence avec « Ta place ». |
| Q5 | « Ta place est prête » : garder la marche du personnage (3D chargée à la demande) ou la remplacer par un fondu statique ? | 3 | Garder, passable, repli statique sur matériel faible. |

---

## 9. Décisions rouvertes à consigner dans `docs/decisions.md` (entrées datées du jour du lot)

1. **« Trois vues de la salle » (22.10.2026)** : la vue de dessus revient, comme **mode** de la vue « salle » (bascule), pas comme quatrième vue ; « un seul hémicycle par écran » reste respecté.
2. **Pages en mode focus sur image fixe** (retour à l'intention de « La Séance ») : plus de glisse de caméra pendant le vote ; le dévoilement se fait sur une vue haute des 577 sièges.
3. **Navigation** : plus d'animation de caméra à chaque page, sauf entre `/salle/` et `/ta-place/` (palier 0).
4. **Seuil d'affichage du jumeau et de l'opposé** : 10 votes tranchés (palier 1), partout.
5. **Départage des égalités de l'opposé** (si Q3 validée).
6. **Immersion** : bouton « Masquer les menus », sans stockage ; tiroir mobile à trois crans.
7. **Hit-test des sièges** en 2D à la place du lancer de rayon.

---

## 10. Observations hors périmètre (à ne pas traiter dans ces lots)

- Sur la capture de la question 2, le « Concrètement » du vote sur les réseaux sociaux contient une formulation qui m'a paru peu claire à la lecture de la capture. À repasser par les 7 contrôles de vulgarisation et par Julien ; ne pas corriger sans validation, et la reformulation doit rester neutre.
- Le champ de précision après 10 votes, la formule du verdict (« du matin » ou « dès la publication ») et les points juridiques restent à trancher dans leurs tâches existantes (`docs/PLANNING.md`).

---

## 11. Prompt de lancement d'un lot (à coller dans Claude Code)

> Lis `CLAUDE.md`, `docs/decisions.md`, `docs/PLANNING.md` et `docs/cadrage-mvp-retours-test-578e.md`. Fais **uniquement le lot N** de ce dernier (§6). Respecte le §0 (mesurer avant d'optimiser, aucune nouvelle clé de stockage, gardes-fous verts), consigne les décisions concernées au §9 dans `docs/decisions.md`, mets à jour `docs/PLANNING.md`, puis donne un résumé de 10 lignes maximum (fait / non fait / mesures avant-après / questions), la liste des fichiers modifiés et les captures demandées, et **arrête-toi**. Si le lot contient une porte (G1, G2), prépare les captures et les mesures et arrête-toi : ne passe pas la porte à la place de Julien.
