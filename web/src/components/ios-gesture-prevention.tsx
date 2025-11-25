"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/modules/auth/hooks/use-user";

/**
 * Prevents iOS back swipe gesture on root pages (bottom nav pages) only
 * Android doesn't have this gesture by default, so this is iOS-specific
 */
export function IOSGesturePrevention() {
  const pathname = usePathname();
  const { user } = useUser();

  useEffect(() => {
    // Only run on mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Check if user is an artist
    const isArtist = user?.role === "seller" || user?.isSeller;
    const currentUserSlug = user?.artistSlug;

    // Only prevent on root pages (bottom navigation pages)
    // Matches: /, /shop, /explore, and current user's artist profile page only
    let isRootPage = 
      pathname === "/" || 
      pathname === "/shop" || 
      pathname === "/explore";

    // Only consider artist profile as root page if it's the current user's profile
    if (isArtist && currentUserSlug && pathname === `/@${currentUserSlug}`) {
      isRootPage = true;
    }
    
    if (!isRootPage) return;

    const preventBackSwipe = (event: TouchEvent) => {
      const touch = event.touches[0];
      // Detect touches near left edge (within 30px)
      if (touch.clientX < 30 && event.cancelable) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventBackSwipe, { passive: false });
    return () => document.removeEventListener('touchstart', preventBackSwipe);
  }, [pathname, user?.artistSlug, user?.isSeller, user?.role]);

  return null;
}
