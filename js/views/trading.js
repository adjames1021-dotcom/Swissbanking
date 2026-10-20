/* PBS/Web 4.2 – Börse: Kursliste, Titelansicht mit Auftragsmaske, Aufträge, Depots */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, H = PBS.H, V = PBS.Views;
  const e = U.esc, tr = PBS.L.t;
  function T() { return G.trade; }
  const dp = function (x) { if (x.src === 'coin') { const p = T().px(x.id); return p && p < 1 ? (p < 0.01 ? 6 : 4) : 2; } return x.ccy === 'JPY' ? 0 : (x.src === 'stock' && x.base < 20) ? 3 : 2; };
  const qd = function (x) { return x && x.src === 'coin' ? 4 : 0; };
  function flag(x) { return H.cty(D.STOCK_MKT[x.mkt][1]); }
  function link(x) { return '<a href="#/trade/stock/' + x.id + '">' + e(x.name) + '</a>'; }
  function stateLabel(x) {
    const st = T().status(x);
    if (st === 'ipo') return '<span class="muted">' + 'IPO ' + U.fmtDate(x.listed) + '</span>';
    if (st === 'bust') return '<span class="neg">' + 'Bankrupt' + '</span>';
    if (st === 'delisted') return '<span class="muted">' + 'Delisted' + '</span>';
    return '';
  }
  function tabs(cur) {
    return H.tabs('trade', [['', 'Market'], ['/orders', 'Orders' + (openOrders() ? ' (' + openOrders() + ')' : '')], ['/portfolio', 'Portfolios'], ['/news', 'Market news']], cur);
  }
  function openOrders() { return T().state().orders.filter(function (o) { return o.status === 'open'; }).length; }
  V.tradeOpenOrders = openOrders;

  /* ---------- Kursliste ---------- */
  V.trade = function () {
    const s = H.S(), Tr = T(), f = H.f('trade');
    Tr.state();
    const list = Tr.list().filter(function (x) {
      if (f.mkt && x.mkt !== f.mkt) return false;
      if (f.sec && x.sector !== f.sec) return false;
      if (f.own === true && !Tr.book('priv').pos[x.id] && !Tr.book('bank').pos[x.id]) return false;
      return f.all === true || Tr.status(x) === 'open';
    });
    const rows = list.map(function (x) {
      const st = Tr.status(x), px = Tr.px(x.id), h = Tr.hist(x.id, 22);
      const held = (Tr.book('priv').pos[x.id] ? 'P' : '') + (Tr.book('bank').pos[x.id] ? 'B' : '');
      return {
        cls: st === 'open' ? '' : 'closed',
        cells: [flag(x), link(x) + (held ? ' <span class="tag" title="' + 'In a portfolio' + '">' + held + '</span>' : ''), e(D.SECTORS[x.sector] || ''), x.ccy,
          st === 'open' || px ? U.fmt(px, dp(x)) : '–', st === 'open' ? H.chg(Tr.change(x.id, 1) * 100, 2, '%') : stateLabel(x), st === 'open' ? H.chg(Tr.change(x.id, 21) * 100, 1, '%') : '',
          x.pe ? U.fmt(x.pe * (0.85 + 0.3 * ((px / (h[0] ? h[0].p : px)) - 1 + 0.5)), 1) : '–', x.div ? U.fmt(x.div, 1) + '%' : '–',
          h.length > 2 ? H.spark(h.map(function (p) { return p.p; }), 80, 18) : '', st === 'open' ? '<a href="#/trade/stock/' + x.id + '" class="btn sm">' + 'Trade' + '</a>' : '']
      };
    });
    const movers = Tr.list().filter(function (x) { return Tr.status(x) === 'open'; }).map(function (x) { return { x: x, c: Tr.change(x.id, 1) }; }).sort(function (a, b) { return b.c - a.c; });
    const mv = function (arr) { return '<table class="plist">' + arr.map(function (m) { return '<tr><td>' + link(m.x) + '</td><td class="num">' + H.chg(m.c * 100, 2, '%') + '</td></tr>'; }).join('') + '</table>'; };
    const smi = s.mhist.slice(-60).map(function (m) { return [m.d, m.SMI]; });
    const filt = H.filter('Exchange' + ' ' + H.sel('data-filter="trade.mkt"', [['', 'all']].concat(Object.keys(D.STOCK_MKT).map(function (k) { return [k, D.STOCK_MKT[k][0]]; })), f.mkt || '') + ' ' +
      'Sector' + ' ' + H.sel('data-filter="trade.sec"', [['', 'all']].concat(Object.keys(D.SECTORS).map(function (k) { return [k, D.SECTORS[k]]; })), f.sec || '') + ' ' +
      '<label><input type="checkbox" data-filterchk="trade.own"' + (f.own === true ? ' checked' : '') + '> ' + 'only shares I hold' + '</label> ' +
      '<label><input type="checkbox" data-filterchk="trade.all"' + (f.all === true ? ' checked' : '') + '> ' + 'show unlisted' + '</label>');
    const news = Tr.state().news.slice(0, 6);
    return {
      mod: 'trade', crumbs: [['Trading'], ['Market']], title: 'Trading – market',
      html: H.title(tr('Stock market (Börse)', 'Stock market'), '[BOE-0100]', 'Closing prices of ' + U.fmtDate(s.mhist[s.mhist.length - 1].d) + ' · ' + 'Trade for your private account or for the bank\'s trading book') + tabs('') +
        '<div class="cols"><div class="col-w">' + H.panel('SMI – ' + 'last 60 trading days', H.lineChart(smi, 'pts', 0), { icon: 'chart', flush: true }) + '</div><div class="col-h">' +
        H.panel('Top gainers today', mv(movers.slice(0, 4)), { icon: 'chart', flush: true }) +
        H.panel('Top losers today', mv(movers.slice(-4).reverse()), { icon: 'chart', flush: true }) + '</div></div>' +
        filt + H.grid(['', 'Share', 'Sector', 'Ccy', { t: 'Last', num: true }, { t: 'Day', num: true }, { t: '1M', num: true }, { t: 'P/E', num: true }, { t: 'Yield', num: true }, '1 month', ''], rows, { cls: 'trade-list' }) +
        H.panel('Market news', news.length ? '<table class="plist">' + news.map(function (n) { const x = n.id && Tr.get(n.id); return '<tr><td class="muted">' + U.fmtDate(n.d) + '</td><td>' + (x ? '<a href="#/trade/stock/' + x.id + '">' + e(n.text) + '</a>' : e(n.text)) + '</td></tr>'; }).join('') + '</table>' : '<p class="muted pad">' + 'No news yet.' + '</p>', { icon: 'doc', flush: true, tools: '<a href="#/trade/news">' + 'All' + ' ›</a>' })
    };
  };

  /* ---------- Titel ---------- */
  V.tradeStock = function (id) {
    const s = H.S(), Tr = T(), x = Tr.get(id);
    if (!x) return V.notFound('Security ' + id);
    Tr.state();
    const st = Tr.status(x), px = Tr.px(x.id), h = Tr.hist(x.id);
    const pp = Tr.book('priv').pos[x.id], bp = Tr.book('bank').pos[x.id];
    const hi = h.length ? Math.max.apply(null, h.map(function (p) { return p.p; })) : px, lo = h.length ? Math.min.apply(null, h.map(function (p) { return p.p; })) : px;
    const pos = function (p, label) {
      if (!p) return '';
      const val = p.q * Tr.pxCHF(x.id);
      return '<tr><td>' + label + '</td><td class="num">' + U.fmt(p.q, qd(x)) + '</td><td class="num">' + U.fmt(p.cost, 0) + '</td><td class="num">' + U.fmt(val, 0) + '</td><td class="num">' + H.chg(val - p.cost, 0) + '</td></tr>';
    };
    const open = Tr.open(x);
    const ticket = st !== 'open' ? H.note(stateLabel(x) + (st === 'ipo' ? '' : ' Trading has stopped.')) :
      '<form data-form="order" data-id="' + x.id + '" class="ticket"><table class="frm">' +
      '<tr><th>' + 'Account' + '</th><td><label class="opt inl"><input type="radio" name="acct" value="priv" checked> ' + 'Private account (your numbered account)' + '</label><br><label class="opt inl"><input type="radio" name="acct" value="bank"> ' + tr('Bank trading book (Handelsbuch)', 'Bank trading book') + '</label></td></tr>' +
      '<tr><th>' + 'Side' + '</th><td><label class="opt inl"><input type="radio" name="side" value="buy" checked> ' + 'Buy' + '</label> <label class="opt inl"><input type="radio" name="side" value="sell"> ' + 'Sell' + '</label></td></tr>' +
      '<tr><th>' + 'Quantity' + '</th><td><input class="inp num" name="q" size="8" value="' + (x.src === 'coin' ? '1' : '100') + '"> <span class="small muted ticket-est"></span></td></tr>' +
      '<tr><th>' + 'Order type' + '</th><td>' + H.sel('name="type"', [['mkt', 'Market'], ['lmt', 'Limit'], ['stop', 'Stop-loss']], 'mkt') + ' ' + 'Limit' + ' <input class="inp num" name="lim" size="8" placeholder="' + U.fmt(px, dp(x)) + '"></td></tr>' +
      '<tr><th>' + 'Valid' + '</th><td>' + H.sel('name="valid"', [['day', 'Today only'], ['gtc', 'Until cancelled']], 'day') + '</td></tr></table>' +
      '<div class="btnbar left"><button class="btn def" type="submit">' + 'Place order' + '</button> ' + H.dur(3) + '</div>' +
      '<p class="small muted">' + (open ? 'Exchange open: market orders are filled straight away.' : 'Exchange closed: market orders are filled at the next closing price.') + ' ' +
      tr('Private: brokerage (Courtage) 0.5% (min. CHF 40) plus federal stamp duty (Umsatzabgabe) ', 'Private: brokerage 0.5% (min. CHF 40) plus Swiss stamp duty ') + (x.mkt === 'CH' ? '0.075%' : '0.15%') + '. ' + 'Trading book: 0.02%, limit 20% of equity capital.' + '</p></form>';
    const news = Tr.state().news.filter(function (n) { return n.id === x.id; }).slice(0, 8);
    const key = [['Exchange', e(D.STOCK_MKT[x.mkt][0])], ['Sector', e(D.SECTORS[x.sector] || '')], ['Currency', x.ccy + (x.ccy !== 'CHF' ? ' (' + 'rate' + ' ' + U.fmt(Tr.fx(x.ccy), 4) + ')' : '')],
      ['6-month range', U.fmt(lo, dp(x)) + ' – ' + U.fmt(hi, dp(x))], ['P/E', x.pe ? U.fmt(x.pe, 1) : 'no profit'], ['Dividend yield', x.div ? U.fmt(x.div, 1) + '% (' + U.monthName(s.date.slice(0, 5) + U.pad(x.divM, 2) + '-01') + ')' : '–'], ['Beta', U.fmt(x.beta || 1, 2)]];
    return {
      mod: 'trade', crumbs: [['Trading', '#/trade'], [x.name]], title: x.name,
      html: H.title(e(x.name), '[BOE-0200]', flag(x) + ' ' + x.id + ' · ' + e(D.SECTORS[x.sector] || '')) + tabs('-') +
        '<div class="quote nolc"><span class="qpx">' + x.ccy + ' ' + (px ? U.fmt(px, dp(x)) : '–') + '</span> ' + (st === 'open' ? H.chg(Tr.change(x.id, 1) * 100, 2, '%') + ' <span class="muted">' + 'today' + '</span> · ' + H.chg(Tr.change(x.id, 21) * 100, 1, '%') + ' <span class="muted">1M</span>' : stateLabel(x)) + '</div>' +
        '<div class="cols"><div class="col-w">' + H.panel('Price chart' + ' (' + x.ccy + ')', H.lineChart(h.map(function (p) { return [p.d, p.p]; }), x.ccy, dp(x)), { icon: 'chart', flush: true }) +
        H.panel('Company profile', '<p class="pad">' + e(x.desc || '') + '</p>' + H.kv(key), { icon: 'building', flush: true }) +
        H.panel('News', news.length ? '<table class="plist">' + news.map(function (n) { return '<tr><td class="muted">' + U.fmtDate(n.d) + '</td><td>' + e(n.text) + '</td></tr>'; }).join('') + '</table>' : '<p class="muted pad">' + 'No news.' + '</p>', { icon: 'doc', flush: true }) +
        '</div><div class="col-h">' + H.panel(tr('Order ticket (Börsenauftrag)', 'Order ticket'), ticket, { icon: 'pen' }) +
        H.panel('Your positions', (pp || bp) ? '<table class="grid"><thead><tr><th></th><th class="num">' + 'Qty' + '</th><th class="num">' + 'Cost CHF' + '</th><th class="num">' + 'Value CHF' + '</th><th class="num">' + 'P&amp;L CHF' + '</th></tr></thead><tbody>' + pos(pp, 'Private') + pos(bp, tr('Trading book (Handelsbuch)', 'Trading book')) + '</tbody></table>' : '<p class="muted pad">' + 'You hold none of these.' + '</p>', { icon: 'folder', flush: true }) +
        '</div></div>'
    };
  };

  /* ---------- Aufträge ---------- */
  V.tradeOrders = function () {
    const Tr = T(), st = Tr.state();
    const lbl = { mkt: 'Market', lmt: 'Limit', stop: 'Stop' };
    const stl = { open: H.st('mod', 'open'), done: H.st('ok', 'filled'), cancelled: H.st('off', 'cancelled'), expired: H.st('off', 'expired'), rejected: H.st('bad', 'rejected') };
    const rows = st.orders.slice(0, 80).map(function (o) {
      const x = Tr.get(o.id);
      return [o.no, U.fmtDate(o.d) + ' ' + U.fmtTime(o.t), o.acct === 'bank' ? tr('Trading book (Handelsbuch)', 'Trading book') : 'Private', o.side === 'buy' ? 'Buy' : 'Sell', U.fmt(o.q, qd(x)), x ? link(x) : o.id,
        lbl[o.type] + (o.lim ? ' ' + U.fmt(o.lim, x ? dp(x) : 2) : '') + (o.valid === 'gtc' ? ' GTC' : ''), (stl[o.status] || o.status) + (o.why ? '<br><span class="small muted">' + e(o.why) + '</span>' : ''),
        o.fill ? U.fmt(o.fill.px, x ? dp(x) : 2) : '', o.fill ? U.fmt(o.fill.chf, 0) : '', o.status === 'open' ? H.btn('Cancel', 'ordcancel', ' data-id="' + o.no + '"', 'sm') : ''];
    });
    return {
      mod: 'trade', crumbs: [['Trading', '#/trade'], ['Orders']], title: 'Orders',
      html: H.title('Stock orders', '[BOE-0300]', 'Limit and stop-loss orders are checked against the closing price after the market closes.') + tabs('/orders') +
        H.grid(['No.', 'Entered', 'Account', '', { t: 'Qty', num: true }, 'Share', 'Type', 'Status', { t: 'Price', num: true }, { t: 'Amount CHF', num: true }, ''], rows, { empty: 'No orders yet.' })
    };
  };

  /* ---------- Depots ---------- */
  V.tradePortfolio = function () {
    const s = H.S(), Tr = T(), st = Tr.state();
    const table = function (acct) {
      const b = Tr.book(acct);
      let tv = 0, tc = 0;
      const rows = Object.keys(b.pos).map(function (id) {
        const x = Tr.get(id), p = b.pos[id], val = p.q * Tr.pxCHF(id);
        tv += val; tc += p.cost;
        return [flag(x), link(x), U.fmt(p.q, qd(x)), U.fmt(Tr.px(id), dp(x)) + ' ' + x.ccy, U.fmt(p.cost, 0), U.fmt(val, 0), H.chg(val - p.cost, 0), H.chg(p.cost ? (val / p.cost - 1) * 100 : 0, 1, '%')];
      });
      return { html: H.grid(['', 'Share', { t: 'Qty', num: true }, { t: 'Price', num: true }, { t: 'Cost CHF', num: true }, { t: 'Value CHF', num: true }, { t: 'P&amp;L CHF', num: true }, { t: '%', num: true }], rows,
        { empty: 'No positions.', foot: rows.length ? ['', '<b>Total</b>', '', '', U.fmt(tc, 0), '<b>' + U.fmt(tv, 0) + '</b>', H.chg(tv - tc, 0), ''] : null }), value: tv, cost: tc };
    };
    const pv = table('priv'), bv = table('bank');
    const pb = Tr.book('priv'), bb = Tr.book('bank');
    const jr = st.journal.slice(0, 25).map(function (j) {
      const x = Tr.get(j.id);
      const what = j.k === 'fill' ? (j.side === 'buy' ? 'Buy' : 'Sale') : j.k === 'div' ? 'Dividend' : 'Write-off (bankruptcy)';
      return [U.fmtDate(j.d), j.acct === 'bank' ? tr('Trading book (Handelsbuch)', 'Trading book') : 'Private', what, U.fmt(j.q, qd(x)) + ' ' + (x ? e(x.name) : j.id), U.fmt(j.chf, 0), j.wht ? U.fmt(j.wht, 0) : j.fee ? U.fmt(j.fee, 0) : ''];
    });
    return {
      mod: 'trade', crumbs: [['Trading', '#/trade'], ['Portfolios']], title: 'Portfolios',
      html: H.title('Portfolios', '[BOE-0400]') + tabs('/portfolio') +
        H.panel('Private account – ' + e(s.meta.name), H.kv([['Cash in your numbered account CHF', '<b>' + U.fmt(Tr.cash(), 0) + '</b>'], ['Value of shares CHF', U.fmt(pv.value, 0)], ['Total fortune CHF', '<b>' + U.fmt(Tr.cash() + pv.value, 0) + '</b>'],
          ['Realised profit CHF', H.chg(pb.real, 0)], ['Net dividends CHF', U.fmt(pb.div, 0)], ['Fees and stamp duty CHF', U.fmt(pb.fees, 0)]]) + pv.html +
          '<p class="small muted pad">' + 'Your fortune is your score. When the game ends the shares are sold at the day\'s price. Swiss dividends lose 35% withholding tax, which you could only reclaim by declaring them.' + '</p>', { icon: 'user', flush: true }) +
        H.panel(tr('Bank trading book (Handelsbuch)', 'Bank trading book'), H.kv([['Value CHF', U.fmt(bv.value, 0) + ' / ' + 'limit ' + U.fmt(Tr.bankLimit(), 0)], ['Realised profit CHF', H.chg(bb.real, 0)], ['Dividends CHF', U.fmt(bb.div, 0)]]) + bv.html +
          '<p class="small muted pad">' + 'Gains and losses go into the bank\'s trading income every day, and from there into equity capital.' + '</p>', { icon: 'building', flush: true }) +
        H.panel('Transactions', H.grid(['Date', 'Account', 'Type', 'Share', { t: 'Amount CHF', num: true }, { t: 'Fee/tax CHF', num: true }], jr, { empty: 'No transactions.' }), { icon: 'list', flush: true })
    };
  };

  V.tradeNews = function () {
    const Tr = T(), st = Tr.state();
    return {
      mod: 'trade', crumbs: [['Trading', '#/trade'], ['News']], title: 'Market news',
      html: H.title('Market news', '[BOE-0500]', 'Telekurs / ' + 'wire services') + tabs('/news') +
        H.grid(['Date', 'Share', 'Headline'], st.news.map(function (n) { const x = n.id && Tr.get(n.id); return [U.fmtDate(n.d), x ? link(x) : '', e(n.text)]; }), { empty: 'No news yet.' })
    };
  };
})(window.PBS);
