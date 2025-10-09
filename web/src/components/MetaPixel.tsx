"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getUserData } from "@/lib/auth";

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
    // Get current user data from localStorage
    const currentUser = getUserData();

    // Enhanced PageView with user data for Advanced Matching
    const enhancedData: any = {};

    // Add user data if available (for logged-in users)
    if (currentUser) {
      if (currentUser.email) {
        enhancedData.em = currentUser.email;
        console.log(
          "🔍 Meta Pixel: Adding email for advanced matching:",
          currentUser.email
        );
      }
      if (currentUser.phoneNumber) {
        enhancedData.ph = currentUser.phoneNumber;
        console.log(
          "🔍 Meta Pixel: Adding phone for advanced matching:",
          currentUser.phoneNumber
        );
      }
      if (currentUser.name) {
        const [firstName, ...lastNameParts] = currentUser.name.split(" ");
        enhancedData.fn = firstName;
        if (lastNameParts.length > 0) {
          enhancedData.ln = lastNameParts.join(" ");
        }
        console.log(
          "🔍 Meta Pixel: Adding name for advanced matching:",
          currentUser.name
        );
      } else if (currentUser.ownerFirstName && currentUser.ownerLastName) {
        enhancedData.fn = currentUser.ownerFirstName;
        enhancedData.ln = currentUser.ownerLastName;
        console.log(
          "🔍 Meta Pixel: Adding owner name for advanced matching:",
          `${currentUser.ownerFirstName} ${currentUser.ownerLastName}`
        );
      }
    } else {
      console.log("🔍 Meta Pixel: No user data found in localStorage");
    }

    window.fbq("track", "PageView", enhancedData);

    // Also track in our own system
    trackUserActivity({
      userName:
        currentUser?.name ||
        (currentUser?.ownerFirstName && currentUser?.ownerLastName
          ? `${currentUser.ownerFirstName} ${currentUser.ownerLastName}`
          : "Anonymous"),
      email: currentUser?.email,
      phone: currentUser?.phoneNumber,
      eventType: "PageView",
      url: window.location.pathname + window.location.search,
    });
  }
};

// Track user activity in our system
const trackUserActivity = async (activityData: any) => {
  try {
    console.log("🔥 Tracking Activity:", activityData);
    const response = await fetch("/api/admin/user-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityData),
    });
    console.log("🔥 Activity API Response:", response.status, response.ok);
  } catch (error) {
    console.log("🔥 Activity tracking failed:", error);
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
    // getUserData() is now called inside pageview() function
    pageview();
  }, [pathname, searchParams]);

  return null;
}
