/* PBS/Web 4.2 – Kernbankensystem: Buchhaltung, Transaktionsüberwachung, Tagesabschluss
   Game rules live here; views never change state directly. */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U;
  const SAVE_KEY = 'pbs-vogt-save-v1';
  const FOREIGN = ['US', 'DE', 'IT', 'FR', 'GB'];
  const EU = ['DE', 'IT', 'FR', 'NL', 'AT', 'GR', 'SE'];
  const Game = PBS.Game = { state: null, FOREIGN: FOREIGN };
  let s = null;

  /* ---------- Zufall (seeded, Teil des Spielstands) ---------- */
  function rnd() {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rint(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function chance(p) { return rnd() < p; }
  function between(a, b) { return a + rnd() * (b - a); }
  function gauss() {
    let u = 0;
    while (u === 0) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  }
  function weighted(items, wf) {
    const ws = items.map(wf);
    const tot = ws.reduce(function (a, b) { return a + b; }, 0);
    if (tot <= 0) return null;
    let r = rnd() * tot;
    for (let i = 0; i < items.length; i++) {
      r -= ws[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /* ---------- Hilfsfunktionen ---------- */
  function round(n, dec) {
    const f = Math.pow(10, dec === undefined ? 2 : dec);
    return Math.round(n * f) / f;
  }
  function roundTo(n, step) { return Math.max(step, Math.round(n / step) * step); }
  function tick(min) { s.clock = Math.min(s.clock + min, 23 * 60 + 59); }
  function cname(c) { return D.COUNTRIES[c] ? D.COUNTRIES[c].n : c; }
  function homeAuth(c) { return D.COUNTRIES[c.dom] && D.COUNTRIES[c.dom].auth; }
  function err(msg) { return { ok: false, msg: msg }; }

  function rate(ccy) {
    const m = s.market;
    if (ccy === 'CHF') return 1;
    if (ccy === 'JPY') return m.JPY / 100;
    if (ccy === 'XAU') return m.XAU * m.USD;
    return m[ccy];
  }
  function valueCHF(acc) { return acc.bal * rate(acc.ccy); }

  Game.rate = function (c) { return rate(c); };
  Game.valueCHF = valueCHF;
  Game.cname = cname;
  Game.client = function (id) { return s.clients.find(function (c) { return c.id === id; }); };
  Game.account = function (id) { return s.accounts.find(function (a) { return a.id === id; }); };
  Game.entity = function (id) { return s.entities.find(function (e) { return e.id === id; }); };
  Game.clientAccounts = function (id) { return s.accounts.filter(function (a) { return a.client === id && !a.closed; }); };
  Game.clientAUM = function (id) {
    return Game.clientAccounts(id).reduce(function (t, a) { return t + valueCHF(a); }, 0);
  };
  Game.activeClients = function () { return s.clients.filter(function (c) { return c.status === 'active'; }); };
  Game.totalAUM = function () {
    return Game.activeClients().reduce(function (t, c) { return t + Game.clientAUM(c.id); }, 0);
  };
  Game.entityAUM = function (eid) {
    return s.accounts.filter(function (a) { return a.entity === eid && !a.closed; })
      .reduce(function (t, a) { return t + valueCHF(a); }, 0);
  };
  Game.holderName = function (acc) {
    if (acc.entity) { const e = Game.entity(acc.entity); if (e) return e.name; }
    const c = Game.client(acc.client);
    return c ? c.name : '';
  };
  Game.entitiesOf = function (cid) { return s.entities.filter(function (e) { return e.bo === cid && !e.dissolved; }); };
  Game.pendingPayments = function () { return s.payments.filter(function (p) { return p.status === 'pending'; }); };
  Game.openAlerts = function () { return s.alerts.filter(function (a) { return a.status === 'open'; }); };
  Game.overdueAlerts = function () { return s.alerts.filter(function (a) { return a.status === 'open' && a.due < s.date; }); };
  Game.unread = function () { return s.messages.filter(function (m) { return !m.read; }).length; };
  Game.actionRequired = function () { return s.messages.filter(function (m) { return m.actions.length && !m.resolved; }); };
  Game.level = function (v) {
    if (v < 25) return { label: 'Low', cls: 'ok' };
    if (v < 50) return { label: 'Moderate', cls: 'mod' };
    if (v < 75) return { label: 'High', cls: 'warn' };
    return { label: 'Critical', cls: 'bad' };
  };
  Game.loyaltyLabel = function (v) {
    if (v >= 75) return { label: 'Very satisfied', cls: 'ok' };
    if (v >= 55) return { label: 'Satisfied', cls: 'ok' };
    if (v >= 35) return { label: 'Unsettled', cls: 'warn' };
    return { label: 'About to leave', cls: 'bad' };
  };
  // Fixkosten plus volumenabhängiger Aufwand (mehr Kunden, mehr Personal)
  Game.opexDaily = function () { return D.OPEX_BASE + Game.totalAUM() * D.OPEX_AUM / 250; };
  Game.wireFee = function (chf, charges) {
    let f = Math.min(750, Math.max(40, 40 + chf * 0.0005));
    if (charges === 'OUR') f += 25;
    return round(f);
  };

  /* ---------- Buchungen, Erträge, Exposure ---------- */
  function book(acc, amt, text, o) {
    o = o || {};
    const dec = acc.ccy === 'XAU' ? 3 : 2;
    amt = round(amt, dec);
    acc.bal = round(acc.bal + amt, dec);
    const tx = {
      id: 'T' + (++s.ctr.tx), d: o.date || s.date, val: o.valuta || o.date || s.date, t: o.time || s.clock,
      acc: acc.id, client: acc.client, amt: amt, ccy: acc.ccy, bal: acc.bal, text: text, kind: o.kind || 'misc',
      cp: o.cp || '', c: o.country || '', ref: o.ref || '', chf: round(amt * rate(acc.ccy)), ext: !!o.ext
    };
    s.tx.push(tx);
    if (tx.ext && !o.date) { s.nnm.month += tx.chf; s.nnm.ytd += tx.chf; }
    return tx;
  }
  function income(kind, chf) { s.bank.ytd[kind] = (s.bank.ytd[kind] || 0) + chf; s.bank.capital += chf; }
  function expense(kind, chf) { s.bank.ytd[kind] = (s.bank.ytd[kind] || 0) + chf; s.bank.capital -= chf; }

  function heat(k, v, reason) {
    if (!v) return;
    const before = s.heat[k];
    s.heat[k] = U.clamp(s.heat[k] + v, 0, 100);
    const real = s.heat[k] - before;
    if (Math.abs(real) < 0.0005) return;
    const last = s.heatLog.find(function (h) { return h.d === s.date && h.k === k && h.r === reason; });
    if (last) last.v += real;
    else {
      s.heatLog.unshift({ d: s.date, k: k, v: real, r: reason });
      if (s.heatLog.length > 90) s.heatLog.pop();
    }
  }
  function discretion(v) { s.discretion = U.clamp(s.discretion + v, 0, 100); }
  function loyal(c, v) { c.loyalty = U.clamp(c.loyalty + v, 0, 100); }
  function note(c, text, who) { c.notes.unshift({ d: s.date, who: who || c.rm, text: text }); }

  // Geschätzte Aufmerksamkeit ausländischer Behörden durch eine Zahlung
  function exposure(client, acc, country, chf, o) {
    o = o || {};
    const res = [];
    const undecl = 1 - (client.declared || 0);
    if (undecl <= 0 || !country) return res;
    let base = Math.min(14, 0.5 + chf / 1e6 * 2.6) * undecl;
    if (acc && acc.entity) {
      const e = Game.entity(acc.entity);
      if (e) base *= D.JURIS[e.jur].shield;
    }
    if (o.hidden) base *= 0.5;
    if (o.incoming) base *= o.incoming;
    const cauth = D.COUNTRIES[country] && D.COUNTRIES[country].auth;
    const home = homeAuth(client);
    if (home && client.dom === country) res.push([home, base]);
    else if (cauth) res.push([cauth, base * 0.12]);
    if (o.ccy === 'USD' && home === 'US' && country !== 'US') res.push(['US', base * 0.15]);
    return res.filter(function (r) { return r[1] >= 0.01; }).map(function (r) { return [r[0], round(r[1], 2)]; });
  }
  Game.exposureLabel = function (v) {
    if (v < 1) return 'low';
    if (v < 4) return 'moderate';
    if (v < 8) return 'high';
    return 'severe';
  };

  /* ---------- Transaktionsüberwachung ---------- */
  function rulesFor(client, chf, o) {
    o = o || {};
    const hits = [];
    const a = Math.abs(chf);
    const since = U.addBusinessDays(s.date, -10);
    if (o.cash && a >= 25000) hits.push('TM-01');
    if (a >= 1e6) hits.push('TM-02');
    if (o.cash && a >= 10000 && a < 25000) {
      const n = s.tx.filter(function (t) {
        return t.client === client.id && t.d >= since && (t.kind === 'cash-in' || t.kind === 'cash-out') &&
          Math.abs(t.chf) >= 10000 && Math.abs(t.chf) < 25000;
      }).length;
      if (n >= 2) hits.push('TM-03');
    }
    if (!o.cash && o.out && o.cp && a >= 100000 && a < 1e6) {
      const prior = s.payments.filter(function (p) {
        return p.status === 'released' && p.client === client.id && p.released >= since && (p.benefAcct || p.benefName) === o.cp;
      });
      const sum = prior.reduce(function (t, p) { return t + p.chf; }, 0);
      if (prior.length >= 2 && sum + a >= 1e6) hits.push('TM-03');
    }
    if (o.country && D.COUNTRIES[o.country] && D.COUNTRIES[o.country].ncct) hits.push('TM-04');
    if (!client.formA && a >= 25000) hits.push('TM-05');
    if (o.out && a >= 100000) {
      const inflow = s.tx.filter(function (t) {
        return t.client === client.id && t.d >= since && t.ext && t.amt > 0;
      }).reduce(function (t, x) { return t + x.chf; }, 0);
      if (inflow >= 0.8 * a) hits.push('TM-06');
    }
    if (client.risk === 'PEP' && a >= 100000) hits.push('TM-07');
    if (o.hidden && s.date >= '2003-07-01') hits.push('TM-08');
    if (a > 0.3 * client.wealth && !o.funding) hits.push('TM-09');
    return hits;
  }
  function raise(hits, client, tx, desc) {
    if (!hits.length) return null;
    const a = {
      id: 'AL-' + U.pad(++s.ctr.alert, 4), d: s.date, t: s.clock, due: U.addBusinessDays(s.date, 10),
      rules: hits, client: client.id, acc: tx ? tx.acc : '', tx: tx ? tx.id : '', chf: tx ? Math.abs(tx.chf) : 0,
      desc: desc, status: 'open', weak: false, res: null
    };
    s.alerts.unshift(a);
    return a;
  }

  /* ---------- Meldungen & Termine ---------- */
  function msg(o) {
    const m = Object.assign({
      id: 'M' + U.pad(++s.ctr.msg, 4), d: s.date, t: s.clock, type: 'memo', kind: 'info', from: '', to: 'E-Mail Managing Partner',
      subject: '', body: '', read: false, actions: [], resolved: null, data: {}
    }, o);
    s.messages.unshift(m);
    return m;
  }
  function schedule(days, type, data) {
    s.sched.push({ d: U.addBusinessDays(s.date, days), type: type, data: data || {} });
  }

  /* ---------- Konten ---------- */
  function openAccount(c, ccy, type, entityId) {
    const seq = s.accounts.filter(function (a) { return a.client === c.id; }).length + 1;
    const acc = {
      id: c.id + '.' + U.pad(seq, 2), client: c.id, entity: entityId || null, type: type,
      ccy: type === 'MET' ? 'XAU' : ccy, bal: 0, opened: s.date, closed: false
    };
    s.accounts.push(acc);
    return acc;
  }
  function ensureAccount(c, ccy, entityId) {
    const found = Game.clientAccounts(c.id).find(function (a) {
      return a.type === 'CUR' && a.ccy === ccy && (a.entity || null) === (entityId || null);
    });
    return found || openAccount(c, ccy, 'CUR', entityId);
  }
  // Konto für Gebührenbelastungen: CHF-Kontokorrent, sonst grösstes Kontokorrent, sonst Depot
  function feeAccount(c) {
    const accs = Game.clientAccounts(c.id);
    const cur = accs.filter(function (a) { return a.type === 'CUR'; }).sort(function (a, b) { return valueCHF(b) - valueCHF(a); });
    return cur.find(function (a) { return a.ccy === 'CHF' && !a.entity && a.bal > 0; }) || cur[0] ||
      accs.find(function (a) { return a.type === 'DEP'; }) || accs[0];
  }
  function charge(c, chf, text) {
    const acc = feeAccount(c);
    if (!acc) return null;
    return book(acc, -chf / rate(acc.ccy), text, { kind: 'fee' });
  }

  function terminate(c, mode, extra) {
    const texts = {
      leave: 'Closing transfer to ' + (extra || 'other bank') + ' – client instruction',
      seized: 'Blocked – transfer per order of the Federal Office of Justice',
      mros: 'Blocked – report to MROS (Art. 9 GwG)',
      offboard: 'Closing transfer – relationship terminated by the bank',
      unfunded: ''
    };
    Game.clientAccounts(c.id).forEach(function (a) {
      if (Math.abs(a.bal) > 0.0005) book(a, -a.bal, texts[mode], { kind: 'close', ext: true });
      a.closed = true;
    });
    c.status = 'closed';
    c.closed = { d: s.date, mode: mode };
    s.payments.forEach(function (p) {
      if (p.client === c.id && p.status === 'pending') p.status = 'cancelled';
    });
    s.counter = s.counter.filter(function (k) { return k.client !== c.id; });
    s.alerts.forEach(function (a) {
      if (a.client === c.id && a.status === 'open') {
        a.status = mode === 'mros' ? 'reported' : 'closed';
        a.res = { just: 'terminated', comment: 'Relationship terminated', d: s.date, t: s.clock, by: s.user.id };
      }
    });
    s.entities.forEach(function (e) { if (e.bo === c.id) e.dissolved = s.date; });
    note(c, 'Relationship closed (' + mode + ').', s.user.id);
  }

  /* ---------- Neues Spiel ---------- */
  Game.newGame = function (userId) {
    s = Game.state = {
      v: 1, seed: 20030303, user: { id: userId || 'E10001', last: { d: '2003-02-28', t: 17 * 60 + 42, ws: 'ZH-BS64-0217' } },
      date: D.START_DATE, clock: 8 * 60 + 4, dayNo: 1,
      market: Object.assign({}, D.MARKET), prevMarket: Object.assign({}, D.MARKET), mhist: [],
      bank: { capital: 42e6, ytd: { fees: 0, comm: 0, fx: 0, other: 0, opex: 0, travel: 0, legal: 0 } },
      annual: [], discretion: 70,
      heat: Object.assign({}, D.HEAT_START), heatLog: [], heatHist: [],
      clients: [], accounts: [], entities: [], tx: [], payments: [], alerts: [], messages: [], counter: [],
      sched: [], audits: [], news: [], hist: [],
      ctr: { tx: 10000, pay: 0, alert: 0, msg: 0, visit: 0, ent: 5, stamm: 101026 },
      nnm: { month: 0, ytd: 0 }, trip: null, flags: {}, pendingShock: null, gameOver: null, usedWords: []
    };

    D.ENTITIES.forEach(function (e) { s.entities.push(Object.assign({}, e)); });
    D.CLIENTS.forEach(function (src) {
      const c = {
        id: src.id, rubrik: src.rubrik, name: src.name, type: 'Individual', nat: src.nat, dom: src.dom, city: src.city,
        born: src.born, occ: src.occ, sow: src.sow, wealth: src.wealth, declared: src.declared, risk: src.risk,
        formA: src.formA, holdMail: src.holdMail, since: src.since, rm: src.rm, fee: src.fee, loyalty: src.loyalty,
        status: 'active', funded: true, feeAccrued: 0, formAPending: false,
        notes: src.notes.map(function (n) { return { d: n[0], who: n[1], text: n[2] }; })
      };
      s.clients.push(c);
      s.usedWords.push(c.rubrik);
      src.accounts.forEach(function (a, i) {
        let opened = a[3] ? Game.entity(a[3]).inc : c.since;
        if (a[1] === 'EUR' && opened < '1999-01-04') opened = '1999-01-04';
        s.accounts.push({ id: c.id + '.' + U.pad(i + 1, 2), client: c.id, entity: a[3] || null, type: a[0], ccy: a[1], bal: a[2], opened: opened, closed: false });
      });
    });

    seedHistory();
    seedOpening();
    s.seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0;
    save();
    return s;
  };

  // Kurs- und AuM-Historie der letzten 60 Bankwerktage (rückwärts gerechnet)
  function seedHistory() {
    const VOL = { USD: 0.0065, EUR: 0.0025, GBP: 0.005, JPY: 0.007, XAU: 0.011, SMI: 0.014 };
    let m = Object.assign({}, D.MARKET);
    let d = U.addBusinessDays(D.START_DATE, -1);
    const mh = [];
    for (let i = 0; i < 60; i++) {
      mh.unshift(Object.assign({ d: d }, m));
      const nm = {};
      Object.keys(VOL).forEach(function (k) { nm[k] = round(m[k] / (1 + VOL[k] * gauss() + (k === 'SMI' ? 0.0012 : 0)), k === 'SMI' || k === 'XAU' ? 2 : 4); });
      m = nm;
      d = U.addBusinessDays(d, -1);
    }
    s.mhist = mh;
    s.prevMarket = Object.assign({}, mh[mh.length - 1]);
    delete s.prevMarket.d;
    // Vortag liegt leicht unter/über heutigem Kurs
    Object.keys(VOL).forEach(function (k) { s.prevMarket[k] = round(D.MARKET[k] / (1 + VOL[k] * gauss()), k === 'SMI' || k === 'XAU' ? 2 : 4); });

    const aum = Game.totalAUM();
    let v = aum * 0.998;
    const hist = [];
    for (let i = mh.length - 1; i >= 0; i--) {
      hist.unshift({ d: mh[i].d, aum: round(v) });
      v = v / (1 + 0.0035 * gauss() + 0.0009);
    }
    s.hist = hist;
    const hh = [];
    for (let i = 10; i >= 1; i--) {
      const o = { d: U.addBusinessDays(D.START_DATE, -i) };
      Object.keys(s.heat).forEach(function (k) { o[k] = round(Math.max(0, s.heat[k] - i * 0.25 + gauss() * 0.6), 2); });
      hh.push(o);
    }
    s.heatHist = hh;
    s.news = [
      { d: '2003-02-28', text: 'Iraq crisis: investors seek safety in franc and gold' },
      { d: '2003-02-28', text: 'SMI closes February at lowest level since 1997' },
      { d: '2003-03-03', text: 'EU and Switzerland resume talks on taxation of savings' },
      { d: '2003-03-03', text: 'Swiss Bankers Association reaffirms commitment to client confidentiality' }
    ];
  }

  // Eröffnungssalden, Bewegungen Januar/Februar, Startmeldungen
  function seedOpening() {
    const special = {
      '101.004.01': [['2003-02-24', 48000, 'Cash deposit EUR banknotes', 'cash-in', '', '']],
      '100.802.01': [['2003-02-27', 2400000, 'Incoming payment / Banco Orinoco C.A., Caracas', 'wire-in', 'BANCO ORINOCO C.A.', 'VE']],
      '100.517.02': [['2003-01-20', 150000, 'Cash deposit EUR banknotes (courier)', 'cash-in', '', '']],
      '100.482.02': [['2003-02-12', -42000, 'Payment / Autohaus Reinhardt GmbH, Stuttgart', 'wire-out', 'AUTOHAUS REINHARDT GMBH', 'DE']]
    };
    const firstCur = {};
    s.accounts.forEach(function (a) {
      if (a.type === 'CUR' && !a.entity && !firstCur[a.client]) firstCur[a.client] = a.id;
    });
    s.accounts.forEach(function (acc) {
      const c = Game.client(acc.client);
      const moves = (special[acc.id] || []).slice();
      if (acc.type === 'CUR') {
        if (firstCur[c.id] === acc.id) {
          const q = Game.clientAUM(c.id) * c.fee / 4;
          moves.push(['2003-01-03', -round(q / rate(acc.ccy)), 'Management fee Q4/2002', 'fee', '', '']);
        }
        const nMoves = special[acc.id] ? 0 : rint(0, 2);
        for (let i = 0; i < nMoves; i++) {
          const day = U.addBusinessDays('2003-01-06', rint(0, 38));
          const amt = roundTo(acc.bal * between(0.01, 0.05), 1000);
          if (chance(0.55)) {
            const b = pick(D.BANKS.filter(function (x) { return x.c === c.dom; }).concat(D.HAVEN_BANKS.map(D.bankByBic)));
            moves.push([day, amt, 'Incoming payment / ' + b.name + ', ' + b.city, 'wire-in', b.name.toUpperCase(), b.c]);
          } else {
            moves.push([day, -amt, 'Payment order / ' + pick(['Hotel Baur au Lac, Zürich', 'Galerie Koller, Zürich', 'Montres Gübelin', 'Rheintaler Privatbank AG, Vaduz', 'Sotheby\'s, London']), 'wire-out', '', '']);
          }
        }
      }
      if (acc.type === 'DEP') moves.push(['2003-01-31', round(acc.bal * 0.0042), 'Coupon and dividend income January', 'sec', '', '']);
      moves.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
      const net = moves.reduce(function (t, m) { return t + m[1]; }, 0);
      const target = acc.bal;
      acc.bal = round(target - net, acc.ccy === 'XAU' ? 3 : 2);
      s.tx.push({ id: 'T' + (++s.ctr.tx), d: '2002-12-31', val: '2002-12-31', t: 18 * 60, acc: acc.id, client: acc.client, amt: acc.bal, ccy: acc.ccy, bal: acc.bal, text: 'Balance carried forward', kind: 'open', cp: '', c: '', ref: '', chf: round(acc.bal * rate(acc.ccy)), ext: false });
      moves.forEach(function (m) {
        book(acc, m[1], m[2], { date: m[0], time: rint(8 * 60 + 30, 16 * 60 + 50), kind: m[3], cp: m[4], country: m[5], ext: m[3] !== 'fee' && m[3] !== 'sec' });
      });
      acc.bal = target;
    });
    s.tx.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : a.t - b.t; });

    const txOf = function (accId, d) { return s.tx.find(function (t) { return t.acc === accId && t.d === d && t.kind !== 'open'; }); };
    const spadaro = Game.client('100.517'), rosa = Game.client('101.004'), carlos = Game.client('100.802');
    let a1 = { id: 'AL-0001', d: '2003-01-20', t: 10 * 60 + 12, due: '2003-02-03', rules: ['TM-01'], client: spadaro.id, acc: '100.517.02', tx: txOf('100.517.02', '2003-01-20').id, chf: 219960, desc: 'Cash deposit EUR 150,000.00 at counter (courier)', status: 'closed', weak: false, res: { just: 'income', comment: 'Seasonal business income, consistent with profile. Courier known to the bank.', d: '2003-01-22', t: 14 * 60 + 5, by: 'C. Moretti' } };
    let a2 = { id: 'AL-0002', d: '2003-02-24', t: 11 * 60 + 40, due: '2003-03-10', rules: ['TM-01', 'TM-05'], client: rosa.id, acc: '101.004.01', tx: txOf('101.004.01', '2003-02-24').id, chf: 70387, desc: 'Cash deposit EUR 48,000.00 at counter', status: 'open', weak: false, res: null };
    let a3 = { id: 'AL-0003', d: '2003-02-27', t: 15 * 60 + 2, due: '2003-03-13', rules: ['TM-02', 'TM-07'], client: carlos.id, acc: '100.802.01', tx: txOf('100.802.01', '2003-02-27').id, chf: 3297840, desc: 'Incoming payment USD 2,400,000.00 from Banco Orinoco C.A., Caracas (VE)', status: 'open', weak: false, res: null };
    s.alerts = [a3, a2, a1];
    s.ctr.alert = 3;

    s.clock = 7 * 60 + 50;
    s.date = '2003-02-28';
    msg({
      t: 17 * 60 + 5, type: 'memo', from: 'Dr. A. Vogt, Senior Partner', subject: 'Handover – welcome to the management of the bank', read: false,
      body: 'Dear colleague,\n\nAs agreed by the partners, you take over operational management of the bank as of Monday, 3 March 2003. I will remain available as Senior Partner, but the day-to-day decisions are now yours.\n\nOur house rests on three pillars: discretion, discretion and discretion. We manage roughly CHF 280 million for 14 relationships – most of them from neighbouring countries, most of them, let us say, not overly burdened by their home tax authorities.\n\nRemember the legal position: tax evasion by a foreign client is not a criminal offence in Switzerland; tax fraud is. Banking secrecy (Art. 47 BankG) protects our clients – but foreign authorities see things differently, and the EBK in Berne watches whether we observe our due-diligence duties.\n\nPractical notes:\n• Payments into a client\'s home country leave a paper trail. Domiciliary companies (Liechtenstein, BVI, Panama) and hold mail (banklagernd) reduce the trail.\n• Clear transaction-monitoring alerts on time, and document them properly – the auditors will check.\n• Keep an eye on the Risk Monitor in the Compliance module.\n• Run the end-of-day batch (Tagesabschluss) when the day\'s work is done.\n\nThe partners expect growth in assets and profits – without headlines.\n\nWith kind regards,\nDr. A. Vogt'
    });
    s.date = D.START_DATE;
    msg({
      type: 'memo', from: 'Dr. I. Wyss, Legal & Compliance', subject: 'Open alerts and upcoming regulatory changes', t: 7 * 60 + 52,
      body: 'Good morning,\n\nTwo transaction-monitoring alerts are open:\n• AL-0002 – PICCOLO (cash deposit, Form A still missing)\n• AL-0003 – ORCHIDEE (USD 2.4 million from Caracas – PEP relationship)\n\nPlease clear them before the due date. Overdue alerts are noted by the EBK.\n\nReminder: the new EBK Anti-Money-Laundering Ordinance enters into force on 1 July 2003 (stricter PEP rules, originator information in payment orders).\n\nI. Wyss'
    });

    // Fax-Auftrag Brenner
    const benefIban = U.iban('DE', '20130600' + '0418822711');
    const p = newPayment({
      debit: '100.482.02', ccy: 'EUR', amount: 380000, valuta: U.addBusinessDays(D.START_DATE, 1),
      benefName: 'Notariat Dr. Feddersen, Westerland (Treuhandkonto)', benefAcct: benefIban, benefAddr: 'Strandstrasse 12, D-25980 Westerland/Sylt',
      country: 'DE', bic: 'ALHBDEHH', purpose: 'Kaufpreisanzahlung Ferienwohnung', charges: 'OUR', hideOrig: false, t: 8 * 60 + 12
    }, 'client');
    msg({
      type: 'fax', kind: 'order', from: 'EDELWEISS (fax +49 711 ...)', t: 8 * 60 + 12, subject: 'Payment order EUR 380,000 – EDELWEISS',
      body: 'TO: BANKHAUS VOGT & CIE, ZUERICH – ATTN. HERRN U. KELLER\nRE: NUMBERED ACCOUNT EDELWEISS\n\nPlease transfer EUR 380,000.00 debiting my EUR account to:\n\nBeneficiary: Notariat Dr. Feddersen, Westerland (Treuhandkonto)\nBank: Alster Handelsbank AG, Hamburg (ALHBDEHH)\nAccount: ' + U.ibanFmt(benefIban) + '\nPurpose: Kaufpreisanzahlung Ferienwohnung\nCharges: OUR\n\nValue date tomorrow, please.\n\nMit freundlichen Grüssen\n[signature]  EDELWEISS',
      data: { payment: p.id, client: '100.482' }
    });
    const pr = genProspect('IT');
    pr.name = 'Ing. Marco Galbiati'; pr.city = 'Brescia'; pr.occ = 'Steel stockholder (own company)'; pr.wealth = 13e6;
    pr.amount = 9000000; pr.method = 'cash'; pr.intro = 'Fiduciaria Monte Brè SA, Lugano'; pr.refuseA = false; pr.fee = 0.0135;
    prospectMessage(pr, 8 * 60 + 30);
    s.counter.push({ id: 'K' + U.pad(++s.ctr.visit, 3), client: '100.517', type: 'in', ccy: 'EUR', amount: 180000, courier: true, t: 8 * 60 + 40, note: 'Courier (Sig. B.) on behalf of the client, Monday delivery via Chiasso', funding: false });
    s.messages.forEach(function (m) { m.read = false; });
    s.clock = 8 * 60 + 4;
  }

  /* ---------- Speichern / Laden ---------- */
  function trim(txMax, msgMax, doneMax) {
    if (s.tx.length > txMax) s.tx.splice(0, s.tx.length - txMax);
    if (s.messages.length > msgMax) s.messages = s.messages.filter(function (m, i) { return i < msgMax || (m.actions.length && !m.resolved); });
    const keep = function (list, isOpen) {
      let n = 0;
      return list.filter(function (x) { return isOpen(x) || ++n <= doneMax; });
    };
    s.alerts = keep(s.alerts, function (a) { return a.status === 'open' || (a.weak && !a.audited); });
    s.payments = keep(s.payments, function (p) { return p.status === 'pending'; });
    s.heatLog.length = Math.min(s.heatLog.length, 60);
  }
  function save() {
    trim(5000, 250, 300);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch (e) {
      // Speicher voll: Historie stärker kürzen und erneut versuchen
      trim(1500, 80, 80);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e2) { /* Speicher nicht verfügbar */ }
    }
  }
  Game.save = save;
  Game.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const st = JSON.parse(raw);
      if (!st || st.v !== 1) return null;
      s = Game.state = st;
      return st;
    } catch (e) { return null; }
  };
  Game.hasSave = function () {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  };
  Game.reset = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorieren */ }
    s = Game.state = null;
  };
  Game.login = function (userId) {
    s.user.id = userId;
    save();
  };

  /* ---------- Zahlungsverkehr ---------- */
  function newPayment(o, source) {
    const n = ++s.ctr.pay;
    const p = Object.assign({
      id: 'P' + U.pad(n, 4), ref: 'VC' + U.swiftDate(s.date) + U.pad(n, 4), d: s.date, t: s.clock, source: source || 'manual',
      status: 'pending', charges: 'SHA', hideOrig: false, valuta: s.date, purpose: '', benefAddr: '', benefAcct: ''
    }, o);
    p.amount = +p.amount;
    const acc = Game.account(p.debit);
    p.client = acc ? acc.client : null;
    p.chf = round(p.amount * rate(p.ccy));
    s.payments.unshift(p);
    return p;
  }

  Game.precheck = function (p) {
    const errors = [];
    const acc = Game.account(p.debit);
    const amount = +p.amount;
    if (!acc) errors.push('Debit account (Belastungskonto) is missing.');
    if (!(amount > 0)) errors.push('Field 32A: amount must be greater than zero.');
    if (!p.benefName) errors.push('Field 59: beneficiary name is missing.');
    if (!p.bic || String(p.bic).length < 8) errors.push('Field 57A: BIC of beneficiary institution is missing or incomplete.');
    if (!p.country || !D.COUNTRIES[p.country]) errors.push('Beneficiary country is missing.');
    if (D.CCY.indexOf(p.ccy) < 0) errors.push('Field 32A: invalid currency.');
    if (errors.length) return { errors: errors, hits: [], notes: [] };
    const client = Game.client(acc.client);
    if (acc.type !== 'CUR') errors.push('Payments can only be debited to a current account (Kontokorrent).');
    if (client.status !== 'active' || acc.closed) errors.push('Relationship is blocked or closed.');
    const chf = amount * rate(p.ccy);
    const debitAmt = p.ccy === acc.ccy ? amount : chf * (1 + D.FX_SPREAD) / rate(acc.ccy);
    const fee = Game.wireFee(chf, p.charges);
    const feeAcc = fee / rate(acc.ccy);
    if (acc.bal + 0.005 < debitAmt + feeAcc) {
      errors.push('Insufficient funds on ' + acc.id + ': available ' + acc.ccy + ' ' + U.fmt(acc.bal) + ', required ' + acc.ccy + ' ' + U.fmt(debitAmt + feeAcc) + '.');
    }
    const hits = rulesFor(client, chf, { out: true, country: p.country, hidden: p.hideOrig, cp: p.benefAcct || p.benefName });
    const notes = exposure(client, acc, p.country, chf, { hidden: p.hideOrig, ccy: p.ccy });
    return { errors: errors, hits: hits, notes: notes, chf: chf, debitAmt: debitAmt, fee: fee, feeAcc: feeAcc, acc: acc, client: client };
  };

  Game.submitPayment = function (o) {
    const chk = Game.precheck(o);
    if (chk.errors.length) return { ok: false, msg: chk.errors.join(' ') };
    const p = newPayment(o, 'manual');
    tick(6);
    save();
    return { ok: true, p: p };
  };

  Game.updatePayment = function (id, ch) {
    const p = s.payments.find(function (x) { return x.id === id; });
    if (!p || p.status !== 'pending') return err('Payment is no longer pending.');
    const acc = Game.account(ch.debit);
    if (!acc || acc.client !== p.client || acc.type !== 'CUR') return err('Debit account must be a current account of the same relationship.');
    p.debit = acc.id;
    p.hideOrig = !!ch.hideOrig;
    p.charges = ch.charges || p.charges;
    tick(3);
    save();
    return { ok: true };
  };

  Game.releasePayment = function (id) {
    const p = s.payments.find(function (x) { return x.id === id; });
    if (!p || p.status !== 'pending') return err('Payment is no longer pending.');
    const chk = Game.precheck(p);
    if (chk.errors.length) return err(chk.errors.join(' '));
    const acc = chk.acc, client = chk.client;
    const bank = D.bankByBic(p.bic);
    if (p.ccy !== acc.ccy) income('fx', chk.chf * D.FX_SPREAD);
    const tx = book(acc, -chk.debitAmt, 'Payment ' + p.ccy + ' ' + U.fmt(p.amount) + ' / ' + p.benefName,
      { kind: 'wire-out', cp: p.benefName + (bank ? ', ' + bank.name : ''), country: p.country, ref: p.ref, ext: true, valuta: p.valuta });
    book(acc, -chk.feeAcc, 'Commission payment order ' + p.ref, { kind: 'fee', ref: p.ref });
    income('comm', chk.fee);
    const al = raise(chk.hits, client, tx, 'Outgoing payment ' + p.ccy + ' ' + U.fmt(p.amount) + ' to ' + p.benefName + ' (' + cname(p.country) + ')');
    chk.notes.forEach(function (n) { heat(n[0], n[1], n[0] === homeAuth(client) ? 'Payments into clients\' home countries' : 'Payments via ' + cname(p.country)); });
    p.status = 'released';
    p.released = s.date;
    p.rt = s.clock;
    p.tx = tx.id;
    p.alert = al ? al.id : null;
    p.fee = chk.fee;
    p.chf = round(chk.chf);
    if (p.source === 'client') loyal(client, 3);
    tick(4);
    checkGameOver();
    save();
    return { ok: true, p: p, alert: al };
  };

  Game.rejectPayment = function (id) {
    const p = s.payments.find(function (x) { return x.id === id; });
    if (!p || p.status !== 'pending') return err('Payment is no longer pending.');
    p.status = 'rejected';
    p.released = s.date;
    const c = Game.client(p.client);
    if (p.source === 'client' && c) {
      loyal(c, -15);
      note(c, 'Payment order ' + p.ref + ' (' + p.ccy + ' ' + U.fmt(p.amount) + ') rejected by the bank. Client informed, displeased.');
    }
    tick(3);
    save();
    return { ok: true };
  };

  /* ---------- Kontoübertrag ---------- */
  Game.transferPreview = function (fromId, toId, amount) {
    const from = Game.account(fromId), to = Game.account(toId);
    if (!from || !to || !(amount > 0)) return null;
    const chf = amount * rate(from.ccy);
    const spread = from.ccy === to.ccy ? 0 : (from.type === 'MET' || to.type === 'MET' ? 0.006 : 0.0025);
    const brok = (from.type === 'DEP' || to.type === 'DEP') ? chf * 0.004 : 0;
    const credit = (chf * (1 - spread) - brok) / rate(to.ccy);
    return { chf: chf, spread: spread, brok: brok, credit: credit };
  };

  Game.transfer = function (fromId, toId, amount, text) {
    const from = Game.account(fromId), to = Game.account(toId);
    if (!from || !to) return err('Please select both accounts.');
    if (from.id === to.id) return err('Debit and credit account are identical.');
    if (!(amount > 0)) return err('Amount must be greater than zero.');
    if (from.bal + 1e-6 < amount) return err('Insufficient balance on ' + from.id + ' (' + from.ccy + ' ' + U.fmt(from.bal, from.ccy === 'XAU' ? 3 : 2) + ').');
    const cf = Game.client(from.client), ct = Game.client(to.client);
    if (cf.status !== 'active' || ct.status !== 'active' || from.closed || to.closed) return err('Relationship is blocked or closed.');
    const pv = Game.transferPreview(fromId, toId, amount);
    if (pv.spread) income('fx', pv.chf * pv.spread);
    if (pv.brok) income('comm', pv.brok);
    const dtext = text || (from.type === 'DEP' ? 'Sale of securities' : from.type === 'MET' ? 'Sale of fine gold 999.9' : 'Transfer to ' + to.id);
    const ctext = text || (to.type === 'DEP' ? 'Purchase of securities' : to.type === 'MET' ? 'Purchase of fine gold 999.9' : 'Transfer from ' + from.id);
    const t1 = book(from, -amount, dtext, { kind: 'int-out', cp: to.id });
    book(to, pv.credit, ctext, { kind: 'int-in', cp: from.id });
    let al = null;
    if (cf.id !== ct.id) {
      al = raise(rulesFor(cf, pv.chf, { out: true }), cf, t1, 'Internal transfer to ' + to.id + ' (' + ct.rubrik + ')');
    }
    tick(3);
    save();
    return { ok: true, credit: pv.credit, alert: al };
  };

  /* ---------- Kasse ---------- */
  Game.counterAccept = function (id) {
    const k = s.counter.find(function (x) { return x.id === id; });
    if (!k) return err('Visit not found.');
    const c = Game.client(k.client);
    const chf = k.amount * rate(k.ccy);
    let al = null;
    if (k.type === 'in') {
      const acc = ensureAccount(c, k.ccy, null);
      const tx = book(acc, k.amount, 'Cash deposit ' + k.ccy + ' banknotes' + (k.courier ? ' (courier)' : ''), { kind: 'cash-in', ext: true });
      const fee = Math.max(50, chf * 0.003);
      book(acc, -fee / rate(acc.ccy), 'Cash handling commission 0.30%', { kind: 'fee' });
      income('comm', fee);
      al = raise(rulesFor(c, chf, { cash: true, funding: k.funding }), c, tx, 'Cash deposit ' + k.ccy + ' ' + U.fmt(k.amount) + ' at counter' + (k.courier ? ' (courier)' : ''));
      loyal(c, 3);
      if (k.funding && !c.funded) { c.funded = true; note(c, 'Initial deposit received at counter.'); }
    } else {
      const accs = Game.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR'; });
      let acc = accs.find(function (a) { return a.ccy === k.ccy && a.bal >= k.amount; });
      let debit = k.amount;
      if (!acc) {
        acc = accs.filter(function (a) { return a.bal * rate(a.ccy) >= chf * 1.003; })
          .sort(function (a, b) { return valueCHF(b) - valueCHF(a); })[0];
        if (!acc) return err('Insufficient funds on current accounts – securities would have to be sold first.');
        debit = chf * 1.0025 / rate(acc.ccy);
        income('fx', chf * 0.0025);
      }
      const tx = book(acc, -debit, 'Cash withdrawal ' + k.ccy + ' ' + U.fmt(k.amount), { kind: 'cash-out', ext: true });
      const fee = Math.max(30, chf * 0.001);
      book(acc, -fee / rate(acc.ccy), 'Cash withdrawal commission', { kind: 'fee' });
      income('comm', fee);
      al = raise(rulesFor(c, chf, { cash: true }), c, tx, 'Cash withdrawal ' + k.ccy + ' ' + U.fmt(k.amount) + ' at counter');
      const auth = homeAuth(c);
      if (auth && chance(Math.min(0.45, 0.04 + chf / 700000))) schedule(rint(1, 3), 'border', { client: c.id, ccy: k.ccy, amount: k.amount });
      loyal(c, 2);
    }
    s.counter = s.counter.filter(function (x) { return x.id !== id; });
    tick(12);
    checkGameOver();
    save();
    return { ok: true, alert: al };
  };

  Game.counterRefuse = function (id) {
    const k = s.counter.find(function (x) { return x.id === id; });
    if (!k) return err('Visit not found.');
    const c = Game.client(k.client);
    loyal(c, k.type === 'in' ? -12 : -15);
    note(c, (k.type === 'in' ? 'Cash deposit' : 'Cash withdrawal') + ' of ' + k.ccy + ' ' + U.fmt(k.amount) + ' refused at the counter.');
    s.counter = s.counter.filter(function (x) { return x.id !== id; });
    if (k.funding && !c.funded) terminate(c, 'unfunded');
    tick(4);
    save();
    return { ok: true };
  };

  /* ---------- Kundenstamm ---------- */
  Game.openAccount = function (cid, ccy, type, entityId) {
    const c = Game.client(cid);
    if (!c || c.status !== 'active') return err('Relationship is not active.');
    if (entityId) {
      const e = Game.entity(entityId);
      if (!e || e.bo !== cid) return err('Company is not held by this client.');
    }
    const acc = openAccount(c, ccy, type, entityId);
    tick(8);
    save();
    return { ok: true, acc: acc };
  };

  Game.setHoldMail = function (cid, on) {
    const c = Game.client(cid);
    if (!c || c.status !== 'active') return err('Relationship is not active.');
    c.holdMail = !!on;
    if (on) {
      charge(c, 600, 'Hold mail fee (banklagernd) – annual');
      income('comm', 600);
      loyal(c, 4);
      note(c, 'Hold-mail agreement signed (banklagernde Korrespondenz).', s.user.id);
    } else {
      loyal(c, -6);
      note(c, 'Hold mail cancelled – statements will be mailed to ' + c.city + '.', s.user.id);
    }
    tick(5);
    save();
    return { ok: true };
  };

  Game.requestFormA = function (cid) {
    const c = Game.client(cid);
    if (!c || c.status !== 'active') return err('Relationship is not active.');
    if (c.formA) return err('Form A is already on file.');
    if (c.formAPending) return err('Form A has already been requested.');
    c.formAPending = true;
    schedule(rint(2, 4), 'formA', { client: cid });
    note(c, 'Form A (declaration of beneficial owner) sent to client for signature.', s.user.id);
    tick(5);
    save();
    return { ok: true };
  };

  Game.addNote = function (cid, text) {
    const c = Game.client(cid);
    if (!c || !text) return err('Note is empty.');
    note(c, text, s.user.id);
    tick(4);
    save();
    return { ok: true };
  };

  Game.offboard = function (cid) {
    const c = Game.client(cid);
    if (!c || c.status !== 'active') return err('Relationship is not active.');
    const auth = homeAuth(c);
    const aum = Game.clientAUM(cid);
    terminate(c, 'offboard');
    if (auth) heat(auth, -Math.min(6, 1 + aum / 1e7 * (1 - c.declared)), 'Relationships closed');
    if (c.risk === 'PEP') heat('EBK', -4, 'PEP relationship closed');
    discretion(-1);
    tick(20);
    save();
    return { ok: true };
  };

  Game.suggestEntityName = function (jur) {
    const j = D.JURIS[jur];
    const w = D.ENTITY_WORDS;
    if (j.suffix === 'Stiftung') return pick(w.a) + ' ' + pick(['Familienstiftung', 'Stiftung']);
    if (j.suffix === 'Anstalt') return pick(w.a) + ' ' + pick(['Invest', 'Finanz', 'Holding', 'Treuhand']) + ' Anstalt';
    return pick(w.a) + ' ' + pick(w.b) + ' ' + j.suffix;
  };

  Game.createEntity = function (cid, jur, name, withAccount, ccy) {
    const c = Game.client(cid);
    const j = D.JURIS[jur];
    if (!c || c.status !== 'active') return err('Relationship is not active.');
    if (!j) return err('Select a jurisdiction.');
    name = String(name || '').trim();
    if (name.length < 4) return err('Enter the company name.');
    if (s.entities.some(function (e) { return e.name.toLowerCase() === name.toLowerCase(); })) return err('A company of that name already exists in the register.');
    if (Game.clientAUM(cid) < j.setup * 3) return err('Client assets insufficient to cover set-up costs.');
    const e = { id: 'E' + U.pad(++s.ctr.ent, 2), name: name, jur: jur, inc: s.date, bo: cid };
    s.entities.push(e);
    charge(c, j.setup, 'Incorporation ' + name + ' (' + j.label + ')');
    income('other', j.setup * 0.35);
    note(c, 'Domiciliary company ' + name + ' incorporated via ' + j.agent + '. Form A lists ' + c.name + ' as beneficial owner.', s.user.id);
    let acc = null;
    if (withAccount) acc = openAccount(c, ccy || 'USD', 'CUR', e.id);
    tick(20);
    save();
    return { ok: true, entity: e, acc: acc };
  };

  /* ---------- Compliance ---------- */
  Game.alertQuality = function (a, just) {
    const c = Game.client(a.client);
    if (just === 'phone') return 'thin';
    if (a.rules.some(function (r) { return r === 'TM-03' || r === 'TM-04' || r === 'TM-09'; })) return 'thin';
    if (a.rules.indexOf('TM-05') >= 0 && !c.formA) return 'thin';
    if (a.rules.indexOf('TM-07') >= 0 && just !== 'sale' && just !== 'income') return 'thin';
    return 'adequate';
  };

  Game.closeAlert = function (id, just, comment) {
    const a = s.alerts.find(function (x) { return x.id === id; });
    if (!a || a.status !== 'open') return err('Alert is not open.');
    if (!just) return err('Select a justification.');
    a.weak = Game.alertQuality(a, just) === 'thin';
    a.status = 'closed';
    a.res = { just: just, comment: comment || '', d: s.date, t: s.clock, by: s.user.id };
    tick(10);
    save();
    return { ok: true };
  };

  Game.closeAlerts = function (ids, just, comment) {
    if (!just) return err('Select a justification.');
    let n = 0;
    ids.forEach(function (id) {
      const a = s.alerts.find(function (x) { return x.id === id; });
      if (!a || a.status !== 'open') return;
      a.weak = Game.alertQuality(a, just) === 'thin';
      a.status = 'closed';
      a.res = { just: just, comment: comment || '', d: s.date, t: s.clock, by: s.user.id };
      n++;
    });
    if (!n) return err('No open alerts selected.');
    tick(4 + n * 3);
    save();
    return { ok: true, n: n };
  };

  Game.reportAlert = function (id) {
    const a = s.alerts.find(function (x) { return x.id === id; });
    if (!a || a.status !== 'open') return err('Alert is not open.');
    const c = Game.client(a.client);
    const auth = homeAuth(c);
    heat('EBK', -6, 'Reports to MROS');
    if (auth) heat(auth, 4, 'MROS information shared with foreign FIU');
    discretion(-6);
    terminate(c, 'mros');
    a.status = 'reported';
    a.res = { just: 'mros', comment: 'Report filed with MROS (Art. 9 GwG). Assets blocked.', d: s.date, t: s.clock, by: s.user.id };
    tick(25);
    checkGameOver();
    save();
    return { ok: true };
  };

  /* ---------- Akquisition ---------- */
  Game.startTrip = function (c) {
    if (s.trip) return err('A trip is already under way.');
    const dest = D.TRIP_DEST.find(function (t) { return t.c === c; });
    if (!dest) return err('Select a destination.');
    s.trip = { c: c, from: s.date, until: U.addBusinessDays(s.date, 5) };
    expense('travel', 18000);
    const auth = D.COUNTRIES[c].auth;
    if (auth) heat(auth, 2, 'Acquisition trips abroad');
    if (auth && chance(auth === 'US' ? 0.18 : 0.1)) schedule(rint(1, 3), 'tripIncident', { c: c });
    tick(20);
    checkGameOver();
    save();
    return { ok: true };
  };

  function freshWord() {
    const free = D.CODEWORDS.filter(function (w) { return s.usedWords.indexOf(w) < 0; });
    const w = free.length ? pick(free) : pick(D.CODEWORDS) + '-' + rint(2, 9);
    s.usedWords.push(w);
    return w;
  }

  function genProspect(forceC) {
    const pool = forceC ? D.PROSPECTS.filter(function (p) { return p.c === forceC; }) : D.PROSPECTS;
    const p = weighted(pool, function (x) { return x.weight; });
    const N = D.NAMES[p.c];
    const female = chance(0.2);
    const name = (female ? N.mrs : N.mr) + ' ' + pick(female ? N.f : N.m) + ' ' + pick(N.l);
    const wealth = roundTo(p.w[0] * Math.pow(p.w[1] / p.w[0], rnd()), 100000);
    const ccy = p.ccy;
    const amount = roundTo(wealth * between(0.35, 0.8) / rate(ccy), 10000);
    const method = chance(p.cash) ? 'cash' : (p.offshore || chance(0.3) ? 'offshore' : (chance(0.55) ? 'home' : 'ch'));
    let intro = pick(p.intro);
    return {
      c: p.c, name: name, city: pick(p.cities), occ: pick(p.occ), sow: pick(p.sow), wealth: wealth, ccy: ccy, amount: amount,
      method: method, risk: p.risk, fee: round(between(p.fee[0], p.fee[1]), 4), refuseA: chance(p.refuseA),
      declared: chance(0.15) ? 0.3 : 0, born: String(rint(1932, 1968)) + '-' + U.pad(rint(1, 12), 2) + '-' + U.pad(rint(1, 28), 2),
      intro: intro, rubrik: null
    };
  }
  Game.genProspect = genProspect;

  function prospectMessage(pr, time) {
    const methodText = {
      cash: 'to be deposited in cash, delivered by courier in several tranches',
      home: 'to be transferred from ' + cname(pr.c) + ' by bank transfer',
      offshore: 'to be transferred from an existing offshore structure',
      ch: 'to be transferred from another Swiss bank'
    }[pr.method];
    const referral = pr.intro.indexOf('existing client') === 0;
    const body = (referral ? 'Our client ' + pr.intro.replace('existing client ', '') + ' has recommended us to an acquaintance.\n\n' : 'Dear Sirs,\n\nWe have the pleasure of introducing to you ') +
      pr.name + ' of ' + pr.city + ' (' + cname(pr.c) + '), ' + pr.occ.charAt(0).toLowerCase() + pr.occ.slice(1) + '.\n\n' +
      'The prospective client wishes to open a numbered relationship with your esteemed house. Estimated assets: approx. ' + pr.ccy + ' ' + U.fmt(pr.amount, 0) +
      ' as a first tranche, ' + methodText + '. Source of wealth: ' + pr.sow.toLowerCase() + '.\n\n' +
      'The client attaches the greatest importance to absolute discretion and requests hold mail.' +
      (pr.refuseA ? ' He is NOT prepared to sign a Form A (declaration of beneficial owner).' : '') +
      (referral ? '\n\n' + D.RM_BY_COUNTRY[pr.c] : '\n\nWe would be grateful for your early confirmation.\n\nYours faithfully,\n' + pr.intro);
    return msg({
      t: time || s.clock, type: referral ? 'memo' : 'letter', kind: 'prospect',
      from: referral ? D.RM_BY_COUNTRY[pr.c] + ', Relationship Management' : pr.intro,
      subject: 'New relationship: ' + pr.name + ', ' + pr.city, body: body,
      actions: [['accept', 'Accept relationship'], ['decline', 'Decline']],
      data: { prospect: pr }, expires: U.addBusinessDays(s.date, 5)
    });
  }

  function acceptProspect(pr) {
    s.ctr.stamm += rint(7, 29);
    const sid = String(s.ctr.stamm);
    const id = sid.slice(0, 3) + '.' + sid.slice(3);
    const rm = D.RM_BY_COUNTRY[pr.c] || 'U. Keller';
    const c = {
      id: id, rubrik: freshWord(), name: pr.name, type: 'Individual', nat: pr.c, dom: pr.c, city: pr.city, born: pr.born,
      occ: pr.occ, sow: pr.sow, wealth: pr.wealth, declared: pr.declared, risk: pr.risk, formA: pr.refuseA ? null : s.date,
      holdMail: true, since: s.date, rm: rm, fee: pr.fee, loyalty: 66, status: 'active', funded: false, feeAccrued: 0,
      formAPending: false, notes: []
    };
    s.clients.push(c);
    note(c, 'Relationship opened. Introduced by ' + pr.intro + '. Hold mail agreed.' + (pr.refuseA ? ' Client refused to sign Form A.' : ''), s.user.id);
    openAccount(c, pr.ccy, 'CUR');
    if (pr.ccy !== 'CHF') openAccount(c, 'CHF', 'CUR');
    if (pr.risk === 'PEP') heat('EBK', s.date >= '2003-07-01' ? 4 : 2, 'PEP relationships opened');
    if (pr.risk === 'Increased') heat('EBK', 1, 'Increased-risk relationships opened');
    if (pr.method === 'cash') {
      const n = pr.amount > 500000 ? 3 : pr.amount > 200000 ? 2 : 1;
      const part = roundTo(pr.amount / n, 5000);
      for (let i = 0; i < n; i++) {
        schedule(1 + i * 2, 'visit', { client: id, type: 'in', ccy: pr.ccy, amount: i === n - 1 ? pr.amount - part * (n - 1) : part, courier: true, funding: true, note: 'Initial deposit, tranche ' + (i + 1) + ' of ' + n });
      }
    } else {
      schedule(rint(1, 3), 'funding', { client: id, amount: pr.amount, ccy: pr.ccy, method: pr.method });
    }
    return c;
  }

  /* ---------- Meldungs-Entscheide ---------- */
  const HANDLERS = {
    prospect: function (m, key) {
      const pr = m.data.prospect;
      if (key === 'decline') return 'Introducer informed that the bank is unable to accept the relationship.';
      const c = acceptProspect(pr);
      m.data.client = c.id;
      return 'Relationship ' + c.id + ' / ' + c.rubrik + ' opened. Funding (' + pr.ccy + ' ' + U.fmt(pr.amount, 0) + ') expected in the coming days.';
    },
    mla: function (m, key) {
      const c = Game.client(m.data.client);
      const auth = m.data.auth;
      if (c.status !== 'active') return 'Relationship already closed – request answered accordingly.';
      if (key === 'object') {
        if (!m.data.fraud) {
          heat(auth, 2, 'Mutual assistance refused');
          loyal(c, 10);
          discretion(2);
          expense('legal', 15000);
          return 'Objection upheld. The Federal Office of Justice refused assistance (fiscal offence). Legal costs CHF 15,000.';
        }
        heat('EBK', 14, 'Unlawful refusal of mutual assistance');
        heat(auth, 8, 'Mutual assistance – documents produced by court order');
        expense('legal', 60000);
        terminate(c, 'seized');
        return 'Objection rejected: the offence qualifies as tax fraud. Documents produced by order; the bank\'s conduct was reported to the EBK. Relationship blocked and terminated. Legal costs CHF 60,000.';
      }
      if (m.data.fraud) {
        heat(auth, -10, 'Co-operation with foreign authorities');
        heat('EBK', -3, 'Co-operation with authorities');
        discretion(-4);
        terminate(c, 'seized');
        return 'Account documents produced via the Federal Office of Justice. Relationship blocked and terminated.';
      }
      heat('EBK', 6, 'Breach of banking secrecy (Art. 47 BankG)');
      heat(auth, -6, 'Documents received by foreign authority');
      discretion(-12);
      Game.activeClients().forEach(function (o) { if (o.dom === c.dom && o.id !== c.id) loyal(o, -6); });
      terminate(c, 'seized');
      return 'Documents produced although the offence was purely fiscal. This breaches banking secrecy; the case has been noted by the EBK and word is spreading among clients.';
    },
    journalist: function (m, key) {
      const c = Game.client(m.data.client);
      if (key === 'terminate') {
        if (c.status === 'active') {
          Game.offboard(c.id);
          heat('EBK', -2, 'Reputational risk reduced');
        }
        return 'Relationship terminated quietly. Journalist received a "no comment".';
      }
      if (chance(c.risk === 'PEP' ? 0.5 : 0.25)) {
        heat('EBK', c.risk === 'PEP' ? 5 : 2, 'Press reports');
        const auth = homeAuth(c);
        if (auth) heat(auth, 3, 'Press reports');
        s.news.push({ d: s.date, text: 'Zürcher Finanzblatt: "Zurich private bank holds millions for ' + (c.risk === 'PEP' ? 'former official' : 'foreign businessman') + ' from ' + cname(c.dom) + '"' });
        return 'No comment given (Art. 47 BankG). The article appeared anyway – the EBK has taken note.';
      }
      return 'No comment given (Art. 47 BankG). The story was not published.';
    },
    ebk: function (m, key) {
      if (key === 'review') {
        expense('legal', m.data.cost);
        heat('EBK', -m.data.effect, 'Special review commissioned');
        s.flags.reviews = (s.flags.reviews || []).concat([s.date]);
        return 'Special review commissioned from Hürlimann Revision AG (CHF ' + U.fmt(m.data.cost, 0) + ').' + (m.data.effect >= 10 ? ' The EBK welcomes the initiative.' : ' The EBK notes that this is not the first review and remains sceptical.');
      }
      expense('legal', 20000);
      const overdue = Game.overdueAlerts().length;
      if (overdue) {
        heat('EBK', 6, 'Unsatisfactory reply to EBK');
        return 'Written reply sent. The EBK notes ' + overdue + ' overdue alert(s) and is not satisfied.';
      }
      heat('EBK', -3, 'Reply to EBK');
      return 'Written reply sent by Legal & Compliance. The EBK has no further questions for the time being.';
    },
    border: function (m, key) {
      const c = Game.client(m.data.client);
      if (key === 'lawyer') {
        expense('legal', 25000);
        heat(m.data.auth, -4, 'Legal defence of clients');
        if (c) loyal(c, 6);
        return 'Lawyer instructed (CHF 25,000). The client is grateful.';
      }
      return 'No action taken.';
    },
    eutax: function (m, key) {
      const c = Game.client(m.data.client);
      if (!c || c.status !== 'active') return 'Relationship no longer active.';
      if (key === 'retention') {
        loyal(c, -6);
        return 'Retention tax applied. The client is not pleased.';
      }
      const name = Game.suggestEntityName('VG');
      const r = Game.createEntity(c.id, 'VG', name, false);
      if (!r.ok) return r.msg;
      Game.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR' && !a.entity && a.bal > 0; }).forEach(function (a) {
        const na = openAccount(c, a.ccy, 'CUR', r.entity.id);
        const amt = a.bal;
        book(a, -amt, 'Transfer to ' + na.id + ' (' + name + ')', { kind: 'int-out', cp: na.id });
        book(na, amt, 'Transfer from ' + a.id, { kind: 'int-in', cp: a.id });
      });
      loyal(c, 8);
      return 'Assets restructured into ' + name + ' (BVI). Outside the scope of the EU agreement.';
    }
  };

  Game.act = function (msgId, key) {
    const m = s.messages.find(function (x) { return x.id === msgId; });
    if (!m || m.resolved) return err('Decision already recorded.');
    const action = m.actions.find(function (a) { return a[0] === key; });
    if (!action || !HANDLERS[m.kind]) return err('Unknown action.');
    const text = HANDLERS[m.kind](m, key);
    m.resolved = { key: key, label: action[1], text: text, d: s.date, t: s.clock, by: s.user.id };
    m.read = true;
    tick(8);
    checkGameOver();
    save();
    return { ok: true, text: text };
  };

  Game.markRead = function (id) {
    const m = s.messages.find(function (x) { return x.id === id; });
    if (m && !m.read) { m.read = true; save(); }
  };

  /* ---------- Tagesereignisse ---------- */
  function pickClient(filter) {
    const list = Game.activeClients().filter(function (c) { return c.funded && (!filter || filter(c)); });
    return weighted(list, function (c) { return Math.sqrt(Math.max(1, Game.clientAUM(c.id))); });
  }
  function randAcct(c) {
    const d = function (n) { let x = ''; for (let i = 0; i < n; i++) x += rint(0, 9); return x; };
    switch (c) {
      case 'DE': return U.iban('DE', d(8) + d(10));
      case 'IT': return U.iban('IT', String.fromCharCode(65 + rint(0, 25)) + d(10) + d(12));
      case 'FR': return U.iban('FR', d(10) + d(11) + d(2));
      case 'GB': return U.iban('GB', 'HSQB' + d(6) + d(8));
      case 'NL': return U.iban('NL', 'AMHB' + d(10));
      case 'GR': return U.iban('GR', d(7) + d(16));
      case 'AT': return U.iban('AT', d(16));
      case 'CY': return U.iban('CY', d(8) + d(16));
      case 'LI': return U.iban('LI', d(5) + d(12));
      default: return d(3) + '-' + d(6) + '-' + d(3);
    }
  }
  function surname(c) {
    const N = D.NAMES[c] || D.NAMES.GB;
    return pick(N.l);
  }

  const EVENTS = {
    inflow: function (log) {
      const c = pickClient();
      if (!c) return;
      const ents = Game.entitiesOf(c.id);
      const useEnt = ents.length && chance(0.5);
      const fromHome = !useEnt && chance(0.35) && D.banksIn(c.dom).length;
      const bank = fromHome ? pick(D.banksIn(c.dom)) : D.bankByBic(pick(D.HAVEN_BANKS));
      const ccy = fromHome ? (D.COUNTRIES[c.dom].ccy || 'USD') : pick(['USD', 'USD', 'EUR', 'CHF']);
      const amount = roundTo(c.wealth * between(0.003, 0.025) / rate(ccy), 1000);
      const acc = ensureAccount(c, ccy, useEnt ? ents[0].id : null);
      incoming(c, acc, amount, ccy, bank, 0.2);
      log.push(['EVT', 'ZAHLUNGSEINGANG ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    cashIn: function (log) {
      const c = pickClient(function (x) { return ['IT', 'DE', 'FR', 'CH', 'LB'].indexOf(x.dom) >= 0; });
      if (!c) return;
      const ccy = c.dom === 'CH' ? 'CHF' : c.dom === 'LB' ? 'USD' : 'EUR';
      const amount = roundTo(between(20000, Math.min(450000, c.wealth * 0.03)) / rate(ccy), 5000);
      s.counter.push({ id: 'K' + U.pad(++s.ctr.visit, 3), client: c.id, type: 'in', ccy: ccy, amount: amount, courier: c.dom === 'IT' && chance(0.6), t: rint(8 * 60 + 30, 15 * 60), note: c.dom === 'IT' ? 'Arrived via Chiasso' : 'Announced by telephone', funding: false });
      log.push(['EVT', 'KASSE: BESUCH ANGEMELDET ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    cashOut: function (log) {
      const c = pickClient(function (x) { return ['IT', 'DE', 'FR', 'CH'].indexOf(x.dom) >= 0; });
      if (!c) return;
      const ccy = c.dom === 'CH' ? 'CHF' : 'EUR';
      const amount = roundTo(between(15000, 150000) / rate(ccy), 5000);
      s.counter.push({ id: 'K' + U.pad(++s.ctr.visit, 3), client: c.id, type: 'out', ccy: ccy, amount: amount, courier: false, t: rint(8 * 60 + 30, 15 * 60), note: pick(['Personal use', 'Purchase of a car', 'Renovation of holiday home', 'Family wedding', 'Not specified']), funding: false });
      log.push(['EVT', 'KASSE: BEZUG ANGEMELDET ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    order: function (log) {
      const c = pickClient();
      if (!c) return;
      const homeBanks = D.banksIn(c.dom);
      const kind = homeBanks.length ? weighted(['home', 'family', 'offshore'], function (k) { return k === 'offshore' ? 1 : 2; }) : 'offshore';
      let bank, benef, purpose, ccy, amount;
      if (kind === 'offshore') {
        bank = D.bankByBic(pick(D.HAVEN_BANKS));
        benef = pick(D.ENTITY_WORDS.a) + ' ' + pick(D.ENTITY_WORDS.b) + ' Ltd.';
        purpose = pick(['Investment', 'Capital contribution', 'Loan agreement 2003/01', 'Purchase of shares']);
        ccy = 'USD';
        amount = roundTo(c.wealth * between(0.02, 0.08) / rate(ccy), 10000);
      } else {
        bank = pick(homeBanks);
        ccy = D.COUNTRIES[c.dom].ccy || 'USD';
        if (kind === 'home') {
          const sn = surname(c.dom);
          benef = {
            DE: 'Notariat Dr. ' + sn + ', ' + bank.city + ' (Anderkonto)', IT: 'Studio Notarile ' + sn + ', ' + bank.city,
            FR: 'Étude de Maître ' + sn + ', notaire', US: sn + ' Title & Escrow Co.', GB: sn + ' & Partners Solicitors (client account)'
          }[c.dom] || sn + ' Real Estate';
          purpose = pick(['Purchase of property', 'Down payment apartment', 'Renovation works', 'Purchase of a boat', 'Purchase of land']);
          amount = roundTo(c.wealth * between(0.008, 0.05) / rate(ccy), 5000);
        } else {
          benef = c.name.split(' ').slice(-1)[0] + ', ' + pick(['Andrea', 'Stefan', 'Julia', 'Thomas', 'Claudia', 'Peter', 'Sofia', 'Marc']);
          purpose = pick(['Family support', 'Tuition fees', 'Wedding gift', 'Monthly allowance']);
          amount = roundTo(c.wealth * between(0.001, 0.008) / rate(ccy), 1000);
        }
      }
      const accs = Game.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR'; });
      const need = amount * rate(ccy) * 1.01;
      const acc = accs.filter(function (a) { return !a.entity && a.ccy === ccy && valueCHF(a) >= need; })[0] ||
        accs.filter(function (a) { return valueCHF(a) >= need; }).sort(function (a, b) { return valueCHF(b) - valueCHF(a); })[0];
      if (!acc) return;
      const acct = randAcct(bank.c);
      const p = newPayment({
        debit: acc.id, ccy: ccy, amount: amount, valuta: U.addBusinessDays(s.date, 1), benefName: benef, benefAcct: acct,
        benefAddr: bank.city, country: bank.c, bic: bank.bic, purpose: purpose, charges: pick(['OUR', 'SHA', 'SHA']), hideOrig: false, t: rint(8 * 60 + 15, 11 * 60)
      }, 'client');
      msg({
        type: 'fax', kind: 'order', from: c.rubrik + ' (fax)', t: p.t, subject: 'Payment order ' + ccy + ' ' + U.fmt(amount, 0) + ' – ' + c.rubrik,
        body: 'TO: BANKHAUS VOGT & CIE, ZUERICH – ATTN. ' + c.rm.toUpperCase() + '\nRE: NUMBERED ACCOUNT ' + c.rubrik + '\n\nPlease transfer ' + ccy + ' ' + U.fmt(amount) + ' to:\n\nBeneficiary: ' + benef + '\nBank: ' + bank.name + ', ' + bank.city + ' (' + bank.bic + ')\nAccount: ' + (acct.length > 20 ? U.ibanFmt(acct) : acct) + '\nPurpose: ' + purpose + '\n\nThank you.\n\n[signature]  ' + c.rubrik,
        data: { payment: p.id, client: c.id }
      });
      log.push(['EVT', 'ZAHLUNGSAUFTRAG (FAX) ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    prospect: function (log) {
      const tripC = s.trip && chance(0.7) ? s.trip.c : null;
      const pr = genProspect(tripC);
      prospectMessage(pr, rint(8 * 60 + 30, 16 * 60));
      log.push(['EVT', 'AKQUISITION: NEUER INTERESSENT', pr.c + ' ' + pr.ccy + ' ' + U.fmt(pr.amount, 0)]);
    },
    journalist: function (log) {
      const c = pickClient(function (x) { return x.risk !== 'Normal'; }) || pickClient();
      if (!c) return;
      msg({
        type: 'memo', kind: 'journalist', from: 'Reception / Telephone exchange', subject: 'Press enquiry – Zürcher Finanzblatt',
        body: 'A journalist of the "Zürcher Finanzblatt" (Mr. S. Brunner) called twice this morning. He asks whether our bank manages assets for ' +
          (c.risk === 'PEP' ? 'a former government official from ' : 'a businessman from ') + cname(c.dom) + ' and mentioned the name "' + c.name.split(' ').slice(-1)[0] + '".\n\nHe intends to publish later this week and asks for a statement.',
        actions: [['nocomment', 'No comment (Art. 47 BankG)'], ['terminate', 'Terminate the relationship quietly']],
        data: { client: c.id }
      });
      log.push(['EVT', 'MEDIENANFRAGE', c.rubrik]);
    }
  };

  // factor: Anteil der Spur, die eine Gutschrift aus dem Ausland hinterlässt
  function incoming(c, acc, amount, ccy, bank, factor, funding) {
    const tx = book(acc, amount, 'Incoming payment / ' + bank.name + ', ' + bank.city, { kind: 'wire-in', cp: bank.name.toUpperCase(), country: bank.c, ext: true });
    const chf = amount * rate(ccy);
    raise(rulesFor(c, chf, { country: bank.c, funding: funding }), c, tx, 'Incoming payment ' + ccy + ' ' + U.fmt(amount) + ' from ' + bank.name + ', ' + bank.city + ' (' + bank.c + ')');
    exposure(c, acc, bank.c, chf, { incoming: factor, ccy: ccy }).forEach(function (n) {
      heat(n[0], n[1], 'Incoming payments from clients\' home countries');
    });
    return tx;
  }

  const SCHEDULED = {
    visit: function (d, log) {
      const c = Game.client(d.client);
      if (!c || c.status !== 'active') return;
      s.counter.push({ id: 'K' + U.pad(++s.ctr.visit, 3), client: c.id, type: d.type, ccy: d.ccy, amount: d.amount, courier: !!d.courier, t: rint(8 * 60 + 30, 11 * 60), note: d.note || '', funding: !!d.funding, retry: !!d.retry });
      log.push(['EVT', 'KASSE: BESUCH ANGEMELDET ' + c.rubrik, d.ccy + ' ' + U.fmt(d.amount, 0)]);
    },
    funding: function (d, log) {
      const c = Game.client(d.client);
      if (!c || c.status !== 'active') return;
      let bank;
      if (d.method === 'home' && D.banksIn(c.dom).length) bank = pick(D.banksIn(c.dom));
      else if (d.method === 'ch') bank = D.bankByBic(pick(['LEMPCHGG', 'ZGBKCHZZ']));
      else bank = D.bankByBic(pick(D.HAVEN_BANKS));
      incoming(c, ensureAccount(c, d.ccy, null), d.amount, d.ccy, bank, 0.5, true);
      c.funded = true;
      log.push(['EVT', 'ERSTEINZAHLUNG ' + c.rubrik, d.ccy + ' ' + U.fmt(d.amount, 0)]);
    },
    border: function (d, log) {
      const c = Game.client(d.client);
      if (!c) return;
      const auth = homeAuth(c);
      if (!auth) return;
      const place = { IT: ['Ponte Chiasso', 'Guardia di Finanza'], DE: ['Basel-Weil am Rhein', 'German customs (Zoll)'], FR: ['Genève-Bardonnex', 'French customs (douane)'], GB: ['London Heathrow', 'HM Customs'], US: ['Miami International Airport', 'US Customs'] }[c.dom];
      const docs = !c.holdMail || chance(0.15);
      heat(auth, docs ? 9 : 3, 'Clients stopped at the border');
      loyal(c, -8);
      note(c, 'Client stopped at ' + place[0] + ' with ' + d.ccy + ' ' + U.fmt(d.amount, 0) + ' in cash.' + (docs ? ' Bank documents found.' : ''));
      msg({
        type: 'memo', kind: 'border', from: c.rm + ', Relationship Management', subject: 'Client ' + c.rubrik + ' stopped at the border',
        body: 'The client\'s lawyer informs us that ' + c.name + ' was stopped yesterday at ' + place[0] + ' by the ' + place[1] + ' carrying ' + d.ccy + ' ' + U.fmt(d.amount, 0) + ' in cash.\n\n' +
          (docs ? 'Unfortunately a statement of our bank was found in his luggage. The authorities now know of the relationship.' : 'No bank documents were found (hold mail). The client gave no explanation regarding the origin of the cash.') +
          '\n\nThe client asks whether the bank will cover the cost of a lawyer.',
        actions: [['lawyer', 'Instruct lawyer (CHF 25,000)'], ['none', 'No action']], data: { client: c.id, auth: auth }
      });
      log.push(['EVT', 'GRENZKONTROLLE ' + c.rubrik, docs ? 'DOKUMENTE GEFUNDEN' : 'OHNE DOKUMENTE']);
    },
    formA: function (d, log) {
      const c = Game.client(d.client);
      if (!c || c.status !== 'active') return;
      c.formAPending = false;
      if (chance(0.7 + c.loyalty / 400)) {
        c.formA = s.date;
        note(c, 'Form A returned, signed by the client.');
        msg({ type: 'letter', from: c.rubrik + ' (by post, hold mail)', subject: 'Form A returned signed – ' + c.rubrik, body: 'Enclosed please find the Form A (declaration of beneficial owner) duly signed.\n\n[signature]  ' + c.rubrik });
        log.push(['EVT', 'FORMULAR A EINGEGANGEN ' + c.rubrik, 'OK']);
      } else {
        loyal(c, -4);
        note(c, 'Client refuses to sign Form A.');
        msg({ type: 'memo', from: c.rm + ', Relationship Management', subject: 'Form A refused – ' + c.rubrik, body: 'The client refuses to sign the Form A. He considers it "an unnecessary risk" and asks the bank not to raise the subject again.\n\n' + c.rm });
        log.push(['EVT', 'FORMULAR A VERWEIGERT ' + c.rubrik, 'WARNUNG']);
      }
    },
    tripIncident: function (d, log) {
      const auth = D.COUNTRIES[d.c].auth;
      heat(auth, 9, 'Bankers checked at the border');
      msg({
        type: 'memo', from: 'Relationship Management', subject: 'Incident during acquisition trip (' + cname(d.c) + ')',
        body: 'On arrival, our relationship manager was taken aside by customs officers. His briefcase and laptop were searched for about two hours. The officers made copies of a printed list of appointments.\n\nNo client names were on the list – only first names and times. Nevertheless we must assume the authorities are now aware of our activities in the region.'
      });
      log.push(['EVT', 'ZWISCHENFALL REISE ' + d.c, 'WARNUNG']);
    },
    auditReport: function (d, log) {
      const y = d.year;
      const findings = [];
      let delta = 0;
      const noA = Game.activeClients().filter(function (c) { return !c.formA; });
      if (noA.length) { findings.push(noA.length + ' relationship(s) without Form A: ' + noA.map(function (c) { return c.rubrik; }).join(', ')); delta += Math.min(10, noA.length * 2); }
      // Stichprobe: die Revision prüft etwa jede dritte dünn dokumentierte Erledigung
      let weakFound = 0;
      s.alerts.forEach(function (a) {
        if (a.weak && !a.audited) { a.audited = true; if (chance(0.35)) weakFound++; }
      });
      if (weakFound) { findings.push(weakFound + ' alert closure(s) with insufficient documentation (sample)'); delta += Math.min(20, weakFound * 2); }
      const old = s.alerts.filter(function (a) { return a.status === 'open' && U.businessDaysBetween(a.d, s.date) > 20; });
      if (old.length) { findings.push(old.length + ' alert(s) open for more than 20 business days'); delta += Math.min(10, old.length * 2); }
      const peps = Game.activeClients().filter(function (c) { return c.risk === 'PEP'; });
      if (peps.length > 2) { findings.push('High concentration of PEP relationships (' + peps.length + ')'); delta += Math.min(8, (peps.length - 2) * 2); }
      if (!findings.length) delta = -8;
      heat('EBK', delta, 'External audit ' + y);
      expense('legal', 180000);
      s.audits.unshift({ year: y, d: s.date, findings: findings, delta: delta });
      msg({
        type: 'letter', kind: 'audit', from: 'Hürlimann Revision AG, Zürich (statutory auditor)', subject: 'Long-form audit report ' + y + ' (Art. 21 BankG)',
        body: 'We have completed our audit of Bankhaus Vogt & Cie for the financial year ' + y + '.\n\n' +
          (findings.length ? 'We draw your attention to the following findings, which will be included in our report to the Federal Banking Commission:\n\n' + findings.map(function (f, i) { return (i + 1) + '. ' + f; }).join('\n') :
            'Our audit did not reveal any findings regarding compliance with the due-diligence obligations. Our report to the EBK will contain an unqualified opinion.') +
          '\n\nAudit fee: CHF 180,000.\n\nHürlimann Revision AG'
      });
      log.push(['EVT', 'REVISIONSBERICHT ' + y, findings.length ? findings.length + ' FESTSTELLUNGEN' : 'OHNE BEFUND']);
    },
    eutax: function (d, log) {
      const c = Game.client(d.client);
      if (!c || c.status !== 'active' || Game.entitiesOf(c.id).length) return;
      msg({
        type: 'fax', kind: 'eutax', from: c.rubrik + ' (fax)', subject: 'EU retention tax – ' + c.rubrik,
        body: 'Dear Sirs,\n\nI read in the newspaper that from now on a tax will be deducted from my interest income in Switzerland and possibly reported. I do not want any of this.\n\nPlease advise what can be done. A friend mentioned a company abroad.\n\n[signature]  ' + c.rubrik,
        actions: [['restructure', 'Restructure via BVI company (CHF 9,500)'], ['retention', 'Apply retention tax']], data: { client: c.id }
      });
      log.push(['EVT', 'ANFRAGE ZINSBESTEUERUNG ' + c.rubrik, 'OK']);
    }
  };

  /* ---------- Behördenreaktionen ---------- */
  function maybeMLA(auth, log) {
    if (s.heat[auth] < 40) return;
    if (s.messages.some(function (m) { return m.kind === 'mla' && !m.resolved && m.data.auth === auth; })) return;
    if (!chance((s.heat[auth] - 40) / 400)) return;
    const country = D.AUTH[auth].c;
    const cands = Game.activeClients().filter(function (c) { return c.dom === country && c.declared < 1 && c.funded; });
    if (!cands.length) return;
    const c = weighted(cands, function (x) { return Game.clientAUM(x.id) * (1 - x.declared) + 1; });
    const fraud = chance(0.25 + Math.max(0, s.heat[auth] - 60) / 150);
    const clear = chance(0.72);
    const leaning = clear ? fraud : (chance(0.65) ? fraud : !fraud);
    const requester = {
      DE: 'Staatsanwaltschaft ' + pick(['Stuttgart', 'München I', 'Düsseldorf', 'Bochum']),
      IT: 'Procura della Repubblica di ' + pick(['Milano', 'Como', 'Bergamo']),
      FR: 'Juge d\'instruction, Tribunal de grande instance de ' + pick(['Paris', 'Lyon']),
      US: 'US Department of Justice, Tax Division',
      GB: 'Crown Prosecution Service on behalf of the Inland Revenue'
    }[auth];
    const allegation = fraud ?
      'The suspect is alleged to have used falsified invoices and forged balance sheets of a company under his control in order to reduce its taxable profits, and to have transferred the resulting funds to an account in Switzerland.' :
      'The suspect is alleged to have failed to declare income and assets held abroad in his tax returns for the years 1997 to 2002.';
    const assessment = clear ?
      (fraud ? 'Tax fraud (Abgabebetrug) – use of forged documents. Dual criminality is given; assistance must be granted.' :
        'Simple tax evasion (Steuerhinterziehung). Not a criminal offence in Switzerland; no dual criminality. Assistance may be refused (Art. 3 para. 3 IRSG).') :
      'The request mentions undeclared income as well as "irregular accounting" without specifying forged documents. Assessment uncertain – our provisional view: ' +
      (leaning ? 'probably tax fraud; assistance would have to be granted.' : 'probably simple tax evasion; an objection appears promising.');
    msg({
      type: 'letter', kind: 'mla', from: 'Federal Office of Justice, Bern – Mutual Legal Assistance Unit',
      subject: 'Request for mutual legal assistance – ' + requester + ' – re: ' + c.name,
      body: 'Request for mutual legal assistance in criminal matters\n\nThe ' + requester + ' (' + cname(country) + ') has requested assistance in criminal proceedings against ' + c.name + ', ' + c.city + '.\n\n' +
        allegation + '\n\nThe requesting authority asks for production of all account documents for the period 1998–2003 and for information on any companies of which the suspect is the beneficial owner.\n\nYou are requested to state within ten days whether your institution maintains such relationships and whether you object to the production of documents.\n\n— Internal note, Dr. I. Wyss, Legal & Compliance —\n' + assessment,
      actions: [['object', 'Object: fiscal offence – refuse assistance'], ['produce', 'Produce account documents']],
      data: { auth: auth, client: c.id, fraud: fraud, clear: clear }, due: U.addBusinessDays(s.date, 10)
    });
    log.push(['EVT', 'RECHTSHILFEGESUCH ' + auth, c.rubrik]);
  }

  function maybeEBK(log) {
    if (s.heat.EBK < 55) return;
    if (s.messages.some(function (m) { return m.kind === 'ebk' && !m.resolved; })) return;
    if (s.flags.lastEbk && U.businessDaysBetween(s.flags.lastEbk, s.date) < 40) return;
    if (!chance((s.heat.EBK - 55) / 220)) return;
    s.flags.lastEbk = s.date;
    const yearAgo = U.addBusinessDays(s.date, -250);
    const n = (s.flags.reviews || []).filter(function (d) { return d >= yearAgo; }).length;
    const cost = 250000 * (1 + n * 0.6);
    msg({
      type: 'letter', kind: 'ebk', from: 'Eidgenössische Bankenkommission, Bern', subject: 'Request for information – due diligence in private banking',
      body: 'Dear Sirs,\n\nIn the course of our ongoing supervision we have received information which gives rise to questions regarding the observance of due-diligence obligations by your institution, in particular in connection with cash transactions, relationships with politically exposed persons and the clearing of transaction-monitoring alerts.\n\nWe request you to submit a written statement within 30 days. We reserve the right to order an extraordinary audit at the expense of the bank (Art. 23bis BankG).\n\nEidgenössische Bankenkommission\nSecretariat',
      actions: [['review', 'Commission special review (CHF ' + U.fmt(cost, 0) + ')'], ['reply', 'Written reply by Legal (CHF 20,000)']],
      data: { cost: cost, effect: 12 / Math.pow(2, n) }, due: U.addBusinessDays(s.date, 15)
    });
    log.push(['EVT', 'SCHREIBEN EBK', 'WARNUNG']);
  }

  /* ---------- Tagesabschluss ---------- */
  const VOL = { USD: 0.0065, EUR: 0.0025, GBP: 0.005, JPY: 0.007, XAU: 0.011, SMI: 0.012 };
  const DRIFT = { USD: -0.00025, EUR: 0.00002, GBP: -0.0001, JPY: -0.0001, XAU: 0.0006, SMI: 0.0004 };

  Game.endOfDay = function () {
    const log = [];
    const warn = [];
    const L = function (step, label, result) { log.push([step, label, result]); };
    const closing = s.date;
    const startClock = Math.max(s.clock, 18 * 60 + 25);

    // Kasse: nicht bediente Kunden
    let left = 0;
    s.counter.slice().forEach(function (k) {
      const c = Game.client(k.client);
      left++;
      loyal(c, -8);
      note(c, 'Client left the counter without being served (' + k.ccy + ' ' + U.fmt(k.amount, 0) + ').');
      if (k.funding && !c.funded) {
        if (!k.retry) schedule(1, 'visit', { client: c.id, type: k.type, ccy: k.ccy, amount: k.amount, courier: k.courier, funding: true, retry: true, note: 'Second attempt – initial deposit' });
        else terminate(c, 'unfunded');
      }
    });
    s.counter = [];
    L('STEP010', 'KASSENABSCHLUSS', left ? left + ' KUNDE(N) NICHT BEDIENT' : 'OK');
    if (left) warn.push('cash');

    // Kundenaufträge in Pendenz
    let late = 0;
    s.payments.forEach(function (p) {
      if (p.status === 'pending' && p.source === 'client' && U.businessDaysBetween(p.d, closing) >= 2) {
        const c = Game.client(p.client);
        if (c) loyal(c, -4);
        late++;
      }
    });
    L('STEP020', 'PENDENZEN ZAHLUNGSVERKEHR', Game.pendingPayments().length + ' OFFEN' + (late ? ', ' + late + ' UEBERFAELLIG' : ''));

    // Kurse
    s.prevMarket = Object.assign({}, s.market);
    const shock = s.pendingShock || {};
    Object.keys(VOL).forEach(function (k) {
      const r = DRIFT[k] + VOL[k] * gauss() + (shock[k] || 0);
      s.market[k] = round(s.market[k] * (1 + r), k === 'SMI' || k === 'XAU' ? 2 : 4);
    });
    s.pendingShock = null;
    s.mhist.push(Object.assign({ d: closing }, s.market));
    if (s.mhist.length > 130) s.mhist.shift();
    L('STEP030', 'KURSUEBERNAHME TELEKURS', 'OK  6 KURSE');

    // Depotbewertung
    const smiR = s.market.SMI / s.prevMarket.SMI - 1;
    let ndep = 0;
    s.accounts.forEach(function (a) {
      if (a.type === 'DEP' && !a.closed && a.bal > 0) {
        a.bal = round(a.bal * (1 + smiR * 0.7 + 0.00012 + gauss() * 0.002));
        ndep++;
      }
    });
    L('STEP040', 'BEWERTUNG DEPOTS', 'OK  ' + ndep + ' DEPOTS');

    // Gebührenabgrenzung und Aufwand
    let feeDay = 0;
    Game.activeClients().forEach(function (c) {
      const f = Game.clientAUM(c.id) * c.fee / 250;
      c.feeAccrued = (c.feeAccrued || 0) + f;
      feeDay += f;
    });
    income('fees', feeDay);
    const opex = Game.opexDaily();
    expense('opex', opex);
    L('STEP050', 'GEBUEHRENABGRENZUNG', 'CHF ' + U.fmt(feeDay));
    L('STEP055', 'PERSONAL- UND SACHAUFWAND', 'CHF ' + U.fmt(opex));

    // Compliance: Fristen, PEP, Postzustellung
    const overdue = Game.overdueAlerts();
    overdue.forEach(function () { heat('EBK', 0.35, 'Overdue compliance alerts'); });
    Game.activeClients().forEach(function (c) {
      if (c.risk === 'PEP') heat('EBK', closing >= '2003-07-01' ? 0.07 : 0.04, 'PEP relationships (ongoing)');
      if (c.risk === 'Increased') heat('EBK', 0.015, 'Increased-risk relationships (ongoing)');
      const auth = homeAuth(c);
      if (auth && !c.holdMail && c.declared < 1) {
        heat(auth, 0.05 * (1 - c.declared) * Math.min(1, Game.clientAUM(c.id) / 4e6), 'Statements mailed to clients abroad');
      }
    });
    L('STEP060', 'TRANSAKTIONSUEBERWACHUNG', Game.openAlerts().length + ' OFFEN' + (overdue.length ? ', ' + overdue.length + ' UEBERFAELLIG' : ''));
    if (overdue.length) warn.push('alerts');

    // Fristen bei Behörden
    s.messages.forEach(function (m) {
      if (m.resolved || !m.due || m.due >= closing) return;
      if (m.kind === 'mla') {
        const c = Game.client(m.data.client);
        heat('EBK', 4, 'Deadlines missed (authorities)');
        if (c && c.status === 'active') {
          heat(m.data.auth, m.data.fraud ? -5 : 4, 'Mutual assistance – documents produced by court order');
          terminate(c, 'seized');
        }
        m.resolved = { key: 'expired', label: 'Deadline expired', text: 'No response within the deadline. The Federal Office of Justice ordered production of the documents.', d: closing, t: s.clock, by: 'SYSTEM' };
      } else if (m.kind === 'ebk') {
        heat('EBK', 8, 'Deadlines missed (authorities)');
        m.resolved = { key: 'expired', label: 'Deadline expired', text: 'No statement submitted. The EBK has ordered an extraordinary audit.', d: closing, t: s.clock, by: 'SYSTEM' };
        expense('legal', 250000);
      }
    });
    s.messages.forEach(function (m) {
      if (m.kind === 'prospect' && !m.resolved && m.expires && m.expires <= closing) {
        m.resolved = { key: 'expired', label: 'Expired', text: 'No answer within five days – the prospect has opened an account elsewhere.', d: closing, t: s.clock, by: 'SYSTEM' };
      }
    });

    // Natürlicher Abbau der Exposure (nicht protokolliert)
    Object.keys(s.heat).forEach(function (k) {
      s.heat[k] = Math.max(0, s.heat[k] - (k === 'EBK' ? (overdue.length ? 0 : 0.07) : 0.12));
    });
    discretion((62 - s.discretion) * 0.01);
    s.heatHist.push(Object.assign({ d: closing }, s.heat));
    if (s.heatHist.length > 40) s.heatHist.shift();

    // Kundenzufriedenheit
    Game.activeClients().forEach(function (c) {
      c.loyalty = U.clamp(c.loyalty + (72 - c.loyalty) * 0.01, 0, 100);
      if (s.flags.euTax && EU.indexOf(c.dom) >= 0 && !Game.entitiesOf(c.id).length) c.loyalty -= 0.05;
    });

    // Historie AuM
    s.hist.push({ d: closing, aum: round(Game.totalAUM()) });
    if (s.hist.length > 400) s.hist.shift();
    L('STEP070', 'STATISTIK VERWALTETE VERMOEGEN', 'CHF ' + U.fmtMio(Game.totalAUM()));

    // Valutawechsel
    const newDate = U.addBusinessDays(closing, 1);
    s.date = newDate;
    s.dayNo++;
    s.clock = 8 * 60 + rint(0, 12);
    L('STEP080', 'VALUTAWECHSEL', U.fmtDate(newDate));
    const om = +closing.slice(5, 7), nm = +newDate.slice(5, 7);
    if (om !== nm) {
      s.nnm.month = 0;
      if ([1, 4, 7, 10].indexOf(nm) >= 0) {
        const q = 'Q' + (Math.floor((om - 1) / 3) + 1) + '/' + closing.slice(0, 4);
        let tot = 0;
        Game.activeClients().forEach(function (c) {
          if (c.feeAccrued > 0) { charge(c, c.feeAccrued, 'Management fee ' + q); tot += c.feeAccrued; c.feeAccrued = 0; }
        });
        L('STEP085', 'GEBUEHRENBELASTUNG ' + q, 'CHF ' + U.fmt(tot));
      }
      if (nm === 1) yearEnd(closing.slice(0, 4), L);
    }

    // Termine
    const due = s.sched.filter(function (x) { return x.d <= s.date; });
    s.sched = s.sched.filter(function (x) { return x.d > s.date; });
    const evlog = [];
    due.forEach(function (x) { if (SCHEDULED[x.type]) SCHEDULED[x.type](x.data, evlog); });

    // Zeitgeschehen
    D.TIMELINE.forEach(function (t) {
      if (t.d > s.date || s.flags['tl' + t.d]) return;
      s.flags['tl' + t.d] = true;
      if (t.d < D.START_DATE) return;
      if (t.news) s.news.push({ d: s.date, text: t.news });
      if (t.shock) s.pendingShock = t.shock;
      if (t.heat) Object.keys(t.heat).forEach(function (k) { heat(k, t.heat[k], 'Political developments'); });
      if (t.memo) msg({ type: 'memo', from: t.memo.from, subject: t.memo.subject, body: t.memo.body, t: 7 * 60 + 45 });
      if (t.flag) s.flags[t.flag] = true;
      if (t.flag === 'euTax') {
        Game.activeClients().filter(function (c) { return EU.indexOf(c.dom) >= 0 && !Game.entitiesOf(c.id).length; })
          .slice(0, 4).forEach(function (c, i) { schedule(1 + i * 2, 'eutax', { client: c.id }); });
      }
      evlog.push(['EVT', 'ZEITGESCHEHEN', (t.news || '').slice(0, 34).toUpperCase()]);
    });
    const hl = D.HEADLINES.filter(function (h) { return !s.news.slice(-12).some(function (n) { return n.text === h; }); });
    s.news.push({ d: s.date, text: pick(hl) });
    if (chance(0.5)) s.news.push({ d: s.date, text: pick(hl) });
    if (s.news.length > 60) s.news.splice(0, s.news.length - 60);

    // Revision
    const y = s.date.slice(0, 4);
    if (s.date >= y + '-09-15' && !s.flags['audit' + y]) {
      s.flags['audit' + y] = true;
      msg({ type: 'letter', from: 'Hürlimann Revision AG, Zürich (statutory auditor)', subject: 'Annual audit ' + y + ' – start of fieldwork', body: 'Dear Sirs,\n\nAs announced, our audit team will begin fieldwork on your premises today. We will review, on a sample basis, the documentation of client relationships (Form A, client profiles) and the clearing of transaction-monitoring alerts.\n\nPlease make the files available in the meeting room on the 3rd floor.\n\nHürlimann Revision AG' });
      schedule(8, 'auditReport', { year: y });
      evlog.push(['EVT', 'REVISION ' + y, 'BEGINN PRUEFUNG']);
    }

    // Akquisitionsreise
    if (s.trip && s.date > s.trip.until) {
      msg({ type: 'memo', from: 'Relationship Management', subject: 'Back from ' + cname(s.trip.c), body: 'The acquisition trip has ended. Contacts made during the trip may still get in touch over the coming days.' });
      s.trip = null;
    }

    // Zufallsereignisse
    const n = 1 + (chance(0.55) ? 1 : 0) + (chance(0.25) ? 1 : 0);
    const prospectW = 0.6 * (0.4 + s.discretion / 100) * (s.trip ? 3 : 1);
    const table = [['inflow', 3], ['cashIn', 1.5], ['order', 2], ['prospect', prospectW], ['cashOut', 0.8], ['journalist', 0.22]];
    for (let i = 0; i < n; i++) {
      const ev = weighted(table, function (x) { return x[1]; });
      EVENTS[ev[0]](evlog);
    }
    FOREIGN.forEach(function (a) { maybeMLA(a, evlog); });
    maybeEBK(evlog);

    // Kunden, die gehen
    Game.activeClients().forEach(function (c) {
      if (c.funded && c.loyalty < 20 && chance(0.35)) {
        const b = D.bankByBic(pick(['SPBLSGSG', 'KCBKHKHH', 'RTPBLI22', 'NFBTBSNS']));
        const aum = Game.clientAUM(c.id);
        terminate(c, 'leave', b.name + ', ' + b.city);
        discretion(-2);
        msg({ type: 'memo', from: c.rm + ', Relationship Management', subject: 'Client ' + c.rubrik + ' closes relationship', body: 'The client has instructed us to transfer all assets (approx. CHF ' + U.fmtMio(aum) + ') to ' + b.name + ', ' + b.city + ' and to close the relationship. Reason given: "lack of service and of understanding for my situation".\n\n' + c.rm });
        evlog.push(['EVT', 'SALDIERUNG ' + c.rubrik, 'CHF ' + U.fmtMio(aum)]);
      }
    });

    L('STEP090', 'TERMINE UND EREIGNISSE', evlog.length + ' VERARBEITET');
    evlog.forEach(function (e) { log.push(e); });

    checkGameOver();
    save();
    const ok = !warn.length && !s.gameOver;
    return { log: log, rc: s.gameOver ? '0012' : ok ? '0000' : '0004', start: startClock, closing: closing, date: s.date };
  };

  function yearEnd(year, L) {
    const y = s.bank.ytd;
    const rev = y.fees + y.comm + y.fx + y.other;
    const cost = y.opex + y.travel + y.legal;
    const rec = { year: year, rev: rev, cost: cost, profit: rev - cost, capital: s.bank.capital, aum: Game.totalAUM(), nnm: s.nnm.ytd, ytd: Object.assign({}, y) };
    s.annual.push(rec);
    msg({
      type: 'memo', from: D.STAFF.finance + ', Finance & Controlling', subject: 'Annual results ' + year + ' (preliminary)',
      body: 'Preliminary annual results ' + year + ':\n\nTotal revenue: CHF ' + U.fmt(rev) + '\nTotal expenses: CHF ' + U.fmt(cost) + '\nNet profit: CHF ' + U.fmt(rev - cost) + '\n\nAssets under management: CHF ' + U.fmtMio(rec.aum) + '\nNet new money: CHF ' + U.fmtMio(rec.nnm) + '\nEquity capital: CHF ' + U.fmtMio(s.bank.capital) + '\n\n' + D.STAFF.finance
    });
    s.bank.ytd = { fees: 0, comm: 0, fx: 0, other: 0, opex: 0, travel: 0, legal: 0 };
    s.nnm.ytd = 0;
    // Jahresgebühren
    Game.activeClients().forEach(function (c) {
      if (c.holdMail) { charge(c, 600, 'Hold mail fee (banklagernd) ' + (+year + 1)); income('comm', 600); }
    });
    s.entities.forEach(function (e) {
      if (e.dissolved) return;
      const c = Game.client(e.bo);
      if (!c || c.status !== 'active') return;
      const j = D.JURIS[e.jur];
      charge(c, j.annual, 'Annual fees ' + e.name);
      income('other', j.annual * 0.25);
    });
    L('STEP087', 'JAHRESABSCHLUSS ' + year, 'GEWINN CHF ' + U.fmt(rev - cost));
  }

  /* ---------- Spielende ---------- */
  function checkGameOver() {
    if (s.gameOver) return;
    const B = D.BANK;
    if (s.heat.EBK >= 100) {
      s.gameOver = {
        kind: 'EBK', paper: 'Eidgenössische Bankenkommission',
        head: 'EBK withdraws banking licence of ' + B.name,
        sub: 'Liquidator appointed – "serious and repeated breaches of due-diligence obligations"',
        body: 'The Swiss Federal Banking Commission has withdrawn the licence of the Zurich private bank ' + B.name + ' with immediate effect (Art. 23quinquies BankG) and appointed a liquidator. According to the Commission, the bank\'s management no longer offered the guarantee of irreproachable business conduct (Art. 3 para. 2 lit. c BankG). The investigation found systematic shortcomings in the clearing of transaction-monitoring alerts and in the handling of high-risk relationships.'
      };
    } else if (s.bank.capital < D.MIN_CAPITAL) {
      s.gameOver = {
        kind: 'CAP', paper: 'Zürcher Finanzblatt',
        head: B.name + ' fails – capital below legal minimum',
        sub: 'EBK orders protective measures; clients\' deposits frozen',
        body: 'The equity capital of the 132-year-old private bank has fallen below the legal minimum of CHF 10 million (Art. 4 BankV). The Federal Banking Commission has ordered protective measures and closed the bank\'s counters. Legal costs, fines and a shrinking client base had eroded the bank\'s reserves.'
      };
    } else {
      const k = FOREIGN.find(function (a) { return s.heat[a] >= 100; });
      if (!k) return;
      const T = {
        US: ['US indicts Zurich private bank', 'Grand jury charges ' + B.name + ' with conspiracy to defraud the United States (18 U.S.C. § 371)', 'A federal grand jury has indicted ' + B.name + ' and its managing partner for helping US taxpayers to hide income from the Internal Revenue Service. US correspondent banks have closed the bank\'s dollar accounts with immediate effect; without dollar clearing the bank cannot continue to operate. The managing partner has been advised not to leave Switzerland.'],
        DE: ['Arrest warrant against Zurich banker', 'German prosecutors accuse ' + B.short + ' of aiding tax evasion on a large scale (§ 370 AO)', 'German prosecutors have issued an arrest warrant against the managing partner of ' + B.name + ' for aiding and abetting tax evasion. Documents of numerous German clients have been seized in nationwide raids. Clients are withdrawing their assets en masse; the partners have decided to wind up the bank.'],
        IT: ['Guardia di Finanza dismantles "Swiss channel"', 'Milan prosecutors charge ' + B.short + ' employees with abetting tax evasion and money laundering', 'In a large-scale operation the Guardia di Finanza has uncovered a network of couriers carrying cash from Lombardy to ' + B.name + ' in Zurich. Italian prosecutors have charged the bank\'s representatives; Italian clients are fleeing. The bank is to be wound up.'],
        FR: ['Paris investigating judge targets Zurich bank', B.name + ' charged with laundering the proceeds of tax fraud', 'A Paris investigating judge has charged ' + B.name + ' with "blanchiment de fraude fiscale". Lists of French clients are in the hands of the authorities. The partners announce the orderly wind-down of the bank.'],
        GB: ['Inland Revenue obtains disclosure orders', 'UK courts order disclosure of ' + B.short + ' client data held via London correspondents', 'British courts have granted the Inland Revenue sweeping disclosure orders against the London correspondents of ' + B.name + '. The bank has lost its sterling clearing and its British clients. The partners have decided to wind up the bank.']
      }[k];
      s.gameOver = { kind: k, paper: 'Zürcher Finanzblatt', head: T[0], sub: T[1], body: T[2] };
    }
    s.gameOver.d = s.date;
    s.gameOver.days = s.dayNo;
    s.gameOver.aum = Game.totalAUM();
    s.gameOver.peak = Math.max.apply(null, s.hist.map(function (h) { return h.aum; }).concat([s.gameOver.aum]));
    s.gameOver.capital = s.bank.capital;
  }
  Game.checkGameOver = checkGameOver;
})(window.PBS);
