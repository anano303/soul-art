"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { CreateAuctionForm } from "@/modules/auctions/components/create-auction-form";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import "./create-auction.css";

type UserRole = "admin" | "auction_admin" | "seller";

function getFormMode(
  role: string | undefined,
): "admin" | "auction_admin" | "seller" {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "admin") return "admin";
  if (normalizedRole === "auction_admin") return "auction_admin";
  return "seller";
}

function getBackUrl(role: string | undefined): string {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "admin") return "/admin/auctions";
  if (normalizedRole === "auction_admin") return "/auction-admin";
  return "/profile/auctions";
}

const ALLOWED_ROLES: UserRole[] = ["admin", "auction_admin", "seller"];

export default function CreateAuctionPage() {
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
      const userRole = user.role?.toLowerCase() as UserRole;
      if (!ALLOWED_ROLES.includes(userRole)) {
        router.push("/auctions");
      }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="auction-create-page">
        <div className="auction-create-loading">
          <div className="spinner"></div>
          <p>{language === "en" ? "Loading..." : "იტვირთება..."}</p>
        </div>
      </div>
    );
  }

  const userRole = user?.role?.toLowerCase();
  if (!user || !ALLOWED_ROLES.includes(userRole as UserRole)) {
    return null;
  }

  const formMode = getFormMode(userRole);
  const backUrl = getBackUrl(userRole);
  const isAdminOrAuctionAdmin =
    userRole === "admin" || userRole === "auction_admin";

  const handleSuccess = () => {
    router.push(backUrl);
  };

  return (
    <div className={`auction-create-page ${isDarkTheme ? "" : "light-theme"}`}>
      <div className="auction-create-container">
        <div className="theme-toggle-wrapper">
          <button
            className="theme-toggle-btn"
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            title={
              isDarkTheme
                ? language === "en"
                  ? "Switch to Light Theme"
                  : "ნათელი თემა"
                : language === "en"
                  ? "Switch to Dark Theme"
                  : "მუქი თემა"
            }
          >
            {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="auction-create-header">
          <h1>{language === "en" ? "Create Auction" : "აუქციონის შექმნა"}</h1>
          <p>
            {isAdminOrAuctionAdmin
              ? language === "en"
                ? "Create a new auction for a seller"
                : "შექმენით ახალი აუქციონი სელერისთვის"
              : language === "en"
                ? "Create a new auction for your artwork"
                : "შექმენით ახალი აუქციონი თქვენი ნამუშევრისთვის"}
          </p>
          <Link href={backUrl} className="auction-create-back-link">
            <ArrowLeft size={18} />
            {userRole === "admin"
              ? language === "en"
                ? "Back to Admin Auctions"
                : "ადმინ აუქციონებში დაბრუნება"
              : userRole === "auction_admin"
                ? language === "en"
                  ? "Back to Dashboard"
                  : "დეშბორდზე დაბრუნება"
                : language === "en"
                  ? "Back to My Auctions"
                  : "ჩემს აუქციონებში დაბრუნება"}
          </Link>
        </div>

        <CreateAuctionForm mode={formMode} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
