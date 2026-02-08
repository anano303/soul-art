"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page redirects to the unified /auctions/create page
export default function AuctionAdminCreateAuctionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auctions/create");
  }, [router]);

  return (
    <div className="auction-create-page">
      <div className="auction-create-loading">
        <div className="spinner"></div>
        <p>იტვირთება...</p>
      </div>
    </div>
  );
}
