// AppShellLoader.js
"use client";

import React, { useState, useEffect } from "react";
import { isPwaMode } from "@/lib/pwa-performance";

interface AppShellLoaderProps {
  children: React.ReactNode;
}

/**
 * AppShellLoader component
 *
 * This component implements the App Shell architecture for PWAs:
 * 1. Shows a minimal UI instantly (header, footer, layout)
 * 2. Loads content progressively
 * 3. Caches shell for instant loading on subsequent visits
 */
export default function AppShellLoader({ children }: AppShellLoaderProps) {
  const [isShellLoaded, setIsShellLoaded] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [isPwa, setIsPwa] = useState(false);

  // Simulate shell loading - this would actually be the minimal UI that loads immediately
  useEffect(() => {
    setIsPwa(isPwaMode());

    // Shell should load almost instantly
    const shellTimer = setTimeout(() => {
      setIsShellLoaded(true);
    }, 100);

    // Content loads with a slight delay to ensure shell is visible first
    const contentTimer = setTimeout(() => {
      setIsContentLoaded(true);
    }, 300);

    return () => {
      clearTimeout(shellTimer);
      clearTimeout(contentTimer);
    };
  }, []);

  // If not in PWA mode, just render children normally
  if (!isPwa) {
    return <>{children}</>;
  }

  // In PWA mode, implement app shell architecture
  return (
    <>
      {/* App Shell - this is always visible immediately */}
      <div className={`app-shell ${isShellLoaded ? "app-shell-loaded" : ""}`}>
        {/* Shell UI - minimal version of header and navigation */}
        <div className="app-shell-header">
          {!isContentLoaded && (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow">
              <div className="w-24 h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Main content area */}
        <div
          className={`app-shell-content ${
            isContentLoaded ? "app-shell-content-loaded" : ""
          }`}
        >
          {/* Show skeleton UI until content is loaded */}
          {!isContentLoaded && (
            <div className="p-4">
              <div className="w-full h-40 bg-gray-200 dark:bg-gray-800 rounded mb-4 animate-pulse"></div>
              <div className="w-full h-6 bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse"></div>
              <div className="w-3/4 h-6 bg-gray-200 dark:bg-gray-800 rounded mb-4 animate-pulse"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Actual content */}
          <div className={`${isContentLoaded ? "opacity-100" : "opacity-0"}`}>
            {children}
          </div>
        </div>
      </div>

      {/* Styles for app shell transitions */}
      <style jsx global>{`
        .app-shell {
          min-height: 100vh;
          transition: opacity 0.3s ease-in-out;
          opacity: 0;
        }

        .app-shell-loaded {
          opacity: 1;
        }

        .app-shell-content {
          transition: opacity 0.5s ease-in-out;
        }

        .app-shell-content-loaded {
          opacity: 1;
        }
      `}</style>
    </>
  );
}
