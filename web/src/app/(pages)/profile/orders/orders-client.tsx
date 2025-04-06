"use client";

import { useEffect, useState } from "react";
import { OrderHistory } from "@/modules/profile/components/order-history";
import { apiClient } from "@/lib/api-client";
import { useUser } from "@/modules/auth/hooks/use-user";
import LoadingAnim from "@/components/loadingAnim/loadingAnim";

export function OrdersClient() {
  const { user, isLoading: isUserLoading } = useUser();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const response = await apiClient.get("/orders/my-orders");
        setOrders(response.data);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
        setError("Failed to load your orders. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    } else if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [user, isUserLoading]);

  if (isLoading || isUserLoading) {
    return <LoadingAnim />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return <OrderHistory orders={orders} />;
}
