import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

async function filesAt(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesAt(join(dir, entry.name)) : [join(dir, entry.name)]));
  return nested.flat();
}
const files = (await filesAt('dist')).filter(file => !file.endsWith('/sw.js')).sort();
const hash = createHash('sha256');
// Worker-only fixes must also invalidate the precache version.
hash.update(await readFile(new URL(import.meta.url)));
for (const file of files) hash.update(file).update(await readFile(file));
const version = hash.digest('hex').slice(0, 16);
const assets = files.map(file => './' + file.slice('dist/'.length));
const source = `// Generated from the entire build, including the puzzle worker.
const PREFIX = 'super-sudoku:' + self.registration.scope;
const CACHE = PREFIX + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
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
`;
await writeFile('dist/sw.js', source);
console.log(`PWA: precached ${assets.length} assets (${version})`);
