"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { getAccessToken } from "@/lib/auth";
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
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    alert("რეფერალური ლინკი კოპირებულია!");
  };

  if (!user || !isVisible) return null;

  return (
    <div className="soulart-referral-promo">
      <button
        onClick={() => setIsVisible(false)}
        className="soulart-promo-close"
        aria-label="დახურვა"
      >
        ×
      </button>
      <div className="soulart-promo-content">
        <div className="soulart-promo-main">
          <h3 className="soulart-promo-title">
            🎉 მოიწვიე მეგობრები და გამოიმუშავე ფული!
          </h3>
          <p className="soulart-promo-description">
            მოიწვიე სელერები და მიიღე 5 ლარი ყველა დამტკიცებული სელერისთვის
          </p>

          {stats && (
            <div className="soulart-stats-container">
              <div className="soulart-stat-card">
                <div className="soulart-stat-label">მოწვეული</div>
                <div className="soulart-stat-value">{stats.totalReferrals}</div>
              </div>
              <div className="soulart-stat-card">
                <div className="soulart-stat-label">გამოშოვებული</div>
                <div className="soulart-stat-value">
                  {stats.totalEarnings} ₾
                </div>
              </div>
              <div className="soulart-stat-card">
                <div className="soulart-stat-label">ბალანსი</div>
                <div className="soulart-stat-value">
                  {stats.availableBalance} ₾
                </div>
              </div>
            </div>
          )}

          <div className="soulart-promo-actions">
            <Link href="/referrals" className="soulart-btn-primary">
              რეფერალები
            </Link>
            {stats?.referralCode && (
              <button onClick={copyLink} className="soulart-btn-secondary">
                ლინკის კოპირება
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
