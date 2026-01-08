/**
 * SoulArt Service Worker - Professional PWA Implementation
 * Following MDN Web Push API Standards and Best Practices
 * https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
 */

// Cache configuration with versioning
const CACHE_NAME = "soulart-v2.0";
const RUNTIME_CACHE = "soulart-runtime-v2.0";
const STATIC_CACHE_URLS = [
  "/manifest.json",
  "/favicon.ico",
  "/android-icon-192x192.png",
  "/android-icon-96x96.png",
];

// Install event - enhanced caching strategy
self.addEventListener("install", (event) => {
  console.log("[SW] 🚀 Installing SoulArt Service Worker v2.0");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] 📦 Caching static resources");
        // Cache files individually to avoid failures
        return Promise.allSettled(
          STATIC_CACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log("[SW] ✅ Static resources cached (with possible warnings)");
      })
      .catch((error) => {
        console.error("[SW] ❌ Cache setup failed:", error);
      })
  );

  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - cleanup and client claiming
self.addEventListener("activate", (event) => {
  console.log("[SW] ⚡ Activating SoulArt Service Worker v2.0");

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log("[SW] 🗑️ Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim(),
    ])
  );

  console.log(
    "[SW] ✅ Service Worker activated and ready for push notifications"
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const requestUrl = event.request.url;

  if (
    requestUrl.includes("/_next/") ||
    requestUrl.includes("/__nextjs") ||
    requestUrl.includes("/socket.io") ||
    requestUrl.includes("/sockjs") ||
    requestUrl.includes("chrome-extension://") ||
    requestUrl.includes("vercel-insights") ||
    requestUrl.includes("/_vercel") ||
    requestUrl.includes("/_next/static/chunks") ||
    requestUrl.includes("/_next/static/media")
  ) {
    return;
  }

  if (
    requestUrl.includes("/api/") ||
    !requestUrl.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        // Network failed, return a simple offline response for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html").catch(() => {
            return new Response("Offline", {
              status: 503,
              statusText: "Service Unavailable",
            });
          });
        }
        // For other requests, just return a network error
        return new Response("Network error", {
          status: 503,
          statusText: "Service Unavailable",
        });
      });
    })
  );
});

// Push event handler - Following MDN Web Push API Standards
self.addEventListener("push", (event) => {
  console.log("[SW] 📨 Push notification received");

  // Default notification configuration
  const defaultNotification = {
    title: "SoulArt",
    body: "ახალი შეტყობინება",
    icon: "/android-icon-192x192.png",
    badge: "/android-icon-96x96.png",
    tag: "soulart-notification",
    requireInteraction: false,
    silent: false,
    data: {
      url: "/",
      type: "general",
      timestamp: Date.now(),
    },
    actions: [
      {
        action: "open",
        title: "გახსნა",
        icon: "/android-icon-96x96.png",
      },
      {
        action: "dismiss",
        title: "დახურვა",
      },
    ],
  };

  let notificationOptions = { ...defaultNotification };

  // Parse push payload according to MDN specifications
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log("[SW] 📨 Parsed payload:", payload);

      // Merge with default options
      notificationOptions = {
        ...defaultNotification,
        ...payload,
        // Ensure required fields are present
        icon: payload.icon || defaultNotification.icon,
        badge: payload.badge || defaultNotification.badge,
        data: {
          ...defaultNotification.data,
          ...(payload.data || {}),
        },
      };
    } catch (parseError) {
      console.warn(
        "[SW] ⚠️ Failed to parse JSON payload, using text:",
        parseError
      );
      // Fallback to text content
      const textData = event.data.text();
      if (textData) {
        notificationOptions.body = textData;
      }
    }
  }

  // Enhanced notification options for better UX
  const enhancedOptions = {
    ...notificationOptions,
    // Add vibration pattern for mobile
    vibrate: [200, 100, 200],
    // Timestamp for ordering
    timestamp: notificationOptions.data.timestamp || Date.now(),
    // Renotify to ensure visibility
    renotify: true,
  };

  console.log("[SW] 📨 Displaying notification:", enhancedOptions);

  // Show notification using MDN recommended pattern
  event.waitUntil(
    self.registration
      .showNotification(enhancedOptions.title, enhancedOptions)
      .then(() => {
        console.log("[SW] ✅ Notification displayed successfully");

        // Optional: Track notification display
        if (self.clients) {
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "NOTIFICATION_DISPLAYED",
                data: enhancedOptions,
              });
            });
          });
        }
      })
      .catch((error) => {
        console.error("[SW] ❌ Failed to show notification:", error);
      })
  );
});

// Notification click handler - Enhanced UX following MDN patterns
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] 🖱️ Notification click event:", {
    action: event.action,
    tag: event.notification.tag,
    data: event.notification.data,
  });

  // Always close the notification first
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  // Handle dismiss action
  if (action === "dismiss") {
    console.log("[SW] 👋 Notification dismissed by user");

    // Optional: Track dismissal
    if (self.clients) {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "NOTIFICATION_DISMISSED",
            data: notificationData,
          });
        });
      });
    }
    return;
  }

  // Determine URL to open based on notification data
  let urlToOpen = "/";

  if (notificationData.url) {
    urlToOpen = notificationData.url;
  } else if (notificationData.type) {
    // Smart URL routing based on notification type
    switch (notificationData.type) {
      case "new_product":
        urlToOpen = notificationData.id
          ? `/products/${notificationData.id}`
          : "/products";
        break;
      case "discount":
        urlToOpen = "/products?filter=discount";
        break;
      case "order_status":
        urlToOpen = notificationData.id
          ? `/orders/${notificationData.id}`
          : "/orders";
        break;
      case "product_approved":
      case "product_rejected":
        urlToOpen = "/profile/products";
        break;
      case "new_forum_post":
        urlToOpen = notificationData.id
          ? `/forum/${notificationData.id}`
          : "/forum";
        break;
      default:
        urlToOpen = "/";
    }
  }

  console.log("[SW] 🌐 Opening URL:", urlToOpen);

  // Enhanced client management following MDN best practices
  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Try to find existing SoulArt window
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);

          if (clientUrl.origin === self.location.origin) {
            console.log("[SW] 🎯 Focusing existing SoulArt window");

            // Navigate to target URL if different
            if (clientUrl.pathname !== targetUrl.pathname) {
              client.navigate(urlToOpen);
            }

            return client.focus();
          }
        }

        // No existing window found, open new one
        if (self.clients.openWindow) {
          console.log("[SW] 🆕 Opening new SoulArt window");
          return self.clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error("[SW] ❌ Error handling notification click:", error);
      })
  );
});

// Notification close event (when user dismisses without clicking)
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] ✖️ Notification closed:", event.notification.tag);

  // Optional: Track notification close for analytics
  if (self.clients) {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "NOTIFICATION_CLOSED",
          data: event.notification.data,
        });
      });
    });
  }
});

// Background sync for offline notification handling
self.addEventListener("sync", (event) => {
  console.log("[SW] 🔄 Background sync event:", event.tag);

  if (event.tag === "push-notification-sync") {
    event.waitUntil(
      // Handle offline notifications when back online
      handleOfflineNotifications()
    );
  }
});

// Handle offline notifications
async function handleOfflineNotifications() {
  try {
    console.log("[SW] 📡 Checking for offline notifications...");

    // Check if we have pending notifications to send
    const cache = await caches.open(RUNTIME_CACHE);
    const offlineNotifications = await cache.match("/offline-notifications");

    if (offlineNotifications) {
      const notifications = await offlineNotifications.json();

      for (const notification of notifications) {
        await self.registration.showNotification(
          notification.title,
          notification.options
        );
      }

      // Clear offline notifications
      await cache.delete("/offline-notifications");
      console.log("[SW] ✅ Offline notifications processed");
    }
  } catch (error) {
    console.error("[SW] ❌ Error handling offline notifications:", error);
  }
}

// Link interception for PWA - Make external links open within app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "NAVIGATE_TO_URL") {
    const url = event.data.url;
    console.log("[SW] 🔗 Intercepting navigation to:", url);

    // Try to find an existing window to navigate
    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // Find the client that sent the message
          const client = clientList.find((c) => c.id === event.source.id);
          if (client) {
            // Navigate the existing client
            return client.navigate(url);
          } else if (clientList.length > 0) {
            // Navigate the first available client
            return clientList[0].navigate(url);
          } else {
            // Open new window if no clients available
            return self.clients.openWindow(url);
          }
        })
    );
  }
});

// Handle URL protocol requests for PWA
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip internal Next.js and API requests
  if (
    requestUrl.pathname.includes("/_next/") ||
    requestUrl.pathname.includes("/__nextjs") ||
    requestUrl.pathname.includes("/socket.io") ||
    requestUrl.pathname.includes("/sockjs") ||
    requestUrl.pathname.includes("chrome-extension://") ||
    requestUrl.pathname.includes("vercel-insights") ||
    requestUrl.pathname.includes("/_vercel") ||
    requestUrl.pathname.includes("/api/")
  ) {
    return;
  }

  // For navigation requests (links clicked within PWA)
  if (event.request.mode === "navigate") {
    console.log("[SW] 🌐 Navigation request intercepted:", event.request.url);

    // Check if this is a same-origin request
    if (requestUrl.origin === self.location.origin) {
      // Handle same-origin navigation normally
      event.respondWith(
        fetch(event.request).catch(() => {
          // Fallback to offline page if available
          return caches.match("/offline") || caches.match("/");
        })
      );
    } else {
      // For external links, redirect to internal handler
      const internalUrl = `/?external_url=${encodeURIComponent(
        event.request.url
      )}`;
      event.respondWith(Response.redirect(internalUrl, 302));
    }
  }
});

console.log(
  "[SW] 🚀 Service Worker initialized with push notification support and link interception"
);
