/* Super Star Leap DX - boss "Drakon": walk, fire spit, leap with shockwaves, meteor rain when enraged */
(function () {
  'use strict';
  const SSL = window.SSL, TS = SSL.TS, AI = SSL.AI, W = SSL.World.prototype;
  const faceTo = (e, pl) => { e.dir = (pl.x + pl.w / 2) > (e.x + e.w / 2) ? 1 : -1; };
  const GROUND = 13 * TS;

  function spit(e, world, dy) {
    const mx = e.x + e.w / 2 + e.dir * (e.w / 2 + 4);
    world.fires.push({ hostile: true, kind: 'flame', x: mx - 9, y: e.y + e.h - 26 - dy, w: 18, h: 18, vx: e.dir * (200 + (e.hp <= 3 ? 40 : 0)) * world.spd, vy: 0, life: 4 });
    world.sfx('fire'); world.puff(mx, e.y + e.h - 17 - dy, 4, '#ffb030', 1.2);
  }
  function rain(e, world) {
    const a = world.level.arena, pl = world.player;
    for (let i = 0; i < 4; i++) {
      const x = i === 0 ? pl.x + pl.w / 2 : a.x0 * TS + 70 + Math.random() * ((a.x1 - a.x0) * TS - 140);
      world.fires.push({ hostile: true, kind: 'meteor', x: x - 10, y: -30, w: 20, h: 20, vx: 0, vy: 0, warn: 0.9 + i * 0.28, life: 4 });
    }
    world.sfx('roar');
  }

  AI.drakon = function (e, dt, world) {
    const pl = world.player, rage = e.hp <= 3 ? 1.3 : 1, spd = world.spd;
    e.t += dt; e.inv = Math.max(0, e.inv - dt); e.finv = Math.max(0, (e.finv || 0) - dt);
    if (e.state === 'dying') {
      e.timer -= dt; e.vx = 0; e.vy = 0;
      if (Math.random() < dt * 16) { world.boom(e.x + Math.random() * e.w, e.y + Math.random() * e.h, false); world.sfx('bump'); }
      if (e.timer <= 0) { e.remove = true; world.bossDefeated(e); }
      return;
    }
    e.vy = Math.min(900, e.vy + 1800 * dt);
    switch (e.state) {
      case 'wait': e.vx = 0; faceTo(e, pl); if (world.bossMode === 1) { e.state = 'intro'; e.timer = 1.7; } break;
      case 'intro': e.vx = 0; e.timer -= dt; if (e.timer <= 0) { e.state = 'walk'; e.timer = 1.4; } break;
      case 'hurt': e.vx = 0; e.timer -= dt; if (e.timer <= 0) { e.state = 'walk'; e.timer = 0.9; faceTo(e, pl); } break;
      case 'walk':
        e.vx = e.dir * 62 * rage * spd; e.timer -= dt; e.walk += dt * 6;
        if (e.hitWall) e.dir = -e.hitWall;
        if (e.timer <= 0) {
          const r = Math.random(); faceTo(e, pl); e.vx = 0;
          if (e.hp <= 3 && e.last !== 'rain' && r < 0.3) { e.state = 'rain'; e.timer = 1.0; e.last = 'rain'; }
          else if (e.last !== 'jump' && r < 0.55) { e.state = 'crouch'; e.timer = 0.5; e.last = 'jump'; }
          else { e.state = 'aim'; e.timer = 0.75 / rage; e.shots = rage > 1 ? 3 : 2; e.shotT = 0; e.last = 'fire'; }
        }
        break;
      case 'aim': e.vx = 0; faceTo(e, pl); e.timer -= dt; if (e.timer <= 0) { e.state = 'spit'; e.shotT = 0; } break;
      case 'spit':
        e.vx = 0; e.shotT -= dt;
        if (e.shots > 0 && e.shotT <= 0) { spit(e, world, e.shots % 2 ? 28 : 0); e.shots--; e.shotT = 0.5 / rage; }
        else if (e.shots <= 0 && e.shotT < -0.35) { e.state = 'walk'; e.timer = 1.2; }
        break;
      case 'crouch': e.vx = 0; e.timer -= dt; if (e.timer <= 0) { faceTo(e, pl); e.vy = -800; e.vx = e.dir * 175 * rage * spd; e.state = 'air'; e.t2 = 0; e.onGround = false; world.sfx('roar'); } break;
      case 'air':
        e.t2 += dt;
        if (e.hitWall) e.vx = 0;
        if (e.onGround && e.t2 > 0.15) {
          e.state = 'walk'; e.timer = 1.0; e.vx = 0; world.shake(9); world.sfx('bossHit');
          const cx = e.x + e.w / 2;
          [-1, 1].forEach((d) => world.fires.push({ hostile: true, kind: 'wave', x: cx - 14, y: GROUND - 22, w: 28, h: 22, vx: d * 210 * spd, vy: 0, life: 3 }));
          world.puff(cx, GROUND, 10, 'rgba(255,230,180,.9)', 1.4);
        }
        break;
      case 'rain': e.vx = 0; e.timer -= dt; if (e.timer <= 0) { rain(e, world); e.state = 'walk'; e.timer = 2.2; } break;
      default: break;
    }
    world.moveBody(e, dt, { keepVx: true });
    const a = world.level.arena;
    if (a) { if (e.x < a.x0 * TS + 8) { e.x = a.x0 * TS + 8; e.dir = 1; } if (e.x + e.w > a.x1 * TS - 8) { e.x = a.x1 * TS - 8 - e.w; e.dir = -1; } }
  };

  W.hurtBoss = function (e, dmg, byFire) {
    if (e.state === 'dying' || e.state === 'wait' || e.state === 'intro') return false;
    if (byFire) { if (e.finv > 0 || e.inv > 0) return false; e.finv = 0.3; }
    else { if (e.inv > 0) return false; e.inv = 1.4; }
    const wasCalm = e.hp > 3;
    e.hp -= dmg;
    this.say('-' + dmg, e.x + e.w / 2 - 10, e.y - 20, '#ff4a3a');
    if (wasCalm && e.hp <= 3 && e.hp > 0) {                    // second phase: tell the player
      this.say(SSL.t('bossRage'), e.x - 10, e.y - 30, '#ff7a6a'); this.shake(10); this.sfx('roar');
      if (this.hooks.bossRage) this.hooks.bossRage();
    }
    this.sfx('bossHit'); this.shake(byFire ? 3 : 8);
    this.boom(e.x + e.w / 2, e.y + 22, !byFire);
    this.addScore(byFire ? 200 : 1000, e.x + e.w / 2, e.y);
    if (e.hp <= 0) {
      e.state = 'dying'; e.timer = 2.4; e.inv = 99; this.fires.length = 0; this.sfx('bossDie');
      if (this.hooks.bossDying) this.hooks.bossDying();
    } else if (!byFire) { e.state = 'hurt'; e.timer = 0.9; e.vx = 0; }
    return true;
  };
  W.playerVsBoss = function (e, hb, prevFeet) {
    const pl = this.player;
    if (e.state === 'dying' || e.state === 'wait') return;
    const box = { x: e.x + 8, y: e.y + 6, w: e.w - 16, h: e.h - 6 };
    if (!(hb.x < box.x + box.w && hb.x + hb.w > box.x && hb.y < box.y + box.h && hb.y + hb.h > box.y)) return;
    const stomp = pl.vy > 0 && prevFeet <= e.y + 36;
    if (stomp || pl.starT > 0 || pl.pound === 2) {
      this.hurtBoss(e, pl.pound === 2 ? 1.5 : 1, false);
      if (stomp) { pl.bounce(this, true); pl.pound = 0; }
    } else if (e.inv <= 0) pl.hurt(this);
  };
  W.bossDefeated = function (e) {
    this.bossMode = 2; this.camLock = null; this.openGate();
    this.boom(e.x + e.w / 2, e.y + e.h / 2, true); this.shake(10);
    this.addScore(5000, e.x + e.w / 2, e.y);
    for (let i = 0; i < 24; i++) {                              // coin shower (collectable)
      const c = SSL.makeItem({ t: 'coin', x: (e.x + e.w / 2) / TS, y: (e.y + 10) / TS });
      c.mob = true; c.kind = 'coin'; c.vx = (Math.random() - 0.5) * 360; c.vy = -380 - Math.random() * 320; c.fly = true;
      this.items.push(c);
    }
    const o = this.level.orb; if (o) { this.orb = SSL.makeItem({ t: 'orb', x: o.x, y: o.y }); this.items.push(this.orb); }
    if (this.hooks.bossDown) this.hooks.bossDown();
  };
  W.closeGate = function () { (this.level.gates || []).forEach((g) => { for (let y = g.y; y < g.y + g.h; y++) this.set(g.x, y, SSL.T.HARD); }); this.gateClosed = true; };
  W.openGate = function () { (this.level.gates || []).forEach((g) => { for (let y = g.y; y < g.y + g.h; y++) this.set(g.x, y, 0); }); this.gateClosed = false; };
  W.updateGates = function () {
    const lv = this.level, pl = this.player;
    if (!lv.arena || this.bossMode !== 0 || pl.dead) return;
    if (pl.x > (lv.arena.x0 + 3) * TS) {
      this.bossMode = 1; this.closeGate(); this.shake(7); this.sfx('roar');
      if (this.boss) this.boss.awake = true;
      this.camLock = { x0: lv.arena.x0 * TS, x1: lv.arena.x1 * TS };
      if (this.hooks.bossStart) this.hooks.bossStart();
    }
  };
})();
