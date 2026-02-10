"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page redirects to the unified /auctions/create page
export default function AdminCreateAuctionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auctions/create");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
