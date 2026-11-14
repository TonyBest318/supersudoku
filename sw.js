// Generated from the entire build, including the puzzle worker.
const PREFIX = 'super-sudoku:' + self.registration.scope;
const CACHE = PREFIX + "5a7987746f670735";
const ASSETS = ["./assets/generator.worker-iTquPWUU.js","./assets/index-BMjp8P5o.css","./assets/index-C_ZLUcge.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon.svg","./icons/maskable-512.png","./index.html","./manifest.webmanifest"];
async function navigationResponse(response) {
  if (!response || !response.redirected) return response;
  // clone() preserves URL/redirect history. A new Response does not.
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(await response.blob(), {
    status: response.status, statusText: response.statusText, headers,
  });
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    const page = await cache.match('./index.html');
    await cache.put('./index.html', await navigationResponse(page));
    // Recover broken Safari clients without requiring the old page to load.
    // Do not reload clients or modify their local game storage.
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      const page = (await cache.match('./index.html')) || await fetch(event.request);
      return navigationResponse(page);
    }
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});
