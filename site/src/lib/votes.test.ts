import assert from 'node:assert/strict';
import { test } from 'node:test';
import { barre, bascule, famille, ligneGroupe, marge, nature, normaliser, partExprimes, verdict,
  type Chiffres } from './votes.ts';

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
