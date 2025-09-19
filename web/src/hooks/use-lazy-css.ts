"use client";

import { useEffect } from "react";

/**
 * Hook to dynamically load CSS files only when needed
 * This helps reduce the number of preloaded CSS files that aren't immediately used
 */
export const useLazyCSS = (cssPath: string, condition: boolean = true) => {
  useEffect(() => {
    if (!condition) return;

    // Check if CSS is already loaded
    const existingLink = document.querySelector(
      `link[href*="${cssPath}"]`
    ) as HTMLLinkElement;
    if (existingLink) return;

    // Create and load CSS dynamically
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssPath;
    link.onload = () => {
      // Remove preload attribute if it exists
      link.removeAttribute("data-preload");
    };

    // Add to head
    document.head.appendChild(link);

    // Cleanup function
    return () => {
      const linkToRemove = document.querySelector(`link[href*="${cssPath}"]`);
      if (linkToRemove && linkToRemove.parentNode) {
        linkToRemove.parentNode.removeChild(linkToRemove);
      }
    };
  }, [cssPath, condition]);
};

/**
 * Hook to reduce CSS preloading by removing unused preload links
 */
export const useReducePreloads = () => {
  useEffect(() => {
    // Run after initial page load
    const timer = setTimeout(() => {
      // Find all preloaded CSS links
      const preloadedLinks = document.querySelectorAll(
        'link[rel="preload"][as="style"]'
      ) as NodeListOf<HTMLLinkElement>;

      preloadedLinks.forEach((link) => {
        // Check if the corresponding stylesheet is actually loaded/used
        const href = link.href;
        const actualStylesheet = document.querySelector(
          `link[rel="stylesheet"][href="${href}"]`
        ) as HTMLLinkElement;

        // If no actual stylesheet found, remove the preload (it's not being used)
        if (!actualStylesheet) {
          console.log("Removing unused CSS preload:", href);
          link.remove();
        }
      });
    }, 3000); // Wait 3 seconds after load

    return () => clearTimeout(timer);
  }, []);
};
