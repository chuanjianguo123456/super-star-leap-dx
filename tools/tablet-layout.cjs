#!/usr/bin/env node
/*
 * Tablet geometry QA for Super Star Leap DX.
 *
 * This deliberately loads only util.js and tablet.js in a VM.  The control
 * rectangles below mirror the current CSS, including game.js's --pad-bottom
 * calculation and the forgiving hit radius in input.js.  It is a report-only
 * tool: it never edits the game sources.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const utilPath = path.join(ROOT, 'js', 'util.js');
const tabletPath = path.join(ROOT, 'js', 'tablet.js');
const gamePath = path.join(ROOT, 'js', 'game.js');
const inputPath = path.join(ROOT, 'js', 'input.js');
const cssPath = path.join(ROOT, 'css', 'style.css');

function loadGeometry() {
  const window = {};
  const context = vm.createContext({ window, globalThis: window, console });
  vm.runInContext(fs.readFileSync(utilPath, 'utf8'), context, { filename: utilPath });
  vm.runInContext(fs.readFileSync(tabletPath, 'utf8'), context, { filename: tabletPath });
  if (!window.SSL || typeof window.SSL.tabletLayout !== 'function') {
    throw new Error('VM did not expose SSL.tabletLayout');
  }
  return window.SSL;
}

const SSL = loadGeometry();
const EPS = 1e-7;
const MIN_TOUCH = 44;
const MIN_PLAY_H = 180; // tablet.js intentionally clamps the playfield to this.
const dims = [
  [1280, 800], [800, 1280],
  [1024, 768], [768, 1024],
  [1366, 1024], [1024, 1366],
  [1440, 900],
  [320, 568], [360, 640], [412, 915], [600, 960],
  [640, 360], [800, 500], [480, 720],
];
const safeCases = [
  { id: 'none', value: { top: 0, right: 0, bottom: 0, left: 0 } },
  { id: 'symmetric24', value: { top: 24, right: 24, bottom: 24, left: 24 } },
  { id: 'asymmetric', value: { top: 18, right: 32, bottom: 28, left: 12 } },
];
const sizes = ['S', 'M', 'L'];
const padLayouts = ['dock', 'overlay'];
const touches = [false, true];
const handedness = [false, true];
const padHeights = ['low', 'mid', 'high'];

const issueMap = new Map();
const staticRows = [];
let caseCount = 0;
let visibleCaseCount = 0;
let hardDefectCount = 0;
let warningCount = 0;

function fmt(n) {
  return Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : String(n);
}
function label(w, h, settings, touch, safeId) {
  return `${w}x${h} ${settings.tsize}/${settings.padLayout}/${settings.padHeight}` +
    ` touch=${touch} lefty=${settings.lefty} safe=${safeId}`;
}
function issue(code, severity, message, sample) {
  let row = issueMap.get(code);
  if (!row) {
    row = { code, severity, message, count: 0, samples: [] };
    issueMap.set(code, row);
  }
  row.count++;
  if (severity === 'DEFECT') hardDefectCount++;
  else if (severity === 'WARN') warningCount++;
  if (row.samples.length < 4 && sample && !row.samples.includes(sample)) row.samples.push(sample);
}
function checkFinite(value, where, sample) {
  if (!Number.isFinite(value)) issue('non-finite', 'DEFECT', `${where} is not finite`, `${sample} ${where}=${value}`);
}
function close(a, b, tolerance = 1e-6) {
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

/* Exact game.js G.ui formula, with the same CSS-variable rounding. */
function cssPadValues(layout, settings, cssH) {
  const high = settings.padHeight === 'high' ? 1 : settings.padHeight === 'low' ? 0 : 0.5;
  const spare = layout.docked
    ? Math.max(0, cssH - layout.playH - layout.safe.bottom - 162 * layout.touchScale - 12)
    : cssH * 0.08;
  const raw = layout.docked
    ? 10 + Math.min(spare, Math.max(0, layout.touchBottom - 10) + spare * 0.3 * high)
    : layout.touchBottom + spare * high;
  return {
    high,
    spare,
    raw,
    // G.ui writes --tsize toFixed(3) and --pad-bottom toFixed(1).
    size: Number(layout.touchScale.toFixed(3)),
    padBottom: Number(raw.toFixed(1)),
  };
}

function rect(id, x, y, w, h) {
  return { id, x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

/*
 * CSS geometry:
 *   left cluster = 86s + 14s + 86s = 186s
 *   right cluster = max(64s,86s) + 14s + 112s = 212s
 *   right column = 64s + 12s + 86s = 162s
 *   .cluster uses align-items:flex-end, so A is bottom-aligned.
 */
function controlRects(width, height, settings, layout, pad) {
  const s = pad.size;
  const edge = layout.touchEdge;
  const safe = layout.safe;
  const bottom = height - pad.padBottom - safe.bottom;
  const leftClusterX = safe.left + edge;
  const rightClusterX = width - safe.right - edge - 212 * s;
  const moveX = settings.lefty ? width - safe.right - edge - 186 * s : leftClusterX;
  const actionX = settings.lefty ? leftClusterX : rightClusterX;
  const moveY = bottom - 86 * s;
  const downSize = Math.max(44, 64 * s);
  const actionY = bottom - downSize - 98 * s;

  // Handedness swaps clusters, but left/right direction remains spatially natural.
  const leftX = moveX;
  const rightX = moveX + 100 * s;
  const controls = [
    rect('bLeft', leftX, moveY, 86 * s, 86 * s),
    rect('bRight', rightX, moveY, 86 * s, 86 * s),
    rect('bDown', actionX + (86 * s - downSize) / 2, actionY, downSize, downSize),
    rect('bRun', actionX, bottom - 86 * s, 86 * s, 86 * s),
    // The .big A is align-items:flex-end in the parent cluster.
    rect('bJump', actionX + 100 * s, bottom - 112 * s, 112 * s, 112 * s),
  ];
  return {
    controls,
    moveCluster: { x: moveX, y: moveY, w: 186 * s, h: 86 * s },
    actionCluster: { x: actionX, y: actionY, w: 212 * s, h: downSize + 98 * s },
    bottom,
    size: s,
  };
}

function checkRect(rectangle, width, height, layout, sample, visible) {
  ['x', 'y', 'w', 'h'].forEach((k) => checkFinite(rectangle[k], `${rectangle.id}.${k}`, sample));
  if (rectangle.x < -EPS || rectangle.y < -EPS ||
      rectangle.x + rectangle.w > width + EPS || rectangle.y + rectangle.h > height + EPS) {
    issue('outside-viewport', 'DEFECT', 'A control rectangle leaves the CSS viewport',
      `${sample} ${rectangle.id}=${fmt(rectangle.x)},${fmt(rectangle.y)},${fmt(rectangle.w)},${fmt(rectangle.h)}`);
  }
  const safe = layout.safe;
  if (rectangle.x < safe.left - EPS || rectangle.x + rectangle.w > width - safe.right + EPS ||
      rectangle.y + rectangle.h > height - safe.bottom + EPS) {
    issue('safe-inset-intrusion', 'DEFECT', 'A control rectangle enters a horizontal/bottom safe inset',
      `${sample} ${rectangle.id} safe=${fmt(safe.left)},${fmt(safe.right)},${fmt(safe.bottom)}`);
  }
  if (rectangle.y < safe.top - EPS) {
    issue('safe-top-intrusion', 'WARN', 'A control reaches above the top safe inset (stress-only review)',
      `${sample} ${rectangle.id}.top=${fmt(rectangle.y)} safeTop=${fmt(safe.top)}`);
  }
  if (visible && Math.min(rectangle.w, rectangle.h) < MIN_TOUCH - EPS) {
    issue('small-touch-target', 'WARN', `A visible control is smaller than ${MIN_TOUCH}px`,
      `${sample} ${rectangle.id}=${fmt(rectangle.w)}x${fmt(rectangle.h)}`);
  }
}

function checkCrossHitOverlap(rectangles, sample) {
  const move = rectangles.filter((r) => r.id === 'bLeft' || r.id === 'bRight');
  const action = rectangles.filter((r) => r.id === 'bDown' || r.id === 'bRun' || r.id === 'bJump');
  let nearest = null;
  move.forEach((a) => action.forEach((b) => {
    // input.js uses width / 2 * 1.2 as the forgiving hit radius.
    const clearance = Math.hypot(a.cx - b.cx, a.cy - b.cy) - (a.w * 0.6 + b.w * 0.6);
    if (!nearest || clearance < nearest.clearance) nearest = { a, b, clearance };
  }));
  if (nearest && nearest.clearance < -EPS) {
    issue('hit-radius-overlap', 'DEFECT',
      'Left/right control hit regions overlap using input.js 1.2x radius',
      `${sample} ${nearest.a.id}/${nearest.b.id} clearance=${fmt(nearest.clearance)}`);
  }
  return nearest;
}

function expectedDocked(width, height, settings, touch) {
  const portrait = height > width * 1.1;
  return portrait || (touch && settings.padLayout !== 'overlay' && height >= 500);
}

function runGeometry() {
  for (const [width, height] of dims) {
    for (const safeCase of safeCases) {
      for (const tsize of sizes) {
        for (const padLayout of padLayouts) {
          for (const touch of touches) {
            for (const lefty of handedness) {
              for (const padHeight of padHeights) {
                const settings = { tsize, padLayout, lefty, padHeight };
                const sample = label(width, height, settings, touch, safeCase.id);
                const layout = SSL.tabletLayout(width, height, settings, touch, safeCase.value);
                caseCount++;
                if (touch) visibleCaseCount++;
                const values = [layout.cssW, layout.cssH, layout.playH, layout.scale, layout.viewW,
                  layout.touchScale, layout.touchEdge, layout.touchBottom, layout.infoWidth];
                values.forEach((v, i) => checkFinite(v, `layout[${i}]`, sample));
                ['top', 'right', 'bottom', 'left'].forEach((k) => checkFinite(layout.safe[k], `safe.${k}`, sample));

                const portrait = height > width * 1.1;
                if (layout.portrait !== portrait) {
                  issue('portrait-mismatch', 'DEFECT', 'portrait flag disagrees with tablet.js threshold', sample);
                }
                if (layout.docked !== expectedDocked(width, height, settings, touch)) {
                  issue('dock-mismatch', 'DEFECT', 'docked flag disagrees with tablet.js rule', sample);
                }
                if (layout.playH < MIN_PLAY_H - EPS || layout.playH > height + EPS) {
                  issue('playfield-height', 'DEFECT', `playH must stay in [${MIN_PLAY_H}, H]`,
                    `${sample} playH=${fmt(layout.playH)}`);
                }
                const expectedScale = layout.playH / (SSL.VH * SSL.TS);
                const expectedViewW = width / layout.scale;
                if (!close(layout.scale, expectedScale) || !close(layout.viewW, expectedViewW) ||
                    !close(layout.viewW * layout.scale, width)) {
                  issue('aspect-view', 'DEFECT', 'viewW/scale does not preserve the CSS viewport aspect',
                    `${sample} scale=${fmt(layout.scale)} viewW=${fmt(layout.viewW)} expected=${fmt(expectedViewW)}`);
                }

                const pad = cssPadValues(layout, settings, height);
                checkFinite(pad.spare, 'pad.spare', sample);
                checkFinite(pad.raw, 'pad.raw', sample);
                checkFinite(pad.size, 'CSS --tsize', sample);
                checkFinite(pad.padBottom, 'CSS --pad-bottom', sample);
                const controls = controlRects(width, height, settings, layout, pad);
                controls.controls.forEach((r) => checkRect(r, width, height, layout, sample, touch));

                const top = Math.min(...controls.controls.map((r) => r.y));
                if (layout.docked && top < layout.playH + 2 - EPS) {
                  issue('dock-control-top', 'DEFECT', 'Docked controls are not below the playfield with 2px clearance',
                    `${sample} top=${fmt(top)} playH=${fmt(layout.playH)}`);
                }
                if (touch) checkCrossHitOverlap(controls.controls, sample);
              }
            }
          }
        }
      }
    }
  }
}

function runDprChecks() {
  const raws = [0.5, 1, 1.25, 1.5, 2, 3, 4];
  let checks = 0;
  for (const [width, height] of dims) {
    for (const raw of raws) {
      let dpr = SSL.clamp(raw || 1, 1, 2);
      while (width * height * dpr * dpr > 4.0e6 && dpr > 1) dpr -= 0.25;
      checks++;
      if (!Number.isFinite(dpr) || dpr < 1 - EPS || dpr > 2 + EPS) {
        issue('dpr-bound', 'DEFECT', 'G.resize DPR clamp escaped [1,2]', `${width}x${height} raw=${raw} dpr=${dpr}`);
      }
      if (width * height * dpr * dpr > 4.0e6 + EPS) {
        issue('dpr-canvas-budget', 'DEFECT', 'G.resize DPR reduction exceeded the 4MP canvas budget',
          `${width}x${height} raw=${raw} dpr=${dpr}`);
      }
    }
  }
  return checks;
}

function staticReview() {
  const css = fs.readFileSync(cssPath, 'utf8');
  const game = fs.readFileSync(gamePath, 'utf8');
  const input = fs.readFileSync(inputPath, 'utf8');
  const checks = [
    ['page overflow hidden', /html,body\{[^}]*overflow:hidden/.test(css), 'html/body keeps the page from scrolling'],
    ['fixed app viewport', /#app\{position:fixed;inset:0/.test(css), '#app is fixed to the viewport'],
    ['safe-area env vars', /--sat:env\(safe-area-inset-top,0px\).*--sar:env\(safe-area-inset-right,0px\).*--sab:env\(safe-area-inset-bottom,0px\).*--sal:env\(safe-area-inset-left,0px\)/.test(css), 'root safe-area variables exist'],
    ['app safe vars', /#app\{--safe-top:env\(safe-area-inset-top,0px\);--safe-right:env\(safe-area-inset-right,0px\);--safe-bottom:env\(safe-area-inset-bottom,0px\);--safe-left:env\(safe-area-inset-left,0px\)\}/.test(css), 'game.js reads matching app safe vars'],
    ['control safe edges', /\.cluster\.left\{left:calc\(var\(--pad-edge\) \+ var\(--sal\)\)\}/.test(css) && /\.cluster\.right\{right:calc\(var\(--pad-edge\) \+ var\(--sar\)\)\}/.test(css), 'left/right clusters consume horizontal safe insets'],
    ['control safe bottom', /\.cluster,.cluster\.left,.cluster\.right\{bottom:calc\(var\(--pad-bottom\) \+ var\(--sab\)\)\}/.test(css), 'clusters consume bottom safe inset'],
    ['screens scroll vertically', /\.screen\{[^}]*overflow-x:hidden;overflow-y:auto/.test(css), 'menus can scroll without page-level overflow'],
    ['panels scroll', /\.panel\{[^}]*overflow:auto/.test(css), 'long settings/help panels are scrollable'],
    ['level grid scroll', /#grid\{[^}]*overflow-y:auto/.test(css), 'level grid is scrollable'],
    ['G.ui pad formula present', /const spare = layout\.docked/.test(game) && /layout\.touchBottom/.test(game) && /--pad-bottom/.test(game), 'runtime writes the tested pad-bottom formula'],
    ['hit radius source', /r\.width \/ 2 \* 1\.2/.test(input), 'test uses input.js forgiving hit radius'],
  ];
  checks.forEach(([name, ok, detail]) => {
    staticRows.push({ name, ok, detail });
    if (!ok) issue('static-' + name.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), 'DEFECT', `Static CSS/JS check failed: ${name}`, detail);
  });
  // This is a review note, not a failure: nested scroll surfaces are deliberate.
  staticRows.push({ name: 'nested scroll review', ok: true,
    detail: 'screen + panel/grid overflow-y scrolling is intentional; verify touch-action pan-y on real devices' });
    // The current CSS has an explicit min-size clamp on .tb.sm.
  const smallRule = css.match(/\.tb\.sm\{([^}]*)\}/);
  const hasSmallClamp = !!(smallRule && /min-(?:width|height)|clamp\(/.test(smallRule[1]));
    staticRows.push({ name: 'small-button clamp', ok: hasSmallClamp,
    detail: hasSmallClamp ? 'a .tb.sm minimum/clamp is present' : 'no .tb.sm min-size/clamp; 64px * --tsize is used' });
  if (!hasSmallClamp) {
    issue('small-button-no-clamp', 'WARN', 'CSS has no explicit minimum/clamp for the 64px down button',
      '.tb.sm is only 64px * --tsize; small split widths can fall below 44px');
  }
}

function printReport(dprChecks) {
  const issues = Array.from(issueMap.values());
  const defects = issues.filter((r) => r.severity === 'DEFECT');
  const warnings = issues.filter((r) => r.severity === 'WARN');
  console.log('Tablet layout QA (VM util.js + tablet.js)');
  console.log(`Cases: ${caseCount} total, ${visibleCaseCount} touch-visible; DPR checks: ${dprChecks}`);
  console.log(`Matrix: ${dims.length} sizes x ${safeCases.length} safe sets x ${sizes.length} sizes x ` +
    `${padLayouts.length} layouts x ${touches.length} touch x ${handedness.length} handed x ${padHeights.length} heights`);
  console.log('');
  console.log('Static review:');
  staticRows.forEach((row) => console.log(`  ${row.ok ? 'PASS' : 'FAIL'} ${row.name}: ${row.detail}`));
  console.log('');
  if (!issues.length) {
    console.log('RESULT: PASS (no geometry or static-review issues)');
    return;
  }
  console.log('Findings:');
  issues.forEach((row) => {
    console.log(`  ${row.severity} ${row.code} (${row.count} cases): ${row.message}`);
    row.samples.forEach((s) => console.log(`    - ${s}`));
  });
  console.log('');
  console.log(`RESULT: ${defects.length ? 'DEFECTS FOUND' : 'PASS WITH WARNINGS'}; ` +
    `${defects.length} defect categories, ${warnings.length} warning categories; ` +
    `${hardDefectCount} defect hits, ${warningCount} warning hits.`);
}

runGeometry();
const dprChecks = runDprChecks();
staticReview();
printReport(dprChecks);

// The QA command is useful in CI even when findings are warnings; fail only on
// invariant/layout defects, not on the documented 44px guideline warning.
process.exitCode = Array.from(issueMap.values()).some((r) => r.severity === 'DEFECT') ? 1 : 0;
