/* Das Internet des Arbeitsplatzes (fiktiv): Suchmaschine, Zeitungen, Börsenkurse, Webmail, Banken,
   ein Offshore-Anbieter und der Schneebericht. Inhalte folgen dem Spieldatum und den Ereignissen.
   Echte Adressen sind nicht erreichbar (Fehlerseite des Browsers). */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U;
  const e = U.esc;
  const tr = PBS.L.t;
  const W = PBS.Web = {};
  function S() { return G.state; }
  function today() { return S() ? S().date : '2003-03-03'; }
  function year() { return +today().slice(0, 4); }
  function seed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function rnd(str) { return (seed(str) % 10000) / 10000; }
  function href(host, path, q) { return '#/w/' + host + '/' + (path || '') + (q ? '?' + q : ''); }
  function a(host, path, text, q) { return '<a href="' + href(host, path, q) + '">' + text + '</a>'; }

  /* ---------- Nachrichten ---------- */
  // Chronologisch: Zeitstrahl bis heute und die Meldungen des Spielstands; die Kennung bleibt stabil
  W.news = function () {
    const s = S(), seen = {};
    let list = D.TIMELINE.filter(function (t) { return t.d <= today() && t.news; }).map(function (t) { return { d: t.d, text: t.news }; }).concat(s ? s.news : []);
    if (!list.length) list = [{ d: today(), text: D.HEADLINES.any[0] }];
    return list.map(function (n) { const t = String(n.text).replace(/^Zürcher Finanzblatt:\s*"?|"$/g, ''); return { id: seed(n.d + t).toString(36), d: n.d, text: t }; })
      .filter(function (n) { if (seen[n.text]) return false; seen[n.text] = 1; return true; })
      .sort(function (x, y) { return x.d < y.d ? -1 : x.d > y.d ? 1 : 0; });
  };
  function lead(n) {
    const t = n.text.toLowerCase();
    const P = [];
    if (/tax|steuer|evasion|fraud|irs|doj|amnesty/.test(t)) P.push('Tax authorities abroad have stepped up their efforts to trace assets held in Switzerland. Bankers in Zurich and Geneva point to the legal distinction between tax evasion and tax fraud, which has long shaped the country\'s approach to requests for assistance.');
    if (/bank|private|client|secrecy|confidential/.test(t)) P.push('Industry representatives say client confidentiality remains a cornerstone of the Swiss financial centre. Critics reply that the business depends on money that has not been declared at home.');
    if (/smi|market|stock|equit|franc|dollar|euro|gold|rate|bond/.test(t)) P.push('Traders said volumes were moderate. Analysts expect volatility to stay high in the coming weeks, with the franc again in demand as a safe haven.');
    if (/eu|brussels|treaty|agreement|oecd/.test(t)) P.push('Diplomats in Berne describe the talks as difficult. The Federal Council has said repeatedly that banking secrecy is "not negotiable". Observers expect that position to be tested.');
    if (!P.length) P.push('The news was received calmly on Bahnhofstrasse. "We are following developments closely," a spokesman for a Zurich private bank said, declining further comment.');
    P.push('Further details were not available at the time of going to press.');
    return P;
  }

  /* ---------- Gemeinsamer Seitenrahmen ---------- */
  const SITES = {};
  function reg(host, def) { SITES[host] = def; }
  function canon(host) {
    host = String(host || '').toLowerCase();
    if (SITES[host]) return host;
    if (SITES['www.' + host]) return 'www.' + host;
    if (host.indexOf('www.') === 0 && SITES[host.slice(4)]) return host.slice(4);
    return null;
  }
  W.has = function (host) { return !!canon(host); };
  W.hosts = function () { return Object.keys(SITES); };
  function notFound(host, path) {
    return { title: '404 Not Found', html: '<div class="w-404"><h1>Not Found</h1><p>The requested URL /' + e(path) + ' was not found on this server.</p><hr><address>Apache/1.3.27 Server at ' + e(host) + ' Port 80</address></div>' };
  }
  W.page = function (rest, q) {
    const i = rest.indexOf('/');
    const raw = i < 0 ? rest : rest.slice(0, i), path = i < 0 ? '' : rest.slice(i + 1);
    const host = canon(raw);
    if (!host) return { title: 'The page cannot be displayed', html: PBS.Views.notFound('http://' + raw + '/').html };
    const p = SITES[host].page(path.replace(/\/$/, ''), q || {}, host);
    return p || notFound(raw, path);
  };

  /* ================= Suchmaschine ================= */
  function index() {
    const out = [];
    Object.keys(SITES).forEach(function (h) { (SITES[h].index || []).forEach(function (x) { if (!x.from || x.from <= today()) out.push({ u: href(h, x.p), url: 'http://' + h + '/' + x.p, t: x.t, x: x.x }); }); });
    W.news().slice(-80).forEach(function (n) { out.push({ u: href('www.finanzblatt.ch', 'artikel', 'id=' + n.id), url: 'http://www.finanzblatt.ch/artikel?id=' + n.id, t: n.text, x: U.fmtDate(n.d) + ' – Zürcher Finanzblatt. ' + lead(n)[0] }); });
    return out;
  }
  // Webkatalog; die Banken werden erst weiter unten registriert
  const CATS = { banken: [tr('Banken & Finanzen', 'Banking & Finance'), function () { return ['www.vogt-cie.ch'].concat(Object.keys(W._rivals)).concat(['www.kurse-online.ch', 'www.offshore-direct.com']); }], news: [tr('Nachrichten', 'News'), function () { return ['www.finanzblatt.ch', 'www.abendexpress.ch']; }], freizeit: [tr('Freizeit & Sport', 'Leisure & Sport'), function () { return ['www.schneebericht.ch']; }], komm: [tr('Kommunikation', 'Communication'), function () { return ['www.swissmail.ch']; }] };
  reg('www.alpensuche.ch', {
    index: [{ p: '', t: tr('alpensuche.ch – die Suchmaschine der Schweiz', 'alpensuche.ch – the Swiss search engine'), x: tr('Suche im Schweizer Web. Webkatalog, Nachrichten, Wetter.', 'Search the Swiss web. Web directory, news, weather.') }],
    page: function (path, q) {
      const head = '<div class="as-logo">alpen<b>suche</b><span>.ch</span></div>';
      const form = function (v) { return '<form data-web="www.alpensuche.ch/suche" class="as-form"><input name="q" class="inp" size="44" value="' + e(v || '') + '"> <button class="btn" type="submit">' + tr('Suchen', 'Search') + '</button></form>'; };
      if (path === '' || path === 'index.html') {
        return { title: tr('alpensuche.ch – die Suchmaschine der Schweiz', 'alpensuche.ch – the Swiss search engine'), html: '<div class="w w-as"><div class="as-home">' + head + form('') +
          '<div class="as-cats"><b>' + tr('Webkatalog', 'Web directory') + '</b><ul>' + Object.keys(CATS).map(function (k) { return '<li>' + a('www.alpensuche.ch', 'katalog', CATS[k][0], 'k=' + k) + '</li>'; }).join('') + '</ul></div>' +
          '<p class="as-foot">© 1998–' + year() + tr(' alpensuche.ch · Über 1.2 Millionen Schweizer Seiten im Index · ', ' alpensuche.ch · Over 1.2 million Swiss pages indexed · ') + a('www.alpensuche.ch', 'info', tr('Über uns', 'About us')) + '</p></div></div>' };
      }
      if (path === 'katalog') {
        const c = CATS[q.k];
        if (!c) return null;
        return { title: tr('Webkatalog: ', 'Web directory: ') + c[0] + ' – alpensuche.ch', html: '<div class="w w-as"><div class="as-top">' + head + form('') + '</div><h2>' + tr('Webkatalog', 'Web directory') + ' › ' + e(c[0]) + '</h2><ul class="as-res">' +
          c[1]().filter(canon).map(function (h) { const s = SITES[canon(h)]; const x = (s.index && s.index[0]) || { t: h, x: '' }; return '<li>' + a(h, '', e(x.t)) + '<br><span>' + e(x.x) + '</span><br><em>http://' + h + '/</em></li>'; }).join('') + '</ul></div>' };
      }
      if (path === 'info') return { title: tr('Über alpensuche.ch', 'About alpensuche.ch'), html: '<div class="w w-as"><div class="as-top">' + head + '</div><p>' + tr('alpensuche.ch durchsucht seit 1998 das Schweizer Web. Unser Roboter besucht jede Woche über eine Million Seiten.', 'alpensuche.ch has been searching the Swiss web since 1998. Our robot visits over a million pages every week.') + '</p><p>' + tr('Werbung auf alpensuche.ch: ', 'Advertising on alpensuche.ch: ') + 'inserate@alpensuche.ch</p></div>' };
      if (path === 'suche') {
        const query = String(q.q || '').trim();
        const words = query.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
        const res = words.length ? index().map(function (r) {
          const hay = (r.t + ' ' + r.x + ' ' + r.url).toLowerCase();
          const sc = words.reduce(function (t, w) { return t + (hay.indexOf(w) >= 0 ? (r.t.toLowerCase().indexOf(w) >= 0 ? 3 : 1) : 0); }, 0);
          return { r: r, sc: sc };
        }).filter(function (x) { return x.sc > 0; }).sort(function (x, y) { return y.sc - x.sc; }).slice(0, 15) : [];
        const ad = /offshore|bvi|panama|firma|company|trust|steuer|tax|stiftung|bahamas/i.test(query) && today() < '2016-04-03' ? '<div class="as-ad"><span>' + tr('Anzeige', 'Advertisement') + '</span> ' + a('www.offshore-direct.com', '', tr('Ihre eigene Firma in der Karibik ab USD 990', 'Your own company in the Caribbean from USD 990')) + '<br>' + tr('Gründung in 24 Stunden. Nominee Directors. Diskret.', 'Set up in 24 hours. Nominee directors. Discreet.') + ' www.offshore-direct.com</div>' : '';
        return { title: 'alpensuche.ch: ' + query, html: '<div class="w w-as"><div class="as-top">' + head + form(query) + '</div>' + ad +
          (res.length ? '<p class="as-n">' + tr('Ergebnisse 1–', 'Results 1–') + res.length + tr(' für ', ' for ') + '<b>' + e(query) + '</b></p><ul class="as-res">' + res.map(function (x) { return '<li><a href="' + x.r.u + '">' + e(x.r.t) + '</a><br><span>' + e(x.r.x.slice(0, 180)) + (x.r.x.length > 180 ? ' …' : '') + '</span><br><em>' + e(x.r.url) + '</em></li>'; }).join('') + '</ul>'
            : '<p class="as-n">' + tr('Ihre Suche nach ', 'Your search for ') + '<b>' + e(query) + '</b>' + tr(' ergab keine Treffer.', ' did not match any documents.') + '</p><ul class="as-tips"><li>' + tr('Überprüfen Sie die Schreibweise.', 'Check your spelling.') + '</li><li>' + tr('Versuchen Sie allgemeinere Suchbegriffe.', 'Try more general keywords.') + '</li><li>' + tr('Stöbern Sie im ', 'Browse the ') + a('www.alpensuche.ch', '', tr('Webkatalog', 'web directory')) + '.</li></ul>') + '</div>' };
      }
      return null;
    }
  });

  /* ================= Zürcher Finanzblatt ================= */
  function quotes() {
    const s = S();
    if (!s) return '<p class="muted">' + tr('Kurse nach Börsenschluss.', 'Prices after market close.') + '</p>';
    return '<table class="fb-q">' + ['SMI', 'USD', 'EUR', 'XAU'].map(function (k) { const p = (s.market[k] / s.prevMarket[k] - 1) * 100; return '<tr><td>' + D.MARKET_LABEL[k][0] + '</td><td class="num">' + U.fmt(s.market[k], k === 'SMI' || k === 'XAU' ? 2 : 4) + '</td><td class="num ' + (p >= 0 ? 'pos' : 'neg') + '">' + (p >= 0 ? '+' : '') + U.fmt(p, 2) + '%</td></tr>'; }).join('') + '</table>';
  }
  function bankStory() {
    const s = S();
    if (!s) return null;
    const press = s.heatLog.filter(function (h) { return /press|journalist|leak|whistle|stolen/i.test(h.r); }).slice(0, 1)[0];
    const inv = Object.keys(s.inv)[0];
    if (inv) return G.authName(inv) + ' confirms investigation into Zurich private bank';
    if (press) return 'Questions over discretion at old-established Bahnhofstrasse bank';
    return null;
  }
  reg('www.finanzblatt.ch', {
    index: [{ p: '', t: 'Zürcher Finanzblatt – Online', x: tr('Unabhängige Tageszeitung für Wirtschaft und Finanzen. Nachrichten, Börse, Banken.', 'Independent daily for business and finance. News, markets, banking.') }, { p: 'boerse', t: tr('Börse – Zürcher Finanzblatt', 'Markets – Zürcher Finanzblatt'), x: tr('SMI, Devisen, Gold: Kurse und Marktbericht.', 'SMI, currencies, gold: prices and market report.') }],
    page: function (path, q) {
      const list = W.news().slice().reverse();
      const mast = '<div class="fb-mast"><a href="' + href('www.finanzblatt.ch', '') + '">Zürcher Finanzblatt</a><span>' + U.longDate(today()) + ' · ' + tr('Online-Ausgabe', 'Online edition') + '</span></div><div class="fb-nav">' + a('www.finanzblatt.ch', '', tr('Startseite', 'Home')) + ' | ' + a('www.finanzblatt.ch', 'boerse', tr('Börse', 'Markets')) + ' | ' + a('www.finanzblatt.ch', 'archiv', tr('Archiv', 'Archive')) + '</div>';
      const side = '<div class="fb-side"><h3>' + tr('Börse', 'Markets') + '</h3>' + quotes() + '<h3>' + tr('Meistgelesen', 'Most read') + '</h3><ol>' + list.slice(1, 6).map(function (n) { return '<li>' + a('www.finanzblatt.ch', 'artikel', e(n.text), 'id=' + n.id) + '</li>'; }).join('') + '</ol></div>';
      if (path === '') {
        const top = list[0];
        const own = bankStory();
        return { title: 'Zürcher Finanzblatt – Online', html: '<div class="w w-fb">' + mast + '<div class="fb-cols"><div class="fb-main">' +
          (own ? '<div class="fb-excl"><span>' + tr('EXKLUSIV', 'EXCLUSIVE') + '</span> ' + e(own) + '</div>' : '') +
          '<h1>' + a('www.finanzblatt.ch', 'artikel', e(top.text), 'id=' + top.id) + '</h1><p class="fb-lead">' + U.fmtDate(top.d) + ' – ' + e(lead(top)[0]) + '</p>' +
          '<ul class="fb-list">' + list.slice(1, 14).map(function (n) { return '<li><span>' + U.fmtDate(n.d) + '</span> ' + a('www.finanzblatt.ch', 'artikel', e(n.text), 'id=' + n.id) + '</li>'; }).join('') + '</ul></div>' + side + '</div></div>' };
      }
      if (path === 'artikel') {
        const n = list.find(function (x) { return String(x.id) === String(q.id); });
        if (!n) return null;
        return { title: n.text + ' – Zürcher Finanzblatt', html: '<div class="w w-fb">' + mast + '<div class="fb-cols"><div class="fb-main fb-art"><h1>' + e(n.text) + '</h1><p class="fb-meta">Zürich, ' + U.longDate(n.d) + ' · ' + tr('Redaktion Finanzen', 'Business desk') + '</p>' +
          lead(n).map(function (p) { return '<p>' + e(p) + '</p>'; }).join('') + '<p>' + a('www.finanzblatt.ch', '', tr('‹ Zur Startseite', '‹ Back to home page')) + '</p></div>' + side + '</div></div>' };
      }
      if (path === 'archiv') return { title: tr('Archiv', 'Archive') + ' – Zürcher Finanzblatt', html: '<div class="w w-fb">' + mast + '<h2>' + tr('Archiv', 'Archive') + '</h2><ul class="fb-list">' + list.map(function (n) { return '<li><span>' + U.fmtDate(n.d) + '</span> ' + a('www.finanzblatt.ch', 'artikel', e(n.text), 'id=' + n.id) + '</li>'; }).join('') + '</ul></div>' };
      if (path === 'boerse') {
        const s = S();
        return { title: tr('Börse – Zürcher Finanzblatt', 'Markets – Zürcher Finanzblatt'), html: '<div class="w w-fb">' + mast + '<h2>' + tr('Börse Schweiz', 'Swiss markets') + '</h2>' + quotes() + (s ? '<div class="fb-chart">' + PBS.H.lineChart(s.mhist.slice(-60).map(function (m) { return [m.d, m.SMI]; }), 'pts', 0) + '</div>' : '') + '</div>' };
      }
      return null;
    }
  });

  /* ================= Abend-Express (Boulevard) ================= */
  const AX = [
    ['1998-01-01', tr('Fondue-Rekord in Gruyères: 5 Tonnen Käse!', 'Fondue record in Gruyères: 5 tonnes of cheese!')], ['1999-06-01', tr('Jahr-2000-Panik: Bunkern Schweizer jetzt Konserven?', 'Y2K panic: are the Swiss hoarding tinned food?')], ['2000-01-01', tr('Millennium: Alles lief rund! Computer überleben', 'Millennium: all went well! Computers survive')],
    ['2001-10-02', tr('Grounding! Schweizer Airline bleibt am Boden', 'Grounding! Swiss airline stuck on the ground')], ['2003-07-01', tr('Jahrhundert-Hitze! Badis überfüllt, Gletscher schmelzen', 'Heatwave of the century! Pools packed, glaciers melting')], ['2006-06-01', tr('WM-Fieber: Ganze Schweiz in Rot-Weiss', 'World Cup fever: all Switzerland in red and white')],
    ['2008-06-07', tr('Euro 08: Fanmeile Zürich platzt aus allen Nähten', 'Euro 08: Zurich fan zone bursting at the seams')], ['2008-10-16', tr('Staat rettet Grossbank: Steuerzahler zittern', 'State rescues big bank: taxpayers tremble')], ['2011-08-01', tr('Franken so stark wie nie: Einkaufstourismus boomt', 'Franc stronger than ever: shopping trips abroad boom')],
    ['2015-01-15', tr('Franken-Schock! Nationalbank kippt Mindestkurs', 'Franc shock! National Bank scraps minimum rate')], ['2016-04-04', tr('Panama-Papers: Auch Schweizer Anwälte betroffen!', 'Panama Papers: Swiss lawyers named too!')]
  ];
  reg('www.abendexpress.ch', {
    index: [{ p: '', t: 'Abend-Express – News, Stars, Sport', x: tr('Die Zeitung der Schweiz. Skandale, Sport, Stars, Wetter.', 'Switzerland\'s newspaper. Scandal, sport, stars, weather.') }],
    page: function (path) {
      if (path !== '') return null;
      const items = AX.filter(function (x) { return x[0] <= today(); }).reverse().slice(0, 5);
      const s = S();
      const big = !!(s && (Object.keys(s.inv).length || (s.heat.EBK > 60)));
      const scandal = big ? '<div class="ax-big">' + tr('BANKER-KRIMI!', 'BANK SCANDAL!') + '<small>' + tr('Steuerfahnder jagen Zürcher Privatbank. Was wusste der Chef?', 'Tax investigators hunt Zurich private bank. What did the boss know?') + '</small></div>' : '<div class="ax-big">' + e((items[0] || AX[0])[1]) + '</div>';
      return { title: 'Abend-Express – News, Stars, Sport', html: '<div class="w w-ax"><div class="ax-mast">ABEND<span>EXPRESS</span></div><div class="ax-date">' + U.longDate(today()) + tr(' · Fr. 1.80', ' · CHF 1.80') + '</div>' + scandal +
        '<ul class="ax-list">' + items.slice(big ? 0 : 1).map(function (x) { return '<li>' + e(x[1]) + '</li>'; }).join('') + '<li>' + tr('Lotto: Jackpot steigt auf ', 'Lotto: jackpot climbs to ') + U.fmt(4 + Math.round(rnd(today()) * 20), 0) + tr(' Millionen!', ' million!') + '</li><li>' + tr('Wetter: ', 'Weather: ') + (/-0[6-8]-/.test(today()) ? tr('Sonne satt, bis 31 Grad', 'Sunshine galore, up to 31 degrees') : /-(12|01|02)-/.test(today()) ? tr('Schnee bis ins Flachland', 'Snow down to the lowlands') : tr('Wechselhaft, Föhn in den Alpentälern', 'Changeable, föhn in the Alpine valleys')) + '</li></ul>' +
        '<p class="ax-foot">' + tr('Hinweise an die Redaktion: tipp@abendexpress.ch. Wir zahlen für Ihre Story!', 'Got a story? Mail tipp@abendexpress.ch. We pay!') + '</p></div>' };
    }
  });

  /* ================= Bankhaus Vogt & Cie (öffentlich) ================= */
  reg('www.vogt-cie.ch', {
    index: [{ p: '', t: tr('Bankhaus Vogt & Cie – Privatbankiers seit 1871', 'Bankhaus Vogt & Cie – Private Bankers since 1871'), x: tr('Vermögensverwaltung für Privatkunden. Diskretion und Beständigkeit. Bahnhofstrasse 64, Zürich.', 'Wealth management for private clients. Discretion and continuity. Bahnhofstrasse 64, Zürich.') }, { p: 'kontakt', t: tr('Kontakt – Bankhaus Vogt & Cie', 'Contact – Bankhaus Vogt & Cie'), x: tr('Bahnhofstrasse 64, 8021 Zürich. Telefon, Fax, SWIFT.', 'Bahnhofstrasse 64, 8021 Zürich. Telephone, fax, SWIFT.') }],
    page: function (path) {
      const s = S();
      const nav = '<div class="vc-nav">' + [['', 'Home'], ['bank', tr('Die Bank', 'The Bank')], ['private-banking', 'Private Banking'], ['news', tr('Medien', 'Media')], ['kontakt', tr('Kontakt', 'Contact')]].map(function (n) { return a('www.vogt-cie.ch', n[0], n[1]); }).join('') + '</div>';
      const shell = function (h) { return '<div class="w w-vc"><div class="vc-top"><div class="vc-logo">VOGT &amp; CIE<span>' + tr('PRIVATBANKIERS · ZÜRICH · SEIT 1871', 'PRIVATE BANKERS · ZURICH · SINCE 1871') + '</span></div></div>' + nav + '<div class="vc-body">' + h + '</div><div class="vc-foot">© ' + year() + ' Bankhaus Vogt &amp; Cie · ' + a('www.vogt-cie.ch', 'rechtliches', tr('Rechtliche Hinweise', 'Legal notice')) + '</div></div>'; };
      if (s && s.gameOver && !s.gameOver.good) return { title: 'Bankhaus Vogt & Cie', html: shell('<h1>' + tr('Mitteilung', 'Notice') + '</h1><p>' + tr('Die Geschäftstätigkeit von Bankhaus Vogt &amp; Cie ruht. Für Auskünfte wenden Sie sich bitte an den Liquidator.', 'Bankhaus Vogt &amp; Cie has suspended its business. Please address all enquiries to the liquidator.') + '</p>') };
      if (path === '') return { title: tr('Bankhaus Vogt & Cie – Privatbankiers seit 1871', 'Bankhaus Vogt & Cie – Private Bankers since 1871'), html: shell('<div class="vc-hero"><h1>' + tr('Diskretion. Beständigkeit. Seit 1871.', 'Discretion. Continuity. Since 1871.') + '</h1><p>' + tr('Als unabhängige Privatbank betreuen wir anspruchsvolle Kundinnen und Kunden, oft über mehrere Generationen.', 'As an independent private bank we look after discerning clients, often across several generations.') + '</p></div>' +
        '<div class="vc-3"><div><h3>' + tr('Vermögensverwaltung', 'Asset management') + '</h3><p>' + tr('Mandate nach Ihrem Profil: Ertrag, Ausgewogen, Wachstum.', 'Mandates to suit your profile: Income, Balanced, Growth.') + '</p></div><div><h3>' + tr('Beratung', 'Advice') + '</h3><p>' + tr('Ihre Beraterin oder Ihr Berater kennt Ihre Familie, oft seit Jahrzehnten.', 'Your adviser knows your family, often for decades.') + '</p></div><div><h3>' + tr('Standorte', 'Locations') + '</h3><p>' + (s ? Object.keys(s.branches).map(function (k) { return e(D.LOCATIONS[k].name.split(' – ')[0]); }).join(' · ') : 'Zürich') + '</p></div></div>') };
      if (path === 'bank') return { title: tr('Die Bank – Vogt & Cie', 'The Bank – Vogt & Cie'), html: shell('<h1>' + tr('Die Bank', 'The Bank') + '</h1><p>' + tr('1871 von Johann Caspar Vogt am Paradeplatz gegründet, ist Vogt &amp; Cie bis heute im Besitz der unbeschränkt haftenden Teilhaber.', 'Founded on Paradeplatz in 1871 by Johann Caspar Vogt, Vogt &amp; Cie is still owned by its partners, who are liable without limit.') + '</p><p>' + tr('Geschäftsführende Teilhaber: ', 'Managing partners: ') + e(D.PARTNERS.senior) + ', ' + e(D.PARTNERS.second) + (s ? ', ' + e(s.meta.name) : '') + '.</p>') };
      if (path === 'private-banking') return { title: 'Private Banking – Vogt & Cie', html: shell('<h1>Private Banking</h1><ul><li>' + tr('Vermögensverwaltungs- und Beratungsmandate', 'Discretionary and advisory mandates') + '</li><li>' + tr('Lombardkredite', 'Lombard loans') + '</li><li>' + tr('Edelmetallkonten und Schrankfächer', 'Precious metal accounts and safe deposit boxes') + '</li><li>' + tr('Nachfolgeplanung und Stiftungen', 'Succession planning and foundations') + '</li></ul>' + (today() >= '2012-11-01' ? '<p><b>' + tr('Steuerkonformität:', 'Tax compliance:') + '</b> ' + tr('Wir nehmen nur versteuerte Vermögen entgegen.', 'We accept only assets on which tax has been paid.') + '</p>' : '<p>' + tr('Ihre Privatsphäre ist durch das Bankgeheimnis geschützt (Art. 47 BankG).', 'Your privacy is protected by Swiss banking secrecy (Art. 47 BankG).') + '</p>')) };
      if (path === 'news') {
        const items = [[s ? s.meta.started : '2003-03-03', (s ? s.meta.name : tr('Ein neuer Teilhaber', 'A new partner')) + tr(' übernimmt die operative Leitung der Bank', ' takes over the management of the bank')]];
        if (s) Object.keys(s.branches).forEach(function (k) { const b = s.branches[k]; if (k !== 'ZH' && b.opened) items.push([b.opened, tr('Vogt & Cie eröffnet ', 'Vogt & Cie opens ') + D.LOCATIONS[k].name]); });
        return { title: tr('Medien – Vogt & Cie', 'Media – Vogt & Cie'), html: shell('<h1>' + tr('Medienmitteilungen', 'Press releases') + '</h1><ul class="vc-news">' + items.sort(function (x, y) { return x[0] < y[0] ? 1 : -1; }).map(function (x) { return '<li><span>' + U.fmtDate(x[0]) + '</span> ' + e(x[1]) + '</li>'; }).join('') + '</ul>') };
      }
      if (path === 'kontakt') return { title: tr('Kontakt – Vogt & Cie', 'Contact – Vogt & Cie'), html: shell('<h1>' + tr('Kontakt', 'Contact') + '</h1><p>Bankhaus Vogt &amp; Cie<br>' + e(D.BANK.street) + '<br>' + e(D.BANK.pobox) + ', ' + e(D.BANK.zip) + '</p><p>' + tr('Telefon ', 'Telephone ') + e(D.BANK.phone) + '<br>Fax ' + e(D.BANK.fax) + '<br>SWIFT ' + D.BANK.bic + '</p><p class="muted">' + tr('E-Banking: Aus Sicherheitsgründen bieten wir kein Internet-Banking an. Ihre Beraterin oder Ihr Berater ist persönlich für Sie da.', 'E-banking: for security reasons we do not offer internet banking. Your adviser will be glad to help you in person.') + '</p>') };
      if (path === 'rechtliches') return { title: tr('Rechtliche Hinweise – Vogt & Cie', 'Legal notice – Vogt & Cie'), html: shell('<h1>' + tr('Rechtliche Hinweise', 'Legal notice') + '</h1><p>' + tr('Die Informationen auf dieser Website stellen kein Angebot dar. Die Bank untersteht der Aufsicht der ', 'The information on this website does not constitute an offer. The bank is supervised by the ') + e(G.authName ? (S() ? G.authName('EBK') : tr('Eidgenössischen Bankenkommission', 'Swiss Federal Banking Commission')) : tr('Eidgenössischen Bankenkommission', 'Swiss Federal Banking Commission')) + '.</p>') };
      return null;
    }
  });

  /* ================= Börsenkurse ================= */
  reg('www.kurse-online.ch', {
    index: [{ p: '', t: tr('Kurse online – SMI, Devisen, Edelmetalle', 'Kurse online – SMI, currencies, precious metals'), x: tr('Aktuelle Börsenkurse: SMI, Dollar, Euro, Pfund, Yen, Gold, Libor. Charts und Titel.', 'Current prices: SMI, dollar, euro, pound, yen, gold, Libor. Charts and stocks.') }],
    page: function (path) {
      if (path !== '') return null;
      const s = S();
      if (!s) return { title: 'Kurse online', html: '<div class="w w-ko"><h1>kurse<span>online</span>.ch</h1><p>' + tr('Kursdaten werden geladen … Bitte versuchen Sie es später noch einmal.', 'Loading price data … Please try again later.') + '</p></div>' };
      const rows = ['SMI', 'USD', 'EUR', 'GBP', 'JPY', 'XAU', 'LIBOR'].map(function (k) { const d = k === 'SMI' || k === 'XAU' ? 2 : 4, p = k === 'LIBOR' ? s.market[k] - s.prevMarket[k] : (s.market[k] / s.prevMarket[k] - 1) * 100; return '<tr><td>' + e(D.MARKET_LABEL[k][1]) + '</td><td class="num">' + U.fmt(s.market[k], d) + '</td><td class="num ' + (p >= 0 ? 'pos' : 'neg') + '">' + (p >= 0 ? '+' : '') + U.fmt(p, 2) + (k === 'LIBOR' ? ' pp' : '%') + '</td><td>' + PBS.H.spark(s.mhist.slice(-30).map(function (m) { return m[k]; }), 90, 18) + '</td></tr>'; }).join('');
      const titles = D.INSTR.filter(function (i) { return s.market[i.id]; }).map(function (i) { const p = (s.market[i.id] / (s.prevMarket[i.id] || s.market[i.id]) - 1) * 100; return '<tr><td>' + e(i.name) + '</td><td>' + i.ccy + '</td><td class="num">' + U.fmt(s.market[i.id], 2) + '</td><td class="num ' + (p >= 0 ? 'pos' : 'neg') + '">' + (p >= 0 ? '+' : '') + U.fmt(p, 2) + '%</td></tr>'; }).join('');
      return { title: 'Kurse online – ' + U.fmtDate(s.date), html: '<div class="w w-ko"><h1>kurse<span>online</span>.ch</h1><p class="ko-d">' + tr('Schlusskurse vom ', 'Closing prices of ') + U.fmtDate(s.mhist[s.mhist.length - 1].d) + tr(' · Angaben ohne Gewähr', ' · No guarantee of accuracy') + '</p><table class="ko-t"><tr><th>' + tr('Index / Devise', 'Index / currency') + '</th><th>' + tr('Kurs', 'Price') + '</th><th>' + tr('Veränd.', 'Change') + '</th><th>' + tr('30 Tage', '30 days') + '</th></tr>' + rows + '</table><h2>' + tr('Titel', 'Stocks') + '</h2><table class="ko-t"><tr><th>' + tr('Titel', 'Stock') + '</th><th>' + tr('Whg', 'Ccy') + '</th><th>' + tr('Kurs', 'Price') + '</th><th>' + tr('Veränd.', 'Change') + '</th></tr>' + titles + '</table></div>' };
    }
  });

  /* ================= Webmail ================= */
  W.mail = { in: false, sent: [] };
  function mailbox() {
    const d = today(), y = year(), m = +d.slice(5, 7);
    const day = function (n) { return U.addDays(d, -n); };
    const list = [];
    if (m <= 3 || m === 12) list.push({ f: 'Skiclub Zürichberg', s: tr('Skiweekend Laax: Wer kommt mit?', 'Ski weekend in Laax: who\'s coming?'), b: tr('Liebe Mitglieder\n\nAuch dieses Jahr fahren wir nach Laax. Anmeldung bis Ende Monat beim Präsidenten. Fondue am Samstagabend inklusive!\n\nSportliche Grüsse\nDer Vorstand', 'Dear members\n\nThis year we are off to Laax again. Please sign up with the president by the end of the month. Fondue on Saturday night included!\n\nSporting regards\nThe Committee'), d: day(2) });
    if (y === 1999) list.push({ f: 'PC-Service Wollishofen', s: tr('Ist Ihr PC Jahr-2000-fähig?', 'Is your PC Y2K-ready?'), b: tr('Sehr geehrte Kundin, sehr geehrter Kunde\n\nAm 1. Januar 2000 könnten ältere Computer das Datum falsch lesen. Wir prüfen Ihren PC für nur Fr. 89.–.', 'Dear customer\n\nOn 1 January 2000 older computers may read the date wrongly. We will check your PC for only CHF 89.'), d: day(5) });
    if (y <= 2006) list.push({ f: 'Mr. James Williams, Esq.', s: 'URGENT BUSINESS PROPOSAL – STRICTLY CONFIDENTIAL', b: 'DEAR SIR,\n\nI AM THE EXECUTOR OF THE ESTATE OF A LATE CLIENT WITHOUT HEIRS AND I NEED A TRUSTWORTHY FOREIGN PARTNER WITH A SWISS BANK ACCOUNT TO RECEIVE USD 25,500,000.00. YOU WILL RECEIVE 30%.\n\nPLEASE TREAT AS STRICTLY CONFIDENTIAL.\n\n(This message was moved to your Spam folder.)', d: day(1), spam: true });
    list.push({ f: 'Karin', s: tr('Fwd: Fwd: Fwd: lustig!!', 'Fwd: Fwd: Fwd: funny!!'), b: tr('Ein Banker, ein Pfarrer und ein Steuerbeamter steigen in einen Lift …\n\nSchick das an 10 Freunde weiter, sonst hast du sieben Jahre Pech!!!', 'A banker, a priest and a tax inspector get into a lift …\n\nSend this to 10 friends or you will have seven years bad luck!!!'), d: day(3) });
    list.push({ f: 'Bücherversand Helvetia', s: tr('Ihre Bestellung ist unterwegs', 'Your order is on its way'), b: tr('Vielen Dank für Ihre Bestellung:\n1 x "Das Bankgeheimnis. Geschichte einer Schweizer Institution"\n\nVersand mit A-Post.', 'Thank you for your order:\n1 x "Banking Secrecy: History of a Swiss Institution"\n\nSent by priority mail.'), d: day(6) });
    list.push({ f: tr('Klassentreffen Gymnasium', 'Gymnasium class reunion'), s: tr('Klassentreffen: 20 Jahre Matura!', 'Class reunion: 20 years since the Matura!'), b: tr('Hallo zusammen\n\nWir treffen uns am letzten Samstag im Monat im Zunfthaus. Wer hat noch Kontakt zu Ruedi?\n\nLiebe Grüsse\nAndrea', 'Hi everyone\n\nWe meet on the last Saturday of the month at the guild hall. Is anyone still in touch with Ruedi?\n\nLove\nAndrea'), d: day(9) });
    if (S()) list.push({ f: tr('Albert Vogt (privat)', 'Albert Vogt (private)'), s: tr('Golf am Samstag?', 'Golf on Saturday?'), b: tr('Lieber Kollege\n\nWie wäre es mit 18 Löchern in Zumikon? Über die Bank sprechen wir aber nicht, dafür haben wir die Teilhabersitzung.\n\nHerzlich\nAlbert', 'Dear colleague\n\nHow about 18 holes at Zumikon? No talk about the bank, though. That is what the partners\' meeting is for.\n\nKind regards\nAlbert'), d: day(1) });
    W.mail.sent.forEach(function (x) { list.push(x); });
    return list.sort(function (x, y2) { return x.d < y2.d ? 1 : -1; }).map(function (x, i) { x.id = i; return x; });
  }
  reg('www.swissmail.ch', {
    index: [{ p: '', t: tr('swissmail.ch – Gratis E-Mail für die Schweiz', 'swissmail.ch – Free e-mail for Switzerland'), x: tr('Ihre persönliche E-Mail-Adresse. Webmail, 10 MB Speicher, Virenschutz.', 'Your own e-mail address. Webmail, 10 MB storage, virus protection.') }],
    page: function (path, q) {
      const user = S() ? S().meta.name.toLowerCase().replace(/^dr\.\s*/, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') : 'm.ammann';
      const top = '<div class="sm-top"><b>swiss<span>mail</span></b>.ch' + (W.mail.in ? '<span class="sm-u">' + e(user) + '@swissmail.ch · ' + a('www.swissmail.ch', 'logout', tr('Abmelden', 'Log out')) + '</span>' : '') + '</div>';
      if (path === 'logout') { W.mail.in = false; path = ''; }
      if (path === 'login') { W.mail.in = true; path = 'inbox'; }
      if (!W.mail.in || path === '') {
        return { title: tr('swissmail.ch – Gratis E-Mail', 'swissmail.ch – Free e-mail'), html: '<div class="w w-sm">' + top + '<div class="sm-login"><h2>' + tr('Anmelden', 'Log in') + '</h2><form data-web="www.swissmail.ch/login"><table class="frm"><tr><th>' + tr('Benutzername', 'User name') + '</th><td><input class="inp" name="u" value="' + e(user) + '"></td></tr><tr><th>' + tr('Passwort', 'Password') + '</th><td><input class="inp" type="password" name="p"></td></tr></table><div class="btnbar"><button class="btn def" type="submit">' + tr('Anmelden', 'Log in') + '</button></div></form><p class="small muted">' + tr('Neu bei swissmail? Ihre Gratis-Adresse in 2 Minuten!', 'New to swissmail? Get your free address in 2 minutes!') + '</p></div></div>' };
      }
      const box = mailbox();
      const side = '<div class="sm-side">' + a('www.swissmail.ch', 'compose', tr('✉ Neue Nachricht', '✉ New message')) + '<br>' + a('www.swissmail.ch', 'inbox', tr('Posteingang (', 'Inbox (') + box.filter(function (x) { return !x.mine; }).length + ')') + '<br><span class="muted">' + tr('Gesendet', 'Sent') + '</span><br><span class="muted">' + tr('Papierkorb', 'Trash') + '</span></div>';
      if (path === 'inbox') return { title: tr('Posteingang – swissmail.ch', 'Inbox – swissmail.ch'), html: '<div class="w w-sm">' + top + '<div class="sm-cols">' + side + '<table class="sm-list"><tr><th>' + tr('Von', 'From') + '</th><th>' + tr('Betreff', 'Subject') + '</th><th>' + tr('Datum', 'Date') + '</th></tr>' + box.map(function (x) { return '<tr class="' + (x.spam ? 'spam' : '') + '"><td>' + e(x.mine ? tr('An: ', 'To: ') + x.to : x.f) + '</td><td>' + a('www.swissmail.ch', 'read', e(x.s), 'id=' + x.id) + '</td><td>' + U.fmtDate(x.d) + '</td></tr>'; }).join('') + '</table></div></div>' };
      if (path === 'read') {
        const m = box.find(function (x) { return String(x.id) === String(q.id); });
        if (!m) return null;
        return { title: m.s + ' – swissmail.ch', html: '<div class="w w-sm">' + top + '<div class="sm-cols">' + side + '<div class="sm-msg"><table class="kv"><tr><th>' + tr('Von', 'From') + '</th><td>' + e(m.mine ? user + '@swissmail.ch' : m.f) + '</td></tr>' + (m.mine ? '<tr><th>' + tr('An', 'To') + '</th><td>' + e(m.to) + '</td></tr>' : '') + '<tr><th>' + tr('Betreff', 'Subject') + '</th><td><b>' + e(m.s) + '</b></td></tr><tr><th>' + tr('Datum', 'Date') + '</th><td>' + U.fmtDate(m.d) + '</td></tr></table><pre>' + e(m.b) + '</pre></div></div></div>' };
      }
      if (path === 'compose') return { title: tr('Neue Nachricht – swissmail.ch', 'New message – swissmail.ch'), html: '<div class="w w-sm">' + top + '<div class="sm-cols">' + side + '<form data-web="www.swissmail.ch/send" class="sm-msg"><table class="frm"><tr><th>' + tr('An', 'To') + '</th><td><input class="inp" name="to" size="40"></td></tr><tr><th>' + tr('Betreff', 'Subject') + '</th><td><input class="inp" name="s" size="40"></td></tr></table><textarea class="inp" name="b" rows="10" style="width:100%"></textarea><div class="btnbar"><button class="btn def" type="submit">' + tr('Senden', 'Send') + '</button></div></form></div></div>' };
      if (path === 'send') {
        if (q.to) W.mail.sent.push({ mine: true, to: q.to, f: user, s: q.s || tr('(kein Betreff)', '(no subject)'), b: q.b || '', d: today() });
        return { title: tr('Nachricht gesendet – swissmail.ch', 'Message sent – swissmail.ch'), html: '<div class="w w-sm">' + top + '<div class="sm-cols">' + side + '<div class="sm-msg"><p>' + (q.to ? tr('Ihre Nachricht an ', 'Your message to ') + '<b>' + e(q.to) + '</b>' + tr(' wurde gesendet.', ' has been sent.') : tr('Bitte geben Sie einen Empfänger an.', 'Please enter a recipient.')) + '</p><p>' + a('www.swissmail.ch', 'inbox', tr('Zum Posteingang', 'Go to inbox')) + '</p></div></div></div>' };
      }
      return null;
    }
  });

  /* ================= Offshore-Anbieter (Satire) ================= */
  reg('www.offshore-direct.com', {
    index: [{ p: '', t: 'Offshore Direct – Your company in the Caribbean in 24 hours', x: 'BVI, Panama, Bahamas, Liberia companies. Nominee directors, registered agent, bank introductions. Discreet.' }],
    page: function (path) {
      if (today() >= '2016-04-03') return { title: 'Website closed', html: '<div class="w w-od od-closed"><h1>This website is no longer available.</h1><p>Offshore Direct Ltd. has ceased trading. For enquiries please contact the liquidator in Road Town.</p></div>' };
      const shell = function (h) { return '<div class="w w-od"><div class="od-top">OFFSHORE<b>DIRECT</b>.com<span>Since 1994 · Road Town · Panamá · Nassau</span></div><div class="od-nav">' + a('www.offshore-direct.com', '', 'Home') + a('www.offshore-direct.com', 'prices', 'Prices') + a('www.offshore-direct.com', 'faq', 'FAQ') + a('www.offshore-direct.com', 'order', 'Order now!') + '</div><div class="od-body">' + h + '</div></div>'; };
      if (path === '') return { title: 'Offshore Direct – Your company in 24 hours', html: shell('<h1>YOUR OWN OFFSHORE COMPANY<br>IN 24 HOURS!</h1><ul class="od-ticks"><li>✔ No minimum capital</li><li>✔ Nominee directors and shareholders</li><li>✔ Registered office and agent included</li><li>✔ Introductions to discreet banks in Switzerland and Liechtenstein</li></ul><p class="od-cta">' + a('www.offshore-direct.com', 'order', 'ORDER NOW ›') + '</p>') };
      if (path === 'prices') return { title: 'Prices – Offshore Direct', html: shell('<table class="od-t"><tr><th>Jurisdiction</th><th>Set-up</th><th>Annual</th></tr><tr><td>British Virgin Islands IBC</td><td>USD 990</td><td>USD 750</td></tr><tr><td>Panama S.A.</td><td>USD 1,190</td><td>USD 850</td></tr><tr><td>Bahamas IBC</td><td>USD 1,290</td><td>USD 900</td></tr><tr><td>Liberia Corporation</td><td>USD 890</td><td>USD 650</td></tr></table><p class="small">Nominee director: USD 450 p.a. · Power of attorney: USD 150</p>') };
      if (path === 'faq') return { title: 'FAQ – Offshore Direct', html: shell('<h2>Frequently asked questions</h2><p><b>Is this legal?</b><br>Owning a company abroad is perfectly legal.*</p><p><b>Who will know I own it?</b><br>Our nominee directors appear in all public records.</p><p class="small">* Declaring the income to your tax authority is your own responsibility.</p>') };
      if (path === 'order') return { title: 'Order – Offshore Direct', html: shell('<h2>Order your company</h2><p>Our order form is temporarily unavailable. Please call our Road Town office.</p><p class="small muted">Lines open Monday to Friday, 9 a.m. – 5 p.m. Atlantic Standard Time.</p>') };
      return null;
    }
  });

  /* ================= Andere Privatbanken ================= */
  const RIVALS = [
    ['www.lemanprivee.ch', 'Banque Léman Privée', 'Genève', 1819, tr('Gestion de fortune depuis 1819', 'Wealth management since 1819'), 'fr'],
    ['www.zgb.ch', 'Zürcher Gewerbebank', 'Zürich', 1898, tr('Die Bank für Unternehmer und Familien', 'The bank for business owners and families'), 'de'],
    ['www.rheintaler-privatbank.li', 'Rheintaler Privatbank', 'Vaduz', 1926, tr('Vermögensschutz im Fürstentum Liechtenstein', 'Asset protection in the Principality of Liechtenstein'), 'de'],
    ['www.bpmg.ch', 'Banca Privata Monte Generoso', 'Lugano', 1957, tr('La vostra banca privata nel Ticino', 'Your private bank in Ticino'), 'it'],
    ['www.escher-soehne.ch', 'Bankhaus Escher & Söhne', 'Zürich', 1854, tr('Tradition verpflichtet', 'Tradition is an obligation'), 'de'],
    ['www.dufresne.ch', 'Banque Dufresne & Cie', 'Genève', 1871, tr('Banquiers privés à Genève', 'Private bankers in Geneva'), 'fr'],
    ['www.paradeplatz-bank.ch', 'Privatbank am Paradeplatz', 'Zürich', 1932, tr('Persönlich. Diskret. Zentral.', 'Personal. Discreet. Central.'), 'de']
  ];
  W._rivals = {};
  RIVALS.forEach(function (r) {
    W._rivals[r[0]] = r;
    reg(r[0], {
      index: [{ p: '', t: r[1] + ' – ' + r[4], x: tr('Privatbank in ', 'Private bank in ') + r[2] + tr(', gegründet ', ', founded ') + r[3] + tr('. Vermögensverwaltung, Anlageberatung, Nachfolgeplanung.', '. Asset management, investment advice, succession planning.') }],
      page: function (path) {
        const col = ['#5a1a2a', '#1a3a5a', '#2a4a2a', '#4a3a1a', '#3a2a4a', '#1a4a4a', '#4a2a1a'][RIVALS.indexOf(r)];
        const nav = '<div class="rb-nav" style="background:' + col + '">' + a(r[0], '', 'Home') + a(r[0], 'services', tr('Dienstleistungen', 'Services')) + a(r[0], 'karriere', tr('Karriere', 'Careers')) + a(r[0], 'kontakt', tr('Kontakt', 'Contact')) + '</div>';
        const shell = function (h) { return '<div class="w w-rb"><div class="rb-top" style="border-color:' + col + '"><b style="color:' + col + '">' + e(r[1]) + '</b><span>' + e(r[2]) + tr(' · seit ', ' · since ') + r[3] + '</span></div>' + nav + '<div class="rb-body">' + h + '</div><div class="rb-foot">© ' + year() + ' ' + e(r[1]) + '</div></div>'; };
        if (path === '') return { title: r[1], html: shell('<h1>' + e(r[4]) + '</h1><p>' + tr('Seit ', 'Since ') + r[3] + tr(' betreuen wir private Vermögen mit Sorgfalt und Diskretion. Unsere Teilhaber haften mit ihrem eigenen Vermögen.', ' we have managed private wealth with care and discretion. Our partners are liable with their own fortunes.') + '</p>' + (today() >= '2012-11-01' ? '<p><b>' + tr('Unsere Strategie:', 'Our strategy:') + '</b> ' + tr('Wir betreuen ausschliesslich steuerkonforme Vermögen.', 'We manage tax-compliant assets only.') + '</p>' : '')) };
        if (path === 'services') return { title: tr('Dienstleistungen – ', 'Services – ') + r[1], html: shell('<h2>' + tr('Dienstleistungen', 'Services') + '</h2><ul><li>' + tr('Vermögensverwaltung (Mandate ab CHF 1 Mio.)', 'Asset management (mandates from CHF 1 million)') + '</li><li>' + tr('Anlageberatung', 'Investment advice') + '</li><li>' + tr('Lombardkredite', 'Lombard loans') + '</li><li>' + tr('Nachfolge- und Stiftungsplanung', 'Succession and foundation planning') + '</li></ul>') };
        if (path === 'karriere') return { title: tr('Karriere – ', 'Careers – ') + r[1], html: shell('<h2>' + tr('Karriere', 'Careers') + '</h2><p>' + tr('Wir suchen erfahrene <b>Kundenberaterinnen und Kundenberater</b> mit eigenem Kundenstamm (Deutschland, Italien, Lateinamerika). Attraktive Konditionen.', 'We are looking for experienced <b>relationship managers</b> with their own client book (Germany, Italy, Latin America). Attractive terms.') + '</p><p class="small muted">' + tr('Bewerbungen mit Diskretion an die Personalabteilung.', 'Applications in confidence to the Personnel Department.') + '</p>') };
        if (path === 'kontakt') return { title: tr('Kontakt – ', 'Contact – ') + r[1], html: shell('<h2>' + tr('Kontakt', 'Contact') + '</h2><p>' + e(r[1]) + '<br>' + e(r[2]) + '</p><p>' + tr('Besuche nach Vereinbarung.', 'Visits by appointment.') + '</p>') };
        return null;
      }
    });
  });

  /* ================= Schneebericht ================= */
  reg('www.schneebericht.ch', {
    index: [{ p: '', t: tr('Schneebericht Schweiz – Pisten, Lifte, Neuschnee', 'Swiss Snow Report – pistes, lifts, fresh snow'), x: tr('Aktueller Schneebericht für Laax, Davos, St. Moritz, Zermatt, Verbier, Engelberg.', 'Today\'s snow report for Laax, Davos, St. Moritz, Zermatt, Verbier, Engelberg.') }],
    page: function (path) {
      if (path !== '') return null;
      const m = +today().slice(5, 7), winter = m >= 12 || m <= 4;
      const rows = [['Laax', 2252], ['Davos Klosters', 2844], ['St. Moritz', 3057], ['Zermatt', 3883], ['Verbier', 3330], ['Engelberg-Titlis', 3020]].map(function (x) {
        const glacier = x[1] > 3300;
        const open = winter || glacier;
        const snow = open ? Math.round(40 + rnd(today() + x[0]) * (winter ? 180 : 60)) : 0;
        const fresh = open && rnd(x[0] + today() + 'n') > 0.6 ? Math.round(rnd(today() + x[0] + 'f') * 30) : 0;
        return '<tr><td>' + x[0] + '</td><td>' + x[1] + ' m</td><td class="num">' + (open ? snow + ' cm' : '–') + '</td><td class="num">' + (fresh ? fresh + ' cm' : '–') + '</td><td>' + (open ? '<span class="pos">' + tr('offen', 'open') + '</span>' : '<span class="muted">' + tr('Saison beendet', 'Season over') + '</span>') + '</td></tr>';
      }).join('');
      return { title: tr('Schneebericht Schweiz', 'Swiss Snow Report'), html: '<div class="w w-sb"><h1>❄ ' + tr('Schneebericht Schweiz', 'Swiss Snow Report') + '</h1><p>' + tr('Stand: ', 'As of ') + U.longDate(today()) + tr(', 07.30 Uhr', ', 07:30') + '</p><table class="ko-t"><tr><th>' + tr('Gebiet', 'Resort') + '</th><th>' + tr('Höhe', 'Altitude') + '</th><th>' + tr('Schnee', 'Snow') + '</th><th>' + tr('Neuschnee', 'Fresh snow') + '</th><th>' + tr('Lifte', 'Lifts') + '</th></tr>' + rows + '</table></div>' };
    }
  });

  /* ================= Die Spielseite selbst ================= */
  reg('swissbanking.lilbeans.workers.dev', {
    index: [{ p: '', t: 'PBS/Web – a game about Swiss banking secrecy', x: 'Run a Zurich private bank from 1998 to 2017. swissbanking.lilbeans.workers.dev' }],
    page: function (path) {
      if (path !== '') return null;
      return { title: 'PBS/Web – the game', html: '<div class="w w-lb"><h1>PBS/Web</h1><p>A game about the last twenty years of Swiss banking secrecy.</p><p><b>You are already playing it.</b> This workstation, its disk and this browser are part of the game.</p><p>' + '<a href="#/overview">Back to PBS/Web ›</a> · ' + '<a href="#/x/intranet">Intranet Vogt ›</a></p><p class="muted small">swissbanking.lilbeans.workers.dev</p></div>' };
    }
  });

  // Formulare auf Webseiten: Felder an die Zieladresse anhängen
  document.addEventListener('submit', function (ev) {
    const f = ev.target;
    if (!f.dataset || !f.dataset.web) return;
    ev.preventDefault();
    const q = Array.prototype.map.call(f.elements, function (el) { return el.name ? encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value) : null; }).filter(Boolean).join('&');
    const t = f.dataset.web, i = t.indexOf('/');
    location.hash = href(t.slice(0, i), t.slice(i + 1), q);
  });
})(window.PBS);
