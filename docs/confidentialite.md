# Confidentialité

> Texte de référence de la page `/confidentialite/` (`site/src/pages/confidentialite.astro`), mis en ligne à la demande de Julien le 12 octobre 2026 (t35). Claude n'est pas juriste : ce texte décrit ce que fait le site, vérifié dans le code, et renvoie aux pages officielles de Cloudflare et de l'IGN pour le reste. Les points non confirmés sont listés à la fin, hors du texte publié.

## En bref

Le 578e siège permet de répondre à de vrais votes de l'Assemblée nationale et de comparer ses réponses à celles des députés. **Tes réponses ne quittent pas ton navigateur** : le site ne les envoie à aucun serveur, ni au sien ni à un tiers. Tous les calculs (groupe le plus proche, jumeau, précision) se font sur ton appareil.

## Qui est responsable

Julien Garcia, éditeur du site (voir les mentions légales). Le site est un projet personnel, sans publicité et sans compte utilisateur.

## Ce que le site garde, et où

Tout ce qui suit est enregistré dans ton navigateur uniquement (son « stockage local »), jusqu'à ce que tu l'effaces.

| Donnée | Pourquoi | Nom dans le navigateur |
|---|---|---|
| Tes réponses aux votes (pour ou contre), avec leur date | Calculer ton hémicycle, ton jumeau, ta précision | `578e.reponses.v1` |
| Tes réponses et tes pronostics de la séance de la semaine, ta série | La séance, le verdict, la série | `578e.seances.v1` |
| Où tu en es du quiz et des lots de votes | Reprendre là où tu t'étais arrêté | `578e.quiz.v1`, `578e.lots.v1` |
| Le député que tu as choisi (son identifiant public) | Afficher ton député | `578e.depute.v1` |
| Les verdicts que tu as déjà découverts (numéros des scrutins) | Ne pas te refaire découvrir un verdict déjà vu | `578e.verdicts-vus.v1` |

Ces informations peuvent révéler des **opinions politiques**, qui sont des données sensibles au sens de l'article 9 du RGPD. C'est pourquoi le site est conçu pour ne jamais les transmettre : il n'a aucune base de données qui pourrait les recevoir.

Les images à partager (« stories ») sont dessinées dans ton navigateur ; elles ne partent que si tu les partages toi-même.

**Tout effacer** : la page « Comment c'est calculé » propose un bouton « Effacer toutes mes réponses de ce navigateur ». Effacer les données du site dans les réglages de ton navigateur a le même effet. Une réponse peut aussi être effacée sur la page du vote concerné.

## Ce qui est envoyé, et à qui

- **L'hébergeur du site, Cloudflare**, reçoit, comme tout hébergeur, les informations techniques de chaque visite : adresse IP, page demandée, type de navigateur. Il demande aussi à ton navigateur de lui signaler les erreurs de connexion au site. Cloudflare est une société américaine : ces informations peuvent être traitées hors de l'Union européenne. Ce que Cloudflare en fait, combien de temps il les garde et dans quel cadre il les transfère est décrit dans sa politique de confidentialité (https://www.cloudflare.com/fr-fr/privacypolicy/).
- **La recherche de ton député par adresse** : quand ton code postal couvre plusieurs circonscriptions, le site te demande ton adresse. Elle est alors envoyée, avec ton code postal, **seulement à ce moment et à ta demande**, au service public de géocodage de l'IGN (Géoplateforme, `data.geopf.fr`), qui reçoit aussi ton adresse IP, comme tout service en ligne. Voir les conditions d'utilisation de la Géoplateforme (https://cartes.gouv.fr/cgu/) et la page de l'IGN sur les données personnelles (https://www.ign.fr/institut/donnees-caractere-personnel).
- **Ton code postal**, en dehors de ce cas, reste dans ton navigateur : il est placé après le « # » de l'adresse de la page, une partie que le navigateur n'envoie pas au serveur. Seule exception : si JavaScript est désactivé, il passe dans l'adresse de la page et parvient à l'hébergeur.
- **Mesure d'audience** : le site ne mesure pas son audience pour le moment ; si une mesure est ajoutée, elle sera sans cookie et cette page sera mise à jour.
- **Polices de caractères** : servies par le site lui-même ; aucun appel à Google.
- **Cookies** : le site ne dépose aucun cookie.

## Tes droits

Comme le site ne reçoit ni ne conserve tes réponses, il n'a rien à te communiquer, à rectifier ou à effacer de son côté : tout est dans ton navigateur, et tu peux tout effacer toi-même. Pour les informations techniques reçues par l'hébergeur, voir la politique de confidentialité de Cloudflare, citée plus haut.

Pour toute question : le site n'a pas encore d'adresse électronique de contact ; on peut ouvrir un ticket sur le dépôt GitHub du projet (https://github.com/ijugarcia-pro/site-politique/issues ; ces messages sont publics : ne rien y écrire de personnel). Tu peux aussi adresser une réclamation à la CNIL (https://www.cnil.fr/).

## Si le site évolue

Des fonctions envisagées (comptes facultatifs, alertes, chiffres sur l'ensemble des utilisateurs du site) demanderaient d'envoyer des données à un serveur. Elles ne sont pas en service. Si elles arrivent, ton accord exprès te sera demandé avant tout envoi, et cette page sera mise à jour auparavant.

*Dernière mise à jour : 12 octobre 2026.*

---

## Hors publication : ce qui a été vérifié, ce qui ne l'a pas été

Vérifié le 12 octobre 2026, dans le code du site (`site/src`, `site/public`) et sur le site en ligne :

- **Stockage local** : cinq clés, celles du tableau, et aucune autre ; ni `sessionStorage` ni base locale.
- **Aucun cookie** : aucun `document.cookie` dans le code ; la page d'accueil en ligne ne renvoie aucun en-tête `Set-Cookie`.
- **Aucune mesure d'audience** : aucun script de mesure dans le code, et aucun script ajouté par Cloudflare dans la page servie en ligne (Web Analytics n'est pas activé).
- **Un seul appel à un tiers** : le géocodage de l'IGN, sur la page des députés, quand le visiteur envoie une adresse ; la requête porte l'adresse saisie **et le code postal** (le brouillon disait à tort que le code postal n'était envoyé à personne).
- **Rapports d'erreurs réseau** : Cloudflare ajoute aux réponses du site les en-têtes `Report-To` et `NEL`, qui demandent au navigateur de lui signaler les échecs de connexion.
- **Polices** : importées depuis les paquets du site, sans appel à Google Fonts.
- **Sans JavaScript**, le formulaire du code postal envoie `?cp=…` au serveur (c'est écrit dans la page).

Non confirmé, à trancher par Julien (juriste ou CNIL s'il le juge utile) :

1. **Qualification juridique du stockage local.** Le texte ne dit pas si garder des réponses dans le seul navigateur du visiteur est un « traitement » dont l'éditeur est responsable au sens du RGPD, ni s'il relève de l'exception de l'article 82 de la loi Informatique et Libertés (stockage strictement nécessaire au service demandé). Il décrit seulement ce qui se passe. Les réponses touchent aux opinions politiques : c'est le point qui mérite le plus un avis.
2. **Cloudflare.** Durées de conservation des journaux, lieux de traitement et cadre des transferts hors Union européenne : non vérifiés, la page renvoie à la politique de Cloudflare. Celle-ci indique que les visiteurs des sites de ses clients doivent s'adresser au site concerné. Cloudflare peut aussi poser un cookie technique de sécurité dans certaines situations (aucun observé le 12 octobre sur la page d'accueil) : « le site ne dépose aucun cookie » parle du code du site.
3. **IGN.** Conservation des requêtes de géocodage et conditions d'utilisation du service : non vérifiées. Les deux liens existent, mais il n'a pas été confirmé que les conditions générales de cartes.gouv.fr sont bien celles qui s'appliquent au service `data.geopf.fr/geocodage`.
4. **Contact pour exercer ses droits.** Sans adresse électronique, une personne ne peut écrire qu'en public (tickets GitHub). Une adresse dédiée reste à créer.
5. **Engagement sur l'avenir.** « Si une mesure est ajoutée, elle sera sans cookie » et « ton accord exprès te sera demandé » engagent Julien : à tenir si la mesure d'audience est activée en fin de projet (voir `docs/audience.md`) ou si des comptes arrivent.
