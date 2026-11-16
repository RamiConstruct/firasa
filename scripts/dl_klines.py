import json, os, sys, time, ssl, urllib.request, concurrent.futures as cf
import numpy as np
CA = os.path.expanduser('~/.ccr/ca-bundle.crt')
ctx = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
SYMS = "BTC ETH BNB SOL XRP ADA DOGE AVAX LINK LTC DOT TRX ATOM NEAR PAXG ETC".split()
TFS = {"15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000}
END = 1763164800000  # 2025-11-15? placeholder, replaced below
END = int(time.mktime(time.strptime("2026-11-15", "%Y-%m-%d"))) * 1000
OUT = sys.argv[1]
def get(url, tries=8):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, context=ctx, timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            code = getattr(e, 'code', None)
            time.sleep(min(30, 2 ** i) if code in (418, 429) else 1 + i)
    raise RuntimeError("failed " + url)
def fetch(sym, tf):
    path = f"{OUT}/{sym}_{tf}.npy"
    if os.path.exists(path): return sym, tf, "cached"
    step = TFS[tf]; cur = 0; rows = []
    while True:
        d = get(f"https://data-api.binance.vision/api/v3/klines?symbol={sym}USDT&interval={tf}&startTime={cur}&limit=1000")
        if not d: break
        for k in d:
            if k[0] >= END: break
            rows.append((k[0], float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5]), int(k[8]), float(k[9])))
        last = d[-1][0]
        if len(d) < 1000 or last >= END: break
        cur = last + step
    a = np.array(rows, dtype=np.float64)
    np.save(path, a)
    return sym, tf, len(rows)
jobs = [(s, t) for s in SYMS for t in TFS]
with cf.ThreadPoolExecutor(6) as ex:
    for r in ex.map(lambda j: fetch(*j), jobs):
        print(*r, flush=True)
