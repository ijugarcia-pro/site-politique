# Animations · lot 1 — consignes pour Claude Code

Projet : « Le 578e siège » (Astro statique, Cloudflare Pages, zéro euro).
Référence visuelle : toile « Le 578e siège · animations » (planches 1 à 4 et planche « Classement »). Chaque animation y est jouable, avec son code (A2, R4, F3…) repris ci-dessous.

## Mode d'emploi

- Lis `CLAUDE.md`, `docs/PLANNING.md` et `docs/decisions.md` avant de commencer.
- Fais d'abord le **socle commun** (section 0), puis les animations dans l'ordre 1 → 8. Une PR par numéro (le socle compris), chacune petite et testable seule.
- Les noms de fichiers et de composants ci-dessous sont indicatifs : utilise ceux qui existent déjà dans le dépôt, sans renommer.
- **Aucune dépendance à installer.** CSS pur, ou JavaScript léger avec la Web Animations API (`element.animate`, `element.getAnimations`). Pas de Lottie, pas de GSAP, pas de Motion One.
- Ne change ni les couleurs, ni les rayons, ni les ombres des maquettes V5. Ne change pas les animations existantes (« monte », « tampon », transition des sièges, barre de progression, enfoncement des boutons) : on les prolonge.
- **Variante** : construis la variante « sobre ». Les éléments marqués « variante festive » (onde, éclats, lueur du bouton) ne s'ajoutent que si Julien l'a retenue et que c'est noté dans `docs/decisions.md` ; sinon, laisse-les de côté.
- Termine chaque PR par un court résumé : ce qui est fait, ce qui reste, les critères vérifiés.

## Règles de fond (valables pour tout le lot)

1. **Neutralité** : Pour, Contre, Abstention et Je ne sais pas reçoivent exactement la même animation (mêmes durées, mêmes courbes, même énergie). ADOPTÉ et REJETÉ aussi. Aucun mouvement de gauche à droite ou de droite à gauche associé à un choix ou à l'hémicycle (pas de balayage horizontal, pas de « swipe »). Les éclats et halos de fête sont **violets uniquement** (`#7C4DFF`, `#B9A4FF`, `#5B33D6`, `#D9CCFF`), jamais aux couleurs des votes.
2. **Pas de culpabilisation** : aucune animation ou phrase de perte (« tu as perdu ta série »). Pas de secondes qui défilent, pas de rouge d'urgence.
3. **Mouvement réduit** : chaque animation a un remplaçant (section « Mouvement réduit » de chaque fiche), appliqué quand `prefers-reduced-motion: reduce` est actif. Rien ne clignote plus de 3 fois par seconde.
4. **Jamais de frein** : toute séquence de plus de 0,6 s peut être passée (bouton « Passer » + appui sur l'écran) et saute directement à l'état final. Une séance de 3 votes reste faisable en moins de 2 minutes.
5. **Mobile d'abord** (390 px) : animer `transform` et `opacity`. Seule exception admise : `background-color` des sièges de l'hémicycle (577 petits ronds), à mesurer (voir n° 4).
6. **Rien hors écran** : une animation ne démarre que lorsque son élément est visible (`IntersectionObserver`, seuil 0,3) ou à la suite d'un geste de l'utilisateur.
7. **Données** : aucune animation ne suppose un envoi de données ; les réponses restent dans le navigateur.

---

## 0. Socle commun

**Où** : `src/styles/motion.css` (nouveau, importé dans le layout principal) et `src/lib/motion.ts` (nouveau).

**`motion.css`**

```css
:root{
  --dur-xs:150ms; --dur-s:250ms; --dur-m:350ms; --dur-l:600ms;
  --ease-monte:cubic-bezier(.2,.8,.2,1.2);   /* existant (« monte ») */
  --ease-doux:cubic-bezier(.2,.8,.2,1);
  --ease-sortie:cubic-bezier(.5,0,.75,0);
  --ease-ressort:cubic-bezier(.3,.7,.4,1.4);
  --ease-odo:cubic-bezier(.3,1.35,.5,1);
}
@property --num{syntax:'<integer>';inherits:false;initial-value:0}
@keyframes compte{from{--num:var(--from)}to{--num:var(--to)}}
.compte{counter-reset:n var(--num);animation:compte var(--dur,600ms) cubic-bezier(.2,.7,.2,1) var(--delay,0ms) both}
.compte::after{content:counter(n)}
@keyframes fondu{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion: reduce){
  .compte{animation:none;--num:var(--to)}
  /* chaque fiche ci-dessous ajoute ses propres remplacements ici */
}
```

- Déplace dans ce fichier les keyframes existantes (`monte`, `tampon`) si elles sont ailleurs, **sans changer leurs valeurs**.
- Compteur `.compte` : l'élément porte `style="--from:34;--to:39"` et un `aria-label` avec la valeur finale (les lecteurs d'écran ne lisent pas toujours le texte généré en CSS). Navigateurs sans `@property` : la valeur finale s'affiche directement, c'est acceptable.

**`motion.ts`**

- `mouvementReduit(): boolean` → `matchMedia('(prefers-reduced-motion: reduce)').matches`.
- `sequence(etapes: {a: number, faire: () => void}[], conteneur: HTMLElement): { passer(): void }` — programme les étapes avec `setTimeout` ; `passer()` annule les étapes restantes, les exécute toutes immédiatement, puis termine toutes les animations du conteneur avec `conteneur.getAnimations({ subtree: true }).forEach(a => a.finish())`. Si `mouvementReduit()`, toutes les étapes s'exécutent tout de suite.
- `quandVisible(el, fn)` → `IntersectionObserver` (seuil 0,3), appelle `fn` une seule fois.
- Pas plus de 2 Ko minifié pour le fichier.

**C'est fait quand** : les deux fichiers existent, `motion.ts` a des tests (étapes exécutées dans l'ordre, `passer()` laisse l'état final, mouvement réduit = exécution immédiate), et aucune page existante ne change d'apparence.

---

## 1. Le geste de vote — A2 Bouton à ressort + A3 Coche tracée

**Où** : les boutons de vote de la séance et du quiz (Pour, Contre, Abstention, Je ne sais pas).

**Technique** : CSS (classes ajoutées au clic).

| Élément | Animation | Durée | Courbe |
|---|---|---|---|
| Enfoncement à l'appui | existant (`:active`, translateY 5 px, ombre supprimée) | inchangée | inchangée |
| Bouton choisi `.est-choisi` | `ressort` : 0 % `translateY(5px)` → 55 % `translateY(-3px) scale(1.03)` → 100 % `none` | 250 ms | `--ease-ressort` |
| Coche dans le bouton choisi | SVG `path` avec `pathLength="1"`, `stroke-dasharray:1`, `stroke-dashoffset` 1 → 0 | 300 ms, délai 50 ms | `ease-out` |
| Les trois autres `.est-eteint` | `opacity:.35`, `translateY(5px)`, ombre supprimée | transition 200 ms | `ease` |

- Même classe, même animation pour les quatre boutons. Le bouton choisi reçoit `aria-pressed="true"` ; une zone `aria-live="polite"` annonce « Vote enregistré ».
- Coche : trait de la couleur du texte du bouton (blanc sur Pour et Contre, `#5A3E00` sur Abstention, `#6B7385` sur Je ne sais pas).

**Mouvement réduit** : pas de ressort, coche affichée directement, les autres boutons s'estompent sans transition.

**C'est fait quand** : les quatre boutons produisent exactement les mêmes animations (même nom, même durée, même courbe, vérifié par un test sur `getComputedStyle`) ; aucun décalage de mise en page pendant l'animation ; mouvement réduit vérifié avec l'émulation des outils de développement.

---

## 2. L'enchaînement des cartes — A4 Carte qui s'envole + A1 Carte qui arrive

**Où** : la carte de question de la séance et du quiz (les boutons restent en place, seule la carte change).

**Technique** : Web Animations API.

- 380 ms après le choix : `carte.animate([{transform:'none',opacity:1},{transform:'translateY(-56px) rotate(-2deg) scale(.96)',opacity:0}], {duration:280, easing:'cubic-bezier(.5,0,.75,0)', fill:'forwards'})`.
- À la fin (`.finished`) : afficher la question suivante avec l'animation existante « monte » (350 ms, `--ease-monte`).
- Toujours vers le haut, quel que soit le choix.
- Un nouvel appui pendant l'attente de 380 ms passe directement à la carte suivante.
- La barre de progression garde son allongement existant (0,4 s).
- Accessibilité : le focus passe au titre de la nouvelle question (`tabindex="-1"` puis `focus({preventScroll:true})`).

**Mouvement réduit** : la carte disparaît et la suivante apparaît en fondu de 150 ms chacun, sans déplacement ; attente réduite à 220 ms.

**C'est fait quand** : du toucher à la carte suivante lisible, moins d'1 s ; une séance de 3 votes jouée au rythme normal tient en moins de 2 min (test manuel chronométré noté dans la PR) ; le double appui ne fait jamais sauter deux questions.

---

## 3. La jauge de précision — R4

**Où** : un composant unique `JaugePrecision`, utilisé dans la révélation après chaque vote, la fin de séance et le résultat du quiz.

**Technique** : CSS (`transform: scaleX`) + compteur `.compte`.

- Piste `#ECEEF3`, hauteur 14 px, rayon 999 px, 9 encoches blanches de 2 px à 10, 20… 90 %.
- Remplissage violet `#7C4DFF` (ombre intérieure existante), `transform-origin:left`, animation de `scaleX(ancien)` à `scaleX(nouveau)` en 600 ms, `--ease-doux`, délai réglable (1,2 s dans la révélation).
- Pourcentage : `.compte` de l'ancienne à la nouvelle valeur, 600 ms.
- Formule : `Math.round((1 - Math.exp(-n / 20)) * 100)`.
- Au passage de 24 à 25 votes : pastille « Fiable » (fond `#1F2433`, texte blanc) qui apparaît en 450 ms, délai 500 ms : 0 % `scale(.3) rotate(-8deg)` opacité 0 → 70 % `scale(1.12) rotate(2deg)` → 100 % `none`. Ensuite elle reste affichée sans animation.
- `role="meter"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` = valeur finale dès le départ.

**Mouvement réduit** : jauge et chiffre à leur valeur finale, pastille sans animation.

**C'est fait quand** : test unitaire de la formule (39 % à 10 votes, 71 % à 25, 84 % à 37) ; le même composant sert aux trois écrans ; la pastille n'est animée qu'au 25e vote.

---

## 4. L'hémicycle en ondes — R1 + R5 Compteur des voix

**Où** : le composant hémicycle existant (577 sièges, 13 rangs), nouveau mode « révélation ». Brique réutilisée plus tard par le verdict, le jumeau et les stories.

**Technique** : CSS, délai par siège calculé au rendu.

- Chaque siège reçoit `style="--d:XXXms"` avec `XXX = rang × 55 + aléa(0–70)` ; l'aléa est **déterministe** (calculé à partir du numéro du siège) pour que deux affichages soient identiques.
- Classe `.onde` : `@keyframes vague{0%{background-color:#DFE3EB;transform:scale(.55)}60%{transform:scale(1.25)}100%{transform:none}}`, 320 ms, `--ease-doux`, `animation-delay:var(--d)`, `fill-mode: backwards`. Durée totale ≈ 1 s.
- Ordre : du rang intérieur vers l'extérieur. **Jamais de balayage gauche → droite.**
- À 1 150 ms : les sièges dont le vote diffère de celui de l'utilisateur passent à `opacity:.38` (transition 300 ms), comme dans V5.
- Au centre, « pour – contre » en `.compte` de 0 au total, 800 ms (1 000 ms au verdict).

**Mouvement réduit** : couleurs finales en fondu de 200 ms, chiffres finaux.

**Performance** : mesurer avec les outils de développement de Chrome (processeur ralenti ×6, profil mobile). Objectif : pas d'image au-delà de 32 ms pendant l'onde. Si l'objectif n'est pas tenu, repli : n'animer que `opacity` et `transform` sur une couche colorée et signaler l'écart dans la PR.

**C'est fait quand** : l'onde est identique quel que soit le vote de l'utilisateur ; la mesure de performance est notée dans la PR ; « Passer » affiche l'hémicycle final instantanément.

---

## 5. Ta voix en plus — R3

**Où** : la carte « Ta voix de 578e » de la révélation après chaque vote.

**Technique** : CSS.

- La carte apparaît à 900 ms avec « monte ».
- Un rond violet de 16 px (`#7C4DFF`, anneau `#D9CCFF`) se pose : `@keyframes vole{0%{transform:translateY(46px) scale(2.2);opacity:0}60%{transform:translateY(-4px) scale(.9);opacity:1}100%{transform:none}}`, 450 ms, `cubic-bezier(.2,.8,.2,1.1)`.
- Le chiffre du choix de l'utilisateur (pour, contre ou abstention) s'affiche avec +1 et fait un rebond : `scale(1.3)` à 45 %, couleur `#5B33D6`, 400 ms, délai 300 ms. Même traitement pour les trois choix. « Je ne sais pas » : pas de +1, la carte affiche seulement le nombre de voix qu'il aurait fallu pour inverser le résultat.

**Mouvement réduit** : carte en fondu, chiffre final sans rebond, rond posé.

**C'est fait quand** : le chiffre augmenté correspond bien au choix ; les trois choix déclenchent la même animation ; le texte reste lisible pendant toute l'animation.

---

## 6. Le tampon de fin de séance — F1 + F2 Bilan en cascade

**Où** : l'écran « Séance terminée ».

**Technique** : CSS + `sequence()` du socle.

| Temps | Quoi | Durée | Détail |
|---|---|---|---|
| 0 ms | Tampon « A voté » | 600 ms | animation « tampon » existante |
| 350 ms | Onde (variante festive) | 700 ms | anneau `border:6px solid #B9A4FF`, `scale(.7)` → `scale(1.5)`, opacité .7 → 0 |
| 400 ms | Éclats (variante festive) | 600 ms | 12 ronds violets de 10 px, partent du bord du tampon, s'éloignent de 45 à 60 px en s'effaçant |
| 650 ms | 3 cartes de bilan | 350 ms chacune | « monte », délais 0 / 80 / 160 ms |
| 850 ms | Précision | 600 ms | `.compte` (+N points) |
| 1 100 ms | Carnet (lot 2 pour l'animation du tampon dans la case) | — | affiché sans animation dans ce lot |
| 1 500 ms | Rendez-vous du mardi | 350 ms | « monte » ; l'interrupteur « Me prévenir » ne s'active jamais tout seul |

- Bouton « Passer » visible pendant la séquence (≈ 2 s), plus un appui n'importe où sur l'écran.

**Mouvement réduit** : tout l'état final en fondu de 200 ms, sans onde ni éclats.

**C'est fait quand** : la séquence complète dure moins de 2,2 s ; « Passer » donne l'état final en un appui ; aucune notification n'est activée sans geste de l'utilisateur.

---

## 7. La série qui roule et qui gèle — F3

**Où** : la carte « semaines d'affilée » de la fin de séance (et la même carte sur l'accueil en période de trêve).

**Technique** : CSS.

- **Compteur kilométrique** : boîte de hauteur = hauteur de ligne (34 px), `overflow:hidden` ; à l'intérieur une colonne `[ancien, nouveau]` ; `@keyframes odo{0%,25%{transform:none}100%{transform:translateY(-50%)}}`, 700 ms, `--ease-odo`.
- **Flamme** : `transform-origin:50% 90%`, à 60 % `scale(1.35) rotate(-6deg)`, 600 ms, une seule fois.
- **Trêve parlementaire** (série gelée) : un flocon SVG (traits `#0B6AAE`, `pathLength="1"`) se dessine en 600 ms, délai 200 ms ; pastille ronde `#DDF1FF` (ombre `#BFE3FB`) qui apparaît en `scale(.4) rotate(-40deg)` → `none`, 600 ms. Texte : « Ta série de N semaines est gelée : elle t'attend pour la reprise, [date]. » Aucune mention de perte.
- La période de trêve vient des données d'agenda déjà prévues ; en attendant, une constante de dates dans la configuration.

**Mouvement réduit** : chiffre final, flamme fixe, flocon affiché d'un coup.

**C'est fait quand** : le chiffre passe bien de N à N+1 ; l'état « gelée » s'affiche pendant une trêve et ne contient aucun mot de perte (test sur le texte) ; les bleus du gel ne sont pas le bleu « Pour » `#2F7BFF`.

---

## 8. Le verdict au toucher — D1 Révélation au toucher + D3 Tampon et écart

**Où** : la page Verdict (mardi, dès la publication du scrutin).

**Technique** : CSS + `sequence()` du socle ; réutilise l'hémicycle en ondes (n° 4).

- **Avant** : hémicycle gris qui « respire » (`opacity` .5 ↔ 1, cycle 2,4 s, `ease-in-out`, infini), « ? » au centre, bouton « Découvrir le verdict ». En variante festive, le bouton porte l'animation « glow » existante (1,8 s). **Aucun compte à rebours, aucune attente imposée.**
- **Au toucher** :

| Temps | Quoi | Durée |
|---|---|---|
| 0 ms | Hémicycle en ondes + compteurs (n° 4) | 1 000 ms |
| 1 000 ms | Carte sombre « monte » + tampon ADOPTÉ / REJETÉ (existant) | 600 ms |
| 1 550 ms | Le chiffre de l'écart (« à 6 voix près ») grossit une fois : `scale(1.18)` à 45 % | 400 ms |
| 1 500 ms | Carte « Ta voix de 578e » (« monte ») avec le nombre de députés qui auraient dû changer d'avis : P − R + 1 si adopté, R − P si rejeté | 350 ms |

- ADOPTÉ et REJETÉ : même tampon, même couleur, même durée.
- « Passer » pendant la séquence (≈ 2,4 s).

**Mouvement réduit** : hémicycle gris fixe et bouton fixe avant ; après le toucher, état final en fondu de 200 ms.

**C'est fait quand** : la révélation ne démarre que sur le geste de l'utilisateur ; test qui compare les styles du tampon pour les deux issues ; le calcul des voix pour inverser est testé sur deux cas (adopté, rejeté).

---

## Vérification finale du lot

- [ ] Émulation « prefers-reduced-motion: reduce » : chaque écran du lot affiche son état final sans mouvement.
- [ ] Une séance complète de 3 votes jouée en moins de 2 minutes, chronométrée.
- [ ] Aucune animation au chargement d'un élément hors écran.
- [ ] Aucun mouvement horizontal lié à un choix ; Pour / Contre / Abstention / Je ne sais pas et ADOPTÉ / REJETÉ identiques.
- [ ] Aucun fichier JavaScript ajouté au-delà de `motion.ts` et du code des composants ; aucune dépendance ajoutée dans `package.json`.
- [ ] Coche de chaque numéro dans `docs/PLANNING.md` et une entrée datée dans `docs/decisions.md` (« Animations lot 1 : … »).

## Hors de ce lot (pour mémoire)

Deuxième lot : T3 0/3 → 3/3 sur l'accueil, J2 groupe le plus proche, J3 carte du jumeau, D2 compte des voix au verdict, D5 toi face au résultat, X2 changement de page (transitions de vue natives d'Astro), H2 siège qui respire, X5 suivre une loi. Plus tard : stories, construction de l'hémicycle, siège touché, carnet, ticket, compte à rebours, Ma députée, listes et anneaux, chargement.
