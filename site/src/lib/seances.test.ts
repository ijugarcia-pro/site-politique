import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { avancement, quandCourt, repriseApres, serie, texteGel } from './seances.ts';

const f = (...l: string[]) => new Set(l);

test('la série compte les semaines d’affilée', () => {
  assert.equal(serie(f(), f(), '2026-10-12'), 0);
  assert.equal(serie(f('2026-10-12', '2026-10-05'), f(), '2026-10-12'), 2);
  // La semaine en cours pas encore faite ne casse pas la série.
  assert.equal(serie(f('2026-10-05', '2026-09-28'), f(), '2026-10-12'), 2);
  // Une semaine manquée la casse.
  assert.equal(serie(f('2026-10-12', '2026-09-28'), f(), '2026-10-12'), 1);
});

test('les vacances gèlent la série sans la casser', () => {
  assert.equal(serie(f('2026-10-12', '2026-09-21'), f('2026-10-05', '2026-09-28'), '2026-10-12'), 2);
});

// La séance du 12 octobre 2026 : 2 votes solennels annoncés le mardi 13 à 15 h, 1 vote passé.
const mardi = { date: '2026-10-13', debut: '2026-10-13 15:00:00+02' };
const passe = { date: '2026-04-09', debut: null };

test('quand les députés votent, en court', () => {
  assert.equal(quandCourt(mardi.date, mardi.debut), 'mardi 13 oct., 15 h');
  assert.equal(quandCourt('2026-10-14', '2026-10-14 16:30:00+02'), 'mercredi 14 oct., 16 h 30');
  assert.equal(quandCourt('2026-10-13', null), 'mardi 13 oct.');
});

test('séance 0/3 : pas encore de verdict, pas de bandeau', () => {
  const a = avancement([{ juge: false, ...mardi }, { juge: false, ...mardi }, { juge: false, ...mardi }]);
  assert.deepEqual(a, { total: 3, juges: 0, etat: 'aucun', fraction: '0/3', bandeau: null });
});

test('séance 1/3 : le verdict dit où en est la séance', () => {
  const a = avancement([{ juge: false, ...mardi }, { juge: false, ...mardi }, { juge: true, ...passe }]);
  assert.equal(a.etat, 'partiel');
  assert.equal(a.fraction, '1/3');
  assert.equal(a.bandeau, '1 vote sur 3 jugé · les 2 autres : mardi 13 oct., 15 h');
});

test('séance 2/3 : un seul vote attendu, ou deux dates différentes', () => {
  const a = avancement([{ juge: true, ...mardi }, { juge: false, ...mardi }, { juge: true, ...passe }]);
  assert.equal(a.bandeau, '2 votes sur 3 jugés · le dernier : mardi 13 oct., 15 h');
  const b = avancement([{ juge: false, ...mardi },
    { juge: false, date: '2026-10-14', debut: '2026-10-14 15:00:00+02' }, { juge: true, ...passe }]);
  assert.equal(b.bandeau, '1 vote sur 3 jugé · les 2 autres : mardi 13 oct., 15 h et mercredi 14 oct., 15 h');
});

test('séance 3/3 : l’état partiel disparaît', () => {
  const a = avancement([{ juge: true, ...mardi }, { juge: true, ...mardi }, { juge: true, ...passe }]);
  assert.deepEqual(a, { total: 3, juges: 3, etat: 'complet', fraction: '3/3', bandeau: null });
});

test('série gelée : jamais un mot de perte, la reprise quand elle est connue', () => {
  const textes = [texteGel(1, null), texteGel(6, null), texteGel(6, 'le lundi 4 janvier')];
  assert.equal(textes[0], 'Ta série de 1 semaine est gelée : elle t\'attend pour la reprise.');
  assert.equal(textes[2], 'Ta série de 6 semaines est gelée : elle t\'attend pour la reprise, le lundi 4 janvier.');
  for (const t of textes) assert.doesNotMatch(t, /perd|perte|perdu|cass|rompu|fini|termin|échou|plus de série|recommence|zéro/i);
  const treves = [{ du: '2026-12-21', au: '2026-12-28', reprise: 'le lundi 4 janvier' }];
  assert.equal(repriseApres('2026-12-28', treves), 'le lundi 4 janvier');
  assert.equal(repriseApres('2027-01-04', treves), null);
});
