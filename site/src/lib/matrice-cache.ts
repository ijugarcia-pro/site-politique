// Les données publiques lues par le navigateur (/donnees/), chargées une fois par visite (lot 1 du
// cadrage MVP, docs/rapport-perf-30-oct.md) : le ClientRouter d'Astro garde le même contexte
// JavaScript d'une page à l'autre, donc une promesse partagée suffit. En ligne, Cloudflare Pages
// sert ces fichiers en `max-age=0, must-revalidate` : sans ce partage, chaque page refaisait un
// aller-retour. Le cache vit sur globalThis : il reste partagé même si le bundler copie ce module
// dans le script de chaque page. Rien n'est écrit dans le stockage du navigateur.

const promesses: Map<string, Promise<unknown>> =
  ((globalThis as { __donnees578?: Map<string, Promise<unknown>> }).__donnees578 ??= new Map());

/** Un fichier de /donnees/, chargé une seule fois ; un échec n'est pas gardé (on réessaiera). */
export function donnee<T = any>(nom: string): Promise<T> {
  let p = promesses.get(nom) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`/donnees/${nom}`).then((r) => {
      if (!r.ok) throw new Error(`/donnees/${nom} : ${r.status}`);
      return r.json() as Promise<T>;
    });
    p.catch(() => promesses.delete(nom));
    promesses.set(nom, p);
  }
  return p;
}
