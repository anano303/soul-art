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
  // Only register in production for installed PWAs
  if (
    "serviceWorker" in navigator &&
    process.env.NODE_ENV === "production" &&
    isRunningAsInstalledPWA()
  ) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("SW registered: ", registration);

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log("New content available; please refresh.");
              } else {
                // Content is cached for offline use
                console.log("Content is cached for offline use.");
              }
            }
          });
        }
      });
    } catch (error) {
      console.log("SW registration failed: ", error);
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
    // Only initialize in production to prevent development conflicts
    if (process.env.NODE_ENV === "production") {
      // Register service worker conditionally
      registerServiceWorkerConditionally();

      // Unregister if conditions not met
      unregisterServiceWorkerIfNeeded();

      // Listen for display mode changes
      const mediaQuery = window.matchMedia("(display-mode: standalone)");
      mediaQuery.addEventListener("change", (e) => {
        if (e.matches) {
          console.log("App is running in standalone mode");
          registerServiceWorkerConditionally();
        } else {
          console.log("App is running in browser mode");
          unregisterServiceWorkerIfNeeded();
        }
      });
    } else {
      console.log("PWA initialization skipped in development mode");
    }
  }
};
