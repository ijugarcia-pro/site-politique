// Le contrôle des étiquettes (cadrage MVP, R8, lot 7) : des repères illustratifs sur des sièges
// voisins, puis écartés, en Dessus et en perspective, à 1 440 × 900 et 390 × 844 : aucune étiquette
// n'en recouvre une autre, et les captures gardent le cas « jumeau et opposé adjacents ».
//
// Usage (depuis site/, après un build) : node scripts/etiquettes.mjs <sortie> [build]

import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const [sortie, dossier] = process.argv.slice(2);
if (!sortie) { console.error('Usage : node scripts/etiquettes.mjs <sortie> [build]'); process.exit(1); }
mkdirSync(sortie, { recursive: true });
const serveur = await servir(resolve(dossier ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: true });
let fautes = 0;
const CAS = [['voisins', '300,301'], ['proches', '300,312,301,290'], ['ecartes', '40,300,520,160']];

for (const [l, h, d] of [[1440, 900, 1], [390, 844, 2]]) {
  for (const vue of ['dessus', 'salle']) {
    for (const [nom, reperes] of CAS) {
      const contexte = await navigateur.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: d });
      const page = await contexte.newPage();
      await page.goto(`${base}/vdef-composants/place/?vue=${vue}&qualite=0&reperes=${reperes}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat === 'prete', null, { timeout: 60000 });
      await page.waitForTimeout(900);
      const r = await page.evaluate(() => {
        const rects = [...document.querySelectorAll('.repere-salle:not([hidden]) .repere-libelle:not([hidden])')].map((e) => e.getBoundingClientRect());
        let n = 0;
        rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => { if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) n += 1; }));
        return { etiquettes: rects.length, recouvrements: n, hors: rects.filter((a) => a.left < -1 || a.top < -1 || a.right > innerWidth + 1 || a.bottom > innerHeight + 1).length };
      });
      const ok = r.recouvrements === 0 && r.hors === 0 && r.etiquettes > 0;
      console.log(`${ok ? '✓' : '✗'} ${l}×${h} ${vue} ${nom} : ${r.etiquettes} étiquette(s), ${r.recouvrements} recouvrement(s), ${r.hors} hors du cadre`);
      if (!ok) fautes += 1;
      await page.screenshot({ path: join(sortie, `${l}x${h}-${vue}-${nom}.jpg`), type: 'jpeg', quality: 80 });
      await contexte.close();
    }
  }
}
await navigateur.close();
serveur.close();
console.log(fautes ? `\n${fautes} défaut(s).` : '\nÉtiquettes : aucun recouvrement.');
process.exit(fautes ? 1 : 0);
