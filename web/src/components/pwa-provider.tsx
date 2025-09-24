"use client";

import { useEffect, useState } from "react";
import useServiceWorker from "@/hooks/use-service-worker";
import DynamicManifest from "./dynamic-manifest";
import { initPwaPerformance, isPwaMode } from "@/lib/pwa-performance";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { isOffline, updateAvailable, updateServiceWorker } =
    useServiceWorker();
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setShowUpdatePrompt(true);
    }
  }, [updateAvailable]);

  useEffect(() => {
    // Optimize for PWA environment
    if (typeof window !== "undefined") {
      // Initialize all PWA performance optimizations
      initPwaPerformance();

      // Enhanced viewport for PWA
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        const meta = document.createElement("meta");
        meta.name = "viewport";
        meta.content =
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no";
        document.head.appendChild(meta);
      }

      // iOS Safari PWA optimizations
      const iosMetaTags = [
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "SoulArt" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "theme-color", content: "#012645" },
        { name: "msapplication-navbutton-color", content: "#012645" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      ];

      iosMetaTags.forEach(({ name, content }) => {
        let existingMeta = document.querySelector(`meta[name="${name}"]`);
        if (!existingMeta) {
          const meta = document.createElement("meta");
          meta.name = name;
          meta.content = content;
          document.head.appendChild(meta);
        } else {
          existingMeta.setAttribute("content", content);
        }
      });

      // Dynamically add preload hints for JavaScript and CSS
      if (isPwaMode()) {
        // For PWA mode, aggressively preload critical resources
        const mainScriptElements = document.querySelectorAll(
          'script[src^="/_next/static/chunks/main"]'
        );
        const frameworkScriptElements = document.querySelectorAll(
          'script[src^="/_next/static/chunks/framework"]'
        );

        // Preload main scripts if they're not already loading
        if (mainScriptElements.length > 0) {
          const mainSrc = mainScriptElements[0].getAttribute("src");
          if (mainSrc && !document.querySelector(`link[href="${mainSrc}"]`)) {
            const link = document.createElement("link");
            link.rel = "preload";
            link.href = mainSrc;
            link.as = "script";
            document.head.appendChild(link);
          }
        }

        // Preload framework scripts if they're not already loading
        if (frameworkScriptElements.length > 0) {
          const frameworkSrc = frameworkScriptElements[0].getAttribute("src");
          if (
            frameworkSrc &&
            !document.querySelector(`link[href="${frameworkSrc}"]`)
          ) {
            const link = document.createElement("link");
            link.rel = "preload";
            link.href = frameworkSrc;
            link.as = "script";
            document.head.appendChild(link);
          }
        }
      }
      const handleTouch = () => {};
      document.addEventListener("touchstart", handleTouch, { passive: true });
      document.addEventListener("touchmove", handleTouch, { passive: true });

      // Cleanup
      return () => {
        document.removeEventListener("touchstart", handleTouch);
        document.removeEventListener("touchmove", handleTouch);
      };
    }
  }, []);

  return (
    <>
      <DynamicManifest />

      {/* Update notification */}
      {showUpdatePrompt && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
          <p className="text-sm font-medium">ახალი ვერსია ხელმისაწვდომია!</p>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={() => {
                updateServiceWorker();
                setShowUpdatePrompt(false);
              }}
              className="text-xs bg-white text-blue-600 px-3 py-1 rounded"
            >
              განახლება
            </button>
            <button
              onClick={() => setShowUpdatePrompt(false)}
              className="text-xs text-blue-200 underline"
            >
              მოგვიანებით
            </button>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed bottom-4 right-4 z-40 bg-red-600 text-white p-3 rounded-lg shadow-lg">
          <p className="text-sm font-medium">📡 ოფლაინ რეჟიმი</p>
        </div>
      )}

      {children}
    </>
  );
}

export default PWAProvider;
