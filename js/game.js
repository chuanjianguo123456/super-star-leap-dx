/* Super Star Leap DX - game: state machine, settings, save data, level flow, main loop */
(function () {
  'use strict';
  const SSL = window.SSL, TS = SSL.TS, DT = SSL.DT, I = SSL.input, A = SSL.audio;
  const DIFF = { casual: { spd: 0.85, lives: 7 }, normal: { spd: 1, lives: 5 }, hard: { spd: 1.2, lives: 3 } };
  const DEFAULTS = { sfx: true, music: true, touch: 'auto', tsize: 'M', lefty: false, lang: 'auto', shake: true, vib: true, fps: false, diff: 'normal', sfxVol: 1, musVol: 1, padLayout: 'dock', padOpacity: 0.85, padHeight: 'mid' };

  const G = SSL.game = {
    state: 'boot', screen: null, prevState: null, world: null, level: null, levelIndex: 0,
    lives: 5, score: 0, scoreBase: 0, coins: 0, carryPow: 0, cpX: null, runMedals: {}, timeLeft: 0,
    introT: 0, deadT: 0, clearT: 0, fade: 0, t: 0, acc: 0, last: 0, fps: 60, frames: 0, fpsT: 0, lvScoreBase: 0,
    cam: { x: 0 }, scale: 1, dpr: 1, cssW: 800, cssH: 480, viewW: 800, hurried: false, finished: false,
  };
  G.settings = Object.assign({}, DEFAULTS, SSL.store.get('settings', {}));
  const choices = { touch: ['auto', 'on', 'off'], tsize: ['S', 'M', 'L'], lang: ['auto', 'en', 'zh'], diff: ['casual', 'normal', 'hard'], padLayout: ['dock', 'overlay'], padHeight: ['low', 'mid', 'high'] };
  Object.keys(choices).forEach((k) => { if (!choices[k].includes(G.settings[k])) G.settings[k] = DEFAULTS[k]; });
  ['sfx', 'music', 'lefty', 'shake', 'vib', 'fps'].forEach((k) => { if (typeof G.settings[k] !== 'boolean') G.settings[k] = DEFAULTS[k]; });
  ['sfxVol', 'musVol', 'padOpacity'].forEach((k) => { G.settings[k] = Number.isFinite(G.settings[k]) ? SSL.clamp(G.settings[k], k === 'padOpacity' ? 0.35 : 0, 1) : DEFAULTS[k]; });
  SSL.audio.setVolume(G.settings.sfxVol, G.settings.musVol);
  G.save = Object.assign({ unlocked: 1, best: {}, medals: {}, done: {} }, SSL.store.get('save', {}));
  G.persist = function () { SSL.store.set('settings', G.settings); SSL.store.set('save', G.save); };
  G.medalsOf = function (i) { const m = G.save && G.save.medals && G.save.medals[i]; return Array.isArray(m) ? m : []; };
  (function sanitize() {
    const s = G.save;
    if (!s || typeof s !== 'object') G.save = s = {};
    ['best', 'medals', 'done', 'time'].forEach((k) => { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
    s.unlocked = Math.max(1, Math.min(SSL.LEVELS.length, parseInt(s.unlocked, 10) || 1));
    if (!G.settings || typeof G.settings !== 'object') G.settings = Object.assign({}, DEFAULTS);
    Object.keys(DEFAULTS).forEach((k) => { if (G.settings[k] === undefined) G.settings[k] = DEFAULTS[k]; });
  })();

  const mq = (q) => (window.matchMedia ? window.matchMedia(q).matches : false);
  G.touchLikely = mq('(pointer:coarse)') || (navigator.maxTouchPoints || 0) > 0;
  if (mq('(prefers-reduced-motion: reduce)') && SSL.store.get('settings', null) == null) G.settings.shake = false;

  G.toast = function (msg, ms) {
    const el = document.getElementById('toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show'); clearTimeout(G._tt);
    G._tt = setTimeout(() => el.classList.remove('show'), ms || 1800);
  };
  G.vibrate = function (ms) { if (G.settings.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  G.applySettings = function () {
    const s = G.settings;
    A.setSfx(s.sfx); A.setMusic(s.music); SSL.setLang(s.lang);
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = SSL.t(el.getAttribute('data-i18n')); });
    const labels = { btnPause: 'pause', btnFs: 'fullscreen', bLeft: 'left', bRight: 'right', bJump: 'jump', bRun: 'runFire', bDown: 'down' };
    Object.keys(labels).forEach((id) => {
      const el = document.getElementById(id); if (!el) return;
      const label = SSL.t(labels[id]); el.setAttribute('aria-label', label); el.setAttribute('title', label);
      if (id === 'bJump' || id === 'bRun') el.setAttribute('data-caption', label);
    });
    G.resize(); G.persist();
  };
  G.touchActive = function () { const s = G.settings; return s.touch === 'on' || (s.touch === 'auto' && (G.touchLikely || I.anyTouchUsed)); };
  G.ui = function () {
    const b = document.body, s = G.settings, layout = G.layout;
    const inPlay = !G.screen && (G.state === 'intro' || G.state === 'playing' || G.state === 'dying' || G.state === 'clear');
    const touchOn = G.touchActive();
    b.classList.toggle('playing', inPlay);
    b.classList.toggle('menu-open', !!G.screen);
    b.classList.toggle('touch-on', touchOn);
    b.classList.toggle('lefty', !!s.lefty);
    b.classList.toggle('portrait', !!G.portrait);
    b.classList.toggle('docked', !!(layout && layout.docked));
    b.classList.toggle('touch-info', !!(layout && layout.docked && (layout.portrait || layout.infoWidth >= 180)));
    if (layout) {
      const high = s.padHeight === 'high' ? 1 : s.padHeight === 'low' ? 0 : 0.5;
      const spare = layout.docked ? Math.max(0, G.cssH - G.playH - G.safe.bottom - 162 * layout.touchScale - 12) : G.cssH * 0.08;
      b.style.setProperty('--tsize', layout.touchScale.toFixed(3));
      b.style.setProperty('--pad-edge', layout.touchEdge + 'px');
      b.style.setProperty('--pad-bottom', (layout.docked ? 10 + Math.min(spare, Math.max(0, layout.touchBottom - 10) + spare * 0.3 * high) : layout.touchBottom + spare * high).toFixed(1) + 'px');
      b.style.setProperty('--play-height', G.playH + 'px');
      b.style.setProperty('--pad-info-width', Math.max(120, layout.infoWidth) + 'px');
      b.style.setProperty('--pad-opacity', s.padOpacity);
    }
    I.enabled = inPlay && G.state === 'playing';
    I.touchEnabled = I.enabled && touchOn;
    if (I.refreshButtons) I.refreshButtons();
    if (G.updateWake) G.updateWake();
  };
  G.show = function (id) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    G.screen = id || null;
    if (id) document.getElementById(id).classList.remove('hidden');
    if (id) { I.clear(); }
    G.ui();
  };

  // ---------------- level flow ----------------
  G.newGame = function (idx) {
    G.lives = DIFF[G.settings.diff].lives; G.score = 0; G.coins = 0; G.carryPow = 0; G.finished = false;
    G.startLevel(idx);
  };
  G.guard = function () { try { if (!(history.state && history.state.g)) history.pushState({ g: 1 }, ''); } catch (e) { /* ignore */ } };
  G.startLevel = function (idx) {
    G.guard();
    G.levelIndex = idx; G.level = SSL.LEVELS[idx]; G.cpX = null; G.runMedals = {}; G.lvScoreBase = 0; G.lvTime = 0;
    const th = G.level.theme;
    if (G._theme !== th) { SSL.gfx.cache.layers = {}; G._theme = th; }
    G.spawn(); G.state = 'intro'; G.introT = 1.7; G.fade = 0;
    A.stopMusic(); A.resume(); G.acc = 0; G.last = 0; G.slowT = 0; G.slowAcc = 0; G.show(null); G.ui();
    if (G.portrait && !G._rotTip) { G._rotTip = true; setTimeout(() => G.toast(SSL.t('rotateHint'), 3400), 700); }
  };
  G.spawn = function () {
    const lv = G.level, cp = G.cpX;
    const w = new SSL.World(lv, G.hooks);
    const sx = cp != null ? cp : (lv.startX * TS + 16);
    const pl = new SSL.Player(sx - SSL.PHYS.w / 2, 13 * TS);
    if (G.carryPow > 0) { pl.pow = G.carryPow; pl.h = SSL.PHYS.hBig; pl.y = 13 * TS - pl.h; }
    pl.invuln = 0.8;
    w.player = pl; w.spd = DIFF[G.settings.diff].spd;
    const proto = SSL.World.prototype;
    w.sfx = function (n) { A.play(n); if (n === 'hurt' || n === 'die') G.vibrate(n === 'die' ? 160 : 70); };
    w.shake = function (a) { if (G.settings.shake) proto.shake.call(w, a); };
    // collected medals stay collected within this run; checkpoints before the respawn point are lit
    w.items = w.items.filter((it) => !(it.kind === 'medal' && G.runMedals[it.idx]));
    if (cp != null) w.items.forEach((it) => { if (it.kind === 'checkpoint' && it.x + it.w / 2 <= cp + 1) it.active = true; });
    G.world = w; G.scoreBase = G.score; G.timeLeft = lv.time; G.hurried = false;
    G.cam.x = SSL.clamp(sx - G.viewW * 0.4, 0, Math.max(0, lv.w * TS - G.viewW));
    w.camX = G.cam.x; w.viewW = G.viewW;
    I.clear();
  };
  G.respawn = function () {
    if (G.world) G.lvScoreBase += G.world.stats.score;   // keep points earned before the death
    G.carryPow = 0; G.spawn(); G.state = 'playing'; G.fade = 1; G.ui();
    A.music(G.level.music);
  };

  G.hooks = {
    coin(n) {
      G.coins += n;
      if (G.coins >= 100) { G.coins -= 100; G.lives++; A.play('oneup'); G.toast(SSL.t('oneUp') + '  ' + SSL.t('lives') + ' ' + G.lives); }
    },
    life(n) { G.lives += n; },
    dead() { G.onDead(); },
    checkpoint(x) { G.cpX = x; },
    medal(i) { G.runMedals[i] = true; },
    bossStart() { A.music('boss'); G.toast(SSL.t('bossHint'), 2600); },
    bossDying() { A.stopMusic(); G.slowT = 1.2; },
    bossRage() { G.toast(SSL.t('bossRage'), 1600); },
    bossDown() { /* orb appears */ },
    flag() { A.stopMusic(); },
    levelClear() { G.onClear(false); },
    orb() { G.onClear(true); },
  };

  G.onDead = function () {
    if (G.state === 'dying') return;
    G.state = 'dying'; G.deadT = 0; A.stopMusic(); I.enabled = false; I.clear();
  };
  G.onClear = function (final) {
    if (G.state === 'clear' || G.state === 'end') return;
    const w = G.world, idx = G.levelIndex, sv = G.save;
    const bonus = Math.max(0, Math.floor(G.timeLeft)) * 10;
    w.stats.score += bonus; G.score = G.scoreBase + w.stats.score;
    G.carryPow = w.player.pow;
    const got = G.medalsOf(idx).slice();
    for (const k in G.runMedals) got[k] = true;
    sv.medals[idx] = got;
    const lvScore = G.lvScoreBase + w.stats.score, prev = sv.best[idx] || 0, isBest = lvScore > prev;
    if (isBest) sv.best[idx] = lvScore;
    if (!sv.time || typeof sv.time !== 'object') sv.time = {};
    const clearTime = Math.round(G.lvTime * 100) / 100, prevT = +sv.time[idx] || 0, isFast = !prevT || clearTime < prevT;
    if (isFast) sv.time[idx] = clearTime;
    sv.done[idx] = true; sv.unlocked = Math.max(sv.unlocked, Math.min(SSL.LEVELS.length, idx + 2));
    G.persist();
    G.clearInfo = { lvScore: lvScore, bonus: bonus, isBest: isBest, time: clearTime, isFast: isFast && !!prevT, medals: got.filter(Boolean).length, medalsMax: G.level.medals, coins: w.stats.coins };
    G.state = final ? 'end' : 'clear'; G.clearT = 0; G.finished = !!final;
    I.enabled = false; I.clear(); G.ui();
    if (final) { A.music('win', true); } 
  };
  G.pause = function () {
    if (G.state !== 'playing' && G.state !== 'intro') return;
    G.prevState = G.state; G.state = 'paused'; I.enabled = false; I.clear();
    A.play('pause'); A.suspend(); G.show('sc-pause');
  };
  G.resume = function () {
    if (G.state !== 'paused') return;
    G.state = G.prevState || 'playing'; G.show(null); A.resume(); G.last = 0; G.ui();
  };
  G.toMenu = function (screenId) {
    G.state = 'menu'; G.world = null; A.stopMusic(); A.resume(); G.show(screenId || 'sc-title');
  };
  I.onPause = function () {
    if (G.state === 'paused' && G.screen === 'sc-pause') G.resume(); else G.pause();
  };

  // ---------------- per-frame update ----------------
  G.update = function (dt) {
    const w = G.world; G.t += dt;
    if (G.fade > 0) G.fade = Math.max(0, G.fade - dt * 2.5);
    if (!w) return;
    switch (G.state) {
      case 'intro':
        G.introT -= dt;
        if (G.introT <= 0) { G.state = 'playing'; G.ui(); A.music(G.level.music); if (G.levelIndex === 0 && !G.tipShown) { G.tipShown = true; G.toast(SSL.t('getReady'), 1200); } }
        G.camera(dt, true); break;
      case 'playing':
        if (G.slowT > 0) { G.slowT -= dt; G.slowAcc = (G.slowAcc || 0) + 0.35; if (G.slowAcc < 1) break; G.slowAcc -= 1; }
        G.tick(dt, w); break;
      case 'dying':
        G.deadT += dt; w.step(dt, w.noInput);
        if (G.deadT > 2.1) G.fade = Math.min(1, (G.deadT - 2.1) * 2.2);
        if (G.deadT > 2.6) {
          G.lives--;
          if (G.lives <= 0) { G.state = 'over'; G.show('sc-over'); } else G.respawn();
        }
        break;
      case 'clear': case 'end':
        G.clearT += dt; w.step(dt, w.noInput); G.camera(dt);
        if (G.clearT > 1.1 && !G.screen) G.showClear();
        break;
      default: break;
    }
  };
  G.tick = function (dt, w) {
    I.poll();
    if (G.state !== 'playing') return;
    const inp = G.inp || (G.inp = { pressed: {}, released: {} });
    inp.left = I.held.left; inp.right = I.held.right; inp.down = I.held.down; inp.jump = I.held.jump; inp.run = I.held.run;
    inp.pressed = I.pressed; inp.released = I.released;
    w.step(dt, inp);
    G.score = G.scoreBase + w.stats.score;
    if (!w.flagHit && !w.player.dead) G.lvTime += dt;
    if (!w.flagHit && !w.player.dead && w.bossMode !== 2) {
      G.timeLeft -= dt;
      if (G.timeLeft <= 100 && !G.hurried) { G.hurried = true; G.toast(SSL.t('hurryUp')); A.play('hurry'); }
      if (G.timeLeft <= 0) { G.timeLeft = 0; w.player.die(w); }
    }
    G.camera(dt);
  };
  G.camera = function (dt, snap) {
    const w = G.world, pl = w.player, lv = G.level, vw = G.viewW;
    let tx = pl.x + pl.w / 2 - vw * 0.42 + pl.face * Math.min(60, Math.abs(pl.vx) * 0.22);
    let lo = 0, hi = Math.max(0, lv.w * TS - vw);
    if (w.camLock) {
      const a0 = w.camLock.x0, a1 = w.camLock.x1;
      if (vw >= a1 - a0) { lo = hi = (a0 + a1) / 2 - vw / 2; tx = lo; }               // whole arena fits: keep it centred
      else {
        lo = a0; hi = a1 - vw;
        const bs = w.boss;
        if (bs && !bs.remove && w.bossMode === 1) {                                    // frame hero and boss together when possible
          const px = pl.x + pl.w / 2;
          tx = SSL.clamp((px + bs.x + bs.w / 2) / 2 - vw / 2, px + 90 - vw, px - 90);
        }
      }
    }
    tx = SSL.clamp(tx, lo, hi);
    if (snap) G.cam.x = tx; else G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 6.5);
    G.cam.x = SSL.clamp(G.cam.x, lo, hi);
    w.camX = G.cam.x; w.viewW = vw;
  };

  G.loop = function (ts) {
    window.requestAnimationFrame(G.loop);
    const now = ts / 1000;
    if (!G.last) G.last = now;
    let dt = now - G.last; G.last = now;
    if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
    G.frames++; G.fpsT += dt; if (G.fpsT >= 0.5) { G.fps = Math.round(G.frames / G.fpsT); G.frames = 0; G.fpsT = 0; }
    if (G.state === 'paused') I.poll();
    if (G.state !== 'paused' && G.state !== 'boot') {
      G.acc += dt; let n = 0;
      while (G.acc >= DT && n < 5) { G.update(DT); G.acc -= DT; n++; }
      if (n === 5) G.acc = 0;
    }
    G.t2 = now;
    if (G.render) G.render(now);
  };

  G.resize = function () {
    const cv = G.canvas; if (!cv) return;
    const cssW = Math.max(240, Math.floor(window.innerWidth)), cssH = Math.max(200, Math.floor(window.innerHeight));
    const previous = G.layout;
    if (previous && (Math.abs(previous.cssW - cssW) > 24 || Math.abs(previous.cssH - cssH) > 80)) {
      I.clear();
      if (G.state === 'playing' || G.state === 'intro') G.pause();
    }
    let safe = { top: 0, right: 0, bottom: 0, left: 0 };
    if (window.getComputedStyle) {
      const st = window.getComputedStyle(document.getElementById('app'));
      ['top', 'right', 'bottom', 'left'].forEach((k) => { safe[k] = parseFloat(st.getPropertyValue('--safe-' + k)) || 0; });
    }
    const layout = SSL.tabletLayout(cssW, cssH, G.settings, G.touchActive(), safe);
    let dpr = SSL.clamp(window.devicePixelRatio || 1, 1, 2);
    while (cssW * cssH * dpr * dpr > 4.0e6 && dpr > 1) dpr -= 0.25;
    const cw = Math.round(cssW * dpr), ch = Math.round(cssH * dpr);
    if (cv.width !== cw) cv.width = cw; if (cv.height !== ch) cv.height = ch;
    if (cv.style) { cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'; }
    G.cssW = cssW; G.cssH = cssH; G.dpr = dpr; G.layout = layout; G.safe = layout.safe;
    G.portrait = layout.portrait; G.scale = layout.scale; G.playH = layout.playH; G.viewW = layout.viewW;
    SSL.gfx.setScale(Math.min(2, G.scale * dpr));
    if (G.world) G.camera(0, true);
    G.ui();
  };
})();
