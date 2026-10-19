/* PBS/Web 4.2 – Zeitgeschehen 1998–2017 und Schlagzeilen
   fx: Schlüssel für Spielwirkungen in engine/events.js */
(function (PBS) {
  'use strict';

  const D = PBS.DATA;

  D.HEADLINES = {
    any: [
      'Swiss Bankers Association reaffirms commitment to client confidentiality',
      'Franc firms as investors seek safe haven',
      'SMI: pharma stocks lift blue chips; banks mixed',
      'Private banks report steady inflows from neighbouring countries',
      'Liechtenstein trust sector under renewed scrutiny',
      'Ticino: number of cross-border commuters reaches record',
      'Confederation bonds in demand; yields edge lower',
      'Money Laundering Reporting Office (MROS) publishes annual report',
      'Customs officers at Chiasso report rise in cash seizures',
      'Financial magazine ranks Zurich private banks by discretion',
      'Bahnhofstrasse: prime office rents unchanged',
      'Swiss watch exports up on strong demand',
      'Asset managers see shift from equities to bonds',
      'Offshore company registrations in the BVI continue to rise'
    ],
    early: [
      'Euro preparations: banks convert systems ahead of 1999',
      'Millennium bug: Federal Banking Commission asks banks for test reports',
      'Technology stocks extend rally; analysts see "new economy"',
      'Italian government considers new tax amnesty for assets held abroad',
      'German coalition debates amnesty for undeclared foreign assets',
      'OECD renews criticism of "harmful tax practices"',
      'EU commissioner calls banking secrecy "incompatible with the single market"',
      'Federal Council rejects automatic exchange of information',
      'Dollar slips against franc on US current-account worries'
    ],
    late: [
      'Hedge funds attract record inflows from private banks',
      'Singapore and Hong Kong court European private clients',
      'Federal Banking Commission warns of reputational risks in PEP business',
      'Oil prices climb to new records',
      'Private banks hire compliance staff at record pace',
      'US subprime mortgage defaults rise'
    ],
    crisis: [
      'Federal Council: banking secrecy "not negotiable"',
      'German finance minister threatens Switzerland with the "cavalry"',
      'Swiss banks advise US clients to "regularise" their accounts',
      'Voluntary disclosures in Germany reach record numbers',
      'Client data: banks tighten IT access rights',
      'SNB intervenes against strong franc',
      'Private banks merge as margins shrink',
      'Wealth managers relocate clients to Asia',
      'Negative interest rates weigh on bank margins',
      'White-money strategy: banks promise "tax-compliant assets only"'
    ]
  };

  D.TIMELINE = [
    { d: '1998-04-01', news: 'Federal Money Laundering Act (GwG) enters into force; reporting office MROS starts work', flag: 'gwg',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'In force today: Money Laundering Act (GwG)', body: 'From today the Money Laundering Act applies. Suspicious relationships must be reported to the new reporting office MROS (Art. 9 GwG); the assets are frozen for five days. Our transaction monitoring rules have been adapted.\n\nNote: the client must not be informed of a report.' } },
    { d: '1998-08-17', news: 'Russia defaults on its debt; rouble collapses', shock: { SMI: -0.045, XAU: 0.01 }, fx: 'ruCrisis' },
    { d: '1998-09-23', news: 'US hedge fund LTCM rescued by consortium of banks', shock: { SMI: -0.025 } },
    { d: '1999-01-04', news: 'Euro introduced as book money; DEM, FRF and ITL accounts converted', fx: 'euro',
      memo: { from: 'Rolf Gisler, Operations', subject: 'Euro conversion completed', body: 'Over the weekend all accounts in Deutsche Mark, French francs and Italian lire have been converted into euro at the irrevocably fixed rates (1 EUR = 1.95583 DEM = 6.55957 FRF = 1936.27 ITL).\n\nBanknotes in the old currencies remain legal tender until early 2002. Our cash desk continues to accept them.' } },
    { d: '1999-12-30', news: 'Millennium bug: banks put IT staff on standby over New Year', fx: 'y2k' },
    { d: '2000-03-10', news: 'Technology index reaches all-time high' },
    { d: '2001-01-01', news: 'US "Qualified Intermediary" rules apply to Swiss banks holding US securities', fx: 'qi',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'US Qualified Intermediary agreement in force', body: 'As a Qualified Intermediary we must either disclose US persons holding US securities to the IRS (form W-9) or ensure they hold no US securities.\n\nIn practice: US clients who do not wish to be disclosed must sell their US securities. Their non-US assets are not affected. Relationship managers have been instructed accordingly.' } },
    { d: '2001-09-12', news: 'Terror attacks in the United States; markets slump', shock: { SMI: -0.07, XAU: 0.05, USD: -0.03 }, heat: { EBK: 3 },
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'Terrorist financing – screening of lists', body: 'Following the attacks, the authorities have published lists of persons and organisations suspected of financing terrorism. Operations is screening our client base. Expect closer scrutiny of all unusual transactions by the regulator.' } },
    { d: '2002-01-01', news: 'Euro banknotes and coins in circulation' },
    { d: '2002-03-25', news: 'US tax authority obtains data on offshore credit cards from card companies', fx: 'cardSummons' },
    { d: '2003-03-20', news: 'Military operations in Iraq begin; equity markets rally on relief', shock: { SMI: 0.035, XAU: -0.02, USD: 0.008 } },
    { d: '2003-06-03', news: 'EU finance ministers agree savings tax package; Switzerland to levy withholding tax instead of exchanging information',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'EU savings taxation – outcome of Luxembourg meeting', body: 'EU finance ministers have agreed on the savings tax package. Switzerland will not exchange information; instead a withholding tax ("retention") will apply to interest income of EU-resident individuals, rising in steps from 15%.\n\nEntry into force is expected in 2005. Accounts held via domiciliary companies and insurance wrappers are outside the scope.\n\nBanking secrecy is preserved.' } },
    { d: '2003-07-01', news: 'New EBK anti-money-laundering ordinance enters into force', flag: 'gwv',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'In force today: EBK Anti-Money-Laundering Ordinance', body: 'As of today the new EBK ordinance applies:\n\n1. Relationships with politically exposed persons (PEP) require approval by senior management and enhanced monitoring.\n2. Outgoing payment orders must contain the name, account number and domicile of the originator. Exceptions ("one of our clients") will be flagged (rule TM-08).\n3. Transaction monitoring alerts must be cleared promptly and documented.\n\nThe EBK will check compliance in this year\'s audit.' } },
    { d: '2004-10-26', news: 'Switzerland and EU sign Bilateral Agreements II including savings taxation; banking secrecy preserved' },
    { d: '2005-04-18', news: 'UK: Inland Revenue and Customs merged into HM Revenue & Customs' },
    { d: '2005-07-01', news: 'EU savings tax agreement enters into force; 15% retention on interest of EU residents', flag: 'euTax', fx: 'euTax',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'EU retention tax in force', body: 'From today, interest income of EU-resident individuals is subject to a 15% retention tax (20% from 2008, 35% from 2011). Clients may alternatively authorise disclosure to their home tax authority.\n\nAccounts held by domiciliary companies, trusts and insurance wrappers are NOT within the scope. We expect a number of clients to ask for restructuring.' } },
    { d: '2007-08-09', news: 'Credit markets freeze as subprime losses spread; central banks inject liquidity', shock: { SMI: -0.03, XAU: 0.01 } },
    { d: '2008-02-15', news: 'German authorities raid homes of executives after buying stolen client data from a Liechtenstein bank', heat: { DE: 12 },
      memo: { from: 'Dr. Albert Vogt, Senior Partner', subject: 'Data theft in Liechtenstein – consequences for us', body: 'The German authorities have bought stolen client data from a Liechtenstein institution. Several of our German clients hold Liechtenstein structures.\n\nPlease review access rights to client data in IT and Operations immediately. Expect nervous telephone calls.' } },
    { d: '2008-05-07', news: 'Former Swiss bank client adviser arrested in the United States in tax evasion probe', heat: { US: 10 } },
    { d: '2008-07-17', news: 'US Senate hearing: Swiss banks helped Americans hide billions', heat: { US: 6 } },
    { d: '2008-09-15', news: 'Lehman Brothers files for bankruptcy; global markets in turmoil', shock: { SMI: -0.045, XAU: 0.03, USD: -0.015 } },
    { d: '2008-10-16', news: 'Federal Council announces rescue package for largest Swiss bank', shock: { SMI: 0.02 } },
    { d: '2008-12-11', news: 'New York investment adviser arrested – his funds were a giant Ponzi scheme', fx: 'hedgeFraud' },
    { d: '2009-01-01', news: 'FINMA takes over from the Federal Banking Commission', flag: 'finma',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'FINMA replaces the EBK', body: 'From today the Swiss Financial Market Supervisory Authority FINMA supervises banks, insurers and securities dealers. The EBK\'s files and open proceedings have been transferred. FINMA has announced a more "intrusive" style of supervision.' } },
    { d: '2009-02-18', news: 'Largest Swiss bank admits helping US clients evade taxes; hands over client names and pays USD 780 million', heat: { US: 18 }, fx: 'ubsDeal' },
    { d: '2009-03-13', news: 'Federal Council adopts OECD standard: administrative assistance also in cases of tax evasion', fx: 'oecd',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'End of the distinction between evasion and fraud', body: 'The Federal Council will grant administrative assistance in line with Art. 26 of the OECD model treaty – including for simple tax evasion – once the double taxation agreements have been renegotiated.\n\nUntil the new treaties are in force, the old rules apply. After that, objecting to a request on the grounds that it concerns only tax evasion will no longer succeed.\n\nExpected dates: France 2010, United Kingdom 2010, Germany 2011, United States 2012, Italy later.' } },
    { d: '2009-08-19', news: 'Switzerland agrees to process US request for data on 4,450 accounts', heat: { US: 8 } },
    { d: '2009-12-09', news: 'French authorities obtain stolen client data from a Geneva bank', heat: { FR: 10 } },
    { d: '2010-02-01', news: 'Germany buys CD with stolen Swiss bank client data', heat: { DE: 10 }, fx: 'cd' },
    { d: '2010-03-18', news: 'US enacts FATCA: foreign banks must report US account holders from 2014',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'FATCA', body: 'The US has enacted the Foreign Account Tax Compliance Act. From July 2014 every foreign bank must identify and report US persons – or face a 30% withholding on US payments.\n\nThere will be no place left for undeclared US money. Our recommendation: regularise or close all remaining US relationships before 2014.' } },
    { d: '2011-09-06', news: 'SNB sets minimum exchange rate of CHF 1.20 per euro', shock: { SMI: 0.03 } },
    { d: '2012-01-27', news: 'Oldest Swiss private bank closes after US indictment', heat: { US: 8 } },
    { d: '2012-10-30', news: 'Federal Supreme Court: retrocessions belong to the client', fx: 'retro' },
    { d: '2012-12-12', news: 'German upper house rejects tax agreement with Switzerland' },
    { d: '2013-01-01', news: 'Withholding tax agreements with UK and Austria in force', fx: 'rubik' },
    { d: '2013-08-29', news: 'US Department of Justice announces programme for Swiss banks', fx: 'usProgram' },
    { d: '2014-07-01', news: 'FATCA in force – Swiss banks report US accounts', fx: 'fatca' },
    { d: '2014-10-29', news: 'Switzerland commits to automatic exchange of information from 2017' },
    { d: '2015-01-15', news: 'SNB abandons minimum exchange rate; franc soars, introduces negative rates', shock: { SMI: -0.09 }, fx: 'snb' },
    { d: '2015-05-27', news: 'Switzerland and EU sign agreement on automatic exchange of information', fx: 'aeoiSigned',
      memo: { from: 'Dr. Iris Wyss, Legal & Compliance', subject: 'Automatic exchange of information with the EU', body: 'Switzerland and the EU have signed the agreement. Account data will be collected from 1 January 2017 and exchanged from 2018.\n\nEvery remaining undeclared EU client must regularise by the end of 2017 or leave. Banking secrecy towards foreign tax authorities is effectively over.' } },
    { d: '2016-04-04', news: '"Panama Papers": leak from a Panamanian law firm exposes offshore companies worldwide', fx: 'panama' },
    { d: '2017-01-02', news: 'Automatic exchange of information: banks start collecting data for EU tax authorities', fx: 'aeoi' }
  ];
})(window.PBS);
