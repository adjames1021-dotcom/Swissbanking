/* PBS/Web 4.2 – Neues Spiel: Szenario, Kundenstamm, Personal, Historie, Startmeldungen */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  const tr = PBS.L.t;
  function S() { return G.state; }

  G.newGame = function (o) {
    o = o || {};
    const scKey = D.SCENARIOS[o.scenario] ? o.scenario : '2003';
    const sc = D.SCENARIOS[scKey];
    const diffKey = D.DIFFICULTY[o.diff] ? o.diff : 'standard';
    const start = sc.start;
    const s = G.state = {
      v: 2, seed: 19980302 + (+scKey), meta: { scenario: scKey, diff: diffKey, name: o.name || 'Managing Partner', started: start, era: sc.era || 'classic', end: sc.end || D.END_DATE },
      user: { id: o.userId || 'E10001', last: { d: U.addBusinessDays(start, -1), t: 17 * 60 + 42, ws: sc.era === 'modern' ? 'ZH-NB-1147' : 'ZH-BS64-0217' } },
      date: start, clock: 8 * 60 + 4, dayNo: 1, overtime: 0, today: { ops: 0 },
      market: {}, prevMarket: {}, mhist: [], idio: {}, classRet: {},
      bank: { capital: sc.capital * D.DIFFICULTY[diffKey].capital, ytd: K.ytdZero() },
      annual: [], discretion: sc.discretion, heat: Object.assign({}, sc.heat), heatLog: [], heatHist: [], personalLog: [],
      clients: [], accounts: [], entities: [], tx: [], payments: [], alerts: [], messages: [], counter: [], couriers: [],
      sched: [], audits: [], news: [], hist: [], agenda: [], staff: [], candidates: [], boxes: [], loans: [], cards: [], targets: [], inv: {},
      branches: { ZH: { opened: '1871-04-01' } }, legal: {}, lobby: {},
      corr: { name: D.USD_CORRESPONDENTS[0], status: 'active', since: '1985-01-01', fee: 0 },
      pricing: { level: 'standard', holdMail: 600, card: 400, courier: 0.025, courierOn: false },
      house: { alloc: {}, intensity: 'normal', pref: 'direct', icDate: null }, bench: {}, nostro: { pos: {} },
      career: { stake: 0.08, wealth: 350000, exposure: 4, missStreak: 0, confidence: 65, history: [], targets: null },
      delegate: true,
      ctr: { tx: 10000, pay: 0, alert: 0, msg: 0, visit: 0, ent: 6, stamm: 101400, agenda: 0, staff: 13, cand: 0, box: 0, loan: 0, card: 0, courier: 0, target: 0 },
      nnm: { month: 0, ytd: 0 }, trip: null, flags: {}, pendingShock: null, gameOver: null, usedWords: []
    };
    Object.keys(D.STRATS).forEach(function (st) {
      s.house.alloc[st] = Object.assign({}, D.STRATS[st].bench);
      s.bench[st] = { idx: 100, idxY: 100 };
    });
    K.marketInit(start);

    (sc.staff || D.STAFF).forEach(function (x) {
      if (x.hired <= start) s.staff.push(Object.assign({ status: 'active', known: {} }, JSON.parse(JSON.stringify(x))));
    });

    // Moderne Szenarien bringen eigene Kunden, Mitarbeitende und Gesellschaften mit
    const include = sc.clients ? sc.clients.filter(function (c) { return c.since <= start; }) : D.CLIENTS.filter(function (c) { return sc.exclude.indexOf(c.id) < 0 && c.since <= start; })
      .concat(D.CLIENTS_2008.filter(function (c) { return sc.extra.indexOf(c.id) >= 0; }));
    const ids = include.map(function (c) { return c.id; });
    (sc.entities || D.ENTITIES).forEach(function (e) { if (ids.indexOf(e.bo) >= 0 && e.inc <= start) s.entities.push(Object.assign({}, e)); });
    include.forEach(function (src) {
      const c = {
        id: src.id, rubrik: src.rubrik, name: src.name, type: 'Individual', nat: src.nat, dom: src.dom, city: src.city,
        born: src.born, occ: src.occ, sow: src.sow, wealth: src.wealth * sc.scale, declared: src.declared, risk: src.risk,
        formA: src.formA, holdMail: src.holdMail, since: src.since, rm: src.rm, fee: src.fee, loyalty: src.loyalty,
        status: 'active', funded: true, feeAccrued: 0, formAPending: false, traits: src.traits.slice(),
        family: JSON.parse(JSON.stringify(src.family)), nextReview: U.addBusinessDays(start, K.rint(3, 240)),
        notes: src.notes.filter(function (n) { return n[0] < start; }).map(function (n) { return { d: n[0], who: n[1], text: n[2] }; })
      };
      s.clients.push(c);
      s.usedWords.push(c.rubrik);
      s.ctr.stamm = Math.max(s.ctr.stamm, +c.id.replace('.', ''));
      src.accounts.forEach(function (a, i) {
        if (a[3] && !s.entities.some(function (e) { return e.id === a[3]; })) return;
        let ccy = a[1], bal = a[2] * sc.scale;
        if (ccy === 'EUR' && start < D.EURO_DATE) {
          ccy = (D.COUNTRIES[c.dom] && D.COUNTRIES[c.dom].legacy) || 'DEM';
          bal = bal * D.LEGACY[ccy];
        }
        let opened = a[3] ? s.entities.find(function (e) { return e.id === a[3]; }).inc : c.since;
        if (ccy === 'EUR' && opened < D.EURO_DATE) opened = D.EURO_DATE;
        const acc = { id: c.id + '.' + U.pad(i + 1, 2), client: c.id, entity: a[3] || null, type: a[0], ccy: a[0] === 'DEP' ? 'CHF' : ccy, bal: K.round(bal, K.dec(ccy)), opened: opened, closed: false, pledged: 0 };
        if (a[0] === 'DEP') { acc.strat = a[4] || 'balanced'; acc.idx = 100; acc.idxY = 100; }
        s.accounts.push(acc);
      });
    });

    // Vergangene Ereignisse gelten als bekannt
    D.TIMELINE.forEach(function (t) {
      if (t.d < start) { s.flags['tl' + t.d] = true; if (t.flag) s.flags[t.flag] = true; }
    });
    seedHistory(start);
    seedOpening(start, sc);
    K.genCandidates();
    const frac = 1 - (U.toDate(start) - U.toDate(start.slice(0, 4) + '-01-01')) / (365 * 864e5);
    K.setTargets(start.slice(0, 4), frac);
    targetsMemo(start);
    s.seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0;
    K.planDay();
    G.agendaFor(start).forEach(function (a) { if (a.kind === 'call') a.t = Math.max(a.t, 11 * 60); });
    G.save();
    return s;
  };

  function seedHistory(start) {
    const s = S();
    const aum = G.totalAUM();
    const last = s.mhist[s.mhist.length - 1];
    s.hist = s.mhist.slice(-60).map(function (m) {
      return { d: m.d, aum: K.round(aum * (1 + 0.35 * (m.SMI / last.SMI - 1)) * (1 + 0.003 * K.gauss())) };
    });
    s.hist[s.hist.length - 1].aum = K.round(aum * 0.998);
    for (let i = 10; i >= 1; i--) {
      const o = { d: U.addBusinessDays(start, -i) };
      Object.keys(s.heat).forEach(function (k) { o[k] = K.round(Math.max(0, s.heat[k] - i * 0.25 + K.gauss() * 0.6), 2); });
      s.heatHist.push(o);
    }
    const past = D.TIMELINE.filter(function (t) { return t.d < start && t.news; }).slice(-2);
    s.news = past.map(function (t) { return { d: t.d, text: t.news }; }).concat([
      { d: U.addBusinessDays(start, -1), text: K.pick(D.HEADLINES.any) },
      { d: start, text: 'Swiss Bankers Association reaffirms commitment to client confidentiality' }
    ]);
  }

  // Eröffnungssalden, Bewegungen seit Jahresbeginn, offene Pendenzen
  function seedOpening(start, sc) {
    const s = S();
    const y0 = (+start.slice(0, 4) - 1) + '-12-31';
    const firstMove = U.addBusinessDays(start.slice(0, 4) + '-01-05', 0);
    const span = Math.max(5, U.businessDaysBetween(firstMove, start) - 3);
    const has = function (id) { return !!G.client(id); };
    const accOf = function (cid, pred) { return s.accounts.find(function (a) { return a.client === cid && pred(a); }); };
    const special = {};
    const add = function (acc, mv) { if (acc) (special[acc.id] = special[acc.id] || []).push(mv); };
    const dCash = U.addBusinessDays(start, -5), dWire = U.addBusinessDays(start, -2), dOld = U.addBusinessDays(start, -28);
    const eurOf = function (c) { return start < D.EURO_DATE ? (D.COUNTRIES[c].legacy || 'DEM') : 'EUR'; };
    const cashC = has('101.004') ? '101.004' : '100.517';
    const cashAcc = accOf(cashC, function (a) { return a.type === 'CUR' && a.ccy === eurOf('IT'); });
    const cashAmt = cashAcc ? K.roundTo(48000 * K.rate('EUR') / K.rate(cashAcc.ccy), cashAcc.ccy === 'ITL' ? 1000000 : 1000) : 0;
    add(cashAcc, [dCash, cashAmt, 'Cash deposit ' + (cashAcc ? cashAcc.ccy : '') + ' banknotes', 'cash-in', '', '']);
    const wireC = has('100.802') ? '100.802' : '100.815';
    const wireAcc = accOf(wireC, function (a) { return a.type === 'CUR' && a.ccy === 'USD'; });
    const wireBank = wireC === '100.802' ? D.bankByBic('BORIVECA') : D.bankByBic('VLGCRUMM');
    add(wireAcc, [dWire, 2400000, 'Incoming payment / ' + wireBank.name + ', ' + wireBank.city, 'wire-in', wireBank.name.toUpperCase(), wireBank.c]);
    const oldAcc = accOf('100.517', function (a) { return a.type === 'CUR' && a.ccy === eurOf('IT'); });
    const oldAmt = oldAcc ? K.roundTo(150000 * K.rate('EUR') / K.rate(oldAcc.ccy), oldAcc.ccy === 'ITL' ? 1000000 : 1000) : 0;
    add(oldAcc, [dOld, oldAmt, 'Cash deposit ' + (oldAcc ? oldAcc.ccy : '') + ' banknotes (courier)', 'cash-in', '', '']);

    const firstCur = {};
    s.accounts.forEach(function (a) { if (a.type === 'CUR' && !a.entity && !firstCur[a.client]) firstCur[a.client] = a.id; });
    s.accounts.forEach(function (acc) {
      const c = G.client(acc.client);
      const moves = (special[acc.id] || []).slice();
      const rate = acc.type === 'DEP' ? 1 : K.rate(acc.ccy);
      if (acc.type === 'CUR') {
        if (firstCur[c.id] === acc.id) {
          const q = G.clientAUM(c.id) * c.fee / 4;
          moves.push([U.addBusinessDays(y0, 2), -K.round(q / rate, K.dec(acc.ccy)), 'Management fee Q4/' + y0.slice(0, 4), 'fee', '', '']);
        }
        const nMoves = special[acc.id] || (D.COINS || []).some(function (x) { return x.id === acc.ccy; }) ? 0 : K.rint(0, 2);
        for (let i = 0; i < nMoves; i++) {
          const day = U.addBusinessDays(firstMove, K.rint(0, span));
          const amt = K.roundTo(acc.bal * K.between(0.01, 0.05), acc.ccy === 'ITL' ? 1000000 : 1000);
          if (K.chance(0.55)) {
            const b = K.pick(D.banksIn(c.dom).concat(D.HAVEN_BANKS.map(D.bankByBic)));
            moves.push([day, amt, 'Incoming payment / ' + b.name + ', ' + b.city, 'wire-in', b.name.toUpperCase(), b.c]);
          } else {
            moves.push([day, -amt, 'Payment order / ' + K.pick(['Hotel Baur au Lac, Zürich', 'Galerie Koller, Zürich', 'Montres Gübelin', 'Rheintaler Privatbank AG, Vaduz', 'Sotheby\'s, London']), 'wire-out', '', '']);
          }
        }
      }
      if (acc.type === 'DEP') moves.push([U.addBusinessDays(y0, 21), K.round(acc.bal * 0.0042), 'Coupon and dividend income', 'sec', '', '']);
      moves.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
      const net = moves.reduce(function (t, m) { return t + m[1]; }, 0);
      const target = acc.bal;
      acc.bal = K.round(target - net, acc.type === 'DEP' ? 2 : K.dec(acc.ccy));
      s.tx.push({ id: 'T' + (++s.ctr.tx), d: y0, val: y0, t: 18 * 60, acc: acc.id, client: acc.client, amt: acc.bal, ccy: acc.ccy, bal: acc.bal, text: 'Balance carried forward', kind: 'open', cp: '', c: '', ref: '', chf: K.round(acc.bal * rate), ext: false });
      moves.forEach(function (m) {
        K.book(acc, m[1], m[2], { date: m[0], time: K.rint(8 * 60 + 30, 16 * 60 + 50), kind: m[3], cp: m[4], country: m[5], ext: m[3] !== 'fee' && m[3] !== 'sec' });
      });
      acc.bal = target;
    });
    s.tx.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : a.t - b.t; });
    s.today.ops = 0;

    const txOf = function (acc, d) { return acc ? s.tx.find(function (t) { return t.acc === acc.id && t.d === d && t.kind !== 'open'; }) : null; };
    const mk = function (id, d, t, due, rules, cid, acc, desc, open, res) {
      const tx = txOf(acc, d);
      return { id: id, d: d, t: t, due: due, rules: rules, client: cid, acc: acc ? acc.id : '', tx: tx ? tx.id : '', chf: tx ? Math.abs(tx.chf) : 0, desc: desc, status: open ? 'open' : 'closed', weak: false, res: res || null };
    };
    const gwgOn = start >= '1998-04-01';
    const alerts = [];
    if (oldAcc) alerts.push(mk('AL-0001', dOld, 10 * 60 + 12, U.addBusinessDays(dOld, 10), ['TM-01'], '100.517', oldAcc, 'Cash deposit ' + oldAcc.ccy + ' ' + U.fmt(oldAmt, 0) + ' at counter (courier)', false, { just: 'income', comment: 'Seasonal business income, consistent with profile. Courier known to the bank.', d: U.addBusinessDays(dOld, 2), t: 14 * 60 + 5, by: 'Claudio Moretti' }));
    const cashClient = G.client(cashC);
    if (cashAcc && gwgOn) alerts.push(mk('AL-0002', dCash, 11 * 60 + 40, U.addBusinessDays(dCash, 10), cashClient.formA ? ['TM-01'] : ['TM-01', 'TM-05'], cashC, cashAcc, 'Cash deposit ' + cashAcc.ccy + ' ' + U.fmt(cashAmt, 0) + ' at counter', true));
    const wireClient = G.client(wireC);
    if (wireAcc) alerts.push(mk('AL-0003', dWire, 15 * 60 + 2, U.addBusinessDays(dWire, 10), wireClient.risk === 'PEP' ? ['TM-02', 'TM-07'] : ['TM-02'], wireC, wireAcc, 'Incoming payment USD 2,400,000.00 from ' + wireBank.name + ', ' + wireBank.city + ' (' + wireBank.c + ')', true));
    s.alerts = alerts.reverse();
    s.ctr.alert = 3;

    // Startmeldungen
    if (sc.era === 'modern') {
      s.date = start;
      if (K.modernOpening) K.modernOpening(start, sc);
      s.messages.forEach(function (m) { m.read = false; });
      s.clock = 8 * 60 + 4;
      return;
    }
    s.clock = 7 * 60 + 50;
    s.date = U.addBusinessDays(start, -1);
    const n = G.activeClients().length;
    const intro = {
      '1998': 'Banking secrecy is as solid as it has ever been, and no foreign authority can reach our clients. The only changes ahead are the new Money Laundering Act in April and the euro next January.',
      '2003': 'Markets are at their lowest since 1997. The EU is negotiating a savings tax with Berne, and the regulator\'s stricter money-laundering ordinance takes effect in July. For a discreet bank, business is nevertheless very good.',
      '2008': 'The stolen Liechtenstein data are all over the German papers, and the Americans are going after Swiss bankers. I am afraid the good years are coming to an end. Please be careful.'
    }[s.meta.scenario];
    K.msg({
      t: 17 * 60 + 5, type: 'memo', from: D.PARTNERS.senior + ', Senior Partner', subject: 'Handover of management',
      body: 'Dear colleague,\n\nAs agreed among the partners, you take over the operational management of the bank as of ' + U.longDate(start) + '. I remain available as Senior Partner; the day-to-day decisions are yours from now on.\n\n' + intro + '\n\nWe manage roughly CHF ' + Math.round(G.totalAUM() / 1e6) + ' million for ' + n + ' relationships, with ' + s.staff.length + ' staff. Most clients come from neighbouring countries and are, let us say, not overly troubled by their home tax authorities.\n\nPlease keep the legal position in mind. Tax evasion by a foreign client is not a criminal offence in Switzerland; tax fraud is. Banking secrecy (Art. 47 BankG) protects our clients. Foreign authorities see this differently, and the regulator in Berne checks that we observe our due-diligence duties.\n\nA few practical points:\n• Office hours are 08:00 to 18:00; security locks the building at 20:00. Everything you do takes time, so delegate what you can.\n• Payments into a client\'s home country leave a paper trail. Structures (Liechtenstein, BVI, trusts), hold mail and booking abroad reduce it.\n• Clear transaction-monitoring alerts on time. The compliance team handles the routine cases.\n• Look after the staff. Unhappy people leave, and some take more with them than their personal belongings.\n• The partners review your targets at the end of each year. Your bonus is paid into your private numbered account.\n\nWith kind regards,\n' + D.PARTNERS.senior
    });
    s.date = start;
    K.msg({
      type: 'memo', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'Open alerts', t: 7 * 60 + 52,
      body: 'Good morning,\n\n' + G.openAlerts().length + ' transaction-monitoring alert(s) need your decision (Compliance › Alerts). My team clears the routine cases each evening. Anything involving cash without Form A, PEPs or unusual amounts remains with you.\n\nCapacity of the compliance team: about ' + G.complianceCapacity() + ' alert(s) per day.\n\nI. Wyss'
    });
    const edel = G.client('100.482');
    const edAcc = edel && s.accounts.find(function (a) { return a.client === '100.482' && a.type === 'CUR' && !a.entity && a.ccy !== 'CHF'; });
    if (edAcc) {
      const benefIban = U.iban('DE', '20130600' + '0418822711');
      const amount = K.roundTo(380000 * K.rate('EUR') / K.rate(edAcc.ccy), 1000);
      const p = K.newPayment({
        debit: edAcc.id, ccy: edAcc.ccy, amount: amount, valuta: U.addBusinessDays(start, 1),
        benefName: tr('Notariat Dr. Feddersen, Westerland (Treuhandkonto)', 'Notariat Dr. Feddersen, Westerland (escrow account)'), benefAcct: benefIban, benefAddr: 'Strandstrasse 12, D-25980 Westerland/Sylt',
        country: 'DE', bic: 'ALHBDEHH', purpose: tr('Kaufpreisanzahlung Ferienwohnung', 'Deposit on holiday flat'), charges: 'OUR', hideOrig: false, t: 8 * 60 + 12
      }, 'client');
      K.msg({
        type: 'fax', kind: 'order', from: 'EDELWEISS (fax +49 711 ...)', t: 8 * 60 + 12, subject: 'Payment order ' + edAcc.ccy + ' ' + U.fmt(amount, 0) + ' – EDELWEISS',
        body: tr('TO: BANKHAUS VOGT & CIE, ZUERICH, ATTN. HERRN U. KELLER\n', 'TO: BANKHAUS VOGT & CIE, ZURICH, ATTN. MR U. KELLER\n') + 'RE: NUMBERED ACCOUNT EDELWEISS\n\nPlease transfer ' + edAcc.ccy + ' ' + U.fmt(amount) + ' debiting my ' + edAcc.ccy + ' account to:\n\nBeneficiary: ' + tr('Notariat Dr. Feddersen, Westerland (Treuhandkonto)', 'Notariat Dr. Feddersen, Westerland (escrow account)') + '\nBank: Alster Handelsbank AG, Hamburg (ALHBDEHH)\nAccount: ' + (start < '2002-01-01' ? '418 822 711 (BLZ 201 306 00)' : U.ibanFmt(benefIban)) + '\nPurpose: ' + tr('Kaufpreisanzahlung Ferienwohnung', 'Deposit on holiday flat') + '\nCharges: OUR\n\nValue date tomorrow, please.\n\n' + tr('Mit freundlichen Grüssen', 'Kind regards') + '\n[signature]  EDELWEISS',
        data: { payment: p.id, client: '100.482' }
      });
    }
    const pr = K.genProspect('IT');
    pr.name = 'Ing. Marco Galbiati'; pr.city = 'Brescia'; pr.occ = 'Steel stockholder (own company)'; pr.wealth = 13e6 * sc.scale;
    pr.amount = K.roundTo(9000000 * sc.scale * K.rate('EUR') / K.rate(pr.ccy), pr.ccy === 'ITL' ? 100000000 : 100000);
    pr.method = 'cash'; pr.intro = 'Fiduciaria Monte Brè SA, Lugano'; pr.refuseA = false; pr.fee = 0.0135; pr.sting = false; pr.declared = 0;
    K.prospectMessage(pr, 8 * 60 + 30);
    const visitCcy = start < D.EURO_DATE ? 'ITL' : 'EUR';
    s.counter.push({ id: 'K' + U.pad(++s.ctr.visit, 3), client: '100.517', type: 'in', ccy: visitCcy, amount: K.roundTo(180000 * K.rate('EUR') / K.rate(visitCcy), visitCcy === 'ITL' ? 10000000 : 5000), courier: true, t: 8 * 60 + 40, note: 'Courier (Sig. B.) on behalf of the client, Monday delivery via Chiasso', funding: false });
    s.messages.forEach(function (m) { m.read = false; });
    s.clock = 8 * 60 + 4;
  }

  function targetsMemo(start) {
    const s = S();
    const t = s.career.targets;
    K.msg({
      type: 'memo', from: D.PARTNERS.senior + ' and ' + D.PARTNERS.second + ', Partners', subject: 'Your targets for ' + t.year, t: 7 * 60 + 55,
      body: 'Dear colleague,\n\nThe partners have set the following targets for ' + t.year + ':\n\n1. Assets under management at year end: at least CHF ' + U.fmtMio(t.aum) + '\n2. Net profit for the year: at least CHF ' + U.fmtMio(t.profit, 2) + '\n3. Regulator attention index at year end: at most ' + t.reg + '\n\nRemuneration: ' + U.fmt(s.career.stake * 100, 0) + '% of net profit (partnership share), plus CHF 100,000 for each target achieved and a further CHF 150,000 if all three are met. After two unsatisfactory years in succession we will part ways.\n\nThe partners meet quarterly in the board room.\n\n' + D.PARTNERS.senior + ' / ' + D.PARTNERS.second
    });
  }
})(window.PBS);
