/* PBS/Web 4.2 – Allgemeine Hilfsfunktionen (Formatierung, Datum, IBAN)
   Bankhaus Vogt & Cie, Informatik / IT-Services */
window.PBS = window.PBS || {};

(function (PBS) {
  'use strict';

  const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Ländereinstellungen (Systemsteuerung › Regional Options). lang: Begriffe schweizerisch oder englisch,
  // num: Tausendertrennzeichen, date: Datumsformat, time: 24/12 Stunden, ccy: Anzeigewährung für CHF-Beträge
  const LKEY = 'pbs-vogt-locale';
  const L = PBS.L = { lang: 'ch', num: 'ch', date: 'ch', time: '24', ccy: 'CHF' };
  try { Object.assign(L, JSON.parse(localStorage.getItem(LKEY) || '{}')); } catch (x) { /* Standard */ }
  L.save = function () { try { localStorage.setItem(LKEY, JSON.stringify({ lang: L.lang, num: L.num, date: L.date, time: L.time, ccy: L.ccy })); } catch (x) { /* nicht verfügbar */ } };
  // Epoche des Arbeitsplatzes: 'classic' (Windows 2000, 1998–2017) oder 'modern' (2018–2025); eigener Spielstand je Epoche
  try { PBS.ERA = localStorage.getItem('pbs-vogt-era') === 'modern' ? 'modern' : 'classic'; } catch (x) { PBS.ERA = 'classic'; }
  PBS.modern = function () { return PBS.ERA === 'modern'; };
  // Text in der gewählten Sprache: t('Kontoauszug', 'Account statement')
  L.t = function (ch, en) { return L.lang === 'en' && en !== undefined ? en : ch; };

  // Zahlenformat: 1'250'000.00 (Schweiz) oder 1,250,000.00 (englisch)
  function fmt(n, dec) {
    if (dec === undefined) dec = 2;
    if (n === null || n === undefined || isNaN(n)) return '–';
    const neg = n < 0 && Math.abs(n) >= Math.pow(10, -dec) / 2;
    const parts = Math.abs(n).toFixed(dec).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, L.num === 'en' ? ',' : '\'');
    return (neg ? '-' : '') + parts.join('.');
  }

  function fmtMio(n, dec) {
    return fmt(n / 1e6, dec === undefined ? 1 : dec) + (L.lang === 'en' ? ' million' : ' Mio.');
  }

  function parseAmount(str) {
    if (typeof str === 'number') return str;
    let t = String(str || '').replace(/['’\s]/g, '');
    t = L.num === 'en' ? t.replace(/,/g, '') : t.replace(',', '.');
    if (!/^-?\d*\.?\d+$/.test(t)) return NaN;
    return parseFloat(t);
  }

  function pad(n, w) { return String(n).padStart(w, '0'); }

  function toDate(iso) {
    const p = iso.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function toIso(d) { return d.toISOString().slice(0, 10); }
  function fmtDate(iso) {
    if (!iso) return '';
    const p = iso.split('-');
    if (L.date === 'us') return p[1] + '/' + p[2] + '/' + p[0];
    if (L.date === 'uk') return p[2] + '/' + p[1] + '/' + p[0];
    return p[2] + '.' + p[1] + '.' + p[0];
  }
  // Eingabe im gewählten Datumsformat (auch mit Punkt, Schrägstrich oder ISO) → ISO oder null
  function parseDate(str) {
    const t = String(str || '').trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
    let y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else {
      m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(t);
      if (!m) return null;
      if (L.date === 'us' && t.indexOf('.') < 0) { mo = +m[1]; d = +m[2]; } else { d = +m[1]; mo = +m[2]; }
      y = +m[3];
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return y + '-' + pad(mo, 2) + '-' + pad(d, 2);
  }
  function weekday(iso) { return WD[toDate(iso).getUTCDay()]; }
  function longDate(iso) {
    const d = toDate(iso);
    if (L.date === 'us') return WD_LONG[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
    return WD_LONG[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function faxDate(iso) {
    const d = toDate(iso);
    return pad(d.getUTCDate(), 2) + '-' + MON3[d.getUTCMonth()] + '-' + d.getUTCFullYear();
  }
  function monthName(iso) { return MONTHS[toDate(iso).getUTCMonth()]; }
  function addDays(iso, n) {
    const d = toDate(iso);
    d.setUTCDate(d.getUTCDate() + n);
    return toIso(d);
  }
  function isWeekend(iso) {
    const w = toDate(iso).getUTCDay();
    return w === 0 || w === 6;
  }
  function addBusinessDays(iso, n) {
    let d = iso, k = 0;
    const step = n >= 0 ? 1 : -1;
    while (k < Math.abs(n)) {
      d = addDays(d, step);
      if (!isWeekend(d)) k++;
    }
    return d;
  }
  // Anzahl Bankwerktage nach a bis und mit b
  function businessDaysBetween(a, b) {
    if (b <= a) return 0;
    let n = 0, d = a;
    while (d < b) {
      d = addDays(d, 1);
      if (!isWeekend(d)) n++;
    }
    return n;
  }
  function fmtTime(min) {
    const h = Math.floor(min / 60) % 24, m = pad(min % 60, 2);
    if (L.time === '12') return ((h + 11) % 12 + 1) + ':' + m + (h < 12 ? ' AM' : ' PM');
    return pad(h, 2) + ':' + m;
  }
  // SWIFT-Datum YYMMDD
  function swiftDate(iso) { return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10); }

  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c];
    });
  }

  // IBAN mit gültiger Prüfziffer (ISO 13616, mod 97)
  function iban(country, bban) {
    const num = (bban + country + '00').replace(/[A-Z]/g, function (c) { return String(c.charCodeAt(0) - 55); });
    let rem = 0;
    for (let i = 0; i < num.length; i++) rem = (rem * 10 + (+num[i])) % 97;
    return country + pad(98 - rem, 2) + bban;
  }
  function ibanFmt(i) { return String(i).replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim(); }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  PBS.U = {
    fmt, fmtMio, parseAmount, pad, toDate, toIso, fmtDate, parseDate, weekday, longDate, faxDate, monthName,
    addDays, isWeekend, addBusinessDays, businessDaysBetween, fmtTime, swiftDate, esc, iban, ibanFmt, clamp
  };
})(window.PBS);
