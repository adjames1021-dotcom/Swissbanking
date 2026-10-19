/* PBS/Web 4.2 – Präsentationssteuerung: Anmeldung, Navigation, Dialoge, Tagesabschluss */
(function (PBS) {
  'use strict';

  const G = PBS.Game, V = PBS.Views, D = PBS.DATA, U = PBS.U;
  const e = U.esc;
  const UI = PBS.UI = { f: {}, draft: null, path: '', mod: '', recent: [], sessionEnd: 0, tickerKey: '', prevLogin: null };
  const SESSION_MS = 30 * 60 * 1000;
  function $(id) { return document.getElementById(id); }

  /* ---------- Sicherheits-Token ---------- */
  function tokenCode(slot) {
    let h = Math.imul(slot, 2654435761) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995) >>> 0;
    h = (h ^ (h >>> 15)) >>> 0;
    return String(h % 1000000).padStart(6, '0');
  }
  function tokenTick() {
    const now = Date.now();
    const left = 30 - Math.floor((now % 30000) / 1000);
    $('fob-code').textContent = tokenCode(Math.floor(now / 30000));
    const on = Math.ceil(left / 5);
    Array.prototype.forEach.call($('fob-bars').children, function (b, i) { b.className = i < 6 - on ? 'off' : ''; });
  }

  /* ---------- Bildschirme ---------- */
  function show(id) {
    ['login', 'connecting', 'app'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
  }

  function loginInfo() {
    const box = $('lg-save');
    const st = G.hasSave() ? G.load() : null;
    if (st) {
      box.textContent = 'Saved session found – value date ' + U.fmtDate(st.date) + ', ' + st.clients.filter(function (c) { return c.status === 'active'; }).length + ' relationships. It will be restored.';
      box.classList.remove('hidden');
    } else box.classList.add('hidden');
  }

  function loginError(lines, info) {
    const box = $('lg-err');
    box.innerHTML = lines.map(function (l) { return '<div><svg class="ico"><use href="#i-' + (info ? 'info' : 'warn') + '"/></svg> ' + e(l) + '</div>'; }).join('');
    box.classList.remove('hidden');
  }

  function onLogin(ev) {
    ev.preventDefault();
    const uid = $('lg-user').value.trim().toUpperCase();
    const pw = $('lg-pw').value;
    const tok = $('lg-tok').value.trim();
    const errs = [];
    if (!/^[A-Z0-9]{3,8}$/.test(uid)) errs.push('PBS-AUTH-0101 The user ID is invalid (3–8 letters or digits).');
    if (!pw) errs.push('PBS-AUTH-0104 Please enter your password.');
    const slot = Math.floor(Date.now() / 30000);
    if (tok !== tokenCode(slot) && tok !== tokenCode(slot - 1)) errs.push('PBS-AUTH-0112 Token code not valid. Enter the six digits currently shown on your token.');
    if (errs.length) {
      loginError(errs);
      $('lg-tok').value = '';
      $(pw ? 'lg-tok' : 'lg-pw').focus();
      return;
    }
    $('lg-err').classList.add('hidden');
    let st = G.load();
    const resumed = !!st;
    if (!st) st = G.newGame(uid);
    UI.prevLogin = st.user.last;
    G.login(uid);
    st.user.last = { d: st.date, t: st.clock, ws: 'ZH-BS64-0217' };
    G.save();
    $('lg-pw').value = '';
    $('lg-tok').value = '';
    connect(uid, resumed);
  }

  function connect(uid, resumed) {
    show('connecting');
    const n = G.activeClients().length;
    const steps = ['Authenticating user ' + uid + ' against VOGT-ZH domain …', 'Opening session on PBSPRD01 (AIX 5.1) …', 'Loading mandate 001 – Zürich …', 'Loading client book (' + n + ' relationships) …', 'Checking mail and fax …', 'Starting PBS/Web …'];
    let i = 0;
    $('conn-bar').style.width = '0';
    (function step() {
      if (i < steps.length) {
        $('conn-text').textContent = steps[i];
        $('conn-bar').style.width = ((i + 1) / steps.length * 100) + '%';
        i++;
        setTimeout(step, 260 + Math.random() * 260);
        return;
      }
      show('app');
      touch();
      const target = resumed ? (location.hash.length > 2 ? location.hash : '#/overview') : '#/inbox/M0001';
      if (location.hash === target) render(); else location.hash = target;
      setStatus(resumed ? 'Session restored. Welcome back.' : 'Welcome. Please read the memo from the Senior Partner.');
    })();
  }

  function logout(reason) {
    G.save();
    closeAllDialogs();
    show('login');
    loginInfo();
    if (reason) loginError([reason], true); else $('lg-err').classList.add('hidden');
    $('lg-pw').focus();
  }

  /* ---------- Sitzung ---------- */
  function touch() { UI.sessionEnd = Date.now() + SESSION_MS; }
  function sessionTick() {
    if ($('app').classList.contains('hidden')) return;
    const left = Math.max(0, UI.sessionEnd - Date.now());
    const c = $('sb-session');
    if (c) c.textContent = 'Session ' + U.pad(Math.floor(left / 60000), 2) + ':' + U.pad(Math.floor(left / 1000) % 60, 2);
    if (left <= 0) logout('PBS-AUTH-0230 Your session expired after 30 minutes of inactivity. Please sign on again.');
  }

  // Statuszeile: Meldung bleibt einige Sekunden stehen, auch über ein Neuzeichnen hinweg
  let statusTimer = null;
  function setStatus(text) {
    UI.status = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { UI.status = ''; paintStatus(); }, 7000);
    paintStatus();
  }
  function paintStatus() {
    const c = $('sb-msg');
    if (!c) return;
    c.textContent = UI.status || 'Ready';
    c.classList.toggle('flash', !!UI.status);
  }

  /* ---------- Routing ---------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('?');
    const q = {};
    if (parts[1]) parts[1].split('&').forEach(function (kv) { const p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return { path: parts[0] || 'overview', q: q };
  }

  const ROUTES = [
    [/^overview$/, function () { return V.overview(); }],
    [/^market$/, function () { return V.market(); }],
    [/^trip$/, function () { return V.trip(); }],
    [/^clients$/, function () { return V.clients(); }],
    [/^client\/([\d.]+)(?:\/(\w+))?$/, function (m) { remember(m[1]); return V.client(m[1], m[2]); }],
    [/^accounts$/, function () { return V.accounts(); }],
    [/^account\/([\d.]+)$/, function (m) { return V.account(m[1]); }],
    [/^pay\/queue$/, function () { return V.payQueue(); }],
    [/^pay\/new$/, function (m, q) { return V.payNew(q); }],
    [/^pay\/transfer$/, function (m, q) { return V.payTransfer(q); }],
    [/^pay\/cash$/, function () { return V.cashDesk(); }],
    [/^pay\/done$/, function () { return V.payDone(); }],
    [/^pay\/(P\d+)$/, function (m) { return V.payView(m[1]); }],
    [/^compliance$/, function () { return V.risk(); }],
    [/^compliance\/alerts$/, function () { return V.alerts(); }],
    [/^compliance\/mla$/, function () { return V.mla(); }],
    [/^compliance\/audits$/, function () { return V.audits(); }],
    [/^companies$/, function () { return V.companies(); }],
    [/^companies\/new$/, function (m, q) { return V.companyNew(q); }],
    [/^reports\/pl$/, function () { return V.pl(); }],
    [/^reports\/aum$/, function () { return V.aumReport(); }],
    [/^reports\/journal$/, function () { return V.journal(); }],
    [/^inbox$/, function () { return V.inbox(); }],
    [/^inbox\/(M\d+)$/, function (m) { G.markRead(m[1]); return V.message(m[1]); }]
  ];

  function remember(id) {
    UI.recent = [id].concat(UI.recent.filter(function (x) { return x !== id; })).slice(0, 6);
  }

  function render(keepScroll) {
    if (!G.state || $('app').classList.contains('hidden')) return;
    const r = parseHash();
    let view = null;
    for (let i = 0; i < ROUTES.length; i++) {
      const m = r.path.match(ROUTES[i][0]);
      if (m) { view = ROUTES[i][1](m, r.q); break; }
    }
    if (!view) view = V.notFound('Page "' + r.path + '"');
    const content = $('content');
    const sc = content.scrollTop;
    content.innerHTML = view.html;
    content.scrollTop = keepScroll ? sc : 0;
    UI.mod = view.mod;
    UI.path = r.path;
    renderChrome(view);
    if (G.state.gameOver) showGameOver();
  }

  /* ---------- Rahmen ---------- */
  const MODS = [
    { key: 'overview', label: 'Overview', href: '#/overview' },
    { key: 'clients', label: 'Clients', href: '#/clients' },
    { key: 'accounts', label: 'Accounts', href: '#/accounts' },
    { key: 'payments', label: 'Payments', href: '#/pay/queue', badge: function () { return G.pendingPayments().length + G.state.counter.length; } },
    { key: 'compliance', label: 'Compliance', href: '#/compliance', badge: function () { return G.openAlerts().length; } },
    { key: 'companies', label: 'Domiciliary cos.', href: '#/companies' },
    { key: 'reports', label: 'Reports', href: '#/reports/pl' },
    { key: 'inbox', label: 'Mail & fax', href: '#/inbox', badge: function () { return G.unread(); } }
  ];

  function navItems(mod) {
    const s = G.state;
    switch (mod) {
      case 'clients': {
        const items = [['clients', 'Client book', 'folder']];
        UI.recent.forEach(function (id) {
          const c = G.client(id);
          if (c) items.push(['client/' + id, c.id + ' ' + c.rubrik, 'user', true]);
        });
        return items;
      }
      case 'accounts': return [['accounts', 'Account list', 'folder']];
      case 'payments': return [['pay/queue', 'Release queue', 'queue', false, G.pendingPayments().length], ['pay/new', 'New payment (MT103)', 'doc'], ['pay/transfer', 'Internal transfer', 'swap'], ['pay/cash', 'Cash desk (Kasse)', 'cash', false, s.counter.length], ['pay/done', 'Payment journal', 'list']];
      case 'compliance': return [['compliance', 'Risk monitor', 'shield'], ['compliance/alerts', 'Alerts', 'warn', false, G.openAlerts().length], ['compliance/mla', 'Mutual assistance', 'scale', false, s.messages.filter(function (m) { return m.kind === 'mla' && !m.resolved; }).length], ['compliance/audits', 'Audit reports', 'doc']];
      case 'companies': return [['companies', 'Company register', 'building'], ['companies/new', 'Incorporate company', 'plus']];
      case 'reports': return [['reports/pl', 'Profit & loss', 'chart'], ['reports/aum', 'AuM by domicile', 'chart'], ['reports/journal', 'Booking journal', 'list']];
      case 'inbox': return [['inbox', 'Inbox', 'mail', false, G.unread()]];
      default: return [['overview', 'Dashboard', 'home'], ['market', 'Market data', 'chart'], ['trip', 'Acquisition trip', 'plane']];
    }
  }

  function renderChrome(view) {
    const s = G.state;
    const last = UI.prevLogin;
    $('hdr-r').innerHTML = 'User <b>' + e(s.user.id) + '</b> (Managing Partner) · Mandant 001 Zürich<br>' +
      'Value date <b>' + U.weekday(s.date) + ' ' + U.fmtDate(s.date) + '</b> · ' + U.fmtTime(s.clock) + '<br>' +
      (last ? 'Last sign-on ' + U.fmtDate(last.d) + ' ' + U.fmtTime(last.t) + ' from ' + e(last.ws) : '');

    $('menubar').innerHTML = MODS.map(function (m) {
      const b = m.badge ? m.badge() : 0;
      return '<a href="' + m.href + '" class="' + (m.key === view.mod ? 'on' : '') + '">' + m.label + (b ? '<span class="badge">' + b + '</span>' : '') + '</a>';
    }).join('');

    $('crumbs').innerHTML = 'You are here: ' + view.crumbs.map(function (c) {
      return c[1] ? '<a href="' + c[1] + '">' + e(c[0]) + '</a>' : e(c[0]);
    }).join('<span class="sep">›</span>');

    const modLabel = (MODS.find(function (m) { return m.key === view.mod; }) || MODS[0]).label;
    const tree = navItems(view.mod).map(function (it) {
      const on = UI.path === it[0] || UI.path.indexOf(it[0] + '/') === 0 && it[3];
      return '<li class="' + (it[3] ? 'sub' : '') + '"><a href="#/' + it[0] + '" class="' + (on ? 'on' : '') + '">' + V.ico(it[2]) + '<span>' + e(it[1]) + '</span>' + (it[4] ? '<span class="cnt">(' + it[4] + ')</span>' : '') + '</a></li>';
    }).join('');
    const m = s.market, pm = s.prevMarket;
    const q = ['SMI', 'USD', 'EUR', 'XAU'].map(function (k) {
      const p = (m[k] / pm[k] - 1) * 100;
      return '<div class="row"><span>' + D.MARKET_LABEL[k][0] + '</span><span>' + U.fmt(m[k], k === 'SMI' || k === 'XAU' ? 2 : 4) + ' <span class="' + (p >= 0 ? 'pos' : 'neg') + '">' + (p >= 0 ? '▲' : '▼') + '</span></span></div>';
    }).join('');
    $('nav').innerHTML =
      '<div class="navsec"><h3>' + e(modLabel) + '</h3><ul class="tree">' + tree + '</ul></div>' +
      '<div class="navsec"><h3>Quick search</h3><form data-form="qsearch" class="qs"><input class="inp" name="q" placeholder="No. / codename / name"><button class="btn sm" type="submit">' + V.ico('search') + '</button></form></div>' +
      '<div class="navsec"><h3>Value date (Valuta)</h3><div class="navbox"><div class="big">' + U.weekday(s.date) + ' ' + U.fmtDate(s.date) + '</div>' +
      '<div class="row"><span>Time</span><b>' + U.fmtTime(s.clock) + '</b></div><div class="row"><span>Business day no.</span><b>' + s.dayNo + '</b></div>' +
      '<button class="btn eod" type="button" data-act="eod" title="F9">' + V.ico('clock') + ' End of day ▸</button></div></div>' +
      '<div class="navsec"><h3>Telekurs</h3><div class="navbox">' + q + '</div></div>';

    $('statusbar').innerHTML =
      '<div class="cell grow msg" id="sb-msg"></div>' +
      '<div class="cell">' + V.ico('net') + ' ' + D.BANK.host + ' · DB2</div>' +
      '<div class="cell">User ' + e(s.user.id) + '</div>' +
      '<div class="cell">Valuta ' + U.fmtDate(s.date) + ' ' + U.fmtTime(s.clock) + '</div>' +
      '<div class="cell" id="sb-session">Session 30:00</div>' +
      '<div class="cell">' + V.ico('lock') + ' SSL 128-bit</div>' +
      '<div class="cell">' + V.ico('net') + ' Local intranet</div>';
    sessionTick();
    paintStatus();

    const quotes = ['SMI', 'USD', 'EUR', 'GBP', 'XAU'].map(function (k) {
      const p = (m[k] / pm[k] - 1) * 100;
      return D.MARKET_LABEL[k][0] + ' ' + U.fmt(m[k], k === 'SMI' || k === 'XAU' ? 2 : 4) + ' <span class="' + (p >= 0 ? 'up' : 'dn') + '">' + (p >= 0 ? '▲' : '▼') + U.fmt(Math.abs(p), 2) + '%</span>';
    });
    const news = s.news.slice(-8).reverse().map(function (n) { return U.fmtDate(n.d).slice(0, 5) + ' ' + e(n.text.toUpperCase()); });
    const key = s.date + '|' + news.join('|');
    if (key !== UI.tickerKey) {
      UI.tickerKey = key;
      const tk = $('tk');
      tk.innerHTML = quotes.join('<span class="sep"> · </span>') + '<span class="sep"> +++ </span>' + news.join('<span class="sep"> +++ </span>');
      tk.style.animationDuration = Math.max(40, tk.scrollWidth / 75) + 's';
    }
  }

  /* ---------- Dialoge ---------- */
  const Dlg = {
    open: function (o) {
      const ov = document.createElement('div');
      ov.className = 'dlg-ov';
      const btns = o.buttons || [{ label: 'OK', def: true }];
      ov.innerHTML = '<div class="dlg" role="dialog" aria-modal="true" aria-label="' + e(o.title) + '" style="width:' + (o.width || 420) + 'px">' +
        '<div class="dlg-tb"><span>' + e(o.title) + '</span><button class="dlg-x" type="button" aria-label="Close">✕</button></div>' +
        '<div class="dlg-body">' + o.body + '</div><div class="dlg-btns">' +
        btns.map(function (b, i) { return '<button type="button" class="btn' + (b.def ? ' def' : '') + '" data-i="' + i + '">' + b.label + '</button>'; }).join('') + '</div></div>';
      $('dlg-layer').appendChild(ov);
      const close = function () { ov.remove(); };
      ov.querySelector('.dlg-x').onclick = close;
      ov.querySelectorAll('.dlg-btns .btn').forEach(function (b) {
        b.onclick = function () {
          const bd = btns[+b.dataset.i];
          if (bd.fn && bd.fn(ov) === false) return;
          close();
        };
      });
      ov.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && !o.noEsc) close();
        if (ev.key === 'Enter' && ['TEXTAREA', 'BUTTON', 'SELECT'].indexOf(ev.target.tagName) < 0) {
          const d = ov.querySelector('.dlg-btns .btn.def');
          if (d && !d.disabled) { ev.preventDefault(); d.click(); }
        }
      });
      setTimeout(function () {
        const f = ov.querySelector('.dlg-body select, .dlg-body input:not([type=radio]):not([type=checkbox])') || ov.querySelector('.dlg-btns .btn.def') || ov.querySelector('.dlg-btns .btn');
        if (f) f.focus();
      }, 0);
      if (o.onOpen) o.onOpen(ov);
      return { el: ov, close: close };
    },
    msg: function (title, html, kind) {
      return Dlg.open({ title: title, body: '<div class="dlg-msg"><svg class="ico32"><use href="#i-' + (kind || 'biginfo') + '"/></svg><div>' + html + '</div></div>' });
    },
    confirm: function (title, html, onYes, kind, yesLabel) {
      return Dlg.open({
        title: title, body: '<div class="dlg-msg"><svg class="ico32"><use href="#i-' + (kind || 'ques') + '"/></svg><div>' + html + '</div></div>',
        buttons: [{ label: yesLabel || 'Yes', def: true, fn: function () { onYes(); } }, { label: 'No' }]
      });
    }
  };
  function closeAllDialogs() { $('dlg-layer').innerHTML = ''; }

  // Ergebnis einer Spielaktion anzeigen
  function done(res, okText) {
    if (!res || !res.ok) {
      Dlg.msg('PBS/Web – Error', e(res ? res.msg : 'Unknown error'), 'err');
      return false;
    }
    if (okText) setStatus(okText);
    render(true);
    return true;
  }
  function alertNotice(al, prefix) {
    if (!al) return;
    Dlg.msg('Transaction monitoring', (prefix ? prefix + '<br><br>' : '') + 'Alert <b>' + al.id + '</b> has been created:<br>' + al.rules.map(function (r) { return '<b>' + r + '</b> ' + e(D.RULES[r]); }).join('<br>') + '<br><br>Due for clearing by ' + U.fmtDate(al.due) + '.', 'bigwarn');
  }

  /* ---------- Spielende ---------- */
  function showGameOver() {
    const go = $('gameover');
    if (!go.classList.contains('hidden')) return;
    go.innerHTML = V.gameOver(G.state.gameOver);
    go.classList.remove('hidden');
  }
  function newGame() {
    const uid = G.state ? G.state.user.id : 'E10001';
    G.reset();
    G.newGame(uid);
    $('gameover').classList.add('hidden');
    $('gameover').innerHTML = '';
    closeAllDialogs();
    UI.f = {};
    UI.draft = null;
    UI.recent = [];
    UI.tickerKey = '';
    UI.prevLogin = G.state.user.last;
    if (location.hash === '#/inbox/M0001') render(); else location.hash = '#/inbox/M0001';
    setStatus('New game started. Please read the memo from the Senior Partner.');
  }

  /* ---------- Tagesabschluss ---------- */
  function runEOD() {
    const s = G.state;
    if (!s || s.gameOver) return;
    const warn = [];
    if (s.counter.length) warn.push(s.counter.length + ' client(s) waiting at the cash desk will leave unserved');
    const pp = G.pendingPayments().length;
    if (pp) warn.push(pp + ' payment(s) remain in the release queue');
    const od = G.overdueAlerts().length;
    if (od) warn.push(od + ' compliance alert(s) are overdue');
    const ar = G.actionRequired().length;
    if (ar) warn.push(ar + ' decision(s) pending in mail');
    const body = 'Start end-of-day processing (Tagesabschluss) for value date <b>' + U.weekday(s.date) + ' ' + U.fmtDate(s.date) + '</b>?' +
      (warn.length ? '<ul class="hints" style="margin-top:8px">' + warn.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul>' : '<br><br>All pending items have been dealt with.');
    Dlg.confirm('End of day', body, function () { setTimeout(doEOD, 30); }, warn.length ? 'bigwarn' : 'ques', 'Start batch');
  }

  function doEOD() {
    const res = G.endOfDay();
    let sec = res.start * 60 + 7;
    const ts = function () { sec += 1 + Math.floor(Math.random() * 9); return U.pad(Math.floor(sec / 3600) % 24, 2) + ':' + U.pad(Math.floor(sec / 60) % 60, 2) + ':' + U.pad(sec % 60, 2); };
    const lines = [];
    lines.push(['h', ts() + '  PBSEOD01  JOB 0' + (400 + G.state.dayNo) + ' STARTED  MANDANT 001  VALUTA ' + U.fmtDate(res.closing)]);
    lines.push(['', ts() + '  PBSEOD01  ALLOC DB2 PRD.PBS01 ............................. OK']);
    res.log.forEach(function (l) {
      const txt = ts() + '  ' + (l[0] === 'EVT' ? '          EVT     ' : 'PBSEOD01  ' + l[0] + ' ') + (l[1] + ' ').padEnd(l[0] === 'EVT' ? 36 : 34, '.') + ' ' + l[2];
      const warnish = /UEBERFAELLIG|NICHT BEDIENT|WARNUNG|GEFUNDEN|VERWEIGERT|FESTSTELLUNG/.test(l[2]);
      lines.push([l[0] === 'EVT' ? (warnish ? 'w' : 'ev') : (warnish ? 'w' : 'ok'), txt]);
    });
    if (res.rc === '0012') {
      lines.push(['er', ts() + '  PBSEOD01  *** ABEND U0012 – EXTERNAL EVENT – NOTIFY MANAGEMENT ***']);
    }
    lines.push(['h', ts() + '  PBSEOD01  JOB ENDED  RC=' + res.rc + '  NEW VALUE DATE ' + U.fmtDate(res.date)]);

    let ok = null;
    const d = Dlg.open({
      title: 'Batch job PBSEOD01 – Mandant 001 Zürich', width: 712, noEsc: true,
      body: '<div class="batch" id="batchlog"></div><div class="small muted" style="margin-top:6px">Output of job PBSEOD01 (SYSOUT class A) · operator console OPS-ZH-02</div>',
      buttons: [{ label: 'OK', def: true, fn: function () {
        render();
        const s = G.state;
        if (!s.gameOver) setStatus('New value date ' + U.weekday(s.date) + ' ' + U.fmtDate(s.date) + ' – ' + G.unread() + ' unread message(s), ' + s.counter.length + ' client(s) at the cash desk.');
      } }]
    });
    ok = d.el.querySelector('.dlg-btns .btn');
    ok.disabled = true;
    const box = d.el.querySelector('#batchlog');
    let i = 0;
    (function next() {
      if (i >= lines.length) { ok.disabled = false; ok.focus(); return; }
      const div = document.createElement('div');
      div.className = lines[i][0];
      div.textContent = lines[i][1];
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
      i++;
      setTimeout(next, 70 + Math.random() * 110);
    })();
  }

  /* ---------- Formulare ---------- */
  function val(f, name) { return f.elements[name] ? String(f.elements[name].value) : ''; }
  function payFromForm(f) {
    const hid = f.querySelector('input[name=hideOrig]:checked');
    return {
      debit: val(f, 'debit'), ccy: val(f, 'ccy'), amount: U.parseAmount(val(f, 'amount')), hideOrig: !!hid && hid.value === '1',
      bic: val(f, 'bic').trim().toUpperCase(), country: val(f, 'country'), benefAcct: val(f, 'benefAcct').trim().toUpperCase(),
      benefName: val(f, 'benefName').trim(), benefAddr: val(f, 'benefAddr').trim(), purpose: val(f, 'purpose').trim(),
      charges: val(f, 'charges') || 'SHA', valuta: U.addBusinessDays(G.state.date, 1)
    };
  }
  function keepDraft(f) {
    const p = payFromForm(f);
    UI.draft = Object.assign({}, p, { amount: val(f, 'amount') });
    return p;
  }

  const FORMS = {
    pay: function (f) {
      const p = keepDraft(f);
      const r = G.submitPayment(p);
      if (!r.ok) {
        const box = $('precheck');
        if (box) box.innerHTML = V.precheckResult(p);
        Dlg.msg('PBS/Web – Payment not accepted', e(r.msg), 'err');
        return;
      }
      UI.draft = null;
      Dlg.msg('Payment entered', 'Payment order <b>' + r.p.ref + '</b> (' + r.p.ccy + ' ' + U.fmt(r.p.amount) + ') has been placed in the release queue.<br>A second signature is required (four-eyes principle).');
      location.hash = '#/pay/queue';
    },
    transfer: function (f) {
      const amount = U.parseAmount(val(f, 'amount'));
      const r = G.transfer(val(f, 'from'), val(f, 'to'), amount, val(f, 'text').trim());
      if (!r.ok) { Dlg.msg('PBS/Web – Error', e(r.msg), 'err'); return; }
      const to = G.account(val(f, 'to'));
      setStatus('Transfer executed.');
      render(true);
      if (r.alert) alertNotice(r.alert, 'Transfer executed.');
      else Dlg.msg('Internal transfer', 'Transfer executed. Credited to ' + to.id + ': <b>' + to.ccy + ' ' + U.fmt(r.credit, to.ccy === 'XAU' ? 3 : 2) + '</b>.');
    },
    trip: function (f) {
      const sel = f.querySelector('input[name=dest]:checked');
      if (!sel) return;
      const r = G.startTrip(sel.value);
      if (done(r, 'Trip booked.')) Dlg.msg('Acquisition trip', 'The trip to <b>' + e(G.cname(sel.value)) + '</b> has been booked (CHF 18,000). Expect introductions over the coming days.');
    },
    entity: function (f) {
      const jur = f.querySelector('input[name=jur]:checked');
      const r = G.createEntity(val(f, 'client'), jur ? jur.value : '', val(f, 'name'), f.elements.withAccount.checked, val(f, 'ccy'));
      if (!r.ok) { Dlg.msg('PBS/Web – Error', e(r.msg), 'err'); return; }
      Dlg.msg('Company incorporated', '<b>' + e(r.entity.name) + '</b> has been incorporated (' + e(D.JURIS[r.entity.jur].label) + ').' + (r.acc ? '<br>Account <b>' + r.acc.id + '</b> (' + r.acc.ccy + ') opened in the name of the company.' : '') + '<br><br>Use <i>Internal transfer</i> to move assets into the company\'s account.');
      location.hash = '#/companies';
    },
    bulkalerts: function (f) {
      const ids = Array.prototype.map.call(f.querySelectorAll('input[name=sel]:checked'), function (c) { return c.value; });
      const just = val(f, 'just');
      if (!ids.length) { Dlg.msg('PBS/Web', 'Please select at least one open alert.', 'bigwarn'); return; }
      if (!just) { Dlg.msg('PBS/Web', 'Please select a justification.', 'bigwarn'); return; }
      const thin = ids.filter(function (id) { return G.alertQuality(G.state.alerts.find(function (a) { return a.id === id; }), just) === 'thin'; }).length;
      const jl = D.JUSTIFICATIONS.find(function (j) { return j[0] === just; })[1];
      Dlg.confirm('Close alerts', 'Close <b>' + ids.length + '</b> alert(s) with the justification <i>' + e(jl) + '</i>?' +
        (thin ? '<br><br><b class="neg">' + thin + ' of them would be thinly documented</b> and may not withstand the annual audit.' : ''), function () {
        const r = G.closeAlerts(ids, just, 'Bulk clearing');
        done(r, r.ok ? r.n + ' alert(s) closed.' : '');
      }, thin ? 'bigwarn' : 'ques', 'Close alerts');
    },
    note: function (f) {
      done(G.addNote(f.dataset.id, val(f, 'text').trim()), 'File note saved.');
    },
    qsearch: function (f) {
      const q = val(f, 'q').trim().toLowerCase();
      if (!q) return;
      const hits = G.state.clients.filter(function (c) { return (c.id + ' ' + c.rubrik + ' ' + c.name).toLowerCase().indexOf(q) >= 0; });
      if (hits.length === 1) location.hash = '#/client/' + hits[0].id;
      else {
        UI.f.clients = { q: q, st: 'all' };
        if (location.hash === '#/clients') render(); else location.hash = '#/clients';
        setStatus(hits.length + ' client(s) found.');
      }
    }
  };

  /* ---------- Aktionen ---------- */
  const ACT = {
    go: function (el) { location.hash = el.dataset.href; },
    print: function () { window.print(); },
    handbook: function () { Dlg.open({ title: 'PBS/Web – Handbook', body: '<div class="inner">' + V.handbook() + '</div>', width: 660 }); },
    logout: function () { Dlg.confirm('Sign off', 'Do you want to sign off from PBS/Web?<br>Your work is saved automatically.', function () { logout(); }); },
    newgame: function () { Dlg.confirm('New game', 'Start a new game?<br>The current bank and all progress will be lost.', newGame, 'bigwarn'); },
    restart: function () { newGame(); },
    eod: function () { runEOD(); },

    holdmail: function (el) {
      const c = G.client(el.dataset.id);
      const on = el.dataset.on === '1';
      Dlg.confirm('Hold mail (banklagernd)', on ? 'Agree hold mail for <b>' + e(c.rubrik) + '</b>?<br>All correspondence will be kept at the bank. Annual fee CHF 600.' :
        'Cancel hold mail for <b>' + e(c.rubrik) + '</b>?<br>Statements will be mailed to ' + e(c.city) + ', ' + e(G.cname(c.dom)) + '.',
      function () { done(G.setHoldMail(c.id, on), on ? 'Hold mail agreed.' : 'Hold mail cancelled.'); });
    },
    forma: function (el) {
      done(G.requestFormA(el.dataset.id), 'Form A sent to client for signature (via hold mail / RM visit).');
    },
    openacc: function (el) {
      const c = G.client(el.dataset.id);
      const ents = G.entitiesOf(c.id);
      const body = '<table class="frm"><tr><th>Holder</th><td><select name="holder" class="inp"><option value="">' + e(c.name) + ' (personal)</option>' +
        ents.map(function (x) { return '<option value="' + x.id + '">' + e(x.name) + '</option>'; }).join('') + '</select></td></tr>' +
        '<tr><th>Account type</th><td><select name="type" class="inp"><option value="CUR">Current account (Kontokorrent)</option><option value="DEP">Securities portfolio (Depot)</option><option value="MET">Precious metals (Edelmetall, gold)</option></select></td></tr>' +
        '<tr><th>Currency</th><td><select name="ccy" class="inp">' + D.CCY.map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select> <span class="small muted">(gold accounts are kept in XAU oz)</span></td></tr></table>';
      Dlg.open({
        title: 'Open account – ' + c.id + ' ' + c.rubrik, width: 460, body: body,
        buttons: [{ label: 'Open account', def: true, fn: function (ov) {
          const g = function (n) { return ov.querySelector('[name=' + n + ']').value; };
          const r = G.openAccount(c.id, g('ccy'), g('type'), g('holder') || null);
          if (done(r)) setStatus('Account ' + r.acc.id + ' opened.');
        } }, { label: 'Cancel' }]
      });
    },
    offboard: function (el) {
      const c = G.client(el.dataset.id);
      Dlg.confirm('Terminate relationship', 'Terminate the relationship <b>' + c.id + ' ' + e(c.rubrik) + '</b>?<br><br>All assets (CHF ' + U.fmt(G.clientAUM(c.id), 0) + ') will be transferred to a bank of the client\'s choice and the accounts closed. Revenue from this client will be lost.',
        function () { done(G.offboard(c.id), 'Relationship ' + c.id + ' terminated.'); }, 'bigwarn', 'Terminate');
    },

    paycheck: function (el) {
      const f = el.closest('form');
      const p = keepDraft(f);
      $('precheck').innerHTML = V.precheckResult(p);
      setStatus('Pre-check completed.');
    },
    payclear: function () { UI.draft = null; render(); },
    payedit: function (el) {
      const p = G.state.payments.find(function (x) { return x.id === el.dataset.id; });
      if (!p) return;
      const body = '<table class="frm"><tr><th>Debit account</th><td><select name="debit" class="inp" style="width:100%">' + V.accountOptions(function (a) { return a.client === p.client && a.type === 'CUR'; }, p.debit) + '</select></td></tr>' +
        '<tr><th>:50K: Originator</th><td><label><input type="checkbox" name="hide"' + (p.hideOrig ? ' checked' : '') + '> "ONE OF OUR CLIENTS" – no name transmitted</label></td></tr>' +
        '<tr><th>:71A: Charges</th><td><select name="charges" class="inp">' + ['SHA', 'OUR', 'BEN'].map(function (x) { return '<option' + (p.charges === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td></tr></table>' +
        '<div class="pcsec">Pre-check with these settings</div><div id="editpc"></div>';
      const read = function (ov) { return { debit: ov.querySelector('[name=debit]').value, hideOrig: ov.querySelector('[name=hide]').checked, charges: ov.querySelector('[name=charges]').value }; };
      Dlg.open({
        title: 'Edit payment ' + p.ref, width: 560, body: body,
        onOpen: function (ov) {
          const upd = function () { ov.querySelector('#editpc').innerHTML = V.precheckResult(Object.assign({}, p, read(ov))); };
          ov.addEventListener('change', upd);
          upd();
        },
        buttons: [{ label: 'Save', def: true, fn: function (ov) { done(G.updatePayment(p.id, read(ov)), 'Payment ' + p.ref + ' changed.'); } }, { label: 'Cancel' }]
      });
    },
    payrelease: function (el) {
      const p = G.state.payments.find(function (x) { return x.id === el.dataset.id; });
      if (!p) return;
      const bank = D.bankByBic(p.bic);
      const body = '<table class="kv dlgkv"><tr><th>Payment</th><td><b>' + p.ref + '</b> · ' + p.ccy + ' ' + U.fmt(p.amount) + '</td></tr><tr><th>Beneficiary</th><td>' + e(p.benefName) + '<br>' + e(bank ? bank.name + ', ' + bank.city : p.bic) + '</td></tr><tr><th>Purpose</th><td>' + e(p.purpose) + '</td></tr></table>' +
        '<div class="pcsec">Pre-check</div>' + V.precheckResult(p) +
        '<div class="pcsec">Second signature (Visum)</div><div>' + e(G.state.user.id) + ' · ' + U.fmtDate(G.state.date) + ' ' + U.fmtTime(G.state.clock) + ' · authorised for amounts without limit (Kollektivunterschrift zu zweien)</div>';
      Dlg.open({
        title: 'Release payment – four-eyes principle', width: 560, body: body,
        buttons: [{ label: 'Release', def: true, fn: function () {
          const r = G.releasePayment(p.id);
          if (!done(r)) return;
          setStatus('Payment ' + p.ref + ' released and sent via SWIFT.');
          const al = r.alert;
          Dlg.open({
            title: 'SWIFT – message queued for transmission', width: 560,
            body: (al ? '<div class="errbox"><svg class="ico"><use href="#i-warn"/></svg> Transaction monitoring created alert <b>' + al.id + '</b>: ' + al.rules.join(', ') + '</div>' : '') + V.mt103(p)
          });
        } }, { label: 'Cancel' }]
      });
    },
    payreject: function (el) {
      const p = G.state.payments.find(function (x) { return x.id === el.dataset.id; });
      if (!p) return;
      Dlg.confirm('Reject payment', 'Reject payment <b>' + p.ref + '</b> (' + p.ccy + ' ' + U.fmt(p.amount) + ' to ' + e(p.benefName) + ')?' + (p.source === 'client' ? '<br><br>This is a client instruction – the client will be displeased.' : ''),
        function () { done(G.rejectPayment(p.id), 'Payment ' + p.ref + ' rejected.'); }, 'bigwarn', 'Reject');
    },

    cashok: function (el) {
      const r = G.counterAccept(el.dataset.id);
      if (!done(r, 'Cash transaction booked.')) return;
      alertNotice(r.alert, 'Cash transaction booked.');
    },
    cashno: function (el) {
      Dlg.confirm('Refuse cash transaction', 'Refuse this cash transaction and send the client away?', function () { done(G.counterRefuse(el.dataset.id), 'Client sent away.'); }, 'bigwarn', 'Refuse');
    },

    alert: function (el) {
      const a = G.state.alerts.find(function (x) { return x.id === el.dataset.id; });
      if (!a) return;
      const open = a.status === 'open';
      Dlg.open({
        title: 'Alert ' + a.id + ' – ' + (open ? 'clearing' : 'details'), width: 640, body: V.alertDialog(a),
        onOpen: function (ov) {
          const just = ov.querySelector('[name=just]');
          if (!just) return;
          just.addEventListener('change', function () {
            const q = just.value ? G.alertQuality(a, just.value) : null;
            ov.querySelector('#aq').innerHTML = 'Documentation quality: ' + (q === 'thin' ? '<b class="neg">thin – may not withstand the audit</b>' : q ? '<b class="pos">adequate</b>' : '–');
          });
        },
        buttons: open ? [{ label: 'Execute decision', def: true, fn: function (ov) {
          const dec = ov.querySelector('input[name=dec]:checked').value;
          if (dec === 'mros') {
            setTimeout(function () {
              Dlg.confirm('Report to MROS', 'File a suspicious activity report for <b>' + e(G.client(a.client).rubrik) + '</b>?<br><br>The assets will be blocked and the relationship terminated. The client must not be informed (Art. 10 GwG).',
                function () { done(G.reportAlert(a.id), 'Report filed with MROS.'); }, 'bigwarn', 'File report');
            }, 0);
            return;
          }
          const r = G.closeAlert(a.id, ov.querySelector('[name=just]').value, ov.querySelector('[name=comment]').value.trim());
          if (!r.ok) { Dlg.msg('PBS/Web', e(r.msg), 'bigwarn'); return false; }
          done(r, 'Alert ' + a.id + ' closed.');
        } }, { label: 'Cancel' }] : [{ label: 'Close', def: true }]
      });
    },

    decide: function (el) {
      const m = G.state.messages.find(function (x) { return x.id === el.dataset.id; });
      const act = m && m.actions.find(function (a) { return a[0] === el.dataset.key; });
      if (!act) return;
      Dlg.confirm('Confirm decision', 'Record the decision <b>"' + e(act[1]) + '"</b>?<br><span class="muted">' + e(m.subject) + '</span>', function () {
        const r = G.act(m.id, act[0]);
        if (done(r, 'Decision recorded.')) Dlg.msg('Decision recorded', e(r.text));
      });
    },

    entsuggest: function (el) {
      const f = el.closest('form');
      const j = f.querySelector('input[name=jur]:checked');
      f.elements.name.value = G.suggestEntityName(j ? j.value : 'VG');
    }
  };

  /* ---------- Ereignisse ---------- */
  document.addEventListener('click', function (ev) {
    touch();
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    ev.preventDefault();
    const fn = ACT[el.dataset.act];
    if (fn) fn(el);
  });

  document.addEventListener('submit', function (ev) {
    const f = ev.target;
    if (f.id === 'loginform') return onLogin(ev);
    if (!f.dataset.form) return;
    ev.preventDefault();
    touch();
    if (FORMS[f.dataset.form]) FORMS[f.dataset.form](f);
  });

  function onFilter(el) {
    const p = el.dataset.filter.split('.');
    UI.f[p[0]] = UI.f[p[0]] || {};
    UI.f[p[0]][p[1]] = el.value;
    const isText = el.tagName === 'INPUT';
    render(true);
    if (isText) {
      const n = document.querySelector('[data-filter="' + el.dataset.filter + '"]');
      if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    }
  }

  document.addEventListener('input', function (ev) {
    const el = ev.target;
    touch();
    if (el.dataset && el.dataset.filter && el.tagName === 'INPUT') return onFilter(el);
    const f = el.form;
    if (!f) return;
    if (f.id === 'payform' && el.name === 'bic') {
      const b = D.bankByBic(el.value);
      $('bankname').innerHTML = b ? e(b.name + ', ' + b.city) : '<span class="muted">' + (el.value.length >= 8 ? 'BIC not in directory – check entry' : '– enter BIC –') + '</span>';
      if (b) f.elements.country.value = b.c;
    }
    if (f.dataset.form === 'transfer') transferPreview(f);
  });

  document.addEventListener('change', function (ev) {
    const el = ev.target;
    if (el.dataset && el.dataset.filter && el.tagName === 'SELECT') return onFilter(el);
    if (el.name === 'selall') {
      el.form.querySelectorAll('input[name=sel]').forEach(function (c) { c.checked = el.checked; });
      return;
    }
    const f = el.form;
    if (f && f.dataset.form === 'transfer') transferPreview(f);
  });

  function transferPreview(f) {
    const box = $('trprev');
    const pv = G.transferPreview(val(f, 'from'), val(f, 'to'), U.parseAmount(val(f, 'amount')));
    if (!pv) { box.textContent = '–'; return; }
    const from = G.account(val(f, 'from')), to = G.account(val(f, 'to'));
    box.innerHTML = 'Debit ' + from.ccy + ' ' + U.fmt(U.parseAmount(val(f, 'amount')), from.ccy === 'XAU' ? 3 : 2) + ' → credit <b>' + to.ccy + ' ' + U.fmt(pv.credit, to.ccy === 'XAU' ? 3 : 2) + '</b>' +
      (pv.spread ? ' · FX margin ' + U.fmt(pv.spread * 100, 2) + '%' : '') + (pv.brok ? ' · brokerage CHF ' + U.fmt(pv.brok) : '') +
      (from.client !== to.client ? '<br><span class="neg">Transfer between different relationships – monitored.</span>' : '');
  }

  document.addEventListener('keydown', function (ev) {
    touch();
    if (ev.key === 'F9' && !$('app').classList.contains('hidden') && !$('dlg-layer').children.length) {
      ev.preventDefault();
      runEOD();
    }
  });

  // Diagramm: Fadenkreuz und Tooltip
  document.addEventListener('mousemove', function (ev) {
    const hit = ev.target.closest ? ev.target.closest('.chart .hit') : null;
    if (UI.hoverChart && (!hit || !UI.hoverChart.contains(hit))) {
      UI.hoverChart.querySelectorAll('.cx, .cd, .ctip').forEach(function (n) { n.classList.add('hidden'); });
      UI.hoverChart = null;
    }
    if (!hit) return;
    const ch = hit.closest('.chart');
    const svg = ch.querySelector('svg');
    const pts = ch._pts || (ch._pts = JSON.parse(ch.dataset.points));
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    let best = 0, bd = Infinity;
    pts.forEach(function (q, i) { const d = Math.abs(q[0] - p.x); if (d < bd) { bd = d; best = i; } });
    const q = pts[best];
    const cx = svg.querySelector('.cx'), cd = svg.querySelector('.cd'), tip = ch.querySelector('.ctip');
    cx.setAttribute('x1', q[0]);
    cx.setAttribute('x2', q[0]);
    cd.setAttribute('cx', q[0]);
    cd.setAttribute('cy', q[1]);
    tip.innerHTML = '<b>' + q[2] + '</b> · CHF ' + q[3] + ' Mio.';
    [cx, cd, tip].forEach(function (n) { n.classList.remove('hidden'); });
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const left = q[0] / vb.width * r.width;
    const top = q[1] / vb.height * r.height;
    tip.style.left = Math.max(0, Math.min(left + 10, r.width - tip.offsetWidth - 2)) + 'px';
    tip.style.top = Math.max(0, top - 30) + 'px';
    UI.hoverChart = ch;
  });

  window.addEventListener('hashchange', function () { touch(); render(); });

  /* ---------- Start ---------- */
  $('lg-cancel').addEventListener('click', function () {
    $('lg-pw').value = '';
    $('lg-tok').value = '';
    $('lg-err').classList.add('hidden');
  });
  $('lg-reset').addEventListener('click', function (ev) {
    ev.preventDefault();
    Dlg.confirm('Reset game data', 'Delete the saved game in this browser and start with a fresh bank at the next sign-on?', function () {
      G.reset();
      loginInfo();
      loginError(['Game data deleted. A new bank will be set up at sign-on.'], true);
    }, 'bigwarn', 'Delete');
  });

  tokenTick();
  setInterval(tokenTick, 1000);
  setInterval(sessionTick, 1000);
  loginInfo();
  show('login');
  $('lg-pw').focus();
})(window.PBS);
