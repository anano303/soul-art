"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface EtsyFlags {
  integrationEnabled: boolean;
  enabledForAdmins: boolean;
  temporarilyDisabled: boolean;
}

export interface EtsyStatus {
  /** The feature is live for this user (buttons, banners, guide) */
  enabled: boolean;
  /** Publishing is paused because of technical issues */
  temporarilyDisabled: boolean;
}

// Module-level cache: the flag is fetched once per page load, not per
// product row (ProductsActions renders for every row in the list).
let flagsPromise: Promise<EtsyFlags> | null = null;

const DISABLED: EtsyFlags = {
  integrationEnabled: false,
  enabledForAdmins: false,
  temporarilyDisabled: false,
};

function loadFlags(): Promise<EtsyFlags> {
  if (!flagsPromise) {
    flagsPromise = fetchWithAuth("/etsy/settings")
      .then((res) => (res.ok ? res.json() : DISABLED))
      .catch(() => {
        flagsPromise = null; // allow retry on next mount
        return DISABLED;
      });
  }
  return flagsPromise;
}

/**
 * Availability of the Etsy feature for the current user.
 *
 * `enabled` — the master flag enables it for everyone; admins can be
 * separately allowed in for testing while it's off for sellers.
 * Impersonated sessions (admin logged in as a user) count as admin — the
 * backend honors this via the impersonatedBy JWT claim.
 *
 * `temporarilyDisabled` — the outage kill switch. The feature stays
 * visible (banners, guide, buttons), but publishing is paused. This is the
 * raw flag, so admins see the outage notices too; whether a given user can
 * still publish is decided by the backend (TEMPORARILY_DISABLED blocker).
 */
export function useEtsyStatus(isAdmin: boolean): EtsyStatus {
  const [status, setStatus] = useState<EtsyStatus>({
    enabled: false,
    temporarilyDisabled: false,
  });

  useEffect(() => {
    let cancelled = false;
    const impersonating =
      typeof window !== "undefined" &&
      Boolean(localStorage.getItem("impersonating_admin_id"));

    loadFlags().then((flags) => {
      if (cancelled) return;
      setStatus({
        enabled:
          flags.integrationEnabled ||
          ((isAdmin || impersonating) && flags.enabledForAdmins),
        temporarilyDisabled: flags.temporarilyDisabled,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return status;
}

/** Whether the Etsy feature is available for the current user. */
export function useEtsyEnabled(isAdmin: boolean): boolean {
  return useEtsyStatus(isAdmin).enabled;
}
