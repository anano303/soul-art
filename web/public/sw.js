const CACHE_NAME = 'soulart-v3';
const STATIC_CACHE = 'soulart-static-v3';
const DYNAMIC_CACHE = 'soulart-dynamic-v3';
const IMAGE_CACHE = 'soulart-images-v3';

// Essential resources to cache for offline functionality
const CORE_CACHE_URLS = [
  '/',
  '/shop',
  '/forum', 
  '/about',
  '/cart',
  '/offline',
  '/manifest.json',
  '/soulart_icon_blue_fullsizes.ico',
  '/soulart_icon_white_fullsizes.ico',
  '/logo.png',
  '/logo-white.png'
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('SW: Caching core resources');
        await cache.addAll(CORE_CACHE_URLS);
        console.log('SW: Core resources cached');
        self.skipWaiting(); // Activate immediately
      } catch (error) {
        console.error('SW: Install failed', error);
      }
    })()
  );
});

// Enhanced fetch event with proper caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first with long TTL
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i)) {
    // Images - cache first strategy
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  } else if (url.origin === self.location.origin) {
    // Same-origin requests - network first with offline fallback
    event.respondWith(networkFirstStrategy(request));
  }
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      updateCacheInBackground(request, cacheName);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('SW: Cache-first failed for', request.url, error);
    return new Response('Network error', { status: 408 });
  }
}

// Network-first strategy for pages
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 3000)
      )
    ]);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('SW: Network failed for', request.url, 'trying cache');
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If it's a navigation request, return offline page
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Update cache in background
async function updateCacheInBackground(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  const cacheWhitelist = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(cacheName => !cacheWhitelist.includes(cacheName))
          .map(cacheName => {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletePromises);
        console.log('SW: Old caches cleaned up');
        
        // Take control of all clients
        await self.clients.claim();
        console.log('SW: Activated and claimed clients');
      } catch (error) {
        console.error('SW: Activation failed', error);
      }
    })()
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle background sync tasks
  console.log('Background sync triggered');
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/soulart_icon_blue_fullsizes.ico',
    badge: '/soulart_icon_blue_fullsizes.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'ნახვა',
        icon: '/soulart_icon_blue_fullsizes.ico'
      },
      {
        action: 'close',
        title: 'დახურვა',
        icon: '/soulart_icon_blue_fullsizes.ico'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SoulArt', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app when notification is clicked
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});