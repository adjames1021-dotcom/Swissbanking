/* Dateisystem des Arbeitsplatzes ZH-BS64-0217 (Laufwerk C:, Diskette A:, Papierkorb).
   Baum in localStorage; Spiel und Programme lesen und schreiben darüber. Keine DOM-Abhängigkeit. */
(function (PBS) {
  'use strict';

  const U = PBS.U;
  const tr = PBS.L.t;
  const KEY = 'pbs-vogt-fs-v1';
  const FS = PBS.FS = {};

  function now() { return (PBS.Game && PBS.Game.state) ? PBS.Game.state.date : '2003-03-03'; }
  function user() { return (PBS.Game && PBS.Game.state && PBS.Game.state.user) ? PBS.Game.state.user.id : 'E10001'; }

  // Knoten
  function dir(extra) { return Object.assign({ type: 'dir', created: now(), modified: now(), children: {} }, extra); }
  function file(body, extra) { return Object.assign({ type: 'file', mime: 'text', body: body || '', created: now(), modified: now() }, extra); }

  let tree = null;
  FS.root = function () { return tree; };
  FS.lastError = '';

  // Änderungen melden (Explorer-Fenster, Desktop); gebündelt pro Ereignisschleife
  const listeners = [];
  let queued = false;
  FS.onChange = function (fn) { listeners.push(fn); };
  function notify() {
    if (queued || !listeners.length) return;
    queued = true;
    setTimeout(function () { queued = false; listeners.forEach(function (f) { try { f(); } catch (x) { /* Anzeige darf das Speichern nicht stören */ } }); }, 0);
  }

  // Kapazität: C: 4 GB (davon 1.6 GB Windows und Programme), A: 1.44 MB
  const CAP = { 'C:': 4294967296, 'A:': 1457664 };
  const BASEUSE = { 'C:': 1717986918, 'A:': 0 };
  function sizeOf(n) {
    if (!n) return 0;
    if (n.type === 'file') return (n.body || '').length;
    return Object.keys(n.children || {}).reduce(function (t, k) { return t + sizeOf(n.children[k]); }, 0);
  }
  FS.size = function (p) { return sizeOf(FS.node(p)); };
  FS.drive = function (letter) {
    const d = letter.toUpperCase().replace(/[^A-Z:]/g, '').slice(0, 2);
    const used = (BASEUSE[d] || 0) + sizeOf(tree.children[d]);
    return { cap: CAP[d] || 0, used: used, free: Math.max(0, (CAP[d] || 0) - used) };
  };

  /* ---------- Pfad ---------- */
  // Interne Darstellung: Array von Namen, beginnend mit dem Laufwerk ('C:')
  FS.parse = function (p) {
    if (Array.isArray(p)) return p.slice();
    let s = String(p || '').trim().replace(/\//g, '\\');
    const parts = [];
    s.split('\\').forEach(function (seg) {
      seg = seg.trim();
      if (!seg || seg === '.') return;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    });
    return parts;
  };
  FS.join = function (parts) { return parts.join('\\') + (parts.length === 1 ? '\\' : ''); };
  FS.name = function (p) { const a = FS.parse(p); return a[a.length - 1] || ''; };
  FS.parent = function (p) { const a = FS.parse(p); a.pop(); return a; };
  FS.ext = function (name) { const m = /\.([a-z0-9]+)$/i.exec(FS.name(name)); return m ? m[1].toLowerCase() : ''; };

  function nodeAt(parts) {
    let n = tree;
    for (let i = 0; i < parts.length; i++) {
      if (!n || n.type !== 'dir' || !n.children) return null;
      // Laufwerke und Namen ohne Rücksicht auf Gross-/Kleinschreibung
      const key = Object.keys(n.children).find(function (k) { return k.toLowerCase() === parts[i].toLowerCase(); });
      if (!key) return null;
      n = n.children[key];
    }
    return n;
  }
  FS.node = function (p) { return nodeAt(FS.parse(p)); };
  FS.exists = function (p) { return !!FS.node(p); };
  FS.isDir = function (p) { const n = FS.node(p); return !!n && n.type === 'dir'; };

  // Tatsächlich gespeicherter Name (für die Anzeige, mit korrekter Schreibweise)
  FS.realName = function (p) {
    const parts = FS.parse(p);
    const par = nodeAt(parts.slice(0, -1));
    if (!par || !par.children) return parts[parts.length - 1];
    const key = Object.keys(par.children).find(function (k) { return k.toLowerCase() === parts[parts.length - 1].toLowerCase(); });
    return key || parts[parts.length - 1];
  };
  FS.realPath = function (p) {
    const parts = FS.parse(p);
    const out = [];
    let n = tree;
    for (let i = 0; i < parts.length; i++) {
      if (!n.children) return null;
      const key = Object.keys(n.children).find(function (k) { return k.toLowerCase() === parts[i].toLowerCase(); });
      if (!key) return null;
      out.push(key);
      n = n.children[key];
    }
    return out;
  };

  /* ---------- Lesen ---------- */
  FS.list = function (p, opts) {
    opts = opts || {};
    const n = FS.node(p);
    if (!n || n.type !== 'dir') return [];
    const parts = FS.realPath(p) || FS.parse(p);
    return Object.keys(n.children).filter(function (k) {
      return opts.hidden || !n.children[k].hidden;
    }).map(function (k) {
      const c = n.children[k];
      return { name: k, path: parts.concat([k]), type: c.type, mime: c.mime, size: c.type === 'file' ? (c.body || '').length : 0, modified: c.modified, created: c.created, ro: c.ro, system: c.system, icon: c.icon, secret: c.secret, target: c.target, node: c };
    }).sort(function (a, b) {
      if ((a.type === 'dir') !== (b.type === 'dir')) return a.type === 'dir' ? -1 : 1;
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
  };
  FS.read = function (p) { const n = FS.node(p); return n && n.type === 'file' ? n.body : null; };
  FS.info = function (p) {
    const n = FS.node(p);
    if (!n) return null;
    const parts = FS.realPath(p) || FS.parse(p);
    return { name: parts[parts.length - 1], path: parts, type: n.type, mime: n.mime, size: n.type === 'file' ? (n.body || '').length : 0, modified: n.modified, created: n.created, ro: n.ro, system: n.system, hidden: n.hidden, secret: n.secret, target: n.target, icon: n.icon, node: n };
  };

  /* ---------- Schreiben ---------- */
  function ensureDir(parts) {
    let n = tree;
    for (let i = 0; i < parts.length; i++) {
      if (!n.children) n.children = {};
      const key = Object.keys(n.children).find(function (k) { return k.toLowerCase() === parts[i].toLowerCase(); });
      if (key) { n = n.children[key]; if (n.type !== 'dir') return null; }
      else { n.children[parts[i]] = dir(); n = n.children[parts[i]]; }
    }
    return n;
  }
  FS.mkdir = function (p) {
    const parts = FS.parse(p);
    if (!parts.length) return null;
    const n = ensureDir(parts);
    if (n) { touch(parts); FS.save(); }
    return n;
  };
  FS.write = function (p, body, extra) {
    const parts = FS.parse(p);
    if (parts.length < 2) return null;
    const par = ensureDir(parts.slice(0, -1));
    if (!par) return null;
    const nm = parts[parts.length - 1];
    const existingKey = Object.keys(par.children).find(function (k) { return k.toLowerCase() === nm.toLowerCase(); });
    if (existingKey && par.children[existingKey].ro && !(extra && extra.force)) { FS.lastError = 'ro'; return null; }
    const prev = existingKey ? par.children[existingKey] : null;
    const drv = parts[0].toUpperCase();
    if (CAP[drv] && FS.drive(drv).free + (prev ? (prev.body || '').length : 0) < String(body || '').length) { FS.lastError = 'full'; return null; }
    if (existingKey && existingKey !== nm) delete par.children[existingKey];
    par.children[nm] = file(body, Object.assign({ mime: FS.mimeFor(nm), created: prev ? prev.created : now() }, extra || {}));
    par.children[nm].modified = now();
    touch(parts.slice(0, -1));
    FS.save();
    return par.children[nm];
  };
  // Bequem fürs Spiel: legt Zwischenordner an und schreibt
  FS.put = function (p, body, extra) { return FS.write(p, body, extra); };

  FS.remove = function (p, toRecycle) {
    const parts = FS.realPath(p);
    if (!parts || parts.length < 2) return false;
    const par = nodeAt(parts.slice(0, -1));
    const nm = parts[parts.length - 1];
    const n = par.children[nm];
    if (!n || n.system || n.ro) { FS.lastError = 'denied'; return false; }
    if (toRecycle !== false) {
      const bin = ensureDir(['Recycled']);
      let rn = nm, i = 1;
      while (bin.children[rn]) rn = nm.replace(/(\.[^.]+)?$/, ' (' + (i++) + ')$1');
      n._from = FS.join(parts);
      bin.children[rn] = n;
    }
    delete par.children[nm];
    touch(parts.slice(0, -1));
    FS.save();
    return true;
  };
  FS.rename = function (p, newName) {
    const parts = FS.realPath(p);
    if (!parts || parts.length < 2) return false;
    newName = String(newName).replace(/[\\\/:*?"<>|]/g, '').trim();
    if (!newName) return false;
    const par = nodeAt(parts.slice(0, -1));
    const nm = parts[parts.length - 1];
    if (par.children[nm].system || par.children[nm].ro) { FS.lastError = 'denied'; return false; }
    if (Object.keys(par.children).some(function (k) { return k.toLowerCase() === newName.toLowerCase() && k !== nm; })) { FS.lastError = 'exists'; return false; }
    const n = par.children[nm];
    delete par.children[nm];
    n.modified = now();
    if (n.type === 'file') n.mime = FS.mimeFor(newName);
    par.children[newName] = n;
    touch(parts.slice(0, -1));
    FS.save();
    return true;
  };
  FS.move = function (p, destDir) {
    const parts = FS.realPath(p), dest = FS.realPath(destDir);
    if (!parts || !dest) return false;
    const destNode = nodeAt(dest);
    if (!destNode || destNode.type !== 'dir') return false;
    if (FS.join(dest).toLowerCase().indexOf(FS.join(parts).toLowerCase()) === 0) return false; // nicht in sich selbst
    const par = nodeAt(parts.slice(0, -1));
    const nm = parts[parts.length - 1];
    const n = par.children[nm];
    if (!n || n.system || n.ro) { FS.lastError = 'denied'; return false; }
    if (destNode.children[nm]) { FS.lastError = 'exists'; return false; }
    destNode.children[nm] = n;
    delete par.children[nm];
    touch(dest); touch(parts.slice(0, -1));
    FS.save();
    return true;
  };
  FS.restore = function (recycledName) {
    const bin = FS.node('Recycled');
    if (!bin || !bin.children[recycledName]) return false;
    const n = bin.children[recycledName];
    const back = FS.parse(n._from || ('C:\\' + recycledName));
    const par = ensureDir(back.slice(0, -1));
    if (!par) return false;
    delete n._from;
    par.children[back[back.length - 1]] = n;
    delete bin.children[recycledName];
    FS.save();
    return true;
  };
  FS.emptyBin = function () { const bin = FS.node('Recycled'); if (bin) bin.children = {}; FS.save(); };
  FS.binCount = function () { const bin = FS.node('Recycled'); return bin ? Object.keys(bin.children).length : 0; };

  function touch(parts) { const n = nodeAt(parts); if (n) n.modified = now(); }

  FS.mimeFor = function (name) {
    const x = FS.ext(name);
    if (['txt', 'log', 'ini', 'nfo', 'me', 'bat', 'sys', 'dat'].indexOf(x) >= 0) return 'text';
    if (['doc', 'rtf', 'wri'].indexOf(x) >= 0) return 'doc';
    if (['xls', 'csv'].indexOf(x) >= 0) return 'xls';
    if (['bmp', 'png', 'jpg', 'jpeg', 'gif'].indexOf(x) >= 0) return 'image';
    if (x === 'url') return 'url';
    if (x === 'lnk') return 'lnk';
    if (x === 'htm' || x === 'html') return 'html';
    return 'text';
  };

  /* ---------- Vertrauliche Dateien (für Razzia / Datendiebstahl) ---------- */
  FS.secretFiles = function () {
    const out = [];
    (function walk(parts) {
      const n = nodeAt(parts);
      if (!n || !n.children) return;
      Object.keys(n.children).forEach(function (k) {
        const c = n.children[k];
        const pp = parts.concat([k]);
        if (c.type === 'file' && c.secret) out.push(FS.join(pp));
        else if (c.type === 'dir' && k !== 'Recycled') walk(pp);
      });
    })(['C:']);
    return out;
  };

  // Kundendaten aus PBS/Web (Exporte, Auszüge): auf der Platte und im Papierkorb getrennt gezählt
  FS.clientFiles = function () {
    const out = { live: [], bin: [] };
    (function walk(n, parts, inBin) {
      Object.keys(n.children || {}).forEach(function (k) {
        const c = n.children[k], pp = parts.concat([k]);
        if (c.type === 'file' && c.client) (inBin ? out.bin : out.live).push(inBin ? k : FS.join(pp));
        else if (c.type === 'dir') walk(c, pp, inBin || (!parts.length && k === 'Recycled'));
      });
    })(tree || { children: {} }, [], false);
    return out;
  };
  // Neues Spiel: vom Spiel erzeugte Dateien (Exporte, Auszüge, Protokolle) verschwinden
  FS.purgeGame = function () {
    if (!tree) return;
    (function walk(n) {
      Object.keys(n.children || {}).forEach(function (k) {
        const c = n.children[k];
        if (c.game) delete n.children[k];
        else if (c.type === 'dir') walk(c);
      });
    })(tree);
    FS.save();
  };

  /* ---------- Speichern / Laden ---------- */
  FS.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(tree)); } catch (e) { /* voll oder nicht verfügbar */ }
    notify();
  };
  // Kopie in einen Ordner; bei Namensgleichheit "Copy of ..."
  FS.copy = function (p, destDir) {
    const src = FS.node(p), dest = FS.node(destDir);
    if (!src || !dest || dest.type !== 'dir') { FS.lastError = 'notfound'; return null; }
    const parts = FS.realPath(p), dparts = FS.realPath(destDir);
    if (src.type === 'dir' && FS.join(dparts).toLowerCase().indexOf(FS.join(parts).toLowerCase()) === 0) { FS.lastError = 'self'; return null; }
    let nm = parts[parts.length - 1];
    if (Object.keys(dest.children).some(function (k) { return k.toLowerCase() === nm.toLowerCase(); })) {
      nm = 'Copy of ' + nm;
      let i = 2;
      while (Object.keys(dest.children).some(function (k) { return k.toLowerCase() === nm.toLowerCase(); })) nm = 'Copy (' + (i++) + ') of ' + parts[parts.length - 1];
    }
    const drv = dparts[0].toUpperCase();
    if (CAP[drv] && FS.drive(drv).free < sizeOf(src)) { FS.lastError = 'full'; return null; }
    const clone = JSON.parse(JSON.stringify(src));
    (function strip(n) { delete n.system; n.modified = now(); if (n.children) Object.keys(n.children).forEach(function (k) { strip(n.children[k]); }); })(clone);
    dest.children[nm] = clone;
    touch(dparts);
    FS.save();
    return dparts.concat([nm]);
  };
  // Endgültig löschen (wie DEL in der Eingabeaufforderung, ohne Papierkorb)
  FS.destroy = function (p) {
    const parts = FS.realPath(p);
    if (!parts || parts.length < 2) { FS.lastError = 'notfound'; return false; }
    const par = nodeAt(parts.slice(0, -1));
    const n = par.children[parts[parts.length - 1]];
    if (n.system || n.ro) { FS.lastError = 'denied'; return false; }
    delete par.children[parts[parts.length - 1]];
    touch(parts.slice(0, -1));
    FS.save();
    return true;
  };
  FS.load = function () {
    try { const raw = localStorage.getItem(KEY); if (raw) { tree = JSON.parse(raw); return true; } } catch (e) { /* defekt */ }
    return false;
  };
  FS.reset = function () { try { localStorage.removeItem(KEY); } catch (e) { /* */ } tree = null; FS.seed(); };

  /* ---------- Grundbestand ---------- */
  FS.seed = function (force) {
    if (!force && FS.load()) return;
    const u = user();
    tree = dir();
    tree.children = {};
    const C = tree.children['C:'] = dir({ label: 'Local Disk', drive: 'hdd' });
    const A = tree.children['A:'] = dir({ label: '3½ Floppy', drive: 'floppy' });
    tree.children['Recycled'] = dir({ system: true });
    A.children = {};

    // WINNT (Systemdateien, schreibgeschützt)
    const winnt = C.children['WINNT'] = dir({ system: true });
    winnt.children = {
      'win.ini': file('[windows]\r\nload=\r\nrun=\r\nNullPort=None\r\n[Desktop]\r\nWallpaper=(None)\r\nTileWallpaper=0\r\n', { ro: true, system: true }),
      'system.ini': file('[boot]\r\nshell=Explorer.exe\r\n[drivers]\r\nwave=mmdrv.dll\r\n', { ro: true, system: true }),
      'notepad.exe': file('MZ', { mime: 'exe', ro: true, system: true, app: 'notepad' }),
      'system32': dir({ system: true, ro: true })
    };
    winnt.children.system32.children = { 'drivers': dir({ system: true, ro: true }), 'cmd.exe': file('MZ', { mime: 'exe', system: true, ro: true, app: 'cmd' }) };

    // Programme (schreibgeschützt)
    const prog = C.children['Program Files'] = dir({ system: true });
    prog.children = {
      'Internet Explorer': dir({ ro: true, children: { 'iexplore.exe': file('MZ', { mime: 'exe', ro: true, app: 'ie' }) } }),
      'PBS': dir({ ro: true, children: { 'pbsweb.exe': file('MZ', { mime: 'exe', ro: true, app: 'pbs' }), 'readme.txt': file('PBS/Web – Private Banking System\r\nRelease 4.2.1\r\n(c) 1997-2003 Bankhaus Vogt & Cie, Informatik / IT-Services\r\n\r\nStart the application from the desktop or via the intranet.\r\n', { ro: true }) } })
    };

    // Benutzerprofil
    const prof = C.children['Documents and Settings'] = dir({});
    const me = prof.children[u] = dir({});
    const desk = me.children['Desktop'] = dir({});
    const docs = me.children['My Documents'] = dir({});

    // Desktop-Verknüpfungen
    desk.children = {
      'Notes to self.txt': file(tr('- change token PIN (every quarter!! post-it on screen for now)\r\n- ask R.G. in IT why the Fakturierung test page is still on the server\r\n- book ski week\r\n- Dr. Vogt wants Q figures BEFORE partners\' meeting\r\n', '- change token PIN (every quarter!! post-it on screen for now)\r\n- ask R.G. in IT why the FAKT billing test page is still on the server\r\n- book ski week\r\n- Dr. Vogt wants Q figures BEFORE partners\' meeting\r\n')),
      'Welcome.txt': file('Workstation ZH-BS64-0217\r\nUser ' + u + '\r\n\r\nMy Computer: files on this machine.\r\nInternet Explorer: intranet and PBS/Web.\r\nFiles saved here are not backed up by IT.\r\n')
    };

    // Eigene Dateien
    docs.children = {
      'Private': dir({ children: {
        'passwords.txt': file(tr('(delete this!)\r\nWindows: ********\r\nE-Banking private: ********\r\nNuméro personnel (GE): ********\r\n', '(delete this!)\r\nWindows: ********\r\nE-banking private: ********\r\nPersonal number (GE): ********\r\n'), { secret: true }),
        'numbered account.txt': file('Own numbered account, Vogt & Cie.\r\nBonus is credited here in January.\r\nNot to be discussed.\r\n', { secret: true })
      } }),
      'Budget_PB_2003.xls': file('Private Banking, budget 2003\r\n\r\nRevenue target;AuM fee;3\'400\'000\r\nRevenue target;Commissions;650\'000\r\nCost;Personnel;2\'300\'000\r\nCost;Premises & IT;2\'500\'000\r\n', { mime: 'xls' }),
      'Weisung GwG 1998.doc': file(tr('BANKHAUS VOGT & CIE · WEISUNG\r\n\r\nGeldwäschereigesetz (GwG), in Kraft seit 1. April 1998.\r\n\r\nFür jede neue Geschäftsbeziehung ist der wirtschaftlich Berechtigte auf Formular A festzuhalten. Verdachtsfälle meldet ausschliesslich die Compliance an die MROS.\r\n', 'BANKHAUS VOGT & CIE · DIRECTIVE\r\n\r\nAnti-Money Laundering Act (GwG), in force since 1 April 1998.\r\n\r\nFor every new business relationship the beneficial owner must be recorded on Form A. Suspicious cases are reported to MROS by Compliance only.\r\n'), { mime: 'doc', ro: true })
    };
    FS.save();
  };

  FS.specialPaths = function () {
    const u = user();
    // Erste Anmeldung eines anderen Benutzers: Windows legt das Profil an
    if (tree && !nodeAt(['C:', 'Documents and Settings', u])) { ensureDir(['C:', 'Documents and Settings', u, 'Desktop']); ensureDir(['C:', 'Documents and Settings', u, 'My Documents']); FS.save(); }
    return {
      desktop: ['C:', 'Documents and Settings', u, 'Desktop'],
      documents: ['C:', 'Documents and Settings', u, 'My Documents'],
      home: ['C:', 'Documents and Settings', u]
    };
  };

  FS.init = function () { if (!tree) FS.seed(); };
})(window.PBS);
