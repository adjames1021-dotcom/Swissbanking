/* PBS/Web 4.2 – Klänge: Telefon, Fax, Hinweiston, Nadeldrucker, Navigationsklick (WebAudio, ohne Dateien) */
(function (PBS) {
  'use strict';

  let ctx = null, master = null, noiseBuf = null;
  const Snd = PBS.Sound = { on: true, vol: 0.8 };

  // Der Audiokontext darf erst nach einer Benutzeraktion starten
  function ac() {
    if (!Snd.on) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = 0.4 * Snd.vol;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  // Ton mit Hüllkurve
  function tone(freq, t0, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.linearRampToValueAtTime(o.to, t0 + dur);
    const v = o.vol === undefined ? 0.5 : o.vol, a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    if (o.decay) g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else { g.gain.setValueAtTime(v, t0 + Math.max(a, dur - 0.01)); g.gain.linearRampToValueAtTime(0.0001, t0 + dur); }
    osc.connect(g);
    g.connect(o.dest || master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return osc;
  }
  function burst(t0, dur, o) {
    o = o || {};
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise();
    f.type = o.filter || 'bandpass';
    f.frequency.value = o.freq || 2000;
    f.Q.value = o.q || 1;
    const v = o.vol === undefined ? 0.4 : o.vol;
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }

  // Elektronischer Tischapparat: Triller aus zwei Tönen, zweimal
  Snd.ring = function (times) {
    if (!ac()) return;
    const t = ctx.currentTime + 0.02;
    for (let r = 0; r < (times || 2); r++) {
      const start = t + r * 1.6;
      for (let i = 0; i < 20; i++) tone(i % 2 ? 1180 : 920, start + i * 0.042, 0.042, { type: 'square', vol: 0.11, attack: 0.002 });
    }
  };
  // Fax: Rufton, Antwortton, Modem-Rauschen
  Snd.fax = function () {
    if (!ac()) return;
    const t = ctx.currentTime + 0.02;
    tone(1100, t, 0.45, { vol: 0.16 });
    tone(2100, t + 0.7, 0.9, { vol: 0.12 });
    for (let i = 0; i < 14; i++) {
      tone(i % 2 ? 1650 : 1850, t + 1.7 + i * 0.06, 0.06, { type: 'triangle', vol: 0.09 });
    }
    burst(t + 2.55, 0.9, { freq: 1800, q: 0.7, vol: 0.12 });
  };
  // Hinweiston (Meldung)
  Snd.ding = function () {
    if (!ac()) return;
    const t = ctx.currentTime + 0.01;
    tone(1318, t, 0.9, { vol: 0.28, decay: true });
    tone(2637, t, 0.5, { vol: 0.07, decay: true });
  };
  // Fehlerton (Akkord)
  Snd.chord = function () {
    if (!ac()) return;
    const t = ctx.currentTime + 0.01;
    [523, 659, 784].forEach(function (f) { tone(f, t, 0.7, { type: 'triangle', vol: 0.12, decay: true }); });
  };
  // Neue Nachricht
  Snd.notify = function () {
    if (!ac()) return;
    const t = ctx.currentTime + 0.01;
    tone(880, t, 0.18, { vol: 0.18, decay: true });
    tone(1175, t + 0.12, 0.35, { vol: 0.18, decay: true });
  };
  // Navigationsklick
  Snd.click = function () {
    if (!ac()) return;
    burst(ctx.currentTime + 0.005, 0.025, { filter: 'highpass', freq: 3200, vol: 0.35 });
  };
  // Nadeldrucker: Zeilen aus kurzen Anschlägen, Wagenrücklauf
  Snd.printer = function (lines) {
    if (!ac()) return 0;
    const t = ctx.currentTime + 0.02;
    let x = t;
    for (let l = 0; l < (lines || 4); l++) {
      const n = 26 + Math.floor(Math.random() * 18);
      for (let i = 0; i < n; i++) {
        tone(1900 + Math.random() * 500, x, 0.012, { type: 'square', vol: 0.05, attack: 0.001 });
        burst(x, 0.012, { freq: 3500, q: 2, vol: 0.12 });
        x += 0.017 + (i % 9 === 0 ? 0.02 : 0);
      }
      tone(140, x, 0.22, { type: 'sawtooth', to: 90, vol: 0.06 });
      x += 0.26;
    }
    return x - t;
  };

  Snd.volume = function (v) { Snd.vol = v; if (master) master.gain.value = 0.4 * v; };
  Snd.set = function (on) { Snd.on = !!on; if (!on && ctx && ctx.state === 'running') ctx.suspend(); };
})(window.PBS);
