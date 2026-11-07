/* Super Star Leap DX - simulation step part 2: fireballs, projectiles, cannons, goal flag */
(function () {
  'use strict';
  const SSL = window.SSL, T = SSL.T, TS = SSL.TS, W = SSL.World.prototype, hit = SSL.hit;

  // ---------------- fireballs & hostile projectiles ----------------
  W.updateFires = function (dt) {
    const pl = this.player, hb = this.hitbox(pl);
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      if (!f) continue; // defeating Drakon can clear the projectile array during this loop
      f.life -= dt;
      if (f.life <= 0 || f.x < this.camX - 300 || f.x > this.camX + this.viewW + 300) { this.fires.splice(i, 1); continue; }
      if (f.hostile) {
        if (f.kind === 'meteor') {
          if (f.warn > 0) { f.warn -= dt; if (f.warn > 0) continue; f.vy = 80; f.ground = true; }
          f.vy = Math.min(820, f.vy + 1500 * dt); f.y += f.vy * dt;
          if (f.y + f.h > 13 * TS) { this.boom(f.x + f.w / 2, 13 * TS, false); this.shake(3); this.sfx('bump'); this.fires.splice(i, 1); continue; }
        } else if (f.kind === 'wave') {
          f.x += f.vx * dt;
          if (Math.random() < 0.4) this.puff(f.x + f.w / 2, f.y + f.h, 1, '#ffb030', 0.5);
          if (this.tile(Math.floor((f.vx > 0 ? f.x + f.w : f.x) / TS), 12) !== 0) { this.fires.splice(i, 1); continue; }
        } else {
          f.x += f.vx * dt; f.y += f.vy * dt;
          if (this.rectSolid(f.x + 2, f.y + 2, f.w - 4, f.h - 4)) { this.puff(f.x + f.w / 2, f.y + f.h / 2, 4, '#ffb030'); this.fires.splice(i, 1); continue; }
        }
        if (!pl.dead && !pl.hidden && !this.flagHit && (f.warn || 0) <= 0 && hit(hb, { x: f.x + 2, y: f.y + 2, w: f.w - 4, h: f.h - 4 })) {
          if (pl.starT > 0) continue;
          if (pl.hurt(this) && f.kind !== 'wave') { this.fires.splice(i, 1); }
        }
        continue;
      }
      // player fireball
      f.vy = Math.min(520, f.vy + 1500 * dt);
      f.x += f.vx * dt;
      if (this.rectSolid(f.x + 1, f.y + 2, f.w - 2, f.h - 4)) { this.puff(f.x + f.w / 2, f.y + f.h / 2, 5, '#ffb030'); this.sfx('bump'); this.fires.splice(i, 1); continue; }
      f.y += f.vy * dt;
      if (f.vy > 0 && this.rectSolid(f.x + 2, f.y + f.h - 2, f.w - 4, 4)) { f.vy = -300; f.y = Math.floor((f.y + f.h) / TS) * TS - f.h - 0.1; }
      else if (f.vy < 0 && this.rectSolid(f.x + 2, f.y, f.w - 4, 3)) f.vy = 60;
      if (f.y > (this.h + 1) * TS) { this.fires.splice(i, 1); continue; }
      let gone = false;
      for (let j = 0; j < this.ents.length && !gone; j++) {
        const e = this.ents[j];
        if (e.dead || !e.awake || e.squashT > 0 || e.kind === 'firebar') continue;
        if (!hit(f, e)) continue;
        if (e.kind === 'drakon') { this.hurtBoss(e, 0.5, true); gone = true; break; }
        if (e.kind === 'shelly' && e.mode !== 'walk') { this.killEnemy(e, 'fire', pl); gone = true; break; }
        this.killEnemy(e, 'fire', pl); gone = true;
      }
      if (gone) { this.boom(f.x + f.w / 2, f.y + f.h / 2, false); this.fires.splice(i, 1); }
    }
  };

  // ---------------- cannons ----------------
  W.updateCannons = function (dt) {
    for (let i = 0; i < this.cannons.length; i++) {
      const c = this.cannons[i], cx = c.x * TS + TS / 2;
      if (cx < this.camX - 40 || cx > this.camX + this.viewW + 40) { c.tm = Math.max(c.tm, 1); continue; }
      c.tm -= dt;
      if (c.tm <= 0 && Math.abs(this.player.x - cx) > 70) {
        c.tm = c.every; const dir = this.player.x < cx ? -1 : 1;
        let live = 0; this.ents.forEach((e) => { if (e.kind === 'rocket' && !e.dead) live++; });
        if (live >= 3) continue;
        const e = SSL.makeEnemy({ t: 'rocket', x: c.x + 0.5 + dir * 0.9, y: c.y + 0.5, dir: dir });
        e.x = cx + dir * 18 - e.w / 2; e.y = c.y * TS + TS / 2 - e.h / 2; e.awake = true; e.dir = dir; e.vx = dir * 150 * this.spd;
        this.ents.push(e); this.sfx('fire'); this.puff(cx + dir * 18, e.y + e.h / 2, 5, '#ddd', 0.9); c.fl = 0.15;
      }
      if (c.fl > 0) c.fl -= dt;
    }
  };

  // ---------------- goal flag ----------------
  W.updateFlag = function (dt) {
    const pl = this.player;
    if (this.flagHit) {
      const fh = this.flagHit; fh.t += dt;
      if (fh.phase === 'slide') {
        pl.sliding = true; pl.x = fh.px; pl.vx = 0; pl.vy = 0;
        const bot = (13) * TS - pl.h;
        pl.y = Math.min(bot, pl.y + 220 * dt); fh.cloth = Math.min(1, fh.cloth + dt * 0.75);
        if (pl.y >= bot - 0.5) { pl.y = bot; fh.phase = 'wait'; fh.t = 0; pl.sliding = false; pl.face = -1; pl.x = fh.px + 16; }
      } else if (fh.phase === 'wait') {
        if (fh.t > 0.55) { fh.phase = 'walk'; pl.face = 1; pl.locked = true; pl.autoRight = true; this.sfx('clear'); }
      } else if (fh.phase === 'walk') {
        pl.update(dt, this, this.autoInput);
        if (pl.x > fh.castleX - pl.w / 2 || fh.t > 3) { fh.phase = 'done'; pl.hidden = true; if (this.hooks.levelClear) this.hooks.levelClear(); this.puff(fh.castleX, 12.5 * TS, 8, '#fff6a8', 1.3); }
      }
      return;
    }
    const lv = this.level; if (lv.flagX == null || pl.dead || pl.hidden) return;
    const fx = lv.flagX * TS + TS / 2;
    if (pl.x + pl.w > fx - 6 && pl.x < fx + 8) {
      const top = 2 * TS, height = Math.max(0, Math.min(1, (13 * TS - (pl.y + pl.h)) / (11 * TS)));
      this.flagHit = { t: 0, phase: 'slide', px: fx - pl.w / 2 - 2, cloth: 0, castleX: (lv.flagX + 7) * TS, bonus: Math.round(height * 5000 / 100) * 100 + 100 };
      pl.pound = 0; pl.crouch = false; pl.starT = Math.min(pl.starT, 1); pl.locked = true; pl.autoRight = false;
      this.sfx('flag'); this.stats.flagBonus = this.flagHit.bonus; this.addScore(this.flagHit.bonus, fx, pl.y - 10);
      if (this.hooks.flag) this.hooks.flag();
    }
  };
})();
