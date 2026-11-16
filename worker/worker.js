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

// ---------- classement en avant : prévisions enregistrées avant, notées après ----------
const LSYMS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'LTC', 'DOT', 'TRX', 'ATOM', 'NEAR', 'PAXG', 'ETC'];
const LH = 5, LSTEP = { '1h': 3600, '1d': 86400 }, LWIN = { '1h': 600, '1d': 3600 };
const KPAIR = { BTC: 'XBTUSD', ETH: 'ETHUSD', BNB: 'BNBUSD', SOL: 'SOLUSD', XRP: 'XRPUSD', ADA: 'ADAUSD', DOGE: 'XDGUSD', AVAX: 'AVAXUSD', LINK: 'LINKUSD', LTC: 'LTCUSD', DOT: 'DOTUSD', TRX: 'TRXUSD', ATOM: 'ATOMUSD', NEAR: 'NEARUSD', PAXG: 'PAXGUSD', ETC: 'ETCUSD' };
// Bougies Kraken (paires en dollars) : [temps, ouverture, haut, bas, clôture, vwap, volume, nombre]. La dernière ligne est la bougie en cours : retirée.
async function klines(sym, tf, now) {
  let r; try { r = await fetch('https://api.kraken.com/0/public/OHLC?pair=' + KPAIR[sym] + '&interval=' + (tf === '1d' ? 1440 : 60)); } catch (e) { return { error: 'kraken réseau' }; }
  if (!r.ok) return { error: 'kraken ' + r.status };
  const d = await r.json(); if (d.error && d.error.length) return { error: 'kraken ' + d.error[0] };
  const key = Object.keys(d.result).find(k => k !== 'last'), rows = d.result[key], step = LSTEP[tf];
  const K = { t: [], h: [], l: [], c: [], v: [] };
  for (const k of rows) { if (k[0] + step > now) continue; K.t.push(k[0]); K.h.push(+k[2]); K.l.push(+k[3]); K.c.push(+k[4]); K.v.push(+k[6]); }
  return { K };
}

function emaT(x, p, from) {
  const s = from || 0, out = new Array(x.length).fill(NaN); if (x.length - s < p) return out;
  let e = 0; for (let i = s; i < s + p; i++) e += x[i]; e /= p; out[s + p - 1] = e; const k = 2 / (p + 1);
  for (let i = s + p; i < x.length; i++) { e += k * (x[i] - e); out[i] = e; }
  return out;
}
function houseSignals(K, L) {
  const c = K.c, h = K.h, l = K.l, v = K.v, n = c.length, D = n - 1, out = {};
  if (n < 400) return out;
  const e20 = emaT(c, 20)[D], e50 = emaT(c, 50)[D], e200 = emaT(c, 200)[D];
  let g = 0, ls = 0; for (let i = 1; i <= 14; i++) { const ch = c[i] - c[i - 1]; g += Math.max(ch, 0) / 14; ls += Math.max(-ch, 0) / 14; }
  for (let i = 15; i < n; i++) { const ch = c[i] - c[i - 1]; g = (g * 13 + Math.max(ch, 0)) / 14; ls = (ls * 13 + Math.max(-ch, 0)) / 14; }
  const rsi = ls === 0 ? 100 : 100 - 100 / (1 + g / ls);
  const tr = i => Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
  let atr = 0; for (let i = 1; i <= 14; i++) atr += tr(i) / 14; for (let i = 15; i < n; i++) atr = (atr * 13 + tr(i)) / 14;
  let m = 0; for (let i = D - 19; i <= D; i++) m += c[i] / 20; let sd = 0; for (let i = D - 19; i <= D; i++) sd += (c[i] - m) * (c[i] - m) / 20; sd = Math.sqrt(sd);
  const up = m + 2 * sd, lw = m - 2 * sd;
  const e12 = emaT(c, 12, 14), e26 = emaT(c, 26), macd = c.map((x, i) => e12[i] - e26[i]), sig = emaT(macd, 9, 25), mh = macd[D] - sig[D];
  let va = 0; for (let i = D - 19; i <= D; i++) va += v[i] / 20; const relv = v[D] / va;
  const ret = k => c[D] / c[D - k] - 1, r10 = ret(10), px = c[D];
  out.up = 1;
  out.mom = Math.abs(r10) > atr / px ? Math.sign(r10) : 0; out.amom = -out.mom;
  out.ema200 = Math.abs(px - e200) > 0.3 * atr ? Math.sign(px - e200) : 0;
  out.ema2050 = e20 > e50 ? 1 : -1;
  out.rsi = rsi < 30 ? 1 : rsi > 70 ? -1 : 0;
  out.bb = px < lw ? 1 : px > up ? -1 : 0;
  out.macd = Math.sign(mh);
  if (L) {
    const X = [ret(1), ret(3), r10, ret(30), rsi / 100, (px - lw) / (up - lw), (px - e200) / atr, (e20 - e50) / atr, mh / atr, Math.log(relv), atr / px];
    if (X.every(Number.isFinite)) {
      let z = L.b; for (let i = 0; i < X.length; i++) z += L.coef[i] * ((Math.min(L.hi[i], Math.max(L.lo[i], X[i])) - L.mean[i]) / L.scale[i]);
      const p = 1 / (1 + Math.exp(-z)); out.logit11 = p > 0.5 ? 1 : -1; out.logit11_c = p > 0.53 ? 1 : p < 0.47 ? -1 : 0; out._p = p;
    }
  }
  out._f = { rsi, atr, e200, mh };
  return out;
}
async function runSym(env, sym, tf, now) {
  const step = LSTEP[tf];
  const kr = await klines(sym, tf, now);
  if (kr.error) return { sym, tf, error: kr.error };
  const K = kr.K;
  if (K.t.length < 30) return { sym, tf, error: 'trop peu de bougies' };
  const D = K.t.length - 1, t0 = K.t[D], fresh = t0 === Math.floor(now / step) * step - step;
  const st = []; let made = 0, scored = 0;
  if (fresh) {
    const L = await env.DATA.get('logit', { type: 'json', cacheTtl: 3600 });
    const S = houseSignals(K, L && L[tf]);
    const bots = (await env.DB.prepare('SELECT id, code FROM bots WHERE house = 1').all()).results;
    for (const b of bots) { const d = S[b.code]; if (d === 1 || d === -1) { st.push(env.DB.prepare('INSERT OR IGNORE INTO preds (bot, sym, tf, t0, dir) VALUES (?, ?, ?, ?, ?)').bind(b.id, sym, tf, t0, d)); made++; } }
  }
  const close = new Map(K.t.map((t, i) => [t, K.c[i]]));
  const due = (await env.DB.prepare('SELECT bot, t0, dir FROM preds WHERE sym = ? AND tf = ? AND t0 <= ?').bind(sym, tf, t0 - LH * step).all()).results;
  for (const p of due) {
    const c0 = close.get(p.t0), c1 = close.get(p.t0 + LH * step);
    if (c0 && !c1 && p.t0 + LH * step > t0 - 2 * step) continue; // clôture pas encore disponible
    if (c0 && c1 && c1 !== c0) {
      const ret = c1 / c0 - 1;
      st.push(env.DB.prepare('INSERT INTO agg (bot, tf, t0, n, ok, gross) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT (bot, tf, t0) DO UPDATE SET n = n + 1, ok = ok + excluded.ok, gross = gross + excluded.gross').bind(p.bot, tf, p.t0, Math.sign(ret) === p.dir ? 1 : 0, p.dir * ret));
      scored++;
    }
    st.push(env.DB.prepare('DELETE FROM preds WHERE bot = ? AND sym = ? AND tf = ? AND t0 = ?').bind(p.bot, sym, tf, p.t0));
  }
  for (let i = 0; i < st.length; i += 40) await env.DB.batch(st.slice(i, i + 40));
  return { sym, tf, t0, fresh, made, scored };
}
function tick(env, ms) {
  const d = new Date(ms), m = d.getUTCMinutes(), now = Math.floor(ms / 1000);
  if (m >= 1 && m <= 16) return runSym(env, LSYMS[m - 1], '1h', now);
  if (d.getUTCHours() === 0 && m >= 21 && m <= 36) return runSym(env, LSYMS[m - 21], '1d', now);
  return Promise.resolve(null);
}
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}
async function labLive(env) {
  const rows = (await env.DB.prepare('SELECT a.bot, b.name, b.code, b.house, a.tf, SUM(a.n) AS n, SUM(a.ok) AS k, SUM(a.gross) AS g, COUNT(*) AS t, SUM(a.ok * a.ok) AS s2, SUM(a.ok * a.n) AS s1, SUM(a.n * a.n) AS s0, MIN(a.t0) AS first FROM agg a JOIN bots b ON b.id = a.bot GROUP BY a.bot, a.tf').all()).results;
  const pend = await env.DB.prepare('SELECT COUNT(*) AS c, MIN(t0) AS first FROM preds').first();
  const bots = await env.DB.prepare('SELECT COUNT(*) AS c FROM bots').first();
  const out = rows.map(r => { const p = r.k / r.n, se = Math.sqrt(Math.max(0, r.s2 - 2 * p * r.s1 + p * p * r.s0)) / r.n; return { name: r.name, code: r.code, house: r.house, tf: r.tf, n: r.n, k: r.k, gross: r.g / r.n, t: r.t, se, first: r.first }; });
  return new Response(JSON.stringify({ h: LH, rows: out, pending: pend.c, pendingFirst: pend.first, bots: bots.c }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=120' } });
}
async function labPredict(request, env) {
  if (request.method !== 'POST') return json({ error: 'POST attendu' }, 405);
  const key = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!key) return json({ error: 'clé manquante' }, 401);
  const bot = await env.DB.prepare('SELECT id FROM bots WHERE key_hash = ?').bind(await sha256(key)).first();
  if (!bot) return json({ error: 'clé inconnue' }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'JSON invalide' }, 400); }
  const step = LSTEP[b.tf], dir = b.dir === 1 || b.dir === -1 ? b.dir : 0;
  if (!step || !LSYMS.includes(b.sym) || !dir) return json({ error: 'attendu : sym parmi ' + LSYMS.join(','), tf: '1h ou 1d', dir: '1 ou -1' }, 400);
  const now = Math.floor(Date.now() / 1000), open = Math.floor(now / step) * step;
  if (now - open > LWIN[b.tf]) return json({ error: 'fenêtre fermée', detail: 'prévisions acceptées pendant ' + LWIN[b.tf] + ' s après la clôture de chaque bougie', nextOpen: open + step }, 409);
  const t0 = open - step;
  await env.DB.prepare('INSERT OR REPLACE INTO preds (bot, sym, tf, t0, dir) VALUES (?, ?, ?, ?, ?)').bind(bot.id, b.sym, b.tf, t0, dir).run();
  return json({ ok: true, sym: b.sym, tf: b.tf, dir, ref: t0, scoredAt: t0 + step * (1 + LH) });
}
async function labAdmin(request, env, url) {
  const p = url.pathname;
  if (p === '/admin/probe') { const r = await fetch(url.searchParams.get('u'), url.searchParams.get('ua') ? { headers: { 'user-agent': url.searchParams.get('ua'), accept: 'application/json' } } : undefined); return json({ status: r.status, body: (await r.text()).slice(0, 160) }); }
  if (p === '/admin/tick') return json(await runSym(env, url.searchParams.get('sym'), url.searchParams.get('tf'), Math.floor(Date.now() / 1000)));
  if (p === '/admin/signals') {
    const kr = await klines(url.searchParams.get('sym'), url.searchParams.get('tf'), Math.floor(Date.now() / 1000)); if (kr.error) return json(kr, 502); const K = kr.K;
    const L = await env.DATA.get('logit', 'json'); return json({ t0: K.t[K.t.length - 1], s: houseSignals(K, L && L[url.searchParams.get('tf')]) });
  }
  if (p === '/admin/bot' && request.method === 'POST') {
    const name = (url.searchParams.get('name') || '').slice(0, 40); if (!name) return json({ error: 'nom' }, 400);
    const key = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(x => x.toString(16).padStart(2, '0')).join('');
    await env.DB.prepare('INSERT INTO bots (name, code, key_hash, house, created) VALUES (?, NULL, ?, 0, ?)').bind(name, await sha256(key), Math.floor(Date.now() / 1000)).run();
    return json({ name, key });
  }
  if (p === '/admin/bot' && request.method === 'DELETE') {
    const b = await env.DB.prepare('SELECT id FROM bots WHERE name = ? AND house = 0').bind(url.searchParams.get('name')).first(); if (!b) return json({ error: 'inconnu' }, 404);
    await env.DB.batch([env.DB.prepare('DELETE FROM preds WHERE bot = ?').bind(b.id), env.DB.prepare('DELETE FROM agg WHERE bot = ?').bind(b.id), env.DB.prepare('DELETE FROM bots WHERE id = ?').bind(b.id)]);
    return json({ deleted: b.id });
  }
  return null;
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(tick(env, event.scheduledTime)); },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === '/api/round') return makeRound(env, url, ctx);
    if (p === '/api/lab/live') return labLive(env);
    if (p === '/api/lab/predict') return labPredict(request, env);
    if (p === '/api/meta') {
      const m = await getMeta(env);
      if (!m) return json({ error: 'données indisponibles' }, 503);
      const syms = {};
      for (const [s, v] of Object.entries(m.syms)) syms[s] = { name: NAMES[s] || s, tfs: Object.keys(v.tf), fx: !!v.fx, bookStart: v.bookStart || null, since: v.since };
      return new Response(JSON.stringify({ version: m.version, syms, candles: m.candles }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' } });
    }
    if ((p === '/admin/tick' || p === '/admin/bot' || p === '/admin/signals' || p === '/admin/probe') && env.ADMIN_TOKEN) {
      if (request.headers.get('authorization') !== 'Bearer ' + env.ADMIN_TOKEN) return new Response('non', { status: 401 });
      const r = await labAdmin(request, env, url); if (r) return r;
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
