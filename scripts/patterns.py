# Détecte les 61 figures TA-Lib sur tout l'historique, mesure ce qui suit, prépare les blocs pour KV.
import os, json, glob, random
import numpy as np, talib
RAW = 'data/raw/klines'; OUT = 'data/pack'; CH = 32768
SYMS = "BTC ETH BNB SOL XRP ADA DOGE AVAX LINK LTC DOT TRX ATOM NEAR PAXG ETC".split()
TFS = ['15m', '1h', '4h', '1d']; STEP = {'15m': 900, '1h': 3600, '4h': 14400, '1d': 86400}; HS = [1, 3, 5, 10]
FUNCS = talib.get_function_groups()['Pattern Recognition']; assert len(FUNCS) == 61
def detect(o, h, l, c):
    return np.stack([getattr(talib, f)(o, h, l, c) for f in FUNCS], axis=1)  # (n, 61)
# 1) vérification : aucune figure n'utilise de bougie future
a = np.load(f'{RAW}/BTC_1d.npy'); o, h, l, c = (a[:, k].astype(np.float64) for k in (1, 2, 3, 4))
full = detect(o, h, l, c); random.seed(1); bad = 0
for cut in random.sample(range(200, len(a)), 60):
    part = detect(o[:cut], h[:cut], l[:cut], c[:cut])
    bad += int((part[-1] != full[cut - 1]).sum())
print('écarts de causalité :', bad)
stats = {}; base = {}; examples = {}; files = []; counts = {}
meta = json.load(open(f'{OUT}/meta.json'))
for tf in TFS:
    base[tf] = {h: [0, 0] for h in HS}
    for s in SYMS:
        p = f'{RAW}/{s}_{tf}.npy'
        if not os.path.exists(p): continue
        a = np.load(p); t = (a[:, 0] // 1000).astype(np.int64)
        o, h, l, c = (a[:, k].astype(np.float64) for k in (1, 2, 3, 4)); n = len(a)
        P = detect(o, h, l, c)
        # blocs binaires : 4 x uint32 par bougie (haussier bits 0-31, 32-60 ; baissier idem)
        bull = (P > 0); bear = (P < 0)
        def pack(m):
            w = np.zeros((n, 2), dtype=np.uint64)
            for j in range(61): w[:, j // 32] |= (m[:, j].astype(np.uint64) << np.uint64(j % 32))
            return w.astype(np.uint32)
        rows = np.concatenate([pack(bull), pack(bear)], axis=1)
        for ci in range(0, (n + CH - 1) // CH):
            key = f'p/{s}/{tf}/{ci}'; path = f'{OUT}/{key}.bin'; os.makedirs(os.path.dirname(path), exist_ok=True)
            open(path, 'wb').write(np.ascontiguousarray(rows[ci * CH:(ci + 1) * CH]).tobytes()); files.append(key)
        meta['syms'][s]['tf'][tf]['pat'] = True
        # issues mesurées : prix plus haut après h bougies (bougies contiguës uniquement, égalités exclues)
        for H in HS:
            ok = np.zeros(n, bool); ok[:n - H] = (t[H:] - t[:n - H]) == H * STEP[tf]
            fut = np.zeros(n); fut[:n - H] = c[H:] - c[:n - H]
            valid = ok & (fut != 0); up = valid & (fut > 0)
            base[tf][H][0] += int(valid.sum()); base[tf][H][1] += int(up.sum())
            for j, f in enumerate(FUNCS):
                for sg, m in (('1', bull[:, j]), ('-1', bear[:, j])):
                    cell = stats.setdefault(f, {}).setdefault(sg, {}).setdefault(tf, {}).setdefault(str(H), [0, 0])
                    cell[0] += int((m & valid).sum()); cell[1] += int((m & up).sum())
        for j, f in enumerate(FUNCS):
            for sg, m in (('1', bull[:, j]), ('-1', bear[:, j])):
                cnt = counts.setdefault(f, {}).setdefault(sg, {}).setdefault(tf, 0); counts[f][sg][tf] = cnt + int(m.sum())
                # exemple réel : la plus récente occurrence, priorité au 1 jour puis BTC/ETH
                idx = np.nonzero(m)[0]; idx = idx[(idx >= 9) & (idx + 5 < n)]
                if not len(idx): continue
                i = int(idx[-1]); key = f + sg; pri = (TFS.index(tf), 1 if s in ('BTC', 'ETH') else 0, int(t[i]))
                if key not in examples or pri > examples[key]['pri']:
                    w = slice(i - 9, i + 6)
                    examples[key] = {'pri': pri, 's': s, 'tf': tf, 't': int(t[i]), 'i': 9,
                                     'o': [float(f'{x:.6g}') for x in o[w]], 'h': [float(f'{x:.6g}') for x in h[w]],
                                     'l': [float(f'{x:.6g}') for x in l[w]], 'c': [float(f'{x:.6g}') for x in c[w]]}
    print(tf, 'ok')
for e in examples.values(): e.pop('pri')
json.dump({'funcs': FUNCS, 'base': base, 'stats': stats, 'counts': counts, 'examples': examples, 'candles': meta['candles']}, open('data/patstats.json', 'w'), separators=(',', ':'))
old = json.load(open(f'{OUT}/files.json')); json.dump(old + [k for k in files if k not in old], open(f'{OUT}/files.json', 'w'))
json.dump(meta, open(f'{OUT}/meta.json', 'w'))
print('blocs figures :', len(files), 'taille', round(sum(os.path.getsize(f'{OUT}/{k}.bin') for k in files) / 1e6, 1), 'Mo')
print('patstats.json', round(os.path.getsize('data/patstats.json') / 1e3), 'ko')
