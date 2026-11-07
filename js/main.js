/* Super Star Leap DX - main: boot, menus, settings, level select, screen wiring */
(function () {
  'use strict';
  const SSL = window.SSL, G = SSL.game, I = SSL.input, A = SSL.audio;
  const $ = (id) => document.getElementById(id);
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', (e) => { A.unlock(); fn(e); }); };

  const fmtTime = (s) => { s = Math.max(0, +s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };

  // ---------------- screens ----------------
  function buildSelect() {
    const grid = $('grid'); grid.innerHTML = '';
    SSL.LEVELS.forEach((lv, i) => {
      const lock = i >= G.save.unlocked, done = !!G.save.done[i];
      const b = document.createElement('button');
      b.className = 'lv' + (lock ? ' lock' : '') + (done ? ' done' : '');
      b.disabled = lock; b.setAttribute('aria-disabled', String(lock));
      b.setAttribute('aria-label', lv.world + ' ' + SSL.pick(lv.name) + (lock ? ' · ' + SSL.t('locked') : ''));
      const got = G.medalsOf(i).filter(Boolean).length;
      const best = G.save.best[i];
      b.innerHTML = '<div class="n">' + lv.world + '</div><div class="m">' + SSL.pick(lv.name) + '</div>' +
        '<div class="s">' + (lock ? SSL.t('locked') : '\u2605 ' + got + '/' + lv.medals + (best ? '  \u00b7  ' + SSL.t('best') + ' ' + best : '')) + '</div>' +
        (!lock && G.save.time && G.save.time[i] ? '<div class="s">\u23f1 ' + SSL.t('fastest') + ' ' + fmtTime(G.save.time[i]) + '</div>' : '');
      if (!lock) b.addEventListener('click', () => { A.unlock(); A.play('select'); G.newGame(i); });
      grid.appendChild(b);
    });
  }
  function chip(label, sel, fn) {
    const c = document.createElement('button'); c.className = 'chip' + (sel ? ' sel' : ''); c.textContent = label;
    c.addEventListener('click', () => { A.unlock(); A.play('select'); fn(); buildSettings(); }); return c;
  }
  function row(label, ctl) {
    const r = document.createElement('div'); r.className = 'row2';
    const l = document.createElement('span'); l.textContent = label; const c = document.createElement('div'); c.className = 'ctl';
    ctl.forEach((x) => c.appendChild(x)); r.appendChild(l); r.appendChild(c); return r;
  }
  function buildSettings() {
    const el = $('setList'), s = G.settings, t = SSL.t; el.innerHTML = '';
    const set = (k, v) => () => { s[k] = v; G.applySettings(); };
    const onoff = (k) => [chip(t('on'), s[k], set(k, true)), chip(t('off'), !s[k], set(k, false))];
    el.appendChild(row(t('sfx'), onoff('sfx')));
    el.appendChild(row(t('music'), onoff('music')));
    el.appendChild(row(t('diff'), ['casual', 'normal', 'hard'].map((d) => chip(t(d), s.diff === d, set('diff', d)))));
    el.appendChild(row(t('touch'), [chip(t('auto'), s.touch === 'auto', set('touch', 'auto')), chip(t('on'), s.touch === 'on', set('touch', 'on')), chip(t('off'), s.touch === 'off', set('touch', 'off'))]));
    el.appendChild(row(t('touchSize'), [['S', 'small'], ['M', 'medium'], ['L', 'large']].map((x) => chip(t(x[1]), s.tsize === x[0], set('tsize', x[0])))));
    el.appendChild(row(t('padLayout'), ['dock', 'overlay'].map((v) => chip(t(v), s.padLayout === v, set('padLayout', v)))));
    el.appendChild(row(t('padHeight'), ['low', 'mid', 'high'].map((v) => chip(t(v), s.padHeight === v, set('padHeight', v)))));
    el.appendChild(row(t('padOpacity'), slider('padOpacity', 0.35, 1, 0.05)));
    el.appendChild(row(t('lefty'), onoff('lefty')));
    el.appendChild(row(t('shake'), onoff('shake')));
    el.appendChild(row(t('vib'), onoff('vib')));
    el.appendChild(row(t('sfxVol'), slider('sfxVol', 0, 1, 0.05)));
    el.appendChild(row(t('musVol'), slider('musVol', 0, 1, 0.05)));
    el.appendChild(row(t('fps'), onoff('fps')));

    function slider(k, min, max, step) {
      const v = G.settings[k];
      const inp = document.createElement('input');
      inp.type = 'range'; inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(v);
      inp.setAttribute('aria-label', t(k));
      const sp = document.createElement('span'); sp.className = 'pct'; sp.textContent = Math.round(v * 100) + '%';
      inp.addEventListener('input', () => {
        G.settings[k] = +inp.value; sp.textContent = Math.round(inp.value * 100) + '%';
        if (k === 'padOpacity') G.ui(); else SSL.audio.setVolume(G.settings.sfxVol, G.settings.musVol);
      });
      inp.addEventListener('change', () => { G.persist(); if (k === 'sfxVol') SSL.audio.play('coin'); });
      return [inp, sp];
    }
    el.appendChild(row(t('lang'), [chip(t('langAuto'), s.lang === 'auto', set('lang', 'auto')), chip('English', s.lang === 'en', set('lang', 'en')), chip('\u4e2d\u6587', s.lang === 'zh', set('lang', 'zh'))]));
  }
  G.showClear = function () {
    const w = G.world, ci = G.clearInfo, t = SSL.t;
    if (G.state === 'end') {
      $('endStats').innerHTML = t('score') + ': <b>' + G.score + '</b><br>' + t('medals') + ': <b>' + totalMedals() + ' / ' + SSL.LEVELS.reduce((a, l) => a + l.medals, 0) + '</b>';
      G.show('sc-end'); return;
    }
    $('clearStats').innerHTML = SSL.pick(G.level.name) + '<br>' +
      t('clearTime') + ': <b>' + fmtTime(ci.time) + '</b>' + (ci.isFast ? ' \u2014 ' + t('newRecord') : '') + '<br>' +
      t('timeBonus') + ': <b>' + ci.bonus + '</b><br>' +
      t('levelScore') + ': <b>' + ci.lvScore + '</b>' + (ci.isBest ? ' \u2014 ' + t('newBest') : '') + '<br>' +
      t('coins') + ': <b>' + ci.coins + '</b> &nbsp; ' + t('medals') + ': <b>' + ci.medals + ' / ' + ci.medalsMax + '</b><br>' +
      t('score') + ': <b>' + G.score + '</b>';
    const last = G.levelIndex >= SSL.LEVELS.length - 1;
    $('btnNext').style.display = last ? 'none' : '';
    G.show('sc-clear');
  };
  function totalMedals() { let n = 0; for (const k in G.save.medals) n += G.save.medals[k].filter(Boolean).length; return n; }

  // ---------------- wiring ----------------
  function wire() {
    on('btnPlay', () => { A.play('select'); const i = Math.min(G.save.unlocked, SSL.LEVELS.length) - 1; G.newGame(G.save.done[SSL.LEVELS.length - 1] ? 0 : i); });
    on('btnLevels', () => { buildSelect(); G.show('sc-select'); });
    on('btnSelBack', () => G.show('sc-title'));
    on('btnSettings', () => { G.settingsFrom = 'sc-title'; buildSettings(); G.show('sc-settings'); });
    on('btnHelp', () => { G.helpFrom = 'sc-title'; G.show('sc-help'); });
    on('btnPauseHelp', () => { G.helpFrom = 'sc-pause'; G.show('sc-help'); });
    on('btnHelpBack', () => G.show(G.helpFrom || 'sc-title'));
    on('btnPauseSet', () => { G.settingsFrom = 'sc-pause'; buildSettings(); G.show('sc-settings'); });
    on('btnSetBack', () => G.show(G.settingsFrom || 'sc-title'));
    on('btnReset', (e) => {
      const b = e.currentTarget;
      if (b.dataset.armed) { SSL.store.del('save'); G.save = { unlocked: 1, best: {}, medals: {}, done: {}, time: {} }; G.persist(); delete b.dataset.armed; b.textContent = SSL.t('reset'); G.toast('OK'); }
      else { b.dataset.armed = '1'; b.textContent = SSL.t('resetAsk'); setTimeout(() => { delete b.dataset.armed; b.textContent = SSL.t('reset'); }, 3500); }
    });
    on('btnResume', () => G.resume());
    on('btnRestart', () => { G.show(null); G.cpX = null; G.startLevel(G.levelIndex); });
    on('btnQuit', () => { buildSelect(); G.toMenu('sc-select'); });
    on('btnNext', () => { G.startLevel(G.levelIndex + 1); });
    on('btnClearSel', () => { buildSelect(); G.toMenu('sc-select'); });
    on('btnRetry', () => { G.newGame(G.levelIndex); });
    on('btnOverSel', () => { buildSelect(); G.toMenu('sc-select'); });
    on('btnEndSel', () => { buildSelect(); G.toMenu('sc-select'); });
    $('btnPause').addEventListener('click', () => { A.unlock(); G.pause(); });
    $('btnFs').addEventListener('click', toggleFs);
    document.addEventListener('keydown', (e) => {
      if (e.repeat || (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable))) return;
      if ((e.code === 'KeyP' || e.code === 'Escape') && G.state === 'paused' && G.screen === 'sc-pause') { e.preventDefault(); e.stopPropagation(); G.resume(); }
      if (e.code === 'KeyF' && (G.state === 'playing' || G.state === 'paused')) toggleFs();
    }, true);
  }
  function toggleFs() {
    const d = document, el = d.documentElement;
    try {
      if (!d.fullscreenElement && !d.webkitFullscreenElement) {
        const p = (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
        if (p && p.catch) p.catch(() => {});
      }
      else { (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d); }
    } catch (e) { /* ignore */ }
  }

  // Hold a screen lock only during active play, not while browsing menus or in the background.
  let wl = null, wakePending = false;
  function wake() {
    const active = !document.hidden && !G.screen && (G.state === 'playing' || G.state === 'intro');
    if (!active) {
      if (wl) { const old = wl; wl = null; try { const p = old.release(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* optional */ } }
      return;
    }
    try {
      if (!('wakeLock' in navigator) || wl || wakePending) return;
      wakePending = true;
      navigator.wakeLock.request('screen').then((l) => {
        wakePending = false;
        if (document.hidden || G.screen || (G.state !== 'playing' && G.state !== 'intro')) { const p = l.release(); if (p && p.catch) p.catch(() => {}); return; }
        wl = l; l.addEventListener('release', () => { if (wl === l) wl = null; });
      }).catch(() => { wakePending = false; });
    } catch (e) { wakePending = false; }
  }
  G.updateWake = wake;

  // ---------------- boot ----------------
  function boot() {
    G.canvas = $('game'); G.ctx = G.canvas.getContext('2d', { alpha: false });
    SSL.setLang(G.settings.lang);
    wire(); G.resize(); G.applySettings();
    const de = document.documentElement;
    if (!(de.requestFullscreen || de.webkitRequestFullscreen)) $('btnFs').style.display = 'none';
    wake(); document.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('resize', G.resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', G.resize);
    window.addEventListener('orientationchange', () => {
      I.clear(); if (G.state === 'playing' || G.state === 'intro') G.pause(); setTimeout(G.resize, 200);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (G.state === 'playing' || G.state === 'intro') G.pause(); I.clear(); A.suspend(); wake(); }
      else { wake(); if (G.state !== 'paused') { A.resume(); G.last = 0; } }
    });
    window.addEventListener('blur', () => { if (G.state === 'playing' || G.state === 'intro') G.pause(); });
    window.addEventListener('pagehide', () => { if (G.state === 'playing' || G.state === 'intro') G.pause(); I.clear(); A.suspend(); });
    // Android back button / swipe-back pauses instead of leaving the page
    window.addEventListener('popstate', () => {
      if (G.state === 'playing' || G.state === 'intro') { G.guard(); G.pause(); } else if (G.state === 'paused') G.guard();
    });
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !/[?&]sw=1/.test(location.search);
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !local) navigator.serviceWorker.register('sw.js').catch(() => {});
    G.state = 'menu'; G.show('sc-title');
    window.requestAnimationFrame(G.loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
