/* PBS/Web 4.2 – Börse: Aktienhandel auf eigene Rechnung (Privatdepot des Teilhabers) und für das
   Handelsbuch der Bank. Kurse, Aufträge, Courtage und Stempel, Dividenden, Firmennachrichten,
   Konkurse – und hin und wieder ein Tipp, den man besser nicht gehört hätte. */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  const t = PBS.L.t;
  const T = G.trade = {};
  function S() { return G.state; }
  const SMI_REF = 4211.4;
  const HIST = 130;

  /* ---------- Titel ---------- */
  const SP = {};
  D.STOCKS.forEach(function (x) { x.src = 'stock'; if (x.special) SP[x.id] = x.special.map(function (p) { return [U.toDate(p[0]).getTime(), p[1]]; }); });
  function interp(pts, iso) {
    const ts = U.toDate(iso).getTime();
    if (ts <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (ts <= pts[i][0]) {
        const f = (ts - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return pts[i - 1][1] * Math.pow(pts[i][1] / pts[i - 1][1], f);
      }
    }
    return pts[pts.length - 1][1];
  }
  let ALL = null;
  T.list = function () {
    if (!ALL) {
      ALL = D.INSTR.filter(function (i) { return D.INSTR_META[i.id]; }).map(function (i) {
        return Object.assign({ id: i.id, name: i.name, ccy: i.ccy, src: 'instr' }, D.INSTR_META[i.id]);
      }).concat(D.STOCKS).concat((D.COINS || []).map(function (c) {
        return { id: c.id, name: c.name, ccy: 'USD', src: 'coin', mkt: 'CRYPTO', sector: 'crypto', div: 0, pe: 0, beta: 0, desc: c.desc || '', listed: c.listed, delisted: c.bust || null, bust: !!c.bust, news: c.news || [], stable: !!c.stable };
      }));
      const ORD = ['CH', 'US', 'EU', 'UK', 'JP', 'CRYPTO'];
      ALL.sort(function (a, b) { return a.mkt === b.mkt ? (a.src === 'coin' ? 0 : a.name < b.name ? -1 : 1) : ORD.indexOf(a.mkt) - ORD.indexOf(b.mkt); });
    }
    return ALL;
  };
  T.get = function (id) { return T.list().find(function (x) { return x.id === id; }) || null; };
  T.listed = function (x, iso) { iso = iso || S().date; return (!x.listed || iso >= x.listed) && (!x.delisted || iso < x.delisted); };
  T.status = function (x) {
    const s = S();
    if (x.listed && s.date < x.listed) return 'ipo';
    if (x.delisted && s.date >= x.delisted) return x.bust ? 'bust' : 'delisted';
    return 'open';
  };
  // Kurs in Lokalwährung (JPY: je Aktie in Yen)
  T.px = function (id) {
    const x = T.get(id);
    if (!x) return 0;
    if (x.src === 'instr' || x.src === 'coin') return S().market[id] || 0;
    const st = state();
    return st.px[id] || 0;
  };
  T.fx = function (ccy) { return ccy === 'JPY' ? S().market.JPY / 100 : K.rate(ccy); };
  T.pxCHF = function (id) { const x = T.get(id); return x ? T.px(id) * T.fx(x.ccy) : 0; };
  function model(x, smi, iso, idio) {
    return x.base * Math.pow(smi / SMI_REF, x.beta) * (SP[x.id] ? interp(SP[x.id], iso) : 1) * idio;
  }
  // Schlusskurse: [{d, p}] der letzten n Handelstage
  T.hist = function (id, n) {
    const s = S(), x = T.get(id);
    n = n || HIST;
    if (!x) return [];
    if (x.src === 'instr' || x.src === 'coin') return s.mhist.slice(-n).map(function (m) { return { d: m.d, p: m[id] }; }).filter(function (h) { return h.p; });
    const st = state();
    const h = st.h[id] || [];
    const out = [];
    for (let i = Math.max(0, st.hd.length - n); i < st.hd.length; i++) if (h[i]) out.push({ d: st.hd[i], p: h[i] });
    return out;
  };
  T.change = function (id, days) {
    const h = T.hist(id, (days || 1) + 1);
    if (h.length < 2) return 0;
    return h[h.length - 1].p / h[0].p - 1;
  };

  /* ---------- Zustand ---------- */
  function state() {
    const s = S();
    if (s.trade && s.trade.v === 1) return s.trade;
    const st = s.trade = { v: 1, px: {}, idio: {}, h: {}, hd: [], priv: { pos: {}, real: 0, div: 0, fees: 0 }, bank: { pos: {}, real: 0, div: 0, fees: 0 }, orders: [], journal: [], news: [], tip: null, tips: [], divPaid: {}, watch: [], ctr: 0 };
    // Vorgeschichte aus den SMI-Schlusskursen
    s.mhist.forEach(function (m) {
      st.hd.push(m.d);
      D.STOCKS.forEach(function (x) {
        st.idio[x.id] = Math.exp(Math.log(st.idio[x.id] || 1) * 0.994 + x.vol * 0.6 * K.gauss());
        const p = T.listed(x, m.d) ? K.round(model(x, m.SMI, m.d, st.idio[x.id]), x.base < 20 ? 3 : 2) : 0;
        (st.h[x.id] = st.h[x.id] || []).push(p);
        if (p) st.px[x.id] = p;
      });
    });
    D.STOCKS.forEach(function (x) { if (!T.listed(x)) st.px[x.id] = x.delisted && x.bust ? 0 : st.px[x.id] || 0; });
    return st;
  }
  T.state = state;

  /* ---------- Gebühren ---------- */
  // Privat: Courtage 0.5 % (mind. CHF 40), Umsatzabgabe 0.075 % Inland / 0.15 % Ausland. Handelsbuch: 0.02 %, abgabefrei
  T.costs = function (acct, x, grossCHF) {
    // Krypto: Courtage 1 % (mind. CHF 20) privat, 0.1 % im Handelsbuch, keine Umsatzabgabe
    if (x.src === 'coin') return acct === 'bank' ? { fee: K.round(grossCHF * 0.001, 2), tax: 0 } : { fee: K.round(Math.max(20, grossCHF * 0.01), 2), tax: 0 };
    if (acct === 'bank') return { fee: K.round(grossCHF * 0.0002, 2), tax: 0 };
    return { fee: K.round(Math.max(40, grossCHF * 0.005), 2), tax: K.round(grossCHF * (x.mkt === 'CH' ? 0.00075 : 0.0015), 2) };
  };
  // Handelszeiten (Schweizer Zeit): Zürich, Frankfurt, London 09:00–17:30, New York ab 15:30, Tokio nachts
  T.open = function (x) {
    const c = S().clock;
    if (x.src === 'coin') return true;
    if (x.mkt === 'JP') return false;
    if (x.mkt === 'US') return c >= 15 * 60 + 30;
    return c >= 9 * 60 && c < 17 * 60 + 30;
  };
  T.book = function (acct) { return acct === 'bank' ? state().bank : state().priv; };
  T.cash = function () { return S().career.wealth; };
  T.value = function (acct) {
    const b = T.book(acct);
    return Object.keys(b.pos).reduce(function (tot, id) { return tot + b.pos[id].q * T.pxCHF(id); }, 0);
  };
  T.bankLimit = function () { return Math.max(0, S().bank.capital * 0.2); };
  function reserved(acct, id) {
    return state().orders.filter(function (o) { return o.status === 'open' && o.acct === acct && o.id === id && o.side === 'sell'; }).reduce(function (t2, o) { return t2 + o.q; }, 0);
  }

  /* ---------- Aufträge ---------- */
  function log(e) { const st = state(); e.d = S().date; st.journal.unshift(e); if (st.journal.length > 200) st.journal.length = 200; }
  function fill(o, px) {
    const s = S(), st = state(), x = T.get(o.id), b = T.book(o.acct);
    const fx = T.fx(x.ccy);
    const gross = o.q * px * fx;
    const c = T.costs(o.acct, x, gross);
    if (o.side === 'buy') {
      if (o.acct === 'priv') {
        if (s.career.wealth < gross + c.fee + c.tax) return K.err('Not enough money in your account.');
        s.career.wealth -= gross + c.fee + c.tax;
      } else {
        if (T.value('bank') + gross > T.bankLimit()) return K.err('Trading book limit exceeded (20% of equity capital).');
        K.income('trading', -c.fee);
      }
      const p = b.pos[o.id] = b.pos[o.id] || { q: 0, cost: 0, mark: px * fx };
      // Handelsbuch: bisherige Position zum neuen Kurs bewerten, damit der Gewinn stimmt
      if (o.acct === 'bank' && p.q) { K.income('trading', p.q * (px * fx - p.mark)); }
      p.q += o.q;
      p.cost += gross + c.fee + c.tax;
      p.mark = px * fx;
    } else {
      const p = b.pos[o.id];
      if (!p || p.q < o.q) return K.err('You do not hold enough shares.');
      const basis = p.cost * o.q / p.q;
      const pnl = gross - c.fee - c.tax - basis;
      if (o.acct === 'priv') s.career.wealth += gross - c.fee - c.tax;
      else K.income('trading', o.q * (px * fx - p.mark) - c.fee);
      b.real += pnl;
      p.cost -= basis;
      p.q -= o.q;
      if (p.q <= 0) delete b.pos[o.id];
    }
    b.fees += c.fee + c.tax;
    o.status = 'done';
    o.fill = { d: s.date, t: s.clock, px: px, chf: gross, fee: c.fee, tax: c.tax };
    log({ k: 'fill', o: o.no, acct: o.acct, side: o.side, id: o.id, q: o.q, px: px, chf: gross, fee: c.fee + c.tax });
    return { ok: true, o: o };
  }
  // Neuer Auftrag: {acct, side, id, q, type: mkt|lmt|stop, lim, valid: day|gtc}
  T.place = function (p) {
    const s = S(), st = state(), x = T.get(p.id);
    if (!x) return K.err('Unknown security.');
    const status = T.status(x);
    if (status === 'ipo') return K.err('This share is not listed yet (IPO on ' + U.fmtDate(x.listed) + ').');
    if (status !== 'open') return K.err('Trading in this share has been suspended.');
    const q = x.src === 'coin' ? K.round(+p.q, 8) : Math.floor(+p.q);
    if (!(q > 0)) return K.err('Please enter a number of shares.');
    const type = ['mkt', 'lmt', 'stop'].indexOf(p.type) >= 0 ? p.type : 'mkt';
    if (type !== 'mkt' && !(+p.lim > 0)) return K.err('Please enter a limit price.');
    if (type === 'stop' && p.side !== 'sell') return K.err('Stop-loss orders are for selling only.');
    const acct = p.acct === 'bank' ? 'bank' : 'priv';
    const px = T.px(x.id);
    if (p.side === 'sell') {
      const have = (T.book(acct).pos[x.id] || { q: 0 }).q - reserved(acct, x.id);
      if (have < q) return K.err('You do not hold enough shares (available: ' + Math.max(0, have) + ').');
    } else if (acct === 'priv') {
      const need = q * (type === 'mkt' ? px : +p.lim) * T.fx(x.ccy) * 1.007;
      if (s.career.wealth < need) return K.err('Not enough money: available CHF ' + U.fmt(s.career.wealth, 0) + '.');
    }
    const tm = K.use(type === 'mkt' ? 3 : 2);
    if (tm) return tm;
    const o = { no: 'O' + U.pad(++st.ctr, 5), d: s.date, t: s.clock, acct: acct, side: p.side === 'sell' ? 'sell' : 'buy', id: x.id, q: q, type: type, lim: type === 'mkt' ? null : +p.lim, valid: p.valid === 'gtc' ? 'gtc' : 'day', status: 'open' };
    st.orders.unshift(o);
    if (st.orders.length > 150) st.orders = st.orders.filter(function (y, i) { return i < 150 || y.status === 'open'; });
    if (acct === 'bank') K.personal(0, '');
    if (type === 'mkt' && T.open(x)) {
      const r = fill(o, x.src === 'coin' ? +(px * (o.side === 'buy' ? 1.001 : 0.999)).toPrecision(6) : K.round(px * (o.side === 'buy' ? 1.001 : 0.999), x.base < 20 ? 3 : 2));
      if (!r.ok) { o.status = 'rejected'; o.why = r.msg; return r; }
      G.save();
      return { ok: true, o: o, text: 'Executed: ' + (o.side === 'buy' ? 'bought ' : 'sold ') + q + ' ' + x.name + ' at ' + x.ccy + ' ' + U.fmt(o.fill.px, 2) + '.' };
    }
    G.save();
    return { ok: true, o: o, text: type === 'mkt' ? 'The exchange is closed. The order will be filled at the next closing price.' : 'Order entered. It is checked against the closing price after the market closes.' };
  };
  T.cancel = function (no) {
    const o = state().orders.find(function (x) { return x.no === no; });
    if (!o || o.status !== 'open') return K.err('The order is no longer open.');
    o.status = 'cancelled';
    G.save();
    return { ok: true };
  };

  /* ---------- Nachrichten ---------- */
  function short(x) { return x.name.replace(/\s+(AG|SA|SpA|plc|Inc\.|Corp\.|Oyj|K\.K\.|Holding|N|I|A|St\.)(\s|$).*$/, '').replace(/\s+(Holding|Stores|Capital|Energy Trading|Mortgage|Networks|Computer|Pharmaceuticals)$/, ''); }
  T.short = short;
  function news(x, text, big) {
    const s = S(), st = state();
    st.news.unshift({ d: s.date, id: x ? x.id : null, text: text });
    if (st.news.length > 120) st.news.length = 120;
    if (big) s.news.push({ d: s.date, text: text });
  }
  const EVENTS = [
    { k: 'beat', w: 5, j: [0.03, 0.08], h: function (n) { return K.pick([n + ' beats profit forecasts', n + ': results better than expected', n + ' raises its outlook for the year']); } },
    { k: 'warn', w: 4, j: [-0.15, -0.06], h: function (n) { return K.pick([n + ' issues profit warning', n + ' cuts its forecast; shares fall', 'Surprise loss at ' + n]); } },
    { k: 'prod', w: 3, j: [0.02, 0.06], h: function (n) { return K.pick([n + ' wins large order', n + ' launches new product line', 'Analysts upgrade ' + n + ' to "buy"']); } },
    { k: 'law', w: 2, j: [-0.09, -0.03], h: function (n) { return K.pick([n + ' sued by former customers', 'Competition authority opens inquiry into ' + n, 'Analysts downgrade ' + n + ' to "sell"']); } },
    { k: 'ceo', w: 1.5, j: [-0.05, 0.03], h: function (n) { return K.pick(['Chief executive of ' + n + ' steps down', n + ' appoints new chairman', 'Board row at ' + n]); } },
    { k: 'bid', w: 0.4, j: [0.18, 0.32], h: function (n) { return 'Takeover bid for ' + n + ' at a premium'; } }
  ];
  function corporate(x) {
    const st = state(), ev = K.weighted(EVENTS, function (e) { return e.w; });
    const j = K.between(ev.j[0], ev.j[1]);
    jump(x, j);
    news(x, ev.h(short(x)), Math.abs(j) >= 0.12);
    return ev.k;
  }
  function jump(x, j) {
    const st = state();
    if (x.src === 'stock') { st.idio[x.id] = (st.idio[x.id] || 1) * (1 + j); st.px[x.id] = K.round(st.px[x.id] * (1 + j), x.base < 20 ? 3 : 2); }
    else { S().idio[x.id] = (S().idio[x.id] || 1) * (1 + j); S().market[x.id] = K.round(S().market[x.id] * (1 + j), 2); }
  }

  /* ---------- Tipps (Insider) ---------- */
  function maybeTip() {
    const s = S(), st = state();
    if (st.tip || s.dayNo < 15 || !K.chance(0.004)) return;
    const pool = T.list().filter(function (x) { return T.status(x) === 'open' && !x.bust && x.mkt !== 'JP' && x.src !== 'coin' && x.id !== 'LBG'; });
    const clients = G.activeClients().filter(function (c) { return c.dom === 'CH' || K.chance(0.5); });
    if (!pool.length || !clients.length) return;
    const x = K.pick(pool), c = K.pick(clients), buyer = K.pick(['Rhein-Pharma', 'an American group', 'a French competitor', 'a private equity fund from London', 'the Japanese', 'a family office from Geneva']);
    const at = U.addBusinessDays(s.date, K.rint(3, 7));
    st.tip = { id: x.id, d: s.date, at: at, prem: K.between(0.2, 0.35), client: c.id, buyer: buyer };
    K.msg({
      type: 'memo', kind: 'tip', from: G.rmName(c) + ' (' + 'phone note' + ')', subject: 'Call from ' + c.rubrik + ' – ' + short(x),
      body: 'Phone note, ' + U.fmtTime(s.clock) + '\n\n' + c.rubrik + ' ' + 'called and asked for you personally. He sits on the board of a company that does business with ' + x.name + '.\n\n' +
        '"' + 'Between us: ' + buyer + ' will make a takeover bid for ' + short(x) + ', next week. With a premium. All I am saying is: buy before everybody knows."' + '\n\n' +
        'Compliance note: trading on confidential information about an upcoming takeover is a criminal offence (insider dealing, Art. 161 Swiss Criminal Code). SWX market surveillance looks at unusual buying before every announcement.',
      actions: [['thank', 'Thank him and hang up'], ['warn', 'Remind him that this is insider information']], data: { stock: x.id, client: c.id }
    });
  }
  if (G.handlers) {
    G.handlers.tip = function (m, key) {
      const c = G.client(m.data.client);
      if (key === 'warn') {
        if (c) K.loyal(c, -6);
        return { text: 'He laughs. "You are a careful one." Then he hangs up. You still know what you know.' };
      }
      return { text: 'He hangs up, pleased. What you do with it is up to you.' };
    };
    K.actTime = K.actTime || {};
    K.actTime.tip = { thank: 2, warn: 3 };
  }
  function resolveTip() {
    const s = S(), st = state(), tip = st.tip;
    if (!tip || s.date < tip.at) return;
    st.tip = null;
    const x = T.get(tip.id);
    if (!x || T.status(x) !== 'open') return;
    jump(x, tip.prem);
    news(x, tip.buyer.charAt(0).toUpperCase() + tip.buyer.slice(1) + ' bids for ' + short(x) + '; shares jump ' + Math.round(tip.prem * 100) + '%', true);
    // Käufe zwischen Tipp und Ankündigung
    const buys = st.orders.filter(function (o) { return o.status === 'done' && o.side === 'buy' && o.id === x.id && o.fill.d >= tip.d && o.fill.d < tip.at; });
    st.tips.unshift({ id: x.id, d: tip.d, at: tip.at, traded: buys.length > 0 });
    if (!buys.length) return;
    const chf = buys.reduce(function (t2, o) { return t2 + o.fill.chf; }, 0);
    const gain = chf * tip.prem;
    const bank = buys.some(function (o) { return o.acct === 'bank'; });
    const p = U.clamp(0.35 + (bank ? 0.2 : 0) + Math.min(0.3, chf / 2e6), 0.35, 0.9);
    if (!K.chance(p)) return;
    K.heat('EBK', bank ? 14 : 9, 'Suspicious share purchases before a takeover (SWX surveillance)');
    K.personal(14, 'Insider dealing before a takeover');
    K.msg({
      type: 'letter', kind: 'info', from: 'SWX Swiss Exchange, ' + 'Surveillance Office', subject: 'Request for information: transactions in ' + x.name,
      body: 'Dear Sirs\n\nAhead of the announcement of ' + U.fmtDate(s.date) + ' we observed unusual purchases of ' + x.name + ' settled through your institution (about CHF ' + U.fmt(chf, 0) + ').\n\n' +
        'Please name the persons who gave these orders within 10 days. A copy of this letter goes to the ' + G.authName('EBK') + '.\n\n' + 'Yours faithfully\nSWX Swiss Exchange'
    });
    if (K.chance(0.45)) {
      const fine = Math.round(gain * 1.5 + 50000);
      s.career.wealth = Math.max(0, s.career.wealth - fine);
      K.personal(10, 'Insider dealing: criminal proceedings');
      K.msg({
        type: 'letter', kind: 'info', from: 'Zurich District Attorney', subject: 'Penalty order for insider dealing (Art. 161 StGB)',
        body: 'Based on the report by SWX and the files, ' + s.meta.name + ' is found guilty of insider dealing. The profit is confiscated and a fine is added. Total CHF ' + U.fmt(fine, 0) + ', charged to your private account.'
      });
    }
  }

  /* ---------- Tagesabschluss ---------- */
  T.eod = function (res) {
    const s = S(), st = state();
    const closing = res.closing || s.date;
    let fills = 0, expired = 0;
    // 1. Kurse der zusätzlichen Titel
    D.STOCKS.forEach(function (x) {
      if (!T.listed(x, closing)) {
        if (x.delisted && closing >= x.delisted && st.px[x.id] && x.bust) st.px[x.id] = 0;
        return;
      }
      st.idio[x.id] = Math.exp(Math.log(st.idio[x.id] || 1) * 0.994 + x.vol * 0.6 * K.gauss());
      const fresh = !st.px[x.id];
      st.px[x.id] = K.round(model(x, s.market.SMI, closing, st.idio[x.id]), x.base < 20 ? 3 : 2);
      if (fresh && x.listed === closing) news(x, short(x) + ' starts trading: first price ' + x.ccy + ' ' + U.fmt(st.px[x.id], 2), true);
    });
    // 2. Nachrichten aus der Firmengeschichte und zufällige Firmenereignisse
    T.list().forEach(function (x) {
      (x.news || []).forEach(function (n) { if (n[0] > (st.lastEod || '0') && n[0] <= closing) news(x, n[1], false); });
      if (T.status(x) === 'open' && x.src !== 'coin' && K.chance(0.0035)) corporate(x);
    });
    resolveTip();
    st.hd.push(closing);
    D.STOCKS.forEach(function (x) { (st.h[x.id] = st.h[x.id] || []).push(st.px[x.id] || 0); });
    if (st.hd.length > HIST) { const cut = st.hd.length - HIST; st.hd.splice(0, cut); D.STOCKS.forEach(function (x) { st.h[x.id].splice(0, cut); }); }
    // 3. Offene Aufträge gegen den Schlusskurs
    st.orders.filter(function (o) { return o.status === 'open'; }).reverse().forEach(function (o) {
      const x = T.get(o.id), px = T.px(o.id);
      if (T.status(x) !== 'open' || !px) { o.status = 'expired'; o.why = 'Trading suspended'; expired++; return; }
      let hit = o.type === 'mkt' ? px : null;
      if (o.type === 'lmt') hit = o.side === 'buy' ? (px <= o.lim ? px : null) : (px >= o.lim ? px : null);
      if (o.type === 'stop' && px <= o.lim) hit = px;
      if (hit !== null) { const r = fill(o, hit); if (r.ok) fills++; else { o.status = 'rejected'; o.why = r.msg; } }
      else if (o.valid === 'day') { o.status = 'expired'; expired++; }
    });
    // 4. Handelsbuch zum Schlusskurs bewerten
    let pnl = 0;
    Object.keys(st.bank.pos).forEach(function (id) {
      const p = st.bank.pos[id], now = T.pxCHF(id);
      pnl += p.q * (now - p.mark);
      p.mark = now;
    });
    if (pnl) K.income('trading', pnl);
    // 5. Dividenden und Konkurse
    const y = closing.slice(0, 4), mo = +closing.slice(5, 7);
    T.list().forEach(function (x) {
      const key = x.id + y;
      if (x.div && x.divM === mo && !st.divPaid[key] && T.status(x) === 'open') {
        st.divPaid[key] = 1;
        ['priv', 'bank'].forEach(function (acct) {
          const p = T.book(acct).pos[x.id];
          if (!p) return;
          const gross = p.q * T.pxCHF(x.id) * x.div / 100;
          const wht = acct === 'priv' ? gross * (x.mkt === 'CH' ? 0.35 : 0.15) : 0;
          if (acct === 'priv') s.career.wealth += gross - wht; else K.income('trading', gross);
          T.book(acct).div += gross - wht;
          log({ k: 'div', acct: acct, id: x.id, q: p.q, chf: gross, wht: wht });
        });
      }
      if (x.bust && x.delisted && closing >= x.delisted) {
        ['priv', 'bank'].forEach(function (acct) {
          const p = T.book(acct).pos[x.id];
          if (!p) return;
          T.book(acct).real -= p.cost;
          if (acct === 'bank') K.income('trading', -p.q * p.mark);
          log({ k: 'bust', acct: acct, id: x.id, q: p.q, chf: -p.cost });
          delete T.book(acct).pos[x.id];
        });
      }
    });
    maybeTip();
    st.lastEod = closing;
    if (res.log) res.log.push(['STEP045', t('BOERSE: AUFTRAEGE / HANDELSBUCH', 'EXCHANGE: ORDERS / TRADING BOOK'), fills + t(' AUSGEFUEHRT', ' FILLED') + (expired ? ', ' + expired + t(' VERFALLEN', ' EXPIRED') : '') + (pnl ? '  CHF ' + U.fmt(pnl, 0) : '')]);
    G.save();
  };

  // Am Spielende wird das Privatdepot zum Tageskurs verkauft
  T.liquidate = function () {
    const s = S();
    if (!s || !s.trade) return;
    Object.keys(s.trade.priv.pos).forEach(function (id) { s.career.wealth += s.trade.priv.pos[id].q * T.pxCHF(id); });
    s.trade.priv.pos = {};
  };

  const eod = G.endOfDay;
  G.endOfDay = function () {
    const res = eod.apply(this, arguments);
    try { if (S() && !S().gameOver) T.eod(res || {}); } catch (err) { if (typeof console !== 'undefined') console.error(err); }
    return res;
  };
  const endGame = G.endGame;
  G.endGame = function () { try { T.liquidate(); } catch (err) { /* weiter */ } return endGame.apply(this, arguments); };
})(window.PBS);
