// Le Dessus du dévoilement (t92) : les 577 sièges tiennent dans la zone visible, quelles que soient
// ses proportions ; au téléphone en portrait, la salle est couchée et les sièges sont plus grands.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { cadrageDessus, DEPUTES, FORMATS_DEVOILEMENT, positionsDevoilement, siegesDessus } from './cadrage-haut.ts';
import { position, sieges3D } from './geometrie.ts';

for (const [nom, zl, zh, l, h] of [['1 440 × 900 moins la feuille', 936, 826, 1440, 900], ['1 280 × 650 moins la feuille', 776, 576, 1280, 650],
  ['téléphone, tiroir moyen', 390, 400, 390, 844], ['téléphone, tiroir replié', 390, 712, 390, 844],
  ['image fixe d\'ordinateur', 1200, 1000, 2000, 1400], ['image fixe de téléphone', 390, 618, 620, 1000]] as const) {
  test(`Dessus, ${nom} : les 577 sièges dans la zone`, () => {
    const s = siegesDessus(zl, zh, l, h);
    assert.equal(s.length, 577);
    for (const p of s) {
      assert.ok(Math.abs(p.x - 0.5) * l <= zl / 2, `siège hors de la largeur : ${p.x}`);
      assert.ok(Math.abs(p.y - 0.5) * h <= zh / 2, `siège hors de la hauteur : ${p.y}`);
      assert.ok(p.r > 0 && p.r < 0.03);
    }
  });
}

test('couchée sur un canevas en portrait seulement : tribune à gauche, sièges plus grands', () => {
  assert.deepEqual(cadrageDessus(1000, 800, 1000, 800).haut, [0, 0, 1]);
  assert.deepEqual(cadrageDessus(390, 712, 390, 844).haut, [1, 0, 0]);
  const couche = siegesDessus(390, 712, 390, 844), droite = (() => {
    // La même zone, sur un canevas qui n'est pas en portrait : la salle reste droite.
    const l = 700;
    return siegesDessus(390, 712, l, 844).map((s) => s.r * l);
  })();
  assert.ok(couche[300].r * 390 > droite[300] * 1.4, 'les sièges doivent être plus grands');
  assert.ok(Math.abs(couche[0].x - 0.5) < 0.5);
});

test('la tribune est en bas de l\'image, ou à gauche quand la salle est couchée', () => {
  const p = positionsDevoilement();
  assert.ok(p.ordinateur.fauteuil[1] > 0.5, 'tribune en bas');
  assert.ok(p.telephone.fauteuil[0] < 0.5, 'tribune à gauche');
  assert.deepEqual(p.ordinateur.zone, [FORMATS_DEVOILEMENT.ordinateur.zone[0] / FORMATS_DEVOILEMENT.ordinateur.image[0], FORMATS_DEVOILEMENT.ordinateur.zone[1] / FORMATS_DEVOILEMENT.ordinateur.image[1]]);
});

// La vue « Voir les députés » : plein écran, sur toutes les tailles de la matrice (cadrage, § 7).
for (const [l, h] of [[1280, 600], [1366, 650], [1440, 900], [1536, 730], [1920, 1080], [2560, 1080], [768, 1024], [1024, 768], [360, 640], [390, 844], [412, 915], [844, 390]]) {
  test(`vue des députés, ${l} × ${h} : les 577 sièges à l'écran, et le plus grands possible`, () => {
    const c = cadrageDessus(l, h, l, h, DEPUTES);
    const cam = new THREE.PerspectiveCamera(c.fov, l / h, 0.1, 400);
    cam.position.set(...c.pos); cam.up.set(...c.haut); cam.lookAt(...c.cible);
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let xMax = 0, yMax = 0;
    for (const s of sieges3D()) {
      const v = new THREE.Vector3(...position(s, 0.55)).project(cam);
      assert.ok(Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1, `siège hors de l'écran : ${v.x}, ${v.y}`);
      xMax = Math.max(xMax, Math.abs(v.x)); yMax = Math.max(yMax, Math.abs(v.y));
    }
    // La salle remplit l'écran dans au moins une direction.
    assert.ok(Math.max(xMax, yMax) > 0.79, `salle trop petite : ${xMax}, ${yMax}`);
  });
}
