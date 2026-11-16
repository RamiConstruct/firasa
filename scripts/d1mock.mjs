// Faux D1 pour les tests locaux (node:sqlite)
import { DatabaseSync } from 'node:sqlite'; import fs from 'fs';
export function mockD1() {
  const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../worker/schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, a = []) => ({ bind: (...x) => stmt(sql, x), run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes) } }; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) || null, _run: () => db.prepare(sql).run(...a) });
  return { prepare: sql => stmt(sql), batch: async list => list.map(s => s._run()), _db: db };
}
