/* Intranet Vogt & Cie – Portal, Telefonbuch, Menüplan, Weisungen (statische Seiten ausserhalb von PBS/Web) */
(function (PBS) {
  'use strict';

  const G = PBS.Game, D = PBS.DATA, U = PBS.U, V = PBS.Views;
  const e = U.esc;

  // Ohne Spielstand gilt das heutige Datum des Arbeitsplatzes (2003)
  function today() { return G.state ? G.state.date : '2003-03-03'; }
  function seedOf(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }

  function frame(cur, title, body) {
    const nav = [['intranet', 'Home'], ['overview', 'PBS/Web (Banking)'], ['guide', 'Beginner\'s Guide'], ['phone', 'Telefonbuch'], ['menu', 'Menüplan'], ['rules', 'Weisungen'], ['', 'Formulare'], ['', 'Personalabteilung']];
    return '<div class="ix"><div class="ix-top"><div class="ix-logo"><svg class="crest" width="26" height="30"><use href="#crest"/></svg><span>VOGT &amp; CIE<small>INTRANET</small></span></div>' +
      '<div class="ix-date">' + U.longDate(today()) + '</div></div>' +
      '<div class="ix-body"><div class="ix-nav">' + nav.map(function (n) {
        if (!n[0]) return '<div class="ix-dead">' + n[1] + ' <img alt="" class="ix-uc"></div>';
        const href = n[0] === 'overview' ? '#/overview' : '#/x/' + n[0];
        return '<a href="' + href + '" class="' + (n[0] === cur ? 'on' : '') + '">» ' + n[1] + '</a>';
      }).join('') + '<div class="ix-box">Helpdesk<br><b>intern 4411</b></div></div>' +
      '<div class="ix-main"><h1>' + title + '</h1>' + body + '</div></div>' +
      '<div class="ix-foot">Webmaster: IT-Services · Last updated ' + U.fmtDate(U.addBusinessDays(today(), -3)) + ' · Best viewed with Internet Explorer 5.5 at 1024×768 · Visitors: <span class="ix-ctr">' + U.pad(4211 + (G.state ? G.state.dayNo * 7 : 0), 6) + '</span></div></div>';
  }

  V.intranet = function () {
    const s = G.state;
    const staff = s ? s.staff.filter(function (x) { return x.status === 'active'; }) : [];
    const longest = staff.slice().sort(function (a, b) { return a.hired < b.hired ? -1 : 1; })[0];
    const y = +today().slice(0, 4);
    const news = [
      ['IT-Services', 'Reminder: passwords must be changed every 90 days. Do not write your password on a post-it.'],
      ['Facility Management', 'The coffee machine on the 3rd floor has been replaced. Please do not put sugar in the milk container.'],
      ['Personalabteilung', 'The staff Christmas dinner ' + y + ' takes place on the second Friday of December in the guild house. Partners are welcome.'],
      longest ? ['Geschäftsleitung', 'Congratulations to ' + longest.name + ' on ' + (y - +longest.hired.slice(0, 4)) + ' years of service with Vogt & Cie.'] : null,
      ['Compliance', 'Client lists must not leave the building – not on paper, not on diskette, not on CD-ROM.']
    ].filter(Boolean);
    const ext = s ? s.news.slice(-3).reverse().map(function (n) { return U.fmtDate(n.d) + ' – ' + e(n.text); }).join(' +++ ') : 'Markets quiet ahead of the weekend';
    return {
      title: 'Intranet Vogt & Cie – Home', key: 'intranet',
      html: frame('intranet', 'Welcome to the Vogt &amp; Cie intranet',
        '<div class="ix-tick"><span>' + ext + '</span></div>' +
        '<table class="ix-t"><tr><td class="ix-c"><h2>Internal news</h2>' + news.map(function (n) { return '<p><b>' + e(n[0]) + ':</b> ' + e(n[1]) + '</p>'; }).join('') + '</td>' +
        '<td class="ix-c"><h2>Applications</h2><ul><li><a href="#/overview">PBS/Web – Private Banking System</a></li><li><a href="#/x/guide"><b>New here? Beginner\'s Guide</b></a></li><li><a href="#/x/phone">Telephone directory</a></li><li><a href="#/x/menu">Staff restaurant – weekly menu</a></li><li><a href="#/x/rules">Directives (Weisungen)</a></li><li class="ix-dead">Telekurs Investdata (Terminal Server)</li><li class="ix-dead">Lotus Notes Mail</li></ul>' +
        '<h2>Quote of the week</h2><p class="ix-q">"Discretion is the better part of banking."</p></td></tr></table>')
    };
  };

  V.guidePage = function () {
    return { title: 'Beginner\'s Guide – Intranet Vogt & Cie', key: 'guide', html: frame('guide', 'Beginner\'s Guide to PBS/Web', '<div class="hb">' + V.beginner(true) + '</div>') };
  };

  V.phonebook = function () {
    const s = G.state;
    const roleDept = { rm: 'Private Banking', comp: 'Legal & Compliance', ops: 'Operations', it: 'IT-Services', pm: 'Asset Management', teller: 'Cash desk (Kasse)', courier: 'Special services', fin: 'Finance & Controlling' };
    const list = (s ? s.staff.filter(function (x) { return x.status === 'active'; }) : D.STAFF).map(function (x, i) {
      return [x.name, roleDept[x.role] || '', x.title || D.ROLES[x.role].label, String(4420 + (seedOf(x.id) % 60)), x.role === 'teller' ? 'EG / Schalterhalle' : (2 + seedOf(x.name) % 3) + '.' + U.pad(seedOf(x.id + 'r') % 20 + 1, 2)];
    });
    const fixed = [[D.PARTNERS.senior, 'Geschäftsleitung', 'Senior Partner', '4401', '5.01'], [D.PARTNERS.second, 'Geschäftsleitung', 'Partner', '4402', '5.02'],
      [s ? s.meta.name : 'Managing Partner', 'Geschäftsleitung', 'Managing Partner', '4403', '5.03'], ['Reception', 'Empfang', '', '4400', 'EG'], ['Helpdesk', 'IT-Services', 'Hotline', '4411', 'UG'], ['Security / Portier', 'Facility Management', '', '4499', 'EG'], ['Staff restaurant', 'Personalrestaurant', '', '4470', '4.OG']];
    const rows = fixed.concat(list).sort(function (a, b) { return a[3] < b[3] ? -1 : 1; });
    return {
      title: 'Telefonbuch – Intranet Vogt & Cie', key: 'phone',
      html: frame('phone', 'Telefonbuch – internal telephone directory',
        '<p>Internal numbers: dial the four digits. External line: 0 + number. Switchboard +41 1 218 44 00.</p>' +
        '<table class="ix-grid"><tr><th>Name</th><th>Department</th><th>Function</th><th>Ext.</th><th>Room</th></tr>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + e(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>')
    };
  };

  const MAIN = ['Zürcher Geschnetzeltes with Rösti', 'Älplermagronen with apple sauce', 'Veal sausage with onion sauce and chips', 'Fischknusperli with tartare sauce', 'Riz Casimir', 'Ghackets mit Hörnli', 'Cordon bleu with chips', 'Pastetli with peas and carrots', 'Meat loaf with mashed potatoes', 'Berner Platte', 'Chicken curry with rice', 'Spaghetti bolognese', 'Pork steak with herb butter and noodles', 'Capuns with mountain cheese'];
  const VEG = ['Cheese tart (Käsewähe) with salad', 'Vegetable strudel with herb sauce', 'Gschwellti with assorted cheeses', 'Spinach gnocchi with sage butter', 'Risotto with porcini', 'Rösti with fried egg', 'Ravioli with tomato sauce', 'Vegetable lasagne'];
  const SOUP = ['Bündner barley soup', 'Tomato soup', 'Minestrone', 'Bouillon with pancake strips', 'Pumpkin soup', 'Cream of vegetable soup', 'Leek soup'];
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
      title: 'Menüplan – Intranet Vogt & Cie', key: 'menu',
      html: frame('menu', 'Personalrestaurant "Zum Tresor" – weekly menu',
        '<p>4th floor · lunch 11:30–13:30 · salad buffet CHF 2.20 per 100 g · coffee CHF 1.20 with staff card.</p>' +
        '<table class="ix-grid"><tr><th>Day</th><th>Soup</th><th>Menu 1</th><th>Menu 2 (vegetarian)</th></tr>' + days + '</table>' +
        '<p class="ix-small">Partners\' lunches are served in the Kaminzimmer on request (ext. 4470). The kitchen team wishes you a good appetite!</p>')
    };
  };

  const RULES = [
    ['1998/04', '1998-04-01', 'Money Laundering Act (GwG)', 'Identification of the beneficial owner on Form A for all new relationships. Suspicions are reported to the Money Laundering Reporting Office (MROS) by Compliance only.'],
    ['1999/01', '1998-12-15', 'Introduction of the euro', 'DEM, FRF and ITL accounts are converted at the official parities on 4 January 1999. Clients are informed by hold mail.'],
    ['2001/03', '2001-01-01', 'Qualified Intermediary agreement (US)', 'US persons holding US securities must sign a W-9 or sell their US securities. No US securities in undocumented accounts.'],
    ['2003/07', '2003-07-01', 'Ordinance of the regulator on money laundering', 'Relationships with politically exposed persons require approval by the management. Transaction monitoring is mandatory.'],
    ['2005/03', '2005-06-01', 'EU savings tax', 'Interest payments to EU residents are subject to a retention tax from 1 July 2005. Payments to companies are not covered.'],
    ['2008/09', '2008-11-01', 'Travel by employees', 'Relationship managers do not travel to the United States to meet clients. Laptops taken abroad must not contain client data.'],
    ['2009/02', '2009-03-13', 'Tax matters', 'In accordance with the Federal Council decision, the bank will in future also grant administrative assistance in cases of tax evasion under revised treaties.'],
    ['2012/11', '2012-11-01', 'Tax compliance of clients (Weissgeldstrategie)', 'New money is only accepted with a confirmation of tax compliance. Existing clients are asked to regularise their situation.'],
    ['2015/01', '2015-01-15', 'Negative interest rates', 'Following the decision of the Swiss National Bank, large CHF balances may be charged negative interest after consultation with the client.'],
    ['2016/12', '2016-12-01', 'Automatic exchange of information', 'From 1 January 2017 account data of clients resident in partner states is collected and transmitted to the tax authorities.']
  ];
  V.rules = function () {
    const d = today();
    const list = RULES.filter(function (r) { return r[1] <= d; }).reverse();
    return {
      title: 'Weisungen – Intranet Vogt & Cie', key: 'rules',
      html: frame('rules', 'Directives of the management (Weisungen)',
        '<p>Binding for all employees. Questions to Legal &amp; Compliance (ext. 4430).</p>' +
        list.map(function (r) { return '<div class="ix-rule"><b>Weisung ' + r[0] + ' – ' + e(r[2]) + '</b> <span class="ix-small">(in force since ' + U.fmtDate(r[1]) + ')</span><br>' + e(r[3]) + '</div>'; }).join('') +
        '<p class="ix-small">Archive of older directives: Legal &amp; Compliance, 3rd floor, cabinet 4.</p>')
    };
  };
})(window.PBS);
