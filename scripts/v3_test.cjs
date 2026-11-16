const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const base = process.argv[2] || 'http://localhost:8787/';
  const lang = process.argv[3] || 'en';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang === 'en' ? 'en-US' : 'fr-FR' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  // ancien joueur : réglages v1 avec toutes les unités -> doivent passer en journalier
  await p.goto(base); await p.evaluate(() => localStorage.setItem('firasa.v1', JSON.stringify({ settings: { tfs: ['15m', '1h', '4h', '1d'], h: 5 }, sessions: [], cur: null })));
  await p.goto(base, { waitUntil: 'networkidle' });
  console.log('tfs après migration:', await p.evaluate(() => JSON.parse(localStorage.getItem('firasa.v1')).settings.tfs));
  await p.click('button[data-go=play]');
  const tfs = [];
  for (let k = 0; k < 4; k++) {
    await p.waitForSelector('.gb.u', { timeout: 20000 });
    await p.click('.gb.u'); await p.waitForSelector('#nextB', { timeout: 8000 }); await p.waitForTimeout(1300);
    tfs.push(await p.evaluate(() => document.querySelector('.ctxline span').textContent));
    if (k === 0) { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `shots/v3_${lang}_reveal.png`, fullPage: true }); console.log('panneau:', await p.evaluate(() => (document.querySelector('.day') || {}).innerText)); }
    await p.click('#nextB');
  }
  console.log('manches:', tfs.join(' | '));
  // mode live
  await p.click('button[data-go=home]'); await p.click('button[data-go=live]');
  await p.waitForSelector('.gb.u:not([disabled])', { timeout: 20000 }); await p.waitForTimeout(3500);
  await p.screenshot({ path: `shots/v3_${lang}_live.png` });
  await p.click('#lvTf button[data-v="1m"]'); await p.waitForSelector('.gb.u:not([disabled])', { timeout: 20000 });
  await p.click('#lvH button[data-v="1"]'); await p.waitForSelector('.gb.u:not([disabled])', { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.click('.gb.u');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `shots/v3_${lang}_live_call.png`, fullPage: true });
  console.log('appel ouvert:', await p.evaluate(() => JSON.parse(localStorage.getItem('firasa.v1')).liveOpen.length));
  console.log('attente de la résolution (~1 min)…');
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('firasa.v1')).live.length > 0, null, { timeout: 100000 });
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('firasa.v1')).live);
  console.log('résolu:', JSON.stringify(st[0]).slice(0, 220));
  await p.waitForTimeout(500); await p.screenshot({ path: `shots/v3_${lang}_live_done.png`, fullPage: true });
  await p.click('#langBtn'); await p.waitForTimeout(1500); await p.click('#langBtn'); await p.waitForTimeout(500);
  await p.click('button[data-go=stats]'); await p.waitForTimeout(400); await p.screenshot({ path: `shots/v3_${lang}_stats.png`, fullPage: true });
  console.log(errs.length ? errs.join('\n') : 'aucune erreur JS');
  await b.close();
})();
