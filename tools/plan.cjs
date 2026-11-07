'use strict';
// Completability planner. Runs the game's real Player.update + World.moveBody + moving platforms + springs, and searches
// macro-actions (walk/run/jump with hold lengths) for a route. Enemies are stripped; hidden blocks are NOT used.
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800 });
const { SSL } = H;
const TS = SSL.TS, DT = SSL.DT, T = SSL.T;
const argv = process.argv.slice(2);
const WALK_ONLY = argv.includes('--walk');
const BUDGET = +(process.env.BUDGET || 30000);

function makeWorld(lv) {
  const tiles = new Uint8Array(lv.tiles);
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.HIDDEN) tiles[i] = 0;
  const w = new SSL.World(Object.assign({}, lv, { tiles, items: lv.items.filter((i) => i.t === 'spring'), ents: [], cannons: [] }), {});
  ['sfx', 'puff', 'sparkle', 'shake', 'poundImpact', 'hitBlock', 'say'].forEach((k) => { w[k] = () => {}; });
  return w;
}
function deadly(w, pl) {
  const x0 = Math.floor((pl.x + 5) / TS), x1 = Math.floor((pl.x + pl.w - 5) / TS), y0 = Math.floor((pl.y + 4) / TS), y1 = Math.floor((pl.y + pl.h - 1) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const id = w.tile(tx, ty);
    if (id === T.LAVA && pl.y + pl.h > ty * TS + 10) return true;
    if (id === T.SPIKE && pl.y + pl.h > ty * TS + 12) return true;
  }
  return false;
}
class Heap {
  constructor() { this.a = []; }
  push(p, v) { const a = this.a; a.push([p, v]); let i = a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] >= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] > a[m][0]) m = l; if (r < a.length && a[r][0] > a[m][0]) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

function plan(lv, startTile, targetFn, prioFn) {
  const w = makeWorld(lv);
  const pl = w.player = new SSL.Player((startTile != null ? startTile : lv.startX) * TS + 6, 13 * TS);
  const goal = targetFn ? (p) => targetFn(p, w)
    : lv.flagX != null ? (p) => p.x + p.w > lv.flagX * TS + 16 - 6 : (p) => p.x > (lv.arena.x0 + 3) * TS;
  const prio = prioFn || ((p) => p.x);
  const snap = () => ({ t: w.t, sp: w.items.map((i) => [i.cool || 0, i.comp || 0]), p: Object.assign({}, pl, { ride: pl.ride ? w.movers.indexOf(pl.ride) : -1 }) });
  const restore = (s) => {
    w.t = s.t; w.updateMovers(0); w.updateMovers(0); Object.assign(pl, s.p); pl.ride = s.p.ride >= 0 ? w.movers[s.p.ride] : null;
    w.items.forEach((i, k) => { i.cool = s.sp[k][0]; i.comp = s.sp[k][1]; });
  };
  const near = (x) => w.movers.some((m) => x > m.ox - 300 && x < m.ox + m.r + m.w + 300);
  const key = () => [Math.round(pl.x / 14), Math.round(pl.y / 14), pl.onGround ? 0 : 1 + Math.round(pl.vy / 150), pl.ride ? w.movers.indexOf(pl.ride) : -1,
    pl.vx < -70 ? -1 : pl.vx > 70 ? 1 : 0, near(pl.x) ? Math.round(w.t / 0.35) : 0].join(',');

  const acts = [];
  const runs = WALK_ONLY ? [0] : [0, 1];
  for (const dir of [1, -1, 0]) for (const run of runs) acts.push({ dir, run, jump: 0, frames: 8 });
  for (const dir of [1, 0, -1]) for (const run of runs) for (const hold of [5, 12, 40]) acts.push({ dir, run, jump: 1, hold });

  function stepOnce(inp) {
    w.t += DT; w.inp = inp; w.updateMovers(DT); pl.update(DT, w, inp); w.updateItems(DT);
    if (pl.dead || deadly(w, pl)) return 'dead';
    if (goal(pl)) return 'goal';
    return null;
  }
  function exec(a) {
    const inp = { left: a.dir < 0, right: a.dir > 0, down: false, jump: false, run: !!a.run, pressed: {}, released: {} };
    const maxF = a.jump ? 120 : a.frames; let left = false; exec.used = 0;
    for (let f = 0; f < maxF; f++) {
      inp.jump = !!a.jump && f < a.hold; inp.pressed = { jump: !!a.jump && f === 0 };
      exec.used = f + 1;
      const r = stepOnce(inp); if (r) return r;
      if (a.jump) { if (!pl.onGround) left = true; else if (left || f > 6) break; }
    }
    if (pl.onGround) return 'ok';
    if (!a.jump && pl.vy < 120) return 'airnode';            // rising / near apex: allow steering (spring launches)
    inp.jump = false; inp.pressed = {};
    for (let f = 0; f < 150 && !pl.onGround; f++) { exec.used++; const r = stepOnce(inp); if (r) return r; }
    return pl.onGround ? 'ok' : 'air';
  }

  for (let i = 0; i < 30; i++) stepOnce({ left: false, right: false, down: false, jump: false, run: false, pressed: {}, released: {} });
  const heap = new Heap(), seen = new Set(), parent = new Map(); parent.set(0, null);
  heap.push(prio(pl), { s: snap(), id: 0 }); seen.add(key());
  let n = 0, best = { x: pl.x, y: pl.y, v: -1e9 }, ids = 1;
  while (heap.size && n < BUDGET) {
    const { s, id } = heap.pop()[1]; n++;
    for (let ai = 0; ai < acts.length; ai++) {
      restore(s);
      const r = exec(acts[ai]);
      if (r === 'goal') {
        const path = [{ a: acts[ai], f: exec.used }]; let cur = id;
        while (parent.get(cur)) { const q = parent.get(cur); path.unshift({ a: acts[q.a], f: q.f }); cur = q.p; }
        return { ok: true, n, x: pl.x, path };
      }
      if (r !== 'ok' && r !== 'airnode') continue;
      const k = key(); if (seen.has(k)) continue; seen.add(k);
      const v = prio(pl); if (v > best.v) best = { x: pl.x, y: pl.y, v };
      parent.set(ids, { p: id, a: ai, f: exec.used }); heap.push(v, { s: snap(), id: ids++ });
    }
  }
  return { ok: false, n, x: best.x, y: best.y, exhausted: !heap.size };
}

module.exports = { plan, makeWorld };
if (require.main === module) {
  const only = argv.length && /^\d+$/.test(argv[0]) ? +argv[0] : -1;
  let bad = 0; const t0 = Date.now(); const saved = {};
  const list = only >= 0 ? [only] : SSL.LEVELS.map((l, i) => i);
  for (const idx of list) {
    const lv = SSL.LEVELS[idx], t1 = Date.now();
    const r = plan(lv);
    if (!r.ok) bad++; else saved[idx] = r.path.map((q) => ({ dir: q.a.dir, run: q.a.run, jump: q.a.jump, hold: q.a.hold || 0, f: q.f }));
    console.log((r.ok ? 'PASS ' : 'FAIL ') + lv.world, 'nodes', r.n, r.ok ? '' : 'furthest tile x=' + (r.x / TS).toFixed(1) + ' y=' + (r.y / TS).toFixed(1) + (r.exhausted ? ' (search exhausted)' : ' (budget)'), ((Date.now() - t1) / 1000).toFixed(1) + 's');
  }
  require('fs').writeFileSync('paths.json', JSON.stringify(saved));
  console.log(bad ? bad + ' level(s) not completable' : 'ALL LEVELS COMPLETABLE' + (WALK_ONLY ? ' (walk only)' : ''), ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
