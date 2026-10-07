// Les mêmes informations que la page « État des données », en JSON (pipeline/etat.py).
import { etat } from '../../lib/donnees.ts';

export function GET() {
  return new Response(JSON.stringify(etat(), null, 1), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
