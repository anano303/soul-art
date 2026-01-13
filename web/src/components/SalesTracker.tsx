"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { trackVisit } from "@/hooks/use-sales-tracking";

const COOKIE_NAME = "sales_ref";
const COOKIE_DAYS = 7; // 7 დღე

/**
 * Sales Manager Tracking Component
 * ავტომატურად აფიქსირებს ვიზიტს თუ მომხმარებელი შემოვიდა sales ref ლინკით
 */
export function SalesTracker() {
  const tracked = useRef(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    // შევამოწმოთ URL-ში ref პარამეტრი - ორივე გზით
    let refFromUrl = searchParams?.get("ref");
    
    // თუ useSearchParams-ით ვერ მივიღეთ, პირდაპირ window.location-დან წავიკითხოთ
    if (!refFromUrl && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      refFromUrl = urlParams.get("ref");
    }

    console.log("[SalesTracker] URL ref param:", refFromUrl);
    console.log("[SalesTracker] Current cookie:", Cookies.get(COOKIE_NAME));
    console.log("[SalesTracker] Pathname:", pathname);

    // თუ URL-ში არის SM_ ref, შევინახოთ cookie-ში და localStorage-ში
    if (refFromUrl && refFromUrl.startsWith("SM_")) {
      console.log("[SalesTracker] Setting cookie from URL:", refFromUrl);
      Cookies.set(COOKIE_NAME, refFromUrl, {
        expires: COOKIE_DAYS,
        sameSite: "Lax",
        path: "/",
      });
      // Backup localStorage-ში (popup window-ებისთვის)
      try {
        localStorage.setItem(COOKIE_NAME, refFromUrl);
      } catch (e) {
        console.warn("[SalesTracker] Failed to save to localStorage");
      }
      
      // Reset session tracking flag to ensure this visit is tracked
      sessionStorage.removeItem("soulart_visit_tracked");
      
      // დავატრექოთ ვიზიტი
      trackVisit().then(result => {
        console.log("[SalesTracker] Visit tracked:", result);
      });
      tracked.current = true;
      return;
    }

    // თუ უკვე გვაქვს cookie ან localStorage-ში და ჯერ არ დატრეკილა ეს session
    if (tracked.current) return;

    let salesRef = Cookies.get(COOKIE_NAME);

    // თუ cookie არ არის, შევამოწმოთ localStorage
    if (!salesRef) {
      try {
        salesRef = localStorage.getItem(COOKIE_NAME) || undefined;
        if (salesRef) {
          // აღვადგინოთ cookie localStorage-იდან
          Cookies.set(COOKIE_NAME, salesRef, {
            expires: COOKIE_DAYS,
            sameSite: "Lax",
            path: "/",
          });
          console.log(
            "[SalesTracker] Restored cookie from localStorage:",
            salesRef
          );
        }
      } catch (e) {
        console.warn("[SalesTracker] Failed to read localStorage");
      }
    }

    if (salesRef && salesRef.startsWith("SM_")) {
      console.log(
        "[SalesTracker] Tracking visit from existing cookie:",
        salesRef
      );
      trackVisit().then(result => {
        console.log("[SalesTracker] Visit tracked from cookie:", result);
      });
      tracked.current = true;
    }
  }, [searchParams, pathname]);

  return null; // არაფერს არ რენდერავს
}
