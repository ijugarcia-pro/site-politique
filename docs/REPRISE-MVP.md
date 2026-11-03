# Reprise du MVP · Le 578e siège

> Écrit le 2 novembre 2026 pour une nouvelle session Claude Code, à lire après `CLAUDE.md`, `docs/decisions.md` et `docs/PLANNING.md`. Il dit où en sont les lots et ce qui reste à faire pour finir le MVP. Les fiches détaillées restent au § 6 de `docs/cadrage-mvp-retours-test-578e.md` ; les mesures, dans `docs/rapport-perf-30-oct.md`.

## L'objectif, dans l'ordre

1. **La nouvelle salle 3D** : intégrer la maquette conçue avec Claude Design, qui favorise la vue du dessus (tâche t92).
2. **La fin du MVP** : le reste du lot 6, le lot 7, puis la recette du lot 8 (t89, t90, t91).
3. **La mise en ligne** : fusionner la pile de branches dans `main`.

Le MVP est fini quand le parcours « première visite → quiz de 10 votes → ta place → salle → séance → verdict » se déroule sans gel ni écran coupé sur ordinateur et téléphone, mesures sous les seuils, et que Julien a validé sur son téléphone. Rien d'autre n'entre dans ce périmètre (voir « Hors périmètre »).

## Où en sont les lots

| Tâche | Lot | État | Où |
| --- | --- | --- | --- |
| t83 | 0 · Mesurer le gel | Fait | `main` (PR #63) |
| t84 | 1 · Navigation sans gel | Fait | `mvp-lot-1`, [PR #64](https://github.com/ijugarcia-pro/site-politique/pull/64) ouverte, non fusionnée |
| t85 | 2 · Prototypes du dévoilement | Fait, porte G1 franchie : **A retenu** | `mvp-lot-2`, local |
| t86 | 3 · Dévoilement sur image fixe, partout | Fait | `mvp-lot-3`, local |
| t87 | 4 · Cadre et responsive | Fait | `mvp-lot-4`, local |
| t88 | 5 · Tiroir mobile et immersion | Fait | `mvp-lot-5`, local |
| t92 | Nouvelle salle 3D, vue du dessus | Fait, porte G2 franchie | `mvp-salle-def`, local |
| t89 | 6 · Dessus, survol, carte, sélection | Fait | `mvp-lot-6` et `mvp-lot-6-suite`, local |
| t90 | 7 · Étiquettes et seuil des 10 votes | Fait | `mvp-lot-7`, local |
| t91 | 8 · Recette finale | Fait, validé par Julien le 3 nov. : `docs/recette-mvp.md` | `mvp-lot-8` |
| t93 | Responsive | À faire, demandée par Julien après le MVP | |

Les branches sont **empilées** : `main` → `mvp-lot-1` → … → `mvp-lot-6` → `mvp-salle-def` → `mvp-lot-6-suite` → `mvp-lot-7` → `mvp-lot-8`. Continuer dans la même pile, et ne rien pousser ni fusionner sans l'accord de Julien.

`git status` montre trois restes sans importance, à ne pas commiter : `.claude/launch.json` et les anciens prompts `docs/PROMPT-JUMEAU-CAMERAS.md` et `docs/PROMPT-VDEF.local.md`.

> **État au 3 nov. 2026.** Ce document a servi à reprendre le 2 nov. Depuis : porte G2 validée, lots 6, 7 et 8 livrés, « Voir les députés » et salle allégée. Pour la suite, lire d'abord `docs/recette-mvp.md` (ce qui reste) et la fin de `docs/decisions.md`. Le serveur local (port 4321) sert `site/dist` : reconstruire avec `npx astro build` depuis `site/` pour que Julien voie un changement.

## Les décisions de Julien (déjà prises, à ne pas rouvrir)

- **Porte G1** : le dévoilement se fait sur une image fixe, sièges peints en 2D (A). Aucune 3D ni three sur le quiz, les lots, la séance et le verdict.
- **Q2** : remplacée le 2 nov. : `/salle/` est en perspective partout, « Voir les députés » passe en vue du dessus.
- **Q3** : à égalité parfaite, l'opposé est pris dans un autre groupe que le jumeau, avant l'ordre alphabétique. Aucun classement ne change.
- **Q4** : sous 10 votes, aucun jumeau ni opposé **nulle part**, avec la phrase « À 10 votes, ton jumeau et ton opposé apparaissent · N / 10 ».
- **Q5** : Julien n'a pas répondu ; la recommandation du cadrage a été suivie (la marche du personnage reste, la 3D se charge à la demande, repli statique). Lui signaler en recette.
- **Porte G2, retour de Julien du 2 nov.** : la vue du dessus est **essentielle, car c'est la vue du résultat d'un vote**. Le marbre qui s'étend vers le vide casse l'immersion, et on est trop loin des sièges. Un voile noir posé autour de l'hémicycle a été essayé et **rejeté : ce n'est pas beau**. Ne pas y revenir. Il est gardé pour mémoire sur la branche `mvp-voile-rejete`, à ne pas fusionner.

## Phase 1 · La nouvelle salle (t92)

Le travail de Claude Design est dans `docs/design-salle-dessus/` (repris de l'artefact « La salle du 578e siège » le 2 nov. 2026). Ne pas inventer un rendu à sa place.

**À garder absolument**
- Le siège n° i reste celui de la composition : `sieges3D()` et `position()` (`site/src/salle3d/geometrie.ts`) partent du plan 2D `lib/hemicycle.ts`. Tout (votes, repères, personnage, images) en dépend. Si la géométrie des sièges bouge, tout ce qui suit doit bouger avec elle.
- Les vues « La tribune », « La salle » et « Ta place » doivent rester belles : la salle est aussi vue de l'intérieur. La vue du dessus ne doit pas les dégrader.
- La légèreté : les seuils du rapport de performance restent à tenir, sur carte graphique intégrée et sur téléphone.
- Les contraintes de CLAUDE.md : palette, polices, couleurs de vote, neutralité.

**Ce que la vue du dessus alimente aujourd'hui**
- `site/src/salle3d/cadrage-haut.ts` : un seul point de vue, `DESSUS`, pour `/salle/` et le dévoilement, sa hauteur calculée pour tenir la zone visible, `FORMATS_DEVOILEMENT`, `positionsDevoilement` (les sièges posés sur l'image, au build).
- `site/src/salle3d/scene.ts` : vue `dessus`, `vueFixe`, plafond sur le calque 1 (three calcule les ombres avec les calques de la caméra de vue : `masquerPlafond` demande `shadowMap.needsUpdate`), `cadrageAjuste`, `eclairage`, `masqueSieges`. `salle3d/decor.ts` : le décor.
- `site/src/lib/revelation.ts` : l'image fixe, le calque 2D (`multiply` : **les sièges de l'image doivent rester clairs et neutres**), le masque des sièges, les repères, `FOND_IMAGE`.
- `site/scripts/images-fixes.mjs` : à relancer sur la vraie carte graphique. Par défaut `fond-revelation` et son masque ; `--vues=fond-tribune,fond-salle` pour les fonds, à régénérer aussi si la salle change. Les formats doivent rester ceux de `FORMATS_DEVOILEMENT`.
- `site/src/salle3d/projection.ts` (stories, fiche député) et les tests `geometrie`, `vue-place`, `projection`, `cadrage-haut`, `cadrage-ajuste`, `personnage`.

**Fin de la phase : porte G2**
Montrer à Julien `scripts/planche-dessus.mjs` (Perspective et Dessus) et `scripts/planche-revelation.mjs` (dévoilement et verdict), à 1 440 × 900, 1 280 × 650 et 390 × 844, plus les mesures. **Julien valide lui-même. Ne pas passer la porte à sa place.** Consigner la décision dans `docs/decisions.md` (y compris le § 9, point 1, du cadrage).

## Phase 2 · La fin du MVP

**t89, reste du lot 6** (fiche : cadrage, § 6 ; critères R5, R6, R7)
1. Test 2D du siège visé à la place du lancer de rayon (`siegeSous`, `pilote.ts`), mis en cache par changement de caméra, testé. Cible : moins de 1 ms en médiane (aujourd'hui 0,6 à 2,7 ms, pics à 42 ms à CPU ×4). Consigner le § 9, point 7.
2. Siège survolé en blanc (`teinter`) avec un anneau fin ; siège choisi avec un anneau plein.
3. Carte au survol dans l'espace libre à droite : nom, groupe, « a voté comme toi sur X de tes N », « Voir sa fiche », épinglée au clic, `aria-live` temporisé ; dans le tiroir au téléphone.
4. Au doigt, en Dessus : pincement et déplacement, siège le plus proche dans 22 px, un siège voulu en deux gestes au plus à 390 × 844. Le canevas a déjà `touch-action: none`.
5. Flèches de siège en siège en Dessus (facultatif, P2). Masquer aussi l'indice « Glisse pour tourner » en Dessus, où la caméra ne tourne pas.

**t90, lot 7** (critères R8, R9)
1. `site/src/salle3d/etiquettes.ts` : `placerEtiquettes`, fonction pure testée sur 200 tirages, deux cadres ; fils ; étiquette groupée si deux points sont à moins de 30 px ; priorité Toi > jumeau > opposé > député ; libellés raccourcis.
2. Seuil des 10 votes partout (Q4) : `salle`, `verdict`, tribune, `stories`, `tes-reponses`, `parcours`, et aussi `quiz`, `ta-place`, `dossiers/[theme]`, `votes/[numero]`, qui lisent le jumeau ou l'opposé ; un test garde la règle. Consigner le § 9, point 4.
3. Départage de l'opposé (Q3) dans `lib/profil.ts`, testé ; entrée dans `decisions.md` (§ 9, point 5) et ligne « Jumeau » de `CLAUDE.md`. **Ne pas toucher au classement du jumeau.**

**t91, lot 8 · recette**
- Parcours complet sur toute la matrice (`scripts/matrice-ecrans.mjs --gpu`), mesures finales (`scripts/perf-navigation.mjs`, 3 passages), tous les gardes-fous.
- Documents : `decisions.md`, addendum de `design-vdef/VDEF.md`, `CLAUDE.md` (la phrase « on se déplace dans la salle en 3D » et le « 2D, repli sans WebGL » ne décrivent plus le dévoilement), `PLANNING.md`, `docs/recette-mvp.md` (ce qui marche, ce qui reste, les écarts).
- Le kit de captures du portfolio se prépare seulement après la recette.

**Les dettes connues, à solder en recette**
- Au palier 0, une image figée de 550 à 650 ms pendant la glisse de `/salle/` vers `/ta-place/` (carte graphique, sans tâche longue ; seuil : 200 ms). Cause non trouvée. À retester sur la nouvelle salle.
- Rien n'a été mesuré ni touché sur un vrai téléphone. Julien doit tester les gestes, et noter le modèle et le navigateur dans le rapport de performance.
- `uv run pytest` : relancé le 3 nov., 146 tests verts en 18 s.
- La porte t82 n'a jamais été cochée, alors que la PR VDEF est fusionnée ; les retours de test du 30 oct. en tiennent lieu. C'est à Julien de la cocher.
- Profil mémoïsé du lot 1 écarté (décision du 30 oct.) ; `perf-navigation.mjs` garde des marques `?perf=` inactives par défaut.

**La mise en ligne** (accord de Julien du 3 nov. : une seule PR de `mvp-lot-8` vers `main`, qui contient toute la pile et ferme la PR #64, pour ne pas publier d'états intermédiaires)
Autrefois prévu : fusionner la PR #64, pousser la suite de la pile et ouvrir les PR dans l'ordre. Le pipeline publie le site à chaque fusion sur `main`. Vérifier ensuite https://vote-assemblee.pages.dev.

## Hors périmètre

La formulation du « Concrètement » du vote sur les réseaux sociaux (7 contrôles de vulgarisation, avec Julien), le champ de précision, la formule du verdict, les points juridiques (t35), les comptes et les alertes (t30 à t33), la mesure d'audience (t46), le lancement (t40, t41). Le signaler si besoin, ne pas le traiter.

## Les gardes-fous, et les pièges de ce poste

Depuis `site/`, dans le dossier temporaire de la session (`S`) :

```bash
npm test
```

```bash
EXPORT_DIR=$S/export-essai npx astro build --outDir $S/dist-essai
```

L'export d'essai se crée à la racine du dépôt avec `uv run python -m scripts.export_essai $S/export-essai`. L'inventaire se compare **à ce build**, pas à l'export réel :

```bash
INVENTAIRE_DIST=$S/dist-essai node --test tests/inventaire.test.mjs
```

Puis `node scripts/typo.mjs $S/dist-essai`, `node scripts/contrastes.mjs $S/dist-essai`, `node scripts/souris.mjs $S/dist-essai --gpu`, `node scripts/tiroir.mjs <sortie> <build>`, `node scripts/matrice-ecrans.mjs <sortie> <build> --gpu`, et `uv run ruff check .` à la racine.

- **`uv`** n'est pas dans le PATH : `/c/Users/jucon/AppData/Roaming/Python/Python313/Scripts/uv.exe`.
- **Réenregistrer l'inventaire** (`node scripts/inventaire.mjs enregistrer <build>`) écrit deux fichiers : `site/tests/inventaire-data.json` **et `data/mesures/poids-site.json`**. Commiter les deux. Lister les changements dans le commit ; seulement si le lot change des `data-*`.
- **Mesures** : médiane de 3 passages, jamais pendant un autre calcul. Après un passage interrompu, tuer les `chrome-headless-shell` orphelins, qui faussent tout. `--gpu` partout : en WebGL logiciel, une image prend plus de 15 s.
- **Fins de ligne** : les fichiers mélangent CRLF et LF. Pour plusieurs remplacements, un script `.cjs` dans le dossier temporaire qui normalise puis restaure, ou l'outil d'édition. Éviter les gros `node -e` et les heredocs du shell, souvent cassés par les apostrophes.
- **Un seul dossier** : jamais de worktree. Si une autre session tourne (`ListAgents`), ne pas changer de branche.
- **Stockage** : aucune nouvelle clé. L'état d'interface vit en mémoire.
- **Commits** : un par lot, avec une ligne « Réalisé » dans le planning. Terminer chaque lot par un résumé de 10 lignes, et s'arrêter à chaque porte.
