"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { OrderHistory } from "@/modules/profile/components/order-history";

export default function OrderHistoryPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["myOrders"],
    queryFn: async () => {
      const response = await fetchWithAuth("/orders/myorders");
      return response.json();
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">
            შეკვეთების ისტორია ცარიელია
          </h2>
          <p className="text-gray-600">თქვენ ჯერ არ გაგიკეთებიათ შეკვეთა</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="max-w-7xl mx-auto py-10">
        <OrderHistory orders={orders} />
      </div>
    </div>
  );
}
