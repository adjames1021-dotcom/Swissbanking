/* PBS/Web – Daten der modernen Epoche 2018–2025: Szenarien, Kunden, Mitarbeitende, Gesellschaften
   (erste Fassung; Marktdaten, Coins und Zeitgeschehen folgen) */
(function (PBS) {
  'use strict';

  const D = PBS.DATA;
  const t = PBS.L.t;
  function n(d, who, text) { return [d, who, text]; }

  D.COINS = D.COINS || [];

  /* ---------- Länder und Banken, die erst in der modernen Epoche gebraucht werden ---------- */
  Object.assign(D.COUNTRIES, {
    TR: { n: 'Turkey', ccy: 'USD' },
    CN: { n: 'China', ccy: 'USD' },
    MY: { n: 'Malaysia', ccy: 'USD' },
    IL: { n: 'Israel', ccy: 'USD' },
    UA: { n: 'Ukraine', ccy: 'USD' },
    ES: { n: 'Spain', ccy: 'EUR', legacy: 'DEM', eu: true },
    KR: { n: 'South Korea', ccy: 'USD' }
  });

  /* ---------- Mitarbeitende 2018–2025 ---------- */
  const STAFF = [
    { id: 'M01', name: 'Dr. Reto Sprecher', role: 'rm', title: 'Managing director, desk CIS, Middle East & Turkey', desk: ['RU', 'KZ', 'UA', 'TR', 'AE', 'LB', 'CY', 'IL'], skill: 4, integrity: 2, morale: 63, salary: 340000, hired: '1997-06-01' },
    { id: 'M02', name: 'Nadja Brändli', role: 'rm', title: 'Director, desk Switzerland & digital assets', desk: ['CH', 'LI', 'SE', 'KR'], skill: 4, integrity: 3, morale: 74, salary: 255000, hired: '2016-03-01' },
    { id: 'M03', name: 'Claudio Moretti', role: 'rm', title: 'Director, desk Europe', desk: ['IT', 'DE', 'AT', 'FR', 'NL', 'GB', 'GR', 'ES'], skill: 4, integrity: 3, morale: 60, salary: 265000, hired: '1994-09-01' },
    { id: 'M04', name: 'Mei-Lin Tschopp', role: 'rm', title: 'Vice director, desk Asia', desk: ['CN', 'HK', 'MY', 'SG'], skill: 3, integrity: 3, morale: 70, salary: 220000, hired: '2015-09-01' },
    { id: 'M05', name: 'Felipe Arango Steiner', role: 'rm', title: 'Vice director, desk Americas', desk: ['US', 'BR', 'VE', 'AR', 'PA'], skill: 3, integrity: 3, morale: 66, salary: 215000, hired: '2012-02-01' },
    { id: 'M06', name: 'Dr. Katharina Imhof', role: 'comp', title: 'Head Legal & Compliance', skill: 4, integrity: 5, morale: 68, salary: 260000, hired: '2014-01-06' },
    { id: 'M07', name: 'Jonas Rüegg', role: 'comp', title: 'Compliance officer, digital assets', skill: 3, integrity: 4, morale: 71, salary: 150000, hired: '2017-11-01' },
    { id: 'M08', name: 'Leandra Fässler', role: 'comp', title: 'Analyst, blockchain analytics', skill: 3, integrity: 4, morale: 75, salary: 125000, hired: '2020-09-01' },
    { id: 'M09', name: 'Marco Brunner', role: 'comp', title: 'Compliance officer, sanctions & AML', skill: 3, integrity: 4, morale: 58, salary: 145000, hired: '1997-03-01' },
    { id: 'M10', name: 'Sandra Baumann', role: 'ops', title: 'Head Operations', skill: 4, integrity: 4, morale: 64, salary: 150000, hired: '1993-10-01' },
    { id: 'M11', name: 'Dario Pfister', role: 'ops', title: 'Payments & custody operations', skill: 3, integrity: 3, morale: 62, salary: 98000, hired: '2016-08-01' },
    { id: 'M12', name: 'Patrick Studer', role: 'it', title: 'Head IT & Information Security', skill: 4, integrity: 2, morale: 55, salary: 195000, hired: '1995-07-01' },
    { id: 'M13', name: 'Aylin Demir', role: 'it', title: 'Security engineer (key management, custody)', skill: 4, integrity: 4, morale: 70, salary: 160000, hired: '2017-06-01' },
    { id: 'M14', name: 'Dr. Martin Frei', role: 'pm', title: 'Chief Investment Officer', skill: 4, integrity: 4, morale: 62, salary: 280000, hired: '1992-11-01' },
    { id: 'M15', name: 'Simon Kälin', role: 'pm', title: 'Trader, equities & digital assets', skill: 3, integrity: 3, morale: 72, salary: 175000, hired: '2017-08-01' },
    { id: 'M16', name: 'Monika Egli', role: 'teller', title: 'Client services & cash desk', skill: 3, integrity: 4, morale: 66, salary: 92000, hired: '2009-05-01' },
    { id: 'M17', name: 'Beatrice Lüthi', role: 'fin', title: 'Chief Financial Officer', skill: 4, integrity: 5, morale: 64, salary: 210000, hired: '1988-06-01' }
  ];

  /* ---------- Strukturen ---------- */
  Object.assign(D.JURIS, {
    AE_FZ: { c: 'AE', kind: 'company', label: 'UAE – free zone company (DMCC)', form: 'Free zone company', suffix: 'DMCC', agent: 'Al Seef Corporate Services LLC, Dubai', setup: 16000, annual: 9000, shield: 0.5 },
    US_LLC: { c: 'US', kind: 'company', label: 'Delaware – limited liability company', form: 'Limited liability company', suffix: 'LLC', agent: 'Brandywine Registered Agents Inc., Wilmington', setup: 4500, annual: 2500, shield: 0.55 },
    KY_F: { c: 'KY', kind: 'company', label: 'Cayman Islands – exempted fund (SPC)', form: 'Segregated portfolio company', suffix: 'SPC', agent: 'Seven Mile Fiduciary Ltd., George Town', setup: 45000, annual: 30000, shield: 0.4 }
  });

  const ENTITIES = [
    { id: 'EM01', name: 'Aletsch Treasury Stiftung', jur: 'LI_S', inc: '2017-10-02', bo: '102.104' },
    { id: 'EM02', name: 'Taiga Familienstiftung', jur: 'LI_S', inc: '2009-04-15', bo: '102.131' },
    { id: 'EM03', name: 'Kolyma Ventures Ltd.', jur: 'VG', inc: '2012-11-08', bo: '102.131' },
    { id: 'EM04', name: 'Steppe Horizon Ltd.', jur: 'VG', inc: '2014-06-20', bo: '102.142' },
    { id: 'EM05', name: 'Pearl Gate Holdings DMCC', jur: 'AE_FZ', inc: '2011-03-01', bo: '102.156' },
    { id: 'EM06', name: 'Jade Harbour Holdings Ltd.', jur: 'VG', inc: '2015-09-14', bo: '102.177' },
    { id: 'EM07', name: 'Cerrado Overseas S.A.', jur: 'PA', inc: '2008-02-11', bo: '102.185' },
    { id: 'EM08', name: 'Brightwater Global Ltd.', jur: 'VG', inc: '2011-01-19', bo: '102.193' },
    { id: 'EM09', name: 'Coral Bay Ventures Ltd.', jur: 'VG', inc: '2013-05-27', bo: '102.208' },
    { id: 'EM10', name: 'Black Soil Holdings Ltd.', jur: 'VG', inc: '2010-08-03', bo: '102.214' },
    { id: 'EM11', name: 'Morichal Trading S.A.', jur: 'PA', inc: '2009-10-22', bo: '102.247' },
    { id: 'EM12', name: 'Lone Oak Digital LLC', jur: 'US_LLC', inc: '2016-02-09', bo: '102.262' },
    { id: 'EM13', name: 'Hangang Digital Opportunities SPC', jur: 'KY_F', inc: '2019-07-01', bo: '102.281' },
    { id: 'EM14', name: 'Vardar Capital Anstalt', jur: 'LI_A', inc: '2016-05-17', bo: '102.163' }
  ];

  /* ---------- Kunden 2018–2025 ----------
     accounts: [Typ, Währung (auch Coins), Saldo, Inhaber-Sitzgesellschaft, Strategie]; Coins als 'CUR' */
  const CLIENTS = [
    {
      id: '102.104', rubrik: 'PYRIT', name: 'Lukas Zehnder', nat: 'CH', dom: 'CH', city: 'Baar ZG',
      born: '1987-05-14', occ: 'Co-founder, Aletsch Protocol Foundation (Zug)',
      sow: 'Founder tokens and treasury share of the Aletsch Protocol token sale (September 2017, paid in ether)', wealth: 60e6, declared: 0.6,
      risk: 'Increased', formA: '2017-11-20', holdMail: false, since: '2017-11-20', rm: 'M02', fee: 0.009, loyalty: 58,
      traits: ['greedy', 'demanding'], family: { spouse: '', children: [] },
      accounts: [['CUR', 'CHF', 2400000], ['CUR', 'ETH', 18500], ['CUR', 'BTC', 120], ['CUR', 'ETH', 42000, 'EM01'], ['CUR', 'USD', 6800000, 'EM01'], ['DEP', 'CHF', 3000000, null, 'growth']],
      notes: [n('2017-11-20', 'Nadja Brändli', 'Account opening. Client converted part of the foundation\'s ETH via an OTC desk in Zug; we received the francs, he keeps the coins with us. Token sale documents and FINMA no-action correspondence on file. Two other banks had refused him.'),
        n('2017-12-18', 'Jonas Rüegg', 'Wallet screening of the incoming ETH: funds trace back to the token sale contract. Roughly 3% passed through an exchange without KYC before reaching the sale. Accepted with file note.')]
    },
    {
      id: '102.117', rubrik: 'OBSIDIAN', name: 'Mattias Sjöberg', nat: 'SE', dom: 'CH', city: 'Zug',
      born: '1983-09-02', occ: 'Private investor; mined bitcoin 2010–2013', sow: 'Bitcoin mined with own hardware (2010–2013); sales on Mt. Gox and Bitstamp',
      wealth: 35e6, declared: 0.2, risk: 'Increased', formA: '2017-06-12', holdMail: false, since: '2017-06-12', rm: 'M02', fee: 0.010, loyalty: 62,
      traits: ['secretive'], family: { spouse: 'Elin (1986)', children: ['Vera (2016)'] },
      accounts: [['CUR', 'BTC', 2150], ['CUR', 'CHF', 640000], ['CUR', 'LTC', 9000]],
      notes: [n('2017-06-12', 'Nadja Brändli', 'Moved from Stockholm to Zug last year. Source of funds: mining logs from 2010–2013 and electricity bills from a flat in Västerås. No tax return in Sweden ever mentioned the coins. Client says the Swedish years are "closed".'),
        n('2017-12-12', 'Jonas Rüegg', 'Client\'s coins never touched an exchange since 2013. Clean in the analytics tool, which says little about where they came from in the first place.')]
    },
    {
      id: '102.131', rubrik: 'MALACHIT', name: 'Gennadi A. Sarkisov', nat: 'RU', dom: 'RU', city: 'Moscow',
      born: '1958-02-21', occ: 'Main shareholder, Siberian nickel and copper producer', sow: 'Dividends; privatisation of mining assets (1995–1997)',
      wealth: 420e6, declared: 0.3, risk: 'Increased', formA: '2009-04-20', holdMail: true, since: '2009-04-20', rm: 'M01', fee: 0.012, loyalty: 66,
      traits: ['demanding', 'secretive'], family: { spouse: 'Larissa (1964)', children: ['Kirill (1988)', 'Anastasia (1993)'] },
      accounts: [['CUR', 'USD', 38000000, 'EM02'], ['DEP', 'CHF', 64000000, 'EM02', 'balanced'], ['MET', 'XAU', 12000, 'EM02'], ['CUR', 'EUR', 9500000, 'EM03'], ['CUR', 'CHF', 2200000]],
      notes: [n('2017-10-04', 'Dr. Reto Sprecher', 'Family office in Limassol now manages the relationship day to day. Daughter Anastasia (London) to receive power of attorney over the foundation account.'),
        n('2018-01-02', 'Dr. Katharina Imhof', 'Name not on any sanctions list. Company is a supplier to the Russian defence industry according to press reports; enhanced monitoring stays in place.')]
    },
    {
      id: '102.142', rubrik: 'TURMALIN', name: 'Daniyar Seitkali', nat: 'KZ', dom: 'GB', city: 'London',
      born: '1990-07-30', occ: 'Investor; son of a deputy chairman of the state energy holding', sow: 'Gifts from father; real estate in London and Dubai',
      wealth: 70e6, declared: 0.1, risk: 'PEP', formA: '2014-07-01', holdMail: true, since: '2014-07-01', rm: 'M01', fee: 0.018, loyalty: 60,
      traits: ['greedy'], family: { spouse: '', children: [] },
      accounts: [['CUR', 'USD', 21000000, 'EM04'], ['DEP', 'CHF', 18000000, 'EM04', 'growth'], ['CUR', 'GBP', 900000]],
      notes: [n('2016-11-03', 'Dr. Reto Sprecher', 'Client bought a house in Belgravia through the BVI company. Father visited Zurich in person, said very little.'),
        n('2017-09-25', 'Dr. Katharina Imhof', 'PEP review: wealth explained by "gifts" without documents. Board approval renewed with conditions (annual review, no cash).')]
    },
    {
      id: '102.156', rubrik: 'AZURIT', name: 'Omar Al Mansouri', nat: 'AE', dom: 'AE', city: 'Dubai',
      born: '1966-12-10', occ: 'Chairman, family group (real estate, car dealerships, trading)', sow: 'Family business income; real estate',
      wealth: 180e6, declared: 1, risk: 'Normal', formA: '2011-03-15', holdMail: false, since: '2011-03-15', rm: 'M01', fee: 0.010, loyalty: 76,
      traits: ['loyal', 'demanding'], family: { spouse: 'Mariam (1971)', children: ['Saeed (1994)', 'Hessa (1997)', 'Rashid (2001)'] },
      accounts: [['CUR', 'USD', 26000000, 'EM05'], ['DEP', 'CHF', 41000000, 'EM05', 'balanced'], ['MET', 'XAU', 4500], ['CUR', 'CHF', 3100000]],
      notes: [n('2017-05-08', 'Dr. Reto Sprecher', 'Annual meeting at the client\'s office in Business Bay. Wants more private equity and a lombard line for a hotel project in Montenegro.')]
    },
    {
      id: '102.163', rubrik: 'FLUORIT', name: 'Murat Kaplanoğlu', nat: 'TR', dom: 'TR', city: 'Istanbul',
      born: '1961-03-27', occ: 'Chairman, construction and energy group', sow: 'Business income; state infrastructure contracts',
      wealth: 95e6, declared: 0.2, risk: 'Increased', formA: '2016-05-20', holdMail: true, since: '2016-05-20', rm: 'M01', fee: 0.014, loyalty: 64,
      traits: ['nervous', 'secretive'], family: { spouse: 'Ayşe (1965)', children: ['Emre (1989)', 'Zeynep (1992)'] },
      accounts: [['CUR', 'USD', 14000000, 'EM14'], ['CUR', 'EUR', 6500000, 'EM14'], ['MET', 'XAU', 6000, 'EM14'], ['DEP', 'CHF', 9000000, null, 'income']],
      notes: [n('2016-08-02', 'Dr. Reto Sprecher', 'After the coup attempt client moved a further USD 8 million out of Turkey. Wants gold, not paper.'),
        n('2017-11-30', 'Dr. Katharina Imhof', 'Group won three motorway and airport contracts in 2016–2017. Press in Istanbul links the awards to party donations. No proceedings known.')]
    },
    {
      id: '102.177', rubrik: 'QUARZ', name: 'Zhou Wenbo', nat: 'CN', dom: 'CN', city: 'Shenzhen',
      born: '1975-10-08', occ: 'Founder and chairman, smart-device maker (listed in Hong Kong)', sow: 'Sale of shares after the Hong Kong listing (2016)',
      wealth: 260e6, declared: 0, risk: 'Normal', formA: '2015-10-05', holdMail: true, since: '2015-10-05', rm: 'M04', fee: 0.011, loyalty: 68,
      traits: ['secretive'], family: { spouse: 'Liu Fang (1978)', children: ['Zhou Yiming (2004)'] },
      accounts: [['CUR', 'USD', 47000000, 'EM06'], ['DEP', 'CHF', 52000000, 'EM06', 'growth'], ['CUR', 'CHF', 1500000]],
      notes: [n('2017-03-14', 'Mei-Lin Tschopp', 'Funds arrive from Hong Kong only. Client asks us never to call his mainland number and never to send anything to Shenzhen. Son to start boarding school near Montreux in 2019.')]
    },
    {
      id: '102.185', rubrik: 'ZINNOBER', name: 'Rodrigo Teixeira Campos', nat: 'BR', dom: 'BR', city: 'São Paulo',
      born: '1955-06-18', occ: 'Former director, family construction company', sow: 'Dividends from the family construction company; sale of shares (2014)',
      wealth: 48e6, declared: 0, risk: 'Increased', formA: '2008-02-20', holdMail: true, since: '2008-02-20', rm: 'M05', fee: 0.015, loyalty: 55,
      traits: ['nervous'], family: { spouse: 'Beatriz (1959)', children: ['Pedro (1984)', 'Luciana (1987)'] },
      accounts: [['CUR', 'USD', 16500000, 'EM07'], ['DEP', 'CHF', 12000000, 'EM07', 'balanced']],
      notes: [n('2015-04-10', 'Dr. Iris Wyss', 'Family company named in the Lava Jato investigation (Petrobras contracts). Client himself not charged. No new money accepted until further notice.'),
        n('2017-08-21', 'Felipe Arango Steiner', 'Client asked whether he can move the Panama company\'s assets to Uruguay "before Curitiba asks the Swiss". Declined to discuss.')]
    },
    {
      id: '102.193', rubrik: 'SERPENTIN', name: 'Tan Kok Weng', nat: 'MY', dom: 'MY', city: 'Kuala Lumpur',
      born: '1972-01-23', occ: 'Partner, corporate advisory boutique', sow: 'Advisory fees from bond and energy transactions (2010–2014)',
      wealth: 38e6, declared: 0, risk: 'Increased', formA: '2016-06-27', holdMail: true, since: '2016-06-27', rm: 'M04', fee: 0.016, loyalty: 57,
      traits: ['secretive', 'greedy'], family: { spouse: 'Grace (1975)', children: ['Ethan (2003)', 'Chloe (2006)'] },
      accounts: [['CUR', 'USD', 19500000, 'EM08'], ['DEP', 'CHF', 9000000, 'EM08', 'alt']],
      notes: [n('2016-06-27', 'Mei-Lin Tschopp', 'Transferred from a Lugano bank that FINMA is winding up. Fees came from "consulting for Gulf and Malaysian state investors". Very large single payments in 2012 and 2013.'),
        n('2017-07-21', 'Dr. Katharina Imhof', 'US Department of Justice civil forfeiture complaints (1MDB) name several advisers. Client not named. Enhanced monitoring; no outgoing payments to Singapore without my approval.')]
    },
    {
      id: '102.208', rubrik: 'BASALT', name: 'Eitan Barzilai', nat: 'IL', dom: 'CY', city: 'Limassol',
      born: '1979-11-04', occ: 'Owner, online casino and sports-betting operator (Malta and Curaçao licences)', sow: 'Gaming profits',
      wealth: 55e6, declared: 0.3, risk: 'Increased', formA: '2013-06-03', holdMail: true, since: '2013-06-03', rm: 'M01', fee: 0.014, loyalty: 61,
      traits: ['greedy'], family: { spouse: 'Shira (1982)', children: ['Noam (2010)', 'Maya (2013)'] },
      accounts: [['CUR', 'EUR', 11000000, 'EM09'], ['CUR', 'USD', 7500000, 'EM09'], ['CUR', 'USDT', 2500000], ['DEP', 'CHF', 6000000, null, 'growth']],
      notes: [n('2017-10-30', 'Jonas Rüegg', 'Client\'s company now accepts deposits from players in tether and bitcoin. He wants to sweep the coins to us weekly. Pending: who are the players? Several markets where online gambling is illegal (Germany, Turkey, Israel).')]
    },
    {
      id: '102.214', rubrik: 'DOLOMIT', name: 'Oleksandr Hrytsenko', nat: 'UA', dom: 'UA', city: 'Vinnytsia',
      born: '1968-08-12', occ: 'Owner, grain and sunflower-oil group (central Ukraine)', sow: 'Agricultural exports',
      wealth: 85e6, declared: 0, risk: 'Increased', formA: '2010-08-10', holdMail: true, since: '2010-08-10', rm: 'M01', fee: 0.013, loyalty: 70,
      traits: ['loyal'], family: { spouse: 'Iryna (1971)', children: ['Taras (1994)', 'Sofiia (1999)'] },
      accounts: [['CUR', 'USD', 22000000, 'EM10'], ['DEP', 'CHF', 15000000, 'EM10', 'balanced'], ['CUR', 'EUR', 1800000]],
      notes: [n('2014-03-05', 'Dr. Reto Sprecher', 'After the events in Crimea client asks for a contingency plan. Family visas for Switzerland discussed with a lawyer in Geneva.'),
        n('2017-06-14', 'Dr. Reto Sprecher', 'Export proceeds come via a Cyprus trading company and the BVI holding. Prices on the trading company invoices are well below market.')]
    },
    {
      id: '102.226', rubrik: 'GNEIS', name: 'Dr. med. Andrea Burkhardt', nat: 'DE', dom: 'DE', city: 'Freiburg im Breisgau',
      born: '1962-04-03', occ: 'Orthopaedic surgeon (own clinic)', sow: 'Professional income; inheritance (2009)',
      wealth: 7e6, declared: 1, risk: 'Normal', formA: '2009-09-01', holdMail: false, since: '2009-09-01', rm: 'M03', fee: 0.009, loyalty: 72,
      traits: ['nervous'], family: { spouse: 'Thomas (1960)', children: ['Lea (1994)', 'Jonas (1997)'] },
      accounts: [['CUR', 'EUR', 820000], ['CUR', 'CHF', 140000], ['DEP', 'CHF', 3900000, null, 'balanced']],
      notes: [n('2014-02-17', 'Claudio Moretti', t('Selbstanzeige filed in Baden-Württemberg through a Freiburg tax adviser. Back taxes and interest paid. Account fully declared since.', 'Voluntary disclosure filed with the Baden-Württemberg tax office through a Freiburg tax adviser. Back taxes and interest paid. Account fully declared since.'))]
    },
    {
      id: '102.233', rubrik: 'GRANAT', name: 'Ing. Paolo Galli', nat: 'IT', dom: 'IT', city: 'Varese',
      born: '1957-12-01', occ: 'Owner, precision plastics manufacturer', sow: 'Business income',
      wealth: 11e6, declared: 1, risk: 'Normal', formA: '1999-03-08', holdMail: false, since: '1999-03-08', rm: 'M03', fee: 0.010, loyalty: 68,
      traits: ['loyal'], family: { spouse: 'Silvana (1960)', children: ['Marco (1986)'] },
      accounts: [['CUR', 'EUR', 1450000], ['DEP', 'CHF', 5200000, null, 'income'], ['MET', 'XAU', 300]],
      notes: [n('2015-11-27', 'Claudio Moretti', 'Voluntary disclosure (voluntary collaboration) completed with the Agenzia delle Entrate. Client paid about EUR 640,000. Assets now declared; statements go to his accountant in Varese.')]
    },
    {
      id: '102.247', rubrik: 'JASPIS', name: 'Ernesto Páez Urdaneta', nat: 'VE', dom: 'ES', city: 'Madrid',
      born: '1963-04-29', occ: 'Former procurement manager at the Venezuelan state oil company (until 2014); consultant', sow: 'Consulting fees; family business',
      wealth: 64e6, declared: 0, risk: 'PEP', formA: '2009-10-26', holdMail: true, since: '2009-10-26', rm: 'M05', fee: 0.020, loyalty: 63,
      traits: ['secretive'], family: { spouse: 'Carmen (1966)', children: ['Andrés (1991)', 'Daniela (1995)'] },
      accounts: [['CUR', 'USD', 31000000, 'EM11'], ['DEP', 'CHF', 22000000, 'EM11', 'alt'], ['CUR', 'EUR', 700000]],
      notes: [n('2015-12-08', 'Dr. Iris Wyss', 'Swiss Attorney General has opened proceedings on bribery around the Venezuelan state oil company. Our client is not named so far. MROS report considered and not filed (file note in the safe).'),
        n('2017-08-28', 'Felipe Arango Steiner', 'New US sanctions on Venezuela. Client moved to Madrid last year with a golden visa. Asks to keep all communication through his lawyer.')]
    },
    {
      id: '102.262', rubrik: 'HÄMATIT', name: 'Kyle J. Donovan', nat: 'US', dom: 'US', city: 'Austin, Texas',
      born: '1984-06-11', occ: 'Early bitcoin investor; angel investor in crypto start-ups', sow: 'Bitcoin bought in 2011–2013; sale of a payments start-up (2016)',
      wealth: 40e6, declared: 1, risk: 'Normal', formA: '2016-03-01', holdMail: false, since: '2016-03-01', rm: 'M05', fee: 0.009, loyalty: 64,
      traits: ['greedy'], family: { spouse: 'Ashley (1986)', children: [] },
      accounts: [['CUR', 'BTC', 900, 'EM12'], ['CUR', 'USD', 4200000, 'EM12'], ['CUR', 'ETH', 6000]],
      notes: [n('2016-03-01', 'Felipe Arango Steiner', 'US person: W-9 on file, account reported under FATCA. Client wants Swiss custody "in case Washington bans bitcoin".')]
    },
    // nur im Szenario 2021
    {
      id: '102.270', rubrik: 'RHODONIT', name: 'Jannik Stauffacher', nat: 'CH', dom: 'CH', city: 'Zürich',
      born: '1993-02-17', occ: 'Digital artist (crypto art)', sow: 'Sales of digital artworks (NFTs) on Ethereum marketplaces',
      wealth: 6e6, declared: 0.5, risk: 'Normal', formA: '2020-12-21', holdMail: false, since: '2020-12-21', rm: 'M02', fee: 0.010, loyalty: 70,
      traits: ['nervous'], family: { spouse: '', children: [] },
      accounts: [['CUR', 'ETH', 1450], ['CUR', 'USDC', 850000], ['CUR', 'CHF', 95000]],
      notes: [n('2020-12-21', 'Nadja Brändli', 'Sold a series of 12 animated works for about 1,900 ETH in December. Buyers are wallets, not names. Two of the buyers paid from the same exchange account.')]
    },
    {
      id: '102.281', rubrik: 'TOPAS', name: 'Park Ji-hoon', nat: 'KR', dom: 'SG', city: 'Singapore',
      born: '1989-10-21', occ: 'Founder, crypto trading firm; early investor in Terra', sow: 'Trading profits; early allocation in a Korean blockchain project',
      wealth: 90e6, declared: 0.3, risk: 'Increased', formA: '2020-10-05', holdMail: false, since: '2020-10-05', rm: 'M02', fee: 0.010, loyalty: 60,
      traits: ['greedy', 'demanding'], family: { spouse: '', children: [] },
      accounts: [['CUR', 'LUNA', 1600000, 'EM13'], ['CUR', 'UST', 9000000, 'EM13'], ['CUR', 'BTC', 210, 'EM13'], ['CUR', 'USD', 3500000]],
      notes: [n('2020-10-05', 'Nadja Brändli', 'Moved his company from Seoul to Singapore this year. Holds most of his wealth in LUNA and its dollar coin UST, which he says pays "20% on Anchor, guaranteed by the protocol".'),
        n('2020-11-16', 'Jonas Rüegg', 'Custody of LUNA and UST approved by the digital assets committee. Valuation risk noted. Client calls daily.')]
    }
  ];

  const ZH = function (list, ids) { return list.filter(function (c) { return ids.indexOf(c.id) < 0; }); };

  /* scenarios.js und history.js werden nach dieser Datei geladen und setzen D.SCENARIOS bzw. D.TIMELINE
     neu. Die modernen Einträge werden deshalb bei jeder Zuweisung wieder angefügt. */
  function keep(key, merge) {
    let cur = D[key];
    Object.defineProperty(D, key, { configurable: true, enumerable: true,
      get: function () { return cur; }, set: function (v) { cur = merge(v); } });
    if (cur) cur = merge(cur);
  }

  const SC = {};
  SC['2018'] = {
    label: '2018 – After secrecy',
    desc: 'The first automatic exchange of account data goes out in September. The old tax business is gone; crypto money from Zug, Russian metals, Gulf families and a few awkward PEPs remain.',
    start: '2018-01-03', end: '2025-06-30', era: 'modern', capital: 95e6, scale: 1, discretion: 58,
    heat: { EBK: 22, US: 20, DE: 10, IT: 10, FR: 7, GB: 6 },
    clients: ZH(CLIENTS, ['102.270', '102.281']), staff: STAFF, entities: ENTITIES, exclude: [], extra: []
  };
  SC['2021'] = {
    label: '2021 – Crypto mania',
    desc: 'Bitcoin above 30,000 dollars, Zug full of token foundations and clients asking for DeFi yields. Terra, FTX, sanctions on Russia and the end of Credit Suisse lie ahead.',
    start: '2021-01-04', end: '2025-06-30', era: 'modern', capital: 110e6, scale: 1.1, discretion: 55,
    heat: { EBK: 26, US: 18, DE: 8, IT: 8, FR: 6, GB: 6 },
    clients: CLIENTS, staff: STAFF, entities: ENTITIES, exclude: [], extra: []
  };
  D.SCENARIOS = D.SCENARIOS || {};
  keep('SCENARIOS', function (v) { return Object.assign(v || {}, SC); });
  D.MODERN = { staff: STAFF, clients: CLIENTS, entities: ENTITIES };
})(window.PBS);
