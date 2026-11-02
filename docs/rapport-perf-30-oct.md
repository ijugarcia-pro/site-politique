# Rapport de performance · le gel au changement de page (30 octobre 2026)

> Lot 0 du cadrage MVP (`docs/cadrage-mvp-retours-test-578e.md`, § 2 et § 6, tâche t83). **Mesure seulement : aucune optimisation, aucun changement de comportement.** Les chiffres servent de référence « avant » aux lots 1 à 8.

## En bref

- **Le gel vient de la salle 3D, pas des données ni des pages.** Sans WebGL, le même parcours ne produit **aucune tâche longue** à processeur normal, et chaque navigation s'affiche en 22 à 41 ms. Avec la salle : jusqu'à **408 ms** de tâche longue et **1,2 s** d'image figée, même sans ralentissement.
- **Deux causes confirmées, qui se cumulent** : la glisse de caméra de 1,6 s rejouée à chaque page et à chaque vote (H1), et une carte graphique intégrée qui ne tient pas le rendu complet à pixel ratio 1,5 avec ombres et antialiasing (H4). Couper l'une ou l'autre divise le total des tâches longues du parcours par deux ; couper les deux le divise par trois.
- **H2 est écartée comme cause du gel** : lire `matrice.json` et calculer le profil coûte moins de 5 ms. **H3 est confirmée, mais mineure** : un seul redimensionnement inutile au retour d'une page « lecture ». En revanche, la caméra glisse pendant 1,6 s sur un canevas caché.
- Aucun seuil du cadrage n'est tenu aujourd'hui. Les seuils retenus pour les lots suivants sont à la fin de ce rapport.

## Méthode

- **Outil** : `site/scripts/perf-navigation.mjs` (Playwright, Chromium). Il rejoue le parcours principal par de vrais clics sur des liens, interceptés par le `ClientRouter` d'Astro comme pour un visiteur : `/` → `/quiz/` → `/salle/` → `/ta-place/` → `/verdict/` → `/tes-reponses/` → `/salle/`. Le dernier retour sert H3, car `/tes-reponses/` est en gabarit « lecture ». Il mesure ensuite trois votes du quiz (révélation, puis question suivante), puis 60 positions de souris sur `/salle/` (survol).
- **Par navigation**, il relève : les tâches longues (`PerformanceObserver` `longtask`), la plus longue image (écart entre deux `requestAnimationFrame`), la durée des gestionnaires `astro:page-load`, les chargements de `/donnees/` (réseau + lecture du JSON), les appels à `redimensionner()`, les glisses de caméra et leur cadence d'images, et le temps de `renderer.render()` côté processeur.
- **Marques dans le code** : `site/src/salle3d/scene.ts` (`modePerf`), **désactivées par défaut**. `?perf=1` pose les marques `salle:vue`, `salle:onde`, `salle:rendre`, `salle:redimensionner` et `salle:siegeSous`. `?perf=instant` coupe en plus les glisses de caméra (test de H1). `?perf=leger` rend à pixel ratio 1, sans antialiasing ni ombres (test de H4). Le fichier est chargé à la demande, donc le JavaScript initial des pages ne change pas. Testé dans `src/salle3d/perf.test.ts`.
- **Matériel** : ce poste, Intel Iris Xe (Direct3D 11, vraie carte graphique), fenêtre de 1 440 × 900, densité de pixels 1,5. Processeur ralenti ×4 par CDP, comme le demande le § 7 du cadrage, plus un passage à ×1 pour référence. Le build est celui de la branche, sur l'export local du 12 oct. (`matrice.json` : 207 747 octets). Visiteur inventé : 12 réponses illustratives.
- **Répétitions** : 3 passages par variante, et chaque chiffre ci-dessous est une médiane. Les écarts d'un passage à l'autre sont grands (par exemple, total des tâches longues du parcours « normal » : 4 238, 3 151 et 2 540 ms). Il faut donc toujours comparer des médianes de 3 passages.
- **Non mesuré** : le téléphone Android de Julien, qu'il reste à noter ici avec son modèle et son navigateur (cadrage, § 7), ainsi que les autres tailles d'écran.

Commande (depuis `site/`, après un build) :

```bash
node scripts/perf-navigation.mjs <build> --variantes=normal,instant,leger,instant-leger,sans-webgl --json=<fichier>
```

## Résultats

### Le parcours principal (6 navigations, CPU ×4, médiane de 3 passages)

| Variante | Tâches longues, total du parcours | Plus longue tâche (3 passages) | Navigations avec une tâche > 100 ms | Plus longue image | Clic → page échangée |
| --- | --- | --- | --- | --- | --- |
| Aujourd'hui (`perf=1`) | **3 151 ms** | 240 · 453 · 181 ms | 5 · 3 · 6 sur 6 | 500 à 983 ms | 92 à 104 ms |
| Sans glisse de caméra (H1, `instant`) | 1 602 ms (−49 %) | 149 · 238 · 1 017 ms | 2 · 4 · 4 | 200 à 1 117 ms | 64 à 234 ms |
| Rendu léger (H4, `leger`) | 1 489 ms (−53 %) | 96 · 94 · 428 ms | 0 · 0 · 3 | 150 à 1 250 ms | 67 à 80 ms |
| Les deux (`instant` + `leger`) | 1 090 ms (−65 %) | 106 · 131 · 238 ms | 1 · 1 · 3 | 133 à 333 ms | 84 à 202 ms |
| Sans WebGL (repli statique) | 1 305 ms | 102 · 331 · 423 ms | 1 · 3 · 5 | 200 à 567 ms | 109 à 210 ms |

À processeur normal (×1, 1 passage) :

| Variante | Tâches longues, total | Plus longue tâche | Plus longue image | Clic → page échangée (médiane) |
| --- | --- | --- | --- | --- |
| Aujourd'hui | 1 652 ms | 408 ms | 750 ms | 115 ms |
| Sans WebGL | **0 ms** | 0 | 50 ms | **24 ms** |

Avec un processeur ralenti ×4, même le site sans 3D produit des tâches longues : c'est le prix de l'échange de page d'Astro et des scripts des pages. À ×1, il n'en reste aucune. Le gel ressenti, lui, est là même à ×1, et seulement avec la salle.

### Un vote du quiz (CPU ×4, médiane de 9 gestes sur 3 passages)

| Variante | Révélation : tâches longues | Révélation : plus longue image | Glisse : images / s | Question suivante : tâches longues |
| --- | --- | --- | --- | --- |
| Aujourd'hui | 802 ms | 467 ms | 12 (révélation), 33 (retour) | 526 ms |
| Sans glisse | 440 ms | 200 ms | (aucune glisse) | **0 ms** |
| Rendu léger | 197 ms | 250 ms | 25 et 46 | 64 ms |
| Les deux | 377 ms | 133 ms | (aucune glisse) | **0 ms** |

À ×1 : aucune tâche longue pendant les votes, mais des images figées jusqu'à **1 233 ms** pendant la révélation, et une glisse à 13-38 images / s. Le processeur attend la carte graphique : `renderer.render()` coûte 2 ms côté processeur, et l'image n'arrive pas pour autant.

### La glisse de caméra et le rendu

- Chaque navigation lance une glisse de 1 610 à 1 860 ms (un rendu complet à chaque image). À ×4, elle tourne à **15-17 images / s** vers `/salle/` et 14-33 vers `/verdict/`. En rendu léger, elle monte à 27-57 images / s.
- `renderer.render()` côté processeur : médiane de 12 à 33 ms par image à ×4 (9 à 17 ms en rendu léger), environ 2 ms à ×1.
- Le passage sans glisse (`instant`) remplace la glisse par **un seul rendu plus cher** : 65 à 130 ms à ×4, à cause du recalcul des ombres en fin de vue (`finVue` → `shadowMap.needsUpdate`). C'est pour cela que la tâche la plus longue ne disparaît pas sans le rendu léger.
- **Première ouverture** de la salle (page chargée jusqu'à la salle prête) : environ **13 s** à ×4 (three, matières, construction de la scène), contre 0,8 s pour le repli sans WebGL. Le gel au changement de page n'en dépend pas, car la salle est gardée d'une page à l'autre, mais c'est l'attente du premier écran.

### Données et calculs

- `matrice.json` en ligne : **218 040 octets** (45 Ko compressés) ; `votes.json` 43 754 (10 Ko) ; `deputes.json` 54 328 (13 Ko). Export local : 207 747 octets. 648 députés, 257 votes.
- `JSON.parse` de la matrice : 0,7 ms. `profil()` : 0,5 à 0,8 ms pour 3 à 40 réponses (Node, processeur normal), soit moins de 5 ms à ×4.
- Chaque page la recharge : réseau de 10 à 280 ms à ×4 depuis un serveur local, 4 à 5 ms à ×1. En ligne, Cloudflare Pages la sert avec `Cache-Control: public, max-age=0, must-revalidate` : **un aller-retour de revalidation à chaque page**. C'est du délai, pas du gel, mais le cache partagé du lot 1 le supprime.

### Le redimensionnement du canevas

- En allant vers `/tes-reponses/` (gabarit « lecture », salle en `display: none`), `redimensionner()` est appelée une fois en **0 × 0**. Elle sort aussitôt, sans réallocation.
- Au retour vers `/salle/`, elle est appelée une fois en **1 440 × 900**, la même taille qu'avant : `setSize` réalloue le tampon d'image et un rendu complet suit. Aucun autre appel sur le parcours.
- Constat plus coûteux : **la glisse de 1,6 s est jouée vers `/tes-reponses/` alors que la salle y est cachée** (environ 50 rendus de 20 ms pour rien).

### Le survol d'un siège (lancer de rayon, `siegeSous`)

- À ×4 : médiane de 0,6 à 2,7 ms selon le passage, maximum de 4,9 à 41,9 ms. À ×1 : médiane de 0,3 ms, maximum de 2,3 ms.
- Il est lancé au plus une fois par image, ce qui est acceptable aujourd'hui, mais au-dessus de la cible de 1 ms du lot 6 sur le matériel de référence.

## Les hypothèses

| H | Hypothèse (cadrage, § 2) | Verdict | Preuve |
| --- | --- | --- | --- |
| H1 | La glisse de caméra de 1,6 s avec rendu plein, à chaque navigation, occupe le fil principal ou la carte graphique pendant que la page charge | **Confirmée** | Sans glisse : tâches longues du parcours −49 %, « question suivante » à 0 ms au lieu de 526. Reste un rendu unique cher au point d'arrivée (ombres recalculées). La glisse est aussi jouée sur un canevas caché. |
| H2 | Le chargement et la lecture de `matrice.json`, puis le calcul du profil, à chaque page, créent de longues tâches | **Écartée** comme cause du gel | Lecture + profil < 5 ms à ×4 ; sans WebGL, 0 tâche longue à ×1. Reste un délai réseau (revalidation à chaque page), à supprimer au lot 1 sans en attendre de gain sur le gel. |
| H3 | Le canevas persistant est redimensionné (réallocation) quand le gabarit change | **Confirmée, mineure** | Un seul `setSize` à taille identique au retour d'une page « lecture », 0 sur les autres navigations. |
| H4 | La carte graphique intégrée ne tient pas 577 sièges instanciés, les ombres et l'antialiasing à pixel ratio 1,75 | **Confirmée** | Rendu léger : tâches longues −53 %, glisse de 15 à 30-55 images / s. À ×1, images figées jusqu'à 1,2 s alors que le processeur ne passe que 2 ms par rendu. Ici, pixel ratio 1,5 (densité de l'écran) : l'effet ne peut qu'être pire à 1,75. |

## Seuils retenus pour les lots suivants

Ils se mesurent avec `perf-navigation.mjs`, en médiane de 3 passages, sur ce même matériel (Iris Xe, 1 440 × 900, densité 1,5, CPU ×4 sauf mention contraire), et se comparent aux chiffres « aujourd'hui » ci-dessus.

| Mesure | Aujourd'hui | Seuil | Lot |
| --- | --- | --- | --- |
| Plus longue tâche, par navigation du parcours | 181 à 453 ms | **≤ 100 ms** sur chaque navigation (cadrage, R2) | 1 |
| Total des tâches longues du parcours (6 navigations) | 3 151 ms | ≤ 600 ms | 1 |
| Plus longue image pendant une navigation | 500 à 983 ms | ≤ 200 ms | 1 |
| Clic → page échangée (`astro:after-swap`), CPU ×1 | 115 ms | ≤ 50 ms (le site sans 3D fait 24 ms) | 1 |
| Glisse restante (`/salle/` ↔ `/ta-place/`, palier 0) | 15-17 images / s | ≥ 30 images / s | 1 |
| Rendu sur un canevas caché | 1 glisse complète | 0 rendu | 1 |
| Revalidation de `matrice.json` par page | 1 par page | 1 par visite | 1 |
| Vote du quiz : tâches longues (révélation + question suivante) | 802 + 526 ms | ≤ 100 ms au total, 0 contexte WebGL (prototype A) | 2-3 |
| Onde de couleur au dévoilement | 12 images / s | ≥ 30 images / s (cadrage, R1) | 2-3 |
| Survol d'un siège | médiane 0,6-2,7 ms, max 42 ms | < 1 ms en médiane, ≤ 4 ms au maximum (cadrage, R6) | 6 |

À noter pour le **gouverneur de qualité** du lot 1 (palier 1 si la médiane des 20 premières images dépasse 24 ms, palier 2 au-delà de 40 ms) : sur ce poste, une glisse à ×1 tourne vers 25-30 images / s (33 à 40 ms par image). Le gouverneur mettrait donc l'ordinateur de Julien en **palier 1**, et en palier 2 sous le ralentissement ×4 de la mesure. Le gouverneur doit se juger à processeur normal : le ralentissement ×4 sert aux seuils des tâches longues, pas au choix du palier.

## Ce que ce rapport ne dit pas

- Le téléphone n'est pas mesuré. Julien, peux-tu noter ici le modèle et le navigateur de ton téléphone Android ?
- L'origine fine des tâches longues de la version sans WebGL à ×4 (échange de page d'Astro, scripts des pages, décodage des images) n'est pas détaillée, car elles disparaissent à ×1. Un profil de l'onglet Performance les attribuerait si le lot 1 n'atteint pas ses seuils.
- Les chiffres varient fortement d'un passage à l'autre (charge de la machine, fréquence de la carte graphique). Ne conclure que sur des médianes.

## Lot 1 · après (30 octobre 2026, t84)

Même outil, même poste, même parcours. Médiane de 3 passages à CPU ×4, plus un passage à ×1. Depuis le lot 1, la variante « normal » laisse le **gouverneur de qualité** choisir le palier. `q0` et `q1` forcent le palier (`?qualite=0|1`), pour comparer à rendu égal.

### Ce qui a changé

- **Navigation** : coupure de caméra et fondu de 200 ms. La glisse ne reste qu'entre `/salle/` et `/ta-place/`, en 600 ms, au palier 0 seulement. Une page qui redemande la vue où l'on est déjà ne relance plus de glisse de 1,6 s ; c'était le cas de `/quiz/` (glisse de la tribune vers la tribune) et de `/ta-place/`.
- **Ombres** calculées une fois puis figées : elles ne sont plus recalculées à chaque changement de vue.
- **Matières, personnage compris, compilées au chargement** : la première image de `/salle/` coûtait jusqu'à 800 ms à ×4. Le personnage n'est plus reconstruit à chaque page.
- **Salle cachée sur les pages « lecture »** sans `display: none`, et à l'arrêt : aucun rendu. Tampon d'image réalloué seulement si la taille change ; rien n'est rendu quand l'onglet est en arrière-plan.
- **Gouverneur de qualité** : 20 images au chargement. Au-delà de 24 ms en médiane, palier 1 (pixel ratio 1) ; au-delà de 40 ms, palier 2 (pas de 3D). Sur ce poste, il choisit le palier 1 à ×4 et le palier 0 à ×1.
- **Données chargées une fois par visite** (`lib/matrice-cache.ts`). Le profil mémoïsé du cadrage n'est pas retenu : `profil()` coûte moins de 1 ms (voir plus haut), et le module faisait dépasser la marge de JavaScript initial sur 8 pages.

### Le parcours principal

| Variante (CPU ×4) | Tâches longues, total | Plus longue tâche (3 passages) | Navigations > 100 ms | Plus longue image | Clic → page échangée |
| --- | --- | --- | --- | --- | --- |
| Avant (lot 0) | 3 151 ms | 240 · 453 · 181 ms | 5 · 3 · 6 sur 6 | 500 à 983 ms | 92 à 104 ms |
| **Après, gouverneur (palier 1 ici)** | **132 ms** | 76 · 64 · 82 ms | **0 · 0 · 0** | **100 à 133 ms** | 61 à 66 ms |
| Après, palier 0 forcé | 258 ms | 74 · 63 · 74 ms | 0 · 0 · 0 | 633 à 650 ms | 53 à 61 ms |
| Après, palier 1 forcé | 130 ms | 65 · 65 · 72 ms | 0 · 0 · 0 | 100 à 133 ms | 51 à 61 ms |
| Sans WebGL | 57 ms | 57 · 52 · 62 ms | 0 · 0 · 0 | 83 ms | 61 à 69 ms |

À ×1 (palier 0 choisi par le gouverneur) : **0 tâche longue** (1 652 ms avant), clic → page échangée en **21 à 24 ms** (115 ms avant).

### Les seuils du lot 1

| Mesure | Avant | Après | Seuil | Tenu ? |
| --- | --- | --- | --- | --- |
| Plus longue tâche, par navigation | 181 à 453 ms | 63 à 82 ms | ≤ 100 ms | **oui**, à tous les paliers |
| Total des tâches longues du parcours | 3 151 ms | 132 ms (palier 0 : 258) | ≤ 600 ms | **oui** |
| Plus longue image pendant une navigation | 500 à 983 ms | 100 à 133 ms au palier 1 ; **550 à 650 ms au palier 0** | ≤ 200 ms | **au palier 1 seulement** |
| Clic → page échangée, CPU ×1 | 115 ms | 21 à 24 ms | ≤ 50 ms | **oui** |
| Glisse restante (`/salle/` ↔ `/ta-place/`) | 15-17 images / s | 57 à 61 images / s | ≥ 30 | **oui** |
| Rendu sur un canevas caché | 1 glisse complète | 0 rendu | 0 | **oui** |
| Revalidation de `matrice.json` | 1 par page | 1 par visite | 1 par visite | **oui** |

**Écart restant** : au palier 0, une seule image de 550 à 650 ms pendant la glisse de `/salle/` vers `/ta-place/` (et 217 à 300 ms pendant la glisse retour vers `/verdict/`), même à ×1. Aucune tâche longue ne l'accompagne : c'est la carte graphique qui bloque, à densité 1,5 avec antialiasing, au premier rendu de la vue « Ta place » après que le personnage s'est assis. L'origine exacte (ombres du personnage, vue rapprochée) reste à trouver. Au palier 1, choisi par le gouverneur sur ce poste à ×4, l'écart n'existe pas.

### En passant (lots 2-3)

Le vote du quiz profite déjà du lot 1. Au gouverneur, à ×4, une révélation passe de 802 à 107 ms de tâches longues et « question suivante » de 526 à 0 ms. À ×1, aucune tâche longue. Les glisses du vote restent en place jusqu'au lot 2.

**Première ouverture** de la salle (page chargée jusqu'à la salle prête, gouverneur compris) : 6,4 s à ×4 (13,1 s avant).

## Lot 2 · le dévoilement léger, prototypes A et B (31 octobre 2026, t85)

Les deux prototypes sont décrits dans `docs/decisions.md` (31 oct.) et `site/src/lib/revelation.ts`. Ils se testent sur `/quiz/?revelation=a` et `/quiz/?revelation=b`. Mesures faites avec `perf-navigation.mjs --quiz-seul --variantes=normal,a,b` (trois votes d'un visiteur neuf), même poste. Médiane de 3 passages à CPU ×4, plus un passage à ×1. « Aujourd'hui » est le quiz sans paramètre, avec les gains du lot 1.

| Mesure (CPU ×4) | Aujourd'hui | A · image fixe + calque 2D | B · 3D allégée |
| --- | --- | --- | --- |
| Clic sur « Voir la salle » → premier siège coloré, 1er vote | glisse de 1,6 s, puis l'onde | **172 ms** | **4 295 ms** (la 3D s'ouvre) |
| Idem, votes suivants | glisse de 1,6 s, puis l'onde | 15 ms | 52 ms |
| Tâches longues, 1er dévoilement | 61 ms | 189 ms (une de 124 ms : décodage de l'image) | **3 626 ms** (une de 3,2 s) |
| Plus longue image, 1er dévoilement | 83 ms | 117 ms | **3 267 ms** |
| Plus longue image, votes suivants | 350 ms | 17 ms | 50 ms |
| Images / s pendant l'onde | 42 | **60** | 39 |
| « Question suivante » | glisse de 1,6 s | coupure, 0 tâche longue | coupure, 0 tâche longue |
| Contexte WebGL créé | oui, dès la page | **aucun** | oui, au 1er dévoilement |
| JavaScript chargé sur la page | 611 Ko (three compris) | **47 Ko** | 614 Ko |

À ×1 : A, premier dévoilement en 78 ms puis 12 ms, onde à 60 images / s ; B, 2 547 ms puis 18 ms, onde à 48 images / s, et une image figée de 2 s au premier dévoilement.

**Les 577 sièges sont visibles** dans A et dans B, à 1 440 × 900, 1 280 × 650 et 390 × 844. Ce n'est pas le cas aujourd'hui, où la vue « La salle » coupe les côtés. Planches : `docs/design-vdef/planches/G1/`.

**Lecture** : A tient tous les critères de R1 (aucun WebGL, aucun mouvement, onde ≥ 30 images / s, JavaScript initial inchangé). B les tient pendant les questions et après le premier vote, mais son premier dévoilement fige la page 2 à 3 s, le temps d'ouvrir la 3D : c'est le point dur annoncé par le cadrage (« au moment du premier vote, quand la patience de l'utilisateur est la plus faible »). Les couleurs de B sont aussi moins franches : le velours rouge teinte le bleu vers le lavande. A a, en revanche, l'aspect d'une maquette vue de haut, et l'image ne suit pas la caméra : elle est posée telle quelle dans la zone libre.

## Lot 3 · le dévoilement A généralisé (31 octobre 2026, t86)

Porte G1 : Julien a retenu A. Le quiz, les lots, la séance et le verdict se dévoilent sur l'image fixe. Mesures sur le code final : même outil, parcours complet et 3 votes du quiz, médiane de 3 passages à CPU ×4, plus un passage à ×1.

| Mesure (CPU ×4) | Lot 1 (avant) | Lot 3 | Seuil |
| --- | --- | --- | --- |
| Tâches longues du parcours (6 navigations) | 132 ms | 120 à 201 ms | ≤ 600 ms |
| Plus longue tâche, par navigation | 64 à 82 ms | 61 à 93 ms | ≤ 100 ms |
| `/verdict/` : tâches longues à l'arrivée | 0 ms | 0 ms (152 à 184 ms avant le dernier correctif, voir plus bas) | ≤ 100 ms |
| Plus longue image pendant une navigation | 100 à 133 ms | 83 à 150 ms | ≤ 200 ms |
| Révélation : clic → premier siège coloré | glisse de 1,6 s | 49 à 57 ms, puis 8 à 14 ms | — |
| Révélation : tâches longues | 107 ms | 0 à 58 ms | ≤ 100 ms |
| Onde | 27-42 images / s | 60 images / s | ≥ 30 |
| WebGL sur les pages de vote | oui | **aucun** (quiz et verdict, aux 3 tailles) | aucun |
| JavaScript chargé sur le quiz | 611 Ko | **48 Ko** | — |

À ×1 : aucune tâche longue sur le parcours, clic → page échangée en 18 ms, révélation en 24 ms puis 11-12 ms. L'image figée de 550 à 650 ms à la glisse vers `/ta-place/` au palier 0 (lot 1) est toujours là (567 ms) : elle reste à traiter.

**Correctif trouvé par la mesure** : lire la couleur du coin de l'image fixe (`getImageData`) à chaque dévoilement forçait une relecture depuis la carte graphique ; à l'arrivée sur `/verdict/`, cela faisait une tâche de 152 à 184 ms à ×4. La couleur est maintenant fixée (`FOND_IMAGE`, relevée une fois sur l'image), ce qui a aussi réduit le premier dévoilement du quiz de 136-142 à 49-57 ms.

**« Ta place est prête »** (10e réponse du quiz) : la 3D s'ouvre à ce moment-là seulement (vérifié : la salle est « en attente » pendant les 10 questions, « prête » après « Voir ma place », personnage assis et repère posé). Avec `?qualite=2`, elle ne s'ouvre pas : l'image du dernier dévoilement reste, avec le repère sur la place.

## t92 · la nouvelle salle (2 novembre 2026)

Même outil et même poste (Iris Xe, 1 440 × 900, densité 1,5, CPU ×4), médiane de 3 passages, avant (`mvp-lot-6`) et après (`mvp-salle-def`), paliers forcés 0 et 1. Le build d'avant ne contient pas la nouvelle salle.

| Mesure | Avant, palier 0 / 1 | Après, palier 0 / 1 | Seuil |
| --- | --- | --- | --- |
| Tâches longues du parcours (6 navigations) | 538 / 299 ms | 396 / 304 ms | ≤ 600 ms |
| Plus longue tâche, par navigation | 124 / 101 ms | 92 / 70 ms | ≤ 100 ms |
| Plus longue image pendant une navigation | 167 / 150 ms | 200 / 117 ms | ≤ 200 ms |
| Rendu de `/salle/` au retour (appel de rendu, côté processeur) | 34 / 36 ms | 39 / 40 ms | — |
| Rendu de `/ta-place/` au palier 1 | 37 ms | 48 ms | — |
| Première ouverture de la 3D | 4 853 / 4 672 ms | 5 317 / 5 318 ms | — |
| Révélation : clic → premier siège, 1er vote (un seul passage) | 51 / 71 ms | 63 / 64 ms | — |
| Onde, 1er vote, images / s (un seul passage) | 55 / 65 | 59 / 55 | ≥ 30 |
| WebGL sur les pages de vote | aucun | aucun | aucun |
| JavaScript chargé sur le quiz | 50 Ko | 51 Ko | — |

Le passage Perspective ↔ Dessus n'existait pas sous cette forme (`scripts/perf-dessus.mjs`, un passage, palier 0) : à CPU ×1, 61 à 64 images / s, aucune tâche longue, rendu médian de 8 ms ; à CPU ×4, 43 à 44 images / s, plus longue image de 67 à 83 ms, tâches de 51 à 74 ms, ombres recalculées comprises. Le gouverneur garde la salle ouverte à CPU ×1 sur ce poste.

Poids : `public/salle3d` passe de 2,4 à 3,5 Mo au total. L'image du dévoilement fait 406 Ko sur ordinateur (2 000 × 1 400, contre 178 Ko) et 234 Ko au téléphone, plus son masque de 89 ou 65 Ko ; le mur du perchoir, 319 Ko (121 Ko au téléphone).

Limites : la plus longue image touche le seuil au palier 0. Ces chiffres lisent le temps d'appel et le rythme des images dans un navigateur sans écran, pas le temps réel de la carte graphique : douze lumières de plus peuvent peser davantage à l'écran. La mesure sur un vrai téléphone (palier léger : ni lustres, ni frise, ni statues) reste à faire par Julien. L'image figée de 550 à 650 ms vers `/ta-place/` n'apparaît pas dans ces passages (200 ms au plus), sans que la cause soit connue : à reconfirmer en recette. Survol (lot 6, seuil non visé ici) : médiane de 1,3 à 1,6 ms, contre 0,6 à 1,4 ms.

## Lot 6 · le survol en 2D (2 novembre 2026, t89)

Même outil, CPU ×4, palier 0, 3 passages. Survol (`siegeSous`, 60 mouvements) : médiane de 0,1 ms, au plus 1,4 à 2,9 ms (seuils : moins de 1 ms, 4 ms au plus ; avant, sur la nouvelle salle : 1,3 à 1,6 ms en médiane, 10 à 17 ms au plus). Tâches longues du parcours : 333 ms (seuil : 600 ms). Le nom apparaît 6 ms après le mouvement, à CPU ×1 (`scripts/survol.mjs`). Sans cette projection différée (120 ms après l'arrêt de la caméra), le premier survol montait de 6 à 9 ms.

## L'audit de la salle (3 novembre 2026)

Demande de Julien : repasser sur tout ce qui alourdit le chargement et la fluidité. Nouvel outil : `scripts/audit-salle.mjs` (`--retraits`). Il mesure pour la première fois le temps réel de la carte graphique (lecture d'un pixel juste après le rendu), que `salle:rendre` ne voit pas. Iris Xe, 1 440 × 900, densité 1,5, CPU ×1, vue « La salle ». Les retraits sont des mesures : ce sont eux qui ont décidé.

| Retiré, sur la salle de t92 | Carte graphique (46 ms au départ) |
| --- | --- |
| Toutes les lumières ponctuelles | 23 ms |
| Les 12 lumières des lustres seules | 30 ms |
| Tous les objets répétés (sièges, colonnes) | 31 ms |
| Densité 1 au lieu de 1,5 | 27 ms |
| Le vernis | 41 ms |
| Le relief | 44 ms |
| Anisotropie 2, ombres reçues | pas de gain |

| Mesure | Avant | Après |
| --- | --- | --- |
| Image, carte graphique, La salle | 46 ms | **23 ms** |
| Image, carte graphique, La tribune | 26 ms | **14 ms** |
| Image, carte graphique, vue des députés | 46 ms | **21 ms** |
| Image, processeur, CPU ×1 | 6 ms | **1,5 ms** |
| Appels de dessin | 901 | **51** |
| Triangles | 678 000 | **312 000** |
| Lumières | 21 | **9** |
| Compilation des matières, 1re ouverture | 2 465 ms | **897 ms** |
| Salle prête, 1re ouverture | 3,8 à 4,5 s | **2,6 s** |
| Plus longue tâche à l'ouverture, cache vide | 3,2 s | environ 1 s |

Ce qui a changé : les 12 lumières des lustres sont retirées, les ampoules restent et la coupole garde sa clarté par une émission légère ; les sièges passent de 384 à 96 triangles de velours, les voyants de 240 à une vingtaine, colonnes et bagues sont simplifiées ; 532 objets immobiles fusionnés par matière en 56 (`fusionnerImmobiles`, testé) ; plus de vernis sur le bois, plus de relief sur le velours et la moquette (deux textures en moins) ; densité plafonnée à 1,5 au lieu de 1,75 ; images décodées en tâche de fond ; matières compilées en tâche de fond. Le rendu a été comparé vue par vue. Images fixes régénérées.

Limites : Iris Xe seulement, navigateur sans écran. Le gain réel sur un téléphone reste à voir. Plus loin, il resterait surtout la densité (15 ms à densité 1), ce que fait déjà le palier 1.