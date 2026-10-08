// Couleurs des groupes : celles que l'Assemblée associe à chaque groupe dans son open data
// (`couleurAssociee`), pour reconnaître un groupe d'un coup d'œil. Elles ne disent rien d'une
// position : l'ordre et l'accord viennent des votes réels.

const ENCRE = '#1F2433';
const GRIS = '#9AA1B2';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contraste = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** La couleur d'un groupe, ou un gris s'il n'en a pas. */
export const couleurGroupe = (c: string | null | undefined) =>
  c && /^#[0-9a-f]{6}$/i.test(c) ? c : GRIS;

/** L'encre la plus lisible sur un fond : celle du site ou le blanc (contraste WCAG). */
export const encreSur = (fond: string) =>
  contraste(fond, '#FFFFFF') >= contraste(fond, ENCRE) ? '#FFFFFF' : ENCRE;
