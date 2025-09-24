"use client";

import { useEffect, useState } from "react";

declare global {
  function gtag(...args: unknown[]): void;
}

interface PWAMetrics {
  isInstalled: boolean;
  isOnline: boolean;
  installPromptAvailable: boolean;
  lastInstallPromptShown?: Date;
  userAgent: string;
  displayMode: string;
}

export function usePWAMetrics() {
  const [metrics, setMetrics] = useState<PWAMetrics>({
    isInstalled: false,
    isOnline: true,
    installPromptAvailable: false,
    userAgent: "",
    displayMode: "browser",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateMetrics = () => {
      setMetrics((prev) => ({
        ...prev,
        isInstalled:
          window.matchMedia("(display-mode: standalone)").matches ||
          window.navigator.standalone === true,
        isOnline: navigator.onLine,
        userAgent: navigator.userAgent,
        displayMode: window.matchMedia("(display-mode: standalone)").matches
          ? "standalone"
          : "browser",
      }));
    };

    // Initial metrics
    updateMetrics();

    // Listen for online/offline changes
    window.addEventListener("online", updateMetrics);
    window.addEventListener("offline", updateMetrics);

    // Listen for display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener("change", updateMetrics);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = () => {
      setMetrics((prev) => ({
        ...prev,
        installPromptAvailable: true,
        lastInstallPromptShown: new Date(),
      }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Track PWA usage
    if (metrics.isInstalled) {
      // Send analytics event for PWA usage
      if (typeof gtag !== "undefined") {
        gtag("event", "pwa_usage", {
          event_category: "PWA",
          event_label: "app_launched_from_homescreen",
        });
      }
    }

    return () => {
      window.removeEventListener("online", updateMetrics);
      window.removeEventListener("offline", updateMetrics);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      mediaQuery.removeEventListener("change", updateMetrics);
    };
  }, [metrics.isInstalled]);

  return metrics;
}

export const trackPWAEvent = (
  eventName: string,
  properties?: Record<string, unknown>
) => {
  if (typeof gtag !== "undefined") {
    gtag("event", eventName, {
      event_category: "PWA",
      ...properties,
    });
  }

  // Also log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("PWA Event:", eventName, properties);
  }
};

export default usePWAMetrics;
