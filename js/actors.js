/* Super Star Leap DX - actors: enemy and item factories plus per-kind AI */
(function () {
  'use strict';
  const SSL = window.SSL, T = SSL.T, TS = SSL.TS, isSolid = SSL.isSolidTile, isOne = SSL.isOneWay;
  const AI = SSL.AI = {};

  const DEF = {
    grumblet: { w: 26, h: 26 }, shelly: { w: 26, h: 28 }, spikeback: { w: 28, h: 26 }, chomper: { w: 26, h: 26 },
    rocket: { w: 30, h: 18 }, wisp: { w: 28, h: 28 }, hopper: { w: 26, h: 26 }, bat: { w: 24, h: 22 },
    firebar: { w: 8, h: 8 }, drakon: { w: 64, h: 76 },
  };
  const AIRBORNE = { bat: 1, wisp: 1 };

  SSL.makeEnemy = function (d) {
    const df = DEF[d.t]; if (!df) return null;
    const e = { kind: d.t, w: df.w, h: df.h, x: 0, y: 0, vx: 0, vy: 0, dir: -1, onGround: false, dead: false, remove: false, walk: Math.random() * 6, timer: 0, t: 0, mode: 'walk', ride: null };
    if (AIRBORNE[d.t]) { e.x = d.x * TS - e.w / 2; e.y = (d.y + 0.5) * TS - e.h / 2; }
    else if (d.t === 'chomper') { e.x = d.x * TS - e.w / 2; e.baseY = d.y * TS; e.y = e.baseY + 8; e.ext = 0; e.timer = (d.delay || 0); e.state = 'wait'; }
    else if (d.t === 'firebar') { e.px = d.x * TS; e.py = d.y * TS; e.len = d.len; e.spd = d.spd; e.ang = d.a0 || 0; e.x = e.px; e.y = e.py; }
    else { e.x = d.x * TS - e.w / 2; e.y = d.y * TS - e.h; }
    e.home = { x: e.x, y: e.y };
    if (d.t === 'shelly') { e.red = !!d.red; e.wings = !!d.wings; e.wake = 0; }
    if (d.t === 'bat') { e.state = 'hang'; e.shy = false; }
    if (d.t === 'wisp') { e.shy = false; }
    if (d.t === 'drakon') { e.state = 'wait'; e.hp = 6; e.max = 6; e.inv = 0; e.dir = -1; e.timer = 1; e.facePl = -1; }
    if (d.t === 'rocket') { e.dir = d.dir || -1; e.vx = e.dir * 150; }
    return e;
  };

  // ---------------- helpers ----------------
  SSL.World.prototype.groundAhead = function (e) {
    const ax = e.dir > 0 ? e.x + e.w + 3 : e.x - 3, tx = Math.floor(ax / TS), ty = Math.floor((e.y + e.h + 4) / TS);
    const id = this.tile(tx, ty);
    return isSolid(id) || isOne(id);
  };
  function walker(e, dt, W, speed, edge) {
    e.vx = e.dir * speed * W.spd;
    e.vy = Math.min(700, e.vy + 1800 * dt);
    W.moveBody(e, dt, { keepVx: true });
    if (e.hitWall) e.dir = -e.hitWall;
    else if (edge && e.onGround && !W.groundAhead(e)) { e.dir = -e.dir; e.x += e.dir * 3; }
    if (W.inLava(e) || e.y > (W.h + 2) * TS) e.remove = true;
    e.walk += dt * 8;
  }
  SSL.walker = walker;
  const dist = (a, b) => Math.abs((a.x + a.w / 2) - (b.x + b.w / 2));

  // ---------------- basic walkers ----------------
  AI.grumblet = function (e, dt, W) {
    if (e.squashT > 0) { e.squashT -= dt; if (e.squashT <= 0) e.remove = true; return; }
    walker(e, dt, W, 46, false);
  };
  AI.spikeback = function (e, dt, W) { walker(e, dt, W, 40, false); };

  AI.shelly = function (e, dt, W) {
    if (e.mode === 'walk') {
      if (e.wings) {
        e.vx = e.dir * 46 * W.spd; e.vy = Math.min(700, e.vy + 1500 * dt);
        W.moveBody(e, dt, { keepVx: true });
        if (e.hitWall) e.dir = -e.hitWall;
        if (e.onGround) e.vy = -430;
        if (e.y > (W.h + 2) * TS) e.remove = true;
        e.walk += dt * 8;
      } else walker(e, dt, W, 46, e.red);
    } else if (e.mode === 'shell') {
      e.vx = 0; e.vy = Math.min(700, e.vy + 1800 * dt);
      W.moveBody(e, dt, {});
      e.wake -= dt;
      if (e.wake <= 0) { e.mode = 'walk'; e.y -= 6; e.h = 28; e.dir = W.player && W.player.x > e.x ? 1 : -1; }
      if (W.inLava(e) || e.y > (W.h + 2) * TS) e.remove = true;
    } else {    // slide
      e.kickT = Math.max(0, (e.kickT || 0) - dt);
      e.vx = e.dir * 330; e.vy = Math.min(700, e.vy + 1800 * dt);
      W.moveBody(e, dt, { keepVx: true });
      if (e.hitWall) { e.dir = -e.hitWall; W.sfx('bump'); W.puff(e.x + e.w / 2, e.y + e.h / 2, 3, 'rgba(255,255,255,.8)'); }
      if (W.inLava(e) || e.y > (W.h + 2) * TS) e.remove = true;
    }
  };
  SSL.toShell = function (e) {
    if (e.mode === 'walk') { e.y += e.h - 22; e.h = 22; }
    e.mode = 'shell'; e.wake = 6; e.vx = 0; e.wings = false;
  };

  AI.hopper = function (e, dt, W) {
    e.vy = Math.min(700, e.vy + 1800 * dt);
    if (e.onGround) {
      e.vx = 0; e.timer -= dt;
      if (e.timer <= 0) { const pl = W.player; e.dir = pl && pl.x > e.x ? 1 : -1; e.vy = -520; e.vx = e.dir * 95 * W.spd; e.timer = 0.9 + Math.random() * 0.8; e.onGround = false; }
    }
    W.moveBody(e, dt, { keepVx: true });
    if (e.hitWall) e.vx = 0;
    if (W.inLava(e) || e.y > (W.h + 2) * TS) e.remove = true;
  };

  AI.bat = function (e, dt, W) {
    const pl = W.player; e.t += dt;
    if (e.state === 'hang') {
      if (pl && !pl.dead && dist(e, pl) < 190 && pl.y > e.y) { e.state = 'swoop'; e.t = 0; e.sx = e.x; e.sy = e.y; e.dir = pl.x > e.x ? 1 : -1; e.dy = SSL.clamp(pl.y - e.y, 70, 300); }
    } else {
      const D = 1.7, u = e.t / D;
      const nx = e.sx + e.dir * 230 * u * W.spd, ny = e.sy + e.dy * Math.sin(Math.PI * u);
      if (W.rectSolid(nx + 3, ny + 3, e.w - 6, e.h - 6)) { e.dir = -e.dir; e.sx = e.x; e.sy = e.y; e.t = 0; }
      else { e.x = nx; e.y = ny; }
      if (e.t >= D) {
        e.sx = e.x; e.sy = e.y; e.t = 0;
        if (pl && !pl.dead && dist(e, pl) < 420) { e.dir = pl.x > e.x ? 1 : -1; e.dy = SSL.clamp(pl.y - e.y, 70, 300); } else e.state = 'hang';
      }
    }
  };

  AI.wisp = function (e, dt, W) {
    const pl = W.player; if (!pl || pl.dead) return;
    const dx = (pl.x + pl.w / 2) - (e.x + e.w / 2), dy = (pl.y + pl.h / 2) - (e.y + e.h / 2), d = Math.hypot(dx, dy) || 1;
    const facing = pl.face === (dx > 0 ? 1 : -1);
    e.shy = facing && d < 520; e.dir = dx > 0 ? 1 : -1;
    if (!e.shy && d < 520) { const s = 62 * W.spd; e.x += dx / d * s * dt; e.y += dy / d * s * dt; }
  };

  AI.rocket = function (e, dt, W) {
    e.x += e.vx * dt;
    const pl = W.player;
    if (pl && Math.abs(pl.x - e.x) > 1000) e.remove = true;
    if (Math.random() < 0.5) W.puff(e.x + (e.dir > 0 ? 0 : e.w), e.y + e.h / 2, 1, 'rgba(255,200,120,.7)', 0.4);
  };

  AI.chomper = function (e, dt, W) {
    const pl = W.player, near = pl && Math.abs((pl.x + pl.w / 2) - (e.x + e.w / 2)) < 64;
    if (e.state === 'wait') { e.timer -= dt; if (e.timer <= 0 && !near) { e.state = 'up'; e.timer = 0; } }
    else if (e.state === 'up') { e.ext = Math.min(1, e.ext + dt / 0.45); if (e.ext >= 1) { e.state = 'hold'; e.timer = 1.3; } }
    else if (e.state === 'hold') { e.timer -= dt; if (e.timer <= 0) e.state = 'down'; }
    else { e.ext = Math.max(0, e.ext - dt / 0.45); if (e.ext <= 0) { e.state = 'wait'; e.timer = 1.4; } }
    e.y = e.baseY + 8 - e.ext * 34;
  };

  AI.firebar = function (e, dt, W) {
    e.ang += e.spd * dt;
    e.balls = e.balls || [];
    const n = Math.round(e.len * 2);
    for (let i = 0; i < n; i++) {
      const r = 8 + i * 15;
      e.balls[i] = { x: e.px + Math.cos(e.ang) * r, y: e.py + Math.sin(e.ang) * r };
    }
  };

  // ---------------- items ----------------
  const IDEF = {
    coin: { w: 20, h: 20 }, medal: { w: 28, h: 28 }, mushroom: { w: 26, h: 26, mob: 1 }, oneup: { w: 26, h: 26, mob: 1 },
    flower: { w: 26, h: 26 }, star: { w: 26, h: 26, mob: 1 }, spring: { w: 30, h: 20 }, checkpoint: { w: 22, h: 64 }, flag: { w: 16, h: 288 }, orb: { w: 30, h: 30 },
  };
  SSL.makeItem = function (d) {
    const df = IDEF[d.t] || { w: 20, h: 20 };
    const it = { kind: d.t, w: df.w, h: df.h, mob: !!df.mob, vx: 0, vy: 0, x: 0, y: 0, on: false, t: Math.random() * 6, dead: false, onGround: false, ride: null, dir: 1 };
    if (d.t === 'spring') { it.x = d.x * TS - it.w / 2; it.y = d.y * TS - it.h; it.comp = 0; }
    else if (d.t === 'checkpoint') { it.x = d.x * TS - it.w / 2; it.y = d.y * TS - it.h; it.active = false; }
    else if (d.t === 'flag') { it.x = d.x * TS - it.w / 2; it.y = (d.y - 1) * TS - it.h; it.base = (d.y - 1) * TS; }
    else { it.x = d.x * TS - it.w / 2; it.y = d.y * TS - it.h / 2; }
    if (d.t === 'medal') it.idx = d.i;
    return it;
  };
  AI.item = function (it, dt, W) {
    it.t += dt;
    if (it.emerge > 0 && it.emerge < 1) {
      it.emerge = Math.min(1, it.emerge + dt / 0.5);
      it.x = it.ex + (TS - it.w) / 2; it.y = it.ey - it.h * it.emerge;
      if (it.emerge >= 1) { it.vx = 70; it.dir = 1; if (it.kind === 'star') it.vy = -420; }
      return;
    }
    if (!it.mob) return;
    if (it.fly) {                                                // boss coin shower
      it.vy = Math.min(600, it.vy + 1500 * dt); W.moveBody(it, dt, { keepVx: true });
      if (it.onGround) { it.vx *= 0.8; it.vy = it.vy > 0 ? 0 : it.vy; if (Math.abs(it.vx) < 8) { it.vx = 0; it.mob = false; it.fly = false; } }
      if (it.hitWall) it.vx = -it.vx * 0.5;
      return;
    }
    if (it.kind === 'star') {
      it.vx = it.dir * 95; it.vy = Math.min(600, it.vy + 1300 * dt);
      W.moveBody(it, dt, { keepVx: true });
      if (it.onGround) it.vy = -420;
    } else {
      it.vx = it.dir * 70; it.vy = Math.min(650, it.vy + 1800 * dt);
      W.moveBody(it, dt, { keepVx: true });
    }
    if (it.hitWall) it.dir = -it.hitWall;
    if (it.y > (W.h + 2) * TS || W.inLava(it)) it.dead = true;
  };
})();
