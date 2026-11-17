// Firasa — interface du jeu (français / anglais)
(() => {
const E = window.Engine;
const HIST = /*HIST*/null;
const $ = s => document.querySelector(s);
const app = $('#app');
const TF_SEC = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
const COL = { up: '#2bc8a4', down: '#f0565e', gold: '#d4a24c', blue: '#5aa9ff', violet: '#b28dff', cyan: '#4dd0e1', grid: '#1c2530', text: '#ece6da', muted: '#8c96a5', dim: '#5d6878' };

// ---------- stockage ----------
const KEY = 'firasa.v1';
const DEF = { settings: { ver: 2, h: 5, tfs: ['1d'], len: 100, blind: true, learn: false, book: false, zoom: 120, ov: { ema20: true, ema50: true, ema200: true, bb: false, vwap: false, vp: true, sr: true, pat: true }, pane: 'vol', conf: 'moyenne', lang: null, liveSym: 'BTC', liveTf: '5m', liveH: 3 }, sessions: [], cur: null, live: [], liveOpen: [] };
let ST;
function load() {
  try { ST = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { ST = {}; }
  ST = Object.assign({}, JSON.parse(JSON.stringify(DEF)), ST);
  const old = ST.settings || {};
  ST.settings = Object.assign({}, DEF.settings, old); ST.settings.ov = Object.assign({}, DEF.settings.ov, old.ov);
  if (!old.ver || old.ver < 2) { ST.settings.tfs = ['1d']; ST.settings.ver = 2; }
  ST.live = ST.live || []; ST.liveOpen = ST.liveOpen || [];
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
load();
const set = () => ST.settings;
{
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'fr' || q === 'en') { set().lang = q; save(); }
  if (!set().lang) set().lang = /^fr/i.test(navigator.language || '') ? 'fr' : 'en';
}
const lang = () => set().lang === 'en' ? 'en' : 'fr';
const FR = () => lang() === 'fr';

// ---------- textes de l'interface ----------
const UI = {
  fr: {
    tagline: 'lis le marché', myStats: 'Stats', otherLang: 'EN', docTitle: 'Firasa — devine le prochain mouvement',
    credit: 'Conçu et dirigé par <b>Mustapha</b><span class="dot">◆</span>Développé par <b>Claude</b>',
    thanks: 'Nous remercions le Seigneur pour Son monde merveilleux.',
    soonTag: 'Bientôt', soon: 'Abonnement à la semaine ou au mois.',
    foot: 'Données historiques publiques Binance (spot &amp; futures) · Entraînement uniquement, pas un conseil financier.',
    tf: { '15m': '15 min', '1h': '1 h', '4h': '4 h', '1d': '1 jour' },
    conf: { faible: 'Pas sûr', moyenne: 'Plutôt', forte: 'Sûr' }, confLow: { faible: 'pas sûr', moyenne: 'plutôt sûr', forte: 'sûr' },
    group: { avec: 'avec', contre: 'contre', 'partagé': 'partagé', faible: 'pas sûr', moyenne: 'plutôt sûr', forte: 'sûr' },
    ov: { ema20: 'EMA 20', ema50: 'EMA 50', ema200: 'EMA 200', bb: 'Bollinger', vwap: 'VWAP', vp: 'Profil vol.', sr: 'S/R', pat: 'Figures' },
    pane: { vol: 'Volume', cvd: 'Delta', rsi: 'RSI', macd: 'MACD', oi: 'OI · Funding', book: 'Carnet', ls: 'Long/Short' },
    kicker: 'Entraînement au trading', hero: 'Ça monte ou ça <em>descend</em>&nbsp;?',
    heroText: "Un graphique réel tiré au hasard dans l'historique Binance (août 2017 → novembre 2026), actif et date masqués. Tu disposes des bougies, des volumes et des achats/ventes au marché ; pour 6 cryptos, aussi du carnet d'ordres (depuis 2023), de l'open interest et du funding. Tu paries sur la hausse ou la baisse. Après chaque coup : le résultat, les signaux justes et faux, leur taux de réussite mesuré sur l'historique, et le contexte de marché de la date.",
    features: [['16 marchés', "BTC, ETH, SOL, BNB, XRP, PAXG (adossé à l'or)…"], ['4 unités de temps', '15 min, 1 h, 4 h, 1 jour'], ["Carnet d'ordres", '±1/2/5 % depuis 2023, 6 cryptos'], ['Score de précision', 'testé contre le hasard (loi binomiale)']],
    kAcc: 'précision globale', kN: 'coups joués', kPnl: 'rendement virtuel',
    settings: 'Réglages', horizon: 'Horizon', horizonHint: 'Le prix sera-t-il plus haut ou plus bas dans… (bougies)',
    tfs: 'Unités de temps', len: 'Longueur de session',
    blind: 'Mode aveugle', blindHint: "Cache l'actif, la date et le prix réel (base 100) jusqu'à la réponse",
    learn: 'Mode apprentissage', learnHint: 'Affiche avant ta réponse le sens de la lecture classique de chaque signal et son taux de réussite historique',
    book: "Toujours avec carnet d'ordres", bookHint: 'BTC, ETH, SOL, BNB, XRP, DOGE depuis 2023 : carnet, OI, funding, long/short',
    language: 'Langue',
    resume: (n, l) => `Reprendre la session (${n}/${l})`, start: l => `Commencer une session de ${l} coups`,
    abandon: 'Abandonner et recommencer', whichSignals: 'Quels signaux marchent vraiment ?',
    homeNote: "Mesurés sur 100 000 graphiques historiques tirés au hasard, à l'horizon de 5 bougies, les signaux classiques ont eu raison entre 44,6 % et 56,3 % du temps (cases d'au moins 300 cas). Sur une session de 100 coups, il faut au moins 59 bonnes réponses pour battre le hasard au seuil de 5 %.",
    call: 'coup', streak: 'série', loading: 'Chargement du marché…', drawing: "Tirage d'un graphique dans l'historique…",
    loadFail: 'Impossible de charger le graphique.', retry: 'Réessayer', mystery: 'Actif mystère', horizonW: 'horizon',
    candles: n => `${n} bougie${n > 1 ? 's' : ''}`,
    dur: s => s < 3600 ? `${s / 60} min` : s < 86400 ? `${s / 3600} h` : `${s / 86400} j`,
    readTitle: 'Lecture du marché', readHint: "· les valeurs, à toi d'interpréter",
    question: (h, d) => `Dans <b>${h}</b> (${d})…`, higher: '▲ Plus haut', lower: '▼ Plus bas',
    histTag: (p, r, n) => `historique : juste ${p} sur ${n} cas dans ce sens (taux de base ${r})`,
    right: 'juste', wrong: 'faux',
    pUp: (p, h) => `Estimation à partir des taux historiques des signaux présents : <b>${p}</b> de chances que le prix soit plus haut dans ${h}.`,
    tap: "Touche un signal pour comprendre ce qu'il mesure.",
    bookTitle: "Carnet d'ordres à l'instant T", bids: 'Acheteurs (bids)', asks: 'Vendeurs (asks)',
    bookNote: 'Liquidité en attente à moins de 1, 2 et 5 % du prix (futures Binance, moyenne des 15 dernières minutes).',
    funding: 'Funding', lsCrowd: 'Long/short foule', oi: 'Open interest',
    legendTitle: 'Repères du graphique',
    legend: 'Barres dorées à gauche : profil de volume (volume échangé par niveau de prix sur les 120 dernières bougies) ; ligne pointillée = POC. Lignes R / S : les 2 résistances et les 2 supports les plus proches. Zone grisée à droite : les bougies à deviner.',
    head: { void: 'Annulé', ok: 'Juste', ko: 'Faux' },
    youSaid: (d, c) => `Tu as dit <b>${d > 0 ? 'plus haut' : 'plus bas'}</b> (${c})`,
    over: (h, mx, mn) => `en ${h} · max ${mx} / min ${mn}`,
    toSee: 'Signaux justes sur ce coup, avec un taux historique supérieur à 51,5 % dans ce sens :', histRight: (p, n) => ` ; ${p} sur ${n} cas`,
    noSig: "Aucun des signaux justes sur ce coup n'a un taux historique supérieur à 51,5 % dans ce sens.", noSigNote: '',
    trap: 'Signaux faux sur ce coup, avec un taux historique inférieur à 48,5 % dans ce sens :', trapItem: (l, p, n) => `« ${l} » (${p} sur ${n} cas)`, trapNote: '',
    count: (r, w) => `${r} signal(s) juste(s), ${w} faux. Détail dans « Lecture du marché » ci-dessous.`,
    next: 'Coup suivant →', seeReport: 'Voir le bilan de la session',
    now: 'maintenant', ohlc: ['O', 'H', 'B', 'C'], buys: 'achats',
    pVol: 'Volume · partie verte vive = achats agressifs (taker) · moyenne 20', pCvd: 'Delta (achats − ventes agressifs) · ligne = CVD cumulé',
    pMacd: 'MACD (bleu) · signal (or) · histogramme', pNoFx: 'Pas de données futures pour cet actif / cette période',
    pOi: 'Open interest (cyan) · funding (or = longs paient, bleu = shorts paient)', pBook: "Déséquilibre du carnet : ±1 % (blanc), ±5 % (or) · au-dessus de 0 = plus d'acheteurs",
    pLs: 'Long/short : foule (or) · top traders (bleu)',
    report: 'Bilan de la session', allCalls: 'Tous tes coups', correctOf: (k, n) => `${k} / ${n} bons`,
    curve: 'Courbe : somme des variations en % de chaque coup, en positif si ton appel était juste, en négatif sinon (mises égales, sans frais ni levier).',
    vSig: p => `<b class="up">Meilleur que le hasard au seuil de 5 %</b> : la probabilité d'obtenir au moins ce score en répondant au hasard est de ${p}.`,
    vAbove: p => `Au-dessus de 50 %, mais pas significatif au seuil de 5 % : la probabilité d'obtenir au moins ce score en répondant au hasard est de ${p}.`,
    vBelow: 'À 50 % ou moins sur ces coups : pas mieux que le hasard.',
    yourGame: 'Ce que ça dit de ton jeu', byTf: 'Par unité de temps', byConf: 'Par niveau de confiance', byCons: 'Face au consensus des signaux', byTrend: 'Face à la tendance de fond',
    thCalls: 'coups', thAcc: 'précision', sigRel: 'Fiabilité des signaux sur tes coups', thSig: 'Signal', thTimes: 'fois', thRight: 'juste', thFollow: 'toi si tu suis',
    sigNote: '« juste » = combien de fois le signal annonçait le bon sens. « toi si tu suis » = ta précision quand tu as parié dans le même sens que lui.',
    notEnough: 'Pas encore assez de coups.', newSession: 'Nouvelle session', home: 'Accueil', back: '← Accueil',
    histText: (n, b, h) => `Mesuré sur ${n} tirages aléatoires de graphiques historiques (+ ${b} tirages limités aux périodes avec carnet d'ordres), horizon ${h} : % de fois où le signal a annoncé le bon sens (cases d'au moins 80 cas). <span class="up">Vert</span> : au moins 1,5 point au-dessus du taux de base ; <span class="down">rouge</span> : au moins 1,5 point en dessous.`,
    estNote: "Combiner ces taux en une seule estimation a été testé le 17 novembre 2026 sur 16 cas (4 unités de temps × 4 horizons), réglage avant 2024 et vérification sur 2024-2026 : l'écart avec le simple taux de base est resté inférieur à 0,004 en perte logarithmique (meilleur dans 12 cas, pire dans 3, égal dans 1), et les taux de base eux-mêmes incluaient la période de vérification. L'estimation combinée a donc été retirée du jeu.",
    thSigDir: 'Signal (sens annoncé)', baseRow: 'Hausse au hasard (référence)',
    noCalls: 'Pas encore de coups joués', noCallsText: 'Lance une session pour commencer à mesurer ta précision.', play: 'Jouer',
    sessions: 'Sessions', thDate: 'Date', abandoned: '(abandonnée)', wipe: 'Effacer toutes mes statistiques',
    wipeConfirm: 'Effacer toutes tes sessions et statistiques ? Cette action est définitive.',
    names: { PAXG: "PAX Gold (adossé à l'or)" },
    dayTitle: d => `Ce jour-là — ${d}`, dayBtc: (b, better, d) => `Bitcoin sur la même période : <b>${b}</b> (écart avec cet actif : ${d} points).`,
    dayRange: (n, a, b) => `À ta décision, le prix était à <b>${a}</b> de son plus haut et à <b>${b}</b> de son plus bas des ${n} dernières bougies.`,
    dayTrend: p => `Variation sur les 30 bougies précédant ta décision : <b>${p}</b>.`,
    dayRank: (p, h, n) => `Ce mouvement est plus grand que <b>${p}</b> des mouvements sur ${h} bougie${h > 1 ? 's' : ''} des ${n} bougies précédentes.`,
    dayVol: x => `Volume moyen pendant ta prévision : <b>${x}×</b> la moyenne des 20 bougies précédant ta décision.`,
    evTitle: 'Événements de la liste', evNone: "Aucun événement de la liste entre 14 jours avant la dernière bougie visible et 2 jours après ta prévision.",
    evLast: (n, x) => `Événement précédent de la liste : <b>${n} j avant la dernière bougie</b> — ${x}`, evNote: "Liste limitée et non exhaustive. Prix et variations : bougies journalières Binance (UTC).",
    rel: { before: n => `${n} j avant la dernière bougie`, last: 'jour de la dernière bougie', during: 'pendant ta prévision', after: 'après ta prévision' },
    liveBtn: '● Mode live — le marché en temps réel', liveHome: "Le mode live utilise le flux de prix public de Binance en temps réel. Ton appel est vérifié sur le prix Binance relevé dans les 15 secondes qui suivent l'échéance (ou sur la clôture de la minute de l'échéance si la page était fermée).",
    live: 'LIVE', connecting: 'Connexion au flux Binance…', reconnecting: 'Flux interrompu, reconnexion…', liveFail: 'Impossible de joindre Binance pour le moment.',
    openCalls: 'Appels en cours', noOpen: 'Aucun appel en cours. Fais ton appel avec les boutons en bas.', lastRes: 'Derniers résultats',
    callMade: d => `Appel enregistré : résultat dans ${d}.`, oneOpen: 'Appel en cours sur cet actif et cette unité de temps…',
    resolved: (sym, ok, mv) => `${sym} : ${ok ? 'juste' : 'raté'} (${mv})`, entry: 'entrée', left: 'reste', at: 'à',
    liveBook: 'Carnet live (20 meilleurs niveaux)', spread: 'Écart', imb: 'Acheteurs / vendeurs',
    liveNote: "Taux de réussite historiques disponibles en 15 min et 1 h ; non mesurés en 1 et 5 min.",
    liveAcc: 'précision live', liveStats: 'Mode live', liveCalls: n => `${n} appel${n > 1 ? 's' : ''}`,
    signIn: 'Connexion', accTitle: 'Compte', accWhy: 'Connecte-toi avec Google pour que tes coups en mode aveugle comptent dans le classement des joueurs.',
    accOff: "La connexion Google n'est pas encore activée sur ce site.",
    accName: 'Pseudo', accNameHint: '3 à 20 caractères, visible dans le classement', accRanked: 'Tes coups comptés', accNoRanked: 'Aucun coup compté pour l\'instant.',
    accRule: "Un coup est compté quand tu es connecté et en mode aveugle. Le serveur garde les bougies à deviner jusqu'à ta réponse, et chaque manche n'accepte qu'une réponse.",
    logout: 'Se déconnecter', delAcc: 'Supprimer mon compte', delConfirm: 'Supprimer ton compte et tes coups comptés ? Cette action est définitive.',
    privacy: "Données enregistrées : ton identifiant de compte Google, un pseudo (ton prénom Google au départ, modifiable) et, par unité de temps, le nombre de coups comptés et de coups justes. Ton adresse e-mail n'est pas enregistrée. Un cookie de connexion est conservé 30 jours.",
    plTitle: 'Classement des joueurs', plIntro: 'Coups en mode aveugle des joueurs connectés. Au moins 30 coups pour apparaître.', plName: 'Nom', plEmpty: tf => `Aucun joueur n'a encore 30 coups comptés en ${tf}.`,
    rankedYes: 'Coup compté dans ton classement.', rankedNo: 'Coup non compté : seul le mode aveugle compte.',
    ansNet: 'Connexion impossible. Réessaie.', ansExpired: 'Manche expirée ou déjà jouée : nouvelle manche.',
    admTitle: 'Administration', admDenied: "Page réservée à l'administrateur.", admUsers: 'Comptes', admAnswers: 'coups comptés', admScored: 'prévisions de bots notées',
    admBots: 'Bots', admBotName: 'Nom du bot', admBotAdd: 'Créer une clé', admKind: 'Type', admHouse: 'maison', admExt: 'extérieur',
    admBotNote: "Un bot extérieur envoie ses prévisions avec sa clé (POST /api/lab/predict). Supprimer un bot efface aussi ses prévisions et ses scores.",
    admKeyNote: "Copie cette clé maintenant : seule son empreinte est enregistrée, elle ne sera plus affichée.", admDelConfirm: 'Supprimer ce bot, ses prévisions et ses scores ?',
    labBtn: 'Laboratoire : classement des outils', labTitle: 'Laboratoire — classement des outils',
    labIntro: (n, sy, h) => `${n} outils, chacun réglé ou entraîné uniquement sur les données d'avant le 1er janvier 2024, puis mesuré du 1er janvier 2024 au 14 novembre 2026, période qu'il n'a pas vue. ${sy} cryptos Binance. Question posée : le prix sera-t-il plus haut ou plus bas ${h} bougies plus tard ?`,
    labMethod: (k, fee) => `Intervalle : rééchantillonnage par mois (4 000 tirages), niveau corrigé pour ${k} comparaisons (Bonferroni, 5 % au total). Gain : position dans le sens de l'outil, tenue jusqu'à l'horizon, mises égales ; net = brut moins ${fee} de frais aller-retour (hypothèse).`,
    labBest: (tf, p) => `Meilleur taux de réussite mesuré en ${tf} : ${p}. Aucun outil mesuré ici n'a raison à chaque fois.`,
    labV: { above: 'Au-dessus de 50 %', below: 'En dessous de 50 %', none: 'Non distinguable de 50 %' },
    labN: { pos: 'Gain net positif (intervalle au-dessus de 0).', neg: 'Gain net négatif (intervalle sous 0).', none: 'Gain net non distinguable de 0.' },
    labCI: (a, b) => `intervalle ${a} à ${b}`,
    labLine: (n, cov, tr) => `${n} appels (${cov} des bougies) · avant 2024 : ${tr}`,
    labGain: (g, n) => `Gain moyen par appel : brut ${g}, net ${n}.`,
    fwTitle: 'Classement en avant — depuis le 17 novembre 2026', bkTitle: 'Test sur le passé (2024-2026)',
    fwIntro: h => `Chaque outil enregistre sa prévision juste après la clôture d'une bougie Kraken (16 cryptos, paires en dollars). Elle est notée ${h} bougies plus tard sur le prix de clôture Kraken, et ne peut plus être modifiée. Les 10 outils maison ont été réglés sur l'historique Binance d'avant 2024 ; ils sont calculés automatiquement chaque heure pour le 1 h, et chaque jour à partir de 00:21 UTC pour le 1 jour.`,
    fwEmpty: tf => `Aucune prévision notée en ${tf} pour l'instant.`,
    fwPending: n => `Prévisions en attente de notation : ${n}.`,
    fwLine: (n, c, g) => `${n} prévisions notées sur ${c} bougies de départ · gain brut moyen ${g}.`,
    fwCI: (a, b) => `Intervalle à 95 % : ${a} à ${b}.`, fwNoCI: 'Moins de 30 bougies de départ : pas d\'intervalle.',
    fwNote: "Intervalle calculé par bougie de départ. Les prévisions à 5 bougies se chevauchent : l'incertitude réelle est plus grande.",
    fwApi: "Bots extérieurs : envoi des prévisions par API (POST /api/lab/predict, dans les 10 minutes après la clôture en 1 h, 60 minutes en 1 jour). Les clés sont créées par l'administrateur.",
    labTools: { up: 'Toujours « plus haut »', mom: 'Momentum 10 bougies (suivre)', amom: 'Momentum 10 bougies (inverser)', ema200: "Côté de l'EMA 200", ema2050: 'EMA 20 au-dessus ou sous EMA 50', rsi: 'RSI : hausse sous 30, baisse au-dessus de 70', bb: 'Bollinger : hausse sous la bande basse, baisse au-dessus de la haute', macd: "Signe de l'histogramme MACD", flow: 'Achats au marché > 53 % ou < 47 % (suivre)', aflow: 'Achats au marché > 53 % ou < 47 % (inverser)', eng: 'Avalement (sens TA-Lib)', aeng: 'Avalement (sens inversé)', logit: 'Régression logistique (12 mesures)', logit_c: 'Régression logistique, seulement si probabilité > 53 % ou < 47 %', logit11: 'Régression logistique (11 mesures, sans les achats au marché)', logit11_c: 'Régression logistique (11 mesures), seulement si probabilité > 53 % ou < 47 %', gb: 'Arbres boostés (12 mesures)', gb_c: 'Arbres boostés, seulement si probabilité > 53 % ou < 47 %' },
    patBtn: 'Figures de bougies : ce qui a suivi chacune', patTitle: 'Figures de bougies',
    patIntro: (n, c, h) => `Les ${n} figures de la bibliothèque TA-Lib (définitions standard), détectées sur ${c} bougies Binance : 16 cryptos, de 15 min à 1 jour, d'août 2017 au 14 novembre 2026. Pour chaque figure : nombre de cas, et % de fois où le prix était plus haut ${h} après la bougie qui termine la figure.`,
    patNote: "Vert : au moins 1,5 point au-dessus du taux de base de la même unité de temps ; rouge : au moins 1,5 point en dessous (cases d'au moins 100 cas). Les figures qui exigent un gap sont rares : sur Binance, 98,2 % des bougies 1 h du BTC ouvrent à moins de 0,1 % de la clôture précédente.",
    patFilters: { all: 'Toutes', one: '1 bougie', two: '2 bougies', more: '3 bougies et +', big: 'Au moins 1 000 cas' },
    patExample: (s, tf, d) => `Exemple réel : ${s}/USDT · ${tf} · ${d}. Bande dorée : la figure ; bougies pâles : les 5 suivantes.`,
    patNoEx: 'Aucun exemple dans les données.',
    patKind: { dir: 'Sens TA-Lib : +100 = haussière, −100 = baissière.', color: 'TA-Lib : +100 = bougie verte, −100 = bougie rouge, sans sens haussier ou baissier.', presence: 'TA-Lib : +100 = figure présente, sans sens haussier ou baissier.' },
    patRows: { dir1: 'haussière', 'dir-1': 'baissière', color1: 'verte', 'color-1': 'rouge', presence1: 'présente', base: 'taux de base' },
    patTotal: n => `Détectée ${n} fois au total (toutes unités de temps).`, patL: L => `${L} bougie${L > 1 ? 's' : ''}`,
    patOv: 'Figures', crossPat: 'Figures'
  },
  en: {
    tagline: 'read the market', myStats: 'Stats', otherLang: 'FR', docTitle: 'Firasa — call the next move',
    credit: 'Conceived and directed by <b>Mustapha</b><span class="dot">◆</span>Built by <b>Claude</b>',
    thanks: 'We thank the Lord for His wonderful world.',
    soonTag: 'Soon', soon: 'Weekly or monthly subscription.',
    foot: 'Public historical Binance data (spot &amp; futures) · For training only, not financial advice.',
    tf: { '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1D' },
    conf: { faible: 'Unsure', moyenne: 'Fairly', forte: 'Sure' }, confLow: { faible: 'unsure', moyenne: 'fairly sure', forte: 'sure' },
    group: { avec: 'with', contre: 'against', 'partagé': 'neutral', faible: 'unsure', moyenne: 'fairly sure', forte: 'sure' },
    ov: { ema20: 'EMA 20', ema50: 'EMA 50', ema200: 'EMA 200', bb: 'Bollinger', vwap: 'VWAP', vp: 'Vol. profile', sr: 'S/R', pat: 'Patterns' },
    pane: { vol: 'Volume', cvd: 'Delta', rsi: 'RSI', macd: 'MACD', oi: 'OI · Funding', book: 'Book', ls: 'Long/Short' },
    kicker: 'Trading practice', hero: 'Up or <em>down</em>?',
    heroText: 'A real chart drawn at random from Binance history (August 2017 → November 2026), with the asset and date hidden. You get the candles, volume and market buys/sells; for 6 coins, also the order book (since 2023), open interest and funding. You call up or down. After each call: the result, which signals were right or wrong, their success rate measured on history, and the market context of the date.',
    features: [['16 markets', 'BTC, ETH, SOL, BNB, XRP, PAXG (gold-backed)…'], ['4 timeframes', '15m, 1h, 4h, 1D'], ['Order book', '±1/2/5% depth since 2023, 6 coins'], ['Accuracy score', 'tested against chance (binomial test)']],
    kAcc: 'overall accuracy', kN: 'calls made', kPnl: 'virtual P&L',
    settings: 'Settings', horizon: 'Horizon', horizonHint: 'Will price be higher or lower in… (candles)',
    tfs: 'Timeframes', len: 'Session length',
    blind: 'Blind mode', blindHint: 'Hides the asset, the date and the real price (rebased to 100) until you answer',
    learn: 'Learning mode', learnHint: "Shows each signal's classic-reading direction and its historical success rate before you answer",
    book: 'Order book rounds only', bookHint: 'BTC, ETH, SOL, BNB, XRP, DOGE since 2023: order book, OI, funding, long/short',
    language: 'Language',
    resume: (n, l) => `Resume session (${n}/${l})`, start: l => `Start a ${l}-call session`,
    abandon: 'Abandon and start over', whichSignals: 'Which signals actually work?',
    homeNote: 'Measured on 100,000 random historical charts at a 5-candle horizon, classic signals were right between 44.6% and 56.3% of the time (cells with at least 300 cases). In a 100-call session, you need at least 59 correct calls to beat chance at the 5% level.',
    call: 'call', streak: 'streak', loading: 'Loading market…', drawing: 'Drawing a chart from history…',
    loadFail: 'Could not load the chart.', retry: 'Retry', mystery: 'Mystery asset', horizonW: 'horizon',
    candles: n => `${n} candle${n > 1 ? 's' : ''}`,
    dur: s => s < 3600 ? `${s / 60} min` : s < 86400 ? `${s / 3600} h` : `${s / 86400} d`,
    readTitle: 'Market read', readHint: '· raw readings, your call',
    question: (h, d) => `In <b>${h}</b> (${d})…`, higher: '▲ Higher', lower: '▼ Lower',
    histTag: (p, r, n) => `history: right ${p} of ${n} cases in this direction (base rate ${r})`,
    right: 'right', wrong: 'wrong',
    pUp: (p, h) => `Estimate from the historical rates of the signals present: <b>${p}</b> chance that price is higher in ${h}.`,
    tap: 'Tap a signal to learn what it measures.',
    bookTitle: 'Order book right now', bids: 'Bids', asks: 'Asks',
    bookNote: 'Resting liquidity within 1, 2 and 5% of price (Binance perps, average over the last 15 minutes).',
    funding: 'Funding', lsCrowd: 'Crowd long/short', oi: 'Open interest',
    legendTitle: 'Chart key',
    legend: 'Gold bars on the left: volume profile (volume traded per price level over the last 120 candles); dotted line = POC. R / S lines: the 2 nearest resistance and support levels. Shaded zone on the right: the candles to call.',
    head: { void: 'Voided', ok: 'Right', ko: 'Wrong' },
    youSaid: (d, c) => `You called <b>${d > 0 ? 'higher' : 'lower'}</b> (${c})`,
    over: (h, mx, mn) => `over ${h} · high ${mx} / low ${mn}`,
    toSee: 'Signals right on this call with a historical rate above 51.5% in this direction:', histRight: (p, n) => `; ${p} of ${n} cases`,
    noSig: 'None of the signals that were right on this call has a historical rate above 51.5% in this direction.', noSigNote: '',
    trap: 'Signals wrong on this call with a historical rate below 48.5% in this direction:', trapItem: (l, p, n) => `"${l}" (${p} of ${n} cases)`, trapNote: '',
    count: (r, w) => `${r} signal(s) right, ${w} wrong. Details under "Market read" below.`,
    next: 'Next call →', seeReport: 'See the session report',
    now: 'now', ohlc: ['O', 'H', 'L', 'C'], buys: 'buys',
    pVol: 'Volume · bright green = aggressive (taker) buys · 20-period average', pCvd: 'Delta (taker buys − taker sells) · line = cumulative CVD',
    pMacd: 'MACD (blue) · signal (gold) · histogram', pNoFx: 'No futures data for this asset / period',
    pOi: 'Open interest (cyan) · funding (gold = longs pay, blue = shorts pay)', pBook: 'Book imbalance: ±1% (white), ±5% (gold) · above 0 = more bids',
    pLs: 'Long/short: crowd (gold) · top traders (blue)',
    report: 'Session report', allCalls: 'All your calls', correctOf: (k, n) => `${k} / ${n} correct`,
    curve: 'Curve: sum of each call’s % move, positive when your call was right, negative otherwise (equal size, no fees, no leverage).',
    vSig: p => `<b class="up">Better than chance at the 5% level</b>: the probability of scoring at least this by answering at random is ${p}.`,
    vAbove: p => `Above 50%, but not significant at the 5% level: the probability of scoring at least this by answering at random is ${p}.`,
    vBelow: 'At 50% or below on these calls: no better than chance.',
    yourGame: 'What it says about your game', byTf: 'By timeframe', byConf: 'By confidence', byCons: 'Versus the signal consensus', byTrend: 'Versus the long-term trend',
    thCalls: 'calls', thAcc: 'accuracy', sigRel: 'Signal reliability on your calls', thSig: 'Signal', thTimes: 'times', thRight: 'right', thFollow: 'you, following it',
    sigNote: '"right" = how often the signal pointed the correct way. "you, following it" = your accuracy when you bet the same way as the signal.',
    notEnough: 'Not enough calls yet.', newSession: 'New session', home: 'Home', back: '← Home',
    histText: (n, b, h) => `Measured on ${n} random draws of historical charts (+ ${b} draws limited to periods with order book data), horizon ${h}: % of the time the signal called the right direction (cells with at least 80 cases). <span class="up">Green</span>: at least 1.5 points above the base rate; <span class="down">red</span>: at least 1.5 points below.`,
    estNote: 'Combining these rates into a single estimate was tested on November 17, 2026 on 16 cases (4 timeframes × 4 horizons), tuned before 2024 and checked on 2024-2026: the gap with the plain base rate stayed below 0.004 in log loss (better in 12 cases, worse in 3, equal in 1), and the base rates themselves included the checking period. The combined estimate was therefore removed from the game.',
    thSigDir: 'Signal (direction called)', baseRow: 'Up by chance (baseline)',
    noCalls: 'No calls yet', noCallsText: 'Start a session to begin measuring your accuracy.', play: 'Play',
    sessions: 'Sessions', thDate: 'Date', abandoned: '(abandoned)', wipe: 'Erase all my stats',
    wipeConfirm: 'Erase all your sessions and stats? This cannot be undone.',
    names: { PAXG: 'PAX Gold (gold-backed)' },
    dayTitle: d => `That day — ${d}`, dayBtc: (b, better, d) => `Bitcoin over the same period: <b>${b}</b> (gap with this asset: ${d} pts).`,
    dayRange: (n, a, b) => `At your decision, price was <b>${a}</b> from its high and <b>${b}</b> from its low of the last ${n} candles.`,
    dayTrend: p => `Change over the 30 candles before your decision: <b>${p}</b>.`,
    dayRank: (p, h, n) => `This move was bigger than <b>${p}</b> of the ${h}-candle moves in the previous ${n} candles.`,
    dayVol: x => `Average volume during your call: <b>${x}×</b> the 20-candle average before your decision.`,
    evTitle: 'Events on the list', evNone: 'No event on the list from 14 days before the last visible candle to 2 days after your call ended.',
    evLast: (n, x) => `Previous event on the list: <b>${n} days before the last candle</b> — ${x}`, evNote: 'Limited, non-exhaustive list. Prices and changes: Binance daily candles (UTC).',
    rel: { before: n => `${n} d before the last candle`, last: 'day of the last candle', during: 'during your call', after: 'after your call' },
    liveBtn: '● Live mode — the market in real time', liveHome: "Live mode uses Binance's public real-time price feed. Your call is checked against the Binance price read within 15 seconds after expiry (or the close of the expiry minute if the page was closed).",
    live: 'LIVE', connecting: 'Connecting to the Binance feed…', reconnecting: 'Feed interrupted, reconnecting…', liveFail: 'Could not reach Binance right now.',
    openCalls: 'Open calls', noOpen: 'No open calls. Make your call with the buttons below.', lastRes: 'Latest results',
    callMade: d => `Call placed: result in ${d}.`, oneOpen: 'Call open on this asset and timeframe…',
    resolved: (sym, ok, mv) => `${sym}: ${ok ? 'right' : 'missed'} (${mv})`, entry: 'entry', left: 'left', at: 'at',
    liveBook: 'Live order book (top 20 levels)', spread: 'Spread', imb: 'Bids / asks',
    liveNote: 'Historical success rates available on 15m and 1h; not measured on 1m and 5m.',
    liveAcc: 'live accuracy', liveStats: 'Live mode', liveCalls: n => `${n} call${n > 1 ? 's' : ''}`,
    signIn: 'Sign in', accTitle: 'Account', accWhy: 'Sign in with Google so your blind-mode calls count in the player leaderboard.',
    accOff: 'Google sign-in is not enabled on this site yet.',
    accName: 'Nickname', accNameHint: '3 to 20 characters, shown in the leaderboard', accRanked: 'Your counted calls', accNoRanked: 'No counted calls yet.',
    accRule: 'A call is counted when you are signed in and in blind mode. The server keeps the candles to guess until you answer, and each round accepts only one answer.',
    logout: 'Sign out', delAcc: 'Delete my account', delConfirm: 'Delete your account and your counted calls? This cannot be undone.',
    privacy: 'Data stored: your Google account identifier, a nickname (your Google first name at first, editable) and, per timeframe, the number of counted calls and correct calls. Your email address is not stored. A sign-in cookie is kept for 30 days.',
    plTitle: 'Player leaderboard', plIntro: 'Blind-mode calls by signed-in players. At least 30 calls to appear.', plName: 'Name', plEmpty: tf => `No player has 30 counted calls on ${tf} yet.`,
    rankedYes: 'Call counted in your ranking.', rankedNo: 'Call not counted: only blind mode counts.',
    ansNet: 'Could not connect. Try again.', ansExpired: 'Round expired or already played: new round.',
    admTitle: 'Administration', admDenied: 'This page is for the administrator only.', admUsers: 'Accounts', admAnswers: 'counted calls', admScored: 'bot calls scored',
    admBots: 'Bots', admBotName: 'Bot name', admBotAdd: 'Create a key', admKind: 'Type', admHouse: 'house', admExt: 'external',
    admBotNote: 'An external bot sends its calls with its key (POST /api/lab/predict). Deleting a bot also deletes its calls and scores.',
    admKeyNote: 'Copy this key now: only its fingerprint is stored, it will not be shown again.', admDelConfirm: 'Delete this bot, its calls and its scores?',
    labBtn: 'Lab: tool leaderboard', labTitle: 'Lab — tool leaderboard',
    labIntro: (n, sy, h) => `${n} tools, each tuned or trained only on data before January 1, 2024, then measured from January 1, 2024 to November 14, 2026, a period it has not seen. ${sy} Binance coins. Question asked: will price be higher or lower ${h} candles later?`,
    labMethod: (k, fee) => `Interval: resampling by month (4,000 draws), level corrected for ${k} comparisons (Bonferroni, 5% overall). Gain: position in the tool's direction, held to the horizon, equal size; net = gross minus ${fee} round-trip fees (assumption).`,
    labBest: (tf, p) => `Best success rate measured on ${tf}: ${p}. No tool measured here is right every time.`,
    labV: { above: 'Above 50%', below: 'Below 50%', none: 'Not distinguishable from 50%' },
    labN: { pos: 'Net gain positive (interval above 0).', neg: 'Net gain negative (interval below 0).', none: 'Net gain not distinguishable from 0.' },
    labCI: (a, b) => `interval ${a} to ${b}`,
    labLine: (n, cov, tr) => `${n} calls (${cov} of candles) · before 2024: ${tr}`,
    labGain: (g, n) => `Average gain per call: gross ${g}, net ${n}.`,
    fwTitle: 'Forward leaderboard — since November 17, 2026', bkTitle: 'Test on the past (2024-2026)',
    fwIntro: h => `Each tool records its call right after a Kraken candle closes (16 coins, US dollar pairs). It is scored ${h} candles later on the Kraken closing price, and cannot be changed afterwards. The 10 house tools were tuned on Binance history before 2024; they are computed automatically every hour for 1h, and every day from 00:21 UTC for 1D.`,
    fwEmpty: tf => `No scored calls on ${tf} yet.`,
    fwPending: n => `Calls waiting to be scored: ${n}.`,
    fwLine: (n, c, g) => `${n} scored calls over ${c} starting candles · average gross gain ${g}.`,
    fwCI: (a, b) => `95% interval: ${a} to ${b}.`, fwNoCI: 'Fewer than 30 starting candles: no interval.',
    fwNote: 'Interval computed per starting candle. 5-candle calls overlap: the real uncertainty is larger.',
    fwApi: 'External bots: calls are sent by API (POST /api/lab/predict, within 10 minutes of the close on 1h, 60 minutes on 1D). Keys are created by the administrator.',
    labTools: { up: 'Always "higher"', mom: '10-candle momentum (follow)', amom: '10-candle momentum (fade)', ema200: 'Side of the EMA 200', ema2050: 'EMA 20 above or below EMA 50', rsi: 'RSI: up below 30, down above 70', bb: 'Bollinger: up below the lower band, down above the upper', macd: 'Sign of the MACD histogram', flow: 'Market buys > 53% or < 47% (follow)', aflow: 'Market buys > 53% or < 47% (fade)', eng: 'Engulfing (TA-Lib direction)', aeng: 'Engulfing (reversed)', logit: 'Logistic regression (12 measures)', logit_c: 'Logistic regression, only when probability > 53% or < 47%', logit11: 'Logistic regression (11 measures, without market buys)', logit11_c: 'Logistic regression (11 measures), only when probability > 53% or < 47%', gb: 'Boosted trees (12 measures)', gb_c: 'Boosted trees, only when probability > 53% or < 47%' },
    patBtn: 'Candlestick patterns: what followed each one', patTitle: 'Candlestick patterns',
    patIntro: (n, c, h) => `The ${n} patterns of the TA-Lib library (standard definitions), detected on ${c} Binance candles: 16 coins, 15m to 1D, August 2017 to November 14, 2026. For each pattern: number of cases, and % of times price was higher ${h} after the candle that completes the pattern.`,
    patNote: 'Green: at least 1.5 points above the base rate of the same timeframe; red: at least 1.5 points below (cells with at least 100 cases). Patterns that need a gap are rare: on Binance, 98.2% of BTC 1h candles open within 0.1% of the previous close.',
    patFilters: { all: 'All', one: '1 candle', two: '2 candles', more: '3+ candles', big: 'At least 1,000 cases' },
    patExample: (s, tf, d) => `Real example: ${s}/USDT · ${tf} · ${d}. Gold band: the pattern; faded candles: the next 5.`,
    patNoEx: 'No example in the data.',
    patKind: { dir: 'TA-Lib direction: +100 = bullish, −100 = bearish.', color: 'TA-Lib: +100 = green candle, −100 = red candle, with no bullish or bearish meaning.', presence: 'TA-Lib: +100 = pattern present, with no bullish or bearish meaning.' },
    patRows: { dir1: 'bullish', 'dir-1': 'bearish', color1: 'green', 'color-1': 'red', presence1: 'present', base: 'base rate' },
    patTotal: n => `Detected ${n} times in total (all timeframes).`, patL: L => `${L} candle${L > 1 ? 's' : ''}`,
    patOv: 'Patterns', crossPat: 'Patterns'
  }
};
const U = () => UI[lang()];
let LABELS = E.labels(lang());

// ---------- formats ----------
function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => t.style.display = 'none', 3200); }
const dec = (x, d) => { const s = x.toFixed(d); return FR() ? s.replace('.', ',') : s; };
const sfx = () => FR() ? ' %' : '%';
const fmtPct = (x, d = 2) => (x >= 0 ? '+' : '') + dec(x, d) + sfx();
const pctTxt = (x, d = 0) => dec(x * 100, d) + sfx();
const loc = () => FR() ? 'fr-FR' : 'en-GB';
const dateTxt = (t, tf) => new Date(t * 1000).toLocaleString(loc(), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', ...(tf === '1d' ? {} : { hour: '2-digit', minute: '2-digit' }) }) + (tf === '1d' ? '' : ' UTC');
const shortDate = (t, tf) => new Date(t * 1000).toLocaleString(loc(), { timeZone: 'UTC', ...(tf === '1d' || tf === '4h' ? { day: 'numeric', month: 'short' } : { day: 'numeric', hour: '2-digit', minute: '2-digit' }) });
function money(x) {
  const a = Math.abs(x);
  if (FR()) return a >= 1e9 ? dec(x / 1e9, 2) + ' Md$' : a >= 1e6 ? dec(x / 1e6, 1) + ' M$' : a >= 1e3 ? dec(x / 1e3, 0) + ' k$' : dec(x, 0) + ' $';
  return a >= 1e9 ? '$' + (x / 1e9).toFixed(2) + 'B' : a >= 1e6 ? '$' + (x / 1e6).toFixed(1) + 'M' : a >= 1e3 ? '$' + (x / 1e3).toFixed(0) + 'k' : '$' + x.toFixed(0);
}
function priceTxt(p) { const a = Math.abs(p); return a >= 1000 ? p.toFixed(0) : a >= 10 ? p.toFixed(2) : a >= 1 ? p.toFixed(3) : a >= 0.01 ? p.toFixed(5) : p.toPrecision(4); }
const tfL = t => U().tf[t] || t;
const assetName = R => U().names[R.sym] || R.name;

// ---------- en-tête, pied de page, langue ----------
function chrome() {
  document.documentElement.lang = lang();
  document.title = U().docTitle;
  $('#tagline').textContent = U().tagline;
  $('#credit').innerHTML = U().credit;
  $('#thanks').textContent = U().thanks;
  $('#statsBtn').textContent = U().myStats;
  $('#langBtn').textContent = U().otherLang;
  accLabel();
  $('#foot').innerHTML = U().foot;
}
let SCREEN = 'home', lastReport = null;
$('#langBtn').onclick = () => {
  set().lang = FR() ? 'en' : 'fr'; save(); LABELS = E.labels(lang()); chrome();
  if (SCREEN === 'game' && G && !G.live) {
    G.S = E.signals(G.R, G.I, { hist: HIST, h: G.h, lang: lang(), pats: window.FIRASA_PATTERNS });
    if (G.guess != null) G.res = E.judge(G.R, G.S, G.guess, G.h, lang());
    renderGame(); if (G.guess != null && G.revealed >= G.h) showResult(true);
  } else if (SCREEN === 'report' && lastReport) renderReport(lastReport, U().report, true);
  else if (SCREEN === 'live') renderLive();
  else if (SCREEN === 'patterns') renderPatterns();
  else if (SCREEN === 'lab') renderLab();
  else if (SCREEN === 'account') renderAccount();
  else if (SCREEN === 'admin') renderAdmin();
  else if (SCREEN === 'game') renderGameShell();
  else go(SCREEN);
};

// ---------- réseau ----------
const queue = [];
let fetching = 0;
const sigOf = () => set().tfs.join(',') + '|' + (set().book ? 1 : 0) + '|' + (set().blind ? 1 : 0);
async function fetchRound() {
  const s = set();
  const u = `/api/round?tfs=${s.tfs.join(',')}${s.book ? '&book=1' : ''}${s.blind ? '&blind=1' : ''}&r=${Math.random().toString(36).slice(2)}`;
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(u); if (r.ok) { const d = await r.json(); if (!d.error) return d; } } catch (e) {}
    await new Promise(r => setTimeout(r, 600 * (i + 1)));
  }
  throw new Error('network');
}
function refill() {
  while (queue.length + fetching < 2) {
    fetching++; const sig = sigOf();
    fetchRound().then(d => queue.push({ sig, d, at: Date.now() })).catch(() => {}).finally(() => { fetching--; });
  }
}
function takeQueued() {
  while (queue.length) { const q = queue.shift(); if (q.sig === sigOf() && Date.now() - q.at < 2400000) return q.d; }
  return null;
}
async function nextRound() {
  refill();
  for (let i = 0; i < 80; i++) {
    const d = takeQueued(); if (d) { refill(); return d; }
    if (!fetching) refill();
    await new Promise(r => setTimeout(r, 150));
  }
  try { return await fetchRound(); } catch (e) { return null; }
}

// ---------- navigation ----------
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  e.preventDefault(); go(g.dataset.go);
});
function go(screen) {
  stopAnim(); stopLive();
  if (screen === 'home') renderHome(); else if (screen === 'stats') renderStats(); else if (screen === 'play') startOrResume();
  else if (screen === 'signals') { SCREEN = 'signals'; app.innerHTML = histTable(true) + `<button class="btn ghost" data-go="home">${U().back}</button>`; }
  else if (screen === 'live') renderLive();
  else if (screen === 'patterns') renderPatterns();
  else if (screen === 'lab') renderLab();
  else if (screen === 'account') renderAccount();
  else if (screen === 'admin') renderAdmin();
  window.scrollTo(0, 0);
}

// ---------- accueil ----------
function allRounds() { return ST.sessions.flatMap(s => s.rounds).concat(ST.cur ? ST.cur.rounds : []); }
function renderHome() {
  SCREEN = 'home';
  const s = set(), A = E.aggregate(allRounds()), cur = ST.cur, t = U();
  app.innerHTML = `
  <div class="soon"><span class="pill">${t.soonTag}</span><span>${t.soon}</span></div>
  <section class="card" style="padding:20px 18px">
    <h3>${t.kicker}</h3>
    <h1>${t.hero}</h1>
    <p class="muted">${t.heroText}</p>
    <div class="feature">${t.features.map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join('')}</div>
  </section>
  ${A.n ? `<section class="kpis">
    <div class="kpi"><b>${pctTxt(A.acc)}</b><span>${t.kAcc}</span></div>
    <div class="kpi"><b>${A.n}</b><span>${t.kN}</span></div>
    <div class="kpi"><b class="${A.pnl >= 0 ? 'up' : 'down'}">${fmtPct(A.pnl, 1)}</b><span>${t.kPnl}</span></div>
  </section>` : ''}
  <section class="card">
    <h2>${t.settings}</h2>
    <div class="setting"><label>${t.horizon}<span class="hint">${t.horizonHint}</span></label>
      <div class="seg" id="sH">${[1, 3, 5, 10].map(h => `<button data-v="${h}" class="${s.h === h ? 'on' : ''}">${h}</button>`).join('')}</div></div>
    <div class="setting"><label>${t.tfs}</label>
      <div class="row" id="sTf">${Object.keys(TF_SEC).map(x => `<button class="chip ${s.tfs.includes(x) ? 'on' : ''}" data-v="${x}">${tfL(x)}</button>`).join('')}</div></div>
    <div class="setting"><label>${t.len}</label>
      <div class="seg" id="sLen">${[25, 50, 100].map(n => `<button data-v="${n}" class="${s.len === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="setting"><label>${t.blind}<span class="hint">${t.blindHint}</span></label><button class="tog ${s.blind ? 'on' : ''}" data-k="blind" aria-label="${t.blind}"></button></div>
    <div class="setting"><label>${t.learn}<span class="hint">${t.learnHint}</span></label><button class="tog ${s.learn ? 'on' : ''}" data-k="learn" aria-label="${t.learn}"></button></div>
    <div class="setting"><label>${t.book}<span class="hint">${t.bookHint}</span></label><button class="tog ${s.book ? 'on' : ''}" data-k="book" aria-label="${t.book}"></button></div>
    <div class="setting"><label>${t.language}</label>
      <div class="seg" id="sLang"><button data-v="fr" class="${FR() ? 'on' : ''}">Français</button><button data-v="en" class="${FR() ? '' : 'on'}">English</button></div></div>
  </section>
  <button class="btn" data-go="play">${cur ? t.resume(cur.rounds.length, cur.len) : t.start(s.len)}</button>
  ${cur ? `<button class="btn ghost" style="margin-top:8px" id="newSess">${t.abandon}</button>` : ''}
  <button class="btn ghost live-btn" style="margin-top:8px" data-go="live">${t.liveBtn}</button>
  <button class="btn ghost" style="margin-top:8px" data-go="lab">${t.labBtn}</button>
  <button class="btn ghost" style="margin-top:8px" data-go="patterns">${t.patBtn}</button>
  <button class="btn ghost" style="margin-top:8px" data-go="signals">${t.whichSignals}</button>
  <p class="muted small" style="margin-top:14px">${t.homeNote}</p>
  <p class="muted small">${t.liveHome}</p>`;
  $('#sH').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.h = +b.dataset.v; save(); renderHome(); };
  $('#sLen').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.len = +b.dataset.v; save(); renderHome(); };
  $('#sLang').onclick = e => { const b = e.target.closest('button'); if (!b || b.dataset.v === lang()) return; $('#langBtn').click(); };
  $('#sTf').onclick = e => { const b = e.target.closest('button'); if (!b) return; const x = b.dataset.v; if (s.tfs.includes(x)) { if (s.tfs.length > 1) s.tfs = s.tfs.filter(y => y !== x); } else s.tfs.push(x); queue.length = 0; save(); renderHome(); };
  app.querySelectorAll('.tog').forEach(b => b.onclick = () => { s[b.dataset.k] = !s[b.dataset.k]; if (b.dataset.k === 'book' || b.dataset.k === 'blind') queue.length = 0; save(); renderHome(); });
  const ns = $('#newSess'); if (ns) ns.onclick = () => { if (ST.cur.rounds.length) ST.sessions.push(Object.assign(ST.cur, { done: false, end: Date.now() })); ST.cur = null; save(); startOrResume(); };
  refill();
}

// ---------- partie ----------
let G = null, animT = null;
function stopAnim() { if (animT) { clearInterval(animT); animT = null; } }
function startOrResume() {
  if (!ST.cur) { ST.cur = { id: Date.now(), start: Date.now(), len: set().len, h: set().h, rounds: [] }; save(); }
  playRound();
}
async function playRound() {
  const cur = ST.cur; G = null;
  if (cur.rounds.length >= cur.len) return finishSession();
  renderGameShell();
  const R = await nextRound();
  if (!R) { $('#chartLoad').innerHTML = `${U().loadFail} <button class="chip" id="retry" style="margin-left:8px">${U().retry}</button>`; $('#retry').onclick = playRound; return; }
  R.vis = 120;
  const I = E.indicators(R, R.ctx, R.ctx - R.vis);
  const S = E.signals(R, I, { hist: HIST, h: cur.h, lang: lang(), pats: window.FIRASA_PATTERNS });
  G = { R, I, S, h: cur.h, revealed: 0, guess: null, cross: null, base: R.c[R.ctx - 1] };
  renderGame();
}
function header() {
  const cur = ST.cur, rs = cur.rounds.filter(r => r.out !== 0), ok = rs.filter(r => r.ok).length, t = U();
  let streak = 0; for (let i = rs.length - 1; i >= 0 && rs[i].ok; i--) streak++;
  return `<div class="gtop"><button class="hbtn" data-go="home">✕</button>
    <div class="prog"><i style="width:${cur.rounds.length / cur.len * 100}%"></i></div>
    <div class="gstat">${t.call} <b>${Math.min(cur.rounds.length + (G && G.guess != null ? 0 : 1), cur.len)}</b>/${cur.len} · <b>${rs.length ? pctTxt(ok / rs.length) : '–'}</b>${streak > 1 ? ` · ${t.streak} <b class="gold">${streak}</b>` : ''}</div></div>`;
}
function renderGameShell() {
  SCREEN = 'game';
  app.innerHTML = `${header()}<div class="ctxline"><span>${U().loading}</span></div>
  <div class="chartbox"><canvas id="chart"></canvas><div class="loading" id="chartLoad">${U().drawing}</div></div>`;
}
function renderGame() {
  SCREEN = 'game';
  const s = set(), R = G.R, rev = G.guess != null, t = U();
  const hTxt = `${t.candles(G.h)} (${t.dur(G.h * R.step)})`;
  const id = (s.blind && !rev) ? `<span><b>${t.mystery}</b> · ${tfL(R.tf)}</span>` : `<span><b>${R.sym}/USDT</b> · ${assetName(R)} · ${tfL(R.tf)} · ${dateTxt(R.t[R.ctx - 1] + R.step, R.tf)}</span>`;
  app.innerHTML = `${header()}
  <div class="ctxline">${id}<span>${t.horizonW} ${hTxt}</span></div>
  <div class="chartbox"><canvas id="chart"></canvas></div>
  <div class="tools" id="ov">${Object.keys(t.ov).map(k => `<button class="chip ${s.ov[k] ? 'on' : ''}" data-k="${k}">${t.ov[k]}</button>`).join('')}<span class="sep"></span>
    ${[60, 120, 200].map(z => `<button class="chip ${s.zoom === z ? 'on' : ''}" data-z="${z}">${z}</button>`).join('')}</div>
  <div class="tools" id="pn">${Object.keys(t.pane).map(k => `<button class="chip ${s.pane === k ? 'on' : ''}" data-k="${k}" ${['oi', 'book', 'ls'].includes(k) && !hasFx(k) ? 'disabled' : ''}>${t.pane[k]}</button>`).join('')}</div>
  <div id="res"></div>
  <div class="grid2">
    <section class="card"><h3>${t.readTitle} ${s.learn || rev ? '' : `<span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">${t.readHint}</span>`}</h3><div class="sigs" id="sigs"></div></section>
    <div>${bookCard()}${legendCard()}</div>
  </div>
  ${rev ? '' : `<div class="guess"><div class="in">
    <div class="q"><span>${t.question(t.candles(G.h), t.dur(G.h * R.step))}</span>
      <div class="seg conf" id="conf">${Object.keys(t.conf).map(k => `<button data-v="${k}" class="${s.conf === k ? 'on' : ''}">${t.conf[k]}</button>`).join('')}</div></div>
    <div class="gbtns"><button class="gb u" data-g="1">${t.higher}</button><button class="gb d" data-g="-1">${t.lower}</button></div>
  </div></div>`}`;
  renderSigs();
  $('#ov').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.z) { s.zoom = +b.dataset.z; } else s.ov[b.dataset.k] = !s.ov[b.dataset.k];
    save(); $('#ov').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.z ? s.zoom === +x.dataset.z : !!s.ov[x.dataset.k])); draw();
  };
  $('#pn').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; s.pane = b.dataset.k; save(); $('#pn').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.k === s.pane)); draw(); };
  if (!rev) {
    $('#conf').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.conf = b.dataset.v; save(); $('#conf').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === s.conf)); };
    app.querySelectorAll('.gb').forEach(b => b.onclick = () => onGuess(+b.dataset.g));
  }
  setupChart(); draw();
}
function hasFx(k) {
  const F = G && G.R.fx; if (!F) return false;
  if (k === 'book') return F.b1.some(x => x != null);
  if (k === 'oi') return F.oi.some(x => x != null) || F.fund.some(x => x != null);
  if (k === 'ls') return F.lsAll.some(x => x != null);
  return true;
}
const OPEN = new Set();
function renderSigs() {
  const s = set(), rev = G.guess != null, out = G.res ? G.res.out : 0, t = U();
  $('#sigs').innerHTML = G.S.list.map(x => {
    const show = s.learn || rev;
    const ar = !show ? '<span class="ar z">•</span>' : x.dir > 0 ? '<span class="ar p">▲</span>' : x.dir < 0 ? '<span class="ar n">▼</span>' : '<span class="ar z">–</span>';
    const ck = rev && x.dir !== 0 && out !== 0 ? (x.dir === out ? `<span class="ck up">${t.right}</span>` : `<span class="ck down">${t.wrong}</span>`) : '';
    let hs = '';
    if (show && x.dir && x.rel) {
      const ref = x.dir > 0 ? G.S.base : 1 - G.S.base, e = x.rel.p - ref;
      const e2 = x.rel.r - ref;
      hs = `<div class="hs ${e2 > 0.015 ? 'up' : e2 < -0.015 ? 'down' : 'muted'}">${t.histTag(pctTxt(x.rel.r, 1), pctTxt(ref, 1), x.rel.n.toLocaleString(loc()))}</div>`;
    }
    return `<div class="sig${OPEN.has(x.id) ? ' open' : ''}" data-id="${x.id}"><span>${ar}</span><div><div class="lb">${x.label}</div><div class="rd">${x.reading}</div>${hs}</div>${ck}<div class="ls">${x.lesson || ''}</div></div>`;
  }).join('') +
    `<p class="small muted" style="margin:6px 2px 0">${t.tap}</p>`;
  $('#sigs').onclick = e => { const el = e.target.closest('.sig'); if (!el) return; el.classList.toggle('open'); if (el.classList.contains('open')) OPEN.add(el.dataset.id); else OPEN.delete(el.dataset.id); };
}
function bookCard() {
  const F = G.R.fx, D = G.R.ctx - 1, s = set(), rev = G.guess != null, t = U();
  if (!F || F.b1[D] == null) return '';
  const lv = [['1', 'b1', 'a1'], ['2', 'b2', 'a2'], ['5', 'b5', 'a5']].map(([l, b, a]) => {
    const bv = F[b][D], av = F[a][D]; if (bv == null || av == null) return '';
    const m = Math.max(bv, av), tot = bv + av;
    const txt = v => (s.blind && !rev) ? pctTxt(v / tot) : money(v);
    return `<div class="lvl"><span class="muted">±${l}${sfx()}</span><div class="bar bid"><i style="width:${bv / m * 100}%"></i><span>${txt(bv)}</span></div><div class="bar ask"><i style="width:${av / m * 100}%"></i><span>${txt(av)}</span></div></div>`;
  }).join('');
  const extra = [];
  if (F.fund[D] != null) extra.push(`${t.funding} <b class="mono">${dec(F.fund[D] * 100, 4)}${sfx()}</b>`);
  if (F.lsAll[D] != null) extra.push(`${t.lsCrowd} <b class="mono">${dec(F.lsAll[D], 2)}</b>`);
  if (F.oi[D] != null && !(s.blind && !rev)) extra.push(`${t.oi} <b class="mono">${money(F.oi[D])}</b>`);
  return `<section class="card book"><h3>${t.bookTitle}</h3>
    <div class="lvl" style="margin-top:0"><span></span><span class="small up">${t.bids}</span><span class="small down" style="text-align:right">${t.asks}</span></div>${lv}
    <p class="small muted" style="margin:8px 0 0">${t.bookNote}</p>
    ${extra.length ? `<p class="small" style="margin:8px 0 0">${extra.join(' · ')}</p>` : ''}</section>`;
}
function legendCard() {
  const t = U();
  return `<section class="card small"><h3>${t.legendTitle}</h3>
  <div class="row" style="gap:12px"><span><b class="gold">━</b> EMA 20</span><span><b style="color:${COL.blue}">━</b> EMA 50</span><span><b style="color:${COL.violet}">━</b> EMA 200</span><span><b style="color:${COL.cyan}">┅</b> VWAP</span></div>
  <p class="muted" style="margin:8px 0 0">${t.legend}</p></section>`;
}

async function onGuess(g) {
  if (!G || G.guess != null || G.busy || G.live) return;
  const R = G.R, s = set(), t = U(); G.busy = true;
  app.querySelectorAll('.gb').forEach(b => b.disabled = true);
  const A = await apiPost('/api/answer', { tok: R.tok, g, h: G.h });
  if (!G || G.R !== R) return;
  G.busy = false;
  if (A.error) {
    if (A.error === 'net') { toast(t.ansNet); app.querySelectorAll('.gb').forEach(b => b.disabled = false); return; }
    toast(t.ansExpired); queue.length = 0; playRound(); return;
  }
  const sig = {}; G.S.list.forEach(x => { if (x.dir) sig[x.id] = x.dir; });
  for (const k of ['sym', 'name', 't', 'o', 'h', 'l', 'c', 'vol', 'tb', 'fx', 'btc']) R[k] = A[k];
  G.ranked = A.ranked;
  G.I = E.indicators(R, R.ctx, R.ctx - R.vis);
  G.S = E.signals(R, G.I, { hist: HIST, h: G.h, lang: lang(), pats: window.FIRASA_PATTERNS });
  G.base = R.c[R.ctx - 1];
  G.guess = g; G.conf = s.conf;
  G.res = E.judge(R, G.S, g, G.h, lang());
  G.Ifull = E.indicators(R, R.ctx + R.fut, R.ctx - R.vis);
  const rec = { s: R.sym, tf: R.tf, t: R.t[R.ctx - 1], h: G.h, g, cf: s.conf, out: G.res.out, ok: G.res.correct, mv: +G.res.move.toFixed(3), am: +G.res.atrMove.toFixed(2), cs: G.res.cons, sig };
  ST.cur.rounds.push(rec); save();
  renderGame();
  G.revealed = 0;
  animT = setInterval(() => {
    G.revealed++; draw();
    if (G.revealed === G.h) showResult();
    if (G.revealed >= R.fut) stopAnim();
  }, 110);
}
function showResult(noScroll) {
  const R = G.R, r = G.res, cur = ST.cur, last = cur.rounds.length >= cur.len, t = U();
  const head = r.out === 0 ? t.head.void : r.correct ? t.head.ok : t.head.ko;
  $('#res').innerHTML = `<section class="card result ${r.out === 0 ? '' : r.correct ? 'ok' : 'ko'}">
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><p class="big ${r.correct ? 'up' : r.out ? 'down' : ''}">${head}</p>
      <p class="muted small" style="margin:0">${t.youSaid(G.guess, t.confLow[G.conf] || '')} · ${R.sym}/USDT · ${tfL(R.tf)} · ${dateTxt(R.t[R.ctx - 1] + R.step, R.tf)}</p></div>
      <div style="text-align:right"><div class="mono ${r.move >= 0 ? 'up' : 'down'}" style="font-size:22px;font-weight:600">${fmtPct(r.move)}</div><div class="small muted">${t.over(t.candles(G.h), fmtPct(r.mx, 1), fmtPct(r.mn, 1))}</div></div>
    </div>
    <div class="verdict">${r.lines.map(l => `<p>${l}</p>`).join('')}</div>
    ${r.out !== 0 && r.keys.length ? `<div class="lesson"><b>${t.toSee}</b> ${r.keys.map(k => `${k.label} (${k.reading}${k.rel ? t.histRight(pctTxt(k.rel.r, 1), k.rel.n.toLocaleString(loc())) : ''})`).join(' ; ')}.<br><span class="muted">${r.keys[0].lesson}</span></div>` : r.out !== 0 ? `<div class="lesson">${t.noSig}</div>` : ''}
    ${r.traps.length ? `<div class="lesson"><b>${t.trap}</b> ${r.traps.map(k => t.trapItem(k.label, pctTxt(k.rel.r, 1), k.rel.n.toLocaleString(loc()))).join(' ; ')}.</div>` : ''}
    <p class="small muted" style="margin:10px 0 0">${t.count(r.right.length, r.wrong.length)}</p>
    ${ME.user && r.out !== 0 ? `<p class="small ${G.ranked ? 'gold' : 'muted'}" style="margin:6px 0 0">${G.ranked ? t.rankedYes : t.rankedNo}</p>` : ''}
    <button class="btn" id="nextB" style="margin-top:12px">${last ? t.seeReport : t.next}</button>
  </section>${dayPanel()}`;
  renderSigs();
  $('#nextB').onclick = () => { stopAnim(); window.scrollTo(0, 0); playRound(); };
  if (!noScroll) $('#res').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- graphique ----------
let cv, cx, L = null;
function setupChart() {
  cv = $('#chart'); cx = cv.getContext('2d');
  const pick = e => {
    if (!L) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const i = Math.floor((x - L.padL) / L.cw) + L.s;
    G.cross = (i >= L.s && i < L.n && y >= 0) ? i : null; draw();
  };
  cv.onpointermove = pick; cv.onpointerdown = pick;
  cv.onpointerleave = () => { G.cross = null; draw(); };
  if (!window._ro) { window._ro = new ResizeObserver(() => draw()); }
  window._ro.disconnect(); window._ro.observe(cv);
}
function draw() {
  if (!cv || !G || !document.body.contains(cv)) return;
  const s = set(), R = G.R, rev = G.guess != null, t = U();
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
  const I = rev ? G.Ifull : G.I, D = R.ctx - 1;
  const vis = Math.min(s.zoom, R.ctx - 30), st = R.ctx - vis, n = R.ctx + (rev ? G.revealed : 0), slots = vis + R.fut;
  const padL = 4, padR = 56, top = 10, mainH = Math.round(H * 0.67), subTop = mainH + 16, subH = H - subTop - 16;
  const plotW = W - padL - padR, cw = plotW / slots;
  L = { padL, cw, s: st, n };
  const X = i => padL + (i - st + 0.5) * cw;
  let lo = Infinity, hi = -Infinity;
  for (let i = st; i < n; i++) { lo = Math.min(lo, R.l[i]); hi = Math.max(hi, R.h[i]); }
  if (s.ov.bb) for (let i = Math.max(st, 19); i < n; i++) { if (I.bbU[i] < hi * 1.15) hi = Math.max(hi, I.bbU[i]); if (I.bbL[i] > lo * 0.85) lo = Math.min(lo, I.bbL[i]); }
  const pad = (hi - lo) * 0.06 || hi * 0.01; lo -= pad; hi += pad;
  const Y = p => top + (hi - p) / (hi - lo) * (mainH - top);
  const blindNow = s.blind && !rev && !G.live;
  const lab = p => blindNow ? (p / G.base * 100).toFixed(2) : priceTxt(p);
  cx.font = '11px "IBM Plex Mono", monospace'; cx.textBaseline = 'middle';
  const ticks = niceTicks(lo, hi, 5);
  cx.strokeStyle = COL.grid; cx.lineWidth = 1; cx.fillStyle = COL.muted;
  ticks.forEach(p => { const y = Math.round(Y(p)) + .5; cx.beginPath(); cx.moveTo(padL, y); cx.lineTo(W - padR, y); cx.stroke(); cx.fillText(lab(p), W - padR + 6, y); });
  const fx0 = X(R.ctx) - cw / 2;
  cx.fillStyle = 'rgba(255,255,255,0.028)'; cx.fillRect(fx0, 0, W - padR - fx0, mainH);
  cx.setLineDash([3, 4]); cx.strokeStyle = COL.dim; cx.beginPath(); cx.moveTo(fx0, 0); cx.lineTo(fx0, H - 14); cx.stroke(); cx.setLineDash([]);
  if (!rev) { cx.fillStyle = COL.dim; cx.font = '600 26px Fraunces, serif'; cx.textAlign = 'center'; cx.fillText('?', fx0 + (W - padR - fx0) / 2, mainH / 2); cx.textAlign = 'left'; cx.font = '11px "IBM Plex Mono", monospace'; }
  if (s.ov.vp) {
    const VP = G.S.VP, maxW = plotW * 0.24;
    VP.vol.forEach((v, k) => {
      const y1 = Y(VP.lo + (k + 1) * VP.size), y0 = Y(VP.lo + k * VP.size), inVA = VP.lo + (k + .5) * VP.size >= VP.val && VP.lo + (k + .5) * VP.size <= VP.vah;
      cx.fillStyle = inVA ? 'rgba(212,162,76,0.16)' : 'rgba(212,162,76,0.07)';
      cx.fillRect(padL, y1 + 0.5, v / VP.max * maxW, Math.max(1, y0 - y1 - 1));
    });
    cx.setLineDash([5, 4]); cx.strokeStyle = 'rgba(212,162,76,0.7)'; line(padL, Y(VP.poc), fx0, Y(VP.poc)); cx.setLineDash([]);
    cx.fillStyle = 'rgba(212,162,76,0.9)'; cx.fillText('POC', padL + 4, Y(VP.poc) - 7);
  }
  if (s.ov.sr) {
    const px = R.c[D], pv = G.S.pv;
    const res = pv.highs.map(i => [i, R.h[i]]).filter(x => x[1] > px).sort((a, b) => a[1] - b[1]).slice(0, 2);
    const sup = pv.lows.map(i => [i, R.l[i]]).filter(x => x[1] < px).sort((a, b) => b[1] - a[1]).slice(0, 2);
    cx.lineWidth = 1;
    res.forEach(([i, p]) => { if (i < st) return; cx.strokeStyle = 'rgba(240,86,94,0.55)'; line(X(i), Y(p), W - padR, Y(p)); cx.fillStyle = COL.down; cx.fillText('R', W - padR - 12, Y(p) - 7); });
    sup.forEach(([i, p]) => { if (i < st) return; cx.strokeStyle = 'rgba(43,200,164,0.55)'; line(X(i), Y(p), W - padR, Y(p)); cx.fillStyle = COL.up; cx.fillText('S', W - padR - 12, Y(p) + 8); });
  }
  if (s.ov.bb) {
    cx.fillStyle = 'rgba(180,190,210,0.06)'; cx.beginPath();
    for (let i = st; i < n; i++) i === st ? cx.moveTo(X(i), Y(I.bbU[i])) : cx.lineTo(X(i), Y(I.bbU[i]));
    for (let i = n - 1; i >= st; i--) cx.lineTo(X(i), Y(I.bbL[i]));
    cx.closePath(); cx.fill();
    path(I.bbU, st, n, X, Y, 'rgba(180,190,210,0.4)', 1); path(I.bbL, st, n, X, Y, 'rgba(180,190,210,0.4)', 1);
  }
  const bw = Math.max(1, cw * 0.68);
  for (let i = st; i < n; i++) {
    const o = R.o[i], c = R.c[i], up = c >= o, faded = i > D + G.h;
    cx.globalAlpha = faded ? 0.4 : 1;
    cx.strokeStyle = cx.fillStyle = up ? COL.up : COL.down;
    const x = X(i);
    cx.lineWidth = 1; line(x, Y(R.h[i]), x, Y(R.l[i]));
    const yt = Y(Math.max(o, c)), yb = Y(Math.min(o, c));
    cx.fillRect(x - bw / 2, yt, bw, Math.max(1, yb - yt));
  }
  cx.globalAlpha = 1;
  if (s.ov.vwap) { cx.setLineDash([4, 3]); path(I.vwap, Math.max(st, R.ctx - R.vis), n, X, Y, COL.cyan, 1.3); cx.setLineDash([]); }
  if (s.ov.ema200) path(I.ema200, st, n, X, Y, COL.violet, 1.5);
  if (s.ov.ema50) path(I.ema50, st, n, X, Y, COL.blue, 1.4);
  if (s.ov.ema20) path(I.ema20, st, n, X, Y, COL.gold, 1.4);
  const pNow = R.c[D];
  cx.setLineDash([2, 3]); cx.strokeStyle = 'rgba(236,230,218,0.5)'; line(X(D), Y(pNow), W - padR, Y(pNow)); cx.setLineDash([]);
  tag(W - padR + 2, Y(pNow), lab(pNow), '#ece6da', '#0b0f14');
  if (rev && G.revealed >= G.h) {
    const j = D + G.h, pj = R.c[j], ok = G.res.correct;
    cx.strokeStyle = ok ? COL.up : COL.down; cx.lineWidth = 2; cx.beginPath(); cx.arc(X(j), Y(pj), Math.max(5, cw * 0.6), 0, Math.PI * 2); cx.stroke(); cx.lineWidth = 1;
    tag(W - padR + 2, Y(pj), lab(pj), pj >= pNow ? COL.up : COL.down, '#04140f');
  }
  if (s.ov.pat && R.pat) drawPatMarks(X, Y, st, D);
  if (G.live) drawCalls(X, Y, D, cw, W, padR);
  drawPane(s.pane, I, st, n, X, subTop, subH, W, padR, padL);
  cx.fillStyle = COL.dim; cx.font = '10.5px "IBM Plex Mono", monospace'; cx.textAlign = 'center';
  if (!blindNow) { for (let k = 0; k < 4; k++) { const i = st + Math.round(k * (vis - 1) / 3); cx.fillText(shortDate(R.t[i], R.tf), Math.min(Math.max(X(i), 30), W - padR - 30), H - 7); } }
  else cx.fillText(t.now, fx0, H - 7);
  cx.textAlign = 'left';
  if (G.cross != null) {
    const i = G.cross, x = X(i), [O, Hh, Lw, C] = t.ohlc;
    cx.strokeStyle = 'rgba(236,230,218,0.35)'; line(x, 0, x, H - 14);
    const o = R.o[i], c = R.c[i], ch = (c / o - 1) * 100;
    const rows = [`${O} ${lab(o)}  ${Hh} ${lab(R.h[i])}`, `${Lw} ${lab(R.l[i])}  ${C} ${lab(c)}`, `${fmtPct(ch)} · ${t.buys} ${pctTxt(R.tb[i] / R.vol[i] || 0)}`];
    if (!blindNow) rows.unshift(dateTxt(R.t[i], R.tf));
    const pn = patNamesAt(i); if (pn.length) rows.push(`${t.crossPat} : ${pn.slice(0, 2).join(', ')}${pn.length > 2 ? '…' : ''}`);
    cx.font = '11px "IBM Plex Mono", monospace';
    const bwid = Math.max(...rows.map(r => cx.measureText(r).width)) + 14, bx = x + 12 + bwid > W - padR ? x - 12 - bwid : x + 12;
    cx.fillStyle = 'rgba(19,26,35,0.95)'; cx.strokeStyle = '#2c3847'; roundRect(bx, 8, bwid, rows.length * 16 + 10, 8); cx.fill(); cx.stroke();
    cx.fillStyle = COL.text; rows.forEach((r, k) => cx.fillText(r, bx + 7, 21 + k * 16));
  }
}
function drawPane(p, I, st, n, X, y0, h, W, padR, padL) {
  const R = G.R, F = R.fx, t = U();
  cx.strokeStyle = COL.grid; line(padL, y0 - 6, W - padR, y0 - 6);
  const label = (txt, col = COL.muted) => { cx.fillStyle = col; cx.font = '10.5px "IBM Plex Mono", monospace'; cx.fillText(txt, padL + 4, y0 + 6); };
  const bw = Math.max(1, L.cw * 0.68);
  const scale = (arr, a, b) => { let lo = Infinity, hi = -Infinity; for (let i = a; i < b; i++) { const v = arr[i]; if (v == null || !isFinite(v)) continue; lo = Math.min(lo, v); hi = Math.max(hi, v); } if (lo === hi) { lo -= 1; hi += 1; } return v => y0 + h - (v - lo) / (hi - lo) * h; };
  if (p === 'vol') {
    let mx = 0; for (let i = st; i < n; i++) mx = Math.max(mx, R.vol[i]);
    for (let i = st; i < n; i++) {
      const vh = R.vol[i] / mx * h, bh = R.tb[i] / mx * h, up = R.c[i] >= R.o[i];
      cx.globalAlpha = i > R.ctx - 1 + G.h ? 0.4 : 1;
      cx.fillStyle = up ? 'rgba(43,200,164,0.35)' : 'rgba(240,86,94,0.35)'; cx.fillRect(X(i) - bw / 2, y0 + h - vh, bw, vh);
      cx.fillStyle = 'rgba(43,200,164,0.75)'; cx.fillRect(X(i) - bw / 2, y0 + h - bh, bw, bh);
    }
    cx.globalAlpha = 1;
    const ys = v => y0 + h - v / mx * h; path(I.volSma, st, n, X, ys, COL.gold, 1.2);
    label(t.pVol);
  } else if (p === 'cvd') {
    let mx = 0; for (let i = st; i < n; i++) mx = Math.max(mx, Math.abs(I.delta[i]));
    const mid = y0 + h / 2;
    for (let i = st; i < n; i++) { const d = I.delta[i] / mx * h / 2; cx.fillStyle = d >= 0 ? 'rgba(43,200,164,0.5)' : 'rgba(240,86,94,0.5)'; cx.fillRect(X(i) - bw / 2, d >= 0 ? mid - d : mid, bw, Math.abs(d)); }
    const a = Math.max(st, R.ctx - R.vis);
    path(I.cvd, a, n, X, scale(I.cvd, a, n), COL.text, 1.4);
    label(t.pCvd);
  } else if (p === 'rsi') {
    const ys = v => y0 + h - v / 100 * h;
    cx.fillStyle = 'rgba(240,86,94,0.07)'; cx.fillRect(padL, ys(100), W - padR - padL, ys(70) - ys(100));
    cx.fillStyle = 'rgba(43,200,164,0.07)'; cx.fillRect(padL, ys(30), W - padR - padL, ys(0) - ys(30));
    cx.setLineDash([3, 3]); cx.strokeStyle = COL.dim; [30, 50, 70].forEach(v => line(padL, ys(v), W - padR, ys(v))); cx.setLineDash([]);
    path(I.rsi, st, n, X, ys, COL.violet, 1.5);
    label(`RSI 14 · ${dec(I.rsi[R.ctx - 1], 1)}`, COL.violet);
  } else if (p === 'macd') {
    let mx = 0; for (let i = st; i < n; i++) mx = Math.max(mx, Math.abs(I.macd[i]), Math.abs(I.macdSig[i]), Math.abs(I.macdHist[i]));
    const yy = v => y0 + h / 2 - v / mx * h / 2;
    for (let i = st; i < n; i++) { const v = I.macdHist[i]; cx.fillStyle = v >= 0 ? 'rgba(43,200,164,0.5)' : 'rgba(240,86,94,0.5)'; cx.fillRect(X(i) - bw / 2, Math.min(yy(v), yy(0)), bw, Math.abs(yy(v) - yy(0))); }
    path(I.macd, st, n, X, yy, COL.blue, 1.3); path(I.macdSig, st, n, X, yy, COL.gold, 1.2);
    label(t.pMacd);
  } else if (!F) {
    label(t.pNoFx);
  } else if (p === 'oi') {
    const e = Math.min(n, R.ctx);
    if (F.oi.some(x => x != null)) path(F.oi, st, e, X, scale(F.oi, st, e), COL.cyan, 1.5);
    let mx = 0; for (let i = st; i < e; i++) if (F.fund[i] != null) mx = Math.max(mx, Math.abs(F.fund[i]));
    if (mx) for (let i = st; i < e; i++) { const f = F.fund[i]; if (f == null) continue; const bh = Math.abs(f) / mx * h * 0.35; cx.fillStyle = f >= 0 ? 'rgba(212,162,76,0.6)' : 'rgba(90,169,255,0.6)'; cx.fillRect(X(i) - bw / 2, y0 + h - bh, bw, bh); }
    label(t.pOi);
  } else if (p === 'book') {
    const e = Math.min(n, R.ctx), imb = (b, a) => F[b].map((x, i) => x == null || F[a][i] == null ? null : (x - F[a][i]) / (x + F[a][i]));
    const i1 = imb('b1', 'a1'), i5 = imb('b5', 'a5'), yy = v => y0 + h / 2 - v * h / 2 / 0.6;
    cx.strokeStyle = COL.dim; line(padL, yy(0), W - padR, yy(0));
    path(i5, st, e, X, yy, 'rgba(212,162,76,0.6)', 1.2); path(i1, st, e, X, yy, COL.text, 1.4);
    label(t.pBook);
  } else if (p === 'ls') {
    const e = Math.min(n, R.ctx), all = F.lsAll, tp = F.lsTop;
    let lo = Infinity, hi = -Infinity; for (let i = st; i < e; i++) [all[i], tp[i]].forEach(v => { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
    const yy = v => y0 + h - (v - lo) / ((hi - lo) || 1) * h;
    path(all, st, e, X, yy, COL.gold, 1.4); path(tp, st, e, X, yy, COL.blue, 1.4);
    label(t.pLs);
  }
}
function path(arr, a, b, X, Y, col, w) {
  cx.strokeStyle = col; cx.lineWidth = w; cx.beginPath(); let on = false;
  for (let i = a; i < b; i++) { const v = arr[i]; if (v == null || !isFinite(v)) { on = false; continue; } const y = Y(v); if (!on) { cx.moveTo(X(i), y); on = true; } else cx.lineTo(X(i), y); }
  cx.stroke(); cx.lineWidth = 1;
}
function line(x0, y0, x1, y1) { cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke(); }
function roundRect(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
function tag(x, y, txt, bg, fg) { cx.font = '600 11px "IBM Plex Mono", monospace'; const w = cx.measureText(txt).width + 10; cx.fillStyle = bg; roundRect(x, y - 9, w, 18, 4); cx.fill(); cx.fillStyle = fg; cx.fillText(txt, x + 5, y + 0.5); cx.font = '11px "IBM Plex Mono", monospace'; }
function niceTicks(lo, hi, n) { const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), f = step0 / mag, step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag; const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v); return out; }

// ---------- bilan ----------
function finishSession() {
  const cur = ST.cur; cur.done = true; cur.end = Date.now();
  ST.sessions.push(cur); ST.cur = null; save();
  lastReport = cur.rounds;
  renderReport(cur.rounds, U().report, true);
}
function verdictP(A) {
  const t = U(); if (!A.n) return '';
  const p = dec(A.p * 100, A.p < 0.1 ? 1 : 0) + sfx();
  if (A.acc > 0.5 && A.p < 0.05) return t.vSig(p);
  if (A.acc > 0.5) return t.vAbove(p);
  return t.vBelow;
}
function tableBy(title, m, order) {
  const t = U(), keys = (order || Object.keys(m)).filter(k => m[k]);
  if (!keys.length) return '';
  return `<h3 style="margin-top:16px">${title}</h3><table><tr><th></th><th class="n">${t.thCalls}</th><th class="n">${t.thAcc}</th></tr>${keys.map(k => `<tr><td>${t.tf[k] || t.group[k] || k}</td><td class="n">${m[k].n}</td><td class="n ${m[k].k / m[k].n >= 0.5 ? 'up' : 'down'}">${pctTxt(m[k].k / m[k].n)}</td></tr>`).join('')}</table>`;
}
function renderReport(rounds, title, isEnd) {
  SCREEN = isEnd ? 'report' : 'stats';
  const t = U(), A = E.aggregate(rounds);
  const tips = E.advice(A, lang(), t.tf);
  const sigRows = Object.entries(A.sig).filter(([, s]) => s.n >= 3).sort((a, b) => b[1].right / b[1].n - a[1].right / a[1].n);
  app.innerHTML = `
  <section class="card"><h3>${title}</h3>
    <div class="bigscore"><b class="${A.acc >= 0.5 ? 'up' : 'down'}">${A.n ? pctTxt(A.acc) : '–'}</b><div><div class="mono" style="font-size:18px">${t.correctOf(A.k, A.n)}</div><div class="muted small">${t.kPnl} <span class="${A.pnl >= 0 ? 'up' : 'down'}">${fmtPct(A.pnl, 1)}</span></div></div></div>
    <p style="margin-top:12px">${verdictP(A)}</p>
    <canvas id="curve" style="width:100%;height:110px;display:block;margin-top:8px"></canvas>
    <p class="small muted" style="margin:4px 0 0">${t.curve}</p>
  </section>
  <section class="card"><h2>${t.yourGame}</h2><ul class="tips">${tips.map(x => `<li>${x}</li>`).join('')}</ul></section>
  <div class="grid2">
  <section class="card">
    ${tableBy(t.byTf, A.tf, ['15m', '1h', '4h', '1d'])}
    ${tableBy(t.byConf, A.conf, ['faible', 'moyenne', 'forte'])}
    ${tableBy(t.byTrend, A.trend, ['avec', 'contre'])}
  </section>
  <section class="card"><h3>${t.sigRel}</h3>
    ${sigRows.length ? `<table><tr><th>${t.thSig}</th><th class="n">${t.thTimes}</th><th class="n">${t.thRight}</th><th class="n">${t.thFollow}</th></tr>${sigRows.map(([id, s]) => `<tr><td>${LABELS[id] || id}</td><td class="n">${s.n}</td><td class="n ${s.right / s.n >= 0.5 ? 'up' : 'down'}">${pctTxt(s.right / s.n)}</td><td class="n">${s.agree ? pctTxt(s.agreeOk / s.agree) : '–'}</td></tr>`).join('')}</table>
    <p class="small muted" style="margin-top:8px">${t.sigNote}</p>` : `<p class="muted">${t.notEnough}</p>`}
  </section></div>
  ${isEnd ? `<button class="btn" data-go="play">${t.newSession}</button><button class="btn ghost" style="margin-top:8px" data-go="home">${t.home}</button>` : ''}`;
  drawCurve($('#curve'), A.curve);
}
function drawCurve(c, pts) {
  if (!c) return; const g = c.getContext('2d'), dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (pts.length < 2) return;
  let lo = Math.min(0, ...pts), hi = Math.max(0, ...pts); if (hi === lo) hi = lo + 1;
  const X = i => 4 + i / (pts.length - 1) * (W - 8), Y = v => 6 + (hi - v) / (hi - lo) * (H - 12);
  g.strokeStyle = '#2c3847'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke(); g.setLineDash([]);
  g.strokeStyle = pts[pts.length - 1] >= 0 ? COL.up : COL.down; g.lineWidth = 2; g.beginPath();
  pts.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
}
function histTable(open) {
  if (!HIST) return '';
  const t = U(), h = set().h, tfs = ['15m', '1h', '4h', '1d'];
  const rows = [];
  for (const id of Object.keys(LABELS)) for (const d of [1, -1]) {
    if (id === 'relvolN' || id === 'pattern' || id === 'talib') continue;
    const cells = tfs.map(tf => {
      const c = HIST[tf] && HIST[tf][h], x = c && c.sig[id] && c.sig[id][d];
      if (!x || x[0] < 80) return '<td class="n muted">·</td>';
      const p = x[1] / x[0], ref = d > 0 ? c.base[1] / c.base[0] : 1 - c.base[1] / c.base[0], e = p - ref;
      return `<td class="n ${e > 0.015 ? 'up' : e < -0.015 ? 'down' : 'muted'}">${Math.round(p * 100)}</td>`;
    });
    if (cells.every(c => c.includes('·'))) continue;
    rows.push(`<tr><td>${d > 0 ? '<span class="up">▲</span>' : '<span class="down">▼</span>'} ${LABELS[id]}</td>${cells.join('')}</tr>`);
  }
  const base = tfs.map(tf => HIST[tf] && HIST[tf][h] ? `<td class="n">${Math.round(HIST[tf][h].base[1] / HIST[tf][h].base[0] * 100)}</td>` : '<td></td>').join('');
  const nf = x => (x || 0).toLocaleString(loc());
  return `<section class="card"><details ${open ? 'open' : ''}><summary style="cursor:pointer"><h2 style="display:inline">${t.whichSignals}</h2></summary>
    <p class="small muted" style="margin-top:8px">${t.histText(nf(HIST._n), nf(HIST._book), t.candles(h))}</p>
    <table><tr><th>${t.thSigDir}</th>${tfs.map(x => `<th class="n">${t.tf[x]}</th>`).join('')}</tr>
    <tr><td class="muted">${t.baseRow}</td>${base}</tr>${rows.join('')}</table><p class="small muted" style="margin-top:10px">${t.estNote}</p></details></section>`;
}
function renderStats() {
  SCREEN = 'stats';
  const t = U(), rounds = allRounds();
  const empty = `<section class="card empty"><h2>${t.noCalls}</h2><p>${t.noCallsText}</p><button class="btn" data-go="play" style="max-width:320px;margin:10px auto 0">${t.play}</button></section>`;
  if (!rounds.length && !ST.live.length) { app.innerHTML = empty + histTable(true); return; }
  if (rounds.length) renderReport(rounds, t.allCalls, false); else { SCREEN = 'stats'; app.innerHTML = empty; }
  if (ST.live.length) { const L2 = E.aggregate(ST.live); app.insertAdjacentHTML('beforeend', `<section class="card"><h3>${t.liveStats}</h3><div class="kpis"><div class="kpi"><b>${L2.n ? pctTxt(L2.acc) : '–'}</b><span>${t.liveAcc}</span></div><div class="kpi"><b>${L2.n}</b><span>${t.kN}</span></div><div class="kpi"><b class="${L2.pnl >= 0 ? 'up' : 'down'}">${fmtPct(L2.pnl, 2)}</b><span>${t.kPnl}</span></div></div>${tableBy(t.byTf, L2.tf, ['1m', '5m', '15m', '1h'])}</section>`); }
  app.insertAdjacentHTML('beforeend', histTable(false));
  const list = ST.sessions.slice().reverse();
  app.insertAdjacentHTML('beforeend', `<section class="card"><h3>${t.sessions}</h3><table><tr><th>${t.thDate}</th><th class="n">${t.thCalls}</th><th class="n">${t.thAcc}</th></tr>${list.map(s => { const A = E.aggregate(s.rounds); return `<tr><td>${new Date(s.start).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' })}${s.done ? '' : ` <span class="muted">${t.abandoned}</span>`}</td><td class="n">${A.n}</td><td class="n ${A.acc >= 0.5 ? 'up' : 'down'}">${A.n ? pctTxt(A.acc) : '–'}</td></tr>`; }).join('')}</table>
  <button class="btn ghost" style="margin-top:12px" id="wipe">${t.wipe}</button></section>`);
  $('#wipe').onclick = () => { if (confirm(t.wipeConfirm)) { ST.sessions = []; ST.cur = null; ST.live = []; ST.liveOpen = []; save(); renderStats(); } };
}

// ---------- comptes ----------
let ME = { user: null, clientId: null, stats: [] };
const esc = x => String(x).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';');
const api = async (path, opt) => { try { const r = await fetch(path, opt); const d = await r.json().catch(() => ({})); return r.ok ? d : { error: d.error || String(r.status) }; } catch (e) { return { error: 'net' }; } };
const apiPost = (path, body) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
function accLabel() { const b = $('#accBtn'); if (b) b.textContent = ME.user ? ME.user.name.slice(0, 10) : U().signIn; }
async function loadMe() { const d = await api('/api/me'); if (!d.error) ME = d; accLabel(); return ME; }
function gsi(cb) { if (window.google && google.accounts && google.accounts.id) return cb(); const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = cb; document.head.appendChild(sc); }
function playersCard(tf) {
  const t = U();
  return `<section class="card"><h3>${t.plTitle}</h3><p class="small muted">${t.plIntro}</p>
    <div class="seg" id="plTf">${['15m', '1h', '4h', '1d'].map(x => `<button data-v="${x}" class="${tf === x ? 'on' : ''}">${tfL(x)}</button>`).join('')}</div><div id="plRows" style="margin-top:8px"><p class="small muted">…</p></div></section>`;
}
function loadPlayers(tf) {
  api('/api/players?tf=' + tf).then(d => { const el = $('#plRows'); if (!el) return; const t = U();
    if (d.error) { el.innerHTML = `<p class="small muted">${t.loadFail}</p>`; return; }
    el.innerHTML = d.rows.length ? `<table><tr><th>#</th><th>${t.plName}</th><th class="n">${t.thCalls}</th><th class="n">${t.thAcc}</th></tr>${d.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td class="n">${r.n}</td><td class="n">${pctTxt(r.ok / r.n, 1)}</td></tr>`).join('')}</table>` : `<p class="small muted">${t.plEmpty(tfL(tf))}</p>`; });
}
async function renderAccount() {
  stopLive(); SCREEN = 'account'; const t = U(), s = set(), tf = s.plTf || '1d';
  app.innerHTML = `<section class="card"><p class="small muted">…</p></section>`;
  await loadMe(); if (SCREEN !== 'account') return;
  let top;
  if (ME.user) {
    const st = ME.stats.slice().sort((a, b) => ['15m', '1h', '4h', '1d'].indexOf(a.tf) - ['15m', '1h', '4h', '1d'].indexOf(b.tf));
    top = `<section class="card"><h3>${t.accTitle}</h3>
      <h2 style="margin-bottom:2px">${esc(ME.user.name)} ${ME.user.role === 'admin' ? `<span class="tagr gold">admin</span>` : ''}</h2>
      <div class="setting"><label>${t.accName}<span class="hint">${t.accNameHint}</span></label><div class="row" style="flex-wrap:nowrap"><input id="nm" value="${esc(ME.user.name)}" maxlength="20" style="width:130px"><button class="chip on" id="nmSave">OK</button></div></div>
      <h3 style="margin-top:14px">${t.accRanked}</h3>
      ${st.length ? `<table><tr><th></th><th class="n">${t.thCalls}</th><th class="n">${t.thAcc}</th></tr>${st.map(r => `<tr><td>${tfL(r.tf)}</td><td class="n">${r.n}</td><td class="n">${pctTxt(r.ok / r.n, 1)}</td></tr>`).join('')}</table>` : `<p class="small muted">${t.accNoRanked}</p>`}
      <p class="small muted" style="margin-top:8px">${t.accRule}</p>
      ${ME.user.role === 'admin' ? `<button class="btn" style="margin-top:10px" data-go="admin">${t.admTitle}</button>` : ''}
      <button class="btn ghost" style="margin-top:8px" id="lo">${t.logout}</button>
      <button class="btn ghost" style="margin-top:8px" id="del">${t.delAcc}</button>
      <p class="small muted" style="margin-top:10px">${t.privacy}</p></section>`;
  } else {
    top = `<section class="card"><h3>${t.accTitle}</h3>
      ${ME.clientId ? `<p>${t.accWhy}</p><div id="gbtn" style="min-height:44px"></div><p class="small down" id="gerr"></p>` : `<p>${t.accOff}</p>`}
      <p class="small muted" style="margin-top:10px">${t.privacy}</p></section>`;
  }
  app.innerHTML = top + playersCard(tf) + `<button class="btn ghost" data-go="home">${t.back}</button>`;
  loadPlayers(tf);
  $('#plTf').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.plTf = b.dataset.v; save(); renderAccount(); };
  if (ME.user) {
    $('#nmSave').onclick = async () => { const d = await apiPost('/api/me/name', { name: $('#nm').value }); if (d.error) toast(d.error); else renderAccount(); };
    $('#lo').onclick = async () => { await apiPost('/api/logout'); renderAccount(); };
    $('#del').onclick = async () => { if (!confirm(t.delConfirm)) return; await api('/api/me', { method: 'DELETE' }); renderAccount(); };
  } else if (ME.clientId) gsi(() => {
    if (!$('#gbtn')) return;
    google.accounts.id.initialize({ client_id: ME.clientId, callback: async resp => { const d = await apiPost('/api/auth/google', { credential: resp.credential }); if (d.error) { const e = $('#gerr'); if (e) e.textContent = d.error; } else renderAccount(); } });
    google.accounts.id.renderButton($('#gbtn'), { theme: 'filled_black', size: 'large', shape: 'pill', locale: lang() });
  });
}
async function renderAdmin() {
  stopLive(); SCREEN = 'admin'; const t = U();
  const d = await api('/api/admin/overview'); if (SCREEN !== 'admin') return;
  if (d.error) { app.innerHTML = `<section class="card"><p>${t.admDenied}</p></section><button class="btn ghost" data-go="account">${t.back}</button>`; return; }
  const day = x => x ? new Date(x * 1000).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }) : '–';
  app.innerHTML = `<section class="card"><h3>${t.admTitle}</h3>
    <div class="kpis"><div class="kpi"><b>${d.counts.users}</b><span>${t.admUsers}</span></div><div class="kpi"><b>${d.counts.answers}</b><span>${t.admAnswers}</span></div><div class="kpi"><b>${d.counts.scored}</b><span>${t.admScored}</span></div></div></section>
  <section class="card"><h3>${t.admBots}</h3>
    <div class="row" style="flex-wrap:nowrap"><input id="bn" placeholder="${t.admBotName}" maxlength="20" style="flex:1;min-width:0"><button class="chip on" id="bAdd">${t.admBotAdd}</button></div>
    <div id="bKey"></div>
    <table style="margin-top:10px"><tr><th>${t.plName}</th><th>${t.admKind}</th><th></th></tr>${d.bots.map(b => `<tr><td>${b.house ? (t.labTools[b.name] || esc(b.name)) : esc(b.name)}</td><td class="muted">${b.house ? t.admHouse : t.admExt}</td><td class="n">${b.house ? '' : `<button class="chip" data-del="${b.id}">✕</button>`}</td></tr>`).join('')}</table>
    <p class="small muted" style="margin-top:8px">${t.admBotNote}</p></section>
  <section class="card"><h3>${t.admUsers}</h3><table><tr><th>${t.plName}</th><th>${t.thDate}</th><th class="n">${t.thCalls}</th><th class="n">${t.thAcc}</th></tr>${d.users.map(u => `<tr><td>${esc(u.name)}${u.role === 'admin' ? ' <span class="tagr gold">admin</span>' : ''}</td><td class="muted">${day(u.created)}</td><td class="n">${u.n}</td><td class="n">${u.n ? pctTxt(u.ok / u.n, 1) : '–'}</td></tr>`).join('')}</table></section>
  <button class="btn ghost" data-go="account">${t.back}</button>`;
  $('#bAdd').onclick = async () => { const r = await apiPost('/api/admin/bot', { name: $('#bn').value }); if (r.error) { toast(r.error); return; } await renderAdmin(); const k = $('#bKey'); if (k) k.innerHTML = `<div class="lesson"><b>${esc(r.name)}</b><br><span class="mono small" style="word-break:break-all">${r.key}</span><br><span class="muted small">${t.admKeyNote}</span></div>`; };
  app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm(t.admDelConfirm)) return; await api('/api/admin/bot?id=' + b.dataset.del, { method: 'DELETE' }); renderAdmin(); });
}

// ---------- laboratoire : classement des outils ----------
const LAB = /*LAB*/null;
function renderLab() {
  stopLive(); SCREEN = 'lab';
  const s = set(), t = U(), M = LAB && LAB._;
  if (!LAB) { app.innerHTML = ''; return; }
  const tf = s.labTf === '1h' ? '1h' : '1d', rows = LAB[tf], fee = M.fee;
  const best = Math.max(...rows.map(r => r.acc));
  const cards = rows.map((r, i) => {
    const v = r.lo > 0.5 ? ['up', t.labV.above] : r.hi < 0.5 ? ['down', t.labV.below] : ['muted', t.labV.none];
    const nv = r.glo - fee > 0 ? ['up', t.labN.pos] : r.ghi - fee < 0 ? ['down', t.labN.neg] : ['muted', t.labN.none];
    return `<section class="card" style="margin:8px 0;padding:13px 14px">
      <div class="row" style="justify-content:space-between;align-items:baseline;flex-wrap:nowrap"><b>${i + 1}. ${t.labTools[r.id] || r.id}</b><b class="mono" style="font-size:18px;white-space:nowrap;margin-left:10px">${pctTxt(r.acc, 1)}</b></div>
      <p class="small ${v[0]}" style="margin:4px 0 0">${v[1]} · ${t.labCI(pctTxt(r.lo, 1), pctTxt(r.hi, 1))}</p>
      <p class="small muted" style="margin:4px 0 0">${t.labLine(r.n.toLocaleString(loc()), pctTxt(r.cov), r.accTrain == null ? '–' : pctTxt(r.accTrain, 1))}</p>
      <p class="small muted" style="margin:4px 0 0">${t.labGain(fmtPct(r.gross * 100, 3), fmtPct(r.net * 100, 3))} <span class="${nv[0]}">${nv[1]}</span></p></section>`;
  }).join('');
  app.innerHTML = `<section class="card"><h3>${t.labTitle}</h3>
    <p>${t.labIntro(M.tools, M.syms, M.h)}</p>
    <p class="small muted">${t.labMethod(M.tools * 2, dec(fee * 100, 1) + sfx())}</p>
    <p class="small">${t.labBest(tfL(tf), pctTxt(best, 1))}</p>
    <div class="seg" id="lt">${['1d', '1h'].map(x => `<button data-v="${x}" class="${tf === x ? 'on' : ''}">${tfL(x)}</button>`).join('')}</div></section>
  <section class="card"><h3>${t.fwTitle}</h3><p class="small">${t.fwIntro(M.h)}</p><div id="fw"><p class="small muted">…</p></div><p class="small muted" style="margin:10px 0 0">${t.fwApi}</p></section>
  <h3 style="margin:18px 2px 4px">${t.bkTitle}</h3>
  ${cards}
  <button class="btn ghost" data-go="home">${t.back}</button>`;
  $('#lt').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.labTf = b.dataset.v; save(); renderLab(); };
  fetch('/api/lab/live').then(r => r.json()).then(d => {
    const el = $('#fw'); if (!el || SCREEN !== 'lab') return;
    const esc = x => String(x).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';');
    const rs = d.rows.filter(r => r.tf === tf).sort((a, b) => b.k / b.n - a.k / a.n);
    const pend = `<p class="small muted" style="margin:8px 0 0">${t.fwPending(d.pending.toLocaleString(loc()))}</p>`;
    if (!rs.length) { el.innerHTML = `<p class="small">${t.fwEmpty(tfL(tf))}</p>` + pend; return; }
    el.innerHTML = rs.map((r, i) => { const a = r.k / r.n;
      return `<div class="call" style="display:block"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${i + 1}. ${r.house ? (t.labTools[r.code] || esc(r.code)) : esc(r.name)}</b><b class="mono" style="white-space:nowrap;margin-left:10px">${pctTxt(a, 1)}</b></div>
      <div class="small muted">${t.fwLine(r.n.toLocaleString(loc()), r.t.toLocaleString(loc()), fmtPct(r.gross * 100, 3))} ${r.t >= 30 ? t.fwCI(pctTxt(Math.max(0, a - 1.96 * r.se), 1), pctTxt(Math.min(1, a + 1.96 * r.se), 1)) : t.fwNoCI}</div></div>`; }).join('') + pend + `<p class="small muted" style="margin:6px 0 0">${t.fwNote}</p>`;
  }).catch(() => { const el = $('#fw'); if (el) el.innerHTML = `<p class="small muted">${t.loadFail}</p>`; });
}

// ---------- figures de bougies (TA-Lib) ----------
const PAT = window.FIRASA_PATTERNS || { list: [], stats: null };
const PBY = Object.fromEntries(PAT.list.map(x => [x.f, x]));
const PRARE = new Set();
if (PAT.stats) for (const m of PAT.list) {
  if (m.k !== 'dir') continue;
  const c = PAT.stats.counts[m.f] || {}; let tot = 0; for (const sg in c) for (const tf in c[sg]) tot += c[sg][tf];
  if (tot / PAT.stats.candles < 0.01) PRARE.add(m.f);
}
function patNamesAt(i) {
  const R = G.R; if (!R.pat || !PAT.stats) return [];
  return R.pat.filter(x => x[0] === i).map(([, fi, sg]) => { const m = PBY[PAT.stats.funcs[fi]]; return (FR() ? m.fr : m.en) + (m.k === 'dir' ? (sg > 0 ? ' ▲' : ' ▼') : ''); });
}
function drawPatMarks(X, Y, st, D) {
  const R = G.R; cx.font = '600 10px "IBM Plex Mono", monospace'; cx.textAlign = 'center';
  for (const [j, fi, sg] of R.pat) {
    if (j < st || j > D || !PRARE.has(PAT.stats.funcs[fi])) continue;
    const up = sg > 0; cx.fillStyle = up ? COL.up : COL.down;
    cx.fillText(up ? '▲' : '▼', X(j), up ? Y(R.l[j]) + 10 : Y(R.h[j]) - 8);
  }
  cx.textAlign = 'left';
}
function exampleSvg(ex, L) {
  if (!ex) return '';
  const n = ex.c.length, W = 300, H = 104, pad = 6, cw = (W - 2 * pad) / n;
  let lo = Math.min(...ex.l), hi = Math.max(...ex.h); if (hi === lo) hi = lo + 1;
  const Y = v => pad + (hi - v) / (hi - lo) * (H - 2 * pad), X = i => pad + (i + 0.5) * cw;
  const b0 = ex.i - L + 1;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img"><rect x="${(pad + b0 * cw).toFixed(1)}" y="0" width="${(L * cw).toFixed(1)}" height="${H}" fill="rgba(212,162,76,0.16)" rx="4"/>`;
  for (let i = 0; i < n; i++) {
    const o = ex.o[i], c = ex.c[i], col = c >= o ? COL.up : COL.down, op = i > ex.i ? 0.35 : 1;
    const yt = Y(Math.max(o, c)), yb = Y(Math.min(o, c));
    svg += `<g opacity="${op}"><line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="${Y(ex.h[i]).toFixed(1)}" y2="${Y(ex.l[i]).toFixed(1)}" stroke="${col}" stroke-width="1.2"/><rect x="${(X(i) - cw * 0.32).toFixed(1)}" y="${yt.toFixed(1)}" width="${(cw * 0.64).toFixed(1)}" height="${Math.max(1, yb - yt).toFixed(1)}" fill="${col}"/></g>`;
  }
  return svg + '</svg>';
}
function renderPatterns() {
  stopLive(); SCREEN = 'patterns';
  const s = set(), t = U(), S = PAT.stats, h = s.h, tfs = ['15m', '1h', '4h', '1d'];
  if (!S) { app.innerHTML = `<section class="card"><p>${t.patNoEx}</p></section>`; return; }
  const filt = s.patFilter || 'all';
  const total = m => { const c = S.counts[m.f] || {}; let n = 0; for (const sg in c) for (const tf in c[sg]) n += c[sg][tf]; return n; };
  const list = PAT.list.slice().sort((a, b) => a.L - b.L || total(b) - total(a)).filter(m =>
    filt === 'all' || (filt === 'one' && m.L === 1) || (filt === 'two' && m.L === 2) || (filt === 'more' && m.L >= 3) || (filt === 'big' && total(m) >= 1000));
  const baseRow = `<tr><td class="muted">${t.patRows.base}</td>${tfs.map(tf => `<td class="n muted">${pctTxt(S.base[tf][h][1] / S.base[tf][h][0], 1)}</td>`).join('')}</tr>`;
  const cards = list.map(m => {
    const signs = Object.keys(S.stats[m.f] || {}).filter(sg => Object.values((S.counts[m.f] || {})[sg] || {}).some(v => v > 0)).sort((a, b) => b - a);
    const rows = signs.map(sg => `<tr><td>${t.patRows[m.k + sg] || ''}</td>${tfs.map(tf => {
      const cell = S.stats[m.f][sg][tf] && S.stats[m.f][sg][tf][h]; if (!cell || !cell[0]) return '<td class="n muted">–</td>';
      const r = cell[1] / cell[0], b = S.base[tf][h][1] / S.base[tf][h][0], e = r - b;
      const cls = cell[0] < 100 ? 'muted' : e >= 0.015 ? 'up' : e <= -0.015 ? 'down' : '';
      return `<td class="n ${cls}">${pctTxt(r, 1)}<br><span class="muted small">${cell[0].toLocaleString(loc())}</span></td>`;
    }).join('')}</tr>`).join('');
    const exSg = signs.slice().sort((a, b) => Object.values(S.counts[m.f][b]).reduce((x, y) => x + y, 0) - Object.values(S.counts[m.f][a]).reduce((x, y) => x + y, 0))[0];
    const ex = exSg && S.examples[m.f + exSg];
    return `<section class="card pc">
      ${ex ? exampleSvg(ex, m.L) + `<p class="small muted" style="margin:2px 0 8px">${t.patExample(ex.s, tfL(ex.tf), dateTxt(ex.t, ex.tf))}</p>` : `<p class="small muted">${t.patNoEx}</p>`}
      <h2 style="margin:0 0 2px">${FR() ? m.fr : m.en}</h2>
      <p class="small muted" style="margin:0 0 8px">${m.f} · ${m.en} · ${t.patL(m.L)}</p>
      <p class="small" style="margin:0 0 6px">${FR() ? m.dfr : m.den}</p>
      <p class="small muted" style="margin:0 0 8px">${t.patKind[m.k]}</p>
      ${rows ? `<table><tr><th></th>${tfs.map(x => `<th class="n">${t.tf[x]}</th>`).join('')}</tr>${rows}${baseRow}</table>` : ''}
      <p class="small muted" style="margin:8px 0 0">${t.patTotal(total(m).toLocaleString(loc()))}</p></section>`;
  }).join('');
  app.innerHTML = `<section class="card"><h3>${t.patTitle}</h3>
    <p>${t.patIntro(PAT.list.length, S.candles.toLocaleString(loc()), t.candles(h))}</p>
    <div class="setting"><label>${t.horizon}</label><div class="seg" id="ph">${[1, 3, 5, 10].map(x => `<button data-v="${x}" class="${h === x ? 'on' : ''}">${x}</button>`).join('')}</div></div>
    <div class="row" id="pf" style="margin-top:6px">${Object.entries(t.patFilters).map(([k, l]) => `<button class="chip ${filt === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
    <p class="small muted" style="margin:10px 0 0">${t.patNote}</p></section>
  <div class="pgrid">${cards}</div>
  <button class="btn ghost" data-go="home">${t.back}</button>`;
  $('#ph').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.h = +b.dataset.v; save(); renderPatterns(); };
  $('#pf').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.patFilter = b.dataset.v; save(); renderPatterns(); };
}

// ---------- « ce jour-là » : contexte après la révélation ----------
const dayStr = sec => new Date(sec * 1000).toISOString().slice(0, 10);
function dayPanel() {
  const R = G.R, r = G.res, t = U(), D = R.ctx - 1, h = G.h;
  if (!r || r.out === 0) return '';
  const items = [];
  if (R.btc && R.btc.c[30 + h] != null) {
    const bm = (R.btc.c[30 + h] / R.btc.c[30] - 1) * 100, diff = r.move - bm;
    items.push(t.dayBtc(fmtPct(bm), diff >= 0, (diff >= 0 ? '+' : '') + dec(diff, 1)));
  }
  let hi = -Infinity, lo = Infinity; for (let j = 0; j <= D; j++) { hi = Math.max(hi, R.h[j]); lo = Math.min(lo, R.l[j]); }
  items.push(t.dayRange(R.ctx, fmtPct((R.c[D] / hi - 1) * 100, 1), fmtPct((R.c[D] / lo - 1) * 100, 1)));
  items.push(t.dayTrend(fmtPct((R.c[D] / R.c[D - 30] - 1) * 100, 1)));
  let bigger = 0, cnt = 0; const am = Math.abs(r.move);
  for (let j = 0; j + h <= D; j++) { cnt++; if (Math.abs(R.c[j + h] / R.c[j] - 1) * 100 < am) bigger++; }
  if (cnt) items.push(t.dayRank(pctTxt(bigger / cnt), h, R.ctx));
  let fv = 0; for (let j = D + 1; j <= D + h; j++) fv += R.vol[j];
  const avgV = G.I.volSma[D]; if (avgV) items.push(t.dayVol(dec(fv / h / avgV, 1)));
  // événements
  const evs = (window.FIRASA_EVENTS || []).filter(e => e[1] === '*' || e[1].split(',').includes(R.sym));
  const last = dayStr(R.t[D]), end = dayStr(R.t[D + h]), ms = d => Date.parse(d + 'T00:00:00Z');
  const near = evs.filter(e => ms(e[0]) >= ms(last) - 14 * 864e5 && ms(e[0]) <= ms(end) + 2 * 864e5);
  const txt = e => FR() ? e[2] : e[3];
  const fmtD = d => new Date(ms(d)).toLocaleDateString(loc(), { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
  let evHtml;
  if (near.length) {
    evHtml = near.map(e => {
      const d = e[0], rel = d < last ? t.rel.before(Math.round((ms(last) - ms(d)) / 864e5)) : d === last ? t.rel.last : d <= end ? t.rel.during : t.rel.after;
      const cls = d > last && d <= end ? 'gold' : 'muted';
      return `<div class="ev"><span class="mono small">${fmtD(d)}</span><span class="tagr ${cls}">${rel}</span><div>${txt(e)}</div></div>`;
    }).join('');
  } else {
    const prev = evs.filter(e => ms(e[0]) < ms(last) && ms(e[0]) >= ms(last) - 120 * 864e5).pop();
    evHtml = `<p class="small" style="margin:0">${t.evNone}</p>` + (prev ? `<p class="small muted" style="margin:6px 0 0">${t.evLast(Math.round((ms(last) - ms(prev[0])) / 864e5), txt(prev))}</p>` : '');
  }
  return `<section class="card day"><h3>${t.dayTitle(dateTxt(R.t[D] + R.step, R.tf))}</h3>
    <ul class="tips small" style="margin:0 0 6px;padding-left:18px">${items.map(x => `<li>${x}</li>`).join('')}</ul>
    <h3 style="margin-top:14px">${t.evTitle}</h3>${evHtml}
    <p class="small muted" style="margin:8px 0 0">${t.evNote}</p></section>`;
}

// ---------- mode live (flux WebSocket Binance) ----------
const LIVE_SYMS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'LTC', 'DOT', 'TRX', 'ATOM', 'NEAR', 'ETC', 'PAXG'];
const LIVE_TF = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 };
const LIVE_NAMES = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB', XRP: 'XRP', DOGE: 'Dogecoin', ADA: 'Cardano', AVAX: 'Avalanche', LINK: 'Chainlink', LTC: 'Litecoin', DOT: 'Polkadot', TRX: 'Tron', ATOM: 'Cosmos', NEAR: 'Near', ETC: 'Ethereum Classic', PAXG: 'PAX Gold' };
const API = 'https://data-api.binance.vision/api/v3';
let LV = null;
function stopLive() {
  if (!LV) return;
  LV.dead = true; try { LV.ws && LV.ws.close(); } catch (e) {}
  clearInterval(LV.tick); clearTimeout(LV.retry); LV = null;
}
function liveHeader() {
  const t = U(), A = E.aggregate(ST.live);
  return `<div class="gtop"><button class="hbtn" data-go="home">✕</button>
    <div class="gstat"><b class="down blink">●</b> <b>${t.live}</b></div><div style="flex:1"></div>
    <div class="gstat">${A.n ? `${t.liveAcc} <b>${pctTxt(A.acc)}</b> · ${t.liveCalls(A.n)}` : ''}</div></div>`;
}
function renderLive() {
  stopLive(); SCREEN = 'live'; G = null;
  const s = set(), t = U();
  app.innerHTML = `${liveHeader()}
  <div class="tools" id="lvSym">${LIVE_SYMS.map(x => `<button class="chip ${s.liveSym === x ? 'on' : ''}" data-v="${x}">${x}</button>`).join('')}</div>
  <div class="row" style="justify-content:space-between;margin:8px 0">
    <div class="seg" id="lvTf">${Object.keys(LIVE_TF).map(x => `<button data-v="${x}" class="${s.liveTf === x ? 'on' : ''}">${x}</button>`).join('')}</div>
    <div class="row" style="gap:6px"><span class="small muted">${t.horizonW}</span><div class="seg" id="lvH">${[1, 3, 5].map(x => `<button data-v="${x}" class="${s.liveH === x ? 'on' : ''}">${x}</button>`).join('')}</div></div>
  </div>
  <div class="ctxline"><span><b>${s.liveSym}/USDT</b> · ${(FR() ? UI.fr : UI.en).names[s.liveSym] || LIVE_NAMES[s.liveSym]} · ${s.liveTf}</span><span class="mono" id="lvPrice"></span></div>
  <div class="chartbox"><canvas id="chart"></canvas><div class="loading" id="chartLoad">${t.connecting}</div></div>
  <div id="lvTools"></div>
  <section class="card" id="lvCalls"></section>
  <div class="grid2">
    <section class="card"><h3>${t.readTitle}</h3><div class="sigs" id="sigs"></div><p class="small muted" style="margin:8px 2px 0">${t.liveNote}</p></section>
    <div><section class="card book" id="lvBook"><h3>${t.liveBook}</h3><p class="small muted">${t.connecting}</p></section></div>
  </div>
  <div class="guess"><div class="in" id="lvGuess"></div></div>`;
  const pick = (id, key, num) => $(id).onclick = e => { const b = e.target.closest('button'); if (!b) return; s[key] = num ? +b.dataset.v : b.dataset.v; save(); renderLive(); };
  pick('#lvSym', 'liveSym'); pick('#lvTf', 'liveTf'); pick('#lvH', 'liveH', true);
  renderGuessLive(); renderCalls();
  startLive();
}
function liveR(rows, sym, tf) {
  const R = { sym, name: LIVE_NAMES[sym], tf, step: LIVE_TF[tf], vis: 120, fut: 10, fx: null, t: [], o: [], h: [], l: [], c: [], vol: [], tb: [] };
  rows.forEach(k => { R.t.push(Math.floor(k[0] / 1000)); R.o.push(+k[1]); R.h.push(+k[2]); R.l.push(+k[3]); R.c.push(+k[4]); R.vol.push(+k[5]); R.tb.push(+k[9]); });
  R.ctx = R.c.length; return R;
}
function liveRecompute() {
  const R = G.R; R.ctx = R.c.length;
  G.I = E.indicators(R, R.ctx, R.ctx - R.vis);
  G.S = E.signals(R, G.I, { hist: HIST, h: set().liveH, lang: lang(), live: true });
  G.base = R.c[R.ctx - 1];
}
async function startLive() {
  const s = set(), sym = s.liveSym, tf = s.liveTf, my = LV = { dead: false, sym, tf, book: null, dirty: false };
  let rows;
  try { rows = await (await fetch(`${API}/klines?symbol=${sym}USDT&interval=${tf}&limit=330`)).json(); } catch (e) { rows = null; }
  if (my.dead) return;
  if (!Array.isArray(rows) || rows.length < 260) { const l = $('#chartLoad'); if (l) l.textContent = U().liveFail; my.retry = setTimeout(() => { if (!my.dead) renderLive(); }, 5000); return; }
  G = { live: true, R: liveR(rows, sym, tf), h: s.liveH, revealed: 0, guess: null, cross: null };
  liveRecompute();
  const l = $('#chartLoad'); if (l) l.remove();
  renderTools(); setupChart(); draw(); renderSigs(); liveTop();
  connectWs(my);
  my.tick = setInterval(() => {
    if (my.dead || !G || !G.live) return;
    if (my.dirty) { my.dirty = false; liveRecompute(); renderSigs(); }
    renderCalls(); renderGuessLive(true);
  }, 1000);
}
function connectWs(my) {
  const k = my.sym.toLowerCase() + 'usdt';
  const ws = my.ws = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${k}@kline_${my.tf}/${k}@depth20@1000ms`);
  ws.onmessage = ev => {
    if (my.dead || !G || !G.live) return;
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.stream.includes('@kline')) {
      const x = m.data.k, R = G.R, ts = Math.floor(x.t / 1000), last = R.t.length - 1;
      if (ts === R.t[last]) { R.h[last] = +x.h; R.l[last] = +x.l; R.c[last] = +x.c; R.vol[last] = +x.v; R.tb[last] = +x.V; }
      else if (ts > R.t[last]) {
        for (const key of ['t', 'o', 'h', 'l', 'c', 'vol', 'tb']) R[key].shift();
        R.t.push(ts); R.o.push(+x.o); R.h.push(+x.h); R.l.push(+x.l); R.c.push(+x.c); R.vol.push(+x.v); R.tb.push(+x.V);
        liveRecompute(); renderSigs();
      }
      my.dirty = true; liveTop();
      if (!my.raf) my.raf = requestAnimationFrame(() => { my.raf = 0; draw(); });
    } else if (m.stream.includes('@depth')) { my.book = m.data; renderLiveBook(); }
  };
  ws.onclose = () => { if (my.dead) return; const l = $('#lvPrice'); if (l) l.textContent = U().reconnecting; my.retry = setTimeout(() => { if (!my.dead) connectWs(my); }, 2000); };
}
function liveTop() {
  const el = $('#lvPrice'); if (!el || !G) return;
  const R = G.R, c = R.c[R.ctx - 1], o = R.o[R.ctx - 1], ch = (c / o - 1) * 100;
  el.innerHTML = `${priceTxt(c)} <span class="${ch >= 0 ? 'up' : 'down'}">${fmtPct(ch)}</span>`;
}
function renderTools() {
  const s = set(), t = U(), host = $('#lvTools'); if (!host) return;
  host.innerHTML = `<div class="tools" id="ov">${Object.keys(t.ov).map(k => `<button class="chip ${s.ov[k] ? 'on' : ''}" data-k="${k}">${t.ov[k]}</button>`).join('')}<span class="sep"></span>
    ${[60, 120, 200].map(z => `<button class="chip ${s.zoom === z ? 'on' : ''}" data-z="${z}">${z}</button>`).join('')}</div>
  <div class="tools" id="pn">${['vol', 'cvd', 'rsi', 'macd'].map(k => `<button class="chip ${s.pane === k ? 'on' : ''}" data-k="${k}">${t.pane[k]}</button>`).join('')}</div>`;
  if (!['vol', 'cvd', 'rsi', 'macd'].includes(s.pane)) s.pane = 'vol';
  $('#ov').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.z) s.zoom = +b.dataset.z; else s.ov[b.dataset.k] = !s.ov[b.dataset.k]; save(); renderTools(); draw(); };
  $('#pn').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.pane = b.dataset.k; save(); renderTools(); draw(); };
}
function renderLiveBook() {
  const el = $('#lvBook'); if (!el || !LV || !LV.book) return;
  const t = U(), bk = LV.book, bids = bk.bids.map(x => [+x[0], +x[1]]), asks = bk.asks.map(x => [+x[0], +x[1]]);
  if (!bids.length || !asks.length) return;
  const bb = bids[0][0], ba = asks[0][0], mid = (bb + ba) / 2, spread = (ba - bb) / mid * 1e4;
  const nb = bids.reduce((s, x) => s + x[0] * x[1], 0), na = asks.reduce((s, x) => s + x[0] * x[1], 0), share = nb / (nb + na);
  const mx = Math.max(...bids.slice(0, 10).map(x => x[0] * x[1]), ...asks.slice(0, 10).map(x => x[0] * x[1]));
  const lp = x => Math.abs(x) >= 1000 ? x.toFixed(2) : priceTxt(x);
  const row = (x, side) => `<div class="lrow ${side}"><i style="width:${x[0] * x[1] / mx * 100}%"></i><span>${lp(x[0])}</span><span>${money(x[0] * x[1])}</span></div>`;
  el.innerHTML = `<h3>${t.liveBook}</h3>
    <div class="ladder">${asks.slice(0, 10).reverse().map(x => row(x, 'ask')).join('')}<div class="lmid mono">${lp(mid)} · ${t.spread} ${lp(ba - bb)} (${dec(spread, spread < 0.1 ? 3 : 2)} bp)</div>${bids.slice(0, 10).map(x => row(x, 'bid')).join('')}</div>
    <div class="lvl" style="grid-template-columns:1fr;margin-top:10px"><div class="bar" style="height:20px"><i style="left:0;width:${share * 100}%;background:rgba(43,200,164,.55)"></i><i style="right:0;width:${(1 - share) * 100}%;background:rgba(240,86,94,.55)"></i><span style="left:6px;top:2px" class="mono small">${pctTxt(share)}</span><span style="right:6px;top:2px" class="mono small">${pctTxt(1 - share)}</span></div></div>
    <p class="small muted" style="margin:6px 0 0">${t.imb} : ${money(nb)} / ${money(na)}</p>`;
}
function openFor(sym, tf) { return ST.liveOpen.find(c => c.s === sym && c.tf === tf); }
function renderGuessLive(soft) {
  const el = $('#lvGuess'); if (!el) return;
  const s = set(), t = U(), oc = openFor(s.liveSym, s.liveTf), dur = t.dur(s.liveH * LIVE_TF[s.liveTf]);
  const html = oc ? `<div class="q"><span>${t.oneOpen}</span><b class="mono">${countdown(oc.dl)}</b></div>`
    : `<div class="q"><span>${t.question(t.candles(s.liveH), dur)}</span>
      <div class="seg conf" id="conf">${Object.keys(t.conf).map(k => `<button data-v="${k}" class="${s.conf === k ? 'on' : ''}">${t.conf[k]}</button>`).join('')}</div></div>
      <div class="gbtns"><button class="gb u" data-g="1" ${G && G.live ? '' : 'disabled'}>${t.higher}</button><button class="gb d" data-g="-1" ${G && G.live ? '' : 'disabled'}>${t.lower}</button></div>`;
  if (soft && el.dataset.mode === (oc ? 'open' : 'free') && !oc && G && G.live && !el.querySelector('.gb:disabled')) return;
  el.dataset.mode = oc ? 'open' : 'free'; el.innerHTML = html;
  const cf = $('#conf'); if (cf) cf.onclick = e => { const b = e.target.closest('button'); if (!b) return; s.conf = b.dataset.v; save(); cf.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === s.conf)); };
  el.querySelectorAll('.gb').forEach(b => b.onclick = () => liveCall(+b.dataset.g));
}
function countdown(dl) { const s = Math.max(0, Math.round((dl - Date.now()) / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function liveCall(g) {
  if (!G || !G.live) return;
  const s = set(), R = G.R; if (openFor(R.sym, R.tf)) return;
  const sig = {}; G.S.list.forEach(x => { if (x.dir) sig[x.id] = x.dir; });
  const edge = G.S.pUp - 0.5;
  const c = { id: Date.now(), s: R.sym, tf: R.tf, h: s.liveH, g, cf: s.conf, p0: R.c[R.ctx - 1], t0: Date.now(), dl: Date.now() + s.liveH * LIVE_TF[R.tf] * 1000, sig, cs: Math.abs(edge) < 0.02 ? 0 : Math.sign(edge) };
  ST.liveOpen.push(c); save(); scheduleCall(c);
  toast(U().callMade(U().dur(s.liveH * LIVE_TF[R.tf])));
  renderGuessLive(); renderCalls(); draw();
}
function scheduleCall(c) { setTimeout(() => resolveCall(c), Math.max(0, c.dl - Date.now()) + 1200); }
async function resolveCall(c) {
  if (!ST.liveOpen.find(x => x.id === c.id)) return;
  let p1 = null;
  try {
    if (Date.now() - c.dl < 15000) { const r = await (await fetch(`${API}/ticker/price?symbol=${c.s}USDT`)).json(); p1 = +r.price; }
    else { const k = await (await fetch(`${API}/klines?symbol=${c.s}USDT&interval=1m&startTime=${c.dl - 60000}&limit=3`)).json(); const kk = k.find(x => x[0] <= c.dl && c.dl < x[0] + 60000) || k[0]; p1 = +kk[4]; }
  } catch (e) { p1 = null; }
  if (!p1) { setTimeout(() => resolveCall(c), 5000); return; }
  const out = Math.sign(p1 - c.p0), mv = (p1 / c.p0 - 1) * 100;
  const rec = { s: c.s, tf: c.tf, h: c.h, g: c.g, cf: c.cf, out, ok: out !== 0 && out === c.g, mv: +mv.toFixed(4), cs: c.cs, sig: c.sig, t: Math.floor(c.t0 / 1000), p0: c.p0, p1, live: true };
  ST.liveOpen = ST.liveOpen.filter(x => x.id !== c.id); ST.live.push(rec); save();
  toast(U().resolved(c.s, rec.ok, fmtPct(mv, 3)));
  if (SCREEN === 'live') { renderCalls(); renderGuessLive(); const hd = app.querySelector('.gtop'); if (hd) hd.outerHTML = liveHeader(); draw(); }
}
function renderCalls() {
  const el = $('#lvCalls'); if (!el) return;
  const t = U(), open = ST.liveOpen, done = ST.live.slice(-6).reverse();
  const arrow = g => g > 0 ? '<b class="up">▲</b>' : '<b class="down">▼</b>';
  const live = c => { const p = G && G.live && G.R.sym === c.s ? G.R.c[G.R.ctx - 1] : null; if (!p) return ''; const m = (p / c.p0 - 1) * 100; return ` · <span class="${(m >= 0) === (c.g > 0) ? 'up' : 'down'}">${fmtPct(m, 3)}</span>`; };
  el.innerHTML = `<h3>${t.openCalls}</h3>${open.length ? open.map(c => `<div class="call">${arrow(c.g)} <b>${c.s}</b> ${c.tf} ×${c.h} · ${t.entry} <span class="mono">${priceTxt(c.p0)}</span>${live(c)}<span class="mono" style="margin-left:auto">${t.left} ${countdown(c.dl)}</span></div>`).join('') : `<p class="small muted" style="margin:0">${t.noOpen}</p>`}
  ${done.length ? `<h3 style="margin-top:14px">${t.lastRes}</h3>${done.map(r => `<div class="call">${arrow(r.g)} <b>${r.s}</b> ${r.tf} ×${r.h} · <span class="mono ${r.mv >= 0 ? 'up' : 'down'}">${fmtPct(r.mv, 3)}</span><b style="margin-left:auto" class="${r.ok ? 'up' : 'down'}">${r.out === 0 ? '=' : r.ok ? t.right : t.wrong}</b></div>`).join('')}` : ''}`;
}
function drawCalls(X, Y, D, cw, W, padR) {
  const R = G.R;
  for (const c of ST.liveOpen.filter(c => c.s === R.sym && c.tf === R.tf)) {
    const col = c.g > 0 ? COL.up : COL.down, y = Y(c.p0);
    let i0 = R.t.findIndex(t => t * 1000 <= c.t0 && c.t0 < (t + R.step) * 1000); if (i0 < 0) i0 = D;
    cx.setLineDash([4, 3]); cx.strokeStyle = col; cx.lineWidth = 1.2; line(X(i0), y, W - padR, y);
    const xd = X(D) - cw / 2 + (c.dl / 1000 - R.t[D]) / R.step * cw;
    if (xd < W - padR) line(xd, 0, xd, Y(c.p0) + 40);
    cx.setLineDash([]); cx.lineWidth = 1;
    cx.fillStyle = col; cx.font = '600 11px "IBM Plex Mono", monospace'; cx.fillText((c.g > 0 ? '▲ ' : '▼ ') + countdown(c.dl), Math.min(xd + 4, W - padR - 60), y - 9);
  }
}
ST.liveOpen.forEach(scheduleCall);

window.addEventListener('keydown', e => { if (!G || !cv || !document.body.contains(cv)) return; if (G.live) { if (e.key === 'ArrowUp') liveCall(1); if (e.key === 'ArrowDown') liveCall(-1); return; } if (G.guess != null) { if (e.key === 'Enter' && $('#nextB')) $('#nextB').click(); return; } if (e.key === 'ArrowUp') onGuess(1); if (e.key === 'ArrowDown') onGuess(-1); });
chrome();
renderHome();
loadMe();
})();
