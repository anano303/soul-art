"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
// Referral promo banner component
import "./referral-promo-banner.css";

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  pendingReferrals: number;
  availableBalance: number;
}

export function ReferralPromoBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/stats`,
        {
          credentials: "include", // Include HTTP-only cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch referral stats:", error);
    }
  };

  const generateReferralLink = () => {
    if (!stats?.referralCode) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?ref=${stats.referralCode}`;
  };

  const copyLink = () => {
    const link = generateReferralLink();
    navigator.clipboard.writeText(link);
    alert(t("referral.promoBanner.linkCopied"));
  };

  if (!user || !isVisible) return null;

  return (
    <div className="soulart-referral-promo">
      <button
        onClick={() => setIsVisible(false)}
        className="soulart-promo-close"
        aria-label={t("referral.promoBanner.close")}
      >
        ×
      </button>
      <div className="soulart-promo-content">
        <div className="soulart-promo-main">
          <h3 className="soulart-promo-title">
            🎉 {t("referral.promoBanner.title")}
          </h3>
          <p className="soulart-promo-description">
            {t("referral.promoBanner.description")}
          </p>

          {stats && (
            <div className="soulart-stats-container">
              <div className="soulart-stat-card">
                <div className="soulart-stat-label">
                  {t("referral.promoBanner.invited")}
                </div>
                <div className="soulart-stat-value">{stats.totalReferrals}</div>
              </div>
              <div className="soulart-stat-card">
                <div className="soulart-stat-label">
                  {t("referral.promoBanner.earned")}
                </div>
                <div className="soulart-stat-value">
                  {stats.totalEarnings} ₾
                </div>
              </div>
              <div className="soulart-stat-card">
                <div className="soulart-stat-label">
                  {t("referral.promoBanner.balance")}
                </div>
                <div className="soulart-stat-value">
                  {stats.availableBalance} ₾
                </div>
              </div>
            </div>
          )}

          <div className="soulart-promo-actions">
            <Link href="/referrals" className="soulart-btn-primary">
              {t("referral.promoBanner.referrals")}
            </Link>
            {stats?.referralCode && (
              <button onClick={copyLink} className="soulart-btn-secondary">
                {t("referral.promoBanner.copyLink")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
