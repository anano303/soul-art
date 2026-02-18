"use client";

import { useEffect, useState } from "react";

interface GeoLocation {
  country: string;
  currency: string;
  city?: string;
  region?: string;
  detectedAt?: string;
  isLoaded: boolean;
}

// Helper to get cookie value
const getCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
};

/**
 * Hook to access user's geolocation data detected by Vercel Edge Middleware
 * 
 * @returns {GeoLocation} User's location data with country, currency, etc.
 * 
 * @example
 * ```tsx
 * const { country, currency, isLoaded } = useGeoLocation();
 * 
 * if (isLoaded) {
 *   console.log(`User is from ${country}, currency: ${currency}`);
 * }
 * ```
 */
export function useGeoLocation(): GeoLocation {
  const [geoData, setGeoData] = useState<GeoLocation>({
    country: "GE", // Default to Georgia
    currency: "GEL",
    isLoaded: false,
  });

  useEffect(() => {
    // Read geo data from cookies (set by middleware)
    const country = getCookie("user_country") || "GE";
    const currency = getCookie("user_currency") || "GEL";
    const city = getCookie("user_city");
    const region = getCookie("user_region");
    const detectedAt = getCookie("geo_detected_at");

    setGeoData({
      country,
      currency,
      city,
      region,
      detectedAt,
      isLoaded: true,
    });
  }, []);

  return geoData;
}

/**
 * Helper function to get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    GEL: "₾",
    USD: "$",
    EUR: "€",
    GBP: "£",
    RUB: "₽",
    TRY: "₺",
    AMD: "֏",
    AZN: "₼",
    UAH: "₴",
    JPY: "¥",
    CNY: "¥",
    INR: "₹",
    AUD: "A$",
    CAD: "C$",
    CHF: "CHF",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    PLN: "zł",
    CZK: "Kč",
  };

  return symbols[currency] || currency;
}

/**
 * Helper function to format price with currency
 */
export function formatPrice(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  
  // Format number with locale
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // For GEL, symbol goes after the number (Georgian convention)
  if (currency === 'GEL') {
    return `${formatted} ${symbol}`;
  }

  // For most currencies, symbol goes before
  return `${symbol}${formatted}`;
}
