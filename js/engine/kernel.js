/* PBS/Web 4.2 – Kern: Zustand, Zufall, Arbeitszeit, Buchungen, Exposure, Meldungen, Speichern
   Game rules live in js/engine/*.js; views never change state directly. */
(function (PBS) {
  'use strict';

  const D = PBS.DATA, U = PBS.U;
  const SAVE_KEY = PBS.ERA === 'modern' ? 'pbs-vogt-save-modern' : 'pbs-vogt-save-v2';
  const SETTINGS_KEY = 'pbs-vogt-settings';
  const FAME_KEY = 'pbs-vogt-halloffame';

  const G = PBS.Game = { state: null, FOREIGN: ['US', 'DE', 'IT', 'FR', 'GB'], handlers: {} };
  // K: interne Hilfsfunktionen, die sich die Engine-Module teilen
  const K = PBS.K = { events: [], sched: {}, timeline: {}, daily: [] };
  function S() { return G.state; }
  K.S = S;

  /* ---------- Zufall (seeded, Teil des Spielstands) ---------- */
  K.rnd = function () {
    const s = S();
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  K.rint = function (a, b) { return a + Math.floor(K.rnd() * (b - a + 1)); };
  K.pick = function (arr) { return arr[Math.floor(K.rnd() * arr.length)]; };
  K.chance = function (p) { return K.rnd() < p; };
  K.between = function (a, b) { return a + K.rnd() * (b - a); };
  K.gauss = function () {
    let u = 0;
    while (u === 0) u = K.rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * K.rnd());
  };
  K.weighted = function (items, wf) {
    const ws = items.map(wf);
    const tot = ws.reduce(function (a, b) { return a + b; }, 0);
    if (tot <= 0) return null;
    let r = K.rnd() * tot;
    for (let i = 0; i < items.length; i++) {
      r -= ws[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };

  /* ---------- Hilfsfunktionen ---------- */
  K.round = function (n, dec) {
    const f = Math.pow(10, dec === undefined ? 2 : dec);
    return Math.round(n * f) / f;
  };
  K.roundTo = function (n, step) { return Math.max(step, Math.round(n / step) * step); };
  K.err = function (msg) { return { ok: false, msg: msg }; };
  K.cname = function (c) { return D.COUNTRIES[c] ? D.COUNTRIES[c].n : c; };
  K.homeAuth = function (c) { return D.COUNTRIES[c.dom] && D.COUNTRIES[c.dom].auth; };
  K.diff = function () { return D.DIFFICULTY[S().meta.diff] || D.DIFFICULTY.standard; };
  G.cname = K.cname;
  G.authShort = function (k) { return D.authShort(k, S().date); };
  G.authName = function (k) { return D.authName(k, S().date); };

  /* ---------- Arbeitszeit: 08:00–18:00, Überzeit bis 20:00 ---------- */
  K.OPEN = 8 * 60;
  K.CLOSE = 18 * 60;
  K.LOCK = 20 * 60;
  // Gibt null zurück, wenn die Zeit reicht; sonst eine Fehlermeldung
  // K.free: Zeit wurde bereits verbucht (z. B. Abschluss innerhalb eines Kundengesprächs)
  K.free = false;
  K.use = function (min) {
    const s = S();
    if (!min || K.free) return null;
    if (s.clock + min > K.LOCK) {
      return K.err('It is ' + U.fmtTime(s.clock) + '. This takes ' + min + ' minutes and security locks the building at 20:00. Run the end-of-day batch.');
    }
    const before = s.clock;
    s.clock += min;
    if (s.clock > K.CLOSE) s.overtime = (s.overtime || 0) + (s.clock - Math.max(before, K.CLOSE));
    return null;
  };
  G.timeLeft = function () { return K.LOCK - S().clock; };

  /* ---------- Kurse und Bewertung ---------- */
  K.rate = function (ccy) {
    const m = S().market;
    switch (ccy) {
      case 'CHF': return 1;
      case 'JPY': return m.JPY / 100;
      case 'XAU': return m.XAU * m.USD;
      case 'DEM': case 'FRF': case 'ITL': return m.EUR / D.LEGACY[ccy];
      default: return m[ccy];
    }
  };
  K.dec = function (ccy) { return ccy === 'XAU' ? 3 : ccy === 'ITL' ? 0 : 2; };
  K.valueCHF = function (acc) { return acc.type === 'DEP' ? acc.bal : acc.bal * K.rate(acc.ccy); };
  K.localCcy = function (c) {
    const C = D.COUNTRIES[c];
    if (!C) return 'USD';
    if (C.ccy === 'EUR' && S().date < D.EURO_DATE) return C.legacy || 'DEM';
    return C.ccy;
  };
  G.rate = K.rate;
  G.dec = K.dec;
  G.valueCHF = K.valueCHF;
  G.currencies = function () {
    return S().date < D.EURO_DATE ? ['CHF', 'USD', 'DEM', 'FRF', 'ITL', 'GBP', 'JPY'] : ['CHF', 'EUR', 'USD', 'GBP', 'JPY'];
  };

  /* ---------- Abfragen ---------- */
  G.client = function (id) { return S().clients.find(function (c) { return c.id === id; }); };
  G.account = function (id) { return S().accounts.find(function (a) { return a.id === id; }); };
  G.entity = function (id) { return S().entities.find(function (e) { return e.id === id; }); };
  G.staff = function (id) { return S().staff.find(function (x) { return x.id === id; }); };
  G.activeStaff = function (role) { return S().staff.filter(function (x) { return x.status === 'active' && (!role || x.role === role); }); };
  G.clientAccounts = function (id) { return S().accounts.filter(function (a) { return a.client === id && !a.closed; }); };
  G.clientAUM = function (id) {
    return G.clientAccounts(id).reduce(function (t, a) { return t + K.valueCHF(a); }, 0);
  };
  G.activeClients = function () { return S().clients.filter(function (c) { return c.status === 'active'; }); };
  G.totalAUM = function () {
    return G.activeClients().reduce(function (t, c) { return t + G.clientAUM(c.id); }, 0);
  };
  G.entityAUM = function (eid) {
    return S().accounts.filter(function (a) { return a.entity === eid && !a.closed; })
      .reduce(function (t, a) { return t + K.valueCHF(a); }, 0);
  };
  G.holderName = function (acc) {
    if (acc.entity) { const e = G.entity(acc.entity); if (e) return e.name; }
    const c = G.client(acc.client);
    return c ? c.name : '';
  };
  G.entitiesOf = function (cid) { return S().entities.filter(function (e) { return e.bo === cid && !e.dissolved; }); };
  G.rmName = function (c) { const r = G.staff(c.rm); return r ? r.name : '–'; };
  G.age = function (c) {
    const d = S().date;
    return +d.slice(0, 4) - +c.born.slice(0, 4) - (d.slice(5) < c.born.slice(5) ? 1 : 0);
  };
  G.pendingPayments = function () { return S().payments.filter(function (p) { return p.status === 'pending'; }); };
  G.openAlerts = function () { return S().alerts.filter(function (a) { return a.status === 'open'; }); };
  G.overdueAlerts = function () { return S().alerts.filter(function (a) { return a.status === 'open' && a.due < S().date; }); };
  G.unread = function () { return S().messages.filter(function (m) { return !m.read; }).length; };
  G.actionRequired = function () { return S().messages.filter(function (m) { return m.actions.length && !m.resolved; }); };
  G.level = function (v) {
    if (v < 25) return { label: 'Low', cls: 'ok' };
    if (v < 50) return { label: 'Moderate', cls: 'mod' };
    if (v < 75) return { label: 'High', cls: 'warn' };
    return { label: 'Critical', cls: 'bad' };
  };
  G.loyaltyLabel = function (v) {
    if (v >= 75) return { label: 'Very satisfied', cls: 'ok' };
    if (v >= 55) return { label: 'Satisfied', cls: 'ok' };
    if (v >= 35) return { label: 'Unsettled', cls: 'warn' };
    return { label: 'About to leave', cls: 'bad' };
  };
  G.moraleLabel = function (v) {
    if (v >= 70) return { label: 'Motivated', cls: 'ok' };
    if (v >= 50) return { label: 'Content', cls: 'ok' };
    if (v >= 30) return { label: 'Frustrated', cls: 'warn' };
    return { label: 'Disgruntled', cls: 'bad' };
  };
  G.exposureLabel = function (v) {
    if (v < 1) return 'low';
    if (v < 4) return 'moderate';
    if (v < 8) return 'high';
    return 'severe';
  };

  /* ---------- Buchungen, Erfolg ---------- */
  K.ytdZero = function () {
    return { fees: 0, comm: 0, fx: 0, interest: 0, trading: 0, fund: 0, retro: 0, other: 0, staff: 0, premises: 0, travel: 0, legal: 0, losses: 0, lobby: 0 };
  };
  K.REVENUE = ['fees', 'comm', 'fx', 'interest', 'trading', 'fund', 'retro', 'other'];
  K.COSTS = ['staff', 'premises', 'travel', 'legal', 'losses', 'lobby'];
  K.book = function (acc, amt, text, o) {
    const s = S();
    o = o || {};
    const dec = acc.type === 'DEP' ? 2 : K.dec(acc.ccy);
    amt = K.round(amt, dec);
    acc.bal = K.round(acc.bal + amt, dec);
    const rate = acc.type === 'DEP' ? 1 : K.rate(acc.ccy);
    const tx = {
      id: 'T' + (++s.ctr.tx), d: o.date || s.date, val: o.valuta || o.date || s.date, t: o.time || s.clock,
      acc: acc.id, client: acc.client, amt: amt, ccy: acc.ccy, bal: acc.bal, text: text, kind: o.kind || 'misc',
      cp: o.cp || '', c: o.country || '', ref: o.ref || '', chf: K.round(amt * rate), ext: !!o.ext
    };
    s.tx.push(tx);
    if (tx.ext && !o.date) { s.nnm.month += tx.chf; s.nnm.ytd += tx.chf; }
    s.today.ops = (s.today.ops || 0) + 1;
    return tx;
  };
  K.income = function (kind, chf) { const s = S(); s.bank.ytd[kind] = (s.bank.ytd[kind] || 0) + chf; s.bank.capital += chf; };
  K.expense = function (kind, chf) { const s = S(); s.bank.ytd[kind] = (s.bank.ytd[kind] || 0) + chf; s.bank.capital -= chf; };
  G.revenueYTD = function () { const y = S().bank.ytd; return K.REVENUE.reduce(function (t, k) { return t + (y[k] || 0); }, 0); };
  G.costYTD = function () { const y = S().bank.ytd; return K.COSTS.reduce(function (t, k) { return t + (y[k] || 0); }, 0); };

  /* ---------- Exposure, Stimmung ---------- */
  K.heat = function (k, v, reason) {
    const s = S();
    if (!v) return;
    if (v > 0) {
      v *= K.diff().heatUp;
      if (k === 'EBK' && s.lobby.assoc) v *= 0.85;
    }
    const before = s.heat[k];
    s.heat[k] = U.clamp(s.heat[k] + v, 0, 100);
    const real = s.heat[k] - before;
    if (Math.abs(real) < 0.0005) return;
    const last = s.heatLog.find(function (h) { return h.d === s.date && h.k === k && h.r === reason; });
    if (last) last.v += real;
    else {
      s.heatLog.unshift({ d: s.date, k: k, v: real, r: reason });
      if (s.heatLog.length > 80) s.heatLog.pop();
    }
  };
  K.personal = function (v, reason) {
    const s = S();
    const c = s.career;
    const before = c.exposure;
    c.exposure = U.clamp(c.exposure + v, 0, 100);
    if (Math.abs(c.exposure - before) > 0.05) {
      s.personalLog.unshift({ d: s.date, v: c.exposure - before, r: reason });
      if (s.personalLog.length > 40) s.personalLog.pop();
    }
  };
  K.discretion = function (v) { const s = S(); s.discretion = U.clamp(s.discretion + v, 0, 100); };
  K.loyal = function (c, v) {
    if (v < 0) v *= K.diff().leave;
    c.loyalty = U.clamp(c.loyalty + v, 0, 100);
  };
  K.morale = function (st, v) { st.morale = U.clamp(st.morale + v, 0, 100); };
  K.note = function (c, text, who) { c.notes.unshift({ d: S().date, who: who || G.rmName(c), text: text }); if (c.notes.length > 40) c.notes.pop(); };

  /* ---------- Meldungen, Termine, Agenda ---------- */
  K.msg = function (o) {
    const s = S();
    const m = Object.assign({
      id: 'M' + U.pad(++s.ctr.msg, 4), d: s.date, t: s.clock, type: 'memo', kind: 'info', from: '', subject: '', body: '',
      read: false, actions: [], resolved: null, data: {}
    }, o);
    s.messages.unshift(m);
    return m;
  };
  K.schedule = function (days, type, data) {
    const s = S();
    s.sched.push({ d: U.addBusinessDays(s.date, Math.max(1, days)), type: type, data: data || {} });
  };
  // Agenda-Einträge: Sitzungen, Telefonate, Reisen
  K.agenda = function (o) {
    const s = S();
    const a = Object.assign({ id: 'A' + U.pad(++s.ctr.agenda, 4), d: s.date, t: 9 * 60, dur: 60, kind: 'meeting', title: '', place: 'Meeting room 2', client: null, status: 'open', data: {} }, o);
    s.agenda.push(a);
    return a;
  };
  G.agendaFor = function (d) {
    return S().agenda.filter(function (a) { return a.d === d; }).sort(function (a, b) { return a.t - b.t; });
  };
  // Fällige, noch offene Termine (für Popups)
  G.agendaDue = function () {
    const s = S();
    return s.agenda.filter(function (a) { return a.d === s.date && a.status === 'open' && a.t <= s.clock; }).sort(function (a, b) { return a.t - b.t; });
  };
  G.nextAppointment = function () {
    const s = S();
    return s.agenda.filter(function (a) { return a.d === s.date && a.status === 'open' && a.t > s.clock; }).sort(function (a, b) { return a.t - b.t; })[0] || null;
  };

  /* ---------- Speichern / Laden ---------- */
  function trim(txMax, msgMax, doneMax) {
    const s = S();
    if (s.tx.length > txMax) s.tx.splice(0, s.tx.length - txMax);
    if (s.messages.length > msgMax) s.messages = s.messages.filter(function (m, i) { return i < msgMax || (m.actions.length && !m.resolved); });
    const keep = function (list, isOpen) {
      let n = 0;
      return list.filter(function (x) { return isOpen(x) || ++n <= doneMax; });
    };
    s.alerts = keep(s.alerts, function (a) { return a.status === 'open' || (a.weak && !a.audited); });
    s.payments = keep(s.payments, function (p) { return p.status === 'pending'; });
    s.agenda = s.agenda.filter(function (a) { return a.d >= U.addBusinessDays(s.date, -30); });
    if (s.mhist.length > 140) s.mhist.splice(0, s.mhist.length - 140);
    if (s.hist.length > 300) s.hist.splice(0, s.hist.length - 300);
  }
  G.save = function () {
    if (!S()) return;
    trim(4500, 220, 260);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(S()));
    } catch (e) {
      // Speicher voll: Historie stärker kürzen und erneut versuchen
      trim(1500, 80, 80);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(S())); } catch (e2) { /* Speicher nicht verfügbar */ }
    }
  };
  K.save = G.save;
  G.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const st = JSON.parse(raw);
      if (!st || st.v !== 2) return null;
      G.state = st;
      return st;
    } catch (e) { return null; }
  };
  G.hasSave = function () {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  };
  G.reset = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorieren */ }
    G.state = null;
  };
  G.settings = function () {
    let st = { sound: true, delay: true, text: 'm', bars: { std: true, addr: true, links: true, status: true }, favs: [] };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) st = Object.assign(st, JSON.parse(raw));
    } catch (e) { /* Standardwerte */ }
    return st;
  };
  G.saveSettings = function (st) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(st)); } catch (e) { /* ignorieren */ }
  };
  G.fame = function () {
    try { return JSON.parse(localStorage.getItem(FAME_KEY) || '[]'); } catch (e) { return []; }
  };
  K.addFame = function (rec) {
    const list = G.fame();
    list.push(rec);
    list.sort(function (a, b) { return b.score - a.score; });
    try { localStorage.setItem(FAME_KEY, JSON.stringify(list.slice(0, 10))); } catch (e) { /* ignorieren */ }
  };
  G.login = function (userId) {
    S().user.id = userId;
    G.save();
  };
})(window.PBS);
