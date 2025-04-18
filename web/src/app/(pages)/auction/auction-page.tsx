"use client";

import React from "react";
import "./auction.css";

export default function AuctionPage() {
  return (
    <div className="auction-container">
      <div className="auction-content">
        <h1 className="auction-title">აუქციონი</h1>
        <div className="auction-coming-soon">
          <span>მალე</span>
        </div>
      </div>
    </div>
  );
}
