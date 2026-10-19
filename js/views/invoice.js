/* FAKT – Fakturierung (Testsystem, nicht freigegeben). Versteckte Seite /pbs/fakt.do.
   Rechnungen nur zwischen Firmen, die im Spiel existieren; jeder Ausdruck trägt den Vermerk SPECIMEN. */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, H = PBS.H, V = PBS.Views;
  const e = U.esc;
  const ROWS = 6;

  /* ---------- Firmen im Spiel ---------- */
  function split(name) { const p = name.split(', '); return { n: p[0], city: p.slice(1).join(', ') }; }
  V.invoiceCompanies = function () {
    const s = G.state, list = [];
    const add = function (grp, id, name, addr, o) { list.push(Object.assign({ grp: grp, id: id, name: name, addr: addr.filter(Boolean), city: '', c: 'CH' }, o || {})); };
    add('The bank', 'vogt', D.BANK.name, [D.BANK.street, D.BANK.pobox, D.BANK.zip], { city: 'Zürich', c: 'CH', vat: true });
    s.entities.filter(function (x) { return !x.dissolved; }).forEach(function (x) {
      const j = D.JURIS[x.jur], ag = split(j.agent);
      add('Client structures', 'ent:' + x.id, x.name, ['c/o ' + ag.n, ag.city, G.cname(j.c)], { city: ag.city, c: j.c, ent: x.id });
    });
    const seenAg = {};
    Object.keys(D.JURIS).forEach(function (k) {
      const j = D.JURIS[k];
      if (seenAg[j.agent]) return;
      seenAg[j.agent] = 1;
      const ag = split(j.agent);
      add('Agents & trustees', 'ag:' + k, ag.n, [ag.city, G.cname(j.c)], { city: ag.city, c: j.c });
    });
    Object.keys(D.LAWYERS).forEach(function (k) { const l = split(D.LAWYERS[k].name); add('Law firms & advisers', 'law:' + k, l.n, [l.city, k === 'us' ? 'United States' : 'Switzerland'], { city: l.city, c: k === 'us' ? 'US' : 'CH', vat: k !== 'us' }); });
    add('Law firms & advisers', 'audit', 'Hürlimann Revision AG', ['Talacker 12', 'CH-8001 Zürich'], { city: 'Zürich', vat: true });
    add('Law firms & advisers', 'hottinger', 'Hottinger Corporate Finance AG', ['Pelikanstrasse 30', 'CH-8001 Zürich'], { city: 'Zürich', vat: true });
    D.USD_CORRESPONDENTS.forEach(function (n, i) { const b = split(n); add('Correspondent banks', 'usd:' + i, b.n, [b.city, 'United States'], { city: b.city, c: 'US' }); });
    D.BANKS.forEach(function (b) { add('Correspondent banks', 'bic:' + b.bic, b.name, [b.city, G.cname(b.c)], { city: b.city, c: b.c, vat: b.c === 'CH' }); });
    return list;
  };
  function company(id) { return V.invoiceCompanies().find(function (x) { return x.id === id; }) || V.invoiceCompanies()[0]; }

  /* ---------- Vorlagen ---------- */
  function vatRate(iso) { return iso < '1999-01-01' ? 6.5 : iso < '2001-01-01' ? 7.5 : iso < '2011-01-01' ? 7.6 : 8; }
  function firstOf(prefix) { const c = V.invoiceCompanies().find(function (x) { return x.id.indexOf(prefix) === 0; }); return c ? c.id : 'vogt'; }
  const TPL = {
    fee: { label: 'Fee note – bank to client structure', from: 'vogt', to: 'ent:', ccy: 'CHF', subject: 'Fees and charges, {q}',
      lines: [['All-in management fee, {q}', 1, 12500], ['Hold mail (banklagernd), annual fee', 1, 600], ['Administration of the structure', 1, 2400]] },
    agent: { label: 'Annual fees – agent to client structure', from: 'ag:', to: 'ent:', ccy: 'USD', subject: 'Annual fees {y}',
      lines: [['Annual government licence fee', 1, 350], ['Registered office and registered agent', 1, 1200], ['Nominee director services', 2, 900]] },
    setup: { label: 'Incorporation – agent to bank', from: 'ag:', to: 'vogt', ccy: 'CHF', subject: 'Incorporation of a company',
      lines: [['Incorporation and registration', 1, 6500], ['Memorandum and articles, apostille', 1, 850], ['Courier', 1, 120]] },
    legal: { label: 'Legal fees – law firm to bank', from: 'law:', to: 'vogt', ccy: 'CHF', subject: 'Professional services {m}',
      lines: [['Advice on request for mutual assistance (hours)', 6.5, 650], ['Correspondence with the Federal Office of Justice (hours)', 2, 650], ['Disbursements', 1, 180]] },
    audit: { label: 'Audit fee – auditor to bank', from: 'audit', to: 'vogt', ccy: 'CHF', subject: 'Statutory audit {y}',
      lines: [['Audit of the annual accounts {y}', 1, 145000], ['Regulatory audit under the Banking Act', 1, 88000], ['Additional procedures: transaction monitoring', 1, 24000]] },
    corr: { label: 'Clearing charges – US correspondent to bank', from: 'usd:', to: 'vogt', ccy: 'USD', subject: 'USD clearing, {m}',
      lines: [['Outgoing USD payments', 42, 18], ['Incoming USD payments', 57, 9], ['Account maintenance', 1, 250]] },
    deal: { label: 'Advisory fee – corporate finance to bank', from: 'hottinger', to: 'vogt', ccy: 'CHF', subject: 'Mandate "Lindenhof"',
      lines: [['Retainer – search for acquisition targets', 1, 40000], ['Expenses', 1, 2350]] },
    blank: { label: 'Blank invoice', from: 'vogt', to: 'ent:', ccy: 'CHF', subject: '', lines: [] }
  };
  V.INVOICE_TPL = TPL;
  function fill(t, iso) {
    const q = 'Q' + (Math.floor((+iso.slice(5, 7) - 1) / 3) + 1) + ' ' + iso.slice(0, 4);
    return String(t).replace('{q}', q).replace('{y}', iso.slice(0, 4)).replace('{m}', U.monthName(iso) + ' ' + iso.slice(0, 4));
  }
  /* ---------- Papierformate ---------- */
  // Jedes Format ist auf ein Musterblatt gesetzt (A4 hoch, Belastungsanzeige A5 quer) und wird auf das gewählte Papier eingepasst
  const PAPER = { a4: ['A4', 210, 297], a5p: ['A5 portrait', 148, 210], a5l: ['A5 landscape', 210, 148], letter: ['US Letter', 215.9, 279.4], legal: ['US Legal', 215.9, 355.6], custom: ['Custom', 0, 0] };
  V.INVOICE_PAPER = PAPER;
  V.invoicePaper = function (inv) {
    const p = PAPER[inv.paper] || PAPER.a4;
    return inv.paper === 'custom' ? { w: inv.pw, h: inv.ph, label: p[0] } : { w: p[1], h: p[2], label: p[0] };
  };
  function fit(inv) {
    const pp = V.invoicePaper(inv);
    const dw = 210, dh = inv.fmt === 'advice' ? 148 : 297;
    const z = Math.min(pp.w / dw, pp.h / dh);
    return { w: pp.w, h: pp.h, dw: dw, dh: dh, z: z, left: (pp.w - dw * z) / 2, label: pp.label };
  }
  V.invoicePageCSS = function (inv) { const pp = V.invoicePaper(inv); return '@page { size: ' + pp.w + 'mm ' + pp.h + 'mm; margin: 0; }'; };

  // keep: bisheriger Entwurf, dessen Format und Papier erhalten bleiben
  V.invoiceDefault = function (tplKey, keep) {
    const fmt = keep && keep.fmt;
    const s = G.state, t = TPL[tplKey] || TPL.fee;
    const pick = function (x) { return x.slice(-1) === ':' ? firstOf(x) : x; };
    const from = pick(t.from), to = pick(t.to);
    const f = company(from), r = company(to);
    const lines = t.lines.map(function (l) { return { d: fill(l[0], s.date), q: l[1], p: l[2] }; });
    while (lines.length < ROWS) lines.push({ d: '', q: '', p: '' });
    return {
      fmt: fmt || 'letter', tpl: tplKey, from: from, to: to, ccy: t.ccy === 'EUR' && s.date < D.EURO_DATE ? 'DEM' : t.ccy,
      no: (from === 'vogt' ? 'VC' : 'R') + '-' + s.date.slice(0, 4) + '-' + U.pad(100 + (s.dayNo * 37) % 900, 4),
      date: s.date, due: 30, subject: fill(t.subject, s.date), lines: lines,
      vat: f.vat && r.c === 'CH' ? vatRate(s.date) : 0, note: 'Payable without deduction.',
      paper: keep ? keep.paper : 'a4', pw: keep ? keep.pw : 210, ph: keep ? keep.ph : 297
    };
  };

  /* ---------- Berechnung ---------- */
  function totals(inv) {
    let net = 0;
    inv.lines.forEach(function (l) { const q = +l.q || 0, p = +l.p || 0; if (l.d || q || p) net += q * p; });
    const vat = Math.round(net * (+inv.vat || 0)) / 100;
    return { net: net, vat: vat, total: net + vat };
  }
  function used(inv) { return inv.lines.filter(function (l) { return l.d || +l.q || +l.p; }); }
  function payTo(f) {
    const s = G.state;
    if (f.id === 'vogt') return D.BANK.name + ', Zürich – SWIFT ' + D.BANK.bic;
    if (f.ent) {
      const a = s.accounts.find(function (x) { return x.entity === f.ent && !x.closed && x.type === 'CUR'; });
      if (a) return 'Account ' + a.id + ' with ' + D.BANK.name + ', Zürich';
    }
    return 'Our account with ' + D.BANK.name + ', Zürich';
  }
  function debitAcct(r) {
    const s = G.state;
    if (r.id === 'vogt') return 'Nostro 0001.00';
    if (r.ent) { const a = s.accounts.find(function (x) { return x.entity === r.ent && !x.closed && x.type === 'CUR'; }); if (a) return a.id; }
    return '–';
  }
  // Kennzeichnung: Warnzeile oben und unten, Vermerk beim Titel – auf jedem Format, nicht abschaltbar
  const SITE = 'swissbanking.lilbeans.workers.dev';
  const TOP = 'SPECIMEN · GAME DOCUMENT FROM PBS/Web · FICTITIOUS COMPANIES · NOT A VALID INVOICE';
  const SPEC = 'SPECIMEN – printed from the game PBS/Web at ' + SITE + '. All companies are fictitious. Not a valid invoice.';
  const TAG = ' <span class="inv-tag">SPECIMEN</span>';
  function warn() { return '<div class="inv-warn">' + TOP + '</div>'; }

  /* ---------- Formate ---------- */
  function letter(inv, f, r, t) {
    const head = f.id === 'vogt' ? '<div class="lh"><div class="lhl"><div class="wm">VOGT &amp; CIE</div><div class="wms">PRIVATBANKIERS · ZÜRICH · SEIT 1871</div></div><div class="lhr">' + e(D.BANK.street) + '<br>' + e(D.BANK.pobox) + ', ' + e(D.BANK.zip) + '<br>Telefon ' + e(D.BANK.phone) + '</div></div>'
      : '<div class="inv-lh"><div class="inv-co">' + e(f.name) + '</div><div class="inv-coa">' + f.addr.map(e).join(' · ') + '</div></div>';
    const rows = used(inv).map(function (l, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + e(l.d) + '</td><td class="num">' + (l.q === '' ? '' : U.fmt(+l.q || 0, (+l.q % 1) ? 2 : 0)) + '</td><td class="num">' + U.fmt(+l.p || 0, 2) + '</td><td class="num">' + U.fmt((+l.q || 0) * (+l.p || 0), 2) + '</td></tr>';
    }).join('');
    return '<div class="inv-doc inv-letter">' + warn() + head +
      '<div class="inv-addr">' + e(r.name) + '<br>' + r.addr.map(e).join('<br>') + '</div>' +
      '<div class="inv-place">' + e(f.city || 'Zürich') + ', ' + U.longDate(inv.date).replace(/^\w+, /, '') + '</div>' +
      '<h2>Invoice no. ' + e(inv.no) + TAG + '</h2>' + (inv.subject ? '<div class="inv-subj">' + e(inv.subject) + '</div>' : '') +
      '<table class="inv-t"><thead><tr><th>Pos.</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount ' + e(inv.ccy) + '</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td></td><td colspan="3">Subtotal</td><td class="num">' + U.fmt(t.net, 2) + '</td></tr>' + (+inv.vat ? '<tr><td></td><td colspan="3">VAT ' + U.fmt(+inv.vat, 1) + '%</td><td class="num">' + U.fmt(t.vat, 2) + '</td></tr>' : '') +
      '<tr class="tot"><td></td><td colspan="3"><b>Total ' + e(inv.ccy) + '</b></td><td class="num"><b>' + U.fmt(t.total, 2) + '</b></td></tr></tfoot></table>' +
      '<p>Payable within ' + inv.due + ' days (by ' + U.fmtDate(U.addDays(inv.date, +inv.due)) + ') to: ' + e(payTo(f)) + '.</p>' + (inv.note ? '<p>' + e(inv.note) + '</p>' : '') +
      '<p class="inv-sig">' + e(f.name) + '</p><div class="inv-spec">' + SPEC + '</div></div>';
  }
  function fax(inv, f, r, t) {
    const lines = used(inv).map(function (l, i) { return (i + 1) + '. ' + e(l.d) + ' – ' + inv.ccy + ' ' + U.fmt((+l.q || 0) * (+l.p || 0), 2); }).join('<br>');
    return '<div class="inv-doc doc fax inv-fax">' + warn() + '<div class="faxhdr">' + U.faxDate(inv.date) + ' 16:4' + (inv.no.length % 10) + '  FROM: ' + e(f.name.toUpperCase()) + '  TO: ' + e(r.name.toUpperCase()) + '  P.01/01</div>' +
      '<div class="faxbody"><b>INVOICE ' + e(inv.no) + ' (SPECIMEN)</b><br>' + e(f.name) + ', ' + e(f.city) + '<br>to: ' + e(r.name) + ', ' + r.addr.map(e).join(', ') + '<br>Date: ' + U.fmtDate(inv.date) + (inv.subject ? '<br>Re: ' + e(inv.subject) : '') + '<br><br>' +
      lines + '<br><br>' + (+inv.vat ? 'Subtotal ' + inv.ccy + ' ' + U.fmt(t.net, 2) + '<br>VAT ' + U.fmt(+inv.vat, 1) + '%: ' + U.fmt(t.vat, 2) + '<br>' : '') + '<b>TOTAL ' + e(inv.ccy) + ' ' + U.fmt(t.total, 2) + '</b><br><br>' +
      'Payment within ' + inv.due + ' days to ' + e(payTo(f)) + '.<br>' + e(inv.note || '') + '<br><br>Original follows by mail.</div>' +
      '<div class="faxstamp">RECEIVED ' + U.fmtDate(inv.date) + '</div><div class="inv-spec">' + SPEC + '</div></div>';
  }
  function pad(x, n, right) { x = String(x).toUpperCase().slice(0, n); return right ? x.padStart(n) : x.padEnd(n); }
  function star(x) {
    x = String(x).toUpperCase();
    return '*** ' + (' '.repeat(Math.max(0, Math.floor((76 - x.length) / 2))) + x).padEnd(76) + ' ***';
  }
  function matrix(inv, f, r, t) {
    const out = [];
    out.push(star('SPECIMEN - GAME DOCUMENT - FICTITIOUS COMPANIES - NOT A VALID INVOICE'));
    out.push('');
    // Absender links, Rechnungsdaten rechts, Zeile für Zeile
    const left = [f.name].concat(f.addr), right = ['RECHNUNG (SPECIMEN)', 'NR.     ' + inv.no, 'DATUM   ' + U.fmtDate(inv.date), 'FAELLIG ' + U.fmtDate(U.addDays(inv.date, +inv.due))];
    for (let i = 0; i < Math.max(left.length, right.length); i++) out.push(pad(left[i] || '', 42) + '  ' + (right[i] || ''));
    out.push('');
    out.push('AN / TO:');
    out.push(pad(r.name, 60));
    r.addr.forEach(function (a) { out.push(pad(a, 60)); });
    out.push('');
    if (inv.subject) out.push('BETREFF: ' + pad(inv.subject, 60));
    out.push('');
    out.push('POS ' + pad('BEZEICHNUNG', 34) + pad('MENGE', 8, 1) + pad('PREIS', 12, 1) + pad('BETRAG', 14, 1));
    out.push('--- ' + '-'.repeat(34) + ' ' + '-'.repeat(7) + ' ' + '-'.repeat(11) + ' ' + '-'.repeat(13));
    used(inv).forEach(function (l, i) {
      out.push(pad(String(i + 1), 3, 1) + ' ' + pad(l.d, 34) + pad(l.q === '' ? '' : U.fmt(+l.q || 0, (+l.q % 1) ? 2 : 0), 8, 1) + pad(U.fmt(+l.p || 0, 2), 12, 1) + pad(U.fmt((+l.q || 0) * (+l.p || 0), 2), 14, 1));
    });
    out.push(' '.repeat(58) + '-'.repeat(14));
    out.push(pad('', 44) + pad('NETTO ' + inv.ccy, 14) + pad(U.fmt(t.net, 2), 14, 1));
    if (+inv.vat) out.push(pad('', 44) + pad('MWST ' + U.fmt(+inv.vat, 1) + '%', 14) + pad(U.fmt(t.vat, 2), 14, 1));
    out.push(pad('', 44) + pad('TOTAL ' + inv.ccy, 14) + pad(U.fmt(t.total, 2), 14, 1));
    out.push(' '.repeat(58) + '='.repeat(14));
    out.push('');
    out.push(pad('ZAHLBAR AN: ' + payTo(f), 72));
    if (inv.note) out.push(pad(inv.note, 72));
    out.push('');
    out.push(star('SPECIMEN - PRINTED FROM THE GAME PBS/WEB'));
    out.push(star(SITE));
    out.push(star('ALL COMPANIES ARE FICTITIOUS - NOT A VALID INVOICE'));
    return '<div class="inv-doc inv-matrix"><pre>' + e(out.join('\n')) + '</pre></div>';
  }
  function advice(inv, f, r, t) {
    return '<div class="inv-doc inv-advice">' + warn() + '<div class="adv-h"><div><div class="wm">VOGT &amp; CIE</div><div class="wms">PRIVATBANKIERS · ZÜRICH</div></div><div class="adv-t">BELASTUNGSANZEIGE<br><span>DEBIT ADVICE</span>' + TAG + '</div></div>' +
      '<table class="adv-g"><tr><th>Account</th><td>' + e(debitAcct(r)) + '</td><th>Value date</th><td>' + U.fmtDate(U.addDays(inv.date, +inv.due)) + '</td></tr>' +
      '<tr><th>Account holder</th><td colspan="3">' + e(r.name) + ', ' + r.addr.map(e).join(', ') + '</td></tr>' +
      '<tr><th>In favour of</th><td colspan="3">' + e(f.name) + ', ' + e(f.city) + '</td></tr>' +
      '<tr><th>Reference</th><td colspan="3">Invoice ' + e(inv.no) + ' of ' + U.fmtDate(inv.date) + (inv.subject ? ' – ' + e(inv.subject) : '') + '</td></tr>' +
      '<tr><th>Amount</th><td>' + e(inv.ccy) + ' ' + U.fmt(t.total, 2) + '</td><th>Charges</th><td>' + e(inv.ccy) + ' 0.00</td></tr>' +
      '<tr class="tot"><th>Total debit</th><td colspan="3"><b>' + e(inv.ccy) + ' ' + U.fmt(t.total, 2) + '</b></td></tr></table>' +
      '<p class="small">We have debited your account as shown above. Please check this advice; objections must be raised within 30 days. This advice is produced by computer and bears no signature.</p>' +
      '<div class="inv-spec">' + SPEC + '</div></div>';
  }
  V.invoiceDoc = function (inv) {
    const f = company(inv.from), r = company(inv.to);
    if (f.id === r.id) return '<div class="errbox">' + H.ico('warn') + ' FAKT-E-012 Sender and recipient must be different companies.</div>';
    const t = totals(inv);
    const doc = ({ letter: letter, fax: fax, matrix: matrix, advice: advice }[inv.fmt] || letter)(inv, f, r, t);
    const ft = fit(inv);
    const mm = function (x) { return U.fmt(x, x % 1 ? 1 : 0); };
    return '<div class="inv-cap">' + e(ft.label) + ' · ' + mm(ft.w) + ' × ' + mm(ft.h) + ' mm · content at ' + Math.round(ft.z * 100) + '%</div>' +
      '<div class="inv-sheet" style="width:' + ft.w + 'mm;height:' + ft.h + 'mm;--ph:' + ft.h + 'mm">' +
      '<div class="inv-fit" style="left:' + ft.left.toFixed(2) + 'mm;width:' + ft.dw + 'mm;height:' + ft.dh + 'mm;transform:scale(' + ft.z.toFixed(4) + ')">' + doc + '</div></div>';
  };

  /* ---------- Maske ---------- */
  function companySelect(name, cur) {
    const groups = {};
    V.invoiceCompanies().forEach(function (c) { (groups[c.grp] = groups[c.grp] || []).push(c); });
    return '<select name="' + name + '" class="inp" style="width:100%">' + Object.keys(groups).map(function (g) {
      return '<optgroup label="' + e(g) + '">' + groups[g].map(function (c) { return '<option value="' + e(c.id) + '"' + (c.id === cur ? ' selected' : '') + '>' + e(c.name) + (c.city ? ', ' + e(c.city) : '') + '</option>'; }).join('') + '</optgroup>';
    }).join('') + '</select>';
  }
  V.invoicePage = function (inv) {
    const fmts = [['letter', 'Letterhead'], ['fax', 'Fax copy'], ['matrix', 'Continuous form (dot matrix)'], ['advice', 'Debit advice']];
    const ccys = G.currencies();
    if (ccys.indexOf(inv.ccy) < 0) ccys.push(inv.ccy);
    const lines = inv.lines.map(function (l, i) {
      return '<tr><td>' + (i + 1) + '</td><td><input class="inp" name="d' + i + '" maxlength="60" value="' + e(l.d) + '" style="width:100%"></td><td><input class="inp num" name="q' + i + '" size="4" value="' + e(l.q) + '"></td><td><input class="inp num" name="p' + i + '" size="9" value="' + e(l.p) + '"></td></tr>';
    }).join('');
    const form = '<form id="invform" autocomplete="off">' +
      '<div class="pcsec">Format</div>' + fmts.map(function (x) { return '<label class="opt inl"><input type="radio" name="fmt" value="' + x[0] + '"' + (inv.fmt === x[0] ? ' checked' : '') + '> ' + x[1] + '</label>'; }).join('') +
      '<div class="pcsec">Template</div>' + H.sel('name="tpl"', Object.keys(TPL).map(function (k) { return [k, TPL[k].label]; }), inv.tpl) + ' <span class="small muted">replaces the lines</span>' +
      '<div class="pcsec">Paper</div>' + H.sel('name="paper"', Object.keys(PAPER).map(function (k) { return [k, PAPER[k][0] + (PAPER[k][1] ? ' (' + U.fmt(PAPER[k][1], PAPER[k][1] % 1 ? 1 : 0) + ' × ' + U.fmt(PAPER[k][2], PAPER[k][2] % 1 ? 1 : 0) + ' mm)' : '')]; }), inv.paper) +
        ' <input class="inp num" name="pw" size="4" value="' + e(inv.pw) + '" aria-label="Paper width in mm"> × <input class="inp num" name="ph" size="4" value="' + e(inv.ph) + '" aria-label="Paper height in mm"> mm' +
        '<div class="small muted">The invoice is scaled to fit. Choose the same paper in the print dialog.</div>' +
      '<table class="frm"><tr><th>From</th><td>' + companySelect('from', inv.from) + '</td></tr><tr><th>To</th><td>' + companySelect('to', inv.to) + '</td></tr>' +
      '<tr><th>Invoice no.</th><td><input class="inp" name="no" maxlength="20" size="16" value="' + e(inv.no) + '"></td></tr>' +
      '<tr><th>Date</th><td><input class="inp" name="date" maxlength="10" size="11" value="' + U.fmtDate(inv.date) + '"> payable within ' + H.sel('name="due"', ['10', '20', '30', '60', '90'], String(inv.due)) + ' days</td></tr>' +
      '<tr><th>Currency / VAT</th><td>' + H.sel('name="ccy"', ccys, inv.ccy) + ' VAT <input class="inp num" name="vat" size="4" value="' + e(inv.vat) + '"> %</td></tr>' +
      '<tr><th>Subject</th><td><input class="inp" name="subject" maxlength="60" style="width:100%" value="' + e(inv.subject) + '"></td></tr></table>' +
      '<div class="pcsec">Lines</div><table class="grid compact inv-lines"><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Price</th></tr></thead><tbody>' + lines + '</tbody></table>' +
      '<table class="frm"><tr><th>Note</th><td><input class="inp" name="note" maxlength="90" style="width:100%" value="' + e(inv.note) + '"></td></tr></table>' +
      '<div class="btnbar">' + H.btn(H.ico('print') + ' Print', 'invprint', '', 'def') + H.btn('Reset', 'invreset') + '</div></form>';
    return {
      title: 'FAKT – Fakturierung (Test)',
      html: '<div class="fakt"><div class="fakt-hd"><span>FAKT 0.9 – Fakturierung</span><span class="fakt-test">TESTSYSTEM · NICHT FREIGEGEBEN · IT-Services / P. Studer</span></div>' +
        '<div class="cols"><div class="fakt-ed">' + H.panel('Invoice data', form, { icon: 'pen' }) +
        H.note('Only companies registered in PBS/Web can be selected. Every printout carries the SPECIMEN mark.') + '</div>' +
        '<div class="fakt-pv" id="inv-preview">' + V.invoiceDoc(inv) + '</div></div></div>'
    };
  };
})(window.PBS);
