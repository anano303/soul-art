"use client";

import { useEffect, useRef } from "react";

const ADSENSE_CLIENT_ID = "ca-pub-2218295750130717";

interface AdUnitProps {
  /** The ad slot ID from Google AdSense */
  slot: string;
  /** Ad format - 'auto' for responsive, or specific format */
  format?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal";
  /** Whether to enable full-width responsive mode */
  fullWidthResponsive?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Custom inline styles for the container */
  style?: React.CSSProperties;
}

/**
 * Reusable AdSense Ad Unit Component
 * 
 * Usage:
 * ```tsx
 * <AdUnit slot="4167693292" />
 * <AdUnit slot="4167693292" format="rectangle" />
 * <AdUnit slot="4167693292" className="my-ad" style={{ marginTop: 20 }} />
 * ```
 */
export function AdUnit({
  slot,
  format = "auto",
  fullWidthResponsive = true,
  className = "",
  style = {},
}: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isAdPushed = useRef(false);

  useEffect(() => {
    // Only push ad once per component mount
    if (isAdPushed.current) return;

    try {
      // Check if adsbygoogle is loaded
      if (typeof window !== "undefined" && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isAdPushed.current = true;
      } else {
        // If not loaded yet, wait for it
        const checkInterval = setInterval(() => {
          if (window.adsbygoogle) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            isAdPushed.current = true;
            clearInterval(checkInterval);
          }
        }, 100);

        // Clear interval after 10 seconds to prevent memory leaks
        setTimeout(() => clearInterval(checkInterval), 10000);
      }
    } catch (error) {
      console.error("AdSense error:", error);
    }
  }, []);

  // Don't show ads in development (optional - remove if you want to test)
  if (process.env.NODE_ENV === "development") {
    return (
      <div
        className={className}
        style={{
          display: "block",
          background: "#f0f0f0",
          border: "2px dashed #ccc",
          padding: "20px",
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
          ...style,
        }}
      >
        📢 Ad Placeholder (slot: {slot})
        <br />
        <small>Ads only show in production</small>
      </div>
    );
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={{
        display: "block",
        ...style,
      }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive.toString()}
    />
  );
}
