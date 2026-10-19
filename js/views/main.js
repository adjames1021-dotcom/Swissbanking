/* PBS/Web 4.2 – Masken: Übersicht, Terminkalender, Ziele & Karriere, Märkte, Reisen, Post, Handbuch, Spielende */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, H = PBS.H, V = PBS.Views;
  const e = U.esc;
  const ico = H.ico;
  const KIND = { review: ['user', 'Annual review'], concern: ['user', 'Client meeting'], visit: ['user', 'Client visit'], call: ['phone', 'Telephone'], ic: ['chart', 'Investment committee'], partners: ['building', 'Partners'], trip: ['plane', 'Trip'] };

  /* ---------- Übersicht ---------- */
  V.overview = function () {
    const s = H.S();
    const aum = G.totalAUM();
    const last = s.hist[s.hist.length - 1];
    const prev = last ? last.aum : aum;
    const rev = G.revenueYTD(), cost = G.costYTD();
    const dl = s.discretion >= 65 ? H.st('ok', 'Strong') : s.discretion >= 45 ? H.st('mod', 'Fair') : H.st('bad', 'Weak');
    const kf = H.grid(['Key figure', { t: 'Value', num: true }, { t: 'Remark', num: true }], [
      ['Assets under management (Verwaltete Vermögen)', 'CHF ' + U.fmt(aum, 0), H.chg((aum - prev) / 1e6, 2, ' Mio. vs. close')],
      ['Net new money (Neugeld) – ' + U.monthName(s.date), 'CHF ' + H.num(s.nnm.month, 0), ''],
      ['Net new money – year to date', 'CHF ' + H.num(s.nnm.ytd, 0), ''],
      ['Revenue – year to date', 'CHF ' + U.fmt(rev, 0), ''],
      ['Net profit – year to date', 'CHF ' + H.num(rev - cost, 0), ''],
      ['Equity capital (Eigenmittel)', 'CHF ' + H.num(s.bank.capital, 0), '<span class="muted">min. CHF 10 Mio.</span>'],
      ['Client relationships / staff', G.activeClients().length + ' / ' + G.activeStaff().length, '<span class="muted">' + s.entities.filter(function (x) { return !x.dissolved; }).length + ' structures</span>'],
      ['Client confidence (discretion index)', U.fmt(s.discretion, 0), dl]
    ], { cls: 'kf' });

    const ts = G.targetStatus();
    const tgt = ts ? '<table class="risk">' +
      '<tr><td class="rk">Assets</td><td class="rb">' + H.bar(Math.min(100, ts.aum.now / ts.t.aum * 100), ts.aum.ok ? 'ok' : 'warn') + '</td><td class="num nowrap">' + U.fmtMio(ts.aum.now, 0) + ' / ' + U.fmtMio(ts.t.aum, 0) + '</td></tr>' +
      '<tr><td class="rk">Net profit</td><td class="rb">' + H.bar(Math.max(0, Math.min(100, ts.profit.now / ts.t.profit * 100)), ts.profit.ok ? 'ok' : 'warn') + '</td><td class="num nowrap">' + U.fmtMio(ts.profit.now, 2) + ' / ' + U.fmtMio(ts.t.profit, 2) + '</td></tr>' +
      '<tr><td class="rk">' + e(G.authShort('EBK')) + ' index</td><td class="rb">' + H.bar(ts.reg.now) + '</td><td class="num nowrap">' + U.fmt(ts.reg.now, 0) + ' / max ' + ts.t.reg + '</td></tr></table>' : '';

    const ext = s.tx.filter(function (t) { return t.ext && t.kind !== 'open'; }).slice(-8).reverse();
    const recent = H.grid(['Date', 'Account', 'Text', { t: 'Amount', num: true }, 'Ccy'], ext.map(function (t) {
      return [U.fmtDate(t.d), '<a href="#/account/' + t.acc + '">' + t.acc + '</a>', e(t.text), H.num(t.amt, H.dec(t.ccy)), H.ccyL(t.ccy)];
    }), { empty: 'No bookings.' });

    const today = G.agendaFor(s.date);
    const diary = today.length ? '<table class="plist">' + today.map(function (a) {
      const k = KIND[a.kind] || ['clock', a.kind];
      const due = a.status === 'open' && a.t <= s.clock;
      return '<tr class="' + (a.status !== 'open' ? 'done' : '') + '"><td class="i nowrap">' + U.fmtTime(a.t) + '</td><td>' + ico(k[0]) + ' ' + e(a.title) + '</td><td class="r nowrap">' +
        (a.status === 'open' ? (due ? H.btn('Attend', 'agenda', ' data-id="' + a.id + '"', 'sm def') : '<span class="muted">open</span>') : H.st(a.status === 'done' || a.status === 'delegated' ? 'ok' : 'warn', a.status)) + '</td></tr>';
    }).join('') + '</table>' : '<div class="muted pad">No appointments today.</div>';

    const pend = [];
    const pp = G.pendingPayments().length, cc = s.counter.length, oa = G.openAlerts().length, od = G.overdueAlerts().length;
    const ar = G.actionRequired().length, ur = G.unread();
    const kr = s.couriers.filter(function (k) { return k.status === 'requested'; }).length;
    if (cc) pend.push([ico('cash'), '<a href="#/pay/cash">' + cc + ' client(s) waiting at the cash desk</a>', H.st('warn', 'Today')]);
    if (pp) pend.push([ico('queue'), '<a href="#/pay/queue">' + pp + ' payment(s) awaiting release</a>', H.st('mod', '4-eyes')]);
    if (kr) pend.push([ico('cash'), '<a href="#/pay/couriers">' + kr + ' courier request(s)</a>', H.st('warn', 'Open')]);
    if (oa) pend.push([ico('warn'), '<a href="#/compliance/alerts">' + oa + ' open compliance alert(s)</a>', od ? H.st('bad', od + ' overdue') : H.st('ok', 'in time')]);
    if (ar) pend.push([ico('mail'), '<a href="#/inbox">' + ar + ' decision(s) required in mail</a>', H.st('warn', 'Open')]);
    if (ur) pend.push([ico('mail'), '<a href="#/inbox">' + ur + ' unread message(s)</a>', '']);
    Object.keys(s.inv).forEach(function (k) { pend.push([ico('scale'), '<a href="#/compliance/investigations">' + e(G.authShort(k)) + ': ' + G.STAGES[s.inv[k].stage].toLowerCase() + '</a>', H.st(s.inv[k].stage >= 2 ? 'bad' : 'warn', U.fmt(s.inv[k].progress, 0) + '%')]); });
    if (s.corr.status !== 'active') pend.push([ico('warn'), '<a href="#/org/corr">USD correspondent: ' + s.corr.status + '</a>', H.st('bad', 'USD')]);
    if (s.trip) pend.push([ico('plane'), 'Acquisition trip: ' + e(G.cname(s.trip.c)) + ' until ' + U.fmtDate(s.trip.until), '']);
    const pendHtml = pend.length ? '<table class="plist">' + pend.map(function (p) { return '<tr><td class="i">' + p[0] + '</td><td>' + p[1] + '</td><td class="r">' + p[2] + '</td></tr>'; }).join('') + '</table>' :
      '<div class="muted pad">No pending items. Run the end-of-day batch when ready.</div>';

    const risk = '<table class="risk compact">' + ['EBK'].concat(G.FOREIGN).map(function (k) {
      const v = s.heat[k];
      return '<tr><td class="rk">' + e(G.authShort(k)) + (s.inv[k] ? ' ' + ico('scale') : '') + '</td><td class="rb">' + H.bar(v) + '</td><td class="num">' + U.fmt(v, 0) + '</td><td>' + H.lvl(v) + '</td></tr>';
    }).join('') + '</table>';

    const mkt = H.grid(['Instrument', { t: 'Last', num: true }, { t: '%', num: true }], ['SMI', 'USD', 'EUR', 'GBP', 'XAU'].map(function (k) {
      const p = (s.market[k] / s.prevMarket[k] - 1) * 100;
      return [D.MARKET_LABEL[k][0], U.fmt(s.market[k], k === 'SMI' || k === 'XAU' ? 2 : 4), H.chg(p, 2)];
    }).concat([[D.MARKET_LABEL.LIBOR[0], U.fmt(s.market.LIBOR, 2) + '%', H.chg(s.market.LIBOR - s.prevMarket.LIBOR, 2)]]), { cls: 'compact' });

    const mails = s.messages.slice(0, 4).map(function (m) {
      return '<tr class="' + (m.read ? '' : 'unread') + '"><td class="i">' + ico(m.type === 'fax' ? 'fax' : m.type === 'telex' ? 'fax' : m.read ? 'mail-open' : 'mail') + '</td><td><a href="#/inbox/' + m.id + '">' + e(m.subject) + '</a><br><span class="muted">' + e(m.from) + '</span></td><td class="r nowrap">' + U.fmtDate(m.d) + '</td></tr>';
    }).join('');

    return {
      mod: 'overview', crumbs: [['Overview']], title: 'Dashboard',
      html: H.title('Dashboard – ' + e(s.meta.name) + ', Managing Partner', '[UEB-0100]', U.longDate(s.date) + ' · Mandant 001 Zürich · ' + D.SCENARIOS[s.meta.scenario].label + ' · ' + D.DIFFICULTY[s.meta.diff].label) +
        '<div class="cols"><div class="col-l">' +
        H.panel('Key figures (Kennzahlen) per ' + U.fmtDate(s.date), kf, { icon: 'chart', flush: true }) +
        (ts ? H.panel('Partners\' targets ' + ts.t.year + ' (assets adjusted for market moves)', tgt, { icon: 'flag', flush: true, tools: '<a href="#/career">Career ›</a>' }) : '') +
        H.panel('Assets under management – CHF Mio., last 60 closings', H.lineChart(s.hist.slice(-60).map(function (h) { return [h.d, h.aum / 1e6]; }), 'Mio.'), { icon: 'chart' }) +
        H.panel('Latest client bookings', recent, { icon: 'list', flush: true, tools: '<a href="#/reports/journal">Journal ›</a>' }) +
        '</div><div class="col-r">' +
        H.panel('Today\'s diary – ' + U.fmtDate(s.date), diary, { icon: 'clock', flush: true, tools: '<a href="#/agenda">Diary ›</a>' }) +
        H.panel('Pending items (Pendenzen)', pendHtml, { icon: 'queue', flush: true }) +
        H.panel('Risk monitor – exposure indices', risk + '<div class="pad small"><a href="#/compliance">Open risk monitor ›</a></div>', { icon: 'shield', flush: true }) +
        H.panel('Markets – Telekurs (delayed)', mkt, { icon: 'chart', flush: true, tools: '<a href="#/market">More ›</a>' }) +
        H.panel('Mail & fax', '<table class="plist">' + mails + '</table>', { icon: 'mail', flush: true, tools: '<a href="#/inbox">Inbox ›</a>' }) +
        '</div></div>'
    };
  };

  /* ---------- Terminkalender ---------- */
  V.agenda = function () {
    const s = H.S();
    const next = G.nextAppointment();
    const rowsFor = function (d, today) {
      return G.agendaFor(d).map(function (a) {
        const k = KIND[a.kind] || ['clock', a.kind];
        const due = today && a.status === 'open' && a.t <= s.clock;
        const c = a.client ? G.client(a.client) : null;
        const actions = today && a.status === 'open' ? (due ? H.btn('Attend', 'agenda', ' data-id="' + a.id + '"', 'sm def') + (a.kind !== 'partners' && a.kind !== 'trip' ? H.btn('Delegate', 'agdelegate', ' data-id="' + a.id + '"', 'sm') : '') + H.btn('Skip', 'agskip', ' data-id="' + a.id + '"', 'sm') : '<span class="muted">at ' + U.fmtTime(a.t) + '</span>') : '';
        return { cls: a.status !== 'open' ? 'closed' : due ? 'due' : '', cells: [a.kind === 'trip' ? 'all day' : U.fmtTime(a.t), ico(k[0]) + ' ' + k[1], e(a.title) + (c ? '<br><span class="muted">' + e(c.name) + ' · ' + e(G.rmName(c)) + '</span>' : ''), e(a.place), a.kind === 'trip' ? 'day' : a.dur + ' min', a.status === 'open' ? '' : H.st(a.status === 'done' || a.status === 'delegated' ? 'ok' : 'warn', a.status), actions] };
      });
    };
    let week = '';
    for (let i = 1; i <= 8; i++) {
      const d = U.addBusinessDays(s.date, i);
      const r = rowsFor(d, false);
      if (r.length) week += '<tr class="grp"><td colspan="7"><b>' + U.weekday(d) + ' ' + U.fmtDate(d) + '</b></td></tr>' + r.map(function (x) { return '<tr>' + x.cells.map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>'; }).join('');
    }
    const left = G.timeLeft();
    return {
      mod: 'overview', crumbs: [['Overview', '#/overview'], ['Diary']], title: 'Diary',
      html: H.title('Diary (Terminkalender) – ' + U.longDate(s.date), '[AGD-0100]', 'Office hours 08:00–18:00. Security locks the building at 20:00. It is now <b>' + U.fmtTime(s.clock) + '</b>' + (s.clock > 18 * 60 ? ' <span class="neg">(overtime – staff morale suffers)</span>' : '') + '; ' + left + ' minutes remain.') +
        '<div class="btnbar left">' + (next ? H.btn(ico('clock') + ' Wait until ' + U.fmtTime(next.t) + ' (' + e(next.title.slice(0, 40)) + ')', 'wait', '') : '') + H.btn(ico('clock') + ' Coffee break (30 min)', 'wait', ' data-min="30"') + '</div>' +
        H.panel('Today', H.grid(['Time', 'Type', 'Appointment', 'Place', 'Duration', 'Status', ''], rowsFor(s.date, true), { empty: 'No appointments today.' }), { icon: 'clock', flush: true }) +
        H.panel('Coming days', week ? '<table class="grid"><thead><tr><th>Time</th><th>Type</th><th>Appointment</th><th>Place</th><th>Duration</th><th></th><th></th></tr></thead><tbody>' + week + '</tbody></table>' : '<div class="muted pad">Nothing scheduled yet.</div>', { icon: 'list', flush: true }) +
        H.note('Appointments become due when the clock reaches their time. Attending costs the time shown; delegating to the client\'s relationship manager costs almost nothing but works only if the RM has capacity. Missed appointments upset clients and partners.')
    };
  };

  V.meetingDialog = function (mc) {
    const s = H.S();
    const k = KIND[mc.a.kind] || ['clock', ''];
    return '<div class="dlg-msg"><svg class="ico32"><use href="#i-' + (mc.a.kind === 'call' ? 'bigphone' : 'biginfo') + '"/></svg><div><b>' + e(mc.a.title) + '</b><br><span class="muted">' + U.fmtTime(mc.a.t) + ' · ' + e(mc.a.place) + ' · ' + k[1] + (mc.a.dur ? ' · ' + mc.a.dur + ' min' : '') + ' · now ' + U.fmtTime(s.clock) + '</span></div></div>' +
      '<div class="inner meet">' + e(mc.intro) + '</div>' +
      '<div class="pcsec">Your choice</div>' + mc.options.map(function (o, i) {
        return '<label class="opt meetopt"><input type="radio" name="mopt" value="' + e(o[0]) + '"' + (i === 0 ? ' checked' : '') + '> <b>' + e(o[1]) + '</b><br><span class="muted">' + e(o[2] || '') + '</span></label>';
      }).join('');
  };

  /* ---------- Ziele und Karriere ---------- */
  V.career = function () {
    const s = H.S();
    const c = s.career;
    const ts = G.targetStatus();
    const tgt = ts ? H.grid(['Target ' + ts.t.year, { t: 'Current', num: true }, { t: 'Target', num: true }, 'Status'], [
      ['Assets under management (market-adjusted)', 'CHF ' + U.fmtMio(ts.aum.now), 'CHF ' + U.fmtMio(ts.t.aum), ts.aum.ok ? H.st('ok', 'on track') : H.st('warn', 'below')],
      ['Net profit for the year', 'CHF ' + U.fmtMio(ts.profit.now, 2), 'CHF ' + U.fmtMio(ts.t.profit, 2), ts.profit.ok ? H.st('ok', 'achieved') : H.st('warn', 'below')],
      [e(G.authName('EBK')) + ' – attention index', U.fmt(ts.reg.now, 1), 'max ' + ts.t.reg, ts.reg.ok ? H.st('ok', 'within') : H.st('bad', 'exceeded')]
    ]) : '';
    const hist = c.history.map(function (h) { return [h.year, h.hits + ' / 3', 'CHF ' + U.fmt(h.profit, 0), 'CHF ' + U.fmtMio(h.aum), U.fmt(h.stake * 100, 0) + '%', 'CHF ' + U.fmt(h.bonus, 0)]; });
    const pl = s.personalLog.slice(0, 12).map(function (p) { return [U.fmtDate(p.d), H.chgRisk(p.v, 1), e(p.r)]; });
    const fame = G.fame().map(function (f, i) { return [String(i + 1), e(f.name), f.scenario, D.DIFFICULTY[f.diff] ? D.DIFFICULTY[f.diff].label : f.diff, e(f.kind), U.fmt(f.years, 1), 'CHF ' + U.fmtMio(f.wealth), '<b>' + U.fmt(f.score, 0) + '</b>']; });
    const exp = c.exposure;
    return {
      mod: 'overview', crumbs: [['Overview', '#/overview'], ['Targets & career']], title: 'Targets & career',
      html: H.title('Targets and career – ' + e(s.meta.name), '[KAR-0100]', 'Partnership share ' + U.fmt(c.stake * 100, 0) + '% · ' + (c.missStreak ? '<span class="neg">' + c.missStreak + ' weak year(s) in a row</span>' : 'no warnings from the partners')) +
        '<div class="cols"><div class="col-h">' + H.panel('Targets set by the partners', tgt, { icon: 'flag', flush: true }) +
        H.panel('Partner confidence', H.bar(c.confidence, c.confidence >= 50 ? 'ok' : c.confidence >= 30 ? 'warn' : 'bad', true) + '<p class="small">Grows with good reports at the quarterly partners\' meetings, falls when meetings are missed or figures disappoint. Below 30 at year end it counts as a missed target.</p>', { icon: 'building' }) +
        H.panel('Review history', H.grid(['Year', 'Targets', { t: 'Profit', num: true }, { t: 'Assets', num: true }, { t: 'Share', num: true }, { t: 'Bonus', num: true }], hist, { empty: 'No completed year yet.' }), { icon: 'list', flush: true }) +
        '</div><div class="col-h">' +
        H.panel('Private numbered account – ' + e(s.meta.name), '<div class="bigval">CHF ' + U.fmt(c.wealth, 0) + '</div><p class="small">Invested in the Vogt Global Balanced Fund. Your bonus is credited here every January.</p>', { icon: 'key' }) +
        H.panel('Personal exposure', H.bar(exp, exp < 25 ? 'ok' : exp < 50 ? 'mod' : exp < 75 ? 'warn' : 'bad', true) + '<p class="small">How much of the bank\'s conduct can be traced to you personally: special services, courier runs, favours, back-to-back loans. Raises the risk of arrest when travelling to a country investigating the bank, and decides between "indicted" and "prison" if the bank is charged.</p>' +
          H.grid(['Date', { t: 'Change', num: true }, 'Cause'], pl, { empty: 'Nothing recorded.', cls: 'compact' }), { icon: 'user' }) +
        H.panel('Leaving the bank', G.canRetire() ? '<p>You may retire with your savings and a buy-back of your partnership share.</p>' + H.btn('Retire (ends the game)', 'retire', '', 'danger') : '<p class="muted">The partners expect you to stay at least four years (or until 2014).</p>', { icon: 'home' }) +
        '</div></div>' +
        H.panel('Hall of fame (this computer)', H.grid(['#', 'Name', 'Start', 'Difficulty', 'Ending', { t: 'Years', num: true }, { t: 'Fortune', num: true }, { t: 'Score', num: true }], fame, { empty: 'No completed careers yet.' }), { icon: 'flag', flush: true })
    };
  };

  /* ---------- Märkte ---------- */
  V.market = function () {
    const s = H.S();
    const rows = ['SMI', 'USD', 'EUR', 'GBP', 'JPY', 'XAU', 'LIBOR'].map(function (k) {
      const d = k === 'SMI' || k === 'XAU' ? 2 : k === 'LIBOR' ? 3 : 4;
      const hist = s.mhist.slice(-40).map(function (m) { return m[k]; });
      const p = k === 'LIBOR' ? s.market[k] - s.prevMarket[k] : (s.market[k] / s.prevMarket[k] - 1) * 100;
      return [D.MARKET_LABEL[k][0], D.MARKET_LABEL[k][1], U.fmt(s.prevMarket[k], d), '<b>' + U.fmt(s.market[k], d) + '</b>', k === 'LIBOR' ? H.chg(p, 3, ' pp') : H.chg(p, 2, '%'), H.spark(hist, 120, 22)];
    });
    const legacy = s.date < D.EURO_DATE ? H.panel('Legacy currencies (fixed parities from 1999)', H.grid(['Currency', { t: 'Rate in CHF', num: true }], ['DEM', 'FRF', 'ITL'].map(function (c) { return [c + (c === 'ITL' ? ' (1000)' : ''), U.fmt(G.rate(c) * (c === 'ITL' ? 1000 : 1), 4)]; })), { icon: 'list', flush: true }) : '';
    return {
      mod: 'overview', crumbs: [['Overview', '#/overview'], ['Market data']], title: 'Market data',
      html: H.title('Market data – Telekurs Investdata', '[MKT-0010]', 'Closing prices ' + U.fmtDate(s.mhist[s.mhist.length - 1].d) + ' · quotes delayed by 15 minutes') +
        H.panel('Rates and indices', H.grid(['Instrument', 'Description', { t: 'Prev. close', num: true }, { t: 'Last', num: true }, { t: 'Change', num: true }, '40 days'], rows), { icon: 'chart', flush: true }) +
        H.panel('SMI – last 120 closings', H.lineChart(s.mhist.slice(-120).map(function (m) { return [m.d, m.SMI]; }), 'pts', 0), { icon: 'chart' }) + legacy +
        H.note('Securities prices are on <a href="#/invest/instruments">Investments › Instruments</a>.')
    };
  };

  V.trip = function () {
    const s = H.S();
    const cur = s.trip ? H.note('Trip under way: <b>' + e(G.cname(s.trip.c)) + '</b> with ' + e((G.staff(s.trip.rm) || {}).name || '') + ', ' + U.fmtDate(s.trip.from) + ' – ' + U.fmtDate(s.trip.until) + '.', 'info') : '';
    const rows = D.TRIP_DEST.map(function (t, i) {
      const a = D.COUNTRIES[t.c].auth;
      return ['<input type="radio" name="dest" value="' + t.c + '" id="dest' + i + '"' + (i === 0 ? ' checked' : '') + (s.trip ? ' disabled' : '') + '>',
        '<label for="dest' + i + '"><b>' + e(G.cname(t.c)) + '</b></label>', e(t.city), e(t.note), a ? H.lvl(s.heat[a]) + ' <span class="muted">' + e(G.authShort(a)) + '</span>' + (s.inv[a] ? ' ' + H.st('bad', 'investigation') : '') : '<span class="muted">–</span>'];
    });
    return {
      mod: 'overview', crumbs: [['Overview', '#/overview'], ['Acquisition trip']], title: 'Acquisition trip',
      html: H.title('Plan acquisition trip', '[AKQ-0300]', 'A relationship manager visits prospects abroad (5 business days, budget CHF 18,000). ' + H.dur(20)) + cur +
        '<form data-form="trip">' + H.panel('Destination', H.grid(['', 'Country', 'Cities', 'Remarks', 'Local exposure'], rows), { icon: 'plane', flush: true }) +
        H.panel('Banker', '<table class="frm"><tr><th>Relationship manager</th><td>' + H.staffSelect('rm', 'rm') + ' <span class="small muted">absent for the duration of the trip; clients are covered by colleagues</span></td></tr></table>', { icon: 'user' }) +
        H.note('Introductions from the destination country become far more frequent. Bankers on foreign soil attract the attention of local authorities; customs checks are possible – and if an investigation is under way there, arrest.') +
        '<div class="btnbar"><button class="btn def" type="submit"' + (s.trip ? ' disabled' : '') + '>Book trip</button></div></form>'
    };
  };

  /* ---------- Post ---------- */
  V.inbox = function () {
    const s = H.S();
    const f = H.f('inbox');
    const list = s.messages.filter(function (m) { return f.k === 'open' ? m.actions.length && !m.resolved : f.k === 'unread' ? !m.read : true; });
    const rows = list.map(function (m) {
      const stt = m.actions.length ? (m.resolved ? H.st('ok', 'Decided') : H.st('warn', 'Decision required')) : m.kind === 'order' ? (function () {
        const p = s.payments.find(function (x) { return x.id === m.data.payment; });
        return p && p.status === 'pending' ? H.st('mod', 'In release queue') : H.st('ok', p ? p.status : 'done');
      })() : '';
      return { cls: m.read ? '' : 'unread', cells: [ico(m.type === 'fax' || m.type === 'telex' ? 'fax' : m.read ? 'mail-open' : 'mail'), { memo: 'Memo', fax: 'Fax', letter: 'Letter', telex: 'Telex' }[m.type] || m.type, e(m.from), '<a href="#/inbox/' + m.id + '">' + e(m.subject) + '</a>', U.fmtDate(m.d) + ' ' + U.fmtTime(m.t), stt] };
    });
    return {
      mod: 'inbox', crumbs: [['Mail & fax'], ['Inbox']], title: 'Inbox',
      html: H.title('Mail, fax and internal memos', '[POS-0100]', s.messages.length + ' item(s), ' + G.unread() + ' unread, ' + G.actionRequired().length + ' awaiting a decision') +
        H.filter('Show ' + H.sel('data-filter="inbox.k"', [['', 'all items'], ['unread', 'unread'], ['open', 'decision required']], f.k || '') + ' ' + H.btn('Mark all as read', 'readall', '', 'sm')) +
        H.grid(['', 'Type', 'From', 'Subject', 'Received', 'Status'], rows, { cls: 'inbox' })
    };
  };

  V.message = function (id) {
    const s = H.S();
    const m = s.messages.find(function (x) { return x.id === id; });
    if (!m) return V.notFound('Message ' + id);
    let doc;
    if (m.type === 'fax') {
      const cl = m.data.client && G.client(m.data.client);
      doc = '<div class="doc fax"><div class="faxhdr">' + U.faxDate(m.d) + ' ' + U.fmtTime(Math.max(0, m.t - 1)) + '  FROM: ' + e(m.from.toUpperCase()) + '  TO: +41 1 218 44 99  P.01/01</div>' +
        '<div class="faxbody">' + H.paras(m.body) + '</div><div class="faxstamp">RECEIVED ' + U.fmtDate(m.d) + ' ' + U.fmtTime(m.t) + ' · SIGNATURE VERIFIED' + (cl ? ' (' + e(G.rmName(cl)) + ')' : '') + '</div></div>';
    } else if (m.type === 'telex') {
      doc = '<div class="doc telex"><div class="tlxhdr">' + U.faxDate(m.d).toUpperCase() + ' ' + U.fmtTime(m.t) + '  812447 VOGT CH  &lt;&lt;  ' + e(m.from.toUpperCase()) + '</div><div>' + H.paras(m.body.toUpperCase()) + '</div><div class="tlxhdr">+++ NNNN</div></div>';
    } else if (m.type === 'letter') {
      doc = '<div class="doc letter"><div class="lsender">' + e(m.from) + '</div><div class="laddr">Bankhaus Vogt &amp; Cie<br>Geschäftsleitung<br>' + e(D.BANK.street) + '<br>' + e(D.BANK.zip) + '</div>' +
        '<div class="ldate">' + U.longDate(m.d) + '</div><div class="lsubj">' + e(m.subject) + '</div><div class="lbody">' + H.paras(m.body) + '</div></div>';
    } else {
      doc = '<div class="doc memo"><div class="memohd">VOGT &amp; CIE · INTERNAL MEMO / AKTENNOTIZ <span>VERTRAULICH</span></div>' +
        H.kv([['To', e(s.meta.name) + ', Managing Partner'], ['From', e(m.from)], ['Date', U.fmtDate(m.d) + ' ' + U.fmtTime(m.t)], ['Subject', '<b>' + e(m.subject) + '</b>']], 'memokv') +
        '<div class="memobody">' + H.paras(m.body) + '</div></div>';
    }
    let extra = '';
    if (m.kind === 'prospect' && m.data.prospect) {
      const pr = m.data.prospect;
      const auth = D.COUNTRIES[pr.c].auth;
      extra = H.panel('Internal assessment (Relationship Management)', H.kv([
        ['Prospect', e(pr.name) + ', ' + e(pr.city) + ' (' + pr.c + ')'], ['Estimated total wealth', 'CHF ' + U.fmtMio(pr.wealth)],
        ['First deposit', pr.ccy + ' ' + U.fmt(pr.amount, 0) + ' · ' + { cash: 'cash (counter)', home: 'wire from ' + G.cname(pr.c), offshore: 'wire from offshore bank', ch: 'transfer from Swiss bank' }[pr.method]],
        ['Proposed fee', U.fmt(pr.fee * D.FEE_LEVELS[s.pricing.level].mult * 100, 2) + '% p.a. → approx. CHF ' + U.fmt(pr.amount * G.rate(pr.ccy) * pr.fee * D.FEE_LEVELS[s.pricing.level].mult, 0) + ' p.a. on first deposit'],
        ['Tax status', pr.declared ? H.st('ok', 'declared') : H.st('warn', 'undeclared')],
        ['Risk class', H.riskSt(pr.risk)], ['Form A', pr.refuseA ? H.st('bad', 'client refuses') : H.st('ok', 'will sign')],
        ['Home exposure', auth ? H.lvl(s.heat[auth]) + ' ' + e(G.authShort(auth)) + (s.inv[auth] ? ' ' + H.st('bad', 'investigation under way') : '') : '<span class="muted">no active enforcement</span>'],
        ['Background check', m.data.checked ? (/inconsistencies/i.test(m.data.checked) ? H.st('bad', 'anomalies') : H.st('ok', 'clean')) + '<br>' + e(m.data.checked) : '<span class="muted">not performed</span>']
      ]), { icon: 'user' });
    }
    if (m.kind === 'order' && m.data.payment) {
      const p = s.payments.find(function (x) { return x.id === m.data.payment; });
      if (p) extra = H.note('Payment order ' + p.ref + ' – status: <b>' + p.status + '</b>. ' + (p.status === 'pending' ? '<a href="#/pay/queue">Go to release queue ›</a>' : '<a href="#/pay/' + p.id + '">View payment ›</a>'), 'info');
    }
    let acts = '';
    if (m.actions.length && !m.resolved) {
      acts = '<div class="decide"><b>Decision:</b> ' + m.actions.map(function (a, i) { return H.btn(e(a[1]), 'decide', ' data-id="' + m.id + '" data-key="' + a[0] + '"', i === 0 ? 'def' : ''); }).join(' ') + (m.due ? ' <span class="muted">Deadline ' + U.fmtDate(m.due) + '</span>' : m.expires ? ' <span class="muted">Valid until ' + U.fmtDate(m.expires) + '</span>' : '') + '</div>';
    } else if (m.resolved) {
      acts = '<div class="resolved">' + ico('check') + ' <b>' + e(m.resolved.label) + '</b> – ' + U.fmtDate(m.resolved.d) + ' ' + U.fmtTime(m.resolved.t) + ' · ' + e(m.resolved.by) + '<br>' + e(m.resolved.text) + '</div>';
    }
    return {
      mod: 'inbox', crumbs: [['Mail & fax', '#/inbox'], [m.id]], title: m.subject,
      html: H.title(e(m.subject), '[POS-0110]') + '<div class="btnbar left noprint">' + H.btn('‹ Inbox', 'go', ' data-href="#/inbox"') + H.btn(ico('print') + ' Print', 'print') + '</div>' +
        acts + extra + doc
    };
  };

  V.notFound = function (what) {
    return { mod: 'overview', crumbs: [['Error']], title: 'The page cannot be displayed', notFound: true, html: '<div class="ie-error"><h1>The page cannot be displayed</h1><p>The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties, or you may need to adjust your browser settings.</p><hr><p>Please try the following:</p><ul><li>Click the <a href="#/overview">Home</a> button, or the <b>Back</b> button to try another link.</li><li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li></ul><p class="muted">PBS-E-0404 · ' + e(what) + ' not found<br>Internet Explorer</p></div>' };
  };

  /* ---------- Neues Spiel ---------- */
  V.newGameForm = function (name) {
    return '<form id="newgameform"><div class="ng"><div class="pcsec">Start year</div>' + Object.keys(D.SCENARIOS).map(function (k, i) {
      const sc = D.SCENARIOS[k];
      return '<label class="opt ngopt"><input type="radio" name="sc" value="' + k + '"' + (k === '2003' ? ' checked' : '') + '> <b>' + e(sc.label) + '</b><br><span class="muted">' + e(sc.desc) + '</span></label>';
    }).join('') +
      '<div class="pcsec">Difficulty</div>' + Object.keys(D.DIFFICULTY).map(function (k) {
      const d = D.DIFFICULTY[k];
      return '<label class="opt ngopt inl"><input type="radio" name="df" value="' + k + '"' + (k === 'standard' ? ' checked' : '') + '> <b>' + e(d.label) + '</b> <span class="muted">– ' + e(d.desc) + '</span></label>';
    }).join('') +
      '<div class="pcsec">Your name (as it appears on your business card)</div><input name="nm" class="inp" size="34" maxlength="40" value="' + e(name || '') + '" placeholder="e.g. Dr. M. Ammann"></div></form>';
  };

  /* ---------- Handbuch ---------- */
  V.handbook = function () {
    return '<div class="hb"><h3>PBS/Web – Handbook for the Managing Partner</h3>' +
      '<p>You run <b>Bankhaus Vogt &amp; Cie</b>, a small Zurich private bank, during the last two decades of Swiss banking secrecy. Your clients pay handsome fees to keep their money discreetly away from their home tax authorities. Your job: grow assets and profit, satisfy the partners – and stay out of foreign courtrooms until secrecy ends in 2017.</p>' +
      '<h4>Your working day</h4><p>The office opens at 08:00 and closes at 18:00; security locks the building at 20:00. Every decision costs time (shown as ' + ico('clock') + ' minutes). Appointments in the <b>Diary</b> pop up when the clock reaches them – client reviews, phone calls, the monthly investment committee, the quarterly partners\' meeting, sometimes a trip abroad. Delegate to staff what you can. Press <b>End of day</b> (F9) to run the batch.</p>' +
      '<h4>Daily routine</h4><ol><li><b>Mail &amp; fax</b>: new clients, authorities, staff matters, client emergencies.</li><li><b>Payments</b>: release faxed orders (four-eyes), serve the cash desk, approve courier runs.</li><li><b>Compliance</b>: clear alerts the compliance team cannot handle; answer requests for assistance.</li><li><b>Investments</b>: set the house view at the monthly committee.</li><li><b>Organisation</b>: hire, pay and keep your people; open branches and booking centres.</li></ol>' +
      '<h4>Money</h4><p>Management fees, commissions, FX and gold margins, interest on client deposits and loans, fund fees and retrocessions, structure fees, own trading. Costs: salaries, premises, lawyers, lobbying, audits. Equity capital must stay above CHF 10 million and cover the capital requirements.</p>' +
      '<h4>Risk</h4><ul><li>The <b>Risk monitor</b> shows how much attention the bank attracts from the regulator and five foreign tax authorities. High attention leads to requests for assistance, then to <b>investigations</b> that advance stage by stage – raids, arrests, indictment.</li><li>Paper trails come from payments into home countries, mailed statements, border checks, press reports, couriers, leaks and whistleblowers. Structures, hold mail, booking centres abroad and good staff reduce them.</li><li>Until the new tax treaties (2010–2016) you may refuse assistance for mere tax evasion – but not for tax fraud. Read the legal note.</li><li>Your <b>personal exposure</b> grows with the special services you approve yourself.</li></ul>' +
      '<h4>Endings</h4><p>Retire rich, sell the bank, reach 2018 as a "white money" bank – or get fired by the partners, lose the licence, see the bank indicted, or be arrested at an airport.</p>' +
      '<p class="small muted">All persons, banks and companies are fictitious. The game state is saved automatically in this browser.</p></div>';
  };

  V.gameOver = function (go) {
    const s = H.S();
    const fame = G.fame();
    const rank = fame.findIndex(function (f) { return f.score === go.score && f.d === go.d; });
    return '<div class="paper"><div class="mast">Zürcher Finanzblatt</div>' +
      '<div class="dateline">' + U.longDate(go.d) + ' · Unabhängige Tageszeitung für Wirtschaft und Finanzen · Fr. 3.20</div>' +
      '<h1>' + e(go.head) + '</h1><h2>' + e(go.sub) + '</h2>' +
      '<div class="cols3"><p><b>Zürich.</b> ' + e(go.body) + '</p><p>' + e(D.BANK.name) + ', founded in ' + D.BANK.founded + ', managed CHF ' + U.fmtMio(go.aum) + ' at the end. ' + (go.good ? '"It was an honour to serve this house," the managing partner said.' : 'The managing partner declined to comment.') + '</p></div>' +
      '<div class="tenure"><b>' + e(s.meta.name) + ' – career summary</b><br>' + go.days + ' business days (' + U.fmt(go.days / 250, 1) + ' years) · peak assets CHF ' + U.fmtMio(go.peak) + ' · equity CHF ' + U.fmtMio(go.capital) + ' · private fortune CHF ' + U.fmt(go.wealth, 0) + ' · personal exposure ' + U.fmt(go.exposure, 0) + '<br>' + e(go.personal || '') +
      '<div class="score">Score: <b>' + U.fmt(go.score, 0) + '</b>' + (rank >= 0 ? ' – rank ' + (rank + 1) + ' in the hall of fame' : '') + '</div></div>' +
      '<div class="btnbar"><button class="btn def" data-act="restart">Start a new career</button></div></div>';
  };
})(window.PBS);
