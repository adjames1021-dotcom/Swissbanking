/* PBS/Web 4.2 – Masken: Anlagen, Compliance, Strukturen, Organisation, Berichte */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, H = PBS.H, V = PBS.Views;
  const e = U.esc;
  const tr = PBS.L.t;
  const ico = H.ico, st = H.st, num = H.num, grid = H.grid, panel = H.panel, kv = H.kv, btn = H.btn;

  /* ---------- Anlagen ---------- */
  V.invest = function () {
    const s = H.S();
    const inMeeting = s.house.icDate === s.date;
    const strats = Object.keys(D.STRATS);
    const head = '<tr><th>Asset class</th>' + strats.map(function (k) { return '<th class="num">' + e(D.STRATS[k].label) + '</th>'; }).join('') + '</tr>';
    const body = D.CLASS_KEYS.map(function (cls) {
      return '<tr><td>' + e(D.CLASSES[cls]) + (cls === 'HEDGE' ? '<br><span class="small muted">Atlantic Absolute Return Fund</span>' : '') + '</td>' + strats.map(function (k) {
        return '<td class="num"><input class="inp num" size="4" name="w_' + k + '_' + cls + '" value="' + s.house.alloc[k][cls] + '"> %</td>';
      }).join('') + '</tr>';
    }).join('') + '<tr class="sum"><td><b>Total</b></td>' + strats.map(function (k) { return '<td class="num" id="sum_' + k + '"><b>' + D.CLASS_KEYS.reduce(function (t, c) { return t + s.house.alloc[k][c]; }, 0) + '%</b></td>'; }).join('') + '</tr>';
    const perf = strats.map(function (k) {
      const p = G.stratPerf(k);
      return [e(D.STRATS[k].label), String(p.n), U.fmt(p.val, 0), H.chg(p.own * 100, 2, '%'), U.fmt(p.bench * 100, 2) + '%', H.chg((p.own - p.bench) * 100, 2, ' pp')];
    });
    const pm = G.pmInfo();
    const aar = s.mhist.slice(-60).map(function (m) { return m.AAR; });
    const form = '<form data-form="house"><table class="grid alloc"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>' +
      '<table class="frm"><tr><th>Trading intensity</th><td>' + H.sel('name="intensity"', Object.keys(D.INTENSITY).map(function (k) { return [k, D.INTENSITY[k].label]; }), s.house.intensity) + ' <span class="small muted">more trading = more brokerage income, more cost for clients</span></td></tr>' +
      '<tr><th>Fund policy</th><td>' + H.sel('name="pref"', Object.keys(D.PRODUCT_PREF).map(function (k) { return [k, D.PRODUCT_PREF[k].label]; }), s.house.pref) + ' <span class="small muted">house fund: 1.2% fee to the bank · third-party: 1.0% retrocession</span></td></tr></table>' +
      '<div class="btnbar">' + (inMeeting ? '<span class="tag">Committee in session: no extra time</span>' : H.dur(45)) + '<button class="btn def" type="submit">Adopt house view</button></div></form>';
    return {
      mod: 'invest', crumbs: [['Investments'], ['House view']], title: 'House view',
      html: H.title(tr('Investment committee – house view (Anlagepolitik)', 'Investment committee – house view'), '[ANL-0100]', 'Target allocation of discretionary mandates. Changes trigger rebalancing at 0.25% brokerage on the volume traded.') +
        '<div class="cols"><div class="col-l">' + panel('Strategic allocation', form, { icon: 'chart' }) +
        panel('Performance year to date', grid(['Strategy', { t: 'Mandates', num: true }, { t: 'Volume CHF', num: true }, { t: 'Return', num: true }, { t: 'Benchmark', num: true }, { t: 'Relative', num: true }], perf), { icon: 'list', flush: true }) +
        '</div><div class="col-r">' + panel('Portfolio management', kv([['Portfolio managers', pm.n ? pm.n + ' (average skill ' + U.fmt(pm.skill, 1) + ')' : '<span class="neg">none (mandates drift)</span>'], ['Discretionary volume', 'CHF ' + U.fmtMio(pm.dep)], ['Capacity', pm.cap ? 'CHF ' + U.fmtMio(pm.cap) + (pm.load > 1 ? ' <span class="neg">overloaded</span>' : '') : '–']]), { icon: 'user' }) +
        panel('Atlantic Absolute Return Fund – NAV (USD), 60 days', H.spark(aar, 300, 50) + '<p class="small">' + (s.flags.aarFraud ? '<span class="neg">Fund collapsed on ' + U.fmtDate(s.flags.aarFraud) + '.</span>' : 'Around 0.8% a month, every month, whatever the market does. The manager will not discuss the strategy. The fund is audited by a firm of three people.') + '</p>', { icon: 'chart' }) +
        panel('Market environment', kv([['SMI', U.fmt(s.market.SMI, 0)], ['CHF Libor 3M', U.fmt(s.market.LIBOR, 2) + '%'], ['Gold (USD/oz)', U.fmt(s.market.XAU, 0)], ['USD/CHF', U.fmt(s.market.USD, 4)]]), { icon: 'info' }) +
        '</div></div>'
    };
  };

  V.mandates = function () {
    const s = H.S();
    const rows = s.accounts.filter(function (a) { return a.type === 'DEP' && !a.closed; }).sort(function (a, b) { return b.bal - a.bal; }).map(function (a) {
      const c = G.client(a.client);
      const p = G.perf(a);
      return ['<a href="#/client/' + c.id + '/accounts">' + a.id + '</a>', H.cref(c), e(D.STRATS[a.strat || 'balanced'].label), U.fmt(a.bal, 0), H.chg(p.own * 100, 2, '%'), H.chg(p.rel * 100, 2, ' pp'), c.traits.indexOf('greedy') >= 0 ? st('warn', 'performance-driven') : ''];
    });
    return {
      mod: 'invest', crumbs: [['Investments', '#/invest'], ['Mandates']], title: 'Mandates',
      html: H.title(tr('Discretionary mandates (Vermögensverwaltungsmandate)', 'Discretionary mandates'), '[ANL-0200]', 'Clients compare their returns with the benchmark every quarter.') +
        grid(['Portfolio', 'Client', 'Strategy', { t: 'Value CHF', num: true }, { t: 'YTD', num: true }, { t: 'vs benchmark', num: true }, ''], rows, { empty: 'No mandates.' })
    };
  };

  V.instruments = function () {
    const s = H.S();
    const rows = D.INSTR.map(function (i) {
      const hist = s.mhist.slice(-40).map(function (m) { return m[i.id]; });
      const p = s.market[i.id], p0 = s.prevMarket[i.id] || p;
      return [i.id, e(i.name), e(D.CLASSES[i.cls]), i.ccy, U.fmt(p, 2), H.chg((p / p0 - 1) * 100, 2, '%'), H.spark(hist, 100, 20), U.fmt((s.nostro.pos[i.id] || 0) * G.priceCHF(i.id), 0)];
    });
    return {
      mod: 'invest', crumbs: [['Investments', '#/invest'], ['Instruments']], title: 'Instruments',
      html: H.title(tr('Instruments – approved list (Anlageuniversum)', 'Instruments – approved list'), '[ANL-0300]', 'Prices in trading currency; bonds in % of nominal.') +
        grid(['Code', 'Instrument', 'Class', 'Ccy', { t: 'Last', num: true }, { t: 'Change', num: true }, '40 days', { t: 'Nostro CHF', num: true }], rows)
    };
  };

  V.treasury = function () {
    const s = H.S();
    const ci = G.capitalInfo();
    const pos = Object.keys(s.nostro.pos).map(function (id) {
      const i = G.instr(id);
      return [e(i.name), U.fmt(s.nostro.pos[id], 2), U.fmt(s.market[id], 2) + ' ' + i.ccy, U.fmt(s.nostro.pos[id] * G.priceCHF(id), 0)];
    });
    const opts = D.INSTR.filter(function (i) { return i.cls !== 'HOUSE'; }).map(function (i) { return [i.id, i.name]; });
    return {
      mod: 'invest', crumbs: [['Investments', '#/invest'], ['Treasury']], title: 'Treasury',
      html: H.title('Treasury and own account (Nostro)', '[TRS-0100]', 'Equity not invested is placed in the money market at Libor. Client deposits earn the bank a margin of up to 0.6%.') +
        '<div class="cols"><div class="col-h">' + panel('Capital and requirements', kv([
          ['Equity capital', 'CHF ' + num(ci.capital, 0)], ['Tied in subsidiaries', 'CHF ' + U.fmt(ci.tied, 0)], ['Own-account positions', 'CHF ' + U.fmt(ci.nostro, 0)],
          ['Placed in money market', 'CHF ' + num(ci.free, 0) + ' at ' + U.fmt(s.market.LIBOR, 2) + '%'], ['Capital requirement', 'CHF ' + U.fmt(ci.req, 0)],
          ['Coverage', ci.ratio >= 1.2 ? st('ok', U.fmt(ci.ratio * 100, 0) + '%') : ci.ratio >= 1 ? st('warn', U.fmt(ci.ratio * 100, 0) + '%') : st('bad', U.fmt(ci.ratio * 100, 0) + '% (shortfall)')],
          ['Negative rates', s.market.LIBOR < 0 ? (s.flags.passNeg ? 'passed on to large clients' : 'absorbed by the bank') : '–']
        ]), { icon: 'building' }) + '</div><div class="col-h">' +
        panel('Own-account positions', grid(['Instrument', { t: 'Quantity', num: true }, { t: 'Price', num: true }, { t: 'CHF', num: true }], pos, { empty: 'No positions.' }) +
          '<form data-form="nostro" class="inl pad">' + H.sel('name="id"', opts, 'CONF') + ' CHF <input name="amount" class="inp num" size="12" placeholder="1000000"> <button class="btn sm" type="submit" name="side" value="buy">Buy</button> <button class="btn sm" type="submit" name="side" value="sell">Sell</button> ' + H.dur(10) + '</form>', { icon: 'chart', flush: true }) +
        '</div></div>' + H.note('Limit: own-account positions may not exceed 50% of equity. Equities and hedge funds weigh fully in the capital requirement, gold half, bonds one fifth.')
    };
  };

  /* ---------- Compliance ---------- */
  V.risk = function () {
    const s = H.S();
    const past = s.heatHist.length >= 5 ? s.heatHist[s.heatHist.length - 5] : s.heatHist[0];
    const rows = ['EBK'].concat(G.FOREIGN).map(function (k) {
      const v = s.heat[k];
      const inv = s.inv[k];
      return ['<b>' + e(G.authShort(k)) + '</b><br><span class="muted">' + e(G.authName(k)) + '</span>', H.cty(D.AUTH[k].c) + ' ' + e(G.cname(D.AUTH[k].c)), '<b>' + U.fmt(v, 1) + '</b>',
        '<div class="bar big"><div class="fill lv-' + G.level(v).cls + '" style="width:' + v.toFixed(1) + '%"></div><span class="m50"></span><span class="m75"></span></div>', H.lvl(v), past ? H.chgRisk(v - past[k], 1) : '',
        inv ? '<a href="#/compliance/investigations">' + st(inv.stage >= 2 ? 'bad' : 'warn', G.STAGES[inv.stage]) + '</a>' : (k !== 'EBK' && D.AMTSHILFE[k] && s.date >= D.AMTSHILFE[k] ? '<span class="small muted">treaty assistance</span>' : '')];
    });
    const drivers = s.heatLog.slice(0, 25).map(function (h) { return [U.fmtDate(h.d), e(G.authShort(h.k)), H.chgRisk(h.v, 2), e(h.r)]; });
    return {
      mod: 'compliance', crumbs: [['Compliance'], ['Risk monitor']], title: 'Risk monitor',
      html: H.title('Risk monitor – exposure to authorities', '[CMP-0010]', 'Internal estimate by Legal & Compliance. Index 0–100. Above 55 foreign authorities may open investigations; the regulator withdraws the licence at 100.') +
        panel('Exposure indices', grid(['Authority', 'Jurisdiction', { t: 'Index', num: true }, { t: 'Scale 0–100', w: '30%' }, 'Level', { t: 'Δ 5 days', num: true }, 'Proceedings'], rows), { icon: 'shield', flush: true }) +
        '<div class="cols"><div class="col-h">' + panel('Recent drivers', grid(['Date', 'Authority', { t: 'Change', num: true }, 'Cause'], drivers, { empty: 'No changes recorded yet.' }), { icon: 'list', flush: true }) +
        '</div><div class="col-h">' + panel('Client confidence (discretion index)', '<div class="bigval">' + U.fmt(s.discretion, 0) + '</div>' + H.bar(s.discretion, 'ok', true) + '<p class="small">How safe clients and introducers believe their money is with us. High confidence brings introductions; reports to the authorities and leaks lower it.</p>', { icon: 'user' }) +
        panel('How exposure arises', '<ul class="hints"><li><b>Regulator:</b> overdue or poorly documented alerts, PEP and increased-risk clients, missing Form A, audit findings, capital shortfalls, operational errors.</li><li><b>Foreign authorities:</b> payments into home countries, mailed statements, clients caught at the border, couriers, press reports, banker trips, leaks and whistleblowers.</li><li>Exposure fades slowly if nothing new happens. Lawyers slow investigations; lobbying helps with the regulator.</li></ul>', { icon: 'info' }) +
        '</div></div>'
    };
  };

  V.alerts = function () {
    const s = H.S();
    const f = H.f('alerts');
    const mode = f.st || 'open';
    const list = s.alerts.filter(function (a) { return mode === 'all' || (mode === 'open' ? a.status === 'open' : a.status !== 'open'); });
    const rows = list.map(function (a) {
      const c = G.client(a.client);
      const over = a.status === 'open' && a.due < s.date;
      const routine = a.rules.every(function (r) { return D.RULES_ROUTINE.indexOf(r) >= 0; });
      const stt = a.status === 'open' ? (over ? st('bad', 'Overdue') : st('warn', 'Open')) : a.status === 'reported' ? st('mod', 'Reported MROS') : st('ok', 'Closed') + (a.weak ? ' ' + st('warn', 'thin') : '');
      return { cls: over ? 'overdue' : '', cells: [a.status === 'open' ? '<input type="checkbox" name="sel" value="' + a.id + '" aria-label="Select ' + a.id + '">' : '',
        '<b class="nowrap">' + a.id + '</b>', U.fmtDate(a.d), U.fmtDate(a.due), a.rules.map(function (r) { return '<span class="rule" title="' + e(D.RULES[r]) + '">' + r + '</span>'; }).join(' ') + (routine && a.status === 'open' ? '<br><span class="small muted">routine</span>' : ''), H.cref(c), e(a.desc), U.fmt(a.chf, 0), stt + (a.res && a.status !== 'open' ? '<br><span class="small muted">' + e(a.res.by) + '</span>' : ''),
        a.status === 'open' ? btn('Handle', 'alert', ' data-id="' + a.id + '"', 'sm def') : btn('View', 'alert', ' data-id="' + a.id + '"', 'sm')] };
    });
    const anyOpen = list.some(function (a) { return a.status === 'open'; });
    const bulk = anyOpen ? '<div class="filter bulk">Selected alerts: close as explained with justification ' + H.sel('name="just"', [['', '– select –']].concat(D.JUSTIFICATIONS), '') + ' <button type="submit" class="btn sm def">Close selected</button> ' + H.dur(3) + ' each</div>' : '';
    return {
      mod: 'compliance', crumbs: [['Compliance', '#/compliance'], ['Alerts']], title: 'Alerts',
      html: H.title('Transaction monitoring – alerts', '[CMP-0200]', 'Clear within 10 business days. Each evening the compliance team clears up to ' + G.complianceCapacity() + ' routine alert(s) (' + D.RULES_ROUTINE.join(', ') + ' only).') +
        H.filter('Show ' + H.sel('data-filter="alerts.st"', [['open', 'open alerts'], ['closed', 'closed / reported'], ['all', 'all']], mode) + ' &nbsp; <label><input type="checkbox" data-act="delegate"' + (s.delegate !== false ? ' checked' : '') + '> Let the compliance team clear routine alerts</label>') +
        '<form data-form="bulkalerts">' + grid([anyOpen ? '<input type="checkbox" name="selall" aria-label="Select all">' : '', 'Alert', 'Created', 'Due', 'Rules', 'Client', 'Description', { t: 'CHF', num: true }, 'Status', ''], rows, { empty: 'No alerts.' }) + bulk + '</form>' +
        panel('Rule catalogue', grid(['Rule', 'Description'], Object.keys(D.RULES).map(function (r) { return ['<b>' + r + '</b>', e(D.RULES[r])]; })), { icon: 'list', flush: true })
    };
  };

  V.alertDialog = function (a) {
    const s = H.S();
    const c = G.client(a.client);
    const tx = s.tx.find(function (t) { return t.id === a.tx; });
    let h = kv([
      ['Alert', '<b>' + a.id + '</b> · created ' + U.fmtDate(a.d) + ' ' + U.fmtTime(a.t) + ' · due ' + U.fmtDate(a.due)],
      ['Rules', a.rules.map(function (r) { return '<b>' + r + '</b> ' + e(D.RULES[r]); }).join('<br>')],
      ['Transaction', e(a.desc) + (tx ? '<br><span class="muted">' + U.fmtDate(tx.d) + ' · account ' + tx.acc + ' · ' + tx.ccy + ' ' + U.fmt(tx.amt, H.dec(tx.ccy)) + ' · CHF ' + U.fmt(Math.abs(tx.chf), 0) + '</span>' : '')],
      ['Client', c.id + ' <b>' + e(c.rubrik) + '</b> – ' + e(c.name) + ', ' + e(c.city) + ' (' + c.dom + ')'],
      ['Client profile', 'Occupation: ' + e(c.occ) + '<br>Source of wealth: ' + e(c.sow) + '<br>Documented wealth: <b>CHF ' + U.fmtMio(c.wealth) + '</b> · Risk: ' + e(c.risk) + ' · Form A: ' + (c.formA ? 'yes' : '<b class="neg">missing</b>')]
    ], 'dlgkv');
    if (a.status !== 'open') {
      const j = D.JUSTIFICATIONS.find(function (x) { return x[0] === a.res.just; });
      return h + '<div class="resolved">' + ico('check') + ' ' + (a.status === 'reported' ? 'Reported to MROS' : 'Closed') + ' on ' + U.fmtDate(a.res.d) + ' ' + U.fmtTime(a.res.t) + ' by ' + e(a.res.by) +
        (j ? '<br>Justification: ' + e(j[1]) : '') + (a.res.comment ? '<br>Comment: ' + e(a.res.comment) : '') + (a.weak ? '<br><b>Documentation quality: thin</b>' : '') + '</div>';
    }
    return h + '<form id="alertform"><fieldset class="box"><legend>Decision</legend>' +
      '<label class="opt"><input type="radio" name="dec" value="close" checked> <b>Close as explained</b> (plausible, documented) ' + H.dur(8) + '</label>' +
      '<div class="ind">Justification ' + H.sel('name="just"', [['', '– select –']].concat(D.JUSTIFICATIONS), '') +
      '<br>Comment <input name="comment" class="inp" size="56" placeholder="e.g. confirmed by RM, documents on file"><div id="aq" class="small muted">Documentation quality: –</div></div>' +
      '<label class="opt"><input type="radio" name="dec" value="mros"> <b>Report to MROS</b> (Art. 9 GwG): assets are blocked and the relationship is terminated ' + H.dur(25) + '</label></fieldset></form>';
  };

  V.mla = function () {
    const s = H.S();
    const rows = s.messages.filter(function (m) { return m.kind === 'mla'; }).map(function (m) {
      const c = G.client(m.data.client);
      return [U.fmtDate(m.d), '<a href="#/inbox/' + m.id + '">' + e(m.subject) + '</a>', H.cref(c), e(G.authShort(m.data.auth)), m.data.treaty ? 'Administrative (treaty)' : 'Criminal', m.due ? U.fmtDate(m.due) : '', m.resolved ? st('ok', e(m.resolved.label)) : st('warn', 'Open')];
    });
    const treaty = G.FOREIGN.map(function (k) { return [e(G.cname(D.AUTH[k].c)), U.fmtDate(D.AMTSHILFE[k]), s.date >= D.AMTSHILFE[k] ? st('bad', 'in force') : st('ok', 'not yet')]; });
    return {
      mod: 'compliance', crumbs: [['Compliance', '#/compliance'], ['Mutual assistance']], title: 'Mutual assistance',
      html: H.title(tr('Mutual and administrative assistance (Rechts- und Amtshilfe)', 'Mutual and administrative assistance'), '[CMP-0300]', 'Requests from foreign authorities, forwarded via Berne.') +
        grid(['Received', 'Request', 'Client', 'Authority', 'Type', 'Due', 'Status'], rows, { empty: 'No requests received.' }) +
        '<div class="cols"><div class="col-h">' + panel('Revised tax treaties (assistance also for tax evasion)', grid(['Country', 'From', 'Status'], treaty), { icon: 'scale', flush: true }) + '</div><div class="col-h">' +
        H.note('Under Swiss law simple tax evasion is not a crime; mutual assistance is excluded for fiscal offences (Art. 3 para. 3 IRSG). Tax fraud with forged documents is a crime, and assistance must be granted. Producing documents without legal basis breaches banking secrecy (Art. 47 BankG). Once a revised tax treaty is in force, administrative assistance is granted for evasion too.') + '</div></div>'
    };
  };

  V.investigations = function () {
    const s = H.S();
    const rows = G.FOREIGN.map(function (k) {
      const inv = s.inv[k];
      return [e(G.authName(k)), H.cty(D.AUTH[k].c), inv ? U.fmtDate(inv.opened) : '–', inv ? st(inv.stage >= 2 ? 'bad' : 'warn', G.STAGES[inv.stage]) : st('ok', 'none'),
        inv ? H.bar(inv.progress, inv.progress >= 70 ? 'bad' : inv.progress >= 35 ? 'warn' : 'mod', true) : '', inv ? U.fmt(inv.progress, 0) + '%' : '', inv ? e(inv.reasons.join('; ')) : '', U.fmt(G.travelRisk(D.AUTH[k].c) * 100, 0) + '%'];
    });
    return {
      mod: 'compliance', crumbs: [['Compliance', '#/compliance'], ['Investigations']], title: 'Investigations',
      html: H.title(tr('Investigations against the bank (Strafverfahren im Ausland)', 'Investigations against the bank abroad'), '[CMP-0350]', 'Proceedings advance while the authority\'s attention index stays above 45 and fade below. At 100% the bank is indicted.') +
        grid(['Authority', 'Ctry', 'Opened', 'Stage', { t: 'Progress', w: '22%' }, { t: '', num: true }, 'Evidence', { t: 'Arrest risk on trips', num: true }], rows) +
        H.note('Stage 2 (formal investigation): raids on representative offices, arrests of travelling bankers. Stage 3: indictment pending. Your personal exposure (' + U.fmt(s.career.exposure, 0) + ') decides whether you are named personally. Defence counsel slows proceedings (see <a href="#/compliance/legal">Legal & lobbying</a>).')
    };
  };

  V.legal = function () {
    const s = H.S();
    const law = Object.keys(D.LAWYERS).map(function (k) {
      const L = D.LAWYERS[k];
      return ['<b>' + e(L.name) + '</b><br><span class="muted">' + e(L.note) + '</span>', 'CHF ' + U.fmt(L.cost, 0) + ' p.a.', s.legal[k] ? st('ok', 'retained since ' + U.fmtDate(s.legal[k])) : st('mod', 'not retained'), btn(s.legal[k] ? 'Terminate' : 'Retain', 'lawyer', ' data-key="' + k + '" data-on="' + (s.legal[k] ? 0 : 1) + '"', 'sm')];
    });
    const lob = Object.keys(D.LOBBY).map(function (k) {
      const L = D.LOBBY[k];
      return ['<b>' + e(L.name) + '</b><br><span class="muted">' + e(L.note) + '</span>', 'CHF ' + U.fmt(L.cost, 0) + ' p.a.', s.lobby[k] ? st('ok', 'active since ' + U.fmtDate(s.lobby[k])) : st('mod', 'inactive'), btn(s.lobby[k] ? 'Stop' : 'Start', 'lobby', ' data-key="' + k + '" data-on="' + (s.lobby[k] ? 0 : 1) + '"', 'sm')];
    });
    return {
      mod: 'compliance', crumbs: [['Compliance', '#/compliance'], ['Legal & lobbying']], title: 'Legal & lobbying',
      html: H.title('Legal counsel and political relations', '[CMP-0400]', 'Retainers are charged daily. Each change ' + H.dur(20)) +
        panel('Defence counsel', grid(['Firm', { t: 'Cost', num: true }, 'Status', ''], law), { icon: 'scale', flush: true }) +
        panel('Lobbying', grid(['Measure', { t: 'Cost', num: true }, 'Status', ''], lob), { icon: 'building', flush: true }) +
        panel('Data security', '<p>Access to client data: ' + (s.flags.dataAudit ? st('ok', 'restricted since ' + U.fmtDate(s.flags.dataAudit)) : st('warn', 'every employee can print client lists')) + ' · IT security level ' + G.securityLevel() + '</p>' + (s.flags.dataAudit ? '' : btn('Restrict access rights and log all printouts (CHF 250,000)', 'dataaudit') + ' ' + H.dur(30) + '<p class="small muted">Staff dislike being watched (morale −4), but stolen data CDs become much rarer.</p>'), { icon: 'lock' })
    };
  };

  V.audits = function () {
    const s = H.S();
    const y = s.date.slice(0, 4);
    const next = s.flags['audit' + y] ? (+y + 1) + '-09-15' : y + '-09-15';
    const rows = s.audits.map(function (a) { return [a.year, U.fmtDate(a.d), a.findings.length ? a.findings.map(e).join('<br>') : st('ok', 'No findings'), H.chgRisk(a.delta, 1)]; });
    return {
      mod: 'compliance', crumbs: [['Compliance', '#/compliance'], ['Audit reports']], title: 'Audit reports',
      html: H.title(tr('Audit reports (Revisionsberichte)', 'Audit reports'), '[CMP-0500]', 'Statutory auditor: Hürlimann Revision AG, Zürich. Next fieldwork from ' + U.fmtDate(next) + '.') +
        grid(['Year', 'Report', 'Findings', { t: 'Regulator index', num: true }], rows, { empty: 'No audit completed yet.' }) +
        H.note('The auditors check Form A, a sample of alert closures, overdue alerts, PEP concentration and classification, dormant relationships, capital and retrocessions. Now and then they find an embezzler.')
    };
  };

  /* ---------- Strukturen ---------- */
  V.structures = function () {
    const s = H.S();
    const rows = s.entities.filter(function (x) { return !x.dissolved; }).map(function (x) {
      const j = D.JURIS[x.jur];
      const c = G.client(x.bo);
      const n = s.accounts.filter(function (a) { return a.entity === x.id && !a.closed; }).length;
      return ['<b>' + e(x.name) + '</b>', e(j.form), H.cty(j.c) + ' ' + e(G.cname(j.c)), U.fmtDate(x.inc), e(j.agent), H.cref(c), String(n), U.fmt(G.entityAUM(x.id), 0)];
    });
    return {
      mod: 'structures', crumbs: [['Structures'], ['Register']], title: 'Structures',
      html: H.title('Structures – companies, foundations, trusts, insurance wrappers', '[SGS-0100]', 'Held for clients; beneficial owner documented on Form A.') +
        '<div class="btnbar left">' + btn(ico('plus') + ' Set up structure', 'go', ' data-href="#/structures/new"') + '</div>' +
        grid(['Name', 'Form', 'Jurisdiction', 'Set up', 'Agent / trustee', 'Beneficial owner', 'Accts', { t: 'Assets CHF', num: true }], rows)
    };
  };
  V.structureNew = function (q) {
    const shield = function (v) { return v <= 0.33 ? st('ok', 'very strong') : v <= 0.45 ? st('ok', 'strong') : st('mod', 'good'); };
    const jrows = Object.keys(D.JURIS).map(function (k, i) {
      const j = D.JURIS[k];
      return ['<input type="radio" name="jur" value="' + k + '" id="j' + i + '"' + (i === 0 ? ' checked' : '') + '>', '<label for="j' + i + '">' + e(j.label) + '</label>', e(j.agent), 'CHF ' + U.fmt(j.setup, 0), 'CHF ' + U.fmt(j.annual, 0), shield(j.shield)];
    });
    return {
      mod: 'structures', crumbs: [['Structures', '#/structures'], ['Set up']], title: 'Set up structure',
      html: H.title('Set up a structure', '[SGS-0200]', 'Via our correspondent agents and trustees. Costs are debited to the client; the bank retains a handling margin. ' + H.dur(20)) +
        '<form data-form="entity" autocomplete="off">' +
        panel('Beneficial owner', '<table class="frm"><tr><th>Client <i class="req">*</i></th><td>' + H.clientsSelect('client', q.c) + '</td></tr></table>', { icon: 'user' }) +
        panel('Type and jurisdiction', grid(['', 'Form', 'Agent / trustee', { t: 'Set-up', num: true }, { t: 'Annual', num: true }, 'Shielding'], jrows), { icon: 'building', flush: true }) +
        panel('Details', '<table class="frm"><tr><th>Name <i class="req">*</i></th><td><input name="name" class="inp req" size="40"> ' + btn('Suggest name', 'entsuggest', '', 'sm') + '</td></tr>' +
          '<tr><th>Bank account</th><td><label><input type="checkbox" name="withAccount" checked> Open current account in the name of the structure in</label> ' + H.sel('name="ccy"', G.currencies(), 'USD') + '</td></tr></table>' +
          '<div class="btnbar"><button type="submit" class="btn def">Set up</button></div>', { icon: 'doc' }) + '</form>' +
        H.note('Insurance wrappers and companies keep EU residents outside the EU savings tax (2005). Trusts give the strongest shielding. After 2009, new structures for undeclared clients count as a "special service".')
    };
  };
  V.cards = function () {
    const s = H.S();
    const rows = s.cards.filter(function (x) { return x.status === 'active'; }).map(function (x) {
      return [x.id, H.cref(G.client(x.client)), e(x.issuer), 'CHF ' + U.fmt(x.limit, 0), U.fmtDate(x.opened), btn('Cancel', 'cardcancel', ' data-id="' + x.id + '"', 'sm')];
    });
    return {
      mod: 'structures', crumbs: [['Structures', '#/structures'], ['Offshore cards']], title: 'Offshore cards',
      html: H.title('Offshore credit cards', '[SGS-0300]', 'Cards issued by our correspondent in Nassau, settled from Swiss accounts.') +
        grid(['Card', 'Client', 'Issuer', 'Limit', 'Since', ''], rows, { empty: 'No cards issued.' })
    };
  };

  /* ---------- Organisation ---------- */
  V.staff = function () {
    const s = H.S();
    const f = H.f('staff');
    const list = s.staff.filter(function (x) { return f.all ? true : x.status === 'active'; });
    const payroll = G.payroll();
    const rows = list.map(function (x) {
      const R = D.ROLES[x.role];
      const ml = G.moraleLabel(x.morale);
      let load = '';
      if (x.role === 'rm') { const l = G.rmLoad(x), cap = G.rmCapacity(x); load = l + ' / ' + cap + ' clients' + (l > cap ? ' ' + st('bad', 'overloaded') : ''); }
      const ratio = x.salary / G.marketSalary(x.role, x.skill);
      return { cls: x.status !== 'active' ? 'closed' : '', cells: ['<b>' + e(x.name) + '</b><br><span class="muted">' + e(x.title || R.label) + '</span>', e(R.short), H.stars(x.skill), x.known && x.known.integrity ? H.stars(x.integrity) : '<span class="muted">unknown</span>',
        x.status === 'active' ? st(ml.cls, ml.label) + ' <span class="muted">(' + U.fmt(x.morale, 0) + ')</span>' : st('mod', x.status), 'CHF ' + U.fmt(x.salary, 0) + '<br><span class="small ' + (ratio < 0.95 ? 'neg' : 'muted') + '">' + U.fmt(ratio * 100, 0) + '% of market</span>', load + (x.absentUntil && x.absentUntil >= s.date ? '<br>' + st('mod', 'absent until ' + U.fmtDate(x.absentUntil)) : ''),
        x.status === 'active' ? '<span class="nowrap">' + btn('Manage', 'staffdlg', ' data-id="' + x.id + '"', 'sm def') + '</span>' : (x.left ? U.fmtDate(x.left) : '')] };
    });
    const ci = [['Relationship managers', G.activeStaff('rm').length], ['Compliance capacity (alerts/day)', G.complianceCapacity()], ['Back-office capacity (bookings/day)', G.opsCapacity() + ' <span class="muted">(today ' + s.today.ops + ')</span>'], ['IT security level', G.securityLevel()], ['Desks used', G.activeStaff().length + ' / ' + G.seats()], ['Payroll p.a.', 'CHF ' + U.fmt(payroll, 0) + ' <span class="muted">+15% social charges</span>']];
    return {
      mod: 'org', crumbs: [['Organisation'], ['Staff']], title: 'Staff',
      html: H.title(tr('Staff (Personal)', 'Staff'), '[ORG-0100]', 'Morale depends on pay against market, workload, overtime and scandals. Unhappy staff resign and take clients with them, or worse.') +
        '<div class="cols"><div class="col-l">' + H.filter('<label><input type="checkbox" data-filterchk="staff.all"' + (f.all ? ' checked' : '') + '> show former staff</label> &nbsp; ' + btn(ico('plus') + ' Recruitment', 'go', ' data-href="#/org/recruit"', 'sm')) +
        grid(['Employee', 'Function', 'Skill', 'Integrity', 'Morale', { t: 'Salary', num: true }, 'Workload', ''], rows) + '</div><div class="col-r">' +
        panel('Capacities', kv(ci), { icon: 'chart' }) + '</div></div>'
    };
  };
  V.staffDialog = function (x) {
    const s = H.S();
    const R = D.ROLES[x.role];
    return kv([['Function', e(x.title || R.label)], ['Employed since', U.fmtDate(x.hired)], ['Skill', H.stars(x.skill)], ['Integrity', x.known && x.known.integrity ? H.stars(x.integrity) : '<span class="muted">unknown (background check CHF 3,000)</span>'],
      ['Morale', U.fmt(x.morale, 0) + ' – ' + G.moraleLabel(x.morale).label], ['Salary', 'CHF ' + U.fmt(x.salary, 0) + ' (market for this skill: CHF ' + U.fmt(G.marketSalary(x.role, x.skill), 0) + ')'],
      x.desk ? ['Desk', x.desk.map(function (c) { return G.cname(c); }).join(', ')] : ['', '']], 'dlgkv') +
      '<form id="staffform"><fieldset class="box"><legend>Action</legend>' +
      '<label class="opt"><input type="radio" name="sa" value="raise" checked> Salary increase <select name="pct" class="inp"><option>5</option><option selected>10</option><option>20</option></select> % ' + H.dur(10) + '</label>' +
      '<label class="opt"><input type="radio" name="sa" value="bonus"> One-off bonus CHF <input name="bonus" class="inp num" size="9" value="' + Math.round(x.salary * 0.1 / 1000) * 1000 + '"> ' + H.dur(5) + '</label>' +
      '<label class="opt"><input type="radio" name="sa" value="train"' + (x.skill >= 5 ? ' disabled' : '') + '> Training course (CHF 12,000, 3 days absent, 60% chance of +1 skill) ' + H.dur(5) + '</label>' +
      '<label class="opt"><input type="radio" name="sa" value="vet"> Background check (CHF 3,000), shows integrity ' + H.dur(10) + '</label>' +
      '<label class="opt"><input type="radio" name="sa" value="fire"> <span class="neg">Dismiss</span> (severance of six months\' salary) ' + H.dur(20) + '</label>' +
      '</fieldset></form>';
  };
  V.recruit = function () {
    const s = H.S();
    const rows = s.candidates.map(function (c) {
      return ['<b>' + e(c.name) + '</b><br><span class="muted">currently ' + e(c.from) + '</span>', e(c.title), H.stars(c.skill), 'CHF ' + U.fmt(c.salary, 0), e(c.hints || ''), btn('Hire', 'hire', ' data-id="' + c.id + '"', 'sm def')];
    });
    return {
      mod: 'org', crumbs: [['Organisation', '#/org/staff'], ['Recruitment']], title: 'Recruitment',
      html: H.title(tr('Recruitment (Stellenbewerbungen)', 'Recruitment'), '[ORG-0200]', 'New applications arrive at the beginning of each month via our headhunter (fee 20% of first-year salary). Interview and hiring ' + H.dur(30)) +
        grid(['Applicant', 'Position', 'Skill', { t: 'Salary', num: true }, 'Remarks', ''], rows, { empty: 'No applications at the moment.' }) +
        H.note('Integrity cannot be seen at hiring; references give a hint, and a background check after hiring shows it. Staff with low integrity and access to client data are the usual source of data theft.')
    };
  };
  V.branches = function () {
    const s = H.S();
    const rows = Object.keys(D.LOCATIONS).map(function (k) {
      const L = D.LOCATIONS[k];
      const open = !!s.branches[k];
      const avail = G.locationAvailable(k);
      return ['<b>' + e(L.name) + '</b><br><span class="muted">' + e(L.note || '') + '</span>', { HQ: 'Head office', branch: 'Branch', rep: 'Rep. office', sub: 'Subsidiary' }[L.kind], L.kind === 'sub' ? 'CHF ' + U.fmt(L.setup, 0) + ' capital' : 'CHF ' + U.fmt(L.setup, 0), 'CHF ' + U.fmt(L.daily * 250, 0), (L.seats || 0) + ' desks' + (L.boxes ? ', ' + L.boxes + ' boxes' : ''),
        open ? st('ok', 'open since ' + U.fmtDate(s.branches[k].opened).slice(-4)) : avail ? st('mod', 'not open') : st('mod', 'from ' + L.from.slice(0, 4)),
        L.kind === 'HQ' ? '' : open ? btn('Close', 'closeloc', ' data-key="' + k + '"', 'sm') : avail ? btn('Open', 'openloc', ' data-key="' + k + '"', 'sm def') : ''];
    });
    return {
      mod: 'org', crumbs: [['Organisation', '#/org/staff'], ['Branches & offices']], title: 'Branches & offices',
      html: H.title('Branches, representative offices and booking centres', '[ORG-0300]', 'Each office increases new business; branches add desks and vault space. Opening ' + H.dur(60)) +
        grid(['Location', 'Type', { t: 'Investment', num: true }, { t: 'Running cost p.a.', num: true }, 'Capacity', 'Status', ''], rows) +
        panel('Vault', '<p>' + G.boxesUsed() + ' of ' + G.vaultCapacity() + ' safe-deposit boxes rented. <a href="#/vault">Vault plan ›</a></p>', { icon: 'lock' })
    };
  };
  V.corr = function () {
    const s = H.S();
    return {
      mod: 'org', crumbs: [['Organisation', '#/org/staff'], ['Correspondent banks']], title: 'Correspondent banks',
      html: H.title(tr('Correspondent banks (Korrespondenzbanken)', 'Correspondent banks'), '[ORG-0400]') +
        panel('US dollar clearing', kv([['Correspondent', e(s.corr.name)], ['Status', s.corr.status === 'active' ? st('ok', 'active') : s.corr.status === 'notice' ? st('warn', 'terminated with effect from ' + U.fmtDate(s.corr.until)) : st('bad', 'terminated, no USD payments possible')], ['Surcharge per payment', 'CHF ' + U.fmt(s.corr.fee || 0, 0)]]) +
          (s.corr.status !== 'active' ? '<div class="btnbar left">' + btn('Search for a new correspondent (CHF 150,000)', 'findcorr', '', 'def') + ' ' + H.dur(60) + '</div>' : ''), { icon: 'building' }) +
        panel('Other currencies', kv([['EUR', 'Niederrheinische Handelsbank AG, Düsseldorf (TARGET)'], ['GBP', 'Hanover Square Bank plc, London'], ['JPY', 'via Kowloon Commercial Bank Ltd., Hong Kong']]), { icon: 'list' }) +
        H.note('US banks drop foreign private banks when the IRS and the Department of Justice show interest in them. Without dollar clearing you cannot pay or receive US dollars.')
    };
  };
  V.acquisitions = function () {
    const s = H.S();
    const rows = s.targets.map(function (t) {
      return ['<b>' + e(t.name) + '</b>', 'CHF ' + U.fmtMio(t.aum), String(t.n), 'CHF ' + U.fmt(t.price, 0), t.dd ? 'PEP clients: ' + t.hidden.pep + '<br>US clients: ' + t.hidden.us + '<br>Files without Form A: ' + t.hidden.weak : '<span class="muted">not examined</span>', U.fmtDate(t.expires),
        '<span class="nowrap">' + (t.dd ? '' : btn('Due diligence (CHF 250,000)', 'dd', ' data-id="' + t.id + '"', 'sm')) + btn('Acquire', 'acquire', ' data-id="' + t.id + '"', 'sm def') + '</span>'];
    });
    return {
      mod: 'org', crumbs: [['Organisation', '#/org/staff'], ['Acquisitions']], title: 'Acquisitions',
      html: H.title(tr('Acquisitions (Übernahmen)', 'Acquisitions'), '[ORG-0500]', 'Banks for sale, offered by Hottinger Corporate Finance. Due diligence ' + H.dur(30) + ' · acquisition ' + H.dur(60)) +
        grid(['Bank', { t: 'Assets', num: true }, { t: 'Clients', num: true }, { t: 'Price', num: true }, 'Due diligence', 'Offer until', ''], rows, { empty: 'No banks for sale at the moment.' }) +
        H.note('Buying a bank brings clients and a relationship manager at once, along with whatever the previous owners kept in their files.')
    };
  };
  V.pricing = function () {
    const s = H.S();
    const p = s.pricing;
    return {
      mod: 'org', crumbs: [['Organisation', '#/org/staff'], ['Products & pricing']], title: 'Products & pricing',
      html: H.title(tr('Products and pricing (Tarife)', 'Products and pricing'), '[ORG-0600]', 'Changes are communicated to clients in writing. ' + H.dur(10)) +
        '<form data-form="pricing">' + panel('Fee schedule', '<table class="frm">' +
          '<tr><th>Management fees</th><td>' + Object.keys(D.FEE_LEVELS).map(function (k) { const L = D.FEE_LEVELS[k]; return '<label class="opt inl"><input type="radio" name="level" value="' + k + '"' + (p.level === k ? ' checked' : '') + '> <b>' + L.label + '</b> (×' + L.mult + ')</label>'; }).join(' ') + '<div class="small muted">Discount: more introductions, happier clients. Premium: more revenue per client, fewer introductions.</div></td></tr>' +
          '<tr><th>Hold mail fee p.a.</th><td>CHF <input name="holdMail" class="inp num" size="7" value="' + p.holdMail + '"></td></tr>' +
          '<tr><th>Card fee p.a.</th><td>CHF <input name="card" class="inp num" size="7" value="' + p.card + '"></td></tr></table>', { icon: 'cash' }) +
        panel('Special services', '<table class="frm"><tr><th>Courier service</th><td><label><input type="checkbox" name="courierOn"' + (p.courierOn ? ' checked' : '') + '> Offer collection of cash abroad</label>, commission <input name="courier" class="inp num" size="4" value="' + U.fmt(p.courier * 100, 1) + '"> %<div class="small muted">Brings large cash inflows from Italian, French and German clients. Requires a courier; each trip carries a risk of arrest.</div></td></tr></table>' +
          '<div class="btnbar"><button class="btn def" type="submit">Save</button></div>', { icon: 'plane' }) + '</form>'
    };
  };

  /* ---------- Berichte ---------- */
  V.pl = function () {
    const s = H.S();
    const y = s.bank.ytd;
    const rev = G.revenueYTD(), cost = G.costYTD();
    const year = s.date.slice(0, 4);
    const line = function (label, v, neg) { return [label, U.fmt(neg ? -v : v)]; };
    const rows = [
      { cls: 'grp', cells: ['<b>Revenue</b>', ''] },
      line('Management fees (accrued)', y.fees), line('Commissions (payments, cash, brokerage, products)', y.comm), line('Interest result (deposits, loans, money market)', y.interest),
      line('Foreign exchange and precious metals margin', y.fx), line('House fund fees', y.fund), line('Retrocessions from third-party funds', y.retro),
      line('Own-account trading', y.trading), line('Other (structures, acquisitions)', y.other),
      { cls: 'sum', cells: ['<b>Total revenue</b>', '<b>' + U.fmt(rev) + '</b>'] },
      { cls: 'grp', cells: ['<b>Expenses</b>', ''] },
      line('Personnel (salaries, bonuses, social charges)', y.staff, true), line('Premises and IT', y.premises, true), line('Travel and acquisition', y.travel, true),
      line('Legal, audit and consulting', y.legal, true), line('Lobbying', y.lobby, true), line('Losses and compensation', y.losses, true),
      { cls: 'sum', cells: ['<b>Total expenses</b>', '<b>' + U.fmt(-cost) + '</b>'] },
      { cls: 'tot', cells: ['<b>Net profit ' + year + ' (to date)</b>', '<b>' + num(rev - cost) + '</b>'] }
    ];
    const ann = s.annual.map(function (a) { return [a.year, U.fmt(a.rev, 0), U.fmt(a.cost, 0), num(a.profit, 0), U.fmtMio(a.aum), String(a.clients || ''), U.fmtMio(a.capital)]; });
    return {
      mod: 'reports', crumbs: [['Reports'], ['Profit & loss']], title: 'Profit & loss',
      html: H.title(tr('Profit and loss statement (Erfolgsrechnung) ', 'Profit and loss statement ') + year, '[REP-0100]', 'Period 01.01.' + year + ' – ' + U.fmtDate(s.date) + ', in CHF') +
        '<div class="cols"><div class="col-h">' + panel('Income statement', grid(['Position', { t: 'CHF', num: true }], rows, { cls: 'pl' }), { icon: 'chart', flush: true, tools: btn(ico('print') + ' Print', 'print', '', 'sm') }) +
        '</div><div class="col-h">' + panel('Capital', kv([['Equity capital', 'CHF ' + num(s.bank.capital, 0)], ['Legal minimum (Art. 4 BankV)', 'CHF ' + U.fmt(D.MIN_CAPITAL, 0)], ['Headroom', 'CHF ' + num(s.bank.capital - D.MIN_CAPITAL, 0)]]), { icon: 'building' }) +
        panel('Annual results', grid(['Year', { t: 'Revenue', num: true }, { t: 'Expenses', num: true }, { t: 'Profit', num: true }, { t: 'AuM', num: true }, { t: 'Clients', num: true }, { t: 'Capital', num: true }], ann, { empty: 'First year under your management.' }), { icon: 'list', flush: true }) + '</div></div>'
    };
  };
  V.aumReport = function () {
    const s = H.S();
    const by = {}, byC = {}, byR = {}, byT = { undeclared: 0, declared: 0 };
    let tot = 0;
    G.activeClients().forEach(function (c) {
      const v = G.clientAUM(c.id);
      tot += v;
      by[c.dom] = by[c.dom] || { n: 0, v: 0, rev: 0 };
      by[c.dom].n++; by[c.dom].v += v; by[c.dom].rev += v * G.effectiveFee(c);
      byR[c.risk] = byR[c.risk] || { n: 0, v: 0 };
      byR[c.risk].n++; byR[c.risk].v += v;
      byT[c.declared >= 1 ? 'declared' : 'undeclared'] += v;
      G.clientAccounts(c.id).forEach(function (a) { byC[a.ccy] = (byC[a.ccy] || 0) + G.valueCHF(a); });
    });
    const pct = function (v) { return tot ? U.fmt(v / tot * 100, 1) + '%' : '–'; };
    const rows = Object.keys(by).sort(function (a, b) { return by[b].v - by[a].v; }).map(function (k) {
      const a = D.COUNTRIES[k].auth;
      return [H.cty(k) + ' ' + e(G.cname(k)), String(by[k].n), U.fmt(by[k].v, 0), pct(by[k].v), U.fmt(by[k].rev / (by[k].v || 1) * 100, 2) + '%', a ? H.lvl(s.heat[a]) : '<span class="muted">–</span>'];
    });
    return {
      mod: 'reports', crumbs: [['Reports'], ['AuM by domicile']], title: 'AuM by domicile',
      html: H.title('Assets under management by domicile', '[REP-0200]', 'Valuation at current rates, CHF') +
        panel('By client domicile', grid(['Domicile', { t: 'Clients', num: true }, { t: 'AuM CHF', num: true }, { t: 'Share', num: true }, { t: 'Avg. fee', num: true }, 'Home exposure'], rows, { foot: ['<b>Total</b>', '', '<b>' + U.fmt(tot, 0) + '</b>', '100.0%', '', ''] }), { icon: 'chart', flush: true }) +
        '<div class="cols"><div class="col-h">' + panel('By currency', grid(['Currency', { t: 'CHF equivalent', num: true }, { t: 'Share', num: true }], Object.keys(byC).sort(function (a, b) { return byC[b] - byC[a]; }).map(function (k) { return [H.ccyL(k), U.fmt(byC[k], 0), pct(byC[k])]; })), { icon: 'list', flush: true }) +
        '</div><div class="col-h">' + panel('By risk class', grid(['Risk class', { t: 'Clients', num: true }, { t: 'AuM CHF', num: true }, { t: 'Share', num: true }], Object.keys(byR).map(function (k) { return [H.riskSt(k), String(byR[k].n), U.fmt(byR[k].v, 0), pct(byR[k].v)]; })), { icon: 'shield', flush: true }) +
        panel('By tax status (RM estimate)', grid(['Status', { t: 'AuM CHF', num: true }, { t: 'Share', num: true }], [[st('bad', 'Undeclared'), U.fmt(byT.undeclared, 0), pct(byT.undeclared)], [st('ok', 'Declared'), U.fmt(byT.declared, 0), pct(byT.declared)]]), { icon: 'flag', flush: true }) + '</div></div>'
    };
  };
  V.journal = function () {
    const s = H.S();
    const f = H.f('journal');
    const kinds = { ext: 'External flows', cash: 'Cash', fee: 'Fees & commissions', int: 'Internal transfers' };
    const list = s.tx.filter(function (t) {
      if (t.kind === 'open') return false;
      if (f.k === 'ext') return t.ext;
      if (f.k === 'cash') return t.kind === 'cash-in' || t.kind === 'cash-out';
      if (f.k === 'fee') return t.kind === 'fee';
      if (f.k === 'int') return t.kind === 'int-in' || t.kind === 'int-out';
      return true;
    }).slice(-200).reverse();
    const rows = list.map(function (t) {
      return [U.fmtDate(t.d) + ' <span class="muted">' + U.fmtTime(t.t) + '</span>', t.id, '<a href="#/account/' + t.acc + '">' + t.acc + '</a>', e(t.text), num(t.amt, t.ccy === 'XAU' ? 3 : t.ccy === 'ITL' ? 0 : 2), H.ccyL(t.ccy), num(t.chf, 0)];
    });
    return {
      mod: 'reports', crumbs: [['Reports'], ['Journal']], title: 'Journal',
      html: H.title(tr('Booking journal (Journal)', 'Booking journal'), '[REP-0300]', 'Latest 200 bookings') +
        H.filter('Type ' + H.sel('data-filter="journal.k"', [['', 'all bookings']].concat(Object.keys(kinds).map(function (k) { return [k, kinds[k]]; })), f.k || '')) +
        grid(['Date', 'Booking no.', 'Account', 'Text', { t: 'Amount', num: true }, 'Ccy', { t: 'CHF', num: true }], rows)
    };
  };
})(window.PBS);
