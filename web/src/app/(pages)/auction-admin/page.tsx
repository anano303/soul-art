"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/axios";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle,
  Wallet,
  Send,
  History,
  AlertCircle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import "./auction-admin.css";

interface DashboardData {
  settings: {
    platformCommissionPercent: number;
    auctionAdminCommissionPercent: number;
  };
  summary: {
    totalAuctionsSold: number;
    totalSales: number;
    totalPlatformCommission: number;
    totalEarnings: number;
    withdrawnEarnings: number;
    pendingEarnings: number;
  };
  recentEarnings: Array<{
    _id: string;
    auctionTitle: string;
    saleAmount: number;
    platformCommissionAmount: number;
    auctionAdminEarnings: number;
    sellerName: string;
    buyerName: string;
    paidAt: string;
  }>;
  completedAuctions: Array<{
    _id: string;
    title: string;
    currentPrice: number;
    commissionAmount: number;
    sellerEarnings: number;
    seller: {
      ownerFirstName?: string;
      ownerLastName?: string;
      storeName?: string;
    };
    currentWinner: {
      ownerFirstName?: string;
      ownerLastName?: string;
      firstName?: string;
      lastName?: string;
    };
    paymentDate: string;
  }>;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  identificationNumber: string | null;
  accountNumber: string | null;
  beneficiaryBankCode: string | null;
  phoneNumber: string | null;
  auctionAdminBalance: number;
  auctionAdminPendingWithdrawal: number;
  auctionAdminTotalEarnings: number;
  auctionAdminTotalWithdrawn: number;
}

interface WithdrawalData {
  _id: string;
  amount: number;
  status: string;
  accountNumber: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

export default function AuctionAdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"dashboard" | "withdrawals">(
    "dashboard",
  );

  // Withdrawal state
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Profile data for balance display
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (user.role !== "auction_admin") {
      router.push("/");
      return;
    }

    fetchDashboard();
  }, [user, isLoading, router]);

  useEffect(() => {
    if (activeTab === "withdrawals" && withdrawals.length === 0) {
      fetchWithdrawals();
      fetchProfile();
    }
  }, [activeTab, withdrawals.length]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<DashboardData>(
        "/auctions/admin/dashboard",
      );
      setDashboardData(response.data);
      setError(null);
    } catch (err: unknown) {
      console.error("Failed to fetch dashboard:", err);
      setError("დეშბორდის ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get<ProfileData>(
        "/auctions/admin/profile",
      );
      setProfile(response.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      const response = await apiClient.get<{ withdrawals: WithdrawalData[] }>(
        "/auctions/admin/withdrawals",
      );
      setWithdrawals(response.data.withdrawals);
    } catch (err) {
      console.error("Failed to fetch withdrawals:", err);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);
      setWithdrawMessage(null);

      const amount = withdrawAmount ? parseFloat(withdrawAmount) : undefined;
      await apiClient.post("/auctions/admin/withdrawal", { amount });

      setWithdrawMessage({
        type: "success",
        text: "გატანის მოთხოვნა წარმატებით გაიგზავნა",
      });
      setWithdrawAmount("");
      fetchWithdrawals();
      fetchProfile();
      fetchDashboard();
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "შეცდომა გატანის მოთხოვნისას";
      setWithdrawMessage({ type: "error", text: errorMessage });
    } finally {
      setWithdrawing(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="auction-admin-page">
        <div className="auction-admin-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>იტვირთება...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auction-admin-page">
        <div className="auction-admin-container">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchDashboard}>თავიდან ცდა</button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { settings, summary, recentEarnings, completedAuctions } =
    dashboardData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="status-badge pending">მოლოდინში</span>;
      case "APPROVED":
        return <span className="status-badge approved">დამტკიცებული</span>;
      case "PROCESSED":
        return <span className="status-badge processed">დასრულებული</span>;
      case "REJECTED":
        return <span className="status-badge rejected">უარყოფილი</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="auction-admin-page">
      <div className="auction-admin-container">
        <div className="auction-admin-header">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h1>აუქციონის ადმინ პანელი</h1>
              <p>მართეთ აუქციონები და თვალყური ადევნეთ შემოსავლებს</p>
            </div>
            <Link
              href="/auction-admin/auctions/create"
              className="create-auction-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                background: "linear-gradient(135deg, #c9a961 0%, #b8963f 100%)",
                color: "#000",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                transition: "all 0.3s ease",
              }}
            >
              <Plus size={18} />
              აუქციონის შექმნა
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <TrendingUp size={18} />
            დეშბორდი
          </button>
          <button
            className={`tab-button ${activeTab === "withdrawals" ? "active" : ""}`}
            onClick={() => setActiveTab("withdrawals")}
          >
            <Wallet size={18} />
            გატანა
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {/* Commission Info - Only shows auction admin's share */}
            <div className="commission-info-card">
              <div className="commission-item">
                <TrendingUp size={20} />
                <span>თქვენი საკომისიო:</span>
                <strong>{settings.auctionAdminCommissionPercent}%</strong>
              </div>
            </div>
            {/* Stats Cards - Only auction admin relevant stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon sales">
                  <ShoppingBag size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">გაყიდული აუქციონები</span>
                  <span className="stat-value">
                    {summary.totalAuctionsSold}
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon revenue">
                  <DollarSign size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">ჯამური გაყიდვები</span>
                  <span className="stat-value">
                    {summary.totalSales.toFixed(2)} ₾
                  </span>
                </div>
              </div>

              <div className="stat-card highlight">
                <div className="stat-icon earnings">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">თქვენი შემოსავალი</span>
                  <span className="stat-value">
                    {summary.totalEarnings.toFixed(2)} ₾
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon pending">
                  <Clock size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">გასატანი თანხა</span>
                  <span className="stat-value">
                    {summary.pendingEarnings.toFixed(2)} ₾
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon withdrawn">
                  <CheckCircle size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">გატანილი</span>
                  <span className="stat-value">
                    {summary.withdrawnEarnings.toFixed(2)} ₾
                  </span>
                </div>
              </div>
            </div>{" "}
            {/* Recent Earnings */}
            <div className="section">
              <h2>ბოლო შემოსავლები</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>აუქციონი</th>
                      <th>გაყიდვის ფასი</th>
                      <th>თქვენი შემოსავალი</th>
                      <th>გამყიდველი</th>
                      <th>მყიდველი</th>
                      <th>თარიღი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEarnings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-row">
                          შემოსავლები ჯერ არ არის
                        </td>
                      </tr>
                    ) : (
                      recentEarnings.map((earning) => (
                        <tr key={earning._id}>
                          <td className="title-cell">{earning.auctionTitle}</td>
                          <td>{earning.saleAmount.toFixed(2)} ₾</td>
                          <td className="earnings-cell">
                            {earning.auctionAdminEarnings.toFixed(2)} ₾
                          </td>
                          <td>{earning.sellerName}</td>
                          <td>{earning.buyerName}</td>
                          <td>
                            {new Date(earning.paidAt).toLocaleDateString(
                              "ka-GE",
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Completed Auctions - Simplified for auction admin */}
            <div className="section">
              <h2>გაყიდული აუქციონები</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>სახელი</th>
                      <th>საბოლოო ფასი</th>
                      <th>თქვენი შემოსავალი</th>
                      <th>გამყიდველი</th>
                      <th>მყიდველი</th>
                      <th>გადახდის თარიღი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedAuctions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-row">
                          გაყიდული აუქციონები ჯერ არ არის
                        </td>
                      </tr>
                    ) : (
                      completedAuctions.map((auction) => (
                        <tr key={auction._id}>
                          <td className="title-cell">{auction.title}</td>
                          <td>{auction.currentPrice.toFixed(2)} ₾</td>
                          <td className="earnings-cell">
                            {(
                              (auction.currentPrice *
                                settings.auctionAdminCommissionPercent) /
                              100
                            ).toFixed(2)}{" "}
                            ₾
                          </td>
                          <td>
                            {auction.seller?.ownerFirstName}{" "}
                            {auction.seller?.ownerLastName ||
                              auction.seller?.storeName}
                          </td>
                          <td>
                            {auction.currentWinner?.ownerFirstName ||
                              auction.currentWinner?.firstName}{" "}
                            {auction.currentWinner?.ownerLastName ||
                              auction.currentWinner?.lastName}
                          </td>
                          <td>
                            {auction.paymentDate
                              ? new Date(
                                  auction.paymentDate,
                                ).toLocaleDateString("ka-GE")
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Withdrawals Tab */}
        {activeTab === "withdrawals" && (
          <div className="withdrawals-section">
            {/* Withdrawal Form */}
            <div className="withdrawal-form-card">
              <h3>
                <Send size={20} />
                თანხის გატანა
              </h3>

              <div className="available-balance">
                <span>ხელმისაწვდომი თანხა:</span>
                <strong>
                  {(profile?.auctionAdminBalance || 0).toFixed(2)} ₾
                </strong>
              </div>

              {withdrawMessage && (
                <div className={`message ${withdrawMessage.type}`}>
                  {withdrawMessage.type === "error" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  {withdrawMessage.text}
                </div>
              )}

              <div className="withdrawal-input-group">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="თანხა (ცარიელი = მთლიანი ბალანსი)"
                  min="50"
                  step="0.01"
                />
                <button
                  className="withdraw-button"
                  onClick={handleWithdraw}
                  disabled={
                    withdrawing || (profile?.auctionAdminBalance || 0) < 50
                  }
                >
                  {withdrawing ? "იგზავნება..." : "გატანის მოთხოვნა"}
                </button>
              </div>

              <p className="min-amount-note">მინიმალური თანხა: 50 ₾</p>
            </div>

            {/* Withdrawal History */}
            <div className="section">
              <h2>
                <History size={20} />
                გატანის ისტორია
              </h2>

              {withdrawalsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>იტვირთება...</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>თანხა</th>
                        <th>ანგარიში</th>
                        <th>სტატუსი</th>
                        <th>მოთხოვნის თარიღი</th>
                        <th>დამუშავების თარიღი</th>
                        <th>მიზეზი</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-row">
                            გატანის მოთხოვნები ჯერ არ არის
                          </td>
                        </tr>
                      ) : (
                        withdrawals.map((withdrawal) => (
                          <tr key={withdrawal._id}>
                            <td className="amount-cell">
                              {withdrawal.amount.toFixed(2)} ₾
                            </td>
                            <td>{withdrawal.accountNumber}</td>
                            <td>{getStatusBadge(withdrawal.status)}</td>
                            <td>
                              {new Date(
                                withdrawal.createdAt,
                              ).toLocaleDateString("ka-GE")}
                            </td>
                            <td>
                              {withdrawal.processedAt
                                ? new Date(
                                    withdrawal.processedAt,
                                  ).toLocaleDateString("ka-GE")
                                : "-"}
                            </td>
                            <td>{withdrawal.rejectionReason || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
