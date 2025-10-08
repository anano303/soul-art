"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const FB_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1189697243076610";

export const pageview = () => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
};

// Standard Events
export const trackEvent = (name: string, options = {}) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", name, options);
  }
};

// Custom Events
export const trackCustomEvent = (name: string, options = {}) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("trackCustom", name, options);
  }
};

// Standard Facebook Events for e-commerce
export const trackViewContent = (
  contentName: string,
  contentId: string,
  value: number,
  currency = "GEL"
) => {
  trackEvent("ViewContent", {
    content_name: contentName,
    content_ids: [contentId],
    content_type: "product",
    value: value,
    currency: currency,
  });
};

export const trackAddToCart = (
  contentName: string,
  contentId: string,
  value: number,
  currency = "GEL"
) => {
  trackEvent("AddToCart", {
    content_name: contentName,
    content_ids: [contentId],
    content_type: "product",
    value: value,
    currency: currency,
  });
};

export const trackInitiateCheckout = (
  value: number,
  currency = "GEL",
  numItems: number
) => {
  trackEvent("InitiateCheckout", {
    value: value,
    currency: currency,
    num_items: numItems,
  });
};

export const trackPurchase = (
  value: number,
  currency = "GEL",
  orderId: string
) => {
  trackEvent("Purchase", {
    value: value,
    currency: currency,
    content_type: "product",
    order_id: orderId,
  });
};

export const trackSearch = (searchString: string) => {
  trackEvent("Search", {
    search_string: searchString,
  });
};

export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page views when route changes
    pageview();
  }, [pathname, searchParams]);

  return null;
}
