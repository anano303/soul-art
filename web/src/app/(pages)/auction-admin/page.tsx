"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/axios";
import Image from "next/image";
import { toast } from "react-hot-toast";
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
  Gavel,
  X,
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
    isPaid: boolean;
    seller: {
      name?: string;
      ownerFirstName?: string;
      ownerLastName?: string;
      storeName?: string;
    };
    currentWinner: {
      name?: string;
      ownerFirstName?: string;
      ownerLastName?: string;
      firstName?: string;
      lastName?: string;
    };
    paymentDate: string;
    endedAt?: string;
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

interface Auction {
  _id: string;
  title: string;
  description: string;
  mainImage: string;
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  startingPrice: number;
  currentPrice: number;
  endDate: string;
  status: "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED";
  totalBids: number;
  seller: {
    ownerFirstName?: string;
    ownerLastName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  createdAt: string;
}

type AuctionFilter =
  | "ALL"
  | "ACTIVE"
  | "ENDED"
  | "PENDING"
  | "CANCELLED"
  | "SCHEDULED";

export default function AuctionAdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "auctions" | "withdrawals"
  >("dashboard");

  // Update tab from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'auctions' || hash === 'withdrawals' || hash === 'dashboard') {
      setActiveTab(hash);
    }
    
    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '');
      if (newHash === 'auctions' || newHash === 'withdrawals' || newHash === 'dashboard') {
        setActiveTab(newHash);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (tab: "dashboard" | "auctions" | "withdrawals") => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

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

  // Auctions management state
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [auctionFilter, setAuctionFilter] = useState<AuctionFilter>("ALL");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingAuctionId, setRejectingAuctionId] = useState<string | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");

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

  useEffect(() => {
    if (activeTab === "auctions") {
      fetchAuctions();
    }
  }, [activeTab, auctionFilter]);

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

  const fetchAuctions = async () => {
    try {
      setAuctionsLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        status: auctionFilter,
      });
      const response = await apiClient.get(`/auctions?${params.toString()}`);
      setAuctions(response.data.auctions || []);
    } catch (err) {
      console.error("Failed to fetch auctions:", err);
      toast.error("აუქციონების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setAuctionsLoading(false);
    }
  };

  const approveAuction = async (auctionId: string) => {
    try {
      await apiClient.patch(`/auctions/${auctionId}/approve`);
      toast.success("აუქციონი დადასტურებულია");
      fetchAuctions();
    } catch (err) {
      console.error("Failed to approve auction:", err);
      toast.error("აუქციონის დამტკიცება ვერ მოხერხდა");
    }
  };

  const openRejectModal = (auctionId: string) => {
    setRejectingAuctionId(auctionId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const rejectAuction = async () => {
    if (!rejectingAuctionId) return;
    try {
      await apiClient.patch(`/auctions/${rejectingAuctionId}/reject`, {
        reason: rejectReason || "არ არის მითითებული",
      });
      toast.success("აუქციონი უარყოფილია");
      setRejectModalOpen(false);
      setRejectingAuctionId(null);
      setRejectReason("");
      fetchAuctions();
    } catch (err) {
      console.error("Failed to reject auction:", err);
      toast.error("აუქციონის უარყოფა ვერ მოხერხდა");
    }
  };

  const deleteAuction = async (auctionId: string) => {
    if (!confirm("დარწმუნებული ხართ, რომ გსურთ აუქციონის წაშლა?")) return;
    try {
      await apiClient.delete(`/auctions/${auctionId}`);
      toast.success("აუქციონი წაშლილია");
      fetchAuctions();
    } catch (err: unknown) {
      console.error("Failed to delete auction:", err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "აუქციონის წაშლა ვერ მოხერხდა";
      toast.error(errorMessage);
    }
  };

  const getSellerName = (seller: Auction["seller"]) => {
    if (seller.ownerFirstName && seller.ownerLastName) {
      return `${seller.ownerFirstName} ${seller.ownerLastName}`;
    }
    if (seller.firstName && seller.lastName) {
      return `${seller.firstName} ${seller.lastName}`;
    }
    return seller.email;
  };

  const getAuctionStatusClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "status-active";
      case "ENDED":
        return "status-ended";
      case "PENDING":
        return "status-pending";
      case "CANCELLED":
        return "status-cancelled";
      case "SCHEDULED":
        return "status-scheduled";
      default:
        return "";
    }
  };

  const getAuctionStatusText = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "აქტიური";
      case "ENDED":
        return "დასრულებული";
      case "PENDING":
        return "მოლოდინში";
      case "CANCELLED":
        return "გაუქმებული";
      case "SCHEDULED":
        return "დაგეგმილი";
      default:
        return status;
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
              href="/auctions/create"
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
            onClick={() => handleTabChange("dashboard")}
          >
            <TrendingUp size={18} />
            დეშბორდი
          </button>
          <button
            className={`tab-button ${activeTab === "auctions" ? "active" : ""}`}
            onClick={() => handleTabChange("auctions")}
          >
            <Gavel size={18} />
            აუქციონები
          </button>
          <button
            className={`tab-button ${activeTab === "withdrawals" ? "active" : ""}`}
            onClick={() => handleTabChange("withdrawals")}
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
              <h2>დასრულებული აუქციონები</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>სახელი</th>
                      <th>საბოლოო ფასი</th>
                      <th>თქვენი შემოსავალი</th>
                      <th>გამყიდველი</th>
                      <th>მყიდველი</th>
                      <th>გადახდის სტატუსი</th>
                      <th>თარიღი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedAuctions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-row">
                          დასრულებული აუქციონები ჯერ არ არის
                        </td>
                      </tr>
                    ) : (
                      completedAuctions.map((auction) => (
                        <tr key={auction._id}>
                          <td className="title-cell">{auction.title}</td>
                          <td>{auction.currentPrice.toFixed(2)} ₾</td>
                          <td className="earnings-cell">
                            {auction.isPaid ? (
                              <>
                                {(
                                  (auction.currentPrice *
                                    settings.auctionAdminCommissionPercent) /
                                  100
                                ).toFixed(2)}{" "}
                                ₾
                              </>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>-</span>
                            )}
                          </td>
                          <td>
                            {auction.seller?.ownerFirstName && auction.seller?.ownerLastName
                              ? `${auction.seller.ownerFirstName} ${auction.seller.ownerLastName}`
                              : auction.seller?.storeName || auction.seller?.name || "-"}
                          </td>
                          <td>
                            {auction.currentWinner?.ownerFirstName && auction.currentWinner?.ownerLastName
                              ? `${auction.currentWinner.ownerFirstName} ${auction.currentWinner.ownerLastName}`
                              : auction.currentWinner?.name || "-"}
                          </td>
                          <td>
                            {auction.isPaid ? (
                              <span className="status-badge processed">
                                გადახდილია
                              </span>
                            ) : (
                              <span className="status-badge pending">
                                მოლოდინში
                              </span>
                            )}
                          </td>
                          <td>
                            {auction.paymentDate
                              ? new Date(
                                  auction.paymentDate,
                                ).toLocaleDateString("ka-GE")
                              : auction.endedAt
                                ? new Date(auction.endedAt).toLocaleDateString(
                                    "ka-GE",
                                  )
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

        {/* Auctions Management Tab */}
        {activeTab === "auctions" && (
          <div className="auctions-management-section">
            {/* Filter Buttons */}
            <div className="auction-filters">
              {(
                [
                  "ALL",
                  "PENDING",
                  "SCHEDULED",
                  "ACTIVE",
                  "ENDED",
                  "CANCELLED",
                ] as AuctionFilter[]
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setAuctionFilter(status)}
                  className={`filter-btn ${auctionFilter === status ? "active" : ""}`}
                >
                  {status === "ALL" && "ყველა"}
                  {status === "PENDING" && "მოლოდინში"}
                  {status === "SCHEDULED" && "დაგეგმილი"}
                  {status === "ACTIVE" && "აქტიური"}
                  {status === "ENDED" && "დასრულებული"}
                  {status === "CANCELLED" && "გაუქმებული"}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="auction-stats-row">
              <div className="auction-stat">
                <span className="stat-number">{auctions.length}</span>
                <span className="stat-label">სულ</span>
              </div>
              <div className="auction-stat pending">
                <span className="stat-number">
                  {auctions.filter((a) => a.status === "PENDING").length}
                </span>
                <span className="stat-label">მოლოდინში</span>
              </div>
              <div className="auction-stat active">
                <span className="stat-number">
                  {auctions.filter((a) => a.status === "ACTIVE").length}
                </span>
                <span className="stat-label">აქტიური</span>
              </div>
            </div>

            {/* Auctions Table */}
            {auctionsLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>იტვირთება...</p>
              </div>
            ) : auctions.length === 0 ? (
              <div className="empty-state-card">
                <Gavel size={48} />
                <h3>აუქციონები არ მოიძებნა</h3>
                <p>ამ სტატუსის აუქციონები არ არის</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table auctions-table">
                  <thead>
                    <tr>
                      <th>სურათი</th>
                      <th>სათაური</th>
                      <th>გამყიდველი</th>
                      <th>ფასი</th>
                      <th>ბიდები</th>
                      <th>სტატუსი</th>
                      <th>თარიღი</th>
                      <th>მოქმედებები</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auctions.map((auction) => (
                      <tr key={auction._id}>
                        <td>
                          <Image
                            src={
                              auction.mainImage || "/placeholder-artwork.jpg"
                            }
                            alt={auction.title}
                            className="auction-thumbnail"
                            width={60}
                            height={60}
                            unoptimized
                          />
                        </td>
                        <td>
                          <div className="auction-info-cell">
                            <span className="auction-title">
                              {auction.title}
                            </span>
                            <span className="auction-type">
                              {auction.artworkType === "ORIGINAL"
                                ? "ორიგინალი"
                                : "რეპროდუქცია"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="seller-info-cell">
                            <span className="seller-name">
                              {getSellerName(auction.seller)}
                            </span>
                            <span className="seller-email">
                              {auction.seller.email}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="price-info-cell">
                            <span className="current-price">
                              {auction.currentPrice} ₾
                            </span>
                            <span className="starting-price">
                              საწყისი: {auction.startingPrice} ₾
                            </span>
                          </div>
                        </td>
                        <td className="bid-count">{auction.totalBids}</td>
                        <td>
                          <span
                            className={`auction-status-badge ${getAuctionStatusClass(auction.status)}`}
                          >
                            {getAuctionStatusText(auction.status)}
                          </span>
                        </td>
                        <td className="date-cell">
                          {new Date(auction.createdAt).toLocaleDateString(
                            "ka-GE",
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <Link
                              href={`/auctions/${auction._id}`}
                              className="action-btn view-btn"
                              title="ნახვა"
                            >
                              👁️
                            </Link>
                            {auction.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => approveAuction(auction._id)}
                                  className="action-btn approve-btn"
                                  title="დამტკიცება"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => openRejectModal(auction._id)}
                                  className="action-btn reject-btn"
                                  title="უარყოფა"
                                >
                                  ✗
                                </button>
                              </>
                            )}
                            {/* Auction admin can only edit/delete PENDING or SCHEDULED auctions with no bids */}
                            {(() => {
                              const canEdit = (auction.status === "PENDING" || auction.status === "SCHEDULED") && auction.totalBids === 0;
                              const editTooltip = !canEdit 
                                ? auction.totalBids > 0 
                                  ? "რედაქტირება შეუძლებელია: აუქციონს უკვე აქვს ბიდები"
                                  : auction.status === "ACTIVE"
                                    ? "რედაქტირება შეუძლებელია: აუქციონი აქტიურია"
                                    : auction.status === "ENDED"
                                      ? "რედაქტირება შეუძლებელია: აუქციონი დასრულებულია"
                                      : "რედაქტირება შეუძლებელია"
                                : "რედაქტირება";
                              const deleteTooltip = !canEdit 
                                ? auction.totalBids > 0 
                                  ? "წაშლა შეუძლებელია: აუქციონს უკვე აქვს ბიდები"
                                  : auction.status === "ACTIVE"
                                    ? "წაშლა შეუძლებელია: აუქციონი აქტიურია"
                                    : auction.status === "ENDED"
                                      ? "წაშლა შეუძლებელია: აუქციონი დასრულებულია"
                                      : "წაშლა შეუძლებელია"
                                : "წაშლა";
                              return (
                                <>
                                  <Link
                                    href={canEdit ? `/admin/auctions/${auction._id}/edit` : "#"}
                                    className={`action-btn edit-btn ${!canEdit ? 'disabled' : ''}`}
                                    title={editTooltip}
                                    onClick={(e) => {
                                      if (!canEdit) {
                                        e.preventDefault();
                                        toast.error(editTooltip);
                                      }
                                    }}
                                    style={!canEdit ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                  >
                                    ✏️
                                  </Link>
                                  <button
                                    onClick={() => {
                                      if (!canEdit) {
                                        toast.error(deleteTooltip);
                                        return;
                                      }
                                      deleteAuction(auction._id);
                                    }}
                                    className={`action-btn delete-btn ${!canEdit ? 'disabled' : ''}`}
                                    title={deleteTooltip}
                                    style={!canEdit ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                  >
                                    🗑️
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Reject Modal */}
        {rejectModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setRejectModalOpen(false)}
          >
            <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>აუქციონის უარყოფა</h3>
                <button
                  className="modal-close"
                  onClick={() => setRejectModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <label>უარყოფის მიზეზი</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="მიუთითეთ უარყოფის მიზეზი..."
                  rows={4}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setRejectModalOpen(false)}
                >
                  გაუქმება
                </button>
                <button className="btn-reject" onClick={rejectAuction}>
                  უარყოფა
                </button>
              </div>
            </div>
          </div>
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
