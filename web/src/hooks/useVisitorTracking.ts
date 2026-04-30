"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

const SESSION_ID_KEY = "visitor_session_id";
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const TRACK_THROTTLE = 10 * 1000; // Minimum 10s between track calls

// Simple UUID generator
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useVisitorTracking() {
  const lastTracked = useRef(0);
  // Get user from React Query cache
  const { data: user } = useQuery({
    queryKey: ["user"],
    enabled: false, // Don't fetch, just read from cache
  });

  useEffect(() => {
    // Get or create session ID
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    const lastActivity = localStorage.getItem("last_activity");

    const now = Date.now();
    if (
      !sessionId ||
      (lastActivity && now - parseInt(lastActivity) > SESSION_DURATION)
    ) {
      // Create new session
      sessionId = generateUUID();
      localStorage.setItem(SESSION_ID_KEY, sessionId);
    }

    localStorage.setItem("last_activity", now.toString());

    // Track visitor (throttled)
    const trackVisitor = async () => {
      const currentTime = Date.now();
      if (currentTime - lastTracked.current < TRACK_THROTTLE) return;
      lastTracked.current = currentTime;

      try {
        const userId = (user as any)?._id || (user as any)?.id;

        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/analytics/track-visitor`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              page: window.location.pathname,
              referrer: document.referrer || "Direct",
              sessionId,
              userId: userId,
            }),
          }
        );
      } catch {
        // Silent fail - tracking is non-critical
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

    return () => {
      window.removeEventListener("popstate", handlePageChange);
    };
  }, [user]); // Add user as dependency
}
