const CACHE = 'arbitro-v1';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // CDN (supabase, chart.js): cache first, fetch & store on miss
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // App shell: stale-while-revalidate
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const cached = await c.match(e.request);
        const fresh = fetch(e.request).then(res => {
          c.put(e.request, res.clone());
          return res;
        }).catch(() => null);
        return cached || fresh;
      })
    );
    return;
  }

  // Supabase REST & /api/*: network only (autenticado, dinâmico)
});
