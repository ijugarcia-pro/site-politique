// Les députés, en version courte, pour la recherche dans le navigateur (par nom, par
// circonscription) : u = identifiant, n = nom, g = groupe, c = circonscription,
// d = département, e = en exercice.
import { deputes, nomComplet } from '../../lib/donnees.ts';

export function GET() {
  const liste = deputes().map((d) => ({
    u: d.uid, n: nomComplet(d), g: d.sigle, c: d.circo, d: d.departement,
    ...(d.en_exercice ? { e: 1 } : {}),
  }));
  return new Response(JSON.stringify(liste), { headers: { 'Content-Type': 'application/json' } });
}
