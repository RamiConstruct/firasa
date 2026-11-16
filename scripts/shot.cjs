const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:8787/';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.screenshot({ path: 'shots/home.png', fullPage: true });
  await p.click('button[data-go=play]');
  await p.waitForSelector('.gb.u', { timeout: 15000 });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/game.png' });
  await p.screenshot({ path: 'shots/game_full.png', fullPage: true });
  for (let k = 0; k < 4; k++) {
    await p.click(k % 2 ? '.gb.d' : '.gb.u');
    await p.waitForSelector('#nextB', { timeout: 8000 });
    await p.waitForTimeout(1400);
    if (k === 0) { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: 'shots/result.png', fullPage: true }); }
    await p.click('#nextB'); await p.waitForSelector('.gb.u', { timeout: 15000 });
  }
  for (const pane of ['cvd', 'rsi', 'macd', 'book', 'oi', 'ls']) { const el = await p.$(`#pn button[data-k=${pane}]:not([disabled])`); if (el) { await el.click(); await p.waitForTimeout(100); } }
  await p.screenshot({ path: 'shots/game2.png' });
  await p.click('button[data-go=stats]'); await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/stats.png', fullPage: true });
  console.log(errs.length ? errs.join('\n') : 'aucune erreur JS');
  await b.close();
})();
