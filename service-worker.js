self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('slope-cache').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png',
        '/textures/Bridge2/px.jpg',
        '/textures/Bridge2/nx.jpg',
        '/textures/Bridge2/py.jpg',
        '/textures/Bridge2/ny.jpg',
        '/textures/Bridge2/pz.jpg',
        '/textures/Bridge2/nz.jpg',
        '/textures/Park2/px.jpg',
        '/textures/Park2/nx.jpg',
        '/textures/Park2/py.jpg',
        '/textures/Park2/ny.jpg',
        '/textures/Park2/pz.jpg',
        '/textures/Park2/nz.jpg',
        '/textures/SwedishRoyalCastle/px.jpg',
        '/textures/SwedishRoyalCastle/nx.jpg',
        '/textures/SwedishRoyalCastle/py.jpg',
        '/textures/SwedishRoyalCastle/ny.jpg',
        '/textures/SwedishRoyalCastle/pz.jpg',
        '/textures/SwedishRoyalCastle/nz.jpg'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

