// Service Worker Registration and Underground Offline Sync Utility

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isControlling: boolean;
  registration: ServiceWorkerRegistration | null;
  hasCachedData: boolean;
}

export function registerServiceWorker(
  onSuccess?: (reg: ServiceWorkerRegistration) => void,
  onUpdate?: (reg: ServiceWorkerRegistration) => void
): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[SW] ServiceWorker registered with scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[SW] New content available; please refresh.');
                  if (onUpdate) onUpdate(registration);
                } else {
                  console.log('[SW] Content cached for offline underground use.');
                  if (onSuccess) onSuccess(registration);
                }
              }
            };
          };

          if (onSuccess) onSuccess(registration);
        })
        .catch((error) => {
          console.warn('[SW] ServiceWorker registration error (may occur in sandboxed iframes):', error);
        });
    });
  }
}

export function unregisterServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Send pre-cache message to active Service Worker
export async function syncDocumentsToServiceWorkerCache(documents: any[], chunks: any[]): Promise<boolean> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_MINING_DOCUMENTS',
      documents,
      chunks,
    });
    return true;
  }
  
  // Also store in CacheStorage directly if available
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open('khanij-data-v2');
      await cache.put(
        '/api/offline/documents',
        new Response(JSON.stringify(documents), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
      await cache.put(
        '/api/offline/chunks',
        new Response(JSON.stringify(chunks), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
      return true;
    } catch (e) {
      console.warn('[SW CacheStorage fallback error]:', e);
    }
  }

  return false;
}
