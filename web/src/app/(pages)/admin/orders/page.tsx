"use client";

import { OrdersList } from "@/modules/admin/components/orders-list";
import { useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated before rendering
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/orders");
      return;
    }

    // Get user data from local storage
    const userData = getUserData();
    if (!userData) {
      router.push("/login?redirect=/admin/orders");
      return;
    }

    // Check if user has proper permissions (admin, seller, or sales manager)
    if (
      userData.role !== Role.Admin &&
      userData.role !== Role.Seller &&
      userData.role !== Role.SalesManager
    ) {
      console.log("User doesn't have permissions for orders page");
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  // Get user data for passing to OrdersList
  const userData = getUserData();
  const isSalesManager = userData?.role === Role.SalesManager;

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
      <OrdersList salesManagerMode={isSalesManager} />
    </div>
  );
}
