/* Optional browser QA: load with fetch('tools/browser-tablet.js'), then await SSLTabletQA(). */
window.SSLTabletQA = async function (sizes) {
  const results = [];
  for (const [width, height] of (sizes || [[1280,800],[800,1280],[1024,768],[768,1024],[600,960],[800,500],[640,360],[320,568]])) {
    const frame = document.createElement('iframe');
    Object.assign(frame.style, { position: 'fixed', left: '-20000px', top: '0', width: width + 'px', height: height + 'px', border: '0' });
    const ready = new Promise((resolve, reject) => { frame.onload = resolve; frame.onerror = reject; });
    frame.src = (window.SSLTabletQABase || './index.html') + '?tablet-qa=' + width + 'x' + height;
    document.body.appendChild(frame);
    try {
      await ready;
      const win = frame.contentWindow, doc = win.document, G = win.SSL.game;
      const fails = [], rects = [];
      const bad = (ok, msg) => { if (!ok) fails.push(msg); };
      for (const size of ['S', 'M', 'L']) for (const lefty of [false, true]) for (const mode of ['dock', 'overlay']) {
        Object.assign(G.settings, { touch: 'on', tsize: size, lefty, padLayout: mode }); G.applySettings();
        G.newGame(0); G.state = 'playing'; G.show(null);
        const list = [...doc.querySelectorAll('.tb')].map(e => ({ id: e.id, ...e.getBoundingClientRect().toJSON() }));
        const tag = size + '/' + lefty + '/' + mode;
        const leftKey=list.find(b=>b.id==='bLeft'), rightKey=list.find(b=>b.id==='bRight');
        bad(leftKey.x < rightKey.x, tag + ': left/right direction order reversed');
        for (const b of list) {
          bad(b.width >= 43.9 && b.height >= 43.9, tag + ': touch target below 44px ' + b.id);
          bad(b.left >= -0.5 && b.right <= width + 0.5 && b.top >= -0.5 && b.bottom <= height + 0.5, tag + ': clipped ' + b.id);
          if (G.layout.docked) bad(b.top >= G.playH - 0.5, tag + ': overlays playfield ' + b.id);
        }
        for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
          const A=list[a], B=list[b];
          bad(!(A.left < B.right && A.right > B.left && A.top < B.bottom && A.bottom > B.top), tag + ': overlap ' + A.id + '/' + B.id);
        }
        if (size === 'M' && !lefty && mode === 'dock') rects.push({ playH: G.playH, buttons: list });
      }
      for (const screen of ['sc-title','sc-settings','sc-help','sc-select','sc-pause']) {
        if (screen === 'sc-settings') { G.toMenu('sc-title'); doc.getElementById('btnSettings').click(); }
        else if (screen === 'sc-select') { doc.getElementById('btnLevels').click(); }
        else G.show(screen);
        const el=doc.getElementById(screen), back=el.querySelector('.menu button');
        bad(doc.documentElement.scrollWidth <= width + 1, screen + ': page horizontal overflow');
        bad(el.scrollWidth <= width + 1, screen + ': screen horizontal overflow');
        el.scrollTop=el.scrollHeight;
        if (back) { const r=back.getBoundingClientRect(); bad(r.top >= -1 && r.bottom <= height+1, screen + ': bottom action unreachable'); }
      }
      results.push({ width, height, fails, rects });
      win.SSL.audio.stopMusic(); win.SSL.audio.suspend();
    } catch (error) { results.push({ width, height, error: String(error) }); }
    finally { frame.remove(); }
  }
  return results;
};
