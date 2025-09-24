"use client";

import { useEffect } from "react";
import useServiceWorker from "@/hooks/use-service-worker";
import DynamicManifest from "./dynamic-manifest";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  useServiceWorker();

  useEffect(() => {
    // Add viewport meta tag for better mobile experience
    if (typeof window !== "undefined") {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        const meta = document.createElement("meta");
        meta.name = "viewport";
        meta.content =
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
        document.head.appendChild(meta);
      }

      // Add iOS Safari specific meta tags
      const iosMetaTags = [
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "apple-mobile-web-app-title", content: "SoulArt" },
        { name: "mobile-web-app-capable", content: "yes" },
      ];

      iosMetaTags.forEach(({ name, content }) => {
        if (!document.querySelector(`meta[name="${name}"]`)) {
          const meta = document.createElement("meta");
          meta.name = name;
          meta.content = content;
          document.head.appendChild(meta);
        }
      });

      // Handle iOS Safari navigation gestures
      document.addEventListener("touchstart", () => {}, { passive: true });
    }
  }, []);

  return (
    <>
      <DynamicManifest />
      {children}
    </>
  );
}

export default PWAProvider;
