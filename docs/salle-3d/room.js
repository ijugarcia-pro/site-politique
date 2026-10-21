/* ============================================================
   LA SALLE — Three.js r128 (sans module), rendu à la demande
   Repère : centre de l'hémicycle à l'origine, sièges vers +z,
   tribune et perchoir vers -z. Unités : mètres.
   ============================================================ */
const SALLE = (() => {
  'use strict';
  const P = {
    R0: 6.4, D: 1.08, H: 0.36, NR: 13, TH0: 6, TH1: 174,
    ALLEES: [33, 61.5, 90, 118.5, 147], ALLEE: 1.05,
    RCOL: 21.0, YTOP: 13 * 0.36, YENT: 12.6, YCOR: 13.8, RDOME: 23.0, KDOME: 0.42, ZFOND: -6.5
  };
  const rad = d => d * Math.PI / 180;
  let THREE_ = null, renderer, scene, camera, canvas, pmrem;
  const M = {}, G = {}, I = {};
  let sieges = [], voyantsActifs = false, demande = false, surRendu = null, ech = [];
  const cam = { pos: null, cible: null, fov: 50, haut: [0, 1, 0] };

  /* ---------------- Géométrie utilitaire ---------------- */
  function tex(canvas, opt = {}) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (opt.srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = opt.aniso || 8;
    if (opt.repeat) t.repeat.set(opt.repeat[0], opt.repeat[1]);
    return t;
  }
  function clone(t, rx, ry) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; }

  /* Balayage d'un profil (r, y) autour de l'axe vertical, d'un angle th0 à th1 (degrés, repère hémicycle).
     Chaque segment du profil a sa propre bande (arêtes vives), son groupe de matière et des UV en mètres. */
  function balayage(profil, th0, th1, opt = {}) {
    const seg = opt.seg || Math.max(8, Math.ceil(Math.abs(th1 - th0) / 1.2));
    const mats = opt.mats || [], echelle = opt.echelle || 1, rRef = opt.rRef;
    const pos = [], nor = [], uv = [], idx = [], groupes = [];
    let vAcc = 0, base = 0;
    for (let k = 0; k < profil.length - 1; k++) {
      const [r0, y0] = profil[k], [r1, y1] = profil[k + 1];
      const len = Math.hypot(r1 - r0, y1 - y0); if (len < 1e-6) continue;
      let nr = (y1 - y0) / len, ny = -(r1 - r0) / len;
      const vEch = opt.vNorm ? len : echelle;
      if (opt.inverse) { nr = -nr; ny = -ny; }
      const debutIdx = idx.length;
      for (let i = 0; i <= seg; i++) {
        const th = rad(th0 + (th1 - th0) * i / seg), c = Math.cos(th), s = Math.sin(th);
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

  /* Remet chaque triangle dans le bon sens d'après la normale fournie (évite les faces invisibles). */
  function corrigeSens(g) {
    const p = g.attributes.position.array, n = g.attributes.normal.array, ix = g.index.array;
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      const d = cx * (n[a] + n[b] + n[c]) + cy * (n[a + 1] + n[b + 1] + n[c + 1]) + cz * (n[a + 2] + n[b + 2] + n[c + 2]);
      if (d < 0) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; }
    }
    g.index.needsUpdate = true;
  }

  /* Boîte à arêtes arrondies (pour les reflets sur le bois et le velours). */
  function boiteRonde(w, h, d, r, s = 3) {
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

  /* Fusion simple de géométries (non indexées) avec matrices. */
  function fusion(liste) {
    const pos = [], nor = [], uv = [];
    for (const [geo, m] of liste) {
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()); if (m) g.applyMatrix4(m);
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
      if (g.attributes.uv) uv.push(...g.attributes.uv.array); else for (let i = 0; i < g.attributes.position.count; i++) uv.push(0, 0);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return out;
  }
  const mat4 = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => {
    const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.setScalar(s); o.updateMatrix(); return o.matrix.clone();
  };

  /* ---------------- Répartition des 577 sièges ---------------- */
  function repartition() {
    const bornes = [P.TH0, ...P.ALLEES, P.TH1];
    const rangs = [];
    let total = 0;
    for (let i = 0; i < P.NR; i++) {
      const rd = P.R0 + i * P.D, rs = rd + 0.74, y = (i + 1) * P.H;
      const secteurs = [];
      for (let k = 0; k < bornes.length - 1; k++) {
        const ma = (k === 0 ? 0.4 : P.ALLEE / 2) / rs, mb = (k === bornes.length - 2 ? 0.4 : P.ALLEE / 2) / rs;
        const a0 = rad(bornes[k]) + ma, a1 = rad(bornes[k + 1]) - mb;
        secteurs.push({ a0, a1, l: (a1 - a0) * rs });
      }
      const l = secteurs.reduce((s, x) => s + x.l, 0);
      rangs.push({ i, rd, rs, y, secteurs, l }); total += l;
    }
    const pas = total / 577;
    let n = rangs.map(r => r.l / pas), base = n.map(Math.floor), reste = 577 - base.reduce((a, b) => a + b, 0);
    n.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).slice(0, reste).forEach(([, i]) => base[i]++);
    const liste = [];
    rangs.forEach((r, i) => {
      const ns = r.secteurs.map(s => s.l / r.l * base[i]), nb = ns.map(Math.floor);
      let rs2 = base[i] - nb.reduce((a, b) => a + b, 0);
      ns.map((v, k) => [v - Math.floor(v), k]).sort((a, b) => b[0] - a[0]).slice(0, rs2).forEach(([, k]) => nb[k]++);
      r.secteurs.forEach((s, k) => {
        for (let j = 0; j < nb[k]; j++) {
          const th = s.a0 + (j + 0.5) * (s.a1 - s.a0) / nb[k];
          liste.push({ rang: i, secteur: k, th, r: r.rs, rd: r.rd, y: r.y });
        }
      });
      r.n = base[i];
    });
    return { liste, rangs };
  }

  /* ---------------- Matières ---------------- */
  function matieres() {
    const t0 = performance.now();
    const bois = MAT.noyer(7), boisClair = MAT.noyer(9, 0.05);
    const pan = MAT.panneaux(bois, 4, 1, 26);
    const vel = MAT.velours(), moq = MAT.moquette();
    const mg = MAT.marbre(17, 'gris-rose'), mst = MAT.marbre(19, 'statuaire');
    const pat = MAT.patine(), cai = MAT.caisson(), ver = MAT.verriere(), vit = MAT.vitrage();
    const mos = MAT.mosaique(), can = MAT.cannelures(), bal = MAT.balustrade(), ent = MAT.entablement();
    const gal = MAT.galerie(), mur = MAT.murFond(), facT = MAT.facade(83, true), facP = MAT.facade(89, false);
    const T = {
      bois: tex(bois.c), boisH: tex(bois.h, { srgb: false }), boisR: tex(bois.ro, { srgb: false }),
      boisClair: tex(boisClair.c),
      pan: tex(pan.c), panH: tex(pan.h, { srgb: false }),
      vel: tex(vel.c), velH: tex(vel.h, { srgb: false }),
      moq: tex(moq.c), moqH: tex(moq.h, { srgb: false }),
      mg: tex(mg.c), mst: tex(mst.c),
      pat: tex(pat.ro, { srgb: false }),
      cai: tex(cai.c), caiH: tex(cai.h, { srgb: false }), caiM: tex(cai.m, { srgb: false }), caiR: tex(cai.ro, { srgb: false }),
      ver: tex(ver.c), vit: tex(vit.c),
      mos: tex(mos.c, { aniso: 16 }), mosH: tex(mos.h, { srgb: false, aniso: 16 }),
      can: tex(can.h, { srgb: false }), bal: tex(bal.a), balH: tex(bal.h, { srgb: false }),
      ent: tex(ent.c), entH: tex(ent.h, { srgb: false }), entM: tex(ent.m, { srgb: false }),
      gal: tex(gal.c), mur: tex(mur.c, { aniso: 16 }), murH: tex(mur.h, { srgb: false }),
      facT: tex(facT.c), facTH: tex(facT.h, { srgb: false }), facP: tex(facP.c), facPH: tex(facP.h, { srgb: false }),
      p578: tex(MAT.plaque578())
    };
    for (const k of ['mos', 'mosH', 'mur', 'murH', 'facT', 'facTH', 'facP', 'facPH', 'p578', 'ver']) { T[k].wrapS = T[k].wrapT = THREE.ClampToEdgeWrapping; }
    for (const k of ['ent', 'entH', 'entM']) T[k].flipY = false;

    const vernis = { clearcoat: 0.55, clearcoatRoughness: 0.28 };
    M.noyer = new THREE.MeshPhysicalMaterial({ map: T.bois, bumpMap: T.boisH, bumpScale: 0.012, roughnessMap: T.boisR, roughness: 1, metalness: 0, ...vernis, envMapIntensity: 0.9 });
    M.noyerClair = new THREE.MeshPhysicalMaterial({ map: T.boisClair, bumpMap: T.boisH, bumpScale: 0.01, roughness: 0.55, ...vernis, envMapIntensity: 0.9 });
    M.plateau = new THREE.MeshPhysicalMaterial({ map: T.bois, color: 0x9c8474, bumpMap: T.boisH, bumpScale: 0.008, roughnessMap: T.boisR, roughness: 1, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.7 });
    M.panneau = new THREE.MeshPhysicalMaterial({ map: T.pan, bumpMap: T.panH, bumpScale: 0.03, roughness: 0.5, ...vernis, envMapIntensity: 0.8 });
    M.velours = new THREE.MeshPhysicalMaterial({ map: T.vel, bumpMap: T.velH, bumpScale: 0.004, roughness: 0.92, metalness: 0, sheen: new THREE.Color(0.42, 0.08, 0.1), envMapIntensity: 0.3 });
    M.velours.onBeforeCompile = sh => { // reflet rasant du velours
      sh.fragmentShader = sh.fragmentShader.replace('#include <tonemapping_fragment>',
        'float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);\n gl_FragColor.rgb += vec3(0.20, 0.035, 0.045) * fr * (0.35 + 0.65 * diffuseColor.r);\n#include <tonemapping_fragment>');
    };
    M.moquette = new THREE.MeshStandardMaterial({ map: T.moq, bumpMap: T.moqH, bumpScale: 0.006, roughness: 1, envMapIntensity: 0.2, color: 0xb89a90 });
    M.marbre = new THREE.MeshPhysicalMaterial({ map: T.mg, roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 0.8 });
    M.statuaire = new THREE.MeshPhysicalMaterial({ map: T.mst, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 0.7 });
    M.laiton = new THREE.MeshStandardMaterial({ color: 0xa47a30, metalness: 1, roughness: 1.4, roughnessMap: T.pat, envMapIntensity: 1.0 });
    M.or = new THREE.MeshStandardMaterial({ color: 0xd8af58, metalness: 1, roughness: 0.85, roughnessMap: T.pat, envMapIntensity: 1.35 });
    M.caisson = new THREE.MeshStandardMaterial({ map: clone(T.cai, 28, 6), bumpMap: clone(T.caiH, 28, 6), bumpScale: 0.06, metalnessMap: clone(T.caiM, 28, 6), metalness: 1, roughnessMap: clone(T.caiR, 28, 6), roughness: 1, side: THREE.BackSide, envMapIntensity: 1.1 });
    M.caissonBerceau = M.caisson.clone();
    for (const k of ['map', 'bumpMap', 'metalnessMap', 'roughnessMap']) M.caissonBerceau[k] = clone(M.caisson[k], 1, 1);
    M.caissonBerceau.side = THREE.FrontSide;
    M.verriere = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: T.ver, emissiveIntensity: 2.0, roughness: 1, side: THREE.BackSide, fog: false });
    M.vitrage = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: T.vit, emissiveIntensity: 2.0, roughness: 1, fog: false });
    M.mosaique = new THREE.MeshPhysicalMaterial({ map: T.mos, bumpMap: T.mosH, bumpScale: 0.01, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
    M.sol = new THREE.MeshPhysicalMaterial({ map: clone(T.mg, 6, 6), color: 0xb9a596, roughness: 0.3, clearcoat: 0.4, envMapIntensity: 0.6 });
    M.colonne = new THREE.MeshPhysicalMaterial({ map: clone(T.mst, 1, 3), color: 0xeadcc4, bumpMap: T.can, bumpScale: 0.09, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.18, envMapIntensity: 0.8 });
    M.balustre = new THREE.MeshStandardMaterial({ map: clone(T.bal, 60, 1), bumpMap: clone(T.balH, 60, 1), bumpScale: 0.03, alphaTest: 0.5, metalness: 1, roughness: 0.38, color: 0xffffff, side: THREE.DoubleSide, envMapIntensity: 1.3 });
    M.entablement = new THREE.MeshStandardMaterial({ map: clone(T.ent, 40, 1), bumpMap: clone(T.entH, 40, 1), bumpScale: 0.04, metalnessMap: clone(T.entM, 40, 1), metalness: 1, roughness: 0.55, envMapIntensity: 1.0 });
    M.galerie = new THREE.MeshStandardMaterial({ map: clone(T.gal, 18, 1), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.28, roughness: 0.85, envMapIntensity: 0.4 });
    M.galerie.emissiveMap = M.galerie.map;
    M.stuc = new THREE.MeshStandardMaterial({ color: 0xd8c7a3, roughness: 0.85, envMapIntensity: 0.4 });
    M.mur = new THREE.MeshStandardMaterial({ map: T.mur, bumpMap: T.murH, bumpScale: 0.03, roughness: 0.6, envMapIntensity: 0.6 });
    M.facT = new THREE.MeshPhysicalMaterial({ map: T.facT, bumpMap: T.facTH, bumpScale: 0.03, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 0.8 });
    M.facP = new THREE.MeshPhysicalMaterial({ map: T.facP, bumpMap: T.facPH, bumpScale: 0.03, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 0.8 });
    M.facB = M.facP.clone(); M.facB.map = clone(T.facP, 3, 1); M.facB.map.wrapS = THREE.RepeatWrapping; M.facB.bumpMap = clone(T.facPH, 3, 1); M.facB.bumpMap.wrapS = THREE.RepeatWrapping;
    M.p578 = new THREE.MeshStandardMaterial({ map: T.p578, metalness: 0.85, roughness: 0.35, envMapIntensity: 1.2 });
    M.voyant = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    M.lueur = new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex(lueurCanvas()), transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, fog: false });
    M.faisceau = new THREE.ShaderMaterial({
      uniforms: { uCouleur: { value: new THREE.Color(1.0, 0.86, 0.62) }, uForce: { value: 0.11 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vN=normalMatrix*normal; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uCouleur; uniform float uForce; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e=abs(dot(normalize(vN),normalize(vV))); float a=pow(e,2.5)*smoothstep(0.0,0.55,vUv.y)*(1.0-smoothstep(0.82,1.0,vUv.y)); a*=0.75+0.25*sin(vUv.x*44.0)*sin(vUv.x*17.0+1.3); gl_FragColor=vec4(uCouleur*a*uForce,1.0); }',
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    M._ms = performance.now() - t0;
    ech = [['Noyer et miel', 'pupitres, sièges', bois.c], ['Lambris mouluré', 'façades des pupitres', pan.c], ['Velours rouge', 'les 578 sièges', vel.c],
      ['Moquette', 'gradins et allées', moq.c], ['Marbre gris-rosé', 'sol, plateaux', mg.c], ['Marbre statuaire', 'colonnes', mst.c],
      ['Caissons dorés', 'coupole', cai.c], ['Verrière', 'calotte vitrée', ver.c], ['Mosaïque', 'sol central', mos.c],
      ['Galeries', 'arcades du public', gal.c], ['Tribune', 'griotte et bas-relief', facT.c], ['Mur du perchoir', 'tenture tissée, niches', mur.c]];
  }

  function lueurCanvas() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c;
  }

  /* ---------------- Construction ---------------- */
  function construire() {
    const racine = new THREE.Group(); scene.add(racine);
    const ombre = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };

    /* Sols */
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), M.sol); sol.rotation.x = -Math.PI / 2; sol.position.set(0, -0.01, 10); racine.add(ombre(sol, false));
    const mos = new THREE.Mesh(new THREE.PlaneGeometry(18, 14.4), M.mosaique); mos.rotation.x = -Math.PI / 2; mos.position.set(0, 0.002, 0); racine.add(ombre(mos, false));

    /* Gradins : contremarche en noyer + marche en moquette, d'une extrémité à l'autre */
    const gr = new THREE.Group();
    for (let i = 0; i < P.NR; i++) {
      const rd = P.R0 + i * P.D, y0 = i * P.H, y1 = (i + 1) * P.H;
      const prof = [[rd, y0], [rd, y1], [rd, y1], [rd + P.D, y1]];
      gr.add(ombre(new THREE.Mesh(balayage(prof, P.TH0 - 1.5, P.TH1 + 1.5, { mats: [0, 0, 1], inverse: true, echelle: 1.4 }), [M.noyer, M.moquette])));
    }
    // plateforme haute (derrière le dernier rang, au pied de la colonnade)
    const rTop = P.R0 + P.NR * P.D;
    gr.add(ombre(new THREE.Mesh(balayage([[rTop, P.YTOP], [25, P.YTOP]], -16, 196, { inverse: true, echelle: 2 }), M.moquette), false));
    racine.add(gr);

    /* Pupitres : façade moulurée, lèvre, plateau incliné, dos. Interrompus aux allées. */
    const bornes = [P.TH0, ...P.ALLEES, P.TH1];
    for (let i = 0; i < P.NR; i++) {
      const rd = P.R0 + i * P.D, y = (i + 1) * P.H;
      const prof = [[rd + 0.40, y], [rd + 0.40, y + 0.66], [rd + 0.44, y + 0.66], [rd + 0.44, y + 0.72], [rd - 0.03, y + 0.86], [rd - 0.03, y + 0.80], [rd, y + 0.80]];
      for (let k = 0; k < bornes.length - 1; k++) {
        const ma = (k === 0 ? 0.25 : P.ALLEE / 2) / rd, mb = (k === bornes.length - 2 ? 0.25 : P.ALLEE / 2) / rd;
        const a0 = bornes[k] + ma * 180 / Math.PI, a1 = bornes[k + 1] - mb * 180 / Math.PI;
        const g = balayage(prof, a0, a1, { mats: [1, 1, 1, 0, 0, 0], echelle: 1.2 });
        racine.add(ombre(new THREE.Mesh(g, [M.plateau, M.noyer])));
        racine.add(ombre(new THREE.Mesh(balayage([[rd, y + 0.80], [rd, y]], a0, a1, { echelle: 3.2, vNorm: true, rRef: rd }), M.panneau)));
        // joues des pupitres
        for (const a of [a0, a1]) {
          const j = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.86, 0.05), M.noyer);
          const ar = rad(a), rm = rd + 0.2;
          j.position.set(rm * Math.cos(ar), y + 0.43, rm * Math.sin(ar)); j.rotation.y = -ar;
          racine.add(ombre(j));
        }
      }
    }
    // demi-marches dans les allées
    for (const a of P.ALLEES) for (let i = 1; i < P.NR; i++) {
      const rd = P.R0 + i * P.D, y = i * P.H + P.H / 2, w = P.ALLEE / rd * 180 / Math.PI;
      racine.add(ombre(new THREE.Mesh(balayage([[rd - 0.42, i * P.H], [rd - 0.42, y], [rd - 0.42, y], [rd, y]], a - w / 2, a + w / 2, { mats: [0, 0, 1], inverse: true }), [M.noyer, M.moquette])));
    }
    // flancs des gradins (lambris + main courante)
    for (const [a, s] of [[P.TH0 - 1.5, 1], [P.TH1 + 1.5, -1]]) {
      for (let i = 0; i < P.NR; i++) {
        const rd = P.R0 + i * P.D, hh = (i + 1) * P.H + 1.0, ar = rad(a);
        const b = new THREE.Mesh(new THREE.BoxGeometry(P.D + 0.02, hh, 0.22), M.panneau);
        const rm = rd + P.D / 2; b.position.set(rm * Math.cos(ar), hh / 2, rm * Math.sin(ar)); b.rotation.y = -ar;
        racine.add(ombre(b));
        const c = new THREE.Mesh(new THREE.BoxGeometry(P.D + 0.04, 0.06, 0.28), M.laiton);
        c.position.set(rm * Math.cos(ar), hh + 0.03, rm * Math.sin(ar)); c.rotation.y = -ar; racine.add(c);
      }
      void s;
    }
    // balustrade du premier rang (rampe dorée basse le long de l'hémicycle)
    racine.add(ombre(new THREE.Mesh(balayage([[P.R0 - 0.05, 0.98 + P.H - 0.12], [P.R0 - 0.05, 1.0 + P.H - 0.12]], P.TH0, P.TH1, { echelle: 1 }), M.laiton), false));

    /* Sièges (instances) */
    const { liste, rangs } = repartition(); sieges = liste; G.rangs = rangs;
    const velG = fusion([
      [boiteRonde(0.56, 0.13, 0.5, 0.055, 2), mat4(0, 0.48, 0.03)],
      [boiteRonde(0.54, 0.5, 0.12, 0.055, 2), mat4(0, 0.84, -0.24, -0.17)]
    ]);
    const boisG = fusion([
      [boiteRonde(0.6, 0.56, 0.06, 0.025, 1), mat4(0, 0.85, -0.32, -0.17)],
      [boiteRonde(0.07, 0.05, 0.46, 0.02, 1), mat4(0.31, 0.67, 0.0)],
      [boiteRonde(0.07, 0.05, 0.46, 0.02, 1), mat4(-0.31, 0.67, 0.0)],
      [new THREE.BoxGeometry(0.05, 0.24, 0.05), mat4(0.31, 0.53, 0.17)],
      [new THREE.BoxGeometry(0.05, 0.24, 0.05), mat4(-0.31, 0.53, 0.17)],
      [new THREE.BoxGeometry(0.5, 0.4, 0.42), mat4(0, 0.2, -0.02)]
    ]);
    const n = liste.length;
    I.velours = ombre(new THREE.InstancedMesh(velG, M.velours, n));
    I.bois = ombre(new THREE.InstancedMesh(boisG, M.noyer, n));
    I.plaque = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.008, 0.045), M.laiton, n);
    I.bague = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.032, 0.012, 20), M.laiton, n);
    I.voyant = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.voyant, n);
    I.lueur = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 0.6), M.lueur, n);
    const o = new THREE.Object3D(), pente = Math.atan(0.14 / 0.47), noir = new THREE.Color(0x1d1714), eteint = new THREE.Color(0, 0, 0);
    G.mVoyant = []; G.mLueur = [];
    liste.forEach((s, k) => {
      const x = s.r * Math.cos(s.th), z = s.r * Math.sin(s.th), yaw = Math.atan2(-x, -z);
      o.position.set(x, s.y, z); o.rotation.set(0, yaw, 0); o.scale.setScalar(1); o.updateMatrix();
      I.velours.setMatrixAt(k, o.matrix); I.bois.setMatrixAt(k, o.matrix);
      const surDesk = (r, lat) => {
        const yy = s.y + 0.86 - (r - (s.rd - 0.03)) * (0.14 / 0.47) + 0.004;
        const lx = Math.cos(s.th + Math.PI / 2) * lat, lz = Math.sin(s.th + Math.PI / 2) * lat;
        o.position.set(r * Math.cos(s.th) + lx, yy, r * Math.sin(s.th) + lz); o.rotation.set(-pente, yaw, 0, 'YXZ');
      };
      surDesk(s.rd + 0.3, 0); o.updateMatrix(); I.plaque.setMatrixAt(k, o.matrix);
      surDesk(s.rd + 0.13, -0.17); o.updateMatrix(); I.bague.setMatrixAt(k, o.matrix);
      // le voyant est posé sur l'arête du pupitre : visible du perchoir comme depuis le siège
      o.position.set((s.rd - 0.015) * Math.cos(s.th), s.y + 0.862, (s.rd - 0.015) * Math.sin(s.th)); o.rotation.set(0, yaw, 0); o.updateMatrix();
      I.voyant.setMatrixAt(k, o.matrix); I.voyant.setColorAt(k, noir);
      G.mVoyant.push({ p: o.position.clone(), q: o.quaternion.clone() });
      o.position.y += 0.01; o.rotation.set(-Math.PI / 2, yaw, 0, 'YXZ'); o.updateMatrix(); I.lueur.setMatrixAt(k, o.matrix); I.lueur.setColorAt(k, eteint);
      G.mLueur.push({ p: o.position.clone(), q: o.quaternion.clone(), qv: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, yaw, 0, 'YXZ')) });
    });
    for (const k of ['velours', 'bois', 'plaque', 'bague', 'voyant', 'lueur']) racine.add(I[k]);

    /* Colonnade + galeries */
    const fut = new THREE.CylinderGeometry(0.46, 0.5, 1, 32, 1, true);
    const nCol = 15, colPos = [];
    for (let k = 0; k < nCol; k++) { const a = rad(P.TH0 + k * (P.TH1 - P.TH0) / (nCol - 1)); colPos.push([P.RCOL * Math.cos(a), P.RCOL * Math.sin(a), P.YTOP, P.YENT - P.YTOP]); }
    for (const x of [-12.8, -5.4, 5.4, 12.8]) colPos.push([x, P.ZFOND + 0.75, 0, P.YENT]);
    I.fut = ombre(new THREE.InstancedMesh(fut, M.colonne, colPos.length));
    const baseG = fusion([[new THREE.BoxGeometry(1.25, 0.32, 1.25), mat4(0, 0.16, 0)], [new THREE.TorusGeometry(0.52, 0.09, 10, 32), mat4(0, 0.38, 0, Math.PI / 2)], [new THREE.TorusGeometry(0.5, 0.06, 10, 32), mat4(0, 0.5, 0, Math.PI / 2)]]);
    const chapG = fusion([
      [new THREE.CylinderGeometry(0.5, 0.46, 0.18, 32), mat4(0, -0.42, 0)],
      [new THREE.TorusGeometry(0.16, 0.07, 10, 20), mat4(0.5, -0.24, 0, 0, Math.PI / 2)],
      [new THREE.TorusGeometry(0.16, 0.07, 10, 20), mat4(-0.5, -0.24, 0, 0, Math.PI / 2)],
      [new THREE.CylinderGeometry(0.16, 0.16, 1.0, 16), mat4(0, -0.24, 0, 0, 0, Math.PI / 2)],
      [boiteRonde(1.3, 0.12, 1.3, 0.03), mat4(0, -0.06, 0)]
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

    // mur des galeries (arcades sombres), balcon et balustrade dorée, plafond du balcon
    const aMur = [-15.4, 195.4];
    const baie = 24.6 * rad((P.TH1 - P.TH0) / (nCol - 1)); // une arcade entre deux colonnes
    racine.add(ombre(new THREE.Mesh(balayage([[24.6, P.YTOP], [24.6, P.YCOR]], aMur[0], aMur[1], { echelle: baie, rRef: 24.6, vNorm: true, inverse: true }), M.galerie), false));
    M.galerie.map.repeat.set(1, 1); M.galerie.map.offset.set(0.5 - (rad(P.TH0) * 24.6 / baie) % 1, 0);
    racine.add(ombre(new THREE.Mesh(balayage([[21.7, 8.2], [24.6, 8.2]], aMur[0], aMur[1], { inverse: false }), M.stuc), false));
    racine.add(ombre(new THREE.Mesh(balayage([[21.7, 8.0], [21.7, 8.3], [21.6, 8.3]], aMur[0], aMur[1], { inverse: true }), M.or), false));
    const bal = new THREE.Mesh(balayage([[21.62, 8.3], [21.62, 9.25]], aMur[0], aMur[1], { echelle: 1, rRef: 21.62 }), M.balustre);
    M.balustre.map.repeat.set(0.625, 1 / 0.95); M.balustre.bumpMap.repeat.set(0.625, 1 / 0.95);
    racine.add(bal);
    // entablement (architrave, frise, corniche) au sommet des colonnes
    const profEnt = [[20.55, P.YENT], [20.55, 13.2], [20.4, 13.25], [20.4, 13.55], [20.1, 13.65], [20.0, P.YCOR], [P.RDOME, P.YCOR]];
    const ent = new THREE.Mesh(balayage(profEnt, aMur[0], aMur[1], { inverse: true, echelle: 1.2, mats: [0, 1, 0, 1, 1, 2] }), [M.entablement, M.or, M.stuc]);
    for (const k of ['map', 'bumpMap', 'metalnessMap']) M.entablement[k].repeat.set(0.2, 0.96);
    racine.add(ombre(ent));
    racine.add(ombre(new THREE.Mesh(balayage([[20.55, P.YENT], [24.6, P.YENT]], aMur[0], aMur[1]), M.stuc), false));

    /* Coupole (demi) à caissons + verrière, et berceau au-dessus du perchoir */
    G.plafond = new THREE.Group();
    const th0 = 0.62;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(P.RDOME, 160, 36, 0, Math.PI, th0, Math.PI / 2 - th0), M.caisson);
    dome.scale.set(1, P.KDOME, 1); dome.position.y = P.YCOR; dome.castShadow = true; G.plafond.add(dome);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(P.RDOME * 0.999, 160, 24, 0, Math.PI, 0, th0), M.verriere);
    cap.scale.set(1, P.KDOME, 1); cap.position.y = P.YCOR + 0.01; G.plafond.add(cap);
    const ell = t => [P.RDOME * Math.sin(t), P.YCOR + P.RDOME * P.KDOME * Math.cos(t)];
    const berceau = (t0, t1, mat, sens) => {
      const pos = [], nor = [], uv = [], idx = [], N = 40;
      const z0 = P.ZFOND, z1 = 0.02;
      for (const sx of [-1, 1]) {
        const b = pos.length / 3;
        for (let i = 0; i <= N; i++) {
          const t = t0 + (t1 - t0) * i / N, [x, y] = ell(t);
          const nx = -Math.sin(t) / P.RDOME, ny = -Math.cos(t) / (P.RDOME * P.KDOME), l = Math.hypot(nx, ny);
          for (const z of [z0, z1]) { pos.push(sx * x, y, z); nor.push(sx * nx / l, ny / l, 0); uv.push(t * P.RDOME / 2.4 * sens, z / 2.4); }
        }
        for (let i = 0; i < N; i++) { const a = b + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); corrigeSens(g);
      const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
    };
    G.plafond.add(berceau(th0, Math.PI / 2, M.caissonBerceau, 1));
    const vit = berceau(0, th0, M.vitrage, 1); vit.castShadow = false; G.plafond.add(vit);
    racine.add(G.plafond);

    /* Mur du fond (perchoir) */
    const mur = new THREE.Mesh(new THREE.PlaneGeometry(48, 14), M.mur); mur.position.set(0, 7, P.ZFOND); racine.add(ombre(mur, false));
    const tympan = new THREE.Mesh(new THREE.CircleGeometry(1, 64, 0, Math.PI), M.stuc); tympan.scale.set(P.RDOME, P.RDOME * P.KDOME, 1); tympan.position.set(0, P.YCOR, P.ZFOND + 0.01); racine.add(tympan);

    /* Tribune, bureau, perchoir */
    const boite = (w, h, d, x, y, z, faces) => { const m = new THREE.Mesh(boiteRonde(w, h, d, 0.03, 2), faces); m.position.set(x, y, z); return ombre(m); };
    const facesT = [M.noyer, M.noyer, M.noyerClair, M.noyer, M.facT, M.noyer];
    const bt = new THREE.BoxGeometry(2.4, 1.18, 1.1); const tribune = new THREE.Mesh(bt, facesT); tribune.position.set(0, 0.59, -0.9); racine.add(ombre(tribune));
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
    racine.add(boite(13, 2.44, 2.6, 0, 1.22, -5.25, M.noyer)); // estrade arrière
    const fauteuil = new THREE.Group();
    fauteuil.add(ombre(new THREE.Mesh(velG, M.velours)), ombre(new THREE.Mesh(boisG, M.noyer)));
    fauteuil.scale.setScalar(1.35); fauteuil.position.set(0, 2.48, -4.75); racine.add(fauteuil);
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { // escaliers du perchoir
      racine.add(boite(1.1, 0.34 * (k + 1), 0.3, s * 3.45, 0.17 * (k + 1), -3.2 - k * 0.24, M.marbre));
    }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) racine.add(boite(2.2, 0.08, 0.6, s * 5.6, 0.04 + k * 0.4, -2.0 - k * 0.6, M.statuaire)); // bancs des secrétaires (marches)

    /* Le 578e siège : une chaise en plus, au pied de la tribune */
    G.c578 = new THREE.Group();
    G.c578.add(ombre(new THREE.Mesh(velG, M.velours)), ombre(new THREE.Mesh(boisG, M.noyer)));
    const p578 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.012), M.p578); p578.position.set(0, 0.9, -0.36); p578.rotation.set(-0.17, Math.PI, 0); G.c578.add(p578);
    G.c578.position.set(2.15, 0, 0.9); G.c578.rotation.y = -0.35; racine.add(G.c578);

    /* Faisceaux de lumière de la verrière */
    G.faisceaux = new THREE.Group();
    const dir = new THREE.Vector3(-9, -50, 19).normalize();
    const pts = [[-1, -4], [4, -1], [-6, -2], [1.5, 3], [7, 2.5], [-4.5, 3.5]];
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    pts.forEach(([x, z], k) => {
      const L = 24, top = new THREE.Vector3(x, 22.5, z), mid = top.clone().addScaledVector(dir, L / 2);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1 + k * 0.08, 2.4, L, 32, 1, true), M.faisceau);
      m.position.copy(mid); m.quaternion.copy(q); m.renderOrder = 10; G.faisceaux.add(m);
    });
    racine.add(G.faisceaux);
    G.racine = racine;
  }

  /* ---------------- Lumière ---------------- */
  function eclairer() {
    const soleil = new THREE.DirectionalLight(0xffdcaa, 2.4);
    soleil.position.set(9, 50, -12); soleil.target.position.set(0, 0, 7);
    soleil.castShadow = true;
    const sc = soleil.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 90;
    soleil.shadow.mapSize.set(G.ombre || 4096, G.ombre || 4096); soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.03;
    scene.add(soleil, soleil.target); G.soleil = soleil;
    G.hemi = new THREE.HemisphereLight(0xffe2b8, 0x3a170f, 0.42); scene.add(G.hemi);
    // appliques chaudes le long de la colonnade (lumière d'appoint, sans ombre)
    G.appliques = [];
    for (const a of [20, 60, 90, 120, 160]) {
      const l = new THREE.PointLight(0xffb36b, 0.55, 18, 2); const ar = rad(a);
      l.position.set(19 * Math.cos(ar), 9.5, 19 * Math.sin(ar)); scene.add(l); G.appliques.push(l);
    }
    const fond = new THREE.PointLight(0xffc27a, 0.8, 16, 2); fond.position.set(0, 7, -3); scene.add(fond); G.appliques.push(fond);
    // douche de lumière sur le 578e siège
    const spot = new THREE.SpotLight(0xffe0a8, 1.4, 14, 0.32, 0.6, 1.5); spot.position.set(2.6, 9, 3.2); spot.target = G.c578; scene.add(spot); G.spot578 = spot;
    // environnement pour les reflets (laiton, vernis, marbre)
    const envTex = new THREE.CanvasTexture(MAT.environnement()); envTex.mapping = THREE.EquirectangularReflectionMapping; envTex.encoding = THREE.sRGBEncoding;
    pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(envTex).texture; envTex.dispose();
    scene.background = new THREE.Color(0x1a0f09);
    scene.fog = new THREE.FogExp2(0x6b4a30, 0.0085);
  }

  /* ---------------- Vues ---------------- */
  function cadrage(nom, aspect) {
    const portrait = aspect < 0.9;
    if (nom === 'salle') return portrait ? { pos: [0, 9.6, -6.2], cible: [0, 6.4, 10], fov: 80 } : { pos: [0, 7.0, -6.4], cible: [0, 5.5, 11], fov: 64 };
    if (nom === 'carnet') return portrait ? { pos: [0, 5.2, -5.6], cible: [0, 13.5, 10], fov: 84 } : { pos: [0, 5.6, -5.6], cible: [0, 9.6, 11], fov: 60 };
    if (nom === 'travee') return portrait ? { pos: [12.8, 5.4, 9.6], cible: [-1.5, 1.4, 1.2], fov: 74 } : { pos: [12.6, 5.3, 9.0], cible: [-2.2, 1.3, 2.4], fov: 54 };
    if (nom === 'libre' && camLibreVal) return camLibreVal;
    if (nom === 'plan') {
      // en portrait, le plan pivote d'un quart de tour pour occuper toute la hauteur de l'écran
      const fov = portrait ? 50 : 40, tv = Math.tan(rad(fov / 2));
      if (portrait) {
        const dW = 15.8 / (tv * aspect), dH = 24.0 / tv, d = Math.max(dW, dH) * 1.04;
        return { pos: [0, d, 7.2], cible: [0, 0, 7.2], fov, haut: [1, 0, 0.001] };
      }
      const dW = 23.2 / (tv * aspect), dH = 14.6 / tv, d = Math.max(dW, dH) * 1.08;
      return { pos: [0, d, 6.2], cible: [0, 0, 7.0], fov };
    }
    return cadrage('salle', aspect);
  }

  function appliquerCam() {
    camera.fov = cam.fov; camera.position.set(...cam.pos); camera.up.set(...(cam.haut || [0, 1, 0])).normalize();
    camera.lookAt(...cam.cible); camera.updateProjectionMatrix();
  }

  let vueCourante = 'salle', anim = null;
  function vue(nom, opt = {}) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const c = cadrage(nom, aspect);
    const plan = nom === 'plan';
    vueCourante = nom;
    const fin = () => {
      G.plafond.visible = !plan; G.faisceaux.visible = !plan; scene.fog.density = plan ? 0.0004 : 0.0085;
      renderer.toneMappingExposure = plan ? 0.78 : 1.05; G.soleil.intensity = plan ? 1.5 : 2.4;
      echV = plan ? 9 : 1; poserVoyants(); M.sol.color.setHex(plan ? 0x5e4f44 : 0xb9a596);
      renderer.shadowMap.needsUpdate = true;
    };
    if (anim) { anim.kill && anim.kill(); anim = null; }
    const haut = c.haut || [0, 1, 0];
    if (opt.instant || !window.gsap) { cam.pos = c.pos.slice(); cam.cible = c.cible.slice(); cam.fov = c.fov; cam.haut = haut; fin(); appliquerCam(); demander(); return Promise.resolve(); }
    if (plan) { G.plafond.visible = false; G.faisceaux.visible = false; renderer.shadowMap.needsUpdate = true; }
    const h0 = cam.haut || [0, 1, 0];
    const de = { px: cam.pos[0], py: cam.pos[1], pz: cam.pos[2], tx: cam.cible[0], ty: cam.cible[1], tz: cam.cible[2], fov: cam.fov, ux: h0[0], uy: h0[1], uz: h0[2] };
    const vers = { px: c.pos[0], py: c.pos[1], pz: c.pos[2], tx: c.cible[0], ty: c.cible[1], tz: c.cible[2], fov: c.fov, ux: haut[0], uy: haut[1], uz: haut[2] };
    return new Promise(res => {
      anim = gsap.to(de, {
        ...vers, duration: opt.duree || 1.6, ease: 'power2.inOut',
        onUpdate: () => { cam.pos = [de.px, de.py, de.pz]; cam.cible = [de.tx, de.ty, de.tz]; cam.fov = de.fov; cam.haut = [de.ux, de.uy, de.uz]; appliquerCam(); demander(); },
        onComplete: () => { anim = null; fin(); demander(); res(); }
      });
    });
  }
  function terminerAnim() { if (anim) { anim.progress(1); } }

  /* Petit travelling d'entrée (passable) */
  function entree(nom) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight), c = cadrage(nom, aspect);
    const recul = [c.pos[0] * 1.08, c.pos[1] + 1.6, c.pos[2] - (nom === 'travee' ? -1.8 : 1.4)];
    cam.pos = recul; cam.cible = [c.cible[0], c.cible[1] + 1.2, c.cible[2]]; cam.fov = c.fov + 4; cam.haut = c.haut || [0, 1, 0]; appliquerCam(); demander();
    return vue(nom, { duree: 2.4 });
  }

  /* ---------------- Voyants (aperçu illustratif) ---------------- */
  let allumes = [], echV = 1;
  function poserVoyants() {
    const m = new THREE.Matrix4(), s = new THREE.Vector3();
    sieges.forEach((x, k) => {
      const a = G.mVoyant[k], b = G.mLueur[k], on = !!allumes[k];
      s.setScalar(echV); m.compose(a.p, a.q, s); I.voyant.setMatrixAt(k, m);
      s.setScalar(on ? (echV === 1 ? 1 : (G.lueurEch || 0)) : 0); m.compose(b.p, G.lueurVerticale ? b.qv : b.q, s); I.lueur.setMatrixAt(k, m);
    });
    I.voyant.instanceMatrix.needsUpdate = true; I.lueur.instanceMatrix.needsUpdate = true;
  }
  const COUL = { pour: 0x2F7BFF, contre: 0xFF6A3D, abst: 0xFFC531 };
  function voyants(actif) {
    voyantsActifs = actif;
    const noir = new THREE.Color(0x1d1714), z = new THREE.Color(0, 0, 0), c = new THREE.Color();
    const r = MAT.rng(5);
    sieges.forEach((s, k) => {
      const t = r(); // tirage au hasard, sans aucun lien avec la place dans la salle (aperçu illustratif)
      let v = null;
      if (actif) v = t < 0.14 ? null : t < 0.2 ? 'abst' : t < 0.6 ? 'pour' : 'contre';
      allumes[k] = !!v;
      if (v) { c.setHex(COUL[v]); I.voyant.setColorAt(k, c); I.lueur.setColorAt(k, c); }
      else { I.voyant.setColorAt(k, noir); I.lueur.setColorAt(k, z); }
    });
    I.voyant.instanceColor.needsUpdate = true; I.lueur.instanceColor.needsUpdate = true; poserVoyants();
    demander();
  }

  /* ---------------- Mise en scène : ta place, ton jumeau, ton personnage ---------------- */
  let camLibreVal = null;
  function camLibre(pos, cible, fov, haut) {
    camLibreVal = { pos, cible, fov, haut: haut || [0, 1, 0] }; vueCourante = 'libre';
    cam.pos = pos.slice(); cam.cible = cible.slice(); cam.fov = fov; cam.haut = camLibreVal.haut; appliquerCam(); demander();
  }
  const bornesAllees = () => [P.TH0, ...P.ALLEES, P.TH1];
  function trouverSiege(rang, secteur, bout) {
    const l = sieges.map((s, k) => ({ s, k })).filter(o => o.s.rang === rang && o.s.secteur === secteur).sort((a, b) => a.s.th - b.s.th);
    return (bout === 'debut' ? l[0] : l[l.length - 1]).k;
  }
  /* Le 578e siège : une chaise en plus, dans l'allée, juste à côté du siège k (celui du jumeau). */
  function placer578(k, cote) {
    const s = sieges[k], b = bornesAllees();
    const a = rad(cote === 'debut' ? b[s.secteur] : b[s.secteur + 1]);
    const x = s.r * Math.cos(a), z = s.r * Math.sin(a);
    G.c578.position.set(x, s.y, z); G.c578.rotation.set(0, Math.atan2(-x, -z), 0);
    G.spot578.position.set(x * 0.92, s.y + 6.5, z * 0.92);
    renderer.shadowMap.needsUpdate = true; demander();
    return [x, s.y, z];
  }
  function positionSiege(k, dy = 0) { const s = sieges[k]; return [s.r * Math.cos(s.th), s.y + dy, s.r * Math.sin(s.th)]; }
  /* Le jumeau : sa plaquette s'éclaire, une petite lumière chaude sur son pupitre, et un fil qui le relie à toi. */
  function jumeau(k, opt = {}) {
    if (!G.jum) {
      G.jum = new THREE.Group(); scene.add(G.jum);
      G.jumPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.052), new THREE.MeshStandardMaterial({ color: 0xE9CB86, emissive: 0xFFD79A, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3 }));
      G.jumLum = new THREE.PointLight(0xffd9a0, 0.9, 3.4, 2);
      G.jum.add(G.jumPlaque, G.jumLum);
    }
    const m = new THREE.Matrix4(), sc = new THREE.Vector3(); I.plaque.getMatrixAt(k, m); m.decompose(G.jumPlaque.position, G.jumPlaque.quaternion, sc);
    G.jumPlaque.position.y += 0.004;
    const p = positionSiege(k, 1.7); G.jumLum.position.set(...p);
    G.jumLum.intensity = opt.lumiere != null ? opt.lumiere : 0.9; G.jum.visible = opt.visible !== false;
    if (G.fil) { scene.remove(G.fil); G.fil = null; }
    if (opt.fil) {
      G.c578.updateMatrixWorld(true);
      const a = G.jumPlaque.position.clone(), b = G.c578.localToWorld(new THREE.Vector3(0, 0.98, -0.36));
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y += 0.28;
      const courbe = new THREE.QuadraticBezierCurve3(a, mid, b);
      G.fil = new THREE.Mesh(new THREE.TubeGeometry(courbe, 40, opt.fil.r || 0.009, 8, false), new THREE.MeshBasicMaterial({ color: opt.fil.couleur || 0xFFD9A0, toneMapped: false, transparent: true, opacity: 0.95 }));
      scene.add(G.fil);
    }
    demander();
  }
  /* Ton personnage : formes simples, assis sur le 578e siège. */
  function personnage(opt = {}) {
    if (G.perso) { G.c578.remove(G.perso); G.perso = null; }
    if (opt.visible === false) { demander(); return; }
    const std = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r, envMapIntensity: 0.5 });
    const pl = opt.platre ? std(opt.platre, 0.9) : null;
    const peau = pl || std(opt.peau || 0xB98564, 0.62), tenue = pl || std(opt.tenue || 0x6B6E73, 0.88), bas = pl || std(opt.bas || 0x2C2F35, 0.82), cheveux = pl || std(opt.cheveux || 0x2B2019, 0.72);
    const g = new THREE.Group(), V = (a) => new THREE.Vector3(...a);
    const seg = (a, b, r, mat, bout = true) => {
      const A = V(a), B = V(b), L = A.distanceTo(B);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 22), mat); c.position.copy(A).add(B).multiplyScalar(0.5);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.add(c);
      if (bout) for (const P_ of [A, B]) { const j = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 14), mat); j.position.copy(P_); g.add(j); }
    };
    const prof = [[0.001, 0], [0.13, 0.0], [0.155, 0.07], [0.145, 0.2], [0.165, 0.36], [0.185, 0.44], [0.11, 0.5], [0.04, 0.52], [0.001, 0.52]].map(([r, y]) => new THREE.Vector2(r, y));
    const torse = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), tenue); torse.scale.set(1, 1, 0.66); torse.position.set(0, 0.57, -0.1); torse.rotation.x = -0.06; g.add(torse);
    seg([0, 1.06, -0.12], [0, 1.15, -0.11], 0.046, peau, false);
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.1, 36, 26), peau); tete.scale.set(0.9, 1.1, 0.98); tete.position.set(0, 1.27, -0.1); g.add(tete);
    const coupe = opt.coiffure || 'courte';
    if (coupe !== 'rasee') {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.106, 36, 20, 0, Math.PI * 2, 0, coupe === 'longue' ? Math.PI * 0.72 : Math.PI * 0.5), cheveux);
      h.scale.set(0.93, 1.1, 1.02); h.position.set(0, 1.285, -0.115); h.rotation.x = -0.35; g.add(h);
      if (coupe === 'longue') { const q = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.2, 24), cheveux); q.position.set(0, 1.16, -0.17); g.add(q); }
    }
    for (const sx of [-0.092, 0.092]) {
      seg([sx, 0.62, -0.06], [sx, 0.61, 0.36], 0.068, bas); seg([sx, 0.61, 0.36], [sx * 1.05, 0.13, 0.42], 0.052, bas);
      const pied = new THREE.Mesh(boiteRonde(0.1, 0.07, 0.22, 0.03, 2), bas); pied.position.set(sx * 1.05, 0.05, 0.48); g.add(pied);
    }
    for (const sx of [-1, 1]) {
      seg([sx * 0.185, 0.99, -0.12], [sx * 0.235, 0.76, -0.02], 0.044, tenue);
      seg([sx * 0.235, 0.76, -0.02], [sx * 0.15, 0.67, 0.24], 0.04, tenue);
      const main = new THREE.Mesh(new THREE.SphereGeometry(0.042, 20, 14), peau); main.scale.set(1, 0.7, 1.3); main.position.set(sx * 0.14, 0.665, 0.29); g.add(main);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    G.perso = g; G.c578.add(g); renderer.shadowMap.needsUpdate = true; demander();
  }

  /* ---------------- Ambiances : jour, documentaire, verdict, plâtre ---------------- */
  let base0 = null;
  function memoriser() {
    base0 = {
      soleil: [G.soleil.intensity, G.soleil.color.getHex(), G.soleil.position.clone()], hemi: [G.hemi.intensity, G.hemi.color.getHex(), G.hemi.groundColor.getHex()],
      app: G.appliques.map(l => l.intensity), spot: G.spot578.intensity, expo: renderer.toneMappingExposure,
      fog: [scene.fog.color.getHex(), scene.fog.density], fond: scene.background.getHex(),
      ver: M.verriere.emissiveIntensity, vit: M.vitrage.emissiveIntensity, or: [M.or.envMapIntensity, M.or.roughness], cai: M.caisson.envMapIntensity
    };
  }
  function restaurer() {
    const b = base0;
    G.soleil.intensity = b.soleil[0]; G.soleil.color.setHex(b.soleil[1]); G.soleil.position.copy(b.soleil[2]);
    G.hemi.intensity = b.hemi[0]; G.hemi.color.setHex(b.hemi[1]); G.hemi.groundColor.setHex(b.hemi[2]);
    G.appliques.forEach((l, i) => l.intensity = b.app[i]); G.spot578.intensity = b.spot; renderer.toneMappingExposure = b.expo;
    scene.fog.color.setHex(b.fog[0]); scene.fog.density = b.fog[1]; scene.background = new THREE.Color(b.fond);
    M.verriere.emissiveIntensity = b.ver; M.vitrage.emissiveIntensity = b.vit; M.or.envMapIntensity = b.or[0]; M.or.roughness = b.or[1]; M.caisson.envMapIntensity = b.cai;
    if (G.lustres) G.lustres.visible = false;
    platre(false); G.plafond.visible = true; G.faisceaux.visible = true;
  }
  function lustres() {
    if (G.lustres) return G.lustres;
    const g = new THREE.Group(), n = 150, b = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0xFFE6B8, toneMapped: false }), n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const a = rad(-14 + i * (208 / (n - 1))); o.position.set(20.22 * Math.cos(a), 12.5, 20.22 * Math.sin(a)); o.updateMatrix(); b.setMatrixAt(i, o.matrix); }
    g.add(b);
    for (const a of [-10, 15, 40, 65, 90, 115, 140, 165, 190]) { const l = new THREE.PointLight(0xffc98a, 1.25, 30, 2), ar = rad(a); l.position.set(17.5 * Math.cos(ar), 11.6, 17.5 * Math.sin(ar)); g.add(l); }
    for (const x of [-9, 0, 9]) { const l = new THREE.PointLight(0xffd29a, 0.9, 16, 2); l.position.set(x, 9, -5.2); g.add(l); }
    scene.add(g); G.lustres = g; return g;
  }
  let cache = null;
  function platre(on) {
    if (!M.pl) {
      const std = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, envMapIntensity: 0.35 });
      M.pl = { a: std(0xEEEBE5, 0.92), siege: std(0xE0DBD2, 0.95), haut: std(0xF6F4F0, 0.88), sol: std(0xE6E2DA, 0.96), mos: std(0xE9E5DE, 0.9) };
    }
    if (!cache) { // inventaire des pièces à couper pour la maquette (au-dessus des gradins) et à garder
      cache = { couper: [], mur: null };
      scene.traverse(o => {
        if (!o.isMesh || o === G.fil) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (mats.includes(M.mur)) cache.mur = o;
        const haut = [M.galerie, M.stuc, M.balustre, M.entablement].some(x => mats.includes(x));
        let y = 0; if (!o.isInstancedMesh) { o.geometry.computeBoundingSphere(); y = o.localToWorld(o.geometry.boundingSphere.center.clone()).y; }
        if (haut || (mats.includes(M.or) && y > 6)) cache.couper.push(o);
      });
      cache.couper.push(I.fut, I.base, I.chap);
    }
    const garder = new Set(); if (G.c578) G.c578.children.forEach(c => { if (c.material === M.velours) garder.add(c); });
    const choix = m => m === M.velours ? M.pl.siege : (m === M.plateau || m === M.noyerClair) ? M.pl.haut : m === M.moquette ? M.pl.sol : m === M.mosaique ? M.pl.mos : (m === M.voyant || m === M.lueur || m === M.faisceau) ? m : M.pl.a;
    scene.traverse(o => {
      if (!o.isMesh || o === G.fil || (G.perso && o.parent === G.perso) || o.parent === G.jum || (G.lustres && o.parent === G.lustres)) return;
      if (o.userData.m0 === undefined) o.userData.m0 = o.material;
      if (!on || garder.has(o)) { o.material = o.userData.m0; return; }
      o.material = Array.isArray(o.userData.m0) ? o.userData.m0.map(choix) : choix(o.userData.m0);
    });
    for (const o of cache.couper) o.visible = !on;
    if (cache.mur) { cache.mur.scale.y = on ? 0.3 : 1; cache.mur.position.y = on ? 2.1 : 7; }
    const sol = G.racine.children[0]; sol.scale.setScalar(on ? 8 : 1);
  }
  function ambiance(nom) {
    if (!base0) memoriser();
    restaurer();
    if (nom === 'documentaire') {
      G.soleil.color.setHex(0xFFF0DC); G.soleil.intensity = 2.25; G.hemi.color.setHex(0xEDE6DC); G.hemi.groundColor.setHex(0x3a2c24); G.hemi.intensity = 0.55;
      G.appliques.forEach(l => l.intensity *= 0.6); scene.fog.color.setHex(0x786a5c); scene.fog.density = 0.006; renderer.toneMappingExposure = 1.0; G.faisceaux.visible = false;
    } else if (nom === 'verdict') {
      G.soleil.intensity = 0.75; G.soleil.color.setHex(0xffcf9a); G.hemi.intensity = 0.22; G.appliques.forEach(l => l.intensity *= 2.6);
      lustres().visible = true; M.verriere.emissiveIntensity = 0.55; M.vitrage.emissiveIntensity = 0.55; M.or.envMapIntensity = 2.1; M.or.roughness = 0.55; M.caisson.envMapIntensity = 1.7;
      renderer.toneMappingExposure = 1.15; scene.fog.color.setHex(0x3e2618); scene.fog.density = 0.007; G.faisceaux.visible = false;
    } else if (nom === 'platre') {
      platre(true); G.plafond.visible = false; G.faisceaux.visible = false;
      G.soleil.color.setHex(0xfffaf2); G.soleil.intensity = 2.7; G.soleil.position.set(-22, 40, 26);
      G.hemi.color.setHex(0xffffff); G.hemi.groundColor.setHex(0xc9c3b9); G.hemi.intensity = 0.72;
      G.appliques.forEach(l => l.intensity = 0); G.spot578.intensity = 0; renderer.toneMappingExposure = 0.9;
      scene.background = new THREE.Color(0xEDEBE6); scene.fog.color.setHex(0xEDEBE6); scene.fog.density = 0.016;
    }
    renderer.shadowMap.needsUpdate = true; demander();
  }
  function voyantsListe(liste, echelle, eteint) {
    const noir = new THREE.Color(eteint != null ? eteint : 0x1d1714), z = new THREE.Color(0, 0, 0), c = new THREE.Color();
    sieges.forEach((s, k) => {
      const v = liste ? liste[k] : null; allumes[k] = !!v;
      if (v) { c.setHex(COUL[v]); I.voyant.setColorAt(k, c); I.lueur.setColorAt(k, c); } else { I.voyant.setColorAt(k, noir); I.lueur.setColorAt(k, z); }
    });
    if (echelle) echV = echelle;
    I.voyant.instanceColor.needsUpdate = true; I.lueur.instanceColor.needsUpdate = true; poserVoyants(); demander();
  }
  function projeter(points) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return points.map(p => { const v = new THREE.Vector3(...p).project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, devant: v.z < 1 }; });
  }

  /* ---------------- Rendu à la demande ---------------- */
  function demander() { if (demande) return; demande = true; requestAnimationFrame(() => { demande = false; rendre(); }); }
  function rendre() { renderer.render(scene, camera); if (surRendu) surRendu(); }
  function redimensionner() {
    if (!renderer) return;
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    const tel = w < 520;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tel ? 2 : 1.75));
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const c = cadrage(vueCourante, w / h); if (!anim) { cam.pos = c.pos; cam.cible = c.cible; cam.fov = c.fov; cam.haut = c.haut || [0, 1, 0]; }
    appliquerCam(); demander();
  }

  function init(cv, opt = {}) {
    canvas = cv;
    if (typeof THREE === 'undefined') throw new Error('three');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opt.capture });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    G.ombre = opt.ombre || 4096;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    matieres(); construire(); eclairer();
    const c = cadrage('salle', canvas.clientWidth / Math.max(1, canvas.clientHeight)); cam.pos = c.pos; cam.cible = c.cible; cam.fov = c.fov;
    redimensionner(); renderer.shadowMap.needsUpdate = true; rendre();
    return { sieges: sieges.length, rangs: G.rangs.map(r => r.n), ms: Math.round(M._ms) };
  }

  return {
    init, vue, entree, terminerAnim, voyants, redimensionner, demander, P, repartition,
    get echantillons() { return ech; },
    mesure() { const t = performance.now(); rendre(); renderer.getContext().finish(); return Math.round(performance.now() - t); },
    infos() { const i = renderer.info; return { appels: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, programmes: i.programs.length }; },
    get vueCourante() { return vueCourante; },
    set surRendu(f) { surRendu = f; },
    get sieges() { return sieges; }, get rangs() { return G.rangs; },
    camLibre, trouverSiege, placer578, positionSiege, jumeau, personnage, ambiance, voyantsListe, projeter,
    get _int() { return { scene, camera, renderer, M, G, I }; }
  };
})();
