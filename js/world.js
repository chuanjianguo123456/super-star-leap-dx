/* Super Star Leap DX - world: tile access, collisions, moving platforms, blocks, particles */
(function () {
  'use strict';
  const SSL = window.SSL, T = SSL.T, TS = SSL.TS, P = SSL.PHYS;
  const isSolid = SSL.isSolidTile, isOne = SSL.isOneWay, fl = Math.floor;

  function World(level, hooks) {
    this.level = level; this.w = level.w; this.h = level.h; this.theme = level.theme;
    this.tiles = new Uint8Array(level.tiles);
    this.blocks = {};
    for (const k in level.blocks) this.blocks[k] = { c: level.blocks[k].c, n: level.blocks[k].n };
    this.hooks = hooks || {};
    this.t = 0; this.ents = []; this.items = []; this.fires = []; this.parts = []; this.texts = []; this.bumps = {};
    this.shakeT = 0; this.shakeA = 0; this.player = null; this.chain = 0;
    this.medalGot = {}; this.graceT = 0; this.flagHit = null; this.flagCloth = 0; this.inp = this.noInput;
    this.noInput = { left: false, right: false, down: false, jump: false, run: false, pressed: {}, released: {} };
    this.autoInput = { left: false, right: true, down: false, jump: false, run: false, pressed: {}, released: {} };
    this.movers = level.movers.map((m) => ({ ox: m.x * TS, oy: m.y * TS, x: m.x * TS, y: m.y * TS, w: m.w * TS, h: 12, k: m.k, r: m.r * TS, s: m.s, p: m.p, dx: 0, dy: 0 }));
    this.cannons = level.cannons.map((c) => ({ x: c.x, y: c.y, every: c.every, tm: c.every * 0.4 + c.phase }));
    this.stats = { coins: 0, medals: 0, score: 0, kills: 0 };
    this.bossMode = 0;            // 0 idle, 1 fighting, 2 defeated
    this.gateOpen = true; this.boss = null; this.flagHit = null; this.orb = null;
    this.camLock = null;
    level.items.forEach((d) => this.items.push(SSL.makeItem(d)));
    level.ents.forEach((d) => { const e = SSL.makeEnemy(d); if (e) { this.ents.push(e); if (e.kind === 'drakon') this.boss = e; } });
    this.updateMovers(0);
  }
  SSL.World = World;
  const W = World.prototype;

  W.sfx = function (n) { if (SSL.audio) SSL.audio.play(n); };
  W.shake = function (a) { this.shakeT = 0.3; this.shakeA = Math.max(this.shakeT > 0 ? this.shakeA * 0.5 : 0, a); };
  W.tile = function (tx, ty) {
    if (tx < 0 || tx >= this.w) return T.HARD;
    if (ty < 0 || ty >= this.h) return 0;
    return this.tiles[ty * this.w + tx];
  };
  W.set = function (tx, ty, id) { if (tx >= 0 && tx < this.w && ty >= 0 && ty < this.h) this.tiles[ty * this.w + tx] = id; };
  W.rectSolid = function (x, y, w, h) {
    const x0 = fl(x / TS), x1 = fl((x + w - 0.01) / TS), y0 = fl(y / TS), y1 = fl((y + h - 0.01) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(this.tile(tx, ty))) return true;
    return false;
  };
  W.overlap = function (a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; };

  W.updateMovers = function (dt) {
    const t = this.t;
    this.movers.forEach((m) => {
      const px = m.x, py = m.y, u = (1 + Math.sin(t * m.s + m.p * 2)) / 2;
      if (m.k === 'h') m.x = m.ox + u * m.r; else m.y = m.oy - u * m.r;
      m.dx = m.x - px; m.dy = m.y - py;
    });
  };

  /** Move a body with tile + platform collisions. Sets onGround, hitWall, ride. */
  W.moveBody = function (b, dt, o) {
    o = o || {};
    if (b.ride) { b.x += b.ride.dx; b.y = b.ride.y - b.h; }
    // ---- horizontal
    b.hitWall = 0;
    let nx = b.x + b.vx * dt;
    if (b.vx !== 0) {
      const dir = b.vx > 0 ? 1 : -1, tx = fl((dir > 0 ? nx + b.w - 0.001 : nx) / TS);
      const y0 = fl((b.y + 2) / TS), y1 = fl((b.y + b.h - 2) / TS);
      for (let ty = y0; ty <= y1; ty++) {
        if (isSolid(this.tile(tx, ty))) { nx = dir > 0 ? tx * TS - b.w : (tx + 1) * TS; b.hitWall = dir; if (!o.keepVx) b.vx = 0; break; }
      }
    }
    b.x = nx;
    // ---- vertical
    const prevFeet = b.y + b.h;
    let ny = b.y + b.vy * dt;
    const x0 = fl((b.x + 2) / TS), x1 = fl((b.x + b.w - 2) / TS);
    b.onGround = false; b.onOneWay = false;
    let landed = null;
    if (b.vy >= 0) {
      const feet = ny + b.h, ty = fl(feet / TS);
      let best = -1, solidHit = false;
      for (let tx = x0; tx <= x1; tx++) {
        const id = this.tile(tx, ty);
        if (isSolid(id)) { best = id; solidHit = true; }
        else if (isOne(id) && prevFeet <= ty * TS + 1.5 && !(b.dropT > 0) && !o.noOneWay) { if (best < 0) best = id; }
      }
      if (best >= 0) { ny = ty * TS - b.h; landed = { id: best, one: !solidHit }; }
      let topBest = landed ? ny : 1e9;
      if (!(b.dropT > 0)) for (let i = 0; i < this.movers.length; i++) {
        const m = this.movers[i];
        if (b.x + b.w > m.x + 3 && b.x < m.x + m.w - 3 && prevFeet <= m.y - m.dy + 3 && feet >= m.y - 0.01 && m.y - b.h < topBest) {
          topBest = m.y - b.h; ny = topBest; landed = { id: 0, one: true, mover: m };
        }
      }
    } else {
      const ty = fl(ny / TS);
      let hitTx = -1, bestD = 1e9, count = 0;
      for (let tx = x0; tx <= x1; tx++) {
        const id = this.tile(tx, ty);
        if (isSolid(id) || (id === T.HIDDEN && o.hits)) {
          count++; const d = Math.abs(tx * TS + TS / 2 - (b.x + b.w / 2)); if (d < bestD) { bestD = d; hitTx = tx; }
        }
      }
      if (hitTx >= 0) {
        const ovl = Math.min(b.x + b.w, (hitTx + 1) * TS) - Math.max(b.x, hitTx * TS);
        const left = b.x + b.w / 2 < hitTx * TS + TS / 2;
        if (o.hits && count === 1 && ovl <= 8 && !this.rectSolid(left ? b.x - ovl - 1 : b.x + ovl + 1, b.y, b.w, b.h)) {
          b.x += left ? -(ovl + 1) : ovl + 1;          // slip around the corner
        } else {
          ny = (ty + 1) * TS; b.vy = 0;
          if (o.hits) this.hitBlock(hitTx, ty, b);
        }
      }
    }
    if (landed) {
      b.vy = 0; b.onGround = true; b.groundTile = landed.id; b.onOneWay = landed.one; b.ride = landed.mover || null;
    } else b.ride = null;
    b.y = ny;
  };

  // ---------------- hazards ----------------
  W.tileHazards = function (pl) {
    const x0 = fl((pl.x + 5) / TS), x1 = fl((pl.x + pl.w - 5) / TS), y0 = fl((pl.y + 4) / TS), y1 = fl((pl.y + pl.h - 1) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const id = this.tile(tx, ty);
      if (id === T.LAVA && pl.y + pl.h > ty * TS + 10) { this.burn(pl); return; }
      if (id === T.SPIKE && pl.y + pl.h > ty * TS + 12 && pl.starT <= 0) { pl.hurt(this); return; }
    }
  };
  W.burn = function (pl) {
    if (pl.dead) return;
    for (let i = 0; i < 14; i++) this.parts.push({ x: pl.x + pl.w / 2, y: pl.y + pl.h, vx: (Math.random() - .5) * 160, vy: -120 - Math.random() * 220, g: 600, life: .6, max: .6, col: i % 2 ? '#ffb030' : '#ff5a20', size: 4, shape: 'circ' });
    this.sfx('hurt'); pl.die(this, true);
  };
  W.inLava = function (e) {
    const tx = fl((e.x + e.w / 2) / TS), ty = fl((e.y + e.h - 2) / TS);
    return this.tile(tx, ty) === T.LAVA;
  };

  // ---------------- blocks ----------------
  W.knockAbove = function (tx, ty) {
    this.ents.forEach((e) => {
      if (e.dead || !e.onGround || e.noKnock) return;
      if (e.x + e.w > tx * TS && e.x < (tx + 1) * TS && Math.abs(e.y + e.h - ty * TS) < 6) this.killEnemy(e, 'bump', this.player);
    });
    this.items.forEach((it) => { if (it.mob && it.onGround && it.x + it.w > tx * TS && it.x < (tx + 1) * TS && Math.abs(it.y + it.h - ty * TS) < 6) { it.vy = -320; it.vx = -it.vx || 60; } });
  };
  W.hitBlock = function (tx, ty, who) {
    const key = tx + ',' + ty, id = this.tile(tx, ty), info = this.blocks[key];
    const strong = who && (who.pow > 0 || who.starT > 0);
    if (id === T.QUEST || id === T.HIDDEN || (id === T.BRICK && info)) {
      this.bumps[key] = 0.2; this.sfx('bump'); this.knockAbove(tx, ty);
      const c = info ? info.c : 'coin';
      this.release(tx, ty, c, who);
      if (info) { info.n--; if (c !== 'coins' || info.n <= 0) { this.set(tx, ty, T.USED); delete this.blocks[key]; } }
    } else if (id === T.BRICK) {
      if (strong) {
        this.set(tx, ty, 0); this.sfx('brick'); this.shake(2); this.addScore(50, tx * TS + 16, ty * TS);
        const col = SSL.THEMES[this.theme].brick;
        for (let i = 0; i < 6; i++) this.parts.push({ x: tx * TS + 8 + (i % 2) * 16, y: ty * TS + 8 + (i >> 1) * 8, vx: (i % 2 ? 1 : -1) * (60 + Math.random() * 90), vy: -280 - Math.random() * 160, g: 1500, life: 1, max: 1, col: col, size: 7, shape: 'sq', spin: 8 });
        this.knockAbove(tx, ty);
      } else { this.bumps[key] = 0.18; this.sfx('bump'); this.knockAbove(tx, ty); }
    }
  };
  W.release = function (tx, ty, c, who) {
    const cx = tx * TS + TS / 2;
    if (c === 'coin' || c === 'coins') {
      this.collectCoin(1);
      this.parts.push({ x: cx, y: ty * TS - 4, vx: 0, vy: -520, g: 1600, life: .52, max: .52, col: '#ffd447', size: 10, shape: 'coin' });
      this.addScore(200, cx, ty * TS - 20); this.sfx('coin');
    } else {
      const kind = c === 'power' ? (who && who.pow > 0 ? 'flower' : 'mushroom') : c === 'star' ? 'star' : 'oneup';
      const it = SSL.makeItem({ t: kind, x: tx + 0.5, y: ty + 0.5 });
      it.emerge = 0.001; it.ex = tx * TS; it.ey = ty * TS; it.vx = 0;
      this.items.push(it); this.sfx('sprout');
    }
  };
  W.collectCoin = function (n) {
    this.stats.coins += n;
    if (this.hooks.coin) this.hooks.coin(n);
  };

  // ---------------- score, particles ----------------
  W.addScore = function (n, x, y) {
    this.stats.score += n;
    this.texts.push({ x: x, y: y, vy: -50, life: 0.9, max: 0.9, s: n >= 1000 ? String(n) : String(n), col: n >= 1000 ? '#ffd447' : '#ffffff' });
  };
  W.say = function (s, x, y, col) { this.texts.push({ x: x, y: y, vy: -40, life: 1.4, max: 1.4, s: s, col: col || '#ffd447' }); };
  W.puff = function (x, y, n, col, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (20 + Math.random() * 60) * (spd || 1);
      this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, g: 0, life: .3 + Math.random() * .25, max: .5, col: col || 'rgba(255,255,255,.8)', size: 3 + Math.random() * 3, shape: 'circ', shrink: true });
    }
  };
  W.sparkle = function (x, y) {
    this.parts.push({ x: x, y: y, vx: (Math.random() - .5) * 40, vy: -20 - Math.random() * 40, g: 0, life: .5, max: .5, col: ['#fff6a8', '#ffd447', '#9ff', '#fbf'][(Math.random() * 4) | 0], size: 4 + Math.random() * 3, shape: 'star', shrink: true });
  };
  W.boom = function (x, y, big) {
    const n = big ? 16 : 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, s = 80 + Math.random() * (big ? 220 : 120);
      this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 200, life: .6, max: .6, col: ['#fff6a8', '#ffb030', '#ff5a20'][i % 3], size: 5 + Math.random() * 5, shape: 'circ', shrink: true });
    }
    this.parts.push({ x: x, y: y, vx: 0, vy: 0, g: 0, life: .4, max: .4, col: '#fff6c0', size: big ? 70 : 34, shape: 'ring' });
  };
  W.updateFx = function (dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const q = this.texts[i]; q.life -= dt; q.y += q.vy * dt; if (q.life <= 0) this.texts.splice(i, 1);
    }
    for (const k in this.bumps) { this.bumps[k] -= dt; if (this.bumps[k] <= 0) delete this.bumps[k]; }
    if (this.shakeT > 0) this.shakeT -= dt;
  };
  W.poundImpact = function (pl) {
    this.shake(4); this.sfx('bump');
    for (let i = 0; i < 8; i++) this.parts.push({ x: pl.x + pl.w / 2, y: pl.y + pl.h, vx: (i < 4 ? -1 : 1) * (60 + (i % 4) * 40), vy: -40 - Math.random() * 60, g: 400, life: .4, max: .4, col: 'rgba(255,255,255,.8)', size: 4, shape: 'circ', shrink: true });
    this.ents.forEach((e) => {
      if (e.dead || !e.onGround || e.immune) return;
      if (Math.abs((e.x + e.w / 2) - (pl.x + pl.w / 2)) < 90 && Math.abs(e.y + e.h - (pl.y + pl.h)) < 10 && e.kind !== 'drakon') this.killEnemy(e, 'pound', pl);
    });
    const tx = fl((pl.x + pl.w / 2) / TS), ty = fl((pl.y + pl.h + 2) / TS);
    if (this.tile(tx, ty) === T.BRICK && !this.blocks[tx + ',' + ty]) { this.hitBlockDown(tx, ty); }
  };
  W.hitBlockDown = function (tx, ty) {
    this.set(tx, ty, 0); this.sfx('brick'); this.addScore(50, tx * TS + 16, ty * TS);
    for (let i = 0; i < 4; i++) this.parts.push({ x: tx * TS + 16, y: ty * TS + 16, vx: (i % 2 ? 1 : -1) * (40 + i * 30), vy: 80 + i * 40, g: 1500, life: .9, max: .9, col: SSL.THEMES[this.theme].brick, size: 7, shape: 'sq', spin: 8 });
  };
  W.countFire = function () { let n = 0; this.fires.forEach((f) => { if (f.mine) n++; }); return n; };
  W.spawnFire = function (x, y, dir) { this.fires.push({ mine: true, x: x, y: y, w: 12, h: 12, vx: dir * 330, vy: 120, life: 3, dir: dir }); };
  W.onPlayerDead = function () { this.sfx('die'); if (this.hooks.dead) this.hooks.dead(); };
})();
