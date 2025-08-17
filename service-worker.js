self.addEventListener('install', e => {
  console.log('Service worker installed');
  e.waitUntil(
    caches.open('shop-pwa').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/app.js',
        '/sheets.js'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
