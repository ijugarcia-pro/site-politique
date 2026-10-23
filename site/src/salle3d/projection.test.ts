// Le repère d'un siège sur l'image fixe de la salle (projection.ts) : les sièges du milieu
// tombent dans l'image, sur les gradins, et la gauche de la salle à gauche de l'image.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { siegeDansFond } from './projection.ts';

test('un siège se projette sur les gradins de l’image fixe', () => {
  const milieu = siegeDansFond(300)!;
  assert.ok(milieu.x > 0.4 && milieu.x < 0.65, `x = ${milieu.x}`);
  assert.ok(milieu.y > 0.45 && milieu.y < 0.7, `y = ${milieu.y}`);
  const gauche = siegeDansFond(100)!;
  const droite = siegeDansFond(450)!;
  assert.ok(gauche.x < milieu.x && milieu.x < droite.x);
  assert.equal(siegeDansFond(9999), null);
});
