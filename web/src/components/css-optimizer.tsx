"use client";

import { useEffect } from "react";
import { useReducePreloads } from "@/hooks/use-lazy-css";

/**
 * Component to handle CSS loading optimizations
 * Reduces unnecessary preloads and loads performance CSS dynamically
 */
export default function CSSOptimizer() {
  // Remove unused preloads
  useReducePreloads();

  useEffect(() => {
    // Dynamically load performance CSS when needed
    const loadPerformanceCSS = () => {
      if (document.querySelector('link[href*="performance.css"]')) return;

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/styles/performance.css";
      document.head.appendChild(link);
    };

    // Load performance CSS after initial render
    setTimeout(loadPerformanceCSS, 100);

    // Optimize CSS preloading
    const optimizePreloads = () => {
      // Remove rel="preload" from CSS links that haven't been used
      const preloads = document.querySelectorAll(
        'link[rel="preload"][as="style"]'
      );
      preloads.forEach((link) => {
        const href = link.getAttribute("href");
        if (href) {
          // Check if the actual stylesheet exists
          const stylesheet = document.querySelector(
            `link[rel="stylesheet"][href="${href}"]`
          );
          if (!stylesheet) {
            // Convert preload to regular link to avoid the warning
            link.setAttribute("rel", "stylesheet");
            link.removeAttribute("as");
          }
        }
      });
    };

    // Run optimization after page load
    const timer = setTimeout(optimizePreloads, 2000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
