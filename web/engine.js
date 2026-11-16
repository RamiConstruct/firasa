// Firasa — moteur d'analyse : indicateurs, signaux, explications, statistiques.
// Tout est causal : une valeur à l'indice j n'utilise que les bougies 0..j.
(function (root) {
  const NaNs = n => new Array(n).fill(NaN);

  function ema(x, p) {
    const k = 2 / (p + 1), out = NaNs(x.length);
    let e = x[0];
    for (let i = 0; i < x.length; i++) { e = i === 0 ? x[0] : e + k * (x[i] - e); out[i] = e; }
    return out;
  }
  function sma(x, p) {
    const out = NaNs(x.length); let s = 0;
    for (let i = 0; i < x.length; i++) { s += x[i]; if (i >= p) s -= x[i - p]; if (i >= p - 1) out[i] = s / p; }
    return out;
  }
  function stdev(x, p, m) {
    const out = NaNs(x.length);
    for (let i = p - 1; i < x.length; i++) { let s = 0; for (let j = i - p + 1; j <= i; j++) s += (x[j] - m[i]) ** 2; out[i] = Math.sqrt(s / p); }
    return out;
  }
  function rsi(c, p = 14) {
    const out = NaNs(c.length); let g = 0, l = 0;
    for (let i = 1; i < c.length; i++) {
      const ch = c[i] - c[i - 1], up = Math.max(ch, 0), dn = Math.max(-ch, 0);
      if (i <= p) { g += up / p; l += dn / p; if (i === p) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
      else { g = (g * (p - 1) + up) / p; l = (l * (p - 1) + dn) / p; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
    }
    return out;
  }
  function atr(h, l, c, p = 14) {
    const out = NaNs(c.length); let a = 0;
    for (let i = 0; i < c.length; i++) {
      const tr = i === 0 ? h[i] - l[i] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
      if (i < p) { a += tr / p; if (i === p - 1) out[i] = a; } else { a = (a * (p - 1) + tr) / p; out[i] = a; }
    }
    return out;
  }

  // Calcule tous les indicateurs sur les n premières bougies (n = ctx avant révélation)
  function indicators(R, n, visStart) {
    const c = R.c.slice(0, n), h = R.h.slice(0, n), l = R.l.slice(0, n), o = R.o.slice(0, n), v = R.vol.slice(0, n), tb = R.tb.slice(0, n);
    const I = {};
    I.ema20 = ema(c, 20); I.ema50 = ema(c, 50); I.ema200 = ema(c, 200);
    I.sma20 = sma(c, 20); const sd = stdev(c, 20, I.sma20);
    I.bbU = I.sma20.map((m, i) => m + 2 * sd[i]); I.bbL = I.sma20.map((m, i) => m - 2 * sd[i]);
    I.rsi = rsi(c, 14); I.atr = atr(h, l, c, 14);
    const e12 = ema(c, 12), e26 = ema(c, 26);
    I.macd = e12.map((x, i) => x - e26[i]); I.macdSig = ema(I.macd, 9); I.macdHist = I.macd.map((x, i) => x - I.macdSig[i]);
    I.volSma = sma(v, 20);
    I.delta = v.map((x, i) => 2 * tb[i] - x);
    I.vwap = NaNs(n); I.cvd = NaNs(n);
    let pv = 0, vv = 0, cd = 0;
    for (let i = visStart; i < n; i++) { const tp = (h[i] + l[i] + c[i]) / 3; pv += tp * v[i]; vv += v[i]; cd += I.delta[i]; I.vwap[i] = vv ? pv / vv : c[i]; I.cvd[i] = cd; }
    return I;
  }

  // Profil de volume sur [a, b] : zones de liquidité (POC, zone de valeur 70 %)
  function volumeProfile(R, a, b, bins = 36) {
    let lo = Infinity, hi = -Infinity;
    for (let i = a; i <= b; i++) { lo = Math.min(lo, R.l[i]); hi = Math.max(hi, R.h[i]); }
    const size = (hi - lo) / bins || 1, vol = new Array(bins).fill(0);
    for (let i = a; i <= b; i++) {
      const b0 = Math.max(0, Math.min(bins - 1, Math.floor((R.l[i] - lo) / size)));
      const b1 = Math.max(0, Math.min(bins - 1, Math.floor((R.h[i] - lo) / size)));
      const share = R.vol[i] / (b1 - b0 + 1);
      for (let k = b0; k <= b1; k++) vol[k] += share;
    }
    let poc = 0; for (let k = 1; k < bins; k++) if (vol[k] > vol[poc]) poc = k;
    const total = vol.reduce((s, x) => s + x, 0);
    let inside = vol[poc], up = poc, dn = poc;
    while (inside < total * 0.7 && (up < bins - 1 || dn > 0)) {
      const nu = up < bins - 1 ? vol[up + 1] : -1, nd = dn > 0 ? vol[dn - 1] : -1;
      if (nu >= nd) { up++; inside += nu; } else { dn--; inside += nd; }
    }
    return { lo, hi, size, vol, poc: lo + (poc + 0.5) * size, vah: lo + (up + 1) * size, val: lo + dn * size, max: vol[poc] };
  }

  // Sommets / creux confirmés (k bougies de chaque côté, tous ≤ fin)
  function pivots(R, a, end, k = 3) {
    const highs = [], lows = [];
    for (let i = a + k; i <= end - k; i++) {
      let isH = true, isL = true;
      for (let j = i - k; j <= i + k; j++) { if (R.h[j] > R.h[i]) isH = false; if (R.l[j] < R.l[i]) isL = false; }
      if (isH) highs.push(i); if (isL) lows.push(i);
    }
    return { highs, lows };
  }

  // ---------- textes (français / anglais) ----------
  const num = (lang, x, d) => { const s = x.toFixed(d); return lang === 'fr' ? s.replace('.', ',') : s; };
  const pctL = (lang, x, d = 2) => (x >= 0 ? '+' : '') + num(lang, x, d) + (lang === 'fr' ? ' %' : '%');
  const P = (lang, x) => Math.round(x) + (lang === 'fr' ? ' %' : '%');

  const TX = {
    fr: {
      label: {
        trend200: 'Tendance de fond (EMA 200)', emaStack: 'Tendance moyenne (EMA 20/50)', momentum: 'Momentum (10 bougies)', rsi: 'RSI 14',
        macd: 'MACD (12, 26, 9)', bb: 'Bandes de Bollinger', vwap: 'VWAP (fenêtre visible)', flow: 'Achats au marché (5 bougies)',
        cvd: 'Delta cumulé (CVD 20)', relvol: 'Bougie de fort volume', relvolN: 'Volume relatif', pattern: 'Figure de bougies (ancienne détection)', talib: 'Figures de bougies (TA-Lib)',
        sr: 'Supports / résistances', vp: 'Profil de volume', div: 'Divergence RSI', funding: 'Funding (futures)',
        oi: 'Open interest', lsAll: 'Long/short des comptes', lsTop: 'Long/short des top traders', takerFut: 'Achats/ventes au marché (futures)',
        book1: "Carnet d'ordres ±1 %", book5: "Carnet d'ordres ±5 %"
      },
      lesson: {
        trend200: "L'EMA 200 est la moyenne mobile exponentielle des 200 dernières clôtures. Lecture classique : prix au-dessus = tendance de fond haussière, en dessous = baissière. Neutre ici si l'écart est inférieur à 0,3 ATR.",
        emaStack: "Compare les moyennes mobiles exponentielles 20 et 50 et leur pente sur 5 bougies. Lecture classique : EMA 20 au-dessus de l'EMA 50 et les deux en hausse = tendance haussière ; un croisement récent = changement de tendance.",
        momentum: "Variation du prix sur les 10 dernières bougies. Signal ici si elle dépasse 1 ATR (amplitude moyenne d'une bougie sur 14 bougies). Lecture classique : un mouvement récent fort tend à se prolonger.",
        rsi: "Le RSI 14 compare la moyenne des hausses et des baisses des 14 dernières bougies, de 0 à 100. Lecture classique : au-dessus de 70 = surachat (baisse attendue), sous 30 = survente (hausse attendue), 55 à 70 = momentum haussier, 30 à 45 = momentum baissier.",
        macd: "Le MACD est l'écart entre les moyennes exponentielles 12 et 26 ; l'histogramme est l'écart entre le MACD et sa moyenne exponentielle 9. Lecture classique : histogramme positif et en hausse = momentum haussier qui accélère (et l'inverse).",
        bb: "Bandes placées à 2 écarts-types de part et d'autre de la moyenne des 20 dernières clôtures. Lecture classique : une clôture hors des bandes est un excès, et le prix tend à revenir vers la moyenne.",
        vwap: "Prix moyen pondéré par le volume depuis le début de la fenêtre visible (120 bougies). Lecture classique : prix au-dessus du VWAP = acheteurs en position de force, en dessous = vendeurs.",
        flow: "Part du volume des 5 dernières bougies exécutée par des ordres d'achat au marché (« taker »), d'après les bougies Binance. Lecture classique : plus de 53 % = pression acheteuse, moins de 47 % = pression vendeuse.",
        cvd: "Le CVD additionne bougie par bougie les achats au marché moins les ventes au marché. Ici : son évolution sur 20 bougies comparée à celle du prix. Lecture classique : CVD et prix dans le même sens = mouvement confirmé ; en sens contraire = mouvement fragile.",
        relvol: "Volume de la dernière bougie divisé par la moyenne des 20 dernières. Signal ici au-dessus de 2× avec un corps d'au moins 0,2 ATR. Lecture classique : continuation dans le sens de la bougie.",
        talib: "Les 61 figures de la bibliothèque TA-Lib, détectées sur la dernière bougie. Pour chaque figure : % de fois où le prix était plus haut après l'horizon choisi, sur tout l'historique (16 cryptos, même unité de temps). Le signal suit le sens TA-Lib de la figure dont le taux s'écarte le plus du taux de base (figures à sens TA-Lib et au moins 200 cas).",
        sr: "Supports et résistances = creux et sommets locaux des 120 dernières bougies (plus haut ou plus bas que les 3 bougies de chaque côté). Lecture classique : le prix bute sur une résistance proche, rebondit sur un support proche, et poursuit quand il dépasse tous les sommets ou creux récents.",
        vp: "Le profil de volume répartit le volume des 120 dernières bougies par niveau de prix. POC = niveau le plus échangé ; zone de valeur = niveaux autour du POC qui regroupent 70 % du volume. Lecture classique : au-dessus de la zone = biais haussier, en dessous = biais baissier.",
        div: "Divergence sur les 45 dernières bougies : sommet de prix plus haut avec un RSI plus bas (baissière), ou creux plus bas avec un RSI plus haut (haussière). Lecture classique : annonce un retournement.",
        funding: "Le funding est le paiement périodique entre acheteurs (longs) et vendeurs (shorts) des contrats perpétuels Binance ; positif = les longs paient. Lecture classique, contrarienne : au-dessus de 0,03 % = trop de longs, baisse attendue ; sous −0,01 % = trop de shorts, hausse attendue.",
        oi: "L'open interest est la valeur totale des positions ouvertes sur les contrats perpétuels Binance. Lecture classique : prix ↑ et OI ↑ = nouvelles positions acheteuses ; prix ↑ et OI ↓ = fermeture de shorts ; prix ↓ et OI ↑ = nouvelles positions vendeuses ; prix ↓ et OI ↓ = fermeture de longs.",
        lsAll: "Rapport entre comptes acheteurs et vendeurs sur les futures Binance, comparé à sa moyenne des 50 bougies précédentes. Lecture classique, contrarienne : foule plus acheteuse que d'habitude (+8 %) = baisse attendue, et l'inverse.",
        lsTop: "Rapport long/short des comptes « top traders » de Binance (les plus gros comptes), variation sur 10 bougies. Lecture classique : hausse de plus de 5 % = hausse attendue, baisse de plus de 5 % = baisse attendue.",
        takerFut: "Rapport entre achats et ventes au marché sur les contrats perpétuels Binance (moyenne géométrique des 4 dernières bougies). Lecture classique : au-dessus de 1,08 = pression acheteuse, sous 0,92 = pression vendeuse.",
        book1: "Valeur des ordres d'achat (bids) et de vente (asks) en attente à moins de 1 % du prix, carnet des futures Binance, moyenne des 15 dernières minutes. Lecture classique : déséquilibre de plus de 15 % = le côté le plus chargé l'emporte.",
        book5: "Même mesure à moins de 5 % du prix (liquidité plus profonde). Lecture classique : déséquilibre de plus de 12 % = le côté le plus chargé l'emporte."
      },
      r: {
        trend: (p, up) => `Prix ${p} ${up ? 'au-dessus' : 'en dessous'} de l'EMA 200`,
        stackMixed: 'EMA 20 et 50 sans ordre net', stackUp: 'EMA 20 > EMA 50, les deux en hausse', stackDn: 'EMA 20 < EMA 50, les deux en baisse',
        stackUpX: 'EMA 20 > EMA 50, pentes de sens opposés', stackDnX: 'EMA 20 < EMA 50, pentes de sens opposés',
        crossUp: 'EMA 20 passée au-dessus de l’EMA 50 (5 dernières bougies)', crossDn: 'EMA 20 passée sous l’EMA 50 (5 dernières bougies)',
        mom: (p, a) => `${p} sur 10 bougies (${a} ATR)`,
        rsiN: v => `RSI ${v} (entre 45 et 55)`, rsiOB: v => `RSI ${v} (au-dessus de 70)`, rsiOS: v => `RSI ${v} (sous 30)`, rsiUp: v => `RSI ${v} (entre 55 et 70)`, rsiDn: v => `RSI ${v} (entre 30 et 45)`,
        macdN: 'Histogramme MACD nul', macdUp: 'Histogramme MACD positif et en hausse', macdDn: 'Histogramme MACD négatif et en baisse', macdUpS: 'Histogramme MACD positif et en baisse', macdDnS: 'Histogramme MACD négatif et en hausse',
        bbUp: 'Clôture au-dessus de la bande haute', bbDn: 'Clôture sous la bande basse', bbIn: v => `Clôture dans les bandes (position ${v})`,
        vwap: p => `Prix ${p} par rapport au VWAP`,
        flow: p => `${p} du volume en achats au marché`,
        cvdFlat: 'CVD inchangé sur 20 bougies', cvdDivUp: 'Prix en hausse, CVD en baisse sur 20 bougies', cvdDivDn: 'Prix en baisse, CVD en hausse sur 20 bougies',
        cvdUp: 'CVD en hausse sur 20 bougies (achats au marché nets)', cvdDn: 'CVD en baisse sur 20 bougies (ventes au marché nettes)',
        relvolBig: (green, x) => `Dernière bougie ${green ? 'verte' : 'rouge'}, ${x}× le volume moyen`, relvol: x => `Dernière bougie : ${x}× le volume moyen`,
        engUp: 'Avalement haussier', engDn: 'Avalement baissier', hammer: 'Marteau sous l’EMA 20', star: 'Étoile filante au-dessus de l’EMA 20',
        soldiers: '3 bougies vertes consécutives', crows: '3 bougies rouges consécutives', doji: 'Doji (corps inférieur à 10 % de la bougie)', noPat: 'Aucune figure TA-Lib sur la dernière bougie', patNone: 'Figures non calculées en mode live',
        patItem: (name, sg, p, n) => `${name}${sg === 1 ? ' (haussière TA-Lib)' : sg === -1 ? ' (baissière TA-Lib)' : sg === 'g' ? ' (verte)' : sg === 'r' ? ' (rouge)' : ''} : ${p === null ? 'aucun cas mesuré' : `hausse dans ${p} de ${n} cas`}`,
        srMid: 'Pas de support ou de résistance identifié des deux côtés', srBreakUp: 'Prix au-dessus de tous les sommets des 120 dernières bougies', srBreakDn: 'Prix sous tous les creux des 120 dernières bougies',
        srRes: a => `Résistance à ${a} ATR au-dessus`, srSup: a => `Support à ${a} ATR en dessous`, srBoth: (r, s) => `Résistance à ${r} ATR, support à ${s} ATR`,
        vpIn: 'Prix dans la zone de valeur', vpUp: 'Prix au-dessus de la zone de valeur', vpDn: 'Prix sous la zone de valeur',
        vpPoc: (up, a) => `Prix dans la zone de valeur, POC ${up ? 'au-dessus' : 'en dessous'} à ${a} ATR`,
        divN: 'Pas de divergence RSI', divDn: 'Sommet de prix plus haut, RSI plus bas', divUp: 'Creux de prix plus bas, RSI plus haut',
        fund: (p, k) => `${p} par période (${k > 0 ? 'au-dessus de 0,03 %' : k < 0 ? 'sous −0,01 %' : 'entre −0,01 % et 0,03 %'})`,
        oi: (p, q) => `Open interest ${p}, prix ${q} sur 10 bougies`,
        lsAll: (v, p) => `Rapport ${v} (${p} par rapport à sa moyenne)`, lsTop: (v, p) => `Rapport ${v} (${p} sur 10 bougies)`, taker: v => `Rapport achats/ventes ${v}`,
        book: (b, a) => `${b} acheteurs / ${a} vendeurs`
      },
      j: {
        void: 'Prix exactement inchangé : coup annulé, non compté.',
        neutral: p => `Estimation à partir des taux historiques des signaux présents : ${p} de chances de hausse (entre 48 et 52 % : aucun côté favorisé).`,
        with: (d, p) => `Estimation à partir des taux historiques des signaux présents : ${p} pour ${d}. Ton choix était dans ce sens.`,
        against: (d, p) => `Estimation à partir des taux historiques des signaux présents : ${p} pour ${d}. Ton choix était dans l’autre sens.`,
        tiny: a => `Amplitude du mouvement : ${a} ATR ajusté à l’horizon (moins de 0,35 : mouvement faible).`,
        big: a => `Amplitude du mouvement : ${a} ATR ajusté à l’horizon (plus de 1,5 : mouvement fort).`,
        up: 'la hausse', down: 'la baisse'
      },
      a: {
        trend: (a, n1, b, n2) => `Dans le sens de l'EMA 200 : ${a} de réussite (${n1} coups). Contre : ${b} (${n2} coups).`,
        cons: (a, n1, b, n2) => `Dans le sens de l'estimation historique : ${a} de réussite (${n1} coups). Contre : ${b} (${n2} coups).`,
        conf: (a, n1, b, n2) => `Quand tu es « sûr » : ${a} de réussite (${n1} coups). « Pas sûr » : ${b} (${n2} coups).`,
        tf: (t1, a, t2, b) => `Meilleure unité de temps : ${t1} (${a}). Moins bonne : ${t2} (${b}).`,
        best: (l, a, n, f) => `Signal le plus souvent juste sur tes coups : « ${l} », ${a} sur ${n} cas. Tu as parié dans son sens ${f} du temps.`,
        worst: (l, a, n) => `Signal le moins souvent juste sur tes coups : « ${l} », ${a} sur ${n} cas.`,
        more: 'Pas encore assez de coups pour ces comparaisons (au moins 6 à 12 coups par catégorie).'
      }
    },
    en: {
      label: {
        trend200: 'Long-term trend (EMA 200)', emaStack: 'Medium-term trend (EMA 20/50)', momentum: 'Momentum (10 candles)', rsi: 'RSI 14',
        macd: 'MACD (12, 26, 9)', bb: 'Bollinger Bands', vwap: 'VWAP (visible window)', flow: 'Market buys (5 candles)',
        cvd: 'Cumulative delta (CVD 20)', relvol: 'High-volume candle', relvolN: 'Relative volume', pattern: 'Candlestick pattern (old detection)', talib: 'Candlestick patterns (TA-Lib)',
        sr: 'Support / resistance', vp: 'Volume profile', div: 'RSI divergence', funding: 'Funding rate (perps)',
        oi: 'Open interest', lsAll: 'Account long/short ratio', lsTop: 'Top trader long/short ratio', takerFut: 'Taker buy/sell (perps)',
        book1: 'Order book ±1%', book5: 'Order book ±5%'
      },
      lesson: {
        trend200: 'The EMA 200 is the exponential moving average of the last 200 closes. Classic reading: price above = long-term uptrend, below = downtrend. Neutral here when the gap is under 0.3 ATR.',
        emaStack: 'Compares the 20 and 50 exponential moving averages and their slope over 5 candles. Classic reading: EMA 20 above EMA 50 with both rising = uptrend; a recent cross = trend change.',
        momentum: 'Price change over the last 10 candles. Signal here when it exceeds 1 ATR (average candle range over 14 candles). Classic reading: a strong recent move tends to continue.',
        rsi: 'RSI 14 compares average gains and losses over the last 14 candles, from 0 to 100. Classic reading: above 70 = overbought (decline expected), below 30 = oversold (rise expected), 55 to 70 = bullish momentum, 30 to 45 = bearish momentum.',
        macd: 'MACD is the gap between the 12 and 26 exponential moving averages; the histogram is the gap between MACD and its 9-period exponential average. Classic reading: positive and rising histogram = accelerating bullish momentum (and vice versa).',
        bb: 'Bands set 2 standard deviations either side of the 20-close average. Classic reading: a close outside the bands is an overextension, and price tends to revert to the mean.',
        vwap: 'Volume-weighted average price since the start of the visible window (120 candles). Classic reading: price above VWAP = buyers in control, below = sellers.',
        flow: 'Share of the last 5 candles’ volume executed by market buy ("taker") orders, from Binance candles. Classic reading: above 53% = buying pressure, below 47% = selling pressure.',
        cvd: 'CVD adds up market buys minus market sells, candle by candle. Here: its change over 20 candles compared with price. Classic reading: CVD and price moving together = confirmed move; moving apart = fragile move.',
        relvol: 'Last candle volume divided by the 20-candle average. Signal here above 2× with a body of at least 0.2 ATR. Classic reading: continuation in the candle’s direction.',
        talib: "TA-Lib's 61 patterns, detected on the last candle. For each pattern: % of times price was higher after the chosen horizon, over all history (16 coins, same timeframe). The signal follows the TA-Lib direction of the pattern whose rate differs most from the base rate (directional patterns with at least 200 cases).",
        sr: 'Support and resistance = local lows and highs of the last 120 candles (higher or lower than the 3 candles on each side). Classic reading: price stalls at nearby resistance, bounces off nearby support, and continues when it clears all recent highs or lows.',
        vp: 'The volume profile spreads the last 120 candles’ volume across price levels. POC = most-traded level; value area = levels around the POC holding 70% of volume. Classic reading: above the area = bullish bias, below = bearish bias.',
        div: 'Divergence over the last 45 candles: a higher price high with a lower RSI (bearish), or a lower price low with a higher RSI (bullish). Classic reading: signals a reversal.',
        funding: 'Funding is the periodic payment between longs and shorts on Binance perpetual contracts; positive = longs pay. Classic, contrarian reading: above 0.03% = too many longs, decline expected; below −0.01% = too many shorts, rise expected.',
        oi: 'Open interest is the total value of open positions on Binance perpetual contracts. Classic reading: price ↑ and OI ↑ = new longs; price ↑ and OI ↓ = shorts closing; price ↓ and OI ↑ = new shorts; price ↓ and OI ↓ = longs closing.',
        lsAll: 'Ratio of long to short accounts on Binance futures, compared with its average over the previous 50 candles. Classic, contrarian reading: crowd longer than usual (+8%) = decline expected, and vice versa.',
        lsTop: 'Long/short ratio of Binance "top trader" accounts (the largest accounts), change over 10 candles. Classic reading: up more than 5% = rise expected, down more than 5% = decline expected.',
        takerFut: 'Ratio of market buys to market sells on Binance perpetual contracts (geometric mean of the last 4 candles). Classic reading: above 1.08 = buying pressure, below 0.92 = selling pressure.',
        book1: 'Value of resting buy (bid) and sell (ask) orders within 1% of price, Binance futures order book, average over the last 15 minutes. Classic reading: an imbalance above 15% = the heavier side wins.',
        book5: 'Same measure within 5% of price (deeper liquidity). Classic reading: an imbalance above 12% = the heavier side wins.'
      },
      r: {
        trend: (p, up) => `Price ${p} ${up ? 'above' : 'below'} the EMA 200`,
        stackMixed: 'EMA 20 and 50 with no clear order', stackUp: 'EMA 20 > EMA 50, both rising', stackDn: 'EMA 20 < EMA 50, both falling',
        stackUpX: 'EMA 20 > EMA 50, slopes in opposite directions', stackDnX: 'EMA 20 < EMA 50, slopes in opposite directions',
        crossUp: 'EMA 20 crossed above EMA 50 (last 5 candles)', crossDn: 'EMA 20 crossed below EMA 50 (last 5 candles)',
        mom: (p, a) => `${p} over 10 candles (${a} ATR)`,
        rsiN: v => `RSI ${v} (between 45 and 55)`, rsiOB: v => `RSI ${v} (above 70)`, rsiOS: v => `RSI ${v} (below 30)`, rsiUp: v => `RSI ${v} (between 55 and 70)`, rsiDn: v => `RSI ${v} (between 30 and 45)`,
        macdN: 'MACD histogram at zero', macdUp: 'MACD histogram positive and rising', macdDn: 'MACD histogram negative and falling', macdUpS: 'MACD histogram positive and falling', macdDnS: 'MACD histogram negative and rising',
        bbUp: 'Close above the upper band', bbDn: 'Close below the lower band', bbIn: v => `Close inside the bands (position ${v})`,
        vwap: p => `Price ${p} vs VWAP`,
        flow: p => `${p} of volume in market buys`,
        cvdFlat: 'CVD unchanged over 20 candles', cvdDivUp: 'Price up, CVD down over 20 candles', cvdDivDn: 'Price down, CVD up over 20 candles',
        cvdUp: 'CVD up over 20 candles (net market buying)', cvdDn: 'CVD down over 20 candles (net market selling)',
        relvolBig: (green, x) => `Last candle ${green ? 'green' : 'red'}, ${x}× average volume`, relvol: x => `Last candle: ${x}× average volume`,
        engUp: 'Bullish engulfing', engDn: 'Bearish engulfing', hammer: 'Hammer below the EMA 20', star: 'Shooting star above the EMA 20',
        soldiers: '3 green candles in a row', crows: '3 red candles in a row', doji: 'Doji (body under 10% of the candle)', noPat: 'No TA-Lib pattern on the last candle', patNone: 'Patterns not computed in live mode',
        patItem: (name, sg, p, n) => `${name}${sg === 1 ? ' (bullish per TA-Lib)' : sg === -1 ? ' (bearish per TA-Lib)' : sg === 'g' ? ' (green)' : sg === 'r' ? ' (red)' : ''}: ${p === null ? 'no measured case' : `up in ${p} of ${n} cases`}`,
        srMid: 'No support or resistance found on both sides', srBreakUp: 'Price above every high of the last 120 candles', srBreakDn: 'Price below every low of the last 120 candles',
        srRes: a => `Resistance ${a} ATR above`, srSup: a => `Support ${a} ATR below`, srBoth: (r, s) => `Resistance ${r} ATR away, support ${s} ATR away`,
        vpIn: 'Price inside the value area', vpUp: 'Price above the value area', vpDn: 'Price below the value area',
        vpPoc: (up, a) => `Price inside the value area, POC ${up ? 'above' : 'below'} by ${a} ATR`,
        divN: 'No RSI divergence', divDn: 'Higher price high, lower RSI', divUp: 'Lower price low, higher RSI',
        fund: (p, k) => `${p} per period (${k > 0 ? 'above 0.03%' : k < 0 ? 'below −0.01%' : 'between −0.01% and 0.03%'})`,
        oi: (p, q) => `Open interest ${p}, price ${q} over 10 candles`,
        lsAll: (v, p) => `Ratio ${v} (${p} vs its average)`, lsTop: (v, p) => `Ratio ${v} (${p} over 10 candles)`, taker: v => `Buy/sell ratio ${v}`,
        book: (b, a) => `${b} bids / ${a} asks`
      },
      j: {
        void: 'Price exactly unchanged: call voided, not counted.',
        neutral: p => `Estimate from the historical rates of the signals present: ${p} chance of going up (between 48% and 52%: neither side favored).`,
        with: (d, p) => `Estimate from the historical rates of the signals present: ${p} for ${d}. Your call was in that direction.`,
        against: (d, p) => `Estimate from the historical rates of the signals present: ${p} for ${d}. Your call was in the other direction.`,
        tiny: a => `Move size: ${a} ATR adjusted for the horizon (under 0.35: small move).`,
        big: a => `Move size: ${a} ATR adjusted for the horizon (over 1.5: large move).`,
        up: 'up', down: 'down'
      },
      a: {
        trend: (a, n1, b, n2) => `With the EMA 200: ${a} correct (${n1} calls). Against it: ${b} (${n2} calls).`,
        cons: (a, n1, b, n2) => `With the historical estimate: ${a} correct (${n1} calls). Against it: ${b} (${n2} calls).`,
        conf: (a, n1, b, n2) => `When "sure": ${a} correct (${n1} calls). When "unsure": ${b} (${n2} calls).`,
        tf: (t1, a, t2, b) => `Best timeframe: ${t1} (${a}). Weakest: ${t2} (${b}).`,
        best: (l, a, n, f) => `Most often right on your calls: "${l}", ${a} of ${n} cases. You bet its way ${f} of the time.`,
        worst: (l, a, n) => `Least often right on your calls: "${l}", ${a} of ${n} cases.`,
        more: 'Not enough calls yet for these comparisons (at least 6 to 12 calls per category).'
      }
    }
  };
  const T = lang => TX[lang] || TX.fr;
  const labels = lang => Object.assign({}, T(lang).label);

  const logit = p => Math.log(p / (1 - p));
  function histCell(hist, tf, h) { return hist && hist[tf] && hist[tf][h] || null; }
  function reliability(hist, tf, h, id, dir) {
    const H = histCell(hist, tf, h); if (!H || !H.sig[id] || !H.sig[id][dir]) return null;
    const [n, k] = H.sig[id][dir], m = 60;
    return { n, p: (k + 0.5 * m) / (n + m), r: k / n };
  }
  function baseRate(hist, tf, h) { const H = histCell(hist, tf, h); return H ? (H.base[1] + 30) / (H.base[0] + 60) : 0.5; }

  function signals(R, I, opts = {}) {
    const lang = opts.lang || 'fr', L = T(lang), X = L.r;
    const n1 = (x, d) => num(lang, x, d), pc = (x, d) => pctL(lang, x, d), pp = x => P(lang, x);
    const D = R.ctx - 1, c = R.c, out = [];
    const vs = R.ctx - (R.vis || 120);
    const add = (id, dir, w, reading, lid) => out.push({ id, label: L.label[lid || id], dir, w, reading, lesson: L.lesson[id] });
    const px = c[D], A = I.atr[D] || (R.h[D] - R.l[D]) || px * 0.01, atrPct = A / px * 100;

    const d200 = (px / I.ema200[D] - 1) * 100;
    add('trend200', Math.abs(px - I.ema200[D]) < 0.3 * A ? 0 : Math.sign(d200), 1, X.trend(pc(d200, 1), d200 >= 0));

    const e20 = I.ema20[D], e50 = I.ema50[D], s20 = e20 - I.ema20[D - 5], s50 = e50 - I.ema50[D - 5];
    let dirStack = 0, rd = X.stackMixed;
    if (e20 > e50 && s20 > 0 && s50 > 0) { dirStack = 1; rd = X.stackUp; }
    else if (e20 < e50 && s20 < 0 && s50 < 0) { dirStack = -1; rd = X.stackDn; }
    else if (e20 > e50) rd = X.stackUpX;
    else rd = X.stackDnX;
    let crossed = 0; for (let j = D - 4; j <= D; j++) if (Math.sign(I.ema20[j] - I.ema50[j]) !== Math.sign(I.ema20[j - 1] - I.ema50[j - 1])) crossed = Math.sign(I.ema20[j] - I.ema50[j]);
    if (crossed) { dirStack = crossed; rd = crossed > 0 ? X.crossUp : X.crossDn; }
    add('emaStack', dirStack, 0.7, rd);

    const r10 = (px / c[D - 10] - 1) * 100;
    add('momentum', Math.abs(r10) < atrPct ? 0 : Math.sign(r10), 0.5, X.mom(pc(r10), n1(Math.abs(r10) / atrPct, 1)));

    const r = I.rsi[D], rv0 = r.toFixed(0);
    let dR = 0, wR = 0.8, rr = X.rsiN(rv0);
    if (r > 70) { dR = -1; rr = X.rsiOB(rv0); }
    else if (r < 30) { dR = 1; rr = X.rsiOS(rv0); }
    else if (r >= 55) { dR = 1; wR = 0.4; rr = X.rsiUp(rv0); }
    else if (r <= 45) { dR = -1; wR = 0.4; rr = X.rsiDn(rv0); }
    add('rsi', dR, wR, rr);

    const mh = I.macdHist[D], mh1 = I.macdHist[D - 1];
    let dM = 0, rm = X.macdN;
    if (mh === 0) rm = X.macdN;
    else if (mh > 0 && mh > mh1) { dM = 1; rm = X.macdUp; }
    else if (mh < 0 && mh < mh1) { dM = -1; rm = X.macdDn; }
    else if (mh > 0) rm = X.macdUpS;
    else rm = X.macdDnS;
    add('macd', dM, 0.6, rm);

    const pb = (px - I.bbL[D]) / (I.bbU[D] - I.bbL[D]);
    add('bb', pb > 1 ? -1 : pb < 0 ? 1 : 0, 0.6, pb > 1 ? X.bbUp : pb < 0 ? X.bbDn : X.bbIn(pp(pb * 100)));

    const dv = (px / I.vwap[D] - 1) * 100;
    add('vwap', Math.abs(px - I.vwap[D]) < 0.2 * A ? 0 : Math.sign(dv), 0.5, X.vwap(pc(dv)));

    let sb = 0, sv = 0; for (let j = D - 4; j <= D; j++) { sb += R.tb[j]; sv += R.vol[j]; }
    const tr = sv ? sb / sv : 0.5;
    add('flow', tr > 0.53 ? 1 : tr < 0.47 ? -1 : 0, 0.7, X.flow(n1(tr * 100, 1) + (lang === 'fr' ? ' %' : '%')));

    const p20 = px - c[D - 20], cv20 = I.cvd[D] - I.cvd[D - 20];
    let dC = 0, wC = 0.4, rc = X.cvdFlat;
    if (Math.sign(p20) !== Math.sign(cv20) && Math.abs(p20) > 0.5 * A) { dC = Math.sign(cv20); wC = 0.6; rc = p20 > 0 ? X.cvdDivUp : X.cvdDivDn; }
    else if (cv20 !== 0) { dC = Math.sign(cv20); rc = cv20 > 0 ? X.cvdUp : X.cvdDn; }
    add('cvd', dC, wC, rc);

    const rv = R.vol[D] / I.volSma[D], body = c[D] - R.o[D];
    if (rv > 2 && Math.abs(body) > 0.2 * A) add('relvol', Math.sign(body), 0.5, X.relvolBig(body > 0, n1(rv, 1)));
    else add('relvol', 0, 0.5, X.relvol(n1(rv, 1)), 'relvolN');

    // Figures TA-Lib terminées sur la dernière bougie (calculées hors ligne avec TA-Lib, sans bougie future)
    const PT = opts.pats;
    if (R.pat && PT && PT.stats) {
      const ST = PT.stats, bh = ST.base[R.tf] && ST.base[R.tf][opts.h], bUp = bh ? bh[1] / bh[0] : 0.5;
      const byF = PT.byF || (PT.byF = Object.fromEntries(PT.list.map(x => [x.f, x])));
      const items = R.pat.filter(x => x[0] === D).map(([, fi, sg]) => {
        const f = ST.funcs[fi], m = byF[f], cell = ST.stats[f] && ST.stats[f][sg] && ST.stats[f][sg][R.tf] && ST.stats[f][sg][R.tf][opts.h];
        return { f, m, sg, n: cell ? cell[0] : 0, up: cell ? cell[1] : 0 };
      });
      let best = null;
      for (const it of items) {
        if (it.m.k !== 'dir' || it.n < 200) continue;
        const rate = it.sg > 0 ? it.up / it.n : 1 - it.up / it.n, ref = it.sg > 0 ? bUp : 1 - bUp, e = Math.abs(rate - ref);
        if (!best || e > best.e) best = Object.assign({ e, rate }, it);
      }
      const txt = items.slice(0, 4).map(it => X.patItem(lang === 'fr' ? it.m.fr : it.m.en, it.m.k === 'dir' ? it.sg : (it.m.k === 'color' ? (it.sg > 0 ? 'g' : 'r') : 0), it.n ? pctL(lang, it.up / it.n * 100, 1).replace('+', '') : null, it.n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')));
      const reading = items.length ? txt.join(' ; ') + (items.length > 4 ? ' …' : '') : X.noPat;
      add('talib', best ? best.sg : 0, 0.5, reading);
      if (best) { const k = best.sg > 0 ? best.up : best.n - best.up; out[out.length - 1].relFixed = { n: best.n, p: (k + 30) / (best.n + 60), r: k / best.n }; }
    } else add('talib', 0, 0.5, opts.live ? X.patNone : X.noPat);

    const pv = pivots(R, vs, D, 3);
    const hs = pv.highs.map(i => R.h[i]), ls = pv.lows.map(i => R.l[i]);
    const res = hs.filter(x => x > px), sup = ls.filter(x => x < px);
    const Rn = res.length ? Math.min(...res) : null, Sn = sup.length ? Math.max(...sup) : null;
    let dS = 0, rs = X.srMid;
    if (hs.length && px > Math.max(...hs)) { dS = 1; rs = X.srBreakUp; }
    else if (ls.length && px < Math.min(...ls)) { dS = -1; rs = X.srBreakDn; }
    else {
      const dr = Rn != null ? (Rn - px) / A : Infinity, ds = Sn != null ? (px - Sn) / A : Infinity;
      if (dr < 0.6 && dr <= ds) { dS = -1; rs = X.srRes(n1(dr, 1)); }
      else if (ds < 0.6) { dS = 1; rs = X.srSup(n1(ds, 1)); }
      else if (Rn != null && Sn != null) rs = X.srBoth(n1(dr, 1), n1(ds, 1));
    }
    add('sr', dS, 0.6, rs);

    const VP = volumeProfile(R, vs, D);
    let dV = 0, wV = 0.4, rvp = X.vpIn;
    if (px > VP.vah) { dV = 1; rvp = X.vpUp; }
    else if (px < VP.val) { dV = -1; rvp = X.vpDn; }
    else if (Math.abs(px - VP.poc) > 0.6 * A) { dV = Math.sign(VP.poc - px); wV = 0.3; rvp = X.vpPoc(VP.poc > px, n1(Math.abs(VP.poc - px) / A, 1)); }
    add('vp', dV, wV, rvp);

    const recentH = pv.highs.filter(i => i >= D - 45), recentL = pv.lows.filter(i => i >= D - 45);
    let dD = 0, rdv = X.divN;
    if (recentH.length >= 2) { const [a, b] = recentH.slice(-2); if (R.h[b] > R.h[a] && I.rsi[b] < I.rsi[a] - 2 && D - b < 15) { dD = -1; rdv = X.divDn; } }
    if (!dD && recentL.length >= 2) { const [a, b] = recentL.slice(-2); if (R.l[b] < R.l[a] && I.rsi[b] > I.rsi[a] + 2 && D - b < 15) { dD = 1; rdv = X.divUp; } }
    add('div', dD, 0.7, rdv);

    const F = R.fx;
    if (F) {
      const f = F.fund[D];
      if (f != null) {
        const k = f > 0.0003 ? 1 : f < -0.0001 ? -1 : 0;
        add('funding', -k, 0.6, X.fund(n1(f * 100, 4) + (lang === 'fr' ? ' %' : '%'), k));
      }
      const oi = F.oi[D], oi10 = F.oi[D - 10];
      if (oi != null && oi10 != null) {
        const oc = (oi / oi10 - 1) * 100, prc = (px / c[D - 10] - 1) * 100, o = pc(oc, 1);
        let dO = 0, wO = 0.6;
        if (Math.abs(oc) > 1 && Math.abs(prc) > 0.3 * atrPct) {
          if (prc > 0 && oc > 0) dO = 1;
          else if (prc > 0 && oc < 0) { dO = -1; wO = 0.4; }
          else if (prc < 0 && oc > 0) dO = -1;
          else { dO = 1; wO = 0.4; }
        }
        const ro = X.oi(o, pc(prc, 1));
        add('oi', dO, wO, ro);
      }
      const la = F.lsAll[D];
      if (la != null) {
        let s = 0, n = 0; for (let j = D - 50; j < D; j++) if (F.lsAll[j] != null) { s += F.lsAll[j]; n++; }
        const m = n ? s / n : la, z = la / m - 1;
        add('lsAll', z > 0.08 ? -1 : z < -0.08 ? 1 : 0, 0.5, X.lsAll(n1(la, 2), pc(z * 100, 0)));
      }
      const lt = F.lsTop[D], lt10 = F.lsTop[D - 10];
      if (lt != null && lt10 != null) {
        const ch = (lt / lt10 - 1) * 100;
        add('lsTop', ch > 5 ? 1 : ch < -5 ? -1 : 0, 0.4, X.lsTop(n1(lt, 2), pc(ch, 1)));
      }
      const tk = [D - 3, D - 2, D - 1, D].map(j => F.taker[j]).filter(x => x != null);
      if (tk.length) {
        const g = Math.exp(tk.reduce((s, x) => s + Math.log(Math.max(x, 1e-6)), 0) / tk.length);
        add('takerFut', g > 1.08 ? 1 : g < 0.92 ? -1 : 0, 0.5, X.taker(n1(g, 2)));
      }
      if (F.b1[D] != null && F.a1[D] != null) {
        const t1 = F.b1[D] + F.a1[D], i1 = (F.b1[D] - F.a1[D]) / t1;
        add('book1', i1 > 0.15 ? 1 : i1 < -0.15 ? -1 : 0, 0.6, X.book(pp(F.b1[D] / t1 * 100), pp(F.a1[D] / t1 * 100)));
      }
      if (F.b5[D] != null && F.a5[D] != null) {
        const t5 = F.b5[D] + F.a5[D], i5 = (F.b5[D] - F.a5[D]) / t5;
        add('book5', i5 > 0.12 ? 1 : i5 < -0.12 ? -1 : 0, 0.4, X.book(pp(F.b5[D] / t5 * 100), pp(F.a5[D] / t5 * 100)));
      }
    }
    const score = out.reduce((s, x) => s + x.dir * x.w, 0);
    const base = baseRate(opts.hist, R.tf, opts.h);
    let z = logit(base);
    for (const x of out) {
      if (!x.dir) continue;
      x.rel = x.relFixed || reliability(opts.hist, R.tf, opts.h, x.id, x.dir);
      if (x.rel) z += 0.6 * (logit(x.dir > 0 ? x.rel.p : 1 - x.rel.p) - logit(base));
    }
    const pUp = 1 / (1 + Math.exp(-z));
    return { list: out, score, pUp, base, VP, pv, atr: A, atrPct };
  }

  // Résultat + explication pédagogique après révélation
  function judge(R, S, guess, h, lang = 'fr') {
    const J = T(lang).j, pp = x => P(lang, x);
    const D = R.ctx - 1, p0 = R.c[D], p1 = R.c[D + h];
    const move = (p1 / p0 - 1) * 100;
    const out = Math.sign(p1 - p0);
    let mx = -Infinity, mn = Infinity;
    for (let j = D + 1; j <= D + h; j++) { mx = Math.max(mx, R.h[j]); mn = Math.min(mn, R.l[j]); }
    const atrMove = Math.abs(p1 - p0) / (S.atr * Math.sqrt(h));
    const correct = out !== 0 && guess === out;
    const fired = S.list.filter(s => s.dir !== 0);
    const right = fired.filter(s => s.dir === out), wrong = fired.filter(s => s.dir !== out);
    const cons = 0; // estimation combinée retirée le 17 nov. 2026 : aucun apport mesuré hors échantillon
    const pSide = pp((cons >= 0 ? S.pUp : 1 - S.pUp) * 100);
    const lines = [];
    const dirWord = d => d > 0 ? J.up : J.down;
    if (out === 0) lines.push(J.void);
    if (out !== 0 && atrMove < 0.35) lines.push(J.tiny(num(lang, atrMove, 2)));
    else if (atrMove > 1.5) lines.push(J.big(num(lang, atrMove, 1)));
    const keys = right.filter(s => s.rel && s.rel.r > 0.515).sort((a, b) => b.rel.r - a.rel.r).slice(0, 2);
    const traps = wrong.filter(s => s.rel && s.rel.r < 0.485);
    return { move, out, mx: (mx / p0 - 1) * 100, mn: (mn / p0 - 1) * 100, atrMove, correct, right, wrong, cons, lines, keys, traps, pUp: S.pUp };
  }

  // Probabilité d'obtenir au moins k bonnes réponses sur n en jouant au hasard
  function binomTail(k, n) {
    if (n === 0) return 1;
    const lf = [0]; for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
    let p = 0; for (let i = k; i <= n; i++) p += Math.exp(lf[n] - lf[i] - lf[n - i] - n * Math.LN2);
    return Math.min(1, p);
  }

  function aggregate(rounds) {
    const valid = rounds.filter(r => r.out !== 0);
    const n = valid.length, k = valid.filter(r => r.ok).length;
    const by = (f) => { const m = {}; for (const r of valid) { const key = f(r); if (key == null) continue; (m[key] = m[key] || { n: 0, k: 0 }); m[key].n++; if (r.ok) m[key].k++; } return m; };
    const sig = {};
    for (const r of valid) for (const [id, d] of Object.entries(r.sig || {})) {
      const s = sig[id] = sig[id] || { n: 0, right: 0, agree: 0, agreeOk: 0, against: 0, againstOk: 0 };
      s.n++; if (d === r.out) s.right++;
      if (d === r.g) { s.agree++; if (r.ok) s.agreeOk++; } else { s.against++; if (r.ok) s.againstOk++; }
    }
    let pnl = 0; const curve = [0];
    for (const r of valid) { pnl += (r.ok ? 1 : -1) * Math.abs(r.mv); curve.push(pnl); }
    return {
      n, k, acc: n ? k / n : 0, p: binomTail(k, n), pnl, curve,
      tf: by(r => r.tf), conf: by(r => r.cf), sym: by(r => r.s),
      cons: by(r => r.cs === 0 ? 'partagé' : r.cs === r.g ? 'avec' : 'contre'),
      trend: by(r => r.sig && r.sig.trend200 ? (r.sig.trend200 === r.g ? 'avec' : 'contre') : null),
      sig
    };
  }

  function advice(A, lang = 'fr', tfLabel = {}) {
    const W = T(lang).a, lab = T(lang).label, tips = [];
    const ratio = m => m && m.n ? m.k / m.n : null, pp = x => P(lang, x * 100);
    const t = A.trend, c = A.cons, cf = A.conf;
    if (t.avec && t.contre && t.avec.n >= 8 && t.contre.n >= 8) tips.push(W.trend(pp(ratio(t.avec)), t.avec.n, pp(ratio(t.contre)), t.contre.n));
    if (cf.forte && cf.faible && cf.forte.n >= 6 && cf.faible.n >= 6) tips.push(W.conf(pp(ratio(cf.forte)), cf.forte.n, pp(ratio(cf.faible)), cf.faible.n));
    const tfs = Object.entries(A.tf).filter(([, m]) => m.n >= 8).sort((a, b) => ratio(b[1]) - ratio(a[1]));
    if (tfs.length >= 2 && ratio(tfs[0][1]) > ratio(tfs[tfs.length - 1][1])) { const a = tfs[0], b = tfs[tfs.length - 1]; tips.push(W.tf(tfLabel[a[0]] || a[0], pp(ratio(a[1])), tfLabel[b[0]] || b[0], pp(ratio(b[1])))); }
    const sigs = Object.entries(A.sig).filter(([, s]) => s.n >= 12).map(([id, s]) => [id, s, s.right / s.n]).sort((a, b) => b[2] - a[2]);
    if (sigs.length) {
      const [id, s, r] = sigs[0];
      tips.push(W.best(lab[id] || id, pp(r), s.n, pp(s.agree / s.n)));
      if (sigs.length > 1) { const w = sigs[sigs.length - 1]; tips.push(W.worst(lab[w[0]] || w[0], pp(w[2]), w[1].n)); }
    }
    if (!tips.length) tips.push(W.more);
    return tips;
  }

  const api = { reliability, baseRate, labels, ema, sma, rsi, atr, indicators, volumeProfile, pivots, signals, judge, binomTail, aggregate, advice };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
