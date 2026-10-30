/* Studio Seba: optional sound for the headline intro.
   Typewriter clicks while the headline types, a pencil scribble for the wavy
   underline, a marker swipe for the highlighter, and a sparkle at the end.
   All sounds are synthesised with the Web Audio API (no audio files).
   The intro starts with sound when the browser allows it; otherwise the
   #sb-sound toggle (top right) replays it with sound. Muting is remembered. */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    document.documentElement.classList.add('sb-nosound');
    return;
  }

  var ctx = null, master = null, noise = null, sources = [], on = false;

  function makeNoise(c) {
    var len = Math.floor(c.sampleRate * 2), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function noiseSrc(c, buf, t, dur, track) {
    var s = c.createBufferSource();
    s.buffer = buf;
    s.start(t, Math.random() * 1.2, dur);
    if (track) track.push(s);
    return s;
  }

  /* --- the four sounds ---------------------------------------------------- */

  // One filtered noise burst: the building block of a key sound.
  function tick(c, out, buf, t, type, freq, q, peak, decay, track) {
    var s = noiseSrc(c, buf, t, decay + 0.03, track);
    var f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    var g = c.createGain(); env(g, t, peak, 0.0015, decay);
    s.connect(f); f.connect(g); g.connect(out);
  }

  // A short pitched knock, the "thock" of a key bottoming out.
  function knock(c, out, t, f0, f1, peak, decay, track) {
    var o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    var g = c.createGain(); env(g, t, peak, 0.002, decay);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + decay + 0.02);
    if (track) track.push(o);
  }

  // A letter key: a sharp press click, a plastic keycap body, a soft thock,
  // then a quieter release click a few hundredths of a second later.
  function keystroke(c, out, buf, t, track) {
    var v = 0.65 + Math.random() * 0.35, p = 0.88 + Math.random() * 0.24;
    tick(c, out, buf, t, 'highpass', 2400 * p, 0.7, 0.42 * v, 0.006, track);
    tick(c, out, buf, t + 0.001, 'bandpass', 1250 * p, 3.2, 0.5 * v, 0.022, track);
    knock(c, out, t + 0.002, 210 * p, 120 * p, 0.16 * v, 0.03, track);
    var r = t + 0.05 + Math.random() * 0.03;
    tick(c, out, buf, r, 'highpass', 3200 * p, 0.7, 0.13 * v, 0.005, track);
    tick(c, out, buf, r, 'bandpass', 1700 * p, 2.5, 0.12 * v, 0.012, track);
  }

  // The spacebar: deeper and a little louder, with a slight stabiliser rattle.
  function spacebar(c, out, buf, t, track) {
    var v = 0.8 + Math.random() * 0.2;
    tick(c, out, buf, t, 'highpass', 1800, 0.7, 0.34 * v, 0.007, track);
    tick(c, out, buf, t + 0.001, 'bandpass', 520, 1.8, 0.55 * v, 0.045, track);
    knock(c, out, t + 0.002, 150, 85, 0.24 * v, 0.05, track);
    tick(c, out, buf, t + 0.012, 'bandpass', 2600, 3, 0.08 * v, 0.008, track);
    var r = t + 0.075 + Math.random() * 0.025;
    tick(c, out, buf, r, 'bandpass', 900, 2, 0.16 * v, 0.016, track);
  }

  function pencil(c, out, buf, t, dur, track) {
    var s = noiseSrc(c, buf, t, dur + 0.1, track);
    var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    var g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    var strokes = 16, step = dur / strokes;
    for (var k = 0; k < strokes; k++) {
      var tk = t + k * step;
      bp.frequency.setValueAtTime(k % 2 ? 3200 : 4300, tk);
      g.gain.setTargetAtTime(k % 2 ? 0.16 : 0.24, tk, step * 0.25);
      g.gain.setTargetAtTime(0.05, tk + step * 0.6, step * 0.2);
    }
    g.gain.setTargetAtTime(0.0001, t + dur, 0.03);
    s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out);
  }

  function marker(c, out, buf, t, dur, track) {
    var s = noiseSrc(c, buf, t, dur + 0.2, track);
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(800, t); bp.frequency.linearRampToValueAtTime(1500, t + dur);
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.08);
    g.gain.setValueAtTime(0.32, t + dur - 0.12);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
  }

  function sparkle(c, out, buf, t, track) {
    var notes = [1760, 2217.46, 2637.02, 3520];
    for (var i = 0; i < notes.length; i++) {
      var ti = t + i * 0.075;
      [[1, 0.11], [2.01, 0.035]].forEach(function (p) {
        var o = c.createOscillator(); o.type = 'sine'; o.frequency.value = notes[i] * p[0];
        var g = c.createGain(); env(g, ti, p[1], 0.004, 0.9);
        o.connect(g); g.connect(out); o.start(ti); o.stop(ti + 1.0);
        if (track) track.push(o);
      });
    }
    var s = noiseSrc(c, buf, t, 0.5, track);
    var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    var g = c.createGain(); env(g, t, 0.05, 0.01, 0.35);
    s.connect(hp); hp.connect(g); g.connect(out);
  }

  /* --- timing, read from the animation already on the page ---------------- */

  function ms(v) { return parseFloat(String(v).split(',')[0]) * (String(v).indexOf('ms') > -1 ? 1 : 1000) || 0; }

  function plan() {
    var h1 = document.querySelector('#top h1');
    if (!h1) return null;
    var chars = [].slice.call(h1.querySelectorAll('.sb-c')).map(function (el) { return ms(el.style.animationDelay); });
    // which letters are followed by a space, read from the headline's full text
    var label = h1.getAttribute('aria-label') || '', spaceAfter = [], k = 0;
    for (var i = 0; i < label.length; i++) {
      if (label[i] === ' ') continue;
      spaceAfter[k++] = label[i + 1] === ' ';
    }
    var wave = h1.querySelector('.sb-wave'), hl = h1.querySelector('.sb-hl');
    var p = {
      chars: chars,
      spaceAfter: spaceAfter,
      wave: wave ? [ms(wave.style.animationDelay), ms(wave.style.animationDuration)] : null,
      hl: hl ? [ms(hl.style.animationDelay), ms(hl.style.animationDuration)] : null
    };
    var last = p.hl ? p.hl[0] + p.hl[1] : (chars.length ? chars[chars.length - 1] : 0);
    p.star = last + 150;
    return p;
  }

  function schedule(c, out, buf, t0, p, track) {
    // Letters appear faster than anyone types, so keys sound at most every
    // ~65ms (about 15 a second, a quick typist), with a spacebar between words.
    var last = -1, n = p.chars.length;
    p.chars.forEach(function (d, i) {
      var t = d / 1000;
      if (t - last >= 0.065) {
        keystroke(c, out, buf, t0 + t + Math.random() * 0.006, track);
        last = t;
      }
      if (p.spaceAfter && p.spaceAfter[i] && i + 1 < n) {
        var ts = (d + p.chars[i + 1]) / 2000;
        spacebar(c, out, buf, t0 + ts, track);
        last = ts;
      }
    });
    if (p.wave) pencil(c, out, buf, t0 + p.wave[0] / 1000, p.wave[1] / 1000, track);
    if (p.hl) marker(c, out, buf, t0 + p.hl[0] / 1000, p.hl[1] / 1000, track);
    sparkle(c, out, buf, t0 + p.star / 1000, track);
    return p.star + 1300;
  }

  /* --- playback ----------------------------------------------------------- */

  function restartHeadline() {
    var h1 = document.querySelector('#top h1');
    if (!h1 || !h1.getAnimations) return;
    h1.getAnimations({ subtree: true }).forEach(function (a) {
      try { a.cancel(); a.play(); } catch (e) {}
    });
  }

  function stopAll() {
    if (master && ctx) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
    var now = ctx ? ctx.currentTime : 0;
    sources.forEach(function (s) { try { s.stop(now + 0.08); } catch (e) {} });
    sources = [];
  }

  // Remember a visitor's choice. Storage can be unavailable, so never rely on it.
  function getPref() { try { return localStorage.getItem('sb-sound'); } catch (e) { return null; } }
  function setPref(v) { try { localStorage.setItem('sb-sound', v); } catch (e) {} }

  function button() { return document.getElementById('sb-sound'); }

  function setButton(state) {
    var btn = button();
    if (!btn) return;
    btn.setAttribute('data-on', state ? 'true' : 'false');
    btn.setAttribute('aria-pressed', state ? 'true' : 'false');
  }

  function ensureContext() {
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      noise = makeNoise(ctx);
    }
    return ctx;
  }

  function playIntro() {
    var p = plan();
    if (!p) return;
    ensureContext();
    if (ctx.state === 'suspended') ctx.resume();
    stopAll();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.7, ctx.currentTime);
    restartHeadline();
    schedule(ctx, master, noise, ctx.currentTime + 0.03, p, sources);
  }

  function soundOn() { on = true; setPref('on'); setButton(true); playIntro(); }
  function soundOff() { on = false; setPref('off'); setButton(false); stopAll(); }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('#sb-sound') : null;
    if (!btn) return;
    if (on) soundOff(); else soundOn();
  });

  // Start with sound when the browser allows it. Browsers block audio until a
  // visitor has interacted with the site, so most first visits start silently
  // and the button shows "Sound off" until it is clicked.
  function tryAutoplay(tries) {
    if (!document.querySelector('#top h1 .sb-c') || !button()) {
      if (tries < 120) requestAnimationFrame(function () { tryAutoplay(tries + 1); });
      return;
    }
    setButton(false);
    if (getPref() === 'off') return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ensureContext();
    if (ctx.state === 'running') { on = true; setButton(true); playIntro(); }
  }
  tryAutoplay(0);

  // For previews and tests: render the full intro into any (offline) audio context.
  window.StudioSebaSound = {
    plan: plan,
    render: function (c, p) { return schedule(c, c.destination, makeNoise(c), 0.05, p || plan(), null); }
  };
})();
