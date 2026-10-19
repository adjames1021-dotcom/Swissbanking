/* PBS/Web 4.2 – Tagesabschluss (Batch PBSEOD01) */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }

  G.endOfDay = function () {
    const s = S();
    const log = [];
    const warn = [];
    const L = function (step, label, result) { log.push([step, label, result]); };
    const closing = s.date;
    const startClock = Math.max(s.clock, 18 * 60 + 25);

    // Kasse
    let left = 0;
    s.counter.slice().forEach(function (k) {
      const c = G.client(k.client);
      left++;
      K.loyal(c, -8);
      K.note(c, 'Client left the counter without being served (' + k.ccy + ' ' + U.fmt(k.amount, 0) + ').');
      if (k.funding && !c.funded) {
        if (!k.retry) K.schedule(1, 'visit', { client: c.id, type: k.type, ccy: k.ccy, amount: k.amount, courier: k.courier, funding: true, retry: true, note: 'Second attempt – initial deposit' });
        else K.terminate(c, 'unfunded');
      }
    });
    s.counter = [];
    L('STEP010', 'KASSENABSCHLUSS', left ? left + ' KUNDE(N) NICHT BEDIENT' : 'OK');
    if (left) warn.push('cash');
    const missed = K.agendaEndOfDay();
    L('STEP015', 'TERMINKALENDER', missed ? missed + ' TERMIN(E) VERPASST' : 'OK');

    // Kundenaufträge in Pendenz
    let late = 0;
    s.payments.forEach(function (p) {
      if (p.status === 'pending' && p.source === 'client' && U.businessDaysBetween(p.d, closing) >= 2) {
        const c = G.client(p.client);
        if (c) K.loyal(c, -4);
        late++;
      }
    });
    L('STEP020', 'PENDENZEN ZAHLUNGSVERKEHR', G.pendingPayments().length + ' OFFEN' + (late ? ', ' + late + ' UEBERFAELLIG' : ''));

    // Märkte und Bewertung
    s.prevMarket = Object.assign({}, s.market);
    const prevClose = s.mhist.length ? s.mhist[s.mhist.length - 1].d : U.addBusinessDays(closing, -1);
    const ret = K.marketStep(prevClose, closing, s.pendingShock);
    s.pendingShock = null;
    s.mhist.push(Object.assign({ d: closing }, s.market));
    L('STEP030', 'KURSUEBERNAHME TELEKURS', 'OK  ' + (6 + D.INSTR.length) + ' KURSE');
    const pf = K.revaluePortfolios(ret);
    if (pf.retro > 0) s.flags.retroEver = true;
    const it = K.dailyInterest(s.prevMarket);
    K.careerDaily(ret);
    L('STEP040', 'BEWERTUNG DEPOTS / NOSTRO', 'HANDEL CHF ' + U.fmt(it.pnl, 0));

    // Gebühren, Zinsen, Aufwand
    let feeDay = 0;
    G.activeClients().forEach(function (c) {
      let f = G.clientAUM(c.id) * G.effectiveFee(c) / 250;
      if (c.rebateUntil && c.rebateUntil >= closing) f *= 0.7;
      c.feeAccrued = (c.feeAccrued || 0) + f;
      feeDay += f;
    });
    K.income('fees', feeDay);
    const staffCost = G.payroll() * 1.15 / 250;
    K.expense('staff', staffCost);
    const prem = K.locationsDaily();
    K.retainerCosts();
    L('STEP050', 'GEBUEHRENABGRENZUNG', 'CHF ' + U.fmt(feeDay));
    L('STEP052', 'ZINSERFOLG', 'CHF ' + U.fmt(it.nii + it.loanInt));
    L('STEP055', 'PERSONAL- UND SACHAUFWAND', 'CHF ' + U.fmt(staffCost + prem));

    // Compliance-Team erledigt Routinefälle
    let auto = 0;
    if (s.delegate !== false) {
      const comp = G.activeStaff('comp');
      const cap = G.complianceCapacity();
      const avgSkill = comp.length ? comp.reduce(function (t, x) { return t + x.skill; }, 0) / comp.length : 0;
      G.openAlerts().slice().reverse().forEach(function (a) {
        if (auto >= cap) return;
        if (!a.rules.every(function (r) { return D.RULES_ROUTINE.indexOf(r) >= 0; })) return;
        const officer = K.pick(comp);
        a.weak = G.alertQuality(a, 'income') === 'thin' || (avgSkill < 3 && K.chance(0.35));
        a.status = 'closed';
        a.res = { just: 'income', comment: 'Cleared by the compliance team', d: closing, t: K.CLOSE, by: officer.name };
        auto++;
      });
    }
    L('STEP060', 'TRANSAKTIONSUEBERWACHUNG', G.openAlerts().length + ' OFFEN' + (auto ? ', ' + auto + ' DURCH COMPLIANCE ERLEDIGT' : '') + (G.overdueAlerts().length ? ', ' + G.overdueAlerts().length + ' UEBERFAELLIG' : ''));
    if (G.overdueAlerts().length) warn.push('alerts');

    // Betrieb
    const cap = G.opsCapacity();
    if (s.today.ops > cap) {
      const p = cap ? Math.min(0.6, (s.today.ops - cap) / cap) : 0.6;
      if (K.chance(p)) {
        const c = K.pick(G.activeClients());
        if (c) {
          K.loyal(c, -5);
          K.heat('EBK', 0.5, 'Operational errors');
          K.msg({ type: 'memo', from: 'Rolf Gisler, Operations', subject: 'Booking error – ' + c.rubrik, body: 'Due to the workload (' + s.today.ops + ' bookings, capacity ' + cap + ') a statement of ' + c.rubrik + ' was sent to the wrong address and a payment was booked with the wrong value date. The client has complained.\n\nWe need more staff in the back office.' });
        }
      }
      L('STEP065', 'BETRIEB', s.today.ops + ' BUCHUNGEN, KAPAZITAET ' + cap + ' – UEBERLASTUNG');
      warn.push('ops');
    } else L('STEP065', 'BETRIEB', s.today.ops + ' BUCHUNGEN, KAPAZITAET ' + cap);
    const evlog = [];
    K.staffDaily(evlog);

    // Kundenzufriedenheit
    const lvl = D.FEE_LEVELS[s.pricing.level].loyalty;
    G.activeClients().forEach(function (c) {
      if (c.dormant) return;
      const r = G.staff(c.rm);
      let target = 70 + lvl;
      if (r && r.status === 'active') {
        target += (r.skill - 3) * 4;
        const load = G.rmLoad(r) / G.rmCapacity(r);
        if (load > 1) target -= (load - 1) * 40;
      } else target -= 12;
      if (c.rebateUntil && c.rebateUntil >= closing) target += 5;
      if (s.flags.euTax && D.COUNTRIES[c.dom] && D.COUNTRIES[c.dom].eu && c.declared < 1 && !G.entitiesOf(c.id).length) target -= 6;
      c.loyalty = U.clamp(c.loyalty + (target - c.loyalty) * 0.01, 0, 100);
    });

    // Statistik
    s.hist.push({ d: closing, aum: K.round(G.totalAUM()) });
    s.heatHist.push(Object.assign({ d: closing }, s.heat));
    if (s.heatHist.length > 40) s.heatHist.shift();
    if (closing >= '2008-08-01') {
      const us = G.activeClients().filter(function (c) { return c.dom === 'US' && c.declared < 1; }).reduce(function (t, c) { return t + G.clientAUM(c.id); }, 0);
      s.flags.usPeak = Math.max(s.flags.usPeak || 0, us);
    }
    L('STEP070', 'STATISTIK VERWALTETE VERMOEGEN', 'CHF ' + U.fmtMio(G.totalAUM()));

    // Lombardkredite: Deckung prüfen
    s.loans.forEach(function (l) {
      if (l.status !== 'active' || l.type !== 'lombard') return;
      const accs = G.clientAccounts(l.client);
      const coll = accs.reduce(function (t, a) { return t + (a.type === 'DEP' ? a.bal : a.type === 'MET' ? K.valueCHF(a) : 0); }, 0);
      const loan = l.amount * K.rate(l.ccy);
      if (l.watch && loan > coll) {
        K.expense('losses', loan - coll);
        l.amount = coll / K.rate(l.ccy);
        l.watch = false;
        evlog.push(['EVT', 'KREDITVERLUST ' + l.id, 'CHF ' + U.fmt(loan - coll, 0)]);
      } else if (loan > coll * 0.7 && !s.messages.some(function (m) { return m.kind === 'margin' && !m.resolved && m.data.loan === l.id; })) {
        const c = G.client(l.client);
        K.msg({ type: 'memo', kind: 'margin', from: 'Rolf Gisler, Operations – credit control', subject: 'Margin call – loan ' + l.id + ' (' + (c ? c.rubrik : '') + ')', body: 'The collateral of Lombard loan ' + l.id + ' (' + l.ccy + ' ' + U.fmt(l.amount, 0) + ') has fallen to CHF ' + U.fmt(coll, 0) + '. The loan exceeds 70% of the collateral value.', actions: [['sell', 'Sell securities to reduce the loan'], ['topup', 'Ask the client for more collateral'], ['wait', 'Wait']], data: { loan: l.id } });
        evlog.push(['EVT', 'NACHSCHUSSPFLICHT ' + l.id, 'WARNUNG']);
      }
    });

    // Valutawechsel
    const newDate = U.addBusinessDays(closing, 1);
    s.date = newDate;
    s.dayNo++;
    s.clock = 8 * 60 + K.rint(0, 12);
    s.overtime = 0;
    s.today = { ops: 0 };
    L('STEP080', 'VALUTAWECHSEL', U.fmtDate(newDate));
    const om = +closing.slice(5, 7), nm = +newDate.slice(5, 7);
    if (om !== nm) {
      s.nnm.month = 0;
      K.genCandidates();
      s.cards.forEach(function (x) {
        if (x.status !== 'active') return;
        const c = G.client(x.client);
        if (!c || c.status !== 'active') return;
        const spend = U.clamp(c.wealth * 0.0012, 2000, 40000);
        K.charge(c, spend, 'Card settlement ' + x.id + ' (' + x.issuer + ')');
        K.income('fx', spend * 0.015);
      });
      s.targets = s.targets.filter(function (t) { return t.expires >= newDate; });
      if ([1, 4, 7, 10].indexOf(nm) >= 0) quarterEnd(closing, L);
      if (nm === 1) yearEnd(closing.slice(0, 4), L, evlog);
    }
    if (s.gameOver) return finish();

    // Termine und Ereignisse
    const due = s.sched.filter(function (x) { return x.d <= s.date; });
    s.sched = s.sched.filter(function (x) { return x.d > s.date; });
    due.forEach(function (x) { if (K.sched[x.type]) K.sched[x.type](x.data, evlog); });
    K.timelineDay(evlog);
    const hl = D.HEADLINES.any.concat(s.date < '2003-01-01' ? D.HEADLINES.early : s.date < '2008-01-01' ? D.HEADLINES.late : D.HEADLINES.crisis);
    const fresh = hl.filter(function (h) { return !s.news.slice(-14).some(function (n) { return n.text === h; }); });
    s.news.push({ d: s.date, text: K.pick(fresh.length ? fresh : hl) });
    if (s.news.length > 60) s.news.splice(0, s.news.length - 60);
    const y = s.date.slice(0, 4);
    if (s.date >= y + '-09-15' && !s.flags['audit' + y]) {
      s.flags['audit' + y] = true;
      K.msg({ type: 'letter', from: 'Hürlimann Revision AG, Zürich (statutory auditor)', subject: 'Annual audit ' + y + ' – start of fieldwork', body: 'Dear Sirs,\n\nAs announced, our audit team will begin fieldwork on your premises today. We will review, on a sample basis, the documentation of client relationships (Form A, client profiles), the clearing of transaction-monitoring alerts and the handling of dormant relationships.\n\nHürlimann Revision AG' });
      K.schedule(8, 'auditReport', { year: y });
      evlog.push(['EVT', 'REVISION ' + y, 'BEGINN PRUEFUNG']);
    }
    if (s.trip && s.date > s.trip.until) {
      K.msg({ type: 'memo', from: 'Relationship Management', subject: 'Back from ' + K.cname(s.trip.c), body: 'The acquisition trip has ended. Contacts made during the trip may still get in touch over the coming days.' });
      s.trip = null;
    }
    K.randomEvents(evlog);
    K.takeoverOffer(evlog);
    K.correspondentDaily(evlog);
    K.authoritiesDaily(evlog);
    G.activeClients().forEach(function (c) {
      if (c.funded && !c.dormant && c.loyalty < 20 && K.chance(0.35 * K.diff().leave)) K.sched.leave({ client: c.id, reason: '"lack of service and of understanding for my situation"' }, evlog);
    });
    K.planDay();
    L('STEP090', 'TERMINE UND EREIGNISSE', evlog.length + ' VERARBEITET');
    evlog.forEach(function (e) { log.push(e); });
    if (s.date > D.END_DATE && !s.gameOver) G.endGame('end');
    return finish();

    function finish() {
      G.checkGameOver();
      G.save();
      const ok = !warn.length && !s.gameOver;
      return { log: log, rc: s.gameOver ? (s.gameOver.good ? '0000' : '0012') : ok ? '0000' : '0004', start: startClock, closing: closing, date: s.date };
    }
  };

  function quarterEnd(closing, L) {
    const s = S();
    const om = +closing.slice(5, 7);
    const q = 'Q' + (Math.floor((om - 1) / 3) + 1) + '/' + closing.slice(0, 4);
    let tot = 0;
    G.activeClients().forEach(function (c) {
      if (c.feeAccrued > 0) { K.charge(c, c.feeAccrued, 'Management fee ' + q); tot += c.feeAccrued; c.feeAccrued = 0; }
      G.clientAccounts(c.id).forEach(function (a) {
        if (a.type !== 'DEP') return;
        const p = G.perf(a);
        const greedy = c.traits.indexOf('greedy') >= 0;
        if (p.rel < -0.03) K.loyal(c, greedy ? -8 : -4);
        else if (p.rel > 0.02) K.loyal(c, 3);
        if (p.own < -0.1) K.loyal(c, c.traits.indexOf('nervous') >= 0 ? -6 : -3);
      });
    });
    s.loans.forEach(function (l) {
      if (l.status !== 'active' || !l.accrued) return;
      const c = G.client(l.client);
      if (c && c.status === 'active') K.charge(c, l.accrued, (l.type === 'lombard' ? 'Interest Lombard loan ' : 'Guarantee commission ') + l.id + ' ' + q);
      l.accrued = 0;
    });
    L('STEP085', 'GEBUEHRENBELASTUNG ' + q, 'CHF ' + U.fmt(tot));
  }

  function yearEnd(year, L, evlog) {
    const s = S();
    const y = s.bank.ytd;
    const rev = G.revenueYTD(), cost = G.costYTD();
    const rec = { year: year, rev: rev, cost: cost, profit: rev - cost, capital: s.bank.capital, aum: G.totalAUM(), nnm: s.nnm.ytd, ytd: Object.assign({}, y), clients: G.activeClients().length, staff: G.activeStaff().length };
    s.annual.push(rec);
    K.msg({
      type: 'memo', from: 'Beatrice Lüthi, Finance & Controlling', subject: 'Annual results ' + year + ' (preliminary)',
      body: 'Preliminary annual results ' + year + ':\n\nTotal revenue: CHF ' + U.fmt(rev) + '\nTotal expenses: CHF ' + U.fmt(cost) + '\nNet profit: CHF ' + U.fmt(rev - cost) + '\n\nAssets under management: CHF ' + U.fmtMio(rec.aum) + '\nNet new money: CHF ' + U.fmtMio(rec.nnm) + '\nEquity capital: CHF ' + U.fmtMio(s.bank.capital) + '\n\nBeatrice Lüthi'
    });
    K.careerYearEnd(year, rev - cost, evlog);
    s.bank.ytd = K.ytdZero();
    s.nnm.ytd = 0;
    Object.keys(s.bench).forEach(function (k) { s.bench[k].idxY = s.bench[k].idx; });
    s.accounts.forEach(function (a) { if (a.type === 'DEP') a.idxY = a.idx || 100; });
    // Jahresgebühren
    G.activeClients().forEach(function (c) {
      if (c.holdMail) { K.charge(c, s.pricing.holdMail, 'Hold mail fee (banklagernd) ' + (+year + 1)); K.income('comm', s.pricing.holdMail); }
    });
    s.entities.forEach(function (e) {
      if (e.dissolved) return;
      const c = G.client(e.bo);
      if (!c || c.status !== 'active') return;
      const j = D.JURIS[e.jur];
      K.charge(c, j.annual, 'Annual fees ' + e.name);
      K.income('other', j.annual * 0.25);
    });
    s.boxes.forEach(function (b) {
      if (b.status !== 'active') return;
      const c = G.client(b.client);
      if (c && c.status === 'active') { K.charge(c, b.fee, 'Safe-deposit box ' + b.id + ' – annual rent'); K.income('comm', b.fee); }
    });
    s.cards.forEach(function (x) {
      if (x.status !== 'active') return;
      const c = G.client(x.client);
      if (c && c.status === 'active') { K.charge(c, s.pricing.card, 'Card fee ' + x.id); K.income('comm', s.pricing.card); }
    });
    L('STEP087', 'JAHRESABSCHLUSS ' + year, 'GEWINN CHF ' + U.fmt(rev - cost));
  }
})(window.PBS);
