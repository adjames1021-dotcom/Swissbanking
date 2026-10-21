/* PBS/Web – Krypto-Bank (moderne Epoche): Übersicht, Verwahrung, Staking, Krypto-Lombard,
   Gegenparteien, Blockchain-Analyse. Formulare und Knöpfe mit data-cb-form / data-cb-act sind hier
   selbst verdrahtet (eigene Listener, kein Eingriff in app.js). */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, H = PBS.H, V = PBS.Views;
  const e = U.esc, tr = PBS.L.t;
  function CB() { return G.cbank; }
  function C() { return G.crypto; }
  const qd = function (q) { return Math.abs(q) >= 1000 ? 2 : 4; };
  const pd = function (p) { return p >= 1 ? 2 : p >= 0.01 ? 4 : 6; };
  function tabs(cur) {
    const calls = CB().calls(), ca = CB().openCA().length;
    return H.tabs('crypto', [['', 'Overview'], ['/custody', 'Custody'], ['/staking', 'Staking'], ['/loans', 'Crypto loans' + (calls ? ' (' + calls + ')' : '')], ['/cps', 'Counterparties'], ['/screening', 'Chain analysis' + (ca ? ' (' + ca + ')' : '')]], cur);
  }
  function off(title) {
    return { mod: 'crypto', crumbs: [['Crypto']], title: title, html: H.title('Digital assets', '[DAS-0000]') + H.note('Crypto custody and lending are only available in the modern era (2018–2025).') };
  }
  function ready() { return CB() && CB().on() && C(); }
  function view(cur, crumb, title, code, sub, html) {
    return { mod: 'crypto', crumbs: [['Crypto', '#/crypto']].concat(crumb ? [[crumb]] : []), title: title, html: H.title(title, code, sub) + tabs(cur) + html };
  }
  function coinName(id) { return CB().name(id); }
  function coinOpts(filter) {
    return C().list().filter(function (c) { return C().status(c) === 'open' && (!filter || filter(c)); }).map(function (c) { return [c.id, c.id + ' – ' + c.name]; });
  }
  function chgCell(id) { return H.chg(CB().chg(id) * 100, 1, '%'); }
  function hist(id, n) { return H.S().mhist.slice(-(n || 120)).filter(function (m) { return m[id]; }).map(function (m) { return [m.d, m[id]]; }); }
  function chg30(id) { const h = hist(id, 22); return h.length > 1 ? h[h.length - 1][1] / h[0][1] - 1 : 0; }
  function chf(v) { return U.fmt(v, 0); }
  function usd(v) { return U.fmt(v / G.rate('USD'), 0); }
  function accLink(a) { return '<a href="#/account/' + a.id + '">' + a.id + '</a>'; }
  function cbtn(label, act, id, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-cb-act="' + act + '" data-id="' + e(id) + '">' + label + '</button>'; }
  function scoreSt(sc) { return H.st(sc >= 75 ? 'bad' : sc >= 50 ? 'warn' : sc >= 25 ? 'mod' : 'ok', String(sc)); }

  /* ---------- Übersicht ---------- */
  V.crypto = function () {
    if (!ready()) return off('Crypto');
    const s = H.S(), cb = CB(), b = cb.state(), f = H.f('crypto');
    const cust = cb.custody();
    const aum = cb.aum(), staked = cb.stakedChf();
    const loans = cb.activeLoans();
    const lchf = loans.reduce(function (x, l) { return x + cb.loanChf(l); }, 0);
    const ex = cb.exposure();
    let own = 0, cli = 0, lost = 0;
    Object.keys(ex).forEach(function (k) { own += ex[k].own; cli += ex[k].client; lost += ex[k].lost; });
    const coin = f.coin && C().get(f.coin) ? f.coin : 'BTC';
    const kf = H.kv([
      [tr('Krypto-Verwahrung (Custody)', 'Crypto custody'), 'CHF <b>' + chf(aum) + '</b> <span class="muted">(USD ' + usd(aum) + ', ' + U.fmt(G.totalAUM() ? aum / G.totalAUM() * 100 : 0, 1) + '% of AuM)</span>'],
      ['Clients holding coins', cb.clients().length + ' <span class="muted">/ ' + G.activeClients().length + ' relationships</span>'],
      ['Staked', 'CHF ' + chf(staked) + ' <span class="muted">(' + U.fmt(aum ? staked / aum * 100 : 0, 1) + '%)</span>'],
      ['Crypto Lombard loans', 'CHF ' + chf(lchf) + ' <span class="muted">(' + loans.length + ' loans' + (cb.calls() ? ', <b class="neg">' + cb.calls() + ' margin call(s)</b>' : '') + ')</span>'],
      ['Counterparty exposure', 'own CHF ' + chf(own) + ' · client coins CHF ' + (cli ? '<b class="neg">' + chf(cli) + '</b>' : '0') + (lost ? ' · <span class="neg">lost CHF ' + chf(lost) + '</span>' : '')],
      ['Income since start', 'custody fees CHF ' + chf(b.tot.fees) + ' · staking commission ' + chf(b.tot.comm) + ' · loan interest ' + chf(b.tot.int) + ' · placement yield ' + chf(b.tot.yld)],
      ['Losses since start', b.tot.loss ? '<span class="neg">CHF ' + chf(b.tot.loss) + '</span>' : 'none'],
      ['Open chain-analysis alerts', cb.openCA().length ? '<a href="#/compliance/alerts">' + cb.openCA().length + ' open</a>' : 'none']
    ]);
    const rows = C().list().filter(function (c) { return C().status(c) !== 'ipo'; }).map(function (c) {
      const x = cust.find(function (y) { return y.id === c.id; });
      const st = C().status(c), px = C().usd(c.id);
      const si = cb.stakeInfo(c.id);
      const h = hist(c.id, 22).map(function (p) { return p[1]; });
      return { cls: st === 'bust' ? 'closed' : '', cells: [
        '<a href="#/trade/stock/' + c.id + '"><b>' + c.id + '</b></a> ' + e(c.name), px ? U.fmt(px, pd(px)) : '–', st === 'open' ? chgCell(c.id) : '<span class="neg">collapsed</span>', st === 'open' ? H.chg(chg30(c.id) * 100, 1, '%') : '',
        x ? U.fmt(x.q, qd(x.q)) : '', x ? chf(x.chf) : '', x && x.q ? U.fmt(x.staked / x.q * 100, 0) + '%' : '',
        U.fmt(cb.ltv(c.id) * 100, 0) + '%', si ? (si.avail ? U.fmt(si.apy, 1) + '%' : '<span class="muted">from ' + U.fmtDate(si.from) + '</span>') : '–',
        h.length > 2 ? H.spark(h, 70, 16) : '']
      };
    });
    const sel = H.filter('Chart ' + H.sel('data-filter="crypto.coin"', C().list().filter(function (c) { return C().status(c) !== 'ipo'; }).map(function (c) { return [c.id, c.id + ' – ' + c.name]; }), coin));
    const ch = hist(coin, 130);
    const jrn = b.jr.slice(0, 12).map(function (j) { return '<tr><td class="muted nowrap">' + U.fmtDate(j.d) + '</td><td>' + e(j.text) + '</td></tr>'; }).join('');
    const set = '<form data-cb-form="settings"><table class="frm">' +
      '<tr><th>Custody fee</th><td><input class="inp num" name="fee" size="5" value="' + U.fmt(b.fee * 100, 2) + '"> % p.a. <span class="small muted">on coin holdings, accrued daily, debited quarterly</span></td></tr>' +
      '<tr><th>Staking commission</th><td><input class="inp num" name="comm" size="5" value="' + U.fmt(b.comm * 100, 0) + '"> % <span class="small muted">of gross rewards</span></td></tr>' +
      '<tr><th>Alert threshold</th><td>' + H.sel('name="thr"', [[40, '40 (strict)'], [50, '50'], [60, '60 (standard)'], [75, '75'], [90, '90 (lenient)']], b.thr) + ' <span class="small muted">risk score for chain-analysis alerts</span></td></tr></table>' +
      '<div class="btnbar left"><button class="btn" type="submit">Save</button> ' + H.dur(5) + '</div></form>';
    return view('', null, 'Digital assets', '[DAS-0100]', 'Closing prices of ' + U.fmtDate(s.mhist[s.mhist.length - 1].d) + ' (USD) · custody, staking, crypto Lombard loans and counterparties',
      '<div class="cols"><div class="col-l">' + H.panel('Key figures', kf, { icon: 'chart', flush: true }) + sel +
      H.panel(e(coinName(coin)) + ' – USD, last ' + ch.length + ' trading days', H.lineChart(ch, 'USD', pd(C().usd(coin) || 1)), { icon: 'chart', flush: true }) + '</div><div class="col-r">' +
      H.panel('Desk journal', jrn ? '<table class="plist">' + jrn + '</table>' : '<p class="muted pad">Nothing yet.</p>', { icon: 'list', flush: true }) +
      H.panel('Pricing and screening', set, { icon: 'pen' }) + '</div></div>' +
      H.grid(['Coin', { t: 'USD', num: true }, { t: '24h', num: true }, { t: '1M', num: true }, { t: 'Custody qty', num: true }, { t: 'Value CHF', num: true }, { t: 'Staked', num: true }, { t: 'Lending value', num: true }, { t: 'Staking yield', num: true }, '1 month'], rows));
  };

  /* ---------- Verwahrung ---------- */
  V.cryptoCustody = function () {
    if (!ready()) return off('Crypto custody');
    const cb = CB(), f = H.f('crypto');
    const accs = cb.accounts(f.ccoin || null).filter(function (a) { return a.bal > 0 || f.zero === true; }).sort(function (a, b) { return b.bal * cb.px(b.ccy) - a.bal * cb.px(a.ccy); });
    let tot = 0, totD = 0;
    const rows = accs.map(function (a) {
      const px = cb.px(a.ccy), v = a.bal * px, dv = v - v / (1 + cb.chg(a.ccy));
      tot += v; totD += dv;
      const unb = cb.unbonding(a);
      return [H.cref(G.client(a.client)), accLink(a), '<b>' + a.ccy + '</b>', U.fmt(a.bal, qd(a.bal)), a.staked ? U.fmt(a.staked, qd(a.staked)) : unb ? '<span class="muted">' + U.fmt(unb, qd(unb)) + ' unbonding</span>' : '', a.pledged ? U.fmt(a.pledged, qd(a.pledged)) : '',
        U.fmt(cb.avail(a), qd(cb.avail(a))), chf(v), usd(v), H.chg(dv, 0)];
    });
    const cust = cb.custody();
    const by = cust.map(function (x) {
      return ['<b>' + x.id + '</b> ' + e(coinName(x.id)), x.n, U.fmt(x.q, qd(x.q)), U.fmt(x.staked, qd(x.staked)), U.fmt(x.pledged, qd(x.pledged)), U.fmt(C().usd(x.id), pd(C().usd(x.id))), chgCell(x.id), chf(x.chf), usd(x.chf)];
    });
    const totAll = cust.reduce(function (t, x) { return t + x.chf; }, 0);
    const filt = H.filter('Coin ' + H.sel('data-filter="crypto.ccoin"', [['', 'all']].concat(cust.map(function (x) { return [x.id, x.id]; })), f.ccoin || '') +
      ' <label><input type="checkbox" data-filterchk="crypto.zero"' + (f.zero === true ? ' checked' : '') + '> show empty accounts</label>');
    const dep = '<form data-cb-form="deposit"><table class="frm">' +
      '<tr><th>Client</th><td>' + H.clientsSelect('client') + '</td></tr>' +
      '<tr><th>Coin</th><td>' + H.sel('name="coin"', coinOpts(), 'BTC') + '</td></tr>' +
      '<tr><th>Quantity received</th><td><input class="inp num" name="q" size="12"></td></tr>' +
      '<tr><th>Origin (per client)</th><td>' + H.sel('name="origin"', [['exch', 'Exchange or bank'], ['wallet', 'Client\'s own wallet'], ['unknown', 'Not stated']], 'exch') + '</td></tr></table>' +
      '<div class="btnbar left"><button class="btn def" type="submit">Book receipt</button> ' + H.dur(10) + '</div><p class="small muted">The transfer is screened by the blockchain analytics tool when it is booked. Risk scores at or above the alert threshold raise a compliance alert.</p></form>';
    const accOpts = cb.accounts().filter(function (a) { return cb.avail(a) > 0; }).map(function (a) { return [a.id, a.id + ' · ' + G.client(a.client).rubrik + ' · ' + a.ccy + ' ' + U.fmt(cb.avail(a), qd(cb.avail(a))) + ' free']; });
    const wd = accOpts.length ? '<form data-cb-form="withdraw"><table class="frm">' +
      '<tr><th>Account</th><td>' + H.sel('name="acc"', accOpts, '') + '</td></tr>' +
      '<tr><th>Quantity</th><td><input class="inp num" name="q" size="12"></td></tr>' +
      '<tr><th>Destination</th><td>' + H.sel('name="dest"', [['exch', 'Exchange or bank'], ['wallet', 'Client\'s own wallet'], ['unknown', 'Not stated']], 'exch') + '</td></tr></table>' +
      '<div class="btnbar left"><button class="btn" type="submit">Send</button> ' + H.dur(10) + '</div></form>' : '<p class="muted pad">No free coins to send.</p>';
    return view('/custody', 'Custody', 'Crypto custody', '[DAS-0200]', 'Client coins held in the bank\'s wallets (cold storage, multi-signature). Values at today\'s closing price.',
      H.panel('Holdings by coin', H.grid(['Coin', { t: 'Clients', num: true }, { t: 'Quantity', num: true }, { t: 'Staked', num: true }, { t: 'Pledged', num: true }, { t: 'Price USD', num: true }, { t: '24h', num: true }, { t: 'Value CHF', num: true }, { t: 'Value USD', num: true }], by,
        { empty: 'No client holds coins.', foot: by.length ? ['<b>Total</b>', '', '', '', '', '', '', '<b>' + chf(totAll) + '</b>', '<b>' + usd(totAll) + '</b>'] : null }), { icon: 'lock', flush: true }) +
      filt + H.grid(['Client', 'Account', 'Coin', { t: 'Balance', num: true }, { t: 'Staked', num: true }, { t: 'Pledged', num: true }, { t: 'Free', num: true }, { t: 'Value CHF', num: true }, { t: 'Value USD', num: true }, { t: '24h CHF', num: true }], rows,
        { empty: 'No positions.', foot: rows.length ? ['<b>Total</b>', '', '', '', '', '', '', '<b>' + chf(tot) + '</b>', '<b>' + usd(tot) + '</b>', H.chg(totD, 0)] : null }) +
      '<div class="cols"><div class="col-h">' + H.panel('Incoming coins', dep, { icon: 'plus' }) + '</div><div class="col-h">' + H.panel('Outgoing coins', wd, { icon: 'swap' }) + '</div></div>');
  };

  /* ---------- Staking ---------- */
  V.cryptoStaking = function () {
    if (!ready()) return off('Staking');
    const s = H.S(), cb = CB(), b = cb.state();
    const coins = Object.keys(cb.CFG).filter(function (id) { return cb.stakeInfo(id); });
    const rows = coins.map(function (id) {
      const si = cb.stakeInfo(id), on = b.stk[id];
      const accs = cb.accounts(id);
      const q = accs.reduce(function (t, a) { return t + (a.staked || 0); }, 0);
      const stl = on ? H.st('ok', 'offered since ' + U.fmtDate(on.since)) : si.avail ? H.st('mod', 'possible, not offered') : H.st('off', 'from ' + U.fmtDate(si.from));
      return ['<b>' + id + '</b> ' + e(coinName(id)), stl, si.avail ? U.fmt(si.apy, 1) + '%' : '–', si.avail ? U.fmt(si.apy * (1 - b.comm), 2) + '%' : '–', si.unbond + ' d' + (si.locked ? '<br><span class="small neg">locked until ' + U.fmtDate(si.unlock) + '</span>' : ''), si.slash ? 'yes' : 'no',
        q ? U.fmt(q, qd(q)) : '', q ? chf(q * cb.px(id)) : '', !on && si.avail ? cbtn('Offer to clients', 'launch', id, 'def') + ' ' + H.dur(45) : ''];
    });
    const accs = cb.accounts().filter(function (a) { return b.stk[a.ccy] && (a.bal > 0 || a.staked); });
    const ar = accs.map(function (a) {
      const unb = (a.unb || []).map(function (u) { return U.fmt(u.q, qd(u.q)) + ' until ' + U.fmtDate(u.at); }).join('<br>');
      return [H.cref(G.client(a.client)), accLink(a), a.ccy, U.fmt(a.bal, qd(a.bal)), a.staked ? '<b>' + U.fmt(a.staked, qd(a.staked)) + '</b>' : '', unb ? '<span class="small">' + unb + '</span>' : '', a.stakeRew ? U.fmt(a.stakeRew, 6) : '', a.stkPend ? U.fmt(a.stkPend, 6) : '',
        (cb.avail(a) > 0 ? cbtn('Stake free coins', 'stake', a.id) + ' ' : '') + (a.staked ? cbtn('Unstake', 'unstake', a.id) : '')];
    });
    return view('/staking', 'Staking', 'Staking', '[DAS-0300]', 'Client coins delegated to validators through our operator. Rewards are paid in coins at month end, net of the bank\'s commission (' + U.fmt(b.comm * 100, 0) + '%).',
      H.grid(['Coin', 'Status', { t: 'Gross yield', num: true }, { t: 'Client net', num: true }, { t: 'Unbonding', num: true }, 'Slashing', { t: 'Staked', num: true }, { t: 'Value CHF', num: true }, ''], rows) +
      H.note('Dates are those of the networks: Tezos baking from September 2018, Cosmos from 2019, Cardano delegation from the Shelley upgrade (July 2020), Polkadot from August 2020, Solana rewards from February 2021, Ethereum after the Merge (15 September 2022). Staked ETH can only be withdrawn after the Shapella upgrade (12 April 2023). Slashing losses on our validators are carried by the bank.') +
      H.panel('Client accounts', H.grid(['Client', 'Account', 'Coin', { t: 'Balance', num: true }, { t: 'Staked', num: true }, 'Unbonding', { t: 'Rewards paid', num: true }, { t: 'Accrued', num: true }, ''], ar, { empty: 'No staking accounts yet.' }), { icon: 'folder', flush: true }));
  };

  /* ---------- Krypto-Lombard ---------- */
  V.cryptoLoans = function () {
    if (!ready()) return off('Crypto loans');
    const cb = CB(), b = cb.state();
    const stl = { ok: H.st('ok', 'OK'), watch: H.st('mod', 'above limit'), call: H.st('warn', 'margin call'), liq: H.st('bad', 'liquidation level'), closed: H.st('off', 'repaid'), liquidated: H.st('bad', 'liquidated') };
    const rows = b.loans.filter(function (l) { return l.status === 'active'; }).map(function (l) {
      const v = cb.loanLTV(l), c = G.client(l.client);
      const cls = v >= l.callAt ? 'bad' : v > l.ltv0 ? 'warn' : 'ok';
      return [l.id, H.cref(c), l.coin + ' ' + U.fmt(l.q, qd(l.q)), chf(cb.collChf(l)), l.ccy + ' ' + U.fmt(l.amount, 0), '<div style="min-width:90px">' + H.bar(Math.min(100, v / l.liq * 100), cls) + '</div><b>' + U.fmt(v * 100, 1) + '%</b>',
        U.fmt(l.ltv0 * 100, 0) + ' / ' + U.fmt(l.callAt * 100, 0) + ' / ' + U.fmt(l.liq * 100, 0) + '%', U.fmt(l.rate, 2) + '%', stl[cb.loanState(l)] + (l.call ? '<br><span class="small">due ' + U.fmtDate(l.call.due) + '</span>' : '') + (l.hold && l.hold >= H.S().date ? '<br><span class="small neg">no sale until ' + U.fmtDate(l.hold) + '</span>' : ''),
        cbtn('Repay', 'repay', l.id) + ' ' + cbtn('Sell collateral', 'liq', l.id)];
    });
    const old = b.loans.filter(function (l) { return l.status !== 'active'; }).slice(-30).reverse().map(function (l) {
      return [l.id, H.cref(G.client(l.client)), l.coin, U.fmtDate(l.opened), l.closed ? U.fmtDate(l.closed) : '', l.sold ? U.fmt(l.sold, qd(l.sold)) : '', stl[l.status] || l.status];
    });
    const accOpts = cb.accounts().filter(function (a) { return cb.ltv(a.ccy) > 0 && cb.maxLoan(a.id, 'CHF') >= 10000; }).map(function (a) { return [a.id, a.id + ' · ' + G.client(a.client).rubrik + ' · ' + a.ccy + ' ' + U.fmt(cb.avail(a), qd(cb.avail(a))) + ' · max CHF ' + U.fmt(cb.maxLoan(a.id, 'CHF'), 0)]; });
    const form = accOpts.length ? '<form data-cb-form="loan"><table class="frm">' +
      '<tr><th>Collateral</th><td>' + H.sel('name="acc"', accOpts, '') + '</td></tr>' +
      '<tr><th>Amount</th><td>' + H.sel('name="ccy"', [['CHF', 'CHF'], ['USD', 'USD']], 'CHF') + ' <input class="inp num" name="amount" size="12"> <span class="small muted">rate CHF ' + U.fmt(cb.loanRate('CHF'), 2) + '%, USD ' + U.fmt(cb.loanRate('USD'), 2) + '%</span></td></tr></table>' +
      '<div class="btnbar left"><button class="btn def" type="submit">Grant loan</button> ' + H.dur(25) + '</div></form>' : '<p class="muted pad">No client has coins with enough lending value.</p>';
    const lv = C().list().filter(function (c) { return C().status(c) === 'open'; }).map(function (c) {
      const x = cb.ltv(c.id);
      return [c.id, x ? U.fmt(x * 100, 0) + '%' : '<span class="muted">not accepted</span>', x ? U.fmt(cb.callAt(x) * 100, 0) + '%' : '', x ? U.fmt(cb.liqAt(x) * 100, 0) + '%' : ''];
    });
    return view('/loans', 'Crypto loans', 'Crypto Lombard loans', '[DAS-0400]', 'Loans in CHF or USD against pledged coins. Collateral is revalued every night; credit control calls margin and sells without asking once the liquidation level is reached.',
      H.grid(['Loan', 'Client', 'Collateral', { t: 'Value CHF', num: true }, { t: 'Loan', num: true }, 'LTV', { t: 'Limit / call / sale', num: true }, { t: 'Rate', num: true }, 'Status', ''], rows, { empty: 'No crypto loans outstanding.' }) +
      '<div class="cols"><div class="col-l">' + H.panel('New loan', form, { icon: 'scale' }) +
      H.panel('Closed and liquidated', H.grid(['Loan', 'Client', 'Coin', 'Opened', 'Closed', { t: 'Coins sold', num: true }, 'Status'], old, { empty: 'None.' }), { icon: 'list', flush: true }) + '</div><div class="col-r">' +
      H.panel('Lending values', H.grid(['Coin', { t: 'Lending value', num: true }, { t: 'Margin call', num: true }, { t: 'Forced sale', num: true }], lv), { icon: 'doc', flush: true }) + '</div></div>');
  };

  /* ---------- Gegenparteien ---------- */
  V.cryptoCps = function () {
    if (!ready()) return off('Counterparties');
    const s = H.S(), cb = CB(), b = cb.state();
    const ex = cb.exposure();
    const earned = {};
    b.pl.forEach(function (p) { earned[p.cp] = (earned[p.cp] || 0) + p.earned; });
    const stl = { soon: H.st('off', 'not yet'), open: H.st('ok', 'open'), frozen: H.st('bad', 'withdrawals frozen'), bankrupt: H.st('bad', 'bankrupt') };
    const rows = cb.CPS.map(function (cp) {
      const x = ex[cp.id], st = cb.cpStatus(cp);
      return ['<b>' + e(cp.name) + '</b><br><span class="small muted">' + e(cp.kind) + ', ' + e(cp.city) + '</span>', stl[st] + (st === 'soon' ? '<br><span class="small muted">from ' + U.fmtDate(cp.from) + '</span>' : ''),
        Object.keys(cp.y).map(function (k) { return (k === 'other' ? 'other' : k) + ' ' + U.fmt(cp.y[k], 1) + '%'; }).join('<br>'), x.own ? chf(x.own) : '', x.client ? '<b class="neg">' + chf(x.client) + '</b>' : '', x.lost ? '<span class="neg">' + chf(x.lost) + '</span>' : '', earned[cp.id] ? chf(earned[cp.id]) : ''];
    });
    const pl = b.pl.slice(0, 40).map(function (p) {
      const cp = cb.cp(p.cp), v = p.q * cb.px(p.coin);
      const pst = { active: H.st('ok', 'placed'), recall: H.st('mod', 'withdrawal ' + U.fmtDate(p.due)), closed: H.st('off', 'returned'), lost: H.st('bad', 'lost') }[p.status];
      return [p.id, U.fmtDate(p.d), e(cp.name), p.coin, U.fmt(p.q, qd(p.q)), p.src === 'client' ? '<b class="neg">client coins</b>' : 'own funds', U.fmt(p.y, 1) + '%', p.status === 'lost' ? '<span class="neg">' + chf(p.lossChf || v) + '</span>' : chf(v), chf(p.earned), pst, p.status === 'active' ? cbtn('Withdraw', 'recall', p.id) : ''];
    });
    const open = cb.CPS.filter(function (cp) { return cb.cpStatus(cp) === 'open'; });
    const form = open.length ? '<form data-cb-form="place"><table class="frm">' +
      '<tr><th>Counterparty</th><td>' + H.sel('name="cp"', open.map(function (cp) { return [cp.id, cp.name]; }), open[0].id) + '</td></tr>' +
      '<tr><th>Asset</th><td>' + H.sel('name="coin"', [['USD', 'USD stablecoins (own funds only)']].concat(coinOpts()), 'USD') + ' <input class="inp num" name="q" size="12" placeholder="quantity"></td></tr>' +
      '<tr><th>Source</th><td><label class="opt inl"><input type="radio" name="src" value="own" checked> Bank\'s own funds</label><br><label class="opt inl"><input type="radio" name="src" value="client"> Client coins from custody (clients keep their balance on our books)</label></td></tr></table>' +
      '<div class="btnbar left"><button class="btn def" type="submit">Place</button> ' + H.dur(15) + '</div>' +
      '<p class="small muted">Own funds: limit 25% of equity capital (CHF ' + chf(cb.ownLimit()) + ', used ' + chf(cb.ownPlaced()) + '), revalued daily through the trading book. Client coins: up to 80% of the free custody balance per coin. The custody agreement does not allow lending.</p></form>' : '<p class="muted pad">No platform takes deposits at the moment.</p>';
    const nw = [];
    cb.CPS.forEach(function (cp) { (cp.news || []).forEach(function (n) { if (n[0] <= s.date) nw.push([n[0], cp.name, n[1]]); }); });
    nw.sort(function (a, c) { return a[0] < c[0] ? 1 : -1; });
    return view('/cps', 'Counterparties', 'Counterparties', '[DAS-0500]', 'Lending platforms, exchanges and DeFi protocols that pay interest on coins. Withdrawals take two business days.',
      H.grid(['Counterparty', 'Status', 'Yield p.a.', { t: 'Own CHF', num: true }, { t: 'Client coins CHF', num: true }, { t: 'Lost CHF', num: true }, { t: 'Earned CHF', num: true }], rows) +
      '<div class="cols"><div class="col-l">' + H.panel('Placements', H.grid(['No.', 'Date', 'Counterparty', 'Asset', { t: 'Qty', num: true }, 'Source', { t: 'Yield', num: true }, { t: 'Value CHF', num: true }, { t: 'Earned CHF', num: true }, 'Status', ''], pl, { empty: 'No placements.' }), { icon: 'net', flush: true }) +
      '</div><div class="col-r">' + H.panel('New placement', form, { icon: 'plus' }) +
      H.panel('News', nw.length ? '<table class="plist">' + nw.slice(0, 12).map(function (n) { return '<tr><td class="muted nowrap">' + U.fmtDate(n[0]) + '</td><td>' + e(n[2]) + '</td></tr>'; }).join('') + '</table>' : '<p class="muted pad">No news.</p>', { icon: 'doc', flush: true }) + '</div></div>');
  };

  /* ---------- Blockchain-Analyse ---------- */
  V.cryptoScreening = function () {
    if (!ready()) return off('Chain analysis');
    const s = H.S(), cb = CB(), b = cb.state(), f = H.f('crypto');
    const list = b.scr.filter(function (r) { return !f.hi || r.score >= 50; });
    const rows = list.slice(0, 120).map(function (r) {
      const al = r.alert && s.alerts.find(function (a) { return a.id === r.alert; });
      return [r.id, U.fmtDate(r.d), H.cref(G.client(r.client)), r.dir === 'in' ? 'in' : 'out', r.ccy + ' ' + U.fmt(Math.abs(r.q), qd(r.q)), chf(r.chf), e(r.det), scoreSt(r.score),
        al ? '<a href="#/compliance/alerts">' + al.id + '</a> ' + (al.status === 'open' ? H.st('warn', 'open') : al.status === 'reported' ? H.st('ok', 'reported') : H.st('off', 'closed')) : r.missed ? '<span class="small neg">below threshold</span>' : ''];
    });
    const n = b.scr.length, hi = b.scr.filter(function (r) { return r.score >= 50; }).length, al = b.scr.filter(function (r) { return r.alert; }).length;
    const cats = Object.keys(cb.CATS).map(function (k) { const x = cb.CATS[k]; return [e(x.label), x.s[0] + '–' + x.s[1], x.rule || '']; });
    const rules = cb.CA_RULES.map(function (r) { return ['<b>' + r + '</b>', e(D.RULES[r])]; });
    return view('/screening', 'Chain analysis', 'Chain analysis', '[DAS-0600]', 'Every coin transfer in or out is traced on the blockchain and scored 0–100. Alert threshold: ' + b.thr + '. Alerts are cleared under Compliance › Alerts.',
      H.kv([['Transfers screened', n + ' (shown: last ' + Math.min(220, n) + ')'], ['Score 50 or more', hi], ['Alerts raised', al], ['Open chain-analysis alerts', cb.openCA().length ? '<a href="#/compliance/alerts">' + cb.openCA().length + '</a>' : '0']]) +
      H.filter('<label><input type="checkbox" data-filterchk="crypto.hi"' + (f.hi === true ? ' checked' : '') + '> only score 50 or more</label>') +
      H.grid(['Ref.', 'Date', 'Client', 'Dir.', 'Amount', { t: 'CHF', num: true }, 'Counterparty (traced)', 'Score', 'Alert'], rows, { empty: 'No transfers screened yet.' }) +
      '<div class="cols"><div class="col-h">' + H.panel('Categories', H.grid(['Category', 'Score', 'Rule'], cats), { icon: 'list', flush: true }) + '</div><div class="col-h">' +
      H.panel('Rules', H.grid(['Rule', 'Description'], rules), { icon: 'shield', flush: true }) +
      H.note('Closing a CA-01, CA-02 or CA-03 alert without a report to MROS is a thin justification in any audit. Coins from sanctioned addresses must be frozen and reported to SECO.') + '</div></div>');
  };

  /* ---------- Navigation (für app.js) ---------- */
  V.cryptoNav = function () {
    if (!ready()) return [['crypto', 'Overview', 'chart']];
    return [['crypto', 'Overview', 'chart'], ['crypto/custody', 'Custody', 'lock'], ['crypto/staking', 'Staking', 'star'], ['crypto/loans', 'Crypto loans', 'scale', false, CB().calls()],
      ['crypto/cps', 'Counterparties', 'net'], ['crypto/screening', 'Chain analysis', 'shield', false, CB().openCA().length]];
  };
  V.cryptoBadge = function () { return ready() ? CB().calls() + CB().openCA().length : 0; };

  /* ---------- Eigene Ereignisbehandlung ---------- */
  if (typeof document === 'undefined') return;
  function Dlg() { return PBS.Dlg; }
  function rerender() { window.dispatchEvent(new HashChangeEvent('hashchange')); }
  function result(r, title, okText) {
    if (!r || !r.ok) { Dlg().msg('PBS/Web – Error', e(r ? r.msg : 'Unknown error'), /locks the building/.test(r && r.msg) ? 'bigwarn' : 'err'); return false; }
    if (G.state) G.save();
    rerender();
    const txt = r.text || okText;
    if (txt) setTimeout(function () { Dlg().msg(title, e(txt), r.rec && r.rec.alert ? 'bigwarn' : 'info'); }, 50);
    return true;
  }
  function val(f, n) { const el = f.elements[n]; if (!el) return ''; if (el.length && el[0] && el[0].type === 'radio') { const c = f.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ''; } return el.value; }
  function num(x) { return U.parseAmount ? U.parseAmount(x) : parseFloat(String(x).replace(/[^0-9.\-]/g, '')); }
  const FORMS = {
    settings: function (f) { result(CB().settings({ fee: num(val(f, 'fee')), comm: num(val(f, 'comm')), thr: +val(f, 'thr') }), 'Digital assets', 'Settings saved.'); },
    deposit: function (f) { result(CB().deposit(val(f, 'client'), val(f, 'coin'), num(val(f, 'q')), val(f, 'origin')), 'Incoming coins'); },
    withdraw: function (f) { result(CB().withdraw(val(f, 'acc'), num(val(f, 'q')), val(f, 'dest')), 'Outgoing coins'); },
    loan: function (f) { result(CB().grantLoan(val(f, 'acc'), num(val(f, 'amount')), val(f, 'ccy')), 'Crypto Lombard loan'); },
    place: function (f) {
      const cp = CB().cp(val(f, 'cp')), src = val(f, 'src'), coin = val(f, 'coin'), q = num(val(f, 'q'));
      const go = function () { result(CB().place(val(f, 'cp'), coin, q, src), 'Placement'); };
      if (src === 'client') Dlg().confirm('Client coins', 'Lend <b>' + e(coin) + ' ' + U.fmt(q, 4) + '</b> of client coins to <b>' + e(cp ? cp.name : '') + '</b>?<br><br>The clients have not agreed to this. Their balances stay unchanged on our books.', go, 'bigwarn', 'Place', 'Cancel');
      else go();
    }
  };
  const ACTS = {
    launch: function (el) { result(CB().launchStaking(el.dataset.id), 'Staking'); },
    stake: function (el) { result(CB().stake(el.dataset.id), 'Staking', 'Coins staked.'); },
    unstake: function (el) { result(CB().unstake(el.dataset.id), 'Staking'); },
    repay: function (el) { result(CB().repayLoan(el.dataset.id), 'Crypto Lombard loan', 'Loan repaid, pledge released.'); },
    liq: function (el) { Dlg().confirm('Sell collateral', 'Sell the pledged coins of loan <b>' + e(el.dataset.id) + '</b> at today\'s price?', function () { result(CB().liquidateNow(el.dataset.id), 'Crypto Lombard loan'); }, 'ques', 'Sell', 'Cancel'); },
    recall: function (el) { result(CB().recall(el.dataset.id), 'Placement'); }
  };
  document.addEventListener('submit', function (ev) {
    const f = ev.target;
    if (!f || !f.dataset || !f.dataset.cbForm) return;
    ev.preventDefault();
    if (G.state && FORMS[f.dataset.cbForm]) FORMS[f.dataset.cbForm](f);
  });
  document.addEventListener('click', function (ev) {
    const el = ev.target.closest ? ev.target.closest('[data-cb-act]') : null;
    if (!el || el.disabled) return;
    ev.preventDefault();
    if (G.state && ACTS[el.dataset.cbAct]) ACTS[el.dataset.cbAct](el);
  });
})(window.PBS);
