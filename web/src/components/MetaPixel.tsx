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

const buildUserActivityPayload = (
  eventType: string,
  extra: Record<string, any> = {},
  currentUser?: any
) => {
  if (typeof window === "undefined") {
    return null;
  }

  const user = currentUser ?? getUserData();
  const fallbackName =
    user?.name ||
    (user?.ownerFirstName && user?.ownerLastName
      ? `${user.ownerFirstName} ${user.ownerLastName}`
      : "Anonymous");

  return {
    userName: fallbackName,
    email: user?.email ?? null,
    phone: user?.phoneNumber ?? null,
    eventType,
    url: window.location.pathname + window.location.search,
    additionalData: extra,
  };
};

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
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔍 Meta Pixel: Adding email for advanced matching:",
            currentUser.email
          );
        }
      }
      if (currentUser.phoneNumber) {
        enhancedData.ph = currentUser.phoneNumber;
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔍 Meta Pixel: Adding phone for advanced matching:",
            currentUser.phoneNumber
          );
        }
      }
      if (currentUser.name) {
        const [firstName, ...lastNameParts] = currentUser.name.split(" ");
        enhancedData.fn = firstName;
        if (lastNameParts.length > 0) {
          enhancedData.ln = lastNameParts.join(" ");
        }
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔍 Meta Pixel: Adding name for advanced matching:",
            currentUser.name
          );
        }
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

    const activityPayload = buildUserActivityPayload(
      "PageView",
      { pixelFields: enhancedData },
      currentUser
    );

    if (activityPayload) {
      trackUserActivity(activityPayload);
    }
  }
};

// Track user activity in our system
const trackUserActivity = async (activityData: any) => {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("🔥 Tracking Activity:", activityData);
    }
    const response = await fetch("/api/admin/user-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityData),
    });
    if (process.env.NODE_ENV === "development") {
      console.log("🔥 Activity API Response:", response.status, response.ok);
    }
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
  const payload = {
    content_name: contentName,
    content_ids: [contentId],
    content_type: "product",
    value: value,
    currency: currency,
  };

  trackEvent("ViewContent", payload);

  const activityPayload = buildUserActivityPayload("ViewContent", payload);
  if (activityPayload) {
    trackUserActivity(activityPayload);
  }
};

export const trackAddToCart = (
  contentName: string,
  contentId: string,
  value: number,
  currency = "GEL"
) => {
  const payload = {
    content_name: contentName,
    content_ids: [contentId],
    content_type: "product",
    value: value,
    currency: currency,
  };

  trackEvent("AddToCart", payload);

  const activityPayload = buildUserActivityPayload("AddToCart", payload);
  if (activityPayload) {
    trackUserActivity(activityPayload);
  }
};

export const trackInitiateCheckout = (
  value: number,
  currency = "GEL",
  numItems: number
) => {
  const payload = {
    value: value,
    currency: currency,
    num_items: numItems,
  };

  trackEvent("InitiateCheckout", payload);

  const activityPayload = buildUserActivityPayload("InitiateCheckout", payload);
  if (activityPayload) {
    trackUserActivity(activityPayload);
  }
};

export const trackPurchase = (
  value: number,
  currency = "GEL",
  orderId: string
) => {
  const payload = {
    value: value,
    currency: currency,
    content_type: "product",
    order_id: orderId,
  };

  trackEvent("Purchase", payload);

  const activityPayload = buildUserActivityPayload("Purchase", payload);
  if (activityPayload) {
    trackUserActivity(activityPayload);
  }
};

export const trackSearch = (searchString: string) => {
  const payload = {
    search_string: searchString,
  };

  trackEvent("Search", payload);

  const activityPayload = buildUserActivityPayload("Search", payload);
  if (activityPayload) {
    trackUserActivity(activityPayload);
  }
};

export const trackSubscribedButtonClick = (
  details: Record<string, any> = {}
) => {
  trackEvent("SubscribedButtonClick", details);

  const activityPayload = buildUserActivityPayload(
    "SubscribedButtonClick",
    details
  );
  if (activityPayload) {
    trackUserActivity(activityPayload);
  }
};

export const trackLead = (leadData: Record<string, any>) => {
  trackEvent("Lead", leadData);

  const activityPayload = buildUserActivityPayload("Lead", leadData);
  if (activityPayload) {
    trackUserActivity(activityPayload);
  }
};

export const trackCompleteRegistration = (
  registrationData: Record<string, any>
) => {
  trackEvent("CompleteRegistration", registrationData);

  const activityPayload = buildUserActivityPayload(
    "CompleteRegistration",
    registrationData
  );
  if (activityPayload) {
    trackUserActivity(activityPayload);
  }
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
