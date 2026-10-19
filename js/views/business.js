/* PBS/Web 4.2 – Masken: Kunden, Konten, Kredite, Tresor, Zahlungsverkehr, Kasse, Kurierdienst */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, H = PBS.H, V = PBS.Views;
  const e = U.esc;
  const ico = H.ico, st = H.st, num = H.num, grid = H.grid, panel = H.panel, kv = H.kv, btn = H.btn;

  /* ---------- Kunden ---------- */
  V.clients = function () {
    const s = H.S();
    const f = H.f('clients');
    const q = (f.q || '').toLowerCase();
    const list = s.clients.filter(function (c) {
      if ((f.st || 'active') !== 'all' && c.status !== (f.st || 'active')) return false;
      if (f.dom && c.dom !== f.dom) return false;
      if (f.rm && c.rm !== f.rm) return false;
      if (q && (c.id + ' ' + c.rubrik + ' ' + c.name + ' ' + c.city).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    let tot = 0;
    const rows = list.map(function (c) {
      const aum = G.clientAUM(c.id);
      tot += aum;
      const ll = G.loyaltyLabel(c.loyalty);
      const flags = [c.holdMail ? 'BL' : '', c.formA ? '' : '!A', G.entitiesOf(c.id).length ? 'ST' : '', c.booking ? c.booking : '', c.declared >= 1 ? 'DECL' : '', c.dormant ? 'DORM' : ''].filter(Boolean).map(function (x) { return '<span class="tag">' + x + '</span>'; }).join('');
      return {
        cls: c.status !== 'active' ? 'closed' : '',
        cells: ['<a href="#/client/' + c.id + '">' + c.id + '</a>', '<b>' + e(c.rubrik) + '</b>', e(c.name), H.cty(c.dom) + ' ' + e(c.city), e(G.rmName(c)), H.riskSt(c.risk), flags,
          c.status === 'active' ? U.fmt(aum, 0) : '<span class="muted">closed ' + U.fmtDate(c.closed.d) + '</span>', U.fmt(G.effectiveFee(c) * 100, 2) + '%', c.status === 'active' ? (c.dormant ? st('mod', 'dormant') : st(ll.cls, ll.label)) : '']
      };
    });
    const doms = Array.from(new Set(s.clients.map(function (c) { return c.dom; }))).sort();
    const filt = H.filter('Search <input type="text" class="inp" data-filter="clients.q" value="' + e(f.q || '') + '" placeholder="No., codename, name" size="20"> ' +
      'Domicile ' + H.sel('data-filter="clients.dom"', [['', 'all']].concat(doms), f.dom || '') + ' ' +
      'RM ' + H.sel('data-filter="clients.rm"', [['', 'all']].concat(G.activeStaff('rm').map(function (r) { return [r.id, r.name]; })), f.rm || '') + ' ' +
      'Status ' + H.sel('data-filter="clients.st"', [['active', 'active'], ['closed', 'closed'], ['all', 'all']], f.st || 'active'));
    return {
      mod: 'clients', crumbs: [['Clients'], ['Client book']], title: 'Client book',
      html: H.title('Client book (Kundenstamm)', '[KND-0100]', list.length + ' relationship(s) · BL = banklagernd, !A = Form A missing, ST = structure, DECL = declared, DORM = dormant') + filt +
        grid(['Client no.', 'Codename', 'Name', 'Domicile', 'RM', 'Risk', 'Flags', { t: 'AuM CHF', num: true }, { t: 'Fee', num: true }, 'Satisfaction'], rows,
          { foot: ['', '', '<b>Total</b>', '', '', '', '', '<b>' + U.fmt(tot, 0) + '</b>', '', ''] })
    };
  };

  V.client = function (id, tab) {
    const s = H.S();
    const c = G.client(id);
    if (!c) return V.notFound('Client ' + id);
    tab = tab || 'master';
    const aum = G.clientAUM(c.id);
    const ents = G.entitiesOf(c.id);
    const active = c.status === 'active';
    const banner = '<div class="cbanner"><div><span class="cno">' + c.id + '</span> <span class="crub">' + e(c.rubrik) + '</span> ' + e(c.name) + (c.dormant ? ' <span class="tag">DORMANT</span>' : '') + '</div>' +
      '<div class="cflags">' + H.riskSt(c.risk) + ' ' + (c.holdMail ? st('ok', 'Banklagernd') : st('warn', 'Mail to domicile')) + ' ' + (c.formA ? st('ok', 'Form A') : st('bad', 'No Form A')) +
      (c.declared >= 1 ? ' ' + st('ok', 'Declared') : '') + (c.booking ? ' ' + st('mod', 'Booked ' + c.booking) : '') + (active ? '' : ' ' + st('bad', 'CLOSED')) + ' &nbsp; AuM <b>CHF ' + U.fmt(aum, 0) + '</b></div></div>';
    const tabs = H.tabs('client/' + c.id + '/', [['master', 'Master data'], ['accounts', 'Accounts & positions'], ['products', 'Products & structures'], ['tx', 'Transactions'], ['docs', 'Documents'], ['notes', 'File notes (' + c.notes.length + ')']], tab);
    let body = '';
    const accs = s.accounts.filter(function (a) { return a.client === c.id; });

    if (tab === 'master') {
      const ll = G.loyaltyLabel(c.loyalty);
      const decl = c.declared >= 1 ? 'Declared' + (c.regularised ? ' (regularised ' + U.fmtDate(c.regularised) + ')' : '') : c.declared > 0 ? 'Partly declared (approx. ' + Math.round(c.declared * 100) + '%)' : 'Not declared';
      const fam = c.family ? (c.family.spouse ? 'Spouse: ' + e(c.family.spouse) : 'No spouse') + (c.family.children.length ? '<br>Children: ' + c.family.children.map(e).join(', ') : '<br>No children') : '–';
      const left = panel('Personal data – client profile (KYC)', kv([
        ['Client no. (Stamm-Nr.)', c.id], ['Codename (Rubrik)', '<b>' + e(c.rubrik) + '</b>'], ['Name', e(c.name)],
        ['Date of birth', U.fmtDate(c.born) + ' (' + G.age(c) + ')'], ['Nationality', H.cty(c.nat) + ' ' + e(G.cname(c.nat))], ['Domicile', e(c.city) + ', ' + e(G.cname(c.dom))],
        ['Family', fam], ['Occupation', e(c.occ)], ['Source of wealth', e(c.sow)], ['Documented total wealth', 'CHF ' + U.fmtMio(c.wealth)],
        ['Character (RM assessment)', (c.traits || []).map(function (t) { return e(D.TRAITS[t]); }).join('<br>')],
        ['Client since', U.fmtDate(c.since)]
      ]), { icon: 'user' });
      const rmSel = active ? '<form data-form="assignrm" data-id="' + c.id + '" class="inl">' + H.staffSelect('rm', 'rm', c.rm) + ' <button class="btn sm" type="submit">Assign</button></form>' : e(G.rmName(c));
      const right = panel('Relationship', kv([
        ['Relationship manager', rmSel], ['Assets with us', 'CHF ' + U.fmt(aum, 0)], ['Fee rate (all-in) p.a.', U.fmt(G.effectiveFee(c) * 100, 2) + '%' + (c.rebateUntil && c.rebateUntil >= s.date ? ' <span class="muted">(30% rebate until ' + U.fmtDate(c.rebateUntil) + ')</span>' : '')],
        ['Revenue p.a. (estimate)', 'CHF ' + U.fmt(aum * G.effectiveFee(c), 0)], ['Accrued fees current quarter', 'CHF ' + U.fmt(c.feeAccrued || 0)],
        ['Satisfaction', active ? st(ll.cls, ll.label) + ' <span class="muted">(' + U.fmt(c.loyalty, 0) + ')</span>' : '–'],
        ['Risk class (GwG)', H.riskSt(c.risk)], ['Tax status (RM estimate)', c.declared >= 1 ? st('ok', decl) : c.declared > 0 ? st('warn', decl) : st('bad', decl)],
        ['Next annual review', c.nextReview ? U.fmtDate(c.nextReview) : '–']
      ]), { icon: 'chart' }) +
        panel('Flags', kv([
          ['Hold mail (banklagernd)', (c.holdMail ? st('ok', 'Agreed') : st('warn', 'Statements mailed to ' + e(c.city))) + (active ? ' ' + btn(c.holdMail ? 'Cancel' : 'Agree hold mail', 'holdmail', ' data-id="' + c.id + '" data-on="' + (c.holdMail ? 0 : 1) + '"', 'sm') : '')],
          ['Form A (beneficial owner)', (c.formA ? st('ok', 'On file since ' + U.fmtDate(c.formA)) : c.formAPending ? st('warn', 'Requested – awaiting signature') : st('bad', 'Missing')) + (active && !c.formA && !c.formAPending ? ' ' + btn('Request', 'forma', ' data-id="' + c.id + '"', 'sm') : '')],
          ['Structures', ents.length ? ents.map(function (x) { return e(x.name) + ' <span class="muted">(' + e(D.JURIS[x.jur].label) + ')</span>'; }).join('<br>') : '<span class="muted">none</span>']
        ]), { icon: 'doc' });
      const acts = active ? '<div class="btnbar left">' + btn(ico('plus') + ' Open account', 'openacc', ' data-id="' + c.id + '"') + btn(ico('doc') + ' New payment', 'go', ' data-href="#/pay/new?c=' + c.id + '"') +
        btn(ico('swap') + ' Internal transfer', 'go', ' data-href="#/pay/transfer?c=' + c.id + '"') + btn(ico('building') + ' Products', 'go', ' data-href="#/client/' + c.id + '/products"') +
        (c.declared < 1 ? btn('Recommend disclosure', 'disclose', ' data-id="' + c.id + '"') : '') +
        btn(ico('pen') + ' File note', 'go', ' data-href="#/client/' + c.id + '/notes"') + '<span class="sp"></span>' + btn('Terminate relationship', 'offboard', ' data-id="' + c.id + '"', 'danger') + '</div>' : '';
      body = acts + '<div class="cols"><div class="col-h">' + left + '</div><div class="col-h">' + right + '</div></div>' +
        (c.notes.length ? panel('Latest file notes', c.notes.slice(0, 3).map(function (n) { return '<div class="fn"><b>' + U.fmtDate(n.d) + '</b> · ' + e(n.who) + '<br>' + e(n.text) + '</div>'; }).join(''), { icon: 'pen' }) : '');
    } else if (tab === 'accounts') {
      let tot = 0;
      const rows = accs.map(function (a) {
        const v = G.valueCHF(a);
        if (!a.closed) tot += v;
        return { cls: a.closed ? 'closed' : '', cells: ['<a href="#/account/' + a.id + '">' + a.id + '</a>', e(G.holderName(a)), H.accLabel(a) + (a.type === 'DEP' ? '<br><span class="muted">' + e(D.STRATS[a.strat || 'balanced'].label) + '</span>' : ''), H.ccyL(a.ccy), num(a.bal, a.type === 'DEP' ? 2 : H.dec(a.ccy)) + (a.pledged ? '<br><span class="muted">pledged ' + U.fmt(a.pledged, 0) + '</span>' : ''), U.fmt(v, 0), U.fmtDate(a.opened), a.closed ? 'closed' : '<a href="#/account/' + a.id + '">Statement</a>'] };
      });
      body = panel('Accounts', grid(['Account', 'Holder', 'Type', 'Ccy', { t: 'Balance', num: true }, { t: 'CHF equivalent', num: true }, 'Opened', ''], rows,
        { foot: ['', '', '', '', '<b>Total</b>', '<b>' + U.fmt(tot, 0) + '</b>', '', ''] }), { icon: 'folder', flush: true, tools: active ? btn('Open account', 'openacc', ' data-id="' + c.id + '"', 'sm') : '' });
      accs.filter(function (a) { return a.type === 'DEP' && !a.closed; }).forEach(function (a) {
        const p = G.perf(a);
        const pos = G.positions(a).map(function (r) { return [e(r.name), D.CLASSES[r.cls], r.qty === null ? '' : U.fmt(r.qty, 0) + (r.bond ? ' nom.' : ''), r.price === null || r.price === undefined ? '' : U.fmt(r.price, 2) + ' ' + r.ccy, U.fmt(r.val, 0), U.fmt(r.w, 1) + '%']; });
        const stratSel = active ? '<form data-form="strategy" data-id="' + a.id + '" class="inl">' + H.sel('name="strat"', Object.keys(D.STRATS).map(function (k) { return [k, D.STRATS[k].label]; }), a.strat || 'balanced') + ' <button class="btn sm" type="submit">Change</button> ' + H.dur(5) + '</form>' : '';
        body += panel('Portfolio ' + a.id + ' – ' + e(D.STRATS[a.strat || 'balanced'].label) + ' · YTD ' + H.chg(p.own * 100, 2, '%') + ' (benchmark ' + U.fmt(p.bench * 100, 2) + '%)',
          stratSel + grid(['Position', 'Asset class', { t: 'Quantity', num: true }, { t: 'Price', num: true }, { t: 'Value CHF', num: true }, { t: 'Weight', num: true }], pos, { cls: 'compact' }), { icon: 'chart' });
      });
    } else if (tab === 'products') {
      const box = s.boxes.filter(function (b) { return b.client === c.id && b.status === 'active'; });
      const loans = s.loans.filter(function (l) { return l.client === c.id && l.status === 'active'; });
      const cards = s.cards.filter(function (x) { return x.client === c.id && x.status === 'active'; });
      const subs = Object.keys(s.branches).filter(function (k) { return D.LOCATIONS[k].kind === 'sub'; });
      const curAccs = G.clientAccounts(c.id).filter(function (a) { return a.type === 'CUR'; });
      body = '<div class="cols"><div class="col-h">' +
        panel('Safe-deposit boxes (Schrankfächer)', (box.length ? grid(['Box', 'Size', { t: 'Rent p.a.', num: true }, 'Since'], box.map(function (b) { return [b.id, e(D.BOX_SIZES[b.size].label), U.fmt(b.fee, 0), U.fmtDate(b.opened)]; })) : '<p class="muted">No box.</p>') +
          (active ? '<form data-form="box" data-id="' + c.id + '" class="inl">' + H.sel('name="size"', Object.keys(D.BOX_SIZES).map(function (k) { return [k, D.BOX_SIZES[k].label + ' – CHF ' + D.BOX_SIZES[k].fee]; }), 'M') + ' <button class="btn sm" type="submit">Rent box</button> ' + H.dur(10) + '</form><p class="small muted">Cash withdrawn into a box stays in Switzerland – fewer border incidents. Vault: ' + G.boxesUsed() + ' / ' + G.vaultCapacity() + ' boxes used.</p>' : ''), { icon: 'lock' }) +
        panel('Loans', (loans.length ? grid(['Loan', 'Type', { t: 'Amount', num: true }, 'Since', ''], loans.map(function (l) { return [l.id, l.type === 'lombard' ? 'Lombard' : 'Back-to-back (' + e(l.bank) + ')', l.ccy + ' ' + U.fmt(l.amount, 0), U.fmtDate(l.opened), btn(l.type === 'lombard' ? 'Repay' : 'Release', 'repay', ' data-id="' + l.id + '"', 'sm')]; })) : '<p class="muted">No loans.</p>') +
          (active ? '<form data-form="lombard" data-id="' + c.id + '" class="inl"><b>Lombard</b> CHF <input name="amount" class="inp num" size="12"> <button class="btn sm" type="submit">Grant</button> ' + H.dur(20) + ' <span class="small muted">lending value available CHF ' + U.fmt(G.lombardLimit(c.id), 0) + '</span></form>' +
            '<form data-form="b2b" data-id="' + c.id + '" class="inl"><b>Back-to-back</b> pledge ' + H.sel('name="acc"', curAccs.map(function (a) { return [a.id, a.id + ' ' + a.ccy + ' ' + U.fmt(G.available(a), 0)]; }), '') + ' amount <input name="amount" class="inp num" size="12"> <button class="btn sm" type="submit">Arrange</button> ' + H.dur(30) + '</form>' +
            '<p class="small muted">Back-to-back: our correspondent in ' + e(G.cname(c.dom)) + ' lends the client money at home, secured by a pledge of the Swiss account. The money "comes home" as a loan. Guarantee fee 1.25% p.a. – and, if it ever comes out, a strong indication of tax fraud.</p>' : ''), { icon: 'scale' }) +
        '</div><div class="col-h">' +
        panel('Offshore credit card', (cards.length ? cards.map(function (x) { return x.id + ' · ' + e(x.issuer) + ' · limit CHF ' + U.fmt(x.limit, 0) + ' ' + btn('Cancel', 'cardcancel', ' data-id="' + x.id + '"', 'sm'); }).join('<br>') : (active ? btn('Issue gold card via Nassau', 'card', ' data-id="' + c.id + '"') + ' ' + H.dur(10) : '<p class="muted">No card.</p>')) + '<p class="small muted">Spending abroad is settled monthly from the Swiss account; no reference to Switzerland on the card. Fee CHF ' + s.pricing.card + ' p.a.</p>', { icon: 'cash' }) +
        panel('Structures', (ents.length ? grid(['Name', 'Form', { t: 'Assets', num: true }], ents.map(function (x) { return [e(x.name), e(D.JURIS[x.jur].label), U.fmt(G.entityAUM(x.id), 0)]; })) : '<p class="muted">No structures.</p>') + (active ? btn(ico('building') + ' Set up structure', 'go', ' data-href="#/structures/new?c=' + c.id + '"') : ''), { icon: 'building' }) +
        panel('Booking centre', (c.booking ? '<p>Assets booked with <b>' + e(D.LOCATIONS[c.booking].name) + '</b>.</p>' + (active ? btn('Book back to Zürich', 'booking', ' data-id="' + c.id + '" data-loc=""', 'sm') : '') : subs.length ? subs.map(function (k) { return btn('Book with ' + e(D.LOCATIONS[k].name.split(' – ')[0]), 'booking', ' data-id="' + c.id + '" data-loc="' + k + '"', 'sm'); }).join(' ') + ' ' + H.dur(20) : '<p class="muted">No foreign booking centre open (Organisation › Branches).</p>'), { icon: 'plane' }) +
        '</div></div>';
    } else if (tab === 'tx') {
      const txs = s.tx.filter(function (t) { return t.client === c.id && t.kind !== 'open'; }).slice(-80).reverse();
      body = panel('Transactions (latest 80)', grid(['Date', 'Valuta', 'Account', 'Text', { t: 'Debit', num: true }, { t: 'Credit', num: true }, 'Ccy'], txs.map(function (t) {
        const d = t.ccy === 'CHF' || !G.dec ? 2 : H.dec(t.ccy);
        return [U.fmtDate(t.d), U.fmtDate(t.val), '<a href="#/account/' + t.acc + '">' + t.acc + '</a>', e(t.text), t.amt < 0 ? U.fmt(-t.amt, d) : '', t.amt >= 0 ? U.fmt(t.amt, d) : '', H.ccyL(t.ccy)];
      })), { icon: 'list', flush: true });
    } else if (tab === 'docs') {
      const docs = [
        ['Account opening agreement and general terms', U.fmtDate(c.since), st('ok', 'on file')],
        ['Specimen signature card', U.fmtDate(c.since), st('ok', 'on file')],
        ['Form A – declaration of beneficial owner (VSB)', c.formA ? U.fmtDate(c.formA) : '–', c.formA ? st('ok', 'on file') : st('bad', 'missing')],
        ['Hold-mail agreement (Banklagernd-Vereinbarung)', c.holdMail ? U.fmtDate(c.since) : '–', c.holdMail ? st('ok', 'on file') : st('warn', 'none')],
        ['Copy of passport', U.fmtDate(c.since), st('ok', 'on file')],
        ['Client profile (KYC) – last review', c.nextReview ? U.fmtDate(U.addBusinessDays(c.nextReview, -250)) : '–', st('ok', 'on file')]
      ];
      ents.forEach(function (x) {
        docs.push([e(D.JURIS[x.jur].kind === 'trust' ? 'Trust deed' : D.JURIS[x.jur].kind === 'insurance' ? 'Insurance policy' : 'Certificate of incorporation') + ' – ' + e(x.name), U.fmtDate(x.inc), st('ok', 'on file')]);
      });
      if (c.risk === 'PEP') docs.push(['Senior-management approval of PEP relationship', s.date >= '2003-07-01' ? '–' : 'n/a', s.date >= '2003-07-01' ? st('warn', 'not documented') : st('mod', 'not yet required')]);
      if (c.regularised) docs.push(['Confirmation of voluntary disclosure (home tax authority)', U.fmtDate(c.regularised), st('ok', 'on file')]);
      body = panel('Documents in the client file (Dossier)', grid(['Document', 'Date', 'Status'], docs), { icon: 'doc', flush: true });
    } else {
      body = (active ? '<form data-form="note" data-id="' + c.id + '">' + panel('New file note (Gesprächsnotiz)', '<textarea name="text" class="inp" rows="3" style="width:100%" placeholder="Content of conversation, instructions, observations…"></textarea><div class="btnbar">' + H.dur(3) + '<button class="btn def" type="submit">Save note</button></div>', { icon: 'pen' }) + '</form>' : '') +
        panel('File notes', c.notes.length ? c.notes.map(function (n) { return '<div class="fn"><b>' + U.fmtDate(n.d) + '</b> · ' + e(n.who) + '<br>' + e(n.text) + '</div>'; }).join('') : '<div class="muted">No file notes.</div>', { icon: 'list' });
    }
    return {
      mod: 'clients', crumbs: [['Clients', '#/clients'], [c.id + ' ' + c.rubrik]], title: 'Client ' + c.id + ' ' + c.rubrik,
      html: H.title('Client ' + c.id + ' · ' + e(c.rubrik), '[KND-0210]') + banner + tabs + '<div class="tabbody">' + body + '</div>'
    };
  };

  /* ---------- Konten ---------- */
  V.accounts = function () {
    const s = H.S();
    const f = H.f('accounts');
    const list = s.accounts.filter(function (a) {
      if (a.closed) return false;
      if (f.ccy && a.ccy !== f.ccy) return false;
      if (f.type && a.type !== f.type) return false;
      return true;
    }).sort(function (a, b) { return G.valueCHF(b) - G.valueCHF(a); });
    let tot = 0;
    const rows = list.map(function (a) {
      const c = G.client(a.client);
      const v = G.valueCHF(a);
      tot += v;
      return ['<a href="#/account/' + a.id + '">' + a.id + '</a>', H.cref(c), e(G.holderName(a)), H.accShort(a), H.ccyL(a.ccy), num(a.bal, a.type === 'DEP' ? 2 : H.dec(a.ccy)), U.fmt(v, 0)];
    });
    const ccys = Array.from(new Set(s.accounts.map(function (a) { return a.ccy; }))).sort();
    return {
      mod: 'accounts', crumbs: [['Accounts'], ['Account list']], title: 'Account list',
      html: H.title('Account list (Kontenliste)', '[KTO-0100]', list.length + ' open account(s), sorted by CHF equivalent') +
        H.filter('Currency ' + H.sel('data-filter="accounts.ccy"', [['', 'all']].concat(ccys), f.ccy || '') + ' Type ' + H.sel('data-filter="accounts.type"', [['', 'all'], ['CUR', 'Kontokorrent'], ['DEP', 'Depot'], ['MET', 'Edelmetall']], f.type || '')) +
        grid(['Account', 'Relationship', 'Holder', 'Type', 'Ccy', { t: 'Balance', num: true }, { t: 'CHF equivalent', num: true }], rows, { foot: ['', '', '<b>Total</b>', '', '', '', '<b>' + U.fmt(tot, 0) + '</b>'] })
    };
  };

  V.account = function (id) {
    const s = H.S();
    const a = G.account(id);
    if (!a) return V.notFound('Account ' + id);
    const c = G.client(a.client);
    const B = D.BANK;
    const dc = a.type === 'DEP' ? 2 : H.dec(a.ccy);
    const txs = s.tx.filter(function (t) { return t.acc === a.id; }).slice(-60);
    const rows = txs.map(function (t) {
      return [U.fmtDate(t.d), e(t.text) + (t.cp && t.kind !== 'int-in' && t.kind !== 'int-out' ? '<br><span class="muted">' + e(t.cp) + '</span>' : ''), U.fmtDate(t.val),
        t.kind === 'open' ? '' : t.amt < 0 ? U.fmt(-t.amt, dc) : '', t.kind === 'open' ? '' : t.amt >= 0 ? U.fmt(t.amt, dc) : '', num(t.bal, dc)];
    });
    const addr = c.holdMail ? '<div class="stamp">BANKLAGERND</div><div>Numbered account <b>' + e(c.rubrik) + '</b><br>Correspondence held at the bank</div>' :
      '<div>' + e(c.name) + '<br>' + e(c.city) + '<br>' + e(G.cname(c.dom).toUpperCase()) + '</div>';
    return {
      mod: 'accounts', crumbs: [['Accounts', '#/accounts'], [a.id]], title: 'Statement ' + a.id,
      html: H.title('Statement of account (Kontoauszug) ' + a.id, '[KTO-0220]') +
        '<div class="btnbar left noprint">' + btn(ico('print') + ' Print', 'print') + btn('‹ Back to client', 'go', ' data-href="#/client/' + c.id + '/accounts"') + '</div>' +
        '<div class="doc stmt"><div class="lh"><div class="lhl"><div class="wm">VOGT &amp; CIE</div><div class="wms">PRIVATBANKIERS · ZÜRICH · SEIT 1871</div></div><div class="lhr">' + e(B.street) + '<br>' + e(B.pobox) + ', ' + e(B.zip) + '<br>Telefon ' + e(B.phone) + '<br>SWIFT ' + B.bic + ' · BC ' + B.clearing + '</div></div>' +
        '<div class="addr">' + addr + '</div><h2>Statement of account / Kontoauszug</h2>' +
        kv([['Account', a.id + ' · ' + H.accLabel(a)], ['Account holder', e(G.holderName(a))], ['Currency', H.ccyL(a.ccy)], ['Statement date', U.fmtDate(s.date)]], 'stmtkv') +
        grid(['Date', 'Text', 'Valuta', { t: 'Debit', num: true }, { t: 'Credit', num: true }, { t: 'Balance', num: true }], rows, { cls: 'stmt-t', foot: ['', '<b>Balance</b>', '', '', '', '<b>' + U.fmt(a.bal, dc) + '</b>'] }) +
        '<p class="small">Please check this statement. Objections must be raised within 30 days, otherwise the statement is deemed approved. ' + (a.type === 'MET' ? 'Holdings in fine gold 999.9 are kept in unallocated form in our vaults. ' : '') + (a.type === 'DEP' ? 'Securities are valued at closing prices; positions see the portfolio statement. ' : '') + 'This statement is produced by computer and bears no signature.</p></div>'
    };
  };

  V.loans = function () {
    const s = H.S();
    const rows = s.loans.filter(function (l) { return l.status === 'active'; }).map(function (l) {
      const c = G.client(l.client);
      return [l.id, H.cref(c), l.type === 'lombard' ? 'Lombard loan' : 'Back-to-back guarantee', l.ccy + ' ' + U.fmt(l.amount, 0), U.fmt(l.amount * G.rate(l.ccy), 0), l.type === 'lombard' ? 'Libor + 1.75%' : '1.25% guarantee fee', l.bank ? e(l.bank) : '', U.fmtDate(l.opened), btn(l.type === 'lombard' ? 'Repay' : 'Release', 'repay', ' data-id="' + l.id + '"', 'sm')];
    });
    return {
      mod: 'accounts', crumbs: [['Accounts', '#/accounts'], ['Loans']], title: 'Loans',
      html: H.title('Loans and guarantees (Kredite)', '[KRE-0100]', 'Lombard loans against securities; back-to-back loans of correspondents secured by client deposits.') +
        grid(['Loan', 'Client', 'Type', { t: 'Amount', num: true }, { t: 'CHF', num: true }, 'Pricing', 'Lender at home', 'Since', ''], rows, { empty: 'No loans outstanding.' }) +
        H.note('Lombard loans are granted from the client file (Products tab). Margin calls arrive by memo when collateral falls below 143% of the loan.')
    };
  };

  V.vault = function () {
    const s = H.S();
    const cap = G.vaultCapacity();
    const used = s.boxes.filter(function (b) { return b.status === 'active'; });
    let cells = '';
    for (let i = 0; i < cap; i++) {
      const b = used[i];
      const c = b ? G.client(b.client) : null;
      cells += '<div class="vbox' + (b ? ' used size' + b.size : '') + '" title="' + (b ? e(b.id + ' – ' + (c ? c.rubrik : '')) : 'free') + '">' + (b ? '<span>' + e(c ? c.rubrik.slice(0, 4) : '') + '</span>' : '') + '</div>';
    }
    return {
      mod: 'accounts', crumbs: [['Accounts', '#/accounts'], ['Vault']], title: 'Vault',
      html: H.title('Vault – safe-deposit boxes (Tresoranlage)', '[TRE-0100]', used.length + ' of ' + cap + ' boxes rented · annual rent income CHF ' + U.fmt(used.reduce(function (t, b) { return t + b.fee; }, 0), 0)) +
        panel('Vault plan, basement 2', '<div class="vault">' + cells + '</div><div class="small muted pad">Hover over a box for the holder. Boxes are rented from the client file (Products tab).</div>', { icon: 'lock', tools: btn('Extend vault (+100 boxes, CHF 450,000)', 'vaultext', '', 'sm') + ' ' + H.dur(20) }) +
        grid(['Box', 'Client', 'Size', { t: 'Rent', num: true }, 'Since'], used.map(function (b) { return [b.id, H.cref(G.client(b.client)), e(D.BOX_SIZES[b.size].label), U.fmt(b.fee, 0), U.fmtDate(b.opened)]; }), { empty: 'No boxes rented.' })
    };
  };

  /* ---------- Zahlungsverkehr ---------- */
  function precheckCell(p) {
    const chk = G.precheck(p);
    if (chk.errors.length) return st('bad', 'Error');
    let h = '';
    if (chk.hits.length) h += '<span class="hits" title="' + e(chk.hits.map(function (r) { return r + ' ' + D.RULES[r]; }).join('\n')) + '">' + st('bad', chk.hits.join(' ')) + '</span> ';
    const xb = chk.notes.reduce(function (t, n) { return t + n[1]; }, 0);
    if (xb >= 0.05) h += st(xb >= 4 ? 'warn' : 'mod', 'XB ' + G.exposureLabel(xb));
    return h || st('ok', 'OK');
  }

  V.payQueue = function () {
    const s = H.S();
    const rows = G.pendingPayments().map(function (p) {
      const c = G.client(p.client);
      const bank = D.bankByBic(p.bic);
      return [p.ref + '<br><span class="muted">' + U.fmtDate(p.d) + ' ' + U.fmtTime(p.t) + '</span>', p.source === 'client' ? st('mod', 'Client fax') : st('ok', 'Manual'), '<a href="#/account/' + p.debit + '">' + p.debit + '</a><br>' + H.cref(c),
        e(p.benefName) + '<br><span class="muted">' + e(bank ? bank.name : p.bic) + '</span>', H.cty(p.country), '<b>' + p.ccy + ' ' + U.fmt(p.amount, H.dec(p.ccy)) + '</b>', precheckCell(p),
        '<span class="nowrap">' + btn('Edit', 'payedit', ' data-id="' + p.id + '"', 'sm') + btn('Release', 'payrelease', ' data-id="' + p.id + '"', 'sm def') + btn('Reject', 'payreject', ' data-id="' + p.id + '"', 'sm') + '</span>'];
    });
    return {
      mod: 'payments', crumbs: [['Payments'], ['Release queue']], title: 'Release queue',
      html: H.title('Release queue – four-eyes principle (Freigabe)', '[ZV-0400]', 'Payment orders entered or received by fax, awaiting second signature. Release ' + H.dur(4) + ' · edit ' + H.dur(2)) +
        (s.corr.status !== 'active' ? H.note('<b>USD correspondent: ' + s.corr.status + '.</b> ' + (s.corr.status === 'notice' ? 'US dollar payments possible until ' + U.fmtDate(s.corr.until) + '.' : 'US dollar payments are suspended – <a href="#/org/corr">find a new correspondent</a>.')) : '') +
        grid(['Reference', 'Source', 'Debit account', 'Beneficiary', 'Ctry', { t: 'Amount', num: true }, 'Pre-check', ''], rows, { empty: 'No payments awaiting release.' }) +
        '<div class="legend small">' + st('bad', 'TM-xx') + ' monitoring rule will create an alert &nbsp; ' + st('warn', 'XB') + ' cross-border paper trail &nbsp; Hover over a rule code for details.</div>'
    };
  };

  V.payNew = function (q) {
    const s = H.S();
    const dr = PBS.UI.draft || {};
    const cid = q.c || dr.client;
    const filter = function (a) { return a.type === 'CUR' && (!cid || a.client === cid); };
    const bicList = D.BANKS.map(function (b) { return '<option value="' + b.bic + '">' + e(b.name) + ', ' + e(b.city) + '</option>'; }).join('');
    const ccys = G.currencies().map(function (x) { return '<option' + ((dr.ccy || (s.date < D.EURO_DATE ? 'DEM' : 'EUR')) === x ? ' selected' : '') + '>' + x + '</option>'; }).join('');
    const ctys = Object.keys(D.COUNTRIES).sort().map(function (k) { return '<option value="' + k + '"' + (dr.country === k ? ' selected' : '') + '>' + k + ' – ' + e(D.COUNTRIES[k].n) + '</option>'; }).join('');
    const bank = D.bankByBic(dr.bic);
    const f = '<form data-form="pay" id="payform" autocomplete="off"><table class="frm">' +
      '<tr><th>Debit account <i class="req">*</i></th><td colspan="3"><select name="debit" class="inp req" style="width:100%"><option value="">– select current account –</option>' + H.accountOptions(filter, dr.debit) + '</select>' +
      (cid ? '<div class="small muted">Filtered on relationship ' + cid + ' · <a href="#/pay/new">show all</a></div>' : '') + '</td></tr>' +
      '<tr class="sec"><td colspan="4">:32A: Value date / Currency / Amount</td></tr>' +
      '<tr><th>Value date (Valuta)</th><td colspan="3"><input class="inp" name="valuta" value="' + U.fmtDate(U.addBusinessDays(s.date, 1)) + '" size="11" readonly> <span class="small muted">next business day</span></td></tr>' +
      '<tr><th>Currency / amount <i class="req">*</i></th><td colspan="3"><select name="ccy" class="inp req">' + ccys + '</select> <input name="amount" class="inp req num" size="18" value="' + e(dr.amount || '') + '" placeholder="0.00"></td></tr>' +
      '<tr class="sec"><td colspan="4">:50K: Ordering customer</td></tr>' +
      '<tr><th>Originator</th><td colspan="3"><label><input type="radio" name="hideOrig" value="0"' + (dr.hideOrig ? '' : ' checked') + '> Account number and name of account holder</label><br>' +
      '<label><input type="radio" name="hideOrig" value="1"' + (dr.hideOrig ? ' checked' : '') + '> "ONE OF OUR CLIENTS" – no name transmitted</label></td></tr>' +
      '<tr class="sec"><td colspan="4">:57A: Account with institution</td></tr>' +
      '<tr><th>BIC <i class="req">*</i></th><td colspan="3"><input name="bic" class="inp req up" size="12" maxlength="11" list="biclist" value="' + e(dr.bic || '') + '"><datalist id="biclist">' + bicList + '</datalist> <span id="bankname">' + (bank ? e(bank.name + ', ' + bank.city) : '<span class="muted">– enter BIC –</span>') + '</span></td></tr>' +
      '<tr><th>Country <i class="req">*</i></th><td colspan="3"><select name="country" class="inp req"><option value="">– select –</option>' + ctys + '</select></td></tr>' +
      '<tr class="sec"><td colspan="4">:59: Beneficiary customer</td></tr>' +
      '<tr><th>Account / IBAN</th><td colspan="3"><input name="benefAcct" class="inp up" size="40" value="' + e(dr.benefAcct || '') + '"></td></tr>' +
      '<tr><th>Name <i class="req">*</i></th><td colspan="3"><input name="benefName" class="inp req" size="50" value="' + e(dr.benefName || '') + '"></td></tr>' +
      '<tr><th>Address</th><td colspan="3"><input name="benefAddr" class="inp" size="50" value="' + e(dr.benefAddr || '') + '"></td></tr>' +
      '<tr class="sec"><td colspan="4">:70: Remittance information &nbsp; :71A: Details of charges</td></tr>' +
      '<tr><th>Purpose</th><td colspan="3"><input name="purpose" class="inp" size="40" maxlength="35" value="' + e(dr.purpose || '') + '"></td></tr>' +
      '<tr><th>Charges</th><td colspan="3">' + H.sel('name="charges"', ['SHA', 'OUR', 'BEN'], dr.charges || 'SHA') + ' <span class="small muted">SHA shared · OUR all charges to client · BEN all charges to beneficiary</span></td></tr>' +
      '</table><div class="btnbar">' + H.dur(8) + '<button type="button" class="btn" data-act="paycheck">Check (Prüfen)</button> <button type="submit" class="btn def">Submit for release</button> <button type="button" class="btn" data-act="payclear">Clear</button></div></form>';
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['New payment']], title: 'New payment MT103',
      html: H.title('Payment order – SWIFT MT103 entry', '[ZV-0310]', 'Single customer credit transfer. Fields marked <i class="req">*</i> are mandatory.') +
        '<div class="cols"><div class="col-l">' + panel('Payment order', f, { icon: 'doc' }) + '</div><div class="col-r">' +
        panel('Pre-check (Vorprüfung)', '<div id="precheck"><span class="muted">Press "Check" to run the transaction-monitoring pre-check.</span></div>', { icon: 'shield' }) +
        panel('Hints', '<ul class="hints"><li>Payments into a client\'s country of domicile leave a paper trail with the tax authorities there.</li><li>Debiting a structure\'s account, booking abroad and omitting the originator name reduce that trail.</li><li>Commission: CHF 40 + 0.05% (max. CHF 750), OUR + CHF 25' + (s.corr.fee ? ', correspondent surcharge CHF ' + s.corr.fee : '') + '.</li></ul>', { icon: 'info' }) +
        panel('BIC directory (extract)', grid(['BIC', 'Institution', 'Ctry'], D.BANKS.map(function (b) { return ['<span class="mono">' + b.bic + '</span>', e(b.name) + ', ' + e(b.city), H.cty(b.c)]; }), { cls: 'compact' }), { icon: 'list', flush: true, cls: 'scrollp' }) +
        '</div></div>'
    };
  };

  V.precheckResult = function (p) {
    const chk = G.precheck(p);
    if (chk.errors.length) return '<div class="errbox">' + chk.errors.map(function (x) { return '<div>' + ico('warn') + ' ' + e(x) + '</div>'; }).join('') + '</div>';
    const acc = chk.acc;
    let h = kv([
      ['Amount in CHF', 'CHF ' + U.fmt(chk.chf)],
      ['Debit ' + acc.id, acc.ccy + ' ' + U.fmt(chk.debitAmt, H.dec(acc.ccy)) + (p.ccy !== acc.ccy ? ' <span class="muted">(incl. FX margin)</span>' : '')],
      ['Commission', 'CHF ' + U.fmt(chk.fee)],
      ['Balance after booking', acc.ccy + ' ' + U.fmt(acc.bal - chk.debitAmt - chk.feeAcc, H.dec(acc.ccy))]
    ]);
    h += '<div class="pcsec">Transaction monitoring</div>';
    h += chk.hits.length ? chk.hits.map(function (r) { return '<div class="hit bad">' + ico('warn') + ' <b>' + r + '</b> ' + e(D.RULES[r]) + '</div>'; }).join('') : '<div class="hit ok">' + ico('check') + ' No rule triggered.</div>';
    h += '<div class="pcsec">Cross-border exposure (XB)</div>';
    h += chk.notes.length ? chk.notes.map(function (n) {
      return '<div class="hit ' + (n[1] >= 4 ? 'warn' : 'mod') + '">' + ico('flag') + ' ' + e(G.authShort(n[0])) + ': <b>' + G.exposureLabel(n[1]) + '</b> <span class="muted">(+' + U.fmt(n[1], 1) + ')</span></div>';
    }).join('') : '<div class="hit ok">' + ico('check') + ' No noticeable paper trail.</div>';
    return h;
  };

  V.payTransfer = function (q) {
    const cid = q.c;
    const filter = function (a) { return !cid || a.client === cid; };
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Internal transfer']], title: 'Internal transfer',
      html: H.title('Internal transfer (Kontoübertrag)', '[ZV-0120]', 'Transfers between accounts held with us. No SWIFT message, no trail abroad. ' + H.dur(4)) +
        '<form data-form="transfer" autocomplete="off">' + panel('Transfer', '<table class="frm">' +
          '<tr><th>Debit account <i class="req">*</i></th><td><select name="from" class="inp req" style="width:100%"><option value="">– select –</option>' + H.accountOptions(filter) + '</select></td></tr>' +
          '<tr><th>Credit account <i class="req">*</i></th><td><select name="to" class="inp req" style="width:100%"><option value="">– select –</option>' + H.accountOptions(filter) + '</select></td></tr>' +
          '<tr><th>Amount (in debit currency) <i class="req">*</i></th><td><input name="amount" class="inp req num" size="18"></td></tr>' +
          '<tr><th>Booking text</th><td><input name="text" class="inp" size="50" placeholder="(automatic)"></td></tr>' +
          '<tr><th>Preview</th><td id="trprev" class="muted">–</td></tr>' +
          '</table>' + (cid ? '<div class="small muted">Filtered on relationship ' + cid + ' · <a href="#/pay/transfer">show all</a></div>' : '') +
          '<div class="btnbar"><button type="submit" class="btn def">Execute transfer</button></div>', { icon: 'swap' }) + '</form>' +
        H.note('Moving assets into accounts of a client\'s structure reduces the trail of future payments. Transfers between different relationships are monitored.')
    };
  };

  V.cashDesk = function () {
    const s = H.S();
    const tellers = G.activeStaff('teller');
    const rows = s.counter.map(function (k) {
      const c = G.client(k.client);
      const chf = k.amount * G.rate(k.ccy);
      const hits = [];
      if (chf >= 25000) hits.push('TM-01');
      if (!c.formA && chf >= 25000) hits.push('TM-05');
      if (chf > 0.3 * c.wealth && !k.funding) hits.push('TM-09');
      return [U.fmtTime(k.t), H.cref(c, true), k.type === 'in' ? st('ok', 'Deposit') : st('warn', 'Withdrawal'),
        '<b>' + k.ccy + ' ' + U.fmt(k.amount, H.dec(k.ccy)) + '</b><br><span class="muted">CHF ' + U.fmt(chf, 0) + '</span>',
        e(k.note) + (k.courier ? '<br><span class="muted">delivered by courier</span>' : '') + (k.funding ? '<br>' + st('mod', 'Initial funding') : ''),
        hits.length ? st('bad', hits.join(' ')) : st('ok', 'below threshold'),
        '<span class="nowrap">' + btn(k.type === 'in' ? 'Accept deposit' : 'Pay out', 'cashok', ' data-id="' + k.id + '"', 'sm def') + btn('Refuse', 'cashno', ' data-id="' + k.id + '"', 'sm') + '</span>'];
    });
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Cash desk']], title: 'Cash desk',
      html: H.title('Cash desk (Kasse) – Bahnhofstrasse', '[KAS-0100]', (tellers.length ? 'Teller: ' + tellers.map(function (x) { return e(x.name); }).join(', ') : '<span class="neg">No teller – the cash desk is closed.</span>') + ' · Clients not served by the end of day will leave. ' + H.dur(10)) +
        grid(['Arrived', 'Client', 'Transaction', { t: 'Amount', num: true }, 'Remarks', 'Monitoring', ''], rows, { empty: 'Nobody at the counter.' }) +
        H.note('Cash transactions of CHF 25,000 and more require identification and are reported by transaction monitoring (TM-01). Commission: 0.30% on deposits, 0.10% on withdrawals.')
    };
  };

  V.couriers = function () {
    const s = H.S();
    const crs = G.activeStaff('courier');
    const rows = s.couriers.slice(0, 40).map(function (k) {
      const c = G.client(k.client);
      const stt = { requested: st('warn', 'Requested'), scheduled: st('mod', 'Under way'), done: st('ok', 'Delivered'), seized: st('bad', 'SEIZED'), declined: st('mod', 'Declined'), cancelled: st('mod', 'Cancelled') }[k.status];
      return [k.id, U.fmtDate(k.d), H.cref(c), e(k.from), k.ccy + ' ' + U.fmt(k.amount, 0), k.status === 'requested' ? U.fmt(G.courierRisk(k) * 100, 0) + '%' : k.risk ? U.fmt(k.risk * 100, 0) + '%' : '', stt,
        k.status === 'requested' ? btn('Send courier', 'courierok', ' data-id="' + k.id + '"', 'sm def') + btn('Decline', 'courierno', ' data-id="' + k.id + '"', 'sm') : ''];
    });
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Courier service']], title: 'Courier service',
      html: H.title('Courier service – "special services"', '[KUR-0100]', 'Collection of cash from clients abroad. Commission ' + U.fmt(s.pricing.courier * 100, 1) + '% · approve ' + H.dur(10)) +
        (s.pricing.courierOn ? '' : H.note('The service is currently not offered. It can be switched on under <a href="#/org/pricing">Organisation › Products & pricing</a>.')) +
        H.kv([['Couriers', crs.length ? crs.map(function (x) { return e(x.name) + ' ' + H.stars(x.skill) + (x.busyUntil && x.busyUntil >= s.date ? ' <span class="muted">(on the road)</span>' : ''); }).join('<br>') : '<span class="neg">none – hire one under Organisation › Recruitment</span>'], ['Lugano branch', s.branches.LU ? st('ok', 'open – Italian runs are safer') : st('mod', 'not open')]]) +
        grid(['No.', 'Date', 'Client', 'Collection in', { t: 'Amount', num: true }, { t: 'Arrest risk', num: true }, 'Status', ''], rows, { empty: 'No requests.' }) +
        H.note('Every run is a criminal act abroad. An arrested courier talks: foreign attention, an investigation of the bank and your personal exposure all rise.')
    };
  };

  V.payDone = function () {
    const s = H.S();
    const rows = s.payments.filter(function (p) { return p.status !== 'pending'; }).slice(0, 120).map(function (p) {
      const stt = { released: st('ok', 'Released'), rejected: st('bad', 'Rejected'), cancelled: st('mod', 'Cancelled') }[p.status];
      return ['<a href="#/pay/' + p.id + '">' + p.ref + '</a>', U.fmtDate(p.released || p.d), p.debit, e(p.benefName), H.cty(p.country), p.ccy + ' ' + U.fmt(p.amount, H.dec(p.ccy)), stt + (p.alert ? ' ' + st('bad', p.alert) : ''),
        p.status === 'released' ? '<a href="#/pay/' + p.id + '">MT103</a>' : ''];
    });
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Payment journal']], title: 'Payment journal',
      html: H.title('Payment journal (Zahlungsjournal)', '[ZV-0500]') +
        grid(['Reference', 'Date', 'Debit account', 'Beneficiary', 'Ctry', { t: 'Amount', num: true }, 'Status', ''], rows, { empty: 'No payments yet.' })
    };
  };

  V.mt103 = function (p) {
    const a = G.account(p.debit);
    const c = G.client(p.client);
    const bank = D.bankByBic(p.bic);
    const n = parseInt(p.id.slice(1), 10);
    const amt = U.fmt(p.amount, H.dec(p.ccy)).replace(/'/g, '').replace('.', ',');
    const orig = p.hideOrig ? 'ONE OF OUR CLIENTS' : (a ? G.holderName(a) : '').toUpperCase() + '\nZUERICH';
    const lines = [
      '{1:F01' + D.BANK.bic + 'AXXX' + U.pad(4410 + n, 4) + U.pad(n * 7919 % 1000000, 6) + '}' +
      '{2:I103' + (p.bic || 'XXXXXXXX').toUpperCase().slice(0, 8) + 'XXXXN}{3:{108:' + p.ref + '}}{4:',
      ':20:' + p.ref, ':23B:CRED', ':32A:' + U.swiftDate(p.valuta || p.d) + p.ccy + amt, ':50K:/' + (p.debit || ''), orig,
      ':57A:' + (p.bic || '').toUpperCase(), ':59:/' + String(p.benefAcct || '').replace(/\s/g, ''), String(p.benefName || '').toUpperCase().slice(0, 35),
      String(p.benefAddr || '').toUpperCase().slice(0, 35), ':70:' + String(p.purpose || '').toUpperCase().slice(0, 35), ':71A:' + p.charges,
      '-}{5:{CHK:' + (n * 2654435761 % 0xFFFFFFFFFFFF).toString(16).toUpperCase().padStart(12, '0') + '}}'
    ].filter(function (l) { return l !== ''; });
    return '<pre class="swift">' + e(lines.join('\n')) + '</pre>' +
      '<div class="small muted">Sent via SWIFT to ' + e(bank ? bank.name + ', ' + bank.city : p.bic) + (c ? ' · relationship ' + c.id + ' ' + e(c.rubrik) : '') + '</div>';
  };

  V.payView = function (id) {
    const s = H.S();
    const p = s.payments.find(function (x) { return x.id === id; });
    if (!p) return V.notFound('Payment ' + id);
    const c = G.client(p.client);
    const bank = D.bankByBic(p.bic);
    return {
      mod: 'payments', crumbs: [['Payments', '#/pay/queue'], ['Payment journal', '#/pay/done'], [p.ref]], title: 'Payment ' + p.ref,
      html: H.title('Payment ' + p.ref, '[ZV-0510]') +
        '<div class="cols"><div class="col-h">' + panel('Order details', kv([
          ['Reference (:20:)', p.ref], ['Status', p.status], ['Entered', U.fmtDate(p.d) + ' ' + U.fmtTime(p.t) + (p.source === 'client' ? ' (client fax)' : ' (manual)')],
          ['Released', p.released ? U.fmtDate(p.released) + (p.rt ? ' ' + U.fmtTime(p.rt) : '') + ' · visa ' + e(s.user.id) : '–'],
          ['Relationship', H.cref(c)], ['Debit account', p.debit], ['Amount', p.ccy + ' ' + U.fmt(p.amount, H.dec(p.ccy))], ['Commission', p.fee ? 'CHF ' + U.fmt(p.fee) : '–'],
          ['Beneficiary', e(p.benefName)], ['Bank', e(bank ? bank.name + ', ' + bank.city : p.bic) + ' (' + e(p.bic) + ')'], ['Purpose', e(p.purpose)],
          ['Monitoring alert', p.alert ? '<a href="#/compliance/alerts">' + p.alert + '</a>' : '–']
        ]), { icon: 'doc' }) + '</div><div class="col-h">' + panel('SWIFT message MT103', p.status === 'released' ? V.mt103(p) : '<div class="muted">No message sent.</div>', { icon: 'doc', tools: btn(ico('print') + ' Print', 'print', '', 'sm') }) + '</div></div>'
    };
  };
})(window.PBS);
