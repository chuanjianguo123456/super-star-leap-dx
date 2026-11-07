/* Super Star Leap DX - service worker.
   Stale-while-revalidate: the game loads from cache (works offline) and the cache is refreshed in the background.
   The cache name is versioned whenever code/assets change, including the tablet layout module. */
const CACHE = 'ssl-dx-v1.1.1-playability';
const FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/util.js',
  './js/tablet.js',
  './js/audio.js',
  './js/input.js',
  './js/gfx_bg.js',
  './js/gfx_sprites.js',
  './js/gfx_items.js',
  './js/levels.js',
  './js/entities.js',
  './js/world.js',
  './js/actors.js',
  './js/boss.js',
  './js/sim.js',
  './js/sim2.js',
  './js/game.js',
  './js/render.js',
  './js/main.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ssl-dx-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(async (res) => {
      if (res && res.status === 200) { try { await cache.put(req, res.clone()); } catch (err) { /* storage full: gameplay still works */ } }
      return res;
    }).catch(() => null);
    e.waitUntil(net);
    return hit || (await net) || (req.mode === 'navigate' ? await cache.match('./index.html') : null) || Response.error();
  }));
});
