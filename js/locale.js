/* Anzeigewährung: Wer "US dollars" wählt, sieht Frankenbeträge zum Tageskurs in USD umgerechnet.
   Die Buchhaltung bleibt in CHF; umgerechnet wird nur, was am Bildschirm eindeutig als CHF-Betrag
   erkennbar ist ("CHF 1'250" im Text, Zahlen in Tabellenspalten mit "CHF" im Kopf). Eingabefelder,
   Kursangaben wie USD/CHF und der Währungsrechner bleiben unverändert. */
(function (PBS) {
  'use strict';

  const L = PBS.L, U = PBS.U;
  const SKIP = 'script, style, textarea, input, select, option, svg, .calc, .nolc, .cmd, .np-text, .batch';
  let busy = false;

  function rate() { const s = PBS.Game && PBS.Game.state; return s && s.market && s.market.USD ? s.market.USD : 0; }
  L.active = function () { return L.ccy === 'USD' && rate() > 0; };
  L.label = function () { return L.ccy === 'USD' ? 'USD' : 'CHF'; };

  // "1'234.50", "1,234.50", "-12.5" → Zahl und Anzahl Dezimalen
  function parse(str) {
    const t = str.replace(/['’, \s]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    const dot = t.indexOf('.');
    return { v: parseFloat(t), dec: dot < 0 ? 0 : t.length - dot - 1 };
  }
  function conv(str) {
    const p = parse(str);
    if (!p) return null;
    return U.fmt(p.v / rate(), p.dec);
  }
  // CHF-Beträge im Fliesstext; nicht nach "/" (Devisenpaar USD/CHF)
  const RE = /(^|[^/A-Za-z])CHF(\s| )?(-?\d[\d'’,]*(?:\.\d+)?)/g;
  function convText(s) {
    if (s.indexOf('CHF') < 0) return s;
    return s.replace(RE, function (m, pre, sp, num) { const c = conv(num); return c === null ? m : pre + 'USD' + (sp || ' ') + c; });
  }

  function texts(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { const p = n.parentElement; return !p || p.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    const out = [];
    let n;
    while ((n = w.nextNode())) if (n.data.indexOf('CHF') >= 0) out.push(n);
    return out;
  }
  // Tabellen: Spalten, deren Kopf "CHF" nennt (nicht "USD/CHF"), werden zeilenweise umgerechnet
  function tables(root) {
    const list = root.tagName === 'TABLE' ? [root] : Array.prototype.slice.call(root.querySelectorAll ? root.querySelectorAll('table') : []);
    list.forEach(function (tb) {
      if (tb.dataset.lc || tb.closest(SKIP)) return;
      tb.dataset.lc = '1';
      const head = tb.querySelector('thead tr') || tb.querySelector('tr');
      if (!head) return;
      const cols = [];
      let i = 0;
      Array.prototype.forEach.call(head.children, function (th) {
        const span = +th.getAttribute('colspan') || 1;
        const t = th.textContent;
        if (th.tagName === 'TH' && /\bCHF\b/.test(t) && !/[A-Z]{3}\s?\/\s?CHF|CHF\s?\//.test(t) && !/\bin CHF\b.*\brate\b|\brate\b/i.test(t)) {
          for (let k = 0; k < span; k++) cols.push(i + k);
          th.childNodes.forEach(function (c) { if (c.nodeType === 3) c.data = c.data.replace(/\bCHF\b/g, 'USD'); });
          if (th.textContent.indexOf('CHF') >= 0) th.innerHTML = th.innerHTML.replace(/\bCHF\b/g, 'USD');
        }
        i += span;
      });
      if (!cols.length) return;
      Array.prototype.forEach.call(tb.querySelectorAll('tr'), function (tr) {
        if (tr === head) return;
        let j = 0;
        Array.prototype.forEach.call(tr.children, function (td) {
          const span = +td.getAttribute('colspan') || 1;
          if (cols.indexOf(j) >= 0 && span === 1) {
            // nur reine Zahl (auch fett): Text der Zelle ohne Markup
            const leaf = td.children.length === 0 ? td : (td.children.length === 1 && td.firstElementChild.children.length === 0 && td.textContent.trim() === td.firstElementChild.textContent.trim() ? td.firstElementChild : null);
            if (leaf) { const c = conv(leaf.textContent.trim()); if (c !== null) leaf.textContent = c; }
          }
          j += span;
        });
      });
    });
  }

  function process(root) {
    if (!L.active() || !root) return;
    if (root.nodeType === 3) { const p = root.parentElement; if (p && !p.closest(SKIP)) { const v = convText(root.data); if (v !== root.data) root.data = v; } return; }
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    tables(root);
    texts(root).forEach(function (n) {
      const v = convText(n.data);
      if (v !== n.data) { n.data = v; return; }
      // "CHF " im Text, der Betrag im nächsten Element (z. B. <b>1'250</b>)
      if (!/(^|[^/A-Za-z])CHF\s*$/.test(n.data)) return;
      let sib = n.nextSibling;
      while (sib && sib.nodeType === 1 && sib.children.length === 1 && sib.textContent.trim() === sib.firstElementChild.textContent.trim()) sib = sib.firstElementChild;
      if (!sib || sib.nodeType !== 1 || sib.children.length) return;
      const c = conv(sib.textContent.trim());
      if (c === null) return;
      sib.textContent = c;
      n.data = n.data.replace(/CHF(\s*)$/, 'USD$1');
    });
  }
  L.apply = function (root) { busy = true; try { process(root || document.body); } finally { busy = false; } };

  const mo = new MutationObserver(function (recs) {
    if (busy || !L.active()) return;
    busy = true;
    try {
      recs.forEach(function (r) {
        if (r.type === 'characterData') process(r.target);
        else r.addedNodes.forEach(process);
      });
    } finally { mo.takeRecords(); busy = false; }
  });
  /* ---------- Dialog "Regional Options" ---------- */
  const PRESETS = { ch: { lang: 'ch', num: 'ch', date: 'ch', time: '24', ccy: 'CHF' }, us: { lang: 'en', num: 'en', date: 'us', time: '12', ccy: 'USD' }, uk: { lang: 'en', num: 'en', date: 'uk', time: '24', ccy: 'CHF' } };
  function radios(name, opts, cur) {
    return opts.map(function (o) { return '<label class="opt"><input type="radio" name="' + name + '" value="' + o[0] + '"' + (o[0] === cur ? ' checked' : '') + '> ' + o[1] + '</label>'; }).join('');
  }
  L.dialog = function () {
    const t = L.t, e = U.esc;
    const body = '<form class="ro" onsubmit="return false">' +
      '<p>' + 'Choose how PBS/Web shows words, numbers, dates and amounts. Your saved game is not affected.' + '</p>' +
      '<div class="ro-pre">' + 'Presets:' + ' <button type="button" class="btn sm" data-pre="ch">' + 'Swiss (original)' + '</button> <button type="button" class="btn sm" data-pre="us">' + 'English & US dollars' + '</button> <button type="button" class="btn sm" data-pre="uk">' + 'English & Swiss francs' + '</button></div>' +
      '<fieldset><legend>' + 'Language' + '</legend>' + radios('lang', [['ch', 'Swiss original: German banking terms, Swiss websites in German'], ['en', 'English: all terms and websites in English']], L.lang) + '</fieldset>' +
      '<fieldset><legend>' + 'Numbers' + '</legend>' + radios('num', [['ch', "1'234'567.89 (" + 'Swiss' + ')'], ['en', '1,234,567.89 (' + 'English' + ')']], L.num) + '</fieldset>' +
      '<fieldset><legend>' + 'Date and time' + '</legend>' + radios('date', [['ch', '31.12.2003 (' + 'Swiss' + ')'], ['uk', '31/12/2003 (UK)'], ['us', '12/31/2003 (US)']], L.date) +
      radios('time', [['24', '17:30 (24 ' + 'hours' + ')'], ['12', '5:30 PM (12 ' + 'hours' + ')']], L.time) + '</fieldset>' +
      '<fieldset><legend>' + 'Currency' + '</legend>' + radios('ccy', [['CHF', 'Swiss francs (CHF)'], ['USD', 'US dollars (USD), converted at the day\'s rate']], L.ccy) +
      '<p class="small muted">' + 'The bank still keeps its books in francs; only franc amounts on screen are converted. Accounts in euros, dollars or gold keep their currency, and input fields stay in CHF.' + '</p></fieldset>' +
      '<div class="ro-sample"></div></form>';
    const read = function (ov) { const o = {}; ['lang', 'num', 'date', 'time', 'ccy'].forEach(function (k) { const r = ov.querySelector('input[name=' + k + ']:checked'); o[k] = r ? r.value : L[k]; }); return o; };
    const sample = function (ov) {
      const o = read(ov), keep = { lang: L.lang, num: L.num, date: L.date, time: L.time };
      Object.assign(L, { lang: o.lang, num: o.num, date: o.date, time: o.time });
      const amt = 1250000 / (o.ccy === 'USD' && rate() ? rate() : 1);
      const txt = 'Example' + ': ' + U.longDate('2003-03-03') + ', ' + U.fmtDate('2003-03-03') + ', ' + U.fmtTime(17 * 60 + 30) + ' · ' + o.ccy + ' ' + U.fmt(amt, 2) + ' · ' + 'Account statement';
      Object.assign(L, keep);
      ov.querySelector('.ro-sample').textContent = txt;
    };
    const apply = function (ov) {
      const o = read(ov);
      const langChanged = o.lang !== L.lang;
      Object.assign(L, o);
      L.save();
      if (langChanged) {
        try { sessionStorage.setItem('pbs-resume', location.hash || '#/overview'); } catch (x) { /* */ }
        PBS.Dlg.msg('Regional Options', 'PBS/Web restarts so the language changes everywhere. Your game is saved.', 'info');
        if (PBS.Game.state) PBS.Game.save();
        setTimeout(function () { location.reload(); }, 900);
        return;
      }
      if (L.hooks && L.hooks.refresh) L.hooks.refresh();
    };
    PBS.Dlg.open({
      title: 'Regional Options', width: 470, icon: 'i-globe', body: body,
      onOpen: function (ov) {
        sample(ov);
        ov.addEventListener('change', function () { sample(ov); });
        ov.addEventListener('click', function (ev) {
          const b = ev.target.closest('[data-pre]');
          if (!b) return;
          const p = PRESETS[b.dataset.pre];
          Object.keys(p).forEach(function (k) { const r = ov.querySelector('input[name=' + k + '][value="' + p[k] + '"]'); if (r) r.checked = true; });
          sample(ov);
        });
      },
      buttons: [{ label: 'OK', def: true, fn: function (ov) { apply(ov); } }, { label: 'Cancel' }, { label: 'Apply', fn: function (ov) { apply(ov); return false; } }]
    });
  };

  L.watch = function () { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); };
})(window.PBS);
