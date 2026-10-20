/* Arbeitsplatz ZH-BS64-0217 – Browserfenster (Internet Explorer 6), Menüs, Symbolleisten, Explorer-Leiste,
   Statusleiste, Taskleiste und Windows-Dialoge. Die Spielsteuerung (app.js) meldet sich über B.hooks an. */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, Snd = PBS.Sound;
  const e = U.esc;
  const BASE = D.BANK.intranet;
  const INTRA = 'http://intranet.vogt.intra/';
  const INTRA_PAGES = { intranet: 'default.htm', phone: 'telefon.htm', menu: 'menueplan.htm', rules: 'weisungen.htm' };
  const APP = 'Microsoft Internet Explorer';
  const LINKS = [['Intranet Vogt', '#/x/intranet'], ['PBS/Web', '#/overview'], ['Telefonbuch', '#/x/phone'], ['Menüplan', '#/x/menu'], ['Weisungen', '#/x/rules']];
  const SIZES = [['xl', 'Lar~gest', 1.3], ['l', '~Larger', 1.15], ['m', '~Medium', 1], ['s', '~Smaller', 0.92], ['xs', 'Smalle~st', 0.85]];
  function $(id) { return document.getElementById(id); }

  const B = PBS.Browser = { hooks: {}, hist: [], idx: -1, travel: false, visited: [], typed: [], win: 'max', lastWin: 'max', xbar: null, cur: { url: BASE, title: '', hash: null }, msgText: '', tmpText: '' };

  /* ---------- Einstellungen ---------- */
  B.st = Object.assign({ anim: true, vol: 0.8 }, G.settings());
  B.st.bars = Object.assign({ std: true, addr: true, links: true, status: true }, B.st.bars);
  function saveSt() {
    G.saveSettings(B.st);
    applySt();
    if (B.hooks.settings) B.hooks.settings(B.st);
  }
  B.save = saveSt;
  function applySt() {
    const b = B.st.bars;
    $('ie-std').classList.toggle('hidden', !b.std);
    $('ie-addr').classList.toggle('hidden', !b.addr);
    $('ie-links').classList.toggle('hidden', !b.links);
    document.querySelector('.ie-row2').classList.toggle('hidden', !b.addr && !b.links);
    $('ie-status').classList.toggle('hidden', !b.status);
    const z = (SIZES.find(function (x) { return x[0] === B.st.text; }) || SIZES[2])[2];
    $('ie-view').style.zoom = z === 1 ? '' : z;
    Snd.set(B.st.sound);
    Snd.volume(B.st.vol);
    $('tb-vol').innerHTML = '<svg class="ico"><use href="#' + (B.st.sound ? 't-vol' : 't-mute') + '"/></svg>';
    $('tb-vol').title = B.st.sound ? 'Volume' : 'Volume (muted)';
    document.body.classList.toggle('noanim', !B.st.anim);
  }

  /* ---------- Adressen ---------- */
  B.urlFor = function (hash) {
    if (!hash) return BASE;
    const h = hash.replace(/^#\/?/, '');
    const qi = h.indexOf('?');
    const path = qi >= 0 ? h.slice(0, qi) : h, query = qi >= 0 ? h.slice(qi + 1) : '';
    if (path === '404') { const m = /(?:^|&)u=([^&]*)/.exec(query); return m ? decodeURIComponent(m[1]) : BASE; }
    // Fiktives Internet: #/w/<host>/<pfad>
    if (path.indexOf('w/') === 0) {
      const rest = path.slice(2), i = rest.indexOf('/');
      return 'http://' + (i < 0 ? rest : rest.slice(0, i)) + '/' + (i < 0 ? '' : rest.slice(i + 1)) + (query ? '?' + query : '');
    }
    // Lokale Dateien: #/f?p=<pfad>
    if (path === 'f') { const m = /(?:^|&)p=([^&]*)/.exec(query); const fp = m ? decodeURIComponent(m[1]) : 'C:\\'; return 'file:///' + fp.replace(/\\/g, '/'); }
    if (path.indexOf('x/') === 0) return INTRA + (INTRA_PAGES[path.slice(2)] || path.slice(2) + '.htm');
    const segs = path.split('/');
    const i = segs.findIndex(function (x) { return /\d/.test(x); });
    let name = path;
    const params = [];
    if (i >= 0) {
      name = segs.slice(0, i).join('/');
      params.push('id=' + segs[i]);
      if (segs.length > i + 1) params.push('tab=' + segs.slice(i + 1).join('/'));
    }
    if (query) params.push(query);
    return BASE + (name || 'overview') + '.do' + (params.length ? '?' + params.join('&') : '');
  };
  B.hashFor = function (url) {
    const raw = String(url || '').trim();
    if (!raw) return null;
    // Lokale Dateien: file:///C:/... oder C:\...
    if (/^file:/i.test(raw) || /^[a-z]:([\\\/]|$)/i.test(raw)) {
      let fp = raw.replace(/^file:\/*/i, '');
      try { fp = decodeURIComponent(fp); } catch (x) { /* unverändert */ }
      return '#/f?p=' + encodeURIComponent(fp.replace(/\//g, '\\'));
    }
    let u = raw;
    if (!/^[a-z]+:\/\//i.test(u)) u = 'http://' + u;
    const low = u.toLowerCase();
    if (low.indexOf(INTRA) === 0 || low === INTRA.slice(0, -1)) {
      const page = low.slice(INTRA.length);
      if (!page || page === 'default.htm' || page === 'index.htm') return '#/x/intranet';
      const k = Object.keys(INTRA_PAGES).find(function (x) { return INTRA_PAGES[x] === page; });
      return k ? '#/x/' + k : null;
    }
    const host = BASE.replace(/\/pbs\/$/, '/').toLowerCase();
    if (low.indexOf(host) !== 0 && low !== host.slice(0, -1)) {
      // Fiktives Internet (PBS.Web); alles andere ist nicht erreichbar
      const w = /^https?:\/\/([^\/?#]+)(\/[^?#]*)?(\?[^#]*)?/i.exec(u);
      if (w && PBS.Web && PBS.Web.has(w[1].toLowerCase())) {
        const q = w[3] ? w[3].slice(1) : '';
        return '#/w/' + w[1].toLowerCase() + '/' + (w[2] || '/').replace(/^\//, '') + (q ? '?' + q : '');
      }
      return null;
    }
    let rest = u.slice(host.length);
    if (/^pbs\/?/i.test(rest)) rest = rest.replace(/^pbs\/?/i, '');
    else if (rest) return null;
    if (!rest || /^(login|index)\.jsp/i.test(rest)) return '#/overview';
    const m = /^([a-z][a-z/]*)\.do(?:\?(.*))?$/i.exec(rest);
    if (!m) return null;
    let hash = '#/' + m[1].toLowerCase();
    const q = [];
    (m[2] || '').split('&').filter(Boolean).forEach(function (kv) {
      const p = kv.split('=');
      if (p[0] === 'id') hash += '/' + decodeURIComponent(p[1] || '');
      else if (p[0] === 'tab') hash += '/' + decodeURIComponent(p[1] || '');
      else q.push(kv);
    });
    return hash + (q.length ? '?' + q.join('&') : '');
  };
  B.go = function (hash) {
    closeMenus(0);
    if (location.hash === hash) { if (B.hooks.refresh) B.hooks.refresh(); } else location.hash = hash;
  };
  B.navigateUrl = function (url) {
    let u = String(url || '').trim();
    if (!u) return;
    if (!/^[a-z]+:\/\//i.test(u) && !/^file:|^[a-z]:([\\\/]|$)/i.test(u)) u = 'http://' + u;
    B.typed = [u].concat(B.typed.filter(function (x) { return x !== u; })).slice(0, 12);
    const h = B.hashFor(u);
    B.go(h || '#/404?u=' + encodeURIComponent(u));
  };

  /* ---------- Seite, Verlauf ---------- */
  B.page = function (o) {
    const url = o.url || B.urlFor(o.hash);
    B.cur = { url: url, title: o.title, hash: o.hash || null };
    $('ie-title').textContent = o.title + ' - ' + APP;
    document.title = o.title + ' - ' + APP;
    if (PBS.WM) PBS.WM.setTitle('ie', o.title);
    if (document.activeElement !== $('ie-url')) $('ie-url').value = url;
    const zone = /^file:/i.test(url) ? ['d-comp', 'My Computer'] : /\.intra(\/|$)/i.test(url.replace(/^https?:\/\//i, '').split('/')[0] + '/') ? ['i-intra', 'Local intranet'] : ['i-globe', 'Internet'];
    document.querySelector('.ie-status .zone').innerHTML = '<svg class="ico"><use href="#' + zone[0] + '"/></svg> ' + zone[1];
    if (o.hash) {
      const top = B.hist[B.idx];
      if (B.travel) B.travel = false;
      else if (!top || top.hash !== o.hash) {
        B.hist = B.hist.slice(0, B.idx + 1);
        B.hist.push({ hash: o.hash, title: o.title, url: url });
        if (B.hist.length > 60) B.hist.shift();
        B.idx = B.hist.length - 1;
      } else top.title = o.title;
      B.visited = [{ hash: o.hash, title: o.title, url: url }].concat(B.visited.filter(function (v) { return v.url !== url; })).slice(0, 40);
    }
    paintNav();
    if (PBS.WM) PBS.WM.paintTasks();
    if (B.xbar === 'hist') paintX();
  };
  B.clearNav = function () { B.hist = []; B.idx = -1; B.travel = false; paintNav(); };
  function canBack() { return B.idx > 0; }
  function canFwd() { return B.idx < B.hist.length - 1; }
  function travel(i) {
    if (i < 0 || i >= B.hist.length || i === B.idx) return;
    B.idx = i;
    B.travel = true;
    const h = B.hist[i].hash;
    if (location.hash === h) { B.travel = false; if (B.hooks.refresh) B.hooks.refresh(); } else location.hash = h;
  }
  function back() { if (canBack()) travel(B.idx - 1); }
  function fwd() { if (canFwd()) travel(B.idx + 1); }
  function home() { closeMenus(0); if (B.hooks.home) B.hooks.home(); }
  function refresh() { if (B.hooks.refresh) B.hooks.refresh(); }
  function paintNav() {
    document.querySelector('[data-b=back]').disabled = !canBack();
    document.querySelector('[data-b=backlist]').disabled = !canBack();
    document.querySelector('[data-b=fwd]').disabled = !canFwd();
    document.querySelector('[data-b=fwdlist]').disabled = !canFwd();
  }

  /* ---------- Laden, Statusleiste ---------- */
  let timers = [], pending = null;
  function busy(on) { $('ie-throb').classList.toggle('busy', on); }
  function prog(p) { $('ie-prog').style.width = p + '%'; }
  function stopLoad() {
    timers.forEach(clearTimeout);
    timers = [];
    if (pending) { const f = pending; pending = null; $('ie-view').classList.remove('blank'); f(); }
    $('ie-view').classList.remove('blank');
    prog(0);
    busy(false);
    B.tmpText = '';
    paintStatus();
  }
  // Seitenaufruf: Klick, Sanduhr, Fortschrittsbalken; mit Seitenübergang kurz weisse Seite
  B.load = function (url, fn, o) {
    o = o || {};
    stopLoad();
    if (o.click !== false) Snd.click();
    busy(true);
    B.tmpText = 'Opening page ' + url + '...';
    paintStatus();
    prog(12);
    const later = function (ms, f) { timers.push(setTimeout(f, ms)); };
    if (o.blank && B.st.delay) {
      pending = fn;
      $('ie-view').classList.add('blank');
      later(60 + Math.random() * 90, function () {
        if (!pending) return;
        const f = pending;
        pending = null;
        $('ie-view').classList.remove('blank');
        f();
        prog(70);
      });
    } else { fn(); prog(55); }
    later(200, function () { prog(88); });
    later(320, function () { prog(0); busy(false); B.tmpText = ''; paintStatus(); });
  };
  // Kurzer "Postback" nach einer Aktion: nur Statusleiste
  B.post = function () {
    timers.forEach(clearTimeout);
    timers = [];
    busy(true);
    prog(40);
    timers.push(setTimeout(function () { prog(0); busy(false); }, 180));
  };
  B.status = function (t) { B.tmpText = t || ''; paintStatus(); };
  B.message = function (t) { B.msgText = t || ''; paintStatus(); };
  function paintStatus() {
    const t = B.tmpText || B.msgText || 'Done';
    $('ie-stext').textContent = t;
    $('ie-stext').parentNode.classList.toggle('msg', !B.tmpText && !!B.msgText);
  }

  /* ---------- Fenster (über die Fensterverwaltung PBS.WM) ---------- */
  function closeWin() { closeMenus(0); PBS.WM.close('ie'); }
  function openWin() { PBS.WM.showIE(); }
  B.openWin = openWin;
  // Beim Schliessen des Browserfensters nur sichern; die Sitzung läuft weiter
  B.onIEClose = function () { closeX(); if (G.state) G.save(); };

  /* ---------- Menüs (Windows 2000) ---------- */
  const stack = [];
  let subTimer = null, barOpen = null;
  function lbl(l) { return e(l).replace(/~(.)/, '<u>$1</u>'); }
  function openMenu(items, x, y, level, o) {
    o = o || {};
    closeMenus(level);
    if (typeof items === 'function') items = items();
    const el = document.createElement('div');
    el.className = 'wmenu' + (o.cls ? ' ' + o.cls : '');
    el.setAttribute('role', 'menu');
    el.innerHTML = (o.banner ? '<div class="mbanner"><span>' + o.banner + '</span></div><div class="mlist">' : '') + items.map(function (it, i) {
      if (it === '-') return '<div class="msep"></div>';
      return '<div class="mi' + (it.dis ? ' dis' : '') + (it.sub ? ' has' : '') + (it.big ? ' big' : '') + '" data-i="' + i + '" role="menuitem">' +
        '<span class="mc">' + (it.chk ? (it.radio ? '●' : '✓') : '') + '</span>' + (it.ico ? '<svg class="ico' + (it.big ? ' i24' : '') + '"><use href="#' + it.ico + '"/></svg>' : '') +
        '<span class="ml">' + lbl(it.l) + '</span>' + (it.k ? '<span class="mk">' + e(it.k) + '</span>' : '') + (it.sub ? '<span class="ma"></span>' : '') + '</div>';
    }).join('') + (o.banner ? '</div>' : '');
    $('menu-layer').appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = x, top = o.up ? y - h : y;
    if (left + w > innerWidth - 2) left = o.altX !== undefined ? o.altX - w : innerWidth - w - 2;
    if (top + h > innerHeight - 2) top = Math.max(0, innerHeight - h - 2);
    el.style.left = Math.max(0, left) + 'px';
    el.style.top = Math.max(0, top) + 'px';
    stack[level] = { el: el, items: items, onClose: o.onClose };
    const sub = function (mi, it) {
      const r = mi.getBoundingClientRect();
      openMenu(it.sub, r.right - 3, r.top - 3, level + 1, { altX: r.left + 3 });
    };
    el.addEventListener('mouseover', function (ev) {
      const mi = ev.target.closest('.mi');
      if (!mi) return;
      el.querySelectorAll('.mi.hot').forEach(function (x) { x.classList.remove('hot'); });
      mi.classList.add('hot');
      const it = items[+mi.dataset.i];
      clearTimeout(subTimer);
      subTimer = setTimeout(function () { if (it.sub && !it.dis) sub(mi, it); else closeMenus(level + 1); }, 220);
    });
    el.addEventListener('click', function (ev) {
      const mi = ev.target.closest('.mi');
      if (!mi) return;
      const it = items[+mi.dataset.i];
      if (it.dis) return;
      if (it.sub) { clearTimeout(subTimer); sub(mi, it); return; }
      closeMenus(0);
      if (it.fn) it.fn();
    });
    return el;
  }
  function closeMenus(from) {
    clearTimeout(subTimer);
    for (let i = stack.length - 1; i >= from; i--) if (stack[i]) { if (stack[i].onClose) try { stack[i].onClose(); } catch (x) { /* */ } stack[i].el.remove(); }
    stack.length = Math.min(stack.length, from);
    if (from === 0) {
      barOpen = null;
      document.querySelectorAll('.mb.on, .start.on').forEach(function (x) { x.classList.remove('on'); });
      const vp = $('volpop');
      if (vp) vp.remove();
    }
  }
  B.closeMenus = closeMenus;
  PBS.menu = openMenu;
  PBS.closeMenus = closeMenus;
  function openBar(key) {
    const mb = document.querySelector('.mb[data-m="' + key + '"]');
    closeMenus(0);
    barOpen = key;
    mb.classList.add('on');
    const r = mb.getBoundingClientRect();
    openMenu(MENUS[key], r.left, r.bottom, 0);
  }

  function sizeItems() { return SIZES.map(function (x) { return { l: x[1], chk: B.st.text === x[0], radio: true, fn: function () { B.st.text = x[0]; saveSt(); } }; }); }
  function bar(k) { return function () { B.st.bars[k] = !B.st.bars[k]; saveSt(); }; }
  function favItems() {
    return [{ l: '~Add to Favorites...', fn: addFav }, { l: '~Organize Favorites...', fn: organizeFavs }, '-',
      { l: 'Links', ico: 'i-folder', sub: LINKS.map(function (x) { return { l: x[0], ico: 'i-page', fn: function () { B.go(x[1]); } }; }) }]
      .concat(B.st.favs.map(function (f) { return { l: f.t.length > 46 ? f.t.slice(0, 44) + '…' : f.t, ico: 'i-page', fn: function () { B.go(f.h); } }; }));
  }
  const MENUS = {
    file: function () {
      return [
        { l: '~New', sub: [{ l: '~Window', k: 'Ctrl+N', dis: true }, '-', { l: '~Message', dis: true }, { l: '~Post', dis: true }, { l: '~Contact', dis: true }] },
        { l: '~Open...', k: 'Ctrl+O', fn: openDlg }, { l: '~Edit with Notepad', dis: true }, { l: '~Save', k: 'Ctrl+S', dis: true }, { l: 'Save ~As...', dis: true }, '-',
        { l: 'Page Set~up...', dis: true }, { l: '~Print...', k: 'Ctrl+P', fn: print }, { l: 'Print Pre~view...', dis: true }, '-',
        { l: 'S~end', sub: [{ l: '~Page by E-mail...', dis: true }, { l: '~Link by E-mail...', dis: true }, { l: '~Shortcut to Desktop', dis: true }] },
        { l: '~Import and Export...', dis: true }, '-', { l: 'P~roperties', fn: props }, { l: 'Wor~k Offline', dis: true }, { l: '~Close', fn: closeWin }
      ];
    },
    edit: function () {
      return [{ l: 'Cu~t', k: 'Ctrl+X', dis: true }, { l: '~Copy', k: 'Ctrl+C', fn: function () { try { document.execCommand('copy'); } catch (x) { /* nicht verfügbar */ } } }, { l: '~Paste', k: 'Ctrl+V', dis: true }, '-',
        { l: 'Select ~All', k: 'Ctrl+A', fn: selectAll }, '-', { l: '~Find (on This Page)...', k: 'Ctrl+F', dis: true }];
    },
    view: function () {
      const b = B.st.bars;
      return [
        { l: '~Toolbars', sub: [{ l: '~Standard Buttons', chk: b.std, fn: bar('std') }, { l: '~Address Bar', chk: b.addr, fn: bar('addr') }, { l: '~Links', chk: b.links, fn: bar('links') }, '-', { l: 'Lock the Tool~bars', chk: true, dis: true }, { l: '~Customize...', dis: true }] },
        { l: 'Status ~Bar', chk: b.status, fn: bar('status') },
        { l: '~Explorer Bar', sub: [{ l: '~Search', k: 'Ctrl+E', chk: B.xbar === 'search', fn: function () { toggleX('search'); } }, { l: '~Favorites', k: 'Ctrl+I', chk: B.xbar === 'favs', fn: function () { toggleX('favs'); } }, { l: '~History', k: 'Ctrl+H', chk: B.xbar === 'hist', fn: function () { toggleX('hist'); } }, '-', { l: 'Ti~p of the Day', dis: true }] },
        '-',
        { l: '~Go To', sub: [{ l: '~Back', k: 'Alt+Left Arrow', dis: !canBack(), fn: back }, { l: '~Forward', k: 'Alt+Right Arrow', dis: !canFwd(), fn: fwd }, '-', { l: '~Home Page', k: 'Alt+Home', fn: home }] },
        { l: 'Sto~p', k: 'Esc', fn: stopLoad }, { l: '~Refresh', k: 'F5', fn: refresh }, '-',
        { l: 'Te~xt Size', sub: sizeItems }, { l: 'Enco~ding', sub: [{ l: 'Auto-Select', dis: true }, '-', { l: 'Western European (ISO)', chk: true, radio: true }, { l: 'Western European (Windows)', dis: true }, { l: 'Central European (ISO)', dis: true }] }, '-',
        { l: 'S~ource', fn: viewSource }, { l: 'Pri~vacy Report...', dis: true }, { l: 'F~ull Screen', k: 'F11', fn: fullScreen }
      ];
    },
    favs: favItems,
    tools: function () {
      return [{ l: '~Mail and News', sub: [{ l: 'Read ~Mail', fn: mail }, { l: '~New Message...', dis: true }, { l: 'Send a ~Link...', dis: true }, { l: 'Read ~News', dis: true }] },
        { l: '~Synchronize...', dis: true }, { l: 'Windows ~Update', dis: true }, '-', { l: 'Show ~Related Links', dis: true }, '-', { l: 'Internet ~Options...', fn: options }];
    },
    help: function () {
      const T = PBS.Tutor;
      return [{ l: '~Contents and Index', fn: function () { if (B.hooks.handbook) B.hooks.handbook(); } }, { l: '~Tip of the Day', chk: T && T.enabled(), fn: function () { if (T) T.toggle(); } }, { l: '~Restart Tutorial', fn: function () { if (T) T.restart(); } }, { l: 'For ~Netscape Users', dis: true }, { l: 'Online ~Support', dis: true }, { l: 'Send Feedback', dis: true }, '-', { l: '~About PBS/Web', fn: about }];
    }
  };
  /* ---------- Dialoge (Windows 2000) ---------- */
  const Dlg = PBS.Dlg = {
    open: function (o) {
      closeMenus(0);
      const ov = document.createElement('div');
      ov.className = 'dlg-ov';
      const btns = o.buttons || [{ label: 'OK', def: true }];
      ov.innerHTML = '<div class="dlg' + (o.cls ? ' ' + o.cls : '') + '" role="dialog" aria-modal="true" aria-label="' + e(o.title) + '" style="width:' + (o.width || 420) + 'px">' +
        '<div class="dlg-tb"><span>' + (o.icon ? '<svg class="ico"><use href="#' + o.icon + '"/></svg> ' : '') + e(o.title) + '</span><button class="dlg-x" type="button" aria-label="Close">✕</button></div>' +
        '<div class="dlg-body">' + o.body + '</div>' + (btns.length ? '<div class="dlg-btns">' +
        btns.map(function (b, i) { return '<button type="button" class="btn' + (b.def ? ' def' : '') + '" data-i="' + i + '"' + (b.dis ? ' disabled' : '') + '>' + b.label + '</button>'; }).join('') + '</div>' : '') + '</div>';
      $('dlg-layer').appendChild(ov);
      let closed = false;
      const close = function () {
        if (closed) return;
        closed = true;
        ov.remove();
        if (o.onClose) o.onClose();
        if (Dlg.afterClose) Dlg.afterClose();
      };
      ov.querySelector('.dlg-x').onclick = function () { if (o.onX) o.onX(); close(); };
      ov.querySelectorAll('.dlg-btns .btn').forEach(function (b) {
        b.onclick = function () {
          const bd = btns[+b.dataset.i];
          if (bd.fn && bd.fn(ov) === false) return;
          close();
        };
      });
      ov.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && !o.noEsc) { ev.stopPropagation(); if (o.onX) o.onX(); close(); }
        if (ev.key === 'Enter' && ['TEXTAREA', 'BUTTON', 'SELECT', 'A'].indexOf(ev.target.tagName) < 0) {
          const d = ov.querySelector('.dlg-btns .btn.def');
          if (d && !d.disabled) { ev.preventDefault(); d.click(); }
        }
      });
      setTimeout(function () {
        const f = ov.querySelector('.dlg-body input:not([type=radio]):not([type=checkbox]):not([readonly]), .dlg-body select') || ov.querySelector('.dlg-btns .btn.def') || ov.querySelector('.dlg-btns .btn') || ov.querySelector('.dlg-x');
        if (f) f.focus();
      }, 0);
      if (o.sound && Snd[o.sound]) Snd[o.sound]();
      if (o.onOpen) o.onOpen(ov);
      return { el: ov, close: close };
    },
    msg: function (title, html, kind, onClose) {
      return Dlg.open({ title: title, sound: kind === 'err' ? 'chord' : kind === 'bigwarn' ? 'ding' : null, onClose: onClose,
        body: '<div class="dlg-msg"><svg class="ico32"><use href="#i-' + (kind || 'biginfo') + '"/></svg><div>' + html + '</div></div>' });
    },
    confirm: function (title, html, onYes, kind, yesLabel, noLabel) {
      return Dlg.open({
        title: title, sound: kind === 'bigwarn' ? 'ding' : null,
        body: '<div class="dlg-msg"><svg class="ico32"><use href="#i-' + (kind || 'ques') + '"/></svg><div>' + html + '</div></div>',
        buttons: [{ label: yesLabel || 'Yes', def: true, fn: function () { setTimeout(onYes, 0); } }, { label: noLabel || 'No' }]
      });
    },
    any: function () { return $('dlg-layer').children.length > 0; },
    closeAll: function () { $('dlg-layer').innerHTML = ''; }
  };

  function print() { closeMenus(0); window.print(); }
  function mail() { if (B.hooks.mail) B.hooks.mail(); }
  function selectAll() {
    const v = document.querySelector('#ie-view > .screen:not(.hidden)');
    if (!v) return;
    const r = document.createRange();
    r.selectNodeContents(v);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }
  function openDlg() {
    Dlg.open({
      title: 'Open', width: 400,
      body: '<div class="dlg-msg"><svg class="ico32"><use href="#d-net"/></svg><div>Type the Internet address of a document or folder, and Internet Explorer will open it for you.</div></div>' +
        '<table class="frm" style="margin-top:10px"><tr><th style="width:50px">Open:</th><td><input class="inp" id="open-url" style="width:100%" value="' + e(B.cur.url) + '"></td></tr></table>',
      buttons: [{ label: 'OK', def: true, fn: function (ov) { const u = ov.querySelector('#open-url').value; setTimeout(function () { openWin(); B.navigateUrl(u); }, 0); } }, { label: 'Cancel' }, { label: 'Browse...', dis: true }]
    });
  }
  function props() {
    const d = G.state ? U.fmtDate(G.state.date) : U.fmtDate('2003-03-03');
    const v = document.querySelector('#ie-view > .screen:not(.hidden)');
    const size = v ? v.innerHTML.length : 0;
    Dlg.open({
      title: 'Properties', width: 400, icon: 'i-page',
      body: '<div class="dlg-msg" style="margin-bottom:10px"><svg class="ico32"><use href="#d-pbs"/></svg><div><b>' + e(B.cur.title) + '</b></div></div>' +
        '<table class="kv dlgkv"><tr><th>Protocol:</th><td>HyperText Transfer Protocol</td></tr><tr><th>Type:</th><td>HTML Document</td></tr><tr><th>Connection:</th><td>Not Encrypted</td></tr>' +
        '<tr><th>Address (URL):</th><td style="word-break:break-all">' + e(B.cur.url) + '</td></tr><tr><th>Size:</th><td>' + U.fmt(size, 0) + ' bytes</td></tr><tr><th>Created:</th><td>' + d + '</td></tr><tr><th>Modified:</th><td>' + d + '</td></tr><tr><th>Zone:</th><td>Local intranet</td></tr></table>',
      buttons: [{ label: 'OK', def: true }, { label: 'Cancel' }, { label: 'Certificates', dis: true }]
    });
  }
  function about() {
    Dlg.open({
      title: 'About PBS/Web', width: 420,
      body: '<div class="dlg-msg"><svg class="ico32"><use href="#crest"/></svg><div><b>PBS/Web – Private Banking System</b><br>Release 4.2.1 (Build 2003-02-14)<br><br>© 1997–2003 Bankhaus Vogt &amp; Cie, Informatik / IT-Services<br>Server PBSPRD01 · AIX · DB2<br><br>This product is licensed to:<br>Bankhaus Vogt &amp; Cie, Zürich – Mandant 001<br><br><span class="small muted">A game. All persons, banks and companies are fictitious.</span></div></div>'
    });
  }
  // Quelltext im Editor
  function viewSource() {
    const v = document.querySelector('#ie-view > .screen:not(.hidden)');
    let html = v ? v.innerHTML : '';
    html = html.replace(/(<\/(div|tr|table|p|h1|h2|li|ul|form|thead|tbody)>)/g, '$1\n').replace(/\n{2,}/g, '\n');
    if (html.length > 60000) html = html.slice(0, 60000) + '\n<!-- … -->';
    const name = (B.cur.url.split('/').pop() || 'default').split('?')[0].replace(/\.\w+$/, '');
    const src = '<!-- PS 14.02.2003: Testmodul Fakturierung liegt noch unter /pbs/fakt.do – vor Go-live entfernen! -->\n<!-- PBS/Web 4.2.1 · generated ' + (G.state ? U.fmtDate(G.state.date) + ' ' + U.fmtTime(G.state.clock) : '') + ' · node PBSPRD01 -->\n<html>\n<head>\n<title>' + e(B.cur.title) + '</title>\n<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">\n<link rel="stylesheet" type="text/css" href="/pbs/css/pbs.css">\n<script language="JavaScript" src="/pbs/js/pbs.js"></' + 'script>\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
    PBS.WM.open('notepad', { text: src, name: name + '[1]' });
  }
  function fullScreen() { document.body.classList.toggle('full'); closeMenus(0); }

  /* ---------- Favoriten ---------- */
  function addFav() {
    if (!B.cur.hash) { Dlg.msg('Add Favorite', 'This page cannot be added to your Favorites.', 'bigwarn'); return; }
    Dlg.open({
      title: 'Add Favorite', width: 420,
      body: '<div class="dlg-msg"><svg class="ico32"><use href="#b-favs"/></svg><div>Internet Explorer will add this page to your Favorites list.<br><br><label><input type="checkbox" disabled> Make available offline</label></div></div>' +
        '<table class="frm" style="margin-top:8px"><tr><th style="width:60px">Name:</th><td><input class="inp" id="fav-n" style="width:100%" maxlength="60" value="' + e(B.cur.title) + '"></td></tr></table>',
      buttons: [{ label: 'OK', def: true, fn: function (ov) {
        const t = ov.querySelector('#fav-n').value.trim() || B.cur.title;
        B.st.favs = B.st.favs.filter(function (f) { return f.h !== B.cur.hash; }).concat([{ t: t, h: B.cur.hash }]).slice(-30);
        saveSt();
        if (B.xbar === 'favs') paintX();
      } }, { label: 'Cancel' }]
    });
  }
  function organizeFavs() {
    const body = function () {
      return '<p>To delete an item, select it and click Delete.</p><div class="orglist">' + (B.st.favs.length ? B.st.favs.map(function (f, i) {
        return '<label class="opt"><input type="radio" name="fav" value="' + i + '"' + (i === 0 ? ' checked' : '') + '> <svg class="ico"><use href="#i-page"/></svg> ' + e(f.t) + '</label>';
      }).join('') : '<span class="muted">No favorites yet.</span>') + '</div>';
    };
    Dlg.open({
      title: 'Organize Favorites', width: 420, body: body(),
      buttons: [{ label: 'Delete', fn: function (ov) {
        const r = ov.querySelector('input[name=fav]:checked');
        if (r) { B.st.favs.splice(+r.value, 1); saveSt(); if (B.xbar === 'favs') paintX(); }
        ov.querySelector('.dlg-body').innerHTML = body();
        return false;
      } }, { label: 'Close', def: true }]
    });
  }

  /* ---------- Internetoptionen ---------- */
  function options() {
    const st = JSON.parse(JSON.stringify(B.st));
    const chk = function (key, label) { return '<label class="adv"><input type="checkbox" data-o="' + key + '"' + (st[key] ? ' checked' : '') + '> ' + label + '</label>'; };
    const dead = function (on, label) { return '<label class="adv"><input type="checkbox" disabled' + (on ? ' checked' : '') + '> ' + label + '</label>'; };
    const panes = {
      gen: '<fieldset class="box"><legend>Home page</legend><div class="dlg-msg"><svg class="ico32"><use href="#b-home"/></svg><div>You can change which page to use for your home page.<br>Address: <input class="inp" style="width:250px" readonly value="' + e(BASE + 'overview.do') + '"><br><button class="btn sm" disabled>Use Current</button><button class="btn sm" disabled>Use Default</button><button class="btn sm" disabled>Use Blank</button></div></div></fieldset>' +
        '<fieldset class="box"><legend>Temporary Internet files</legend><div class="dlg-msg"><svg class="ico32"><use href="#d-docs"/></svg><div>Pages you view on the Internet are stored in a special folder for quick viewing later.<br><button class="btn sm" disabled>Delete Cookies...</button><button class="btn sm" data-x="tif">Delete Files...</button><button class="btn sm" disabled>Settings...</button></div></div></fieldset>' +
        '<fieldset class="box"><legend>History</legend><div class="dlg-msg"><svg class="ico32"><use href="#b-hist"/></svg><div>The History folder contains links to pages you\'ve visited, for quick access to recently viewed pages.<br>Days to keep pages in history: <input class="inp" size="3" value="20" readonly> <button class="btn sm" data-x="clearhist">Clear History</button></div></div></fieldset>' +
        '<div class="btnrow"><button class="btn sm" disabled>Colors...</button><button class="btn sm" disabled>Fonts...</button><button class="btn sm" disabled>Languages...</button><button class="btn sm" disabled>Accessibility...</button></div>',
      sec: '<p>Select a Web content zone to specify its security settings.</p><div class="zones"><span><svg class="ico32"><use href="#d-net"/></svg>Internet</span><span class="on"><svg class="ico32"><use href="#d-comp"/></svg>Local intranet</span><span><svg class="ico32"><use href="#i-check"/></svg>Trusted sites</span><span><svg class="ico32"><use href="#i-err"/></svg>Restricted sites</span></div>' +
        '<fieldset class="box"><legend>Local intranet</legend>This zone contains all Web sites that are on your organization\'s intranet.<br><br><b>Security level for this zone: Medium-low</b><br>– Appropriate for Web sites on your local network (intranet)<br>– Most content will be run without prompting you<br><br><span class="muted">These settings are managed by your system administrator (IT-Services, ext. 4411).</span></fieldset>',
      adv: '<div class="advlist"><div class="ag">Browsing</div>' + dead(true, 'Disable script debugging') + dead(false, 'Display a notification about every script error') + chk('delay', 'Enable page transitions') + dead(true, 'Notify when downloads complete') + dead(true, 'Show friendly HTTP error messages') + dead(true, 'Underline links: Always') +
        '<div class="ag">Multimedia</div>' + chk('anim', 'Play animations in web pages') + chk('sound', 'Play sounds in web pages') + dead(true, 'Show pictures') + dead(true, 'Smart image dithering') +
        '<div class="ag">Printing</div>' + dead(false, 'Print background colors and images') +
        '<div class="ag">Security</div>' + dead(true, 'Check for server certificate revocation') + dead(true, 'Warn if changing between secure and not secure mode') + '</div>',
      admin: '<div class="dlg-msg" style="margin-top:20px"><svg class="ico32"><use href="#i-bigwarn"/></svg><div>These settings have been restricted by your system administrator.<br>Please contact the Helpdesk (ext. 4411).</div></div>'
    };
    const tabs = [['gen', 'General'], ['sec', 'Security'], ['admin', 'Privacy'], ['admin', 'Content'], ['admin', 'Connections'], ['admin', 'Programs'], ['adv', 'Advanced']];
    const apply = function () { B.st.delay = st.delay; B.st.anim = st.anim; B.st.sound = st.sound; saveSt(); };
    Dlg.open({
      title: 'Internet Options', width: 440, cls: 'opts',
      body: '<div class="wtabs">' + tabs.map(function (t, i) { return '<span class="wtab' + (i === 0 ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</span>'; }).join('') + '</div><div class="wpane" id="opt-pane">' + panes.gen + '</div>',
      onOpen: function (ov) {
        ov.addEventListener('click', function (ev) {
          const t = ev.target.closest('.wtab');
          if (t) {
            ov.querySelectorAll('.wtab').forEach(function (x) { x.classList.toggle('on', x === t); });
            ov.querySelector('#opt-pane').innerHTML = panes[t.dataset.t];
            return;
          }
          const x = ev.target.closest('[data-x]');
          if (x && x.dataset.x === 'clearhist') {
            Dlg.confirm('Internet Options', 'Are you sure you want Internet Explorer to delete all items in your History folder?', function () { B.visited = []; B.typed = []; if (B.xbar === 'hist') paintX(); }, 'bigwarn', 'Yes', 'No');
          }
          if (x && x.dataset.x === 'tif') Dlg.msg('Delete Files', 'All Temporary Internet files have been deleted.');
        });
        ov.addEventListener('change', function (ev) {
          const k = ev.target.dataset && ev.target.dataset.o;
          if (k) st[k] = ev.target.checked;
        });
      },
      buttons: [{ label: 'OK', def: true, fn: apply }, { label: 'Cancel' }, { label: 'Apply', fn: function () { apply(); return false; } }]
    });
  }

  /* ---------- Explorer-Leiste ---------- */
  function showX(k) {
    B.xbar = k;
    $('ie-xbar').classList.remove('hidden');
    $('ie-xtitle').textContent = { search: 'Search', favs: 'Favorites', hist: 'History' }[k];
    document.querySelectorAll('[data-b=search],[data-b=favs],[data-b=hist]').forEach(function (b) { b.classList.toggle('on', b.dataset.b === k); });
    paintX();
    if (k === 'search') setTimeout(function () { const q = $('xs-q'); if (q) q.focus(); }, 0);
  }
  function closeX() {
    B.xbar = null;
    $('ie-xbar').classList.add('hidden');
    document.querySelectorAll('[data-b=search],[data-b=favs],[data-b=hist]').forEach(function (b) { b.classList.remove('on'); });
  }
  function toggleX(k) { if (B.xbar === k) closeX(); else showX(k); }
  function item(t, h, ico) { return '<a class="xi" href="' + e(h) + '" title="' + e(B.urlFor(h)) + '"><svg class="ico"><use href="#' + (ico || 'i-page') + '"/></svg><span>' + e(t) + '</span></a>'; }
  function paintX() {
    const x = $('ie-xbody');
    if (B.xbar === 'favs') {
      x.innerHTML = '<div class="xbtns"><button type="button" class="btn sm" data-b="favadd">Add...</button><button type="button" class="btn sm" data-b="favorg">Organize...</button></div>' +
        '<div class="xf"><svg class="ico"><use href="#i-folder"/></svg> Links</div><div class="xsub">' + LINKS.map(function (l) { return item(l[0], l[1]); }).join('') + '</div>' +
        B.st.favs.map(function (f) { return item(f.t, f.h); }).join('') + (B.st.favs.length ? '' : '<div class="xnote">Use <b>Add...</b> to store the current page.</div>');
    } else if (B.xbar === 'hist') {
      const hosts = {};
      B.visited.forEach(function (v) { const host = v.url.replace(/^https?:\/\//, '').split('/')[0]; (hosts[host] = hosts[host] || []).push(v); });
      x.innerHTML = '<div class="xbtns"><span>View ▾ By Date</span></div><div class="xf"><svg class="ico"><use href="#i-folder"/></svg> Today</div><div class="xsub">' +
        (Object.keys(hosts).length ? Object.keys(hosts).map(function (h) { return '<div class="xf"><svg class="ico"><use href="#i-intra"/></svg> ' + e(h.split('.')[0]) + ' (' + e(h) + ')</div><div class="xsub">' + hosts[h].map(function (v) { return item(v.title, v.hash); }).join('') + '</div>'; }).join('') : '<div class="xnote">No pages visited today.</div>') + '</div>';
    } else if (B.xbar === 'search') {
      x.innerHTML = '<form class="xs" id="xs-form"><b>Search the client book</b><p>Client number, codename or name:</p><input class="inp" id="xs-q" autocomplete="off"><div class="xbtns"><button type="submit" class="btn sm">Search</button></div></form><div id="xs-res"></div>' +
        '<div class="xnote">Other searches:<br><span class="muted">Intranet documents · Telephone directory</span><br>(not indexed)</div>';
    }
  }
  function runSearch(q) {
    const box = $('xs-res');
    if (!box) return;
    const res = B.hooks.search ? B.hooks.search(q) : null;
    if (typeof res === 'string') { box.innerHTML = '<div class="xnote">' + e(res) + '</div>'; return; }
    box.innerHTML = '<div class="xnote">' + (res && res.length ? res.length + ' match(es):' : 'Search is complete. There are no results to display.') + '</div>' + (res || []).slice(0, 30).map(function (r) { return item(r.t, r.h, 'i-user'); }).join('');
  }

  /* ---------- Lautstärke ---------- */
  function volPop() {
    if ($('volpop')) { closeMenus(0); return; }
    closeMenus(0);
    const p = document.createElement('div');
    p.id = 'volpop';
    p.className = 'volpop';
    p.innerHTML = '<div>Volume</div><input type="range" min="0" max="100" value="' + Math.round(B.st.vol * 100) + '" aria-label="Volume" orient="vertical"><label><input type="checkbox"' + (B.st.sound ? '' : ' checked') + '> Mute</label>';
    $('menu-layer').appendChild(p);
    p.querySelector('input[type=range]').addEventListener('input', function (ev) { B.st.vol = ev.target.value / 100; saveSt(); });
    p.querySelector('input[type=range]').addEventListener('change', function () { Snd.ding(); });
    p.querySelector('input[type=checkbox]').addEventListener('change', function (ev) { B.st.sound = !ev.target.checked; saveSt(); });
  }
  B.options = function () { options(); };
  B.toggleSound = function () { B.st.sound = !B.st.sound; saveSt(); };

  /* ---------- Uhr ---------- */
  function clock() {
    const c = B.hooks.clock ? B.hooks.clock() : null;
    const el = $('tb-clock');
    if (c) { el.textContent = c.text; el.title = c.tip; return; }
    const d = new Date();
    el.textContent = U.pad(d.getHours(), 2) + ':' + U.pad(d.getMinutes(), 2);
    el.title = d.toDateString();
  }
  B.paintClock = clock;

  /* ---------- Ereignisse ---------- */
  const BTN = {
    back: back, fwd: fwd, stop: stopLoad, refresh: refresh, home: home, print: print, mail: mail,
    search: function () { toggleX('search'); }, favs: function () { toggleX('favs'); }, hist: function () { toggleX('hist'); }, xclose: closeX,
    favadd: addFav, favorg: organizeFavs,
    backlist: function (el) {
      const r = el.getBoundingClientRect();
      const items = [];
      for (let i = B.idx - 1; i >= Math.max(0, B.idx - 9); i--) items.push({ l: B.hist[i].title, fn: travel.bind(null, i) });
      items.push('-', { l: '~History', k: 'Ctrl+H', fn: function () { showX('hist'); } });
      openMenu(items, r.left - 50, r.bottom, 0);
    },
    fwdlist: function (el) {
      const r = el.getBoundingClientRect();
      const items = [];
      for (let i = B.idx + 1; i < Math.min(B.hist.length, B.idx + 10); i++) items.push({ l: B.hist[i].title, fn: travel.bind(null, i) });
      openMenu(items, r.left - 30, r.bottom, 0);
    },
    typed: function () {
      const c = document.querySelector('.combo').getBoundingClientRect();
      const urls = B.typed.concat(B.visited.map(function (v) { return v.url; })).filter(function (u, i, a) { return a.indexOf(u) === i; }).slice(0, 12);
      if (!urls.length) return;
      openMenu(urls.map(function (u) { return { l: u, ico: 'i-page', fn: function () { B.navigateUrl(u); } }; }), c.left, c.bottom, 0, { cls: 'urls' });
      stack[0].el.style.width = c.width + 'px';
    },
    go: function () { B.navigateUrl($('ie-url').value); },
    vol: volPop
  };
  document.addEventListener('mousedown', function (ev) {
    if (!ev.target.closest('.wmenu, .mb, .start, #volpop, .tray-b, [data-b=backlist], [data-b=fwdlist], [data-b=typed]')) closeMenus(0);
  });
  document.addEventListener('click', function (ev) {
    const b = ev.target.closest('[data-b]');
    if (b && !b.disabled && BTN[b.dataset.b]) { ev.preventDefault(); BTN[b.dataset.b](b); return; }
    const l = ev.target.closest('.lnk[data-l]');
    if (l) { B.go(l.dataset.l); return; }
    const mb = ev.target.closest('.mb[data-m]');
    if (mb) { if (barOpen === mb.dataset.m) closeMenus(0); else openBar(mb.dataset.m); return; }
    const di = ev.target.closest('.dicon');
    document.querySelectorAll('.dicon.sel').forEach(function (x) { if (x !== di) x.classList.remove('sel'); });
    if (di) di.classList.add('sel');
  });
  document.addEventListener('mouseover', function (ev) {
    const mb = ev.target.closest && ev.target.closest('.mb[data-m]');
    if (mb && barOpen && barOpen !== mb.dataset.m) openBar(mb.dataset.m);
    const a = ev.target.closest && ev.target.closest('#ie-view a[href], #ie-xbar a[href]');
    if (a) { const h = a.getAttribute('href'); B.status(h.charAt(0) === '#' ? B.urlFor(h) : h); }
  });
  document.addEventListener('mouseout', function (ev) {
    const a = ev.target.closest && ev.target.closest('#ie-view a[href], #ie-xbar a[href]');
    if (a && (!ev.relatedTarget || !a.contains(ev.relatedTarget))) B.status('');
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.target.id === 'ie-url') {
      if (ev.key === 'Enter') { ev.preventDefault(); B.navigateUrl(ev.target.value); ev.target.blur(); return; }
      if (ev.key === 'Escape') { ev.target.value = B.cur.url; ev.target.select(); return; }
    }
    if (Dlg.any()) return;
    if (ev.key === 'Escape' && stack.length) { closeMenus(0); return; }
    if (PBS.WM && PBS.WM.focused && PBS.WM.focused !== 'ie') return;
    const k = ev.key;
    if (k === 'F5') { ev.preventDefault(); refresh(); } else if (k === 'F11') { ev.preventDefault(); fullScreen(); } else if (ev.altKey && k === 'ArrowLeft') { ev.preventDefault(); back(); } else if (ev.altKey && k === 'ArrowRight') { ev.preventDefault(); fwd(); } else if (ev.altKey && k === 'Home') { ev.preventDefault(); home(); } else if (ev.altKey && (k === 'd' || k === 'D')) { ev.preventDefault(); $('ie-url').focus(); $('ie-url').select(); } else if (ev.ctrlKey && !ev.shiftKey) {
      const m = { e: 'search', i: 'favs', h: 'hist' }[k.toLowerCase()];
      if (m) { ev.preventDefault(); toggleX(m); } else if (k.toLowerCase() === 'o') { ev.preventDefault(); openDlg(); } else if (k.toLowerCase() === 'p') { ev.preventDefault(); print(); }
    }
  });
  document.addEventListener('submit', function (ev) {
    if (ev.target.id !== 'xs-form') return;
    ev.preventDefault();
    runSearch($('xs-q').value.trim());
  });
  // Wie im IE: ein Klick in die Adressleiste markiert die ganze Adresse sofort
  let urlFocus = false;
  $('ie-url').addEventListener('focus', function () { $('ie-url').select(); urlFocus = true; });
  $('ie-url').addEventListener('mouseup', function (ev) { if (urlFocus) { ev.preventDefault(); urlFocus = false; } });
  $('ie-url').addEventListener('blur', function () { urlFocus = false; });

  B.init = function (hooks) {
    B.hooks = hooks || {};
    applySt();
    paintNav();
    clock();
    setInterval(clock, 1000);
  };
})(window.PBS);
