'use strict';
// Mechanics tests: builds tiny levels and checks gameplay rules against the real simulation code.
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800, audio: true });
const { SSL, G, els } = H;
const TS = SSL.TS, DT = SSL.DT, T = SSL.T, LB = SSL.LB;
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
const section = (s) => console.log('--', s);

const IN = (o) => Object.assign({ left: false, right: false, down: false, jump: false, run: false, pressed: {}, released: {} }, o || {});
function mk(fn, opt) {
  opt = opt || {};
  const b = new LB({ id: 90, w: opt.w || 60, world: 'T', theme: opt.theme || 'meadow', time: 300 });
  b.ground(0, opt.w || 60); fn(b);
  const lv = b.build();
  const log = { coins: 0, lives: 0, dead: 0, cp: null };
  const w = new SSL.World(lv, { coin(n) { log.coins += n; }, life(n) { log.lives += n; }, dead() { log.dead++; }, checkpoint(x) { log.cp = x; }, medal() {} });
  const pl = new SSL.Player((opt.px != null ? opt.px : 3) * TS + 6, 13 * TS);
  if (opt.pow) { pl.pow = opt.pow; pl.h = SSL.PHYS.hBig; pl.y = 13 * TS - pl.h; }
  w.player = pl; w.spd = 1; w.camX = 0; w.viewW = 3000; w.sfx = () => {};
  return { w, pl, lv, log };
}
const run = (c, n, inpFn) => { for (let i = 0; i < n; i++) { c.w.step(DT, inpFn ? inpFn(i, c) : IN()); } };
const settle = (c) => run(c, 20);
const jumpInp = (hold) => (i) => IN({ jump: i < (hold || 40), pressed: { jump: i === 0 } });

section('stomp / damage');
{
  const c = mk((b) => { b.enemy('grumblet', 10); });
  const e = c.w.ents[0]; c.pl.x = e.x + 2; c.pl.y = e.y - c.pl.h - 60; c.pl.vy = 120;
  const s0 = c.w.stats.score; run(c, 30);
  ok(e.squashT > 0 || e.remove, 'stomp squashes grumblet');
  ok(c.w.stats.score >= s0 + 100, 'stomp scores 100 (got ' + (c.w.stats.score - s0) + ')');
  ok(c.pl.vy < 0 || !c.pl.onGround, 'stomp bounces player up');
  ok(!c.pl.dead, 'stomping does not kill player');
}
{
  const c = mk((b) => { b.enemy('grumblet', 12); });
  settle(c); run(c, 200, () => IN({ right: true }));
  ok(c.pl.dead, 'small hero dies from side hit');
  ok(c.log.dead === 1, 'dead hook fired once');
}
{
  const c = mk((b) => { b.enemy('grumblet', 12); }, { pow: 1 });
  settle(c); run(c, 120, () => IN({ right: true }));
  ok(!c.pl.dead && c.pl.pow === 0, 'big hero shrinks instead of dying (pow=' + c.pl.pow + ')');
  ok(c.pl.invuln > 0, 'invulnerability after hit');
  ok(c.pl.h === SSL.PHYS.hSmall, 'height reset to small');
}

section('shell');
{
  const c = mk((b) => { b.enemy('shelly', 10).enemy('grumblet', 18); });
  const e = c.w.ents[0], g = c.w.ents[1]; c.pl.x = e.x; c.pl.y = e.y - c.pl.h - 50; c.pl.vy = 150; run(c, 25);
  ok(e.mode === 'shell', 'stomp turns shelly into shell (mode=' + e.mode + ')');
  c.pl.x = e.x - 40; c.pl.y = 13 * TS - c.pl.h; c.pl.vx = 0; c.pl.invuln = 5;
  run(c, 40, () => IN({ right: true }));
  ok(e.mode === 'slide', 'touching shell kicks it (mode=' + e.mode + ')');
  run(c, 120, () => IN());
  ok(g.dead, 'sliding shell kills the grumblet');
}

section('blocks');
{
  const c = mk((b) => { b.q(10, 9, 'coin'); }, { px: 10 }); c.pl.x = 10 * TS + 6; settle(c);
  run(c, 40, jumpInp(40));
  ok(c.w.tile(10, 9) === T.USED, '? block becomes used (tile=' + c.w.tile(10, 9) + ')');
  ok(c.log.coins === 1, 'coin from ? block (coins=' + c.log.coins + ')');
}
{
  const c = mk((b) => { b.q(10, 9, 'power'); }, { px: 10 }); c.pl.x = 10 * TS + 6; settle(c);
  run(c, 40, jumpInp(40)); run(c, 60);
  const m = c.w.items.find((i) => i.kind === 'mushroom');
  ok(!!m, 'mushroom emerges'); 
  if (m) { ok(m.emerge === 1 && m.vx !== 0, 'mushroom moves after emerging'); c.pl.x = m.x - 20; c.pl.y = 13 * TS - c.pl.h; c.pl.vy = 0; run(c, 80, () => IN({ right: true })); }
  ok(c.pl.pow === 1, 'collecting mushroom grows hero (pow=' + c.pl.pow + ', h=' + c.pl.h + ')');
}
{
  const c = mk((b) => { b.q(10, 7, 'power'); }, { px: 10, pow: 1 }); c.pl.x = 10 * TS + 6;
  c.pl.y = 13 * TS - c.pl.h; settle(c);
  c.w.hitBlock(10, 7, c.pl);
  const f = c.w.items.find((i) => i.kind === 'flower');
  ok(!!f, 'power block gives a flower to a big hero');
}
{
  const c = mk((b) => { b.brick(10, 9); }, { px: 10, pow: 1 }); c.pl.x = 10 * TS + 6; settle(c);
  run(c, 40, jumpInp(40));
  ok(c.w.tile(10, 9) === 0, 'big hero breaks brick (tile=' + c.w.tile(10, 9) + ')');
}
{
  const c = mk((b) => { b.brick(10, 9); }, { px: 10 }); c.pl.x = 10 * TS + 6; settle(c);
  run(c, 40, jumpInp(40));
  ok(c.w.tile(10, 9) === T.BRICK, 'small hero only bumps brick');
}
{
  const c = mk((b) => { b.brick(10, 9, 'coins', 3); }, { px: 10 }); c.pl.x = 10 * TS + 6; settle(c);
  for (let k = 0; k < 4; k++) { run(c, 40, jumpInp(40)); run(c, 25); }
  ok(c.log.coins === 3, 'multi-coin brick pays 3 coins then stops (coins=' + c.log.coins + ')');
  ok(c.w.tile(10, 9) === T.USED, 'multi-coin brick ends as used block');
}
{
  const c = mk((b) => { b.hidden(10, 9, '1up'); }, { px: 10 }); c.pl.x = 10 * TS + 6; settle(c);
  ok(c.w.tile(10, 9) === T.HIDDEN, 'hidden block present');
  const walkThrough = c.w.rectSolid(10 * TS + 4, 9 * TS + 4, 10, 10);
  ok(!walkThrough, 'hidden block is not solid before hit');
  run(c, 40, jumpInp(40)); run(c, 70);
  ok(c.w.tile(10, 9) === T.USED, 'hidden block revealed by hit from below (tile=' + c.w.tile(10, 9) + ')');
  ok(c.w.items.some((i) => i.kind === 'oneup'), '1UP mushroom spawned');
}

section('fireball and star');
{
  const c = mk((b) => { b.enemy('grumblet', 14); }, { pow: 2 }); settle(c); const gr = c.w.ents[0];
  run(c, 2, () => IN({ run: true, pressed: { run: true } }));
  ok(c.w.fires.length >= 1 && c.w.fires[0].mine, 'fire flower hero throws a fireball');
  run(c, 90);
  ok(gr.dead, 'fireball kills grumblet');
  c.w.fires.length = 0;
  for (let i = 0; i < 4; i++) c.w.spawnFire(100, 100, 1);
  ok(c.w.countFire() === 4 && true, 'countFire counts');
}
{
  const c = mk((b) => { b.enemy('grumblet', 12); }); c.pl.starT = 10; settle(c); const gs = c.w.ents[0];
  run(c, 160, () => IN({ right: true }));
  ok(!c.pl.dead && gs.dead, 'starlight kills enemies on touch without harm');
}

section('spring / platforms');
{
  const c = mk((b) => { b.spring(10); }, { px: 5 }); const sp = c.w.items[0];
  c.pl.x = sp.x + 2; c.pl.y = 13 * TS - 160; c.pl.vy = 100; let minY = 1e9;
  run(c, 90, () => { minY = Math.min(minY, c.pl.y); return IN(); });
  ok(minY < 13 * TS - 300, 'spring launches the hero high (min y offset ' + Math.round(13 * TS - minY) + ')');
}
{
  const c = mk((b) => { b.pit(8, 14); b.mover(10, 11, 3, 'h', 4, 1.0); }, { px: 5 });
  const m = c.w.movers[0]; c.pl.x = m.x + 30; c.pl.y = m.y - c.pl.h - 2; c.pl.vy = 0; run(c, 6);
  ok(c.pl.onGround && c.pl.ride === m, 'hero lands on moving platform');
  const px0 = c.pl.x, mx0 = m.x; run(c, 90);
  ok(Math.abs((c.pl.x - px0) - (m.x - mx0)) < 1.5, 'platform carries hero (dx hero ' + (c.pl.x - px0).toFixed(1) + ' vs platform ' + (m.x - mx0).toFixed(1) + ')');
}
{
  const c = mk((b) => { b.plat(10, 10, 4); }, { px: 11 }); c.pl.x = 11 * TS + 6; settle(c);
  run(c, 50, jumpInp(40));
  ok(c.pl.y + c.pl.h <= 10 * TS + 1 && c.pl.onGround, 'one-way platform: jump up through it and land on top (feet ' + (c.pl.y + c.pl.h) + ')');
  run(c, 5, () => IN({ down: true, jump: true, pressed: { jump: true } })); run(c, 60);
  ok(Math.abs(c.pl.y + c.pl.h - 13 * TS) < 1, 'down+jump drops through the one-way platform');
}
{
  const c = mk((b) => { b.ice(10, 30); }, { px: 3 });
  const dist = (startX) => { const d = mk((b) => { b.ice(10, 30); }); d.pl.x = startX * TS; return d; };
  const slide = (isIce) => { const d = mk(() => {}); if (isIce) d.w.tiles.fill(0); const bb = new LB({ id: 91, w: 80, world: 'T', theme: 'meadow' }); bb.ground(0, 80); if (isIce) bb.ice(0, 80); const lv = bb.build(); const w = new SSL.World(lv, { coin() {} }); w.sfx = () => {}; const p = new SSL.Player(3 * TS, 13 * TS); w.player = p; w.spd = 1; w.camX = 0; w.viewW = 3000; for (let i = 0; i < 20; i++) w.step(DT, IN()); for (let i = 0; i < 50; i++) w.step(DT, IN({ right: true, run: true })); const x0 = p.x; let n = 0; while (Math.abs(p.vx) > 5 && n++ < 600) w.step(DT, IN()); return p.x - x0; };
  const dg = slide(false), di = slide(true);
  ok(di > dg * 2.5, 'ice makes the hero slide much farther (ground ' + dg.toFixed(0) + 'px, ice ' + di.toFixed(0) + 'px)');
}

section('hazards');
{
  const c = mk((b) => { b.lava(10, 3); }, { px: 6 }); settle(c); run(c, 120, () => IN({ right: true }));
  ok(c.pl.dead, 'lava kills');
}
{
  const c = mk((b) => { b.spikes(10, 3); }, { px: 6, pow: 1 }); settle(c); run(c, 120, () => IN({ right: true }));
  ok(!c.pl.dead && c.pl.pow === 0, 'spikes hurt (big hero shrinks)');
}
{
  const c = mk((b) => { b.pit(10, 4); }, { px: 6 }); settle(c); run(c, 160, () => IN({ right: true }));
  ok(c.pl.dead && c.pl.pit, 'falling into a pit kills');
}
{
  const c = mk((b) => { b.enemy('chomper', 0); b.pipe(10, 2, { chomper: true }); }, { px: 9 });
  c.w.ents = c.w.ents.filter((e) => e.t !== 'chomper' || true);
  const ch = c.w.ents.find((e) => e.kind === 'chomper' && e.baseY === 11 * TS);
  ok(!!ch, 'chomper created on pipe');
  c.pl.x = 5 * TS; c.pl.y = 13 * TS - c.pl.h; let ext = false; run(c, 120, () => { if (ch && ch.ext > 0.9) ext = true; return IN(); });
  ok(ext, 'chomper extends and retracts over time');
}
{
  const c = mk((b) => { b.firebar(10, 9, 3, 2.0, 0); }, { px: 9 }); settle(c);
  const fb = c.w.ents[0]; run(c, 2);
  const ball = fb.balls[4]; c.pl.invuln = 0; c.pl.x = ball.x - c.pl.w / 2; c.pl.y = ball.y - c.pl.h / 2; c.pl.vy = 0;
  c.w.step(DT, IN());
  ok(c.pl.dead || c.pl.invuln > 0, 'firebar balls hurt');
}
{
  const c = mk((b) => { b.cannon(20, 10, 1.0); b.hard(20, 11, 1, 2); }, { px: 5 }); c.w.cannons[0].tm = 0.05; c.w.camX = 0;
  run(c, 60);
  const r = c.w.ents.find((e) => e.kind === 'rocket');
  ok(!!r, 'cannon fires a rocket');
  if (r) { const x0 = r.x; run(c, 30); ok(Math.abs(r.x - x0) > 20, 'rocket flies'); }
}

section('ground pound');
{
  const c = mk((b) => { b.enemy('grumblet', 10); }, { px: 10 }); c.pl.x = 10 * TS - 20; c.pl.y = 13 * TS - 140; c.pl.vy = 0;
  const e = c.w.ents[0]; e.dir = 1; e.vx = 0; e.x = 10 * TS - 6; e.walk = 0;
  c.w.step(DT, IN({ down: true, pressed: { down: true } })); 
  ok(c.pl.pound === 1, 'ground pound starts in air');
  run(c, 60);
  ok(e.dead || e.squashT > 0 || e.remove, 'ground pound defeats nearby enemy');
}
{
  const c = mk((b) => { b.pit(10, 1); b.set(10, 13, T.BRICK); }, { px: 10 }); c.pl.x = 10 * TS + 6; c.pl.y = 13 * TS - 200 - c.pl.h; c.pl.vy = 0;
  c.w.step(DT, IN({ down: true, pressed: { down: true } })); run(c, 70);
  ok(c.w.tile(10, 13) === 0, 'ground pound smashes brick below (tile=' + c.w.tile(10, 13) + ')');
}

section('coins & lives via game');
{
  SSL.LEVELS.push((() => { const b = new LB({ id: 8, w: 60, world: 'T-1', theme: 'meadow', time: 300 }); b.ground(0, 60); b.coins(8, 12, 3); b.checkpoint(20); b.pit(30, 5); b.enemy('grumblet', 40); return b.build(); })());
  const idx = SSL.LEVELS.length - 1;
  G.settings.diff = 'normal'; G.newGame(idx); let g = 0; while (G.state !== 'playing' && g++ < 400) G.update(DT);
  G.coins = 99; const w = G.world; G.hooks.coin(1);
  ok(G.coins === 0 && G.lives === 6, '100 coins grants an extra life (lives=' + G.lives + ', coins=' + G.coins + ')');
  const pl = w.player; pl.x = 20 * TS; for (let i = 0; i < 20; i++) G.update(DT);
  ok(Math.abs(G.cpX - (20 * TS + 16)) < 40, 'checkpoint registers (cpX=' + G.cpX + ')');
  const lives0 = G.lives; pl.die(w); g = 0; while (G.state === 'dying' && g++ < 400) G.update(DT);
  ok(G.state === 'playing' && G.lives === lives0 - 1, 'death costs one life and respawns (state=' + G.state + ', lives=' + G.lives + ')');
  ok(Math.abs(G.world.player.x - (20 * TS + 16 - 10)) < 40, 'respawn at checkpoint (x=' + G.world.player.x.toFixed(0) + ')');
  G.lives = 1; G.world.player.die(G.world); g = 0; while (G.state === 'dying' && g++ < 400) G.update(DT);
  ok(G.state === 'over' && G.screen === 'sc-over', 'game over screen when out of lives (state=' + G.state + ')');
  els.btnRetry.click(); g = 0; while (G.state !== 'playing' && g++ < 400) G.update(DT);
  ok(G.state === 'playing' && G.lives >= 5, 'retry restarts with fresh lives');
  G.timeLeft = 0.02; for (let i = 0; i < 10; i++) G.update(DT);
  ok(G.world.player.dead, 'running out of time kills');
}

section('pause / resume');
{
  G.newGame(0); let g = 0; while (G.state !== 'playing' && g++ < 400) G.update(DT);
  G.pause(); ok(G.state === 'paused' && G.screen === 'sc-pause', 'pause shows pause menu');
  const t0 = G.world.t; H.fire('visibilitychange'); for (let i = 0; i < 60; i++) G.loop((i + 1) * 16.7);
  ok(G.world.t === t0, 'world is frozen while paused');
  G.resume(); ok(G.state === 'playing' && !G.screen, 'resume returns to play');
  els.btnPause.click(); ok(G.state === 'paused', 'HUD pause button works');
  els.btnResume.click(); ok(G.state === 'playing', 'Resume button works');
  els.btnPause.click(); els.btnQuit.click(); ok(G.state === 'menu' && G.screen === 'sc-select', 'Quit goes to level select');
}
console.log(fails ? fails + ' FAILED, ' + passes + ' passed' : 'MECHANICS OK (' + passes + ' checks)');
