// Contours des circonscriptions d'un département (export/site/contours/), chargés seulement
// quand il faut situer une adresse.
import { fichiersExport, lireExport } from '../../../lib/donnees.ts';

export function getStaticPaths() {
  return fichiersExport('contours').map((dep) => ({ params: { dep } }));
}

export function GET({ params }: { params: { dep: string } }) {
  return new Response(lireExport(`contours/${params.dep}.json`),
    { headers: { 'Content-Type': 'application/json' } });
}
