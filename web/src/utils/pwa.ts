// PWA Detection and Management Utilities

/**
 * Detects if the app is running as an installed PWA
 */
export const isRunningAsInstalledPWA = (): boolean => {
  if (typeof window === "undefined") return false;

  // Check if running in standalone mode (installed PWA)
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // Check if running in fullscreen mode (some PWAs)
  const isFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;

  // Check if running in minimal-ui mode (some PWAs)
  const isMinimalUi = window.matchMedia("(display-mode: minimal-ui)").matches;

  // Check for navigator.standalone (iOS Safari)
  const isIOSStandalone =
    "standalone" in window.navigator && (window.navigator as any).standalone;

  // Check if launched from home screen
  const isFromHomescreen = window.location.search.includes(
    "utm_source=homescreen"
  );

  return (
    isStandalone ||
    isFullscreen ||
    isMinimalUi ||
    isIOSStandalone ||
    isFromHomescreen
  );
};

/**
 * Detects if the device is mobile
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;

  // Mobile device patterns
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i,
  ];

  return mobilePatterns.some((pattern) => pattern.test(userAgent));
};

/**
 * Registers service worker conditionally - only in production when installed
 */
export const registerServiceWorkerConditionally = async (): Promise<void> => {
  // Register service worker if push notifications are supported
  // This allows push notifications to work in both browser and PWA modes
  if ("serviceWorker" in navigator && "Notification" in window) {
    try {
      // Try to register sw.js first (includes both caching and push notifications)
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      if (process.env.NODE_ENV === "development") {
        console.log("SW registered with push support: ", registration);
      }

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // New update available
                if (process.env.NODE_ENV === "development") {
                  console.log("New content available; please refresh.");
                }
              } else {
                // Content is cached for offline use
                if (process.env.NODE_ENV === "development") {
                  console.log("Content is cached for offline use.");
                }
              }
            }
          });
        }
      });

      // Log current registration status
      if (process.env.NODE_ENV === "development") {
        console.log("Service Worker registered with push support");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Service Worker registration failed:", error);
      }
    }
  } else {
    if (process.env.NODE_ENV === "development") {
      console.log("Service Worker or Notifications not supported");
    }
  }
};

/**
 * Unregisters service worker only if in browser mode and production
 */
export const unregisterServiceWorkerIfNeeded = async (): Promise<void> => {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();

    // Only unregister in production if not installed PWA and not mobile
    if (
      process.env.NODE_ENV === "production" &&
      !isRunningAsInstalledPWA() &&
      !isMobileDevice()
    ) {
      for (const registration of registrations) {
        await registration.unregister();
        console.log(
          "Service worker unregistered - browser mode on desktop in production"
        );
      }
    }
  }
};

/**
 * Initialize PWA functionality
 */
export const initializePWA = (): void => {
  if (typeof window !== "undefined") {
    // Always register service worker if push notifications are supported
    // This allows push notifications to work in both development and production
    if ("serviceWorker" in navigator && "Notification" in window) {
      registerServiceWorkerConditionally();

      // Listen for display mode changes
      const mediaQuery = window.matchMedia("(display-mode: standalone)");
      mediaQuery.addEventListener("change", (e) => {
        if (process.env.NODE_ENV === "development") {
          if (e.matches) {
            console.log("App is running in standalone mode");
          } else {
            console.log("App is running in browser mode");
          }
        }
      });

      if (process.env.NODE_ENV === "development") {
        console.log("PWA/Service Worker initialized for push notifications");
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("Service Worker or Notifications not supported");
      }
    }
  }
};
