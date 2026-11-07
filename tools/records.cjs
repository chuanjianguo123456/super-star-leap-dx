'use strict';
// Best clear time: measured across deaths, saved only when faster, shown on the clear screen and level select.
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800, audio: true });
const { SSL, G, els } = H;
const DT = SSL.DT;
let fails = 0;
const ok = (c, m) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
const toPlaying = () => { let g = 0; while (G.state !== 'playing' && g++ < 400) G.update(DT); };
const flagNow = () => { const w = G.world, p = w.player; w.ents.length = 0; p.x = w.level.flagX * SSL.TS + 4; p.y = 13 * SSL.TS - p.h; let g = 0; while (G.state === 'playing' && g++ < 900) G.update(DT); g = 0; while (!G.screen && g++ < 400) G.update(DT); };

G.settings.diff = 'normal';
G.newGame(0); toPlaying();
G.world.ents.length = 0;
for (let i = 0; i < 600; i++) G.update(DT);            // 10 s of play
G.world.player.die(G.world); let g = 0; while (G.state === 'dying' && g++ < 400) G.update(DT);
G.world.ents.length = 0;
for (let i = 0; i < 300; i++) G.update(DT);            // 5 s more after the respawn
flagNow();
const t1 = G.clearInfo.time;
ok(G.screen === 'sc-clear', 'clear screen shown');
ok(t1 >= 15 && t1 < 17, 'clear time counts play before and after the death (got ' + t1 + ' s)');
ok(G.clearInfo.isFast === false, 'first clear is not labelled as a new record');
ok(/1[56]\.\d\d/.test(els.clearStats.innerHTML) && /0:1[56]/.test(els.clearStats.innerHTML), 'clear screen shows the time as m:ss.hh');
ok(+G.save.time[0] === t1, 'time saved (' + G.save.time[0] + ')');

G.newGame(0); toPlaying(); G.world.ents.length = 0;
for (let i = 0; i < 120; i++) G.update(DT);
flagNow();
ok(G.clearInfo.isFast === true && G.clearInfo.time < t1, 'faster run is a new record (' + G.clearInfo.time + ' s)');
ok(+G.save.time[0] === G.clearInfo.time, 'record replaced');
const fast = G.save.time[0];

G.newGame(0); toPlaying(); G.world.ents.length = 0;
for (let i = 0; i < 1200; i++) G.update(DT);
flagNow();
ok(G.clearInfo.isFast === false && +G.save.time[0] === fast, 'slower run keeps the old record');

els.btnClearSel.click();
ok(/\u23f1/.test(els.grid.children[0].innerHTML), 'level select shows the fastest time');
console.log(fails ? fails + ' FAILURES' : 'RECORDS OK');
process.exit(fails ? 1 : 0);
