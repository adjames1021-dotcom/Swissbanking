/* PBS/Web 4.2 – Präsentationssteuerung: Anmeldung, Navigation, Termine, Dialoge, Tagesabschluss */
(function (PBS) {
  'use strict';

  const G = PBS.Game, V = PBS.Views, D = PBS.DATA, U = PBS.U, H = PBS.H, B = PBS.Browser, Dlg = PBS.Dlg, Snd = PBS.Sound, Tutor = PBS.Tutor;
  const e = U.esc;
  const UI = PBS.UI = { f: {}, draft: null, path: '', mod: '', recent: [], sessionEnd: 0, tickerKey: '', prevLogin: null, screen: 'login', session: false, snoozed: {}, lastMsg: 0, afterLogin: null };
  const SESSION_MS = 30 * 60 * 1000;
  const BASE = D.BANK.intranet;
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
    UI.screen = id;
    ['login', 'connecting', 'app', 'intra'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
    if (id !== 'app') $('gameover').classList.add('hidden');
  }

  function loginInfo() {
    const box = $('lg-save');
    const st = G.hasSave() ? G.load() : null;
    if (st && !st.gameOver) {
      box.textContent = 'Saved session found – ' + D.BANK.short + ', value date ' + U.fmtDate(st.date) + ', ' + st.clients.filter(function (c) { return c.status === 'active'; }).length + ' relationships. It will be restored.';
      box.classList.remove('hidden');
    } else box.classList.add('hidden');
  }

  function loginError(lines, info) {
    const box = $('lg-err');
    box.innerHTML = lines.map(function (l) { return '<div><svg class="ico"><use href="#i-' + (info ? 'info' : 'warn') + '"/></svg> ' + e(l) + '</div>'; }).join('');
    box.classList.remove('hidden');
  }

  function showLogin(reason, info) {
    show('login');
    loginInfo();
    if (reason) loginError([reason], info); else $('lg-err').classList.add('hidden');
    B.page({ title: 'PBS/Web – Sign on', url: BASE + 'login.jsp' });
    setTimeout(function () { if (UI.screen === 'login') $(($('lg-user').value ? 'lg-pw' : 'lg-user')).focus(); }, 0);
    Tutor.check(900);
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
      Snd.chord();
      $('lg-tok').value = '';
      $(pw ? 'lg-tok' : 'lg-pw').focus();
      return;
    }
    $('lg-err').classList.add('hidden');
    $('lg-pw').value = '';
    $('lg-tok').value = '';
    const st = G.load();
    if (st && !st.gameOver) { signOn(uid, true); return; }
    newGameDialog(uid, function () { signOn(uid, false); });
  }
  function signOn(uid, resumed) {
    const st = G.state;
    Tutor.done('login');
    UI.prevLogin = st.user.last;
    G.login(uid);
    st.user.last = { d: st.date, t: st.clock, ws: PBS.modern() ? 'ZH-NB-1147' : 'ZH-BS64-0217' };
    G.save();
    connect(uid, resumed);
  }

  function newGameDialog(uid, onDone) {
    Dlg.open({
      title: 'PBS/Web – New Managing Partner', width: 600, icon: 'i-key',
      body: '<div class="dlg-msg"><svg class="ico32"><use href="#crest"/></svg><div><b>Bankhaus Vogt &amp; Cie</b> welcomes its new Managing Partner.<br>Choose when you join the bank and how unforgiving the world will be.</div></div>' + V.newGameForm(UI.lastName || '', false),
      buttons: [{ label: 'Start career', def: true, fn: function (ov) {
        const f = ov.querySelector('#newgameform');
        const sc = f.querySelector('input[name=sc]:checked'), df = f.querySelector('input[name=df]:checked');
        const nm = f.elements.nm.value.trim() || 'Dr. M. Ammann';
        UI.lastName = nm;
        G.reset();
        G.newGame({ scenario: sc ? sc.value : '2003', diff: df ? df.value : 'standard', userId: uid, name: nm });
        PBS.FS.purgeGame();
        if (f.elements.guide && f.elements.guide.checked) { G.state.guide = { on: true, step: 0 }; Tutor.done('intro'); G.save(); }
        resetUI();
        setTimeout(onDone, 0);
      } }, { label: 'Cancel' }]
    });
  }
  function resetUI() {
    UI.f = {};
    UI.draft = null;
    UI.recent = [];
    UI.tickerKey = '';
    UI.snoozed = {};
    UI.inv = null;
    UI.lastMsg = G.state ? G.state.ctr.msg : 0;
    $('gameover').classList.add('hidden');
    $('gameover').innerHTML = '';
  }

  function connect(uid, resumed) {
    show('connecting');
    B.page({ title: 'PBS/Web – Connecting', url: BASE + 'j_security_check' });
    const n = G.activeClients().length;
    const steps = ['Authenticating user ' + uid + ' against VOGT-ZH domain …', 'Opening session on PBSPRD01 …', 'Loading mandate 001 – Zürich …', 'Loading client book (' + n + ' relationships) …', 'Checking mail and fax …', 'Starting PBS/Web …'];
    let i = 0;
    $('conn-bar').style.width = '0';
    B.status('Opening page ' + BASE + 'j_security_check...');
    (function step() {
      if (i < steps.length) {
        $('conn-text').textContent = steps[i];
        $('conn-bar').style.width = ((i + 1) / steps.length * 100) + '%';
        i++;
        setTimeout(step, 220 + Math.random() * 220);
        return;
      }
      B.status('');
      UI.session = true;
      UI.lastMsg = G.state.ctr.msg;
      touch();
      const after = UI.afterLogin && UI.afterLogin.length > 2 && UI.afterLogin.indexOf('#/x/') !== 0 && UI.afterLogin.indexOf('#/404') !== 0 ? UI.afterLogin : '#/overview';
      UI.afterLogin = null;
      const target = resumed ? after : '#/inbox/M0001';
      if (location.hash === target) navigate(); else location.hash = target;
      setStatus(resumed ? 'Session restored. Welcome back.' : 'Welcome. Please read the memo from the Senior Partner.');
    })();
  }

  function logout(reason, info) {
    if (G.state) G.save();
    Dlg.closeAll();
    UI.session = false;
    B.clearNav();
    showLogin(reason, info);
  }

  /* ---------- Sitzung ---------- */
  function touch() { UI.sessionEnd = Date.now() + SESSION_MS; }
  function sessionTick() {
    if (!UI.session) return;
    const left = Math.max(0, UI.sessionEnd - Date.now());
    const c = $('sb-session');
    if (c) c.textContent = 'Session ' + U.pad(Math.floor(left / 60000), 2) + ':' + U.pad(Math.floor(left / 1000) % 60, 2);
    if (left <= 0) logout('PBS-AUTH-0230 Your session expired after 30 minutes of inactivity. Please sign on again.', true);
  }

  // Statuszeile des Browsers ("window.status"), bleibt einige Sekunden stehen
  let statusTimer = null;
  function setStatus(text) {
    clearTimeout(statusTimer);
    B.message(text);
    statusTimer = setTimeout(function () { B.message(''); }, 7000);
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
    [/^agenda$/, function () { return V.agenda(); }],
    [/^career$/, function () { return V.career(); }],
    [/^market$/, function () { return V.market(); }],
    [/^trip$/, function () { return V.trip(); }],
    [/^clients$/, function () { return V.clients(); }],
    [/^client\/([\d.]+)(?:\/(\w+))?$/, function (m) { remember(m[1]); return V.client(m[1], m[2]); }],
    [/^accounts$/, function () { return V.accounts(); }],
    [/^account\/([\d.]+)$/, function (m) { return V.account(m[1]); }],
    [/^loans$/, function () { return V.loans(); }],
    [/^vault$/, function () { return V.vault(); }],
    [/^pay\/queue$/, function () { return V.payQueue(); }],
    [/^pay\/new$/, function (m, q) { return V.payNew(q); }],
    [/^pay\/transfer$/, function (m, q) { return V.payTransfer(q); }],
    [/^pay\/cash$/, function () { return V.cashDesk(); }],
    [/^pay\/couriers$/, function () { return V.couriers(); }],
    [/^pay\/done$/, function () { return V.payDone(); }],
    [/^pay\/(P\d+)$/, function (m) { return V.payView(m[1]); }],
    [/^invest$/, function () { return V.invest(); }],
    [/^invest\/mandates$/, function () { return V.mandates(); }],
    [/^invest\/instruments$/, function () { return V.instruments(); }],
    [/^invest\/treasury$/, function () { return V.treasury(); }],
    [/^compliance$/, function () { return V.risk(); }],
    [/^compliance\/alerts$/, function () { return V.alerts(); }],
    [/^compliance\/mla$/, function () { return V.mla(); }],
    [/^compliance\/investigations$/, function () { return V.investigations(); }],
    [/^compliance\/legal$/, function () { return V.legal(); }],
    [/^compliance\/audits$/, function () { return V.audits(); }],
    [/^structures$/, function () { return V.structures(); }],
    [/^structures\/new$/, function (m, q) { return V.structureNew(q); }],
    [/^structures\/cards$/, function () { return V.cards(); }],
    [/^org\/staff$/, function () { return V.staff(); }],
    [/^org\/recruit$/, function () { return V.recruit(); }],
    [/^org\/branches$/, function () { return V.branches(); }],
    [/^org\/corr$/, function () { return V.corr(); }],
    [/^org\/acquisitions$/, function () { return V.acquisitions(); }],
    [/^org\/pricing$/, function () { return V.pricing(); }],
    [/^reports\/pl$/, function () { return V.pl(); }],
    [/^reports\/aum$/, function () { return V.aumReport(); }],
    [/^reports\/journal$/, function () { return V.journal(); }],
    [/^trade$/, function () { return V.trade(); }],
    [/^trade\/stock\/(\w+)$/, function (m) { return V.tradeStock(m[1]); }],
    [/^trade\/orders$/, function () { return V.tradeOrders(); }],
    [/^trade\/portfolio$/, function () { return V.tradePortfolio(); }],
    [/^trade\/news$/, function () { return V.tradeNews(); }],
    [/^inbox$/, function () { return V.inbox(); }],
    [/^inbox\/(M\d+)$/, function (m) { G.markRead(m[1]); return V.message(m[1]); }]
  ];
  const INTRA = { intranet: function () { return V.intranet(); }, guide: function () { return V.guidePage(); }, phone: function () { return V.phonebook(); }, menu: function () { return V.canteen(); }, rules: function () { return V.rules(); } };

  function remember(id) {
    UI.recent = [id].concat(UI.recent.filter(function (x) { return x !== id; })).slice(0, 6);
  }

  // Einzelseite ausserhalb von PBS/Web (Intranet, Fehlerseite)
  function standalone(html, title) {
    show('intra');
    $('intra').innerHTML = html;
    $('ie-view').scrollTop = 0;
    B.page({ hash: location.hash, title: title });
    Tutor.check();
  }

  function route(keepScroll) {
    const r = parseHash();
    if (r.path.indexOf('x/') === 0) {
      const v = INTRA[r.path.slice(2)];
      if (v) { const p = v(); standalone(p.html, p.title); } else { const nf = V.notFound(B.urlFor(location.hash)); standalone(nf.html, nf.title); }
      return;
    }
    if (r.path === '404') { const nf = V.notFound(B.urlFor(location.hash)); standalone(nf.html, nf.title); return; }
    if (r.path.indexOf('w/') === 0) { const wp = PBS.Web.page(r.path.slice(2), r.q); standalone(wp.html, wp.title); return; }
    if (r.path === 'f') { const fp = PBS.Apps.filePage(r.q.p || 'C:\\'); standalone(fp.html, fp.title); return; }
    if (!UI.session || !G.state) {
      UI.afterLogin = location.hash;
      if (UI.screen !== 'connecting') showLogin();
      return;
    }
    if (r.path === 'fakt') {
      UI.inv = UI.inv || V.invoiceDefault('fee');
      const p = V.invoicePage(UI.inv);
      standalone(p.html, p.title);
      return;
    }
    let view = null;
    for (let i = 0; i < ROUTES.length; i++) {
      const m = r.path.match(ROUTES[i][0]);
      if (m) { view = ROUTES[i][1](m, r.q); break; }
    }
    if (!view || view.notFound) {
      const nf = view || V.notFound('Page "' + r.path + '"');
      standalone(nf.html, nf.title);
      return;
    }
    const wasApp = UI.screen === 'app';
    show('app');
    const content = $('content');
    const sc = content.scrollTop;
    content.innerHTML = view.html;
    content.scrollTop = keepScroll && wasApp ? sc : 0;
    UI.mod = view.mod;
    UI.path = r.path;
    renderChrome(view);
    B.page({ hash: location.hash || '#/overview', title: 'PBS/Web – ' + view.title });
    afterRender();
  }
  // Seitenaufruf mit Ladeanimation des Browsers
  function navigate() { touch(); B.load(B.urlFor(location.hash), route, { blank: true }); }
  // Nach einer Aktion: Seite neu aufbauen ("Postback")
  function render() { B.post(); route(true); }

  function afterRender() {
    const s = G.state;
    if (s.gameOver) { showGameOver(); return; }
    // Neue Post seit dem letzten Aufbau
    if (s.ctr.msg > UI.lastMsg) {
      const fresh = s.messages.filter(function (m) { return +m.id.slice(1) > UI.lastMsg; });
      UI.lastMsg = s.ctr.msg;
      if (fresh.length) {
        const fax = fresh.some(function (m) { return m.type === 'fax' || m.type === 'telex'; });
        setTimeout(function () { if (fax) Snd.fax(); else Snd.notify(); }, 150);
        if (!B.msgText) setStatus(fresh.length + ' new message(s): ' + fresh[0].subject);
      }
    }
    setTimeout(checkAgenda, 400);
    Tutor.check();
  }

  /* ---------- Rahmen ---------- */
  const MODS = [
    { key: 'overview', label: 'Overview', href: '#/overview', badge: function () { return G.agendaDue().length; } },
    { key: 'clients', label: 'Clients', href: '#/clients' },
    { key: 'accounts', label: 'Accounts', href: '#/accounts' },
    { key: 'payments', label: 'Payments', href: '#/pay/queue', badge: function () { const s = G.state; return G.pendingPayments().length + s.counter.length + s.couriers.filter(function (k) { return k.status === 'requested'; }).length; } },
    { key: 'invest', label: 'Investments', href: '#/invest' },
    { key: 'trade', label: 'Trading', href: '#/trade', badge: function () { return V.tradeOpenOrders(); } },
    { key: 'compliance', label: 'Compliance', href: '#/compliance', badge: function () { return G.openAlerts().length; } },
    { key: 'structures', label: 'Structures', href: '#/structures' },
    { key: 'org', label: 'Organisation', href: '#/org/staff' },
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
      case 'accounts': return [['accounts', 'Account list', 'folder'], ['loans', 'Loans & guarantees', 'scale', false, s.loans.filter(function (l) { return l.status === 'active'; }).length], ['vault', 'Vault (safe-deposit boxes)', 'lock']];
      case 'payments': return [['pay/queue', 'Release queue', 'queue', false, G.pendingPayments().length], ['pay/new', 'New payment (MT103)', 'doc'], ['pay/transfer', 'Internal transfer', 'swap'], ['pay/cash', PBS.L.t('Cash desk (Kasse)', 'Cash desk'), 'cash', false, s.counter.length],
        ['pay/couriers', 'Courier service', 'plane', false, s.couriers.filter(function (k) { return k.status === 'requested'; }).length], ['pay/done', 'Payment journal', 'list']];
      case 'invest': return [['invest', 'House view (committee)', 'chart'], ['invest/mandates', 'Mandates', 'folder'], ['invest/instruments', 'Instruments', 'list'], ['invest/treasury', 'Treasury & nostro', 'building']];
      case 'compliance': return [['compliance', 'Risk monitor', 'shield'], ['compliance/alerts', 'Alerts', 'warn', false, G.openAlerts().length], ['compliance/mla', 'Mutual assistance', 'scale', false, s.messages.filter(function (m) { return m.kind === 'mla' && !m.resolved; }).length],
        ['compliance/investigations', 'Investigations', 'flag', false, Object.keys(s.inv).length], ['compliance/legal', 'Legal & lobbying', 'pen'], ['compliance/audits', 'Audit reports', 'doc']];
      case 'structures': return [['structures', 'Register', 'building'], ['structures/new', 'Set up structure', 'plus'], ['structures/cards', 'Offshore cards', 'cash']];
      case 'org': return [['org/staff', 'Staff', 'user'], ['org/recruit', 'Recruitment', 'plus', false, s.candidates.length], ['org/branches', 'Branches & offices', 'building'], ['org/corr', 'Correspondent banks', 'net'], ['org/acquisitions', 'Acquisitions', 'scale', false, s.targets.length], ['org/pricing', 'Products & pricing', 'cash']];
      case 'reports': return [['reports/pl', 'Profit & loss', 'chart'], ['reports/aum', 'AuM by domicile', 'chart'], ['reports/journal', 'Booking journal', 'list']];
      case 'inbox': return [['inbox', 'Inbox', 'mail', false, G.unread()]];
      case 'trade': return [['trade', 'Market', 'chart'], ['trade/orders', 'Orders', 'list', false, V.tradeOpenOrders()], ['trade/portfolio', 'Portfolios', 'folder'], ['trade/news', 'Market news', 'doc']];
      default: return [['overview', 'Dashboard', 'home'], ['agenda', 'Diary', 'clock', false, G.agendaDue().length], ['career', 'Targets & career', 'flag'], ['market', 'Market data', 'chart'], ['trip', 'Acquisition trip', 'plane']];
    }
  }

  function renderChrome(view) {
    const s = G.state;
    const last = UI.prevLogin;
    const ot = s.clock > 18 * 60;
    $('hdr-r').innerHTML = 'User <b>' + e(s.user.id) + '</b> · ' + e(s.meta.name) + ' (Managing Partner) · ' + PBS.L.t('Mandant 001 Zürich', 'Client unit 001 Zurich') + '<br>' +
      'Value date <b>' + U.weekday(s.date) + ' ' + U.fmtDate(s.date) + '</b> · <b' + (ot ? ' class="ot"' : '') + '>' + U.fmtTime(s.clock) + '</b>' + (ot ? ' <span class="ot">overtime</span>' : '') + '<br>' +
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
      const on = UI.path === it[0] || (it[3] && UI.path.indexOf(it[0] + '/') === 0);
      return '<li class="' + (it[3] ? 'sub' : '') + '"><a href="#/' + it[0] + '" class="' + (on ? 'on' : '') + '">' + H.ico(it[2]) + '<span>' + e(it[1]) + '</span>' + (it[4] ? '<span class="cnt">(' + it[4] + ')</span>' : '') + '</a></li>';
    }).join('');
    const m = s.market, pm = s.prevMarket;
    const q = ['SMI', 'USD', 'EUR', 'XAU'].map(function (k) {
      const p = (m[k] / pm[k] - 1) * 100;
      return '<div class="row"><span>' + D.MARKET_LABEL[k][0] + '</span><span>' + U.fmt(m[k], k === 'SMI' || k === 'XAU' ? 2 : 4) + ' <span class="' + (p >= 0 ? 'pos' : 'neg') + '">' + (p >= 0 ? '▲' : '▼') + '</span></span></div>';
    }).join('');
    const next = G.nextAppointment();
    const left = G.timeLeft();
    $('nav').innerHTML =
      '<div class="navsec"><h3>' + e(modLabel) + '</h3><ul class="tree">' + tree + '</ul></div>' +
      '<div class="navsec"><h3>Quick search</h3><form data-form="qsearch" class="qs"><input class="inp" name="q" placeholder="No. / codename / name"><button class="btn sm" type="submit" aria-label="Search">' + H.ico('search') + '</button></form></div>' +
      '<div class="navsec"><h3>' + PBS.L.t('Value date (Valuta)', 'Value date') + '</h3><div class="navbox"><div class="big">' + U.weekday(s.date) + ' ' + U.fmtDate(s.date) + '</div>' +
      '<div class="row' + (ot ? ' warn' : '') + '"><span>Time</span><b>' + U.fmtTime(s.clock) + (ot ? ' (overtime)' : '') + '</b></div>' +
      '<div class="row"><span>Until building locks</span><b>' + Math.floor(left / 60) + 'h ' + U.pad(left % 60, 2) + '</b></div><div class="row"><span>Business day no.</span><b>' + s.dayNo + '</b></div>' +
      (next ? '<div class="next">' + H.ico('clock') + ' <a href="#/agenda">' + U.fmtTime(next.t) + ' ' + e(next.title.length > 26 ? next.title.slice(0, 25) + '…' : next.title) + '</a></div>' : '') +
      '<button class="btn eod" type="button" data-act="eod" title="F9">' + H.ico('clock') + ' End of day ▸</button></div></div>' +
      '<div class="navsec"><h3>Telekurs</h3><div class="navbox">' + q + '</div></div>';

    $('statusbar').innerHTML =
      '<div class="cell grow">' + H.ico('net') + ' ' + D.BANK.host + ' · DB2 · ' + e(D.SCENARIOS[s.meta.scenario].label.split(' – ')[0]) + ' · ' + e(D.DIFFICULTY[s.meta.diff].label) + '</div>' +
      '<div class="cell">User ' + e(s.user.id) + '</div>' +
      '<div class="cell">' + PBS.L.t('Valuta ', 'Value date ') + U.fmtDate(s.date) + ' <span' + (ot ? ' class="ot"' : '') + '>' + U.fmtTime(s.clock) + '</span></div>' +
      '<div class="cell" id="sb-session">Session 30:00</div>';
    sessionTick();
    B.paintClock();

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

  /* ---------- Ergebnisse ---------- */
  function fail(r) {
    Dlg.msg('PBS/Web – Error', e(r ? r.msg : 'Unknown error'), /locks the building/.test(r && r.msg) ? 'bigwarn' : 'err');
    return false;
  }
  // Ergebnis einer Spielaktion: Fehlermeldung oder Seite neu aufbauen
  function done(r, okText, title) {
    if (!r || !r.ok) return fail(r);
    render();
    if (okText) setStatus(okText);
    if (r.text && title) Dlg.msg(title, H.paras(r.text));
    return true;
  }
  function alertNotice(al, prefix) {
    if (!al) return;
    Dlg.msg('Transaction monitoring', (prefix ? prefix + '<br><br>' : '') + 'Alert <b>' + al.id + '</b> has been created:<br>' + al.rules.map(function (r) { return '<b>' + r + '</b> ' + e(D.RULES[r]); }).join('<br>') + '<br><br>Due for clearing by ' + U.fmtDate(al.due) + '.', 'bigwarn');
  }

  /* ---------- Termine ---------- */
  function checkAgenda() {
    const s = G.state;
    if (!UI.session || UI.screen !== 'app' || !s || s.gameOver || Dlg.any() || ['min', 'closed'].indexOf(PBS.WM.ieState()) >= 0) return;
    const due = G.agendaDue().filter(function (a) { return !UI.snoozed[a.id]; });
    if (due.length) openMeeting(due[0]);
  }
  function openMeeting(a) {
    const mc = G.meetingContent(a.id);
    if (!mc || !mc.options || !mc.options.length) { UI.snoozed[a.id] = true; return; }
    const call = a.kind === 'call';
    const canDel = a.kind !== 'partners' && a.kind !== 'trip';
    const btns = [{ label: call ? 'Take the call' : 'Attend', def: true, fn: function (ov) {
      const k = ov.querySelector('input[name=mopt]:checked');
      const r = G.attend(a.id, k ? k.value : mc.options[0][0]);
      if (!r.ok) { fail(r); return; }
      render();
      Dlg.msg(a.title, H.paras(r.text || 'Done.'), null, function () { if (r.open === 'ic') { setStatus('The investment committee is in session – changes to the house view cost no extra time today.'); B.go('#/invest'); } });
    } }];
    if (canDel) btns.push({ label: 'Delegate', fn: function () {
      const r = G.delegateAgenda(a.id);
      if (!r.ok) { fail(r); return; }
      render();
      if (r.text) Dlg.msg(a.title, e(r.text));
    } });
    btns.push({ label: call ? 'Let it ring' : 'Later', fn: function () {
      if (call) { G.skipAgenda(a.id); render(); setStatus('Call not taken.'); } else { UI.snoozed[a.id] = true; setStatus('Appointment postponed – it stays open in the diary until the end of the day.'); }
    } });
    Dlg.open({
      title: (call ? 'Telephone – incoming call' : 'Diary – appointment due') + ' · ' + U.fmtTime(a.t), width: 560, icon: call ? 'i-phone' : 'i-clock',
      sound: call ? 'ring' : 'notify', body: V.meetingDialog(mc), buttons: btns,
      onX: function () { UI.snoozed[a.id] = true; }
    });
  }

  /* ---------- Spielende ---------- */
  function showGameOver() {
    const go = $('gameover');
    if (!go.classList.contains('hidden')) return;
    Dlg.closeAll();
    go.innerHTML = V.gameOver(G.state.gameOver);
    go.classList.remove('hidden');
    $('ie-view').scrollTop = 0;
    Snd.printer(2);
  }
  function newGame() {
    const uid = G.state ? G.state.user.id : 'E10001';
    newGameDialog(uid, function () {
      const s = G.state;
      UI.prevLogin = s.user.last;
      G.login(uid);
      B.clearNav();
      if (location.hash === '#/inbox/M0001') navigate(); else location.hash = '#/inbox/M0001';
      setStatus('New career started. Please read the memo from the Senior Partner.');
    });
  }

  /* ---------- Tagesabschluss ---------- */
  function runEOD() {
    const s = G.state;
    if (!s || s.gameOver || !UI.session) return;
    const warn = [];
    if (s.counter.length) warn.push(s.counter.length + ' client(s) waiting at the cash desk will leave unserved');
    const pp = G.pendingPayments().length;
    if (pp) warn.push(pp + ' payment(s) remain in the release queue');
    const od = G.overdueAlerts().length;
    if (od) warn.push(od + ' compliance alert(s) are overdue');
    const ar = G.actionRequired().length;
    if (ar) warn.push(ar + ' decision(s) pending in mail');
    const ag = G.agendaFor(s.date).filter(function (a) { return a.status === 'open'; }).length;
    if (ag) warn.push(ag + ' appointment(s) today will be missed');
    const body = 'Start end-of-day processing' + PBS.L.t(' (Tagesabschluss)', '') + ' for value date <b>' + U.weekday(s.date) + ' ' + U.fmtDate(s.date) + '</b>?' +
      (warn.length ? '<ul class="hints" style="margin-top:8px">' + warn.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul>' : '<br><br>All pending items have been dealt with.');
    Dlg.confirm('End of day', body, function () { setTimeout(doEOD, 30); }, warn.length ? 'bigwarn' : 'ques', 'Start batch', 'Cancel');
  }

  // SYSOUT des Tagesabschlusses auf C:\PBS\log; die letzten 20 Läufe bleiben liegen
  function saveBatchLog(day, lines) {
    const FS = PBS.FS;
    if (!FS || !FS.root()) return;
    const dir = ['C:', 'PBS', 'log'];
    FS.write(dir.concat(['PBSEOD01_' + day.replace(/-/g, '') + '.log']), lines.map(function (l) { return l[1]; }).join('\r\n') + '\r\n', { game: true });
    const logs = FS.list(dir).filter(function (f) { return /^PBSEOD01_\d{8}\.log$/.test(f.name); }).map(function (f) { return f.name; }).sort();
    logs.slice(0, Math.max(0, logs.length - 20)).forEach(function (n) { FS.destroy(dir.concat([n])); });
  }

  function doEOD() {
    const res = G.endOfDay();
    UI.snoozed = {};
    let sec = res.start * 60 + 7;
    const ts = function () { sec += 1 + Math.floor(Math.random() * 9); return U.pad(Math.floor(sec / 3600) % 24, 2) + ':' + U.pad(Math.floor(sec / 60) % 60, 2) + ':' + U.pad(sec % 60, 2); };
    const lines = [];
    lines.push(['h', ts() + '  PBSEOD01  JOB 0' + (400 + G.state.dayNo) + ' STARTED  MANDANT 001  VALUTA ' + U.fmtDate(res.closing)]);
    lines.push(['', ts() + '  PBSEOD01  ALLOC DB2 PRD.PBS01 ............................. OK']);
    res.log.forEach(function (l) {
      const txt = ts() + '  ' + (l[0] === 'EVT' ? '          EVT     ' : 'PBSEOD01  ' + l[0] + ' ') + (l[1] + ' ').padEnd(l[0] === 'EVT' ? 36 : 34, '.') + ' ' + l[2];
      const warnish = /UEBERFAELLIG|NICHT BEDIENT|WARNUNG|GEFUNDEN|VERWEIGERT|FESTSTELLUNG|VERPASST|VERFALLEN|OVERDUE|MISSED|WARNING|FOUND|REFUSED|FINDING|NOT SERVED|EXPIRED/.test(l[2]);
      lines.push([l[0] === 'EVT' ? (warnish ? 'w' : 'ev') : (warnish ? 'w' : 'ok'), txt]);
    });
    if (res.rc === '0012') lines.push(['er', ts() + '  PBSEOD01  *** ABEND U0012 – EXTERNAL EVENT – NOTIFY MANAGEMENT ***']);
    lines.push(['h', ts() + '  PBSEOD01  JOB ENDED  RC=' + res.rc + '  NEW VALUE DATE ' + U.fmtDate(res.date)]);
    saveBatchLog(res.closing, lines);

    const d = Dlg.open({
      title: 'Batch job PBSEOD01 – ' + PBS.L.t('Mandant 001 Zürich', 'client unit 001 Zurich'), width: 712, noEsc: true, icon: 'i-print',
      body: '<div class="batch" id="batchlog"></div><div class="small muted" style="margin-top:6px">Output of job PBSEOD01 (SYSOUT class A) · operator console OPS-ZH-02 · printer PRT-ZH-3' + PBS.L.t(' (Kontrolljournal)', ' (control journal)') + '</div>',
      buttons: [{ label: 'OK', def: true, fn: function () {
        setTimeout(function () {
          const s = G.state;
          navigate();
          if (!s.gameOver) setStatus('New value date ' + U.weekday(s.date) + ' ' + U.fmtDate(s.date) + ' – ' + G.unread() + ' unread message(s), ' + s.counter.length + ' client(s) at the cash desk.');
        }, 0);
      } }]
    });
    d.el.querySelector('.dlg-x').style.visibility = 'hidden';
    const ok = d.el.querySelector('.dlg-btns .btn');
    ok.disabled = true;
    const box = d.el.querySelector('#batchlog');
    Snd.printer(Math.min(8, 2 + Math.floor(lines.length / 6)));
    let i = 0;
    const fast = B.st.delay ? 1 : 0.35;
    (function next() {
      if (i >= lines.length) { ok.disabled = false; ok.focus(); return; }
      const div = document.createElement('div');
      div.className = lines[i][0];
      div.textContent = lines[i][1];
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
      i++;
      setTimeout(next, (60 + Math.random() * 90) * fast);
    })();
  }

  /* ---------- Formulare ---------- */
  function val(f, name) { return f.elements[name] ? String(f.elements[name].value) : ''; }
  function payFromForm(f) {
    const hid = f.querySelector('input[name=hideOrig]:checked');
    const acc = G.account(val(f, 'debit'));
    return {
      debit: val(f, 'debit'), client: acc ? acc.client : null, ccy: val(f, 'ccy'), amount: U.parseAmount(val(f, 'amount')), hideOrig: !!hid && hid.value === '1',
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
  function houseView(f) {
    const view = { alloc: {}, intensity: val(f, 'intensity'), pref: val(f, 'pref') };
    Object.keys(D.STRATS).forEach(function (st) {
      view.alloc[st] = {};
      D.CLASS_KEYS.forEach(function (k) { view.alloc[st][k] = U.parseAmount(val(f, 'w_' + st + '_' + k)) || 0; });
    });
    return view;
  }

  // Testsystem FAKT: Formular lesen, Vorschau neu zeichnen
  function readInvoice(f, el) {
    const inv = UI.inv;
    const paper = val(f, 'paper');
    if (paper !== inv.paper) {
      inv.paper = paper;
      if (paper !== 'custom') { const pp = V.invoicePaper(inv); inv.pw = pp.w; inv.ph = pp.h; f.elements.pw.value = pp.w; f.elements.ph.value = pp.h; }
    } else if (el && (el.name === 'pw' || el.name === 'ph')) {
      const pw = U.parseAmount(val(f, 'pw')), ph = U.parseAmount(val(f, 'ph'));
      if (pw >= 74 && pw <= 600 && ph >= 74 && ph <= 600) { inv.paper = 'custom'; inv.pw = pw; inv.ph = ph; f.elements.paper.value = 'custom'; }
    }
    const fmt = f.querySelector('input[name=fmt]:checked');
    if (fmt) inv.fmt = fmt.value;
    inv.from = val(f, 'from');
    inv.to = val(f, 'to');
    inv.no = val(f, 'no').trim();
    const iso = U.parseDate(val(f, 'date'));
    if (iso) inv.date = iso;
    inv.due = +val(f, 'due') || 30;
    inv.ccy = val(f, 'ccy');
    const v = U.parseAmount(val(f, 'vat'));
    inv.vat = v >= 0 && v <= 30 ? v : 0;
    inv.subject = val(f, 'subject');
    inv.note = val(f, 'note');
    const num = function (x) { x = x.trim(); if (!x) return ''; const n = U.parseAmount(x); return isNaN(n) ? '' : n; };
    inv.lines = inv.lines.map(function (l, i) { return { d: val(f, 'd' + i), q: num(val(f, 'q' + i)), p: num(val(f, 'p' + i)) }; });
    $('inv-preview').innerHTML = V.invoiceDoc(inv);
  }

  const FORMS = {
    order: function (f) {
      const r = G.trade.place({ id: f.dataset.id, acct: val(f, 'acct'), side: val(f, 'side'), q: U.parseAmount(val(f, 'q')), type: val(f, 'type'), lim: U.parseAmount(val(f, 'lim')), valid: val(f, 'valid') });
      if (!r.ok) { Dlg.msg('Order rejected', e(r.msg), 'err'); return; }
      Snd.click();
      render();
      setStatus(r.text);
      if (r.o && r.o.status === 'done') Dlg.msg('Order ' + r.o.no, e(r.text) + '<br><span class="muted">' + 'Amount CHF ' + U.fmt(r.o.fill.chf, 2) + PBS.L.t(' · Courtage and stamp duty CHF ', ' · fees and stamp duty CHF ') + U.fmt(r.o.fill.fee + r.o.fill.tax, 2) + '</span>', 'info');
      else Dlg.msg('Order ' + r.o.no, e(r.text), 'info');
    },
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
      Dlg.msg('Payment entered', 'Payment order <b>' + r.p.ref + '</b> (' + r.p.ccy + ' ' + U.fmt(r.p.amount, H.dec(r.p.ccy)) + ') has been placed in the release queue.<br>A second signature is required (four-eyes principle).');
      B.go('#/pay/queue');
    },
    transfer: function (f) {
      const amount = U.parseAmount(val(f, 'amount'));
      const r = G.transfer(val(f, 'from'), val(f, 'to'), amount, val(f, 'text').trim());
      if (!r.ok) { fail(r); return; }
      const to = G.account(val(f, 'to'));
      render();
      setStatus('Transfer executed.');
      if (r.alert) alertNotice(r.alert, 'Transfer executed.');
      else Dlg.msg('Internal transfer', 'Transfer executed. Credited to ' + to.id + ': <b>' + H.ccyL(to.ccy) + ' ' + U.fmt(r.credit, to.type === 'DEP' ? 2 : H.dec(to.ccy)) + '</b>.');
    },
    trip: function (f) {
      const sel = f.querySelector('input[name=dest]:checked');
      if (!sel) return;
      const r = G.startTrip(sel.value, val(f, 'rm'));
      if (done(r, 'Trip booked.')) Dlg.msg('Acquisition trip', 'The trip to <b>' + e(G.cname(sel.value)) + '</b> has been booked (CHF 18,000). Expect introductions over the coming days.');
    },
    entity: function (f) {
      const jur = f.querySelector('input[name=jur]:checked');
      const r = G.createEntity(val(f, 'client'), jur ? jur.value : '', val(f, 'name').trim(), f.elements.withAccount.checked, val(f, 'ccy'));
      if (!r.ok) { fail(r); return; }
      Dlg.msg('Structure set up', '<b>' + e(r.entity.name) + '</b> has been set up (' + e(D.JURIS[r.entity.jur].label) + ').' + (r.acc ? '<br>Account <b>' + r.acc.id + '</b> (' + r.acc.ccy + ') opened in the name of the structure.' : '') + '<br><br>Use <i>Internal transfer</i> to move assets into the structure\'s account.');
      B.go('#/structures');
    },
    bulkalerts: function (f) {
      const ids = Array.prototype.map.call(f.querySelectorAll('input[name=sel]:checked'), function (c) { return c.value; });
      const just = val(f, 'just');
      if (!ids.length) { Dlg.msg('PBS/Web', 'Please select at least one open alert.', 'bigwarn'); return; }
      if (!just) { Dlg.msg('PBS/Web', 'Please select a justification.', 'bigwarn'); return; }
      const thin = ids.filter(function (id) { return G.alertQuality(G.state.alerts.find(function (a) { return a.id === id; }), just) === 'thin'; }).length;
      const jl = D.JUSTIFICATIONS.find(function (j) { return j[0] === just; })[1];
      Dlg.confirm('Close alerts', 'Close <b>' + ids.length + '</b> alert(s) with the justification <i>' + e(jl) + '</i>? ' + H.dur(ids.length * 3 + 2) +
        (thin ? '<br><br><b class="neg">' + thin + ' of them would be thinly documented</b> and may not withstand the annual audit.' : ''), function () {
        const r = G.closeAlerts(ids, just, 'Bulk clearing');
        done(r, r.ok ? r.n + ' alert(s) closed.' : '');
      }, thin ? 'bigwarn' : 'ques', 'Close alerts', 'Cancel');
    },
    note: function (f) {
      const t = val(f, 'text').trim();
      if (!t) return;
      done(G.addNote(f.dataset.id, t), 'File note saved.');
    },
    qsearch: function (f) {
      const q = val(f, 'q').trim().toLowerCase();
      if (!q) return;
      const hits = G.state.clients.filter(function (c) { return (c.id + ' ' + c.rubrik + ' ' + c.name).toLowerCase().indexOf(q) >= 0; });
      if (hits.length === 1) B.go('#/client/' + hits[0].id);
      else {
        UI.f.clients = { q: q, st: 'all' };
        B.go('#/clients');
        setStatus(hits.length + ' client(s) found.');
      }
    },
    strategy: function (f) {
      const a = G.account(f.dataset.id);
      const st = val(f, 'strat');
      if (!a || (a.strat || 'balanced') === st) return;
      Dlg.confirm('Change strategy', 'Change portfolio <b>' + a.id + '</b> to <b>' + e(D.STRATS[st].label) + '</b>?<br>The rebalancing costs the client 0.25% brokerage on the volume traded.', function () {
        done(G.setStrategy(a.id, st), 'Strategy changed to ' + D.STRATS[st].label + '.');
      }, 'ques', 'Change', 'Cancel');
    },
    box: function (f) {
      const r = G.rentBox(f.dataset.id, val(f, 'size'));
      if (done(r, 'Safe-deposit box rented.')) Dlg.msg('Safe-deposit box', 'Box <b>' + r.box.id + '</b> (' + e(D.BOX_SIZES[r.box.size].label) + ') rented, CHF ' + U.fmt(r.box.fee, 0) + ' p.a. Keys handed over at the counter.');
    },
    lombard: function (f) {
      const amt = U.parseAmount(val(f, 'amount'));
      const r = G.grantLombard(f.dataset.id, amt, 'CHF');
      if (done(r, 'Lombard loan granted.')) Dlg.msg('Lombard loan', 'Loan <b>' + r.loan.id + '</b> over CHF ' + U.fmt(r.loan.amount, 0) + ' granted at Libor + 1.75%. The amount has been credited to the client\'s current account.');
    },
    b2b: function (f) {
      const amt = U.parseAmount(val(f, 'amount'));
      const acc = val(f, 'acc');
      const c = G.client(f.dataset.id);
      Dlg.confirm('Back-to-back loan', 'Arrange a back-to-back loan of <b>' + U.fmt(amt, 0) + '</b> for ' + e(c.rubrik) + ' via our correspondent in ' + e(G.cname(c.dom)) + ', secured by a pledge of account ' + e(acc) + '?<br><br><b class="neg">You personally approve this arrangement.</b>', function () {
        const r = G.arrangeB2B(c.id, amt, acc);
        done(r, 'Back-to-back loan arranged.');
      }, 'bigwarn', 'Arrange', 'Cancel');
    },
    assignrm: function (f) {
      const sid = val(f, 'rm');
      if (!sid) return;
      done(G.assignRM(f.dataset.id, sid), 'Relationship manager assigned.');
    },
    house: function (f) {
      const s = G.state;
      const inMeeting = s.house.icDate === s.date;
      const view = houseView(f);
      Dlg.confirm('Investment committee', 'Adopt the new house view? Portfolios are rebalanced overnight; clients pay 0.25% brokerage on the volume traded.' + (inMeeting ? '' : '<br><br>Outside the committee meeting this takes ' + H.dur(45) + '.'), function () {
        const r = G.setHouseView(view, inMeeting);
        if (done(r, 'House view adopted.')) Dlg.msg('Investment committee', 'The house view has been adopted. Rebalancing brokerage: CHF ' + U.fmt(r.comm, 0) + '.');
      }, 'ques', 'Adopt', 'Cancel');
    },
    nostro: function (f, ev) {
      const side = ev && ev.submitter ? ev.submitter.value : 'buy';
      const amt = U.parseAmount(val(f, 'amount'));
      const i = G.instr(val(f, 'id'));
      if (!amt) { Dlg.msg('Treasury', 'Enter an amount in CHF.', 'bigwarn'); return; }
      Dlg.confirm('Own-account trade', (side === 'sell' ? 'Sell' : 'Buy') + ' <b>' + e(i.name) + '</b> for CHF ' + U.fmt(amt, 0) + ' for the bank\'s own account?', function () {
        done(G.nostroTrade(i.id, side === 'sell' ? -amt : amt), 'Trade executed.');
      }, 'ques', side === 'sell' ? 'Sell' : 'Buy', 'Cancel');
    },
    pricing: function (f) {
      const lv = f.querySelector('input[name=level]:checked');
      const p = { level: lv ? lv.value : undefined, holdMail: U.parseAmount(val(f, 'holdMail')), card: U.parseAmount(val(f, 'card')), courierOn: f.elements.courierOn.checked, courier: U.parseAmount(val(f, 'courier')) / 100 };
      if (!(p.holdMail >= 0) || !(p.card >= 0) || !(p.courier > 0 && p.courier < 0.2)) { Dlg.msg('Products & pricing', 'Please check the amounts (courier commission between 0.1% and 20%).', 'bigwarn'); return; }
      done(G.setPricing(p), 'Fee schedule saved.');
    }
  };

  /* ---------- Aktionen ---------- */
  function byId(list, id) { return G.state[list].find(function (x) { return x.id === id; }); }
  const ACT = {
    go: function (el) { B.go(el.dataset.href); },
    print: function () { window.print(); },
    handbook: openHandbook,
    logout: function () { Dlg.confirm('Sign off', 'Do you want to sign off from PBS/Web?<br>Your work is saved automatically.', function () { logout(); }); },
    newgame: function () { Dlg.confirm('New career', 'Start a new career?<br>The current bank and all progress will be lost.', newGame, 'bigwarn', 'Yes', 'No'); },
    restart: function () { newGame(); },
    eod: function () { runEOD(); },

    agenda: function (el) { const a = G.state.agenda.find(function (x) { return x.id === el.dataset.id; }); if (a) openMeeting(a); },
    agdelegate: function (el) { const r = G.delegateAgenda(el.dataset.id); if (done(r, 'Appointment delegated.') && r.text) Dlg.msg('Diary', e(r.text)); },
    agskip: function (el) { Dlg.confirm('Skip appointment', 'Skip this appointment? The client – or the partners – will notice.', function () { done(G.skipAgenda(el.dataset.id), 'Appointment skipped.'); }, 'bigwarn', 'Skip', 'Cancel'); },
    wait: function (el) { done(G.wait(+el.dataset.min || undefined), 'You wait.'); },
    retire: function () {
      Dlg.confirm('Retire', 'Retire from Vogt &amp; Cie now? The partners buy back your share and the game ends.', function () { const r = G.retire(); if (!r.ok) fail(r); else render(); }, 'bigwarn', 'Retire', 'Cancel');
    },
    readall: function () { G.state.messages.forEach(function (m) { if (!m.read) G.markRead(m.id); }); render(); },

    holdmail: function (el) {
      const c = G.client(el.dataset.id);
      const on = el.dataset.on === '1';
      Dlg.confirm('Hold mail (banklagernd)', on ? 'Agree hold mail for <b>' + e(c.rubrik) + '</b>?<br>All correspondence will be kept at the bank. Annual fee CHF ' + U.fmt(G.state.pricing.holdMail, 0) + '.' :
        'Cancel hold mail for <b>' + e(c.rubrik) + '</b>?<br>Statements will be mailed to ' + e(c.city) + ', ' + e(G.cname(c.dom)) + '.',
      function () { done(G.setHoldMail(c.id, on), on ? 'Hold mail agreed.' : 'Hold mail cancelled.'); });
    },
    forma: function (el) { done(G.requestFormA(el.dataset.id), 'Form A sent to the client for signature (via hold mail / RM visit).'); },
    openacc: function (el) {
      const c = G.client(el.dataset.id);
      const ents = G.entitiesOf(c.id);
      const body = '<table class="frm"><tr><th>Holder</th><td><select name="holder" class="inp"><option value="">' + e(c.name) + ' (personal)</option>' +
        ents.map(function (x) { return '<option value="' + x.id + '">' + e(x.name) + '</option>'; }).join('') + '</select></td></tr>' +
        '<tr><th>Account type</th><td><select name="type" class="inp"><option value="CUR">Current account (Kontokorrent)</option><option value="DEP">Securities portfolio (Depot)</option><option value="MET">Precious metals (Edelmetall, gold)</option></select></td></tr>' +
        '<tr><th>Currency</th><td><select name="ccy" class="inp">' + G.currencies().map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select> <span class="small muted">(portfolios are kept in CHF, gold in XAU oz)</span></td></tr>' +
        '<tr><th>Strategy (portfolio)</th><td>' + H.sel('name="strat"', Object.keys(D.STRATS).map(function (k) { return [k, D.STRATS[k].label]; }), 'balanced') + '</td></tr></table>';
      Dlg.open({
        title: 'Open account – ' + c.id + ' ' + c.rubrik, width: 480, body: body,
        buttons: [{ label: 'Open account', def: true, fn: function (ov) {
          const g = function (n) { return ov.querySelector('[name=' + n + ']').value; };
          const r = G.openAccount(c.id, g('ccy'), g('type'), g('holder') || null, g('strat'));
          if (done(r)) setStatus('Account ' + r.acc.id + ' opened.');
        } }, { label: 'Cancel' }]
      });
    },
    offboard: function (el) {
      const c = G.client(el.dataset.id);
      Dlg.confirm('Terminate relationship', 'Terminate the relationship <b>' + c.id + ' ' + e(c.rubrik) + '</b>?<br><br>All assets (CHF ' + U.fmt(G.clientAUM(c.id), 0) + ') will be transferred to a bank of the client\'s choice and the accounts closed. Revenue from this client will be lost.',
        function () { done(G.offboard(c.id), 'Relationship ' + c.id + ' terminated.'); }, 'bigwarn', 'Terminate', 'Cancel');
    },
    disclose: function (el) {
      const c = G.client(el.dataset.id);
      const ch = G.disclosureChance(c);
      Dlg.confirm('Recommend voluntary disclosure', 'Recommend to <b>' + e(c.name) + '</b> to declare the assets to the tax authorities at home?<br><br>Estimated chance of acceptance: <b>' + U.fmt(ch * 100, 0) + '%</b>. A declared client is safe – but pays lower margins and may move to a cheaper bank. A refusal strains the relationship.',
        function () { done(G.recommendDisclosure(c.id), 'Recommendation made.', 'Voluntary disclosure'); }, 'ques', 'Recommend', 'Cancel');
    },
    repay: function (el) {
      const l = byId('loans', el.dataset.id);
      if (!l) return;
      Dlg.confirm(l.type === 'lombard' ? 'Repay loan' : 'Release guarantee', (l.type === 'lombard' ? 'Debit the client\'s account to repay loan ' : 'Release the pledge and end back-to-back arrangement ') + '<b>' + l.id + '</b> (' + l.ccy + ' ' + U.fmt(l.amount, 0) + ')?', function () {
        done(G.repayLoan(l.id), 'Loan ' + l.id + ' settled.');
      }, 'ques', 'Yes', 'No');
    },
    card: function (el) {
      const c = G.client(el.dataset.id);
      Dlg.confirm('Offshore credit card', 'Issue a gold card for <b>' + e(c.rubrik) + '</b> through our correspondent in Nassau? Annual fee CHF ' + U.fmt(G.state.pricing.card, 0) + '. The card carries no reference to Switzerland.', function () {
        const r = G.issueCard(c.id);
        if (done(r, 'Card issued.')) Dlg.msg('Offshore credit card', 'Card <b>' + r.card.id + '</b> issued by ' + e(r.card.issuer) + ', limit CHF ' + U.fmt(r.card.limit, 0) + '. Delivery by courier to the client.');
      }, 'ques', 'Issue', 'Cancel');
    },
    cardcancel: function (el) { Dlg.confirm('Cancel card', 'Cancel card <b>' + e(el.dataset.id) + '</b>?', function () { done(G.cancelCard(el.dataset.id), 'Card cancelled.'); }, 'ques', 'Yes', 'No'); },
    booking: function (el) {
      const c = G.client(el.dataset.id);
      const loc = el.dataset.loc || null;
      Dlg.confirm('Booking centre', (loc ? 'Book the assets of <b>' + e(c.rubrik) + '</b> with ' + e(D.LOCATIONS[loc].name) + '?' : 'Book the assets of <b>' + e(c.rubrik) + '</b> back to Zürich?') + '<br>One-off fee 0.25% of assets (CHF ' + U.fmt(G.clientAUM(c.id) * 0.0025, 0) + '), charged to the client.', function () {
        done(G.bookOffshore(c.id, loc), loc ? 'Assets booked abroad.' : 'Assets booked back to Zürich.');
      }, 'ques', 'Book', 'Cancel');
    },
    vaultext: function () { Dlg.confirm('Extend vault', 'Build 100 additional safe-deposit boxes in basement 2 for CHF 450,000?', function () { done(G.extendVault(), 'Vault extended.'); }, 'ques', 'Build', 'Cancel'); },

    paycheck: function (el) {
      const f = el.closest('form');
      const p = keepDraft(f);
      $('precheck').innerHTML = V.precheckResult(p);
      setStatus('Pre-check completed.');
    },
    payclear: function () { UI.draft = null; route(); },
    payedit: function (el) {
      const p = byId('payments', el.dataset.id);
      if (!p) return;
      const body = '<table class="frm"><tr><th>Debit account</th><td><select name="debit" class="inp" style="width:100%">' + H.accountOptions(function (a) { return a.client === p.client && a.type === 'CUR'; }, p.debit) + '</select></td></tr>' +
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
      const p = byId('payments', el.dataset.id);
      if (!p) return;
      const bank = D.bankByBic(p.bic);
      const body = '<table class="kv dlgkv"><tr><th>Payment</th><td><b>' + p.ref + '</b> · ' + p.ccy + ' ' + U.fmt(p.amount, H.dec(p.ccy)) + '</td></tr><tr><th>Beneficiary</th><td>' + e(p.benefName) + '<br>' + e(bank ? bank.name + ', ' + bank.city : p.bic) + '</td></tr><tr><th>Purpose</th><td>' + e(p.purpose) + '</td></tr></table>' +
        '<div class="pcsec">Pre-check</div>' + V.precheckResult(p) +
        '<div class="pcsec">Second signature (Visum)</div><div>' + e(G.state.user.id) + ' · ' + U.fmtDate(G.state.date) + ' ' + U.fmtTime(G.state.clock) + ' · authorised for amounts without limit (Kollektivunterschrift zu zweien) ' + H.dur(4) + '</div>';
      Dlg.open({
        title: 'Release payment – four-eyes principle', width: 560, body: body,
        buttons: [{ label: 'Release', def: true, fn: function () {
          const r = G.releasePayment(p.id);
          if (!done(r)) return;
          setStatus('Payment ' + p.ref + ' released and sent via SWIFT.');
          const al = r.alert;
          Dlg.open({
            title: 'SWIFT – message queued for transmission', width: 560, sound: al ? 'ding' : null,
            body: (al ? '<div class="errbox"><svg class="ico"><use href="#i-warn"/></svg> Transaction monitoring created alert <b>' + al.id + '</b>: ' + al.rules.join(', ') + '</div>' : '') + V.mt103(p)
          });
        } }, { label: 'Cancel' }]
      });
    },
    payreject: function (el) {
      const p = byId('payments', el.dataset.id);
      if (!p) return;
      Dlg.confirm('Reject payment', 'Reject payment <b>' + p.ref + '</b> (' + p.ccy + ' ' + U.fmt(p.amount, H.dec(p.ccy)) + ' to ' + e(p.benefName) + ')?' + (p.source === 'client' ? '<br><br>This is a client instruction – the client will be displeased.' : ''),
        function () { done(G.rejectPayment(p.id), 'Payment ' + p.ref + ' rejected.'); }, 'bigwarn', 'Reject', 'Cancel');
    },

    cashok: function (el) {
      const r = G.counterAccept(el.dataset.id);
      if (!done(r, 'Cash transaction booked.')) return;
      alertNotice(r.alert, 'Cash transaction booked.');
    },
    cashno: function (el) {
      Dlg.confirm('Refuse cash transaction', 'Refuse this cash transaction and send the client away?', function () { done(G.counterRefuse(el.dataset.id), 'Client sent away.'); }, 'bigwarn', 'Refuse', 'Cancel');
    },
    courierok: function (el) {
      const k = byId('couriers', el.dataset.id);
      if (!k) return;
      const c = G.client(k.client);
      Dlg.confirm('Courier run', 'Send a courier to collect <b>' + k.ccy + ' ' + U.fmt(k.amount, 0) + '</b> in cash from ' + e(c.rubrik) + ' in ' + e(k.from) + '?<br><br>Estimated risk of arrest: <b>' + U.fmt(G.courierRisk(k) * 100, 0) + '%</b>. <b class="neg">You personally approve this run.</b>', function () {
        done(G.courierApprove(k.id), 'Courier dispatched.');
      }, 'bigwarn', 'Send courier', 'Cancel');
    },
    courierno: function (el) { done(G.courierDecline(el.dataset.id), 'Courier request declined.'); },

    alert: function (el) {
      const a = byId('alerts', el.dataset.id);
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
            Dlg.confirm('Report to MROS', 'File a suspicious activity report for <b>' + e(G.client(a.client).rubrik) + '</b>?<br><br>The assets will be blocked and the relationship terminated. The client must not be informed (Art. 10 GwG).',
              function () { done(G.reportAlert(a.id), 'Report filed with MROS.'); }, 'bigwarn', 'File report', 'Cancel');
            return;
          }
          const r = G.closeAlert(a.id, ov.querySelector('[name=just]').value, ov.querySelector('[name=comment]').value.trim());
          if (!r.ok) { Dlg.msg('PBS/Web', e(r.msg), 'bigwarn'); return false; }
          done(r, 'Alert ' + a.id + ' closed.');
        } }, { label: 'Cancel' }] : [{ label: 'Close', def: true }]
      });
    },
    delegate: function (el) { G.setDelegation(el.checked); render(); setStatus(el.checked ? 'The compliance team clears routine alerts each evening.' : 'All alerts stay with you.'); },

    decide: function (el) {
      const m = byId('messages', el.dataset.id);
      const act = m && m.actions.find(function (a) { return a[0] === el.dataset.key; });
      if (!act) return;
      Dlg.confirm('Confirm decision', 'Record the decision <b>"' + e(act[1]) + '"</b>?<br><span class="muted">' + e(m.subject) + '</span>', function () {
        const r = G.act(m.id, act[0]);
        if (done(r, 'Decision recorded.')) Dlg.msg('Decision recorded', H.paras(r.text || 'Done.'));
      }, 'ques', 'Yes', 'No');
    },

    entsuggest: function (el) {
      const f = el.closest('form');
      const j = f.querySelector('input[name=jur]:checked');
      f.elements.name.value = G.suggestEntityName(j ? j.value : 'VG');
    },

    lawyer: function (el) {
      const L = D.LAWYERS[el.dataset.key];
      const on = el.dataset.on === '1';
      Dlg.confirm('Defence counsel', (on ? 'Retain ' : 'Terminate the mandate of ') + '<b>' + e(L.name) + '</b>' + (on ? ' for CHF ' + U.fmt(L.cost, 0) + ' p.a.?' : '?'), function () { done(G.retainLawyer(el.dataset.key, on), on ? 'Counsel retained.' : 'Mandate terminated.'); }, 'ques', 'Yes', 'No');
    },
    lobby: function (el) {
      const L = D.LOBBY[el.dataset.key];
      const on = el.dataset.on === '1';
      Dlg.confirm('Lobbying', (on ? 'Start ' : 'Stop ') + '<b>' + e(L.name) + '</b>' + (on ? ' for CHF ' + U.fmt(L.cost, 0) + ' p.a.?' : '?'), function () { done(G.setLobby(el.dataset.key, on), on ? 'Lobbying started.' : 'Lobbying stopped.'); }, 'ques', 'Yes', 'No');
    },
    dataaudit: function () { Dlg.confirm('Data security', 'Restrict access rights to client data and log all printouts for CHF 250,000?', function () { done(G.dataAudit(), 'Access rights restricted.'); }, 'ques', 'Yes', 'No'); },

    staffdlg: function (el) {
      const x = G.staff(el.dataset.id);
      if (!x) return;
      Dlg.open({
        title: x.name + ' – ' + D.ROLES[x.role].label, width: 540, icon: 'i-user', body: V.staffDialog(x),
        buttons: [{ label: 'Execute', def: true, fn: function (ov) {
          const f = ov.querySelector('#staffform');
          const sa = f.querySelector('input[name=sa]:checked').value;
          if (sa === 'raise') done(G.raise(x.id, +val(f, 'pct')), 'Salary of ' + x.name + ' increased.');
          else if (sa === 'bonus') done(G.payBonus(x.id, U.parseAmount(val(f, 'bonus'))), 'Bonus paid to ' + x.name + '.');
          else if (sa === 'train') done(G.train(x.id), x.name + ' is attending a training course.');
          else if (sa === 'vet') {
            const r = G.vet(x.id);
            if (done(r, 'Background check completed.')) Dlg.msg('Background check – ' + e(x.name), 'Integrity: ' + H.stars(r.integrity) + '<br><br>' + (r.integrity <= 2 ? '<b class="neg">The investigator found debts, a gambling habit and an unexplained second phone.</b>' : r.integrity >= 4 ? 'Nothing unusual. References are excellent.' : 'Nothing serious found.'));
          } else if (sa === 'fire') {
            Dlg.confirm('Dismiss employee', 'Dismiss <b>' + e(x.name) + '</b>? Severance: six months\' salary (CHF ' + U.fmt(x.salary / 2, 0) + ').' + (x.role === 'rm' ? '<br><br>Some clients may follow the relationship manager.' : ''), function () { done(G.fire(x.id), x.name + ' has left the bank.'); }, 'bigwarn', 'Dismiss', 'Cancel');
          }
        } }, { label: 'Cancel' }]
      });
    },
    hire: function (el) {
      const c = byId('candidates', el.dataset.id);
      if (!c) return;
      Dlg.confirm('Hire applicant', 'Hire <b>' + e(c.name) + '</b> as ' + e(c.title) + ' at CHF ' + U.fmt(c.salary, 0) + ' p.a.?<br>Headhunter fee: CHF ' + U.fmt(c.salary * 0.2, 0) + '. ' + H.dur(30), function () { done(G.hire(c.id), c.name + ' joins the bank.'); }, 'ques', 'Hire', 'Cancel');
    },
    openloc: function (el) {
      const L = D.LOCATIONS[el.dataset.key];
      Dlg.confirm('Open location', 'Open <b>' + e(L.name) + '</b>?<br>' + (L.kind === 'sub' ? 'Capital to be tied up in the subsidiary: CHF ' : 'Investment: CHF ') + U.fmt(L.setup, 0) + ' · running cost about CHF ' + U.fmt(L.daily * 250, 0) + ' p.a. ' + H.dur(60), function () { done(G.openLocation(el.dataset.key), L.name + ' opened.'); }, 'ques', 'Open', 'Cancel');
    },
    closeloc: function (el) {
      const L = D.LOCATIONS[el.dataset.key];
      Dlg.confirm('Close location', 'Close <b>' + e(L.name) + '</b>? Staff there will be let go and clients booked there return to Zürich.', function () { done(G.closeLocation(el.dataset.key), L.name + ' closed.'); }, 'bigwarn', 'Close', 'Cancel');
    },
    findcorr: function () { done(G.findCorrespondent(), 'Search completed.', 'USD correspondent'); },
    dd: function (el) { done(G.dueDiligence(el.dataset.id), 'Due diligence completed – see the table.'); },
    // Kundendaten auf der Festplatte: bequem, aber Futter für Datendiebe und die Revision
    xlsexport: function () {
      const FS = PBS.FS, s = G.state;
      const list = G.activeClients();
      const path = FS.specialPaths().documents.concat(['Kundenliste_' + s.date.replace(/-/g, '') + '.xls']);
      const body = 'Bankhaus Vogt & Cie – Kundenstamm per ' + U.fmtDate(s.date) + ' – STRENG VERTRAULICH\r\n\r\nClient no.;Codename;Name;City;Domicile;RM;AuM CHF\r\n' +
        list.map(function (c) { return [c.id, c.rubrik, c.name, c.city, G.cname(c.dom), G.rmName(c), Math.round(G.clientAUM(c.id))].join(';'); }).join('\r\n') + '\r\n';
      if (!FS.write(path, body, { mime: 'xls', client: true, game: true })) { Dlg.msg('Export (Excel)', 'The file could not be written: ' + (FS.lastError === 'full' ? 'the disk is full.' : 'access is denied.'), 'err'); return; }
      Dlg.msg('Export (Excel)', '<b>' + list.length + '</b> relationship(s) exported to<br><b>' + e(FS.join(path)) + '</b><br><br><span class="muted">IT directive 4.2: client data must not be kept on workstations or removable media. Delete the file once you no longer need it.</span>', 'info');
    },
    stmtsave: function (el) {
      const FS = PBS.FS, a = G.account(el.dataset.id), doc = document.querySelector('#content .doc.stmt');
      if (!a || !doc) return;
      const dir = FS.specialPaths().documents.concat(['Statements']);
      FS.mkdir(dir);
      PBS.Apps.fileDlg({ mode: 'save', title: 'Save Web Page', dir: dir, name: 'Statement ' + a.id + ' ' + G.state.date + '.htm', types: [['Web Page (*.htm;*.html)', 'htm;html'], ['All Files (*.*)', '*']], onOk: function (p) {
        const css = 'body{font:12px Arial,sans-serif;margin:24px;color:#000}.lh{display:flex;justify-content:space-between;border-bottom:2px solid #0b2a55;padding-bottom:6px;margin-bottom:14px}.wm{font:22px Georgia,serif;letter-spacing:3px;color:#0b2a55}.wms{font-size:9px;letter-spacing:2px;color:#9a7b3a}.lhr{font-size:10px;text-align:right}.addr{margin:10px 0 16px}.stamp{display:inline-block;border:2px solid #a00;color:#a00;padding:1px 6px;font-weight:bold}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border-bottom:1px solid #ccc;padding:3px 6px;text-align:left;vertical-align:top}th{background:#eef1f6}.num{text-align:right}.small{font-size:10px}.muted{color:#666}';
        const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Statement ' + e(a.id) + '</title><style>' + css + '</style></head><body>' + doc.outerHTML + '</body></html>';
        if (FS.write(p, html, { mime: 'html', client: true, game: true })) setStatus('Saved: ' + FS.join(p));
        else Dlg.msg('Save Web Page', 'The file could not be written: ' + (FS.lastError === 'full' ? 'the disk is full.' : 'access is denied.'), 'err');
      } });
    },
    guide: function () { Dlg.closeAll(); PBS.Guide.start(); if (UI.screen !== 'app') location.hash = '#/overview'; },
    settings: function () { PBS.L.dialog(); },
    ordcancel: function (el) { done(G.trade.cancel(el.dataset.id), 'Order cancelled.'); },
    invprint: function () { window.print(); },
    invreset: function () { UI.inv = V.invoiceDefault('fee', { fmt: 'letter', paper: UI.inv.paper, pw: UI.inv.pw, ph: UI.inv.ph }); route(); setStatus('Invoice reset.'); },
    acquire: function (el) {
      const t = byId('targets', el.dataset.id);
      if (!t) return;
      Dlg.confirm('Acquisition', 'Acquire <b>' + e(t.name) + '</b> for CHF ' + U.fmt(t.price, 0) + '?' + (t.dd ? '' : '<br><br><b class="neg">No due diligence has been performed.</b>'), function () {
        const r = G.acquire(t.id);
        if (done(r, 'Acquisition completed.')) Dlg.msg('Acquisition', '<b>' + e(t.name) + '</b> has been integrated. ' + r.n + ' client relationship(s) transferred to Vogt &amp; Cie.');
      }, t.dd ? 'ques' : 'bigwarn', 'Acquire', 'Cancel');
    }
  };

  function openHandbook() { Dlg.open({ title: 'PBS/Web – Handbook', icon: 'i-info', body: '<div class="inner">' + V.handbook() + '</div>', width: 680 }); }

  /* ---------- Ereignisse ---------- */
  document.addEventListener('click', function (ev) {
    touch();
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.type !== 'checkbox') ev.preventDefault();
    const fn = ACT[el.dataset.act];
    if (fn && G.state) fn(el);
  });

  document.addEventListener('submit', function (ev) {
    const f = ev.target;
    if (f.id === 'loginform') return onLogin(ev);
    if (!f.dataset.form) return;
    ev.preventDefault();
    touch();
    if (FORMS[f.dataset.form] && G.state) FORMS[f.dataset.form](f, ev);
  });

  function onFilter(el) {
    const p = (el.dataset.filter || el.dataset.filterchk).split('.');
    UI.f[p[0]] = UI.f[p[0]] || {};
    UI.f[p[0]][p[1]] = el.type === 'checkbox' ? el.checked : el.value;
    const isText = el.tagName === 'INPUT' && el.type === 'text';
    route(true);
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
    if (f.id === 'invform' && UI.inv) { readInvoice(f, el); return; }
    if (f.dataset.form === 'transfer') transferPreview(f);
    if (f.dataset.form === 'house' && /^w_/.test(el.name)) {
      const st = el.name.split('_')[1];
      const sum = D.CLASS_KEYS.reduce(function (t, k) { return t + (U.parseAmount(val(f, 'w_' + st + '_' + k)) || 0); }, 0);
      const cell = $('sum_' + st);
      if (cell) cell.innerHTML = '<b class="' + (Math.abs(sum - 100) > 0.01 ? 'neg' : '') + '">' + U.fmt(sum, 0) + '%</b>';
    }
  });

  document.addEventListener('change', function (ev) {
    const el = ev.target;
    if (el.dataset && el.dataset.filter && el.tagName === 'SELECT') return onFilter(el);
    if (el.dataset && el.dataset.filterchk) return onFilter(el);
    if (el.name === 'selall') {
      el.form.querySelectorAll('input[name=sel]').forEach(function (c) { c.checked = el.checked; });
      return;
    }
    const f = el.form;
    if (f && f.id === 'invform' && UI.inv) {
      if (el.name === 'tpl') { UI.inv = V.invoiceDefault(el.value, UI.inv); route(); } else readInvoice(f, el);
      return;
    }
    if (f && f.dataset.form === 'transfer') transferPreview(f);
  });

  function transferPreview(f) {
    const box = $('trprev');
    const pv = G.transferPreview(val(f, 'from'), val(f, 'to'), U.parseAmount(val(f, 'amount')));
    if (!pv) { box.textContent = '–'; return; }
    const from = G.account(val(f, 'from')), to = G.account(val(f, 'to'));
    box.innerHTML = 'Debit ' + H.ccyL(from.ccy) + ' ' + U.fmt(U.parseAmount(val(f, 'amount')), from.type === 'DEP' ? 2 : H.dec(from.ccy)) + ' → credit <b>' + H.ccyL(to.ccy) + ' ' + U.fmt(pv.credit, to.type === 'DEP' ? 2 : H.dec(to.ccy)) + '</b>' +
      (pv.spread ? ' · FX margin ' + U.fmt(pv.spread * 100, 2) + '%' : '') + (pv.brok ? ' · brokerage CHF ' + U.fmt(pv.brok) : '') +
      (from.client !== to.client ? '<br><span class="neg">Transfer between different relationships – monitored.</span>' : '');
  }

  document.addEventListener('keydown', function (ev) {
    touch();
    if (ev.key === 'F9' && UI.screen === 'app' && !Dlg.any() && (!PBS.WM.focused || PBS.WM.focused === 'ie')) {
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
    tip.innerHTML = '<b>' + q[2] + '</b> · ' + q[3];
    [cx, cd, tip].forEach(function (n) { n.classList.remove('hidden'); });
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const left = q[0] / vb.width * r.width;
    const top = q[1] / vb.height * r.height;
    tip.style.left = Math.max(0, Math.min(left + 10, r.width - tip.offsetWidth - 2)) + 'px';
    tip.style.top = Math.max(0, top - 30) + 'px';
    UI.hoverChart = ch;
  });

  window.addEventListener('hashchange', navigate);
  // Rechnung drucken: nur das Blatt, Seitengrösse = gewähltes Papier, ohne Ränder
  window.addEventListener('beforeprint', function () {
    const inv = UI.screen === 'intra' && $('inv-preview') && UI.inv;
    document.body.classList.toggle('print-inv', !!inv);
    let st = $('inv-page');
    if (!st) { st = document.createElement('style'); st.id = 'inv-page'; document.head.appendChild(st); }
    st.textContent = inv ? V.invoicePageCSS(UI.inv) : '';
  });
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('print-inv');
    if ($('inv-page')) $('inv-page').textContent = '';
  });

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
      PBS.FS.purgeGame();
      loginInfo();
      loginError(['Game data deleted. A new bank will be set up at sign-on.'], true);
    }, 'bigwarn', 'Delete', 'Cancel');
  });

  Dlg.afterClose = function () { setTimeout(checkAgenda, 250); };
  Tutor.init({ ctx: function () { return { screen: UI.screen, path: UI.path, session: UI.session }; } });
  PBS.Guide.init({ ctx: function () { return { screen: UI.screen, path: UI.path, session: UI.session }; } });
  B.init({
    home: function () { B.go('#/overview'); },
    refresh: navigate,
    mail: function () { B.go('#/inbox'); },
    handbook: openHandbook,
    loggedIn: function () { return UI.session; },
    search: function (q) {
      if (!UI.session || !G.state) return 'Please sign on to PBS/Web first.';
      if (!q) return [];
      const l = q.toLowerCase();
      return G.state.clients.filter(function (c) { return (c.id + ' ' + c.rubrik + ' ' + c.name + ' ' + c.city).toLowerCase().indexOf(l) >= 0; })
        .map(function (c) { return { t: c.id + ' ' + c.rubrik + ' – ' + c.name, h: '#/client/' + c.id }; });
    },
    clock: function () { return UI.session && G.state ? { text: U.fmtTime(G.state.clock), tip: U.longDate(G.state.date) + ' (value date)' } : null; }
  });

  // Arbeitsplatz: Abmelden beendet auch die PBS/Web-Sitzung
  function logOffWindows() {
    PBS.WM.closeAllApps();
    PBS.WM.showIE();
    if (UI.session) logout('You have been logged off.', true); else showLogin();
  }
  function shutDown(kind) {
    if (G.state) G.save();
    PBS.WM.closeAllApps();
    UI.session = false;
    Dlg.closeAll();
    const sd = $('shutdown');
    sd.classList.remove('hidden');
    if (kind === 'restart') {
      sd.innerHTML = '<div class="sd-box"><svg class="ico32"><use href="#i-start"/></svg><div>Windows is restarting…</div></div>';
      setTimeout(function () { sd.classList.add('hidden'); sd.innerHTML = ''; PBS.WM.showIE(); showLogin(); }, 2200);
    } else {
      sd.innerHTML = '<div class="sd-box"><svg class="ico32"><use href="#i-start"/></svg><div>It is now safe to turn off your computer.</div><button type="button" class="btn" id="sd-restart">Restart</button></div>';
      $('sd-restart').onclick = function () { sd.classList.add('hidden'); sd.innerHTML = ''; PBS.WM.showIE(); showLogin(); };
    }
  }
  PBS.WM.init({
    onClose: B.onIEClose,
    navigate: function (u) { PBS.WM.showIE(); if (/^#\//.test(u)) B.go(u); else B.navigateUrl(u); },
    home: function () { B.go('#/overview'); },
    help: openHandbook,
    loggedIn: function () { return UI.session; },
    logoff: function (now) { if (now) logOffWindows(); else Dlg.confirm('Log Off Windows', 'Are you sure you want to log off?', logOffWindows, 'ques', 'Log Off', 'Cancel'); },
    shutdown: shutDown
  });

  // Neuer Arbeitsplatz verlangt, aber noch keine modernen Szenarien vorhanden: zurück zum alten
  if (PBS.modern() && D.MODERN_READY !== true) {
    try { localStorage.setItem('pbs-vogt-era', 'classic'); } catch (x) { /* */ }
    location.reload();
    return;
  }
  document.body.classList.toggle('modern', PBS.modern());
  // Ländereinstellungen: Anzeige neu aufbauen; Dollarumrechnung beobachtet das Dokument
  PBS.L.hooks = { refresh: function () { if (UI.screen === 'app' || UI.screen === 'intra') route(true); else if (UI.screen === 'login') showLogin(); PBS.L.apply(); } };
  PBS.L.watch();
  // Feste Beschriftungen der Seite auf Englisch
  if (PBS.L.lang === 'en') {
    const EN = { 'Telefonbuch': 'Phone book', 'Menüplan': 'Canteen menu', 'Weisungen': 'Directives', 'Mandant 001 Zürich': 'Client unit 001 Zurich', 'Mandant': 'Client unit' };
    ['ie-links', 'login'].forEach(function (id) {
      const w = document.createTreeWalker($(id), NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) Object.keys(EN).forEach(function (k) { if (n.data.indexOf(k) >= 0) n.data = n.data.split(k).join(EN[k]); });
    });
  }
  $('lg-settings').addEventListener('click', function (ev) { ev.preventDefault(); PBS.L.dialog(); });

  tokenTick();
  setInterval(tokenTick, 1000);
  setInterval(sessionTick, 1000);
  const h = location.hash;
  let resume = null;
  try { resume = sessionStorage.getItem('pbs-resume'); sessionStorage.removeItem('pbs-resume'); } catch (x) { /* */ }
  const saved = resume && G.hasSave() ? G.load() : null;
  // Nach dem Sprachwechsel: Sitzung ohne neue Anmeldung fortsetzen
  if (saved && !saved.gameOver) { UI.afterLogin = resume; signOn(saved.user.id, true); }
  else if (h.indexOf('#/x/') === 0 || h.indexOf('#/404') === 0) route();
  else { UI.afterLogin = h; showLogin(); }
})(window.PBS);
