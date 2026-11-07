/* Tablet layout is pure geometry: CSS pixels in, a safe playfield and reachable controls out. */
(function () {
  'use strict';
  const SSL = window.SSL;
  SSL.tabletLayout = function (width, height, settings, touch, insets) {
    const s = settings || {}, safe = Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, insets || {});
    const W = Math.max(240, Math.floor(width)), H = Math.max(200, Math.floor(height));
    Object.keys(safe).forEach((k) => { safe[k] = SSL.clamp(Number(safe[k]) || 0, 0, Math.min(W, H) / 4); });
    const portrait = H > W * 1.1;
    const edge = Math.round(SSL.clamp(W * 0.025, W < 480 ? 8 : 12, 32));
    const bottom = Math.round(portrait ? SSL.clamp(H * 0.05, 24, 64) : SSL.clamp(H * 0.025, 12, 24));
    const base = { S: 0.8, M: 1, L: 1.25 }[s.tsize] || 1;
    const fit = Math.max(0.5, (W - safe.left - safe.right - edge * 2 - 20) / 398);
    let size = Math.min(Math.max(0.70, base * SSL.clamp(Math.min(W, H) / 680, 0.85, 1.3)), fit);
    const docked = portrait || (touch && s.padLayout !== 'overlay' && H >= 500);
    let playH = H;
    if (portrait) playH = Math.min(Math.round(W * 0.75), H - Math.ceil(162 * size + bottom + safe.bottom + 44));
    else if (docked) {
      size = Math.min(size, Math.max(0.5, (H * 0.45 - bottom * 2 - safe.bottom - 14) / 162));
      playH = H - Math.ceil(162 * size + bottom * 2 + safe.bottom + 14);
    }
    playH = Math.max(Math.min(180, H), Math.min(H, playH));
    const infoWidth = portrait ? W - safe.left - safe.right - 40 : Math.max(120, W - safe.left - safe.right - 2 * edge - 398 * size - 28);
    return { cssW: W, cssH: H, safe: safe, portrait: portrait, docked: docked, playH: playH,
      scale: playH / (SSL.VH * SSL.TS), viewW: W * (SSL.VH * SSL.TS) / playH,
      touchScale: size, touchEdge: edge, touchBottom: bottom, infoWidth: infoWidth };
  };
})();
