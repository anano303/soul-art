"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageViewWithPath } from "@/lib/ga4-analytics";

/**
 * Automatic Page View and User Path Tracker
 * Tracks every page navigation and builds user journey path
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      // Get page title
      const pageTitle = document.title;
      
      // Track page view with automatic path building
      trackPageViewWithPath(pathname, pageTitle);
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}
