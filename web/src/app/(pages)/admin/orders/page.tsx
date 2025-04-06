"use client";

import { OrdersList } from "@/modules/admin/components/orders-list";
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
    <div className="responsive-container" style={{
      maxWidth: "90%",
      margin: "0 auto",
      overflowX: "auto",
      width: "100%"
    }}>
      <OrdersList />
    </div>
  );
}
