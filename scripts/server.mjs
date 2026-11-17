import http from 'http'; import fs from 'fs';
import W from '../worker/worker.js';
import { mockD1 } from './d1mock.mjs';
const env = { DEV_FULL: 1, ADMIN_TOKEN: 'dev', AI: { run: async (m, a) => ({ translated_text: '[' + a.target_lang + '] ' + a.text }) }, DB: mockD1(), TEST_JWKS: fs.existsSync('/tmp/test_jwks.json') ? JSON.parse(fs.readFileSync('/tmp/test_jwks.json')) : null, DATA: { async get(key, opt) {
  const type = typeof opt === 'string' ? opt : (opt && opt.type) || 'text';
  let p = key === 'meta' ? 'data/pack/meta.json' : key === 'html' ? 'dist/index.html' : `data/pack/${key}.bin`;
  if (!fs.existsSync(p)) return null;
  const b = fs.readFileSync(p);
  if (type === 'arrayBuffer') return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  if (type === 'json') return JSON.parse(b.toString()); return b.toString();
} } };
if (env.TEST_JWKS) env.DB._db.exec("INSERT OR REPLACE INTO cfg (k, v) VALUES ('google_client_id', 'test-client')");
http.createServer(async (req, res) => {
  const chunks = []; for await (const ch of req) chunks.push(ch);
  const init = { method: req.method, headers: req.headers }; if (chunks.length) init.body = Buffer.concat(chunks);
  const r = await W.fetch(new Request('http://localhost:8787' + req.url, init), env, { waitUntil() {} });
  const hd = Object.fromEntries(r.headers); if (hd['set-cookie']) hd['set-cookie'] = hd['set-cookie'].replace('; Secure', ''); res.writeHead(r.status, hd); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, () => console.log('ok 8787'));
