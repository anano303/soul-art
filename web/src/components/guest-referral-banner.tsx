"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import "./guest-referral-banner.css";

export function GuestReferralBanner() {
  const { user } = useAuth();

  // Don't show to logged in users
  if (user) return null;

  return (
    <div className="soulart-guest-banner">
      <div className="soulart-guest-content">
        <div className="soulart-guest-text">
          <h3 className="soulart-guest-title">
            💰 გამოიმუშავე ფული მეგობრების მოწვევით!
          </h3>
          <p className="soulart-guest-description">
            დარეგისტრირდი და მიიღე ფულადი ბონუსები ყველა რეფერალისთვის
          </p>
        </div>
        <div className="soulart-guest-actions">
          <Link href="/referral-info" className="soulart-guest-btn-learn">
            გაიგე მეტი
          </Link>
          <Link href="/register" className="soulart-guest-btn-register">
            რეგისტრაცია
          </Link>
        </div>
      </div>
    </div>
  );
}
