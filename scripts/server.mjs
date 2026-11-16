import http from 'http'; import fs from 'fs';
import W from '../worker/worker.js';
const env = { DATA: { async get(key, opt) {
  const type = typeof opt === 'string' ? opt : (opt && opt.type) || 'text';
  let p = key === 'meta' ? 'data/pack/meta.json' : key === 'html' ? 'dist/index.html' : `data/pack/${key}.bin`;
  if (!fs.existsSync(p)) return null;
  const b = fs.readFileSync(p);
  if (type === 'arrayBuffer') return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  if (type === 'json') return JSON.parse(b.toString()); return b.toString();
} } };
http.createServer(async (req, res) => {
  const r = await W.fetch(new Request('http://localhost:8787' + req.url), env, { waitUntil() {} });
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, () => console.log('ok 8787'));
