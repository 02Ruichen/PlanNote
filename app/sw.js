/* PlanNote Service Worker · 离线可用 */
const CACHE = 'plannote-v2.1.0';
const SHELL = [
  './',
  './index.html',
  './app.html',
  './manifest.webmanifest',
  './assets/landing.css',
  './assets/theme.css',
  './assets/db.js',
  './assets/report.js',
  './assets/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // 只接管同源静态资源，API 请求直连
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
