'use strict';
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800, audio: true });
const { SSL, G, els } = H; const I = SSL.input, DT = SSL.DT, TS = SSL.TS;
let script = {};
I.poll = function () { const s = script; ['left','right','down','jump','run'].forEach((n) => { I.held[n] = !!s[n]; }); I.pressed = { jump: !!s.pj }; I.released = {}; };
let fails = 0; const check = (c, m) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };

function fight(mode) {
  G.settings.diff = 'normal'; G.newGame(7);
  let g = 0; while (G.state !== 'playing' && g++ < 400) G.update(DT);
  const w = G.world, lv = w.level, pl = w.player;
  w.ents.forEach((e) => { if (e.kind !== 'drakon') e.remove = true; });
  if (mode === 'fire') { pl.pow = 2; pl.h = SSL.PHYS.hBig; pl.y = 13 * TS - pl.h; }
  pl.x = (lv.arena.x0 + 1) * TS; pl.y = 13 * TS - pl.h; w.cannons.length = 0;
  const b = w.boss;
  check(!!b && b.hp === 6, mode + ': boss present hp=' + (b && b.hp));
  let frames = 0, gateSeen = false, hits = 0, lastHp = b.hp, deaths = 0, jumpHeld = 0;
  while (frames < 60 * 150 && G.state === 'playing') {
    frames++;
    if (mode !== 'mortal') pl.invuln = Math.max(pl.invuln, 0.3);
    const dx = (b.x + b.w / 2) - (pl.x + pl.w / 2), fy = b.y - (pl.y + pl.h);
    script = {};
    if (mode === 'fire') {
      script.left = dx < -150; script.right = dx > 150; pl.face = dx > 0 ? 1 : -1;
      script.pj = false; script.run = false;
      if (frames % 20 === 0) { I.pressed.run = true; script.run = true; }
      // fire edge
      I.poll = function () { const s = script; ['left','right','down','jump','run'].forEach((n) => { I.held[n] = !!s[n]; }); I.pressed = { jump: !!s.pj, run: !!s.pr }; I.released = {}; };
      script.pr = frames % 14 === 0;
    } else {
      script.left = dx < -10; script.right = dx > 10;
      if (pl.onGround && Math.abs(dx) < 80 && b.state !== 'crouch' && b.state !== 'dying') { script.jump = true; script.pj = true; }
      else if (!pl.onGround && pl.vy < 0) script.jump = true;
    }
    G.update(DT);
    if (w.gateClosed) gateSeen = true;
    if (b.hp < lastHp) { hits++; lastHp = b.hp; }
    if (pl.dead) deaths++;
    if (w.bossMode === 2) break;
  }
  check(gateSeen, mode + ': arena gate closed when player entered');
  check(w.bossMode === 2, mode + ': boss defeated (mode=' + w.bossMode + ', hp=' + b.hp + ', frames=' + frames + ', hits=' + hits + ', playerDeaths=' + deaths + ')');
  check(!w.gateClosed, mode + ': gate reopened');
  let n = 0; while (!w.orb && n++ < 400) G.update(DT);
  check(!!w.orb, mode + ': orb spawned');
  if (w.orb) {
    pl.x = w.orb.x - 10; pl.y = 13 * TS - pl.h; script = {}; n = 0;
    while (G.state === 'playing' && n++ < 200) G.update(DT);
    check(G.state === 'end', mode + ': orb collected -> state ' + G.state);
    n = 0; while (!G.screen && n++ < 400) G.update(DT);
    check(G.screen === 'sc-end', mode + ': ending screen shown (' + G.screen + ')');
    console.log('   ending text:', els.endStats.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
}
['stomp', 'fire'].forEach((m) => { console.log('--', m); fight(m); });
console.log(fails ? fails + ' FAILURES' : 'BOSS OK');
