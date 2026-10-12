import assert from 'node:assert/strict';
import { test } from 'node:test';
import { barre, bascule, famille, ligneGroupe, marge, nature, normaliser, partExprimes, verdict,
  voix578, type Chiffres } from './votes.ts';

const decompte = { pour: 351, contre: 179, abstention: 7, non_votant: 2, absent: 38 };
const adopteSolennel: Chiffres = {
  sort: 'adopté', categorie: 'ensemble', solennel: true, motion_censure: false, decompte,
  requis: 266, voix_pour_inverser: 86,
};

test('verdict accordé à ce qui est voté', () => {
  assert.equal(verdict(adopteSolennel), 'Adopté');
  assert.equal(verdict({ ...adopteSolennel, sort: 'rejeté' }), 'Rejeté');
  assert.equal(verdict({ ...adopteSolennel, categorie: 'résolution' }), 'Adoptée');
  assert.equal(verdict({ ...adopteSolennel, sort: 'rejeté', motion_censure: true,
    categorie: 'motion de censure' }), 'Rejetée');
});

test('nature du vote', () => {
  assert.equal(nature(adopteSolennel), "Scrutin solennel · vote sur l'ensemble d'un texte");
  assert.equal(nature({ ...adopteSolennel, solennel: false }), "Vote sur l'ensemble d'un texte");
  assert.equal(nature({ ...adopteSolennel, motion_censure: true }), 'Motion de censure');
});

test('voix pour inverser : adopté (P − R + 1), rejeté (R − P)', () => {
  // 351 pour, 266 requis : 86 députés passant de pour à contre font tomber le texte.
  assert.equal(bascule(adopteSolennel),
    'Si 86 députés ayant voté pour avaient voté contre, le texte aurait été rejeté.');
  assert.equal(marge(adopteSolennel), 'à 86 voix près');
  const rejete = { ...adopteSolennel, sort: 'rejeté', voix_pour_inverser: 1 };
  assert.equal(bascule(rejete),
    'Si 1 député ayant voté contre avait voté pour, le texte aurait été adopté.');
  assert.equal(marge(rejete), 'à 1 voix près');
  assert.equal(bascule({ ...adopteSolennel, categorie: 'déclaration', voix_pour_inverser: 2 }),
    'Si 2 députés ayant voté pour avaient voté contre, la déclaration aurait été rejetée.');
});

test('voix pour inverser : motion de censure', () => {
  const censure = { ...adopteSolennel, sort: 'rejeté', motion_censure: true, requis: 289,
    voix_pour_inverser: 98 };
  assert.equal(bascule(censure),
    'Il a manqué 98 voix pour atteindre les 289 requises et faire tomber le Gouvernement.');
  assert.equal(bascule({ ...censure, sort: 'adopté', voix_pour_inverser: 43 }),
    'La motion a été adoptée avec 42 voix de plus que les 289 requises.');
});

test('pas de bascule sans suffrages requis publiés', () => {
  assert.equal(bascule({ ...adopteSolennel, requis: null }), null);
  assert.equal(bascule({ ...adopteSolennel, voix_pour_inverser: null }), null);
  assert.equal(marge({ ...adopteSolennel, voix_pour_inverser: 0 }), null);
});

test('part des exprimés', () => {
  assert.equal(partExprimes(adopteSolennel, 'pour'), 66);
  assert.equal(partExprimes(adopteSolennel, 'contre'), 34);
  assert.equal(partExprimes({ decompte: { ...decompte, pour: 0, contre: 0 } }, 'pour'), 0);
});

test('barre et ligne d’un groupe', () => {
  const d = { pour: 10, contre: 5, abstention: 2, non_votant: 1, absent: 2 };
  assert.deepEqual(barre(d, 20), { pour: 50, abstention: 10, contre: 25 });
  assert.deepEqual(barre(d, 0), { pour: 0, abstention: 0, contre: 0 });
  assert.equal(ligneGroupe(d), '10 pour · 5 contre · 2 abst.');
  assert.equal(ligneGroupe({ ...d, abstention: 0 }), '10 pour · 5 contre');
});

test('familles de votes et recherche sans accents', () => {
  assert.equal(famille(adopteSolennel), 'texte');
  assert.equal(famille({ categorie: 'partie', motion_censure: false }), 'budget');
  assert.equal(famille({ categorie: 'motion de censure', motion_censure: true }), 'censure');
  assert.equal(normaliser("L'Aide à mourir — État"), 'l aide a mourir etat');
});

test('ta voix de 578e : la majorité est recalculée avec ta voix', () => {
  // Scrutin n° 6124 : 78 pour, 67 contre, 73 requis, « à 6 voix près ».
  const officiel = { pour: 78, contre: 67 };
  // Tu votes contre : 146 exprimés, 74 requis ; 5 députés suffisent (73 – 73 : rejeté).
  assert.deepEqual(voix578(officiel, 73, 'contre'), { pour: 78, contre: 68, adopte: true, inverser: 5 });
  // Tu votes pour : 79 – 67, 74 requis ; il en faut 6 (73 – 73).
  assert.deepEqual(voix578(officiel, 73, 'pour'), { pour: 79, contre: 67, adopte: true, inverser: 6 });
  // Texte rejeté, 60 pour, 70 contre, 66 requis : avec ta voix, toujours 66 requis sur 131.
  assert.deepEqual(voix578({ pour: 60, contre: 70 }, 66, 'pour'), { pour: 61, contre: 70, adopte: false, inverser: 5 });
  assert.deepEqual(voix578({ pour: 60, contre: 70 }, 66, 'contre'), { pour: 60, contre: 71, adopte: false, inverser: 6 });
});

test('ta voix de 578e peut changer le sort d’un vote très serré', () => {
  // Scrutin n° 3260 : 185 pour, 184 contre, 185 requis, adopté à 1 voix près.
  assert.deepEqual(voix578({ pour: 185, contre: 184 }, 185, 'contre'),
    { pour: 185, contre: 185, adopte: false, inverser: 1 });
  assert.deepEqual(voix578({ pour: 185, contre: 184 }, 185, 'pour'),
    { pour: 186, contre: 184, adopte: true, inverser: 1 });
  // Égalité officielle (rejeté) : ta voix pour fait adopter le texte.
  assert.deepEqual(voix578({ pour: 72, contre: 72 }, 73, 'pour'), { pour: 73, contre: 72, adopte: true, inverser: 1 });
});

test('ta voix de 578e : seuil fixe gardé, rien sans suffrages requis', () => {
  // Motion de censure : 289 voix requises, quel que soit le nombre de votants.
  assert.deepEqual(voix578({ pour: 271, contre: 0 }, 289, 'pour'), { pour: 272, contre: 0, adopte: false, inverser: 17 });
  assert.equal(voix578({ pour: 78, contre: 67 }, null, 'pour'), null);
  assert.equal(voix578({ pour: 78, contre: 67 }, 0, 'pour'), null);
});
