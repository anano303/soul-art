"use client";

import { useEffect, useState } from "react";

export function useCacheStatus() {
  const [cacheStatus, setCacheStatus] = useState<{
    isStale: boolean;
    lastUpdate: Date | null;
    hasUpdates: boolean;
  }>({
    isStale: false,
    lastUpdate: null,
    hasUpdates: false,
  });

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Listen for cache update messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "CACHE_UPDATED") {
        setCacheStatus((prev) => ({
          ...prev,
          lastUpdate: new Date(),
          hasUpdates: true,
        }));

        // Show user notification that fresh data is available
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("ახალი მონაცემები ხელმისაწვდომია", {
            body: "ღილაკზე დაჭერით განახლებისთვის",
            icon: "/logo.png",
            tag: "cache-update",
          });
        }
      }

      if (event.data?.type === "CACHE_CLEARED") {
        setCacheStatus({
          isStale: false,
          lastUpdate: new Date(),
          hasUpdates: false,
        });
      }
    });

    // Request cache update check on mount
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "CACHE_UPDATE_REQUEST",
      });
    });

    // Check cache status periodically
    const interval = setInterval(() => {
      const lastCacheCheck = localStorage.getItem("last-cache-check");
      if (lastCacheCheck) {
        const lastCheck = new Date(lastCacheCheck);
        const now = new Date();
        const timeDiff = now.getTime() - lastCheck.getTime();

        // Consider cache stale after 10 minutes
        if (timeDiff > 10 * 60 * 1000) {
          setCacheStatus((prev) => ({ ...prev, isStale: true }));
        }
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const refreshCache = async () => {
    if (!("serviceWorker" in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: "FORCE_CACHE_CLEAR",
      });

      // Store cache check time
      localStorage.setItem("last-cache-check", new Date().toISOString());

      setCacheStatus({
        isStale: false,
        lastUpdate: new Date(),
        hasUpdates: false,
      });

      return true;
    } catch (error) {
      console.error("Cache refresh failed:", error);
      return false;
    }
  };

  return {
    ...cacheStatus,
    refreshCache,
  };
}
