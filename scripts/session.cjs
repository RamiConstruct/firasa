const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:8787/';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.click('#sLen button[data-v="25"]');
  await p.click('button[data-go=play]');
  const t0 = Date.now();
  for (let k = 0; k < 25; k++) {
    await p.waitForSelector('.gb.u', { timeout: 20000 });
    if (k === 3) await p.click('#conf button[data-v=forte]');
    await p.click(Math.random() < 0.5 ? '.gb.d' : '.gb.u');
    await p.waitForSelector('#nextB', { timeout: 8000 });
    await p.click('#nextB');
  }
  await p.waitForSelector('.bigscore', { timeout: 10000 });
  console.log('25 coups en', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/end.png', fullPage: true });
  await p.click('button[data-go=stats]'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/stats.png', fullPage: true });
  console.log(errs.length ? errs.join('\n') : 'aucune erreur JS');
  await b.close();
})();
