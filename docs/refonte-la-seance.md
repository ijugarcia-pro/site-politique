# Refonte « La Séance » · consignes pour Claude Code

> **Remplacé par docs/design-vdef/VDEF.md** (VDEF « La salle est le menu », décision du 22 oct. 2026). Ces consignes décrivent « La Séance » ; elles ne sont plus la référence de l'apparence ni du parcours.

Projet : « Le 578e siège » (Astro 7 statique, Cloudflare Pages, zéro euro).
Demande de Julien du 20 octobre 2026 : appliquer au vrai site la direction artistique « La Séance », **sans toucher à la mécanique** (données, calculs, stockage, pipeline). Décision : docs/decisions.md, 20 oct. Suivi : docs/PLANNING.md, tâches t56 à t62.

> **Suite (design définitif, 20-21 oct. 2026, t63 à t70)** : l'application écran par écran des maquettes V6C suit docs/design-final/DESIGN-FINAL.md (règles, typographie, couleurs par rôle, gabarits) et docs/design-final/PLAN-LOTS.md (lots D0 à D6). Le contrat (§ 2) et les écarts décidés (§ 8) de ce fichier restent valables et priment.

## Mode d'emploi

- Lis `CLAUDE.md`, `docs/decisions.md`, `docs/PLANNING.md`, puis ce fichier et `docs/base-technique-site.md` (inventaire de la base technique au 20 oct.).
- **Un lot = une branche = une PR**, dans l'ordre 0 → 6 (les lots 3 et 4 en deux PR chacun). Rien n'est fusionné sans l'accord de Julien.
- Références visuelles :
  - design system « Le 578e siège · La Séance » : https://claude.ai/artifact/4i8ZqFLTaEVLJJgZGhHhMM (`project/README.md`, `project/tokens.json`, composants Bandeau, CameraPuce, Compteur, VoteBouton) ;
  - maquettes : page « V6 · C · La Séance » du canvas https://claude.ai/artifact/1VD3vDVnxpncGnMrNA6Lg9 (`project/V6C-01` à `V6C-06`) : accueil, fiche de loi et vote, verdict, Mon hémicycle, deux écrans de téléphone ;
  - salle 3D prototypée (three r128, sans module) : `docs/salle-3d/room.js` et `docs/salle-3d/textures.js`, versionnés tels que Julien les a fournis le 20 oct. (référence, non servis par le site).
- Les maquettes ont des données illustratives et quelques éléments qui ne s'appliquent pas (voir « Écarts aux maquettes ») : ce fichier prime.

## 1. La direction en bref

La salle réaliste **est** le site. Chaque rubrique est une caméra : CAM 1 · Salle (depuis le perchoir), CAM 2 · Tribune (depuis le sol), CAM 3 · Ta travée (depuis ton siège), CAM 4 · Plan (vu de dessus). L'interface parle la langue de la régie télé : bandeaux (une étiquette rouge et un titre en capitales condensées), puces de caméra, compteurs, panneaux sombres posés sur la salle. La matière (bois, velours, marbre, dorures) reste dans la 3D, jamais dans l'interface : pas de texte doré, pas de bois en fond, pas d'écriture manuscrite. Lumière de jour pour voter, lumières allumées au verdict.

**Ta place** : le personnage de l'utilisateur est assis **sur le siège de son jumeau** (décision de Julien). On voit tout de suite où l'on siège et dans quel bloc.

## 2. Le contrat (non négociable)

- Ne rien modifier dans `pipeline/` ni dans `site/src/lib/`, sauf `stories.ts` et `themes.ts` (couleurs et polices seulement). `npm test`, `npm run build` et `uv run pytest` restent verts à chaque lot.
- Chaque attribut `data-*` reste présent, sur un élément du même type. Vérification : `npm run build` puis `npm run test:inventaire` (références du lot 0 : `site/tests/inventaire-data.json`). Un attribut ajouté volontairement : réenregistrer la référence (`npm run inventaire:enregistrer`) et le dire dans la PR.
- Les clés localStorage ne changent pas (`578e.reponses.v1`, `578e.depute.v1`, `578e.quiz.v1`, `578e.lots.v1`, `578e.seances.v1`, `578e.verdicts-vus.v1`). Toute clé est annoncée sur `/confidentialite/` et effacée par `/calcul/` (test `site/tests/stockage.test.mjs`).
- Les deux modes du layout restent : onglets (Cette semaine · Mon hémicycle · Explorer) et focus (quiz, lots, séance, verdict).
- Les textes réglementaires et neutres restent mot pour mot : verdicts, « Ta voix de 578e », « Résumé généré automatiquement… », pied de page des sources, « Aucun commentaire politique ».
- Neutralité : on célèbre le fait de répondre, jamais une opinion. Pour, Contre, Je ne sais pas (et l'abstention quand elle existe) reçoivent un traitement strictement identique ; ADOPTÉ et REJETÉ aussi. Aucun libellé, aucun axe, aucun dégradé gauche-droite.
- Couleurs de vote réservées aux votes : pour #2F7BFF, contre #FF6A3D, abstention #FFC531, absent et non-votant éteints mais distincts. Les couleurs officielles des groupes (`couleurs.ts`) restent reconnaissables : pastilles, barres par groupe, légendes. Les sièges 3D restent rouges ; les votes et l'accord passent par les voyants des pupitres, jamais par la couleur des sièges.
- Polices servies localement par @fontsource (paquets npm), aucun appel à Google Fonts. Pas de CDN : three s'installe en paquet npm, en version exacte.
- Coût zéro, aucun service nouveau. Pas de cookie, pas de mesure d'audience.
- Animations : uniquement `transform` et `opacity` côté interface, une variante « mouvement réduit » pour chaque animation, rien d'animé hors de l'écran au chargement, toute séquence de plus de 0,6 s passable d'un geste (`lib/motion.ts`).
- Accessibilité au moins au niveau actuel : lien d'évitement, `:focus-visible`, `aria-current`, hémicycles navigables au clavier avec tableau de repli, contrastes WCAG AA, canvas 3D en `aria-hidden` avec une alternative textuelle.
- JavaScript initial d'une page sans 3D inchangé ou plus léger (référence : `data/mesures/poids-site.json`, vérifiée par `npm run test:inventaire`, marge de 2 %).

## 3. Jetons de la charte

Source : `project/tokens.json` du design system ; repli ci-dessous.

- **Thème « Séance »** (sombre, par défaut) : nuit #0C0D10, panneau #16181D, panneau-2 #1F2229, filet #2E313A, ivoire #F2EEE6 (texte), ivoire-2 #ABA69C (texte secondaire), direct #B3132F (bandeaux, action principale, texte blanc dessus), lumière #F2C98A (toi, ton jumeau), voile rgba(8,9,12,0.74) (derrière un texte posé sur la 3D), voyant éteint #2A2D33, focus #F2EEE6.
- **Thème « Jour »** (lecture longue : page d'un vote, fiche député, « Qui te représente ? », calcul, état des données, pages légales, Explorer) : nuit #F3F1EC, panneau #FFFFFF, panneau-2 #F7F5F0, filet #D8D5CD, ivoire #121318, ivoire-2 #575A62, lumière #8A5A12, voile rgba(243,241,236,0.86), voyant éteint #C9C6BF, focus #121318.
- **Typographie** : Barlow Condensed 500/600/700 (`@fontsource/barlow-condensed`) pour les bandeaux, titres d'écran, compteurs et puces, en capitales, chiffres tabulaires ; Literata variable (`@fontsource-variable/literata`) pour les questions et le texte de loi ; Barlow 400/500/600 (`@fontsource/barlow`) pour l'interface. Fredoka et Nunito sont retirées au lot 6.
- **Échelle** : titre-écran 104/92 700 · compteur 88/80 600 · bandeau 28/30 600 · puce 13/16 600 +0,12em · question 34/42 Literata 500 · corps 17/27 · légende 13/18. Espacements 4, 8, 12, 16, 24, 32, 48, 64, 96. Rayons : 0 (bandeaux), 6 px (panneaux, boutons), 999 px (puces). Ombre panneau : 0 24px 60px -20px rgba(0,0,0,0.75) (jour : 0 18px 40px -18px rgba(30,24,16,0.28)).
- **Mouvement** : caméra 1,4 à 1,8 s, `power2.inOut`, coupe franche en mouvement réduit ; bandeau qui entre en 360 ms depuis le bas ; compteurs qui montent ensemble en 1,2 s ; onde des voyants du rang intérieur vers l'extérieur, jamais de balayage horizontal.

## 4. Architecture de la 3D dans Astro

- Un composant `Salle3D.astro`, monté seulement sur l'accueil, le verdict et Mon hémicycle. Son script fait un `import()` dynamique de three et de la scène, uniquement quand le conteneur est visible **et** que WebGL est disponible **et** qu'il n'y a ni « Save-Data » ni appareil trop faible (`navigator.deviceMemory < 4`). Sinon, et pendant le chargement, on affiche `Salle.astro` (SVG) restylé : c'est le repli officiel, il garde toute son accessibilité.
- Le prototype r128 est porté vers la version npm de three : `outputColorSpace` au lieu de `outputEncoding`, `colorSpace` sur les textures, `sheen` devenu un nombre avec `sheenColor`, lumières physiques (intensités à recalibrer). Rendu à la demande (aucune boucle quand rien ne bouge), pixel ratio plafonné (1,75 ; 2 sur téléphone), ombres recalculées seulement quand la scène change.
- La géométrie des sièges vient de `lib/hemicycle.ts` : le siège n° i du plan 2D est le siège n° i de la 3D (même ordre, mêmes 13 rangs). Le jumeau (`lib/profil.ts`) donne directement le siège où s'assoit le personnage. La géométrie n'est pas dupliquée (voir « Ajustements », 1).
- Le code 3D vit hors de `lib/` (proposition : `site/src/salle3d/`), avec ses tests.
- Budget : JavaScript initial d'une page sans 3D inchangé ; morceau 3D chargé à la demande sous 250 Ko compressés ; LCP mobile de l'accueil sous 2,5 s (le texte et le repli s'affichent avant la 3D).
- Les pages en mode focus (quiz, lots, séance) n'ouvrent pas la 3D en direct : panneau de régie sur fond « nuit » avec une image fixe de la salle (CAM 2 · Tribune), rendue en dev et versionnée en webp dans `public/`. Le verdict, lui, ouvre la salle allumée en direct (avec repli).

## 5. Ce que chaque écran devient (référence : maquettes V6C)

- **Base.astro** : en-tête de régie (marque, nom en capitales condensées, 3 onglets soulignés en rouge direct, recherche, anneau de précision), mention « Site indépendant, non officiel ». Mode focus : barre de progression fine et bandeau de l'étape. Le script commun ne bouge pas.
- **Accueil (Cette semaine)** : CAM 1 · Salle en grand, bandeau « Cette semaine » et le titre du ticket de séance, action principale en rouge direct, l'ordre du jour en bande « programme » (01, 02, 03), derniers verdicts en panneaux avec barre de totaux, ton député, série.
- **Quiz, lots, séance** (`Seance.astro`) : panneau de vote, question en Literata, « Ce que ça change, concrètement », boutons de vote identiques, pronostic facultatif ; tampon et fin de séance réinterprétés en bandeau de régie (« Séance terminée »).
- **Verdict** : lumières allumées, voyants en onde, ADOPTÉ / REJETÉ en titre-écran, « à N voix près » en bandeau, compteurs pour / contre / abstention / absents, repères « Toi » (lumière) et « Ton jumeau », panneaux « Ta voix de 578e », député, jumeau.
- **Mon hémicycle** : CAM 3 · Ta travée depuis le siège du jumeau, où le personnage est assis. Puces de caméra pour passer en CAM 1 ou CAM 4. Mode « par accord » : les 4 niveaux de `profil.ts` deviennent 4 intensités des voyants (de l'éteint à la lumière), sans réarranger la salle. Précision, groupes du plus proche au plus lointain, liste de tes réponses.
- **Personnage** : formes simples et lisses ; 6 teintes de peau, 6 coiffures, 5 tenues sobres (gris, anthracite, sable, ardoise, écru) sans connotation de groupe, aucun genre imposé, pas d'écharpe tricolore. Avant 10 votes, il attend au pied de la tribune. Ensuite il marche 3 à 4 s par les allées jusqu'au siège du jumeau et s'assoit (passable, coupé en mouvement réduit). Ses choix restent dans le navigateur (clé proposée : `578e.personnage.v1`, ajoutée à `/confidentialite/` et au bouton d'effacement de `/calcul/`).
- **Caméra libre** : orbite bornée au glisser et zoom en CAM 1 et CAM 4 ; en CAM 3, on tourne la tête (lacet ±70°, tangage ±25°) ; jamais à travers les murs ; double appui pour revenir face à la tribune. Au clavier : flèches et +/−.
- **Explorer, page d'un vote, députés, calcul, état, pages légales** : thème « Jour », mêmes composants (bandeaux, puces, panneaux), hémicycle SVG restylé. Sur la page d'un vote, les couleurs des groupes restent celles de l'open data.
- **Stories** (`stories.ts`) : 1080 × 1920 aux couleurs et polices de « La Séance » (nuit, bandeau rouge, compteurs condensés, ta place en lumière).
- **Responsive** : à 390 px, les puces de caméra passent en bas au-dessus de la navigation, CAM 4 · Plan par défaut sur Mon hémicycle, panneaux en feuille qui monte du bas.

## 6. Les lots

| Lot | Tâche | Contenu |
|---|---|---|
| 0 | t56 | Préparation : `main` à jour (les branches `claude/explorer-deja-tranches` et `claude/nice-brahmagupta-et3e6p` y étaient déjà, PR #37, #40, #41), écart `578e.verdicts-vus.v1` corrigé, inventaire des `data-*` et poids du JavaScript enregistrés, prototype 3D versionné, ce fichier, décision et planning. |
| 1 | t57 | Fondations : polices @fontsource, jetons des deux thèmes dans `global.css` (remplacent `--violet` et compagnie, thème choisi par un attribut `data-theme` posé par `Base.astro`), `motion.css` aux nouvelles durées, `Base.astro` (en-tête de régie, modes onglets et focus), absent et non-votant éteints mais distincts. Le site entier change de peau, sans 3D. |
| 2 | t58 | Parcours de vote : `Seance.astro`, `EnteteSeance`, `JaugePrecision`, `SerieGelee`, quiz, lots, séance, verdict (en 2D). Fond « nuit » provisoire du mode focus (les images fixes arrivent au lot 4). |
| 3a | t59 | Thème Jour : Explorer, page d'un vote, `Hemicycle`, `MiniHemicycle`, `LigneVote`. |
| 3b | t59 | Thème Jour : « Qui te représente ? », fiche député, calcul, état, pages légales. |
| 4a | t60 | Salle 3D : moteur (portage de three, sièges tirés de `lib/hemicycle.ts`, matières précalculées, CAM 1, CAM 2, CAM 4, voyants sur les vrais votes, repli SVG), `Salle3D.astro` chargé à la demande ; accueil en thème Séance avec la salle en tête ; verdict avec la salle en tête. *(Fait le 20 oct.)* |
| 4b | t60 | Mon hémicycle en thème Séance avec la salle (4 intensités de voyants), ambiance verdict, onde des voyants, repères « Toi » et « Ton jumeau », caméra libre bornée, images fixes du mode focus. *(Fait le 20 oct.)* |
| 5 | t61 | Personnage et place : création, pose debout et marche (absentes du prototype), assise sur le siège du jumeau, CAM 3. *(Fait le 20 oct.)* |
| 6 | t62 | Finitions : `stories.ts` et `themes.ts`, retrait de Fredoka et Nunito, CLAUDE.md et PLANNING.md. *(Fait le 20 oct.)* |

## 7. Vérification à chaque lot

- `npm test`, `npm run build`, `npm run test:inventaire`, `uv run pytest` : verts.
- Rejouer les parcours : nouveau visiteur (quiz puis 5 lots), séance de la semaine, verdict, Mon hémicycle, une page de vote, la recherche par code postal, une fiche député. À 390 px et à 1440 px, avec et sans mouvement réduit, avec et sans WebGL (le repli doit suffire).
- Captures des écrans touchés, jointes à la PR, pour comparaison avec les maquettes V6C.
- Contrastes vérifiés dans les deux thèmes, navigation clavier complète.
- À la fin de chaque lot : ce qui est fait, ce que Julien doit regarder en premier, 3 défauts honnêtes, et la PR à relire.

## 8. Écarts aux maquettes (décidés le 20 oct.)

- **Ta place** : les maquettes disent « à côté de ton jumeau » ; Julien a décidé « sur le siège de ton jumeau ».
- **« Je m'abstiens »** : les maquettes ont un 4e bouton ; le site garde ses 3 boutons (Pour, Contre, Je ne sais pas), puisque `lib/` est figé et que les réponses ne connaissent pas l'abstention.
- **Non montrés** : « Et les utilisateurs du site ? », « Suivre ce texte », « CAM 5 · Toi », la puce « Données de maquette » et les encarts « Vérifié / Réserve » quand la donnée n'existe pas. Ils supposent des agrégats, des comptes ou des données absents (règle 6 du cadrage).
- **Rouge de régie et groupes** : le rouge `direct` (#B3132F) est proche des couleurs officielles de GDR (#830E21) et de LFI (#C00D0D). Règle : jamais de rouge de régie collé à une pastille, une barre ou une légende de groupe, et chaque groupe toujours avec son sigle écrit.

## 9. Ajustements tirés du prototype 3D (lus le 20 oct.)

1. **Sièges.** Le prototype calcule ses propres 577 sièges : 6 blocs entre 6° et 174°, 5 allées (33°, 61,5°, 90°, 118,5°, 147°), rangs remplis par bloc. `lib/hemicycle.ts` remplit 13 rangs sans allées, par angle. La 3D lit donc `places()` : pour chaque rangée, les sièges dans l'ordre de leur angle sont répartis entre les 6 blocs, comme dans le prototype. Le siège n° i garde son rang et son ordre dans le rang ; les groupes gardent des parts contiguës, coupées par les allées. Conséquence : les rangs intérieurs sont plus serrés que dans le prototype (25 sièges au 1er rang, écart de 0,60 m au lieu de 0,76 m) : la largeur des fauteuils s'adapte par rang, sans toucher à `lib/`.
2. **Portage.** Lumières physiques dans three récent : toutes les intensités sont à recalibrer, en comparant aux images des maquettes. Retirés : vues et matières du « carnet » (papier, cuir, encrage, fougère), ambiances « documentaire » et « plâtre », voyants tirés au hasard (remplacés par les vrais votes). À créer : CAM 2 · Tribune (absente du prototype), CAM 3 depuis le siège du jumeau. Téléphone : ombres de 1 024 px (4 096 dans le prototype), vernis (clearcoat) coupé.
3. **Budget estimé** : three (environ 170 Ko compressés) et la scène (environ 20 Ko) : environ 190 Ko, sous les 250 Ko.
4. **Matières** : le prototype les calcule dans le navigateur (des dizaines de millions d'évaluations de bruit : quelques secondes sur ordinateur, sans doute 5 à 10 s sur téléphone, sur le fil principal). Mesure à faire au lot 4a (le prototype la donne : `M._ms`).
5. **Personnage** : le prototype n'a qu'une pose assise et 3 coiffures (courte, longue, rasée). La pose debout, la marche, les 6 coiffures, les 6 teintes et les 5 tenues sont à créer au lot 5 (1 à 2 sessions).
6. **Le 578e fauteuil** : le prototype a déjà une chaise en plus au pied de la tribune : c'est là que le personnage attend avant 10 votes.

## 10. Recommandations du 20 oct. (à confirmer par Julien)

Proposées par Claude le 20 octobre ; Julien les a acceptées sans avoir pu les lire (elles ne s'étaient pas affichées). **À reconfirmer** avant le lot qui en dépend.

1. **GSAP non installé** *(confirmé par Julien le 20 oct. ; fait au lot 4a)* (lot 4) : le prototype ne s'en sert que pour un mouvement de caméra et prévoit déjà de s'en passer ; une interpolation maison en `power2.inOut` (une quarantaine de lignes) évite environ 27 Ko.
2. **Playwright** *(accepté par Julien le 20 oct. ; installé au lot 1)* (dès le lot 1) en dépendance de développement, en version exacte, pour les captures de chaque PR et les images fixes. Il télécharge un navigateur d'environ 150 Mo sur le poste, hors du projet : gratuit, mais à accepter explicitement.
3. **Matières précalculées** *(confirmé par Julien le 20 oct. ; mesure faite, précalcul retenu au lot 4a)* (lot 4a) : si la mesure confirme la lenteur sur téléphone, un script versionné exécute `textures.js` une fois, en dev, dans le navigateur de Playwright, et écrit des webp dans `public/` (environ 2 à 4 Mo, chargés seulement avec la 3D, mis en cache). Sinon, calcul dans un worker pendant les temps morts.
4. **Pas de fil de lumière** *(confirmé par Julien le 20 oct. ; fait au lot 5)* (lot 5) : assis sur le siège du jumeau, le personnage n'a plus de fil vers lui ; la plaquette du jumeau s'éclaire sous lui, et le 578e fauteuil reste vide au pied de la tribune une fois le personnage installé.
5. **Prototype versionné** dans `docs/salle-3d/` (fait au lot 0), porté dans `site/src/salle3d/` au lot 4.
