/* Super Star Leap DX - renderer: world, HUD, intro card, animated title backdrop */
(function () {
  'use strict';
  const SSL = window.SSL, G = SSL.game, gfx = SSL.gfx, TS = SSL.TS, T = SSL.T, S = gfx.sprites, IT = gfx.items;
  const TAU = Math.PI * 2, rr = gfx.rr, dot = gfx.dot;
  const FONT = '"Trebuchet MS","Segoe UI",Roboto,"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
  const font = (px) => '800 ' + Math.round(px) + 'px ' + FONT;

  function txt(g, s, x, y, size, col, align) {
    g.font = font(size); g.textAlign = align || 'left'; g.lineJoin = 'round';
    g.lineWidth = Math.max(3, size * 0.2); g.strokeStyle = 'rgba(10,14,40,.9)'; g.strokeText(s, x, y);
    g.fillStyle = col || '#fff'; g.fillText(s, x, y);
  }

  function lavaTile(g, w, tx, ty, now) {
    const x = tx * TS, y = ty * TS, top = w.tile(tx, ty - 1) !== T.LAVA;
    g.fillStyle = top ? '#ff6a1a' : '#e23c0c'; g.fillRect(x, y + (top ? 5 : 0), TS + 0.6, TS - (top ? 5 : 0));
    if (top) {
      g.fillStyle = '#ffb030'; g.beginPath(); g.moveTo(x, y + 9);
      for (let i = 0; i <= 4; i++) g.lineTo(x + i * 8, y + 3 + Math.sin(now * 3 + (x + i * 8) * 0.09) * 2.6);
      g.lineTo(x + TS + 0.6, y + 9); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,240,170,.8)'; g.fillRect(x + 4, y + 4 + Math.sin(now * 4 + x) * 1.2, 10, 2);
    } else {
      g.fillStyle = 'rgba(255,190,60,.35)';
      g.beginPath(); g.arc(x + 16 + Math.sin(now * 1.3 + x * 0.3) * 8, y + 16 + Math.cos(now * 1.7 + y) * 6, 3.4, 0, TAU); g.fill();
    }
  }

  function drawTiles(g, w, th, camX, vw, now) {
    const x0 = Math.max(0, Math.floor(camX / TS)), x1 = Math.min(w.w - 1, Math.floor((camX + vw) / TS) + 1);
    for (let ty = 0; ty < w.h; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = w.tiles[ty * w.w + tx];
        if (!id || id === T.HIDDEN) continue;
        if (id === T.LAVA) { lavaTile(g, w, tx, ty, now); continue; }
        let oy = 0; const b = w.bumps[tx + ',' + ty];
        if (b !== undefined) oy = -Math.sin(Math.min(1, (0.2 - b) / 0.2) * Math.PI) * 8;
        g.drawImage(gfx.tile(th, id, (tx * 3 + ty) & 1), tx * TS, ty * TS + oy, TS, TS);
      }
    }
  }

  function drawMovers(g, w, th, camX, vw) {
    const P = SSL.THEMES[th];
    w.movers.forEach((m) => {
      if (m.x > camX + vw + 60 || m.x + m.w < camX - 60) return;
      rr(g, m.x, m.y, m.w, 13, 5); g.fillStyle = P.wood; g.fill(); g.lineWidth = 2; g.strokeStyle = '#1b1230'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.32)'; g.fillRect(m.x + 5, m.y + 2.5, m.w - 10, 2.5);
      g.fillStyle = P.woodD; for (let i = 0; i < Math.round(m.w / 32); i++) dot(g, m.x + 10 + i * 32, m.y + 8, 2.2);
    });
  }

  function drawSigns(g, w, camX, vw) {
    const signs = w.level.signs; if (!signs || !signs.length) return;
    g.font = font(12); g.textAlign = 'center'; g.textBaseline = 'middle';
    const gy = 13 * TS, bh = 22, post = 40;
    for (let i = 0; i < signs.length; i++) {
      const s = signs[i], x = s.x * TS, label = SSL.pick(s.t), bw = g.measureText(label).width + 16;
      if (x + bw / 2 < camX - 10 || x - bw / 2 > camX + vw + 10) continue;
      const by = gy - post - bh;                       // board sits above the hero's head
      g.fillStyle = '#7b4e22'; g.fillRect(x - 2.5, by + bh - 2, 5, post + 2); g.lineWidth = 1.5; g.strokeStyle = '#1b1230'; g.strokeRect(x - 2.5, by + bh - 2, 5, post + 2);
      rr(g, x - bw / 2, by, bw, bh, 6); g.fillStyle = '#d9a35f'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x - bw / 2 + 4, by + 2.5, bw - 8, 2);
      g.fillStyle = '#3a1f08'; g.fillText(label, x, by + bh / 2 + 1);
    }
    g.textBaseline = 'alphabetic';
  }

  function drawParts(g, w) {
    for (let i = 0; i < w.parts.length; i++) {
      const p = w.parts[i], k = Math.max(0, p.life / p.max);
      g.globalAlpha = p.shape === 'ring' ? k : Math.min(1, k * 1.6);
      const sz = p.shrink ? p.size * k : p.size;
      if (p.shape === 'sq') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot || 0); g.fillStyle = p.col; g.fillRect(-sz / 2, -sz / 2, sz, sz); g.strokeStyle = 'rgba(20,10,30,.6)'; g.lineWidth = 1; g.strokeRect(-sz / 2, -sz / 2, sz, sz); g.restore(); }
      else if (p.shape === 'ring') { g.strokeStyle = p.col; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, p.size * (1 - k) + 4, 0, TAU); g.stroke(); }
      else if (p.shape === 'coin') { g.fillStyle = p.col; g.beginPath(); g.ellipse(p.x, p.y, Math.abs(Math.cos(p.life * 18)) * 6 + 1.5, 9, 0, 0, TAU); g.fill(); g.strokeStyle = '#b36b00'; g.lineWidth = 1.5; g.stroke(); }
      else if (p.shape === 'star') { g.fillStyle = p.col; gfx.star(g, p.x, p.y, sz, sz * 0.45, p.life * 6); g.fill(); }
      else { g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, Math.max(0.5, sz), 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
  }
  function drawTexts(g, w) {
    for (let i = 0; i < w.texts.length; i++) {
      const q = w.texts[i], a = Math.min(1, q.life / 0.4);
      g.globalAlpha = a; txt(g, q.s, q.x, q.y, 15, q.col, 'left');
    }
    g.globalAlpha = 1;
  }

  function drawEntity(g, e, now) {
    if (e.kind === 'firebar') { S.firebar(g, e, now); return; }
    const fn = S[e.kind]; if (!fn) return;
    if (e.dead) { const cx = e.x + e.w / 2, cy = e.y + e.h / 2; g.save(); g.translate(cx, cy); g.scale(1, -1); g.translate(-cx, -cy); fn(g, e, now); g.restore(); }
    else fn(g, e, now);
  }

  // ---------------- HUD ----------------
  function hud(g, w, now) {
    const W = G.cssW, H = G.playH, safe = G.safe || { top: 0, right: 0, bottom: 0, left: 0 };
    const fs = SSL.clamp(Math.min(H * 0.043, W * 0.021), 12, 25), pad = 12 + safe.left, y = 10 + safe.top, gap = fs * 1.15;
    g.save(); g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0); g.textBaseline = 'top';
    const lfs = fs * 0.55;
    const mw = (s, size) => { g.font = font(size); return g.measureText(s).width; };
    const lab = (s, x, a) => { g.font = font(lfs); g.textAlign = a || 'left'; g.fillStyle = 'rgba(190,215,255,.95)'; g.lineWidth = 3; g.strokeStyle = 'rgba(10,14,40,.85)'; g.strokeText(s, x, y); g.fillText(s, x, y); };
    const total = G.level.medals, saved = G.medalsOf(G.levelIndex);
    const cols = [
      { l: SSL.t('lives'), v: '\u2665 ' + G.lives, c: '#ff7a8a' },
      { l: SSL.t('score'), v: SSL.pad(G.score, 6), c: '#fff' },
      { l: SSL.t('coins'), v: '\u00d7' + SSL.pad(G.coins, 2), c: '#fff', icon: true },
      { l: SSL.t('medals'), medals: true },
      { l: SSL.t('world'), v: G.level.world, c: '#ffe08a' },
    ];
    let x = pad;
    const tEnd = W - 128 - safe.right, tW = Math.max(mw(SSL.t('time').toUpperCase(), lfs), mw('999', fs)), limit = tEnd - tW - gap;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i], L = c.l.toUpperCase();
      const need = c.medals ? total * fs * 1.35 : (c.icon ? fs * 1.15 : 0) + mw(c.v, fs);
      if (x + Math.max(need, mw(L, lfs)) > limit) break;       // drop low-priority columns on narrow screens
      lab(L, x);
      let wd;
      if (c.medals) {
        for (let k = 0; k < total; k++) {
          const got = G.runMedals[k] || saved[k];
          g.fillStyle = got ? '#ffd447' : 'rgba(255,255,255,.18)'; gfx.star(g, x + fs * 0.62 + k * fs * 1.35, y + fs * 1.28, fs * 0.62, fs * 0.28); g.fill();
          g.lineWidth = 1.6; g.strokeStyle = 'rgba(10,14,40,.9)'; g.stroke();
        }
        wd = total * fs * 1.35;
      } else {
        const off = c.icon ? fs * 1.15 : 0;
        if (c.icon) IT.coin(g, { x: x - 2, y: y + fs * 0.62, w: 20, h: 20 }, now);
        txt(g, c.v, x + off, y + fs * 0.62, fs, c.c); wd = off + mw(c.v, fs);
      }
      x += Math.max(wd, mw(L, lfs)) + gap;
    }
    // time, right-aligned left of the round buttons
    const tx = tEnd, low = G.timeLeft < 100 && Math.floor(now * 4) % 2 === 0;
    lab(SSL.t('time').toUpperCase(), tx, 'right'); txt(g, String(Math.max(0, Math.ceil(G.timeLeft))), tx, y + fs * 0.62, fs, low ? '#ff6a6a' : '#fff', 'right');
    // boss bar
    const b = w.boss;
    if (b && (w.bossMode === 1 || b.state === 'dying') && b.hp > -1) {
      const bw = Math.min(W * 0.46, 380), bx = (W - bw) / 2, by = y + fs * 2.5, hp = Math.max(0, b.hp) / b.max;
      g.fillStyle = 'rgba(10,14,40,.8)'; rr(g, bx - 3, by - 3, bw + 6, 20, 10); g.fill();
      const gr = g.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ff6b3a'); gr.addColorStop(1, '#ffd447');
      g.fillStyle = gr; rr(g, bx, by, Math.max(0, bw * hp), 14, 7); if (hp > 0) g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; rr(g, bx, by, bw, 14, 7); g.stroke();
      txt(g, 'DRAKON', W / 2, by + 22, fs * 0.8, '#ffb0a0', 'center');
    }
    if (G.settings.fps) { txt(g, G.fps + ' fps', pad, H - 26, 13, '#9f9', 'left'); }
    g.restore();
  }

  function introCard(g) {
    const W = G.cssW, H = G.playH, k = Math.min(1, G.introT / 0.45), a = SSL.clamp(k, 0, 1) * 0.92;
    g.save(); g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    g.fillStyle = 'rgba(8,12,34,' + a + ')'; g.fillRect(0, 0, W, H);
    g.globalAlpha = Math.min(1, a * 1.3); g.textBaseline = 'middle';
    const fs = SSL.clamp(H * 0.09, 28, 64), cy = H * 0.42, slide = (1 - Math.min(1, (1.7 - G.introT) / 0.35)) * 40;
    txt(g, SSL.t('world').toUpperCase() + ' ' + G.level.world, W / 2 - slide, cy, fs, '#ffd447', 'center');
    txt(g, SSL.pick(G.level.name), W / 2 + slide, cy + fs * 1.0, fs * 0.55, '#ffffff', 'center');
    txt(g, SSL.pick(G.level.desc), W / 2, cy + fs * 1.65, fs * 0.36, '#9fb3e6', 'center');
    txt(g, '\u2665 \u00d7 ' + G.lives, W / 2, cy + fs * 2.5, fs * 0.5, '#ff7a8a', 'center');
    g.restore();
  }

  // Separate tablet control deck (landscape and portrait).
  function panel(g) {
    if (G.playH >= G.cssH) return;
    const cv = G.canvas, y = Math.round(G.playH * G.dpr);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createLinearGradient(0, y, 0, cv.height); gr.addColorStop(0, '#1a2447'); gr.addColorStop(1, '#0b1020');
    g.fillStyle = gr; g.fillRect(0, y, cv.width, cv.height - y);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, y, cv.width, Math.max(2, G.dpr * 2));
  }

  // ---------------- title backdrop ----------------
  function menuScene(g, now) {
    const cv = G.canvas, sc = G.scale * G.dpr, camX = now * 70, vw = G.viewW;
    gfx.drawBackground(g, 'meadow', camX, 0, sc, cv.width, Math.round(G.playH * G.dpr), now);
    g.setTransform(sc, 0, 0, sc, -camX * sc, 0);
    const x0 = Math.floor(camX / TS) - 1, x1 = Math.floor((camX + vw) / TS) + 1;
    for (let tx = x0; tx <= x1; tx++) {
      g.drawImage(gfx.tile('meadow', T.GROUND, (tx & 1)), tx * TS, 13 * TS, TS, TS);
      g.drawImage(gfx.tile('meadow', T.DIRT, 0), tx * TS, 14 * TS, TS, TS);
    }
    for (let i = Math.floor(x0 / 12) - 1; i <= Math.ceil(x1 / 12); i++) {
      const bx = i * 12 * TS;
      for (let k = 0; k < 5; k++) IT.coin(g, { x: bx + 110 + k * 34, y: 13 * TS - 100 - Math.sin(k / 4 * Math.PI) * 60, w: 20, h: 20 }, now);
    }
    const hx = camX + vw * 0.25, ph = (now % 2.4) / 0.8, u = Math.min(1, ph), air = ph < 1, hop = air ? 4 * 78 * u * (1 - u) : 0;
    const bob = air ? 0 : Math.abs(Math.sin(now * 8)) * 2;
    S.player(g, { x: hx, y: 13 * TS - 52 - bob - hop, w: 20, h: 52, pow: 1, face: 1, vx: 230, vy: air ? (u < 0.5 ? -200 : 200) : 0, onGround: !air, crouch: false, runPhase: now * 17, sq: 0, look: 0.9, starT: 0, dead: false, hurtT: 0 }, now);
  }

  G.render = function (now) {
    const cv = G.canvas, g = G.ctx; if (!g) return;
    const sc = G.scale * G.dpr, w = G.world;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!w) { menuScene(g, now); return; }
    const th = G.level.theme, camX = G.cam.x, vw = G.viewW;
    gfx.drawBackground(g, th, camX, 0, sc, cv.width, Math.round(G.playH * G.dpr), now);
    let sx = 0, sy = 0;
    if (w.shakeT > 0 && G.settings.shake) { sx = (Math.random() - 0.5) * w.shakeA * 2 * Math.min(1, w.shakeT * 4); sy = (Math.random() - 0.5) * w.shakeA * 1.4 * Math.min(1, w.shakeT * 4); }
    g.setTransform(sc, 0, 0, sc, (-camX + sx) * sc, sy * sc);
    if (G.level.flagX != null) gfx.castle(g, G.level.flagX, now, th);
    // behind tiles: pipe plants and items still sprouting from blocks
    w.ents.forEach((e) => { if (e.kind === 'chomper' && e.awake) S.chomper(g, e, now); });
    w.items.forEach((it) => { if (it.emerge > 0 && it.emerge < 1 && IT[it.kind]) IT[it.kind](g, it, now, w); });
    drawTiles(g, w, th, camX, vw, now);
    drawMovers(g, w, th, camX, vw);
    drawSigns(g, w, camX, vw);
    const inView = (o) => o.x + (o.w || 0) > camX - 80 && o.x < camX + vw + 80;
    w.items.forEach((it) => { if (!(it.emerge > 0 && it.emerge < 1) && IT[it.kind] && (inView(it) || it.kind === 'flag')) IT[it.kind](g, it, now, w); });
    w.ents.forEach((e) => { if (e.kind !== 'chomper' && e.kind !== 'drakon' && (e.awake || e.dead) && (e.kind === 'firebar' || inView(e))) drawEntity(g, e, now); });
    if (w.boss && !w.boss.remove) S.drakon(g, w.boss, now);
    w.fires.forEach((f) => gfx.drawFire(g, f, now));
    const p = w.player;
    if (!p.hidden && !(p.invuln > 0 && !p.dead && Math.floor(now * 22) % 2)) S.player(g, p, now);
    drawParts(g, w); drawTexts(g, w);
    g.setTransform(1, 0, 0, 1, 0, 0);
    panel(g);
    if (G.state !== 'menu') hud(g, w, now);
    if (G.state === 'intro') introCard(g);
    if (G.fade > 0) { g.fillStyle = 'rgba(8,12,34,' + Math.min(1, G.fade) + ')'; g.fillRect(0, 0, cv.width, cv.height); }
  };
})();
