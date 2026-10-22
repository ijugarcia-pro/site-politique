// Mesure du lot V1 (t72) : combien de députés en exercice tombent dans chaque niveau d'accord,
// avant (accord lissé (m + 2) / (n + 4) sur les votes en commun) et après (identiques / N), pour
// des profils types de 25 réponses : les votes du quiz et des lots du parcours (data/quiz.json,
// data/lots.json), répondus comme la majorité des députés qui ont voté, puis comme la position de
// chaque groupe. Rien n'est publié : les chiffres sont pour Julien.
//   node scripts/niveaux-accord.mjs [chemin de matrice.json]   (défaut : ../export/site/matrice.json)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { colonnes, NIVEAUX, profil, VOTES_FIABLES } from '../src/lib/profil.ts';

const racine = resolve(import.meta.dirname, '..', '..');
const matrice = JSON.parse(readFileSync(process.argv[2]
  ?? resolve(racine, 'export', 'site', 'matrice.json'), 'utf-8'));
const quiz = JSON.parse(readFileSync(resolve(racine, 'data', 'quiz.json'), 'utf-8'));
const lots = JSON.parse(readFileSync(resolve(racine, 'data', 'lots.json'), 'utf-8'));
const votes = [...quiz.map((q) => q.uid),
  ...lots.filter((l) => !l.facultatif).flatMap((l) => l.cartes.map((c) => c.uid))]
  .filter((u) => matrice.votes.includes(u)).slice(0, VOTES_FIABLES);

const LETTRES = { P: 'pour', C: 'contre' };
/** Les réponses d'un profil qui suit, vote par vote, la lettre donnée (P ou C). */
const reponses = (lettre) => Object.fromEntries(votes.flatMap((u) => {
  const r = LETTRES[lettre(matrice.votes.indexOf(u))];
  return r ? [[u, r]] : [];
}));
const majorite = (k) => {
  let p = 0, c = 0;
  for (const d of matrice.deputes) { if (d.s[k] === 'P') p++; else if (d.s[k] === 'C') c++; }
  return p >= c ? 'P' : 'C';
};
const profils = [['majorité des députés', reponses(majorite)],
  ...matrice.groupes.map((g) => [`position du groupe ${g.sigle}`, reponses((k) => g.s[k])])];

const lisse = (m, n) => (m + 2) / (n + 4);
const indice = (x) => NIVEAUX.findIndex((t) => x < t.jusqua);

console.log(`${votes.length} votes du quiz et des lots du parcours dans la matrice.`);
console.log(`Niveaux : ${NIVEAUX.map((t) => t.libelle).join(' · ')} (+ « aucun vote exprimé »)\n`);
for (const [nom, reps] of profils) {
  const mes = colonnes(matrice, reps);
  const p = profil(matrice, reps);
  const avant = [0, 0, 0, 0, 0];
  const apres = [0, 0, 0, 0, 0];
  for (const d of matrice.deputes.filter((x) => x.e === 1)) {
    let n = 0, m = 0;
    for (const [i, l] of mes) {
      if ('PCA'.includes(d.s[i])) { n++; if (d.s[i] === l) m++; }
    }
    avant[n ? indice(lisse(m, n)) : 4]++;
  }
  const classes = new Map(p.deputes.map((x) => [x.ligne.u, x]));
  for (const d of matrice.deputes.filter((x) => x.e === 1)) {
    const x = classes.get(d.u);
    apres[x ? indice(x.part) : 4]++;
  }
  console.log(`${nom} (${p.reponses} réponses)`);
  console.log(`  avant : ${avant.join(' · ')}`);
  console.log(`  après : ${apres.join(' · ')}`);
  if (p.jumeau) {
    console.log(`  jumeau : ${p.jumeau.ligne.n}, ${p.jumeau.identiques} votes comme toi sur ${p.reponses}`
      + `${p.egalites ? `, et ${p.egalites} autre(s) à égalité` : ''}`);
  }
}
