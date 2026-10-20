# Design définitif · « La Séance »

Rédigé le 20 octobre 2026, après comparaison des captures du site (`captures-la-seance/`, 31 écrans × 2 formats) avec les maquettes validées (page « V6 · C · La Séance » du canvas https://claude.ai/artifact/1VD3vDVnxpncGnMrNA6Lg9) et le design system « Le 578e siège · La Séance » (https://claude.ai/artifact/4i8ZqFLTaEVLJJgZGhHhMM).

**But** : que le site ressemble aux maquettes. Les lots 0 à 6 ont posé la mécanique (3D, personnage, thèmes, inventaire des `data-*`) ; ils sont bons. Ce qui manque, c'est l'**application** de la charte : les jetons de couleur sont justes dans `global.css`, mais la typographie, la mise en page et la lumière de la salle trahissent les maquettes.

**Ordre de priorité**
1. Le contrat de `docs/refonte-la-seance.md` § 2 (mécanique, `data-*`, localStorage, neutralité, accessibilité, zéro euro) et ses écarts décidés § 8 : inchangés, ils priment.
2. Pour tout ce qui se voit : **les maquettes V6C priment**, puis ce fichier, puis le design system.
3. Là où les maquettes ne disent rien (Explorer, page d'un vote, députés, pages légales, quiz, lots), on applique les règles du § 2 ci-dessous avec les composants des maquettes. On n'invente pas de nouveau composant.

## 0. Fichiers de référence (ce dossier)

| Chemin | Contenu |
|---|---|
| `maquettes/V6C-0x-*.png` | Rendu des 6 maquettes (1440 px et 390 px), avec les vraies polices. C'est la cible. |
| `maquettes/V6C-0x-*.html` | Les mêmes maquettes mises à plat en HTML statique : **tous les styles sont en ligne**, on peut y lire chaque taille, graisse, couleur, marge. Ouvrables dans un navigateur (polices Google Fonts ici, uniquement parce que ce sont des références non servies). `V6C-02-Vote.html` montre l'état « Pour choisi, pronostic visible ». |
| `maquettes/images/*.jpg` | Les fonds des maquettes : rendus du prototype 3D (`docs/salle-3d/room.js`) sur une vraie carte graphique. Ce sont les références de couleur de la salle (§ 6). |
| `comparaisons/*.jpg` | Site actuel à gauche, maquette à droite, pour 6 écrans. |

Ne pas servir ces fichiers, ne pas les importer dans `site/`.

## 1. Diagnostic : ce qui s'écarte des maquettes

Constaté sur les captures du 20 octobre (noms entre parenthèses).

1. **La salle est dans une boîte.** Accueil, verdict, Mon hémicycle (01, 02, 16, 19) : la 3D est une vignette à bords arrondis au milieu d'une page de cartes. Dans les maquettes, la salle est **plein cadre, bord à bord**, sous l'en-tête translucide, et tout le reste (bandeau, programme, compteurs, panneaux) est **posé dessus**. C'est l'écart le plus visible : il fait passer le site de « régie de retransmission » à « tableau de bord ».
2. **Le mode focus est noyé dans le noir.** Quiz, lots, séance (05, 09, 12, 13) : l'image fixe de la tribune est recouverte d'un voile à 80-93 % (`Seance.astro`, `body.focus::before`) ; on ne voit plus la salle. La maquette V6C-02 montre la tribune nette à gauche, assombrie seulement derrière le panneau de droite (dégradé horizontal 15 % → 25 % → 82 %).
3. **Barlow Condensed partout, Literata presque nulle part.** `--police-titre` est utilisée 162 fois dans les composants, `--police-question` 2 fois. Résultat : les intitulés de lois, les titres des derniers verdicts, les listes d'Explorer, la page d'un vote, les noms des députés, les réponses de « Tes réponses » sont en condensé gras **en bas de casse**, serré et dur à lire (02, 22, 23, 26). Dans les maquettes, **le condensé n'apparaît qu'en capitales** (régie) et **tout texte de loi ou question est en Literata 500**.
4. **Graisses et tailles trop lourdes.** `h1` en condensé 700 en bas de casse, `h2` en capitales partout dans `main`, titres de cartes en condensé 20 px (« Ton hémicycle », « Ton député », 02) : la page crie. Les maquettes réservent le 700 au mot du moment (ADOPTÉ, titres de section courts) et laissent le reste respirer.
5. **La « lumière » (#F2C98A) est partout, et elle dore toute la page.** Points d'accord de l'hémicycle en dégradé brun-or (`--accord-1..3`, 07, 14, 19), barres de précision, surtitres « Ta place », « Ton jumeau », bordure de l'encart, carnet de séance… Le design system la réserve à **toi** (ton siège, ta cote, ta précision). Combinée à la salle trop orangée (point 6), elle donne l'impression d'une charte « sépia » qui n'est pas celle des maquettes.
6. **La salle 3D est orangée.** Comparer `comparaisons/01-accueil.jpg` : dans les maquettes, marbre et colonnes sont blanc cassé, les murs crème, le velours rouge franc ; sur le site, tout tire vers l'orange brûlé. Cause probable (à vérifier, § 6) : three récent active la gestion des couleurs par défaut (`ColorManagement.enabled`), si bien que les couleurs hexadécimales des lumières, du brouillard et des matières, réglées à l'œil dans r128, sont maintenant converties en linéaire, donc plus saturées et plus chaudes.
7. **Composants hors charte.** Capsules ivoire arrondies « ADOPTÉ · 276-86 » (02), puces de thème arrondies, cartes à bordure + ombre + coins de 6 px empilées en grille, encart à liseré gauche (AI-trope), cercles-initiales « CM » : rien de tout cela n'est dans les maquettes. Les maquettes utilisent des **aplats juxtaposés séparés de 2 px** (`gap: 2px`, sans bordure), des bandeaux à coins vifs, et le rayon de 6 px seulement pour le panneau de vote et les boutons de vote.
8. **Puces caméra mal composées.** « CAM 1  · SALLE » avec un double espace (02, 16, 19) ; sur téléphone, les puces sont sous le bandeau dans la vignette. Maquette : « Cam 1 · Salle » en une seule chaîne, en haut à droite sur ordinateur (`top: 96px; right: 32px`), en bas de la salle au-dessus du panneau sur téléphone.
9. **Téléphone : une pile de cartes.** Accueil et Mon hémicycle (téléphone 02, 21) sont des empilements de 8 à 10 cartes. Maquettes V6C-05 / 06 : la salle occupe le haut de l'écran (environ 40 % pour le vote, tout l'écran pour Mon hémicycle), le contenu monte en **feuille** depuis le bas, la navigation est fixée en bas.
10. **Personnage dans le flux.** Le réglage du personnage (peau, coiffure, tenue) occupe un grand panneau permanent de Mon hémicycle (19). Il doit passer dans un panneau repliable (ou une feuille) ouvert par un bouton « Ton personnage », pour que la salle et les chiffres dominent.

## 2. Les règles du design définitif

1. **La salle est l'écran.** Sur l'accueil, le verdict et Mon hémicycle, la première section est une « scène » plein cadre (pas de marge latérale, pas de coins arrondis, pas de bordure) ; l'en-tête est posé dessus. En mode focus, l'image fixe de la tribune est visible.
2. **Deux familles de texte, pas trois rôles mélangés.**
   - Régie = Barlow Condensed **toujours en capitales** (`text-transform: uppercase`) : bandeaux, puces, onglets, surtitres, libellés de compteurs, boutons, mot du moment, titres de section **courts** (4 mots maximum).
   - Lecture = Literata 500 : toute question, tout intitulé de loi ou de vote, « Et maintenant », la phrase-clé d'un panneau.
   - Interface = Barlow 400/500 : texte courant, légendes, métadonnées, noms propres dans une phrase.
   - **Interdit** : Barlow Condensed en bas de casse ; un intitulé de loi en condensé ; Literata en capitales.
3. **Couleurs par rôle, jamais par décor.** `direct` = bandeau, onglet actif, action principale (une seule par écran). `lumiere` = toi uniquement. `ivoire` / `ivoire-2` = texte. `vote-*` = votes uniquement. Tout le reste est `nuit`, `panneau`, `panneau-2`, `filet`.
4. **Aplats juxtaposés.** Les ensembles de blocs (programme 01-02-03, derniers verdicts, panneaux du verdict, stats) sont des grilles d'aplats `panneau` / `panneau-2` séparés par `gap: 2px`, sans bordure, sans ombre, sans rayon. L'ombre `ombre-panneau` et le rayon de 6 px sont réservés au **panneau posé sur la salle** (vote, Mon hémicycle).
5. **Coins vifs pour la régie.** Bandeaux, boutons d'action (« Commencer la séance », « Vote suivant »), étiquettes de thème : `border-radius: 0`. 999 px seulement pour les puces caméra. 6 px seulement pour le panneau de vote et les boutons de vote.
6. **Neutralité** (inchangée) : Pour, Contre, Je ne sais pas identiques ; ADOPTÉ et REJETÉ identiques.

## 3. Typographie : chaque usage, une seule réponse

Valeurs relevées dans les maquettes (fichiers HTML de `maquettes/`). Créer ces classes utilitaires dans `global.css` et les utiliser partout, à la place des `font:` dispersés dans les composants.

| Classe | Usage | Valeur |
|---|---|---|
| `.t-ecran` | ADOPTÉ / REJETÉ en grand (verdict) | Barlow Condensed 700, 176px / 0.82 sur ordinateur (`clamp(88px, 12vw, 176px)`), capitales, `letter-spacing: -0.005em`, `text-shadow: 0 4px 30px rgba(0,0,0,.5)` sur la salle |
| `.t-mot` | ADOPTÉ / REJETÉ dans une liste ; « Tu as voté pour » | Barlow Condensed 700, 38px / 1 (liste) ou 30px / 1 (panneau), capitales |
| `.t-section` | Titre de section (« La semaine dernière ») | Barlow Condensed 700, 32px / 1, capitales |
| `.t-bandeau` | Titre de bandeau | Barlow Condensed 600, 34px / 1.05 (accueil), 30px (verdict), 26px (vote), capitales, `letter-spacing: .01em` ; 22px / 26px sous 640 px |
| `.t-compteur` | Totaux d'un scrutin | Barlow Condensed 600, 84px / 0.85, `tabular-nums` ; 56px sous 640 px |
| `.t-numero` | 01, 02, 03 du programme | Barlow Condensed 600, 44px / 0.9, `ivoire-2`, `tabular-nums` |
| `.t-puce` | Puces, surtitres, libellés, onglets | Barlow Condensed 600, 13px / 16px, capitales, `letter-spacing: .12em`, `ivoire-2` (ou `ivoire` si actif) ; onglets : 15px, `.1em` |
| `.t-bouton` | Boutons d'action | Barlow Condensed 600, 18px / 1 (principal) ou 15px (secondaire), capitales, `letter-spacing: .08em` |
| `.t-vote` | Libellé des boutons de vote | Barlow Condensed 600, 21px / 1, capitales, `letter-spacing: .03em` (17px pour un bouton réduit) |
| `.t-question` | Question du panneau de vote, `h1` des pages de vote | Literata 500, 34px / 1.2, `text-wrap: balance` ; 26px / 1.25 sous 640 px |
| `.t-loi` | Intitulé dans une liste ou une tuile (programme, derniers verdicts, Explorer, fiche député, « Tes réponses ») | Literata 500, 18-19px / 1.35 (16px / 1.4 dans une liste dense) |
| `.t-corps` | Texte courant | Barlow 400, 17px / 1.55 |
| `.t-legende` | Métadonnées, sous-bandeau, pied | Barlow 500 (400 pour le pied), 13-14px / 18-20px, `ivoire-2` |

Règles qui en découlent :
- `h1, h2, h3` de `global.css` ne doivent plus imposer Barlow Condensed : `h1` des pages de lecture = `.t-question` ; `h2` = `.t-section` (court, capitales) ; un `h2` long devient une phrase en Literata ou une `.t-puce`.
- Les intitulés officiels longs (« L'ensemble de la proposition de loi visant à… ») sont en `.t-loi`, jamais en capitales ni en condensé ; on garde l'intitulé mot pour mot.
- Les noms de députés : Barlow 600 17px dans une phrase ou une liste ; Barlow Condensed capitales seulement dans un bandeau (« Siège 578 · à côté de ton jumeau »).
- Chiffres partout en `font-variant-numeric: tabular-nums`.
- Literata se charge en **variable avec l'axe `opsz`** (`@fontsource-variable/literata/opsz.css`), sinon les grandes tailles paraissent lourdes. Vérifier que la graisse rendue est bien 500, pas 600.

## 4. Couleurs : qui a le droit à quoi

Les jetons de `global.css` sont justes ; ce qui change, c'est leur emploi.

- **`direct` #B3132F** : étiquette rouge des bandeaux ; soulignement de l'onglet actif (2 px) ; liseré haut (3 px) de la tuile du programme en cours ; **une** action principale par écran ; étiquette de thème (« Logement », « Droits »). Jamais en texte sur fond sombre, jamais collé à une pastille de groupe (§ 8 du contrat).
- **`lumiere` #F2C98A** : **seulement toi**. Repère « Toi » sur la salle (anneau 18 px, bord 2 px, halo `0 0 18px`) et son étiquette (texte `lumiere` sur `voile`, liseré gauche 3 px) ; surtitre « Ta voix de 578e » ; barre de la jauge de précision ; ton siège dans l'hémicycle SVG ; anneau de précision de l'en-tête. **Retirer** la lumière de : surtitres « Ta place », « Ton jumeau », « Ton personnage », bordure de `.encart`, puces d'Explorer, hover des liens (garder un soulignement `ivoire`).
- **Ton jumeau** : repère `ivoire` (anneau et étiquette ivoire, comme V6C-03), pas lumière.
- **Les 4 niveaux d'accord** (`lib/profil.ts`, NIVEAUX) — **changement proposé, à confirmer par Julien en début de lot D1** : au lieu de bruns et d'ors (`--accord-1..3`), des **intensités d'ivoire** : rarement = `#3A3D45`, parfois = `#6E6B66`, souvent = `#A9A49B`, presque toujours = `#F2EEE6` (thème Jour : `#D3D0C8`, `#A8A49C`, `#6E6A63`, `#121318`). Légende inchangée. Dans la 3D, les voyants « par accord » suivent la même échelle en blanc chaud de lampe (pas en or). Ainsi `lumiere` ne désigne plus que toi, et l'hémicycle cesse de virer au brun. Mettre à jour la ligne « lumière #F2C98A (toi, ton jumeau, l'accord) » de `CLAUDE.md` et noter la décision dans `docs/decisions.md`.
- **Absents** dans les barres de totaux : `#3A3D45` (comme la maquette), abstention `#FFC531`.
- **Pastilles de verdict** : supprimer les capsules ivoire. Un verdict dans une liste = `.t-mot` (ADOPTÉ / REJETÉ, `ivoire`) + « à N voix près » en `.t-puce` `ivoire-2` + barre de totaux de 10 px (`display: flex; gap: 2px`, segments `flex: <voix>`), comme V6C-01 « La semaine dernière ».
- **Thème Jour** : mêmes rôles, jetons Jour. Les aplats deviennent `panneau` blanc sur `nuit` #F3F1EC, toujours en `gap: 2px`. **La régie reste sombre dans les deux thèmes** : en-tête, bandeaux (titre sur #16181D, texte #F2EEE6, sous-bandeau #1F2229 / #ABA69C) et puces caméra gardent leurs couleurs Séance, comme un habillage télé posé sur une page claire. Le bloc « ADOPTÉ à 25 voix près » de la page d'un vote devient donc un bandeau sombre à coins vifs, pas un pavé noir arrondi.

## 5. Mise en page : les gabarits

### 5.1 La scène (accueil, verdict, Mon hémicycle)

```
<section class="scene">            position: relative; min-height: 900px (accueil), 980px (verdict), 980px (Mon hémicycle);
                                   display: flex; flex-direction: column; overflow: hidden; bord à bord (pas de .page)
  <Salle3D> en position: absolute; inset: 0 (canvas et repli SVG/image couvrent toute la scène)
  <div class="scene-voile">        position: absolute; inset: 0; pointer-events: none; dégradé (voir ci-dessous)
  puces caméra                     position: absolute; top: 96px; right: 32px (ordinateur)
  repères Toi / Ton jumeau         positionnés sur l'écran projeté du siège (déjà calculé par la 3D)
  <div class="scene-pied">         margin-top: auto; padding: 0 32px 28px; bandeau + action + programme / compteurs
</section>
```

- L'**en-tête** (Base.astro, mode onglets) est posé **par-dessus** la scène : `position: absolute` (ou `sticky` avec fond `voile`), fond `rgba(8,9,12,.74)`, `padding: 16px 32px`. Sur les pages sans scène, même en-tête avec fond `nuit`.
- Dégradés exacts des maquettes :
  - accueil : `linear-gradient(180deg, rgba(12,13,16,0) 45%, rgba(12,13,16,.85) 100%)` ;
  - verdict : `linear-gradient(180deg, rgba(12,13,16,.55) 0%, rgba(12,13,16,0) 30%, rgba(12,13,16,0) 55%, rgba(12,13,16,.9) 100%)` ;
  - vote (focus) : `linear-gradient(90deg, rgba(12,13,16,.15) 0%, rgba(12,13,16,.25) 45%, rgba(12,13,16,.82) 62%)`.
- Sous la scène, les sections reprennent la gouttière `32px` (16 px sur téléphone), largeur pleine (pas de `max-width: 1320px` centré qui crée des marges différentes de la scène ; si on garde un `max-width`, l'appliquer aussi au contenu de la scène, jamais à la scène elle-même).
- Pendant le chargement et sans WebGL : le repli (SVG restylé ou image fixe webp de la même caméra) occupe **le même cadre plein écran**. Proposition : rendre en dev, avec le script Playwright des images fixes, une image par caméra (CAM 1 jour, CAM 1 verdict, CAM 3) et l'utiliser comme `background` de la scène tant que la 3D n'est pas prête ; le SVG accessible reste dans le DOM (tableau de repli), visuellement sous la scène ou dans un panneau « Plan ».

### 5.2 Le panneau posé sur la salle

`background: panneau; border-radius: 6px; box-shadow: ombre-panneau; padding: 28px; max-width: 560px; align-self: flex-start`. C'est le seul « carton » avec ombre et rayon.

### 5.3 Les grilles d'aplats

`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 2px;` chaque cellule `background: panneau; padding: 20px 22px; display: flex; flex-direction: column; gap: 12px`. Programme : `display: flex; gap: 2px; flex-wrap: wrap`, tuiles `flex: 1 1 280px`, la tuile en cours en `panneau-2` avec `border-top: 3px solid direct`, les autres `panneau` avec `border-top: 3px solid filet`.

## 6. Écran par écran

### En-tête (Base.astro)
Comme V6C-01 : marque (SVG 50 × 30 + « Le 578e siège » Barlow Condensed 700 22px capitales `.04em`), onglets 15px `.1em` (actif `ivoire` + soulignement 2 px `direct`, inactifs `ivoire-2`), à droite « Site indépendant, non officiel » en `.t-puce`, puis recherche et anneau de précision (gardés : 36 × 36, bordure 1 px `filet`, rayon 999 px, pas plus grands que les puces). Mode focus : même fond `voile`, à gauche la marque et l'étiquette `direct` de l'étape, au centre la progression **en segments** (28 × 4 px, gap 4 px, faits = `ivoire`, à venir = `filet`), à droite « Quitter la séance » en `.t-puce`.

### Accueil (V6C-01)
- Scène CAM 1 · Salle, plein cadre, 900 px. Puces caméra en haut à droite. Repère « Toi » sur ton siège (le siège du jumeau, cf. contrat § 8) avec l'étiquette « Toi · le siège de ton jumeau » (ou « Ta place t'attend » avant 10 votes, au pied de la tribune).
- Pied de scène : bandeau (étiquette « Cette semaine » 14px, `min-height: 54px` ; titre 34px ; sous-bandeau `panneau-2` 14px) à gauche, action principale `direct` 18px `min-height: 56px; padding: 0 26px`, coins vifs, à droite (« Commencer la séance » / « Prendre ma place · 2 min » selon l'état).
- Sous le bandeau, **le programme 01-02-03** (les votes de la séance de la semaine), bord à bord dans la scène, avant le pli.
- Sous la scène : « La semaine dernière » (`.t-section` + `.t-puce` « N semaines d'affilée · ton hémicycle à N % ») et les derniers verdicts en grille d'aplats (§ 5.3). Le ticket « Le verdict mar. 13 oct. 15 h », la mini-carte « Ton hémicycle » et « Ton député » deviennent **des cellules de la même grille d'aplats**, pas des cartes à bordure. Si une information du ticket fait doublon avec le bandeau, la garder dans le DOM (pour ses `data-*`) mais en `.t-legende` dans le sous-bandeau.
- Pied de page : une ligne `.t-legende` comme la maquette (sources à gauche, mention à droite), liens soulignés `ivoire-2`.

### Quiz, lots, séance (mode focus, V6C-02)
- Fond : `fond-tribune.webp` **visible** avec le dégradé horizontal du § 5.1, plus de voile à 80-93 %. Recalculer l'image fixe après la correction des couleurs (§ 7).
- Colonne gauche (flexible) : puces caméra (CAM 2 active, décoratives en mode focus : `aria-hidden` ou désactivées si elles ne font rien) en haut ; en bas, le bandeau de l'étape (« Vote 1 sur 3 » / « La caméra descend à la tribune » / sous-bandeau). Le **mini-hémicycle** actuel (« Les députés n'ont pas encore voté », « Ton hémicycle se construit ») passe dans cette colonne, au-dessus du bandeau, sur `voile` sans bordure ni ombre, largeur 520 px maximum : la salle reste visible en haut à gauche.
- Colonne droite : **le panneau de vote** (§ 5.2), dans l'ordre de la maquette : étiquette de thème + `.t-puce` « Vote avant eux · mardi 16:00 » + segments ; `h1.t-question` ; « Ce que ça change, concrètement » (`.t-puce` `ivoire` + `.t-corps`) ; « Vérifié / Réserve » seulement si la donnée existe ; frise Dépôt → Loi si la donnée existe ; filet ; « Et toi, tu voterais quoi ? » ; boutons de vote ; puis pronostic et action « Vote suivant · 2 sur 3 ».
- Boutons de vote : `panneau-2`, bordure 1 px `filet`, rayon 6 px, `min-height: 58px`, `padding: 0 18px`, pastille 14 px, `.t-vote`. Choisi : bordure 2 px `ivoire` + « TON VOTE » `.t-puce` à droite. Après le vote, **ne pas griser** les autres réponses (aujourd'hui Contre et Je ne sais pas s'estompent : capture 13) ; ils restent identiques, seul le choisi a la bordure.
- Pronostic : deux boutons `panneau-2` 48 px, `font: 700 19px` condensé, identiques.
- Révélation (06, 10) : le bandeau du bas « Tu es dans la minorité… » devient un **bandeau de régie** standard (étiquette `direct` « Ta voix de 578e » + titre capitales + sous-bandeau), posé en bas de la colonne gauche ; l'action « Continuer » reste l'action principale du panneau.
- Fin de séance (14) et résultat du quiz (07) : « Séance terminée » / « Ta place est prête » en bandeau (étiquette + titre), pas en titre 72 px condensé avec point d'exclamation ; stats en grille d'aplats ; deux actions maximum (une `direct`, une secondaire bordée `ivoire-2`).

### Verdict (V6C-03)
- Scène CAM 1, ambiance verdict (lumières allumées), 980 px. En haut au centre : `.t-puce` `ivoire` (scrutin, date, heure), la question en Literata 22px / 1.3 (34ch max), puis **ADOPTÉ / REJETÉ en `.t-ecran`**, centré, sur la salle. Défaut de la maquette à ne pas reproduire : la ligne du scrutin passe sous les puces caméra ; démarrer ce bloc sous les puces (`padding-top` ≥ 64 px) ou limiter sa largeur pour qu'ils ne se touchent jamais.
- Repères « Toi · pour » (lumière) et « Ton jumeau · pour » (ivoire) sur la salle.
- Pied de scène : bandeau « Verdict » / « Adopté à 23 voix près » / sous-bandeau (majorité requise, votes contre le groupe), puis les **compteurs** sur `voile`, 4 colonnes, `padding: 22px 26px`, carré 12 px de la couleur du vote + libellé `.t-puce`, chiffre `.t-compteur`.
- Sous la scène : grille d'aplats de 3 cellules : « Ta voix de 578e » (surtitre lumière, `.t-mot` « Tu as voté pour », phrase `.t-corps` `ivoire-2`), le député / le jumeau, « Et maintenant » (Literata 18px + actions coins vifs). L'hémicycle SVG détaillé (« Comment l'Assemblée a voté ») passe **sous** cette grille, en pleine largeur ou dans une cellule, avec sa légende et son tableau de repli.
- « 1 vote sur 3 jugé · les 2 autres : mardi » : en `.t-legende` du sous-bandeau, pas en encart à liseré.

### Mon hémicycle (V6C-04)
- Scène CAM 3 · Ta travée, 980 px ; puces en haut à gauche (comme la maquette). Consigne de geste centrée (`voile`, `.t-puce`) : « Glisse pour tourner la tête · double-touche pour revenir à la tribune ».
- Textes du bandeau : « Ta place » / « Le siège de <nom du jumeau> » / sous-bandeau (votes en commun).
- Bas gauche : bandeau étiquette « Ta place » (`min-height: 52px`) + titre 32px + sous-bandeau. Bas droite, aplat `panneau` sans rayon ni ombre, `flex: 1 1 380px`, `padding: 20px 22px`, `gap: 14px` : « Précision de ton hémicycle » (`.t-puce`), le chiffre en Barlow Condensed 600 64px / 0.85 (« % » à 32px), « N votes · fiable à 25 » en `.t-puce` à droite ; jauge 8 px `lumiere` sur `filet` avec un repère vertical 2 px `ivoire` à la position « fiable » ; puis « Les groupes, du plus proche au plus lointain » : grille `80px 1fr 40px`, sigle Barlow Condensed 600 14px capitales `.08em`, barre 6 px **`ivoire`** sur `filet`, valeur 15px `tabular-nums`. Ajouter devant le sigle la pastille de la couleur officielle du groupe (règle § 8 du contrat) ; la barre reste ivoire.
- Sous la scène : grille d'aplats (Ton jumeau, Ton opposé, Ton député, Votes tranchés / Comme le vote final), l'hémicycle SVG « par accord » (§ 4), « Tes réponses » (intitulés en `.t-loi` 16px, réponse en pastille de vote 10 px + mot `.t-puce`, pas de capsules colorées « pour / contre »).
- « Ton personnage » : un bouton secondaire dans le bandeau ou le panneau ouvre un panneau repliable (feuille sur téléphone) avec peau, coiffure, tenue. Plus de grand bloc permanent.

### Pages en thème Jour (Explorer, page d'un vote, députés, calcul, état, légales)
- Même en-tête, sombre (#0C0D10) ; contenu en Jour.
- Titres de page : `.t-section` court en capitales (« Tous les votes ») ; intitulé d'un vote ou d'une loi : `h1.t-question` (Literata 34px) ; nom d'un député : Literata 500 34px.
- Listes (Explorer, votes d'un député, « Qui te représente ? ») : chaque ligne = `.t-puce` (date, type) + `.t-loi` 16px + verdict en `.t-mot` 17px + barre de totaux 6 px. Supprimer les capsules arrondies ivoire / noires.
- Filtres : boutons à coins vifs `panneau`, bordure 1 px `filet`, actif = `ivoire` plein (texte `nuit`), comme une puce caméra active mais rectangulaire. Pas de pilules arrondies.
- Blocs : grille d'aplats `gap: 2px` sur `nuit` (#F3F1EC), cellules `panneau` blanc, pas d'ombre, pas de bordure.
- Page d'un vote : le résultat devient un bandeau (« Verdict » / « Adopté à 25 voix près » / sous-bandeau), puis compteurs `.t-compteur` sur `panneau`, puis l'hémicycle et « Groupe par groupe » ; « Pour aller plus loin » : accordéons à coins vifs, titres `.t-puce` 15px.

### Téléphone (V6C-05, V6C-06)
- Vote : salle (image fixe) sur les 40 % du haut, marque et « Quitter » par-dessus (fond `voile`) ; puces caméra **en bas de l'image**, abrégées « Cam 1 · Salle » pour l'active, « Cam 2 », « Cam 3 », « Cam 4 » pour les autres ; le panneau de vote monte en feuille (`panneau`, sans rayon en bas, `padding: 16px`) avec étiquette « Vote 1/3 », question Literata 22px, « concrètement » 15px, boutons de vote 58 px.
- Mon hémicycle : salle plein écran (CAM 3 ou CAM 4 par défaut selon le contrat), puces en haut, bandeau « Ta place » et panneau précision en bas, au-dessus de la navigation ; le reste du contenu continue sous le pli.
- Navigation fixe en bas : 3 onglets `.t-puce` 13px, actif `ivoire` avec liseré **haut** 2 px `direct` ; fond `nuit`, bordure haute `filet`. Pas d'icône obligatoire.
- Gouttière 16 px, aucun défilement horizontal, cibles ≥ 44 px.

## 7. La salle 3D : couleur et cadrage

1. **Couleurs.** Hypothèse à vérifier en premier : three ≥ r152 convertit les couleurs hexadécimales (lumières, brouillard, `color` des matières) de sRGB en linéaire ; r128 ne le faisait pas. Test : `THREE.ColorManagement.enabled = false;` en tête de `site/src/salle3d/scene.ts` (avant toute création de couleur), rendu de CAM 1 jour, comparaison avec `maquettes/images/fond-cam1-salle-jour.jpg`. Si ça rapproche, garder (c'est la voie de migration documentée par three pour retrouver l'aspect r128) ; sinon, convertir à la main les couleurs du prototype. Les textures restent en `SRGBColorSpace`, la sortie en `outputColorSpace = SRGBColorSpace`.
2. **Calibrage** : rendre en dev, **avec une vraie carte graphique** (Playwright en mode « headed » ou `--use-gl=angle`, pas le rendu logiciel des captures), les quatre caméras dans les mêmes cadrages que `maquettes/images/` ; produire une planche avant / après dans la PR ; ajuster exposition, brouillard et lumières jusqu'à ce que marbre et colonnes soient blanc cassé et le velours rouge franc. Ne pas toucher à la géométrie.
3. **Images fixes** (`fond-tribune*.webp`, et celles du § 5.1) : les recalculer après le calibrage.
4. **Cadrage** : en scène plein cadre, le canvas couvre toute la section ; le point de vue de CAM 1 doit laisser le tiers bas pour le bandeau et le programme (le hublot de la tribune et les premiers rangs sous le dégradé), comme V6C-01.

## 8. Ce qui ne change pas

Mécanique, données, calculs, `lib/` (sauf `stories.ts` et `themes.ts`), clés localStorage, inventaire `data-*` (même élément, même type), modes onglets et focus, textes réglementaires mot pour mot, neutralité, accessibilité (le canvas reste `aria-hidden`, le SVG et son tableau de repli restent accessibles même s'ils passent sous la scène), budget JavaScript, zéro euro. Les écarts décidés du contrat § 8 restent valables (3 boutons de vote, pas d'« utilisateurs du site », pas de « Suivre ce texte », pas de CAM 5).

## 9. Contrôle

- À chaque lot : captures Playwright aux mêmes noms que `captures-la-seance/`, puis planches **site / maquette** côte à côte comme `comparaisons/` (même largeur, 1440 et 390). Pour un écran sans maquette, planche avant / après.
- Liste de contrôle par écran :
  - aucune Barlow Condensed en bas de casse (vérification automatisée possible : un test Playwright qui parcourt les éléments dont la `font-family` calculée commence par « Barlow Condensed » et échoue si `text-transform` n'est pas `uppercase`, en tolérant les chiffres seuls) ;
  - toute question ou intitulé de loi en Literata ;
  - `lumiere` uniquement sur toi ;
  - pas de rayon hors panneau de vote, boutons de vote, puces caméra ;
  - la salle visible et plein cadre sur accueil, verdict, Mon hémicycle ; l'image de la tribune visible en mode focus ;
  - contrastes AA dans les deux thèmes, y compris le texte posé sur la salle (toujours sur `voile` ou sous un dégradé ≥ .74).
