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
      console.log("PWA Status:", {
        isInstalled: isRunningAsInstalledPWA(),
        isMobile: isMobileDevice(),
        shouldEnablePWA: isRunningAsInstalledPWA() && isMobileDevice(),
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
