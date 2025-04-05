"use client";

import { OrdersList } from "@/modules/admin/components/orders-list";
import "./adminOrders.css";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated before rendering
    if (!isAuthenticated()) {
      router.push('/login?redirect=/admin/orders');
      return;
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  return (
    <div className="admin-orders-container">
      <div className="scrollable-container">
        <div className="orders-content">
          <OrdersList />
        </div>
      </div>
    </div>
  );
}
