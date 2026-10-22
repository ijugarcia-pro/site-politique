import assert from 'node:assert/strict';
import { test } from 'node:test';
import { peutOuvrir } from './pilote.ts';

test('la 3D ne s’ouvre pas sans WebGL, en économie de données ou avec peu de mémoire', () => {
  const oui = () => true;
  assert.equal(peutOuvrir({}, oui), 'ok');
  assert.equal(peutOuvrir({ deviceMemory: 8 }, oui), 'ok');
  assert.equal(peutOuvrir({}, () => false), 'webgl');
  assert.equal(peutOuvrir({ connection: { saveData: true } }, oui), 'economie');
  assert.equal(peutOuvrir({ deviceMemory: 2 }, oui), 'memoire');
});

test('au clavier : flèches pour tourner, + et − pour zoomer, Échap pour revenir', async () => {
  const { geste, PAS_CLAVIER } = await import('./pilote.ts');
  assert.deepEqual(geste('ArrowLeft'), { lacet: -PAS_CLAVIER.lacet });
  assert.deepEqual(geste('ArrowUp'), { tangage: PAS_CLAVIER.tangage });
  assert.ok(geste('+')!.zoom! < 1 && geste('-')!.zoom! > 1);
  assert.deepEqual(geste('Escape'), { recentrer: true });
  assert.equal(geste('a'), null);
});

test('le glisser est amorti : 15 % de l’écart par image, jusqu’à le rattraper', async () => {
  const { amortir, GLISSER } = await import('./pilote.ts');
  assert.equal(GLISSER.rattrapage, 0.15);
  let reste = 1, total = 0, images = 0;
  while (reste !== 0 && images < 200) { const a = amortir(reste); total += a.pas; reste = a.reste; images += 1; }
  assert.equal(reste, 0);
  assert.ok(Math.abs(total - 1) < 1e-12);
  assert.ok(images > 10 && images < 100);
  assert.deepEqual(amortir(0.5), { pas: 0.075, reste: 0.425 });
});

test('l’inertie au lâcher s’éteint en 400 ms', async () => {
  const { vitesseInertie, GLISSER } = await import('./pilote.ts');
  assert.equal(GLISSER.inertie, 400);
  assert.equal(vitesseInertie(2, 0), 2);
  assert.equal(vitesseInertie(2, 200), 1);
  assert.equal(vitesseInertie(2, 400), 0);
  assert.equal(vitesseInertie(2, 900), 0);
});
