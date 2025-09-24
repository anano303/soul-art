"use client";

import { useEffect } from "react";

export function usePerformanceOptimizations() {
  useEffect(() => {
    // Mobile-specific optimizations
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent
      );

    if (isMobileDevice) {
      // Reduce animation duration on mobile for better performance
      document.documentElement.style.setProperty(
        "--animation-duration",
        "0.2s"
      );

      // Add touch optimization classes
      document.body.classList.add("mobile-optimized");
    }

    // Check if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.style.setProperty(
        "--animation-duration",
        "0.01ms"
      );
    }

    // Basic performance monitoring (simplified)
    if (process.env.NODE_ENV === "development") {
      console.log("Performance optimizations applied");
    }
  }, []);
}

// Performance monitoring utilities
export const performanceUtils = {
  // Debounce function for performance
  debounce: <T extends any[]>(fn: (...args: T) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: T) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  },

  // Throttle function for scroll events
  throttle: <T extends any[]>(fn: (...args: T) => void, wait: number) => {
    let inThrottle: boolean;
    return (...args: T) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), wait);
      }
    };
  },

  // Check if user prefers reduced motion
  prefersReducedMotion: () => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },
};
