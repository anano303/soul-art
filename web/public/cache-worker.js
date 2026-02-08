// Custom Cache Management for Soulart PWA
// ეს ფაილი ამოწმებს cache-ის სიახლეს და ავტომატურად ახალებს

const CACHE_VERSION = "soulart-v1";
const API_CACHE_NAME = `api-cache-${CACHE_VERSION}`;
const CACHE_UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for API calls

// Listen for messages from main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_UPDATE_REQUEST") {
    updateCacheIfNeeded();
  } else if (event.data && event.data.type === "FORCE_CACHE_CLEAR") {
    clearAllCaches();
  }
});

// Check for cache updates periodically
self.addEventListener("activate", () => {
  setInterval(() => {
    updateCacheIfNeeded();
  }, CACHE_UPDATE_INTERVAL);
});

async function updateCacheIfNeeded() {
  try {
    // Check if API cache is stale
    const apiCache = await caches.open(API_CACHE_NAME);
    const cacheKeys = await apiCache.keys();

    for (const request of cacheKeys) {
      const response = await apiCache.match(request);
      if (response) {
        const cacheTime = new Date(response.headers.get("sw-cache-time") || 0);
        const now = new Date();

        // If cache is older than API_CACHE_DURATION, refresh it
        if (now.getTime() - cacheTime.getTime() > API_CACHE_DURATION) {
          try {
            const freshResponse = await fetch(request);
            if (freshResponse.ok) {
              // Add cache time header
              const responseClone = freshResponse.clone();
              const responseWithTime = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                  ...Object.fromEntries(responseClone.headers.entries()),
                  "sw-cache-time": new Date().toISOString(),
                },
              });

              await apiCache.put(request, responseWithTime);

              // Notify client about fresh data
              const clients = await self.clients.matchAll();
              clients.forEach((client) => {
                client.postMessage({
                  type: "CACHE_UPDATED",
                  url: request.url,
                });
              });
            }
          } catch {
            console.log("Failed to update cache for:", request.url);
          }
        }
      }
    }
  } catch (err) {
    console.error("Cache update check failed:", err);
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "CACHE_CLEARED",
      });
    });
  } catch (err) {
    console.error("Failed to clear caches:", err);
  }
}

// Add cache timestamp to responses
self.addEventListener("fetch", (event) => {
  // Only handle API calls for cache timing
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          // Check if cached response is still fresh
          const cacheTime = new Date(
            response.headers.get("sw-cache-time") || 0
          );
          const now = new Date();

          if (now.getTime() - cacheTime.getTime() < API_CACHE_DURATION) {
            return response;
          }
        }

        // Fetch fresh data
        return fetch(event.request).then((response) => {
          if (response.ok && event.request.method === "GET") {
            const responseClone = response.clone();
            const responseWithTime = new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: {
                ...Object.fromEntries(responseClone.headers.entries()),
                "sw-cache-time": new Date().toISOString(),
              },
            });

            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseWithTime);
            });
          }

          return response;
        });
      })
    );
  }
});
