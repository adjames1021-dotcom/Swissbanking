/* PBS/Web 4.2 – Behörden: Exposure-Abbau, Ermittlungsverfahren, verdeckte Ermittler, Rechtshilfe/Amtshilfe,
   Anwälte, Lobbying, Aufsicht (EBK/FINMA), Revision */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }
  const STAGES = ['', 'Preliminary inquiry', 'Formal investigation', 'Indictment pending'];
  G.STAGES = STAGES;

  /* ---------- Ermittlungsverfahren ---------- */
  K.lawyerFactor = function (auth) {
    const s = S();
    let f = 1;
    if (s.legal.ch) f *= D.LAWYERS.ch.factor;
    if (s.legal.us && auth === 'US') f *= D.LAWYERS.us.factor;
    return f;
  };
  K.investigate = function (auth, amount, reason) {
    const s = S();
    if (!D.AUTH[auth] || auth === 'EBK') return;
    let inv = s.inv[auth];
    if (!inv) {
      inv = s.inv[auth] = { stage: 1, progress: 0, opened: s.date, reasons: [] };
      K.msg({
        type: 'memo', kind: 'info', from: 'Dr. Iris Wyss, Legal & Compliance', subject: G.authShort(auth) + ': investigation opened against the bank',
        body: 'Our correspondent lawyers in ' + D.AUTH[auth].city + ' report that the ' + G.authName(auth) + ' has opened a preliminary inquiry into "assistance to tax evasion" by Swiss banks, with explicit reference to Bankhaus Vogt & Cie.\n\nUntil further notice: no trips by our bankers to ' + K.cname(D.AUTH[auth].c) + ', no client documents in luggage, no new relationships from that country without a background check.\n\nI recommend retaining specialised counsel.'
      });
    }
    if (reason && inv.reasons.indexOf(reason) < 0) inv.reasons.push(reason);
    setProgress(auth, inv.progress + amount * K.lawyerFactor(auth));
  };
  function setProgress(auth, p) {
    const s = S();
    const inv = s.inv[auth];
    if (!inv) return;
    inv.progress = U.clamp(p, 0, 100);
    const stage = inv.progress >= 70 ? 3 : inv.progress >= 35 ? 2 : 1;
    if (stage > inv.stage) {
      inv.stage = stage;
      K.msg({
        type: 'memo', kind: 'info', from: 'Dr. Iris Wyss, Legal & Compliance', subject: G.authShort(auth) + ': ' + STAGES[stage].toLowerCase(),
        body: stage === 2 ?
          'The proceedings in ' + K.cname(D.AUTH[auth].c) + ' have become a formal criminal investigation. Search warrants against clients and against any presence of the bank in the country must be expected. Bankers travelling there risk arrest.' :
          'Our lawyers expect an indictment of the bank in ' + K.cname(D.AUTH[auth].c) + ' within months. Only a drastic reduction of our exposure – closing or regularising relationships, cooperation – can still stop it.'
      });
    }
    inv.stage = Math.max(inv.stage, stage);
    if (inv.progress >= 100) G.endGame('indicted', { auth: auth });
  }

  /* ---------- Erledigung von Überwachungsalarmen ---------- */
  G.alertQuality = function (a, just) {
    const c = G.client(a.client);
    if (just === 'phone') return 'thin';
    if (a.rules.some(function (r) { return r === 'TM-03' || r === 'TM-04' || r === 'TM-09'; })) return 'thin';
    if (a.rules.indexOf('TM-05') >= 0 && c && !c.formA) return 'thin';
    if (a.rules.indexOf('TM-07') >= 0 && just !== 'sale' && just !== 'income') return 'thin';
    return 'adequate';
  };
  function closeOne(a, just, comment) {
    const s = S();
    a.weak = G.alertQuality(a, just) === 'thin';
    a.status = 'closed';
    a.res = { just: just, comment: comment || '', d: s.date, t: s.clock, by: s.user.id };
  }
  G.closeAlert = function (id, just, comment) {
    const a = S().alerts.find(function (x) { return x.id === id; });
    if (!a || a.status !== 'open') return K.err('Alert is not open.');
    if (!just) return K.err('Select a justification.');
    const t = K.use(8);
    if (t) return t;
    closeOne(a, just, comment);
    G.save();
    return { ok: true };
  };
  G.closeAlerts = function (ids, just, comment) {
    const s = S();
    if (!just) return K.err('Select a justification.');
    const list = ids.map(function (id) { return s.alerts.find(function (x) { return x.id === id && x.status === 'open'; }); }).filter(Boolean);
    if (!list.length) return K.err('No open alerts selected.');
    const t = K.use(3 * list.length + 2);
    if (t) return t;
    list.forEach(function (a) { closeOne(a, just, comment); });
    G.save();
    return { ok: true, n: list.length };
  };
  G.reportAlert = function (id) {
    const s = S();
    const a = s.alerts.find(function (x) { return x.id === id; });
    if (!a || a.status !== 'open') return K.err('Alert is not open.');
    const t = K.use(25);
    if (t) return t;
    const c = G.client(a.client);
    const auth = K.homeAuth(c);
    K.heat('EBK', -6, 'Reports to MROS');
    if (auth) K.heat(auth, 4, 'MROS information shared with foreign FIU');
    K.discretion(-6);
    K.terminate(c, 'mros');
    a.status = 'reported';
    a.res = { just: 'mros', comment: 'Report filed with MROS (Art. 9 GwG). Assets blocked.', d: s.date, t: s.clock, by: s.user.id };
    G.checkGameOver();
    G.save();
    return { ok: true };
  };

  /* ---------- Verdeckte Ermittler ---------- */
  K.stingChance = function (country) {
    const s = S();
    const auth = D.COUNTRIES[country] && D.COUNTRIES[country].auth;
    if (!auth) return 0;
    let p = s.heat[auth] / 500;
    if (auth === 'US' && s.date >= '2008-01-01') p += 0.08;
    if (auth === 'DE' && s.date >= '2010-01-01') p += 0.04;
    return Math.min(0.3, p * K.diff().threat);
  };
  // "Sonderleistungen" gegenüber einem Lockvogel fliegen auf
  K.specialService = function (c, what) {
    const s = S();
    c.special = (c.special || 0) + 1;
    if (!c.sting || c.stingRevealed) return;
    c.stingRevealed = s.date;
    const auth = K.homeAuth(c) || 'US';
    K.heat(auth, 12, 'Undercover investigation');
    K.personal(15, 'Services to an undercover agent');
    K.investigate(auth, 25, 'Undercover agent posing as client');
    K.msg({
      type: 'memo', kind: 'info', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'Client ' + c.rubrik + ' was an undercover investigator',
      body: 'Our lawyers have been shown recordings: "' + c.name + '" (' + c.rubrik + ') is an undercover officer of the ' + G.authName(auth) + '. Every conversation since the account opening was recorded – including the ' + what + ' you approved.\n\nThe file is now part of the proceedings against the bank, and your name is in it.'
    });
  };

  /* ---------- Anwälte und Lobbying ---------- */
  G.retainLawyer = function (key, on) {
    const s = S();
    if (!D.LAWYERS[key]) return K.err('Unknown law firm.');
    const t = K.use(20);
    if (t) return t;
    s.legal[key] = on ? s.date : null;
    G.save();
    return { ok: true };
  };
  G.setLobby = function (key, on) {
    const s = S();
    if (!D.LOBBY[key]) return K.err('Unknown measure.');
    const t = K.use(20);
    if (t) return t;
    s.lobby[key] = on ? s.date : null;
    if (on && key === 'assoc') K.discretion(2);
    G.save();
    return { ok: true };
  };
  K.retainerCosts = function () {
    const s = S();
    let legal = 0, lobby = 0;
    Object.keys(D.LAWYERS).forEach(function (k) { if (s.legal[k]) legal += D.LAWYERS[k].cost / 250; });
    Object.keys(D.LOBBY).forEach(function (k) { if (s.lobby[k]) lobby += D.LOBBY[k].cost / 250; });
    K.expense('legal', legal);
    K.expense('lobby', lobby);
  };

  /* ---------- Tägliche Entwicklung der Aufmerksamkeit ---------- */
  K.authoritiesDaily = function (log) {
    const s = S();
    const overdue = G.overdueAlerts();
    overdue.forEach(function () { K.heat('EBK', 0.35, 'Overdue compliance alerts'); });
    G.activeClients().forEach(function (c) {
      if (c.risk === 'PEP') K.heat('EBK', s.date >= '2003-07-01' ? 0.045 : 0.03, 'PEP relationships (ongoing)');
      if (c.risk === 'Increased') K.heat('EBK', 0.008, 'Increased-risk relationships (ongoing)');
      const auth = K.homeAuth(c);
      if (auth && !c.holdMail && c.declared < 1) {
        K.heat(auth, 0.05 * (1 - c.declared) * Math.min(1, G.clientAUM(c.id) / 4e6), 'Statements mailed to clients abroad');
      }
    });
    const ci = G.capitalInfo();
    if (ci.ratio < 1) K.heat('EBK', 0.3, 'Capital adequacy shortfall');
    // Natürlicher Abbau
    const d = K.diff().heatDecay;
    Object.keys(s.heat).forEach(function (k) {
      let dec = k === 'EBK' ? (overdue.length ? 0 : 0.09 * (s.lobby.board ? 1.5 : 1)) : 0.12 * (s.lobby.board ? 1.15 : 1);
      s.heat[k] = Math.max(0, s.heat[k] - dec * d);
    });
    // Verfahren
    G.FOREIGN.forEach(function (a) {
      const h = s.heat[a];
      const inv = s.inv[a];
      if (!inv) {
        if (h >= 55 && K.chance((h - 55) / 300 * K.diff().threat)) { K.investigate(a, 5, 'Accumulated evidence'); log.push(['EVT', 'ERMITTLUNG ERÖFFNET ' + a, 'WARNUNG']); }
        return;
      }
      const delta = h >= 45 ? (h - 45) / 50 * K.diff().inv * K.lawyerFactor(a) : -0.3;
      setProgress(a, inv.progress + delta);
      if (inv.progress <= 0 && inv.stage === 1) {
        delete s.inv[a];
        K.msg({ type: 'memo', from: 'Dr. Iris Wyss, Legal & Compliance', subject: G.authShort(a) + ': inquiry discontinued', body: 'The preliminary inquiry in ' + K.cname(D.AUTH[a].c) + ' has been discontinued for lack of evidence.' });
      }
      // Razzia bei der Repräsentanz
      if (inv && inv.stage >= 2) {
        Object.keys(s.branches).forEach(function (k) {
          const L = D.LOCATIONS[k];
          if (L.kind === 'rep' && D.COUNTRIES[L.c].auth === a && K.chance(0.02)) raid(k, a, log);
        });
      }
    });
    // Aufsicht: Enforcement-Verfahren
    if (s.heat.EBK >= 80 && !s.flags.enforcement) {
      s.flags.enforcement = s.date;
      K.expense('legal', 500000);
      K.msg({ type: 'letter', from: G.authName('EBK') + ', Bern', subject: 'Opening of enforcement proceedings', body: 'Dear Sirs,\n\nWe hereby open enforcement proceedings against Bankhaus Vogt & Cie and appoint an independent investigator at the expense of the bank (estimated costs CHF 500,000).\n\nThe investigation will examine the organisation, the risk management and the guarantee of irreproachable business conduct by the members of management. We reserve the right to withdraw the licence.\n\n' + G.authName('EBK') });
      log.push(['EVT', 'ENFORCEMENT-VERFAHREN', 'ALARM']);
    }
    if (s.heat.EBK < 50) s.flags.enforcement = null;
    if (s.lobby.board && K.chance(0.001)) {
      K.heat('EBK', 3, 'Press reports');
      K.discretion(-3);
      s.news.push({ d: s.date, text: 'Zürcher Finanzblatt: "National Councillor sits on board of discreet private bank"' });
    }
    maybeMLA(log);
    maybeEBK(log);
  };

  function raid(key, auth, log) {
    const s = S();
    const L = D.LOCATIONS[key];
    delete s.branches[key];
    K.heat(auth, 10, 'Raid on representative office');
    setProgress(auth, s.inv[auth].progress + 15);
    K.personal(5, 'Raid on representative office');
    G.activeClients().forEach(function (c) { if (K.homeAuth(c) === auth && c.declared < 1) K.loyal(c, -10); });
    K.msg({
      type: 'telex', from: L.name, subject: 'RAID – ' + L.name,
      body: 'THIS MORNING 07.10 HOURS ' + G.authShort(auth).toUpperCase() + ' OFFICERS SEARCHED OUR PREMISES WITH A WARRANT. ALL FILES, DIARIES AND COMPUTERS SEIZED. STAFF QUESTIONED FOR SIX HOURS. OFFICE SEALED. PLEASE ADVISE.'
    });
    log.push(['EVT', 'RAZZIA ' + L.name.toUpperCase().slice(0, 20), 'ALARM']);
  }

  /* ---------- Rechtshilfe / Amtshilfe ---------- */
  function maybeMLA(log) {
    const s = S();
    G.FOREIGN.forEach(function (auth) {
      const h = s.heat[auth];
      if (h < 38) return;
      if (s.messages.some(function (m) { return m.kind === 'mla' && !m.resolved && m.data.auth === auth; })) return;
      const inv = s.inv[auth];
      if (!K.chance((h - 38) / 380 * (inv ? 1 + inv.stage * 0.3 : 1) * K.diff().threat)) return;
      const country = D.AUTH[auth].c;
      const cands = G.activeClients().filter(function (c) { return c.dom === country && c.declared < 1 && c.funded; });
      if (!cands.length) return;
      const c = K.weighted(cands, function (x) { return G.clientAUM(x.id) * (1 - x.declared) + 1; });
      const treaty = s.date >= D.AMTSHILFE[auth];
      const fraud = K.chance(0.25 + Math.max(0, h - 60) / 150 + (c.b2b ? 0.25 : 0));
      const clear = K.chance(0.72);
      const leaning = clear ? fraud : (K.chance(0.65) ? fraud : !fraud);
      const requester = treaty ? G.authName(auth) : {
        DE: 'Staatsanwaltschaft ' + K.pick(['Stuttgart', 'München I', 'Düsseldorf', 'Bochum']),
        IT: 'Procura della Repubblica di ' + K.pick(['Milano', 'Como', 'Bergamo']),
        FR: 'Juge d\'instruction, Tribunal de grande instance de ' + K.pick(['Paris', 'Lyon']),
        US: 'US Department of Justice, Tax Division',
        GB: 'Crown Prosecution Service on behalf of the ' + G.authName('GB')
      }[auth];
      const allegation = fraud ?
        'The suspect is alleged to have used falsified invoices and forged balance sheets of a company under his control in order to reduce its taxable profits' + (c.b2b ? ', and to have disguised his Swiss assets as a bank loan' : '') + '.' :
        'The suspect is alleged to have failed to declare income and assets held abroad in his tax returns.';
      let assessment;
      if (treaty) {
        assessment = 'This is a request for administrative assistance under the revised double taxation agreement. Since ' + U.fmtDate(D.AMTSHILFE[auth]) + ' assistance is granted for simple tax evasion as well. An objection has practically no chance; it only costs money. The client has a right to be heard and will learn of the request.';
      } else {
        assessment = clear ?
          (fraud ? 'Tax fraud (Abgabebetrug) – use of forged documents. Dual criminality is given; assistance must be granted.' :
            'Simple tax evasion (Steuerhinterziehung). Not a criminal offence in Switzerland; no dual criminality. Assistance may be refused (Art. 3 para. 3 IRSG).') :
          'The request mentions undeclared income as well as "irregular accounting" without specifying forged documents. Assessment uncertain – our provisional view: ' +
          (leaning ? 'probably tax fraud; assistance would have to be granted.' : 'probably simple tax evasion; an objection appears promising.');
      }
      K.msg({
        type: 'letter', kind: 'mla', from: treaty ? 'Federal Tax Administration, Bern – Exchange of Information Service' : 'Federal Office of Justice, Bern – Mutual Legal Assistance Unit',
        subject: (treaty ? 'Request for administrative assistance' : 'Request for mutual legal assistance') + ' – ' + requester + ' – re: ' + c.name,
        body: (treaty ? 'Request for administrative assistance in tax matters\n\n' : 'Request for mutual legal assistance in criminal matters\n\n') + 'The ' + requester + ' (' + K.cname(country) + ') has requested assistance concerning ' + c.name + ', ' + c.city + '.\n\n' +
          allegation + '\n\nThe requesting authority asks for production of all account documents and for information on any structures of which the person is the beneficial owner.\n\nYou are requested to state within ten days whether your institution maintains such relationships and whether you object to the production of documents.\n\n— Internal note, Dr. Iris Wyss, Legal & Compliance —\n' + assessment +
          (c.booking ? '\n\nNote: the assets are booked with our subsidiary ' + D.LOCATIONS[c.booking].name + '; only the Swiss records are covered by the request.' : ''),
        actions: [['object', treaty ? 'Object (appeal to the Federal Administrative Court)' : 'Object: fiscal offence – refuse assistance'], ['produce', 'Produce account documents']],
        data: { auth: auth, client: c.id, fraud: fraud, clear: clear, treaty: treaty }, due: U.addBusinessDays(s.date, 10)
      });
      log.push(['EVT', (treaty ? 'AMTSHILFEGESUCH ' : 'RECHTSHILFEGESUCH ') + auth, c.rubrik]);
    });
  }

  G.handlers.mla = function (m, key) {
    const s = S();
    const c = G.client(m.data.client);
    const auth = m.data.auth;
    if (!c || c.status !== 'active') return { text: 'Relationship already closed – request answered accordingly.' };
    const offshore = !!c.booking;
    if (m.data.treaty) {
      K.expense('legal', key === 'object' ? 40000 : 5000);
      K.heat(auth, -4, 'Information delivered under tax treaty');
      K.loyal(c, -30);
      if (offshore) return { text: 'The Swiss records were delivered. Most assets are booked abroad, so the damage is limited – but the client is shaken.' };
      if (K.chance(0.5)) { c.declared = 1; c.regularised = s.date; K.note(c, 'Client regularised after administrative assistance.'); return { text: (key === 'object' ? 'The Federal Administrative Court dismissed the appeal. ' : '') + 'The documents were delivered. The client has filed a voluntary disclosure at home and stays – for now.' }; }
      K.schedule(K.rint(3, 15), 'leave', { client: c.id, reason: 'administrative assistance' });
      return { text: (key === 'object' ? 'The Federal Administrative Court dismissed the appeal. ' : '') + 'The documents were delivered. The client is moving his assets elsewhere.' };
    }
    if (key === 'object') {
      if (!m.data.fraud) {
        K.heat(auth, 2, 'Mutual assistance refused');
        K.loyal(c, 10);
        K.discretion(2);
        K.expense('legal', 15000);
        return { text: 'Objection upheld. The Federal Office of Justice refused assistance (fiscal offence). Legal costs CHF 15,000.' };
      }
      K.heat('EBK', 14, 'Unlawful refusal of mutual assistance');
      K.heat(auth, 8, 'Mutual assistance – documents produced by court order');
      K.investigate(auth, offshore ? 3 : 8, 'Bank obstructed mutual assistance');
      K.expense('legal', 60000);
      if (!offshore) K.terminate(c, 'seized');
      return { text: 'Objection rejected: the offence qualifies as tax fraud. Documents produced by order; the bank\'s conduct was reported to the regulator.' + (offshore ? '' : ' Relationship blocked and terminated.') + ' Legal costs CHF 60,000.' };
    }
    if (m.data.fraud) {
      K.heat(auth, -10, 'Co-operation with foreign authorities');
      K.heat('EBK', -3, 'Co-operation with authorities');
      if (s.inv[auth]) setProgress(auth, s.inv[auth].progress - 8);
      K.discretion(-4);
      if (!offshore) K.terminate(c, 'seized');
      return { text: 'Account documents produced via the Federal Office of Justice.' + (offshore ? '' : ' Relationship blocked and terminated.') };
    }
    K.heat('EBK', 6, 'Breach of banking secrecy (Art. 47 BankG)');
    K.heat(auth, -6, 'Documents received by foreign authority');
    K.discretion(-12);
    G.activeClients().forEach(function (o) { if (o.dom === c.dom && o.id !== c.id) K.loyal(o, -6); });
    if (!offshore) K.terminate(c, 'seized');
    return { text: 'Documents produced although the offence was purely fiscal. This breaches banking secrecy; the regulator has taken note and word is spreading among clients.' };
  };

  /* ---------- Aufsicht ---------- */
  function maybeEBK(log) {
    const s = S();
    if (s.heat.EBK < 55) return;
    if (s.messages.some(function (m) { return m.kind === 'ebk' && !m.resolved; })) return;
    if (s.flags.lastEbk && U.businessDaysBetween(s.flags.lastEbk, s.date) < 40) return;
    if (!K.chance((s.heat.EBK - 55) / 220)) return;
    s.flags.lastEbk = s.date;
    const yearAgo = U.addBusinessDays(s.date, -250);
    const n = (s.flags.reviews || []).filter(function (d) { return d >= yearAgo; }).length;
    const cost = 250000 * (1 + n * 0.6);
    K.msg({
      type: 'letter', kind: 'ebk', from: G.authName('EBK') + ', Bern', subject: 'Request for information – due diligence in private banking',
      body: 'Dear Sirs,\n\nIn the course of our ongoing supervision we have received information which gives rise to questions regarding the observance of due-diligence obligations by your institution, in particular in connection with cash transactions, relationships with politically exposed persons and the clearing of transaction-monitoring alerts.\n\nWe request you to submit a written statement within 30 days. We reserve the right to order an extraordinary audit at the expense of the bank.\n\n' + G.authName('EBK'),
      actions: [['review', 'Commission special review (CHF ' + U.fmt(cost, 0) + ')'], ['reply', 'Written reply by Legal (CHF 20,000)']],
      data: { cost: cost, effect: 12 / Math.pow(2, n) }, due: U.addBusinessDays(s.date, 15)
    });
    log.push(['EVT', 'SCHREIBEN ' + G.authShort('EBK'), 'WARNUNG']);
  }
  G.handlers.ebk = function (m, key) {
    const s = S();
    if (key === 'review') {
      K.expense('legal', m.data.cost);
      K.heat('EBK', -m.data.effect, 'Special review commissioned');
      s.flags.reviews = (s.flags.reviews || []).concat([s.date]);
      return { text: 'Special review commissioned from Hürlimann Revision AG (CHF ' + U.fmt(m.data.cost, 0) + ').' + (m.data.effect >= 10 ? ' The regulator welcomes the initiative.' : ' The regulator notes that this is not the first review and remains sceptical.') };
    }
    K.expense('legal', 20000);
    const overdue = G.overdueAlerts().length;
    if (overdue) {
      K.heat('EBK', 6, 'Unsatisfactory reply to regulator');
      return { text: 'Written reply sent. The regulator notes ' + overdue + ' overdue alert(s) and is not satisfied.' };
    }
    K.heat('EBK', -3, 'Reply to regulator');
    return { text: 'Written reply sent by Legal & Compliance. The regulator has no further questions for the time being.' };
  };

  /* ---------- Revision ---------- */
  K.sched.auditReport = function (d, log) {
    const s = S();
    const y = d.year;
    const findings = [];
    let delta = 0;
    const noA = G.activeClients().filter(function (c) { return !c.formA; });
    if (noA.length) { findings.push(noA.length + ' relationship(s) without Form A: ' + noA.slice(0, 8).map(function (c) { return c.rubrik; }).join(', ') + (noA.length > 8 ? ' …' : '')); delta += Math.min(10, noA.length * 2); }
    let weakFound = 0;
    s.alerts.forEach(function (a) {
      if (a.weak && !a.audited) { a.audited = true; if (K.chance(0.35)) weakFound++; }
    });
    if (weakFound) { findings.push(weakFound + ' alert closure(s) with insufficient documentation (sample)'); delta += Math.min(20, weakFound * 2); }
    const old = s.alerts.filter(function (a) { return a.status === 'open' && U.businessDaysBetween(a.d, s.date) > 20; });
    if (old.length) { findings.push(old.length + ' alert(s) open for more than 20 business days'); delta += Math.min(10, old.length * 2); }
    const peps = G.activeClients().filter(function (c) { return c.risk === 'PEP'; });
    if (peps.length > 2) { findings.push('High concentration of PEP relationships (' + peps.length + ')'); delta += Math.min(8, (peps.length - 2) * 2); }
    const dormantFees = G.activeClients().filter(function (c) { return c.dormant && !c.dormantReported; });
    if (dormantFees.length && K.chance(0.6)) { findings.push(dormantFees.length + ' dormant relationship(s) still charged full fees without contact to heirs'); delta += Math.min(8, dormantFees.length * 3); }
    if (G.capitalInfo().ratio < 1) { findings.push('Capital requirements not met'); delta += 6; }
    const hidden = G.activeClients().filter(function (c) { return c.hiddenPep && K.chance(0.5); });
    if (hidden.length) {
      findings.push(hidden.length + ' politically exposed person(s) not classified as PEP: ' + hidden.map(function (c) { return c.rubrik; }).join(', '));
      delta += hidden.length * 6;
      hidden.forEach(function (c) { c.risk = 'PEP'; delete c.hiddenPep; });
    }
    const ws = G.workstationExposure ? G.workstationExposure() : { live: [] };
    if (ws.live.length && K.chance(0.7)) { findings.push('Client data stored outside the core banking system on workstation ZH-BS64-0217 (' + ws.live.length + ' file(s), e.g. ' + ws.live[0].split('\\').pop() + ')'); delta += Math.min(6, ws.live.length * 2); }
    if (s.flags.retroStop === false && s.date >= '2012-10-30') { findings.push('Retrocessions retained without client waiver after Federal Supreme Court ruling'); delta += 3; }
    const comp = G.activeStaff('comp');
    if (comp.some(function (x) { return x.skill >= 3; }) && s.staff.some(function (x) { return x.embezzled && !x.embezzled.found; }) && K.chance(0.6)) {
      K.discoverEmbezzlement(log, 'The audit');
      findings.push('Embezzlement by an employee (see separate memo)');
    }
    if (!findings.length) delta = -8;
    K.heat('EBK', delta, 'External audit ' + y);
    K.expense('legal', 180000 + G.activeClients().length * 1500);
    s.audits.unshift({ year: y, d: s.date, findings: findings, delta: delta });
    K.msg({
      type: 'letter', kind: 'audit', from: 'Hürlimann Revision AG, Zürich (statutory auditor)', subject: 'Long-form audit report ' + y + ' (Art. 21 BankG)',
      body: 'We have completed our audit of Bankhaus Vogt & Cie for the financial year ' + y + '.\n\n' +
        (findings.length ? 'We draw your attention to the following findings, which will be included in our report to the ' + G.authName('EBK') + ':\n\n' + findings.map(function (f, i) { return (i + 1) + '. ' + f; }).join('\n') :
          'Our audit did not reveal any findings regarding compliance with the due-diligence obligations. Our report to the regulator will contain an unqualified opinion.') +
        '\n\nAudit fee: CHF ' + U.fmt(180000 + G.activeClients().length * 1500, 0) + '.\n\nHürlimann Revision AG'
    });
    log.push(['EVT', 'REVISIONSBERICHT ' + y, findings.length ? findings.length + ' FESTSTELLUNGEN' : 'OHNE BEFUND']);
  };

  // Risiko einer Festnahme bei Reisen ins Ausland
  G.travelRisk = function (country) {
    const s = S();
    const auth = D.COUNTRIES[country] && D.COUNTRIES[country].auth;
    if (!auth || !s.inv[auth]) return 0;
    const inv = s.inv[auth];
    if (inv.stage < 2) return 0.01;
    return Math.min(0.7, (inv.stage - 1) * 0.15 * (0.4 + s.career.exposure / 100) * K.diff().threat);
  };
})(window.PBS);
