"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { setUserId, setUserProperties } from "@/lib/ga4-analytics";

/**
 * GA4 User ID Tracking Component
 * Automatically sets user ID and properties when user is authenticated
 */
export function GA4UserTracker() {
  const { user, isLoggedIn } = useAuth();
  const hasSetUserIdRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn && user && user._id && !hasSetUserIdRef.current) {
      // Set user ID for cross-device tracking
      setUserId(user._id);

      // Set user properties for segmentation
      const userProperties: Record<string, string> = {
        user_role: user.role || "user",
      };

      // Add optional properties if available
      if (user.isEmailVerified !== undefined) {
        userProperties.email_verified = String(user.isEmailVerified);
      }

      if (user.isSeller !== undefined) {
        userProperties.is_seller = String(user.isSeller);
      }

      // Track user registration date if available
      if (user.createdAt) {
        try {
          const createdDate = new Date(user.createdAt);
          const accountAge = Math.floor(
            (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          userProperties.account_age_days = String(accountAge);
        } catch (error) {
          console.warn("Failed to calculate account age:", error);
        }
      }

      setUserProperties(userProperties);
      hasSetUserIdRef.current = true;

      console.log("[GA4] User ID set:", user._id);
    } else if (!isLoggedIn && hasSetUserIdRef.current) {
      // Reset tracking when user logs out
      hasSetUserIdRef.current = false;
    }
  }, [isLoggedIn, user]);

  return null; // This component doesn't render anything
}
