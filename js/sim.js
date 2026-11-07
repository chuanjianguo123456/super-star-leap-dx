/* Super Star Leap DX - simulation step: enemy and item interaction */
(function () {
  'use strict';
  const SSL = window.SSL, T = SSL.T, TS = SSL.TS, AI = SSL.AI, W = SSL.World.prototype;
  const CHAIN = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  SSL.hit = hit;
  const STOMPABLE = { grumblet: 1, shelly: 1, hopper: 1, bat: 1, rocket: 1 };

  W.spd = 1; W.camX = 0; W.viewW = 800;
  W.hitbox = function (p) { return { x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 6 }; };

  W.step = function (dt, inp) {
    const pl = this.player;
    this.t += dt; this.inp = inp;
    if (pl.dead) { pl.update(dt, this, inp); this.updateFx(dt); return; }
    this.updateMovers(dt);
    pl.prevFeet = pl.y + pl.h;
    if (!pl.hidden) pl.update(dt, this, inp);
    if (!pl.dead && !pl.hidden && !this.flagHit) this.tileHazards(pl);
    this.updateGates();
    this.updateEnemies(dt);
    this.updateItems(dt);
    this.updateFires(dt);
    this.updateCannons(dt);
    this.updateFlag(dt);
    this.updateFx(dt);
  };

  // ---------------- enemies ----------------
  W.updateEnemies = function (dt) {
    const pl = this.player, a0 = this.camX - 220, a1 = this.camX + this.viewW + 220;
    for (let i = this.ents.length - 1; i >= 0; i--) {
      const e = this.ents[i];
      if (e.remove) { this.ents.splice(i, 1); continue; }
      if (e.dead) { e.vy += 1500 * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (e.y > (this.h + 3) * TS) e.remove = true; continue; }
      const ex = e.kind === 'firebar' ? e.px : e.x;
      if (!e.awake) { if (ex > a0 && ex < a1) e.awake = true; else continue; }
      (AI[e.kind] || function () {})(e, dt, this);
      if (e.kind === 'shelly' && e.mode === 'slide') this.shellHits(e);
      if (!pl.dead && !pl.hidden && !this.flagHit) this.touchEnemy(e, pl);
    }
  };
  W.shellHits = function (s) {
    for (let j = 0; j < this.ents.length; j++) {
      const o = this.ents[j];
      if (o === s || o.dead || !o.awake || o.kind === 'drakon' || o.kind === 'firebar' || o.squashT > 0) continue;
      if (o.kind === 'shelly' && o.mode === 'slide') continue;
      if (hit(s, o)) this.killEnemy(o, 'shell', this.player);
    }
  };

  W.killEnemy = function (e, how, by) {
    if (e.dead || e.kind === 'drakon' || e.kind === 'firebar') return;
    const pl = this.player;
    let pts = 100;
    if (how === 'stomp' || how === 'pound') {
      pl.stompChain++;
      const c = pl.stompChain;
      if (c > CHAIN.length) { this.hooks.life && this.hooks.life(1); this.say(SSL.t('oneUp'), e.x, e.y - 10); this.sfx('oneup'); pts = 0; }
      else pts = CHAIN[c - 1];
    } else pts = how === 'fire' ? 200 : how === 'shell' ? 500 : how === 'star' ? 200 : 100;
    if (pts) this.addScore(pts, e.x + e.w / 2, e.y - 6);
    this.stats.kills++;
    if (e.kind === 'grumblet' && (how === 'stomp' || how === 'pound')) {
      e.squashT = 0.45; e.vx = 0; this.sfx('stomp'); this.puff(e.x + e.w / 2, e.y + e.h, 4, 'rgba(255,255,255,.8)');
      return;
    }
    e.dead = true; e.flipped = true; e.vx = (by && by.x > e.x ? -1 : 1) * 90; e.vy = -340;
    this.sfx(how === 'shell' || how === 'fire' || how === 'star' ? 'kick' : 'stomp');
    this.puff(e.x + e.w / 2, e.y + e.h / 2, 5, '#fff6a8', 1.1);
  };

  W.touchEnemy = function (e, pl) {
    const hb = this.hitbox(pl);
    if (e.kind === 'firebar') {
      if (!e.balls || pl.starT > 0) return;
      for (let i = 0; i < e.balls.length; i++) {
        const b = e.balls[i];
        if (b.x > hb.x - 5 && b.x < hb.x + hb.w + 5 && b.y > hb.y - 5 && b.y < hb.y + hb.h + 5) { pl.hurt(this); return; }
      }
      return;
    }
    if (e.kind === 'drakon') { this.playerVsBoss(e, hb, pl.prevFeet); return; }
    if (e.squashT > 0) return;
    let eb = { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 3 };
    if (e.kind === 'chomper') { if (e.ext < 0.25) return; eb = { x: e.x + 5, y: e.y + 4, w: e.w - 10, h: e.h - 4 }; }
    if (e.kind === 'wisp' && e.shy) return;
    if (!hit(hb, eb)) return;
    if (pl.starT > 0) { this.killEnemy(e, 'star', pl); return; }
    const stomp = pl.vy > 0 && pl.prevFeet <= e.y + 15;
    if (e.kind === 'shelly' && e.mode !== 'walk') { this.touchShell(e, pl, stomp); return; }
    if (pl.pound === 2 && stomp && e.kind !== 'chomper' && e.kind !== 'wisp') {
      this.killEnemy(e, 'pound', pl); pl.vy = -260; return;
    }
    if (stomp && STOMPABLE[e.kind]) {
      if (e.kind === 'shelly') {
        if (e.wings) { e.wings = false; e.vy = 0; this.addScore(100, e.x, e.y); this.sfx('stomp'); }
        else { SSL.toShell(e); this.addScore(CHAIN[Math.min(pl.stompChain, 7)], e.x, e.y); pl.stompChain++; this.sfx('stomp'); }
        this.puff(e.x + e.w / 2, e.y, 4, 'rgba(255,255,255,.8)');
      } else this.killEnemy(e, 'stomp', pl);
      pl.bounce(this, this.inp.jump);
      return;
    }
    pl.hurt(this);
  };
  W.touchShell = function (e, pl, stomp) {
    const dirAway = (pl.x + pl.w / 2) < (e.x + e.w / 2) ? 1 : -1;
    if (e.mode === 'shell') {
      e.mode = 'slide'; e.dir = dirAway; e.kickT = 0.3; this.sfx('kick'); this.addScore(400, e.x, e.y);
      if (stomp) pl.bounce(this, false);
      else e.x += dirAway * 6;
    } else if (stomp) {
      e.mode = 'shell'; e.wake = 6; e.vx = 0; pl.bounce(this, this.inp.jump); this.sfx('stomp');
    } else if (!(e.kickT > 0)) pl.hurt(this);
  };

  // ---------------- items ----------------
  W.updateItems = function (dt) {
    const pl = this.player, hb = this.hitbox(pl);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.dead) { this.items.splice(i, 1); continue; }
      if (it.kind === 'coin' || it.kind === 'medal' || it.kind === 'flag' || it.kind === 'checkpoint') it.t += dt; else AI.item(it, dt, this);
      if (it.cool > 0) it.cool -= dt;
      if (it.comp > 0) it.comp = Math.max(0, it.comp - dt * 4);
      if (pl.dead || pl.hidden || this.flagHit) continue;
      if (it.emerge > 0 && it.emerge < 1) continue;
      if (it.kind === 'flag') continue;
      if (it.kind === 'spring') {
        const cx = pl.x + pl.w / 2;
        if (cx > it.x - 2 && cx < it.x + it.w + 2 && pl.y + pl.h > it.y + 4 && pl.y + pl.h < it.y + it.h + 10 && pl.vy >= 0 && !(it.cool > 0)) {
          it.cool = 0.3; it.comp = 1; pl.vy = this.inp.jump ? -1150 : -1000; pl.onGround = false; pl.ride = null; pl.pound = 0; pl.jumping = false; this.sfx('spring');
        }
        continue;
      }
      if (hit(hb, it)) this.collect(it, pl);
    }
  };
  W.collect = function (it, pl) {
    const cx = it.x + it.w / 2, cy = it.y;
    switch (it.kind) {
      case 'coin': it.dead = true; this.collectCoin(1); this.addScore(50, cx, cy); this.sfx('coin'); this.parts.push({ x: cx, y: it.y + 10, vx: 0, vy: 0, g: 0, life: .25, max: .25, col: '#fff6c0', size: 20, shape: 'ring' }); break;
      case 'medal':
        it.dead = true; this.stats.medals++; this.medalGot[it.idx] = true; this.addScore(1000, cx, cy); this.sfx('medal');
        this.say(SSL.t('gotStar'), cx - 40, cy - 14, '#ffe36a'); this.boom(cx, cy + 14, false); if (this.hooks.medal) this.hooks.medal(it.idx); break;
      case 'mushroom': it.dead = true; this.sfx('power'); if (pl.pow < 1) { pl.grow(this, 1); this.say(SSL.t('cMushroom'), pl.x - 10, pl.y - 20, '#ff7a7a'); } this.addScore(1000, cx, cy); break;
      case 'flower': it.dead = true; this.sfx('power'); if (pl.pow < 2) { pl.grow(this, 2); this.say(SSL.t('cFire'), pl.x - 20, pl.y - 20, '#ffb060'); } this.addScore(1000, cx, cy); break;
      case 'star': it.dead = true; this.sfx('power'); pl.starT = 10; this.say(SSL.t('cStar'), pl.x - 20, pl.y - 20, '#fff08a'); this.addScore(1000, cx, cy); break;
      case 'oneup': it.dead = true; this.sfx('oneup'); this.hooks.life && this.hooks.life(1); this.say(SSL.t('oneUp'), cx - 20, cy - 10, '#8dff8d'); break;
      case 'checkpoint':
        if (!it.active) { it.active = true; this.sfx('check'); this.say(SSL.t('checkpoint'), cx - 40, cy - 8, '#9ff'); this.hooks.checkpoint && this.hooks.checkpoint(it.x + it.w / 2); }
        break;
      case 'orb': it.dead = true; this.sfx('clear'); this.hooks.orb && this.hooks.orb(); break;
      default: break;
    }
  };
})();
