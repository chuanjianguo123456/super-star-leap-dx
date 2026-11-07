/* Super Star Leap DX - themes, parallax backgrounds, cached tile textures (all procedural) */
(function () {
  'use strict';
  const SSL = window.SSL, TS = SSL.TS;

  // Tile ids
  const T = SSL.T = {
    AIR: 0, GROUND: 1, DIRT: 2, BRICK: 3, QUEST: 4, USED: 5, HARD: 6, PIPE_TL: 7, PIPE_TR: 8, PIPE_BL: 9, PIPE_BR: 10,
    ONEWAY: 11, SPIKE: 12, LAVA: 13, ICE: 14, CLOUD: 15, HIDDEN: 16, CANNON: 17, BRIDGE: 18,
  };
  SSL.isSolidTile = (id) => id === 1 || id === 2 || id === 3 || id === 4 || id === 5 || id === 6 ||
    (id >= 7 && id <= 10) || id === 14 || id === 17;
  SSL.isOneWay = (id) => id === 11 || id === 15 || id === 18;

  const TH = SSL.THEMES = {
    meadow: { sky: ['#3f9cff', '#9fdcff', '#e6f7ff'], grass: '#5bd06a', grassD: '#2f9a4a', dirt: '#a8683a', dirtD: '#7e4a28', brick: '#d0703a', brickD: '#8e3f1c', hard: '#a0a9bb', hardD: '#5d6578', pipe: '#2fbf5a', pipeD: '#16803a', wood: '#c58a4a', woodD: '#7b4e22', music: 'over', ambient: 'leaf' },
    cave: { sky: ['#0b0e2a', '#171e48', '#262d63'], grass: '#6a7ab0', grassD: '#3b4772', dirt: '#4c4670', dirtD: '#2f2a4b', brick: '#7664b0', brickD: '#473b78', hard: '#8791b4', hardD: '#444c6e', pipe: '#24b8b0', pipeD: '#127773', wood: '#8a6a4a', woodD: '#553a22', music: 'cave', ambient: 'dust' },
    dusk: { sky: ['#2a1a5c', '#d2507c', '#ffbf70'], grass: '#f3d283', grassD: '#c99b46', dirt: '#d79c57', dirtD: '#a9712f', brick: '#c9693c', brickD: '#8a3a22', hard: '#bb9462', hardD: '#7a5a3a', pipe: '#ee8a3a', pipeD: '#a8541a', wood: '#a8703a', woodD: '#6a4018', music: 'over', ambient: 'dust' },
    snow: { sky: ['#6fc0ff', '#c6ebff', '#f4fbff'], grass: '#f7fcff', grassD: '#bfe0f5', dirt: '#8fa7c9', dirtD: '#6a82a8', brick: '#6aa0d8', brickD: '#3f6ea8', hard: '#a4b6d2', hardD: '#667ca0', pipe: '#4ab8e8', pipeD: '#1e78a8', wood: '#a8825a', woodD: '#6a4a2a', music: 'sky', ambient: 'snow' },
    sky: { sky: ['#2c78ff', '#7cc2ff', '#dff4ff'], grass: '#ffffff', grassD: '#cfe4ff', dirt: '#b5cdf0', dirtD: '#8fb0e0', brick: '#ff9ac0', brickD: '#c45a88', hard: '#c8d6f0', hardD: '#8396c0', pipe: '#b07aff', pipeD: '#7440c8', wood: '#e8c08a', woodD: '#a8783a', music: 'sky', ambient: 'sparkle' },
    castle: { sky: ['#12091f', '#27123c', '#47204f'], grass: '#767694', grassD: '#40405c', dirt: '#4a4a66', dirtD: '#2e2e48', brick: '#8a6070', brickD: '#4a3444', hard: '#8e8eac', hardD: '#50506c', pipe: '#8a8aa8', pipeD: '#50506c', wood: '#6a4a3a', woodD: '#3a281e', music: 'castle', ambient: 'ember' },
    lava: { sky: ['#240606', '#651810', '#c04a18'], grass: '#7a5a58', grassD: '#44302e', dirt: '#503a38', dirtD: '#2e1f1e', brick: '#a05040', brickD: '#5e281e', hard: '#8a7270', hardD: '#4a3836', pipe: '#8a7270', pipeD: '#4a3836', wood: '#6a4a3a', woodD: '#3a281e', music: 'castle', ambient: 'ember' },
  };

  let GS = 2;                  // texture scale (pixels per world unit)
  const caches = { tiles: {}, layers: {} };
  SSL.gfx = {
    setScale(gs) { gs = Math.max(1, Math.min(3, Math.round(gs * 2) / 2)); if (gs !== GS) { GS = gs; caches.tiles = {}; caches.layers = {}; } },
    get scale() { return GS; },
  };
  function mk(w, h, sc) {
    sc = sc || GS;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc);
    const g = c.getContext('2d');
    if (g && g.scale) g.scale(sc, sc);
    return { c, g };
  }
  SSL.gfx.mk = mk;

  const rr = (g, x, y, w, h, r) => {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  };
  SSL.gfx.rr = rr;
  const lin = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; };
  SSL.gfx.lin = lin;

  // ---------- tile textures ----------
  function drawTile(g, th, id, v) {
    const P = TH[th], rnd = SSL.rng(id * 977 + v * 31 + 7);
    const outline = 'rgba(20,12,30,.55)';
    function studs(color, inset) {
      g.fillStyle = color;
      [[inset, inset], [TS - inset, inset], [inset, TS - inset], [TS - inset, TS - inset]].forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 2, 0, 6.3); g.fill(); });
    }
    if (id === T.GROUND || id === T.DIRT) {
      g.fillStyle = lin(g, 0, TS, [P.dirt, P.dirtD]); g.fillRect(0, 0, TS, TS);
      g.fillStyle = 'rgba(0,0,0,.14)';
      for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(3 + rnd() * 26, 12 + rnd() * 18, 2 + rnd() * 2.5, 1.5 + rnd() * 1.5, 0, 0, 6.3); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.10)';
      for (let i = 0; i < 3; i++) g.fillRect(2 + rnd() * 26, 10 + rnd() * 20, 3, 1.5);
      if (id === T.GROUND) {
        g.fillStyle = P.grassD; g.fillRect(0, 0, TS, 11);
        g.fillStyle = P.grass; g.fillRect(0, 0, TS, 8);
        g.fillStyle = P.grassD;
        for (let x = 0; x < TS; x += 8) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 4, 14 + ((x / 8 + v) % 2) * 2); g.lineTo(x + 8, 8); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.32)'; g.fillRect(0, 0, TS, 2);
      }
      g.strokeStyle = 'rgba(0,0,0,.06)'; g.strokeRect(0, 0, TS, TS);
    } else if (id === T.BRICK) {
      g.fillStyle = P.brickD; g.fillRect(0, 0, TS, TS);
      g.fillStyle = P.brick;
      const rows = [[0, 0, 15, 15], [16, 0, 16, 15], [0, 16, 8, 16], [9, 16, 15, 16], [25, 16, 7, 16]];
      rows.forEach((r) => { g.fillRect(r[0] + 1, r[1] + 1, r[2] - 1, r[3] - 2); });
      g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(1, 1, 14, 3); g.fillRect(17, 1, 14, 3); g.fillRect(10, 17, 13, 3);
      g.strokeStyle = outline; g.lineWidth = 1.5; g.strokeRect(.75, .75, TS - 1.5, TS - 1.5);
    } else if (id === T.QUEST || id === T.USED || id === T.HIDDEN) {
      const used = id !== T.QUEST;
      const c1 = used ? '#a0805a' : '#ffd04a', c2 = used ? '#6e5236' : '#f08a1a';
      g.fillStyle = lin(g, 0, TS, [c1, c2]); rr(g, 0, 0, TS, TS, 4); g.fill();
      g.strokeStyle = outline; g.lineWidth = 1.5; rr(g, .75, .75, TS - 1.5, TS - 1.5, 4); g.stroke();
      g.fillStyle = used ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.4)'; g.fillRect(3, 3, TS - 6, 3);
      studs(used ? '#4a3622' : '#a85a08', 5);
      if (!used) {
        g.fillStyle = '#7a3a00'; g.font = 'bold 22px "Trebuchet MS",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('?', TS / 2 + 1, TS / 2 + 2); g.fillStyle = '#fff6c0'; g.fillText('?', TS / 2, TS / 2 + 1);
      }
    } else if (id === T.HARD) {
      g.fillStyle = lin(g, 0, TS, [P.hard, P.hardD]); g.fillRect(0, 0, TS, TS);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(TS, 0); g.lineTo(TS - 6, 6); g.lineTo(6, 6); g.lineTo(6, TS - 6); g.lineTo(0, TS); g.fill();
      g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(TS, TS); g.lineTo(0, TS); g.lineTo(6, TS - 6); g.lineTo(TS - 6, TS - 6); g.lineTo(TS - 6, 6); g.lineTo(TS, 0); g.fill();
      studs('rgba(0,0,0,.35)', 4.5); g.strokeStyle = outline; g.lineWidth = 1.5; g.strokeRect(.75, .75, TS - 1.5, TS - 1.5);
    } else if (id >= T.PIPE_TL && id <= T.PIPE_BR) {
      const left = id === T.PIPE_TL || id === T.PIPE_BL, top = id <= T.PIPE_TR;
      const ox = left ? 0 : -TS;                       // one gradient spans both tiles of the 2-wide pipe
      const gr = g.createLinearGradient(ox, 0, ox + TS * 2, 0);
      gr.addColorStop(0, P.pipeD); gr.addColorStop(0.14, P.pipe); gr.addColorStop(0.62, P.pipe); gr.addColorStop(1, P.pipeD);
      const bl = top ? 0 : (left ? 3 : 0), br = top ? TS : (left ? TS : TS - 3);   // body is inset so the cap forms a lip
      g.fillStyle = gr; g.fillRect(bl, 0, br - bl, TS);
      if (left) { g.fillStyle = 'rgba(255,255,255,.30)'; g.fillRect(top ? 9 : 10, top ? 5 : 0, 6, top ? TS - 11 : TS); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(top ? 18 : 19, top ? 5 : 0, 2.5, top ? TS - 11 : TS); }
      else { g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(top ? 18 : 17, top ? 5 : 0, 6, top ? TS - 11 : TS); }
      if (top) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(left ? 2 : 0, 2, TS - 2, 2); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, TS - 5, TS, 5); }
      g.strokeStyle = outline; g.lineWidth = 1.5;
      if (top) { g.strokeRect(.75, .75, TS - 1.5, TS - 1.5); }
      else { g.beginPath(); if (left) { g.moveTo(bl + .75, 0); g.lineTo(bl + .75, TS); } else { g.moveTo(br - .75, 0); g.lineTo(br - .75, TS); } g.stroke(); }
    } else if (id === T.ONEWAY || id === T.BRIDGE) {
      g.fillStyle = lin(g, 0, 12, [P.wood, P.woodD]); rr(g, 0, 0, TS, id === T.BRIDGE ? 9 : 12, 3); g.fill();
      g.strokeStyle = outline; g.lineWidth = 1.5; rr(g, .75, .75, TS - 1.5, (id === T.BRIDGE ? 9 : 12) - 1.5, 3); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(3, 2, TS - 6, 2);
      if (id === T.ONEWAY) { g.fillStyle = P.woodD; g.fillRect(4, 12, 4, 5); g.fillRect(TS - 8, 12, 4, 5); }
      else { g.strokeStyle = P.woodD; g.lineWidth = 1.5; for (let x = 8; x < TS; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 9); g.stroke(); } }
    } else if (id === T.CLOUD) {
      g.fillStyle = 'rgba(255,255,255,.96)';
      [[8, 12, 8], [16, 8, 9], [24, 12, 8], [16, 13, 9]].forEach((c) => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.3); g.fill(); });
      g.fillStyle = 'rgba(150,190,240,.45)'; g.fillRect(2, 15, TS - 4, 5);
    } else if (id === T.ICE) {
      g.fillStyle = lin(g, 0, TS, ['#d8f4ff', '#7fc8f0']); rr(g, 0, 0, TS, TS, 3); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(5, 12); g.lineTo(14, 4); g.moveTo(8, 24); g.lineTo(24, 8); g.stroke();
      g.strokeStyle = 'rgba(40,100,160,.5)'; g.lineWidth = 1.5; rr(g, .75, .75, TS - 1.5, TS - 1.5, 3); g.stroke();
    } else if (id === T.SPIKE) {
      g.fillStyle = '#dfe6f4'; g.strokeStyle = '#3c4560'; g.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(i * 16 + 1, TS); g.lineTo(i * 16 + 8, 8); g.lineTo(i * 16 + 15, TS); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(7, 14, 2, 8); g.fillRect(23, 14, 2, 8);
    } else if (id === T.CANNON) {
      g.fillStyle = lin(g, 0, TS, ['#555a6e', '#23252f']); rr(g, 0, 0, TS, TS, 5); g.fill();
      g.fillStyle = '#0c0c14'; g.beginPath(); g.arc(TS / 2, TS / 2, 8, 0, 6.3); g.fill();
      g.strokeStyle = '#8a90a8'; g.lineWidth = 2; g.beginPath(); g.arc(TS / 2, TS / 2, 10, 0, 6.3); g.stroke();
      studs('#9aa0b8', 4.5);
    }
  }
  SSL.gfx.tile = function (th, id, v) {
    const key = th + ':' + id + ':' + (v || 0);
    let t = caches.tiles[key];
    if (!t) { t = mk(TS, TS); drawTile(t.g, th, id, v || 0); caches.tiles[key] = t.c; t = t.c; }
    return t;
  };
  SSL.gfx.cache = caches;
})();

/* ---------- parallax layers ---------- */
(function () {
  'use strict';
  const SSL = window.SSL, TH = SSL.THEMES, gfx = SSL.gfx;
  const TAU = Math.PI * 2, H = 480;

  const ridge = (W, base, comps) => (x) => {
    let y = base;
    for (let i = 0; i < comps.length; i++) y += comps[i][0] * Math.sin(TAU * comps[i][1] * x / W + comps[i][2]);
    return y;
  };
  function ridgePath(g, W, fy, bottom) {
    g.beginPath(); g.moveTo(0, bottom);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, fy(x));
    g.lineTo(W, bottom); g.closePath();
  }
  const wrap = (W, x, m, fn) => { fn(x); if (x < m) fn(x + W); if (x > W - m) fn(x - W); };
  const vgrad = (g, y0, y1, a, b) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  const blob = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const mod = (a, n) => ((a % n) + n) % n;

  function cloud(g, x, y, s, a, tint) {
    g.fillStyle = tint || 'rgba(255,255,255,' + a + ')';
    blob(g, x, y, 22 * s); blob(g, x + 26 * s, y - 12 * s, 28 * s); blob(g, x + 58 * s, y - 2 * s, 22 * s); blob(g, x + 30 * s, y + 4 * s, 26 * s);
    gfx.rr(g, x - 18 * s, y, 98 * s, 24 * s, 12 * s); g.fill();
  }
  function roundTree(g, x, y, h, col, trunk) {
    g.fillStyle = trunk; g.fillRect(x - h * .06, y - h * .45, h * .12, h * .45);
    g.fillStyle = col; blob(g, x, y - h * .62, h * .3); blob(g, x - h * .2, y - h * .48, h * .22); blob(g, x + h * .2, y - h * .48, h * .22);
  }
  function pine(g, x, y, h, col, snow) {
    const w = h * .22;
    g.fillStyle = '#4a3020'; g.fillRect(x - 2, y - h * .12, 4, h * .12);
    for (let i = 0; i < 3; i++) {
      const ty = y - h + i * h * .27, by = ty + h * .46, ww = w * (.55 + i * .3);
      g.fillStyle = col; g.beginPath(); g.moveTo(x, ty); g.lineTo(x - ww, by); g.lineTo(x + ww, by); g.closePath(); g.fill();
      if (snow) { g.fillStyle = snow; g.beginPath(); g.moveTo(x, ty); g.lineTo(x - ww * .5, ty + (by - ty) * .5); g.lineTo(x + ww * .5, ty + (by - ty) * .5); g.closePath(); g.fill(); }
    }
  }
  function crystal(g, x, y, h, hue) {
    const gl = g.createRadialGradient(x, y - h * .5, 2, x, y - h * .5, h * .9);
    gl.addColorStop(0, 'hsla(' + hue + ',90%,65%,.45)'); gl.addColorStop(1, 'hsla(' + hue + ',90%,65%,0)');
    g.fillStyle = gl; g.fillRect(x - h, y - h * 1.5, h * 2, h * 2);
    g.fillStyle = 'hsl(' + hue + ',70%,52%)';
    g.beginPath(); g.moveTo(x - h * .16, y); g.lineTo(x - h * .12, y - h * .7); g.lineTo(x, y - h); g.lineTo(x + h * .12, y - h * .7); g.lineTo(x + h * .16, y); g.closePath(); g.fill();
    g.fillStyle = 'hsla(' + hue + ',90%,85%,.65)';
    g.beginPath(); g.moveTo(x - h * .12, y - h * .7); g.lineTo(x, y - h); g.lineTo(x, y - h * .1); g.lineTo(x - h * .08, y); g.closePath(); g.fill();
  }
  function cactus(g, x, y, h, col) {
    g.fillStyle = col; gfx.rr(g, x - h * .07, y - h, h * .14, h, h * .07); g.fill();
    gfx.rr(g, x - h * .26, y - h * .62, h * .09, h * .3, h * .045); g.fill(); g.fillRect(x - h * .26, y - h * .36, h * .22, h * .08);
    gfx.rr(g, x + h * .17, y - h * .74, h * .09, h * .34, h * .045); g.fill(); g.fillRect(x + h * .04, y - h * .45, h * .22, h * .08);
  }

  const L = {};
  L.meadow = [
    { f: .10, y0: 150, y1: 480, draw(g, W) {
      const fy = ridge(W, 310, [[38, 2, .4], [20, 5, 1.3], [9, 11, 2.1]]);
      ridgePath(g, W, fy, 480); g.fillStyle = vgrad(g, 240, 480, '#8db6e8', '#c4e0f7'); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath();
      for (let x = 0; x <= W; x += 8) { if (x) g.lineTo(x, fy(x)); else g.moveTo(x, fy(x)); } g.stroke();
    } },
    { f: .18, y0: 20, y1: 240, drift: 7, draw(g, W) {
      const r = SSL.rng(11);
      for (let i = 0; i < 7; i++) { const x = (i + r() * .6) * W / 7, y = 60 + r() * 120, s = .7 + r() * .9; wrap(W, x, 160, (xx) => cloud(g, xx, y, s, .92)); }
    } },
    { f: .32, y0: 250, y1: 480, draw(g, W) {
      const fy = ridge(W, 372, [[24, 3, .5], [11, 7, 2]]);
      ridgePath(g, W, fy, 480); g.fillStyle = vgrad(g, 330, 480, '#6ccf84', '#3ea95d'); g.fill();
      const r = SSL.rng(5);
      for (let i = 0; i < 22; i++) { const x = r() * W, h = 40 + r() * 34; wrap(W, x, 40, (xx) => roundTree(g, xx, fy(x) + 8, h, '#3c9a58', '#6a4a2a')); }
    } },
    { f: .55, y0: 340, y1: 480, draw(g, W) {
      const fy = ridge(W, 428, [[14, 4, 1], [7, 9, .2]]);
      ridgePath(g, W, fy, 480); g.fillStyle = vgrad(g, 400, 480, '#46b868', '#2d8c4a'); g.fill();
      const r = SSL.rng(9);
      for (let i = 0; i < 26; i++) {
        const x = r() * W, rad = 14 + r() * 8, dx = -3 + r() * 6, dy = -4 + r() * 6, col = ['#ff6b8a', '#ffe14a', '#ffffff'][i % 3];
        wrap(W, x, 30, (xx) => { g.fillStyle = '#2d8c4a'; blob(g, xx, fy(x) + 4, rad); g.fillStyle = col; blob(g, xx + dx, fy(x) + dy, 2.2); });
      }
    } },
  ];

  L.cave = [
    { f: .12, y0: 0, y1: 260, draw(g, W) {
      const r = SSL.rng(3); g.fillStyle = '#1a2050'; g.fillRect(0, 0, W, 24);
      for (let i = 0; i < 18; i++) { const x = (i + .5) * W / 18 + (r() - .5) * 20, h = 50 + r() * 150, w = 16 + r() * 26; wrap(W, x, 60, (xx) => { g.beginPath(); g.moveTo(xx - w, 20); g.lineTo(xx, 20 + h); g.lineTo(xx + w, 20); g.closePath(); g.fill(); }); }
    } },
    { f: .22, y0: 260, y1: 480, draw(g, W) {
      const r = SSL.rng(8);
      for (let i = 0; i < 14; i++) { const x = r() * W, h = 40 + r() * 80, hue = r() < .5 ? 180 : 295; wrap(W, x, 90, (xx) => crystal(g, xx, 480, h, hue)); }
    } },
    { f: .38, y0: 0, y1: 480, draw(g, W) {
      const r = SSL.rng(21);
      for (let i = 0; i < 6; i++) {
        const x = (i + .5) * W / 6 + (r() - .5) * 40, w = 34 + r() * 24, top = 60 + r() * 60, bot = 400 - r() * 40;
        wrap(W, x, 70, (xx) => {
          g.fillStyle = vgrad(g, 0, 480, '#232a5a', '#1b2150');
          g.beginPath(); g.moveTo(xx - w, 0); g.lineTo(xx + w, 0); g.lineTo(xx + w * .45, top); g.lineTo(xx - w * .45, top); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(xx - w, 480); g.lineTo(xx + w, 480); g.lineTo(xx + w * .45, bot); g.lineTo(xx - w * .45, bot); g.closePath(); g.fill();
        });
      }
    } },
    { f: .6, y0: 380, y1: 480, draw(g, W) {
      const fy = ridge(W, 450, [[14, 5, 0], [9, 12, 1.4]]);
      ridgePath(g, W, fy, 480); g.fillStyle = '#12163a'; g.fill();
    } },
  ];

  L.dusk = [
    { f: .08, y0: 200, y1: 480, draw(g, W) {
      const r = SSL.rng(33); g.fillStyle = '#7b3a6e';
      for (let i = 0; i < 6; i++) {
        const x = (i + .5) * W / 6 + (r() - .5) * 50, w = 50 + r() * 50, h = 60 + r() * 90, yb = 340;
        wrap(W, x, 120, (xx) => { g.beginPath(); g.moveTo(xx - w, yb + 140); g.lineTo(xx - w * .8, yb - h); g.lineTo(xx + w * .8, yb - h); g.lineTo(xx + w, yb + 140); g.closePath(); g.fill(); g.fillRect(xx - w * .95, yb - h, w * 1.9, 8); });
      }
    } },
    { f: .28, y0: 280, y1: 480, draw(g, W) {
      const fy = ridge(W, 380, [[26, 2, 1], [12, 5, .3]]);
      ridgePath(g, W, fy, 480); g.fillStyle = vgrad(g, 340, 480, '#e8955f', '#c46a38'); g.fill();
    } },
    { f: .5, y0: 360, y1: 480, draw(g, W) {
      const fy = ridge(W, 440, [[14, 3, 2], [7, 8, .5]]);
      ridgePath(g, W, fy, 480); g.fillStyle = vgrad(g, 410, 480, '#b8602e', '#8a3e1c'); g.fill();
      const r = SSL.rng(44);
      for (let i = 0; i < 8; i++) { const x = r() * W, h = 36 + r() * 36; wrap(W, x, 40, (xx) => cactus(g, xx, fy(x) + 6, h, '#5a2a18')); }
    } },
  ];

  gfx._L = L;
  gfx._h = { ridge, ridgePath, wrap, vgrad, blob, mod, cloud, roundTree, pine, crystal, cactus, TAU };
})();

/* ---------- parallax layers (snow / sky / castle / lava) and background renderer ---------- */
(function () {
  'use strict';
  const SSL = window.SSL, TH = SSL.THEMES, gfx = SSL.gfx, L = gfx._L, h = gfx._h;
  const { ridge, ridgePath, wrap, vgrad, blob, mod, cloud, pine, TAU } = h;

  L.snow = [
    { f: .08, y0: 120, y1: 480, draw(g, W) {
      const fy = ridge(W, 260, [[70, 2, 0], [36, 4, 1.2], [14, 9, 2.4]]);
      ridgePath(g, W, fy, 480); g.fillStyle = vgrad(g, 150, 480, '#a9c6ea', '#d9ecfb'); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (let x = 0; x < W; x += 8) { const y = fy(x); if (y < 230) { g.beginPath(); g.moveTo(x - 10, y + 36); g.lineTo(x, y); g.lineTo(x + 10, y + 36); g.fill(); } }
    } },
    { f: .16, y0: 20, y1: 240, drift: 5, draw(g, W) {
      const r = SSL.rng(71);
      for (let i = 0; i < 6; i++) { const x = (i + r() * .6) * W / 6, y = 50 + r() * 120; wrap(W, x, 160, (xx) => cloud(g, xx, y, .8 + r() * .5, .85)); }
    } },
    { f: .34, y0: 300, y1: 480, draw(g, W) {
      const fy = ridge(W, 390, [[20, 3, 1], [9, 8, .6]]);
      ridgePath(g, W, fy, 480); g.fillStyle = vgrad(g, 350, 480, '#eaf6ff', '#c6e2f7'); g.fill();
      const r = SSL.rng(72);
      for (let i = 0; i < 26; i++) { const x = r() * W, hh = 48 + r() * 40; wrap(W, x, 40, (xx) => pine(g, xx, fy(x) + 6, hh, '#2e7a62', 'rgba(255,255,255,.92)')); }
    } },
    { f: .55, y0: 380, y1: 480, draw(g, W) {
      const fy = ridge(W, 440, [[12, 4, 0], [6, 10, 1]]);
      ridgePath(g, W, fy, 480); g.fillStyle = '#ffffff'; g.fill();
      g.fillStyle = 'rgba(160,200,235,.5)'; g.fillRect(0, 462, W, 18);
    } },
  ];

  L.sky = [
    { f: .05, y0: 0, y1: 480, draw(g, W) {
      const r = SSL.rng(91); g.fillStyle = 'rgba(255,255,255,.65)';
      for (let i = 0; i < 40; i++) blob(g, r() * W, r() * 300, .8 + r() * 1.4);
      const sun = g.createRadialGradient(W * .78, 110, 5, W * .78, 110, 150);
      sun.addColorStop(0, 'rgba(255,248,200,.95)'); sun.addColorStop(.25, 'rgba(255,230,140,.45)'); sun.addColorStop(1, 'rgba(255,230,140,0)');
      g.fillStyle = sun; g.fillRect(W * .78 - 160, 0, 320, 300);
    } },
    { f: .14, y0: 40, y1: 400, drift: 9, draw(g, W) {
      const r = SSL.rng(92);
      for (let i = 0; i < 6; i++) { const x = (i + r() * .6) * W / 6, y = 90 + r() * 200, s = 1.1 + r() * .9; wrap(W, x, 200, (xx) => cloud(g, xx, y, s, .7)); }
    } },
    { f: .3, y0: 300, y1: 480, draw(g, W) {
      const r = SSL.rng(93);
      for (let i = 0; i < 9; i++) {
        const x = (i + .3 + r() * .4) * W / 9, y = 330 + r() * 80, w = 70 + r() * 70;
        wrap(W, x, w + 20, (xx) => {
          g.fillStyle = 'rgba(190,215,250,.8)'; g.beginPath(); g.moveTo(xx - w, y); g.quadraticCurveTo(xx - w * .6, y + 56, xx - 10, y + 100); g.lineTo(xx + 10, y + 100); g.quadraticCurveTo(xx + w * .6, y + 56, xx + w, y); g.closePath(); g.fill();
          g.fillStyle = 'rgba(120,200,110,.9)'; g.beginPath(); g.ellipse(xx, y, w, 12, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(xx, y - 3, w * .85, 5, 0, 0, TAU); g.fill();
        });
      }
    } },
    { f: .52, y0: 400, y1: 480, draw(g, W) {
      g.fillStyle = 'rgba(255,255,255,.55)'; const r = SSL.rng(94);
      for (let i = 0; i < 12; i++) { const x = r() * W; wrap(W, x, 120, (xx) => { blob(g, xx, 470, 30 + r() * 20); blob(g, xx + 36, 478, 32); blob(g, xx - 34, 480, 28); }); }
    } },
  ];

  L.castle = [
    { f: .06, y0: 0, y1: 480, draw(g, W) {
      const r = SSL.rng(101); g.fillStyle = 'rgba(255,230,200,.8)';
      for (let i = 0; i < 26; i++) blob(g, r() * W, r() * 200, .6 + r() * 1.1);
      g.fillStyle = 'rgba(255,230,190,.16)'; blob(g, W * .2, 90, 56); g.fillStyle = 'rgba(255,248,230,.92)'; blob(g, W * .2, 90, 34);
      g.fillStyle = 'rgba(20,10,40,.35)'; blob(g, W * .2 + 10, 84, 30);
    } },
    { f: .16, y0: 140, y1: 480, draw(g, W) {
      const r = SSL.rng(102); g.fillStyle = '#1a0f2e';
      for (let i = 0; i < 6; i++) {
        const x = (i + .5) * W / 6 + (r() - .5) * 40, w = 46 + r() * 36, hh = 130 + r() * 120;
        wrap(W, x, w + 40, (xx) => {
          g.fillRect(xx - w / 2, 480 - hh, w, hh);
          for (let k = 0; k < 4; k++) g.fillRect(xx - w / 2 + k * w / 3.4, 480 - hh - 12, w / 6, 12);
          g.beginPath(); g.moveTo(xx - w * .62, 480 - hh - 12); g.lineTo(xx, 480 - hh - 62); g.lineTo(xx + w * .62, 480 - hh - 12); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,170,60,.75)'; g.fillRect(xx - 3, 480 - hh + 28, 6, 14); g.fillRect(xx - 3, 480 - hh + 70, 6, 14); g.fillStyle = '#1a0f2e';
        });
      }
    } },
    { f: .34, y0: 260, y1: 480, draw(g, W) {
      const r = SSL.rng(103); g.fillStyle = '#2a1840';
      for (let i = 0; i < 12; i++) { const x = (i + .5) * W / 12, w = 24 + r() * 20, hh = 80 + r() * 70; wrap(W, x, w + 10, (xx) => { g.fillRect(xx - w / 2, 480 - hh, w, hh); g.beginPath(); g.moveTo(xx - w * .65, 480 - hh); g.lineTo(xx, 480 - hh - 34); g.lineTo(xx + w * .65, 480 - hh); g.fill(); }); }
      g.fillStyle = 'rgba(255,90,30,.18)'; g.fillRect(0, 440, W, 40);
    } },
  ];
  L.lava = [
    { f: .08, y0: 0, y1: 480, draw(g, W) {
      const r = SSL.rng(111); g.fillStyle = '#3a0c0c';
      for (let i = 0; i < 9; i++) {
        const x = (i + .5) * W / 9, w = 70 + r() * 80, hh = 120 + r() * 160;
        wrap(W, x, w + 10, (xx) => { g.beginPath(); g.moveTo(xx - w, 480); g.lineTo(xx - w * .25, 480 - hh); g.lineTo(xx + w * .25, 480 - hh); g.lineTo(xx + w, 480); g.closePath(); g.fill(); });
      }
      const gl = g.createLinearGradient(0, 330, 0, 480); gl.addColorStop(0, 'rgba(255,100,30,0)'); gl.addColorStop(1, 'rgba(255,120,40,.55)'); g.fillStyle = gl; g.fillRect(0, 330, W, 150);
    } },
    { f: .3, y0: 300, y1: 480, draw(g, W) {
      const fy = ridge(W, 420, [[18, 3, 0], [10, 8, 1]]);
      ridgePath(g, W, fy, 480); g.fillStyle = '#240808'; g.fill();
      g.strokeStyle = 'rgba(255,130,40,.8)'; g.lineWidth = 2.5; g.beginPath();
      for (let x = 0; x <= W; x += 8) { if (x) g.lineTo(x, fy(x) + 1); else g.moveTo(x, fy(x) + 1); } g.stroke();
    } },
  ];

  // ---------- build & draw ----------
  const LAYER_W = 960;
  function layerCanvas(theme, idx) {
    const key = theme + ':' + idx, c = gfx.cache.layers;
    if (c[key]) return c[key];
    const def = L[theme][idx], m = gfx.mk(LAYER_W, 480, Math.min(2, gfx.scale));
    def.draw(m.g, LAYER_W);
    return (c[key] = m.c);
  }
  const sky = {};
  function skyGrad(g, theme, w, hgt) {
    const k = theme + w + 'x' + hgt;
    if (!sky[k]) { const gr = g.createLinearGradient(0, 0, 0, hgt), s = TH[theme].sky; gr.addColorStop(0, s[0]); gr.addColorStop(.62, s[1]); gr.addColorStop(1, s[2]); sky[k] = gr; }
    return sky[k];
  }
  /** Draw sky and parallax layers in screen space. cam = camera x/y in world units, scale = screen px per world unit, t = time (s). */
  gfx.drawBackground = function (g, theme, camX, camY, scale, vw, vh, t) {
    const lay = L[theme], P = TH[theme];
    g.fillStyle = skyGrad(g, theme, vw, vh); g.fillRect(0, 0, vw, vh);
    if (gfx.reduced) return;
    const vwu = vw / scale, vhu = vh / scale;
    for (let i = 0; i < lay.length; i++) {
      const d = lay[i], cv = layerCanvas(theme, i);
      const yShift = Math.max(0, camY) * d.f * .3;
      const k = vhu / 480;                       // fit the 480-high art to the view height
      const dw = LAYER_W * k, off = mod(-(camX * d.f + (d.drift || 0) * t) * k, dw);
      const dy = (vhu - 480 * k) - yShift * k;
      for (let x = off - dw; x < vwu + 2; x += dw) g.drawImage(cv, x * scale, dy * scale, dw * scale + 1, 480 * k * scale);
    }
    if (theme === 'castle' || theme === 'lava') {   // flickering warm glow
      g.fillStyle = 'rgba(255,90,20,' + (0.05 + 0.025 * Math.sin(t * 3.1) + 0.015 * Math.sin(t * 7.3)) + ')'; g.fillRect(0, 0, vw, vh);
    }
  };
  gfx.reduced = false;
})();
