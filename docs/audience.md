# Mesure d'audience sans cookies (t46) — à trancher à la fin du projet

> Préparé par Claude Code le 9 octobre 2026. **Décision de Julien du 12 octobre 2026 : la mesure d'audience se tranche à la fin du projet, avant la mise en ligne publique** (tâche t46, sortie de t36). D'ici là, ne rien activer : le site ne mesure pas son audience, et la page « Confidentialité » le dit. Si tu l'actives un jour, l'activation se fait dans le tableau de bord Cloudflare : c'est un réglage de ton compte, que Claude ne fait pas à ta place. Durée : 5 minutes. Gratuit.

## Le choix proposé : Cloudflare Web Analytics

- **Gratuit**, inclus avec Cloudflare Pages (Plausible, l'autre option envisagée, est payant).
- **Sans cookie** et sans empreinte du navigateur : il compte les pages vues, les pays, les navigateurs, la provenance et les temps de chargement, sans suivre les personnes d'une visite à l'autre. Pas de bandeau de consentement nécessaire pour cette mesure. [Non confirmé : à vérifier avant l'activation, t46.]
- **Aucune réponse politique transmise** : le script ne voit que l'adresse de la page. Les réponses, pronostics et député choisi restent dans le navigateur ; aucune page n'inscrit une réponse dans son adresse. Seul le code postal passe par l'adresse, après le « # », qui n'est envoyé ni au serveur ni au script de mesure. [À vérifier après activation : ouvrir une page `/deputes/#cp=75011` et contrôler, dans les « Pages vues » de Cloudflare, que seule `/deputes/` apparaît.]

## Étapes

1. Se connecter à https://dash.cloudflare.com avec le compte du site.
2. Menu **Workers & Pages** → projet **le578esiege**.
3. Onglet **Metrics** → section **Web Analytics** → **Enable**.
   Cloudflare ajoute alors lui-même son petit script à chaque page au prochain déploiement : rien à changer dans le code.
4. Attendre le passage de nuit suivant (ou le relancer : GitHub → Actions → « Pipeline de nuit » → Run workflow), puis revenir sur **Metrics** le lendemain.

## Ensuite

- **Avant** d'activer, le dire à Claude Code : la page « Confidentialité » (`site/src/pages/confidentialite.astro`, `docs/confidentialite.md`) promet qu'elle sera mise à jour si une mesure est ajoutée. Elle doit l'être en même temps que l'activation, ainsi que le planning (t46).
- Si tu préfères **aucune mesure** : ne rien faire ; la page dit déjà que le site ne mesure pas son audience.
