/* PBS/Web – Krypto-Bank (moderne Epoche): Verwahrung von Kunden-Coins mit Depotgebühr, Staking,
   Lombardkredite gegen Krypto (Nachschuss, Zwangsverwertung), Platzierungen bei Lending-Plattformen
   und Börsen (Celsius, FTX, BlockFi, Genesis …) sowie Blockchain-Analyse eingehender Coins.
   Nur aktiv, wenn G.state.meta.era === 'modern'. Zustand in s.cbank, Konten bleiben gewöhnliche
   CUR-Konten mit ccy = Coin. */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  const t = PBS.L.t;
  function S() { return G.state; }
  const CB = G.cbank = {};
  const CR = function () { return G.crypto; };
  function on() { const s = S(); return !!(s && s.meta && s.meta.era === 'modern' && G.crypto); }
  CB.on = on;

  /* ---------- Coins: Belehnung und Staking ---------- */
  // ltv: Belehnungswert; stake.from: ab wann Staking real möglich war; unlock: ab wann Abzug möglich;
  // apy: Stützpunkte Bruttorendite % p.a.; unbond: Bankwerktage bis zur Freigabe; slash: Slashing möglich
  const CFG = {
    BTC: { ltv: 0.5 },
    ETH: { ltv: 0.5, stake: { from: '2022-09-15', unlock: '2023-04-12', unbond: 6, slash: true, apy: [['2022-09-15', 4.6], ['2023-06-30', 3.8], ['2024-06-28', 3.2], ['2025-06-30', 2.9]] } },
    SOL: { ltv: 0.3, stake: { from: '2021-02-10', unbond: 3, slash: false, apy: [['2021-02-10', 7.8], ['2023-01-02', 7.0], ['2025-06-30', 6.6]] } },
    ADA: { ltv: 0.25, stake: { from: '2020-07-29', unbond: 1, slash: false, apy: [['2020-07-29', 5.2], ['2022-01-03', 4.4], ['2024-01-02', 3.2], ['2025-06-30', 2.8]] } },
    DOT: { ltv: 0.25, stake: { from: '2020-08-18', unbond: 20, slash: true, apy: [['2020-08-18', 13.0], ['2025-06-30', 14.0]] } },
    XTZ: { ltv: 0.2, stake: { from: '2018-09-17', unbond: 1, slash: false, apy: [['2018-09-17', 6.0], ['2025-06-30', 9.0]] } },
    ATOM: { ltv: 0.2, stake: { from: '2019-04-18', unbond: 15, slash: true, apy: [['2019-04-18', 9.0], ['2021-06-30', 12.0], ['2025-06-30', 15.0]] } },
    AVAX: { ltv: 0.2 }, XRP: { ltv: 0.25 }, LTC: { ltv: 0.3 }, BCH: { ltv: 0.25 }, LINK: { ltv: 0.2 }, DOGE: { ltv: 0.1 },
    USDT: { ltv: 0.5 }, USDC: { ltv: 0.7 }, DAI: { ltv: 0.5 }, USTC: { ltv: 0.5 }, BUSD: { ltv: 0.5 },
    // Börsen- und Plattform-Token, illiquide Coins: kaum belehnbar
    LUNA: { ltv: 0.1 }, FTT: { ltv: 0 }, CEL: { ltv: 0 }, BNB: { ltv: 0.15 }, CRO: { ltv: 0 }, NEXO: { ltv: 0 }
  };
  CB.CFG = CFG;
  CB.coin = function (id) { return CR().get(id); };
  CB.name = function (id) { if (id === 'USD') return t('USD (Stablecoins)', 'USD (stablecoins)'); const c = CB.coin(id); return c ? c.name : id; };
  CB.ltv = function (id) {
    const c = CB.coin(id);
    if (!c) return 0;
    if (CFG[id]) return CFG[id].ltv;
    return c.stable ? 0.5 : 0.15;
  };
  CB.callAt = function (ltv) { return Math.min(0.85, ltv + 0.15); };
  CB.liqAt = function (ltv) { return Math.min(0.92, ltv + 0.3); };
  function interp(pts, iso) {
    if (iso <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (iso <= pts[i][0]) {
        const a = U.toDate(pts[i - 1][0]).getTime(), b = U.toDate(pts[i][0]).getTime(), x = U.toDate(iso).getTime();
        return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (x - a) / (b - a);
      }
    }
    return pts[pts.length - 1][1];
  }
  // Staking-Angaben zu einem Coin: null, wenn nicht stakebar
  CB.stakeInfo = function (id) {
    const c = CB.coin(id), cfg = CFG[id] && CFG[id].stake;
    if (!c || !cfg) return null;
    const d = S().date;
    return { from: cfg.from, unlock: cfg.unlock || cfg.from, unbond: cfg.unbond, slash: cfg.slash, apy: interp(cfg.apy, d), avail: d >= cfg.from && CR().status(c) === 'open', locked: !!cfg.unlock && d < cfg.unlock };
  };
  CB.px = function (id) { return id === 'USD' ? K.rate('USD') : (K.rate(id) || 0); };
  CB.chg = function (id) {
    const s = S();
    return s.prevMarket && s.prevMarket[id] && s.market[id] ? s.market[id] / s.prevMarket[id] - 1 : 0;
  };
  function qr(q) { return q >= 100 ? K.round(q, 2) : q >= 1 ? K.round(q, 4) : +q.toPrecision(4); }

  /* ---------- Gegenparteien (Plattformen, Börsen) ---------- */
  // y: Rendite % p.a. auf BTC, ETH, USD (Stablecoins), other (übrige Coins); freeze: Abzugsstopp; bk: Konkursantrag
  CB.CPS = [
    { id: 'CEL', name: 'Celsius Network', city: 'Hoboken, New Jersey', kind: t('Krypto-Lending-Plattform', 'Crypto lending platform'), from: '2018-07-02', freeze: '2022-06-12', bk: '2022-07-13', y: { BTC: 5.0, ETH: 5.5, USD: 9.0, other: 4.0 },
      desc: 'Takes deposits of coins and lends them on to trading firms and DeFi protocols. Pays more than anyone else and says it is safer than a bank.',
      news: [['2022-06-12', 'Celsius Network pauses all withdrawals, swaps and transfers, citing "extreme market conditions"'], ['2022-07-13', 'Celsius Network files for Chapter 11 bankruptcy in New York']] },
    { id: 'BFI', name: 'BlockFi', city: 'Jersey City, New Jersey', kind: t('Krypto-Lending-Plattform', 'Crypto lending platform'), from: '2019-03-05', freeze: '2022-11-10', bk: '2022-11-28', y: { BTC: 4.5, ETH: 4.5, USD: 8.0 },
      desc: 'Interest accounts for bitcoin and ether, backed by large US venture funds. Lends to institutional borrowers.',
      news: [['2022-07-01', 'FTX US agrees a credit facility for BlockFi, with an option to buy the lender'], ['2022-11-10', 'BlockFi pauses client withdrawals, cites exposure to FTX and Alameda Research'], ['2022-11-28', 'BlockFi files for Chapter 11 bankruptcy']] },
    { id: 'GEN', name: 'Genesis Global Capital (Gemini Earn)', city: 'New York', kind: t('Institutioneller Krypto-Kreditgeber', 'Institutional crypto lender'), from: '2018-03-01', freeze: '2022-11-16', bk: '2023-01-19', y: { BTC: 4.0, ETH: 4.0, USD: 7.5 },
      desc: 'Lending desk of Digital Currency Group. Borrows coins from funds and platforms such as Gemini Earn and lends them to market makers and hedge funds.',
      news: [['2022-11-16', 'Genesis suspends redemptions and new loans at its lending unit; Gemini Earn withdrawals frozen'], ['2023-01-19', 'Genesis Global Capital files for Chapter 11 bankruptcy']] },
    { id: 'FTX', name: 'FTX Trading Ltd.', city: 'Nassau, Bahamas', kind: t('Kryptobörse', 'Crypto exchange'), from: '2019-05-08', freeze: '2022-11-08', bk: '2022-11-11', y: { BTC: 2.0, ETH: 2.0, USD: 5.0, other: 1.5 },
      desc: 'Fast-growing derivatives exchange founded by Sam Bankman-Fried. Margin lending on the platform pays interest; sister firm Alameda Research is the biggest market maker.',
      news: [['2022-11-02', 'CoinDesk: much of Alameda Research\'s balance sheet consists of FTX\'s own token FTT'], ['2022-11-06', 'Binance says it will sell its FTT holdings; withdrawals from FTX rise sharply'],
        ['2022-11-08', 'FTX halts customer withdrawals; Binance signs non-binding deal to take over the exchange'], ['2022-11-09', 'Binance walks away from FTX rescue after due diligence'], ['2022-11-11', 'FTX files for Chapter 11 bankruptcy; Bankman-Fried resigns as chief executive']] },
    { id: 'ANC', name: 'Anchor Protocol (Terra)', city: t('dezentral (Terra-Blockchain)', 'decentralised (Terra blockchain)'), kind: t('DeFi-Sparprotokoll', 'DeFi savings protocol'), re: /Terra|UST|Anchor/i, from: '2021-03-17', freeze: '2022-05-09', bk: '2022-05-12', recovery: 0.05, y: { USD: 19.5 },
      desc: 'Pays close to 20% a year on deposits of the algorithmic stablecoin UST. The yield is subsidised by the Terra ecosystem.',
      news: [['2022-05-09', 'Terra\'s UST stablecoin loses its dollar peg; deposits flee Anchor Protocol'], ['2022-05-12', 'Terra blockchain halted; UST and LUNA in free fall']] },
    { id: 'NEX', name: 'Nexo', city: 'London', kind: t('Krypto-Lending-Plattform', 'Crypto lending platform'), from: '2020-01-02', y: { BTC: 5.0, ETH: 5.0, USD: 10.0, other: 4.0 },
      desc: 'Crypto-backed loans and interest accounts. Publishes real-time attestations of its reserves.',
      news: [['2023-01-12', 'Bulgarian prosecutors search Nexo offices in Sofia'], ['2023-01-19', 'Nexo settles with the SEC and US state regulators for USD 45 million']] }
  ];
  CB.cp = function (id) { return CB.CPS.find(function (x) { return x.id === id; }) || null; };
  CB.cpStatus = function (cp) {
    const d = S().date;
    if (d < cp.from) return 'soon';
    if (cp.bk && d >= cp.bk) return 'bankrupt';
    if (cp.freeze && d >= cp.freeze) return 'frozen';
    return 'open';
  };
  CB.cpYield = function (cp, coin) {
    const c = coin === 'USD' ? { stable: true } : CB.coin(coin);
    if (!c) return 0;
    if (c.stable || coin === 'USD') return cp.y.USD || 0;
    if (cp.y[coin] !== undefined) return cp.y[coin];
    return cp.y.other || 0;
  };

  /* ---------- Regeln der Blockchain-Analyse ---------- */
  D.RULES = D.RULES || {};
  D.RULES['CA-01'] = 'Chain analysis: funds traced to a mixing service';
  D.RULES['CA-02'] = 'Chain analysis: darknet market, hack or fraud proceeds';
  D.RULES['CA-03'] = 'Chain analysis: sanctioned address or entity (OFAC SDN / SECO)';
  D.RULES['CA-04'] = 'Unhosted wallet, ownership not verified (FINMA Guidance 02/2019)';
  D.RULES['CA-05'] = 'Chain analysis: high-risk service (no-KYC exchange, gambling)';
  if (D.RULES_ROUTINE && D.RULES_ROUTINE.indexOf('CA-04') < 0) D.RULES_ROUTINE.push('CA-04');
  CB.CA_RULES = ['CA-01', 'CA-02', 'CA-03', 'CA-04', 'CA-05'];
  const CATS = {
    vasp: { label: 'Swiss-regulated VASP or bank', s: [1, 12], w: 10 },
    exch: { label: 'Regulated exchange', s: [4, 22], w: 50 },
    otc: { label: 'OTC broker', s: [15, 40], w: 8 },
    mining: { label: 'Mining pool payout', s: [8, 25], w: 3 },
    unhosted: { label: 'Unhosted wallet', s: [22, 58], w: 20 },
    gambling: { label: 'Online gambling service', s: [45, 72], w: 2, rule: 'CA-05', bad: 1 },
    hrexch: { label: 'High-risk exchange (no KYC)', s: [50, 78], w: 3, rule: 'CA-05', bad: 1 },
    mixer: { label: 'Mixing service', s: [72, 92], w: 1.2, rule: 'CA-01', bad: 2 },
    darknet: { label: 'Darknet market', s: [80, 96], w: 0.5, rule: 'CA-02', bad: 3 },
    scam: { label: 'Hack or fraud proceeds', s: [78, 95], w: 0.6, rule: 'CA-02', bad: 3 },
    sanct: { label: 'Sanctioned entity', s: [95, 100], w: 0.25, rule: 'CA-03', bad: 4 }
  };
  CB.CATS = CATS;
  // Konkrete Herkunft je nach Datum (öffentlich bekannte Fälle, keine Adressen)
  function detail(cat, d) {
    switch (cat) {
      case 'mixer': return K.pick(['CoinJoin mixing service', 'custodial bitcoin mixer', 'Tornado Cash (Ethereum mixer)']);
      case 'darknet': return d < '2022-04-05' ? K.pick(['Hydra Market (Russian-language darknet market)', 'darknet vendor wallet']) : 'darknet vendor wallet';
      case 'scam': return K.pick(['proceeds of an exchange hack', 'investment-scam wallet', 'ransomware payment cluster']);
      case 'gambling': return 'offshore online casino';
      case 'hrexch': return K.pick(['exchange without KYC (Seychelles)', 'peer-to-peer exchange, no KYC']);
      case 'sanct': {
        const o = ['address on the OFAC SDN list'];
        if (d >= '2021-09-21') o.push('Suex OTC (OFAC-listed 21 Sep 2021)');
        if (d >= '2022-04-05') o.push('Garantex exchange (OFAC-listed 5 Apr 2022)');
        if (d >= '2022-04-14') o.push('Lazarus Group (Ronin Bridge hack, OFAC-listed)');
        if (d >= '2022-08-08') o.push('Tornado Cash (OFAC-listed 8 Aug 2022)');
        return K.pick(o);
      }
      default: return CATS[cat].label;
    }
  }

  /* ---------- Zustand ---------- */
  function st() {
    const s = S();
    if (s.cbank && s.cbank.v === 1) return s.cbank;
    s.cbank = { v: 1, fee: 0.0075, comm: 0.2, thr: 60, stk: {}, loans: [], pl: [], scr: [], jr: [], hist: [], flags: {}, ctr: { loan: 0, pl: 0, scr: 0 }, tot: { fees: 0, comm: 0, int: 0, yld: 0, loss: 0 }, pitched: {} };
    return s.cbank;
  }
  CB.state = st;
  function jr(k, text, chf) {
    const b = st();
    b.jr.unshift({ d: S().date, k: k, text: text, chf: chf || 0 });
    if (b.jr.length > 160) b.jr.length = 160;
  }
  // Absender: echte Mitarbeitende des Szenarios, falls vorhanden
  function who(id, role, fb) {
    const x = G.staff(id);
    if (x && x.status === 'active') return x;
    return G.activeStaff(role)[0] || { name: fb };
  }
  function deskP() { return who('M15', 'pm', 'Digital assets desk'); }
  function desk() { const x = deskP(); return x.name + (x.name === 'Digital assets desk' ? '' : ', digital assets desk'); }
  function sig() { const n = deskP().name.replace(/^Dr\. /, '').split(' '); return n.length > 1 ? n[0].charAt(0) + '. ' + n.slice(1).join(' ') : n[0]; }
  function compl() { const x = who('M07', 'comp', 'Legal & Compliance'); return x.name + (x.name === 'Legal & Compliance' ? '' : ', Compliance'); }
  CB.desk = desk;
  // Steht das Ereignis schon in der Zeitleiste (±4 Tage)? memo: nur Einträge mit Memo zählen
  function tlHas(d, re, memo) {
    const ts = U.toDate(d).getTime();
    return (D.TIMELINE || []).some(function (x) {
      if (Math.abs(U.toDate(x.d).getTime() - ts) > 4 * 864e5) return false;
      if (memo) return !!x.memo && re.test(x.memo.subject + ' ' + x.memo.body);
      if (Math.abs(U.toDate(x.d).getTime() - ts) > 1.5 * 864e5) return false;
      return re.test((x.news || '') + ' ' + (x.memo ? x.memo.subject : ''));
    });
  }
  function news(d, text, re) {
    const s = S();
    if (re && tlHas(d, re)) return;
    if (s.news.some(function (n) { return n.text === text; })) return;
    s.news.push({ d: s.date, text: text });
  }

  /* ---------- Abfragen ---------- */
  CB.isCoinAcc = function (a) { return a && a.type === 'CUR' && !a.closed && CR().isCoin(a.ccy); };
  CB.accounts = function (coin) {
    return S().accounts.filter(function (a) {
      if (!CB.isCoinAcc(a) || (coin && a.ccy !== coin)) return false;
      const c = G.client(a.client);
      return c && c.status === 'active';
    });
  };
  CB.unbonding = function (a) { return (a.unb || []).reduce(function (x, u) { return x + u.q; }, 0); };
  CB.avail = function (a) { return Math.max(0, a.bal - (a.pledged || 0) - (a.staked || 0) - CB.unbonding(a)); };
  CB.clients = function () {
    const ids = {};
    CB.accounts().forEach(function (a) { if (a.bal > 0) ids[a.client] = 1; });
    return Object.keys(ids).map(G.client);
  };
  // Bestand je Coin
  CB.custody = function () {
    const by = {};
    CB.accounts().forEach(function (a) {
      const x = by[a.ccy] = by[a.ccy] || { id: a.ccy, q: 0, chf: 0, staked: 0, pledged: 0, n: 0, accs: 0 };
      x.q += a.bal; x.staked += (a.staked || 0) + CB.unbonding(a); x.pledged += a.pledged || 0;
      x.chf += a.bal * CB.px(a.ccy); x.accs++;
      if (a.bal > 0) x.n++;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.chf - a.chf; });
  };
  CB.aum = function () { return CB.custody().reduce(function (x, c) { return x + c.chf; }, 0); };
  CB.stakedChf = function () { return CB.accounts().reduce(function (x, a) { return x + ((a.staked || 0) + CB.unbonding(a)) * CB.px(a.ccy); }, 0); };
  CB.activeLoans = function () { return st().loans.filter(function (l) { return l.status === 'active'; }); };
  CB.loanChf = function (l) { return l.amount * K.rate(l.ccy); };
  CB.collChf = function (l) { return l.q * CB.px(l.coin); };
  CB.loanLTV = function (l) { const c = CB.collChf(l); return c > 0 ? CB.loanChf(l) / c : 9.99; };
  CB.loanState = function (l) {
    if (l.status !== 'active') return l.status;
    const v = CB.loanLTV(l);
    if (v >= l.liq) return 'liq';
    if (l.call || v >= l.callAt) return 'call';
    return v > l.ltv0 ? 'watch' : 'ok';
  };
  CB.exposure = function () {
    const out = {};
    CB.CPS.forEach(function (cp) { out[cp.id] = { own: 0, client: 0, lost: 0 }; });
    st().pl.forEach(function (p) {
      const x = out[p.cp];
      if (!x) return;
      const v = p.q * CB.px(p.coin);
      if (p.status === 'active' || p.status === 'recall') x[p.src === 'own' ? 'own' : 'client'] += v;
      if (p.status === 'lost') x.lost += p.lossChf || 0;
    });
    return out;
  };
  CB.placed = function (coin, src) {
    return st().pl.filter(function (p) { return (p.status === 'active' || p.status === 'recall') && p.coin === coin && (!src || p.src === src); }).reduce(function (x, p) { return x + p.q; }, 0);
  };
  CB.ownLimit = function () { return Math.max(0, S().bank.capital * 0.25); };
  CB.ownPlaced = function () { return st().pl.filter(function (p) { return p.src === 'own' && (p.status === 'active' || p.status === 'recall'); }).reduce(function (x, p) { return x + p.q * CB.px(p.coin); }, 0); };
  // Unbelastete Kunden-Coins, die die Bank weiterverleihen könnte
  CB.clientFree = function (coin) {
    const tot = CB.accounts(coin).reduce(function (x, a) { return x + CB.avail(a); }, 0);
    return Math.max(0, tot * 0.8 - CB.placed(coin, 'client'));
  };
  CB.openCA = function () { return S().alerts.filter(function (a) { return a.status === 'open' && a.rules.some(function (r) { return CB.CA_RULES.indexOf(r) >= 0; }); }); };
  CB.calls = function () { return CB.activeLoans().filter(function (l) { return l.call; }).length; };

  /* ---------- Einstellungen ---------- */
  CB.settings = function (o) {
    if (!on()) return K.err('Not available.');
    const b = st();
    const fee = +o.fee, comm = +o.comm, thr = +o.thr;
    if (!(fee >= 0.25 && fee <= 1.5)) return K.err('Custody fee must be between 0.25% and 1.5% a year.');
    if (!(comm >= 5 && comm <= 35)) return K.err('Staking commission must be between 5% and 35%.');
    if ([40, 50, 60, 75, 90].indexOf(thr) < 0) return K.err('Select an alert threshold.');
    const tm = K.use(5);
    if (tm) return tm;
    if (fee / 100 > b.fee + 0.0001) CB.clients().forEach(function (c) { K.loyal(c, -(fee / 100 - b.fee) * 400); });
    b.fee = fee / 100; b.comm = comm / 100; b.thr = thr;
    jr('set', 'Settings changed: custody fee ' + U.fmt(fee, 2) + '%, staking commission ' + U.fmt(comm, 0) + '%, chain-analysis alert threshold ' + thr);
    G.save();
    return { ok: true };
  };

  /* ---------- Blockchain-Analyse ---------- */
  function riskMult(c) {
    let m = 1;
    if (c.risk === 'Increased') m *= 2.2;
    if (c.risk === 'PEP') m *= 1.6;
    if (typeof c.cryptoRisk === 'number') m *= 1 + 4 * c.cryptoRisk;
    if (c.flags && (c.flags.launder || c.flags.dirty)) m *= 3;
    return m;
  }
  function pickCat(c, dir, origin) {
    const d = S().date, m = riskMult(c);
    const ru = (c.nat === 'RU' || c.dom === 'RU' || c.nat === 'BY' || c.dom === 'BY') && d >= '2022-02-28';
    return K.weighted(Object.keys(CATS), function (k) {
      const x = CATS[k];
      let w = x.w;
      if (x.bad) w *= m;
      if (k === 'sanct' && (d < '2018-11-28')) return 0;
      if (k === 'sanct' && ru) w *= 8;
      if (k === 'mining' && dir === 'out') return 0;
      if (k === 'darknet' && dir === 'out') w *= 0.3;
      if (origin === 'exch') { if (k === 'exch' || k === 'vasp') w *= 4; else if (x.bad) w *= 0.5; }
      if (origin === 'wallet') { if (k === 'unhosted' || k === 'mining') w *= 4; else if (k === 'exch') w *= 0.4; }
      if (origin === 'unknown' && x.bad) w *= 2.5;
      return w;
    });
  }
  // Screening einer Überweisung (bereits gebucht): Score, Kategorie, ggf. Alarm
  function screen(c, acc, q, dir, tx, origin, srcTag) {
    const s = S(), b = st();
    let cat = pickCat(c, dir, origin);
    let det = detail(cat, s.date);
    if (cat === 'mixer' && /Tornado/.test(det) && s.date >= '2022-08-08') cat = 'sanct';
    const x = CATS[cat];
    let score = Math.round(K.between(x.s[0], x.s[1]));
    if (c.risk === 'Increased' || c.risk === 'PEP') score = Math.min(100, score + 4);
    const chf = Math.abs(q * CB.px(acc.ccy));
    const rec = { id: 'KYT-' + U.pad(++b.ctr.scr, 5), d: s.date, client: c.id, acc: acc.id, ccy: acc.ccy, q: q, chf: K.round(chf), dir: dir, cat: cat, det: det, score: score, alert: null, src: srcTag || 'auto' };
    const hits = [];
    if (x.rule && score >= b.thr) hits.push(x.rule);
    if (cat === 'unhosted' && dir === 'in' && chf >= 100000 && s.date >= '2019-08-26') hits.push('CA-04');
    if (!c.formA && chf >= 25000 && D.RULES['TM-05']) hits.push('TM-05');
    if (hits.length && hits.some(function (h) { return h !== 'TM-05'; })) {
      const a = K.raise(hits, c, tx, (dir === 'in' ? 'Incoming ' : 'Outgoing ') + acc.ccy + ' ' + U.fmt(Math.abs(q), 4) + (dir === 'in' ? ' from ' : ' to ') + det + ', risk score ' + score);
      if (a) { a.chain = { score: score, cat: cat, coin: acc.ccy, q: q, dir: dir, scr: rec.id }; rec.alert = a.id; }
    } else if (x.rule && score >= 60) rec.missed = true;
    b.scr.unshift(rec);
    if (b.scr.length > 220) b.scr.length = 220;
    return rec;
  }
  CB.screen = screen;

  // Kunde überweist Coins an die Bank (manuell erfasst)
  CB.deposit = function (cid, coin, q, origin) {
    if (!on()) return K.err('Not available.');
    const c = G.client(cid);
    if (!c || c.status !== 'active') return K.err('Select an active client.');
    const cn = CB.coin(coin);
    if (!cn || CR().status(cn) !== 'open') return K.err('This coin cannot be received.');
    q = +q;
    if (!(q > 0)) return K.err('Enter the quantity received.');
    const tm = K.use(10);
    if (tm) return tm;
    const acc = K.ensureAccount(c, coin, null);
    const tx = K.book(acc, qr(q), 'Incoming transfer ' + coin + ' (blockchain)', { kind: 'crypto-in', ext: true });
    const rec = screen(c, acc, q, 'in', tx, origin, 'manual');
    jr('in', c.rubrik + ': received ' + coin + ' ' + U.fmt(q, 4) + ', score ' + rec.score, rec.chf);
    G.save();
    return { ok: true, rec: rec, text: 'Booked ' + coin + ' ' + U.fmt(q, 4) + ' to ' + acc.id + '. Chain analysis: score ' + rec.score + ' (' + rec.det + ').' + (rec.alert ? ' Alert ' + rec.alert + ' raised.' : '') };
  };
  // Auszahlung an eine externe Adresse
  CB.withdraw = function (accId, q, dest) {
    if (!on()) return K.err('Not available.');
    const acc = G.account(accId);
    if (!CB.isCoinAcc(acc)) return K.err('Select a crypto account.');
    const c = G.client(acc.client);
    if (!c || c.status !== 'active') return K.err('Relationship is not active.');
    q = +q;
    if (!(q > 0)) return K.err('Enter the quantity.');
    if (q > CB.avail(acc) + 1e-9) return K.err('Only ' + U.fmt(CB.avail(acc), 4) + ' ' + acc.ccy + ' are free (rest is staked or pledged).');
    const tm = K.use(10);
    if (tm) return tm;
    const tx = K.book(acc, -qr(q), 'Outgoing transfer ' + acc.ccy + ' (blockchain)', { kind: 'crypto-out', ext: true });
    const rec = screen(c, acc, -q, 'out', tx, dest, 'manual');
    jr('out', c.rubrik + ': sent ' + acc.ccy + ' ' + U.fmt(q, 4) + ', score ' + rec.score, rec.chf);
    G.save();
    return { ok: true, rec: rec, text: 'Sent ' + acc.ccy + ' ' + U.fmt(q, 4) + '. Destination screened: score ' + rec.score + ' (' + rec.det + ').' + (rec.alert ? ' Alert ' + rec.alert + ' raised.' : '') };
  };

  // Alarmqualität: Blockchain-Alarme lassen sich mit "Einkommen" nicht sauber begründen
  const aq = G.alertQuality;
  G.alertQuality = function (a, just) {
    const r = aq.apply(this, arguments);
    if (a && a.rules && a.rules.some(function (x) { return x === 'CA-01' || x === 'CA-02' || x === 'CA-03'; })) return 'thin';
    if (a && a.rules && a.rules.indexOf('CA-05') >= 0 && just !== 'sale' && just !== 'income') return 'thin';
    return r;
  };

  /* ---------- Staking ---------- */
  CB.launchStaking = function (coin) {
    if (!on()) return K.err('Not available.');
    const b = st(), si = CB.stakeInfo(coin);
    if (!si) return K.err('This coin cannot be staked.');
    if (!si.avail) return K.err(coin + ' staking is not possible before ' + U.fmtDate(si.from) + '.');
    if (b.stk[coin]) return K.err('Staking for ' + coin + ' is already offered.');
    const tm = K.use(45);
    if (tm) return tm;
    b.stk[coin] = { since: S().date };
    let n = 0, q = 0;
    CB.accounts(coin).forEach(function (a) {
      const c = G.client(a.client);
      let p = 0.35;
      if (c.traits.indexOf('greedy') >= 0) p += 0.3;
      if (c.traits.indexOf('nervous') >= 0) p -= 0.2;
      if (CB.avail(a) > 0 && K.chance(p)) { q += CB.avail(a); a.staked = (a.staked || 0) + CB.avail(a); a.stakeSince = S().date; n++; }
    });
    jr('stake', coin + ' staking launched; ' + n + ' client account(s) opted in (' + coin + ' ' + U.fmt(q, 2) + ')');
    K.msg({ type: 'email', kind: 'info', from: desk(), subject: coin + ' staking is live',
      body: 'Hi,\n\nWe sent the client letters for ' + CB.name(coin) + ' staking this morning. ' + n + ' client(s) opted in straight away, ' + coin + ' ' + U.fmt(q, 2) + ' in total. Current network yield is about ' + U.fmt(si.apy, 1) + '% gross; we keep ' + U.fmt(b.comm * 100, 0) + '% as commission and pay the rest out in coins at month end.\n\n' +
        (si.locked ? 'Reminder: staked ETH cannot be withdrawn from the Beacon Chain until the Shapella upgrade. Clients have signed that.\n\n' : '') + (si.slash ? 'Slashing risk sits with us if our validator operator makes a mistake. I would not promise clients anything else.\n\n' : '') + sig() });
    G.save();
    return { ok: true, text: n + ' client account(s) opted in.' };
  };
  CB.stake = function (accId) {
    if (!on()) return K.err('Not available.');
    const a = G.account(accId), b = st();
    if (!CB.isCoinAcc(a)) return K.err('Select a crypto account.');
    if (!b.stk[a.ccy]) return K.err('The bank does not offer ' + a.ccy + ' staking yet.');
    const free = CB.avail(a);
    if (!(free > 0)) return K.err('No free coins on this account.');
    const tm = K.use(4);
    if (tm) return tm;
    a.staked = (a.staked || 0) + free;
    a.stakeSince = a.stakeSince || S().date;
    jr('stake', G.client(a.client).rubrik + ': ' + a.ccy + ' ' + U.fmt(free, 4) + ' staked');
    G.save();
    return { ok: true };
  };
  CB.unstake = function (accId) {
    if (!on()) return K.err('Not available.');
    const a = G.account(accId);
    if (!a || !(a.staked > 0)) return K.err('Nothing staked on this account.');
    const si = CB.stakeInfo(a.ccy);
    if (si && si.locked) return K.err('Staked ETH cannot be withdrawn before the Shapella upgrade (' + U.fmtDate(si.unlock) + ').');
    const tm = K.use(4);
    if (tm) return tm;
    const days = si ? si.unbond : 1;
    (a.unb = a.unb || []).push({ q: a.staked, at: U.addBusinessDays(S().date, days) });
    jr('stake', G.client(a.client).rubrik + ': unstaking ' + a.ccy + ' ' + U.fmt(a.staked, 4) + ', free on ' + U.fmtDate(U.addBusinessDays(S().date, days)));
    a.staked = 0;
    a.stakeSince = null;
    G.save();
    return { ok: true, text: 'Coins are free again after ' + days + ' business day(s).' };
  };

  /* ---------- Krypto-Lombardkredite ---------- */
  CB.loanRate = function (ccy) {
    const lib = Math.max(0, S().market.LIBOR || 0);
    return K.round((ccy === 'USD' ? 5.5 : 4.5) + lib, 2);
  };
  CB.maxLoan = function (accId, ccy) {
    const a = G.account(accId);
    if (!CB.isCoinAcc(a)) return 0;
    return CB.avail(a) * CB.px(a.ccy) * CB.ltv(a.ccy) / K.rate(ccy || 'CHF');
  };
  CB.grantLoan = function (accId, amount, ccy) {
    if (!on()) return K.err('Not available.');
    const s = S(), b = st();
    const a = G.account(accId);
    if (!CB.isCoinAcc(a)) return K.err('Select the coin account to pledge.');
    const c = G.client(a.client);
    if (!c || c.status !== 'active') return K.err('Relationship is not active.');
    ccy = ccy === 'USD' ? 'USD' : 'CHF';
    amount = +amount;
    const ltv = CB.ltv(a.ccy);
    if (!(ltv > 0)) return K.err(a.ccy + ' has no lending value at this bank.');
    if (!(amount >= 10000)) return K.err('Minimum loan ' + ccy + ' 10,000.');
    if (amount > CB.maxLoan(a.id, ccy) + 1) return K.err('Exceeds the lending value: max ' + ccy + ' ' + U.fmt(CB.maxLoan(a.id, ccy), 0) + ' (' + U.fmt(ltv * 100, 0) + '% of the free coins).');
    const tm = K.use(25);
    if (tm) return tm;
    const need = Math.min(CB.avail(a), amount * K.rate(ccy) / (ltv * CB.px(a.ccy)) * 1.0001);
    const qn = Math.min(CB.avail(a), Math.ceil(need * 1e8) / 1e8);
    a.pledged = (a.pledged || 0) + qn;
    const l = { id: 'CL-' + U.pad(++b.ctr.loan, 4), client: c.id, acc: a.id, coin: a.ccy, q: qn, ccy: ccy, amount: amount, rate: CB.loanRate(ccy), opened: s.date, status: 'active', accrued: 0, ltv0: ltv, callAt: CB.callAt(ltv), liq: CB.liqAt(ltv), call: null, hold: null, sold: 0 };
    b.loans.push(l);
    const fiat = K.ensureAccount(c, ccy, null);
    l.fiat = fiat.id;
    K.book(fiat, amount, 'Crypto Lombard loan ' + l.id + ', disbursement', { kind: 'loan' });
    K.loyal(c, 4);
    K.note(c, 'Crypto Lombard loan ' + ccy + ' ' + U.fmt(amount, 0) + ' against ' + a.ccy + ' ' + U.fmt(qn, 4) + ' (LTV ' + U.fmt(ltv * 100, 0) + '%).', s.user.id);
    jr('loan', l.id + ' ' + c.rubrik + ': ' + ccy + ' ' + U.fmt(amount, 0) + ' against ' + a.ccy + ' ' + U.fmt(qn, 4), amount * K.rate(ccy));
    G.save();
    return { ok: true, loan: l, text: 'Loan ' + l.id + ' paid out to ' + fiat.id + '.' };
  };
  function release(l) {
    const a = G.account(l.acc);
    if (a) a.pledged = Math.max(0, K.round((a.pledged || 0) - l.q, 8));
    l.q = 0;
  }
  CB.repayLoan = function (id) {
    if (!on()) return K.err('Not available.');
    const l = st().loans.find(function (x) { return x.id === id; });
    if (!l || l.status !== 'active') return K.err('Loan is not active.');
    const c = G.client(l.client);
    const fiat = G.clientAccounts(l.client).filter(function (a) { return a.type === 'CUR' && a.ccy === l.ccy; }).sort(function (x, y) { return y.bal - x.bal; })[0];
    if (!fiat || G.available(fiat) < l.amount) return K.err('Not enough ' + l.ccy + ' on the client\'s accounts to repay ' + U.fmt(l.amount, 0) + '.');
    const tm = K.use(8);
    if (tm) return tm;
    K.book(fiat, -l.amount, 'Crypto Lombard loan ' + l.id + ', repayment', { kind: 'loan' });
    release(l);
    l.amount = 0;
    l.status = 'closed';
    l.closed = S().date;
    if (c) K.note(c, 'Crypto Lombard loan ' + l.id + ' repaid, pledge released.', S().user.id);
    jr('loan', l.id + ' repaid');
    G.save();
    return { ok: true };
  };
  // Verwertung: so viele Coins verkaufen, dass die Belehnung wieder beim Anfangswert liegt (oder alles)
  function liquidate(l, why, log) {
    const s = S();
    const a = G.account(l.acc), c = G.client(l.client);
    const px = CB.px(l.coin);
    const crash = CB.chg(l.coin) < -0.08;
    const slip = 0.005 + (crash ? K.between(0.01, 0.03) : 0);
    const net = px * (1 - slip);
    const loan = CB.loanChf(l);
    let sell;
    if (why === 'full') sell = l.q;
    else {
      const r = (loan - l.ltv0 * l.q * px) / (1 - l.ltv0 * (1 - slip) * px / net);
      sell = Math.min(l.q, Math.max(0, r / net) * 1.02);
    }
    if (loan > l.q * net * 0.97) sell = l.q;
    sell = Math.min(l.q, Math.ceil(sell * 1e8) / 1e8);
    const proceeds = sell * net;
    if (a && sell > 0) {
      a.pledged = Math.max(0, K.round((a.pledged || 0) - sell, 8));
      K.book(a, -sell, 'Forced sale ' + l.coin + ', margin call loan ' + l.id + ' (price ' + U.fmt(px, 2) + ')', { kind: 'liq' });
    }
    l.q = K.round(l.q - sell, 8);
    l.sold += sell;
    const repaidChf = Math.min(loan, proceeds);
    l.amount = K.round(l.amount - repaidChf / K.rate(l.ccy), 2);
    // Überschuss geht auf das Fiat-Konto des Kunden
    if (proceeds > loan && c) {
      const fiat = K.ensureAccount(c, l.ccy, null);
      K.book(fiat, (proceeds - loan) / K.rate(l.ccy), 'Surplus from forced sale, loan ' + l.id, { kind: 'liq' });
    }
    let loss = 0;
    if (l.q <= 1e-8 && l.amount > 0.5) {
      loss = l.amount * K.rate(l.ccy);
      K.expense('losses', loss);
      st().tot.loss += loss;
      l.amount = 0;
    }
    if (l.amount <= 0.5) { release(l); l.amount = 0; l.status = 'liquidated'; l.closed = s.date; }
    l.call = null;
    l.hold = null;
    if (c) {
      K.loyal(c, why === 'client' ? -2 : -12);
      K.note(c, 'Loan ' + l.id + ': ' + l.coin + ' ' + U.fmt(sell, 4) + ' sold at about ' + U.fmt(net, 2) + ' (margin call).' + (loss ? ' Shortfall CHF ' + U.fmt(loss, 0) + ' written off.' : ''), 'Credit control');
    }
    jr('liq', l.id + (c ? ' ' + c.rubrik : '') + ': sold ' + l.coin + ' ' + U.fmt(sell, 4) + ', proceeds CHF ' + U.fmt(proceeds, 0) + (loss ? ', loss CHF ' + U.fmt(loss, 0) : ''), proceeds);
    if (log) {
      log.push(['EVT', t('ZWANGSVERWERTUNG ', 'LIQUIDATION ') + l.id + ' ' + l.coin + ' ' + U.fmt(sell, 4), 'CHF ' + U.fmt(proceeds, 0)]);
      if (loss) log.push(['EVT', t('KREDITVERLUST ', 'LOAN LOSS ') + l.id, 'CHF ' + U.fmt(loss, 0)]);
    }
    return { sell: sell, proceeds: proceeds, loss: loss };
  }
  CB.liquidateNow = function (id) {
    if (!on()) return K.err('Not available.');
    const l = st().loans.find(function (x) { return x.id === id; });
    if (!l || l.status !== 'active') return K.err('Loan is not active.');
    const tm = K.use(10);
    if (tm) return tm;
    const r = liquidate(l, CB.loanLTV(l) >= l.callAt ? 'call' : 'full');
    G.save();
    return { ok: true, text: 'Sold ' + l.coin + ' ' + U.fmt(r.sell, 4) + ' for CHF ' + U.fmt(r.proceeds, 0) + '.' + (r.loss ? ' Loss CHF ' + U.fmt(r.loss, 0) + '.' : '') };
  };

  G.handlers.cbmargin = function (m, key) {
    const l = st().loans.find(function (x) { return x.id === m.data.loan; });
    if (!l || l.status !== 'active') return { text: 'The loan has already been settled.' };
    if (key === 'liq') {
      const r = liquidate(l, 'call');
      return { text: 'Credit control sold ' + l.coin + ' ' + U.fmt(r.sell, 4) + ' for CHF ' + U.fmt(r.proceeds, 0) + '.' + (r.loss ? ' The collateral did not cover the loan: loss CHF ' + U.fmt(r.loss, 0) + '.' : '') };
    }
    if (key === 'hold') {
      l.hold = U.addBusinessDays(S().date, 5);
      K.personal(1, 'Margin calls not enforced');
      const c = G.client(l.client);
      if (c) K.loyal(c, 4);
      return { text: 'No forced sale until ' + U.fmtDate(l.hold) + ', whatever the price does. Credit control has noted that the instruction came from you.' };
    }
    return { text: 'The client has until ' + U.fmtDate(l.call ? l.call.due : S().date) + ' to top up or repay.' };
  };
  G.handlers.cbloanreq = function (m, key) {
    const c = G.client(m.data.client);
    if (key !== 'grant') { if (c) K.loyal(c, -3); return { text: 'Declined. ' + (c ? c.rubrik : 'The client') + ' was not pleased.' }; }
    K.free = true;
    const r = CB.grantLoan(m.data.acc, m.data.amount, m.data.ccy);
    K.free = false;
    return { text: r.ok ? r.text : 'Could not grant the loan: ' + r.msg };
  };
  K.actTime = K.actTime || {};
  K.actTime.cbmargin = { liq: 10, wait: 3, hold: 5 };
  K.actTime.cbloanreq = { grant: 25, decline: 3 };

  /* ---------- Platzierungen bei Gegenparteien ---------- */
  CB.place = function (cpId, coin, q, src) {
    if (!on()) return K.err('Not available.');
    const s = S(), b = st(), cp = CB.cp(cpId);
    if (!cp) return K.err('Select a counterparty.');
    if (CB.cpStatus(cp) !== 'open') return K.err(cp.name + ' does not take deposits' + (CB.cpStatus(cp) === 'soon' ? ' yet.' : ' any more.'));
    if (coin !== 'USD') { const cn = CB.coin(coin); if (!cn || CR().status(cn) !== 'open') return K.err('Select a coin.'); }
    const y = CB.cpYield(cp, coin);
    if (!(y > 0)) return K.err(cp.name + ' pays nothing on ' + coin + '.');
    q = +q;
    if (!(q > 0)) return K.err('Enter the quantity.');
    src = src === 'client' ? 'client' : 'own';
    if (src === 'client') {
      if (coin === 'USD') return K.err('Client stablecoins: select the stablecoin itself.');
      if (q > CB.clientFree(coin) + 1e-9) return K.err('Only ' + U.fmt(CB.clientFree(coin), 4) + ' ' + coin + ' of client coins are unencumbered (80% of the free custody balance).');
    } else if (CB.ownPlaced() + q * CB.px(coin) > CB.ownLimit()) return K.err('Limit for own placements: 25% of equity capital (CHF ' + U.fmt(CB.ownLimit(), 0) + ').');
    const tm = K.use(15);
    if (tm) return tm;
    const p = { id: 'PL-' + U.pad(++b.ctr.pl, 3), cp: cp.id, coin: coin, q: q, src: src, d: s.date, y: y, mark: CB.px(coin), earned: 0, status: 'active' };
    b.pl.unshift(p);
    if (src === 'client') {
      K.personal(2, 'Client crypto lent out without consent');
      if (s.date >= '2021-08-01') K.heat('EBK', 0.5, 'Client crypto assets lent to third parties');
    }
    jr('pl', p.id + ': ' + coin + ' ' + U.fmt(q, 4) + (src === 'client' ? ' (client coins)' : ' (own funds)') + ' placed with ' + cp.name + ' at ' + U.fmt(y, 1) + '%', q * CB.px(coin));
    G.save();
    return { ok: true, text: 'Placed with ' + cp.name + ' at ' + U.fmt(y, 1) + '% a year.' };
  };
  CB.recall = function (id) {
    if (!on()) return K.err('Not available.');
    const p = st().pl.find(function (x) { return x.id === id; });
    if (!p || p.status !== 'active') return K.err('Placement is not active.');
    const cp = CB.cp(p.cp);
    if (CB.cpStatus(cp) !== 'open') return K.err(cp.name + ' is not processing withdrawals.');
    const tm = K.use(8);
    if (tm) return tm;
    p.status = 'recall';
    p.due = U.addBusinessDays(S().date, 2);
    jr('pl', p.id + ': withdrawal requested from ' + cp.name + ', expected ' + U.fmtDate(p.due));
    G.save();
    return { ok: true, text: 'Withdrawal requested. ' + cp.name + ' processes it in two business days.' };
  };
  G.handlers.cbpitch = function (m, key) {
    const cp = CB.cp(m.data.cp);
    if (key === 'decline') return { text: 'You thanked them and said no.' };
    K.free = true;
    const r = key === 'client' ? CB.place(cp.id, m.data.coin, m.data.q, 'client') : CB.place(cp.id, 'USD', m.data.usd, 'own');
    K.free = false;
    return { text: r.ok ? r.text : 'Not possible: ' + r.msg };
  };
  G.handlers.cbloss = function (m, key) {
    const b = st(), p = b.pl.find(function (x) { return x.id === m.data.pl; });
    if (!p) return { text: 'Done.' };
    const cp = CB.cp(p.cp);
    const accs = CB.accounts(p.coin);
    const tot = accs.reduce(function (x, a) { return x + a.bal; }, 0);
    if (key === 'pass' && tot > 0) {
      let n = 0;
      accs.forEach(function (a) {
        const share = Math.min(a.bal, p.q * a.bal / tot);
        if (share <= 0) return;
        const free = Math.max(0, a.bal - share);
        if (a.staked > free) a.staked = free;
        if ((a.pledged || 0) > free) a.pledged = free;
        K.book(a, -share, 'Write-down: loss at ' + cp.name + ' (pro rata)', { kind: 'loss' });
        const c = G.client(a.client);
        if (c) { K.loyal(c, -35); K.note(c, 'Coins written down after the failure of ' + cp.name + '. Client was never told his coins were lent out.', 'Digital Assets desk'); }
        n++;
      });
      p.passed = true;
      K.heat('EBK', 14, 'Losses on lent client crypto passed on to clients');
      K.personal(10, 'Client coins lent out and lost');
      K.discretion(-8);
      K.msg({ type: 'email', kind: 'info', from: 'Redaktion Finanz und Wirtschaft (journalist)', subject: 'Request for comment: client coins at ' + cp.name,
        body: 'Dear Sir or Madam\n\nSeveral of your clients tell us their crypto balances were cut after the failure of ' + cp.name + ', and that they never agreed to their coins being lent out. We intend to publish on Friday. Do you wish to comment?\n\nKind regards' });
      jr('loss', 'Loss at ' + cp.name + ' passed on to ' + n + ' client account(s)');
      return { text: 'The write-down is booked on ' + n + ' account(s). Expect calls.' };
    }
    const loss = p.q * CB.px(p.coin);
    K.expense('losses', loss);
    b.tot.loss += loss;
    p.lossChf = (p.lossChf || 0) + loss;
    K.heat('EBK', 4, 'Client crypto assets lent to third parties');
    jr('loss', 'Bank replaced ' + p.coin + ' ' + U.fmt(p.q, 4) + ' of client coins lost at ' + cp.name, loss);
    return { text: 'The bank buys ' + p.coin + ' ' + U.fmt(p.q, 4) + ' in the market to restore client balances: CHF ' + U.fmt(loss, 0) + ' charged to the income statement.' };
  };
  K.actTime.cbpitch = { client: 15, own: 15, decline: 3 };
  K.actTime.cbloss = { whole: 20, pass: 30 };

  /* ---------- Kündigung: Kredite verrechnen, Staking auflösen ---------- */
  const term = K.terminate;
  K.terminate = function (c) {
    try {
      if (on() && c) {
        st().loans.forEach(function (l) { if (l.client === c.id && l.status === 'active') liquidate(l, 'full'); });
        G.clientAccounts(c.id).forEach(function (a) { if (CB.isCoinAcc(a)) { a.staked = 0; a.unb = []; } });
        if (c.cbFee) { K.charge(c, c.cbFee, 'Crypto custody fee (pro rata)'); c.cbFee = 0; }
      }
    } catch (err) { if (typeof console !== 'undefined') console.error(err); }
    return term.apply(this, arguments);
  };

  /* ---------- Tagesverarbeitung ---------- */
  function days(a, b) { return Math.max(1, Math.round((U.toDate(b) - U.toDate(a)) / 864e5)); }
  function pickCoin(pref) {
    const list = CR().list().filter(function (c) { return CR().status(c) === 'open' && (!pref || pref(c)); });
    return K.weighted(list, function (c) { return c.id === 'BTC' ? 50 : c.id === 'ETH' ? 25 : c.stable ? 6 : CFG[c.id] && CFG[c.id].ltv === 0 ? 1.5 : 4; });
  }
  // Kunden bringen und holen Coins
  function flows(log) {
    const s = S();
    const cc = CB.clients();
    const pIn = Math.min(0.5, 0.1 + 0.03 * cc.length);
    if (K.chance(pIn)) {
      let c = cc.length && K.chance(0.75) ? K.pick(cc) : K.pick(G.activeClients().filter(function (x) { return x.funded !== false && !x.dormant; }));
      if (c) {
        const held = G.clientAccounts(c.id).filter(function (a) { return CB.isCoinAcc(a) && a.bal > 0 && CR().status(CB.coin(a.ccy)) === 'open'; });
        const coin = held.length && K.chance(0.7) ? K.pick(held).ccy : (pickCoin() || {}).id;
        if (coin) {
          const chf = U.clamp((c.wealth || 1e6) * K.between(0.004, 0.04), 15000, 6e6);
          const q = qr(chf / CB.px(coin));
          const acc = K.ensureAccount(c, coin, null);
          const tx = K.book(acc, q, 'Incoming transfer ' + coin + ' (blockchain)', { kind: 'crypto-in', ext: true });
          const rec = screen(c, acc, q, 'in', tx);
          log.push(['EVT', t('KRYPTO-EINGANG ', 'CRYPTO RECEIPT ') + coin + ' ' + c.rubrik, t('SCORE ', 'SCORE ') + rec.score + (rec.alert ? ' ' + rec.alert : '')]);
        }
      }
    }
    if (K.chance(0.07)) {
      const accs = CB.accounts().filter(function (a) { return CB.avail(a) * CB.px(a.ccy) > 5000; });
      if (accs.length) {
        const a = K.pick(accs), c = G.client(a.client);
        const q = qr(CB.avail(a) * K.between(0.1, 0.6));
        const tx = K.book(a, -q, 'Outgoing transfer ' + a.ccy + ' (blockchain)', { kind: 'crypto-out', ext: true });
        const rec = screen(c, a, -q, 'out', tx);
        log.push(['EVT', t('KRYPTO-AUSGANG ', 'CRYPTO PAYOUT ') + a.ccy + ' ' + c.rubrik, t('SCORE ', 'SCORE ') + rec.score + (rec.alert ? ' ' + rec.alert : '')]);
      }
    }
  }

  function custodyFees(log) {
    const b = st();
    let tot = 0;
    CB.clients().forEach(function (c) {
      const v = G.clientAccounts(c.id).filter(CB.isCoinAcc).reduce(function (x, a) { return x + Math.max(0, a.bal) * CB.px(a.ccy); }, 0);
      const f = v * b.fee / 250;
      c.cbFee = (c.cbFee || 0) + f;
      tot += f;
    });
    if (tot) { K.income('fees', tot); b.tot.fees += tot; }
    log.push(['STEP047', t('KRYPTO-DEPOTGEBUEHR', 'CRYPTO CUSTODY FEE ACCRUAL'), 'CHF ' + U.fmt(tot)]);
  }

  function staking(closing, next, log) {
    const s = S(), b = st();
    const dd = days(closing, next);
    const per = {};
    let comm = 0;
    CB.accounts().forEach(function (a) {
      // Unbonding abgeschlossen
      if (a.unb && a.unb.length) a.unb = a.unb.filter(function (u) { return u.at > next; });
      if (!(a.staked > 0)) return;
      const si = CB.stakeInfo(a.ccy);
      if (!si || CR().status(CB.coin(a.ccy)) !== 'open') return;
      const gross = a.staked * si.apy / 100 / 365 * dd;
      a.stkPend = (a.stkPend || 0) + gross * (1 - b.comm);
      const v = gross * b.comm * CB.px(a.ccy);
      comm += v;
      per[a.ccy] = (per[a.ccy] || 0) + gross;
    });
    if (comm) { K.income('comm', comm); b.tot.comm += comm; }
    const keys = Object.keys(per);
    if (keys.length) log.push(['STEP048', t('STAKING-ERTRAEGE ', 'STAKING REWARDS ') + keys.map(function (k) { return k + ' ' + U.fmt(per[k], 4); }).join(' '), t('PROVISION CHF ', 'COMMISSION CHF ') + U.fmt(comm)]);
    // Monatsende: Auszahlung der Erträge in Coins
    if (closing.slice(5, 7) !== next.slice(5, 7)) {
      let n = 0;
      CB.accounts().forEach(function (a) {
        if (!(a.stkPend > 1e-8)) return;
        const q = K.round(a.stkPend, K.dec(a.ccy));
        if (q > 0) { K.book(a, q, 'Staking rewards ' + a.ccy + ' ' + U.monthName(closing) + ' ' + closing.slice(0, 4) + ' (net of ' + U.fmt(b.comm * 100, 0) + '% commission)', { kind: 'stake' }); n++; }
        a.stakeRew = (a.stakeRew || 0) + q;
        a.stkPend = 0;
      });
      if (n) log.push(['STEP049', t('STAKING-AUSZAHLUNG', 'STAKING PAYOUT'), n + t(' KONTEN', ' ACCOUNTS')]);
    }
    // Slashing: selten, die Bank trägt den Schaden
    keys.forEach(function (coin) {
      const si = CB.stakeInfo(coin);
      if (!si || !si.slash || !K.chance(1 / 9000)) return;
      const frac = coin === 'ETH' ? K.between(1 / 32, 0.05) : K.between(0.005, 0.03);
      const staked = CB.accounts(coin).reduce(function (x, a) { return x + (a.staked || 0); }, 0);
      const loss = staked * frac * CB.px(coin);
      K.expense('losses', loss);
      b.tot.loss += loss;
      jr('slash', coin + ' validators slashed: ' + U.fmt(frac * 100, 1) + '% of the stake, bank compensates clients', loss);
      log.push(['EVT', t('SLASHING ', 'SLASHING ') + coin, 'CHF ' + U.fmt(loss, 0)]);
      K.msg({ type: 'email', kind: 'info', from: desk(), subject: 'Slashing incident on our ' + coin + ' validators',
        body: 'Our validator operator ran a backup node with the same keys after a failover. Both signed, and the network slashed the validators for double signing. ' + U.fmt(frac * 100, 1) + '% of the staked ' + coin + ' is gone, CHF ' + U.fmt(loss, 0) + ' at today\'s price.\n\nWe will make the clients whole; the loss goes through our P&L. The operator says it will not happen again. I have asked for that in writing.\n\n' + sig() });
    });
  }

  function loans(closing, next, log) {
    const s = S(), b = st();
    let int = 0;
    CB.activeLoans().forEach(function (l) {
      const c = G.client(l.client);
      if (!c || c.status !== 'active') { liquidate(l, 'full', log); return; }
      const x = CB.loanChf(l) * l.rate / 100 / 250;
      int += x;
      l.accrued += x;
      const v = CB.loanLTV(l);
      const held = l.hold && l.hold >= next;
      if (v >= l.liq && !held) {
        log.push(['EVT', t('NACHSCHUSS NICHT GEDECKT ', 'LTV BREACH ') + l.id, 'LTV ' + U.fmt(v * 100, 0) + '%']);
        liquidate(l, 'call', log);
        K.msg({ type: 'memo', kind: 'info', from: t('Kreditkontrolle', 'Credit control'), subject: 'Forced sale – crypto loan ' + l.id + ' (' + c.rubrik + ')',
          body: 'The loan-to-value of ' + l.id + ' reached ' + U.fmt(v * 100, 0) + '% overnight (liquidation level ' + U.fmt(l.liq * 100, 0) + '%). Under the pledge agreement we sold collateral without waiting for the client.\n\nStatus now: ' + (l.status === 'active' ? 'loan ' + l.ccy + ' ' + U.fmt(l.amount, 0) + ', collateral ' + l.coin + ' ' + U.fmt(l.q, 4) + '.' : 'loan closed.') + '\n\nCredit control' });
        return;
      }
      if (l.call) {
        if (v < l.callAt - 0.05) { l.call = null; log.push(['EVT', t('NACHSCHUSS ERLEDIGT ', 'MARGIN CALL CLEARED ') + l.id, t('KURSERHOLUNG', 'PRICE RECOVERY')]); return; }
        if (next >= l.call.due && v < l.callAt) { l.call = null; log.push(['EVT', t('NACHSCHUSS ERLEDIGT ', 'MARGIN CALL CLEARED ') + l.id, 'LTV ' + U.fmt(v * 100, 0) + '%']); return; }
        if (next >= l.call.due) {
          const p = 0.5 + (c.loyalty >= 60 ? 0.15 : 0) - (c.loyalty < 40 ? 0.2 : 0) + (c.traits.indexOf('nervous') >= 0 ? -0.1 : 0);
          const a = G.account(l.acc);
          if (K.chance(p) && a) {
            // Kunde liefert Coins nach, bis die Belehnung wieder am Anfangswert liegt
            const add = Math.max(0, CB.loanChf(l) / (l.ltv0 * CB.px(l.coin)) - l.q);
            const free = CB.avail(a);
            const fromFree = Math.min(free, add);
            let ext = add - fromFree;
            if (ext > 0) {
              const tx = K.book(a, qr(ext), 'Incoming transfer ' + l.coin + ' (margin top-up, loan ' + l.id + ')', { kind: 'crypto-in', ext: true });
              screen(c, a, ext, 'in', tx);
              ext = qr(ext);
            }
            a.pledged = (a.pledged || 0) + fromFree + Math.max(0, ext);
            l.q += fromFree + Math.max(0, ext);
            l.call = null;
            jr('call', l.id + ' ' + c.rubrik + ': topped up ' + l.coin + ' ' + U.fmt(add, 4));
            log.push(['EVT', t('NACHSCHUSS GELEISTET ', 'MARGIN TOP-UP ') + l.id, l.coin + ' ' + U.fmt(add, 4)]);
          } else if (!held) {
            log.push(['EVT', t('NACHSCHUSS NICHT GELEISTET ', 'MARGIN CALL UNMET ') + l.id, 'LTV ' + U.fmt(v * 100, 0) + '%']);
            liquidate(l, 'call', log);
          }
        }
        return;
      }
      if (v >= l.callAt) {
        l.call = { d: next, due: U.addBusinessDays(next, 2), ltv: v };
        jr('call', l.id + ' ' + c.rubrik + ': margin call at LTV ' + U.fmt(v * 100, 0) + '%');
        log.push(['EVT', t('NACHSCHUSSPFLICHT ', 'MARGIN CALL ') + l.id + ' ' + l.coin, 'LTV ' + U.fmt(v * 100, 0) + '%']);
        K.msg({ type: 'memo', kind: 'cbmargin', from: t('Kreditkontrolle', 'Credit control'), subject: 'Margin call – crypto loan ' + l.id + ' (' + c.rubrik + ')',
          body: l.coin + ' closed at USD ' + U.fmt(CR().usd(l.coin), 2) + ' (' + (CB.chg(l.coin) * 100).toFixed(1) + '% on the day). Loan ' + l.id + ' (' + l.ccy + ' ' + U.fmt(l.amount, 0) + ') is now at ' + U.fmt(v * 100, 0) + '% of the collateral value, ' + l.coin + ' ' + U.fmt(l.q, 4) + ' worth CHF ' + U.fmt(CB.collChf(l), 0) + '.\n\nMargin call level ' + U.fmt(l.callAt * 100, 0) + '%, forced sale at ' + U.fmt(l.liq * 100, 0) + '%. The RM has asked the client to top up or repay by ' + U.fmtDate(l.call.due) + '.\n\nCredit control',
          actions: [['wait', 'Give the client until the deadline'], ['liq', 'Sell collateral now'], ['hold', 'No forced sale for five days (on my responsibility)']], data: { loan: l.id } });
      }
    });
    if (int) { K.income('interest', int); b.tot.int += int; }
    if (CB.activeLoans().length || int) log.push(['STEP051', t('KRYPTO-LOMBARD ZINSEN', 'CRYPTO LOMBARD INTEREST'), CB.activeLoans().length + t(' KREDITE, CHF ', ' LOANS, CHF ') + U.fmt(int)]);
    // Kundenanfragen für Kredite
    if (K.chance(0.025)) {
      const cand = CB.accounts().filter(function (a) { return CB.ltv(a.ccy) > 0 && CB.avail(a) * CB.px(a.ccy) * CB.ltv(a.ccy) > 60000 && !b.loans.some(function (l) { return l.acc === a.id && l.status === 'active'; }); });
      if (cand.length && !s.messages.some(function (m) { return m.kind === 'cbloanreq' && !m.resolved; })) {
        const a = K.pick(cand), c = G.client(a.client);
        const ccy = K.chance(0.6) ? 'CHF' : 'USD';
        const amt = K.roundTo(CB.maxLoan(a.id, ccy) * K.between(0.4, 0.9), 10000);
        const why = K.pick(['wants to buy a flat in Zug without selling his coins (capital gains, he says)', 'needs liquidity for a property deal and does not want to sell at these prices', 'wants to buy more ' + a.ccy + ' with the loan', 'has a tax bill to pay and refuses to sell']);
        K.msg({ type: 'email', kind: 'cbloanreq', from: G.rmName(c) + ' (RM)', subject: 'Loan request ' + c.rubrik + ': ' + ccy + ' ' + U.fmt(amt, 0) + ' against ' + a.ccy,
          body: c.rubrik + ' ' + why + '.\n\nHe asks for ' + ccy + ' ' + U.fmt(amt, 0) + ' against his ' + a.ccy + ' ' + U.fmt(CB.avail(a), 4) + ' (account ' + a.id + '). Lending value at ' + U.fmt(CB.ltv(a.ccy) * 100, 0) + '%: ' + ccy + ' ' + U.fmt(CB.maxLoan(a.id, ccy), 0) + '. Rate ' + U.fmt(CB.loanRate(ccy), 2) + '%.\n\nCan we go ahead?',
          actions: [['grant', 'Grant the loan'], ['decline', 'Decline']], data: { client: c.id, acc: a.id, amount: amt, ccy: ccy } });
      }
    }
  }

  function placements(closing, next, log) {
    const s = S(), b = st();
    const dd = days(closing, next);
    let yld = 0, mtm = 0, clientOut = false;
    b.pl.forEach(function (p) {
      if (p.status !== 'active' && p.status !== 'recall') return;
      const cp = CB.cp(p.cp);
      const px = CB.px(p.coin);
      // Zusammenbruch
      if (cp.freeze && next > cp.freeze) {
        const rec = cp.recovery || 0;
        const val = p.q * px * (1 - rec);
        p.status = 'lost';
        p.lostOn = s.date;
        if (p.src === 'own') {
          mtm += p.q * (px - p.mark);
          K.expense('losses', val);
          b.tot.loss += val;
          p.lossChf = val;
          log.push(['EVT', t('GEGENPARTEI-VERLUST ', 'COUNTERPARTY LOSS ') + cp.name.toUpperCase(), 'CHF ' + U.fmt(val, 0)]);
          jr('loss', p.id + ': ' + cp.name + ' stopped withdrawals, own ' + p.coin + ' ' + U.fmt(p.q, 4) + ' written off', val);
        } else {
          log.push(['EVT', t('KUNDEN-COINS BLOCKIERT ', 'CLIENT COINS FROZEN ') + cp.name.toUpperCase(), p.coin + ' ' + U.fmt(p.q, 4)]);
          jr('loss', p.id + ': client ' + p.coin + ' ' + U.fmt(p.q, 4) + ' stuck at ' + cp.name, p.q * px);
          K.msg({ type: 'email', kind: 'cbloss', from: desk(), subject: 'URGENT: client ' + p.coin + ' stuck at ' + cp.name,
            body: cp.name + ' has stopped all withdrawals. We have ' + p.coin + ' ' + U.fmt(p.q, 4) + ' of CLIENT coins there (CHF ' + U.fmt(p.q * px, 0) + ' at today\'s price), placed on ' + U.fmtDate(p.d) + '. The clients do not know.\n\nOur books still show their full balances. We either buy the coins in the market now and carry the loss, or we write the clients\' balances down pro rata. Legal says the second option will not survive contact with FINMA or the press. I need a decision today.\n\n' + sig(),
            actions: [['whole', 'Bank buys the coins and makes the clients whole'], ['pass', 'Write the client balances down pro rata']], data: { pl: p.id } });
        }
        return;
      }
      const x = p.q * px * p.y / 100 / 365 * dd;
      yld += x;
      p.earned += x;
      if (p.src === 'own') { mtm += p.q * (px - p.mark); p.mark = px; } else clientOut = true;
      if (p.status === 'recall' && next >= p.due) {
        p.status = 'closed';
        p.closed = next;
        jr('pl', p.id + ': ' + p.coin + ' ' + U.fmt(p.q, 4) + ' back from ' + cp.name);
      }
    });
    if (yld) { K.income('interest', yld); b.tot.yld += yld; }
    if (mtm) K.income('trading', mtm);
    if (yld || mtm) log.push(['STEP053', t('PLATZIERUNGEN KRYPTO', 'CRYPTO PLACEMENTS'), t('ZINS CHF ', 'YIELD CHF ') + U.fmt(yld) + (mtm ? t('  BEWERTUNG CHF ', '  REVALUATION CHF ') + U.fmt(mtm, 0) : '')]);
    if (clientOut && next >= '2021-08-01') K.heat('EBK', 0.02, 'Client crypto assets lent to third parties');
    // Unbeantwortete Verlustmeldungen: nach zehn Tagen entscheidet die Geschäftsleitung (Bank deckt)
    s.messages.forEach(function (m) {
      if (m.kind === 'cbloss' && !m.resolved && U.businessDaysBetween(m.d, next) >= 10) {
        const r = G.handlers.cbloss(m, 'whole');
        m.resolved = { key: 'whole', label: 'Decided by the partners', text: r.text, d: next, t: K.OPEN, by: 'Partners' };
      }
    });
  }

  // Nachrichten zu Plattformen und Werbeanrufe
  function cpNews(closing, next, log) {
    const s = S(), b = st();
    CB.CPS.forEach(function (cp) {
      (cp.news || []).forEach(function (n) {
        if (n[0] <= next && n[0] >= s.meta.started && !b.flags['n' + cp.id + n[0]]) {
          b.flags['n' + cp.id + n[0]] = 1;
          news(n[0], n[1], cp.re || new RegExp(cp.name.split(' ')[0], 'i'));
          jr('news', n[1]);
        }
      });
      // Angebot einer Plattform, einmal im Leben der Plattform
      const stt = CB.cpStatus(cp);
      if (stt === 'open' && !b.pitched[cp.id] && (!cp.freeze || U.businessDaysBetween(next, cp.freeze) > 25) && K.chance(0.006)) {
        const coins = CB.custody().filter(function (x) { return CB.cpYield(cp, x.id) > 0 && CB.clientFree(x.id) * CB.px(x.id) > 50000; });
        b.pitched[cp.id] = next;
        const best = coins[0];
        const usd = K.roundTo(Math.min(CB.ownLimit() * 0.4, 5e6) / K.rate('USD'), 100000);
        const acts = [];
        if (best) acts.push(['client', 'Place ' + best.id + ' ' + U.fmt(CB.clientFree(best.id) * 0.5, 2) + ' of client coins at ' + U.fmt(CB.cpYield(cp, best.id), 1) + '%']);
        if (cp.y.USD && usd > 0) acts.push(['own', 'Place USD ' + U.fmt(usd, 0) + ' of own funds in stablecoins at ' + U.fmt(cp.y.USD, 1) + '%']);
        if (!acts.length) return;
        acts.push(['decline', 'Decline']);
        K.msg({ type: 'email', kind: 'cbpitch', from: 'Institutional desk, ' + cp.name, subject: 'Yield on idle assets – ' + cp.name,
          body: 'Dear colleagues\n\nFollowing our call with your digital assets desk: ' + cp.name + ' (' + cp.city + ') would be glad to take coins from Bankhaus Vogt & Cie on our institutional terms. ' + cp.desc + '\n\nCurrent rates: ' + Object.keys(cp.y).map(function (k) { return (k === 'other' ? 'other coins' : k === 'USD' ? 'USD stablecoins' : k) + ' ' + U.fmt(cp.y[k], 1) + '%'; }).join(', ') + ', paid weekly, withdrawals normally within two business days.\n\n' +
            (best ? 'Many custodians put part of their client holdings to work with us. Your clients keep their full balance on your books; you keep the yield.\n\n' : '') + 'Kind regards\nInstitutional coverage',
          actions: acts, data: { cp: cp.id, coin: best ? best.id : null, q: best ? qr(CB.clientFree(best.id) * 0.5) : 0, usd: usd } });
      }
    });
  }

  // Regulatorische Meilensteine (als Memo, falls nicht schon in der Zeitleiste)
  const MEMOS = [
    { d: '2019-08-26', re: /02\/2019|travel rule/i, from: compl, subject: 'FINMA Guidance 02/2019: payments on the blockchain',
      body: 'FINMA published its guidance on payments on the blockchain today. In short: the anti-money-laundering rules apply to coin transfers exactly as to wire transfers, including the travel rule. Switzerland applies it more strictly than FATF.\n\nFor us: coins from or to an external wallet that does not belong to a regulated institution are only allowed if we have verified that the wallet belongs to our own client. Rule CA-04 flags such receipts of CHF 100,000 or more. Please do not clear them without proof of ownership.' },
    { d: '2021-08-01', re: /segregat/i, from: compl, subject: 'DLT Act fully in force',
      body: 'The remaining provisions of the DLT Act are in force as of today. Crypto-based assets we hold for clients can be segregated in our bankruptcy, but only if they are kept for the client at all times. Coins lent out to third parties do not meet that test.\n\nAnything we have placed with platforms on behalf of clients should be reviewed.' },
    { d: '2022-08-08', re: /Tornado/i, from: compl, subject: 'OFAC designates Tornado Cash',
      body: 'OFAC has put the Ethereum mixer Tornado Cash on the SDN list today, including its smart-contract addresses. From now on our chain-analysis tool treats exposure to Tornado Cash as sanctions exposure (rule CA-03), not just as a mixer. Please do not clear such alerts on the client\'s word.' },
    { d: '2022-09-15', re: /staking/i, from: desk, subject: 'Ethereum Merge completed: ETH staking possible',
      body: 'The Merge went through this morning; Ethereum now runs on proof of stake. We can offer institutional ETH staking through our validator operator from today (Crypto › Staking). Staked ETH cannot be withdrawn until the next upgrade, Shapella, which has no date yet. Clients must sign that.' },
    { d: '2023-04-12', re: /Shapella|unstak/i, from: desk, subject: 'Shapella upgrade live: staked ETH can be withdrawn',
      body: 'The Shapella upgrade activated tonight. Staked ETH can now be unstaked; the exit queue takes a few days. Expect some clients to ask.' },
    { d: '2023-12-20', re: /08\/2023|staking/i, from: compl, subject: 'FINMA Guidance 08/2023 on staking',
      body: 'FINMA has published its guidance on staking. Staked client coins can stay off our balance sheet if they remain segregable in a bankruptcy, which requires among other things that we have clear instructions from the client and that the coins are held for each client individually. FINMA also lists the risks we have to disclose: slashing, lock-up periods and counterparty risk.\n\nOur staking terms will need another look.' }
  ];
  function milestones(closing, next, log) {
    const s = S(), b = st();
    MEMOS.forEach(function (m) {
      if (m.d > next || b.flags['m' + m.d] || m.d < s.meta.started) return;
      b.flags['m' + m.d] = 1;
      if (tlHas(m.d, m.re, true)) return;
      K.msg({ type: m.from === desk ? 'email' : 'memo', kind: 'info', from: m.from(), subject: m.subject, body: m.body });
    });
    Object.keys(CFG).forEach(function (id) {
      const si = CB.stakeInfo(id);
      if (!si || !si.avail || b.stk[id] || b.flags['sa' + id] || id === 'ETH') return;
      b.flags['sa' + id] = 1;
      if (si.from < s.meta.started && s.dayNo > 3) return;
      if (!CB.accounts(id).length && si.from < s.meta.started) return;
      K.msg({ type: 'email', kind: 'info', from: desk(), subject: CB.name(id) + ' staking',
        body: CB.name(id) + ' can be staked' + (si.from < s.meta.started ? '' : ' from today') + '. Network yield about ' + U.fmt(si.apy, 1) + '% gross a year, unbonding ' + si.unbond + ' business day(s)' + (si.slash ? ', slashing possible' : ', no slashing') + '. We could offer it to clients under Crypto › Staking.\n\n' + sig() });
    });
  }

  // Abschlüsse von Blockchain-Alarmen ohne Meldung haben Folgen
  function alertFollowUp(log) {
    const s = S(), b = st();
    s.alerts.forEach(function (a) {
      if (!a.chain || a.chain.done || a.status === 'open') return;
      a.chain.done = true;
      if (a.status === 'reported') return;
      const cat = a.chain.cat;
      if (cat === 'sanct') {
        K.heat('US', 2, 'Crypto from sanctioned addresses accepted');
        K.personal(2, 'Sanctioned crypto accepted');
        if (K.chance(0.4)) K.schedule(K.rint(15, 50), 'cbSanction', { alert: a.id, client: a.client, coin: a.chain.coin, chf: a.chf });
      } else if (cat === 'darknet' || cat === 'scam' || cat === 'mixer') {
        K.heat('EBK', 1.2, 'Weak clearing of chain-analysis alerts');
        if (K.chance(0.15)) K.schedule(K.rint(20, 80), 'cbProbe', { alert: a.id, client: a.client, coin: a.chain.coin, chf: a.chf, cat: cat });
      }
    });
    // Revision: Schwelle zu hoch, Treffer ohne Alarm
    const y = s.date.slice(0, 4);
    if (s.flags['audit' + y] && !b.flags['aud' + y]) {
      b.flags['aud' + y] = 1;
      const missed = b.scr.filter(function (r) { return r.missed && r.d.slice(0, 4) === y; }).length;
      const lent = b.pl.some(function (p) { return p.src === 'client' && (p.status === 'active' || p.status === 'recall'); });
      if (missed >= 2) {
        K.heat('EBK', 2 + missed * 0.5, 'Chain-analysis alert threshold set too high');
        K.msg({ type: 'letter', kind: 'info', from: 'Hürlimann Revision AG, Zürich (statutory auditor)', subject: 'Interim finding: blockchain screening',
          body: 'In our sample we found ' + missed + ' incoming or outgoing coin transfers this year with a risk score of 60 or more that did not lead to an alert, because the bank has set its alert threshold at ' + b.thr + '. We will report this to FINMA as a deficiency in transaction monitoring.\n\nHürlimann Revision AG' });
      }
      if (lent && K.chance(0.6)) {
        K.heat('EBK', 8, 'Client crypto assets lent to third parties');
        K.personal(5, 'Client crypto lent out without consent');
        K.msg({ type: 'letter', kind: 'info', from: 'Hürlimann Revision AG, Zürich (statutory auditor)', subject: 'Finding: client crypto assets placed with third parties',
          body: 'The reconciliation of the bank\'s wallets with client balances shows that part of the client coins held in custody is placed with external lending platforms. We have seen no client consent for this. Under the DLT Act such coins are no longer segregable for the clients in a bankruptcy of the bank.\n\nWe will include this in our regulatory audit report to FINMA.\n\nHürlimann Revision AG' });
      }
    }
  }
  K.sched.cbSanction = function (d, log) {
    const c = G.client(d.client);
    K.heat('EBK', 6, 'Sanctions exposure in crypto custody');
    K.heat('US', 6, 'Crypto from sanctioned addresses accepted');
    K.personal(6, 'Sanctions breach (crypto)');
    K.msg({ type: 'letter', kind: 'info', from: 'State Secretariat for Economic Affairs SECO, Sanctions', subject: 'Request for information: crypto assets, ' + (c ? c.id : ''),
      body: 'Dear Sirs\n\nBased on information received from a foreign authority, we have reason to believe that your institution received crypto assets (' + d.coin + ', about CHF ' + U.fmt(d.chf, 0) + ') originating from an address linked to a sanctioned person or entity, and credited them to client relationship ' + (c ? c.id : '') + '.\n\nPlease inform us within 10 days of the measures taken, in particular whether the assets have been frozen and reported. A copy goes to FINMA.\n\nSECO' });
    if (log) log.push(['EVT', t('ANFRAGE SECO (KRYPTO)', 'SECO REQUEST (CRYPTO)'), c ? c.id : '']);
  };
  K.sched.cbProbe = function (d, log) {
    const c = G.client(d.client);
    K.heat('EBK', 3, 'Weak clearing of chain-analysis alerts');
    K.personal(3, 'Questions about crypto deposits');
    K.msg({ type: 'letter', kind: 'info', from: 'Office of the Attorney General of Switzerland', subject: 'Production order: crypto receipts, relationship ' + (c ? c.id : ''),
      body: 'In criminal proceedings for money laundering (Art. 305bis SCC) we order the production of all documents relating to the receipt of ' + d.coin + ' (about CHF ' + U.fmt(d.chf, 0) + ') on relationship ' + (c ? c.id : '') + ', including your blockchain analysis and the clearing of the related alert ' + d.alert + '.\n\nThe documents are to be delivered within 20 days. You are prohibited from informing the client (Art. 10 AMLA does not apply; ban on disclosure ordered).\n\nOffice of the Attorney General' });
    if (log) log.push(['EVT', t('EDITIONSVERFUEGUNG BA (KRYPTO)', 'OAG PRODUCTION ORDER (CRYPTO)'), c ? c.id : '']);
  };

  function quarter(closing, next, log) {
    const om = +closing.slice(5, 7), nm = +next.slice(5, 7);
    if (om === nm || [1, 4, 7, 10].indexOf(nm) < 0) return;
    const q = 'Q' + (Math.floor((om - 1) / 3) + 1) + '/' + closing.slice(0, 4);
    let tot = 0;
    G.activeClients().forEach(function (c) {
      if (c.cbFee > 0.5) { K.charge(c, c.cbFee, 'Crypto custody fee ' + q); tot += c.cbFee; }
      c.cbFee = 0;
    });
    CB.activeLoans().forEach(function (l) {
      const c = G.client(l.client);
      if (c && l.accrued > 0.5) K.charge(c, l.accrued, 'Interest crypto Lombard loan ' + l.id + ' ' + q);
      l.accrued = 0;
    });
    if (tot) log.push(['STEP086', t('KRYPTO-DEPOTGEBUEHR ', 'CRYPTO CUSTODY FEE DEBIT ') + q, 'CHF ' + U.fmt(tot)]);
  }

  CB.eod = function (res) {
    const s = S(), b = st();
    const closing = res.closing || s.date, next = s.date;
    const log = res.log || [];
    if (!CR().list().length) return;
    milestones(closing, next, log);
    cpNews(closing, next, log);
    custodyFees(log);
    staking(closing, next, log);
    loans(closing, next, log);
    placements(closing, next, log);
    flows(log);
    alertFollowUp(log);
    quarter(closing, next, log);
    b.hist.push({ d: closing, aum: K.round(CB.aum()), st: K.round(CB.stakedChf()), ln: K.round(CB.activeLoans().reduce(function (x, l) { return x + CB.loanChf(l); }, 0)) });
    if (b.hist.length > 140) b.hist.splice(0, b.hist.length - 140);
    G.checkGameOver();
    G.save();
  };

  // Zeitleisten-Memos, die "kein Engagement" behaupten, an die tatsächlichen Platzierungen anpassen
  const tlDay = K.timelineDay;
  if (tlDay) {
    K.timelineDay = function () {
      const s = S();
      const saved = [];
      try {
        if (on() && s.cbank) {
          (D.TIMELINE || []).forEach(function (x) {
            if (x.d > s.date || !x.memo || s.flags['tl' + x.d]) return;
            CB.CPS.forEach(function (cp) {
              const hit = s.cbank.pl.filter(function (p) { return p.cp === cp.id && (p.status === 'lost' || p.status === 'active' || p.status === 'recall'); });
              const re = new RegExp('(the bank|we) had no (account|exposure|assets?)( at| with| to)? ' + cp.name.split(' ')[0] + '[^.]*\\.', 'i');
              if (!hit.length || !re.test(x.memo.body)) return;
              const v = hit.reduce(function (a, p) { return a + (p.lossChf || p.q * CB.px(p.coin)); }, 0);
              saved.push([x, x.memo.body]);
              x.memo = Object.assign({}, x.memo, { body: x.memo.body.replace(re, 'the bank itself has about CHF ' + U.fmt(v, 0) + ' at ' + cp.name + ' (placements of the digital assets desk), which we must assume is lost.') });
            });
          });
        }
      } catch (err) { /* Text bleibt */ }
      const r = tlDay.apply(this, arguments);
      saved.forEach(function (p) { p[0].memo = Object.assign({}, p[0].memo, { body: p[1] }); });
      return r;
    };
  }

  const eod = G.endOfDay;
  G.endOfDay = function () {
    const res = eod.apply(this, arguments);
    try { if (on() && S() && !S().gameOver) CB.eod(res || {}); } catch (err) { if (typeof console !== 'undefined') console.error(err); }
    return res;
  };
})(window.PBS);
