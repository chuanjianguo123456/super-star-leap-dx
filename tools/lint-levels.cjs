'use strict';
// Static sanity checks for level data: placement errors that a playthrough would not necessarily reveal.
const { load } = require('./harness.cjs');
const H = load({ w: 1280, h: 800 });
const { SSL } = H, T = SSL.T, TS = SSL.TS;
let errors = 0, warns = 0;
const err = (lv, m) => { errors++; console.log('ERROR ' + lv.world + ': ' + m); };
const warn = (lv, m) => { warns++; console.log('warn  ' + lv.world + ': ' + m); };
const solid = (lv, x, y) => x < 0 || x >= lv.w ? true : SSL.isSolidTile(lv.tiles[y * lv.w + x]);
const tile = (lv, x, y) => (x < 0 || x >= lv.w || y < 0 || y > 14 ? 0 : lv.tiles[y * lv.w + x]);
const GROUND_ENEMY = { grumblet: 1, shelly: 1, spikeback: 1, hopper: 1 };

SSL.LEVELS.forEach((lv) => {
  if (lv.tiles.length !== lv.w * 15) err(lv, 'tile array size mismatch');
  // start
  const sx = Math.floor(lv.startX);
  if (!SSL.isSolidTile(tile(lv, sx, 13))) err(lv, 'no ground under the start position');
  for (let y = 9; y <= 12; y++) if (solid(lv, sx, y)) err(lv, 'start column blocked at row ' + y);
  // goal
  if (lv.flagX != null) {
    if (!SSL.isSolidTile(tile(lv, lv.flagX, 13))) err(lv, 'flag is not on solid ground');
    if (lv.flagX + 7 >= lv.w) err(lv, 'castle would be outside the level');
    for (let x = lv.flagX; x <= lv.flagX + 7; x++) { if (!SSL.isSolidTile(tile(lv, x, 13))) err(lv, 'no floor under flag/castle at x=' + x); for (let y = 4; y <= 12; y++) if (solid(lv, x, y) && x === lv.flagX) err(lv, 'flag pole blocked at row ' + y); }
  }
  // pipes
  for (let y = 0; y < 15; y++) for (let x = 0; x < lv.w; x++) {
    const id = tile(lv, x, y);
    if (id === T.PIPE_TL && tile(lv, x + 1, y) !== T.PIPE_TR) err(lv, 'pipe cap at ' + x + ',' + y + ' has no right half');
    if (id === T.PIPE_TR && tile(lv, x - 1, y) !== T.PIPE_TL) err(lv, 'pipe cap at ' + x + ',' + y + ' has no left half');
    if (id === T.PIPE_BL && ![T.PIPE_TL, T.PIPE_BL].includes(tile(lv, x, y - 1))) err(lv, 'pipe body at ' + x + ',' + y + ' floats');
  }
  // blocks
  for (const k in lv.blocks) { const [x, y] = k.split(',').map(Number); const id = tile(lv, x, y); if (![T.QUEST, T.BRICK, T.HIDDEN].includes(id)) err(lv, 'block data at ' + k + ' but tile id=' + id); }
  for (let y = 0; y < 15; y++) for (let x = 0; x < lv.w; x++) if (tile(lv, x, y) === T.QUEST && !lv.blocks[x + ',' + y]) err(lv, '? block without contents at ' + x + ',' + y);
  // enemies
  lv.ents.forEach((e) => {
    if (e.wings) {
      let found = false; const tx = Math.floor(e.x);
      for (let yy = Math.round(e.y); yy < 15; yy++) if (SSL.isSolidTile(tile(lv, tx, yy)) || SSL.isOneWay(tile(lv, tx, yy))) { found = true; break; }
      if (!found) err(lv, 'winged ' + e.t + ' at ' + tx + ' has nothing to bounce on');
    } else if (GROUND_ENEMY[e.t]) {
      const tx = Math.floor(e.x), ty = Math.round(e.y);
      if (!(SSL.isSolidTile(tile(lv, tx, ty)) || SSL.isOneWay(tile(lv, tx, ty)))) err(lv, e.t + ' at ' + tx + ',' + ty + ' has no floor');
      for (let yy = ty - 1; yy >= ty - 1; yy--) if (solid(lv, tx, yy)) err(lv, e.t + ' at ' + tx + ',' + ty + ' is inside a wall');
    }
    if ((e.t === 'bat' || e.t === 'wisp') && solid(lv, Math.floor(e.x), Math.floor(e.y))) err(lv, e.t + ' spawns inside a wall at ' + Math.floor(e.x) + ',' + Math.floor(e.y));
    if (e.t === 'chomper' && ![T.PIPE_TL, T.PIPE_TR].includes(tile(lv, Math.floor(e.x), Math.round(e.y)))) warn(lv, 'chomper at ' + e.x + ' is not on a pipe cap');
    if (e.t === 'firebar' && tile(lv, Math.floor(e.x), Math.floor(e.y)) !== T.HARD) err(lv, 'firebar pivot not on a hard block at ' + Math.floor(e.x) + ',' + Math.floor(e.y));
  });
  // items
  const ids = new Set();
  lv.items.forEach((i) => {
    if (i.t === 'coin' || i.t === 'medal') { const tl = tile(lv, Math.floor(i.x), Math.floor(i.y)); if (SSL.isSolidTile(tl)) err(lv, i.t + ' inside a solid tile at ' + Math.floor(i.x) + ',' + Math.floor(i.y)); if (tl === T.LAVA || tl === T.SPIKE) err(lv, i.t + ' inside a hazard at ' + Math.floor(i.x) + ',' + Math.floor(i.y)); }
    if (i.t === 'medal') { if (ids.has(i.i)) err(lv, 'duplicate medal index ' + i.i); ids.add(i.i); }
    if (i.t === 'spring' || i.t === 'checkpoint') { if (!SSL.isSolidTile(tile(lv, Math.floor(i.x), Math.round(i.y)))) err(lv, i.t + ' at ' + Math.floor(i.x) + ' floats'); }
  });
  if (ids.size !== lv.medals) err(lv, 'medal count mismatch');
  if (lv.medals !== 3 && lv.id < 2) warn(lv, 'expected 3 medals, found ' + lv.medals);
  // movers: swept path must not cut through tiles
  lv.movers.forEach((m) => {
    for (let u = 0; u <= 1; u += 0.05) {
      const x = m.k === 'h' ? m.x * TS + u * m.r * TS : m.x * TS, y = m.k === 'h' ? m.y * TS : m.y * TS - u * m.r * TS;
      for (let tx = Math.floor(x / TS); tx <= Math.floor((x + m.w * TS - 1) / TS); tx++) if (solid(lv, tx, Math.floor((y + 6) / TS))) { err(lv, 'mover at ' + m.x + ',' + m.y + ' passes through a solid tile'); return; }
    }
  });
  lv.cannons.forEach((c) => { if (tile(lv, c.x, c.y) !== T.CANNON) err(lv, 'cannon data without tile'); if (solid(lv, c.x - 1, c.y) && solid(lv, c.x + 1, c.y)) err(lv, 'cannon at ' + c.x + ',' + c.y + ' is boxed in'); });
  // count summary
  const n = (k) => lv.ents.filter((e) => e.t === k).length;
  console.log(lv.world.padEnd(4), String(lv.w).padStart(3) + ' wide', 'coins', lv.items.filter((i) => i.t === 'coin').length, 'medals', lv.medals, 'enemies', lv.ents.length, '(' + ['grumblet', 'shelly', 'spikeback', 'hopper', 'bat', 'wisp', 'chomper', 'firebar'].map((k) => k[0] + k.slice(1, 3) + ':' + n(k)).join(' ') + ')', 'movers', lv.movers.length, 'cannons', lv.cannons.length);
});
console.log(errors ? errors + ' error(s), ' + warns + ' warning(s)' : 'LEVEL LINT OK' + (warns ? ' (' + warns + ' warnings)' : ''));
process.exit(errors ? 1 : 0);
