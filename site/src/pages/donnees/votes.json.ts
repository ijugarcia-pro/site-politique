// Les votes en version courte, pour « Tes réponses » (VDEF, lot V6), lus par le navigateur :
// tes réponses ne quittent pas ta machine, c'est la liste qui vient à elles. Par identifiant de
// scrutin : [numéro, la question de sa carte ou son titre court, le thème de la carte ou "",
// 1 si adopté sinon 0, date].
import { cartesQuestions, majuscule, scrutins } from '../../lib/donnees.ts';

export function GET() {
  const cartes = new Map(cartesQuestions().map((c) => [c.uid, c]));
  const liste = Object.fromEntries(scrutins().map((s) => {
    const carte = cartes.get(s.uid);
    const court = majuscule(s.titre).replace(/\.$/, '');
    const titre = carte?.question || (court.length > 110 ? `${court.slice(0, 108)}…` : court);
    return [s.uid, [s.numero, titre, carte?.theme ?? '', s.sort === 'adopté' ? 1 : 0, s.date]];
  }));
  return new Response(JSON.stringify(liste), { headers: { 'Content-Type': 'application/json' } });
}
