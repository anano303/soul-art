"use client";

import { OrdersList } from "@/modules/admin/components/orders-list";
import { useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";

export default function AuctionAdminOrdersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated before rendering
    if (!isLoggedIn()) {
      router.push("/login?redirect=/auction-admin/orders");
      return;
    }

    // Get user data from local storage
    const userData = getUserData();
    if (!userData) {
      router.push("/login?redirect=/auction-admin/orders");
      return;
    }

    // Check if user is auction_admin
    if (userData.role !== Role.AuctionAdmin && userData.role !== Role.Admin) {
      console.log("User doesn't have auction_admin permissions");
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  return (
    <div
      className="responsive-container"
      style={{
        maxWidth: "90%",
        margin: "0 auto",
        overflowX: "auto",
        width: "100%",
      }}
    >
      <OrdersList auctionAdminMode={true} />
    </div>
  );
}
