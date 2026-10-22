// ClipAPP — offline cache. Bump VERSION on every upload.
const VERSION = 'clipapp-v16';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const isPage = req.mode === 'navigate' || /\/(index\.html)?(\?.*)?$/.test(new URL(req.url).pathname + new URL(req.url).search);
  if (isPage) {
    // Network first: with internet you always get the newest version; offline falls back to the saved copy.
    e.respondWith(
      fetch(req, {cache: 'no-store'}).then(r => {
        if (r && r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); }
        return r;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, {ignoreSearch: true});
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
