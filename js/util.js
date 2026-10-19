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

  // Schweizer Zahlenformat: 1'250'000.00
  function fmt(n, dec) {
    if (dec === undefined) dec = 2;
    if (n === null || n === undefined || isNaN(n)) return '–';
    const neg = n < 0 && Math.abs(n) >= Math.pow(10, -dec) / 2;
    const parts = Math.abs(n).toFixed(dec).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\'');
    return (neg ? '-' : '') + parts.join('.');
  }

  function fmtMio(n, dec) {
    return fmt(n / 1e6, dec === undefined ? 1 : dec) + ' Mio.';
  }

  function parseAmount(str) {
    if (typeof str === 'number') return str;
    const t = String(str || '').replace(/['’\s]/g, '').replace(',', '.');
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
    return p[2] + '.' + p[1] + '.' + p[0];
  }
  function weekday(iso) { return WD[toDate(iso).getUTCDay()]; }
  function longDate(iso) {
    const d = toDate(iso);
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
  function fmtTime(min) { return pad(Math.floor(min / 60), 2) + ':' + pad(min % 60, 2); }
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
    fmt, fmtMio, parseAmount, pad, toDate, toIso, fmtDate, weekday, longDate, faxDate, monthName,
    addDays, isWeekend, addBusinessDays, businessDaysBetween, fmtTime, swiftDate, esc, iban, ibanFmt, clamp
  };
})(window.PBS);
