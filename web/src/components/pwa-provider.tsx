"use client";

import { useEffect, useState } from "react";
import useServiceWorker from "@/hooks/use-service-worker";
import DynamicManifest from "./dynamic-manifest";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { isOffline, updateAvailable, updateServiceWorker } = useServiceWorker();
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setShowUpdatePrompt(true);
    }
  }, [updateAvailable]);

  useEffect(() => {
    // Optimize for PWA environment
    if (typeof window !== "undefined") {
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
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "apple-mobile-web-app-title", content: "SoulArt" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "theme-color", content: "#012645" },
        { name: "msapplication-navbutton-color", content: "#012645" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
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

      // Preload critical resources for better performance
      const criticalResources = [
        { href: "/", as: "document" },
        { href: "/soulart_icon_blue_fullsizes.ico", as: "image" },
        { href: "/logo.png", as: "image" }
      ];

      criticalResources.forEach(({ href, as }) => {
        if (!document.querySelector(`link[href="${href}"]`)) {
          const link = document.createElement("link");
          link.rel = "preload";
          link.href = href;
          link.as = as;
          document.head.appendChild(link);
        }
      });

      // PWA-specific optimizations
      if (window.matchMedia('(display-mode: standalone)').matches) {
        // Running as PWA - apply PWA-specific styles
        document.body.classList.add('pwa-mode');
        
        // Prevent pull-to-refresh in PWA
        document.body.style.overscrollBehavior = 'none';
        
        // Handle safe area insets for notched devices
        document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
        document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
      }

      // Handle iOS Safari navigation gestures - with passive listeners for better performance
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
