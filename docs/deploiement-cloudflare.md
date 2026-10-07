# Déploiement sur Cloudflare Pages (t16)

> Préparé le 8 octobre 2026 par Claude Code pour la tâche t16 (👤 Julien, 30 min environ). Doc Cloudflare relue le même jour.

## Ce qui change par rapport à la fiche

La fiche prévoyait de « relier Pages au dépôt GitHub » : Cloudflare reconstruirait alors le site à chaque commit. Ça ne marche pas pour ce projet. Les données du site (`export/`, la base DuckDB) sont produites chaque nuit dans GitHub Actions, et ne sont pas versionnées. Un build lancé par Cloudflare n'y aurait pas accès.

On retient donc le **téléversement direct** (*Direct Upload*) : le pipeline de nuit construit le site dans GitHub Actions, puis l'envoie à Cloudflare, **seulement si les contrôles ont réussi**. Un build arrêté ne publie rien, et la version en ligne reste la dernière valide. Entrée datée dans `docs/decisions.md`.

Conséquence pour Julien : **rien à relier, rien à construire chez Cloudflare.** Il suffit de créer le compte et de donner à GitHub une clé limitée à Cloudflare Pages. Le projet Pages lui-même sera créé par le workflow en t17.

## Les étapes (Julien)

### 1. Créer le compte (5 min)
1. Aller sur https://dash.cloudflare.com/sign-up et créer un compte avec l'adresse de son choix.
2. Confirmer l'adresse avec l'e-mail reçu.
3. Si Cloudflare propose d'ajouter un domaine ou un abonnement : passer. **Aucun moyen de paiement à saisir** : l'offre gratuite suffit (zéro euro).

### 2. Choisir le nom du site (2 min)
Le site sera servi sur `https://<nom>.pages.dev`. Le nom est unique sur tout Cloudflare, en minuscules, chiffres et tirets.
- Suggestions : `le578esiege`, `le-578e-siege`, `578e-siege`.
- Pour vérifier qu'un nom est libre : ouvrir `https://<nom>.pages.dev` dans le navigateur. Si une page s'affiche, le nom est pris.
- **Donner le nom retenu à Claude en début de session t17** (ce n'est pas un secret).

### 3. Copier l'identifiant du compte (1 min)
Dans le tableau de bord : menu **Workers & Pages**, encadré **Account Details**, bouton de copie à côté de **Account ID**.
(Autre chemin : `Ctrl + K`, taper « Copy account ID ».)
Le garder sous la main pour l'étape 5.

### 4. Créer une clé d'API limitée à Pages (5 min)
1. En haut à droite, icône du profil → **My Profile** → **API Tokens** → **Create Token**.
2. Tout en bas, **Custom token** → **Get started**.
3. **Token name** : `site-politique GitHub Actions`.
4. **Permissions** : une seule ligne, `Account` · `Cloudflare Pages` · `Edit`.
5. **Account Resources** : `Include` · le compte (il n'y en a qu'un).
6. Laisser **Client IP Address Filtering** vide (GitHub change d'adresse à chaque passage). **TTL** : laisser vide.
7. **Continue to summary** → **Create Token**.
8. **Copier la clé tout de suite** : Cloudflare ne l'affiche qu'une fois. Ne la coller **ni dans le chat ni dans le dépôt**.

### 5. Ranger les deux valeurs dans GitHub (5 min)
Sur https://github.com/ijugarcia-pro/site-politique/settings/secrets/actions → **New repository secret**, deux fois :

| Name | Secret |
|---|---|
| `CLOUDFLARE_API_TOKEN` | la clé de l'étape 4 |
| `CLOUDFLARE_ACCOUNT_ID` | l'identifiant de l'étape 3 |

Les noms doivent être écrits exactement ainsi.

### 6. Vérification
En début de t17, Claude Code vérifie que les deux secrets existent (`gh secret list`, qui affiche les noms et jamais les valeurs). Rien d'autre à faire côté Julien.

## Ce que fera t17 (pour mémoire)

- **Site** : Astro, sortie statique dans `site/dist/`. Commande de build : `npm ci && npm run build`, lancée dans `site/`. Node : la version LTS en cours (Node 24 en octobre 2026), à confirmer à l'installation d'Astro.
- **Données** : le pipeline écrit ses JSON dans `export/`, copiés dans le site avant le build.
- **Création du projet**, une seule fois : `wrangler pages project create <nom> --production-branch main`.
- **Déploiement** : une étape ajoutée à `.github/workflows/nuit.yml` après les contrôles, avec la condition `if: steps.controles.outcome == 'success'`, via l'action officielle `cloudflare/wrangler-action` : `pages deploy site/dist --project-name=<nom> --branch=main`.

## Limites de l'offre gratuite (doc Cloudflare, 8 oct. 2026)

| Limite | Valeur | Pour ce projet |
|---|---|---|
| Fichiers par déploiement | 20 000 | À surveiller : une page par scrutin pour les 8 560 scrutins plus une par député tiendrait, mais pas un fichier par scrutin et par format. t18 prévoit des pages seulement pour les scrutins éditorialisés. |
| Taille d'un fichier | 25 Mio | `matrice.json` (t21) à surveiller ; la compression n'est pas comptée. |
| Builds par mois | 500 | Ne concerne que les builds faits par Cloudflare ; ici le build se fait dans GitHub Actions. Au plus une quarantaine de déploiements par mois (nuits + soirs de scrutin). |
| Projets par compte | 100 | Un seul. |
| Bande passante, requêtes | sans limite pour les fichiers statiques | — |

## À savoir

- Un projet en téléversement direct ne peut pas passer ensuite à la liaison Git (il faudrait en recréer un). Ce n'est pas un besoin ici.
- Un nom de domaine (une dizaine d'euros par an) peut être ajouté plus tard sans rien changer au déploiement. Pas d'achat sans décision de Julien.
- Révoquer la clé, c'est **My Profile → API Tokens → Delete** ; il faudra alors en créer une nouvelle et remplacer le secret GitHub.

Sources : [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [Direct Upload et intégration continue](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [Limites](https://developers.cloudflare.com/pages/platform/limits/), [Identifiant de compte](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/), [Créer une clé d'API](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).
