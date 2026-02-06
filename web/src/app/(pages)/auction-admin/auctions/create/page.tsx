"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { CreateAuctionForm } from "@/modules/auctions/components/create-auction-form";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import "./create-auction.css";

export default function AuctionAdminCreateAuctionPage() {
  const { language } = useLanguage();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      if (user.role !== "auction_admin") {
        router.push("/");
      }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="auction-create-page">
        <div className="auction-create-loading">
          <div className="spinner"></div>
          <p>იტვირთება...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "auction_admin") {
    return null;
  }

  return (
    <div className={`auction-create-page ${isDarkTheme ? "" : "light-theme"}`}>
      <div className="auction-create-container">
        <div className="theme-toggle-wrapper">
          <button
            className="theme-toggle-btn"
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            title={isDarkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDarkTheme ? <Sun /> : <Moon />}
            {isDarkTheme 
              ? (language === "en" ? "Light Mode" : "ნათელი თემა")
              : (language === "en" ? "Dark Mode" : "მუქი თემა")
            }
          </button>
        </div>
        
        <div className="auction-create-header">
          <h1>
            {language === "en" ? "Create Auction" : "აუქციონის შექმნა"}
          </h1>
          <p>
            {language === "en"
              ? "Create a new auction for a seller"
              : "შექმენით ახალი აუქციონი სელერისთვის"}
          </p>
          <Link href="/auction-admin" className="auction-create-back-link">
            <ArrowLeft size={18} />
            {language === "en" ? "Back to Dashboard" : "დეშბორდზე დაბრუნება"}
          </Link>
        </div>
        <CreateAuctionForm
          mode="auction_admin"
          onSuccess={() => router.push("/auction-admin")}
        />
      </div>
    </div>
  );
}
