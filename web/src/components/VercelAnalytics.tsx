"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { track } from "@vercel/analytics";

// Custom Analytics Events for SoulArt
export const trackEvent = (eventName: string, properties?: any) => {
  track(eventName, properties);
};

// Predefined tracking functions for common SoulArt events
export const trackPurchase = (
  productId: string,
  price: number,
  currency: string = "GEL"
) => {
  track("Purchase", {
    product_id: productId,
    value: price,
    currency: currency,
  });
};

export const trackProductView = (productId: string, category: string) => {
  track("Product View", {
    product_id: productId,
    category: category,
  });
};

export const trackAddToCart = (productId: string, price: number) => {
  track("Add to Cart", {
    product_id: productId,
    value: price,
  });
};

export const trackSearch = (searchTerm: string, results: number) => {
  track("Search", {
    search_term: searchTerm,
    results_count: results,
  });
};

export const trackReferralSignup = (referralCode: string) => {
  track("Referral Signup", {
    referral_code: referralCode,
  });
};

export default function VercelAnalytics() {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <>
      {/* Vercel Analytics - ვიზიტორების ტრაფიკის ანალიზი */}
      <Analytics
        mode={isProduction ? "production" : "development"}
        debug={!isProduction}
      />

      {/* Speed Insights - საიტის ჩატვირთვის სისწრაფის ანალიზი */}
      <SpeedInsights
        debug={!isProduction}
        sampleRate={isProduction ? 0.1 : 1} // Production-ზე 10%, Development-ზე 100%
      />
    </>
  );
}
