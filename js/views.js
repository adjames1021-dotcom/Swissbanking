/* PBS/Web 4.2 – Masken (Darstellung). Views only read state; changes go through PBS.Game. */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U;
  const e = U.esc;
  const V = PBS.Views = {};
  function S() { return G.state; }
  function UIF(key) { PBS.UI.f[key] = PBS.UI.f[key] || {}; return PBS.UI.f[key]; }

  /* ---------- Bausteine ---------- */
  function ico(n) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  V.ico = ico;
  function dec(ccy) { return ccy === 'XAU' ? 3 : 2; }
  function ccyL(ccy) { return ccy === 'XAU' ? 'XAU&nbsp;oz' : ccy; }
  function num(n, d) { return '<span class="' + (n < -0.0005 ? 'neg' : '') + '">' + U.fmt(n, d === undefined ? 2 : d) + '</span>'; }
  function chg(n, d, suffix) {
    if (Math.abs(n) < 0.0005) return '<span class="flat">±0' + (suffix || '') + '</span>';
    return '<span class="' + (n < 0 ? 'neg' : 'pos') + '">' + (n > 0 ? '+' : '') + U.fmt(n, d) + (suffix || '') + '</span>';
  }
  // Für Risikogrössen: Anstieg ist schlecht (rot), Rückgang gut (grün)
  function chgRisk(n, d) {
    if (Math.abs(n) < 0.0005) return '<span class="flat">±0</span>';
    return '<span class="' + (n > 0 ? 'neg' : 'pos') + '">' + (n > 0 ? '+' : '') + U.fmt(n, d) + '</span>';
  }
  function title(t, code, sub) {
    return '<div class="ptitle"><h1>' + t + '</h1><span class="scode">' + code + '</span></div>' + (sub ? '<div class="psub">' + sub + '</div>' : '');
  }
  function panel(t, body, o) {
    o = o || {};
    return '<div class="panel' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '><div class="ph"><span>' + (o.icon ? ico(o.icon) : '') + t + '</span>' +
      (o.tools ? '<span class="tools">' + o.tools + '</span>' : '') + '</div><div class="pb' + (o.flush ? ' flush' : '') + '">' + body + '</div></div>';
  }
  function grid(head, rows, o) {
    o = o || {};
    const h = head.map(function (c) {
      c = typeof c === 'string' ? { t: c } : c;
      return '<th' + (c.num ? ' class="num"' : '') + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + c.t + '</th>';
    }).join('');
    const nums = head.map(function (c) { return typeof c === 'object' && c.num; });
    let b = rows.map(function (r) {
      const cls = r.cls ? ' class="' + r.cls + '"' : '';
      const cells = (r.cells || r).map(function (v, i) { return '<td' + (nums[i] ? ' class="num"' : '') + '>' + (v === undefined || v === null ? '' : v) + '</td>'; }).join('');
      return '<tr' + cls + '>' + cells + '</tr>';
    }).join('');
    if (!rows.length) b = '<tr><td colspan="' + head.length + '" class="empty">' + (o.empty || 'No entries found.') + '</td></tr>';
    const f = o.foot ? '<tfoot><tr>' + o.foot.map(function (v, i) { return '<td' + (nums[i] ? ' class="num"' : '') + '>' + v + '</td>'; }).join('') + '</tr></tfoot>' : '';
    return '<table class="grid' + (o.cls ? ' ' + o.cls : '') + '"><thead><tr>' + h + '</tr></thead><tbody>' + b + '</tbody>' + f + '</table>';
  }
  function kv(pairs, cls) {
    return '<table class="kv' + (cls ? ' ' + cls : '') + '">' + pairs.map(function (p) { return '<tr><th>' + p[0] + '</th><td>' + p[1] + '</td></tr>'; }).join('') + '</table>';
  }
  function btn(label, act, attrs, cls) {
    return '<button type="button" class="btn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (attrs || '') + '>' + label + '</button>';
  }
  function st(cls, label) { return '<span class="st st-' + cls + '"><i></i>' + label + '</span>'; }
  function lvl(v) { const l = G.level(v); return st(l.cls, l.label); }
  function cref(c, withName) {
    if (!c) return '';
    return '<a href="#/client/' + c.id + '">' + c.id + '</a>&nbsp;<b>' + e(c.rubrik) + '</b>' + (withName ? '<br><span class="muted">' + e(c.name) + '</span>' : '');
  }
  function accLabel(a) {
    return { CUR: 'Current account (Kontokorrent)', DEP: 'Securities portfolio (Depot)', MET: 'Precious metals (Edelmetall)' }[a.type];
  }
  function accShort(a) { return { CUR: 'Kontokorrent', DEP: 'Depot', MET: 'Edelmetall' }[a.type]; }
  function riskSt(r) { return r === 'PEP' ? st('bad', 'PEP') : r === 'Increased' ? st('warn', 'Increased') : st('ok', 'Normal'); }
  function cty(c) { return '<span class="cc">' + e(c) + '</span>'; }
  function clientsSelect(name, sel, filter) {
    const list = G.activeClients().filter(filter || function () { return true; });
    return '<select name="' + name + '" class="inp">' + '<option value="">– select –</option>' + list.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + c.id + ' ' + e(c.rubrik) + ' – ' + e(c.name) + '</option>';
    }).join('') + '</select>';
  }
  function accountOptions(filter, sel) {
    const s = S();
    return G.activeClients().map(function (c) {
      const accs = G.clientAccounts(c.id).filter(filter);
      if (!accs.length) return '';
      return '<optgroup label="' + c.id + ' ' + e(c.rubrik) + '">' + accs.map(function (a) {
        return '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + a.id + ' · ' + a.ccy + ' · ' + accShort(a) +
          (a.entity ? ' · ' + e(G.entity(a.entity).name) : '') + ' · ' + U.fmt(a.bal, dec(a.ccy)) + '</option>';
      }).join('') + '</optgroup>';
    }).join('') + (s ? '' : '');
  }
  V.accountOptions = accountOptions;
  function bigTime() { const s = S(); return U.fmtDate(s.date) + ' ' + U.fmtTime(s.clock); }

  /* ---------- Übersicht ---------- */
  V.overview = function () {
    const s = S();
    const aum = G.totalAUM();
    const last = s.hist[s.hist.length - 1];
    const prev = last ? last.aum : aum;
    const y = s.bank.ytd;
    const rev = y.fees + y.comm + y.fx + y.other;
    const cost = y.opex + y.travel + y.legal;
    const nClients = G.activeClients().length;
    const dl = s.discretion >= 65 ? st('ok', 'Strong') : s.discretion >= 45 ? st('mod', 'Fair') : st('bad', 'Weak');
    const kf = grid(['Key figure', { t: 'Value', num: true }, { t: 'Remark', num: true }], [
      ['Assets under management (Verwaltete Vermögen)', 'CHF ' + U.fmt(aum, 0), chg((aum - prev) / 1e6, 2, ' Mio. vs. close')],
      ['Net new money (Neugeld) – ' + U.monthName(s.date), 'CHF ' + num(s.nnm.month, 0), ''],
      ['Net new money – year to date', 'CHF ' + num(s.nnm.ytd, 0), ''],
      ['Revenue – year to date', 'CHF ' + U.fmt(rev, 0), ''],
      ['Net profit – year to date', 'CHF ' + num(rev - cost, 0), ''],
      ['Equity capital (Eigenmittel)', 'CHF ' + num(s.bank.capital, 0), '<span class="muted">min. CHF 10 Mio.</span>'],
      ['Client relationships', String(nClients), '<span class="muted">' + s.entities.filter(function (x) { return !x.dissolved; }).length + ' domiciliary cos.</span>'],
      ['Client confidence (discretion index)', U.fmt(s.discretion, 0), dl]
    ], { cls: 'kf' });

    const ext = s.tx.filter(function (t) { return t.ext && t.kind !== 'open'; }).slice(-9).reverse();
    const recent = grid(['Date', 'Account', 'Text', { t: 'Amount', num: true }, 'Ccy'], ext.map(function (t) {
      return [U.fmtDate(t.d), '<a href="#/account/' + t.acc + '">' + t.acc + '</a>', e(t.text), num(t.amt, dec(t.ccy)), ccyL(t.ccy)];
    }), { empty: 'No bookings.' });

    const pend = [];
    const pp = G.pendingPayments().length, cc = s.counter.length, oa = G.openAlerts().length, od = G.overdueAlerts().length;
    const ar = G.actionRequired().length, ur = G.unread();
    if (cc) pend.push([ico('cash'), '<a href="#/pay/cash">' + cc + ' client(s) waiting at the cash desk</a>', st('warn', 'Today')]);
    if (pp) pend.push([ico('queue'), '<a href="#/pay/queue">' + pp + ' payment(s) awaiting release</a>', st('mod', '4-eyes')]);
    if (oa) pend.push([ico('warn'), '<a href="#/compliance/alerts">' + oa + ' open compliance alert(s)</a>', od ? st('bad', od + ' overdue') : st('ok', 'in time')]);
    if (ar) pend.push([ico('mail'), '<a href="#/inbox">' + ar + ' decision(s) required in mail</a>', st('warn', 'Open')]);
    if (ur) pend.push([ico('mail'), '<a href="#/inbox">' + ur + ' unread message(s)</a>', '']);
    if (s.trip) pend.push([ico('plane'), 'Acquisition trip: ' + e(G.cname(s.trip.c)) + ' until ' + U.fmtDate(s.trip.until), '']);
    const pendHtml = pend.length ? '<table class="plist">' + pend.map(function (p) { return '<tr><td class="i">' + p[0] + '</td><td>' + p[1] + '</td><td class="r">' + p[2] + '</td></tr>'; }).join('') + '</table>' :
      '<div class="muted pad">No pending items. Run the end-of-day batch when ready.</div>';

    const risk = '<table class="risk compact">' + ['EBK'].concat(G.FOREIGN).map(function (k) {
      const v = s.heat[k];
      return '<tr><td class="rk">' + e(D.AUTH[k].short) + '</td><td class="rb"><div class="bar"><div class="fill lv-' + G.level(v).cls + '" style="width:' + v.toFixed(1) + '%"></div></div></td><td class="num">' + U.fmt(v, 0) + '</td><td>' + lvl(v) + '</td></tr>';
    }).join('') + '</table>';

    const mkt = grid(['Instrument', { t: 'Last', num: true }, { t: '%', num: true }], ['SMI', 'USD', 'EUR', 'GBP', 'XAU'].map(function (k) {
      const p = (s.market[k] / s.prevMarket[k] - 1) * 100;
      return [D.MARKET_LABEL[k][0], U.fmt(s.market[k], k === 'SMI' || k === 'XAU' ? 2 : 4), chg(p, 2)];
    }), { cls: 'compact' });

    const mails = s.messages.slice(0, 5).map(function (m) {
      return '<tr class="' + (m.read ? '' : 'unread') + '"><td class="i">' + ico(m.type === 'fax' ? 'fax' : m.read ? 'mail-open' : 'mail') + '</td><td><a href="#/inbox/' + m.id + '">' + e(m.subject) + '</a><br><span class="muted">' + e(m.from) + '</span></td><td class="r nowrap">' + U.fmtDate(m.d) + '</td></tr>';
    }).join('');

    return {
      mod: 'overview', crumbs: [['Overview']],
      html: title('Dashboard – Managing Partner', '[UEB-0100]', U.longDate(s.date) + ' · Mandant 001 Zürich') +
        '<div class="cols"><div class="col-l">' +
        panel('Key figures (Kennzahlen) per ' + U.fmtDate(s.date), kf, { icon: 'chart', flush: true }) +
        panel('Assets under management – CHF Mio., last 60 closings', V.aumChart(s.hist.slice(-60)), { icon: 'chart' }) +
        panel('Latest client bookings', recent, { icon: 'list', flush: true, tools: '<a href="#/reports/journal">Journal ›</a>' }) +
        '</div><div class="col-r">' +
        panel('Pending items (Pendenzen)', pendHtml, { icon: 'clock', flush: true }) +
        panel('Risk monitor – exposure indices', risk + '<div class="pad small"><a href="#/compliance">Open risk monitor ›</a></div>', { icon: 'shield', flush: true }) +
        panel('Markets – Telekurs (delayed)', mkt, { icon: 'chart', flush: true, tools: '<a href="#/market">More ›</a>' }) +
        panel('Mail & fax', '<table class="plist">' + mails + '</table>', { icon: 'mail', flush: true, tools: '<a href="#/inbox">Inbox ›</a>' }) +
        '</div></div>'
    };
  };

  // AuM-Verlauf (eine Serie: kein Legendenfeld, Titel nennt die Serie)
  V.aumChart = function (hist) {
    if (hist.length < 2) return '<div class="muted pad">Not enough data.</div>';
    const W = 640, H = 200, pl = 56, pr = 14, pt = 12, pb = 28;
    const vals = hist.map(function (h) { return h.aum / 1e6; });
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const span = Math.max(1, max - min);
    const raw = span / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).find(function (x) { return x >= raw; });
    min = Math.floor((min - span * 0.08) / step) * step;
    max = Math.ceil((max + span * 0.08) / step) * step;
    const x = function (i) { return pl + i * (W - pl - pr) / (hist.length - 1); };
    const y = function (v) { return pt + (max - v) * (H - pt - pb) / (max - min); };
    let g = '';
    for (let v = min; v <= max + step / 2; v += step) {
      g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" class="gl"/>' +
        '<text x="' + (pl - 6) + '" y="' + (y(v) + 3.5).toFixed(1) + '" class="ax" text-anchor="end">' + U.fmt(v, step < 1 ? 1 : 0) + '</text>';
    }
    const every = Math.ceil(hist.length / 6);
    hist.forEach(function (h, i) {
      if (i % every === 0 || i === hist.length - 1) {
        g += '<line x1="' + x(i).toFixed(1) + '" x2="' + x(i).toFixed(1) + '" y1="' + (H - pb) + '" y2="' + (H - pb + 4) + '" class="tk"/>' +
          '<text x="' + x(i).toFixed(1) + '" y="' + (H - pb + 15) + '" class="ax" text-anchor="middle">' + U.fmtDate(h.d).slice(0, 5) + '</text>';
      }
    });
    const pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    const area = 'M' + pl + ',' + (H - pb) + ' L' + pts.join(' L') + ' L' + x(vals.length - 1).toFixed(1) + ',' + (H - pb) + ' Z';
    const data = hist.map(function (h, i) { return [x(i).toFixed(1), y(vals[i]).toFixed(1), U.fmtDate(h.d), U.fmt(vals[i], 2)]; });
    return '<div class="chart" data-points="' + e(JSON.stringify(data)) + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Assets under management, CHF millions">' + g +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '" class="axl"/>' +
      '<path d="' + area + '" class="ar"/><polyline points="' + pts.join(' ') + '" class="ln"/>' +
      '<line class="cx hidden" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '"/><circle class="cd hidden" r="4"/>' +
      '<rect class="hit" x="' + pl + '" y="' + pt + '" width="' + (W - pl - pr) + '" height="' + (H - pt - pb) + '"/></svg>' +
      '<div class="ctip hidden"></div></div>';
  };

  function spark(arr, w, h) {
    const min = Math.min.apply(null, arr), max = Math.max.apply(null, arr);
    const pts = arr.map(function (v, i) { return (i * (w - 2) / (arr.length - 1) + 1).toFixed(1) + ',' + (h - 1 - (v - min) * (h - 2) / (max - min || 1)).toFixed(1); });
    return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline points="' + pts.join(' ') + '"/></svg>';
  }

  V.market = function () {
    const s = S();
    const rows = ['SMI', 'USD', 'EUR', 'GBP', 'JPY', 'XAU'].map(function (k) {
      const d = k === 'SMI' || k === 'XAU' ? 2 : 4;
      const hist = s.mhist.slice(-30).map(function (m) { return m[k]; });
      const p = (s.market[k] / s.prevMarket[k] - 1) * 100;
      return [D.MARKET_LABEL[k][0], D.MARKET_LABEL[k][1], U.fmt(s.prevMarket[k], d), '<b>' + U.fmt(s.market[k], d) + '</b>', chg(s.market[k] - s.prevMarket[k], d), chg(p, 2, '%'), spark(hist, 110, 22)];
    });
    const goldChf = G.rate('XAU');
    return {
      mod: 'overview', crumbs: [['Overview', '#/overview'], ['Market data']],
      html: title('Market data – Telekurs Investdata', '[MKT-0010]', 'Closing prices ' + U.fmtDate(s.mhist[s.mhist.length - 1].d) + ' · quotes delayed by 15 minutes') +
        panel('Rates and indices', grid(['Instrument', 'Description', { t: 'Prev. close', num: true }, { t: 'Last', num: true }, { t: 'Change', num: true }, { t: 'Change %', num: true }, '30 days'], rows), { icon: 'chart', flush: true }) +
        panel('Derived rates used for valuation', kv([
          ['Fine gold, 1 oz in CHF', 'CHF ' + U.fmt(goldChf)],
          ['Fine gold, 1 kg bar in CHF', 'CHF ' + U.fmt(goldChf * 32.1507, 0)],
          ['FX margin client conversions', U.fmt(D.FX_SPREAD * 100, 2) + '% on payments, 0.25% on internal transfers, 0.60% on metals']
        ]), { icon: 'list' })
    };
  };

  V.trip = function () {
    const s = S();
    const cur = s.trip ? '<div class="note info">' + ico('plane') + ' Trip under way: <b>' + e(G.cname(s.trip.c)) + '</b>, ' + U.fmtDate(s.trip.from) + ' – ' + U.fmtDate(s.trip.until) + '.</div>' : '';
    const rows = D.TRIP_DEST.map(function (t, i) {
      const a = D.COUNTRIES[t.c].auth;
      return ['<input type="radio" name="dest" value="' + t.c + '" id="dest' + i + '"' + (i === 0 ? ' checked' : '') + (s.trip ? ' disabled' : '') + '>',
        '<label for="dest' + i + '"><b>' + e(G.cname(t.c)) + '</b></label>', e(t.city), e(t.note), a ? lvl(s.heat[a]) + ' <span class="muted">' + e(D.AUTH[a].short) + '</span>' : '<span class="muted">–</span>'];
    });
    return {
      mod: 'overview', crumbs: [['Overview', '#/overview'], ['Acquisition trip']],
      html: title('Plan acquisition trip', '[AKQ-0300]', 'Relationship managers visit prospects abroad (5 business days, travel budget CHF 18,000).') + cur +
        '<form data-form="trip">' + panel('Destination', grid(['', 'Country', 'Cities', 'Remarks', 'Local exposure'], rows), { icon: 'plane', flush: true }) +
        '<div class="note">' + ico('info') + ' During the trip, introductions from the destination country become far more frequent. Bankers on foreign soil attract the attention of local authorities; customs checks are possible.</div>' +
        '<div class="btnbar"><button class="btn def" type="submit"' + (s.trip ? ' disabled' : '') + '>Book trip</button></div></form>'
    };
  };

  /* ---------- Kunden ---------- */
  V.clients = function () {
    const s = S();
    const f = UIF('clients');
    const q = (f.q || '').toLowerCase();
    const list = s.clients.filter(function (c) {
      if ((f.st || 'active') !== 'all' && c.status !== (f.st || 'active')) return false;
      if (f.dom && c.dom !== f.dom) return false;
      if (q && (c.id + ' ' + c.rubrik + ' ' + c.name + ' ' + c.city).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    let tot = 0;
    const rows = list.map(function (c) {
      const aum = G.clientAUM(c.id);
      tot += aum;
      const ll = G.loyaltyLabel(c.loyalty);
      return {
        cls: c.status !== 'active' ? 'closed' : '',
        cells: ['<a href="#/client/' + c.id + '">' + c.id + '</a>', '<b>' + e(c.rubrik) + '</b>', e(c.name), cty(c.dom) + ' ' + e(c.city), e(c.rm), riskSt(c.risk),
          c.formA ? st('ok', 'yes') : st('bad', 'missing'), c.holdMail ? st('ok', 'yes') : st('warn', 'no'),
          c.status === 'active' ? U.fmt(aum, 0) : '<span class="muted">closed ' + U.fmtDate(c.closed.d) + '</span>', U.fmt(c.fee * 100, 2) + '%', c.status === 'active' ? st(ll.cls, ll.label) : '']
      };
    });
    const doms = Array.from(new Set(s.clients.map(function (c) { return c.dom; }))).sort();
    const filt = '<div class="filter">Search <input type="text" class="inp" data-filter="clients.q" value="' + e(f.q || '') + '" placeholder="No., codename, name" size="22"> ' +
      'Domicile <select class="inp" data-filter="clients.dom"><option value="">all</option>' + doms.map(function (d) { return '<option' + (f.dom === d ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select> ' +
      'Status <select class="inp" data-filter="clients.st">' + [['active', 'active'], ['closed', 'closed'], ['all', 'all']].map(function (o) { return '<option value="' + o[0] + '"' + ((f.st || 'active') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    return {
      mod: 'clients', crumbs: [['Clients'], ['Client book']],
      html: title('Client book (Kundenstamm)', '[KND-0100]', list.length + ' relationship(s) · numbered relationships are shown with codename (Rubrik)') + filt +
        grid(['Client no.', 'Codename', 'Name', 'Domicile', 'RM', 'Risk', 'Form A', 'Hold mail', { t: 'AuM CHF', num: true }, { t: 'Fee', num: true }, 'Satisfaction'], rows,
          { foot: ['', '', '<b>Total</b>', '', '', '', '', '', '<b>' + U.fmt(tot, 0) + '</b>', '', ''] })
    };
  };

  V.client = function (id, tab) {
    const s = S();
    const c = G.client(id);
    if (!c) return V.notFound('Client ' + id);
    tab = tab || 'master';
    const aum = G.clientAUM(c.id);
    const ents = G.entitiesOf(c.id);
    const active = c.status === 'active';
    const banner = '<div class="cbanner"><div><span class="cno">' + c.id + '</span> <span class="crub">' + e(c.rubrik) + '</span> ' + e(c.name) + '</div>' +
      '<div class="cflags">' + riskSt(c.risk) + ' ' + (c.holdMail ? st('ok', 'Banklagernd') : st('warn', 'Mail to domicile')) + ' ' + (c.formA ? st('ok', 'Form A') : st('bad', 'No Form A')) +
      (active ? '' : ' ' + st('bad', 'CLOSED')) + ' &nbsp; AuM <b>CHF ' + U.fmt(aum, 0) + '</b></div></div>';
    const tabs = [['master', 'Master data'], ['accounts', 'Accounts & positions'], ['tx', 'Transactions'], ['docs', 'Documents'], ['notes', 'File notes (' + c.notes.length + ')']];
    const tabHtml = '<div class="tabs">' + tabs.map(function (t) { return '<a href="#/client/' + c.id + '/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</a>'; }).join('') + '</div>';
    let body = '';
    const accs = s.accounts.filter(function (a) { return a.client === c.id; });

    if (tab === 'master') {
      const ll = G.loyaltyLabel(c.loyalty);
      const decl = c.declared >= 1 ? 'Fully declared' : c.declared > 0 ? 'Partly declared (approx. ' + Math.round(c.declared * 100) + '%)' : 'Not declared';
      const left = panel('Personal data – client profile (KYC)', kv([
        ['Client no. (Stamm-Nr.)', c.id], ['Codename (Rubrik)', '<b>' + e(c.rubrik) + '</b>'], ['Name', e(c.name)],
        ['Date of birth', U.fmtDate(c.born)], ['Nationality', cty(c.nat) + ' ' + e(G.cname(c.nat))], ['Domicile', e(c.city) + ', ' + e(G.cname(c.dom))],
        ['Occupation', e(c.occ)], ['Source of wealth', e(c.sow)], ['Documented total wealth', 'CHF ' + U.fmtMio(c.wealth)],
        ['Relationship manager', e(c.rm)], ['Client since', U.fmtDate(c.since)]
      ]), { icon: 'user' });
      const right = panel('Relationship', kv([
        ['Assets with us', 'CHF ' + U.fmt(aum, 0)], ['Fee rate (all-in) p.a.', U.fmt(c.fee * 100, 2) + '%'],
        ['Revenue p.a. (estimate)', 'CHF ' + U.fmt(aum * c.fee, 0)], ['Accrued fees current quarter', 'CHF ' + U.fmt(c.feeAccrued || 0)],
        ['Satisfaction', active ? st(ll.cls, ll.label) + ' <span class="muted">(' + U.fmt(c.loyalty, 0) + ')</span>' : '–'],
        ['Risk class (GwG)', riskSt(c.risk)], ['Tax status (RM estimate)', c.declared >= 1 ? st('ok', decl) : c.declared > 0 ? st('warn', decl) : st('bad', decl)]
      ]), { icon: 'chart' }) +
        panel('Flags & documents', kv([
          ['Hold mail (banklagernd)', (c.holdMail ? st('ok', 'Agreed') : st('warn', 'Statements mailed to ' + e(c.city))) + (active ? ' ' + btn(c.holdMail ? 'Cancel' : 'Agree hold mail', 'holdmail', ' data-id="' + c.id + '" data-on="' + (c.holdMail ? 0 : 1) + '"', 'sm') : '')],
          ['Form A (beneficial owner)', (c.formA ? st('ok', 'On file since ' + U.fmtDate(c.formA)) : c.formAPending ? st('warn', 'Requested – awaiting signature') : st('bad', 'Missing')) + (active && !c.formA && !c.formAPending ? ' ' + btn('Request', 'forma', ' data-id="' + c.id + '"', 'sm') : '')],
          ['Domiciliary companies', ents.length ? ents.map(function (x) { return e(x.name) + ' <span class="muted">(' + e(D.JURIS[x.jur].label) + ')</span>'; }).join('<br>') : '<span class="muted">none</span>']
        ]), { icon: 'doc' });
      const acts = active ? '<div class="btnbar left">' + btn(ico('plus') + ' Open account', 'openacc', ' data-id="' + c.id + '"') + btn(ico('doc') + ' New payment', 'go', ' data-href="#/pay/new?c=' + c.id + '"') +
        btn(ico('swap') + ' Internal transfer', 'go', ' data-href="#/pay/transfer?c=' + c.id + '"') + btn(ico('building') + ' Incorporate company', 'go', ' data-href="#/companies/new?c=' + c.id + '"') +
        btn(ico('pen') + ' File note', 'go', ' data-href="#/client/' + c.id + '/notes"') + '<span class="sp"></span>' + btn('Terminate relationship', 'offboard', ' data-id="' + c.id + '"', 'danger') + '</div>' : '';
      body = acts + '<div class="cols"><div class="col-h">' + left + '</div><div class="col-h">' + right + '</div></div>' +
        (c.notes.length ? panel('Latest file notes', c.notes.slice(0, 3).map(function (n) { return '<div class="fn"><b>' + U.fmtDate(n.d) + '</b> · ' + e(n.who) + '<br>' + e(n.text) + '</div>'; }).join(''), { icon: 'pen' }) : '');
    } else if (tab === 'accounts') {
      let tot = 0;
      const rows = accs.map(function (a) {
        const v = G.valueCHF(a);
        if (!a.closed) tot += v;
        return { cls: a.closed ? 'closed' : '', cells: ['<a href="#/account/' + a.id + '">' + a.id + '</a>', e(G.holderName(a)), accLabel(a), ccyL(a.ccy), num(a.bal, dec(a.ccy)), a.ccy === 'CHF' ? '1.0000' : U.fmt(G.rate(a.ccy), 4), U.fmt(v, 0), U.fmtDate(a.opened), a.closed ? 'closed' : '<a href="#/account/' + a.id + '">Statement</a>'] };
      });
      body = panel('Accounts and positions', grid(['Account', 'Holder', 'Type', 'Ccy', { t: 'Balance', num: true }, { t: 'Rate', num: true }, { t: 'CHF equivalent', num: true }, 'Opened', ''], rows,
        { foot: ['', '', '', '', '', '<b>Total</b>', '<b>' + U.fmt(tot, 0) + '</b>', '', ''] }), { icon: 'folder', flush: true, tools: active ? btn('Open account', 'openacc', ' data-id="' + c.id + '"', 'sm') : '' });
    } else if (tab === 'tx') {
      const txs = s.tx.filter(function (t) { return t.client === c.id && t.kind !== 'open'; }).slice(-80).reverse();
      body = panel('Transactions (latest 80)', grid(['Date', 'Valuta', 'Account', 'Text', { t: 'Debit', num: true }, { t: 'Credit', num: true }, 'Ccy'], txs.map(function (t) {
        return [U.fmtDate(t.d), U.fmtDate(t.val), '<a href="#/account/' + t.acc + '">' + t.acc + '</a>', e(t.text), t.amt < 0 ? U.fmt(-t.amt, dec(t.ccy)) : '', t.amt >= 0 ? U.fmt(t.amt, dec(t.ccy)) : '', ccyL(t.ccy)];
      })), { icon: 'list', flush: true });
    } else if (tab === 'docs') {
      const docs = [
        ['Account opening agreement and general terms', U.fmtDate(c.since), st('ok', 'on file')],
        ['Specimen signature card', U.fmtDate(c.since), st('ok', 'on file')],
        ['Form A – declaration of beneficial owner (VSB)', c.formA ? U.fmtDate(c.formA) : '–', c.formA ? st('ok', 'on file') : st('bad', 'missing')],
        ['Hold-mail agreement (Banklagernd-Vereinbarung)', c.holdMail ? U.fmtDate(c.since) : '–', c.holdMail ? st('ok', 'on file') : st('warn', 'none')],
        ['Copy of passport', U.fmtDate(c.since), st('ok', 'on file')],
        ['Client profile (KYC) – last review', '15.11.2002', st('ok', 'on file')]
      ];
      ents.forEach(function (x) {
        docs.push(['Certificate of incorporation – ' + e(x.name), U.fmtDate(x.inc), st('ok', 'on file')]);
        docs.push(['Board resolution / power of attorney – ' + e(x.name), U.fmtDate(x.inc), st('ok', 'on file')]);
      });
      if (c.risk === 'PEP') docs.push(['Senior-management approval of PEP relationship', s.date >= '2003-07-01' ? '–' : 'n/a', s.date >= '2003-07-01' ? st('warn', 'not documented') : st('mod', 'not yet required')]);
      body = panel('Documents in the client file (Dossier)', grid(['Document', 'Date', 'Status'], docs), { icon: 'doc', flush: true });
    } else {
      body = (active ? '<form data-form="note" data-id="' + c.id + '">' + panel('New file note (Gesprächsnotiz)', '<textarea name="text" class="inp" rows="3" style="width:100%" placeholder="Content of conversation, instructions, observations…"></textarea><div class="btnbar"><button class="btn def" type="submit">Save note</button></div>', { icon: 'pen' }) + '</form>' : '') +
        panel('File notes', c.notes.length ? c.notes.map(function (n) { return '<div class="fn"><b>' + U.fmtDate(n.d) + '</b> · ' + e(n.who) + '<br>' + e(n.text) + '</div>'; }).join('') : '<div class="muted">No file notes.</div>', { icon: 'list' });
    }
    return {
      mod: 'clients', crumbs: [['Clients', '#/clients'], [c.id + ' ' + c.rubrik]],
      html: title('Client ' + c.id + ' · ' + e(c.rubrik), '[KND-0210]') + banner + tabHtml + '<div class="tabbody">' + body + '</div>'
    };
  };

  /* ---------- Konten ---------- */
  V.accounts = function () {
    const s = S();
    const f = UIF('accounts');
    const list = s.accounts.filter(function (a) {
      if (a.closed) return false;
      if (f.ccy && a.ccy !== f.ccy) return false;
      if (f.type && a.type !== f.type) return false;
      return true;
    }).sort(function (a, b) { return G.valueCHF(b) - G.valueCHF(a); });
    let tot = 0;
    const rows = list.map(function (a) {
      const c = G.client(a.client);
      const v = G.valueCHF(a);
      tot += v;
      return ['<a href="#/account/' + a.id + '">' + a.id + '</a>', cref(c), e(G.holderName(a)), accShort(a), ccyL(a.ccy), num(a.bal, dec(a.ccy)), U.fmt(v, 0)];
    });
    const filt = '<div class="filter">Currency <select class="inp" data-filter="accounts.ccy"><option value="">all</option>' + ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'XAU'].map(function (x) { return '<option' + (f.ccy === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select> ' +
      'Type <select class="inp" data-filter="accounts.type"><option value="">all</option>' + [['CUR', 'Kontokorrent'], ['DEP', 'Depot'], ['MET', 'Edelmetall']].map(function (x) { return '<option value="' + x[0] + '"' + (f.type === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>';
    return {
      mod: 'accounts', crumbs: [['Accounts'], ['Account list']],
      html: title('Account list (Kontenliste)', '[KTO-0100]', list.length + ' open account(s), sorted by CHF equivalent') + filt +
        grid(['Account', 'Relationship', 'Holder', 'Type', 'Ccy', { t: 'Balance', num: true }, { t: 'CHF equivalent', num: true }], rows, { foot: ['', '', '<b>Total</b>', '', '', '', '<b>' + U.fmt(tot, 0) + '</b>'] })
    };
  };

  V.account = function (id) {
    const s = S();
    const a = G.account(id);
    if (!a) return V.notFound('Account ' + id);
    const c = G.client(a.client);
    const B = D.BANK;
    const txs = s.tx.filter(function (t) { return t.acc === a.id; }).slice(-60);
    const rows = txs.map(function (t) {
      return [U.fmtDate(t.d), e(t.text) + (t.cp && t.kind !== 'int-in' && t.kind !== 'int-out' ? '<br><span class="muted">' + e(t.cp) + '</span>' : ''), U.fmtDate(t.val),
        t.kind === 'open' ? '' : t.amt < 0 ? U.fmt(-t.amt, dec(a.ccy)) : '', t.kind === 'open' ? '' : t.amt >= 0 ? U.fmt(t.amt, dec(a.ccy)) : '', num(t.bal, dec(a.ccy))];
    });
    const addr = c.holdMail ? '<div class="stamp">BANKLAGERND</div><div>Numbered account <b>' + e(c.rubrik) + '</b><br>Correspondence held at the bank</div>' :
      '<div>' + e(c.name) + '<br>' + e(c.city) + '<br>' + e(G.cname(c.dom).toUpperCase()) + '</div>';
    return {
      mod: 'accounts', crumbs: [['Accounts', '#/accounts'], [a.id]],
      html: title('Statement of account (Kontoauszug) ' + a.id, '[KTO-0220]') +
        '<div class="btnbar left noprint">' + btn(ico('print') + ' Print', 'print') + btn('‹ Back to client', 'go', ' data-href="#/client/' + c.id + '/accounts"') + '</div>' +
        '<div class="doc stmt"><div class="lh"><div class="lhl"><div class="wm">VOGT &amp; CIE</div><div class="wms">PRIVATBANKIERS · ZÜRICH · SEIT 1871</div></div><div class="lhr">' + e(B.street) + '<br>' + e(B.pobox) + ', ' + e(B.zip) + '<br>Telefon ' + e(B.phone) + '<br>SWIFT ' + B.bic + ' · BC ' + B.clearing + '</div></div>' +
        '<div class="addr">' + addr + '</div>' +
        '<h2>Statement of account / Kontoauszug</h2>' +
        kv([['Account', a.id + ' · ' + accLabel(a)], ['Account holder', e(G.holderName(a))], ['Currency', ccyL(a.ccy)], ['Statement date', U.fmtDate(s.date)]], 'stmtkv') +
        grid(['Date', 'Text', 'Valuta', { t: 'Debit', num: true }, { t: 'Credit', num: true }, { t: 'Balance', num: true }], rows, { cls: 'stmt-t', foot: ['', '<b>Balance in our favour / your favour</b>', '', '', '', '<b>' + U.fmt(a.bal, dec(a.ccy)) + '</b>'] }) +
        '<p class="small">Please check this statement. Objections must be raised within 30 days, otherwise the statement is deemed approved. ' + (a.type === 'MET' ? 'Holdings in fine gold 999.9 are kept in unallocated form in our vaults. ' : '') + 'This statement is produced by computer and bears no signature.</p></div>'
    };
  };

  /* ---------- Zahlungsverkehr ---------- */
  function precheckCell(p) {
    const chk = G.precheck(p);
    if (chk.errors.length) return st('bad', 'Error');
    let h = '';
    if (chk.hits.length) h += '<span class="hits" title="' + e(chk.hits.map(function (r) { return r + ' ' + D.RULES[r]; }).join('\n')) + '">' + st('bad', chk.hits.join(' ')) + '</span> ';
    const xb = chk.notes.reduce(function (t, n) { return t + n[1]; }, 0);
    if (xb >= 0.05) h += st(xb >= 4 ? 'warn' : 'mod', 'XB ' + G.exposureLabel(xb));
    return h || st('ok', 'OK');
  }

  V.payQueue = function () {
    const s = S();
    const list = G.pendingPayments();
    const rows = list.map(function (p) {
      const c = G.client(p.client);
      const bank = D.bankByBic(p.bic);
      return [p.ref + '<br><span class="muted">' + U.fmtDate(p.d) + ' ' + U.fmtTime(p.t) + '</span>', p.source === 'client' ? st('mod', 'Client fax') : st('ok', 'Manual'), '<a href="#/account/' + p.debit + '">' + p.debit + '</a><br>' + cref(c),
        e(p.benefName) + '<br><span class="muted">' + e(bank ? bank.name : p.bic) + '</span>', cty(p.country), '<b>' + p.ccy + ' ' + U.fmt(p.amount) + '</b>', precheckCell(p),
        '<span class="nowrap">' + btn('Edit', 'payedit', ' data-id="' + p.id + '"', 'sm') + btn('Release', 'payrelease', ' data-id="' + p.id + '"', 'sm def') + btn('Reject', 'payreject', ' data-id="' + p.id + '"', 'sm') + '</span>'];
    });
    return {
      mod: 'payments', crumbs: [['Payments'], ['Release queue']],
      html: title('Release queue – four-eyes principle (Freigabe)', '[ZV-0400]', 'Payment orders entered or received by fax, awaiting second signature.') +
        grid(['Reference', 'Source', 'Debit account', 'Beneficiary', 'Ctry', { t: 'Amount', num: true }, 'Pre-check', ''], rows, { empty: 'No payments awaiting release.' }) +
        '<div class="legend small">' + st('bad', 'TM-xx') + ' transaction-monitoring rule will create an alert &nbsp; ' + st('warn', 'XB') + ' cross-border paper trail (exposure abroad) &nbsp; Hover over a rule code for details.</div>'
    };
  };

  V.payNew = function (q) {
    const s = S();
    const dr = PBS.UI.draft || {};
    const cid = q.c || dr.client;
    const filter = function (a) { return a.type === 'CUR' && (!cid || a.client === cid); };
    const bicList = D.BANKS.map(function (b) { return '<option value="' + b.bic + '">' + e(b.name) + ', ' + e(b.city) + '</option>'; }).join('');
    const ccys = D.CCY.map(function (x) { return '<option' + ((dr.ccy || 'EUR') === x ? ' selected' : '') + '>' + x + '</option>'; }).join('');
    const ctys = Object.keys(D.COUNTRIES).sort().map(function (k) { return '<option value="' + k + '"' + (dr.country === k ? ' selected' : '') + '>' + k + ' – ' + e(D.COUNTRIES[k].n) + '</option>'; }).join('');
    const bank = D.bankByBic(dr.bic);
    const f = '<form data-form="pay" id="payform" autocomplete="off"><table class="frm">' +
      '<tr><th>Debit account <i class="req">*</i></th><td colspan="3"><select name="debit" class="inp req" style="width:100%"><option value="">– select current account –</option>' + accountOptions(filter, dr.debit) + '</select>' +
      (cid ? '<div class="small muted">Filtered on relationship ' + cid + ' · <a href="#/pay/new">show all</a></div>' : '') + '</td></tr>' +
      '<tr class="sec"><td colspan="4">:32A: Value date / Currency / Amount</td></tr>' +
      '<tr><th>Value date (Valuta)</th><td colspan="3"><input class="inp" name="valuta" value="' + U.fmtDate(U.addBusinessDays(s.date, 1)) + '" size="11" readonly> <span class="small muted">next business day</span></td></tr>' +
      '<tr><th>Currency / amount <i class="req">*</i></th><td colspan="3"><select name="ccy" class="inp req">' + ccys + '</select> <input name="amount" class="inp req num" size="18" value="' + e(dr.amount || '') + '" placeholder="0.00"></td></tr>' +
      '<tr class="sec"><td colspan="4">:50K: Ordering customer</td></tr>' +
      '<tr><th>Originator</th><td colspan="3"><label><input type="radio" name="hideOrig" value="0"' + (dr.hideOrig ? '' : ' checked') + '> Account number and name of account holder</label><br>' +
      '<label><input type="radio" name="hideOrig" value="1"' + (dr.hideOrig ? ' checked' : '') + '> "ONE OF OUR CLIENTS" – no name transmitted</label></td></tr>' +
      '<tr class="sec"><td colspan="4">:57A: Account with institution</td></tr>' +
      '<tr><th>BIC <i class="req">*</i></th><td colspan="3"><input name="bic" class="inp req up" size="12" maxlength="11" list="biclist" value="' + e(dr.bic || '') + '"><datalist id="biclist">' + bicList + '</datalist> <span id="bankname">' + (bank ? e(bank.name + ', ' + bank.city) : '<span class="muted">– enter BIC –</span>') + '</span></td></tr>' +
      '<tr><th>Country <i class="req">*</i></th><td colspan="3"><select name="country" class="inp req"><option value="">– select –</option>' + ctys + '</select></td></tr>' +
      '<tr class="sec"><td colspan="4">:59: Beneficiary customer</td></tr>' +
      '<tr><th>Account / IBAN</th><td colspan="3"><input name="benefAcct" class="inp up" size="40" value="' + e(dr.benefAcct || '') + '"></td></tr>' +
      '<tr><th>Name <i class="req">*</i></th><td colspan="3"><input name="benefName" class="inp req" size="50" value="' + e(dr.benefName || '') + '"></td></tr>' +
      '<tr><th>Address</th><td colspan="3"><input name="benefAddr" class="inp" size="50" value="' + e(dr.benefAddr || '') + '"></td></tr>' +
      '<tr class="sec"><td colspan="4">:70: Remittance information &nbsp; :71A: Details of charges</td></tr>' +
      '<tr><th>Purpose</th><td colspan="3"><input name="purpose" class="inp" size="40" maxlength="35" value="' + e(dr.purpose || '') + '"></td></tr>' +
      '<tr><th>Charges</th><td colspan="3"><select name="charges" class="inp">' + ['SHA', 'OUR', 'BEN'].map(function (x) { return '<option' + (dr.charges === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select> <span class="small muted">SHA shared · OUR all charges to client · BEN all charges to beneficiary</span></td></tr>' +
      '</table><div class="btnbar"><button type="button" class="btn" data-act="paycheck">Check (Prüfen)</button> <button type="submit" class="btn def">Submit for release</button> <button type="button" class="btn" data-act="payclear">Clear</button></div></form>';
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['New payment']],
      html: title('Payment order – SWIFT MT103 entry', '[ZV-0310]', 'Single customer credit transfer. Fields marked <i class="req">*</i> are mandatory.') +
        '<div class="cols"><div class="col-l">' + panel('Payment order', f, { icon: 'doc' }) + '</div><div class="col-r">' +
        panel('Pre-check (Vorprüfung)', '<div id="precheck"><span class="muted">Press "Check" to run the transaction-monitoring pre-check.</span></div>', { icon: 'shield' }) +
        panel('Hints', '<ul class="hints"><li>Payments into a client\'s country of domicile leave a paper trail with the tax authorities there.</li><li>Debiting the account of a domiciliary company and omitting the originator name reduce that trail.</li><li>Standard commission: CHF 40 + 0.05% (max. CHF 750), OUR + CHF 25.</li></ul>', { icon: 'info' }) +
        panel('BIC directory (extract)', grid(['BIC', 'Institution', 'Ctry'], D.BANKS.map(function (b) { return ['<span class="mono">' + b.bic + '</span>', e(b.name) + ', ' + e(b.city), cty(b.c)]; }), { cls: 'compact' }), { icon: 'list', flush: true, cls: 'scrollp' }) +
        '</div></div>'
    };
  };

  V.precheckResult = function (p) {
    const chk = G.precheck(p);
    if (chk.errors.length) return '<div class="errbox">' + chk.errors.map(function (x) { return '<div>' + ico('warn') + ' ' + e(x) + '</div>'; }).join('') + '</div>';
    const acc = chk.acc;
    let h = kv([
      ['Amount in CHF', 'CHF ' + U.fmt(chk.chf)],
      ['Debit ' + acc.id, acc.ccy + ' ' + U.fmt(chk.debitAmt) + (p.ccy !== acc.ccy ? ' <span class="muted">(incl. FX margin)</span>' : '')],
      ['Commission', 'CHF ' + U.fmt(chk.fee)],
      ['Balance after booking', acc.ccy + ' ' + U.fmt(acc.bal - chk.debitAmt - chk.feeAcc)]
    ]);
    h += '<div class="pcsec">Transaction monitoring</div>';
    h += chk.hits.length ? chk.hits.map(function (r) { return '<div class="hit bad">' + ico('warn') + ' <b>' + r + '</b> ' + e(D.RULES[r]) + '</div>'; }).join('') : '<div class="hit ok">' + ico('check') + ' No rule triggered.</div>';
    h += '<div class="pcsec">Cross-border exposure (XB)</div>';
    h += chk.notes.length ? chk.notes.map(function (n) {
      return '<div class="hit ' + (n[1] >= 4 ? 'warn' : 'mod') + '">' + ico('flag') + ' ' + e(D.AUTH[n[0]].short) + ': <b>' + G.exposureLabel(n[1]) + '</b> <span class="muted">(+' + U.fmt(n[1], 1) + ')</span></div>';
    }).join('') : '<div class="hit ok">' + ico('check') + ' No noticeable paper trail.</div>';
    return h;
  };

  V.payTransfer = function (q) {
    const cid = q.c;
    const filter = function (a) { return !cid || a.client === cid; };
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Internal transfer']],
      html: title('Internal transfer (Kontoübertrag)', '[ZV-0120]', 'Transfers between accounts held with us. No SWIFT message, no trail abroad. Securities and metals are bought or sold at market.') +
        '<form data-form="transfer" autocomplete="off">' + panel('Transfer', '<table class="frm">' +
          '<tr><th>Debit account <i class="req">*</i></th><td><select name="from" class="inp req" style="width:100%"><option value="">– select –</option>' + accountOptions(filter) + '</select></td></tr>' +
          '<tr><th>Credit account <i class="req">*</i></th><td><select name="to" class="inp req" style="width:100%"><option value="">– select –</option>' + accountOptions(filter) + '</select></td></tr>' +
          '<tr><th>Amount (in debit currency) <i class="req">*</i></th><td><input name="amount" class="inp req num" size="18"></td></tr>' +
          '<tr><th>Booking text</th><td><input name="text" class="inp" size="50" placeholder="(automatic)"></td></tr>' +
          '<tr><th>Preview</th><td id="trprev" class="muted">–</td></tr>' +
          '</table>' + (cid ? '<div class="small muted">Filtered on relationship ' + cid + ' · <a href="#/pay/transfer">show all</a></div>' : '') +
          '<div class="btnbar"><button type="submit" class="btn def">Execute transfer</button></div>', { icon: 'swap' }) + '</form>' +
        '<div class="note">' + ico('info') + ' Moving assets into accounts of a client\'s domiciliary company reduces the trail of future payments. Transfers between different relationships are monitored.</div>'
    };
  };

  V.cashDesk = function () {
    const s = S();
    const rows = s.counter.map(function (k) {
      const c = G.client(k.client);
      const chf = k.amount * G.rate(k.ccy);
      const hits = [];
      if (chf >= 25000) hits.push('TM-01');
      if (!c.formA && chf >= 25000) hits.push('TM-05');
      if (chf > 0.3 * c.wealth) hits.push('TM-09');
      return [U.fmtTime(k.t), cref(c, true), k.type === 'in' ? st('ok', 'Deposit') : st('warn', 'Withdrawal'),
        '<b>' + k.ccy + ' ' + U.fmt(k.amount) + '</b><br><span class="muted">CHF ' + U.fmt(chf, 0) + '</span>',
        e(k.note) + (k.courier ? '<br><span class="muted">delivered by courier</span>' : '') + (k.funding ? '<br>' + st('mod', 'Initial funding') : ''),
        hits.length ? st('bad', hits.join(' ')) : st('ok', 'below threshold'),
        '<span class="nowrap">' + btn(k.type === 'in' ? 'Accept deposit' : 'Pay out', 'cashok', ' data-id="' + k.id + '"', 'sm def') + btn('Refuse', 'cashno', ' data-id="' + k.id + '"', 'sm') + '</span>'];
    });
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Cash desk']],
      html: title('Cash desk (Kasse) – Bahnhofstrasse', '[KAS-0100]', 'Teller: ' + D.STAFF.cash + ' · Clients not served by the end of day will leave.') +
        grid(['Arrived', 'Client', 'Transaction', { t: 'Amount', num: true }, 'Remarks', 'Monitoring', ''], rows, { empty: 'Nobody at the counter.' }) +
        '<div class="note">' + ico('info') + ' Cash transactions of CHF 25,000 and more require identification and are reported by transaction monitoring (TM-01). Cash handling commission: 0.30% on deposits, 0.10% on withdrawals.</div>'
    };
  };

  V.payDone = function () {
    const s = S();
    const list = s.payments.filter(function (p) { return p.status !== 'pending'; }).slice(0, 120);
    const rows = list.map(function (p) {
      const stt = { released: st('ok', 'Released'), rejected: st('bad', 'Rejected'), cancelled: st('mod', 'Cancelled') }[p.status];
      return ['<a href="#/pay/' + p.id + '">' + p.ref + '</a>', U.fmtDate(p.released || p.d), p.debit, e(p.benefName), cty(p.country), p.ccy + ' ' + U.fmt(p.amount), stt + (p.alert ? ' ' + st('bad', p.alert) : ''),
        p.status === 'released' ? '<a href="#/pay/' + p.id + '">MT103</a>' : ''];
    });
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Executed payments']],
      html: title('Payment journal (Zahlungsjournal)', '[ZV-0500]') +
        grid(['Reference', 'Date', 'Debit account', 'Beneficiary', 'Ctry', { t: 'Amount', num: true }, 'Status', ''], rows, { empty: 'No payments yet.' })
    };
  };

  V.mt103 = function (p) {
    const a = G.account(p.debit);
    const c = G.client(p.client);
    const bank = D.bankByBic(p.bic);
    const amt = U.fmt(p.amount).replace(/'/g, '').replace('.', ',');
    const orig = p.hideOrig ? 'ONE OF OUR CLIENTS' : (a ? G.holderName(a) : '').toUpperCase() + '\nZUERICH';
    const lines = [
      '{1:F01' + D.BANK.bic + 'AXXX' + U.pad(4410 + parseInt(p.id.slice(1), 10), 4) + U.pad(parseInt(p.id.slice(1), 10) * 7919 % 1000000, 6) + '}' +
      '{2:I103' + (p.bic || 'XXXXXXXX').toUpperCase().slice(0, 8) + 'XXXXN}{3:{108:' + p.ref + '}}{4:',
      ':20:' + p.ref,
      ':23B:CRED',
      ':32A:' + U.swiftDate(p.valuta || p.d) + p.ccy + amt,
      ':50K:/' + (p.debit || ''),
      orig,
      ':57A:' + (p.bic || '').toUpperCase(),
      ':59:/' + String(p.benefAcct || '').replace(/\s/g, ''),
      String(p.benefName || '').toUpperCase().slice(0, 35),
      String(p.benefAddr || '').toUpperCase().slice(0, 35),
      ':70:' + String(p.purpose || '').toUpperCase().slice(0, 35),
      ':71A:' + p.charges,
      '-}{5:{CHK:' + (parseInt(p.id.slice(1), 10) * 2654435761 % 0xFFFFFFFFFFFF).toString(16).toUpperCase().padStart(12, '0') + '}}'
    ].filter(function (l) { return l !== ''; });
    return '<pre class="swift">' + e(lines.join('\n')) + '</pre>' +
      '<div class="small muted">Sent via SWIFT to ' + e(bank ? bank.name + ', ' + bank.city : p.bic) + (c ? ' · relationship ' + c.id + ' ' + e(c.rubrik) : '') + '</div>';
  };

  V.payView = function (id) {
    const s = S();
    const p = s.payments.find(function (x) { return x.id === id; });
    if (!p) return V.notFound('Payment ' + id);
    const c = G.client(p.client);
    const bank = D.bankByBic(p.bic);
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Payment journal', '#/pay/done'], [p.ref]],
      html: title('Payment ' + p.ref, '[ZV-0510]') +
        '<div class="cols"><div class="col-h">' + panel('Order details', kv([
          ['Reference (:20:)', p.ref], ['Status', p.status], ['Entered', U.fmtDate(p.d) + ' ' + U.fmtTime(p.t) + (p.source === 'client' ? ' (client fax)' : ' (manual)')],
          ['Released', p.released ? U.fmtDate(p.released) + (p.rt ? ' ' + U.fmtTime(p.rt) : '') + ' · visa ' + e(s.user.id) : '–'],
          ['Relationship', cref(c)], ['Debit account', p.debit], ['Amount', p.ccy + ' ' + U.fmt(p.amount)], ['Commission', p.fee ? 'CHF ' + U.fmt(p.fee) : '–'],
          ['Beneficiary', e(p.benefName)], ['Bank', e(bank ? bank.name + ', ' + bank.city : p.bic) + ' (' + e(p.bic) + ')'], ['Purpose', e(p.purpose)],
          ['Monitoring alert', p.alert ? '<a href="#/compliance/alerts">' + p.alert + '</a>' : '–']
        ]), { icon: 'doc' }) + '</div><div class="col-h">' + panel('SWIFT message MT103', p.status === 'released' ? V.mt103(p) : '<div class="muted">No message sent.</div>', { icon: 'doc', tools: btn(ico('print') + ' Print', 'print', '', 'sm') }) + '</div></div>'
    };
  };

  /* ---------- Compliance ---------- */
  V.risk = function () {
    const s = S();
    const past = s.heatHist.length >= 5 ? s.heatHist[s.heatHist.length - 5] : s.heatHist[0];
    const rows = ['EBK'].concat(G.FOREIGN).map(function (k) {
      const v = s.heat[k];
      const A = D.AUTH[k];
      return ['<b>' + e(A.short) + '</b><br><span class="muted">' + e(A.name) + '</span>', cty(A.c) + ' ' + e(G.cname(A.c)), '<b>' + U.fmt(v, 1) + '</b>',
        '<div class="bar big"><div class="fill lv-' + G.level(v).cls + '" style="width:' + v.toFixed(1) + '%"></div><span class="m50"></span><span class="m75"></span></div>', lvl(v), past ? chgRisk(v - past[k], 1) : ''];
    });
    const drivers = s.heatLog.slice(0, 25).map(function (h) {
      return [U.fmtDate(h.d), e(D.AUTH[h.k].short), chgRisk(h.v, 2), e(h.r)];
    });
    return {
      mod: 'compliance', crumbs: [['Compliance'], ['Risk monitor']],
      html: title('Risk monitor – exposure to authorities', '[CMP-0010]', 'Internal estimate by Legal & Compliance (Dr. I. Wyss). Index 0–100; at 100 the authority takes action against the bank.') +
        panel('Exposure indices', grid(['Authority', 'Jurisdiction', { t: 'Index', num: true }, { t: 'Scale 0–100', w: '34%' }, 'Level', { t: 'Δ 5 days', num: true }], rows), { icon: 'shield', flush: true }) +
        '<div class="cols"><div class="col-h">' + panel('Recent drivers', grid(['Date', 'Authority', { t: 'Change', num: true }, 'Cause'], drivers, { empty: 'No changes recorded yet.' }), { icon: 'list', flush: true }) +
        '</div><div class="col-h">' + panel('Client confidence (discretion index)', '<div class="bigval">' + U.fmt(s.discretion, 0) + '</div><div class="bar big"><div class="fill lv-ok" style="width:' + s.discretion + '%"></div></div><p class="small">Reflects how safe clients and introducers consider their money with us. High confidence brings more introductions; reports to authorities and leaks reduce it.</p>', { icon: 'user' }) +
        panel('How exposure arises', '<ul class="hints"><li><b>EBK:</b> overdue or poorly documented alerts, PEP and increased-risk relationships, missing Form A, audit findings, breaches of secrecy.</li><li><b>Foreign authorities:</b> payments into the client\'s home country, statements mailed abroad, clients caught at the border, press reports, trips by our bankers.</li><li>Exposure fades slowly over time if nothing new happens.</li></ul>', { icon: 'info' }) +
        '</div></div>'
    };
  };

  V.alerts = function () {
    const s = S();
    const f = UIF('alerts');
    const mode = f.st || 'open';
    const list = s.alerts.filter(function (a) { return mode === 'all' || (mode === 'open' ? a.status === 'open' : a.status !== 'open'); });
    const rows = list.map(function (a) {
      const c = G.client(a.client);
      const over = a.status === 'open' && a.due < s.date;
      const stt = a.status === 'open' ? (over ? st('bad', 'Overdue') : st('warn', 'Open')) : a.status === 'reported' ? st('mod', 'Reported MROS') : st('ok', 'Closed') + (a.weak ? ' ' + st('warn', 'thin') : '');
      return { cls: over ? 'overdue' : '', cells: [a.status === 'open' ? '<input type="checkbox" name="sel" value="' + a.id + '" aria-label="Select ' + a.id + '">' : '',
        '<b class="nowrap">' + a.id + '</b>', U.fmtDate(a.d), U.fmtDate(a.due), a.rules.map(function (r) { return '<span class="rule" title="' + e(D.RULES[r]) + '">' + r + '</span>'; }).join(' '), cref(c), e(a.desc), U.fmt(a.chf, 0), stt,
        a.status === 'open' ? btn('Handle', 'alert', ' data-id="' + a.id + '"', 'sm def') : btn('View', 'alert', ' data-id="' + a.id + '"', 'sm')] };
    });
    const filt = '<div class="filter">Show <select class="inp" data-filter="alerts.st">' + [['open', 'open alerts'], ['closed', 'closed / reported'], ['all', 'all']].map(function (o) { return '<option value="' + o[0] + '"' + (mode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    const anyOpen = list.some(function (a) { return a.status === 'open'; });
    const bulk = anyOpen ? '<div class="filter bulk">Selected alerts: close as explained with justification <select name="just" class="inp"><option value="">– select –</option>' +
      D.JUSTIFICATIONS.map(function (j) { return '<option value="' + j[0] + '">' + e(j[1]) + '</option>'; }).join('') + '</select> <button type="submit" class="btn sm def">Close selected</button></div>' : '';
    return {
      mod: 'compliance', crumbs: [['Compliance', '#/compliance'], ['Alerts']],
      html: title('Transaction monitoring – alerts', '[CMP-0200]', 'Alerts must be cleared within 10 business days and documented for the auditors.') + filt +
        '<form data-form="bulkalerts">' + grid([anyOpen ? '<input type="checkbox" name="selall" aria-label="Select all">' : '', 'Alert', 'Created', 'Due', 'Rules', 'Client', 'Description', { t: 'CHF', num: true }, 'Status', ''], rows, { empty: 'No alerts.' }) + bulk + '</form>' +
        panel('Rule catalogue', grid(['Rule', 'Description'], Object.keys(D.RULES).map(function (r) { return ['<b>' + r + '</b>', e(D.RULES[r])]; })), { icon: 'list', flush: true })
    };
  };

  V.alertDialog = function (a) {
    const s = S();
    const c = G.client(a.client);
    const tx = s.tx.find(function (t) { return t.id === a.tx; });
    let h = kv([
      ['Alert', '<b>' + a.id + '</b> · created ' + U.fmtDate(a.d) + ' ' + U.fmtTime(a.t) + ' · due ' + U.fmtDate(a.due)],
      ['Rules', a.rules.map(function (r) { return '<b>' + r + '</b> ' + e(D.RULES[r]); }).join('<br>')],
      ['Transaction', e(a.desc) + (tx ? '<br><span class="muted">' + U.fmtDate(tx.d) + ' · account ' + tx.acc + ' · ' + tx.ccy + ' ' + U.fmt(tx.amt, dec(tx.ccy)) + ' · CHF ' + U.fmt(Math.abs(tx.chf), 0) + '</span>' : '')],
      ['Client', c.id + ' <b>' + e(c.rubrik) + '</b> – ' + e(c.name) + ', ' + e(c.city) + ' (' + c.dom + ')'],
      ['Client profile', 'Occupation: ' + e(c.occ) + '<br>Source of wealth: ' + e(c.sow) + '<br>Documented wealth: <b>CHF ' + U.fmtMio(c.wealth) + '</b> · Risk: ' + e(c.risk) + ' · Form A: ' + (c.formA ? 'yes' : '<b class="neg">missing</b>')]
    ], 'dlgkv');
    if (a.status !== 'open') {
      const j = D.JUSTIFICATIONS.find(function (x) { return x[0] === a.res.just; });
      h += '<div class="resolved">' + ico('check') + ' ' + (a.status === 'reported' ? 'Reported to MROS' : 'Closed') + ' on ' + U.fmtDate(a.res.d) + ' ' + U.fmtTime(a.res.t) + ' by ' + e(a.res.by) +
        (j ? '<br>Justification: ' + e(j[1]) : '') + (a.res.comment ? '<br>Comment: ' + e(a.res.comment) : '') + (a.weak ? '<br><b>Documentation quality: thin</b>' : '') + '</div>';
      return h;
    }
    h += '<form id="alertform"><fieldset class="box"><legend>Decision</legend>' +
      '<label class="opt"><input type="radio" name="dec" value="close" checked> <b>Close as explained</b> (plausible, documented)</label>' +
      '<div class="ind">Justification <select name="just" class="inp"><option value="">– select –</option>' + D.JUSTIFICATIONS.map(function (j) { return '<option value="' + j[0] + '">' + e(j[1]) + '</option>'; }).join('') + '</select>' +
      '<br>Comment <input name="comment" class="inp" size="56" placeholder="e.g. confirmed by RM, documents on file"><div id="aq" class="small muted">Documentation quality: –</div></div>' +
      '<label class="opt"><input type="radio" name="dec" value="mros"> <b>Report to MROS</b> (Art. 9 GwG) – assets blocked, relationship terminated</label></fieldset></form>';
    return h;
  };

  V.mla = function () {
    const s = S();
    const list = s.messages.filter(function (m) { return m.kind === 'mla'; });
    const rows = list.map(function (m) {
      const c = G.client(m.data.client);
      return [U.fmtDate(m.d), '<a href="#/inbox/' + m.id + '">' + e(m.subject) + '</a>', cref(c), e(D.AUTH[m.data.auth].short), m.due ? U.fmtDate(m.due) : '', m.resolved ? st('ok', e(m.resolved.label)) : st('warn', 'Open')];
    });
    return {
      mod: 'compliance', crumbs: [['Compliance', '#/compliance'], ['Mutual legal assistance']],
      html: title('Mutual legal assistance (Rechtshilfe)', '[CMP-0300]', 'Requests from foreign authorities, forwarded by the Federal Office of Justice.') +
        grid(['Received', 'Request', 'Client', 'Authority', 'Due', 'Status'], rows, { empty: 'No requests received.' }) +
        '<div class="note">' + ico('info') + ' Under Swiss law, simple tax evasion (Steuerhinterziehung) is not a criminal offence; assistance is excluded for fiscal offences (Art. 3 para. 3 IRSG). Tax fraud (Abgabebetrug), i.e. the use of forged documents, is a criminal offence – assistance must be granted. Producing documents without legal basis breaches banking secrecy (Art. 47 BankG).</div>'
    };
  };

  V.audits = function () {
    const s = S();
    const y = s.date.slice(0, 4);
    const next = s.flags['audit' + y] ? (+y + 1) + '-09-15' : y + '-09-15';
    const rows = s.audits.map(function (a) {
      return [a.year, U.fmtDate(a.d), a.findings.length ? a.findings.map(e).join('<br>') : st('ok', 'No findings'), chgRisk(a.delta, 1)];
    });
    return {
      mod: 'compliance', crumbs: [['Compliance', '#/compliance'], ['Audit reports']],
      html: title('Audit reports (Revisionsberichte)', '[CMP-0400]', 'Statutory auditor: Hürlimann Revision AG, Zürich. Next fieldwork from ' + U.fmtDate(next) + '.') +
        grid(['Year', 'Report', 'Findings', { t: 'EBK index', num: true }], rows, { empty: 'No audit completed in this period yet.' }) +
        '<div class="note">' + ico('info') + ' The auditors check Form A for all relationships, the documentation of closed alerts (a sample of thinly documented closures will be found), alerts open for more than 20 business days and the concentration of PEP relationships. Findings are reported to the EBK.</div>'
    };
  };

  /* ---------- Sitzgesellschaften ---------- */
  V.companies = function () {
    const s = S();
    const rows = s.entities.filter(function (x) { return !x.dissolved; }).map(function (x) {
      const j = D.JURIS[x.jur];
      const c = G.client(x.bo);
      const n = s.accounts.filter(function (a) { return a.entity === x.id && !a.closed; }).length;
      return ['<b>' + e(x.name) + '</b>', e(j.form), cty(j.c) + ' ' + e(G.cname(j.c)), U.fmtDate(x.inc), e(j.agent), cref(c), String(n), U.fmt(G.entityAUM(x.id), 0)];
    });
    return {
      mod: 'companies', crumbs: [['Domiciliary companies'], ['Register']],
      html: title('Domiciliary companies (Sitzgesellschaften)', '[SGS-0100]', 'Companies without operational activity, held for clients. Beneficial owner documented on Form A.') +
        '<div class="btnbar left">' + btn(ico('plus') + ' Incorporate company', 'go', ' data-href="#/companies/new"') + '</div>' +
        grid(['Company', 'Form', 'Jurisdiction', 'Incorporated', 'Registered agent / directors', 'Beneficial owner', 'Accts', { t: 'Assets CHF', num: true }], rows)
    };
  };

  V.companyNew = function (q) {
    const shield = function (v) { return v <= 0.35 ? st('ok', 'very strong') : v <= 0.45 ? st('ok', 'strong') : st('mod', 'good'); };
    const jrows = Object.keys(D.JURIS).map(function (k, i) {
      const j = D.JURIS[k];
      return ['<input type="radio" name="jur" value="' + k + '" id="j' + i + '"' + (i === 0 ? ' checked' : '') + '>', '<label for="j' + i + '">' + e(j.label) + '</label>', e(j.agent), 'CHF ' + U.fmt(j.setup, 0), 'CHF ' + U.fmt(j.annual, 0), shield(j.shield)];
    });
    return {
      mod: 'companies', crumbs: [['Domiciliary companies', '#/companies'], ['Incorporate']],
      html: title('Incorporate domiciliary company', '[SGS-0200]', 'Shelf company via our correspondent registered agents. Costs are debited to the client; the bank retains a handling margin.') +
        '<form data-form="entity" autocomplete="off">' +
        panel('Beneficial owner', '<table class="frm"><tr><th>Client <i class="req">*</i></th><td>' + clientsSelect('client', q.c) + '</td></tr></table>', { icon: 'user' }) +
        panel('Jurisdiction', grid(['', 'Form', 'Registered agent', { t: 'Set-up', num: true }, { t: 'Annual', num: true }, 'Shielding'], jrows), { icon: 'building', flush: true }) +
        panel('Company', '<table class="frm"><tr><th>Name <i class="req">*</i></th><td><input name="name" class="inp req" size="40"> ' + btn('Suggest name', 'entsuggest', '', 'sm') + '</td></tr>' +
          '<tr><th>Bank account</th><td><label><input type="checkbox" name="withAccount" checked> Open current account for the company in</label> <select name="ccy" class="inp">' + D.CCY.map(function (x) { return '<option' + (x === 'USD' ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td></tr></table>' +
          '<div class="btnbar"><button type="submit" class="btn def">Incorporate</button></div>', { icon: 'doc' }) + '</form>'
    };
  };

  /* ---------- Berichte ---------- */
  V.pl = function () {
    const s = S();
    const y = s.bank.ytd;
    const rev = y.fees + y.comm + y.fx + y.other;
    const cost = y.opex + y.travel + y.legal;
    const year = s.date.slice(0, 4);
    const rows = [
      { cls: 'grp', cells: ['<b>Revenue</b>', ''] },
      ['Management and custody fees (accrued)', U.fmt(y.fees)],
      ['Commissions (payments, cash, brokerage, hold mail)', U.fmt(y.comm)],
      ['Foreign exchange and precious metals margin', U.fmt(y.fx)],
      ['Other (domiciliary companies)', U.fmt(y.other)],
      { cls: 'sum', cells: ['<b>Total revenue</b>', '<b>' + U.fmt(rev) + '</b>'] },
      { cls: 'grp', cells: ['<b>Expenses</b>', ''] },
      ['Personnel and general expenses', U.fmt(-y.opex)],
      ['Travel and acquisition', U.fmt(-y.travel)],
      ['Legal, audit and consulting', U.fmt(-y.legal)],
      { cls: 'sum', cells: ['<b>Total expenses</b>', '<b>' + U.fmt(-cost) + '</b>'] },
      { cls: 'tot', cells: ['<b>Net profit ' + year + ' (to date)</b>', '<b>' + num(rev - cost) + '</b>'] }
    ];
    const ann = s.annual.map(function (a) { return [a.year, U.fmt(a.rev, 0), U.fmt(a.cost, 0), num(a.profit, 0), U.fmtMio(a.aum), U.fmtMio(a.capital)]; });
    return {
      mod: 'reports', crumbs: [['Reports'], ['Profit & loss']],
      html: title('Profit and loss statement (Erfolgsrechnung) ' + year, '[REP-0100]', 'Period 01.01.' + year + ' – ' + U.fmtDate(s.date) + ', in CHF') +
        '<div class="cols"><div class="col-h">' + panel('Income statement', grid(['Position', { t: 'CHF', num: true }], rows, { cls: 'pl' }), { icon: 'chart', flush: true, tools: btn(ico('print') + ' Print', 'print', '', 'sm') }) +
        '</div><div class="col-h">' + panel('Capital', kv([['Equity capital', 'CHF ' + num(s.bank.capital, 0)], ['Legal minimum (Art. 4 BankV)', 'CHF ' + U.fmt(D.MIN_CAPITAL, 0)], ['Headroom', 'CHF ' + num(s.bank.capital - D.MIN_CAPITAL, 0)]]), { icon: 'building' }) +
        panel('Prior years', grid(['Year', { t: 'Revenue', num: true }, { t: 'Expenses', num: true }, { t: 'Profit', num: true }, { t: 'AuM', num: true }, { t: 'Capital', num: true }], ann, { empty: 'First year under your management.' }), { icon: 'list', flush: true }) + '</div></div>'
    };
  };

  V.aumReport = function () {
    const by = {}, byC = {}, byR = {};
    let tot = 0;
    G.activeClients().forEach(function (c) {
      const v = G.clientAUM(c.id);
      tot += v;
      by[c.dom] = by[c.dom] || { n: 0, v: 0, rev: 0 };
      by[c.dom].n++; by[c.dom].v += v; by[c.dom].rev += v * c.fee;
      byR[c.risk] = byR[c.risk] || { n: 0, v: 0 };
      byR[c.risk].n++; byR[c.risk].v += v;
      G.clientAccounts(c.id).forEach(function (a) { byC[a.ccy] = (byC[a.ccy] || 0) + G.valueCHF(a); });
    });
    const pct = function (v) { return tot ? U.fmt(v / tot * 100, 1) + '%' : '–'; };
    const rows = Object.keys(by).sort(function (a, b) { return by[b].v - by[a].v; }).map(function (k) {
      const a = D.COUNTRIES[k].auth;
      return [cty(k) + ' ' + e(G.cname(k)), String(by[k].n), U.fmt(by[k].v, 0), pct(by[k].v), U.fmt(by[k].rev / by[k].v * 100, 2) + '%', a ? lvl(G.state.heat[a]) : '<span class="muted">–</span>'];
    });
    return {
      mod: 'reports', crumbs: [['Reports'], ['AuM by domicile']],
      html: title('Assets under management by domicile', '[REP-0200]', 'Valuation at current rates, CHF') +
        panel('By client domicile', grid(['Domicile', { t: 'Clients', num: true }, { t: 'AuM CHF', num: true }, { t: 'Share', num: true }, { t: 'Avg. fee', num: true }, 'Home exposure'], rows, { foot: ['<b>Total</b>', '', '<b>' + U.fmt(tot, 0) + '</b>', '100.0%', '', ''] }), { icon: 'chart', flush: true }) +
        '<div class="cols"><div class="col-h">' + panel('By currency', grid(['Currency', { t: 'CHF equivalent', num: true }, { t: 'Share', num: true }], Object.keys(byC).sort(function (a, b) { return byC[b] - byC[a]; }).map(function (k) { return [ccyL(k), U.fmt(byC[k], 0), pct(byC[k])]; })), { icon: 'list', flush: true }) +
        '</div><div class="col-h">' + panel('By risk class', grid(['Risk class', { t: 'Clients', num: true }, { t: 'AuM CHF', num: true }, { t: 'Share', num: true }], Object.keys(byR).map(function (k) { return [riskSt(k), String(byR[k].n), U.fmt(byR[k].v, 0), pct(byR[k].v)]; })), { icon: 'shield', flush: true }) + '</div></div>'
    };
  };

  V.journal = function () {
    const s = S();
    const f = UIF('journal');
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
      return [U.fmtDate(t.d) + ' <span class="muted">' + U.fmtTime(t.t) + '</span>', t.id, '<a href="#/account/' + t.acc + '">' + t.acc + '</a>', e(t.text), num(t.amt, dec(t.ccy)), ccyL(t.ccy), num(t.chf, 0)];
    });
    const filt = '<div class="filter">Type <select class="inp" data-filter="journal.k"><option value="">all bookings</option>' + Object.keys(kinds).map(function (k) { return '<option value="' + k + '"' + (f.k === k ? ' selected' : '') + '>' + kinds[k] + '</option>'; }).join('') + '</select></div>';
    return {
      mod: 'reports', crumbs: [['Reports'], ['Journal']],
      html: title('Booking journal (Journal)', '[REP-0300]', 'Latest 200 bookings') + filt +
        grid(['Date', 'Booking no.', 'Account', 'Text', { t: 'Amount', num: true }, 'Ccy', { t: 'CHF', num: true }], rows)
    };
  };

  /* ---------- Post ---------- */
  V.inbox = function () {
    const s = S();
    const rows = s.messages.map(function (m) {
      const stt = m.actions.length ? (m.resolved ? st('ok', 'Decided') : st('warn', 'Decision required')) : m.kind === 'order' ? (function () {
        const p = s.payments.find(function (x) { return x.id === m.data.payment; });
        return p && p.status === 'pending' ? st('mod', 'In release queue') : st('ok', p ? p.status : 'done');
      })() : '';
      return { cls: m.read ? '' : 'unread', cells: [ico(m.type === 'fax' ? 'fax' : m.read ? 'mail-open' : 'mail'), { memo: 'Memo', fax: 'Fax', letter: 'Letter', telex: 'Telex' }[m.type] || m.type, e(m.from), '<a href="#/inbox/' + m.id + '">' + e(m.subject) + '</a>', U.fmtDate(m.d) + ' ' + U.fmtTime(m.t), stt] };
    });
    return {
      mod: 'inbox', crumbs: [['Mail & fax'], ['Inbox']],
      html: title('Mail, fax and internal memos', '[POS-0100]', s.messages.length + ' item(s), ' + G.unread() + ' unread') +
        grid(['', 'Type', 'From', 'Subject', 'Received', 'Status'], rows, { cls: 'inbox' })
    };
  };

  function paras(t) { return e(t).split('\n').join('<br>'); }

  V.message = function (id) {
    const s = S();
    const m = s.messages.find(function (x) { return x.id === id; });
    if (!m) return V.notFound('Message ' + id);
    let doc;
    if (m.type === 'fax') {
      doc = '<div class="doc fax"><div class="faxhdr">' + U.faxDate(m.d) + ' ' + U.fmtTime(Math.max(0, m.t - 1)) + '  FROM: ' + e(m.from.toUpperCase()) + '  TO: +41 1 218 44 99  P.01/01</div>' +
        '<div class="faxbody">' + paras(m.body) + '</div><div class="faxstamp">RECEIVED ' + U.fmtDate(m.d) + ' ' + U.fmtTime(m.t) + ' · SIGNATURE VERIFIED ' + (m.data.client ? '(' + e(G.client(m.data.client) ? G.client(m.data.client).rm : '') + ')' : '') + '</div></div>';
    } else if (m.type === 'letter') {
      doc = '<div class="doc letter"><div class="lsender">' + e(m.from) + '</div><div class="laddr">Bankhaus Vogt &amp; Cie<br>Geschäftsleitung<br>' + e(D.BANK.street) + '<br>' + e(D.BANK.zip) + '</div>' +
        '<div class="ldate">' + U.longDate(m.d) + '</div><div class="lsubj">' + e(m.subject) + '</div><div class="lbody">' + paras(m.body) + '</div></div>';
    } else {
      doc = '<div class="doc memo"><div class="memohd">VOGT &amp; CIE · INTERNAL MEMO / AKTENNOTIZ <span>VERTRAULICH</span></div>' +
        kv([['To', 'Managing Partner'], ['From', e(m.from)], ['Date', U.fmtDate(m.d) + ' ' + U.fmtTime(m.t)], ['Subject', '<b>' + e(m.subject) + '</b>']], 'memokv') +
        '<div class="memobody">' + paras(m.body) + '</div></div>';
    }
    let extra = '';
    if (m.kind === 'prospect' && m.data.prospect) {
      const pr = m.data.prospect;
      extra = panel('Internal assessment (Relationship Management)', kv([
        ['Prospect', e(pr.name) + ', ' + e(pr.city) + ' (' + pr.c + ')'], ['Estimated total wealth', 'CHF ' + U.fmtMio(pr.wealth)],
        ['First deposit', pr.ccy + ' ' + U.fmt(pr.amount, 0) + ' · ' + { cash: 'cash (counter)', home: 'wire from ' + G.cname(pr.c), offshore: 'wire from offshore bank', ch: 'transfer from Swiss bank' }[pr.method]],
        ['Proposed fee', U.fmt(pr.fee * 100, 2) + '% p.a. → approx. CHF ' + U.fmt(pr.amount * G.rate(pr.ccy) * pr.fee, 0) + ' p.a. on first deposit'],
        ['Risk class', riskSt(pr.risk)], ['Form A', pr.refuseA ? st('bad', 'client refuses') : st('ok', 'will sign')],
        ['Home exposure', D.COUNTRIES[pr.c].auth ? lvl(s.heat[D.COUNTRIES[pr.c].auth]) + ' ' + e(D.AUTH[D.COUNTRIES[pr.c].auth].short) : '<span class="muted">no active enforcement</span>']
      ]), { icon: 'user' });
    }
    if (m.kind === 'order' && m.data.payment) {
      const p = s.payments.find(function (x) { return x.id === m.data.payment; });
      if (p) extra = '<div class="note info">' + ico('queue') + ' Payment order ' + p.ref + ' – status: <b>' + p.status + '</b>. ' + (p.status === 'pending' ? '<a href="#/pay/queue">Go to release queue ›</a>' : '<a href="#/pay/' + p.id + '">View payment ›</a>') + '</div>';
    }
    let acts = '';
    if (m.actions.length && !m.resolved) {
      acts = '<div class="decide"><b>Decision:</b> ' + m.actions.map(function (a, i) { return btn(e(a[1]), 'decide', ' data-id="' + m.id + '" data-key="' + a[0] + '"', i === 0 ? 'def' : ''); }).join(' ') + (m.due ? ' <span class="muted">Deadline ' + U.fmtDate(m.due) + '</span>' : m.expires ? ' <span class="muted">Valid until ' + U.fmtDate(m.expires) + '</span>' : '') + '</div>';
    } else if (m.resolved) {
      acts = '<div class="resolved">' + ico('check') + ' <b>' + e(m.resolved.label) + '</b> – ' + U.fmtDate(m.resolved.d) + ' ' + U.fmtTime(m.resolved.t) + ' · ' + e(m.resolved.by) + '<br>' + e(m.resolved.text) + '</div>';
    }
    return {
      mod: 'inbox', crumbs: [['Mail & fax', '#/inbox'], [m.id]],
      html: title(e(m.subject), '[POS-0110]') + '<div class="btnbar left noprint">' + btn('‹ Inbox', 'go', ' data-href="#/inbox"') + btn(ico('print') + ' Print', 'print') + '</div>' +
        acts + extra + doc
    };
  };

  V.notFound = function (what) {
    return { mod: 'overview', crumbs: [['Error']], html: title('Not found', '[ERR-0404]') + '<div class="errbox">' + ico('warn') + ' ' + e(what) + ' does not exist or is no longer available. (PBS-E-0404)</div>' };
  };

  /* ---------- Handbuch ---------- */
  V.handbook = function () {
    return '<div class="hb"><h3>PBS/Web – Handbook for the Managing Partner</h3>' +
      '<p>You run <b>Bankhaus Vogt &amp; Cie</b>, a small Zurich private bank, in 2003 – the golden age of Swiss banking secrecy. Your clients pay handsome fees to keep their money discreetly away from their home tax authorities. Your job: grow assets and profit without losing your banking licence or ending up in a foreign courtroom.</p>' +
      '<h4>The daily routine</h4><ol><li><b>Mail &amp; fax</b>: read memos, accept or decline new clients, answer authorities.</li><li><b>Payments → Release queue</b>: clients fax payment orders. Release, reject or edit them (debit a domiciliary company\'s account, omit the originator name).</li><li><b>Cash desk</b>: couriers bring banknotes, clients want cash. Serve them before the end of day.</li><li><b>Compliance → Alerts</b>: clear transaction-monitoring alerts within 10 business days. Thin documentation may be found by the auditors.</li><li><b>End of day</b> (button top right): runs the batch, advances the value date and brings new events.</li></ol>' +
      '<h4>Money</h4><p>You earn an annual fee on assets under management (accrued daily, debited quarterly), commissions on payments and cash, FX margins and fees for domiciliary companies. Running costs start at about CHF 12,400 per business day and grow with the assets you manage. Equity capital must stay above CHF 10 million.</p>' +
      '<h4>Risk</h4><p>The <b>Risk monitor</b> estimates how much attention the bank attracts from the EBK (the Swiss regulator) and from tax authorities in the US, Germany, Italy, France and the UK. At 100 the game is over: licence withdrawal, indictment or arrest warrant.</p>' +
      '<ul><li>Payments into a client\'s home country leave a paper trail. Domiciliary companies, hold mail and "one of our clients" reduce it.</li><li>PEP and increased-risk clients pay higher fees and attract the EBK.</li><li>Foreign authorities send <b>mutual assistance requests</b>. Object if it is only tax evasion; produce documents if it is tax fraud. Read the legal note.</li><li>Reporting a client to MROS calms the EBK but costs the client and confidence.</li><li>Unhappy clients leave and take their money with them.</li></ul>' +
      '<p class="small muted">All persons, banks and companies are fictitious. The game state is saved automatically in this browser.</p></div>';
  };

  V.gameOver = function (go) {
    const B = D.BANK;
    return '<div class="paper"><div class="mast">Zürcher Finanzblatt</div>' +
      '<div class="dateline">' + U.longDate(go.d) + ' · Unabhängige Tageszeitung für Wirtschaft und Finanzen · Fr. 3.20</div>' +
      '<h1>' + e(go.head) + '</h1><h2>' + e(go.sub) + '</h2>' +
      '<div class="cols3"><p><b>Zürich.</b> ' + e(go.body) + '</p><p>' + e(B.name) + ', founded in ' + B.founded + ', managed CHF ' + U.fmtMio(go.aum) + ' at the end. Its managing partner declined to comment. "Banking secrecy is not a licence for everything," a spokesman for the Federal Department of Finance said.</p></div>' +
      '<div class="tenure"><b>Your tenure</b><br>' + go.days + ' business days · peak AuM CHF ' + U.fmtMio(go.peak) + ' · final equity CHF ' + U.fmtMio(go.capital) + '</div>' +
      '<div class="btnbar"><button class="btn def" data-act="restart">Start again (new game)</button></div></div>';
  };
})(window.PBS);
