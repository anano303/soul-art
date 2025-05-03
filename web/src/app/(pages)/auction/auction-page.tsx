"use client";

import React from "react";
import "./auction.css";
import { useLanguage } from "@/hooks/LanguageContext";

export default function AuctionPage() {
  const { t } = useLanguage();

  return (
    <div className="auction-container">
      <div className="auction-content">
        <h1 className="auction-title">{t("navigation.auction")}</h1>
        <div className="auction-coming-soon">
          <span>მალე</span>
        </div>
      </div>
    </div>
  );
}
