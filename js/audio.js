/* Super Star Leap DX - audio: WebAudio synthesised SFX and a tiny chiptune sequencer. No audio files. */
(function () {
  'use strict';
  const SSL = window.SSL;
  let ctx = null, master = null, sfxGain = null, musGain = null;
  const A = SSL.audio = { sfxOn: true, musicOn: true, ready: false };

  A.unlock = function () {
    if (A.ready) { if (ctx && ctx.state === 'suspended' && !A.paused) ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
      musGain = ctx.createGain(); musGain.gain.value = 0.22; musGain.connect(master);
      if (A.vol) A.setVolume(A.vol.sfx, A.vol.music);
      A.ready = true;
      if (ctx.state === 'suspended' && !A.paused) ctx.resume();
      if (A.paused && ctx.state === 'running') ctx.suspend();
      if (A._want) A.music(A._want);
    } catch (e) { A.ready = false; }
  };
  A.paused = false;
  A.suspend = function () {
    A.paused = true;
    if (timer) { clearInterval(timer); timer = null; }          // stop the sequencer, not just the clock
    if (ctx && ctx.state === 'running') ctx.suspend();
  };
  A.resume = function () {
    A.paused = false;
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (cur && !timer && ctx) { nextT = ctx.currentTime + 0.08; timer = setInterval(pump, 80); }
  };
  A.setVolume = function (sfx, music) {
    A.vol = { sfx: sfx, music: music };
    if (sfxGain) sfxGain.gain.value = 0.55 * sfx;
    if (musGain) musGain.gain.value = 0.22 * music;
  };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function tone(o) {
    if (!A.ready || !A.sfxOn || A.paused) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.d);
    const v = o.v == null ? 0.5 : o.v;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t0); osc.stop(t0 + o.d + 0.03);
  }
  function noise(d, v, hp, delay) {
    if (!A.ready || !A.sfxOn || A.paused) return;
    const n = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, n, ctx.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
    const g = ctx.createGain(); g.gain.value = v;
    s.connect(f); f.connect(g); g.connect(sfxGain); s.start(ctx.currentTime + (delay || 0));
  }
  const seq = (notes, step, type, v) => notes.forEach((m, i) => m && tone({ f: mtof(m), d: step * 1.1, type: type || 'square', v: v || 0.35, delay: i * step }));

  const SFX = {
    jump: () => tone({ f: 330, f2: 760, d: 0.18, v: 0.35 }),
    jumpBig: () => tone({ f: 260, f2: 640, d: 0.22, v: 0.4 }),
    coin: () => { tone({ f: 988, d: 0.07, v: 0.3 }); tone({ f: 1319, d: 0.25, v: 0.3, delay: 0.06 }); },
    stomp: () => { tone({ f: 220, f2: 70, d: 0.12, v: 0.5, type: 'triangle' }); noise(0.05, 0.25, 1500); },
    kick: () => { tone({ f: 180, f2: 90, d: 0.1, v: 0.5, type: 'triangle' }); noise(0.07, 0.3, 900); },
    bump: () => tone({ f: 120, f2: 80, d: 0.09, v: 0.6, type: 'triangle' }),
    brick: () => { noise(0.22, 0.6, 500); tone({ f: 160, f2: 60, d: 0.15, v: 0.4, type: 'triangle' }); },
    power: () => seq([60, 64, 67, 72, 67, 72, 76, 79], 0.055, 'square', 0.3),
    sprout: () => tone({ f: 200, f2: 700, d: 0.3, v: 0.3, type: 'triangle' }),
    fire: () => { tone({ f: 900, f2: 200, d: 0.1, v: 0.3 }); noise(0.05, 0.15, 3000); },
    hurt: () => { tone({ f: 700, f2: 120, d: 0.35, v: 0.4, type: 'sawtooth' }); },
    die: () => seq([72, 71, 70, 69, 66, 62, 58, 52, 46], 0.09, 'triangle', 0.5),
    oneup: () => seq([72, 76, 79, 76, 84, 88, 91, 96], 0.06, 'triangle', 0.5),
    spring: () => tone({ f: 200, f2: 1100, d: 0.25, v: 0.35, type: 'triangle' }),
    flag: () => { for (let i = 0; i < 10; i++) tone({ f: mtof(55 + i * 2), d: 0.08, v: 0.25, delay: i * 0.07, type: 'triangle' }); },
    clear: () => seq([65, 69, 72, 77, R, 72, 77, 81, 84, R, 81, 84, 89, 93], 0.1, 'square', 0.3),
    medal: () => seq([79, 83, 86, 91, 95], 0.06, 'square', 0.28),
    check: () => seq([72, 76, 79, 84], 0.07, 'triangle', 0.5),
    bossHit: () => { noise(0.2, 0.5, 300); tone({ f: 140, f2: 50, d: 0.3, v: 0.6, type: 'sawtooth' }); },
    bossDie: () => { for (let i = 0; i < 8; i++) { noise(0.18, 0.5, 400, i * 0.12); tone({ f: 200 - i * 14, f2: 40, d: 0.2, v: 0.4, type: 'sawtooth', delay: i * 0.12 }); } },
    roar: () => { tone({ f: 90, f2: 55, d: 0.7, v: 0.6, type: 'sawtooth' }); noise(0.6, 0.25, 200); },
    pipe: () => tone({ f: 400, f2: 100, d: 0.25, v: 0.4, type: 'triangle' }),
    tick: () => tone({ f: 880, d: 0.05, v: 0.2 }),
    select: () => tone({ f: 660, d: 0.06, v: 0.25 }),
    pause: () => { tone({ f: 523, d: 0.07, v: 0.3 }); tone({ f: 392, d: 0.1, v: 0.3, delay: 0.07 }); },
    hurry: () => seq([80, 76, 80, 76], 0.1, 'square', 0.25),
  };
  A.play = function (name) {
    if (!SFX[name]) return;
    try { SFX[name](); } catch (e) { /* audio must never break the game */ }
  };

  // ---------- music ----------
  // Each track: bpm, lead[], bass[] as arrays of MIDI notes (0 = rest), one entry per eighth note.
  const R = 0;
  const TRACKS = {
    over: {
      bpm: 138, lead: [69, R, 72, R, 76, R, 74, R, 72, R, 71, R, 69, R, R, R,
        65, R, 69, R, 72, R, 71, R, 69, R, 68, R, 64, R, R, R,
        69, 72, 76, 81, R, 79, 76, R, 77, R, 74, R, 69, R, R, R],
      bass: [48, R, R, R, 55, R, R, R, 48, R, R, R, 55, R, R, R, 43, R, R, R, 50, R, R, R, 43, R, R, R, 50, R, R, R,
        45, R, R, R, 52, R, R, R, 41, R, R, R, 48, R, R, R],
    },
    cave: {
      bpm: 110, lead: [R, 64, R, 67, R, 71, R, 67, R, 64, R, 62, R, 59, R, R, R, 62, R, 65, R, 69, R, 65, R, 62, R, 60, R, 57, R, R],
      bass: [40, R, R, R, 47, R, R, R, 40, R, R, R, 47, R, R, R, 38, R, R, R, 45, R, R, R, 38, R, R, R, 45, R, R, R],
    },
    sky: {
      bpm: 132, lead: [79, R, 83, R, 86, R, 83, R, 88, R, R, R, 86, R, 83, R, 81, R, 84, R, 88, R, 84, R, 86, R, R, R, R, R, R, R],
      bass: [55, R, 62, R, 55, R, 62, R, 57, R, 64, R, 57, R, 64, R, 53, R, 60, R, 53, R, 60, R, 55, R, 62, R, 55, R, 62, R],
    },
    castle: {
      bpm: 156, lead: [64, 64, R, 64, 65, R, 64, R, 62, R, 64, R, 60, R, R, R, 64, 64, R, 64, 67, R, 66, R, 64, R, 62, R, 59, R, R, R],
      bass: [40, 40, 52, 40, 40, 40, 52, 40, 38, 38, 50, 38, 36, 36, 48, 36, 40, 40, 52, 40, 43, 43, 55, 43, 40, 40, 52, 40, 35, 35, 47, 35],
    },
    boss: {
      bpm: 168, lead: [69, R, 69, 72, R, 69, R, 68, 67, R, 67, 70, R, 67, R, 66, 65, R, 65, 68, R, 65, R, 64, 63, 64, 65, 66, 67, R, R, R],
      bass: [33, 33, R, 33, 33, 45, 33, R, 31, 31, R, 31, 31, 43, 31, R, 29, 29, R, 29, 29, 41, 29, R, 28, 28, R, 28, 31, 31, R, 31],
    },
    win: { bpm: 140, lead: [72, 72, 72, R, 72, R, 76, R, 79, R, R, R, R, R, R, R], bass: [48, R, R, R, 55, R, R, R, 60, R, R, R, R, R, R, R] },
  };
  let cur = null, timer = null, step = 0, nextT = 0, once = false;

  function note(m, t, d, type, v) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = mtof(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g); g.connect(musGain); osc.start(t); osc.stop(t + d + 0.02);
  }
  function pump() { try { pumpInner(); } catch (e) { A.stopMusic(true); } }
  function pumpInner() {
    if (!cur || !ctx) return;
    const tr = TRACKS[cur], dur = 30 / tr.bpm;
    while (nextT < ctx.currentTime + 0.25) {
      const i = step % tr.lead.length;
      if (once && step >= tr.lead.length) { cur = null; return; }
      if (tr.lead[i]) note(tr.lead[i], nextT, dur * 1.7, 'square', 0.35);
      const b = tr.bass[step % tr.bass.length];
      if (b) note(b, nextT, dur * 1.9, 'triangle', 0.8);
      nextT += dur; step++;
    }
  }
  A.music = function (name, playOnce) {
    A._want = name;
    if (!A.ready) return;
    if (cur === name && timer && !playOnce) return;
    A.stopMusic(true);
    if (!A.musicOn || !name || !TRACKS[name]) return;
    cur = name; once = !!playOnce; step = 0; nextT = ctx.currentTime + 0.08;
    if (A.paused) return;                                      // starts when the game resumes
    timer = setInterval(pump, 80); pump();
  };
  A.stopMusic = function (keepWant) {
    if (timer) { clearInterval(timer); timer = null; }
    cur = null;
    if (!keepWant) A._want = null;
  };
  A.setMusic = function (on) { A.musicOn = on; if (!on) A.stopMusic(true); else if (A._want) A.music(A._want); };
  A.setSfx = function (on) { A.sfxOn = on; };
})();
