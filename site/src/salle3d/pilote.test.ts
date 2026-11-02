import assert from 'node:assert/strict';
import { test } from 'node:test';
import { peutOuvrir } from './pilote.ts';
import { glisseEntre, palierDe, qualiteForcee } from './scene.ts';

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

test('le gouverneur de qualité : 24 ms et 40 ms par image', () => {
  assert.equal(palierDe(16.7), 0);
  assert.equal(palierDe(24), 0);
  assert.equal(palierDe(24.1), 1);
  assert.equal(palierDe(40), 1);
  assert.equal(palierDe(41), 2);
});

test('?qualite= force le palier ; toute autre valeur laisse décider le gouverneur', () => {
  assert.equal(qualiteForcee('?qualite=0'), 0);
  assert.equal(qualiteForcee('?perf=1&qualite=2'), 2);
  assert.equal(qualiteForcee('?qualite=3'), null);
  assert.equal(qualiteForcee(''), null);
});

test('en changeant de page, la caméra ne glisse qu\'entre « La salle » et « Ta place »', () => {
  assert.ok(glisseEntre('salle', 'place'));
  assert.ok(glisseEntre('place', 'salle'));
  assert.ok(!glisseEntre('tribune', 'salle'));
  assert.ok(!glisseEntre('salle', 'tribune'));
  assert.ok(!glisseEntre('tribune', 'place'));
  assert.ok(!glisseEntre('salle', 'salle'));
});
