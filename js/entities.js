/* Super Star Leap DX - player physics and behaviour */
(function () {
  'use strict';
  const SSL = window.SSL, T = SSL.T, TS = SSL.TS;

  const P = SSL.PHYS = {
    walk: 150, run: 232, accG: 1500, accA: 1050, frG: 1800, frA: 260, accI: 300, frI: 170,
    jump: 600, jumpBoost: 0.12, gUp: 1500, gCut: 3700, gDown: 2300, vMax: 740,
    coyote: 0.12, buffer: 0.16, minJumpHold: 0.16, stompBounce: 440, spring: 1000, pound: 1000,
    hSmall: 30, hBig: 52, w: 20,
  };

  function Player(x, y) {
    this.isPlayer = true;
    this.w = P.w; this.h = P.hSmall;
    this.x = x; this.y = y - this.h;
    this.vx = 0; this.vy = 0; this.face = 1;
    this.onGround = false; this.ride = null; this.groundTile = 0; this.onOneWay = false;
    this.pow = 0; this.crouch = false; this.pound = 0; this.poundT = 0;
    this.coyote = 0; this.buffer = 0; this.dropT = 0; this.jumpHoldT = 0;
    this.invuln = 0; this.starT = 0; this.hurtT = 0; this.fireCd = 0;
    this.runPhase = 0; this.sq = 0; this.look = 0;
    this.dead = false; this.deadT = 0; this.stompChain = 0; this.growT = 0; this.jumping = false;
    this.hidden = false; this.locked = false;       // locked: cut-scene control
  }
  SSL.Player = Player;

  Player.prototype.setHeight = function (W, h) {
    if (h === this.h) return true;
    const bottom = this.y + this.h;
    if (h > this.h) {                                  // growing: need head room
      const ny = bottom - h;
      if (W.rectSolid(this.x + 1, ny, this.w - 2, h - this.h)) return false;
      this.y = ny;
    } else this.y = bottom - h;
    this.h = h; return true;
  };
  Player.prototype.baseH = function () { return this.pow > 0 ? P.hBig : P.hSmall; };

  Player.prototype.grow = function (W, pow) {
    const was = this.pow;
    this.pow = pow;
    if (was === 0 && pow > 0) { this.crouch = false; this.setHeight(W, P.hBig); this.growT = 0.5; }
  };
  Player.prototype.hurt = function (W) {
    if (this.dead || this.invuln > 0 || this.starT > 0 || this.locked) return false;
    this.pound = 0;
    if (this.pow > 0) {
      this.pow = 0; this.crouch = false; this.setHeight(W, P.hSmall);
      this.invuln = 2.2; this.hurtT = 0.4; this.vy = -280; this.vx = -this.face * 90; this.jumping = false;
      W.sfx('hurt'); W.shake(5); W.puff(this.x + this.w / 2, this.y + this.h / 2, 8, '#ffd447');
      return true;
    }
    this.die(W); return true;
  };
  Player.prototype.die = function (W, pit) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0; this.vx = 0; this.vy = 0; this.pound = 0; this.starT = 0; this.crouch = false;
    this.y += this.h - P.hSmall; this.pow = 0; this.h = P.hSmall; this.pit = !!pit;
    W.onPlayerDead();
  };

  Player.prototype.setCrouch = function (W, want) {
    if (want && !this.crouch && this.pow > 0) { this.crouch = true; this.setHeight(W, P.hSmall); }
    else if (!want && this.crouch) { if (this.setHeight(W, this.baseH())) this.crouch = false; }
  };

  Player.prototype.updateDead = function (dt, W) {
    this.deadT += dt;
    if (this.deadT < 0.55) return;
    if (this.deadT - dt < 0.55 && !this.pit) this.vy = -640;
    this.vy = Math.min(900, this.vy + 1900 * dt);
    this.y += this.vy * dt;
  };

  Player.prototype.update = function (dt, W, inp) {
    if (this.dead) return this.updateDead(dt, W);
    if (this.locked) inp = this.autoRight ? W.autoInput : W.noInput;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.growT = Math.max(0, this.growT - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.dropT = Math.max(0, this.dropT - dt);
    this.jumpHoldT = Math.max(0, this.jumpHoldT - dt);
    if (this.starT > 0) { this.starT -= dt; if (Math.random() < 0.5) W.sparkle(this.x + Math.random() * this.w, this.y + Math.random() * this.h); }

    // crouch (big only)
    this.setCrouch(W, inp.down && this.onGround && this.pound === 0);
    // if a power-up arrived while there was no head room, grow as soon as there is
    if (!this.crouch && this.pow > 0 && this.h < this.baseH()) this.setHeight(W, this.baseH());

    // horizontal
    let ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (this.pound) ax = 0;                                  // crouching still allows a slow crawl
    const ice = this.onGround && this.groundTile === T.ICE;
    let maxV = inp.run ? P.run : P.walk;
    if (this.crouch) maxV *= 0.55;
    let a = this.onGround ? (ice ? P.accI : P.accG) : P.accA;
    if (ax === 0) a = this.onGround ? (ice ? P.frI : P.frG) : P.frA;
    else {
      this.face = ax;
      if (this.vx * ax < 0) {
        a *= ice ? 1.2 : 2.3;
        if (this.onGround && Math.abs(this.vx) > 120 && Math.random() < 0.4) W.puff(this.x + this.w / 2, this.y + this.h, 1, 'rgba(255,255,255,.7)', 0.6);
      }
    }
    if (!this.pound) this.vx = SSL.approach(this.vx, ax * maxV, a * dt);
    this.look = SSL.approach(this.look, ax * 0.9, 6 * dt);

    // jump with coyote time + input buffer
    this.coyote = this.onGround ? P.coyote : this.coyote - dt;
    this.buffer = inp.pressed.jump ? P.buffer : this.buffer - dt;
    if (this.buffer > 0 && inp.down && this.onGround && this.onOneWay) {
      this.dropT = 0.22; this.onGround = false; this.ride = null; this.buffer = 0; this.y += 2; this.coyote = 0;
    } else if (this.buffer > 0 && this.coyote > 0 && !this.pound) {
      this.vy = -(P.jump + Math.abs(this.vx) * P.jumpBoost);
      this.onGround = false; this.ride = null; this.buffer = 0; this.coyote = 0; this.sq = -0.9; this.jumping = true; this.jumpHoldT = P.minJumpHold;
      W.sfx(this.pow ? 'jumpBig' : 'jump'); W.puff(this.x + this.w / 2, this.y + this.h, 3, 'rgba(255,255,255,.7)', 0.5);
    }

    // ground pound
    if (!this.onGround && inp.pressed.down && !this.pound && !this.crouch) { this.pound = 1; this.poundT = 0.14; this.vx *= 0.2; this.vy = 0; }
    if (this.pound === 1) { this.poundT -= dt; if (this.poundT <= 0) { this.pound = 2; this.vy = P.pound; W.sfx('tick'); } }

    // fireball
    if (inp.pressed.run && this.pow === 2 && this.fireCd <= 0 && !this.crouch && W.countFire() < 2) {
      W.spawnFire(this.x + this.w / 2 + this.face * 12, this.y + this.h * 0.45, this.face); this.fireCd = 0.18; W.sfx('fire');
    }

    // gravity
    if (this.pound !== 1) {
      const g = this.pound === 2 ? 0 : (this.vy < 0 ? ((inp.jump || this.jumpHoldT > 0 || !this.jumping) ? P.gUp : P.gCut) : P.gDown);
      this.vy = Math.min(this.pound === 2 ? P.pound : P.vMax, this.vy + g * dt);
    }

    const wasAir = !this.onGround, vyBefore = this.vy;
    W.moveBody(this, dt, { hits: true });
    if (this.onGround && wasAir) {
      if (vyBefore > 260) { this.sq = Math.min(1, vyBefore / 700); W.puff(this.x + this.w / 2, this.y + this.h, 4, 'rgba(255,255,255,.75)', 0.6); }
      this.stompChain = 0;
      if (this.pound === 2) { this.pound = 0; W.poundImpact(this); } else this.pound = 0;
    } else if (this.onGround) { this.pound = 0; this.stompChain = 0; }

    if (this.onGround && Math.abs(this.vx) > 12) this.runPhase += Math.abs(this.vx) * dt * 0.085;
    else if (this.onGround) this.runPhase = 0;
    this.sq = SSL.approach(this.sq, 0, 5 * dt);

    // bottom of the world
    if (this.y > (W.level.h + 1) * TS) this.die(W, true);
  };

  /** Called by World when the player stomps something. */
  Player.prototype.bounce = function (W, high) {
    this.vy = -(high ? P.stompBounce * 1.3 : P.stompBounce); this.onGround = false; this.ride = null; this.pound = 0; this.jumping = false;
  };
})();
