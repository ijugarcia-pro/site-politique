// Le personnage du visiteur en 3D (docs/refonte-la-seance.md, § 5), repris des formes du prototype
// (docs/salle-3d/room.js, `personnage`) : formes simples et lisses, aucun genre imposé. Le
// prototype n'avait qu'une pose assise ; le personnage a maintenant un squelette simple (bassin,
// cuisses, genoux, épaules, coudes) qui prend la pose assise, debout ou en marche. Repère local :
// le personnage regarde vers +z, les pieds à y = 0 debout ; assis, son origine est celle du
// fauteuil (comme dans room.js).

import { couleurExacte } from './gestion-couleurs.ts';
import * as THREE from 'three';
import { couleursDe, type Apparence } from './apparence.ts';

export interface Personnage {
  groupe: THREE.Group;
  /** La tête (cachée dans la vue « Ta place », quand la caméra est à ses yeux). */
  tete: THREE.Object3D;
  assis(): void;
  debout(): void;
  /** Une image de la marche : phase en radians (un pas = π). */
  marcher(phase: number): void;
}

const CUISSE = 0.44, TIBIA = 0.48, BRAS = 0.3, AVANT_BRAS = 0.28;
/** Assis : le bassin sur l'assise du fauteuil (room.js : assise vers y = 0,55), légèrement en
 *  arrière et incliné ; la tête au-dessus du bassin ; les yeux devant le centre de la tête. */
const BASSIN_ASSIS = { y: 0.6, z: -0.08, inclinaison: -0.06 } as const;
const TETE = { y: 0.67, z: -0.04 } as const;
const YEUX = { y: 0.01, z: 0.09 } as const;

/** Les yeux du personnage assis, dans le repère du fauteuil (le personnage regarde vers +z) :
 *  la caméra de la vue « Ta place » s'y pose (scene.ts). */
export function yeuxAssis(): [number, number, number] {
  const y = TETE.y + YEUX.y, z = TETE.z + YEUX.z, a = BASSIN_ASSIS.inclinaison;
  return [0, BASSIN_ASSIS.y + y * Math.cos(a) - z * Math.sin(a), BASSIN_ASSIS.z + y * Math.sin(a) + z * Math.cos(a)];
}

export function creerPersonnage(a: Apparence): Personnage {
  const c = couleursDe(a);
  const std = (couleur: string, r: number) => new THREE.MeshStandardMaterial({ color: couleurExacte(couleur), roughness: r, envMapIntensity: 0.5 });
  const peau = std(c.peau, 0.62), haut = std(c.haut, 0.88), bas = std(c.bas, 0.82), cheveux = std(c.cheveux, 0.72);
  const groupe = new THREE.Group();
  const bassin = new THREE.Group(); groupe.add(bassin);
  const maillage = (g: THREE.BufferGeometry, m: THREE.Material) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; return x; };
  /** Un segment vertical vers le bas, de longueur l, arrondi aux deux bouts. */
  const segment = (l: number, r: number, m: THREE.Material) => {
    const g = new THREE.Group();
    const cyl = maillage(new THREE.CylinderGeometry(r, r, l, 20), m); cyl.position.y = -l / 2; g.add(cyl);
    const bout = maillage(new THREE.SphereGeometry(r, 18, 12), m); bout.position.y = -l; g.add(bout);
    return g;
  };

  // Le buste (le tour de room.js), le cou, la tête.
  const prof = [[0.001, 0], [0.13, 0.0], [0.155, 0.07], [0.145, 0.2], [0.165, 0.36], [0.185, 0.44], [0.11, 0.5], [0.04, 0.52], [0.001, 0.52]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const buste = maillage(new THREE.LatheGeometry(prof, 36), haut); buste.scale.set(1, 1, 0.66); buste.position.set(0, -0.03, -0.04); bassin.add(buste);
  const cou = maillage(new THREE.CylinderGeometry(0.046, 0.046, 0.1, 18), peau); cou.position.set(0, 0.53, -0.05); bassin.add(cou);
  const tete = new THREE.Group(); tete.position.set(0, TETE.y, TETE.z); bassin.add(tete);
  const visage = maillage(new THREE.SphereGeometry(0.1, 36, 26), peau); visage.scale.set(0.9, 1.1, 0.98); tete.add(visage);
  coiffer(tete, a.coiffure, cheveux, maillage);

  // Les jambes : une cuisse qui pivote à la hanche, un tibia qui pivote au genou, un pied.
  const jambes = [-0.092, 0.092].map((x) => {
    const hanche = new THREE.Group(); hanche.position.set(x, 0, 0); bassin.add(hanche);
    hanche.add(segment(CUISSE, 0.068, bas));
    const genou = new THREE.Group(); genou.position.y = -CUISSE; hanche.add(genou);
    genou.add(segment(TIBIA, 0.052, bas));
    const pied = maillage(new THREE.BoxGeometry(0.1, 0.07, 0.22), bas); pied.position.set(0, -TIBIA - 0.02, 0.06); genou.add(pied);
    return { hanche, genou };
  });
  // Les bras : une épaule et un coude, une main.
  const bras = [-1, 1].map((s) => {
    const epaule = new THREE.Group(); epaule.position.set(s * 0.2, 0.42, -0.05); bassin.add(epaule);
    epaule.add(segment(BRAS, 0.044, haut));
    const coude = new THREE.Group(); coude.position.y = -BRAS; epaule.add(coude);
    coude.add(segment(AVANT_BRAS, 0.04, haut));
    const main = maillage(new THREE.SphereGeometry(0.042, 20, 14), peau); main.scale.set(1, 1.3, 0.7); main.position.y = -AVANT_BRAS - 0.04; coude.add(main);
    return { epaule, coude };
  });

  const assis = () => {
    bassin.position.set(0, BASSIN_ASSIS.y, BASSIN_ASSIS.z); bassin.rotation.set(BASSIN_ASSIS.inclinaison, 0, 0);
    for (const j of jambes) { j.hanche.rotation.set(-Math.PI / 2, 0, 0); j.genou.rotation.set(Math.PI / 2, 0, 0); }
    for (const b of bras) { b.epaule.rotation.set(-0.35, 0, 0); b.coude.rotation.set(-1.1, 0, 0); }
  };
  const debout = () => {
    bassin.position.set(0, CUISSE + TIBIA + 0.04, 0); bassin.rotation.set(0, 0, 0);
    for (const j of jambes) { j.hanche.rotation.set(0, 0, 0); j.genou.rotation.set(0, 0, 0); }
    for (const b of bras) { b.epaule.rotation.set(0, 0, 0); b.coude.rotation.set(-0.15, 0, 0); }
  };
  const marcher = (phase: number) => {
    debout();
    const s = Math.sin(phase);
    bassin.position.y += Math.abs(Math.cos(phase)) * 0.025;
    jambes.forEach((j, k) => {
      const v = k === 0 ? s : -s;
      j.hanche.rotation.x = 0.45 * v;
      j.genou.rotation.x = Math.max(0, -v) * 0.7;
    });
    bras.forEach((b, k) => { b.epaule.rotation.x = 0.35 * (k === 0 ? -s : s); });
  };
  assis();
  return { groupe, tete, assis, debout, marcher };
}

/** Les 6 coiffures, sans genre : rasée, courte, carré, longue, bouclée, chignon. */
function coiffer(tete: THREE.Group, coupe: string, m: THREE.Material,
  maillage: (g: THREE.BufferGeometry, m: THREE.Material) => THREE.Mesh) {
  if (coupe === 'rasee') return;
  const calotte = (ouverture: number) => {
    const h = maillage(new THREE.SphereGeometry(0.106, 36, 20, 0, Math.PI * 2, 0, ouverture), m);
    h.scale.set(0.93, 1.1, 1.02); h.position.set(0, 0.015, -0.015); h.rotation.x = -0.35; tete.add(h);
  };
  if (coupe === 'courte') calotte(Math.PI * 0.5);
  if (coupe === 'carre') {
    calotte(Math.PI * 0.55);
    const c = maillage(new THREE.CylinderGeometry(0.105, 0.112, 0.13, 30, 1, true, Math.PI * 0.35, Math.PI * 1.3), m);
    c.position.set(0, -0.04, -0.01); tete.add(c);
  }
  if (coupe === 'longue') {
    calotte(Math.PI * 0.72);
    const q = maillage(new THREE.CylinderGeometry(0.085, 0.07, 0.24, 24), m); q.position.set(0, -0.12, -0.07); tete.add(q);
  }
  if (coupe === 'boucles') {
    calotte(Math.PI * 0.55);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const b = maillage(new THREE.SphereGeometry(0.038, 14, 10), m);
      b.position.set(Math.cos(a) * 0.085, 0.05 + 0.02 * Math.sin(a * 3), Math.sin(a) * 0.08 - 0.015); tete.add(b);
    }
  }
  if (coupe === 'chignon') {
    calotte(Math.PI * 0.55);
    const ch = maillage(new THREE.SphereGeometry(0.052, 20, 14), m); ch.position.set(0, 0.07, -0.1); tete.add(ch);
  }
}
