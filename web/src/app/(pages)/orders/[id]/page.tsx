"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useParams } from "next/navigation";
import { OrderDetails } from "@/modules/orders/components/order-details";

export default function OrderPage() {
  const params = useParams();
  const orderId = params.id as string;

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const response = await fetchWithAuth(`/orders/${orderId}`);
      return response.json();
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div className="Container">
      <div className="max-w-7xl mx-auto py-10">
        <OrderDetails order={order} />
      </div>
    </div>
  );
}
