// Le libellé d'un repère, raccourci (cadrage MVP, R8, lot 7) : sans « (Département) », sauf s'il
// distingue deux homonymes de la liste. Séparé de etiquettes.ts : la page l'emporte dans son
// JavaScript initial, pas le placement.
export function libelleCourt(nom: string, autres: string[]): string {
  const court = (t: string) => t.replace(/\s*\([^)]*\)\s*$/, '');
  const c = court(nom);
  return autres.some((a) => a !== nom && court(a) === c) ? nom : c;
}
