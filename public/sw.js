const CACHE_NAME = 'novel-reader-v1';
const urlsToCache = [
  '/',
  '/latest',
  '/popular',
  '/completed',
  '/search'
];

const STATIC_CACHE = 'novel-static-v1';
const API_CACHE = 'novel-api-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Opening cache:', STATIC_CACHE);
      return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== STATIC_CACHE && cacheName !== API_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

// Fetch event - network first, then cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external resources (images, fonts, etc.)
  if (url.origin !== self.location.origin) {
    // Cache external images from picsum.photos
    if (url.hostname === 'picsum.photos') {
      event.respondWith(
        caches.open(API_CACHE).then((cache) => {
          return cache.match(request).then((response) => {
            return response || fetch(request).then((response) => {
              const responseClone = response.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
              return response;
            });
          });
        })
      );
    }
    return;
  }

  // For HTML pages - network first, cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Return offline fallback
            return caches.match('/404.html');
          });
        })
    );
    return;
  }

  // For static assets (CSS, JS, images) - cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Check if cache is still valid (1 hour)
        const cacheTime = cached.headers.get('date');
        if (cacheTime) {
          const age = Date.now() - new Date(cacheTime).getTime();
          if (age < 3600000) { // 1 hour
            return cached;
          }
        }
      }
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(
      // Sync favorites with server
      fetch('/api/sync-favorites', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' })
      })
    );
  }
});

// Push notification support (optional)
self.addEventListener('push', (event) => {
  const options = event.data?.json() || {
    title: 'NovelReader',
    body: 'New chapters available!',
    icon: '/favicon.svg',
    badge: '/favicon.svg'
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});
