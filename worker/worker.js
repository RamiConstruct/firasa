// Firasa — Worker Cloudflare : sert le jeu et génère des manches à partir de l'historique Binance stocké dans KV.
const STEP = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
const TF_WEIGHT = { '15m': 1, '1h': 1.25, '4h': 1, '1d': 0.75 };
const CTX = 320, FUT = 10;
const FX_COLS = ['b1', 'a1', 'b2', 'a2', 'b5', 'a5', 'oi', 'lsTop', 'lsAll', 'taker', 'fund'];
const NAMES = {
  BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin',
  AVAX: 'Avalanche', LINK: 'Chainlink', LTC: 'Litecoin', DOT: 'Polkadot', TRX: 'Tron', ATOM: 'Cosmos',
  NEAR: 'Near', PAXG: 'Or (PAX Gold)', ETC: 'Ethereum Classic'
};

const MEM = new Map();
let META = null, META_AT = 0;

function remember(key, val) {
  MEM.set(key, val);
  while (MEM.size > 28) MEM.delete(MEM.keys().next().value);
}

async function getBuf(env, key, origin, ctx) {
  if (MEM.has(key)) { const v = MEM.get(key); MEM.delete(key); MEM.set(key, v); return v; }
  const useCache = typeof caches !== 'undefined' && origin && !origin.includes('workers.dev');
  const ck = useCache ? new Request(origin + '/__c/' + (META && META.version || 'v') + '/' + key) : null;
  if (useCache) {
    const hit = await caches.default.match(ck);
    if (hit) { const b = await hit.arrayBuffer(); remember(key, b); return b; }
  }
  const buf = await env.DATA.get(key, 'arrayBuffer');
  if (!buf) return null;
  remember(key, buf);
  if (useCache && ctx) ctx.waitUntil(caches.default.put(ck, new Response(buf, { headers: { 'cache-control': 'public, max-age=31536000, immutable' } })));
  return buf;
}

async function getMeta(env) {
  if (META && Date.now() - META_AT < 300000) return META;
  const m = await env.DATA.get('meta', 'json');
  if (m) { META = m; META_AT = Date.now(); }
  return META;
}

function decodeCandles(buf) {
  const n = buf.byteLength / 32;
  return {
    n,
    t: new Uint32Array(buf, 0, n),
    o: new Float32Array(buf, 4 * n, n), h: new Float32Array(buf, 8 * n, n),
    l: new Float32Array(buf, 12 * n, n), c: new Float32Array(buf, 16 * n, n),
    v: new Float32Array(buf, 20 * n, n), tb: new Float32Array(buf, 24 * n, n),
    k: new Uint32Array(buf, 28 * n, n)
  };
}

async function readCandles(env, sym, tf, info, a, b, origin, ctx) {
  const C = info.chunk, out = { t: [], o: [], h: [], l: [], c: [], v: [], tb: [], k: [] };
  for (let ci = Math.floor(a / C); ci <= Math.floor(b / C); ci++) {
    const buf = await getBuf(env, 'k/' + sym + '/' + tf + '/' + ci, origin, ctx);
    if (!buf) return null;
    const d = decodeCandles(buf), base = ci * C;
    const s = Math.max(a, base) - base, e = Math.min(b, base + d.n - 1) - base;
    for (let j = s; j <= e; j++) for (const key in out) out[key].push(d[key][j]);
  }
  return out.t.length === b - a + 1 ? out : null;
}

async function readFx(env, sym, fx, times, step, origin, ctx) {
  const C = fx.chunk, cols = FX_COLS.length;
  const idx = times.map(t => Math.round((t + step - 900 - fx.t0) / 900));
  const res = {}; for (const k of FX_COLS) res[k] = new Array(times.length).fill(null);
  const chunks = new Map();
  for (const i of idx) if (i >= 0 && i < fx.n) chunks.set(Math.floor(i / C), null);
  if (!chunks.size) return null;
  for (const ci of chunks.keys()) {
    const buf = await getBuf(env, 'f/' + sym + '/' + ci, origin, ctx);
    if (buf) chunks.set(ci, { a: new Float32Array(buf), n: buf.byteLength / 4 / cols });
  }
  let any = false;
  idx.forEach((i, j) => {
    if (i < 0 || i >= fx.n) return;
    const ch = chunks.get(Math.floor(i / C)); if (!ch) return;
    const li = i - Math.floor(i / C) * C;
    FX_COLS.forEach((k, col) => {
      const v = ch.a[col * ch.n + li];
      if (Number.isFinite(v)) { res[k][j] = +v.toPrecision(6); any = true; }
    });
  });
  return any ? res : null;
}

async function readPat(env, sym, tf, info, a, b, origin, ctx) {
  const C = info.chunk, out = [];
  for (let ci = Math.floor(a / C); ci <= Math.floor(b / C); ci++) {
    const buf = await getBuf(env, 'p/' + sym + '/' + tf + '/' + ci, origin, ctx);
    if (!buf) return null;
    const u = new Uint32Array(buf), n = u.length / 4, base = ci * C;
    const s = Math.max(a, base) - base, e = Math.min(b, base + n - 1) - base;
    for (let j = s; j <= e; j++) {
      for (let q = 0; q < 4; q++) {
        let v = u[j * 4 + q];
        while (v) { const low = v & -v; const bit = 31 - Math.clz32(low); v = (v & (v - 1)) >>> 0; out.push([base + j - a, (q % 2) * 32 + bit, q < 2 ? 1 : -1]); }
      }
    }
  }
  return out;
}

function pickWeighted(items, w) {
  const tot = items.reduce((s, x) => s + w(x), 0);
  let r = Math.random() * tot;
  for (const x of items) { r -= w(x); if (r <= 0) return x; }
  return items[items.length - 1];
}

async function makeRound(env, url, ctx) {
  const meta = await getMeta(env);
  if (!meta) return json({ error: 'données indisponibles' }, 503);
  const origin = url.origin;
  let tfs = (url.searchParams.get('tfs') || '15m,1h,4h,1d').split(',').filter(t => STEP[t]);
  if (!tfs.length) tfs = Object.keys(STEP);
  const wantBook = url.searchParams.get('book') === '1';
  let syms = (url.searchParams.get('syms') || '').split(',').filter(s => meta.syms[s]);
  if (!syms.length) syms = Object.keys(meta.syms);
  if (wantBook) syms = syms.filter(s => meta.syms[s].fx && meta.syms[s].bookStart);
  if (!syms.length) syms = Object.keys(meta.syms).filter(s => !wantBook || meta.syms[s].fx);

  for (let tries = 0; tries < 14; tries++) {
    const tf = pickWeighted(tfs, t => TF_WEIGHT[t]);
    const cands = syms.filter(s => meta.syms[s].tf[tf] && meta.syms[s].tf[tf].n > CTX + FUT + 50);
    if (!cands.length) continue;
    const sym = cands[Math.floor(Math.random() * cands.length)];
    const S = meta.syms[sym], info = S.tf[tf], step = STEP[tf];
    let lo = CTX - 1, hi = info.n - FUT - 1;
    if (wantBook && S.bookStart) {
      const approx = Math.floor((S.bookStart - info.t0) / step) + 2;
      lo = Math.max(lo, Math.min(hi - 1, approx));
    }
    if (hi <= lo) continue;
    const i = lo + Math.floor(Math.random() * (hi - lo));
    const w = await readCandles(env, sym, tf, info, i - CTX + 1, i + FUT, origin, ctx);
    if (!w) continue;
    if (w.t[w.t.length - 1] - w.t[0] !== (CTX + FUT - 1) * step) continue; // trou dans les données
    let zeros = 0; for (const v of w.v) if (v === 0) zeros++;
    if (zeros > 3) continue;
    let fx = null;
    if (S.fx) fx = await readFx(env, sym, S.fx, w.t.slice(0, CTX), step, origin, ctx);
    if (wantBook && (!fx || fx.b1[CTX - 1] == null) && tries < 12) continue;
    let btc = null;
    if (sym !== 'BTC' && meta.syms.BTC && meta.syms.BTC.tf[tf]) {
      const ib = meta.syms.BTC.tf[tf], tD = w.t[CTX - 1];
      let jb = Math.round((tD - ib.t0) / step);
      for (let k = 0; k < 2 && jb - 30 >= 0 && jb + FUT < ib.n; k++) {
        const b = await readCandles(env, 'BTC', tf, ib, jb - 30, jb + FUT, origin, ctx);
        if (!b) break;
        if (b.t[30] === tD) { btc = { t0: b.t[0], c: b.c.map(x => +(+x).toPrecision(7)) }; break; }
        jb += Math.round((tD - b.t[30]) / step);
      }
    }
    const pat = info.pat ? await readPat(env, sym, tf, info, i - CTX + 1, i, origin, ctx) : null;
    const p = x => +(+x).toPrecision(7);
    return json({
      v: 1, sym, name: NAMES[sym] || sym, tf, step, ctx: CTX, fut: FUT,
      t: w.t, o: w.o.map(p), h: w.h.map(p), l: w.l.map(p), c: w.c.map(p),
      vol: w.v.map(p), tb: w.tb.map(p), k: w.k, fx, btc, pat
    });
  }
  return json({ error: 'aucune manche trouvée, réessaie' }, 500);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === '/api/round') return makeRound(env, url, ctx);
    if (p === '/api/meta') {
      const m = await getMeta(env);
      if (!m) return json({ error: 'données indisponibles' }, 503);
      const syms = {};
      for (const [s, v] of Object.entries(m.syms)) syms[s] = { name: NAMES[s] || s, tfs: Object.keys(v.tf), fx: !!v.fx, bookStart: v.bookStart || null, since: v.since };
      return new Response(JSON.stringify({ version: m.version, syms, candles: m.candles }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' } });
    }
    if (p.startsWith('/admin/kv/') && env.ADMIN_TOKEN) {
      if (request.headers.get('authorization') !== 'Bearer ' + env.ADMIN_TOKEN) return new Response('non', { status: 401 });
      const key = decodeURIComponent(p.slice('/admin/kv/'.length));
      if (request.method === 'PUT') { await env.DATA.put(key, await request.arrayBuffer()); MEM.delete(key); META = null; return json({ ok: true, key }); }
      if (request.method === 'GET') { const v = await env.DATA.get(key, 'arrayBuffer'); return new Response(v ? v.byteLength + ' octets' : 'absent'); }
      return new Response('méthode', { status: 405 });
    }
    if (p === '/' || p === '/index.html') {
      const html = await env.DATA.get('html', { cacheTtl: 60 });
      if (!html) return new Response('Firasa arrive bientôt…', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
    }
    return new Response('Introuvable', { status: 404 });
  }
};
