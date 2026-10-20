/* PBS/Web 4.2 – Märkte: Kurse entlang historischer Stützpunkte, Titel, Vermögensverwaltung, Nostro, Zinsen */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }
  const SMI_REF = 4211.4;
  const KEYS = ['SMI', 'USD', 'EUR', 'GBP', 'JPY', 'XAU'];

  const AN = {};
  Object.keys(D.ANCHORS).forEach(function (k) { AN[k] = D.ANCHORS[k].map(function (p) { return [U.toDate(p[0]).getTime(), p[1]]; }); });
  const SPECIAL = {};
  D.INSTR.forEach(function (i) { if (i.special) SPECIAL[i.id] = i.special.map(function (p) { return [U.toDate(p[0]).getTime(), p[1]]; }); });

  function interp(pts, iso, linear) {
    const t = U.toDate(iso).getTime();
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const f = (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        const a = pts[i - 1][1], b = pts[i][1];
        return linear ? a + (b - a) * f : a * Math.pow(b / a, f);
      }
    }
    return pts[pts.length - 1][1];
  }
  K.anchor = function (k, iso) { return interp(AN[k], iso, k === 'LIBOR'); };
  G.instr = function (id) { return D.INSTR.find(function (i) { return i.id === id; }); };

  function instrPrice(i, m, iso) {
    const s = S();
    if (i.cls === 'CHEQ' || i.cls === 'WEQ') {
      return i.base * Math.pow(m.SMI / SMI_REF, i.beta) * (SPECIAL[i.id] ? interp(SPECIAL[i.id], iso) : 1) * (s.idio[i.id] || 1);
    }
    if (i.cls === 'BOND') {
      const y = Math.max(0.05, m.LIBOR + i.spread);
      return U.clamp(100 + (i.coupon - y) * i.dur, 60, 140);
    }
    if (i.id === 'GLD') return m.XAU * m.USD * 32.1507;
    return m[i.id];
  }
  function fxOf(ccy, m) {
    if (ccy === 'CHF') return 1;
    return m[ccy];
  }
  K.priceCHF = function (id) {
    const i = G.instr(id), m = S().market;
    return m[id] * (i.id === 'GLD' ? 1 : fxOf(i.ccy, m));
  };
  G.priceCHF = K.priceCHF;

  // Ein Handelstag: Kurse bewegen sich zufällig, werden aber an die historischen Stützpunkte zurückgezogen
  K.marketStep = function (prevIso, iso, shock) {
    const s = S(), m = s.market;
    shock = shock || {};
    const old = Object.assign({}, m);
    KEYS.forEach(function (k) {
      const a0 = K.anchor(k, prevIso), a1 = K.anchor(k, iso);
      let lm = Math.log(m[k]) + Math.log(a1 / a0) + D.VOL[k] * K.gauss() + (shock[k] || 0);
      lm += 0.04 * (Math.log(a1) - lm);
      m[k] = Math.exp(lm);
    });
    if (iso >= D.EUR_FLOOR[0] && iso <= D.EUR_FLOOR[1]) m.EUR = Math.max(D.EUR_FLOOR[2] + 0.0004, m.EUR);
    const l0 = K.anchor('LIBOR', prevIso), l1 = K.anchor('LIBOR', iso);
    m.LIBOR = m.LIBOR + (l1 - l0) + D.VOL.LIBOR * K.gauss();
    m.LIBOR += 0.06 * (l1 - m.LIBOR);
    D.INSTR.forEach(function (i) {
      if (i.vol) s.idio[i.id] = Math.exp(Math.log(s.idio[i.id] || 1) * 0.994 + i.vol * 0.6 * K.gauss());
    });
    const ret = { CHEQ: 0, WEQ: 0, BOND: 0, GOLD: 0, HEDGE: 0, HOUSE: 0, CASH: Math.max(-0.75, m.LIBOR) / 100 / 250 };
    const n = { CHEQ: 0, WEQ: 0, BOND: 0 };
    D.INSTR.forEach(function (i) {
      if (i.cls === 'HOUSE' || i.cls === 'HEDGE') return;
      const p0 = old[i.id], p1 = instrPrice(i, m, iso);
      m[i.id] = p1;
      if (!p0) return;
      if (i.cls === 'GOLD') { ret.GOLD = p1 / p0 - 1; return; }
      let r = (p1 * fxOf(i.ccy, m)) / (p0 * fxOf(i.ccy, old)) - 1;
      if (i.cls === 'BOND') r += i.coupon / 100 / 250;
      ret[i.cls] += r;
      n[i.cls]++;
    });
    ['CHEQ', 'WEQ', 'BOND'].forEach(function (k) { if (n[k]) ret[k] /= n[k]; });
    const vgf = 0.4 * ret.CHEQ + 0.2 * ret.WEQ + 0.35 * ret.BOND + 0.05 * ret.GOLD - 0.016 / 250;
    m.VGF = m.VGF * (1 + vgf);
    ret.HOUSE = vgf;
    const aar = D.INSTR.find(function (i) { return i.id === 'AAR'; });
    let ar;
    if (iso >= aar.fraud && !s.flags.aarFraud) { ar = -0.96; s.flags.aarFraud = iso; }
    else if (s.flags.aarFraud) ar = 0.0001 * K.gauss();
    else ar = 0.00042 + 0.0008 * K.gauss();
    m.AAR = Math.max(0.5, m.AAR * (1 + ar));
    ret.HEDGE = (1 + ar) * (m.USD / old.USD) - 1;
    // Rundung wie im Kursblatt
    ['USD', 'EUR', 'GBP', 'JPY'].forEach(function (k) { m[k] = K.round(m[k], 4); });
    ['SMI', 'XAU', 'VGF', 'AAR'].forEach(function (k) { m[k] = K.round(m[k], 2); });
    m.LIBOR = K.round(m.LIBOR, 3);
    D.INSTR.forEach(function (i) { if (i.cls !== 'HOUSE' && i.cls !== 'HEDGE') m[i.id] = K.round(m[i.id], 2); });
    s.classRet = ret;
    return ret;
  };

  K.marketInit = function (start) {
    const s = S();
    const w = U.addBusinessDays(start, -90);
    s.market = {};
    KEYS.forEach(function (k) { s.market[k] = K.anchor(k, w); });
    s.market.LIBOR = K.anchor('LIBOR', w);
    s.market.VGF = 100;
    s.market.AAR = 100;
    s.idio = {};
    D.INSTR.forEach(function (i) { if (i.cls !== 'HOUSE' && i.cls !== 'HEDGE') s.market[i.id] = instrPrice(i, s.market, w); });
    s.mhist = [];
    const last = U.addBusinessDays(start, -1);
    let d = w;
    while (d < last) {
      const nd = U.addBusinessDays(d, 1);
      s.prevMarket = Object.assign({}, s.market);
      K.marketStep(d, nd);
      s.mhist.push(Object.assign({ d: nd }, s.market));
      d = nd;
    }
  };

  /* ---------- Vermögensverwaltung ---------- */
  // Wirksame Gewichte einer Strategie inkl. Hausfonds
  K.alloc = function (strat) {
    const s = S();
    const w = Object.assign({}, s.house.alloc[strat]);
    const pref = D.PRODUCT_PREF[s.house.pref];
    let house = 0;
    if (pref.house) ['CHEQ', 'WEQ', 'BOND'].forEach(function (k) { const x = w[k] * pref.house; w[k] -= x; house += x; });
    w.HOUSE = house;
    return w;
  };
  G.alloc = K.alloc;
  K.thirdShare = function (strat) {
    const s = S();
    const a = s.house.alloc[strat];
    return (a.CHEQ + a.WEQ + a.BOND) / 100 * D.PRODUCT_PREF[s.house.pref].third;
  };
  function weightedReturn(w, ret) {
    let r = 0;
    Object.keys(w).forEach(function (k) { r += (w[k] / 100) * (ret[k] || 0); });
    return r;
  }
  G.pmInfo = function () {
    const pms = G.activeStaff('pm');
    const dep = S().accounts.filter(function (a) { return a.type === 'DEP' && !a.closed; }).reduce(function (t, a) { return t + a.bal; }, 0);
    const cap = pms.length * 150e6;
    const skill = pms.length ? pms.reduce(function (t, p) { return t + p.skill; }, 0) / pms.length : 1;
    return { n: pms.length, skill: skill, dep: dep, cap: cap, load: cap ? dep / cap : 9 };
  };

  // Tägliche Bewertung aller Depots; liefert Kommissions- und Fondserträge
  K.revaluePortfolios = function (ret) {
    const s = S();
    const pm = G.pmInfo();
    const capF = pm.load > 1 ? 1 / pm.load : 1;
    const alpha = pm.n ? (pm.skill - 3) * 0.004 / 250 * capF : -0.003 / 250;
    const commRate = D.INTENSITY[s.house.intensity].turnover * 0.005 / 250;
    let comm = 0, fund = 0, retro = 0;
    Object.keys(D.STRATS).forEach(function (st) {
      s.bench[st].idx *= 1 + weightedReturn(D.STRATS[st].bench, ret);
    });
    s.accounts.forEach(function (a) {
      if (a.type !== 'DEP' || a.closed || a.bal <= 0) return;
      const st = a.strat || 'balanced';
      const w = K.alloc(st);
      const third = K.thirdShare(st);
      const r = weightedReturn(w, ret) + alpha - commRate - third * 0.014 / 250 + 0.0012 * K.gauss();
      comm += a.bal * commRate;
      fund += a.bal * (w.HOUSE / 100) * 0.012 / 250;
      if (!s.flags.retroStop) retro += a.bal * third * 0.010 / 250;
      a.bal = K.round(a.bal * (1 + r));
      a.idx = (a.idx || 100) * (1 + r);
    });
    K.income('comm', comm);
    K.income('fund', fund);
    K.income('retro', retro);
    return { comm: comm, fund: fund, retro: retro };
  };

  G.perf = function (acc) {
    const b = S().bench[acc.strat || 'balanced'];
    const own = (acc.idx || 100) / (acc.idxY || 100) - 1;
    const bench = b.idx / b.idxY - 1;
    return { own: own, bench: bench, rel: own - bench };
  };
  G.stratPerf = function (st) {
    const s = S();
    const accs = s.accounts.filter(function (a) { return a.type === 'DEP' && !a.closed && (a.strat || 'balanced') === st; });
    const val = accs.reduce(function (t, a) { return t + a.bal; }, 0);
    const own = val ? accs.reduce(function (t, a) { return t + a.bal * G.perf(a).own; }, 0) / val : 0;
    const b = s.bench[st];
    return { n: accs.length, val: val, own: own, bench: b.idx / b.idxY - 1 };
  };

  // Neue Hausmeinung des Anlageausschusses; Umschichtungen kosten den Kunden 0.25% Courtage
  G.setHouseView = function (view, inMeeting) {
    const s = S();
    let sum = 0;
    const errs = [];
    Object.keys(D.STRATS).forEach(function (st) {
      const a = view.alloc[st];
      const tot = D.CLASS_KEYS.reduce(function (t, k) { return t + (+a[k] || 0); }, 0);
      if (Math.abs(tot - 100) > 0.01) errs.push(D.STRATS[st].label + ': the weights add up to ' + tot + '%, not 100%.');
    });
    if (errs.length) return K.err(errs.join(' '));
    if (!inMeeting) { const t = K.use(45); if (t) return t; }
    const before = {};
    Object.keys(D.STRATS).forEach(function (st) { before[st] = K.alloc(st); });
    Object.keys(D.STRATS).forEach(function (st) {
      s.house.alloc[st] = {};
      D.CLASS_KEYS.forEach(function (k) { s.house.alloc[st][k] = +view.alloc[st][k] || 0; });
    });
    s.house.pref = view.pref || s.house.pref;
    s.house.intensity = view.intensity || s.house.intensity;
    Object.keys(D.STRATS).forEach(function (st) {
      const after = K.alloc(st);
      let turn = 0;
      Object.keys(after).forEach(function (k) { turn += Math.abs((after[k] || 0) - (before[st][k] || 0)); });
      turn = turn / 2 / 100;
      if (turn < 0.001) return;
      s.accounts.forEach(function (a) {
        if (a.type === 'DEP' && !a.closed && (a.strat || 'balanced') === st) {
          const c = a.bal * turn * 0.0025;
          a.bal = K.round(a.bal - c);
          sum += c;
        }
      });
    });
    K.income('comm', sum);
    s.house.changed = s.date;
    G.save();
    return { ok: true, comm: sum };
  };

  G.setStrategy = function (accId, st) {
    const a = G.account(accId);
    if (!a || a.type !== 'DEP' || a.closed) return K.err('Only securities portfolios have a strategy.');
    if (!D.STRATS[st]) return K.err('Unknown strategy.');
    const t = K.use(5);
    if (t) return t;
    const c = a.bal * 0.003;
    a.bal = K.round(a.bal - c);
    K.income('comm', c);
    a.strat = st;
    K.note(G.client(a.client), 'Portfolio ' + a.id + ' switched to strategy "' + D.STRATS[st].label + '".', S().user.id);
    G.save();
    return { ok: true };
  };

  // Abgeleitete Positionen eines Depots (für die Anzeige)
  G.positions = function (acc) {
    const s = S();
    const w = K.alloc(acc.strat || 'balanced');
    const rows = [];
    const byCls = {};
    D.INSTR.forEach(function (i) { (byCls[i.cls] = byCls[i.cls] || []).push(i); });
    Object.keys(w).forEach(function (cls) {
      if (!w[cls]) return;
      const val = acc.bal * w[cls] / 100;
      if (cls === 'CASH') { rows.push({ cls: cls, name: 'Call money CHF', qty: null, price: null, ccy: 'CHF', val: val, w: w[cls] }); return; }
      const list = cls === 'HOUSE' ? [G.instr('VGF')] : cls === 'HEDGE' ? [G.instr('AAR')] : byCls[cls];
      list.forEach(function (i) {
        const v = val / list.length;
        const pc = K.priceCHF(i.id);
        rows.push({ cls: cls, id: i.id, name: i.name, qty: i.cls === 'BOND' ? Math.round(v / pc * 100) : Math.round(v / pc), bond: i.cls === 'BOND', price: s.market[i.id], ccy: i.ccy, val: v, w: w[cls] / list.length });
      });
    });
    return rows;
  };

  /* ---------- Nostro (Eigenhandel) und Zinsen ---------- */
  G.nostroValue = function () {
    const p = S().nostro.pos;
    return Object.keys(p).reduce(function (t, id) { return t + p[id] * K.priceCHF(id); }, 0);
  };
  G.tiedCapital = function () {
    const s = S();
    return Object.keys(s.branches).reduce(function (t, k) { return t + (D.LOCATIONS[k].kind === 'sub' ? D.LOCATIONS[k].setup : 0); }, 0);
  };
  G.loansTotal = function (type) {
    return S().loans.filter(function (l) { return l.status === 'active' && (!type || l.type === type); })
      .reduce(function (t, l) { return t + l.amount * K.rate(l.ccy); }, 0);
  };
  G.capitalInfo = function () {
    const s = S();
    const nv = G.nostroValue();
    const risky = Object.keys(s.nostro.pos).reduce(function (t, id) {
      const c = G.instr(id).cls;
      return t + s.nostro.pos[id] * K.priceCHF(id) * (c === 'BOND' ? 0.2 : c === 'GOLD' ? 0.5 : 1);
    }, 0);
    const req = D.MIN_CAPITAL + 0.08 * risky + 0.04 * G.loansTotal('lombard') + 0.1 * G.loansTotal('b2b');
    const tied = G.tiedCapital();
    const avail = s.bank.capital - tied;
    return { capital: s.bank.capital, nostro: nv, risky: risky, tied: tied, free: s.bank.capital - nv - tied, req: req, avail: avail, ratio: avail / req };
  };

  G.nostroTrade = function (id, amountCHF) {
    const s = S();
    const i = G.instr(id);
    if (!i || i.cls === 'HOUSE') return K.err('Instrument cannot be traded for own account.');
    if (!amountCHF) return K.err('Please enter an amount.');
    const pc = K.priceCHF(id);
    const cur = (s.nostro.pos[id] || 0) * pc;
    if (amountCHF < 0 && -amountCHF > cur + 1) return K.err('Position too small. Current holding: CHF ' + U.fmt(cur, 0) + '.');
    const ci = G.capitalInfo();
    if (amountCHF > 0 && ci.nostro + amountCHF > s.bank.capital * 0.5) return K.err('Treasury limit: own-account positions may not exceed 50% of equity capital.');
    const t = K.use(10);
    if (t) return t;
    s.nostro.pos[id] = (s.nostro.pos[id] || 0) + amountCHF / pc;
    if (Math.abs(s.nostro.pos[id] * pc) < 1) delete s.nostro.pos[id];
    K.expense('losses', Math.abs(amountCHF) * 0.001);
    G.save();
    return { ok: true };
  };

  // Tägliche Zins- und Handelserträge der Bank
  K.dailyInterest = function (oldMarket) {
    const s = S(), m = s.market;
    let pnl = 0;
    Object.keys(s.nostro.pos).forEach(function (id) {
      const i = G.instr(id);
      const fx0 = i.id === 'GLD' ? 1 : (i.ccy === 'CHF' ? 1 : oldMarket[i.ccy]);
      const p0 = oldMarket[id] * fx0;
      let p1 = K.priceCHF(id);
      if (i.cls === 'BOND') p1 += p0 * i.coupon / 100 / 250;
      pnl += s.nostro.pos[id] * (p1 - p0);
    });
    K.income('trading', pnl);
    const ci = G.capitalInfo();
    const lib = m.LIBOR;
    const free = Math.max(0, ci.free);
    K.income('interest', free * lib / 100 / 250);
    // Kundengelder: die Bank legt sie zum Libor an und vergütet Libor − 0.6%
    let cash = 0;
    s.accounts.forEach(function (a) { if (a.type === 'CUR' && !a.closed && a.bal > 0) cash += K.valueCHF(a); });
    const margin = lib >= 0 ? Math.min(lib, 0.6) : (s.flags.passNeg ? 0 : lib * 0.5);
    const nii = cash * margin / 100 / 250;
    K.income('interest', nii);
    // Kredite
    let loanInt = 0, guar = 0;
    s.loans.forEach(function (l) {
      if (l.status !== 'active') return;
      const chf = l.amount * K.rate(l.ccy);
      if (l.type === 'lombard') { const x = chf * (Math.max(lib, 0) + 1.75) / 100 / 250; loanInt += x; l.accrued += x; }
      else { const x = chf * 0.0125 / 250; guar += x; l.accrued += x; }
    });
    K.income('interest', loanInt);
    K.income('comm', guar);
    return { pnl: pnl, nii: nii, loanInt: loanInt, guar: guar, cash: cash };
  };
})(window.PBS);
