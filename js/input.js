/* Super Star Leap DX - input: keyboard, multi-touch virtual pad (slide between buttons), gamepad */
(function () {
  'use strict';
  const SSL = window.SSL;
  const NAMES = ['left', 'right', 'down', 'jump', 'run', 'pause'];
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
    KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'run',
    KeyP: 'pause', Escape: 'pause',
  };
  const I = SSL.input = {
    enabled: false,         // gameplay input on/off (menus use the DOM instead)
    held: {}, pressed: {}, released: {},
    keys: {}, touch: {}, pad: {},
    latchP: {}, latchR: {},
    anyTouchUsed: false,
    touchEnabled: false,
    onPause: null,
  };
  NAMES.forEach((n) => { I.held[n] = I.pressed[n] = I.released[n] = false; I.keys[n] = I.touch[n] = I.pad[n] = false; });

  function recompute() {
    NAMES.forEach((n) => {
      const was = I.held[n];
      const now = !!(I.keys[n] || I.touch[n] || I.pad[n]);
      if (now && !was) I.latchP[n] = true;
      if (!now && was) I.latchR[n] = true;
      I.held[n] = now;
    });
  }

  /** Call once at the start of each fixed simulation step. Converts latched events into per-step edges. */
  I.poll = function () {
    pollPad();
    recompute();
    NAMES.forEach((n) => {
      I.pressed[n] = !!I.latchP[n];
      I.released[n] = !!I.latchR[n];
      I.latchP[n] = I.latchR[n] = false;
    });
    if (I.pressed.pause && I.onPause) I.onPause();
  };
  I.clear = function () {
    NAMES.forEach((n) => { I.keys[n] = I.touch[n] = I.pad[n] = false; I.held[n] = I.pressed[n] = I.released[n] = false; I.latchP[n] = I.latchR[n] = false; });
    for (const k in tp) { releasePointer(k); delete tp[k]; }
    for (const k in downCodes) delete downCodes[k];
    syncButtons();
  };

  // ---------- keyboard ----------
  const downCodes = {};
  const editing = (e) => e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable);
  window.addEventListener('keydown', (e) => {
    const n = KEYMAP[e.code];
    if (!n || !I.enabled || editing(e)) return;
    e.preventDefault();
    if (e.repeat) return;
    downCodes[e.code] = true; I.keys[n] = true; recompute();
    SSL.audio && SSL.audio.unlock();
  }, { passive: false });
  window.addEventListener('keyup', (e) => {
    const n = KEYMAP[e.code];
    if (!n) return;
    delete downCodes[e.code];
    I.keys[n] = Object.keys(downCodes).some((code) => KEYMAP[code] === n);
    recompute();
  });
  window.addEventListener('blur', () => I.clear());

  // ---------- touch / pointer virtual pad ----------
  const tp = {};            // pointerId -> button name
  let btnEls = [];
  function collect() { btnEls = Array.prototype.slice.call(document.querySelectorAll('.tb')); }
  function hit(x, y) {
    let best = null, bd = 1e9;
    for (let i = 0; i < btnEls.length; i++) {
      const r = btnEls[i].getBoundingClientRect();
      if (r.width === 0) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const rad = r.width / 2 * 1.2;       // forgiving hit radius, kept below cross-cluster overlap on compact tablets
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad && d < bd) { bd = d; best = btnEls[i].getAttribute('data-btn'); }
    }
    return best;
  }
  function syncButtons() {
    const on = {};
    for (const id in tp) if (tp[id]) on[tp[id]] = true;
    NAMES.forEach((n) => { I.touch[n] = !!on[n]; });
    btnEls.forEach((el) => el.classList.toggle('on', !!on[el.getAttribute('data-btn')]));
    recompute();
  }
  const captures = {};
  function releasePointer(id) {
    const el = captures[id]; delete captures[id];
    try { if (el && el.hasPointerCapture && el.hasPointerCapture(+id)) el.releasePointerCapture(+id); } catch (e) { /* already released */ }
  }
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!I.enabled) return;
    if (e.target && e.target.closest && e.target.closest('#topbtns, #screens')) return;
    if (e.pointerType !== 'mouse' && !I.anyTouchUsed) {
      I.anyTouchUsed = true;
      if (SSL.game) SSL.game.resize();
    }
    if (!I.touchEnabled) return;
    const b = hit(e.clientX, e.clientY);
    if (!b) return;
    SSL.audio && SSL.audio.unlock();
    tp[e.pointerId] = b;
    try { if (e.target && e.target.setPointerCapture) { e.target.setPointerCapture(e.pointerId); captures[e.pointerId] = e.target; } } catch (err) { /* optional */ }
    syncButtons(); e.preventDefault();
  }
  function onMove(e) {
    if (!(e.pointerId in tp)) return;
    const b = I.enabled && I.touchEnabled ? hit(e.clientX, e.clientY) : null;
    if (b !== tp[e.pointerId]) { tp[e.pointerId] = b; syncButtons(); }
    e.preventDefault();
  }
  function onUp(e) {
    if (!(e.pointerId in tp)) return;
    delete tp[e.pointerId]; releasePointer(e.pointerId);
    syncButtons();
  }
  window.addEventListener('pointerdown', onDown, { passive: false });
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('lostpointercapture', onUp);
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('DOMContentLoaded', collect);
  I.refreshButtons = collect;

  // ---------- gamepad ----------
  let padWas = {};
  function pollPad() {
    const gps = (navigator.getGamepads && navigator.getGamepads()) || [];
    let gp = null;
    for (let i = 0; i < gps.length; i++) if (gps[i] && gps[i].connected) { gp = gps[i]; break; }
    NAMES.forEach((n) => { I.pad[n] = false; });
    if (!gp) { padWas = {}; return; }
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    I.pad.left = b(14) || ax < -0.4;
    I.pad.right = b(15) || ax > 0.4;
    I.pad.down = b(13) || ay > 0.6;
    I.pad.jump = b(0) || b(3) || b(12);
    I.pad.run = b(1) || b(2) || b(5) || b(7);
    const start = b(9);
    if (start && !padWas.start && I.onPause) I.onPause();
    padWas.start = start;
  }
})();
