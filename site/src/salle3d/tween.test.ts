import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpoler, power2InOut } from './tween.ts';

test('power2.inOut : 0, ½, 1 et symétrie', () => {
  assert.equal(power2InOut(0), 0);
  assert.equal(power2InOut(0.5), 0.5);
  assert.equal(power2InOut(1), 1);
  assert.ok(Math.abs(power2InOut(0.25) + power2InOut(0.75) - 1) < 1e-12);
});

test('l’interpolation avance avec l’horloge et se termine sur 1', async () => {
  let t = 0;
  const images: (() => void)[] = [];
  const vus: number[] = [];
  const tw = interpoler(1000, (e) => vus.push(e), { maintenant: () => t, image: (f) => images.push(f) });
  for (const instant of [0, 250, 500, 1000]) { t = instant; images.shift()!(); }
  await tw.fini;
  assert.equal(vus.at(-1), 1);
  assert.ok(vus[1] < vus[2] && vus[2] < 1);
});

test('finir donne l’état final tout de suite', async () => {
  const vus: number[] = [];
  const tw = interpoler(1600, (e) => vus.push(e), { maintenant: () => 0, image: () => {} });
  tw.finir();
  await tw.fini;
  assert.deepEqual(vus, [1]);
});
