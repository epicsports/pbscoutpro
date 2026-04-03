// Service Worker — offline-first cache strategy for PbScoutPro
const CACHE_NAME = 'pbscoutpro-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './PBScoutPRO.png',
];

// Install — precache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for navigation & API, cache-first for assets
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (Firestore, analytics, etc.)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // JS/CSS/image assets — cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    e.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return resp;
        })
      )
    );
    return;
  }

  // HTML navigation — network-first with cache fallback
  e.respondWith(
    fetch(request)
      .then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        return resp;
      })
      .catch(() => caches.match(request))
  );
});
