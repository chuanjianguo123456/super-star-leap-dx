/* Super Star Leap DX - procedural sprites: hero and enemies. All drawn with canvas paths, no image files. */
(function () {
  'use strict';
  const SSL = window.SSL, gfx = SSL.gfx, rr = gfx.rr;
  const TAU = Math.PI * 2, INK = '#1b1230';
  const S = gfx.sprites = {};

  const dot = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const ol = (g, w) => { g.lineWidth = w || 2; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); };
  const fo = (g, col, w) => { g.fillStyle = col; g.fill(); ol(g, w); };
  const ell = (g, x, y, rx, ry, rot) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); };
  gfx.dot = dot;

  // ---------------- hero "Pip" ----------------
  const OUTFIT = [
    { cap: '#ff4d5e', capD: '#c0203a', body: '#2f7bff', bodyD: '#1c4fc0', scarf: '#ffd447' },   // small
    { cap: '#ff4d5e', capD: '#c0203a', body: '#2f7bff', bodyD: '#1c4fc0', scarf: '#ffd447' },   // big
    { cap: '#ffffff', capD: '#c8d0e0', body: '#ffffff', bodyD: '#c8d0e0', scarf: '#ff7a1a' },   // fire
  ];
  S.player = function (g, p, t) {
    const pow = p.pow, big = pow > 0, o = OUTFIT[pow];
    let body = o.body, bodyD = o.bodyD, cap = o.cap, capD = o.capD;
    if (p.starT > 0) {                       // starlight rainbow
      const h = (t * 720) % 360;
      body = 'hsl(' + h + ',90%,60%)'; bodyD = 'hsl(' + ((h + 40) % 360) + ',90%,40%)';
      cap = 'hsl(' + ((h + 120) % 360) + ',90%,60%)'; capD = 'hsl(' + ((h + 160) % 360) + ',90%,40%)';
    }
    const hh = p.crouch ? (big ? 34 : 28) : p.h;
    const R = big ? 11.5 : 10.5;
    const air = !p.onGround, run = Math.abs(p.vx) > 14;
    const ph = p.runPhase;
    const sq = p.sq || 0;                    // squash/stretch amount
    g.save();
    g.translate(p.x + p.w / 2, p.y + p.h);
    g.scale(p.face * (1 + sq * .15), 1 - sq * .15);
    if (p.dead) g.rotate(Math.sin(t * 14) * .08);
    const legLen = p.crouch ? 6 : (big ? 15 : 8);
    const torsoH = p.crouch ? (big ? 12 : 8) : (big ? 18 : 9);
    const hipY = -legLen;
    const shoulderY = hipY - torsoH;
    const headY = shoulderY - R + 3;
    // scarf tail (behind)
    const sw = Math.sin(t * 12) * 3 + Math.min(10, Math.abs(p.vx) * .05) + (air ? -p.vy * .02 : 0);
    g.beginPath(); g.moveTo(-3, shoulderY - 1); g.quadraticCurveTo(-12 - sw, shoulderY - 4 + sw * .3, -17 - sw, shoulderY + 3 + sw * .5);
    g.quadraticCurveTo(-10 - sw * .5, shoulderY + 5, -3, shoulderY + 4); fo(g, o.scarf, 1.8);
    // back leg & arm
    const swing = run && !air ? Math.sin(ph) : 0, ls = air ? .9 : swing * .9;
    function leg(a, back) {
      g.save(); g.translate(back ? -2.5 : 2.5, hipY); g.rotate(a);
      g.fillStyle = back ? bodyD : body; rr(g, -3.4, -1, 6.8, legLen + 1, 3); g.fill(); ol(g, 1.8);
      g.fillStyle = back ? '#6a3a1a' : '#8a4a22'; rr(g, -3.9, legLen - 4, 10, 5.5, 2.6); g.fill(); ol(g, 1.8);
      g.restore();
    }
    leg(air ? -.45 : -ls, true);
    function arm(a, back) {
      g.save(); g.translate(back ? -4 : 4, shoulderY + 3); g.rotate(a);
      g.fillStyle = back ? bodyD : body; rr(g, -2.8, -1, 5.6, torsoH * .75 + 2, 2.8); g.fill(); ol(g, 1.6);
      g.fillStyle = '#ffd7b0'; dot(g, 0, torsoH * .75 + 2, 3.2); ol(g, 1.4);
      g.restore();
    }
    arm(p.sliding ? -2.9 : air ? -1.9 : swing * .8, true);
    // torso
    g.fillStyle = body; rr(g, -7.5, shoulderY, 15, torsoH + 1.5, 5); g.fill(); ol(g, 2);
    g.fillStyle = bodyD; g.fillRect(-7, hipY - 3, 14, 3); ol(g, 0.1);
    g.fillStyle = '#ffd447'; dot(g, 0, shoulderY + torsoH * .5 + .5, 2.2);
    // front leg
    leg(air ? .5 : ls, false);
    arm(p.sliding ? -2.7 : air ? 1.2 : -swing * .8, false);
    // head
    g.fillStyle = '#ffd7b0'; dot(g, 0, headY, R); ol(g, 2);
    // hair tuft
    g.fillStyle = '#c05a1a'; g.beginPath(); g.moveTo(-R + 1.5, headY + 1); g.quadraticCurveTo(-R - 3, headY + 6, -R + 3, headY + 8); g.quadraticCurveTo(-R + 1, headY + 4, -R + 3, headY + 1); g.fill();
    // eyes
    const blink = (Math.floor(t * 1000) % 3400) < 110 && !air;
    const ex = 4.4 + (p.look || 0);
    if (p.dead) { g.strokeStyle = INK; g.lineWidth = 1.8; g.beginPath(); g.moveTo(ex - 2, headY - 3); g.lineTo(ex + 2, headY + 1); g.moveTo(ex + 2, headY - 3); g.lineTo(ex - 2, headY + 1); g.stroke(); }
    else if (blink) { g.strokeStyle = INK; g.lineWidth = 1.8; g.beginPath(); g.moveTo(ex - 2.4, headY - 1); g.lineTo(ex + 2.4, headY - 1); g.stroke(); }
    else {
      g.fillStyle = '#fff'; ell(g, ex, headY - 1.5, 3.4, 4.6); g.fill(); ol(g, 1.4);
      g.fillStyle = INK; ell(g, ex + 0.8, headY - 1.2, 1.9, 3); g.fill();
      g.fillStyle = '#fff'; dot(g, ex + 1.3, headY - 2.4, .8);
    }
    g.fillStyle = 'rgba(255,100,110,.55)'; dot(g, 5.5, headY + 5, 2.2);
    g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath();
    if (p.hurtT > 0 || p.dead) { g.ellipse(7, headY + 6.8, 1.8, 2.2, 0, 0, TAU); } else { g.moveTo(5, headY + 6); g.quadraticCurveTo(7.5, headY + 8.4, 9.4, headY + 5.6); }
    g.stroke();
    // cap
    g.fillStyle = cap; g.beginPath(); g.arc(0, headY - 1, R + .8, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(R + 6, headY - 3.5); g.quadraticCurveTo(R + 7, headY - 1, R + 3, headY - 1.4); g.lineTo(-R, headY - 1); g.closePath();
    fo(g, cap, 2);
    g.fillStyle = capD; g.beginPath(); g.arc(0, headY - 1, R + .8, Math.PI * 1.02, Math.PI * 1.35); g.lineTo(-2, headY - 1); g.closePath(); g.fill();
    g.fillStyle = '#ffd447'; g.save(); g.translate(1, headY - 8.6); g.rotate(-.1);
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.9 : 4.2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); fo(g, '#ffd447', 1.1); g.restore();
    if (pow === 2) { g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(0, shoulderY + 4); g.quadraticCurveTo(-3, shoulderY + 8, 0, shoulderY + 12); g.quadraticCurveTo(3, shoulderY + 8, 0, shoulderY + 4); g.fill(); }
    g.restore();
  };

  // ---------------- enemies ----------------
  S.grumblet = function (g, e, t) {
    const cx = e.x + e.w / 2, by = e.y + e.h;
    g.save(); g.translate(cx, by);
    if (e.squashT > 0) { g.scale(1.25, .32); g.fillStyle = '#9a5a2a'; ell(g, 0, -10, 13, 10); fo(g, '#9a5a2a', 2.4); g.restore(); return; }
    const w = Math.sin(e.walk) * 3;
    g.fillStyle = '#4a2a14'; ell(g, -6 + w, -2.5, 6, 3.4); fo(g, '#4a2a14', 1.8); ell(g, 6 - w, -2.5, 6, 3.4); fo(g, '#4a2a14', 1.8);
    g.beginPath(); g.moveTo(-14, -6); g.quadraticCurveTo(-15, -26, 0, -26); g.quadraticCurveTo(15, -26, 14, -6); g.closePath(); fo(g, '#a8642c', 2);
    g.fillStyle = '#e8b27a'; ell(g, 0, -9, 10, 6.4); g.fill();
    g.fillStyle = '#fff'; ell(g, -5, -13, 3.6, 4.6); g.fill(); ell(g, 5, -13, 3.6, 4.6); g.fill();
    g.fillStyle = INK; dot(g, -4.2 + e.dir * 1.2, -12.6, 1.8); dot(g, 5.8 + e.dir * 1.2, -12.6, 1.8);
    g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-10, -19); g.lineTo(-2, -15.5); g.moveTo(10, -19); g.lineTo(2, -15.5); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(-4, -6.2, 3, 3); g.fillRect(1.5, -6.2, 3, 3);
    g.restore();
  };

  S.shelly = function (g, e, t) {
    const cx = e.x + e.w / 2, by = e.y + e.h;
    g.save(); g.translate(cx, by);
    const inShell = e.mode === 'shell' || e.mode === 'slide';
    if (e.mode === 'shell' && e.wake < 1.4 && Math.floor(t * 14) % 2) g.translate(Math.sin(t * 90) * 1.5, 0);
    if (inShell) {
      if (e.vy < 0 || e.flipped) { g.scale(1, -1); g.translate(0, e.h); }
      const spin = e.mode === 'slide' ? t * 18 : 0;
      ell(g, 0, -10, 13.5, 10.5); fo(g, '#2fbf5a', 2.2);
      g.fillStyle = '#e8f5c8'; g.beginPath(); g.moveTo(-12, -6); g.quadraticCurveTo(0, -1, 12, -6); g.lineTo(11, -2); g.quadraticCurveTo(0, 1, -11, -2); g.closePath(); fo(g, '#e8f5c8', 1.8);
      g.save(); g.beginPath(); ell(g, 0, -10, 13, 10); g.clip(); g.strokeStyle = 'rgba(0,70,30,.65)'; g.lineWidth = 1.8;
      for (let i = -1; i <= 1; i++) { const xx = i * 8 + (spin ? ((spin * 3) % 8) : 0); g.beginPath(); g.moveTo(xx, -20); g.lineTo(xx + 4, 0); g.stroke(); }
      g.restore();
      if (e.mode === 'shell' && e.wake < 1.4) { g.fillStyle = '#ffd7b0'; dot(g, 0, -4, 3); }
      g.restore(); return;
    }
    const d = e.dir, w = Math.sin(e.walk) * 3;
    g.scale(d < 0 ? -1 : 1, 1);
    g.fillStyle = '#ffb030'; ell(g, -5 + w, -2.5, 5.5, 3.2); fo(g, '#ffb030', 1.8); ell(g, 6 - w, -2.5, 5.5, 3.2); fo(g, '#ffb030', 1.8);
    g.fillStyle = '#ffd7a0'; g.beginPath(); g.moveTo(5, -14); g.quadraticCurveTo(7, -32, 13, -32); g.quadraticCurveTo(21, -32, 19, -22); g.quadraticCurveTo(18, -16, 12, -14); g.closePath(); fo(g, '#ffd7a0', 2);
    g.fillStyle = '#fff'; ell(g, 14, -26, 3, 4); g.fill(); g.fillStyle = INK; dot(g, 15, -25.6, 1.6);
    g.beginPath(); g.moveTo(-12, -6); g.quadraticCurveTo(-14, -26, -1, -26); g.quadraticCurveTo(10, -26, 10, -6); g.closePath(); fo(g, '#2fbf5a', 2);
    g.save(); g.clip(); g.strokeStyle = 'rgba(0,70,30,.6)'; g.lineWidth = 1.8;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 7 - 1, -27); g.lineTo(i * 7 + 3, -4); g.stroke(); }
    g.restore();
    g.fillStyle = '#e8f5c8'; g.fillRect(-12, -7, 22, 4.5); ol(g, 1.4);
    if (e.wings) {
      const fl = Math.sin(t * 16) * .5;
      g.save(); g.translate(-3, -24); g.rotate(-.5 + fl); g.fillStyle = '#fff'; ell(g, -8, 0, 10, 5.5); fo(g, '#fff', 1.8); g.restore();
    }
    g.restore();
  };

  S.spikeback = function (g, e, t) {
    const cx = e.x + e.w / 2, by = e.y + e.h;
    g.save(); g.translate(cx, by); g.scale(e.dir < 0 ? -1 : 1, 1);
    const w = Math.sin(e.walk) * 3;
    g.fillStyle = '#ffb030'; ell(g, -5 + w, -2.5, 5.5, 3.2); fo(g, '#ffb030', 1.8); ell(g, 6 - w, -2.5, 5.5, 3.2); fo(g, '#ffb030', 1.8);
    g.fillStyle = '#ffd7a0'; ell(g, 12, -14, 6.5, 6); fo(g, '#ffd7a0', 2);
    g.fillStyle = '#fff'; dot(g, 14, -15, 2.4); g.fillStyle = INK; dot(g, 14.8, -15, 1.3);
    g.beginPath(); g.moveTo(-13, -5); g.quadraticCurveTo(-14, -22, -1, -22); g.quadraticCurveTo(10, -22, 10, -5); g.closePath(); fo(g, '#e03a3a', 2);
    g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { const sx = -10 + i * 6.2; g.beginPath(); g.moveTo(sx - 3, -17 - (i % 2) * 2); g.lineTo(sx + 1, -29 + (i % 2) * 2 - (i === 1 || i === 2 ? 2 : 0)); g.lineTo(sx + 5, -17 - (i % 2) * 2); g.closePath(); g.fill(); g.stroke(); }
    g.restore();
  };

  S.chomper = function (g, e, t) {      // pipe plant. e.y = top of the visible head; e.ext = 0..1 extension
    const cx = e.x + e.w / 2, hy = e.y + 13, bite = (Math.sin(t * 9) + 1) * .5;
    g.save(); g.translate(cx, hy);
    g.fillStyle = '#2fbf5a'; g.fillRect(-3, 8, 6, 60); g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(-3, 8, 6, 60);
    g.save(); g.translate(0, 0); g.rotate(-bite * .22);
    g.beginPath(); g.moveTo(-14, 2); g.arc(0, 2, 14, Math.PI, 0); g.closePath(); fo(g, '#ff3d4d', 2.2);
    g.fillStyle = '#fff'; dot(g, -6, -6, 3); dot(g, 5, -9, 2.6); dot(g, 8, -2, 2);
    g.restore();
    g.save(); g.rotate(bite * .22);
    g.beginPath(); g.moveTo(-14, 3); g.arc(0, 3, 14, 0, Math.PI); g.closePath(); fo(g, '#ff3d4d', 2.2);
    g.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 8 - 3, 3); g.lineTo(i * 8, 8); g.lineTo(i * 8 + 3, 3); g.closePath(); g.fill(); }
    g.restore();
    g.restore();
  };

  S.rocket = function (g, e, t) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    g.save(); g.translate(cx, cy); g.scale(e.dir < 0 ? -1 : 1, 1);
    const fl = 6 + Math.sin(t * 40) * 3;
    g.fillStyle = 'rgba(255,170,40,.9)'; g.beginPath(); g.moveTo(-12, -4); g.lineTo(-22 - fl, 0); g.lineTo(-12, 4); g.fill();
    g.fillStyle = 'rgba(255,240,150,.95)'; g.beginPath(); g.moveTo(-12, -2); g.lineTo(-17 - fl * .5, 0); g.lineTo(-12, 2); g.fill();
    g.beginPath(); g.moveTo(-12, -9); g.lineTo(4, -9); g.quadraticCurveTo(15, -9, 15, 0); g.quadraticCurveTo(15, 9, 4, 9); g.lineTo(-12, 9); g.closePath(); fo(g, '#3a3f58', 2.2);
    g.fillStyle = '#fff'; ell(g, 5, -2, 3.6, 4.6); g.fill(); g.fillStyle = INK; dot(g, 6.2, -1.6, 2); g.fillStyle = '#fff'; dot(g, 6.8, -2.6, .7);
    g.strokeStyle = INK; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, -8.5); g.lineTo(9, -4.8); g.stroke();
    g.fillStyle = '#e03a3a'; g.fillRect(-10, -9, 5, 18); ol(g, 1.4);
    g.restore();
  };

  S.wisp = function (g, e, t) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2 + Math.sin(t * 3 + e.x) * 2;
    g.save(); g.translate(cx, cy); g.globalAlpha = e.shy ? .62 : .96;
    g.beginPath(); g.moveTo(-14, 12); g.quadraticCurveTo(-18, -14, 0, -15); g.quadraticCurveTo(18, -14, 14, 12);
    for (let i = 0; i < 4; i++) g.quadraticCurveTo(10 - i * 7, 20 + (i % 2) * 2, 7 - i * 7, 12); g.closePath(); fo(g, e.shy ? '#c8d4ff' : '#ffffff', 2);
    if (e.shy) { g.strokeStyle = INK; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-8, -2); g.lineTo(-2, -2); g.moveTo(3, -2); g.lineTo(9, -2); g.stroke(); }
    else {
      g.fillStyle = INK; ell(g, -5 * e.dir, -3, 2.4, 3.6); g.fill(); ell(g, 5 * e.dir, -3, 2.4, 3.6); g.fill();
      g.fillStyle = '#ff7090'; ell(g, 0, 5, 4, 3); g.fill(); g.fillStyle = '#fff'; g.fillRect(-1.6, 3, 3.2, 2);
    }
    g.restore();
  };

  S.hopper = function (g, e, t) {
    const cx = e.x + e.w / 2, by = e.y + e.h;
    g.save(); g.translate(cx, by); g.scale(e.dir < 0 ? -1 : 1, 1);
    const air = !e.onGround, sq = air ? 1.12 : 0.9 + Math.max(0, 1 - e.timer) * .0;
    g.scale(air ? .92 : 1.06, sq);
    g.fillStyle = '#1e9a4a'; ell(g, -8, -3, 6, 3.4); fo(g, '#1e9a4a', 1.8);
    g.beginPath(); g.moveTo(-13, -4); g.quadraticCurveTo(-14, -22, 0, -22); g.quadraticCurveTo(14, -22, 13, -4); g.closePath(); fo(g, '#48d06a', 2);
    g.fillStyle = '#d8f8c0'; ell(g, 2, -8, 8, 5); g.fill();
    g.fillStyle = '#fff'; dot(g, -5, -23, 5); fo(g, '#fff', 1.8); dot(g, 6, -23, 5); fo(g, '#fff', 1.8); g.fillStyle = INK; dot(g, -3.8, -23, 2.2); dot(g, 7.2, -23, 2.2);
    g.restore();
  };

  S.bat = function (g, e, t) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2, fl = Math.sin(t * 18 + e.x) * .7;
    g.save(); g.translate(cx, cy);
    [-1, 1].forEach((s) => { g.save(); g.scale(s, 1); g.rotate(-fl * .7);
      g.beginPath(); g.moveTo(3, -2); g.quadraticCurveTo(16, -16 - fl * 8, 26, -4); g.quadraticCurveTo(21, -2, 20, 3); g.quadraticCurveTo(14, -1, 12, 4); g.quadraticCurveTo(8, 0, 3, 5); g.closePath(); fo(g, '#6a3ab0', 1.8); g.restore(); });
    ell(g, 0, 0, 8.5, 9); fo(g, '#8a5ad0', 2);
    g.fillStyle = '#6a3ab0'; g.beginPath(); g.moveTo(-7, -6); g.lineTo(-6, -15); g.lineTo(-1, -8); g.moveTo(7, -6); g.lineTo(6, -15); g.lineTo(1, -8); g.fill();
    g.fillStyle = '#ffec60'; dot(g, -3.6, -1.5, 2.4); dot(g, 3.6, -1.5, 2.4); g.fillStyle = INK; dot(g, -3.6, -1.5, 1); dot(g, 3.6, -1.5, 1);
    g.fillStyle = '#fff'; g.fillRect(-3.5, 4, 2, 3); g.fillRect(1.5, 4, 2, 3);
    g.restore();
  };
})();
