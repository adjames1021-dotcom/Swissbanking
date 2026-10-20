/* Programme des Arbeitsplatzes, Teil 2: Rechner (mit Devisenrechner), Paint, Eingabeaufforderung.
   Tastatureingaben gehen an das Fenster mit dem Fokus (win.onKey). */
(function (PBS) {
  'use strict';

  const G = PBS.Game, U = PBS.U, FS = PBS.FS, Snd = PBS.Sound, A = PBS.Apps;
  const e = U.esc;
  function WM() { return PBS.WM; }
  function Dlg() { return PBS.Dlg; }

  // Tasten an das Programmfenster mit dem Fokus (nicht in Eingabefeldern, nicht bei offenen Dialogen)
  document.addEventListener('keydown', function (ev) {
    const wm = WM();
    if (!wm || !wm.focused || wm.focused === 'ie' || Dlg().any()) return;
    const w = wm.wins[wm.focused];
    if (!w || !w.onKey) return;
    if (ev.target.closest && ev.target.closest('input, textarea, select') && !w.keysInInputs) return;
    w.onKey(ev);
  });

  /* ================= Rechner ================= */
  function calc(win) {
    const st = win.data = { disp: '0', acc: null, op: null, fresh: true, mem: 0, lastOp: null, lastVal: null, err: false, mode: 'std' };
    const fmt = function (n) {
      if (!isFinite(n)) return null;
      let s = String(parseFloat(n.toPrecision(15)));
      if (/e/.test(s)) s = n.toExponential(10).replace(/\.?0+e/, 'e');
      return s;
    };
    const cur = function () { return parseFloat(st.disp) || 0; };
    const error = function (msg) { st.err = true; st.disp = msg || 'Cannot divide by zero.'; st.fresh = true; st.op = null; st.acc = null; };
    const setNum = function (n) { const f = fmt(n); if (f === null) error(); else st.disp = f; };
    const compute = function (a, op, b) {
      if (op === '+') return a + b; if (op === '-') return a - b; if (op === '*') return a * b;
      if (b === 0) return Infinity;
      return a / b;
    };
    const clear = function () { st.disp = '0'; st.acc = null; st.op = null; st.fresh = true; st.err = false; st.lastOp = null; };
    const key = function (k) {
      if (st.err && k !== 'c' && k !== 'ce') clear();
      if (/^[0-9.]$/.test(k)) {
        if (st.fresh) { st.disp = k === '.' ? '0.' : k; st.fresh = false; }
        else if (k === '.') { if (st.disp.indexOf('.') < 0) st.disp += '.'; }
        else if (st.disp.replace(/[-.]/g, '').length < 16) st.disp = st.disp === '0' ? k : st.disp === '-0' ? '-' + k : st.disp + k;
      } else if ('+-*/'.indexOf(k) >= 0) {
        if (st.op && !st.fresh) setNum(compute(st.acc, st.op, cur()));
        if (!st.err) { st.acc = cur(); st.op = k; st.fresh = true; }
      } else if (k === '=') {
        if (st.op) { const b = cur(); setNum(compute(st.acc, st.op, b)); st.lastOp = st.op; st.lastVal = b; st.op = null; }
        else if (st.lastOp) setNum(compute(cur(), st.lastOp, st.lastVal));
        st.fresh = true; st.acc = null;
      } else if (k === 'sqrt') { if (cur() < 0) error('Invalid input for function.'); else { setNum(Math.sqrt(cur())); st.fresh = true; } }
      else if (k === 'inv') { if (cur() === 0) error(); else { setNum(1 / cur()); st.fresh = true; } }
      else if (k === '%') { setNum(st.op ? st.acc * cur() / 100 : 0); st.fresh = true; }
      else if (k === 'neg') { if (cur() !== 0) st.disp = st.disp.charAt(0) === '-' ? st.disp.slice(1) : '-' + st.disp; }
      else if (k === 'bs') { if (!st.fresh) { st.disp = st.disp.slice(0, -1); if (!st.disp || st.disp === '-') { st.disp = '0'; st.fresh = true; } } }
      else if (k === 'ce') { st.disp = '0'; st.fresh = true; st.err = false; }
      else if (k === 'c') clear();
      else if (k === 'mc') st.mem = 0;
      else if (k === 'mr') { st.disp = fmt(st.mem); st.fresh = true; }
      else if (k === 'ms') { st.mem = cur(); st.fresh = true; }
      else if (k === 'm+') { st.mem += cur(); st.fresh = true; }
      paint();
    };
    const B = function (k, l, cls) { return '<button type="button" class="btn ck' + (cls ? ' ' + cls : '') + '" data-k="' + k + '">' + l + '</button>'; };
    const stdHTML = '<div class="calc"><input class="calc-disp" readonly tabindex="-1">' +
      '<div class="calc-r1"><span class="calc-m"></span>' + B('bs', 'Backspace', 'red w') + B('ce', 'CE', 'red w') + B('c', 'C', 'red w') + '</div>' +
      '<div class="calc-g">' + B('mc', 'MC', 'red') + B('7', '7') + B('8', '8') + B('9', '9') + B('/', '/', 'red') + B('sqrt', 'sqrt') +
      B('mr', 'MR', 'red') + B('4', '4') + B('5', '5') + B('6', '6') + B('*', '*', 'red') + B('%', '%') +
      B('ms', 'MS', 'red') + B('1', '1') + B('2', '2') + B('3', '3') + B('-', '-', 'red') + B('inv', '1/x') +
      B('m+', 'M+', 'red') + B('0', '0') + B('neg', '+/-') + B('.', '.') + B('+', '+', 'red') + B('=', '=', 'red') + '</div></div>';
    const fxHTML = function () {
      const s = G.state;
      if (!s) return '<div class="calc fx"><p>Exchange rates are loaded from Telekurs after you sign on to PBS/Web.</p></div>';
      const ccys = G.currencies().concat(['XAU']);
      const opt = function (sel) { return ccys.map(function (c) { return '<option' + (c === sel ? ' selected' : '') + '>' + c + '</option>'; }).join(''); };
      return '<div class="calc fx"><table class="frm"><tr><th>Amount</th><td><input class="inp num fx-a" value="1000" size="14"></td></tr>' +
        '<tr><th>From</th><td><select class="inp fx-f">' + opt(s.date < PBS.DATA.EURO_DATE ? 'DEM' : 'EUR') + '</select></td></tr><tr><th>To</th><td><select class="inp fx-t">' + opt('CHF') + '</select></td></tr></table>' +
        '<div class="fx-r"></div><p class="small muted">Telekurs mid rates of ' + U.fmtDate(s.date) + '. XAU = fine gold, troy ounce.</p></div>';
    };
    const paint = function () {
      const d = win.body.querySelector('.calc-disp');
      if (d) d.value = st.err || /[.e]/.test(st.disp) ? st.disp : st.disp + '.';
      const m = win.body.querySelector('.calc-m');
      if (m) m.textContent = st.mem ? 'M' : '';
    };
    const fxCalc = function () {
      const a = U.parseAmount(win.body.querySelector('.fx-a').value), f = win.body.querySelector('.fx-f').value, t = win.body.querySelector('.fx-t').value;
      const r = win.body.querySelector('.fx-r');
      if (isNaN(a)) { r.textContent = '–'; return; }
      const v = a * G.rate(f) / G.rate(t);
      r.innerHTML = U.fmt(a, 2) + ' ' + f + ' =<br><b>' + U.fmt(v, t === 'XAU' ? 3 : t === 'ITL' || t === 'JPY' ? 0 : 2) + ' ' + t + '</b>';
    };
    const mode = function (m) {
      st.mode = m;
      win.body.innerHTML = m === 'fx' ? fxHTML() : stdHTML;
      WM().setTitle(win.id, m === 'fx' ? 'Calculator – Currency' : 'Calculator');
      WM().setSize(win, m === 'fx' ? 300 : 262, m === 'fx' ? 270 : 276);
      if (m === 'fx' && G.state) { fxCalc(); win.body.addEventListener('input', fxCalc); win.body.addEventListener('change', fxCalc); }
      paint();
    };
    win.body.addEventListener('click', function (ev) { const b = ev.target.closest('[data-k]'); if (b) { key(b.dataset.k); b.blur(); } });
    win.onKey = function (ev) {
      if (st.mode !== 'std') return;
      const k = ev.key;
      const map = { Enter: '=', '=': '=', Escape: 'c', Delete: 'ce', Backspace: 'bs', ',': '.', '@': 'sqrt', r: 'inv' };
      const v = map[k] || (/^[0-9.+\-*/%]$/.test(k) ? k : null);
      if (v) { ev.preventDefault(); key(v); }
    };
    WM().menubar(win, [
      { l: '~Edit', items: function () { return [{ l: '~Copy', k: 'Ctrl+C', fn: function () { try { navigator.clipboard.writeText(st.disp); } catch (x) { /* */ } } }, { l: '~Paste', k: 'Ctrl+V', dis: true }]; } },
      { l: '~View', items: function () { return [{ l: '~Standard', radio: true, chk: st.mode === 'std', fn: function () { mode('std'); } }, { l: '~Currency (Telekurs)', radio: true, chk: st.mode === 'fx', fn: function () { mode('fx'); } }, '-', { l: '~Digit grouping', dis: true }]; } },
      { l: '~Help', items: function () { return [{ l: '~Help Topics', dis: true }, '-', { l: '~About Calculator', fn: function () { Dlg().msg('About Calculator', '<b>Calculator</b><br>Version 5.0<br><br>Currency rates supplied by the Telekurs feed of PBS/Web.', 'biginfo'); } }]; } }
    ]);
    mode('std');
  }
  A.defs.calc = { title: 'Calculator', icon: 'd-calc', w: 262, h: 276, resizable: false, open: calc };

  /* ================= Paint ================= */
  const PALETTE = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'];
  const TOOLS = [
    ['pencil', 'Pencil', '<path d="M3 13l1-3 7-7 2 2-7 7z" fill="#f2c94c" stroke="#333"/>'],
    ['brush', 'Brush', '<path d="M12 2 7 9" stroke="#8a5a2a" stroke-width="2"/><path d="M6 9l2 2-3 3-2-1z" fill="#333"/>'],
    ['spray', 'Airbrush', '<rect x="5" y="6" width="5" height="8" fill="#888" stroke="#333"/><path d="M7 6V4h3" fill="none" stroke="#333"/><circle cx="12" cy="3" r=".7"/><circle cx="13" cy="5" r=".7"/><circle cx="14" cy="3" r=".7"/>'],
    ['eraser', 'Eraser', '<path d="M2 11l6-6 5 5-4 4H5z" fill="#f4a0b0" stroke="#333"/>'],
    ['fill', 'Fill With Color', '<path d="M3 8l5-5 5 5-5 5z" fill="#ddd" stroke="#333"/><path d="M13 9c1 2 2 3 1 4s-2 0-1-4z" fill="#2a6ac0"/>'],
    ['pick', 'Pick Color', '<path d="M3 13l7-7 2 2-7 7H3z" fill="#ccc" stroke="#333"/><path d="M10 4l2-2 2 2-2 2z" fill="#333"/>'],
    ['line', 'Line', '<path d="M2 13 13 2" stroke="#000" stroke-width="1.5"/>'],
    ['rect', 'Rectangle', '<rect x="2.5" y="4.5" width="11" height="8" fill="none" stroke="#000"/>'],
    ['ellipse', 'Ellipse', '<ellipse cx="8" cy="8" rx="5.5" ry="4" fill="none" stroke="#000"/>'],
    ['text', 'Text', '<text x="8" y="13" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold">A</text>']
  ];
  function paintApp(win, arg) {
    const st = win.data = { tool: 'pencil', prev: 'pencil', fg: '#000000', bg: '#ffffff', size: 3, fill: 'outline', path: null, dirty: false, undo: [] };
    win.body.innerHTML = '<div class="pt"><div class="pt-tools">' + TOOLS.map(function (t) { return '<button type="button" class="pt-tb' + (t[0] === 'pencil' ? ' on' : '') + '" data-tool="' + t[0] + '" title="' + t[1] + '"><svg viewBox="0 0 16 16">' + t[2] + '</svg></button>'; }).join('') +
      '<div class="pt-opts"></div></div><div class="pt-area"><div class="pt-cv"><canvas class="pt-c" width="480" height="320"></canvas><canvas class="pt-o" width="480" height="320"></canvas></div></div></div>' +
      '<div class="pt-pal"><div class="pt-cur"><span class="pt-bg"></span><span class="pt-fg"></span></div><div class="pt-cols">' + PALETTE.map(function (c) { return '<span data-c="' + c + '" style="background:' + c + '"></span>'; }).join('') + '</div></div>' +
      '<div class="pt-status"><span class="sc grow">For Help, click Help Topics on the Help Menu.</span><span class="sc pt-xy"></span></div>';
    const $ = function (s) { return win.body.querySelector(s); };
    const cv = $('.pt-c'), ov = $('.pt-o');
    const cx = cv.getContext('2d'), ox = ov.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    const title = function () { WM().setTitle(win.id, (st.path ? FS.name(st.path) : 'untitled') + ' - Paint'); };
    const opts = function () {
      const o = $('.pt-opts');
      if (st.tool === 'brush' || st.tool === 'eraser' || st.tool === 'spray') o.innerHTML = [2, 4, 7, 10].map(function (s) { return '<span class="pt-sz' + (st.size === s ? ' on' : '') + '" data-sz="' + s + '"><i style="width:' + s + 'px;height:' + s + 'px"></i></span>'; }).join('');
      else if (st.tool === 'rect' || st.tool === 'ellipse') o.innerHTML = [['outline', 'Outline'], ['both', 'Outline + fill'], ['fill', 'Fill']].map(function (f) { return '<span class="pt-fm' + (st.fill === f[0] ? ' on' : '') + '" data-fm="' + f[0] + '" title="' + f[1] + '"><i class="fm-' + f[0] + '"></i></span>'; }).join('');
      else o.innerHTML = '';
    };
    const cols = function () { $('.pt-fg').style.background = st.fg; $('.pt-bg').style.background = st.bg; };
    const snap = function () { st.undo.push(cx.getImageData(0, 0, cv.width, cv.height)); if (st.undo.length > 15) st.undo.shift(); st.dirty = true; };
    const undo = function () { const d = st.undo.pop(); if (!d) return; if (d.width !== cv.width || d.height !== cv.height) { cv.width = ov.width = d.width; cv.height = ov.height = d.height; } cx.putImageData(d, 0, 0); };
    const setTool = function (t) { if (t !== 'pick') st.prev = t; st.tool = t; win.body.querySelectorAll('.pt-tb').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === t); }); ov.style.cursor = t === 'text' ? 'text' : 'crosshair'; opts(); };
    // Pixelgenaue Linie (Bresenham) mit quadratischem Pinsel
    const dot = function (c, x, y, sz, col) { c.fillStyle = col; c.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz); };
    const line = function (c, x0, y0, x1, y1, sz, col) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let er = dx + dy;
      for (;;) { dot(c, x0, y0, sz, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } }
    };
    const shape = function (c, t, x0, y0, x1, y1, fg, bg) {
      const x = Math.min(x0, x1) + 0.5, y = Math.min(y0, y1) + 0.5, w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
      c.lineWidth = 1;
      c.beginPath();
      if (t === 'rect') c.rect(x, y, w, h); else c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      if (st.fill === 'both') { c.fillStyle = bg; c.fill(); }
      if (st.fill === 'fill') { c.fillStyle = fg; c.fill(); } else { c.strokeStyle = fg; c.stroke(); }
    };
    const flood = function (x, y, col) {
      x = Math.floor(x); y = Math.floor(y);
      const W = cv.width, H = cv.height, img = cx.getImageData(0, 0, W, H), d = img.data;
      const i0 = (y * W + x) * 4, tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
      const n = parseInt(col.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
      if (tr === r && tg === g && tb === b) return;
      const stack = [[x, y]];
      while (stack.length) {
        const p = stack.pop(), px = p[0], py = p[1];
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const i = (py * W + px) * 4;
        if (d[i] !== tr || d[i + 1] !== tg || d[i + 2] !== tb) continue;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
      }
      cx.putImageData(img, 0, 0);
    };
    let drag = null, sprayT = 0;
    const pos = function (ev) { const r = ov.getBoundingClientRect(); return [(ev.clientX - r.left) * ov.width / r.width, (ev.clientY - r.top) * ov.height / r.height]; };
    ov.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
    ov.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      ov.setPointerCapture(ev.pointerId);
      const p = pos(ev), fg = ev.button === 2 ? st.bg : st.fg, bg = ev.button === 2 ? st.fg : st.bg;
      if (st.tool === 'pick') {
        const d = cx.getImageData(Math.floor(p[0]), Math.floor(p[1]), 1, 1).data;
        const c = '#' + [d[0], d[1], d[2]].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
        if (ev.button === 2) st.bg = c; else st.fg = c;
        cols(); setTool(st.prev); return;
      }
      if (st.tool === 'text') {
        Dlg().open({ title: 'Text', width: 320, body: '<table class="frm"><tr><th style="width:50px">Text:</th><td><input class="inp" id="pt-txt" style="width:100%"></td></tr></table>',
          buttons: [{ label: 'OK', def: true, fn: function (o) { const t = o.querySelector('#pt-txt').value; if (t) { snap(); cx.fillStyle = fg; cx.font = '13px Arial, sans-serif'; cx.textBaseline = 'top'; cx.fillText(t, p[0], p[1]); } } }, { label: 'Cancel' }] });
        return;
      }
      snap();
      if (st.tool === 'fill') { flood(p[0], p[1], fg); return; }
      drag = { x: p[0], y: p[1], lx: p[0], ly: p[1], fg: fg, bg: bg };
      if (st.tool === 'pencil') dot(cx, p[0], p[1], 1, fg);
      if (st.tool === 'brush') dot(cx, p[0], p[1], st.size, fg);
      if (st.tool === 'eraser') dot(cx, p[0], p[1], st.size * 2, st.bg);
      if (st.tool === 'spray') {
        const spray = function () { if (!drag) return; for (let i = 0; i < 12; i++) { const a = Math.random() * 6.283, r = Math.random() * st.size * 2; dot(cx, drag.lx + Math.cos(a) * r, drag.ly + Math.sin(a) * r, 1, drag.fg); } };
        spray(); sprayT = setInterval(spray, 30);
      }
    });
    ov.addEventListener('pointermove', function (ev) {
      const p = pos(ev);
      $('.pt-xy').textContent = Math.max(0, Math.floor(p[0])) + ',' + Math.max(0, Math.floor(p[1]));
      if (!drag) return;
      if (st.tool === 'pencil') line(cx, drag.lx, drag.ly, p[0], p[1], 1, drag.fg);
      else if (st.tool === 'brush') line(cx, drag.lx, drag.ly, p[0], p[1], st.size, drag.fg);
      else if (st.tool === 'eraser') line(cx, drag.lx, drag.ly, p[0], p[1], st.size * 2, st.bg);
      else if (st.tool === 'line') { ox.clearRect(0, 0, ov.width, ov.height); line(ox, drag.x, drag.y, p[0], p[1], 1, drag.fg); }
      else if (st.tool === 'rect' || st.tool === 'ellipse') { ox.clearRect(0, 0, ov.width, ov.height); shape(ox, st.tool, drag.x, drag.y, p[0], p[1], drag.fg, drag.bg); }
      drag.lx = p[0]; drag.ly = p[1];
    });
    const up = function (ev) {
      if (!drag) return;
      clearInterval(sprayT);
      const p = pos(ev);
      ox.clearRect(0, 0, ov.width, ov.height);
      if (st.tool === 'line') line(cx, drag.x, drag.y, p[0], p[1], 1, drag.fg);
      if (st.tool === 'rect' || st.tool === 'ellipse') shape(cx, st.tool, drag.x, drag.y, p[0], p[1], drag.fg, drag.bg);
      drag = null;
    };
    ov.addEventListener('pointerup', up);
    ov.addEventListener('pointercancel', up);
    win.body.addEventListener('click', function (ev) {
      const t = ev.target.closest('[data-tool]'); if (t) { setTool(t.dataset.tool); return; }
      const sz = ev.target.closest('[data-sz]'); if (sz) { st.size = +sz.dataset.sz; opts(); return; }
      const fm = ev.target.closest('[data-fm]'); if (fm) { st.fill = fm.dataset.fm; opts(); return; }
      const c = ev.target.closest('[data-c]'); if (c) { st.fg = c.dataset.c; cols(); }
    });
    win.body.addEventListener('contextmenu', function (ev) { const c = ev.target.closest('[data-c]'); if (c) { ev.preventDefault(); st.bg = c.dataset.c; cols(); } });
    const resize = function (w, h) {
      const keep = cx.getImageData(0, 0, cv.width, cv.height);
      cv.width = ov.width = w; cv.height = ov.height = h;
      cx.fillStyle = st.bg; cx.fillRect(0, 0, w, h);
      cx.putImageData(keep, 0, 0);
    };
    const loadImg = function (p) {
      const src = FS.read(p);
      if (!src || !/^data:image\//.test(src)) { Dlg().msg('Paint', 'Paint cannot read this file.<br>This is not a valid bitmap file, or its format is not currently supported.', 'err'); return; }
      const im = new Image();
      im.onload = function () { cv.width = ov.width = im.naturalWidth; cv.height = ov.height = im.naturalHeight; cx.drawImage(im, 0, 0); st.path = FS.realPath(p); st.dirty = false; st.undo = []; title(); };
      im.src = src;
    };
    const doSave = function (as, after) {
      const write = function (p) {
        if (!FS.write(p, cv.toDataURL('image/png'))) { A.err('Paint', FS.lastError, FS.name(p)); return; }
        st.path = FS.realPath(p); st.dirty = false; title(); if (after) after();
      };
      if (!st.path || as) A.fileDlg({ mode: 'save', title: 'Save As', dir: st.path ? FS.parent(st.path) : FS.specialPaths().documents, name: st.path ? FS.name(st.path) : 'untitled.bmp', types: A.IMG, onOk: write });
      else write(st.path);
    };
    const askSave = function (then) {
      if (!st.dirty) { then(); return; }
      Dlg().open({ title: 'Paint', width: 360, sound: 'ding', body: '<div class="dlg-msg"><svg class="ico32"><use href="#i-bigwarn"/></svg><div>Save changes to ' + e(st.path ? FS.name(st.path) : 'untitled') + '?</div></div>',
        buttons: [{ label: 'Yes', def: true, fn: function () { setTimeout(function () { doSave(false, then); }, 0); } }, { label: 'No', fn: function () { setTimeout(then, 0); } }, { label: 'Cancel' }] });
    };
    const wallpaper = function (mode) { A.st.wall = 'custom'; A.st.custom = cv.toDataURL('image/png'); A.st.mode = mode; A.saveSt(); };
    WM().menubar(win, [
      { l: '~File', items: function () {
        return [{ l: '~New', k: 'Ctrl+N', fn: function () { askSave(function () { cv.width = ov.width = 480; cv.height = ov.height = 320; cx.fillStyle = '#fff'; cx.fillRect(0, 0, 480, 320); st.path = null; st.dirty = false; st.undo = []; title(); }); } },
          { l: '~Open...', k: 'Ctrl+O', fn: function () { askSave(function () { A.fileDlg({ mode: 'open', title: 'Open', dir: FS.specialPaths().documents, types: A.IMG, onOk: loadImg }); }); } },
          { l: '~Save', k: 'Ctrl+S', fn: function () { doSave(false); } }, { l: 'Save ~As...', fn: function () { doSave(true); } }, '-',
          { l: 'Set As Wallpaper (~Tiled)', fn: function () { wallpaper('tile'); } }, { l: 'Set As Wallpaper (C~entered)', fn: function () { wallpaper('center'); } }, '-', { l: 'E~xit', fn: function () { WM().close(win.id); } }];
      } },
      { l: '~Edit', items: function () { return [{ l: '~Undo', k: 'Ctrl+Z', dis: !st.undo.length, fn: undo }, '-', { l: 'Clear ~Image', fn: function () { snap(); cx.fillStyle = st.bg; cx.fillRect(0, 0, cv.width, cv.height); } }]; } },
      { l: '~Image', items: function () {
        return [{ l: '~Flip/Rotate...', sub: [
          { l: 'Flip ~horizontal', fn: function () { transform(-1, 1, 0); } }, { l: 'Flip ~vertical', fn: function () { transform(1, -1, 0); } },
          { l: 'Rotate by ~90°', fn: function () { transform(1, 1, 90); } }, { l: 'Rotate by ~180°', fn: function () { transform(1, 1, 180); } }, { l: 'Rotate by ~270°', fn: function () { transform(1, 1, 270); } }] },
          { l: '~Invert Colors', k: 'Ctrl+I', fn: function () { snap(); const im = cx.getImageData(0, 0, cv.width, cv.height); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = 255 - im.data[i]; im.data[i + 1] = 255 - im.data[i + 1]; im.data[i + 2] = 255 - im.data[i + 2]; } cx.putImageData(im, 0, 0); } },
          { l: '~Attributes...', k: 'Ctrl+E', fn: attributes }, { l: '~Clear Image', fn: function () { snap(); cx.fillStyle = st.bg; cx.fillRect(0, 0, cv.width, cv.height); } }];
      } },
      { l: '~Colors', items: function () { return [{ l: '~Edit Colors...', fn: function () { const i = document.createElement('input'); i.type = 'color'; i.value = st.fg; i.oninput = function () { st.fg = i.value; cols(); }; i.click(); } }]; } },
      { l: '~Help', items: function () { return [{ l: '~Help Topics', dis: true }, '-', { l: '~About Paint', fn: function () { Dlg().msg('About Paint', '<b>Paint</b><br>Version 5.0<br><br>Licensed to Bankhaus Vogt &amp; Cie', 'biginfo'); } }]; } }
    ]);
    function transform(sx, sy, rot) {
      snap();
      const src = document.createElement('canvas');
      src.width = cv.width; src.height = cv.height;
      src.getContext('2d').drawImage(cv, 0, 0);
      if (rot === 90 || rot === 270) { cv.width = ov.width = src.height; cv.height = ov.height = src.width; }
      cx.save();
      cx.translate(cv.width / 2, cv.height / 2);
      cx.rotate(rot * Math.PI / 180);
      cx.scale(sx, sy);
      cx.drawImage(src, -src.width / 2, -src.height / 2);
      cx.restore();
    }
    function attributes() {
      Dlg().open({ title: 'Attributes', width: 300, body: '<table class="frm"><tr><th>Width:</th><td><input class="inp num" id="pa-w" size="6" value="' + cv.width + '"> pixels</td></tr><tr><th>Height:</th><td><input class="inp num" id="pa-h" size="6" value="' + cv.height + '"> pixels</td></tr></table>',
        buttons: [{ label: 'OK', def: true, fn: function (o) { const w = Math.max(1, Math.min(1600, +o.querySelector('#pa-w').value || cv.width)), h = Math.max(1, Math.min(1200, +o.querySelector('#pa-h').value || cv.height)); snap(); resize(w, h); } }, { label: 'Cancel' }] });
    }
    win.onKey = function (ev) {
      if (!ev.ctrlKey) return;
      const k = ev.key.toLowerCase();
      if (k === 'z') { ev.preventDefault(); undo(); } else if (k === 's') { ev.preventDefault(); doSave(false); } else if (k === 'e') { ev.preventDefault(); attributes(); }
    };
    win.onClose = function () { if (!st.dirty) return true; askSave(function () { WM().close(win.id, true); }); return false; };
    cols(); opts(); title();
    if (arg && arg.path) loadImg(arg.path);
  }
  A.defs.paint = { title: 'untitled - Paint', icon: 'd-paint', w: 640, h: 480, minW: 360, minH: 300, open: paintApp };

  /* ================= Eingabeaufforderung ================= */
  function cmdApp(win, arg) {
    const st = win.data = { cwd: FS.specialPaths().home.slice(), hist: [], hi: 0, pending: null };
    win.body.innerHTML = '<div class="cmd"><div class="cmd-out"></div><div class="cmd-line"><span class="cmd-prompt"></span><input class="cmd-in" spellcheck="false" autocomplete="off"></div></div>';
    const out = win.body.querySelector('.cmd-out'), inp = win.body.querySelector('.cmd-in'), pr = win.body.querySelector('.cmd-prompt'), box = win.body.querySelector('.cmd');
    win.keysInInputs = true;
    const print = function (t) { out.appendChild(document.createTextNode((t === undefined ? '' : String(t)) + '\n')); box.scrollTop = box.scrollHeight; };
    const promptText = function () { return st.pending ? st.pending.ask : FS.join(st.cwd) + '>'; };
    const showPrompt = function () { pr.textContent = promptText(); box.scrollTop = box.scrollHeight; };
    WM().setTitle(win.id, 'Command Prompt');
    print('Microsoft Windows 2000 [Version 5.00.2195]');
    print('(C) Copyright 1985-2000 Microsoft Corp.');
    print('');
    showPrompt();

    const resolve = function (a) {
      if (!a) return st.cwd.slice();
      a = a.replace(/\//g, '\\');
      if (/^[a-z]:/i.test(a)) return FS.parse(a.charAt(0).toUpperCase() + a.slice(1));
      if (a.charAt(0) === '\\') return FS.parse(st.cwd[0] + a);
      return FS.parse(FS.join(st.cwd) + '\\' + a);
    };
    const tokens = function (s) { const t = []; s.replace(/"([^"]*)"|(\S+)/g, function (m, q, w) { t.push(q !== undefined ? q : w); }); return t; };
    const wild = function (pat) { return new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i'); };
    const pad = function (s, n, right) { s = String(s); return right ? (' '.repeat(Math.max(0, n - s.length)) + s) : (s + ' '.repeat(Math.max(0, n - s.length))); };
    const notFound = function () { print('The system cannot find the path specified.'); };
    const fileNotFound = function () { print('The system cannot find the file specified.'); };
    const matches = function (arg) {
      const p = resolve(arg);
      const nm = FS.name(p);
      if (/[*?]/.test(nm)) { const re = wild(nm); return FS.list(FS.parent(p)).filter(function (f) { return re.test(f.name); }); }
      const i = FS.info(p);
      return i ? [i] : [];
    };
    const free = function (d) { return U.fmt(FS.drive(d).free, 0); };

    const HELP = ['ATTRIB   Displays file attributes.', 'CD       Displays the name of or changes the current directory.', 'CLS      Clears the screen.', 'COPY     Copies one or more files to another location.',
          'DATE     Displays the date.', 'DEL      Deletes one or more files.', 'DIR      Displays a list of files and subdirectories in a directory.', 'ECHO     Displays messages.', 'EXIT     Quits the CMD.EXE program.',
          'FORMAT   Formats a disk for use with Windows 2000.', 'HOSTNAME Prints the name of the current host.', 'IPCONFIG Displays IP network configuration.', 'MD       Creates a directory.', 'MOVE     Moves files to another directory.',
          'NET      Network commands.', 'PING     Tests a network connection.', 'RD       Removes a directory.', 'REN      Renames a file or files.', 'SET      Displays environment variables.', 'START    Starts a program or opens a document.',
          'TIME     Displays the system time.', 'TREE     Graphically displays the directory structure.', 'TYPE     Displays the contents of a text file.', 'VER      Displays the Windows version.', 'VOL      Displays the disk volume label.'];
    const CMDS = {
      help: function () { HELP.forEach(print); },
      cls: function () { out.textContent = ''; },
      ver: function () { print(''); print('Microsoft Windows 2000 [Version 5.00.2195]'); },
      vol: function () { print(' Volume in drive ' + st.cwd[0].charAt(0) + ' has no label.'); print(' Volume Serial Number is ' + (st.cwd[0] === 'A:' ? '2E1F-09C3' : '1C4A-3F2E')); },
      hostname: function () { print('ZH-BS64-0217'); },
      echo: function (a, raw) { print(raw === '.' || raw === '' ? (raw === '' ? 'ECHO is on.' : '') : raw); },
      exit: function () { WM().close(win.id); },
      set: function () { ['ALLUSERSPROFILE=C:\\Documents and Settings\\All Users', 'COMPUTERNAME=ZH-BS64-0217', 'HOMEDRIVE=C:', 'NUMBER_OF_PROCESSORS=1', 'OS=Windows_NT', 'PROCESSOR_ARCHITECTURE=x86', 'PROMPT=$P$G', 'SystemRoot=C:\\WINNT', 'USERDOMAIN=VOGT-ZH', 'USERNAME=' + (G.state ? G.state.user.id : 'E10001'), 'USERPROFILE=' + FS.join(FS.specialPaths().home)].forEach(print); },
      ipconfig: function () { ['', 'Windows 2000 IP Configuration', '', 'Ethernet adapter Local Area Connection:', '', '        Connection-specific DNS Suffix  . : vogt.intra', '        IP Address. . . . . . . . . . . . : 10.12.4.217', '        Subnet Mask . . . . . . . . . . . : 255.255.0.0', '        Default Gateway . . . . . . . . . : 10.12.0.1'].forEach(print); },
      date: function () { const s = G.state; const d = s ? s.date : '2003-03-03'; print('The current date is: ' + U.weekday(d) + ' ' + U.fmtDate(d)); st.pending = { ask: 'Enter the new date: (dd-mm-yy) ', run: function () { print('A required privilege is not held by the client.'); } }; },
      time: function () { const s = G.state; print('The current time is: ' + (s ? U.pad(Math.floor(s.clock / 60), 2) + ':' + U.pad(s.clock % 60, 2) + ':00.00' : new Date().toTimeString().slice(0, 8))); st.pending = { ask: 'Enter the new time: ', run: function () { print('A required privilege is not held by the client.'); } }; },
      ping: function (a) {
        const h = (a[0] || '').toLowerCase();
        if (!h) { print('Usage: ping target_name'); return; }
        const known = /(^|\.)vogt\.intra$|^pbsprd01|^localhost$|^127\./.test(h);
        const web = PBS.Web && PBS.Web.has(h.replace(/^https?:\/\//, ''));
        if (!known && !web) { print('Ping request could not find host ' + a[0] + '. Please check the name and try again.'); return; }
        const ip = known ? (h.indexOf('pbsprd01') === 0 ? '10.12.1.10' : h.indexOf('intranet') === 0 ? '10.12.1.20' : '127.0.0.1') : '195.' + (h.length * 7 % 200) + '.' + (h.length * 13 % 250) + '.' + (h.length * 3 % 250);
        print(''); print('Pinging ' + h + ' [' + ip + '] with 32 bytes of data:'); print('');
        for (let i = 0; i < 4; i++) print('Reply from ' + ip + ': bytes=32 time' + (known ? '<10ms' : '=' + (30 + i * 4) + 'ms') + ' TTL=' + (known ? 128 : 54));
        print(''); print('Ping statistics for ' + ip + ':'); print('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),');
      },
      net: function (a) {
        const k = (a[0] || '').toLowerCase();
        if (k === 'use') { print('New connections will be remembered.'); print(''); print('There are no entries in the list.'); }
        else if (k === 'user' || k === 'localgroup') { print('System error 5 has occurred.'); print(''); print('Access is denied.'); }
        else { print('The syntax of this command is:'); print(''); print('NET [ ACCOUNTS | COMPUTER | CONFIG | CONTINUE | FILE | GROUP | HELP |'); print('      HELPMSG | LOCALGROUP | NAME | PAUSE | PRINT | SEND | SESSION |'); print('      SHARE | START | STATISTICS | STOP | TIME | USE | USER | VIEW ]'); }
      },
      cd: function (a, raw) {
        if (!raw) { print(FS.join(st.cwd)); return; }
        const p = resolve(raw.replace(/^\/d\s+/i, '').replace(/"/g, '').trim());
        if (!FS.isDir(p)) { notFound(); return; }
        st.cwd = FS.realPath(p);
      },
      dir: function (a) {
        const wide = a.some(function (x) { return /^\/w$/i.test(x); });
        const arg = a.filter(function (x) { return x.charAt(0) !== '/'; })[0];
        let p = resolve(arg), list;
        if (arg && /[*?]/.test(FS.name(p))) { list = matches(arg); p = FS.parent(p); }
        else { if (!FS.isDir(p)) { if (FS.exists(p)) { list = [FS.info(p)]; p = FS.parent(p); } else { print('File Not Found'); return; } } else list = FS.list(p); }
        print(' Volume in drive ' + p[0].charAt(0) + ' has no label.');
        print(' Volume Serial Number is ' + (p[0] === 'A:' ? '2E1F-09C3' : '1C4A-3F2E'));
        print(''); print(' Directory of ' + FS.join(FS.realPath(p) || p)); print('');
        let nf = 0, nd = 0, bytes = 0;
        if (p.length > 1) { print(pad(U.fmtDate(FS.node(p).modified || '2003-01-01') + '  08:00', 20) + pad('<DIR>', 15) + '.'); print(pad(U.fmtDate(FS.node(p).modified || '2003-01-01') + '  08:00', 20) + pad('<DIR>', 15) + '..'); nd += 2; }
        if (wide) {
          let row = '';
          list.forEach(function (f) { const n = f.type === 'dir' ? '[' + f.name + ']' : f.name; row += pad(n, 18); if (row.length > 70) { print(row); row = ''; } if (f.type === 'dir') nd++; else { nf++; bytes += f.size; } });
          if (row) print(row);
        } else {
          list.forEach(function (f) {
            const d = pad(U.fmtDate(f.modified || '2003-01-01') + '  08:00', 20);
            if (f.type === 'dir') { print(d + pad('<DIR>', 15) + f.name); nd++; } else { print(d + pad(U.fmt(f.size, 0), 14, true) + ' ' + f.name); nf++; bytes += f.size; }
          });
        }
        print(pad(String(nf), 16, true) + ' File(s)' + pad(U.fmt(bytes, 0), 15, true) + ' bytes');
        print(pad(String(nd), 16, true) + ' Dir(s)' + pad(free(p[0]), 16, true) + ' bytes free');
      },
      type: function (a) {
        if (!a[0]) { print('The syntax of the command is incorrect.'); return; }
        const i = FS.info(resolve(a[0]));
        if (!i) { fileNotFound(); return; }
        if (i.type === 'dir') { print('Access is denied.'); return; }
        const b = i.node.body || '';
        if (/^data:image\//.test(b)) { print('‰PNG  ' + b.slice(30, 90).replace(/[A-Za-z0-9+/=]/g, function (c) { return String.fromCharCode(0x2591 + c.charCodeAt(0) % 3); })); return; }
        b.replace(/\r\n/g, '\n').split('\n').forEach(print);
      },
      md: function (a) {
        if (!a[0]) { print('The syntax of the command is incorrect.'); return; }
        const p = resolve(a[0]);
        if (FS.exists(p)) { print('A subdirectory or file ' + a[0] + ' already exists.'); return; }
        if (!FS.isDir(FS.parent(p))) { notFound(); return; }
        if (!FS.mkdir(p)) print('Access is denied.');
      },
      rd: function (a) {
        const s = a.some(function (x) { return /^\/s$/i.test(x); }), q = a.some(function (x) { return /^\/q$/i.test(x); });
        const arg = a.filter(function (x) { return x.charAt(0) !== '/'; })[0];
        if (!arg) { print('The syntax of the command is incorrect.'); return; }
        const p = resolve(arg);
        if (!FS.isDir(p)) { notFound(); return; }
        if (FS.list(p, { hidden: true }).length && !s) { print('The directory is not empty.'); return; }
        const doit = function () { if (!FS.destroy(p)) print('Access is denied.'); };
        if (s && !q) st.pending = { ask: arg + ', Are you sure (Y/N)? ', run: function (ans) { if (/^y/i.test(ans)) doit(); } };
        else doit();
      },
      del: function (a) {
        const q = a.some(function (x) { return /^\/q$/i.test(x); });
        const arg = a.filter(function (x) { return x.charAt(0) !== '/'; })[0];
        if (!arg) { print('The syntax of the command is incorrect.'); return; }
        let list = matches(arg);
        if (list.length === 1 && list[0].type === 'dir') list = FS.list(list[0].path);
        list = list.filter(function (f) { return f.type === 'file'; });
        if (!list.length) { print('Could Not Find ' + FS.join(resolve(arg))); return; }
        const doit = function () { list.forEach(function (f) { if (!FS.destroy(f.path)) print('Access is denied.'); }); };
        if (/\*\.\*$|^\*$/.test(arg) && !q) st.pending = { ask: FS.join(resolve(arg)) + ', Are you sure (Y/N)? ', run: function (ans) { if (/^y/i.test(ans)) doit(); } };
        else doit();
      },
      ren: function (a) {
        if (a.length < 2) { print('The syntax of the command is incorrect.'); return; }
        const p = resolve(a[0]);
        if (!FS.exists(p)) { fileNotFound(); return; }
        if (!FS.rename(p, a[1])) print(FS.lastError === 'exists' ? 'A duplicate file name exists, or the file cannot be found.' : 'Access is denied.');
      },
      copy: function (a) {
        const args = a.filter(function (x) { return x.charAt(0) !== '/'; });
        if (!args.length) { print('The syntax of the command is incorrect.'); return; }
        const list = matches(args[0]).filter(function (f) { return f.type === 'file'; });
        if (!list.length) { fileNotFound(); print('        0 file(s) copied.'); return; }
        const dest = resolve(args[1] || '.');
        let n = 0;
        list.forEach(function (f) {
          let ok;
          if (FS.isDir(dest)) {
            const target = FS.realPath(dest).concat([f.name]);
            ok = FS.exists(target) ? FS.write(target, f.node.body, { mime: f.node.mime }) : FS.copy(f.path, dest);
          } else ok = FS.write(dest, f.node.body, { mime: f.node.mime });
          if (ok) n++; else print(FS.lastError === 'full' ? 'There is not enough space on the disk.' : 'Access is denied.');
        });
        print('        ' + n + ' file(s) copied.');
      },
      move: function (a) {
        const args = a.filter(function (x) { return x.charAt(0) !== '/'; });
        if (args.length < 2) { print('The syntax of the command is incorrect.'); return; }
        const list = matches(args[0]);
        if (!list.length) { fileNotFound(); return; }
        const dest = resolve(args[1]);
        list.forEach(function (f) {
          if (FS.isDir(dest)) { if (!FS.move(f.path, dest)) print('Access is denied.'); }
          else if (FS.parent(dest).join('\\').toLowerCase() === FS.parent(f.path).join('\\').toLowerCase()) { if (!FS.rename(f.path, FS.name(dest))) print('Access is denied.'); }
          else print('The system cannot find the path specified.');
        });
      },
      attrib: function (a) {
        const list = a[0] ? matches(a[0]) : FS.list(st.cwd);
        if (!list.length) { fileNotFound(); return; }
        list.forEach(function (f) { if (f.type === 'file') print(pad('A', 5) + pad(f.ro ? 'R' : '', 2) + pad(f.system ? 'S' : '', 2) + '     ' + FS.join(f.path)); });
      },
      tree: function (a) {
        const p = resolve(a[0]);
        if (!FS.isDir(p)) { print('Invalid path - ' + (a[0] || '')); return; }
        print('Folder PATH listing'); print('Volume serial number is 1C4A-3F2E'); print(FS.join(FS.realPath(p)));
        (function walk(q, prefix) {
          const ds = FS.list(q).filter(function (f) { return f.type === 'dir'; });
          ds.forEach(function (d, i) { const last = i === ds.length - 1; print(prefix + (last ? '└───' : '├───') + d.name); walk(d.path, prefix + (last ? '    ' : '│   ')); });
        })(FS.realPath(p), '');
      },
      format: function (a) {
        const d = (a[0] || '').toUpperCase();
        if (d !== 'A:') { print(d === 'C:' ? 'Cannot format the system drive. Access is denied.' : 'Required parameter missing -'); return; }
        st.pending = { ask: 'Insert new disk for drive A:\nand press ENTER when ready...', run: function () {
          FS.list(['A:'], { hidden: true }).forEach(function (f) { FS.destroy(f.path); });
          print('The type of the file system is FAT.'); print('Verifying 1.44M'); print('Format complete.'); print('');
          print('      1,457,664 bytes total disk space'); print('      1,457,664 bytes available on disk');
        } };
      },
      start: function (a, raw) { if (!raw) { CMDS._launch('cmd'); return; } openThing(raw); },
      whoami: null
    };
    CMDS.chdir = CMDS.cd; CMDS.mkdir = CMDS.md; CMDS.rmdir = CMDS.rd; CMDS.erase = CMDS.del; CMDS.rename = CMDS.ren;
    CMDS._launch = function (app, arg2) { WM().open(app, arg2); };
    const APPS = { notepad: 'notepad', calc: 'calc', mspaint: 'paint', explorer: 'explorer', winmine: 'mine', sol: 'sol', control: 'control', cmd: 'cmd', iexplore: 'ie' };
    function openThing(t) {
      const low = t.toLowerCase().replace(/\.exe$/, '');
      if (APPS[low]) { WM().launchApp(APPS[low]); return; }
      if (/:\/\/|^www\./i.test(t)) { if (WM().hooks.navigate) WM().hooks.navigate(t); return; }
      const p = resolve(t);
      if (FS.exists(p)) WM().openPath(p); else print('The system cannot find the file ' + t + '.');
    }
    const run = function (line) {
      const raw = line.trim();
      if (!raw) return;
      if (/^[a-z]:$/i.test(raw)) { const d = raw.toUpperCase(); if (FS.isDir([d])) st.cwd = [d]; else print('The system cannot find the drive specified.'); return; }
      if (/^cd\.\.$/i.test(raw)) { if (st.cwd.length > 1) st.cwd = st.cwd.slice(0, -1); return; }
      if (/^cd\\$/i.test(raw)) { st.cwd = [st.cwd[0]]; return; }
      if (/^echo\.$/i.test(raw)) { print(''); return; }
      const m = /^(\S+)\s*(.*)$/.exec(raw);
      const c = m[1].toLowerCase().replace(/\.(exe|com)$/, ''), rest = m[2];
      const fn = CMDS[c];
      if (fn && /(^|\s)\/\?(\s|$)/.test(rest)) { const h = HELP.find(function (x) { return x.split(' ')[0] === c.toUpperCase(); }); print(h ? h.replace(/^\S+\s+/, '') : 'No help is available for this command.'); return; }
      if (fn) { fn(tokens(rest), rest.trim()); return; }
      if (APPS[c]) {
        const t = tokens(rest)[0];
        if (c === 'iexplore') { openThing(t || 'http://pbsprd01.vogt.intra/pbs/overview.do'); return; }
        WM().open(APPS[c], t ? { path: resolve(t) } : undefined);
        return;
      }
      if (FS.exists(resolve(m[1])) && !FS.isDir(resolve(m[1]))) { WM().openPath(resolve(m[1])); return; }
      print('\'' + m[1] + '\' is not recognized as an internal or external command,');
      print('operable program or batch file.');
    };
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const line = inp.value;
        inp.value = '';
        print(promptText() + line);
        if (st.pending) { const p = st.pending; st.pending = null; p.run(line); }
        else { if (line.trim()) { st.hist.push(line); st.hi = st.hist.length; } run(line); }
        if (!st.pending && WM().wins[win.id]) print('');
        showPrompt();
      } else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (st.hi > 0) { st.hi--; inp.value = st.hist[st.hi]; } }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); if (st.hi < st.hist.length - 1) { st.hi++; inp.value = st.hist[st.hi]; } else { st.hi = st.hist.length; inp.value = ''; } }
      else if (ev.key === 'Tab') {
        ev.preventDefault();
        const parts = inp.value.split(' '), last = parts.pop();
        const base = last.replace(/[^\\]*$/, ''), pre = last.slice(base.length).toLowerCase();
        const hit = FS.list(resolve(base || '.')).find(function (f) { return f.name.toLowerCase().indexOf(pre) === 0; });
        if (hit) { parts.push(base + (/\s/.test(hit.name) ? '"' + hit.name + '"' : hit.name)); inp.value = parts.join(' '); }
      } else if (ev.ctrlKey && ev.key.toLowerCase() === 'c') { ev.preventDefault(); print(promptText() + inp.value + '^C'); inp.value = ''; st.pending = null; showPrompt(); }
    });
    box.addEventListener('mouseup', function () { if (!window.getSelection().toString()) inp.focus(); });
    setTimeout(function () { inp.focus(); }, 0);
    win.onFocus = function () { inp.focus(); };
  }
  A.defs.cmd = { title: 'Command Prompt', icon: 'd-cmd', w: 660, h: 380, minW: 320, minH: 180, open: cmdApp };
})(window.PBS);
