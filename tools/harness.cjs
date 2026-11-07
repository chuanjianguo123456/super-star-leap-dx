'use strict';
// Headless harness: real Canvas 2D (Skia via @napi-rs/canvas) + a small DOM shim, runs the game's own scripts unchanged.
const fs = require('fs'), path = require('path'), vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');
const ROOT = process.env.SSL_ROOT || path.join(__dirname, '..');

class El {
  constructor(tag, attrs) {
    this.tagName = tag; this.attrs = attrs || {}; this.id = this.attrs.id || ''; this.dataset = {}; this.listeners = {};
    this.children = []; this.style = { setProperty() {} }; this.textContent = ''; this.innerHTML = '';
    this.classes = new Set((this.attrs.class || '').split(/\s+/).filter(Boolean));
    const self = this;
    this.classList = {
      add: (...c) => c.forEach((x) => self.classes.add(x)), remove: (...c) => c.forEach((x) => self.classes.delete(x)),
      toggle: (c, f) => { if (f === undefined) f = !self.classes.has(c); f ? self.classes.add(c) : self.classes.delete(c); return f; },
      contains: (c) => self.classes.has(c),
    };
  }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  removeEventListener() {}
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: 0, height: 0 }; }
  closest() { return null; }
  click() { (this.listeners.click || []).forEach((f) => f({ currentTarget: this, target: this })); }
}

function load(opts) {
  opts = opts || {};
  const W = opts.w || 1280, H = opts.h || 800;
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const els = {}, all = [];
  const tagRe = /<(\w+)([^>]*)>/g; let m;
  while ((m = tagRe.exec(html))) {
    const attrs = {}; const aRe = /([\w:-]+)="([^"]*)"/g; let a;
    while ((a = aRe.exec(m[2]))) attrs[a[1]] = a[2];
    if (m[1] === 'script' || m[1] === 'link' || m[1] === 'meta') continue;
    const e = new El(m[1], attrs); all.push(e); if (attrs.id) els[attrs.id] = e;
  }
  const gameCv = createCanvas(W, H); gameCv.style = {};
  const winL = {}, docL = {};
  const store = {};
  const g = globalThis;
  g.window = g; g.self = g;
  g.innerWidth = W; g.innerHeight = H; g.devicePixelRatio = opts.dpr || 1;
  Object.defineProperty(g, 'navigator', { configurable: true, writable: true, value: { language: opts.lang || 'en-US', maxTouchPoints: opts.touch ? 5 : 0, getGamepads() { return []; }, vibrate() { return true; } } });
  g.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  g.matchMedia = (q) => ({ matches: opts.touch && /coarse/.test(q) });
  g.history = { pushState() {} }; g.location = { protocol: 'file:' };
  g.addEventListener = (t, f) => { (winL[t] = winL[t] || []).push(f); };
  g.removeEventListener = () => {};
  g.requestAnimationFrame = (f) => { g.__raf = f; return 1; };
  const doc = {
    readyState: 'complete', hidden: false, documentElement: new El('html'), body: new El('body'),
    getElementById: (id) => (id === 'game' ? gameCv : els[id] || null),
    querySelectorAll: (sel) => {
      if (sel === '.screen') return all.filter((e) => e.classes.has('screen'));
      if (sel === '.tb') return all.filter((e) => e.classes.has('tb'));
      if (sel === '[data-i18n]') return all.filter((e) => e.attrs['data-i18n']);
      return [];
    },
    createElement: (t) => (t === 'canvas' ? createCanvas(300, 150) : new El(t)),
    addEventListener: (t, f) => { (docL[t] = docL[t] || []).push(f); },
  };
  g.document = doc;
  if (opts.audio) {   // mock WebAudio so synth code paths execute
    const node = () => new Proxy({ gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {}, getChannelData: () => new Float32Array(4096) }, { get: (t, k) => (k in t ? t[k] : undefined) });
    g.AudioContext = function () { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = {}; this.createGain = node; this.createOscillator = node; this.createBiquadFilter = node; this.createBufferSource = node; this.createBuffer = () => ({ getChannelData: () => new Float32Array(4096) }); this.resume = () => {}; this.suspend = () => {}; g.__ac = this; };
  }
  const files = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/js\/[\w]+\.js/g);
  files.forEach((f) => { vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }); });
  const fire = (t, ev) => { ev = Object.assign({ preventDefault() {}, stopPropagation() {} }, ev || {}); (winL[t] || []).concat(docL[t] || []).forEach((f) => f(ev)); };
  return { SSL: g.SSL, G: g.SSL.game, els, all, canvas: gameCv, fire, doc, store, winL, docL };
}

// deep clone preserving prototypes, shared refs and cycles; functions are shared by reference
function clone(o, map) {
  map = map || new Map();
  if (o === null || typeof o !== 'object') return o;
  if (map.has(o)) return map.get(o);
  let c;
  if (ArrayBuffer.isView(o)) { c = o.slice(); map.set(o, c); return c; }
  if (Array.isArray(o)) { c = new Array(o.length); map.set(o, c); for (let i = 0; i < o.length; i++) c[i] = clone(o[i], map); return c; }
  c = Object.create(Object.getPrototypeOf(o)); map.set(o, c);
  for (const k of Object.keys(o)) c[k] = clone(o[k], map);
  return c;
}

function savePng(canvas, file) { fs.writeFileSync(file, canvas.toBuffer('image/png')); }
module.exports = { load, clone, savePng, El };
