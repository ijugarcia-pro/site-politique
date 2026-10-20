# Design définitif « La Séance » · prompt pour Claude Code

Tu travailles sur le dépôt « Le 578e siège ». La refonte « La Séance » (lots 0 à 6) a posé toute la mécanique : salle 3D, personnage, thèmes, inventaire des `data-*`. Elle est bonne et on n'y touche pas. Mais le site ne ressemble pas aux maquettes validées : la salle est enfermée dans des vignettes, le mode focus est noyé dans le noir, Barlow Condensed est utilisée partout (en bas de casse) et Literata presque nulle part, la couleur « lumière » dore toute la page et la 3D tire vers l'orange. Ta mission : **faire ressembler le site aux maquettes V6C, écran par écran**, sans toucher à la mécanique.

Commence en **mode plan** : lis tout ce qui suit, puis propose-moi le plan des lots (un lot = une branche = une PR) et attends mon accord avant d'écrire du code.

## 1. À lire d'abord, dans cet ordre

1. `docs/design-final/DESIGN-FINAL.md` : le diagnostic, les règles, la typographie exacte, les couleurs par rôle, les gabarits, écran par écran, la salle 3D. **C'est ta référence principale.**
2. `docs/design-final/comparaisons/*.jpg` : le site actuel à gauche, la maquette à droite.
3. `docs/design-final/maquettes/` : les 6 maquettes en PNG (la cible) et en HTML statique (tous les styles en ligne : lis-y les valeurs exactes plutôt que de les deviner), et les fonds de la salle rendus par le prototype (`images/`), qui servent de référence de couleur.
4. `CLAUDE.md`, `docs/decisions.md`, `docs/PLANNING.md`, `docs/refonte-la-seance.md` (le contrat § 2 et les écarts décidés § 8 restent valables et priment sur tout le reste).
5. Le code : `site/src/styles/global.css`, `motion.css`, `fin-seance.css`, `site/src/layouts/Base.astro`, tous les composants de `site/src/components/`, les pages de `site/src/pages/`, `site/src/salle3d/scene.ts`, `site/scripts/captures.mjs`.
6. Les captures du site actuel : `captures-la-seance/` (31 écrans, ordinateur et téléphone).

Ordre de priorité en cas de conflit : contrat (`refonte-la-seance.md` § 2 et § 8) > maquettes V6C > `DESIGN-FINAL.md` > design system.

## 2. Ce qui ne bouge pas (rappel du contrat)

- Rien dans `pipeline/` ni dans `site/src/lib/` (sauf `stories.ts` et `themes.ts`, couleurs et polices seulement).
- Chaque attribut `data-*` reste présent, sur un élément du même type : `npm run test:inventaire` vert à chaque lot. Un élément qui change de place dans la page garde ses attributs.
- Clés localStorage inchangées ; modes onglets et focus ; textes réglementaires mot pour mot ; neutralité (Pour, Contre, Je ne sais pas identiques ; ADOPTÉ et REJETÉ identiques) ; accessibilité au moins au niveau actuel ; budget JavaScript ; polices locales @fontsource ; zéro euro.
- `npm test`, `npm run build`, `npm run test:inventaire`, `uv run pytest` : verts à chaque lot.

## 3. Lots proposés (à confirmer dans ton plan)

- **D0 · Outils de comparaison.** Un script Playwright (dans `site/scripts/`) qui refait les captures aux mêmes noms que `captures-la-seance/`, à 1440 et 390 px, puis compose des planches « site / maquette » comme `docs/design-final/comparaisons/` (et « avant / après » pour les écrans sans maquette). Un test qui échoue si un élément visible a une police calculée Barlow Condensed sans `text-transform: uppercase` (chiffres seuls tolérés). Ce test sera rouge au départ : c'est normal, il doit être vert à la fin de D5.
- **D1 · Typographie et couleurs, partout.** Classes utilitaires du § 3 de `DESIGN-FINAL.md` dans `global.css` ; `h1/h2/h3` qui n'imposent plus le condensé ; Literata pour toute question et tout intitulé de loi ; condensé seulement en capitales ; `lumiere` réservée à toi ; capsules ivoire, pilules et encart à liseré remplacés par les composants des maquettes ; coins vifs pour la régie. **Avant de commencer D1**, demande-moi de confirmer le changement des 4 niveaux d'accord en intensités d'ivoire (§ 4 de `DESIGN-FINAL.md`) ; si je dis oui, mets à jour `CLAUDE.md` et `docs/decisions.md`.
- **D2 · Couleur de la salle 3D.** Vérifie d'abord l'hypothèse `THREE.ColorManagement.enabled = false` (§ 7), puis calibre sur une vraie carte graphique jusqu'à coller aux images de `maquettes/images/` ; recalcule les images fixes (`fond-tribune*.webp`) et, si tu le proposes, une image fixe par caméra pour le repli plein cadre. Planche avant / après dans la PR. Ne touche pas à la géométrie.
- **D3 · La scène plein cadre.** `Base.astro` (en-tête posé sur la scène, fond `voile`), accueil, verdict, Mon hémicycle selon V6C-01, V6C-03, V6C-04 : salle bord à bord, dégradés exacts, puces caméra, repères Toi / Ton jumeau, bandeau + programme / compteurs posés sur la salle, grilles d'aplats en `gap: 2px` sous la scène, réglage du personnage replié dans un panneau.
- **D4 · Le mode focus.** Quiz, lots, séance, révélation, fin de séance, résultat du quiz selon V6C-02 : tribune visible, panneau de vote à droite, mini-hémicycle et bandeau à gauche, boutons de vote qui ne grisent plus les autres choix après le vote.
- **D5 · Les pages en thème Jour.** Explorer, page d'un vote, « Qui te représente ? », fiche député, calcul, état, légales, 404 : mêmes règles, régie sombre sur page claire.
- **D6 · Téléphone et finitions.** V6C-05 et V6C-06 (salle en haut, feuille qui monte, puces en bas de l'image, navigation fixe), puis `stories.ts` / `themes.ts` alignés, `CLAUDE.md`, `docs/decisions.md` (entrée datée « design définitif »), `docs/PLANNING.md` (nouvelles tâches), et le jeu complet de captures finales.

Tu peux regrouper ou redécouper ces lots si c'est plus sûr ; dis-moi pourquoi.

## 4. À la fin de chaque lot

- Les planches site / maquette des écrans touchés, à 1440 et 390 px, jointes à la PR (et le chemin des fichiers sur le disque, pour que je les ouvre).
- La liste de contrôle du § 9 de `DESIGN-FINAL.md`, cochée écran par écran.
- Ce qui est fait, ce que je dois regarder en premier, 3 défauts honnêtes qui restent, et la PR à relire. Ne fusionne rien sans mon accord.
- Si une maquette est impossible à suivre sans casser le contrat, ne tranche pas seul : montre-moi l'écart et deux options.
