/* Smart FCRA PWA service worker — cache the app shell, never cache API/PII. */
const CACHE = 'smart-fcra-shell-v20260820';
const SHELL = ['/', '/manifest.webmanifest', '/static/brand/brand.css', '/static/brand/pwa-icon.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const hit = await cache.match(req);
          return hit || Response.error();
        }
      }),
    );
    return;
  }

  event.respondWith(
    fetch(req).catch(async () => {
      const hit = await caches.match(req);
      return hit || caches.match('/') || new Response('Smart FCRA is offline. Reconnect to continue.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }),
  );
});
