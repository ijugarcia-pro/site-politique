import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { mouvementReduit, quandVisible, sequence } from './motion.ts';

/** Un conteneur factice dont on compte les animations terminées ou arrêtées. */
const conteneur = () => {
  const journal: string[] = [];
  const anims = [
    { finish: () => journal.push('finie'), cancel: () => journal.push('annulée') },
    { finish: () => { throw new Error('infinie'); }, cancel: () => journal.push('annulée') },
  ];
  return { journal, el: { getAnimations: () => anims } as unknown as HTMLElement };
};
const reduit = (oui: boolean) => {
  (globalThis as { matchMedia?: unknown }).matchMedia = () => ({ matches: oui });
};

test('les étapes s’exécutent dans l’ordre de leur temps', () => {
  reduit(false);
  mock.timers.enable({ apis: ['setTimeout'] });
  const fait: string[] = [];
  const { el } = conteneur();
  sequence([{ a: 300, faire: () => fait.push('c') }, { a: 0, faire: () => fait.push('a') },
    { a: 100, faire: () => fait.push('b') }], el);
  assert.deepEqual(fait, []);
  mock.timers.tick(150);
  assert.deepEqual(fait, ['a', 'b']);
  mock.timers.tick(200);
  assert.deepEqual(fait, ['a', 'b', 'c']);
  mock.timers.reset();
});

test('passer() exécute le reste une seule fois et termine les animations', () => {
  reduit(false);
  mock.timers.enable({ apis: ['setTimeout'] });
  const fait: string[] = [];
  const { el, journal } = conteneur();
  const s = sequence([{ a: 0, faire: () => fait.push('a') }, { a: 500, faire: () => fait.push('b') },
    { a: 900, faire: () => fait.push('c') }], el);
  mock.timers.tick(10);
  s.passer();
  assert.deepEqual(fait, ['a', 'b', 'c']);
  assert.deepEqual(journal, ['finie', 'annulée']);
  mock.timers.tick(2000);
  s.passer();
  assert.deepEqual(fait, ['a', 'b', 'c']);
  mock.timers.reset();
});

test('mouvement réduit : tout s’exécute tout de suite', () => {
  reduit(true);
  assert.equal(mouvementReduit(), true);
  const fait: string[] = [];
  sequence([{ a: 800, faire: () => fait.push('b') }, { a: 0, faire: () => fait.push('a') }],
    conteneur().el);
  assert.deepEqual(fait, ['a', 'b']);
  reduit(false);
});

test('quandVisible : une seule fois, au seuil de 30 %', () => {
  let rappel: (e: { isIntersecting: boolean }[]) => void = () => {};
  let options: { threshold?: number } = {};
  let coupe = false;
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = class {
    constructor(f: typeof rappel, o: typeof options) { rappel = f; options = o; }
    observe() {}
    disconnect() { coupe = true; }
  };
  let n = 0;
  quandVisible({} as Element, () => n++);
  assert.equal(options.threshold, 0.3);
  rappel([{ isIntersecting: false }]);
  assert.equal(n, 0);
  rappel([{ isIntersecting: true }]);
  assert.equal(n, 1);
  assert.equal(coupe, true);
  delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
});
