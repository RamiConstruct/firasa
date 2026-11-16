const E = require('../web/engine.js');
const N = +process.argv[2] || 300, q = process.argv[3] || '';
(async () => {
  const stats = {}, H = 5; let ok = 0, tot = 0, errs = 0, withFx = 0, withBook = 0;
  for (let k = 0; k < N; k++) {
    const R = await (await fetch('http://localhost:8787/api/round?' + q)).json();
    if (R.error) { errs++; continue; }
    R.vis = 120;
    try {
      const I = E.indicators(R, R.ctx, R.ctx - R.vis), S = E.signals(R, I);
      if (R.fx) withFx++; if (R.fx && R.fx.b1[R.ctx - 1] != null) withBook++;
      for (const s of S.list) if (!s.reading || s.reading.includes('NaN') || s.reading.includes('undefined')) { console.log('BAD', s.id, s.reading); }
      const j = E.judge(R, S, S.score >= 0 ? 1 : -1, H);
      if (j.out !== 0 && Math.abs(S.score) >= 0.5) { tot++; if (j.correct) ok++; }
      for (const s of S.list) if (s.dir && j.out) { const t = stats[s.id] = stats[s.id] || [0, 0]; t[0]++; if (s.dir === j.out) t[1]++; }
    } catch (e) { errs++; console.log('ERR', R.sym, R.tf, e.stack.split('\n').slice(0, 3).join(' | ')); }
  }
  console.log({ N, errs, withFx, withBook, consensusAcc: (ok / tot).toFixed(3), tot });
  console.log(Object.entries(stats).map(([k, [n, r]]) => `${k}:${n}:${(r / n * 100).toFixed(0)}%`).join('  '));
})();
