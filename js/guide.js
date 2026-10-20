/* Einsteiger-Führung ("Beginner's Guide"): ein kleines Fenster führt Schritt für Schritt durch die
   ersten beiden Arbeitstage. Jeder Schritt erklärt in einfachen Worten, zeigt auf die Stelle am
   Bildschirm und geht von selbst weiter, sobald die Aufgabe erledigt ist. Pro Spielstand gespeichert. */
(function (PBS) {
  'use strict';

  const G = PBS.Game, U = PBS.U;
  const e = U.esc;
  const t = PBS.L.t;
  const Guide = PBS.Guide = { hooks: {} };
  let el = null, target = null, shownKey = '', base = null, advancing = null, collapsed = false;

  function S() { return G.state; }
  function st() { const s = S(); return s && s.guide; }
  function ctx() { return Guide.hooks.ctx ? Guide.hooks.ctx() : {}; }
  // Kasten auf dem Dashboard anhand seiner Überschrift
  function panel(text) {
    return function () {
      const h = Array.prototype.find.call(document.querySelectorAll('#content .panel .ph span'), function (x) { return x.textContent.indexOf(text) >= 0; });
      return h ? h.closest('.panel') : null;
    };
  }
  function menu(href) { return '#menubar a[href="' + href + '"]'; }
  function unresolved() { return S().messages.filter(function (m) { return m.actions && m.actions.length && !m.resolved; }).length; }

  /* ---------- Die Schritte ---------- */
  // t: Titel, x: Absätze, task: was zu tun ist, done(c, s, base): erledigt?, a: worauf gezeigt wird, go: "Hinbringen"
  const STEPS = [
    { t: 'Welcome!', x: ['This guide takes you through your first two working days, one small step at a time. Nothing you do here can break the game.',
      'In short: you run a small Swiss private bank between 1998 and 2017. Rich people from abroad keep their money with you, often hidden from the tax office in their home country. You earn fees on that money.',
      'More money means more fees, but foreign tax authorities and the Swiss regulator are watching. Your job is to grow the bank without getting caught.',
      'Keep this little window open. It moves on by itself when you finish a task. ‹ Back and Next › work at any time.'] },
    { t: 'Finding your way', a: '#menubar', x: ['Everything happens inside this browser window, on an office PC at a bank in 2003.',
      'The dark blue bar is the main menu. Each word is a department of the bank. A red number on it counts things waiting for you.',
      'The column on the left shows the pages of the department you are in.'] },
    { t: 'Your first memo', a: '#content .ptitle h1', go: '#/inbox/M0001', x: ['On screen is a memo from the Senior Partner, Dr. Vogt. It is your job description.',
      'The most important line: for a foreigner, simply not declaring money (tax evasion) is not a crime in Switzerland, but forging documents (tax fraud) is. Many decisions in the game turn on that difference.'],
      task: 'Scroll down and read the memo. Press Next when you are done.' },
    { t: 'The Dashboard', a: menu('#/overview'), x: ['The Dashboard is your home page. It summarises the whole bank on one screen.'],
      task: 'Click "Overview" in the blue menu.', done: function (c) { return c.path === 'overview'; } },
    { t: 'Your to-do list', a: panel('Pending items'), go: '#/overview', x: ['This box lists everything that needs you today: payments to sign, clients at the counter, alerts, unread mail.',
      'Each line is a link that takes you straight to the right page. When this list is empty, your work for the day is done.'] },
    { t: 'What the partners want', a: panel('Partners\' targets'), go: '#/overview', x: ['Every January the partners check three numbers: assets (how much client money the bank looks after), profit, and how much the regulator is worried about you.',
      'Meet the targets and you earn a bonus. Miss them two years in a row and you are fired.'] },
    { t: 'The clock', a: '#nav .navbox', x: ['This box shows today\'s date and the time. Every button with a small clock badge costs that many minutes of your day.',
      'The office closes at 18:00 and the building locks at 20:00. You will never manage everything, so do the important things first.'] },
    { t: 'Mail & fax', a: menu('#/inbox'), x: ['Letters, faxes and memos arrive here overnight and during the day.'],
      task: 'Click "Mail & fax" in the blue menu.', done: function (c) { return c.path === 'inbox'; } },
    { t: 'Open a message', a: '#content table.grid', x: ['Some messages are just news. Others need a decision, such as whether to take a new client.'],
      task: 'Click the subject of any message other than the handover memo.', done: function (c) { return /^inbox\/M/.test(c.path) && c.path !== 'inbox/M0001'; } },
    { t: 'Making a decision', a: '#content .decide', x: ['If a message needs a decision, there are buttons at the bottom. The small text explains what each choice does.',
      'There is rarely a perfect answer. When in doubt, the cautious option is usually the safe one while you learn.'],
      task: 'If this message has decision buttons, choose one. If not, press Next.', start: function () { return { open: unresolved() }; }, done: function (c, s, b) { return unresolved() < b.open; } },
    { t: 'Payments', a: menu('#/pay/queue'), x: ['Clients send payment orders by fax. Before money leaves the bank, a second person must check and sign. Here, that person is you (the "four-eyes principle").'],
      task: 'Click "Payments" in the blue menu.', done: function (c) { return c.path === 'pay/queue'; } },
    { t: 'Release a payment', a: '#content table.grid', go: '#/pay/queue', x: ['The "Pre-check" column warns you. TM means the computer flagged the payment for compliance. XB means the money goes to the client\'s home country and leaves a paper trail there.',
      'A payment with no warnings is safe to release. Payments with warnings can still be released; just know that they add risk.'],
      task: 'Click "Release" on one payment. If the list is empty, press Next.', start: function () { return { n: G.pendingPayments().length }; }, done: function (c, s, b) { return G.pendingPayments().length < b.n; } },
    { t: 'The cash desk', a: '#nav a[href="#/pay/cash"]', x: ['Some clients come in person to bring or collect cash. Serve them before the evening or they leave annoyed.',
      'Large cash deposits (CHF 25,000 and more) set off a compliance alarm.'],
      task: t('Click "Cash desk (Kasse)" in the left column.', 'Click "Cash desk" in the left column.'), done: function (c) { return c.path === 'pay/cash'; } },
    { t: 'Your clients', a: menu('#/clients'), x: ['The client book lists every client. For discretion, each one also has a codename such as EDELWEISS.',
      '"AuM" means assets under management: how much money the client keeps with you. Your fees are a percentage of it.'],
      task: 'Click "Clients" in the blue menu.', done: function (c) { return c.path === 'clients'; } },
    { t: 'A client\'s file', a: '#content table.grid', go: '#/clients', x: ['Each client has a file with their accounts, products and notes.'],
      task: 'Click any client number (the blue link in the first column).', done: function (c) { return /^client\//.test(c.path); } },
    { t: 'Reading the file', a: '#content .cbanner', x: ['The coloured dots at the top are the client\'s status:',
      t('• "Hold mail" (banklagernd): no letters are sent to the client\'s home, so their tax office never sees a bank statement.', '• "Hold mail": no letters are sent to the client\'s home, so their tax office never sees a bank statement.'),
      '• "Form A": the form recording who really owns the money. The law requires it.',
      '• "Declared": the client pays tax on the money. Safe for you, but they pay lower fees.'] },
    { t: 'The risk monitor', a: menu('#/compliance'), x: ['This is the most important page for staying out of trouble.'],
      task: 'Click "Compliance" in the blue menu.', done: function (c) { return c.path === 'compliance'; } },
    { t: 'Who is watching you', a: '#content .panel', x: ['Each bar shows how interested one authority is in your bank: the Swiss regulator (EBK, later FINMA) and the tax authorities of the USA, Germany, Italy, France and Britain.',
      'Green is fine. Above about 55, a foreign authority may open an investigation. If the regulator\'s bar reaches 100, the bank loses its licence and the game is over.'] },
    { t: 'Alerts', a: '#nav a[href="#/compliance/alerts"]', x: ['The computer flags unusual transactions. Clear each alert within ten business days by choosing a reason. A weak reason may be caught by the auditors later.',
      'The checkbox on that page lets the compliance team clear routine alerts overnight, which saves you time.'],
      task: 'Click "Alerts" in the left column.', done: function (c) { return c.path === 'compliance/alerts'; } },
    { t: 'Appointments', a: '#nav .navbox', x: ['When the clock reaches an appointment, a window pops up: a client visit, a phone call, the monthly investment committee.',
      'Pick an option, then Attend (it costs the time shown), Delegate (a colleague goes instead) or Later.'] },
    { t: 'Ending the day', a: '#nav .btn.eod', x: ['When you are done, or out of time, end the day. The night batch books your fees, moves the markets and brings new mail.',
      'A list of open items may appear first. While you are learning, it is fine to end the day with some left over.'],
      task: 'Click "End of day" (or press F9), then "Start batch". Read the printout and click OK.', start: function () { return { day: S().dayNo }; }, done: function (c, s, b) { return s.dayNo > b.day; } },
    { t: 'Good morning!', a: menu('#/overview'), x: ['A new day has begun. From now on, every day follows the same routine:',
      '1. Overview: look at the pending items.  2. Mail & fax: make the decisions.  3. Payments: sign orders and serve the cash desk.  4. Compliance: clear alerts.  5. End of day.'],
      task: 'Click "Overview" to start your second day.', done: function (c) { return c.path === 'overview'; } },
    { t: 'Your people', a: menu('#/org/staff'), x: ['Your employees do most of the work. Pay them close to the market rate and keep their morale up. Unhappy bankers quit and take their clients with them.',
      'Watch out for staff with low integrity. They are the ones who leak or steal data.'],
      task: 'Click "Organisation" in the blue menu.', done: function (c) { return c.path === 'org/staff'; } },
    { t: 'Your score', a: '#nav a[href="#/career"]', go: '#/overview', x: ['Your bonus goes into your own private numbered account. That fortune is your score.',
      'The game ends when you retire, sell the bank or reach 2018, or earlier if you are fired, arrested or the bank is shut down.'],
      task: 'Click "Targets & career" in the left column (it is under Overview).', done: function (c) { return c.path === 'career'; } },
    { t: 'Golden rules for beginners', x: ['1. Read before you click. The small grey text explains the consequences.',
      '2. Keep the risk bars low. Once an authority starts investigating, things get worse quickly.',
      '3. Make sure every client has a Form A.',
      '4. Not every client is worth having. Be careful with politicians (PEPs) and cash that comes from nowhere.',
      '5. Delegate appointments when you are busy.',
      '6. Do not leave client lists on the computer. That is what data thieves look for.',
      'That\'s it. The Handbook (top right) has the details. You can restart this guide from there or from Help › Beginner\'s Guide.'] }
  ];

  /* ---------- Steuerung ---------- */
  Guide.active = function () { const g = st(); return !!(g && g.on && !S().gameOver); };
  Guide.start = function () {
    const s = S();
    if (!s) return;
    s.guide = { on: true, step: 0 };
    collapsed = false;
    if (PBS.Tutor) PBS.Tutor.done('intro');
    G.save();
    shownKey = '';
    Guide.update();
  };
  Guide.stop = function (finished) {
    const s = S();
    if (!s || !s.guide) return;
    s.guide.on = false;
    if (finished) { s.guide.done = true; if (PBS.Tutor) PBS.Tutor.markAll(); }
    G.save();
    hide();
  };
  function go(n) {
    const g = st();
    g.step = Math.max(0, Math.min(STEPS.length - 1, n));
    G.save();
    base = null;
    clearTimeout(advancing);
    advancing = null;
    shownKey = '';
    Guide.update();
  }

  function anchor(step) {
    if (!step.a) return null;
    const n = typeof step.a === 'function' ? step.a() : document.querySelector(step.a);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return r.width || r.height ? n : null;
  }
  function mark(n) {
    if (target === n) return;
    if (target) target.classList.remove('guide-target');
    target = n;
    if (n) n.classList.add('guide-target');
  }
  function hide() {
    if (el) el.hidden = true;
    mark(null);
  }

  function build() {
    el = document.createElement('div');
    el.id = 'guide';
    el.setAttribute('role', 'complementary');
    el.setAttribute('aria-label', 'Beginner\'s Guide');
    document.body.appendChild(el);
    el.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-g]');
      if (!b) return;
      ev.preventDefault();
      const k = b.dataset.g, g = st();
      if (k === 'next') { if (g.step >= STEPS.length - 1) Guide.stop(true); else go(g.step + 1); }
      else if (k === 'back') go(g.step - 1);
      else if (k === 'close') PBS.Dlg.confirm('Beginner\'s Guide', 'Close the guide? You can restart it at any time from the Handbook or from Help › Beginner\'s Guide.', function () { Guide.stop(false); }, 'ques', 'Close guide', 'Keep going');
      else if (k === 'min') { collapsed = !collapsed; shownKey = ''; Guide.update(); }
      else if (k === 'show') { const n = anchor(STEPS[g.step]); if (n) { n.scrollIntoView({ block: 'center', behavior: 'smooth' }); n.classList.remove('guide-flash'); void n.offsetWidth; n.classList.add('guide-flash'); } }
      else if (k === 'take') location.hash = STEPS[g.step].go;
    });
    // Fenster verschieben
    el.addEventListener('mousedown', function (ev) {
      if (!ev.target.closest('.gd-tb') || ev.target.closest('button')) return;
      ev.preventDefault();
      const r = el.getBoundingClientRect(), dx = ev.clientX - r.left, dy = ev.clientY - r.top;
      const mv = function (m) { el.style.left = U.clamp(m.clientX - dx, 0, innerWidth - r.width) + 'px'; el.style.top = U.clamp(m.clientY - dy, 0, innerHeight - 60) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; };
      const up = function () { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
    });
  }

  function paint(step, n, state) {
    const last = n === STEPS.length - 1;
    el.classList.toggle('collapsed', collapsed);
    el.innerHTML = '<div class="gd-tb"><svg class="ico"><use href="#i-info"/></svg><span>Beginner\'s Guide – step ' + (n + 1) + ' of ' + STEPS.length + '</span>' +
      '<button type="button" class="wb" data-g="min" aria-label="' + (collapsed ? 'Expand' : 'Collapse') + '"><i class="' + (collapsed ? 'g-max' : 'g-min') + '"></i></button><button type="button" class="wb" data-g="close" aria-label="Close guide"><i class="g-x"></i></button></div>' +
      (collapsed ? '' : '<div class="gd-body"><div class="gd-bar"><i style="width:' + Math.round((n + 1) / STEPS.length * 100) + '%"></i></div><h3>' + e(step.t) + '</h3>' +
        step.x.map(function (p) { return '<p>' + e(p) + '</p>'; }).join('') +
        (step.task ? '<div class="gd-task' + (state === 'done' ? ' ok' : '') + '"><b>' + (state === 'done' ? '✔ Well done!' : 'Your turn:') + '</b> ' + e(step.task) + '</div>' : '') +
        '<div class="gd-links">' + (step.a ? '<a href="#" data-g="show">Show me where</a>' : '') + (step.go && location.hash !== step.go ? '<a href="#" data-g="take">Take me there</a>' : '') + '</div>' +
        '<div class="gd-btns"><button type="button" class="btn" data-g="back"' + (n ? '' : ' disabled') + '>‹ Back</button><button type="button" class="btn def" data-g="next">' + (last ? 'Finish' : step.task && state !== 'done' ? 'Skip ›' : 'Next ›') + '</button></div></div>');
  }

  // Wird regelmässig aufgerufen: Sichtbarkeit, erledigte Aufgaben, Markierung
  Guide.update = function () {
    if (!Guide.active()) { hide(); return; }
    const c = ctx();
    const ie = PBS.WM ? PBS.WM.ieState() : 'max';
    if (c.screen !== 'app' || ie === 'min' || ie === 'closed') { hide(); return; }
    if (!el) build();
    el.hidden = false;
    const g = st(), n = g.step, step = STEPS[n];
    if (!base) base = step.start ? step.start() : {};
    const done = !!(step.done && step.done(c, S(), base));
    const key = n + '|' + done + '|' + collapsed + '|' + location.hash;
    if (key !== shownKey) { shownKey = key; paint(step, n, done ? 'done' : ''); }
    mark(collapsed ? null : anchor(step));
    if (done && !advancing && n < STEPS.length - 1) advancing = setTimeout(function () { advancing = null; if (st() && st().step === n) go(n + 1); }, 1400);
  };

  Guide.init = function (hooks) {
    Guide.hooks = hooks || {};
    setInterval(Guide.update, 500);
  };
})(window.PBS);
