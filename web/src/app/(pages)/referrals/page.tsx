"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "react-hot-toast";
import "./referrals.css";

interface ReferralStats {
  referralCode: string;
  balance: number;
  totalReferrals: number;
  approvedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  monthlyWithdrawals: number;
  referrals: Referral[];
}

interface BalanceTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  description: string;
  createdAt: string;
}

interface Referral {
  id: string;
  referred: {
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
  type: string;
  status: string;
  bonusAmount: number;
  createdAt: string;
  approvedAt?: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: string;
  accountDetails: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<BalanceTransaction[]>(
    []
  );
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);
  const [copiedButton, setCopiedButton] = useState<string | null>(null);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    method: "BANK",
    accountDetails: "",
  });

  const fetchReferralStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/referrals/stats`, {
        cache: "no-store",
      });
      const data: ReferralStats = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch referral stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWithdrawalRequests = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/referrals/withdrawal/my-requests`, {
        cache: "no-store",
      });
      const data: WithdrawalRequest[] = await res.json();
      setWithdrawalRequests(data);
    } catch (error) {
      console.error("Failed to fetch withdrawal requests:", error);
    }
  }, []);

  const fetchBalanceHistory = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/referrals/balance/history`, {
        cache: "no-store",
      });
      const data: BalanceTransaction[] = await res.json();
      setBalanceHistory(data);
    } catch (error) {
      console.error("Failed to fetch balance history:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchReferralStats();
      fetchWithdrawalRequests();
    }
  }, [user, fetchReferralStats, fetchWithdrawalRequests]);

  const generateReferralLink = (type: "user" | "seller" = "user") => {
    console.log("Generating referral link, stats:", stats, "type:", type); // Debug log
    if (stats?.referralCode) {
      const baseUrl = window.location.origin;
      if (type === "seller") {
        const link = `${baseUrl}/sellers-register?ref=${stats.referralCode}#seller-register-form`;
        console.log("Generated link:", link); // Debug log
        return link;
      }
      const link = `${baseUrl}/register?ref=${stats.referralCode}`;
      console.log("Generated link:", link); // Debug log
      return link;
    }
    console.log("No referral code found"); // Debug log
    return "";
  };

  const copyReferralLink = (type: "user" | "seller" = "user") => {
    const link = generateReferralLink(type);
    navigator.clipboard.writeText(link);
    const linkType =
      type === "seller" ? t("referral.sellerType") : t("referral.userType");

    // Set copied state for visual feedback
    setCopiedButton(type);
    setTimeout(() => setCopiedButton(null), 2000);

    toast.success(`${linkType} ${t("referral.linkCopied")}`);
  };

  const submitWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetchWithAuth(`/referrals/withdrawal`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(withdrawalForm.amount),
          method: withdrawalForm.method,
          accountDetails: withdrawalForm.accountDetails,
        }),
      });
      toast.success(t("referral.withdrawalSuccess"));
      setShowWithdrawalForm(false);
      setWithdrawalForm({ amount: "", method: "BANK", accountDetails: "" });
      fetchWithdrawalRequests();
      fetchReferralStats();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("referral.withdrawalError");
      toast.error(message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "PROCESSED":
        return "ref-text-green-600 ref-bg-green-100";
      case "PENDING":
        return "ref-text-yellow-600 ref-bg-yellow-100";
      case "REJECTED":
        return "ref-text-red-600 ref-bg-red-100";
      default:
        return "ref-text-gray-600 ref-bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return t("referral.status.pending");
      case "APPROVED":
        return t("referral.status.approved");
      case "REJECTED":
        return t("referral.status.rejected");
      case "PROCESSED":
        return t("referral.status.processed");
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="referrals-page">
        <div className="ref-flex ref-justify-center ref-items-center ref-min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="referrals-page">
        <div className="ref-container mx-auto ref-px-4 py-8">
          <h1 className="ref-text-2xl ref-font-bold ref-mb-6">
            {t("referral.systemTitle")}
          </h1>
          <p className="ref-text-gray-600">{t("referral.loadError")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="referrals-page">
      <div className="ref-container mx-auto ref-px-4 py-8">
        <h1 className="ref-text-3xl ref-font-bold ref-mb-8 ref-text-gray-800">
          {t("referral.systemTitle")}
        </h1>

        {/* Info Alert for Sellers */}
        {user?.role === "seller" && (
          <div
            className="ref-card"
            style={{
              background: "linear-gradient(135deg, #e8f5e8, #f0fdf4)",
              border: "2px solid #10b981",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "32px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
            }}
          >
            <span style={{ fontSize: "24px" }}>💡</span>
            <div style={{ color: "#065f46" }}>
              {t("referral.sellerInfo")}{" "}
              <a
                href="/profile/balance"
                style={{
                  color: "#059669",
                  textDecoration: "underline",
                  fontWeight: "600",
                }}
              >
                {t("referral.balancePage")}
              </a>
              .
            </div>
          </div>
        )}

        {/* მთავარი სტატისტიკა */}
        <div
          className="ref-grid ref-grid-cols-1 ref-md-grid-cols-4 ref-gap-6 ref-mb-8 ref-stats-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          }}
        >
          <div className="ref-bg-white ref-p-6 ref-card">
            <h3 className="ref-text-lg ref-font-semibold ref-text-gray-700 ref-mb-2">
              {t("referral.balance")}
            </h3>
            <p className="ref-text-3xl ref-font-bold ref-text-green-600">
              {stats.balance.toFixed(2)} ლარი
            </p>
            <button
              onClick={() => {
                setShowBalanceHistory(!showBalanceHistory);
                if (!showBalanceHistory) {
                  fetchBalanceHistory();
                }
              }}
              className="ref-text-sm ref-text-blue-600 ref-mt-4"
            >
              {showBalanceHistory
                ? t("referral.hideHistory")
                : t("referral.showHistory")}
            </button>
          </div>

          <div className="ref-bg-white ref-p-6 ref-card">
            <h3 className="ref-text-lg ref-font-semibold ref-text-gray-700 ref-mb-2">
              {t("referral.invitedPeople")}
            </h3>
            <p className="ref-text-3xl ref-font-bold ref-text-blue-600">
              {stats.totalReferrals}
            </p>
            <p className="ref-text-sm ref-text-gray-500">
              {t("referral.approved")}: {stats.approvedReferrals}
            </p>
          </div>

          <div className="ref-bg-white ref-p-6 ref-card">
            <h3 className="ref-text-lg ref-font-semibold ref-text-gray-700 ref-mb-2">
              {t("referral.receivedBonus")}
            </h3>
            <p className="ref-text-3xl ref-font-bold ref-text-purple-600">
              {stats.totalEarnings.toFixed(2)} ლარი
            </p>
          </div>

          <div className="ref-bg-white ref-p-6 ref-card">
            <h3 className="ref-text-lg ref-font-semibold ref-text-gray-700 ref-mb-2">
              {t("referral.pendingAmount")}
            </h3>
            <p className="ref-text-3xl ref-font-bold ref-text-orange-600">
              {stats.pendingEarnings.toFixed(2)} ლარი
            </p>
            <p className="ref-text-sm ref-text-gray-500">
              {t("referral.pending")}: {stats.pendingReferrals}
            </p>
          </div>
        </div>

        {/* რეფერალური ლინკები */}
        <div className="ref-bg-white ref-p-6 ref-card ref-mb-8">
          <h3 className="ref-text-xl ref-font-semibold ref-mb-4 ref-text-gray-800">
            {t("referral.referralLinks")}
          </h3>

          {/* სელერის რეფერალური ლინკი */}
          <div className="ref-mb-6">
            <h4 className="ref-text-lg ref-font-medium ref-mb-2 ref-text-gray-700">
              {t("referral.sellerRegistration")}
            </h4>
            <div className="ref-flex ref-items-center ref-gap-4 ref-input-group">
              <input
                type="text"
                value={generateReferralLink("seller")}
                readOnly
                className="ref-form-input ref-bg-gray-50 ref-text-gray-700"
                style={{
                  minHeight: "44px",
                  fontFamily: "monospace",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={() => copyReferralLink("seller")}
                className={`ref-btn ref-btn-primary ref-btn-copy ${
                  copiedButton === "seller" ? "copied" : ""
                }`}
              >
                📋 {t("referral.copy")}
              </button>
            </div>
            <p className="ref-text-sm ref-text-gray-600 ref-mt-4">
              {t("referral.sellerLinkDescription")}
            </p>
          </div>

          {/* მომხმარებლის რეფერალური ლინკი */}
          <div>
            <h4 className="ref-text-lg ref-font-medium ref-mb-2 ref-text-gray-700">
              {t("referral.userRegistration")}
            </h4>
            <div className="ref-flex ref-items-center ref-gap-4 ref-input-group">
              <input
                type="text"
                value={generateReferralLink("user")}
                readOnly
                className="ref-form-input ref-bg-gray-50 ref-text-gray-700"
                style={{
                  minHeight: "44px",
                  fontFamily: "monospace",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={() => copyReferralLink("user")}
                className={`ref-btn ref-btn-success ref-btn-copy ${
                  copiedButton === "user" ? "copied" : ""
                }`}
              >
                📋 {t("referral.copy")}
              </button>
            </div>
            <p className="ref-text-sm ref-text-gray-600 ref-mt-4">
              {t("referral.userLinkDescription")}
            </p>
          </div>
        </div>

        {/* ბალანსის ისტორია */}
        {showBalanceHistory && (
          <div className="ref-bg-white ref-p-6 ref-card ref-mb-8">
            <h3 className="ref-text-xl ref-font-semibold ref-mb-4 ref-text-gray-800">
              {t("referral.history.title")}
            </h3>
            {balanceHistory.length > 0 ? (
              <div className="ref-table-container">
                <table className="ref-table">
                  <thead>
                    <tr>
                      <th>{t("referral.history.date")}</th>
                      <th>{t("referral.history.type")}</th>
                      <th>{t("referral.history.amount")}</th>
                      <th>{t("referral.history.beforeBalance")}</th>
                      <th>{t("referral.history.afterBalance")}</th>
                      <th>{t("referral.history.description")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceHistory.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          {new Date(transaction.createdAt).toLocaleDateString(
                            "ka-GE"
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              transaction.type === "REFERRAL_BONUS"
                                ? "status-approved"
                                : transaction.type === "WITHDRAWAL"
                                ? "status-pending"
                                : "status-rejected"
                            }`}
                          >
                            {transaction.type === "REFERRAL_BONUS"
                              ? "რეფ. ბონუსი"
                              : transaction.type === "WITHDRAWAL"
                              ? "გატანა"
                              : transaction.type}
                          </span>
                        </td>
                        <td
                          className={
                            transaction.amount > 0
                              ? "ref-text-green-600"
                              : "ref-text-red-600"
                          }
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount.toFixed(2)} ₾
                        </td>
                        <td>{transaction.balanceBefore.toFixed(2)} ₾</td>
                        <td>{transaction.balanceAfter.toFixed(2)} ₾</td>
                        <td className="ref-text-sm ref-text-gray-600">
                          {transaction.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ref-text-gray-500">{t("referral.history.empty")}</p>
            )}
          </div>
        )}

        {/* გატანის ღილაკი */}
        <div className="ref-card ref-p-6 ref-mb-8">
          <div className="ref-flex ref-justify-between ref-items-center ref-withdrawal-section">
            <div>
              <h3 className="ref-text-xl ref-font-semibold ref-text-gray-800">
                {t("referral.withdrawal.title")}
              </h3>
              <p className="ref-text-sm ref-text-gray-600 ref-mt-2">
                {t("referral.withdrawalLimits")} {stats.monthlyWithdrawals}/2
              </p>
            </div>
            <button
              onClick={() => setShowWithdrawalForm(true)}
              disabled={stats.balance < 50 || stats.monthlyWithdrawals >= 2}
              className="ref-btn ref-btn-success"
            >
              💰 {t("referral.withdrawalRequest")}
            </button>
          </div>
        </div>

        {/* გატანის ფორმა */}
        {showWithdrawalForm && (
          <div className="ref-modal-overlay">
            <div className="ref-modal ref-modal-md">
              <h3 className="ref-text-xl ref-font-semibold ref-mb-4 ref-text-gray-800">
                {t("referral.withdrawal.title")}
              </h3>
              <form onSubmit={submitWithdrawalRequest}>
                <div className="ref-form-group">
                  <label className="ref-form-label">
                    {t("referral.amountLabel")}
                  </label>
                  <input
                    type="number"
                    min="50"
                    max={stats.balance}
                    value={withdrawalForm.amount}
                    onChange={(e) =>
                      setWithdrawalForm({
                        ...withdrawalForm,
                        amount: e.target.value,
                      })
                    }
                    className="ref-form-input"
                    required
                  />
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">
                    {t("referral.paymentMethod")}
                  </label>
                  <select
                    value={withdrawalForm.method}
                    onChange={(e) =>
                      setWithdrawalForm({
                        ...withdrawalForm,
                        method: e.target.value,
                      })
                    }
                    className="ref-form-input"
                  >
                    <option value="BANK">{t("referral.bank")}</option>
                    <option value="PAYBOX">{t("referral.paybox")}</option>
                  </select>
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">
                    {withdrawalForm.method === "BANK"
                      ? t("referral.bankAccount")
                      : t("referral.payboxNumber")}
                  </label>
                  <input
                    type="text"
                    value={withdrawalForm.accountDetails}
                    onChange={(e) =>
                      setWithdrawalForm({
                        ...withdrawalForm,
                        accountDetails: e.target.value,
                      })
                    }
                    className="ref-form-input"
                    placeholder={
                      withdrawalForm.method === "BANK"
                        ? "GE29TB7777777777777777"
                        : "+995555123456"
                    }
                    required
                  />
                </div>

                <div className="ref-flex ref-gap-4 ref-mt-6">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawalForm(false)}
                    className="ref-btn ref-btn-secondary ref-flex-1"
                  >
                    {t("referral.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="ref-btn ref-btn-success ref-flex-1"
                  >
                    {t("referral.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* მოწვეული პირების სია */}
        <div className="ref-bg-white ref-card ref-mb-8">
          <div className="ref-p-6 ref-border-b">
            <h3 className="ref-text-xl ref-font-semibold ref-text-gray-800">
              {t("referral.invitedPeopleList")}
            </h3>
          </div>
          <div className="ref-table-container">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>{t("referral.person")}</th>
                  <th>{t("referral.typeColumn")}</th>
                  <th>{t("referral.statusColumn")}</th>
                  <th>{t("referral.bonus")}</th>
                  <th>{t("referral.dateColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td>
                      <div>
                        <div className="ref-font-medium ref-text-gray-900">
                          {referral.referred.name}
                        </div>
                        <div className="ref-text-sm ref-text-gray-500">
                          {referral.referred.email}
                        </div>
                      </div>
                    </td>
                    <td className="ref-text-sm ref-text-gray-900">
                      {referral.type === "SELLER"
                        ? t("referral.seller")
                        : t("referral.user")}
                    </td>
                    <td>
                      <span
                        className={`ref-inline-flex ref-status-badge ${getStatusColor(
                          referral.status
                        )}`}
                      >
                        {getStatusText(referral.status)}
                      </span>
                    </td>
                    <td className="ref-text-sm ref-text-gray-900 ref-font-medium">
                      {referral.bonusAmount.toFixed(2)} ლარი
                    </td>
                    <td className="ref-text-sm ref-text-gray-500">
                      {new Date(referral.createdAt).toLocaleDateString("ka-GE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* გატანის მოთხოვნები */}
        <div className="ref-bg-white ref-card">
          <div className="ref-p-6 ref-border-b">
            <h3 className="ref-text-xl ref-font-semibold ref-text-gray-800">
              {t("referral.withdrawalRequests")}
            </h3>
          </div>
          <div className="ref-table-container">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>{t("referral.amount")}</th>
                  <th>{t("referral.method")}</th>
                  <th>{t("referral.statusColumn")}</th>
                  <th>{t("referral.dateColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="ref-text-sm ref-font-medium ref-text-gray-900">
                      {request.amount.toFixed(2)} ლარი
                    </td>
                    <td className="ref-text-sm ref-text-gray-900">
                      {request.method === "BANK"
                        ? t("referral.bank")
                        : t("referral.paybox")}
                    </td>
                    <td>
                      <span
                        className={`ref-inline-flex ref-status-badge ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td className="ref-text-sm ref-text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString("ka-GE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
