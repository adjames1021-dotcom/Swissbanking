/* PBS/Web 4.2 – Kundenstamm (Stand Startszenario) */
(function (PBS) {
  'use strict';

  const D = PBS.DATA;
  const t = PBS.L.t;
  function n(d, who, text) { return [d, who, text]; }

  // accounts: [Typ, Währung, Saldo (Stand 2003), Inhaber-Sitzgesellschaft, Strategie für Depots]
  // rm: Mitarbeiter-ID; family: Ehepartner, Kinder (Geburtsjahr)
  D.CLIENTS = [
    {
      id: '100.482', rubrik: 'EDELWEISS', name: 'Dr.-Ing. Heinrich Brenner', nat: 'DE', dom: 'DE', city: 'Stuttgart',
      born: '1934-04-11', occ: 'Industrialist (machine tools), retired',
      sow: 'Sale of family company Brenner Präzisionstechnik GmbH (1994); dividends', wealth: 52e6, declared: 0.1,
      risk: 'Normal', formA: '1994-05-12', holdMail: true, since: '1971-09-14', rm: 'S01', fee: 0.010, loyalty: 82,
      traits: ['loyal'], family: { spouse: 'Gisela (1937)', children: ['Dr. Martin (1962)', 'Katrin (1965)'] },
      accounts: [['CUR', 'CHF', 1284551.20], ['CUR', 'EUR', 3905112.75], ['DEP', 'CHF', 24500000, null, 'income'], ['MET', 'XAU', 2400],
        ['CUR', 'EUR', 4350000, 'E01'], ['DEP', 'CHF', 2800000, 'E01', 'balanced']],
      notes: [n('2003-02-05', 'Urs Keller', 'Telephone call. Client plans to buy a holiday flat on Sylt this spring. Son (Dr. M. Brenner) to receive power of attorney at a later date.'),
        n('2002-11-19', 'Urs Keller', t('Annual meeting in Zurich (Hotel Baur au Lac). Mandate unchanged, conservative. Statements to remain banklagernd.', 'Annual meeting in Zurich (Hotel Baur au Lac). Mandate unchanged, conservative. Statements to remain on hold mail.'))]
    },
    {
      id: '100.517', rubrik: 'MONTEROSA', name: 'Vittorio Spadaro', nat: 'IT', dom: 'IT', city: 'Como',
      born: '1946-08-02', occ: 'Owner, silk weaving mill (Tessitura Spadaro S.p.A.)',
      sow: 'Business income; family wealth', wealth: 30e6, declared: 0, risk: 'Normal', formA: '1983-10-04', holdMail: true,
      since: '1983-10-04', rm: 'S02', fee: 0.012, loyalty: 74, traits: ['secretive'], family: { spouse: 'Lucia (1950)', children: ['Federico (1975)', 'Giulia (1979)'] },
      accounts: [['CUR', 'CHF', 410220.00], ['CUR', 'EUR', 6120480.00], ['DEP', 'CHF', 12800000, null, 'balanced'], ['MET', 'XAU', 1500]],
      notes: [n('2003-01-17', 'Claudio Moretti', 'Courier (Sig. B.) delivered cash. Client prefers deliveries on Monday mornings via Chiasso.')]
    },
    {
      id: '100.603', rubrik: 'LAFAYETTE', name: 'Mme Hélène Marchetti-Roux', nat: 'FR', dom: 'FR', city: 'Lyon',
      born: '1929-02-27', occ: 'Widow; heir to pharmaceutical wholesaler',
      sow: 'Inheritance (1988)', wealth: 14e6, declared: 0, risk: 'Normal', formA: '1988-06-30', holdMail: true,
      since: '1961-05-02', rm: 'S03', fee: 0.011, loyalty: 88, traits: ['loyal', 'nervous'], family: { spouse: '† Pierre (1925–1988)', children: [] },
      accounts: [['CUR', 'CHF', 220110.45], ['CUR', 'EUR', 1840900.00], ['DEP', 'CHF', 9150000, null, 'income']],
      notes: [n('2003-01-08', 'Jean-Pierre Favre', 'Client\'s nephew called in (no power of attorney). Information politely refused. Client has no children; no will on file.')]
    },
    {
      id: '100.711', rubrik: 'BLUEGRASS', name: 'Richard T. Whitcomb', nat: 'US', dom: 'US', city: 'Houston, Texas',
      born: '1951-11-30', occ: 'Owner, oilfield services company',
      sow: 'Business income; sale of drilling subsidiary (1999)', wealth: 45e6, declared: 0, risk: 'Normal',
      formA: '1992-03-16', holdMail: true, since: '1992-03-16', rm: 'S04', fee: 0.012, loyalty: 70, traits: ['greedy'],
      family: { spouse: 'Brenda (1955)', children: ['Tyler (1981)', 'Megan (1984)'] },
      accounts: [['CUR', 'USD', 9850000, 'E02'], ['DEP', 'CHF', 13200000, 'E02', 'growth'], ['CUR', 'USD', 820000]],
      notes: [n('2003-02-11', 'Thomas Hollis', 'Met client in Geneva (hotel lobby). Client asked again that no correspondence be sent to the US. Prefers communication via our Hong Kong number.')]
    },
    {
      id: '100.744', rubrik: 'KESTREL', name: 'Nigel Ashcombe', nat: 'GB', dom: 'GB', city: 'London',
      born: '1958-07-19', occ: 'Property developer', sow: 'Real estate development (London Docklands)',
      wealth: 20e6, declared: 0.3, risk: 'Normal', formA: '1996-09-02', holdMail: false, since: '1996-09-02',
      rm: 'S04', fee: 0.010, loyalty: 66, traits: ['demanding'], family: { spouse: 'Annabel (1962)', children: ['Oliver (1990)'] },
      accounts: [['CUR', 'GBP', 2140000], ['DEP', 'CHF', 4300000, null, 'growth']],
      notes: [n('2002-12-03', 'Thomas Hollis', 'At client\'s request statements continue to be mailed to his London home address. Advised hold mail, client declined.')]
    },
    {
      id: '100.802', rubrik: 'ORCHIDEE', name: 'Carlos Ibáñez Ortega', nat: 'VE', dom: 'VE', city: 'Caracas',
      born: '1949-01-23', occ: 'Former Deputy Minister, Ministry of Energy and Mines (until 2001); consultant',
      sow: 'Consulting fees; family business', wealth: 40e6, declared: 0, risk: 'PEP', formA: '1998-04-21',
      holdMail: true, since: '1998-04-21', rm: 'S05', fee: 0.021, loyalty: 72, traits: ['secretive'],
      family: { spouse: 'María Elena (1955)', children: ['Carlos Jr. (1978)', 'Valentina (1983)'] },
      accounts: [['CUR', 'USD', 18400000, 'E03'], ['DEP', 'CHF', 16000000, 'E03', 'alt'], ['CUR', 'USD', 650000]],
      notes: [n('2002-12-11', 'Dr. Reto Sprecher', 'Visit in Zurich. Client asked to keep the relationship strictly via Meridian. Further funds expected from "consulting mandates".')]
    },
    {
      id: '100.815', rubrik: 'SAMOWAR', name: 'Arkadi V. Lebedinsky', nat: 'RU', dom: 'RU', city: 'Moscow',
      born: '1961-05-08', occ: 'Metals trading (aluminium, nickel)', sow: 'Commodity trading profits',
      wealth: 80e6, declared: 0, risk: 'Increased', formA: '1997-10-13', holdMail: true, since: '1997-10-13',
      rm: 'S05', fee: 0.016, loyalty: 60, traits: ['demanding', 'greedy'], family: { spouse: 'Natalia (1968)', children: ['Ilya (1990)'] },
      accounts: [['CUR', 'USD', 21700000, 'E04'], ['DEP', 'CHF', 18500000, 'E04', 'growth'], ['CUR', 'CHF', 1140000], ['MET', 'XAU', 6000, 'E04']],
      notes: [n('2003-01-20', 'Dr. Reto Sprecher', 'Ostara Stiftung: by-laws amended, new protector appointed (lawyer in Vaduz).')]
    },
    {
      id: '100.833', rubrik: 'TULPE', name: 'Johannes van Rijswijk', nat: 'NL', dom: 'NL', city: 'Rotterdam',
      born: '1955-03-14', occ: 'Partner, shipping agency', sow: 'Business income', wealth: 9e6, declared: 0,
      risk: 'Normal', formA: '1990-01-22', holdMail: true, since: '1990-01-22', rm: 'S01', fee: 0.010, loyalty: 75,
      traits: ['nervous'], family: { spouse: 'Marijke (1957)', children: ['Daan (1984)'] },
      accounts: [['CUR', 'EUR', 2310000], ['DEP', 'CHF', 3600000, null, 'balanced']],
      notes: []
    },
    {
      id: '100.901', rubrik: 'ZEDER', name: 'Fouad Haddad', nat: 'LB', dom: 'LB', city: 'Beirut',
      born: '1952-09-01', occ: 'Construction contractor (Gulf region)',
      sow: 'Construction contracts in Saudi Arabia and the UAE', wealth: 25e6, declared: 0, risk: 'Increased',
      formA: '1985-06-11', holdMail: true, since: '1985-06-11', rm: 'S03', fee: 0.014, loyalty: 78, traits: ['loyal'],
      family: { spouse: 'Rania (1958)', children: ['Karim (1982)', 'Leila (1986)'] },
      accounts: [['CUR', 'USD', 7900000], ['DEP', 'CHF', 6200000, null, 'balanced'], ['MET', 'XAU', 3000]],
      notes: []
    },
    {
      id: '100.922', rubrik: 'MATTERHORN', name: 'Hans-Peter Ammann-Huber', nat: 'CH', dom: 'CH', city: 'Küsnacht ZH',
      born: '1940-12-05', occ: 'Entrepreneur (printing), retired', sow: 'Sale of Ammann Druck AG (1998)',
      wealth: 22e6, declared: 0.6, risk: 'Normal', formA: '1966-02-01', holdMail: false, since: '1966-02-01',
      rm: 'S01', fee: 0.009, loyalty: 85, traits: ['loyal'], family: { spouse: 'Verena (1943)', children: ['Christoph (1968)', 'Barbara (1971)'] },
      accounts: [['CUR', 'CHF', 1850000], ['DEP', 'CHF', 12400000, null, 'income'], ['CUR', 'EUR', 520000]],
      notes: []
    },
    {
      id: '100.948', rubrik: 'ALBATROS', name: 'Spyros Kalogeropoulos', nat: 'GR', dom: 'GR', city: 'Piraeus',
      born: '1944-10-17', occ: 'Shipowner (dry bulk)', sow: 'Shipping income', wealth: 60e6, declared: 0,
      risk: 'Normal', formA: '1979-08-08', holdMail: true, since: '1979-08-08', rm: 'S04', fee: 0.011, loyalty: 77,
      traits: ['secretive'], family: { spouse: 'Eleni (1948)', children: ['Nikos (1970)', 'Sofia (1974)'] },
      accounts: [['CUR', 'USD', 11300000, 'E05'], ['DEP', 'CHF', 9800000, 'E05', 'balanced'], ['CUR', 'GBP', 380000]],
      notes: []
    },
    {
      id: '100.977', rubrik: 'SEEROSE', name: 'Dr. med. dent. Ulrike Hagedorn', nat: 'DE', dom: 'DE', city: 'München',
      born: '1957-06-22', occ: 'Dentist (own practice)', sow: 'Professional income; inheritance', wealth: 2.5e6,
      declared: 0, risk: 'Normal', formA: '1993-04-15', holdMail: true, since: '1993-04-15', rm: 'S01', fee: 0.012,
      loyalty: 72, traits: ['nervous'], family: { spouse: 'Dr. Jens (1955)', children: ['Lena (1990)'] },
      accounts: [['CUR', 'EUR', 640000], ['CUR', 'CHF', 85000], ['DEP', 'CHF', 780000, null, 'balanced']],
      notes: []
    },
    {
      id: '101.004', rubrik: 'PICCOLO', name: 'Rosa Benvenuti', nat: 'IT', dom: 'IT', city: 'Bergamo',
      born: '1949-03-29', occ: 'Restaurant owner (three restaurants)', sow: 'Business income (cash-intensive)',
      wealth: 1.2e6, declared: 0, risk: 'Normal', formA: null, holdMail: true, since: '2001-11-05', rm: 'S02',
      fee: 0.013, loyalty: 70, traits: ['secretive'], family: { spouse: 'Aldo (1946)', children: ['Marta (1976)'] },
      accounts: [['CUR', 'EUR', 412500], ['MET', 'XAU', 650]],
      notes: [n('2002-10-14', 'Claudio Moretti', 'Client again declined to sign Form A ("my accountant will take care of it"). Follow up.')]
    },
    {
      id: '101.026', rubrik: 'NORDLICHT', name: 'Lars Ekdahl', nat: 'SE', dom: 'SE', city: 'Stockholm',
      born: '1966-02-09', occ: 'Co-founder, mobile software company (sold 2000)', sow: 'Sale of shares (2000)',
      wealth: 9e6, declared: 0, risk: 'Normal', formA: '2000-06-26', holdMail: true, since: '2000-06-26',
      rm: 'S04', fee: 0.010, loyalty: 68, traits: ['greedy'], family: { spouse: '', children: [] },
      accounts: [['CUR', 'USD', 1900000], ['DEP', 'CHF', 3500000, null, 'growth']],
      notes: []
    }
  ];

  // Zusätzliche Kunden im Szenario 2008
  D.CLIENTS_2008 = [
    {
      id: '101.311', rubrik: 'GOLDREGEN', name: 'Dr. Friedrich Ostermann', nat: 'DE', dom: 'DE', city: 'Düsseldorf',
      born: '1948-02-17', occ: 'Heir, family holding (chemicals)', sow: 'Inheritance (2004)', wealth: 70e6, declared: 0,
      risk: 'Normal', formA: '2004-09-01', holdMail: true, since: '2004-09-01', rm: 'S01', fee: 0.009, loyalty: 70,
      traits: ['nervous'], family: { spouse: 'Christiane (1952)', children: ['Philipp (1978)', 'Anna (1981)'] },
      accounts: [['CUR', 'EUR', 6200000, 'E06'], ['DEP', 'CHF', 31000000, 'E06', 'balanced']],
      notes: [n('2007-11-20', 'Urs Keller', 'Client asked whether "his Liechtenstein foundation" is safe. Reassured.')]
    },
    {
      id: '101.358', rubrik: 'MANGROVE', name: 'Robert J. Caldwell', nat: 'US', dom: 'US', city: 'Palm Beach, Florida',
      born: '1956-08-03', occ: 'Real estate investor', sow: 'Real estate gains', wealth: 38e6, declared: 0,
      risk: 'Normal', formA: '2005-03-14', holdMail: true, since: '2005-03-14', rm: 'S04', fee: 0.012, loyalty: 64,
      traits: ['greedy'], family: { spouse: 'Linda (1960)', children: ['Ashley (1987)'] },
      accounts: [['CUR', 'USD', 7400000], ['DEP', 'CHF', 15000000, null, 'growth']],
      notes: [n('2008-01-15', 'Thomas Hollis', 'Visited client in Miami during Art Basel Miami Beach. Client wants to buy more US real estate "quietly".')]
    }
  ];

  D.ENTITIES = [
    { id: 'E01', name: 'Lindenhof Invest Anstalt', jur: 'LI_A', inc: '1986-03-21', bo: '100.482' },
    { id: 'E02', name: 'Caldera Holdings Ltd.', jur: 'VG', inc: '1992-02-28', bo: '100.711' },
    { id: 'E03', name: 'Meridian Trade & Finance S.A.', jur: 'PA', inc: '1998-03-30', bo: '100.802' },
    { id: 'E04', name: 'Ostara Stiftung', jur: 'LI_S', inc: '1997-09-02', bo: '100.815' },
    { id: 'E05', name: 'Thalassa Maritime Inc.', jur: 'LR', inc: '1979-06-12', bo: '100.948' },
    { id: 'E06', name: 'Rhenania Familienstiftung', jur: 'LI_S', inc: '2004-08-10', bo: '101.311' }
  ];
})(window.PBS);
