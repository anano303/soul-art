"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

const SESSION_ID_KEY = "visitor_session_id";
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

// Simple UUID generator
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useVisitorTracking() {
  // Get user from React Query cache
  const { data: user } = useQuery({
    queryKey: ["user"],
    enabled: false, // Don't fetch, just read from cache
  });

  console.log('[useVisitorTracking] Hook called', { user: !!user, userId: (user as any)?._id });

  useEffect(() => {
    console.log('[useVisitorTracking] useEffect running', { hasUser: !!user, userId: (user as any)?._id });

    // Get or create session ID
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    const lastActivity = localStorage.getItem("last_activity");

    console.log('[useVisitorTracking] Session info', { sessionId, lastActivity });

    const now = Date.now();
    if (
      !sessionId ||
      (lastActivity && now - parseInt(lastActivity) > SESSION_DURATION)
    ) {
      // Create new session
      sessionId = generateUUID();
      localStorage.setItem(SESSION_ID_KEY, sessionId);
      console.log('[useVisitorTracking] New session created', { sessionId });
    }

    localStorage.setItem("last_activity", now.toString());

    // Track visitor
    const trackVisitor = async () => {
      try {
        const userId = (user as any)?._id || (user as any)?.id;
        console.log("[Visitor Tracking] Sending data:", {
          page: window.location.pathname,
          userId: userId ? userId : "None",
          userPresent: !!user,
        });

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/analytics/track-visitor`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include", // Important for auth cookies
            body: JSON.stringify({
              page: window.location.pathname,
              referrer: document.referrer || "Direct",
              sessionId,
              userId: userId, // Get from React Query cache
            }),
          }
        );

        if (!response.ok) {
          console.error("Failed to track visitor");
        }
      } catch (error) {
        console.error("Error tracking visitor:", error);
      }
    };

    trackVisitor();

    // Track page changes
    const handlePageChange = () => {
      localStorage.setItem("last_activity", Date.now().toString());
      trackVisitor();
    };

    // Listen for route changes (for SPAs)
    window.addEventListener("popstate", handlePageChange);

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        localStorage.setItem("last_activity", Date.now().toString());
        trackVisitor();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("popstate", handlePageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]); // Add user as dependency
}
