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
