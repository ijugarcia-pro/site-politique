// Le décor de la salle (docs/design-salle-dessus/decor.js, Claude Design, 2 nov. 2026) : ce qui
// manquait à la maquette pour être l'hémicycle du Palais Bourbon. Il s'ajoute à la salle sans la
// reconstruire : mur du perchoir, galeries, draperies, dossier de l'hémicycle, frise de la coupole,
// statues, et ce que la vue du dessus montre autour de la salle. Les peintures de decor.js sont
// exportées une fois en webp (scripts/matieres.mjs) : le visiteur télécharge, il ne peint pas.
// Le dévoilement de decor.js n'est pas repris ici : il se fait sur l'image fixe (lib/revelation.ts).

import * as THREE from 'three';
import { P } from './geometrie.ts';
import { balayage, boiteRonde, fusion, mat4, rad } from './outils3d.ts';

type Textures = Record<string, THREE.Texture>;
type Matieres = Record<string, THREE.Material> & Record<string, any>;

const ombre = <O extends THREE.Object3D>(m: O, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
const standard = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
/** Une travée se répète : la tuile est décalée d'une demi-travée pour tomber entre deux colonnes. */
const tuile = (t: THREE.Texture) => { t.offset.set(0.5, 0); return t; };

export function ajouterDecor(racine: THREE.Group, plafond: THREE.Group, M: Matieres, T: Textures, leger: boolean) {
  const aMur: [number, number] = [-21, 201];
  const rTop = P.R0 + P.NR * P.D;

  // Le cadre doré de la tapisserie du perchoir, en relief.
  for (const [w, h, x, y] of [[9.3, 0.16, 0, 10.5], [9.3, 0.16, 0, 5.68], [0.16, 4.98, -4.6, 8.09], [0.16, 4.98, 4.6, 8.09]]) {
    const b = new THREE.Mesh(boiteRonde(w, h, 0.12, 0.03, 2), M.or); b.position.set(x, y, P.ZFOND + 0.07); racine.add(ombre(b));
  }
  // Les statues dans les niches, sur leur piédestal (pas au palier léger).
  if (!leger) {
    const marbreStatue = new THREE.MeshPhysicalMaterial({ color: 0xf1ece4, map: M.statuaire.map, roughness: 0.42, clearcoat: 0.25, envMapIntensity: 0.6 });
    const robe = new THREE.LatheGeometry(([[0.001, 0], [0.34, 0], [0.31, 0.14], [0.27, 0.8], [0.2, 1.35], [0.25, 1.52], [0.14, 1.68], [0.001, 1.72]] as [number, number][]).map(([a, b]) => new THREE.Vector2(a, b)), 28);
    for (const s of [-1, 1]) {
      const st = new THREE.Group();
      const ped = new THREE.Mesh(boiteRonde(1.0, 0.55, 0.55, 0.04, 2), M.statuaire); ped.position.y = 0.275; st.add(ped);
      const corps = new THREE.Mesh(robe, marbreStatue); corps.position.y = 0.55; st.add(corps);
      const tete = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), marbreStatue); tete.position.y = 0.55 + 1.86; st.add(tete);
      const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.5, 8), marbreStatue); lance.position.set(s * 0.36, 0.55 + 1.2, 0.05); st.add(lance);
      const bras = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.6, 10), marbreStatue); bras.position.set(s * 0.25, 0.55 + 1.33, 0.06); bras.rotation.z = -s * 0.9; st.add(bras);
      st.position.set(s * 7.2, 5.3, P.ZFOND + 0.42); st.traverse((o) => { if ((o as THREE.Mesh).isMesh) ombre(o); });
      racine.add(st);
    }
  }

  // Les galeries du public : soubassement en marbre, tenture rouge, façade crème et or, draperies, banquettes.
  const baie = (r: number) => r * rad(12); // une travée : l'écart entre deux colonnes
  const mSoub = standard({ map: tuile(T.soubassement), roughness: 0.35, envMapIntensity: 0.6 }), mSombre = standard({ color: 0x24130f, roughness: 0.9 });
  const mTent = standard({ map: tuile(T.tenture), roughness: 0.85, envMapIntensity: 0.3 });
  const mLoge = standard({ map: tuile(T.loge), roughness: 0.5, metalness: 0.15, envMapIntensity: 0.8, side: THREE.DoubleSide });
  racine.add(ombre(new THREE.Mesh(balayage([[24.6, 0], [24.6, P.YTOP], [24.6, 8.05]], aMur[0], aMur[1], { echelle: baie(24.6), rRef: 24.6, vNorm: true, inverse: true, mats: [0, 1] }), [mSombre, mSoub]), false));
  racine.add(ombre(new THREE.Mesh(balayage([[24.6, 8.05], [24.6, P.YENT]], aMur[0], aMur[1], { echelle: baie(24.6), rRef: 24.6, vNorm: true, inverse: true }), mTent), false));
  racine.add(ombre(new THREE.Mesh(balayage([[21.62, 8.22], [24.6, 8.22]], aMur[0], aMur[1], { inverse: true, echelle: 1.4 }), M.moquette), false));
  racine.add(ombre(new THREE.Mesh(balayage([[21.62, 7.95], [21.62, 9.05]], aMur[0], aMur[1], { echelle: baie(21.62), rRef: 21.62, vNorm: true, inverse: true }), mLoge)));
  racine.add(ombre(new THREE.Mesh(balayage([[21.5, 9.05], [21.9, 9.05]], aMur[0], aMur[1], { inverse: true, echelle: 1 }), M.veloursRouge)));
  for (const rb of [22.25, 23.3]) {
    racine.add(ombre(new THREE.Mesh(balayage([[rb, 8.22], [rb, 8.66], [rb + 0.5, 8.66], [rb + 0.5, 8.22]], -12, 192, { inverse: true, echelle: 1 }), M.veloursRouge)));
  }
  // Les draperies : deux festons rouges par travée, frange dorée, glands aux colonnes.
  const plis: [THREE.BufferGeometry, THREE.Matrix4 | null][] = [], franges: typeof plis = [];
  const pt = (r: number, a: number, y: number) => new THREE.Vector3(r * Math.cos(rad(a)), y, r * Math.sin(rad(a)));
  for (let k = 0; k < 14; k++) {
    const a0 = P.TH0 + 12 * k + 1.1, a1 = P.TH0 + 12 * (k + 1) - 1.1, am = (a0 + a1) / 2;
    for (const [b0, b1] of [[a0, am], [am, a1]]) {
      const bm = (b0 + b1) / 2;
      const c1 = new THREE.QuadraticBezierCurve3(pt(21.46, b0, 9.02), pt(21.4, bm, 7.95), pt(21.46, b1, 9.02));
      const c2 = new THREE.QuadraticBezierCurve3(pt(21.43, b0, 8.9), pt(21.37, bm, 7.83), pt(21.43, b1, 8.9));
      plis.push([new THREE.TubeGeometry(c1, 20, 0.12, 8, false), null]);
      franges.push([new THREE.TubeGeometry(c2, 20, 0.035, 6, false), null]);
    }
    for (const a of [a0, am, a1]) { const p = pt(21.42, a, 8.75); franges.push([new THREE.CylinderGeometry(0.025, 0.075, 0.34, 10), mat4(p.x, p.y, p.z)]); }
  }
  racine.add(ombre(new THREE.Mesh(fusion(plis), M.veloursRouge)));
  racine.add(ombre(new THREE.Mesh(fusion(franges), M.or)));

  // Le dossier de l'hémicycle : lambris derrière le dernier rang, dessus en marbre crème clouté d'or.
  const yD = P.YTOP + 0.95, mDos = standard({ map: T.dossier, roughness: 0.38, metalness: 0.1, envMapIntensity: 0.8 });
  racine.add(ombre(new THREE.Mesh(balayage([[rTop, P.YTOP], [rTop, yD]], P.TH0 - 1.5, P.TH1 + 1.5, { inverse: true, echelle: 1.4 }), M.panneau)));
  racine.add(ombre(new THREE.Mesh(balayage([[rTop - 0.02, yD], [rTop + 0.28, yD]], P.TH0 - 1.5, P.TH1 + 1.5, { inverse: true, echelle: 0.62, rRef: rTop + 0.13, vNorm: true }), mDos)));
  racine.add(ombre(new THREE.Mesh(balayage([[rTop + 0.28, yD], [rTop + 0.28, P.YTOP]], P.TH0 - 1.5, P.TH1 + 1.5, { inverse: true, echelle: 1.4 }), M.noyer)));

  // La frise peinte à la base de la coupole, masquée avec elle dans la vue du dessus (pas au palier léger).
  if (!leger) {
    const mFrise = standard({ map: T.frise, roughness: 0.6, metalness: 0.1, envMapIntensity: 0.7 });
    plafond.add(new THREE.Mesh(balayage([[22.35, P.YCOR + 0.02], [22.35, P.YCOR + 1.35]], 0, 180, { echelle: 8.8, rRef: 22.35, vNorm: true, inverse: true }), mFrise));
  }

  // Ce que la vue du dessus voit autour de la salle : le plafond doré des galeries, vu d'en haut,
  // jusqu'aux bords de l'écran. Invisible de l'intérieur (il ne regarde que vers le haut), sans ombre.
  const copie = (m: THREE.Material, rx: number, ry: number) => {
    const c = m.clone() as Matieres[string];
    for (const k of ['map', 'bumpMap', 'metalnessMap', 'roughnessMap', 'emissiveMap']) { c[k] = c[k].clone(); c[k].needsUpdate = true; c[k].repeat.set(rx, ry); }
    c.side = THREE.FrontSide; c.envMapIntensity = 0.75;
    return c;
  };
  racine.add(new THREE.Mesh(balayage([[22.9, P.YCOR + 0.05], [60, P.YCOR + 0.05]], -32, 212, { inverse: true, echelle: 2.4 }), copie(M.caissonBerceau, 1, 1)));
  const fond = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), copie(M.caissonBerceau, 120 / 2.4, 50 / 2.4));
  fond.rotation.x = -Math.PI / 2; fond.position.set(0, P.YCOR + 0.03, P.ZFOND - 25.02); racine.add(fond);

  // Le sol de marbre, plus sombre et moins verni : vu d'en haut, il ne renvoie plus la lumière en blanc.
  M.sol.color.setHex(0x2a221d); M.sol.clearcoat = 0.15; M.sol.roughness = 0.45; M.sol.envMapIntensity = 0.3; M.sol.needsUpdate = true;
}
