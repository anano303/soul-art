"use client";

import { SellerBalanceDashboard } from "@/modules/balance/components/seller-balance-dashboard";
import { ProtectedRoute } from "@/components/protected-route";

export default function BalancePage() {
  return (
    <ProtectedRoute>
      <SellerBalanceDashboard />
    </ProtectedRoute>
  );
}
