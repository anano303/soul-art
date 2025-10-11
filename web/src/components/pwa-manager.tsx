"use client";

import { useEffect } from "react";
import {
  initializePWA,
  isRunningAsInstalledPWA,
  isMobileDevice,
} from "@/utils/pwa";

/**
 * PWA Manager Component
 * Handles conditional PWA functionality based on installation status and device type
 */
export default function PWAManager() {
  useEffect(() => {
    // Initialize PWA functionality
    initializePWA();

    // Log current PWA status for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("PWA Manager initialized:", {
        isInstalled: isRunningAsInstalledPWA(),
        isMobile: isMobileDevice(),
        environment: process.env.NODE_ENV,
        serviceWorkerSupported: "serviceWorker" in navigator,
        notificationSupported: "Notification" in window,
      });
    }

    // Check if service worker is already registered
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (process.env.NODE_ENV === "development") {
          console.log("Current SW registrations:", registrations.length);
          registrations.forEach((registration, index) => {
            console.log(`SW ${index + 1}:`, registration.scope);
          });
        }
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
