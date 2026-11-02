// Le « Dessus » (t92, docs/design-salle-dessus/, d'après la visite virtuelle de l'Assemblée) : la
// caméra à la verticale de l'hémicycle, tribune en bas, à la hauteur où le dossier et le perchoir
// tiennent dans ce que les feuilles laissent voir. Sur un canevas en portrait, la salle est couchée
// (tribune à gauche) : les sièges y sont environ 1,6 fois plus grands. Partagé par la 3D (scene.ts)
// et par le build (positionsDevoilement, sièges posés sur l'image fixe du dévoilement).
import * as THREE from 'three';
import { FAUTEUIL_578, P, position, sieges3D } from './geometrie.ts';
import { delaiOnde } from '../lib/hemicycle.ts';

/** fov : le champ vertical du canevas ; demiLargeur : le dossier (r = 21,9 m) ; demiProfondeur et
 *  centre : du perchoir au dossier ; yRef : le haut des gradins ; couche : sous ces proportions de
 *  canevas, la salle se couche. */
export const DESSUS = { fov: 50, demiLargeur: 21.9, demiProfondeur: 13.8, centre: 7.4, yRef: P.YTOP + 1.0, couche: 0.8 } as const;

/** La vue « Voir les députés » : le même Dessus, plus proche, cadré sur les seuls sièges. Le perchoir
 *  sort par le bas de l'écran (retour de Julien du 2 nov. 2026). */
export const DEPUTES = { ...DESSUS, demiLargeur: 22.2, demiProfondeur: 11.2, centre: 10.6 } as const;

/** Le Dessus pour une zone visible de `zl` × `zh` sur un canevas de `l` × `h` (même unité). La zone
 *  se centre ensuite dans le canevas par setViewOffset (scene.ts), sans déformer. */
export function cadrageDessus(zl: number, zh: number, l: number, h: number, vue: typeof DESSUS | typeof DEPUTES = DESSUS) {
  const tv = Math.tan((vue.fov * Math.PI) / 360), couche = l / h < vue.couche;
  const [enX, enY] = couche ? [vue.demiProfondeur, vue.demiLargeur] : [vue.demiLargeur, vue.demiProfondeur];
  const d = Math.max((enX * h) / (tv * zl), (enY * h) / (tv * zh));
  return {
    pos: [0, vue.yRef + d, vue.centre] as [number, number, number],
    cible: [0, 0, vue.centre] as [number, number, number],
    fov: vue.fov as number,
    haut: (couche ? [1, 0, 0] : [0, 0, 1]) as [number, number, number],
  };
}

/** La caméra du Dessus pour une zone centrée dans un canevas (sans feuille d'un seul côté). */
export function cameraDessus(zl: number, zh: number, l: number, h: number): THREE.PerspectiveCamera {
  const c = cadrageDessus(zl, zh, l, h);
  const cam = new THREE.PerspectiveCamera(c.fov, l / h, 0.1, 400);
  cam.position.set(...c.pos);
  cam.up.set(...c.haut);
  cam.lookAt(...c.cible);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

/** Les formats de l'image fixe du dévoilement : [largeur, hauteur] de l'image et de la zone où la
 *  salle doit tenir (en pixels CSS). Le reste de l'image (le plafond doré) remplit l'écran autour de
 *  la salle, sous les feuilles. Au téléphone en portrait, la salle est couchée. À garder en accord
 *  avec scripts/images-fixes.mjs. */
export const FORMATS_DEVOILEMENT = {
  ordinateur: { image: [2000, 1400], zone: [1200, 1000] },
  telephone: { image: [620, 1000], zone: [390, 618] },
} as const;

/** Chaque siège dans une image du Dessus : x et y entre 0 et 1 depuis le coin haut gauche, r le rayon
 *  apparent du fauteuil en part de la largeur de l'image, rang le rang du siège (0 : le plus près de
 *  la tribune). */
export function siegesDessus(zl: number, zh: number, l: number, h: number): { x: number; y: number; r: number; rang: number }[] {
  const c = cameraDessus(zl, zh, l, h);
  const v = new THREE.Vector3(), w = new THREE.Vector3(), aspect = l / h;
  return sieges3D().map((s) => {
    const [x, y, z] = position(s, 0.55);
    v.set(x, y, z).project(c);
    // Le rayon apparent : un demi-fauteuil (0,3 m) de côté, projeté.
    w.set(x + 0.3 * Math.cos(s.th), y, z + 0.3 * Math.sin(s.th)).project(c);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, r: Math.hypot(w.x - v.x, (w.y - v.y) / aspect) / 2, rang: s.rang };
  });
}

/** Où tombent les sièges sur l'image fixe du dévoilement, au build (Trancher.astro, verdict.astro) :
 *  pour chaque siège [x, y, rayon, délai de l'onde en ms] ; plus le 578e fauteuil (le repère « Ta
 *  place t'attend ») et la part de l'image que la salle occupe (`zone`, centrée). L'onde va du rang
 *  intérieur vers l'extérieur, avec un aléa tiré du numéro du siège (lib/hemicycle.ts, delaiOnde). */
export function positionsDevoilement() {
  const poser = ({ image: [l, h], zone: [zl, zh] }: { image: readonly [number, number]; zone: readonly [number, number] }) => {
    const f = new THREE.Vector3(FAUTEUIL_578.x, FAUTEUIL_578.y + 0.9, FAUTEUIL_578.z).project(cameraDessus(zl, zh, l, h));
    return {
      sieges: siegesDessus(zl, zh, l, h).map((s, k) => [+s.x.toFixed(4), +s.y.toFixed(4), +s.r.toFixed(4),
        delaiOnde(s.rang, k)] as [number, number, number, number]),
      fauteuil: [+((f.x + 1) / 2).toFixed(4), +((1 - f.y) / 2).toFixed(4)] as [number, number],
      zone: [zl / l, zh / h] as [number, number],
    };
  };
  return { ordinateur: poser(FORMATS_DEVOILEMENT.ordinateur), telephone: poser(FORMATS_DEVOILEMENT.telephone) };
}
