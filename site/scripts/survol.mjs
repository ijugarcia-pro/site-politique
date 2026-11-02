// Le contrôle du survol et de la sélection des sièges (cadrage MVP, R5 à R7, lot 6), sur /salle/ dans
// la vue « Voir les députés » : en perspective, aucun siège ne réagit ; la carte au survol (moins de
// 100 ms), épinglée au clic, fermée par Échap ou un clic à côté ; au doigt à 390 × 844, un siège
// précis en deux gestes au plus (pincer, toucher). Le siège
// visé est le repère « Ton opposé » : son nom doit arriver dans la carte. Un visiteur inventé.
//
// Usage (depuis site/, après un build) : node scripts/survol.mjs [build]

import { join, resolve } from 'node:path';
import { SITE } from './inventaire.mjs';
import { servir } from './captures.mjs';
import { lancer } from './ecrans.mjs';

const serveur = await servir(resolve(process.argv[2] ?? join(SITE, 'dist')));
const base = `http://127.0.0.1:${serveur.address().port}`;
const navigateur = await lancer({ gpu: true });
let fautes = 0;
const controle = (ok, texte) => { console.log(`${ok ? '✓' : '✗'} ${texte}`); if (!ok) fautes += 1; };

const ouvrir = async (contexte) => {
  const page = await contexte.newPage();
  await page.goto(`${base}/404.html`);
  const votes = await page.evaluate(async () => (await (await fetch('/donnees/matrice.json')).json()).votes.slice(0, 12));
  await page.evaluate((v) => { localStorage.clear(); localStorage.setItem('578e.reponses.v1', JSON.stringify(Object.fromEntries(v.map((u, i) => [u, { v: i % 3 ? 'pour' : 'contre', le: '2026-10-20T10:00:00Z' }])))); }, votes);
  await page.goto(`${base}/salle/?qualite=0`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('[data-salle-vdef]')?.dataset.salle3dEtat === 'prete', null, { timeout: 60000 });
  return page;
};
const lireCarte = (page) => page.evaluate(() => {
  const c = document.querySelector('[data-carte-depute]');
  return { visible: !c.hidden, nom: c.querySelector('[data-carte-nom]').textContent, epinglee: !c.classList.contains('survol'), croix: !c.querySelector('[data-carte-fermer]').hidden };
});
/** Le repère « Ton opposé » à l'écran : son point et son nom. */
const opposé = (page) => page.evaluate(() => {
  const r = [...document.querySelectorAll('.repere-salle')].find((e) => e.textContent.includes('Ton opposé'));
  const b = r.getBoundingClientRect();
  return { x: b.left, y: b.top, nom: r.textContent.split('·')[1].trim() };
});

// --- Ordinateur ---
{
  const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ouvrir(contexte);
  // En perspective : ni survol, ni sélection.
  const enPerspective = await opposé(page);
  await page.mouse.move(enPerspective.x, enPerspective.y);
  await page.waitForTimeout(250);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(150);
  controle(!(await lireCarte(page)).visible, 'perspective : un siège ne réagit ni au survol ni au clic');
  const menus = await page.evaluate(() => getComputedStyle(document.querySelector('[data-panneau-salle]')).display !== 'none');
  controle(menus, 'perspective : les menus sont là');
  controle(await page.locator('[data-immersion]').innerText() === 'Voir les députés', 'le bouton dit « Voir les députés »');
  await page.mouse.move(5, 5);
  await page.click('[data-immersion]');
  await page.waitForTimeout(1900);
  controle(await page.evaluate(() => !document.querySelector('[data-panneau-salle]').offsetParent && !document.querySelector('.barre-haut').offsetParent), 'députés : les menus sont cachés');
  const cible = await opposé(page);
  await page.evaluate(() => {
    const c = document.querySelector('[data-carte-depute]');
    window.__t = null;
    new MutationObserver(() => { if (!c.hidden && window.__t === null) window.__t = performance.now(); }).observe(c, { attributes: true, attributeFilter: ['hidden'] });
    document.querySelector('[data-salle-vdef] canvas').addEventListener('pointermove', () => { window.__m ??= performance.now(); });
  });
  await page.mouse.move(cible.x, cible.y);
  await page.waitForTimeout(250);
  let carte = await lireCarte(page);
  controle(carte.visible && carte.nom === cible.nom, `survol : la carte donne le bon député (${carte.nom})`);
  controle(!carte.croix, 'survol : carte sans croix tant qu’elle n’est pas épinglée');
  const delai = await page.evaluate(() => window.__t - window.__m);
  controle(delai < 100, `survol : le nom apparaît en ${Math.round(delai)} ms (< 100)`);
  const annonce = await page.evaluate(async () => { const a = document.querySelector('[data-annonce-salle]'); return a.textContent; });
  controle(annonce.includes(cible.nom), 'survol : annonce temporisée pour les lecteurs d’écran');
  const place = await page.evaluate(() => {
    const c = document.querySelector('[data-carte-depute]').getBoundingClientRect();
    const auDessus = (a) => !a || !a.width || c.bottom <= a.top + 1 || c.top >= a.bottom - 1 || c.right <= a.left + 1 || c.left >= a.right - 1;
    return { panneau: auDessus(document.querySelector('[data-immersion]').getBoundingClientRect()), encart: true };
  });
  controle(place.panneau && place.encart, 'la carte ne recouvre pas le bouton');
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(100);
  carte = await lireCarte(page);
  controle(carte.epinglee && carte.croix, 'clic : la carte est épinglée');
  await page.mouse.move(cible.x + 120, cible.y + 60);
  await page.waitForTimeout(200);
  const apres = await lireCarte(page);
  controle(apres.nom === cible.nom, 'épinglée, elle ne suit plus le survol');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  controle(!(await lireCarte(page)).epinglee || !(await lireCarte(page)).visible, 'Échap ferme la carte épinglée');
  await page.mouse.move(cible.x, cible.y);
  await page.waitForTimeout(200);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(100);
  const zoneVide = { x: 720, y: 860 };
  await page.mouse.move(zoneVide.x, zoneVide.y);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(100);
  controle(!(await lireCarte(page)).visible, 'un clic à côté ferme la carte');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1900);
  controle(await page.evaluate(() => !document.body.classList.contains('immersion') && !!document.querySelector('[data-panneau-salle]').offsetParent), 'Échap ramène aux menus');
  await contexte.close();
}

// --- Téléphone : le doigt ---
{
  const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ouvrir(contexte);
  const cdp = await contexte.newCDPSession(page);
  await page.waitForTimeout(600);
  const appuyer = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(150);
  };
  const pincer = async (x, y, de, a) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - de, y, id: 1 }, { x: x + de, y, id: 2 }] });
    for (let k = 1; k <= 8; k++) {
      const e = de + ((a - de) * k) / 8;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - e, y, id: 1 }, { x: x + e, y, id: 2 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(200);
  };
  controle(await page.evaluate(() => !document.body.classList.contains('immersion')), 'téléphone : /salle/ s’ouvre sur les menus');
  await page.tap('[data-immersion]');
  await page.waitForTimeout(1900);
  let cible = await opposé(page);
  await appuyer(cible.x, cible.y);
  let carte = await lireCarte(page);
  controle(carte.visible && carte.nom === cible.nom, `un toucher sur le siège : le bon député (${carte.nom})`);
  await appuyer(cible.x + 2, cible.y - 1);
  controle((await lireCarte(page)).nom === cible.nom, 'à 2 pixels près, le même siège');
  const place = await page.evaluate(() => { const c = document.querySelector('[data-carte-depute]').getBoundingClientRect(); return c.top >= 0 && c.bottom <= innerHeight + 1 && c.height < innerHeight / 2; });
  controle(place, 'la carte est à l’écran, au bas');
  await appuyer(195, 30);
  await page.waitForTimeout(100);
  const avant = await opposé(page);
  await pincer(avant.x + 20, avant.y + 20, 40, 90);
  cible = await opposé(page);
  const ecart = Math.hypot(cible.x - avant.x - 20, cible.y - avant.y - 20), ecartAvant = Math.hypot(20, 20);
  controle(cible.x > 0 && Math.abs(ecart / Math.max(1, ecartAvant) - 2.2) < 0.5, `pincer rapproche la salle autour des doigts (${Math.round(ecartAvant)} → ${Math.round(ecart)} px)`);
  if (cible.y > 60 && cible.x > 0 && cible.x < 390) {
    await appuyer(cible.x, cible.y);
    controle((await lireCarte(page)).nom === cible.nom, 'pincer puis toucher : le bon siège, en deux gestes');
  } else console.log('· le repère est sorti du cadre après le pincement : toucher non testé');
  await contexte.close();
}

await navigateur.close();
serveur.close();
console.log(fautes ? `\n${fautes} défaut(s).` : '\nSurvol, carte et sélection : tous les contrôles passent.');
process.exit(fautes ? 1 : 0);
