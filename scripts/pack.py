import os, json, glob, sys, time
import numpy as np
RAW = 'data/raw'; OUT = 'data/pack'; CH = 32768
SYMS = "BTC ETH BNB SOL XRP ADA DOGE AVAX LINK LTC DOT TRX ATOM NEAR PAXG ETC".split()
TFS = ['15m', '1h', '4h', '1d']
FX = "BTC ETH SOL BNB XRP DOGE".split()
os.makedirs(OUT, exist_ok=True)
meta = {'version': time.strftime('%Y%m%d%H%M'), 'syms': {}, 'candles': 0}
files = []
for s in SYMS:
    S = {'tf': {}}
    for tf in TFS:
        p = f'{RAW}/klines/{s}_{tf}.npy'
        if not os.path.exists(p): continue
        a = np.load(p)
        if len(a) == 0: continue
        t = a[:, 0].copy()
        t = np.where(t > 1e14, t / 1000, t)  # sécurité microsecondes
        ts = (t // 1000).astype(np.uint32)
        o, h, l, c, v, n, tb = [a[:, k] for k in range(1, 8)]
        N = len(a)
        for ci in range(0, (N + CH - 1) // CH):
            sl = slice(ci * CH, min(N, (ci + 1) * CH))
            buf = ts[sl].tobytes() + b''.join(x[sl].astype(np.float32).tobytes() for x in (o, h, l, c, v, tb)) + n[sl].astype(np.uint32).tobytes()
            key = f'k/{s}/{tf}/{ci}'
            path = f'{OUT}/{key}.bin'; os.makedirs(os.path.dirname(path), exist_ok=True)
            open(path, 'wb').write(buf); files.append(key)
        S['tf'][tf] = {'n': int(N), 'chunk': CH, 't0': int(ts[0])}
        meta['candles'] += int(N)
        if tf == '1d': S['since'] = int(ts[0])
    if not S['tf']: continue
    if s in FX:
        fp, mp, bp = (f'{RAW}/futures/{s}_{k}.npy' for k in ('funding', 'metrics', 'book'))
        if all(os.path.exists(x) for x in (fp, mp, bp)):
            fu, me, bo = np.load(fp), np.load(mp), np.load(bp)
            starts = [x[0, 0] for x in (fu, me, bo) if len(x)]
            ends = [x[-1, 0] for x in (fu, me, bo) if len(x)]
            t0 = int(min(starts) // 900000 * 900); t1 = int(max(ends) // 900000 * 900)
            nb = (t1 - t0) // 900 + 1
            cols = np.full((11, nb), np.nan, dtype=np.float32)
            if len(bo):
                idx = ((bo[:, 0] / 1000 - t0) // 900).astype(np.int64); ok = (idx >= 0) & (idx < nb)
                for k in range(6): cols[k, idx[ok]] = bo[ok, k + 1]
                S['bookStart'] = int(bo[0, 0] // 1000)
            if len(me):
                idx = ((me[:, 0] / 1000 - t0) // 900).astype(np.int64); ok = (idx >= 0) & (idx < nb)
                cols[6, idx[ok]] = me[ok, 1]; cols[7, idx[ok]] = me[ok, 2]; cols[8, idx[ok]] = me[ok, 3]; cols[9, idx[ok]] = me[ok, 4]
            if len(fu):
                ends_ms = (t0 + 900 * (np.arange(nb) + 1)) * 1000
                j = np.searchsorted(fu[:, 0], ends_ms, side='left') - 1
                okf = j >= 0
                vals = np.full(nb, np.nan, dtype=np.float32); vals[okf] = fu[j[okf], 1]
                # pas de valeur si le dernier funding date de plus de 9 h
                stale = np.ones(nb, bool); stale[okf] = (ends_ms[okf] - fu[j[okf], 0]) > 9 * 3600 * 1000
                vals[stale] = np.nan; cols[10] = vals
            for ci in range(0, (nb + CH - 1) // CH):
                sl = slice(ci * CH, min(nb, (ci + 1) * CH))
                key = f'f/{s}/{ci}'; path = f'{OUT}/{key}.bin'; os.makedirs(os.path.dirname(path), exist_ok=True)
                open(path, 'wb').write(np.ascontiguousarray(cols[:, sl]).tobytes()); files.append(key)
            S['fx'] = {'t0': t0, 'n': int(nb), 'chunk': CH}
    meta['syms'][s] = S
json.dump(meta, open(f'{OUT}/meta.json', 'w'))
json.dump(files, open(f'{OUT}/files.json', 'w'))
tot = sum(os.path.getsize(f'{OUT}/{k}.bin') for k in files)
print(len(files), 'fichiers', round(tot / 1e6, 1), 'Mo', meta['candles'], 'bougies')
print({s: {tf: v['n'] for tf, v in S['tf'].items()} | ({'fx': S['fx']['n'], 'book': S.get('bookStart')} if 'fx' in S else {}) for s, S in meta['syms'].items()})
