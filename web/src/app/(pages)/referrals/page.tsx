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
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    method: "BANK",
    accountDetails: "",
  });

  const fetchReferralStats = useCallback(async () => {
    const token = getAccessToken();
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
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

  const generateReferralLink = () => {
    if (stats?.referralCode) {
      const baseUrl = window.location.origin;
      return `${baseUrl}/auth/register?ref=${stats.referralCode}`;
    }
    return "";
  };

  const copyReferralLink = () => {
    const link = generateReferralLink();
    navigator.clipboard.writeText(link);
    toast.success("რეფერალური ლინკი კოპირებულია!");
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
        return "text-green-600 bg-green-100";
      case "PENDING":
        return "text-yellow-600 bg-yellow-100";
      case "REJECTED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">რეფერალების სისტემა</h1>
        <p>რეფერალების ინფორმაცია ვერ ჩაიტვირთა</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">რეფერალების სისტემა</h1>

      {/* Info Alert for Sellers */}
      {user?.role === "seller" && (
        <div
          className="info-alert"
          style={{
            background: "#e8f5e8",
            border: "1px solid #4caf50",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "20px" }}>💡</span>
          <div>
            <strong>სელერებისთვის:</strong> ეს არის თქვენი რეფერალების ბალანსი.
            სელერის ბალანსი (გაყიდვებიდან) ცალკეა და შეგიძლიათ ნახოთ{" "}
            <a
              href="/profile/balance"
              style={{ color: "#4caf50", textDecoration: "underline" }}
            >
              ბალანსის გვერდზე
            </a>
            .
          </div>
        </div>
      )}

      {/* მთავარი სტატისტიკა */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">ბალანსი</h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.balance.toFixed(2)} ლარი
          </p>
          <button
            onClick={() => {
              setShowBalanceHistory(!showBalanceHistory);
              if (!showBalanceHistory) {
                fetchBalanceHistory();
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-800 mt-2"
          >
            {showBalanceHistory ? "დამალვა" : "ისტორია"}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            მოწვეული სელერები
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.totalReferrals}
          </p>
          <p className="text-sm text-gray-500">
            დამტკიცებული: {stats.approvedReferrals}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            მიღებული ბონუსი
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {stats.totalEarnings.toFixed(2)} ლარი
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            მოლოდინში
          </h3>
          <p className="text-3xl font-bold text-orange-600">
            {stats.pendingEarnings.toFixed(2)} ლარი
          </p>
          <p className="text-sm text-gray-500">
            მოლოდინში: {stats.pendingReferrals}
          </p>
        </div>
      </div>

      {/* რეფერალური ლინკი */}
      <div className="bg-white p-6 rounded-lg shadow border mb-8">
        <h3 className="text-xl font-semibold mb-4">თქვენი რეფერალური ლინკი</h3>
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={generateReferralLink()}
            readOnly
            className="flex-1 p-3 border rounded-lg bg-gray-50"
          />
          <button
            onClick={copyReferralLink}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            კოპირება
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          გაუზიარეთ ეს ლინკი სელერებს რეგისტრაციისთვის. თითოეული დამტკიცებული
          სელერისთვის მიიღებთ 5 ლარს.
        </p>
      </div>

      {/* ბალანსის ისტორია */}
      {showBalanceHistory && (
        <div className="bg-white p-6 rounded-lg shadow border mb-8">
          <h3 className="text-xl font-semibold mb-4">ბალანსის ისტორია</h3>
          {balanceHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
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
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount.toFixed(2)} ₾
                      </td>
                      <td>{transaction.balanceBefore.toFixed(2)} ₾</td>
                      <td>{transaction.balanceAfter.toFixed(2)} ₾</td>
                      <td className="text-sm text-gray-600">
                        {transaction.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">ბალანსის ისტორია არ არის</p>
          )}
        </div>
      )}

      {/* გატანის ღილაკი */}
      <div className="bg-white p-6 rounded-lg shadow border mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">ბალანსის გატანა</h3>
            <p className="text-sm text-gray-600">
              მინიმუმ: 50 ლარი | თვიური ლიმიტი: 2 გატანა | ამ თვეში
              გამოყენებული: {stats.monthlyWithdrawals}/2
            </p>
          </div>
          <button
            onClick={() => setShowWithdrawalForm(true)}
            disabled={stats.balance < 50 || stats.monthlyWithdrawals >= 2}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            გატანის მოთხოვნა
          </button>
        </div>
      </div>

      {/* გატანის ფორმა */}
      {showWithdrawalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">ბალანსის გატანა</h3>
            <form onSubmit={submitWithdrawalRequest}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  თანხა (ლარი)
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
                  className="w-full p-3 border rounded-lg"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  გადახდის მეთოდი
                </label>
                <select
                  value={withdrawalForm.method}
                  onChange={(e) =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      method: e.target.value,
                    })
                  }
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="BANK">ბანკი</option>
                  <option value="PAYBOX">პეიბოქსი</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full p-3 border rounded-lg"
                  placeholder={
                    withdrawalForm.method === "BANK"
                      ? "GE29TB7777777777777777"
                      : "+995555123456"
                  }
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  გაგზავნა
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* მოწვეული სელერების სია */}
      <div className="bg-white rounded-lg shadow border mb-8">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">მოწვეული სელერები</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  სელერი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ტიპი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  სტატუსი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ბონუსი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  თარიღი
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.referrals.map((referral) => (
                <tr key={referral.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">
                        {referral.referred.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {referral.referred.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {referral.type === "SELLER" ? "სელერი" : "მომხმარებელი"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        referral.status
                      )}`}
                    >
                      {getStatusText(referral.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {referral.bonusAmount.toFixed(2)} ლარი
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(referral.createdAt).toLocaleDateString("ka-GE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* გატანის მოთხოვნები */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">გატანის მოთხოვნები</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  თანხა
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  მეთოდი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  სტატუსი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  თარიღი
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {withdrawalRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {request.amount.toFixed(2)} ლარი
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {request.method === "BANK" ? "ბანკი" : "პეიბოქსი"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusText(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString("ka-GE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
