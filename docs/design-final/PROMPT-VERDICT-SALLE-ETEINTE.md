# Le verdict, salle éteinte · prompt pour un chat Claude (aspect visuel)

> Idée de Julien du 21 octobre 2026, notée pendant le lot D3 du design définitif. À coller dans un chat Claude consacré au visuel (maquettes, images). Le résultat attendu sert ensuite de référence à Claude Code ; rien n'est codé avant que Julien ait choisi.

---

Tu travailles sur le visuel de « Le 578e siège », un site gratuit et neutre qui rend accessibles les votes de l'Assemblée nationale. Chaque semaine, le visiteur tranche 3 vrais votes avant les députés, puis découvre le **verdict**. La direction visuelle s'appelle « La Séance » : une salle de l'Assemblée en 3D réaliste (three.js : velours rouge, marbre blanc cassé, bois, coupole à caissons) sert de décor, et l'interface est une régie de télévision (bandeaux à étiquette rouge, puces de caméra « Cam 1 · Salle », compteurs en Barlow Condensed capitales, questions en Literata).

**Le moment à concevoir : la révélation du verdict dans la salle 3D.**

Aujourd'hui, au verdict, la salle s'allume (lustres, appliques) et un petit voyant de pupitre (une demi-sphère de 5 cm et un léger halo) prend la couleur du vote de chaque député, en onde du rang intérieur vers l'extérieur. Vu de loin (CAM 1, depuis le perchoir), ces voyants sont presque invisibles : on ne lit pas le vote dans la salle.

**L'idée** : quand le verdict tombe, la salle **s'éteint** (lumière générale baissée, coupole et murs dans la pénombre), puis chaque député qui a voté **s'éclaire de la couleur de son vote**. Ceux qui n'ont pas pris part au vote restent dans le noir. On doit lire le résultat d'un coup d'œil : les blocs, les dissidents, les travées vides.

**Ce que j'attends de toi**
1. Les images clés de la séquence, en 16:9 (1 920 × 1 080) et en téléphone (390 × 844), pour CAM 1 · Salle (depuis le perchoir) et CAM 4 · Plan (vue de dessus) :
   a. la salle allumée juste avant (état actuel) ;
   b. la salle éteinte (le « noir » : jusqu'où on assombrit sans perdre la lecture de l'architecture) ;
   c. le résultat, chaque siège éclairé ;
   d. la même chose avec le bandeau de régie posé en bas (« Verdict » / « Adopté à 23 voix près ») et les compteurs (pour, contre, abstentions, absents).
2. Une proposition de **mise en lumière d'un siège**, au choix ou en comparaison : un cône de lumière colorée venu d'en haut sur le fauteuil, une flaque de lumière au sol, un halo autour du pupitre, un voyant agrandi qui éclaire le dossier… avec, pour chaque proposition, ce qui reste lisible en CAM 1 à 1 920 px et à 390 px.
3. La **chorégraphie** : durée de l'extinction, ordre d'allumage (toujours du rang intérieur vers l'extérieur, jamais un balayage gauche-droite, qui évoquerait un axe politique), durée totale ; plus une version « mouvement réduit » (coupe franche, sans animation).
4. Les **valeurs** que Claude Code pourra reprendre : couleurs exactes, intensités relatives, taille des halos, niveau d'assombrissement (en exposition ou en pourcentage), durées.

**Contraintes non négociables (contrat du site)**
- **Couleurs de vote** : pour #2F7BFF (bleu), contre #FF6A3D (orange), abstention #FFC531 (jaune) ; absent et non-votant « éteints mais distincts ». Ces couleurs ne servent qu'aux votes. Julien a parlé de « bleu, rouge, gris » : propose une version aux couleurs du contrat, et dis franchement ce qui se passe avec du rouge (un « contre » rouge disparaîtrait sur le velours rouge des fauteuils et se confondrait avec le rouge de régie #B3132F et les groupes LFI et GDR) et avec du gris pour l'abstention. Julien tranchera.
- **Les sièges restent rouges** : le contrat dit que « les votes passent par les voyants des pupitres, jamais par la couleur des sièges ». L'idée de Julien éclaire les sièges : propose-la de deux façons et montre l'écart. (A) La lumière colorée tombe sur le fauteuil, qui reste en velours rouge, éclairé, comme un projecteur de théâtre. (B) Le fauteuil lui-même prend la couleur du vote, ce qui change le contrat et demande l'accord de Julien.
- **Neutralité** : pour, contre et abstention reçoivent exactement le même traitement (même intensité, même taille, même animation) ; ADOPTÉ et REJETÉ aussi. Aucun dégradé ni axe gauche-droite.
- **Absents** : rien ne s'allume, mais on doit pouvoir distinguer, de près ou dans la légende, absent et non-votant (non-votant ≠ absent).
- **Toi et ton jumeau** : le visiteur a « sa place », le siège de son député jumeau, signalée par un anneau couleur lumière #F2C98A (seule couleur qui le désigne) ; son jumeau, en ivoire. Montre où ces repères se posent dans la salle éteinte.
- **Performance** : 577 sièges, sur téléphone. Pas 577 vraies lumières dynamiques : des matières émissives, des halos en instances ou une texture de lumière ; dis ce qui est réaliste.
- **Accessibilité** : la salle 3D est décorative ; le même résultat existe en hémicycle SVG avec tableau de repli. Contrastes AA pour tout texte posé sur la salle éteinte (bandeau sur un voile sombre).
- Zéro euro, aucune image générée par un service payant : maquettes faites à partir de rendus de la salle ou en dessin vectoriel.

**Références** (dans le dépôt) : `docs/design-final/DESIGN-FINAL.md` (charte), `docs/design-final/maquettes/V6C-03-Verdict.png` (maquette actuelle du verdict), `docs/design-final/maquettes/images/fond-verdict-lumieres.jpg` (salle allumée du prototype), `docs/design-final/planches/D2/salle-calibrage-avant-apres-prototype.jpg` (salle actuelle).
