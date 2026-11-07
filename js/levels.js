/* Super Star Leap DX - level builder and the 8 handcrafted levels.
   Coordinates are in tiles. Row 0 is the top of the screen, row 14 the bottom, ground surface is row 13. */
(function () {
  'use strict';
  const SSL = window.SSL, T = SSL.T;
  const H = 15, GT = 13;

  function LB(o) {
    this.w = o.w; this.o = o;
    this.tiles = new Uint8Array(o.w * H);
    this.blocks = {}; this.items = []; this.ents = []; this.movers = []; this.cannons = [];
    this.startX = 3; this.medalN = 0;
  }
  LB.prototype = {
    set(x, y, t) { if (x >= 0 && x < this.w && y >= 0 && y < H) this.tiles[y * this.w + x] = t; return this; },
    get(x, y) { return x < 0 || x >= this.w || y < 0 || y >= H ? 0 : this.tiles[y * this.w + x]; },
    fill(x, y, w, h, t) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, t); return this; },
    ground(x0, x1, top) {
      top = top == null ? GT : top;
      for (let x = x0; x < x1; x++) { this.set(x, top, T.GROUND); for (let y = top + 1; y < H; y++) this.set(x, y, T.DIRT); }
      return this;
    },
    ice(x0, x1) { for (let x = x0; x < x1; x++) this.set(x, GT, T.ICE); return this; },
    pit(x, n) { this.fill(x, GT, n, 2, 0); return this; },
    lava(x, n) { this.fill(x, GT, n, 2, T.LAVA); return this; },
    ceiling(x0, x1, rows) { for (let x = x0; x < x1; x++) for (let y = 0; y < rows; y++) this.set(x, y, T.DIRT); return this; },
    plat(x, y, w, t) { for (let i = 0; i < w; i++) this.set(x + i, y, t || T.ONEWAY); return this; },
    cloud(x, y, w) { return this.plat(x, y, w, T.CLOUD); },
    hard(x, y, w, h) { return this.fill(x, y, w || 1, h || 1, T.HARD); },
    bricks(x, y, w, h) { return this.fill(x, y, w, h || 1, T.BRICK); },
    q(x, y, c, n) { this.set(x, y, T.QUEST); this.blocks[x + ',' + y] = { c: c || 'coin', n: n || 1 }; return this; },
    brick(x, y, c, n) { this.set(x, y, T.BRICK); if (c) this.blocks[x + ',' + y] = { c: c, n: n || 1 }; return this; },
    hidden(x, y, c) { this.set(x, y, T.HIDDEN); this.blocks[x + ',' + y] = { c: c || '1up', n: 1 }; return this; },
    spikes(x, n, y) { for (let i = 0; i < n; i++) this.set(x + i, y == null ? GT - 1 : y, T.SPIKE); return this; },
    pipe(x, h, o) {
      o = o || {}; const top = GT - h;
      for (let y = top; y < GT; y++) { this.set(x, y, y === top ? T.PIPE_TL : T.PIPE_BL); this.set(x + 1, y, y === top ? T.PIPE_TR : T.PIPE_BR); }
      if (o.chomper) this.ents.push({ t: 'chomper', x: x + 1, y: top, delay: o.delay || 0 });
      return this;
    },
    stairUp(x, n, base) { base = base == null ? GT : base; for (let i = 0; i < n; i++) this.hard(x + i, base - 1 - i, 1, i + 1); return this; },
    stairDown(x, n, base) { base = base == null ? GT : base; for (let i = 0; i < n; i++) this.hard(x + i, base - n + i, 1, n - i); return this; },
    coin(x, y) { this.items.push({ t: 'coin', x: x + 0.5, y: y + 0.5 }); return this; },
    coins(x, y, n, dx, dy) { for (let i = 0; i < n; i++) this.coin(x + i * (dx == null ? 1 : dx), y + i * (dy || 0)); return this; },
    arc(x, y, n, h) {   // parabolic coin arc starting at tile x, base row y
      h = h || 3; for (let i = 0; i < n; i++) { const u = n === 1 ? .5 : i / (n - 1); this.coin(x + i, y - Math.round(4 * h * u * (1 - u))); } return this;
    },
    medal(x, y) { this.items.push({ t: 'medal', x: x + 0.5, y: y + 0.5, i: this.medalN++ }); return this; },
    spring(x, y) { this.items.push({ t: 'spring', x: x + 0.5, y: (y == null ? GT : y) }); return this; },
    checkpoint(x) { this.items.push({ t: 'checkpoint', x: x + 0.5, y: GT }); return this; },
    flag(x) { this.flagX = x; this.items.push({ t: 'flag', x: x + 0.5, y: GT }); return this; },
    orb(x, y) { this.orbSpot = { x: x + 0.5, y: y }; return this; },
    sign(x, text) { (this.signs = this.signs || []).push({ x: x + 0.5, t: text }); return this; },
    enemy(t, x, y, o) { const e = Object.assign({ t: t, x: x + 0.5, y: y == null ? GT : y }, o || {}); this.ents.push(e); return this; },
    mover(x, y, w, kind, range, speed, phase) { this.movers.push({ x: x, y: y, w: w, k: kind, r: range || 4, s: speed || 1.2, p: phase || 0 }); return this; },
    cannon(x, y, every, phase) { this.set(x, y, T.CANNON); this.cannons.push({ x: x, y: y, every: every || 3.2, phase: phase || 0 }); return this; },
    build() {
      const o = this.o;
      return {
        id: o.id, world: o.world, name: o.name, desc: o.desc, theme: o.theme, music: o.music || SSL.THEMES[o.theme].music,
        time: o.time || 300, w: this.w, h: H, tiles: this.tiles, blocks: this.blocks, items: this.items, ents: this.ents,
        movers: this.movers, cannons: this.cannons, startX: this.startX, flagX: this.flagX, boss: !!o.boss, orb: this.orbSpot,
        medals: this.medalN, arena: this.arena || null, gates: this.gates || [], signs: this.signs || [],
      };
    },
  };
  SSL.LB = LB;
  const LEVELS = SSL.LEVELS = [];

  /* ======================= 1-1  Sunny Meadow ======================= */
  (function () {
    const b = new LB({ id: 0, w: 214, world: '1-1', theme: 'meadow', time: 320,
      name: { en: 'Sunny Meadow', zh: '阳光草原' }, desc: { en: 'Learn the ropes', zh: '新手教学' } });
    // Tutorial route: comfortable walking jumps; wider running jumps belong in later worlds.
    b.ground(0, 214); b.pit(58, 2); b.pit(98, 2); b.pit(150, 2); b.pit(176, 2);
    b.sign(4, { en: 'Move left / right', zh: '左右移动' }).sign(11, { en: 'A = Jump (hold = higher)', zh: 'A 跳跃（按住更高）' })
      .sign(29.5, { en: 'Stomp from above!', zh: '从上方踩敌人！' }).sign(49, { en: 'Hold B to run', zh: '按住 B 加速跑' });
    // intro blocks
    b.q(14, 9, 'coin').brick(16, 9).q(17, 9, 'power').brick(18, 9).q(19, 9, 'coin');
    b.coins(22, 11, 3).enemy('grumblet', 24).enemy('grumblet', 32).enemy('grumblet', 34);
    b.pipe(27, 2).pipe(38, 2).plat(36, 10, 2).coin(38, 8).coin(39, 8).medal(38, 6);
    b.hidden(45, 8, '1up');
    // first pit + stairs
    b.arc(56, 11, 7, 3).enemy('grumblet', 52);
    b.stairUp(66, 4).stairDown(71, 4).enemy('grumblet', 78).enemy('grumblet', 81);
    b.q(76, 9, 'coin').q(77, 9, 'coin').q(78, 9, 'power').q(79, 9, 'coin');
    b.plat(84, 9, 4).coins(84, 8, 4).brick(90, 9, 'coins', 6).brick(91, 9).brick(92, 9);
    b.checkpoint(94);
    b.arc(96, 11, 8, 3.2);
    // second half: shells and hoppers
    b.enemy('shelly', 108).enemy('shelly', 120, GT, { red: true });
    b.q(114, 9, 'coin').q(115, 9, 'coin').q(116, 9, 'power');
    b.bricks(122, 9, 5).q(124, 5, 'star');
    b.plat(129, 10, 3).plat(133, 8, 3).plat(137, 6, 3).medal(138, 3).coins(129, 9, 3).coins(133, 7, 3);
    b.enemy('hopper', 133).enemy('hopper', 141);
    // No compulsory four-tile wall: a novice who misses the first pipe can still recover from the ground.
    b.pipe(143, 2).pipe(147, 2);
    b.sign(144.5, { en: 'Release A, then jump again', zh: '松开 A，再按可连续跳' });
    // An obvious optional high route keeps the old pipe-top medal reachable.
    b.plat(145, 10, 2);
    b.arc(149, 11, 5, 3);
    b.enemy('shelly', 156).enemy('grumblet', 160).enemy('grumblet', 162).q(160, 9, 'coin').q(161, 9, 'coin');
    b.coins(172, 11, 3);
    b.plat(173, 10, 2).medal(174, 5).arc(174, 11, 5, 3);
    b.stairUp(186, 8).hard(194, 5, 1, 8).enemy('grumblet', 182).enemy('grumblet', 184);
    b.flag(204);
    LEVELS.push(b.build());
  })();

  /* ======================= 1-2  Crystal Caverns ======================= */
  (function () {
    const b = new LB({ id: 1, w: 226, world: '1-2', theme: 'cave', time: 340, music: 'cave',
      name: { en: 'Crystal Caverns', zh: '水晶洞窟' }, desc: { en: 'Bats, spikes and springs', zh: '蝙蝠、尖刺和弹簧' } });
    b.ground(0, 226); b.ceiling(0, 226, 1);
    b.pit(46, 3); b.pit(84, 5); b.pit(118, 6); b.pit(160, 3); b.pit(196, 3);
    b.q(10, 9, 'coin').brick(12, 9).q(13, 9, 'power').brick(14, 9);
    b.coins(18, 12, 4).enemy('grumblet', 20).enemy('grumblet', 26);
    b.sign(25, { en: 'Hold B + A for long jumps', zh: '长距离：按住 B 加速，再按住 A' });
    b.spikes(30, 2).arc(29, 11, 5, 3).spikes(38, 2);
    b.plat(40, 9, 3).coins(40, 8, 3).arc(44, 11, 6, 3);
    b.enemy('bat', 56, 2).enemy('bat', 62, 2);
    // low tunnel: solid rock from the cave roof down to row 10, rows 11-12 stay open (2 tiles tall)
    b.fill(66, 1, 9, 10, T.DIRT);
    b.coins(68, 12, 5).medal(70, 12);
        b.checkpoint(78);
    // pit with moving platform
    b.mover(82, 11, 3, 'h', 2.5, 1.1).coins(83, 9, 3);
    b.spring(90).plat(92, 5, 4).medal(93, 3);
    b.q(96, 9, 'coin').q(97, 9, 'coin').q(98, 9, 'power').q(99, 9, 'coin');
    b.enemy('hopper', 100).enemy('bat', 104, 2).enemy('hopper', 108).enemy('bat', 110, 2);
    b.spikes(112, 3);
    b.mover(117, 11, 3, 'h', 3, 1.3).mover(124, 10, 3, 'v', 2, 1.0, 1.5);
    b.coins(118, 9, 4).coins(125, 5, 3);
    b.enemy('spikeback', 132).enemy('spikeback', 140).enemy('grumblet', 146).enemy('grumblet', 148);
    b.plat(134, 9, 3).plat(138, 7, 3).plat(142, 5, 3).coins(134, 8, 3).coins(138, 6, 3).hidden(143, 2, 'coins');
    b.pipe(150, 2, { chomper: true }).pipe(155, 3, { chomper: true, delay: 1 });
    b.arc(159, 10, 6, 3);
    b.q(166, 9, 'star').brick(168, 9).brick(169, 9);
    b.enemy('bat', 174, 2).enemy('bat', 178, 2).enemy('bat', 182, 2);
    b.spikes(176, 4).spikes(184, 3).arc(188, 11, 6, 3);
    b.mover(195, 11, 3, 'h', 2, 1.4).medal(206, 8);
    b.plat(203, 9, 2).plat(206, 10, 2);
    b.stairUp(208, 5);
    b.flag(218);
    LEVELS.push(b.build());
  })();
})();

(function () {
  'use strict';
  const SSL = window.SSL, T = SSL.T, LB = SSL.LB, LEVELS = SSL.LEVELS, GT = 13;

  /* ======================= 2-1  Dusk Canyon ======================= */
  (function () {
    const b = new LB({ id: 2, w: 232, world: '2-1', theme: 'dusk', time: 340,
      name: { en: 'Dusk Canyon', zh: '黄昏峡谷' }, desc: { en: 'Cannons and canyons', zh: '大炮与峡谷' } });
    b.ground(0, 232); b.pit(40, 3); b.pit(70, 4); b.pit(104, 5); b.pit(138, 4); b.pit(176, 5); b.pit(206, 3);
    b.q(12, 9, 'coin').brick(13, 9).q(14, 9, 'power').brick(15, 9).coins(20, 11, 4).enemy('hopper', 22).enemy('grumblet', 28);
    // cannon tower
    b.hard(33, 11, 1, 2).cannon(33, 10, 3.4).coins(30, 8, 3);
    b.arc(39, 11, 5, 3).enemy('shelly', 47).enemy('shelly', 52, GT, { red: true });
    b.hard(57, 11, 2, 2).hard(61, 9, 2, 4).hard(65, 11, 2, 2).cannon(61, 8, 3).medal(61, 5).coins(57, 10, 2).coins(65, 10, 2);
    b.arc(69, 10, 6, 3.2);
    b.checkpoint(76);
    b.q(80, 9, 'coin').q(81, 9, 'power').q(82, 9, 'coin').enemy('spikeback', 88).enemy('spikeback', 94).enemy('hopper', 98);
    b.mover(103, 11, 3, 'h', 3, 1.2).mover(108, 9, 3, 'v', 2, 1.0).coins(104, 8, 3);
    b.plat(112, 10, 4).medal(113, 6).coins(112, 9, 4);
    b.enemy('wisp', 120, 7).enemy('wisp', 126, 5);
    b.pipe(122, 2, { chomper: true }).pipe(130, 3, { chomper: true, delay: 0.9 });
    b.cannon(134, 10, 3).hard(134, 11, 1, 2).arc(137, 10, 6, 3);
    b.bricks(144, 9, 6).q(146, 5, 'star').enemy('shelly', 152, GT, { wings: true }).enemy('shelly', 158, GT, { wings: true });
    b.stairUp(163, 5).cannon(168, 7, 2.8).hard(168, 8, 1, 5).enemy('grumblet', 172);
    b.mover(175, 11, 3, 'h', 3.5, 1.5).coins(176, 9, 4);
    b.plat(182, 8, 3).plat(187, 6, 3).plat(192, 8, 3).medal(188, 3).coins(182, 7, 3).coins(192, 7, 3);
    b.enemy('hopper', 198).enemy('spikeback', 201).arc(205, 11, 5, 3);
    b.stairUp(212, 7).flag(224);
    LEVELS.push(b.build());
  })();

  /* ======================= 2-2  Frostbite Peaks ======================= */
  (function () {
    const b = new LB({ id: 3, w: 246, world: '2-2', theme: 'snow', time: 360,
      name: { en: 'Frostbite Peaks', zh: '寒霜山巅' }, desc: { en: 'Slippery ice!', zh: '滑溜溜的冰面' } });
    b.ground(0, 246); b.ice(18, 44); b.ice(88, 126); b.ice(160, 200);
    b.pit(52, 4); b.pit(132, 5); b.pit(150, 4); b.pit(204, 4);
    b.q(10, 9, 'coin').q(11, 9, 'power').q(12, 9, 'coin').enemy('grumblet', 14);
    b.enemy('grumblet', 24).enemy('grumblet', 28).enemy('shelly', 34).coins(26, 11, 5).spikes(40, 2);
    b.arc(51, 11, 6, 3.2).enemy('hopper', 58).enemy('hopper', 62);
    b.plat(66, 10, 3).plat(70, 8, 3).plat(74, 6, 3).medal(75, 3).coins(66, 9, 3).coins(70, 7, 3);
    b.checkpoint(80);
    b.pipe(84, 3, { chomper: true });
    b.spikes(94, 2).spikes(100, 3).arc(96, 11, 3, 2).enemy('spikeback', 106).enemy('spikeback', 112);
    b.q(104, 9, 'power').brick(105, 9).brick(106, 9, 'coins', 5);
    b.hard(118, 10, 2, 3).hard(122, 8, 2, 5).medal(122, 5).coins(118, 9, 2);
    b.mover(131, 11, 3, 'h', 3, 1.3).coins(132, 9, 3);
    b.spring(140).plat(142, 4, 3).coins(142, 3, 3).medal(143, 1);
    b.mover(149, 10, 3, 'v', 2.5, 1.0).coins(150, 6, 3);
    b.enemy('shelly', 156, GT, { red: true }).enemy('shelly', 164, GT, { red: true }).enemy('hopper', 172).enemy('hopper', 178);
    b.q(170, 9, 'star').brick(171, 9).brick(172, 9);
    b.spikes(184, 2).spikes(188, 2).spikes(192, 2).coins(184, 9, 10);
    b.enemy('wisp', 190, 6);
    b.arc(203, 11, 6, 3.2);
    b.pipe(212, 2, { chomper: true }).pipe(217, 4, { chomper: true, delay: 1.2 });
    b.stairUp(221, 7).flag(234);
    LEVELS.push(b.build());
  })();

  /* ======================= 3-1  Cloud Garden ======================= */
  (function () {
    const b = new LB({ id: 4, w: 242, world: '3-1', theme: 'sky', time: 340,
      name: { en: 'Cloud Garden', zh: '云端花园' }, desc: { en: "Don't look down", zh: '千万别往下看' } });
    b.ground(0, 16); b.ground(20, 29); b.ground(34, 40);
    b.q(8, 9, 'coin').q(9, 9, 'power').q(10, 9, 'coin').enemy('grumblet', 12);
    b.coins(14, 10, 6, 1).enemy('shelly', 22, GT, { wings: true });
    b.cloud(29, 11, 3).cloud(32, 9, 3);
    b.ground(40, 44).cloud(46, 11, 4).cloud(52, 9, 4).cloud(58, 11, 4).coins(46, 10, 4).coins(52, 8, 4).coins(58, 10, 4);
    b.mover(64, 9, 3, 'h', 4, 1.4).coins(65, 7, 3);
    b.ground(72, 84).checkpoint(74).q(77, 9, 'power').brick(78, 9).brick(79, 9, 'coins', 6).enemy('wisp', 80, 8).enemy('hopper', 82);
    b.cloud(86, 11, 3).cloud(91, 9, 3).cloud(96, 7, 3).cloud(101, 5, 3).medal(102, 2).coins(91, 8, 3).coins(96, 6, 3).medal(97, 4);
    b.enemy('shelly', 98, 4, { wings: true });
    b.ground(106, 120).enemy('grumblet', 110).enemy('grumblet', 113).enemy('shelly', 116);
    b.pipe(117, 3, { chomper: true });
    b.mover(122, 11, 3, 'v', 2.5, 1.0).mover(127, 8, 3, 'v', 2.5, 1.0, 2).mover(132, 9, 3, 'h', 3, 1.3);
    b.coins(123, 7, 3).coins(128, 4, 3).coins(133, 7, 3);
    b.ground(140, 156).q(143, 9, 'star').enemy('hopper', 146).enemy('hopper', 150).enemy('wisp', 152, 6);
    b.cloud(158, 11, 3).cloud(163, 11, 3).cloud(168, 9, 3).cloud(173, 7, 3).cloud(178, 9, 3).cloud(183, 11, 3);
    b.arc(158, 9, 12, 2).medal(174, 3);
    b.enemy('bat', 166, 3).enemy('bat', 176, 2);
    b.ground(188, 204).enemy('shelly', 192, GT, { wings: true }).enemy('shelly', 198, GT, { wings: true });
    b.spikes(194, 2);
    b.cloud(206, 11, 4).cloud(212, 9, 4).cloud(218, 7, 4).coins(206, 10, 4).coins(212, 8, 4).coins(218, 6, 4);
    b.ground(224, 242).stairUp(226, 4).flag(231);
    LEVELS.push(b.build());
  })();

  LB.prototype.pillar = function (x, top, w) { return this.fill(x, top, w || 1, 15 - top, T.HARD); };
  LB.prototype.firebar = function (x, y, len, spd, a0) {
    this.set(x, y, T.HARD);
    this.ents.push({ t: 'firebar', x: x + 0.5, y: y + 0.5, len: len, spd: spd, a0: a0 || 0 }); return this;
  };
  LB.prototype.gate = function (x, y, h) { (this.gates = this.gates || []).push({ x: x, y: y, h: h }); return this; };

  /* ======================= 3-2  Ember Ruins ======================= */
  (function () {
    const b = new LB({ id: 5, w: 250, world: '3-2', theme: 'lava', time: 380,
      name: { en: 'Ember Ruins', zh: '余烬遗迹' }, desc: { en: 'Fire bars over molten rock', zh: '熔岩之上的火棒' } });
    b.ground(0, 250); b.lava(40, 4); b.lava(72, 6); b.lava(106, 5); b.lava(138, 9); b.lava(180, 6); b.lava(214, 4);
    b.q(10, 9, 'coin').q(11, 9, 'power').q(12, 9, 'coin').enemy('grumblet', 16).enemy('grumblet', 19).coins(22, 11, 4);
    b.firebar(30, 8, 3, 1.6);
    b.arc(39, 11, 6, 3).enemy('spikeback', 48).enemy('spikeback', 52);
    b.pillar(58, 11, 1).pillar(62, 9, 1).firebar(60, 6, 3, -1.7).medal(58, 8).medal(64, 6);
    b.mover(71, 11, 3, 'h', 3, 1.3).coins(72, 9, 5);
    b.checkpoint(84);
    b.q(88, 9, 'power').brick(89, 9).brick(90, 9, 'coins', 6).enemy('shelly', 94, GT, { red: true }).enemy('hopper', 98).enemy('hopper', 101);
    b.pillar(108, 11, 1).coins(106, 9, 5).firebar(114, 8, 4, 1.5);
    b.enemy('wisp', 120, 7).enemy('wisp', 126, 5).enemy('grumblet', 124).enemy('grumblet', 128);
    b.q(130, 9, 'star');
    b.mover(137, 11, 3, 'h', 2.5, 1.2).pillar(143, 10, 2).mover(148, 11, 3, 'v', 2.5, 1.1).pillar(152, 10, 2).medal(153, 6);
    b.coins(138, 9, 3).coins(148, 7, 3);
    b.cannon(160, 10, 3).hard(160, 11, 1, 2).enemy('shelly', 166, GT, { wings: true }).enemy('spikeback', 170);
    b.firebar(172, 8, 3, 1.9, 1.5);
    b.arc(179, 10, 8, 3).pillar(183, 11, 1);
    b.stairUp(190, 4).stairDown(195, 4).cannon(199, 10, 2.6).hard(199, 11, 1, 2);
    b.enemy('hopper', 203).enemy('hopper', 206).enemy('bat', 210, 3);
    b.pillar(215, 11, 1).pillar(217, 9, 1).coins(214, 7, 5);
    b.stairUp(226, 7).flag(238);
    LEVELS.push(b.build());
  })();

  /* ======================= 4-1  Moonlit Fortress ======================= */
  (function () {
    const b = new LB({ id: 6, w: 264, world: '4-1', theme: 'castle', time: 400,
      name: { en: 'Moonlit Fortress', zh: '月夜要塞' }, desc: { en: "Drakon's outer walls", zh: '德拉肯的外城墙' } });
    b.ground(0, 264); b.ceiling(0, 264, 2);
    b.lava(44, 4); b.lava(80, 5); b.lava(124, 6); b.lava(170, 7); b.lava(214, 5);
    b.q(8, 9, 'coin').q(9, 9, 'power').q(10, 9, 'coin').enemy('spikeback', 16).enemy('grumblet', 20).enemy('grumblet', 22);
    b.cannon(26, 10, 2.8).hard(26, 11, 1, 3).cannon(30, 8, 3.2, 1).hard(30, 9, 1, 5).coins(27, 11, 3);
    b.firebar(36, 8, 4, 1.5).arc(43, 11, 6, 3);
    b.enemy('wisp', 52, 8).enemy('wisp', 56, 6).enemy('shelly', 60, GT, { red: true }).enemy('spikeback', 64).q(62, 9, 'power');
    b.hard(68, 10, 2, 3).firebar(72, 6, 3, -1.6).medal(68, 7);
    b.mover(79, 11, 3, 'h', 3, 1.3).coins(80, 9, 4);
    b.checkpoint(90);
    b.bricks(94, 9, 6).q(96, 9, 'coin').enemy('hopper', 102).enemy('hopper', 105).enemy('spikeback', 109);
    b.firebar(112, 8, 3, 1.8).firebar(118, 8, 3, -1.8, 1);
    b.pillar(126, 10, 1).pillar(129, 9, 1).pillar(132, 10, 1).coins(126, 8, 7);
    b.enemy('bat', 136, 4).enemy('bat', 140, 3).enemy('bat', 144, 4);
    b.q(138, 9, 'star').cannon(148, 10, 2.4).hard(148, 11, 1, 2).cannon(152, 10, 3.0, 1.2).hard(152, 11, 1, 2);
    b.spikes(156, 3).spikes(162, 3).arc(155, 10, 12, 2);
    b.pillar(171, 10, 1).mover(174, 10, 3, 'v', 2, 1.1).pillar(180, 10, 1).mover(183, 10, 3, 'h', 2.5, 1.4).pillar(189, 10, 2).medal(180, 6).medal(190, 7);
    b.enemy('wisp', 194, 6).enemy('shelly', 198, GT, { wings: true }).enemy('shelly', 202, GT, { wings: true });
    b.firebar(205, 7, 3, 2.0);
    b.pillar(215, 11, 1).pillar(217, 10, 1).pillar(219, 11, 1).coins(214, 8, 6);
    b.cannon(228, 10, 2.2).hard(228, 11, 1, 2);
    b.enemy('spikeback', 232).enemy('spikeback', 236).enemy('hopper', 240);
    b.stairUp(244, 6).flag(252);
    LEVELS.push(b.build());
  })();

  /* ======================= 4-2  Drakon's Keep (boss) ======================= */
  (function () {
    const b = new LB({ id: 7, w: 96, world: '4-2', theme: 'lava', time: 400, boss: true, music: 'castle',
      name: { en: "Drakon's Keep", zh: '德拉肯王座' }, desc: { en: 'Final showdown', zh: '最终决战' } });
    b.ground(0, 96); b.ceiling(0, 96, 2);
    b.lava(30, 3).lava(42, 3);
    b.q(8, 9, 'power').q(9, 9, 'coin').q(10, 9, 'power').enemy('spikeback', 14).enemy('grumblet', 17);
    b.firebar(22, 8, 4, 1.7).coins(28, 9, 5);
    b.pillar(31, 10, 1).checkpoint(36);
    b.pillar(43, 10, 1).medal(43, 7).enemy('wisp', 46, 7).medal(31, 7);
    // arena: tiles 50..74 (25 wide). The gate at 49 closes behind the hero, a wall at 75 closes the far end.
    b.arena = { x0: 49, x1: 75 };
    b.gate(49, 2, 11);
    b.hard(75, 2, 1, 11);
    b.plat(53, 10, 4).plat(67, 10, 4).plat(60, 7, 4).medal(60, 4);
    b.enemy('drakon', 70, GT);
    b.orb(71, 12);
    LEVELS.push(b.build());
  })();
})();
