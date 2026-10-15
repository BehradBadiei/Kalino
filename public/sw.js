const CACHE_NAME = 'kalino-shell-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icons/kalino-icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL);
    const page = await cache.match('/');
    if (page) {
      const html = await page.text();
      const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^\"]+)"/g)].map((match) => match[1].replace(/&amp;/g, '&')))];
      await Promise.allSettled(assets.map((asset) => cache.add(asset)));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('kalino-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) await (await caches.open(CACHE_NAME)).put('/', response.clone());
        return response;
      } catch {
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/fonts/') || url.pathname === '/manifest.webmanifest')) {
      await (await caches.open(CACHE_NAME)).put(request, response.clone());
    }
    return response;
  })());
});
