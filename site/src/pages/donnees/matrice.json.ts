// La matrice des votes (pipeline/export_site.py), lue par le navigateur pour calculer ton
// hémicycle : tes réponses ne quittent jamais ta machine, c'est la matrice qui vient à elles.
import { matrice } from '../../lib/donnees.ts';

export function GET() {
  return new Response(JSON.stringify(matrice()), {
    headers: { 'Content-Type': 'application/json' },
  });
}
