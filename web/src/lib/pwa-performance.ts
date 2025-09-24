/**
 * PWA Performance Utilities
 *
 * This file contains utilities focused on improving PWA performance.
 */

/**
 * Detect if the app is running as a PWA
 */
export function isPwaMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (window.navigator as any).standalone === true // iOS PWA detection
  );
}

/**
 * Apply PWA-specific optimizations
 */
export function applyPwaOptimizations(): void {
  if (typeof window === "undefined") return;

  if (isPwaMode()) {
    // Apply PWA-specific CSS class for styling
    document.body.classList.add("pwa-mode");

    // Prevent pull-to-refresh in PWA mode
    document.body.style.overscrollBehavior = "none";

    // Set safe area insets for notched devices
    document.documentElement.style.setProperty(
      "--safe-area-inset-top",
      "env(safe-area-inset-top)"
    );
    document.documentElement.style.setProperty(
      "--safe-area-inset-bottom",
      "env(safe-area-inset-bottom)"
    );

    // Disable text selection for app-like feel (can be re-enabled in specific elements)
    document.body.style.userSelect = "none";

    // Apply touch action improvements
    document.body.style.touchAction = "manipulation";

    // Apply high contrast mode detection
    if (window.matchMedia("(prefers-contrast: more)").matches) {
      document.body.classList.add("high-contrast");
    }
  }
}

/**
 * Warm up runtime caches for frequently accessed routes
 */
export async function warmupRuntimeCache(): Promise<void> {
  if (
    typeof window === "undefined" ||
    !navigator.serviceWorker ||
    !navigator.serviceWorker.controller
  ) {
    return;
  }

  const routes = ["/shop", "/forum", "/cart"];

  // Only warm up cache when idle and after initial load
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(
      () => {
        setTimeout(() => {
          routes.forEach((route) => {
            fetch(route, {
              method: "HEAD",
              credentials: "same-origin",
              headers: { purpose: "prefetch" }, // Signal this is a prefetch
            }).catch(() => {}); // Silent error handling
          });
        }, 2000); // Wait 2s after idle
      },
      { timeout: 10000 }
    );
  }
}

/**
 * Apply runtime performance optimizations
 */
export function optimizeRuntimePerformance(): void {
  if (typeof window === "undefined") return;

  // Use passive event listeners for better scroll performance
  const passiveEvents = ["touchstart", "touchmove", "wheel", "mousewheel"];
  passiveEvents.forEach((eventName) => {
    window.addEventListener(eventName, () => {}, { passive: true });
  });

  // Optimize animation frames by using debounced requestAnimationFrame for non-critical UI updates
  (window as any).debouncedRAF = (callback: FrameRequestCallback) => {
    let rafId: number | null = null;
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(callback);
    };
  };

  // Optimize font loading to prevent layout shifts
  if ("fonts" in document) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add("fonts-loaded");
    });
  }
}

/**
 * Initialize all PWA performance optimizations
 */
export function initPwaPerformance(): void {
  applyPwaOptimizations();
  optimizeRuntimePerformance();

  // Warm cache after a short delay
  setTimeout(() => {
    warmupRuntimeCache();
  }, 3000);
}
