/* PBS/Web 4.2 – Kundenstamm und Produkte: Konten, Banklagernd, Formular A, Strukturen, Schrankfächer,
   Lombard- und Back-to-back-Kredite, Kreditkarten, Buchungszentren, Neukunden */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }
  function activeClient(cid) {
    const c = G.client(cid);
    return c && c.status === 'active' ? c : null;
  }

  /* ---------- Beziehung beenden ---------- */
  K.terminate = function (c, mode, extra) {
    const s = S();
    const texts = {
      leave: 'Closing transfer to ' + (extra || 'other bank') + ' – client instruction',
      seized: 'Blocked – transfer per order of the Federal Office of Justice',
      mros: 'Blocked – report to MROS (Art. 9 GwG)',
      offboard: 'Closing transfer – relationship terminated by the bank',
      died: 'Transfer to heirs / estate',
      unfunded: ''
    };
    s.loans.forEach(function (l) { if (l.client === c.id && l.status === 'active') l.status = 'closed'; });
    G.clientAccounts(c.id).forEach(function (a) {
      a.pledged = 0;
      if (Math.abs(a.bal) > 0.0005) K.book(a, -a.bal, texts[mode], { kind: 'close', ext: true });
      a.closed = true;
    });
    c.status = 'closed';
    c.closed = { d: s.date, mode: mode };
    s.payments.forEach(function (p) { if (p.client === c.id && p.status === 'pending') p.status = 'cancelled'; });
    s.counter = s.counter.filter(function (k) { return k.client !== c.id; });
    s.couriers.forEach(function (k) { if (k.client === c.id && k.status === 'requested') k.status = 'cancelled'; });
    s.boxes.forEach(function (b) { if (b.client === c.id) b.status = 'free'; });
    s.cards.forEach(function (x) { if (x.client === c.id) x.status = 'cancelled'; });
    s.agenda.forEach(function (a) { if (a.client === c.id && a.status === 'open') a.status = 'cancelled'; });
    s.alerts.forEach(function (a) {
      if (a.client === c.id && a.status === 'open') {
        a.status = mode === 'mros' ? 'reported' : 'closed';
        a.res = { just: 'terminated', comment: 'Relationship terminated', d: s.date, t: s.clock, by: s.user.id };
      }
    });
    s.entities.forEach(function (e) { if (e.bo === c.id) e.dissolved = s.date; });
    K.note(c, 'Relationship closed (' + mode + ').', s.user.id);
  };

  /* ---------- Stammdaten ---------- */
  G.openAccount = function (cid, ccy, type, entityId, strat) {
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    if (entityId) {
      const e = G.entity(entityId);
      if (!e || e.bo !== cid) return K.err('Structure is not held by this client.');
    }
    const t = K.use(6);
    if (t) return t;
    const acc = K.openAccount(c, ccy, type, entityId, strat);
    G.save();
    return { ok: true, acc: acc };
  };

  G.setHoldMail = function (cid, on) {
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    const t = K.use(5);
    if (t) return t;
    c.holdMail = !!on;
    if (on) {
      K.charge(c, S().pricing.holdMail, 'Hold mail fee (banklagernd) – annual');
      K.income('comm', S().pricing.holdMail);
      K.loyal(c, 4);
      K.note(c, 'Hold-mail agreement signed (banklagernde Korrespondenz).', S().user.id);
    } else {
      K.loyal(c, -6);
      K.note(c, 'Hold mail cancelled – statements will be mailed to ' + c.city + '.', S().user.id);
    }
    G.save();
    return { ok: true };
  };

  G.requestFormA = function (cid) {
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    if (c.formA) return K.err('Form A is already on file.');
    if (c.formAPending) return K.err('Form A has already been requested.');
    const t = K.use(4);
    if (t) return t;
    c.formAPending = true;
    K.schedule(K.rint(2, 4), 'formA', { client: cid });
    K.note(c, 'Form A (declaration of beneficial owner) sent to client for signature.', S().user.id);
    G.save();
    return { ok: true };
  };
  K.sched.formA = function (d, log) {
    const c = activeClient(d.client);
    if (!c) return;
    c.formAPending = false;
    if (K.chance(0.7 + c.loyalty / 400 - (c.traits.indexOf('secretive') >= 0 ? 0.2 : 0))) {
      c.formA = S().date;
      K.note(c, 'Form A returned, signed by the client.');
      K.msg({ type: 'letter', from: c.rubrik + ' (by post, hold mail)', subject: 'Form A returned signed – ' + c.rubrik, body: 'Enclosed please find the Form A (declaration of beneficial owner) duly signed.\n\n[signature]  ' + c.rubrik });
      log.push(['EVT', 'FORMULAR A EINGEGANGEN ' + c.rubrik, 'OK']);
    } else {
      K.loyal(c, -4);
      K.note(c, 'Client refuses to sign Form A.');
      K.msg({ type: 'memo', from: G.rmName(c) + ', Relationship Management', subject: 'Form A refused – ' + c.rubrik, body: 'The client refuses to sign the Form A, considers it "an unnecessary risk" and asks the bank not to raise the subject again.\n\n' + G.rmName(c) });
      log.push(['EVT', 'FORMULAR A VERWEIGERT ' + c.rubrik, 'WARNUNG']);
    }
  };

  G.addNote = function (cid, text) {
    const c = G.client(cid);
    if (!c || !text) return K.err('Note is empty.');
    const t = K.use(3);
    if (t) return t;
    K.note(c, text, S().user.id);
    G.save();
    return { ok: true };
  };

  G.assignRM = function (cid, sid) {
    const c = activeClient(cid);
    const r = G.staff(sid);
    if (!c || !r || r.role !== 'rm' || r.status !== 'active') return K.err('Select an active relationship manager.');
    const t = K.use(3);
    if (t) return t;
    const old = G.rmName(c);
    c.rm = sid;
    K.loyal(c, -2);
    K.note(c, 'Relationship transferred from ' + old + ' to ' + r.name + '.', S().user.id);
    G.save();
    return { ok: true };
  };

  G.offboard = function (cid) {
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    const t = K.use(20);
    if (t) return t;
    const auth = K.homeAuth(c);
    const aum = G.clientAUM(cid);
    K.terminate(c, 'offboard');
    if (auth) K.heat(auth, -Math.min(6, 1 + aum / 1e7 * (1 - c.declared)), 'Relationships closed');
    if (c.risk === 'PEP') K.heat('EBK', -4, 'PEP relationship closed');
    K.discretion(-1);
    G.checkGameOver();
    G.save();
    return { ok: true };
  };

  // Freiwillige Offenlegung empfehlen (Selbstanzeige im Heimatland)
  G.disclosureChance = function (c) {
    const s = S();
    let p = 0.3 + (s.date >= '2010-01-01' ? 0.2 : 0) + (s.date >= '2014-01-01' ? 0.25 : 0);
    const auth = K.homeAuth(c);
    if (auth) p += s.heat[auth] / 250;
    if (c.traits.indexOf('secretive') >= 0) p -= 0.2;
    if (c.traits.indexOf('nervous') >= 0) p += 0.1;
    if (c.risk === 'PEP') p -= 0.25;
    return U.clamp(p, 0.05, 0.95);
  };
  G.recommendDisclosure = function (cid, inMeeting) {
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    if (c.declared >= 1) return K.err('The assets are already declared.');
    if (!inMeeting) { const t = K.use(15); if (t) return t; }
    const auth = K.homeAuth(c);
    if (K.chance(G.disclosureChance(c))) {
      const aum = G.clientAUM(cid);
      c.declared = 1;
      c.regularised = S().date;
      K.loyal(c, -4);
      if (auth) K.heat(auth, -Math.min(5, aum / 1e7), 'Clients regularised (voluntary disclosure)');
      K.note(c, 'Client has filed a voluntary disclosure with the home tax authority. Assets now declared.', S().user.id);
      G.save();
      return { ok: true, accepted: true, text: c.name + ' agrees to file a voluntary disclosure. The account is now declared – lower margins from now on, but no more risk.' };
    }
    K.loyal(c, -12);
    K.note(c, 'Recommended voluntary disclosure. Client refused angrily.', S().user.id);
    if (K.chance(0.35)) K.schedule(K.rint(3, 10), 'leave', { client: cid, reason: 'pressure to disclose' });
    G.save();
    return { ok: true, accepted: false, text: c.name + ' refuses. "I did not come to a Swiss bank to be sent to my tax office." The relationship has suffered.' };
  };

  /* ---------- Strukturen (Sitzgesellschaften, Stiftungen, Trusts, Versicherungsmäntel) ---------- */
  G.suggestEntityName = function (jur) {
    const j = D.JURIS[jur];
    const w = D.ENTITY_WORDS;
    if (j.suffix === 'Stiftung') return K.pick(w.a) + ' ' + K.pick(['Familienstiftung', 'Stiftung']);
    if (j.suffix === 'Anstalt') return K.pick(w.a) + ' ' + K.pick(['Invest', 'Finanz', 'Holding', 'Treuhand']) + ' Anstalt';
    if (j.suffix === 'Trust') return 'The ' + K.pick(w.a) + ' ' + K.pick(['Family', 'Heritage', 'Settlement']) + ' Trust';
    if (j.suffix === 'Policy') return 'Rheintal Life policy no. ' + K.rint(40000, 89999) + '-' + K.rint(10, 99);
    return K.pick(w.a) + ' ' + K.pick(w.b) + ' ' + j.suffix;
  };

  G.createEntity = function (cid, jur, name, withAccount, ccy) {
    const s = S();
    const c = activeClient(cid);
    const j = D.JURIS[jur];
    if (!c) return K.err('Relationship is not active.');
    if (!j) return K.err('Select a jurisdiction.');
    name = String(name || '').trim();
    if (name.length < 4) return K.err('Enter the name of the structure.');
    if (s.entities.some(function (e) { return e.name.toLowerCase() === name.toLowerCase(); })) return K.err('A structure of that name already exists in the register.');
    if (G.clientAUM(cid) < j.setup * 3) return K.err('Client assets insufficient to cover set-up costs.');
    const t = K.use(20);
    if (t) return t;
    const e = { id: 'E' + U.pad(++s.ctr.ent, 2), name: name, jur: jur, inc: s.date, bo: cid };
    s.entities.push(e);
    K.charge(c, j.setup, 'Set-up ' + name + ' (' + j.label + ')');
    K.income('other', j.setup * 0.35);
    K.note(c, j.form + ' ' + name + ' set up via ' + j.agent + '. Form A lists ' + c.name + ' as beneficial owner.', s.user.id);
    K.loyal(c, 3);
    if (s.date >= '2009-01-01' && c.declared < 1) K.specialService(c, 'new offshore structure');
    let acc = null;
    if (withAccount) acc = K.openAccount(c, ccy || 'USD', 'CUR', e.id);
    G.save();
    return { ok: true, entity: e, acc: acc };
  };

  /* ---------- Schrankfächer ---------- */
  G.vaultCapacity = function () {
    const s = S();
    return Object.keys(s.branches).reduce(function (t, k) { return t + (D.LOCATIONS[k].boxes || 0); }, 0) + (s.vaultExtra || 0);
  };
  G.boxesUsed = function () { return S().boxes.filter(function (b) { return b.status === 'active'; }).length; };
  G.rentBox = function (cid, size) {
    const s = S();
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    const sz = D.BOX_SIZES[size];
    if (!sz) return K.err('Select a box size.');
    if (G.boxesUsed() >= G.vaultCapacity()) return K.err('The vault is full. Extend the vault (Organisation › Branches) or open a branch.');
    const t = K.use(10);
    if (t) return t;
    const n = ++s.ctr.box;
    const b = { id: 'SF-' + U.pad(n, 4), client: cid, size: size, fee: sz.fee, opened: s.date, status: 'active' };
    s.boxes.push(b);
    K.charge(c, sz.fee, 'Safe-deposit box ' + b.id + ' – annual rent');
    K.income('comm', sz.fee);
    K.loyal(c, 4);
    K.note(c, 'Safe-deposit box ' + b.id + ' (' + sz.label + ') rented.', s.user.id);
    G.save();
    return { ok: true, box: b };
  };
  G.extendVault = function () {
    const s = S();
    const t = K.use(20);
    if (t) return t;
    K.expense('premises', 450000);
    s.vaultExtra = (s.vaultExtra || 0) + 100;
    G.save();
    return { ok: true };
  };

  /* ---------- Kredite ---------- */
  G.lombardLimit = function (cid) {
    const accs = G.clientAccounts(cid);
    const coll = accs.reduce(function (t, a) { return t + (a.type === 'DEP' ? a.bal * 0.5 : a.type === 'MET' ? K.valueCHF(a) * 0.6 : 0); }, 0);
    const used = S().loans.filter(function (l) { return l.client === cid && l.type === 'lombard' && l.status === 'active'; })
      .reduce(function (t, l) { return t + l.amount * K.rate(l.ccy); }, 0);
    return Math.max(0, coll - used);
  };
  G.grantLombard = function (cid, amount, ccy) {
    const s = S();
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    if (!(amount > 0)) return K.err('Enter the loan amount.');
    if (amount * K.rate(ccy) > G.lombardLimit(cid) + 1) return K.err('Exceeds the lending value of the collateral (CHF ' + U.fmt(G.lombardLimit(cid), 0) + ').');
    const t = K.use(20);
    if (t) return t;
    const acc = K.ensureAccount(c, ccy, null);
    const l = { id: 'LK-' + U.pad(++s.ctr.loan, 4), client: cid, type: 'lombard', amount: amount, ccy: ccy, opened: s.date, status: 'active', accrued: 0, acc: acc.id };
    s.loans.push(l);
    K.book(acc, amount, 'Lombard loan ' + l.id + ' – disbursement', { kind: 'loan' });
    K.loyal(c, 4);
    K.note(c, 'Lombard loan ' + ccy + ' ' + U.fmt(amount, 0) + ' granted against portfolio collateral.', s.user.id);
    G.save();
    return { ok: true, loan: l };
  };
  G.repayLoan = function (id) {
    const s = S();
    const l = s.loans.find(function (x) { return x.id === id; });
    if (!l || l.status !== 'active') return K.err('Loan is not active.');
    const c = G.client(l.client);
    const t = K.use(8);
    if (t) return t;
    if (l.type === 'lombard') {
      const acc = G.account(l.acc);
      if (!acc || G.available(acc) < l.amount) return K.err('Insufficient funds on ' + l.acc + ' to repay ' + l.ccy + ' ' + U.fmt(l.amount) + '.');
      K.book(acc, -l.amount, 'Lombard loan ' + l.id + ' – repayment', { kind: 'loan' });
    } else {
      const acc = G.account(l.acc);
      if (acc) acc.pledged = Math.max(0, (acc.pledged || 0) - l.amount);
    }
    l.status = 'closed';
    K.note(c, 'Loan ' + l.id + ' repaid / released.', s.user.id);
    G.save();
    return { ok: true };
  };
  // Back-to-back: Guthaben in Zürich sichert einen Kredit der Korrespondenzbank im Heimatland
  G.arrangeB2B = function (cid, amount, accId) {
    const s = S();
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    const acc = G.account(accId);
    if (!acc || acc.client !== cid || acc.type !== 'CUR') return K.err('Select a current account of the client as collateral.');
    if (!(amount > 0) || amount > G.available(acc)) return K.err('Collateral account has insufficient available balance.');
    const banks = D.banksIn(c.dom);
    if (!banks.length) return K.err('No correspondent bank in ' + K.cname(c.dom) + '.');
    const t = K.use(30);
    if (t) return t;
    const bank = banks[0];
    acc.pledged = (acc.pledged || 0) + amount;
    const l = { id: 'BB-' + U.pad(++s.ctr.loan, 4), client: cid, type: 'b2b', amount: amount, ccy: acc.ccy, opened: s.date, status: 'active', accrued: 0, acc: acc.id, bank: bank.name + ', ' + bank.city };
    s.loans.push(l);
    c.b2b = true;
    K.loyal(c, 12);
    K.personal(4, 'Back-to-back loans');
    K.specialService(c, 'back-to-back loan');
    const auth = K.homeAuth(c);
    if (auth) K.heat(auth, 0.5, 'Back-to-back loans');
    K.note(c, 'Back-to-back loan arranged: ' + bank.name + ' lends ' + acc.ccy + ' ' + U.fmt(amount, 0) + ' to the client at home, secured by pledge of account ' + acc.id + '.', s.user.id);
    G.save();
    return { ok: true, loan: l };
  };

  /* ---------- Kreditkarten über Offshore-Bank ---------- */
  G.issueCard = function (cid) {
    const s = S();
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    if (s.cards.some(function (x) { return x.client === cid && x.status === 'active'; })) return K.err('Client already holds a card.');
    const t = K.use(10);
    if (t) return t;
    const card = { id: 'CC-' + U.pad(++s.ctr.card, 4), client: cid, issuer: 'Nassau Fidelity Bank & Trust Ltd.', limit: K.roundTo(Math.min(250000, c.wealth * 0.01), 5000), opened: s.date, status: 'active' };
    s.cards.push(card);
    K.charge(c, s.pricing.card, 'Card fee ' + card.id);
    K.income('comm', s.pricing.card);
    K.loyal(c, 4);
    K.note(c, 'Gold card issued via ' + card.issuer + ' (no reference to Switzerland). Monthly settlement debited here.', s.user.id);
    G.save();
    return { ok: true, card: card };
  };
  G.cancelCard = function (id) {
    const x = S().cards.find(function (k) { return k.id === id; });
    if (!x || x.status !== 'active') return K.err('Card not active.');
    const t = K.use(3);
    if (t) return t;
    x.status = 'cancelled';
    G.save();
    return { ok: true };
  };

  /* ---------- Buchung bei Tochterbank im Ausland ---------- */
  G.bookOffshore = function (cid, loc) {
    const s = S();
    const c = activeClient(cid);
    if (!c) return K.err('Relationship is not active.');
    if (loc && !s.branches[loc]) return K.err('The booking centre has not been opened.');
    const t = K.use(20);
    if (t) return t;
    const fee = G.clientAUM(cid) * 0.0025;
    K.charge(c, fee, loc ? 'Transfer of booking to ' + D.LOCATIONS[loc].name : 'Transfer of booking back to Zürich');
    K.income('comm', fee);
    c.booking = loc || null;
    K.loyal(c, loc ? 5 : -2);
    K.note(c, loc ? 'Assets now booked with ' + D.LOCATIONS[loc].name + '.' : 'Booking transferred back to Zürich.', s.user.id);
    G.save();
    return { ok: true };
  };

  /* ---------- Neukunden ---------- */
  K.freshWord = function () {
    const s = S();
    const free = D.CODEWORDS.filter(function (w) { return s.usedWords.indexOf(w) < 0; });
    const w = free.length ? K.pick(free) : K.pick(D.CODEWORDS) + '-' + K.rint(2, 9);
    s.usedWords.push(w);
    return w;
  };
  K.family = function (c, bornYear) {
    const N = D.NAMES[c] || D.NAMES.GB;
    const kids = [];
    const n = K.rint(0, 3);
    for (let i = 0; i < n; i++) kids.push(K.pick(N.m.concat(N.f)) + ' (' + (bornYear + K.rint(24, 36)) + ')');
    return { spouse: K.chance(0.8) ? K.pick(N.f) + ' (' + (bornYear + K.rint(-2, 6)) + ')' : '', children: kids };
  };
  K.genProspect = function (forceC) {
    const s = S();
    const boost = function (p) {
      let w = p.weight;
      Object.keys(s.branches).forEach(function (k) { const L = D.LOCATIONS[k]; if (L.boost && L.boost[p.c]) w *= L.boost[p.c]; });
      return w;
    };
    const pool = forceC ? D.PROSPECTS.filter(function (p) { return p.c === forceC; }) : D.PROSPECTS;
    const p = K.weighted(pool, boost);
    const N = D.NAMES[p.c];
    const female = K.chance(0.2);
    const name = (female ? N.mrs : N.mr) + ' ' + K.pick(female ? N.f : N.m) + ' ' + K.pick(N.l);
    const scale = s.date < '2001-01-01' ? 0.8 : s.date >= '2008-01-01' ? 1.25 : 1;
    const wealth = K.roundTo(p.w[0] * scale * Math.pow(p.w[1] / p.w[0], K.rnd()), 100000);
    const ccy = K.localCcy(p.c);
    const amount = K.roundTo(wealth * K.between(0.35, 0.8) / K.rate(ccy), ccy === 'ITL' ? 10000000 : 10000);
    const method = K.chance(p.cash) ? 'cash' : (p.offshore || K.chance(0.3) ? 'offshore' : (K.chance(0.55) ? 'home' : 'ch'));
    const born = K.rint(1932, 1970);
    const fee = K.round(K.between(p.fee[0], p.fee[1]), 4);
    return {
      c: p.c, name: name, city: K.pick(p.cities), occ: K.pick(p.occ), sow: K.pick(p.sow), wealth: wealth, ccy: ccy, amount: amount,
      method: method, risk: p.risk, fee: fee, refuseA: K.chance(p.refuseA), declared: K.chance(s.date >= '2010-01-01' ? 0.35 : 0.12) ? 1 : 0,
      born: born + '-' + U.pad(K.rint(1, 12), 2) + '-' + U.pad(K.rint(1, 28), 2), intro: K.pick(p.intro),
      family: K.family(p.c, born), traits: [K.pick(Object.keys(D.TRAITS))], sting: K.chance(K.stingChance(p.c))
    };
  };
  K.prospectMessage = function (pr, time) {
    const methodText = {
      cash: 'to be deposited in cash, delivered by courier in several tranches',
      home: 'to be transferred from ' + K.cname(pr.c) + ' by bank transfer',
      offshore: 'to be transferred from an existing offshore structure',
      ch: 'to be transferred from another Swiss bank'
    }[pr.method];
    const referral = pr.intro.indexOf('existing client') === 0 || pr.intro.indexOf('follows') === 0;
    const rm = K.deskRM(pr.c);
    const body = (referral ? (pr.intro.indexOf('follows') === 0 ? 'A client of my former employer ' : 'Our client ' + pr.intro.replace('existing client ', '') + ' has recommended us to an acquaintance: ') : 'Dear Sirs,\n\nWe have the pleasure of introducing to you ') +
      pr.name + ' of ' + pr.city + ' (' + K.cname(pr.c) + '), ' + pr.occ.charAt(0).toLowerCase() + pr.occ.slice(1) + '.\n\n' +
      'The prospective client wishes to open a numbered relationship with your esteemed house. Estimated assets: approx. ' + pr.ccy + ' ' + U.fmt(pr.amount, 0) +
      ' as a first tranche, ' + methodText + '. Source of wealth: ' + pr.sow.toLowerCase() + '.\n\n' +
      (pr.declared ? 'The client\'s assets are declared to the home tax authority; the client seeks diversification and Swiss stability.' : 'The client attaches the greatest importance to absolute discretion and requests hold mail.') +
      (pr.refuseA ? ' The client is NOT prepared to sign a Form A (declaration of beneficial owner).' : '') +
      (pr.sting ? '\n\nThe client is in a hurry: he would like the account opened "this week" and asked whether the bank could also "help with the paperwork at home".' : '') +
      (referral ? '\n\n' + (rm ? rm.name : 'Relationship Management') : '\n\nWe would be grateful for your early confirmation.\n\nYours faithfully,\n' + pr.intro);
    return K.msg({
      t: time || S().clock, type: referral ? 'memo' : 'letter', kind: 'prospect',
      from: referral ? (rm ? rm.name : 'Relationship Management') + ', Relationship Management' : pr.intro,
      subject: 'New relationship: ' + pr.name + ', ' + pr.city, body: body,
      actions: [['accept', 'Accept relationship'], ['check', 'Background check (CHF 5,000)'], ['decline', 'Decline']],
      data: { prospect: pr }, expires: U.addBusinessDays(S().date, 5)
    });
  };
  // RM des zuständigen Desks mit freier Kapazität
  K.deskRM = function (country) {
    const rms = G.activeStaff('rm');
    if (!rms.length) return null;
    const load = function (r) { return G.activeClients().filter(function (c) { return c.rm === r.id; }).length / G.rmCapacity(r); };
    const desk = rms.filter(function (r) { return (r.desk || []).indexOf(country) >= 0; });
    const pool = desk.length ? desk : rms;
    return pool.sort(function (a, b) { return load(a) - load(b); })[0];
  };
  K.acceptProspect = function (pr) {
    const s = S();
    s.ctr.stamm += K.rint(7, 29);
    const sid = String(s.ctr.stamm);
    const id = sid.slice(0, 3) + '.' + sid.slice(3);
    const rm = K.deskRM(pr.c);
    const c = {
      id: id, rubrik: K.freshWord(), name: pr.name, type: 'Individual', nat: pr.c, dom: pr.c, city: pr.city, born: pr.born,
      occ: pr.occ, sow: pr.sow, wealth: pr.wealth, declared: pr.declared, risk: pr.risk, formA: pr.refuseA ? null : s.date,
      holdMail: !pr.declared, since: s.date, rm: rm ? rm.id : null, fee: pr.fee, loyalty: 66, status: 'active', funded: false, feeAccrued: 0,
      formAPending: false, notes: [], traits: pr.traits, family: pr.family, sting: !!pr.sting, nextReview: U.addBusinessDays(s.date, K.rint(60, 240))
    };
    s.clients.push(c);
    K.note(c, 'Relationship opened. Introduced by ' + pr.intro + '.' + (c.holdMail ? ' Hold mail agreed.' : '') + (pr.refuseA ? ' Client refused to sign Form A.' : ''), s.user.id);
    K.openAccount(c, pr.ccy, 'CUR');
    if (pr.ccy !== 'CHF') K.openAccount(c, 'CHF', 'CUR');
    if (pr.risk === 'PEP') K.heat('EBK', s.date >= '2003-07-01' ? 4 : 2, 'PEP relationships opened');
    if (pr.risk === 'Increased') K.heat('EBK', 1, 'Increased-risk relationships opened');
    if (pr.method === 'cash') {
      const n = pr.amount * K.rate(pr.ccy) > 500000 ? 3 : pr.amount * K.rate(pr.ccy) > 200000 ? 2 : 1;
      const step = pr.ccy === 'ITL' ? 10000000 : 5000;
      const part = K.roundTo(pr.amount / n, step);
      for (let i = 0; i < n; i++) {
        K.schedule(1 + i * 2, 'visit', { client: id, type: 'in', ccy: pr.ccy, amount: i === n - 1 ? pr.amount - part * (n - 1) : part, courier: true, funding: true, note: 'Initial deposit, tranche ' + (i + 1) + ' of ' + n });
      }
    } else {
      K.schedule(K.rint(1, 3), 'funding', { client: id, amount: pr.amount, ccy: pr.ccy, method: pr.method });
    }
    return c;
  };
  G.handlers.prospect = function (m, key) {
    const pr = m.data.prospect;
    if (key === 'decline') return { text: 'Introducer informed that the bank is unable to accept the relationship.' };
    if (key === 'check') {
      K.expense('legal', 5000);
      const found = pr.sting ? K.chance(0.8) : K.chance(0.05);
      m.data.checked = found ?
        'Report of Detektei Hürlimann: inconsistencies found. The company named as source of wealth was registered only weeks ago; references could not be reached; the passport was issued recently. Possible undercover investigator.' :
        'Report of Detektei Hürlimann: no anomalies. Identity, company and references confirmed.';
      m.actions = m.actions.filter(function (a) { return a[0] !== 'check'; });
      return { text: m.data.checked, keep: true, min: 20 };
    }
    const c = K.acceptProspect(pr);
    m.data.client = c.id;
    return { text: 'Relationship ' + c.id + ' / ' + c.rubrik + ' opened and assigned to ' + G.rmName(c) + '. Funding (' + pr.ccy + ' ' + U.fmt(pr.amount, 0) + ') expected in the coming days.' };
  };
})(window.PBS);
