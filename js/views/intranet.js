/* Intranet Vogt & Cie – Portal, Telefonbuch, Menüplan, Weisungen (statische Seiten ausserhalb von PBS/Web) */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, V = PBS.Views;
  const e = U.esc;
  const t = PBS.L.t;

  // Ohne Spielstand gilt das heutige Datum des Arbeitsplatzes (2003)
  function today() { return G.state ? G.state.date : '2003-03-03'; }
  function seedOf(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }

  function frame(cur, title, body) {
    const nav = [['intranet', 'Home'], ['overview', 'PBS/Web (Banking)'], ['guide', 'Beginner\'s Guide'], ['phone', t('Telefonbuch', 'Phone book')], ['menu', t('Menüplan', 'Canteen menu')], ['rules', t('Weisungen', 'Directives')], ['', t('Formulare', 'Forms')], ['', t('Personalabteilung', 'Human Resources')]];
    return '<div class="ix"><div class="ix-top"><div class="ix-logo"><svg class="crest" width="26" height="30"><use href="#crest"/></svg><span>VOGT &amp; CIE<small>INTRANET</small></span></div>' +
      '<div class="ix-date">' + U.longDate(today()) + '</div></div>' +
      '<div class="ix-body"><div class="ix-nav">' + nav.map(function (n) {
        if (!n[0]) return '<div class="ix-dead">' + n[1] + ' <img alt="" class="ix-uc"></div>';
        const href = n[0] === 'overview' ? '#/overview' : '#/x/' + n[0];
        return '<a href="' + href + '" class="' + (n[0] === cur ? 'on' : '') + '">» ' + n[1] + '</a>';
      }).join('') + '<div class="ix-box">Helpdesk<br><b>' + t('intern 4411', 'ext. 4411') + '</b></div></div>' +
      '<div class="ix-main"><h1>' + title + '</h1>' + body + '</div></div>' +
      '<div class="ix-foot">Webmaster: IT-Services · Last updated ' + U.fmtDate(U.addBusinessDays(today(), -3)) + ' · Best viewed with Internet Explorer 5.5 at 1024×768 · Visitors: <span class="ix-ctr">' + U.pad(4211 + (G.state ? G.state.dayNo * 7 : 0), 6) + '</span></div></div>';
  }

  V.intranet = function () {
    const s = G.state;
    const staff = s ? s.staff.filter(function (x) { return x.status === 'active'; }) : [];
    const longest = staff.slice().sort(function (a, b) { return a.hired < b.hired ? -1 : 1; })[0];
    const y = +today().slice(0, 4);
    const news = [
      ['IT-Services', 'Passwords must be changed every 90 days. Please do not stick your password to the monitor.'],
      ['Facility Management', 'The coffee machine on the 3rd floor has been replaced. We kindly ask you not to put sugar in the milk container.'],
      [t('Personalabteilung', 'Human Resources'), 'The staff Christmas dinner ' + y + ' will take place on the second Friday of December at the ' + t('Zunfthaus', 'guild hall') + '. Spouses and partners are welcome.'],
      longest ? [t('Geschäftsleitung', 'Executive Board'), 'Congratulations to ' + longest.name + ' on ' + (y - +longest.hired.slice(0, 4)) + ' years of service with Vogt & Cie.'] : null,
      ['Compliance', 'Reminder: client lists may not leave the building in any form (paper, diskette or CD-ROM).']
    ].filter(Boolean);
    const ext = s ? s.news.slice(-3).reverse().map(function (n) { return U.fmtDate(n.d) + ' – ' + e(n.text); }).join(' +++ ') : 'Markets quiet ahead of the weekend';
    return {
      title: 'Intranet Vogt & Cie – Home', key: 'intranet',
      html: frame('intranet', 'Welcome to the Vogt &amp; Cie intranet',
        '<div class="ix-tick"><span>' + ext + '</span></div>' +
        '<table class="ix-t"><tr><td class="ix-c"><h2>Internal news</h2>' + news.map(function (n) { return '<p><b>' + e(n[0]) + ':</b> ' + e(n[1]) + '</p>'; }).join('') + '</td>' +
        '<td class="ix-c"><h2>Applications</h2><ul><li><a href="#/overview">PBS/Web – Private Banking System</a></li><li><a href="#/x/guide"><b>New here? Beginner\'s Guide</b></a></li><li><a href="#/x/phone">Telephone directory</a></li><li><a href="#/x/menu">Staff restaurant, weekly menu</a></li><li><a href="#/x/rules">' + t('Directives (Weisungen)', 'Directives') + '</a></li><li class="ix-dead">Telekurs Investdata (Terminal Server)</li><li class="ix-dead">Lotus Notes Mail</li></ul>' +
        '<h2>Quote of the week</h2><p class="ix-q">"A banker is a fellow who lends you his umbrella when the sun is shining, but wants it back the minute it begins to rain." (Mark Twain)</p></td></tr></table>')
    };
  };

  V.guidePage = function () {
    return { title: 'Beginner\'s Guide – Intranet Vogt & Cie', key: 'guide', html: frame('guide', 'Beginner\'s Guide to PBS/Web', '<div class="hb">' + V.beginner(true) + '</div>') };
  };

  V.phonebook = function () {
    const s = G.state;
    const roleDept = { rm: 'Private Banking', comp: 'Legal & Compliance', ops: 'Operations', it: 'IT-Services', pm: 'Asset Management', teller: t('Cash desk (Kasse)', 'Cash desk'), courier: 'Special services', fin: 'Finance & Controlling' };
    const list = (s ? s.staff.filter(function (x) { return x.status === 'active'; }) : D.STAFF).map(function (x, i) {
      return [x.name, roleDept[x.role] || '', x.title || D.ROLES[x.role].label, String(4420 + (seedOf(x.id) % 60)), x.role === 'teller' ? t('EG / Schalterhalle', 'GF / Banking hall') : (2 + seedOf(x.name) % 3) + '.' + U.pad(seedOf(x.id + 'r') % 20 + 1, 2)];
    });
    const GL = t('Geschäftsleitung', 'Executive Board'), EG = t('EG', 'GF');
    const fixed = [[D.PARTNERS.senior, GL, 'Senior Partner', '4401', '5.01'], [D.PARTNERS.second, GL, 'Partner', '4402', '5.02'],
      [s ? s.meta.name : 'Managing Partner', GL, 'Managing Partner', '4403', '5.03'], ['Reception', t('Empfang', 'Front desk'), '', '4400', EG], ['Helpdesk', 'IT-Services', 'Hotline', '4411', t('UG', 'Basement')], [t('Security / Portier', 'Security / Doorman'), 'Facility Management', '', '4499', EG], ['Staff restaurant', t('Personalrestaurant', 'Staff restaurant'), '', '4470', t('4.OG', '4th floor')]];
    const rows = fixed.concat(list).sort(function (a, b) { return a[3] < b[3] ? -1 : 1; });
    return {
      title: t('Telefonbuch', 'Phone book') + ' – Intranet Vogt & Cie', key: 'phone',
      html: frame('phone', t('Telefonbuch (internal directory)', 'Internal telephone directory'),
        '<p>Internal calls: dial the four-digit extension. Outside line: 0, then the number. Switchboard +41 1 218 44 00.</p>' +
        '<table class="ix-grid"><tr><th>Name</th><th>Department</th><th>Function</th><th>Ext.</th><th>Room</th></tr>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + e(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>')
    };
  };

  const MAIN = [t('Zürcher Geschnetzeltes with Rösti', 'Zürcher Geschnetzeltes (veal in cream sauce) with rösti'), t('Älplermagronen with apple sauce', 'Älplermagronen (alpine macaroni cheese) with apple sauce'), 'Veal sausage with onion sauce and chips', t('Fischknusperli with tartare sauce', 'Fried fish bites with tartare sauce'), t('Riz Casimir', 'Riz Casimir (curried veal with rice and fruit)'), t('Ghackets mit Hörnli', 'Minced beef with macaroni (Ghackets mit Hörnli)'), 'Cordon bleu with chips', t('Pastetli with peas and carrots', 'Vol-au-vent with peas and carrots'), 'Meat loaf with mashed potatoes', t('Berner Platte', 'Berner Platte (bacon, sausages, sauerkraut)'), 'Chicken curry with rice', 'Spaghetti bolognese', 'Pork steak with herb butter and noodles', t('Capuns with mountain cheese', 'Capuns (chard parcels) with mountain cheese')];
  const VEG = [t('Cheese tart (Käsewähe) with salad', 'Cheese tart with salad'), 'Vegetable strudel with herb sauce', t('Gschwellti with assorted cheeses', 'Jacket potatoes with assorted cheeses'), 'Spinach gnocchi with sage butter', 'Risotto with porcini', 'Rösti with fried egg', 'Ravioli with tomato sauce', 'Vegetable lasagne'];
  const SOUP = [t('Bündner barley soup', 'Grisons barley soup'), 'Tomato soup', 'Minestrone', t('Bouillon with Flädli', 'Bouillon with pancake strips'), 'Pumpkin soup', 'Cream of vegetable soup', 'Leek soup'];
  V.canteen = function () {
    const d = today();
    let mon = d;
    while (U.weekday(mon) !== 'Mon' && U.weekday(mon) !== 'Mo') mon = U.addDays(mon, -1);
    const seed = seedOf(mon);
    const days = [0, 1, 2, 3, 4].map(function (i) {
      const day = U.addDays(mon, i);
      const k = seed + i * 7;
      return '<tr class="' + (day === d ? 'ix-today' : '') + '"><td><b>' + U.weekday(day) + '</b><br>' + U.fmtDate(day) + '</td><td>' + SOUP[k % SOUP.length] + '</td><td>' + (i === 4 ? 'Fish of the day' : MAIN[(k * 3) % MAIN.length]) + '<br><span class="ix-p">CHF 11.50</span></td><td>' + VEG[(k * 5) % VEG.length] + '<br><span class="ix-p">CHF 10.00</span></td></tr>';
    }).join('');
    return {
      title: t('Menüplan', 'Canteen menu') + ' – Intranet Vogt & Cie', key: 'menu',
      html: frame('menu', t('Personalrestaurant', 'Staff restaurant') + ' "Zum Tresor": weekly menu',
        '<p>4th floor · lunch 11:30–13:30 · salad buffet CHF 2.20 per 100 g · coffee CHF 1.20 with staff card.</p>' +
        '<table class="ix-grid"><tr><th>Day</th><th>Soup</th><th>Menu 1</th><th>Menu 2 (vegetarian)</th></tr>' + days + '</table>' +
        '<p class="ix-small">Lunch for the partners can be served in the ' + t('Kaminzimmer', 'fireplace room') + ' on request (ext. 4470). ' + t('En Guete!', 'Enjoy your meal.') + ' Your kitchen team</p>')
    };
  };

  const RULES = [
    ['1998/04', '1998-04-01', 'Money Laundering Act (GwG)', 'For all new relationships the beneficial owner is to be identified on Form A. Reports to the Money Laundering Reporting Office (MROS) are made by Compliance only.'],
    ['1999/01', '1998-12-15', 'Introduction of the euro', 'DEM, FRF and ITL accounts will be converted at the official parities on 4 January 1999. Clients are to be informed via hold mail.'],
    ['2001/03', '2001-01-01', 'Qualified Intermediary agreement (US)', 'US persons holding US securities must either sign a Form W-9 or sell these securities. Undocumented accounts may not hold US securities.'],
    ['2003/07', '2003-07-01', 'EBK Money Laundering Ordinance', 'Relationships with politically exposed persons require the approval of the management. Transactions are to be monitored systematically.'],
    ['2005/03', '2005-06-01', 'EU savings tax', 'From 1 July 2005, interest paid to EU residents is subject to a retention tax. Payments to companies are not covered.'],
    ['2008/09', '2008-11-01', 'Travel by employees', 'With immediate effect, relationship managers will not travel to the United States to meet clients. Laptops taken abroad may not contain any client data.'],
    ['2009/02', '2009-03-13', 'Tax matters', 'Following the decision of the Federal Council of 13 March 2009, administrative assistance will also be granted in cases of tax evasion where a revised treaty is in force.'],
    ['2012/11', '2012-11-01', t('Tax compliance of clients (Weissgeldstrategie)', 'Tax compliance of clients ("clean money" strategy)'), 'New money is accepted only against written confirmation of tax compliance. Existing clients are to be asked to regularise their situation.'],
    ['2015/01', '2015-01-15', 'Negative interest rates', 'Following the decision of the Swiss National Bank, negative interest may be charged on large CHF balances after consultation with the client.'],
    ['2016/12', '2016-12-01', 'Automatic exchange of information', 'From 1 January 2017, account data of clients resident in partner states will be collected and reported to the tax authorities.']
  ];
  V.rules = function () {
    const d = today();
    const list = RULES.filter(function (r) { return r[1] <= d; }).reverse();
    return {
      title: t('Weisungen', 'Directives') + ' – Intranet Vogt & Cie', key: 'rules',
      html: frame('rules', t('Directives of the management (Weisungen)', 'Directives of the management'),
        '<p>Binding on all employees. Questions to Legal &amp; Compliance, ext. 4430.</p>' +
        list.map(function (r) { return '<div class="ix-rule"><b>' + t('Weisung ', 'Directive ') + r[0] + ' – ' + e(r[2]) + '</b> <span class="ix-small">(in force since ' + U.fmtDate(r[1]) + ')</span><br>' + e(r[3]) + '</div>'; }).join('') +
        '<p class="ix-small">Archive of older directives: Legal &amp; Compliance, 3rd floor, cabinet 4.</p>')
    };
  };
})(window.PBS);
