// La vue haute du dévoilement (lot 2 du cadrage MVP) : les 577 sièges tiennent dans la zone
// visible, marge de 4 % comprise, quelles que soient ses proportions ; le champ reste raisonnable.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { champHaut, siegesHaut } from './cadrage-haut.ts';

for (const [nom, aspect] of [['1 440 × 900 moins la feuille', 920 / 900], ['1 280 × 650 moins la feuille', 780 / 650],
  ['téléphone, salle de 390 × 300', 1.3], ['image fixe 1,2', 1.2], ['portrait', 0.6]] as const) {
  test(`vue haute, ${nom} : les 577 sièges dans le cadre`, () => {
    const s = siegesHaut(aspect);
    assert.equal(s.length, 577);
    for (const p of s) {
      assert.ok(p.x >= 0.035 && p.x <= 0.965 && p.y >= 0.035 && p.y <= 0.965, `siège hors cadre : ${p.x}, ${p.y}`);
      assert.ok(p.r > 0 && p.r < 0.03);
    }
  });
}

test('le champ s\'élargit quand la zone se resserre, sans dépasser 90° en paysage', () => {
  assert.ok(champHaut(1.6) < champHaut(1.0));
  assert.ok(champHaut(1.0) < 90);
});
