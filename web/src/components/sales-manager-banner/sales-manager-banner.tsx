"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import "./sales-manager-banner.css";

const FACEBOOK_GROUP_URL =
  "https://www.facebook.com/groups/769785715618660/?ref=share&mibextid=NSMWBT";
const STORAGE_KEY = "sales_manager_banner_dismissed";

// Check if user is sales manager (including seller_sales_manager)
const isSalesManagerRole = (role?: string) => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === "sales_manager" || lowerRole === "seller_sales_manager";
};

export default function SalesManagerBanner() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show for sales managers (including seller_sales_manager)
    if (!isSalesManagerRole(user?.role)) {
      setIsVisible(false);
      return;
    }

    // Check if banner was dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, [user]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleJoinGroup = () => {
    window.open(FACEBOOK_GROUP_URL, "_blank");
    // Optionally dismiss after clicking
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="sales-manager-banner">
      <div className="banner-content">
        <Heart className="banner-icon" size={24} />
        <div className="banner-text">
          <p>
            გთხოვთ დაემატოთ SoulArt-ის გაყიდვების ჯგუფში, კითხვების შემთხვევაში
            რომ მალე დაგეხმაროთ{" "}
            <Heart size={14} className="inline-heart" fill="currentColor" />
          </p>
        </div>
        <button className="join-group-btn" onClick={handleJoinGroup}>
          <ExternalLink size={16} />
          ჯგუფში გაწევრიანება
        </button>
      </div>
      <button
        className="dismiss-btn"
        onClick={handleDismiss}
        aria-label="დახურვა"
      >
        <X size={20} />
      </button>
    </div>
  );
}
