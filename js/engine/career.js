/* PBS/Web 4.2 – Karriere: Jahresziele der Partner, Bonus, Privatvermögen, Spielende, Rangliste */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  const tr = PBS.L.t;
  function S() { return G.state; }

  /* ---------- Ziele ---------- */
  K.setTargets = function (year, fraction) {
    const s = S();
    const aum = G.totalAUM();
    fraction = fraction === undefined ? 1 : fraction;
    s.career.targets = {
      year: year,
      aum: K.roundTo(aum * (1 + 0.08 * fraction), 1e6),
      profit: K.roundTo(Math.max(400000, aum * 0.0025 * fraction), 100000),
      smi: s.market.SMI,
      aum0: aum,
      reg: 50,
      set: s.date
    };
  };
  G.targetStatus = function () {
    const s = S();
    const t = s.career.targets;
    if (!t) return null;
    const profit = G.revenueYTD() - G.costYTD();
    // Vermögensziel wird an die Börsenentwicklung angepasst
    const aumTarget = K.roundTo(t.aum * (1 + 0.35 * (s.market.SMI / (t.smi || s.market.SMI) - 1)), 1e6);
    return {
      t: Object.assign({}, t, { aum: aumTarget }),
      aum: { now: G.totalAUM(), ok: G.totalAUM() >= aumTarget },
      profit: { now: profit, ok: profit >= t.profit },
      reg: { now: s.heat.EBK, ok: s.heat.EBK <= t.reg }
    };
  };

  // Jahresabschluss: Ziele beurteilen, Bonus gutschreiben, neue Ziele setzen
  K.careerYearEnd = function (year, profit, log) {
    const s = S();
    const c = s.career;
    const st = G.targetStatus();
    let hits = 0, bonus = 0;
    const lines = [];
    if (st) {
      hits = (st.aum.ok ? 1 : 0) + (st.profit.ok ? 1 : 0) + (st.reg.ok ? 1 : 0);
      lines.push('Assets under management CHF ' + U.fmtMio(st.aum.now) + ', target ' + U.fmtMio(st.t.aum) + ': ' + (st.aum.ok ? 'achieved' : 'missed'));
      lines.push('Net profit CHF ' + U.fmtMio(profit, 2) + ', target ' + U.fmtMio(st.t.profit, 2) + ': ' + (profit >= st.t.profit ? 'achieved' : 'missed'));
      lines.push('Regulator index ' + U.fmt(s.heat.EBK, 0) + ', maximum ' + st.t.reg + ': ' + (st.reg.ok ? 'achieved' : 'missed'));
    }
    if (c.confidence < 30) {
      hits = Math.max(0, hits - 1);
      lines.push('Partner confidence is low after missed or unsatisfactory partners\' meetings. This has been taken into account.');
    }
    c.confidence = Math.max(c.confidence, 55);
    bonus = Math.max(0, profit) * c.stake + hits * 100000 + (hits === 3 ? 150000 : 0);
    c.wealth += bonus;
    let verdict;
    if (hits <= 1) {
      c.missStreak++;
      verdict = c.missStreak >= 2 ? 'This is the second unsatisfactory year in succession. The partners no longer have confidence in your management.' : 'The partners are not satisfied with this result. Should next year be similar, we will draw the necessary conclusions.';
    } else {
      c.missStreak = 0;
      verdict = hits === 3 ? 'A very good year. The partners have decided to raise your partnership share by two percentage points.' : 'The partners consider the result satisfactory.';
      if (hits === 3) c.stake = Math.min(0.3, K.round(c.stake + 0.02, 2));
    }
    c.history.push({ year: year, hits: hits, bonus: bonus, profit: profit, aum: G.totalAUM(), stake: c.stake, reg: s.heat.EBK, t: st ? { aum: st.t.aum, profit: st.t.profit, reg: st.t.reg } : null });
    K.msg({
      type: 'memo', kind: 'info', from: D.PARTNERS.senior + ', Senior Partner', subject: 'Partners\' review of the year ' + year,
      body: 'Dear colleague,\n\nThe partners have reviewed the business year ' + year + ':\n\n' + lines.join('\n') + '\n\n' + verdict + '\n\nYour bonus of CHF ' + U.fmt(bonus, 0) + ' (partnership share ' + U.fmt(c.stake * 100, 0) + '% of profit, plus target bonus) has been credited to your private numbered account.\n\nWith kind regards,\n' + D.PARTNERS.senior
    });
    if (c.missStreak >= 2) { G.endGame('fired'); return; }
    K.setTargets(String(+year + 1), 1);
    log.push(['EVT', tr('PARTNERBEURTEILUNG ', 'PARTNER REVIEW ') + year, hits + tr('/3 ZIELE', '/3 TARGETS')]);
  };

  K.careerDaily = function (ret) {
    const c = S().career;
    c.wealth *= 1 + (ret.HOUSE || 0);
    c.exposure = Math.max(0, c.exposure - 0.04);
  };

  G.canRetire = function () {
    const s = S();
    return s.dayNo >= 1000 || s.date >= '2014-01-01';
  };
  G.retire = function () {
    if (!G.canRetire()) return K.err('The partners expect you to stay for at least four years.');
    G.endGame('retired');
    return { ok: true };
  };

  /* ---------- Spielende ---------- */
  G.checkGameOver = function () {
    const s = S();
    if (s.gameOver) return;
    if (s.heat.EBK >= 100) G.endGame('licence');
    else if (s.bank.capital < D.MIN_CAPITAL) G.endGame('insolvent');
  };

  G.endGame = function (kind, data) {
    const s = S();
    if (s.gameOver) return;
    data = data || {};
    const B = D.BANK, c = s.career;
    const reg = G.authName('EBK');
    let paper = 'Zürcher Finanzblatt', head, sub, body;
    let personal = '';
    switch (kind) {
      case 'licence':
        head = G.authShort('EBK') + ' withdraws banking licence of ' + B.name;
        sub = 'Liquidator appointed after "serious and repeated breaches of due-diligence obligations"';
        body = 'The ' + reg + ' has withdrawn the licence of the Zurich private bank ' + B.name + ' with immediate effect and appointed a liquidator. According to the regulator, the bank\'s management no longer offered the guarantee of irreproachable business conduct. The investigation found systematic shortcomings in the clearing of transaction-monitoring alerts and in the handling of high-risk relationships.';
        personal = 'You are barred from holding a management position in a Swiss bank.';
        break;
      case 'insolvent':
        head = B.name + ' fails: capital below legal minimum';
        sub = 'Regulator orders protective measures; clients\' deposits frozen';
        body = 'The equity capital of the private bank has fallen below the legal minimum of CHF 10 million. The ' + reg + ' has ordered protective measures and closed the bank\'s counters. Legal costs, fines and a shrinking client base had eroded the bank\'s reserves.';
        break;
      case 'indicted': {
        const a = data.auth;
        const prison = c.exposure >= 60;
        const T = {
          US: ['US indicts Zurich private bank', 'Grand jury charges ' + B.name + ' with conspiracy to defraud the United States', 'A federal grand jury has indicted ' + B.name + ' and its managing partner for helping US taxpayers to hide income from the IRS. US correspondent banks have closed the bank\'s dollar accounts; without dollar clearing the bank cannot continue to operate.'],
          DE: ['Arrest warrant against Zurich banker', 'German prosecutors accuse ' + B.short + ' of aiding tax evasion on a large scale', 'German prosecutors have issued an arrest warrant against the managing partner of ' + B.name + ' for aiding and abetting tax evasion. Documents of numerous German clients have been seized in nationwide raids. Clients are withdrawing their assets en masse; the partners have decided to wind up the bank.'],
          IT: ['Guardia di Finanza dismantles "Swiss channel"', 'Milan prosecutors charge ' + B.short + ' employees with abetting tax evasion and money laundering', 'In a large-scale operation the Guardia di Finanza has uncovered a network of couriers and accounts leading to ' + B.name + ' in Zurich. Italian prosecutors have charged the bank\'s representatives; Italian clients are fleeing. The bank is to be wound up.'],
          FR: ['Paris investigating judge targets Zurich bank', B.name + ' charged with laundering the proceeds of tax fraud', 'A Paris investigating judge has charged ' + B.name + ' with laundering the proceeds of tax fraud. Lists of French clients are in the hands of the authorities. The partners announce the orderly wind-down of the bank.'],
          GB: ['British prosecutors charge Zurich private bank', 'Disclosure orders reveal ' + B.short + ' client network', 'British prosecutors have charged ' + B.name + ' after courts granted sweeping disclosure orders against its London correspondents. The bank has lost its sterling clearing and its British clients. The partners have decided to wind up the bank.']
        }[a];
        head = T[0]; sub = T[1]; body = T[2];
        kind = prison ? 'prison' : 'indicted';
        personal = prison ? 'Your personal involvement is well documented. You are named personally in the indictment; Switzerland does not extradite its citizens for tax offences, but any trip abroad now carries the risk of arrest.' : 'You are not personally charged, but your career in banking is over.';
        break;
      }
      case 'arrested':
        head = 'Zurich banker arrested at ' + data.place;
        sub = 'Managing partner of ' + B.short + ' detained on arrival, charged with aiding tax evasion';
        body = 'The managing partner of the Zurich private bank ' + B.name + ' was arrested on arrival at ' + data.place + ' by officers of the ' + G.authName(data.auth) + '. The banker had travelled to meet a client. Prosecutors are seeking a substantial prison sentence; the bank\'s partners have suspended him with immediate effect.';
        personal = 'You face trial abroad. Your numbered account is frozen as part of the proceedings.';
        c.wealth *= 0.2;
        break;
      case 'fired':
        head = 'Leadership change at ' + B.name;
        sub = 'Partners part ways with managing partner after two disappointing years';
        body = 'The partners of ' + B.name + ' have parted ways with their managing partner "with immediate effect and by mutual agreement". Targets for asset growth and profitability had been missed for the second year in a row. The bank\'s senior partner will run the business on an interim basis.';
        personal = 'You leave with your partnership share and your private savings.';
        break;
      case 'sold':
        head = B.name + ' sold to ' + data.buyer;
        sub = 'Purchase price CHF ' + U.fmtMio(data.price) + '; private bank founded in 1871 loses its independence';
        body = 'The partners of ' + B.name + ' have agreed to sell the bank to ' + data.buyer + ' for CHF ' + U.fmtMio(data.price) + '. The brand will disappear within two years. Industry observers see the deal as a sign of the consolidation of the Swiss private banking sector under regulatory pressure.';
        c.wealth += data.price * c.stake;
        personal = 'Your partnership share of CHF ' + U.fmt(data.price * c.stake, 0) + ' has been paid out.';
        break;
      case 'retired':
        head = 'Managing partner of ' + B.short + ' retires';
        sub = '"Time to hand over": managing partner moves to the Engadine';
        body = 'After ' + Math.round(s.dayNo / 250) + ' years at the helm, the managing partner of ' + B.name + ' is stepping down. At the end of this tenure the bank managed CHF ' + U.fmtMio(G.totalAUM()) + '. "Our clients can rely on the continuity of our house," the senior partner said.';
        c.wealth += s.bank.capital * c.stake * 0.5;
        personal = 'Your partnership share was bought back for CHF ' + U.fmt(s.bank.capital * c.stake * 0.5, 0) + '.';
        break;
      case 'end':
        head = 'The end of banking secrecy';
        sub = 'Automatic exchange of information in force; ' + B.short + ' says its transformation is complete';
        body = 'With the automatic exchange of information with the EU in force, the era of Swiss banking secrecy for foreign tax evaders is over. ' + B.name + ' enters 2018 with CHF ' + U.fmtMio(G.totalAUM()) + ' of assets under management, ' + Math.round(G.activeClients().filter(function (x) { return x.declared >= 1; }).length / Math.max(1, G.activeClients().length) * 100) + '% of them declared. "We are a white-money bank now," the managing partner said.';
        c.wealth += s.bank.capital * c.stake * 0.5;
        personal = 'You stayed until the end of the era. Your partnership share is worth CHF ' + U.fmt(s.bank.capital * c.stake * 0.5, 0) + '.';
        break;
    }
    const years = s.dayNo / 250;
    const bonus = { retired: 500, sold: 300, end: 800, fired: -200, licence: -600, indicted: -800, prison: -1500, arrested: -1500, insolvent: -700 }[kind] || 0;
    const score = Math.round(c.wealth / 10000 + years * 120 + G.totalAUM() / 2e6 + Math.max(0, s.bank.capital - D.MIN_CAPITAL) / 5e5 - c.exposure * 8 + bonus);
    s.gameOver = {
      kind: kind, paper: paper, head: head, sub: sub, body: body, personal: personal, d: s.date, days: s.dayNo,
      aum: G.totalAUM(), peak: Math.max.apply(null, s.hist.map(function (h) { return h.aum; }).concat([G.totalAUM()])),
      capital: s.bank.capital, wealth: c.wealth, exposure: c.exposure, score: score,
      good: ['retired', 'sold', 'end'].indexOf(kind) >= 0
    };
    K.addFame({ name: s.meta.name, scenario: s.meta.scenario, diff: s.meta.diff, kind: kind, score: score, years: K.round(years, 1), wealth: c.wealth, d: s.date });
    G.save();
  };
})(window.PBS);
