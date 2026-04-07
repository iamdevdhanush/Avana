const CACHE_NAME = 'avana-v2';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use addAll with a fallback — don't fail install if some static assets are missing
        return cache.addAll(urlsToCache).catch((err) => {
          console.warn('SW: Some cache items failed:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // BUG FIX: Don't cache API requests — use event.respondWith(fetch()) instead of bare return
  // A bare return does NOT prevent the subsequent respondWith from running
  if (url.includes('/rest/v1') ||
      url.includes('supabase') ||
      url.includes('firebaseio') ||
      url.includes('googleapis') ||
      url.includes('identitytoolkit') ||
      url.includes('securetoken') ||
      url.includes('generativelanguage') ||
      url.includes('/auth/') ||
      url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.warn('SW: Network request failed for API:', url, err);
        return new Response(JSON.stringify({ error: 'Network unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For non-API requests: cache-first, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request).then((networkResponse) => {
          // Cache successful GET responses
          if (event.request.method === 'GET' && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});
