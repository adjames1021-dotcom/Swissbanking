/* Das Internet des Arbeitsplatzes (fiktiv): Suchmaschine, Zeitungen, Börsenkurse, Webmail, Banken,
   ein Offshore-Anbieter und der Schneebericht. Inhalte folgen dem Spieldatum und den Ereignissen.
   Echte Adressen sind nicht erreichbar (Fehlerseite des Browsers). */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U;
  const e = U.esc;
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
    if (/bank|private|client|secrecy|confidential/.test(t)) P.push('Industry representatives stress that client confidentiality remains a cornerstone of the Swiss financial centre. Critics counter that the business model depends on money that has not been declared at home.');
    if (/smi|market|stock|equit|franc|dollar|euro|gold|rate|bond/.test(t)) P.push('Traders said volumes were moderate. Analysts expect volatility to remain elevated in the coming weeks, with the franc once again in demand as a safe haven.');
    if (/eu|brussels|treaty|agreement|oecd/.test(t)) P.push('Diplomats in Berne describe the talks as difficult. The Federal Council has repeatedly said that banking secrecy is "not negotiable" – a position observers expect to be tested.');
    if (!P.length) P.push('The news was received calmly on Bahnhofstrasse. "We are watching developments closely," a spokesman for a Zurich private bank said, declining to comment further.');
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
  const CATS = { banken: ['Banken & Finanzen', function () { return ['www.vogt-cie.ch'].concat(Object.keys(W._rivals)).concat(['www.kurse-online.ch', 'www.offshore-direct.com']); }], news: ['Nachrichten', function () { return ['www.finanzblatt.ch', 'www.abendexpress.ch']; }], freizeit: ['Freizeit & Sport', function () { return ['www.schneebericht.ch']; }], komm: ['Kommunikation', function () { return ['www.swissmail.ch']; }] };
  reg('www.alpensuche.ch', {
    index: [{ p: '', t: 'alpensuche.ch – die Suchmaschine der Schweiz', x: 'Suche im Schweizer Web. Webkatalog, Nachrichten, Wetter.' }],
    page: function (path, q) {
      const head = '<div class="as-logo">alpen<b>suche</b><span>.ch</span></div>';
      const form = function (v) { return '<form data-web="www.alpensuche.ch/suche" class="as-form"><input name="q" class="inp" size="44" value="' + e(v || '') + '"> <button class="btn" type="submit">Suchen</button></form>'; };
      if (path === '' || path === 'index.html') {
        return { title: 'alpensuche.ch – die Suchmaschine der Schweiz', html: '<div class="w w-as"><div class="as-home">' + head + form('') +
          '<div class="as-cats"><b>Webkatalog</b><ul>' + Object.keys(CATS).map(function (k) { return '<li>' + a('www.alpensuche.ch', 'katalog', CATS[k][0], 'k=' + k) + '</li>'; }).join('') + '</ul></div>' +
          '<p class="as-foot">© 1998–' + year() + ' alpensuche.ch · Über 1.2 Millionen Schweizer Seiten im Index · ' + a('www.alpensuche.ch', 'info', 'Über uns') + '</p></div></div>' };
      }
      if (path === 'katalog') {
        const c = CATS[q.k];
        if (!c) return null;
        return { title: 'Webkatalog: ' + c[0] + ' – alpensuche.ch', html: '<div class="w w-as"><div class="as-top">' + head + form('') + '</div><h2>Webkatalog › ' + e(c[0]) + '</h2><ul class="as-res">' +
          c[1]().filter(canon).map(function (h) { const s = SITES[canon(h)]; const x = (s.index && s.index[0]) || { t: h, x: '' }; return '<li>' + a(h, '', e(x.t)) + '<br><span>' + e(x.x) + '</span><br><em>http://' + h + '/</em></li>'; }).join('') + '</ul></div>' };
      }
      if (path === 'info') return { title: 'Über alpensuche.ch', html: '<div class="w w-as"><div class="as-top">' + head + '</div><p>alpensuche.ch durchsucht seit 1998 das Schweizer Web. Unser Roboter besucht jede Woche über eine Million Seiten.</p><p>Werbung auf alpensuche.ch: inserate@alpensuche.ch</p></div>' };
      if (path === 'suche') {
        const query = String(q.q || '').trim();
        const words = query.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
        const res = words.length ? index().map(function (r) {
          const hay = (r.t + ' ' + r.x + ' ' + r.url).toLowerCase();
          const sc = words.reduce(function (t, w) { return t + (hay.indexOf(w) >= 0 ? (r.t.toLowerCase().indexOf(w) >= 0 ? 3 : 1) : 0); }, 0);
          return { r: r, sc: sc };
        }).filter(function (x) { return x.sc > 0; }).sort(function (x, y) { return y.sc - x.sc; }).slice(0, 15) : [];
        const ad = /offshore|bvi|panama|firma|company|trust|steuer|tax|stiftung|bahamas/i.test(query) && today() < '2016-04-03' ? '<div class="as-ad"><span>Anzeige</span> ' + a('www.offshore-direct.com', '', 'Ihre eigene Firma in der Karibik – ab USD 990') + '<br>Gründung in 24 Stunden. Nominee Directors. Diskret. – www.offshore-direct.com</div>' : '';
        return { title: 'alpensuche.ch: ' + query, html: '<div class="w w-as"><div class="as-top">' + head + form(query) + '</div>' + ad +
          (res.length ? '<p class="as-n">Ergebnisse 1–' + res.length + ' für <b>' + e(query) + '</b></p><ul class="as-res">' + res.map(function (x) { return '<li><a href="' + x.r.u + '">' + e(x.r.t) + '</a><br><span>' + e(x.r.x.slice(0, 180)) + (x.r.x.length > 180 ? ' …' : '') + '</span><br><em>' + e(x.r.url) + '</em></li>'; }).join('') + '</ul>'
            : '<p class="as-n">Ihre Suche nach <b>' + e(query) + '</b> ergab keine Treffer.</p><ul class="as-tips"><li>Überprüfen Sie die Schreibweise.</li><li>Versuchen Sie allgemeinere Suchbegriffe.</li><li>Stöbern Sie im ' + a('www.alpensuche.ch', '', 'Webkatalog') + '.</li></ul>') + '</div>' };
      }
      return null;
    }
  });

  /* ================= Zürcher Finanzblatt ================= */
  function quotes() {
    const s = S();
    if (!s) return '<p class="muted">Kurse nach Börsenschluss.</p>';
    return '<table class="fb-q">' + ['SMI', 'USD', 'EUR', 'XAU'].map(function (k) { const p = (s.market[k] / s.prevMarket[k] - 1) * 100; return '<tr><td>' + D.MARKET_LABEL[k][0] + '</td><td class="num">' + U.fmt(s.market[k], k === 'SMI' || k === 'XAU' ? 2 : 4) + '</td><td class="num ' + (p >= 0 ? 'pos' : 'neg') + '">' + (p >= 0 ? '+' : '') + U.fmt(p, 2) + '%</td></tr>'; }).join('') + '</table>';
  }
  function bankStory() {
    const s = S();
    if (!s) return null;
    const press = s.heatLog.filter(function (h) { return /press|journalist|leak|whistle|stolen/i.test(h.r); }).slice(0, 1)[0];
    const inv = Object.keys(s.inv)[0];
    if (inv) return 'Foreign prosecutors examine Zurich private bank – ' + G.authName(inv) + ' confirms investigation';
    if (press) return 'Questions about discretion at a traditional Bahnhofstrasse bank';
    return null;
  }
  reg('www.finanzblatt.ch', {
    index: [{ p: '', t: 'Zürcher Finanzblatt – Online', x: 'Unabhängige Tageszeitung für Wirtschaft und Finanzen. Nachrichten, Börse, Banken.' }, { p: 'boerse', t: 'Börse – Zürcher Finanzblatt', x: 'SMI, Devisen, Gold: Kurse und Marktbericht.' }],
    page: function (path, q) {
      const list = W.news().slice().reverse();
      const mast = '<div class="fb-mast"><a href="' + href('www.finanzblatt.ch', '') + '">Zürcher Finanzblatt</a><span>' + U.longDate(today()) + ' · Online-Ausgabe</span></div><div class="fb-nav">' + a('www.finanzblatt.ch', '', 'Startseite') + ' | ' + a('www.finanzblatt.ch', 'boerse', 'Börse') + ' | ' + a('www.finanzblatt.ch', 'archiv', 'Archiv') + '</div>';
      const side = '<div class="fb-side"><h3>Börse</h3>' + quotes() + '<h3>Meistgelesen</h3><ol>' + list.slice(1, 6).map(function (n) { return '<li>' + a('www.finanzblatt.ch', 'artikel', e(n.text), 'id=' + n.id) + '</li>'; }).join('') + '</ol></div>';
      if (path === '') {
        const top = list[0];
        const own = bankStory();
        return { title: 'Zürcher Finanzblatt – Online', html: '<div class="w w-fb">' + mast + '<div class="fb-cols"><div class="fb-main">' +
          (own ? '<div class="fb-excl"><span>EXKLUSIV</span> ' + e(own) + '</div>' : '') +
          '<h1>' + a('www.finanzblatt.ch', 'artikel', e(top.text), 'id=' + top.id) + '</h1><p class="fb-lead">' + U.fmtDate(top.d) + ' – ' + e(lead(top)[0]) + '</p>' +
          '<ul class="fb-list">' + list.slice(1, 14).map(function (n) { return '<li><span>' + U.fmtDate(n.d) + '</span> ' + a('www.finanzblatt.ch', 'artikel', e(n.text), 'id=' + n.id) + '</li>'; }).join('') + '</ul></div>' + side + '</div></div>' };
      }
      if (path === 'artikel') {
        const n = list.find(function (x) { return String(x.id) === String(q.id); });
        if (!n) return null;
        return { title: n.text + ' – Zürcher Finanzblatt', html: '<div class="w w-fb">' + mast + '<div class="fb-cols"><div class="fb-main fb-art"><h1>' + e(n.text) + '</h1><p class="fb-meta">Zürich, ' + U.longDate(n.d) + ' · Redaktion Finanzen</p>' +
          lead(n).map(function (p) { return '<p>' + e(p) + '</p>'; }).join('') + '<p>' + a('www.finanzblatt.ch', '', '‹ Zur Startseite') + '</p></div>' + side + '</div></div>' };
      }
      if (path === 'archiv') return { title: 'Archiv – Zürcher Finanzblatt', html: '<div class="w w-fb">' + mast + '<h2>Archiv</h2><ul class="fb-list">' + list.map(function (n) { return '<li><span>' + U.fmtDate(n.d) + '</span> ' + a('www.finanzblatt.ch', 'artikel', e(n.text), 'id=' + n.id) + '</li>'; }).join('') + '</ul></div>' };
      if (path === 'boerse') {
        const s = S();
        return { title: 'Börse – Zürcher Finanzblatt', html: '<div class="w w-fb">' + mast + '<h2>Börse Schweiz</h2>' + quotes() + (s ? '<div class="fb-chart">' + PBS.H.lineChart(s.mhist.slice(-60).map(function (m) { return [m.d, m.SMI]; }), 'pts', 0) + '</div>' : '') + '</div>' };
      }
      return null;
    }
  });

  /* ================= Abend-Express (Boulevard) ================= */
  const AX = [
    ['1998-01-01', 'Fondue-Rekord in Gruyères: 5 Tonnen Käse!'], ['1999-06-01', 'Jahr-2000-Panik: Bunkern Schweizer jetzt Konserven?'], ['2000-01-01', 'Millennium: Alles lief rund – Computer überleben!'],
    ['2001-10-02', 'Grounding! Schweizer Airline bleibt am Boden'], ['2003-07-01', 'Jahrhundert-Hitze! Badis überfüllt, Gletscher schmelzen'], ['2006-06-01', 'WM-Fieber: Ganze Schweiz in Rot-Weiss'],
    ['2008-06-07', 'Euro 08: Fanmeile Zürich platzt aus allen Nähten'], ['2008-10-16', 'Staat rettet Grossbank – Steuerzahler zittern'], ['2011-08-01', 'Franken so stark wie nie: Einkaufstourismus boomt'],
    ['2015-01-15', 'Franken-Schock! Nationalbank kippt Mindestkurs'], ['2016-04-04', 'Panama-Papers: Auch Schweizer Anwälte betroffen!']
  ];
  reg('www.abendexpress.ch', {
    index: [{ p: '', t: 'Abend-Express – News, Stars, Sport', x: 'Die Zeitung der Schweiz. Skandale, Sport, Stars, Wetter.' }],
    page: function (path) {
      if (path !== '') return null;
      const items = AX.filter(function (x) { return x[0] <= today(); }).reverse().slice(0, 5);
      const s = S();
      const scandal = s && (Object.keys(s.inv).length || (s.heat.EBK > 60)) ? '<div class="ax-big">BANKER-KRIMI!<small>Steuerfahnder jagen Zürcher Privatbank – was wusste der Chef?</small></div>' : '<div class="ax-big">' + e((items[0] || AX[0])[1]) + '</div>';
      return { title: 'Abend-Express – News, Stars, Sport', html: '<div class="w w-ax"><div class="ax-mast">ABEND<span>EXPRESS</span></div><div class="ax-date">' + U.longDate(today()) + ' · Fr. 1.80</div>' + scandal +
        '<ul class="ax-list">' + items.slice(scandal.indexOf('KRIMI') >= 0 ? 0 : 1).map(function (x) { return '<li>' + e(x[1]) + '</li>'; }).join('') + '<li>Lotto: Jackpot steigt auf ' + U.fmt(4 + Math.round(rnd(today()) * 20), 0) + ' Millionen!</li><li>Wetter: ' + (/-0[6-8]-/.test(today()) ? 'Sonne satt, bis 31 Grad' : /-(12|01|02)-/.test(today()) ? 'Schnee bis ins Flachland' : 'Wechselhaft, Föhn in den Alpentälern') + '</li></ul>' +
        '<p class="ax-foot">Hinweise an die Redaktion: tipp@abendexpress.ch – wir zahlen für Ihre Story!</p></div>' };
    }
  });

  /* ================= Bankhaus Vogt & Cie (öffentlich) ================= */
  reg('www.vogt-cie.ch', {
    index: [{ p: '', t: 'Bankhaus Vogt & Cie – Privatbankiers seit 1871', x: 'Vermögensverwaltung für Privatkunden. Diskretion und Beständigkeit. Bahnhofstrasse 64, Zürich.' }, { p: 'kontakt', t: 'Kontakt – Bankhaus Vogt & Cie', x: 'Bahnhofstrasse 64, 8021 Zürich. Telefon, Fax, SWIFT.' }],
    page: function (path) {
      const s = S();
      const nav = '<div class="vc-nav">' + [['', 'Home'], ['bank', 'Die Bank'], ['private-banking', 'Private Banking'], ['news', 'Medien'], ['kontakt', 'Kontakt']].map(function (n) { return a('www.vogt-cie.ch', n[0], n[1]); }).join('') + '</div>';
      const shell = function (h) { return '<div class="w w-vc"><div class="vc-top"><div class="vc-logo">VOGT &amp; CIE<span>PRIVATBANKIERS · ZÜRICH · SEIT 1871</span></div></div>' + nav + '<div class="vc-body">' + h + '</div><div class="vc-foot">© ' + year() + ' Bankhaus Vogt &amp; Cie · ' + a('www.vogt-cie.ch', 'rechtliches', 'Rechtliche Hinweise') + '</div></div>'; };
      if (s && s.gameOver && !s.gameOver.good) return { title: 'Bankhaus Vogt & Cie', html: shell('<h1>Mitteilung</h1><p>Die Geschäftstätigkeit von Bankhaus Vogt &amp; Cie ruht. Für Auskünfte wenden Sie sich bitte an den Liquidator.</p>') };
      if (path === '') return { title: 'Bankhaus Vogt & Cie – Privatbankiers seit 1871', html: shell('<div class="vc-hero"><h1>Diskretion. Beständigkeit. Seit 1871.</h1><p>Als unabhängige Privatbank begleiten wir anspruchsvolle Kundinnen und Kunden über Generationen – persönlich, verschwiegen und mit Sorgfalt.</p></div>' +
        '<div class="vc-3"><div><h3>Vermögensverwaltung</h3><p>Mandate nach Ihrem Profil: Ertrag, Ausgewogen, Wachstum.</p></div><div><h3>Beratung</h3><p>Ihre Beraterin, Ihr Berater kennt Ihre Familie – oft seit Jahrzehnten.</p></div><div><h3>Standorte</h3><p>' + (s ? Object.keys(s.branches).map(function (k) { return e(D.LOCATIONS[k].name.split(' – ')[0]); }).join(' · ') : 'Zürich') + '</p></div></div>') };
      if (path === 'bank') return { title: 'Die Bank – Vogt & Cie', html: shell('<h1>Die Bank</h1><p>1871 von Johann Caspar Vogt am Paradeplatz gegründet, ist Vogt &amp; Cie bis heute im Besitz der unbeschränkt haftenden Teilhaber.</p><p>Geschäftsführende Teilhaber: ' + e(D.PARTNERS.senior) + ', ' + e(D.PARTNERS.second) + (s ? ', ' + e(s.meta.name) : '') + '.</p>') };
      if (path === 'private-banking') return { title: 'Private Banking – Vogt & Cie', html: shell('<h1>Private Banking</h1><ul><li>Vermögensverwaltungs- und Beratungsmandate</li><li>Lombardkredite</li><li>Edelmetallkonten und Schrankfächer</li><li>Nachfolgeplanung und Stiftungen</li></ul>' + (today() >= '2012-11-01' ? '<p><b>Steuerkonformität:</b> Wir nehmen nur versteuerte Vermögen entgegen.</p>' : '<p>Ihre Privatsphäre ist durch das Bankgeheimnis geschützt (Art. 47 BankG).</p>')) };
      if (path === 'news') {
        const items = [[s ? s.meta.started : '2003-03-03', (s ? s.meta.name : 'Ein neuer Teilhaber') + ' übernimmt die operative Leitung der Bank']];
        if (s) Object.keys(s.branches).forEach(function (k) { const b = s.branches[k]; if (k !== 'ZH' && b.opened) items.push([b.opened, 'Vogt & Cie eröffnet ' + D.LOCATIONS[k].name]); });
        return { title: 'Medien – Vogt & Cie', html: shell('<h1>Medienmitteilungen</h1><ul class="vc-news">' + items.sort(function (x, y) { return x[0] < y[0] ? 1 : -1; }).map(function (x) { return '<li><span>' + U.fmtDate(x[0]) + '</span> ' + e(x[1]) + '</li>'; }).join('') + '</ul>') };
      }
      if (path === 'kontakt') return { title: 'Kontakt – Vogt & Cie', html: shell('<h1>Kontakt</h1><p>Bankhaus Vogt &amp; Cie<br>' + e(D.BANK.street) + '<br>' + e(D.BANK.pobox) + ', ' + e(D.BANK.zip) + '</p><p>Telefon ' + e(D.BANK.phone) + '<br>Fax ' + e(D.BANK.fax) + '<br>SWIFT ' + D.BANK.bic + '</p><p class="muted">E-Banking: Aus Sicherheitsgründen bieten wir kein Internet-Banking an. Ihre Beraterin oder Ihr Berater ist persönlich für Sie da.</p>') };
      if (path === 'rechtliches') return { title: 'Rechtliche Hinweise – Vogt & Cie', html: shell('<h1>Rechtliche Hinweise</h1><p>Die Informationen auf dieser Website stellen kein Angebot dar. Die Bank untersteht der Aufsicht der ' + e(G.authName ? (S() ? G.authName('EBK') : 'Eidgenössischen Bankenkommission') : 'Eidgenössischen Bankenkommission') + '.</p>') };
      return null;
    }
  });

  /* ================= Börsenkurse ================= */
  reg('www.kurse-online.ch', {
    index: [{ p: '', t: 'Kurse online – SMI, Devisen, Edelmetalle', x: 'Aktuelle Börsenkurse: SMI, Dollar, Euro, Pfund, Yen, Gold, Libor. Charts und Titel.' }],
    page: function (path) {
      if (path !== '') return null;
      const s = S();
      if (!s) return { title: 'Kurse online', html: '<div class="w w-ko"><h1>kurse<span>online</span>.ch</h1><p>Kursdaten werden geladen … Bitte versuchen Sie es später noch einmal.</p></div>' };
      const rows = ['SMI', 'USD', 'EUR', 'GBP', 'JPY', 'XAU', 'LIBOR'].map(function (k) { const d = k === 'SMI' || k === 'XAU' ? 2 : 4, p = k === 'LIBOR' ? s.market[k] - s.prevMarket[k] : (s.market[k] / s.prevMarket[k] - 1) * 100; return '<tr><td>' + e(D.MARKET_LABEL[k][1]) + '</td><td class="num">' + U.fmt(s.market[k], d) + '</td><td class="num ' + (p >= 0 ? 'pos' : 'neg') + '">' + (p >= 0 ? '+' : '') + U.fmt(p, 2) + (k === 'LIBOR' ? ' pp' : '%') + '</td><td>' + PBS.H.spark(s.mhist.slice(-30).map(function (m) { return m[k]; }), 90, 18) + '</td></tr>'; }).join('');
      const titles = D.INSTR.filter(function (i) { return s.market[i.id]; }).map(function (i) { const p = (s.market[i.id] / (s.prevMarket[i.id] || s.market[i.id]) - 1) * 100; return '<tr><td>' + e(i.name) + '</td><td>' + i.ccy + '</td><td class="num">' + U.fmt(s.market[i.id], 2) + '</td><td class="num ' + (p >= 0 ? 'pos' : 'neg') + '">' + (p >= 0 ? '+' : '') + U.fmt(p, 2) + '%</td></tr>'; }).join('');
      return { title: 'Kurse online – ' + U.fmtDate(s.date), html: '<div class="w w-ko"><h1>kurse<span>online</span>.ch</h1><p class="ko-d">Schlusskurse vom ' + U.fmtDate(s.mhist[s.mhist.length - 1].d) + ' · Angaben ohne Gewähr</p><table class="ko-t"><tr><th>Index / Devise</th><th>Kurs</th><th>Veränd.</th><th>30 Tage</th></tr>' + rows + '</table><h2>Titel</h2><table class="ko-t"><tr><th>Titel</th><th>Whg</th><th>Kurs</th><th>Veränd.</th></tr>' + titles + '</table></div>' };
    }
  });

  /* ================= Webmail ================= */
  W.mail = { in: false, sent: [] };
  function mailbox() {
    const d = today(), y = year(), m = +d.slice(5, 7);
    const day = function (n) { return U.addDays(d, -n); };
    const list = [];
    if (m <= 3 || m === 12) list.push({ f: 'Skiclub Zürichberg', s: 'Skiweekend Laax – wer kommt mit?', b: 'Liebe Mitglieder\n\nAuch dieses Jahr fahren wir nach Laax. Anmeldung bis Ende Monat beim Präsidenten. Fondue am Samstagabend inklusive!\n\nSportliche Grüsse\nDer Vorstand', d: day(2) });
    if (y === 1999) list.push({ f: 'PC-Service Wollishofen', s: 'Ist Ihr PC Jahr-2000-fähig?', b: 'Sehr geehrte Kundin, sehr geehrter Kunde\n\nAm 1. Januar 2000 könnten ältere Computer das Datum falsch lesen. Wir prüfen Ihren PC für nur Fr. 89.–.', d: day(5) });
    if (y <= 2006) list.push({ f: 'Mr. James Williams, Esq.', s: 'URGENT BUSINESS PROPOSAL – STRICTLY CONFIDENTIAL', b: 'DEAR SIR,\n\nI AM THE EXECUTOR OF THE ESTATE OF A LATE CLIENT WITHOUT HEIRS AND I NEED A TRUSTWORTHY FOREIGN PARTNER WITH A SWISS BANK ACCOUNT TO RECEIVE USD 25,500,000.00. YOU WILL RECEIVE 30%.\n\nPLEASE TREAT AS STRICTLY CONFIDENTIAL.\n\n(This message was moved to your Spam folder.)', d: day(1), spam: true });
    list.push({ f: 'Karin', s: 'Fwd: Fwd: Fwd: lustig!!', b: 'Ein Banker, ein Pfarrer und ein Steuerbeamter steigen in einen Lift …\n\nSchick das an 10 Freunde weiter, sonst hast du sieben Jahre Pech!!!', d: day(3) });
    list.push({ f: 'Bücherversand Helvetia', s: 'Ihre Bestellung ist unterwegs', b: 'Vielen Dank für Ihre Bestellung:\n1 x "Das Bankgeheimnis – Geschichte einer Schweizer Institution"\n\nVersand mit A-Post.', d: day(6) });
    list.push({ f: 'Klassentreffen Gymnasium', s: 'Klassentreffen – 20 Jahre Matura!', b: 'Hallo zusammen\n\nWir treffen uns am letzten Samstag im Monat im Zunfthaus. Wer hat noch Kontakt zu Ruedi?\n\nLiebe Grüsse\nAndrea', d: day(9) });
    if (S()) list.push({ f: 'Albert Vogt (privat)', s: 'Golf am Samstag?', b: 'Lieber Kollege\n\nWie wäre es mit 18 Löchern in Zumikon? Über die Bank sprechen wir aber nicht – dafür haben wir die Teilhabersitzung.\n\nHerzlich\nAlbert', d: day(1) });
    W.mail.sent.forEach(function (x) { list.push(x); });
    return list.sort(function (x, y2) { return x.d < y2.d ? 1 : -1; }).map(function (x, i) { x.id = i; return x; });
  }
  reg('www.swissmail.ch', {
    index: [{ p: '', t: 'swissmail.ch – Gratis E-Mail für die Schweiz', x: 'Ihre persönliche E-Mail-Adresse. Webmail, 10 MB Speicher, Virenschutz.' }],
    page: function (path, q) {
      const user = S() ? S().meta.name.toLowerCase().replace(/^dr\.\s*/, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') : 'm.ammann';
      const top = '<div class="sm-top"><b>swiss<span>mail</span></b>.ch' + (W.mail.in ? '<span class="sm-u">' + e(user) + '@swissmail.ch · ' + a('www.swissmail.ch', 'logout', 'Abmelden') + '</span>' : '') + '</div>';
      if (path === 'logout') { W.mail.in = false; path = ''; }
      if (path === 'login') { W.mail.in = true; path = 'inbox'; }
      if (!W.mail.in || path === '') {
        return { title: 'swissmail.ch – Gratis E-Mail', html: '<div class="w w-sm">' + top + '<div class="sm-login"><h2>Anmelden</h2><form data-web="www.swissmail.ch/login"><table class="frm"><tr><th>Benutzername</th><td><input class="inp" name="u" value="' + e(user) + '"></td></tr><tr><th>Passwort</th><td><input class="inp" type="password" name="p"></td></tr></table><div class="btnbar"><button class="btn def" type="submit">Anmelden</button></div></form><p class="small muted">Neu bei swissmail? Ihre Gratis-Adresse in 2 Minuten!</p></div></div>' };
      }
      const box = mailbox();
      const side = '<div class="sm-side">' + a('www.swissmail.ch', 'compose', '✉ Neue Nachricht') + '<br>' + a('www.swissmail.ch', 'inbox', 'Posteingang (' + box.filter(function (x) { return !x.mine; }).length + ')') + '<br><span class="muted">Gesendet</span><br><span class="muted">Papierkorb</span></div>';
      if (path === 'inbox') return { title: 'Posteingang – swissmail.ch', html: '<div class="w w-sm">' + top + '<div class="sm-cols">' + side + '<table class="sm-list"><tr><th>Von</th><th>Betreff</th><th>Datum</th></tr>' + box.map(function (x) { return '<tr class="' + (x.spam ? 'spam' : '') + '"><td>' + e(x.mine ? 'An: ' + x.to : x.f) + '</td><td>' + a('www.swissmail.ch', 'read', e(x.s), 'id=' + x.id) + '</td><td>' + U.fmtDate(x.d) + '</td></tr>'; }).join('') + '</table></div></div>' };
      if (path === 'read') {
        const m = box.find(function (x) { return String(x.id) === String(q.id); });
        if (!m) return null;
        return { title: m.s + ' – swissmail.ch', html: '<div class="w w-sm">' + top + '<div class="sm-cols">' + side + '<div class="sm-msg"><table class="kv"><tr><th>Von</th><td>' + e(m.mine ? user + '@swissmail.ch' : m.f) + '</td></tr>' + (m.mine ? '<tr><th>An</th><td>' + e(m.to) + '</td></tr>' : '') + '<tr><th>Betreff</th><td><b>' + e(m.s) + '</b></td></tr><tr><th>Datum</th><td>' + U.fmtDate(m.d) + '</td></tr></table><pre>' + e(m.b) + '</pre></div></div></div>' };
      }
      if (path === 'compose') return { title: 'Neue Nachricht – swissmail.ch', html: '<div class="w w-sm">' + top + '<div class="sm-cols">' + side + '<form data-web="www.swissmail.ch/send" class="sm-msg"><table class="frm"><tr><th>An</th><td><input class="inp" name="to" size="40"></td></tr><tr><th>Betreff</th><td><input class="inp" name="s" size="40"></td></tr></table><textarea class="inp" name="b" rows="10" style="width:100%"></textarea><div class="btnbar"><button class="btn def" type="submit">Senden</button></div></form></div></div>' };
      if (path === 'send') {
        if (q.to) W.mail.sent.push({ mine: true, to: q.to, f: user, s: q.s || '(kein Betreff)', b: q.b || '', d: today() });
        return { title: 'Nachricht gesendet – swissmail.ch', html: '<div class="w w-sm">' + top + '<div class="sm-cols">' + side + '<div class="sm-msg"><p>' + (q.to ? 'Ihre Nachricht an <b>' + e(q.to) + '</b> wurde gesendet.' : 'Bitte geben Sie einen Empfänger an.') + '</p><p>' + a('www.swissmail.ch', 'inbox', 'Zum Posteingang') + '</p></div></div></div>' };
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
    ['www.lemanprivee.ch', 'Banque Léman Privée', 'Genève', 1819, 'Gestion de fortune depuis 1819', 'fr'],
    ['www.zgb.ch', 'Zürcher Gewerbebank', 'Zürich', 1898, 'Die Bank für Unternehmer und Familien', 'de'],
    ['www.rheintaler-privatbank.li', 'Rheintaler Privatbank', 'Vaduz', 1926, 'Vermögensschutz im Fürstentum Liechtenstein', 'de'],
    ['www.bpmg.ch', 'Banca Privata Monte Generoso', 'Lugano', 1957, 'La vostra banca privata nel Ticino', 'it'],
    ['www.escher-soehne.ch', 'Bankhaus Escher & Söhne', 'Zürich', 1854, 'Tradition verpflichtet', 'de'],
    ['www.dufresne.ch', 'Banque Dufresne & Cie', 'Genève', 1871, 'Banquiers privés à Genève', 'fr'],
    ['www.paradeplatz-bank.ch', 'Privatbank am Paradeplatz', 'Zürich', 1932, 'Persönlich. Diskret. Zentral.', 'de']
  ];
  W._rivals = {};
  RIVALS.forEach(function (r) {
    W._rivals[r[0]] = r;
    reg(r[0], {
      index: [{ p: '', t: r[1] + ' – ' + r[4], x: 'Privatbank in ' + r[2] + ', gegründet ' + r[3] + '. Vermögensverwaltung, Anlageberatung, Nachfolgeplanung.' }],
      page: function (path) {
        const col = ['#5a1a2a', '#1a3a5a', '#2a4a2a', '#4a3a1a', '#3a2a4a', '#1a4a4a', '#4a2a1a'][RIVALS.indexOf(r)];
        const nav = '<div class="rb-nav" style="background:' + col + '">' + a(r[0], '', 'Home') + a(r[0], 'services', 'Dienstleistungen') + a(r[0], 'karriere', 'Karriere') + a(r[0], 'kontakt', 'Kontakt') + '</div>';
        const shell = function (h) { return '<div class="w w-rb"><div class="rb-top" style="border-color:' + col + '"><b style="color:' + col + '">' + e(r[1]) + '</b><span>' + e(r[2]) + ' · seit ' + r[3] + '</span></div>' + nav + '<div class="rb-body">' + h + '</div><div class="rb-foot">© ' + year() + ' ' + e(r[1]) + '</div></div>'; };
        if (path === '') return { title: r[1], html: shell('<h1>' + e(r[4]) + '</h1><p>Seit ' + r[3] + ' betreuen wir private Vermögen mit Sorgfalt und Diskretion. Unsere Teilhaber haften mit ihrem eigenen Vermögen – das schafft Vertrauen.</p>' + (today() >= '2012-11-01' ? '<p><b>Unsere Strategie:</b> Wir betreuen ausschliesslich steuerkonforme Vermögen.</p>' : '')) };
        if (path === 'services') return { title: 'Dienstleistungen – ' + r[1], html: shell('<h2>Dienstleistungen</h2><ul><li>Vermögensverwaltung (Mandate ab CHF 1 Mio.)</li><li>Anlageberatung</li><li>Lombardkredite</li><li>Nachfolge- und Stiftungsplanung</li></ul>') };
        if (path === 'karriere') return { title: 'Karriere – ' + r[1], html: shell('<h2>Karriere</h2><p>Wir suchen erfahrene <b>Kundenberaterinnen und Kundenberater</b> mit eigenem Kundenstamm (Deutschland, Italien, Lateinamerika). Attraktive Konditionen.</p><p class="small muted">Bewerbungen mit Diskretion an die Personalabteilung.</p>') };
        if (path === 'kontakt') return { title: 'Kontakt – ' + r[1], html: shell('<h2>Kontakt</h2><p>' + e(r[1]) + '<br>' + e(r[2]) + '</p><p>Besuche nach Vereinbarung.</p>') };
        return null;
      }
    });
  });

  /* ================= Schneebericht ================= */
  reg('www.schneebericht.ch', {
    index: [{ p: '', t: 'Schneebericht Schweiz – Pisten, Lifte, Neuschnee', x: 'Aktueller Schneebericht für Laax, Davos, St. Moritz, Zermatt, Verbier, Engelberg.' }],
    page: function (path) {
      if (path !== '') return null;
      const m = +today().slice(5, 7), winter = m >= 12 || m <= 4;
      const rows = [['Laax', 2252], ['Davos Klosters', 2844], ['St. Moritz', 3057], ['Zermatt', 3883], ['Verbier', 3330], ['Engelberg-Titlis', 3020]].map(function (x) {
        const glacier = x[1] > 3300;
        const open = winter || glacier;
        const snow = open ? Math.round(40 + rnd(today() + x[0]) * (winter ? 180 : 60)) : 0;
        const fresh = open && rnd(x[0] + today() + 'n') > 0.6 ? Math.round(rnd(today() + x[0] + 'f') * 30) : 0;
        return '<tr><td>' + x[0] + '</td><td>' + x[1] + ' m</td><td class="num">' + (open ? snow + ' cm' : '–') + '</td><td class="num">' + (fresh ? fresh + ' cm' : '–') + '</td><td>' + (open ? '<span class="pos">offen</span>' : '<span class="muted">Saison beendet</span>') + '</td></tr>';
      }).join('');
      return { title: 'Schneebericht Schweiz', html: '<div class="w w-sb"><h1>❄ Schneebericht Schweiz</h1><p>Stand: ' + U.longDate(today()) + ', 07.30 Uhr</p><table class="ko-t"><tr><th>Gebiet</th><th>Höhe</th><th>Schnee</th><th>Neuschnee</th><th>Lifte</th></tr>' + rows + '</table></div>' };
    }
  });

  /* ================= Die Spielseite selbst ================= */
  reg('swissbanking.lilbeans.workers.dev', {
    index: [{ p: '', t: 'PBS/Web – a game about Swiss banking secrecy', x: 'Manage a Zurich private bank from 1998 to 2017. swissbanking.lilbeans.workers.dev' }],
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
