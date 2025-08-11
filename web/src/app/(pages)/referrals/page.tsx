"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAccessToken } from "@/lib/auth";
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
    const token = getAccessToken();
    console.log("Token:", token); // Debug log
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Response status:", response.status); // Debug log
      if (response.ok) {
        const data = await response.json();
        console.log("Stats data:", data); // Debug log
        setStats(data);
      } else {
        console.error("Response not ok:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch referral stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWithdrawalRequests = useCallback(async () => {
    const token = getAccessToken();
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/withdrawal/my-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setWithdrawalRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch withdrawal requests:", error);
    }
  }, []);

  const fetchBalanceHistory = useCallback(async () => {
    const token = getAccessToken();
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/balance/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBalanceHistory(data);
      }
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
      const path =
        type === "seller"
          ? "/sellers-register#seller-register-form"
          : "/register";
      const link = `${baseUrl}${path}?ref=${stats.referralCode}`;
      console.log("Generated link:", link); // Debug log
      return link;
    }
    console.log("No referral code found"); // Debug log
    return "";
  };

  const copyReferralLink = (type: "user" | "seller" = "user") => {
    const link = generateReferralLink(type);
    navigator.clipboard.writeText(link);
    const linkType = type === "seller" ? "სელერის" : "მომხმარებლის";

    // Set copied state for visual feedback
    setCopiedButton(type);
    setTimeout(() => setCopiedButton(null), 2000);

    toast.success(`${linkType} რეფერალური ლინკი კოპირებულია!`);
  };

  const submitWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = getAccessToken();
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/withdrawal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: parseFloat(withdrawalForm.amount),
            method: withdrawalForm.method,
            accountDetails: withdrawalForm.accountDetails,
          }),
        }
      );

      if (response.ok) {
        toast.success("გატანის მოთხოვნა წარმატებით გაიგზავნა!");
        setShowWithdrawalForm(false);
        setWithdrawalForm({ amount: "", method: "BANK", accountDetails: "" });
        fetchWithdrawalRequests();
        fetchReferralStats();
      } else {
        const error = await response.json();
        toast.error(error.message || "გატანის მოთხოვნის გაგზავნა ვერ მოხერხდა");
      }
    } catch {
      toast.error("შეცდომა მოხდა");
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
        return "მოლოდინში";
      case "APPROVED":
        return "დამტკიცებული";
      case "REJECTED":
        return "უარყოფილი";
      case "PROCESSED":
        return "დამუშავებული";
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
            რეფერალების სისტემა
          </h1>
          <p className="ref-text-gray-600">
            რეფერალების ინფორმაცია ვერ ჩაიტვირთა
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="referrals-page">
      <div className="ref-container mx-auto ref-px-4 py-8">
        <h1 className="ref-text-3xl ref-font-bold ref-mb-8 ref-text-gray-800">
          რეფერალების სისტემა
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
              <strong>სელერებისთვის:</strong> ეს არის თქვენი რეფერალების
              ბალანსი. სელერის ბალანსი (გაყიდვებიდან) ცალკეა და შეგიძლიათ ნახოთ{" "}
              <a
                href="/profile/balance"
                style={{
                  color: "#059669",
                  textDecoration: "underline",
                  fontWeight: "600",
                }}
              >
                ბალანსის გვერდზე
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
              ბალანსი
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
              {showBalanceHistory ? "დამალვა" : "ისტორია"}
            </button>
          </div>

          <div className="ref-bg-white ref-p-6 ref-card">
            <h3 className="ref-text-lg ref-font-semibold ref-text-gray-700 ref-mb-2">
              მოწვეული პირები
            </h3>
            <p className="ref-text-3xl ref-font-bold ref-text-blue-600">
              {stats.totalReferrals}
            </p>
            <p className="ref-text-sm ref-text-gray-500">
              დამტკიცებული: {stats.approvedReferrals}
            </p>
          </div>

          <div className="ref-bg-white ref-p-6 ref-card">
            <h3 className="ref-text-lg ref-font-semibold ref-text-gray-700 ref-mb-2">
              მიღებული ბონუსი
            </h3>
            <p className="ref-text-3xl ref-font-bold ref-text-purple-600">
              {stats.totalEarnings.toFixed(2)} ლარი
            </p>
          </div>

          <div className="ref-bg-white ref-p-6 ref-card">
            <h3 className="ref-text-lg ref-font-semibold ref-text-gray-700 ref-mb-2">
              მოლოდინში
            </h3>
            <p className="ref-text-3xl ref-font-bold ref-text-orange-600">
              {stats.pendingEarnings.toFixed(2)} ლარი
            </p>
            <p className="ref-text-sm ref-text-gray-500">
              მოლოდინში: {stats.pendingReferrals}
            </p>
          </div>
        </div>

        {/* რეფერალური ლინკები */}
        <div className="ref-bg-white ref-p-6 ref-card ref-mb-8">
          <h3 className="ref-text-xl ref-font-semibold ref-mb-4 ref-text-gray-800">
            თქვენი რეფერალური ლინკები
          </h3>

          {/* სელერის რეფერალური ლინკი */}
          <div className="ref-mb-6">
            <h4 className="ref-text-lg ref-font-medium ref-mb-2 ref-text-gray-700">
              სელერის რეგისტრაცია (5 ლარი)
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
                📋 კოპირება
              </button>
            </div>
            <p className="ref-text-sm ref-text-gray-600 ref-mt-4">
              გაუზიარეთ ეს ლინკი სელერებს რეგისტრაციისთვის. თითოეული
              დამტკიცებული სელერისთვის მიიღებთ 5 ლარს.
            </p>
          </div>

          {/* მომხმარებლის რეფერალური ლინკი */}
          <div>
            <h4 className="ref-text-lg ref-font-medium ref-mb-2 ref-text-gray-700">
              მომხმარებლის რეგისტრაცია (0.20 ლარი)
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
                📋 კოპირება
              </button>
            </div>
            <p className="ref-text-sm ref-text-gray-600 ref-mt-4">
              გაუზიარეთ ეს ლინკი ჩვეულებრივ მომხმარებლებს რეგისტრაციისთვის.
              თითოეული რეგისტრირებული მომხმარებლისთვის მიიღებთ 0.20 ლარს.
            </p>
          </div>
        </div>

        {/* ბალანსის ისტორია */}
        {showBalanceHistory && (
          <div className="ref-bg-white ref-p-6 ref-card ref-mb-8">
            <h3 className="ref-text-xl ref-font-semibold ref-mb-4 ref-text-gray-800">
              ბალანსის ისტორია
            </h3>
            {balanceHistory.length > 0 ? (
              <div className="ref-table-container">
                <table className="ref-table">
                  <thead>
                    <tr>
                      <th>თარიღი</th>
                      <th>ტიპი</th>
                      <th>თანხა</th>
                      <th>ბალანსი მანამდე</th>
                      <th>ბალანსი მერე</th>
                      <th>აღწერა</th>
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
              <p className="ref-text-gray-500">ბალანსის ისტორია არ არის</p>
            )}
          </div>
        )}

        {/* გატანის ღილაკი */}
        <div className="ref-card ref-p-6 ref-mb-8">
          <div className="ref-flex ref-justify-between ref-items-center ref-withdrawal-section">
            <div>
              <h3 className="ref-text-xl ref-font-semibold ref-text-gray-800">
                ბალანსის გატანა
              </h3>
              <p className="ref-text-sm ref-text-gray-600 ref-mt-2">
                მინიმუმ: 50 ლარი | თვიური ლიმიტი: 2 გატანა | ამ თვეში
                გამოყენებული: {stats.monthlyWithdrawals}/2
              </p>
            </div>
            <button
              onClick={() => setShowWithdrawalForm(true)}
              disabled={stats.balance < 50 || stats.monthlyWithdrawals >= 2}
              className="ref-btn ref-btn-success"
            >
              💰 გატანის მოთხოვნა
            </button>
          </div>
        </div>

        {/* გატანის ფორმა */}
        {showWithdrawalForm && (
          <div className="ref-modal-overlay">
            <div className="ref-modal ref-modal-md">
              <h3 className="ref-text-xl ref-font-semibold ref-mb-4 ref-text-gray-800">
                ბალანსის გატანა
              </h3>
              <form onSubmit={submitWithdrawalRequest}>
                <div className="ref-form-group">
                  <label className="ref-form-label">თანხა (ლარი)</label>
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
                  <label className="ref-form-label">გადახდის მეთოდი</label>
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
                    <option value="BANK">ბანკი</option>
                    <option value="PAYBOX">პეიბოქსი</option>
                  </select>
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">
                    {withdrawalForm.method === "BANK"
                      ? "ბანკის ანგარიში (IBAN)"
                      : "პეიბოქსის ნომერი"}
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
                    გაუქმება
                  </button>
                  <button
                    type="submit"
                    className="ref-btn ref-btn-success ref-flex-1"
                  >
                    გაგზავნა
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
              მოწვეული პირები
            </h3>
          </div>
          <div className="ref-table-container">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>პირი</th>
                  <th>ტიპი</th>
                  <th>სტატუსი</th>
                  <th>ბონუსი</th>
                  <th>თარიღი</th>
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
                      {referral.type === "SELLER" ? "სელერი" : "მომხმარებელი"}
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
              გატანის მოთხოვნები
            </h3>
          </div>
          <div className="ref-table-container">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>თანხა</th>
                  <th>მეთოდი</th>
                  <th>სტატუსი</th>
                  <th>თარიღი</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="ref-text-sm ref-font-medium ref-text-gray-900">
                      {request.amount.toFixed(2)} ლარი
                    </td>
                    <td className="ref-text-sm ref-text-gray-900">
                      {request.method === "BANK" ? "ბანკი" : "პეიბოქსი"}
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
