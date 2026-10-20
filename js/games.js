/* Spiele des Arbeitsplatzes: Minesweeper und Solitaire (Klondike). */
(function (PBS) {
  'use strict';

  const U = PBS.U, A = PBS.Apps, Snd = PBS.Sound;
  const e = U.esc;
  function WM() { return PBS.WM; }
  function Dlg() { return PBS.Dlg; }

  /* ================= Minesweeper ================= */
  const LEVELS = { beginner: [9, 9, 10, 'Beginner'], intermediate: [16, 16, 40, 'Intermediate'], expert: [30, 16, 99, 'Expert'] };
  const FACE = {
    smile: '<path d="M4.5 9.5c1.5 2.5 5.5 2.5 7 0" fill="none" stroke="#000"/><circle cx="5.7" cy="6.2" r="1"/><circle cx="10.3" cy="6.2" r="1"/>',
    oh: '<circle cx="8" cy="10.5" r="1.8" fill="none" stroke="#000"/><circle cx="5.7" cy="6.2" r="1"/><circle cx="10.3" cy="6.2" r="1"/>',
    cool: '<path d="M4.5 10c1.5 2 5.5 2 7 0" fill="none" stroke="#000"/><path d="M3 5.5h10M3.5 5.5l.5 2h2.8l.6-2M9 5.5l.6 2h2.8l.5-2" fill="#000" stroke="#000"/>',
    dead: '<path d="M4.5 12c1.5-2.2 5.5-2.2 7 0" fill="none" stroke="#000"/><path d="M4.6 5l2.2 2.2M6.8 5 4.6 7.2M9.2 5l2.2 2.2M11.4 5 9.2 7.2" stroke="#000"/>'
  };
  const MINE = '<svg viewBox="0 0 16 16"><path d="M8 2v12M2 8h12M3.8 3.8l8.4 8.4M12.2 3.8l-8.4 8.4" stroke="#000" stroke-width="1.3"/><circle cx="8" cy="8" r="4.2"/><rect x="6" y="6" width="1.8" height="1.8" fill="#fff"/></svg>';
  const FLAG = '<svg viewBox="0 0 16 16"><path d="M8 3v8" stroke="#000"/><path d="M8 3 3.5 5.5 8 8z" fill="#e00000"/><path d="M5 12h6v1.5H4z" fill="#000"/></svg>';
  function minesweeper(win) {
    A.st.mineBest = A.st.mineBest || {};
    const st = win.data = { level: A.st.mineLevel || 'beginner', cells: [], w: 9, h: 9, n: 10, state: 'ready', flags: 0, opened: 0, t: 0, timer: 0 };
    const $ = function (s) { return win.body.querySelector(s); };
    const pad3 = function (n) { return n < 0 ? '-' + U.pad(Math.min(99, -n), 2) : U.pad(Math.min(999, n), 3); };
    const face = function (k) { $('.ms-face').innerHTML = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#ff0" stroke="#000"/>' + FACE[k] + '</svg>'; };
    const counters = function () { $('.ms-left').textContent = pad3(st.n - st.flags); $('.ms-time').textContent = pad3(st.t); };
    const nb = function (i) {
      const x = i % st.w, y = Math.floor(i / st.w), r = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < st.w && ny < st.h) r.push(ny * st.w + nx); }
      return r;
    };
    const newGame = function (lv) {
      if (lv) { st.level = lv; A.st.mineLevel = lv; A.saveSt(); }
      const L = LEVELS[st.level];
      st.w = L[0]; st.h = L[1]; st.n = L[2];
      st.cells = []; for (let i = 0; i < st.w * st.h; i++) st.cells.push({ m: false, o: false, f: false, n: 0 });
      st.state = 'ready'; st.flags = 0; st.opened = 0; st.t = 0; clearInterval(st.timer);
      win.body.innerHTML = '<div class="ms"><div class="ms-hd"><div class="ms-cnt ms-left"></div><button type="button" class="ms-face" aria-label="New game"></button><div class="ms-cnt ms-time"></div></div>' +
        '<div class="ms-grid" style="grid-template-columns:repeat(' + st.w + ',16px)">' + st.cells.map(function (c, i) { return '<div class="ms-c up" data-i="' + i + '"></div>'; }).join('') + '</div></div>';
      WM().setSize(win, st.w * 16 + 40, st.h * 16 + 128);
      face('smile'); counters();
    };
    const place = function (safe) {
      const forbid = [safe].concat(nb(safe));
      let k = 0;
      while (k < st.n) { const i = Math.floor(Math.random() * st.cells.length); if (st.cells[i].m || forbid.indexOf(i) >= 0) continue; st.cells[i].m = true; k++; }
      st.cells.forEach(function (c, i) { c.n = nb(i).filter(function (j) { return st.cells[j].m; }).length; });
      st.state = 'play';
      st.t = 1; counters();
      st.timer = setInterval(function () { if (st.state === 'play' && st.t < 999) { st.t++; counters(); } }, 1000);
    };
    const paint = function (i) {
      const c = st.cells[i], el = win.body.querySelector('[data-i="' + i + '"]');
      if (!el) return;
      el.className = 'ms-c' + (c.o ? ' open' + (c.m ? ' mine' : c.n ? ' n' + c.n : '') : ' up') + (c.boom ? ' boom' : '') + (c.wrong ? ' wrong' : '');
      el.innerHTML = c.o ? (c.m ? MINE : c.n ? c.n : '') : c.f ? FLAG : (c.showMine ? MINE : '');
    };
    const reveal = function (i) {
      const stack = [i];
      while (stack.length) {
        const j = stack.pop(), c = st.cells[j];
        if (c.o || c.f) continue;
        c.o = true; st.opened++;
        paint(j);
        if (c.m) { lose(j); return; }
        if (!c.n) nb(j).forEach(function (k) { if (!st.cells[k].o) stack.push(k); });
      }
      if (st.opened === st.cells.length - st.n) win_();
    };
    const lose = function (j) {
      st.state = 'lost'; clearInterval(st.timer);
      st.cells[j].boom = true;
      st.cells.forEach(function (c, i) { if (c.m && !c.f && !c.o) { c.showMine = true; } if (c.f && !c.m) c.wrong = true; paint(i); });
      st.cells[j].o = true; paint(j);
      face('dead');
    };
    const win_ = function () {
      st.state = 'won'; clearInterval(st.timer);
      st.cells.forEach(function (c, i) { if (c.m && !c.f) { c.f = true; paint(i); } });
      st.flags = st.n; counters(); face('cool');
      const best = A.st.mineBest[st.level];
      if (!best || st.t < best.t) {
        Dlg().open({ title: 'Minesweeper', width: 300, body: '<p>You have the fastest time for ' + LEVELS[st.level][3].toLowerCase() + ' level. Please type your name:</p><input class="inp" id="ms-name" style="width:100%" maxlength="24" value="' + e((PBS.Game.state && PBS.Game.state.meta.name) || 'Anonymous') + '">',
          buttons: [{ label: 'OK', def: true, fn: function (o) { A.st.mineBest[st.level] = { t: st.t, name: o.querySelector('#ms-name').value.trim() || 'Anonymous' }; A.saveSt(); setTimeout(bestTimes, 0); } }] });
      }
    };
    const chord = function (i) {
      const c = st.cells[i];
      if (!c.o || !c.n) return;
      const around = nb(i);
      if (around.filter(function (k) { return st.cells[k].f; }).length !== c.n) return;
      around.forEach(function (k) { if (st.state === 'play' && !st.cells[k].o && !st.cells[k].f) reveal(k); });
    };
    const bestTimes = function () {
      Dlg().open({ title: 'Fastest Mine Sweepers', width: 320, body: '<table class="kv">' + Object.keys(LEVELS).map(function (k) { const b = A.st.mineBest[k]; return '<tr><th>' + LEVELS[k][3] + ':</th><td>' + (b ? b.t + ' seconds' : '999 seconds') + '</td><td>' + e(b ? b.name : 'Anonymous') + '</td></tr>'; }).join('') + '</table>',
        buttons: [{ label: 'Reset Scores', fn: function () { A.st.mineBest = {}; A.saveSt(); setTimeout(bestTimes, 0); } }, { label: 'OK', def: true }] });
    };
    win.body.addEventListener('mousedown', function (ev) {
      const el = ev.target.closest('.ms-c');
      if (!el || st.state === 'won' || st.state === 'lost') return;
      const i = +el.dataset.i;
      if (ev.button === 1 || ev.buttons === 3) { ev.preventDefault(); chord(i); return; }
      if (ev.button === 0) face('oh');
    });
    win.body.addEventListener('mouseup', function (ev) {
      if (st.state === 'play' || st.state === 'ready') face('smile');
      const el = ev.target.closest('.ms-c');
      if (!el || ev.button !== 0 || st.state === 'won' || st.state === 'lost') return;
      const i = +el.dataset.i;
      if (st.cells[i].f) return;
      if (st.state === 'ready') place(i);
      if (st.cells[i].o) chord(i); else reveal(i);
    });
    win.body.addEventListener('dblclick', function (ev) { const el = ev.target.closest('.ms-c'); if (el && st.state === 'play') chord(+el.dataset.i); });
    win.body.addEventListener('contextmenu', function (ev) {
      const el = ev.target.closest('.ms-c');
      ev.preventDefault();
      if (!el || st.state === 'won' || st.state === 'lost') return;
      const c = st.cells[+el.dataset.i];
      if (c.o) return;
      c.f = !c.f; st.flags += c.f ? 1 : -1;
      paint(+el.dataset.i); counters();
    });
    win.body.addEventListener('click', function (ev) { if (ev.target.closest('.ms-face')) newGame(); });
    win.onKey = function (ev) { if (ev.key === 'F2') { ev.preventDefault(); newGame(); } };
    win.onClose = function () { clearInterval(st.timer); return true; };
    WM().menubar(win, [
      { l: '~Game', items: function () {
        return [{ l: '~New', k: 'F2', fn: function () { newGame(); } }, '-'].concat(Object.keys(LEVELS).map(function (k) { return { l: LEVELS[k][3], radio: true, chk: st.level === k, fn: function () { newGame(k); } }; }))
          .concat(['-', { l: 'Best ~Times...', fn: bestTimes }, '-', { l: 'E~xit', fn: function () { WM().close(win.id); } }]);
      } },
      { l: '~Help', items: function () { return [{ l: '~Contents', dis: true }, '-', { l: '~About Minesweeper', fn: function () { Dlg().msg('About Minesweeper', '<b>Minesweeper</b><br>Version 5.0<br><br>Clear the field without detonating a mine. Right-click to place a flag; click a number with all its flags set (or use the middle button) to clear the rest of its neighbours.', 'biginfo'); } }]; } }
    ]);
    newGame();
  }
  A.defs.mine = { title: 'Minesweeper', icon: 'd-mine', w: 184, h: 272, resizable: false, singleton: true, open: minesweeper };

  /* ================= Solitaire (Klondike) ================= */
  const SUIT = ['♠', '♥', '♦', '♣'];
  const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const CW = 71, CH = 96, TOP = 10, TABY = 124;
  const BACKS = [['Blue lattice', 'back-blue'], ['Red lattice', 'back-red'], ['Vogt & Cie', 'back-vogt']];
  function red(c) { return c.s === 1 || c.s === 2; }
  function px(i) { return 10 + i * (CW + 10); }

  function solitaire(win) {
    const st = win.data = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []], draw: A.st.solDraw || 1, scoring: A.st.solScore || 'standard', back: A.st.solBack || 0, score: 0, t: 0, timer: 0, started: false, undo: null, won: false, passes: 0 };
    win.body.innerHTML = '<div class="sol"></div><div class="sol-status"><span class="sc grow"></span><span class="sc sol-score"></span><span class="sc sol-time"></span></div>';
    const board = win.body.querySelector('.sol');

    const pile = function (id) { return id === 'stock' ? st.stock : id === 'waste' ? st.waste : id.charAt(0) === 'f' ? st.found[+id.slice(1)] : st.tab[+id.slice(1)]; };
    const snapshot = function () { return JSON.stringify({ stock: st.stock, waste: st.waste, found: st.found, tab: st.tab, score: st.score, passes: st.passes }); };
    const save = function () { st.undo = snapshot(); };
    const status = function () {
      win.body.querySelector('.sol-score').textContent = st.scoring === 'none' ? '' : 'Score: ' + st.score;
      win.body.querySelector('.sol-time').textContent = 'Time: ' + st.t;
    };
    const add = function (n) { if (st.scoring === 'standard') { st.score = Math.max(0, st.score + n); status(); } };
    const startTimer = function () { if (st.started) return; st.started = true; st.timer = setInterval(function () { if (!st.won) { st.t++; status(); } }, 1000); };

    const deal = function () {
      clearInterval(st.timer);
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ s: s, r: r, up: false });
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      st.tab = [[], [], [], [], [], [], []];
      for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) st.tab[j].push(deck.pop());
      st.tab.forEach(function (t) { t[t.length - 1].up = true; });
      st.stock = deck; st.waste = []; st.found = [[], [], [], []];
      st.score = 0; st.t = 0; st.started = false; st.undo = null; st.won = false; st.passes = 0;
      render(); status();
    };
    const face = function (c) {
      const r = RANK[c.r], s = SUIT[c.s];
      const mid = c.r > 10 ? '<span class="cf">' + r + '<i>' + s + '</i></span>' : '<span class="cm">' + s + '</span>';
      return '<span class="ci">' + r + '<br>' + s + '</span>' + mid + '<span class="ci ci2">' + r + '<br>' + s + '</span>';
    };
    // Abstände im Tableau so wählen, dass die Stapel in das Fenster passen
    const offsets = function (t) {
      const avail = Math.max(120, board.clientHeight - TABY - CH - 8);
      const down = t.filter(function (c) { return !c.up; }).length, ups = t.length - down - 1;
      let du = 4, uu = 17;
      if (down * du + Math.max(0, ups) * uu > avail) uu = Math.max(8, (avail - down * du) / Math.max(1, ups));
      return [du, uu];
    };
    const render = function () {
      let h = '';
      const slot = function (x, y, cls, id) { h += '<div class="sl ' + cls + '" data-p="' + id + '" style="left:' + x + 'px;top:' + y + 'px"></div>'; };
      const card = function (c, x, y, id, i, z) { h += '<div class="cd ' + (c.up ? (red(c) ? 'red' : 'blk') : 'back ' + BACKS[st.back][1]) + '" data-p="' + id + '" data-i="' + i + '" style="left:' + x + 'px;top:' + y + 'px;z-index:' + z + '">' + (c.up ? face(c) : '') + '</div>'; };
      slot(px(0), TOP, st.stock.length ? '' : 'recycle', 'stock');
      if (st.stock.length) card(st.stock[st.stock.length - 1], px(0), TOP, 'stock', st.stock.length - 1, 1);
      slot(px(1), TOP, 'empty', 'waste');
      const show = st.draw === 3 ? st.waste.slice(-3) : st.waste.slice(-1);
      show.forEach(function (c, k) { card(c, px(1) + k * 14, TOP, 'waste', st.waste.length - show.length + k, 2 + k); });
      st.found.forEach(function (f, i) { slot(px(3 + i), TOP, 'found', 'f' + i); if (f.length) card(f[f.length - 1], px(3 + i), TOP, 'f' + i, f.length - 1, 2); });
      st.tab.forEach(function (t, i) {
        slot(px(i), TABY, 'empty', 't' + i);
        const o = offsets(t);
        let y = TABY;
        t.forEach(function (c, j) { card(c, px(i), y, 't' + i, j, 2 + j); y += c.up ? o[1] : o[0]; });
      });
      board.innerHTML = h;
    };
    const canFound = function (c, fi) { const f = st.found[fi]; return f.length ? f[f.length - 1].s === c.s && c.r === f[f.length - 1].r + 1 : c.r === 1; };
    const canTab = function (c, ti) { const t = st.tab[ti]; if (!t.length) return c.r === 13; const top = t[t.length - 1]; return top.up && red(top) !== red(c) && c.r === top.r - 1; };
    const flipTops = function () { st.tab.forEach(function (t) { if (t.length && !t[t.length - 1].up) { t[t.length - 1].up = true; add(5); } }); };
    // Zug ausführen: Karten ab Index i des Stapels src auf den Stapel dst
    const move = function (src, i, dst) {
      const from = pile(src), to = pile(dst);
      const cards = from.slice(i);
      if (!cards.length || !cards[0].up) return false;
      if (dst.charAt(0) === 'f') { if (cards.length !== 1 || !canFound(cards[0], +dst.slice(1))) return false; }
      else if (dst.charAt(0) === 't') { if (!canTab(cards[0], +dst.slice(1))) return false; }
      else return false;
      if (src.charAt(0) !== 't' && cards.length > 1) return false;
      save();
      from.splice(i);
      cards.forEach(function (c) { to.push(c); });
      if (src === 'waste') add(dst.charAt(0) === 'f' ? 10 : 5);
      else if (src.charAt(0) === 't' && dst.charAt(0) === 'f') add(10);
      else if (src.charAt(0) === 'f' && dst.charAt(0) === 't') add(-15);
      flipTops();
      startTimer();
      render();
      checkWin();
      return true;
    };
    const toFoundation = function (src) {
      const p = pile(src);
      if (!p.length || !p[p.length - 1].up) return false;
      for (let f = 0; f < 4; f++) if (move(src, p.length - 1, 'f' + f)) return true;
      return false;
    };
    const drawCards = function () {
      startTimer();
      save();
      if (!st.stock.length) {
        if (!st.waste.length) return;
        st.stock = st.waste.reverse().map(function (c) { c.up = false; return c; });
        st.waste = [];
        st.passes++;
        if (st.draw === 1) add(-100);
      } else {
        for (let k = 0; k < st.draw && st.stock.length; k++) { const c = st.stock.pop(); c.up = true; st.waste.push(c); }
      }
      render();
    };
    const autoAll = function () { let moved = true; while (moved) { moved = false; for (let k = 0; k < 7 && !moved; k++) moved = toFoundation('t' + k); if (!moved) moved = toFoundation('waste'); } };
    const checkWin = function () {
      if (st.won || !st.found.every(function (f) { return f.length === 13; })) return;
      st.won = true; clearInterval(st.timer);
      if (st.scoring === 'standard' && st.t > 30) add(Math.round(700000 / st.t));
      status();
      cascade();
    };
    // Die Karten springen von den Ablagestapeln (wie im Original)
    const cascade = function () {
      const c = document.createElement('canvas');
      c.className = 'sol-anim'; c.width = board.clientWidth; c.height = board.clientHeight;
      board.appendChild(c);
      const x = c.getContext('2d');
      const order = [];
      for (let r = 13; r >= 1; r--) for (let f = 0; f < 4; f++) order.push({ f: f, card: st.found[f][r - 1] });
      let k = 0, cur = null, raf = 0;
      const draw = function (cd, px2, py) {
        x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1;
        x.beginPath(); x.rect(px2 + 0.5, py + 0.5, CW - 1, CH - 1); x.fill(); x.stroke();
        x.fillStyle = red(cd) ? '#c00' : '#000'; x.font = 'bold 13px Arial'; x.textBaseline = 'top';
        x.fillText(RANK[cd.r], px2 + 4, py + 3); x.font = '13px Arial'; x.fillText(SUIT[cd.s], px2 + 4, py + 17);
        x.font = '32px Arial'; x.textAlign = 'center'; x.fillText(SUIT[cd.s], px2 + CW / 2, py + CH / 2 - 16); x.textAlign = 'left';
      };
      const next = function () {
        if (k >= order.length) { stop(); return; }
        const o = order[k++];
        cur = { cd: o.card, x: px(3 + o.f), y: TOP, vx: (Math.random() * 5 + 2) * (Math.random() < 0.5 ? -1 : 1), vy: -Math.random() * 8 - 2 };
      };
      const step = function () {
        if (!cur) next();
        if (!cur) return;
        cur.vy += 0.6; cur.x += cur.vx; cur.y += cur.vy;
        if (cur.y + CH > c.height) { cur.y = c.height - CH; cur.vy = -cur.vy * 0.78; }
        draw(cur.cd, cur.x, cur.y);
        if (cur.x < -CW || cur.x > c.width) cur = null;
        raf = requestAnimationFrame(step);
      };
      const stop = function () {
        cancelAnimationFrame(raf);
        c.remove();
        Dlg().confirm('Solitaire', 'Congratulations! You won.' + (st.scoring === 'standard' ? '<br>Score: ' + st.score : '') + '<br><br>Deal again?', deal, 'biginfo', 'Yes', 'No');
      };
      c.addEventListener('click', stop);
      next(); step();
    };

    // Ziehen mit der Maus
    let drag = null;
    board.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      const el = ev.target.closest('.cd, .sl');
      if (!el || st.won) return;
      const id = el.dataset.p;
      if (id === 'stock') { drawCards(); return; }
      if (!el.classList.contains('cd')) return;
      const p = pile(id), i = +el.dataset.i;
      if (!p[i] || !p[i].up) return;
      if (id === 'waste' && i !== p.length - 1) return;
      if (id.charAt(0) === 'f' && i !== p.length - 1) return;
      drag = { id: id, i: i, x0: ev.clientX, y0: ev.clientY, on: false, els: [] };
      board.setPointerCapture(ev.pointerId);
    });
    board.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      const dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
      if (!drag.on) {
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        drag.on = true;
        drag.els = Array.prototype.filter.call(board.querySelectorAll('.cd[data-p="' + drag.id + '"]'), function (n) { return +n.dataset.i >= drag.i; });
        drag.els.forEach(function (n) { n.dataset.l = n.style.left; n.dataset.t = n.style.top; n.style.zIndex = 500 + (+n.dataset.i); n.classList.add('lift'); });
      }
      drag.els.forEach(function (n) { n.style.left = (parseFloat(n.dataset.l) + dx) + 'px'; n.style.top = (parseFloat(n.dataset.t) + dy) + 'px'; });
    });
    const target = function (ev) {
      const r = board.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      if (y < TABY - 8) { for (let f = 0; f < 4; f++) if (x >= px(3 + f) - 8 && x <= px(3 + f) + CW + 8) return 'f' + f; return null; }
      for (let t = 0; t < 7; t++) if (x >= px(t) - 5 && x <= px(t) + CW + 5) return 't' + t;
      return null;
    };
    board.addEventListener('pointerup', function (ev) {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.on) return;
      const dst = target(ev);
      if (!dst || dst === d.id || !move(d.id, d.i, dst)) render();
    });
    board.addEventListener('dblclick', function (ev) {
      const el = ev.target.closest('.cd');
      if (!el || st.won) return;
      const id = el.dataset.p, p = pile(id);
      if ((id === 'waste' || id.charAt(0) === 't') && +el.dataset.i === p.length - 1) toFoundation(id);
    });
    board.addEventListener('contextmenu', function (ev) { ev.preventDefault(); if (!st.won) autoAll(); });

    const deck = function () {
      Dlg().open({ title: 'Select Card Back', width: 320, body: '<div class="sol-backs">' + BACKS.map(function (b, i) { return '<div class="cd back ' + b[1] + (st.back === i ? ' on' : '') + '" data-b="' + i + '" title="' + b[0] + '"></div>'; }).join('') + '</div>',
        onOpen: function (o) { o.addEventListener('click', function (ev) { const b = ev.target.closest('[data-b]'); if (!b) return; o.querySelectorAll('[data-b]').forEach(function (x) { x.classList.toggle('on', x === b); }); o.dataset.sel = b.dataset.b; }); },
        buttons: [{ label: 'OK', def: true, fn: function (o) { if (o.dataset.sel !== undefined) { st.back = +o.dataset.sel; A.st.solBack = st.back; A.saveSt(); render(); } } }, { label: 'Cancel' }] });
    };
    const options = function () {
      Dlg().open({ title: 'Options', width: 320, body: '<fieldset class="box"><legend>Draw</legend><label class="opt"><input type="radio" name="sd" value="1"' + (st.draw === 1 ? ' checked' : '') + '> Draw one</label><label class="opt"><input type="radio" name="sd" value="3"' + (st.draw === 3 ? ' checked' : '') + '> Draw three</label></fieldset>' +
        '<fieldset class="box"><legend>Scoring</legend><label class="opt"><input type="radio" name="ss" value="standard"' + (st.scoring === 'standard' ? ' checked' : '') + '> Standard</label><label class="opt"><input type="radio" name="ss" value="none"' + (st.scoring === 'none' ? ' checked' : '') + '> None</label></fieldset><p class="small muted">Changing the draw option starts a new game.</p>',
        buttons: [{ label: 'OK', def: true, fn: function (o) {
          const d = +o.querySelector('input[name=sd]:checked').value, s = o.querySelector('input[name=ss]:checked').value;
          const redeal = d !== st.draw;
          st.draw = d; st.scoring = s; A.st.solDraw = d; A.st.solScore = s; A.saveSt();
          if (redeal) deal(); else status();
        } }, { label: 'Cancel' }] });
    };
    const undo = function () {
      if (!st.undo) return;
      const u = JSON.parse(st.undo);
      st.stock = u.stock; st.waste = u.waste; st.found = u.found; st.tab = u.tab; st.score = u.score; st.passes = u.passes; st.undo = null;
      render(); status();
    };
    WM().menubar(win, [
      { l: '~Game', items: function () {
        return [{ l: '~Deal', k: 'F2', fn: deal }, '-', { l: '~Undo', dis: !st.undo, fn: undo }, { l: 'De~ck...', fn: deck }, { l: '~Options...', fn: options }, '-', { l: 'E~xit', fn: function () { WM().close(win.id); } }];
      } },
      { l: '~Help', items: function () { return [{ l: '~Contents', dis: true }, '-', { l: '~About Solitaire', fn: function () { Dlg().msg('About Solitaire', '<b>Solitaire</b><br>Version 5.0<br><br>Drag cards between the piles. Double-click a card to send it to a foundation; right-click the table to send every card that can go. Click the deck to turn over cards.', 'biginfo'); } }]; } }
    ]);
    win.onKey = function (ev) { if (ev.key === 'F2') { ev.preventDefault(); deal(); } else if (ev.ctrlKey && ev.key.toLowerCase() === 'z') { ev.preventDefault(); undo(); } };
    win.onClose = function () { clearInterval(st.timer); return true; };
    win.onResize = function () { if (!drag) render(); };
    setTimeout(deal, 0);
  }
  A.defs.sol = { title: 'Solitaire', icon: 'd-sol', w: 600, h: 490, minW: 600, minH: 400, singleton: true, open: solitaire };
})(window.PBS);
