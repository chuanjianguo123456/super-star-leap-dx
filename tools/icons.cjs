'use strict';
// Renders the app icons (SVG source + 192/512 PNG) with the same Skia canvas used by the tests.
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const OUT = path.join(__dirname, '..', 'icons');

function star(g, cx, cy, ro, ri, rot) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, r = i % 2 ? ri : ro; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath();
}

function draw(g, S) {
  const k = S / 512;
  g.save(); g.scale(k, k);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#2f7bff'); sky.addColorStop(.55, '#59b6ff'); sky.addColorStop(1, '#a9e4ff');
  g.fillStyle = sky; g.beginPath(); g.roundRect ? g.roundRect(0, 0, 512, 512, 0) : g.rect(0, 0, 512, 512); g.fill();
  // sun glow + clouds
  const sun = g.createRadialGradient(430, 90, 10, 430, 90, 150);
  sun.addColorStop(0, 'rgba(255,250,190,.95)'); sun.addColorStop(1, 'rgba(255,250,190,0)');
  g.fillStyle = sun; g.fillRect(280, 0, 232, 260);
  g.fillStyle = 'rgba(255,255,255,.85)';
  [[110, 96, 30], [150, 82, 38], [196, 98, 28], [152, 104, 34]].forEach((c) => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.3); g.fill(); });
  // hills
  g.fillStyle = '#57c96a'; g.beginPath(); g.moveTo(0, 360); g.quadraticCurveTo(120, 250, 250, 350); g.quadraticCurveTo(360, 420, 512, 338); g.lineTo(512, 512); g.lineTo(0, 512); g.closePath(); g.fill();
  // ground
  g.fillStyle = '#a8683a'; g.fillRect(0, 416, 512, 96);
  g.fillStyle = '#5bd06a'; g.fillRect(0, 400, 512, 26);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 400, 512, 6);
  // medal
  const glow = g.createRadialGradient(256, 250, 20, 256, 250, 150);
  glow.addColorStop(0, 'rgba(255,240,150,.85)'); glow.addColorStop(1, 'rgba(255,240,150,0)');
  g.fillStyle = glow; g.fillRect(90, 90, 340, 330);
  g.beginPath(); g.arc(256, 250, 116, 0, 6.3); g.fillStyle = '#ffcf3a'; g.fill();
  g.lineWidth = 14; g.strokeStyle = '#8a4a00'; g.stroke();
  g.beginPath(); g.arc(256, 250, 92, 0, 6.3); g.fillStyle = '#ff9d2e'; g.fill();
  g.save(); g.translate(4, 6); star(g, 256, 250, 78, 34, -Math.PI / 2); g.fillStyle = '#fff6a8'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#8a4a00'; g.stroke(); g.restore();
  g.restore();
}

// SVG version (same artwork, hand-written vectors)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Super Star Leap DX">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7bff"/><stop offset=".55" stop-color="#59b6ff"/><stop offset="1" stop-color="#a9e4ff"/></linearGradient>
    <linearGradient id="medal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset="1" stop-color="#ffb020"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#fff6a8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6a8" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#sky)"/>
  <circle cx="430" cy="90" r="150" fill="url(#glow)" opacity=".45"/>
  <g fill="#fff" opacity=".88"><circle cx="110" cy="96" r="30"/><circle cx="150" cy="82" r="38"/><circle cx="196" cy="98" r="28"/><circle cx="152" cy="104" r="34"/></g>
  <path d="M0 360 Q120 250 250 350 Q360 420 512 338 L512 512 L0 512Z" fill="#57c96a"/>
  <rect y="416" width="512" height="96" fill="#a8683a"/>
  <rect y="400" width="512" height="26" fill="#5bd06a"/>
  <rect y="400" width="512" height="6" fill="#fff" opacity=".35"/>
  <circle cx="256" cy="250" r="150" fill="url(#glow)" opacity=".5"/>
  <circle cx="256" cy="250" r="116" fill="url(#medal)" stroke="#8a4a00" stroke-width="14"/>
  <circle cx="256" cy="250" r="92" fill="#ff9d2e"/>
  <path d="M260 144 L284 213 L358 213 L298 256 L321 324 L260 281 L199 324 L222 256 L162 213 L236 213Z" fill="#fff6a8" stroke="#8a4a00" stroke-width="10" stroke-linejoin="round"/>
</svg>
`;
fs.writeFileSync(path.join(OUT, 'icon.svg'), svg);
for (const size of [192, 512]) {
  const cv = createCanvas(size, size), g = cv.getContext('2d');
  draw(g, size);
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), cv.toBuffer('image/png'));
}
// maskable version: same art with extra padding so Android can crop to a circle
{
  const size = 512, cv = createCanvas(size, size), g = cv.getContext('2d');
  g.fillStyle = '#2f7bff'; g.fillRect(0, 0, size, size);
  g.save(); g.translate(64, 64); g.scale(0.75, 0.75); draw(g, 512); g.restore();
  fs.writeFileSync(path.join(OUT, 'icon-maskable.png'), cv.toBuffer('image/png'));
}
// favicon
{
  const cv = createCanvas(64, 64), g = cv.getContext('2d'); draw(g, 64);
  fs.writeFileSync(path.join(OUT, 'favicon-64.png'), cv.toBuffer('image/png'));
}
console.log('icons written');
