"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import "./sales-dashboard.css";

interface CommissionStats {
  totalCommissions: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  totalOrders: number;
}

interface BalanceInfo {
  availableBalance: number;
  pendingWithdrawals: number;
  totalWithdrawn: number;
  totalApproved: number;
  pendingCommissions: number;
  commissionRate: number;
}

interface Commission {
  _id: string;
  order: {
    _id: string;
    totalPrice: number;
    status: string;
    createdAt: string;
  };
  customer?: {
    name: string;
    email: string;
  };
  guestEmail?: string;
  orderTotal: number;
  commissionPercent: number;
  commissionAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  createdAt: string;
  approvedAt?: string;
}

interface RefCodeInfo {
  salesRefCode: string | null;
  referralLink: string | null;
}

interface WithdrawalTransaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export default function SalesManagerDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [refCodeInfo, setRefCodeInfo] = useState<RefCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<
    WithdrawalTransaction[]
  >([]);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [withdrawalTotalPages, setWithdrawalTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      // Fetch stats
      const statsRes = await fetchWithAuth("/sales-commission/my-stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch balance
      const balanceRes = await fetchWithAuth("/sales-commission/my-balance");
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
      }

      // Fetch ref code
      const refRes = await fetchWithAuth("/sales-commission/my-ref-code");
      if (refRes.ok) {
        const refData = await refRes.json();
        setRefCodeInfo(refData);
      }

      // Fetch commissions
      const commUrl = statusFilter
        ? `/sales-commission/my-commissions?page=${currentPage}&status=${statusFilter}`
        : `/sales-commission/my-commissions?page=${currentPage}`;
      const commRes = await fetchWithAuth(commUrl);
      if (commRes.ok) {
        const commData = await commRes.json();
        setCommissions(commData.commissions);
        setTotalPages(commData.pages);
      }

      // Fetch withdrawal history
      const withdrawalsRes = await fetchWithAuth(
        `/sales-commission/my-withdrawals?page=${withdrawalPage}&limit=10`
      );
      if (withdrawalsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json();
        setWithdrawalHistory(withdrawalsData.withdrawals);
        setWithdrawalTotalPages(withdrawalsData.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, withdrawalPage]);

  useEffect(() => {
    // Check if user is sales manager or combined role
    const userData = getUserData();
    const role = userData?.role?.toLowerCase();
    const isSalesManager =
      role === Role.SalesManager || role === "seller_sales_manager";
    if (!isSalesManager && role !== Role.Admin) {
      router.push("/admin/products");
      return;
    }

    fetchData();
  }, [fetchData, router]);

  const generateRefCode = async () => {
    setGenerating(true);
    try {
      const res = await fetchWithAuth("/sales-commission/generate-code", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setRefCodeInfo({
          salesRefCode: data.salesRefCode,
          referralLink: `${window.location.origin}?ref=${data.salesRefCode}`,
        });
      }
    } catch (error) {
      console.error("Failed to generate code:", error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

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

    if (!balance || parseFloat(withdrawalAmount) > balance.availableBalance) {
      toast({
        title: "შეცდომა",
        description: "არასაკმარისი ბალანსი",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      const res = await fetchWithAuth("/sales-commission/withdrawal/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parseFloat(withdrawalAmount) }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "წარმატება",
          description: data.message,
        });
        setWithdrawalAmount("");
        fetchData(); // Refresh data
      } else {
        toast({
          title: "შეცდომა",
          description: data.message || "თანხის გატანის მოთხოვნა ვერ გაიგზავნა",
          variant: "destructive",
        });
      }
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

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      PENDING: "status-pending",
      APPROVED: "status-approved",
      PAID: "status-paid",
      CANCELLED: "status-cancelled",
    };
    const statusLabels: Record<string, string> = {
      PENDING: "მოლოდინში",
      APPROVED: "დამტკიცებული",
      PAID: "გადახდილი",
      CANCELLED: "გაუქმებული",
    };
    return (
      <span className={`status-badge ${statusClasses[status] || ""}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="sales-dashboard loading">
        <p>იტვირთება...</p>
      </div>
    );
  }

  return (
    <div className="sales-dashboard">
      <div className="dashboard-header">
        <h1>Sales Manager Dashboard</h1>
        <p>მართე შენი გაყიდვები და საკომისიოები</p>
      </div>

      {/* Referral Link Section */}
      <div className="referral-section card">
        <h2>შენი რეფერალური ლინკი</h2>
        {refCodeInfo?.salesRefCode ? (
          <div className="ref-code-display">
            <div className="ref-code-box">
              <span className="ref-code">{refCodeInfo.salesRefCode}</span>
              <button
                onClick={() => copyToClipboard(refCodeInfo.salesRefCode!)}
                className="copy-btn"
              >
                {copied ? "დაკოპირდა!" : "კოპირება"}
              </button>
            </div>
            <div className="ref-link-box">
              <input
                type="text"
                value={refCodeInfo.referralLink || ""}
                readOnly
                className="ref-link-input"
              />
              <button
                onClick={() => copyToClipboard(refCodeInfo.referralLink!)}
                className="copy-btn"
              >
                {copied ? "დაკოპირდა!" : "ლინკის კოპირება"}
              </button>
            </div>
            <p className="ref-info">
              ეს ლინკი გაუგზავნე კლიენტებს. როცა ამ ლინკით შემოვლენ და იყიდიან,
              მიიღებ <strong>{balance?.commissionRate ?? 3}%</strong>{" "}
              საკომისიოს!
            </p>
          </div>
        ) : (
          <div className="generate-code">
            <p>ჯერ არ გაქვს რეფერალური კოდი</p>
            <button
              onClick={generateRefCode}
              disabled={generating}
              className="generate-btn"
            >
              {generating ? "იტვირთება..." : "კოდის გენერაცია"}
            </button>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>მთლიანი საკომისიო</h3>
          <p className="stat-value">
            {stats?.totalCommissions?.toFixed(2) || "0.00"} ₾
          </p>
        </div>
        <div className="stat-card pending">
          <h3>მოლოდინში</h3>
          <p className="stat-value">
            {stats?.pendingAmount?.toFixed(2) || "0.00"} ₾
          </p>
        </div>
        <div className="stat-card approved">
          <h3>დამტკიცებული</h3>
          <p className="stat-value">
            {stats?.approvedAmount?.toFixed(2) || "0.00"} ₾
          </p>
        </div>
        <div className="stat-card paid">
          <h3>გადახდილი</h3>
          <p className="stat-value">
            {stats?.paidAmount?.toFixed(2) || "0.00"} ₾
          </p>
        </div>
        <div className="stat-card orders">
          <h3>შეკვეთები</h3>
          <p className="stat-value">{stats?.totalOrders || 0}</p>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="withdrawal-section card">
        <h2>💰 თანხის გატანა</h2>
        <div className="withdrawal-info-grid">
          <div className="balance-info-item">
            <span className="label">ხელმისაწვდომი ბალანსი:</span>
            <span className="value available">
              {balance?.availableBalance?.toFixed(2) || "0.00"} ₾
            </span>
          </div>
          <div className="balance-info-item">
            <span className="label">გატანისთვის მოთხოვნილი:</span>
            <span className="value pending">
              {balance?.pendingWithdrawals?.toFixed(2) || "0.00"} ₾
            </span>
          </div>
          <div className="balance-info-item">
            <span className="label">სულ გატანილი:</span>
            <span className="value withdrawn">
              {balance?.totalWithdrawn?.toFixed(2) || "0.00"} ₾
            </span>
          </div>
        </div>
        {(balance?.pendingCommissions ?? 0) > 0 && (
          <div className="pending-commissions-note">
            <p>
              ⏳ მოლოდინში (შეკვეთები ჯერ არ მიტანილა):{" "}
              <strong>
                {balance?.pendingCommissions?.toFixed(2) || "0.00"} ₾
              </strong>
            </p>
          </div>
        )}
        <div className="withdrawal-form">
          <input
            type="number"
            value={withdrawalAmount}
            onChange={(e) => setWithdrawalAmount(e.target.value)}
            placeholder="შეიყვანეთ თანხა (მინიმუმ 1 ₾)"
            min="1"
            max={balance?.availableBalance || 0}
            className="withdrawal-input"
          />
          <button
            onClick={handleWithdrawal}
            disabled={isWithdrawing || !balance || balance.availableBalance < 1}
            className="withdrawal-btn"
          >
            {isWithdrawing ? "მოთხოვნის გაგზავნა..." : "თანხის გატანა"}
          </button>
        </div>
        <p className="withdrawal-note">
          ⚠️ მხოლოდ <strong>დამტკიცებული</strong> საკომისიოების გატანა
          შეგიძლიათ. გატანა ხდება BOG ანგარიშზე. პროფილში უნდა გქონდეთ
          მითითებული ანგარიშის ნომერი და პირადი ნომერი.
        </p>
      </div>

      {/* Withdrawal History Section */}
      <div className="withdrawal-history-section card">
        <h2>📜 გატანების ისტორია</h2>
        {withdrawalHistory.length === 0 ? (
          <p className="no-data">გატანების ისტორია არ მოიძებნა</p>
        ) : (
          <>
            <table className="commissions-table">
              <thead>
                <tr>
                  <th>თარიღი</th>
                  <th>ტიპი</th>
                  <th>თანხა</th>
                  <th>აღწერა</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalHistory.map((transaction) => (
                  <tr key={transaction._id}>
                    <td data-label="თარიღი">
                      {new Date(transaction.createdAt).toLocaleDateString("ka")}
                    </td>
                    <td data-label="ტიპი">
                      <span
                        className={`status-badge ${
                          transaction.type === "sm_withdrawal_completed"
                            ? "status-paid"
                            : "status-pending"
                        }`}
                      >
                        {transaction.type === "sm_withdrawal_completed"
                          ? "დასრულებული"
                          : "მოთხოვნილი"}
                      </span>
                    </td>
                    <td
                      data-label="თანხა"
                      className={
                        transaction.type === "sm_withdrawal_completed"
                          ? "withdrawal-amount-completed"
                          : "withdrawal-amount-pending"
                      }
                    >
                      {transaction.amount.toFixed(2)} ₾
                    </td>
                    <td data-label="აღწერა">{transaction.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Withdrawal Pagination */}
            {withdrawalTotalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setWithdrawalPage((p) => Math.max(1, p - 1))}
                  disabled={withdrawalPage === 1}
                >
                  წინა
                </button>
                <span>
                  {withdrawalPage} / {withdrawalTotalPages}
                </span>
                <button
                  onClick={() =>
                    setWithdrawalPage((p) =>
                      Math.min(withdrawalTotalPages, p + 1)
                    )
                  }
                  disabled={withdrawalPage === withdrawalTotalPages}
                >
                  შემდეგი
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="nav-links">
        <Link href="/admin/sales-analytics" className="nav-link analytics">
          📊 დეტალური ანალიტიკა
        </Link>
        <Link href="/admin/orders" className="nav-link">
          📦 შეკვეთების ნახვა
        </Link>
      </div>

      {/* Commissions Table */}
      <div className="commissions-section card">
        <div className="section-header">
          <h2>საკომისიოების ისტორია</h2>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="status-filter"
          >
            <option value="">ყველა</option>
            <option value="PENDING">მოლოდინში</option>
            <option value="APPROVED">დამტკიცებული</option>
            <option value="PAID">გადახდილი</option>
            <option value="CANCELLED">გაუქმებული</option>
          </select>
        </div>

        {commissions.length === 0 ? (
          <p className="no-data">საკომისიოები არ მოიძებნა</p>
        ) : (
          <>
            <table className="commissions-table">
              <thead>
                <tr>
                  <th>თარიღი</th>
                  <th>შეკვეთა</th>
                  <th>კლიენტი</th>
                  <th>თანხა</th>
                  <th>საკომისიო</th>
                  <th>სტატუსი</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <tr key={commission._id}>
                    <td data-label="თარიღი">
                      {new Date(commission.createdAt).toLocaleDateString("ka")}
                    </td>
                    <td data-label="შეკვეთა">
                      <Link
                        href={`/admin/orders/${commission.order._id}`}
                        className="order-link"
                      >
                        #{commission.order._id.slice(-6)}
                      </Link>
                    </td>
                    <td data-label="კლიენტი">
                      {commission.customer?.email ||
                        commission.guestEmail ||
                        "სტუმარი"}
                    </td>
                    <td data-label="თანხა">
                      {commission.orderTotal.toFixed(2)} ₾
                    </td>
                    <td data-label="საკომისიო" className="commission-amount">
                      +{commission.commissionAmount.toFixed(2)} ₾
                    </td>
                    <td data-label="სტატუსი">
                      {getStatusBadge(commission.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  წინა
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  შემდეგი
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
