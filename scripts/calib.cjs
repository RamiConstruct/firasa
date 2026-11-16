const E=require('../web/engine.js'), H=require('../data/hist.json'), fs=require('fs');
global.window={}; require('../web/patterns.js'); const P=window.FIRASA_PATTERNS; P.stats=require('../data/patstats.json');
const lg=p=>Math.log(p/(1-p)); const out=[]; const N=+process.argv[2]||6000;
(async()=>{ for(const tf of ['15m','1h','4h','1d']){ for(let k=0;k<N;k+=16) await Promise.all(Array.from({length:16},async()=>{
  const R=await (await fetch('http://localhost:8787/api/round?full=1&tfs='+tf)).json(); if(R.error) return; R.vis=120; const I=E.indicators(R,R.ctx,R.ctx-120), D=R.ctx-1;
  for(const h of [1,3,5,10]){ const o=Math.sign(R.c[D+h]-R.c[D]); if(!o) continue; const S=E.signals(R,I,{hist:H,h,lang:'fr',pats:P});
    out.push([tf,h,R.t[D],+((lg(S.pUp)-lg(S.base))/0.6).toFixed(4),+S.base.toFixed(4),o>0?1:0]); } })); console.log(tf,out.length); }
 fs.writeFileSync('data/calib.json',JSON.stringify(out)); })();
