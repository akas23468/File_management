// Khanij Service Worker - Offline Caching for Low-Connectivity Underground Mining Environments
const CACHE_NAME = 'khanij-mining-v1';
const DATA_CACHE_NAME = 'khanij-data-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install Event: Cache essential app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline app shell for underground operations');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Non-blocking asset pre-cache error:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[ServiceWorker] Removing stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Cache-First for static assets, Network-First with Cache fallback for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for standard caching (e.g. POST requests can be handled with offline fallbacks)
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone and cache in DATA_CACHE
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          console.log('[ServiceWorker] Network unavailable. Serving cached API response for:', url.pathname);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return graceful offline fallback JSON for health or documents
          if (url.pathname === '/api/health') {
            return new Response(
              JSON.stringify({
                status: 'offline',
                mode: 'underground-cache',
                message: 'Operating in low-connectivity underground mining mode',
                timestamp: new Date().toISOString(),
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({
              error: 'Offline underground mode active. Data retrieved from local secure cache.',
              offline: true,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Handle Static and Application Assets (Cache-First / Stale-While-Revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to update cache (Stale-While-Revalidate)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Offline - ignore network update failure
          });

        return cachedResponse;
      }

      // If not in cache, fetch from network and cache
      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.protocol === 'http:' || url.protocol === 'https:')
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If HTML navigation fails, return cached root or index
          if (request.headers.get('accept')?.includes('text/html')) {
            const indexCached = await caches.match('/index.html') || await caches.match('/');
            if (indexCached) return indexCached;
          }
          return new Response('Khanij Offline Underground Mining Mode - Resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Listen for messages from client (e.g. Trigger offline pre-caching of all documents)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_MINING_DOCUMENTS') {
    const { documents, chunks } = event.data;
    console.log('[ServiceWorker] Storing documents and vector chunks into offline storage cache');
    caches.open(DATA_CACHE_NAME).then((cache) => {
      const docsResponse = new Response(JSON.stringify(documents), {
        headers: { 'Content-Type': 'application/json' },
      });
      const chunksResponse = new Response(JSON.stringify(chunks), {
        headers: { 'Content-Type': 'application/json' },
      });
      cache.put('/api/offline/documents', docsResponse);
      cache.put('/api/offline/chunks', chunksResponse);
      
      // Notify all clients that offline sync completed
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'OFFLINE_CACHE_COMPLETE',
            documentsCount: documents?.length || 0,
            chunksCount: chunks?.length || 0,
            timestamp: new Date().toISOString(),
          });
        });
      });
    });
  }
});
