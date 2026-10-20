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
