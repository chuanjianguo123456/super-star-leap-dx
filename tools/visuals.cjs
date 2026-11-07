'use strict';
// Visual regression checks that need no browser (Skia canvas through the harness):
//   1. every parallax layer tiles without a seam        2. translucent layers composite without hairlines
//   3. dirt tiles stack without horizontal banding      4. ambient particles are bounded, stateless and switchable
// `node visuals.cjs --report` prints the raw numbers instead of asserting.
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800 });
const { SSL, G, canvas } = H, gfx = SSL.gfx, T = SSL.T;
const REPORT = process.argv.includes('--report');
let fails = 0;
const ok = (c, m) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
const g = G.ctx, sc = G.scale * G.dpr, W = canvas.width, VH = canvas.height;
const THEMES = Object.keys(SSL.THEMES);
const reset = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; };

// ---------------------------------------------------------------- 1. layer tileability
console.log('-- 1. parallax layers tile without a seam');
THEMES.forEach((th) => { reset(); gfx.drawBackground(g, th, 0, 0, sc, W, VH, 0); });   // fills gfx.cache.layers
function seamStat(c) {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  const pm = (x, y, k) => { const i = (y * w + x) * 4; return k === 3 ? d[i + 3] : d[i + k] * d[i + 3] / 255; };
  const diff = (xa, xb) => { let s = 0; for (let y = 0; y < h; y++) for (let k = 0; k < 4; k++) s += Math.abs(pm(xa, y, k) - pm(xb, y, k)); return s / h; };
  const col = []; for (let x = 0; x < w - 1; x++) col.push(diff(x, x + 1));
  col.sort((a, b) => a - b);
  return { seam: diff(w - 1, 0), p99: col[Math.floor(col.length * 0.99)], med: col[col.length >> 1] };
}
Object.keys(gfx.cache.layers).sort().forEach((key) => {
  const s = seamStat(gfx.cache.layers[key]);
  // A seamless layer treats the wrap column pair like any other neighbours; a clipped shape makes it far larger than p99.
  const limit = Math.max(6, s.p99 * 1.5);
  if (REPORT) console.log('  ', key.padEnd(10), 'seam', s.seam.toFixed(1), 'p99', s.p99.toFixed(1), 'median', s.med.toFixed(2), s.seam > limit ? '<-- SEAM' : '');
  else ok(s.seam <= limit, 'layer ' + key + ' wraps cleanly (seam ' + s.seam.toFixed(1) + ' <= ' + limit.toFixed(1) + ')');
});

// ---------------------------------------------------------------- 2. composite hairlines
console.log('-- 2. translucent layers composite without hairlines');
{
  const L = gfx._L, saved = L.meadow;
  L.meadow = [{ f: 0.5, y0: 0, y1: 480, draw(c, w) { c.fillStyle = 'rgba(255,0,0,0.5)'; c.fillRect(0, 0, w, 480); } }];
  delete gfx.cache.layers['meadow:0'];
  let worst = 0, at = 0;
  for (let i = 0; i < 80; i++) {
    const camX = i * 37.31 + i * 0.123;
    reset(); gfx.drawBackground(g, 'meadow', camX, 0, sc, W, VH, 0);
    const row = g.getImageData(0, Math.floor(VH * 0.5), W, 1).data;
    let lo = 255, hi = 0; for (let x = 0; x < W; x++) { lo = Math.min(lo, row[x * 4]); hi = Math.max(hi, row[x * 4]); }
    if (hi - lo > worst) { worst = hi - lo; at = camX; }
  }
  L.meadow = saved; delete gfx.cache.layers['meadow:0'];
  if (REPORT) console.log('   worst column variation', worst, 'at camX', at.toFixed(2));
  else ok(worst <= 1, 'uniform translucent layer stays uniform at 80 fractional camera positions (variation ' + worst + ')');
}

// ---------------------------------------------------------------- 3. dirt banding
console.log('-- 3. dirt tiles stack without banding');
{
  const rows = (c, y0, y1) => {
    const d = c.getContext('2d').getImageData(0, y0, c.width, y1 - y0).data; let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    return [r / n, gg / n, b / n];
  };
  const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  let worst = 0, worstIn = 0, tag = '';
  THEMES.forEach((th) => {
    for (let v = 0; v < 4; v++) {
      const dirt = gfx.tile(th, T.DIRT, v), ground = gfx.tile(th, T.GROUND, v), n = dirt.height;
      const dTop = rows(dirt, 0, 2), dBot = rows(dirt, n - 2, n), gBot = rows(ground, n - 2, n);
      worst = Math.max(worst, dist(dBot, dTop), dist(gBot, dTop));
      worstIn = Math.max(worstIn, dist(dTop, dBot));
      if (dist(dBot, dTop) > 9) tag = th;
    }
  });
  if (REPORT) console.log('   worst step between stacked tiles', worst.toFixed(1), tag);
  else ok(worst <= 9, 'colour step between stacked dirt tiles <= 9/255 in all themes (worst ' + worst.toFixed(1) + ')');
  const a = gfx.tile('meadow', T.DIRT, 0), b = gfx.tile('meadow', T.DIRT, 1), c3 = gfx.tile('meadow', T.DIRT, 2), d3 = gfx.tile('meadow', T.DIRT, 3);
  const key = (c) => Buffer.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data).toString('base64');
  const distinct = new Set([a, b, c3, d3].map(key)).size;
  if (REPORT) console.log('   distinct dirt variants', distinct);
  else ok(distinct === 4, 'four visibly different dirt variants (got ' + distinct + ')');
}

// ---------------------------------------------------------------- 4. ambient particles
console.log('-- 4. ambient particles');
if (!gfx.drawAmbient) { if (!REPORT) ok(false, 'gfx.drawAmbient exists'); else console.log('   (not implemented yet)'); }
else {
  const px = () => Buffer.from(g.getImageData(0, 0, W, VH).data);
  const paint = (th, camX, t, on) => {
    reset(); g.fillStyle = '#808080'; g.fillRect(0, 0, W, VH); gfx.ambientOn = on;
    gfx.drawAmbient(g, th, camX, sc, W, VH, t); gfx.ambientOn = true; return px();
  };
  const blank = (() => { reset(); g.fillStyle = '#808080'; g.fillRect(0, 0, W, VH); return px(); })();
  THEMES.forEach((th) => {
    const kind = SSL.THEMES[th].ambient;
    const a = paint(th, 100, 3.3, true), a2 = paint(th, 100, 3.3, true), off = paint(th, 100, 3.3, false), b = paint(th, 100, 4.1, true);
    let changed = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== blank[i] || a[i + 1] !== blank[i + 1] || a[i + 2] !== blank[i + 2]) changed++;
    ok(changed > 40, th + ' (' + kind + ') draws visible particles (' + changed + ' px changed)');
    ok(a.equals(a2), th + ': same time and camera gives the identical frame (stateless)');
    ok(!a.equals(b), th + ': particles move over time');
    ok(off.equals(blank), th + ': ambientOn=false draws nothing');
    ok(changed < W * VH * 0.04, th + ': coverage stays light (' + (100 * changed / (W * VH)).toFixed(2) + '% of the screen)');
  });
  let bad = 0;
  for (let i = 0; i < 400; i++) { try { reset(); gfx.drawAmbient(g, THEMES[i % THEMES.length], i * 91.7 - 500, sc, W, VH, i * 0.37); } catch (e) { bad++; console.log(e.message); } }
  ok(bad === 0, '400 draws across extreme camera and time values never throw');
}

// ---------------------------------------------------------------- 5. tile hairlines (runs last: it resizes the canvas)
console.log('-- 5. adjacent tiles leave no background hairline');
{
  const realTile = gfx.tile, flat = {}, amb = gfx.ambientOn;
  gfx.ambientOn = false;
  gfx.tile = function (th, id, v) {        // every tile becomes one flat colour, so any deviation is background leaking through a seam
    const key = th + ':' + id + ':' + v + ':' + gfx.scale;
    if (!flat[key]) { const m = gfx.mk(SSL.TS, SSL.TS); m.g.fillStyle = 'rgb(40,70,100)'; m.g.fillRect(0, 0, SSL.TS, SSL.TS); flat[key] = m.c; }
    return flat[key];
  };
  const sizes = [[1280, 800, 1], [1000, 600, 1], [1920, 1200, 1], [1180, 820, 2], [1366, 768, 1.5], [1600, 900, 1.25]];
  const TS = SSL.TS; let worst = 0, where = '';
  for (const [w0, h0, dpr] of sizes) {
    globalThis.innerWidth = w0; globalThis.innerHeight = h0; globalThis.devicePixelRatio = dpr; G.resize();
    G.settings.diff = 'normal'; G.newGame(1);
    let n = 0; while (G.state !== 'playing' && n++ < 400) G.update(SSL.DT);
    const w = G.world; w.ents.length = 0; w.items.length = 0; w.player.invuln = 999;
    const sc2 = G.scale * G.dpr, g2 = G.ctx;
    for (let i = 0; i < 24; i++) {
      const camX = 62 * TS + i * 3.37 + i * 0.011;       // fractional camera positions
      G.cam.x = camX; w.camX = camX; G.fade = 0; G.render(2 + i * 0.1);
      // inside the big rock mass (tiles x 67..73, rows 3..9), below the HUD
      const x0 = Math.ceil((67 * TS - camX) * sc2) + 1, x1 = Math.floor((74 * TS - camX) * sc2) - 1;
      const y0 = Math.ceil(3 * TS * sc2), y1 = Math.floor(9 * TS * sc2);
      const d = g2.getImageData(x0, y0, x1 - x0, y1 - y0).data; let dev = 0;
      for (let k = 0; k < d.length; k += 4) dev = Math.max(dev, Math.abs(d[k] - 40), Math.abs(d[k + 1] - 70), Math.abs(d[k + 2] - 100));
      if (dev > worst) { worst = dev; where = w0 + 'x' + h0 + ' dpr' + dpr + ' scale ' + sc2.toFixed(3) + ' camX ' + camX.toFixed(2); }
    }
  }
  gfx.tile = realTile; gfx.ambientOn = amb;
  if (REPORT) console.log('   worst deviation from the flat tile colour', worst, where);
  else ok(worst <= 2, 'flat tiles show no background through the joints at 6 window sizes and fractional cameras (worst ' + worst + ')');
}

console.log(fails ? fails + ' FAILURES' : (REPORT ? 'REPORT DONE' : 'VISUALS OK'));
process.exit(fails ? 1 : 0);
