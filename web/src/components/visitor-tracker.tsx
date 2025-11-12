"use client";

import { useVisitorTracking } from "@/hooks/useVisitorTracking";

/**
 * VisitorTracker component - automatically tracks visitor sessions
 * Place this component in the root layout to enable tracking on all pages
 */
export function VisitorTracker() {
  useVisitorTracking();

  // This component doesn't render anything
  return null;
}
