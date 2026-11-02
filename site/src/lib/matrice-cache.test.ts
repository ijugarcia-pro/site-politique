// Le cache des données publiques (lot 1 du cadrage MVP) : un fichier chargé une fois par visite,
// un échec réessayé.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { donnee } from './matrice-cache.ts';

test('un fichier est chargé une fois ; un échec est réessayé', async () => {
  const appels: string[] = [];
  let echec = true;
  const avant = globalThis.fetch;
  globalThis.fetch = (async (u: string) => {
    appels.push(u);
    if (u.endsWith('essai-echec.json') && echec) { echec = false; return new Response('', { status: 503 }); }
    return new Response(JSON.stringify({ ok: u }), { status: 200 });
  }) as typeof fetch;
  try {
    const [a, b] = await Promise.all([donnee('essai.json'), donnee('essai.json')]);
    assert.equal(a, b);
    await donnee('essai.json');
    assert.deepEqual(appels, ['/donnees/essai.json']);
    await assert.rejects(donnee('essai-echec.json'));
    assert.deepEqual(await donnee('essai-echec.json'), { ok: '/donnees/essai-echec.json' });
  } finally { globalThis.fetch = avant; }
});
