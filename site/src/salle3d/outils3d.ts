// Les utilitaires de géométrie de la salle 3D (repris de room.js), communs à la scène (scene.ts) et
// au décor (decor.ts).
import * as THREE from 'three';

export const rad = (d: number) => (d * Math.PI) / 180;

/** Remet chaque triangle dans le bon sens d'après la normale fournie. */
export function corrigeSens(g: THREE.BufferGeometry) {
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
export function balayage(profil: [number, number][], th0: number, th1: number, opt: OptBalayage = {}) {
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
export function boiteRonde(w: number, h: number, d: number, r: number, s = 3) {
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
export function fusion(liste: [THREE.BufferGeometry, THREE.Matrix4 | null][]) {
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
export const mat4 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) => {
  const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.setScalar(s); o.updateMatrix(); return o.matrix.clone();
};
