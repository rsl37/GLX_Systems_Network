/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Lean service worker for civic data caching
// Implements offline-first strategy for critical civic functionality

const CACHE_NAME = 'glx-civic-v1';
const CIVIC_DATA_CACHE = 'civic-data-v1';

// Critical resources for offline civic functionality
const STATIC_RESOURCES = ['/', '/assets/index.css', '/assets/index.js'];

// Civic data patterns that should be cached
const CIVIC_DATA_PATTERNS = [
  '/api/help-requests',
  '/api/civic-matching',
  '/api/user/profile',
  '/api/governance',
  '/api/crisis',
];

// Install event - cache critical resources
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== CIVIC_DATA_CACHE)
            .map(cacheName => {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement lean caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle civic data requests with cache-first strategy
  if (CIVIC_DATA_PATTERNS.some(pattern => url.pathname.includes(pattern))) {
    event.respondWith(handleCivicDataRequest(request));
    return;
  }

  // Handle static resources with cache-first strategy
  if (
    request.method === 'GET' &&
    (request.destination === 'document' ||
      request.destination === 'script' ||
      request.destination === 'style')
  ) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Default: network-first for other requests
  event.respondWith(fetch(request));
});

// Lean civic data caching strategy
async function handleCivicDataRequest(request) {
  try {
    const cache = await caches.open(CIVIC_DATA_CACHE);
    const cachedResponse = await cache.match(request);

    // Return cached response immediately for better performance
    if (cachedResponse) {
      // Update cache in background for fresh data
      fetch(request)
        .then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        })
        .catch(() => {
          // Silently fail background update
        });

      return cachedResponse;
    }

    // If no cache, fetch from network and cache
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Only cache successful civic data responses
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn('⚠️ Service Worker: Civic data request failed', error);

    // Return cached response if available, or basic error response
    const cache = await caches.open(CIVIC_DATA_CACHE);
    const cachedResponse = await cache.match(request);

    return (
      cachedResponse ||
      new Response(JSON.stringify({ error: 'Offline - data not available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
}

// Static resource caching strategy
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn('⚠️ Service Worker: Static request failed', error);

    // Return cached response if available
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(request)) || new Response('Offline');
  }
}

// Handle service worker messages
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_CIVIC_DATA') {
    // Allow manual caching of civic data
    const { url, data } = event.data;
    caches
      .open(CIVIC_DATA_CACHE)
      .then(cache => {
        const response = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });
        return cache.put(url, response);
      })
      .catch(error => {
        console.error('❌ Service Worker: Failed to cache civic data', error);
      });
  }
});

console.log('🌟 GLX Civic Service Worker: Lean caching strategy active');
console.log('🌟 GLX Civic Service Worker: Lean caching strategy active');
