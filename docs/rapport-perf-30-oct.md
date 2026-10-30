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
