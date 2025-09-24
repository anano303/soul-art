// This is required for next-pwa to inject the manifest
self.__WB_MANIFEST;

const CACHE_VERSION = "v5";
const CACHE_PREFIX = "soulart-";

// Cache names with improved structure
const CACHES = {
  static: `${CACHE_PREFIX}static-${CACHE_VERSION}`,
  dynamic: `${CACHE_PREFIX}dynamic-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}api-${CACHE_VERSION}`
};

// Runtime caching duration in seconds
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// Essential resources to cache for offline functionality
const CORE_CACHE_URLS = [
  "/",
  "/shop",
  "/forum",
  "/about",
  "/cart",
  "/offline",
  "/manifest.json",
  "/soulart_icon_blue_fullsizes.ico",
  "/soulart_icon_white_fullsizes.ico",
  "/logo.png",
  "/logo-white.png",
];

// App Shell resources - these are critical for the PWA frame
const APP_SHELL = [
  "/", // The main shell
  "/offline", // Offline fallback page
  "/_next/static/chunks/framework-*.js", // Next.js framework
  "/_next/static/chunks/main-*.js", // Main bundle
  "/_next/static/chunks/app/layout-*.js", // Layout components
];

// Install event - cache core resources and app shell
self.addEventListener("install", (event) => {
  console.log("SW: Installing...");
  event.waitUntil(
    (async () => {
      try {
        // Cache static resources (app shell and core resources)
        const staticCache = await caches.open(CACHES.static);
        console.log("SW: Caching app shell and core resources");
        await staticCache.addAll([...APP_SHELL, ...CORE_CACHE_URLS]);

        console.log("SW: Core resources cached");
        self.skipWaiting(); // Activate immediately for better UX
      } catch (error) {
        console.error("SW: Install failed", error);
      }
    })()
  );
});

// Enhanced fetch event with optimized caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-HTTP requests
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isApiRequest(url)) {
    // API requests - stale-while-revalidate with short TTL
    event.respondWith(staleWhileRevalidateStrategy(request, CACHES.api, 5 * 60)); // 5 minutes TTL
  } else if (isStaticAsset(url)) {
    // Static assets - cache first with long TTL
    event.respondWith(cacheFirstStrategy(request, CACHES.static));
  } else if (isImage(url)) {
    // Images - cache first strategy with background updates
    event.respondWith(cacheFirstStrategy(request, CACHES.static, true));
  } else if (isHtmlNavigation(request)) {
    // HTML Navigation - network first with faster timeout and offline fallback
    event.respondWith(networkFirstWithFastTimeout(request));
  } else if (url.origin === self.location.origin) {
    // Other same-origin requests - stale-while-revalidate
    event.respondWith(staleWhileRevalidateStrategy(request, CACHES.dynamic));
  }
  // Let browser handle everything else normally
});

// Helper functions to identify resource types
function isApiRequest(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.origin.includes("api.") ||
    url.pathname.includes("/graphql")
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/static/") ||
    url.pathname.match(/\.(js|css|json|woff2?|ttf|eot)$/i)
  );
}

function isImage(url) {
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i);
}

function isHtmlNavigation(request) {
  return (
    request.mode === "navigate" ||
    (request.headers.get("Accept") &&
      request.headers.get("Accept").includes("text/html"))
  );
}

// Optimized cache-first strategy with optional background updates
async function cacheFirstStrategy(
  request,
  cacheName,
  updateInBackground = false
) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background if requested
    if (updateInBackground) {
      updateCacheInBackground(request, cacheName);
    }
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn("SW: Cache-first fetch failed for", request.url, error);
    return new Response("Network error", { status: 408 });
  }
}

// Ultra-fast navigation with instant cache fallback (200ms timeout)
async function networkFirstWithFastTimeout(request) {
  const cache = await caches.open(CACHES.dynamic);
  const cachedResponse = await cache.match(request);
  
  try {
    // Start network request immediately
    const networkPromise = fetch(request);
    
    // If we have cached content, use it immediately for navigation requests
    if (cachedResponse && request.mode === "navigate") {
      // Update cache in background but serve cached content instantly
      networkPromise.then(async (networkResponse) => {
        if (networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
      }).catch(console.warn);
      
      return cachedResponse;
    }
    
    // For non-cached navigation requests, use very short timeout (200ms)
    const networkResponse = await Promise.race([
      networkPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Network timeout")), 200)
      ),
    ]);

    if (networkResponse.ok) {
      // Cache successful responses
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error("Network response was not OK");
  } catch (error) {
    console.warn("SW: Network failed for", request.url, "using cache");

    // Fallback to cache
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then(async (networkResponse) => {
        if (networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
      }).catch(console.warn);
      
      return cachedResponse;
    }

    // For navigation requests, return offline page
    if (request.mode === "navigate") {
      const offlineResponse = await caches.match("/offline");
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response("Offline - Unable to fetch resource", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Stale-while-revalidate strategy - serve from cache, update in background
async function staleWhileRevalidateStrategy(
  request,
  cacheName,
  maxAgeSeconds = null
) {
  const cache = await caches.open(cacheName);

  // Try to get from cache first
  const cachedResponse = await cache.match(request);

  // Start network fetch immediately - don't wait for it to complete
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      // If we got a valid response, cache it
      if (networkResponse.ok) {
        // Clone the response before caching it
        const clonedResponse = networkResponse.clone();

        // If we have a max age, add timestamp to the response before caching
        if (maxAgeSeconds) {
          const headers = new Headers(clonedResponse.headers);
          headers.append("sw-fetched-on", Date.now().toString());
          headers.append("sw-max-age", maxAgeSeconds.toString());

          // Create a new response with the added headers
          const augmentedResponse = new Response(clonedResponse.body, {
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
            headers: headers,
          });

          cache.put(request, augmentedResponse);
        } else {
          cache.put(request, clonedResponse);
        }
      }
      return networkResponse;
    })
    .catch((error) => {
      console.warn("SW: Fetch failed in stale-while-revalidate", error);
      // We don't throw here - we'll return cached response below
    });

  // If we have a cached response, check if it's still fresh (if max age is specified)
  if (cachedResponse && maxAgeSeconds) {
    const fetchedOn = cachedResponse.headers.get("sw-fetched-on");
    const maxAge = cachedResponse.headers.get("sw-max-age");

    if (fetchedOn && maxAge) {
      const ageInSeconds = (Date.now() - parseInt(fetchedOn)) / 1000;
      if (ageInSeconds < parseInt(maxAge)) {
        // Still fresh, return cached version
        fetchPromise.catch(() => {}); // Ensure fetch promise doesn't cause unhandled rejection
        return cachedResponse;
      }
    }
  }

  // If we have any cached response, return it (fresh or stale)
  if (cachedResponse) {
    // Still revalidate in the background
    fetchPromise.catch(() => {});
    return cachedResponse;
  }

  // If we don't have a cached response, wait for the network
  try {
    return await fetchPromise;
  } catch (error) {
    // Last resort fallback
    return new Response("Network error", {
      status: 408,
      statusText: "Request Timeout",
    });
  }
}

// Background fetch to update cache without blocking
async function updateCacheInBackground(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
      console.log("SW: Updated cache in background for", request.url);
    }
  } catch (error) {
    console.warn("SW: Background update failed for", request.url);
  }
}

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("SW: Activating...");
  event.waitUntil(
    (async () => {
      try {
        // Get all cache keys
        const cacheNames = await caches.keys();

        // Delete old cache versions
        const oldCaches = cacheNames.filter(
          (name) => name.startsWith(CACHE_PREFIX) && !Object.values(CACHES).includes(name)
        );

        if (oldCaches.length > 0) {
          console.log("SW: Deleting old caches:", oldCaches);
          await Promise.all(oldCaches.map((name) => caches.delete(name)));
        }

        // Tell clients about the activation
        if (self.clients && self.clients.claim) {
          await self.clients.claim();
          console.log("SW: Claimed all clients");
        }
      } catch (error) {
        console.error("SW: Activation failed", error);
      }
    })()
  );
});

// Background sync for offline functionality
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle background sync tasks with indexed DB for data persistence
async function doBackgroundSync() {
  console.log("Background sync triggered");

  try {
    // Open IndexedDB
    const dbName = "soulart-offline-db";
    const storeName = "offlineRequests";

    // Open the database
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onerror = () => reject(new Error("Failed to open DB"));
      request.onsuccess = () => resolve(request.result);
    });

    // Get all pending requests
    const pendingRequests = await new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(new Error("Failed to get requests"));
      request.onsuccess = () => resolve(request.result);
    });

    console.log(`Processing ${pendingRequests.length} offline requests...`);

    // Process each request
    const results = await Promise.allSettled(
      pendingRequests.map(async (req) => {
        try {
          // Try to send the request
          const response = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body ? JSON.stringify(req.body) : undefined,
            credentials: "same-origin",
          });

          // If successful, delete from IndexedDB
          if (response.ok) {
            await new Promise((resolve, reject) => {
              const transaction = db.transaction([storeName], "readwrite");
              const store = transaction.objectStore(storeName);
              const request = store.delete(req.id);

              request.onerror = () => reject(new Error("Failed to delete request"));
              request.onsuccess = () => resolve();
            });

            return { success: true, id: req.id };
          }
          return { success: false, id: req.id, error: "Response not OK" };
        } catch (error) {
          return { success: false, id: req.id, error: error.message };
        }
      })
    );

    // Report results
    return {
      total: pendingRequests.length,
      succeeded: results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length,
      failed: results.filter((r) => r.status === "rejected" || !r.value.success)
        .length,
    };
  } catch (error) {
    console.error("Background sync error:", error);
    return { error: error.message };
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New update available!",
    icon: "/soulart_icon_blue_fullsizes.ico",
    badge: "/android-icon-96x96.png", // Using a better badge size
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "ნახვა",
        icon: "/soulart_icon_blue_fullsizes.ico",
      },
      {
        action: "close",
        title: "დახურვა",
        icon: "/soulart_icon_blue_fullsizes.ico",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("SoulArt", options));
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    // Open the app when notification is clicked
    event.waitUntil(clients.openWindow("/"));
  }
});

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});