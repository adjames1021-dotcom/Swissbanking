/* PBS/Web 4.2 – Ereignisse: Meldungs-Entscheide, Tagesereignisse, Termine, Lebensereignisse, Zeitgeschehen */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }
  const EU = ['DE', 'IT', 'FR', 'NL', 'AT', 'GR', 'SE', 'GB'];

  /* ---------- Entscheide auf Meldungen ---------- */
  K.actTime = { prospect: { accept: 10, check: 20, decline: 2 }, mla: { object: 15, produce: 15 }, usProgram: { cat2: 60, cat3: 30 }, takeover: { accept: 60, decline: 5 } };
  G.act = function (msgId, key) {
    const s = S();
    const m = s.messages.find(function (x) { return x.id === msgId; });
    if (!m || m.resolved) return K.err('Decision already recorded.');
    const action = m.actions.find(function (a) { return a[0] === key; });
    if (!action || !G.handlers[m.kind]) return K.err('Unknown action.');
    const min = (K.actTime[m.kind] && K.actTime[m.kind][key]) || 8;
    const t = K.use(min);
    if (t) return t;
    const r = G.handlers[m.kind](m, key) || { text: 'Done.' };
    m.read = true;
    if (!r.keep) m.resolved = { key: key, label: action[1], text: r.text, d: s.date, t: s.clock, by: s.user.id };
    G.checkGameOver();
    G.save();
    return { ok: true, text: r.text };
  };
  G.markRead = function (id) {
    const m = S().messages.find(function (x) { return x.id === id; });
    if (m && !m.read) { m.read = true; G.save(); }
  };

  /* ---------- Akquisitionsreise ---------- */
  G.startTrip = function (c, rmId) {
    const s = S();
    if (s.trip) return K.err('A trip is already under way.');
    const dest = D.TRIP_DEST.find(function (t) { return t.c === c; });
    if (!dest) return K.err('Select a destination.');
    const rm = G.staff(rmId);
    if (!rm || rm.role !== 'rm' || rm.status !== 'active') return K.err('Select a relationship manager to send.');
    if (rm.absentUntil && rm.absentUntil >= s.date) return K.err(rm.name + ' is not available.');
    const t = K.use(20);
    if (t) return t;
    s.trip = { c: c, from: s.date, until: U.addBusinessDays(s.date, 5), rm: rmId };
    rm.absentUntil = s.trip.until;
    K.expense('travel', 18000);
    const auth = D.COUNTRIES[c].auth;
    if (auth) {
      K.heat(auth, 2, 'Acquisition trips abroad');
      const inv = s.inv[auth];
      if (inv && inv.stage >= 2 && K.chance(0.15 * inv.stage * K.diff().threat)) K.schedule(K.rint(1, 3), 'rmArrest', { rm: rmId, c: c });
      else if (K.chance(auth === 'US' ? 0.18 : 0.1)) K.schedule(K.rint(1, 3), 'tripIncident', { c: c });
    }
    G.save();
    return { ok: true };
  };
  K.sched.rmArrest = function (d, log) {
    const s = S();
    const rm = G.staff(d.rm);
    if (!rm) return;
    const auth = D.COUNTRIES[d.c].auth;
    rm.status = 'arrested';
    rm.left = s.date;
    K.reassign(rm);
    s.trip = null;
    K.heat(auth, 10, 'Bankers arrested abroad');
    K.investigate(auth, 12, 'Relationship manager arrested during client visits');
    K.discretion(-8);
    K.msg({ type: 'telex', from: 'Correspondent lawyer, ' + D.AUTH[auth].city, subject: 'ARREST OF ' + rm.name.toUpperCase(), body: 'YOUR RELATIONSHIP MANAGER ' + rm.name.toUpperCase() + ' ARRESTED THIS MORNING AT HIS HOTEL BY ' + G.authShort(auth).toUpperCase() + '. CLIENT LIST AND APPOINTMENT DIARY SEIZED. DETENTION HEARING TOMORROW. BAIL UNLIKELY. PLEASE ADVISE.' });
    log.push(['EVT', 'RM VERHAFTET ' + auth, 'ALARM']);
  };
  K.sched.tripIncident = function (d, log) {
    const auth = D.COUNTRIES[d.c].auth;
    K.heat(auth, 9, 'Bankers checked at the border');
    K.msg({
      type: 'memo', from: 'Relationship Management', subject: 'Incident during acquisition trip (' + K.cname(d.c) + ')',
      body: 'On arrival, our relationship manager was taken aside by customs officers. The briefcase and laptop were searched for about two hours. The officers made copies of a printed list of appointments.\n\nNo client names were on the list – only first names and times. Nevertheless we must assume the authorities are now aware of our activities in the region.'
    });
    log.push(['EVT', 'ZWISCHENFALL REISE ' + d.c, 'WARNUNG']);
  };

  /* ---------- Hilfen ---------- */
  function pickClient(filter) {
    const list = G.activeClients().filter(function (c) { return c.funded && !c.dormant && (!filter || filter(c)); });
    return K.weighted(list, function (c) { return Math.sqrt(Math.max(1, G.clientAUM(c.id))); });
  }
  function randAcct(c) {
    const d = function (n) { let x = ''; for (let i = 0; i < n; i++) x += K.rint(0, 9); return x; };
    switch (c) {
      case 'DE': return U.iban('DE', d(8) + d(10));
      case 'IT': return U.iban('IT', String.fromCharCode(65 + K.rint(0, 25)) + d(10) + d(12));
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
  K.randAcct = randAcct;
  function surname(c) { return K.pick((D.NAMES[c] || D.NAMES.GB).l); }
  function cashCcy(c) {
    if (c.dom === 'CH') return 'CHF';
    if (D.COUNTRIES[c.dom] && D.COUNTRIES[c.dom].ccy === 'EUR') return K.localCcy(c.dom);
    return 'USD';
  }

  K.incoming = function (c, acc, amount, ccy, bank, factor, funding) {
    const s = S();
    if (ccy === 'USD' && s.corr.status === 'terminated') return null;
    const tx = K.book(acc, amount, 'Incoming payment / ' + bank.name + ', ' + bank.city, { kind: 'wire-in', cp: bank.name.toUpperCase(), country: bank.c, ext: true });
    const chf = amount * K.rate(ccy);
    K.raise(K.rulesFor(c, chf, { country: bank.c, funding: funding }), c, tx, 'Incoming payment ' + ccy + ' ' + U.fmt(amount, K.dec(ccy)) + ' from ' + bank.name + ', ' + bank.city + ' (' + bank.c + ')');
    K.exposure(c, acc, bank.c, chf, { incoming: factor, ccy: ccy }).forEach(function (n) {
      K.heat(n[0], n[1], 'Incoming payments from clients\' home countries');
    });
    return tx;
  };

  /* ---------- Tagesereignisse ---------- */
  const EVENTS = {
    inflow: function (log) {
      const c = pickClient();
      if (!c) return;
      const ents = G.entitiesOf(c.id);
      const useEnt = ents.length && K.chance(0.5);
      const fromHome = !useEnt && K.chance(0.35) && D.banksIn(c.dom).length;
      const bank = fromHome ? K.pick(D.banksIn(c.dom)) : D.bankByBic(K.pick(D.HAVEN_BANKS));
      const ccy = fromHome ? K.localCcy(c.dom) : K.pick(['USD', 'USD', S().date < D.EURO_DATE ? 'DEM' : 'EUR', 'CHF']);
      const amount = K.roundTo(c.wealth * K.between(0.003, 0.025) / K.rate(ccy), ccy === 'ITL' ? 1000000 : 1000);
      const acc = K.ensureAccount(c, ccy, useEnt ? ents[0].id : null);
      if (K.incoming(c, acc, amount, ccy, bank, 0.2)) log.push(['EVT', 'ZAHLUNGSEINGANG ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    cashIn: function (log) {
      const s = S();
      const c = pickClient(function (x) { return ['IT', 'DE', 'FR', 'CH', 'LB'].indexOf(x.dom) >= 0; });
      if (!c) return;
      const ccy = cashCcy(c);
      const amount = K.roundTo(K.between(20000, Math.max(25000, Math.min(450000, c.wealth * 0.03))) / K.rate(ccy), ccy === 'ITL' ? 10000000 : 5000);
      s.counter.push({ id: 'K' + U.pad(++s.ctr.visit, 3), client: c.id, type: 'in', ccy: ccy, amount: amount, courier: c.dom === 'IT' && K.chance(0.6), t: K.rint(8 * 60 + 30, 15 * 60), note: c.dom === 'IT' ? 'Arrived via Chiasso' : 'Announced by telephone', funding: false });
      log.push(['EVT', 'KASSE: BESUCH ANGEMELDET ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    cashOut: function (log) {
      const s = S();
      const c = pickClient(function (x) { return ['IT', 'DE', 'FR', 'CH'].indexOf(x.dom) >= 0; });
      if (!c) return;
      if (s.cards.some(function (x) { return x.client === c.id && x.status === 'active'; }) && K.chance(0.5)) return;
      const ccy = cashCcy(c);
      const amount = K.roundTo(K.between(15000, 150000) / K.rate(ccy), ccy === 'ITL' ? 10000000 : 5000);
      s.counter.push({ id: 'K' + U.pad(++s.ctr.visit, 3), client: c.id, type: 'out', ccy: ccy, amount: amount, courier: false, t: K.rint(8 * 60 + 30, 15 * 60), note: K.pick(['Personal use', 'Purchase of a car', 'Renovation of holiday home', 'Family wedding', 'Not specified']), funding: false });
      log.push(['EVT', 'KASSE: BEZUG ANGEMELDET ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    order: function (log) {
      const s = S();
      const c = pickClient();
      if (!c) return;
      const homeBanks = D.banksIn(c.dom);
      const kind = homeBanks.length ? K.weighted(['home', 'family', 'offshore'], function (k) { return k === 'offshore' ? 1 : 2; }) : 'offshore';
      let bank, benef, purpose, ccy, amount;
      if (kind === 'offshore') {
        bank = D.bankByBic(K.pick(D.HAVEN_BANKS));
        benef = K.pick(D.ENTITY_WORDS.a) + ' ' + K.pick(D.ENTITY_WORDS.b) + ' Ltd.';
        purpose = K.pick(['Investment', 'Capital contribution', 'Loan agreement', 'Purchase of shares']);
        ccy = s.corr.status === 'terminated' ? 'CHF' : 'USD';
        amount = K.roundTo(c.wealth * K.between(0.02, 0.08) / K.rate(ccy), 10000);
      } else {
        bank = K.pick(homeBanks);
        ccy = K.localCcy(c.dom);
        if (kind === 'home') {
          const sn = surname(c.dom);
          benef = {
            DE: 'Notariat Dr. ' + sn + ', ' + bank.city + ' (Anderkonto)', IT: 'Studio Notarile ' + sn + ', ' + bank.city,
            FR: 'Étude de Maître ' + sn + ', notaire', US: sn + ' Title & Escrow Co.', GB: sn + ' & Partners Solicitors (client account)'
          }[c.dom] || sn + ' Real Estate';
          purpose = K.pick(['Purchase of property', 'Down payment apartment', 'Renovation works', 'Purchase of a boat', 'Purchase of land']);
          amount = K.roundTo(c.wealth * K.between(0.008, 0.05) / K.rate(ccy), ccy === 'ITL' ? 10000000 : 5000);
        } else {
          benef = c.name.split(' ').slice(-1)[0] + ', ' + K.pick(['Andrea', 'Stefan', 'Julia', 'Thomas', 'Claudia', 'Peter', 'Sofia', 'Marc']);
          purpose = K.pick(['Family support', 'Tuition fees', 'Wedding gift', 'Monthly allowance']);
          amount = K.roundTo(c.wealth * K.between(0.001, 0.008) / K.rate(ccy), ccy === 'ITL' ? 1000000 : 1000);
        }
      }
      const accs = G.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR'; });
      const need = amount * K.rate(ccy) * 1.01;
      const acc = accs.filter(function (a) { return !a.entity && a.ccy === ccy && G.available(a) * K.rate(a.ccy) >= need; })[0] ||
        accs.filter(function (a) { return G.available(a) * K.rate(a.ccy) >= need; }).sort(function (a, b) { return K.valueCHF(b) - K.valueCHF(a); })[0];
      if (!acc) return;
      const acct = randAcct(bank.c);
      const p = K.newPayment({
        debit: acc.id, ccy: ccy, amount: amount, valuta: U.addBusinessDays(s.date, 1), benefName: benef, benefAcct: acct,
        benefAddr: bank.city, country: bank.c, bic: bank.bic, purpose: purpose, charges: K.pick(['OUR', 'SHA', 'SHA']), hideOrig: false, t: K.rint(8 * 60 + 15, 11 * 60)
      }, 'client');
      K.msg({
        type: 'fax', kind: 'order', from: c.rubrik + ' (fax)', t: p.t, subject: 'Payment order ' + ccy + ' ' + U.fmt(amount, 0) + ' – ' + c.rubrik,
        body: 'TO: BANKHAUS VOGT & CIE, ZUERICH – ATTN. ' + G.rmName(c).toUpperCase() + '\nRE: NUMBERED ACCOUNT ' + c.rubrik + '\n\nPlease transfer ' + ccy + ' ' + U.fmt(amount, K.dec(ccy)) + ' to:\n\nBeneficiary: ' + benef + '\nBank: ' + bank.name + ', ' + bank.city + ' (' + bank.bic + ')\nAccount: ' + (acct.length > 20 ? U.ibanFmt(acct) : acct) + '\nPurpose: ' + purpose + '\n\nThank you.\n\n[signature]  ' + c.rubrik,
        data: { payment: p.id, client: c.id }
      });
      log.push(['EVT', 'ZAHLUNGSAUFTRAG (FAX) ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    prospect: function (log) {
      const s = S();
      const tripC = s.trip && K.chance(0.7) ? s.trip.c : null;
      const pr = K.genProspect(tripC);
      K.prospectMessage(pr, K.rint(8 * 60 + 30, 16 * 60));
      log.push(['EVT', 'AKQUISITION: NEUER INTERESSENT', pr.c + ' ' + pr.ccy + ' ' + U.fmt(pr.amount, 0)]);
    },
    journalist: function (log) {
      const c = pickClient(function (x) { return x.risk !== 'Normal'; }) || pickClient();
      if (!c) return;
      K.msg({
        type: 'memo', kind: 'journalist', from: 'Reception / Telephone exchange', subject: 'Press enquiry – Zürcher Finanzblatt',
        body: 'A journalist of the "Zürcher Finanzblatt" (Mr. S. Brunner) called twice this morning. He asks whether our bank manages assets for ' +
          (c.risk === 'PEP' ? 'a former government official from ' : 'a businessman from ') + K.cname(c.dom) + ' and mentioned the name "' + c.name.split(' ').slice(-1)[0] + '".\n\nHe intends to publish later this week and asks for a statement.',
        actions: [['nocomment', 'No comment (Art. 47 BankG)'], ['terminate', 'Terminate the relationship quietly']],
        data: { client: c.id }
      });
      log.push(['EVT', 'MEDIENANFRAGE', c.rubrik]);
    },
    concern: function (log) {
      const s = S();
      const c = pickClient(function (x) { return x.traits.indexOf('nervous') >= 0 || x.loyalty < 50; });
      if (!c || s.agenda.some(function (a) { return a.client === c.id && a.status === 'open'; })) return;
      const auth = K.homeAuth(c);
      const dep = G.clientAccounts(c.id).find(function (x) { return x.type === 'DEP'; });
      let text;
      if (dep && G.perf(dep).rel < -0.02) text = 'the performance of the portfolio, which lags the benchmark by ' + U.fmt(-G.perf(dep).rel * 100, 1) + ' percentage points.';
      else if (auth && s.heat[auth] > 45) text = 'reports that the ' + G.authShort(auth) + ' is targeting clients of Swiss banks.';
      else if (G.age(c) > 70) text = 'succession: how can the assets pass to the family without the tax office learning of them?';
      else text = 'the fees, which the client finds too high compared with other banks.';
      K.agenda({ d: U.addBusinessDays(s.date, K.rint(0, 2)), t: Math.round(K.rint(9 * 60, 16 * 60) / 15) * 15, dur: 45, kind: 'concern', client: c.id, title: 'Meeting requested by ' + c.rubrik, data: { text: text } });
      log.push(['EVT', 'GESPRAECHSWUNSCH ' + c.rubrik, 'TERMIN']);
    },
    courierReq: function (log) {
      const s = S();
      if (!s.pricing.courierOn) return;
      const c = pickClient(function (x) { return ['IT', 'FR', 'DE'].indexOf(x.dom) >= 0 && x.declared < 1; });
      if (!c) return;
      const ccy = cashCcy(c);
      const amount = K.roundTo(K.between(80000, 600000) / K.rate(ccy), ccy === 'ITL' ? 10000000 : 5000);
      s.couriers.unshift({ id: 'K' + U.pad(++s.ctr.courier, 3), client: c.id, ccy: ccy, amount: amount, from: c.city, status: 'requested', d: s.date });
      log.push(['EVT', 'KURIERAUFTRAG ' + c.rubrik, ccy + ' ' + U.fmt(amount, 0)]);
    },
    life: function (log) {
      const c = pickClient();
      if (!c) return;
      const age = G.age(c);
      const r = K.rnd();
      if (age >= 68 && r < 0.18 + (age - 68) * 0.02) return died(c, log);
      if (r < 0.3 && c.family && c.family.spouse && c.family.spouse.indexOf('†') < 0) return divorce(c, log);
      if (r < 0.75) return windfall(c, log);
      if (c.risk === 'Normal' && ['IT', 'GR', 'LB', 'AR', 'BR', 'RU'].indexOf(c.dom) >= 0) return politician(c, log);
      windfall(c, log);
    },
    target: function (log) {
      const t = K.genTarget();
      if (!t) return;
      K.msg({ type: 'letter', from: 'Hottinger Corporate Finance AG, Zürich', subject: 'Confidential: ' + t.name + ' for sale', body: 'Dear Sirs,\n\nOn behalf of the owners we are mandated to sell ' + t.name + ' (assets under management approx. CHF ' + U.fmtMio(t.aum) + ', ' + t.n + ' client relationships). Indicative price: CHF ' + U.fmt(t.price, 0) + '.\n\nDetails are available in a data room (Organisation › Acquisitions). Offers are expected within six weeks.\n\nHottinger Corporate Finance AG' });
      log.push(['EVT', 'VERKAUFSANGEBOT BANK', 'CHF ' + U.fmtMio(t.aum)]);
    }
  };

  function died(c, log) {
    const s = S();
    const heirs = (c.family && (c.family.children.length || (c.family.spouse && c.family.spouse.indexOf('†') < 0)));
    c.deceased = s.date;
    if (heirs) {
      K.msg({
        type: 'letter', kind: 'heirs', from: 'Avv./Dr. ' + surname(c.dom) + ', lawyer for the heirs of ' + c.rubrik, subject: 'Death of ' + c.name + ' – instructions of the heirs',
        body: 'Dear Sirs,\n\nWe regret to inform you that our client ' + c.name + ' passed away on ' + U.fmtDate(U.addBusinessDays(s.date, -3)) + '. We represent the heirs (' + [c.family.spouse].concat(c.family.children).filter(Boolean).join(', ') + ').\n\nThe heirs request the transfer of all assets to the estate account in ' + K.cname(c.dom) + '. They are, however, open to a meeting about continuing the relationship.\n\nYours faithfully',
        actions: [['transfer', 'Transfer the estate as instructed'], ['retain', 'Persuade the heirs to stay (meeting)']], data: { client: c.id }
      });
    } else {
      c.dormant = s.date;
      K.msg({
        type: 'memo', kind: 'dormant', from: G.rmName(c) + ', Relationship Management', subject: 'Death of ' + c.name + ' (' + c.rubrik + ') – no heirs known',
        body: 'We have learned from the newspaper that ' + c.name + ' has died. There is no will on file and no heirs are known to us; the client never wanted correspondence.\n\nUnder the guidelines of the Swiss Bankers Association the relationship is now dormant ("nachrichtenlos"). It should be reported to the central contact office of the Banking Ombudsman so that heirs can find it.\n\nAssets: CHF ' + U.fmt(G.clientAUM(c.id), 0) + '.',
        actions: [['report', 'Report to the Banking Ombudsman, reduce fees'], ['keep', 'Keep managing quietly at full fees']], data: { client: c.id }
      });
    }
    log.push(['EVT', 'TODESFALL ' + c.rubrik, heirs ? 'ERBEN' : 'NACHRICHTENLOS']);
  }
  function divorce(c, log) {
    K.msg({
      type: 'fax', kind: 'divorce', from: c.rubrik + ' (fax)', subject: 'URGENT – ' + c.rubrik + ' – divorce proceedings',
      body: 'My spouse\'s lawyers have obtained an order from the court in ' + c.city + ' requiring me to disclose all my assets "in Switzerland and elsewhere". I will not let anyone take what I built.\n\nPlease advise IMMEDIATELY what can be done.\n\n[signature]  ' + c.rubrik,
      actions: [['hide', 'Move the assets into a Cayman STAR trust'], ['settle', 'Advise the client to settle']], data: { client: c.id }
    });
    log.push(['EVT', 'SCHEIDUNG ' + c.rubrik, 'ANFRAGE']);
  }
  function windfall(c, log) {
    const pct = K.between(0.1, 0.35);
    const ccy = K.localCcy(c.dom) === 'CHF' ? 'CHF' : 'USD';
    const amt = K.roundTo(c.wealth * pct / K.rate(ccy), 10000);
    c.wealth = K.roundTo(c.wealth * (1 + pct * 0.6), 100000);
    K.schedule(K.rint(2, 5), 'funding', { client: c.id, amount: amt, ccy: ccy, method: K.pick(['offshore', 'home', 'ch']) });
    K.msg({ type: 'memo', from: G.rmName(c) + ', Relationship Management', subject: 'Windfall – ' + c.rubrik, body: c.name + ' has sold a stake in a business. The client informs us that about ' + ccy + ' ' + U.fmt(amt, 0) + ' will arrive within the next few days. The client profile has been updated accordingly.\n\n' + G.rmName(c) });
    log.push(['EVT', 'NEUGELD ANGEKUENDIGT ' + c.rubrik, ccy + ' ' + U.fmt(amt, 0)]);
  }
  function politician(c, log) {
    K.msg({
      type: 'memo', kind: 'politician', from: G.rmName(c) + ', Relationship Management', subject: c.rubrik + ' enters politics',
      body: 'According to the press, ' + c.name + ' has been appointed ' + K.pick(['deputy minister of public works', 'governor of a province', 'member of the national parliament and chairman of the budget committee']) + ' in ' + K.cname(c.dom) + '.\n\nUnder our due-diligence rules the client is now a politically exposed person (PEP). Reclassification means enhanced monitoring, senior-management approval and more attention from the regulator.',
      actions: [['reclassify', 'Reclassify as PEP (fee +0.3%)'], ['ignore', 'Leave the file as it is']], data: { client: c.id }
    });
    log.push(['EVT', 'NEUER PEP ' + c.rubrik, 'ENTSCHEID']);
  }

  /* ---------- Meldungs-Handler ---------- */
  G.handlers.journalist = function (m, key) {
    const s = S();
    const c = G.client(m.data.client);
    if (key === 'terminate') {
      if (c && c.status === 'active') {
        K.free = true;
        try { G.offboard(c.id); } finally { K.free = false; }
        K.heat('EBK', -2, 'Reputational risk reduced');
      }
      return { text: 'Relationship terminated quietly. Journalist received a "no comment".' };
    }
    if (c && K.chance(c.risk === 'PEP' ? 0.5 : 0.25)) {
      K.heat('EBK', c.risk === 'PEP' ? 5 : 2, 'Press reports');
      const auth = K.homeAuth(c);
      if (auth) K.heat(auth, 3, 'Press reports');
      s.news.push({ d: s.date, text: 'Zürcher Finanzblatt: "Zurich private bank holds millions for ' + (c.risk === 'PEP' ? 'former official' : 'foreign businessman') + ' from ' + K.cname(c.dom) + '"' });
      return { text: 'No comment given (Art. 47 BankG). The article appeared anyway – the regulator has taken note.' };
    }
    return { text: 'No comment given (Art. 47 BankG). The story was not published.' };
  };
  G.handlers.border = function (m, key) {
    const c = G.client(m.data.client);
    if (key === 'lawyer') {
      K.expense('legal', 25000);
      K.heat(m.data.auth, -4, 'Legal defence of clients');
      if (c) K.loyal(c, 6);
      return { text: 'Lawyer instructed (CHF 25,000). The client is grateful.' };
    }
    return { text: 'No action taken.' };
  };
  G.handlers.eutax = function (m, key) {
    const c = G.client(m.data.client);
    if (!c || c.status !== 'active') return { text: 'Relationship no longer active.' };
    if (key === 'retention') { K.loyal(c, -6); return { text: 'Retention tax applied. The client is not pleased.' }; }
    K.free = true;
    let r;
    try {
      r = G.createEntity(c.id, key === 'insure' ? 'LI_INS' : 'VG', G.suggestEntityName(key === 'insure' ? 'LI_INS' : 'VG'), false);
      if (r.ok) {
        G.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR' && !a.entity && G.available(a) > 0; }).forEach(function (a) {
          const na = K.openAccount(c, a.ccy, 'CUR', r.entity.id);
          const amt = G.available(a);
          K.book(a, -amt, 'Transfer to ' + na.id + ' (' + r.entity.name + ')', { kind: 'int-out', cp: na.id });
          K.book(na, amt, 'Transfer from ' + a.id, { kind: 'int-in', cp: a.id });
        });
      }
    } finally { K.free = false; }
    if (!r.ok) return { text: r.msg };
    K.loyal(c, 8);
    return { text: 'Assets restructured into ' + r.entity.name + '. Outside the scope of the EU agreement.' };
  };
  G.handlers.heirs = function (m, key) {
    const s = S();
    const c = G.client(m.data.client);
    if (!c || c.status !== 'active') return { text: 'Relationship no longer active.' };
    if (key === 'retain' && K.chance(0.5)) {
      c.name = 'Heirs of ' + c.name;
      c.traits = ['nervous'];
      c.loyalty = 55;
      c.born = (+s.date.slice(0, 4) - 45) + '-06-01';
      c.family = { spouse: '', children: [] };
      delete c.deceased;
      K.note(c, 'Relationship continued by the heirs (community of heirs).', s.user.id);
      return { text: 'After a long meeting the heirs agree to keep the assets with us – for now.' };
    }
    const auth = K.homeAuth(c);
    K.terminate(c, 'died');
    if (auth && c.declared < 1) K.heat(auth, 2, 'Estates transferred abroad');
    return { text: key === 'retain' ? 'The heirs insist on the transfer. The estate has been paid out.' : 'The estate has been transferred to the heirs.' };
  };
  G.handlers.dormant = function (m, key) {
    const c = G.client(m.data.client);
    if (!c) return { text: 'Done.' };
    if (key === 'report') { c.dormantReported = S().date; c.fee = Math.min(c.fee, 0.003); return { text: 'Reported to the central contact office. Fees reduced to 0.30% p.a.' }; }
    return { text: 'The relationship is managed as before. Nobody will ask – probably.' };
  };
  G.handlers.divorce = function (m, key) {
    const c = G.client(m.data.client);
    if (!c || c.status !== 'active') return { text: 'Relationship no longer active.' };
    const auth = K.homeAuth(c);
    if (key === 'hide') {
      K.free = true;
      let r;
      try { r = G.createEntity(c.id, 'KY_T', G.suggestEntityName('KY_T'), true, 'USD'); } finally { K.free = false; }
      if (!r.ok) return { text: r.msg };
      K.personal(5, 'Hiding assets in divorce proceedings');
      if (auth) K.heat(auth, 3, 'Court orders in divorce cases');
      K.loyal(c, 10);
      c.family.spouse = '(divorced)';
      return { text: r.entity.name + ' set up. The client is deeply grateful. The ex-spouse\'s lawyers are not.' };
    }
    const acc = G.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR'; }).sort(function (a, b) { return K.valueCHF(b) - K.valueCHF(a); })[0];
    if (acc) K.book(acc, -G.available(acc) * 0.5, 'Payment – divorce settlement', { kind: 'wire-out', ext: true, country: c.dom });
    if (auth) K.heat(auth, 2, 'Court orders in divorce cases');
    K.loyal(c, -10);
    c.family.spouse = '(divorced)';
    return { text: 'The client settled. Half of the cash went to the former spouse.' };
  };
  G.handlers.politician = function (m, key) {
    const c = G.client(m.data.client);
    if (!c || c.status !== 'active') return { text: 'Relationship no longer active.' };
    if (key === 'reclassify') {
      c.risk = 'PEP';
      c.fee = K.round(c.fee + 0.003, 4);
      K.heat('EBK', 2, 'PEP relationships opened');
      return { text: 'Client reclassified as PEP. Enhanced monitoring applies.' };
    }
    c.hiddenPep = S().date;
    return { text: 'File unchanged. If the auditors notice, it will be awkward.' };
  };
  G.handlers.margin = function (m, key) {
    const s = S();
    const l = s.loans.find(function (x) { return x.id === m.data.loan; });
    if (!l || l.status !== 'active') return { text: 'Loan no longer active.' };
    const c = G.client(l.client);
    const dep = G.clientAccounts(l.client).filter(function (a) { return a.type === 'DEP'; }).sort(function (a, b) { return b.bal - a.bal; })[0];
    if (key === 'sell' || (key === 'topup' && !K.chance(0.7))) {
      if (dep) {
        const chf = Math.min(dep.bal, l.amount * K.rate(l.ccy));
        K.book(dep, -chf, 'Sale of securities – margin call ' + l.id, { kind: 'sec' });
        l.amount = Math.max(0, l.amount - chf / K.rate(l.ccy));
        if (l.amount < 1) l.status = 'closed';
      }
      K.loyal(c, -8);
      return { text: 'Securities sold at the market low to reduce the loan. The client is bitter.' };
    }
    if (key === 'topup') { K.loyal(c, -4); l.amount *= 0.7; return { text: 'The client transferred additional collateral and reduced the loan by 30%.' }; }
    l.watch = true;
    return { text: 'The bank waits. If prices fall further, it may lose money.' };
  };
  G.handlers.retro = function (m, key) {
    const s = S();
    if (key === 'stop') { s.flags.retroStop = true; G.activeClients().forEach(function (c) { K.loyal(c, 2); }); return { text: 'Retrocessions will be passed on to clients. Revenue will fall.' }; }
    s.flags.retroStop = false;
    return { text: 'Retrocessions are kept. Clients may claim them back.' };
  };
  G.handlers.snb = function (m, key) {
    const s = S();
    if (key === 'pass') { s.flags.passNeg = true; G.activeClients().forEach(function (c) { K.loyal(c, -4); }); return { text: 'Negative rates are passed on to clients with large cash balances.' }; }
    s.flags.passNeg = false;
    return { text: 'The bank absorbs the negative rates – at a cost to the interest result.' };
  };
  G.handlers.usProgram = function (m, key) {
    const s = S();
    const usUndecl = G.activeClients().filter(function (c) { return c.dom === 'US' && c.declared < 1; });
    if (key === 'cat2') {
      const rate = usUndecl.length ? 0.4 : 0.25;
      const penalty = K.roundTo((s.flags.usPeak || 0) * rate, 100000);
      K.expense('legal', penalty + 1500000);
      s.heat.US = Math.min(s.heat.US, 15);
      delete s.inv.US;
      s.flags.usCategory = 2;
      usUndecl.forEach(function (c) { if (K.chance(0.5)) { c.declared = 1; c.regularised = s.date; } else K.terminate(c, 'leave', 'a bank in Singapore'); });
      return { text: 'Category 2: the bank discloses its US business, delivers "leaver lists" and pays a penalty of CHF ' + U.fmt(penalty, 0) + ' plus CHF 1.5 million in legal fees. The US matter is closed.' };
    }
    s.flags.usCategory = 3;
    if ((s.flags.usPeak || 0) > 0) K.schedule(K.rint(120, 260), 'usDiscovery', {});
    return { text: 'Category 3: the bank declares that it has not committed any tax offence under US law.' + ((s.flags.usPeak || 0) > 0 ? ' Let us hope nobody in Washington finds out otherwise.' : '') };
  };
  K.sched.usDiscovery = function (d, log) {
    const s = S();
    if (K.chance(0.35 + s.heat.US / 150 + (s.flags.dataTheft ? 0.3 : 0))) {
      K.heat('US', 30, 'Category 3 declaration contradicted');
      K.investigate('US', 55, 'False Category 3 declaration');
      K.msg({ type: 'letter', from: 'US Department of Justice, Tax Division', subject: 'Programme for Non-Prosecution Agreements – Bankhaus Vogt & Cie', body: 'The Department has obtained information contradicting the bank\'s representation under Category 3 of the Program. The Department will proceed accordingly.' });
      log.push(['EVT', 'DOJ: KATEGORIE 3 WIDERLEGT', 'ALARM']);
    }
  };
  G.handlers.fatca = function (m, key) {
    const s = S();
    const us = G.activeClients().filter(function (c) { return c.dom === 'US' && c.declared < 1; });
    if (key === 'force') {
      us.forEach(function (c) { if (K.chance(0.5)) { c.declared = 1; c.regularised = s.date; } else K.terminate(c, 'leave', 'a bank in Panama'); });
      return { text: us.length + ' US relationship(s) regularised or closed.' };
    }
    K.heat('US', 20, 'Undeclared US accounts after FATCA');
    K.investigate('US', 20, 'FATCA non-compliance');
    return { text: 'The US accounts remain as they are. Under FATCA this is now a reportable failure.' };
  };
  G.handlers.hedge = function (m, key) {
    const s = S();
    const losses = m.data.losses || {};
    if (key === 'compensate') {
      let tot = 0;
      Object.keys(losses).forEach(function (cid) {
        const c = G.client(cid);
        const dep = c && G.clientAccounts(cid).find(function (a) { return a.type === 'DEP'; });
        if (dep) { K.book(dep, losses[cid] * 0.5, 'Goodwill compensation – Atlantic Absolute Return Fund', { kind: 'misc' }); tot += losses[cid] * 0.5; }
      });
      K.expense('losses', tot);
      return { text: 'The bank compensates 50% of the losses (CHF ' + U.fmt(tot, 0) + '). Clients appreciate the gesture.' };
    }
    Object.keys(losses).forEach(function (cid) { const c = G.client(cid); if (c && c.status === 'active') K.loyal(c, -20); });
    K.heat('EBK', 3, 'Client complaints about fund selection');
    return { text: 'No compensation. Several clients have instructed lawyers.' };
  };
  G.handlers.info = function () { return { text: 'Noted.' }; };

  /* ---------- Termine ---------- */
  K.sched.visit = function (d, log) {
    const s = S();
    const c = G.client(d.client);
    if (!c || c.status !== 'active') return;
    s.counter.push({ id: 'K' + U.pad(++s.ctr.visit, 3), client: c.id, type: d.type, ccy: d.ccy, amount: d.amount, courier: !!d.courier, t: K.rint(8 * 60 + 30, 11 * 60), note: d.note || '', funding: !!d.funding, retry: !!d.retry });
    log.push(['EVT', 'KASSE: BESUCH ANGEMELDET ' + c.rubrik, d.ccy + ' ' + U.fmt(d.amount, 0)]);
  };
  K.sched.funding = function (d, log) {
    const c = G.client(d.client);
    if (!c || c.status !== 'active') return;
    let bank;
    if (d.method === 'home' && D.banksIn(c.dom).length) bank = K.pick(D.banksIn(c.dom));
    else if (d.method === 'ch') bank = D.bankByBic(K.pick(['LEMPCHGG', 'ZGBKCHZZ']));
    else bank = D.bankByBic(K.pick(D.HAVEN_BANKS));
    let ccy = d.ccy;
    if (ccy !== 'CHF' && G.currencies().indexOf(ccy) < 0) ccy = 'EUR';
    if (K.incoming(c, K.ensureAccount(c, ccy, null), d.amount, ccy, bank, 0.5, !c.funded)) {
      c.funded = true;
      log.push(['EVT', 'GELDEINGANG ' + c.rubrik, ccy + ' ' + U.fmt(d.amount, 0)]);
    }
  };
  K.sched.border = function (d, log) {
    const c = G.client(d.client);
    if (!c) return;
    const auth = K.homeAuth(c);
    if (!auth) return;
    const place = { IT: ['Ponte Chiasso', 'Guardia di Finanza'], DE: ['Basel-Weil am Rhein', 'German customs (Zoll)'], FR: ['Genève-Bardonnex', 'French customs (douane)'], GB: ['London Heathrow', 'HM Customs'], US: ['Miami International Airport', 'US Customs'] }[c.dom];
    const docs = !c.holdMail || K.chance(0.15);
    K.heat(auth, docs ? 9 : 3, 'Clients stopped at the border');
    K.loyal(c, -8);
    K.note(c, 'Client stopped at ' + place[0] + ' with ' + d.ccy + ' ' + U.fmt(d.amount, 0) + ' in cash.' + (docs ? ' Bank documents found.' : ''));
    K.msg({
      type: 'memo', kind: 'border', from: G.rmName(c) + ', Relationship Management', subject: 'Client ' + c.rubrik + ' stopped at the border',
      body: 'The client\'s lawyer informs us that ' + c.name + ' was stopped yesterday at ' + place[0] + ' by the ' + place[1] + ' carrying ' + d.ccy + ' ' + U.fmt(d.amount, 0) + ' in cash.\n\n' +
        (docs ? 'Unfortunately a statement of our bank was found in the luggage. The authorities now know of the relationship.' : 'No bank documents were found (hold mail). The client gave no explanation regarding the origin of the cash.') +
        '\n\nThe client asks whether the bank will cover the cost of a lawyer.',
      actions: [['lawyer', 'Instruct lawyer (CHF 25,000)'], ['none', 'No action']], data: { client: c.id, auth: auth }
    });
    log.push(['EVT', 'GRENZKONTROLLE ' + c.rubrik, docs ? 'DOKUMENTE GEFUNDEN' : 'OHNE DOKUMENTE']);
  };
  K.sched.leave = function (d, log) {
    const c = G.client(d.client);
    if (!c || c.status !== 'active') return;
    const b = D.bankByBic(K.pick(['SPBLSGSG', 'KCBKHKHH', 'RTPBLI22', 'NFBTBSNS', 'EPBKAEAD']));
    const aum = G.clientAUM(c.id);
    K.terminate(c, 'leave', b.name + ', ' + b.city);
    K.discretion(-1);
    K.msg({ type: 'memo', from: G.rmName(c) + ', Relationship Management', subject: 'Client ' + c.rubrik + ' closes relationship', body: 'The client has instructed us to transfer all assets (approx. CHF ' + U.fmtMio(aum) + ') to ' + b.name + ', ' + b.city + ' and to close the relationship. Reason given: ' + (d.reason || 'none') + '.' });
    log.push(['EVT', 'SALDIERUNG ' + c.rubrik, 'CHF ' + U.fmtMio(aum)]);
  };
  K.sched.eutax = function (d, log) {
    const c = G.client(d.client);
    if (!c || c.status !== 'active' || G.entitiesOf(c.id).length || c.declared >= 1) return;
    K.msg({
      type: 'fax', kind: 'eutax', from: c.rubrik + ' (fax)', subject: 'EU retention tax – ' + c.rubrik,
      body: 'Dear Sirs,\n\nI read in the newspaper that from now on a tax will be deducted from my interest income in Switzerland and possibly reported. I do not want any of this.\n\nPlease advise what can be done. A friend mentioned a company abroad, another an insurance policy.\n\n[signature]  ' + c.rubrik,
      actions: [['restructure', 'Restructure via BVI company (CHF 9,500)'], ['insure', 'Life insurance wrapper (CHF 15,000)'], ['retention', 'Apply retention tax']], data: { client: c.id }
    });
    log.push(['EVT', 'ANFRAGE ZINSBESTEUERUNG ' + c.rubrik, 'OK']);
  };
  K.sched.aeoiDecision = function (d, log) {
    const s = S();
    const c = G.client(d.client);
    if (!c || c.status !== 'active' || c.declared >= 1) return;
    if (K.chance(0.55 + c.loyalty / 300)) { c.declared = 1; c.regularised = s.date; K.note(c, 'Client regularised ahead of the automatic exchange of information.'); log.push(['EVT', 'REGULARISIERUNG ' + c.rubrik, 'OK']); }
    else K.sched.leave({ client: c.id, reason: 'automatic exchange of information' }, log);
  };

  /* ---------- Zeitgeschehen ---------- */
  K.euroConvert = function () {
    const s = S();
    s.accounts.forEach(function (a) {
      const p = D.LEGACY[a.ccy];
      if (!p || a.closed) return;
      const old = a.ccy, bal = a.bal;
      K.book(a, -bal, 'Conversion ' + old + ' → EUR at ' + p, { kind: 'misc' });
      a.ccy = 'EUR';
      a.pledged = (a.pledged || 0) / p;
      K.book(a, bal / p, 'Conversion ' + old + ' ' + U.fmt(bal, K.dec(old)) + ' → EUR', { kind: 'misc' });
    });
    s.payments.forEach(function (x) { if (D.LEGACY[x.ccy] && x.status === 'pending') { x.amount = K.round(x.amount / D.LEGACY[x.ccy]); x.ccy = 'EUR'; } });
    s.loans.forEach(function (x) { if (D.LEGACY[x.ccy]) { x.amount = K.round(x.amount / D.LEGACY[x.ccy]); x.ccy = 'EUR'; } });
    s.couriers.forEach(function (x) { if (D.LEGACY[x.ccy]) { x.amount = K.round(x.amount / D.LEGACY[x.ccy]); x.ccy = 'EUR'; } });
    s.counter.forEach(function (x) { if (D.LEGACY[x.ccy]) { x.amount = K.round(x.amount / D.LEGACY[x.ccy]); x.ccy = 'EUR'; } });
  };

  const FX = {
    ruCrisis: function () { G.activeClients().forEach(function (c) { if (c.dom === 'RU') K.schedule(K.rint(1, 8), 'funding', { client: c.id, amount: K.roundTo(c.wealth * 0.08, 10000), ccy: 'USD', method: 'offshore' }); }); },
    euro: function () { K.euroConvert(); },
    y2k: function () {
      if (!G.activeStaff('it').length) { K.heat('EBK', 3, 'IT failures'); K.msg({ type: 'memo', from: 'Rolf Gisler, Operations', subject: 'Millennium – no IT staff on standby', body: 'Without IT staff nobody was on standby over New Year. Two batch jobs failed on 3 January; the regulator has asked for an explanation.' }); }
    },
    qi: function () { G.activeClients().forEach(function (c) { if (c.dom === 'US') K.loyal(c, -3); }); },
    cardSummons: function () {
      const s = S();
      s.cards.forEach(function (x) {
        if (x.status !== 'active') return;
        const c = G.client(x.client);
        const auth = c && K.homeAuth(c);
        if (auth) K.heat(auth, auth === 'US' ? 3 : 1, 'Offshore credit card data');
      });
    },
    euTax: function () {
      G.activeClients().filter(function (c) { return D.COUNTRIES[c.dom] && D.COUNTRIES[c.dom].eu && !G.entitiesOf(c.id).length && c.declared < 1; })
        .slice(0, 5).forEach(function (c, i) { K.schedule(1 + i * 2, 'eutax', { client: c.id }); });
    },
    hedgeFraud: function () {
      const s = S();
      const losses = {};
      let tot = 0;
      s.accounts.forEach(function (a) {
        if (a.type !== 'DEP' || a.closed) return;
        const w = K.alloc(a.strat || 'balanced').HEDGE / 100;
        if (!w) return;
        const loss = a.bal * w * 0.96 / (1 - w * 0.96);
        losses[a.client] = (losses[a.client] || 0) + loss;
        tot += loss;
      });
      let nost = 0;
      if (s.nostro.pos.AAR) nost = s.nostro.pos.AAR * K.priceCHF('AAR') * 24;
      if (!tot && !nost) return;
      K.msg({
        type: 'memo', kind: tot ? 'hedge' : 'info', from: 'Dr. Martin Frei, Portfolio Management', subject: 'Atlantic Absolute Return Fund – total loss',
        body: 'The Atlantic Absolute Return Fund, which we held in client portfolios for its "steady returns", was a fraud. The manager has been arrested in New York; the fund\'s assets are gone.\n\nLosses in client portfolios: approx. CHF ' + U.fmt(tot, 0) + (nost ? '. Losses in the bank\'s own book: approx. CHF ' + U.fmt(nost, 0) : '') + '.\n\nClients will ask why we did not see it coming.',
        actions: tot ? [['compensate', 'Compensate clients for 50% of the loss'], ['refuse', 'No compensation – market risk']] : [], data: { losses: losses }
      });
      Object.keys(losses).forEach(function (cid) { const c = G.client(cid); if (c && c.status === 'active') K.loyal(c, -8); });
    },
    ubsDeal: function () {
      G.activeClients().forEach(function (c) {
        if (c.dom !== 'US' || c.declared >= 1) return;
        K.loyal(c, -15);
        K.agenda({ d: U.addBusinessDays(S().date, K.rint(1, 4)), t: 10 * 60 + K.rint(0, 24) * 15, dur: 45, kind: 'concern', client: c.id, title: 'Urgent meeting requested by ' + c.rubrik, data: { text: 'the US deal of the largest Swiss bank – will our bank hand over names too?' } });
      });
      K.msg({ type: 'memo', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'US clients – recommendation', body: 'After the settlement of the largest Swiss bank with the US authorities, I strongly recommend that we stop all business with undeclared US persons: either they regularise (voluntary disclosure programme of the IRS) or we close the relationship.\n\nEvery further month with undeclared US money increases the penalty we may one day have to pay.' });
    },
    cd: function () {
      const s = S();
      G.activeClients().forEach(function (c) {
        if (c.dom !== 'DE' || c.declared >= 1) return;
        if (K.chance(0.3)) { c.declared = 1; c.regularised = s.date; K.note(c, 'Client filed voluntary disclosure after the data CD purchases.'); }
        else K.loyal(c, -10);
      });
    },
    retro: function () {
      const s = S();
      if (D.PRODUCT_PREF[s.house.pref].third === 0 && !s.flags.retroEver) return;
      K.msg({ type: 'memo', kind: 'retro', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'Retrocessions belong to the client', body: 'The Federal Supreme Court has ruled that retrocessions received from fund providers belong to the client unless the client has expressly waived them with full knowledge of their amount.\n\nWe can either pass them on from now on, or keep them and accept claims and audit findings.', actions: [['stop', 'Pass retrocessions on to clients'], ['keep', 'Keep them']] });
    },
    rubik: function () {
      const s = S();
      G.activeClients().forEach(function (c) {
        if (c.dom !== 'GB' || c.declared >= 1) return;
        if (K.chance(0.7)) {
          const acc = K.feeAccount(c);
          const tax = G.clientAUM(c.id) * 0.25;
          K.charge(c, tax, 'One-off payment under CH–UK tax agreement');
          c.declared = 1;
          c.regularised = s.date;
          if (acc) K.note(c, 'One-off payment of CHF ' + U.fmt(tax, 0) + ' deducted; assets regularised.');
        } else K.terminate(c, 'leave', 'a bank in Dubai');
      });
      s.heat.GB = s.heat.GB * 0.5;
    },
    usProgram: function () {
      const s = S();
      K.msg({
        type: 'letter', kind: 'usProgram', from: 'Swiss Bankers Association / Federal Department of Finance', subject: 'US programme for Swiss banks – choice of category by 31 December 2013',
        body: 'The US Department of Justice offers Swiss banks a programme to resolve their past. Each bank must choose:\n\nCategory 2 – the bank has reason to believe it committed tax-related offences: it discloses its US business, delivers anonymised "leaver lists" and pays a penalty of 20–50% of the maximum undeclared US assets since August 2008.\n\nCategory 3 – the bank declares, confirmed by an independent examiner, that it committed no offence.\n\nOur peak of undeclared US assets since August 2008: CHF ' + U.fmt(s.flags.usPeak || 0, 0) + '.',
        actions: [['cat2', 'Category 2 – disclose and pay'], ['cat3', 'Category 3 – declare innocence']], due: '2013-12-31'
      });
    },
    fatca: function () {
      const us = G.activeClients().filter(function (c) { return c.dom === 'US' && c.declared < 1; });
      if (!us.length) return;
      K.msg({ type: 'memo', kind: 'fatca', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'FATCA – ' + us.length + ' undeclared US relationship(s)', body: 'FATCA is in force. We still hold ' + us.length + ' undeclared US relationship(s): ' + us.map(function (c) { return c.rubrik; }).join(', ') + '.\n\nWe must report them, have them regularise, or close them.', actions: [['force', 'Force regularisation or closure'], ['ignore', 'Do nothing']] });
    },
    snb: function () {
      K.msg({ type: 'memo', kind: 'snb', from: 'Beatrice Lüthi, Finance & Controlling', subject: 'Negative interest rates', body: 'The SNB charges -0.75% on sight deposits above an exemption threshold. Our client cash balances therefore cost the bank money.\n\nShall we pass negative rates on to clients with cash balances above CHF 1 million?', actions: [['pass', 'Pass them on to large clients'], ['absorb', 'Absorb them']] });
    },
    panama: function () {
      const s = S();
      let n = 0;
      G.activeClients().forEach(function (c) {
        if (!G.entitiesOf(c.id).some(function (e) { return e.jur === 'PA'; })) return;
        n++;
        const auth = K.homeAuth(c);
        if (auth && c.declared < 1) K.heat(auth, 4, 'Panama Papers');
        K.loyal(c, -10);
      });
      if (n) K.msg({ type: 'memo', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'Panama Papers – ' + n + ' client structure(s) affected', body: 'The leaked data of the Panamanian law firm includes ' + n + ' structure(s) held by our clients. Journalists are calling.' });
    },
    aeoi: function () {
      const s = S();
      const list = G.activeClients().filter(function (c) { return D.COUNTRIES[c.dom] && D.COUNTRIES[c.dom].eu && c.declared < 1; });
      list.forEach(function (c) { K.schedule(K.rint(10, 220), 'aeoiDecision', { client: c.id }); });
      K.msg({ type: 'memo', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'Final year of banking secrecy – ' + list.length + ' EU client(s) undeclared', body: 'From today we collect account data for the EU tax authorities. All ' + list.length + ' undeclared EU clients will have to regularise or leave during the year.\n\nThe game – excuse me, the business – will be different from 2018.' });
    }
  };

  K.timelineDay = function (log) {
    const s = S();
    D.TIMELINE.forEach(function (t) {
      if (t.d > s.date || s.flags['tl' + t.d]) return;
      s.flags['tl' + t.d] = true;
      if (t.d < s.meta.started) return;
      if (t.news) s.news.push({ d: s.date, text: t.news });
      if (t.shock) s.pendingShock = t.shock;
      if (t.heat) Object.keys(t.heat).forEach(function (k) { K.heat(k, t.heat[k], 'Political developments'); });
      if (t.memo) K.msg({ type: 'memo', from: t.memo.from, subject: t.memo.subject, body: t.memo.body, t: 7 * 60 + 45 });
      if (t.flag) s.flags[t.flag] = true;
      if (t.fx && FX[t.fx]) FX[t.fx]();
      log.push(['EVT', 'ZEITGESCHEHEN', (t.news || '').slice(0, 34).toUpperCase()]);
    });
  };

  K.randomEvents = function (log) {
    const s = S();
    const n = 1 + (K.chance(0.55) ? 1 : 0) + (K.chance(0.25) ? 1 : 0);
    const era = s.date >= '2014-01-01' ? 0.45 : s.date >= '2009-01-01' ? 0.65 : 1;
    const offices = Object.keys(s.branches).filter(function (k) { return D.LOCATIONS[k].kind !== 'HQ'; }).length;
    const prospectW = 0.6 * (0.4 + s.discretion / 100) * (s.trip ? 3 : 1) * D.FEE_LEVELS[s.pricing.level].prospects * era * (1 + 0.25 * offices);
    const table = [['inflow', 3], ['cashIn', 1.4 * era], ['order', 2], ['prospect', prospectW], ['cashOut', 0.8], ['journalist', 0.2], ['concern', 0.45], ['life', 0.2], ['courierReq', s.pricing.courierOn ? 0.9 : 0], ['target', 0.035]];
    for (let i = 0; i < n; i++) {
      const ev = K.weighted(table, function (x) { return x[1]; });
      EVENTS[ev[0]](log);
    }
  };
})(window.PBS);
