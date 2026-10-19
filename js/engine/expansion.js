/* PBS/Web 4.2 – Organisation: Standorte, Buchungszentren, Korrespondenzbanken, Übernahmen, Preise */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }

  /* ---------- Standorte ---------- */
  G.locationAvailable = function (key) {
    const L = D.LOCATIONS[key];
    return S().date >= L.from;
  };
  G.openLocation = function (key) {
    const s = S();
    const L = D.LOCATIONS[key];
    if (!L || s.branches[key]) return K.err('Location already open.');
    if (!G.locationAvailable(key)) return K.err('Not yet possible in ' + s.date.slice(0, 4) + '.');
    if (G.capitalInfo().avail - L.setup < D.MIN_CAPITAL + 3e6) return K.err('Insufficient equity capital for this investment.');
    const t = K.use(60);
    if (t) return t;
    if (L.kind !== 'sub') K.expense('premises', L.setup);
    s.branches[key] = { opened: s.date };
    if (L.kind === 'sub') K.heat('EBK', 1, 'Foreign subsidiaries');
    G.save();
    return { ok: true };
  };
  G.closeLocation = function (key) {
    const s = S();
    const L = D.LOCATIONS[key];
    if (!s.branches[key] || L.kind === 'HQ') return K.err('Location cannot be closed.');
    const t = K.use(30);
    if (t) return t;
    K.expense('premises', L.daily * 125);
    delete s.branches[key];
    G.activeClients().forEach(function (c) { if (c.booking === key) { c.booking = null; K.loyal(c, -5); } });
    G.save();
    return { ok: true };
  };
  K.locationsDaily = function () {
    const s = S();
    let cost = 0;
    Object.keys(s.branches).forEach(function (k) {
      const L = D.LOCATIONS[k];
      cost += L.daily;
      if (L.heat && D.COUNTRIES[L.c].auth) K.heat(D.COUNTRIES[L.c].auth, L.heat, 'Representative offices abroad');
    });
    K.expense('premises', cost);
    return cost;
  };

  /* ---------- USD-Korrespondenzbank ---------- */
  G.findCorrespondent = function () {
    const s = S();
    if (s.corr.status === 'active') return K.err('The USD correspondent relationship is active.');
    const t = K.use(60);
    if (t) return t;
    K.expense('legal', 150000);
    const p = s.heat.US > 80 ? 0.3 : 0.55;
    if (K.chance(p)) {
      const used = s.corr.history || [];
      const name = D.USD_CORRESPONDENTS.find(function (n) { return used.indexOf(n) < 0 && n !== s.corr.name; }) || 'Liberty Exchange Bank, Newark';
      s.corr.history = used.concat([s.corr.name]);
      s.corr = { name: name, status: 'active', since: s.date, fee: (s.corr.fee || 0) + 30, history: s.corr.history };
      G.save();
      return { ok: true, found: true, text: name + ' accepts the relationship – at higher fees (+CHF 30 per payment).' };
    }
    G.save();
    return { ok: true, found: false, text: 'No US bank was willing to take on a Swiss private bank at this time. Try again later.' };
  };
  K.correspondentDaily = function (log) {
    const s = S();
    if (s.corr.status === 'active' && s.date >= '2008-06-01' && s.heat.US > 65 && K.chance((s.heat.US - 65) / 400)) {
      s.corr.status = 'notice';
      s.corr.until = U.addBusinessDays(s.date, 20);
      K.msg({ type: 'letter', kind: 'info', from: s.corr.name, subject: 'Termination of correspondent banking relationship', body: 'Dear Sirs,\n\nFollowing a review of our risk appetite regarding foreign private banks, we regret to inform you that we will terminate the USD correspondent account relationship with effect from ' + U.fmtDate(s.corr.until) + '.\n\nAfter that date we will no longer process payments in your favour or on your behalf.\n\nYours faithfully,\n' + s.corr.name });
      log.push(['EVT', 'KUENDIGUNG USD-KORRESPONDENT', 'WARNUNG']);
    }
    if (s.corr.status === 'notice' && s.date >= s.corr.until) {
      s.corr.status = 'terminated';
      log.push(['EVT', 'USD-ZAHLUNGSVERKEHR EINGESTELLT', 'ALARM']);
    }
    if (s.corr.status === 'terminated') {
      G.activeClients().forEach(function (c) {
        if (G.clientAccounts(c.id).some(function (a) { return a.ccy === 'USD' && a.bal > 0; })) K.loyal(c, -0.3);
      });
    }
  };

  /* ---------- Übernahmen ---------- */
  K.genTarget = function () {
    const s = S();
    const names = ['Banca Privata Monte Generoso SA, Lugano', 'Bankhaus Escher & Söhne, Zürich', 'Banque Dufresne & Cie, Genève', 'Privatbank am Paradeplatz AG, Zürich', 'Banca della Valle Maggia SA, Locarno'];
    const free = names.filter(function (n) { return !s.targets.some(function (t) { return t.name === n; }) && !(s.acquired || []).some(function (a) { return a === n; }); });
    if (!free.length) return null;
    const aum = K.roundTo(K.between(80e6, 400e6), 1e6);
    const t = {
      id: 'T' + U.pad(++s.ctr.target, 2), name: K.pick(free), aum: aum, n: Math.max(4, Math.round(aum / 18e6)), price: K.roundTo(aum * K.between(0.025, 0.045), 100000),
      hidden: { pep: K.rint(0, 3), us: K.rint(0, 4), weak: K.rint(0, 6) }, dd: false, expires: U.addBusinessDays(s.date, 30)
    };
    s.targets.push(t);
    return t;
  };
  G.dueDiligence = function (id) {
    const s = S();
    const t = s.targets.find(function (x) { return x.id === id; });
    if (!t) return K.err('Offer no longer available.');
    if (t.dd) return K.err('Due diligence already done.');
    const tm = K.use(30);
    if (tm) return tm;
    K.expense('legal', 250000);
    t.dd = true;
    G.save();
    return { ok: true };
  };
  G.acquire = function (id) {
    const s = S();
    const t = s.targets.find(function (x) { return x.id === id; });
    if (!t) return K.err('Offer no longer available.');
    if (G.capitalInfo().avail - t.price < D.MIN_CAPITAL + 5e6) return K.err('Insufficient equity capital: the purchase price of CHF ' + U.fmt(t.price, 0) + ' would breach capital requirements.');
    const tm = K.use(60);
    if (tm) return tm;
    K.expense('other', t.price);
    s.targets = s.targets.filter(function (x) { return x.id !== id; });
    s.acquired = (s.acquired || []).concat([t.name]);
    const per = t.aum / t.n;
    for (let i = 0; i < t.n; i++) {
      const forced = i < t.hidden.pep ? 'PEP' : null;
      const country = i < t.hidden.pep ? K.pick(['KZ', 'NG', 'VE']) : (i < t.hidden.pep + t.hidden.us ? 'US' : null);
      const pr = K.genProspect(country);
      if (forced) pr.risk = 'PEP';
      pr.amount = K.roundTo(per * K.between(0.5, 1.5) / K.rate(pr.ccy), 10000);
      pr.wealth = Math.max(pr.wealth, pr.amount * K.rate(pr.ccy) * 1.3);
      pr.intro = 'the acquisition of ' + t.name;
      pr.method = 'ch';
      pr.sting = false;
      const c = K.acceptProspect(pr);
      s.sched = s.sched.filter(function (x) { return !(x.data && x.data.client === c.id); });
      const acc = G.clientAccounts(c.id)[0];
      K.book(acc, pr.amount, 'Transfer of assets – merger with ' + t.name.split(',')[0], { kind: 'int-in' });
      c.funded = true;
      if (i < t.hidden.weak) { c.formA = null; }
    }
    const r = K.pick(D.CH_NAMES.m) + ' ' + K.pick(D.CH_NAMES.l);
    s.staff.push({ id: 'S' + U.pad(++s.ctr.staff, 2), name: r, role: 'rm', title: 'Relationship manager (ex ' + t.name.split(',')[0] + ')', desk: ['DE', 'IT', 'FR', 'US'], skill: 3, integrity: K.rint(2, 4), morale: 55, salary: 210000, hired: s.date, status: 'active', known: {} });
    K.heat('EBK', 3 + t.hidden.pep * 2, 'Integration of an acquired bank');
    G.save();
    return { ok: true, n: t.n };
  };
  G.handlers.takeover = function (m, key) {
    if (key === 'decline') return { text: 'The partners decline. Vogt & Cie remains independent.' };
    G.endGame('sold', { price: m.data.price, buyer: m.data.buyer });
    return { text: 'The partners accept the offer from ' + m.data.buyer + '.' };
  };
  K.takeoverOffer = function (log) {
    const s = S();
    const aum = G.totalAUM();
    if (s.date < '2004-01-01' || aum < 350e6) return;
    if (s.messages.some(function (m) { return m.kind === 'takeover' && !m.resolved; })) return;
    if (!K.chance(0.0025)) return;
    const taint = (s.heat.EBK + Math.max.apply(null, G.FOREIGN.map(function (k) { return s.heat[k]; }))) / 200;
    const mult = (s.date >= '2009-01-01' ? 0.015 : 0.03) * (1 - taint * 0.6);
    const price = K.roundTo(aum * mult + s.bank.capital, 1e6);
    const buyer = K.pick(['a large Zurich bank', 'a Geneva private banking group', 'a Liechtenstein banking group', 'an Austrian bank', 'a Brazilian banking group']);
    K.msg({
      type: 'letter', kind: 'takeover', from: 'Hottinger Corporate Finance AG (on behalf of ' + buyer + ')', subject: 'Confidential offer to acquire Bankhaus Vogt & Cie',
      body: 'Dear Sirs,\n\nOn behalf of our client, ' + buyer + ', we are instructed to submit a non-binding offer to acquire 100% of Bankhaus Vogt & Cie for CHF ' + U.fmt(price, 0) + ' (approx. ' + U.fmt(price / aum * 100, 1) + '% of assets under management, including equity).\n\nYour partnership share would amount to CHF ' + U.fmt(price * s.career.stake, 0) + '.\n\nThe offer is valid for ten business days.\n\nHottinger Corporate Finance AG',
      actions: [['accept', 'Accept – sell the bank (ends the game)'], ['decline', 'Decline']], data: { price: price, buyer: buyer }, due: U.addBusinessDays(s.date, 10)
    });
    log.push(['EVT', 'UEBERNAHMEANGEBOT', 'CHF ' + U.fmtMio(price)]);
  };

  /* ---------- Preise und Produkte ---------- */
  G.setPricing = function (p) {
    const s = S();
    if (p.level && !D.FEE_LEVELS[p.level]) return K.err('Unknown fee level.');
    const t = K.use(10);
    if (t) return t;
    const old = s.pricing.level;
    Object.keys(p).forEach(function (k) { if (p[k] !== undefined && p[k] !== '') s.pricing[k] = p[k]; });
    if (p.level && p.level !== old) {
      const up = D.FEE_LEVELS[p.level].mult > D.FEE_LEVELS[old].mult;
      G.activeClients().forEach(function (c) { K.loyal(c, up ? -5 : 3); });
      K.msg({ type: 'memo', from: 'Beatrice Lüthi, Finance & Controlling', subject: 'Fee schedule changed: ' + D.FEE_LEVELS[p.level].label, body: 'All clients have been informed in writing of the new fee schedule (' + D.FEE_LEVELS[p.level].label + ', factor ' + D.FEE_LEVELS[p.level].mult + '). The change applies from today.' });
    }
    G.save();
    return { ok: true };
  };
  G.effectiveFee = function (c) { return c.fee * D.FEE_LEVELS[S().pricing.level].mult; };
})(window.PBS);
