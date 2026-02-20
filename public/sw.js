/**
 * NovelReader Service Worker
 * Provides offline support and caching strategies
 */

const VERSION = 'v2.0.0';
const CACHE_PREFIX = 'novel-reader';

// Cache names with version for easy cache invalidation
const CACHES = {
  STATIC: `${CACHE_PREFIX}-static-${VERSION}`,
  PAGES: `${CACHE_PREFIX}-pages-${VERSION}`,
  IMAGES: `${CACHE_PREFIX}-images-${VERSION}`,
  NOVELS: `${CACHE_PREFIX}-novels-${VERSION}`
};

// URLs to cache on install (critical resources)
const PRECACHE_URLS = [
  '/',
  '/latest',
  '/popular',
  '/completed',
  '/search',
  '/bookmarks',
  '/manifest.json',
  '/404.html'
];

// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
  STATIC: 7 * 24 * 60 * 60,    // 7 days
  PAGES: 24 * 60 * 60,          // 1 day
  IMAGES: 30 * 24 * 60 * 60,    // 30 days
  NOVELS: 7 * 24 * 60 * 60      // 7 days
};

/**
 * Install event - precache critical resources
 */
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${VERSION}`);

  event.waitUntil(
    (async () => {
      // Create all caches
      await Promise.all([
        caches.open(CACHES.STATIC),
        caches.open(CACHES.PAGES),
        caches.open(CACHES.IMAGES)
      ]);

      // Precache critical pages
      const staticCache = await caches.open(CACHES.STATIC);
      try {
        await staticCache.addAll(
          PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' }))
        );
        console.log('[SW] Precached', PRECACHE_URLS.length, 'URLs');
      } catch (error) {
        console.warn('[SW] Precache failed:', error);
      }

      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version ${VERSION}`);

  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(
        name => name.startsWith(CACHE_PREFIX) && !Object.values(CACHES).includes(name)
      );

      await Promise.all(
        oldCaches.map(name => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );

      // Take control of all clients immediately
      await self.clients.claim();
    })()
  );
});

/**
 * Fetch event - handle requests with appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external resources (except for images)
  if (url.origin !== self.location.origin) {
    // Cache external images
    if (request.destination === 'image') {
      event.respondWith(cacheImage(request));
    }
    return;
  }

  // Route requests to appropriate handlers
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handlePageRequest(request));
  } else if (request.url.includes('/_astro/')) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleNetworkFirst(request, CACHES.STATIC));
  }
});

/**
 * Handle HTML page requests - Stale While Revalidate
 */
async function handlePageRequest(request) {
  const cache = await caches.open(CACHES.PAGES);

  // Try cache first
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) {
      // Cache the fresh response
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached version immediately, update in background
  return cached || networkFetch || getOfflineFallback();
}

/**
 * Handle static assets - Cache First
 */
async function handleStaticAsset(request) {
  return handleCacheFirst(request, CACHES.STATIC, CACHE_DURATIONS.STATIC);
}

/**
 * Handle image requests - Cache First with longer expiration
 */
async function handleImageRequest(request) {
  return handleCacheFirst(request, CACHES.IMAGES, CACHE_DURATIONS.IMAGES);
}

/**
 * Cache external images
 */
async function cacheImage(request) {
  const cache = await caches.open(CACHES.IMAGES);
  const cached = await cache.match(request);

  if (cached) {
    // Check if still fresh
    const cacheDate = cached.headers.get('date');
    if (cacheDate) {
      const age = Date.now() - new Date(cacheDate).getTime();
      if (age < CACHE_DURATIONS.IMAGES * 1000) {
        return cached;
      }
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response('Image not available', { status: 503 });
  }
}

/**
 * Network First strategy - for dynamic content
 */
async function handleNetworkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return getOfflineFallback();
  }
}

/**
 * Cache First strategy - for static assets
 */
async function handleCacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Check cache age
    const cacheDate = cached.headers.get('date');
    if (cacheDate) {
      const age = Date.now() - new Date(cacheDate).getTime();
      if (age < maxAge * 1000) {
        return cached;
      }
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Add cache date header for age checking
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    return response;
  } catch {
    return cached || new Response('Resource not available offline', { status: 503 });
  }
}

/**
 * Get offline fallback page
 */
async function getOfflineFallback() {
  const offlineFallback = await caches.match('/404.html');
  if (offlineFallback) {
    return offlineFallback;
  }

  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <title>Offline - NovelReader</title>
      <style>
        body {
          font-family: sans-serif;
          text-align: center;
          padding: 2rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .message {
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          max-width: 400px;
        }
        h1 { color: #6366f1; margin-bottom: 1rem; }
        a { color: #6366f1; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="message">
        <h1>You're Offline</h1>
        <p>Check your connection and try again.</p>
        <p><a href="/">Go Home</a></p>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

/**
 * Background sync for bookmark syncing (future feature)
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-bookmarks') {
    event.waitUntil(
      // Future: Sync bookmarks with server
      Promise.resolve()
    );
  }
});

/**
 * Push notification support (future feature)
 */
self.addEventListener('push', (event) => {
  const options = event.data?.json() || {
    title: 'NovelReader',
    body: 'New chapters available!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'new-chapters',
    data: {
      url: '/latest'
    }
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  );
});

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
    case 'CACHE_URLS':
      cacheUrls(data.urls);
      break;
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(CACHES.PAGES);
  await cache.addAll(urls);
  console.log('[SW] Cached', urls.length, 'URLs');
}

console.log('[SW] Service worker loaded:', VERSION);
