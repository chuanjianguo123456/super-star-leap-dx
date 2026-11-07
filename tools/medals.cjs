'use strict';
const { plan } = require('./plan.cjs');
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800 }); const { SSL } = H; const TS = SSL.TS, T = SSL.T;
const what = process.argv[2] || 'medal';
function groundStart(lv, x) {
  for (let tx = Math.max(2, Math.floor(x)); tx > 1; tx--) {
    const g = lv.tiles[13 * lv.w + tx], a = lv.tiles[12 * lv.w + tx], b = lv.tiles[11 * lv.w + tx];
    if ((g === T.GROUND || g === T.ICE) && !a && !b && lv.tiles[13 * lv.w + tx + 1] && lv.tiles[13 * lv.w + tx - 1]) return tx;
  }
  return 3;
}
let bad = 0, total = 0;
SSL.LEVELS.forEach((lv) => {
  lv.items.filter((i) => i.t === what).forEach((m) => {
    total++;
    const half = what === 'medal' ? 14 : 10;
    const mk = { x: m.x * TS - half, y: m.y * TS - half, w: half * 2, h: half * 2 };
    const st = groundStart(lv, m.x - 14);
    const cx = m.x * TS, cy = m.y * TS;
    const r = plan(lv, st, (p, w) => { const hb = w.hitbox(p); return hb.x < mk.x + mk.w && hb.x + hb.w > mk.x && hb.y < mk.y + mk.h && hb.y + hb.h > mk.y; },
      (p) => -(Math.abs(p.x + p.w / 2 - cx) + 1.5 * Math.abs(p.y + p.h / 2 - cy)));
    if (!r.ok) { bad++; console.log('UNREACHABLE', what, lv.world, 'tile', (m.x - .5).toFixed(0), (m.y - .5).toFixed(0), 'start', st, r.exhausted ? 'exhausted' : 'budget'); }
  });
});
console.log(bad ? bad + ' of ' + total + ' ' + what + 's unreachable' : 'all ' + total + ' ' + what + 's reachable');
