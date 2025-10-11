/**
 * Service Worker for SoulArt - Handles caching and push notifications
 */

// Cache configuration
const CACHE_NAME = "soulart-v1";
const STATIC_CACHE_URLS = ["/", "/manifest.json", "/favicon.ico"];

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static resources");
      return cache.addAll(STATIC_CACHE_URLS).catch((err) => {
        console.log("[SW] Cache addAll failed, continuing...", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  // Skip for API requests and external resources
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("chrome-extension://") ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Push notification event handler - THIS IS THE KEY PART!
self.addEventListener("push", (event) => {
  console.log("[SW] 📨 Push notification received:", event);

  let notificationData = {
    title: "SoulArt შეტყობინება",
    body: "ახალი შეტყობინება თქვენთვის",
    icon: "/android-icon-192x192.png",
    badge: "/android-icon-96x96.png",
    tag: "soulart-notification",
    data: {
      url: "/",
      type: "general",
    },
    requireInteraction: true,
    actions: [
      {
        action: "open",
        title: "გახსნა",
      },
      {
        action: "dismiss",
        title: "დახურვა",
      },
    ],
  };

  // Parse notification data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log("[SW] 📨 Push payload:", payload);

      notificationData = {
        ...notificationData,
        ...payload,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
      };
    } catch (error) {
      console.error("[SW] ❌ Error parsing push payload:", error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  console.log("[SW] 📨 Showing notification with data:", notificationData);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions || [],
    })
  );
});

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] 🖱️ Notification clicked:", event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === "dismiss") {
    return;
  }

  const urlToOpen =
    action === "open" || !action ? notificationData.url || "/" : "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            console.log("[SW] 🖱️ Focusing existing window");
            client.navigate(urlToOpen);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          console.log("[SW] 🖱️ Opening new window:", urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log(
  "[SW] 🚀 Service Worker initialized with push notification support"
);
