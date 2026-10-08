# Mesure d'audience sans cookies (t36) — à activer par Julien

> Préparé par Claude Code le 9 octobre 2026. L'activation se fait dans le tableau de bord Cloudflare : c'est un réglage de ton compte, que Claude ne fait pas à ta place. Durée : 5 minutes. Gratuit.

## Le choix proposé : Cloudflare Web Analytics

- **Gratuit**, inclus avec Cloudflare Pages (Plausible, l'autre option envisagée, est payant).
- **Sans cookie** et sans empreinte du navigateur : il compte les pages vues, les pays, les navigateurs, la provenance et les temps de chargement, sans suivre les personnes d'une visite à l'autre. Pas de bandeau de consentement nécessaire pour cette mesure. [À confirmer en t35 avec la politique de confidentialité.]
- **Aucune réponse politique transmise** : le script ne voit que l'adresse de la page. Les réponses, pronostics et député choisi restent dans le navigateur ; aucune page n'inscrit une réponse dans son adresse. Seul le code postal passe par l'adresse, après le « # », qui n'est envoyé ni au serveur ni au script de mesure. [À vérifier après activation : ouvrir une page `/deputes/#cp=75011` et contrôler, dans les « Pages vues » de Cloudflare, que seule `/deputes/` apparaît.]

## Étapes

1. Se connecter à https://dash.cloudflare.com avec le compte du site.
2. Menu **Workers & Pages** → projet **le578esiege**.
3. Onglet **Metrics** → section **Web Analytics** → **Enable**.
   Cloudflare ajoute alors lui-même son petit script à chaque page au prochain déploiement : rien à changer dans le code.
4. Attendre le passage de nuit suivant (ou le relancer : GitHub → Actions → « Pipeline de nuit » → Run workflow), puis revenir sur **Metrics** le lendemain.

## Ensuite

- Dire à Claude Code que c'est activé : il mettra à jour le brouillon de confidentialité (`docs/confidentialite-brouillon.md`, section « Mesure d'audience ») et le planning.
- Si tu préfères **aucune mesure** : ne rien faire ; le brouillon de confidentialité dira « aucune mesure d'audience ».
