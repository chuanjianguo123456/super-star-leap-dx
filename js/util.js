/* Super Star Leap DX - util: constants, helpers, storage, i18n */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const SSL = G.SSL = G.SSL || {};

  SSL.TS = 32;          // tile size in world units
  SSL.VH = 15;          // view height in tiles
  SSL.DT = 1 / 60;      // fixed simulation step
  SSL.VERSION = '1.1.0-tablet';

  SSL.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  SSL.lerp = (a, b, t) => a + (b - a) * t;
  SSL.sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
  SSL.approach = (v, target, step) =>
    v < target ? Math.min(v + step, target) : Math.max(v - step, target);
  SSL.ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    bounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };

  SSL.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  // ---------- persistent storage (safe when localStorage is blocked) ----------
  const mem = {};
  SSL.store = {
    get(k, d) {
      try { const v = G.localStorage.getItem('ssldx:' + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return k in mem ? mem[k] : d; }
    },
    set(k, v) {
      mem[k] = v;
      try { G.localStorage.setItem('ssldx:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    },
    del(k) {
      delete mem[k];
      try { G.localStorage.removeItem('ssldx:' + k); } catch (e) { /* ignore */ }
    },
  };

  // ---------- i18n ----------
  const S = {
    en: {
      tagline: 'Run, stomp and leap through 8 handcrafted levels. Collect Star Medals, grab power-ups and beat Drakon!',
      play: 'Play', levels: 'Levels', settings: 'Settings', back: 'Back',
      hint: 'Touch: A jump (hold = higher) / B run + fireball / D-pad move.  Keyboard: arrows or WASD, Z/Space jump, X/Shift run, P pause.',
      paused: 'Paused', resume: 'Resume', restart: 'Restart level', quit: 'Level select',
      clear: 'Level Clear!', next: 'Next level', gameover: 'Game Over', retry: 'Try again',
      endTitle: 'You did it!', endText: 'Drakon is defeated and the kingdom is safe. Thanks for playing!',
      rotateHint: 'Tip: landscape gives a much bigger view',
      reset: 'Erase save', resetAsk: 'Tap again to erase all progress',
      sfx: 'Sound effects', music: 'Music', touch: 'Touch controls', touchSize: 'Touch size',
      lefty: 'Left-handed layout', lang: 'Language', shake: 'Screen shake', vib: 'Vibration', sfxVol: 'SFX volume', musVol: 'Music volume', fps: 'Show FPS',
      diff: 'Difficulty', auto: 'Auto', on: 'On', off: 'Off', small: 'S', medium: 'M', large: 'L',
      casual: 'Casual', normal: 'Normal', hard: 'Hard', langAuto: 'Auto', langEn: 'English', langZh: '中文',
      world: 'World', score: 'Score', coins: 'Coins', time: 'Time', lives: 'Lives', medals: 'Star Medals',
      timeBonus: 'Time bonus', clearTime: 'Clear time', fastest: 'Fastest', newRecord: 'New record!', best: 'Best', locked: 'Locked', newBest: 'New best!', levelScore: 'Level score',
      checkpoint: 'Checkpoint!', oneUp: '1UP!', gotStar: 'Star Medal!', hurryUp: 'Hurry up!',
      bossHint: 'Stomp Drakon or burn him with fireballs!', bossRage: 'Drakon is furious!', getReady: 'Get ready!',
      cMushroom: 'Super!', cFire: 'Fire power!', cStar: 'Starlight!',
      fullscreen: 'Fullscreen', pause: 'Pause', installed: 'Works offline once loaded',
      controls: 'How to play', tabletBadge: 'TABLET EDITION · landscape / portrait · multi-touch',
      tabletReady: 'TWO-HAND PLAY', tabletPadHint: 'A · jump   B · run / fire   ▼ + A · drop',
      padLayout: 'Landscape controls', dock: 'Separate deck', overlay: 'Over game',
      padOpacity: 'Button opacity', padHeight: 'Controls height', low: 'Low', mid: 'Mid', high: 'High',
      jump: 'Jump', runFire: 'Run / fire', down: 'Down / pound', left: 'Move left', right: 'Move right',
      helpTouchTitle: 'Two thumbs, three actions', helpTouch: 'Move with ◀ ▶ on the left. Hold A to jump higher. Hold B to sprint; with fire power, B also shoots. You can hold move + B + A together using separate fingers. Slide the left thumb to change direction.',
      helpMovesTitle: 'Extra moves', helpMoves: 'Press ▼ in mid-air to ground-pound. Press ▼ + A to drop through thin platforms. Stomp enemies from above, but avoid spikes. A checkpoint lets you respawn nearer after losing a life.',
      helpTabletTitle: 'Make it fit your tablet', helpTablet: 'Landscape uses a separate control deck by default, so buttons do not hide the ground. Settings can switch to overlay, change size, opacity, height or handedness. Portrait and split-screen adapt automatically. Rotation and leaving the app pause safely; tap Resume to continue. Fullscreen follows your device rotation setting.',
      helpKeysTitle: 'Keyboard and controller', helpKeys: 'Arrows / WASD: move. Z / Space / K: jump. X / Shift / J: run or fire. P / Esc: pause and resume, F: fullscreen. Controller: left stick / D-pad, A jump, B run, Start pause and resume.',
    },
    zh: {
      tagline: '跑、踩、跳，闯过 8 个精心设计的关卡。收集星星勋章、拿到强化道具，击败大龙德拉肯！',
      play: '开始游戏', levels: '选择关卡', settings: '设置', back: '返回',
      hint: '触屏：A 跳跃（按住跳更高）/ B 加速与发火球 / 方向键移动。键盘：方向键或 WASD，Z/空格 跳，X/Shift 加速，P 暂停。',
      paused: '已暂停', resume: '继续', restart: '重玩本关', quit: '选关',
      clear: '过关！', next: '下一关', gameover: '游戏结束', retry: '再试一次',
      endTitle: '通关啦！', endText: '德拉肯被击败，王国恢复和平。感谢游玩！',
      rotateHint: '提示：横屏游玩视野更大',
      reset: '清除存档', resetAsk: '再点一次确认清除全部进度',
      sfx: '音效', music: '音乐', touch: '触屏按键', touchSize: '按键大小',
      lefty: '左手布局', lang: '语言', shake: '屏幕震动', vib: '手机震动', sfxVol: '音效音量', musVol: '音乐音量', fps: '显示帧率',
      diff: '难度', auto: '自动', on: '开', off: '关', small: '小', medium: '中', large: '大',
      casual: '轻松', normal: '普通', hard: '困难', langAuto: '自动', langEn: 'English', langZh: '中文',
      world: '世界', score: '得分', coins: '金币', time: '时间', lives: '生命', medals: '星星勋章',
      timeBonus: '时间奖励', clearTime: '通关用时', fastest: '最快', newRecord: '新纪录！', best: '最佳', locked: '未解锁', newBest: '新纪录！', levelScore: '本关得分',
      checkpoint: '存档点！', oneUp: '加一条命！', gotStar: '获得星星勋章！', hurryUp: '快点！',
      bossHint: '踩德拉肯的头，或者用火球烧他！', bossRage: '德拉肯暴怒了！', getReady: '准备！',
      cMushroom: '变大！', cFire: '火焰力量！', cStar: '无敌星光！',
      fullscreen: '全屏', pause: '暂停', installed: '加载后可离线游玩',
      controls: '操作说明', tabletBadge: '平板适配版 · 横竖屏自适应 · 多指同按',
      tabletReady: '双手畅玩', tabletPadHint: 'A 跳跃　B 加速 / 火球　▼ + A 下穿',
      padLayout: '横屏操作区', dock: '独立面板', overlay: '悬浮按键',
      padOpacity: '按键透明度', padHeight: '按键位置', low: '靠下', mid: '居中', high: '靠上',
      jump: '跳跃', runFire: '加速 / 火球', down: '下蹲 / 下砸', left: '向左移动', right: '向右移动',
      helpTouchTitle: '双手操作，可多指同按', helpTouch: '左手 ◀ ▶ 移动；右手 A 跳跃，按住跳得更高。B 按住加速，获得火焰力量后也能发火球。移动、B、A 可以用不同手指同时按住；左手滑动可切换方向。',
      helpMovesTitle: '进阶动作', helpMoves: '空中按 ▼ 下砸；▼ + A 穿过薄平台。从上方踩敌人，避开带刺的目标。经过检查点后，失去一条命会从附近重新出发。',
      helpTabletTitle: '适合自己的平板布局', helpTablet: '横屏默认将按键放在独立面板，不遮挡地面。设置中可切换悬浮按键，并调整大小、透明度、位置和左手布局。竖屏与分屏自动适配；旋转屏幕或切到后台会安全暂停，点“继续”再玩。全屏尊重设备自动旋转设置，不强制锁横屏。',
      helpKeysTitle: '键盘与手柄', helpKeys: '方向键 / WASD 移动，Z / 空格 / K 跳跃，X / Shift / J 加速或发火球，P / Esc 暂停与继续，F 全屏。手柄：左摇杆 / 方向键移动，A 跳，B 加速，Start 暂停与继续。',
    },
  };
  SSL.lang = 'en';
  SSL.setLang = function (pref) {
    let l = pref;
    if (!l || l === 'auto') {
      const nav = (G.navigator && (G.navigator.language || '')) || 'en';
      l = /^zh/i.test(nav) ? 'zh' : 'en';
    }
    SSL.lang = S[l] ? l : 'en';
    if (G.document && G.document.documentElement) G.document.documentElement.lang = SSL.lang;
  };
  SSL.t = (k) => (S[SSL.lang] && S[SSL.lang][k]) || S.en[k] || k;
  SSL.pick = (o) => (o && (o[SSL.lang] || o.en)) || '';
  SSL.pad = (n, w) => String(Math.max(0, Math.floor(n))).padStart(w, '0');
})();
