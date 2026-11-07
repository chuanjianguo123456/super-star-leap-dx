'use strict';
// Tablet input / pause regression suite.  It deliberately drives the game's
// real DOM event handlers through tools/harness.cjs; core files stay untouched.
const { load } = require('./harness.cjs');

// The music sequencer uses setInterval.  Keep the test process from being held
// open, while retaining enough bookkeeping to assert that music was restarted.
const nativeSetInterval = global.setInterval;
const nativeClearInterval = global.clearInterval;
const nativeSetTimeout = global.setTimeout;
const intervalHandles = new Set();
global.setInterval = function (fn, ms, ...args) {
  const h = nativeSetInterval(fn, ms, ...args);
  if (h && h.unref) h.unref();
  intervalHandles.add(h);
  return h;
};
global.clearInterval = function (h) {
  intervalHandles.delete(h);
  return nativeClearInterval(h);
};
// Toasts and the orientation resize callback are not part of these assertions.
global.setTimeout = function (fn, ms, ...args) {
  const h = nativeSetTimeout(fn, ms, ...args);
  if (h && h.unref) h.unref();
  return h;
};

let failures = 0;
let checks = 0;
const loaded = [];
function ok(condition, message) {
  checks++;
  if (condition) console.log('  ok  ' + message);
  else { failures++; console.log('  FAIL ' + message); }
}
function section(name, fn) {
  console.log('-- ' + name);
  try { fn(); }
  catch (e) {
    failures++;
    console.log('  FAIL threw: ' + (e && e.stack ? e.stack : e));
  }
}
function fresh(opts) {
  if (loaded.length) loaded[loaded.length - 1].SSL.audio.stopMusic();
  const h = load(Object.assign({ w: 1280, h: 800, touch: true, audio: true }, opts || {}));
  loaded.push(h);
  return h;
}
function startPlaying(h) {
  const { G, SSL } = h;
  G.newGame(0);
  let n = 0;
  while (G.state !== 'playing' && n++ < 300) G.update(SSL.DT);
  ok(G.state === 'playing', 'new game reaches playing state');
  ok(h.SSL.input.enabled === true, 'gameplay input is enabled');
  return h;
}

// Install distinct, non-overlapping tablet button rectangles.  The harness
// does not lay out CSS, so this is intentionally explicit and test-only.
function installRects(h) {
  const byName = {
    left:  { id: 'bLeft',  left: 80,   top: 620, width: 100, height: 100 },
    right: { id: 'bRight', left: 220,  top: 620, width: 100, height: 100 },
    down:  { id: 'bDown',  left: 900,  top: 510, width: 100, height: 100 },
    run:   { id: 'bRun',   left: 900,  top: 640, width: 100, height: 100 },
    jump:  { id: 'bJump',  left: 1050, top: 590, width: 130, height: 130 },
  };
  const captureLog = [];
  Object.keys(byName).forEach((name) => {
    const spec = byName[name], el = h.els[spec.id], held = new Set();
    el.rect = { left: spec.left, top: spec.top, width: spec.width, height: spec.height };
    el.setPointerCapture = (id) => { held.add(String(id)); captureLog.push('set:' + id); };
    el.hasPointerCapture = (id) => held.has(String(id));
    el.releasePointerCapture = (id) => { held.delete(String(id)); captureLog.push('release:' + id); };
    spec.el = el;
    spec.x = spec.left + spec.width / 2;
    spec.y = spec.top + spec.height / 2;
  });
  h.SSL.input.refreshButtons();
  return { byName, captureLog };
}
function touchEvent(rects, type, id, name, extra) {
  const spec = rects.byName[name];
  const ev = Object.assign({
    pointerId: id, pointerType: 'touch', button: 0,
    clientX: spec ? spec.x : 600, clientY: spec ? spec.y : 200,
    target: spec ? spec.el : null,
  }, extra || {});
  return { type, ev };
}
function down(h, rects, id, name, extra) {
  const x = touchEvent(rects, 'pointerdown', id, name, extra);
  h.fire(x.type, x.ev);
}
function move(h, rects, id, name, extra) {
  const x = touchEvent(rects, 'pointermove', id, name, extra);
  h.fire(x.type, x.ev);
}
function up(h, rects, id, name, extra) {
  const x = touchEvent(rects, 'pointerup', id, name, extra);
  h.fire(x.type, x.ev);
}
function cancel(h, rects, id, name, extra) {
  const x = touchEvent(rects, 'pointercancel', id, name, extra);
  h.fire(x.type, x.ev);
}
function lost(h, rects, id, name, extra) {
  const x = touchEvent(rects, 'lostpointercapture', id, name, extra);
  h.fire(x.type, x.ev);
}
function touchNames(I) {
  return ['left', 'right', 'down', 'jump', 'run', 'pause'].filter((n) => I.touch[n]);
}
function allOff(I) {
  return ['left', 'right', 'down', 'jump', 'run', 'pause'].every((n) => !I.touch[n] && !I.held[n] && !I.keys[n] && !I.pad[n]);
}
function menuTarget(selector) {
  return { closest: (q) => q.indexOf(selector) >= 0 ? this : null };
}

section('independent multi-pointer right + run + jump', () => {
  const h = fresh(), I = h.SSL.input, r = installRects(h);
  startPlaying(h);
  I.clear();
  down(h, r, 11, 'right');
  down(h, r, 12, 'run');
  down(h, r, 13, 'jump');
  ok(touchNames(I).sort().join(',') === 'jump,right,run', 'three pointers hold distinct controls');
  ok(I.held.right && I.held.run && I.held.jump, 'held state combines right/run/jump');
  I.poll();
  ok(I.pressed.right && I.pressed.run && I.pressed.jump, 'one poll reports all three press edges');
  up(h, r, 12, 'run');
  ok(I.touch.right && I.touch.jump && !I.touch.run, 'releasing run leaves right and jump held');
  up(h, r, 11, 'right');
  ok(!I.touch.right && I.touch.jump, 'releasing right leaves jump held');
  up(h, r, 13, 'jump');
  I.poll();
  ok(allOff(I), 'releasing all pointers clears controls');
});

section('pointer sliding between directions', () => {
  const h = fresh(), I = h.SSL.input, r = installRects(h);
  startPlaying(h);
  I.clear();
  down(h, r, 21, 'right');
  ok(I.touch.right && !I.touch.left, 'pointer starts on right');
  move(h, r, 21, 'left');
  ok(I.touch.left && !I.touch.right, 'same pointer slides right to left');
  move(h, r, 21, 'right');
  ok(I.touch.right && !I.touch.left, 'same pointer slides left to right');
  move(h, r, 21, 'down');
  ok(I.touch.down && !I.touch.right, 'same pointer slides right to down');
  move(h, r, 21, null, { clientX: 20, clientY: 20, target: h.canvas });
  ok(touchNames(I).length === 0, 'sliding outside the pad releases the pointer');
  // A pointer which began outside must not acquire a button by moving in.
  down(h, r, 22, null, { clientX: 20, clientY: 20, target: h.canvas });
  move(h, r, 22, 'left');
  ok(touchNames(I).length === 0, 'stray pointer cannot acquire a control on move');
  up(h, r, 22, 'left');
});

section('pointercancel and lostpointercapture cleanup', () => {
  const h = fresh(), I = h.SSL.input, r = installRects(h);
  startPlaying(h);
  I.clear();
  down(h, r, 31, 'right');
  ok(I.touch.right, 'pointercancel setup holds right');
  cancel(h, r, 31, 'right');
  ok(allOff(I), 'pointercancel clears touch and held state');
  ok(r.captureLog.indexOf('release:31') >= 0, 'pointercancel releases pointer capture');
  down(h, r, 32, 'jump');
  ok(I.touch.jump, 'lost-capture setup holds jump');
  lost(h, r, 32, 'jump');
  ok(allOff(I), 'lostpointercapture clears touch and held state');
  ok(r.captureLog.indexOf('release:32') >= 0, 'lostpointercapture releases pointer capture');
});

section('jump key aliases, concurrent aliases, and clear()', () => {
  const h = fresh(), I = h.SSL.input;
  startPlaying(h);
  const aliases = ['ArrowUp', 'KeyW', 'Space', 'KeyZ', 'KeyK'];
  aliases.forEach((code) => {
    I.clear();
    h.fire('keydown', { code, target: h.els.game || h.doc.body, repeat: false });
    ok(I.keys.jump && I.held.jump, code + ' maps to held jump');
    I.poll();
    ok(I.pressed.jump, code + ' produces jump pressed edge');
    h.fire('keyup', { code, target: h.doc.body });
    ok(!I.keys.jump && !I.held.jump, code + ' release clears jump');
    I.poll();
    ok(I.released.jump, code + ' produces jump released edge');
  });
  I.clear();
  h.fire('keydown', { code: 'ArrowUp', target: h.doc.body, repeat: false });
  h.fire('keydown', { code: 'Space', target: h.doc.body, repeat: false });
  h.fire('keyup', { code: 'ArrowUp', target: h.doc.body });
  ok(I.keys.jump && I.held.jump, 'one jump alias release does not drop another alias');
  h.fire('keyup', { code: 'Space', target: h.doc.body });
  ok(!I.keys.jump && !I.held.jump, 'all concurrent jump aliases released');
  h.fire('keydown', { code: 'KeyW', target: h.doc.body, repeat: false });
  I.clear();
  ok(allOff(I), 'clear() removes keyboard state and edge latches');
  h.fire('keyup', { code: 'KeyW', target: h.doc.body });
  ok(!I.keys.jump && !I.held.jump, 'late keyup after clear stays clear');
});

section('stray pointers and menu/top-button pointers do not control play', () => {
  const h = fresh(), I = h.SSL.input, r = installRects(h);
  // The title menu is not gameplay input, even if the coordinate is over a pad rect.
  down(h, r, 41, 'right');
  ok(!I.enabled && allOff(I), 'pointer on pad coordinates in title menu is ignored');
  startPlaying(h);
  I.clear();
  const topTarget = { closest: (q) => q.indexOf('#topbtns') >= 0 ? topTarget : null };
  down(h, r, 42, 'right', { target: topTarget });
  ok(allOff(I), 'pointer whose target is top buttons is ignored');
  const screenTarget = { closest: (q) => q.indexOf('#screens') >= 0 ? screenTarget : null };
  down(h, r, 43, 'jump', { target: screenTarget });
  ok(allOff(I), 'pointer whose target is a menu screen is ignored');
  down(h, r, 44, null, { clientX: 500, clientY: 200, target: h.canvas });
  move(h, r, 44, 'right');
  ok(allOff(I), 'outside pointer and subsequent move do not control play');
  up(h, r, 44, 'right');
});

function checkResizePause(kind) {
  const h = fresh(), I = h.SSL.input, r = installRects(h);
  startPlaying(h);
  down(h, r, 51, 'right');
  down(h, r, 52, 'run');
  if (kind === 'resize') {
    global.innerWidth = 800; global.innerHeight = 1280;
    h.fire('resize');
  } else {
    h.fire('orientationchange');
  }
  ok(GState(h) === 'paused', kind + ' pauses active gameplay');
  ok(h.G.screen === 'sc-pause', kind + ' shows pause screen');
  ok(allOff(I), kind + ' clears held touch controls');
}
function GState(h) { return h.G.state; }
section('rotation and resizing clear controls and pause', () => {
  checkResizePause('resize');
  checkResizePause('orientationchange');
});

function checkBackgroundPause(kind) {
  const h = fresh(), I = h.SSL.input;
  // New level begins in intro, which must also pause when backgrounded.
  h.G.newGame(0);
  ok(h.G.state === 'intro', kind + ' setup is intro');
  if (kind === 'blur') h.fire('blur');
  else { h.doc.hidden = true; h.fire('visibilitychange'); }
  ok(h.G.state === 'paused', kind + ' pauses intro');
  ok(h.G.screen === 'sc-pause', kind + ' intro pause screen is shown');
  ok(allOff(I), kind + ' intro controls are clear');
}
section('intro blur and hidden pause', () => {
  checkBackgroundPause('blur');
  checkBackgroundPause('hidden');
});

section('restart from pause resumes audio and restarts music interval', () => {
  const h = fresh(), A = h.SSL.audio;
  A.unlock();
  startPlaying(h);
  // Advance enough fixed steps for intro -> playing and music() to run.
  ok(A.ready === true, 'audio context unlocked');
  ok(intervalHandles.size > 0, 'playing music has an active sequencer interval');
  h.G.pause();
  ok(h.G.state === 'paused' && A.paused === true, 'pause suspends game audio');
  const stopped = intervalHandles.size;
  ok(stopped === 0, 'pause clears the music interval');
  h.els.btnRestart.click();
  let n = 0;
  while (h.G.state !== 'playing' && n++ < 300) h.G.update(h.SSL.DT);
  ok(h.G.state === 'playing', 'restart from pause returns to playing');
  ok(A.paused === false, 'restart clears audio paused flag');
  ok(intervalHandles.size > stopped, 'restart starts a fresh music interval');
  A.stopMusic();
});

section('gamepad Start edge pauses, release arms, next Start resumes via G.loop', () => {
  const h = fresh(), I = h.SSL.input, A = h.SSL.audio;
  const buttons = Array.from({ length: 10 }, () => ({ pressed: false }));
  const gp = { connected: true, buttons, axes: [0, 0] };
  global.navigator.getGamepads = () => [gp];
  A.unlock();
  startPlaying(h);
  buttons[9].pressed = true;
  h.G.loop(1000);
  h.G.loop(1100); // enough time for at least one fixed-step poll
  ok(h.G.state === 'paused' && h.G.screen === 'sc-pause', 'held Start pauses through G.loop');
  buttons[9].pressed = false;
  h.G.loop(1200); // release is observed while paused
  ok(h.G.state === 'paused', 'released Start does not resume by itself');
  buttons[9].pressed = true;
  h.G.loop(1300); // next rising Start edge resumes while paused
  ok(h.G.state === 'playing' && h.G.screen === null, 'next Start resumes through G.loop');
  ok(A.paused === false && I.pad.pause === false, 'resume leaves audio active and Start unheld');
  buttons[9].pressed = false;
  h.G.loop(1400);
  A.stopMusic();
});

// Do not leave any music sequencers from isolated harnesses running.  The
// interval wrapper above also makes this safe if a test failed halfway through.
loaded.forEach((h) => { try { h.SSL.audio.stopMusic(); } catch (e) {} });
intervalHandles.forEach((h) => nativeClearInterval(h));
intervalHandles.clear();
console.log(failures ? failures + ' FAILURES (' + checks + ' checks)' : 'TABLET INPUT OK (' + checks + ' checks)');
process.exitCode = failures ? 1 : 0;
