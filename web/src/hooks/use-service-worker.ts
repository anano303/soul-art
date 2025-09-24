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

    setSwState(prev => ({ ...prev, isSupported: true }));

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none" // Always check for updates
        });

        console.log("✅ SW registered successfully:", registration);
        setSwState(prev => ({ ...prev, isRegistered: true }));

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("🔄 SW update found");
          
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("✨ SW update ready");
                setSwState(prev => ({ ...prev, updateAvailable: true }));
                
                // Notify user about update
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("SoulArt განახლდა", {
                    body: "ახალი ვერსია ხელმისაწვდომია. გთხოვთ განაახლოთ გვერდი.",
                    icon: "/soulart_icon_blue_fullsizes.ico",
                    tag: "sw-update"
                  });
                }
              }
            });
          }
        });

        // Check if there's an update waiting
        if (registration.waiting) {
          setSwState(prev => ({ ...prev, updateAvailable: true }));
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
      setSwState(prev => ({ ...prev, isOffline: !navigator.onLine }));
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    // Preload critical resources
    const preloadCriticalResources = () => {
      const criticalResources = [
        "/",
        "/shop",
        "/soulart_icon_blue_fullsizes.ico",
        "/logo.png"
      ];

      criticalResources.forEach(url => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        document.head.appendChild(link);
      });
    };

    // Initialize
    registerSW();
    preloadCriticalResources();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
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
