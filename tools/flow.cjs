'use strict';
// Replays planner routes inside the real game state machine (enemies removed) and checks flag -> clear screen -> next level.
const fs = require('fs');
const { load } = require('./harness.cjs');
if (!fs.existsSync('paths.json')) {
  console.log('paths.json missing - running plan.cjs first ...');
  require('child_process').execFileSync(process.execPath, ['plan.cjs'], { stdio: 'inherit' });
}
const paths = JSON.parse(fs.readFileSync('paths.json'));
const H = load({ w: 1280, h: 800, audio: true });
const { SSL, G, els } = H;
const I = SSL.input, DT = SSL.DT;
let script = null;
I.poll = function () {
  const s = script || {};
  ['left', 'right', 'down', 'jump', 'run'].forEach((n) => { I.held[n] = !!s[n]; });
  I.pressed = { jump: !!s.pj, left: false, right: false, down: false, run: false, pause: false }; I.released = {};
};
const idle = { };
let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('  FAIL', m); } };
G.settings.diff = 'normal';
G.newGame(0);
for (let idx = 0; idx <= 6; idx++) {
  check(G.levelIndex === idx, 'level index ' + G.levelIndex + ' expected ' + idx);
  let guard = 0; while (G.state !== 'playing' && guard++ < 400) G.update(DT);
  check(G.state === 'playing', 'reached playing state');
  const w = G.world; w.ents.length = 0; w.cannons.length = 0; w.release = function () {};
  script = idle; for (let i = 0; i < 30; i++) G.update(DT);
  let frames = 0;
  for (const st of paths[idx]) {
    for (let f = 0; f < st.f; f++) {
      script = { left: st.dir < 0, right: st.dir > 0, run: !!st.run, jump: !!st.jump && f < st.hold, pj: !!st.jump && f === 0 };
      G.update(DT); frames++;
      if (G.world.flagHit) break;
    }
    if (G.world.flagHit) break;
  }
  script = idle;
  let sawFlag = !!G.world.flagHit, g2 = 0;
  while (G.state === 'playing' && g2++ < 900) { G.update(DT); sawFlag = sawFlag || !!G.world.flagHit; }
  check(sawFlag, SSL.LEVELS[idx].world + ' flag touched');
  g2 = 0; while (!G.screen && g2++ < 900) G.update(DT);
  const ok = G.screen === 'sc-clear' && G.state === 'clear';
  check(ok, SSL.LEVELS[idx].world + ' clear screen shown (state=' + G.state + ' screen=' + G.screen + ')');
  console.log(SSL.LEVELS[idx].world, ok ? 'cleared' : 'NOT cleared', 'frames', frames, 'score', G.score, 'saved unlocked', G.save.unlocked, 'html:', els.clearStats.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  if (!ok) break;
  els.btnNext.click();
}
console.log('unlocked', G.save.unlocked, 'done', JSON.stringify(G.save.done));
console.log(fails ? fails + ' FAILURES' : 'FLOW OK');
