const CACHE_NAME = "soulart-v4";
const STATIC_CACHE = "soulart-static-v4";
const DYNAMIC_CACHE = "soulart-dynamic-v4";
const IMAGE_CACHE = "soulart-images-v4";
const API_CACHE = "soulart-api-v4";

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
        // Cache app shell first - this is critical for performance
        const shellCache = await caches.open(STATIC_CACHE);
        console.log("SW: Caching app shell");

        // Cache core resources - most critical for offline functionality
        const staticCache = await caches.open(STATIC_CACHE);
        console.log("SW: Caching core resources");
        await staticCache.addAll(CORE_CACHE_URLS);

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
    event.respondWith(staleWhileRevalidateStrategy(request, API_CACHE, 5 * 60)); // 5 minutes TTL
  } else if (isStaticAsset(url)) {
    // Static assets - cache first with long TTL
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isImage(url)) {
    // Images - cache first strategy with background updates
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, true));
  } else if (isHtmlNavigation(request)) {
    // HTML Navigation - network first with faster timeout and offline fallback
    event.respondWith(networkFirstWithFastTimeout(request));
  } else if (url.origin === self.location.origin) {
    // Other same-origin requests - stale-while-revalidate
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
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

// Improved network-first strategy with faster timeout (800ms)
async function networkFirstWithFastTimeout(request) {
  try {
    // Try network first with a much shorter timeout (800ms is the perceived loading threshold)
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Network timeout")), 800)
      ),
    ]);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error("Network response was not OK");
  } catch (error) {
    console.warn("SW: Network failed for", request.url, "trying cache");

    // Fallback to cache immediately
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
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
    fetchPromise.catch(() => {}); // Ensure fetch promise doesn't cause unhandled rejection
    return cachedResponse;
  }

  // If we have no cached response, wait for the network response
  return fetchPromise;
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
self.addEventListener("activate", (event) => {
  console.log("SW: Activating...");
  const cacheWhitelist = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter((cacheName) => !cacheWhitelist.includes(cacheName))
          .map((cacheName) => {
            console.log("SW: Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          });

        await Promise.all(deletePromises);
        console.log("SW: Old caches cleaned up");

        // Take control of all clients
        await self.clients.claim();
        console.log("SW: Activated and claimed clients");
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

              request.onerror = () =>
                reject(new Error(`Failed to delete request ${req.id}`));
              request.onsuccess = () => resolve();
            });

            return {
              success: true,
              id: req.id,
              status: response.status,
            };
          }

          return {
            success: false,
            id: req.id,
            error: `Server returned ${response.status} ${response.statusText}`,
          };
        } catch (error) {
          return {
            success: false,
            id: req.id,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Show notification if there were results
    if (pendingRequests.length > 0) {
      const succeeded = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;

      if (self.registration.showNotification) {
        await self.registration.showNotification("SoulArt სინქრონიზაცია", {
          body: `${succeeded} / ${pendingRequests.length} მოთხოვნა წარმატებით დასინქრონდა`,
          icon: "/soulart_icon_blue_fullsizes.ico",
          badge: "/soulart_icon_blue_fullsizes.ico",
          tag: "background-sync-complete",
        });
      }
    }

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
    badge: "/soulart_icon_blue_fullsizes.ico",
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
