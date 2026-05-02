"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/axios";
import "./admin-vouchers.css";

type Currency = "GEL" | "USD" | "EUR";
type Amount = 100 | 200 | 500;

interface Voucher {
  _id: string;
  code: string;
  amount: number;
  currency: string;
  isUsed: boolean;
  isActive: boolean;
  expiresAt: string;
  usedAt?: string;
  usedBy?: { email: string; name?: string } | null;
  usedInOrder?: string | null;
  createdAt: string;
}

interface PurchasedOrder {
  _id: string;
  issuedVoucherCode: string;
  issuedVoucherAmount: number;
  issuedVoucherCurrency: string;
  isPaid: boolean;
  paidAt: string;
  createdAt: string;
  totalPrice: number;
  externalOrderId: string;
  user?: { email?: string; name?: string; ownerFirstName?: string; ownerLastName?: string } | null;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GEL: "â‚¾",
  USD: "$",
  EUR: "â‚¬",
};

type Tab = "purchased" | "admin-created";

export default function AdminVouchersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("purchased");

  // Create form state
  const [createAmount, setCreateAmount] = useState<Amount>(100);
  const [createCurrency, setCreateCurrency] = useState<Currency>("GEL");
  const [createCount, setCreateCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string[] | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Purchased vouchers state
  const [purchased, setPurchased] = useState<PurchasedOrder[]>([]);
  const [purchasedTotal, setPurchasedTotal] = useState(0);
  const [purchasedPage, setPurchasedPage] = useState(1);
  const [purchasedLoading, setPurchasedLoading] = useState(false);
  const [purchasedError, setPurchasedError] = useState<string | null>(null);

  // Admin-created vouchers state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterCurrency, setFilterCurrency] = useState<string>("");
  const [filterUsed, setFilterUsed] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const limit = 30;

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  const fetchPurchased = useCallback(async () => {
    setPurchasedLoading(true);
    setPurchasedError(null);
    try {
      const res = await apiClient.get(
        `/vouchers/purchased-orders?page=${purchasedPage}&limit=${limit}`,
      );
      setPurchased(res.data.items || []);
      setPurchasedTotal(res.data.total || 0);
    } catch {
      setPurchasedError("áƒ’áƒáƒ§áƒ˜áƒ“áƒ£áƒšáƒ˜ áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ”áƒ‘áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ“áƒ");
    } finally {
      setPurchasedLoading(false);
    }
  }, [purchasedPage]);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filterCurrency) params.set("currency", filterCurrency);
      if (filterUsed !== "") params.set("isUsed", filterUsed);
      const res = await apiClient.get(`/vouchers?${params}`);
      setVouchers(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setListError("áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ”áƒ‘áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ“áƒ");
    } finally {
      setIsLoading(false);
    }
  }, [page, filterCurrency, filterUsed]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchPurchased();
      fetchVouchers();
    }
  }, [user, fetchPurchased, fetchVouchers]);

  const handleCreate = async () => {
    setIsCreating(true);
    setCreateSuccess(null);
    setCreateError(null);
    try {
      const res = await apiClient.post(
        createCount > 1 ? "/vouchers/batch" : "/vouchers",
        createCount > 1
          ? { amount: createAmount, currency: createCurrency, count: createCount }
          : { amount: createAmount, currency: createCurrency },
      );
      const created = Array.isArray(res.data) ? res.data : [res.data];
      setCreateSuccess(created.map((v: Voucher) => v.code));
      fetchVouchers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setCreateError(err.response?.data?.message || "áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ“áƒ");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("áƒ“áƒáƒ áƒ¬áƒ›áƒ£áƒœáƒ”áƒ‘áƒ£áƒšáƒ˜ áƒ®áƒáƒ áƒ—?")) return;
    try {
      await apiClient.patch(`/vouchers/${id}/deactivate`);
      fetchVouchers();
    } catch {
      alert("áƒ’áƒáƒ£áƒ¥áƒ›áƒ”áƒ‘áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ“áƒ");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const buyerLabel = (o: PurchasedOrder) => {
    if (!o.user) return "â€”";
    const name = o.user.ownerFirstName
      ? `${o.user.ownerFirstName} ${o.user.ownerLastName || ""}`.trim()
      : o.user.name;
    return name || o.user.email || "â€”";
  };

  if (authLoading) return <div className="vouchers-loading">áƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ”áƒ‘áƒ...</div>;

  return (
    <div className="admin-vouchers">
      <div className="vouchers-header">
        <button className="btn-back" onClick={() => router.push("/admin")}>
          â† áƒáƒ“áƒ›áƒ˜áƒœ áƒžáƒáƒœáƒ”áƒšáƒ˜
        </button>
        <h1>ðŸŽŸ áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ”áƒ‘áƒ˜áƒ¡ áƒ›áƒáƒ áƒ—áƒ•áƒ</h1>
      </div>

      {/* Tabs */}
      <div className="vouchers-tabs">
        <button
          className={`voucher-tab ${activeTab === "purchased" ? "active" : ""}`}
          onClick={() => setActiveTab("purchased")}
        >
          ðŸ›’ áƒ’áƒáƒ§áƒ˜áƒ“áƒ£áƒšáƒ˜ áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ”áƒ‘áƒ˜
          <span className="tab-badge">{purchasedTotal}</span>
        </button>
        <button
          className={`voucher-tab ${activeTab === "admin-created" ? "active" : ""}`}
          onClick={() => setActiveTab("admin-created")}
        >
          âœ¨ áƒáƒ“áƒ›áƒ˜áƒœ-áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ˜áƒšáƒ˜ / áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ
          <span className="tab-badge">{total}</span>
        </button>
      </div>

      {/* â”€â”€ Purchased â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "purchased" && (
        <section className="vouchers-list-section">
          <div className="list-header">
            <h2>
              áƒ’áƒáƒ§áƒ˜áƒ“áƒ£áƒšáƒ˜ áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ”áƒ‘áƒ˜{" "}
              <span className="total-badge">{purchasedTotal}</span>
            </h2>
            <button className="btn-refresh" onClick={fetchPurchased}>ðŸ”„</button>
          </div>
          {purchasedError && <p className="list-error">{purchasedError}</p>}
          {purchasedLoading ? (
            <div className="list-loading">áƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ”áƒ‘áƒ...</div>
          ) : (
            <>
              <div className="vouchers-table-wrap">
                <table className="vouchers-table">
                  <thead>
                    <tr>
                      <th>áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ˜áƒ¡ áƒ™áƒáƒ“áƒ˜</th>
                      <th>áƒ—áƒáƒœáƒ®áƒ</th>
                      <th>áƒ•áƒáƒšáƒ£áƒ¢áƒ</th>
                      <th>áƒ›áƒ§áƒ˜áƒ“áƒ•áƒ”áƒšáƒ˜</th>
                      <th>áƒ’áƒáƒ“áƒáƒ®áƒ“áƒ˜áƒ¡ áƒ—áƒáƒ áƒ˜áƒ¦áƒ˜</th>
                      <th>áƒ¨áƒ”áƒ™áƒ•áƒ”áƒ—áƒ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchased.map((o) => (
                      <tr key={o._id}>
                        <td>
                          <code
                            className="voucher-code-cell"
                            onClick={() => copyToClipboard(o.issuedVoucherCode)}
                            title="áƒ“áƒáƒ™áƒáƒžáƒ˜áƒ áƒ”áƒ‘áƒ"
                          >
                            {o.issuedVoucherCode || "â€”"}
                          </code>
                        </td>
                        <td>{o.issuedVoucherAmount}</td>
                        <td><span className="currency-tag">{o.issuedVoucherCurrency}</span></td>
                        <td>
                          <span>
                            {buyerLabel(o)}
                            {o.user?.email && (
                              <span className="buyer-email"> ({o.user.email})</span>
                            )}
                          </span>
                        </td>
                        <td>
                          {o.paidAt ? new Date(o.paidAt).toLocaleDateString("ka-GE") : "â€”"}
                        </td>
                        <td>
                          <a
                            href={`/admin/orders/${o._id}`}
                            className="order-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            #{String(o._id).slice(-6)}
                          </a>
                        </td>
                      </tr>
                    ))}
                    {purchased.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                          áƒ’áƒáƒ§áƒ˜áƒ“áƒ£áƒšáƒ˜ áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ˜ áƒ•áƒ”áƒ  áƒ›áƒáƒ˜áƒ«áƒ”áƒ‘áƒœáƒ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {purchasedTotal > limit && (
                <div className="pagination">
                  <button className="page-btn" disabled={purchasedPage === 1} onClick={() => setPurchasedPage((p) => p - 1)}>â†</button>
                  <span>{purchasedPage} / {Math.ceil(purchasedTotal / limit)}</span>
                  <button className="page-btn" disabled={purchasedPage >= Math.ceil(purchasedTotal / limit)} onClick={() => setPurchasedPage((p) => p + 1)}>â†’</button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* â”€â”€ Admin-created â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "admin-created" && (
        <>
          <section className="vouchers-create-section">
            <h2>áƒáƒ®áƒáƒšáƒ˜ áƒ•áƒáƒ£áƒ©áƒ”áƒ (áƒ”áƒ‘)áƒ˜áƒ¡ áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ</h2>
            <p className="create-hint">
              áƒ’áƒáƒ›áƒáƒ˜áƒ§áƒ”áƒœáƒ” áƒ¡áƒžáƒ”áƒªáƒ˜áƒáƒšáƒ£áƒ áƒ˜ áƒ¤áƒáƒ¡áƒ”áƒ‘áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡, áƒ¡áƒáƒ©áƒ£áƒ¥áƒ áƒ”áƒ‘áƒáƒ“ áƒ’áƒáƒ¡áƒáƒ’áƒ–áƒáƒ•áƒœáƒáƒ“ áƒáƒœ áƒ¡áƒáƒ áƒ”áƒ™áƒšáƒáƒ›áƒ áƒ›áƒ˜áƒ–áƒœáƒ”áƒ‘áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡.
            </p>
            <div className="create-form">
              <div className="form-row">
                <label>áƒ—áƒáƒœáƒ®áƒ</label>
                <div className="amount-buttons">
                  {([100, 200, 500] as Amount[]).map((a) => (
                    <button
                      key={a}
                      className={`amount-btn ${createAmount === a ? "active" : ""}`}
                      onClick={() => setCreateAmount(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label>áƒ•áƒáƒšáƒ£áƒ¢áƒ</label>
                <div className="currency-buttons">
                  {(["GEL", "USD", "EUR"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      className={`currency-btn ${createCurrency === c ? "active" : ""}`}
                      onClick={() => setCreateCurrency(c)}
                    >
                      {CURRENCY_SYMBOLS[c]} {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label>áƒ áƒáƒáƒ“áƒ”áƒœáƒáƒ‘áƒ (1â€“100)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={createCount}
                  onChange={(e) => setCreateCount(Math.min(100, Math.max(1, Number(e.target.value))))}
                  className="count-input"
                />
              </div>
              <div className="create-preview">
                áƒ’áƒ”áƒœáƒ”áƒ áƒ“áƒ”áƒ‘áƒ: <strong>{createCount}</strong> áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ˜{" "}
                <strong>{createAmount} {CURRENCY_SYMBOLS[createCurrency]}</strong>{" "}
                áƒ¦áƒ˜áƒ áƒ”áƒ‘áƒ£áƒšáƒ”áƒ‘áƒ˜áƒ— | áƒ•áƒáƒ“áƒ: <strong>1 áƒ—áƒ•áƒ”</strong>
              </div>
              <button className="btn-create" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "áƒ˜áƒ¥áƒ›áƒœáƒ”áƒ‘áƒ..." : "áƒ•áƒáƒ£áƒ©áƒ”áƒ (áƒ”áƒ‘)áƒ˜áƒ¡ áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ"}
              </button>
              {createError && <p className="create-error">{createError}</p>}
              {createSuccess && (
                <div className="create-success">
                  <p>âœ… {createSuccess.length} áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ˜ áƒ¨áƒ”áƒ˜áƒ¥áƒ›áƒœáƒ:</p>
                  <div className="created-codes">
                    {createSuccess.map((code) => (
                      <div key={code} className="created-code" onClick={() => copyToClipboard(code)} title="áƒ“áƒáƒ™áƒáƒžáƒ˜áƒ áƒ”áƒ‘áƒ">
                        <code>{code}</code>
                        <span className="copy-hint">ðŸ“‹</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="vouchers-list-section">
            <div className="list-header">
              <h2>
                áƒáƒ“áƒ›áƒ˜áƒœ-áƒ¨áƒ”áƒ¥áƒ›áƒœáƒ˜áƒšáƒ˜ áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ”áƒ‘áƒ˜{" "}
                <span className="total-badge">{total}</span>
              </h2>
              <div className="list-filters">
                <select value={filterCurrency} onChange={(e) => { setFilterCurrency(e.target.value); setPage(1); }}>
                  <option value="">áƒ§áƒ•áƒ”áƒšáƒ áƒ•áƒáƒšáƒ£áƒ¢áƒ</option>
                  <option value="GEL">GEL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <select value={filterUsed} onChange={(e) => { setFilterUsed(e.target.value); setPage(1); }}>
                  <option value="">áƒ§áƒ•áƒ”áƒšáƒ áƒ¡áƒ¢áƒáƒ¢áƒ£áƒ¡áƒ˜</option>
                  <option value="false">áƒáƒ¥áƒ¢áƒ˜áƒ£áƒ áƒ˜</option>
                  <option value="true">áƒ’áƒáƒ›áƒáƒ§áƒ”áƒœáƒ”áƒ‘áƒ£áƒšáƒ˜</option>
                </select>
                <button className="btn-refresh" onClick={fetchVouchers}>ðŸ”„</button>
              </div>
            </div>
            {listError && <p className="list-error">{listError}</p>}
            {isLoading ? (
              <div className="list-loading">áƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ”áƒ‘áƒ...</div>
            ) : (
              <>
                <div className="vouchers-table-wrap">
                  <table className="vouchers-table">
                    <thead>
                      <tr>
                        <th>áƒ™áƒáƒ“áƒ˜</th>
                        <th>áƒ—áƒáƒœáƒ®áƒ</th>
                        <th>áƒ•áƒáƒšáƒ£áƒ¢áƒ</th>
                        <th>áƒ¡áƒ¢áƒáƒ¢áƒ£áƒ¡áƒ˜</th>
                        <th>áƒ•áƒáƒ“áƒ</th>
                        <th>áƒ’áƒáƒ›áƒáƒ§áƒ”áƒœáƒ”áƒ‘áƒ</th>
                        <th>áƒ›áƒáƒ¥áƒ›áƒ”áƒ“áƒ”áƒ‘áƒ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((v) => (
                        <tr key={v._id} className={v.isUsed ? "used" : !v.isActive ? "inactive" : ""}>
                          <td>
                            <code className="voucher-code-cell" onClick={() => copyToClipboard(v.code)} title="áƒ“áƒáƒ™áƒáƒžáƒ˜áƒ áƒ”áƒ‘áƒ">
                              {v.code}
                            </code>
                          </td>
                          <td>{v.amount}</td>
                          <td><span className="currency-tag">{v.currency}</span></td>
                          <td>
                            {v.isUsed ? (
                              <span className="status-badge used">áƒ’áƒáƒ›áƒáƒ§áƒ”áƒœáƒ”áƒ‘áƒ£áƒšáƒ˜</span>
                            ) : !v.isActive ? (
                              <span className="status-badge inactive">áƒ’áƒáƒ£áƒ¥áƒ›áƒ”áƒ‘áƒ£áƒšáƒ˜</span>
                            ) : new Date(v.expiresAt) < new Date() ? (
                              <span className="status-badge expired">áƒ•áƒáƒ“áƒáƒ’áƒáƒ¡áƒ£áƒšáƒ˜</span>
                            ) : (
                              <span className="status-badge active">áƒáƒ¥áƒ¢áƒ˜áƒ£áƒ áƒ˜</span>
                            )}
                          </td>
                          <td>{new Date(v.expiresAt).toLocaleDateString("ka-GE")}</td>
                          <td>
                            {v.usedAt ? (
                              <span title={v.usedBy?.email}>
                                {new Date(v.usedAt).toLocaleDateString("ka-GE")}
                                {v.usedBy ? ` â€” ${v.usedBy.email}` : ""}
                              </span>
                            ) : "â€”"}
                          </td>
                          <td>
                            {!v.isUsed && v.isActive && (
                              <button className="btn-deactivate" onClick={() => handleDeactivate(v._id)}>
                                áƒ’áƒáƒ£áƒ¥áƒ›áƒ”áƒ‘áƒ
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {vouchers.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                            áƒ•áƒáƒ£áƒ©áƒ”áƒ áƒ˜ áƒ•áƒ”áƒ  áƒ›áƒáƒ˜áƒ«áƒ”áƒ‘áƒœáƒ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {total > limit && (
                  <div className="pagination">
                    <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>â†</button>
                    <span>{page} / {Math.ceil(total / limit)}</span>
                    <button className="page-btn" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)}>â†’</button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
