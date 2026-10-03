/* Cambia VERSION al modificar el App Shell para renovar sus archivos. */
const VERSION = 'v1';
const SHELL = `pocketstore-shell-${VERSION}`;
const DATA = `pocketstore-data-${VERSION}`;
const API = 'https://jsonplaceholder.typicode.com/users';
const ROOT = new URL('./', self.location.href);
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json',
  './data/users.json', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(ASSETS.map(path => new URL(path, ROOT).href));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('pocketstore-') && ![SHELL, DATA].includes(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Una cabecera identifica la procedencia de los datos en la interfaz.
function tagged(response, source) {
  const headers = new Headers(response.headers);
  headers.set('X-PocketStore-Source', source);
  return new Response(response.body, { status: response.status, headers });
}

async function users(request) {
  const cache = await caches.open(DATA);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(request, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('La API no está disponible');
    const list = await response.clone().json();
    if (!Array.isArray(list) || !list.length || !list.every(user => Number.isInteger(user.id) && typeof user.name === 'string' && typeof user.email === 'string' && typeof user.address?.city === 'string' && typeof user.company?.name === 'string')) {
      throw new Error('Respuesta inválida');
    }
    const headers = new Headers(response.headers);
    headers.set('X-PocketStore-Saved-At', new Date().toISOString());
    const saved = new Response(response.body, { status: 200, headers });
    // El fallo de almacenamiento no debe impedir consultar una respuesta válida.
    try { await cache.put(API, saved.clone()); } catch { /* Se conserva la copia precargada. */ }
    return tagged(saved, 'network');
  } catch {
    const saved = await cache.match(API);
    if (saved) return tagged(saved, 'cache');
    const demo = await caches.match(new URL('./data/users.json', ROOT).href);
    if (demo) return tagged(demo, 'demo');
    return new Response(JSON.stringify({ error: 'No hay una copia local disponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  } finally { clearTimeout(timer); }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.href === API) {
    event.respondWith(users(event.request));
    return;
  }
  if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  const shellPaths = ASSETS.map(path => new URL(path, ROOT).pathname);
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.match(new URL('./index.html', ROOT).href).then(cached => cached || fetch(event.request)));
  } else if (shellPaths.includes(url.pathname)) {
    // Cache first para el App Shell; tolera parámetros en las URL locales.
    event.respondWith(caches.match(url.origin + url.pathname).then(cached => cached || fetch(event.request)));
  }
});
