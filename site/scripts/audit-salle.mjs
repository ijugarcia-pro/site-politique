// L'audit de la salle 3D : ce qui coûte, mesuré. Pour chaque vue : appels de dessin, triangles (par
// matière), temps d'une image côté processeur et côté carte graphique (readPixels après le rendu
// attend que la carte ait fini), puis le même temps sans tel ou tel élément ; plus les textures et le
// découpage de l'ouverture. Vraie carte graphique. Sert à décider quoi alléger, puis à vérifier.
// Passe par la page interne /vdef-composants/place/ et `?perf=1` (salle3d/scene.ts, __audit).
//
// Usage (depuis site/, après un build) : node scripts/audit-salle.mjs [build] [--json=<fichier>] [--retraits]

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const args = process.argv.slice(2);
const dossier = args.find((a) => !a.startsWith('--'));
const fichier = args.find((a) => a.startsWith('--json='))?.split('=')[1];
const RETRAITS = args.includes('--retraits');
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: true });
const sortie = {};

for (const vue of ['salle', 'tribune', 'deputes']) {
  const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await contexte.newPage();
  const t0 = Date.now();
  await page.goto(`${base}/vdef-composants/place/?vue=${vue}&qualite=0&perf=1`);
  await page.waitForFunction(() => document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat === 'prete', null, { timeout: 120000 });
  const ouverture = Date.now() - t0;
  await page.addStyleTag({ content: '.sur-salle,.barre-haut,.barre-bas,.immersion,.salle-vdef .calque{display:none!important}' });
  await page.evaluate(() => dispatchEvent(new Event('resize')));
  await page.waitForTimeout(700);
  const r = await page.evaluate(async ({ retraits }) => {
    const { scene, renderer, camera } = window.__audit;
    const gl = renderer.getContext();
    const mesurer = async (n = 24) => {
      // Une nouvelle image demandée à chaque tour ; juste après elle, on attend la carte graphique.
      const cpu = [], gpu = [];
      const px = new Uint8Array(4);
      for (let k = 0; k < n; k++) {
        performance.clearMeasures('salle:rendre');
        window.__salle.cadre({});
        // eslint-disable-next-line no-await-in-loop
        await new Promise((ok) => requestAnimationFrame(() => {
          const t = performance.now();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          gpu.push(performance.now() - t);
          const m = performance.getEntriesByName('salle:rendre')[0];
          if (m) cpu.push(m.duration);
          ok();
        }));
      }
      const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1] ?? null;
      return { cpu: +med(cpu.slice(4))?.toFixed(1), gpu: +med(gpu.slice(4))?.toFixed(1), images: cpu.length };
    };
    const info = () => ({ appels: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programmes: renderer.info.programs?.length });
    const base = await mesurer();
    const infos = info();
    // Triangles et objets par matière.
    const parMatiere = new Map();
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const g = o.geometry, tris = (g.index ? g.index.count : g.attributes.position.count) / 3, nb = o.isInstancedMesh ? o.count : 1;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        const cle = m.name || m.type;
        const e = parMatiere.get(`${cle}#${m.uuid.slice(0, 4)}`) ?? { type: cle, objets: 0, triangles: 0, map: m.map?.image?.width ?? 0 };
        e.objets += 1; e.triangles += Math.round((tris * nb) / (Array.isArray(o.material) ? o.material.length : 1));
        parMatiere.set(`${cle}#${m.uuid.slice(0, 4)}`, e);
      }
    });
    const instances = [];
    scene.traverse((o) => { if (o.isInstancedMesh) instances.push({ nb: o.count, trisParInstance: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3, ombre: o.castShadow }); });
    const meshes = []; scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const lumieres = []; scene.traverse((o) => { if (o.isLight) lumieres.push({ t: o.type, ombre: o.castShadow }); });
    // Le temps sans tel élément.
    const essais = {};
    if (retraits) {
      const sans = async (nom, avant, apres) => { avant(); await new Promise((ok) => setTimeout(ok, 300)); await mesurer(10); essais[nom] = await mesurer(); apres(); };
      const points = []; scene.traverse((o) => { if (o.isPointLight) points.push(o); });
      await sans('sans lumière ponctuelle', () => points.forEach((l) => { l.visible = false; }), () => points.forEach((l) => { l.visible = true; }));
      const inst = []; scene.traverse((o) => { if (o.isInstancedMesh) inst.push(o); });
      await sans('sans instances', () => inst.forEach((l) => { l.visible = false; }), () => inst.forEach((l) => { l.visible = true; }));
      const lustres = points.filter((l) => l.distance === 30 || (l.distance === 16 && l.position.z < -5));
      await sans('sans les 12 lustres', () => lustres.forEach((l) => { l.visible = false; }), () => lustres.forEach((l) => { l.visible = true; }));
      const mats = new Set(); scene.traverse((o) => { for (const m of (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [])) mats.add(m); });
      const regler = (cle, v) => { const av = new Map(); for (const m of mats) if (m[cle] !== undefined && m[cle] !== null) { av.set(m, m[cle]); m[cle] = v; m.needsUpdate = true; } return () => { for (const [m, x] of av) { m[cle] = x; m.needsUpdate = true; } }; };
      let r1;
      await sans('sans vernis', () => { r1 = regler('clearcoat', 0); }, () => r1());
      await sans('sans relief', () => { r1 = regler('bumpMap', null); }, () => r1());
      const texs = new Set(); for (const m of mats) for (const k of ['map', 'bumpMap', 'roughnessMap', 'metalnessMap']) if (m[k]) texs.add(m[k]);
      await sans('anisotropie 2', () => { for (const x of texs) { x.anisotropy = 2; x.needsUpdate = true; } }, () => { for (const x of texs) { x.anisotropy = 8; x.needsUpdate = true; } });
      await sans('sans ombres reçues', () => { renderer.shadowMap.enabled = false; for (const m of mats) m.needsUpdate = true; }, () => { renderer.shadowMap.enabled = true; for (const m of mats) m.needsUpdate = true; });
      const ratio = renderer.getPixelRatio();
      await sans('densité 1', () => { renderer.setPixelRatio(1); }, () => { renderer.setPixelRatio(ratio); });
    }
    const textures = new Map();
    scene.traverse((o) => { for (const m of (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [])) for (const k of ['map', 'bumpMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) { const t = m[k]; if (t?.image?.width) textures.set(t.source.uuid, { l: t.image.width, h: t.image.height, n: (t.image.currentSrc || t.image.src || '').split('/').pop() }); } });
    const mem = [...textures.values()].sort((a, b) => b.l * b.h - a.l * a.h);
    const creation = performance.getEntriesByType('measure').filter((e) => e.name.startsWith('salle:creer:')).map((e) => [e.name.slice(12), Math.round(e.duration)]);
    return { base, infos, matieres: [...parMatiere.values()].sort((a, b) => b.triangles - a.triangles).slice(0, 14), instances, nbMeshes: meshes.length, lumieres: lumieres.length, essais,
      textures: { nb: mem.length, mo: +(mem.reduce((s, t) => s + t.l * t.h * 4 * 1.33, 0) / 1048576).toFixed(0), grandes: mem.slice(0, 8) }, creation };
  }, { retraits: RETRAITS });
  sortie[vue] = { ouverture, ...r };
  console.log(`\n== ${vue} · prête en ${ouverture} ms · image ${r.base.cpu} ms processeur, ${r.base.gpu} ms carte · ${r.infos.appels} appels, ${r.infos.triangles} triangles, ${r.nbMeshes} objets, ${r.lumieres} lumières`);
  for (const [nom, e] of Object.entries(r.essais)) console.log(`   ${nom} : ${e.cpu} ms processeur, ${e.gpu} ms carte`);
  if (vue === 'salle') {
    console.table(r.matieres);
    console.table(r.instances);
    console.log('textures', r.textures.nb, r.textures.mo, 'Mo sur la carte', JSON.stringify(r.textures.grandes));
    console.log('création', JSON.stringify(r.creation));
  }
  await contexte.close();
}
if (fichier) writeFileSync(fichier, JSON.stringify(sortie, null, 1));
await navigateur.close();
serveur.close();
