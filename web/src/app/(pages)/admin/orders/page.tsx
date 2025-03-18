"use client";

import { OrdersList } from "@/modules/admin/components/orders-list";

export default function AdminOrdersPage() {
  return (
    <div className="admin-orders-container">
      <div className="orders-content">
        <OrdersList />
      </div>
    </div>
  );
}
