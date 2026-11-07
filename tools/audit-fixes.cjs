'use strict';
// Regression tests for the three issues found by the audit.
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800, audio: true });
const { SSL, G } = H;
const TS = SSL.TS, DT = SSL.DT, LB = SSL.LB;
let fails = 0;
const ok = (c, m) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
const IN = (o) => Object.assign({ left: false, right: false, down: false, jump: false, run: false, pressed: {}, released: {} }, o || {});

function mk(fn, opt) {
  opt = opt || {};
  const b = new LB({ id: 91, w: opt.w || 40, world: 'T', theme: 'meadow', time: 300 });
  b.ground(0, opt.w || 40); fn(b);
  const lv = b.build();
  const w = new SSL.World(lv, { coin() {}, life() {}, dead() {}, checkpoint() {}, medal() {} });
  const pl = new SSL.Player((opt.px || 3) * TS + 6, 13 * TS);
  if (opt.pow) { pl.pow = opt.pow; pl.h = SSL.PHYS.hBig; pl.y = 13 * TS - pl.h; }
  w.player = pl; w.spd = 1; w.camX = 0; w.viewW = 3000; w.sfx = () => {};
  return { w, pl, lv };
}
const run = (c, n, f) => { for (let i = 0; i < n; i++) c.w.step(DT, f ? f(i) : IN()); };

console.log('-- 1. level score survives a death');
{
  G.settings.diff = 'normal'; G.newGame(0);
  let g = 0; while (G.state !== 'playing' && g++ < 400) G.update(DT);
  G.world.ents.length = 0;
  G.world.addScore(1000, 0, 0); G.update(DT);
  const before = G.score;
  G.world.player.die(G.world); g = 0; while (G.state === 'dying' && g++ < 400) G.update(DT);
  G.world.ents.length = 0;
  G.world.addScore(500, 0, 0); G.update(DT);
  const running = G.score;
  G.onClear(false);
  ok(before === 1000, 'earned 1000 before dying (got ' + before + ')');
  ok(running >= 1500, 'running total keeps both (got ' + running + ')');
  ok(G.clearInfo.lvScore >= 1500, 'saved level score includes pre-death points (got ' + G.clearInfo.lvScore + ')');
  ok(G.save.best[0] >= 1500, 'best score stored with the same number (got ' + G.save.best[0] + ')');
}

console.log('-- 2. growth is applied as soon as there is head room');
{
  const c = mk((b) => { b.hard(10, 11, 6, 1); }, { px: 11 });
  c.pl.x = 10 * TS + 6; c.pl.y = 13 * TS - c.pl.h; run(c, 10);
  c.pl.grow(c.w, 1);
  ok(c.pl.pow === 1, 'power-up registered');
  ok(c.pl.h === SSL.PHYS.hSmall, 'stays small while the ceiling is too low (h=' + c.pl.h + ')');
  run(c, 120, () => IN({ right: true }));
  ok(c.pl.h === SSL.PHYS.hBig, 'grows to full height after leaving the ledge (h=' + c.pl.h + ')');
}

console.log('-- 3. a crouched hero can always crawl out (no soft-lock)');
{
  const c = mk((b) => { b.hard(10, 11, 6, 1); }, { px: 11, pow: 1 });
  c.pl.x = 10 * TS + 6; c.pl.y = 13 * TS - c.pl.h; run(c, 10);
  run(c, 20, () => IN({ down: true }));
  ok(c.pl.crouch && c.pl.h === SSL.PHYS.hSmall, 'crouches under the low ceiling');
  const x0 = c.pl.x;
  run(c, 90, () => IN({ down: true, right: true }));
  ok(c.pl.x > x0 + 20, 'crouched hero still moves (dx=' + Math.round(c.pl.x - x0) + ')');
  run(c, 60, () => IN({ right: true }));
  ok(c.pl.h === SSL.PHYS.hBig && !c.pl.crouch, 'stands up once clear of the ceiling');
}

console.log('-- 4. corrupted save data does not break the UI');
{
  G.save.medals = null; G.save.best = 'oops'; G.save.unlocked = 'x';
  ok(Array.isArray(G.medalsOf(0)) && G.medalsOf(0).length === 0, 'medalsOf tolerates a null medals map');
  const html = (() => { try { H.els.btnLevels.click(); return H.els.grid.innerHTML.length; } catch (e) { return 'THROW ' + e.message; } })();
  ok(typeof html === 'number', 'level select renders with broken save data (' + html + ')');
}

console.log(fails ? fails + ' FAILURES' : 'AUDIT FIXES OK');
process.exit(fails ? 1 : 0);
