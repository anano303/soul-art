"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllSellerBalances } from "@/modules/balance/api/balance-api";
import { ProtectedRoute } from "@/components/protected-route";
import { Wallet, User, TrendingUp, ArrowDownCircle } from "lucide-react";
import { PendingWithdrawalsWidget } from "@/modules/balance/components/pending-withdrawals-widget";
import "./admin-balances.css";

export default function AdminBalancesPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-seller-balances", page],
    queryFn: () => getAllSellerBalances(page, limit),
  });

  if (isLoading) {
    return (
      <ProtectedRoute adminOnly={true}>
        <div className="admin-balances-loading">მონაცემების ჩატვირთვა...</div>
      </ProtectedRoute>
    );
  }

  const balances = data?.balances || [];
  const totalPages = data?.totalPages || 0;

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="admin-balances-container">
        <div className="admin-balances-header">
          <h1 className="admin-balances-title">
            <Wallet className="title-icon" />
            სელერების ბალანსები
          </h1>

          {/* Pending Withdrawals Widget */}
          <PendingWithdrawalsWidget />
        </div>

        {balances.length === 0 ? (
          <div className="no-balances">არცერთი სელერის ბალანსი არ მოიძებნა</div>
        ) : (
          <>
            <div className="balances-grid">
              {balances.map((balance) => (
                <div key={balance._id} className="balance-item">
                  <div className="balance-item-header">
                    <User className="seller-icon" />
                    <div className="seller-info">
                      <div className="seller-name">
                        {typeof balance.seller === "object" &&
                        balance.seller?.storeName
                          ? balance.seller.storeName
                          : typeof balance.seller === "object" &&
                            balance.seller?.name
                          ? balance.seller.name
                          : "უცნობი სელერი"}
                      </div>
                      <div className="seller-email">
                        {typeof balance.seller === "object" &&
                          balance.seller?.email}
                      </div>
                    </div>
                  </div>

                  <div className="balance-details">
                    <div className="balance-stat">
                      <Wallet className="stat-icon" />
                      <div>
                        <div className="stat-label">ხელმისაწვდომი ბალანსი</div>
                        <div className="stat-value">
                          {balance.totalBalance.toFixed(2)} ₾
                        </div>
                      </div>
                    </div>

                    <div className="balance-stat">
                      <TrendingUp className="stat-icon" />
                      <div>
                        <div className="stat-label">მთლიანი შემოსავალი</div>
                        <div className="stat-value">
                          {balance.totalEarnings.toFixed(2)} ₾
                        </div>
                      </div>
                    </div>

                    <div className="balance-stat">
                      <ArrowDownCircle className="stat-icon" />
                      <div>
                        <div className="stat-label">გატანილი თანხა</div>
                        <div className="stat-value">
                          {balance.totalWithdrawn.toFixed(2)} ₾
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="balance-dates">
                    <div className="date-info">
                      შექმნილია:{" "}
                      {new Date(balance.createdAt).toLocaleDateString("ka-GE")}
                    </div>
                    <div className="date-info">
                      განახლებულია:{" "}
                      {new Date(balance.updatedAt).toLocaleDateString("ka-GE")}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  წინა
                </button>
                <span className="pagination-info">
                  გვერდი {page} / {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  შემდეგი
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
