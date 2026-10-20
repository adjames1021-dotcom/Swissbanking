/* Fenster- und Arbeitsplatzverwaltung (Windows 2000): mehrere Fenster, Z-Reihenfolge, Fokus,
   Verschieben und Grössenänderung, Taskleiste, Startmenü, Desktopsymbole. Das Browserfenster (#ie)
   wird als vorhandenes Fenster übernommen. Programme kommen aus PBS.Apps. */
(function (PBS) {
  'use strict';

  const U = PBS.U, FS = PBS.FS, Snd = PBS.Sound;
  const e = U.esc;
  function $(id) { return document.getElementById(id); }
  const TASKBAR = 28;

  const WM = PBS.WM = { wins: {}, order: [], focused: null, seq: 0, z: 20, hooks: {} };

  function desk() { return { w: innerWidth, h: innerHeight - TASKBAR }; }

  /* ---------- Fenster erzeugen ---------- */
  WM.open = function (appId, arg) {
    const def = PBS.Apps && PBS.Apps.defs[appId];
    if (!def) return null;
    if (def.singleton) {
      const ex = Object.keys(WM.wins).find(function (id) { return WM.wins[id].appId === appId; });
      if (ex) { if (WM.wins[ex].state === 'min') restore(ex); focus(ex); if (def.reopen) def.reopen(WM.wins[ex], arg); return WM.wins[ex]; }
    }
    const id = 'win' + (++WM.seq);
    const w = Math.min(def.w || 520, desk().w - 20), h = Math.min(def.h || 380, desk().h - 10);
    const n = (WM.order.length) % 8;
    const win = { id: id, appId: appId, title: def.title, icon: def.icon || 'i-page', resizable: def.resizable !== false, minW: def.minW || 220, minH: def.minH || 140,
      state: 'normal', rect: { x: 40 + n * 22, y: 24 + n * 22, w: w, h: h }, onClose: def.onClose, onKey: null, menus: null, data: {} };
    buildFrame(win);
    WM.wins[id] = win;
    WM.order.push(id);
    document.body.classList.remove('nowins');
    apply(win);
    $('windows').appendChild(win.el);
    if (def.open) def.open(win, arg);
    focus(id);
    paintTasks();
    Snd.click();
    return win;
  };

  function buildFrame(win) {
    const el = document.createElement('div');
    el.className = 'oswin';
    el.id = win.id;
    el.innerHTML =
      '<div class="os-tb"><svg class="ico"><use href="#' + win.icon + '"/></svg><span class="os-title"></span>' +
      '<span class="os-wbtns"><button type="button" class="wb" data-w="min" aria-label="Minimize"><i class="g-min"></i></button>' +
      '<button type="button" class="wb" data-w="max" aria-label="Maximize"><i class="g-max"></i></button>' +
      '<button type="button" class="wb wx" data-w="close" aria-label="Close"><i class="g-x"></i></button></span></div>' +
      '<div class="os-menubar" hidden></div><div class="os-body"></div>' +
      ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(function (d) { return '<i class="os-rz r-' + d + '" data-rz="' + d + '"></i>'; }).join('');
    win.el = el;
    win.body = el.querySelector('.os-body');
    win.titleEl = el.querySelector('.os-title');
    win.menubar = el.querySelector('.os-menubar');
    setTitle(win.id, win.title);
    el.querySelector('.os-tb').addEventListener('mousedown', function (ev) { startMove(win, ev); });
    el.querySelector('.os-tb').addEventListener('dblclick', function (ev) { if (!ev.target.closest('.wb')) toggleMax(win.id); });
    el.querySelectorAll('.os-wbtns .wb').forEach(function (b) {
      b.addEventListener('click', function () { const a = b.dataset.w; if (a === 'min') minimize(win.id); else if (a === 'max') toggleMax(win.id); else WM.close(win.id); });
    });
    el.querySelectorAll('.os-rz').forEach(function (h) { h.addEventListener('mousedown', function (ev) { startResize(win, h.dataset.rz, ev); }); });
    el.addEventListener('mousedown', function () { focus(win.id); }, true);
    if (!win.resizable) el.classList.add('fixed');
  }

  // Menüleiste eines Programms: [{l:'File', items(){...}}]
  WM.menubar = function (win, defs) {
    win.menus = defs;
    const mb = win.menubar;
    mb.hidden = !defs || !defs.length;
    mb.innerHTML = (defs || []).map(function (m, i) { return '<span class="mb" data-mi="' + i + '">' + lbl(m.l) + '</span>'; }).join('');
    let open = -1;
    const openAt = function (i) {
      PBS.closeMenus(0);
      open = i;
      mb.querySelectorAll('.mb').forEach(function (x, j) { x.classList.toggle('on', j === i); });
      const sp = mb.querySelectorAll('.mb')[i];
      const r = sp.getBoundingClientRect();
      PBS.menu(defs[i].items(win), r.left, r.bottom, 0, { onClose: function () { open = -1; sp.classList.remove('on'); } });
    };
    mb.onclick = function (ev) { const sp = ev.target.closest('.mb'); if (!sp) return; const i = +sp.dataset.mi; if (open === i) { PBS.closeMenus(0); open = -1; } else openAt(i); };
    mb.onmouseover = function (ev) { const sp = ev.target.closest('.mb'); if (sp && open >= 0 && +sp.dataset.mi !== open) openAt(+sp.dataset.mi); };
  };
  function lbl(l) { return e(l).replace(/~(.)/, '<u>$1</u>'); }

  function setTitle(id, t) {
    const win = WM.wins[id] || (id === 'ie' ? ieWin : null);
    if (!win) return;
    win.title = t;
    if (win.titleEl) win.titleEl.textContent = t;
    paintTasks();
  }
  WM.setTitle = setTitle;
  WM.setBodyIcon = function (id, icon) { const w = WM.wins[id]; if (w) { w.icon = icon; w.el.querySelector('.os-tb .ico use').setAttribute('href', '#' + icon); paintTasks(); } };

  /* ---------- Geometrie ---------- */
  function apply(win) {
    const el = win.el;
    if (win.state === 'min') { el.style.display = 'none'; return; }
    el.style.display = '';
    if (win.state === 'max') {
      el.classList.add('max');
      el.style.left = '0'; el.style.top = '0'; el.style.width = desk().w + 'px'; el.style.height = desk().h + 'px';
    } else {
      el.classList.remove('max');
      const r = win.rect;
      el.style.left = Math.round(r.x) + 'px'; el.style.top = Math.round(r.y) + 'px';
      el.style.width = Math.round(r.w) + 'px'; el.style.height = Math.round(r.h) + 'px';
    }
    el.querySelector('.os-wbtns [data-w=max] i').className = win.state === 'max' ? 'g-res' : 'g-max';
  }
  function minimize(id) { const w = win(id); if (!w) return; w.state = 'min'; frame(w).style.display = 'none'; if (WM.focused === id) focusNext(id); paintTasks(); }
  function toggleMax(id) { const w = win(id); if (!w || w.resizable === false) return; w.state = w.state === 'max' ? 'normal' : 'max'; applyAny(w); focus(id); }
  function restore(id) { const w = win(id); if (!w) return; w.state = w.state === 'min' ? (w.lastState || 'normal') : w.state; applyAny(w); }
  WM.min = minimize; WM.max = toggleMax; WM.restore = restore;

  function startMove(win, ev) {
    if (ev.button !== 0 || win.state === 'max' || ev.target.closest('.wb')) return;
    focus(win.id);
    ev.preventDefault();
    const el = frame(win);
    const sx = ev.clientX, sy = ev.clientY, ox = parseFloat(el.style.left) || 0, oy = parseFloat(el.style.top) || 0;
    const mv = function (m) {
      const x = U.clamp(ox + m.clientX - sx, -el.offsetWidth + 90, desk().w - 60);
      const y = U.clamp(oy + m.clientY - sy, 0, desk().h - 24);
      el.style.left = x + 'px'; el.style.top = y + 'px';
      if (win.rect) { win.rect.x = x; win.rect.y = y; }
    };
    const up = function () { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }
  function startResize(win, dir, ev) {
    if (ev.button !== 0) return;
    focus(win.id);
    ev.preventDefault(); ev.stopPropagation();
    const el = frame(win);
    const sx = ev.clientX, sy = ev.clientY;
    const r = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0, w: el.offsetWidth, h: el.offsetHeight };
    const minW = win.minW || 220, minH = win.minH || 140;
    const mv = function (m) {
      let x = r.x, y = r.y, w = r.w, h = r.h;
      const dx = m.clientX - sx, dy = m.clientY - sy;
      if (dir.indexOf('e') >= 0) w = Math.max(minW, r.w + dx);
      if (dir.indexOf('s') >= 0) h = Math.max(minH, r.h + dy);
      if (dir.indexOf('w') >= 0) { w = Math.max(minW, r.w - dx); x = r.x + (r.w - w); }
      if (dir.indexOf('n') >= 0) { h = Math.max(minH, r.h - dy); y = r.y + (r.h - h); }
      el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px';
      if (win.rect) win.rect = { x: x, y: y, w: w, h: h };
      if (win.onResize) win.onResize(win);
    };
    const up = function () { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }

  /* ---------- Fokus / Z-Reihenfolge ---------- */
  function focus(id) {
    const w = win(id);
    if (!w) return;
    if (w.state === 'min') restore(id);
    WM.focused = id;
    WM.order = WM.order.filter(function (x) { return x !== id; });
    WM.order.push(id);
    WM.order.forEach(function (x, i) { frame(win(x)).style.zIndex = 20 + i; });
    document.querySelectorAll('.oswin.focused, #ie.focused').forEach(function (el) { el.classList.remove('focused'); });
    frame(w).classList.add('focused');
    paintTasks();
  }
  WM.focus = focus;
  function focusNext(skip) {
    const vis = WM.order.filter(function (x) { return x !== skip && win(x).state !== 'min'; });
    if (vis.length) focus(vis[vis.length - 1]); else { WM.focused = null; paintTasks(); }
  }

  WM.close = function (id) {
    const w = win(id);
    if (!w) return;
    if (id === 'ie') { if (ieWin.onClose) ieWin.onClose(); ieVisible = false; frame(w).style.display = 'none'; WM.order = WM.order.filter(function (x) { return x !== id; }); if (WM.focused === id) focusNext(id); paintTasks(); return; }
    if (w.onClose && w.onClose(w) === false) return;
    frame(w).remove();
    delete WM.wins[id];
    WM.order = WM.order.filter(function (x) { return x !== id; });
    if (WM.focused === id) focusNext(id);
    document.body.classList.toggle('nowins', !Object.keys(WM.wins).length && !ieVisible);
    paintTasks();
  };

  /* ---------- Browserfenster (#ie) übernehmen ---------- */
  let ieWin = null, ieVisible = false;
  WM.adoptIE = function (hooks) {
    const el = $('ie');
    el.classList.add('oswin');
    el.classList.remove('win', 'max', 'restored');
    ieWin = { id: 'ie', appId: 'ie', title: 'PBS/Web', icon: 'i-page', el: el, resizable: true, minW: 640, minH: 360, state: 'max', rect: { x: 60, y: 30, w: Math.min(1000, desk().w - 80), h: Math.min(720, desk().h - 40) }, onClose: hooks.onClose };
    ieWin.titleEl = $('ie-title');
    // Vorhandene Titelleistenknöpfe weiterverwenden
    el.querySelectorAll('.ie-tb .wb').forEach(function (b) {
      b.onclick = function () { const a = b.dataset.b; if (a === 'min') minimize('ie'); else if (a === 'max') toggleMax('ie'); else WM.close('ie'); };
    });
    $('ie-tb').addEventListener('mousedown', function (ev) { startMove(ieWin, ev); });
    $('ie-tb').addEventListener('dblclick', function (ev) { if (!ev.target.closest('.wbtns')) toggleMax('ie'); });
    el.addEventListener('mousedown', function () { focus('ie'); }, true);
    // Griffe für die Grössenänderung einhängen
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (d) {
      const h = document.createElement('i');
      h.className = 'os-rz r-' + d;
      h.dataset.rz = d;
      h.addEventListener('mousedown', function (ev) { startResize(ieWin, d, ev); });
      el.appendChild(h);
    });
    ieVisible = true;
    WM.wins.ie = ieWin;
    if (WM.order.indexOf('ie') < 0) WM.order.unshift('ie');
    applyAny(ieWin);
  };
  WM.showIE = function () {
    ieVisible = true;
    ieWin.el.style.display = '';
    if (ieWin.state === 'min') ieWin.state = ieWin.lastState || 'max';
    if (WM.order.indexOf('ie') < 0) WM.order.push('ie');
    document.body.classList.remove('nowins');
    applyAny(ieWin);
    focus('ie');
    paintTasks();
  };
  WM.ieState = function () { return ieVisible ? ieWin.state : 'closed'; };

  function applyAny(w) {
    if (w.state !== 'min') { w.lastState = w.state === 'max' ? 'max' : 'normal'; }
    if (w.id === 'ie') {
      const el = w.el;
      if (w.state === 'min' || !ieVisible) { el.style.display = 'none'; }
      else { el.style.display = ''; el.classList.toggle('max', w.state === 'max');
        if (w.state === 'max') { el.style.left = '0'; el.style.top = '0'; el.style.width = desk().w + 'px'; el.style.height = desk().h + 'px'; }
        else { el.style.left = w.rect.x + 'px'; el.style.top = w.rect.y + 'px'; el.style.width = w.rect.w + 'px'; el.style.height = w.rect.h + 'px'; }
        el.querySelector('.ie-tb [data-b=max] i').className = w.state === 'max' ? 'g-res' : 'g-max';
      }
    } else apply(w);
  }

  function win(id) { return WM.wins[id]; }
  function frame(w) { return w.el; }

  /* ---------- Taskleiste ---------- */
  function paintTasks() {
    const t = $('tb-tasks');
    if (!t) return;
    t.innerHTML = WM.order.filter(function (id) { return id !== 'ie' || ieVisible; }).map(function (id) {
      const w = win(id);
      const on = WM.focused === id && w.state !== 'min';
      const title = (typeof w.title === 'string' ? w.title : 'Window') + (id === 'ie' ? ' - Microsoft Internet Explorer' : '');
      return '<button type="button" class="task' + (on ? ' on' : '') + '" data-task="' + id + '" title="' + e(title) + '"><svg class="ico"><use href="#' + w.icon + '"/></svg><span>' + e(title) + '</span></button>';
    }).join('');
  }
  WM.paintTasks = paintTasks;

  /* ---------- Desktopsymbole ---------- */
  const SPECIAL = [
    { d: 'comp', icon: 'd-comp', label: 'My Computer' },
    { d: 'docs', icon: 'd-docs', label: 'My Documents' },
    { d: 'net', icon: 'd-net', label: 'Internet Explorer' },
    { d: 'bin', icon: 'd-recycle', label: 'Recycle Bin' },
    { d: 'pbs', icon: 'd-pbs', label: 'PBS/Web (Intranet)' }
  ];
  WM.paintDesktop = function () {
    const box = $('dicons');
    if (!box) return;
    let html = SPECIAL.map(function (s) {
      const lab = s.d === 'bin' ? 'Recycle Bin' + (FS.binCount() ? ' (' + FS.binCount() + ')' : '') : s.label;
      return '<div class="dicon" data-d="' + s.d + '" tabindex="0"><svg><use href="#' + (s.d === 'bin' && FS.binCount() ? 'd-recycle' : s.icon) + '"/></svg><span>' + e(lab) + '</span></div>';
    }).join('');
    // Dateien auf dem Desktop
    const dp = FS.specialPaths().desktop;
    FS.list(dp).forEach(function (f) {
      html += '<div class="dicon" data-path="' + e(FS.join(f.path)) + '" tabindex="0"><svg><use href="#' + iconFor(f) + '"/></svg><span>' + e(f.name) + '</span></div>';
    });
    box.innerHTML = html;
  };
  function iconFor(f) {
    if (f.type === 'dir') return 'i-folder';
    if (f.icon) return f.icon;
    return { text: 'i-doc', doc: 'i-doc', xls: 'i-doc', image: 'i-page', url: 'i-globe', html: 'i-page', exe: 'i-go', lnk: 'i-go' }[f.mime] || 'i-doc';
  }
  WM.iconFor = iconFor;

  /* ---------- Datei öffnen (Zuordnung) ---------- */
  WM.openPath = function (path) {
    const info = FS.info(path);
    if (!info) { PBS.Dlg.msg('Error', 'Cannot find \'' + e(FS.join(FS.parse(path))) + '\'. Make sure the path is correct.', 'err'); return; }
    if (info.type === 'dir') { WM.open('explorer', { path: info.path }); return; }
    if (info.node.app) { launchApp(info.node.app); return; }
    if (info.mime === 'url' || info.mime === 'lnk') {
      const target = info.node.target || FS.read(path);
      if (/^#?\//.test(target) || /\.(do|htm|html)/i.test(target) || /:\/\//.test(target)) { if (WM.hooks.navigate) WM.hooks.navigate(target); }
      else WM.openPath(target);
      return;
    }
    if (info.mime === 'image') { WM.open('viewer', { path: info.path }); return; }
    WM.open('notepad', { path: info.path });
  };
  function launchApp(app) {
    if (app === 'ie' || app === 'pbs') { WM.showIE(); if (app === 'pbs' && WM.hooks.home) WM.hooks.home(); return; }
    WM.open(app);
  }
  WM.launchApp = launchApp;

  /* ---------- Startmenü ---------- */
  function startMenu() {
    const docsRecent = FS.list(FS.specialPaths().documents).filter(function (f) { return f.type === 'file'; }).slice(0, 6)
      .map(function (f) { return { l: f.name, ico: iconFor(f), fn: function () { WM.openPath(f.path); } }; });
    const progs = [
      { l: 'Accessories', ico: 'i-folder', sub: [
        { l: 'Calculator', ico: 'd-calc', fn: function () { WM.open('calc'); } },
        { l: 'Command Prompt', ico: 'd-cmd', fn: function () { WM.open('cmd'); } },
        { l: 'Notepad', ico: 'i-doc', fn: function () { WM.open('notepad'); } },
        { l: 'Paint', ico: 'd-paint', fn: function () { WM.open('paint'); } },
        { l: 'Windows Explorer', ico: 'd-docs', fn: function () { WM.open('explorer'); } } ] },
      { l: 'Games', ico: 'i-folder', sub: [
        { l: 'Minesweeper', ico: 'd-mine', fn: function () { WM.open('mine'); } },
        { l: 'Solitaire', ico: 'd-sol', fn: function () { WM.open('sol'); } } ] },
      '-',
      { l: 'Internet Explorer', ico: 'i-globe', fn: function () { launchApp('ie'); } },
      { l: 'PBS/Web (Intranet)', ico: 'd-pbs', fn: function () { launchApp('pbs'); } },
      { l: 'Lotus Notes', ico: 'i-mail', dis: true },
      { l: 'Telekurs Investdata', ico: 'i-chart', dis: true }
    ];
    const user = (PBS.Game.state && WM.hooks.loggedIn && WM.hooks.loggedIn()) ? PBS.Game.state.user.id : 'E10001';
    return [
      { l: 'Windows Update', ico: 'i-globe', dis: true }, '-',
      { l: '~Programs', ico: 'i-folder', big: true, sub: progs },
      { l: '~Documents', ico: 'i-folder', big: true, sub: docsRecent.length ? docsRecent.concat(['-', { l: 'My Documents', ico: 'd-docs', fn: function () { WM.open('explorer', { path: FS.specialPaths().documents }); } }]) : [{ l: 'My Documents', ico: 'd-docs', fn: function () { WM.open('explorer', { path: FS.specialPaths().documents }); } }] },
      { l: '~Settings', ico: 'i-list', big: true, sub: [{ l: '~Control Panel', ico: 'd-control', fn: function () { WM.open('control'); } }, { l: '~Network and Dial-up Connections', dis: true }, { l: '~Printers', dis: true }, { l: '~Taskbar & Start Menu...', dis: true }] },
      { l: 'S~earch', ico: 'i-search', big: true, sub: [{ l: 'For ~Files or Folders...', fn: function () { WM.open('explorer'); } }, { l: 'On the ~Internet...', fn: function () { launchApp('ie'); if (WM.hooks.navigate) WM.hooks.navigate('http://www.find.ch/'); } } ] },
      { l: '~Help', ico: 'i-info', big: true, fn: function () { if (WM.hooks.help) WM.hooks.help(); } },
      { l: '~Run...', ico: 'i-go', big: true, fn: runDlg }, '-',
      { l: '~Log Off ' + user + '...', ico: 'i-key', big: true, fn: function () { if (WM.hooks.logoff) WM.hooks.logoff(); } },
      { l: 'Sh~ut Down...', ico: 'i-lock', big: true, fn: shutDown }
    ];
  }
  function runDlg() {
    PBS.Dlg.open({
      title: 'Run', width: 400, icon: 'i-go',
      body: '<div class="dlg-msg"><svg class="ico32"><use href="#i-go"/></svg><div>Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</div></div>' +
        '<table class="frm" style="margin-top:10px"><tr><th style="width:40px">Open:</th><td><input class="inp" id="run-c" style="width:100%" value=""></td></tr></table>',
      buttons: [{ label: 'OK', def: true, fn: function (ov) { run(ov.querySelector('#run-c').value.trim()); } }, { label: 'Cancel' }, { label: 'Browse...', dis: true }]
    });
  }
  const RUN = { calc: 'calc', notepad: 'notepad', 'notepad.exe': 'notepad', write: 'notepad', mspaint: 'paint', 'pbrush': 'paint', cmd: 'cmd', command: 'cmd', explorer: 'explorer', winmine: 'mine', sol: 'sol', control: 'control', iexplore: 'ie' };
  function run(c) {
    if (!c) return;
    const low = c.toLowerCase();
    if (RUN[low]) { launchApp(RUN[low]); return; }
    if (/:\/\/|\.(com|ch|org|net|intra)(\/|$)/i.test(c) || low.indexOf('www.') === 0) { launchApp('ie'); if (WM.hooks.navigate) WM.hooks.navigate(c); return; }
    if (FS.exists(c)) { WM.openPath(c); return; }
    PBS.Dlg.msg('Run', 'Windows cannot find \'' + e(c) + '\'. Make sure you typed the name correctly, and then try again.', 'err');
  }
  function shutDown() {
    PBS.Dlg.open({
      title: 'Shut Down Windows', width: 400, icon: 'd-comp',
      body: '<div class="dlg-msg"><svg class="ico32"><use href="#d-comp"/></svg><div>What do you want the computer to do?<br><br><select class="inp" id="sd-what" style="width:100%"><option value="logoff">Log off ' + e((PBS.Game.state ? PBS.Game.state.user.id : 'user')) + '</option><option value="shut">Shut down</option><option value="restart">Restart</option></select><div class="small muted" id="sd-desc" style="margin-top:6px">Ends your session so another user can log on.</div></div></div>',
      onOpen: function (ov) { const s = ov.querySelector('#sd-what'), d = ov.querySelector('#sd-desc'); s.onchange = function () { d.textContent = { logoff: 'Ends your session so another user can log on.', shut: 'Saves your work and prepares the computer to be turned off.', restart: 'Closes all programs and restarts the computer.' }[s.value]; }; },
      buttons: [{ label: 'OK', def: true, fn: function (ov) { const v = ov.querySelector('#sd-what').value; setTimeout(function () { if (v === 'logoff' && WM.hooks.logoff) WM.hooks.logoff(); else if (WM.hooks.shutdown) WM.hooks.shutdown(v); }, 0); } }, { label: 'Cancel' }, { label: 'Help', dis: true }]
    });
  }
  WM.closeAllApps = function () { Object.keys(WM.wins).forEach(function (id) { if (id !== 'ie') { const w = WM.wins[id]; if (w.el) w.el.remove(); delete WM.wins[id]; } }); WM.order = WM.order.filter(function (id) { return id === 'ie'; }); paintTasks(); };

  /* ---------- Ereignisse ---------- */
  document.addEventListener('mousedown', function (ev) {
    if (!ev.target.closest('.wmenu, .mb, .start, #volpop, .tray-b, [data-b=backlist], [data-b=fwdlist], [data-b=typed], .os-menubar')) PBS.closeMenus(0);
  });
  // Taskleiste und Start
  document.addEventListener('click', function (ev) {
    const start = ev.target.closest('.start');
    if (start) {
      ev.preventDefault();
      if (start.classList.contains('on')) { PBS.closeMenus(0); return; }
      PBS.closeMenus(0); start.classList.add('on');
      const r = start.getBoundingClientRect();
      PBS.menu(startMenu, r.left, r.top + 1, 0, { up: true, banner: '<b>Vogt &amp; Cie</b> Workstation', cls: 'startm', onClose: function () { start.classList.remove('on'); } });
      return;
    }
    const task = ev.target.closest('[data-task]');
    if (task) { const id = task.dataset.task; const w = win(id); if (!w) return; if (WM.focused === id && w.state !== 'min') minimize(id); else { if (w.state === 'min') { if (id === 'ie') WM.showIE(); else restore(id); } focus(id); } return; }
    const ql = ev.target.closest('[data-ql]');
    if (ql) {
      const k = ql.dataset.ql;
      if (k === 'desk') showDesktop();
      else if (k === 'ie') launchApp('ie');
      return;
    }
  });
  document.addEventListener('dblclick', function (ev) {
    const di = ev.target.closest('.dicon');
    if (!di) return;
    if (di.dataset.path) { WM.openPath(di.dataset.path); return; }
    const d = di.dataset.d;
    if (d === 'comp') WM.open('explorer', { path: ['My Computer'] });
    else if (d === 'docs') WM.open('explorer', { path: FS.specialPaths().documents });
    else if (d === 'bin') WM.open('explorer', { path: ['Recycled'] });
    else if (d === 'net') launchApp('ie');
    else if (d === 'pbs') launchApp('pbs');
  });
  document.addEventListener('click', function (ev) {
    const di = ev.target.closest('.dicon');
    document.querySelectorAll('.dicon.sel').forEach(function (x) { if (x !== di) x.classList.remove('sel'); });
    if (di) di.classList.add('sel');
    else if (ev.target.id === 'desktop' || ev.target.id === 'dicons') { /* leerer Desktop */ }
  });
  // Rechtsklick: einfaches Kontextmenü auf dem Desktop
  document.addEventListener('contextmenu', function (ev) {
    if (ev.target.closest('.oswin, #ie, #taskbar, .wmenu, .dlg-ov')) return;
    if (ev.target.closest('#desktop')) {
      ev.preventDefault();
      PBS.menu([
        { l: 'Refresh', fn: function () { WM.paintDesktop(); } }, '-',
        { l: 'New', sub: [{ l: 'Folder', ico: 'i-folder', fn: function () { newDesktop('dir'); } }, { l: 'Text Document', ico: 'i-doc', fn: function () { newDesktop('txt'); } }] }, '-',
        { l: 'Properties', fn: function () { WM.open('control', { tab: 'display' }); } }
      ], ev.clientX, ev.clientY, 0);
    }
  });
  function newDesktop(kind) {
    const dp = FS.specialPaths().desktop;
    let name = kind === 'dir' ? 'New Folder' : 'New Text Document.txt', i = 2;
    while (FS.exists(dp.concat([name]))) name = (kind === 'dir' ? 'New Folder (' + i + ')' : 'New Text Document (' + i + ').txt'), i++;
    if (kind === 'dir') FS.mkdir(dp.concat([name])); else FS.write(dp.concat([name]), '');
    WM.paintDesktop();
  }
  function showDesktop() {
    const anyVisible = WM.order.some(function (id) { return win(id).state !== 'min'; });
    if (anyVisible) { WM.order.forEach(function (id) { const w = win(id); if (w.state !== 'min') { w._pre = w.state; minimize(id); } }); }
    else { WM.order.forEach(function (id) { const w = win(id); if (w._pre) { if (id === 'ie') WM.showIE(); else restore(id); w._pre = null; } }); }
  }
  WM.showDesktop = showDesktop;

  window.addEventListener('resize', function () { Object.keys(WM.wins).forEach(function (id) { const w = WM.wins[id]; if (w.state === 'max') applyAny(w); }); });

  WM.init = function (hooks) {
    WM.hooks = hooks || {};
    FS.init();
    WM.paintDesktop();
    WM.adoptIE(hooks);
    paintTasks();
  };
})(window.PBS);
