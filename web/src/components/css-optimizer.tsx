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

    // Optimize CSS preloading with specific focus on chat components
    const optimizePreloads = () => {
      // Remove rel="preload" from CSS links that haven't been used
      const preloads = document.querySelectorAll(
        'link[rel="preload"][as="style"]'
      );
      
      preloads.forEach((link) => {
        const href = link.getAttribute("href");
        if (href) {
          // Special handling for MessengerChat and other dynamic components
          const isMessengerChat = href.includes("MessengerChat");
          const isDynamicComponent = href.includes("_app-pages-browser_src_components_");
          
          // Check if the actual stylesheet exists
          const stylesheet = document.querySelector(
            `link[rel="stylesheet"][href="${href}"]`
          );
          
          if (!stylesheet) {
            // For dynamic components, remove the preload entirely
            if (isMessengerChat || isDynamicComponent) {
              console.log("Removing unused CSS preload:", href);
              link.remove();
            } else {
              // For other components, convert preload to regular link
              link.setAttribute("rel", "stylesheet");
              link.removeAttribute("as");
            }
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
