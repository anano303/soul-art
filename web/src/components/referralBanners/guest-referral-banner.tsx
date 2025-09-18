"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import "./guest-referral-banner.css";

export function GuestReferralBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Don't show to logged in users
  if (user) return null;

  return (
    <div className="soulart-guest-banner">
      <div className="soulart-guest-content">
        <div className="soulart-guest-text">
          <h3 className="soulart-guest-title">
            💰 {t("referral.guestBanner.title")}
          </h3>
          <p className="soulart-guest-description">
            {t("referral.guestBanner.description")}
          </p>
        </div>
        <div className="soulart-guest-actions">
          <Link href="/referral-info" className="soulart-guest-btn-learn">
            {t("referral.guestBanner.learnMore")}
          </Link>
          <Link href="/register" className="soulart-guest-btn-register">
            {t("referral.guestBanner.register")}
          </Link>
        </div>
      </div>
    </div>
  );
}
