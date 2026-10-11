# Politique de confidentialité — BROUILLON (t34)

> **Brouillon rédigé par Claude Code le 9 octobre 2026, à valider par Julien (t35).** Claude n'est pas juriste. Les passages marqués **[À VALIDER]** demandent une vérification humaine ; en cas de doute sur les données sensibles, faire relire par un juriste ou consulter la CNIL. Ce texte n'est pas publié sur le site tant qu'il n'est pas validé.

## En bref

Le 578e siège te permet de répondre à de vrais votes de l'Assemblée nationale et de comparer tes réponses à celles des députés. **Tes réponses ne quittent pas ton navigateur** : elles ne sont envoyées à aucun serveur, ni au nôtre ni à un tiers. Tous les calculs (groupe le plus proche, jumeau, précision) se font sur ton appareil.

## Qui est responsable

- **Responsable du traitement** : [À VALIDER : nom, prénom de l'éditeur, adresse de contact (adresse électronique dédiée recommandée)].
- Le site est un projet personnel, sans publicité, sans compte et sans but lucratif. [À VALIDER]

## Ce que le site garde, et où

| Donnée | Où | Pourquoi | Durée |
|---|---|---|---|
| Tes réponses aux votes (pour / contre), avec leur date | Ton navigateur uniquement (`localStorage`, clé `578e.reponses.v1`) | Calculer ton hémicycle, ton jumeau, ta précision | Jusqu'à ce que tu les effaces |
| Tes réponses et pronostics de la séance de la semaine, ta série | Ton navigateur uniquement (`578e.seances.v1`) | La séance, le verdict, la série | Idem |
| Où tu en es du quiz et des lots | Ton navigateur uniquement (`578e.quiz.v1`, `578e.lots.v1`) | Reprendre là où tu t'étais arrêté | Idem |
| Le député que tu as choisi (identifiant public du député) | Ton navigateur uniquement (`578e.depute.v1`) | Afficher ton député | Idem |

Ces informations peuvent révéler des **opinions politiques**, qui sont des données sensibles au sens de l'article 9 du RGPD. C'est pourquoi elles ne sont **jamais transmises** : le site ne dispose d'aucune base de données qui les recevrait. [À VALIDER : confirmer qu'un stockage limité au terminal de l'utilisateur, sans transmission, ne constitue pas un traitement par l'éditeur au sens du RGPD, ou qu'il est couvert par l'exception de l'article 82 de la loi Informatique et Libertés (stockage strictement nécessaire au service demandé).]

**Les effacer** : la page « Comment c'est calculé » propose un bouton « Effacer toutes mes réponses de ce navigateur ». Effacer les données du site dans ton navigateur a le même effet. Une réponse peut aussi être effacée vote par vote.

## Ce qui est envoyé, et à qui

- **L'hébergeur du site, Cloudflare** (Cloudflare Pages) reçoit, comme tout hébergeur, les informations techniques de chaque visite : adresse IP, page demandée, navigateur. [À VALIDER : durée de conservation de ces journaux par Cloudflare, transfert hors Union européenne (Cloudflare, Inc., États-Unis ; cadre de protection des données UE–États-Unis), lien vers la politique de Cloudflare.]
- **La recherche de ton député par adresse** : quand ton code postal couvre plusieurs circonscriptions, le site te demande ton adresse et l'envoie, **seulement à ce moment et à ta demande**, au service public de géocodage de l'IGN (Géoplateforme, `data.geopf.fr`). Le code postal, lui, n'est envoyé à personne : il reste dans l'adresse de la page, après le « # », qui ne part pas au serveur. [À VALIDER : conditions d'utilisation et conservation côté IGN.]
- **Mesure d'audience** : [À VALIDER, selon la décision de t36 : aucune mesure, ou Cloudflare Web Analytics, sans cookie, qui compte les pages vues sans suivre les personnes et ne reçoit jamais tes réponses.]
- **Polices de caractères** : servies par le site lui-même ; aucun appel à Google.
- **Aucun cookie** n'est déposé par le site. [À VALIDER après t36.]

## Tes droits

Comme le site ne reçoit ni ne conserve tes réponses, il n'a rien à te communiquer, rectifier ou effacer côté serveur : tout est dans ton navigateur, et tu peux tout effacer toi-même. Pour toute question : [À VALIDER : contact]. Tu peux aussi adresser une réclamation à la CNIL (www.cnil.fr).

## Si le site évolue

Des fonctions futures (comptes facultatifs, alertes, agrégats « les utilisateurs du site ») demanderaient d'envoyer des données à un serveur. Elles sont reportées (décision du 7 octobre 2026). Si elles arrivent, elles demanderont un **consentement exprès** préalable, et cette politique sera revue avant. [À VALIDER]

*Dernière mise à jour du brouillon : 9 octobre 2026.*
