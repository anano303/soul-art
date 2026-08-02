"use client";

import { useUser } from "@/modules/auth/hooks/use-user";
import { SellerOnboardingModal } from "./seller-onboarding-modal";

const SELLER_ROLES = ["seller", "seller_sales_manager"];

/**
 * Shows the onboarding modal to sellers whose profile is missing the info we
 * started collecting at registration. Once a day at most.
 */
export function SellerOnboardingPrompt() {
  const { user, isLoading } = useUser();

  if (isLoading || !user) return null;
  if (!SELLER_ROLES.includes((user.role || "").toLowerCase())) return null;

  const typed = user as {
    sellerType?: string | null;
    artistOpenForCommissions?: boolean;
    artistSocials?: Record<string, string> | null;
  };

  // `sellerType` is the reliable "never answered" marker — the commissions
  // flag defaults to false, so it cannot tell an answer from a blank.
  if (typed.sellerType) return null;

  return (
    <SellerOnboardingModal
      userId={user._id || ""}
      currentSellerType={typed.sellerType}
      currentOpenForCommissions={typed.artistOpenForCommissions}
      currentSocials={typed.artistSocials}
    />
  );
}
