/* ============================================================
   LA SALLE — Three.js r128 (sans module), rendu à la demande
   Copie du prototype docs/salle-3d/room.js (projet), allégée pour l'étude
   « verdict, salle éteinte » : personnage et plâtre retirés, géométrie,
   matières et lumières inchangées.
   ============================================================ */
const SALLE = (() => {
  'use strict';
  const P = {
    R0: 6.4, D: 1.08, H: 0.36, NR: 13, TH0: 6, TH1: 174,
    ALLEES: [33, 61.5, 90, 118.5, 147], ALLEE: 1.05,
    RCOL: 21.0, YTOP: 13 * 0.36, YENT: 12.6, YCOR: 13.8, RDOME: 23.0, KDOME: 0.42, ZFOND: -6.5
  };
  const rad = d => d * Math.PI / 180;
  let renderer, scene, camera, canvas, pmrem;
  const M = {}, G = {}, I = {};
  let sieges = [], demande = false, surRendu = null;
  const cam = { pos: null, cible: null, fov: 50, haut: [0, 1, 0] };

  function tex(canvas, opt = {}) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (opt.srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = opt.aniso || 8;
    if (opt.repeat) t.repeat.set(opt.repeat[0], opt.repeat[1]);
    return t;
  }
  function clone(t, rx, ry) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; }

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

  function matieres() {
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
      vel: tex(enGris(vel.c)), velH: tex(vel.h, { srgb: false }), // velours neutre : le rouge vient de la couleur d'instance

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
    G.T = T;

    const vernis = { clearcoat: 0.55, clearcoatRoughness: 0.28 };
    M.noyer = new THREE.MeshPhysicalMaterial({ map: T.bois, bumpMap: T.boisH, bumpScale: 0.012, roughnessMap: T.boisR, roughness: 1, metalness: 0, ...vernis, envMapIntensity: 0.9 });
    M.noyerClair = new THREE.MeshPhysicalMaterial({ map: T.boisClair, bumpMap: T.boisH, bumpScale: 0.01, roughness: 0.55, ...vernis, envMapIntensity: 0.9 });
    M.plateau = new THREE.MeshPhysicalMaterial({ map: T.bois, color: 0x9c8474, bumpMap: T.boisH, bumpScale: 0.008, roughnessMap: T.boisR, roughness: 1, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.7 });
    M.panneau = new THREE.MeshPhysicalMaterial({ map: T.pan, bumpMap: T.panH, bumpScale: 0.03, roughness: 0.5, ...vernis, envMapIntensity: 0.8 });
    M.velours = new THREE.MeshPhysicalMaterial({ map: T.vel, bumpMap: T.velH, bumpScale: 0.004, roughness: 0.92, metalness: 0, envMapIntensity: 0.3 });
    M.velours.onBeforeCompile = sh => { // reflet rasant, dans la couleur du siège (rouge, ou couleur du vote)
      sh.fragmentShader = sh.fragmentShader.replace('#include <tonemapping_fragment>',
        'float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);\n gl_FragColor.rgb += diffuseColor.rgb * fr * 1.5;\n#include <tonemapping_fragment>');
    };
    G.rouge = new THREE.Color(ROUGE).convertSRGBToLinear();
    M.veloursRouge = M.velours.clone(); M.veloursRouge.onBeforeCompile = M.velours.onBeforeCompile; M.veloursRouge.color = G.rouge.clone();
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
  }

  /* Velours en niveaux de gris : on garde la matière (moire, fibre), la teinte est donnée siège par siège. */
  const ROUGE = 0x6e0d19;
  function enGris(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const v = Math.min(255, a[i] * 2.35); a[i] = a[i + 1] = a[i + 2] = v; }
    g.putImageData(d, 0, 0); return c;
  }

  function lueurCanvas() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c;
  }

  function construire() {
    const racine = new THREE.Group(); scene.add(racine);
    const ombre = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };

    const sol = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), M.sol); sol.rotation.x = -Math.PI / 2; sol.position.set(0, -0.01, 10); racine.add(ombre(sol, false));
    const mos = new THREE.Mesh(new THREE.PlaneGeometry(18, 14.4), M.mosaique); mos.rotation.x = -Math.PI / 2; mos.position.set(0, 0.002, 0); racine.add(ombre(mos, false));

    const gr = new THREE.Group();
    for (let i = 0; i < P.NR; i++) {
      const rd = P.R0 + i * P.D, y0 = i * P.H, y1 = (i + 1) * P.H;
      const prof = [[rd, y0], [rd, y1], [rd, y1], [rd + P.D, y1]];
      gr.add(ombre(new THREE.Mesh(balayage(prof, P.TH0 - 1.5, P.TH1 + 1.5, { mats: [0, 0, 1], inverse: true, echelle: 1.4 }), [M.noyer, M.moquette])));
    }
    const rTop = P.R0 + P.NR * P.D;
    gr.add(ombre(new THREE.Mesh(balayage([[rTop, P.YTOP], [25, P.YTOP]], -16, 196, { inverse: true, echelle: 2 }), M.moquette), false));
    racine.add(gr);

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
        for (const a of [a0, a1]) {
          const j = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.86, 0.05), M.noyer);
          const ar = rad(a), rm = rd + 0.2;
          j.position.set(rm * Math.cos(ar), y + 0.43, rm * Math.sin(ar)); j.rotation.y = -ar;
          racine.add(ombre(j));
        }
      }
    }
    for (const a of P.ALLEES) for (let i = 1; i < P.NR; i++) {
      const rd = P.R0 + i * P.D, y = i * P.H + P.H / 2, w = P.ALLEE / rd * 180 / Math.PI;
      racine.add(ombre(new THREE.Mesh(balayage([[rd - 0.42, i * P.H], [rd - 0.42, y], [rd - 0.42, y], [rd, y]], a - w / 2, a + w / 2, { mats: [0, 0, 1], inverse: true }), [M.noyer, M.moquette])));
    }
    for (const a of [P.TH0 - 1.5, P.TH1 + 1.5]) {
      for (let i = 0; i < P.NR; i++) {
        const rd = P.R0 + i * P.D, hh = (i + 1) * P.H + 1.0, ar = rad(a);
        const b = new THREE.Mesh(new THREE.BoxGeometry(P.D + 0.02, hh, 0.22), M.panneau);
        const rm = rd + P.D / 2; b.position.set(rm * Math.cos(ar), hh / 2, rm * Math.sin(ar)); b.rotation.y = -ar;
        racine.add(ombre(b));
        const c = new THREE.Mesh(new THREE.BoxGeometry(P.D + 0.04, 0.06, 0.28), M.laiton);
        c.position.set(rm * Math.cos(ar), hh + 0.03, rm * Math.sin(ar)); c.rotation.y = -ar; racine.add(c);
      }
    }
    racine.add(ombre(new THREE.Mesh(balayage([[P.R0 - 0.05, 0.98 + P.H - 0.12], [P.R0 - 0.05, 1.0 + P.H - 0.12]], P.TH0, P.TH1, { echelle: 1 }), M.laiton), false));

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
    G.velG = velG; G.boisG = boisG;
    const n = liste.length;
    I.velours = ombre(new THREE.InstancedMesh(velG, M.velours, n));
    I.bois = ombre(new THREE.InstancedMesh(boisG, M.noyer, n));
    I.plaque = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.008, 0.045), M.laiton, n);
    I.bague = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.032, 0.012, 20), M.laiton, n);
    I.voyant = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.voyant, n);
    const o = new THREE.Object3D(), pente = Math.atan(0.14 / 0.47), noir = new THREE.Color(0x1d1714);
    G.mVoyant = []; G.mSiege = [];
    liste.forEach((s, k) => {
      const x = s.r * Math.cos(s.th), z = s.r * Math.sin(s.th), yaw = Math.atan2(-x, -z);
      s.yaw = yaw;
      o.position.set(x, s.y, z); o.rotation.set(0, yaw, 0); o.scale.setScalar(1); o.updateMatrix();
      I.velours.setMatrixAt(k, o.matrix); I.bois.setMatrixAt(k, o.matrix); G.mSiege.push(o.matrix.clone());
      const surDesk = (r, lat) => {
        const yy = s.y + 0.86 - (r - (s.rd - 0.03)) * (0.14 / 0.47) + 0.004;
        const lx = Math.cos(s.th + Math.PI / 2) * lat, lz = Math.sin(s.th + Math.PI / 2) * lat;
        o.position.set(r * Math.cos(s.th) + lx, yy, r * Math.sin(s.th) + lz); o.rotation.set(-pente, yaw, 0, 'YXZ');
      };
      surDesk(s.rd + 0.3, 0); o.updateMatrix(); I.plaque.setMatrixAt(k, o.matrix);
      surDesk(s.rd + 0.13, -0.17); o.updateMatrix(); I.bague.setMatrixAt(k, o.matrix);
      o.position.set((s.rd - 0.015) * Math.cos(s.th), s.y + 0.862, (s.rd - 0.015) * Math.sin(s.th)); o.rotation.set(0, yaw, 0); o.updateMatrix();
      I.voyant.setMatrixAt(k, o.matrix); I.voyant.setColorAt(k, noir);
      G.mVoyant.push({ p: o.position.clone(), q: o.quaternion.clone() });
      I.velours.setColorAt(k, G.rouge); // velours rouge par défaut, couleur du vote au dévoilement
    });
    I.velours.instanceColor.needsUpdate = true;
    for (const k of ['velours', 'bois', 'plaque', 'bague', 'voyant']) racine.add(I[k]);

    const fut = new THREE.CylinderGeometry(0.46, 0.5, 1, 32, 1, true);
    const nCol = 15, colPos = [];
    for (let k = 0; k < nCol; k++) { const a = rad(P.TH0 + k * (P.TH1 - P.TH0) / (nCol - 1)); colPos.push([P.RCOL * Math.cos(a), P.RCOL * Math.sin(a), P.YTOP, P.YENT - P.YTOP]); }
    // mur du perchoir : deux paires de colonnes posées sur le soubassement en marbre, de part et d'autre de la tapisserie et des niches
    for (const x of [-8.9, -5.5, 5.5, 8.9]) colPos.push([x, P.ZFOND + 0.62, 5.15, 6.05]);
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

    const aMur = [-15.4, 195.4];
    const baie = 24.6 * rad((P.TH1 - P.TH0) / (nCol - 1));
    racine.add(ombre(new THREE.Mesh(balayage([[24.6, P.YTOP], [24.6, P.YCOR]], aMur[0], aMur[1], { echelle: baie, rRef: 24.6, vNorm: true, inverse: true }), M.galerie), false));
    M.galerie.map.repeat.set(1, 1); M.galerie.map.offset.set(0.5 - (rad(P.TH0) * 24.6 / baie) % 1, 0);
    racine.add(ombre(new THREE.Mesh(balayage([[21.7, 8.2], [24.6, 8.2]], aMur[0], aMur[1], { inverse: false }), M.stuc), false));
    racine.add(ombre(new THREE.Mesh(balayage([[21.7, 8.0], [21.7, 8.3], [21.6, 8.3]], aMur[0], aMur[1], { inverse: true }), M.or), false));
    const bal = new THREE.Mesh(balayage([[21.62, 8.3], [21.62, 9.25]], aMur[0], aMur[1], { echelle: 1, rRef: 21.62 }), M.balustre);
    M.balustre.map.repeat.set(0.625, 1 / 0.95); M.balustre.bumpMap.repeat.set(0.625, 1 / 0.95);
    racine.add(bal);
    const profEnt = [[20.55, P.YENT], [20.55, 13.2], [20.4, 13.25], [20.4, 13.55], [20.1, 13.65], [20.0, P.YCOR], [P.RDOME, P.YCOR]];
    const ent = new THREE.Mesh(balayage(profEnt, aMur[0], aMur[1], { inverse: true, echelle: 1.2, mats: [0, 1, 0, 1, 1, 2] }), [M.entablement, M.or, M.stuc]);
    for (const k of ['map', 'bumpMap', 'metalnessMap']) M.entablement[k].repeat.set(0.2, 0.96);
    racine.add(ombre(ent));
    racine.add(ombre(new THREE.Mesh(balayage([[20.55, P.YENT], [24.6, P.YENT]], aMur[0], aMur[1]), M.stuc), false));

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

    const mur = new THREE.Mesh(new THREE.PlaneGeometry(48, 14), M.mur); mur.position.set(0, 7, P.ZFOND); racine.add(ombre(mur, false));
    const tympan = new THREE.Mesh(new THREE.CircleGeometry(1, 64, 0, Math.PI), M.stuc); tympan.scale.set(P.RDOME, P.RDOME * P.KDOME, 1); tympan.position.set(0, P.YCOR, P.ZFOND + 0.01); racine.add(tympan);

    const boite = (w, h, d, x, y, z, faces) => { const m = new THREE.Mesh(boiteRonde(w, h, d, 0.03, 2), faces); m.position.set(x, y, z); return ombre(m); };
    const facesT = [M.noyer, M.noyer, M.noyerClair, M.noyer, M.facT, M.noyer];
    const bt = new THREE.BoxGeometry(2.4, 1.18, 1.1); const tribune = new THREE.Mesh(bt, facesT); tribune.position.set(0, 0.59, -0.9); racine.add(ombre(tribune));
    racine.add(boite(2.6, 0.08, 1.25, 0, 1.22, -0.9, M.marbre));
    const pup = boite(1.3, 0.1, 0.55, 0, 1.38, -0.85, M.noyer); pup.rotation.x = 0.25; racine.add(pup);
    racine.add(boite(1.34, 0.03, 0.04, 0, 1.43, -0.58, M.laiton));
    const bureau = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.2, 1.5), [M.noyer, M.noyer, M.noyerClair, M.noyer, M.facB, M.noyer]); bureau.position.set(0, 0.6, -2.4); racine.add(ombre(bureau));
    racine.add(boite(9.6, 0.07, 1.6, 0, 1.235, -2.4, M.marbre));
    const facesB = [M.noyer, M.noyer, M.noyerClair, M.noyer, M.facP, M.noyer];
    const perch = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 1.7), facesB); perch.position.set(0, 1.2, -4.0); racine.add(ombre(perch));
    racine.add(boite(5.8, 0.08, 1.8, 0, 2.44, -4.0, M.marbre));
    racine.add(boite(3.6, 0.95, 0.8, 0, 2.95, -4.1, M.panneau));
    racine.add(boite(3.7, 0.05, 0.9, 0, 3.45, -4.1, M.noyerClair));
    racine.add(boite(13, 2.44, 2.6, 0, 1.22, -5.25, M.noyer));
    const fauteuil = new THREE.Group();
    fauteuil.add(ombre(new THREE.Mesh(velG, M.veloursRouge)), ombre(new THREE.Mesh(boisG, M.noyer)));
    fauteuil.scale.setScalar(1.35); fauteuil.position.set(0, 2.48, -4.75); racine.add(fauteuil);
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) {
      racine.add(boite(1.1, 0.34 * (k + 1), 0.3, s * 3.45, 0.17 * (k + 1), -3.2 - k * 0.24, M.marbre));
    }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) racine.add(boite(2.2, 0.08, 0.6, s * 5.6, 0.04 + k * 0.4, -2.0 - k * 0.6, M.statuaire));

    G.c578 = new THREE.Group();
    G.c578.add(ombre(new THREE.Mesh(velG, M.veloursRouge)), ombre(new THREE.Mesh(boisG, M.noyer)));
    const p578 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.012), M.p578); p578.position.set(0, 0.9, -0.36); p578.rotation.set(-0.17, Math.PI, 0); G.c578.add(p578);
    G.c578.position.set(2.15, 0, 0.9); G.c578.rotation.y = -0.35; racine.add(G.c578);

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

  function eclairer() {
    const soleil = new THREE.DirectionalLight(0xffdcaa, 2.4);
    soleil.position.set(9, 50, -12); soleil.target.position.set(0, 0, 7);
    soleil.castShadow = true;
    const sc = soleil.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 90;
    soleil.shadow.mapSize.set(G.ombre || 4096, G.ombre || 4096); soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.03;
    scene.add(soleil, soleil.target); G.soleil = soleil;
    G.hemi = new THREE.HemisphereLight(0xffe2b8, 0x3a170f, 0.42); scene.add(G.hemi);
    G.appliques = [];
    for (const a of [20, 60, 90, 120, 160]) {
      const l = new THREE.PointLight(0xffb36b, 0.55, 18, 2); const ar = rad(a);
      l.position.set(19 * Math.cos(ar), 9.5, 19 * Math.sin(ar)); scene.add(l); G.appliques.push(l);
    }
    const fond = new THREE.PointLight(0xffc27a, 0.8, 16, 2); fond.position.set(0, 7, -3); scene.add(fond); G.appliques.push(fond);
    const spot = new THREE.SpotLight(0xffe0a8, 1.4, 14, 0.32, 0.6, 1.5); spot.position.set(2.6, 9, 3.2); spot.target = G.c578; scene.add(spot); G.spot578 = spot;
    const envTex = new THREE.CanvasTexture(MAT.environnement()); envTex.mapping = THREE.EquirectangularReflectionMapping; envTex.encoding = THREE.sRGBEncoding;
    pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromEquirectangular(envTex).texture; envTex.dispose();
    scene.background = new THREE.Color(0x1a0f09);
    scene.fog = new THREE.FogExp2(0x6b4a30, 0.0085);
    // lustres (ambiance verdict du prototype)
    const g = new THREE.Group(), nb = 150;
    const b = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0xFFE6B8, toneMapped: false }), nb);
    const o = new THREE.Object3D();
    for (let i = 0; i < nb; i++) { const a = rad(-14 + i * (208 / (nb - 1))); o.position.set(20.22 * Math.cos(a), 12.5, 20.22 * Math.sin(a)); o.updateMatrix(); b.setMatrixAt(i, o.matrix); }
    g.add(b); G.ampoules = b;
    G.lustresL = [];
    for (const a of [-10, 15, 40, 65, 90, 115, 140, 165, 190]) { const l = new THREE.PointLight(0xffc98a, 1.25, 30, 2), ar = rad(a); l.position.set(17.5 * Math.cos(ar), 11.6, 17.5 * Math.sin(ar)); g.add(l); G.lustresL.push(l); }
    for (const x of [-9, 0, 9]) { const l = new THREE.PointLight(0xffd29a, 0.9, 16, 2); l.position.set(x, 9, -5.2); g.add(l); G.lustresL.push(l); }
    scene.add(g); G.lustres = g;
  }

  /* ---------------- Caméras : la salle (perspective) et le dessus ---------------- */
  // Réglages du visiteur, appliqués par-dessus le cadrage de base de chaque vue.
  const libre = { lacet: 0, tangage: 0, zoom: 1, dx: 0, dz: 0 };
  function cadrageBase(nom, aspect) {
    const portrait = aspect < 0.9;
    if (nom === 'dessus') {
      // Comme la visite virtuelle de l'Assemblée : caméra au-dessus de l'hémicycle, regard vertical, tribune en bas.
      // En portrait, la salle est couchée (tribune à gauche) : l'hémicycle occupe la hauteur de l'écran, les sièges sont plus grands.
      const fov = 50, tv = Math.tan(rad(fov / 2)), couche = aspect < 0.8;
      const L = 21.9, Pf = 13.8, zc = 7.4, yRef = P.YTOP + 1.0; // demi-largeur (dossier), demi-profondeur (perchoir → dossier), centre, haut des gradins
      const d = couche ? Math.max(Pf / (tv * aspect), L / tv) : Math.max(L / (tv * aspect), Pf / tv);
      return { pos: [0, yRef + d, zc], cible: [0, 0, zc], fov, haut: couche ? [1, 0, 0] : [0, 0, 1], dessus: true, yRef };
    }
    if (nom === 'perchoir') // depuis le haut des gradins, face au perchoir, à la tribune et au mur de la tapisserie
      return portrait ? { pos: [0, 9.6, 18.6], cible: [0, 6.0, -6.5], fov: 78 } : { pos: [0, 8.9, 19.2], cible: [0, 6.3, -6.5], fov: 58 };
    return portrait ? { pos: [0, 9.6, -6.2], cible: [0, 6.4, 10], fov: 80 } : { pos: [0, 7.0, -6.4], cible: [0, 5.5, 11], fov: 64 };
  }
  function cadrage(nom, aspect) {
    const c = cadrageBase(nom, aspect);
    if (c.dessus) {
      // zoom = la caméra descend ; glisser = la caméra se déplace au-dessus de la salle
      const h = c.yRef + (c.pos[1] - c.yRef) / libre.zoom, x = libre.dx, z = c.cible[2] + libre.dz;
      return { pos: [x, h, z], cible: [x, 0, z], fov: c.fov, haut: c.haut };
    }
    // perspective : on tourne autour du point regardé, sans sortir de la salle
    const v = [c.pos[0] - c.cible[0], c.pos[1] - c.cible[1], c.pos[2] - c.cible[2]];
    const r = Math.hypot(...v) / libre.zoom, az = Math.atan2(v[0], v[2]) + rad(libre.lacet);
    const el = Math.max(rad(-4), Math.min(rad(48), Math.asin(v[1] / Math.hypot(...v)) + rad(libre.tangage)));
    const pos = [c.cible[0] + r * Math.cos(el) * Math.sin(az), c.cible[1] + r * Math.sin(el), c.cible[2] + r * Math.cos(el) * Math.cos(az)];
    return { pos, cible: c.cible, fov: c.fov, haut: [0, 1, 0] };
  }
  function appliquerCam() {
    camera.fov = cam.fov; camera.position.set(...cam.pos); camera.up.set(...(cam.haut || [0, 1, 0])).normalize();
    camera.lookAt(...cam.cible); camera.updateProjectionMatrix();
  }
  let vueCourante = 'salle', anim = null;
  function etatVue(nom) {
    const dessus = nom === 'dessus';
    G.plafond.visible = !dessus; G.faisceaux.visible = false;
    if (G.etage) G.etage.visible = true;
    scene.fog.density = dessus ? 0.0012 : 0.007;
    G.soleil.intensity = dessus ? 2.0 : 2.4; renderer.toneMappingExposure = dessus ? 0.97 : 1.05;
    // vue du dessus : les lustres éclairent moins le sol autour de la tribune (sinon le marbre brûle en blanc)
    for (const l of (G.lustresL || [])) { if (l.userData.i0 === undefined) l.userData.i0 = l.intensity; l.intensity = l.userData.i0 * (dessus ? 0.35 : 1); }
    renderer.shadowMap.needsUpdate = true;
  }
  function vue(nom, opt = {}) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    if (nom !== vueCourante) { libre.lacet = 0; libre.tangage = 0; libre.zoom = 1; libre.dx = 0; libre.dz = 0; }
    const c = cadrage(nom, aspect); const depuis = { pos: cam.pos ? cam.pos.slice() : null, cible: cam.cible ? cam.cible.slice() : null, fov: cam.fov, haut: (cam.haut || [0, 1, 0]).slice() };
    vueCourante = nom;
    if (anim) cancelAnimationFrame(anim);
    if (nom === 'dessus') { G.plafond.visible = false; renderer.shadowMap.needsUpdate = true; } // la coupole s'efface avant que la caméra la traverse
    if (opt.instant || !depuis.pos) {
      cam.pos = c.pos; cam.cible = c.cible; cam.fov = c.fov; cam.haut = c.haut; etatVue(nom); appliquerCam(); demander(); return Promise.resolve();
    }
    const duree = opt.duree || 1400, t0 = performance.now();
    const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return new Promise(res => {
      const pas = now => {
        const t = Math.min(1, (now - t0) / duree), e = ease(t);
        cam.pos = lerp(depuis.pos, c.pos, e); cam.cible = lerp(depuis.cible, c.cible, e); cam.fov = depuis.fov + (c.fov - depuis.fov) * e;
        // le haut de la caméra bascule doucement vers la tribune pendant la montée
        cam.haut = lerp(depuis.haut, c.haut, Math.min(1, e * 1.4));
        if (Math.hypot(...cam.haut) < 0.2) cam.haut = c.haut;
        appliquerCam(); rendre();
        if (t < 1) anim = requestAnimationFrame(pas); else { anim = null; etatVue(nom); demander(); res(); }
      };
      anim = requestAnimationFrame(pas);
    });
  }
  function regler(r) {
    Object.assign(libre, r);
    libre.zoom = Math.max(0.75, Math.min(vueCourante === 'dessus' ? 2.2 : 1.35, libre.zoom));
    libre.lacet = Math.max(-38, Math.min(38, libre.lacet)); libre.tangage = Math.max(-12, Math.min(22, libre.tangage));
    libre.dx = Math.max(-14, Math.min(14, libre.dx)); libre.dz = Math.max(-9, Math.min(9, libre.dz));
    if (anim) return;
    const c = cadrage(vueCourante, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    cam.pos = c.pos; cam.cible = c.cible; cam.fov = c.fov; cam.haut = c.haut; appliquerCam(); demander();
  }

  function placer578(k, cote) {
    const s = sieges[k], b = [P.TH0, ...P.ALLEES, P.TH1];
    const a = rad(cote === 'debut' ? b[s.secteur] : b[s.secteur + 1]);
    const x = s.r * Math.cos(a), z = s.r * Math.sin(a);
    G.c578.position.set(x, s.y, z); G.c578.rotation.set(0, Math.atan2(-x, -z), 0);
    G.spot578.position.set(x * 0.92, s.y + 6.5, z * 0.92);
    renderer.shadowMap.needsUpdate = true; demander();
    return [x, s.y, z];
  }

  function demander() { if (demande) return; demande = true; requestAnimationFrame(() => { demande = false; rendre(); }); }
  let rendreAvec = null;
  function rendre() { if (rendreAvec) rendreAvec(); else renderer.render(scene, camera); if (surRendu) surRendu(); }
  function redimensionner() {
    if (!renderer) return;
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 520 ? 2 : 1.75));
    renderer.setSize(w, h, false); camera.aspect = w / h;
    if (!anim) { const c = cadrage(vueCourante, w / h); cam.pos = c.pos; cam.cible = c.cible; cam.fov = c.fov; cam.haut = c.haut || [0, 1, 0]; }
    appliquerCam(); demander();
  }

  function init(cv, opt = {}) {
    canvas = cv;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opt.capture });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    G.ombre = opt.ombre || 4096;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    matieres(); construire(); eclairer();
    if (opt.avantRendu) opt.avantRendu();
    redimensionner(); renderer.shadowMap.needsUpdate = true; rendre();
    return { sieges: sieges.length };
  }

  return {
    init, vue, regler, redimensionner, demander, rendre, placer578, P,
    get libre() { return libre; },
    outils: { balayage, boiteRonde, fusion, mat4: (...a) => mat4(...a), tex, clone, rad },
    get sieges() { return sieges; }, get rangs() { return G.rangs; },
    set surRendu(f) { surRendu = f; }, set rendreAvec(f) { rendreAvec = f; },
    get vueCourante() { return vueCourante; },
    get _int() { return { scene, camera, renderer, M, G, I, THREE }; }
  };
})();
