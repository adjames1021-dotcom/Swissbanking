/* PBS/Web 4.2 – Zahlungsverkehr: Überwachung, SWIFT-Aufträge, Kontoüberträge, Kasse, Kurierdienst */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  const tr = PBS.L.t;
  function S() { return G.state; }

  /* ---------- Exposure einer Zahlung ---------- */
  // Abschirmung durch Buchungszentrum im Ausland
  K.bookingShield = function (c) {
    if (!c.booking) return 1;
    const L = D.LOCATIONS[c.booking];
    return S().date >= L.lateFrom ? L.shieldLate : L.shield;
  };
  K.exposure = function (client, acc, country, chf, o) {
    o = o || {};
    const res = [];
    const undecl = 1 - (client.declared || 0);
    if (undecl <= 0 || !country) return res;
    let base = Math.min(14, 0.5 + chf / 1e6 * 2.6) * undecl * K.bookingShield(client);
    if (acc && acc.entity) {
      const e = G.entity(acc.entity);
      if (e) base *= D.JURIS[e.jur].shield;
    }
    if (o.hidden) base *= 0.5;
    if (o.incoming) base *= o.incoming;
    const cauth = D.COUNTRIES[country] && D.COUNTRIES[country].auth;
    const home = K.homeAuth(client);
    if (home && client.dom === country) res.push([home, base]);
    else if (cauth) res.push([cauth, base * 0.12]);
    if (o.ccy === 'USD' && home === 'US' && country !== 'US') res.push(['US', base * 0.15]);
    return res.filter(function (r) { return r[1] >= 0.01; }).map(function (r) { return [r[0], K.round(r[1], 2)]; });
  };

  /* ---------- Transaktionsüberwachung ---------- */
  K.rulesFor = function (client, chf, o) {
    const s = S();
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
      const inflow = s.tx.filter(function (t) { return t.client === client.id && t.d >= since && t.ext && t.amt > 0; })
        .reduce(function (t, x) { return t + x.chf; }, 0);
      if (inflow >= 0.8 * a) hits.push('TM-06');
    }
    if (client.risk === 'PEP' && a >= 100000) hits.push('TM-07');
    if (o.hidden && s.date >= '2003-07-01') hits.push('TM-08');
    if (a > 0.3 * client.wealth && !o.funding) hits.push('TM-09');
    if (!s.flags.gwg && s.date < '1998-04-01') return hits.filter(function (h) { return h === 'TM-02'; });
    return hits;
  };
  K.raise = function (hits, client, tx, desc) {
    const s = S();
    if (!hits.length) return null;
    const a = {
      id: 'AL-' + U.pad(++s.ctr.alert, 4), d: s.date, t: s.clock, due: U.addBusinessDays(s.date, 10),
      rules: hits, client: client.id, acc: tx ? tx.acc : '', tx: tx ? tx.id : '', chf: tx ? Math.abs(tx.chf) : 0,
      desc: desc, status: 'open', weak: false, res: null
    };
    s.alerts.unshift(a);
    return a;
  };

  /* ---------- Konten ---------- */
  K.openAccount = function (c, ccy, type, entityId, strat) {
    const s = S();
    const seq = s.accounts.filter(function (a) { return a.client === c.id; }).length + 1;
    const acc = {
      id: c.id + '.' + U.pad(seq, 2), client: c.id, entity: entityId || null, type: type,
      ccy: type === 'MET' ? 'XAU' : type === 'DEP' ? 'CHF' : ccy, bal: 0, opened: s.date, closed: false, pledged: 0
    };
    if (type === 'DEP') { acc.strat = strat || 'balanced'; acc.idx = 100; acc.idxY = 100; }
    s.accounts.push(acc);
    return acc;
  };
  K.ensureAccount = function (c, ccy, entityId) {
    const found = G.clientAccounts(c.id).find(function (a) {
      return a.type === 'CUR' && a.ccy === ccy && (a.entity || null) === (entityId || null);
    });
    return found || K.openAccount(c, ccy, 'CUR', entityId);
  };
  // Konto für Gebührenbelastungen: CHF-Kontokorrent, sonst grösstes Kontokorrent, sonst Depot
  K.feeAccount = function (c) {
    const accs = G.clientAccounts(c.id);
    const cur = accs.filter(function (a) { return a.type === 'CUR'; }).sort(function (a, b) { return K.valueCHF(b) - K.valueCHF(a); });
    return cur.find(function (a) { return a.ccy === 'CHF' && !a.entity && a.bal > 0; }) || cur[0] ||
      accs.find(function (a) { return a.type === 'DEP'; }) || accs[0];
  };
  K.charge = function (c, chf, text) {
    const acc = K.feeAccount(c);
    if (!acc) return null;
    return K.book(acc, -chf / (acc.type === 'DEP' ? 1 : K.rate(acc.ccy)), text, { kind: 'fee' });
  };
  G.available = function (acc) { return acc.bal - (acc.pledged || 0); };

  /* ---------- Zahlungsaufträge ---------- */
  K.newPayment = function (o, source) {
    const s = S();
    const n = ++s.ctr.pay;
    const p = Object.assign({
      id: 'P' + U.pad(n, 4), ref: 'VC' + U.swiftDate(s.date) + U.pad(n, 4), d: s.date, t: s.clock, source: source || 'manual',
      status: 'pending', charges: 'SHA', hideOrig: false, valuta: s.date, purpose: '', benefAddr: '', benefAcct: ''
    }, o);
    p.amount = +p.amount;
    const acc = G.account(p.debit);
    p.client = acc ? acc.client : null;
    p.chf = K.round(p.amount * K.rate(p.ccy));
    s.payments.unshift(p);
    return p;
  };

  G.wireFee = function (chf, charges) {
    let f = Math.min(750, Math.max(40, 40 + chf * 0.0005));
    if (charges === 'OUR') f += 25;
    if (S().corr.fee) f += S().corr.fee;
    return K.round(f);
  };

  G.precheck = function (p) {
    const s = S();
    const errors = [];
    const acc = G.account(p.debit);
    const amount = +p.amount;
    if (!acc) errors.push(tr('Debit account (Belastungskonto) is missing.', 'Debit account is missing.'));
    if (!(amount > 0)) errors.push('Field 32A: amount must be greater than zero.');
    if (!p.benefName) errors.push('Field 59: beneficiary name is missing.');
    if (!p.bic || String(p.bic).length < 8) errors.push('Field 57A: BIC of beneficiary institution is missing or incomplete.');
    if (!p.country || !D.COUNTRIES[p.country]) errors.push('Beneficiary country is missing.');
    if (G.currencies().indexOf(p.ccy) < 0) errors.push('Field 32A: currency ' + p.ccy + ' is not available.');
    if (p.ccy === 'USD' && s.corr.status !== 'active') errors.push('No USD correspondent bank. US dollar payments are suspended.');
    if (errors.length) return { errors: errors, hits: [], notes: [] };
    const client = G.client(acc.client);
    if (acc.type !== 'CUR') errors.push(tr('Payments can only be debited to a current account (Kontokorrent).', 'Payments can only be debited to a current account.'));
    if (client.status !== 'active' || acc.closed) errors.push('Relationship is blocked or closed.');
    const chf = amount * K.rate(p.ccy);
    const debitAmt = p.ccy === acc.ccy ? amount : chf * (1 + D.FX_SPREAD) / K.rate(acc.ccy);
    const fee = G.wireFee(chf, p.charges);
    const feeAcc = fee / K.rate(acc.ccy);
    if (G.available(acc) + 0.005 < debitAmt + feeAcc) {
      errors.push('Insufficient funds on ' + acc.id + ': available ' + acc.ccy + ' ' + U.fmt(G.available(acc), K.dec(acc.ccy)) + (acc.pledged ? ' (pledged ' + U.fmt(acc.pledged, K.dec(acc.ccy)) + ')' : '') + ', required ' + acc.ccy + ' ' + U.fmt(debitAmt + feeAcc, K.dec(acc.ccy)) + '.');
    }
    const hits = K.rulesFor(client, chf, { out: true, country: p.country, hidden: p.hideOrig, cp: p.benefAcct || p.benefName });
    const notes = K.exposure(client, acc, p.country, chf, { hidden: p.hideOrig, ccy: p.ccy });
    return { errors: errors, hits: hits, notes: notes, chf: chf, debitAmt: debitAmt, fee: fee, feeAcc: feeAcc, acc: acc, client: client };
  };

  G.submitPayment = function (o) {
    const chk = G.precheck(o);
    if (chk.errors.length) return K.err(chk.errors.join(' '));
    const t = K.use(8);
    if (t) return t;
    const p = K.newPayment(o, 'manual');
    G.save();
    return { ok: true, p: p };
  };

  G.updatePayment = function (id, ch) {
    const p = S().payments.find(function (x) { return x.id === id; });
    if (!p || p.status !== 'pending') return K.err('Payment is no longer pending.');
    const acc = G.account(ch.debit);
    if (!acc || acc.client !== p.client || acc.type !== 'CUR') return K.err('Debit account must be a current account of the same relationship.');
    const t = K.use(2);
    if (t) return t;
    p.debit = acc.id;
    p.hideOrig = !!ch.hideOrig;
    p.charges = ch.charges || p.charges;
    G.save();
    return { ok: true };
  };

  G.releasePayment = function (id) {
    const s = S();
    const p = s.payments.find(function (x) { return x.id === id; });
    if (!p || p.status !== 'pending') return K.err('Payment is no longer pending.');
    const chk = G.precheck(p);
    if (chk.errors.length) return K.err(chk.errors.join(' '));
    const t = K.use(4);
    if (t) return t;
    const acc = chk.acc, client = chk.client;
    const bank = D.bankByBic(p.bic);
    if (p.ccy !== acc.ccy) K.income('fx', chk.chf * D.FX_SPREAD);
    const tx = K.book(acc, -chk.debitAmt, 'Payment ' + p.ccy + ' ' + U.fmt(p.amount, K.dec(p.ccy)) + ' / ' + p.benefName,
      { kind: 'wire-out', cp: p.benefName + (bank ? ', ' + bank.name : ''), country: p.country, ref: p.ref, ext: true, valuta: p.valuta });
    K.book(acc, -chk.feeAcc, 'Commission payment order ' + p.ref, { kind: 'fee', ref: p.ref });
    K.income('comm', chk.fee);
    const al = K.raise(chk.hits, client, tx, 'Outgoing payment ' + p.ccy + ' ' + U.fmt(p.amount, K.dec(p.ccy)) + ' to ' + p.benefName + ' (' + K.cname(p.country) + ')');
    chk.notes.forEach(function (n) { K.heat(n[0], n[1], n[0] === K.homeAuth(client) ? 'Payments into clients\' home countries' : 'Payments via ' + K.cname(p.country)); });
    if (p.hideOrig) {
      if (s.date >= '2003-07-01') K.personal(0.4, 'Payments without originator name');
      K.specialService(client, 'payment without originator name');
    }
    p.status = 'released';
    p.released = s.date;
    p.rt = s.clock;
    p.tx = tx.id;
    p.alert = al ? al.id : null;
    p.fee = chk.fee;
    p.chf = K.round(chk.chf);
    if (p.source === 'client') K.loyal(client, 3);
    G.checkGameOver();
    G.save();
    return { ok: true, p: p, alert: al };
  };

  G.rejectPayment = function (id) {
    const p = S().payments.find(function (x) { return x.id === id; });
    if (!p || p.status !== 'pending') return K.err('Payment is no longer pending.');
    const t = K.use(3);
    if (t) return t;
    p.status = 'rejected';
    p.released = S().date;
    const c = G.client(p.client);
    if (p.source === 'client' && c) {
      K.loyal(c, -15);
      K.note(c, 'Payment order ' + p.ref + ' (' + p.ccy + ' ' + U.fmt(p.amount, K.dec(p.ccy)) + ') rejected by the bank. Client informed, displeased.');
    }
    G.save();
    return { ok: true };
  };

  /* ---------- Kontoübertrag ---------- */
  G.transferPreview = function (fromId, toId, amount) {
    const from = G.account(fromId), to = G.account(toId);
    if (!from || !to || !(amount > 0)) return null;
    const fr = from.type === 'DEP' ? 1 : K.rate(from.ccy);
    const tr = to.type === 'DEP' ? 1 : K.rate(to.ccy);
    const chf = amount * fr;
    const spread = from.ccy === to.ccy ? 0 : (from.type === 'MET' || to.type === 'MET' ? 0.006 : 0.0025);
    const brok = (from.type === 'DEP' || to.type === 'DEP') ? chf * 0.004 : 0;
    const credit = (chf * (1 - spread) - brok) / tr;
    return { chf: chf, spread: spread, brok: brok, credit: credit };
  };

  G.transfer = function (fromId, toId, amount, text) {
    const from = G.account(fromId), to = G.account(toId);
    if (!from || !to) return K.err('Please select both accounts.');
    if (from.id === to.id) return K.err('Debit and credit account are identical.');
    if (!(amount > 0)) return K.err('Amount must be greater than zero.');
    if (G.available(from) + 1e-6 < amount) return K.err('Insufficient available balance on ' + from.id + ' (' + from.ccy + ' ' + U.fmt(G.available(from), K.dec(from.ccy)) + ').');
    const cf = G.client(from.client), ct = G.client(to.client);
    if (cf.status !== 'active' || ct.status !== 'active' || from.closed || to.closed) return K.err('Relationship is blocked or closed.');
    const t = K.use(4);
    if (t) return t;
    const pv = G.transferPreview(fromId, toId, amount);
    if (pv.spread) K.income('fx', pv.chf * pv.spread);
    if (pv.brok) K.income('comm', pv.brok);
    const dtext = text || (from.type === 'DEP' ? 'Sale of securities' : from.type === 'MET' ? 'Sale of fine gold 999.9' : 'Transfer to ' + to.id);
    const ctext = text || (to.type === 'DEP' ? 'Purchase of securities' : to.type === 'MET' ? 'Purchase of fine gold 999.9' : 'Transfer from ' + from.id);
    const t1 = K.book(from, -amount, dtext, { kind: 'int-out', cp: to.id });
    K.book(to, pv.credit, ctext, { kind: 'int-in', cp: from.id });
    let al = null;
    if (cf.id !== ct.id) al = K.raise(K.rulesFor(cf, pv.chf, { out: true }), cf, t1, 'Internal transfer to ' + to.id + ' (' + ct.rubrik + ')');
    G.save();
    return { ok: true, credit: pv.credit, alert: al };
  };

  /* ---------- Kasse ---------- */
  G.counterAccept = function (id) {
    const s = S();
    const k = s.counter.find(function (x) { return x.id === id; });
    if (!k) return K.err('Visit not found.');
    if (!G.activeStaff('teller').length) return K.err('The cash desk is not staffed. Hire a teller first (Organisation › Staff).');
    const c = G.client(k.client);
    const chf = k.amount * K.rate(k.ccy);
    let al = null;
    if (k.type === 'in') {
      const t = K.use(10);
      if (t) return t;
      const acc = K.ensureAccount(c, k.ccy, null);
      const tx = K.book(acc, k.amount, 'Cash deposit ' + k.ccy + ' banknotes' + (k.courier ? ' (courier)' : ''), { kind: 'cash-in', ext: true });
      const fee = Math.max(50, chf * 0.003);
      K.book(acc, -fee / K.rate(acc.ccy), 'Cash handling commission 0.30%', { kind: 'fee' });
      K.income('comm', fee);
      al = K.raise(K.rulesFor(c, chf, { cash: true, funding: k.funding }), c, tx, 'Cash deposit ' + k.ccy + ' ' + U.fmt(k.amount, K.dec(k.ccy)) + ' at counter' + (k.courier ? ' (courier)' : ''));
      K.loyal(c, 3);
      if (k.funding && !c.funded) { c.funded = true; K.note(c, 'Initial deposit received at counter.'); }
    } else {
      const accs = G.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR'; });
      let acc = accs.find(function (a) { return a.ccy === k.ccy && G.available(a) >= k.amount; });
      let debit = k.amount;
      if (!acc) {
        acc = accs.filter(function (a) { return G.available(a) * K.rate(a.ccy) >= chf * 1.003; })
          .sort(function (a, b) { return K.valueCHF(b) - K.valueCHF(a); })[0];
        if (!acc) return K.err('Insufficient funds on current accounts. Securities would have to be sold first.');
        debit = chf * 1.0025 / K.rate(acc.ccy);
        K.income('fx', chf * 0.0025);
      }
      const t = K.use(10);
      if (t) return t;
      const tx = K.book(acc, -debit, 'Cash withdrawal ' + k.ccy + ' ' + U.fmt(k.amount, K.dec(k.ccy)), { kind: 'cash-out', ext: true });
      const fee = Math.max(30, chf * 0.001);
      K.book(acc, -fee / K.rate(acc.ccy), 'Cash withdrawal commission', { kind: 'fee' });
      K.income('comm', fee);
      al = K.raise(K.rulesFor(c, chf, { cash: true }), c, tx, 'Cash withdrawal ' + k.ccy + ' ' + U.fmt(k.amount, K.dec(k.ccy)) + ' at counter');
      // Bargeld über die Grenze – ausser es bleibt im Schrankfach
      const auth = K.homeAuth(c);
      const box = s.boxes.some(function (b) { return b.client === c.id && b.status === 'active'; });
      if (auth && chance(Math.min(0.45, 0.04 + chf / 700000) * (box ? 0.4 : 1) * K.diff().threat)) K.schedule(K.rint(1, 3), 'border', { client: c.id, ccy: k.ccy, amount: k.amount });
      K.loyal(c, 2);
    }
    s.counter = s.counter.filter(function (x) { return x.id !== id; });
    G.checkGameOver();
    G.save();
    return { ok: true, alert: al };
  };
  function chance(p) { return K.chance(p); }

  G.counterRefuse = function (id) {
    const s = S();
    const k = s.counter.find(function (x) { return x.id === id; });
    if (!k) return K.err('Visit not found.');
    const t = K.use(3);
    if (t) return t;
    const c = G.client(k.client);
    K.loyal(c, k.type === 'in' ? -12 : -15);
    K.note(c, (k.type === 'in' ? 'Cash deposit' : 'Cash withdrawal') + ' of ' + k.ccy + ' ' + U.fmt(k.amount, K.dec(k.ccy)) + ' refused at the counter.');
    s.counter = s.counter.filter(function (x) { return x.id !== id; });
    if (k.funding && !c.funded) K.terminate(c, 'unfunded');
    G.save();
    return { ok: true };
  };

  /* ---------- Kurierdienst ("Spalloni") ---------- */
  G.courierRisk = function (k) {
    const s = S();
    const c = G.client(k.client);
    const auth = K.homeAuth(c) || 'IT';
    const couriers = G.activeStaff('courier');
    const skill = couriers.length ? Math.max.apply(null, couriers.map(function (x) { return x.skill; })) : 1;
    let p = 0.03 + (s.heat[auth] || 0) / 500 + k.amount * K.rate(k.ccy) / 8e6;
    p *= (6 - skill) / 4;
    if (s.branches.LU && c.dom === 'IT') p *= D.LOCATIONS.LU.courier;
    if (s.inv[auth] && s.inv[auth].stage >= 2) p *= 1.6;
    return Math.min(0.6, p * K.diff().threat);
  };
  G.courierApprove = function (id) {
    const s = S();
    const k = s.couriers.find(function (x) { return x.id === id; });
    if (!k || k.status !== 'requested') return K.err('Request no longer open.');
    const couriers = G.activeStaff('courier').filter(function (x) { return !x.busyUntil || x.busyUntil < s.date; });
    if (!couriers.length) return K.err('No courier available. Hire a courier (Organisation › Recruitment).');
    const t = K.use(10);
    if (t) return t;
    const cr = couriers.sort(function (a, b) { return b.skill - a.skill; })[0];
    cr.busyUntil = U.addBusinessDays(s.date, 2);
    k.status = 'scheduled';
    k.courier = cr.id;
    k.risk = G.courierRisk(k);
    K.schedule(K.rint(1, 2), 'courierRun', { id: k.id });
    K.personal(1.5, 'Organised cash courier runs');
    G.save();
    return { ok: true };
  };
  G.courierDecline = function (id) {
    const s = S();
    const k = s.couriers.find(function (x) { return x.id === id; });
    if (!k || k.status !== 'requested') return K.err('Request no longer open.');
    const t = K.use(3);
    if (t) return t;
    k.status = 'declined';
    K.loyal(G.client(k.client), -6);
    G.save();
    return { ok: true };
  };
  K.sched.courierRun = function (d, log) {
    const s = S();
    const k = s.couriers.find(function (x) { return x.id === d.id; });
    if (!k || k.status !== 'scheduled') return;
    const c = G.client(k.client);
    const cr = G.staff(k.courier);
    const auth = K.homeAuth(c) || 'IT';
    if (!c || c.status !== 'active') { k.status = 'cancelled'; return; }
    if (K.chance(k.risk)) {
      k.status = 'seized';
      K.heat(auth, 14, 'Bank courier arrested at the border');
      K.personal(8, 'Bank courier arrested');
      K.investigate(auth, 10, 'Courier arrested with client cash');
      K.loyal(c, -25);
      K.discretion(-5);
      if (cr) { cr.status = 'arrested'; cr.left = s.date; }
      K.msg({
        type: 'memo', kind: 'info', from: 'Claudio Moretti, desk Italy', subject: 'URGENT: courier arrested at the border',
        body: 'Our courier ' + (cr ? cr.name : '') + ' was stopped this morning at ' + (c.dom === 'IT' ? 'Brogeda (Chiasso)' : 'the border') + ' carrying ' + k.ccy + ' ' + U.fmt(k.amount, 0) + ' in cash collected from ' + c.rubrik + '.\n\nThe money was seized. He is being questioned by the ' + G.authShort(auth) + ' and we have to assume he will make a statement. Client informed, furious.'
      });
      log.push(['EVT', tr('KURIER VERHAFTET ', 'COURIER ARRESTED ') + c.rubrik, tr('WARNUNG', 'WARNING')]);
    } else {
      k.status = 'done';
      const acc = K.ensureAccount(c, k.ccy, null);
      const tx = K.book(acc, k.amount, 'Cash deposit ' + k.ccy + ' (courier service)', { kind: 'cash-in', ext: true });
      const fee = k.amount * K.rate(k.ccy) * s.pricing.courier;
      K.book(acc, -fee / K.rate(acc.ccy), 'Courier service commission', { kind: 'fee' });
      K.income('comm', fee);
      K.raise(K.rulesFor(c, k.amount * K.rate(k.ccy), { cash: true }), c, tx, 'Cash deposit ' + k.ccy + ' ' + U.fmt(k.amount, 0) + ' (courier service)');
      K.loyal(c, 6);
      log.push(['EVT', tr('KURIERFAHRT ', 'COURIER RUN ') + c.rubrik, k.ccy + ' ' + U.fmt(k.amount, 0)]);
    }
  };
})(window.PBS);
