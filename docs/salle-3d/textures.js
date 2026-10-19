/* ============================================================
   MATIÈRES — tout est généré par le code (aucune image externe)
   bruit de valeur périodique + fbm, puis peinture au canevas
   ============================================================ */
const MAT = (() => {
  'use strict';

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const h2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const mix = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function bruit(seed) {
    const N = 256, g = new Float32Array(N * N), r = rng(seed);
    for (let i = 0; i < g.length; i++) g[i] = r();
    function n(x, y, px, py) {
      px = px || N; py = py || N;
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const x0 = ((xi % px) + px) % px, y0 = ((yi % py) + py) % py;
      const x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
      const a = g[y0 * N + x0], b = g[y0 * N + x1], c = g[y1 * N + x0], d = g[y1 * N + x1];
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function fbm(x, y, oct, px, py) {
      let s = 0, a = 0.5, f = 1, t = 0;
      for (let o = 0; o < oct; o++) {
        s += a * n(x * f, y * f, px ? Math.min(256, px * f) : 0, py ? Math.min(256, py * f) : 0);
        t += a; a *= 0.5; f *= 2;
      }
      return s / t;
    }
    return { n, fbm };
  }

  const memo = new Map();
  const cache = (cle, fn) => { if (!memo.has(cle)) memo.set(cle, fn()); return memo.get(cle); };

  function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* Remplit plusieurs canevas en une passe : couleur (rgb), relief (h), métal (m), rugosité (ro), alpha (a). */
  function peindre(w, h, sorties, fn) {
    const res = {}, bufs = {};
    for (const s of sorties) { res[s] = toile(w, h); bufs[s] = res[s].getContext('2d').createImageData(w, h); }
    const o = { r: 0, g: 0, b: 0, h: 0.5, m: 0, ro: 0.5, a: 1 };
    let k = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      fn(x, y, o);
      if (bufs.c) { const d = bufs.c.data; d[k] = o.r; d[k + 1] = o.g; d[k + 2] = o.b; d[k + 3] = 255; }
      if (bufs.h) { const d = bufs.h.data, v = clamp(o.h, 0, 1) * 255; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
      if (bufs.m) { const d = bufs.m.data, v = clamp(o.m, 0, 1) * 255; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
      if (bufs.ro) { const d = bufs.ro.data, v = clamp(o.ro, 0, 1) * 255; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
      if (bufs.a) { const d = bufs.a.data; d[k] = o.r; d[k + 1] = o.g; d[k + 2] = o.b; d[k + 3] = clamp(o.a, 0, 1) * 255; }
      k += 4;
    }
    for (const s of sorties) res[s].getContext('2d').putImageData(bufs[s], 0, 0);
    return res;
  }

  function ramp(stops, t, o) {
    t = clamp(t, 0, 1);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0] || i === stops.length - 1) {
        const a = stops[i - 1], b = stops[i], u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
        o.r = mix(a[1], b[1], u); o.g = mix(a[2], b[2], u); o.b = mix(a[3], b[3], u); return;
      }
    }
  }

  /* ---------- Noyer et miel (fil horizontal, raccord dans les deux sens) ---------- */
  function noyer(seed = 7, clair = 0) { return cache('noyer' + seed + clair, () => noyerBrut(seed, clair)); }
  function noyerBrut(seed, clair) {
    const W = 1024, H = 512, z = bruit(seed);
    const pal = [[0, 46, 26, 13], [0.3, 70, 41, 20], [0.55, 98, 60, 29], [0.8, 132, 86, 41], [1, 160, 108, 54]];
    return peindre(W, H, ['c', 'h', 'ro'], (x, y, o) => {
      const u = x / W, v = y / H;
      const warp = z.fbm(u * 2, v * 3, 4, 2, 3);
      const fig = v * 22 + warp * 2.6 + z.fbm(u * 4 + 9, v * 6, 3, 4, 6) * 0.7;
      const ring = 0.5 + 0.5 * Math.sin(fig * 6.28318);
      const tardif = Math.pow(ring, 3) * 0.55;
      const fil = z.n(u * 8, v * 128, 8, 128);
      const fil2 = z.n(u * 32 + 3, v * 256, 32, 256);
      const nuage = z.fbm(u * 2 + 5, v * 2 + 5, 3, 2, 2);
      const pore = fil2 > 0.82 ? (fil2 - 0.82) * 2.2 : 0;
      let t = 0.56 + clair + 0.22 * (nuage - 0.5) - 0.26 * tardif + 0.2 * (fil - 0.5) + 0.1 * (fil2 - 0.5) - pore * 0.5;
      ramp(pal, t, o);
      const rouge = (z.n(u * 3 + 20, v * 3, 3, 3) - 0.5) * 14;
      o.r += rouge; o.b -= rouge * 0.4;
      o.h = 0.55 + 0.25 * (fil - 0.5) - 0.18 * tardif - pore * 0.8;
      o.ro = 0.42 + 0.2 * tardif + pore * 0.6;
    });
  }

  /* Panneaux moulurés peints par-dessus le noyer (façades de pupitres, lambris). */
  function panneaux(base, nx, ny, marge) {
    const W = base.c.width, H = base.c.height;
    const c = toile(W, H), h = toile(W, H), cc = c.getContext('2d'), hc = h.getContext('2d');
    cc.drawImage(base.c, 0, 0); hc.drawImage(base.h, 0, 0);
    const pw = W / nx, ph = H / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const x0 = i * pw + marge, y0 = j * ph + marge, w = pw - 2 * marge, hh = ph - 2 * marge;
      // ombre portée de la moulure (haut/gauche) et lumière (bas/droite)
      cc.lineWidth = 7; cc.strokeStyle = 'rgba(20,10,4,.55)'; cc.strokeRect(x0, y0, w, hh);
      cc.lineWidth = 2; cc.strokeStyle = 'rgba(255,214,150,.22)'; cc.strokeRect(x0 + 5, y0 + 5, w - 10, hh - 10);
      cc.lineWidth = 3; cc.strokeStyle = 'rgba(28,14,6,.45)'; cc.strokeRect(x0 + 12, y0 + 12, w - 24, hh - 24);
      const g = cc.createLinearGradient(0, y0, 0, y0 + hh);
      g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,200,140,.06)');
      cc.fillStyle = g; cc.fillRect(x0 + 14, y0 + 14, w - 28, hh - 28);
      hc.lineWidth = 7; hc.strokeStyle = 'rgba(0,0,0,.9)'; hc.strokeRect(x0, y0, w, hh);
      hc.lineWidth = 3; hc.strokeStyle = 'rgba(255,255,255,.7)'; hc.strokeRect(x0 + 5, y0 + 5, w - 10, hh - 10);
      hc.lineWidth = 3; hc.strokeStyle = 'rgba(0,0,0,.6)'; hc.strokeRect(x0 + 12, y0 + 12, w - 24, hh - 24);
    }
    return { c, h, ro: base.ro };
  }

  /* ---------- Velours rouge ---------- */
  function velours(seed = 11) {
    const W = 512, z = bruit(seed);
    return peindre(W, W, ['c', 'h'], (x, y, o) => {
      const u = x / W, v = y / W;
      const moire = z.fbm(u * 4, v * 4, 4, 4, 4);
      const fibre = z.n(u * 128, v * 128, 128, 128);
      const fibre2 = z.n(u * 256 + 7, v * 64, 256, 64);
      const ecrase = z.fbm(u * 2 + v * 1, v * 3, 3, 2, 3);
      const t = 0.82 + 0.26 * (moire - 0.5) + 0.12 * (fibre - 0.5) + 0.08 * (fibre2 - 0.5) - 0.1 * Math.max(0, ecrase - 0.62);
      o.r = 104 * t + 4; o.g = 11 * t + 1; o.b = 19 * t + 2;
      o.h = 0.5 + 0.4 * (fibre - 0.5);
    });
  }

  /* ---------- Moquette des gradins ---------- */
  function moquette(seed = 13) {
    const W = 512, z = bruit(seed);
    return peindre(W, W, ['c', 'h'], (x, y, o) => {
      const u = x / W, v = y / W;
      const laine = z.n(u * 192, v * 192, 192, 192), laine2 = z.n(u * 64 + 4, v * 64, 64, 64);
      const a = Math.abs(((u * 8 + v * 8) % 1) - 0.5), b = Math.abs(((u * 8 - v * 8 + 8) % 1) - 0.5);
      const losange = sstep(0.46, 0.5, Math.max(a, b));
      const t = 0.8 + 0.18 * (laine - 0.5) + 0.12 * (laine2 - 0.5);
      o.r = mix(86, 120, losange * 0.5) * t; o.g = mix(22, 62, losange * 0.4) * t; o.b = mix(24, 36, losange * 0.3) * t;
      o.h = 0.5 + 0.5 * (laine - 0.5);
    });
  }

  /* ---------- Marbres ---------- */
  function marbre(seed = 17, type = 'gris-rose') { return cache('marbre' + seed + type, () => marbreBrut(seed, type)); }
  function marbreBrut(seed, type) {
    const W = 1024, z = bruit(seed);
    return peindre(W, W, ['c', 'h'], (x, y, o) => {
      const u = x / W, v = y / W;
      const turb = z.fbm(u * 3, v * 3, 5, 3, 3);
      const turb2 = z.fbm(u * 6 + 3, v * 6, 4, 6, 6);
      const ve = Math.abs(Math.sin((u * 2 + v * 3 + turb * 2.8) * Math.PI * 2));
      const ve2 = Math.abs(Math.sin((u * 5 - v * 2 + 5 + turb2 * 3.5) * Math.PI * 2));
      const fine = Math.pow(1 - ve, 22), halo = Math.pow(1 - ve, 4), fine2 = Math.pow(1 - ve2, 40);
      const nuage = z.fbm(u * 2 + 11, v * 2, 4, 2, 2);
      const grain = z.n(u * 256, v * 256, 256, 256);
      if (type === 'gris-rose') {
        o.r = mix(206, 222, nuage) - fine * 78 - halo * 14 + fine2 * 18 + (grain - 0.5) * 8;
        o.g = mix(188, 206, nuage) - fine * 80 - halo * 16 + fine2 * 16 + (grain - 0.5) * 8;
        o.b = mix(182, 200, nuage) - fine * 74 - halo * 14 + fine2 * 16 + (grain - 0.5) * 8;
      } else if (type === 'griotte') {
        const tache = sstep(0.55, 0.75, turb2);
        o.r = mix(116, 150, nuage) + fine * 96 + fine2 * 60 - tache * 30 + (grain - 0.5) * 10;
        o.g = mix(40, 58, nuage) + fine * 120 + fine2 * 70 - tache * 14;
        o.b = mix(38, 52, nuage) + fine * 110 + fine2 * 62 - tache * 12;
      } else { // statuaire : blanc crème veiné de gris
        o.r = mix(226, 238, nuage) - fine * 60 - halo * 8 + (grain - 0.5) * 6;
        o.g = mix(220, 232, nuage) - fine * 60 - halo * 8 + (grain - 0.5) * 6;
        o.b = mix(206, 220, nuage) - fine * 54 - halo * 8 + (grain - 0.5) * 6;
      }
      o.h = 0.5 - fine * 0.25 + (grain - 0.5) * 0.1;
    });
  }

  /* ---------- Rugosité bruitée pour le laiton et l'or (patine) ---------- */
  function patine(seed = 19) {
    const W = 256, z = bruit(seed);
    return peindre(W, W, ['ro'], (x, y, o) => {
      const u = x / W, v = y / W;
      o.ro = 0.22 + 0.22 * z.fbm(u * 6, v * 6, 4, 6, 6) + 0.1 * Math.max(0, z.n(u * 64, v * 64, 64, 64) - 0.7);
    });
  }

  /* ---------- Caisson de coupole (une case, répétée) ---------- */
  function caisson() {
    const S = 256, c = toile(S, S), h = toile(S, S), m = toile(S, S), ro = toile(S, S);
    const cc = c.getContext('2d'), hc = h.getContext('2d'), mc = m.getContext('2d'), rc = ro.getContext('2d');
    const OR = '#c9a14e';
    const anneaux = [ // [retrait, couleur, relief, métal]
      [0, '#e3d4b2', 1.0, 0], [20, OR, 0.95, 1], [24, '#d5c19a', 0.82, 0], [36, OR, 0.78, 1],
      [39, '#c4aa7c', 0.64, 0], [52, OR, 0.6, 1], [55, '#b59468', 0.36, 0]
    ];
    for (const [r, col, hv, mv] of anneaux) {
      cc.fillStyle = col; cc.fillRect(r, r, S - 2 * r, S - 2 * r);
      const g = Math.round(hv * 255); hc.fillStyle = `rgb(${g},${g},${g})`; hc.fillRect(r, r, S - 2 * r, S - 2 * r);
      mc.fillStyle = mv ? '#fff' : '#000'; mc.fillRect(r, r, S - 2 * r, S - 2 * r);
      rc.fillStyle = mv ? '#5a5a5a' : '#d0d0d0'; rc.fillRect(r, r, S - 2 * r, S - 2 * r);
    }
    // fond du caisson : ombre douce sur les bords
    const gr = cc.createRadialGradient(128, 128, 20, 128, 128, 110);
    gr.addColorStop(0, 'rgba(255,240,210,.12)'); gr.addColorStop(1, 'rgba(60,35,10,.35)');
    cc.fillStyle = gr; cc.fillRect(55, 55, 146, 146);
    // rosace dorée
    const rosace = (ctx, coul, ombre) => {
      ctx.save(); ctx.translate(128, 128);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.ellipse(0, -22, 7, 17, 0, 0, Math.PI * 2); ctx.fillStyle = coul; ctx.fill();
        if (ombre) { ctx.strokeStyle = ombre; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fillStyle = coul; ctx.fill();
      ctx.restore();
    };
    rosace(cc, '#d8b25c', 'rgba(90,60,15,.6)'); rosace(hc, '#cfcfcf'); rosace(mc, '#fff'); rosace(rc, '#555');
    return { c, h, m, ro };
  }

  /* ---------- Verrière (calotte) ---------- */
  function verriere(seed = 23) {
    const W = 1024, H = 512, z = bruit(seed);
    return peindre(W, H, ['c'], (x, y, o) => {
      const u = x / W, v = y / H; // v=0 bord bas de la calotte, v=1 sommet
      const vv = 1 - v;
      const nr = 48, rings = [0.16, 0.36, 0.56, 0.76];
      let ring = 0; for (const r of rings) if (vv > r) ring++;
      const fu = (u * nr) % 1, fu2 = (u * nr * 2) % 1;
      const rad = Math.min(fu, 1 - fu) < 0.06, rad2 = Math.min(fu2, 1 - fu2) < 0.035 && vv > 0.36;
      let anneau = false; for (const r of rings) if (Math.abs(vv - r) < 0.012) anneau = true;
      const ornement = vv < 0.16;
      const id = h2(Math.floor(u * nr * (vv > 0.36 ? 2 : 1)), ring);
      let lum = 0.86 + 0.14 * id - 0.06 * z.fbm(u * 8, v * 4, 3, 8, 4);
      if (ornement) {
        const a = u * Math.PI * 2 * 8, rr = vv / 0.16;
        const petale = Math.abs(Math.sin(a)) * (1 - rr);
        lum = 0.75 + 0.25 * petale;
        o.r = 255 * lum; o.g = 214 * lum; o.b = 150 * lum;
      } else { o.r = 255 * lum; o.g = 242 * lum; o.b = 214 * lum; }
      if (rad || rad2 || anneau) { o.r = 52; o.g = 40; o.b = 28; }
    });
  }

  /* Verrière droite du berceau (vitrage rectangulaire) */
  function vitrage() {
    const W = 512, H = 512;
    return peindre(W, H, ['c'], (x, y, o) => {
      const u = x / W, v = y / H, fu = (u * 8) % 1, fv = (v * 8) % 1;
      const id = h2(Math.floor(u * 8), Math.floor(v * 8));
      const lum = 0.86 + 0.14 * id;
      o.r = 255 * lum; o.g = 242 * lum; o.b = 214 * lum;
      if (Math.min(fu, 1 - fu) < 0.035 || Math.min(fv, 1 - fv) < 0.035) { o.r = 52; o.g = 40; o.b = 28; }
    });
  }

  /* ---------- Mosaïque du sol central (repère : centre de l'hémicycle) ---------- */
  function mosaique(seed = 29) {
    const W = 2048, H = 1638, X0 = -9, X1 = 9, Z0 = -7.2, Z1 = 7.2, z = bruit(seed);
    const T = 0.042;
    const P = {
      creme: [206, 190, 162], rose: [176, 122, 106], noir: [36, 38, 34], ocre: [176, 124, 58],
      gris: [138, 128, 118], brique: [128, 46, 36], vert: [52, 72, 60]
    };
    return peindre(W, H, ['c', 'h'], (px, py, o) => {
      const X = X0 + (px + 0.5) / W * (X1 - X0), Z = Z1 - (py + 0.5) / H * (Z1 - Z0);
      let col, gx, gy, id;
      const r = Math.hypot(X, Z);
      if (Z > -0.25 && r < 6.6) {
        const a = Math.atan2(Z, X); // 0..π
        const ri = Math.floor(r / T); const per = Math.max(6, Math.round(Math.PI * (ri + 0.5) * T / T));
        const ai = Math.floor((a / Math.PI) * per + (ri % 2) * 0.5);
        gx = ((a / Math.PI) * per + (ri % 2) * 0.5) % 1; gy = (r / T) % 1; id = h2(ri, ai);
        if (r < 0.9) col = Math.abs(Math.sin(a * 6)) > 0.55 ? P.ocre : (r < 0.35 ? P.noir : P.creme);
        else if (r < 1.05) col = P.noir;
        else if (r < 2.1) col = id > 0.93 ? P.rose : P.creme;
        else if (r < 2.22) col = P.noir;
        else if (r < 2.7) { const m = Math.sin(a * 36 + Math.sin((r - 2.22) / 0.48 * Math.PI) * 2.2); col = m > 0.1 ? P.ocre : P.vert; }
        else if (r < 2.82) col = P.noir;
        else if (r < 5.4) { const s = Math.floor(a / Math.PI * 18); col = (s % 2) ? (id > 0.9 ? P.gris : P.rose) : (id > 0.92 ? P.rose : P.creme); }
        else if (r < 5.5) col = P.noir;
        else if (r < 6.1) { const d = Math.abs(((a / Math.PI * 30) % 1) - 0.5) * 2, e = Math.abs((r - 5.8) / 0.3); col = d + e < 0.8 ? P.brique : P.creme; }
        else col = P.noir;
      } else {
        const ix = Math.floor(X / T), iz = Math.floor(Z / T);
        gx = (X / T) - ix; gy = (Z / T) - iz; id = h2(ix, iz);
        const bord = Math.min(Math.abs(X) - 5.6, Z + 6.2);
        if (Math.abs(X) > 6.0 || Z < -6.0) col = P.creme;
        else if (Math.abs(Math.abs(X) - 5.75) < 0.12 || Math.abs(Z + 5.85) < 0.12) col = P.noir;
        else {
          const dx = Math.abs(((X + Z) / 0.9 % 1 + 1) % 1 - 0.5), dz = Math.abs(((X - Z) / 0.9 % 1 + 1) % 1 - 0.5);
          col = Math.min(dx, dz) < 0.07 ? P.brique : (Math.max(dx, dz) > 0.42 ? P.ocre : P.creme);
          if (id > 0.93) col = P.gris;
        }
        void bord;
      }
      const joint = Math.min(gx, 1 - gx, gy, 1 - gy) < 0.09;
      const v = 0.84 + 0.22 * id + 0.08 * (z.n(px * 0.02, py * 0.02) - 0.5);
      if (joint) { o.r = 58; o.g = 50; o.b = 42; o.h = 0.3; }
      else { o.r = col[0] * v; o.g = col[1] * v; o.b = col[2] * v; o.h = 0.6 + 0.08 * id; }
    });
  }

  /* ---------- Cannelures (relief des fûts) ---------- */
  function cannelures() {
    const W = 512, H = 16;
    return peindre(W, H, ['h'], (x, y, o) => {
      const u = x / W; const f = (u * 24) % 1;
      o.h = 0.5 + 0.5 * Math.cos(f * Math.PI * 2) * (Math.min(f, 1 - f) > 0.06 ? 1 : 0.6);
    });
  }

  /* ---------- Balustrade dorée (avec transparence) ---------- */
  function balustrade() {
    const W = 512, H = 128;
    return peindre(W, H, ['a', 'h'], (x, y, o) => {
      const v = y / H, fx = (x % 64) / 64 - 0.5;
      let plein = false;
      if (v < 0.13 || v > 0.86) plein = true;
      else {
        const t = (v - 0.13) / 0.73;
        const w = 0.13 + 0.15 * Math.sin(Math.PI * Math.pow(t, 0.8)) + (t > 0.88 ? 0.12 : 0) + (t < 0.1 ? 0.1 : 0);
        plein = Math.abs(fx) < w;
      }
      const ombre = 0.75 + 0.25 * Math.cos(fx * Math.PI * 2.4);
      o.r = 206 * ombre; o.g = 166 * ombre; o.b = 84 * ombre; o.a = plein ? 1 : 0;
      o.h = plein ? 0.4 + 0.5 * Math.cos(fx * Math.PI * 2.6) : 0;
    });
  }

  /* ---------- Entablement (architrave, frise, denticules, oves) ---------- */
  function entablement() {
    const W = 1024, H = 256, c = toile(W, H), h = toile(W, H), m = toile(W, H);
    const cc = c.getContext('2d'), hc = h.getContext('2d'), mc = m.getContext('2d');
    const bande = (y0, y1, col, hv, mv) => {
      cc.fillStyle = col; cc.fillRect(0, y0, W, y1 - y0);
      const g = Math.round(hv * 255); hc.fillStyle = `rgb(${g},${g},${g})`; hc.fillRect(0, y0, W, y1 - y0);
      mc.fillStyle = mv ? '#fff' : '#000'; mc.fillRect(0, y0, W, y1 - y0);
    };
    bande(0, H, '#ded0b0', 0.6, 0);
    bande(0, 10, '#c9a14e', 0.8, 1); bande(56, 62, '#c9a14e', 0.8, 1); bande(118, 124, '#c9a14e', 0.8, 1);
    for (let x = 0; x < W; x += 32) { // frise : rosaces dorées
      cc.fillStyle = '#c9a14e'; cc.beginPath(); cc.arc(x + 16, 90, 9, 0, 7); cc.fill();
      hc.fillStyle = '#eee'; hc.beginPath(); hc.arc(x + 16, 90, 9, 0, 7); hc.fill();
      mc.fillStyle = '#fff'; mc.beginPath(); mc.arc(x + 16, 90, 9, 0, 7); mc.fill();
    }
    for (let x = 0; x < W; x += 24) { // oves
      cc.fillStyle = '#c9a14e'; cc.beginPath(); cc.ellipse(x + 12, 140, 8, 12, 0, 0, 7); cc.fill();
      cc.strokeStyle = 'rgba(70,45,10,.7)'; cc.lineWidth = 2; cc.stroke();
      hc.fillStyle = '#ddd'; hc.beginPath(); hc.ellipse(x + 12, 140, 8, 12, 0, 0, 7); hc.fill();
      mc.fillStyle = '#fff'; mc.beginPath(); mc.ellipse(x + 12, 140, 8, 12, 0, 0, 7); mc.fill();
    }
    for (let x = 0; x < W; x += 20) { // denticules
      cc.fillStyle = '#e9dcbd'; cc.fillRect(x + 3, 166, 13, 38);
      cc.fillStyle = 'rgba(60,40,15,.45)'; cc.fillRect(x + 16, 166, 4, 38);
      hc.fillStyle = '#fff'; hc.fillRect(x + 3, 166, 13, 38);
      hc.fillStyle = '#222'; hc.fillRect(x + 16, 166, 4, 38);
    }
    bande(214, 220, '#c9a14e', 0.8, 1);
    return { c, h, m };
  }

  /* ---------- Galeries du public (une travée, répétée derrière la colonnade) ---------- */
  function galerie() {
    const W = 512, H = 512, c = toile(W, H), cc = c.getContext('2d'), z = bruit(31);
    // stuc crème
    cc.fillStyle = '#d9c9a6'; cc.fillRect(0, 0, W, H);
    // arche sombre (l'intérieur des tribunes)
    const arche = () => { cc.beginPath(); cc.moveTo(126, H); cc.lineTo(126, 200); cc.arc(256, 200, 130, Math.PI, 0); cc.lineTo(386, H); cc.closePath(); };
    arche(); const g = cc.createLinearGradient(0, 70, 0, H); g.addColorStop(0, '#6a4426'); g.addColorStop(.45, '#4a2c18'); g.addColorStop(1, '#22140b');
    cc.fillStyle = g; cc.fill();
    cc.save(); arche(); cc.clip();
    for (let r = 0; r < 5; r++) { // rangs de fauteuils rouges dans la pénombre
      const y = 330 + r * 34;
      for (let x = 132; x < 380; x += 26) {
        cc.fillStyle = `rgba(${110 + r * 6},${18 + r * 2},${24},${0.55 + r * 0.08})`;
        cc.beginPath(); cc.roundRect ? cc.roundRect(x, y, 20, 22, 5) : cc.rect(x, y, 20, 22); cc.fill();
      }
    }
    const lum = cc.createRadialGradient(256, 150, 6, 256, 200, 190); lum.addColorStop(0, 'rgba(255,214,150,.55)'); lum.addColorStop(1, 'rgba(0,0,0,0)');
    cc.fillStyle = lum; cc.fillRect(0, 0, W, H);
    cc.restore();
    // moulure dorée de l'arche
    cc.lineWidth = 10; cc.strokeStyle = '#b8903e'; arche(); cc.stroke();
    cc.lineWidth = 3; cc.strokeStyle = '#f0d58f'; cc.beginPath(); cc.arc(256, 200, 125, Math.PI, 0); cc.stroke();
    for (const x of [40, 472]) { // pilastres de stuc à refends
      for (let y = 20; y < H; y += 34) { cc.fillStyle = 'rgba(120,96,60,.35)'; cc.fillRect(x - 40, y, 80, 2); }
    }
    // clé d'arc
    cc.fillStyle = '#c9a14e'; cc.beginPath(); cc.moveTo(240, 30); cc.lineTo(272, 30); cc.lineTo(266, 62); cc.lineTo(246, 62); cc.closePath(); cc.fill();
    // patine du stuc
    const im = cc.getImageData(0, 0, W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = (y * W + x) * 4, t = 0.94 + 0.1 * (z.fbm(x / W * 4, y / H * 4, 4, 4, 4) - 0.5);
      d[k] *= t; d[k + 1] *= t; d[k + 2] *= t;
    }
    cc.putImageData(im, 0, 0);
    return { c };
  }

  /* ---------- Mur du perchoir (fond de salle) : marbres, niches, tenture, portes ---------- */
  function murFond() {
    const W = 2048, H = 600, c = toile(W, H), h = toile(W, H), cc = c.getContext('2d'), hc = h.getContext('2d');
    const pxm = W / 48; // 48 m de large, 14 m de haut
    const X = m => (m + 24) * pxm, Y = m => H - m * (H / 14);
    const mg = marbre(17, 'gris-rose'), mr = marbre(83, 'griotte'), bois = noyer(7);
    const motif = (img, s) => { const p = cc.createPattern(img, 'repeat'); const mtx = new DOMMatrix().scale(s, s); p.setTransform(mtx); return p; };
    // fond : stuc chaud
    cc.fillStyle = '#d8c7a3'; cc.fillRect(0, 0, W, H); hc.fillStyle = '#888'; hc.fillRect(0, 0, W, H);
    // lambris de noyer sur les côtés
    cc.fillStyle = motif(bois.c, 0.35); cc.fillRect(0, Y(4.5), X(-12.5), H); cc.fillRect(X(12.5), Y(4.5), W, H);
    // soubassement marbre gris-rosé
    cc.fillStyle = motif(mg.c, 0.25); cc.fillRect(X(-12.5), Y(2.6), X(12.5) - X(-12.5), Y(0) - Y(2.6));
    // cadres dorés
    const cadre = (x0, y0, x1, y1, ep) => {
      cc.lineWidth = ep; cc.strokeStyle = '#b48d3e'; cc.strokeRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1));
      cc.lineWidth = Math.max(1, ep / 3); cc.strokeStyle = '#f0d690'; cc.strokeRect(X(x0) + ep / 2, Y(y1) + ep / 2, X(x1) - X(x0) - ep, Y(y0) - Y(y1) - ep);
      hc.lineWidth = ep; hc.strokeStyle = '#eee'; hc.strokeRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1));
    };
    // tenture centrale : damas plissé (tissu, sans image ni personnage)
    const tx0 = -4.4, tx1 = 4.4, ty0 = 3.3, ty1 = 11.6;
    const tw = X(tx1) - X(tx0), th = Y(ty0) - Y(ty1);
    const t = toile(Math.round(tw), Math.round(th)), tc = t.getContext('2d');
    const ti = tc.createImageData(t.width, t.height), td = ti.data, tz = bruit(47);
    for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) {
      const u = x / t.width, v = y / t.height, k = (y * t.width + x) * 4;
      const pli = 0.62 + 0.38 * Math.pow(0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 9 + Math.sin(v * 3) * 0.6), 0.8); // plis verticaux
      const mx = (u * 9 * 2) % 1, my = (v * 12) % 1; // motif de damas
      const dx = mx - 0.5, dy = my - 0.5;
      const fleur = Math.abs(dx) < 0.32 * Math.sin(Math.PI * my) && Math.abs(Math.sin(dy * 9 + Math.abs(dx) * 14)) > 0.35 ? 1 : 0;
      const trame = (y % 3 === 0 ? 0.92 : 1) * (0.94 + 0.12 * (tz.fbm(x / 80, y / 80, 3) - 0.5));
      const r0 = fleur ? 150 : 112, g0 = fleur ? 118 : 30, b0 = fleur ? 60 : 34;
      const f = pli * trame * (1 - 0.25 * v);
      td[k] = r0 * f; td[k + 1] = g0 * f; td[k + 2] = b0 * f; td[k + 3] = 255;
    }
    tc.putImageData(ti, 0, 0);
    const fr = tc.createLinearGradient(0, th - 26, 0, th); fr.addColorStop(0, 'rgba(200,160,80,0)'); fr.addColorStop(.3, '#c9a14e'); fr.addColorStop(1, '#7a5a22');
    for (let x = 0; x < tw; x += 5) { tc.fillStyle = fr; tc.fillRect(x, th - 26, 3, 26); } // frange dorée
    cc.drawImage(t, X(tx0), Y(ty1));
    hc.fillStyle = '#7a7a7a'; hc.fillRect(X(tx0), Y(ty1), tw, th);
    cadre(tx0 - 0.15, ty0 - 0.15, tx1 + 0.15, ty1 + 0.15, 14);
    // niches latérales (arcs sombres)
    for (const s of [-1, 1]) {
      const cxm = s * 8.6, w = 1.5, y0 = 3.2, y1 = 9.6;
      cc.fillStyle = motif(mr.c, 0.22); cc.fillRect(X(cxm - 2.4), Y(11.6), X(cxm + 2.4) - X(cxm - 2.4), Y(3.0) - Y(11.6));
      cadre(cxm - 2.4, 3.0, cxm + 2.4, 11.6, 8);
      cc.beginPath(); cc.moveTo(X(cxm - w), Y(y0)); cc.lineTo(X(cxm - w), Y(y1 - w)); cc.arc(X(cxm), Y(y1 - w), w * pxm, Math.PI, 0); cc.lineTo(X(cxm + w), Y(y0)); cc.closePath();
      const gn = cc.createLinearGradient(X(cxm - w), 0, X(cxm + w), 0); gn.addColorStop(0, '#2b1a10'); gn.addColorStop(.5, '#4a3020'); gn.addColorStop(1, '#22140c');
      cc.fillStyle = gn; cc.fill(); cc.lineWidth = 6; cc.strokeStyle = '#c9a14e'; cc.stroke();
      hc.beginPath(); hc.moveTo(X(cxm - w), Y(y0)); hc.lineTo(X(cxm - w), Y(y1 - w)); hc.arc(X(cxm), Y(y1 - w), w * pxm, Math.PI, 0); hc.lineTo(X(cxm + w), Y(y0)); hc.closePath(); hc.fillStyle = '#222'; hc.fill();
      // portes à doubles battants
      const dx = s * 18.2;
      cc.fillStyle = '#3a2314'; cc.fillRect(X(dx - 1.3), Y(4.2), X(dx + 1.3) - X(dx - 1.3), Y(0) - Y(4.2));
      cadre(dx - 1.3, 0, dx + 1.3, 4.2, 8); cadre(dx - 1.15, 0.4, dx - 0.08, 3.9, 4); cadre(dx + 0.08, 0.4, dx + 1.15, 3.9, 4);
      cc.fillStyle = '#e1c272'; cc.fillRect(X(dx - 0.2), Y(2.1), 4, 10); cc.fillRect(X(dx + 0.15), Y(2.1), 4, 10);
    }
    // panneaux du soubassement
    for (let x = -12; x < 12; x += 3) cadre(x + 0.2, 0.3, x + 2.8, 2.3, 5);
    // corniche peinte
    cc.fillStyle = '#c9a14e'; cc.fillRect(0, Y(12.6), W, 6); cc.fillRect(0, Y(13.7), W, 8);
    for (let x = 0; x < W; x += 12) { cc.fillStyle = '#e8dbbb'; cc.fillRect(x, Y(13.6), 8, 14); hc.fillStyle = '#fff'; hc.fillRect(x, Y(13.6), 8, 14); }
    return { c, h };
  }

  /* ---------- Façades de la tribune et du perchoir (marbre griotte, cadre doré, bas-relief blanc) ---------- */
  function facade(seed, avecRelief) {
    const W = 1024, H = 512, c = toile(W, H), h = toile(W, H), cc = c.getContext('2d'), hc = h.getContext('2d');
    const mr = marbre(83, 'griotte'), mb = marbre(19, 'statuaire'), z = bruit(seed + 5);
    cc.drawImage(mr.c, 0, 0, W, W); hc.fillStyle = '#888'; hc.fillRect(0, 0, W, H);
    cc.lineWidth = 18; cc.strokeStyle = '#b48d3e'; cc.strokeRect(20, 20, W - 40, H - 40);
    cc.lineWidth = 4; cc.strokeStyle = '#f0d690'; cc.strokeRect(30, 30, W - 60, H - 60);
    hc.lineWidth = 18; hc.strokeStyle = '#eee'; hc.strokeRect(20, 20, W - 40, H - 40);
    if (avecRelief) {
      const x0 = 150, y0 = 110, w = W - 300, hh = H - 220;
      cc.drawImage(mb.c, 0, 0, 512, 256, x0, y0, w, hh);
      const im = cc.getImageData(x0, y0, w, hh), d = im.data, hi = hc.getImageData(x0, y0, w, hh), hd = hi.data;
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
        const u = x / w, v = y / hh, k = (y * w + x) * 4;
        // drapés et guirlande de laurier abstraite
        const drape = 0.5 + 0.5 * Math.sin(u * 40 + Math.sin(v * 6 + u * 3) * 2.5 + z.fbm(u * 3, v * 3, 3) * 4);
        const guir = Math.exp(-Math.pow((v - (0.5 + 0.28 * Math.sin(u * Math.PI * 2))) / 0.08, 2)) * (0.6 + 0.4 * Math.sin(u * 90));
        const rel = 0.35 + 0.35 * drape * (0.4 + 0.6 * Math.sin(v * Math.PI)) + 0.4 * guir;
        const sh = 0.82 + 0.25 * (rel - 0.5);
        d[k] *= sh; d[k + 1] *= sh; d[k + 2] *= sh;
        hd[k] = hd[k + 1] = hd[k + 2] = rel * 255;
      }
      cc.putImageData(im, x0, y0); hc.putImageData(hi, x0, y0);
      cc.lineWidth = 10; cc.strokeStyle = '#b48d3e'; cc.strokeRect(x0 - 6, y0 - 6, w + 12, hh + 12);
      hc.lineWidth = 10; hc.strokeStyle = '#fff'; hc.strokeRect(x0 - 6, y0 - 6, w + 12, hh + 12);
    } else {
      for (let i = 0; i < 3; i++) {
        const x0 = 70 + i * 300, w = 260;
        cc.lineWidth = 8; cc.strokeStyle = '#b48d3e'; cc.strokeRect(x0, 80, w, H - 160);
        cc.lineWidth = 2; cc.strokeStyle = '#f0d690'; cc.strokeRect(x0 + 8, 88, w - 16, H - 176);
        hc.lineWidth = 8; hc.strokeStyle = '#eee'; hc.strokeRect(x0, 80, w, H - 160);
      }
    }
    return { c, h };
  }

  /* ---------- Carte d'environnement (reflets des métaux et des vernis) ---------- */
  function environnement() {
    const W = 1024, H = 512, c = toile(W, H), cc = c.getContext('2d');
    const g = cc.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fbe3b4'); g.addColorStop(0.16, '#e2b97a'); g.addColorStop(0.32, '#8a5e33');
    g.addColorStop(0.48, '#4a2c18'); g.addColorStop(0.6, '#33150f'); g.addColorStop(1, '#140805');
    cc.fillStyle = g; cc.fillRect(0, 0, W, H);
    const r = rng(53);
    for (let i = 0; i < 26; i++) { // lueurs dorées et fenêtres de la verrière
      const x = r() * W, y = H * (0.22 + r() * 0.2), s = 14 + r() * 40;
      const gr = cc.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,228,170,.9)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
      cc.fillStyle = gr; cc.fillRect(x - s, y - s, 2 * s, 2 * s);
    }
    for (let i = 0; i < 40; i++) { const x = r() * W; cc.fillStyle = 'rgba(122,20,28,.5)'; cc.fillRect(x, H * 0.55 + r() * 40, 30 + r() * 60, 18); }
    return c;
  }

  /* ---------- Matières CSS du carnet ---------- */
  function papier(seed = 61, base = [244, 236, 219]) {
    const W = 512, z = bruit(seed);
    return peindre(W, W, ['c'], (x, y, o) => {
      const u = x / W, v = y / W;
      const fib = z.n(u * 160, v * 40, 160, 40), fib2 = z.n(u * 40, v * 160, 40, 160);
      const nu = z.fbm(u * 4, v * 4, 4, 4, 4), pt = z.n(u * 256, v * 256, 256, 256);
      const t = 1 + 0.05 * (nu - 0.5) + 0.03 * (fib - 0.5) + 0.03 * (fib2 - 0.5) - (pt > 0.93 ? 0.12 : 0);
      o.r = base[0] * t; o.g = base[1] * t; o.b = base[2] * t;
    }).c;
  }
  function cuir(seed = 67) {
    const W = 512, z = bruit(seed);
    return peindre(W, W, ['c'], (x, y, o) => {
      const u = x / W, v = y / W;
      const grain = z.n(u * 96, v * 96, 96, 96), grain2 = z.n(u * 48 + 2, v * 48, 48, 48);
      const usure = z.fbm(u * 3, v * 3, 4, 3, 3);
      const cell = Math.pow(Math.abs(grain - 0.5) * 2, 0.6);
      const t = 0.78 + 0.22 * cell + 0.18 * (usure - 0.5) + 0.08 * (grain2 - 0.5);
      o.r = 104 * t + 10; o.g = 58 * t + 4; o.b = 33 * t;
    }).c;
  }
  function encrage(seed = 71) { // masque d'encre de tampon : lacunes et grain
    const W = 256, z = bruit(seed);
    return peindre(W, W, ['a'], (x, y, o) => {
      const u = x / W, v = y / W;
      const a = 0.9 + 0.4 * (z.fbm(u * 8, v * 8, 4, 8, 8) - 0.5) - (z.n(u * 64, v * 64, 64, 64) > 0.78 ? 0.6 : 0) - (z.n(u * 128 + 5, v * 128, 128, 128) > 0.85 ? 0.5 : 0);
      o.r = o.g = o.b = 0; o.a = clamp(a, 0, 1);
    }).a;
  }
  function fougere() { // feuille de fougère séchée, aplatie
    const W = 300, H = 520, c = toile(W, H), cc = c.getContext('2d'), r = rng(73);
    cc.translate(W / 2, H - 20);
    const tige = t => ({ x: Math.sin(t * 2.2) * 26 * t, y: -t * (H - 60) });
    cc.lineCap = 'round';
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, p = tige(t), long = (1 - t) * 120 + 14, ang = 1.1 - t * 0.3;
      for (const s of [-1, 1]) {
        cc.save(); cc.translate(p.x, p.y); cc.rotate(-s * ang);
        cc.strokeStyle = 'rgba(92,100,58,.85)'; cc.lineWidth = 1.6; cc.beginPath(); cc.moveTo(0, 0); cc.lineTo(0, -long * s * -1); cc.stroke();
        const n = Math.max(3, Math.round(long / 12));
        for (let j = 1; j < n; j++) {
          const q = j / n, l = (1 - q) * 11 + 3;
          cc.fillStyle = `rgba(${96 + r() * 30},${108 + r() * 24},${60 + r() * 16},${0.72 + r() * 0.2})`;
          cc.beginPath(); cc.ellipse(-l * 0.55, long * q * s, l * 0.6, 3.4, 0.5 * s, 0, 7); cc.ellipse(l * 0.55, long * q * s, l * 0.6, 3.4, -0.5 * s, 0, 7); cc.fill();
        }
        cc.restore();
      }
    }
    cc.strokeStyle = 'rgba(80,72,40,.95)'; cc.lineWidth = 3; cc.beginPath();
    for (let i = 0; i <= 40; i++) { const p = tige(i / 40); i ? cc.lineTo(p.x, p.y) : cc.moveTo(p.x, p.y); } cc.lineTo(0, 30); cc.stroke();
    return c;
  }
  /* Plaquette « 578 » gravée */
  function plaque578() {
    const W = 512, H = 160, c = toile(W, H), cc = c.getContext('2d');
    const g = cc.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#e8cf86'); g.addColorStop(.5, '#b38a3a'); g.addColorStop(1, '#d9b764');
    cc.fillStyle = g; cc.fillRect(0, 0, W, H);
    cc.strokeStyle = '#7a5a1e'; cc.lineWidth = 8; cc.strokeRect(8, 8, W - 16, H - 16);
    cc.font = '600 104px Cinzel, Georgia, serif'; cc.textAlign = 'center'; cc.textBaseline = 'middle';
    cc.fillStyle = 'rgba(255,240,200,.7)'; cc.fillText('578', W / 2 + 2, H / 2 + 6);
    cc.fillStyle = '#4a3410'; cc.fillText('578', W / 2, H / 2 + 3);
    return c;
  }

  return {
    noyer, panneaux, velours, moquette, marbre, patine, caisson, verriere, vitrage, mosaique, cannelures,
    balustrade, entablement, galerie, murFond, facade, environnement, papier, cuir, encrage, fougere, plaque578, rng
  };
})();
