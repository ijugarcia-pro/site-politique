// Le cadrage ajusté à la zone visible (cadrage MVP, lot 4) : le Dessus tient les 577 sièges dans
// ce que les feuilles laissent voir, quelles que soient la fenêtre et la feuille ; la vue « La
// salle » garde son angle dans les bornes prévues, et son cadrage d'origine en plein écran.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { position, sieges3D } from './geometrie.ts';
import { cadrage, cadrageAjuste } from './scene.ts';

/** Les fenêtres de la matrice (§ 7 du cadrage) : largeur, hauteur, ce que couvrent les feuilles. */
const CAS: [string, number, number, number, number][] = [
  ['1 280 × 600, feuille à droite', 1280, 600, 504, 74],
  ['1 366 × 650, feuille à droite', 1366, 650, 504, 74],
  ['1 440 × 900, feuille à droite', 1440, 900, 504, 74],
  ['2 560 × 1 080, feuille à droite', 2560, 1080, 504, 74],
  ['1 024 × 768, feuille à droite', 1024, 768, 504, 74],
  ['téléphone, salle de 390 × 300', 390, 300, 0, 100],
];

for (const [nom, w, h, droite, haut] of CAS) {
  test(`Dessus, ${nom} : les 577 sièges dans la zone`, () => {
    const zl = w - droite, zh = h - haut;
    const c = cadrageAjuste('dessus', zl, zh, h, w);
    const cam = new THREE.PerspectiveCamera(c.fov, w / h, 0.1, 400);
    cam.position.set(...c.pos);
    cam.up.set(...c.haut!);
    cam.lookAt(...c.cible);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    for (const s of sieges3D()) {
      const v = new THREE.Vector3(...position(s, 0.55)).project(cam);
      // En pixels depuis le centre de l'image, qui est le centre de la zone (setViewOffset).
      assert.ok(Math.abs(v.x * w) / 2 <= zl / 2, `siège hors de la largeur : ${v.x}`);
      assert.ok(Math.abs(v.y * h) / 2 <= zh / 2, `siège hors de la hauteur : ${v.y}`);
    }
  });
}

test('vue « La salle » : plein écran 16/10, le cadrage d\'origine', () => {
  const c = cadrageAjuste('salle', 1600, 1000, 1000);
  assert.ok(Math.abs(c.fov - cadrage('salle', 1.6).fov) < 0.1);
});

test('vue « La salle » : le champ reste borné, quelle que soit la zone', () => {
  assert.ok(Math.abs(cadrageAjuste('salle', 980, 900, 900).fov - 78) < 0.01);
  assert.ok(Math.abs(cadrageAjuste('salle', 2100, 1080, 1080).fov - 58) < 0.01);
});

test('les autres vues gardent leur cadrage', () => {
  assert.deepEqual(cadrageAjuste('tribune', 1000, 500, 900), cadrage('tribune', 2));
});
