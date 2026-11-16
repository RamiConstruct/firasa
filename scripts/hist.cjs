// Mesure, sur des milliers de graphiques historiques tirés au hasard, combien de fois chaque signal a eu raison.
const E = require('../web/engine.js');
const fs = require('fs');
const PER = +process.argv[2] || 3000, BOOK = +process.argv[3] || 800;
const HS = [1, 3, 5, 10], FXIDS = new Set(['funding', 'oi', 'lsAll', 'lsTop', 'takerFut', 'book1', 'book5']);
const out = {};
async function run(tf, n, book) {
  const C = out[tf] = out[tf] || Object.fromEntries(HS.map(h => [h, { base: [0, 0], sig: {} }]));
  let done = 0, inflight = [];
  const one = async () => {
    const R = await (await fetch(`http://localhost:8787/api/round?full=1&tfs=${tf}${book ? '&book=1' : ''}`)).json();
    if (R.error) return;
    R.vis = 120;
    const S = E.signals(R, E.indicators(R, R.ctx, R.ctx - R.vis));
    const D = R.ctx - 1;
    for (const h of HS) {
      const o = Math.sign(R.c[D + h] - R.c[D]); if (!o) continue;
      const cell = C[h];
      if (!book) { cell.base[0]++; if (o > 0) cell.base[1]++; }
      for (const s of S.list) {
        if (!s.dir || (book && !FXIDS.has(s.id))) continue;
        const t = (cell.sig[s.id] = cell.sig[s.id] || {})[s.dir] = (cell.sig[s.id] && cell.sig[s.id][s.dir]) || [0, 0];
        t[0]++; if (s.dir === o) t[1]++;
      }
    }
  };
  while (done < n) { const batch = []; for (let k = 0; k < 16 && done < n; k++, done++) batch.push(one().catch(() => {})); await Promise.all(batch); }
}
(async () => {
  for (const tf of ['15m', '1h', '4h', '1d']) {
    await run(tf, PER, false); await run(tf, BOOK, true);
    const c = out[tf][5]; console.log(tf, 'base↑', (c.base[1] / c.base[0]).toFixed(3), Object.entries(c.sig).map(([id, d]) => id + ' ' + Object.entries(d).map(([k, [n, h]]) => `${k > 0 ? '▲' : '▼'}${(h / n * 100).toFixed(0)}%/${n}`).join(' ')).join(' | '));
  }
  out._n = PER * 4; out._book = BOOK * 4; out._at = new Date().toISOString().slice(0, 10);
  fs.writeFileSync('data/hist.json', JSON.stringify(out));
})();
