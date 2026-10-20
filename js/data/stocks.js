/* PBS/Web 4.2 – Börse: zusätzliche Titel für den Handel (fiktiv). Die Kursverläufe lehnen sich an
   echte Episoden an (Dotcom-Blase, Grounding 2001, Subprime, Finanzkrise, Solarblase). */
(function (PBS) {
  'use strict';

  const D = PBS.DATA;
  const t = PBS.L.t;

  // mkt: Heimatbörse; special: Sonderverlauf [Datum, Faktor]; listed/delisted: Börsengang/Ende; div: Dividendenrendite %, divM: Zahlmonat
  D.STOCKS = [
    // Schweiz (SWX)
    { id: 'BRN', name: 'Bernina Nahrungsmittel AG N', mkt: 'CH', sector: 'food', ccy: 'CHF', base: 1840, beta: 0.55, vol: 0.009, div: 2.4, divM: 4, pe: 19,
      desc: 'Chocolate, baby food and coffee capsules from Vevey and Chur. Sells in 80 countries. Dull, steady, loved by pension funds.' },
    { id: 'SCH', name: 'Schaffhauser Maschinen AG N', mkt: 'CH', sector: 'ind', ccy: 'CHF', base: 265, beta: 1.2, vol: 0.016, div: 1.8, divM: 4, pe: 15,
      desc: 'Machine tools and turbines. Orders follow the German car industry with a delay of about six months.' },
    { id: 'TIC', name: 'Ticino Telecom SA N', mkt: 'CH', sector: 'tel', ccy: 'CHF', base: 470, beta: 0.9, vol: 0.015, div: 3.2, divM: 5, pe: 17,
      special: [['1997-12-31', 1], ['2000-03-10', 1.9], ['2001-12-31', 0.8], ['2017-12-29', 0.85]],
      desc: 'Fixed lines in southern Switzerland, a mobile network since 1999 and a lot of debt from buying licences abroad.' },
    { id: 'MAT', name: 'Matterhorn Biotech AG I', mkt: 'CH', sector: 'pharma', ccy: 'CHF', base: 95, beta: 1.4, vol: 0.026, div: 0, pe: 0,
      special: [['1997-12-31', 1], ['2000-03-10', 3.1], ['2002-12-31', 0.7], ['2009-12-31', 0.9], ['2013-12-31', 1.9], ['2017-12-29', 2.2]],
      desc: 'Antibodies against rheumatism. No profit yet. Every study result moves the share by a fifth.' },
    { id: 'ZRV', name: 'Zürichsee Versicherungen AG N', mkt: 'CH', sector: 'fin', ccy: 'CHF', base: 410, beta: 1.25, vol: 0.016, div: 2.6, divM: 4, pe: 13,
      special: [['1997-12-31', 1], ['2001-12-31', 0.85], ['2002-10-09', 0.45], ['2004-12-31', 0.8], ['2017-12-29', 0.95]],
      desc: 'Life and property insurance. Bought shares at the top in 2000 and paid for it.' },
    { id: 'GLC', name: 'Glarner Chemie AG N', mkt: 'CH', sector: 'chem', ccy: 'CHF', base: 132, beta: 1.0, vol: 0.013, div: 2.1, divM: 5, pe: 16,
      desc: 'Speciality chemicals for paints and plastics. Factories in Glarus, Basel and Shanghai.' },
    { id: 'HAH', name: 'Helvetair Holding AG N', mkt: 'CH', sector: 'transp', ccy: 'CHF', base: 270, beta: 1.3, vol: 0.018, div: 1.0, divM: 5, pe: 14,
      special: [['1997-12-31', 1.6], ['1998-07-20', 1.8], ['2000-12-29', 0.9], ['2001-03-31', 0.55], ['2001-09-21', 0.2], ['2001-10-02', 0.012]],
      delisted: '2001-10-05', bust: true,
      desc: 'The national airline group and its many foreign stakes. Management calls it the "hunter strategy".',
      news: [['2001-03-31', 'Helvetair writes off its foreign airline stakes; record loss'], ['2001-10-02', 'Grounding: Helvetair planes stay on the ground, no cash for fuel']] },
    { id: 'IMS', name: 'Immobilien Seefeld AG', mkt: 'CH', sector: 'realty', ccy: 'CHF', base: 76, beta: 0.4, vol: 0.008, div: 3.6, divM: 4, pe: 22,
      special: [['1997-12-31', 0.8], ['2008-12-31', 1.2], ['2017-12-29', 1.7]],
      desc: 'Office and flats around Lake Zurich. When rates fall, it rises. Rates have been falling for a while.' },
    // USA (NYSE/NASDAQ)
    { id: 'NXS', name: 'Nexsys Networks Inc.', mkt: 'US', sector: 'tech', ccy: 'USD', base: 22, beta: 1.6, vol: 0.03, div: 0, pe: 0,
      special: [['1997-12-31', 1], ['1999-12-31', 4.2], ['2000-03-10', 5.6], ['2000-12-29', 1.6], ['2001-12-31', 0.55], ['2002-10-09', 0.25], ['2007-12-31', 0.45], ['2008-12-31', 0.25], ['2017-12-29', 0.6]],
      desc: 'Routers for the internet. At the peak the market valued it higher than General Motors.' },
    { id: 'ENC', name: 'Enercorp Energy Trading Corp.', mkt: 'US', sector: 'energy', ccy: 'USD', base: 38, beta: 1.1, vol: 0.016, div: 1.2, divM: 6, pe: 25,
      special: [['1997-12-31', 1], ['2000-08-22', 2.3], ['2001-08-14', 1.1], ['2001-10-16', 0.8], ['2001-11-28', 0.05], ['2001-12-02', 0.008]],
      delisted: '2001-12-03', bust: true,
      desc: 'Started with gas pipelines. Now trades electricity, broadband capacity and weather. The accounts are hard to read.',
      news: [['2001-08-14', 'Enercorp chief executive resigns "for personal reasons"'], ['2001-10-16', 'Enercorp books $1 billion charge; questions about off-balance-sheet partnerships'], ['2001-12-02', 'Enercorp files for Chapter 11 bankruptcy protection']] },
    { id: 'AMS', name: 'Ameri-Mart Stores Inc.', mkt: 'US', sector: 'retail', ccy: 'USD', base: 47, beta: 0.6, vol: 0.011, div: 1.5, divM: 6, pe: 24,
      desc: 'Discount supermarkets in every small town between Arkansas and Oregon. Opens one a day.' },
    { id: 'GFC', name: 'Great Falls Capital Corp.', mkt: 'US', sector: 'fin', ccy: 'USD', base: 61, beta: 1.3, vol: 0.016, div: 2.2, divM: 6, pe: 12,
      special: [['1997-12-31', 1], ['2007-02-01', 1.5], ['2008-03-17', 0.7], ['2008-09-12', 0.25], ['2008-09-15', 0.01]],
      delisted: '2008-09-16', bust: true,
      desc: 'Investment bank. Big in bonds, bigger in mortgage securities. Leverage of about 30 to 1.',
      news: [['2008-03-17', 'Great Falls Capital shares slump as rival is rescued over the weekend'], ['2008-09-15', 'Great Falls Capital files for bankruptcy after rescue talks fail']] },
    { id: 'HSM', name: 'HomeStar Mortgage Corp.', mkt: 'US', sector: 'fin', ccy: 'USD', base: 18, beta: 1.2, vol: 0.02, div: 3.0, divM: 6, pe: 9,
      special: [['1997-12-31', 0.6], ['2003-12-31', 1.4], ['2006-06-30', 2.6], ['2007-03-12', 1.1], ['2007-08-10', 0.12], ['2007-08-20', 0.01]],
      delisted: '2007-08-21', bust: true,
      desc: 'Lends to home buyers that other banks turn away. Growing fast. Very fast.',
      news: [['2007-03-12', 'HomeStar Mortgage delays annual report; defaults rising among borrowers'], ['2007-08-10', 'HomeStar Mortgage stops lending, cannot roll over its funding']] },
    { id: 'SRL', name: 'Searchly Inc. A', mkt: 'US', sector: 'tech', ccy: 'USD', base: 85, beta: 1.2, vol: 0.022, div: 0, pe: 45, listed: '2004-08-19',
      special: [['2004-08-19', 1], ['2005-12-30', 4.4], ['2007-11-06', 7.4], ['2008-11-21', 2.9], ['2009-12-31', 6.2], ['2013-12-31', 11.0], ['2017-12-29', 10.2]],
      desc: 'An internet search engine that makes money from small text ads. Went public in an online auction.',
      news: [['2004-08-19', 'Searchly goes public at $85 in an unusual online auction']] },
    { id: 'ORC', name: 'Orchard Computer Inc.', mkt: 'US', sector: 'tech', ccy: 'USD', base: 26, beta: 1.3, vol: 0.022, div: 0, pe: 30,
      special: [['1997-12-31', 0.5], ['2000-03-10', 1.6], ['2003-04-17', 0.5], ['2007-12-31', 6.3], ['2008-12-31', 3.0], ['2012-09-19', 23], ['2013-04-19', 13], ['2017-12-29', 24]],
      desc: 'Makes computers that designers like and a music player that everyone likes. A telephone is rumoured.',
      news: [['2001-10-23', 'Orchard Computer unveils pocket music player'], ['2007-01-09', 'Orchard Computer announces a mobile telephone with a touch screen']] },
    { id: 'APX', name: 'Apex Pharmaceuticals Corp.', mkt: 'US', sector: 'pharma', ccy: 'USD', base: 52, beta: 0.7, vol: 0.013, div: 2.0, divM: 6, pe: 21,
      special: [['1997-12-31', 1], ['2000-12-29', 1.4], ['2004-09-30', 0.9], ['2017-12-29', 1.2]],
      desc: 'Painkillers and cholesterol pills. Two patents run out in 2006.' },
    // Europa
    { id: 'RHA', name: 'Rheinauto AG St.', mkt: 'EU', sector: 'auto', ccy: 'EUR', base: 48, beta: 1.3, vol: 0.017, div: 2.5, divM: 5, pe: 11,
      special: [['1997-12-31', 1], ['2008-10-28', 1.2], ['2008-12-31', 0.8], ['2015-09-18', 1.3], ['2015-09-25', 0.75], ['2017-12-29', 0.95]],
      desc: 'Cars from Stuttgart and Wolfsburg area suppliers. Diesel is the future, according to the board.',
      news: [['2015-09-21', 'Rheinauto admits rigging diesel emission tests']] },
    { id: 'SOE', name: 'Solaris Energie AG', mkt: 'EU', sector: 'energy', ccy: 'EUR', base: 9, beta: 1.4, vol: 0.028, div: 0, pe: 0, listed: '2001-03-01',
      special: [['2001-03-01', 1], ['2004-12-31', 2.5], ['2007-12-31', 14], ['2008-12-31', 4], ['2011-12-30', 0.6], ['2013-12-31', 0.08], ['2017-12-29', 0.1]],
      desc: 'Solar panels from Saxony, built with generous feed-in tariffs. Chinese competitors are cheaper every year.' },
    { id: 'FRT', name: 'Frontière Télécom SA', mkt: 'EU', sector: 'tel', ccy: 'EUR', base: 30, beta: 1.3, vol: 0.02, div: 1.6, divM: 6, pe: 20,
      special: [['1997-12-31', 1], ['2000-03-10', 3.3], ['2002-09-30', 0.25], ['2004-12-31', 0.75], ['2017-12-29', 0.5]],
      desc: 'The former French state telephone company. Spent €50 billion on mobile licences and internet firms in 2000.' },
    { id: 'BIT', name: 'Banca Italica SpA', mkt: 'EU', sector: 'fin', ccy: 'EUR', base: 4.2, beta: 1.4, vol: 0.019, div: 3.5, divM: 5, pe: 10,
      special: [['1997-12-31', 1], ['2007-04-30', 1.5], ['2009-03-09', 0.5], ['2011-11-09', 0.18], ['2016-07-08', 0.05], ['2017-12-29', 0.07]],
      desc: 'A regional bank from Siena with branches all over Italy. Holds a lot of Italian government bonds.' },
    { id: 'NRC', name: 'Nordcell Oyj', mkt: 'EU', sector: 'tech', ccy: 'EUR', base: 15, beta: 1.4, vol: 0.022, div: 1.0, divM: 4, pe: 28,
      special: [['1997-12-31', 1], ['2000-06-30', 4.6], ['2002-07-31', 1], ['2007-11-30', 2.1], ['2008-12-31', 0.85], ['2012-07-18', 0.15], ['2017-12-29', 0.4]],
      desc: 'Mobile phones from Finland. Every third phone in the world. Sees no threat from computer makers.' },
    // Grossbritannien
    { id: 'BOR', name: 'British Ore & Minerals plc', mkt: 'UK', sector: 'mining', ccy: 'GBP', base: 4.1, beta: 1.1, vol: 0.02, div: 2.8, divM: 6, pe: 12,
      special: [['1997-12-31', 1], ['2002-12-31', 0.8], ['2008-05-30', 5.0], ['2008-12-31', 1.4], ['2011-04-29', 4.0], ['2015-12-31', 1.0], ['2017-12-29', 2.0]],
      desc: 'Iron ore, copper and coal from Australia, Chile and South Africa. Lives on Chinese demand.' },
    { id: 'TYM', name: 'Tyneside Mortgage plc', mkt: 'UK', sector: 'fin', ccy: 'GBP', base: 6.5, beta: 1.1, vol: 0.016, div: 3.2, divM: 6, pe: 11,
      special: [['1997-12-31', 0.7], ['2007-02-28', 1.9], ['2007-09-13', 0.9], ['2007-09-17', 0.3], ['2008-02-15', 0.15], ['2008-02-22', 0.15]],
      delisted: '2008-02-22', bust: true,
      desc: 'A former building society that funds its mortgages on the money market instead of with savings.',
      news: [['2007-09-14', 'Queues outside Tyneside Mortgage branches as savers withdraw deposits'], ['2008-02-17', 'Tyneside Mortgage to be nationalised; shareholders face total loss']] },
    // Japan
    { id: 'KYE', name: 'Kyoto Electronics K.K.', mkt: 'JP', sector: 'tech', ccy: 'JPY', base: 4200, beta: 1.0, vol: 0.017, div: 1.2, divM: 6, pe: 26,
      special: [['1997-12-31', 1], ['2000-03-10', 1.8], ['2003-04-28', 0.6], ['2007-06-29', 1.1], ['2012-11-14', 0.5], ['2017-12-29', 1.0]],
      desc: 'Televisions, cameras and game consoles. Strong yen, weak margins.' },
    { id: 'TMM', name: 'Tomoe Motor Corp.', mkt: 'JP', sector: 'auto', ccy: 'JPY', base: 3800, beta: 0.9, vol: 0.014, div: 2.0, divM: 6, pe: 13,
      special: [['1997-12-31', 1], ['2007-02-28', 2.0], ['2009-03-09', 0.8], ['2015-03-31', 2.1], ['2017-12-29', 1.8]],
      desc: 'Reliable small cars and the first mass-produced hybrid. Overtaking Detroit.' }
  ];

  D.STOCK_MKT = {
    CH: ['Switzerland (SWX)', 'CH'], US: ['USA (NYSE/Nasdaq)', 'US'],
    EU: ['Europe (Xetra, Paris, Milan, Helsinki)', 'EU'], UK: ['London (LSE)', 'GB'], JP: ['Tokyo (TSE)', 'JP']
  };
  D.SECTORS = {
    food: 'Food', ind: 'Industrials', tel: 'Telecoms', pharma: 'Pharma & biotech', fin: 'Banks & insurance', chem: 'Chemicals', transp: 'Transport',
    realty: 'Real estate', tech: 'Technology', energy: 'Energy', retail: 'Retail', auto: 'Cars', mining: 'Mining', watch: 'Watches & luxury', util: 'Utilities'
  };
  // Bestehende Aktien aus D.INSTR (Kurs aus der Hauptbewertung): Börse, Branche, Dividende
  D.INSTR_META = {
    RPH: { mkt: 'CH', sector: 'pharma', div: 1.6, divM: 4, pe: 22, desc: 'One of the two big Basel drug makers. Cancer drugs and a strong pipeline.' },
    LAL: { mkt: 'CH', sector: 'food', div: 2.2, divM: 4, pe: 20, desc: 'Cheese, milk powder and mineral water from the Lake Geneva region.' },
    GRU: { mkt: 'CH', sector: 'fin', div: 3.0, divM: 4, pe: 11, desc: 'Reinsurer from Zurich. Hurricanes and earthquakes are its business, and sometimes its problem.' },
    JUR: { mkt: 'CH', sector: 'watch', div: 1.4, divM: 5, pe: 18, desc: 'Watches from the Jura, from cheap plastic to tourbillons. Asia buys more every year.' },
    LBG: { mkt: 'CH', sector: 'fin', div: 2.8, divM: 4, pe: 12, desc: 'Big Swiss bank. Wealth management at home, investment banking in New York and London.' },
    ALP: { mkt: 'CH', sector: 'util', div: 3.4, divM: 5, pe: 15, desc: 'Hydro power from the Alps and a share in two nuclear plants.' },
    AOC: { mkt: 'US', sector: 'energy', div: 3.1, divM: 6, pe: 13, desc: 'Oil from the Gulf of Mexico and the North Sea, petrol stations across the Midwest.' },
    PEL: { mkt: 'US', sector: 'tech', div: 0, pe: 35, desc: 'Chips and circuit boards from California and Taiwan.' },
    ETS: { mkt: 'EU', sector: 'tel', div: 1.8, divM: 5, pe: 19, desc: 'Mobile networks in Spain, Portugal and Latin America.' }
  };
})(window.PBS);
