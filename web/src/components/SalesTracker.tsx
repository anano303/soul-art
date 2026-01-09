"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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

  useEffect(() => {
    if (tracked.current) return;

    // შევამოწმოთ URL-ში ref პარამეტრი
    const refFromUrl = searchParams?.get("ref");
    console.log("[SalesTracker] URL ref param:", refFromUrl);
    console.log("[SalesTracker] Current cookie:", Cookies.get(COOKIE_NAME));

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
      // დავატრექოთ ვიზიტი
      trackVisit();
      tracked.current = true;
      return;
    }

    // თუ უკვე გვაქვს cookie ან localStorage-ში, მაინც დავატრექოთ
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
      trackVisit();
      tracked.current = true;
    }
  }, [searchParams]);

  return null; // არაფერს არ რენდერავს
}
