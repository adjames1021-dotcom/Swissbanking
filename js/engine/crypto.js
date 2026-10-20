/* PBS/Web – Kryptowährungen: Kurse entlang der historischen Tageswerte (D.COINS), Bewertung von
   Kundenkonten in Coins, Handel über die Börsenmaske. Die Kurse folgen den Stützpunkten; dazwischen
   schwanken sie wie echte Coins, kehren aber immer zum historischen Verlauf zurück. */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U, K = PBS.K, G = PBS.Game;
  function S() { return G.state; }
  const C = G.crypto = {};
  D.COINS = D.COINS || [];
  const AN = {}, BY = {};
  D.COINS.forEach(function (c) {
    BY[c.id] = c;
    AN[c.id] = (c.anchors || []).map(function (p) { return [U.toDate(p[0]).getTime(), p[1]]; });
  });
  C.get = function (id) { return BY[id] || null; };
  C.list = function () { return D.COINS; };
  C.isCoin = function (ccy) { return !!BY[ccy]; };
  function anchor(c, iso) {
    const pts = AN[c.id];
    if (!pts.length) return 0;
    const ts = U.toDate(iso).getTime();
    if (ts <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (ts <= pts[i][0]) {
        const f = (ts - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return pts[i - 1][1] * Math.pow(pts[i][1] / pts[i - 1][1], f);
      }
    }
    return pts[pts.length - 1][1];
  }
  C.anchor = function (id, iso) { return BY[id] ? anchor(BY[id], iso) : 0; };
  C.listed = function (c, iso) { return iso >= c.listed; };
  C.halted = function (c, iso) { return !!c.bust && iso >= c.bust; };
  C.status = function (c) {
    const d = S().date;
    if (!C.listed(c, d)) return 'ipo';
    if (C.halted(c, d)) return 'bust';
    return 'open';
  };
  // Kurs in USD (Coins werden weltweit in Dollar gehandelt)
  C.usd = function (id) { const m = S() && S().market; return m && m[id] ? m[id] : 0; };
  C.chf = function (id) { return C.usd(id) * S().market.USD; };
  function round(c, p) { return p >= 1000 ? K.round(p, 2) : p >= 1 ? K.round(p, 4) : +p.toPrecision(4); }

  // Täglicher Schritt, angehängt an den Kursschritt der Märkte (auch für die Vorgeschichte beim Spielstart)
  function step(iso) {
    const s = S();
    if (!s || !s.market) return;
    s.cnoise = s.cnoise || {};
    D.COINS.forEach(function (c) {
      if (!C.listed(c, iso)) { delete s.market[c.id]; return; }
      if (C.halted(c, iso)) { s.market[c.id] = round(c, anchor(c, c.bust)); return; }
      const v = c.vol || 0.03;
      s.cnoise[c.id] = (s.cnoise[c.id] || 0) * (c.stable ? 0.5 : 0.93) + v * K.gauss();
      s.market[c.id] = round(c, anchor(c, iso) * Math.exp(s.cnoise[c.id]));
    });
  }
  C.step = step;
  const ms = K.marketStep;
  K.marketStep = function (prevIso, iso) {
    const r = ms.apply(this, arguments);
    step(iso);
    return r;
  };

  // Kundenkonten in Coins: Bewertung in Franken, acht Nachkommastellen
  const rate = K.rate, dec = K.dec;
  K.rate = function (ccy) { return BY[ccy] ? C.chf(ccy) : rate(ccy); };
  K.dec = function (ccy) { return BY[ccy] ? (BY[ccy].dec !== undefined ? BY[ccy].dec : 8) : dec(ccy); };
  G.rate = K.rate;
  if (G.dec === dec) G.dec = K.dec;
})(window.PBS);
