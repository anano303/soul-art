"use client";

import { useEffect, useState } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  updateAvailable: boolean;
  isOffline: boolean;
}

export function useServiceWorker() {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    updateAvailable: false,
    isOffline: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    setSwState((prev) => ({ ...prev, isSupported: true }));

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none", // Always check for updates
        });

        console.log("✅ SW registered successfully:", registration);
        setSwState((prev) => ({ ...prev, isRegistered: true }));

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("🔄 SW update found");

          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("✨ SW update ready");
                setSwState((prev) => ({ ...prev, updateAvailable: true }));

                // Notify user about update
                if (
                  "Notification" in window &&
                  Notification.permission === "granted"
                ) {
                  new Notification("SoulArt განახლდა", {
                    body: "ახალი ვერსია ხელმისაწვდომია. გთხოვთ განაახლოთ გვერდი.",
                    icon: "/soulart_icon_blue_fullsizes.ico",
                    tag: "sw-update",
                  });
                }
              }
            });
          }
        });

        // Check if there's an update waiting
        if (registration.waiting) {
          setSwState((prev) => ({ ...prev, updateAvailable: true }));
        }

        // Listen for the controlling service worker changing and reload
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("🔄 SW controller changed - reloading");
          window.location.reload();
        });
      } catch (error) {
        console.error("❌ SW registration failed:", error);
      }
    };

    // Monitor online/offline status
    const updateOnlineStatus = () => {
      setSwState((prev) => ({ ...prev, isOffline: !navigator.onLine }));
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    // Enhanced resource loading strategy - moved outside useEffect
    registerSW();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);
  
  // Implement optimized resource loading outside useEffect
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Critical resources for immediate loading (high priority)
    const criticalResources = [
      { url: "/", type: "document" },
      { url: "/logo.png", type: "image" },
      { url: "/soulart_icon_blue_fullsizes.ico", type: "image" },
      { url: "/_next/static/chunks/main", type: "script" },
      { url: "/_next/static/chunks/framework", type: "script" },
      { url: "/_next/static/chunks/app/layout", type: "script" },
    ];

    // Important but not critical resources (medium priority)
    const importantResources = [
      { url: "/shop", type: "document" },
      { url: "/cart", type: "document" },
      { url: "/logo-white.png", type: "image" },
    ];

    // Future navigation resources (low priority)
    const futureResources = [
      { url: "/forum", type: "document" },
      { url: "/about", type: "document" },
      { url: "/offline", type: "document" },
    ];

    // Preload critical resources (high priority) - loads immediately
    criticalResources.forEach(({ url, type }) => {
      const link = document.createElement("link");
      link.rel = "preload"; // Higher priority than prefetch
      link.href = url;
      link.as = type;
      document.head.appendChild(link);
    });

    // Prefetch important resources - loads after critical resources
    // These will be cached by the browser but won't block render
    importantResources.forEach(({ url, type }) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      link.as = type;
      document.head.appendChild(link);
    });

    // Preconnect to critical origins
    const origins = [
      "https://res.cloudinary.com",
      "https://fish-hunt.s3.eu-north-1.amazonaws.com",
      location.origin,
    ];

    origins.forEach((origin) => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    });

    // Use requestIdleCallback to load future resources when browser is idle
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(
        () => {
          futureResources.forEach(({ url, type }) => {
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.href = url;
            link.as = type;
            document.head.appendChild(link);
          });
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Expose update function
  const updateServiceWorker = () => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return {
    ...swState,
    updateServiceWorker,
  };
}

export default useServiceWorker;