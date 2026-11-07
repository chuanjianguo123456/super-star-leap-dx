'use strict';
// Renders one frame per level at a chosen spot and tiles them into contact sheets for visual review.
const { load, savePng } = require('./harness.cjs');
const { createCanvas } = require('@napi-rs/canvas');
const W = +process.env.W || 1280, Hh = +process.env.H || 800;
const H = load({ w: W, h: Hh, audio: true, touch: true });
const { SSL, G, canvas } = H; const DT = SSL.DT, TS = SSL.TS;
const spots = [[0, 14], [1, 66], [2, 58], [3, 70], [4, 100], [5, 150], [6, 178], [7, 60]];
const args = process.argv.slice(2).map(Number).filter((n) => !isNaN(n));
const shots = [];
for (const [idx, tx] of spots) {
  if (args.length && !args.includes(idx)) continue;
  G.settings.diff = 'normal'; G.newGame(idx);
  let g = 0; while (G.state !== 'playing' && g++ < 400) G.update(DT);
  const w = G.world, p = w.player; p.invuln = 999;
  p.x = tx * TS; p.y = 13 * TS - p.h; p.vx = 0; p.vy = 0;
  if (idx === 7) { for (let i = 0; i < 5; i++) G.update(DT); }
  G.camera(0, true);
  for (let i = 0; i < 100; i++) { G.update(DT); p.invuln = 999; if (p.y > 14 * TS) { p.y = 13 * TS - p.h; p.vy = 0; } }
  p.invuln = 0; G.fade = 0; G.render(2.5 + idx);
  const file = `tour_${idx}.png`; savePng(canvas, file); shots.push(file);
}
if (!args.length) {
  const { loadImage } = require('@napi-rs/canvas');
  (async () => {
    for (let s = 0; s < 2; s++) {
      const sheet = createCanvas(W, Hh), g = sheet.getContext('2d');
      for (let k = 0; k < 4; k++) { const img = await loadImage(shots[s * 4 + k]); g.drawImage(img, (k % 2) * W / 2, Math.floor(k / 2) * Hh / 2, W / 2, Hh / 2); }
      savePng(sheet, `sheet_tour_${s}.png`);
    }
    console.log('sheets written');
  })();
}
