// La gestion des couleurs de la salle (docs/design-final/DESIGN-FINAL.md, § 7). Le prototype de
// Julien (three r128) règle à l'œil ses couleurs en hexadécimal (lumières, brouillard, matières),
// prises telles quelles. three ≥ r152 les convertit de sRGB en linéaire (ColorManagement) : plus
// saturées et plus chaudes, elles doraient toute la salle. On coupe cette conversion, comme le
// recommande three pour retrouver l'aspect r128 ; les textures gardent leur espace (SRGBColorSpace)
// et la sortie reste en sRGB. À importer avant toute création de couleur.
//
// Les couleurs qui viennent de l'interface (votes, peau et tenues du personnage) doivent, elles,
// être rendues exactement : elles passent par `couleurExacte`, qui fait la conversion à la main.

import * as THREE from 'three';

THREE.ColorManagement.enabled = false;

/** Une couleur sRGB de l'interface (« #2F7BFF »), convertie pour être rendue telle quelle. */
export function couleurExacte(c: THREE.ColorRepresentation, cible = new THREE.Color()): THREE.Color {
  return cible.set(c).convertSRGBToLinear();
}
