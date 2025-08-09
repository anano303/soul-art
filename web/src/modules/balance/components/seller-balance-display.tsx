import React from "react";
import { useSellerBalance } from "@/modules/balance/hooks/useSellerBalance";
import { Wallet } from "lucide-react";

interface SellerBalanceDisplayProps {
  sellerId: string | null;
}

export function SellerBalanceDisplay({ sellerId }: SellerBalanceDisplayProps) {
  const { data: balance, isLoading } = useSellerBalance(sellerId);

  if (!sellerId) {
    return <span className="balance-not-applicable">N/A</span>;
  }

  if (isLoading) {
    return <span className="balance-loading">...</span>;
  }

  if (!balance) {
    return <span className="balance-zero">0.00 ₾</span>;
  }

  return (
    <div className="seller-balance-display">
      <Wallet className="balance-icon-mini" />
      <span className="balance-amount-mini">
        {balance.totalBalance.toFixed(2)} ₾
      </span>
    </div>
  );
}
