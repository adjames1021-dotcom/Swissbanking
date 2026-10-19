/* PBS/Web 4.2 – Stammdaten Mandant 001 (Zürich)
   All banks, persons and companies in this file are fictitious. */
(function (PBS) {
  'use strict';

  const D = PBS.DATA = {};

  D.BANK = {
    short: 'Vogt & Cie',
    name: 'Bankhaus Vogt & Cie',
    legal: 'Bankhaus Vogt & Cie, Privatbankiers',
    founded: 1871,
    street: 'Bahnhofstrasse 64',
    zip: 'CH-8021 Zürich',
    pobox: 'Postfach 2217',
    phone: '+41 1 218 44 00',
    fax: '+41 1 218 44 99',
    telex: '812 447 VOGT CH',
    bic: 'VOGTCHZZ',
    clearing: '8742',
    system: 'PBS/Web',
    release: '4.2.1',
    build: '2003.02.14',
    host: 'PBSPRD01',
    mandant: '001'
  };

  D.START_DATE = '2003-03-03';
  D.OPEX_BASE = 9000;            // fixer Personal- und Sachaufwand pro Bankwerktag
  D.OPEX_AUM = 0.003;            // variabler Aufwand in % der verwalteten Vermögen p.a.
  D.MIN_CAPITAL = 10e6;          // Mindestkapital nach Art. 4 BankV
  D.FX_SPREAD = 0.004;
  D.CCY = ['CHF', 'EUR', 'USD', 'GBP', 'JPY'];

  D.MARKET = { USD: 1.3741, EUR: 1.4664, GBP: 2.1682, JPY: 1.1638, XAU: 335.80, SMI: 4211.4 };
  D.MARKET_LABEL = {
    USD: ['USD/CHF', 'US dollar'],
    EUR: ['EUR/CHF', 'Euro'],
    GBP: ['GBP/CHF', 'Pound sterling'],
    JPY: ['JPY/CHF (100)', 'Japanese yen'],
    XAU: ['XAU/USD', 'Gold, fine ounce'],
    SMI: ['SMI', 'Swiss Market Index']
  };

  D.AUTH = {
    EBK: { short: 'EBK', name: 'Swiss Federal Banking Commission', c: 'CH' },
    US: { short: 'IRS / DOJ', name: 'US Internal Revenue Service', c: 'US' },
    DE: { short: 'Steuerfahndung', name: 'German tax investigation', c: 'DE' },
    IT: { short: 'Guardia di Finanza', name: 'Italian financial police', c: 'IT' },
    FR: { short: 'DGI', name: 'French tax administration', c: 'FR' },
    GB: { short: 'Inland Revenue', name: 'UK Inland Revenue', c: 'GB' }
  };

  D.COUNTRIES = {
    CH: { n: 'Switzerland', ccy: 'CHF' },
    DE: { n: 'Germany', auth: 'DE', ccy: 'EUR' },
    IT: { n: 'Italy', auth: 'IT', ccy: 'EUR' },
    FR: { n: 'France', auth: 'FR', ccy: 'EUR' },
    US: { n: 'United States', auth: 'US', ccy: 'USD' },
    GB: { n: 'United Kingdom', auth: 'GB', ccy: 'GBP' },
    NL: { n: 'Netherlands', ccy: 'EUR' },
    AT: { n: 'Austria', ccy: 'EUR' },
    GR: { n: 'Greece', ccy: 'EUR' },
    SE: { n: 'Sweden', ccy: 'USD' },
    LB: { n: 'Lebanon', ccy: 'USD' },
    RU: { n: 'Russia', ccy: 'USD' },
    VE: { n: 'Venezuela', ccy: 'USD' },
    AR: { n: 'Argentina', ccy: 'USD' },
    KZ: { n: 'Kazakhstan', ccy: 'USD' },
    NG: { n: 'Nigeria', ccy: 'USD', ncct: true },
    LI: { n: 'Liechtenstein', ccy: 'CHF', haven: true },
    VG: { n: 'British Virgin Islands', ccy: 'USD', haven: true },
    PA: { n: 'Panama', ccy: 'USD', haven: true },
    BS: { n: 'Bahamas', ccy: 'USD', haven: true },
    KY: { n: 'Cayman Islands', ccy: 'USD', haven: true },
    LR: { n: 'Liberia', ccy: 'USD', haven: true },
    CY: { n: 'Cyprus', ccy: 'EUR', haven: true },
    SG: { n: 'Singapore', ccy: 'USD', haven: true },
    HK: { n: 'Hong Kong', ccy: 'USD', haven: true },
    AE: { n: 'United Arab Emirates', ccy: 'USD', haven: true },
    NR: { n: 'Nauru', ccy: 'USD', haven: true, ncct: true }
  };

  // BIC-Verzeichnis (Auszug) – fiktive Korrespondenzbanken
  D.BANKS = [
    { bic: 'NRHBDEDD', name: 'Niederrheinische Handelsbank AG', city: 'Düsseldorf', c: 'DE' },
    { bic: 'NHBKDESS', name: 'Neckar-Handelsbank AG', city: 'Stuttgart', c: 'DE' },
    { bic: 'ISPBDEMM', name: 'Isartal Privatbank KG', city: 'München', c: 'DE' },
    { bic: 'ALHBDEHH', name: 'Alster Handelsbank AG', city: 'Hamburg', c: 'DE' },
    { bic: 'BPLUITMM', name: 'Banca Popolare Lombarda Unita', city: 'Milano', c: 'IT' },
    { bic: 'BCLAITM1', name: 'Banca del Lario S.p.A.', city: 'Como', c: 'IT' },
    { bic: 'CRHOFRLY', name: 'Crédit Rhodanien SA', city: 'Lyon', c: 'FR' },
    { bic: 'BSMOFRPP', name: 'Banque Saint-Marceau', city: 'Paris', c: 'FR' },
    { bic: 'FGCNUS44', name: 'First Gulf Coast National Bank', city: 'Houston TX', c: 'US' },
    { bic: 'BISCUS3M', name: 'Biscayne Trust Company', city: 'Miami FL', c: 'US' },
    { bic: 'HSQBGB2L', name: 'Hanover Square Bank plc', city: 'London', c: 'GB' },
    { bic: 'AMHBNL2A', name: 'Amstel Handelsbank N.V.', city: 'Amsterdam', c: 'NL' },
    { bic: 'AEGMGRAA', name: 'Aegean Maritime Bank S.A.', city: 'Piraeus', c: 'GR' },
    { bic: 'MALSSESS', name: 'Mälardalen Sparbank AB', city: 'Stockholm', c: 'SE' },
    { bic: 'BLEVLBBX', name: 'Banque du Levant SAL', city: 'Beirut', c: 'LB' },
    { bic: 'VLGCRUMM', name: 'Volga Commerce Bank', city: 'Moscow', c: 'RU' },
    { bic: 'BORIVECA', name: 'Banco Orinoco C.A.', city: 'Caracas', c: 'VE' },
    { bic: 'BDPLARBA', name: 'Banco del Plata S.A.', city: 'Buenos Aires', c: 'AR' },
    { bic: 'STCBKZKA', name: 'Steppe Commercial Bank JSC', city: 'Almaty', c: 'KZ' },
    { bic: 'NDMBNGLA', name: 'Niger Delta Merchant Bank plc', city: 'Lagos', c: 'NG' },
    { bic: 'RTPBLI22', name: 'Rheintaler Privatbank AG', city: 'Vaduz', c: 'LI' },
    { bic: 'NFBTBSNS', name: 'Nassau Fidelity Bank & Trust Ltd.', city: 'Nassau', c: 'BS' },
    { bic: 'CMTBKYKY', name: 'Cayman Meridian Trust Bank Ltd.', city: 'George Town', c: 'KY' },
    { bic: 'BIPAPAPA', name: 'Banco Istmeño de Panamá S.A.', city: 'Panamá', c: 'PA' },
    { bic: 'SPBLSGSG', name: 'Straits Pacific Bank Ltd.', city: 'Singapore', c: 'SG' },
    { bic: 'KCBKHKHH', name: 'Kowloon Commercial Bank Ltd.', city: 'Hong Kong', c: 'HK' },
    { bic: 'TCBLCY2L', name: 'Troodos Credit Bank Ltd.', city: 'Limassol', c: 'CY' },
    { bic: 'EPBKAEAD', name: 'Emirates Pearl Bank PJSC', city: 'Dubai', c: 'AE' },
    { bic: 'PBOBNRNR', name: 'Pacific Basin Offshore Bank Ltd.', city: 'Yaren', c: 'NR' },
    { bic: 'LEMPCHGG', name: 'Banque Léman Privée SA', city: 'Genève', c: 'CH' },
    { bic: 'ZGBKCHZZ', name: 'Zürcher Gewerbebank AG', city: 'Zürich', c: 'CH' }
  ];
  D.bankByBic = function (bic) {
    bic = String(bic || '').toUpperCase().slice(0, 8);
    return D.BANKS.find(function (b) { return b.bic === bic; }) || null;
  };
  D.banksIn = function (c) { return D.BANKS.filter(function (b) { return b.c === c; }); };
  D.HAVEN_BANKS = ['RTPBLI22', 'NFBTBSNS', 'CMTBKYKY', 'BIPAPAPA', 'SPBLSGSG', 'KCBKHKHH', 'TCBLCY2L', 'EPBKAEAD'];

  // Sitzgesellschaften: Gründungskosten und Abschirmwirkung (shield: Faktor auf Exposure)
  D.JURIS = {
    VG: { c: 'VG', label: 'British Virgin Islands – IBC', form: 'International Business Company', suffix: 'Ltd.', agent: 'Tortola Corporate Services Ltd., Road Town', setup: 9500, annual: 3800, shield: 0.45 },
    PA: { c: 'PA', label: 'Panama – Sociedad Anónima', form: 'Sociedad Anónima', suffix: 'S.A.', agent: 'Bufete Arosemena & Asociados, Panamá', setup: 7200, annual: 3200, shield: 0.5 },
    BS: { c: 'BS', label: 'Bahamas – IBC', form: 'International Business Company', suffix: 'Ltd.', agent: 'Bay Street Nominees Ltd., Nassau', setup: 8800, annual: 3500, shield: 0.5 },
    LI_A: { c: 'LI', label: 'Liechtenstein – Anstalt (establishment)', form: 'Anstalt', suffix: 'Anstalt', agent: 'Treuhand Rheinberg reg., Vaduz', setup: 18500, annual: 7000, shield: 0.4 },
    LI_S: { c: 'LI', label: 'Liechtenstein – Stiftung (foundation)', form: 'Stiftung', suffix: 'Stiftung', agent: 'Treuhand Rheinberg reg., Vaduz', setup: 24000, annual: 9500, shield: 0.32 },
    LR: { c: 'LR', label: 'Liberia – Corporation', form: 'Corporation', suffix: 'Inc.', agent: 'Monrovia Registry Services, Monrovia', setup: 6800, annual: 3000, shield: 0.55 }
  };
  D.ENTITY_WORDS = {
    a: ['Alder', 'Bellwood', 'Cormoran', 'Delphin', 'Eastgate', 'Fairhaven', 'Granite', 'Harbour', 'Iris', 'Juniper',
      'Kingsmere', 'Linden', 'Montague', 'Northcliff', 'Orion', 'Pinecrest', 'Quarry', 'Riverton', 'Silverline',
      'Tamarind', 'Ulmus', 'Valmont', 'Westmark', 'Zephyr', 'Alpina', 'Bergsee', 'Corvus', 'Sirius'],
    b: ['Holdings', 'Investments', 'Trading', 'Capital', 'Assets', 'Ventures', 'Finance', 'Management', 'Overseas', 'Equities']
  };

  D.RULES = {
    'TM-01': 'Cash transaction ≥ CHF 25,000',
    'TM-02': 'Single transaction ≥ CHF 1,000,000',
    'TM-03': 'Possible structuring (repeated amounts below threshold)',
    'TM-04': 'Counterparty in FATF non-cooperative jurisdiction',
    'TM-05': 'Beneficial owner not documented (Form A missing)',
    'TM-06': 'Pass-through: funds in and out within 10 days',
    'TM-07': 'PEP relationship – transaction ≥ CHF 100,000',
    'TM-08': 'Incomplete originator information (field 50)',
    'TM-09': 'Inconsistent with client profile (> 30% of documented wealth)'
  };
  D.RULES_SEVERE = ['TM-02', 'TM-04', 'TM-07', 'TM-09'];

  D.JUSTIFICATIONS = [
    ['sale', 'Proceeds from sale of business or real estate'],
    ['inherit', 'Inheritance / gift within family'],
    ['income', 'Regular business income, dividends or salary'],
    ['own', 'Transfer between client\'s own accounts'],
    ['loan', 'Repayment of private loan'],
    ['phone', 'Client explanation obtained by telephone (file note)']
  ];

  D.STAFF = {
    partner: 'Dr. A. Vogt',
    compliance: 'Dr. I. Wyss',
    ops: 'R. Gisler',
    finance: 'B. Lüthi',
    cash: 'H. Zwicky'
  };
  D.RM_BY_COUNTRY = {
    DE: 'U. Keller', AT: 'U. Keller', NL: 'U. Keller', CH: 'U. Keller', SE: 'T. Hollis',
    IT: 'C. Moretti', FR: 'J.-P. Favre', LB: 'J.-P. Favre',
    US: 'T. Hollis', GB: 'T. Hollis', GR: 'T. Hollis',
    RU: 'Dr. R. Sprecher', VE: 'Dr. R. Sprecher', KZ: 'Dr. R. Sprecher', NG: 'Dr. R. Sprecher', AR: 'Dr. R. Sprecher'
  };

  D.CODEWORDS = ['ALPENROSE', 'ENZIAN', 'GRIMSEL', 'FURKA', 'SÄNTIS', 'PILATUS', 'RIGI', 'GEMSE', 'STEINBOCK',
    'BERGDOHLE', 'KASTANIE', 'LÄRCHE', 'ARVE', 'LORBEER', 'MIMOSA', 'ZYKLAME', 'JASMIN', 'OPAL', 'TOPAS', 'SAPHIR',
    'ONYX', 'KRISTALL', 'FALKE', 'SPERBER', 'REIHER', 'KRANICH', 'DELPHIN', 'KOMPASS', 'LEUCHTTURM', 'GLETSCHER',
    'BERNINA', 'GOTTHARD', 'SPLÜGEN', 'MALOJA', 'ALBULA', 'TÖDI', 'GLÄRNISCH', 'SILVRETTA', 'MARMOR', 'GRANIT',
    'BERNSTEIN', 'KORALLE', 'PERLE', 'NARZISSE', 'VEILCHEN', 'HOLUNDER', 'WACHOLDER', 'SCHWALBE', 'MÖWE', 'ADLER',
    'HERMELIN', 'MURMELTIER', 'LUCHS', 'FUCHS', 'EICHHORN', 'SPHINX', 'ORION', 'KASSIOPEIA', 'POLARIS', 'VESPER'];

  // Gesprächsnotizen-Kürzel
  function n(d, who, text) { return [d, who, text]; }

  // Kundenstamm per 28.02.2003
  // accounts: [Typ, Währung, Saldo, Inhaber (Sitzgesellschaft)]
  D.CLIENTS = [
    {
      id: '100.482', rubrik: 'EDELWEISS', name: 'Dr.-Ing. Heinrich Brenner', nat: 'DE', dom: 'DE', city: 'Stuttgart',
      born: '1934-04-11', occ: 'Industrialist (machine tools), retired',
      sow: 'Sale of family company Brenner Präzisionstechnik GmbH (1994); dividends', wealth: 52e6, declared: 0.1,
      risk: 'Normal', formA: '1994-05-12', holdMail: true, since: '1971-09-14', rm: 'U. Keller', fee: 0.010, loyalty: 82,
      accounts: [['CUR', 'CHF', 1284551.20], ['CUR', 'EUR', 3905112.75], ['DEP', 'CHF', 24500000], ['MET', 'XAU', 2400],
        ['CUR', 'EUR', 4350000, 'E01'], ['DEP', 'CHF', 2800000, 'E01']],
      notes: [n('2003-02-05', 'U. Keller', 'Telephone call. Client plans to buy a holiday flat on Sylt this spring. Wishes his son (Dr. M. Brenner) to receive power of attorney at a later date.'),
        n('2002-11-19', 'U. Keller', 'Annual meeting in Zurich (Hotel Baur au Lac). Mandate unchanged, conservative. Statements to remain banklagernd.')]
    },
    {
      id: '100.517', rubrik: 'MONTEROSA', name: 'Vittorio Spadaro', nat: 'IT', dom: 'IT', city: 'Como',
      born: '1946-08-02', occ: 'Owner, silk weaving mill (Tessitura Spadaro S.p.A.)',
      sow: 'Business income; family wealth', wealth: 30e6, declared: 0, risk: 'Normal', formA: '1983-10-04', holdMail: true,
      since: '1983-10-04', rm: 'C. Moretti', fee: 0.012, loyalty: 74,
      accounts: [['CUR', 'CHF', 410220.00], ['CUR', 'EUR', 6120480.00], ['DEP', 'CHF', 12800000], ['MET', 'XAU', 1500]],
      notes: [n('2003-01-17', 'C. Moretti', 'Courier (Sig. B.) delivered cash. Client prefers deliveries on Monday mornings via Chiasso.')]
    },
    {
      id: '100.603', rubrik: 'LAFAYETTE', name: 'Mme Hélène Marchetti-Roux', nat: 'FR', dom: 'FR', city: 'Lyon',
      born: '1929-02-27', occ: 'Widow; heir to pharmaceutical wholesaler',
      sow: 'Inheritance (1988)', wealth: 14e6, declared: 0, risk: 'Normal', formA: '1988-06-30', holdMail: true,
      since: '1961-05-02', rm: 'J.-P. Favre', fee: 0.011, loyalty: 88,
      accounts: [['CUR', 'CHF', 220110.45], ['CUR', 'EUR', 1840900.00], ['DEP', 'CHF', 9150000]],
      notes: [n('2003-01-08', 'J.-P. Favre', 'Visit of client\'s nephew (no power of attorney). Information refused politely.')]
    },
    {
      id: '100.711', rubrik: 'BLUEGRASS', name: 'Richard T. Whitcomb', nat: 'US', dom: 'US', city: 'Houston, Texas',
      born: '1951-11-30', occ: 'Owner, oilfield services company',
      sow: 'Business income; sale of drilling subsidiary (1999)', wealth: 45e6, declared: 0, risk: 'Normal',
      formA: '1992-03-16', holdMail: true, since: '1992-03-16', rm: 'T. Hollis', fee: 0.012, loyalty: 70,
      accounts: [['CUR', 'USD', 9850000, 'E02'], ['DEP', 'CHF', 13200000, 'E02'], ['CUR', 'USD', 820000]],
      notes: [n('2003-02-11', 'T. Hollis', 'Met client in Geneva (hotel lobby). Client asked again that no correspondence be sent to the US. Prefers communication via our Hong Kong number.')]
    },
    {
      id: '100.744', rubrik: 'KESTREL', name: 'Nigel Ashcombe', nat: 'GB', dom: 'GB', city: 'London',
      born: '1958-07-19', occ: 'Property developer', sow: 'Real estate development (London Docklands)',
      wealth: 20e6, declared: 0.3, risk: 'Normal', formA: '1996-09-02', holdMail: false, since: '1996-09-02',
      rm: 'T. Hollis', fee: 0.010, loyalty: 66,
      accounts: [['CUR', 'GBP', 2140000], ['DEP', 'CHF', 4300000]],
      notes: [n('2002-12-03', 'T. Hollis', 'At client\'s request statements continue to be mailed to his London home address. Advised hold mail – client declined.')]
    },
    {
      id: '100.802', rubrik: 'ORCHIDEE', name: 'Carlos Ibáñez Ortega', nat: 'VE', dom: 'VE', city: 'Caracas',
      born: '1949-01-23', occ: 'Former Deputy Minister, Ministry of Energy and Mines (until 2001); consultant',
      sow: 'Consulting fees; family business', wealth: 40e6, declared: 0, risk: 'PEP', formA: '1998-04-21',
      holdMail: true, since: '1998-04-21', rm: 'Dr. R. Sprecher', fee: 0.021, loyalty: 72,
      accounts: [['CUR', 'USD', 18400000, 'E03'], ['DEP', 'CHF', 16000000, 'E03'], ['CUR', 'USD', 650000]],
      notes: [n('2002-12-11', 'Dr. R. Sprecher', 'Visit in Zurich. Client asked to keep the relationship strictly via Meridian. Further funds expected from "consulting mandates".')]
    },
    {
      id: '100.815', rubrik: 'SAMOWAR', name: 'Arkadi V. Lebedinsky', nat: 'RU', dom: 'RU', city: 'Moscow',
      born: '1961-05-08', occ: 'Metals trading (aluminium, nickel)', sow: 'Commodity trading profits',
      wealth: 80e6, declared: 0, risk: 'Increased', formA: '1997-10-13', holdMail: true, since: '1997-10-13',
      rm: 'Dr. R. Sprecher', fee: 0.016, loyalty: 60,
      accounts: [['CUR', 'USD', 21700000, 'E04'], ['DEP', 'CHF', 18500000, 'E04'], ['CUR', 'CHF', 1140000], ['MET', 'XAU', 6000, 'E04']],
      notes: [n('2003-01-20', 'Dr. R. Sprecher', 'Ostara Stiftung: by-laws amended, new protector appointed (lawyer in Vaduz).')]
    },
    {
      id: '100.833', rubrik: 'TULPE', name: 'Johannes van Rijswijk', nat: 'NL', dom: 'NL', city: 'Rotterdam',
      born: '1955-03-14', occ: 'Partner, shipping agency', sow: 'Business income', wealth: 9e6, declared: 0,
      risk: 'Normal', formA: '1990-01-22', holdMail: true, since: '1990-01-22', rm: 'U. Keller', fee: 0.010, loyalty: 75,
      accounts: [['CUR', 'EUR', 2310000], ['DEP', 'CHF', 3600000]],
      notes: []
    },
    {
      id: '100.901', rubrik: 'ZEDER', name: 'Fouad Haddad', nat: 'LB', dom: 'LB', city: 'Beirut',
      born: '1952-09-01', occ: 'Construction contractor (Gulf region)',
      sow: 'Construction contracts in Saudi Arabia and the UAE', wealth: 25e6, declared: 0, risk: 'Increased',
      formA: '1985-06-11', holdMail: true, since: '1985-06-11', rm: 'J.-P. Favre', fee: 0.014, loyalty: 78,
      accounts: [['CUR', 'USD', 7900000], ['DEP', 'CHF', 6200000], ['MET', 'XAU', 3000]],
      notes: []
    },
    {
      id: '100.922', rubrik: 'MATTERHORN', name: 'Hans-Peter Ammann-Huber', nat: 'CH', dom: 'CH', city: 'Küsnacht ZH',
      born: '1940-12-05', occ: 'Entrepreneur (printing), retired', sow: 'Sale of Ammann Druck AG (1998)',
      wealth: 22e6, declared: 0.6, risk: 'Normal', formA: '1966-02-01', holdMail: false, since: '1966-02-01',
      rm: 'U. Keller', fee: 0.009, loyalty: 85,
      accounts: [['CUR', 'CHF', 1850000], ['DEP', 'CHF', 12400000], ['CUR', 'EUR', 520000]],
      notes: []
    },
    {
      id: '100.948', rubrik: 'ALBATROS', name: 'Spyros Kalogeropoulos', nat: 'GR', dom: 'GR', city: 'Piraeus',
      born: '1944-10-17', occ: 'Shipowner (dry bulk)', sow: 'Shipping income', wealth: 60e6, declared: 0,
      risk: 'Normal', formA: '1979-08-08', holdMail: true, since: '1979-08-08', rm: 'T. Hollis', fee: 0.011, loyalty: 77,
      accounts: [['CUR', 'USD', 11300000, 'E05'], ['DEP', 'CHF', 9800000, 'E05'], ['CUR', 'GBP', 380000]],
      notes: []
    },
    {
      id: '100.977', rubrik: 'SEEROSE', name: 'Dr. med. dent. Ulrike Hagedorn', nat: 'DE', dom: 'DE', city: 'München',
      born: '1957-06-22', occ: 'Dentist (own practice)', sow: 'Professional income; inheritance', wealth: 2.5e6,
      declared: 0, risk: 'Normal', formA: '1993-04-15', holdMail: true, since: '1993-04-15', rm: 'U. Keller', fee: 0.012,
      loyalty: 72,
      accounts: [['CUR', 'EUR', 640000], ['CUR', 'CHF', 85000], ['DEP', 'CHF', 780000]],
      notes: []
    },
    {
      id: '101.004', rubrik: 'PICCOLO', name: 'Rosa Benvenuti', nat: 'IT', dom: 'IT', city: 'Bergamo',
      born: '1949-03-29', occ: 'Restaurant owner (three restaurants)', sow: 'Business income (cash-intensive)',
      wealth: 1.2e6, declared: 0, risk: 'Normal', formA: null, holdMail: true, since: '2001-11-05', rm: 'C. Moretti',
      fee: 0.013, loyalty: 70,
      accounts: [['CUR', 'EUR', 412500], ['MET', 'XAU', 650]],
      notes: [n('2002-10-14', 'C. Moretti', 'Client declined again to sign Form A ("my accountant will take care of it"). To follow up.')]
    },
    {
      id: '101.026', rubrik: 'NORDLICHT', name: 'Lars Ekdahl', nat: 'SE', dom: 'SE', city: 'Stockholm',
      born: '1966-02-09', occ: 'Co-founder, mobile software company (sold 2000)', sow: 'Sale of shares (2000)',
      wealth: 9e6, declared: 0, risk: 'Normal', formA: '2000-06-26', holdMail: true, since: '2000-06-26',
      rm: 'T. Hollis', fee: 0.010, loyalty: 68,
      accounts: [['CUR', 'USD', 1900000], ['DEP', 'CHF', 3500000]],
      notes: []
    }
  ];

  D.ENTITIES = [
    { id: 'E01', name: 'Lindenhof Invest Anstalt', jur: 'LI_A', inc: '1986-03-21', bo: '100.482' },
    { id: 'E02', name: 'Caldera Holdings Ltd.', jur: 'VG', inc: '1992-02-28', bo: '100.711' },
    { id: 'E03', name: 'Meridian Trade & Finance S.A.', jur: 'PA', inc: '1998-03-30', bo: '100.802' },
    { id: 'E04', name: 'Ostara Stiftung', jur: 'LI_S', inc: '1997-09-02', bo: '100.815' },
    { id: 'E05', name: 'Thalassa Maritime Inc.', jur: 'LR', inc: '1979-06-12', bo: '100.948' }
  ];

  D.HEAT_START = { EBK: 14, US: 16, DE: 24, IT: 21, FR: 11, GB: 9 };

  // Neukunden-Profile (Akquisition)
  D.NAMES = {
    DE: { m: ['Klaus', 'Wolfgang', 'Jürgen', 'Dieter', 'Manfred', 'Gerhard', 'Helmut', 'Bernd', 'Rainer', 'Hartmut'], f: ['Ingrid', 'Sabine', 'Renate', 'Ute', 'Gisela', 'Monika'], l: ['Schäfer', 'Wagner', 'Hoffmann', 'Krämer', 'Lindner', 'Brandt', 'Seidel', 'Hartmann', 'Kessler', 'Dorn', 'Ostermann', 'Reinhardt', 'Burkhardt'], mr: 'Herr', mrs: 'Frau' },
    IT: { m: ['Giorgio', 'Roberto', 'Massimo', 'Franco', 'Paolo', 'Enrico', 'Alberto', 'Gianni', 'Marco', 'Sergio'], f: ['Luciana', 'Silvana', 'Paola', 'Graziella'], l: ['Colombo', 'Bianchi', 'Galli', 'Rinaldi', 'Fontana', 'Ferrara', 'Bassi', 'Testa', 'Marchi', 'Lombardi', 'Rizzi', 'Galbiati'], mr: 'Sig.', mrs: 'Sig.ra' },
    FR: { m: ['Jean-Claude', 'Philippe', 'Bernard', 'Michel', 'Thierry', 'Alain', 'Gérard'], f: ['Christine', 'Anne-Marie', 'Dominique', 'Monique'], l: ['Lefèvre', 'Girard', 'Bonnet', 'Mercier', 'Faure', 'Chevalier', 'Garnier', 'Lambert', 'Roussel'], mr: 'M.', mrs: 'Mme' },
    US: { m: ['Robert', 'William', 'Steven', 'Gary', 'Michael', 'Douglas', 'Kenneth'], f: ['Linda', 'Barbara', 'Patricia', 'Carol'], l: ['Caldwell', 'Hensley', 'Pruitt', 'Whitaker', 'Donovan', 'Brennan', 'Holloway', 'Sutton', 'Merrick'], mr: 'Mr', mrs: 'Mrs' },
    GB: { m: ['Charles', 'Rupert', 'Simon', 'Julian', 'Graham', 'Alistair'], f: ['Fiona', 'Penelope', 'Harriet'], l: ['Pembroke', 'Hargreaves', 'Fairfax', 'Thornton', 'Kingsley', 'Ashworth', 'Merriweather'], mr: 'Mr', mrs: 'Mrs' },
    RU: { m: ['Dmitri', 'Sergei', 'Oleg', 'Andrei', 'Viktor', 'Yuri'], f: ['Yelena', 'Irina'], l: ['Volkov', 'Sokolov', 'Morozov', 'Kuznetsov', 'Orlov', 'Belov'], mr: 'Mr', mrs: 'Mrs' },
    AR: { m: ['Martín', 'Diego', 'Alejandro', 'Ricardo', 'Horacio'], f: ['Graciela', 'Silvia'], l: ['Ferreyra', 'Pereyra', 'Sosa', 'Acosta', 'Medina', 'Ledesma'], mr: 'Sr.', mrs: 'Sra.' },
    GR: { m: ['Nikos', 'Yannis', 'Kostas', 'Dimitris', 'Stavros'], f: ['Eleni', 'Maria'], l: ['Papadakis', 'Georgiou', 'Vlachos', 'Antonopoulos', 'Karras'], mr: 'Mr', mrs: 'Mrs' },
    KZ: { m: ['Nurlan', 'Yerlan', 'Askar', 'Bolat'], f: ['Aigul'], l: ['Seitkali', 'Dzhaksybekov', 'Abenov', 'Tulegenov'], mr: 'Mr', mrs: 'Mrs' },
    NG: { m: ['Emeka', 'Babatunde', 'Musa', 'Chinedu'], f: ['Ngozi'], l: ['Okonkwo', 'Adeyemi', 'Abubakar', 'Eze'], mr: 'Chief', mrs: 'Mrs' },
    VE: { m: ['Luis', 'Rafael', 'Jesús', 'Ernesto'], f: ['Carmen'], l: ['Mendoza', 'Rangel', 'Páez', 'Urdaneta'], mr: 'Sr.', mrs: 'Sra.' }
  };

  D.PROSPECTS = [
    { c: 'DE', w: [1.5e6, 30e6], fee: [0.009, 0.013], risk: 'Normal', cash: 0.3, ccy: 'EUR', weight: 3,
      cities: ['München', 'Stuttgart', 'Düsseldorf', 'Hamburg', 'Frankfurt am Main', 'Freiburg im Breisgau'],
      occ: ['Dentist (own practice)', 'Car dealership owner', 'Surgeon', 'Owner, Mittelstand manufacturer', 'Real estate developer', 'Notary'],
      sow: ['Professional income', 'Business income', 'Inheritance', 'Sale of company'],
      intro: ['Steuerberater Dr. K. in Konstanz', 'Treuhand Kreuzlingen AG', 'existing client EDELWEISS'], refuseA: 0.08 },
    { c: 'IT', w: [0.8e6, 25e6], fee: [0.011, 0.016], risk: 'Normal', cash: 0.65, ccy: 'EUR', weight: 3,
      cities: ['Milano', 'Como', 'Bergamo', 'Brescia', 'Verona', 'Torino', 'Varese'],
      occ: ['Textile manufacturer', 'Furniture exporter', 'Construction entrepreneur', 'Restaurant chain owner', 'Steel stockholder', 'Jeweller'],
      sow: ['Business income', 'Family wealth', 'Sale of company'],
      intro: ['Fiduciaria Monte Brè SA, Lugano', 'Avv. Pellandini, Chiasso', 'existing client MONTEROSA'], refuseA: 0.25 },
    { c: 'FR', w: [1e6, 20e6], fee: [0.010, 0.014], risk: 'Normal', cash: 0.3, ccy: 'EUR', weight: 2,
      cities: ['Paris', 'Lyon', 'Nice', 'Strasbourg', 'Bordeaux', 'Annecy'],
      occ: ['Wine estate owner', 'Art dealer', 'Pharmacist', 'Heir to industrial family', 'Cardiologist'],
      sow: ['Inheritance', 'Business income', 'Sale of art collection'],
      intro: ['Maître R., notaire à Annecy', 'Fiduciaire Rhône SA, Genève', 'existing client LAFAYETTE'], refuseA: 0.1 },
    { c: 'US', w: [3e6, 50e6], fee: [0.010, 0.014], risk: 'Normal', cash: 0.04, ccy: 'USD', weight: 2,
      cities: ['Miami, Florida', 'Houston, Texas', 'Los Angeles, California', 'Palm Beach, Florida', 'New York'],
      occ: ['Real estate investor', 'Orthodontist', 'Hedge fund partner', 'Car dealer', 'Owner, construction company'],
      sow: ['Business income', 'Real estate gains', 'Investment income'],
      intro: ['an attorney in Miami', 'existing client BLUEGRASS', 'a wealth adviser in New York'], refuseA: 0.05 },
    { c: 'GB', w: [2e6, 25e6], fee: [0.010, 0.013], risk: 'Normal', cash: 0.05, ccy: 'GBP', weight: 1.5,
      cities: ['London', 'Manchester', 'Edinburgh', 'Guildford'],
      occ: ['Property developer', 'Barrister', 'Owner, retail chain', 'Racehorse owner'],
      sow: ['Business income', 'Inheritance', 'Real estate gains'],
      intro: ['a solicitor in Jersey', 'existing client KESTREL'], refuseA: 0.05 },
    { c: 'RU', w: [10e6, 120e6], fee: [0.014, 0.020], risk: 'Increased', cash: 0, ccy: 'USD', weight: 1, offshore: true,
      cities: ['Moscow', 'St. Petersburg', 'Yekaterinburg'],
      occ: ['Oil products trader', 'Metals trading', 'Telecoms investor'],
      sow: ['Trading profits', 'Privatisation proceeds'],
      intro: ['a law firm in Limassol', 'existing client SAMOWAR'], refuseA: 0.15 },
    { c: 'AR', w: [2e6, 20e6], fee: [0.012, 0.016], risk: 'Normal', cash: 0.1, ccy: 'USD', weight: 1,
      cities: ['Buenos Aires', 'Córdoba', 'Rosario'],
      occ: ['Agribusiness (soy exports)', 'Industrialist', 'Cattle rancher'],
      sow: ['Business income', 'Sale of land'],
      intro: ['an escribanía in Buenos Aires'], refuseA: 0.1 },
    { c: 'GR', w: [5e6, 60e6], fee: [0.010, 0.013], risk: 'Normal', cash: 0.1, ccy: 'USD', weight: 1,
      cities: ['Piraeus', 'Athens', 'Thessaloniki'],
      occ: ['Shipowner (tankers)', 'Ship broker'],
      sow: ['Shipping income'],
      intro: ['existing client ALBATROS'], refuseA: 0.05 },
    { c: 'KZ', w: [15e6, 90e6], fee: [0.018, 0.025], risk: 'PEP', cash: 0, ccy: 'USD', weight: 0.5, offshore: true,
      cities: ['Almaty', 'Astana'],
      occ: ['Senior official, state oil company', 'Deputy governor of a region'],
      sow: ['Consulting fees', 'Family business'],
      intro: ['a law firm in London', 'a "consultant" in Geneva'], refuseA: 0.1 },
    { c: 'NG', w: [10e6, 60e6], fee: [0.018, 0.025], risk: 'PEP', cash: 0, ccy: 'USD', weight: 0.4, offshore: true,
      cities: ['Lagos', 'Abuja'],
      occ: ['Former state governor', 'Senior official, ports authority'],
      sow: ['Business interests', 'Consulting fees'],
      intro: ['a law firm in London'], refuseA: 0.2 },
    { c: 'VE', w: [10e6, 50e6], fee: [0.018, 0.024], risk: 'PEP', cash: 0, ccy: 'USD', weight: 0.4, offshore: true,
      cities: ['Caracas', 'Maracaibo'],
      occ: ['Former director, state oil company', 'Senior official, Ministry of Finance'],
      sow: ['Consulting fees', 'Family business'],
      intro: ['existing client ORCHIDEE'], refuseA: 0.1 }
  ];

  D.TRIP_DEST = [
    { c: 'DE', city: 'Frankfurt / Munich / Stuttgart', note: 'Mittelstand owners and professionals. Steuerfahndung is active at the border.' },
    { c: 'IT', city: 'Milan / Como / Brescia', note: 'Cash-rich entrepreneurs. Guardia di Finanza checks at Chiasso.' },
    { c: 'FR', city: 'Paris / Lyon / Côte d\'Azur', note: 'Old money and professionals.' },
    { c: 'GB', city: 'London', note: 'Property and City money. Relatively low scrutiny.' },
    { c: 'US', city: 'Miami / Houston / New York', note: 'Large tickets. The IRS takes a dim view of Swiss bankers on US soil.' },
    { c: 'AR', city: 'Buenos Aires', note: 'Capital flight after the 2001 crisis. No home-country enforcement.' },
    { c: 'RU', city: 'Moscow', note: 'Very large tickets, increased-risk profiles.' }
  ];

  D.HEADLINES = [
    'Swiss Bankers Association reaffirms commitment to client confidentiality',
    'Franc firms as investors seek safe haven',
    'SMI: pharma stocks lift blue chips; banks mixed',
    'Gold steady on weaker dollar',
    'OECD renews criticism of "harmful tax practices"',
    'EU commissioner calls banking secrecy "incompatible with the single market"',
    'Private banks report steady inflows from neighbouring countries',
    'Federal Council rejects automatic exchange of information',
    'Liechtenstein trust sector under renewed scrutiny',
    'Italian government considers new tax amnesty for assets held abroad',
    'German coalition debates amnesty for undeclared foreign assets',
    'Dollar slips against franc on US current-account worries',
    'Ticino: number of cross-border commuters reaches record',
    'Confederation bonds in demand; yields edge lower',
    'Money Laundering Reporting Office (MROS) publishes annual report',
    'Euro trades sideways against franc in quiet session',
    'Singapore and Hong Kong court European private clients',
    'SNB leaves three-month Libor target range unchanged',
    'Customs officers at Chiasso report rise in cash seizures',
    'Financial magazine ranks Zurich private banks by discretion',
    'Offshore company registrations in the BVI continue to rise',
    'Oil prices climb on supply concerns',
    'Bahnhofstrasse: prime office rents unchanged',
    'Asset managers see shift from equities to bonds',
    'Federal Banking Commission warns of reputational risks in PEP business',
    'Swiss watch exports up on strong Asian demand'
  ];

  // Historische Ereignisse
  D.TIMELINE = [
    { d: '2003-03-20', news: 'Military operations in Iraq begin; equity markets rally on relief', shock: { SMI: 0.035, XAU: -0.02, USD: 0.008 } },
    { d: '2003-06-03', news: 'EU finance ministers agree savings tax package; Switzerland to levy withholding tax instead of exchanging information',
      memo: { from: 'Dr. I. Wyss, Legal & Compliance', subject: 'EU savings taxation – outcome of Luxembourg meeting', body: 'EU finance ministers have agreed on the savings tax package. Switzerland will not exchange information; instead a withholding tax ("retention") will apply to interest income of EU-resident individuals, rising in steps from 15%.\n\nEntry into force is expected in 2005. Accounts held via domiciliary companies are outside the scope.\n\nBanking secrecy is preserved. Please brief relationship managers accordingly.' } },
    { d: '2003-07-01', news: 'New EBK anti-money-laundering ordinance enters into force',
      memo: { from: 'Dr. I. Wyss, Legal & Compliance', subject: 'In force today: EBK Anti-Money-Laundering Ordinance', body: 'As of today the new EBK ordinance applies. Key points for us:\n\n1. Relationships with politically exposed persons (PEP) require approval by senior management and are subject to enhanced monitoring.\n2. Outgoing payment orders must contain the name, account number and domicile of the originator. Exceptions ("one of our clients") will be flagged by transaction monitoring (rule TM-08).\n3. Transaction monitoring alerts must be cleared promptly and documented.\n\nThe EBK will check compliance in this year\'s audit.' } },
    { d: '2004-10-26', news: 'Switzerland and EU sign Bilateral Agreements II including savings taxation; banking secrecy preserved' },
    { d: '2005-07-01', news: 'EU savings tax agreement enters into force; 15% retention on interest of EU residents', flag: 'euTax',
      memo: { from: 'Dr. I. Wyss, Legal & Compliance', subject: 'EU retention tax in force', body: 'From today, interest income of EU-resident individuals is subject to a 15% retention tax (rising to 20% in 2008 and 35% in 2011). Clients may alternatively authorise disclosure to their home tax authority.\n\nAccounts held by domiciliary companies are NOT within the scope of the agreement. We expect a number of clients to ask for restructuring.' } },
    { d: '2007-08-09', news: 'Credit markets freeze as subprime losses spread; central banks inject liquidity', shock: { SMI: -0.03, XAU: 0.01 } },
    { d: '2008-02-15', news: 'German authorities raid homes of executives after buying stolen client data from a Liechtenstein bank', heat: { DE: 12 },
      memo: { from: 'Dr. A. Vogt, Senior Partner', subject: 'Data theft in Liechtenstein – consequences for us', body: 'The German authorities have bought stolen client data from a Liechtenstein institution. Several of our German clients hold Liechtenstein structures.\n\nPlease review access rights to client data in Operations immediately. Expect nervous telephone calls.' } },
    { d: '2008-05-07', news: 'Former Swiss bank client adviser arrested in the United States in tax evasion probe', heat: { US: 10 } },
    { d: '2008-09-15', news: 'Lehman Brothers files for bankruptcy; global markets in turmoil', shock: { SMI: -0.045, XAU: 0.03, USD: -0.015 } },
    { d: '2008-10-16', news: 'Federal Council announces rescue package for largest Swiss bank', shock: { SMI: 0.02 } }
  ];
})(window.PBS);
