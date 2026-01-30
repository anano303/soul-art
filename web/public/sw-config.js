// Custom service worker configuration for Soulart PWA
// This file configures advanced caching strategies for optimal offline experience

const CACHE_NAME = "soulart-v1";
const STATIC_CACHE = "soulart-static-v1";
const DYNAMIC_CACHE = "soulart-dynamic-v1";
const IMAGES_CACHE = "soulart-images-v1";

// Files to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/logo.png",
  "/logo-white.webp",
  "/offline",
];

// Cache strategies for different resource types
const cacheStrategies = {
  // Static assets: Cache first, fallback to network
  static: {
    cacheName: STATIC_CACHE,
    strategy: "CacheFirst",
    maxEntries: 100,
    maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
  },

  // API calls: Network first, fallback to cache
  api: {
    cacheName: DYNAMIC_CACHE,
    strategy: "NetworkFirst",
    maxEntries: 50,
    maxAgeSeconds: 24 * 60 * 60, // 24 hours
  },

  // Images: Cache first with long expiration
  images: {
    cacheName: IMAGES_CACHE,
    strategy: "CacheFirst",
    maxEntries: 200,
    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
  },

  // Fonts: Cache first with very long expiration
  fonts: {
    cacheName: STATIC_CACHE,
    strategy: "CacheFirst",
    maxEntries: 30,
    maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
  },
};

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("Soulart SW: Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("Soulart SW: Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("Soulart SW: Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== IMAGES_CACHE
          ) {
            console.log("Soulart SW: Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (unless it's for images/fonts)
  if (
    url.origin !== location.origin &&
    !isImageRequest(request) &&
    !isFontRequest(request)
  ) {
    return;
  }

  event.respondWith(handleRequest(request));
});

// Handle different types of requests with appropriate strategies
async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    // API requests - Network first
    if (url.pathname.startsWith("/api/")) {
      return await networkFirst(request, cacheStrategies.api);
    }

    // Images - Cache first
    if (isImageRequest(request)) {
      return await cacheFirst(request, cacheStrategies.images);
    }

    // Fonts - Cache first
    if (isFontRequest(request)) {
      return await cacheFirst(request, cacheStrategies.fonts);
    }

    // Static assets - Cache first
    if (isStaticAsset(request)) {
      return await cacheFirst(request, cacheStrategies.static);
    }

    // HTML pages - Network first with fallback to offline page
    if (isHTMLRequest(request)) {
      return await networkFirstWithOfflineFallback(request);
    }

    // Default: Network first
    return await networkFirst(request, cacheStrategies.api);
  } catch (error) {
    console.log("Soulart SW: Request failed:", error);

    // Return offline page for HTML requests
    if (isHTMLRequest(request)) {
      const cache = await caches.open(STATIC_CACHE);
      return (await cache.match("/offline")) || new Response("Offline");
    }

    return new Response("Network error", { status: 500 });
  }
}

// Network first strategy
async function networkFirst(request, config) {
  const cache = await caches.open(config.cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request, config) {
  const cache = await caches.open(config.cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response);
        }
      })
      .catch(() => {
        // Ignore fetch errors in background update
      });
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Network first with offline fallback for HTML pages
async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(STATIC_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    return (await cache.match("/offline")) || new Response("Offline");
  }
}

// Helper functions to identify request types
function isImageRequest(request) {
  return (
    request.destination === "image" ||
    /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/i.test(request.url)
  );
}

function isFontRequest(request) {
  return (
    request.destination === "font" ||
    /\.(woff|woff2|ttf|eot)$/i.test(request.url)
  );
}

function isStaticAsset(request) {
  return (
    /\.(css|js|json)$/i.test(request.url) ||
    request.url.includes("_next/static/")
  );
}

function isHTMLRequest(request) {
  return (
    request.destination === "document" ||
    request.headers.get("accept")?.includes("text/html")
  );
}

// Background sync for offline actions (if supported)
if (
  "serviceWorker" in navigator &&
  "sync" in window.ServiceWorkerRegistration.prototype
) {
  self.addEventListener("sync", (event) => {
    if (event.tag === "background-sync") {
      event.waitUntil(doBackgroundSync());
    }
  });
}

async function doBackgroundSync() {
  // Handle any pending offline actions here
  console.log("Soulart SW: Background sync triggered");
}

// Push notifications
self.addEventListener("push", (event) => {
  console.log("🔥 SW: Push event received:", event);

  if (event.data) {
    const data = event.data.json();
    console.log("📨 SW: Push data:", data);

    const options = {
      body: data.body,
      icon: "/android-icon-192x192.png",
      // badge - Android status bar-ში ჩანს, უნდა იყოს monochrome (თეთრი სილუეტი გამჭვირვალე ფონზე)
      badge: "/notification-badge.png",
      data: data.url || "/",
      tag: "soulart-notification",
      requireInteraction: true,
      silent: false,
    };

    console.log("🔔 SW: Showing notification with options:", options);

    event.waitUntil(
      self.registration
        .showNotification(data.title || "Soulart", options)
        .then(() => console.log("✅ SW: Notification shown successfully"))
        .catch((error) =>
          console.error("❌ SW: Failed to show notification:", error),
        ),
    );
  } else {
    console.log("⚠️ SW: Push event received but no data");
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("👆 SW: Notification clicked:", event);
  event.notification.close();

  const urlToOpen = event.notification.data || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        console.log("🔍 SW: Looking for existing clients:", clientList.length);

        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            console.log("🎯 SW: Focusing existing client");
            return client.focus();
          }
        }

        // Open new window if none found
        if (clients.openWindow) {
          console.log("🆕 SW: Opening new window:", urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) =>
        console.error("❌ SW: Error handling notification click:", error),
      ),
  );
});
