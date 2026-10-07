# PLANNING — Site Politique · « Le 578e siège »

> Fichier de référence pour Claude Code, versionné dans `docs/PLANNING.md` depuis le 7 octobre 2026. Claude Code le relit en début de session et le met à jour en fin de session (§ 0).
> Dernière mise à jour : 7 octobre 2026 (t02, t04 à t10 et t12 faites, go pour la phase 1, t11 livrée ; périmètre portfolio, fonctions centrées sur l'utilisateur reportées ; relevé de t03 démarré ; passage à zéro euro : vulgarisation dans une session Claude Code hebdomadaire, phase 4 revue). Tableau de suivi visuel : https://claude.ai/artifact/6qqYu8GKCMVHohkmZjN23h

## 0. Comment utiliser ce fichier

- Ce planning est la source de vérité sur **quoi faire, dans quel ordre, et à quel critère une tâche est terminée**. `CLAUDE.md` donne les règles du projet ; ce fichier donne le calendrier et le détail.
- **Une tâche = une session Claude Code.** Au début d'une session : relire `CLAUDE.md`, `docs/decisions.md`, puis la fiche de la tâche ci-dessous et ses dépendances.
- À la fin d'une session : cocher la tâche dans la section « Suivi » (§ 2), consigner toute décision structurante dans `docs/decisions.md` (entrée datée), et résumer à Julien : ce qui a été fait, ce qui a échoué, ce qui n'a pas pu être vérifié, la tâche suivante.
- Ne jamais commencer une tâche dont une dépendance n'est pas cochée. Ne jamais sauter une **porte** (décision go / no-go) sans accord explicite de Julien.
- Julien n'a que **~5 h par semaine** et ne code pas : tout ce qui peut être fait par Claude Code l'est. Les tâches « Julien » sont limitées à ce que Claude ne peut pas faire (comptes, clés, secrets, jugement éditorial, validation juridique, tests sur son téléphone). Claude prépare chaque tâche Julien : instructions pas à pas, liens, vérifications à faire.
- Avant d'installer quoi que ce soit hors du projet (outil global, service payant) : demander à Julien.
- Répartition cible : **~90 % du travail par Claude Code** (≈ 35 tâches sur 41, ≈ 14 sessions-semaines) ; **~10 % par Julien** (≈ 17 h au total sur 19 semaines, hors sessions qu'il lance).

## 1. Le projet en bref

**Produit.** Un site qui rend les votes de l'Assemblée nationale accessibles. Chaque semaine, l'utilisateur tranche 3 vrais votes **avant** les députés (scrutins solennels annoncés à l'agenda), puis découvre le verdict le jour du scrutin. Ses réponses dessinent son hémicycle : groupe le plus proche, jumeau parmi les 577 députés, jauge de précision. Promesse : information à grande échelle, faits sourcés, **sans commentaire politique**, aucun axe gauche-droite.

**Public.** Des gens qui ne suivent pas la politique (« Jade ») et des gens qui cherchent leur député (« Marc »). Style app grand public (Duolingo / Spotify Wrapped), desktop-first, ton neutre et factuel, en français.

**Direction visuelle.** Maquette V5 « Le 578e siège » : polices Fredoka (titres) + Nunito (texte) ; violet #7C4DFF ; pour #2F7BFF, contre #FF6A3D, abstention #FFC531, absent #DFE3EB. Navigation à 3 onglets : Cette semaine · Mon hémicycle · Explorer. Maquettes : https://claude.ai/artifact/1VD3vDVnxpncGnMrNA6Lg9 (pages « V5 · Le 578e siège »).

**Mode de vote hybride.** « Vote avant eux » pour les scrutins solennels (connus à l'avance par l'agenda) ; « Et toi, qu'aurais-tu voté ? » pour tous les autres votes.

**Boucle produit.** Séance de la semaine (3 à 5 votes, < 3 min) → verdict → hémicycle perso qui se précise → partage / duel → récap du dimanche → nouvelle séance.

**Garde-fous.** Rien ne récompense une opinion ; pas de classement public ; 2 notifications max par semaine hors alertes demandées ; réponses stockées dans le navigateur par défaut (opinions politiques = données sensibles RGPD, consentement exprès pour tout compte) ; barre « utilisateurs du site, pas un sondage » masquée sous 200 participants.

**Éléments coupés (ne pas réintroduire) :** unités façon Duolingo, page Hémicycle séparée, « Le saviez-vous », défi flou, série sans geste, amendements illustratifs, entretiens / déclarations publiques des députés, axe gauche-droite.

## 2. Suivi (à cocher par Claude Code à chaque fin de session)

Légende : 🤖 Claude Code · 👤 Julien · 🤝 ensemble · ◆ porte (décision)

### Phase 0 — Faisabilité data (S1–S3, 5 → 25 oct. 2026)
- [x] t01 🤝 Dépôt GitHub + session d'initialisation *(fait le 7 oct. 2026)*
- [x] t02 🤖 Inventaire des fichiers open data *(fait le 7 oct. 2026 ; PR #1 fusionnée)*
- [ ] t03 🤖 Mesure du délai de publication (action horaire) *(livrée le 7 oct. 2026, PR #2 fusionnée ; relevé démarré le 7 oct., à cocher après 3 semaines sans intervention, vers le 28 oct.)*
- [x] t04 👤 Vérifier que la mesure tourne *(fait le 7 oct. 2026 par Claude Code, à la demande de Julien)*
- [x] t05 👤 Clé API Anthropic plafonnée + secret GitHub *(fait le 7 oct. 2026 par Julien ; sans usage depuis le passage à zéro euro, clé à révoquer)*
- [x] t06 🤖 Test du rattachement vote → texte sur 100 scrutins *(fait le 7 oct. 2026 ; branche locale, en attente de push et de fusion)*
- [x] t07 🤖 Prototype de vulgarisation sur 5 textes *(fait le 7 oct. 2026 ; branche `vulgarisation-essai` poussée, en attente de PR et de fusion)*
- [x] t08 👤 Relire les 5 fiches vulgarisées *(fait le 7 oct. 2026 : « tout est bon »)*
- [x] t09 🤖 Rapport de faisabilité *(fait le 7 oct. 2026 ; délai pas encore mesuré, formule du verdict à trancher vers le 28 oct.)*
- [x] t10 👤 ◆ Décision Go / No-go et formule du verdict *(go le 7 oct. 2026 ; formule du verdict à trancher vers le 28 oct., « verdict du matin » par défaut)*

### Phase 1 — Socle data (S4–S5, 26 oct. → 8 nov.)
- [ ] t11 🤖 Ingestion de nuit et archives avec empreinte *(livrée le 7 oct. 2026 ; à cocher après deux nuits sans intervention)*
- [x] t12 🤖 Les 11 tables DuckDB et la reconstitution des absents *(fait le 7 oct. 2026)*
- [ ] t13 🤖 Les 6 contrôles automatiques et l'arrêt du build
- [ ] t14 🤖 Page « État des données »
- [ ] t15 👤 ◆ Vérifier 5 scrutins contre le site de l'Assemblée

### Phase 2 — Site et premiers écrans réels (S6–S8, 9 → 29 nov.)
- [ ] t16 👤 Compte Cloudflare (sous-domaine gratuit)
- [ ] t17 🤖 Site Astro + design system 578e siège
- [ ] t18 🤖 Page vote branchée sur les vrais scrutins
- [ ] t19 🤖 Fiche député + recherche par code postal
- [ ] t20 👤 Valider les 10 votes du quiz d'entrée
- [ ] t21 🤖 Quiz d'entrée, résultat, jumeau, stories
- [ ] t22 👤 Tester le parcours complet (ordinateur + téléphone)

### Phase 3 — La séance de la semaine (S9–S10, 30 nov. → 13 déc.)
- [ ] t23 🤖 Agenda et sélection automatique des 3 votes
- [ ] t24 🤖 Séance en mode focus, pronostic, réponses locales
- [ ] t25 🤖 Verdict et passages horaires des soirs de scrutin
- [ ] t26 👤 ◆ Vivre une vraie séance du lundi au verdict

### Phase 4 — Vulgarisation hebdomadaire (S11–S12, 14 → 27 déc.)
- [ ] t27 🤖 Session hebdomadaire de rédaction dans Claude Code, 7 contrôles, repli sans cartes
- [ ] t28 🤖 Thèmes, signalements, retrait automatique *(signalements reportés : décision du 7 oct.)*
- [ ] t29 👤 Bilan des 10 premières fiches validées

### Phase 5 — Le service (S13–S15, 28 déc. → 17 janv. 2027)
- [ ] t30 👤 Projet Supabase + expéditeur Brevo *(reportée : décision du 7 oct.)*
- [ ] t31 🤖 Comptes facultatifs, lois et députés suivis *(reportée)*
- [ ] t32 🤖 Alertes d'étape et récap du dimanche *(reportée)*
- [ ] t33 🤖 Le duel entre amis *(reportée)*
- [ ] t34 🤖 « Comment c'est calculé », mentions légales, confidentialité (brouillons)
- [ ] t35 👤 Valider mentions légales et confidentialité
- [ ] t36 🤖 Audience sans cookies, accessibilité, performance, SEO

### Phase 6 — Bêta privée et lancement (S16–S19, 18 janv. → 14 fév. 2027)
- [ ] t37 👤 Inviter 10 à 20 proches en bêta privée
- [ ] t38 🤖 Corriger les retours de la bêta (1 session / semaine)
- [ ] t39 👤 Chaque lundi : vérifier que la séance est sortie seule (15 min)
- [ ] t40 👤 ◆ Décision de lancement public
- [ ] t41 🤝 Préparer le lancement : LinkedIn, portfolio Factory, story

**Calendrier indicatif.** Semaine 1 = lundi 5 octobre 2026. Lancement public visé mi-février 2027, **seulement après 4 semaines de séance consécutives sans aucune action humaine** (la session hebdomadaire de rédaction des fiches, prévue, ne compte pas comme une intervention : sans elle, les votes sortent sans cartes). Les dates sont indicatives : le critère de sortie d'une phase prime sur la date.

## 3. Principes d'exécution (valables pour toutes les tâches)

1. **Tout est testé.** Chaque module du pipeline a ses tests pytest. `uv run pytest` et `uv run ruff check .` doivent passer avant tout commit.
2. **Rien ne se publie s'il échoue aux contrôles.** Un build en échec conserve la dernière version publiée et lève une alerte.
3. **Clés = identifiants officiels** (PA… députés, PO… groupes), jamais les noms.
4. **Données de maquette = illustratives** et marquées comme telles tant qu'elles ne viennent pas du pipeline.
5. **Petits commits, un par sous-étape logique**, message en français à l'impératif ou au passé, sans pousser sans accord tant que Julien relit (jusqu'à la phase 2 au moins).
6. **Pas d'usine à gaz.** Préférer la solution la plus simple qui tient : fichiers statiques, pas de base pour les données publiques, pas de dépendance non justifiée.
7. **Honnêteté sur les limites.** Si une mesure ou une vérification n'a pas pu être faite, le dire dans le résumé de fin de session et dans le fichier concerné.
8. **Aucune donnée sensible côté serveur par défaut.** Les réponses de l'utilisateur restent dans le navigateur (localStorage).
9. **Neutralité éditoriale.** Les textes vulgarisés décrivent ce que dit le texte, citent un article, ne jugent pas. Pas de formulation favorable ou défavorable.
10. **Zéro euro.** Le projet ne coûte rien (décision du 7 octobre 2026) : aucun appel à l'API Anthropic, aucun service payant, chaque service dans son offre gratuite. La rédaction se fait dans la session Claude Code hebdomadaire de Julien. Toute dépense, même minime, est soumise à Julien.

## 4. Référence technique (à relire au besoin)

### 4.1 Architecture
Tâche GitHub Actions chaque nuit (6 h UTC) + chaque heure de 16 h à minuit les jours de scrutin solennel :
`récupérer (si modifié) → normaliser (Python + DuckDB, 11 tables) → contrôler (6 règles) → calculer → joindre les fiches validées (si l'empreinte du texte correspond) → exporter des JSON statiques → déployer sur Cloudflare Pages`. Les fiches sont rédigées chaque semaine dans une session Claude Code lancée par Julien (abonnement, aucun appel payant), puis contrôlées, validées par lui et versionnées dans le dépôt.
Site statique (Astro). Calculs personnels (accord, groupe le plus proche, jumeau, précision) dans le navigateur à partir de `matrice.json`. Supabase uniquement pour : comptes facultatifs, suivis (lois, députés), alertes, signalements, agrégats consentis. E-mails via Brevo.

### 4.2 Sources
- Open data de l'Assemblée nationale, 17e législature (Licence ouverte) : scrutins, députés / mandats / organes, historique des mandats, agenda, dossiers législatifs, textes et amendements. Archive des scrutins : `https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip`
- data.gouv.fr : codes postaux, communes → circonscriptions, contours des circonscriptions. Base Adresse Nationale pour la saisie de rue.
- Projet voisin à étudier pour ses pièges : https://github.com/denvi44/kivotkoi

### 4.3 Règles de données
- Un député occupe **exactement une case par scrutin** : pour, contre, abstention, non-votant, absent.
- Les absents ne sont pas listés dans les fichiers (≈ 135 votants par scrutin ordinaire) : les reconstituer depuis les appartenances aux groupes **à la date du vote**. Non-votant ≠ absent.
- Groupes mal référencés (« PO0 » ou identifiants invalides) : à déduire des appartenances.
- Motions de censure : exclues des calculs d'accord (seuls les « pour » sont publiés). Mise au point : affichée, mais calcul sur le vote officiel.
- Dissident : vote opposé à la position majoritaire de son groupe ; jamais pour les non-inscrits ; une abstention n'est pas une dissidence.
- Voix pour inverser un résultat : `P − R + 1` si adopté, `R − P` si rejeté (P = voix pour, R = suffrages requis publiés avec le scrutin).
- Jumeau : classement par accord lissé `(m+2)/(n+4)` (m = votes identiques, n = votes en commun), affiché à partir de **10 votes en commun**. Précision V1 : `1 − e^(−n/20)` (fiable vers 25 votes).
- Lien scrutin → dossier législatif : mesuré en t06, fiable à 99,8 % en combinant amendement retrouvé, actes du dossier, titre du texte et agenda (`pipeline/rattachement.py`, docs/rattachement.md). Ne pas utiliser `objet.dossierLegislatif` du scrutin (un tiers seulement, parfois faux).

### 4.4 Les 11 tables DuckDB
`depute, mandat, groupe, appartenance, scrutin, vote, position_groupe, dossier, etape, vote_prevu, contenu`.

### 4.5 Les 6 contrôles du pipeline
1. **Partition** : une case par député et par scrutin.
2. **Totaux** : égaux au décompte officiel du scrutin.
3. **Effectifs** : effectifs de groupes cohérents.
4. **Non-régression** : les résultats déjà publiés ne changent pas sans raison.
5. **Schéma** : les fichiers source ont la structure attendue.
6. **Fraîcheur** : l'archive n'est pas anormalement ancienne.
Échec de partition ou de totaux → le scrutin est mis de côté, les autres passent. Échec d'effectifs, de non-régression ou de schéma → build arrêté + alerte (issue GitHub automatique).

### 4.6 Les 7 contrôles de vulgarisation
Sortie JSON stricte (question fermée, phrase « Concrètement », 3 cartes « Ce que ça change »). Les 7 contrôles automatiques portent notamment sur : validité du JSON, longueur, chaque carte cite un article réel du texte, question fermée et neutre, absence de jugement ou de vocabulaire partisan, cohérence avec l'exposé des motifs, absence de chiffre non présent dans la source. *(Liste exacte figée le 7 octobre 2026 dans `docs/vulgarisation-controles.md` : format, longueurs, article réel avec extrait mot pour mot, question fermée, vocabulaire neutre, chiffres présents dans la source, fidélité jugée par une relecture séparée, faite par un agent qui ne voit que la fiche, les articles cités et l'exposé des motifs ; puis validation par Julien.)* Échec → une nouvelle tentative → sinon **repli** : le vote est publié sans cartes, avec l'objet officiel et le lien. Mention affichée : « Résumé généré automatiquement à partir du texte officiel » + lien vers l'article cité.

### 4.7 Arborescence du dépôt
```
pipeline/      ingestion, normalisation, contrôles, calculs, export (Python)
scripts/       scripts ponctuels d'exploration et de mesure
data/raw/      archives téléchargées (non versionnées)
data/mesures/  mesures versionnées (délai de publication…)
docs/          décisions, rapports, inventaires, ce planning
tests/         tests pytest
site/          le site (Astro), créé en phase 2
.github/workflows/  ci.yml, delai-publication.yml, nuit.yml, soiree.yml
```

### 4.8 Commandes
`uv sync` · `uv run pytest` · `uv run ruff check .` · `uv run python -m scripts.<nom>` (ex. `uv run python -m scripts.verifier_sources`)

---

## 5. Phase 0 — Faisabilité data (S1–S3)

**Objectif.** Lever les deux inconnues avant d'investir : (1) le délai entre un scrutin et sa présence dans l'archive open data ; (2) la fiabilité du rattachement scrutin → texte de loi. Valider aussi que la vulgarisation automatique est de qualité suffisante. **Sortie de phase : décision go / no-go (t10), fin octobre.**

### t01 🤝 Dépôt GitHub + session d'initialisation — FAIT (7 oct.)
- **Livrable :** `CLAUDE.md`, structure du dépôt, `docs/decisions.md`, `docs/questions-ouvertes.md`, CI verte, `scripts/verifier_sources.py`, `tests/test_socle.py`.
- **Points à confirmer au début de t02 :** CI verte sur GitHub, résultat de `verifier_sources.py` (code HTTP, taille, date de dernière modification de l'archive), éventuels échecs consignés.
- **Confirmé le 7 oct. :** CI verte ; `verifier_sources.py` → HTTP 200, 26 666 197 octets. La date de modification lue (04 h 26 GMT) venait d'un cache de 4 h : voir t02.

### t02 🤖 Inventaire des fichiers open data — S1, 1 session
- **Dépend de :** t01.
- **À faire :**
  1. Créer `scripts/inventaire.py` : télécharge (dans `data/raw/`, non versionné) les archives JSON de la 17e législature : Scrutins, députés actifs + mandats + organes, historique des mandats, agenda, dossiers législatifs.
  2. Pour chaque archive : nombre de fichiers, taille, structure d'un exemple réel, champs utiles aux écrans (cf. § 4.3–4.4), champs manquants ou incohérents.
  3. Documenter explicitement les pièges : absents non listés, identifiants de groupe invalides, motions de censure, mises au point, non-votants.
  4. Noter pour chaque archive l'URL, la licence, la fréquence de mise à jour observée.
- **Livrable :** `docs/inventaire.md`.
- **Critère de fin :** un lecteur qui n'a jamais vu les fichiers peut écrire `normalize.py` à partir du seul inventaire ; chaque affirmation est étayée par un exemple réel.
- **Ne pas faire :** construire le pipeline, normaliser, ou toucher au site.
- **Réalisé (7 oct.) :** les noms diffèrent de la fiche : `scripts/inventaire_open_data.py` et `docs/inventaire-open-data.md`, avec les mesures dans `data/mesures/inventaire_open_data.json`. Le rapport donne la structure de chaque archive, avec un exemple réel par champ. L'inventaire couvre aussi les amendements, les codes postaux, la table communes → circonscriptions de 2017 et les contours. Pièges documentés : absents non listés, groupe `PO0` dans 14 scrutins, motions de censure, mises au point, non-votants, éléments tantôt objet tantôt liste, deux formes de nul. Fréquence de mise à jour : le serveur garde les fichiers 4 h en cache. Le serveur d'origine montre plusieurs régénérations par jour ; toute requête porte désormais un paramètre anti-cache.

### t03 🤖 Mesure du délai de publication — S1, 1 session
- **Dépend de :** t01.
- **À faire :**
  1. `.github/workflows/mesure-delai.yml` : action **horaire** qui télécharge `Scrutins.json.zip`.
  2. Script de comparaison : repère les scrutins absents du passage précédent.
  3. Ajouter à `data/mesures/delai.csv` : uid, numéro, type de vote (solennel ou non), date et heure du scrutin, heure de première apparition dans l'archive, délai calculé.
  4. Commit automatique **uniquement si le fichier change** (pas de commits vides).
  5. Script de synthèse : délai médian et maximal, séparément pour les scrutins solennels.
  6. Tests pytest sur la logique de détection (jeux de données factices).
- **Livrable :** `data/mesures/delai.csv` + `.github/workflows/mesure-delai.yml` + script de synthèse.
- **Critère de fin :** premier passage de l'action vert ; `delai.csv` existe ; le workflow tourne trois semaines sans intervention.
- **Réalisé (7 oct.) :** les noms diffèrent de la fiche : `.github/workflows/delai-publication.yml`, `scripts/mesurer_delai_publication.py`, et les mesures dans `data/mesures/delai_publication/` (`scrutins.csv` tient lieu de `delai.csv`, plus `versions.csv` et `etat.json`). La synthèse est générée dans `docs/delai-publication.md`. L'heure d'un vote n'est pas publiée : le délai est encadré par le début et la fin prévue de la séance, lus dans l'agenda, et calculé dans la synthèse plutôt que dans le CSV. Chaque scrutin est daté par la date de modification de la première version de l'archive qui le contient, et non par l'heure du relevé. Les tests utilisent un serveur simulé. **Reste à faire :** 3 semaines de relevé sans intervention (PR #1 et #2 fusionnées le 7 oct., premier passage vert : voir t04).

### t04 👤 Vérifier que la mesure tourne — S1, 15 min
- Onglet *Actions* du dépôt : le premier passage est vert et `data/mesures/delai.csv` existe.
- **Claude Code prépare** : un court message récapitulatif avec le lien direct vers l'onglet Actions et ce qu'on doit y voir.
- **Réalisé (7 oct.) :** fait par Claude Code à la demande de Julien. PR #1 puis #2 fusionnées dans `main`. Premier passage lancé à la main (run 37614612426) : vert. Il pose la référence (archive du 7 oct. à 10 h 26 GMT, scrutins 1 à 8 560) et le bot a commité `data/mesures/delai_publication/` et `docs/delai-publication.md`. Le relevé tourne ensuite seul à la minute 7 de chaque heure : https://github.com/ijugarcia-pro/site-politique/actions/workflows/delai-publication.yml
- **Incident (7 oct.) :** GitHub n'a déclenché aucun passage programmé à la minute 7 (12 h 07, 13 h 07, 14 h 07 UTC), alors que le workflow était actif. Le cron est déplacé à la minute 23 (branche `normalisation`). À vérifier : des passages programmés doivent apparaître dans l'onglet Actions. Les 3 semaines de relevé ne partent que du premier passage programmé réussi.

### t05 👤 Clé API Anthropic plafonnée — S2, 20 min
- Console Anthropic : créer une nouvelle clé, plafond de dépense mensuel bas (10 € suffisent au début). Dans GitHub : *Settings → Secrets → Actions → `ANTHROPIC_API_KEY`.*
- **Ne jamais** coller la clé dans le chat ni dans le dépôt. `.env` est ignoré par git ; `.env.example` liste les variables.
- **Réalisé (7 oct.) :** Julien a créé la clé et le secret GitHub `ANTHROPIC_API_KEY`. *(Le même jour, passage à zéro euro : la clé n'a plus d'usage. Le secret peut être supprimé et la clé révoquée.)* Le compte dispose d'environ 4 € de crédit. La clé n'existe que dans GitHub : les appels à l'API passent donc par un workflow GitHub Actions, et non par le poste.

### t06 🤖 Test du rattachement vote → texte — S2, 1 session
- **Dépend de :** t02.
- **À faire :**
  1. Échantillon de **100 scrutins variés** : solennels, ensemble d'un texte, articles, amendements, motions.
  2. Deux méthodes de rattachement au dossier législatif : (a) via les **actes du dossier** qui référencent le scrutin ; (b) via l'**analyse du libellé** (« amendement n° … », « l'ensemble du projet de loi … »).
  3. Mesurer le taux de réussite **par méthode et par type de scrutin** ; lister tous les échecs avec la cause.
  4. Vérifier à la main un échantillon des rattachements « réussis » pour détecter les faux positifs.
- **Livrable :** `docs/rattachement.md` + script reproductible.
- **Critère de fin :** taux chiffrés par méthode et type ; liste des échecs ; recommandation (quels types de scrutins peuvent avoir « Ce que ça change », lesquels non).
- **Réalisé (7 oct.) :** `docs/rattachement.md`, généré par `uv run python -m scripts.mesurer_rattachement`. La logique réutilisable est dans `pipeline/rattachement.py`, testée dans `tests/test_rattachement.py`. Les mesures sont dans `data/mesures/rattachement/` : `echantillon.csv` (les 100 scrutins), `verification.csv` (vérification à la main) et `synthese.json`. Trois méthodes au lieu de deux : (a) les actes du dossier ; (b) le libellé, où l'amendement est retrouvé dans l'archive des amendements, sinon le titre du texte est comparé aux textes déposés ; (c) l'agenda de la séance. S'y ajoute leur combinaison. Résultat : 99,8 % des 8 560 scrutins rattachés (97 sur 100 dans l'échantillon), aucun faux positif sur 97 vérifications à la main, un seul désaccord avec le dossier déclaré par l'Assemblée, qui est une erreur de l'open data, vérifiée sur le site officiel (scrutin 6758). La vérification à la main compare les titres et les textes de chaque dossier ; un seul scrutin a été contrôlé sur assemblee-nationale.fr. Recommandation : « Ce que ça change » pour l'ensemble d'un texte, une partie de budget ou une résolution ; pour un article, à trancher en t07 ; non pour les amendements, les motions et les votes sans texte. Reste pour t07 : passer du dossier au texte précis examiné (piste notée dans le rapport).

### t07 🤖 Prototype de vulgarisation — S2, 1 session
- **Dépend de :** t05, t06.
- **À faire :**
  1. Choisir 5 textes votés récemment en scrutin solennel, de thèmes variés.
  2. Pour chacun : appel à l'API Anthropic (clé `ANTHROPIC_API_KEY`) avec le texte et l'exposé des motifs ; sortie **JSON strict** : question fermée, phrase « Concrètement », 3 cartes citant chacune un article.
  3. Figer et implémenter les **7 contrôles automatiques** (voir § 4.6) dans `docs/vulgarisation-controles.md`.
  4. Mesurer le coût en jetons par texte et projeter le coût mensuel.
- **Livrable :** `docs/vulgarisation-essai.md` : résultat brut, contrôles passés ou non, coût.
- **Critère de fin :** les 5 fiches sont lisibles par Julien, chaque carte renvoie à un article vérifiable, le coût par dossier est connu.
- **Réalisé (7 oct.) :** `docs/vulgarisation-essai.md` (constats, grille de relecture pour t08, les 5 fiches), `docs/vulgarisation-controles.md` (les 7 contrôles figés), `pipeline/vulgarisation.py`, `scripts/essai_vulgarisation.py`, `tests/test_vulgarisation.py`. Les sorties brutes sont dans `data/mesures/vulgarisation/essai.json`. L'essai tourne dans GitHub Actions (`.github/workflows/vulgarisation-essai.yml`), car la clé n'existe que là ; il se lance à la main ou en modifiant `data/mesures/vulgarisation/demande.txt`, avec un plafond de 2,50 $. Textes : Corse (7454), légitime défense (7987), hydroélectricité (7409), réseaux sociaux et mineurs (8431), maladies cardio-neuro-vasculaires (8419). Résultat : 3 fiches publiables, 2 replis justifiés par le contrôle 7, coût 1,02 $ (0,20 $ par texte, environ 2 $ par mois projetés). Le contrôle 5 a été assoupli après l'essai (deux faux positifs) ; l'essai n'a pas été relancé. Reste pour t27 : extrait qui appuie la carte, texte complet pour la commission mixte paritaire, choix automatique du texte voté. Après l'essai, passage à zéro euro : le workflow de l'essai et la dépendance `anthropic` sont supprimés ; `scripts/essai_vulgarisation.py` ne fait plus que régénérer le rapport.

### t08 👤 Relire les 5 fiches vulgarisées — S2, 45 min
- Pour chacune : juste par rapport au texte ? neutre ? compréhensible par quelqu'un qui ne suit pas la politique ? Remarques notées en bas de `docs/vulgarisation-essai.md`.
- **Réalisé (7 oct.) :** Julien a relu les 5 fiches et répondu en session « tout est bon pour moi », sans remarque. Claude Code a coché la grille d'après cette réponse.
- **Claude Code prépare** : une grille de relecture courte (3 cases à cocher par fiche) en tête du fichier.

### t09 🤖 Rapport de faisabilité — S3, 1 session
- **Dépend de :** t04, t06, t08.
- **À faire :** lire `docs/inventaire.md`, `docs/rattachement.md`, `docs/vulgarisation-essai.md`, `data/mesures/delai.csv` (au moins 2 semaines de scrutins solennels) et rédiger `docs/faisabilite.md` : délai médian et maximal (solennels), conséquence pour le verdict, taux de rattachement, qualité de la vulgarisation, risques restants, **recommandation go / no-go argumentée**.
- **Formule du verdict à trancher :** « dès la publication » (si le délai est court et régulier) ou « le verdict du matin » (sinon).
- **Si les données sont insuffisantes** (trop peu de scrutins solennels mesurés) : le dire et proposer de prolonger la mesure plutôt que de conclure.
- **Réalisé (7 oct.) :** `docs/faisabilite.md`. Rattachement (99,8 %) et vulgarisation (3 fiches publiables sur 5, relecture de Julien positive, zéro euro) : favorables. Délai : données insuffisantes, aucun scrutin encore mesuré. Un premier indice donne au plus 6 h 30 environ après la séance du 6 octobre au soir. Le rapport propose de prolonger le relevé jusqu'au 28 octobre et de garder « le verdict du matin » par défaut. Incident : le planificateur de GitHub n'a encore déclenché aucun passage horaire de t03, à vérifier le 8 octobre. Recommandation : go pour la phase 1, formule du verdict en suspens.

### t10 👤 ◆ Décision Go / No-go — S3, 30 min
- Julien lit `docs/faisabilite.md` et tranche. Décision consignée dans `docs/decisions.md` et dans le journal du suivi.
- **No-go ou go partiel :** Claude propose le scénario de repli (par ex. sans « Ce que ça change » sur les types de scrutins mal rattachés, ou verdict du matin).
- **Réalisé (7 oct.) :** go de Julien pour la phase 1. La formule du verdict reste en suspens jusqu'à la fin du relevé de t03 (vers le 28 oct.) ; « le verdict du matin » s'applique par défaut d'ici là. Décision consignée dans `docs/decisions.md`.

---

## 6. Phase 1 — Socle data (S4–S5)

**Objectif.** Un pipeline de nuit fiable qui produit des données normalisées et contrôlées, sans intervention humaine. **Sortie : t15 (vérification manuelle) validée.**

### t11 🤖 Ingestion de nuit — S4, 1 session
- **Dépend de :** t10.
- **À faire :** `pipeline/ingest.py` + `.github/workflows/nuit.yml` (cron 6 h UTC). Télécharge les archives, calcule leur **empreinte** (hash), s'arrête si rien n'a changé, sinon archive les bruts datés. Gestion propre des échecs réseau (nouvelles tentatives, alerte si > N échecs).
- **Tests :** empreinte identique → arrêt ; empreinte différente → archivage ; téléchargement en échec.
- **Critère de fin :** deux nuits d'affilée sans intervention ; rien ne se recalcule si rien n'a changé.
- **Réalisé (7 oct.) :** `pipeline/ingest.py`, `pipeline/sources.py` (liste des sources, partagée avec l'inventaire), `.github/workflows/nuit.yml` (6 h 11 UTC plutôt que 6 h pile), `tests/test_ingest.py` (8 tests sur un serveur simulé). L'état versionné est dans `data/sources/etat.json`. Les fichiers bruts passent par le cache de GitHub Actions et sont archivés 30 jours comme artefacts : rien de lourd dans le dépôt. Vérifié en local sur les vrais serveurs : 1re passe, 9 sources et 420 Mo en 6 min 30 ; 2e passe, tout est inchangé en 1 s, sans téléchargement. Une alerte (issue GitHub) est levée après 3 nuits d'échec. **Reste :** fusion dans `main`, premier passage manuel, puis deux nuits sans intervention. À surveiller : le planificateur de GitHub n'a encore déclenché aucun passage horaire de t03.

### t12 🤖 Les 11 tables DuckDB — S4, 2 sessions
- **Dépend de :** t11.
- **À faire :** `pipeline/normalize.py` : charge les archives dans DuckDB et produit les 11 tables (§ 4.4). Reconstitue les absents depuis les appartenances à la date du scrutin ; distingue non-votant et absent ; déduit les groupes invalides ; calcule `position_groupe` (majorité par groupe et par scrutin) et les dissidents.
- **Tests obligatoires :** (1) **partition** : une case par député et par scrutin ; (2) **totaux** égaux au décompte officiel ; (3) cas de motions de censure et de mises au point ; (4) député ayant changé de groupe en cours de législature.
- **Livrable :** `pipeline/normalize.py` + `data/site.duckdb` (non versionné).
- **Critère de fin :** 100 % des scrutins passent partition et totaux, ou sont listés avec leur raison.
- **Réalisé (7 oct.) :** en une session au lieu de deux. `pipeline/normalize.py` produit `data/site.duckdb` (non versionné) en 47 s : 649 députés, 678 mandats, 8 560 scrutins, 4 931 986 cases de vote. Rapport : `docs/normalisation.md` et `data/mesures/normalisation.json`. Tests : `tests/test_normalize.py` (10 tests : partition, totaux, motion de censure, mise au point, changement de groupe, suppléant, PO0, dissidents). **8 559 scrutins sur 8 560 passent la partition et les totaux.** Le seul écart est le n° 1, une motion de censure : 21 non-votants listés pour 10 publiés, cause non élucidée, écart déjà relevé par l'inventaire. Choix de méthode : prise de fonction plutôt que `dateDebut` ; position des groupes recalculée, car la position publiée n'est pas fiable (docs/decisions.md). La lecture des archives et l'index du rattachement sont désormais partagés (`pipeline/an.py`, `pipeline/rattachement.charger_index`). La normalisation est branchée dans `nuit.yml` : elle tourne si une source a changé.

### t13 🤖 Les 6 contrôles et l'arrêt du build — S5, 1 session
- **Dépend de :** t12.
- **À faire :** `pipeline/checks.py` (§ 4.5). Scrutin en échec partition / totaux → mis de côté sans bloquer les autres. Échec d'effectifs, de non-régression ou de schéma → build arrêté, dernière version conservée, **issue GitHub automatique**.
- **Tests :** un cas d'échec pour chaque contrôle, et la bonne réaction du pipeline.

### t14 🤖 Page « État des données » — S5, 1 session
- **Dépend de :** t13.
- **À faire :** `etat.json` à chaque build (dernière mise à jour, dernier scrutin intégré, scrutins mis de côté avec la raison) + page HTML simple qui l'affiche.

### t15 👤 ◆ Vérifier 5 scrutins au hasard — S5, 45 min
- Comparer le décompte et 5 votes nominatifs par scrutin avec la page officielle du scrutin sur le site de l'Assemblée.
- **Claude Code prépare** : 5 scrutins tirés au hasard avec le lien officiel, le décompte attendu et 5 votes nominatifs à contrôler, dans un tableau prêt à cocher.
- **Si un écart :** retour en t12, on ne passe pas à la phase 2.

---

## 7. Phase 2 — Site et premiers écrans réels (S6–S8)

**Objectif.** Un site déployé qui affiche de vraies données et permet de faire le quiz d'entrée. **Sortie : parcours complet testé par Julien (t22).**

### t16 👤 Cloudflare Pages (sous-domaine gratuit) — S6, 30 min
- Créer le compte Cloudflare (offre gratuite) et relier Pages au dépôt GitHub. Le site est servi sur le sous-domaine gratuit `*.pages.dev`. Un nom de domaine coûte une dizaine d'euros par an : pas d'achat sans décision de Julien (zéro euro).
- **Claude Code prépare** : les paramètres de build exacts (commande, dossier de sortie, version de Node).

### t17 🤖 Site Astro et design system — S6, 2 sessions
- **Dépend de :** t15, t16.
- **À faire :** initialiser `site/` (Astro, site statique). Tokens de la maquette V5 (polices, couleurs § 1). Composant **Hemicycle** : 577 sièges, groupes dans l'ordre officiel, dissidents cerclés, accessible (étiquettes, navigation clavier, contraste). Navigation à 3 onglets. Déploiement Cloudflare Pages.
- **Critère de fin :** un build propre, déployé, avec un hémicycle rendu depuis de vraies données.

### t18 🤖 Page vote branchée sur les vrais scrutins — S7, 2 sessions
- **Dépend de :** t17.
- **À faire :** export `scrutins/{uid}.json` depuis le pipeline ; page vote d'après la frame « Page vote » de V5 : verdict, hémicycle avec filtres **Tous / Dissidents / Ma députée / Mon jumeau**, voix pour inverser le résultat, groupe par groupe, sources. Pages générées pour chaque scrutin éditorialisé.
- **Tests :** calcul des voix pour inverser (adopté / rejeté), affichage des dissidents.

### t19 🤖 Fiche député et recherche par code postal — S7, 1 session
- **Dépend de :** t18.
- **À faire :** exports `deputes/{uid}.json` et `cp/{département}.json` (codes postaux de La Poste + communes → circonscriptions de data.gouv.fr). Fiche député d'après V5. Si un code postal couvre plusieurs circonscriptions : saisie de la rue via la Base Adresse Nationale.

### t20 👤 Valider les 10 votes du quiz d'entrée — S7, 30 min
- **Claude Code prépare** : 20 scrutins solennels qui divisent, sur des thèmes variés (économie, société, environnement, justice, international…), chacun avec la question formulée neutralement et l'écart entre groupes. Julien en retient 10. C'est le **seul choix éditorial fixe** du site.

### t21 🤖 Quiz d'entrée, résultat, jumeau, stories — S8, 2 sessions
- **Dépend de :** t20.
- **À faire :** export `matrice.json` (une chaîne P/C/A/- par député). Quiz d'après V5 : question, révélation, résultat. Accord, groupe le plus proche et jumeau (§ 4.3) **calculés dans le navigateur** ; réponses en `localStorage` uniquement. Génération de 3 stories en image 1080×1920.
- **Tests :** formules (accord lissé, seuil de 10 votes, précision), cas limites (0 vote commun, égalité).

### t22 👤 Tester le parcours complet — S8, 1 h
- Faire le quiz comme « Jade », chercher sa députée comme « Marc », sur ordinateur et téléphone. Chaque friction → une issue GitHub étiquetée.
- **Claude Code prépare** : la liste des scénarios à tester et un modèle d'issue.

---

## 8. Phase 3 — La séance de la semaine (S9–S10)

**Objectif.** La boucle hebdomadaire fonctionne de bout en bout, toute seule. **Sortie : t26 — une vraie séance vécue du lundi au verdict.**

### t23 🤖 Agenda et sélection automatique des 3 votes — S9, 1 session
- **Dépend de :** t21.
- **À faire :** ingérer l'agenda ; détecter les scrutins solennels annoncés pour la semaine ; choisir 3 votes selon les règles : texte entier d'abord, thème le moins représenté récemment, groupes d'origine variés ; compléter avec des votes passés qui divisent si moins de 3 annoncés ; **geler la série pendant les vacances parlementaires**. Export `semaine.json`. Exécution le lundi à 6 h.
- **Tests :** semaine pleine, semaine creuse, vacances parlementaires, agenda modifié en cours de semaine.

### t24 🤖 Séance en mode focus — S9, 2 sessions
- **Dépend de :** t23.
- **À faire :** frames V5 « Séance » et « Séance terminée » : mode focus sans navigation, vote, pronostic facultatif, tampon, série (gelée pendant les vacances), barre « utilisateurs du site » masquée sous 200 participants. Tout stocké dans le navigateur.

### t25 🤖 Verdict et passages horaires — S10, 1 session
- **Dépend de :** t24.
- **À faire :** `soiree.yml` : workflow horaire de 16 h à minuit les jours de scrutin solennel. Écran Verdict d'après V5 : résultat, marge, voix pour inverser, ta députée, ton jumeau, comparaison avec les utilisateurs si l'agrégat existe. **Formulation du délai conforme à la décision de t10.**

### t26 👤 ◆ Vivre une vraie séance — S10, 30 min
- Faire la séance le lundi, vérifier le verdict le lendemain (ou le soir). **Rien ne doit demander son intervention.**
- **Si quelque chose a demandé une action humaine :** corriger avant d'avancer.

---

## 9. Phase 4 — Vulgarisation hebdomadaire (S11–S12)

**Objectif.** Chaque semaine, une session Claude Code lancée par Julien rédige les fiches « Ce que ça change » des votes de la semaine. Une fiche n'est publiée que si elle passe les 7 contrôles et si Julien l'a validée. Coût : zéro euro (décision du 7 octobre 2026). **Sortie : t29 — fiches validées jugées correctes, session tenue en moins de 30 minutes.**

*(Phase revue le 7 octobre 2026 après le passage à zéro euro : la rédaction par l'API, prévue au départ, est abandonnée.)*

### t27 🤖 Session hebdomadaire de rédaction dans Claude Code — S11, 2 sessions
- **Dépend de :** t26.
- **À faire :**
  1. `scripts/fiches_a_rediger.py` : liste les textes des votes de la semaine (et des votes à venir de l'agenda) qui n'ont pas de fiche validée pour leur version actuelle. Pour chacun, il prépare le dossier de travail : le texte voté découpé en articles, l'exposé des motifs et les consignes de `pipeline/vulgarisation.py`. Le texte voté est choisi automatiquement, selon la règle de t07.
  2. Une commande de projet Claude Code (skill dans `.claude/skills/`) qui enchaîne : préparation → rédaction de chaque fiche → contrôles 1 à 6 (`scripts/controler_fiche.py`) → relecture par un agent séparé (contrôle 7) → une nouvelle tentative si besoin → présentation à Julien → enregistrement des seules fiches validées (`data/fiches/`, versionnées, avec l'empreinte du texte et la date de validation) → commit.
  3. Le pipeline de nuit ne joint une fiche qu'aux votes dont le texte a la même empreinte ; sinon, repli (vote publié sans cartes, objet officiel et lien). Mention « Résumé rédigé à partir du texte officiel » et lien vers l'article cité.
  4. Traiter les limites relevées en t07 : la relecture vérifie aussi que l'extrait appuie la carte ; texte complet pour la commission mixte paritaire ; très gros textes (budget) exclus ou découpés.
- **Tests :** JSON invalide, carte sans article valide, formulation partisane, dépassement de longueur, empreinte qui ne correspond plus, repli effectif.
- **Critère de fin :** Julien tient une vraie session : 3 fiches rédigées, contrôlées et validées en moins de 30 minutes, publiées au build suivant, sans aucun appel payant.

### t28 🤖 Thèmes, signalements, retrait automatique — S11, 1 session
- **Dépend de :** t27.
- **À faire :** attribuer **un des 12 thèmes** à chaque dossier, pendant la session hebdomadaire, une fois par dossier, enregistré avec la fiche. « Signaler une erreur » (Supabase, table `signalements`, **sans compte**) ; à **3 signalements distincts** : cartes retirées au build suivant, puis nouvelle rédaction à la session hebdomadaire suivante. Protéger contre les abus (limitation par empreinte navigateur / IP hachée, sans stocker de donnée personnelle).
- **Remarque :** nécessite Supabase ; si t30 n'est pas encore fait, Claude demande à Julien de le devancer ou livre la partie sans backend et le branche après.

### t29 👤 Bilan des 10 premières fiches validées — S12, 1 h
- Semaine de Noël : une seule tâche. Julien a déjà validé chaque fiche en session. Il fait le bilan : rejets fréquents, temps passé par session, remarques des signalements. Claude ajuste les consignes de rédaction et les contrôles en conséquence (nouvelle entrée dans `docs/decisions.md`).

---

## 10. Phase 5 — Le service (S13–S15)

**Objectif.** Les mécaniques de rétention et de confiance : comptes facultatifs, alertes, duel, pages légales, audience et accessibilité. **Sortie : t35 + t36.**

*(Décision du 7 octobre 2026 : projet portfolio, fonctions centrées sur l'utilisateur reportées. t30 à t33 ne sont pas à faire pour l'instant ; t34 à t36 restent, sans la partie comptes.)*

### t30 👤 Supabase + Brevo — S13, 45 min
- Créer le projet Supabase (**région Europe**, offre gratuite). Dans Brevo (offre gratuite), authentifier l'expéditeur. *(À revoir : sans nom de domaine — t16, zéro euro —, l'authentification SPF/DKIM n'est pas possible ; voir docs/questions-ouvertes.md.)* Ajouter les clés en secrets GitHub (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `BREVO_API_KEY`).
- **Claude Code prépare** : la liste exacte des enregistrements DNS à ajouter et des secrets à créer.

### t31 🤖 Comptes facultatifs, lois et députés suivis — S13, 2 sessions
- **Dépend de :** t30.
- **À faire :** schéma Supabase (profils, suivis de lois, suivis de députés, consentements) avec **règles RLS** strictes ; connexion par lien magique ; consentement **explicite, séparé et retirable** avant toute synchronisation des réponses ; **sans compte, tout reste dans le navigateur**. Suppression de compte = suppression de toutes les données.
- **Tests :** RLS (un utilisateur ne lit que ses lignes), retrait de consentement, suppression.

### t32 🤖 Alertes d'étape et récap du dimanche — S14, 2 sessions
- **Dépend de :** t31.
- **À faire :** fonction planifiée qui compare les étapes des dossiers suivis (`dossiers/{uid}.json`) avec la veille → alerte Brevo (« suivre une loi comme un colis »). Récap du dimanche : votes de la semaine, verdicts, députée suivie. **Maximum 2 notifications par semaine** hors alertes demandées. Lien de désinscription dans chaque e-mail.

### t33 🤖 Le duel entre amis — S14, 1 session
- **Dépend de :** t21.
- **À faire :** un lien porte les 5 scrutins et les réponses du créateur, **chiffrées dans l'URL** (aucun stockage serveur) ; l'ami répond ; compatibilité et distance dans l'hémicycle ; story « Duel ».

### t34 🤖 « Comment c'est calculé », mentions légales, confidentialité — S15, 1 session
- **À faire :** page « Comment c'est calculé » (définitions exactes du § 4.3, avec exemples chiffrés) ; **brouillons** de mentions légales et de politique de confidentialité adaptés aux opinions politiques (donnée sensible, consentement exprès, stockage local par défaut, hébergeurs, durée de conservation, droits). **Marquer clairement ce qui doit être validé** par un humain / un juriste.

### t35 👤 Valider mentions légales et confidentialité — S15, 1 h
- Relire les brouillons. En cas de doute sur les données sensibles : faire relire par un juriste ou consulter la CNIL. **Claude n'est pas juriste** : ses textes sont des brouillons.

### t36 🤖 Audience sans cookies, accessibilité, performance, SEO — S15, 1 session
- **À faire :** mesure d'audience sans cookies et gratuite (Cloudflare Web Analytics ; Plausible est payant), **aucune réponse politique transmise** ; audit WCAG AA et performance (Lighthouse) ; pages vote et député indexables (titres, descriptions, données structurées) ; corriger ce qui est bloquant.

---

## 11. Phase 6 — Bêta privée et lancement (S16–S19)

**Objectif.** Valider auprès de vrais utilisateurs, puis lancer **après 4 semaines de séance sans action humaine**.

### t37 👤 Inviter 10 à 20 proches — S16, 30 min
- Message court, le lien, **une seule consigne : faire la séance chaque semaine**. **Claude Code prépare** le message et le modèle d'issue « bêta ».

### t38 🤖 Corriger les retours de la bêta — S16 à S19, 1 session par semaine
- **À faire :** à partir des issues GitHub étiquetées « bêta » : corriger les plus importantes, une à une, **avec un test par correction**. Ne pas toucher au pipeline sans test. Résumer chaque semaine à Julien : ce qui est corrigé, ce qui reste.

### t39 👤 Chaque lundi : vérifier que la séance est sortie seule — S16 à S19, 15 min/semaine
- Si quelque chose a demandé une intervention humaine, la semaine **ne compte pas** pour le critère de lancement.

### t40 👤 ◆ Décision de lancement public — S19, 30 min
- **Critère :** 4 semaines de séance consécutives sans aucune action humaine, contrôles au vert, retours bêta traités, pages légales validées.
- **Claude Code prépare** : un bilan factuel (semaines propres, incidents, issues ouvertes, sessions hebdomadaires tenues, coûts réels : doivent être nuls).

### t41 🤝 Préparer le lancement — S19, 1 h + 1 session
- Claude rédige : post LinkedIn de lancement (démarche, choix data, chiffres réels de la bêta), page projet pour le portfolio Factory, texte d'une story de lancement. **Ton sobre, factuel, sans superlatifs.** Julien ajuste et publie.

---

## 12. Risques connus et parades

| Risque | Parade |
|---|---|
| Délai de publication des scrutins trop long ou irrégulier | Formule « le verdict du matin » ; décision en t10 |
| Rattachement vote → texte peu fiable | Cartes uniquement pour les types de scrutins bien rattachés ; sinon repli sans cartes |
| Vulgarisation fausse ou partisane | 7 contrôles, validation de chaque fiche par Julien, repli, signalements (3 → retrait), bilan t29 |
| Format open data qui change | Contrôle de schéma + arrêt du build + alerte |
| Données politiques = sensibles | Stockage local par défaut, consentement exprès, RLS, pas de classement public |
| Coût qui apparaît | Zéro euro : aucun appel payant, offres gratuites seulement, toute dépense soumise à Julien |
| Julien saute la session hebdomadaire | Repli automatique : les votes sortent sans cartes, la séance reste complète |
| Julien indisponible une semaine | Aucune tâche Julien ne bloque plus d'une phase ; la séance tourne seule ; Claude reporte et prévient |
| Usine à gaz | Règle n° 6 : la solution la plus simple qui tient |

## 13. Définition de « terminé » pour une tâche

1. Le livrable existe aux chemins indiqués.
2. `uv run pytest` et `uv run ruff check .` passent (et `npm run build` côté site à partir de la phase 2).
3. Le critère de fin de la fiche est atteint, ou l'écart est écrit noir sur blanc.
4. `docs/decisions.md` mis à jour si une décision structurante a été prise.
5. La case est cochée dans le § 2 et un résumé est donné à Julien : fait / échoué / non vérifié / tâche suivante.
