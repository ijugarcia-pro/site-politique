// La salle en 3D (docs/refonte-la-seance.md, § 4), portée du prototype de Julien
// (docs/salle-3d/room.js, three r128 sans module) vers three 0.186 en module :
// - couleurs : outputColorSpace et colorSpace au lieu des « encodings » ; conversion des couleurs
//   hexadécimales coupée, comme en r128 (gestion-couleurs.ts) ;
// - lumières physiques : intensités du prototype multipliées par π, puis réglées à l'œil ;
// - velours : sheen devient un nombre, avec sheenColor ;
// - matières précalculées (public/salle3d/, scripts/matieres.mjs) au lieu d'être calculées ici ;
// - sièges tirés du plan 2D (geometrie.ts) : le siège n° i est celui de la composition ;
// - caméras sans GSAP (tween.ts) ; rendu à la demande, ombres recalculées seulement au besoin.
// Retirés : la vue et les matières du « carnet », les ambiances « documentaire » et « plâtre »,
// les voyants tirés au hasard (les pages donnent les vrais votes).
// Chargé à la demande par pilote.ts : jamais dans le JavaScript initial d'une page.

import { couleurExacte } from './gestion-couleurs.ts';
import * as THREE from 'three';
import { chemin, echelleFauteuil, FAUTEUIL_578, longueur, P, position, sieges3D, surChemin, type Siege3D } from './geometrie.ts';
import type { Apparence } from './apparence.ts';
import { creerPersonnage, type Personnage } from './personnage3d.ts';
import { interpoler, type Tween } from './tween.ts';

export type NomVue = 'salle' | 'tribune' | 'travee' | 'plan';
export interface Cadrage { pos: [number, number, number]; cible: [number, number, number]; fov: number;
  haut?: [number, number, number] }
export interface OptionsScene { base?: string; telephone?: boolean; mouvementReduit?: boolean }

const rad = (d: number) => (d * Math.PI) / 180;
/** Lumières physiques de three récent : le prototype réglait ses intensités en mode « hérité ». */
const PI = Math.PI;

/** Les cadrages des caméras. CAM 1 · Salle depuis le perchoir ; CAM 2 · Tribune depuis le sol ;
 *  CAM 4 · Plan vu de dessus (pivoté d'un quart de tour en portrait). */
export function cadrage(nom: NomVue, aspect: number): Cadrage {
  const portrait = aspect < 0.9;
  if (nom === 'tribune') return portrait ? { pos: [0, 1.7, 7.4], cible: [0, 2.6, -4], fov: 72 }
    : { pos: [1.2, 1.7, 6.2], cible: [-0.4, 2.3, -4], fov: 52 };
  if (nom === 'plan') {
    const fov = portrait ? 50 : 40;
    const tv = Math.tan(rad(fov / 2));
    if (portrait) {
      const d = Math.max(15.8 / (tv * aspect), 24.0 / tv) * 1.04;
      return { pos: [0, d, 7.2], cible: [0, 0, 7.2], fov, haut: [1, 0, 0.001] };
    }
    const d = Math.max(23.2 / (tv * aspect), 14.6 / tv) * 1.08;
    return { pos: [0, d, 6.2], cible: [0, 0, 7.0], fov };
  }
  return portrait ? { pos: [0, 9.6, -6.2], cible: [0, 6.4, 10], fov: 80 } : { pos: [0, 7.0, -6.4], cible: [0, 5.5, 11], fov: 64 };
}

export interface Salle3D {
  vue(nom: NomVue, opt?: { instant?: boolean }): Promise<void>;
  terminer(): void;
  /** La couleur du voyant de chaque siège (index de la composition) ; null : éteint. */
  voyants(couleurs: (string | null)[]): void;
  ambiance(nom: 'jour' | 'verdict'): void;
  redimensionner(): void;
  projeter(points: [number, number, number][]): { x: number; y: number; devant: boolean }[];
  /** La position d'un siège (index de la composition) ; -1 : le 578e fauteuil, au pied de la tribune. */
  positionSiege(i: number, dy?: number): [number, number, number];
  readonly vueCourante: NomVue;
  /** Le personnage du visiteur (null : aucun). */
  personnage(a: Apparence | null): void;
  /** Sa place : le siège n° i (celui de son jumeau), ou le 578e fauteuil au pied de la tribune
   *  (null). `marcher` : il s'y rend par les allées (3,5 s, passable ; coupé en mouvement réduit). */
  asseoir(i: number | null, opt?: { marcher?: boolean }): Promise<void>;
  /** Appelée après chaque image : la page y repositionne ses repères (projeter). */
  surRendu: (() => void) | null;
  /** Les voyants s'allument en onde, du rang intérieur vers l'extérieur (R1). */
  voyantsEnOnde(couleurs: (string | null)[], duree?: number): Promise<void>;
  /** Le siège du jumeau : sa plaquette s'éclaire ; null : aucun. */
  jumeau(i: number | null): void;
  /** La caméra libre, bornée (radians, facteur de recul) ; recentrer revient à la vue en cours. */
  orbiter(dLacet: number, dTangage: number): void;
  zoomer(f: number): void;
  recentrer(): void;
  detruire(): void;
}

/* ---------------- Géométrie utilitaire (room.js) ---------------- */

/** Remet chaque triangle dans le bon sens d'après la normale fournie. */
function corrigeSens(g: THREE.BufferGeometry) {
  const p = g.attributes.position.array, n = g.attributes.normal.array, ix = g.index!.array as Uint32Array | Uint16Array;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const d = cx * (n[a] + n[b] + n[c]) + cy * (n[a + 1] + n[b + 1] + n[c + 1]) + cz * (n[a + 2] + n[b + 2] + n[c + 2]);
    if (d < 0) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; }
  }
  g.index!.needsUpdate = true;
}

interface OptBalayage { seg?: number; mats?: number[]; echelle?: number; rRef?: number; vNorm?: boolean; inverse?: boolean }
/** Balayage d'un profil (r, y) autour de l'axe vertical, de th0 à th1 (degrés). */
function balayage(profil: [number, number][], th0: number, th1: number, opt: OptBalayage = {}) {
  const seg = opt.seg || Math.max(8, Math.ceil(Math.abs(th1 - th0) / 1.2));
  const mats = opt.mats || [], echelle = opt.echelle || 1, rRef = opt.rRef;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [], groupes: [number, number, number][] = [];
  let vAcc = 0, base = 0;
  for (let k = 0; k < profil.length - 1; k++) {
    const [r0, y0] = profil[k], [r1, y1] = profil[k + 1];
    const len = Math.hypot(r1 - r0, y1 - y0); if (len < 1e-6) continue;
    let nr = (y1 - y0) / len, ny = -(r1 - r0) / len;
    const vEch = opt.vNorm ? len : echelle;
    if (opt.inverse) { nr = -nr; ny = -ny; }
    const debutIdx = idx.length;
    for (let i = 0; i <= seg; i++) {
      const th = rad(th0 + ((th1 - th0) * i) / seg), c = Math.cos(th), s = Math.sin(th);
      const rr = rRef || (r0 + r1) / 2;
      const u = (th * rr) / echelle;
      pos.push(r0 * c, y0, r0 * s, r1 * c, y1, r1 * s);
      nor.push(nr * c, ny, nr * s, nr * c, ny, nr * s);
      if (opt.vNorm) uv.push(u, 0, u, 1); else uv.push(u, vAcc / vEch, u, (vAcc + len) / vEch);
    }
    for (let i = 0; i < seg; i++) {
      const a = base + i * 2, b = a + 1, c2 = a + 2, d = a + 3;
      idx.push(a, c2, b, b, c2, d);
    }
    base += (seg + 1) * 2; vAcc += len;
    groupes.push([debutIdx, idx.length - debutIdx, mats[k] || 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  for (const [s, n, m] of groupes) g.addGroup(s, n, m);
  corrigeSens(g);
  return g;
}

/** Boîte à arêtes arrondies. */
function boiteRonde(w: number, h: number, d: number, r: number, s = 3) {
  const g = new THREE.BoxGeometry(w, h, d, s * 2, s * 2, s * 2);
  const p = g.attributes.position, v = new THREE.Vector3(), inner = new THREE.Vector3();
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    inner.set(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z)));
    v.sub(inner); if (v.lengthSq() > 0) v.normalize().multiplyScalar(r);
    v.add(inner); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Fusion simple de géométries (non indexées), chacune avec sa matrice. */
function fusion(liste: [THREE.BufferGeometry, THREE.Matrix4 | null][]) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  for (const [geo, m] of liste) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) g.applyMatrix4(m);
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    if (g.attributes.uv) uv.push(...g.attributes.uv.array); else for (let i = 0; i < g.attributes.position.count; i++) uv.push(0, 0);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}
const mat4 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) => {
  const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.setScalar(s); o.updateMatrix(); return o.matrix.clone();
};

/* ---------------- Matières ---------------- */

type Textures = Record<string, THREE.Texture>;

async function charger(base: string): Promise<Textures> {
  const manifeste = await (await fetch(`${base}matieres.json`)).json() as Record<string, { couleur: boolean }>;
  const loader = new THREE.TextureLoader();
  const T: Textures = {};
  await Promise.all(Object.entries(manifeste).map(async ([nom, { couleur }]) => {
    const t = await loader.loadAsync(`${base}${nom}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = couleur ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    T[nom] = t;
  }));
  for (const k of ['mosaique', 'mosaique-h', 'mur', 'mur-h', 'tribune', 'tribune-h', 'perchoir', 'perchoir-h', 'plaque', 'verriere']) {
    T[k].wrapS = T[k].wrapT = THREE.ClampToEdgeWrapping;
  }
  for (const k of ['entablement', 'entablement-h', 'entablement-m']) T[k].flipY = false;
  return T;
}
const clone = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; };

function lueurCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c;
}

function matieres(T: Textures, telephone: boolean) {
  // Sur téléphone, pas de vernis (clearcoat) : il coûte cher au processeur graphique.
  const vernis = telephone ? {} : { clearcoat: 0.55, clearcoatRoughness: 0.28 };
  const cc = (x: number, r: number) => (telephone ? {} : { clearcoat: x, clearcoatRoughness: r });
  const M: Record<string, THREE.Material> & Record<string, any> = {};
  M.noyer = new THREE.MeshPhysicalMaterial({ map: T.bois, bumpMap: T['bois-h'], bumpScale: 0.012, roughnessMap: T['bois-r'], roughness: 1, metalness: 0, ...vernis, envMapIntensity: 0.9 });
  M.noyerClair = new THREE.MeshPhysicalMaterial({ map: T['bois-clair'], bumpMap: T['bois-h'], bumpScale: 0.01, roughness: 0.55, ...vernis, envMapIntensity: 0.9 });
  M.plateau = new THREE.MeshPhysicalMaterial({ map: T.bois, color: 0x9c8474, bumpMap: T['bois-h'], bumpScale: 0.008, roughnessMap: T['bois-r'], roughness: 1, ...cc(0.3, 0.4), envMapIntensity: 0.7 });
  M.panneau = new THREE.MeshPhysicalMaterial({ map: T.panneau, bumpMap: T['panneau-h'], bumpScale: 0.03, roughness: 0.5, ...vernis, envMapIntensity: 0.8 });
  M.velours = new THREE.MeshPhysicalMaterial({ map: T.velours, bumpMap: T['velours-h'], bumpScale: 0.004, roughness: 0.92, metalness: 0,
    sheen: 1, sheenColor: new THREE.Color(0.42, 0.08, 0.1), sheenRoughness: 0.92, specularIntensity: 0, envMapIntensity: 0.3 });
  M.velours.onBeforeCompile = (sh: { fragmentShader: string }) => { // reflet rasant du velours
    sh.fragmentShader = sh.fragmentShader.replace('#include <tonemapping_fragment>',
      'float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);\n gl_FragColor.rgb += vec3(0.20, 0.035, 0.045) * fr * (0.35 + 0.65 * diffuseColor.r);\n#include <tonemapping_fragment>');
  };
  M.moquette = new THREE.MeshStandardMaterial({ map: T.moquette, bumpMap: T['moquette-h'], bumpScale: 0.006, roughness: 1, envMapIntensity: 0.2, color: 0xb89a90 });
  M.marbre = new THREE.MeshPhysicalMaterial({ map: T.marbre, roughness: 0.22, ...cc(0.7, 0.12), envMapIntensity: 0.8 });
  M.statuaire = new THREE.MeshPhysicalMaterial({ map: T.statuaire, roughness: 0.3, ...cc(0.4, 0.2), envMapIntensity: 0.7 });
  M.laiton = new THREE.MeshStandardMaterial({ color: 0xa47a30, metalness: 1, roughness: 1, roughnessMap: T.patine, envMapIntensity: 1.0 });
  M.or = new THREE.MeshStandardMaterial({ color: 0xd8af58, metalness: 1, roughness: 0.85, roughnessMap: T.patine, envMapIntensity: 1.35 });
  M.caisson = new THREE.MeshStandardMaterial({ map: clone(T.caisson, 28, 6), bumpMap: clone(T['caisson-h'], 28, 6), bumpScale: 0.06,
    metalnessMap: clone(T['caisson-m'], 28, 6), metalness: 1, roughnessMap: clone(T['caisson-r'], 28, 6), roughness: 1, side: THREE.BackSide, envMapIntensity: 1.1 });
  M.caissonBerceau = M.caisson.clone();
  for (const k of ['map', 'bumpMap', 'metalnessMap', 'roughnessMap']) M.caissonBerceau[k] = clone(M.caisson[k], 1, 1);
  M.caissonBerceau.side = THREE.FrontSide;
  M.verriere = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: T.verriere, emissiveIntensity: 2.0, roughness: 1, side: THREE.BackSide, fog: false });
  M.vitrage = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: T.vitrage, emissiveIntensity: 2.0, roughness: 1, fog: false });
  M.mosaique = new THREE.MeshPhysicalMaterial({ map: T.mosaique, bumpMap: T['mosaique-h'], bumpScale: 0.01, roughness: 0.42, ...cc(0.35, 0.2), envMapIntensity: 0.6 });
  M.sol = new THREE.MeshPhysicalMaterial({ map: clone(T.marbre, 6, 6), color: 0xb9a596, roughness: 0.3, ...cc(0.4, 0.3), envMapIntensity: 0.6 });
  M.colonne = new THREE.MeshPhysicalMaterial({ map: clone(T.statuaire, 1, 3), color: 0xeadcc4, bumpMap: T.cannelures, bumpScale: 0.09, roughness: 0.28, ...cc(0.5, 0.18), envMapIntensity: 0.8 });
  M.balustre = new THREE.MeshStandardMaterial({ map: clone(T.balustrade, 60, 1), bumpMap: clone(T['balustrade-h'], 60, 1), bumpScale: 0.03, alphaTest: 0.5, metalness: 1, roughness: 0.38, side: THREE.DoubleSide, envMapIntensity: 1.3 });
  M.entablement = new THREE.MeshStandardMaterial({ map: clone(T.entablement, 40, 1), bumpMap: clone(T['entablement-h'], 40, 1), bumpScale: 0.04, metalnessMap: clone(T['entablement-m'], 40, 1), metalness: 1, roughness: 0.55, envMapIntensity: 1.0 });
  M.galerie = new THREE.MeshStandardMaterial({ map: clone(T.galerie, 18, 1), emissive: 0xffffff, emissiveIntensity: 0.28, roughness: 0.85, envMapIntensity: 0.4 });
  M.galerie.emissiveMap = M.galerie.map;
  M.stuc = new THREE.MeshStandardMaterial({ color: 0xd8c7a3, roughness: 0.85, envMapIntensity: 0.4 });
  M.mur = new THREE.MeshStandardMaterial({ map: T.mur, bumpMap: T['mur-h'], bumpScale: 0.03, roughness: 0.6, envMapIntensity: 0.6 });
  M.facT = new THREE.MeshPhysicalMaterial({ map: T.tribune, bumpMap: T['tribune-h'], bumpScale: 0.03, roughness: 0.25, ...cc(0.6, 0.15), envMapIntensity: 0.8 });
  M.facP = new THREE.MeshPhysicalMaterial({ map: T.perchoir, bumpMap: T['perchoir-h'], bumpScale: 0.03, roughness: 0.25, ...cc(0.6, 0.15), envMapIntensity: 0.8 });
  M.facB = M.facP.clone(); M.facB.map = clone(T.perchoir, 3, 1); M.facB.map.wrapS = THREE.RepeatWrapping;
  M.facB.bumpMap = clone(T['perchoir-h'], 3, 1); M.facB.bumpMap.wrapS = THREE.RepeatWrapping;
  M.p578 = new THREE.MeshStandardMaterial({ map: T.plaque, metalness: 0.85, roughness: 0.35, envMapIntensity: 1.2 });
  M.voyant = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const lueur = new THREE.CanvasTexture(lueurCanvas()); lueur.colorSpace = THREE.SRGBColorSpace;
  M.lueur = new THREE.MeshBasicMaterial({ color: 0xffffff, map: lueur, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, fog: false });
  M.faisceau = new THREE.ShaderMaterial({
    uniforms: { uCouleur: { value: new THREE.Color(1.0, 0.86, 0.62) }, uForce: { value: 0.11 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vN=normalMatrix*normal; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uCouleur; uniform float uForce; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e=abs(dot(normalize(vN),normalize(vV))); float a=pow(e,2.5)*smoothstep(0.0,0.55,vUv.y)*(1.0-smoothstep(0.82,1.0,vUv.y)); a*=0.75+0.25*sin(vUv.x*44.0)*sin(vUv.x*17.0+1.3); gl_FragColor=vec4(uCouleur*a*uForce,1.0); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  return M;
}

/* ---------------- La salle ---------------- */

export async function creer(canvas: HTMLCanvasElement, opt: OptionsScene = {}): Promise<Salle3D> {
  const base = opt.base ?? '/salle3d/';
  const telephone = opt.telephone ?? canvas.clientWidth < 520;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !telephone, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const T = await charger(base);
  const M = matieres(T, telephone);
  const G: Record<string, any> = {};
  const I: Record<string, THREE.InstancedMesh> = {};
  const ombre = <O extends THREE.Object3D>(m: O, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
  const racine = new THREE.Group(); scene.add(racine);
  const sieges: Siege3D[] = sieges3D();

  /* Sols */
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), M.sol); sol.rotation.x = -Math.PI / 2; sol.position.set(0, -0.01, 10); racine.add(ombre(sol, false));
  const mos = new THREE.Mesh(new THREE.PlaneGeometry(18, 14.4), M.mosaique); mos.rotation.x = -Math.PI / 2; mos.position.set(0, 0.002, 0); racine.add(ombre(mos, false));

  /* Gradins : contremarche en noyer, marche en moquette */
  for (let i = 0; i < P.NR; i++) {
    const rd = P.R0 + i * P.D, y0 = i * P.H, y1 = (i + 1) * P.H;
    racine.add(ombre(new THREE.Mesh(balayage([[rd, y0], [rd, y1], [rd, y1], [rd + P.D, y1]], P.TH0 - 1.5, P.TH1 + 1.5, { mats: [0, 0, 1], inverse: true, echelle: 1.4 }), [M.noyer, M.moquette])));
  }
  const rTop = P.R0 + P.NR * P.D;
  racine.add(ombre(new THREE.Mesh(balayage([[rTop, P.YTOP], [25, P.YTOP]], -16, 196, { inverse: true, echelle: 2 }), M.moquette), false));

  /* Pupitres, interrompus aux allées */
  const bornes = [P.TH0, ...P.ALLEES, P.TH1];
  for (let i = 0; i < P.NR; i++) {
    const rd = P.R0 + i * P.D, y = (i + 1) * P.H;
    const prof: [number, number][] = [[rd + 0.40, y], [rd + 0.40, y + 0.66], [rd + 0.44, y + 0.66], [rd + 0.44, y + 0.72], [rd - 0.03, y + 0.86], [rd - 0.03, y + 0.80], [rd, y + 0.80]];
    for (let k = 0; k < bornes.length - 1; k++) {
      const ma = (k === 0 ? 0.25 : P.ALLEE / 2) / rd, mb = (k === bornes.length - 2 ? 0.25 : P.ALLEE / 2) / rd;
      const a0 = bornes[k] + (ma * 180) / Math.PI, a1 = bornes[k + 1] - (mb * 180) / Math.PI;
      racine.add(ombre(new THREE.Mesh(balayage(prof, a0, a1, { mats: [1, 1, 1, 0, 0, 0], echelle: 1.2 }), [M.plateau, M.noyer])));
      racine.add(ombre(new THREE.Mesh(balayage([[rd, y + 0.80], [rd, y]], a0, a1, { echelle: 3.2, vNorm: true, rRef: rd }), M.panneau)));
      for (const a of [a0, a1]) {
        const j = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.86, 0.05), M.noyer);
        const ar = rad(a), rm = rd + 0.2;
        j.position.set(rm * Math.cos(ar), y + 0.43, rm * Math.sin(ar)); j.rotation.y = -ar;
        racine.add(ombre(j));
      }
    }
  }
  for (const a of P.ALLEES) for (let i = 1; i < P.NR; i++) { // demi-marches dans les allées
    const rd = P.R0 + i * P.D, y = i * P.H + P.H / 2, w = (P.ALLEE / rd) * 180 / Math.PI;
    racine.add(ombre(new THREE.Mesh(balayage([[rd - 0.42, i * P.H], [rd - 0.42, y], [rd - 0.42, y], [rd, y]], a - w / 2, a + w / 2, { mats: [0, 0, 1], inverse: true }), [M.noyer, M.moquette])));
  }
  for (const a of [P.TH0 - 1.5, P.TH1 + 1.5]) { // flancs des gradins
    for (let i = 0; i < P.NR; i++) {
      const rd = P.R0 + i * P.D, hh = (i + 1) * P.H + 1.0, ar = rad(a), rm = rd + P.D / 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(P.D + 0.02, hh, 0.22), M.panneau);
      b.position.set(rm * Math.cos(ar), hh / 2, rm * Math.sin(ar)); b.rotation.y = -ar; racine.add(ombre(b));
      const c = new THREE.Mesh(new THREE.BoxGeometry(P.D + 0.04, 0.06, 0.28), M.laiton);
      c.position.set(rm * Math.cos(ar), hh + 0.03, rm * Math.sin(ar)); c.rotation.y = -ar; racine.add(c);
    }
  }
  racine.add(ombre(new THREE.Mesh(balayage([[P.R0 - 0.05, 0.98 + P.H - 0.12], [P.R0 - 0.05, 1.0 + P.H - 0.12]], P.TH0, P.TH1, { echelle: 1 }), M.laiton), false));

  /* Sièges (instances), un par siège du plan 2D */
  const velG = fusion([
    [boiteRonde(0.56, 0.13, 0.5, 0.055, 2), mat4(0, 0.48, 0.03)],
    [boiteRonde(0.54, 0.5, 0.12, 0.055, 2), mat4(0, 0.84, -0.24, -0.17)],
  ]);
  const boisG = fusion([
    [boiteRonde(0.6, 0.56, 0.06, 0.025, 1), mat4(0, 0.85, -0.32, -0.17)],
    [boiteRonde(0.07, 0.05, 0.46, 0.02, 1), mat4(0.31, 0.67, 0.0)],
    [boiteRonde(0.07, 0.05, 0.46, 0.02, 1), mat4(-0.31, 0.67, 0.0)],
    [new THREE.BoxGeometry(0.05, 0.24, 0.05), mat4(0.31, 0.53, 0.17)],
    [new THREE.BoxGeometry(0.05, 0.24, 0.05), mat4(-0.31, 0.53, 0.17)],
    [new THREE.BoxGeometry(0.5, 0.4, 0.42), mat4(0, 0.2, -0.02)],
  ]);
  const n = sieges.length;
  I.velours = ombre(new THREE.InstancedMesh(velG, M.velours, n));
  I.bois = ombre(new THREE.InstancedMesh(boisG, M.noyer, n));
  I.plaque = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.008, 0.045), M.laiton, n);
  I.bague = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.032, 0.012, 20), M.laiton, n);
  I.voyant = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.voyant, n);
  I.lueur = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 0.6), M.lueur, n);
  const o = new THREE.Object3D(), pente = Math.atan(0.14 / 0.47), noir = new THREE.Color(0x1d1714), zero = new THREE.Color(0, 0, 0);
  const mVoyant: { p: THREE.Vector3; q: THREE.Quaternion }[] = [];
  const mLueur: { p: THREE.Vector3; q: THREE.Quaternion }[] = [];
  sieges.forEach((s, k) => {
    const x = s.r * Math.cos(s.th), z = s.r * Math.sin(s.th), yaw = Math.atan2(-x, -z), e = echelleFauteuil(s.pas);
    o.position.set(x, s.y, z); o.rotation.set(0, yaw, 0); o.scale.set(e, 1, 1); o.updateMatrix();
    I.velours.setMatrixAt(k, o.matrix); I.bois.setMatrixAt(k, o.matrix);
    o.scale.setScalar(1);
    const surPupitre = (r: number, lat: number) => {
      const yy = s.y + 0.86 - (r - (s.rd - 0.03)) * (0.14 / 0.47) + 0.004;
      const lx = Math.cos(s.th + Math.PI / 2) * lat, lz = Math.sin(s.th + Math.PI / 2) * lat;
      o.position.set(r * Math.cos(s.th) + lx, yy, r * Math.sin(s.th) + lz); o.rotation.set(-pente, yaw, 0, 'YXZ');
    };
    surPupitre(s.rd + 0.3, 0); o.updateMatrix(); I.plaque.setMatrixAt(k, o.matrix);
    surPupitre(s.rd + 0.13, -0.17 * e); o.updateMatrix(); I.bague.setMatrixAt(k, o.matrix);
    // le voyant est posé sur l'arête du pupitre : visible du perchoir comme depuis le siège
    o.position.set((s.rd - 0.015) * Math.cos(s.th), s.y + 0.862, (s.rd - 0.015) * Math.sin(s.th)); o.rotation.set(0, yaw, 0); o.updateMatrix();
    I.voyant.setMatrixAt(k, o.matrix); I.voyant.setColorAt(k, noir);
    mVoyant.push({ p: o.position.clone(), q: o.quaternion.clone() });
    o.position.y += 0.01; o.rotation.set(-Math.PI / 2, yaw, 0, 'YXZ'); o.updateMatrix(); I.lueur.setMatrixAt(k, o.matrix); I.lueur.setColorAt(k, zero);
    mLueur.push({ p: o.position.clone(), q: o.quaternion.clone() });
  });
  for (const k of ['velours', 'bois', 'plaque', 'bague', 'voyant', 'lueur']) racine.add(I[k]);

  /* Colonnade et galeries */
  const fut = new THREE.CylinderGeometry(0.46, 0.5, 1, 32, 1, true);
  const nCol = 15, colPos: [number, number, number, number][] = [];
  for (let k = 0; k < nCol; k++) { const a = rad(P.TH0 + (k * (P.TH1 - P.TH0)) / (nCol - 1)); colPos.push([P.RCOL * Math.cos(a), P.RCOL * Math.sin(a), P.YTOP, P.YENT - P.YTOP]); }
  for (const x of [-12.8, -5.4, 5.4, 12.8]) colPos.push([x, P.ZFOND + 0.75, 0, P.YENT]);
  I.fut = ombre(new THREE.InstancedMesh(fut, M.colonne, colPos.length));
  const baseG = fusion([[new THREE.BoxGeometry(1.25, 0.32, 1.25), mat4(0, 0.16, 0)], [new THREE.TorusGeometry(0.52, 0.09, 10, 32), mat4(0, 0.38, 0, Math.PI / 2)], [new THREE.TorusGeometry(0.5, 0.06, 10, 32), mat4(0, 0.5, 0, Math.PI / 2)]]);
  const chapG = fusion([
    [new THREE.CylinderGeometry(0.5, 0.46, 0.18, 32), mat4(0, -0.42, 0)],
    [new THREE.TorusGeometry(0.16, 0.07, 10, 20), mat4(0.5, -0.24, 0, 0, Math.PI / 2)],
    [new THREE.TorusGeometry(0.16, 0.07, 10, 20), mat4(-0.5, -0.24, 0, 0, Math.PI / 2)],
    [new THREE.CylinderGeometry(0.16, 0.16, 1.0, 16), mat4(0, -0.24, 0, 0, 0, Math.PI / 2)],
    [boiteRonde(1.3, 0.12, 1.3, 0.03), mat4(0, -0.06, 0)],
  ]);
  I.base = ombre(new THREE.InstancedMesh(baseG, M.marbre, colPos.length));
  I.chap = ombre(new THREE.InstancedMesh(chapG, M.or, colPos.length));
  colPos.forEach(([x, z, y0, h], k) => {
    const yaw = Math.atan2(-x, -z);
    o.position.set(x, y0 + 0.55 + (h - 0.55) / 2, z); o.rotation.set(0, yaw, 0); o.scale.set(1, h - 0.55, 1); o.updateMatrix(); I.fut.setMatrixAt(k, o.matrix);
    o.position.set(x, y0, z); o.scale.set(1, 1, 1); o.updateMatrix(); I.base.setMatrixAt(k, o.matrix);
    o.position.set(x, y0 + h, z); o.updateMatrix(); I.chap.setMatrixAt(k, o.matrix);
  });
  racine.add(I.fut, I.base, I.chap);
  const aMur: [number, number] = [-15.4, 195.4];
  const baie = 24.6 * rad((P.TH1 - P.TH0) / (nCol - 1));
  racine.add(ombre(new THREE.Mesh(balayage([[24.6, P.YTOP], [24.6, P.YCOR]], aMur[0], aMur[1], { echelle: baie, rRef: 24.6, vNorm: true, inverse: true }), M.galerie), false));
  M.galerie.map.repeat.set(1, 1); M.galerie.map.offset.set(0.5 - ((rad(P.TH0) * 24.6) / baie) % 1, 0);
  racine.add(ombre(new THREE.Mesh(balayage([[21.7, 8.2], [24.6, 8.2]], aMur[0], aMur[1]), M.stuc), false));
  racine.add(ombre(new THREE.Mesh(balayage([[21.7, 8.0], [21.7, 8.3], [21.6, 8.3]], aMur[0], aMur[1], { inverse: true }), M.or), false));
  racine.add(new THREE.Mesh(balayage([[21.62, 8.3], [21.62, 9.25]], aMur[0], aMur[1], { echelle: 1, rRef: 21.62 }), M.balustre));
  M.balustre.map.repeat.set(0.625, 1 / 0.95); M.balustre.bumpMap.repeat.set(0.625, 1 / 0.95);
  const profEnt: [number, number][] = [[20.55, P.YENT], [20.55, 13.2], [20.4, 13.25], [20.4, 13.55], [20.1, 13.65], [20.0, P.YCOR], [P.RDOME, P.YCOR]];
  racine.add(ombre(new THREE.Mesh(balayage(profEnt, aMur[0], aMur[1], { inverse: true, echelle: 1.2, mats: [0, 1, 0, 1, 1, 2] }), [M.entablement, M.or, M.stuc])));
  for (const k of ['map', 'bumpMap', 'metalnessMap']) M.entablement[k].repeat.set(0.2, 0.96);
  racine.add(ombre(new THREE.Mesh(balayage([[20.55, P.YENT], [24.6, P.YENT]], aMur[0], aMur[1]), M.stuc), false));

  /* Coupole à caissons, verrière, berceau au-dessus du perchoir */
  G.plafond = new THREE.Group();
  const th0 = 0.62;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(P.RDOME, telephone ? 96 : 160, 36, 0, Math.PI, th0, Math.PI / 2 - th0), M.caisson);
  dome.scale.set(1, P.KDOME, 1); dome.position.y = P.YCOR; dome.castShadow = true; G.plafond.add(dome);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(P.RDOME * 0.999, telephone ? 96 : 160, 24, 0, Math.PI, 0, th0), M.verriere);
  cap.scale.set(1, P.KDOME, 1); cap.position.y = P.YCOR + 0.01; G.plafond.add(cap);
  const ell = (t: number) => [P.RDOME * Math.sin(t), P.YCOR + P.RDOME * P.KDOME * Math.cos(t)];
  const berceau = (t0: number, t1: number, mat: THREE.Material) => {
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [], N = 40;
    for (const sx of [-1, 1]) {
      const b = pos.length / 3;
      for (let i = 0; i <= N; i++) {
        const t = t0 + ((t1 - t0) * i) / N, [x, y] = ell(t);
        const nx = -Math.sin(t) / P.RDOME, ny = -Math.cos(t) / (P.RDOME * P.KDOME), l = Math.hypot(nx, ny);
        for (const z of [P.ZFOND, 0.02]) { pos.push(sx * x, y, z); nor.push((sx * nx) / l, ny / l, 0); uv.push((t * P.RDOME) / 2.4, z / 2.4); }
      }
      for (let i = 0; i < N; i++) { const a = b + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); corrigeSens(g);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
  };
  G.plafond.add(berceau(th0, Math.PI / 2, M.caissonBerceau));
  const vit = berceau(0, th0, M.vitrage); vit.castShadow = false; G.plafond.add(vit);
  racine.add(G.plafond);

  /* Mur du fond, tribune, bureau, perchoir */
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(48, 14), M.mur); mur.position.set(0, 7, P.ZFOND); racine.add(ombre(mur, false));
  const tympan = new THREE.Mesh(new THREE.CircleGeometry(1, 64, 0, Math.PI), M.stuc); tympan.scale.set(P.RDOME, P.RDOME * P.KDOME, 1); tympan.position.set(0, P.YCOR, P.ZFOND + 0.01); racine.add(tympan);
  const boite = (w: number, h: number, d: number, x: number, y: number, z: number, faces: THREE.Material | THREE.Material[]) => {
    const m = new THREE.Mesh(boiteRonde(w, h, d, 0.03, 2), faces); m.position.set(x, y, z); return ombre(m);
  };
  const tribune = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.18, 1.1), [M.noyer, M.noyer, M.noyerClair, M.noyer, M.facT, M.noyer]); tribune.position.set(0, 0.59, -0.9); racine.add(ombre(tribune));
  racine.add(boite(2.6, 0.08, 1.25, 0, 1.22, -0.9, M.marbre));
  const pup = boite(1.3, 0.1, 0.55, 0, 1.38, -0.85, M.noyer); pup.rotation.x = 0.25; racine.add(pup);
  racine.add(boite(1.34, 0.03, 0.04, 0, 1.43, -0.58, M.laiton));
  const facesB = [M.noyer, M.noyer, M.noyerClair, M.noyer, M.facP, M.noyer];
  const bureau = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.2, 1.5), [M.noyer, M.noyer, M.noyerClair, M.noyer, M.facB, M.noyer]); bureau.position.set(0, 0.6, -2.4); racine.add(ombre(bureau));
  racine.add(boite(9.6, 0.07, 1.6, 0, 1.235, -2.4, M.marbre));
  const perch = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 1.7), facesB); perch.position.set(0, 1.2, -4.0); racine.add(ombre(perch));
  racine.add(boite(5.8, 0.08, 1.8, 0, 2.44, -4.0, M.marbre));
  racine.add(boite(3.6, 0.95, 0.8, 0, 2.95, -4.1, M.panneau));
  racine.add(boite(3.7, 0.05, 0.9, 0, 3.45, -4.1, M.noyerClair));
  racine.add(boite(13, 2.44, 2.6, 0, 1.22, -5.25, M.noyer));
  const fauteuil = new THREE.Group();
  fauteuil.add(ombre(new THREE.Mesh(velG, M.velours)), ombre(new THREE.Mesh(boisG, M.noyer)));
  fauteuil.scale.setScalar(1.35); fauteuil.position.set(0, 2.48, -4.75); racine.add(fauteuil);
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) racine.add(boite(1.1, 0.34 * (k + 1), 0.3, s * 3.45, 0.17 * (k + 1), -3.2 - k * 0.24, M.marbre));
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) racine.add(boite(2.2, 0.08, 0.6, s * 5.6, 0.04 + k * 0.4, -2.0 - k * 0.6, M.statuaire));

  /* Le 578e siège : une chaise en plus, au pied de la tribune (lot 5 : le personnage y attend) */
  G.c578 = new THREE.Group();
  G.c578.add(ombre(new THREE.Mesh(velG, M.velours)), ombre(new THREE.Mesh(boisG, M.noyer)));
  const p578 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.012), M.p578); p578.position.set(0, 0.9, -0.36); p578.rotation.set(-0.17, Math.PI, 0); G.c578.add(p578);
  G.c578.position.set(2.15, 0, 0.9); G.c578.rotation.y = -0.35; racine.add(G.c578);

  /* Faisceaux de la verrière */
  G.faisceaux = new THREE.Group();
  const dir = new THREE.Vector3(-9, -50, 19).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
  ([[-1, -4], [4, -1], [-6, -2], [1.5, 3], [7, 2.5], [-4.5, 3.5]] as [number, number][]).forEach(([x, z], k) => {
    const L = 24, top = new THREE.Vector3(x, 22.5, z), mid = top.clone().addScaledVector(dir, L / 2);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1 + k * 0.08, 2.4, L, 32, 1, true), M.faisceau);
    m.position.copy(mid); m.quaternion.copy(q); m.renderOrder = 10; G.faisceaux.add(m);
  });
  racine.add(G.faisceaux);

  /* Lumière */
  const soleil = new THREE.DirectionalLight(0xffdcaa, 2.4 * PI);
  soleil.position.set(9, 50, -12); soleil.target.position.set(0, 0, 7); soleil.castShadow = true;
  const sc = soleil.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 90;
  const tailleOmbre = telephone ? 1024 : 2048;
  soleil.shadow.mapSize.set(tailleOmbre, tailleOmbre); soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.03;
  scene.add(soleil, soleil.target);
  const hemi = new THREE.HemisphereLight(0xffe2b8, 0x3a170f, 0.42 * PI); scene.add(hemi);
  const appliques: THREE.PointLight[] = [];
  for (const a of [20, 60, 90, 120, 160]) {
    const l = new THREE.PointLight(0xffb36b, 0.55 * PI * 8, 18, 2); const ar = rad(a);
    l.position.set(19 * Math.cos(ar), 9.5, 19 * Math.sin(ar)); scene.add(l); appliques.push(l);
  }
  const fond = new THREE.PointLight(0xffc27a, 0.8 * PI * 6, 16, 2); fond.position.set(0, 7, -3); scene.add(fond); appliques.push(fond);
  const spot = new THREE.SpotLight(0xffe0a8, 1.4 * PI * 28, 14, 0.32, 0.6, 1.5); spot.position.set(2.6, 9, 3.2); spot.target = G.c578; scene.add(spot);
  const env = new THREE.TextureLoader();
  const envTex = T.environnement.clone(); envTex.mapping = THREE.EquirectangularReflectionMapping; envTex.colorSpace = THREE.SRGBColorSpace; envTex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(envTex).texture; scene.environmentIntensity = 0.5;
  void env;
  scene.background = new THREE.Color(0x1a0f09);
  const brouillard = new THREE.FogExp2(0x6b4a30, 0.0085); scene.fog = brouillard;

  /* Ambiances : jour (pour voter), verdict (lumières allumées) */
  const base0 = { soleil: soleil.intensity, soleilC: soleil.color.getHex(), hemi: hemi.intensity, app: appliques.map((l) => l.intensity),
    expo: 1.05, fog: [brouillard.color.getHex(), brouillard.density] as [number, number], ver: M.verriere.emissiveIntensity, vit: M.vitrage.emissiveIntensity,
    or: [M.or.envMapIntensity, M.or.roughness] as [number, number], cai: M.caisson.envMapIntensity };
  let lustres: THREE.Group | null = null;
  const faireLustres = () => {
    if (lustres) return lustres;
    const g = new THREE.Group(), nb = 150;
    const b = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0xFFE6B8, toneMapped: false }), nb);
    for (let i = 0; i < nb; i++) { const a = rad(-14 + i * (208 / (nb - 1))); o.position.set(20.22 * Math.cos(a), 12.5, 20.22 * Math.sin(a)); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); b.setMatrixAt(i, o.matrix); }
    g.add(b);
    for (const a of [-10, 15, 40, 65, 90, 115, 140, 165, 190]) { const l = new THREE.PointLight(0xffc98a, 1.25 * PI * 12, 30, 2), ar = rad(a); l.position.set(17.5 * Math.cos(ar), 11.6, 17.5 * Math.sin(ar)); g.add(l); }
    for (const x of [-9, 0, 9]) { const l = new THREE.PointLight(0xffd29a, 0.9 * PI * 8, 16, 2); l.position.set(x, 9, -5.2); g.add(l); }
    scene.add(g); lustres = g; return g;
  };

  /* Le jumeau : sa plaquette s'éclaire, une petite lumière chaude sur son pupitre (room.js). */
  const jumPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.052),
    new THREE.MeshStandardMaterial({ color: 0xE9CB86, emissive: 0xFFD79A, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3 }));
  const jumLum = new THREE.PointLight(0xffd9a0, 0.9 * PI * 1.5, 3.4, 2);
  const jum = new THREE.Group(); jum.add(jumPlaque, jumLum); jum.visible = false; scene.add(jum);

  /* Le personnage : sa place (null : le 578e fauteuil), sa marche en cours */
  let perso: Personnage | null = null;
  let place: number | null = null;
  let marche: { finir(): void } | null = null;
  const fauteuil578 = new THREE.Object3D();
  fauteuil578.position.set(FAUTEUIL_578.x, FAUTEUIL_578.y, FAUTEUIL_578.z); fauteuil578.rotation.y = FAUTEUIL_578.cap;
  /** Le personnage assis à sa place. */
  const poserAssis = () => {
    if (!perso) return;
    perso.assis();
    if (place === null) {
      perso.groupe.position.copy(fauteuil578.position); perso.groupe.rotation.set(0, fauteuil578.rotation.y, 0);
    } else {
      const [x, y, z] = position(sieges[place]);
      perso.groupe.position.set(x, y, z); perso.groupe.rotation.set(0, Math.atan2(-x, -z), 0);
    }
    renderer.shadowMap.needsUpdate = true;
  };

  /* Caméra et rendu à la demande */
  const cam = { pos: [0, 7, -6.4] as number[], cible: [0, 5.5, 11] as number[], fov: 64, haut: [0, 1, 0] as number[] };
  let vueCourante: NomVue = 'salle';
  let anim: Tween | null = null;
  let onde: { finir(): void } | null = null;
  let demande = false;
  let echV = 1;
  let surRendu: (() => void) | null = null;
  // La caméra libre : un écart borné à la vue en cours (lacet, tangage, recul).
  const libre = { lacet: 0, tangage: 0, zoom: 1 };
  const allumes: boolean[] = new Array(n).fill(false);
  const appliquerCam = () => {
    camera.fov = cam.fov; camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
    camera.up.set(cam.haut[0], cam.haut[1], cam.haut[2]).normalize();
    camera.lookAt(cam.cible[0], cam.cible[1], cam.cible[2]); camera.updateProjectionMatrix();
  };
  const rendre = () => { renderer.render(scene, camera); surRendu?.(); };
  const demander = () => { if (demande) return; demande = true; requestAnimationFrame(() => { demande = false; rendre(); }); };
  const poserVoyants = () => {
    const m = new THREE.Matrix4(), s = new THREE.Vector3();
    for (let k = 0; k < n; k++) {
      s.setScalar(echV); m.compose(mVoyant[k].p, mVoyant[k].q, s); I.voyant.setMatrixAt(k, m);
      s.setScalar(allumes[k] && echV === 1 ? 1 : 0); m.compose(mLueur[k].p, mLueur[k].q, s); I.lueur.setMatrixAt(k, m);
    }
    I.voyant.instanceMatrix.needsUpdate = true; I.lueur.instanceMatrix.needsUpdate = true;
  };
  const finVue = (nom: NomVue) => {
    const plan = nom === 'plan';
    G.plafond.visible = !plan; G.faisceaux.visible = !plan && !lustres?.visible; brouillard.density = plan ? 0.0004 : base0.fog[1];
    renderer.toneMappingExposure = plan ? 0.78 : (lustres?.visible ? 1.15 : base0.expo);
    echV = plan ? 9 : 1; poserVoyants(); (M.sol as THREE.MeshPhysicalMaterial).color.setHex(plan ? 0x5e4f44 : 0xb9a596);
    renderer.shadowMap.needsUpdate = true;
  };
  /** CAM 3 · Ta travée : par-dessus l'épaule du personnage, assis à sa place, face à la tribune.
   *  Sans place, la salle depuis le perchoir. */
  const cadrer = (nom: NomVue, aspect: number): Cadrage => {
    if (nom !== 'travee' || place === null) return cadrage(nom === 'travee' ? 'salle' : nom, aspect);
    const s = sieges[place];
    const [x, y, z] = position(s);
    const l = Math.hypot(x, z);
    const dx = -x / l, dz = -z / l;
    // Un peu en arrière et sur le côté, à hauteur d'épaule : son épaule et sa tête au premier plan.
    const lx = -dz * 0.5, lz = dx * 0.5;
    return { pos: [x - dx * 1.5 + lx, y + 1.7, z - dz * 1.5 + lz], cible: [0, 1.4, -1.2], fov: aspect < 0.9 ? 78 : 60 };
  };
  /** La vue en cours, écartée par la caméra libre, sans jamais sortir de la salle. */
  const poserLibre = () => {
    const c = cadrer(vueCourante, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    if (vueCourante === 'travee' && place !== null) {
      // Depuis son siège, on tourne la tête : lacet ±70°, tangage ±25°, sans bouger.
      const v = new THREE.Vector3(c.cible[0] - c.pos[0], c.cible[1] - c.pos[1], c.cible[2] - c.pos[2]);
      const r = v.length();
      const theta = Math.atan2(v.x, v.z) + libre.lacet;
      const phi = Math.asin(v.y / r) + libre.tangage;
      cam.pos = [...c.pos];
      cam.cible = [c.pos[0] + r * Math.cos(phi) * Math.sin(theta), c.pos[1] + r * Math.sin(phi), c.pos[2] + r * Math.cos(phi) * Math.cos(theta)];
      cam.fov = c.fov; cam.haut = [0, 1, 0];
      appliquerCam(); demander();
      return;
    }
    const v = new THREE.Vector3(c.pos[0] - c.cible[0], c.pos[1] - c.cible[1], c.pos[2] - c.cible[2]);
    const r = v.length() * libre.zoom;
    let pos: THREE.Vector3;
    if (vueCourante === 'plan') {
      v.applyAxisAngle(new THREE.Vector3(0, 1, 0), libre.lacet).setLength(r);
      pos = v.add(new THREE.Vector3(...c.cible));
      const h = new THREE.Vector3(...(c.haut ?? [0, 1, 0])).applyAxisAngle(new THREE.Vector3(0, 1, 0), libre.lacet);
      cam.haut = [h.x, h.y, h.z];
    } else {
      const theta = Math.atan2(v.x, v.z) + libre.lacet;
      const phi = Math.min(1.1, Math.max(-0.05, Math.asin(v.y / v.length()) + libre.tangage));
      pos = new THREE.Vector3(r * Math.cos(phi) * Math.sin(theta), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(theta))
        .add(new THREE.Vector3(...c.cible));
      cam.haut = [0, 1, 0];
    }
    // Jamais à travers les murs : en deçà de la colonnade (21 m), au-dessus du sol, sous la coupole.
    const rxz = Math.hypot(pos.x, pos.z);
    if (rxz > 18) { pos.x *= 18 / rxz; pos.z *= 18 / rxz; }
    if (vueCourante !== 'plan') pos.y = Math.min(12, Math.max(0.9, pos.y));
    cam.pos = [pos.x, pos.y, pos.z]; cam.cible = [...c.cible]; cam.fov = c.fov;
    appliquerCam(); demander();
  };
  const redimensionner = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 520 ? 2 : 1.75));
    renderer.setSize(w, h, false); camera.aspect = w / h;
    if (!anim) poserLibre(); else { appliquerCam(); demander(); }
  };
  const borne = (x: number, a: number) => Math.max(-a, Math.min(a, x));

  const salle: Salle3D = {
    get vueCourante() { return vueCourante; },
    set surRendu(f: (() => void) | null) { surRendu = f; },
    vue(nom, o2 = {}) {
      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      const c = cadrer(nom, aspect);
      vueCourante = nom;
      libre.lacet = 0; libre.tangage = 0; libre.zoom = 1;
      anim?.finir();
      const haut = c.haut ?? [0, 1, 0];
      if (o2.instant || opt.mouvementReduit) {
        cam.pos = [...c.pos]; cam.cible = [...c.cible]; cam.fov = c.fov; cam.haut = [...haut];
        finVue(nom); appliquerCam(); demander(); return Promise.resolve();
      }
      if (nom === 'plan') { G.plafond.visible = false; G.faisceaux.visible = false; renderer.shadowMap.needsUpdate = true; }
      const de = { pos: [...cam.pos], cible: [...cam.cible], fov: cam.fov, haut: [...cam.haut] };
      const mix = (a: number[], b: number[], e: number) => a.map((v, i) => v + (b[i] - v) * e);
      anim = interpoler(1600, (e) => {
        cam.pos = mix(de.pos, c.pos, e); cam.cible = mix(de.cible, c.cible, e); cam.fov = de.fov + (c.fov - de.fov) * e;
        cam.haut = mix(de.haut, haut, e); appliquerCam(); rendre();
      });
      return anim.fini.then(() => { anim = null; finVue(nom); demander(); });
    },
    terminer() { anim?.finir(); onde?.finir(); marche?.finir(); },
    voyants(couleurs) {
      onde?.finir();
      const c = new THREE.Color();
      for (let k = 0; k < n; k++) {
        const v = couleurs[k] ?? null;
        allumes[k] = !!v;
        if (v) { couleurExacte(v, c); I.voyant.setColorAt(k, c); I.lueur.setColorAt(k, c); } else { I.voyant.setColorAt(k, noir); I.lueur.setColorAt(k, zero); }
      }
      I.voyant.instanceColor!.needsUpdate = true; I.lueur.instanceColor!.needsUpdate = true; poserVoyants(); demander();
    },
    voyantsEnOnde(couleurs, duree = 1000) {
      if (opt.mouvementReduit) { salle.voyants(couleurs); return Promise.resolve(); }
      onde?.finir();
      salle.voyants([]);
      // Du rang intérieur vers l'extérieur, avec un aléa tiré du numéro du siège (lib/hemicycle.ts,
      // delaiOnde) : jamais un balayage de gauche à droite.
      const delais = sieges.map((s, k) => s.rang * 55 + (((k + 1) * 2654435761) >>> 0) % 71);
      const max = Math.max(...delais);
      const echelle = Math.max(1, duree - 200) / max;
      const allume = new Array(n).fill(false);
      const c = new THREE.Color();
      const debut = performance.now();
      let fini = false;
      let resoudre: () => void = () => {};
      const promesse = new Promise<void>((r) => { resoudre = r; });
      const pas = (t: number) => {
        let change = false;
        for (let k = 0; k < n; k++) {
          if (allume[k] || delais[k] * echelle > t) continue;
          allume[k] = true; change = true;
          const v = couleurs[k] ?? null; allumes[k] = !!v;
          if (v) { couleurExacte(v, c); I.voyant.setColorAt(k, c); I.lueur.setColorAt(k, c); }
        }
        if (change) { I.voyant.instanceColor!.needsUpdate = true; I.lueur.instanceColor!.needsUpdate = true; poserVoyants(); rendre(); }
      };
      const image = () => {
        if (fini) return;
        const t = performance.now() - debut;
        pas(t);
        if (t >= duree) { fini = true; onde = null; resoudre(); return; }
        requestAnimationFrame(image);
      };
      onde = { finir: () => { if (fini) return; pas(Infinity); fini = true; onde = null; resoudre(); } };
      requestAnimationFrame(image);
      return promesse;
    },
    personnage(a) {
      if (perso) { scene.remove(perso.groupe); perso = null; }
      if (a) { perso = creerPersonnage(a); scene.add(perso.groupe); poserAssis(); }
      renderer.shadowMap.needsUpdate = true; demander();
    },
    asseoir(k, o3 = {}) {
      marche?.finir();
      const cible = k;
      if (!perso || cible === null || !o3.marcher || opt.mouvementReduit) {
        place = cible; poserAssis();
        if (vueCourante === 'travee') poserLibre(); else demander();
        return Promise.resolve();
      }
      // La marche : du 578e fauteuil au siège, par les allées, en 3,5 s ; un appui la termine.
      const points = chemin(sieges[cible]);
      const L = longueur(points);
      const p0 = perso;
      p0.debout();
      let fini = false;
      let resoudre: () => void = () => {};
      const promesse = new Promise<void>((r) => { resoudre = r; });
      const terminer = () => {
        if (fini) return;
        fini = true; marche = null; place = cible; poserAssis();
        if (vueCourante === 'travee') poserLibre(); else demander();
        resoudre();
      };
      const tw = interpoler(3500, (e) => {
        if (fini) return;
        const d = L * e;
        const { p, cap } = surChemin(points, d);
        p0.marcher((d / 0.32) * Math.PI);
        p0.groupe.position.set(p[0], p[1], p[2]); p0.groupe.rotation.set(0, cap, 0);
        rendre();
        if (e >= 1) terminer();
      });
      marche = { finir: () => { tw.arreter(); terminer(); } };
      return promesse;
    },
    jumeau(k) {
      jum.visible = k !== null;
      if (k !== null) {
        const m = new THREE.Matrix4(), sc = new THREE.Vector3();
        I.plaque.getMatrixAt(k, m); m.decompose(jumPlaque.position, jumPlaque.quaternion, sc);
        jumPlaque.position.y += 0.004;
        jumLum.position.set(...position(sieges[k], 1.7));
      }
      renderer.shadowMap.needsUpdate = true; demander();
    },
    orbiter(dLacet, dTangage) {
      if (anim) return;
      const travee = vueCourante === 'travee' && place !== null;
      const amplitude = travee ? rad(70) : vueCourante === 'plan' ? 1.0 : 0.6;
      libre.lacet = borne(libre.lacet + dLacet, amplitude);
      libre.tangage = vueCourante === 'plan' ? 0 : borne(libre.tangage + dTangage, travee ? rad(25) : 0.25);
      poserLibre();
    },
    zoomer(f) {
      if (anim || vueCourante === 'travee') return;
      libre.zoom = Math.max(0.55, Math.min(1.25, libre.zoom * f));
      poserLibre();
    },
    recentrer() { void salle.vue(vueCourante); },
    ambiance(nom) {
      soleil.intensity = base0.soleil; soleil.color.setHex(base0.soleilC); hemi.intensity = base0.hemi;
      appliques.forEach((l, i) => { l.intensity = base0.app[i]; });
      brouillard.color.setHex(base0.fog[0]); brouillard.density = base0.fog[1];
      M.verriere.emissiveIntensity = base0.ver; M.vitrage.emissiveIntensity = base0.vit; M.or.envMapIntensity = base0.or[0]; M.or.roughness = base0.or[1]; M.caisson.envMapIntensity = base0.cai;
      if (lustres) lustres.visible = false;
      G.faisceaux.visible = vueCourante !== 'plan';
      renderer.toneMappingExposure = base0.expo;
      if (nom === 'verdict') {
        soleil.intensity = 0.75 * PI; soleil.color.setHex(0xffcf9a); hemi.intensity = 0.22 * PI; appliques.forEach((l) => { l.intensity *= 2.6; });
        faireLustres().visible = true; M.verriere.emissiveIntensity = 0.55; M.vitrage.emissiveIntensity = 0.55; M.or.envMapIntensity = 2.1; M.or.roughness = 0.55; M.caisson.envMapIntensity = 1.7;
        renderer.toneMappingExposure = vueCourante === 'plan' ? 0.78 : 1.15; brouillard.color.setHex(0x3e2618); brouillard.density = vueCourante === 'plan' ? 0.0004 : 0.007; G.faisceaux.visible = false;
      }
      renderer.shadowMap.needsUpdate = true; demander();
    },
    redimensionner,
    projeter(points) {
      return points.map((p) => { const v = new THREE.Vector3(...p).project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, devant: v.z < 1 }; });
    },
    positionSiege: (i, dy = 0) => (i < 0 ? [FAUTEUIL_578.x, FAUTEUIL_578.y + 0.9 + dy, FAUTEUIL_578.z] : position(sieges[i], dy)),
    detruire() { anim?.arreter(); onde?.finir(); renderer.dispose(); pmrem.dispose(); },
  };

  const c0 = cadrer('salle', canvas.clientWidth / Math.max(1, canvas.clientHeight));
  cam.pos = c0.pos; cam.cible = c0.cible; cam.fov = c0.fov;
  redimensionner(); renderer.shadowMap.needsUpdate = true; rendre();
  return salle;
}
