import io, os, sys, ssl, time, zipfile, datetime as dt, urllib.request, concurrent.futures as cf
import numpy as np, pandas as pd
CA = os.path.expanduser('~/.ccr/ca-bundle.crt')
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
SYMS = "BTC ETH SOL BNB XRP DOGE".split()
B = "https://data.binance.vision/data/futures/um"
END = dt.date(2026, 11, 14)
BUCKET = 900_000
def ctx(): return ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
def get(url, tries=6):
    c = ctx()
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, context=c, timeout=60) as r: return r.read()
        except Exception as e:
            if getattr(e, 'code', None) == 404: return None
            time.sleep(1 + 2 * i)
    return None
def read_zip(b):
    z = zipfile.ZipFile(io.BytesIO(b)); return z.read(z.namelist()[0])
def days(a, b):
    d = a
    while d <= b: yield d; d += dt.timedelta(days=1)
def book(args):
    sym, d = args
    b = get(f"{B}/daily/bookDepth/{sym}USDT/{sym}USDT-bookDepth-{d}.zip")
    if not b: return None
    df = pd.read_csv(io.BytesIO(read_zip(b)))
    if df.shape[0] == 0: return None
    if not str(df.columns[0]).startswith('timestamp'): df.columns = ['timestamp', 'percentage', 'depth', 'notional']
    ts = pd.to_datetime(df['timestamp'], format='%Y-%m-%d %H:%M:%S', errors='coerce').values.astype('datetime64[ms]').astype('int64')
    df['b'] = (ts // BUCKET) * BUCKET
    df = df[df['percentage'].isin([-5, -2, -1, 1, 2, 5])]
    p = df.pivot_table(index='b', columns='percentage', values='notional', aggfunc='mean')
    p = p.reindex(columns=[-1, 1, -2, 2, -5, 5])
    return np.column_stack([p.index.values.astype(np.float64), p.values.astype(np.float64)])
def metrics(args):
    sym, d = args
    b = get(f"{B}/daily/metrics/{sym}USDT/{sym}USDT-metrics-{d}.zip")
    if not b: return None
    df = pd.read_csv(io.BytesIO(read_zip(b)))
    if df.shape[0] == 0: return None
    ts = pd.to_datetime(df['create_time'], format='%Y-%m-%d %H:%M:%S', errors='coerce').values.astype('datetime64[ms]').astype('int64')
    df['b'] = (ts // BUCKET) * BUCKET
    df = df.sort_values('create_time')
    g = df.groupby('b')
    last = g[['sum_open_interest_value', 'count_toptrader_long_short_ratio', 'count_long_short_ratio']].last()
    tk = g['sum_taker_long_short_vol_ratio'].apply(lambda s: float(np.exp(np.log(s.clip(lower=1e-6)).mean())))
    return np.column_stack([last.index.values.astype(np.float64), last.values.astype(np.float64), tk.reindex(last.index).values])
def funding(args):
    sym, ym = args
    b = get(f"{B}/monthly/fundingRate/{sym}USDT/{sym}USDT-fundingRate-{ym}.zip")
    if not b: return None
    df = pd.read_csv(io.BytesIO(read_zip(b)))
    return df[['calc_time', 'last_funding_rate']].values.astype(np.float64)
def run(kind, fn, jobs, sym):
    path = f"{OUT}/{sym}_{kind}.npy"
    if os.path.exists(path): print(sym, kind, 'cached', flush=True); return
    res = []
    with cf.ProcessPoolExecutor(6) as ex:
        for r in ex.map(fn, jobs, chunksize=4):
            if r is not None and len(r): res.append(r)
    a = np.concatenate(res) if res else np.zeros((0, 2))
    a = a[np.argsort(a[:, 0], kind='stable')]
    np.save(path, a); print(sym, kind, a.shape, flush=True)
if __name__ == '__main__':
    for sym in SYMS:
        months = [f"{y}-{m:02d}" for y in range(2019, 2027) for m in range(1, 13) if (y, m) <= (2026, 10)]
        run('funding', funding, [(sym, ym) for ym in months], sym)
        mstart = dt.date(2020, 9, 1) if sym == 'BTC' else dt.date(2021, 12, 1)
        run('metrics', metrics, [(sym, d) for d in days(mstart, END)], sym)
        run('book', book, [(sym, d) for d in days(dt.date(2023, 1, 1), END)], sym)
