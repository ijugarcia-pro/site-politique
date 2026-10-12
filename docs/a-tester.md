# À tester — session du 9 octobre 2026

> Rapport de Claude Code pour Julien. **Mise à jour du 12 octobre : tout est en ligne** sur https://le578esiege.pages.dev (PR #18 et #19 fusionnées). Les tests ci-dessous se font désormais sur le site en ligne. Deux corrections au rapport : le 3e vote de la séance est le n° 6124 (rave-parties), avec sa carte, et non le logement ; le point 1 de « Ce que toi seul peux faire » est fait.

## 1. Ce qui a été fait

| Tâche | Ce qui existe maintenant |
|---|---|
| **t43** · tes 15 votes | Tes 5 lots figés dans `data/lots.json` ; 4 cartes ajoutées (n° 1624, 3055, 2880, 1304), dont la censure partielle du n° 1624 (Conseil constitutionnel, 19 juin 2025) dans « Vérifié ». |
| **t44** · les lots | Page `/lots/` : 3 votes par lot, révélation après chaque réponse, fin de lot (tampon, précision gagnée, carnet), « Lot suivant ». Le quiz enchaîne sur le lot 1. |
| **t45** · l'accueil | Accueil d'après la maquette ⑤ : le ticket suit le visiteur (quiz → séance → lot → Explorer), les derniers verdicts face à ses réponses, son hémicycle, son député. |
| **t23** · la séance choisie | Chaque lundi, le pipeline choisit 3 votes parmi les votes solennels annoncés à l'agenda ; il complète avec la réserve (tes 13 candidats non retenus) ; il détecte les vacances. La sélection est figée pour la semaine. Pour la semaine du 12 octobre : les 2 votes du mardi 13 (violences sexuelles et sexistes ; loi organique sur l'autorité judiciaire) + 1 vote passé. |
| **t24** · la séance | Page `/seance/` : voter avant les députés, pronostic facultatif, tampon, série (gelée pendant les vacances), rendez-vous du verdict. Ta réponse rejoint ton hémicycle dès que le scrutin est publié. |
| **t25** · le verdict | Page `/verdict/` : verdict, marge, ta réponse face au résultat, ton pronostic, ta voix de 578e, ton député, ton jumeau. Le pipeline est relancé chaque heure les soirs de vote (`soiree.yml`). Formule : « le verdict du matin ». |
| **t34** · méthode et brouillons | Page `/calcul/` « Comment c'est calculé », avec un bouton pour tout effacer ; brouillons `docs/mentions-legales-brouillon.md` et `docs/confidentialite-brouillon.md`. |
| **t36** · qualité | Contrastes corrigés, plan du site, balises de partage, données structurées des députés ; mesure d'audience prête à activer (`docs/audience.md`). |

Tous les tests passent (123 côté pipeline, 37 côté site), le style aussi, et le site se construit (926 pages). Chaque page a été vérifiée dans le navigateur, sur ordinateur et à la taille d'un téléphone.

## 2. Comment tester avant la mise en ligne

L'aperçu local tourne dans le panneau « Navigateur » de l'app (http://localhost:4321). S'il est fermé, relance-le depuis l'app (aperçu « site »). Les données locales sont celles du 7 octobre ; la séance affichée est celle de la semaine du 12 octobre.

Pour repartir de zéro comme un nouveau visiteur : page « Comment c'est calculé » → **Effacer toutes mes réponses de ce navigateur**.

## 3. Ce que tu dois tester (cocher au fur et à mesure)

### Parcours « Jade » (première visite), sur ordinateur puis sur téléphone
- [ ] Accueil : le ticket violet propose **« Prendre ma place · 2 min »**.
- [ ] Quiz : 10 questions, la révélation après chaque réponse, puis « Ta place est prête ».
- [ ] Le gros bouton du résultat dit **« Continuer → 3 votes de plus »** et mène au **lot 1**.
- [ ] Lot 1 : 3 votes (encadrement des loyers, soignants à l'hôpital, justice des mineurs), puis l'écran « Lot terminé » avec le tampon et le carnet.
- [ ] Les 5 lots d'affilée : la précision doit finir à **71 %** (25 votes).
- [ ] Les questions et « Concrètement » des 4 nouvelles cartes (1624, 3055, 2880, 1304) te conviennent. **C'est un choix éditorial : relis-les.**

### La séance de la semaine
- [ ] Accueil après le quiz : le ticket propose **la séance** (3 votes, « Commencer · 2 min »), et à droite « Le verdict · mar. 13 oct. · 15 h » avec un compte à rebours.
- [ ] `/seance/` : les 2 votes du 13 octobre affichent « Les députés n'ont pas encore voté » ; après ta réponse, le **pronostic** (adopté / rejeté) est facultatif ; le 3e vote (déjà tenu) est révélé.
- [ ] Sans carte rédigée, la question est tirée du titre officiel (« Faut-il adopter la proposition de loi… ? ») et « Concrètement » le dit. **Cette formulation de repli te convient-elle ?**
- [ ] Fin de séance : tampon « Séance du 12 oct. », série, précision, pronostic en jeu, rendez-vous du verdict, carnet.
- [ ] `/verdict/` avant le vote : « Pas encore de verdict », avec les votes attendus.

### Le reste
- [ ] Accueil : « Les derniers verdicts » montre « Tu avais voté pour · du côté de la majorité » sur les votes auxquels tu as répondu.
- [ ] Mon hémicycle → **« Trancher des votes passés »** mène au prochain lot.
- [ ] Choisir ton député (code postal) : sur l'accueil, ses votes sur les 3 derniers verdicts face aux tiens.
- [ ] `/calcul/` : relire la page « Comment c'est calculé » (définitions exactes, exemple réel du scrutin n° 8434).
- [ ] Le bouton « Effacer toutes mes réponses » vide bien tout.

### Après la mise en ligne seulement
- [ ] **Lundi 12 octobre** au matin : le passage de nuit choisit la séance et l'enregistre dans `data/semaines/2026-10-12.json`.
- [ ] **Mardi 13 octobre**, de 16 h à minuit : `soiree.yml` relance le pipeline chaque heure ; le verdict apparaît sur `/verdict/` dès la publication du scrutin, au plus tard le lendemain matin. **C'est la porte t26.**

## 4. Ce que toi seul peux faire

1. **Me dire de mettre en ligne.** Pour cela, je pousse la branche et fusionne dans `main` les PR #12 et #13, puis celle de `lots-candidats` (la PR #12 est déjà fusionnée dans la branche). C'est une action sur GitHub, qui lance un déploiement : j'attends ton accord. **À faire avant lundi** pour que la séance du 12 octobre se prépare toute seule.
2. **t26 (porte)** : vivre la vraie séance du 12-13 octobre (30 min) : la faire le lundi, regarder le verdict mardi soir ou mercredi matin.
3. **t35** : relire les brouillons juridiques (`docs/mentions-legales-brouillon.md`, `docs/confidentialite-brouillon.md`) et compléter les **[À VALIDER]** (identité de l'éditeur, contact).
4. **t36** : activer la mesure d'audience sans cookie dans Cloudflare (5 min, `docs/audience.md`), ou décider de ne rien mesurer.
5. **Une question ouverte** : les 10 cartes du quiz n'ont toujours ni thème ni titre court (quiz figé). Faut-il un thème « International » pour l'Ukraine et la défense ?
6. **Facultatif** : avant mardi, une courte session de rédaction des cartes pour les 2 votes du 13 octobre. Sans elle, la séance utilise la question de repli. C'est la future t27, normalement après la porte t26.

## 5. Limites et non vérifié

- `soiree.yml` et la sélection du lundi n'ont jamais tourné sur GitHub : il faut la mise en ligne et un vrai lundi.
- Le verdict a été vérifié sur une semaine passée (6 juillet 2026, deux votes tenus le 7), pas sur un vrai soir de scrutin.
- Pas de Lighthouse : il faudrait l'installer hors du projet, donc te le demander d'abord. Pas de test au lecteur d'écran.
- Écarts assumés avec les maquettes (règle 6 : ce qui n'existe pas est caché) : pas de barre « utilisateurs du site », de duel, d'alerte, de « Partager ma semaine » ni de « Suivre ce texte ».
- La formule « le verdict du matin » est à revoir vers le 28 octobre, avec la mesure du délai de publication (t03).
