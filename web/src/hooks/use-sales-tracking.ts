"use client";

import { useEffect, useRef, useCallback } from "react";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

type TrackingEventType =
  | "VISIT"
  | "REGISTRATION"
  | "ADD_TO_CART"
  | "CHECKOUT_START"
  | "PURCHASE";

interface TrackingData {
  eventType: TrackingEventType;
  userId?: string;
  email?: string;
  orderId?: string;
  orderAmount?: number;
  productId?: string;
  referrerUrl?: string;
  landingPage?: string;
}

// უნიკალური ვიზიტორის ID (session-based)
const getVisitorId = (): string => {
  let visitorId = sessionStorage.getItem("soulart_visitor_id");
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("soulart_visitor_id", visitorId);
  }
  return visitorId;
};

// ტრეკინგის API call
const sendTrackingEvent = async (data: TrackingData): Promise<boolean> => {
  // შევამოწმოთ cookie, თუ არ არის - localStorage
  let salesRefCode = Cookies.get("sales_ref");

  if (!salesRefCode) {
    try {
      salesRefCode = localStorage.getItem("sales_ref") || undefined;
      if (salesRefCode) {
        // აღვადგინოთ cookie
        Cookies.set("sales_ref", salesRefCode, {
          expires: 7,
          sameSite: "Lax",
          path: "/",
        });
        console.log(
          "[SalesTracking] Restored cookie from localStorage:",
          salesRefCode
        );
      }
    } catch (e) {
      console.warn("[SalesTracking] Failed to read localStorage");
    }
  }

  console.log("[SalesTracking] Cookie sales_ref:", salesRefCode);

  if (!salesRefCode || !salesRefCode.startsWith("SM_")) {
    console.log("[SalesTracking] No valid sales_ref cookie, skipping tracking");
    return false;
  }

  try {
    console.log("[SalesTracking] Sending event:", data.eventType, {
      salesRefCode,
      ...data,
    });
    const response = await fetch(`${API_URL}/sales-commission/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        salesRefCode,
        visitorId: getVisitorId(),
        referrerUrl: document.referrer || undefined,
        landingPage: window.location.pathname,
        ...data,
      }),
    });

    console.log("[SalesTracking] Response status:", response.status);
    return response.ok;
  } catch (error) {
    console.error("[SalesTracking] Error:", error);
    return false;
  }
};

// ვიზიტის ტრეკინგი
export const trackVisit = async (): Promise<boolean> => {
  // თვითონ session-ში ჩავიხსოვროთ რომ არ გავიმეოროთ
  const tracked = sessionStorage.getItem("soulart_visit_tracked");
  if (tracked) return false;

  const result = await sendTrackingEvent({
    eventType: "VISIT",
    landingPage: window.location.pathname,
  });

  if (result) {
    sessionStorage.setItem("soulart_visit_tracked", "true");
  }

  return result;
};

// რეგისტრაციის ტრეკინგი
export const trackRegistration = async (
  userId: string,
  email: string
): Promise<boolean> => {
  return sendTrackingEvent({
    eventType: "REGISTRATION",
    userId,
    email,
  });
};

// კალათაში დამატების ტრეკინგი
export const trackAddToCart = async (productId: string): Promise<boolean> => {
  return sendTrackingEvent({
    eventType: "ADD_TO_CART",
    productId,
  });
};

// Checkout-ის დაწყების ტრეკინგი
export const trackCheckoutStart = async (): Promise<boolean> => {
  return sendTrackingEvent({
    eventType: "CHECKOUT_START",
  });
};

// შეძენის ტრეკინგი
export const trackPurchase = async (
  orderId: string,
  orderAmount: number,
  email?: string
): Promise<boolean> => {
  return sendTrackingEvent({
    eventType: "PURCHASE",
    orderId,
    orderAmount,
    email,
  });
};

// React Hook ვიზიტის ავტომატური ტრეკინგისთვის
export const useSalesTracking = () => {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;

    const salesRef = Cookies.get("sales_ref");
    if (salesRef && salesRef.startsWith("SM_")) {
      trackVisit();
      tracked.current = true;
    }
  }, []);

  const trackCart = useCallback((productId: string) => {
    trackAddToCart(productId);
  }, []);

  const trackCheckout = useCallback(() => {
    trackCheckoutStart();
  }, []);

  const trackOrder = useCallback(
    (orderId: string, amount: number, email?: string) => {
      trackPurchase(orderId, amount, email);
    },
    []
  );

  return {
    trackCart,
    trackCheckout,
    trackOrder,
  };
};

export default useSalesTracking;
