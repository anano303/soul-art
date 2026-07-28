"use client";

import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import "./etsy-disabled-notice.css";

interface EtsyDisabledNoticeProps {
  /**
   * "inline" — informational strip for the blog post / guide pages.
   * "checkout" — replaces the payment buttons on the publish page.
   */
  variant?: "inline" | "checkout";
}

// Shown while the "temporarily disabled" Etsy flag is on (admin → Etsy page).
export default function EtsyDisabledNotice({
  variant = "inline",
}: EtsyDisabledNoticeProps) {
  const { language } = useLanguage();
  const isKa = language !== "en";

  return (
    <div className={`etsy-disabled-notice etsy-disabled-notice--${variant}`}>
      <AlertTriangle size={20} className="etsy-disabled-icon" />
      <div className="etsy-disabled-text">
        <strong>
          {isKa
            ? "Etsy ინტეგრაცია დროებით გამორთულია"
            : "The Etsy integration is temporarily disabled"}
        </strong>
        <p>
          {isKa
            ? "ტექნიკური სამუშაოების გამო ნამუშევრების Etsy-ზე განთავსება ამჟამად შეუძლებელია. გთხოვთ, სცადოთ მოგვიანებით — მადლობა მოთმინებისთვის."
            : "Because of technical issues, publishing artworks to Etsy is unavailable right now. Please try again later — thanks for your patience."}
        </p>
      </div>
    </div>
  );
}
