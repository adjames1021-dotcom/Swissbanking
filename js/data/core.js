/* PBS/Web 4.2 – Stammdaten: Bank, Länder, BIC-Verzeichnis, Strukturen, Regeln
   All banks, persons and companies in these files are fictitious. */
(function (PBS) {
  'use strict';

  const D = PBS.DATA = PBS.DATA || {};

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
    bic: 'VOGTCHZZ',
    clearing: '8742',
    host: 'PBSPRD01',
    intranet: 'http://pbsprd01.vogt.intra/pbs/'
  };

  D.MIN_CAPITAL = 10e6;          // Mindestkapital nach Art. 4 BankV
  D.FX_SPREAD = 0.004;
  D.END_DATE = '2017-12-29';     // letzter Bankwerktag vor dem automatischen Informationsaustausch
  D.EURO_DATE = '1999-01-04';
  D.LEGACY = { DEM: 1.95583, FRF: 6.55957, ITL: 1936.27 };

  D.MARKET_LABEL = {
    USD: ['USD/CHF', 'US dollar'],
    EUR: ['EUR/CHF', 'Euro'],
    GBP: ['GBP/CHF', 'Pound sterling'],
    JPY: ['JPY/CHF (100)', 'Japanese yen'],
    XAU: ['XAU/USD', 'Gold, fine ounce'],
    SMI: ['SMI', 'Swiss Market Index'],
    LIBOR: ['CHF Libor 3M', 'Money market, % p.a.']
  };

  D.AUTH = {
    EBK: { short: 'EBK', name: 'Swiss Federal Banking Commission', c: 'CH' },
    US: { short: 'IRS / DOJ', name: 'US Internal Revenue Service', c: 'US', court: 'US District Court', city: 'Miami' },
    DE: { short: 'Steuerfahndung', name: 'German tax investigation', c: 'DE', court: 'Staatsanwaltschaft', city: 'Frankfurt' },
    IT: { short: 'Guardia di Finanza', name: 'Italian financial police', c: 'IT', court: 'Procura della Repubblica', city: 'Milan' },
    FR: { short: 'DGI', name: 'French tax administration', c: 'FR', court: 'Juge d\'instruction', city: 'Paris' },
    GB: { short: 'Inland Revenue', name: 'UK Inland Revenue', c: 'GB', court: 'Crown Prosecution Service', city: 'London' }
  };
  // Namen ändern sich mit der Zeit
  D.authShort = function (k, date) {
    if (k === 'EBK' && date >= '2009-01-01') return 'FINMA';
    if (k === 'GB' && date >= '2005-04-18') return 'HMRC';
    if (k === 'FR' && date >= '2008-04-03') return 'DGFiP';
    return D.AUTH[k].short;
  };
  D.authName = function (k, date) {
    if (k === 'EBK' && date >= '2009-01-01') return 'Swiss Financial Market Supervisory Authority';
    if (k === 'GB' && date >= '2005-04-18') return 'HM Revenue & Customs';
    if (k === 'FR' && date >= '2008-04-03') return 'French public finances directorate';
    return D.AUTH[k].name;
  };

  // Ab diesem Datum leistet die Schweiz auch bei Steuerhinterziehung Amtshilfe (neue DBA nach Art. 26 OECD-MA)
  D.AMTSHILFE = { FR: '2010-11-04', GB: '2010-12-12', DE: '2011-12-21', US: '2012-07-01', IT: '2016-07-13' };

  D.COUNTRIES = {
    CH: { n: 'Switzerland', ccy: 'CHF' },
    DE: { n: 'Germany', auth: 'DE', ccy: 'EUR', legacy: 'DEM', eu: true },
    IT: { n: 'Italy', auth: 'IT', ccy: 'EUR', legacy: 'ITL', eu: true },
    FR: { n: 'France', auth: 'FR', ccy: 'EUR', legacy: 'FRF', eu: true },
    US: { n: 'United States', auth: 'US', ccy: 'USD' },
    GB: { n: 'United Kingdom', auth: 'GB', ccy: 'GBP', eu: true },
    NL: { n: 'Netherlands', ccy: 'EUR', legacy: 'DEM', eu: true },
    AT: { n: 'Austria', ccy: 'EUR', legacy: 'DEM', eu: true },
    GR: { n: 'Greece', ccy: 'USD', eu: true },
    SE: { n: 'Sweden', ccy: 'USD', eu: true },
    BR: { n: 'Brazil', ccy: 'USD' },
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
    JE: { n: 'Jersey', ccy: 'GBP', haven: true },
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
    { bic: 'BPAUBRSP', name: 'Banco Paulista de Comércio S.A.', city: 'São Paulo', c: 'BR' },
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
    { bic: 'SHBTJESH', name: 'St Helier Bank & Trust Ltd.', city: 'St Helier', c: 'JE' },
    { bic: 'PBOBNRNR', name: 'Pacific Basin Offshore Bank Ltd.', city: 'Yaren', c: 'NR' },
    { bic: 'LEMPCHGG', name: 'Banque Léman Privée SA', city: 'Genève', c: 'CH' },
    { bic: 'ZGBKCHZZ', name: 'Zürcher Gewerbebank AG', city: 'Zürich', c: 'CH' }
  ];
  D.bankByBic = function (bic) {
    bic = String(bic || '').toUpperCase().slice(0, 8);
    return D.BANKS.find(function (b) { return b.bic === bic; }) || null;
  };
  D.banksIn = function (c) { return D.BANKS.filter(function (b) { return b.c === c; }); };
  D.HAVEN_BANKS = ['RTPBLI22', 'NFBTBSNS', 'CMTBKYKY', 'BIPAPAPA', 'SPBLSGSG', 'KCBKHKHH', 'TCBLCY2L', 'EPBKAEAD', 'SHBTJESH'];

  // Strukturen: Gründungskosten und Abschirmwirkung (shield: Faktor auf Exposure; tiefer = besser)
  D.JURIS = {
    VG: { c: 'VG', kind: 'company', label: 'British Virgin Islands – IBC', form: 'International Business Company', suffix: 'Ltd.', agent: 'Tortola Corporate Services Ltd., Road Town', setup: 9500, annual: 3800, shield: 0.45 },
    PA: { c: 'PA', kind: 'company', label: 'Panama – Sociedad Anónima', form: 'Sociedad Anónima', suffix: 'S.A.', agent: 'Bufete Arosemena & Asociados, Panamá', setup: 7200, annual: 3200, shield: 0.5 },
    BS: { c: 'BS', kind: 'company', label: 'Bahamas – IBC', form: 'International Business Company', suffix: 'Ltd.', agent: 'Bay Street Nominees Ltd., Nassau', setup: 8800, annual: 3500, shield: 0.5 },
    LR: { c: 'LR', kind: 'company', label: 'Liberia – Corporation', form: 'Corporation', suffix: 'Inc.', agent: 'Monrovia Registry Services, Monrovia', setup: 6800, annual: 3000, shield: 0.55 },
    LI_A: { c: 'LI', kind: 'company', label: 'Liechtenstein – Anstalt (establishment)', form: 'Anstalt', suffix: 'Anstalt', agent: 'Treuhand Rheinberg reg., Vaduz', setup: 18500, annual: 7000, shield: 0.4 },
    LI_S: { c: 'LI', kind: 'foundation', label: 'Liechtenstein – Stiftung (foundation)', form: 'Stiftung', suffix: 'Stiftung', agent: 'Treuhand Rheinberg reg., Vaduz', setup: 24000, annual: 9500, shield: 0.32 },
    JE_T: { c: 'JE', kind: 'trust', label: 'Jersey – discretionary trust', form: 'Discretionary trust', suffix: 'Trust', agent: 'Seigneurie Trustees Ltd., St Helier', setup: 28000, annual: 12000, shield: 0.3 },
    KY_T: { c: 'KY', kind: 'trust', label: 'Cayman Islands – STAR trust', form: 'STAR trust', suffix: 'Trust', agent: 'Seven Mile Fiduciary Ltd., George Town', setup: 32000, annual: 14000, shield: 0.28 },
    LI_INS: { c: 'LI', kind: 'insurance', label: 'Liechtenstein – life insurance wrapper', form: 'Unit-linked life policy', suffix: 'Policy', agent: 'Rheintal Life AG, Vaduz', setup: 15000, annual: 6000, shield: 0.33 }
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
  // Routinefälle, die das Compliance-Team selbst erledigen darf
  D.RULES_ROUTINE = ['TM-01', 'TM-02', 'TM-06', 'TM-08'];

  D.JUSTIFICATIONS = [
    ['sale', 'Proceeds from sale of business or real estate'],
    ['inherit', 'Inheritance / gift within family'],
    ['income', 'Regular business income, dividends or salary'],
    ['own', 'Transfer between client\'s own accounts'],
    ['loan', 'Repayment of private loan'],
    ['phone', 'Client explanation obtained by telephone (file note)']
  ];

  D.CODEWORDS = ['ALPENROSE', 'ENZIAN', 'GRIMSEL', 'FURKA', 'SÄNTIS', 'PILATUS', 'RIGI', 'GEMSE', 'STEINBOCK',
    'BERGDOHLE', 'KASTANIE', 'LÄRCHE', 'ARVE', 'LORBEER', 'MIMOSA', 'ZYKLAME', 'JASMIN', 'OPAL', 'TOPAS', 'SAPHIR',
    'ONYX', 'KRISTALL', 'FALKE', 'SPERBER', 'REIHER', 'KRANICH', 'DELPHIN', 'KOMPASS', 'LEUCHTTURM', 'GLETSCHER',
    'BERNINA', 'GOTTHARD', 'SPLÜGEN', 'MALOJA', 'ALBULA', 'TÖDI', 'GLÄRNISCH', 'SILVRETTA', 'MARMOR', 'GRANIT',
    'BERNSTEIN', 'KORALLE', 'PERLE', 'NARZISSE', 'VEILCHEN', 'HOLUNDER', 'WACHOLDER', 'SCHWALBE', 'MÖWE', 'ADLER',
    'HERMELIN', 'MURMELTIER', 'LUCHS', 'FUCHS', 'EICHHORN', 'SPHINX', 'ORION', 'KASSIOPEIA', 'POLARIS', 'VESPER',
    'ZIRBE', 'SEIDELBAST', 'BIBER', 'AUERHAHN', 'KOLIBRI', 'PELIKAN', 'TUKAN', 'MERKUR', 'SATURN', 'NEPTUN'];

  D.DIFFICULTY = {
    discreet: { label: 'Discreet', desc: 'Forgiving. Authorities are slow, clients are patient.', heatUp: 0.75, heatDecay: 1.4, inv: 0.7, leave: 0.6, threat: 0.75, capital: 1.2 },
    standard: { label: 'Standard', desc: 'Balanced.', heatUp: 1, heatDecay: 1, inv: 1, leave: 1, threat: 1, capital: 1 },
    hostile: { label: 'Hostile', desc: 'Authorities react fast, clients leave at the first sign of trouble.', heatUp: 1.3, heatDecay: 0.75, inv: 1.35, leave: 1.4, threat: 1.3, capital: 0.85 }
  };

  // Standorte: Hauptsitz, Filialen, Repräsentanzen, Tochterbanken
  D.LOCATIONS = {
    ZH: { name: 'Zürich (head office)', kind: 'HQ', c: 'CH', setup: 0, daily: 4000, seats: 30, boxes: 120 },
    GE: { name: 'Genève – branch', kind: 'branch', c: 'CH', setup: 1000000, daily: 3000, seats: 12, boxes: 80, boost: { FR: 1.8, LB: 1.6, AE: 1.5, RU: 1.3 }, from: '1990-01-01', note: 'French-speaking and Middle East clients. Own cash desk and vault.' },
    LU: { name: 'Lugano – branch', kind: 'branch', c: 'CH', setup: 800000, daily: 2500, seats: 10, boxes: 100, boost: { IT: 2.2 }, courier: 0.7, from: '1990-01-01', note: 'Twenty minutes from the Italian border. Couriers run safer and cheaper.' },
    MIL: { name: 'Milano – representative office', kind: 'rep', c: 'IT', setup: 250000, daily: 1000, seats: 2, boost: { IT: 1.5 }, heat: 0.04, from: '1990-01-01', note: 'Client contact on site. Illegal to take deposits; raids possible.' },
    MIA: { name: 'Miami – representative office', kind: 'rep', c: 'US', setup: 400000, daily: 1500, seats: 2, boost: { US: 1.5, AR: 1.8, VE: 1.8, BR: 1.8 }, heat: 0.06, from: '1990-01-01', note: 'Latin American and US clients. The IRS is not far away.' },
    DXB: { name: 'Dubai – representative office', kind: 'rep', c: 'AE', setup: 300000, daily: 1200, seats: 2, boost: { AE: 1.8, LB: 1.4, RU: 1.4, KZ: 1.6 }, from: '2004-01-01', note: 'Gulf, Levant and CIS clients.' },
    NAS: { name: 'Nassau – Vogt & Cie (Bahamas) Ltd.', kind: 'sub', c: 'BS', setup: 5000000, daily: 2000, seats: 3, shield: 0.5, shieldLate: 0.8, lateFrom: '2010-01-01', from: '1990-01-01', note: 'Booking centre. Assets booked here are out of reach of Swiss mutual assistance – until the Bahamas sign information-exchange treaties.' },
    SIN: { name: 'Singapore – Vogt & Cie (Asia) Pte. Ltd.', kind: 'sub', c: 'SG', setup: 10000000, daily: 3000, seats: 4, shield: 0.55, shieldLate: 1.0, lateFrom: '2015-01-01', from: '2001-01-01', note: 'Booking centre in Asia. Popular with European clients who fear the EU tax agreements.' }
  };

  D.LAWYERS = {
    ch: { name: 'Bär & Imhof Rechtsanwälte, Zürich', cost: 400000, factor: 0.75, scope: 'all', note: 'White-collar defence. Slows every foreign investigation.' },
    us: { name: 'Hartley Crane Winslow LLP, Washington DC', cost: 900000, factor: 0.55, scope: 'US', note: 'Former Department of Justice prosecutors. Strongly slows US proceedings.' }
  };
  D.LOBBY = {
    assoc: { name: 'Active membership Swiss Bankers Association (committees)', cost: 80000, note: 'Regulator attention builds up 15% slower. Early warning of political developments.' },
    board: { name: 'Board seat for a member of the National Council', cost: 150000, note: 'Faster easing of regulator attention, foreign pressure eases faster. Risk of press scandal.' }
  };

  D.USD_CORRESPONDENTS = ['Hudson Atlantic Trust Company, New York', 'Pemberton National Bank, New York', 'Gotham Clearing Bank, New York', 'Liberty Exchange Bank, Newark'];

  D.FEE_LEVELS = {
    discount: { label: 'Discount', mult: 0.85, loyalty: 5, prospects: 1.3 },
    standard: { label: 'Standard', mult: 1, loyalty: 0, prospects: 1 },
    premium: { label: 'Premium', mult: 1.2, loyalty: -7, prospects: 0.75 }
  };

  D.BOX_SIZES = { S: { label: 'Small (5 × 30 cm)', fee: 300 }, M: { label: 'Medium (15 × 30 cm)', fee: 650 }, L: { label: 'Large (30 × 60 cm)', fee: 1500 } };
})(window.PBS);
