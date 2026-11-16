const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const base = process.argv[2] || 'http://localhost:8787/';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = [];
  for (const lang of ['en', 'fr']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang === 'en' ? 'en-US' : 'fr-FR' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(lang + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(lang + ' CONSOLE ' + m.text()); });
    await p.goto(base, { waitUntil: 'networkidle' });
    await p.screenshot({ path: `shots/${lang}_home.png`, fullPage: true });
    await p.click('#sLen button[data-v="25"]');
    await p.click('button[data-go=play]');
    for (let k = 0; k < 25; k++) {
      await p.waitForSelector('.gb.u', { timeout: 20000 });
      if (k === 0) await p.screenshot({ path: `shots/${lang}_game.png` });
      await p.click(Math.random() < 0.5 ? '.gb.d' : '.gb.u');
      await p.waitForSelector('#nextB', { timeout: 8000 });
      if (k === 0) { await p.waitForTimeout(1300); await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `shots/${lang}_result.png`, fullPage: true }); }
      if (k === 1) { await p.click('#langBtn'); await p.waitForTimeout(200); await p.click('#langBtn'); await p.waitForTimeout(200); }
      await p.click('#nextB');
    }
    await p.waitForSelector('.bigscore', { timeout: 10000 }); await p.waitForTimeout(300);
    await p.screenshot({ path: `shots/${lang}_end.png`, fullPage: true });
    await p.click('#langBtn'); await p.waitForTimeout(200); await p.click('#langBtn'); await p.waitForTimeout(200);
    await p.click('button[data-go=home]'); await p.click('button[data-go=signals]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `shots/${lang}_signals.png`, fullPage: true });
    // texte restant dans l'autre langue ?
    const txt = await p.evaluate(() => document.body.innerText);
    console.log(lang, 'ok, langue html =', await p.evaluate(() => document.documentElement.lang), '| extrait:', txt.slice(0, 80).replace(/\n/g, ' '));
    await ctx.close();
  }
  console.log(errs.length ? errs.join('\n') : 'aucune erreur JS');
  await b.close();
})();
