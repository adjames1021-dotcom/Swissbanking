/* Moderne Oberfläche (2018–2025): Arbeitsplatz im Stil von Windows 10/11, Browser im Stil von Edge/Chrome
   und die Bankplattform "Vogt Private". Läuft nur in der modernen Epoche (PBS.modern()); die klassische
   Oberfläche bleibt unberührt. Das Aussehen steht in css/modern.css (alles unter body.modern). Hier nur:
   moderne Symbole, Beschriftungen und kleine DOM-Ergänzungen; alle data-Attribute und Handler bleiben. */
(function (PBS) {
  'use strict';

  const M = PBS.ModernUI = { on: false };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function observe(el, fn, opts) { if (!el) return null; const mo = new MutationObserver(fn); mo.observe(el, opts || { childList: true }); return mo; }

  /* ---------- Symbole: flache Linien-Icons statt Windows-2000-Grafik ---------- */
  const LN = '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">';
  function ln(d, color) { return color ? LN.replace('currentColor', color) + d + '</g>' : LN + d + '</g>'; }
  const S16 = {
    'i-home': ln('<path d="M2.5 7.5 8 3l5.5 4.5M4 6.5V13h3v-3.5h2V13h3V6.5"/>'),
    'i-chart': ln('<path d="M2.5 2.5v11h11"/><path d="m5 10.5 2.5-3 2 1.8 3.5-4.3"/>'),
    'i-list': ln('<path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.6 4h.1M2.6 8h.1M2.6 12h.1"/>'),
    'i-clock': ln('<circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.2 1.4"/>'),
    'i-shield': ln('<path d="M8 1.8 13 3.6v4c0 3.2-2.2 5.5-5 6.6-2.8-1.1-5-3.4-5-6.6v-4z"/><path d="m5.8 8 1.6 1.6L10.4 6.5"/>'),
    'i-mail': ln('<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.6 4.6 5.4 4 5.4-4"/>'),
    'i-mail-open': ln('<path d="M2 6.5 8 2.5l6 4V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/><path d="m2.5 7 5.5 3.8L13.5 7"/>'),
    'i-fax': ln('<path d="M4.5 6V2h7v4"/><rect x="2" y="6" width="12" height="5.5" rx="1.2"/><path d="M4.5 9.5h7V14h-7z"/>'),
    'i-cash': ln('<rect x="1.8" y="4" width="12.4" height="8" rx="1.2"/><circle cx="8" cy="8" r="1.8"/><path d="M4.2 6.3v.1M11.8 9.7v.1"/>'),
    'i-queue': ln('<rect x="2" y="2.5" width="12" height="3" rx="1"/><rect x="2" y="6.5" width="12" height="3" rx="1"/><rect x="2" y="10.5" width="12" height="3" rx="1"/>'),
    'i-warn': ln('<path d="M8 2.2 14.2 13.2H1.8z"/><path d="M8 6.5v3.2M8 11.3v.1"/>', '#c2410c'),
    'i-plane': ln('<path d="M13.8 2.2 2.2 7l4.4 1.7 1.7 4.5z"/><path d="m6.6 8.7 7.2-6.5"/>'),
    'i-info': ln('<circle cx="8" cy="8" r="6"/><path d="M8 7.3v4M8 4.9v.1"/>', '#1f5fbf'),
    'i-user': ln('<circle cx="8" cy="5.5" r="2.7"/><path d="M2.8 14c.6-2.8 2.7-4.2 5.2-4.2s4.6 1.4 5.2 4.2"/>'),
    'i-doc': ln('<path d="M4 1.8h5l3 3v9.4H4z"/><path d="M9 1.8v3h3M6 8h4M6 10.5h4"/>'),
    'i-plus': ln('<path d="M8 3v10M3 8h10"/>'),
    'i-swap': ln('<path d="M3 5h9.5L10 2.5M13 11H3.5L6 13.5"/>'),
    'i-building': ln('<path d="M2.5 14V5L8 2.2 13.5 5v9M1.5 14h13M5 7.5v4M8 7.5v4M11 7.5v4"/>'),
    'i-pen': ln('<path d="m10.5 2.5 3 3L6 13H3v-3z"/><path d="m9 4 3 3"/>'),
    'i-folder': '<path d="M1.5 4.2a1 1 0 0 1 1-1h3.4l1.5 1.5h6.1a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" fill="#e9b63f"/><path d="M1.5 6.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" fill="#f7cd5c"/>',
    'i-print': ln('<path d="M4.5 6V2h7v4"/><rect x="2" y="6" width="12" height="5.5" rx="1.2"/><path d="M4.5 9.5h7V14h-7z"/>'),
    'i-check': ln('<path d="m3 8.5 3.2 3L13 4.5"/>', '#15803d'),
    'i-flag': ln('<path d="M3.5 14V2.5M3.5 3h8L9.9 5.8l1.6 2.7h-8"/>'),
    'i-search': ln('<circle cx="7" cy="7" r="4.3"/><path d="m10.2 10.2 3.6 3.6"/>'),
    'i-lock': ln('<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.3 7V5a2.7 2.7 0 0 1 5.4 0v2"/>'),
    'i-scale': ln('<path d="M8 2v12M4.5 14h7M3 4.5h10M3 4.5 1.4 9a1.8 1.8 0 0 0 3.2 0zM13 4.5 11.4 9a1.8 1.8 0 0 0 3.2 0z"/>'),
    'i-net': ln('<rect x="2" y="2.5" width="12" height="8.5" rx="1.2"/><path d="M5.5 13.8h5M8 11v2.8"/>'),
    'i-phone': ln('<path d="M5.2 2.2 3.3 2.6c-.6.1-1 .7-.9 1.3.8 5 4.5 8.7 9.5 9.5.6.1 1.2-.3 1.3-.9l.4-1.9-2.8-1.4-1.3 1.3C7.6 9.7 6.3 8.4 5.5 6.6l1.3-1.3z"/>'),
    'i-key': ln('<circle cx="5.2" cy="10.8" r="3"/><path d="m7.4 8.6 6-6M11.4 4.6l1.8 1.8M9.8 6.2l1.4 1.4"/>'),
    'i-globe': ln('<circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c1.8 1.9 2.6 3.9 2.6 6.2S9.8 12.3 8 14.2C6.2 12.3 5.4 10.3 5.4 8S6.2 3.7 8 1.8z"/>'),
    'i-page': ln('<path d="M4 1.8h5l3 3v9.4H4z"/><path d="M9 1.8v3h3"/>'),
    'i-go': ln('<path d="M3 8h10M9 4l4 4-4 4"/>'),
    'i-star': ln('<path d="m8 2.2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.4l-3.6 1.9.7-4-2.9-2.8 4-.6z"/>'),
    'i-intra': ln('<rect x="2" y="2.5" width="12" height="9" rx="1.2"/><path d="M2 5.5h12M5.5 14h5M8 11.5V14"/>'),
    'i-up': ln('<path d="M8 13V3.5M4 7.5l4-4 4 4"/>'),
    'i-del': ln('<path d="m4 4 8 8m0-8-8 8"/>', '#c42b1c'),
    'b-back': ln('<path d="M13 8H3.5M7.5 3.8 3.3 8l4.2 4.2"/>'),
    'b-fwd': ln('<path d="M3 8h9.5M8.5 3.8 12.7 8l-4.2 4.2"/>'),
    'b-stop': ln('<path d="m4 4 8 8m0-8-8 8"/>'),
    'b-refresh': ln('<path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13.2 2.3v3h-3"/>'),
    'b-home': ln('<path d="M2.5 7.5 8 3l5.5 4.5M4 6.5V13h3v-3.5h2V13h3V6.5"/>'),
    'b-search': ln('<circle cx="7" cy="7" r="4.3"/><path d="m10.2 10.2 3.6 3.6"/>'),
    'b-favs': ln('<path d="m6.5 2.5 1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.7 1.4.5-3-2.2-2.1 3-.4z"/><path d="M10.5 10.2h3.8M10.5 12.8h3.8M8.2 12.8h.1"/>'),
    'b-hist': ln('<path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"/><path d="M2 2.8v2.7h2.7M8 5v3.2l2.2 1.3"/>'),
    'b-mail': ln('<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.6 4.6 5.4 4 5.4-4"/>'),
    'b-print': ln('<path d="M4.5 6V2h7v4"/><rect x="2" y="6" width="12" height="5.5" rx="1.2"/><path d="M4.5 9.5h7V14h-7z"/>'),
    't-vol': ln('<path d="M2.5 6H5l3.5-3v10L5 10H2.5z"/><path d="M11 5.6a3.4 3.4 0 0 1 0 4.8M12.8 3.8a6 6 0 0 1 0 8.4"/>'),
    't-mute': ln('<path d="M2.5 6H5l3.5-3v10L5 10H2.5z"/><path d="m10.8 6.2 3.6 3.6m0-3.6-3.6 3.6"/>'),
    't-net': ln('<rect x="2" y="2.5" width="12" height="8.5" rx="1.2"/><path d="M5.5 13.8h5M8 11v2.8"/>'),
    'm-lock': ln('<rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7"/>'),
    'm-info': ln('<circle cx="8" cy="8" r="5.8"/><path d="M8 7.3v3.8M8 5v.1"/>'),
    'm-file': ln('<path d="M4 1.8h5l3 3v9.4H4z"/><path d="M9 1.8v3h3"/>'),
    'm-dots': '<g fill="currentColor"><circle cx="3.2" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="12.8" cy="8" r="1.2"/></g>',
    'm-power': ln('<path d="M8 2v5.5M4.6 4.3a5.2 5.2 0 1 0 6.8 0"/>'),
    'm-chev': ln('<path d="m4 6 4 4 4-4"/>'),
    'm-x': ln('<path d="m4.5 4.5 7 7m0-7-7 7"/>')
  };
  const B32 = {
    'i-err': '<circle cx="16" cy="16" r="13" fill="#d92d20"/><path d="m11.5 11.5 9 9m0-9-9 9" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
    'i-ques': '<circle cx="16" cy="16" r="13" fill="#1f5fbf"/><path d="M12.6 12.4a3.5 3.5 0 1 1 5 3.2c-1 .5-1.6 1.2-1.6 2.3v.6" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round"/><circle cx="16" cy="22.4" r="1.4" fill="#fff"/>',
    'i-bigwarn': '<path d="M16 3.5c.8 0 1.5.4 1.9 1.1l11 19.5c.8 1.5-.2 3.4-1.9 3.4H5c-1.7 0-2.7-1.9-1.9-3.4l11-19.5c.4-.7 1.1-1.1 1.9-1.1z" fill="#f59e0b"/><path d="M16 11v7.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="22.5" r="1.5" fill="#fff"/>',
    'i-biginfo': '<circle cx="16" cy="16" r="13" fill="#1f5fbf"/><path d="M16 14.5v8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="10.2" r="1.6" fill="#fff"/>',
    'i-bigphone': '<circle cx="16" cy="16" r="13" fill="#0f2747"/><path d="M12.4 8.6 10 9.1c-.7.2-1.2.9-1.1 1.6 1 6.2 5.6 10.8 11.8 11.8.7.1 1.4-.4 1.6-1.1l.5-2.4-3.5-1.7-1.6 1.6c-2.2-1-3.8-2.6-4.8-4.8l1.6-1.6z" fill="#fff"/>',
    'd-docs': '<path d="M3 8a2 2 0 0 1 2-2h7l2.5 2.5H27a2 2 0 0 1 2 2V25a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#e3a92f"/><rect x="9" y="5.5" width="14" height="14" rx="1.2" fill="#fff"/><path d="M12 9.5h8M12 12.5h8M12 15.5h5" stroke="#3b82c4" stroke-width="1.4" stroke-linecap="round"/><path d="M3 13.5a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2V25a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#f7cd5c"/>',
    'd-folder': '<path d="M3 8a2 2 0 0 1 2-2h7l2.5 2.5H27a2 2 0 0 1 2 2V25a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#e3a92f"/><path d="M3 12.5a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2V25a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#f7cd5c"/>',
    'd-comp': '<rect x="3" y="5" width="26" height="17.5" rx="2" fill="#2b3a4e"/><rect x="5" y="7" width="22" height="13.5" rx=".8" fill="url(#m-scr)"/><path d="M13 22.5h6l1 3.5h-8z" fill="#8a96a8"/><rect x="9" y="26" width="14" height="2.2" rx="1.1" fill="#6b7789"/>',
    'd-recycle': '<path d="M8 9.5h16l-1.6 16.7a2 2 0 0 1-2 1.8h-8.8a2 2 0 0 1-2-1.8z" fill="#e6ecf2" stroke="#8a9bb0"/><rect x="6" y="6.5" width="20" height="3" rx="1.5" fill="#b8c4d2"/><path d="M13 13v10.5M16 13v10.5M19 13v10.5" stroke="#9aa9bb" stroke-width="1.3" stroke-linecap="round"/>',
    'd-recycle-full': '<path d="M10 9c-.6-2.4 1.8-3.8 3.4-2.6.9-2.2 4.6-2.2 5.4 0 2.2-.8 4 1.2 2.8 2.9z" fill="#fff" stroke="#9aa9bb" stroke-width=".8"/><path d="M8 9.5h16l-1.6 16.7a2 2 0 0 1-2 1.8h-8.8a2 2 0 0 1-2-1.8z" fill="#e6ecf2" stroke="#8a9bb0"/><path d="M13 13v10.5M16 13v10.5M19 13v10.5" stroke="#9aa9bb" stroke-width="1.3" stroke-linecap="round"/>',
    'd-net': '<circle cx="16" cy="16" r="12.5" fill="url(#m-brw)"/><path d="M8.3 19c1.4-5.6 6.4-8.8 11.5-7.8 3.3.7 5.2 3.2 4.3 5.6-.8 2.1-3.6 2.6-5.6 1.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".92"/>',
    'd-pbs': '<rect x="3" y="3" width="26" height="26" rx="6" fill="#0f2747"/><path d="m10.2 9.5 5.8 13 5.8-13" fill="none" stroke="#d4b46a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    'd-calc': '<rect x="7" y="3" width="18" height="26" rx="3" fill="#2f3a48"/><rect x="9.5" y="6" width="13" height="5" rx="1" fill="#d6e6f5"/><g fill="#7f93aa"><rect x="9.5" y="13.5" width="3.4" height="3" rx=".8"/><rect x="14.3" y="13.5" width="3.4" height="3" rx=".8"/><rect x="9.5" y="18" width="3.4" height="3" rx=".8"/><rect x="14.3" y="18" width="3.4" height="3" rx=".8"/><rect x="9.5" y="22.5" width="3.4" height="3" rx=".8"/><rect x="14.3" y="22.5" width="3.4" height="3" rx=".8"/></g><rect x="19.1" y="13.5" width="3.4" height="12" rx=".8" fill="#3b82f6"/>',
    'd-cmd': '<rect x="3" y="5" width="26" height="22" rx="3" fill="#1e1e1e"/><path d="m8 12 4 3.5L8 19M14 20h7" fill="none" stroke="#e6e6e6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    'd-paint': '<path d="M16 4C9 4 4 9 4 15.5S9 27 14.5 27c2 0 2.7-1.2 2.3-2.6-.4-1.6.5-2.9 2.2-2.9H22c3.5 0 6-2.4 6-5.8C28 9.2 22.6 4 16 4z" fill="#f4f1ea" stroke="#c5bba6"/><circle cx="10" cy="14" r="2" fill="#e5484d"/><circle cx="13.5" cy="9" r="2" fill="#f5a524"/><circle cx="19.5" cy="8.5" r="2" fill="#30a46c"/><circle cx="23.5" cy="13" r="2" fill="#3e63dd"/>',
    'd-control': '<rect x="3" y="3" width="26" height="26" rx="6" fill="#4b5b70"/><circle cx="16" cy="16" r="7.6" fill="none" stroke="#fff" stroke-width="3.4" stroke-dasharray="3 2.95"/><circle cx="16" cy="16" r="5.4" fill="none" stroke="#fff" stroke-width="2"/>',
    'd-hdd': '<rect x="3" y="10.5" width="26" height="11.5" rx="2.5" fill="#d3dae3" stroke="#8a97a8"/><rect x="6" y="15.5" width="10" height="1.8" rx=".9" fill="#8a97a8"/><circle cx="24.5" cy="16.3" r="1.4" fill="#30a46c"/>',
    'd-txt': '<path d="M8 3h11l6 6v19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#fff" stroke="#9aa6b5"/><path d="M19 3v6h6" fill="#e8edf3" stroke="#9aa6b5"/><path d="M11 14h10M11 17.5h10M11 21h7" stroke="#9aa6b5" stroke-width="1.3" stroke-linecap="round"/>',
    'd-doc': '<path d="M8 3h11l6 6v19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#fff" stroke="#9aa6b5"/><path d="M19 3v6h6" fill="#e8edf3" stroke="#9aa6b5"/><rect x="4" y="13" width="12" height="11" rx="1.5" fill="#2563c9"/><path d="M11 17h10M11 20.5h7" stroke="#9aa6b5" stroke-width="1.3" stroke-linecap="round"/><path d="m6.5 16 1.3 5.5L10 17l2.2 4.5 1.3-5.5" fill="none" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>',
    'd-xls': '<path d="M8 3h11l6 6v19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#fff" stroke="#9aa6b5"/><path d="M19 3v6h6" fill="#e8edf3" stroke="#9aa6b5"/><path d="M11 13h11v11H11zM11 16.7h11M11 20.3h11M15.5 13v11" fill="none" stroke="#1e8a4c" stroke-width="1.1"/>',
    'd-image': '<path d="M8 3h11l6 6v19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#fff" stroke="#9aa6b5"/><rect x="10" y="12.5" width="12" height="10" rx="1" fill="#cfe3f7"/><path d="m10 22.5 4-4.5 3 3 2-2 3 3.5z" fill="#3b9c5e"/><circle cx="19" cy="15.5" r="1.4" fill="#f5a524"/>',
    'd-htm': '<path d="M8 3h11l6 6v19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#fff" stroke="#9aa6b5"/><path d="M19 3v6h6" fill="#e8edf3" stroke="#9aa6b5"/><circle cx="16" cy="19" r="5.5" fill="url(#m-brw)"/>',
    'd-exe': '<rect x="3.5" y="6" width="25" height="20" rx="2.5" fill="#fff" stroke="#8a97a8"/><path d="M3.5 8.5a2.5 2.5 0 0 1 2.5-2.5h20a2.5 2.5 0 0 1 2.5 2.5V11h-25z" fill="#2563c9"/><rect x="7" y="14" width="8" height="8" rx="1" fill="#dbe4ee"/>'
  };
  const START = '<rect x="1" y="1" width="6.6" height="6.6" rx=".6" fill="#4cc2ff"/><rect x="8.4" y="1" width="6.6" height="6.6" rx=".6" fill="#2aa5f5"/><rect x="1" y="8.4" width="6.6" height="6.6" rx=".6" fill="#2aa5f5"/><rect x="8.4" y="8.4" width="6.6" height="6.6" rx=".6" fill="#0f87e0"/>';
  function icons() {
    const sprite = document.querySelector('svg.sprite');
    if (!sprite) return;
    const defs = sprite.querySelector('defs');
    if (defs && !$('m-brw')) {
      defs.insertAdjacentHTML('beforeend',
        '<linearGradient id="m-brw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#36c2b4"/><stop offset=".55" stop-color="#1f8fe0"/><stop offset="1" stop-color="#1557b0"/></linearGradient>' +
        '<linearGradient id="m-scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fb3f5"/><stop offset="1" stop-color="#1b5fb5"/></linearGradient>');
    }
    const set = function (id, vb, html) {
      let s = $(id);
      if (!s) { s = document.createElementNS('http://www.w3.org/2000/svg', 'symbol'); s.id = id; sprite.appendChild(s); }
      s.setAttribute('viewBox', vb);
      s.innerHTML = html;
    };
    Object.keys(S16).forEach(function (id) { set(id, '0 0 16 16', S16[id]); });
    Object.keys(B32).forEach(function (id) { set(id, '0 0 32 32', B32[id]); });
    set('i-start', '0 0 16 16', START);
  }

  /* ---------- Arbeitsplatz ---------- */
  const DESK_LABEL = { 'My Computer': 'This PC', 'My Documents': 'Documents', 'Internet Explorer': 'Microsoft Edge', 'PBS/Web (Intranet)': 'Vogt Private' };
  function desktop() {
    const box = $('dicons');
    const relabel = function () {
      box.querySelectorAll('.dicon[data-d] > span').forEach(function (sp) { const n = DESK_LABEL[sp.textContent]; if (n) sp.textContent = n; });
    };
    relabel();
    observe(box, relabel);
    // Eigenes Hintergrundbild aus der Systemsteuerung respektieren, sonst der moderne Standard
    const A = PBS.Apps;
    const wall = function () { document.body.classList.toggle('m-wall', !!(A && A.st && A.st.wall && A.st.wall !== 'none')); };
    if (A && A.applySt) { const orig = A.applySt; A.applySt = function () { const r = orig.apply(this, arguments); wall(); return r; }; }
    wall();
  }

  function initials(name) {
    const parts = String(name || '').replace(/\b(Dr|Prof|lic|med|iur|oec|phil|rer|pol|MBA|PhD)\b\.?/gi, ' ').split(/[\s.]+/).filter(function (x) { return /^[A-Za-zÀ-ÿ]/.test(x); });
    if (!parts.length) return 'VC';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function userName() {
    const s = PBS.Game && PBS.Game.state;
    return s && s.meta && s.meta.name ? s.meta.name : 'Workstation user';
  }

  function taskbar() {
    const tb = $('taskbar');
    if (!tb) return;
    // Angeheftete Programme neben dem Browser
    const ql = tb.querySelector('.ql');
    if (ql) {
      ql.insertAdjacentHTML('beforeend',
        '<button type="button" class="qb m-pin" data-mpin="explorer" title="File Explorer"><svg class="ico"><use href="#d-folder"/></svg></button>' +
        '<button type="button" class="qb m-pin" data-mpin="pbs" title="Vogt Private"><svg class="ico"><use href="#d-pbs"/></svg></button>');
    }
    const ieq = tb.querySelector('[data-ql=ie]');
    if (ieq) { ieq.title = 'Microsoft Edge'; const u = ieq.querySelector('use'); if (u) u.setAttribute('href', '#d-net'); }
    const dq = tb.querySelector('[data-ql=desk]');
    if (dq) dq.title = 'Show desktop';
    // Uhr zweizeilig: Zeit und Datum
    const clk = $('tb-clock');
    if (clk) {
      const wrap = document.createElement('span');
      wrap.className = 'm-clock';
      clk.parentNode.insertBefore(wrap, clk);
      wrap.appendChild(clk);
      const d = document.createElement('span');
      d.className = 'm-date';
      wrap.appendChild(d);
      const upd = function () {
        const s = PBS.Game && PBS.Game.state, ui = PBS.UI;
        let txt;
        if (s && ui && ui.session) txt = PBS.U.fmtDate(s.date);
        else { const n = new Date(); txt = PBS.U.pad(n.getDate(), 2) + '.' + PBS.U.pad(n.getMonth() + 1, 2) + '.' + n.getFullYear(); }
        if (d.textContent !== txt) d.textContent = txt;
      };
      upd();
      observe(clk, upd, { childList: true, characterData: true, subtree: true });
    }
    // Fensterknöpfe: Browser mit Browsersymbol, ohne "Microsoft Internet Explorer"
    const tasks = $('tb-tasks');
    const fix = function () {
      tasks.querySelectorAll('.task').forEach(function (t) {
        if (t.title) t.title = t.title.replace(/ - Microsoft Internet Explorer$/, '');
        const sp = t.querySelector('span');
        if (sp) sp.textContent = sp.textContent.replace(/ - Microsoft Internet Explorer$/, '');
        if (t.dataset.task === 'ie') { const u = t.querySelector('use'); if (u && u.getAttribute('href') !== '#d-net') u.setAttribute('href', '#d-net'); }
      });
    };
    fix();
    observe(tasks, fix);
    document.addEventListener('click', function (ev) {
      const p = ev.target.closest('[data-mpin]');
      if (!p || !PBS.WM) return;
      if (p.dataset.mpin === 'explorer') PBS.WM.open('explorer');
      else PBS.WM.launchApp('pbs');
    });
  }

  /* ---------- Startmenü als modernes Panel ---------- */
  const PINS = [
    ['ie', 'd-net', 'Microsoft Edge'], ['pbs', 'd-pbs', 'Vogt Private'], ['explorer', 'd-folder', 'File Explorer'], ['docs', 'd-docs', 'Documents'],
    ['notepad', 'd-txt', 'Notepad'], ['calc', 'd-calc', 'Calculator'], ['paint', 'd-paint', 'Paint'], ['cmd', 'd-cmd', 'Command Prompt'],
    ['control', 'd-control', 'Settings'], ['sol', 'd-sol', 'Solitaire'], ['mine', 'd-mine', 'Minesweeper'], ['comp', 'd-comp', 'This PC']
  ];
  function launch(k) {
    const WM = PBS.WM;
    if (k === 'ie' || k === 'pbs') WM.launchApp(k);
    else if (k === 'docs') WM.open('explorer', { path: PBS.FS.specialPaths().documents });
    else if (k === 'comp') WM.open('explorer');
    else WM.open(k);
  }
  function startPanel(el) {
    if (el.dataset.m) return;
    el.dataset.m = '1';
    el.classList.add('m-start');
    const list = el.querySelector('.mlist');
    if (!list) return;
    let logoff = null, shut = null;
    list.querySelectorAll('.mi').forEach(function (mi) {
      const t = (mi.querySelector('.ml') || mi).textContent;
      if (/^Log Off/.test(t)) { logoff = mi; mi.classList.add('m-hide'); }
      else if (/^Shut Down/.test(t)) { shut = mi; mi.classList.add('m-hide'); }
      else if (/^Windows Update/.test(t)) mi.classList.add('m-hide');
      else if (t === 'Programs') mi.querySelector('.ml').textContent = 'All apps';
      else if (t === 'Run...') mi.querySelector('.ml').textContent = 'Run…';
    });
    const top = document.createElement('div');
    top.className = 'm-sp';
    top.innerHTML = '<div class="m-sh"><b>Pinned</b></div><div class="m-grid">' + PINS.map(function (p) {
      return '<button type="button" class="m-app" data-mapp="' + p[0] + '"><svg><use href="#' + p[1] + '"/></svg><span>' + esc(p[2]) + '</span></button>';
    }).join('') + '</div><div class="m-sh"><b>More</b></div>';
    el.insertBefore(top, list);
    const foot = document.createElement('div');
    foot.className = 'm-sf';
    const nm = userName();
    foot.innerHTML = '<button type="button" class="m-user" title="Sign out"><span class="m-av">' + esc(initials(nm)) + '</span><span>' + esc(nm) + '</span></button>' +
      '<button type="button" class="m-pow" title="Power"><svg class="ico"><use href="#m-power"/></svg></button>';
    el.appendChild(foot);
    top.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-mapp]');
      if (!b) return;
      PBS.closeMenus(0);
      launch(b.dataset.mapp);
    });
    foot.querySelector('.m-user').onclick = function () { if (logoff) logoff.click(); };
    foot.querySelector('.m-pow').onclick = function () { if (shut) shut.click(); };
    // Mittig über der Taskleiste
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(4, Math.round((innerWidth - w) / 2)) + 'px';
    el.style.top = Math.max(4, innerHeight - 48 - 10 - h) + 'px';
  }
  function menus() {
    observe($('menu-layer'), function (recs) {
      recs.forEach(function (r) { r.addedNodes.forEach(function (n) { if (n.nodeType === 1 && n.classList.contains('startm')) startPanel(n); }); });
    });
  }

  /* ---------- Browser ---------- */
  function browser() {
    const tb = $('ie-tb'), title = $('ie-title');
    if (tb && title) {
      const ico = tb.querySelector(':scope > .ico');
      const tab = document.createElement('div');
      tab.className = 'm-tab';
      tb.insertBefore(tab, title);
      if (ico) tab.appendChild(ico);
      tab.appendChild(title);
      tab.insertAdjacentHTML('beforeend', '<span class="m-spin" aria-hidden="true"></span><button type="button" class="m-tabx" title="Close tab" aria-label="Close tab"><svg class="ico"><use href="#m-x"/></svg></button>');
      tab.querySelector('.m-tabx').addEventListener('click', function () { if (PBS.WM) PBS.WM.close('ie'); });
    }
    // Adressleiste: Schloss, Favoritenstern; Menüknopf "…" für die alte Menüleiste
    const combo = document.querySelector('#ie-addr .combo');
    if (combo) combo.insertAdjacentHTML('beforeend', '<button type="button" class="m-star" data-b="favadd" title="Add this page to favourites"><svg class="ico"><use href="#i-star"/></svg></button>');
    const std = $('ie-std');
    if (std) std.insertAdjacentHTML('beforeend', '<button type="button" class="tbb m-more" title="Settings and more (Alt+F)" aria-label="Settings and more"><svg><use href="#m-dots"/></svg></button>');
    const ie = $('ie'), menu = $('ie-menu');
    const hideMenu = function () { ie.classList.remove('m-menu'); };
    document.addEventListener('click', function (ev) {
      if (ev.target.closest('.m-more')) { ev.preventDefault(); ie.classList.toggle('m-menu'); if (!ie.classList.contains('m-menu')) PBS.closeMenus(0); return; }
      if (ie.classList.contains('m-menu') && ev.target.closest('.wmenu .mi:not(.has)')) setTimeout(hideMenu, 0);
    });
    document.addEventListener('mousedown', function (ev) {
      if (ie.classList.contains('m-menu') && !ev.target.closest('#ie-menu, .m-more, .wmenu')) hideMenu();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') hideMenu();
      if (ev.altKey && (ev.key === 'f' || ev.key === 'F') && PBS.WM && PBS.WM.focused === 'ie') { ev.preventDefault(); ie.classList.add('m-menu'); const mb = menu && menu.querySelector('.mb[data-m=file]'); if (mb) mb.click(); }
    });
    const linksLbl = document.querySelector('#ie-links .al');
    if (linksLbl) linksLbl.textContent = '';
    // Nach jedem Seitenaufruf: Schloss bzw. Hinweis in der Adressleiste
    const B = PBS.Browser;
    const lock = function () {
      const u = (B.cur && B.cur.url) || '';
      const use = combo && combo.querySelector(':scope > .ico use');
      if (!use) return;
      const k = /^https:/i.test(u) ? 'm-lock' : /^file:/i.test(u) ? 'm-file' : 'm-info';
      use.setAttribute('href', '#' + k);
      combo.dataset.sec = k === 'm-lock' ? 'secure' : k === 'm-file' ? 'file' : 'plain';
      combo.querySelector(':scope > .ico').setAttribute('aria-label', k === 'm-lock' ? 'Connection is secure' : k === 'm-file' ? 'Local file' : 'Not secure');
    };
    if (B && B.page) { const orig = B.page; B.page = function () { const r = orig.apply(this, arguments); lock(); return r; }; }
    lock();
  }

  /* ---------- Anmeldung: moderne Bank-Anmeldung mit Authenticator-App ---------- */
  function setText(sel, txt, root) { const el = (root || document).querySelector(sel); if (el) el.textContent = txt; return el; }
  function login() {
    const lg = $('login');
    if (!lg) return;
    lg.querySelectorAll('.logo .wm').forEach(function (x) { x.textContent = 'Vogt & Cie'; });
    const app = lg.querySelector('.lg-app');
    if (app) app.innerHTML = 'Vogt Private<br><span>Banking Platform</span>';
    setText('.lg-box .dlg-tb > span', 'Sign in', lg);
    const intro = lg.querySelector('.lg-intro > div');
    if (intro) intro.textContent = 'Use your employee ID and password, then confirm with the code from the Vogt Secure app on your phone.';
    const lab = function (f, t) { const l = lg.querySelector('label[for=' + f + ']'); if (l) l.textContent = t; };
    lab('lg-user', 'Employee ID');
    lab('lg-pw', 'Password');
    lab('lg-tok', 'Vogt Secure code');
    const tok = $('lg-tok');
    if (tok) { tok.placeholder = '6-digit code'; tok.setAttribute('autocomplete', 'one-time-code'); const hint = tok.parentNode.querySelector('.small'); if (hint) hint.textContent = 'Open Vogt Secure on your phone and enter the code shown.'; }
    const pw = $('lg-pw');
    if (pw) pw.placeholder = 'Password';
    const mand = lg.querySelector('#loginform select');
    if (mand) { const tr = mand.closest('tr'); if (tr) tr.classList.add('m-hide'); }
    const sub = lg.querySelector('#loginform button[type=submit]');
    if (sub) sub.textContent = 'Sign in';
    const legal = lg.querySelector('.lg-legal');
    if (legal) legal.innerHTML = 'For authorised employees of Bankhaus Vogt &amp; Cie only. Sign-in attempts are logged and monitored. Unauthorised access to data processing systems is a criminal offence (Art. 143<sup>bis</sup> SCC).';
    // Token am Schlüsselbund wird zur Authenticator-App
    const fob = lg.querySelector('.fob');
    if (fob) {
      setText('.fob-brand', 'Vogt Secure', fob);
      const lcd = fob.querySelector('.lcd');
      if (lcd) lcd.insertAdjacentHTML('beforebegin', '<div class="m-acct"><span class="m-av">V</span><div><b>Bankhaus Vogt &amp; Cie</b><br><span>Workplace sign-in</span></div></div><div class="m-codel">Your sign-in code</div>');
      setText('.fob-ser', 'A new code appears every 30 seconds. Never share it, not even with the Service Desk.', fob);
      fob.insertAdjacentHTML('afterbegin', '<div class="m-pbar"><span>' + '</span><span class="m-pic"></span></div>');
    }
    setText('.fob-cap', 'Vogt Secure on your phone', lg);
    const desk = lg.querySelector('.desk');
    if (desk) desk.setAttribute('aria-label', 'Authenticator app on your phone');
    const foot = lg.querySelector('.lg-foot');
    if (foot && foot.firstChild && foot.firstChild.nodeType === 3) foot.firstChild.data = 'Bankhaus Vogt & Cie · IT Services · Service Desk ext. 4411 · ';
    const conn = $('connecting');
    if (conn) { const b = conn.querySelector('.conn-row b'); if (b) b.textContent = 'Vogt Private'; setText('.dlg-tb > span', 'Signing in', conn); }
  }

  /* ---------- Bankplattform ---------- */
  function bankApp() {
    const hdr = $('hdr');
    if (!hdr) return;
    hdr.querySelectorAll('.logo .wm').forEach(function (x) { x.textContent = 'Vogt & Cie'; });
    const an = hdr.querySelector('.appname');
    if (an) an.innerHTML = 'Vogt Private<span>Banking Platform</span>';
    const av = document.createElement('div');
    av.className = 'm-av m-hav';
    av.title = 'Signed in';
    hdr.appendChild(av);
    const hr = $('hdr-r');
    const upd = function () { const n = userName(); const i = initials(n); if (av.textContent !== i) av.textContent = i; av.title = n; };
    upd();
    observe(hr, upd);
    setText('#ticker .tk-l', 'Markets');
    // Tagesabschluss: Konsole als dunkles Job-Protokoll
    observe($('dlg-layer'), function (recs) {
      recs.forEach(function (r) {
        r.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          const log = n.querySelector('#batchlog');
          if (!log) return;
          const d = n.querySelector('.dlg');
          d.classList.add('m-batch');
          const t = d.querySelector('.dlg-tb > span');
          if (t && /^\s*Batch job/.test(t.textContent)) {
            const svg = t.querySelector('svg');
            t.textContent = ' Overnight processing · job PBSEOD01';
            if (svg) t.insertBefore(svg, t.firstChild);
          }
        });
      });
    });
  }

  M.enable = function () {
    if (M.on) return;
    M.on = true;
    document.body.classList.add('modern');
    icons();
    desktop();
    taskbar();
    menus();
    browser();
    login();
    bankApp();
  };
  M.initials = initials;
  if (PBS.modern && PBS.modern()) M.enable();
})(window.PBS);
