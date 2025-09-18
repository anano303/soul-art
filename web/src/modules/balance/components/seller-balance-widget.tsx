import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSellerBalance } from "@/modules/balance/api/balance-api";
import { Wallet, TrendingUp, DollarSign, RefreshCw } from "lucide-react";
import "./balance-widget.css";

interface SellerBalanceWidgetProps {
  userId: string;
}

export function SellerBalanceWidget({ userId }: SellerBalanceWidgetProps) {
  const {
    data: balance,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["seller-balance", userId],
    queryFn: () => getSellerBalance(),
    // Only fetch once when component mounts
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    // No automatic refetch - balance updates only when:
    // 1. User manually refreshes page
    // 2. After making a transaction
    // 3. User clicks refresh button
  });

  if (isLoading) {
    return (
      <div className="balance-widget">
        <div className="balance-widget-loading">მონაცემების ჩატვირთვა...</div>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  return (
    <div className="balance-widget">
      <div className="balance-widget-title">
        <Wallet className="balance-widget-icon" />
        <span>ჩემი ბალანსი</span>
        <button
          onClick={() => refetch()}
          className="balance-refresh-btn"
          disabled={isLoading}
          title="ბალანსის განახლება"
        >
          <RefreshCw
            className={`refresh-icon ${isLoading ? "spinning" : ""}`}
          />
        </button>
      </div>

      <div className="balance-widget-content">
        <div className="balance-card-mini">
          <div className="balance-card-mini-header">
            <DollarSign className="balance-mini-icon" />
            <span>მიმდინარე ბალანსი</span>
          </div>
          <div className="balance-amount-mini">
            {balance.totalBalance.toFixed(2)} ₾
          </div>
        </div>

        <div className="balance-card-mini">
          <div className="balance-card-mini-header">
            <TrendingUp className="balance-mini-icon" />
            <span>სულ შემოსავალი</span>
          </div>
          <div className="balance-amount-mini total">
            {balance.totalEarnings.toFixed(2)} ₾
          </div>
        </div>

        <div className="balance-card-mini">
          <div className="balance-card-mini-header">
            <Wallet className="balance-mini-icon" />
            <span>გატანილი თანხა</span>
          </div>
          <div className="balance-amount-mini withdrawn">
            {balance.totalWithdrawn.toFixed(2)} ₾
          </div>
        </div>
      </div>

      <div className="balance-widget-footer">
        <a href="/profile/balance" className="balance-details-link">
          დეტალური ინფორმაცია →
        </a>
      </div>
    </div>
  );
}
