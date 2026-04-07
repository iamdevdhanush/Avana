const CACHE_NAME = 'avana-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
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
  try {
    // Don't cache API requests (Supabase, Firebase, etc.)
    if (event.request.url.includes('/rest/v1') || 
        event.request.url.includes('supabase') ||
        event.request.url.includes('firebaseio') ||
        event.request.url.includes('googleapis') ||
        event.request.url.includes('auth') ||
        event.request.url.includes('/api/')) {
      return;
    }
    
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
        .catch(() => {
          // Fallback to network if cache fails
          return fetch(event.request);
        })
    );
  } catch (error) {
    console.error('Service Worker fetch error:', error);
    // Fallback to network on any SW error
    return fetch(event.request);
  }
});
