/* Einführung: Sprechblasen-Tipps im Stil von Windows 2000. Eine kurze Führung beim ersten Start,
   danach je ein Hinweis beim ersten Besuch eines Bereichs. Nie modal; einmal gesehen, nie wieder. */
(function (PBS) {
  'use strict';

  const G = PBS.Game, U = PBS.U, B = PBS.Browser, Dlg = PBS.Dlg;
  const e = U.esc;
  const T = PBS.Tutor = { hooks: {}, step: 0 };
  let cur = null, timer = null, el = null, target = null;
  const closed = {};

  /* ---------- Inhalte ---------- */
  // Führung beim ersten Start (Anker: Rahmen von PBS/Web, auf jeder Seite vorhanden)
  const INTRO = [
    { a: '#content .ptitle h1', pos: 'below', t: 'Your first day', x: 'You are the new Managing Partner of Vogt & Cie. Read this handover memo from the Senior Partner first – it sets out how the bank works and what the partners expect.' },
    { a: '#menubar a[href="#/inbox"]', pos: 'below', t: 'Mail & fax', x: 'Faxes, letters and memos arrive here overnight and during the day. Red numbers show what is waiting. Decisions – new clients, authorities, staff – are taken inside the message.' },
    { a: '#menubar a[href="#/overview"]', pos: 'below', t: 'Dashboard', x: 'The Overview lists your pending items, the partners\' targets and how much attention the bank attracts from the authorities. Work through the pending items every day.' },
    { a: '#nav .navbox .big', pos: 'right', t: 'Time is money', x: 'Every action costs working time – look for the clock badges. The office closes at 18:00 and the building locks at 20:00. Appointments pop up when the clock reaches them.' },
    { a: '#nav .btn.eod', pos: 'right', t: 'End of day', x: 'When you have done what you can, run the end-of-day batch (F9). Markets move, fees are booked and the next morning brings new mail.' },
    { a: '#tools [data-act=handbook]', pos: 'below', t: 'Need more?', x: 'The Handbook explains the whole game. A tip like this appears the first time you open a new area – switch them off under Help › Tip of the Day.' }
  ];
  // Einmalige Hinweise je Bereich: Bedingung, Anker, Text
  const TIPS = [
    { k: 'decide', when: function (c) { return /^inbox\/M/.test(c.path); }, a: '#content .decide', pos: 'below', t: 'A decision is needed', x: 'Choose one of the buttons. Most decisions cost a few minutes and every one has consequences – for the client, for your exposure, or for the bank\'s books.' },
    { k: 'newday', when: function () { return G.state && G.state.dayNo >= 2; }, a: '#nav .navbox .big', pos: 'right', t: 'A new business day', x: 'Overnight the batch booked fees and interest, moved the markets and delivered new mail. The dashboard\'s pending items show what needs you today.' },
    { k: 'payq', when: function (c) { return c.path === 'pay/queue'; }, a: '#content .ptitle h1', pos: 'below', t: 'Four-eyes principle', x: 'Payments wait here for your second signature. In the pre-check, TM codes mean a compliance alert, XB means a paper trail abroad. Editing a payment – another debit account, no originator name – can reduce the trail.' },
    { k: 'cash', when: function (c) { return c.path === 'pay/cash'; }, a: '#content .ptitle h1', pos: 'below', t: 'Cash desk', x: 'Clients wait here in person. Deposits from CHF 25,000 trigger monitoring; anyone not served by the end of the day leaves annoyed.' },
    { k: 'alerts', when: function (c) { return c.path === 'compliance/alerts'; }, a: '#content .filter', pos: 'below', t: 'Compliance alerts', x: 'Clear alerts within ten business days. A thin justification may not survive the annual audit. Tick the box to let the compliance team clear routine alerts overnight.' },
    { k: 'risk', when: function (c) { return c.path === 'compliance'; }, a: '#content .panel .ph', pos: 'below', t: 'Risk monitor', x: 'One attention index per authority. Above 55 a foreign authority may open an investigation; the regulator withdraws the licence at 100. "Recent drivers" shows what caused each move.' },
    { k: 'client', when: function (c) { return /^client\//.test(c.path); }, a: '#content .cbanner', pos: 'below', t: 'The client file', x: 'Flags for hold mail, Form A and structures, then accounts, products and file notes. Hold mail, structures and booking abroad keep paper away from the client\'s home tax office.' },
    { k: 'invest', when: function (c) { return c.path === 'invest'; }, a: '#content table.alloc', pos: 'above', t: 'House view', x: 'Set the allocation during the monthly investment committee and it costs no extra time. Clients compare their returns with the benchmark every quarter.' },
    { k: 'staff', when: function (c) { return c.path === 'org/staff'; }, a: '#content table.grid', pos: 'above', t: 'Your people', x: 'Pay close to the market rate and watch morale. Unhappy relationship managers resign and take clients with them – and people with low integrity are the most dangerous in the building.' },
    { k: 'career', when: function (c) { return c.path === 'career'; }, a: '#content .ptitle h1', pos: 'below', t: 'Targets and fortune', x: 'The partners judge you every January. Miss the targets two years running and you are out. Your bonus goes into your private numbered account – that fortune is your score.' }
  ];
  const LOGIN = { k: 'login', a: '#login .fob', pos: 'below', t: 'Signing on', x: 'Type the six digits shown on this security token into the Token code field – they change every 30 seconds. Any password will do.' };
  const MEETING = { k: 'meeting', a: '.dlg-ov:last-child .dlg-tb', pos: 'above', t: 'Appointments', x: 'Choose how to handle it, then Attend – that costs the time shown. Delegate sends the client\'s relationship manager instead; Later leaves it open until the evening.' };

  /* ---------- Zustand ---------- */
  function seen() { B.st.tipsSeen = B.st.tipsSeen || {}; return B.st.tipsSeen; }
  function on() { return B.st.tips !== false; }
  function mark(k) { if (!seen()[k]) { seen()[k] = 1; B.save(); } }
  T.enabled = on;
  T.done = mark;
  T.toggle = function () { B.st.tips = !on(); B.save(); if (!on()) hide(); else T.check(); };
  T.restart = function () { B.st.tips = true; B.st.tipsSeen = { login: 1 }; T.step = 0; B.save(); hide(); T.check(); };

  /* ---------- Auswahl ---------- */
  function find(sel) {
    const n = document.querySelector(sel);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return r.width || r.height ? n : null;
  }
  function pick() {
    if (!on() || B.win === 'min' || B.win === 'closed') return null;
    const c = T.hooks.ctx ? T.hooks.ctx() : {};
    const s = seen();
    if (Dlg.any()) {
      if (!s.meeting && document.querySelector('.dlg-ov:last-child .meetopt') && find(MEETING.a)) return MEETING;
      return null;
    }
    if (c.screen === 'login') return s.login || closed.login ? null : LOGIN;
    if (c.screen !== 'app' || !G.state || G.state.gameOver) return null;
    if (!s.intro) {
      const st = INTRO[T.step];
      return st && find(st.a) ? Object.assign({ k: 'intro', n: T.step }, st) : null;
    }
    for (let i = 0; i < TIPS.length; i++) {
      const t = TIPS[i];
      if (!s[t.k] && t.when(c) && find(t.a)) return t;
    }
    return null;
  }

  /* ---------- Sprechblase ---------- */
  function hide() {
    if (el) { el.remove(); el = null; }
    if (target) { target.classList.remove('tip-target'); target = null; }
    cur = null;
  }
  function build(t) {
    hide();
    cur = t;
    const intro = t.k === 'intro';
    el = document.createElement('div');
    el.className = 'balloon';
    el.setAttribute('role', 'status');
    el.innerHTML = '<div class="bt"><svg class="ico"><use href="#i-info"/></svg><b>' + e(t.t) + '</b><button type="button" class="bx" data-tip="close" aria-label="Close tip">✕</button></div>' +
      '<div class="bb">' + e(t.x) + '</div><div class="bf">' +
      (intro ? '<span class="bn">' + (t.n + 1) + ' of ' + INTRO.length + '</span><a href="#" data-tip="skip">Skip tour</a>' : '<a href="#" data-tip="off">Hide all tips</a>') +
      '<button type="button" class="btn sm def" data-tip="next">' + (intro && t.n < INTRO.length - 1 ? 'Next ›' : 'Got it') + '</button></div><i class="tail"></i>';
    document.body.appendChild(el);
    if (!intro && t.k !== 'login') mark(t.k);
    place();
    requestAnimationFrame(function () { if (el) el.classList.add('in'); });
  }
  // Neben dem Anker platzieren; weicht aus, wenn der Platz nicht reicht
  function place() {
    if (!el || !cur) return;
    const n = find(cur.a);
    if (!n) { hide(); return; }
    if (target !== n) { if (target) target.classList.remove('tip-target'); target = n; n.classList.add('tip-target'); }
    const r = n.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight, gap = 15, M = 6;
    const vw = innerWidth, vh = innerHeight - 30;
    let pos = cur.pos;
    if (pos === 'below' && r.bottom + gap + h > vh) pos = 'above';
    if (pos === 'above' && r.top - gap - h < M) pos = 'below';
    if (pos === 'right' && r.right + gap + w > vw) pos = 'below';
    let left, top;
    if (pos === 'right') {
      left = r.right + gap;
      top = U.clamp(r.top + r.height / 2 - 26, M, vh - h);
    } else {
      left = U.clamp(r.left + Math.min(r.width / 2, 60) - 28, M, vw - w - M);
      top = pos === 'below' ? r.bottom + gap : r.top - gap - h;
    }
    el.style.left = left + 'px';
    el.style.top = Math.max(M, top) + 'px';
    const tail = el.querySelector('.tail');
    tail.className = 'tail t-' + pos;
    // Spitze des Zipfels zeigt auf den Anker
    if (pos === 'right') tail.style.cssText = 'top:' + U.clamp(r.top + r.height / 2 - Math.max(M, top), 6, h - 14) + 'px';
    else tail.style.cssText = 'left:' + U.clamp(r.left + Math.min(r.width / 2, 60) - left, 10, w - 22) + 'px';
  }

  function evaluate() {
    const t = pick();
    if (!t) { hide(); return; }
    if (cur && cur.k === t.k && cur.n === t.n) { place(); return; }
    build(t);
  }
  // Nach jedem Seitenaufbau; kurze Verzögerung, damit die Seite zuerst erscheint
  T.check = function (delay) {
    clearTimeout(timer);
    timer = setTimeout(evaluate, delay === undefined ? 650 : delay);
  };

  document.addEventListener('click', function (ev) {
    const b = ev.target.closest('[data-tip]');
    if (!b) return;
    ev.preventDefault();
    const k = b.dataset.tip;
    if (!cur) return;
    if (k === 'next' && cur.k === 'intro') {
      T.step++;
      if (T.step >= INTRO.length) mark('intro');
      hide();
      T.check(150);
      return;
    }
    if (k === 'skip') mark('intro');
    if (k === 'off') { B.st.tips = false; B.save(); }
    if (cur.k === 'login') { closed.login = true; hide(); return; }
    hide();
    if (k !== 'off') T.check(400);
  });
  window.addEventListener('resize', function () { place(); });
  document.addEventListener('scroll', function () { place(); }, true);
  // Dialoge öffnen und schliessen sich: Tipps neu beurteilen
  new MutationObserver(function () { T.check(350); }).observe(document.getElementById('dlg-layer'), { childList: true });

  T.init = function (hooks) { T.hooks = hooks || {}; };
})(window.PBS);
