/* PBS/Web 4.2 – Terminkalender: Kundengespräche, Telefonate, Anlageausschuss, Partnersitzung, Reisen */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }
  const PENALTY = { review: -6, concern: -10, call: -2, trip: -4, visit: -6 };

  function slot(from, to) { return Math.round(K.rint(from, to) / 15) * 15; }
  function firstBizOfMonth(d) {
    const first = d.slice(0, 8) + '01';
    return U.isWeekend(first) ? U.addBusinessDays(first, 1) : first;
  }

  // Tagesplanung zu Beginn jedes Bankwerktags
  K.planDay = function () {
    const s = S();
    const d = s.date;
    if (d === firstBizOfMonth(d)) K.agenda({ t: 9 * 60, dur: 60, kind: 'ic', title: 'Investment committee (monthly)', place: 'Board room, 4th floor' });
    if (d === firstBizOfMonth(d) && ['01', '04', '07', '10'].indexOf(d.slice(5, 7)) >= 0) K.agenda({ t: 17 * 60, dur: 60, kind: 'partners', title: 'Partners\' meeting (quarterly)', place: 'Board room, 4th floor' });
    let n = 0;
    G.activeClients().forEach(function (c) {
      if (!c.funded || !c.nextReview || c.nextReview > d || n >= 2) return;
      n++;
      c.nextReview = U.addBusinessDays(d, K.rint(220, 280));
      K.agenda({ t: slot(9 * 60 + 30, 16 * 60 + 30), dur: 60, kind: 'review', client: c.id, title: 'Annual review ' + c.rubrik + ' (' + c.name + ')' });
    });
    const calls = K.chance(0.6) ? (K.chance(0.35) ? 2 : 1) : 0;
    for (let i = 0; i < calls; i++) K.genCall();
    if (K.chance(0.015)) genTrip();
  };

  K.genCall = function (forceType, clientId) {
    const s = S();
    const list = G.activeClients().filter(function (c) { return c.funded; });
    if (!list.length) return;
    const c = clientId ? G.client(clientId) : K.pick(list);
    const types = ['favour', 'nervous', 'request'];
    const type = forceType || K.weighted(types, function (t) {
      if (t === 'nervous') return c.traits.indexOf('nervous') >= 0 ? 2.5 : 1;
      return t === 'request' ? 1.6 : 0.6;
    });
    const data = { type: type };
    if (type === 'favour') data.favour = K.pick(D.FAVOURS).key;
    if (type === 'request') data.req = K.pick(requestTypes(c));
    if (!data.req && type === 'request') data.type = 'favour', data.favour = K.pick(D.FAVOURS).key;
    K.agenda({ t: slot(8 * 60 + 30, 17 * 60 + 30), dur: type === 'favour' ? 10 : 15, kind: 'call', client: c.id, title: 'Telephone call – ' + c.rubrik, place: 'Line 2', data: data });
  };
  function requestTypes(c) {
    const s = S();
    const out = ['cash'];
    if (s.pricing.courierOn && ['IT', 'FR', 'DE'].indexOf(c.dom) >= 0) out.push('courier', 'courier');
    if (G.lombardLimit(c.id) > 200000 && !s.loans.some(function (l) { return l.client === c.id && l.status === 'active'; })) out.push('loan');
    if (!s.cards.some(function (x) { return x.client === c.id && x.status === 'active'; })) out.push('card');
    if (!s.boxes.some(function (b) { return b.client === c.id && b.status === 'active'; })) out.push('box');
    return out;
  }
  function genTrip() {
    const list = G.activeClients().filter(function (c) { return c.funded && c.dom !== 'CH' && G.clientAUM(c.id) > 5e6; });
    if (!list.length) return;
    const c = K.pick(list);
    const occasion = K.pick(['70th birthday celebration', 'opening of a new factory', 'daughter\'s wedding', 'yacht christening', 'annual family dinner']);
    const day = U.addBusinessDays(S().date, K.rint(3, 8));
    K.agenda({ d: day, t: 8 * 60 + 30, dur: 0, kind: 'trip', client: c.id, title: 'Trip to ' + c.city + ' – ' + c.rubrik + ': ' + occasion, place: c.city + ', ' + K.cname(c.dom), data: { country: c.dom } });
    K.msg({ type: 'letter', from: c.rubrik + ' (private letter, hand-delivered)', subject: 'Invitation – ' + occasion, body: 'Dear friend,\n\nIt would be a great honour if you could join us in ' + c.city + ' on ' + U.longDate(day) + ' for my ' + occasion + '. It would mean a lot to me to have my banker there in person.\n\nWith warm regards,\n' + c.rubrik + '\n\n(The appointment has been entered in your diary.)' });
  }

  // Gesprächsinhalt und Optionen
  G.meetingContent = function (id) {
    const s = S();
    const a = s.agenda.find(function (x) { return x.id === id; });
    if (!a) return null;
    const c = a.client ? G.client(a.client) : null;
    const opts = [];
    let intro = '';
    if (a.kind === 'review' || a.kind === 'visit') {
      const deps = G.clientAccounts(c.id).filter(function (x) { return x.type === 'DEP'; });
      const perf = deps.length ? G.perf(deps[0]) : null;
      intro = c.name + ' (' + G.age(c) + ') arrives punctually. ' + D.TRAITS[c.traits[0]] + '. Assets with us: CHF ' + U.fmtMio(G.clientAUM(c.id)) + '.' +
        (perf ? ' Portfolio performance this year: ' + U.fmt(perf.own * 100, 1) + '% (benchmark ' + U.fmt(perf.bench * 100, 1) + '%).' : '') +
        ' Mood: ' + G.loyaltyLabel(c.loyalty).label.toLowerCase() + '.';
      opts.push(['perf', 'Discuss performance and strategy', 'Builds trust; the client may bring additional assets.']);
      const x = crossSell(c);
      if (x) opts.push(['sell:' + x[0], x[1], x[2]]);
      if (c.declared < 1 && s.date >= '2009-03-13') opts.push(['disclose', 'Recommend a voluntary disclosure', 'Chance of acceptance ' + Math.round(G.disclosureChance(c) * 100) + '%. Ends the risk – or the relationship.']);
      opts.push(['lunch', 'Lunch at the Kronenhalle (CHF 800)', 'Pure relationship care.']);
      opts.push(['fee', 'Announce a fee increase (+0.10% p.a.)', 'More revenue, less goodwill.']);
    } else if (a.kind === 'concern') {
      intro = c.name + ' asked for this meeting at short notice. Concern: ' + a.data.text;
      opts.push(['reassure', 'Reassure the client', 'Works with calm clients; nervous ones may still leave.']);
      const x = crossSell(c, true);
      if (x) opts.push(['sell:' + x[0], x[1], x[2]]);
      opts.push(['rebate', 'Grant a 30% fee rebate for one year', 'Expensive, but very effective.']);
      if (c.declared < 1 && s.date >= '2009-03-13') opts.push(['disclose', 'Recommend a voluntary disclosure', 'Chance of acceptance ' + Math.round(G.disclosureChance(c) * 100) + '%.']);
    } else if (a.kind === 'call') {
      const t = a.data.type;
      if (t === 'favour') {
        const f = D.FAVOURS.find(function (x) { return x.key === a.data.favour; });
        intro = c.name + ' (' + c.rubrik + ') ' + f.text;
        opts.push(['do', 'Take care of it personally', f.personal ? 'Small personal risk.' : 'Takes ' + f.min + ' minutes.']);
        opts.push(['decline', 'Politely decline', 'The client will remember.']);
      } else if (t === 'nervous') {
        const auth = K.homeAuth(c);
        intro = c.name + ' (' + c.rubrik + ') sounds worried: "' + (auth && s.inv[auth] ? 'I hear the ' + G.authShort(auth) + ' is investigating Swiss banks – and yours by name!' : s.date >= '2008-02-15' ? 'Every day there is something new in the papers about stolen bank data.' : 'A friend says the tax office is asking questions about Swiss accounts.') + ' Is my money safe with you?"';
        opts.push(['reassure', 'Reassure: "Banking secrecy is protected by law"', 'Calms most clients.']);
        if (Object.keys(s.branches).some(function (k) { return D.LOCATIONS[k].kind === 'sub'; }) && !c.booking) opts.push(['book', 'Offer to book the assets with our subsidiary abroad', 'Fee 0.25%; reduces the trail.']);
        if (!G.entitiesOf(c.id).length && c.declared < 1) opts.push(['struct', 'Suggest a Liechtenstein foundation', 'Set-up CHF 24,000.']);
        if (c.declared < 1 && s.date >= '2009-03-13') opts.push(['disclose', 'Recommend a voluntary disclosure', 'Chance ' + Math.round(G.disclosureChance(c) * 100) + '%.']);
      } else if (t === 'request') {
        const r = a.data.req;
        const amt = callAmount(c, r);
        a.data.amount = amt.amount;
        a.data.ccy = amt.ccy;
        intro = c.name + ' (' + c.rubrik + ') ' + {
          cash: 'would like to collect ' + amt.ccy + ' ' + U.fmt(amt.amount, 0) + ' in cash at the counter tomorrow.',
          courier: 'asks whether the bank could collect ' + amt.ccy + ' ' + U.fmt(amt.amount, 0) + ' in cash in ' + c.city + ' ("as usual, discreetly").',
          loan: 'would like a credit line of ' + amt.ccy + ' ' + U.fmt(amt.amount, 0) + ' against the portfolio, for a property deal.',
          card: 'asks for a credit card "that does not show any Swiss bank".',
          box: 'would like to rent a safe-deposit box – "for documents and a few other things".'
        }[r];
        opts.push(['yes', 'Agree', { cash: 'A withdrawal at the counter tomorrow.', courier: 'Creates a courier request (fee ' + U.fmt(s.pricing.courier * 100, 1) + '%).', loan: 'Lombard loan, interest Libor + 1.75%.', card: 'Card via Nassau, fee CHF ' + s.pricing.card + ' p.a.', box: 'Annual rent from CHF 300.' }[r]]);
        opts.push(['decline', 'Decline', 'The client will be disappointed.']);
      }
    } else if (a.kind === 'trip') {
      const risk = G.travelRisk(a.data.country);
      intro = 'Today you are expected in ' + a.place + ' (' + a.title.split(': ').pop() + '). The trip takes the whole day; nothing else can be done at the office.' + (risk > 0.02 ? ' Legal & Compliance strongly advises against travelling: an investigation is under way in ' + K.cname(a.data.country) + '.' : '');
      opts.push(['go', 'Travel', 'Strengthens the relationship considerably.' + (risk > 0.02 ? ' Risk of arrest!' : '')]);
      opts.push(['decline', 'Send apologies', 'The client will be offended.']);
    } else if (a.kind === 'ic') {
      intro = 'The investment committee meets: Dr. Martin Frei presents the market outlook. SMI ' + U.fmt(s.market.SMI, 0) + ', CHF Libor ' + U.fmt(s.market.LIBOR, 2) + '%, gold USD ' + U.fmt(s.market.XAU, 0) + '. The committee can change the house view (allocations, trading intensity, fund policy) without extra time.';
      opts.push(['open', 'Chair the meeting (opens the house view)', 'Changes are free of extra time today.']);
    } else if (a.kind === 'partners') {
      const st = G.targetStatus();
      intro = D.PARTNERS.senior + ' and ' + D.PARTNERS.second + ' expect a report on the year so far.' + (st ? ' Assets CHF ' + U.fmtMio(st.aum.now) + ' (target ' + U.fmtMio(st.t.aum) + '), net profit CHF ' + U.fmtMio(st.profit.now, 2) + ' (target ' + U.fmtMio(st.t.profit, 2) + '), regulator index ' + U.fmt(st.reg.now, 0) + ' (max ' + st.t.reg + ').' : '');
      opts.push(['report', 'Present the figures', 'Partner confidence depends on how close you are to the targets.']);
    }
    return { a: a, c: c, intro: intro, options: opts };
  };

  function callAmount(c, r) {
    const ccy = K.localCcy(c.dom) === 'CHF' ? 'CHF' : (D.COUNTRIES[c.dom].ccy === 'EUR' ? K.localCcy(c.dom) : 'USD');
    const step = ccy === 'ITL' ? 10000000 : 5000;
    if (r === 'cash') return { ccy: ccy, amount: K.roundTo(K.between(20000, 120000) / K.rate(ccy), step) };
    if (r === 'courier') return { ccy: ccy, amount: K.roundTo(K.between(80000, 600000) / K.rate(ccy), step) };
    if (r === 'loan') return { ccy: 'CHF', amount: K.roundTo(Math.min(G.lombardLimit(c.id), c.wealth * 0.05), 50000) };
    return { ccy: 'CHF', amount: 0 };
  }

  function crossSell(c, concern) {
    const s = S();
    const has = function (list) { return list.some(function (x) { return x.client === c.id && x.status === 'active'; }); };
    const sub = Object.keys(s.branches).find(function (k) { return D.LOCATIONS[k].kind === 'sub'; });
    const options = [];
    if (!G.entitiesOf(c.id).length && c.declared < 1 && G.clientAUM(c.id) > 2e6) options.push(['LI_S', 'Propose a Liechtenstein foundation', 'Set-up CHF 24,000, strong shielding.']);
    if (D.COUNTRIES[c.dom] && D.COUNTRIES[c.dom].eu && s.date >= '2004-01-01' && !G.entitiesOf(c.id).some(function (e) { return e.jur === 'LI_INS'; })) options.push(['LI_INS', 'Propose a life insurance wrapper', 'Outside the EU savings tax; set-up CHF 15,000.']);
    if (!has(s.boxes) && G.boxesUsed() < G.vaultCapacity()) options.push(['box', 'Offer a safe-deposit box', 'Rent from CHF 300 p.a.; cash stays in Switzerland.']);
    if (!has(s.cards) && !concern) options.push(['card', 'Offer an offshore gold card', 'No reference to Switzerland on the card.']);
    if (!concern && G.lombardLimit(c.id) > 500000 && !has(s.loans)) options.push(['loan', 'Offer a Lombard credit line', 'Interest income; the client keeps the portfolio.']);
    if (sub && !c.booking) options.push(['book:' + sub, 'Suggest booking with ' + D.LOCATIONS[sub].name.split(' – ')[0], 'Fee 0.25%; reduces the trail.']);
    return options.length ? options[0] : null;
  }

  // Termin wahrnehmen
  G.attend = function (id, key) {
    const s = S();
    const a = s.agenda.find(function (x) { return x.id === id; });
    if (!a || a.status !== 'open') return K.err('Appointment no longer open.');
    const c = a.client ? G.client(a.client) : null;
    if (c && c.status !== 'active') { a.status = 'cancelled'; return K.err('The relationship has been closed.'); }
    let dur = a.dur;
    if (a.kind === 'trip' && key === 'go') dur = Math.max(60, K.CLOSE - s.clock);
    if (key === 'decline') dur = 2;
    const t = K.use(dur);
    if (t) return t;
    a.status = key === 'decline' ? 'declined' : 'done';
    a.result = key;
    const text = resolve(a, c, key);
    G.checkGameOver();
    G.save();
    return { ok: true, text: text, open: a.kind === 'ic' ? 'ic' : null };
  };

  function resolve(a, c, key) {
    const s = S();
    if (key.indexOf('sell:') === 0) return sell(c, key.slice(5));
    switch (a.kind + ':' + key) {
      case 'review:perf': case 'visit:perf': {
        const dep = G.clientAccounts(c.id).find(function (x) { return x.type === 'DEP'; });
        const rel = dep ? G.perf(dep).rel : 0;
        if (rel < -0.03 && c.traits.indexOf('greedy') >= 0) { K.loyal(c, -2); return 'The client is visibly unhappy with the performance: "My cousin\'s bank in Geneva did much better."'; }
        K.loyal(c, rel > 0 ? 7 : 4);
        if (K.chance(0.25 + c.loyalty / 400)) {
          const amt = K.roundTo(c.wealth * K.between(0.02, 0.06) / K.rate(K.localCcy(c.dom) === 'CHF' ? 'CHF' : 'USD'), 10000);
          K.schedule(K.rint(2, 6), 'funding', { client: c.id, amount: amt, ccy: K.localCcy(c.dom) === 'CHF' ? 'CHF' : 'USD', method: K.pick(['ch', 'offshore', 'home']) });
          return 'A good meeting. The client announces an additional transfer of about USD/CHF ' + U.fmt(amt, 0) + ' in the coming days.';
        }
        return 'A good meeting. The client leaves satisfied.';
      }
      case 'review:lunch': case 'visit:lunch':
        K.expense('travel', 800);
        K.loyal(c, 7);
        return 'Veal Zurich style and a 1990 Pomerol. The client talks about family and grandchildren – and about friends who might also need a Swiss bank.';
      case 'review:fee': case 'visit:fee':
        c.fee = K.round(c.fee + 0.001, 4);
        K.loyal(c, c.traits.indexOf('greedy') >= 0 ? -12 : -8);
        return 'The client accepts the new fee of ' + U.fmt(G.effectiveFee(c) * 100, 2) + '% – without enthusiasm.';
      case 'review:disclose': case 'visit:disclose': case 'concern:disclose': case 'call:disclose':
        return G.recommendDisclosure(c.id, true).text;
      case 'concern:reassure': case 'call:reassure': {
        const auth = K.homeAuth(c);
        const nervous = c.traits.indexOf('nervous') >= 0;
        if (nervous && auth && s.heat[auth] >= 60 && K.chance(0.4)) {
          K.schedule(K.rint(3, 12), 'leave', { client: c.id, reason: 'fear of the authorities' });
          return 'The client listens, thanks you – and has clearly not been convinced.';
        }
        K.loyal(c, a.kind === 'concern' ? 8 : 4);
        return 'The client calms down. "I knew I could rely on Vogt & Cie."';
      }
      case 'concern:rebate':
        c.rebateUntil = U.addBusinessDays(s.date, 250);
        K.loyal(c, 15);
        return 'Fee rebate of 30% granted until ' + U.fmtDate(c.rebateUntil) + '. The client is touched.';
      case 'call:book': {
        const sub = Object.keys(s.branches).find(function (k) { return D.LOCATIONS[k].kind === 'sub'; });
        return bookOff(c, sub);
      }
      case 'call:struct':
        return sell(c, 'LI_S');
      case 'call:do': {
        const f = D.FAVOURS.find(function (x) { return x.key === a.data.favour; });
        K.loyal(c, f.loyalty);
        if (f.personal) K.personal(f.personal, 'Personal favours for clients');
        if (f.key === 'gift') K.charge(c, 14500, 'Purchase Rolex Day-Date (gift)');
        if (f.hire) {
          if (c.nephew || G.activeStaff().length >= G.seats()) { K.loyal(c, 2); return 'There is no free desk at the moment – the nephew will be considered for the next opening. The client understands.'; }
          c.nephew = true;
          s.staff.push({ id: 'S' + U.pad(++s.ctr.staff, 2), name: c.name.split(' ').slice(-1)[0] + ' Jr. (nephew of ' + c.rubrik + ')', role: 'ops', title: 'Trainee, back office', skill: 1, integrity: K.rint(1, 4), morale: 75, salary: 58000, hired: s.date, status: 'active', known: {} });
          return 'The nephew starts on Monday in the back office (CHF 58,000 p.a.). The client is very grateful.';
        }
        return 'Done. The client is grateful.';
      }
      case 'call:decline':
        K.loyal(c, -3);
        return 'The client accepts your refusal coolly.';
      case 'call:yes':
        return request(a, c);
      case 'trip:go': {
        const risk = G.travelRisk(a.data.country);
        if (K.chance(risk)) {
          const auth = D.COUNTRIES[a.data.country].auth;
          G.endGame('arrested', { place: { US: 'Miami International Airport', DE: 'Frankfurt Airport', IT: 'Milano Malpensa', FR: 'Paris Charles de Gaulle', GB: 'London Heathrow' }[a.data.country] || 'the airport', auth: auth });
          return 'Two officers are waiting at passport control.';
        }
        K.loyal(c, 15);
        K.personal(0.5, 'Visits to clients abroad');
        K.expense('travel', 4500);
        if (K.chance(0.5)) {
          const pr = K.genProspect(D.PROSPECTS.some(function (p) { return p.c === c.dom; }) ? c.dom : null);
          pr.intro = 'existing client ' + c.rubrik;
          K.prospectMessage(pr);
          return 'An unforgettable evening. ' + c.rubrik + ' introduced you to a friend who wants to open an account (see mail).';
        }
        return 'An unforgettable evening. The relationship has never been better.';
      }
      case 'trip:decline':
      case 'review:decline':
      case 'concern:decline':
        K.loyal(c, PENALTY[a.kind] || -3);
        return 'Apologies sent.';
      case 'ic:open':
        s.house.icDate = s.date;
        G.activeStaff('pm').forEach(function (x) { K.morale(x, 3); });
        return 'The committee is in session.';
      case 'partners:report': {
        const st = G.targetStatus();
        const frac = (U.toDate(s.date) - U.toDate(s.date.slice(0, 4) + '-01-01')) / (365 * 864e5);
        let ok = 0;
        const last = s.career.history[s.career.history.length - 1];
        if (s.date.slice(5, 7) === '01' && last) ok = last.hits;
        else if (st) {
          const base = st.t.aum0 || st.aum.now;
          if (st.aum.now >= (base + (st.t.aum - base) * frac) * 0.97) ok++;
          if (st.profit.now >= st.t.profit * frac * 0.9) ok++;
          if (st.reg.ok) ok++;
        }
        s.career.confidence = U.clamp(s.career.confidence + (ok >= 2 ? 6 : -6), 0, 100);
        return ok >= 2 ? 'The partners are satisfied with the course of business.' : 'The partners listen in silence. "We expected more." Partner confidence falls.';
      }
    }
    return 'Done.';
  }

  function sell(c, what) {
    const s = S();
    const p = 0.55 + c.loyalty / 400 + (c.traits.indexOf('secretive') >= 0 ? 0.15 : 0) - (c.traits.indexOf('nervous') >= 0 && what === 'card' ? 0.2 : 0);
    if (!K.chance(p)) { K.loyal(c, -1); return 'The client is not interested.'; }
    let r;
    K.free = true;
    try {
      if (what === 'box') r = G.rentBox(c.id, K.pick(['S', 'M', 'M', 'L']));
      else if (what === 'card') r = G.issueCard(c.id);
      else if (what === 'loan') r = G.grantLombard(c.id, K.roundTo(G.lombardLimit(c.id) * 0.4, 50000), 'CHF');
      else if (what.indexOf('book:') === 0) return bookOff(c, what.slice(5));
      else {
        const acc = G.clientAccounts(c.id).filter(function (x) { return x.type === 'CUR' && !x.entity; }).sort(function (a, b) { return K.valueCHF(b) - K.valueCHF(a); })[0];
        r = G.createEntity(c.id, what, G.suggestEntityName(what), true, acc ? acc.ccy : 'CHF');
        if (r.ok && acc && G.available(acc) > 0) {
          const amt = G.available(acc) * 0.8;
          K.book(acc, -amt, 'Transfer to ' + r.acc.id + ' (' + r.entity.name + ')', { kind: 'int-out', cp: r.acc.id });
          K.book(r.acc, amt, 'Transfer from ' + acc.id, { kind: 'int-in', cp: acc.id });
        }
      }
    } finally {
      K.free = false;
    }
    if (!r || !r.ok) return 'The client agrees in principle, but: ' + (r ? r.msg : 'not possible.');
    K.loyal(c, 3);
    return {
      box: 'The client rents safe-deposit box ' + (r.box && r.box.id) + '.',
      card: 'A gold card via Nassau will be sent – to the bank, banklagernd.',
      loan: 'Lombard loan ' + (r.loan && r.loan.id) + ' granted.'
    }[what] || ('Done: ' + (r.entity ? r.entity.name : '') + ' has been set up and assets transferred.');
  }
  function bookOff(c, sub) {
    let r;
    K.free = true;
    try { r = G.bookOffshore(c.id, sub); } finally { K.free = false; }
    return r.ok ? 'The assets will be booked with ' + D.LOCATIONS[sub].name + '.' : r.msg;
  }
  function request(a, c) {
    const s = S();
    const r = a.data.req;
    if (r === 'cash') {
      K.schedule(1, 'visit', { client: c.id, type: 'out', ccy: a.data.ccy, amount: a.data.amount, note: 'Announced by telephone' });
      return 'The cash will be prepared for tomorrow.';
    }
    if (r === 'courier') {
      s.couriers.unshift({ id: 'K' + U.pad(++s.ctr.courier, 3), client: c.id, ccy: a.data.ccy, amount: a.data.amount, from: c.city, status: 'requested', d: s.date });
      return 'Courier request recorded (Payments › Courier service).';
    }
    return sell(c, r);
  }

  G.delegateAgenda = function (id) {
    const s = S();
    const a = s.agenda.find(function (x) { return x.id === id; });
    if (!a || a.status !== 'open') return K.err('Appointment no longer open.');
    if (a.kind === 'partners' || a.kind === 'trip') return K.err('This appointment cannot be delegated.');
    const t = K.use(2);
    if (t) return t;
    a.status = 'delegated';
    const c = a.client ? G.client(a.client) : null;
    if (c) {
      const r = G.staff(c.rm);
      const ok = r && r.status === 'active' && G.rmLoad(r) <= G.rmCapacity(r);
      K.loyal(c, ok ? (r.skill - 2) * 1.5 : -3);
      G.save();
      return { ok: true, text: ok ? r.name + ' takes care of it.' : 'Nobody had time; the client felt neglected.' };
    }
    G.save();
    return { ok: true, text: 'Dr. Martin Frei chairs the committee. The house view stays unchanged.' };
  };
  G.skipAgenda = function (id) {
    const a = S().agenda.find(function (x) { return x.id === id; });
    if (!a || a.status !== 'open') return K.err('Appointment no longer open.');
    missed(a);
    G.save();
    return { ok: true };
  };
  function missed(a) {
    a.status = 'missed';
    const c = a.client ? G.client(a.client) : null;
    if (c && c.status === 'active') { K.loyal(c, PENALTY[a.kind] || -3); K.note(c, 'Appointment missed: ' + a.title + '.'); }
    if (a.kind === 'partners') S().career.confidence = U.clamp(S().career.confidence - 10, 0, 100);
  }
  // Am Abend: Verpasste Termine
  K.agendaEndOfDay = function () {
    const s = S();
    let n = 0;
    s.agenda.forEach(function (a) { if (a.d === s.date && a.status === 'open') { missed(a); n++; } });
    return n;
  };
  // Mit der Arbeit warten bis zum nächsten Termin
  G.wait = function (min) {
    const s = S();
    const next = G.nextAppointment();
    const to = min ? s.clock + min : (next ? next.t : s.clock + 30);
    const t = K.use(Math.max(5, Math.min(to, K.LOCK) - s.clock));
    if (t) return t;
    G.save();
    return { ok: true };
  };
})(window.PBS);
