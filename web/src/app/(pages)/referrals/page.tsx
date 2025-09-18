"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "react-hot-toast";
import "./referrals-new.css";

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
      <div className="referralsPage-container">
        <div className="referralsPage-loading">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <span className="ml-4">{t("loading") || "იტვირთება..."}</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="referralsPage-container">
        <div className="referralsPage-wrapper">
          <div className="referralsPage-error">
            <h1 className="referralsPage-title">{t("referral.systemTitle")}</h1>
            <p>{t("referral.loadError")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="referralsPage-container">
      <div className="referralsPage-wrapper">
        {/* Header */}
        <div className="referralsPage-header">
          <h1 className="referralsPage-title">{t("referral.systemTitle")}</h1>
          <p className="referralsPage-subtitle">{t("referral.subtitle")}</p>
        </div>

        {/* Info Alert for Sellers */}
        {user?.role === "seller" && (
          <div className="referralsPage-alert">
            <div className="referralsPage-alert-icon">💡</div>
            <div className="referralsPage-alert-content">
              {t("referral.sellerInfo")}{" "}
              <a href="/profile/balance" className="referralsPage-alert-link">
                {t("referral.balancePage")}
              </a>
              .
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="referralsPage-stats-grid">
          {/* Balance Card */}
          <div className="referralsPage-stat-card">
            <h3 className="referralsPage-stat-title">
              {t("referral.balance")}
            </h3>
            <p className="referralsPage-stat-value balance">
              {stats.balance.toFixed(2)} ₾
            </p>
            <button
              onClick={() => {
                setShowBalanceHistory(!showBalanceHistory);
                if (!showBalanceHistory) {
                  fetchBalanceHistory();
                }
              }}
              className="referralsPage-history-btn"
            >
              {showBalanceHistory
                ? t("referral.hideHistory")
                : t("referral.showHistory")}
            </button>
          </div>

          {/* Invited People Card */}
          <div className="referralsPage-stat-card">
            <h3 className="referralsPage-stat-title">
              {t("referral.invitedPeople")}
            </h3>
            <p className="referralsPage-stat-value referrals">
              {stats.totalReferrals}
            </p>
            <p className="referralsPage-stat-subtitle">
              {t("referral.approved")}: {stats.approvedReferrals}
            </p>
          </div>

          {/* Received Bonus Card */}
          <div className="referralsPage-stat-card">
            <h3 className="referralsPage-stat-title">
              {t("referral.receivedBonus")}
            </h3>
            <p className="referralsPage-stat-value earnings">
              {stats.totalEarnings.toFixed(2)} ₾
            </p>
          </div>

          {/* Pending Amount Card */}
          <div className="referralsPage-stat-card">
            <h3 className="referralsPage-stat-title">
              {t("referral.pendingAmount")}
            </h3>
            <p className="referralsPage-stat-value pending">
              {stats.pendingEarnings.toFixed(2)} ₾
            </p>
            <p className="referralsPage-stat-subtitle">
              {t("referral.pending")}: {stats.pendingReferrals}
            </p>
          </div>
        </div>

        {/* Referral Links Section */}
        <div className="referralsPage-card">
          <div className="referralsPage-card-header">
            <h3 className="referralsPage-card-title">
              {t("referral.referralLinks")}
            </h3>
          </div>
          <div className="referralsPage-card-content">
            {/* Seller Link */}
            <div className="referralsPage-link-section">
              <h4 className="referralsPage-link-title">
                {t("referral.sellerRegistration")}
              </h4>
              <div className="referralsPage-input-group">
                <input
                  type="text"
                  value={generateReferralLink("seller")}
                  readOnly
                  className="referralsPage-input"
                />
                <button
                  onClick={() => copyReferralLink("seller")}
                  className={`referralsPage-copy-btn primary ${
                    copiedButton === "seller" ? "copied" : ""
                  }`}
                >
                  📋 {t("referral.copy")}
                </button>
              </div>
              <p className="referralsPage-link-description">
                {t("referral.sellerLinkDescription")}
              </p>
            </div>

            {/* User Link */}
            <div className="referralsPage-link-section">
              <h4 className="referralsPage-link-title">
                {t("referral.userRegistration")}
              </h4>
              <div className="referralsPage-input-group">
                <input
                  type="text"
                  value={generateReferralLink("user")}
                  readOnly
                  className="referralsPage-input"
                />
                <button
                  onClick={() => copyReferralLink("user")}
                  className={`referralsPage-copy-btn success ${
                    copiedButton === "user" ? "copied" : ""
                  }`}
                >
                  📋 {t("referral.copy")}
                </button>
              </div>
              <p className="referralsPage-link-description">
                {t("referral.userLinkDescription")}
              </p>
            </div>
          </div>
        </div>

        {/* Balance History */}
        {showBalanceHistory && (
          <div className="referralsPage-card">
            <div className="referralsPage-card-header">
              <h3 className="referralsPage-card-title">
                {t("referral.history.title")}
              </h3>
            </div>
            <div className="referralsPage-card-content">
              {balanceHistory.length > 0 ? (
                <div className="referralsPage-table-container">
                  <table className="referralsPage-table">
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
                              className={`referralsPage-status-badge ${
                                transaction.type === "REFERRAL_BONUS"
                                  ? "referralsPage-status-approved"
                                  : transaction.type === "WITHDRAWAL"
                                  ? "referralsPage-status-pending"
                                  : "referralsPage-status-rejected"
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
                            style={{
                              color:
                                transaction.amount > 0 ? "#10b981" : "#ef4444",
                              fontWeight: "600",
                            }}
                          >
                            {transaction.amount > 0 ? "+" : ""}
                            {transaction.amount.toFixed(2)} ₾
                          </td>
                          <td>{transaction.balanceBefore.toFixed(2)} ₾</td>
                          <td>{transaction.balanceAfter.toFixed(2)} ₾</td>
                          <td
                            style={{ fontSize: "0.875rem", color: "#6b7280" }}
                          >
                            {transaction.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="referralsPage-empty">
                  {t("referral.history.empty")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Withdrawal Section */}
        <div className="referralsPage-card">
          <div className="referralsPage-card-content">
            <div className="referralsPage-withdrawal-section">
              <div className="referralsPage-withdrawal-info">
                <h3>{t("referral.withdrawal.title")}</h3>
                <p className="referralsPage-withdrawal-limits">
                  {t("referral.withdrawalLimits")} {stats.monthlyWithdrawals}/2
                </p>
              </div>
              <button
                onClick={() => setShowWithdrawalForm(true)}
                disabled={stats.balance < 50 || stats.monthlyWithdrawals >= 2}
                className="referralsPage-withdrawal-btn"
              >
                💰 {t("referral.withdrawalRequest")}
              </button>
            </div>
          </div>
        </div>

        {/* გატანის ფორმა */}
        {showWithdrawalForm && (
          <div className="referralsPage-modal-overlay">
            <div className="referralsPage-modal">
              <div className="referralsPage-modal-content">
                <h3>{t("referral.withdrawal.title")}</h3>
                <form onSubmit={submitWithdrawalRequest}>
                  <div className="referralsPage-form-group">
                    <label className="referralsPage-form-label">
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
                      className="referralsPage-form-input"
                      required
                    />
                  </div>

                  <div className="referralsPage-form-group">
                    <label className="referralsPage-form-label">
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
                      className="referralsPage-form-input"
                    >
                      <option value="BANK">{t("referral.bank")}</option>
                      <option value="PAYBOX">{t("referral.paybox")}</option>
                    </select>
                  </div>

                  <div className="referralsPage-form-group">
                    <label className="referralsPage-form-label">
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
                      className="referralsPage-form-input"
                      placeholder={
                        withdrawalForm.method === "BANK"
                          ? "GE29TB7777777777777777"
                          : "+995555123456"
                      }
                      required
                    />
                  </div>

                  <div className="referralsPage-form-actions">
                    <button
                      type="button"
                      onClick={() => setShowWithdrawalForm(false)}
                      className="referralsPage-btn referralsPage-btn-secondary"
                    >
                      {t("referral.cancel")}
                    </button>
                    <button
                      type="submit"
                      className="referralsPage-btn referralsPage-btn-primary"
                    >
                      {t("referral.submit")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* მოწვეული პირების სია */}
        <div className="referralsPage-card">
          <div className="referralsPage-card-header">
            <h3 className="referralsPage-card-title">
              {t("referral.invitedPeopleList")}
            </h3>
          </div>
          <div className="referralsPage-card-content">
            {stats.referrals.length > 0 ? (
              <div className="referralsPage-table-container">
                <table className="referralsPage-table">
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
                          <div className="referralsPage-user-info">
                            <div className="referralsPage-user-name">
                              {referral.referred.name}
                            </div>
                            <div className="referralsPage-user-email">
                              {referral.referred.email}
                            </div>
                          </div>
                        </td>
                        <td>
                          {referral.type === "SELLER"
                            ? t("referral.seller")
                            : t("referral.user")}
                        </td>
                        <td>
                          <span
                            className={`referralsPage-status-badge ${
                              referral.status === "APPROVED"
                                ? "referralsPage-status-approved"
                                : referral.status === "PENDING"
                                ? "referralsPage-status-pending"
                                : "referralsPage-status-rejected"
                            }`}
                          >
                            {getStatusText(referral.status)}
                          </span>
                        </td>
                        <td style={{ fontWeight: "600" }}>
                          {referral.bonusAmount.toFixed(2)} ლარი
                        </td>
                        <td style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                          {new Date(referral.createdAt).toLocaleDateString(
                            "ka-GE"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="referralsPage-empty">
                არავინ არ გაქვს მოწვეული ჯერ
              </p>
            )}
          </div>
        </div>

        {/* გატანის მოთხოვნები */}
        <div className="referralsPage-card">
          <div className="referralsPage-card-header">
            <h3 className="referralsPage-card-title">
              {t("referral.withdrawalRequests")}
            </h3>
          </div>
          <div className="referralsPage-card-content">
            {withdrawalRequests.length > 0 ? (
              <div className="referralsPage-table-container">
                <table className="referralsPage-table">
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
                        <td style={{ fontWeight: "600" }}>
                          {request.amount.toFixed(2)} ლარი
                        </td>
                        <td>
                          {request.method === "BANK"
                            ? t("referral.bank")
                            : t("referral.paybox")}
                        </td>
                        <td>
                          <span
                            className={`referralsPage-status-badge ${
                              request.status === "APPROVED" ||
                              request.status === "PROCESSED"
                                ? "referralsPage-status-approved"
                                : request.status === "PENDING"
                                ? "referralsPage-status-pending"
                                : "referralsPage-status-rejected"
                            }`}
                          >
                            {getStatusText(request.status)}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                          {new Date(request.createdAt).toLocaleDateString(
                            "ka-GE"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="referralsPage-empty">
                ჯერ არ გაქვს გატანის მოთხოვნები
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
