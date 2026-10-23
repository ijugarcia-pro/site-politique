// Où tombe un siège dans l'image fixe de la salle (public/salle3d/fond-salle.webp, 1 600 × 1 000,
// la vue « La salle » depuis le perchoir) : calculé au build, avec la géométrie et le cadrage de
// la 3D, pour poser un repère sur une image sans charger la 3D (fiche d'un député, VDEF lot V8).
import * as THREE from 'three';
import { position, sieges3D } from './geometrie.ts';
import { cadrage } from './scene.ts';

/** Les proportions de l'image fixe de la salle. */
export const ASPECT_FOND_SALLE = 1.6;

let camera: THREE.PerspectiveCamera | null = null;
let sieges: ReturnType<typeof sieges3D> | null = null;

/** Le siège i (index de la composition) dans l'image fixe : x et y entre 0 et 1, depuis le coin
 *  haut gauche ; null hors de l'image. */
export function siegeDansFond(i: number): { x: number; y: number } | null {
  if (!camera) {
    const c = cadrage('salle', ASPECT_FOND_SALLE);
    camera = new THREE.PerspectiveCamera(c.fov, ASPECT_FOND_SALLE, 0.1, 200);
    camera.position.set(...c.pos);
    camera.lookAt(...c.cible);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    sieges = sieges3D();
  }
  const s = sieges![i];
  if (!s) return null;
  const v = new THREE.Vector3(...position(s, 1.05)).project(camera);
  const x = (v.x + 1) / 2;
  const y = (1 - v.y) / 2;
  return x < 0 || x > 1 || y < 0 || y > 1 || v.z > 1 ? null : { x, y };
}
