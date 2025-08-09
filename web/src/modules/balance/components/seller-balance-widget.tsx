import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSellerBalance } from "@/modules/balance/api/balance-api";
import { Wallet, TrendingUp, DollarSign } from "lucide-react";
import "./balance-widget.css";

interface SellerBalanceWidgetProps {
  userId: string;
}

export function SellerBalanceWidget({ userId }: SellerBalanceWidgetProps) {
  const { data: balance, isLoading } = useQuery({
    queryKey: ["seller-balance", userId],
    queryFn: () => getSellerBalance(),
    refetchInterval: 30000, // Refresh every 30 seconds
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
