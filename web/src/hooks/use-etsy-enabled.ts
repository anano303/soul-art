"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface EtsyFlags {
  integrationEnabled: boolean;
  enabledForAdmins: boolean;
}

// Module-level cache: the flag is fetched once per page load, not per
// product row (ProductsActions renders for every row in the list).
let flagsPromise: Promise<EtsyFlags> | null = null;

const DISABLED: EtsyFlags = {
  integrationEnabled: false,
  enabledForAdmins: false,
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
 * Whether the Etsy feature is available for the current user.
 * The master flag enables it for everyone; admins can be separately
 * allowed in for testing while it's off for sellers. Impersonated
 * sessions (admin logged in as a user) count as admin — the backend
 * honors this via the impersonatedBy JWT claim.
 */
export function useEtsyEnabled(isAdmin: boolean): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const impersonating =
      typeof window !== "undefined" &&
      Boolean(localStorage.getItem("impersonating_admin_id"));

    loadFlags().then((flags) => {
      if (cancelled) return;
      setEnabled(
        flags.integrationEnabled ||
          ((isAdmin || impersonating) && flags.enabledForAdmins),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return enabled;
}
