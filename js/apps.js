/* Programme des Arbeitsplatzes, Teil 1: Anzeige-Einstellungen (Hintergrund, Farbschema, Bildschirmschoner),
   Dateidialoge, Explorer (Arbeitsplatz, Ordner, Papierkorb, Systemsteuerung), Editor, Bildvorschau
   und die Anzeige lokaler Dateien im Browser (file://). Weitere Programme in apps2.js und games.js. */
(function (PBS) {
  'use strict';

  const G = PBS.Game, U = PBS.U, FS = PBS.FS, Snd = PBS.Sound;
  const e = U.esc;
  const tr = PBS.L.t;
  const A = PBS.Apps = { defs: {}, clip: null };
  function WM() { return PBS.WM; }
  function Dlg() { return PBS.Dlg; }
  function today() { return G.state ? G.state.date : '2003-03-03'; }

  /* ================= Anzeige-Einstellungen ================= */
  const OSKEY = 'pbs-vogt-os';
  A.st = { wall: 'none', mode: 'center', color: '#3a6ea5', scheme: 'standard', saver: 'marquee', wait: 15, marquee: 'Bankhaus Vogt & Cie', custom: null };
  try { Object.assign(A.st, JSON.parse(localStorage.getItem(OSKEY) || '{}')); } catch (x) { /* Standardwerte */ }
  A.saveSt = function () { try { localStorage.setItem(OSKEY, JSON.stringify(A.st)); } catch (x) { /* voll */ } A.applySt(); };

  const SCHEMES = {
    standard: { label: 'Windows Standard', tb1: '#0a246a', tb2: '#a6caf0', tbi1: '#808080', tbi2: '#c0c0c0', win: '#d4d0c8', hilite: '#0a246a' },
    brick: { label: 'Brick', tb1: '#800000', tb2: '#c08060', tbi1: '#a09080', tbi2: '#d0c0b0', win: '#c2bfa5', hilite: '#800000' },
    desert: { label: 'Desert', tb1: '#008080', tb2: '#60b0b0', tbi1: '#a29070', tbi2: '#d0c0a0', win: '#d5ccbb', hilite: '#008080' },
    marine: { label: 'Marine (high color)', tb1: '#000080', tb2: '#4080c0', tbi1: '#808080', tbi2: '#b0b0b0', win: '#c6c6c6', hilite: '#000080' },
    rainy: { label: 'Rainy Day', tb1: '#4f6582', tb2: '#7a9ac1', tbi1: '#808890', tbi2: '#b4bcc4', win: '#bfc6d2', hilite: '#4f6582' },
    spruce: { label: 'Spruce', tb1: '#2a6a51', tb2: '#68a888', tbi1: '#7a9080', tbi2: '#a8c0b0', win: '#a2c8a9', hilite: '#2a6a51' },
    storm: { label: 'Storm', tb1: '#800080', tb2: '#b060b0', tbi1: '#808080', tbi2: '#b0b0b0', win: '#c0c0c0', hilite: '#800080' },
    wheat: { label: 'Wheat', tb1: '#808000', tb2: '#b8b860', tbi1: '#a09870', tbi2: '#d0c8a0', win: '#d5d4b6', hilite: '#808000' }
  };
  A.SCHEMES = SCHEMES;
  function svgUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
  const CREST = '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="250" viewBox="0 0 40 46"><path d="M2 2h36v20c0 12-8 19-18 22C10 41 2 34 2 22z" fill="#0b2a55" stroke="#a8873a" stroke-width="1.5"/><text x="20" y="27" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#fff" font-style="italic">V</text><text x="20" y="35.5" text-anchor="middle" font-family="Georgia,serif" font-size="6" fill="#d9c27a">&amp; CIE</text><text x="20" y="12.5" text-anchor="middle" font-family="Georgia,serif" font-size="4.5" fill="#d9c27a">1871</text></svg>';
  const LAKE = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b6ea8"/><stop offset=".55" stop-color="#9cc0e0"/><stop offset="1" stop-color="#f0d8b0"/></linearGradient><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a7aa8"/><stop offset="1" stop-color="#1e3a5c"/></linearGradient></defs><rect width="800" height="600" fill="url(#s)"/><path d="M0 330 70 260 120 290 190 200 250 270 300 230 370 150 430 240 470 210 540 120 600 230 650 190 720 250 800 210 800 360 0 360z" fill="#7d8fa8"/><path d="M370 150 390 175 380 172 395 195 360 185zM540 120 560 150 548 146 565 170 525 160z" fill="#f4f6fa"/><path d="M0 360 120 330 260 350 420 320 560 345 700 325 800 340 800 380 0 380z" fill="#3e5a3a"/><rect y="378" width="800" height="222" fill="url(#w)"/><path d="M560 378v-90l6-30 6 30v90z M548 378v-50h40v50z" fill="#2a3440"/><path d="M0 395h800M40 420h300M420 440h340M80 470h420" stroke="#9cc0e0" stroke-width="2" opacity=".35"/></svg>';
  const WALLS = {
    none: { label: '(None)' },
    crest: { label: 'Vogt & Cie', img: svgUrl(CREST), size: 'auto', mode: 'center' },
    lake: { label: 'Lake Zurich', img: svgUrl(LAKE), size: 'cover', mode: 'stretch' },
    lace: { label: 'Blue Lace', img: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.28) 0 2px, transparent 3px), radial-gradient(circle at 0 0, rgba(255,255,255,.14) 0 4px, transparent 5px)', size: '16px 16px', mode: 'tile' },
    tiles: { label: 'Tiles', img: 'linear-gradient(45deg, rgba(0,0,0,.12) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.12) 75%), linear-gradient(45deg, rgba(0,0,0,.12) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.12) 75%)', size: '32px 32px', pos: '0 0, 16px 16px', mode: 'tile' },
    weave: { label: 'Weave', img: 'repeating-linear-gradient(45deg, rgba(255,255,255,.12) 0 4px, transparent 4px 8px), repeating-linear-gradient(-45deg, rgba(0,0,0,.12) 0 4px, transparent 4px 8px)', size: 'auto', mode: 'tile' },
    clouds: { label: 'Clouds', img: 'radial-gradient(ellipse at 20% 30%, rgba(255,255,255,.55), transparent 40%), radial-gradient(ellipse at 70% 20%, rgba(255,255,255,.45), transparent 35%), radial-gradient(ellipse at 50% 75%, rgba(255,255,255,.35), transparent 45%), linear-gradient(#3a7ec8, #8cc0ea)', size: 'cover', mode: 'stretch' }
  };
  A.WALLS = WALLS;
  A.applySt = function () {
    const r = document.documentElement.style;
    const sc = SCHEMES[A.st.scheme] || SCHEMES.standard;
    r.setProperty('--tb1', sc.tb1); r.setProperty('--tb2', sc.tb2); r.setProperty('--tbi1', sc.tbi1); r.setProperty('--tbi2', sc.tbi2);
    r.setProperty('--win', sc.win); r.setProperty('--hilite', sc.hilite); r.setProperty('--desk', A.st.color);
    let w = WALLS[A.st.wall];
    if (A.st.wall === 'custom' && A.st.custom) w = { img: 'url("' + A.st.custom + '")', size: 'auto' };
    const mode = A.st.mode || (w && w.mode) || 'center';
    if (!w || !w.img) { r.setProperty('--wall', 'none'); return; }
    r.setProperty('--wall', w.img);
    r.setProperty('--wallsize', mode === 'stretch' ? (w.size === 'cover' ? 'cover' : '100% 100%') : (w.size || 'auto'));
    r.setProperty('--wallrep', mode === 'tile' ? 'repeat' : 'no-repeat');
  };
  A.applySt();

  /* ================= Bildschirmschoner ================= */
  let lastInput = Date.now(), saver = null;
  function wake() {
    lastInput = Date.now();
    if (saver) { saver.stop(); saver = null; }
  }
  ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, wake, true); });
  setInterval(function () {
    if (!saver && A.st.saver !== 'none' && Date.now() - lastInput > A.st.wait * 60000) A.saverStart(A.st.saver);
  }, 5000);
  A.saverStart = function (kind) {
    if (saver) saver.stop();
    const c = document.createElement('canvas');
    c.id = 'saver';
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    let raf = 0, t0 = performance.now();
    const W = c.width, H = c.height;
    let draw;
    if (kind === 'starfield') {
      const stars = [];
      for (let i = 0; i < 260; i++) stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
      draw = function () {
        x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
        stars.forEach(function (s) {
          s.z -= 0.006; if (s.z <= 0.01) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; }
          const px = W / 2 + s.x / s.z * W / 2, py = H / 2 + s.y / s.z * H / 2, sz = Math.max(0.5, 2.5 * (1 - s.z));
          x.fillStyle = 'rgba(255,255,255,' + (1 - s.z) + ')'; x.fillRect(px, py, sz, sz);
        });
      };
    } else if (kind === 'mystify') {
      const mk = function (col) { const p = []; for (let i = 0; i < 4; i++) p.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() * 2 + 1) * (Math.random() < .5 ? -1 : 1), vy: (Math.random() * 2 + 1) * (Math.random() < .5 ? -1 : 1) }); return { p: p, col: col }; };
      const polys = [mk('#4af'), mk('#f4a')];
      draw = function () {
        x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, 0, W, H);
        polys.forEach(function (pl) {
          pl.p.forEach(function (q) { q.x += q.vx; q.y += q.vy; if (q.x < 0 || q.x > W) q.vx *= -1; if (q.y < 0 || q.y > H) q.vy *= -1; });
          x.strokeStyle = pl.col; x.beginPath(); pl.p.forEach(function (q, i) { if (i) x.lineTo(q.x, q.y); else x.moveTo(q.x, q.y); }); x.closePath(); x.stroke();
        });
      };
    } else {
      let mx = W, my = H / 2;
      const text = A.st.marquee || 'Bankhaus Vogt & Cie';
      x.font = 'italic 54px Georgia, "Times New Roman", serif';
      const tw = x.measureText(text).width;
      draw = function () {
        x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
        mx -= 3;
        if (mx < -tw) { mx = W; my = 80 + Math.random() * (H - 160); }
        x.fillStyle = '#d9c27a'; x.fillText(text, mx, my);
      };
    }
    (function loop() { draw(performance.now() - t0); raf = requestAnimationFrame(loop); })();
    saver = { stop: function () { cancelAnimationFrame(raf); c.remove(); } };
  };

  /* ================= Hilfsfunktionen ================= */
  A.fdate = function (iso) { return iso ? U.fmtDate(iso) : ''; };
  A.size = function (n) { return n < 1024 ? U.fmt(n, 0) + ' bytes' : U.fmt(n / 1024, n < 10240 ? 2 : 0) + ' KB'; };
  A.kb = function (n) { return U.fmt(Math.max(1, Math.ceil(n / 1024)), 0) + ' KB'; };
  const TYPE = { text: 'Text Document', doc: 'Document', xls: 'Worksheet', image: 'Bitmap Image', html: 'HTML Document', url: 'Internet Shortcut', exe: 'Application', lnk: 'Shortcut' };
  A.typeName = function (f) { return f.type === 'dir' ? 'File Folder' : TYPE[f.mime] || 'File'; };
  A.err = function (title, why, name) {
    const msg = { ro: 'Cannot save ' + e(name) + ': the file is read-only.', full: 'There is not enough free disk space. Delete one or more files to free disk space, and then try again.', denied: 'Cannot complete the operation on ' + e(name) + ': Access is denied.', exists: 'Cannot rename ' + e(name) + ': A file with the name you specified already exists. Specify a different file name.', notfound: 'Cannot find ' + e(name) + '.', self: 'Cannot copy ' + e(name) + ': The destination folder is a subfolder of the source folder.' }[why] || 'The operation on ' + e(name) + ' could not be completed.';
    Dlg().msg(title, msg, 'err');
  };
  function pathLabel(p) {
    if (!p.length) return 'Desktop';
    if (p[0] === 'My Computer') return 'My Computer';
    if (p[0] === 'Recycled') return 'Recycle Bin';
    if (p[0] === 'Control Panel') return 'Control Panel';
    if (p.length === 1) return p[0] === 'A:' ? '3½ Floppy (A:)' : PBS.modern() ? 'OS (C:)' : 'Local Disk (C:)';
    return p[p.length - 1];
  }
  A.pathLabel = pathLabel;
  function pathIcon(p) {
    if (p[0] === 'My Computer') return 'd-comp';
    if (p[0] === 'Recycled') return 'd-recycle';
    if (p[0] === 'Control Panel') return 'd-control';
    if (p.length === 1) return p[0] === 'A:' ? 'd-floppy' : 'd-hdd';
    const sp = FS.specialPaths();
    if (FS.join(p) === FS.join(sp.documents)) return 'd-docs';
    return 'd-folder';
  }
  function addrText(p) { return ['My Computer', 'Recycled', 'Control Panel'].indexOf(p[0]) >= 0 ? pathLabel(p) : FS.join(p); }

  /* ================= Datei öffnen / speichern ================= */
  A.fileDlg = function (o) {
    let dir = o.dir && (o.dir[0] === 'My Computer' ? o.dir : FS.realPath(o.dir)) || FS.specialPaths().documents;
    const types = o.types || [['All Files (*.*)', '*']];
    let type = 0;
    const save = o.mode === 'save';
    const places = [['Desktop', 'd-comp', FS.specialPaths().desktop], ['My Documents', 'd-docs', FS.specialPaths().documents], ['My Computer', 'd-comp', ['My Computer']]];
    const body = '<div class="fd"><div class="fd-top">Look in: <select class="inp fd-look"></select> <button type="button" class="btn sm fd-up" title="Up One Level">⬑</button>' + (save ? ' <button type="button" class="btn sm fd-new" title="Create New Folder">New folder</button>' : '') + '</div>' +
      '<div class="fd-mid"><div class="fd-places">' + places.map(function (pl, i) { return '<div class="fd-pl" data-pl="' + i + '"><svg><use href="#' + (i === 0 ? 'd-comp' : pl[1]) + '"/></svg><span>' + pl[0] + '</span></div>'; }).join('') + '</div><div class="fd-list" tabindex="0"></div></div>' +
      '<table class="frm fd-bot"><tr><th>File name:</th><td><input class="inp fd-name" value="' + e(o.name || '') + '"></td></tr><tr><th>' + (save ? 'Save as type:' : 'Files of type:') + '</th><td><select class="inp fd-type">' + types.map(function (t, i) { return '<option value="' + i + '">' + e(t[0]) + '</option>'; }).join('') + '</select></td></tr></table></div>';
    let dlg = null;
    const items = function () {
      if (dir[0] === 'My Computer') return (PBS.modern() ? [] : [{ name: 'A:', label: '3½ Floppy (A:)', type: 'dir', icon: 'd-floppy', path: ['A:'] }]).concat([{ name: 'C:', label: PBS.modern() ? 'OS (C:)' : 'Local Disk (C:)', type: 'dir', icon: 'd-hdd', path: ['C:'] }]);
      const ext = types[type][1];
      return FS.list(dir).filter(function (f) { return f.type === 'dir' || ext === '*' || ext.split(';').indexOf(FS.ext(f.name)) >= 0; })
        .map(function (f) { return { name: f.name, label: f.name, type: f.type, icon: WM().iconFor(f), path: f.path }; });
    };
    const paint = function () {
      const ov = dlg.el;
      const look = ov.querySelector('.fd-look');
      const chain = dir[0] === 'My Computer' ? [] : dir.map(function (x, i) { return dir.slice(0, i + 1); });
      const opts = [['Desktop', FS.specialPaths().desktop], ['My Documents', FS.specialPaths().documents], ['My Computer', ['My Computer']]].concat(chain.map(function (c) { return [pathLabel(c), c]; }));
      look.innerHTML = opts.map(function (op, i) { return '<option value="' + i + '"' + (FS.join(op[1]) === FS.join(dir) ? ' selected' : '') + '>' + (i > 2 ? ' '.repeat((i - 2) * 2) : '') + e(op[0]) + '</option>'; }).join('');
      look.onchange = function () { dir = opts[+look.value][1]; paint(); };
      const list = ov.querySelector('.fd-list');
      const it = items();
      list.innerHTML = it.length ? it.map(function (f, i) { return '<div class="fd-it" data-i="' + i + '"><svg><use href="#' + f.icon + '"/></svg><span>' + e(f.label) + '</span></div>'; }).join('') : '<div class="muted pad">(empty)</div>';
      list.onclick = function (ev) { const d = ev.target.closest('.fd-it'); if (!d) return; list.querySelectorAll('.sel').forEach(function (x) { x.classList.remove('sel'); }); d.classList.add('sel'); const f = it[+d.dataset.i]; if (f.type === 'file') ov.querySelector('.fd-name').value = f.name; };
      list.ondblclick = function (ev) { const d = ev.target.closest('.fd-it'); if (!d) return; const f = it[+d.dataset.i]; if (f.type === 'dir') { dir = f.path; paint(); } else { ov.querySelector('.fd-name').value = f.name; ok(); } };
    };
    const ok = function () {
      const ov = dlg.el;
      let nm = ov.querySelector('.fd-name').value.trim();
      if (!nm || nm.indexOf('*') >= 0) return false;
      let p = /^[a-z]:/i.test(nm) ? FS.parse(nm) : (dir[0] === 'My Computer' ? null : dir.concat(FS.parse(nm)));
      if (!p) return false;
      if (FS.isDir(p)) { dir = FS.realPath(p); ov.querySelector('.fd-name').value = ''; paint(); return false; }
      const ext = types[type][1];
      if (save && ext !== '*' && !FS.ext(FS.name(p))) p = FS.parent(p).concat([FS.name(p) + '.' + ext.split(';')[0]]);
      if (!save) {
        if (!FS.exists(p)) { Dlg().msg(o.title || 'Open', e(FS.name(p)) + '<br>File not found.<br>Please verify the correct file name was given.', 'bigwarn'); return false; }
        dlg.close(); o.onOk(FS.realPath(p)); return false;
      }
      if (!FS.isDir(FS.parent(p))) { Dlg().msg(o.title || 'Save As', 'The folder does not exist.', 'bigwarn'); return false; }
      if (FS.exists(p)) {
        Dlg().confirm(o.title || 'Save As', e(FS.name(p)) + ' already exists.<br>Do you want to replace it?', function () { dlg.close(); o.onOk(FS.realPath(p)); }, 'bigwarn');
        return false;
      }
      dlg.close(); o.onOk(p); return false;
    };
    dlg = Dlg().open({
      title: o.title || (save ? 'Save As' : 'Open'), width: 540, cls: 'fdlg', body: body,
      onOpen: function (ov) {
        ov.querySelector('.fd-up').onclick = function () { if (dir[0] === 'My Computer') return; dir = dir.length > 1 ? dir.slice(0, -1) : ['My Computer']; paint(); };
        const nb = ov.querySelector('.fd-new');
        if (nb) nb.onclick = function () { if (dir[0] === 'My Computer') return; let n = 'New Folder', i = 2; while (FS.exists(dir.concat([n]))) n = 'New Folder (' + (i++) + ')'; FS.mkdir(dir.concat([n])); paint(); };
        ov.querySelector('.fd-type').onchange = function (ev) { type = +ev.target.value; paint(); };
        ov.querySelectorAll('.fd-pl').forEach(function (d) { d.onclick = function () { dir = places[+d.dataset.pl][2]; paint(); }; });
        setTimeout(paint, 0);
      },
      buttons: [{ label: save ? 'Save' : 'Open', def: true, fn: ok }, { label: 'Cancel' }]
    });
  };
  A.TXT = [['Text Documents (*.txt)', 'txt'], ['All Files (*.*)', '*']];
  A.IMG = [['Bitmap Files (*.bmp)', 'bmp;png;jpg;gif'], ['All Files (*.*)', '*']];

  /* ================= Explorer ================= */
  const APPLETS = [
    { k: 'display', l: 'Display', icon: 'd-control', d: 'Customizes your desktop display and screen saver.' },
    { k: 'sound', l: 'Sounds and Multimedia', icon: 't-vol', d: 'Changes the sound scheme and volume.' },
    { k: 'datetime', l: 'Date/Time', icon: 'i-clock', d: 'Sets the date, time and time zone for your computer.' },
    { k: 'mouse', l: 'Mouse', icon: 'd-exe', d: 'Customizes your mouse settings, such as the button configuration and double-click speed.' },
    { k: 'inet', l: 'Internet Options', icon: 'd-net', d: 'Configures your Internet display and connection settings.' },
    { k: 'addrem', l: 'Add/Remove Programs', icon: 'd-exe', d: 'Installs and removes programs and Windows components.' },
    { k: 'users', l: 'Users and Passwords', icon: 'i-key', d: 'Manages users and passwords for this computer.' },
    { k: 'regional', l: 'Regional Options', icon: 'd-net', d: 'Customizes settings for the display of languages, numbers, times, and dates.' }
  ];

  function exItems(p) {
    if (p[0] === 'My Computer') {
      return (PBS.modern() ? [] : [{ name: 'A:', label: '3½ Floppy (A:)', icon: 'd-floppy', kind: 'drive', path: ['A:'], tname: '3½-Inch Floppy Disk' }]).concat([
        { name: 'C:', label: PBS.modern() ? 'OS (C:)' : 'Local Disk (C:)', icon: 'd-hdd', kind: 'drive', path: ['C:'], tname: 'Local Disk' },
        { name: 'Control Panel', label: 'Control Panel', icon: 'd-control', kind: 'cp', path: ['Control Panel'], tname: 'System Folder' }]);
    }
    if (p[0] === 'Control Panel') return APPLETS.map(function (a) { return { name: a.l, label: a.l, icon: a.icon, kind: 'applet', applet: a.k, tname: 'Control Panel Applet', desc: a.d }; });
    if (p[0] === 'Recycled') {
      return FS.list(['Recycled'], { hidden: true }).map(function (f) { return Object.assign(f, { label: f.name, icon: WM().iconFor(f), kind: 'bin', from: f.node._from || '', tname: A.typeName(f) }); });
    }
    return FS.list(p).map(function (f) { return Object.assign(f, { label: f.name, icon: WM().iconFor(f), kind: f.type, tname: A.typeName(f) }); });
  }
  function writable(p) { return p.length && ['My Computer', 'Recycled', 'Control Panel'].indexOf(p[0]) < 0 && FS.isDir(p) && !FS.node(p).ro && !(FS.node(p).system && (p[1] === 'WINNT' || p[1] === 'Windows')); }

  // Gemeinsame Befehle für Explorer und Desktop
  function canEdit(f) { return f && f.path && (f.type === 'dir' || f.type === 'file') && f.kind !== 'bin' && !f.ro && !f.system; }
  A.item = function (path) {
    const rp = FS.realPath(path);
    if (!rp || rp.length < 2) return null;
    return exItems(FS.parent(rp)).find(function (f) { return FS.join(f.path) === FS.join(rp); }) || null;
  };
  A.setClip = function (op, items) {
    const paths = items.filter(function (f) { return f && canEdit(f); }).map(function (f) { return f.path; });
    A.clip = paths.length ? { op: op, paths: paths } : null;
  };
  A.paste = function (dir) {
    if (!A.clip || !writable(dir)) return;
    A.clip.paths.forEach(function (p) {
      const ok = A.clip.op === 'cut' ? FS.move(p, dir) : FS.copy(p, dir);
      if (!ok) A.err(A.clip.op === 'cut' ? 'Error Moving File or Folder' : 'Error Copying File or Folder', FS.lastError, FS.name(p));
    });
    if (A.clip.op === 'cut') A.clip = null;
  };
  A.canPaste = function (dir) { return !!A.clip && writable(dir); };
  A.emptyBin = function () {
    if (!FS.binCount()) return;
    Dlg().confirm('Confirm Multiple File Delete', 'Are you sure you want to delete all of the items in the Recycle Bin?', function () { FS.emptyBin(); Snd.chord(); }, 'bigwarn');
  };
  // In den Papierkorb (auf der Diskette und im Papierkorb endgültig)
  A.deleteItems = function (items, done) {
    items = items.filter(Boolean);
    if (!items.length) return;
    if (items.some(function (f) { return f.kind === 'drive' || f.kind === 'applet' || f.kind === 'cp'; })) { Dlg().msg('Error Deleting File or Folder', 'This item cannot be deleted.', 'err'); return; }
    const bin = items[0].kind === 'bin', floppy = !bin && items[0].path[0].toUpperCase() === 'A:';
    const what = items.length === 1 ? '\'' + e(items[0].name) + '\'' : 'these ' + items.length + ' items';
    Dlg().confirm('Confirm File Delete', bin || floppy ? 'Are you sure you want to delete ' + what + '?<br><span class="small muted">Deleted items cannot be restored.</span>' : 'Are you sure you want to send ' + what + ' to the Recycle Bin?', function () {
      items.forEach(function (f) {
        const ok = bin ? FS.destroy(['Recycled', f.name]) : FS.remove(f.path, !floppy);
        if (!ok) A.err('Error Deleting File or Folder', FS.lastError, f.name);
      });
      if (!bin) Snd.click();
      if (done) done();
    }, bin || floppy ? 'bigwarn' : 'ques');
  };
  A.props = function (f) {
    if (f.kind === 'applet') { A.applet(f.applet); return; }
    const info = f.path && /^[AC]:/i.test(f.path[0]) ? FS.info(f.path) : null;
    const size = f.kind === 'drive' ? FS.drive(f.name).used : f.type === 'dir' && f.path ? FS.size(f.path) : (f.size || 0);
    Dlg().open({
      title: f.label + ' Properties', width: 360, icon: f.icon,
      body: '<div class="wtabs"><span class="wtab on">General</span>' + (f.kind === 'drive' ? '<span class="wtab">Tools</span>' : '') + '</div><div class="wpane props">' +
        '<div class="pr-h"><svg><use href="#' + f.icon + '"/></svg><input class="inp" value="' + e(f.label) + '" readonly></div><hr>' +
        '<table class="kv dlgkv"><tr><th>Type:</th><td>' + e(f.tname || A.typeName(f)) + '</td></tr>' +
        (f.path && f.kind !== 'drive' ? '<tr><th>Location:</th><td>' + e(f.from ? FS.join(FS.parent(f.from)) : addrText(FS.parent(f.path))) + '</td></tr>' : '') +
        '<tr><th>Size:</th><td>' + A.size(size) + '</td></tr>' + (info ? '<tr><th>Created:</th><td>' + A.fdate(info.created) + '</td></tr><tr><th>Modified:</th><td>' + A.fdate(info.modified) + '</td></tr>' : '') +
        (f.kind === 'drive' ? '<tr><th>Free space:</th><td>' + A.size(FS.drive(f.name).free) + '</td></tr>' : '') + '</table>' +
        (info ? '<hr><div>Attributes: <label><input type="checkbox" disabled' + (info.ro ? ' checked' : '') + '> Read-only</label> <label><input type="checkbox" disabled' + (info.hidden ? ' checked' : '') + '> Hidden</label></div>' : '') + '</div>',
      buttons: [{ label: 'OK', def: true }, { label: 'Cancel' }, { label: 'Apply', dis: true }]
    });
  };

  function explorer(win, startPath) {
    const st = win.data = { path: null, hist: [], idx: -1, sel: [], view: 'icons' };
    win.body.innerHTML =
      '<div class="ex-tb"><button type="button" class="tbb lbl" data-x="back" title="Back"><svg><use href="#b-back"/></svg><span>Back</span></button><button type="button" class="tbb" data-x="fwd" title="Forward"><svg><use href="#b-fwd"/></svg></button>' +
      '<button type="button" class="tbb" data-x="up" title="Up"><svg><use href="#i-up"/></svg></button><span class="tsep"></span>' +
      '<button type="button" class="tbb" data-x="cut" title="Cut">Cut</button><button type="button" class="tbb" data-x="copy" title="Copy">Copy</button><button type="button" class="tbb" data-x="paste" title="Paste">Paste</button>' +
      '<button type="button" class="tbb" data-x="del" title="Delete"><svg><use href="#i-del"/></svg></button><span class="tsep"></span>' +
      '<button type="button" class="tbb lbl" data-x="views" title="Views"><svg><use href="#i-list"/></svg><span>Views</span></button></div>' +
      '<div class="ex-addr"><span class="al">A<u>d</u>dress</span><div class="combo"><svg class="ico ex-aico"><use href="#d-folder"/></svg><input class="ex-url" spellcheck="false"></div><button type="button" class="tbb go" data-x="go"><svg class="ico"><use href="#i-go"/></svg> Go</button></div>' +
      '<div class="ex-main"><div class="ex-left"></div><div class="ex-list" tabindex="0"></div></div>' +
      '<div class="ex-status"><span class="sc grow ex-s1"></span><span class="sc ex-s2"></span><span class="sc ex-s3"></span></div>';
    const $ = function (s) { return win.body.querySelector(s); };
    const list = $('.ex-list');

    WM().menubar(win, [
      { l: '~File', items: function () {
        const one = st.sel.length === 1 ? cur()[st.sel[0]] : null;
        const bin = st.path[0] === 'Recycled';
        const m = [];
        if (writable(st.path)) m.push({ l: 'Ne~w', sub: [{ l: '~Folder', ico: 'd-folder', fn: function () { newItem('dir'); } }, { l: 'Text ~Document', ico: 'd-txt', fn: function () { newItem('txt'); } }] }, '-');
        if (one) m.push({ l: '~Open', fn: function () { open(one); } });
        if (bin) m.push({ l: 'R~estore', dis: !st.sel.length, fn: restoreSel }, { l: 'Empty Recycle ~Bin', dis: !cur().length, fn: emptyBin });
        m.push('-', { l: '~Delete', dis: !st.sel.length, fn: delSel }, { l: 'Rena~me', dis: !one || !canEdit(one), fn: function () { rename(st.sel[0]); } }, { l: 'P~roperties', fn: function () { props(one); } }, '-', { l: '~Close', fn: function () { WM().close(win.id); } });
        return m;
      } },
      { l: '~Edit', items: function () {
        return [{ l: '~Undo', dis: true }, '-', { l: 'Cu~t', k: 'Ctrl+X', dis: !st.sel.length, fn: function () { clip('cut'); } }, { l: '~Copy', k: 'Ctrl+C', dis: !st.sel.length, fn: function () { clip('copy'); } },
          { l: '~Paste', k: 'Ctrl+V', dis: !A.clip || !writable(st.path), fn: paste }, '-', { l: 'Select ~All', k: 'Ctrl+A', fn: function () { st.sel = cur().map(function (x, i) { return i; }); paintList(); } }];
      } },
      { l: '~View', items: function () {
        return [{ l: 'Lar~ge Icons', radio: true, chk: st.view === 'icons', fn: function () { setView('icons'); } }, { l: '~List', radio: true, chk: st.view === 'list', fn: function () { setView('list'); } }, { l: '~Details', radio: true, chk: st.view === 'details', fn: function () { setView('details'); } }, '-', { l: '~Refresh', k: 'F5', fn: function () { win.refresh(); } }];
      } },
      { l: '~Tools', items: function () { return [{ l: 'Map ~Network Drive...', dis: true }, { l: '~Disconnect Network Drive...', dis: true }, '-', { l: 'Folder ~Options...', dis: true }]; } },
      { l: '~Help', items: function () { return [{ l: '~Help Topics', dis: true }, '-', { l: '~About Windows', fn: aboutWindows }]; } }
    ]);

    let cache = [];
    function cur() { return cache; }
    function go(p, push) {
      if (p[0] !== 'My Computer' && p[0] !== 'Control Panel' && p[0] !== 'Recycled') {
        const rp = FS.realPath(p);
        if (!rp || !FS.isDir(rp)) { Dlg().msg(pathLabel(st.path || ['My Computer']), 'Cannot find \'' + e(FS.join(p)) + '\'. Make sure the path is correct.', 'err'); return; }
        p = rp;
      }
      st.path = p;
      st.sel = [];
      if (push !== false) { st.hist = st.hist.slice(0, st.idx + 1); st.hist.push(p); st.idx = st.hist.length - 1; }
      win.refresh();
    }
    win.refresh = function () {
      if (st.renaming) return;
      if (st.path[0] !== 'My Computer' && st.path[0] !== 'Control Panel' && st.path[0] !== 'Recycled' && !FS.isDir(st.path)) st.path = st.path.length > 1 ? FS.realPath(FS.parent(st.path)) || ['My Computer'] : ['My Computer'];
      cache = exItems(st.path);
      st.sel = st.sel.filter(function (i) { return i < cache.length; });
      WM().setTitle(win.id, pathLabel(st.path));
      WM().setBodyIcon(win.id, pathIcon(st.path));
      $('.ex-url').value = addrText(st.path);
      $('.ex-aico use').setAttribute('href', '#' + pathIcon(st.path));
      $('[data-x=back]').disabled = st.idx <= 0;
      $('[data-x=fwd]').disabled = st.idx >= st.hist.length - 1;
      $('[data-x=up]').disabled = st.path[0] === 'My Computer';
      paintList();
    };
    function setView(v) { st.view = v; paintList(); }
    function paintList() {
      const it = cur();
      list.className = 'ex-list v-' + st.view;
      if (st.view === 'details') {
        const bin = st.path[0] === 'Recycled';
        list.innerHTML = '<table class="ex-det"><thead><tr><th>Name</th>' + (bin ? '<th>Original Location</th>' : '') + '<th class="num">Size</th><th>Type</th><th>Modified</th></tr></thead><tbody>' +
          it.map(function (f, i) {
            return '<tr class="ex-it' + (st.sel.indexOf(i) >= 0 ? ' sel' : '') + (A.clip && A.clip.op === 'cut' && f.path && A.clip.paths.some(function (cp) { return FS.join(cp) === FS.join(f.path); }) ? ' cut' : '') + '" data-i="' + i + '"><td><svg class="ico"><use href="#' + f.icon + '"/></svg> <span class="ex-l">' + e(f.label) + '</span></td>' +
              (bin ? '<td>' + e(FS.join(FS.parent(f.from || ''))) + '</td>' : '') + '<td class="num">' + (f.type === 'file' ? A.kb(f.size) : '') + '</td><td>' + e(f.tname || '') + '</td><td>' + (f.modified ? A.fdate(f.modified) : '') + '</td></tr>';
          }).join('') + '</tbody></table>';
      } else {
        list.innerHTML = it.map(function (f, i) {
          return '<div class="ex-it' + (st.sel.indexOf(i) >= 0 ? ' sel' : '') + (A.clip && A.clip.op === 'cut' && f.path && A.clip.paths.some(function (cp) { return FS.join(cp) === FS.join(f.path); }) ? ' cut' : '') + '" data-i="' + i + '" title="' + e(f.label) + '"><svg><use href="#' + f.icon + '"/></svg><span class="ex-l">' + e(f.label) + '</span></div>';
        }).join('') || '<div class="ex-empty">This folder is empty.</div>';
      }
      paintLeft();
      paintStatus();
    }
    // Nur die Auswahl neu zeichnen: die Elemente bleiben, damit ein Doppelklick sein Ziel behält
    function paintSel() {
      list.querySelectorAll('.ex-it').forEach(function (el) { el.classList.toggle('sel', st.sel.indexOf(+el.dataset.i) >= 0); });
      paintLeft();
      paintStatus();
    }
    function paintStatus() {
      const it = cur();
      if (st.sel.length) {
        const sz = st.sel.reduce(function (t, i) { return t + (it[i].type === 'file' ? it[i].size : 0); }, 0);
        $('.ex-s1').textContent = st.sel.length + ' object(s) selected';
        $('.ex-s2').textContent = sz ? A.size(sz) : '';
      } else {
        $('.ex-s1').textContent = it.length + ' object(s)' + (st.path.length && /^[AC]:$/i.test(st.path[0]) ? ' (Disk free space: ' + U.fmt(FS.drive(st.path[0]).free / 1048576, 1) + ' MB)' : '');
        $('.ex-s2').textContent = it.some(function (f) { return f.type === 'file'; }) ? A.size(it.reduce(function (t, f) { return t + (f.type === 'file' ? f.size : 0); }, 0)) : '';
      }
      $('.ex-s3').innerHTML = '<svg class="ico"><use href="#d-comp"/></svg> My Computer';
    }
    function paintLeft() {
      const it = cur(), p = st.path;
      let h = '<div class="ex-lt"><svg><use href="#' + pathIcon(p) + '"/></svg><b>' + e(pathLabel(p)) + '</b></div><div class="ex-lrule"></div>';
      const one = st.sel.length === 1 ? it[st.sel[0]] : null;
      if (p[0] === 'Recycled') {
        h += '<p>This folder contains files and folders that you have deleted from your computer.</p>' +
          '<p>To permanently remove all items and reclaim disk space, click:<br><a href="#" data-x="empty">Empty Recycle Bin</a></p>' + (it.length ? '<p>To restore all items back to their original location, click:<br><a href="#" data-x="restoreall">Restore All</a></p>' : '');
      } else if (one && one.kind === 'drive') {
        const d = FS.drive(one.name);
        const pct = d.cap ? d.used / d.cap * 100 : 0;
        h += '<p><b>' + e(one.label) + '</b><br>' + e(one.tname) + '</p><p>Capacity: ' + U.fmt(d.cap / 1073741824 >= 1 ? d.cap / 1073741824 : d.cap / 1048576, 2) + (d.cap >= 1073741824 ? ' GB' : ' MB') + '</p>' +
          '<div class="ex-pie" style="background:conic-gradient(#3a5ec0 0 ' + pct.toFixed(1) + '%, #e060e0 ' + pct.toFixed(1) + '% 100%)"></div>' +
          '<p><span class="ex-key" style="background:#3a5ec0"></span> Used: ' + U.fmt(d.used / 1048576, 1) + ' MB<br><span class="ex-key" style="background:#e060e0"></span> Free: ' + U.fmt(d.free / 1048576, 1) + ' MB</p>';
      } else if (one) {
        h += '<p><b>' + e(one.label) + '</b><br>' + e(one.tname || '') + '</p>' + (one.desc ? '<p>' + e(one.desc) + '</p>' : '') +
          (one.modified ? '<p>Modified: ' + A.fdate(one.modified) + '</p>' : '') + (one.type === 'file' ? '<p>Size: ' + A.size(one.size) + '</p>' : '') +
          (one.ro ? '<p>Attributes: Read-only</p>' : '') + (one.from ? '<p>Original location:<br>' + e(FS.join(FS.parent(one.from))) + '</p>' : '');
      } else if (st.sel.length > 1) {
        h += '<p>' + st.sel.length + ' items selected.</p>';
      } else if (p[0] === 'My Computer') {
        h += '<p>Select an item to view its description.</p><p>Displays the contents of your computer.</p>';
      } else if (p[0] === 'Control Panel') {
        h += '<p>Use the settings in Control Panel to personalize your computer.</p><p>Select an item to view its description.</p>';
      } else {
        h += '<p>Select an item to view its description.</p>';
      }
      $('.ex-left').innerHTML = h;
    }

    function open(f) {
      if (f.kind === 'drive' || f.kind === 'cp' || f.type === 'dir') { go(f.path); return; }
      if (f.kind === 'applet') { A.applet(f.applet); return; }
      if (f.kind === 'bin') { props(f); return; }
      WM().openPath(f.path);
    }
    function newItem(kind) {
      if (!writable(st.path)) return;
      let name = kind === 'dir' ? 'New Folder' : 'New Text Document.txt', i = 2;
      while (FS.exists(st.path.concat([name]))) name = kind === 'dir' ? 'New Folder (' + (i++) + ')' : 'New Text Document (' + (i++) + ').txt';
      const ok = kind === 'dir' ? FS.mkdir(st.path.concat([name])) : FS.write(st.path.concat([name]), '');
      if (!ok) { A.err('Error', FS.lastError, name); return; }
      cache = exItems(st.path);
      const idx = cache.findIndex(function (f) { return f.name === name; });
      st.sel = [idx];
      paintList();
      rename(idx);
    }
    function rename(i) {
      const f = cur()[i];
      if (!canEdit(f)) return;
      const el = list.querySelector('[data-i="' + i + '"] .ex-l');
      if (!el) return;
      const inp = document.createElement('input');
      inp.className = 'ex-ren';
      inp.value = f.name;
      el.replaceWith(inp);
      inp.focus();
      const dot = f.type === 'file' ? f.name.lastIndexOf('.') : -1;
      inp.setSelectionRange(0, dot > 0 ? dot : f.name.length);
      st.renaming = true;
      let done = false;
      const finish = function (commit) {
        if (done) return; done = true;
        st.renaming = false;
        const nn = inp.value.trim();
        if (commit && nn && nn !== f.name) {
          if (!FS.rename(f.path, nn)) { A.err('Error Renaming File or Folder', FS.lastError, f.name); }
        }
        win.refresh();
        list.focus();
      };
      inp.addEventListener('keydown', function (ev) { ev.stopPropagation(); if (ev.key === 'Enter') finish(true); if (ev.key === 'Escape') finish(false); });
      inp.addEventListener('blur', function () { finish(true); });
    }
    function delSel() { const it = cur(); A.deleteItems(st.sel.map(function (i) { return it[i]; }), function () { st.sel = []; }); }
    function restoreSel() { cur().filter(function (f, i) { return st.sel.indexOf(i) >= 0; }).forEach(function (f) { FS.restore(f.name); }); st.sel = []; }
    function emptyBin() { A.emptyBin(); }
    function clip(op) { const it = cur(); A.setClip(op, st.sel.map(function (i) { return it[i]; })); paintList(); }
    function paste() { A.paste(st.path); }
    function props(f) { A.props(f || { label: pathLabel(st.path), icon: pathIcon(st.path), tname: 'File Folder', path: st.path, type: 'dir' }); }

    // Ereignisse im Fenster
    win.body.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-x]');
      if (b) {
        ev.preventDefault();
        const x = b.dataset.x;
        if (x === 'back' && st.idx > 0) { st.idx--; go(st.hist[st.idx], false); }
        else if (x === 'fwd' && st.idx < st.hist.length - 1) { st.idx++; go(st.hist[st.idx], false); }
        else if (x === 'up' && st.path[0] !== 'My Computer') go(st.path.length > 1 && /^[AC]:$/i.test(st.path[0]) ? st.path.slice(0, -1) : ['My Computer']);
        else if (x === 'cut' || x === 'copy') clip(x);
        else if (x === 'paste') paste();
        else if (x === 'del') delSel();
        else if (x === 'views') setView({ icons: 'list', list: 'details', details: 'icons' }[st.view]);
        else if (x === 'go') goAddr();
        else if (x === 'empty') emptyBin();
        else if (x === 'restoreall') { FS.list(['Recycled'], { hidden: true }).forEach(function (f) { FS.restore(f.name); }); }
        return;
      }
      if (!ev.target.closest('.ex-list')) return;
      const it = ev.target.closest('.ex-it');
      if (!it) { st.sel = []; paintSel(); return; }
      const i = +it.dataset.i;
      if (ev.ctrlKey) { const k = st.sel.indexOf(i); if (k >= 0) st.sel.splice(k, 1); else st.sel.push(i); }
      else st.sel = [i];
      paintSel();
      list.focus();
    });
    win.body.addEventListener('dblclick', function (ev) {
      const it = ev.target.closest('.ex-list .ex-it');
      if (it && !ev.target.closest('.ex-ren')) open(cur()[+it.dataset.i]);
    });
    list.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
      const it = ev.target.closest('.ex-it');
      if (it) {
        const i = +it.dataset.i;
        if (st.sel.indexOf(i) < 0) { st.sel = [i]; paintList(); }
        const f = cur()[i];
        const bin = st.path[0] === 'Recycled';
        PBS.menu(bin ? [{ l: 'R~estore', fn: restoreSel }, '-', { l: '~Delete', fn: delSel }, '-', { l: 'P~roperties', fn: function () { props(f); } }] :
          [{ l: '~Open', fn: function () { open(f); } }, '-', { l: 'Cu~t', dis: !canEdit(f), fn: function () { clip('cut'); } }, { l: '~Copy', dis: !canEdit(f), fn: function () { clip('copy'); } }, '-',
            { l: '~Delete', dis: !canEdit(f) && f.kind !== 'dir', fn: delSel }, { l: 'Rena~me', dis: !canEdit(f), fn: function () { rename(i); } }, '-', { l: 'P~roperties', fn: function () { props(f); } }], ev.clientX, ev.clientY, 0);
      } else {
        st.sel = []; paintList();
        PBS.menu([{ l: '~View', sub: [{ l: 'Lar~ge Icons', radio: true, chk: st.view === 'icons', fn: function () { setView('icons'); } }, { l: '~List', radio: true, chk: st.view === 'list', fn: function () { setView('list'); } }, { l: '~Details', radio: true, chk: st.view === 'details', fn: function () { setView('details'); } }] },
          { l: 'R~efresh', fn: function () { win.refresh(); } }, '-', { l: '~Paste', dis: !A.clip || !writable(st.path), fn: paste }, '-',
          { l: 'Ne~w', dis: !writable(st.path), sub: [{ l: '~Folder', ico: 'd-folder', fn: function () { newItem('dir'); } }, { l: 'Text ~Document', ico: 'd-txt', fn: function () { newItem('txt'); } }] }, '-',
          { l: 'P~roperties', fn: function () { props(null); } }], ev.clientX, ev.clientY, 0);
      }
    });
    list.addEventListener('keydown', function (ev) {
      const it = cur();
      if (ev.key === 'Delete') { delSel(); ev.preventDefault(); }
      else if (ev.key === 'F2' && st.sel.length === 1) { rename(st.sel[0]); ev.preventDefault(); }
      else if (ev.key === 'Enter' && st.sel.length === 1) open(it[st.sel[0]]);
      else if (ev.key === 'Backspace') { ev.preventDefault(); $('[data-x=up]').click(); }
      else if (ev.key === 'F5') { ev.preventDefault(); win.refresh(); }
      else if (ev.ctrlKey && /^[acvx]$/i.test(ev.key)) {
        ev.preventDefault();
        const k = ev.key.toLowerCase();
        if (k === 'a') { st.sel = it.map(function (x, i) { return i; }); paintList(); } else if (k === 'c') clip('copy'); else if (k === 'x') clip('cut'); else paste();
      } else if (/^Arrow/.test(ev.key) && it.length) {
        ev.preventDefault();
        const i = st.sel.length ? st.sel[st.sel.length - 1] : -1;
        const n = ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? Math.max(0, i - 1) : Math.min(it.length - 1, i + 1);
        st.sel = [n]; paintList();
      }
    });
    function goAddr() {
      const v = $('.ex-url').value.trim();
      const low = v.toLowerCase();
      if (low === 'my computer') go(['My Computer']);
      else if (low === 'recycle bin') go(['Recycled']);
      else if (low === 'control panel') go(['Control Panel']);
      else if (/:\/\/|^www\./i.test(v)) { if (WM().hooks.navigate) WM().hooks.navigate(v); }
      else if (FS.isDir(v)) go(FS.parse(v));
      else if (FS.exists(v)) WM().openPath(v);
      else Dlg().msg(pathLabel(st.path), 'Cannot find \'' + e(v) + '\'. Make sure the path or Internet address is correct.', 'err');
    }
    $('.ex-url').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); goAddr(); } });
    go(startPath);
  }
  A.defs.explorer = { title: 'My Computer', icon: 'd-comp', w: 640, h: 430, minW: 380, minH: 240, open: function (win, arg) { const p = arg && (arg.path || (Array.isArray(arg) || typeof arg === 'string' ? arg : null)); explorer(win, p ? FS.parse(p) : ['My Computer']); } };
  A.defs.control = { title: 'Control Panel', icon: 'd-control', w: 560, h: 380, minW: 360, minH: 220, open: function (win, arg) { explorer(win, ['Control Panel']); if (arg && arg.tab) A.applet(arg.tab); } };

  function aboutWindows() {
    Dlg().open({
      title: 'About Windows', width: 420, icon: 'd-comp',
      body: PBS.modern() ? '<div class="dlg-msg"><svg class="ico32"><use href="#d-comp"/></svg><div><b>Windows 10 Enterprise</b><br>Version 21H2 (OS Build 19044.1288)<br>© Microsoft Corporation. All rights reserved.<br><br>This product is licensed under the Microsoft Software License Terms to:<br>Bankhaus Vogt &amp; Cie<br>Workstation ZH-NB-1147</div></div>' : '<div class="dlg-msg"><svg class="ico32"><use href="#d-comp"/></svg><div><b>Windows 2000 Professional</b><br>Version 5.0 (Build 2195: Service Pack 3)<br><br>This product is licensed to:<br>Bankhaus Vogt &amp; Cie<br>Workstation ZH-BS64-0217<br><br>Physical memory available to Windows: 261,616 KB</div></div>'
    });
  }

  /* ================= Editor ================= */
  function notepad(win, arg) {
    const st = win.data = { path: null, dirty: false, wrap: true };
    win.body.innerHTML = '<textarea class="np-text" spellcheck="false" wrap="soft"></textarea>';
    const ta = win.body.querySelector('textarea');
    const title = function () { WM().setTitle(win.id, (st.path ? FS.name(st.path) : st.name || 'Untitled') + ' - Notepad'); };
    const load = function (p) {
      const txt = FS.read(p);
      if (txt === null) { A.err('Notepad', 'notfound', FS.join(FS.parse(p))); return; }
      const info = FS.info(p);
      ta.value = info.mime === 'image' ? 'This file is not a text file.' : txt.replace(/\r\n/g, '\n');
      st.path = FS.realPath(p); st.dirty = false; title();
    };
    const doSave = function (as, after) {
      const write = function (p) {
        const ok = FS.write(p, ta.value.replace(/\n/g, '\r\n'));
        if (!ok) { A.err('Notepad', FS.lastError, FS.name(p)); return false; }
        st.path = FS.realPath(p); st.dirty = false; title();
        if (after) after();
        return true;
      };
      if (!st.path || as || (FS.info(st.path) && FS.info(st.path).ro)) {
        A.fileDlg({ mode: 'save', title: 'Save As', dir: st.path ? FS.parent(st.path) : FS.specialPaths().documents, name: st.path ? FS.name(st.path) : '*.txt', types: A.TXT, onOk: write });
      } else write(st.path);
    };
    const askSave = function (then) {
      if (!st.dirty) { then(); return; }
      Dlg().open({
        title: 'Notepad', width: 380, sound: 'ding',
        body: '<div class="dlg-msg"><svg class="ico32"><use href="#i-bigwarn"/></svg><div>The text in the ' + e(st.path ? FS.name(st.path) : 'Untitled') + ' file has changed.<br><br>Do you want to save the changes?</div></div>',
        buttons: [{ label: 'Yes', def: true, fn: function () { setTimeout(function () { doSave(false, then); }, 0); } }, { label: 'No', fn: function () { setTimeout(then, 0); } }, { label: 'Cancel' }]
      });
    };
    const findText = function (again) {
      const go = function (q) {
        if (!q) return;
        st.find = q;
        const from = ta.selectionEnd || 0;
        let i = ta.value.toLowerCase().indexOf(q.toLowerCase(), from);
        if (i < 0) i = ta.value.toLowerCase().indexOf(q.toLowerCase());
        if (i < 0) { Dlg().msg('Notepad', 'Cannot find "' + e(q) + '"', 'biginfo'); return; }
        ta.focus(); ta.setSelectionRange(i, i + q.length);
      };
      if (again && st.find) { go(st.find); return; }
      Dlg().open({ title: 'Find', width: 340, body: '<table class="frm"><tr><th style="width:70px">Find what:</th><td><input class="inp" id="np-q" style="width:100%" value="' + e(st.find || '') + '"></td></tr></table>',
        buttons: [{ label: 'Find Next', def: true, fn: function (ov) { const q = ov.querySelector('#np-q').value; setTimeout(function () { go(q); }, 0); } }, { label: 'Cancel' }] });
    };
    WM().menubar(win, [
      { l: '~File', items: function () {
        return [{ l: '~New', k: 'Ctrl+N', fn: function () { askSave(function () { ta.value = ''; st.path = null; st.dirty = false; title(); }); } },
          { l: '~Open...', k: 'Ctrl+O', fn: function () { askSave(function () { A.fileDlg({ mode: 'open', title: 'Open', dir: st.path ? FS.parent(st.path) : FS.specialPaths().documents, types: A.TXT, onOk: load }); }); } },
          { l: '~Save', k: 'Ctrl+S', fn: function () { doSave(false); } }, { l: 'Save ~As...', fn: function () { doSave(true); } }, '-',
          { l: 'Page Set~up...', dis: true }, { l: '~Print...', k: 'Ctrl+P', dis: true }, '-', { l: 'E~xit', fn: function () { WM().close(win.id); } }];
      } },
      { l: '~Edit', items: function () {
        return [{ l: '~Undo', k: 'Ctrl+Z', fn: function () { ta.focus(); document.execCommand('undo'); } }, '-',
          { l: 'Cu~t', k: 'Ctrl+X', fn: function () { ta.focus(); document.execCommand('cut'); } }, { l: '~Copy', k: 'Ctrl+C', fn: function () { ta.focus(); document.execCommand('copy'); } },
          { l: '~Paste', k: 'Ctrl+V', fn: function () { ta.focus(); if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { document.execCommand('insertText', false, t); }).catch(function () { /* nicht erlaubt */ }); } },
          { l: 'De~lete', k: 'Del', fn: function () { ta.focus(); document.execCommand('delete'); } }, '-',
          { l: '~Find...', k: 'Ctrl+F', fn: function () { findText(false); } }, { l: 'Find ~Next', k: 'F3', fn: function () { findText(true); } }, '-',
          { l: 'Select ~All', k: 'Ctrl+A', fn: function () { ta.focus(); ta.select(); } }, { l: 'Time/~Date', k: 'F5', fn: stamp }];
      } },
      { l: 'F~ormat', items: function () { return [{ l: '~Word Wrap', chk: st.wrap, fn: function () { st.wrap = !st.wrap; ta.classList.toggle('nowrap', !st.wrap); } }, { l: '~Font...', dis: true }]; } },
      { l: '~Help', items: function () { return [{ l: '~Help Topics', dis: true }, '-', { l: '~About Notepad', fn: function () { Dlg().msg('About Notepad', '<b>Notepad</b><br>Version 5.0<br><br>Licensed to Bankhaus Vogt &amp; Cie', 'biginfo'); } }]; } }
    ]);
    function stamp() {
      const s = G.state;
      const t = s ? U.fmtTime(s.clock) + ' ' + U.fmtDate(s.date) : new Date().toLocaleString();
      ta.focus(); document.execCommand('insertText', false, t);
    }
    ta.addEventListener('input', function () { if (!st.dirty) { st.dirty = true; } });
    ta.addEventListener('keydown', function (ev) {
      if (ev.key === 'F5') { ev.preventDefault(); stamp(); }
      else if (ev.key === 'F3') { ev.preventDefault(); findText(true); }
      else if (ev.ctrlKey && !ev.shiftKey) {
        const k = ev.key.toLowerCase();
        if (k === 's') { ev.preventDefault(); doSave(false); } else if (k === 'o') { ev.preventDefault(); win.menus[0].items(win)[1].fn(); } else if (k === 'n') { ev.preventDefault(); win.menus[0].items(win)[0].fn(); } else if (k === 'f') { ev.preventDefault(); findText(false); }
      }
    });
    win.onClose = function () {
      if (!st.dirty) return true;
      askSave(function () { WM().close(win.id, true); });
      return false;
    };
    if (arg && arg.path) load(arg.path);
    else { if (arg && arg.text) { ta.value = arg.text; st.name = arg.name; } title(); }
    setTimeout(function () { ta.focus(); }, 0);
  }
  A.defs.notepad = { title: 'Untitled - Notepad', icon: 'd-txt', w: 560, h: 400, minW: 260, minH: 160, open: notepad };

  /* ================= Bildvorschau ================= */
  function viewer(win, arg) {
    const p = arg && arg.path;
    const src = p ? FS.read(p) : null;
    win.data = { zoom: 0 };
    WM().setTitle(win.id, (p ? FS.name(p) : 'Image') + ' - Image Preview');
    win.body.innerHTML = '<div class="vw-tb"><button type="button" class="btn sm" data-v="fit">Best Fit</button><button type="button" class="btn sm" data-v="one">Actual Size</button><button type="button" class="btn sm" data-v="in">Zoom In</button><button type="button" class="btn sm" data-v="out">Zoom Out</button><span class="tsep"></span>' +
      '<button type="button" class="btn sm" data-v="edit">Edit</button><button type="button" class="btn sm" data-v="wall">Set as Wallpaper</button></div><div class="vw-pane">' + (src && /^data:image\//.test(src) ? '<img alt="">' : '<div class="vw-none">Drawing not available.<br>The file does not contain an image Windows can display.</div>') + '</div>';
    const img = win.body.querySelector('img');
    const pane = win.body.querySelector('.vw-pane');
    const apply = function () {
      if (!img) return;
      if (win.data.zoom === 0) { img.style.maxWidth = '100%'; img.style.maxHeight = '100%'; img.style.width = ''; }
      else { img.style.maxWidth = 'none'; img.style.maxHeight = 'none'; img.style.width = (img.naturalWidth * win.data.zoom) + 'px'; }
    };
    if (img) { img.onload = apply; img.src = src; }
    win.body.querySelector('.vw-tb').addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-v]');
      if (!b) return;
      const v = b.dataset.v;
      if (v === 'fit') win.data.zoom = 0;
      else if (v === 'one') win.data.zoom = 1;
      else if (v === 'in') win.data.zoom = Math.min(8, (win.data.zoom || 1) * 1.5);
      else if (v === 'out') win.data.zoom = Math.max(0.1, (win.data.zoom || 1) / 1.5);
      else if (v === 'edit') { WM().open('paint', { path: p }); return; }
      else if (v === 'wall' && src) { A.st.wall = 'custom'; A.st.custom = src; A.st.mode = 'center'; A.saveSt(); return; }
      apply();
    });
    pane.addEventListener('dblclick', function () { if (p) WM().open('paint', { path: p }); });
  }
  A.defs.viewer = { title: 'Image Preview', icon: 'd-image', w: 520, h: 420, minW: 300, minH: 220, open: viewer };

  /* ================= file:// im Browser ================= */
  A.filePage = function (raw) {
    const parts = FS.parse(raw);
    const url = 'file:///' + FS.join(parts).replace(/\\/g, '/');
    const info = parts.length ? FS.info(parts) : null;
    if (!parts.length || parts[0].toLowerCase() === 'my computer') {
      return { title: 'My Computer', html: '<div class="fp"><h1>My Computer</h1><ul class="fp-l"><li><a href="#/f?p=A%3A%5C">3½ Floppy (A:)</a></li><li><a href="#/f?p=C%3A%5C">Local Disk (C:)</a></li></ul></div>' };
    }
    if (!info) return { title: 'Cannot find server', html: '<div class="ie-error"><h1>Cannot find \'' + e(url) + '\'</h1><p>Make sure the path or Internet address is correct.</p><hr><p class="muted">Windows cannot find the file. If you typed the address, check the spelling.</p></div>' };
    const name = FS.join(info.path);
    if (info.type === 'dir') {
      const list = FS.list(info.path);
      const up = info.path.length > 1 ? '<li><a href="#/f?p=' + encodeURIComponent(FS.join(info.path.slice(0, -1))) + '">[Up one level]</a></li>' : '';
      return { title: name, html: '<div class="fp"><h1>' + e(name) + '</h1><ul class="fp-l">' + up + list.map(function (f) {
        return '<li><svg class="ico"><use href="#' + WM().iconFor(f) + '"/></svg> <a href="#/f?p=' + encodeURIComponent(FS.join(f.path)) + '">' + e(f.name) + '</a>' + (f.type === 'file' ? ' <span class="muted">' + A.kb(f.size) + '</span>' : '') + '</li>';
      }).join('') + '</ul></div>' };
    }
    const body = info.node.body || '';
    if (info.mime === 'image' && /^data:image\//.test(body)) return { title: info.name, html: '<div class="fp fp-img"><img src="' + e(body) + '" alt=""></div>' };
    if (info.mime === 'html') return { title: info.name, html: '<iframe class="fp-frame" sandbox="" srcdoc="' + e(body) + '"></iframe>' };
    return { title: info.name, html: '<pre class="fp-pre">' + e(body.replace(/\r\n/g, '\n')) + '</pre>' };
  };

  /* ================= Systemsteuerung: Einzelne Dialoge ================= */
  A.applet = function (k) {
    if (k === 'display') displayProps();
    else if (k === 'sound') soundProps();
    else if (k === 'datetime') dateProps();
    else if (k === 'mouse') mouseProps();
    else if (k === 'inet') { if (PBS.Browser.options) PBS.Browser.options(); }
    else if (k === 'addrem') addRemove();
    else if (k === 'regional') PBS.L.dialog();
    else Dlg().msg('Users and Passwords', 'You must be a member of the Administrators group to use Users and Passwords.<br>Please contact the Helpdesk (ext. 4411).', 'err');
  };
  function tabs(list) { return '<div class="wtabs">' + list.map(function (t, i) { return '<span class="wtab' + (i === 0 ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</span>'; }).join('') + '</div>'; }
  function wireTabs(ov, panes, after) {
    ov.addEventListener('click', function (ev) {
      const t = ev.target.closest('.wtab');
      if (!t || !panes[t.dataset.t]) return;
      ov.querySelectorAll('.wtab').forEach(function (x) { x.classList.toggle('on', x === t); });
      ov.querySelector('.wpane').innerHTML = panes[t.dataset.t]();
      if (after) after(t.dataset.t);
    });
  }
  function displayProps() {
    const st = JSON.parse(JSON.stringify(A.st));
    const preview = function () {
      let w = WALLS[st.wall];
      if (st.wall === 'custom' && st.custom) w = { img: 'url("' + st.custom + '")' };
      const sc = SCHEMES[st.scheme] || SCHEMES.standard;
      return '<div class="mon"><div class="mon-scr" style="background-color:' + e(st.color) + ';' + (w && w.img ? 'background-image:' + e(w.img) + ';background-size:' + (st.mode === 'stretch' ? '100% 100%' : st.mode === 'tile' ? (w.size && w.size !== 'cover' && w.size !== 'auto' ? e(w.size) : '25%') : 'contain') + ';background-repeat:' + (st.mode === 'tile' ? 'repeat' : 'no-repeat') + ';background-position:center' : '') + '">' +
        '<div class="mon-win" style="background:' + sc.win + '"><div style="background:linear-gradient(90deg,' + sc.tb1 + ',' + sc.tb2 + ')"></div></div></div><div class="mon-base"></div></div>';
    };
    const COLORS = ['#3a6ea5', '#008080', '#000080', '#004040', '#400040', '#000000', '#808080', '#5a7e4e', '#806040', '#a04040'];
    const panes = {
      bg: function () {
        return preview() + '<div class="dp-row"><div><b>Wallpaper</b><div class="dp-list">' + Object.keys(WALLS).concat(st.custom ? ['custom'] : []).map(function (k) { return '<div class="dp-it' + (st.wall === k ? ' sel' : '') + '" data-wall="' + k + '">' + e(k === 'custom' ? '(Picture from Paint)' : WALLS[k].label) + '</div>'; }).join('') + '</div></div>' +
          '<div><b>Picture Display</b><br><select class="inp" data-o="mode"><option value="center"' + (st.mode === 'center' ? ' selected' : '') + '>Center</option><option value="tile"' + (st.mode === 'tile' ? ' selected' : '') + '>Tile</option><option value="stretch"' + (st.mode === 'stretch' ? ' selected' : '') + '>Stretch</option></select>' +
          '<br><br><b>Background colour</b><div class="dp-cols">' + COLORS.map(function (c) { return '<span class="dp-col' + (st.color === c ? ' sel' : '') + '" data-col="' + c + '" style="background:' + c + '"></span>'; }).join('') + '</div></div></div>';
      },
      saver: function () {
        return preview().replace('class="mon-scr"', 'class="mon-scr" style="background:#000"') + '<div class="dp-row"><div><b>Screen Saver</b><br><select class="inp" data-o="saver"><option value="none"' + (st.saver === 'none' ? ' selected' : '') + '>(None)</option><option value="marquee"' + (st.saver === 'marquee' ? ' selected' : '') + '>Marquee Display</option><option value="starfield"' + (st.saver === 'starfield' ? ' selected' : '') + '>Starfield Simulation</option><option value="mystify"' + (st.saver === 'mystify' ? ' selected' : '') + '>Mystify</option></select> <button type="button" class="btn sm" data-dp="preview">Preview</button>' +
          '<br><br>Wait: <input class="inp num" data-o="wait" size="3" value="' + e(st.wait) + '"> minutes<br><br>Marquee text: <input class="inp" data-o="marquee" size="24" maxlength="40" value="' + e(st.marquee) + '"></div></div>' +
          '<fieldset class="box"><legend>Energy saving features of monitor</legend>These settings are managed by your system administrator.</fieldset>';
      },
      look: function () {
        return preview() + '<div class="dp-row"><div><b>Scheme</b><br><select class="inp" data-o="scheme">' + Object.keys(SCHEMES).map(function (k) { return '<option value="' + k + '"' + (st.scheme === k ? ' selected' : '') + '>' + e(SCHEMES[k].label) + '</option>'; }).join('') + '</select></div></div>';
      },
      settings: function () {
        return '<div class="mon"><div class="mon-scr" style="background:#3a6ea5"></div><div class="mon-base"></div></div><p>Display: Plug and Play Monitor on Standard VGA Graphics Adapter</p>' +
          '<div class="dp-row"><div><b>Colors</b><br><select class="inp" disabled><option>High Color (16 bit)</option></select></div><div><b>Screen area</b><br>' + innerWidth + ' by ' + innerHeight + ' pixels</div></div><p class="muted small">Display settings are managed by your system administrator.</p>';
      }
    };
    Dlg().open({
      title: 'Display Properties', width: 420, cls: 'opts', icon: 'd-control',
      body: tabs([['bg', 'Background'], ['saver', 'Screen Saver'], ['look', 'Appearance'], ['settings', 'Settings']]) + '<div class="wpane">' + panes.bg() + '</div>',
      onOpen: function (ov) {
        const repaint = function () { const on = ov.querySelector('.wtab.on').dataset.t; ov.querySelector('.wpane').innerHTML = panes[on](); };
        wireTabs(ov, panes);
        ov.addEventListener('click', function (ev) {
          const w = ev.target.closest('[data-wall]'); if (w) { st.wall = w.dataset.wall; if (WALLS[st.wall] && WALLS[st.wall].mode) st.mode = WALLS[st.wall].mode; repaint(); }
          const c = ev.target.closest('[data-col]'); if (c) { st.color = c.dataset.col; repaint(); }
          const pv = ev.target.closest('[data-dp=preview]'); if (pv && st.saver !== 'none') { const prev = A.st; A.st = st; setTimeout(function () { A.saverStart(st.saver); A.st = prev; }, 150); }
        });
        ov.addEventListener('change', function (ev) { const k = ev.target.dataset && ev.target.dataset.o; if (!k) return; st[k] = k === 'wait' ? Math.max(1, Math.min(60, +ev.target.value || 15)) : ev.target.value; if (k !== 'marquee' && k !== 'wait') repaint(); });
        ov.addEventListener('input', function (ev) { if (ev.target.dataset && ev.target.dataset.o === 'marquee') st.marquee = ev.target.value; });
      },
      buttons: [{ label: 'OK', def: true, fn: function () { Object.assign(A.st, st); A.saveSt(); } }, { label: 'Cancel' }, { label: 'Apply', fn: function () { Object.assign(A.st, st); A.saveSt(); return false; } }]
    });
  }
  function soundProps() {
    const B = PBS.Browser;
    const EVENTS = [['ring', 'Telephone ring'], ['fax', 'Incoming fax'], ['ding', 'Asterisk'], ['chord', 'Critical Stop'], ['notify', 'New Mail Notification'], ['printer', 'Printing'], ['click', 'Start Navigation']];
    Dlg().open({
      title: 'Sounds and Multimedia Properties', width: 400, cls: 'opts', icon: 't-vol',
      body: tabs([['s', 'Sounds']]) + '<div class="wpane"><fieldset class="box"><legend>Sound Volume</legend>Low <input type="range" min="0" max="100" value="' + Math.round(B.st.vol * 100) + '" id="sp-vol"> High<br><label><input type="checkbox" id="sp-mute"' + (B.st.sound ? '' : ' checked') + '> Mute all sounds</label></fieldset>' +
        '<fieldset class="box"><legend>Sound Events</legend><div class="sp-list">' + EVENTS.map(function (ev) { return '<div class="sp-it"><svg class="ico"><use href="#t-vol"/></svg> ' + ev[1] + ' <button type="button" class="btn sm" data-snd="' + ev[0] + '">▶</button></div>'; }).join('') + '</div></fieldset></div>',
      onOpen: function (ov) {
        ov.addEventListener('click', function (ev) { const b = ev.target.closest('[data-snd]'); if (b && Snd[b.dataset.snd]) Snd[b.dataset.snd](b.dataset.snd === 'printer' ? 1 : undefined); });
      },
      buttons: [{ label: 'OK', def: true, fn: function (ov) { B.st.vol = ov.querySelector('#sp-vol').value / 100; B.st.sound = !ov.querySelector('#sp-mute').checked; B.save(); } }, { label: 'Cancel' }]
    });
  }
  function dateProps() {
    const s = G.state;
    const iso = s ? s.date : new Date().toISOString().slice(0, 10);
    const mins = s ? s.clock : new Date().getHours() * 60 + new Date().getMinutes();
    const d0 = U.toDate(iso.slice(0, 8) + '01');
    const first = (d0.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7), 0)).getUTCDate();
    let cal = '<table class="cal"><tr><th>M</th><th>T</th><th>W</th><th>T</th><th>F</th><th>S</th><th>S</th></tr><tr>';
    for (let i = 0; i < first; i++) cal += '<td></td>';
    for (let d = 1; d <= days; d++) { cal += '<td' + (d === +iso.slice(8, 10) ? ' class="on"' : '') + '>' + d + '</td>'; if ((first + d) % 7 === 0) cal += '</tr><tr>'; }
    cal += '</tr></table>';
    const h = Math.floor(mins / 60) % 12, m = mins % 60;
    const ang = function (v, max) { return (v / max * 360 - 90) * Math.PI / 180; };
    const hx = 50 + 24 * Math.cos(ang(h + m / 60, 12)), hy = 50 + 24 * Math.sin(ang(h + m / 60, 12));
    const mx = 50 + 36 * Math.cos(ang(m, 60)), my = 50 + 36 * Math.sin(ang(m, 60));
    let ticks = '';
    for (let i = 0; i < 12; i++) { const a = ang(i, 12); ticks += '<rect x="' + (50 + 42 * Math.cos(a) - 2) + '" y="' + (50 + 42 * Math.sin(a) - 2) + '" width="4" height="4" fill="#0a246a"/>'; }
    Dlg().open({
      title: 'Date/Time Properties', width: 420, cls: 'opts', icon: 'i-clock',
      body: tabs([['d', 'Date & Time'], ['z', 'Time Zone']]) + '<div class="wpane"><div class="dt-row"><fieldset class="box"><legend>Date</legend><b>' + U.monthName(iso) + ' ' + iso.slice(0, 4) + '</b>' + cal + '</fieldset>' +
        '<fieldset class="box"><legend>Time</legend><svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#fff" stroke="#808080"/>' + ticks + '<line x1="50" y1="50" x2="' + hx + '" y2="' + hy + '" stroke="#000" stroke-width="4"/><line x1="50" y1="50" x2="' + mx + '" y2="' + my + '" stroke="#000" stroke-width="2.5"/></svg><br><input class="inp" readonly value="' + U.fmtTime(mins) + '" size="8"></fieldset></div>' +
        '<p>Current time zone: W. Europe Standard Time</p></div>',
      onOpen: function (ov) { wireTabs(ov, { d: function () { return ov.querySelector('.wpane').innerHTML; }, z: function () { return '<p><select class="inp" disabled style="width:100%"><option>(GMT+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna</option></select></p><div class="tz-map"></div><label><input type="checkbox" checked disabled> Automatically adjust clock for daylight saving changes</label>'; } }); },
      buttons: [{ label: 'OK', def: true, fn: function () { Dlg().msg('Date/Time Properties', 'A required privilege is not held by the client.<br>You do not have the proper privilege level to change the System Time.', 'err'); } }, { label: 'Cancel' }]
    });
  }
  function mouseProps() {
    Dlg().open({
      title: 'Mouse Properties', width: 380, cls: 'opts', icon: 'd-exe',
      body: tabs([['b', 'Buttons'], ['p', 'Pointers'], ['m', 'Motion']]) + '<div class="wpane"><fieldset class="box"><legend>Button configuration</legend><label><input type="radio" name="mb" checked> Right-handed</label> <label><input type="radio" name="mb"> Left-handed</label></fieldset>' +
        '<fieldset class="box"><legend>Double-click speed</legend>Slow <input type="range" min="1" max="10" value="5"> Fast<div class="mp-test" title="Double-click the folder to test your setting"><svg><use href="#d-folder"/></svg><br>Test area</div></fieldset></div>',
      onOpen: function (ov) {
        const t = ov.querySelector('.mp-test');
        t.ondblclick = function () { const u = t.querySelector('use'); u.setAttribute('href', u.getAttribute('href') === '#d-folder' ? '#d-docs' : '#d-folder'); };
      },
      buttons: [{ label: 'OK', def: true }, { label: 'Cancel' }, { label: 'Apply', dis: true }]
    });
  }
  function addRemove() {
    const progs = [['Internet Explorer 6 SP1', '11.4MB'], ['Office Suite 2000 Professional', '182MB'], ['PBS/Web Client 4.2.1', '12.4MB'], ['Host Access 3270 Terminal Emulation', '24.1MB'], ['Virus Scanner 4.5 (definitions 03/2003)', '18.7MB'], [tr('Kursinformation Telekurs 3.1', 'Telekurs Price Information 3.1'), '9.2MB']];
    Dlg().open({
      title: 'Add/Remove Programs', width: 480, icon: 'd-exe',
      body: '<div class="ar"><div class="ar-side"><div class="ar-t on">Change or Remove Programs</div><div class="ar-t">Add New Programs</div><div class="ar-t">Add/Remove Windows Components</div></div><div class="ar-list"><b>Currently installed programs:</b>' +
        progs.map(function (p) { return '<div class="ar-it"><svg class="ico"><use href="#d-exe"/></svg> ' + e(p[0]) + '<span>Size ' + p[1] + '</span></div>'; }).join('') + '<p class="muted small">Changing or removing programs has been restricted by your system administrator.</p></div></div>',
      buttons: [{ label: 'Close', def: true }]
    });
  }
})(window.PBS);
