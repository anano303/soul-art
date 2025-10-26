"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useParams } from "next/navigation";
import { OrderDetails } from "@/modules/orders/components/order-details";
import HeartLoading from "@/components/HeartLoading/HeartLoading";

export default function OrderPage() {
  const params = useParams();
  const orderId = params?.id ? (params.id as string) : "";

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const url = `/orders/${orderId}`;
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      return response.json();
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return <HeartLoading size="medium" />;
  }

  if (error) {
    return (
      <div className="Container">
        <div className="max-w-7xl mx-auto py-10">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Unable to view order</h2>
            <p className="text-gray-600">You do not have permission to view this order or it does not exist.</p>
          </div>
        </div>
      </div>
    );
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
