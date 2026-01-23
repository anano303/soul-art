"use client";

import { useUser } from "@/modules/auth/hooks/use-user";
import { CampaignConsentModal } from "./campaign-consent-modal";

/**
 * Global wrapper that shows CampaignConsentModal to sellers who haven't
 * configured their campaign preferences. Shows once every 24 hours.
 */
export function CampaignConsentPrompt() {
  const { user, isLoading } = useUser();

  // Don't render anything while loading or if no user
  if (isLoading || !user) {
    return null;
  }

  // Only show to sellers
  if (user.role !== "seller") {
    return null;
  }

  // Get current campaign settings
  const currentChoice = user.campaignDiscountChoice || "none";
  const currentDiscount = user.defaultReferralDiscount || 10;

  return (
    <CampaignConsentModal
      userId={user._id || user.id || ""}
      currentChoice={currentChoice}
      currentDiscount={currentDiscount}
    />
  );
}
