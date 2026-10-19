/* PBS/Web 4.2 – Startszenarien */
(function (PBS) {
  'use strict';

  const D = PBS.DATA;

  D.SCENARIOS = {
    '1998': {
      label: '1998 – Secrecy at its peak',
      desc: 'The Money Laundering Act is about to enter into force, the euro is a year away and nobody abroad can touch you. Easy start, long road.',
      start: '1998-03-02', capital: 36e6, scale: 0.72, discretion: 74,
      heat: { EBK: 10, US: 8, DE: 16, IT: 18, FR: 9, GB: 6 },
      exclude: ['101.004', '101.026', '100.802'], extra: []
    },
    '2003': {
      label: '2003 – The golden years',
      desc: 'Markets at their low, the EU is negotiating, the regulator tightens its ordinance in July. The classic start.',
      start: '2003-03-03', capital: 42e6, scale: 1, discretion: 70,
      heat: { EBK: 14, US: 16, DE: 24, IT: 21, FR: 11, GB: 9 },
      exclude: [], extra: []
    },
    '2008': {
      label: '2008 – The storm is coming',
      desc: 'The Liechtenstein leak has just broken, the US is hunting Swiss bankers and Lehman is six months away. Hard mode.',
      start: '2008-03-03', capital: 58e6, scale: 1.35, discretion: 62,
      heat: { EBK: 24, US: 34, DE: 32, IT: 22, FR: 18, GB: 12 },
      exclude: [], extra: ['101.311', '101.358']
    }
  };
})(window.PBS);
