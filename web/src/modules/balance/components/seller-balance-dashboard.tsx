"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getSellerBalance,
  getSellerTransactions,
  requestWithdrawal,
} from "../api/balance-api";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/modules/auth/hooks/use-user";
import {
  Wallet,
  TrendingUp,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
} from "lucide-react";
import "./balance-dashboard.css";

export function SellerBalanceDashboard() {
  const { toast } = useToast();
  const { user } = useUser();
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Fetch balance
  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["seller-balance"],
    queryFn: getSellerBalance,
    enabled: user?.role?.toUpperCase() === "SELLER", // Only fetch if user is seller
  });

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["seller-transactions"],
    queryFn: () => getSellerTransactions(1, 10),
    enabled: user?.role?.toUpperCase() === "SELLER", // Only fetch if user is seller
  });

  // Check if user is seller
  if (user && user.role?.toUpperCase() !== "SELLER") {
    return (
      <div className="balance-dashboard">
        <div className="balance-loading">
          მხოლოდ სელერებს შეუძლიათ ბალანსის ნახვა
        </div>
      </div>
    );
  }

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast({
        title: "შეცდომა",
        description: "თანხა უნდა იყოს დადებითი რიცხვი",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(withdrawalAmount) < 1) {
      toast({
        title: "შეცდომა",
        description: "მინიმალური გასატანი თანხაა 1 ლარი",
        variant: "destructive",
      });
      return;
    }

    if (!balance || parseFloat(withdrawalAmount) > balance.totalBalance) {
      toast({
        title: "შეცდომა",
        description: "არასაკმარისი ბალანსი",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      const result = await requestWithdrawal(parseFloat(withdrawalAmount));
      toast({
        title: "წარმატება",
        description: result.message,
      });
      setWithdrawalAmount("");
      refetchBalance();
    } catch (error: unknown) {
      toast({
        title: "შეცდომა",
        description:
          error instanceof Error
            ? error.message
            : "თანხის გატანის მოთხოვნა ვერ გაიგზავნა",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (balanceLoading) {
    return (
      <div className="balance-loading">ბალანსის ინფორმაციის ჩატვირთვა...</div>
    );
  }

  return (
    <div className="balance-dashboard">
      <h1 className="dashboard-title">ჩემი ბალანსი</h1>

      {/* Balance Cards */}
      <div className="balance-cards-grid">
        <div className="balance-card">
          <div className="balance-card-header">
            <div className="balance-card-title">
              <Wallet className="balance-icon" />
              ხელმისაწვდომი ბალანსი
            </div>
          </div>
          <div className="balance-card-content">
            <div className="balance-amount">
              {balance?.totalBalance?.toFixed(2) || "0.00"} ₾
            </div>
          </div>
        </div>

        <div className="balance-card">
          <div className="balance-card-header">
            <div className="balance-card-title">
              <TrendingUp className="balance-icon" />
              მთლიანი შემოსავალი
            </div>
          </div>
          <div className="balance-card-content">
            <div className="balance-amount">
              {balance?.totalEarnings?.toFixed(2) || "0.00"} ₾
            </div>
          </div>
        </div>

        <div className="balance-card">
          <div className="balance-card-header">
            <div className="balance-card-title">
              <Clock className="balance-icon" />
              გატანისთვის მოთხოვნილი
            </div>
          </div>
          <div className="balance-card-content">
            <div className="balance-amount">
              {balance?.pendingWithdrawals?.toFixed(2) || "0.00"} ₾
            </div>
          </div>
        </div>

        <div className="balance-card">
          <div className="balance-card-header">
            <div className="balance-card-title">
              <CheckCircle className="balance-icon" />
              გატანილი თანხა
            </div>
          </div>
          <div className="balance-card-content">
            <div className="balance-amount">
              {balance?.totalWithdrawn?.toFixed(2) || "0.00"} ₾
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="withdrawal-card">
        <div className="withdrawal-header">
          <div className="withdrawal-title">
            <Download className="balance-icon" />
            თანხის გატანა
          </div>
        </div>
        <div className="withdrawal-content">
          <div className="withdrawal-form">
            <label htmlFor="amount">თანხა (₾)</label>
            <input
              id="amount"
              type="number"
              value={withdrawalAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setWithdrawalAmount(e.target.value)
              }
              placeholder="შეიყვანეთ თანხა (მინიმუმ 1 ₾)"
              min="1"
              max={balance?.totalBalance || 0}
              className="withdrawal-input"
            />
            <button
              onClick={handleWithdrawal}
              disabled={isWithdrawing || !balance || balance.totalBalance < 1}
              className="withdrawal-button"
            >
              {isWithdrawing
                ? "მოთხოვნის გაგზავნა..."
                : "თანხის გატანის მოთხოვნა"}
            </button>
          </div>
          <div className="withdrawal-info">
            <p>
              ხელმისაწვდომი ბალანსი:{" "}
              <strong>{balance?.totalBalance?.toFixed(2) || "0.00"} ₾</strong>
            </p>
            <p className="withdrawal-note withdrawal-note-highlight">
              📋 <strong>მინიმალური გასატანი თანხა: 1 ₾</strong>
            </p>
            <p className="withdrawal-note">
              ⏰ თანხა ჩაირიცხება <strong>5 სამუშაო დღის განმავლობაში</strong>
            </p>
            <p className="withdrawal-note">
              🏦 საჭიროა <strong>ანგარიშის ნომრის</strong> მითითება პროფილში
            </p>
            <p className="withdrawal-note">
              * თანხის გატანა შესაძლებელია მხოლოდ იმ შემთხვევაში, როცა შეკვეთის
              სტატუსი &ldquo;მიტანილია&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="transactions-card">
        <div className="transactions-header">
          <div className="transactions-title">
            <DollarSign className="balance-icon" />
            ბოლო ტრანზაქციები
          </div>
        </div>
        <div className="transactions-content">
          {transactionsLoading ? (
            <div className="transactions-loading">
              ტრანზაქციების ჩატვირთვა...
            </div>
          ) : transactionsData?.transactions?.length ? (
            <div className="transactions-list">
              {transactionsData.transactions.map((transaction) => (
                <div key={transaction._id} className="transaction-item">
                  <div className="transaction-info">
                    <div className="transaction-description">
                      {transaction.description}
                    </div>
                    <div className="transaction-date">
                      {new Date(transaction.createdAt).toLocaleDateString(
                        "ka-GE"
                      )}
                    </div>
                  </div>
                  <div
                    className={`transaction-amount ${
                      transaction.type === "earning" ? "positive" : "negative"
                    }`}
                  >
                    {transaction.type === "earning" ? "+" : "-"}
                    {Math.abs(transaction.amount).toFixed(2)} ₾
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-transactions">
              ტრანზაქციების ისტორია ცარიელია
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
