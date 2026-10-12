# À tester — session du 9 octobre 2026

> Rapport de Claude Code pour Julien. **Mise à jour du 12 octobre : tout est en ligne** sur https://le578esiege.pages.dev (PR #18 et #19 fusionnées). Les tests ci-dessous se font désormais sur le site en ligne. Deux corrections au rapport : le 3e vote de la séance est le n° 6124 (rave-parties), avec sa carte, et non le logement ; le point 1 de « Ce que toi seul peux faire » est fait.

## 0. Mise à jour du 12 octobre : tes retours du premier test

Tu as fait la séance le 12 octobre, sur ordinateur et sur téléphone : tout marche. Tes retours sont traités. À vérifier sur le site en ligne (https://le578esiege.pages.dev) :

- [ ] **Verdict d'une séance tranchée en partie.** `/verdict/` affiche en tête « 1 vote sur 3 jugé · les 2 autres : mardi 13 oct., 15 h », et un onglet grisé « Verdict après le vote » pour chacun des 2 votes du mardi. Sur l'accueil, le ticket dit « Verdict 1/3 · 1 vote déjà jugé → » ; à la fin de la séance, le bouton dit « Voir le verdict · 1/3 → ».
- [ ] **Ta voix de 578e.** Sur `/verdict/`, vote n° 6124 (rave-parties), toi contre : « Avec la tienne : 78 pour, 68 contre. Il aurait alors suffi que 5 députés changent d'avis… ». Si tu avais voté pour : 79 pour, 67 contre, 6 députés. La même phrase est corrigée à la révélation du quiz, des lots et de la séance.
- [ ] **Mentions légales et confidentialité.** Les liens sont dans le pied de page. Relis `/mentions-legales/` et `/confidentialite/` : ton nom, l'absence d'adresse de contact (renvoi vers les tickets du dépôt GitHub), le lien du dépôt. **Dis-moi si le rendu te convient : je cocherai alors t35.**
- [ ] **Mardi 13 au soir ou mercredi 14 au matin.** Le bandeau et les onglets grisés doivent avoir disparu : les 3 verdicts sont là, avec ta réponse et ton pronostic en face. C'est la porte t26 : je ne la coche pas sans ton accord.

Ce que toi seul peux décider (rien ne bloque le site) :

1. **Une adresse de contact** dédiée au projet, pour les deux pages.
2. **Les points juridiques non confirmés**, listés à la fin de `docs/mentions-legales.md` et de `docs/confidentialite.md` : faire relire par un juriste ou consulter la CNIL, ou les garder tels quels.
3. **La mesure d'audience** : reportée à la fin du projet (t46). Rien à faire d'ici là.

## 0 bis. Mise à jour du 12 octobre : les lots facultatifs 6 à 9 (pas encore en ligne)

Tes 12 cartes de la réserve sont devenues 4 lots facultatifs, à la suite des 5 lots du parcours (t47). Le travail est commité en local sur la branche `lots-facultatifs`, sans être poussé : **dis-moi quand le mettre en ligne**. À tester ensuite sur le site :

- [ ] **Fin du lot 5.** La précision est à **71 %** (25 votes). Le texte dit « Ta place est fiable. Pour l'affiner encore, si tu veux : 4 lots facultatifs de 3 votes. » Le gros bouton dit **« Affiner encore · lot 6 → »**, le second « Mon hémicycle ». Le carnet montre une deuxième rangée, « Pour affiner · facultatif » (lots 6 à 9).
- [ ] **Rien n'est imposé.** Reviens sur `/lots/` sans cliquer : tu vois « Les 5 lots sont faits ! », pas une question. Le résultat du quiz mène à Mon hémicycle, pas au lot 6.
- [ ] **Lots 6 à 9.** L'en-tête dit « Pour affiner · lot 6 sur 9 ». La précision monte à **75 %, 79 %, 82 % puis 84 %** (28, 31, 34 et 37 votes).
- [ ] **Fin du lot 9.** Plus de bouton « Affiner encore » : « Voir mon hémicycle → ». En revenant sur `/lots/` : « Tous les lots sont faits ! » et « Trancher d'autres votes → ».
- [ ] **Accueil**, une fois le parcours et la séance faits : le ticket dit « Votes passés · lot 6 sur 9 · facultatif », « 3 votes de plus pour affiner ta place », bouton « Affiner encore · 2 min ». Les 9 lots faits : « Tu as tranché les 9 lots de votes ».
- [ ] **`/calcul/`**, section « La précision » : le tableau va de 10 à 37 votes.
- [ ] **Sur ton téléphone** : le carnet à deux rangées et les boutons de fin de lot.
- [ ] **Lundi 19 octobre** (si c'est en ligne avant) : l'agenda n'annonçait qu'un vote solennel au 9 octobre (le budget). La séance devrait être complétée par 2 votes du lot 9, avec leur carte (titres de séjour, centrales à charbon), sans intervention.

Ce que tu dois savoir :

1. **La réserve est vide** (`data/reserve.json`). Une semaine creuse est complétée par les cartes des lots, du lot 9 au lot 1 (ton choix du 12 octobre). Un visiteur qui a déjà fait le lot 9 retrouve donc ce vote dans la séance.
2. **Le n° 5106** (Frères musulmans, lot 7) est le vote de l'article unique d'une résolution européenne. Il n'avait pas de page : sa réponse n'aurait pas compté. C'est corrigé ; sa page est étiquetée « Vote sur un article ».
3. **Thèmes des lots 6 à 9** : Sécurité, Économie et Institutions reviennent 3 fois chacun (le plafond de 2 par thème ne vaut que pour les lots 1 à 5).
4. **Un défaut qui existait déjà**, hors de cette tâche : sur « Mon hémicycle », le script commun de l'en-tête s'arrête sur une erreur (deux éléments portent le même attribut `data-tranches`). L'anneau de précision de l'en-tête ne s'y affiche pas. Signalé à la session qui travaille sur l'en-tête.

## 1. Ce qui a été fait

| Tâche | Ce qui existe maintenant |
|---|---|
| **t43** · tes 15 votes | Tes 5 lots figés dans `data/lots.json` ; 4 cartes ajoutées (n° 1624, 3055, 2880, 1304), dont la censure partielle du n° 1624 (Conseil constitutionnel, 19 juin 2025) dans « Vérifié ». |
| **t44** · les lots | Page `/lots/` : 3 votes par lot, révélation après chaque réponse, fin de lot (tampon, précision gagnée, carnet), « Lot suivant ». Le quiz enchaîne sur le lot 1. |
| **t45** · l'accueil | Accueil d'après la maquette ⑤ : le ticket suit le visiteur (quiz → séance → lot → Explorer), les derniers verdicts face à ses réponses, son hémicycle, son député. |
| **t23** · la séance choisie | Chaque lundi, le pipeline choisit 3 votes parmi les votes solennels annoncés à l'agenda ; il complète avec la réserve (tes 13 candidats non retenus ; depuis le 12 octobre, avec les cartes des lots, voir le § 0 bis) ; il détecte les vacances. La sélection est figée pour la semaine. Pour la semaine du 12 octobre : les 2 votes du mardi 13 (violences sexuelles et sexistes ; loi organique sur l'autorité judiciaire) + 1 vote passé. |
| **t24** · la séance | Page `/seance/` : voter avant les députés, pronostic facultatif, tampon, série (gelée pendant les vacances), rendez-vous du verdict. Ta réponse rejoint ton hémicycle dès que le scrutin est publié. |
| **t25** · le verdict | Page `/verdict/` : verdict, marge, ta réponse face au résultat, ton pronostic, ta voix de 578e, ton député, ton jumeau. Le pipeline est relancé chaque heure les soirs de vote (`soiree.yml`). Formule : « le verdict du matin ». |
| **t34** · méthode et brouillons | Page `/calcul/` « Comment c'est calculé », avec un bouton pour tout effacer ; brouillons de mentions légales et de confidentialité (devenus `docs/mentions-legales.md` et `docs/confidentialite.md` le 12 octobre, pages en ligne). |
| **t36** · qualité | Contrastes corrigés, plan du site, balises de partage, données structurées des députés ; mesure d'audience reportée à la fin du projet (t46, `docs/audience.md`). |

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
- [ ] Les 5 lots d'affilée : la précision doit arriver à **71 %** (25 votes). Les lots facultatifs 6 à 9 la portent ensuite à 84 % (voir le § 0 bis).
- [ ] Les questions et « Concrètement » des 4 nouvelles cartes (1624, 3055, 2880, 1304) te conviennent. **C'est un choix éditorial : relis-les.**

### La séance de la semaine
- [ ] Accueil après le quiz : le ticket propose **la séance** (3 votes, « Commencer · 2 min »), et à droite « Le verdict · mar. 13 oct. · 15 h » avec un compte à rebours.
- [ ] `/seance/` : les 2 votes du 13 octobre affichent « Les députés n'ont pas encore voté » ; après ta réponse, le **pronostic** (adopté / rejeté) est facultatif ; le 3e vote (déjà tenu) est révélé.
- [ ] Sans carte rédigée, la question est tirée du titre officiel (« Faut-il adopter la proposition de loi… ? ») et « Concrètement » le dit. **Cette formulation de repli te convient-elle ?**
- [ ] Fin de séance : tampon « Séance du 12 oct. », série, précision, pronostic en jeu, rendez-vous du verdict, carnet.
- [ ] `/verdict/` avant le vote du mardi : le verdict du vote déjà tenu (n° 6124), avec le bandeau « 1 vote sur 3 jugé » (voir le § 0). L'écran « Pas encore de verdict » ne s'affiche que les semaines où aucun vote de la séance n'est encore tenu.

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
3. **t35** : fait en partie le 12 octobre : les pages sont en ligne avec tes trois choix. Reste à confirmer le rendu (voir le § 0).
4. **t36** : faite côté code. La mesure d'audience est reportée à la fin du projet (t46).
5. **Une question ouverte** : les 10 cartes du quiz n'ont toujours ni thème ni titre court (quiz figé). Faut-il un thème « International » pour l'Ukraine et la défense ?
6. **Facultatif** : avant mardi, une courte session de rédaction des cartes pour les 2 votes du 13 octobre. Sans elle, la séance utilise la question de repli. C'est la future t27, normalement après la porte t26.

## 5. Limites et non vérifié

- `soiree.yml` et la sélection du lundi n'ont jamais tourné sur GitHub : il faut la mise en ligne et un vrai lundi.
- Le verdict a été vérifié sur une semaine passée (6 juillet 2026, deux votes tenus le 7), pas sur un vrai soir de scrutin.
- Pas de Lighthouse : il faudrait l'installer hors du projet, donc te le demander d'abord. Pas de test au lecteur d'écran.
- Écarts assumés avec les maquettes (règle 6 : ce qui n'existe pas est caché) : pas de barre « utilisateurs du site », de duel, d'alerte, de « Partager ma semaine » ni de « Suivre ce texte ».
- La formule « le verdict du matin » est à revoir vers le 28 octobre, avec la mesure du délai de publication (t03).
