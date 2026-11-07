/* Super Star Leap DX - procedural art for items, projectiles, the boss "Drakon", goal flag and castle */
(function () {
  'use strict';
  const SSL = window.SSL, gfx = SSL.gfx, rr = gfx.rr, S = gfx.sprites, dot = gfx.dot;
  const TAU = Math.PI * 2, INK = '#1b1230';
  const ol = (g, w) => { g.lineWidth = w || 2; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); };
  const fo = (g, col, w) => { g.fillStyle = col; g.fill(); ol(g, w); };
  const ell = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); };
  const star = (g, x, y, ro, ri, rot) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = (rot || -Math.PI / 2) + i * Math.PI / 5, r = i % 2 ? ri : ro; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath();
  };
  gfx.star = star;
  const I = gfx.items = {};

  I.coin = function (g, it, t) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2, w = Math.abs(Math.cos(t * 5 + cx * 0.05)) * 7.5 + 2;
    const gr = g.createLinearGradient(cx - w, 0, cx + w, 0); gr.addColorStop(0, '#ffb320'); gr.addColorStop(.5, '#fff08a'); gr.addColorStop(1, '#ffb320');
    ell(g, cx, cy, w, 10); fo(g, gr, 1.8);
    if (w > 5) { g.strokeStyle = 'rgba(190,110,0,.7)'; g.lineWidth = 1.4; ell(g, cx, cy, w * .55, 6); g.stroke(); }
  };
  I.medal = function (g, it, t) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2 + Math.sin(t * 2.4 + cx) * 3;
    g.save(); g.globalAlpha = it.ghost ? 0.4 : 1;
    const gl = g.createRadialGradient(cx, cy, 4, cx, cy, 30); gl.addColorStop(0, 'rgba(255,240,150,.7)'); gl.addColorStop(1, 'rgba(255,240,150,0)');
    g.fillStyle = gl; g.fillRect(cx - 32, cy - 32, 64, 64);
    for (let i = 0; i < 4; i++) { const a = t * 1.6 + i * Math.PI / 2; g.fillStyle = 'rgba(255,255,255,.9)'; star(g, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 2.8, 1, a); g.fill(); }
    dot(g, cx, cy, 13); fo(g, '#ffcf3a', 2.2);
    g.fillStyle = '#ff9d2e'; dot(g, cx, cy, 9.5);
    star(g, cx, cy + 0.5, 8.2, 3.6); fo(g, '#fff6a8', 1.4);
    g.restore();
  };
  I.mushroom = function (g, it, t, green) {
    const cx = it.x + it.w / 2, by = it.y + it.h;
    g.save(); g.translate(cx, by);
    rr(g, -8, -13, 16, 13, 5); fo(g, '#ffe8c8', 1.8);
    g.fillStyle = INK; dot(g, -3, -7, 1.5); dot(g, 3, -7, 1.5);
    g.beginPath(); g.moveTo(-13, -12); g.quadraticCurveTo(-14, -26, 0, -26); g.quadraticCurveTo(14, -26, 13, -12); g.closePath(); fo(g, green ? '#35c45a' : '#ff4d5e', 2);
    g.fillStyle = '#fff'; dot(g, -6, -18, 3.4); dot(g, 5, -20, 3); dot(g, 1, -14, 2.2);
    g.restore();
  };
  I.oneup = (g, it, t) => I.mushroom(g, it, t, true);
  I.flower = function (g, it, t) {
    const cx = it.x + it.w / 2, by = it.y + it.h;
    g.save(); g.translate(cx, by);
    g.fillStyle = '#2fbf5a'; g.fillRect(-2, -12, 4, 12); ol(g, 1.4);
    g.beginPath(); g.ellipse(-7, -5, 6, 3, -.5, 0, TAU); fo(g, '#35c45a', 1.4); g.beginPath(); g.ellipse(7, -5, 6, 3, .5, 0, TAU); fo(g, '#35c45a', 1.4);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .8; g.beginPath(); g.ellipse(Math.cos(a) * 8, -18 + Math.sin(a) * 8, 5.2, 5.2, 0, 0, TAU); fo(g, i % 2 ? '#ff8a1f' : '#ff4d2e', 1.6); }
    dot(g, 0, -18, 7); fo(g, '#ffe36a', 1.8);
    g.fillStyle = INK; dot(g, -2.5, -19, 1.2); dot(g, 2.5, -19, 1.2);
    g.restore();
  };
  I.star = function (g, it, t) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    const gl = g.createRadialGradient(cx, cy, 3, cx, cy, 26); gl.addColorStop(0, 'rgba(255,250,170,.8)'); gl.addColorStop(1, 'rgba(255,250,170,0)');
    g.fillStyle = gl; g.fillRect(cx - 26, cy - 26, 52, 52);
    g.save(); g.translate(cx, cy); g.rotate(Math.sin(t * 8) * .18);
    star(g, 0, 0, 15, 7); fo(g, '#ffe14a', 2);
    g.fillStyle = INK; dot(g, -3.6, -1, 1.7); dot(g, 3.6, -1, 1.7);
    g.restore();
  };
  I.spring = function (g, it) {
    const cx = it.x + it.w / 2, by = it.y + it.h, h = 20 - (it.comp || 0) * 9;
    g.save(); g.translate(cx, by);
    rr(g, -13, -4, 26, 4, 2); fo(g, '#8a90a8', 1.6);
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath();
    for (let i = 0; i <= 4; i++) { const y = -4 - (h - 9) * i / 4; g.lineTo(i % 2 ? 9 : -9, y); } g.stroke();
    g.strokeStyle = '#ffb030'; g.lineWidth = 2.6; g.beginPath();
    for (let i = 0; i <= 4; i++) { const y = -4 - (h - 9) * i / 4; g.lineTo(i % 2 ? 9 : -9, y); } g.stroke();
    rr(g, -14, -h - 3, 28, 6, 3); fo(g, '#ff4d5e', 1.8);
    g.restore();
  };
  I.checkpoint = function (g, it, t) {
    const cx = it.x + it.w / 2, by = it.y + it.h;
    g.save(); g.translate(cx, by);
    g.fillStyle = '#d8dfee'; g.fillRect(-2, -64, 4, 64); ol(g, 1.5);
    dot(g, 0, -66, 4.5); fo(g, '#ffd447', 1.6);
    const w = Math.sin(t * 5) * (it.active ? 3 : 0.8);
    g.beginPath(); g.moveTo(2, -62); g.quadraticCurveTo(14, -62 + w, 24, -56); g.quadraticCurveTo(14, -52 - w, 24, -46); g.lineTo(2, -44); g.closePath();
    fo(g, it.active ? '#35d070' : '#8a93ad', 1.8);
    if (it.active) { g.fillStyle = '#fff'; star(g, 12, -53, 4.5, 2); g.fill(); }
    g.restore();
  };
  I.flag = function (g, it, t, world) {
    const cx = it.x + it.w / 2, base = it.base + 32, top = 2 * 32;
    const cl = world && world.flagHit ? world.flagHit.cloth : 0;
    g.save();
    g.fillStyle = '#e8edf8'; g.fillRect(cx - 3, top, 6, base - top); ol(g, 1.6);
    dot(g, cx, top - 4, 7); fo(g, '#ffd447', 2);
    const y0 = top + 10 + cl * (base - top - 80), w = Math.sin(t * 4) * 2.4;
    g.beginPath(); g.moveTo(cx - 3, y0); g.quadraticCurveTo(cx - 20, y0 + 4 + w, cx - 38, y0 + 10); g.quadraticCurveTo(cx - 22, y0 + 18 - w, cx - 38, y0 + 30); g.lineTo(cx - 3, y0 + 30); g.closePath(); fo(g, '#ff4d5e', 2);
    g.fillStyle = '#fff'; star(g, cx - 17, y0 + 17, 7, 3); g.fill();
    rr(g, cx - 14, base - 2, 28, 10, 3); fo(g, '#8a90a8', 1.8);
    g.restore();
  };
  I.orb = function (g, it, t) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2 + Math.sin(t * 3) * 5;
    const gl = g.createRadialGradient(cx, cy, 4, cx, cy, 48); gl.addColorStop(0, 'rgba(160,255,255,.9)'); gl.addColorStop(1, 'rgba(160,255,255,0)');
    g.fillStyle = gl; g.fillRect(cx - 50, cy - 50, 100, 100);
    for (let i = 0; i < 6; i++) { const a = t * 2 + i / 6 * TAU; g.fillStyle = '#fff'; star(g, cx + Math.cos(a) * 28, cy + Math.sin(a) * 20, 3.4, 1.4); g.fill(); }
    dot(g, cx, cy, 15); fo(g, '#7ff0ff', 2.2);
    g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, cx - 5, cy - 6, 5, 3.2); g.fill();
  };

  // ---------------- castle ----------------
  gfx.castle = function (g, flagX, t, theme) {
    const x = (flagX + 4.5) * 32, gy = 13 * 32, dark = theme === 'castle' || theme === 'lava';
    const wall = dark ? '#7a7a98' : '#d8c8b0', wallD = dark ? '#4a4a68' : '#a89478', roof = '#e0405a';
    g.save(); g.translate(x, gy);
    const tower = (tx, w, h) => {
      rr(g, tx - w / 2, -h, w, h, 2); fo(g, wall, 2);
      g.fillStyle = wallD; g.fillRect(tx - w / 2 + 2, -h + 14, w - 4, 3);
      for (let i = 0; i < 3; i++) { g.fillStyle = wall; g.fillRect(tx - w / 2 + i * (w - 6) / 2, -h - 7, 6, 8); ol(g, 1.5); }
      g.beginPath(); g.moveTo(tx - w / 2 - 3, -h - 7); g.lineTo(tx, -h - 38); g.lineTo(tx + w / 2 + 3, -h - 7); g.closePath(); fo(g, roof, 2);
      g.fillStyle = '#ffd447'; rr(g, tx - 4, -h + 24, 8, 14, 4); g.fill(); ol(g, 1.4);
    };
    tower(-46, 34, 84); tower(46, 34, 84);
    rr(g, -34, -64, 68, 64, 2); fo(g, wall, 2);
    g.fillStyle = wallD; for (let i = 0; i < 5; i++) { g.fillRect(-32 + i * 14, -70, 9, 8); }
    g.beginPath(); g.moveTo(-14, 0); g.lineTo(-14, -26); g.arc(0, -26, 14, Math.PI, 0); g.lineTo(14, 0); g.closePath(); fo(g, '#3a2418', 2);
    g.fillStyle = '#ffb030'; g.globalAlpha = .5 + Math.sin(t * 5) * .15; g.fillRect(-10, -4, 20, 4); g.globalAlpha = 1;
    g.fillStyle = INK; g.fillRect(-1.5, -112, 3, 40);
    g.beginPath(); g.moveTo(1.5, -112); g.lineTo(24 + Math.sin(t * 5) * 2, -105); g.lineTo(1.5, -97); g.closePath(); fo(g, '#ffd447', 1.6);
    g.restore();
  };

  // ---------------- projectiles ----------------
  gfx.drawFire = function (g, f, t) {
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    if (!f.hostile) {
      for (let i = 3; i >= 1; i--) { g.fillStyle = 'rgba(255,150,40,' + (0.16 * (4 - i)) + ')'; dot(g, cx - f.vx * 0.012 * i, cy - f.vy * 0.006 * i, 7 - i); }
      g.save(); g.translate(cx, cy); g.rotate(t * 14); dot(g, 0, 0, 6.5); fo(g, '#ff8a1f', 1.4); g.fillStyle = '#fff2a0'; dot(g, 0, 0, 3.2); g.restore();
    } else if (f.kind === 'flame') {
      const s = 1 + Math.sin(t * 30) * .08, d = f.vx > 0 ? 1 : -1;
      g.save(); g.translate(cx, cy); g.scale(d * s, s);
      g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(-8, -12, 6, -9); g.quadraticCurveTo(16, -6, 14, 0); g.quadraticCurveTo(16, 6, 6, 9); g.quadraticCurveTo(-8, 12, -18, 0); fo(g, '#ff5a20', 1.8);
      g.fillStyle = '#ffb030'; ell(g, 2, 0, 9, 5); g.fill(); g.fillStyle = '#fff2a0'; ell(g, 4, 0, 4.5, 2.6); g.fill();
      g.restore();
    } else if (f.kind === 'meteor') {
      if (f.warn > 0) {
        const a = 0.35 + 0.35 * Math.sin(t * 30);
        g.fillStyle = 'rgba(255,60,40,' + a + ')'; g.fillRect(f.x, 0, f.w, 13 * 32);
        g.fillStyle = 'rgba(255,230,160,' + (a + .2) + ')'; g.fillRect(f.x + f.w / 2 - 2, 0, 4, 13 * 32);
      } else {
        g.save(); g.translate(cx, cy);
        g.fillStyle = 'rgba(255,120,30,.45)'; g.beginPath(); g.moveTo(-10, -40); g.lineTo(10, -40); g.lineTo(8, 0); g.lineTo(-8, 0); g.closePath(); g.fill();
        dot(g, 0, 0, 12); fo(g, '#ff5a20', 2); g.fillStyle = '#ffd447'; dot(g, 0, 2, 6); g.restore();
      }
    } else if (f.kind === 'wave') {
      g.save(); g.translate(cx, f.y + f.h);
      const d = f.vx > 0 ? 1 : -1; g.scale(d, 1);
      g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-8, -18 - Math.sin(t * 25) * 3, 2, -20); g.quadraticCurveTo(8, -14, 14, -4); g.lineTo(14, 0); g.closePath(); fo(g, '#ff5a20', 1.8);
      g.fillStyle = '#ffd447'; g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(-2, -10, 3, -12); g.quadraticCurveTo(6, -6, 8, 0); g.closePath(); g.fill();
      g.restore();
    }
  };

  // ---------------- fire bar (Wall of flame) ----------------
  S.firebar = function (g, e, t) {
    if (!e.balls) return;
    for (let i = 0; i < e.balls.length; i++) {
      const b = e.balls[i], r = 6.2 - i * 0.12;
      g.fillStyle = 'rgba(255,100,20,.35)'; dot(g, b.x, b.y, r + 3.5);
      dot(g, b.x, b.y, r); fo(g, '#ff7a1f', 1.4); g.fillStyle = '#ffe680'; dot(g, b.x, b.y, r * .5);
    }
  };

  // ---------------- boss "Drakon" ----------------
  S.drakon = function (g, e, t) {
    const cx = e.x + e.w / 2, by = e.y + e.h, rage = e.hp <= 3;
    const st = e.state, mouth = st === 'aim' ? 0.7 : st === 'spit' ? 1 : st === 'intro' ? (Math.sin(t * 12) > 0 ? .9 : .2) : st === 'rain' ? 1 : 0.08;
    let sx = 1, sy = 1;
    if (st === 'crouch') { sy = 0.82; sx = 1.1; } else if (st === 'air') { sy = 1.1; sx = .92; }
    const flash = (e.inv > 0 && Math.floor(t * 18) % 2) || st === 'hurt';
    if (st === 'dying' && Math.floor(t * 20) % 2) return;
    g.save(); g.translate(cx + (st === 'hurt' || st === 'dying' ? Math.sin(t * 90) * 2.2 : 0), by);
    g.scale(e.dir * sx, sy);
    const body = flash ? '#ffffff' : rage ? '#c24a8a' : '#3fae5a', bodyD = flash ? '#e8e8f0' : rage ? '#8a2a60' : '#237a3c', belly = flash ? '#fff' : '#ffe3a8';
    const w = Math.sin(e.walk || 0) * 3;
    // tail
    g.beginPath(); g.moveTo(-14, -26); g.quadraticCurveTo(-40, -22 + Math.sin(t * 4) * 3, -50, -42); g.quadraticCurveTo(-34, -30, -12, -40); g.closePath(); fo(g, bodyD, 2.2);
    g.beginPath(); g.moveTo(-50, -42); g.lineTo(-58, -50); g.lineTo(-47, -48); g.closePath(); fo(g, '#ffd447', 1.6);
    // wing
    g.beginPath(); g.moveTo(-6, -52); g.quadraticCurveTo(-30, -78 + Math.sin(t * 6) * 2, -34, -52); g.quadraticCurveTo(-24, -58, -18, -50); g.quadraticCurveTo(-14, -56, -6, -50); g.closePath(); fo(g, flash ? '#fff' : '#7a4ad0', 2);
    // legs
    g.fillStyle = bodyD; rr(g, -18 + w, -22, 15, 22, 6); fo(g, bodyD, 2.2); rr(g, 4 - w, -22, 15, 22, 6); fo(g, body, 2.2);
    g.fillStyle = '#ffd447'; [[-20 + w, 12], [3 - w, 12]].forEach((c) => { rr(g, c[0], -5, c[1] + 4, 6, 3); fo(g, '#fff0c0', 1.6); });
    // back spikes
    for (let i = 0; i < 4; i++) { const x = -18 + i * 9, y = -60 + i * 3; g.beginPath(); g.moveTo(x - 5, y + 2); g.lineTo(x, y - 12); g.lineTo(x + 6, y + 2); g.closePath(); fo(g, rage ? '#ffd447' : '#ff8a1f', 1.8); }
    // torso
    ell(g, 0, -38, 26, 25); fo(g, body, 2.4);
    g.fillStyle = belly; ell(g, 6, -34, 16, 20); g.fill(); g.strokeStyle = 'rgba(160,100,40,.5)'; g.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-6, -48 + i * 8); g.quadraticCurveTo(6, -44 + i * 8, 17, -48 + i * 8); g.stroke(); }
    // arm
    g.save(); g.translate(14, -42); g.rotate(st === 'aim' || st === 'rain' ? -1.2 : .4 + Math.sin(t * 3) * .1);
    rr(g, -3, -2, 8, 17, 4); fo(g, body, 2); g.fillStyle = '#fff'; dot(g, 1, 16, 3.6); ol(g, 1.4); g.restore();
    // head
    g.save(); g.translate(14, -62);
    ell(g, 0, 0, 20, 16); fo(g, body, 2.4);
    g.beginPath(); g.moveTo(-8, -12); g.lineTo(-12, -28); g.lineTo(-1, -14); g.closePath(); fo(g, '#fff0c0', 1.8);
    g.beginPath(); g.moveTo(4, -14); g.lineTo(6, -30); g.lineTo(14, -12); g.closePath(); fo(g, '#fff0c0', 1.8);
    // lower jaw (tapered wedge hinged inside the cheek), then the upper snout on top of its base
    g.save(); g.translate(6, 3); g.rotate(mouth * .42);
    g.beginPath(); g.moveTo(0, -1); g.lineTo(25, 0); g.quadraticCurveTo(30, 3, 26, 8); g.lineTo(2, 10); g.closePath(); fo(g, bodyD, 2);
    g.fillStyle = '#ff7090'; g.beginPath(); g.moveTo(3, 0); g.lineTo(23, 1); g.lineTo(22, 4); g.lineTo(3, 5); g.closePath(); g.fill();
    g.restore();
    ell(g, 0, 0, 20, 16); fo(g, body, 2.4);
    g.beginPath(); g.moveTo(6, -8); g.lineTo(28, -6); g.quadraticCurveTo(34, -2, 30, 3); g.lineTo(8, 3); g.closePath(); fo(g, body, 2.2);
    g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(12 + i * 6, 3); g.lineTo(14 + i * 6, 8 + mouth * 2); g.lineTo(16 + i * 6, 3); g.fill(); }
    if (mouth > .5) { g.fillStyle = 'rgba(255,170,40,' + (0.5 + 0.4 * Math.sin(t * 40)) + ')'; dot(g, 30, 3, 6 + mouth * 4); }
    g.fillStyle = INK; dot(g, 27, -3, 1.4);
    // eye
    g.fillStyle = '#fff'; ell(g, 6, -8, 5.6, 6.2); g.fill(); ol(g, 1.6);
    g.fillStyle = rage ? '#ff2a2a' : '#ff9d2e'; dot(g, 8, -7.5, 3.2); g.fillStyle = INK; dot(g, 8.4, -7.5, 1.7);
    g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-1, -17); g.lineTo(13, -11); g.stroke();
    g.restore();
    g.restore();
  };
})();
