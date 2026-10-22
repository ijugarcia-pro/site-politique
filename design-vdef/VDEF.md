# Le 578e siège · maquette VDEF « La salle est le menu »

> Spec de référence du design définitif, validé par Julien le 22 octobre 2026. Remplace `docs/design-final/DESIGN-FINAL.md` (« La Séance ») et `docs/refonte-la-seance.md` pour tout ce qui touche à l'apparence et au parcours.
> Maquettes interactives : canevas Claude Design, page « VDEF · Le site complet » (https://claude.ai/artifact/1VD3vDVnxpncGnMrNA6Lg9).
> Dans ce dossier : `captures/` (une image par écran, à regarder avant de coder un écran), `maquettes/` (le code source de chaque écran du canevas : mesures, couleurs et textes exacts). Les images des maquettes s'appellent `/_blob/…` : ce sont les rendus de la salle déjà présents dans `site/public/salle3d/` (correspondance au § 9).
> **Toutes les données des maquettes sont illustratives** (députés, groupes A à E, chiffres, dates, thèmes). Le site affiche les vraies données du pipeline ; ne recopie jamais un nom ou un chiffre de maquette.

## 1. L'idée en une phrase

Pas de pages au sens classique : on se déplace dans la salle de l'Assemblée. Trois vues de la salle font la navigation ; tout le reste s'ouvre en feuilles blanches posées par-dessus la salle.

## 2. Les principes (issus de l'atelier design du 22 oct., doc « Analyse de l'existant et atelier design »)

1. Un écran, une idée, une action principale (une secondaire au plus).
2. Trois niveaux de lecture : **L'essentiel** (visible d'office), **Comprendre** (un geste), **Fouiller** (données brutes et sources).
3. Un seul hémicycle par écran : la salle 3D, jamais un hémicycle 2D en plus (le 2D reste le repli sans WebGL).
4. La salle est l'interface : toucher un siège montre son député.
5. Un seul thème pour tout le site : plus de bascule sombre / clair entre deux pages.
6. Chaque chiffre a sa phrase (« 10 votes comme toi sur 12 », jamais « 83 % » seul).
7. On gagne de la curiosité, pas des points : des paliers liés au nombre de votes tranchés, jamais au contenu d'une réponse.
8. Jamais : capitales forcées, dorure, couleur de parti, classement entre utilisateurs, badge lié à une opinion, 3D obligatoire.

## 3. Les trois vues (la navigation)

| Vue | Rôle | Caméra 3D | Ce qui est posé dessus |
|---|---|---|---|
| **La tribune** | On y tranche les votes ; c'est aussi le tableau de bord | Depuis le sol, face à la tribune ; le pupitre dans le tiers haut de l'écran (la feuille du bas en couvre la moitié basse) | Une grande feuille fixe en bas : cette semaine, le dernier verdict, ton député, tes réponses, la galerie, ton parcours (capture 05) |
| **La salle** | Voir tout le monde | Depuis le perchoir (l'actuelle CAM 1) | Des repères (toi, ton jumeau, ton opposé, ton député), un panneau « Montrer dans la salle », la carte du député touché (capture 09) |
| **Ta place** | Qui vote comme toi | Vue subjective depuis le siège de ton jumeau (les yeux du personnage) | Une feuille à gauche : ton jumeau, ton opposé, les 3 groupes les plus proches, « Revoir mes votes » (capture 10). S'ouvre à 10 votes ; avant, l'entrée est grisée avec un cadenas |

Barre du haut (ordinateur), toujours flottante sur la salle : logo à gauche ; les trois vues au centre, en pastilles ; à droite, la loupe (→ la galerie) et l'anneau de progression « 12 votes · Palier 1 sur 3 » (→ ton parcours). Mode focus (quiz, séance) : la barre devient « Quitter » + progression en segments (captures 02, 06).
Téléphone : une barre en bas, 4 entrées : Tribune, Salle, Ta place, Galerie (captures T1 à T5).

## 4. Les écrans, leur adresse et leur capture

| # | Écran | Adresse | Capture | Remarques |
|---|---|---|---|---|
| 00 | Plan du site | (doc) | `00-plan-du-site` | La carte de tout ce qui suit |
| 01 | La tribune, première visite | `/` (0 vote) | `01-tribune-premiere-visite` | Grande carte noire « Prends le 578e siège », le reste public ouvert, les paliers en cadenas |
| 02 | Quiz, une question | `/quiz/` | `02`, `02b` | Feuille à droite sur la tribune ; réponse puis « Voir la salle » |
| 03 | Quiz, la révélation | `/quiz/` | `03-quiz-revelation` | La salle (vue Salle) prend les couleurs du vote ; feuille à droite : verdict, « Tu es avec la majorité : 301 députés ont voté comme toi », progression 3/10 |
| 04 | Ta place est prête | `/quiz/` (10e réponse) | `04-ta-place-est-prete` | Palier 1 débloqué ; le personnage marche jusqu'au siège ; top 3 groupes ; « Voir depuis ton siège », « Partager », « 3 votes de plus » |
| 05 | La tribune, chaque semaine | `/` | `05-tribune` | Le tableau de bord |
| 06 | Trancher un vote | `/seance/`, `/lots/` | `06`, `06b` | Comme 02, chips « Ils votent mardi à 16 h » |
| 07 | Séance terminée | `/seance/` | `07-seance-terminee` | « A voté. », tes 3 réponses, rappel du verdict, votes passés |
| 08 | Le verdict | `/verdict/` | `08-verdict` | La salle aux couleurs du vote ; feuille : issue, « il aurait suffi que N députés changent d'avis », toi / ton jumeau / ton député |
| 09 | La salle | `/salle/` (nouvelle) | `09-la-salle` | Repères, panneau de filtres, carte d'un député |
| 10 | Ta place | `/ta-place/` (nouvelle, remplace `/hemicycle/`) | `10-ta-place` | Seulement jumeau, opposé, top 3, « Revoir mes votes » |
| 11 | Tes réponses | `/tes-reponses/` (nouvelle) | `11-tes-reponses` | Filtres, groupées par mois |
| 12 | Ton parcours | `/parcours/` (nouvelle) | `12-ton-parcours` | Paliers, dossiers par thème, série |
| 13 | La galerie | `/explorer/` (nom affiché : « La galerie ») | `13-la-galerie` | Recherche, thèmes, qui divisent, plus serrés, tous les votes |
| 14 | La page d'un vote | `/votes/[numero]/` | `14a`, `14b`, `14c` | Trois onglets : L'essentiel, Comprendre, Fouiller |
| 15 | Le dossier d'un thème | `/dossiers/[theme]/` (nouvelle) | `15-dossier-theme` | Le fil des votes du thème ; la synthèse personnelle s'ouvre à 3 votes sur le thème |
| 16 | Trouver ton député | `/deputes/` | `16-trouver-ton-depute` | Code postal, choix de la circonscription, recherche par nom, groupes |
| 17 | La fiche d'un député | `/deputes/[uid]/` | `17-fiche-depute` | Son siège dans la salle, « elle et toi », ses votes face aux tiens |
| 18 | Pages de service | `/calcul/`, `/confidentialite/`, `/mentions-legales/`, `/etat/`, `404` | `18-comment-c-est-calcule` | Un seul gabarit de feuille, sous-navigation en pastilles |
| T1–T6 | Téléphone | mêmes adresses | `T1` à `T6` | Image de la salle en haut, feuille qui monte, barre du bas ; T6 = la story « Je siège à la place de… » |

## 5. Les paliers

| Palier | Seuil | Ce qui s'ouvre |
|---|---|---|
| Départ | 0 vote | Tout le public : la tribune, la salle, la galerie, les pages de vote, les députés, ton député, les verdicts |
| 1 · Ta place | 10 votes | Le personnage s'assoit sur le siège du jumeau ; la vue « Ta place » ; « Tes réponses » complète |
| 2 · La salle éclairée | 25 votes | Dans la vue Salle, chaque siège s'éclaire selon ses votes communs avec toi (intensités) ; ta place est dite fiable |
| 3 · Ton bilan | 40 votes | Une story « ton année à l'Assemblée » à partager |
| Dossiers | 3 votes sur un thème | La synthèse personnelle du dossier (ton jumeau sur le thème, ta place sur le thème). La liste des votes du thème reste publique avant |

« Votes » = réponses pour ou contre à des votes de la matrice (les « Je ne sais pas » ne comptent pas, comme pour la précision). Un palier franchi s'annonce une seule fois (pastille noire « Palier 1 débloqué · Ta place », capture 04).

## 6. Les jetons

**Couleurs**
| Rôle | Valeur |
|---|---|
| Encre (titres, texte fort, boutons pleins, « toi ») | `#121212` |
| Texte courant | `#3A3A3A` |
| Texte secondaire, petites légendes | `#5E5E5E` (6,4:1 sur blanc) |
| Inactif, cadenas | `#6B6B6B` |
| Feuille | `#FFFFFF` |
| Surface des cartes, pastilles, champs | `#F2F2F2` |
| Filets | `#E7E7E7` |
| Bord des boutons secondaires | `#D9D9D9` |
| Pointillé « à débloquer » (décor) | `#BDBDBD` |
| Pour / Contre / Abstention | `#2F7BFF` / `#FF6A3D` / `#FFC531` (inchangés) |
| Absent | `#8A8A8A` plein ; non-votant : même gris en contour, jamais confondus |
| Fond derrière la salle | `#2A211B` |

Aucune autre couleur. Le rouge de régie et la lumière dorée de « La Séance » disparaissent.

**Typographie** : Bricolage Grotesque (titres, chiffres, issues « Adopté ») en 700 ou 800 ; Figtree (tout le reste) en 400 à 700. Jamais de capitales forcées. Échelle : titre d'écran 46–56 px (téléphone 27–30), titre de section 22–28, titre de carte 17–24, issue « Adopté » 56–72, chiffres 28–40, texte 16–18, interface 14–15, légende 13 minimum. Interlignage du texte 1,45–1,6.
Polices auto-hébergées : `@fontsource-variable/bricolage-grotesque` et `@fontsource-variable/figtree` (5.3.0), aucun appel à Google Fonts.

**Formes** : feuille 24 px de rayon (téléphone : 24 px en haut seulement) ; cartes 16–20 ; boutons, pastilles, champs et puces en pilule (999). Ombre des éléments flottants : `0 4px 16px rgba(0,0,0,.18)` ; des feuilles : `0 12px 40px rgba(0,0,0,.28)`. Marges : 24 px entre la feuille et le bord de l'écran ; barre du haut à 20 px du haut. Cibles tactiles ≥ 44 px.

## 7. Les composants

- **Barre du haut / barre du bas** (§ 3).
- **Feuille** : posée sur la salle, à droite (vote, verdict, révélation : 460–480 px), à gauche (Ta place : 440–460 px), en bas (tribune : toute la largeur, 520 px de haut), ou pleine page sur la salle floutée (pages de lecture : 960–1200 px de large, `filter: blur(18px) brightness(.72)` sur l'image ou un rendu figé de la salle).
- **Carte** : surface `#F2F2F2`, petite étiquette grise en haut, chevron si elle mène quelque part. Variante noire pour la chose la plus importante de l'écran (une seule par écran).
- **Repère** dans la salle : point de 22 px + étiquette en pilule. Toi : noir à anneau blanc ; les autres : blanc à anneau noir.
- **Barre de vote** : pour, contre, abstention, absents, dans cet ordre, pilule de 8 à 14 px.
- **Bouton** : pilule noire (action principale), pilule blanche bordée (secondaire).
- **Pastille** (chip) : `#F2F2F2`, 13 px gras ; variante noire pour un état actif ou une échéance.
- **Onglets de niveau** : L'essentiel · Comprendre · Fouiller, dans une pilule grise, l'actif en noir.
- **Palier** : rond plein coché (débloqué), anneau de progression (en cours), cadenas en pointillé (verrouillé).

## 8. Le texte

Tutoiement, phrases courtes, langage courant d'abord ; l'intitulé officiel n'apparaît qu'au niveau « Fouiller ». La question d'une carte de vote est le titre ; sans carte, le titre court du scrutin. « À N voix près » est toujours accompagné de « il aurait suffi que N députés changent d'avis » au moins une fois par écran.

## 9. Les images des maquettes

| Dans les maquettes | Fichier du site |
|---|---|
| `/_blob/044e6af…` (salle de jour) | `site/public/salle3d/fond-salle.webp` |
| `/_blob/383414f…` (tribune) | `site/public/salle3d/fond-tribune.webp` |
| `/_blob/dcb642f…`, `/_blob/761b240…` (téléphone) | `fond-salle-telephone.webp`, `fond-tribune-telephone.webp` |
| `/_blob/7d171cd…` (depuis ton siège) | rendu de la vue « Ta place » (pas d'image fixe : elle dépend du siège) |
| `/_blob/daca37c…` (salle aux couleurs d'un vote) | retouche d'illustration : sur le site, ce sont les voyants de la vraie salle |
