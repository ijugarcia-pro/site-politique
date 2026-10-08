// Code postal → communes → circonscriptions, un fichier par préfixe (export/site/cp/).
import { fichiersExport, lireExport } from '../../../lib/donnees.ts';

export function getStaticPaths() {
  return fichiersExport('cp').map((prefixe) => ({ params: { prefixe } }));
}

export function GET({ params }: { params: { prefixe: string } }) {
  return new Response(lireExport(`cp/${params.prefixe}.json`),
    { headers: { 'Content-Type': 'application/json' } });
}
