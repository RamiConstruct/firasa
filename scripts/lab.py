# Laboratoire : chaque outil est réglé/entraîné avant 2024 et mesuré sur 2024-01-01 -> 2026-11-14 (jamais vu).
import numpy as np, talib, json, datetime as dt
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
SYMS="BTC ETH BNB SOL XRP ADA DOGE AVAX LINK LTC DOT TRX ATOM NEAR PAXG ETC".split()
STEP={'1h':3600,'1d':86400}; H=5; FEE=0.002; SPLIT=int(dt.datetime(2024,1,1,tzinfo=dt.UTC).timestamp())
rng=np.random.default_rng(7); out={}
for tf in ('1d','1h'):
    rows=[]
    for s in SYMS:
        a=np.load(f'data/raw/klines/{s}_{tf}.npy'); t=(a[:,0]//1000).astype(np.int64)
        o,h,l,c,v=(a[:,k].astype(float) for k in (1,2,3,4,5)); tb=a[:,7].astype(float); n=len(a)
        ok=np.zeros(n,bool); ok[:n-H]=(t[H:]-t[:n-H])==H*STEP[tf]
        fr=np.zeros(n); fr[:n-H]=c[H:]/c[:n-H]-1
        atr=talib.ATR(h,l,c,14); e20,e50,e200=talib.EMA(c,20),talib.EMA(c,50),talib.EMA(c,200); rsi=talib.RSI(c,14)
        up,mid,lw=talib.BBANDS(c,20,2,2); _,_,mh=talib.MACD(c,12,26,9)
        def ret(k): r=np.full(n,np.nan); r[k:]=c[k:]/c[:-k]-1; return r
        r1,r3,r10,r30=ret(1),ret(3),ret(10),ret(30)
        def rs(x,k): cs=np.cumsum(np.nan_to_num(x)); y=np.full(n,np.nan); y[k-1:]=cs[k-1:]-np.concatenate([[0],cs[:-k]]); return y
        flow=rs(tb,5)/np.where(rs(v,5)>0,rs(v,5),np.nan); relv=v/talib.SMA(v,20); eng=talib.CDLENGULFING(o,h,l,c)
        T={}
        T['up']=np.ones(n); T['mom']=np.where(np.abs(r10)>atr/c,np.sign(r10),0); T['amom']=-T['mom']
        T['ema200']=np.where(np.abs(c-e200)>0.3*atr,np.sign(c-e200),0)
        T['ema2050']=np.where((e20>e50),1,-1).astype(float)
        T['rsi']=np.where(rsi<30,1,np.where(rsi>70,-1,0)); T['bb']=np.where(c<lw,1,np.where(c>up,-1,0))
        T['macd']=np.sign(mh); T['flow']=np.where(flow>0.53,1,np.where(flow<0.47,-1,0)); T['aflow']=-T['flow']
        T['eng']=np.sign(eng); T['aeng']=-np.sign(eng)
        X=np.column_stack([r1,r3,r10,r30,rsi/100,(c-lw)/(up-lw),(c-e200)/atr,(e20-e50)/atr,mh/atr,flow,np.log(relv),atr/c])
        good=ok&(fr!=0)&np.isfinite(X).all(1)&(np.arange(n)>=200)
        idx=np.nonzero(good)[0]
        rows.append(dict(t=t[idx],fr=fr[idx],X=X[idx],T={k:np.nan_to_num(x[idx]) for k,x in T.items()}))
    t=np.concatenate([r['t'] for r in rows]); fr=np.concatenate([r['fr'] for r in rows]); X=np.concatenate([r['X'] for r in rows])
    T={k:np.concatenate([r['T'][k] for r in rows]) for k in rows[0]['T']}
    y=(fr>0).astype(int); tr=t<SPLIT-H*STEP[tf]; te=t>=SPLIT
    Xc=np.clip(X,np.nanpercentile(X[tr],0.5,axis=0),np.nanpercentile(X[tr],99.5,axis=0))
    sc=StandardScaler().fit(Xc[tr]); lr=LogisticRegression(C=0.1,max_iter=300).fit(sc.transform(Xc[tr]),y[tr]); p=lr.predict_proba(sc.transform(Xc))[:,1]
    out.setdefault('_logit',{})[tf]=dict(lo=np.nanpercentile(X[tr],0.5,axis=0).tolist(),hi=np.nanpercentile(X[tr],99.5,axis=0).tolist(),mean=sc.mean_.tolist(),scale=sc.scale_.tolist(),coef=lr.coef_[0].tolist(),b=float(lr.intercept_[0]))
    gb=HistGradientBoostingClassifier(max_iter=200,learning_rate=0.05,max_leaf_nodes=15,l2_regularization=1.0,random_state=0).fit(Xc[tr],y[tr]); q=gb.predict_proba(Xc)[:,1]
    T['logit']=np.where(p>0.5,1,-1); T['logit_c']=np.where(p>0.53,1,np.where(p<0.47,-1,0))
    NF=[i for i in range(X.shape[1]) if i!=9]; sc2=StandardScaler().fit(Xc[tr][:,NF]); lr2=LogisticRegression(C=0.1,max_iter=300).fit(sc2.transform(Xc[tr][:,NF]),y[tr]); p2=lr2.predict_proba(sc2.transform(Xc[:,NF]))[:,1]
    T['logit11']=np.where(p2>0.5,1,-1); T['logit11_c']=np.where(p2>0.53,1,np.where(p2<0.47,-1,0))
    out['_logit'][tf]=dict(lo=np.nanpercentile(X[tr],0.5,axis=0)[NF].tolist(),hi=np.nanpercentile(X[tr],99.5,axis=0)[NF].tolist(),mean=sc2.mean_.tolist(),scale=sc2.scale_.tolist(),coef=lr2.coef_[0].tolist(),b=float(lr2.intercept_[0]))
    T['gb']=np.where(q>0.5,1,-1); T['gb_c']=np.where(q>0.53,1,np.where(q<0.47,-1,0))
    month=np.array([x//(86400*30.4375) for x in t]).astype(int); res=[]; NT=len(T)*2; alpha=0.05/NT
    for k,d in T.items():
        def stat(mask):
            m=mask&(d!=0); nn=int(m.sum())
            if nn==0: return None
            hit=(np.sign(fr[m])==d[m]); g=d[m]*fr[m]; return nn,hit,g,month[m]
        st=stat(te); sr=stat(tr)
        if not st: continue
        nn,hit,g,mm=st; ms=np.unique(mm); hm=np.array([hit[mm==x].sum() for x in ms]); nm=np.array([(mm==x).sum() for x in ms])
        bs=rng.integers(0,len(ms),(4000,len(ms))); accs=hm[bs].sum(1)/nm[bs].sum(1)
        gm=np.array([g[mm==x].sum() for x in ms]); gs=gm[bs].sum(1)/nm[bs].sum(1)
        res.append(dict(id=k,n=nn,acc=float(hit.mean()),lo=float(np.quantile(accs,alpha/2)),hi=float(np.quantile(accs,1-alpha/2)),lo95=float(np.quantile(accs,0.025)),hi95=float(np.quantile(accs,0.975)),
                        glo=float(np.quantile(gs,alpha/2)),ghi=float(np.quantile(gs,1-alpha/2)),cov=nn/int(te.sum()),gross=float(g.mean()),net=float(g.mean()-FEE),accTrain=float(sr[1].mean()) if sr else None,nTrain=sr[0] if sr else 0,months=len(ms)))
    res.sort(key=lambda r:-r['acc']); out[tf]=res
    print(tf,'train',int(tr.sum()),'test',int(te.sum()))
    for r in res: print(f"  {r['id']:9s} n={r['n']:>7} acc={r['acc']*100:5.1f} [{r['lo']*100:4.1f};{r['hi']*100:4.1f}] train={r['accTrain']*100:5.1f} cov={r['cov']*100:4.0f}% brut={r['gross']*100:+.3f}% net={r['net']*100:+.3f}%")
out['_']=dict(h=H,fee=FEE,split='2024-01-01',end='2026-11-14',tools=len(T),syms=len(SYMS),alpha=0.05/ (len(T)*2))
json.dump(out.pop('_logit'),open('data/logit.json','w'))
json.dump(out,open('data/lab.json','w'),separators=(',',':'))
