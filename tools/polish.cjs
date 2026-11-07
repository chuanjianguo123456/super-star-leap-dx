'use strict';
// Checks for the "background off" + volume polish: music must fully stop while the game is hidden or paused,
// volume settings must reach the gain nodes, and the settings screen must show the sliders.
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800, audio: true });
const { SSL, G, els } = H;
const A = SSL.audio, DT = SSL.DT;
let fails = 0;
const ok = (c, m) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };

// count live music timers by wrapping setInterval/clearInterval
const live = new Set();
const si = global.setInterval, ci = global.clearInterval;
global.setInterval = function (f, ms) { const id = si(() => {}, 1e9); live.add(id); return id; };
global.clearInterval = function (id) { live.delete(id); ci(id); };

console.log('-- defaults & settings UI');
ok(G.settings.sfxVol === 1 && G.settings.musVol === 1, 'volume defaults are 100% (sfx=' + G.settings.sfxVol + ', music=' + G.settings.musVol + ')');
H.els.btnSettings.click();
const rows = els.setList.children.length;
const sliders = els.setList.children.filter((r) => r.children && r.children.some((c) => c.className === 'ctl' && c.children.some((x) => x.type === 'range')));
ok(rows === 15, 'settings has 15 rows including tablet layout, height and opacity (got ' + rows + ')');
ok(sliders.length === 3, 'volume and tablet opacity sliders rendered (got ' + sliders.length + ')');

console.log('-- volume reaches the audio graph');
A.unlock();
A.setVolume(0.3, 0.5);
ok(A.vol.sfx === 0.3 && A.vol.music === 0.5, 'volume stored (sfx=' + A.vol.sfx + ', music=' + A.vol.music + ')');

console.log('-- music stops completely in the background');
G.newGame(0);
let g = 0; while (G.state !== 'playing' && g++ < 400) G.update(DT);
ok(G.state === 'playing', 'level started');
ok(live.size === 1, 'one music timer while playing (got ' + live.size + ')');
H.doc.hidden = true; H.fire('visibilitychange');
ok(G.state === 'paused', 'hiding the page pauses the game (state=' + G.state + ')');
ok(live.size === 0, 'no music timer while hidden (got ' + live.size + ')');
ok(A.paused === true, 'audio marked paused');
A.music('boss');
ok(live.size === 0, 'starting a track while hidden does not start the timer (got ' + live.size + ')');
H.doc.hidden = false; H.fire('visibilitychange');
ok(G.state === 'paused' && live.size === 0, 'still silent after returning (game stays paused until Resume)');
els.btnResume.click();
ok(G.state === 'playing' && live.size === 1, 'Resume restarts exactly one music timer (state=' + G.state + ', timers=' + live.size + ')');
G.pause();
ok(live.size === 0, 'pause menu is silent too (timers=' + live.size + ')');
els.btnQuit.click();
ok(G.state === 'menu' && live.size === 0, 'quitting to the menu leaves nothing running (timers=' + live.size + ')');

console.log(fails ? fails + ' FAILURES' : 'POLISH OK');
process.exit(fails ? 1 : 0);
