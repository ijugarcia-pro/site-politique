// La vue haute du dévoilement (lot 2 du cadrage MVP, docs/cadrage-mvp-retours-test-578e.md, R1) :
// la salle vue de haut, derrière la tribune, plafond masqué, les 577 sièges visibles. Le point de
// vue est fixe ; le champ se calcule pour que tous les sièges tiennent dans la zone visible (sa
// largeur sur sa hauteur), avec une marge de 4 %. Partagé par la 3D (scene.ts, vue « haute ») et
// par le build (projection.ts, sièges posés sur l'image fixe du prototype A). Le cadrage
// « ajusté » à toutes les tailles d'écran viendra au lot 4.
import * as THREE from 'three';
import { position, sieges3D } from './geometrie.ts';

/** Au-dessus de la tribune, à 42 m (au-dessus de la coupole, masquée), regard vers le milieu des gradins. */
export const VUE_HAUTE = { pos: [0, 42, -10] as [number, number, number], cible: [0, 0, 9.5] as [number, number, number] };
export const MARGE_HAUTE = 0.04;

let points: THREE.Vector3[] | null = null;
/** Le pied et le haut de chaque fauteuil, et le bord de son pupitre (0,5 m devant) : un siège est
 *  visible s'ils le sont tous. */
const pointsSieges = () => (points ??= sieges3D().flatMap((s) => [new THREE.Vector3(...position(s, 0)),
  new THREE.Vector3(...position(s, 1.05)), new THREE.Vector3(...position({ ...s, r: s.r + 0.5 }, 0.9))]));

/** La caméra de la vue haute pour un champ et des proportions données. */
export function cameraHaute(fov: number, aspect: number): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(fov, aspect, 0.1, 400);
  c.position.set(...VUE_HAUTE.pos);
  c.lookAt(...VUE_HAUTE.cible);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return c;
}

const champs = new Map<number, number>();
/** Le plus petit champ vertical (en degrés) où les 577 sièges tiennent dans une zone de ces
 *  proportions, marge comprise. */
export function champHaut(aspect: number, marge = MARGE_HAUTE): number {
  const cle = Math.round(aspect * 100) / 100 + marge * 1000;
  const deja = champs.get(cle);
  if (deja) return deja;
  const borne = 1 - 2 * marge;
  const v = new THREE.Vector3();
  let bas = 10, haut = 120;
  for (let k = 0; k < 24; k++) {
    const f = (bas + haut) / 2;
    const c = cameraHaute(f, aspect);
    const tient = pointsSieges().every((p) => {
      v.copy(p).project(c);
      return Math.abs(v.x) <= borne && Math.abs(v.y) <= borne && v.z < 1;
    });
    if (tient) haut = f; else bas = f;
  }
  champs.set(cle, haut);
  return haut;
}

/** La vue haute, pour une zone visible de ces proportions. */
export function cadrageHaut(aspect: number) {
  return { pos: [...VUE_HAUTE.pos] as [number, number, number], cible: [...VUE_HAUTE.cible] as [number, number, number], fov: champHaut(aspect) };
}

/** Chaque siège dans une image de la vue haute de ces proportions : x et y entre 0 et 1 depuis le
 *  coin haut gauche, r le rayon apparent du fauteuil en part de la largeur de l'image, rang le
 *  rang du siège (0 : le plus près de la tribune). */
export function siegesHaut(aspect: number): { x: number; y: number; r: number; rang: number }[] {
  const c = cameraHaute(champHaut(aspect), aspect);
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  return sieges3D().map((s) => {
    const [x, y, z] = position(s, 0.55);
    v.set(x, y, z).project(c);
    // Le rayon apparent : un demi-fauteuil (0,3 m) de côté, projeté.
    w.set(x + 0.3 * Math.cos(s.th), y, z + 0.3 * Math.sin(s.th)).project(c);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, r: Math.hypot(w.x - v.x, (w.y - v.y) / aspect) / 2, rang: s.rang };
  });
}
