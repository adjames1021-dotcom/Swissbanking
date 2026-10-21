/* PBS/Web – die Epoche 2018–2025: Startmeldungen, Neukunden nach dem Ende des Bankgeheimnisses,
   Schlagzeilen zum Spielende. Wirkt nur in modernen Spielständen (meta.era === 'modern'). */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }
  function modern() { const s = S(); return !!(s && s.meta && s.meta.era === 'modern'); }
  const SENIOR = function () { return D.PARTNERS.senior + ', Senior Partner'; };
  const COMP = 'Dr. Katharina Imhof, Head Legal & Compliance';
  // Die neue Plattform läuft unter eigener Adresse
  if (PBS.modern()) D.BANK.intranet = 'https://private.vogt.intra/app/';

  /* ---------- Erster Arbeitstag ---------- */
  K.modernOpening = function (start, sc) {
    const s = S();
    const n = G.activeClients().length;
    const crypto = s.accounts.filter(function (a) { return !a.closed && G.crypto && G.crypto.isCoin(a.ccy); }).length;
    const intro = start >= '2021-01-01'
      ? 'Bitcoin closed the year above USD 29,000 and half of Zug wants to open an account with us. The SNB is still at minus 0.75%, so deposits cost us money. Covid has the whole team working from home three days a week.'
      : 'This is the first year of the automatic exchange of information. Our clients\' accounts are now reported to their tax offices every September. Most of them regularised in the last two years; those who would not have left.';
    K.msg({
      t: 17 * 60 + 5, d: U.addBusinessDays(start, -1), type: 'memo', from: SENIOR(), subject: 'Handover',
      body: 'Dear colleague,\n\nAs agreed among the partners, you take over operational management of the bank from ' + U.longDate(start) + '. I stay on as Senior Partner, but the decisions are yours.\n\n' + intro + '\n\n' +
        'We look after roughly CHF ' + Math.round(G.totalAUM() / 1e6) + ' million for ' + n + ' relationships' + (crypto ? ', ' + crypto + ' of the accounts in crypto' : '') + '. Margins are thinner than they were, the regulator reads everything we send, and the rules on money laundering and sanctions are the ones that can close a bank now.\n\n' +
        'Crypto custody and the trading desk are where the growth is. Please keep an eye on where the coins come from.\n\nKind regards\n' + D.PARTNERS.senior
    });
    K.msg({
      t: 7 * 60 + 52, type: 'memo', from: COMP, subject: 'Compliance: priorities for this year',
      body: 'Good morning,\n\nThree things for your desk:\n\n1. Every incoming coin transfer goes through chain analysis before it is credited. Anything with exposure to mixers, darknet markets or sanctioned addresses stays blocked until I have cleared it.\n2. Sanctions screening runs every night against the SECO, EU, UN and OFAC lists. A hit means the account is frozen and reported, no exceptions.\n3. FINMA wants our updated risk analysis for digital assets by the end of the quarter.\n\nOpen alerts are under Compliance > Alerts.\n\nKatharina Imhof'
    });
  };

  /* ---------- Neukunden ab 2018: nur noch versteuertes Geld ---------- */
  const OCC = [
    ['Founder of a software company (sold to a US group)', 'Sale of shares in own company'],
    ['Early bitcoin investor, now runs a crypto fund in Zug', 'Gains on cryptocurrencies held since 2013, documented with exchange statements'],
    ['Family office of an industrial family', 'Dividends and sale of a family business'],
    ['Surgeon, owner of a private clinic', 'Professional income and clinic profits'],
    ['Partner in a law firm', 'Professional income and inheritance'],
    ['Heir to a retail group', 'Inheritance'],
    ['Former professional footballer', 'Salary and endorsement income'],
    ['Shipping entrepreneur', 'Sale of vessels and company profits']
  ];
  const gen = K.genProspect;
  K.genProspect = function () {
    const pr = gen.apply(this, arguments);
    if (!modern() || !pr) return pr;
    const o = K.pick(OCC);
    pr.occ = o[0];
    pr.sow = o[1];
    pr.declared = 1;
    pr.refuseA = false;
    pr.sting = false;
    if (pr.method === 'cash' || pr.method === 'offshore') pr.method = K.chance(0.5) ? 'ch' : 'home';
    return pr;
  };

  /* ---------- Spielende ---------- */
  const end = G.endGame;
  G.endGame = function (kind) {
    const r = end.apply(this, arguments);
    const s = S();
    if (!modern() || !s.gameOver) return r;
    const go = s.gameOver, B = D.BANK;
    if (go.kind === 'end') {
      go.head = B.short + ' reaches the summer of 2025 intact';
      go.sub = 'Private bank weathered Credit Suisse, FTX and the sanctions years';
      go.body = 'While larger names disappeared, ' + B.name + ' came through seven difficult years. The bank now manages CHF ' + U.fmtMio(G.totalAUM()) + ', with crypto custody a growing part of the business. Competitors expect consolidation among small Zurich private banks to continue.';
      go.personal = 'You stayed until mid-2025. ' + go.personal.replace(/^You stayed until the end of the era\. /, '');
    }
    G.save();
    return r;
  };

  // Freigabe der modernen Epoche (Desktop-Symbol, Direktlink ?era=modern)
  D.MODERN_READY = true;
})(window.PBS);
