"use client";

import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";

const ETSY_HASH = "#etsy-button";

/**
 * The current seller's own artist page, or null when the visitor isn't a
 * seller (or has no slug yet). The hash pulses the first Etsy publish
 * button once the page has rendered it.
 */
export function useSellerPageHref(): string | null {
  const { user } = useUser();
  const isSeller = String(user?.role ?? "").toLowerCase() === Role.Seller;

  return isSeller && user?.artistSlug
    ? `/@${user.artistSlug}${ETSY_HASH}`
    : null;
}

/**
 * Where an Etsy call-to-action should send the visitor.
 *
 * Sellers manage their work from their own artist page far more than from
 * the admin product list, so they go there; everyone else keeps the old
 * /admin/products target.
 */
export function useEtsyEntryHref(): string {
  return useSellerPageHref() ?? `/admin/products${ETSY_HASH}`;
}
