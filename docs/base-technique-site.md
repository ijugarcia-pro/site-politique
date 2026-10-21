# Base technique du site · état au 20 octobre 2026

> Inventaire de ce qui est construit, rédigé pour préparer la refonte graphique. Il décrit le dépôt tel qu'il est sur `main` (commit `974adc5`). Objectif : changer l'apparence sans toucher à la mécanique (données, calculs, stockage, pipeline).

## 1. Vue d'ensemble

```
Open data AN + data.gouv ──► pipeline Python + DuckDB (GitHub Actions, chaque nuit)
                               │  ingestion → 11 tables → 6 contrôles → export JSON
                               ▼
                         export/site/*.json  (non versionné, régénéré à chaque build)
                               │
                               ▼
                         site Astro statique (calculé au build) ──► Cloudflare Pages
                               │                                    le578esiege.pages.dev
                               ▼
               navigateur du visiteur : réponses en localStorage, calculs d'accord,
               jumeau, précision ; rien n'est envoyé à un serveur
```

- **Coût : zéro euro.** GitHub Actions, Cloudflare Pages (offre gratuite), aucune API payante.
- **Aucune base de données en production.** DuckDB ne sert que pendant le build.
- **Un build en échec ne publie rien** : la dernière version en ligne reste en place.
- Supabase et Brevo sont prévus (comptes, alertes), mais **rien n'est encore branché** (t30 à t33 reportées).

## 2. Le pipeline de données (à ne pas toucher pour la refonte)

| Fichier | Rôle |
|---|---|
| `pipeline/sources.py` | Liste des sources : URL, producteur, licence, obligatoire ou facultative |
| `pipeline/telechargement.py`, `an.py` | Téléchargement avec reprises et anti-cache, lecture des JSON de l'AN |
| `pipeline/ingest.py` | Récupère seulement les sources qui ont changé (empreinte) |
| `pipeline/normalize.py` | 11 tables DuckDB : `depute, mandat, groupe, appartenance, scrutin, vote, position_groupe, dossier, etape, vote_prevu, contenu` ; reconstitue les absents |
| `pipeline/checks.py` | 6 contrôles : partition, totaux, effectifs, non-régression, schéma, fraîcheur |
| `pipeline/rattachement.py` | Lien scrutin → dossier législatif (fiable à 99,8 %) |
| `pipeline/etat.py` | Page « État des données » |
| `pipeline/export_site.py`, `export_deputes.py` | JSON du site : sièges, scrutins, matrice, députés, codes postaux, contours |
| `pipeline/semaine.py` | Choisit les 3 votes de la séance de la semaine dans l'agenda |
| `pipeline/cartes.py`, `vulgarisation.py` | Format des cartes de vote (12 thèmes) et 7 contrôles de vulgarisation |

**Workflows GitHub Actions** (`.github/workflows/`)
- `nuit.yml` : chaque nuit (6 h 11 UTC, avec deux horaires de secours) : ingestion → normalisation → contrôles → état → export → séance → build Astro → déploiement Cloudflare. Ouvre une issue si une source échoue plusieurs nuits de suite.
- `soiree.yml` : les soirs de semaine de 14 h à 22 h UTC, relance `nuit.yml` si un vote de la séance est prévu ce jour-là (pour que le verdict tombe le soir même).
- `delai-publication.yml` : mesure toutes les heures le délai de publication des scrutins (t03).
- `ci.yml` : à chaque push : `ruff`, `pytest`, `npm test`.

**Données versionnées choisies par Julien** : `data/quiz.json` (10 votes du quiz), `data/lots.json` (9 lots de 3 votes, dont 5 dans le parcours et 4 facultatifs), `data/reserve.json`, `data/seances/`, `data/semaines/`.

**Tests** : 144 tests pytest (pipeline) et 58 tests Node (`site/src/lib/*.test.ts`).

## 3. Le site (Astro 7, statique)

- `site/package.json` : trois dépendances seulement : `astro` 7.3.7, `@fontsource-variable/fredoka` et `@fontsource-variable/nunito` (polices servies par le site, aucun appel à Google).
- Aucun framework d'interface (ni React ni Vue), aucune bibliothèque CSS. Chaque page a un `<script>` en TypeScript qui importe les fonctions de `src/lib/`.
- `astro.config.mjs` : `site: https://le578esiege.pages.dev`, `trailingSlash: 'always'`, une page = un dossier.
- `src/lib/donnees.ts` lit les JSON de `export/` **au build** ; si un fichier manque, le build échoue.

### 3.1 Les pages

| URL | Fichier | Contenu | Mode |
|---|---|---|---|
| `/` | `pages/index.astro` | Accueil « Cette semaine » : ticket de séance (quiz, puis lot, puis séance), derniers verdicts, mini-hémicycle, ton député, série | onglets |
| `/quiz/` | `pages/quiz.astro` | Quiz d'entrée (10 votes) → révélation → résultat (place, jumeau, groupes proches) → 3 stories à partager | focus |
| `/lots/` | `pages/lots.astro` | Lots de 3 votes après le quiz, fin de lot (tampon, jauge, carnet), « Affiner encore » | focus |
| `/seance/` | `pages/seance.astro` | Séance de la semaine : « Vote avant eux » + pronostic facultatif, fin de séance (tampon, série, rendez-vous) | focus |
| `/verdict/` | `pages/verdict.astro` | Verdict de la séance : adopté/rejeté, marge, ton vote, pronostic, « Ta voix de 578e », député, jumeau | focus |
| `/hemicycle/` | `pages/hemicycle.astro` | Mon hémicycle : 577 sièges colorés selon l'accord, ta place, ton jumeau, groupes, liste de tes réponses | onglets |
| `/explorer/` | `pages/explorer.astro` | Recherche, votes qui divisent, plus serrés, tous les votes filtrables par famille | onglets |
| `/votes/{n}/` | `pages/votes/[numero].astro` | Page d'un vote : verdict, « Et toi ? », hémicycle filtrable, groupe par groupe, bascule, parcours du texte, sources | onglets |
| `/deputes/` | `pages/deputes/index.astro` | « Qui te représente ? » par code postal → commune → adresse ; annuaire | onglets |
| `/deputes/{PA…}/` | `pages/deputes/[uid].astro` | Fiche député : identité, groupe, participation, dissidences, ses votes face aux tiens | onglets |
| `/calcul/` | `pages/calcul.astro` | « Comment c'est calculé », avec un bouton qui efface toutes les données locales | onglets |
| `/etat/` | `pages/etat/index.astro` | État des données | onglets |
| `/mentions-legales/`, `/confidentialite/`, `404` | | Pages légales | onglets |

**Fichiers servis au navigateur** : `/donnees/matrice.json` (tous les votes de tous les députés, une lettre par vote), `/donnees/deputes.json`, `/donnees/cp/{xx}.json`, `/donnees/contours/{dep}.json`, `/etat/etat.json`, `/sitemap.xml`.

### 3.2 Les composants (`site/src/components/`)

| Composant | Rôle | Remarque pour la refonte |
|---|---|---|
| `Base.astro` (layout) | En-tête (logo, 3 onglets, recherche, anneau de précision, étoile), pied de page, balises SEO/partage, mode `focus` | Contient aussi un script commun : il reporte les réponses de séance et calcule l'anneau. À garder. |
| `Salle.astro` + `lib/salle.ts` | Grand hémicycle interactif (Mon hémicycle, quiz, verdict) : couleurs, repères, carte d'un siège, chiffre central | Géométrie dans `lib/hemicycle.ts` |
| `Hemicycle.astro` | Hémicycle d'un vote, SVG dessiné au build, navigable au clavier | Accessibilité déjà faite (flèches, tableau de repli) |
| `MiniHemicycle.astro` | Petit hémicycle statique pour une carte | |
| `Seance.astro` + `lib/seance.ts` | Le déroulé commun quiz / lots / séance : question, Pour / Contre / Je ne sais pas, révélation | Le plus gros composant (32 attributs `data-*`) |
| `EnteteSeance.astro` | Barre de progression du mode focus | |
| `JaugePrecision.astro` + `lib/jauge.ts` | Jauge animée, pastille « Fiable » à 25 votes | |
| `SerieGelee.astro` + `lib/gel.ts` | Série gelée pendant les vacances parlementaires | |
| `LigneVote.astro` | Un vote dans une liste (Explorer, accueil) | |

### 3.3 La logique dans le navigateur (`site/src/lib/`) : le cœur à préserver

Ces modules sont des **fonctions pures testées**. Ils ne contiennent aucun style. La refonte n'a aucune raison de les modifier.

- `profil.ts` : accord lissé `(m+2)/(n+4)`, classement, jumeau (toujours montré), précision `1 − e^(−n/20)`, seuil « fiable » à 25 votes, 4 niveaux de couleur de l'hémicycle personnel.
- `accord.ts` : taux d'accord brut avec un député.
- `votes.ts` : adopté/rejeté (accordé au féminin), marge, voix pour basculer (`P − R + 1` / `R − P`), « Ta voix de 578e », barres par groupe, familles de votes, recherche sans accents.
- `seances.ts` : état de la séance, pronostics, série, trêves, avancement du verdict, report des réponses une fois le vote tenu.
- `lots.ts` : progression dans les lots (parcours puis facultatifs).
- `geo.ts` : code postal → circonscription, point dans un polygone.
- `hemicycle.ts` : 577 sièges sur 13 rangées, parts des groupes, étiquettes, délai de l'onde.
- `motion.ts` : mouvement réduit, séquences passables d'un geste, déclenchement à l'affichage.
- `stories.ts` : les 3 stories (1080 × 1920) dessinées sur un canevas. **Couleurs et polices écrites dans le code : à reprendre si la charte change.**
- `couleurs.ts` : couleurs officielles des groupes (open data AN) et encre lisible (contraste WCAG).
- `themes.ts` : couleurs des puces des 12 thèmes. **À reprendre si la charte change.**
- `navigateur.ts` : accès protégé au localStorage.

### 3.4 Données gardées chez le visiteur (localStorage)

| Clé | Contenu |
|---|---|
| `578e.reponses.v1` | Réponses pour/contre par scrutin, avec leur date |
| `578e.depute.v1` | Le député choisi |
| `578e.quiz.v1` | Avancement du quiz |
| `578e.lots.v1` | Avancement des lots |
| `578e.seances.v1` | Séances, pronostics, série |
| `578e.verdicts-vus.v1` | Verdicts déjà révélés |

Pas de cookie ni de script de mesure. Le seul appel à un tiers est le géocodage de l'IGN (`data.geopf.fr`), et seulement quand le visiteur saisit une adresse. Le code postal passe par le fragment `#cp=`, jamais envoyé au serveur. **Ne pas renommer ces clés** : les visiteurs actuels perdraient leurs réponses.

> Écart repéré pendant cet inventaire : `578e.verdicts-vus.v1` n'apparaît ni dans le tableau de `/confidentialite/` ni dans le bouton d'effacement de `/calcul/` (`pages/calcul.astro:87`). Non corrigé.

## 4. Le design actuel (ce que la refonte remplace)

- **Jetons** : `site/src/styles/global.css` (178 lignes) contient les variables `:root` (`--violet`, `--pour`, `--contre`, `--abstention`, `--absent`, `--non-votant`, textes, gris, bords, fonds, `--rayon`, `--gouttiere`) et les classes communes : `.page`, `.carte` (bord 2 px et ombre décalée « 3D »), `.puce`, `.encart`, `.bouton`, tableaux, `.pastille-groupe`, `.visuellement-cache`.
- **Mouvement** : `site/src/styles/motion.css` contient les durées `--dur-*`, les courbes `--ease-*`, le compteur animé `.compte` et les keyframes `monte`, `tampon`, `ressort`, `trace`, `fondu`. Toutes ont une variante « mouvement réduit ». La spec est dans `docs/animations-lot-1.md`.
- **Styles par page** : chaque `.astro` a son bloc `<style>` scopé, soit environ 1 850 lignes de CSS au total. Les plus gros : `votes/[numero]` (304), `deputes/[uid]` (214), `Seance` (144), `explorer` (141), `deputes/index` (140), `index` (128), `Hemicycle` (112).
- **Responsive** : desktop d'abord. Points de rupture à 900 px (les onglets perdent leur texte) et à 640 px (la navigation passe en bas, en pleine largeur).
- **Accessibilité déjà en place** : lien d'évitement, `:focus-visible`, `aria-current`, hémicycles navigables au clavier, contrastes vérifiés (t36), `prefers-reduced-motion`.
- **SEO** : balises canonique, Open Graph et Twitter, JSON-LD par page, `sitemap.xml`, `robots.txt`.

## 5. Le contrat technique à respecter pendant la refonte

1. **Les attributs `data-*` sont le lien entre le HTML et les scripts.** Chaque page les retrouve avec `querySelector('[data-…]')`. Il y en a environ 280 au total, surtout dans `index`, `Seance`, `seance`, `hemicycle`, `quiz`, `deputes/*` et `lots`. On peut changer les balises, les classes et la mise en page, mais chaque `data-*` doit rester présent, sur un élément du bon type (bouton, lien, conteneur de texte…).
2. **Ne pas toucher à `src/lib/` ni à `pipeline/`**, sauf `stories.ts` et `themes.ts` pour les couleurs. `npm test` et `uv run pytest` doivent rester verts.
3. **Garder les textes réglementaires et neutres** : verdicts, « Ta voix de 578e », mentions « Résumé généré automatiquement… », pied de page des sources, « Aucun commentaire politique ».
4. **Garder les couleurs de vote distinctes et lisibles** : pour, contre, abstention, absent, non-votant. Garder aussi les couleurs officielles des groupes, qui doivent rester reconnaissables (retour de Julien).
5. **Garder les deux modes du layout** : onglets (3 onglets : Cette semaine · Mon hémicycle · Explorer) et focus (quiz, lots, séance, verdict).
6. **Polices** : servies localement par `@fontsource`. Une nouvelle police doit passer par le même chemin (paquet npm), sans appel à Google Fonts.
7. **Animations** : n'animer que `transform` et `opacity`, avec une variante « mouvement réduit » à chaque fois. Ne rien animer hors de l'écran au chargement.
8. **Décision fixée à mettre à jour** : `CLAUDE.md` fixe la « maquette V5 » comme direction visuelle. Une refonte la remplace : il faudra une entrée datée dans `docs/decisions.md` et la mise à jour de `CLAUDE.md` et de `docs/PLANNING.md` (nouvelle tâche ou nouveau lot).

## 6. Vérifier la refonte

```
cd site && npm ci && npm run dev     # http://localhost:4321 (il faut un export/ local : uv run python -m pipeline.export_site)
npm test                            # calculs du navigateur
npm run build                       # le build doit passer
```

Parcours à rejouer : nouveau visiteur (quiz → 5 lots), séance de la semaine, verdict, Mon hémicycle, une page de vote, la recherche par code postal, une fiche député. À tester à 390 px et sur ordinateur, avec et sans mouvement réduit.

## 7. Ce qui reste en cours (hors refonte)

- 2 branches cloud non fusionnées : `claude/explorer-deja-tranches` (filtre « À trancher / Tranchés » dans Explorer, « Ta place est fiable : N % ») et `claude/nice-brahmagupta-et3e6p` (« Verdict 1 sur 3 », bouton « Verdict suivant »). Les fusionner **avant** la refonte évitera des conflits sur `explorer.astro`, `verdict.astro`, `quiz.astro` et `seance.astro`.
- Tâches ouvertes du planning : t03, t11, t22, t23 à t26 (porte), phase 4 (vulgarisation hebdomadaire), t35, t46, phases 5 et 6.
