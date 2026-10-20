/* PBS/Web 4.2 – Masken: gemeinsame Bausteine. Views only read state; changes go through PBS.Game. */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U;
  const e = U.esc;
  const tr = PBS.L.t;
  PBS.Views = PBS.Views || {};
  const H = PBS.H = {};
  H.S = function () { return G.state; };
  H.f = function (key) { PBS.UI.f[key] = PBS.UI.f[key] || {}; return PBS.UI.f[key]; };
  H.e = e;

  H.ico = function (n) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  H.dec = function (ccy) { return G.dec(ccy); };
  H.ccyL = function (ccy) { return ccy === 'XAU' ? 'XAU&nbsp;oz' : ccy; };
  H.num = function (n, d) { return '<span class="' + (n < -0.0005 ? 'neg' : '') + '">' + U.fmt(n, d === undefined ? 2 : d) + '</span>'; };
  H.chg = function (n, d, suffix) {
    if (Math.abs(n) < 0.0005) return '<span class="flat">±0' + (suffix || '') + '</span>';
    return '<span class="' + (n < 0 ? 'neg' : 'pos') + '">' + (n > 0 ? '+' : '') + U.fmt(n, d) + (suffix || '') + '</span>';
  };
  // Für Risikogrössen: Anstieg ist schlecht (rot), Rückgang gut (grün)
  H.chgRisk = function (n, d) {
    if (Math.abs(n) < 0.0005) return '<span class="flat">±0</span>';
    return '<span class="' + (n > 0 ? 'neg' : 'pos') + '">' + (n > 0 ? '+' : '') + U.fmt(n, d) + '</span>';
  };
  H.pct = function (x, d) { return U.fmt(x * 100, d === undefined ? 1 : d) + '%'; };
  H.title = function (t, code, sub) {
    return '<div class="ptitle"><h1>' + t + '</h1><span class="scode">' + code + '</span></div>' + (sub ? '<div class="psub">' + sub + '</div>' : '');
  };
  H.panel = function (t, body, o) {
    o = o || {};
    return '<div class="panel' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '><div class="ph"><span>' + (o.icon ? H.ico(o.icon) : '') + t + '</span>' +
      (o.tools ? '<span class="tools">' + o.tools + '</span>' : '') + '</div><div class="pb' + (o.flush ? ' flush' : '') + '">' + body + '</div></div>';
  };
  H.grid = function (head, rows, o) {
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
  };
  H.kv = function (pairs, cls) {
    return '<table class="kv' + (cls ? ' ' + cls : '') + '">' + pairs.map(function (p) { return '<tr><th>' + p[0] + '</th><td>' + p[1] + '</td></tr>'; }).join('') + '</table>';
  };
  H.btn = function (label, act, attrs, cls) {
    return '<button type="button" class="btn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (attrs || '') + '>' + label + '</button>';
  };
  H.st = function (cls, label) { return '<span class="st st-' + cls + '"><i></i>' + label + '</span>'; };
  H.lvl = function (v) { const l = G.level(v); return H.st(l.cls, l.label); };
  H.bar = function (v, cls, big) {
    return '<div class="bar' + (big ? ' big' : '') + '"><div class="fill lv-' + (cls || G.level(v).cls) + '" style="width:' + U.clamp(v, 0, 100).toFixed(1) + '%"></div></div>';
  };
  H.stars = function (n) { let x = ''; for (let i = 1; i <= 5; i++) x += i <= n ? '★' : '☆'; return '<span class="stars" title="' + n + ' of 5">' + x + '</span>'; };
  H.cref = function (c, withName) {
    if (!c) return '';
    return '<a href="#/client/' + c.id + '">' + c.id + '</a>&nbsp;<b>' + e(c.rubrik) + '</b>' + (withName ? '<br><span class="muted">' + e(c.name) + '</span>' : '');
  };
  H.accLabel = function (a) { return { CUR: tr('Current account (Kontokorrent)', 'Current account'), DEP: tr('Securities portfolio (Depot)', 'Securities portfolio'), MET: tr('Precious metals (Edelmetall)', 'Precious metals account') }[a.type]; };
  H.accShort = function (a) { return { CUR: tr('Kontokorrent', 'Current'), DEP: tr('Depot', 'Portfolio'), MET: tr('Edelmetall', 'Metals') }[a.type]; };
  H.riskSt = function (r) { return r === 'PEP' ? H.st('bad', 'PEP') : r === 'Increased' ? H.st('warn', 'Increased') : H.st('ok', 'Normal'); };
  H.cty = function (c) { return '<span class="cc">' + e(c) + '</span>'; };
  H.clientsSelect = function (name, sel, filter) {
    const list = G.activeClients().filter(filter || function () { return true; });
    return '<select name="' + name + '" class="inp">' + '<option value="">– select –</option>' + list.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + c.id + ' ' + e(c.rubrik) + ' – ' + e(c.name) + '</option>';
    }).join('') + '</select>';
  };
  H.accountOptions = function (filter, sel) {
    return G.activeClients().map(function (c) {
      const accs = G.clientAccounts(c.id).filter(filter);
      if (!accs.length) return '';
      return '<optgroup label="' + c.id + ' ' + e(c.rubrik) + '">' + accs.map(function (a) {
        return '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + a.id + ' · ' + a.ccy + ' · ' + H.accShort(a) +
          (a.entity ? ' · ' + e(G.entity(a.entity).name) : '') + ' · ' + U.fmt(a.bal, a.type === 'DEP' ? 2 : H.dec(a.ccy)) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  };
  H.staffSelect = function (name, role, sel) {
    return '<select name="' + name + '" class="inp"><option value="">– select –</option>' + G.activeStaff(role).map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + e(x.name) + (x.absentUntil && x.absentUntil >= H.S().date ? ' (absent)' : '') + '</option>';
    }).join('') + '</select>';
  };
  H.paras = function (t) { return e(t).split('\n').join('<br>'); };
  H.time = function () { const s = H.S(); return U.fmtTime(s.clock); };
  H.dur = function (min) { return '<span class="dur" title="Working time">' + H.ico('clock') + ' ' + min + ' min</span>'; };
  H.spark = function (arr, w, h) {
    const min = Math.min.apply(null, arr), max = Math.max.apply(null, arr);
    const pts = arr.map(function (v, i) { return (i * (w - 2) / Math.max(1, arr.length - 1) + 1).toFixed(1) + ',' + (h - 1 - (v - min) * (h - 2) / (max - min || 1)).toFixed(1); });
    return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline points="' + pts.join(' ') + '"/></svg>';
  };
  // Verlaufslinie mit Fadenkreuz (eine Serie: kein Legendenfeld, der Titel nennt die Serie)
  H.lineChart = function (series, unit, decimals) {
    if (series.length < 2) return '<div class="muted pad">Not enough data.</div>';
    const W = 640, Hh = 200, pl = 56, pr = 14, pt = 12, pb = 28;
    const vals = series.map(function (p) { return p[1]; });
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const span = Math.max(Math.abs(max) * 0.02 || 1, max - min);
    const raw = span / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).find(function (x) { return x >= raw; });
    min = Math.floor((min - span * 0.08) / step) * step;
    max = Math.ceil((max + span * 0.08) / step) * step;
    const x = function (i) { return pl + i * (W - pl - pr) / (series.length - 1); };
    const y = function (v) { return pt + (max - v) * (Hh - pt - pb) / (max - min); };
    let g = '';
    for (let v = min; v <= max + step / 2; v += step) {
      g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" class="gl"/>' +
        '<text x="' + (pl - 6) + '" y="' + (y(v) + 3.5).toFixed(1) + '" class="ax" text-anchor="end">' + U.fmt(v, step < 1 ? 1 : 0) + '</text>';
    }
    const every = Math.ceil(series.length / 6);
    series.forEach(function (p, i) {
      if (i % every === 0 || i === series.length - 1) {
        g += '<line x1="' + x(i).toFixed(1) + '" x2="' + x(i).toFixed(1) + '" y1="' + (Hh - pb) + '" y2="' + (Hh - pb + 4) + '" class="tk"/>' +
          '<text x="' + x(i).toFixed(1) + '" y="' + (Hh - pb + 15) + '" class="ax" text-anchor="middle">' + U.fmtDate(p[0]).slice(0, 5) + '</text>';
      }
    });
    const pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    const area = 'M' + pl + ',' + (Hh - pb) + ' L' + pts.join(' L') + ' L' + x(vals.length - 1).toFixed(1) + ',' + (Hh - pb) + ' Z';
    const data = series.map(function (p, i) { return [x(i).toFixed(1), y(vals[i]).toFixed(1), U.fmtDate(p[0]), U.fmt(vals[i], decimals === undefined ? 2 : decimals) + (unit ? ' ' + unit : '')]; });
    return '<div class="chart" data-points="' + e(JSON.stringify(data)) + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img">' + g +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (Hh - pb) + '" y2="' + (Hh - pb) + '" class="axl"/>' +
      '<path d="' + area + '" class="ar"/><polyline points="' + pts.join(' ') + '" class="ln"/>' +
      '<line class="cx hidden" x1="0" x2="0" y1="' + pt + '" y2="' + (Hh - pb) + '"/><circle class="cd hidden" r="4"/>' +
      '<rect class="hit" x="' + pl + '" y="' + pt + '" width="' + (W - pl - pr) + '" height="' + (Hh - pt - pb) + '"/></svg>' +
      '<div class="ctip hidden"></div></div>';
  };
  H.tabs = function (base, list, cur) {
    return '<div class="tabs">' + list.map(function (t) { return '<a href="#/' + base + t[0] + '" class="' + (t[0] === cur ? 'on' : '') + '">' + t[1] + '</a>'; }).join('') + '</div>';
  };
  H.filter = function (html) { return '<div class="filter">' + html + '</div>'; };
  H.sel = function (attr, options, cur) {
    return '<select class="inp" ' + attr + '>' + options.map(function (o) {
      const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + e(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + e(l) + '</option>';
    }).join('') + '</select>';
  };
  H.note = function (html, cls) { return '<div class="note' + (cls ? ' ' + cls : '') + '">' + H.ico(cls === 'info' ? 'info' : 'info') + ' <div>' + html + '</div></div>'; };
})(window.PBS);
