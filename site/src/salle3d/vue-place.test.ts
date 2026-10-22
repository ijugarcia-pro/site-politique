// La vue « Ta place » (VDEF, lot V3) : depuis chacun des 577 sièges, les yeux du personnage voient
// la tribune. Le rayon des yeux vers le pupitre ne touche ni colonne, ni balustrade, ni flanc des
// gradins, ni pupitre d'un rang de devant (THREE.Raycaster, sur les cotes de geometrie.ts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { BALUSTRADE, colonnes, P, position, RAYON_COLONNE, sieges3D } from './geometrie.ts';
import { yeuxAssis } from './personnage3d.ts';
import { CENTRE_TRIBUNE, REGARD, yeuxAuSiege } from './scene.ts';

const rad = (d: number) => (d * Math.PI) / 180;

/** Les obstacles, dans le même repère que la scène. */
function obstacles(): THREE.Object3D[] {
  const liste: THREE.Object3D[] = [];
  const matiere = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const [x, z, y0, h] of colonnes()) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(RAYON_COLONNE, RAYON_COLONNE, h, 24), matiere);
    c.position.set(x, y0 + h / 2, z);
    c.name = 'colonne';
    liste.push(c);
  }
  // Un cylindre ouvert autour de l'axe : la balustrade de la galerie, et le devant de chaque
  // pupitre (du bord du pupitre jusqu'à son plateau, rd − 0,03 m, 0,86 m au-dessus de la marche).
  const anneau = (r: number, y0: number, y1: number, nom: string) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 256, 1, true), matiere);
    m.position.y = (y0 + y1) / 2;
    m.name = nom;
    liste.push(m);
  };
  anneau(BALUSTRADE.r, BALUSTRADE.y0, BALUSTRADE.y1, 'balustrade');
  for (let i = 0; i < P.NR; i++) anneau(P.R0 + i * P.D - 0.03, i * P.H, (i + 1) * P.H + 0.86, `pupitre du rang ${i + 1}`);
  // Les flancs des gradins, aux deux bouts de l'hémicycle.
  for (const a of [P.TH0 - 1.5, P.TH1 + 1.5]) {
    for (let i = 0; i < P.NR; i++) {
      const rd = P.R0 + i * P.D, hh = (i + 1) * P.H + 1.0, ar = rad(a), rm = rd + P.D / 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(P.D + 0.02, hh, 0.22), matiere);
      b.position.set(rm * Math.cos(ar), hh / 2, rm * Math.sin(ar)); b.rotation.y = -ar;
      b.name = 'flanc';
      liste.push(b);
    }
  }
  for (const o of liste) o.updateMatrixWorld(true);
  return liste;
}

test('les yeux du personnage assis viennent de sa pose, au-dessus de l’assise', () => {
  const [x, y, z] = yeuxAssis();
  assert.equal(x, 0);
  assert.ok(y > 1.2 && y < 1.35, `hauteur des yeux : ${y}`);
  assert.ok(Math.abs(z) < 0.1);
  assert.equal(REGARD.near, 0.05);
});

test('depuis chacun des 577 sièges, rien ne cache la tribune', () => {
  const sieges = sieges3D();
  assert.equal(sieges.length, 577);
  const objets = obstacles();
  const rayon = new THREE.Raycaster();
  const cible = new THREE.Vector3(...CENTRE_TRIBUNE);
  const caches: string[] = [];
  for (const s of sieges) {
    const yeux = new THREE.Vector3(...yeuxAuSiege(s));
    // Les yeux sont au-dessus du siège et avancés vers la tribune.
    const [sx, sy, sz] = position(s);
    assert.ok(yeux.y > sy + 1.2 && Math.hypot(yeux.x, yeux.z) < Math.hypot(sx, sz));
    const dir = cible.clone().sub(yeux);
    rayon.set(yeux, dir.clone().normalize());
    rayon.far = dir.length();
    const [touche] = rayon.intersectObjects(objets, false);
    if (touche) caches.push(`siège ${s.i} (rang ${s.rang + 1}) : ${touche.object.name}`);
  }
  assert.deepEqual(caches, []);
});
