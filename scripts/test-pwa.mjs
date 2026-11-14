import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

const scope = 'https://sudoku.example/';
const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
const worker = await readFile('dist/sw.js', 'utf8');
test('install manifest and all required icon files are present', async () => {
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  for (const icon of manifest.icons) {
    const data = await readFile(`dist/${icon.src}`);
    assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a');
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
  }
  await access('dist/icons/apple-touch-icon.png');
});

test('service worker precaches app and generator, serves offline, and cleans only its own old cache', async () => {
  const handlers = {};
  const stores = new Map([
    ['unrelated-app-cache', new Map()],
    [`super-sudoku:${scope}old`, new Map()],
  ]);
  let claimed = false;
  const normalize = request => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(paths) {
          for (const path of paths) entries.set(normalize(path), new Response(await readFile(`dist/${path.slice(2)}`)));
        },
        async match(request) { return entries.get(normalize(request))?.clone(); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const context = vm.createContext({
    URL, caches,
    fetch: async () => { throw new Error('Network offline'); },
    self: { registration: { scope }, location: { origin: new URL(scope).origin },
      clients: { claim: async () => { claimed = true; } },
      addEventListener: (name, handler) => { handlers[name] = handler; } },
  });
  vm.runInContext(worker, context);
  let pending;
  handlers.install({ waitUntil(promise) { pending = promise; } }); await pending;
  handlers.activate({ waitUntil(promise) { pending = promise; } }); await pending;
  assert.ok(claimed);
  assert.ok(stores.has('unrelated-app-cache'));
  assert.ok(!stores.has(`super-sudoku:${scope}old`));
  const current = [...stores.entries()].find(([key]) => key.startsWith(`super-sudoku:${scope}`))[1];
  const generator = [...current.keys()].find(url => url.includes('generator.worker-'));
  assert.ok(generator, 'random generator must be included in precache');
  for (const [url, mode] of [[scope, 'navigate'], [generator, 'cors']]) {
    let response;
    handlers.fetch({ request: { url, mode, method: 'GET' }, respondWith(promise) { response = promise; } });
    const result = await response;
    assert.equal(result.status, 200);
    assert.ok((await result.text()).length > 0);
  }
});
