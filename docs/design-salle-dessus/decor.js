/* ============================================================
   DÉCOR — ce qui manquait à la maquette pour être l'hémicycle du Palais Bourbon.
   S'ajoute à la salle de salle.js (même repère : sièges vers +z, perchoir vers -z, mètres)
   sans la reconstruire : mur du perchoir, galeries, draperies, dossier de l'hémicycle,
   frise de la coupole, statues, et ce que la vue du dessus montre autour de la salle.
   ============================================================ */
const DECOR = (() => {
  'use strict';
  let S, scene, M, G, I, P, O;
  const rad = d => d * Math.PI / 180;
  const toile = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function texC(c, o = {}) {
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    t.wrapS = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if (o.offset) t.offset.set(o.offset, 0);
    return t;
  }
  const orGrad = (g, x0, y0, x1, y1) => { const d = g.createLinearGradient(x0, y0, x1, y1); d.addColorStop(0, '#7a5a1d'); d.addColorStop(0.45, '#e3c679'); d.addColorStop(0.6, '#c49a42'); d.addColorStop(1, '#8a6824'); return d; };
  const OR = '#c9a24c', OR_C = '#e8cd85';

  /* ---------------- Peintures ---------------- */

  // Une tapisserie dans l'esprit de celle du perchoir : une architecture en voûtes, une foule de figures.
  function tapisserie(g, x, y, w, h) {
    const r = MAT.rng(5), cx = x + w / 2;
    let d = g.createLinearGradient(x, y, x, y + h); d.addColorStop(0, '#cbb48b'); d.addColorStop(0.55, '#dac9a3'); d.addColorStop(1, '#a98e67');
    g.fillStyle = d; g.fillRect(x, y, w, h);
    // voûtes qui s'enfoncent vers le ciel
    for (let k = 3; k >= 0; k--) {
      const rw = w * 0.21 * (1 - k * 0.17), top = y + h * (0.1 + k * 0.05), base = y + h * 0.62;
      g.beginPath(); g.moveTo(cx - rw, base); g.lineTo(cx - rw, top + rw); g.arc(cx, top + rw, rw, Math.PI, 0); g.lineTo(cx + rw, base); g.closePath();
      if (k === 3) { const s = g.createLinearGradient(0, top, 0, base); s.addColorStop(0, '#9fbdcc'); s.addColorStop(1, '#ece6d2'); g.fillStyle = s; g.fill(); }
      g.lineWidth = w * 0.014 * (1 - k * 0.15); g.strokeStyle = k % 2 ? '#8b6c49' : '#b3966c'; g.stroke();
    }
    // piliers et niches latérales
    for (const px of [x + w * 0.05, x + w * 0.83]) {
      g.fillStyle = '#b79c74'; g.fillRect(px, y + h * 0.12, w * 0.12, h * 0.5);
      g.fillStyle = '#8f7553'; g.fillRect(px + w * 0.03, y + h * 0.2, w * 0.06, h * 0.3);
      g.fillStyle = '#ddd6c8'; g.beginPath(); g.ellipse(px + w * 0.06, y + h * 0.4, w * 0.012, h * 0.08, 0, 0, 7); g.fill();
    }
    // marches et dallage en perspective
    g.fillStyle = '#e2d4b4'; g.fillRect(x, y + h * 0.62, w, h * 0.06);
    g.fillStyle = '#9b8361'; g.fillRect(x, y + h * 0.68, w, h * 0.012);
    g.fillStyle = '#d4c3a0'; g.fillRect(x, y + h * 0.69, w, h * 0.31);
    g.strokeStyle = 'rgba(110,88,60,0.35)'; g.lineWidth = 1.5;
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(cx + i * w * 0.012, y + h * 0.69); g.lineTo(cx + i * w * 0.12, y + h); g.stroke(); }
    for (const t of [0.75, 0.83, 0.93]) { g.beginPath(); g.moveTo(x, y + h * t); g.lineTo(x + w, y + h * t); g.stroke(); }
    // figures
    const pal = ['#8d2a22', '#b9533a', '#2f4f7a', '#ece4cf', '#6b5a3a', '#a33d2a', '#3e6a5a', '#d9b97a', '#4a3b6a', '#e9dcc0'];
    const fig = (fx, fy, s) => {
      g.fillStyle = 'rgba(70,50,30,0.25)'; g.beginPath(); g.ellipse(fx + s * 0.06, fy, s * 0.2, s * 0.05, 0, 0, 7); g.fill();
      g.fillStyle = pal[Math.floor(r() * pal.length)]; g.beginPath(); g.ellipse(fx, fy - s * 0.42, s * 0.16, s * 0.42, (r() - 0.5) * 0.25, 0, 7); g.fill();
      g.fillStyle = pal[Math.floor(r() * pal.length)]; g.beginPath(); g.ellipse(fx + (r() - 0.5) * s * 0.12, fy - s * 0.55, s * 0.12, s * 0.22, (r() - 0.5) * 0.6, 0, 7); g.fill();
      g.fillStyle = '#d6a47e'; g.beginPath(); g.arc(fx, fy - s * 0.9, s * 0.085, 0, 7); g.fill();
    };
    for (let i = 0; i < 44; i++) { const fx = x + w * (0.1 + 0.8 * r()); if (Math.abs(fx - cx) < w * 0.05) continue; fig(fx, y + h * (0.62 + r() * 0.02), h * (0.15 + r() * 0.03)); }
    fig(cx - w * 0.022, y + h * 0.63, h * 0.2); fig(cx + w * 0.022, y + h * 0.63, h * 0.2);
    for (let i = 0; i < 26; i++) { const fx = x + w * (r() < 0.5 ? 0.06 + r() * 0.34 : 0.6 + r() * 0.34); fig(fx, y + h * (0.84 + r() * 0.12), h * (0.19 + r() * 0.04)); }
    // trame du tissage, puis bordure
    g.fillStyle = 'rgba(60,40,20,0.06)'; for (let yy = y; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1);
    g.lineWidth = h * 0.045; g.strokeStyle = '#5e2b1f'; g.strokeRect(x + h * 0.022, y + h * 0.022, w - h * 0.045, h - h * 0.045);
    g.fillStyle = OR_C; for (let xx = x + h * 0.06; xx < x + w; xx += h * 0.06) { g.beginPath(); g.arc(xx, y + h * 0.022, 2.2, 0, 7); g.arc(xx, y + h - h * 0.022, 2.2, 0, 7); g.fill(); }
  }

  // Bas-relief en marbre blanc : des figures en léger relief, éclairées d'en haut à gauche.
  function basRelief(g, x, y, w, h, graine, fond) {
    const r = MAT.rng(graine);
    g.fillStyle = fond; g.fillRect(x, y, w, h);
    const n = Math.round(w / h * 3.2);
    for (let i = 0; i < n; i++) {
      const fx = x + w * (0.04 + 0.92 * (i + r() * 0.6) / n), s = h * (0.62 + r() * 0.22), fy = y + h * 0.93;
      for (const [dx, dy, c] of [[3, 3, 'rgba(120,108,88,0.45)'], [0, 0, '#f4efe6'], [-1.2, -1.2, 'rgba(255,255,255,0.7)']]) {
        g.fillStyle = c; g.beginPath(); g.ellipse(fx + dx, fy - s * 0.42 + dy, s * 0.14, s * 0.42, (r() - 0.5) * 0.4, 0, 7); g.fill();
        g.beginPath(); g.arc(fx + dx + (r() - 0.5) * 3, fy - s * 0.9 + dy, s * 0.075, 0, 7); g.fill();
      }
    }
    g.strokeStyle = 'rgba(150,135,110,0.6)'; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }

  // Le mur du perchoir, d'après la salle réelle : soubassement en marbre, bas-relief, tentures vertes à motifs dorés,
  // tapisserie au centre entre deux colonnes, niches à statues, entablement et attique « République française ».
  function murPerchoir() {
    const W = 4096, K = W / 48, H = Math.round(14 * K);
    const c = toile(W, H), g = c.getContext('2d'), r = MAT.rng(71);
    const X = x => (x + 24) * K, Y = y => (14 - y) * K;
    const R = (x0, y0, x1, y1, f) => { g.fillStyle = f; g.fillRect(X(x0), Y(y1), (x1 - x0) * K, (y1 - y0) * K); };
    const motif = (img, m) => { const p = g.createPattern(img, 'repeat'); p.setTransform(new DOMMatrix().scale(m, m)); return p; };
    const cadre = (x0, y0, x1, y1, ep, coul) => { g.lineWidth = ep * K; g.strokeStyle = coul; g.strokeRect(X(x0), Y(y1), (x1 - x0) * K, (y1 - y0) * K); };
    const filetOr = (y, ep = 0.05) => { g.fillStyle = orGrad(g, 0, Y(y + ep), 0, Y(y)); g.fillRect(0, Y(y + ep), W, ep * K); };
    const gris = MAT.marbre(17, 'gris-rose').c, blanc = MAT.marbre(19, 'statuaire').c;

    R(-24, 0, 24, 14, '#e8dfcc');
    // soubassement en marbre (0 → 5 m)
    g.fillStyle = motif(gris, 4 * K / 1024); g.fillRect(0, Y(5.0), W, 5 * K);
    g.globalCompositeOperation = 'multiply'; R(-24, 0, 24, 5.0, '#b89c86'); g.globalCompositeOperation = 'source-over';
    for (const [a, b] of [[-23.4, -14.6], [-10.4, -7.2], [7.2, 10.4], [14.6, 23.4]]) cadre(a, 0.5, b, 4.4, 0.07, 'rgba(255,244,228,0.28)');
    // portes rouges à encadrement de marbre blanc
    for (const s of [-1, 1]) {
      const x0 = s > 0 ? 11.2 : -13.8, x1 = x0 + 2.6;
      g.fillStyle = motif(blanc, 3 * K / 1024); g.fillRect(X(x0), Y(4.3), 2.6 * K, 4.3 * K);
      const d = g.createLinearGradient(0, Y(3.8), 0, Y(0)); d.addColorStop(0, '#9b2226'); d.addColorStop(1, '#6e1418');
      g.fillStyle = d; g.fillRect(X(x0 + 0.32), Y(3.8), (2.6 - 0.64) * K, 3.8 * K);
      cadre(x0 + 0.5, 0.4, x1 - 0.5, 3.6, 0.03, 'rgba(255,210,200,0.25)');
      R(x0 - 0.1, 4.3, x1 + 0.1, 4.48, '#f4efe6');
    }
    // écrans de part et d'autre du bas-relief
    for (const s of [-1, 1]) { const x0 = s > 0 ? 5.0 : -6.7; R(x0 - 0.06, 2.84, x0 + 1.76, 4.42, '#3a3a3a'); R(x0, 2.9, x0 + 1.7, 4.36, '#121212'); }
    // bas-relief sous la tapisserie
    basRelief(g, X(-4.4), Y(4.8), 8.8 * K, 1.85 * K, 31, '#e6dfd1');
    // plinthe claire
    g.fillStyle = motif(blanc, 3 * K / 1024); g.fillRect(0, Y(5.35), W, 0.5 * K); filetOr(5.3, 0.05); filetOr(4.85, 0.04);

    // partie haute : marbre blanc au centre, tentures vertes de chaque côté
    g.fillStyle = motif(blanc, 3 * K / 1024); g.fillRect(X(-10.0), Y(11.05), 20 * K, 5.7 * K);
    g.globalCompositeOperation = 'multiply'; R(-10.0, 5.35, 10.0, 11.05, '#f3ede2'); g.globalCompositeOperation = 'source-over';
    const panneauVert = (x0, x1) => {
      const y0 = 5.35, y1 = 11.05;
      R(x0, y0, x1, y1, '#2b553c');
      for (let px = X(x0); px < X(x1); px += 3) { g.fillStyle = r() < 0.5 ? 'rgba(18,40,27,0.18)' : 'rgba(80,130,95,0.12)'; g.fillRect(px, Y(y1), 1.5, (y1 - y0) * K); }
      // lambrequin doré en bas
      g.fillStyle = orGrad(g, 0, Y(6.45), 0, Y(y0)); g.fillRect(X(x0), Y(6.45), (x1 - x0) * K, 1.1 * K);
      for (let xx = x0 + 0.25; xx < x1 - 0.1; xx += 0.46) {
        g.fillStyle = '#2b553c'; g.beginPath(); g.ellipse(X(xx), Y(6.45), 0.17 * K, 0.42 * K, 0, 0, Math.PI); g.fill();
        g.fillStyle = OR_C; g.beginPath(); g.arc(X(xx + 0.23), Y(5.75), 0.07 * K, 0, 7); g.fill();
      }
      // cadre doré
      cadre(x0 + 0.14, y0 + 1.2, x1 - 0.14, y1 - 0.14, 0.06, OR); cadre(x0 + 0.26, y0 + 1.32, x1 - 0.26, y1 - 0.26, 0.02, OR_C);
      // motif vertical central : vase, rinceaux, médaillon, couronne
      const cx = X((x0 + x1) / 2); g.strokeStyle = OR; g.fillStyle = OR; g.lineCap = 'round';
      g.lineWidth = 0.035 * K; g.beginPath(); g.moveTo(cx, Y(6.9)); g.lineTo(cx, Y(10.4)); g.stroke();
      g.beginPath(); g.moveTo(cx - 0.25 * K, Y(6.75)); g.lineTo(cx + 0.25 * K, Y(6.75)); g.lineTo(cx + 0.14 * K, Y(7.2)); g.lineTo(cx - 0.14 * K, Y(7.2)); g.closePath(); g.fill();
      g.lineWidth = 0.05 * K;
      for (let k = 0; k < 4; k++) {
        const yy = 7.3 + k * 0.62, l = 0.75 - Math.abs(k - 1.5) * 0.18;
        for (const s of [-1, 1]) {
          g.beginPath(); g.moveTo(cx, Y(yy)); g.bezierCurveTo(cx + s * l * 0.5 * K, Y(yy + 0.45), cx + s * l * K, Y(yy + 0.05), cx + s * l * 0.8 * K, Y(yy - 0.15)); g.stroke();
          g.beginPath(); g.arc(cx + s * l * 0.78 * K, Y(yy - 0.08), 0.07 * K, 0, 7); g.stroke();
        }
      }
      g.lineWidth = 0.06 * K; g.beginPath(); g.ellipse(cx, Y(9.1), 0.36 * K, 0.5 * K, 0, 0, 7); g.stroke();
      g.fillStyle = '#21452f'; g.fill(); g.lineWidth = 0.02 * K; g.strokeStyle = OR_C; g.beginPath(); g.ellipse(cx, Y(9.1), 0.24 * K, 0.36 * K, 0, 0, 7); g.stroke();
      g.fillStyle = OR; for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(cx + k * 0.12 * K, Y(10.45), 0.05 * K, 0.16 * K, k * 0.35, 0, 7); g.fill(); }
    };
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const a = 10.0 + k * 4.66, b = a + 4.46;
      if (s > 0) panneauVert(a, b); else panneauVert(-b, -a);
      const p = s > 0 ? b : -a; g.fillStyle = orGrad(g, X(p), 0, X(p + 0.2), 0); g.fillRect(X(p), Y(11.05), 0.2 * K, 5.7 * K);
    }
    // tapisserie centrale et son cadre doré
    g.fillStyle = orGrad(g, X(-4.62), 0, X(4.62), 0); g.fillRect(X(-4.62), Y(10.5), 9.24 * K, 4.86 * K);
    tapisserie(g, X(-4.42), Y(10.3), 8.84 * K, 4.46 * K);
    // niches à statues
    for (const cxm of [-7.2, 7.2]) {
      const cx = X(cxm), rr = 1.05 * K, yb = Y(5.55), yc = Y(8.85);
      const d = g.createLinearGradient(cx - rr, 0, cx + rr, 0); d.addColorStop(0, '#c9bea9'); d.addColorStop(0.5, '#ece4d4'); d.addColorStop(1, '#bfb39c');
      g.fillStyle = d; g.beginPath(); g.moveTo(cx - rr, yb); g.lineTo(cx - rr, yc); g.arc(cx, yc, rr, Math.PI, 0); g.lineTo(cx + rr, yb); g.closePath(); g.fill();
      g.strokeStyle = OR; g.lineWidth = 0.05 * K; g.beginPath(); g.arc(cx, yc, rr + 0.1 * K, Math.PI, 0); g.stroke();
      g.lineWidth = 0.02 * K; g.beginPath(); g.arc(cx, yc, rr + 0.24 * K, Math.PI, 0); g.stroke();
      g.fillStyle = 'rgba(80,60,40,0.12)'; g.beginPath(); g.arc(cx, yc, rr * 0.92, Math.PI, 0); g.fill();
    }
    filetOr(5.32, 0.06); filetOr(11.0, 0.06);
    // entablement : denticules et oves
    R(-24, 11.05, 24, 12.25, '#f0eadf');
    for (let x = -24; x < 24; x += 0.2) R(x, 11.45, x + 0.1, 11.68, '#d6ccba');
    g.fillStyle = OR; for (let x = -23.85; x < 24; x += 0.3) { g.beginPath(); g.ellipse(X(x), Y(11.87), 0.06 * K, 0.09 * K, 0, 0, 7); g.fill(); }
    filetOr(11.38, 0.03); filetOr(12.18, 0.07);
    // attique : panneau « République française » entre deux reliefs
    R(-24, 12.25, 24, 14, '#e9e1cf');
    basRelief(g, X(-11.5), Y(13.85), 5.4 * K, 1.4 * K, 41, '#e4dccc'); basRelief(g, X(6.1), Y(13.85), 5.4 * K, 1.4 * K, 43, '#e4dccc');
    g.fillStyle = motif(blanc, 3 * K / 1024); g.fillRect(X(-5.8), Y(13.95), 11.6 * K, 1.6 * K);
    cadre(-5.8, 12.35, 5.8, 13.95, 0.04, OR);
    g.font = `600 ${Math.round(0.42 * K)}px Georgia, 'Times New Roman', serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText('RÉPUBLIQUE FRANÇAISE', X(0) + 1.5, Y(13.15) + 1.5);
    g.fillStyle = '#8c7c5e'; g.fillText('RÉPUBLIQUE FRANÇAISE', X(0), Y(13.15));
    return c;
  }

  // Façade des loges : crème, moulures et rinceaux dorés (une travée = une tuile).
  function tuileLoge() {
    const W = 512, H = 128, c = toile(W, H), g = c.getContext('2d');
    g.fillStyle = '#efe6d3'; g.fillRect(0, 0, W, H);
    g.fillStyle = orGrad(g, 0, 0, 0, 14); g.fillRect(0, 0, W, 14); g.fillStyle = orGrad(g, 0, H - 12, 0, H); g.fillRect(0, H - 12, W, 12);
    g.strokeStyle = OR; g.lineWidth = 3;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.arc(x + 20, 64, 14, Math.PI * 0.1, Math.PI * 1.1); g.stroke(); g.beginPath(); g.arc(x + 40, 64, 14, Math.PI * 1.1, Math.PI * 2.1); g.stroke(); }
    g.fillStyle = OR_C; for (let x = 20; x < W; x += 40) { g.beginPath(); g.arc(x, 64, 4, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(160,130,70,0.6)'; g.lineWidth = 2; g.strokeRect(6, 22, W - 12, H - 44);
    return c;
  }
  // Mur rouge des galeries : tenture damassée, baguettes dorées, une porte par travée.
  function tuileTenture() {
    const W = 512, H = 512, c = toile(W, H), g = c.getContext('2d'), r = MAT.rng(9);
    g.fillStyle = '#7a1418'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < W; x += 32) { g.fillStyle = 'rgba(160,40,44,0.35)'; g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 6, y + 16); g.lineTo(x, y + 24); g.lineTo(x - 6, y + 16); g.closePath(); g.fill(); }
    for (let i = 0; i < 2000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,120,120,0.04)'; g.fillRect(r() * W, r() * H, 2, 6); }
    g.fillStyle = orGrad(g, 0, 0, 14, 0); g.fillRect(0, 0, 14, H); g.fillStyle = orGrad(g, W - 14, 0, W, 0); g.fillRect(W - 14, 0, 14, H);
    g.fillStyle = '#3a0b0d'; g.fillRect(206, 250, 100, H - 250); g.strokeStyle = OR; g.lineWidth = 5; g.strokeRect(200, 244, 112, H - 240);
    g.lineWidth = 3; g.strokeRect(186, 120, 140, 96); g.fillStyle = '#5e0f12'; g.fillRect(190, 124, 132, 88);
    return c;
  }
  // Soubassement des galeries : marbre, une ouverture sombre par travée.
  function tuileSoubassement() {
    const W = 512, H = 330, c = toile(W, H), g = c.getContext('2d');
    const p = g.createPattern(MAT.marbre(17, 'gris-rose').c, 'repeat'); p.setTransform(new DOMMatrix().scale(0.5, 0.5)); g.fillStyle = p; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#c0a690'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#efe8dc'; g.fillRect(196, 70, 120, H - 70); g.fillStyle = '#24130f'; g.fillRect(212, 88, 88, H - 88);
    g.fillStyle = '#efe8dc'; g.fillRect(0, 0, W, 10);
    return c;
  }
  // Dessus du dossier de l'hémicycle : marbre crème clouté d'or (le liseré clair de la vue du dessus).
  function tuileDossier() {
    const W = 256, H = 64, c = toile(W, H), g = c.getContext('2d');
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, W, H);
    g.fillStyle = orGrad(g, 0, 0, 0, 8); g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6);
    const d = g.createRadialGradient(126, 30, 1, 128, 32, 11); d.addColorStop(0, '#fff2c4'); d.addColorStop(0.5, OR); d.addColorStop(1, '#7a5a1d');
    g.fillStyle = d; g.beginPath(); g.arc(128, 32, 10, 0, 7); g.fill();
    return c;
  }
  // Frise peinte à la base de la coupole : panneaux encadrés d'or.
  function tuileFrise() {
    const W = 1024, H = 192, c = toile(W, H), g = c.getContext('2d'), r = MAT.rng(13);
    g.fillStyle = orGrad(g, 0, 0, 0, H); g.fillRect(0, 0, W, H);
    for (let k = 0; k < 2; k++) {
      const x = k * 512 + 16, w = 480, y = 18, h = H - 36;
      const d = g.createLinearGradient(0, y, 0, y + h); d.addColorStop(0, '#b8cbd0'); d.addColorStop(0.5, '#e7d9b6'); d.addColorStop(1, '#b89d6e');
      g.fillStyle = d; g.fillRect(x, y, w, h);
      for (let i = 0; i < 16; i++) {
        const fx = x + 20 + r() * (w - 40), s = h * (0.45 + r() * 0.25), fy = y + h * (0.88 + r() * 0.08);
        g.fillStyle = ['#8d2a22', '#ece4cf', '#2f4f7a', '#b9533a', '#d9b97a'][Math.floor(r() * 5)];
        g.beginPath(); g.ellipse(fx, fy - s * 0.42, s * 0.15, s * 0.42, (r() - 0.5) * 0.5, 0, 7); g.fill();
        g.fillStyle = '#d6a47e'; g.beginPath(); g.arc(fx, fy - s * 0.88, s * 0.08, 0, 7); g.fill();
      }
      g.strokeStyle = '#7a5a1d'; g.lineWidth = 4; g.strokeRect(x, y, w, h);
    }
    return c;
  }

  /* ---------------- Construction ---------------- */
  const ombre = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };
  function mat(o) { return new THREE.MeshStandardMaterial(o); }

  function construire() {
    const racine = G.racine, aMur = [-21, 201];
    const rTop = P.R0 + P.NR * P.D;

    // 1. On retire ce qui est remplacé : l'ancien mur des galeries et sa balustrade de balustres ;
    //    le tympan passe avec la coupole (il ne doit pas apparaître dans la vue du dessus).
    let tympan = null;
    racine.traverse(o => {
      if (!o.isMesh) return;
      if (o.material === M.galerie || o.material === M.balustre) o.visible = false;
      if (o.geometry && o.geometry.type === 'CircleGeometry' && o.material === M.stuc) tympan = o;
    });
    if (tympan) G.plafond.attach(tympan);

    // 2. Le mur du perchoir repeint
    const cm = murPerchoir();
    M.mur.map = texC(cm, { clamp: true }); M.mur.bumpMap = texC(cm, { clamp: true }); M.mur.bumpMap.encoding = THREE.LinearEncoding;
    M.mur.bumpScale = 0.012; M.mur.roughness = 0.55; M.mur.needsUpdate = true;
    // cadre doré de la tapisserie, en relief
    for (const [w, h, x, y] of [[9.3, 0.16, 0, 10.5], [9.3, 0.16, 0, 5.68], [0.16, 4.98, -4.6, 8.09], [0.16, 4.98, 4.6, 8.09]]) {
      const b = new THREE.Mesh(O.boiteRonde(w, h, 0.12, 0.03, 2), M.or); b.position.set(x, y, P.ZFOND + 0.07); racine.add(ombre(b));
    }
    // statues dans les niches, sur leur piédestal
    const marbreStatue = new THREE.MeshPhysicalMaterial({ color: 0xf1ece4, map: M.statuaire.map, roughness: 0.42, clearcoat: 0.25, envMapIntensity: 0.6 });
    const robe = new THREE.LatheGeometry([[0.001, 0], [0.34, 0], [0.31, 0.14], [0.27, 0.8], [0.2, 1.35], [0.25, 1.52], [0.14, 1.68], [0.001, 1.72]].map(([a, b]) => new THREE.Vector2(a, b)), 28);
    for (const s of [-1, 1]) {
      const st = new THREE.Group();
      const ped = new THREE.Mesh(O.boiteRonde(1.0, 0.55, 0.55, 0.04, 2), M.statuaire); ped.position.y = 0.275; st.add(ped);
      const corps = new THREE.Mesh(robe, marbreStatue); corps.position.y = 0.55; st.add(corps);
      const tete = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), marbreStatue); tete.position.y = 0.55 + 1.86; st.add(tete);
      const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.5, 8), marbreStatue); lance.position.set(s * 0.36, 0.55 + 1.2, 0.05); st.add(lance);
      const bras = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.6, 10), marbreStatue); bras.position.set(s * 0.25, 0.55 + 1.33, 0.06); bras.rotation.z = -s * 0.9; st.add(bras);
      st.position.set(s * 7.2, 5.3, P.ZFOND + 0.42); st.traverse(o => { if (o.isMesh) ombre(o); });
      racine.add(st);
    }

    // 3. Les galeries du public : soubassement en marbre, tenture rouge, façade crème et or, draperies, banquettes
    const baie = r => r * rad(12); // une travée = l'écart entre deux colonnes
    const tSoub = texC(tuileSoubassement(), { offset: 0.5 }), tTent = texC(tuileTenture(), { offset: 0.5 }), tLoge = texC(tuileLoge(), { offset: 0.5 });
    const mSoub = mat({ map: tSoub, roughness: 0.35, envMapIntensity: 0.6 }), mSombre = mat({ color: 0x24130f, roughness: 0.9 });
    const mTent = mat({ map: tTent, roughness: 0.85, envMapIntensity: 0.3 });
    const mLoge = mat({ map: tLoge, roughness: 0.5, metalness: 0.15, envMapIntensity: 0.8, side: THREE.DoubleSide });
    racine.add(ombre(new THREE.Mesh(O.balayage([[24.6, 0], [24.6, P.YTOP], [24.6, 8.05]], aMur[0], aMur[1], { echelle: baie(24.6), rRef: 24.6, vNorm: true, inverse: true, mats: [0, 1] }), [mSombre, mSoub]), false));
    racine.add(ombre(new THREE.Mesh(O.balayage([[24.6, 8.05], [24.6, P.YENT]], aMur[0], aMur[1], { echelle: baie(24.6), rRef: 24.6, vNorm: true, inverse: true }), mTent), false));
    racine.add(ombre(new THREE.Mesh(O.balayage([[21.62, 8.22], [24.6, 8.22]], aMur[0], aMur[1], { inverse: true, echelle: 1.4 }), M.moquette), false));
    racine.add(ombre(new THREE.Mesh(O.balayage([[21.62, 7.95], [21.62, 9.05]], aMur[0], aMur[1], { echelle: baie(21.62), rRef: 21.62, vNorm: true, inverse: true }), mLoge)));
    racine.add(ombre(new THREE.Mesh(O.balayage([[21.5, 9.05], [21.9, 9.05]], aMur[0], aMur[1], { inverse: true, echelle: 1 }), M.veloursRouge)));
    for (const rb of [22.25, 23.3]) {
      racine.add(ombre(new THREE.Mesh(O.balayage([[rb, 8.22], [rb, 8.66], [rb + 0.5, 8.66], [rb + 0.5, 8.22]], -12, 192, { inverse: true, echelle: 1 }), M.veloursRouge)));
    }
    // draperies : deux festons rouges par travée, frange dorée, glands aux colonnes
    const plis = [], franges = [], glands = [];
    const pt = (r, a, y) => new THREE.Vector3(r * Math.cos(rad(a)), y, r * Math.sin(rad(a)));
    for (let k = 0; k < 14; k++) {
      const a0 = P.TH0 + 12 * k + 1.1, a1 = P.TH0 + 12 * (k + 1) - 1.1, am = (a0 + a1) / 2;
      for (const [b0, b1] of [[a0, am], [am, a1]]) {
        const bm = (b0 + b1) / 2;
        const c1 = new THREE.QuadraticBezierCurve3(pt(21.46, b0, 9.02), pt(21.4, bm, 7.95), pt(21.46, b1, 9.02));
        const c2 = new THREE.QuadraticBezierCurve3(pt(21.43, b0, 8.9), pt(21.37, bm, 7.83), pt(21.43, b1, 8.9));
        plis.push([new THREE.TubeGeometry(c1, 20, 0.12, 8, false), null]);
        franges.push([new THREE.TubeGeometry(c2, 20, 0.035, 6, false), null]);
      }
      for (const a of [a0, am, a1]) { const p = pt(21.42, a, 8.75); glands.push([new THREE.CylinderGeometry(0.025, 0.075, 0.34, 10), O.mat4(p.x, p.y, p.z)]); }
    }
    racine.add(ombre(new THREE.Mesh(O.fusion(plis), M.veloursRouge)));
    racine.add(ombre(new THREE.Mesh(O.fusion(franges.concat(glands)), M.or)));

    // 4. Le dossier de l'hémicycle : lambris derrière le dernier rang, dessus en marbre crème clouté d'or
    const yD = P.YTOP + 0.95, mDos = mat({ map: texC(tuileDossier()), roughness: 0.38, metalness: 0.1, envMapIntensity: 0.8 });
    racine.add(ombre(new THREE.Mesh(O.balayage([[rTop, P.YTOP], [rTop, yD]], P.TH0 - 1.5, P.TH1 + 1.5, { inverse: true, echelle: 1.4 }), M.panneau)));
    racine.add(ombre(new THREE.Mesh(O.balayage([[rTop - 0.02, yD], [rTop + 0.28, yD]], P.TH0 - 1.5, P.TH1 + 1.5, { inverse: true, echelle: 0.62, rRef: rTop + 0.13, vNorm: true }), mDos)));
    racine.add(ombre(new THREE.Mesh(O.balayage([[rTop + 0.28, yD], [rTop + 0.28, P.YTOP]], P.TH0 - 1.5, P.TH1 + 1.5, { inverse: true, echelle: 1.4 }), M.noyer)));

    // 5. Frise peinte à la base de la coupole (masquée avec la coupole dans la vue du dessus)
    const mFrise = mat({ map: texC(tuileFrise()), roughness: 0.6, metalness: 0.1, envMapIntensity: 0.7 });
    G.plafond.add(new THREE.Mesh(O.balayage([[22.35, P.YCOR + 0.02], [22.35, P.YCOR + 1.35]], 0, 180, { echelle: 8.8, rRef: 22.35, vNorm: true, inverse: true }), mFrise));

    // 6. Ce que la vue du dessus voit autour de la salle : le plafond doré des galeries, vu d'en haut,
    //    jusqu'aux bords de l'écran. Invisible de l'intérieur (il ne regarde que vers le haut), sans ombre portée.
    const mPlaf = M.caissonBerceau.clone();
    for (const k of ['map', 'bumpMap', 'metalnessMap', 'roughnessMap']) if (M.caissonBerceau[k]) { mPlaf[k] = M.caissonBerceau[k].clone(); mPlaf[k].needsUpdate = true; mPlaf[k].repeat.set(1, 1); }
    mPlaf.side = THREE.FrontSide; mPlaf.envMapIntensity = 0.75;
    const couronne = new THREE.Mesh(O.balayage([[22.9, P.YCOR + 0.05], [60, P.YCOR + 0.05]], -32, 212, { inverse: true, echelle: 2.4 }), mPlaf);
    couronne.castShadow = false; couronne.receiveShadow = false; racine.add(couronne);
    const mPlaf2 = mPlaf.clone();
    for (const k of ['map', 'bumpMap', 'metalnessMap', 'roughnessMap']) if (mPlaf[k]) { mPlaf2[k] = mPlaf[k].clone(); mPlaf2[k].needsUpdate = true; mPlaf2[k].repeat.set(120 / 2.4, 50 / 2.4); }
    const fond = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), mPlaf2);
    fond.rotation.x = -Math.PI / 2; fond.position.set(0, P.YCOR + 0.03, P.ZFOND - 25.02); fond.castShadow = false; racine.add(fond);
  }

  /* ---------------- Le dévoilement d'un vote (illustratif) ---------------- */
  const VOTE = { pour: 287, contre: 236, abst: 31, absent: 19, nv: 4 };
  const COUL = { pour: 0x2F7BFF, contre: 0xFF6A3D, abst: 0xFFC531, absent: 0x8A8A8A, nv: 0xEDE6D6 };
  let couleurs = null, anim = null;
  function tirage(graine) {
    const l = []; for (const [k, n] of Object.entries(VOTE)) for (let i = 0; i < n; i++) l.push(k);
    const r = MAT.rng(graine); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
    return l;
  }
  // Le velours prend la couleur du vote, siège par siège, du premier rang vers le haut.
  function teindre(vers, opt = {}) {
    const n = S.sieges.length, r = MAT.rng(opt.graine || 3);
    const depart = couleurs.map(c => c.clone());
    const delai = S.sieges.map(s => (opt.inverse ? (12 - s.rang) : s.rang) * 0.11 + r() * 0.09), D = 0.34;
    const fin = Math.max(...delai) + D, t0 = performance.now(), tmp = new THREE.Color();
    if (anim) cancelAnimationFrame(anim);
    const appliquer = el => {
      for (let k = 0; k < n; k++) {
        let t = Math.min(1, Math.max(0, (el - delai[k]) / D)); t = t * t * (3 - 2 * t);
        tmp.copy(depart[k]).lerp(vers[k], t); I.velours.setColorAt(k, tmp); if (t === 1) couleurs[k].copy(vers[k]);
      }
      I.velours.instanceColor.needsUpdate = true; S.rendre();
    };
    return new Promise(res => {
      if (opt.instant) { appliquer(1e9); res(); return; }
      const pas = now => { const el = (now - t0) / 1000; appliquer(el); if (el < fin) anim = requestAnimationFrame(pas); else { anim = null; res(); } };
      anim = requestAnimationFrame(pas);
    });
  }
  function devoiler(opt = {}) {
    const l = tirage(opt.graine || 11);
    const vers = l.map(v => new THREE.Color(COUL[v]).convertSRGBToLinear().multiplyScalar(v === 'nv' ? 0.95 : 1.0));
    return teindre(vers, opt);
  }
  function retablir(opt = {}) { return teindre(S.sieges.map(() => G.rouge.clone()), { ...opt, inverse: true }); }

  function init(salle) {
    S = salle; const x = S._int; scene = x.scene; M = x.M; G = x.G; I = x.I; P = S.P; O = S.outils;
    construire();
    // sol de marbre plus sombre et moins verni : vu d'en haut, il ne renvoie plus la lumière en blanc
    M.sol.color.setHex(0x2a221d); M.sol.clearcoat = 0.15; M.sol.roughness = 0.45; M.sol.envMapIntensity = 0.3; M.sol.needsUpdate = true;
    couleurs = S.sieges.map(() => G.rouge.clone());
  }
  return { init, devoiler, retablir, VOTE, COUL };
})();
