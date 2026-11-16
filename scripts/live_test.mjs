import { DatabaseSync } from 'node:sqlite'; import fs from 'fs';
const src = fs.readFileSync('worker/worker.js', 'utf8').replace('export default {', 'export { houseSignals, runSym, labLive, labPredict, tick };\nexport default {');
fs.writeFileSync('/tmp/w_test.mjs', src); const W = await import('/tmp/w_test.mjs');
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync('worker/schema.sql', 'utf8'));
const stmt = (sql, args = []) => ({ bind: (...a) => stmt(sql, a), run: async () => { db.prepare(sql).run(...args); return {}; }, all: async () => ({ results: db.prepare(sql).all(...args) }), first: async () => db.prepare(sql).get(...args) || null, _run: () => db.prepare(sql).run(...args) });
const env = { DB: { prepare: sql => stmt(sql), batch: async list => list.map(s => s._run()) }, DATA: { get: async k => k === 'logit' ? JSON.parse(fs.readFileSync('data/logit.json')) : null } };
const now = Math.floor(Date.now() / 1000);
console.log(await W.runSym(env, 'BTC', '1h', now));
// simule 6 heures plus tôt pour vérifier la notation
db.exec('UPDATE preds SET t0 = t0 - 6*3600');
console.log(await W.runSym(env, 'BTC', '1h', now));
console.log(await (await W.labLive(env)).text());
const k = await (await fetch('https://api.kraken.com/0/public/OHLC?pair=ETHUSD&interval=60')).json(); const rows = k.result[Object.keys(k.result).find(x => x !== 'last')]; rows.pop();
fs.writeFileSync('/tmp/eth.json', JSON.stringify(rows));
const K = { t: [], h: [], l: [], c: [], v: [] }; for (const x of rows) { K.t.push(x[0]); K.h.push(+x[2]); K.l.push(+x[3]); K.c.push(+x[4]); K.v.push(+x[6]); }
console.log(JSON.stringify(W.houseSignals(K, JSON.parse(fs.readFileSync('data/logit.json'))['1h'])));
