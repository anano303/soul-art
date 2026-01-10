"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Role } from "@/types/role";
import {
  Users,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  Eye,
  Wallet,
  History,
  Edit2,
  Save,
  X,
} from "lucide-react";
import "./sales-managers.css";

interface ManagerStats {
  manager: {
    _id: string;
    name: string;
    email: string;
    salesRefCode: string;
    createdAt: string;
    salesTotalWithdrawn?: number;
    salesPendingWithdrawal?: number;
    salesCommissionRate?: number;
  };
  stats: {
    totalCommissions: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    totalOrders: number;
  };
}

interface PendingWithdrawal {
  _id: string;
  name: string;
  email: string;
  accountNumber: string;
  identificationNumber: string;
  salesPendingWithdrawal: number;
  salesCommissionBalance: number;
  salesTotalWithdrawn: number;
}

interface WithdrawalTransaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export default function AdminSalesManagersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [managers, setManagers] = useState<ManagerStats[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [managerCommissions, setManagerCommissions] = useState<any[]>([]);
  const [withdrawalTransactions, setWithdrawalTransactions] = useState<WithdrawalTransaction[]>([]);
  const [showWithdrawals, setShowWithdrawals] = useState<string | null>(null);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<number>(5);
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== Role.Admin)) {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(
        "/sales-commission/admin/all-managers"
      );
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManagerCommissions = async (managerId: string) => {
    try {
      const response = await fetchWithAuth(
        `/sales-commission/admin/manager/${managerId}/commissions?limit=50`
      );
      if (response.ok) {
        const data = await response.json();
        setManagerCommissions(data.commissions || []);
      }
    } catch (error) {
      console.error("Error fetching commissions:", error);
    }
  };

  const fetchWithdrawalTransactions = async (managerId: string) => {
    try {
      const response = await fetchWithAuth(
        `/balance/admin/sales-manager/${managerId}/transactions?limit=50`
      );
      if (response.ok) {
        const data = await response.json();
        setWithdrawalTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching withdrawal transactions:", error);
    }
  };

  const startEditingRate = (managerId: string, currentRate: number) => {
    setEditingRateId(managerId);
    setEditRateValue(currentRate);
  };

  const cancelEditingRate = () => {
    setEditingRateId(null);
    setEditRateValue(3);
  };

  const saveCommissionRate = async (managerId: string) => {
    setSavingRate(true);
    try {
      const response = await fetchWithAuth(
        `/sales-commission/admin/manager/${managerId}/commission-rate`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commissionRate: editRateValue }),
        }
      );

      if (response.ok) {
        // განვაახლოთ managers სია
        setManagers((prev) =>
          prev.map((m) =>
            m.manager._id === managerId
              ? { ...m, manager: { ...m.manager, salesCommissionRate: editRateValue } }
              : m
          )
        );
        setEditingRateId(null);
      } else {
        alert("შეცდომა საკომისიოს შეცვლისას");
      }
    } catch (error) {
      console.error("Error saving commission rate:", error);
      alert("შეცდომა საკომისიოს შეცვლისას");
    } finally {
      setSavingRate(false);
    }
  };

  useEffect(() => {
    if (user?.role === Role.Admin) {
      fetchManagers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedManager) {
      fetchManagerCommissions(selectedManager);
    }
  }, [selectedManager]);

  useEffect(() => {
    if (showWithdrawals) {
      fetchWithdrawalTransactions(showWithdrawals);
    }
  }, [showWithdrawals]);

  if (authLoading || !user || user.role !== Role.Admin) {
    return (
      <div className="sales-managers-loading">
        <RefreshCw className="animate-spin" size={40} />
        <p>იტვირთება...</p>
      </div>
    );
  }

  const totalCommissions = managers.reduce(
    (sum, m) => sum + m.stats.totalCommissions,
    0
  );
  const totalOrders = managers.reduce((sum, m) => sum + m.stats.totalOrders, 0);

  return (
    <div className="sales-managers-container">
      <div className="sales-managers-header">
        <h1>
          <Users size={28} />
          Sales Managers
        </h1>
        <button onClick={fetchManagers} className="refresh-button">
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          განახლება
        </button>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="summary-card">
          <Users size={24} />
          <div>
            <p className="summary-label">სულ მენეჯერები</p>
            <p className="summary-value">{managers.length}</p>
          </div>
        </div>
        <div className="summary-card">
          <ShoppingCart size={24} />
          <div>
            <p className="summary-label">სულ შეკვეთები</p>
            <p className="summary-value">{totalOrders}</p>
          </div>
        </div>
        <div className="summary-card">
          <DollarSign size={24} />
          <div>
            <p className="summary-label">სულ საკომისიო</p>
            <p className="summary-value">₾{totalCommissions.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="sales-managers-loading">
          <RefreshCw className="animate-spin" size={40} />
        </div>
      ) : (
        <div className="managers-table-container">
          <table className="managers-table">
            <thead>
              <tr>
                <th>მენეჯერი</th>
                <th>რეფ. კოდი</th>
                <th>საკომისიო %</th>
                <th>შეკვეთები</th>
                <th>მოლოდინში</th>
                <th>დამტკიცებული</th>
                <th>გადახდილი</th>
                <th>სულ გატანილი</th>
                <th>სულ საკომისიო</th>
                <th>მოქმედებები</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr
                  key={m.manager._id}
                  className={
                    selectedManager === m.manager._id ? "selected" : ""
                  }
                >
                  <td>
                    <div className="manager-info">
                      <span className="manager-name">{m.manager.name}</span>
                      <span className="manager-email">{m.manager.email}</span>
                    </div>
                  </td>
                  <td>
                    <code className="ref-code">{m.manager.salesRefCode}</code>
                  </td>
                  <td className="commission-rate-cell">
                    {editingRateId === m.manager._id ? (
                      <div className="rate-edit-container">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={editRateValue}
                          onChange={(e) => setEditRateValue(parseFloat(e.target.value) || 0)}
                          className="rate-input"
                        />
                        <button
                          className="rate-save-btn"
                          onClick={() => saveCommissionRate(m.manager._id)}
                          disabled={savingRate}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          className="rate-cancel-btn"
                          onClick={cancelEditingRate}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="rate-display">
                        <span>{m.manager.salesCommissionRate ?? 3}%</span>
                        <button
                          className="rate-edit-btn"
                          onClick={() => startEditingRate(m.manager._id, m.manager.salesCommissionRate ?? 3)}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{m.stats.totalOrders}</td>
                  <td className="pending">
                    ₾{m.stats.pendingAmount.toFixed(2)}
                  </td>
                  <td className="approved">
                    ₾{m.stats.approvedAmount.toFixed(2)}
                  </td>
                  <td className="paid">
                    ₾{(m.stats.paidAmount || 0).toFixed(2)}
                  </td>
                  <td className="withdrawn">
                    ₾{(m.manager.salesTotalWithdrawn || 0).toFixed(2)}
                  </td>
                  <td className="total">
                    ₾{m.stats.totalCommissions.toFixed(2)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="view-button"
                        onClick={() =>
                          setSelectedManager(
                            selectedManager === m.manager._id
                              ? null
                              : m.manager._id
                          )
                        }
                      >
                        <Eye size={16} />
                        {selectedManager === m.manager._id ? "დახურვა" : "შეკვეთები"}
                      </button>
                      <button
                        className="view-button history"
                        onClick={() =>
                          setShowWithdrawals(
                            showWithdrawals === m.manager._id
                              ? null
                              : m.manager._id
                          )
                        }
                      >
                        <History size={16} />
                        {showWithdrawals === m.manager._id ? "დახურვა" : "გატანები"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Manager Commissions */}
      {selectedManager && managerCommissions.length > 0 && (
        <div className="commissions-section">
          <h2>
            <TrendingUp size={22} />
            შეკვეთების დეტალები
          </h2>
          <table className="commissions-table">
            <thead>
              <tr>
                <th>შეკვეთის ID</th>
                <th>თარიღი</th>
                <th>მომხმარებელი</th>
                <th>შეკვეთის თანხა</th>
                <th>საკომისიო</th>
                <th>სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {managerCommissions.map((c: any) => (
                <tr key={c._id}>
                  <td>
                    <a
                      href={`/admin/orders/${c.order?._id}`}
                      className="order-link"
                    >
                      #{c.order?._id?.slice(-8) || "N/A"}
                    </a>
                  </td>
                  <td>
                    {c.createdAt
                      ? new Date(c.createdAt).toLocaleDateString("ka-GE")
                      : "-"}
                  </td>
                  <td>
                    {c.customer?.name ||
                      c.customer?.email ||
                      c.guestEmail ||
                      "სტუმარი"}
                  </td>
                  <td>₾{(c.orderTotal || 0).toFixed(2)}</td>
                  <td className="commission-amount">
                    ₾{(c.commissionAmount || 0).toFixed(2)}
                  </td>
                  <td>
                    <span className={`status-badge ${c.status}`}>
                      {c.status === "pending"
                        ? "მოლოდინში"
                        : c.status === "approved"
                        ? "დამტკიცებული"
                        : c.status === "paid"
                        ? "გადახდილი"
                        : c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Manager Withdrawal Transactions */}
      {showWithdrawals && (
        <div className="commissions-section withdrawal-history">
          <h2>
            <History size={22} />
            გატანების ისტორია - {managers.find(m => m.manager._id === showWithdrawals)?.manager.name}
          </h2>
          {withdrawalTransactions.length === 0 ? (
            <p className="no-data">გატანების ისტორია არ მოიძებნა</p>
          ) : (
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
                {withdrawalTransactions.map((t) => (
                  <tr key={t._id}>
                    <td>
                      {new Date(t.createdAt).toLocaleDateString("ka-GE")}
                    </td>
                    <td>
                      <span className={`status-badge ${t.type.includes('completed') ? 'paid' : 'pending'}`}>
                        {t.type === 'sm_withdrawal_completed' ? 'დასრულებული' : 'მოთხოვნილი'}
                      </span>
                    </td>
                    <td className="commission-amount">
                      ₾{t.amount.toFixed(2)}
                    </td>
                    <td>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
