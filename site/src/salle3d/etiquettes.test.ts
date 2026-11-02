// Les étiquettes sans collision (cadrage MVP, R8) : jamais deux étiquettes qui se recouvrent, sur
// 200 tirages de 4 repères dans deux cadres ; jumeau et opposé adjacents restent lisibles.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GROUPE_PX, placerEtiquettes, type PointEtiquette, type Rect } from './etiquettes.ts';
import { libelleCourt } from './libelle.ts';

/** Un générateur reproductible. */
const graine = (s: number) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
const recouvre = (a: Rect, b: Rect) => a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.h && b.y < a.y + a.h;
const rectDe = (p: { x: number | null; y: number | null }, l: number, h: number): Rect => ({ x: p.x!, y: p.y!, l, h });

for (const [nom, l, h, obstacles] of [
  ['1 440 × 900', 1440, 900, [{ x: 16, y: 88, l: 330, h: 300 }, { x: 1064, y: 780, l: 360, h: 104 }]],
  ['390 × 844', 390, 844, [{ x: 0, y: 464, l: 390, h: 380 }]],
] as [string, number, number, Rect[]][]) {
  test(`${nom} : 200 tirages de 4 repères, aucune étiquette n'en recouvre une autre`, () => {
    const r = graine(l);
    const bornes = { x: 0, y: 0, l, h };
    for (let t = 0; t < 200; t++) {
      // Un tirage sur deux, les points sont serrés : le cas difficile.
      const cx = 40 + r() * (l - 80), cy = 40 + r() * (h - 80), serre = t % 2 === 0;
      const pts: PointEtiquette[] = Array.from({ length: 4 }, () => ({
        x: serre ? Math.min(l - 2, Math.max(2, cx + (r() - 0.5) * 120)) : r() * l,
        y: serre ? Math.min(h - 2, Math.max(2, cy + (r() - 0.5) * 120)) : r() * h,
        l: 90 + r() * 110, h: 32,
      }));
      const res = placerEtiquettes(pts, obstacles, bornes);
      const poses: Rect[] = [];
      res.forEach((p, i) => {
        if (p.avec !== null) {
          assert.equal(p.x, null);
          assert.ok(Math.hypot(pts[i].x - pts[p.avec].x, pts[i].y - pts[p.avec].y) < GROUPE_PX);
          return;
        }
        assert.notEqual(p.x, null, `tirage ${t} : étiquette ${i} non posée`);
        const largeur = Math.max(pts[i].l, ...p.groupes.map((k) => pts[k].l));
        const rect = rectDe(p, largeur, pts[i].h + p.groupes.length * 18);
        assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.l <= l && rect.y + rect.h <= h, `tirage ${t} : hors du cadre`);
        poses.forEach((o) => assert.ok(!recouvre(rect, o), `tirage ${t} : deux étiquettes se recouvrent`));
        poses.push(rect);
      });
    }
  });
}

test('un point seul : son étiquette juste au-dessus, sans fil', () => {
  const [p] = placerEtiquettes([{ x: 500, y: 400, l: 100, h: 32 }], [], { x: 0, y: 0, l: 1000, h: 800 });
  assert.equal(p.fil, false);
  assert.ok(p.y! + 32 <= 400);
  assert.equal(p.x, 450);
});

test('jumeau et opposé à moins de 30 px : une étiquette à deux lignes, celle du plus prioritaire', () => {
  const res = placerEtiquettes([{ x: 500, y: 400, l: 100, h: 32 }, { x: 515, y: 410, l: 120, h: 32 }], [], { x: 0, y: 0, l: 1000, h: 800 });
  assert.deepEqual(res[0].groupes, [1]);
  assert.equal(res[1].avec, 0);
});

test('jumeau et opposé à 40 px : deux étiquettes séparées, les deux lisibles', () => {
  const pts = [{ x: 500, y: 400, l: 140, h: 32 }, { x: 540, y: 400, l: 140, h: 32 }];
  const res = placerEtiquettes(pts, [], { x: 0, y: 0, l: 1000, h: 800 });
  assert.ok(!recouvre(rectDe(res[0], 140, 32), rectDe(res[1], 140, 32)));
});

test('une feuille est évitée, avec un fil si l\'étiquette s\'éloigne', () => {
  const res = placerEtiquettes([{ x: 100, y: 100, l: 120, h: 32 }], [{ x: 0, y: 0, l: 300, h: 300 }], { x: 0, y: 0, l: 1000, h: 800 });
  assert.ok(!recouvre(rectDe(res[0], 120, 32), { x: 0, y: 0, l: 300, h: 300 }));
  assert.equal(res[0].fil, true);
});

test('le département reste seulement pour distinguer deux homonymes', () => {
  assert.equal(libelleCourt('Anne Martin (Alpes-Maritimes)', ['Paul Durand (Var)']), 'Anne Martin');
  assert.equal(libelleCourt('Anne Martin (Alpes-Maritimes)', ['Anne Martin (Var)']), 'Anne Martin (Alpes-Maritimes)');
  assert.equal(libelleCourt('Anne Martin', []), 'Anne Martin');
});
