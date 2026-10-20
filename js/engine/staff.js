/* PBS/Web 4.2 – Personal: Bestand, Kapazitäten, Rekrutierung, Stimmung, Abgänge, Whistleblower, Datendiebstahl */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  const tr = PBS.L.t;
  function S() { return G.state; }
  function present(x) { return x.status === 'active' && (!x.absentUntil || x.absentUntil < S().date); }

  /* ---------- Kapazitäten ---------- */
  G.rmCapacity = function (r) { return Math.round(16 + r.skill * 2.5); };
  G.rmLoad = function (r) { return G.activeClients().filter(function (c) { return c.rm === r.id; }).length; };
  G.complianceCapacity = function () {
    return Math.floor(G.activeStaff('comp').filter(present).reduce(function (t, x) { return t + 1 + x.skill * 0.6; }, 0));
  };
  G.opsCapacity = function () {
    return G.activeStaff('ops').filter(present).reduce(function (t, x) { return t + 20 + 6 * x.skill; }, 0);
  };
  G.securityLevel = function () {
    const it = G.activeStaff('it');
    return it.reduce(function (t, x) { return t + x.skill; }, 0) + (S().flags.dataAudit ? 3 : 0);
  };
  G.marketSalary = function (role, skill) { return D.ROLES[role].market * (0.7 + 0.15 * skill); };
  G.seats = function () {
    const s = S();
    return Object.keys(s.branches).reduce(function (t, k) { return t + (D.LOCATIONS[k].seats || 0); }, 0);
  };
  G.payroll = function () { return G.activeStaff().reduce(function (t, x) { return t + x.salary; }, 0); };

  /* ---------- Personalaktionen ---------- */
  G.hire = function (candId) {
    const s = S();
    const cand = s.candidates.find(function (x) { return x.id === candId; });
    if (!cand) return K.err('Applicant no longer available.');
    if (G.activeStaff().length >= G.seats()) return K.err('No free desks. Open a branch to create space (Organisation › Branches).');
    const t = K.use(30);
    if (t) return t;
    s.candidates = s.candidates.filter(function (x) { return x.id !== candId; });
    const st = {
      id: 'S' + U.pad(++s.ctr.staff, 2), name: cand.name, role: cand.role, title: cand.title, desk: cand.desk, skill: cand.skill,
      integrity: cand.integrity, morale: 72, salary: cand.salary, hired: s.date, status: 'active', known: {}, from: cand.from
    };
    s.staff.push(st);
    K.expense('staff', cand.salary * 0.2);
    if (cand.book) {
      for (let i = 0; i < cand.book; i++) K.schedule(K.rint(3, 25), 'follower', { rm: st.id, c: K.pick(cand.desk) });
    }
    G.save();
    return { ok: true, staff: st };
  };

  G.fire = function (sid) {
    const s = S();
    const st = G.staff(sid);
    if (!st || st.status !== 'active') return K.err('Employee is not active.');
    const t = K.use(20);
    if (t) return t;
    st.status = 'fired';
    st.left = s.date;
    K.expense('staff', st.salary / 2);
    G.activeStaff().forEach(function (x) { K.morale(x, -3); });
    if (st.role === 'rm') reassign(st);
    if (st.integrity <= 2 && (st.morale < 50 || K.chance(0.3))) K.schedule(K.rint(10, 40), 'revenge', { staff: sid });
    G.save();
    return { ok: true };
  };
  function reassign(st) {
    G.activeClients().forEach(function (c) {
      if (c.rm !== st.id) return;
      const r = K.deskRM(c.dom);
      c.rm = r ? r.id : null;
      K.loyal(c, -5);
      K.note(c, 'Relationship manager ' + st.name + ' has left the bank. New RM: ' + (r ? r.name : 'none assigned') + '.');
    });
  }
  K.reassign = reassign;

  G.raise = function (sid, pct) {
    const st = G.staff(sid);
    if (!st || st.status !== 'active') return K.err('Employee is not active.');
    const t = K.use(10);
    if (t) return t;
    st.salary = Math.round(st.salary * (1 + pct / 100) / 1000) * 1000;
    K.morale(st, pct * 1.5);
    G.save();
    return { ok: true };
  };
  G.payBonus = function (sid, amount) {
    const st = G.staff(sid);
    if (!st || st.status !== 'active') return K.err('Employee is not active.');
    if (!(amount > 0)) return K.err('Enter an amount.');
    const t = K.use(5);
    if (t) return t;
    K.expense('staff', amount);
    K.morale(st, Math.min(30, amount / st.salary * 60));
    G.save();
    return { ok: true };
  };
  G.train = function (sid) {
    const s = S();
    const st = G.staff(sid);
    if (!st || st.status !== 'active') return K.err('Employee is not active.');
    if (st.skill >= 5) return K.err(st.name + ' is already at the highest skill level (5).');
    if (st.absentUntil && st.absentUntil >= s.date) return K.err(st.name + ' is absent.');
    const t = K.use(5);
    if (t) return t;
    K.expense('staff', 12000);
    st.absentUntil = U.addBusinessDays(s.date, 3);
    K.schedule(4, 'trained', { staff: sid });
    K.morale(st, 5);
    G.save();
    return { ok: true };
  };
  K.sched.trained = function (d, log) {
    const st = G.staff(d.staff);
    if (!st || st.status !== 'active') return;
    if (K.chance(0.6)) { st.skill = Math.min(5, st.skill + 1); log.push(['EVT', tr('WEITERBILDUNG ', 'TRAINING ') + st.name.toUpperCase(), tr('BESTANDEN', 'PASSED')]); }
  };
  G.vet = function (sid) {
    const st = G.staff(sid);
    if (!st) return K.err('Unknown employee.');
    const t = K.use(10);
    if (t) return t;
    K.expense('legal', 3000);
    st.known = st.known || {};
    st.known.integrity = true;
    G.save();
    return { ok: true, integrity: st.integrity };
  };
  G.setDelegation = function (on) { S().delegate = !!on; G.save(); return { ok: true }; };
  G.dataAudit = function () {
    const s = S();
    if (s.flags.dataAudit) return K.err('Access controls already tightened.');
    const t = K.use(30);
    if (t) return t;
    K.expense('premises', 250000);
    s.flags.dataAudit = s.date;
    G.activeStaff().forEach(function (x) { K.morale(x, -4); });
    G.save();
    return { ok: true };
  };

  /* ---------- Bewerber ---------- */
  const DESKS = [
    { title: 'desk Germany', desk: ['DE', 'AT', 'NL', 'CH'] }, { title: 'desk Italy', desk: ['IT'] }, { title: 'desk France', desk: ['FR', 'LB'] },
    { title: 'desk Americas', desk: ['US', 'AR', 'BR', 'VE'] }, { title: 'desk UK & Greece', desk: ['GB', 'GR'] }, { title: 'desk CIS & Middle East', desk: ['RU', 'KZ', 'AE'] }
  ];
  K.genCandidates = function () {
    const s = S();
    const out = [];
    const need = [];
    if (!G.activeStaff('teller').length) need.push('teller');
    if (s.pricing.courierOn && !G.activeStaff('courier').length) need.push('courier');
    if (!G.activeStaff('it').length) need.push('it');
    const n = K.rint(3, 5);
    for (let i = 0; i < n; i++) {
      const role = need.length ? need.shift() : K.weighted(['rm', 'comp', 'ops', 'it', 'pm', 'courier', 'teller'], function (r) { return { rm: 3.5, comp: 2, ops: 1.5, it: 1, pm: 1, courier: 0.8, teller: 0.5 }[r]; });
      const skill = K.weighted([1, 2, 3, 4, 5], function (k) { return [1, 3, 4, 2.5, 0.8][k - 1]; });
      const integrity = K.weighted([1, 2, 3, 4, 5], function (k) { return [0.6, 1.4, 3, 3, 1.5][k - 1]; });
      const female = K.chance(0.35);
      const name = K.pick(female ? D.CH_NAMES.f : D.CH_NAMES.m) + ' ' + K.pick(D.CH_NAMES.l);
      const from = K.pick(D.COMPETITORS);
      const salary = Math.round(G.marketSalary(role, skill) * K.between(0.9, 1.15) / 1000) * 1000;
      const c = { id: 'B' + U.pad(++s.ctr.cand, 3), name: name, role: role, skill: skill, integrity: integrity, salary: salary, from: from, title: D.ROLES[role].label };
      const hints = [];
      if (role === 'rm') {
        const d = K.pick(DESKS);
        c.desk = d.desk;
        c.title = 'Relationship manager, ' + d.title;
        if (skill >= 3 && K.chance(0.45)) { c.book = K.rint(2, 5); hints.push('Says ' + c.book + ' clients would follow.'); }
      }
      if (role === 'courier') hints.push(integrity <= 2 ? 'Former customs officer. Knows the crossings.' : 'Former driver of a security company.');
      if (integrity <= 2 && K.chance(0.6)) hints.push('References could not be verified.');
      if (integrity >= 4 && K.chance(0.5)) hints.push('Excellent references.');
      if (skill >= 4) hints.push('Highly regarded in the market.');
      c.hints = hints.join(' ');
      out.push(c);
    }
    s.candidates = out;
  };

  /* ---------- Tägliche Personalentwicklung ---------- */
  K.staffDaily = function (log) {
    const s = S();
    const overtimeH = (s.overtime || 0) / 60;
    G.activeStaff().forEach(function (x) {
      const ratio = x.salary / G.marketSalary(x.role, x.skill);
      let target = 58 + (ratio - 1) * 80;
      if (x.role === 'rm') { const l = G.rmLoad(x) / G.rmCapacity(x); if (l > 1) target -= (l - 1) * 40; }
      if (x.role === 'ops' && s.today.ops > G.opsCapacity()) target -= 10;
      x.morale = U.clamp(x.morale + (target - x.morale) * 0.03 - overtimeH * 0.4, 0, 100);
      if (x.absentUntil && x.absentUntil < s.date) delete x.absentUntil;
    });
    // Kündigungen
    G.activeStaff().forEach(function (x) {
      if (x.morale < 30 && !x.noticePending && K.chance(0.025)) {
        x.noticePending = true;
        K.msg({
          type: 'letter', kind: 'resign', from: x.name + ', ' + x.title, subject: 'Resignation ' + x.name,
          body: 'Dear Managing Partner,\n\nI hereby resign from my position with the bank, observing the contractual notice period. I have accepted an offer from ' + K.pick(D.COMPETITORS) + '.\n\nShould my situation here improve substantially, I would be prepared to reconsider.\n\nWith kind regards\n' + x.name,
          actions: [['counter', 'Counter-offer: +20% salary'], ['accept', 'Accept the resignation']], data: { staff: x.id }
        });
        log.push(['EVT', tr('KUENDIGUNG ', 'RESIGNATION ') + x.name.toUpperCase(), tr('WARNUNG', 'WARNING')]);
      }
    });
    // Abwerbung guter RMs
    G.activeStaff('rm').forEach(function (x) {
      if (x.skill >= 4 && !x.noticePending && K.chance(0.003)) {
        x.noticePending = true;
        K.msg({
          type: 'memo', kind: 'resign', from: x.name + ', ' + x.title, subject: 'Offer from a competitor (' + x.name + ')',
          body: 'I wanted to tell you myself: ' + K.pick(D.COMPETITORS) + ' has offered me the position of head of private banking, with a guaranteed bonus. I would prefer to stay, but not at any price.\n\n' + x.name,
          actions: [['counter', 'Counter-offer: +20% salary'], ['accept', 'Let the employee go']], data: { staff: x.id, poach: true }
        });
        log.push(['EVT', tr('ABWERBUNG ', 'POACHING ') + x.name.toUpperCase(), tr('WARNUNG', 'WARNING')]);
      }
    });
    // Whistleblower und Datendiebstahl
    G.activeStaff().forEach(function (x) {
      if (x.integrity <= 2 && x.morale < 25 && K.chance(0.008 * K.diff().threat)) {
        K.sched.revenge({ staff: x.id }, log);
      }
      if ((x.role === 'it' || x.role === 'ops') && x.integrity <= 2 && s.date >= '2005-01-01' && x.morale < 50) {
        let p = (s.date >= '2009-06-01' ? 0.004 : 0.0015) * (x.integrity === 1 ? 2 : 1) * K.diff().threat;
        if (G.securityLevel() >= 6) p *= 0.5;
        if (s.flags.dataAudit) p *= 0.3;
        p *= G.workstationExposure().factor;
        if (K.chance(p)) dataTheft(x, log);
      }
      if (x.role === 'rm' && x.integrity === 1 && !x.embezzled && K.chance(0.002)) embezzle(x, log);
    });
  };

  // Kundendaten auf dem Arbeitsplatz (Exporte, gespeicherte Auszüge) erleichtern das Kopieren; der Papierkorb zählt halb
  G.workstationExposure = function () {
    const FS = PBS.FS;
    if (!FS || !FS.root || !FS.root()) return { live: [], bin: [], factor: 1 };
    const x = FS.clientFiles();
    x.factor = 1 + Math.min(2, x.live.length * 0.4 + x.bin.length * 0.2);
    return x;
  };
  function dataTheft(x, log) {
    const s = S();
    x.status = 'left';
    x.left = s.date;
    const counts = {};
    G.activeClients().forEach(function (c) { const a = K.homeAuth(c); if (a && c.declared < 1) counts[a] = (counts[a] || 0) + G.clientAUM(c.id); });
    const auth = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0] || 'DE';
    const exp = G.workstationExposure();
    s.flags.dataTheft = { d: s.date, auth: auth, by: x.name };
    K.heat(auth, 20, 'Stolen client data sold abroad');
    K.investigate(auth, 25, 'Stolen client data');
    K.discretion(-20);
    G.activeClients().forEach(function (c) {
      if (K.homeAuth(c) !== auth || c.declared >= 1) return;
      K.loyal(c, -25);
      if (K.chance(0.4)) { c.declared = 1; c.regularised = s.date; K.note(c, 'Client filed voluntary disclosure after data theft.'); }
    });
    K.msg({
      type: 'memo', kind: 'info', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'DATA THEFT: client data offered to ' + G.authShort(auth),
      body: 'We have learned that ' + x.name + ' (' + x.title + ') copied client data onto CD-ROMs over several months and has since disappeared. According to press reports, a data carrier with names of our clients has been offered to the ' + G.authName(auth) + '.\n\n' +
        (exp.live.length + exp.bin.length ? 'IT-Services found that the copies include files from the management workstation ZH-BS64-0217 (' + exp.live.concat(exp.bin).slice(0, 3).map(function (f) { return f.split('\\').pop(); }).join(', ') + '). Please note that exports of client data must not be stored on workstations.\n\n' : '') +
        'We must assume that all ' + K.cname(D.AUTH[auth].c) + ' relationships are compromised. Criminal complaint filed with the Zurich public prosecutor (Art. 47 BankG, Art. 273 StGB).'
    });
    log.push(['EVT', tr('DATENDIEBSTAHL ', 'DATA THEFT ') + auth, 'ALARM']);
  }
  function embezzle(x, log) {
    const s = S();
    const victims = G.activeClients().filter(function (c) { return c.rm === x.id && (G.age(c) > 75 || c.dormant); });
    if (!victims.length) return;
    const c = K.pick(victims);
    const acc = G.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR' && a.bal > 0; })[0];
    if (!acc) return;
    const amt = Math.min(G.available(acc) * 0.4, K.roundTo(K.between(100000, 900000) / K.rate(acc.ccy), 1000));
    if (amt <= 0) return;
    K.book(acc, -amt, 'Payment order (signature on file)', { kind: 'wire-out', ext: true, cp: 'OFFSHORE' });
    x.embezzled = { d: s.date, client: c.id, acc: acc.id, amount: amt, ccy: acc.ccy, chf: amt * K.rate(acc.ccy) };
  }
  // Wird bei der Revision oder durch Kundenbeschwerde entdeckt
  K.discoverEmbezzlement = function (log, by) {
    const s = S();
    s.staff.forEach(function (x) {
      if (!x.embezzled || x.embezzled.found) return;
      x.embezzled.found = s.date;
      const e = x.embezzled;
      const c = G.client(e.client);
      K.expense('losses', e.chf);
      const acc = G.account(e.acc);
      if (acc && !acc.closed) K.book(acc, e.amount, 'Correction: reimbursement by the bank', { kind: 'misc' });
      K.heat('EBK', 8, 'Embezzlement by an employee');
      if (x.status === 'active') { x.status = 'fired'; x.left = s.date; K.reassign(x); }
      if (c) K.loyal(c, -15);
      K.msg({
        type: 'memo', kind: 'info', from: 'Beatrice Lüthi, Finance & Controlling', subject: 'Embezzlement discovered: ' + x.name,
        body: (by || 'Our controls') + ' revealed that ' + x.name + ' transferred ' + e.ccy + ' ' + U.fmt(e.amount, 0) + ' from an account of ' + (c ? c.rubrik : 'a client') + ' to an offshore account in the employee\'s own favour.\n\nThe bank has reimbursed the client (CHF ' + U.fmt(e.chf, 0) + '). The employee has been dismissed and a criminal complaint filed. The regulator has been informed.'
      });
      if (log) log.push(['EVT', tr('VERUNTREUUNG ', 'EMBEZZLEMENT ') + x.name.toUpperCase(), 'ALARM']);
    });
  };

  // Rache eines Ehemaligen: Hinweise an eine ausländische Behörde
  K.sched.revenge = function (d, log) {
    const s = S();
    const x = G.staff(d.staff);
    if (!x || x.leaked) return;
    x.leaked = true;
    const clients = G.activeClients().filter(function (c) { return (x.role !== 'rm' || c.rm === x.id) && K.homeAuth(c) && c.declared < 1; });
    if (!clients.length) return;
    const c = K.pick(clients);
    const auth = K.homeAuth(c);
    K.heat(auth, 12, 'Whistleblower information');
    K.investigate(auth, 15, 'Former employee as informant');
    K.heat('EBK', 4, 'Whistleblower information');
    if (x.status === 'active') { x.status = 'left'; x.left = s.date; if (x.role === 'rm') K.reassign(x); }
    K.msg({
      type: 'memo', kind: 'info', from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'Former employee cooperating with ' + G.authShort(auth),
      body: 'Our lawyers have learned that ' + x.name + ' has handed internal documents to the ' + G.authName(auth) + ', reportedly including the file of ' + c.rubrik + ' and internal instructions on "cross-border services".\n\nWe have filed a criminal complaint for breach of banking secrecy. The documents are already with the authority.'
    });
    log.push(['EVT', 'WHISTLEBLOWER ' + auth, 'ALARM']);
  };

  // Ein RM bringt Kunden vom früheren Arbeitgeber mit
  K.sched.follower = function (d, log) {
    const r = G.staff(d.rm);
    if (!r || r.status !== 'active') return;
    const pr = K.genProspect(D.PROSPECTS.some(function (p) { return p.c === d.c; }) ? d.c : null);
    pr.intro = 'follows ' + r.name;
    K.prospectMessage(pr);
    log.push(['EVT', tr('KUNDE FOLGT ', 'CLIENT FOLLOWS ') + r.name.toUpperCase(), pr.c]);
  };

  G.handlers.resign = function (m, key) {
    const s = S();
    const x = G.staff(m.data.staff);
    if (!x || x.status !== 'active') return { text: 'The employee has already left.' };
    x.noticePending = false;
    if (key === 'counter') {
      if (m.data.poach && x.morale < 40 && K.chance(0.5)) {
        leaves(x);
        return { text: x.name + ' thanks you, but is leaving anyway.' };
      }
      x.salary = Math.round(x.salary * 1.2 / 1000) * 1000;
      K.morale(x, 30);
      return { text: x.name + ' stays. New salary CHF ' + U.fmt(x.salary, 0) + '.' };
    }
    leaves(x);
    return { text: x.name + ' leaves the bank at the end of the month.' };
    function leaves(st) {
      st.status = 'left';
      st.left = s.date;
      if (st.role === 'rm') {
        G.activeClients().forEach(function (c) {
          if (c.rm === st.id && K.chance(0.35)) K.schedule(K.rint(5, 30), 'leave', { client: c.id, reason: 'followed ' + st.name + ' to a competitor' });
        });
        K.reassign(st);
      }
      if (st.integrity <= 2 && K.chance(0.3)) K.schedule(K.rint(20, 60), 'revenge', { staff: st.id });
    }
  };
})(window.PBS);
