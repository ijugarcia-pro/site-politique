# Recette du MVP · Le 578e siège

> Lot 8 du cadrage (t91), 3 novembre 2026, branche `mvp-lot-8`, rien de poussé ni de fusionné. Contrôles sur l'export d'essai (données inventées), vraie carte graphique Iris Xe, navigateur sans écran. Captures : `docs/recette-mvp/`.

## Le verdict

Le parcours « première visite → quiz de 10 votes → ta place → salle → séance → verdict » se déroule de bout en bout sur ordinateur, petit portable et téléphone émulé, sans erreur de page et sans écran coupé (`scripts/recette.mjs`). Les seuils de mesure sont tenus, sauf deux réserves ci-dessous.

**Julien a validé le MVP et demandé la publication le 3 novembre 2026.** Aucune mesure n'a été faite sur un vrai téléphone ; le modèle et le navigateur restent à noter.

## Ce qui marche

| Sujet | Résultat | Contrôle |
| --- | --- | --- |
| Parcours complet, 3 appareils, à CPU ×1 et ×4 | aucun défaut | `recette.mjs` |
| 84 écrans, 12 tailles, 7 écrans | 0 défaut | `matrice-ecrans.mjs --gpu` |
| Vue des députés, 12 tailles | les 577 sièges à l'écran | `cadrage-haut.test.ts` |
| Calculs, géométrie, stockage | 142 tests verts | `npm test` |
| Attributs `data-*`, JavaScript initial | conformes (inventaire réenregistré) | `inventaire.test.mjs` |
| Polices, capitales | 0 faute sur 62 écrans | `typo.mjs` |
| Contrastes AA | 0 sous le seuil | `contrastes.mjs` |
| Souris, tiroir, immersion | verts | `souris.mjs`, `tiroir.mjs` |
| Survol, carte, doigt | verts | `survol.mjs` |
| Aucun jumeau sous 10 votes | vert, dossiers compris | `seuil-jumeau.mjs` |
| Étiquettes sans recouvrement | vert | `etiquettes.mjs` |
| WebGL sur les pages de vote | aucun | `perf-navigation.mjs` |
| Style Python | vert | `ruff` |

## Les mesures (CPU ×4, 3 passages, en alternance avec le build d'avant)

| Mesure | Avant (palier 0) | Après (palier 0 / 1) | Seuil |
| --- | --- | --- | --- |
| Tâches longues du parcours | 282 ms | 243 / 201 ms | ≤ 600 ms |
| Plus longue tâche par navigation | 75 ms | 82 / 79 ms | ≤ 100 ms |
| Plus longue image par navigation | 133 ms | **767** / 100 ms | ≤ 200 ms |
| Temps de rendu au retour sur `/salle/` | 38 ms | 10 / 25 ms | — |
| Survol d'un siège | 1,3 ms (max 18) | 0,1 ms (max 3) | < 1 ms (max 4) |
| Onde du dévoilement | 56 à 60 images / s | 53 à 62 images / s | ≥ 30 |
| Vers la vue des députés | — | 65 images / s, aucune tâche longue | ≥ 30 |

« Avant » est le build de `mvp-lot-6`, avec l'ancienne salle : la nouvelle salle, plus riche, ne coûte pas plus cher. Le détail de l'allègement est dans `docs/rapport-perf-30-oct.md`, § « L'audit de la salle ».

## Les écarts et ce qui reste

1. **L'image figée vers `/ta-place/`, au palier 0 (767 ms en médiane, seuil 200 ms).** C'est la dette du lot 1, toujours présente. Elle survient juste après la glisse, quand plus rien ne bouge : aucun script, aucune tâche longue, aucun rendu demandé. Elle disparaît sans la glisse. La cause n'est pas prouvée : elle peut tenir au navigateur sans écran. **À vérifier par Julien à l'œil.** Si elle se voit, couper cette glisse règle le problème, mais c'est une décision.
2. **L'ouverture de la 3D fige la page une fois**, de 0,8 à 1,3 s selon la charge du poste (une tâche, à la première ouverture seulement). Elle allait jusqu'à 3,2 s avant la compilation en tâche de fond.
3. **Pas de mesure sur un vrai téléphone.** Pincement et toucher sont vérifiés par des événements simulés. Modèle et navigateur restent à noter dans le rapport de performance.
4. **`uv run pytest`** : 146 tests verts en 18 s. Aucun fichier du pipeline n'a changé.
5. **Responsive** : le cadrage tient sur la matrice, mais des écrans restent à soigner, notamment le téléphone en paysage (844 × 390), où la salle du dévoilement est petite. C'est le chantier suivant, demandé par Julien (t93).
6. **La glisse de 1,4 s** vers la vue des députés : le cadrage demandait 600 ms ou moins, Julien jugera après ses tests.
7. **Clavier** : dans la vue des députés, les flèches déplacent la salle, pas la sélection (P2 du cadrage, non fait). « Trouver un député » reste le chemin principal au clavier.
8. **La porte t82** n'a jamais été cochée : c'est à Julien de le faire.
9. **Le kit de captures du portfolio** peut se préparer : la recette est validée.

## Les questions et les portes

- G1 (image fixe, A) et G2 (nouvelle salle) : franchies. Q1 à Q4 : tranchées ; Q2 est remplacée par « Voir les députés ».
- **Q5** (la marche du personnage) : Julien n'a pas répondu, la recommandation a été suivie. À lui signaler.
- Hors périmètre, non traités : le « Concrètement » du vote sur les réseaux sociaux, le champ de précision, la formule du verdict, les points juridiques (t35), les comptes et alertes (t30 à t33), l'audience (t46), le lancement (t40, t41).

## La mise en ligne (avec l'accord de Julien)

Une seule PR de `mvp-lot-8` vers `main` : elle contient toute la pile, garde un commit par lot et ferme la PR #64, sans publier d'états intermédiaires. Le pipeline publie à la fusion. Vérifier ensuite https://le578esiege.pages.dev.
